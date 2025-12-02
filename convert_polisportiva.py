#!/usr/bin/env python3
"""
Script para convertir Polisportiva.xml a JSON para uso en main branch (sin BD)
Genera matrizPescara.json y matchesPescara.json
"""

import sys
import os
import json

# Los módulos están directamente en /app/
from normalizer import normalize_xml_to_json
from enricher import enrich_events

# Configuración
XML_FILE = "uploads/Polisportiva.xml"
OUTPUT_DIR = "uploads/"
MATRIZ_OUTPUT = os.path.join(OUTPUT_DIR, "matrizPescara.json")
MATCH_OUTPUT = os.path.join(OUTPUT_DIR, "matchesPescara.json")

# Información del partido
MATCH_INFO = {
    "ID": 1,
    "OPPONENT": "Polisportiva L'Aquila",
    "DATE": "2024-11-02",
    "LOCATION": "L'Aquila",
    "COMPETITION": "Liga",
    "RESULT": "Por definir",
    "VIDEO_URL": "https://devua-public.s3.eu-central-1.amazonaws.com/pescararugby/Pescara+vs+Pol+L'Aquila.mov",
    "HOME_TEAM": "Pescara",
    "AWAY_TEAM": "Polisportiva L'Aquila"
}

# Perfil de importación (estructura esperada por normalizer)
PROFILE = {
    "name": "Pescara",
    "time_column": "SECOND",
    "category_column": "CATEGORY",
    "team_column": "TEAM",
    "player_column": "PLAYER",
    # Tiempos del partido (en segundos)
    "kick_off_1": 0,
    "end_1": 2281,
    "kick_off_2": 2288,
    "end_2": 4474
}

def main():
    print(f"\n{'='*60}")
    print(f"🚀 CONVERSIÓN - POLISPORTIVA XML → JSON")
    print(f"{'='*60}\n")
    
    # Verificar que el XML existe
    if not os.path.exists(XML_FILE):
        print(f"❌ ERROR: Archivo no encontrado: {XML_FILE}")
        sys.exit(1)
    
    print(f"📂 Archivo XML: {XML_FILE}")
    print(f"📂 Output: {MATRIZ_OUTPUT} y {MATCH_OUTPUT}")
    
    try:
        # 1. Normalizar XML a JSON
        print(f"\n📊 Paso 1: Normalizando XML...")
        normalized_data = normalize_xml_to_json(
            filepath=XML_FILE,
            profile=PROFILE,
            discard_categories=None
        )
        
        if not normalized_data:
            print(f"❌ ERROR: La normalización falló")
            sys.exit(1)
        
        events = normalized_data.get('events', [])
        print(f"   ✅ {len(events)} eventos normalizados")
        
        # 2. Enriquecer eventos (agregar Game_Time, Time_Group, etc.)
        print(f"\n📊 Paso 2: Enriqueciendo eventos...")
        enriched_events = enrich_events(
            events=events,
            time_offsets={
                1: {"start_time": PROFILE['kick_off_1'], "end_time": PROFILE['end_1']},
                2: {"start_time": PROFILE['kick_off_2'], "end_time": PROFILE['end_2']}
            }
        )
        print(f"   ✅ Eventos enriquecidos con Game_Time y Time_Group")
        
        # 3. Guardar matriz de eventos (eventos enriquecidos)
        print(f"\n💾 Paso 3: Guardando matriz de eventos...")
        with open(MATRIZ_OUTPUT, 'w', encoding='utf-8') as f:
            json.dump(enriched_events, f, indent=2, ensure_ascii=False)
        print(f"   ✅ Guardado: {MATRIZ_OUTPUT}")
        
        # 4. Guardar información del partido
        print(f"\n💾 Paso 4: Guardando información del partido...")
        with open(MATCH_OUTPUT, 'w', encoding='utf-8') as f:
            json.dump([MATCH_INFO], f, indent=2, ensure_ascii=False)
        print(f"   ✅ Guardado: {MATCH_OUTPUT}")
        
        # 5. Resumen
        print(f"\n{'='*60}")
        print(f"✅ CONVERSIÓN COMPLETADA CON ÉXITO")
        print(f"{'='*60}")
        
        # Contar tipos de eventos
        event_counts = {}
        for event in enriched_events:
            event_type = event.get('CATEGORY', 'Unknown')
            event_counts[event_type] = event_counts.get(event_type, 0) + 1
        
        print(f"\n📈 RESUMEN DE EVENTOS:")
        for event_type, count in sorted(event_counts.items(), key=lambda x: x[1], reverse=True):
            print(f"   {event_type:<25} : {count:>3} eventos")
        
        print(f"\n🎯 ARCHIVOS GENERADOS:")
        print(f"   📄 {MATRIZ_OUTPUT}")
        print(f"   📄 {MATCH_OUTPUT}")
        
        print(f"\n🌐 LISTO PARA LA PRESENTACIÓN:")
        print(f"   Backend:  http://localhost:5001")
        print(f"   Frontend: http://localhost:3000")
        print(f"   API:      http://localhost:5001/events")
        print(f"\n{'='*60}\n")
        
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR DURANTE LA CONVERSIÓN:")
        print(f"   {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
