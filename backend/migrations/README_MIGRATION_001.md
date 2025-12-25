# Guía de Migración de Base de Datos

## Migración 001: Añadir campo `is_opponent` a la tabla `teams`

### 📋 Resumen
Esta migración añade un campo booleano `is_opponent` a la tabla `teams` para distinguir entre equipos propios (FALSE) y equipos rivales (TRUE).

### 🎯 Objetivo
Permitir almacenar equipos rivales dentro de cada club con su nombre real, en lugar de usar el genérico "OPPONENT", mejorando la calidad de los datos y análisis.

### 📊 Impacto
- **Tablas afectadas**: `teams`
- **Cambios**: 
  - Nueva columna: `is_opponent BOOLEAN NOT NULL DEFAULT FALSE`
  - Nuevo índice: `idx_teams_club_opponent(club_id, is_opponent)`
- **Datos existentes**: Todos los equipos existentes se marcarán como `is_opponent = FALSE`
- **Downtime**: No requiere downtime
- **Backward compatible**: Sí (aplicaciones antiguas ignorarán el campo)

---

## 🚀 Aplicación en LOCAL

### Opción 1: Desde contenedor Docker
```bash
# 1. Verificar que el contenedor está corriendo
docker ps | grep conexus-play-db

# 2. Ejecutar migración
docker exec -i conexus-play-db psql -U admin -d videoanalysis < backend/migrations/add_is_opponent_to_teams.sql

# 3. Verificar resultado (debería mostrar ✅)
```

### Opción 2: Desde host (si tienes psql instalado)
```bash
# Ejecutar migración
psql postgresql://admin:changeme@localhost:5432/videoanalysis -f backend/migrations/add_is_opponent_to_teams.sql
```

### Verificación Local
```sql
-- Conectar a la base de datos
psql postgresql://admin:changeme@localhost:5432/videoanalysis

-- Verificar que la columna existe
\d teams

-- Verificar que los equipos existentes tienen is_opponent = FALSE
SELECT id, name, is_opponent FROM teams LIMIT 5;

-- Verificar el índice
\di idx_teams_club_opponent
```

---

## 🌐 Aplicación en STAGE (Railway)

### Pre-requisitos
1. Hacer backup de la base de datos
2. Verificar que tienes acceso a Railway CLI o Dashboard
3. Notificar al equipo sobre la migración

### Paso 1: Backup de Seguridad
```bash
# Desde Railway CLI (si está instalado)
railway run pg_dump $DATABASE_URL > backup_pre_migration_001_$(date +%Y%m%d_%H%M%S).sql

# O desde Railway Dashboard:
# Settings → Database → Backup → Create Manual Backup
```

### Paso 2: Probar en Stage
```bash
# 1. Conectar a Railway
railway login

# 2. Seleccionar proyecto y environment stage
railway environment stage

# 3. Ejecutar migración
railway run psql $DATABASE_URL < backend/migrations/add_is_opponent_to_teams.sql
```

### Paso 3: Verificar en Stage
```bash
# Conectar y verificar
railway run psql $DATABASE_URL

# Ejecutar verificaciones
\d teams
SELECT COUNT(*), is_opponent FROM teams GROUP BY is_opponent;
```

### Paso 4: Reiniciar Backend (si es necesario)
```bash
railway restart backend
```

---

## 🏭 Aplicación en PRODUCCIÓN (cuando esté disponible)

### ⚠️ IMPORTANTE: Checklist Pre-Producción

- [ ] Migración probada y verificada en LOCAL
- [ ] Migración probada y verificada en STAGE
- [ ] Backup completo de base de datos de producción
- [ ] Ventana de mantenimiento coordinada (si aplica)
- [ ] Rollback plan revisado y listo
- [ ] Monitoreo activo preparado
- [ ] Equipo notificado

### Proceso en Producción

1. **Backup Crítico**
   ```bash
   # Crear backup completo
   railway environment production
   railway run pg_dump $DATABASE_URL > backup_prod_pre_001_$(date +%Y%m%d_%H%M%S).sql
   
   # Verificar tamaño del backup
   ls -lh backup_prod_pre_001_*.sql
   ```

2. **Aplicar Migración**
   ```bash
   # Ejecutar con logging detallado
   railway run psql $DATABASE_URL < backend/migrations/add_is_opponent_to_teams.sql | tee migration_001_log.txt
   ```

3. **Verificación Inmediata**
   ```bash
   railway run psql $DATABASE_URL
   
   -- Verificar estructura
   \d teams
   
   -- Verificar datos
   SELECT COUNT(*) as total_teams,
          SUM(CASE WHEN is_opponent = FALSE THEN 1 ELSE 0 END) as own_teams,
          SUM(CASE WHEN is_opponent = TRUE THEN 1 ELSE 0 END) as opponent_teams
   FROM teams;
   ```

4. **Monitoreo Post-Migración**
   - Verificar logs de aplicación
   - Verificar que no hay errores de consultas
   - Validar funcionalidad en UI

---

## 🔙 Rollback (En caso de problemas)

### Cuándo hacer rollback:
- Si la migración falla
- Si se detectan errores en la aplicación
- Si los datos no son consistentes

### Proceso de Rollback

```bash
# LOCAL
psql postgresql://admin:changeme@localhost:5432/videoanalysis -f backend/migrations/rollback_001_add_is_opponent_to_teams.sql

# STAGE
railway environment stage
railway run psql $DATABASE_URL < backend/migrations/rollback_001_add_is_opponent_to_teams.sql

# PRODUCCIÓN (solo si es absolutamente necesario)
railway environment production
railway run psql $DATABASE_URL < backend/migrations/rollback_001_add_is_opponent_to_teams.sql
```

### Después del Rollback
1. Investigar causa del problema
2. Corregir script de migración
3. Probar nuevamente en LOCAL y STAGE
4. Documentar lecciones aprendidas

---

## 📝 Notas Importantes

### Seguridad
- La migración incluye verificaciones automáticas
- Es idempotente (se puede ejecutar múltiples veces sin problemas)
- No elimina ni modifica datos existentes
- El rollback está probado y documentado

### Performance
- El índice nuevo mejorará las consultas de opponents por club
- No hay impacto significativo en performance durante la migración
- La tabla `teams` típicamente tiene pocos registros

### Compatibilidad
- **Backend antiguo**: Funcionará normalmente, ignorará el campo
- **Backend nuevo**: Requiere este campo para funcionalidad de opponents
- **Queries existentes**: No se ven afectados

---

## 🧪 Testing Post-Migración

### Test 1: Crear equipo propio
```sql
INSERT INTO teams (club_id, name, is_opponent) 
VALUES (1, 'Test Team Own', FALSE);
```

### Test 2: Crear equipo rival
```sql
INSERT INTO teams (club_id, name, is_opponent) 
VALUES (1, 'Test Opponent', TRUE);
```

### Test 3: Consultar opponents
```sql
SELECT * FROM teams 
WHERE club_id = 1 AND is_opponent = TRUE;
```

### Test 4: Verificar índice funciona
```sql
EXPLAIN ANALYZE 
SELECT * FROM teams 
WHERE club_id = 1 AND is_opponent = TRUE;
-- Debería usar idx_teams_club_opponent
```

---

## 📞 Contacto en caso de problemas

Si encuentras algún problema durante la migración:

1. **NO entres en pánico**
2. Ejecuta el rollback siguiendo las instrucciones
3. Documenta el error exacto (mensaje, logs, screenshots)
4. Revisa los backups disponibles
5. Contacta al equipo de desarrollo

---

## ✅ Checklist Final

### Antes de aplicar en STAGE/PROD
- [ ] Script probado en LOCAL
- [ ] Rollback probado en LOCAL
- [ ] Backup creado
- [ ] Equipo notificado
- [ ] Documentación revisada

### Después de aplicar
- [ ] Migración exitosa confirmada
- [ ] Verificaciones SQL ejecutadas
- [ ] Aplicación funcionando correctamente
- [ ] Logs revisados
- [ ] Backup post-migración (opcional pero recomendado)
- [ ] Documentación actualizada con fecha de aplicación

---

**Última actualización**: 2024-12-25  
**Versión de migración**: 001  
**Estado**: Ready for deployment
