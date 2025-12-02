#!/usr/bin/env python3
"""
Script para importar el partido Pescara vs Polisportiva L'Aquila
Uso: python backend/scripts/import_polisportiva.py
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import xml.etree.ElementTree as ET
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, Club, Team, Match, Event, Player, TeamPlayer

# Configuración de BD
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./rugby_data.db')
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine)

# Crear tablas si no existen
Base.metadata.create_all(bind=engine)

def parse_longomatch_xml(xml_path):
    """Parsea XML de LongoMatch con estructura específica"""
    tree = ET.parse(xml_path)
    root = tree.getroot()
    
    events = []
    
    for instance in root.findall('.//instance'):
        event = {
            'start': float(instance.find('start').text),
            'end': float(instance.find('end').text),
            'event_type': instance.find('code').text,
            'extra_data': {}
        }
        
        # Parsear players (si existe el tag <players>)
        players_elem = instance.find('players')
        if players_elem is not None:
            players_list = []
            for player in players_elem.findall('Player'):
                player_name = player.find('name')
                if player_name is not None:
                    players_list.append(player_name.text)
            if players_list:
                event['players'] = players_list
        
        # Parsear labels
        for label in instance.findall('.//label'):
            group = label.find('group')
            text = label.find('text')
            
            if group is not None and text is not None:
                key = group.text.strip()
                value = text.text.strip() if text.text else ""
                
                # Mapeo de campos conocidos de LongoMatch
                if key == 'EQUIPO':
                    event['team'] = value
                elif key == 'JUGADOR':
                    event['player'] = value
                elif key == 'INFRACCION':
                    event['extra_data']['INFRACTION'] = value
                elif key == 'TIPO DE PENAL':
                    event['extra_data']['PENALTY_TYPE'] = value
                elif key == 'TARJETA':
                    event['extra_data']['CARD'] = value
                elif key == 'POSICION-LINE':
                    event['extra_data']['LINE_POSITION'] = value
                elif key == 'CANTIDAD-LINE':
                    event['extra_data']['LINEOUT_QUANTITY'] = value
                elif key == 'RESULTADO-LINE':
                    event['extra_data']['LINEOUT_RESULT'] = value
                elif key == 'TIRADOR-LINE':
                    event['extra_data']['LINE_THROWER'] = value
                elif key == 'ZONA':
                    event['zone'] = value
                elif key == 'AVANCE':
                    event['extra_data']['ADVANCE'] = value
                elif key == 'VELOCIDAD-RUCK':
                    event['extra_data']['RUCK_SPEED'] = value
                elif key == 'X':
                    try:
                        event['coordinate_x'] = float(value) if value else None
                    except ValueError:
                        pass
                elif key == 'Y':
                    try:
                        event['coordinate_y'] = float(value) if value else None
                    except ValueError:
                        pass
                elif key == 'MISC' or key == 'TEXT':
                    event['extra_data']['MISC'] = value
                else:
                    # Otros campos van a extra_data
                    event['extra_data'][key] = value
        
        events.append(event)
    
    return events

def import_polisportiva_match(xml_path, video_url):
    """Importa el partido Pescara vs Polisportiva L'Aquila"""
    
    db = SessionLocal()
    
    try:
        print(f"\n{'='*60}")
        print(f"🚀 IMPORTACIÓN - PESCARA VS POLISPORTIVA L'AQUILA")
        print(f"{'='*60}\n")
        
        # 1. Buscar o crear club
        club = db.query(Club).filter_by(name="Pescara Rugby").first()
        if not club:
            club = Club(name="Pescara Rugby", country="Italia", logo_url=None)
            db.add(club)
            db.commit()
            print(f"✅ Club creado: {club.name}")
        else:
            print(f"📌 Club encontrado: {club.name}")
        
        # 2. Buscar o crear equipo
        team = db.query(Team).filter_by(name="Pescara", club_id=club.id).first()
        if not team:
            team = Team(
                name="Pescara",
                category="Senior",
                club_id=club.id
            )
            db.add(team)
            db.commit()
            print(f"✅ Equipo creado: {team.name}")
        else:
            print(f"📌 Equipo encontrado: {team.name}")
        
        # 3. Crear partido con datos correctos
        match = Match(
            team_id=team.id,
            opponent_name="Polisportiva L'Aquila",
            match_date=datetime(2024, 11, 2).date(),
            competition="Liga",
            location="L'Aquila",
            result="Por definir",
            video_url=video_url,
            # Tiempos del partido (en segundos)
            kick_off_1=0,
            end_1=2281,
            kick_off_2=2288,
            end_2=4474
        )
        db.add(match)
        db.commit()
        
        print(f"\n🏉 PARTIDO CREADO:")
        print(f"   ID: {match.id}")
        print(f"   {match.team.name} vs {match.opponent_name}")
        print(f"   Fecha: {match.match_date}")
        print(f"   Ubicación: {match.location}")
        print(f"   Video: {video_url}")
        print(f"   Tiempos: 1T(0-2281s) | 2T(2288-4474s)")
        
        # 4. Parsear XML
        print(f"\n📂 Parseando XML: {xml_path}")
        events = parse_longomatch_xml(xml_path)
        print(f"   ✅ {len(events)} eventos detectados")
        
        # 5. Importar eventos
        print(f"\n📊 Importando eventos a la base de datos...")
        
        event_counts = {}
        try_count = 0
        penalty_count = 0
        
        for event_data in events:
            event = Event(
                match_id=match.id,
                event_type=event_data['event_type'],
                start_time=event_data['start'],
                end_time=event_data['end'],
                team=event_data.get('team'),
                player_name=event_data.get('player'),
                zone=event_data.get('zone'),
                coordinate_x=event_data.get('coordinate_x'),
                coordinate_y=event_data.get('coordinate_y'),
                extra_data=event_data.get('extra_data', {})
            )
            
            db.add(event)
            
            # Contadores
            event_type = event_data['event_type']
            event_counts[event_type] = event_counts.get(event_type, 0) + 1
            
            if event_type == 'TRY':
                try_count += 1
            elif event_type == 'PENALTY':
                penalty_count += 1
        
        db.commit()
        
        # 6. Resumen
        print(f"\n{'='*60}")
        print(f"✅ IMPORTACIÓN COMPLETADA CON ÉXITO")
        print(f"{'='*60}")
        print(f"\n📈 RESUMEN DE EVENTOS:")
        for event_type, count in sorted(event_counts.items(), key=lambda x: x[1], reverse=True):
            print(f"   {event_type:<20} : {count:>3} eventos")
        
        print(f"\n🎯 ESTADÍSTICAS CLAVE:")
        print(f"   🏉 Tries         : {try_count}")
        print(f"   🚫 Penalties     : {penalty_count}")
        print(f"   📊 Total eventos : {len(events)}")
        print(f"   🆔 Match ID      : {match.id}")
        
        print(f"\n🌐 LISTO PARA LA PRESENTACIÓN:")
        print(f"   Frontend: http://localhost:3000")
        print(f"   Match:    http://localhost:3000/match/{match.id}")
        print(f"\n{'='*60}\n")
        
        return match.id
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ ERROR DURANTE LA IMPORTACIÓN:")
        print(f"   {str(e)}")
        import traceback
        traceback.print_exc()
        return None
        
    finally:
        db.close()

if __name__ == "__main__":
    # Configuración
    XML_FILE = "backend/uploads/Polisportiva.xml"
    VIDEO_URL = "https://devua-public.s3.eu-central-1.amazonaws.com/pescararugby/Pescara+vs+Pol+L'Aquila.mov"
    
    # Verificar que el XML existe
    if not os.path.exists(XML_FILE):
        print(f"❌ ERROR: Archivo no encontrado: {XML_FILE}")
        sys.exit(1)
    
    # Ejecutar importación
    match_id = import_polisportiva_match(XML_FILE, VIDEO_URL)
    
    if match_id:
        print(f"✅ Éxito! Partido importado con ID: {match_id}")
        sys.exit(0)
    else:
        print(f"❌ La importación falló")
        sys.exit(1)
