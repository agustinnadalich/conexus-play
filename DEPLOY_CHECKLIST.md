# 🎯 Preparación para Deploy en Railway - STAGE

**Fecha:** 24 Diciembre 2025  
**Tiempo estimado:** 45 minutos  
**Costo:** Gratis (2-3 meses con trial Railway)

---

## ✅ Pre-requisitos Completados

- [x] Código estable en rama `main`
- [x] API Keys de Resend revocadas y reemplazadas
- [x] Sistema de seguridad multi-ambiente implementado
- [x] Git hooks de protección activos
- [x] Documentación de seguridad completa

---

## 📋 Checklist Pre-Deploy

### 1. Generar Secretos para STAGE (5 min)

```bash
cd /Users/Agustin/wa/videoanalisis/conexus-play
./generate_secrets.sh
# Seleccionar opción 2: STAGE
```

**Guardar los valores generados en:**
- 1Password (recomendado)
- Nota segura de iCloud
- Bloc de notas físico (respaldo)

**Valores que necesitarás:**
- `JWT_SECRET` - Para autenticación
- `INITIAL_ADMIN_PASSWORD` - Para cuenta admin
- `POSTGRES_PASSWORD` - Para base de datos (Railway puede generarlo)

---

### 2. Preparar Railway (10 min)

#### A. Crear Cuenta
- [ ] Ir a https://railway.app
- [ ] Login con GitHub
- [ ] Autorizar acceso al repo `conexus-play`
- [ ] **NO agregar tarjeta** (usar trial gratuito)

#### B. Verificar Créditos
- [ ] Verificar $5 de crédito gratis
- [ ] Verificar 500 horas/mes gratis

---

### 3. Crear Proyecto en Railway (5 min)

- [ ] Dashboard → "New Project"
- [ ] "Deploy from GitHub repo"
- [ ] Seleccionar: `agustinnadalich/conexus-play`
- [ ] Branch: `stage` (o `main` si prefieres)
- [ ] Railway detectará Docker automáticamente

---

### 4. Agregar PostgreSQL (2 min)

- [ ] En proyecto → "+ New" → "Database" → "PostgreSQL"
- [ ] Esperar creación (1-2 minutos)
- [ ] Copiar `DATABASE_URL` desde Variables

---

### 5. Configurar Backend (10 min)

**Service Settings:**
- [ ] Root Directory: `backend`
- [ ] Dockerfile Path: `Dockerfile.prod`
- [ ] Port: `5001`

**Environment Variables:** (copiar del paso 1)
```bash
DATABASE_URL=<COPIAR_DE_POSTGRES_SERVICE>
JWT_SECRET=<TU_STAGE_JWT_SECRET>
AUTH_ENABLED=true
ACCESS_TOKEN_EXPIRE_MINUTES=60
INITIAL_ADMIN_EMAIL=admin@conexusplay.com
INITIAL_ADMIN_PASSWORD=<TU_STAGE_ADMIN_PASSWORD>
RESEND_API_KEY=<TU_RESEND_API_KEY>
RESEND_FROM=noreply@conexusplay.com
VERIFICATION_EXP_HOURS=24
RESET_EXP_MINUTES=60
FLASK_ENV=production
```

---

### 6. Configurar Frontend (5 min)

**Service Settings:**
- [ ] Root Directory: `frontend`
- [ ] Dockerfile Path: `Dockerfile.prod`
- [ ] Port: `80`

**Environment Variables:**
```bash
VITE_API_BASE_URL=<BACKEND_URL>/api
```

**Obtener Backend URL:**
- Backend service → "Domains" → Copiar URL
- Ejemplo: `https://videoanalysis-backend-production.up.railway.app`

---

### 7. Esperar Deploy (5 min)

**Monitorear logs:**
- [ ] Backend → Ver `Booting worker with pid...`
- [ ] Frontend → Ver `Configuration complete`
- [ ] PostgreSQL → Estado "Active"

---

### 8. Configurar Dominio (Opcional - 15 min)

#### Si quieres usar `stage.conexusplay.com`:

**En Railway:**
- Backend → Settings → Domains → `api-stage.conexusplay.com`
- Frontend → Settings → Domains → `stage.conexusplay.com`

**En Porkbun (DNS):**
```
Type: CNAME
Host: api-stage
Answer: <railway-backend-url>.railway.app
TTL: 600

Type: CNAME
Host: stage
Answer: <railway-frontend-url>.railway.app
TTL: 600
```

**Actualizar Variables:**
```bash
# Backend
APP_URL=https://stage.conexusplay.com
FRONTEND_URL=https://stage.conexusplay.com

# Frontend
VITE_API_BASE_URL=https://api-stage.conexusplay.com/api
```

---

### 9. Restaurar Datos (5 min)

```bash
# En tu Mac
brew install libpq
brew link --force libpq

# Obtener DATABASE_URL de Railway (PostgreSQL service → Connect)
psql "<EXTERNAL_DATABASE_URL>" < db_backups/DATOS_COMPLETOS_20251218_133935.sql
```

---

### 10. Pruebas Finales (5 min)

- [ ] Abrir URL de Railway (o stage.conexusplay.com)
- [ ] Login con admin@conexusplay.com + password generado
- [ ] Verificar partidos cargados
- [ ] Verificar gráficos funcionan
- [ ] Registrar usuario nuevo → verificar email llega
- [ ] Importar partido de prueba

---

## 🎯 Resultado Esperado

**Al completar estos pasos tendrás:**

✅ App funcionando en Railway (gratis)  
✅ PostgreSQL con datos reales  
✅ Emails funcionando con Resend  
✅ SSL/HTTPS automático  
✅ Dominio personalizado (opcional)  
✅ Secretos seguros diferentes a LOCAL  

---

## 📊 Monitoreo Post-Deploy

### Dashboard Railway
- **Usage:** Ver créditos restantes
- **Logs:** Monitorear errores
- **Metrics:** CPU y RAM usage

### Cosas a Vigilar
- [ ] Errores en logs del backend
- [ ] Tiempos de respuesta
- [ ] Consumo de crédito Railway
- [ ] Emails llegando correctamente

---

## 🐛 Troubleshooting Común

### Backend no arranca
```bash
# Revisar logs
Railway → Backend → Deployments → Ver logs

# Buscar:
- DATABASE_URL missing
- Python errors
- Port issues
```

### Frontend no conecta
```bash
# Verificar
VITE_API_BASE_URL=<URL_correcta_con_/api>
```

### Base de datos vacía
```bash
# Restaurar backup
psql "<DATABASE_URL>" < db_backups/DATOS_COMPLETOS_20251218_133935.sql
```

### Emails no llegan
```bash
# Verificar
1. RESEND_API_KEY correcta
2. RESEND_FROM verificado en Resend
3. Logs del backend para errores
```

---

## 🚀 Siguiente Paso

Una vez que STAGE esté funcionando:

1. **Invitar usuarios beta** (3-5 personas)
2. **Recoger feedback** (1-2 semanas)
3. **Iterar mejoras** en rama `develop`
4. **Preparar PRODUCTION** cuando esté validado

---

## 📚 Documentación de Referencia

- [QUICKSTART_RAILWAY.md](QUICKSTART_RAILWAY.md) - Guía detallada paso a paso
- [SECURITY_STRATEGY.md](SECURITY_STRATEGY.md) - Estrategia completa de seguridad
- [BRANCH_STRATEGY.md](BRANCH_STRATEGY.md) - Workflow de ramas
- [check_secrets.sh](check_secrets.sh) - Script de verificación de seguridad

---

## ⏱️ Timeline Sugerido

**HOY (24 Dic):**
- [x] Generar secretos STAGE
- [ ] Deploy en Railway
- [ ] Pruebas básicas

**Mañana (25 Dic):**
- [ ] Configurar dominio stage (opcional)
- [ ] Crear usuarios beta
- [ ] Documentar proceso

**Esta Semana:**
- [ ] Invitar 3-5 usuarios beta
- [ ] Monitorear logs diariamente
- [ ] Recoger feedback inicial

**Próximas 2 Semanas:**
- [ ] Iterar mejoras basadas en feedback
- [ ] Preparar PRODUCTION
- [ ] Planear launch público

---

**¿Listo para empezar?** 🚀

Ejecuta el primer paso:
```bash
./generate_secrets.sh
# Opción 2: STAGE
```

Y luego sigue la guía paso a paso en [QUICKSTART_RAILWAY.md](QUICKSTART_RAILWAY.md)
