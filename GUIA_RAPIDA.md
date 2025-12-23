# GUÍA RÁPIDA - Sistema VideoAnalysis

## 🚀 Inicio Rápido

### Iniciar Todo el Sistema (Desarrollo)
```bash
docker compose up -d
```

### Ver Logs
```bash
docker compose logs -f
```

### Detener Todo
```bash
docker compose down
```

### Acceder
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5001
- **Login**: admin@videoanalysis.com / Admin123!

## 📁 Estructura de Archivos

### Configuración
- **`.env`** - ÚNICA fuente de verdad para todas las credenciales
- **`docker-compose.yml`** - Configuración principal (desarrollo)

### Datos
- **`db_backups/`** - Backups automáticos de la base de datos
- **Volumen**: `videoanalysis_postgres-data` - Contiene todos tus datos

## 🔧 Comandos Útiles

### Desarrollo Diario
```bash
# Iniciar
docker compose up -d

# Ver logs de un servicio específico
docker compose logs -f backend
docker compose logs -f frontend

# Reiniciar un servicio
docker compose restart backend

# Ver estado
docker compose ps
```

### Base de Datos
```bash
# Acceder a PostgreSQL
docker compose exec db psql -U videoanalysis_db_user -d videoanalysis_db

# Ver cantidad de datos
docker compose exec db psql -U videoanalysis_db_user -d videoanalysis_db \
  -c "SELECT COUNT(*) FROM matches;"

# Backup manual
docker compose exec db pg_dump -U videoanalysis_db_user -d videoanalysis_db \
  > backup_$(date +%Y%m%d).sql
```

### Cambiar Configuración
1. Editar **`.env`**
2. Reiniciar: `docker compose restart`

## ⚠️ Importante

- **NUNCA** cambiar credenciales en docker-compose directamente
- **SIEMPRE** cambiar en `.env` primero
- **Hacer backup** antes de cambios grandes
