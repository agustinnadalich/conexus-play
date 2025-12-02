#!/usr/bin/env python3
"""
Script para reimportar Match 3 (Polisportiva) con todos los descriptores
"""
from db import SessionLocal
from models import Match, Event, Team, Club
from importer import import_match_from_xml
import os

def reimport_match3():
    db = SessionLocal()
    try:
        # 1. Buscar Match 3
        match = db.query(Match).filter(Match.id == 3).first()
        if not match:
            print("❌ Match 3 no encontrado")
            return
        
        # Obtener nombre del equipo
        team = db.query(Team).filter(Team.id == match.team_id).first()
        team_name = team.name if team else "Unknown"
        
        print(f"📋 Match encontrado: {team_name} vs {match.opponent_name}")
        print(f"   Fecha: {match.date}")
        print(f"   Ubicación: {match.location}")
        
        # 2. Contar eventos actuales
        current_events = db.query(Event).filter(Event.match_id == 3).count()
        print(f"📊 Eventos actuales: {current_events}")
        
        # 3. Verificar que el XML existe
        xml_path = "/app/uploads/Polisportiva.xml"
        if not os.path.exists(xml_path):
            print(f"❌ XML no encontrado: {xml_path}")
            return
        
        # 4. Borrar eventos antiguos
        print("🗑️  Borrando eventos antiguos...")
        db.query(Event).filter(Event.match_id == 3).delete()
        db.commit()
        print("✅ Eventos borrados")
        
        # 5. Reimportar desde XML parseando directamente
        print("📥 Reimportando desde XML...")
        
        import xml.etree.ElementTree as ET
        
        tree = ET.parse(xml_path)
        root = tree.getroot()
        
        events_created = 0
        
        for inst in root.findall(".//instance"):
            event_type_el = inst.find("code")
            if event_type_el is None or not event_type_el.text:
                continue
            
            event_type = event_type_el.text.strip()
            
            # Timestamp
            start_el = inst.find("start")
            timestamp_sec = float(start_el.text) / 1000.0 if start_el is not None and start_el.text else 0
            
            # Extraer TODOS los descriptores a extra_data
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
                        # También guardar como PLAYER (singular) para compatibilidad
                        if not extra_data.get("PLAYER"):
                            extra_data["PLAYER"] = text_value
                    else:
                        extra_data[group_key] = text_value
            
            # Guardar PLAYERS (plural) en extra_data
            if players:
                extra_data["PLAYERS"] = players
            
            # Crear evento en BD
            event = Event(
                match_id=match.id,
                event_type=event_type,
                timestamp_sec=timestamp_sec,
                extra_data=extra_data
            )
            db.add(event)
            events_created += 1
        
        db.commit()
        success = True
        print(f"✅ {events_created} eventos guardados")
        
        if success:
            # 6. Verificar nuevos eventos
            new_events = db.query(Event).filter(Event.match_id == 3).count()
            print(f"\n✅ Reimportación completa!")
            print(f"📊 Eventos nuevos: {new_events}")
            
            # 7. Verificar que MISSED-TACKLE tiene PLAYERS
            missed_tackle = db.query(Event).filter(
                Event.match_id == 3,
                Event.event_type == 'MISSED-TACKLE'
            ).first()
            
            if missed_tackle and missed_tackle.extra_data:
                has_players = 'PLAYERS' in missed_tackle.extra_data or 'PLAYER' in missed_tackle.extra_data
                print(f"\n🔍 Verificación MISSED-TACKLE:")
                print(f"   Tiene PLAYERS en extra_data: {'✅' if has_players else '❌'}")
                if has_players:
                    players = missed_tackle.extra_data.get('PLAYERS') or missed_tackle.extra_data.get('PLAYER')
                    print(f"   Ejemplo de jugadores: {players}")
        else:
            print("❌ Error en la importación")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reimport_match3()
