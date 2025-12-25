import os
import math
import xml.etree.ElementTree as ET
from datetime import datetime, date, time
from sqlalchemy.orm import Session
from db import SessionLocal
from models import Club, Team, Player, Match, Event
from normalizer import normalize_excel_to_json, normalize_xml_to_json
from translator import get_translator

def clean_extra_data(data):
    def convert(v):
        if isinstance(v, (date, time)):
            return v.isoformat()
        return v
    return {k: convert(v) for k, v in data.items() if v is not None}

def infer_team_for_event(event, events_list, team_stats, our_team_guess, opponent_guess):
    """
    Infiere el equipo para un evento que no tiene campo 'team' explícito.
    
    Estrategia:
    1. Si tiene jugador → buscar en eventos previos qué equipo usa ese jugador
    2. Por tipo de evento:
       - ATTACK/TURNOVER+ → nuestro equipo (tenemos posesión)
       - DEFENSE → nuestro equipo (estamos defendiendo)
       - TURNOVER- → nuestro equipo (perdimos)
    3. Por proximidad temporal → equipo del evento más cercano con team
    
    Returns:
        str: Nombre del equipo sugerido, o None si no se puede inferir
    """
    event_type = event.get('event_type', '').upper()
    player = event.get('player')
    timestamp = event.get('timestamp_sec', 0)
    
    # Estrategia 1: Si tiene jugador, buscar qué equipo usa ese jugador
    if player:
        player_teams = {}
        for ev in events_list:
            if ev.get('player') == player:
                ev_team = ev.get('team')
                if not ev_team:
                    extra_data = ev.get('extra_data', {})
                    ev_team = extra_data.get('team') or extra_data.get('EQUIPO') or extra_data.get('TEAM')
                
                if ev_team:
                    player_teams[ev_team] = player_teams.get(ev_team, 0) + 1
        
        if player_teams:
            # Retornar el equipo más frecuente para ese jugador
            return max(player_teams.items(), key=lambda x: x[1])[0]
    
    # Estrategia 2: Inferencia por tipo de evento
    if event_type in ['ATTACK', 'TURNOVER+', 'TURNOVER-']:
        return our_team_guess
    elif event_type == 'DEFENSE':
        return our_team_guess  # Estamos defendiendo
    
    # Estrategia 3: Proximidad temporal
    closest_event = None
    min_distance = float('inf')
    
    for ev in events_list:
        ev_team = ev.get('team')
        if not ev_team:
            extra_data = ev.get('extra_data', {})
            ev_team = extra_data.get('team') or extra_data.get('EQUIPO') or extra_data.get('TEAM')
        
        if ev_team:
            ev_timestamp = ev.get('timestamp_sec', 0)
            distance = abs(ev_timestamp - timestamp)
            if distance < min_distance:
                min_distance = distance
                closest_event = ev_team
    
    # Solo usar proximidad si está a menos de 30 segundos
    if closest_event and min_distance < 30:
        return closest_event
    
    return None

def detect_teams_in_events(events):
    """
    Detecta todos los valores únicos de team en los eventos.
    Retorna un dict con conteos, clasificación automática y análisis de eventos sin equipo.
    
    Returns:
        {
            'detected_teams': [...],
            'total_events_with_team': 270,
            'suggested_our_team': 'PESCARA',
            'suggested_opponent': 'RIVAL',
            'events_without_team': {
                'total_count': 150,
                'by_type': {
                    'ATTACK': {'count': 20, 'suggested_team': 'PESCARA'},
                    'DEFENSE': {'count': 15, 'suggested_team': 'PESCARA'},
                    'TURNOVER+': {'count': 3, 'suggested_team': 'PESCARA'},
                    ...
                },
                'inference_rules': [...]
            }
        }
    """
    team_stats = {}
    opponent_keywords = {'RIVAL', 'OPPONENT', 'OPONENTE', 'OPPOSING'}
    events_without_team = []
    
    for ev in events:
        team = ev.get('team')
        if not team:
            # Intentar obtener de extra_data
            extra_data = ev.get('extra_data', {})
            team = extra_data.get('team') or extra_data.get('EQUIPO') or extra_data.get('TEAM')
        
        if team:
            if team not in team_stats:
                team_stats[team] = {
                    'name': team,
                    'count': 0,
                    'is_likely_opponent': team.upper() in opponent_keywords,
                    'event_types': set()
                }
            team_stats[team]['count'] += 1
            team_stats[team]['event_types'].add(ev.get('event_type', 'UNKNOWN'))
        else:
            # Evento sin equipo
            events_without_team.append(ev)
    
    # Convertir a lista y ordenar por count
    detected_teams = []
    for team_name, stats in team_stats.items():
        detected_teams.append({
            'name': stats['name'],
            'count': stats['count'],
            'is_likely_opponent': stats['is_likely_opponent'],
            'sample_events': list(stats['event_types'])[:5]
        })
    
    detected_teams.sort(key=lambda x: x['count'], reverse=True)
    
    # Sugerir cuál es nuestro equipo
    our_team_candidates = [t for t in detected_teams if not t['is_likely_opponent']]
    suggested_our_team = our_team_candidates[0]['name'] if our_team_candidates else None
    
    # Sugerir opponent
    opponent_candidates = [t for t in detected_teams if t['is_likely_opponent']]
    if opponent_candidates:
        suggested_opponent = opponent_candidates[0]['name']
    elif len(detected_teams) > 1:
        suggested_opponent = detected_teams[1]['name']
    else:
        suggested_opponent = None
    
    total_events_with_team = sum(t['count'] for t in detected_teams)
    
    # Analizar eventos sin equipo
    events_without_team_analysis = {
        'total_count': len(events_without_team),
        'by_type': {},
        'inference_rules': []
    }
    
    if events_without_team:
        # Agrupar por tipo
        by_type = {}
        for ev in events_without_team:
            event_type = ev.get('event_type', 'UNKNOWN')
            if event_type not in by_type:
                by_type[event_type] = []
            by_type[event_type].append(ev)
        
        # Para cada tipo, sugerir equipo
        for event_type, type_events in by_type.items():
            # Usar el primer evento como muestra para inferir
            sample_event = type_events[0]
            suggested_team = infer_team_for_event(
                sample_event, 
                events, 
                team_stats, 
                suggested_our_team, 
                suggested_opponent
            )
            
            events_without_team_analysis['by_type'][event_type] = {
                'count': len(type_events),
                'suggested_team': suggested_team,
                'has_players': any(ev.get('player') for ev in type_events)
            }
        
        # Crear reglas de inferencia sugeridas
        for event_type, info in events_without_team_analysis['by_type'].items():
            if info['suggested_team']:
                # Normalizar assign_to a 'our_team' o 'opponent'
                assign_to = 'our_team'
                if info['suggested_team'] == suggested_opponent:
                    assign_to = 'opponent'
                elif info['suggested_team'] != suggested_our_team:
                    # Si no coincide con ninguno, usar 'our_team' por defecto
                    assign_to = 'our_team'
                
                rule = {
                    'event_type': event_type,
                    'assign_to': assign_to,
                    'count': info['count'],
                    'reason': _get_inference_reason(event_type, info)
                }
                events_without_team_analysis['inference_rules'].append(rule)
    
    return {
        'detected_teams': detected_teams,
        'total_events_with_team': total_events_with_team,
        'suggested_our_team': suggested_our_team,
        'suggested_opponent': suggested_opponent,
        'events_without_team': events_without_team_analysis
    }

def _get_inference_reason(event_type, info):
    """Genera una explicación legible de por qué se sugiere cierto equipo."""
    if event_type in ['ATTACK', 'TURNOVER+']:
        return "Eventos de ataque típicamente son del equipo con posesión"
    elif event_type == 'DEFENSE':
        return "Eventos defensivos son del equipo que defiende"
    elif event_type == 'TURNOVER-':
        return "Pérdida de posesión es del equipo que pierde"
    elif info.get('has_players'):
        return "Inferido por jugadores que participan en eventos similares"
    else:
        return "Inferido por proximidad temporal con otros eventos"

def create_or_get_player(db, player_name):
    """
    Devuelve un jugador existente o lo crea si no existe.
    """
    name = str(player_name).strip() if player_name else "Desconocido"
    player = db.query(Player).filter_by(full_name=name).first()
    if not player:
        player = Player(full_name=name)
        db.add(player)
        db.commit()
    return player

def import_match_from_xml(xml_path: str, profile: dict, discard_categories=None, team_mapping=None, team_inference=None):
    """
    Importa un partido y sus eventos desde un archivo XML con la estructura de LongoMatch/Sportscode/Nacsport.
    Usa el normalizer para limpiar caracteres especiales y procesar el XML correctamente.
    
    Args:
        xml_path: Ruta al archivo XML
        profile: Diccionario con configuración del partido
        discard_categories: Lista de categorías a descartar (ej: ['END', 'WARMUP', 'TIMEOUT'])
        team_mapping: Diccionario opcional con mapeo de equipos detectados a equipos de BD
                     Formato: {
                         'our_team': {'team_id': 18, 'name': 'Pescara', 'detected_name': 'PESCARA'},
                         'opponent': {'team_id': 25, 'name': 'CASI', 'is_new': True, 'detected_name': 'RIVAL'}
                     }
        team_inference: Lista de reglas para asignar equipo a eventos sin campo 'team'
                       Formato: [
                           {'event_type': 'ATTACK', 'assign_to': 'our_team'},
                           {'event_type': 'DEFENSE', 'assign_to': 'our_team'},
                           {'event_type': 'TURNOVER+', 'assign_to': 'our_team'}
                       ]
    """
    if not os.path.exists(xml_path):
        print(f"❌ El archivo {xml_path} no existe.")
        return False

    print(f"🔍 Iniciando importación desde XML: {xml_path}")
    
    # Si no se especifican categorías a descartar, usar lista vacía
    if discard_categories is None:
        discard_categories = []
    
    db = SessionLocal()
    try:
        # Inicializar traductor
        translator = get_translator(db)
        print(f"✅ Traductor inicializado con {len(translator._cache)} mapeos")
        
        # Usar normalizer para procesar el XML (limpia caracteres especiales)
        print(f"📥 Normalizando archivo XML: {xml_path}")
        print(f"🔍 Descartando categorías: {discard_categories}")
        data = normalize_xml_to_json(xml_path, profile, discard_categories=discard_categories, translator=translator)
        
        if not data or "match" not in data or "events" not in data:
            print("❌ Error: archivo no contiene información válida")
            return False
            
        match_info = data["match"]
        events = data["events"]
        print(f"✅ Normalización completada: {len(events)} eventos extraídos")

        # Enriquecer eventos (Game_Time, TRY_ORIGIN, etc.)
        print(f"🔄 Enriqueciendo eventos...")
        from enricher import enrich_events
        events = enrich_events(events, match_info, profile)
        print(f"✅ Eventos enriquecidos")

        # Usar datos del profile si están disponibles, sino del match_info
        team_name = profile.get("team", match_info.get("team", "Desconocido"))
        opponent_name = profile.get("opponent", match_info.get("opponent", match_info.get("opponent_name")))
        match_date_str = profile.get("date", match_info.get("date", "2023-01-01"))
        
        # Si hay team_mapping, usarlo para crear/obtener equipos
        if team_mapping:
            print(f"🗺️  Usando mapeo de equipos proporcionado")
            our_team_mapping = team_mapping.get('our_team', {})
            opponent_mapping = team_mapping.get('opponent', {})
            
            # Obtener nuestro equipo del mapeo
            if our_team_mapping.get('team_id'):
                team = db.query(Team).filter_by(id=our_team_mapping['team_id']).first()
                if not team:
                    print(f"❌ Error: team_id {our_team_mapping['team_id']} no encontrado")
                    return False
                club = db.query(Club).filter_by(id=team.club_id).first()
                print(f"✅ Usando equipo existente: {team.name} (id={team.id})")
            else:
                print(f"❌ Error: team_mapping no contiene team_id para our_team")
                return False
            
            # Crear o buscar equipo oponente
            if opponent_mapping:
                if opponent_mapping.get('is_new'):
                    # Crear nuevo equipo oponente
                    opponent_team = Team(
                        name=opponent_mapping['name'],
                        club_id=club.id,
                        category="Senior",
                        season=str(match_date_str[:4]),
                        is_opponent=True
                    )
                    db.add(opponent_team)
                    db.commit()
                    opponent_name = opponent_team.name
                    print(f"✅ Equipo oponente creado: {opponent_team.name} (is_opponent=True)")
                elif opponent_mapping.get('team_id'):
                    # Usar equipo oponente existente
                    opponent_team = db.query(Team).filter_by(id=opponent_mapping['team_id']).first()
                    if opponent_team:
                        opponent_name = opponent_team.name
                        print(f"✅ Usando equipo oponente existente: {opponent_team.name} (id={opponent_team.id})")
                    else:
                        print(f"⚠️  team_id {opponent_mapping['team_id']} no encontrado, usando nombre por defecto")
        else:
            # Comportamiento original: crear club/equipo basado en profile
            print(f"🔄 Modo legacy: creando equipos desde profile (sin team_mapping)")
            club = db.query(Club).filter_by(name=team_name).first()
            if not club:
                club = Club(name=team_name)
                db.add(club)
                db.commit()
                print(f"✅ Club creado: {club.name}")

            team = db.query(Team).filter_by(name=team_name, club_id=club.id).first()
            if not team:
                team = Team(name=team_name, club_id=club.id, category="Senior", season=str(match_date_str[:4]))
                db.add(team)
                db.commit()
                print(f"✅ Equipo creado: {team.name}")
        
        # Normalizar nombres de equipo en eventos
        normalized_count = 0
        inference_count = 0
        print(f"🔄 Normalizando nombres de equipo en eventos...")
        
        # PASO 1: Aplicar team_inference para eventos sin campo 'team'
        if team_inference and team_mapping:
            print(f"🧠 Aplicando inferencia de equipo a eventos sin 'team'...")
            our_team_detected = team_mapping.get('our_team', {}).get('detected_name')
            opponent_detected = team_mapping.get('opponent', {}).get('detected_name')
            
            # Crear mapeo de reglas: event_type -> team detectado
            inference_map = {}
            for rule in team_inference:
                event_type = rule.get('event_type')
                assign_to = rule.get('assign_to')  # 'our_team' o 'opponent'
                
                if assign_to == 'our_team':
                    inference_map[event_type] = our_team_detected
                elif assign_to == 'opponent':
                    inference_map[event_type] = opponent_detected
            
            # Aplicar inferencias
            for ev in events:
                has_team = ev.get('team') or (ev.get('extra_data', {}).get('team') or 
                                             ev.get('extra_data', {}).get('EQUIPO') or 
                                             ev.get('extra_data', {}).get('TEAM'))
                
                if not has_team:
                    event_type = ev.get('event_type')
                    if event_type in inference_map:
                        inferred_team = inference_map[event_type]
                        ev['team'] = inferred_team
                        if not ev.get('extra_data'):
                            ev['extra_data'] = {}
                        ev['extra_data']['team'] = inferred_team
                        ev['extra_data']['_team_inferred'] = True  # Flag para indicar que fue inferido
                        inference_count += 1
            
            print(f"✅ {inference_count} eventos sin equipo fueron asignados por inferencia")
        
        # PASO 2: Normalizar nombres de equipos detectados a nombres reales
        if team_mapping:
            # Usar mapeo explícito: cada equipo detectado se mapea a su nombre real
            our_team_detected = team_mapping.get('our_team', {}).get('detected_name')
            opponent_detected = team_mapping.get('opponent', {}).get('detected_name')
            our_team_real = team.name
            opponent_real = opponent_name
            
            print(f"🗺️  Mapeo: '{our_team_detected}' → '{our_team_real}', '{opponent_detected}' → '{opponent_real}'")
            
            for ev in events:
                # Mapear el campo team en el evento
                if ev.get('team'):
                    if ev['team'] == our_team_detected:
                        ev['team'] = our_team_real
                        normalized_count += 1
                    elif ev['team'] == opponent_detected:
                        ev['team'] = opponent_real
                        normalized_count += 1
                
                # Normalizar también en extra_data si existe
                if ev.get('extra_data'):
                    for key in ['team', 'EQUIPO', 'TEAM']:
                        if ev['extra_data'].get(key):
                            if ev['extra_data'][key] == our_team_detected:
                                ev['extra_data'][key] = our_team_real
                            elif ev['extra_data'][key] == opponent_detected:
                                ev['extra_data'][key] = opponent_real
        else:
            # Modo legacy: usar keywords hardcodeados
            opponent_keywords = ['RIVAL', 'OPPONENT', 'OPONENTE']
            for ev in events:
                # Si el evento tiene un valor de team que NO es RIVAL/OPPONENT, reemplazar con team.name
                if ev.get('team') and ev['team'] not in opponent_keywords:
                    ev['team'] = team.name
                    normalized_count += 1
                # Normalizar también en extra_data si existe
                if ev.get('extra_data'):
                    if ev['extra_data'].get('team') and ev['extra_data']['team'] not in opponent_keywords:
                        ev['extra_data']['team'] = team.name
                    if ev['extra_data'].get('EQUIPO') and ev['extra_data']['EQUIPO'] not in opponent_keywords:
                        ev['extra_data']['EQUIPO'] = team.name
                    if ev['extra_data'].get('TEAM') and ev['extra_data']['TEAM'] not in opponent_keywords:
                        ev['extra_data']['TEAM'] = team.name
        
        print(f"✅ Normalizados {normalized_count} eventos con mapeo de equipos")

        match_date = datetime.strptime(match_date_str, "%Y-%m-%d").date()
        match = Match(
            team_id=team.id,
            opponent_name=opponent_name,
            date=match_date,
            location=profile.get("location", match_info.get("location", "Desconocido")),
            video_url=profile.get("video_url", match_info.get("video_url", "")),
            competition=profile.get("competition", match_info.get("competition")),
            round=profile.get("round", match_info.get("round")),
            field=profile.get("field", match_info.get("field")),
            rain=profile.get("rain", match_info.get("rain")),
            muddy=profile.get("muddy", match_info.get("muddy")),
            wind_1p=profile.get("wind_1p", match_info.get("wind_1p")),
            wind_2p=profile.get("wind_2p", match_info.get("wind_2p")),
            referee=profile.get("referee", match_info.get("referee")),
            result=profile.get("result", match_info.get("result"))
        )
        db.add(match)
        db.commit()
        print(f"✅ Partido creado: {team_name} vs {opponent_name} en {match.location}")

        # Insertar eventos y jugadores
        for ev in events:
            # Si hay jugadores, crear todos
            player_ids = []
            if ev.get("players"):
                for pname in ev["players"]:
                    player = create_or_get_player(db, pname)
                    player_ids.append(player.id)
            # Usar el primer jugador como principal
            main_player_id = player_ids[0] if player_ids else None

            event = Event(
                match_id=match.id,
                player_id=main_player_id,
                event_type=str(ev.get("event_type")),
                timestamp_sec=ev.get("timestamp_sec", 0),
                x=ev.get("x"),
                y=ev.get("y"),
                extra_data=clean_extra_data(ev.get("extra_data", {}))
            )
            db.add(event)

        db.commit()
        print(f"✅ Eventos insertados correctamente. Total: {len(events)}")

        return {"events": events, "match_info": match_info}

    except Exception as e:
        db.rollback()
        print(f"❌ Error al importar desde XML: {e}")
        return False
    finally:
        db.close()

def import_match_from_excel(excel_path: str, profile: dict):
    print(f"📥 Normalizando archivo: {excel_path}")
    data = normalize_excel_to_json(excel_path, profile)
    db = SessionLocal()

    if not data or "match" not in data or "events" not in data:
        print("❌ Error: archivo no contiene información válida")
        return

    match_info = data["match"]
    events = data["events"]

    try:
        # Crear o buscar club
        club = db.query(Club).filter_by(name=match_info["team"]).first()
        if not club:
            club = Club(name=match_info["team"])
            db.add(club)
            db.commit()
            print(f"✅ Club creado: {club.name}")

        # Crear o buscar equipo
        team = db.query(Team).filter_by(name=match_info["team"], club_id=club.id).first()
        if not team:
            team = Team(name=match_info["team"], club_id=club.id, category="Senior", season=str(match_info["date"][:4]))
            db.add(team)
            db.commit()
            print(f"✅ Equipo creado: {team.name}")

        # Crear partido
        match_date = datetime.strptime(match_info["date"], "%Y-%m-%d").date()
        match = Match(
            team_id=team.id,
            opponent_name=match_info["opponent"],
            date=match_date,
            location=match_info.get("location", "Desconocido"),
            video_url=match_info.get("video_url", ""),
            competition=match_info.get("competition"),
            round=match_info.get("round"),
            field=match_info.get("field"),
            rain=match_info.get("rain"),
            muddy=match_info.get("muddy"),
            wind_1p=match_info.get("wind_1p"),
            wind_2p=match_info.get("wind_2p"),
            referee=match_info.get("referee"),
            result=match_info.get("result")
        )

        db.add(match)
        db.commit()
        print(f"✅ Partido creado: vs {match.opponent_name} en {match.location}")

        # Insertar jugadores y eventos
        player_cache = {}

        for ev in events:
            player = create_or_get_player(db, ev.get("player"))
            raw_time = ev.get("timestamp_sec") or 0
            raw_time = int(raw_time) if not math.isnan(raw_time) else 0

            event = Event(
                match_id=match.id,
                player_id=player.id,
                event_type=str(ev.get("event_type")),  # 👈 Unificado
                timestamp_sec=raw_time,
                x=ev.get("x") if not (ev.get("x") is None or math.isnan(ev.get("x"))) else None,
                y=ev.get("y") if not (ev.get("y") is None or math.isnan(ev.get("y"))) else None,
                extra_data=clean_extra_data(ev.get("extra_data", {}))  # 👈 Aplicado
            )
            db.add(event)

        db.commit()
        print("✅ Eventos insertados correctamente.")

    except Exception as e:
        db.rollback()
        print(f"❌ Error al importar: {e}")
    finally:
        db.close()

def import_match_from_json(json_data: dict, profile: dict):
    """
    Importa un partido y sus eventos desde un diccionario JSON (resultado de normalize_xml_to_json).
    Soporta team_inference para asignar equipos a eventos sin equipo explícito.
    """
    print(f"🔍 Iniciando importación desde JSON")
    db = SessionLocal()
    try:
        match_info = json_data.get("match", {})
        provided_team_id = json_data.get("team_id") or match_info.get("team_id")
        events = json_data.get("events", [])
        team_inference = json_data.get("team_inference")  # Nuevas reglas de inferencia
        
        # Usar datos del perfil si no están en match_info
        match_info.setdefault("team", profile.get("team", "Desconocido"))
        match_info.setdefault("opponent_name", profile.get("opponent", "Rival"))
        match_info.setdefault("date", profile.get("date", "2023-01-01"))
        
        print(f"🔍 Metadatos del partido: {match_info}")
        print(f"🔍 Eventos a importar: {len(events)}")

        # Enriquecer eventos usando enricher
        from enricher import enrich_events
        try:
            events = enrich_events(events, match_info, profile)
            print(f"✅ Eventos enriquecidos correctamente.")
        except Exception as enrich_error:
            print(f"❌ Error en enriquecimiento de eventos: {enrich_error}")
            return False

        # Resolver club/equipo/partido
        team = None
        club = None
        if provided_team_id:
            team = db.query(Team).get(provided_team_id)
            if not team:
                raise ValueError(f"team_id {provided_team_id} no encontrado")
            club = db.query(Club).get(team.club_id) if team.club_id else None
            # Ajustar nombre de team en match_info para logs/consistencia
            match_info["team"] = team.name
        else:
            # fallback legacy: crear/usar por nombre
            club = db.query(Club).filter_by(name=match_info["team"]).first()
            if not club:
                club = Club(name=match_info["team"])
                db.add(club)
                db.commit()
                print(f"✅ Club creado: {club.name}")

            team = db.query(Team).filter_by(name=match_info["team"], club_id=club.id).first()
            if not team:
                team = Team(name=match_info["team"], club_id=club.id, category="Senior", season=str(match_info["date"][:4]))
                db.add(team)
                db.commit()
                print(f"✅ Equipo creado: {team.name}")
        
        # PASO 1: Aplicar team_inference ANTES de normalizar nombres
        if team_inference and isinstance(team_inference, list):
            print(f"🧠 Aplicando inferencia de equipo a eventos sin equipo explícito...")
            # Crear mapa de event_type → assign_to desde las reglas
            inference_map = {rule['event_type']: rule['assign_to'] for rule in team_inference}
            
            # Detectar equipos antes de aplicar inferencia (necesitamos los nombres detectados)
            team_detection = detect_teams_in_events(events)
            detected_names = {t['detected_name'] for t in team_detection.get('detected_teams', [])}
            
            applied_count = 0
            for ev in events:
                # Solo aplicar si el evento NO tiene equipo explícito
                if not ev.get('team') and not ev.get('extra_data', {}).get('EQUIPO'):
                    event_type = ev.get('event_type', '').upper()
                    if event_type in inference_map:
                        assignment = inference_map[event_type]
                        # Asignar el nombre detectado correspondiente
                        if assignment == 'our_team':
                            # Buscar el nombre detectado que NO sea RIVAL/OPPONENT
                            for name in detected_names:
                                if name.upper() not in ['RIVAL', 'OPPONENT', 'OPONENTE']:
                                    ev['team'] = name
                                    if not ev.get('extra_data'):
                                        ev['extra_data'] = {}
                                    ev['extra_data']['_team_inferred'] = True
                                    applied_count += 1
                                    break
                        elif assignment == 'opponent':
                            # Asignar como RIVAL
                            ev['team'] = 'RIVAL'
                            if not ev.get('extra_data'):
                                ev['extra_data'] = {}
                            ev['extra_data']['_team_inferred'] = True
                            applied_count += 1
            
            if applied_count > 0:
                print(f"✅ Inferencia aplicada a {applied_count} eventos")
        
        # PASO 2: Normalizar nombres de equipo en eventos para que coincidan con el team de la BD
        # Los tags XML suelen tener nombres por defecto del software (ej: "PESCARA")
        # pero el usuario seleccionó un team específico (ej: "Grupo 57", "Pescara")
        opponent_keywords = ['RIVAL', 'OPPONENT', 'OPONENTE']
        normalized_count = 0
        print(f"🔄 Normalizando nombres de equipo en eventos...")
        for ev in events:
            # Si el evento tiene un valor de team que NO es RIVAL/OPPONENT, reemplazar con team.name
            if ev.get('team') and ev['team'] not in opponent_keywords:
                ev['team'] = team.name
                normalized_count += 1
            # Normalizar también en extra_data si existe
            if ev.get('extra_data'):
                if ev['extra_data'].get('team') and ev['extra_data']['team'] not in opponent_keywords:
                    ev['extra_data']['team'] = team.name
                if ev['extra_data'].get('EQUIPO') and ev['extra_data']['EQUIPO'] not in opponent_keywords:
                    ev['extra_data']['EQUIPO'] = team.name
                if ev['extra_data'].get('TEAM') and ev['extra_data']['TEAM'] not in opponent_keywords:
                    ev['extra_data']['TEAM'] = team.name
        print(f"✅ Normalizados {normalized_count} eventos con team='{team.name}'")

        # PASO 3: Crear o buscar el team rival si se especificó opponent_name
        opponent_team = None
        opponent_name = match_info.get("opponent_name")
        if opponent_name and opponent_name.strip():
            # Buscar si existe un team con ese nombre que sea opponent
            opponent_team = db.query(Team).filter(
                Team.name == opponent_name,
                Team.is_opponent == True
            ).first()
            
            if not opponent_team:
                # Si no existe, crearlo como opponent en el mismo club
                print(f"🆕 Creando equipo rival: {opponent_name}")
                opponent_team = Team(
                    name=opponent_name,
                    club_id=club.id if club else None,
                    category="Rival",
                    season=str(match_info["date"][:4]),
                    is_opponent=True
                )
                db.add(opponent_team)
                db.commit()
                print(f"✅ Equipo rival creado: {opponent_name}")
            
            # Normalizar eventos OPPONENT/RIVAL al nombre del equipo rival
            opponent_normalized = 0
            for ev in events:
                if ev.get('team') in opponent_keywords:
                    ev['team'] = opponent_team.name
                    opponent_normalized += 1
                # También en extra_data
                if ev.get('extra_data'):
                    if ev['extra_data'].get('team') in opponent_keywords:
                        ev['extra_data']['team'] = opponent_team.name
                    if ev['extra_data'].get('EQUIPO') in opponent_keywords:
                        ev['extra_data']['EQUIPO'] = opponent_team.name
                    if ev['extra_data'].get('TEAM') in opponent_keywords:
                        ev['extra_data']['TEAM'] = opponent_team.name
            
            if opponent_normalized > 0:
                print(f"✅ Normalizados {opponent_normalized} eventos con rival='{opponent_team.name}'")

        match_date = datetime.strptime(match_info["date"], "%Y-%m-%d").date()
        
        # Extraer tiempos manuales si vienen en match_info o en manual_period_times
        manual_times = match_info.get("manual_period_times", {})
        kick_off_1 = manual_times.get("kick_off_1") or match_info.get("kick_off_1_seconds")
        end_1 = manual_times.get("end_1") or match_info.get("end_1_seconds")
        kick_off_2 = manual_times.get("kick_off_2") or match_info.get("kick_off_2_seconds")
        end_2 = manual_times.get("end_2") or match_info.get("end_2_seconds")
        
        match = Match(
            team_id=team.id,
            opponent_name=match_info.get("opponent_name"),
            date=match_date,
            location=match_info.get("location", "Desconocido"),
            video_url=match_info.get("video_url", ""),
            competition=match_info.get("competition"),
            round=match_info.get("round"),
            field=match_info.get("field"),
            rain=match_info.get("rain"),
            muddy=match_info.get("muddy"),
            wind_1p=match_info.get("wind_1p"),
            wind_2p=match_info.get("wind_2p"),
            referee=match_info.get("referee"),
            result=match_info.get("result"),
            kick_off_1_seconds=kick_off_1,
            end_1_seconds=end_1,
            kick_off_2_seconds=kick_off_2,
            end_2_seconds=end_2
        )
        print(f"✅ Tiempos manuales configurados: kick_off_1={kick_off_1}, end_1={end_1}, kick_off_2={kick_off_2}, end_2={end_2}")
        db.add(match)
        db.commit()
        print(f"✅ Partido creado: vs {match.opponent_name} en {match.location}")

        # Insertar eventos y jugadores
        for ev in events:
            # Si hay jugadores, crear todos
            player_ids = []
            if ev.get("players"):
                for pname in ev["players"]:
                    player = create_or_get_player(db, pname)
                    player_ids.append(player.id)
            # Usar el primer jugador como principal
            main_player_id = player_ids[0] if player_ids else None

            event = Event(
                match_id=match.id,
                player_id=main_player_id,
                event_type=str(ev.get("event_type")),
                timestamp_sec=ev.get("timestamp_sec", 0),
                x=ev.get("x"),
                y=ev.get("y"),
                extra_data=clean_extra_data(ev.get("extra_data", {}))
            )
            db.add(event)

        db.commit()
        print(f"✅ Eventos insertados correctamente. Total: {len(events)}")

        # Si se configuraron tiempos manuales, recalcular Game_Time para todos los eventos
        if any([kick_off_1, end_1, kick_off_2, end_2]):
            print(f"🔄 Recalculando Game_Time con tiempos manuales del partido...")
            try:
                from enricher import calculate_game_time_from_zero
                
                # Obtener eventos recién insertados
                inserted_events = db.query(Event).filter(Event.match_id == match.id).order_by(Event.timestamp_sec).all()
                
                if inserted_events:
                    # Preparar datos para recalcular
                    events_data = [{
                        'timestamp_sec': e.timestamp_sec,
                        'event_type': e.event_type,
                        'extra_data': e.extra_data or {}
                    } for e in inserted_events]
                    
                    # Configurar tiempos manuales (usar valores exactos, incluso si son negativos)
                    match_times = {
                        'kick_off_1': kick_off_1 if kick_off_1 is not None else 0,
                        'end_1': end_1 if end_1 is not None else 2400,
                        'kick_off_2': kick_off_2 if kick_off_2 is not None else 2700,
                        'end_2': end_2 if end_2 is not None else 4800
                    }
                    
                    print(f"🔍 DEBUG Import: match_times = {match_times}")
                    print(f"🔍 DEBUG Import: Primer evento timestamp_sec = {events_data[0]['timestamp_sec'] if events_data else 'N/A'}")
                    
                    recalc_profile = {
                        'time_mapping': {
                            'method': 'manual',
                            'manual_times': match_times
                        }
                    }
                    
                    # Recalcular Game_Time
                    updated_events = calculate_game_time_from_zero(events_data, match_info={}, profile=recalc_profile)
                    
                    print(f"🔍 DEBUG Import: Primer evento Game_Time recalculado = {updated_events[0]['extra_data'].get('Game_Time') if updated_events else 'N/A'}")
                    
                    # Actualizar eventos en la base de datos
                    for i, event in enumerate(inserted_events):
                        if i < len(updated_events):
                            updated_data = updated_events[i]
                            if 'extra_data' in updated_data:
                                event.extra_data = updated_data['extra_data']
                                from sqlalchemy.orm.attributes import flag_modified
                                flag_modified(event, "extra_data")
                    
                    db.commit()
                    print(f"✅ Game_Time recalculado para {len(inserted_events)} eventos después del import")
            except Exception as recalc_err:
                print(f"⚠️ Error recalculando Game_Time después del import: {str(recalc_err)}")
                import traceback
                traceback.print_exc()
                # No fallar el import por esto, los eventos ya están guardados

        return {"events": events, "match_info": match_info}

    except Exception as e:
        db.rollback()
        print(f"❌ Error al importar desde JSON: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()
