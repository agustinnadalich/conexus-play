#!/usr/bin/env python3
"""
Script COMPLETO para convertir XML de NacSports/LongoMatch al formato JSON esperado
Extrae TODOS los campos: jugadores, tipos de eventos, resultados, posiciones, etc.
"""
import xml.etree.ElementTree as ET
import json

def extract_labels(instance):
    """Extrae todos los labels del evento y los organiza por grupo"""
    labels_data = {}
    
    for label in instance.findall('.//label'):
        group_elem = label.find('group')
        text_elem = label.find('text')
        
        if text_elem is not None and text_elem.text:
            # El group puede ser un tag con texto O un tag con atributo name
            if group_elem is not None:
                group_name = group_elem.text if group_elem.text else group_elem.get('name', 'UNKNOWN')
            else:
                group_name = 'UNKNOWN'
            label_text = text_elem.text
            
            # Mapear grupos a campos específicos
            if group_name == 'JUGADOR' or group_name == 'PLAYER':
                labels_data['PLAYER'] = label_text
            elif group_name == 'AVANCE' or group_name == 'ADVANCE':
                labels_data['ADVANCE'] = label_text
            elif group_name == 'SCRUM':
                labels_data['SCRUM_RESULT'] = label_text
            elif group_name == 'LINEOUT' or 'LINE' in group_name:
                if 'RESULT' in group_name or group_name == 'LINEOUT':
                    labels_data['LINE_RESULT'] = label_text
                elif 'LANZADOR' in group_name or 'THROWER' in group_name:
                    labels_data['LINE_THROWER'] = label_text
                elif 'RECEPTOR' in group_name or 'RECEIVER' in group_name:
                    labels_data['LINE_RECEIVER'] = label_text
                elif 'POSICION' in group_name or 'POSITION' in group_name:
                    labels_data['LINE_POSITION'] = label_text
                elif 'CANTIDAD' in group_name or 'QUANTITY' in group_name:
                    labels_data['LINE_QUANTITY'] = label_text
            elif 'TIPO' in group_name or 'TYPE' in group_name:
                # Determinar qué tipo según el contexto
                if 'KICK' in group_name:
                    labels_data['KICK_TYPE'] = label_text
                elif 'INFRACCION' in group_name or 'INFRACTION' in group_name:
                    labels_data['INFRACTION_TYPE'] = label_text
                elif 'PERDIDA' in group_name or 'TURNOVER' in group_name:
                    labels_data['TURNOVER_TYPE'] = label_text
                elif 'BREAK' in group_name:
                    labels_data['BREAK_TYPE'] = label_text
                else:
                    # Guardar genéricamente
                    if 'TYPE' not in labels_data:
                        labels_data['TYPE'] = label_text
            elif 'SECTOR' in group_name:
                labels_data['SECTOR'] = label_text
            elif 'CUADRANTE' in group_name or 'SQUARE' in group_name:
                labels_data['SQUARE'] = label_text
            elif 'CANAL' in group_name or 'CHANNEL' in group_name:
                labels_data['BREAK_CHANNEL'] = label_text
            elif 'EQUIPO' in group_name or 'TEAM' in group_name:
                labels_data['TEAM_TYPE'] = label_text
            elif 'PUNTOS' in group_name or 'POINTS' in group_name:
                if 'VALOR' in group_name or 'VALUE' in group_name:
                    labels_data['POINTS(VALUE)'] = label_text
                elif 'ORIGEN' in group_name or 'ORIGIN' in group_name:
                    labels_data['TRY_ORIGIN'] = label_text
                else:
                    labels_data['POINTS'] = label_text
            elif 'RUCK' in group_name:
                if 'VELOCIDAD' in group_name or 'SPEED' in group_name:
                    labels_data['RUCK_SPEED'] = label_text
    
    return labels_data

def parse_xml_to_json(xml_path, match_info):
    """Convierte XML completo a JSON con TODOS los campos"""
    tree = ET.parse(xml_path)
    root = tree.getroot()
    
    events = []
    event_id = 1
    
    for instance in root.findall('.//instance'):
        # Código/Categoría del evento
        code = instance.find('code')
        if code is None or not code.text:
            continue
        
        category = code.text
        
        # Tiempos
        start = instance.find('start')
        end = instance.find('end')
        
        if start is None:
            continue
        
        start_sec = float(start.text)
        end_sec = float(end.text) if end is not None else start_sec
        duration = end_sec - start_sec
        
        minute = start_sec / 60.0
        hours = int(start_sec // 3600)
        minutes = int((start_sec % 3600) // 60)
        secs = int(start_sec % 60)
        time_str = f"{hours:02d}:{minutes:02d}:{secs:02d}"
        
        # Determinar periodo basado en tiempos del partido
        if start_sec < match_info['end_1']:
            period = 1
        elif start_sec >= match_info['kick_off_2']:
            period = 2
        else:
            period = 1  # Medio tiempo
        
        # Posiciones X/Y
        pos_x = instance.find('pos_x')
        pos_y = instance.find('pos_y')
        
        # Crear evento base
        event = {
            "ID": event_id,
            "CATEGORY": category,
            "SECOND": start_sec,
            "MINUTE": minute,
            "TIME": time_str,
            "DURATION": duration,
            "GAME": 1,
            "TEAM": match_info['team'],
            "OPPONENT": match_info['opponent'],
            "PERIODS": period
        }
        
        # Agregar posiciones si existen
        if pos_x is not None and pos_x.text:
            event['COORDINATE_X'] = int(pos_x.text)
        if pos_y is not None and pos_y.text:
            event['COORDINATE_Y'] = int(pos_y.text)
        
        # Extraer todos los labels y agregarlos al evento
        labels_data = extract_labels(instance)
        event.update(labels_data)
        
        events.append(event)
        event_id += 1
    
    return events

def main():
    # Configuración del partido
    match_info = {
        'team': 'Pescara',
        'opponent': 'Polisportiva L\'Aquila',
        'date': '2024-11-02',
        'location': 'L\'Aquila',
        'video_url': 'https://devua-public.s3.eu-central-1.amazonaws.com/pescararugby/Pescara+vs+Pol+L\'Aquila.mov',
        'kick_off_1': 0,
        'end_1': 2281,
        'kick_off_2': 2288,
        'end_2': 4474
    }
    
    xml_path = '/app/uploads/Polisportiva.xml'
    matriz_path = '/app/uploads/matrizPescara.json'
    matches_path = '/app/uploads/matchesPescara.json'
    
    print("🔄 Convirtiendo XML completo a JSON...")
    events = parse_xml_to_json(xml_path, match_info)
    
    # Guardar eventos
    with open(matriz_path, 'w', encoding='utf-8') as f:
        json.dump(events, f, indent=2, ensure_ascii=False)
    
    # Guardar info del partido
    matches = [{
        "MATCH_ID": 1,
        "TEAM": match_info['team'],
        "OPPONENT": match_info['opponent'],
        "DATE": match_info['date'],
        "LOCATION": match_info['location'],
        "VIDEO_URL": match_info['video_url'],
        "KICK_OFF_1": match_info['kick_off_1'],
        "END_1": match_info['end_1'],
        "KICK_OFF_2": match_info['kick_off_2'],
        "END_2": match_info['end_2']
    }]
    
    with open(matches_path, 'w', encoding='utf-8') as f:
        json.dump(matches, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Convertidos {len(events)} eventos con TODOS los campos")
    print(f"📊 Eventos: {matriz_path}")
    print(f"🏉 Partido: {matches_path}")
    
    # Mostrar estadísticas de campos extraídos
    players = [e.get('PLAYER') for e in events if e.get('PLAYER')]
    print(f"\n📈 Estadísticas:")
    print(f"   - Eventos totales: {len(events)}")
    print(f"   - Eventos con jugador: {len(players)}")
    print(f"   - Jugadores únicos: {len(set(players))}")
    if players:
        print(f"   - Jugadores: {', '.join(sorted(set(players)))}")

if __name__ == '__main__':
    main()
