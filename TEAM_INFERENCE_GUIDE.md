# Guía: Sistema de Inferencia de Equipos

## Problema Resuelto

Muchos eventos en XMLs de LongoMatch/Nacsport no tienen campo `<group>EQUIPO</group>` explícito:
- ATTACK, DEFENSE, SHORT-MATCH → Sin equipo
- TURNOVER+, TURNOVER- → Sin equipo  
- END, marcadores temporales → Sin equipo

**Resultado**: ~44% de eventos quedan sin clasificar por equipo.

## Solución Implementada

Sistema híbrido de inferencia automática + validación manual:

### 1. Preview con Detección Automática

**Endpoint**: `POST /api/import/preview?profile=Facu_SL`

**Respuesta incluye**:
```json
{
  "team_detection": {
    "detected_teams": [
      {"name": "PESCARA", "count": 188, "is_likely_opponent": false},
      {"name": "OPPONENT", "count": 94, "is_likely_opponent": true}
    ],
    "events_without_team": {
      "total_count": 221,
      "by_type": {
        "ATTACK": {
          "count": 41,
          "suggested_team": "PESCARA",
          "has_players": false
        },
        "DEFENSE": {
          "count": 34,
          "suggested_team": "PESCARA"
        }
      },
      "inference_rules": [
        {
          "event_type": "ATTACK",
          "assign_to": "PESCARA",
          "count": 41,
          "reason": "Eventos de ataque típicamente son del equipo con posesión"
        }
      ]
    }
  }
}
```

### 2. Lógica de Inferencia

**3 estrategias** (en orden de prioridad):

#### A. Por Jugador
Si el evento tiene `<group>JUGADOR</group>`, busca otros eventos del mismo jugador que SÍ tengan equipo.
```python
# Evento sin equipo:
<code>TURNOVER+</code>
<label><group>JUGADOR</group><text>Tucu</text></label>

# Sistema busca: otros eventos de "Tucu" 
# Encuentra: TACKLE de Tucu → PESCARA
# Infiere: TURNOVER+ de Tucu → PESCARA
```

#### B. Por Tipo de Evento
Reglas semánticas por naturaleza del evento:
- **ATTACK** → Nuestro equipo (tenemos posesión)
- **DEFENSE** → Nuestro equipo (estamos defendiendo)
- **TURNOVER+** → Nuestro equipo (recuperamos)
- **TURNOVER-** → Nuestro equipo (perdemos)

#### C. Por Proximidad Temporal
Si el evento está a <30 segundos de otro con equipo conocido, usa ese equipo.

### 3. Import con Team Inference

**Endpoint**: `POST /api/import/xml`

**Body**:
```json
{
  "filename": "Polisportiva.xml",
  "profile": {
    "team": "Pescara",
    "date": "2025-12-25"
  },
  "team_mapping": {
    "our_team": {
      "team_id": 18,
      "name": "Pescara",
      "detected_name": "PESCARA"
    },
    "opponent": {
      "name": "Polisportiva",
      "detected_name": "OPPONENT",
      "is_new": true
    }
  },
  "team_inference": [
    {"event_type": "ATTACK", "assign_to": "our_team"},
    {"event_type": "DEFENSE", "assign_to": "our_team"},
    {"event_type": "TURNOVER+", "assign_to": "our_team"},
    {"event_type": "TURNOVER-", "assign_to": "our_team"}
  ]
}
```

**Proceso**:
1. Normaliza XML → eventos
2. **Aplica team_inference** → asigna equipos según reglas
3. **Normaliza nombres** → PESCARA→Pescara, OPPONENT→Polisportiva
4. Guarda en BD con flag `_team_inferred: true` en extra_data

### 4. Frontend (Próximo Paso)

**Componente**: `TeamInferenceReview.tsx`

**UI esperada**:
```
┌─────────────────────────────────────────────────┐
│ 🧠 Eventos sin Equipo Detectados               │
├─────────────────────────────────────────────────┤
│                                                 │
│ Total: 221 eventos requieren asignación        │
│                                                 │
│ ☑ ATTACK (41 eventos) → Pescara               │
│   Razón: Eventos de ataque del equipo con     │
│          posesión                               │
│                                                 │
│ ☑ DEFENSE (34 eventos) → Pescara              │
│   Razón: Eventos defensivos del equipo        │
│                                                 │
│ ☐ END (48 eventos) → Polisportiva             │
│   Razón: Proximidad temporal                   │
│   💡 Sugerencia: Dejarlo null (neutral)       │
│                                                 │
│ ☐ SHORT-MATCH (49 eventos) → Pescara          │
│   💡 Sugerencia: Dejarlo null (marcador)      │
│                                                 │
│ [Aplicar Seleccionados]  [Rechazar Todo]      │
└─────────────────────────────────────────────────┘
```

## Ejemplo de Testing

### Test Completo con Inferencia

```bash
# 1. Preview
curl -X POST 'http://localhost:5001/api/import/preview?profile=Facu_SL' \
  -F 'file=@backend/uploads/Polisportiva.xml'

# Output:
# - 282 eventos CON equipo
# - 221 eventos SIN equipo
# - 6 reglas sugeridas

# 2. Import con inferencias
curl -X POST 'http://localhost:5001/api/import/xml' \
  -H 'Content-Type: application/json' \
  -d '{
    "filename": "Polisportiva.xml",
    "profile": {"team": "Pescara", "date": "2025-12-25"},
    "team_mapping": {
      "our_team": {"team_id": 18, "name": "Pescara", "detected_name": "PESCARA"},
      "opponent": {"name": "Polisportiva", "detected_name": "OPPONENT", "is_new": true}
    },
    "team_inference": [
      {"event_type": "ATTACK", "assign_to": "our_team"},
      {"event_type": "DEFENSE", "assign_to": "our_team"},
      {"event_type": "TURNOVER+", "assign_to": "our_team"},
      {"event_type": "TURNOVER-", "assign_to": "our_team"}
    ]
  }'

# 3. Verificar en BD
psql -d videoanalysis_db -c "
  SELECT 
    extra_data->>'EQUIPO' as equipo,
    COUNT(*) as total,
    COUNT(CASE WHEN extra_data->>'_team_inferred' = 'true' THEN 1 END) as inferidos
  FROM events 
  WHERE match_id = (SELECT MAX(id) FROM matches)
  GROUP BY extra_data->>'EQUIPO';
"

# Output esperado:
#   equipo      | total | inferidos
# --------------+-------+-----------
#  Pescara      |  350  |    162
#  Polisportiva |  142  |     48
#  (null)       |   11  |      0
```

## Archivos Modificados

### Backend
- ✅ `backend/importer.py` - Funciones `infer_team_for_event()` y `detect_teams_in_events()`
- ✅ `backend/app.py` - Preview endpoint retorna `events_without_team`
- ✅ `backend/routes/import_routes.py` - Import acepta `team_inference`

### Frontend (Pendiente)
- 📋 `frontend/src/pages/TeamInferenceReview.tsx` - Componente de revisión
- 📋 `frontend/src/pages/PreviewImport.tsx` - Integrar TeamInferenceReview
- 📋 `frontend/src/types/import.ts` - Tipos para team_inference

## Beneficios

✅ **Análisis Completo**: Todos los eventos clasificados por equipo  
✅ **Transparencia**: Usuario ve y valida las sugerencias  
✅ **Flexibilidad**: Puede aprobar/rechazar por tipo de evento  
✅ **Trazabilidad**: Flag `_team_inferred` identifica inferencias  
✅ **Mejor UX**: Proceso guiado vs decisiones manuales evento por evento  

## Notas

- Eventos neutrales (END, SHORT-MATCH) pueden dejarse sin equipo
- Sistema sugiere pero usuario decide
- Inferencias marcadas con `_team_inferred: true` en `extra_data`
- Charts existentes siguen funcionando (filtran por campo `team`)
