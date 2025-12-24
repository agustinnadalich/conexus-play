# 🐳 Docker Setup - ConexusPlay

## Arquitectura Local con Docker

```
┌─────────────────────────────────────────┐
│  conexus-play-frontend (Node 20)        │
│  Puerto: 3000                           │
│  API: http://backend:5001/api           │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  conexus-play-backend (Python 3.11)     │
│  Puerto: 5001                           │
│  DB: postgresql://db:5432               │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  conexus-play-db (PostgreSQL 13)        │
│  Puerto: 5432                           │
│  Volumen: videoanalysis_postgres-data   │
└─────────────────────────────────────────┘
```

## Comandos Rápidos

```bash
# Iniciar todos los servicios
docker-compose up -d

# Ver logs en tiempo real
docker-compose logs -f

# Reiniciar un servicio específico
docker-compose restart frontend
docker-compose restart backend

# Reconstruir después de cambios en dependencias
docker-compose up -d --build frontend
docker-compose up -d --build backend

# Detener todos los servicios
docker-compose down

# Detener y eliminar volúmenes (⚠️ BORRA DATOS)
docker-compose down -v
```

## Acceso a los Servicios

| Servicio | URL Local | Puerto |
|----------|-----------|--------|
| Frontend | http://localhost:3000 | 3000 |
| Backend API | http://localhost:5001 | 5001 |
| PostgreSQL | localhost:5432 | 5432 |

## Variables de Entorno

### Para Docker Local (.env)
- Usado por `docker-compose.yml`
- Credenciales locales no seguras
- Admin: `admin@conexusplay.local` / `Admin123!`
- JWT_SECRET local (no usar en producción)

### Para Desarrollo Local sin Docker (frontend/.env.local)
- Usado cuando ejecutas `npm run dev` localmente
- Apunta al backend de Railway staging
- No commitear este archivo

## Estructura de Containers

### conexus-play-frontend
- **Imagen**: Node 20
- **Build**: `frontend/Dockerfile`
- **Volumen**: `./frontend:/app` (hot reload)
- **Red**: Accede al backend como `http://backend:5001`

### conexus-play-backend
- **Imagen**: Python 3.11
- **Build**: `backend/Dockerfile`
- **Volumen**: `./backend:/app` (hot reload)
- **Red**: Accede a DB como `postgresql://db:5432`

### conexus-play-db
- **Imagen**: PostgreSQL 13
- **Volumen**: `videoanalysis_postgres-data` (persistente)
- **Datos**: Sobreviven a `docker-compose down`

## Troubleshooting

### ❌ Error: "Could not resolve react-is"
```bash
cd frontend
npm install react-is
docker-compose up -d --build frontend
```

### ❌ Error: "Port already in use"
```bash
# Ver qué proceso usa el puerto
lsof -i :3000  # o :5001, :5432

# Detener otros containers
docker-compose down

# Cambiar puerto en docker-compose.yml
ports:
  - "3001:3000"  # usa 3001 externamente
```

### ❌ Frontend no conecta con Backend
Verificar que la variable en `docker-compose.yml` sea:
```yaml
VITE_API_BASE_URL=http://backend:5001/api  # ✅ Correcto
# NO usar localhost dentro de Docker
```

### ❌ "Error connecting to database"
```bash
# Verificar que la DB está healthy
docker-compose ps

# Ver logs de la DB
docker-compose logs db

# Recrear el container de backend
docker-compose restart backend
```

### 🔍 Inspeccionar un Container
```bash
docker exec -it conexus-play-backend bash
docker exec -it conexus-play-frontend sh
docker exec -it conexus-play-db psql -U videoanalysis_db_user -d videoanalysis_db
```

## Limpieza y Reset

### Eliminar containers pero mantener datos
```bash
docker-compose down
docker-compose up -d
```

### Reset completo (⚠️ BORRA TODO)
```bash
docker-compose down -v
docker volume rm videoanalysis_postgres-data
docker-compose up -d
```

### Limpiar imágenes viejas
```bash
docker image prune -a
docker system prune -a
```

## Notas Importantes

1. **Volumen de PostgreSQL**: Se llama `videoanalysis_postgres-data` por razones históricas. Los datos persisten entre reinicios.

2. **Hot Reload**: Los cambios en código se reflejan automáticamente sin reconstruir (frontend y backend).

3. **node_modules en Frontend**: El volumen anónimo `/app/node_modules` evita que se sobrescriba con tu carpeta local.

4. **Networking**: Los servicios se comunican por nombre (`backend`, `db`), no por `localhost`.

5. **Producción**: Este setup es solo para desarrollo. Ver `docker-compose.prod.yml` para producción.
