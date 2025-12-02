#!/usr/bin/env python3
"""
Convertidor completo XML a JSON para main branch
Usa la lógica de importer.py y enricher.py pero genera JSONs en lugar de insertar en BD
"""
import xml.etree.ElementTree as ET
import json
import sys

def parse_xml_to_events(xml_path, match_info):
    """
    Extrae eventos del XML usando la misma lógica que importer.py
    Incluye: jugadores, descriptores, coordenadas X/Y
    """
    tree = ET.parse(xml_path)
    root = tree.getroot()
    
    events = []
    event_id = 1
    
    for inst in root.findall(".//instance"):
        # Categoría del evento (code)
        code_elem = inst.find("code")
        if code_elem is None:
            continue
        
        event_type = code_elem.text.strip() if code_elem.text else ""
        
        # Tiempos
        start_elem = inst.find("start")
        end_elem = inst.find("end")
        if start_elem is None or end_elem is None:
            continue
        
        try:
            start_sec = float(start_elem.text)
            end_sec = float(end_elem.text)
            duration = end_sec - start_sec
        except:
            continue
        
        # Calcular tiempo en formato HH:MM:SS
        hours = int(start_sec // 3600)
        minutes = int((start_sec % 3600) // 60)
        secs = int(start_sec % 60)
        time_str = f"{hours:02d}:{minutes:02d}:{secs:02d}"
        
        # Inicializar evento
        event = {
            "ID": event_id,
            "CATEGORY": event_type,
            "SECOND": start_sec,
            "MINUTE": start_sec / 60.0,
            "TIME": time_str,
            "DURATION": duration,
            "GAME": 1,
            "TEAM": match_info["team"],
            "OPPONENT": match_info["opponent"]
        }
        
        # Extraer descriptores, jugadores y coordenadas de los labels
        players = []
        x = None
        y = None
        extra_data = {}
        
        for label in inst.findall("label"):
            group_elem = label.find("group")
            text_elem = label.find("text")
            
            if group_elem is not None and text_elem is not None:
                group = group_elem.text.strip() if group_elem.text else ""
                text = text_elem.text.strip() if text_elem.text else ""
                
                # Jugadores
                if group.upper() == "JUGADOR" and text:
                    players.append(text)
                # Coordenadas X
                elif group.upper() == "X":
                    try:
                        x = float(text)
                    except:
                        pass
                # Coordenadas Y
                elif group.upper() == "Y":
                    try:
                        y = float(text)
                    except:
                        pass
                # Otros descriptores
                else:
                    extra_data[group] = text
        
        # Agregar jugadores al evento (primer jugador como PLAYER principal)
        if players:
            event["PLAYER"] = players[0] if len(players) == 1 else players
        
        # Agregar coordenadas si existen
        if x is not None:
            event["COORDINATE_X"] = x
        if y is not None:
            event["COORDINATE_Y"] = y
        
        # Mapear descriptores a campos específicos según la categoría
        # SCRUM
        if "SCRUM" in event_type.upper():
            if "RESULTADO" in extra_data or "RESULTADO-SCRUM" in extra_data:
                event["SCRUM_RESULT"] = extra_data.get("RESULTADO") or extra_data.get("RESULTADO-SCRUM")
        
        # LINEOUT
        elif "LINEOUT" in event_type.upper() or "LINE" in event_type.upper():
            if "RESULTADO-LINE" in extra_data:
                event["LINE_RESULT"] = extra_data.get("RESULTADO-LINE")
            if "POSICION-LINE" in extra_data:
                event["LINE_POSITION"] = extra_data.get("POSICION-LINE")
            if "CANTIDAD-LINE" in extra_data:
                event["LINE_QUANTITY"] = extra_data.get("CANTIDAD-LINE")
            if "TIRADOR-LINE" in extra_data:
                event["LINE_THROWER"] = extra_data.get("TIRADOR-LINE")
            if "RECEPTOR" in extra_data or "RECEPTOR-LINE" in extra_data:
                event["LINE_RECEIVER"] = extra_data.get("RECEPTOR") or extra_data.get("RECEPTOR-LINE")
            if "SALTADOR-RIVAL" in extra_data:
                event["OPPONENT_JUMPER"] = extra_data.get("SALTADOR-RIVAL")
            if "JUGADA" in extra_data:
                event["LINE_PLAY"] = extra_data.get("JUGADA")
        
        # TACKLE
        elif "TACKLE" in event_type.upper():
            if "ENCUADRE-TACKLE" in extra_data:
                event["TACKLE_FRAME"] = extra_data.get("ENCUADRE-TACKLE")
        
        # KICK
        elif "KICK" in event_type.upper() or "PIE" in event_type.upper():
            if "PIE" in extra_data or "TIPO-PIE" in extra_data:
                event["KICK_TYPE"] = extra_data.get("PIE") or extra_data.get("TIPO-PIE")
            if "RESULTADO-PALOS" in extra_data:
                event["GOAL_KICK"] = extra_data.get("RESULTADO-PALOS")
        
        # PENALTY / INFRACTION
        elif "PENALTY" in event_type.upper() or "INFRACTION" in event_type.upper():
            if "INFRACCION" in extra_data or "TIPO-INFRACCION" in extra_data:
                event["INFRACTION_TYPE"] = extra_data.get("INFRACCION") or extra_data.get("TIPO-INFRACCION")
            if "TARJETA-AMARILLA" in extra_data or "AMARILLA" in extra_data:
                event["YELLOW-CARD"] = extra_data.get("TARJETA-AMARILLA") or extra_data.get("AMARILLA")
            if "TARJETA-ROJA" in extra_data or "ROJA" in extra_data:
                event["RED-CARD"] = extra_data.get("TARJETA-ROJA") or extra_data.get("ROJA")
        
        # TURNOVER
        elif "TURNOVER" in event_type.upper():
            # Buscar tipo de turnover con diferentes variantes del nombre
            for key in ["TIPO-PERDIDA/RECUPERACIÓN", "TIPO-PERDIDA/RECUPERACION", "TIPO-PERDIDA/RECUPERACIN"]:
                if key in extra_data:
                    event["TURNOVER_TYPE"] = extra_data[key]
                    break
        
        # POINTS / TRY
        elif "POINTS" in event_type.upper() or "TRY" in event_type.upper():
            if "TIPO-PUNTOS" in extra_data:
                event["POINTS"] = extra_data.get("TIPO-PUNTOS")
            if "VALOR" in extra_data or "POINTS(VALUE)" in extra_data:
                event["POINTS(VALUE)"] = extra_data.get("VALOR") or extra_data.get("POINTS(VALUE)")
            if "ORIGEN-TRY" in extra_data:
                event["TRY_ORIGIN"] = extra_data.get("ORIGEN-TRY")
            
            # Calcular valor de puntos según tipo si no viene del XML
            if not event.get("POINTS(VALUE)"):
                points_type = event.get("POINTS", "")
                if points_type == "TRY":
                    event["POINTS(VALUE)"] = 5
                elif points_type == "CONVERSION":
                    event["POINTS(VALUE)"] = 2
                elif points_type == "PENALTY-KICK" or points_type == "DROP-GOAL":
                    event["POINTS(VALUE)"] = 3
        
        # BREAK
        elif "BREAK" in event_type.upper() or "QUIEBRE" in event_type.upper():
            if "TIPO-QUIEBRE" in extra_data:
                event["BREAK_TYPE"] = extra_data.get("TIPO-QUIEBRE")
            if "CANAL-QUIEBRE" in extra_data:
                event["BREAK_CHANNEL"] = extra_data.get("CANAL-QUIEBRE")
        
        # RUCK
        elif "RUCK" in event_type.upper():
            if "VELOCIDAD-RUCK" in extra_data:
                event["RUCK_SPEED"] = extra_data.get("VELOCIDAD-RUCK")
        
        # Campos generales
        if "AVANCE" in extra_data:
            event["ADVANCE"] = extra_data.get("AVANCE")
        if "SECTOR" in extra_data:
            event["SECTOR"] = extra_data.get("SECTOR")
        if "CUADRADO" in extra_data or "SQUARE" in extra_data:
            event["SQUARE"] = extra_data.get("CUADRADO") or extra_data.get("SQUARE")
        
        # Determinar período según tiempo del partido
        if start_sec < match_info.get("end_1", 2400):
            event["PERIODS"] = 1
        else:
            event["PERIODS"] = 2
        
        events.append(event)
        event_id += 1
    
    return events


def generate_match_data(match_info):
    """Genera el JSON de información del partido"""
    return [{
        "MATCH_ID": 1,
        "TEAM": match_info["team"],
        "OPPONENT": match_info["opponent"],
        "DATE": match_info["date"],
        "LOCATION": match_info.get("location", ""),
        "VIDEO_URL": match_info.get("video_url", ""),
        "KICK_OFF_1": match_info.get("kick_off_1", 0),
        "END_1": match_info.get("end_1", 2400),
        "KICK_OFF_2": match_info.get("kick_off_2", 2400),
        "END_2": match_info.get("end_2", 4800)
    }]


if __name__ == '__main__':
    # Información del partido Polisportiva
    match_info = {
        "team": "Pescara",
        "opponent": "Polisportiva L'Aquila",
        "date": "2024-11-02",
        "location": "L'Aquila",
        "video_url": "https://devua-public.s3.eu-central-1.amazonaws.com/pescararugby/Pescara+vs+Pol+L'Aquila.mov",
        "kick_off_1": 0,
        "end_1": 2281,
        "kick_off_2": 2288,
        "end_2": 4474
    }
    
    xml_path = '/app/uploads/Polisportiva.xml'
    
    print("🔄 Convirtiendo XML a JSON con todos los datos...")
    events = parse_xml_to_events(xml_path, match_info)
    
    # Generar datos del partido
    match_data = generate_match_data(match_info)
    
    # Guardar JSONs
    with open('/app/uploads/matrizPescara.json', 'w', encoding='utf-8') as f:
        json.dump(events, f, indent=2, ensure_ascii=False)
    
    with open('/app/uploads/matchesPescara.json', 'w', encoding='utf-8') as f:
        json.dump(match_data, f, indent=2, ensure_ascii=False)
    
    # Estadísticas
    events_with_players = [e for e in events if 'PLAYER' in e]
    print(f"✅ Convertidos {len(events)} eventos")
    print(f"👥 Eventos con jugadores: {len(events_with_players)}")
    print(f"📁 Archivos generados:")
    print(f"   - /app/uploads/matrizPescara.json")
    print(f"   - /app/uploads/matchesPescara.json")
