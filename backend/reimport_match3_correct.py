#!/usr/bin/env python3
"""
Script para reimportar Match 3 usando importer.py + enricher.py
Preserva todos los descriptores Y calcula Game_Time correctamente
"""
from db import SessionLocal
from models import Match, Event, Team
from importer import import_match_from_xml
import os

def main():
    db = SessionLocal()
    
    try:
        # 1. Encontrar Match 3
        match = db.query(Match).filter(Match.id == 3).first()
        if not match:
            print("❌ Match 3 no encontrado")
            return
        
        team = db.query(Team).filter(Team.id == match.team_id).first()
        team_name = team.name if team else "Unknown"
        
        print(f"📋 Match encontrado: {team_name} vs {match.opponent_name}")
        print(f"   Fecha: {match.date}")
        
        # 2. Contar eventos actuales
        current_events = db.query(Event).filter(Event.match_id == 3).count()
        print(f"📊 Eventos actuales: {current_events}")
        
        # 3. Verificar XML
        xml_path = "/app/uploads/Polisportiva.xml"
        if not os.path.exists(xml_path):
            print(f"❌ XML no encontrado: {xml_path}")
            return
        
        # 4. Borrar eventos antiguos
        print("🗑️  Borrando eventos antiguos...")
        db.query(Event).filter(Event.match_id == 3).delete()
        db.commit()
        print("✅ Eventos borrados")
        
        # 5. Reimportar usando importer.py (incluye enricher automáticamente)
        print("📥 Reimportando desde XML con enricher...")
        
        # Profile contiene info para importer + enricher
        profile = {
            "team": team_name,
            "opponent": match.opponent_name,
            "date": str(match.date),
            "location": match.location or "Desconocido",
            "video_url": match.video_url or "",
            "match_id": match.id
        }
        
        # Esta función ya incluye:
        # - Extracción de ALL descriptors a extra_data
        # - Enrich con Game_Time, DETECTED_PERIOD, Time_Group
        # - PLAYERS array en extra_data
        # Pero también crea Match/Team/Club nuevos, así que vamos a usarla solo para parsear
        
        # Mejor: parsear y enriquecer manualmente
        import xml.etree.ElementTree as ET
        from enricher import enrich_events
        
        tree = ET.parse(xml_path)
        root = tree.getroot()
        
        events_data = []
        for inst in root.findall(".//instance"):
            event_type = inst.findtext("code", "UNKNOWN").strip()
            start = inst.findtext("start", "0")
            # El XML ya tiene timestamps en segundos, NO dividir por 1000
            timestamp_sec = float(start) if start else 0
            
            extra_data = {}
            players = []
            
            for label in inst.findall("label"):
                group = label.findtext("group")
                text = label.findtext("text")
                if group and text:
                    group_key = group.strip()
                    text_value = text.strip()
                    if group_key.upper() == "JUGADOR":
                        players.append(text_value)
                        if not extra_data.get("PLAYER"):
                            extra_data["PLAYER"] = text_value
                    else:
                        extra_data[group_key] = text_value
            
            if players:
                extra_data["PLAYERS"] = players
            
            events_data.append({
                "event_type": event_type,
                "timestamp_sec": timestamp_sec,
                "extra_data": extra_data,
                "x": None,
                "y": None
            })
        
        # ENRIQUECER con Game_Time, DETECTED_PERIOD, Time_Group
        match_info = {
            "our_team": team_name,
            "opponent": match.opponent_name
        }
        events_data = enrich_events(events_data, match_info, profile)
        
        print(f"📦 Eventos procesados: {len(events_data)}")
        
        # 6. Guardar en BD
        events_created = 0
        for event_data in events_data:
            event = Event(
                match_id=match.id,
                event_type=event_data["event_type"],
                timestamp_sec=event_data["timestamp_sec"],
                x=event_data.get("x"),
                y=event_data.get("y"),
                extra_data=event_data["extra_data"]
            )
            db.add(event)
            events_created += 1
        
        db.commit()
        print(f"✅ {events_created} eventos guardados en BD")
        
        # 7. Verificar
        new_count = db.query(Event).filter(Event.match_id == 3).count()
        print(f"\n✅ Reimportación completa!")
        print(f"📊 Total eventos: {new_count}")
        
        # Verificar primer evento
        first_event = db.query(Event).filter(Event.match_id == 3).order_by(Event.id).first()
        if first_event:
            print(f"\n🔍 Verificación primer evento:")
            print(f"   Tipo: {first_event.event_type}")
            print(f"   timestamp_sec: {first_event.timestamp_sec}")
            print(f"   Game_Time: {first_event.extra_data.get('Game_Time', '❌ NO ENCONTRADO')}")
            print(f"   DETECTED_PERIOD: {first_event.extra_data.get('DETECTED_PERIOD', '❌ NO ENCONTRADO')}")
            print(f"   PLAYERS: {first_event.extra_data.get('PLAYERS', '❌ NO ENCONTRADO')}")
        
        # Verificar MISSED-TACKLE con players
        missed = db.query(Event).filter(
            Event.match_id == 3,
            Event.event_type == 'MISSED-TACKLE'
        ).first()
        
        if missed:
            print(f"\n🔍 Verificación MISSED-TACKLE:")
            print(f"   timestamp_sec: {missed.timestamp_sec}")
            print(f"   Game_Time: {missed.extra_data.get('Game_Time', '❌')}")
            print(f"   PLAYERS: {missed.extra_data.get('PLAYERS', '❌')}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
