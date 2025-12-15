#!/usr/bin/env python3
"""
Script simplificado para importar partidos desde XML a PostgreSQL
Usa el sistema completo: importer + enricher + translator
"""
import sys
import os

# Agregar directorio backend al path
backend_path = os.path.join(os.path.dirname(__file__), '..')
sys.path.insert(0, backend_path)

from importer import import_match_from_xml
from db import SessionLocal
from models import Match, Event

def import_polisportiva():
    """
    Importa el partido Pescara vs Polisportiva L'Aquila
    """
    print("=" * 80)
    print("🏉 IMPORTACIÓN DE PARTIDO: Pescara vs Polisportiva L'Aquila")
    print("=" * 80)
    
    # Configuración del partido
    profile = {
        "team": "Pescara",
        "opponent": "Polisportiva L'Aquila",
        "date": "2024-11-02",
        "location": "L'Aquila",
        "video_url": "https://www.youtube.com/watch?v=xxGXH-Zc1i8",
        "competition": "Serie B",
        "round": "Jornada 5",
        "field": "L'Aquila",
        "manual_period_times": {
            "kick_off_1": 0,
            "end_1": 2281,
            "kick_off_2": 2288,
            "end_2": 4474
        }
    }
    
    # Usar el XML proporcionado en uploads (renombrado a L_aquila.xml)
    xml_path = "/app/uploads/L_aquila.xml"
    
    # Verificar que existe el archivo
    if not os.path.exists(xml_path):
        print(f"❌ Error: No se encuentra el archivo {xml_path}")
        print(f"   Asegúrate de que el archivo XML esté en backend/uploads/")
        return False
    
    print(f"\n📁 Archivo XML encontrado: {xml_path}")
    print(f"📊 Equipo: {profile['team']}")
    print(f"⚔️  Rival: {profile['opponent']}")
    print(f"📅 Fecha: {profile['date']}")
    print(f"📍 Ubicación: {profile['location']}")
    print(f"🎬 Video: {profile['video_url']}")
    print("\n" + "=" * 80)
    
    # Importar usando el sistema completo
    result = import_match_from_xml(xml_path, profile)
    
    if result:
        print("\n" + "=" * 80)
        print("✅ IMPORTACIÓN EXITOSA")
        print("=" * 80)
        
        # Verificar datos en la base de datos
        db = SessionLocal()
        try:
            matches = db.query(Match).filter_by(opponent_name=profile['opponent']).all()
            if matches:
                latest_match = matches[-1]
                events_count = db.query(Event).filter_by(match_id=latest_match.id).count()
                
                print(f"\n📊 Estadísticas del partido importado:")
                print(f"   - ID del partido: {latest_match.id}")
                print(f"   - Fecha: {latest_match.date}")
                print(f"   - Ubicación: {latest_match.location}")
                print(f"   - Eventos importados: {events_count}")
                print(f"   - Video URL: {latest_match.video_url[:80]}...")
                
                # Contar eventos por categoría
                from sqlalchemy import func
                categories = db.query(
                    Event.event_type, 
                    func.count(Event.id)
                ).filter_by(match_id=latest_match.id).group_by(Event.event_type).all()
                
                print(f"\n📈 Eventos por categoría:")
                for category, count in sorted(categories, key=lambda x: x[1], reverse=True)[:10]:
                    print(f"   - {category}: {count}")
                
        except Exception as e:
            print(f"⚠️  Error al verificar datos: {e}")
        finally:
            db.close()
        
        print("\n" + "=" * 80)
        print("🎉 ¡Listo para visualizar en el dashboard!")
        print("=" * 80)
        return True
    else:
        print("\n" + "=" * 80)
        print("❌ IMPORTACIÓN FALLIDA")
        print("=" * 80)
        return False


if __name__ == "__main__":
    success = import_polisportiva()
    sys.exit(0 if success else 1)
