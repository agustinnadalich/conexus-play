# 📥 Ejemplos de Importación - ConexusPlay

Guía práctica para importar datos de rugby desde sistemas como LongoMatch, Sportscode o Nacsport.

## 📋 Contenido

1. [Ejemplo XML (LongoMatch)](#ejemplo-1-xml-longomatch)
2. [Ejemplo Excel](#ejemplo-2-excel)
3. [Configurar tiempos manualmente](#ejemplo-3-tiempos-manuales)
4. [Problemas comunes](#casos-especiales)

---

## Ejemplo 1: XML (LongoMatch)

### Archivo de ejemplo

**Nombre**: `pescara_vs_avezzano.xml`  
**Sistema**: LongoMatch  
**Eventos**: 577  

### Parte del archivo XML

```xml
<instance>
  <ID>9</ID>
  <start>105.8</start>
  <end>117.8</end>
  <code>PENALTY</code>
  <pos_x>18</pos_x>
  <pos_y>48</pos_y>
  <label>
    <text>T2B</text>
  </label>
  <label>
    <group>JUGADOR</group>
    <text>Matera</text>
  </label>
  <label>
    <group>INFRACCION</group>
    <text>RUCK ATTACK</text>
  </label>
  <label>
    <group>EQUIPO</group>
    <text>PESCARA</text>
  </label>
</instance>
```

### Paso 1: Normalización

**Input**: XML + Perfil "Importacion XML"

```python
# Backend recibe el archivo y perfil
result = normalize_xml_to_json(
    filepath="/app/uploads/20251019 Az-Pescara (2).xml",
    profile={
        "name": "Importacion XML",
        "settings": {
            "time_mapping": {"method": "automatic"},
            "discard_categories": ["WARMUP", "TIMEOUT"]
        }
    }
)
```

**Output**: JSON Normalizado

```json
{
  "match": {
    "team": "Desconocido",
    "opponent": "Rival", 
    "date": "2023-01-01"
  },
  "events": [
    {
      "event_type": "KICK OFF",
      "timestamp_sec": 0.0,
      "x": null,
      "y": null,
      "team": "OPPONENT",
      "extra_data": {
        "EQUIPO": "RIVAL",
        "clip_start": 0.0,
        "clip_end": 4.2
      }
    },
    {
      "event_type": "PENALTY",
      "timestamp_sec": 105.8,
      "x": 18,
      "y": 48,
      "team": "PESCARA",
      "extra_data": {
        "JUGADOR": "Matera",
        "INFRACCION": "RUCK ATTACK",
        "EQUIPO": "PESCARA",
        "MISC": "T2B",
        "clip_start": 105.8,
        "clip_end": 117.8
      }
    }
    // ... 575 eventos más
  ],
  "event_types": [
    "KICK OFF", "ATTACK", "SHORT-MATCH", "TURNOVER+", "END",
    "SCRUM", "TACKLE", "TURNOVER-", "LINEOUT", "DEFENSE",
    "PENALTY", "TRY", "CONVERSION", "DROP GOAL"
  ],
  "labels_without_group": ["T1D", "T2B", "T1A", "T3C"]
}
```

### Paso 2: Preview en Frontend

Usuario ve:

```
╔════════════════════════════════════════════════════════════╗
║  PREVIEW: 20251019 Az-Pescara (2).xml                     ║
╠════════════════════════════════════════════════════════════╣
║                                                             ║
║  INFORMACIÓN DEL PARTIDO                                    ║
║  ┌───────────────────────────────────────────────────────┐ ║
║  │ Equipo:       [Pescara                             ]  │ ║
║  │ Rival:        [Avezzano                            ]  │ ║
║  │ Fecha:        [2025-10-19                          ]  │ ║
║  │ Ubicación:    [Estadio Adriático                   ]  │ ║
║  │ Competición:  [Serie A Italiana                    ]  │ ║
║  │ Video URL:    [https://youtube.com/watch?v=...     ]  │ ║
║  └───────────────────────────────────────────────────────┘ ║
║                                                             ║
║  CATEGORÍAS DETECTADAS (14 tipos)                          ║
║  ┌───────────────────────────────────────────────────────┐ ║
║  │ ☑ ATTACK          (145 eventos)                       │ ║
║  │ ☑ TACKLE          (89 eventos)                        │ ║
║  │ ☑ PENALTY         (23 eventos)                        │ ║
║  │ ☑ SCRUM           (18 eventos)                        │ ║
║  │ ☑ LINEOUT         (15 eventos)                        │ ║
║  │ ☑ TURNOVER+       (34 eventos)                        │ ║
║  │ ☑ TURNOVER-       (28 eventos)                        │ ║
║  │ ☑ TRY             (4 eventos)                         │ ║
║  │ ☑ DEFENSE         (156 eventos)                       │ ║
║  │ ☑ SHORT-MATCH     (50 eventos)                        │ ║
║  │ ☐ KICK OFF        (2 eventos)  [Descartado]          │ ║
║  │ ☐ END             (2 eventos)  [Descartado]          │ ║
║  │ ☐ WARMUP          (3 eventos)  [Descartado]          │ ║
║  │ ☐ TIMEOUT         (8 eventos)  [Descartado]          │ ║
║  └───────────────────────────────────────────────────────┘ ║
║                                                             ║
║  [Seleccionar Todo]  [Descartar Todo]  [Descartar Comunes]║
║                                                             ║
║  LABELS SIN GRUPO (4 detectados)                           ║
║  ⚠️  "T1D", "T2B", "T1A", "T3C"                            ║
║  (Se guardarán en extra_data['MISC'])                      ║
║                                                             ║
║  [Cancelar]                          [Confirmar Importación]║
╚════════════════════════════════════════════════════════════╝
```

### Paso 3: Usuario Confirma

**Request a Backend**:

```json
POST /api/save_match
Content-Type: application/json

{
  "match": {
    "team": "Pescara",
    "opponent_name": "Avezzano",
    "date": "2025-10-19",
    "location": "Estadio Adriático",
    "competition": "Serie A Italiana",
    "video_url": "https://youtube.com/watch?v=abc123"
  },
  "events": [
    // 562 eventos (excluyendo KICK OFF, END, WARMUP, TIMEOUT)
    {
      "event_type": "PENALTY",
      "timestamp_sec": 105.8,
      "x": 18,
      "y": 48,
      "team": "PESCARA",
      "extra_data": {
        "JUGADOR": "Matera",
        "INFRACCION": "RUCK ATTACK",
        "MISC": "T2B"
      }
    }
    // ...
  ],
  "profile": "Importacion XML"
}
```

### Paso 4: Enriquecimiento

Backend ejecuta `enricher.py`:

```python
# Detectar períodos automáticamente
time_offsets = {
    1: {"start_offset": 0, "end_time": 2400},      # P1: 0s - 2400s (40 min)
    2: {"start_offset": 2700, "end_time": 2400}    # P2: 2700s - 5100s (40 min)
}

# Enriquecer cada evento
for event in events:
    timestamp = event['timestamp_sec']
    
    # Determinar período
    if timestamp < 2400:
        period = 1
        game_time_seconds = timestamp - 0
    else:
        period = 2
        game_time_seconds = timestamp - 2700
    
    # Convertir a MM:SS
    minutes = int(game_time_seconds // 60)
    seconds = int(game_time_seconds % 60)
    game_time = f"{minutes:02d}:{seconds:02d}"
    
    # Asignar grupo temporal
    if period == 1:
        if game_time_seconds < 1200:
            time_group = "Primer cuarto"
        else:
            time_group = "Segundo cuarto"
    else:
        if game_time_seconds < 1200:
            time_group = "Tercer cuarto"
        else:
            time_group = "Cuarto cuarto"
    
    # Agregar al evento
    event['period'] = period
    event['game_time'] = game_time
    event['time_group'] = time_group
```

**Evento enriquecido**:

```json
{
  "event_type": "PENALTY",
  "timestamp_sec": 105.8,
  "game_time": "01:45",
  "period": 1,
  "time_group": "Primer cuarto",
  "x": 18,
  "y": 48,
  "team": "PESCARA",
  "extra_data": {
    "JUGADOR": "Matera",
    "INFRACCION": "RUCK ATTACK",
    "MISC": "T2B"
  }
}
```

### Paso 5: Inserción en PostgreSQL

```sql
-- 1. Crear/obtener Club
INSERT INTO clubs (name) 
VALUES ('Pescara') 
ON CONFLICT (name) DO NOTHING 
RETURNING id;  
-- id = 1

-- 2. Crear Team
INSERT INTO teams (club_id, name, category, season)
VALUES (1, 'Pescara', 'Senior', '2024-25')
RETURNING id;  
-- id = 1

-- 3. Crear Match
INSERT INTO matches (
  team_id, opponent_name, date, location, 
  competition, video_url
)
VALUES (
  1, 'Avezzano', '2025-10-19', 'Estadio Adriático',
  'Serie A Italiana', 'https://youtube.com/watch?v=abc123'
)
RETURNING id;  
-- match_id = 1

-- 4. Crear Player (si no existe)
INSERT INTO players (full_name)
VALUES ('Matera')
ON CONFLICT (full_name) DO NOTHING
RETURNING id;  
-- player_id = 1

-- 5. Insertar Eventos (562 inserts)
INSERT INTO events (
  match_id, player_id, event_type, timestamp, 
  game_time, period, time_group, x, y, team, extra_data
)
VALUES 
  (1, 1, 'PENALTY', 105.8, '01:45', 1, 'Primer cuarto', 
   18, 48, 'PESCARA', 
   '{"JUGADOR": "Matera", "INFRACCION": "RUCK ATTACK", "MISC": "T2B"}'),
  (1, 2, 'TACKLE', 165.0, '02:45', 1, 'Primer cuarto',
   NULL, NULL, 'PESCARA',
   '{"JUGADOR": "Tucu", "ENCUADRE-TACKLE": "OUTSIDE"}'),
  -- ... 560 eventos más
```

### Resultado Final

```
✅ Importación exitosa

Partido creado:
- ID: 1
- Pescara vs Avezzano
- 2025-10-19
- 562 eventos importados
- 25 jugadores detectados

Distribución:
- Período 1: 302 eventos
- Período 2: 260 eventos

Categorías principales:
- DEFENSE: 156 eventos
- ATTACK: 145 eventos  
- TACKLE: 89 eventos
- TURNOVER+: 34 eventos
- TURNOVER-: 28 eventos
```

---

## Ejemplo 2: Excel San Benedetto

### Archivo Original

**Nombre**: `Matriz_San_Benedetto_24-25_ENG.xlsx`  
**Hojas**: `MATCHES`, `MATRIZ`

### Hoja MATCHES

| team          | opponent    | date       | location      | video_url           |
|---------------|-------------|------------|---------------|---------------------|
| San Benedetto | Lions       | 2025-01-15 | Campo Centrale| https://youtu.be/... |

### Hoja MATRIZ (primeras filas)

| CATEGORY | TIME | PERIODS | PLAYER  | X  | Y  | TEAM          | NOTES           |
|----------|------|---------|---------|----|----|--------------|-----------------| 
| KICK OFF | 0    | 1       |         |    |    | San Benedetto|                 |
| ATTACK   | 15   | 1       | Rossi   | 25 | 50 | San Benedetto| 3 fases         |
| TACKLE   | 23   | 1       | Bianchi | 30 | 45 | San Benedetto| Tackle dominante|
| PENALTY  | 45   | 1       | Verdi   | 20 | 60 | Lions        | Offside         |
| ...      | ...  | ...     | ...     | ...| ...| ...          | ...             |

### Perfil de Importación

```json
{
  "name": "San Benedetto Excel",
  "description": "Formato Excel con hoja MATCHES y MATRIZ",
  "file_types": ["xlsx", "xls"],
  "settings": {
    "sheets": {
      "match_info": "MATCHES",
      "events": "MATRIZ"
    },
    "columns": {
      "event_type": "CATEGORY",
      "time": "TIME",
      "period": "PERIODS",
      "player": "PLAYER",
      "x": "X",
      "y": "Y",
      "team": "TEAM",
      "notes": "NOTES"
    },
    "time_mapping": {
      "method": "from_column",
      "period_column": "PERIODS",
      "time_format": "seconds"
    },
    "discard_categories": ["WARMUP", "END"]
  }
}
```

### Normalización

```python
def normalize_excel_to_json(filepath, profile):
    # 1. Leer hoja MATCHES
    matches_df = pd.read_excel(filepath, sheet_name='MATCHES')
    match_info = {
        "team": matches_df.iloc[0]['team'],
        "opponent": matches_df.iloc[0]['opponent'],
        "date": matches_df.iloc[0]['date'].isoformat(),
        "location": matches_df.iloc[0]['location'],
        "video_url": matches_df.iloc[0]['video_url']
    }
    
    # 2. Leer hoja MATRIZ
    events_df = pd.read_excel(filepath, sheet_name='MATRIZ')
    
    # 3. Mapear columnas
    events = []
    for _, row in events_df.iterrows():
        event = {
            "event_type": row['CATEGORY'],
            "timestamp_sec": row['TIME'],
            "period": row['PERIODS'],
            "x": row['X'] if pd.notna(row['X']) else None,
            "y": row['Y'] if pd.notna(row['Y']) else None,
            "team": row['TEAM'],
            "extra_data": {
                "PLAYER": row['PLAYER'] if pd.notna(row['PLAYER']) else None,
                "NOTES": row['NOTES'] if pd.notna(row['NOTES']) else None
            }
        }
        events.append(event)
    
    return {
        "match": match_info,
        "events": events,
        "event_types": list(events_df['CATEGORY'].unique())
    }
```

---

## Ejemplo 3: Perfil Manual

### Caso de Uso

Un XML de Sportscode que **no tiene eventos de control** claros (sin KICK OFF/END).

### Archivo XML

```xml
<plays>
  <play>
    <start>0</start>
    <end>5</end>
    <action>PHASE PLAY</action>
  </play>
  <play>
    <start>120</start>
    <end>135</end>
    <action>TACKLE</action>
  </play>
  <!-- Sin eventos KICK OFF ni END explícitos -->
</plays>
```

### Perfil con Tiempos Manuales

```json
{
  "name": "Sportscode Manual Times",
  "file_types": ["xml"],
  "settings": {
    "time_mapping": {
      "method": "manual",
      "manual_times": {
        "kick_off_1": 0,
        "end_1": 2400,
        "kick_off_2": 2700,
        "end_2": 5100
      }
    }
  }
}
```

### UI en PreviewImport

```tsx
{isManualProfile && (
  <Card title="Configuración de Tiempos (Manual)">
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Período 1 - Inicio (segundos)</Label>
        <Input 
          type="number" 
          value={manualTimes.kick_off_1}
          onChange={(e) => setManualTimes(prev => ({
            ...prev, 
            kick_off_1: parseInt(e.target.value)
          }))}
        />
      </div>
      <div>
        <Label>Período 1 - Fin (segundos)</Label>
        <Input 
          type="number" 
          value={manualTimes.end_1}
          onChange={(e) => setManualTimes(prev => ({
            ...prev, 
            end_1: parseInt(e.target.value)
          }))}
        />
      </div>
      <div>
        <Label>Período 2 - Inicio (segundos)</Label>
        <Input 
          type="number" 
          value={manualTimes.kick_off_2}
          onChange={(e) => setManualTimes(prev => ({
            ...prev, 
            kick_off_2: parseInt(e.target.value)
          }))}
        />
      </div>
      <div>
        <Label>Período 2 - Fin (segundos)</Label>
        <Input 
          type="number" 
          value={manualTimes.end_2}
          onChange={(e) => setManualTimes(prev => ({
            ...prev, 
            end_2: parseInt(e.target.value)
          }))}
        />
      </div>
    </div>
    <p className="text-sm text-gray-500 mt-2">
      💡 Tip: Usa el reproductor de video para identificar los tiempos exactos
    </p>
  </Card>
)}
```

### Enriquecimiento con Tiempos Manuales

```python
def enrich_with_manual_times(events, manual_times):
    """
    manual_times = {
        "kick_off_1": 0,
        "end_1": 2400,
        "kick_off_2": 2700,
        "end_2": 5100
    }
    """
    
    time_offsets = {
        1: {
            "start_offset": manual_times['kick_off_1'],
            "end_time": manual_times['end_1']
        },
        2: {
            "start_offset": manual_times['kick_off_2'],
            "end_time": manual_times['end_2']
        }
    }
    
    for event in events:
        timestamp = event['timestamp_sec']
        
        # Determinar período basado en rangos manuales
        if timestamp < manual_times['end_1']:
            period = 1
            game_time_sec = timestamp - manual_times['kick_off_1']
        else:
            period = 2
            game_time_sec = timestamp - manual_times['kick_off_2']
        
        event['period'] = period
        event['game_time'] = seconds_to_mmss(game_time_sec)
```

---

## Casos Especiales

### Caso 1: Partido con Tiempo Extra

```python
# Perfil con 3 períodos
{
  "time_mapping": {
    "method": "manual",
    "manual_times": {
      "kick_off_1": 0,
      "end_1": 2400,      # 40 min
      "kick_off_2": 2700,
      "end_2": 5100,      # 80 min
      "kick_off_extra": 5400,
      "end_extra": 5700   # 85 min (5 min extra)
    },
    "periods": 3
  }
}
```

### Caso 2: Importación Incremental (GPS)

```json
POST /api/import/incremental

{
  "match_id": 1,  // Partido existente
  "data_type": "gps",
  "events": [
    {
      "timestamp_sec": 120.5,
      "extra_data": {
        "speed": 6.5,
        "distance": 15.2,
        "heart_rate": 178
      }
    }
  ]
}
```

**Backend**: Merge con eventos existentes por `timestamp_sec`

### Caso 3: Labels Sin Group - Mapeo Manual

```tsx
<Card title="Interpretar Labels">
  <div>
    <Label>Label "T1D" detectado</Label>
    <Select onChange={(e) => mapLabel('T1D', e.target.value)}>
      <option value="">Seleccionar...</option>
      <option value="zone">Zona del Campo</option>
      <option value="phase">Fase de Ataque</option>
      <option value="custom">Otro (especificar)</option>
      <option value="ignore">Ignorar</option>
    </Select>
    {mappedAs === 'zone' && (
      <Input placeholder="Ej: Zona Defensiva" />
    )}
  </div>
</Card>
```

**Resultado**:
```json
{
  "extra_data": {
    "zone": "Zona Defensiva"  // En lugar de "MISC": "T1D"
  }
}
```

### Caso 4: Validación de Tiempos

```tsx
const validateTimes = (times) => {
  const errors = [];
  
  if (times.end_1 <= times.kick_off_1) {
    errors.push("Fin P1 debe ser mayor que Inicio P1");
  }
  
  if (times.kick_off_2 <= times.end_1) {
    errors.push("Inicio P2 debe ser después de Fin P1");
  }
  
  if (times.end_2 <= times.kick_off_2) {
    errors.push("Fin P2 debe ser mayor que Inicio P2");
  }
  
  const p1_duration = times.end_1 - times.kick_off_1;
  const p2_duration = times.end_2 - times.kick_off_2;
  
  if (p1_duration < 600) {  // 10 min mínimo
    errors.push("Período 1 parece demasiado corto");
  }
  
  if (Math.abs(p1_duration - p2_duration) > 300) {  // 5 min diferencia
    errors.push("Los períodos tienen duraciones muy diferentes");
  }
  
  return errors;
};
```

---

## Comandos de Testing

### Test Normalización XML

```bash
cd backend
python -c "
from normalizer import normalize_xml_to_json
result = normalize_xml_to_json(
    'uploads/20251019 Az-Pescara (2).xml',
    {'name': 'Importacion XML', 'settings': {}}
)
print(f'Eventos: {len(result[\"events\"])}')
print(f'Categorías: {result[\"event_types\"]}')
"
```

### Test Normalización Excel

```bash
python -c "
from normalizer import normalize_excel_to_json
result = normalize_excel_to_json(
    'uploads/Matriz_San_Benedetto_24-25_ENG.xlsx',
    {
        'name': 'San Benedetto Excel',
        'settings': {
            'sheets': {'match_info': 'MATCHES', 'events': 'MATRIZ'},
            'columns': {'event_type': 'CATEGORY', 'time': 'TIME'}
        }
    }
)
print(f'Match: {result[\"match\"]}')
print(f'Eventos: {len(result[\"events\"])}')
"
```

### Test Enriquecimiento

```bash
python -c "
from enricher import enrich_events
events = [
    {'event_type': 'TACKLE', 'timestamp_sec': 120.5}
]
enriched = enrich_events(
    events, 
    {'manual_period_times': {'kick_off_1': 0, 'end_1': 2400}},
    {'name': 'Test'}
)
print(enriched[0])
"
```

---

**Última actualización**: 28 de octubre de 2025
