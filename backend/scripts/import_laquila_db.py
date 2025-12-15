#!/usr/bin/env python3
"""
Importa el partido Pescara vs L'Aquila desde backend/uploads/L_aquila.xml
"""
import sys
import os

# Agregar directorio backend al path
backend_path = os.path.join(os.path.dirname(__file__), '..')
sys.path.insert(0, backend_path)

from importer import import_match_from_xml
from db import SessionLocal
from models import Match, Event


def import_laquila():
  print("=" * 80)
  print("🏉 IMPORTACIÓN DE PARTIDO: Pescara vs L'Aquila")
  print("=" * 80)

  profile = {
    "team": "Pescara",
    "opponent": "L'Aquila",
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
      "end_2": 4474,
    },
  }

  xml_path = "/app/uploads/L_aquila.xml"

  if not os.path.exists(xml_path):
    print(f"❌ Error: No se encuentra el archivo {xml_path}")
    print("   Coloca el XML en backend/uploads/ o ajusta xml_path")
    return False

  print(f"\n📁 Archivo XML encontrado: {xml_path}")
  print(f"📊 Equipo: {profile['team']}")
  print(f"⚔️  Rival: {profile['opponent']}")
  print(f"📅 Fecha: {profile['date']}")
  print(f"📍 Ubicación: {profile['location']}")
  print(f"🎬 Video: {profile['video_url']}")
  print("\n" + "=" * 80)

  result = import_match_from_xml(xml_path, profile)

  if not result:
    print("\n" + "=" * 80)
    print("❌ IMPORTACIÓN FALLIDA")
    print("=" * 80)
    return False

  # Verificar en BD
  db = SessionLocal()
  try:
    matches = db.query(Match).filter_by(opponent_name=profile['opponent']).all()
    if matches:
      latest = matches[-1]
      events_count = db.query(Event).filter_by(match_id=latest.id).count()
      print(f"\n📊 Estadísticas del partido importado:")
      print(f"   - ID del partido: {latest.id}")
      print(f"   - Fecha: {latest.date}")
      print(f"   - Ubicación: {latest.location}")
      print(f"   - Eventos importados: {events_count}")
  except Exception as e:
    print(f"⚠️  Error al verificar datos: {e}")
  finally:
    db.close()

  print("\n" + "=" * 80)
  print("🎉 ¡Listo para visualizar en el dashboard!")
  print("=" * 80)
  return True


if __name__ == "__main__":
  success = import_laquila()
  sys.exit(0 if success else 1)
