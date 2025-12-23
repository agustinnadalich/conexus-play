from flask import Flask, request, jsonify, render_template_string, Response
from flask_cors import CORS
from dotenv import load_dotenv
import os
import pandas as pd
import json
import openai
import math
from db import Base, engine, get_db, SessionLocal
from models import Club, ImportProfile, Match, Event, User  # incluye Event para bulk_update
from werkzeug.utils import secure_filename
from importer import import_match_from_excel, import_match_from_json, import_match_from_xml
from normalizer import normalize_excel_to_json, normalize_xml_to_json
import traceback
from register_routes import register_routes
from auth_utils import hash_password
from sqlalchemy import text

print("🔍 DEBUG: app.py se está cargando")

# Carga las variables de entorno desde el archivo .env
load_dotenv()

# Configura tu clave de API de OpenAI
openai.api_key = os.getenv("OPENAI_API_KEY")
app = Flask(__name__)
Base.metadata.create_all(bind=engine)


def migrate_club_branding_columns():
    """Ensure branding columns exist on clubs table for legacy databases."""
    stmts = [
        "ALTER TABLE clubs ADD COLUMN IF NOT EXISTS logo_url TEXT",
        "ALTER TABLE clubs ADD COLUMN IF NOT EXISTS primary_color VARCHAR(20)",
        "ALTER TABLE clubs ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(20)",
        "ALTER TABLE clubs ADD COLUMN IF NOT EXISTS accent_color VARCHAR(20)",
        "ALTER TABLE clubs ADD COLUMN IF NOT EXISTS landing_copy TEXT",
    ]
    try:
        with engine.begin() as conn:
            for stmt in stmts:
                conn.execute(text(stmt))
        print("✅ Migración de columnas de branding en clubs verificada")
    except Exception as e:
        print(f"⚠️ No se pudieron migrar columnas de clubs automáticamente: {e}")


migrate_club_branding_columns()


def bootstrap_super_admin():
    email = os.getenv("INITIAL_ADMIN_EMAIL")
    password = os.getenv("INITIAL_ADMIN_PASSWORD")
    if not email or not password:
        return
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email.lower()).first()
        if existing:
            return
        admin = User(
            email=email.lower(),
            password_hash=hash_password(password),
            full_name="Super Admin",
            global_role="super_admin",
            is_active=True,
            is_email_verified=True,
        )
        db.add(admin)
        db.commit()
        print(f"✅ Super admin creado: {email}")
    except Exception as e:
        print(f"❌ Error creando super admin: {e}")
    finally:
        db.close()


bootstrap_super_admin()

# Configuración de CORS según ambiente
FLASK_ENV = os.getenv("FLASK_ENV", "development")
if FLASK_ENV == "production":
    # Producción: CORS restringido a dominios específicos
    allowed_origins = [
        "https://conexusplay.com",
        "https://www.conexusplay.com",
        "https://api.conexusplay.com",
        os.getenv("FRONTEND_URL", "https://conexusplay.com"),
        os.getenv("APP_URL", "https://conexusplay.com"),
    ]
    # Filtrar valores None o duplicados
    allowed_origins = list(set([o for o in allowed_origins if o]))
    CORS(app, resources={r"/*": {
        "origins": allowed_origins,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }})
    print(f"✅ CORS configurado para producción: {allowed_origins}")
else:
    # Desarrollo: CORS abierto
    CORS(app, resources={r"/*": {"origins": "*"}})
    print("⚠️  CORS abierto (modo desarrollo)")

DATABASE_URL = os.getenv("DATABASE_URL")


UPLOAD_FOLDER = '/app/uploads/'
matches_json_path = os.path.join(UPLOAD_FOLDER, 'matches.json')

# Ruta del archivo JSON
matriz_json_path = os.path.join(UPLOAD_FOLDER, 'matriz_semplyfied.json')

# Funciones utilitarias para cargar los DataFrames bajo demanda
def load_df():
    try:
        with open(matriz_json_path, 'r') as f:
            return pd.DataFrame(json.load(f))
    except Exception:
        return pd.DataFrame()

def load_df_partidos():
    try:
        with open(matches_json_path, 'r') as f:
            return pd.DataFrame(json.load(f))
    except Exception:
        return pd.DataFrame()
    

# @app.route('/import', methods=['POST'])
# def import_file():
#     if 'file' not in request.files:
#         return {"error": "No file provided"}, 400

#     file = request.files['file']
#     if file.filename == '':
#         return {"error": "Empty filename"}, 400

#     filename = secure_filename(file.filename)
#     save_path = os.path.join(UPLOAD_FOLDER, filename)
#     file.save(save_path)

#     # Perfil de importación por defecto (se podrá personalizar más adelante)
#     profile = {
#         "events_sheet": "MATRIZ",
#         "meta_sheet": "MATCHES",
#         "col_event_type": "CATEGORY",
#         "col_player": "PLAYER",
#         "col_time": "SECOND",
#         "col_x": "COORDINATE_X",
#         "col_y": "COORDINATE_Y"
#     }

#     try:
#         import_match_from_excel(save_path, profile)
#         return {"message": "Archivo importado correctamente"}, 200
#     except Exception as e:
#         return {"error": str(e)}, 500


# Función para calcular el origen de los tries
def calcular_origen_tries(df):
    if 'POINTS' not in df.columns:
        raise KeyError("La columna 'POINTS' no existe en el DataFrame")

    origin_categories = ["TURNOVER+", "SCRUM", "LINEOUT", "KICKOFF"]
    tries_events = df[df['POINTS'] == "TRY"]

    def get_origin_event(try_event):
        try_time = try_event['SECOND']
        relevant_events = df[(df['CATEGORY'].isin(origin_categories)) & (df['SECOND'] < try_time)]
        return relevant_events.iloc[-1]['CATEGORY'] if not relevant_events.empty else None

    df['TRY_ORIGIN'] = df.apply(lambda event: get_origin_event(event) if event['POINTS'] == "TRY" else None, axis=1)
    return df


def mmss_to_seconds_py(val):
    try:
        if val is None:
            return None
        if isinstance(val, (int, float)):
            return float(val)
        s = str(val).strip()
        if ':' in s:
            parts = s.split(':')
            if len(parts) == 2:
                m = float(parts[0]) if parts[0] else 0
                sec = float(parts[1]) if parts[1] else 0
                return m * 60 + sec
            # fallback
            return float(parts[0])
        return float(s)
    except Exception:
        return None


def read_path(ev, path):
    # path examples: 'extra_data.AVANCE', 'extra_data.descriptors.AVANCE', 'PLAYER'
    try:
        if '.' not in path:
            return ev.get(path)
        parts = path.split('.')
        cur = ev
        for p in parts:
            if cur is None:
                return None
            if isinstance(cur, dict):
                cur = cur.get(p)
            else:
                return None
        return cur
    except Exception:
        return None


def write_path(ev, path, value):
    try:
        if '.' not in path:
            ev[path] = value
            return
        parts = path.split('.')
        cur = ev
        for i, p in enumerate(parts):
            if i == len(parts) - 1:
                # final
                if isinstance(cur, dict):
                    cur[p] = value
                return
            # intermediate
            if isinstance(cur, dict):
                if p not in cur or cur[p] is None:
                    cur[p] = {}
                cur = cur[p]
            else:
                return
    except Exception:
        return


def apply_mapping_to_events_py(events, mapping):
    # mapping puede ser:
    # 1) lista de {source, target, transformer}
    # 2) dict con secciones code/labels/team_inference (perfiles XML personalizados)
    if isinstance(mapping, dict) and 'code' in mapping:
        code_map = mapping.get('code', {})
        team_inf = mapping.get('team_inference', {})
        label_map = mapping.get('labels', {})
        out = []
        for ev in events:
            new_ev = dict(ev) if isinstance(ev, dict) else ev
            if 'extra_data' not in new_ev or new_ev.get('extra_data') is None:
                new_ev['extra_data'] = {}
            code = new_ev.get('code') or new_ev.get('CATEGORY') or new_ev.get('event_type')
            mapped_code = code_map.get(code, code)
            if mapped_code:
                new_ev['CATEGORY'] = mapped_code
                new_ev['event_type'] = mapped_code
            if code in team_inf and not new_ev.get('TEAM'):
                new_ev['TEAM'] = team_inf[code]
                new_ev['extra_data']['TEAM'] = team_inf[code]

            # Mapear labels simples presentes en extra_data
            ed = new_ev.get('extra_data', {}) or {}
            for group, target in (label_map or {}).items():
                val = new_ev.get(group) or ed.get(group)
                if val is not None:
                    ed[target] = val
                    # Sync campos clave
                    if target.upper() in ['JUGADOR', 'PLAYER'] and not new_ev.get('PLAYER'):
                        new_ev['PLAYER'] = val
                    if target.upper() in ['TEAM', 'EQUIPO'] and not new_ev.get('TEAM'):
                        new_ev['TEAM'] = val
                    if target.upper() in ['ADVANCE', 'AVANCE'] and not new_ev.get('ADVANCE'):
                        new_ev['ADVANCE'] = val
            new_ev['extra_data'] = ed
            # labels mapping: si vienen en extra_data.descriptors (no fiable), omitir aquí
            out.append(new_ev)
        return out

    # mapping: lista de { source: 'extra_data.AVANCE', target: 'extra_data.ADVANCE', transformer: 'to_upper' }
    out_events = []
    for ev in events:
        new_ev = dict(ev) if isinstance(ev, dict) else ev
        # ensure nested dicts exist
        if 'extra_data' not in new_ev or new_ev.get('extra_data') is None:
            new_ev['extra_data'] = {}
        if 'descriptors' not in new_ev['extra_data'] or new_ev['extra_data'].get('descriptors') is None:
            new_ev['extra_data']['descriptors'] = {}

        for m in mapping or []:
            if not isinstance(m, dict):
                continue
            src = m.get('source')
            tgt = m.get('target')
            transformer = m.get('transformer')

            raw = read_path(new_ev, src) if src else None

            val = raw
            if transformer == 'to_upper' and isinstance(val, str):
                val = val.upper()
            elif transformer == 'split_and_dedupe' and isinstance(val, str):
                parts = [p.strip() for p in val.split(',') if p.strip()]
                val = list(dict.fromkeys(parts))
            elif transformer == 'mmss_to_seconds' and isinstance(val, (str, int, float)):
                sec = mmss_to_seconds_py(val)
                if sec is not None:
                    val = sec

            # write to target
            if tgt:
                write_path(new_ev, tgt, val)

        out_events.append(new_ev)
    return out_events


def safe_profile_settings(profile):
    """Return a plain dict for profile.settings regardless of ORM attribute typing."""
    try:
        if profile is None:
            return {}
        s = getattr(profile, 'settings', None)
        if s is None:
            return {}
        # if it's a string (JSON) try to load
        if isinstance(s, str):
            try:
                return json.loads(s)
            except Exception:
                return {}
        if isinstance(s, dict):
            return s
        # fallback
        return {}
    except Exception:
        return {}

@app.route('/api/matches/<int:id>', methods=['PUT'])
def update_match(id):
    session = SessionLocal()
    match = session.query(Match).get(id)
    if not match:
        return jsonify({"error": "Match not found"}), 404

    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
    for key, value in data.items():
        if key == "id":
            continue
        # Solo permite actualizar campos simples
        if hasattr(match, key) and key != "team":
            setattr(match, key, value)
    session.commit()
    return jsonify(match.to_dict())

# @app.route('/matches', methods=['GET'])
# def get_matches():
#     try:
#         with open(matches_json_path, 'r') as f:
#             matches = json.load(f)
#         return jsonify({"matches": matches}), 200
#     except FileNotFoundError:
#         return jsonify({"error": "Archivo matches.json no encontrado"}), 404
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

# @app.route('/events', methods=['GET'])
# def get_events():
#     match_id = request.args.get('match_id')
#     print(f"match_id recibido: {match_id}")

#     if not match_id:
#         print("No se proporcionó match_id")
#         return jsonify({"error": "No match_id provided"}), 400

#     try:
#         with open(matches_json_path, 'r') as f:
#             matches = json.load(f)
#         match = next((m for m in matches if m['ID_MATCH'] == int(match_id)), None)
#         if not match:
#             return jsonify({"error": "Match not found"}), 404

#         events_json_path = os.path.join(UPLOAD_FOLDER, f"{match['JSON']}")
#         print(f"Buscando archivo en: {events_json_path}")
#         if not os.path.exists(events_json_path):
#             return jsonify({"error": f"Archivo JSON {match['JSON']} no encontrado"}), 404

#         with open(events_json_path, 'r') as f:
#             events = json.load(f)

#         columns_to_include = ['ID', 'OPPONENT', 'SECOND', 'DURATION', 'CATEGORY', 'TEAM', 'COORDINATE_X', 'COORDINATE_Y', 
#                               'SECTOR', 'PLAYER', 'SCRUM_RESULT', 'ADVANCE', 'LINE_RESULT', 'LINE_QUANTITY', 'LINE_POSITION', 
#                               'LINE_THROWER', 'LINE_RECEIVER', 'LINE_PLAY', 'OPPONENT_JUMPER', 'BREAK_TYPE', 'BREAK_CHANNEL', 
#                               'TURNOVER_TYPE', 'INFRACTION_TYPE', 'KICK_TYPE', 'SQUARE', 'RUCK_SPEED', 'POINTS', 
#                               'POINTS(VALUE)', 'PERIODS', 'GOAL_KICK', 'TRY_ORIGIN', 'YELLOW-CARD', 'RED-CARD']

#         df = pd.DataFrame(events)
#         for column in columns_to_include:
#             if column not in df.columns:
#                 df[column] = None

#         def safe_second(val):
#             if val is None or (isinstance(val, float) and math.isnan(val)):
#                 return 0
#             return val

#         kick_off_1 = safe_second(df[(df['CATEGORY'] == 'KICK OFF') & (df['PERIODS'] == 1)]['SECOND'].min())
#         fin_1 = safe_second(df[(df['CATEGORY'] == 'END') & (df['PERIODS'] == 1)]['SECOND'].max())
#         kick_off_2 = safe_second(df[(df['CATEGORY'] == 'KICK OFF') & (df['PERIODS'] == 2)]['SECOND'].min())
#         fin_2 = safe_second(df[(df['CATEGORY'] == 'END') & (df['PERIODS'] == 2)]['SECOND'].max())

#         def calcular_tiempo_de_juego(second):
#             if second <= fin_1:
#                 return second - kick_off_1
#             elif second >= kick_off_2:
#                 return (fin_1 - kick_off_1) + (second - kick_off_2)
#             return None

#         timeGroups = [
#             {"label": "0'- 20'", "start": 0, "end": 20 * 60},
#             {"label": "20' - 40'", "start": 20 * 60, "end": calcular_tiempo_de_juego(fin_1)},
#             {"label": "40' - 60'", "start": calcular_tiempo_de_juego(kick_off_2), "end": calcular_tiempo_de_juego(kick_off_2) + 20 * 60},
#             {"label": "60' - 80'", "start": calcular_tiempo_de_juego(kick_off_2) + 20 * 60, "end": calcular_tiempo_de_juego(fin_2)}
#         ]

#         for event in events:
#             if 'SECOND' in event and event['SECOND'] is not None:
#                 minutes, seconds = divmod(int(event['SECOND']), 60)
#                 event['TIME(VIDEO)'] = f"{minutes:02}:{seconds:02}"
#                 tiempo_de_juego = calcular_tiempo_de_juego(event['SECOND'])
#                 if tiempo_de_juego is not None:
#                     tiempo_de_juego_minutes, tiempo_de_juego_seconds = divmod(tiempo_de_juego, 60)
#                     event['Game_Time'] = f"{int(tiempo_de_juego_minutes):02}:{int(tiempo_de_juego_seconds):02}"
#                     for group in timeGroups:
#                         if group["start"] <= tiempo_de_juego < group["end"]:
#                             event["Time_Group"] = group["label"]
#                             break
#                 else:
#                     event['Game_Time'] = None
#                     event['Time_Group'] = None

#         video_url = match.get('VIDEO', '')
#         if video_url and not video_url.startswith('http'):
#             video_url = f"https://www.youtube.com/watch?v={video_url}"

#         print(f"Video URL enviado al frontend: {video_url}")
#         return jsonify({"header": {**match, "video_url": video_url}, "events": events}), 200

#     except Exception as e:
#         print(f"Error en get_events: {e}")
#         return jsonify({"error": str(e)}), 500

# @app.route('/events/multi', methods=['GET'])
# def get_events_multi():
#     match_ids = request.args.getlist('match_id', type=int)
#     all_events = []

#     df_partidos = load_df_partidos()
#     partidos_list = df_partidos.to_dict(orient='records') if isinstance(df_partidos, pd.DataFrame) else df_partidos

#     for match_id in match_ids:
#         match = next((m for m in partidos_list if m['ID_MATCH'] == match_id), None)
#         if not match:
#             continue
#         json_path = os.path.join(UPLOAD_FOLDER, match['JSON'])
#         try:
#             with open(json_path, 'r') as f:
#                 events = json.load(f)
#         except Exception:
#             events = []
#         for ev in events:
#             ev['ID_MATCH'] = match_id
#             ev['VIDEO'] = match['VIDEO']
#         all_events.extend(events)
#     return jsonify({"events": all_events})

@app.route('/events/table', methods=['GET'])
def events_table():
    df = load_df()
    if df.empty:
        return "<h1>No data available</h1>", 404
    
    # Obtiene los parámetros de filtro de la solicitud
    category = request.args.get('category')
    player = request.args.get('player')

    filtered_df = df

    if category:
        filtered_df = filtered_df[filtered_df['CATEGORY'] == category]
    if player:
        filtered_df = filtered_df[filtered_df['PLAYER'] == player]
    
    # Convierte el DataFrame filtrado a una tabla HTML
    table_html = filtered_df.to_html(classes='table table-striped', index=False)
    
    # Renderiza la tabla HTML en una página simple con un formulario de filtro
    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Events Table</title>
        <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    </head>
    <body>
        <div class="container">
            <h1 class="mt-5">Events Table</h1>
            <form method="get" action="/events/table" class="mb-3">
                <div class="form-row">
                    <div class="col">
                        <input type="text" name="category" class="form-control" placeholder="Category" value="{category or ''}">
                    </div>
                    <div class="col">
                        <input type="text" name="player" class="form-control" placeholder="Player" value="{player or ''}">
                    </div>
                    <div class="col">
                        <button type="submit" class="btn btn-primary">Filter</button>
                    </div>
                </div>
            </form>
            {table_html}
        </div>
    </body>
    </html>
    """
    return render_template_string(html)

    
# @app.route('/convert_excel_to_json_2', methods=['GET'])
# def convert_excel_to_json_2():
#     file_path = os.path.join(UPLOAD_FOLDER, 'SERIE_B_PRATO_match_2.xlsx')
#     file_path = os.path.join(UPLOAD_FOLDER, 'SERIE_B_PRATO_match_2.xlsx')
#     if not os.path.exists(file_path):
#         return jsonify({"error": "Archivo Excel no encontrado"}), 404

#     try:
#         df = pd.read_excel(file_path, sheet_name='MATRIZ')
#         df_partidos = pd.read_excel(file_path, sheet_name='MATCHES')

#                 # Procesa los eventos PENALTY
#         def process_penalty_events(row):
#             if row['CATEGORY'] == 'PENALTY':
#                 advance = str(row.get('ADVANCE', '')).strip()
#                 player = str(row.get('PLAYER', '')).strip()

#                 if advance == 'NEUTRAL':
#                     row['YELLOW-CARD'] = player
#                 elif advance == 'NEGATIVE':
#                     row['RED-CARD'] = player
#                 else:
#                     row['YELLOW-CARD'] = None
#                     row['RED-CARD'] = None
#             else:
#                 # Asegúrate de que YELLOW-CARD y RED-CARD no existan en otras categorías
#                 row['YELLOW-CARD'] = None
#                 row['RED-CARD'] = None
#             return row

#         # Procesa los eventos LINEOUT
#         def process_lineout_events(row):
#             if row['CATEGORY'] == 'LINEOUT':
#                 player = str(row.get('PLAYER', '')).strip()
#                 player_2 = str(row.get('PLAYER_2', '')).strip()

#                 # Determina el LINE_THROWER y LINE_RECEIVER
#                 if player.startswith('T-'):
#                     thrower = player[2:]  # Elimina el prefijo "T-"
#                     receiver = player_2
#                 elif player_2.startswith('T-'):
#                     thrower = player_2[2:]  # Elimina el prefijo "T-"
#                     receiver = player
#                 else:
#                     thrower = None
#                     receiver = None

#                 # Asigna los valores al evento
#                 row['LINE_THROWER'] = thrower
#                 row['LINE_RECEIVER'] = receiver

#                 # Coloca ambos jugadores en un array en PLAYER
#                 players = [thrower, receiver]
#                 players = [p for p in players if p and p.lower() != 'nan']  # Filtra valores no válidos
#                 row['PLAYER'] = players if players else None  # Asigna None si está vacío

#                 # Depuración
#                 print(f"Processed LINEOUT event: PLAYER={row['PLAYER']}, LINE_THROWER={row['LINE_THROWER']}, LINE_RECEIVER={row['LINE_RECEIVER']}")
#             else:
#                 # Asegúrate de que LINE_THROWER y LINE_RECEIVER no existan en otras categorías
#                 row['LINE_THROWER'] = None
#                 row['LINE_RECEIVER'] = None
#             return row

#             # Procesa los eventos TACKLE
#         def process_tackle_events(row):
#             if row['CATEGORY'] == 'TACKLE':
#                 player = str(row.get('PLAYER', '')).strip() if row.get('PLAYER') else None
#                 player_2 = str(row.get('PLAYER_2', '')).strip() if row.get('PLAYER_2') else None

#                 # Filtra valores no válidos como None o 'nan'
#                 players = [p for p in [player, player_2] if p and p.lower() != 'nan']

#                 # Si hay un solo jugador, lo dejamos como un string; si no, como lista
#                 row['PLAYER'] = players[0] if len(players) == 1 else (players if players else None)
#                 row['Team_Tackle_Count'] = 1
#             return row

#         # Calcula el ORIGIN, END y fases para ATTACK y DEFENCE
#         def calculate_attack_defence(row, df):
#             if row['CATEGORY'] in ['ATTACK', 'DEFENCE']:
#                 origin_events = ['KICK-OFF', 'TURNOVER+', 'SCRUM', 'LINEOUT', 'PENALTY', 'FREE-KICK']
#                 relevant_origin = df[(df['CATEGORY'].isin(origin_events)) & (df['SECOND'] < row['SECOND'])]
#                 origin = relevant_origin.iloc[-1] if not relevant_origin.empty else None

#                 end_events = ['PENALTY', 'TURNOVER-', 'POINTS']
#                 relevant_end = df[(df['CATEGORY'].isin(end_events)) & (df['SECOND'] > row['SECOND'])]
#                 end = relevant_end.iloc[0] if not relevant_end.empty else None

#                 ruck_events = df[(df['CATEGORY'] == 'RUCK') & (df['SECOND'] >= (origin['SECOND'] if origin is not None else 0)) & (df['SECOND'] <= (end['SECOND'] if end is not None else row['SECOND']))]
#                 phases = len(ruck_events) + 1 if not ruck_events.empty else 1

#                 row['ORIGIN'] = origin['CATEGORY'] if origin is not None else None
#                 row['END'] = end['CATEGORY'] if end is not None else None
#                 row['PHASES'] = phases
#             return row
        



#         # Limpia las filas eliminando claves con valores null, NaN, arrays vacíos o 'Undefined'
#         def clean_row(row):
#             return {
#                 k: v for k, v in row.items()
#                 if v is not None and v != 'undefined' and (not isinstance(v, list) or len(v) > 0) and (not (isinstance(v, float) and pd.isna(v)))
#             }

#         # Inicializa las columnas LINE_THROWER y LINE_RECEIVER en el DataFrame
#         df['LINE_THROWER'] = None
#         df['LINE_RECEIVER'] = None
#         df['YELLOW-CARD'] = None
#         df['RED-CARD'] = None

#         # Aplica las transformaciones a los eventos
#         df = df.apply(process_lineout_events, axis=1)
#         df = df.apply(process_tackle_events, axis=1)
#         df = df.apply(process_penalty_events, axis=1)  # Aplica la nueva función
#         df = df.apply(lambda row: calculate_attack_defence(row, df), axis=1)

#         # Aplica la limpieza
#         df_json = df.apply(lambda row: clean_row(row.to_dict()), axis=1).to_json(orient='records')
#         # Si necesitas guardar df_partidos_json, descomenta la siguiente línea:
#         # with open(os.path.join(UPLOAD_FOLDER, 'SERIE_B_PRATO_matches.json'), 'w') as f:
#         #     f.write(df_partidos_json)

#         # Guarda los JSON en archivos
#         with open(os.path.join(UPLOAD_FOLDER, 'SERIE_B_PRATO.json'), 'w') as f:
#             f.write(df_json)


#         return jsonify({"message": "Conversion successful"}), 200
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

@app.route('/analyze_events', methods=['GET'])
def analyze_events():
    try:
        # Cargar el archivo matriz_semplyfied.json
        matriz_semplyfied_path = os.path.join(UPLOAD_FOLDER, 'matriz_semplyfied.json')
        if not os.path.exists(matriz_semplyfied_path):
            return jsonify({"error": "Archivo JSON no encontrado"}), 404

        with open(matriz_semplyfied_path, 'r') as f:
            events = json.load(f)

        if not events:
            return jsonify({"error": "No events provided"}), 400

        # Configuración de mensajes para la solicitud a la API
        messages = [
            {
                "role": "system",
                "content": (
                    "Eres un experto en análisis de datos deportivos, especializado en rugby. "
                    "Tu tarea es interpretar datos de eventos de un partido proporcionados en formato JSON, "
                    "identificando patrones, estadísticas y recomendaciones tácticas para mejorar el rendimiento "
                    "del equipo San Benedetto. El reporte debe ser lo más completo posible, dividido por aspectos del juego "
                    "donde se hayan encontrado patrones interesantes. Escribe el reporte de manera clara y fácil de interpretar "
                    "para un entrenador, evitando formatos técnicos como JSON.\n\n"
                    "Si encuentras datos que son difíciles de interpretar o necesitas más información para sacar conclusiones, "
                    "inclúyelos al final del reporte con una explicación de por qué son necesarios y cómo podrían mejorar el análisis "
                    "en futuros partidos.\n\n"
                    "Reporte de Análisis del Partido – San Benedetto vs. Lundax Lions Amaranto\n"
                    "Este reporte se basa en el análisis del JSON de eventos del partido y se han derivado distintos indicadores y métricas que ayudan a interpretar el desarrollo del juego. "
                    "Se han considerado también reglas específicas para interpretar los turnovers, break y penalizaciones, de acuerdo a las siguientes aclaraciones:\n\n"
                    "Equipo: Nuestro equipo es San Benedetto.\n\n"
                    "Turnover+: Indica recuperación de posesión.\n"
                    "Turnover–: Indica pérdida de posesión.\n"
                    "– Por ejemplo, si se inicia un ataque y se produce un “Turnover–”, significa que perdimos la pelota.\n\n"
                    "Defensa y Break:\n"
                    "– Si en defensa se produce un “BREAK”, significa que el rival ha quebrado nuestra línea defensiva.\n"
                    "– Si luego se produce un “Turnover+”, se entiende que hemos recuperado la posesión.\n\n"
                    "Penal:\n"
                    "– Si se registra un evento “PENALTY” con el equipo San Benedetto, indica que hemos cometido una infracción.\n\n"
                    "1. Análisis de Fases y Quiebres\n"
                    "Fase del Quiebre: La fase de un quiebre se calcula contando la cantidad de rucks (eventos “RUCK”) que se han dado desde el inicio de la secuencia ofensiva (o defensiva) hasta que se produce el quiebre (evento “BREAK”).\n"
                    "...\n"  # Incluye el resto del contenido aquí
                )
            },
            {
                "role": "user",
                "content": (
                    "Aquí tienes un conjunto de eventos en formato JSON. Cada evento tiene varias propiedades como "
                    "'ID', 'OPPONENT', 'SECOND', 'CATEGORY', 'TEAM', etc. Por favor, analiza estos eventos y "
                    "genera un reporte detallado dividido por aspectos del juego donde hayas encontrado patrones interesantes. "
                    "escribe apartados para cada aspecto del juego, como 'Defensa', 'Ataque', 'Penalizaciones', etc. "
                    "incluye seccioens especiales para LINEOUT y SCRUM, y cualquier otro aspecto que consideres relevante. "
                    "No incluyas estadistiacas, ya las tengo. Lo que me sirve son patrones y recomendaciones. "
                    "No incluyas el JSON en el reporte, solo el análisis. "
                    "Escribe el reporte de manera clara y fácil de interpretar para un entrenador. Si necesitas más información "
                    "para sacar conclusiones, inclúyelo al final del reporte.\n\n"
                    "JSON:\n{}".format(json.dumps(events, indent=2))
                )
            }
        ]

        # Llamada a la API de OpenAI
        response = openai.ChatCompletion.create(
            model="o3-mini",
            messages=messages
        )

        text = response['choices'][0]['message']['content']
        return jsonify({"analysis2": text})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/clubs', methods=['GET', 'POST'])
def manage_clubs():
    db = next(get_db())

    if request.method == 'POST':
        data = request.get_json()
        name = data.get("name")
        if not name:
            return jsonify({"error": "Nombre requerido"}), 400

        existing = db.query(Club).filter_by(name=name).first()
        if existing:
            return jsonify({"message": "Ya existe"}), 200

        new_club = Club(name=name)
        db.add(new_club)
        db.commit()
        return jsonify({"message": "Club creado"}), 201

    else:
        clubs = db.query(Club).all()
        return jsonify([{"id": c.id, "name": c.name} for c in clubs])
    
@app.route('/api/import/profiles', methods=['GET'])
def list_profiles():
    db = SessionLocal()
    try:
        profiles = db.query(ImportProfile).all()
        return jsonify([
            {
                "name": p.name,
                "description": p.description,
                "settings": p.settings
            } for p in profiles
        ])
    finally:
        db.close()

@app.route('/api/import/profiles/<name>', methods=['GET'])
def get_profile(name):
    db = SessionLocal()
    try:
        profile = db.query(ImportProfile).filter_by(name=name).first()
        if not profile:
            return jsonify({"error": "Perfil no encontrado"}), 404
        return jsonify({
            "name": profile.name,
            "description": profile.description,
            "settings": profile.settings
        })
    finally:
        db.close()


@app.route('/api/import', methods=['POST'])
def import_file():
    if 'file' not in request.files:
        return {"error": "No file provided"}, 400

    file = request.files['file']
    if not file or not file.filename:
        return {"error": "Empty filename"}, 400

    if not file or not getattr(file, 'filename', None):
        return {"error": "Empty filename"}, 400
    filename = secure_filename(file.filename)
    save_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(save_path)

    profile_name = request.args.get("profile")
    if not profile_name:
        return {"error": "Debe especificar ?profile=NombreDelPerfil"}, 400

    db = SessionLocal()
    try:
        profile = db.query(ImportProfile).filter_by(name=profile_name).first()
        if not profile:
            return {"error": f"Perfil '{profile_name}' no encontrado"}, 404

        settings = safe_profile_settings(profile)
        file_type = settings.get('file_type', '').lower()

        # If not specified, detect by extension
        if not file_type:
            if filename.lower().endswith('.xml'):
                file_type = 'xml'
            elif filename.lower().endswith(('.xls', '.xlsx')):
                file_type = 'xlsx'
            else:
                return {"error": "No se pudo detectar el tipo de archivo. Extensión no soportada."}, 400

        if file_type == 'xml':
            result = normalize_xml_to_json(save_path, settings)
            if not result or 'match' not in result or 'events' not in result:
                return {"error": "Datos faltantes en archivo XML"}, 400
            import_match_from_json(result, settings)
        elif file_type in ['xls', 'xlsx']:
            result = normalize_excel_to_json(save_path, settings)
            import_match_from_excel(save_path, {'settings': settings})
        else:
            return {"error": "Tipo de archivo no soportado"}, 400

        return {"message": f"Archivo importado usando perfil '{profile_name}'"}, 200
    except Exception as e:
        return {"error": str(e)}, 500
    finally:
        db.close()



@app.route('/api/import/preview', methods=['POST'])
def preview_file():
    print(f"👉 Preview request - method: {request.method}")
    print(f"👉 Request files: {list(request.files.keys())}")
    print(f"👉 Request args: {dict(request.args)}")
    
    if 'file' not in request.files:
        print("👉 No file in request")
        return {"error": "No file provided"}, 400

    file = request.files['file']
    print(f"👉 Archivo recibido: {file.filename}")
    
    filename = secure_filename(file.filename)
    save_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(save_path)
    
    print(f"👉 Archivo guardado en: {save_path}")
    print(f"👉 Archivo existe: {os.path.exists(save_path)}")

    profile_name = request.args.get("profile")
    if not profile_name:
        return {"error": "Debe especificar ?profile=NombreDelPerfil"}, 400

    db = SessionLocal()
    try:
        profile = db.query(ImportProfile).filter_by(name=profile_name).first()
        if not profile:
            return {"error": f"Perfil '{profile_name}' no encontrado"}, 404

        settings = safe_profile_settings(profile)
        file_type = settings.get('file_type', '').lower()

        if not file_type:
            if filename.lower().endswith('.xml'):
                file_type = 'xml'
            elif filename.lower().endswith(('.xls', '.xlsx')):
                file_type = 'xlsx'
            else:
                return {"error": "No se pudo detectar el tipo de archivo. Extensión no soportada."}, 400

        if file_type == 'xml':
            result = normalize_xml_to_json(save_path, settings)
            if not result or 'match' not in result or 'events' not in result:
                return {"error": "Datos faltantes en archivo XML"}, 400
        elif file_type in ['xls', 'xlsx']:
            result = normalize_excel_to_json(save_path, settings)
        else:
            return {"error": "Tipo de archivo no soportado"}, 400

        match = result.get('match')
        events = result.get('events', [])
        event_types = sorted(set(str(ev.get('event_type', 'Desconocido')) for ev in events))
        players = sorted(set(str(ev.get('player')) for ev in events if ev.get('player')))

        response_data = {
            'match_info': match,
            'events': events,
            'event_count': len(events),
            'event_types': event_types,
            'players': players
        }
        return Response(json.dumps(convert_json_safe(response_data)), mimetype='application/json'), 200
    except Exception as e:
        return {"error": str(e)}, 500
    finally:
        db.close()


def convert_json_safe(data):
    """Convierte datos que pueden contener tipos no serializables a JSON"""
    import numpy as np
    import pandas as pd
    from datetime import datetime, date, time
    
    if isinstance(data, dict):
        return {k: convert_json_safe(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [convert_json_safe(item) for item in data]
    elif isinstance(data, (np.integer, np.floating)):
        return float(data)
    elif isinstance(data, np.ndarray):
        return data.tolist()
    elif isinstance(data, (datetime, date, time)):
        return data.isoformat()
    elif pd.isna(data):
        return None
    else:
        return data


@app.route("/api/save_match", methods=["POST"])
def save_match():
    print("👉 SAVE_MATCH: Iniciando importación")
    data = request.get_json()

    if not data or 'match' not in data or 'events' not in data:
        return jsonify({"error": "Faltan datos"}), 400

    profile_name = data.get('profile')
    if not profile_name:
        return jsonify({"error": "Falta el perfil"}), 400

    db = SessionLocal()
    try:
        profile = db.query(ImportProfile).filter_by(name=profile_name).first()
        if not profile:
            return jsonify({"error": f"Perfil '{profile_name}' no encontrado"}), 404

        settings = safe_profile_settings(profile)
        mapping = data.get('mapping') or settings.get('mapping')
        events_to_import = data.get('events', [])

        if mapping:
            try:
                events_mapped = apply_mapping_to_events_py(events_to_import, mapping)
                data['events'] = events_mapped
            except Exception as map_err:
                return jsonify({"error": f"Error aplicando mapping: {str(map_err)}"}), 500

        # Minimal validation: check time mapped
        evs = data.get('events', [])
        has_time = any((ev.get('timestamp_sec') is not None) or (ev.get('extra_data', {}) and ev.get('extra_data', {}).get('Game_Time')) for ev in evs)
        if not has_time:
            return jsonify({"error": "Falta mapeo de tiempo (timestamp_sec) en los eventos. Por favor mapea el campo de tiempo en la preview."}), 400

        # Validación liviana: solo se exige event_type/CATEGORY y timestamp_sec numérico si viene
        validation_errors = []
        for i, ev in enumerate(evs):
            # Check event_type
            if not ev.get('event_type') and not ev.get('CATEGORY'):
                validation_errors.append(f"Evento {i+1}: Falta event_type o CATEGORY")

            # Check timestamp_sec
            timestamp = ev.get('timestamp_sec')
            if timestamp is None:
                # Se permite null: si no viene, se puede derivar desde Game_Time/clip_start luego
                pass
            elif not isinstance(timestamp, (int, float)):
                validation_errors.append(f"Evento {i+1}: timestamp_sec debe ser numérico, no {type(timestamp)}")

        if validation_errors:
            return jsonify({"error": "Errores de validación en eventos mapeados", "details": validation_errors[:10]}), 400  # Limit to first 10 errors

        # Propagar team_id si viene en payload o en match_info
        if data.get("team_id") is None and data.get("match", {}).get("team_id") is not None:
            data["team_id"] = data["match"].get("team_id")

        import_match_from_json(data, settings)
        return jsonify({"message": "Importación exitosa"}), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@app.route("/api/matches/<int:match_id>/events/bulk_update", methods=["POST"])
def bulk_update_events(match_id: int):
    """
    Permite actualizar campos de múltiples eventos sin reimportar el archivo.
    Espera JSON: {"updates": [ {"id": <event_id>, "fields": { ... } }, ... ]}
    """
    payload = request.get_json() or {}
    updates = payload.get("updates", [])
    if not isinstance(updates, list) or len(updates) == 0:
        return jsonify({"error": "Faltan updates"}), 400

    allowed_fields = {"PLAYER", "TEAM", "CATEGORY", "event_type", "ADVANCE", "timestamp_sec", "extra_data"}
    db = SessionLocal()
    updated = 0
    try:
        for upd in updates:
            ev_id = upd.get("id")
            fields = upd.get("fields", {})
            if ev_id is None or not isinstance(fields, dict):
                continue
            ev = db.query(Event).filter_by(id=ev_id, match_id=match_id).first()
            if not ev:
                continue
            for key, val in fields.items():
                if key not in allowed_fields:
                    continue
                if key == "extra_data":
                    # Merge extra_data dict
                    if not isinstance(val, dict):
                        continue
                    current = ev.extra_data or {}
                    merged = dict(current)
                    merged.update(val)
                    ev.extra_data = merged
                else:
                    setattr(ev, key, val)
            updated += 1
        db.commit()
        return jsonify({"message": f"Actualizados {updated} eventos"}), 200
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

def ensure_default_import_profile():
    db = SessionLocal()
    try:
        # Crear perfil Default (Excel)
        default_existing = db.query(ImportProfile).filter_by(name='Default').first()
        default_settings = {
            "file_type": "xlsx",
            "events_sheet": "MATRIZ",
            "meta_sheet": "MATCHES",
            "col_event_type": "CATEGORY",  # Columna original en Excel
            "col_player": "PLAYER",
            "col_time": "SECOND",  # Columna original en Excel
            "col_x": "COORDINATE_X",
            "col_y": "COORDINATE_Y",
            "discard_categories": [],
            "normalize_penalty_cards": True,
            "normalize_lineout": True,
            "normalize_tackle": True,
            "time_mapping": {
                "method": "event_based",
                "kick_off_1": {"category": "KICK OFF", "descriptor": "PERIODS", "descriptor_value": "1"},
                "end_1": {"category": "END", "descriptor": "PERIODS", "descriptor_value": "1"},
                "kick_off_2": {"category": "KICK OFF", "descriptor": "PERIODS", "descriptor_value": "2"},
                "end_2": {"category": "END", "descriptor": "PERIODS", "descriptor_value": "2"},
                "manual_times": {
                    "kick_off_1": 0,
                    "end_1": 2400,
                    "kick_off_2": 2700,
                    "end_2": 4800
                }
            }
        }
        
        if not default_existing:
            profile = ImportProfile(name='Default', description='Perfil por defecto para Excel', settings=default_settings)
            db.add(profile)
        else:
            db.query(ImportProfile).filter_by(id=default_existing.id).update({"settings": default_settings})
        
        # Crear perfil para XML
        xml_existing = db.query(ImportProfile).filter_by(name='Importacion XML').first()
        xml_settings = {
            "file_type": "xml",
            "col_event_type": "event_type",
            "col_player": "player",
            "col_time": "timestamp_sec",
            "col_x": "x",
            "col_y": "y",
            "discard_categories": [],
            "normalize_penalty_cards": True,
            "normalize_lineout": True,
            "normalize_tackle": True,
            "manual_period_times": {
                "kick_off_1": 0,      # Segundo donde inicia el primer tiempo
                "end_1": 2400,        # Segundo donde termina el primer tiempo
                "kick_off_2": 2700,   # Segundo donde inicia el segundo tiempo
                "end_2": 4800         # Segundo donde termina el segundo tiempo
            }
        }
        
        if not xml_existing:
            profile = ImportProfile(name='Importacion XML', description='Perfil para archivos XML', settings=xml_settings)
            db.add(profile)
        else:
            db.query(ImportProfile).filter_by(id=xml_existing.id).update({"settings": xml_settings})
        
        db.commit()
        print("✅ Perfiles por defecto creados/actualizados")
    finally:
        db.close()


    def mmss_to_seconds_py(val):
        try:
            if val is None:
                return None
            if isinstance(val, (int, float)):
                return float(val)
            s = str(val).strip()
            if ':' in s:
                parts = s.split(':')
                if len(parts) == 2:
                    m = float(parts[0]) if parts[0] else 0
                    sec = float(parts[1]) if parts[1] else 0
                    return m * 60 + sec
                # fallback
                return float(parts[0])
            return float(s)
        except Exception:
            return None


    def read_path(ev, path):
        # path examples: 'extra_data.AVANCE', 'extra_data.descriptors.AVANCE', 'PLAYER'
        try:
            if '.' not in path:
                return ev.get(path)
            parts = path.split('.')
            cur = ev
            for p in parts:
                if cur is None:
                    return None
                if isinstance(cur, dict):
                    cur = cur.get(p)
                else:
                    return None
            return cur
        except Exception:
            return None


    def write_path(ev, path, value):
        try:
            if '.' not in path:
                ev[path] = value
                return
            parts = path.split('.')
            cur = ev
            for i, p in enumerate(parts):
                if i == len(parts) - 1:
                    # final
                    if isinstance(cur, dict):
                        cur[p] = value
                    return
                # intermediate
                if isinstance(cur, dict):
                    if p not in cur or cur[p] is None:
                        cur[p] = {}
                    cur = cur[p]
                else:
                    return
        except Exception:
            return


ensure_default_import_profile()

@app.route('/api/import/profiles', methods=['POST'])
def create_or_update_profile():
    data = request.get_json()
    name = data.get('name')
    description = data.get('description', '')
    settings = data.get('settings')

    if not name or not settings:
        return jsonify({"error": "Faltan 'name' o 'settings'"}), 400

    db = SessionLocal()
    try:
        profile = db.query(ImportProfile).filter_by(name=name).first()
        if profile:
            profile.description = description
            # Use update to set JSON column safely
            db.query(ImportProfile).filter_by(id=profile.id).update({"settings": settings})
            message = "Perfil actualizado"
        else:
            profile = ImportProfile(name=name, description=description, settings=settings)
            db.add(profile)
            message = "Perfil creado"
        db.commit()
        return jsonify({"message": message}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

register_routes(app)

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5001)

@app.route('/api/debug/time_calculation', methods=['POST'])
def debug_time_calculation():
    """Endpoint para debug rápido de cálculos de tiempo sin import completo"""
    data = request.get_json()
    
    # Eventos de ejemplo o datos reales
    events = data.get('events', [])
    profile_data = data.get('profile', {})
    # Permitir indicar nombre de perfil en query param ?profile=Nombre
    profile_name = request.args.get('profile')
    if profile_name:
        db = SessionLocal()
        try:
            prof = db.query(ImportProfile).filter_by(name=profile_name).first()
            if not prof:
                return jsonify({"error": f"Perfil '{profile_name}' no encontrado"}), 404
            profile_data = safe_profile_settings(prof)
        finally:
            db.close()
    
    if not events:
        return jsonify({"error": "Se necesitan eventos para el debug"}), 400
    
    print(f"🔍 DEBUG TIME CALCULATION - Eventos recibidos: {len(events)}")
    print(f"🔍 Profile data: {profile_data}")
    
    # Cargar perfil por defecto si no se especifica
    if not profile_data:
        db = SessionLocal()
        try:
            profile = db.query(ImportProfile).filter_by(name='Default').first()
            if profile:
                profile_data = safe_profile_settings(profile)
        finally:
            db.close()
    # Migrar esquema de time_mapping legacy: renombrar 'period' a 'value' y establecer descriptor por defecto
    tm = profile_data.get('time_mapping', {})
    for key in ['kick_off_1', 'end_1', 'kick_off_2', 'end_2']:
        entry = tm.get(key)
        if isinstance(entry, dict):
            # migrar descriptor_value a value si existe
            # migrar descriptor_value solo si tiene contenido válido
            dv = entry.get('descriptor_value')
            if dv not in (None, '', 'nan') and 'value' not in entry:
                try:
                    entry['value'] = int(float(dv))
                except (TypeError, ValueError):
                    # si no es convertible, ignorar descriptor_value
                    pass
            # renombrar clave 'period' a 'value' si existe
            if 'period' in entry and 'value' not in entry:
                entry['value'] = entry.pop('period')
            # asegurar descriptor esté presente
            if not entry.get('descriptor'):
                entry['descriptor'] = 'PERIODS'
    profile_data['time_mapping'] = tm
    print(f"🔍 Migrated time_mapping: {profile_data['time_mapping']}")
    # Simular match_info básico
    match_info = data.get('match_info', {
        'home_team': 'Test Team',
        'away_team': 'Opponent',
        'date': '2024-01-01'
    })
    
    print(f"🔍 Match info: {match_info}")
    
    try:
        # Llamar directamente a enrich_events para debug
        from enricher import enrich_events
        
        enriched_events = enrich_events(events, match_info, profile_data)
        
        # Analizar resultados
        time_analysis = {
            'total_events': len(enriched_events),
            'events_with_time_video': len([e for e in enriched_events if e.get('extra_data', {}).get('TIME(VIDEO)') != '00:00']),
            'events_with_game_time': len([e for e in enriched_events if e.get('extra_data', {}).get('Game_Time') != '00:00']),
            'sample_events': enriched_events[:5],  # Primeros 5 eventos para inspección
            'time_distribution': {}
        }
        
        # Distribución de tiempos TIME(VIDEO)
        for event in enriched_events:
            time_video = event.get('extra_data', {}).get('TIME(VIDEO)', 'N/A')
            if time_video not in time_analysis['time_distribution']:
                time_analysis['time_distribution'][time_video] = 0
            time_analysis['time_distribution'][time_video] += 1
        
        return jsonify({
            'enriched_events': enriched_events,
            'analysis': time_analysis,
            'profile_used': profile_data
        }), 200
        
    except Exception as e:
        import traceback
        print(f"🔍 Error en debug time calculation: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500
