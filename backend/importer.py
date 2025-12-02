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

def import_match_from_xml(xml_path: str, profile: dict, discard_categories=None):
    """
    Importa un partido y sus eventos desde un archivo XML con la estructura de LongoMatch/Sportscode/Nacsport.
    Usa el normalizer para limpiar caracteres especiales y procesar el XML correctamente.
    
    Args:
        xml_path: Ruta al archivo XML
        profile: Diccionario con configuración del partido
        discard_categories: Lista de categorías a descartar (ej: ['END', 'WARMUP', 'TIMEOUT'])
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
        
        # Crear o buscar club/equipo/partido
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
    """
    print(f"🔍 Iniciando importación desde JSON")
    db = SessionLocal()
    try:
        match_info = json_data.get("match", {})
        events = json_data.get("events", [])
        
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

        # Crear o buscar club/equipo/partido
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

        match_date = datetime.strptime(match_info["date"], "%Y-%m-%d").date()
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
            result=match_info.get("result")
        )
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

        return {"events": events, "match_info": match_info}

    except Exception as e:
        db.rollback()
        print(f"❌ Error al importar desde JSON: {e}")
        return False
    finally:
        db.close()
