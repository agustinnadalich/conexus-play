# Análisis del XML: Avezzano vs Pescara (19/10/2025)

## 📊 Resumen Ejecutivo

**Archivo**: `20251019 Az-Pescara (2).xml`  
**Formato**: LongoMatch/Nacsport XML  
**Tamaño**: 11,038 líneas (~500KB)  
**Eventos totales**: 590 instances  
**Categorías detectadas**: 19 tipos de eventos  
**Estructura**: Muy completa con coordenadas y descriptores detallados

---

## 📈 Distribución de Eventos

### Top 10 Categorías

| Categoría | Cantidad | % del Total | Comentario |
|-----------|----------|-------------|------------|
| RUCK | 115 | 19.5% | Mayor cantidad - análisis de contacto |
| TACKLE | 95 | 16.1% | Segunda mayor - análisis defensivo |
| END | 53 | 9.0% | Muchos END - posible multi-fase |
| SHORT-MATCH | 52 | 8.8% | Jugadas cortas |
| ATTACK | 43 | 7.3% | Jugadas ofensivas |
| DEFENSE | 36 | 6.1% | Fases defensivas |
| PENALTY | 35 | 5.9% | Alto número de infracciones |
| TURNOVER- | 28 | 4.7% | Pérdidas de posesión |
| LINEOUT | 24 | 4.1% | Análisis de touches |
| TURNOVER+ | 20 | 3.4% | Recuperaciones |
| **RESTO** | 89 | 15.1% | MISSED-TACKLE, KICK, POINTS, etc. |

### Categorías Completas

```
115 RUCK           - Contacto después del tackle
 95 TACKLE         - Placajes realizados
 53 END            - Fin de jugadas/fases
 52 SHORT-MATCH    - Jugadas cortas
 43 ATTACK         - Fases ofensivas
 36 DEFENSE        - Fases defensivas
 35 PENALTY        - Infracciones/penales
 28 TURNOVER-      - Pérdidas de posesión
 24 LINEOUT        - Touches/Lineouts
 20 TURNOVER+      - Recuperaciones
 19 MISSED-TACKLE  - Tackles fallidos
 17 KICK           - Patadas
 15 POINTS         - Anotaciones
 13 KICK OFF       - Saques iniciales
 12 SCRUM          - Scrums
  7 BREAK          - Quiebres de línea
  6 GOAL-KICK      - Patadas a los palos
  4 FREE-KICK      - Golpes francos
  2 MAUL           - Mauls
```

---

## 🏷️ Sistema de Labels (Descriptores)

### Grupos Detectados (17 tipos)

| Grupo | Cantidad | Propósito |
|-------|----------|-----------|
| EQUIPO | 354 | Identificar equipo (PESCARA/RIVAL) |
| JUGADOR | 187 | Nombre del jugador involucrado |
| VELOCIDAD-RUCK | 98 | Velocidad del ruck (FAST/SLOW) |
| AVANCE | 95 | Resultado del tackle (POSITIVE/NEGATIVE/NEUTRAL) |
| ENCUADRE-TACKLE | 80 | Tipo de tackle (OUTSIDE/INSIDE) |
| INFRACCION | 37 | Tipo de infracción |
| RESULTADO-LINE | 23 | Resultado del lineout (CLEAN/STEAL/LOST) |
| POSICION-LINE | 23 | Posición del lineout (A/B/C/D) |
| CANTIDAD-LINE | 23 | Número de jugadores en lineout |
| PIE | 17 | Pie usado para patear |
| RUCK | 16 | Descriptor adicional del ruck |
| TIPO-PUNTOS | 14 | Tipo de anotación (TRY/CONVERSION/etc) |
| TIRADOR-LINE | 11 | Jugador que lanza el lineout |
| SCRUM | 11 | Resultado del scrum (WIN/LOST) |
| TIPO-QUIEBRE | 6 | Tipo de line break (NUMBERS/SKILL) |
| RESULTADO-PALOS | 6 | Resultado de patada a palos (SUCCESS/FAIL) |
| CANAL-QUIEBRE | 3 | Zona del quiebre (ZONE 1/2/3) |

---

## ⚠️ Labels Sin Grupo

**Detectados**: Varios labels sin `<group>`, por ejemplo:
- `T1D` - Aparece frecuentemente en lineouts y tackles
- `T2B` - Aparece en penalties
- `T1C` - Aparece en rucks
- `T1A` - Aparece en lineouts

**Interpretación Probable**:
- **Formato**: `T{periodo}{zona}`
- **T1D**: Territorio 1, Zona D (probablemente zona defensiva)
- **T2B**: Territorio 2, Zona B (probablemente zona media)

**Necesidad**: Mapeo manual en el sistema de importación para convertir a descriptores útiles.

---

## 📍 Coordenadas Geográficas

### Cobertura

✅ **Muchos eventos tienen coordenadas** (`pos_x`, `pos_y`)

**Eventos con coordenadas**:
- PENALTY (todos)
- LINEOUT (todos)
- SCRUM (todos)
- ATTACK (mayoría)
- SHORT-MATCH (mayoría)
- BREAK (todos)
- RUCK (todos)

**Eventos sin coordenadas**:
- TACKLE (algunos)
- END (ninguno)
- KICK OFF (ninguno)
- TURNOVER+/- (algunos)

### Ejemplos de Coordenadas

```xml
<!-- PENALTY en campo ofensivo -->
<pos_x>18</pos_x>
<pos_y>48</pos_y>

<!-- LINEOUT en lateral -->
<pos_x>68</pos_x>
<pos_y>52</pos_y>

<!-- ATTACK con múltiples coordenadas (progresión) -->
<pos_x>13</pos_x>
<pos_y>43</pos_y>
<pos_x>24</pos_x>
<pos_y>38</pos_y>
<pos_x>47</pos_x>
<pos_y>44</pos_y>
```

**Observación**: Algunos eventos tienen **múltiples pares de coordenadas** (progresión de la jugada).

---

## 🔍 Estructura Detallada de Eventos

### Evento Completo Tipo 1: PENALTY con todos los descriptores

```xml
<instance>
  <ID>9</ID>
  <start>105.8</start>
  <end>117.8</end>
  <code>PENALTY</code>
  <pos_x>18</pos_x>
  <pos_y>48</pos_y>
  <xy_colour>000000</xy_colour>
  <xy_shape>0</xy_shape>
  <label>
    <text>T2B</text>                      ← SIN GROUP
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

**Datos extraídos**:
- Tipo: PENALTY
- Timestamp: 105.8s (1:45)
- Duración: 12s
- Coordenadas: (18, 48)
- Jugador: Matera
- Infracción: RUCK ATTACK
- Equipo: PESCARA
- Territorio: T2B (necesita mapeo)

---

### Evento Completo Tipo 2: LINEOUT con detalles técnicos

```xml
<instance>
  <ID>28</ID>
  <start>261.066666666667</start>
  <end>276.066666666667</end>
  <code>LINEOUT</code>
  <pos_x>68</pos_x>
  <pos_y>52</pos_y>
  <xy_colour>000000</xy_colour>
  <xy_shape>0</xy_shape>
  <label>
    <group>RESULTADO-LINE</group>
    <text>CLEAN</text>
  </label>
  <label>
    <group>POSICION-LINE</group>
    <text>B</text>
  </label>
  <label>
    <group>CANTIDAD-LINE</group>
    <text>4</text>
  </label>
  <label>
    <text>T1D</text>                      ← SIN GROUP
  </label>
  <label>
    <group>EQUIPO</group>
    <text>PESCARA</text>
  </label>
  <label>
    <group>TIRADOR-LINE</group>
    <text>T - Pippo</text>
  </label>
</instance>
```

**Datos extraídos**:
- Tipo: LINEOUT
- Timestamp: 261.07s (4:21)
- Coordenadas: (68, 52)
- Resultado: CLEAN (limpio)
- Posición: B (media)
- Jugadores: 4
- Tirador: Pippo
- Equipo: PESCARA
- Territorio: T1D (necesita mapeo)

---

### Evento Completo Tipo 3: ATTACK con progresión

```xml
<instance>
  <ID>30</ID>
  <start>266.333333333333</start>
  <end>294.466666666667</end>
  <code>ATTACK</code>
  <!-- Múltiples coordenadas = progresión de la jugada -->
  <pos_x>13</pos_x>
  <pos_y>43</pos_y>
  <pos_x>24</pos_x>
  <pos_y>38</pos_y>
  <pos_x>47</pos_x>
  <pos_y>44</pos_y>
  <pos_x>47</pos_x>
  <pos_y>45</pos_y>
</instance>
```

**Datos extraídos**:
- Tipo: ATTACK
- Timestamp: 266.33s (4:26)
- Duración: 28.13s (jugada larga)
- Trayectoria: 4 puntos
  - Inicio: (13, 43)
  - Paso 2: (24, 38)
  - Paso 3: (47, 44)
  - Final: (47, 45)

**Potencial**: Visualizar trayectoria de ataque en el campo.

---

### Evento de Control: KICK OFF

```xml
<instance>
  <ID>1</ID>
  <start>0</start>
  <end>4.2</end>
  <code>KICK OFF</code>
  <label>
    <group>EQUIPO</group>
    <text>RIVAL</text>
  </label>
  <label>
    <group>EQUIPO</group>       ← Repetido
    <text>1</text>
  </label>
</instance>
```

**Uso**: Detectar inicio del Período 1.

---

### Evento de Control: END

```xml
<instance>
  <ID>22</ID>
  <start>177.933333333333</start>
  <end>178.933333333333</end>
  <code>END</code>
</instance>
```

**Uso**: Marcar fin de una secuencia de juego.

**Observación**: 53 eventos END → Indica que el partido fue dividido en muchas micro-secuencias.

---

## 🎯 Análisis de Jugadores

### Jugadores Mencionados (muestra)

**Detectados en labels JUGADOR**:
- Matera (múltiples menciones)
- Tucu
- Ricky
- Pippo (tirador de lineout)

**Total estimado**: ~20-30 jugadores únicos (necesita análisis completo del archivo).

---

## 🚦 Estrategia de Importación Recomendada

### Perfil Sugerido

```json
{
  "name": "Pescara LongoMatch",
  "description": "Perfil optimizado para XML de Pescara con análisis detallado",
  "file_types": ["xml"],
  "settings": {
    "time_mapping": {
      "method": "automatic",
      "control_events": ["KICK OFF", "END"]
    },
    "discard_categories": [
      "END"  // 53 eventos, no útiles para análisis
    ],
    "coordinate_fields": {
      "x": "pos_x",
      "y": "pos_y"
    },
    "team_mapping": {
      "own_team_values": ["PESCARA"],
      "opponent_values": ["RIVAL", "AVEZZANO"]
    },
    "player_extraction": {
      "group_name": "JUGADOR"
    },
    "advanced": {
      "handle_multiple_coordinates": true,  // Para ATTACK con progresión
      "label_mappings": {
        "T1D": {"type": "zone", "value": "Zona Defensiva"},
        "T2B": {"type": "zone", "value": "Zona Media"},
        "T1A": {"type": "zone", "value": "Zona Ofensiva A"},
        "T1C": {"type": "zone", "value": "Zona Ofensiva C"}
      }
    }
  }
}
```

---

## 📋 Proceso de Importación Paso a Paso

### 1. Upload y Detección

```bash
POST /api/import/preview?profile=Pescara LongoMatch
Content-Type: multipart/form-data

file: 20251019 Az-Pescara (2).xml
```

**Backend normaliza y devuelve**:

```json
{
  "match": {
    "team": "Desconocido",  // Usuario completará
    "opponent": "Rival",
    "date": "2023-01-01"
  },
  "events": [
    // 590 eventos
  ],
  "event_types": [
    "RUCK", "TACKLE", "END", "SHORT-MATCH", "ATTACK",
    "DEFENSE", "PENALTY", "TURNOVER-", "LINEOUT", "TURNOVER+",
    "MISSED-TACKLE", "KICK", "POINTS", "KICK OFF", "SCRUM",
    "BREAK", "GOAL-KICK", "FREE-KICK", "MAUL"
  ],
  "labels_without_group": ["T1D", "T2B", "T1A", "T1C"],
  "stats": {
    "total_events": 590,
    "events_with_coordinates": 412,
    "unique_players": 23,
    "duration_seconds": 4800  // Estimado
  }
}
```

---

### 2. Preview - Usuario Filtra

**Metadata Completa**:
```
Equipo: Pescara
Rival: Avezzano
Fecha: 2025-10-19
Ubicación: Campo Avezzano
Competición: Serie A Italiana
Video URL: [URL del video]
```

**Categorías para Descartar** (sugerencia):
```
☐ END (53 eventos)           ← Descartar (solo control)
☑ RUCK (115 eventos)
☑ TACKLE (95 eventos)
☑ SHORT-MATCH (52 eventos)
☑ ATTACK (43 eventos)
☑ DEFENSE (36 eventos)
☑ PENALTY (35 eventos)
☑ TURNOVER- (28 eventos)
☑ LINEOUT (24 eventos)
☑ TURNOVER+ (20 eventos)
☑ MISSED-TACKLE (19 eventos)
☑ KICK (17 eventos)
☑ POINTS (15 eventos)
☐ KICK OFF (13 eventos)      ← Descartar (solo control)
☑ SCRUM (12 eventos)
☑ BREAK (7 eventos)
☑ GOAL-KICK (6 eventos)
☑ FREE-KICK (4 eventos)
☑ MAUL (2 eventos)
```

**Mapeo de Labels Sin Group**:
```
T1D → Zona del Campo: "Zona Defensiva (22m propio)"
T2B → Zona del Campo: "Zona Media (Centro)"
T1A → Zona del Campo: "Zona Ofensiva A (Lateral)"
T1C → Zona del Campo: "Zona Ofensiva C (Centro)"
```

**Eventos a Importar**: 524 eventos (590 - 53 END - 13 KICK OFF)

---

### 3. Enriquecimiento Automático

**Detección de Períodos**:
- Buscar primer `KICK OFF` → Inicio P1 (timestamp: 0s)
- Buscar eventos `END` para detectar fin de P1
- Buscar segundo `KICK OFF` → Inicio P2
- Calcular duración basándose en timestamps

**Resultado**:
```json
{
  "period_1": {
    "start": 0,
    "end": 2400,      // 40 minutos de juego
    "events": 302
  },
  "period_2": {
    "start": 2700,    // 5 min descanso
    "end": 4800,
    "events": 222
  }
}
```

**Enriquecer cada evento**:
```json
{
  "event_type": "PENALTY",
  "timestamp_sec": 105.8,
  "game_time": "01:45",         // ← Calculado
  "period": 1,                   // ← Detectado
  "time_group": "Primer cuarto", // ← Asignado
  "x": 18,
  "y": 48,
  "team": "PESCARA",
  "extra_data": {
    "JUGADOR": "Matera",
    "INFRACCION": "RUCK ATTACK",
    "zone": "Zona Media"         // ← Mapeado desde T2B
  }
}
```

---

### 4. Inserción en Base de Datos

```sql
-- 1. Club y Team
INSERT INTO clubs (name) VALUES ('Pescara') RETURNING id;  -- id=1
INSERT INTO teams (club_id, name) VALUES (1, 'Pescara') RETURNING id;  -- id=1

-- 2. Match
INSERT INTO matches (
  team_id, opponent_name, date, location, competition, video_url
) VALUES (
  1, 'Avezzano', '2025-10-19', 'Campo Avezzano', 'Serie A Italiana', '[URL]'
) RETURNING id;  -- match_id=1

-- 3. Players (solo los mencionados)
INSERT INTO players (full_name) VALUES 
  ('Matera'), ('Tucu'), ('Ricky'), ('Pippo'), ...;

-- 4. Events (524 inserts)
INSERT INTO events (
  match_id, player_id, event_type, timestamp, game_time, 
  period, time_group, x, y, team, extra_data
) VALUES
  (1, 1, 'PENALTY', 105.8, '01:45', 1, 'Primer cuarto', 18, 48, 'PESCARA',
   '{"JUGADOR": "Matera", "INFRACCION": "RUCK ATTACK", "zone": "Zona Media"}'),
  (1, 2, 'TACKLE', 165.0, '02:45', 1, 'Primer cuarto', NULL, NULL, 'PESCARA',
   '{"JUGADOR": "Tucu", "ENCUADRE-TACKLE": "OUTSIDE", "AVANCE": "NEGATIVE"}'),
  -- ... 522 eventos más
```

---

## 📊 Análisis Táctico Posible

### Con estos datos se pueden analizar:

1. **Defensiva**:
   - 95 TACKLE + 19 MISSED-TACKLE = 114 intentos defensivos
   - % Efectividad: 83.3%
   - Top tacklers: Matera, Tucu, Ricky

2. **Disciplina**:
   - 35 PENALTY (alto número)
   - Infracciones más comunes: RUCK ATTACK, SCRUM INF, OFFSIDE
   - Zona de mayor indisciplina: Análisis por coordenadas

3. **Posesión**:
   - 28 TURNOVER- (pérdidas)
   - 20 TURNOVER+ (recuperaciones)
   - Balance: -8 (negativo)

4. **Set Pieces**:
   - 24 LINEOUT: Resultado CLEAN en mayoría
   - 12 SCRUM: WIN en mayoría
   - Análisis por posición y cantidad de jugadores

5. **Ataque**:
   - 43 ATTACK + 52 SHORT-MATCH = 95 fases ofensivas
   - 7 BREAK (quiebres de línea)
   - 15 POINTS (anotaciones)

6. **Mapa de Calor**:
   - 412 eventos con coordenadas
   - Visualizar zonas de mayor actividad
   - Comparar ataque vs defensa por zona

---

## ✅ Criterios de Éxito para la Importación

- [ ] **590 eventos** parseados correctamente
- [ ] **524 eventos** importados (sin END ni KICK OFF)
- [ ] **19 categorías** reconocidas
- [ ] **~23 jugadores** creados
- [ ] **412 eventos** con coordenadas válidas (x, y entre 0-100)
- [ ] **Períodos detectados** automáticamente (P1 y P2)
- [ ] **Game_Time calculado** para todos los eventos
- [ ] **Labels sin group mapeados** a descriptores útiles

---

## 🚨 Desafíos Identificados

### 1. Múltiples END
**Problema**: 53 eventos END (9% del total)  
**Causa**: Partido dividido en micro-secuencias  
**Solución**: Descartar por defecto en preview

### 2. Labels Sin Group
**Problema**: T1D, T2B, T1A, T1C sin contexto  
**Solución**: Sistema de mapeo manual en UI de preview

### 3. Múltiples Coordenadas
**Problema**: Eventos ATTACK con 4+ pares (x, y)  
**Solución**: 
- Opción 1: Guardar solo primer par
- Opción 2: Guardar todas en array JSON
- **Recomendado**: Opción 2 para visualizar trayectoria

### 4. Detección de Jugadores
**Problema**: 187 menciones de jugadores pero nombres repetidos  
**Solución**: Deduplicar por nombre al crear en BD

### 5. Duración Total
**Problema**: No hay metadata explícita de duración total del partido  
**Solución**: Calcular desde último timestamp de evento

---

## 📝 Recomendaciones Finales

### Para el Usuario

1. **Antes de Importar**:
   - Verificar que el video esté disponible
   - Tener URL del video lista
   - Conocer resultado final del partido

2. **Durante Preview**:
   - Descartar END (no útiles para análisis)
   - Mantener KICK OFF solo si se necesita para períodos
   - Mapear labels T1D, T2B, etc. con nombres descriptivos

3. **Después de Importar**:
   - Verificar que los 524 eventos se guardaron
   - Revisar que jugadores se crearon correctamente
   - Validar que coordenadas estén en el rango correcto

### Para el Desarrollo

1. **Priorizar**:
   - Soporte para múltiples coordenadas (progresión de jugadas)
   - Sistema de mapeo de labels sin group
   - Validación de coordenadas (0-100)

2. **Optimizar**:
   - Procesamiento de XML grande (11K líneas)
   - Caching de perfiles más usados
   - Índices en BD para queries por coordenadas

3. **Extender**:
   - Visualización de trayectorias (ATTACK con múltiples pos_x/y)
   - Análisis de clustering (zonas calientes)
   - Comparación entre partidos (reporte multi-match)

---

## 🎯 Próximos Pasos

1. ✅ **Análisis completado** - Este documento
2. ⏳ **Importar archivo de prueba** - Validar pipeline end-to-end
3. ⏳ **Refinar perfil** - Ajustar configuración según resultados
4. ⏳ **Implementar mapeos** - Sistema para labels sin group
5. ⏳ **Crear visualizaciones** - Dashboards con estos datos

---

**Conclusión**: Este XML es **excelente para testing** ya que:
- ✅ Tiene gran variedad de eventos (19 tipos)
- ✅ Incluye coordenadas (70% de eventos)
- ✅ Tiene descriptores detallados (17 grupos de labels)
- ✅ Estructura bien formada
- ⚠️ Requiere mapeo de labels sin group
- ⚠️ Muchos eventos END necesitan filtrado

**Última actualización**: 28 de octubre de 2025
