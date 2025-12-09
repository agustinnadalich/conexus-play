# Cobertura de Estadísticas vs Requerimientos

Matriz rápida de qué ya muestra la app (frontend actual) y qué falta implementar o enriquecer. Se asume que los datos estén presentes en XML/Excel/CSV o se carguen manualmente.

| Bloque | ¿Mostrado hoy? | Dónde/Chart | Faltante clave |
| --- | --- | --- | --- |
| Datos generales | Parcial | `HeaderPartido` (equipos, marcador, fecha, torneo, cancha, clima, árbitro) | Asistentes de árbitro, público |
| Puntos totales | Sí | `points` tab: PlayerPointsChart, PointsTimeChart, PointsTypeChart | Posición en cancha de cada punto |
| Tries | Parcial | `tries` tab: por jugador, tiempo, fases; origen sólo si TRY_ORIGIN existe | Origen calculado robusto, tipo de quiebre, ubicaciones, fases hasta try cuando no vienen |
| Patadas a los palos | Parcial | `goalkicks` tab: efectividad equipo/rival, por jugador, por tiempo | Tipo (penal/conversión/drop), posición, distancia/ángulo, condiciones (viento/estado) |
| Posesión | No | — | Juego con/sin posesión, duración, fases por posesión, origen/fin, zonas inicio/fin |
| Tackles | Parcial | `tackles` tab: realizados/errados, avance, tiempo, por jugador/equipo | Hombro interno/externo/doble, motivo de fallo (espacio/físico) |
| Penales | Parcial | `penalties` tab: por jugador, tiempo, causa | Posición en cancha, vínculo con tarjeta |
| Turnovers | Parcial | `turnovers` tab: rec/pérdidas por jugador, tipo, tiempo | Quién pierde vs quién recupera, posición |
| Quiebres de línea | Parcial | `linebreaks` tab: por jugador, tiempo, tipo, canal, resultado | Ubicación exacta, relación con fase/origen |
| Tarjetas | No | — | Amarillas/rojas por jugador/tiempo/causa/posición |
| Formaciones fijas | Parcial | `setpieces` tab: scrums/lineouts básicos | Tiempo, posición, avance scrum, resultado granular; lineout: nº jugadores, corto/medio/largo, lanzador/saltador/jugada |
| Pases | No | — | Totales, completados, fallidos |
| Errores | No | — | Knock-ons, pases adelantados |
| Rucks | No | — | Ganados/perdidos, velocidad, posición |
| Mauls | No | — | Ganados/perdidos, avance, posición |
| Patadas juego abierto | No | — | Tipo, resultado, metros, tiempo, posición; desglose por jugador |

