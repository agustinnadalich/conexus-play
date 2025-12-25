# Ejemplo de Respuesta del Preview con Team Detection

## Request
```http
POST /api/import/preview?profile=LongoMatch HTTP/1.1
Host: localhost:5001
Content-Type: multipart/form-data

file: 20251025_1ra_San_Luis_vs_San_Cirano.xml
```

## Response (Simplificado)
```json
{
  "match_info": {
    "team": "PESCARA",
    "opponent": "RIVAL",
    "date": "2025-10-25",
    "location": "Pescara",
    "video_url": "https://youtube.com/watch?v=abc123"
  },
  "events": [
    {
      "event_type": "LINEOUT",
      "team": "PESCARA",
      "player": "Marco Rossi",
      "timestamp_sec": 120.5,
      "x": 15,
      "y": 50,
      "extra_data": {
        "EQUIPO": "PESCARA",
        "RESULT": "WON"
      }
    },
    {
      "event_type": "LINEOUT",
      "team": "RIVAL",
      "player": "Unknown",
      "timestamp_sec": 245.2,
      "x": 85,
      "y": 30,
      "extra_data": {
        "EQUIPO": "RIVAL",
        "RESULT": "LOST"
      }
    }
    // ... más eventos
  ],
  "event_count": 270,
  "event_types": [
    "LINEOUT",
    "SCRUM",
    "TRY",
    "PENALTY",
    "KICK",
    "TACKLE"
  ],
  "players": [
    "Marco Rossi",
    "Luca Bianchi",
    "Giovanni Verdi",
    "Unknown"
  ],
  
  // ⬇️ NUEVO: Información de equipos detectados
  "team_detection": {
    "detected_teams": [
      {
        "name": "PESCARA",
        "count": 150,
        "is_likely_opponent": false,
        "sample_events": [
          {
            "event_type": "LINEOUT",
            "team": "PESCARA",
            "timestamp_sec": 120.5,
            "extra_data": {"RESULT": "WON"}
          },
          {
            "event_type": "SCRUM",
            "team": "PESCARA",
            "timestamp_sec": 350.2,
            "extra_data": {"RESULT": "WON"}
          },
          {
            "event_type": "TRY",
            "team": "PESCARA",
            "timestamp_sec": 1200.8,
            "extra_data": {"PLAYER": "Marco Rossi"}
          }
        ]
      },
      {
        "name": "RIVAL",
        "count": 120,
        "is_likely_opponent": true,
        "sample_events": [
          {
            "event_type": "LINEOUT",
            "team": "RIVAL",
            "timestamp_sec": 245.2,
            "extra_data": {"RESULT": "LOST"}
          },
          {
            "event_type": "PENALTY",
            "team": "RIVAL",
            "timestamp_sec": 890.5,
            "extra_data": {}
          }
        ]
      }
    ],
    "total_events_with_team": 270,
    "suggested_our_team": "PESCARA",
    "suggested_opponent": "RIVAL"
  }
}
```

## Interpretación para el Frontend

### 1. Mostrar Equipos Detectados
```typescript
interface TeamDetection {
  detected_teams: DetectedTeam[];
  total_events_with_team: number;
  suggested_our_team: string;
  suggested_opponent: string;
}

interface DetectedTeam {
  name: string;
  count: number;
  is_likely_opponent: boolean;
  sample_events: Event[];
}

// Renderizar en UI:
// 
// Equipos Detectados (270 eventos totales)
// 
// 📊 PESCARA
//    - 150 eventos (55.6%)
//    - Sugerido: Nuestro Equipo ⭐
//    - Ejemplos: LINEOUT (WON), SCRUM (WON), TRY
// 
// 📊 RIVAL
//    - 120 eventos (44.4%)
//    - Sugerido: Oponente ⚠️
//    - Ejemplos: LINEOUT (LOST), PENALTY
```

### 2. UI de Mapeo (Mockup)
```
┌────────────────────────────────────────────────────────┐
│ Mapeo de Equipos                                       │
├────────────────────────────────────────────────────────┤
│                                                        │
│ Nuestro Equipo                                         │
│ ┌──────────────────────────────────────────────────┐ │
│ │ PESCARA (150 eventos) ⭐ Sugerido                │ │
│ └──────────────────────────────────────────────────┘ │
│                                                        │
│ Mapear a:                                              │
│ ┌──────────────────────────────────────────────────┐ │
│ │ ▼ Pescara (Senior 2025)                ✓        │ │
│ └──────────────────────────────────────────────────┘ │
│                                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│ Equipo Oponente                                        │
│ ┌──────────────────────────────────────────────────┐ │
│ │ RIVAL (120 eventos) ⚠️ Probablemente oponente   │ │
│ └──────────────────────────────────────────────────┘ │
│                                                        │
│ Mapear a:                                              │
│ ○ Equipo existente                                     │
│   ┌────────────────────────────────────────────────┐ │
│   │ ▼ Seleccionar...                              │ │
│   └────────────────────────────────────────────────┘ │
│                                                        │
│ ● Crear nuevo equipo oponente                         │
│   ┌────────────────────────────────────────────────┐ │
│   │ CASI                                           │ │
│   └────────────────────────────────────────────────┘ │
│                                                        │
├────────────────────────────────────────────────────────┤
│                        [Cancelar]  [Continuar Import] │
└────────────────────────────────────────────────────────┘
```

### 3. Payload de Importación Final
```typescript
const teamMapping = {
  our_team: {
    team_id: 18,  // ID del equipo "Pescara" seleccionado
    name: "Pescara",
    detected_name: "PESCARA"  // Nombre original del XML
  },
  opponent: {
    team_id: null,  // null = crear nuevo
    name: "CASI",  // Nombre ingresado por usuario
    detected_name: "RIVAL",  // Nombre original del XML
    is_new: true
  }
};

// Llamar a:
POST /api/import/xml
{
  filename: "20251025_1ra_San_Luis_vs_San_Cirano.xml",
  profile: {...},
  discard_categories: ["END", "WARMUP", "TIMEOUT"],
  team_mapping: teamMapping
}
```

## Casos de Uso

### Caso 1: Nombres Estándar (PESCARA vs RIVAL)
- **Detectado**: `PESCARA` (150), `RIVAL` (120)
- **Sugerencia**: our_team=PESCARA, opponent=RIVAL
- **Usuario**: Confirma y mapea a equipos de BD
- **Resultado**: Importación con mapeo correcto

### Caso 2: Nombres Reales (SAN LUIS vs CASI)
- **Detectado**: `SAN LUIS` (200), `CASI` (180)
- **Sugerencia**: our_team=SAN LUIS (más eventos), opponent=CASI
- **Usuario**: Mapea SAN LUIS a team_id=22, crea "CASI" como oponente
- **Resultado**: Ambos equipos identificados correctamente

### Caso 3: Múltiples Nombres (Error en XML)
- **Detectado**: `PESCARA` (100), `RIVAL` (80), `Grupo 57` (10)
- **Sugerencia**: our_team=PESCARA, opponent=RIVAL
- **Usuario**: Ve que "Grupo 57" tiene pocos eventos, lo ignora
- **Resultado**: Mapeo limpio a PESCARA y RIVAL

### Caso 4: Solo Un Equipo
- **Detectado**: `PESCARA` (270)
- **Sugerencia**: our_team=PESCARA, opponent=null
- **Usuario**: Mapea PESCARA, deja oponente vacío o ingresa manualmente
- **Resultado**: Partido importado, opponent_name genérico

## Validaciones en Frontend

```typescript
function validateTeamMapping(teamDetection: TeamDetection): string[] {
  const errors: string[] = [];
  
  // Debe haber al menos un equipo
  if (teamDetection.detected_teams.length === 0) {
    errors.push("No se detectaron equipos en el archivo");
  }
  
  // El usuario debe seleccionar nuestro equipo
  if (!selectedOurTeam) {
    errors.push("Debes seleccionar nuestro equipo");
  }
  
  // Si hay oponente detectado, debe mapearse
  if (teamDetection.suggested_opponent && !selectedOpponent) {
    errors.push("Se detectó un oponente, debes mapearlo o crear uno nuevo");
  }
  
  // Si se crea nuevo oponente, debe tener nombre
  if (createNewOpponent && !newOpponentName.trim()) {
    errors.push("Ingresa el nombre del equipo oponente");
  }
  
  return errors;
}
```

## Flujo Completo (Diagrama)

```
Usuario sube XML
      ↓
POST /api/import/preview?profile=LongoMatch
      ↓
Backend normaliza XML
      ↓
detect_teams_in_events(events)
      ↓
Retorna: match_info + events + team_detection
      ↓
Frontend muestra TeamMappingPreview
      ↓
Usuario confirma/edita mapeo
      ↓
Frontend construye team_mapping object
      ↓
POST /api/import/xml con team_mapping
      ↓
Backend crea equipos con is_opponent=True
      ↓
Normaliza eventos según mapeo
      ↓
Inserta match y events en BD
      ↓
✅ Importación completa
      ↓
Charts funcionan correctamente
```

## Beneficios

✅ **Sin ambigüedad**: Usuario ve exactamente qué equipos hay en el XML  
✅ **Validación visual**: Eventos de muestra muestran qué contiene cada equipo  
✅ **Sugerencias inteligentes**: Sistema sugiere mapeo automático  
✅ **Flexibilidad**: Usuario puede editar si la sugerencia es incorrecta  
✅ **Datos limpios**: Nombres reales de oponentes en BD, no "RIVAL"  
✅ **Trazabilidad**: `detected_name` permite auditar el mapeo  

---

**Próximo paso**: Implementar `TeamMappingPreview.tsx` component
