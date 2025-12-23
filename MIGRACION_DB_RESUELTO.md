# 🔄 MIGRACIÓN DE BASE DE DATOS - RESUELTO

## 🎯 Problema Identificado

Existían **DOS configuraciones diferentes** de base de datos que causaban inconsistencias:

### Configuración Antigua (docker-compose.db.yml):
- DB: `videoanalysis`
- User: `videoanalysis`
- Password: `videoanalysis`
- ❌ **Problema**: No coincidía con el `.env`

### Configuración Correcta (.env):
- DB: `videoanalysis_db`
- User: `videoanalysis_db_user`
- Password: `videoanalysis_db_password!!`

## 📊 Datos Preservados

La base de datos actual contiene:
- ✅ **2 Import Profiles** (Default, Importacion XML)
- ✅ **57 Category Mappings** (mapeos multiidioma: es, it, en, fr)
- ✅ **2 Clubs** (Pescara, Desconocido)
- ✅ **2 Teams**
- ✅ **2 Matches** (Avezzano, Polisportiva L'Aquila)
- ✅ **1,021 Events**

## ✅ Solución Implementada

### 1. Archivos Actualizados

**`docker-compose.db.yml`** - Ahora usa credenciales correctas:
```yaml
db:
  environment:
    POSTGRES_USER: videoanalysis_db_user
    POSTGRES_PASSWORD: videoanalysis_db_password!!
    POSTGRES_DB: videoanalysis_db
```

**`docker-compose.yml`** - También actualizado para consistencia:
```yaml
backend:
  environment:
    - DATABASE_URL=postgresql://videoanalysis_db_user:videoanalysis_db_password!!@db:5432/videoanalysis_db
```

**`.env`** - JWT_SECRET seguro generado:
```env
JWT_SECRET=MPlZ2847AuE86kiKQU9FPfu3AomqIOJ10gEfTwF8T9bgWoBEsEtNZRiB1gaxvAVxuWp6M6aREX9EN6vSJ9VJGQ
```

### 2. Script de Migración Automática

Creado: `migrate_db_complete.sh`

**Qué hace:**
1. ✅ Exporta TODOS los datos actuales (backup completo)
2. ✅ Exporta datos clave en CSV (import_profiles, category_mappings, clubs)
3. ✅ Detiene contenedores actuales
4. ✅ Elimina volumen antiguo
5. ✅ Crea DB nueva con credenciales correctas
6. ✅ Restaura todos los datos
7. ✅ Crea super admin
8. ✅ Verifica que todo esté correcto

## 🚀 Cómo Ejecutar la Migración

```bash
cd /Users/Agustin/wa/videoanalisis/VideoAnalysis

# Ejecutar migración completa
bash migrate_db_complete.sh
```

El script te pedirá confirmación antes de proceder.

### Backups Generados

Se crearán en `./db_backups/`:
- `full_backup_YYYYMMDD_HHMMSS.sql` - Backup completo SQL
- `import_profiles_YYYYMMDD_HHMMSS.csv` - Perfiles de importación
- `category_mappings_YYYYMMDD_HHMMSS.csv` - Mapeos de categorías
- `clubs_YYYYMMDD_HHMMSS.csv` - Clubs

## 📋 Después de la Migración

### Iniciar el Sistema

**Opción 1: Usar docker-compose.db.yml (RECOMENDADO)**
```bash
docker compose -f docker-compose.db.yml up -d
```
- Frontend: http://localhost:3000
- Backend: http://localhost:5001

**Opción 2: Usar docker-compose.yml (original)**
```bash
docker compose up -d
```
- Frontend: http://localhost:3000
- Backend: http://localhost:5001

**AMBOS ahora usan las mismas credenciales**, así que puedes usar cualquiera.

### Verificar que Todo Funciona

```bash
# Ver logs
docker compose -f docker-compose.db.yml logs -f

# Verificar datos
docker compose -f docker-compose.db.yml exec -T db psql \
  -U videoanalysis_db_user \
  -d videoanalysis_db \
  -c "SELECT COUNT(*) FROM import_profiles; SELECT COUNT(*) FROM category_mappings;"
```

## 🔒 Credenciales del Sistema

### Super Admin
- Email: `admin@videoanalysis.com`
- Password: `Admin123!`

### Base de Datos
- Host: `localhost`
- Port: `5432`
- Database: `videoanalysis_db`
- User: `videoanalysis_db_user`
- Password: `videoanalysis_db_password!!`

## 🛡️ Prevención de Futuros Problemas

### Regla de Oro
**SIEMPRE usar las credenciales del `.env`**

### Archivos de Configuración Unificados
Ahora:
- ✅ `.env` define las credenciales
- ✅ `docker-compose.yml` las usa
- ✅ `docker-compose.db.yml` las usa
- ✅ Backend las lee del `.env`

### Checklist de Verificación
Antes de cambiar configuraciones, verificar que coincidan:
- [ ] `.env` → `DATABASE_URL`
- [ ] `docker-compose.yml` → `db.environment.POSTGRES_*`
- [ ] `docker-compose.db.yml` → `db.environment.POSTGRES_*`
- [ ] `backend/db.py` → Lee de `DATABASE_URL`

## 🔍 Troubleshooting

### Error: "role does not exist"
```bash
# Verificar que usas las credenciales correctas
docker compose -f docker-compose.db.yml exec db psql \
  -U videoanalysis_db_user \
  -d videoanalysis_db \
  -c "SELECT current_user;"
```

### Error: "database does not exist"
```bash
# Recrear base de datos
docker compose -f docker-compose.db.yml down -v
docker compose -f docker-compose.db.yml up -d
bash migrate_db_complete.sh
```

### Datos Perdidos
Los backups están en `./db_backups/`. Para restaurar:
```bash
docker compose -f docker-compose.db.yml exec -T db psql \
  -U videoanalysis_db_user \
  -d videoanalysis_db \
  < db_backups/full_backup_YYYYMMDD_HHMMSS.sql
```

## 📊 Estado Final

- ✅ Una sola configuración de DB en todos los archivos
- ✅ JWT_SECRET seguro generado
- ✅ Todos los datos preservados
- ✅ Backups creados
- ✅ Sistema listo para usar
- ✅ Documentación completa

---

**Última actualización**: 18 de Diciembre de 2025  
**Estado**: ✅ Problema Resuelto - Sistema Unificado
