# 📚 Índice de Documentación - Sistema de Importación MVP

**Fecha**: 28 de octubre de 2025  
**Proyecto**: VideoAnalysis  
**Branch**: base_de_datos  
**Estado**: Documentación completa generada

---

## 🎯 Propósito

Este conjunto de documentos proporciona una **guía completa** para entender, implementar y extender el sistema de importación de datos del MVP de VideoAnalysis. Está diseñado para desarrolladores que necesiten:

- Entender la arquitectura del sistema de importación
- Implementar nuevos formatos de datos
- Mantener y debuggear el código existente
- Extender funcionalidades con nuevas features

---

## 📄 Documentos Generados

### 1. ESTRATEGIA_IMPORTACION_MVP.md

**Propósito**: Visión general de alto nivel del sistema de importación

**Audiencia**: Product owners, arquitectos, desarrolladores nuevos en el proyecto

**Contenido**:
- Resumen ejecutivo de objetivos y estrategia
- Flujo de importación en 5 fases (Upload → Preview → Filter → Enrich → Save)
- Conceptos clave (Game_Time, Períodos, Perfiles)
- Sistema de perfiles configurables
- Implementación actual (frontend + backend)
- TODO con prioridades claras
- Decisiones de diseño importantes

**Cuándo leer**: 
- Primera vez trabajando con importación
- Necesitas entender el big picture
- Vas a diseñar una nueva feature relacionada

**Siguiente lectura**: `TODO_IMPORTACION.md` para tareas concretas

---

### 2. TODO_IMPORTACION.md

**Propósito**: Roadmap detallado de implementación con sprints priorizados

**Audiencia**: Desarrolladores implementando features, project managers

**Contenido**:
- Estado actual (completado, parcial, pendiente)
- 4 sprints organizados por prioridad
  - **Sprint 1**: Fundamentos (crítico) - Refactor enricher, perfiles en BD, tiempos manuales
  - **Sprint 2**: UX y validaciones (media) - Labels, preview estadístico
  - **Sprint 3**: Testing (media) - Unit tests, integration tests
  - **Sprint 4**: Features avanzados (baja) - Detección automática, importación incremental
- Criterios de aceptación para cada tarea
- Estimaciones de tiempo
- Métricas de éxito
- Bloqueadores conocidos

**Cuándo leer**:
- Vas a empezar a implementar
- Necesitas estimar esfuerzo
- Quieres priorizar tareas

**Siguiente lectura**: Código específico según la tarea que elijas

---

### 3. EJEMPLOS_IMPORTACION.md

**Propósito**: Casos prácticos con código real y datos reales

**Audiencia**: Desarrolladores implementando, testers, analistas de datos

**Contenido**:
- **Ejemplo 1**: XML Pescara vs Avezzano (paso a paso completo)
  - Archivo original → Normalización → Preview → Enriquecimiento → BD
  - Código de cada fase
  - Datos de entrada y salida
- **Ejemplo 2**: Excel San Benedetto
  - Estructura de hojas (MATRIZ, MATCHES)
  - Perfil específico con mapeo de columnas
- **Ejemplo 3**: Perfil con Tiempos Manuales
  - UI para ingresar tiempos
  - Validaciones
  - Enriquecimiento manual
- Casos especiales (tiempo extra, GPS, labels sin group)
- Comandos de testing

**Cuándo leer**:
- Necesitas ver código concreto
- Estás debuggeando un problema
- Quieres entender el flujo con datos reales
- Vas a crear tests

**Siguiente lectura**: `ANALISIS_XML_PESCARA.md` para el caso específico actual

---

### 4. ANALISIS_XML_PESCARA.md

**Propósito**: Análisis exhaustivo del XML de ejemplo actual

**Audiencia**: Analistas, desarrolladores implementando XML import, testers

**Contenido**:
- Resumen del archivo (11,038 líneas, 590 eventos)
- Distribución completa de eventos (19 categorías)
- Sistema de labels (17 grupos detectados)
- Labels sin grupo identificados (T1D, T2B, etc.)
- Análisis de coordenadas geográficas
- Estructura detallada con ejemplos de cada tipo de evento
- Jugadores detectados
- Estrategia de importación específica
- Proceso paso a paso con este archivo
- Análisis táctico posible
- Desafíos identificados
- Recomendaciones finales

**Cuándo leer**:
- Vas a importar este archivo específico
- Necesitas entender qué información contiene
- Estás diseñando el análisis táctico
- Quieres validar que la importación funcionó correctamente

**Siguiente lectura**: Código en `normalizer.py` para ver cómo se parsea

---

## 🔄 Flujo de Lectura Recomendado

### Para Desarrolladores Nuevos

```
1. ESTRATEGIA_IMPORTACION_MVP.md
   ↓ (Entender el sistema completo)
   
2. ANALISIS_XML_PESCARA.md  
   ↓ (Ver datos reales y qué se puede extraer)
   
3. EJEMPLOS_IMPORTACION.md
   ↓ (Ver código paso a paso)
   
4. TODO_IMPORTACION.md
   ↓ (Elegir una tarea para implementar)
   
5. Código fuente (normalizer.py, enricher.py, etc.)
```

### Para Product Owners / Managers

```
1. ESTRATEGIA_IMPORTACION_MVP.md (Sección: Resumen Ejecutivo)
   ↓
   
2. TODO_IMPORTACION.md (Sección: Sprints y Estimaciones)
   ↓
   
3. ANALISIS_XML_PESCARA.md (Sección: Análisis Táctico Posible)
   ↓
   
4. Decisión sobre prioridades
```

### Para Testers / QA

```
1. EJEMPLOS_IMPORTACION.md (Ver casos de prueba)
   ↓
   
2. ANALISIS_XML_PESCARA.md (Datos de prueba específicos)
   ↓
   
3. TODO_IMPORTACION.md (Sprint 3: Testing)
   ↓
   
4. Crear test plan
```

### Para Analistas de Datos / Sports Analysts

```
1. ANALISIS_XML_PESCARA.md (Toda la sección)
   ↓
   
2. ESTRATEGIA_IMPORTACION_MVP.md (Sección: Conceptos Clave)
   ↓
   
3. EJEMPLOS_IMPORTACION.md (Ver qué datos se extraen)
   ↓
   
4. Definir nuevas métricas a calcular
```

---

## 🗂️ Estructura del Código Relacionado

### Backend

```
backend/
├── normalizer.py          # Parseo de XML/Excel → JSON unificado
├── enricher.py            # Cálculo de períodos, Game_Time, métricas
├── importer.py            # Inserción en PostgreSQL
├── models.py              # Esquema de BD (Club, Team, Match, Event, etc.)
├── db.py                  # Configuración SQLAlchemy
└── routes/
    ├── import_routes.py   # Endpoints /api/import/*
    ├── matches.py         # Endpoints /api/matches/*
    └── profiles.py        # Endpoints /api/import/profiles/* (TODO)
```

### Frontend

```
frontend/src/
├── pages/
│   ├── ImportMatch.tsx    # UI para upload y selección de perfil
│   └── PreviewImport.tsx  # Preview, filtrado y confirmación
└── utils/
    └── importUtils.ts     # Helpers para mapeo y validación (TODO)
```

---

## 📊 Resumen de Decisiones Técnicas

### Arquitectura General

- **Pipeline en 5 fases**: Upload → Preview → Filter → Enrich → Save
- **Perfiles configurables**: Un perfil por formato de datos
- **Normalización temprana**: Todo formato → JSON unificado
- **Enriquecimiento después de preview**: Usuario controla qué se importa

### Tecnologías

- **Backend**: Python 3.11 + Flask + SQLAlchemy + pandas (Excel) + xml.etree (XML)
- **Frontend**: React 19 + TypeScript + Vite + shadcn/ui
- **Base de Datos**: PostgreSQL 15 + JSONB para `extra_data`

### Patrones de Diseño

- **Strategy Pattern**: Perfiles determinan lógica de parseo
- **Pipeline Pattern**: Datos fluyen por fases secuenciales
- **Repository Pattern**: `importer.py` abstrae acceso a BD

---

## 🎯 Estado Actual del Proyecto

### ✅ Completado

- Frontend completo (ImportMatch + PreviewImport)
- Normalización de XML (LongoMatch/Nacsport)
- Normalización de Excel (formato San Benedetto)
- Inserción en PostgreSQL
- Esquema de BD completo
- Docker setup con PostgreSQL

### ⚠️ Parcial

- Enricher (funciona pero necesita refactor)
- Perfiles (hardcodeados, necesitan persistir en BD)
- Detección de períodos (básica, necesita validación)

### ❌ Pendiente

- Gestión de perfiles (CRUD)
- Tiempos manuales (UI completa)
- Labels sin group (sistema de mapeo)
- Validaciones comprehensivas
- Testing automatizado
- Documentación API (Swagger)

---

## 🚀 Próxima Acción Recomendada

Según prioridades del TODO:

**Sprint 1, Tarea 1.1**: Refactor de `enricher.py`

- **Motivo**: Código legacy con duplicación, bloqueador crítico
- **Estimación**: 4-6 horas
- **Impacto**: Desbloquea todo el resto del sistema
- **Archivos**: `backend/enricher.py`, `backend/normalizer.py`
- **Documentación**: `TODO_IMPORTACION.md` sección 1.1

**Alternativa (si prefieren frontend)**: 

**Sprint 1, Tarea 1.3**: UI para Tiempos Manuales

- **Motivo**: Necesario para perfiles sin eventos de control
- **Estimación**: 3-4 horas
- **Impacto**: Permite importar más formatos de XML
- **Archivos**: `frontend/src/pages/PreviewImport.tsx`
- **Documentación**: `TODO_IMPORTACION.md` sección 1.3

---

## 📚 Referencias Adicionales

### Documentos del Proyecto

- `.github/copilot-instructions.md` - Contexto general del proyecto
- `WORKFLOW.md` - Guía para trabajar entre branches (main vs base_de_datos)
- `REFACTORING_LOG.md` - Historial de cambios en enricher.py
- `Videoanalysis-Documentation.md` - Documentación general del MVP

### Código Relevante

- `backend/normalizer.py` - 924 líneas, funciones principales:
  - `normalize_xml_to_json()` 
  - `normalize_excel_to_json()`
  - `detect_periods_and_convert_times()`
  
- `backend/enricher.py` - Funciones principales:
  - `enrich_events()`
  - `calculate_game_time_from_zero()`
  - `assign_time_group()`

- `frontend/src/pages/PreviewImport.tsx` - 449 líneas, componente principal de preview

### Datos de Prueba

- `backend/uploads/20251019 Az-Pescara (2).xml` - 11,038 líneas, 590 eventos
- `backend/uploads/Matriz_San_Benedetto_24-25_ENG.xlsx` - Excel con MATRIZ y MATCHES
- `backend/uploads/SERIE_B_PRATO_match_2.xlsx` - Otro formato Excel

---

## 🤝 Cómo Contribuir

### 1. Entender el Sistema

Leer documentos en el orden recomendado para tu rol (ver arriba)

### 2. Elegir una Tarea

Revisar `TODO_IMPORTACION.md` y elegir según:
- Prioridad (crítica → baja)
- Habilidades (backend Python vs frontend React)
- Estimación de tiempo

### 3. Implementar

Seguir ejemplos en `EJEMPLOS_IMPORTACION.md` y criterios de aceptación en TODO

### 4. Testear

Usar archivo `20251019 Az-Pescara (2).xml` como caso de prueba estándar

### 5. Documentar

Actualizar los documentos correspondientes:
- Código nuevo → Agregar ejemplo a `EJEMPLOS_IMPORTACION.md`
- Feature completada → Marcar ✅ en `TODO_IMPORTACION.md`
- Decisión técnica → Documentar en `ESTRATEGIA_IMPORTACION_MVP.md`

### 6. Code Review

Checklist:
- [ ] Tests escritos y pasando
- [ ] Documentación actualizada
- [ ] Código sigue patrones existentes
- [ ] Sin console.logs o prints de debug
- [ ] Error handling implementado

---

## 📞 Contacto y Soporte

### Para Dudas sobre Documentación

Revisar primero el documento correspondiente. Si persiste la duda:
1. Buscar en el código fuente
2. Revisar commits relacionados en git
3. Consultar con el equipo

### Para Reportar Errores en Documentación

Crear issue con:
- Documento afectado
- Sección específica
- Error encontrado
- Corrección sugerida (si aplica)

---

## 🔄 Mantenimiento de Documentación

### Cuándo Actualizar

**ESTRATEGIA_IMPORTACION_MVP.md**:
- Cambio en arquitectura general
- Nueva decisión de diseño importante
- Refactor mayor de algún componente

**TODO_IMPORTACION.md**:
- Feature completada (marcar ✅)
- Nueva prioridad detectada
- Cambio en estimaciones

**EJEMPLOS_IMPORTACION.md**:
- Nueva funcionalidad con código
- Caso de uso nuevo
- Comando de testing agregado

**ANALISIS_XML_PESCARA.md**:
- Cambio en el archivo de prueba estándar
- Nueva categoría de evento detectada
- Descubrimiento de nuevo patrón en datos

### Versionado

- **Versión**: Incluida en footer de cada documento
- **Última actualización**: Fecha en header
- **Changelog**: No necesario (usar git history)

---

## 🎓 Glosario

### Términos Técnicos

- **Event**: Acción individual en el partido (tackle, penalty, etc.)
- **Match**: Partido completo con metadata y eventos
- **Profile**: Configuración para parsear un formato específico
- **Normalizer**: Módulo que convierte formato fuente → JSON unificado
- **Enricher**: Módulo que calcula datos derivados (períodos, Game_Time)
- **Importer**: Módulo que persiste en PostgreSQL

### Términos de Rugby

- **RUCK**: Fase de contacto después de un tackle
- **LINEOUT**: Saque lateral (touch)
- **SCRUM**: Formación fija (melé)
- **TURNOVER**: Cambio de posesión
- **BREAK**: Quiebre de línea defensiva

### Conceptos del Sistema

- **Game_Time**: Tiempo relativo del juego (00:00 - 40:00 por período)
- **Timestamp**: Tiempo absoluto del video (segundos desde inicio)
- **Period**: Tiempo del partido (1 = primer tiempo, 2 = segundo tiempo)
- **Time Group**: Cuartos del partido para análisis granular
- **Label**: Descriptor adicional de un evento (jugador, tipo, resultado)

---

## ✅ Checklist de Documentación Completa

- [x] Estrategia general documentada
- [x] TODO con sprints priorizados
- [x] Ejemplos prácticos con código
- [x] Análisis del archivo de prueba
- [x] Índice de navegación creado
- [x] Flujos de lectura por rol definidos
- [x] Referencias a código incluidas
- [x] Glosario de términos agregado
- [x] Guidelines de contribución documentadas
- [x] Mantenimiento de docs explicado

---

**¡La documentación está completa y lista para usar! 🎉**

Próximo paso: Elegir una tarea del `TODO_IMPORTACION.md` y comenzar a implementar.

**Recomendación**: Empezar con **Sprint 1, Tarea 1.1 - Refactor de enricher.py**

---

**Última actualización**: 28 de octubre de 2025  
**Autor**: Análisis conjunto Agustin + GitHub Copilot  
**Versión de documentación**: 1.0
