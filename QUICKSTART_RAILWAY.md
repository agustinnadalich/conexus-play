# 🚀 Inicio Rápido: Deploy en Railway

**Tiempo estimado:** 30 minutos  
**Costo:** Gratis por 2-3 meses

---

## 📝 Pre-requisitos

- [ ] Cuenta GitHub con repo VideoAnalysis
- [ ] Dominio conexusplay.com en Porkbun
- [ ] API Key de Resend: `re_axRSdarV_B4Q7mmDrVZLHcZf56JxUsREc`

---

## ⚡ Pasos Rápidos

### 1. Generar Secrets (2 min)

```bash
cd /Users/Agustin/wa/videoanalisis/VideoAnalysis
./generate_secrets.sh
```

**COPIAR Y GUARDAR** los 3 valores generados (JWT_SECRET, ADMIN_PASSWORD, DB_PASSWORD)

---

### 2. Crear Cuenta Railway (3 min)

1. Ve a: https://railway.app
2. **"Start a New Project"** → Login con GitHub
3. Autorizar acceso a VideoAnalysis
4. **NO agregar tarjeta** (usa trial gratis)

---

### 3. Deploy Proyecto (5 min)

1. **"New Project"** → **"Deploy from GitHub repo"**
2. Seleccionar: `agustinnadalich/VideoAnalysis`
3. Branch: `base_de_datos`
4. Railway detectará Docker automáticamente

---

### 4. Agregar PostgreSQL (2 min)

1. En proyecto → **"+ New"** → **"Database"** → **"PostgreSQL"**
2. Esperar creación
3. Click en servicio PostgreSQL → **"Variables"**
4. **COPIAR** el valor de `DATABASE_URL`

---

### 5. Configurar Backend (5 min)

1. Click servicio **"backend"**
2. **"Settings"**:
   - Root Directory: `backend`
   - Dockerfile Path: `Dockerfile.prod`
   - Port: `5001`
3. **"Variables"** → Agregar una por una:

```bash
DATABASE_URL=<PEGAR_LA_URL_DE_POSTGRES>
JWT_SECRET=<TU_SECRETO_GENERADO>
AUTH_ENABLED=true
ACCESS_TOKEN_EXPIRE_MINUTES=60
INITIAL_ADMIN_EMAIL=admin@conexusplay.com
INITIAL_ADMIN_PASSWORD=<TU_PASSWORD_GENERADO>
RESEND_API_KEY=re_axRSdarV_B4Q7mmDrVZLHcZf56JxUsREc
RESEND_FROM=noreply@conexusplay.com
VERIFICATION_EXP_HOURS=24
RESET_EXP_MINUTES=60
APP_URL=https://conexusplay.com
FRONTEND_URL=https://conexusplay.com
FLASK_ENV=production
```

---

### 6. Configurar Frontend (3 min)

1. Click servicio **"frontend"**
2. **"Settings"**:
   - Root Directory: `frontend`
   - Dockerfile Path: `Dockerfile.prod`
   - Port: `80`
3. **"Variables"**:

```bash
VITE_API_BASE_URL=<URL_DEL_BACKEND>/api
```

**URL del Backend:** Click en backend → "Domains" → copiar URL (ej: `https://videoanalysis-backend-production.up.railway.app`)

---

### 7. Esperar Deploy (5 min)

1. Ver logs en tiempo real: Click en deployment activo
2. **Backend:** Buscar mensaje `Booting worker with pid`
3. **Frontend:** Buscar `Configuration complete`
4. **DB:** Estado "Active"

---

### 8. Configurar Dominios (10 min)

#### En Railway:

**Backend:**
1. Backend service → **"Settings"** → **"Domains"**
2. **"Custom Domain"** → `api.conexusplay.com`
3. Railway mostrará: `CNAME → algo.railway.app`

**Frontend:**
1. Frontend service → **"Settings"** → **"Domains"**
2. **"Custom Domain"** → `conexusplay.com`
3. **"Custom Domain"** → `www.conexusplay.com`
4. Railway mostrará registros DNS

#### En Porkbun:

1. Login → **"Domain Management"** → `conexusplay.com`
2. **"DNS Records"** → **"Add"**:

```
Type: CNAME
Host: api
Answer: <lo-que-railway-indique>.railway.app
TTL: 600

Type: CNAME
Host: www
Answer: <lo-que-railway-indique>.railway.app
TTL: 600

Type: CNAME (o A si te da IP)
Host: @
Answer: <lo-que-railway-indique>.railway.app
TTL: 600
```

3. **Esperar propagación:** 10-60 minutos

---

### 9. Actualizar URLs (2 min)

Una vez que dominios estén activos:

**Backend variables:**
```bash
APP_URL=https://conexusplay.com
FRONTEND_URL=https://conexusplay.com
```

**Frontend variables:**
```bash
VITE_API_BASE_URL=https://api.conexusplay.com/api
```

**Redeploy** ambos servicios.

---

### 10. Restaurar Datos (5 min)

En tu Mac:

```bash
# Instalar psql si no lo tienes
brew install libpq
brew link --force libpq

# Obtener DATABASE_URL de Railway (PostgreSQL service → Connect)
# Copiar "External Database URL"

# Restaurar backup
psql "<EXTERNAL_DATABASE_URL>" < /Users/Agustin/wa/videoanalisis/VideoAnalysis/db_backups/DATOS_COMPLETOS_20251218_133935.sql
```

---

### 11. Probar Sistema (5 min)

1. Ir a: https://conexusplay.com
2. Login:
   - Email: `admin@conexusplay.com`
   - Password: `<TU_ADMIN_PASSWORD>`
3. Verificar:
   - [ ] Login exitoso
   - [ ] Ver partidos cargados
   - [ ] Ver gráficos
   - [ ] Importar partido nuevo
   - [ ] Registrar nuevo usuario → llega email

---

## ✅ ¡Listo!

Tu app está en producción y funcionando.

**Monitorear:**
- Railway → **"Usage"** → ver crédito restante
- Backend logs → buscar errores

**Costos:**
- 0€/mes por 2-3 meses (con trial)
- Después: ~$10/mes o migrar a VPS

---

## 🆘 Problemas Comunes

### Backend no inicia
**Ver logs:** Backend service → Deployments → click en deployment activo  
**Buscar:** Error de DB connection o missing env var

### Frontend no conecta
**Verificar:** `VITE_API_BASE_URL` tiene la URL correcta del backend

### Dominio no resuelve
**Esperar:** Hasta 1 hora para propagación DNS  
**Verificar:** `dig conexusplay.com` en terminal

### Emails no llegan
**Revisar:** API key de Resend correcta  
**Ver:** Backend logs para errores de email

---

## 📚 Documentación Completa

Ver: `GUIA_DEPLOY_GRATIS_Y_LOW_COST.md`

---

## 💬 Siguiente Paso

**Crear cuentas beta para usuarios:**

1. Login como admin
2. Ir a gestión de usuarios
3. Crear 3-5 cuentas con diferentes roles
4. Invitar usuarios reales
5. Recoger feedback

**¡Éxito!** 🎉
