import xml.etree.ElementTree as ET
import json

tree = ET.parse('/app/uploads/Polisportiva.xml')
root = tree.getroot()

matriz = []
id_counter = 1

for instance in root.findall('.//instance'):
    code = instance.find('code')
    if code is None:
        continue
    
    category = code.text
    start = instance.find('start')
    end = instance.find('end')
    
    if start is None or end is None:
        continue
    
    start_ms = float(start.text)
    end_ms = float(end.text)
    duration = (end_ms - start_ms) / 1000.0
    second = start_ms / 1000.0
    minute = second / 60.0
    
    hours = int(second // 3600)
    minutes = int((second % 3600) // 60)
    secs = int(second % 60)
    time_str = f"{hours:02d}:{minutes:02d}:{secs:02d}"
    
    # Determinar el periodo basado en los tiempos del partido
    # 1T: 0-2281s, 2T: 2288-4474s
    if second < 2281:
        period = 1
    elif second >= 2288:
        period = 2
    else:
        period = 1  # Medio tiempo, asignar a periodo 1
    
    event = {
        "ID": id_counter,
        "CATEGORY": category,
        "SECOND": second,
        "MINUTE": minute,
        "TIME": time_str,
        "DURATION": duration,
        "GAME": 1,
        "TEAM": "Pescara",
        "OPPONENT": "Polisportiva L'Aquila",
        "PERIODS": period
    }
    
    matriz.append(event)
    id_counter += 1

with open('/app/uploads/matrizPescara.json', 'w', encoding='utf-8') as f:
    json.dump(matriz, f, indent=2, ensure_ascii=False)

matches = [{
    "MATCH_ID": 1,
    "TEAM": "Pescara",
    "OPPONENT": "Polisportiva L'Aquila", 
    "DATE": "2024-11-02",
    "LOCATION": "L'Aquila",
    "VIDEO_URL": "https://devua-public.s3.eu-central-1.amazonaws.com/pescararugby/Pescara+vs+Pol+L'Aquila.mov",
    "KICK_OFF_1": 0,
    "END_1": 2281,
    "KICK_OFF_2": 2288,
    "END_2": 4474
}]

with open('/app/uploads/matchesPescara.json', 'w', encoding='utf-8') as f:
    json.dump(matches, f, indent=2, ensure_ascii=False)

print(f"✅ Convertidos {len(matriz)} eventos del partido Pescara vs Polisportiva L'Aquila")
print(f"📊 Archivo generado: /app/uploads/matrizPescara.json")
print(f"🏉 Archivo generado: /app/uploads/matchesPescara.json")
