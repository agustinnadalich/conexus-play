# 🚀 Guía de Deploy: Gratis → Low Cost (Para Presupuesto Ajustado)

**Última actualización:** 22 Diciembre 2025  
**Estrategia:** Empezar GRATIS → Migrar a low-cost cuando tengas usuarios/ingresos

---

## 📊 COMPARATIVA REAL DE OPCIONES

### Opción 1: Railway (RECOMENDADA para empezar) ⭐⭐⭐⭐⭐

| Característica | Trial Gratis | Después del Trial |
|----------------|--------------|-------------------|
| **Costo** | **0€/mes** (2-3 meses) | $5/mes base + ~$5 uso = **$10/mes** |
| **PostgreSQL** | ✅ Incluido + backups | ✅ Incluido + backups |
| **SSL/HTTPS** | ✅ Automático | ✅ Automático |
| **Dominio custom** | ✅ Gratis | ✅ Gratis |
| **Facilidad** | ⭐⭐⭐⭐⭐ (3 clics) | ⭐⭐⭐⭐⭐ |
| **Cold start** | ⚡ Instantáneo | ⚡ Instantáneo |
| **Límites** | 500h/mes + $5 crédito | Sin límites prácticos |

**Créditos iniciales:**
- **$5 gratis** al registrarte
- **500 horas/mes gratis** (suficiente para 1 backend 24/7)
- Postgres en plan Developer ($5/mes) incluido en crédito

**Duración estimada gratis:** 2-3 meses con uso moderado de 5-10 usuarios beta

**Cuándo pagar:** Cuando se acaben los $5 de crédito (Railway te avisa)

---

### Opción 2: VPS Hetzner (para largo plazo) ⭐⭐⭐⭐

| Característica | Valor |
|----------------|-------|
| **Costo** | **€3.79/mes** (~$4/mes) |
| **Recursos** | 2 vCPU, 2GB RAM, 40GB SSD |
| **PostgreSQL** | ✅ Tú lo gestionas (Docker) |
| **SSL/HTTPS** | ⚡ Con Caddy (auto) |
| **Dominio custom** | ✅ Gratis |
| **Facilidad** | ⭐⭐⭐ (requiere SSH) |
| **Límites** | Sin límites |
| **Backups** | Manual o €0.60/mes extra |

**Cuándo usarlo:** Cuando Railway empiece a cobrar O cuando tengas 20+ usuarios activos

---

### Opción 3: Render Free (NO RECOMENDADA) ⭐⭐

| Característica | Valor |
|----------------|-------|
| **Costo** | 0€/mes |
| **Problema 1** | ⚠️ Backend duerme tras 15 min (cold start 30-60s) |
| **Problema 2** | ⚠️ PostgreSQL expira cada 90 días |
| **Problema 3** | ⚠️ Frustrante para usuarios reales |
| **Uso válido** | Solo demo personal |

---

### Opción 4: Fly.io (ya NO es gratis) ⭐⭐⭐

| Característica | Valor |
|----------------|-------|
| **Costo** | ~$6-8/mes |
| **Ventaja** | Técnicamente superior |
| **Desventaja** | Más caro que Hetzner VPS |

---

## 🎯 ESTRATEGIA RECOMENDADA (2 FASES)

### **FASE 1: VALIDACIÓN (0-3 meses)** → Railway GRATIS

**Objetivo:** Validar que tu app funciona con usuarios reales SIN GASTAR

1. Deploy en Railway (gratis con trial)
2. Invitar 5-10 usuarios beta
3. Recoger feedback
4. Iterar y mejorar
5. **Decidir:**
   - ❌ No funciona → no perdiste dinero
   - ✅ Funciona → pasa a Fase 2

**Costo Fase 1:** **0€** (2-3 meses)

---

### **FASE 2: CRECIMIENTO (después 3 meses)** → VPS Hetzner

**Objetivo:** Reducir costos operativos cuando tengas usuarios comprometidos

**Opción A:** Seguir en Railway si ya tienes ingresos
- Costo: $10/mes
- Ventaja: Cero trabajo técnico
- **Válido si:** Tienes >3 clubes pagando

**Opción B:** Migrar a Hetzner VPS (recomendado)
- Costo: €3.79/mes
- Ventaja: Ahorras $7/mes (~€84/año)
- **Válido si:** Quieres optimizar costos

**Costo Fase 2:** **€3.79/mes** = €45/año

---

## 🚀 GUÍA PASO A PASO: RAILWAY (OPCIÓN GRATIS)

### Pre-requisitos
- Cuenta GitHub con tu repo VideoAnalysis
- Dominio conexusplay.com en Porkbun
- API key de Resend (ya la tienes)

---

### PASO 1: Crear Cuenta en Railway (2 minutos)

1. Ve a: https://railway.app
2. Click en **"Start a New Project"**
3. **Login con GitHub** (autorizar acceso)
4. **NO agregues tarjeta todavía** (usa trial gratis primero)

**Créditos que recibes:**
- ✅ $5 gratis de crédito
- ✅ 500 horas/mes de ejecución gratis

---

### PASO 2: Crear Proyecto (1 minuto)

1. En Railway Dashboard → **"New Project"**
2. Elegir: **"Deploy from GitHub repo"**
3. Seleccionar: **agustinnadalich/VideoAnalysis**
4. Branch: **base_de_datos** (o la que uses)
5. Click **"Deploy"**

Railway detectará automáticamente tu Docker setup.

---

### PASO 3: Configurar PostgreSQL (2 minutos)

1. En tu proyecto → Click **"+ New"**
2. Elegir: **"Database" → "PostgreSQL"**
3. Railway crea la base de datos automáticamente
4. **Copiar** la variable `DATABASE_URL` (la necesitarás)

**Ubicación:** Click en el servicio PostgreSQL → **"Variables"** → copiar `DATABASE_URL`

---

### PASO 4: Configurar Variables de Entorno del Backend (5 minutos)

1. Click en el servicio **"backend"** (el contenedor Docker)
2. Ir a **"Variables"**
3. **Agregar** las siguientes variables una por una:

```bash
# Base de Datos (copiar de tu servicio PostgreSQL)
DATABASE_URL=postgresql://postgres:xxx@xxx.railway.app:5432/railway

# Seguridad - Generar nuevos valores
JWT_SECRET=<VER_ABAJO_COMO_GENERAR>
AUTH_ENABLED=true
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Admin Inicial
INITIAL_ADMIN_EMAIL=admin@conexusplay.com
INITIAL_ADMIN_PASSWORD=<ELEGIR_PASSWORD_SEGURO>

# Email (ya configurado)
RESEND_API_KEY=re_axRSdarV_B4Q7mmDrVZLHcZf56JxUsREc
RESEND_FROM=noreply@conexusplay.com

# Configuración Email
VERIFICATION_EXP_HOURS=24
RESET_EXP_MINUTES=60

# URLs (ajustar después con tu dominio)
APP_URL=https://videoanalysis-production.up.railway.app
FRONTEND_URL=https://videoanalysis-production.up.railway.app

# Flask
FLASK_ENV=production
```

#### **Generar JWT_SECRET seguro:**

En tu terminal local:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

Copiar el resultado y pegarlo en `JWT_SECRET`

---

### PASO 5: Configurar Variables del Frontend (2 minutos)

1. Click en el servicio **"frontend"**
2. Ir a **"Variables"**
3. **Agregar:**

```bash
# URL del backend (Railway la proporciona automáticamente)
# Busca la URL pública de tu backend y agrégale /api
VITE_API_BASE_URL=https://videoanalysis-backend-production.up.railway.app/api
```

**Cómo obtener la URL del backend:**
- Click en servicio "backend"
- Ver sección "Domains" → copiar la URL
- Agregar `/api` al final

---

### PASO 6: Ajustar Configuración de Servicios (3 minutos)

#### Backend:

1. Click en "backend" → **"Settings"**
2. **"Service"** → **"Root Directory"**: `backend`
3. **"Deploy"** → **"Dockerfile Path"**: `Dockerfile.prod`
4. **"Networking"** → **"Port"**: `5001`
5. **Guardar cambios**

#### Frontend:

1. Click en "frontend" → **"Settings"**
2. **"Service"** → **"Root Directory"**: `frontend`
3. **"Deploy"** → **"Dockerfile Path"**: `Dockerfile.prod`
4. **"Networking"** → **"Port"**: `80`
5. **Guardar cambios**

---

### PASO 7: Desplegar (Railway lo hace automático)

Railway detecta cambios y despliega automáticamente:

1. Ver logs en tiempo real: Click en servicio → **"Deployments"** → Click en el deployment activo
2. Esperar a que termine (5-10 minutos primera vez)
3. **Verificar que no hay errores** en los logs

**Indicadores de éxito:**
- ✅ Backend: Ver mensaje `Booting worker with pid: ...` (Gunicorn)
- ✅ Frontend: Ver `Configuration complete; ready for start up` (Nginx)
- ✅ Database: Estado "Active"

---

### PASO 8: Inicializar Base de Datos (5 minutos)

Railway no tiene shell web, así que usamos conexión local:

#### Opción A: Conectar desde tu Mac

1. En Railway → PostgreSQL service → "Connect"
2. Copiar el comando de conexión o la URL externa
3. En tu terminal:

```bash
# Instalar psql si no lo tienes
brew install libpq
brew link --force libpq

# Conectar (Railway te da el comando exacto)
psql postgres://postgres:password@host.railway.app:5432/railway

# Restaurar backup
\i /Users/Agustin/wa/videoanalisis/VideoAnalysis/db_backups/DATOS_COMPLETOS_20251218_133935.sql

# O desde fuera de psql:
psql <DATABASE_URL> < /Users/Agustin/wa/videoanalisis/VideoAnalysis/db_backups/DATOS_COMPLETOS_20251218_133935.sql
```

#### Opción B: Dejar que el backend inicialice

Si `init_db.py` se ejecuta automáticamente al iniciar el backend:
- Solo espera a que el backend arranque
- Revisa logs para ver si crea las tablas
- Luego crea clubes/teams manualmente desde el admin

---

### PASO 9: Configurar Dominio Personalizado (10 minutos)

#### En Railway:

1. **Backend:**
   - Click en servicio backend → **"Settings"** → **"Domains"**
   - **"Custom Domain"** → escribir: `api.conexusplay.com`
   - Railway te dará registros DNS para configurar

2. **Frontend:**
   - Click en servicio frontend → **"Settings"** → **"Domains"**
   - **"Custom Domain"** → escribir: `conexusplay.com` y `www.conexusplay.com`
   - Railway te dará registros DNS

#### En Porkbun:

1. Login en Porkbun → **"Domain Management"** → `conexusplay.com`
2. **"DNS Records"**
3. **Agregar los registros que Railway te indicó:**

Ejemplo típico:
```
Type: CNAME
Host: api
Answer: <tu-proyecto>.railway.app
TTL: 600

Type: CNAME
Host: www
Answer: <tu-proyecto>.railway.app
TTL: 600

Type: CNAME (o A si te da IP)
Host: @
Answer: <tu-proyecto>.railway.app
TTL: 600
```

4. **Guardar** y esperar propagación (10-60 minutos)

#### Verificar:
```bash
dig api.conexusplay.com
dig conexusplay.com
```

Deberías ver las IPs/CNAMEs de Railway.

---

### PASO 10: Actualizar Variables con Dominio Real (2 minutos)

Una vez que el dominio esté activo:

1. **Backend variables:**
   - `APP_URL=https://conexusplay.com`
   - `FRONTEND_URL=https://conexusplay.com`

2. **Frontend variables:**
   - `VITE_API_BASE_URL=https://api.conexusplay.com/api`

3. **Redeploy** ambos servicios (Railway → "Deployments" → "Redeploy")

---

### PASO 11: Pruebas Finales (10 minutos)

1. **Abrir:** https://conexusplay.com
2. **Login:**
   - Email: `admin@conexusplay.com`
   - Password: `<el que configuraste>`
3. **Probar:**
   - [ ] Login/Logout funciona
   - [ ] Ver dashboard
   - [ ] Ver partidos (si restauraste backup)
   - [ ] Importar partido nuevo
   - [ ] Registrar nuevo usuario
   - [ ] Verificar que llegue email

4. **Revisar logs en Railway:**
   - Backend → "Deployments" → logs activos
   - Buscar errores o warnings

---

### PASO 12: Monitoreo y Uso de Créditos

#### Ver cuánto crédito te queda:

1. Railway → Tu perfil (arriba derecha) → **"Usage"**
2. Ver:
   - Crédito restante: $5 - uso
   - Horas de ejecución usadas / 500

#### Optimizar para durar más:

- **No necesitas** frontend 24/7 si es static site
- Railway cobra por **horas de CPU**, no por requests
- Postgres Developer ($5/mes) incluido en crédito

**Estimación realista:**
- Backend 24/7: ~720h/mes → usa tu límite de 500h gratis + algo de crédito
- Postgres: ~$5/mes → usa tu crédito de $5
- Frontend static: casi gratis

**Duración:** 2-3 meses gratis si tienes <10 usuarios activos

---

## 🔄 PLAN DE MIGRACIÓN: Railway → Hetzner VPS

### ¿Cuándo migrar?

**Indicadores:**
- ✅ Railway te pide empezar a pagar (~mes 3)
- ✅ Tienes >10 usuarios activos
- ✅ Tienes 1-2 clubes comprometidos o pagando
- ✅ Quieres reducir costos ($10/mes → €3.79/mes)

---

### PASO 1: Contratar VPS Hetzner (5 minutos)

1. Ve a: https://www.hetzner.com/cloud
2. **"Sign Up"** → crear cuenta
3. **"Add Server"** → Crear VPS:
   - **Location:** Falkenstein (Alemania) o más cercano a tus usuarios
   - **Image:** Ubuntu 22.04
   - **Type:** CX11 (2 vCPU, 2GB RAM, 40GB)
   - **Precio:** €3.79/mes
4. **Agregar SSH Key** (o usa password)
5. **Create & Buy Now**

Recibirás la **IP del servidor** por email.

---

### PASO 2: Preparar Servidor (10 minutos)

Conectar por SSH:
```bash
ssh root@<IP_DEL_SERVIDOR>
```

Instalar Docker y Docker Compose:
```bash
# Actualizar sistema
apt update && apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Instalar Docker Compose
apt install docker-compose-plugin -y

# Verificar
docker --version
docker compose version
```

---

### PASO 3: Clonar Repositorio en Servidor

```bash
# Instalar git si no está
apt install git -y

# Clonar tu repo (necesitarás autenticar)
cd /root
git clone https://github.com/agustinnadalich/VideoAnalysis.git
cd VideoAnalysis
```

---

### PASO 4: Configurar Variables de Entorno

```bash
# Copiar template
cp .env.example .env

# Editar con nano
nano .env
```

**Pegar tu configuración de producción:**
```bash
POSTGRES_USER=videoanalysis_db_user
POSTGRES_PASSWORD=<PASSWORD_SEGURO_NUEVO>
POSTGRES_DB=videoanalysis_db
DATABASE_URL=postgresql://videoanalysis_db_user:<PASSWORD>@db:5432/videoanalysis_db

JWT_SECRET=<EL_MISMO_QUE_USAS_EN_RAILWAY>
AUTH_ENABLED=true
ACCESS_TOKEN_EXPIRE_MINUTES=60

INITIAL_ADMIN_EMAIL=admin@conexusplay.com
INITIAL_ADMIN_PASSWORD=<PASSWORD_ADMIN>

RESEND_API_KEY=re_axRSdarV_B4Q7mmDrVZLHcZf56JxUsREc
RESEND_FROM=noreply@conexusplay.com

VERIFICATION_EXP_HOURS=24
RESET_EXP_MINUTES=60
APP_URL=https://conexusplay.com

FLASK_ENV=production
```

**Guardar:** Ctrl+O, Enter, Ctrl+X

---

### PASO 5: Backup de Railway y Migración de Datos

#### Hacer backup de Railway:

En tu Mac:
```bash
# Conectar a Railway Postgres
railway login
railway link  # Seleccionar tu proyecto
railway run psql $DATABASE_URL -c "SELECT 1"  # test

# Hacer dump
railway run pg_dump $DATABASE_URL > railway_backup_$(date +%Y%m%d).sql
```

#### Copiar backup al servidor:
```bash
scp railway_backup_20251222.sql root@<IP_SERVIDOR>:/root/VideoAnalysis/
```

---

### PASO 6: Levantar Docker Compose en VPS

```bash
cd /root/VideoAnalysis

# Iniciar servicios
docker compose -f docker-compose.prod.yml up -d

# Ver logs
docker compose logs -f

# Verificar que todo arrancó
docker compose ps
```

Deberías ver:
- ✅ db (healthy)
- ✅ backend (running)
- ✅ frontend (running)

---

### PASO 7: Restaurar Backup en VPS

```bash
# Esperar a que db esté ready
sleep 10

# Restaurar
docker compose exec -T db psql -U videoanalysis_db_user -d videoanalysis_db < railway_backup_20251222.sql

# Verificar datos
docker compose exec db psql -U videoanalysis_db_user -d videoanalysis_db -c "SELECT COUNT(*) FROM users;"
```

---

### PASO 8: Configurar Caddy para SSL Automático

Caddy es un servidor web que automáticamente obtiene certificados SSL de Let's Encrypt.

#### Crear Caddyfile:
```bash
nano /root/Caddyfile
```

**Contenido:**
```
# Frontend
conexusplay.com, www.conexusplay.com {
    reverse_proxy localhost:3000
}

# Backend API
api.conexusplay.com {
    reverse_proxy localhost:5001
}
```

**Guardar:** Ctrl+O, Enter, Ctrl+X

#### Instalar y ejecutar Caddy:
```bash
# Instalar Caddy
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install caddy

# Copiar Caddyfile
cp /root/Caddyfile /etc/caddy/Caddyfile

# Recargar Caddy
systemctl reload caddy

# Ver logs
journalctl -u caddy -f
```

Caddy automáticamente:
- Obtiene certificados SSL
- Configura HTTPS
- Redirige HTTP → HTTPS

---

### PASO 9: Actualizar DNS en Porkbun

Cambiar los registros DNS para apuntar al VPS en lugar de Railway:

En Porkbun:
```
Type: A
Host: @
Answer: <IP_DEL_VPS_HETZNER>
TTL: 600

Type: A
Host: www
Answer: <IP_DEL_VPS_HETZNER>
TTL: 600

Type: A
Host: api
Answer: <IP_DEL_VPS_HETZNER>
TTL: 600
```

**Propagación:** 10-60 minutos

---

### PASO 10: Pruebas Post-Migración

```bash
# Verificar SSL
curl -I https://conexusplay.com
curl -I https://api.conexusplay.com

# Verificar servicios
docker compose ps
```

En navegador:
1. https://conexusplay.com → debería cargar
2. Login con admin
3. Verificar datos migrados
4. Probar todas las funciones

---

### PASO 11: Apagar Railway

Solo cuando CONFIRMES que VPS funciona 100%:

1. Railway Dashboard → Tu proyecto
2. Cada servicio → "Settings" → "Danger Zone" → "Delete Service"
3. Confirmar

**Ya no te cobrarán.**

---

## 💰 RESUMEN DE COSTOS

### Fase 1 (Meses 1-3): Railway
```
Costo: 0€/mes (gratis con trial)
Duración: 2-3 meses
Total invertido: 0€
```

### Fase 2 (Mes 4+): Hetzner VPS
```
Costo: €3.79/mes
Total año 1: 0€ (3 meses) + €34.11 (9 meses) = €34.11
Total año 2: €45.48/año
```

### Otros gastos:
```
Dominio (Porkbun): ~€10/año
Resend Email: 0€/mes (hasta 3000 emails/mes)

TOTAL AÑO 1: €44.11
TOTAL AÑO 2: €55.48
```

**Promedio mensual después de trial: €4.62/mes**

---

## 🎯 COMPARATIVA vs Otras Opciones

| Opción | Año 1 | Año 2+ (mensual) |
|--------|-------|------------------|
| **Railway → Hetzner (RECOMENDADO)** | **€44** | **€4.62/mes** |
| Render Paid | €168 | €14/mes |
| Railway solo | €120 | €10/mes |
| Fly.io | €72-96 | €6-8/mes |
| VPS desde inicio | €45 | €3.79/mes |

**Ahorro vs Render:** €124 año 1, €112/año después  
**Ahorro vs Railway solo:** €76 año 1, €64/año después

---

## ✅ CHECKLIST COMPLETO

### Fase Railway (AHORA):
- [ ] Crear cuenta Railway
- [ ] Deploy de servicios (backend, frontend, db)
- [ ] Configurar variables de entorno
- [ ] Generar JWT_SECRET seguro
- [ ] Configurar dominio en Railway
- [ ] Actualizar DNS en Porkbun
- [ ] Verificar SSL funciona
- [ ] Restaurar backup de datos
- [ ] Probar login y funciones
- [ ] Crear 3-5 cuentas de usuarios beta
- [ ] Monitorear uso de créditos

### Fase Hetzner (mes 3-4):
- [ ] Contratar VPS Hetzner CX11
- [ ] Configurar servidor (Docker, Git)
- [ ] Clonar repositorio
- [ ] Configurar .env de producción
- [ ] Hacer backup de Railway
- [ ] Levantar Docker Compose
- [ ] Restaurar datos
- [ ] Instalar y configurar Caddy
- [ ] Actualizar DNS a IP del VPS
- [ ] Verificar migración exitosa
- [ ] Apagar servicios de Railway

---

## 🆘 TROUBLESHOOTING

### Railway no despliega:
**Problema:** Build fails  
**Solución:** Ver logs del deployment, buscar error específico

### Base de datos no conecta:
**Problema:** Connection refused  
**Solución:** Verificar que DATABASE_URL está bien copiado

### Frontend no carga backend:
**Problema:** CORS error  
**Solución:** Verificar VITE_API_BASE_URL y CORS en backend

### Dominio no resuelve:
**Problema:** DNS no propagado  
**Solución:** Esperar 1-2 horas, verificar con `dig conexusplay.com`

### SSL no funciona en VPS:
**Problema:** Caddy no obtiene certificado  
**Solución:** Verificar que puerto 80 y 443 estén abiertos en firewall

### Railway cobra inesperadamente:
**Problema:** Se acabó el crédito  
**Solución:** Ver "Usage" en Railway, añadir tarjeta o migrar a VPS

---

## 📞 SIGUIENTE PASO

**¿Por cuál empezamos?**

1. **Railway ahora** (recomendado) → Gratis 2-3 meses
2. **VPS directo** → €3.79/mes desde inicio

Te sugiero **Railway primero** porque:
- ✅ Sin riesgo financiero
- ✅ Setup en 30 minutos
- ✅ Validas que todo funciona
- ✅ Luego migras si necesitas

**¿Empezamos con Railway?** 🚀
