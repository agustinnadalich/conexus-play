# 🏉 VideoAnalysis - Sistema de Análisis de Rugby

Sistema completo para análisis de partidos de rugby con importación de datos, gestión de usuarios y visualización de eventos.

## ✅ Configuración FINAL - Mejores Prácticas

### 📁 Archivos de Configuración

```
.env                    ← ⭐ ÚNICA fuente de verdad (editar SOLO este archivo)
docker-compose.yml      ← ⭐ Configuración principal (USAR ESTE)
docker-compose.db.yml   ← ⚠️  Legacy (puede ignorarse o eliminarse)
```

### 🎯 Regla de Oro

**SOLO usa `docker-compose.yml` + `.env`**

- ✅ `.env` → Define todas las credenciales y configuraciones
- ✅ `docker-compose.yml` → Lee del `.env` automáticamente
- ❌ NO edites credenciales directamente en docker-compose

## 🚀 Inicio Rápido (3 comandos)

```bash
# 1. Iniciar todo
docker compose up -d

# 2. Ver logs
docker compose logs -f

# 3. Acceder a http://localhost:3000
# Login: admin@videoanalysis.com / Admin123!
```

## 📊 Estado Actual del Sistema

✅ **Base de Datos Completa**:
- 19 Partidos
- 14 Perfiles de Importación
- 21 Clubs y Teams
- 106 Jugadores  
- 10,343 Eventos
- Sistema de autenticación funcionando

✅ **Servicios**:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5001
- PostgreSQL: localhost:5432

## 🔐 Credenciales

### Super Admin
```
Email: admin@videoanalysis.com
Password: Admin123!
```

### Base de Datos
```
Host: localhost:5432
Database: videoanalysis_db
User: videoanalysis_db_user
Password: videoanalysis_db_password!!
```

## 🛠️ Comandos Útiles

### Desarrollo Diario
```bash
# Iniciar
docker compose up -d

# Ver logs de un servicio
docker compose logs -f backend

# Reiniciar servicio
docker compose restart backend

# Detener todo
docker compose down
```

### Base de Datos
```bash
# Acceder a PostgreSQL
docker compose exec db psql -U videoanalysis_db_user -d videoanalysis_db

# Ver cantidad de partidos
docker compose exec db psql -U videoanalysis_db_user -d videoanalysis_db \
  -c "SELECT COUNT(*) FROM matches;"
```

## ⚙️ Cambiar Configuración

### Paso 1: Editar `.env`
```bash
# Ejemplo: cambiar contraseña del admin
nano .env
# Cambiar: INITIAL_ADMIN_PASSWORD=NuevaPassword123!
```

### Paso 2: Reiniciar
```bash
docker compose restart
```

## 📂 Estructura del Proyecto

```
VideoAnalysis/
├── .env                          ← Credenciales (NO commitear)
├── docker-compose.yml            ← Configuración principal ⭐
├── backend/
│   ├── app.py                    ← Flask app
│   ├── models.py                 ← Modelos de DB
│   ├── auth_utils.py             ← Sistema de auth
│   └── routes/                   ← Endpoints API
│       ├── auth.py
│       ├── matches.py
│       └── match_events.py
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.tsx         ← Página de login
│   │   │   └── Dashboard.tsx     ← Dashboard
│   │   ├── context/
│   │   │   └── AuthContext.tsx   ← Auth context
│   │   └── api/
│   │       └── api.ts            ← API client
│   └── .env                      ← VITE_API_BASE_URL
└── db_backups/                   ← Backups automáticos
```

## 🔒 Sistema de Autenticación

### Roles Disponibles
- `super_admin`: Acceso completo
- `club_admin`: Administrador de club
- `analyst`: Analista con permisos de edición
- `viewer`: Solo lectura

### Crear Usuario
```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@ejemplo.com",
    "password": "Password123!",
    "club_id": 1,
    "role": "analyst"
  }'
```

## 📖 Documentación Adicional

- `GUIA_RAPIDA.md` - Comandos esenciales
- `SISTEMA_RESUELTO.md` - Estado del sistema
- `AUTENTICACION_COMPLETADO.md` - Documentación de auth

## 🐛 Solución de Problemas

### No puedo acceder al frontend
```bash
# Verificar que esté corriendo
docker compose ps

# Ver logs
docker compose logs frontend
```

### Error 401 al cargar datos
```bash
# El token expiró (60 min), hacer login nuevamente
```

### No veo todos los partidos
```bash
# Verificar que eres super_admin
curl http://localhost:5001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

## 📝 Notas Importantes

1. ⭐ El volumen `videoanalysis_postgres-data` contiene TODOS tus datos
2. ⭐ Hacer backup antes de cambios grandes
3. ⭐ Los backups están en `db_backups/`
4. ⚠️ NO eliminar el volumen sin backup

## 🎉 ¿Qué Sigue?

El sistema está completamente funcional. Puedes:
- ✅ Iniciar sesión
- ✅ Ver tus 19 partidos
- ✅ Importar nuevos partidos
- ✅ Crear usuarios y asignar permisos
- ✅ Analizar eventos de partidos

---

**Última actualización**: Diciembre 2025  
**Estado**: ✅ Sistema Funcional  
**Próximo paso**: ¡Usar el sistema!
