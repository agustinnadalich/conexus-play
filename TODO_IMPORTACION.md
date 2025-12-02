# TODO - Roadmap de Importación MVP

**Última actualización**: 28 de octubre de 2025  
**Branch**: `base_de_datos`  
**Estado**: En desarrollo activo

---

## 🎯 Objetivo Principal

Implementar un sistema de importación **robusto, flexible y user-friendly** que permita importar datos desde múltiples fuentes (XML, Excel, JSON) con preview completo y enriquecimiento automático.

---

## 📊 Estado Actual

### ✅ Completado

- [x] **Frontend - ImportMatch.tsx**: UI para selección de archivo y perfil
- [x] **Frontend - PreviewImport.tsx**: Preview con filtrado de categorías
- [x] **Backend - normalizer.py**: Parseo de XML y Excel
- [x] **Backend - importer.py**: Inserción en PostgreSQL
- [x] **Backend - models.py**: Esquema relacional completo
- [x] **Docker Setup**: Configuración completa con PostgreSQL

### ⚠️ Parcialmente Completo

- [x] **Backend - enricher.py**: Lógica básica implementada, necesita refactor
- [x] **Perfiles de Importación**: Hardcodeados, necesitan persistencia en BD
- [x] **Detección de Períodos**: Funciona pero necesita validación

### ❌ Pendiente

- [ ] **Gestión de Perfiles**: CRUD completo con UI
- [ ] **Tiempos Manuales**: UI completa en PreviewImport
- [ ] **Labels Sin Group**: Sistema de mapeo manual
- [ ] **Validaciones**: Consistencia de tiempos y datos
- [ ] **Testing**: Unit tests comprehensivos
- [ ] **Documentación API**: Swagger/OpenAPI

---

## 🚀 Sprint 1: Fundamentos Robustos (Prioridad Alta)

**Objetivo**: Sistema básico funcionando end-to-end sin errores

### 1.1 Refactor de enricher.py

**Estado**: ⚠️ Código legacy con duplicación  
**Prioridad**: 🔴 CRÍTICA  
**Estimación**: 4-6 horas

**Tareas**:
- [ ] Eliminar lógica duplicada de cálculo de períodos
- [ ] Implementar `calculate_game_time_from_zero()` robusto
- [ ] Separar detección automática vs manual de períodos
- [ ] Agregar logs detallados para debugging
- [ ] Testing con casos edge (partido sin END, período irregular)

**Archivos**:
- `backend/enricher.py` (reescribir funciones principales)
- `backend/normalizer.py` (verificar que no calcule períodos)

**Criterios de Aceptación**:
```python
# Test 1: Detección automática
events = [
    {"event_type": "KICK OFF", "timestamp_sec": 0},
    {"event_type": "ATTACK", "timestamp_sec": 120},
    {"event_type": "END", "timestamp_sec": 2400},
    {"event_type": "KICK OFF", "timestamp_sec": 2700},
    {"event_type": "TACKLE", "timestamp_sec": 3000}
]
result = enrich_events(events, {}, {})
assert result[1]["period"] == 1
assert result[1]["game_time"] == "02:00"
assert result[4]["period"] == 2
assert result[4]["game_time"] == "05:00"

# Test 2: Tiempos manuales
manual = {
    "manual_period_times": {
        "kick_off_1": 0,
        "end_1": 2400,
        "kick_off_2": 2700,
        "end_2": 5100
    }
}
result = enrich_events(events, manual, {})
# Mismas aserciones
```

---

### 1.2 Perfiles en Base de Datos

**Estado**: ❌ Actualmente hardcodeados en código  
**Prioridad**: 🔴 CRÍTICA  
**Estimación**: 6-8 horas

**Tareas**:

#### Backend
- [ ] Crear tabla `import_profiles` en PostgreSQL
- [ ] Modelo SQLAlchemy `ImportProfile`
- [ ] Endpoints CRUD:
  - `GET /api/import/profiles` (lista)
  - `GET /api/import/profiles/:id` (detalle)
  - `POST /api/import/profiles` (crear)
  - `PUT /api/import/profiles/:id` (editar)
  - `DELETE /api/import/profiles/:id` (eliminar)
- [ ] Migración para insertar perfiles por defecto
- [ ] Validación de schemas JSONB

#### Frontend
- [ ] Página `ManageProfiles.tsx` (CRUD completo)
- [ ] Formulario con editor JSON para `settings`
- [ ] Validación de estructura antes de guardar
- [ ] Importar/exportar perfiles como JSON

**Esquema de BD**:
```sql
CREATE TABLE import_profiles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    file_types TEXT[] NOT NULL,  -- ['xml', 'xlsx']
    settings JSONB NOT NULL,     -- Configuración flexible
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índice para búsquedas por tipo de archivo
CREATE INDEX idx_profiles_file_types ON import_profiles USING GIN (file_types);

-- Insertar perfiles por defecto
INSERT INTO import_profiles (name, description, file_types, settings, is_default) VALUES
('Importacion XML', 'Perfil para LongoMatch/Nacsport XML', ARRAY['xml'], 
 '{"time_mapping": {"method": "automatic"}, "discard_categories": ["WARMUP"]}'::jsonb, true),
 
('San Benedetto Excel', 'Matriz de eventos San Benedetto', ARRAY['xlsx', 'xls'],
 '{"sheets": {"events": "MATRIZ", "match_info": "MATCHES"}}'::jsonb, false);
```

**Modelo SQLAlchemy**:
```python
# backend/models.py
class ImportProfile(Base):
    __tablename__ = "import_profiles"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    file_types = Column(ARRAY(String))
    settings = Column(JSONB, nullable=False)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**Criterios de Aceptación**:
- [ ] GET /api/import/profiles devuelve lista completa
- [ ] POST crea nuevo perfil y valida estructura JSON
- [ ] PUT actualiza perfil existente
- [ ] DELETE elimina perfil (solo si no está en uso)
- [ ] Frontend muestra lista y permite editar

---

### 1.3 UI para Tiempos Manuales

**Estado**: ❌ No implementado  
**Prioridad**: 🟡 ALTA  
**Estimación**: 3-4 horas

**Tareas**:
- [ ] Detectar si perfil requiere tiempos manuales
- [ ] Renderizar inputs en `PreviewImport.tsx`
- [ ] Validación en tiempo real (end > start, etc.)
- [ ] Mensajes de ayuda y tooltips
- [ ] Guardar en `match_info.manual_period_times`

**UI Propuesta**:
```tsx
{isManualProfile && (
  <Card className="mb-4">
    <CardContent className="pt-6">
      <h3 className="text-lg font-semibold mb-4">
        ⏱️ Configuración de Tiempos (Manual)
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Este perfil requiere especificar manualmente los tiempos de inicio y fin 
        de cada período. Usa el video para identificar los timestamps exactos.
      </p>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Período 1 */}
        <div>
          <Label>Período 1 - Inicio (segundos)</Label>
          <Input 
            type="number" 
            min="0"
            value={manualTimes.kick_off_1}
            onChange={(e) => handleManualTimeChange('kick_off_1', e.target.value)}
          />
          {errors.kick_off_1 && (
            <p className="text-red-500 text-sm mt-1">{errors.kick_off_1}</p>
          )}
        </div>
        <div>
          <Label>Período 1 - Fin (segundos)</Label>
          <Input 
            type="number"
            min={manualTimes.kick_off_1}
            value={manualTimes.end_1}
            onChange={(e) => handleManualTimeChange('end_1', e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">
            Duración: {formatDuration(manualTimes.end_1 - manualTimes.kick_off_1)}
          </p>
        </div>
        
        {/* Período 2 */}
        <div>
          <Label>Período 2 - Inicio (segundos)</Label>
          <Input 
            type="number"
            min={manualTimes.end_1}
            value={manualTimes.kick_off_2}
            onChange={(e) => handleManualTimeChange('kick_off_2', e.target.value)}
          />
        </div>
        <div>
          <Label>Período 2 - Fin (segundos)</Label>
          <Input 
            type="number"
            min={manualTimes.kick_off_2}
            value={manualTimes.end_2}
            onChange={(e) => handleManualTimeChange('end_2', e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">
            Duración: {formatDuration(manualTimes.end_2 - manualTimes.kick_off_2)}
          </p>
        </div>
      </div>
      
      {/* Validación global */}
      {timeValidationErrors.length > 0 && (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Errores de Validación</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {timeValidationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </CardContent>
  </Card>
)}
```

**Validaciones**:
```tsx
const validateManualTimes = (times) => {
  const errors = [];
  
  if (times.end_1 <= times.kick_off_1) {
    errors.push("Fin de P1 debe ser mayor que Inicio de P1");
  }
  
  if (times.kick_off_2 <= times.end_1) {
    errors.push("Inicio de P2 debe ser posterior a Fin de P1");
  }
  
  if (times.end_2 <= times.kick_off_2) {
    errors.push("Fin de P2 debe ser mayor que Inicio de P2");
  }
  
  const p1_duration = times.end_1 - times.kick_off_1;
  const p2_duration = times.end_2 - times.kick_off_2;
  
  if (p1_duration < 600) {  // 10 min
    errors.push("⚠️ Período 1 parece demasiado corto (< 10 min)");
  }
  
  if (p2_duration < 600) {
    errors.push("⚠️ Período 2 parece demasiado corto (< 10 min)");
  }
  
  if (Math.abs(p1_duration - p2_duration) > 600) {  // 10 min diferencia
    errors.push("⚠️ Los períodos tienen duraciones muy diferentes");
  }
  
  return errors;
};
```

**Criterios de Aceptación**:
- [ ] UI se renderiza solo si `profile.settings.time_mapping.method === 'manual'`
- [ ] Validaciones en tiempo real funcionan
- [ ] Datos se envían correctamente en `handleConfirm()`
- [ ] Backend recibe y usa `manual_period_times` correctamente

---

## 🔧 Sprint 2: UX y Validaciones (Prioridad Media)

**Objetivo**: Mejorar experiencia de usuario y prevenir errores

### 2.1 Gestión de Labels Sin Group

**Estado**: ❌ Se guardan en `extra_data['MISC']` sin interpretación  
**Prioridad**: 🟡 MEDIA  
**Estimación**: 4-5 horas

**Problema**: El XML tiene labels como "T1D", "T2B" sin contexto claro

**Solución Propuesta**:

```tsx
// PreviewImport.tsx - Nueva sección
<Card className="mb-4">
  <CardContent className="pt-6">
    <h3 className="text-lg font-semibold mb-4">
      🏷️ Labels Sin Grupo ({labelsWithoutGroup.length} detectados)
    </h3>
    <p className="text-sm text-gray-600 mb-4">
      Se detectaron labels sin categoría definida. Especifica cómo interpretarlos:
    </p>
    
    {labelsWithoutGroup.map((label, idx) => (
      <div key={idx} className="border p-3 rounded mb-3">
        <div className="flex items-center gap-3 mb-2">
          <Badge>{label}</Badge>
          <Select 
            value={labelMappings[label]?.type || ''}
            onChange={(e) => handleLabelTypeChange(label, e.target.value)}
          >
            <option value="">Seleccionar tipo...</option>
            <option value="zone">Zona del Campo</option>
            <option value="phase">Fase de Juego</option>
            <option value="custom">Descriptor Custom</option>
            <option value="ignore">Ignorar</option>
          </Select>
        </div>
        
        {labelMappings[label]?.type && labelMappings[label]?.type !== 'ignore' && (
          <div>
            <Label>Valor Interpretado</Label>
            <Input 
              placeholder={`Ej: ${getSuggestion(label, labelMappings[label]?.type)}`}
              value={labelMappings[label]?.value || ''}
              onChange={(e) => handleLabelValueChange(label, e.target.value)}
            />
          </div>
        )}
      </div>
    ))}
    
    <Button 
      variant="outline" 
      onClick={applyLabelMappings}
      disabled={!allLabelsMapped}
    >
      Aplicar Mapeos
    </Button>
  </CardContent>
</Card>
```

**Backend - Aplicar Mapeos**:
```python
# En save_match endpoint
label_mappings = request_data.get('label_mappings', {})

for event in events:
    extra_data = event.get('extra_data', {})
    if 'MISC' in extra_data:
        misc_value = extra_data.pop('MISC')
        if misc_value in label_mappings:
            mapping = label_mappings[misc_value]
            if mapping['type'] != 'ignore':
                extra_data[mapping['type']] = mapping['value']
    event['extra_data'] = extra_data
```

**Criterios de Aceptación**:
- [ ] Labels sin group se muestran en UI
- [ ] Usuario puede mapear cada label
- [ ] Sugerencias contextuales funcionan
- [ ] Mapeos se aplican correctamente antes de guardar

---

### 2.2 Preview Estadístico

**Estado**: ❌ Solo muestra lista de categorías  
**Prioridad**: 🟡 MEDIA  
**Estimación**: 3-4 horas

**Objetivo**: Mostrar resumen estadístico antes de confirmar

**UI Propuesta**:
```tsx
<Card className="mb-4">
  <CardContent className="pt-6">
    <h3 className="text-lg font-semibold mb-4">📊 Resumen de Importación</h3>
    
    <div className="grid grid-cols-3 gap-4 mb-4">
      <Stat 
        label="Total Eventos" 
        value={eventsToImport.length}
        icon={<FileText />}
      />
      <Stat 
        label="Período 1" 
        value={period1Count}
        icon={<Clock />}
      />
      <Stat 
        label="Período 2" 
        value={period2Count}
        icon={<Clock />}
      />
    </div>
    
    <Tabs defaultValue="categories">
      <TabsList>
        <TabsTrigger value="categories">Por Categoría</TabsTrigger>
        <TabsTrigger value="players">Por Jugador</TabsTrigger>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
      </TabsList>
      
      <TabsContent value="categories">
        <BarChart 
          data={categoryDistribution}
          xAxis="category"
          yAxis="count"
        />
      </TabsContent>
      
      <TabsContent value="players">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jugador</TableHead>
              <TableHead>Eventos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topPlayers.map(player => (
              <TableRow key={player.name}>
                <TableCell>{player.name}</TableCell>
                <TableCell>{player.count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TabsContent>
      
      <TabsContent value="timeline">
        <LineChart 
          data={timelineData}
          xAxis="time"
          yAxis="events"
        />
      </TabsContent>
    </Tabs>
  </CardContent>
</Card>
```

**Criterios de Aceptación**:
- [ ] Estadísticas se calculan correctamente
- [ ] Gráficos se renderizan sin errores
- [ ] Timeline muestra distribución temporal

---

### 2.3 Validaciones Comprehensivas

**Estado**: ❌ Validación mínima  
**Prioridad**: 🟡 MEDIA  
**Estimación**: 4-5 horas

**Tareas**:
- [ ] Validar metadata obligatoria (team, opponent, date)
- [ ] Validar formato de fecha
- [ ] Validar URL de video (opcional pero si existe debe ser válida)
- [ ] Validar coordenadas (x, y dentro de rango 0-100)
- [ ] Validar tiempos (no negativos, orden correcto)
- [ ] Validar que haya al menos 1 evento para importar

**Frontend**:
```tsx
const validateMatchInfo = (info) => {
  const errors = {};
  
  if (!info.team || info.team.trim() === '') {
    errors.team = "El nombre del equipo es obligatorio";
  }
  
  if (!info.opponent_name || info.opponent_name.trim() === '') {
    errors.opponent = "El nombre del rival es obligatorio";
  }
  
  if (!info.date) {
    errors.date = "La fecha es obligatoria";
  } else if (new Date(info.date) > new Date()) {
    errors.date = "La fecha no puede ser futura";
  }
  
  if (info.video_url && !isValidUrl(info.video_url)) {
    errors.video_url = "URL de video inválida";
  }
  
  return Object.keys(errors).length === 0 ? null : errors;
};

const validateEvents = (events) => {
  const errors = [];
  
  events.forEach((event, idx) => {
    if (event.x !== null && (event.x < 0 || event.x > 100)) {
      errors.push(`Evento ${idx}: coordenada X fuera de rango`);
    }
    if (event.y !== null && (event.y < 0 || event.y > 100)) {
      errors.push(`Evento ${idx}: coordenada Y fuera de rango`);
    }
    if (event.timestamp_sec < 0) {
      errors.push(`Evento ${idx}: timestamp negativo`);
    }
  });
  
  return errors;
};
```

**Backend**:
```python
# backend/routes/matches.py
@matches_bp.route('/save_match', methods=['POST'])
def save_match():
    data = request.get_json()
    
    # Validación de metadata
    match_info = data.get('match', {})
    required_fields = ['team', 'opponent_name', 'date']
    
    for field in required_fields:
        if not match_info.get(field):
            return jsonify({"error": f"Campo requerido: {field}"}), 400
    
    # Validación de eventos
    events = data.get('events', [])
    if len(events) == 0:
        return jsonify({"error": "Debe haber al menos 1 evento"}), 400
    
    # Validación de coordenadas
    for i, event in enumerate(events):
        if event.get('x') is not None:
            if not (0 <= event['x'] <= 100):
                return jsonify({"error": f"Evento {i}: X fuera de rango"}), 400
        if event.get('y') is not None:
            if not (0 <= event['y'] <= 100):
                return jsonify({"error": f"Evento {i}: Y fuera de rango"}), 400
    
    # Continuar con el guardado...
```

**Criterios de Aceptación**:
- [ ] No se puede confirmar sin campos obligatorios
- [ ] Errores se muestran claramente al usuario
- [ ] Backend rechaza requests inválidos con mensajes claros

---

## 🧪 Sprint 3: Testing y Calidad (Prioridad Media)

**Objetivo**: Garantizar estabilidad y prevenir regresiones

### 3.1 Unit Tests - Backend

**Estado**: ❌ No hay tests  
**Prioridad**: 🟠 MEDIA  
**Estimación**: 6-8 horas

**Tareas**:
- [ ] Setup de pytest
- [ ] Tests para normalizer.py
- [ ] Tests para enricher.py
- [ ] Tests para importer.py
- [ ] Tests para endpoints

**Estructura**:
```
backend/
  tests/
    __init__.py
    conftest.py                    # Fixtures compartidos
    test_normalizer.py
    test_enricher.py
    test_importer.py
    test_api_import.py
    fixtures/
      sample.xml
      sample.xlsx
      sample_profile.json
```

**Ejemplos**:
```python
# tests/test_normalizer.py
import pytest
from normalizer import normalize_xml_to_json, normalize_excel_to_json

def test_normalize_xml_basic():
    result = normalize_xml_to_json(
        'tests/fixtures/sample.xml',
        {'name': 'Test', 'settings': {}}
    )
    assert 'events' in result
    assert 'match' in result
    assert len(result['events']) > 0

def test_normalize_xml_with_coordinates():
    result = normalize_xml_to_json('tests/fixtures/sample_with_coords.xml', {})
    events_with_coords = [e for e in result['events'] if e['x'] is not None]
    assert len(events_with_coords) > 0

def test_normalize_excel_matriz():
    result = normalize_excel_to_json(
        'tests/fixtures/sample_matriz.xlsx',
        {
            'settings': {
                'sheets': {'events': 'MATRIZ', 'match_info': 'MATCHES'},
                'columns': {'event_type': 'CATEGORY', 'time': 'TIME'}
            }
        }
    )
    assert result['match']['team'] != ''
    assert len(result['events']) > 0

# tests/test_enricher.py
from enricher import enrich_events, calculate_game_time_from_zero

def test_enrich_with_automatic_periods():
    events = [
        {'event_type': 'KICK OFF', 'timestamp_sec': 0},
        {'event_type': 'ATTACK', 'timestamp_sec': 120},
        {'event_type': 'END', 'timestamp_sec': 2400},
        {'event_type': 'KICK OFF', 'timestamp_sec': 2700},
        {'event_type': 'TACKLE', 'timestamp_sec': 3000}
    ]
    
    enriched = enrich_events(events, {}, {})
    
    assert enriched[1]['period'] == 1
    assert enriched[1]['game_time'] == '02:00'
    assert enriched[4]['period'] == 2
    assert enriched[4]['game_time'] == '05:00'

def test_enrich_with_manual_times():
    events = [
        {'event_type': 'ATTACK', 'timestamp_sec': 500},
        {'event_type': 'TACKLE', 'timestamp_sec': 3200}
    ]
    
    match_info = {
        'manual_period_times': {
            'kick_off_1': 0,
            'end_1': 2400,
            'kick_off_2': 2700,
            'end_2': 5100
        }
    }
    
    enriched = enrich_events(events, match_info, {})
    
    assert enriched[0]['period'] == 1
    assert enriched[1]['period'] == 2

# tests/test_api_import.py
def test_preview_endpoint(client):
    # client es fixture de pytest-flask
    with open('tests/fixtures/sample.xml', 'rb') as f:
        response = client.post(
            '/api/import/preview?profile=Test',
            data={'file': f},
            content_type='multipart/form-data'
        )
    
    assert response.status_code == 200
    data = response.get_json()
    assert 'events' in data
    assert 'event_types' in data
```

**Criterios de Aceptación**:
- [ ] Coverage > 80% en normalizer, enricher, importer
- [ ] Tests pasan en CI/CD
- [ ] No regresiones en funcionalidad existente

---

### 3.2 Integration Tests

**Estado**: ❌ No hay tests  
**Prioridad**: 🟠 MEDIA  
**Estimación**: 4-5 horas

**Tareas**:
- [ ] Test completo de flujo: upload → preview → save
- [ ] Test con base de datos real (Docker testcontainers)
- [ ] Test de rollback en caso de error

**Ejemplo**:
```python
# tests/test_integration.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

@pytest.fixture(scope='function')
def test_db():
    # Crear DB temporal para tests
    engine = create_engine('postgresql://test:test@localhost/test_videoanalysis')
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    yield session
    
    session.close()
    Base.metadata.drop_all(engine)

def test_full_import_flow(client, test_db):
    # 1. Upload file
    with open('tests/fixtures/full_match.xml', 'rb') as f:
        preview_response = client.post(
            '/api/import/preview?profile=Importacion XML',
            data={'file': f},
            content_type='multipart/form-data'
        )
    
    assert preview_response.status_code == 200
    preview_data = preview_response.get_json()
    
    # 2. Save match
    save_response = client.post(
        '/api/save_match',
        json={
            'match': {
                'team': 'Test Team',
                'opponent_name': 'Test Opponent',
                'date': '2025-01-01'
            },
            'events': preview_data['events'][:10],  # Subset
            'profile': 'Importacion XML'
        }
    )
    
    assert save_response.status_code == 200
    
    # 3. Verify in DB
    from models import Match, Event
    match = test_db.query(Match).first()
    assert match is not None
    assert match.opponent_name == 'Test Opponent'
    
    events = test_db.query(Event).filter_by(match_id=match.id).all()
    assert len(events) == 10
```

---

## 📚 Sprint 4: Features Avanzados (Prioridad Baja)

**Objetivo**: Funcionalidades que mejoran el producto pero no son bloqueantes

### 4.1 Detección Automática de Perfil

**Estado**: ❌ Usuario debe seleccionar manualmente  
**Prioridad**: 🟢 BAJA  
**Estimación**: 6-8 horas

**Objetivo**: Sugerir automáticamente el perfil correcto basándose en la estructura del archivo

**Implementación**:
```python
# backend/profile_detector.py
def detect_profile_from_file(filepath):
    """
    Analiza estructura del archivo y sugiere perfil apropiado
    """
    if filepath.endswith('.xml'):
        tree = ET.parse(filepath)
        root = tree.getroot()
        
        # LongoMatch/Nacsport: <ALL_INSTANCES> + <instance> + <code>
        if root.find('.//instance') is not None:
            if root.find('.//instance/code') is not None:
                return 'Importacion XML'
        
        # Sportscode: <plays> + <play> + <action>
        if root.tag == 'plays':
            return 'Sportscode XML'
    
    elif filepath.endswith(('.xlsx', '.xls')):
        sheets = pd.ExcelFile(filepath).sheet_names
        
        # San Benedetto: MATRIZ + MATCHES
        if 'MATRIZ' in sheets and 'MATCHES' in sheets:
            return 'San Benedetto Excel'
        
        # Genérico: buscar columnas comunes
        df = pd.read_excel(filepath, sheet_name=sheets[0])
        cols = [c.upper() for c in df.columns]
        
        if 'CATEGORY' in cols and 'TIME' in cols:
            return 'Generic Excel'
    
    return None

# Endpoint
@import_bp.route('/import/detect-profile', methods=['POST'])
def detect_profile():
    file = request.files.get('file')
    temp_path = save_temp_file(file)
    
    suggested = detect_profile_from_file(temp_path)
    
    return jsonify({
        'suggested_profile': suggested,
        'confidence': 'high' if suggested else 'low'
    })
```

**Frontend**:
```tsx
const handleFileChange = async (e) => {
  const file = e.target.files[0];
  setFile(file);
  
  // Detectar perfil automáticamente
  const formData = new FormData();
  formData.append('file', file);
  
  const res = await fetch('http://localhost:5001/api/import/detect-profile', {
    method: 'POST',
    body: formData
  });
  
  const { suggested_profile } = await res.json();
  
  if (suggested_profile) {
    setSelectedProfile(suggested_profile);
    toast.success(`Perfil detectado: ${suggested_profile}`);
  }
};
```

---

### 4.2 Importación Incremental

**Estado**: ❌ No soportado  
**Prioridad**: 🟢 BAJA  
**Estimación**: 8-10 horas

**Caso de Uso**: Importar datos GPS a un partido existente

**Endpoint**:
```python
@import_bp.route('/import/incremental', methods=['POST'])
def import_incremental():
    """
    Agrega eventos a un partido existente
    """
    data = request.get_json()
    match_id = data.get('match_id')
    new_events = data.get('events', [])
    merge_strategy = data.get('merge_strategy', 'append')  # append | merge | replace
    
    db = SessionLocal()
    try:
        match = db.query(Match).filter_by(id=match_id).first()
        if not match:
            return jsonify({"error": "Partido no encontrado"}), 404
        
        if merge_strategy == 'append':
            # Agregar todos los eventos
            for event_data in new_events:
                event = Event(**event_data, match_id=match_id)
                db.add(event)
        
        elif merge_strategy == 'merge':
            # Merge por timestamp (actualizar si existe, crear si no)
            existing = db.query(Event).filter_by(match_id=match_id).all()
            existing_dict = {e.timestamp: e for e in existing}
            
            for event_data in new_events:
                timestamp = event_data['timestamp_sec']
                if timestamp in existing_dict:
                    # Actualizar extra_data
                    existing_event = existing_dict[timestamp]
                    existing_event.extra_data.update(event_data.get('extra_data', {}))
                else:
                    # Crear nuevo
                    event = Event(**event_data, match_id=match_id)
                    db.add(event)
        
        db.commit()
        return jsonify({"success": True, "events_added": len(new_events)})
        
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()
```

---

## 📝 Checklist General

### Para Cada Feature

Antes de marcar como completado:

- [ ] **Código implementado** y funcionando
- [ ] **Tests escritos** y pasando
- [ ] **Documentación actualizada** (inline + README si aplica)
- [ ] **UI/UX revisada** (si aplica)
- [ ] **Validaciones implementadas**
- [ ] **Error handling** robusto
- [ ] **Logs agregados** para debugging
- [ ] **Code review** completado
- [ ] **Testing manual** en desarrollo
- [ ] **Merged a base_de_datos** branch

---

## 🎯 Métricas de Éxito

### Sprint 1
- [ ] Importación XML funciona end-to-end sin errores
- [ ] Perfiles se pueden crear/editar desde UI
- [ ] Tiempos manuales funcionan correctamente
- [ ] Enricher calcula períodos y Game_Time sin errores

### Sprint 2
- [ ] Labels sin group se pueden mapear
- [ ] Preview muestra estadísticas útiles
- [ ] Validaciones previenen imports inválidos
- [ ] 0 bugs críticos reportados

### Sprint 3
- [ ] Coverage de tests > 80%
- [ ] CI/CD pipeline funciona
- [ ] Documentación completa

### Sprint 4
- [ ] Detección automática de perfil con >90% precisión
- [ ] Importación incremental funciona para GPS

---

## 🚨 Bloqueadores Conocidos

1. **Enricher.py**: Código legacy con duplicación → Prioridad crítica refactorizar
2. **Perfiles hardcodeados**: Impide que usuarios creen perfiles custom → Sprint 1
3. **Sin validaciones**: Datos inválidos pueden crashear el backend → Sprint 2

---

## 📅 Timeline Estimado

- **Sprint 1**: 2-3 semanas (14-18 horas de desarrollo)
- **Sprint 2**: 2 semanas (11-14 horas)
- **Sprint 3**: 2 semanas (10-13 horas)
- **Sprint 4**: 3 semanas (14-18 horas) - Opcional

**Total MVP completo**: 6-7 semanas

---

**Próxima Acción Recomendada**: Empezar con **1.1 Refactor de enricher.py** 🚀
