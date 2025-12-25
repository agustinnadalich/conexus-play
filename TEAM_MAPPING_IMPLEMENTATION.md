# Implementación de Mapeo de Equipos en Importación

## Resumen
Sistema inteligente de detección y mapeo de equipos durante la importación de partidos desde XML.

## Cambios Realizados

### 1. Nueva Función: `detect_teams_in_events()` 
**Archivo:** `backend/importer.py` (líneas 16-97)

**Función:** Analiza eventos y detecta equipos únicos automáticamente

**Características:**
- Escanea todos los eventos y extrae valores únicos del campo `team`
- Cuenta ocurrencias de cada equipo
- Identifica keywords de oponente: `RIVAL`, `OPPONENT`, `OPONENTE`, `OPPOSING`
- Sugiere cuál es nuestro equipo (más frecuente, no keyword)
- Sugiere cuál es el oponente (keyword o segundo más frecuente)
- Retorna eventos de muestra para cada equipo detectado

**Estructura de Respuesta:**
```python
{
    'detected_teams': [
        {
            'name': 'PESCARA',
            'count': 150,
            'is_likely_opponent': False,
            'sample_events': [
                {'event_type': 'LINEOUT', 'timestamp_sec': 120, ...},
                ...
            ]
        },
        {
            'name': 'RIVAL',
            'count': 120,
            'is_likely_opponent': True,
            'sample_events': [...]
        }
    ],
    'total_events_with_team': 270,
    'suggested_our_team': 'PESCARA',
    'suggested_opponent': 'RIVAL'
}
```

### 2. Preview con Detección de Equipos
**Archivo:** `backend/app.py`

**Cambios:**
- Importado `detect_teams_in_events` (línea 12)
- Actualizado endpoint `POST /api/import/preview` (líneas 907-914)
- Ahora retorna `team_detection` en la respuesta del preview

**Flujo:**
1. Usuario sube archivo XML
2. Sistema normaliza y parsea XML
3. Sistema detecta equipos automáticamente con `detect_teams_in_events()`
4. Frontend recibe: `match_info`, `events`, `event_types`, `players`, **`team_detection`**

### 3. Importación con Mapeo de Equipos
**Archivo:** `backend/importer.py` (líneas 110-268)

**Función actualizada:** `import_match_from_xml()`

**Nuevo parámetro:** `team_mapping` (opcional)
```python
team_mapping = {
    'our_team': {
        'team_id': 18,
        'name': 'Pescara',
        'detected_name': 'PESCARA'
    },
    'opponent': {
        'team_id': 25,  # o None si es nuevo
        'name': 'CASI',
        'detected_name': 'RIVAL',
        'is_new': True  # True = crear nuevo equipo
    }
}
```

**Características:**
- **Modo con mapeo**: Usa `team_id` proporcionado para nuestro equipo
- **Creación de oponentes**: Si `is_new=True`, crea equipo con `is_opponent=True`
- **Uso de existentes**: Si `team_id` existe, usa ese equipo oponente
- **Normalización precisa**: Mapea nombres detectados a nombres reales
- **Modo legacy**: Sin `team_mapping`, funciona como antes (keywords hardcodeados)

**Normalización de Eventos:**
- Con mapeo: `'PESCARA' → 'Pescara'`, `'RIVAL' → 'CASI'`
- Sin mapeo: Keywords → mantener, resto → `team.name`
- Aplica a: `event.team`, `extra_data.team`, `extra_data.EQUIPO`, `extra_data.TEAM`

### 4. Endpoint de Importación Actualizado
**Archivo:** `backend/routes/import_routes.py` (líneas 6-68)

**Endpoint:** `POST /api/import/xml`

**Parámetros nuevos:**
```json
{
    "filename": "20251025_1ra_San_Luis_vs_San_Cirano.xml",
    "profile": {...},
    "discard_categories": ["END", "WARMUP", "TIMEOUT"],
    "team_mapping": {
        "our_team": {...},
        "opponent": {...}
    }
}
```

## Flujo Completo de Importación

### Paso 1: Preview (con detección)
```http
POST /api/import/preview?profile=LongoMatch
Content-Type: multipart/form-data

file: 20251025_1ra_San_Luis_vs_San_Cirano.xml
```

**Respuesta incluye:**
```json
{
    "match_info": {...},
    "events": [...],
    "event_types": [...],
    "players": [...],
    "team_detection": {
        "detected_teams": [
            {"name": "PESCARA", "count": 150, "is_likely_opponent": false},
            {"name": "RIVAL", "count": 120, "is_likely_opponent": true}
        ],
        "suggested_our_team": "PESCARA",
        "suggested_opponent": "RIVAL"
    }
}
```

### Paso 2: Usuario Confirma Mapeo (Frontend)
Frontend muestra:
- Equipos detectados con contadores
- Sugerencias automáticas
- UI para confirmar/editar mapeo
- Opción de seleccionar equipo existente o crear nuevo oponente

### Paso 3: Importación Final
```http
POST /api/import/xml
Content-Type: application/json

{
    "filename": "20251025_1ra_San_Luis_vs_San_Cirano.xml",
    "profile": {
        "team": "Pescara",
        "opponent": "CASI",
        "date": "2025-10-25",
        "video_url": "..."
    },
    "discard_categories": ["END", "WARMUP"],
    "team_mapping": {
        "our_team": {
            "team_id": 18,
            "name": "Pescara",
            "detected_name": "PESCARA"
        },
        "opponent": {
            "team_id": null,
            "name": "CASI",
            "detected_name": "RIVAL",
            "is_new": true
        }
    }
}
```

**Resultado:**
- Partido creado con `team_id=18`
- Equipo oponente "CASI" creado con `is_opponent=True`
- Eventos normalizados: `PESCARA→Pescara`, `RIVAL→CASI`
- Gráficos funcionan correctamente (lineouts, set pieces, etc.)

## Ventajas del Sistema

### Antes (Keywords Hardcodeados)
❌ Solo reconocía: `RIVAL`, `OPPONENT`, `OPONENTE`  
❌ Fallaba con variaciones: `Avversario`, `Rival1`, etc.  
❌ Nombres genéricos sin valor analítico  
❌ No creaba equipos oponentes en BD  

### Ahora (Detección Inteligente)
✅ Detecta cualquier nombre de equipo en XML  
✅ Cuenta ocurrencias para sugerir mapeo  
✅ Almacena nombres reales de oponentes  
✅ Crea equipos con flag `is_opponent=True`  
✅ Compatibilidad backward (funciona sin mapeo)  
✅ Usuario confirma antes de importar  

## Próximos Pasos (Frontend)

### 1. Crear Componente `TeamMappingPreview`
- Mostrar equipos detectados con contadores
- Marcar sugerencias automáticas
- Permitir editar mapeo
- Dropdown para seleccionar equipo existente del club
- Botón "Crear nuevo oponente"

### 2. Integrar en Flujo de Importación
- Paso 1: Upload XML
- **Paso 2: Mapear Equipos** (nuevo)
- Paso 3: Confirmar metadata
- Paso 4: Importar con mapeo

### 3. Actualizar Llamadas API
- Incluir `team_mapping` en `POST /api/import/xml`
- Manejar respuesta de equipos creados

## Testing

### Caso de Prueba 1: XML con nombres estándar
```
Archivo: Polisportiva.xml
Equipos detectados: "PESCARA" (150 eventos), "RIVAL" (120 eventos)
Mapeo: PESCARA → team_id=18 (Pescara), RIVAL → crear "Polisportiva"
Resultado esperado: ✅ Lineouts chart muestra datos
```

### Caso de Prueba 2: XML con nombres custom
```
Archivo: CASI_match.xml
Equipos detectados: "SAN LUIS" (200 eventos), "CASI" (180 eventos)
Mapeo: SAN LUIS → team_id=22, CASI → crear con is_opponent=True
Resultado esperado: ✅ Ambos equipos en BD, eventos normalizados
```

### Caso de Prueba 3: Sin mapeo (legacy)
```
Archivo: old_format.xml
team_mapping: null
Resultado esperado: ✅ Funciona como antes con keywords
```

## Deployment

### LOCAL ✅ (Completado)
- [x] Migración `is_opponent` aplicada
- [x] Código actualizado
- [x] Sintaxis verificada
- [ ] Testing manual pendiente

### STAGE 🔜 (Pendiente)
- [ ] Aplicar migración con `apply_migration.sh`
- [ ] Deploy backend actualizado
- [ ] Testing en stage
- [ ] Crear frontend para mapeo

### PRODUCTION 🔒 (Futuro)
- Después de validación en STAGE
- Backup obligatorio antes de migración
- Monitoreo post-deployment

## Archivos Modificados
1. `backend/importer.py` - Nueva función + actualización de import_match_from_xml
2. `backend/app.py` - Preview con team_detection
3. `backend/routes/import_routes.py` - Endpoint con team_mapping

## Compatibilidad
✅ **Backward compatible**: Funciona sin `team_mapping` (modo legacy)  
✅ **Database ready**: Migración `is_opponent` ya aplicada  
✅ **API ready**: Endpoints actualizados  
⏳ **Frontend**: Pendiente implementación de UI de mapeo  

---

**Fecha:** 2025-01-19  
**Status:** Backend completo, Frontend pendiente  
**Próximo:** Implementar TeamMappingPreview component en React
