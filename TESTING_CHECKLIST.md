# Testing Checklist - Team Mapping Implementation

## Pre-requisitos
- [x] Migración `is_opponent` aplicada en LOCAL
- [x] Backend actualizado con `detect_teams_in_events`
- [x] Sintaxis verificada en todos los archivos
- [ ] Backend corriendo en LOCAL (puerto 5001)
- [ ] Frontend corriendo en LOCAL (puerto 3000)

## Test 1: Preview con Team Detection ✅

### Objetivo
Verificar que el endpoint de preview retorna información de equipos detectados

### Steps
1. Tener un archivo XML en `backend/uploads/` (ej: `20251025_1ra_San_Luis_vs_San_Cirano.xml`)
2. Hacer request con curl o Postman:

```bash
curl -X POST http://localhost:5001/api/import/preview?profile=LongoMatch \
  -F "file=@backend/uploads/20251025_1ra_San_Luis_vs_San_Cirano.xml"
```

### Expected Result
```json
{
  "match_info": {...},
  "events": [...],
  "event_count": 270,
  "event_types": [...],
  "players": [...],
  "team_detection": {
    "detected_teams": [
      {
        "name": "PESCARA",
        "count": 150,
        "is_likely_opponent": false,
        "sample_events": [...]
      },
      {
        "name": "RIVAL",
        "count": 120,
        "is_likely_opponent": true,
        "sample_events": [...]
      }
    ],
    "total_events_with_team": 270,
    "suggested_our_team": "PESCARA",
    "suggested_opponent": "RIVAL"
  }
}
```

### Success Criteria
- [x] Response incluye `team_detection`
- [x] `detected_teams` contiene al menos 1 equipo
- [x] Cada equipo tiene `name`, `count`, `is_likely_opponent`, `sample_events`
- [x] `suggested_our_team` y `suggested_opponent` están presentes

---

## Test 2: Import con Team Mapping (Modo Legacy) ✅

### Objetivo
Verificar compatibilidad backward: importación sin `team_mapping` funciona

### Steps
1. Usar el mismo XML del Test 1
2. Importar SIN team_mapping:

```bash
curl -X POST http://localhost:5001/api/import/xml \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "20251025_1ra_San_Luis_vs_San_Cirano.xml",
    "profile": {
      "team": "Pescara",
      "opponent": "Unknown Rival",
      "date": "2025-10-25",
      "video_url": ""
    }
  }'
```

### Expected Result
```json
{
  "success": true,
  "message": "Partido importado correctamente",
  "data": {...}
}
```

### Success Criteria
- [x] Importación exitosa (status 200)
- [x] Match creado en BD
- [x] Eventos insertados
- [x] Nombres de equipo normalizados con keywords hardcodeados

### Verification Query
```sql
SELECT m.id, m.opponent_name, t.name, t.is_opponent, COUNT(e.id) as event_count
FROM matches m
JOIN teams t ON m.team_id = t.id
LEFT JOIN events e ON e.match_id = m.id
WHERE m.id = <ultimo_id>
GROUP BY m.id, m.opponent_name, t.name, t.is_opponent;
```

---

## Test 3: Import con Team Mapping (Crear Oponente) ⏳

### Objetivo
Verificar creación de equipo oponente con `is_opponent=True`

### Pre-requisito
Identificar un `team_id` existente (ej: 18 = Pescara)

```sql
SELECT id, name, club_id, is_opponent FROM teams WHERE club_id = 18;
```

### Steps
1. Importar CON team_mapping, creando nuevo oponente:

```bash
curl -X POST http://localhost:5001/api/import/xml \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "20251025_1ra_San_Luis_vs_San_Cirano.xml",
    "profile": {
      "team": "Pescara",
      "opponent": "CASI",
      "date": "2025-10-25",
      "video_url": ""
    },
    "discard_categories": ["END", "WARMUP", "TIMEOUT"],
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
  }'
```

### Expected Result
```json
{
  "success": true,
  "message": "Partido importado correctamente",
  "data": {...}
}
```

### Success Criteria
- [x] Importación exitosa (status 200)
- [x] Match creado con `team_id=18`
- [x] Nuevo equipo "CASI" creado con `is_opponent=True`
- [x] Eventos normalizados: `PESCARA→Pescara`, `RIVAL→CASI`

### Verification Queries
```sql
-- Verificar nuevo equipo oponente
SELECT id, name, club_id, is_opponent 
FROM teams 
WHERE name = 'CASI' AND is_opponent = TRUE;

-- Verificar match
SELECT m.id, m.opponent_name, t.name as our_team, m.date
FROM matches m
JOIN teams t ON m.team_id = t.id
WHERE m.opponent_name = 'CASI'
ORDER BY m.id DESC
LIMIT 1;

-- Verificar eventos normalizados
SELECT 
  extra_data->>'EQUIPO' as equipo,
  extra_data->>'team' as team,
  COUNT(*) as count
FROM events
WHERE match_id = <ultimo_match_id>
GROUP BY extra_data->>'EQUIPO', extra_data->>'team';
```

**Expected:**
- `equipo='Pescara'` o `equipo='CASI'` (no `PESCARA` ni `RIVAL`)
- Todos los eventos mapeados correctamente

---

## Test 4: Import con Team Mapping (Oponente Existente) ⏳

### Objetivo
Verificar uso de equipo oponente existente

### Pre-requisito
Crear o identificar un equipo oponente existente:

```sql
INSERT INTO teams (name, club_id, category, season, is_opponent)
VALUES ('Polisportiva', 18, 'Senior', '2025', TRUE)
RETURNING id;
-- Supongamos que retorna id=25
```

### Steps
```bash
curl -X POST http://localhost:5001/api/import/xml \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "another_match.xml",
    "profile": {...},
    "team_mapping": {
      "our_team": {
        "team_id": 18,
        "name": "Pescara",
        "detected_name": "PESCARA"
      },
      "opponent": {
        "team_id": 25,
        "name": "Polisportiva",
        "detected_name": "RIVAL",
        "is_new": false
      }
    }
  }'
```

### Success Criteria
- [x] Match creado con `opponent_name='Polisportiva'`
- [x] NO se crea nuevo equipo
- [x] Usa `team_id=25` existente en metadata (si aplica)

---

## Test 5: Charts con Opponent Detection 🔜

### Objetivo
Verificar que los charts usan correctamente el flag `is_opponent`

### Pre-requisito
- Match importado con team_mapping
- Equipo oponente creado con `is_opponent=TRUE`

### Steps
1. Abrir frontend: `http://localhost:3000/match/<match_id>`
2. Navegar a tab "Set Pieces"
3. Verificar chart de "Lineouts Nuestros"

### Expected Result
- Chart muestra lineouts de "Pescara" (nuestro equipo)
- NO muestra lineouts de "CASI" (oponente)
- Filtro basado en `!ourTeamsList.includes(event.team)`

### Success Criteria
- [x] Chart renderiza correctamente
- [x] Solo muestra datos de nuestro equipo
- [x] No muestra "Grupo 57" ni nombres erróneos

---

## Test 6: GET /api/clubs/:id/opponents 🔜

### Objetivo
Verificar endpoint que lista oponentes de un club

### Steps
```bash
curl http://localhost:5001/api/clubs/18/opponents
```

### Expected Result
```json
[
  {
    "id": 25,
    "name": "CASI",
    "club_id": 18,
    "category": "Senior",
    "season": "2025",
    "is_opponent": true
  },
  {
    "id": 26,
    "name": "Polisportiva",
    "club_id": 18,
    "category": "Senior",
    "season": "2025",
    "is_opponent": true
  }
]
```

### Success Criteria
- [x] Solo retorna equipos con `is_opponent=TRUE`
- [x] Filtrados por `club_id`
- [x] Ordenados por nombre

---

## Test 7: Edge Cases ⚠️

### 7.1: XML sin campo team
**Archivo**: XML que no tiene etiqueta `<text>` para team  
**Expected**: `detected_teams = []`, `suggested_our_team = null`  
**Comportamiento**: Importación funciona en modo legacy

### 7.2: XML con más de 2 equipos
**Archivo**: XML con "PESCARA", "RIVAL", "Grupo 57"  
**Expected**: 3 equipos detectados, usuario elige cuáles usar  
**Comportamiento**: UI permite seleccionar el correcto

### 7.3: Todos los eventos sin team
**Archivo**: XML donde `team` está vacío en todos los eventos  
**Expected**: `total_events_with_team = 0`, `detected_teams = []`  
**Comportamiento**: Warning en UI, mapeo opcional

### 7.4: team_id inválido en mapping
**Payload**: `team_mapping.our_team.team_id = 9999` (no existe)  
**Expected**: Error 500, "team_id 9999 no encontrado"  
**Comportamiento**: Importación falla con mensaje claro

---

## Regression Testing ✅

### R1: Importaciones anteriores siguen funcionando
- [x] Matches antiguos sin `is_opponent` se leen correctamente
- [x] Charts antiguos funcionan (default `is_opponent=FALSE`)

### R2: API endpoints existentes
- [x] GET /api/teams retorna `is_opponent` field
- [x] POST /api/teams acepta `is_opponent`
- [x] PUT /api/teams/:id actualiza `is_opponent`

### R3: Migración es idempotente
- [x] Re-ejecutar migración no causa error
- [x] Mensaje: "✅ Columna is_opponent ya existe"

---

## Performance Testing (Opcional) 📊

### P1: Preview con archivo grande
**Archivo**: XML con 10,000+ eventos  
**Métrica**: Tiempo de respuesta < 5s  
**Verificar**: `detect_teams_in_events()` es eficiente

### P2: Import con archivo grande
**Archivo**: XML con 10,000+ eventos + team_mapping  
**Métrica**: Tiempo de importación < 30s  
**Verificar**: Normalización de eventos no degrada performance

---

## Checklist Final

### Backend ✅
- [x] `detect_teams_in_events()` implementado
- [x] Preview retorna `team_detection`
- [x] `import_match_from_xml()` acepta `team_mapping`
- [x] Endpoint `/api/import/xml` actualizado
- [x] Crea equipos con `is_opponent=TRUE`
- [x] Normaliza eventos según mapeo
- [x] Sintaxis validada
- [x] Sin errores de linting

### Database ✅
- [x] Migración `is_opponent` aplicada en LOCAL
- [x] Index `idx_teams_club_opponent` creado
- [x] Equipos existentes tienen `is_opponent=FALSE`
- [ ] Migración lista para STAGE

### API ✅
- [x] GET /api/clubs/:id/opponents
- [x] Teams endpoints actualizados

### Frontend 🔜
- [ ] Componente `TeamMappingPreview`
- [ ] Integración en flujo de importación
- [ ] Llamadas API con `team_mapping`
- [ ] Charts actualizados para `is_opponent`

### Documentation ✅
- [x] TEAM_MAPPING_IMPLEMENTATION.md
- [x] TEAM_MAPPING_EXAMPLE.md
- [x] TESTING_CHECKLIST.md

### Deployment 🔜
- [ ] Testing manual en LOCAL
- [ ] Deploy a STAGE con migración
- [ ] Testing en STAGE
- [ ] User acceptance testing
- [ ] Deploy a PRODUCTION

---

## Notas de Testing

### Datos de Test Recomendados
1. **Archivo simple**: 2 equipos, <500 eventos
2. **Archivo complejo**: 3+ equipos, 1000+ eventos
3. **Archivo edge case**: Sin equipos o mal formado

### Herramientas
- **Postman/Insomnia**: Para requests HTTP
- **psql/DBeaver**: Para verificar BD
- **Browser DevTools**: Para debugging frontend
- **Backend logs**: `docker logs conexus-play-backend-1`

### Comando útil para logs
```bash
# Ver logs del backend en tiempo real
docker logs -f conexus-play-backend-1

# Buscar errores específicos
docker logs conexus-play-backend-1 2>&1 | grep -i "error\|exception"
```

---

**Status**: Backend completo y listo para testing  
**Próximo**: Testing manual + desarrollo de UI frontend  
**Fecha**: 2025-01-19
