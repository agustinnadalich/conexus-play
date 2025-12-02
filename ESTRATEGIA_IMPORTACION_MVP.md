# Estrategia de Importación - MVP VideoAnalysis

## 📋 Resumen Ejecutivo

La estrategia de importación del MVP está diseñada para ser **flexible, escalable y centrada en el usuario**, permitiendo procesar datos desde múltiples fuentes (Excel, XML, JSON) mediante un sistema de **perfiles de importación configurables**.

---

## 🎯 Objetivos Clave

1. **Flexibilidad**: Soportar múltiples formatos de datos (LongoMatch XML, Excel personalizado, Sportscode, Nacsport)
2. **Control del Usuario**: Preview completo antes de importar con capacidad de filtrar categorías
3. **Normalización**: Convertir todos los formatos a una estructura unificada
4. **Enriquecimiento**: Calcular automáticamente períodos, Game_Time y metadatos adicionales
5. **Persistencia**: Almacenar en PostgreSQL con modelo relacional robusto

---

## 📊 Flujo de Importación (5 Fases)

```
┌─────────────────┐
│  1. UPLOAD      │  Usuario sube archivo (Excel/XML/JSON) + selecciona perfil
└────────┬────────┘
         │
┌────────▼────────┐
│  2. PREVIEW     │  Normalización + extracción de categorías + preview
└────────┬────────┘
         │
┌────────▼────────┐
│  3. FILTER      │  Usuario selecciona/descarta categorías y completa metadata
└────────┬────────┘
         │
┌────────▼────────┐
│  4. ENRICH      │  Cálculo de períodos, Game_Time, grupos temporales
└────────┬────────┘
         │
┌────────▼────────┐
│  5. SAVE        │  Inserción en PostgreSQL (Club → Team → Match → Events)
└─────────────────┘
```

---

## 🔍 Análisis del XML de Ejemplo

### Estructura del XML (LongoMatch/Nacsport)

```xml
<file>
  <ALL_INSTANCES>
    <instance>
      <ID>1</ID>
      <start>0</start>
      <end>4.2</end>
      <code>KICK OFF</code>                    ← Tipo de evento
      <label>
        <group>EQUIPO</group>                  ← Descriptor categorizado
        <text>RIVAL</text>
      </label>
      <label>
        <group>EQUIPO</group>
        <text>1</text>
      </label>
    </instance>
    
    <instance>
      <ID>9</ID>
      <start>105.8</start>
      <end>117.8</end>
      <code>PENALTY</code>
      <pos_x>18</pos_x>                        ← Coordenadas opcionales
      <pos_y>48</pos_y>
      <label>
        <text>T2B</text>                       ← Label sin group (necesita mapeo)
      </label>
      <label>
        <group>JUGADOR</group>                 ← Jugadores
        <text>Matera</text>
      </label>
      <label>
        <group>INFRACCION</group>              ← Descriptor específico
        <text>RUCK ATTACK</text>
      </label>
      <label>
        <group>EQUIPO</group>
        <text>PESCARA</text>
      </label>
    </instance>
  </ALL_INSTANCES>
</file>
```

### Características Detectadas

✅ **Eventos de Control**: KICK OFF, END, HALFTIME → Marcan inicio/fin de períodos
✅ **Eventos de Juego**: ATTACK, TACKLE, PENALTY, SCRUM, LINEOUT, etc.
✅ **Coordenadas**: `pos_x`, `pos_y` (mapas de calor)
✅ **Labels con Group**: EQUIPO, JUGADOR, INFRACCION → Estructurados
⚠️ **Labels sin Group**: "T1D", "T2B" → Requieren interpretación manual

---

## 🏗️ Sistema de Perfiles de Importación

### Concepto

Un **perfil** es un conjunto de reglas que define:
- Qué columnas/campos mapear desde el archivo fuente
- Cómo interpretar tiempos (automático vs manual)
- Qué categorías descartar por defecto
- Configuraciones específicas del formato

### Ejemplo de Perfil XML (actual)

```json
{
  "name": "Importacion XML",
  "description": "Perfil para importar archivos XML de LongoMatch/Nacsport",
  "file_types": ["xml"],
  "settings": {
    "time_mapping": {
      "method": "automatic",  // Detecta KICK OFF/END automáticamente
      "control_events": ["KICK OFF", "END", "HALFTIME"]
    },
    "discard_categories": ["WARMUP", "TIMEOUT"],
    "coordinate_fields": {
      "x": "pos_x",
      "y": "pos_y"
    },
    "team_mapping": {
      "own_team_values": ["PESCARA"],     // Configurable por partido
      "opponent_values": ["RIVAL", "OPPONENT"]
    },
    "player_extraction": {
      "group_name": "JUGADOR"
    }
  }
}
```

### Ejemplo de Perfil Excel Personalizado

```json
{
  "name": "San Benedetto Excel",
  "description": "Matriz de eventos de San Benedetto",
  "file_types": ["xlsx", "xls"],
  "settings": {
    "sheets": {
      "events": "MATRIZ",
      "match_info": "MATCHES"
    },
    "columns": {
      "event_type": "CATEGORY",
      "time": "TIME",
      "player": "PLAYER",
      "team": "TEAM",
      "x": "X",
      "y": "Y",
      "period": "PERIODS"
    },
    "time_mapping": {
      "method": "from_column",  // Lee período desde columna PERIODS
      "format": "seconds"
    }
  }
}
```

### Ejemplo de Perfil con Tiempos Manuales

```json
{
  "name": "Sportscode Manual Times",
  "description": "Para XMLs sin eventos de control claros",
  "file_types": ["xml"],
  "settings": {
    "time_mapping": {
      "method": "manual",
      "manual_times": {
        "kick_off_1": 0,      // Usuario ingresa manualmente
        "end_1": 2400,        // 40:00 = 2400 segundos
        "kick_off_2": 2700,   // 45:00 con 5 min de descanso
        "end_2": 4800         // 80:00
      }
    }
  }
}
```

---

## 💻 Implementación Actual

### 1. Frontend: ImportMatch.tsx

**Responsabilidades**:
- Selección de archivo
- Selección de perfil
- Llamada a `/api/import/preview`

```tsx
const handlePreview = async () => {
  const formData = new FormData();
  formData.append("file", file);
  
  const res = await fetch(
    `http://localhost:5001/api/import/preview?profile=${selectedProfile}`,
    { method: 'POST', body: formData }
  );
  
  const data = await res.json();
  // Navegar a PreviewImport con data
  navigate("/preview", { state: { previewData: data, profile } });
};
```

### 2. Backend: normalizer.py

**Responsabilidades**:
- Parsear XML/Excel/JSON
- Convertir a formato unificado
- Extraer categorías únicas
- Detectar labels sin group

```python
def normalize_xml_to_json(filepath, profile):
    """
    Entrada: XML de LongoMatch
    Salida: {
      "match": { "team": "...", "opponent": "...", "date": "..." },
      "events": [
        {
          "event_type": "PENALTY",
          "timestamp_sec": 105.8,
          "x": 18, "y": 48,
          "extra_data": {
            "JUGADOR": "Matera",
            "INFRACCION": "RUCK ATTACK",
            "EQUIPO": "PESCARA"
          }
        }
      ],
      "event_types": ["KICK OFF", "ATTACK", "PENALTY", ...],
      "labels_without_group": ["T1D", "T2B"]
    }
    """
```

**Funciones Clave**:

```python
def detect_periods_and_convert_times(instances, profile):
    """
    Detecta KICK OFF y END para calcular offsets de períodos:
    Period 1: offset = 0
    Period 2: offset = tiempo_real_de_END_1 + pausa
    """
    
def seconds_to_game_time(timestamp, period, time_offsets):
    """
    Convierte timestamp absoluto del video a Game_Time relativo:
    Ejemplo: timestamp=2750s, period=2, offset=2700 → "00:50"
    """
```

### 3. Frontend: PreviewImport.tsx

**Responsabilidades**:
- Mostrar metadata del partido (editable)
- Listar todas las categorías con checkboxes
- Botones: "Descartar Comunes", "Seleccionar Todo", "Descartar Todo"
- Manejo de tiempos manuales (si el perfil lo requiere)
- Confirmación final

```tsx
const PreviewImport = () => {
  const { previewData, profile } = useLocation().state;
  
  const [matchInfo, setMatchInfo] = useState(previewData.match_info);
  const [discardedCategories, setDiscardedCategories] = useState([]);
  const [manualTimes, setManualTimes] = useState({
    kick_off_1: 0, end_1: 2400,
    kick_off_2: 2700, end_2: 4800
  });
  
  const handleConfirm = async () => {
    const eventsToImport = events.filter(
      ev => !discardedCategories.includes(ev.event_type)
    );
    
    await fetch("http://localhost:5001/api/save_match", {
      method: "POST",
      body: JSON.stringify({
        match: { ...matchInfo, manual_period_times: manualTimes },
        events: eventsToImport,
        profile: profile.name
      })
    });
  };
};
```

**Funciones de Filtrado**:

```tsx
const discardCommonCategories = () => {
  // Descarta: WARMUP, HALFTIME, END, TIMEOUT automáticamente
  const common = ["WARMUP", "HALFTIME", "END", "TIMEOUT"];
  setDiscardedCategories(prev => [...new Set([...prev, ...toDiscard])]);
};

const toggleCategory = (category) => {
  // Toggle individual de categorías
};
```

### 4. Backend: enricher.py (NUEVO - No implementado aún)

**Responsabilidades**:
- Calcular períodos basados en tiempos manuales o automáticos
- Generar Game_Time desde cero (00:00, 00:01, ...)
- Asignar grupos temporales ("Primer cuarto", "Segundo cuarto", etc.)
- Enriquecer con información derivada (tackles efectivos, line breaks, etc.)

```python
def enrich_events(events, match_info, profile):
    """
    Entrada: Eventos normalizados + metadata
    Salida: Eventos enriquecidos con:
      - period (1 o 2)
      - game_time (MM:SS desde 00:00)
      - time_group (cuartos del partido)
      - extra_metrics (derivados)
    """
    
    # Obtener configuración de tiempos
    time_config = profile.get('settings', {}).get('time_mapping', {})
    method = time_config.get('method', 'automatic')
    
    if method == 'manual':
        manual_times = match_info.get('manual_period_times', {})
        time_offsets = calculate_manual_offsets(manual_times)
    else:
        time_offsets = detect_automatic_offsets(events)
    
    enriched = []
    for event in events:
        # Calcular período basado en timestamp
        period = determine_period(event['timestamp_sec'], time_offsets)
        
        # Calcular Game_Time relativo al período
        game_time = calculate_game_time(
            event['timestamp_sec'], 
            period, 
            time_offsets
        )
        
        # Asignar grupo temporal
        time_group = assign_time_group(game_time, period)
        
        enriched.append({
            **event,
            'period': period,
            'game_time': game_time,
            'time_group': time_group
        })
    
    return enriched
```

### 5. Backend: importer.py

**Responsabilidades**:
- Crear/obtener Club, Team, Match
- Insertar eventos en PostgreSQL
- Relacionar Player con eventos

```python
def save_match_to_db(match_data, events, profile_name):
    """
    1. Club: Buscar o crear
    2. Team: Crear si no existe
    3. Match: Insertar nuevo partido
    4. Events: Insertar todos los eventos relacionados
    5. Players: Crear jugadores si no existen y asociarlos
    """
    db = SessionLocal()
    try:
        # 1. Club
        club = db.query(Club).filter_by(name=match_data['team']).first()
        if not club:
            club = Club(name=match_data['team'])
            db.add(club)
            db.flush()
        
        # 2. Team
        team = db.query(Team).filter_by(
            club_id=club.id, 
            name=match_data['team']
        ).first()
        if not team:
            team = Team(club_id=club.id, name=match_data['team'])
            db.add(team)
            db.flush()
        
        # 3. Match
        match = Match(
            team_id=team.id,
            opponent_name=match_data['opponent'],
            date=match_data['date'],
            video_url=match_data.get('video_url'),
            location=match_data.get('location'),
            competition=match_data.get('competition')
        )
        db.add(match)
        db.flush()
        
        # 4. Events
        for event_data in events:
            # Buscar/crear jugador si existe
            player = None
            if event_data.get('extra_data', {}).get('JUGADOR'):
                player_name = event_data['extra_data']['JUGADOR']
                player = db.query(Player).filter_by(full_name=player_name).first()
                if not player:
                    player = Player(full_name=player_name)
                    db.add(player)
                    db.flush()
            
            event = Event(
                match_id=match.id,
                player_id=player.id if player else None,
                event_type=event_data['event_type'],
                timestamp=event_data['timestamp_sec'],
                game_time=event_data.get('game_time'),
                period=event_data.get('period'),
                x=event_data.get('x'),
                y=event_data.get('y'),
                team=event_data.get('team'),
                extra_data=event_data.get('extra_data')
            )
            db.add(event)
        
        db.commit()
        return match.id
        
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
```

---

## 🔄 Flujo Detallado con Ejemplo XML

### Paso 1: Usuario sube "20251019 Az-Pescara (2).xml"

- Frontend detecta extensión `.xml`
- Sugiere perfil "Importacion XML"
- Usuario confirma y hace click en "Preview"

### Paso 2: Backend normaliza el XML

```python
# normalizer.py
result = normalize_xml_to_json(
    filepath="/app/uploads/20251019 Az-Pescara (2).xml",
    profile={
        "name": "Importacion XML",
        "settings": { ... }
    }
)

# Resultado:
{
  "match": {
    "team": "Desconocido",  # Usuario completará en preview
    "opponent": "Rival",
    "date": "2023-01-01"
  },
  "events": [
    {
      "event_type": "KICK OFF",
      "timestamp_sec": 0.0,
      "extra_data": { "EQUIPO": "RIVAL" }
    },
    {
      "event_type": "PENALTY",
      "timestamp_sec": 105.8,
      "x": 18, "y": 48,
      "extra_data": {
        "JUGADOR": "Matera",
        "INFRACCION": "RUCK ATTACK",
        "EQUIPO": "PESCARA"
      }
    },
    # ... 577 eventos más
  ],
  "event_types": [
    "KICK OFF", "ATTACK", "SHORT-MATCH", "TURNOVER+", "END",
    "SCRUM", "PENALTY", "TACKLE", "TURNOVER-", "LINEOUT", ...
  ],
  "labels_without_group": ["T1D", "T2B", "T1A"]
}
```

### Paso 3: Frontend muestra Preview

**Metadata Editable**:
```
Equipo: [Pescara]  # Usuario completa
Rival: [Avezzano]
Fecha: [2025-10-19]
Ubicación: [Estadio Adriático]
Competición: [Serie A]
Video URL: [https://youtube.com/watch?v=...]
```

**Categorías (30 detectadas)**:
```
☑ ATTACK (145 eventos)
☑ TACKLE (89 eventos)
☑ PENALTY (23 eventos)
☐ WARMUP (3 eventos)        ← Descartado por defecto
☐ END (2 eventos)            ← Descartado por defecto
☑ SCRUM (18 eventos)
...
```

**Tiempos** (si es perfil manual):
```
Período 1:
  - Inicio: [0] segundos
  - Fin: [2400] segundos (40:00)
  
Período 2:
  - Inicio: [2700] segundos (45:00)
  - Fin: [4800] segundos (80:00)
```

### Paso 4: Usuario confirma → Backend enriquece

```python
# enricher.py
enriched = enrich_events(
    events=filtered_events,  # Sin WARMUP ni END
    match_info={
        "team": "Pescara",
        "opponent": "Avezzano",
        "date": "2025-10-19",
        "manual_period_times": None  # Automático
    },
    profile=profile
)

# Resultado enriquecido:
[
  {
    "event_type": "PENALTY",
    "timestamp_sec": 105.8,
    "period": 1,              # ← NUEVO
    "game_time": "01:45",     # ← NUEVO (calculado desde KICK OFF)
    "time_group": "Primer cuarto",  # ← NUEVO
    "x": 18, "y": 48,
    "extra_data": { ... }
  },
  ...
]
```

### Paso 5: Inserción en PostgreSQL

```sql
-- 1. Club
INSERT INTO clubs (name) VALUES ('Pescara') RETURNING id;  -- id=1

-- 2. Team
INSERT INTO teams (club_id, name, category, season)
VALUES (1, 'Pescara', 'Senior', '2024-25') RETURNING id;  -- id=1

-- 3. Match
INSERT INTO matches (team_id, opponent_name, date, video_url, ...)
VALUES (1, 'Avezzano', '2025-10-19', 'https://...', ...) RETURNING id;  -- id=1

-- 4. Events (577 eventos)
INSERT INTO events (match_id, event_type, timestamp, game_time, period, x, y, team, extra_data)
VALUES
  (1, 'PENALTY', 105.8, '01:45', 1, 18, 48, 'PESCARA', '{"JUGADOR": "Matera", ...}'),
  (1, 'TACKLE', 165.0, '02:45', 1, NULL, NULL, 'PESCARA', '{"JUGADOR": "Tucu", ...}'),
  ...
```

---

## 📝 TODO: Mejoras Pendientes

### 1. Sistema de Perfiles Persistente

**Estado actual**: Perfiles hardcodeados en código
**Mejora**: Base de datos

```sql
CREATE TABLE import_profiles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  file_types TEXT[],
  settings JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Endpoints**:
- `GET /api/import/profiles` → Lista todos
- `POST /api/import/profiles` → Crear nuevo
- `PUT /api/import/profiles/:id` → Editar
- `DELETE /api/import/profiles/:id` → Eliminar

### 2. Gestión de Labels Sin Group

**Problema**: El XML tiene labels como "T1D", "T2B" sin contexto

**Solución Propuesta**:
```tsx
// PreviewImport.tsx
<Card title="Labels Sin Grupo (3 detectados)">
  {labelsWithoutGroup.map(label => (
    <div>
      <span>{label}</span>
      <select>
        <option>Zona del Campo</option>
        <option>Fase del Juego</option>
        <option>Descriptor Custom</option>
        <option>Ignorar</option>
      </select>
      <Input placeholder="Valor interpretado" />
    </div>
  ))}
</Card>
```

### 3. Validación de Tiempos

**Problema**: Si los tiempos manuales están mal, los cálculos fallan

**Solución**:
```tsx
const validateManualTimes = (times) => {
  if (times.end_1 <= times.kick_off_1) {
    return { valid: false, error: "Fin P1 debe ser mayor a Inicio P1" };
  }
  if (times.kick_off_2 <= times.end_1) {
    return { valid: false, error: "Inicio P2 debe ser mayor a Fin P1" };
  }
  // ... más validaciones
  return { valid: true };
};
```

### 4. Importación Incremental

**Objetivo**: Importar múltiples archivos al mismo partido

**Caso de uso**: Video principal + datos GPS separados

```tsx
<Card title="Importación Incremental">
  <Select label="Partido Existente">
    <option>Pescara vs Avezzano (2025-10-19)</option>
  </Select>
  <Checkbox>Merge eventos (no duplicar)</Checkbox>
  <Checkbox>Agregar datos GPS</Checkbox>
</Card>
```

### 5. Preview Avanzado con Estadísticas

**Antes de confirmar**, mostrar:
- Total de eventos por categoría
- Distribución por período
- Top 5 jugadores más mencionados
- Mapa de calor preliminar

```tsx
<Card title="Resumen de Importación">
  <Stat label="Total Eventos" value={577} />
  <Stat label="Período 1" value={302} />
  <Stat label="Período 2" value={275} />
  
  <ChartPreview 
    data={previewData.events} 
    type="heatmap" 
  />
</Card>
```

### 6. Detección Automática de Perfil

**Objetivo**: Detectar el perfil correcto basándose en la estructura del archivo

```python
def detect_profile(filepath):
    """
    Analiza la estructura del archivo y sugiere el perfil más apropiado
    """
    if filepath.endswith('.xml'):
        # Parsear y buscar tags característicos
        if has_tag('instance') and has_tag('code'):
            return 'Importacion XML'
        elif has_tag('play') and has_tag('action'):
            return 'Sportscode XML'
    
    elif filepath.endswith('.xlsx'):
        sheets = get_sheet_names(filepath)
        if 'MATRIZ' in sheets and 'MATCHES' in sheets:
            return 'San Benedetto Excel'
```

### 7. Enriquecimiento Avanzado (enricher.py)

**Métricas Derivadas**:

```python
def calculate_advanced_metrics(events):
    """
    Calcula métricas no explícitas en los datos:
    - Tackles efectivos (si siguiente evento es TURNOVER+)
    - Pases completos (ATTACK sin TURNOVER inmediato)
    - Posesión efectiva (tiempo entre recuperación y pérdida)
    - Zona de inicio/fin de jugadas
    """
    
    for i, event in enumerate(events):
        if event['event_type'] == 'TACKLE':
            next_event = events[i+1] if i+1 < len(events) else None
            if next_event and next_event['event_type'] == 'TURNOVER+':
                event['extra_data']['tackle_effectiveness'] = 'successful'
```

### 8. Testing Automatizado

**Casos de prueba**:

```python
# tests/test_normalizer.py
def test_xml_normalization():
    result = normalize_xml_to_json('test_files/sample.xml', default_profile)
    assert len(result['events']) > 0
    assert 'PENALTY' in result['event_types']
    assert result['match']['team'] is not None

def test_period_detection():
    events = [
        {'event_type': 'KICK OFF', 'timestamp_sec': 0},
        {'event_type': 'ATTACK', 'timestamp_sec': 120},
        {'event_type': 'END', 'timestamp_sec': 2400},
        {'event_type': 'KICK OFF', 'timestamp_sec': 2700}
    ]
    offsets = detect_periods_and_convert_times(events, {})
    assert offsets[1]['start_offset'] == 0
    assert offsets[2]['start_offset'] >= 2700
```

---

## 🎓 Conceptos Clave

### Game_Time vs Timestamp

- **Timestamp**: Tiempo absoluto del video (en segundos desde el inicio del archivo)
  - Ejemplo: `timestamp_sec: 2750.5` → 45 minutos y 50.5 segundos del video
  
- **Game_Time**: Tiempo relativo del juego (MM:SS desde el inicio del período)
  - Ejemplo: `game_time: "00:50"` → 50 segundos del segundo tiempo

**Conversión**:
```python
# Si timestamp = 2750s y Period 2 empezó en 2700s:
game_time = timestamp - period_start_offset
game_time = 2750 - 2700 = 50 segundos = "00:50"
```

### Períodos

- **Period 1**: Primer tiempo (generalmente 0 - 40 min de juego)
- **Period 2**: Segundo tiempo (generalmente 40 - 80 min de juego)

**Detección Automática**:
1. Buscar eventos "KICK OFF" y "END"
2. Primer KICK OFF → Inicio P1
3. Primer END → Fin P1
4. Segundo KICK OFF → Inicio P2
5. Segundo END → Fin P2

**Detección Manual**:
Usuario ingresa los tiempos exactos en segundos del video

### Grupos Temporales

División del partido en cuartos para análisis detallado:

```python
# Ejemplo: Partido de 80 min (2 períodos de 40 min)
time_groups = {
    "Primer cuarto": (0, 20),      # P1: 00:00 - 20:00
    "Segundo cuarto": (20, 40),    # P1: 20:00 - 40:00
    "Tercer cuarto": (40, 60),     # P2: 00:00 - 20:00
    "Cuarto cuarto": (60, 80)      # P2: 20:00 - 40:00
}
```

---

## 🚀 Resumen de Archivos Clave

| Archivo | Responsabilidad | Estado |
|---------|----------------|--------|
| `frontend/src/pages/ImportMatch.tsx` | UI para subir archivo y seleccionar perfil | ✅ Completo |
| `frontend/src/pages/PreviewImport.tsx` | Preview, filtrado y confirmación | ✅ Completo |
| `backend/normalizer.py` | Parseo y normalización de formatos | ✅ Completo |
| `backend/enricher.py` | Cálculo de períodos y Game_Time | ⚠️ Parcial (necesita refactor) |
| `backend/importer.py` | Inserción en PostgreSQL | ✅ Completo |
| `backend/routes/import_routes.py` | Endpoints de importación | ⏳ Pendiente refactor |
| `backend/models.py` | Modelos SQLAlchemy | ✅ Completo |

---

## 📌 Decisiones de Diseño Importantes

### 1. ¿Por qué Preview + Confirmación?

**Ventajas**:
- Usuario ve exactamente qué se va a importar
- Puede descartar categorías irrelevantes (WARMUP, TIMEOUT)
- Reduce errores y evita imports incorrectos
- Permite completar metadata del partido

### 2. ¿Por qué Perfiles Configurables?

**Razón**: Cada herramienta de análisis (LongoMatch, Sportscode, Nacsport) genera formatos diferentes

**Beneficio**: Un solo codebase soporta todos los formatos mediante configuración

### 3. ¿Por qué Separar Normalizer y Enricher?

**Normalizer**: 
- Solo parsea y estructura
- Sin lógica de negocio compleja
- Fácil de testear

**Enricher**:
- Cálculos complejos (períodos, tiempos, métricas)
- Puede ejecutarse después de preview
- Reutilizable para re-enriquecimiento

### 4. ¿Por qué JSONB en extra_data?

**Flexibilidad**: Cada formato tiene descriptores únicos (INFRACCION, TIPO-PERDIDA, etc.)

**Alternativa** (rechazada): Crear columnas específicas para cada descriptor
- ❌ Rígido
- ❌ Require migraciones constantes
- ❌ No escala

**Solución actual**:
```sql
extra_data JSONB  -- Permite consultas: WHERE extra_data->>'JUGADOR' = 'Matera'
```

---

## 🎯 Próximos Pasos Recomendados

### Corto Plazo (MVP funcional)

1. ✅ **Perfiles en Base de Datos**: Tabla `import_profiles` + CRUD completo
2. ✅ **Refactor de enricher.py**: Implementar lógica robusta de períodos
3. ✅ **Tiempos Manuales en UI**: Input fields en PreviewImport para profiles manuales
4. ✅ **Testing**: Unit tests para normalizer y enricher

### Mediano Plazo (UX mejorada)

5. ⏳ **Gestión de Labels Sin Group**: UI para mapear labels no estructurados
6. ⏳ **Preview Avanzado**: Estadísticas y gráficos pre-import
7. ⏳ **Validaciones**: Tiempos consistentes, metadata requerida

### Largo Plazo (Features avanzadas)

8. ⏸️ **Detección Automática de Perfil**: ML para sugerir perfil correcto
9. ⏸️ **Importación Incremental**: Agregar datos GPS a partidos existentes
10. ⏸️ **Enriquecimiento Avanzado**: Métricas derivadas (tackles efectivos, etc.)

---

## 📚 Recursos y Referencias

- **LongoMatch XML Schema**: https://longomatch.com/documentation
- **SQLAlchemy JSONB**: https://docs.sqlalchemy.org/en/20/core/type_basics.html#sqlalchemy.types.JSON
- **React Router State**: https://reactrouter.com/en/main/hooks/use-location
- **PostgreSQL JSONB**: https://www.postgresql.org/docs/current/datatype-json.html

---

## 🤝 Contribución

Este documento es un **living document**. Actualizar cuando:
- Se implemente una mejora de TODO
- Se agregue un nuevo tipo de perfil
- Se detecte un edge case en importación
- Se refactorice código relevante

---

**Última actualización**: 28 de octubre de 2025
**Autor**: Análisis conjunto con Copilot
**Versión**: 1.0
