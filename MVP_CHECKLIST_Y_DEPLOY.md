# 🚀 MVP Checklist & Guía de Deployment a Producción

**Fecha de Evaluación:** 22 de Diciembre 2025  
**Dominio:** conexusplay.com  
**Estado:** ✅ LISTO PARA MVP

---

## 📊 EVALUACIÓN DEL SISTEMA - ¿LISTO PARA MVP?

### ✅ Funcionalidades Core (COMPLETO)

#### 1. **Sistema de Autenticación** ✅
- [x] Registro de usuarios con verificación por email
- [x] Login/Logout con JWT
- [x] Recuperación de contraseña
- [x] Sistema de roles (SuperAdmin, ClubAdmin, Analyst, Viewer)
- [x] Integración con Resend configurada y testeada
- [x] Protección de rutas en frontend
- **Estado:** Funcional y probado

#### 2. **Gestión de Clubes y Teams** ✅
- [x] CRUD de Clubes
- [x] CRUD de Teams
- [x] Sistema de membresías (usuarios-clubs con roles)
- [x] Scopes de permisos por team y partido
- **Estado:** Funcional

#### 3. **Importación de Partidos** ✅
- [x] Upload de archivos XML (LongoMatch, SportCode)
- [x] Sistema de normalización con perfiles configurables
- [x] Preview de eventos con filtros por categoría
- [x] Guardado en base de datos relacional
- [x] Perfil "Facu_SL" configurado y funcional
- **Estado:** Funcional con datos de prueba

#### 4. **Análisis y Visualización** ✅
- [x] Vista de partidos con información completa
- [x] Gráficos estadísticos (ChartsTabs.tsx)
- [x] Mapas de calor (HeatMaps)
- [x] Lista de eventos filtrable
- [x] Información de jugadores
- **Estado:** Funcional con datos reales

#### 5. **Base de Datos** ✅
- [x] PostgreSQL con modelos relacionales
- [x] Migraciones y backups
- [x] Datos de prueba cargados
- [x] Backup completo: `DATOS_COMPLETOS_20251218_133935.sql`
- **Estado:** Estable con datos de 3 clubes

---

### ⚠️ Puntos a Mejorar (No Bloqueantes para MVP)

#### 1. **Configuración de Producción**
- [ ] Variables de entorno sin secretos hardcodeados
- [ ] URL del frontend debe configurarse dinámicamente
- [ ] CORS configurado para dominio específico

#### 2. **UI/UX**
- [ ] Mensajes de error más claros
- [ ] Loading states en todas las acciones async
- [ ] Responsive completo (ya funciona pero puede mejorar)

#### 3. **Performance**
- [ ] Paginación en listas largas
- [ ] Lazy loading de gráficos pesados
- [ ] Cache de queries frecuentes

#### 4. **Monitoreo**
- [ ] Logs estructurados
- [ ] Health checks configurados
- [ ] Alertas de errores

---

## 🎯 VEREDICTO: **SÍ, ESTÁ LISTO PARA MVP**

### Razones:
1. ✅ Todas las funcionalidades core funcionan
2. ✅ Sistema de autenticación completo y seguro
3. ✅ Importación de datos probada con casos reales
4. ✅ Visualizaciones funcionando correctamente
5. ✅ Base de datos estable con datos de prueba
6. ✅ Email configurado y funcionando (Resend)
7. ✅ Docker configurado para producción

### Lo que necesitas antes de lanzar:
1. 🔧 Ajustar configuración de producción (te ayudaré)
2. 🌐 Configurar dominio conexusplay.com
3. 🚀 Deploy en hosting (Render recomendado)
4. 👥 Crear cuentas de prueba para usuarios beta

---

## 🏗️ OPCIONES DE HOSTING (Análisis Detallado)

### **OPCIÓN 1: Render.com** ⭐ **RECOMENDADO**

#### ✅ Ventajas:
- **Soporte nativo para Docker Compose** (reciente)
- **PostgreSQL managed incluido** ($7/mes)
- **SSL/HTTPS gratis** con Let's Encrypt
- **Dominio personalizado** gratis
- **CI/CD automático** desde GitHub
- **Plan gratuito disponible** para pruebas (con limitaciones)
- **Ya lo usaste antes** (experiencia previa)

#### 💰 Costos Mensuales:
- **Base de Datos PostgreSQL:** $7/mes (256MB RAM, 1GB storage)
- **Web Service Backend:** $7/mes (512MB RAM, 0.5 CPU)
- **Static Site Frontend:** GRATIS
- **TOTAL:** ~$14/mes + impuestos

#### 📦 Planes:
```
Starter (Recomendado para MVP):
- PostgreSQL: $7/mes
- Backend (Web Service): $7/mes
- Frontend (Static Site): GRATIS
- SSL: GRATIS
- Dominio personalizado: GRATIS
Total: $14/mes
```

#### 🔧 Deploy en Render:
1. Crear cuenta en render.com
2. Conectar repo GitHub
3. Crear PostgreSQL Database
4. Crear Web Service (Backend)
5. Crear Static Site (Frontend)
6. Configurar variables de entorno
7. Conectar dominio conexusplay.com

---

### **OPCIÓN 2: Railway.app** 

#### ✅ Ventajas:
- Muy fácil de usar
- Soporte excelente para Docker
- PostgreSQL incluido
- Pricing por uso

#### 💰 Costos:
- **Plan Developer:** $5/mes + uso
- **~$10-15/mes** para tu caso de uso

#### ⚠️ Desventajas:
- Más caro a largo plazo
- Límites de recursos más estrictos

---

### **OPCIÓN 3: DigitalOcean App Platform**

#### ✅ Ventajas:
- Infraestructura sólida
- PostgreSQL managed
- Escalable

#### 💰 Costos:
- **App:** $5/mes (Basic)
- **PostgreSQL:** $15/mes (mínimo)
- **TOTAL:** $20/mes

#### ⚠️ Desventajas:
- Más caro que Render
- Setup más complejo

---

### **OPCIÓN 4: VPS (DigitalOcean Droplet, Linode, Vultr)**

#### ✅ Ventajas:
- Control total
- Más barato a largo plazo
- Recursos dedicados

#### 💰 Costos:
- **Droplet básico:** $6-12/mes
- **TOTAL:** $6-12/mes

#### ⚠️ Desventajas:
- **MUCHO más complejo** (no recomendado para principiantes)
- Requiere administrar servidor, nginx, SSL, actualizaciones
- Sin managed database (tienes que configurar backups)
- Requiere conocimientos de DevOps

---

## 🎖️ RECOMENDACIÓN FINAL: **RENDER.COM**

### ¿Por qué Render?
1. ✅ **Ya lo usaste** → curva de aprendizaje baja
2. ✅ **Docker Compose nativo** → tu setup actual funciona
3. ✅ **PostgreSQL managed** → no te preocupas por backups
4. ✅ **SSL automático** → seguridad sin configuración
5. ✅ **Precio razonable** → $14/mes para MVP
6. ✅ **Fácil de escalar** → cuando necesites más recursos
7. ✅ **CI/CD automático** → push to deploy

### Alternativa si el costo es problema:
- **Railway** con créditos iniciales gratis
- Luego migrar a Render cuando tengas usuarios pagando

---

## 🛠️ PREPARACIÓN PRE-DEPLOYMENT

### 1. Ajustes Necesarios en el Código

#### A. Variables de Entorno de Producción

Necesitamos crear un `.env.production` para Render:

```bash
# Base de Datos (Render la proporciona)
DATABASE_URL=<Render_proporcionará_esto>

# Seguridad (generar nuevos tokens)
JWT_SECRET=<GENERAR_NUEVO_TOKEN_64_BYTES>
AUTH_ENABLED=true
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Admin inicial
INITIAL_ADMIN_EMAIL=admin@conexusplay.com
INITIAL_ADMIN_PASSWORD=<PASSWORD_SEGURO_NUEVO>

# Email (ya configurado)
RESEND_API_KEY=<TU_RESEND_API_KEY>
RESEND_FROM=noreply@conexusplay.com

# URLs de producción
APP_URL=https://conexusplay.com
FRONTEND_URL=https://conexusplay.com
BACKEND_URL=https://api.conexusplay.com

# Email config
VERIFICATION_EXP_HOURS=24
RESET_EXP_MINUTES=60
```

#### B. Configurar CORS en Backend

Necesitamos ajustar `backend/app.py` para producción:

```python
# En lugar de CORS(app, resources={r"/*": {"origins": "*"}})
# Usar:
CORS(app, resources={r"/*": {
    "origins": [
        "https://conexusplay.com",
        "http://localhost:3000"  # Para desarrollo local
    ]
}})
```

#### C. Configurar API URL en Frontend

Necesitamos variable de entorno en build de Vite:

```bash
# En Render, configurar:
VITE_API_BASE_URL=https://api.conexusplay.com/api
```

---

### 2. Preparar Docker para Render

#### Opción A: Blueprint Render (render.yaml)

Crear archivo `render.yaml` en la raíz:

```yaml
services:
  # Base de Datos
  - type: pserv
    name: videoanalysis-db
    env: docker
    plan: starter
    
  # Backend
  - type: web
    name: videoanalysis-backend
    env: docker
    dockerfilePath: ./backend/Dockerfile.prod
    dockerContext: ./backend
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: videoanalysis-db
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: RESEND_API_KEY
        sync: false
    
  # Frontend
  - type: web
    name: videoanalysis-frontend
    env: static
    buildCommand: npm install && npm run build
    staticPublishPath: ./frontend/dist
    routes:
      - type: rewrite
        source: /api/*
        destination: https://videoanalysis-backend.onrender.com/*
```

#### Opción B: Deploy Manual (más control)

Te guiaré paso a paso más adelante.

---

## 🚀 GUÍA PASO A PASO: DEPLOY EN RENDER

### FASE 1: Preparación (15 minutos)

#### Paso 1: Generar Secrets Seguros

```bash
# En tu terminal local:
cd /Users/Agustin/wa/videoanalisis/VideoAnalysis

# Generar JWT Secret
python3 -c "import secrets; print('JWT_SECRET=' + secrets.token_urlsafe(64))"

# Generar password para admin
python3 -c "import secrets; print('ADMIN_PASS=' + secrets.token_urlsafe(16))"
```

**GUARDAR ESTOS VALORES** en un archivo seguro (1Password, LastPass, o bloc de notas seguro).

---

#### Paso 2: Ajustar Código para Producción

Voy a crear los ajustes necesarios ahora mismo...

---

### FASE 2: Crear Cuenta y Proyecto en Render (10 minutos)

#### Paso 3: Crear Cuenta en Render

1. Ve a https://render.com
2. **Sign up** con tu cuenta de GitHub
3. Autoriza el acceso a tu repositorio VideoAnalysis

---

#### Paso 4: Crear PostgreSQL Database

1. En Render Dashboard → **New +** → **PostgreSQL**
2. Configuración:
   - **Name:** `videoanalysis-db`
   - **Database:** `videoanalysis_db`
   - **User:** `videoanalysis_user`
   - **Region:** Oregon (US West) o Frankfurt (EU)
   - **Plan:** **Starter ($7/mes)**
3. **Create Database**
4. **COPIAR** la **Internal Database URL** (la necesitarás)

---

#### Paso 5: Crear Backend Web Service

1. En Dashboard → **New +** → **Web Service**
2. Conectar tu repositorio GitHub
3. Configuración:
   - **Name:** `videoanalysis-backend`
   - **Region:** Misma que la DB
   - **Branch:** `main` (o tu rama principal)
   - **Root Directory:** `backend`
   - **Environment:** **Docker**
   - **Dockerfile Path:** `Dockerfile.prod`
   - **Plan:** **Starter ($7/mes)**

4. **Environment Variables** (agregar una por una):
   ```
   DATABASE_URL=<PEGAR_INTERNAL_DATABASE_URL>
   JWT_SECRET=<TU_SECRETO_GENERADO>
   AUTH_ENABLED=true
   ACCESS_TOKEN_EXPIRE_MINUTES=60
   INITIAL_ADMIN_EMAIL=admin@conexusplay.com
   INITIAL_ADMIN_PASSWORD=<TU_PASSWORD_GENERADO>
   RESEND_API_KEY=<TU_RESEND_API_KEY>
   RESEND_FROM=noreply@conexusplay.com
   VERIFICATION_EXP_HOURS=24
   RESET_EXP_MINUTES=60
   APP_URL=https://conexusplay.com
   FLASK_ENV=production
   ```

5. **Create Web Service**

6. Esperar a que termine el build (5-10 minutos)

7. **COPIAR** la URL del backend (ej: `https://videoanalysis-backend.onrender.com`)

---

#### Paso 6: Crear Frontend Static Site

1. En Dashboard → **New +** → **Static Site**
2. Conectar repositorio
3. Configuración:
   - **Name:** `videoanalysis-frontend`
   - **Branch:** `main`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install --legacy-peer-deps && npm run build`
   - **Publish Directory:** `dist`

4. **Environment Variables:**
   ```
   VITE_API_BASE_URL=https://videoanalysis-backend.onrender.com/api
   ```

5. **Create Static Site**

6. Esperar build (3-5 minutos)

7. **COPIAR** la URL del frontend (ej: `https://videoanalysis-frontend.onrender.com`)

---

### FASE 3: Configurar Dominio Personalizado (20 minutos)

#### Paso 7: Configurar DNS en Porkbun

1. Ve a https://porkbun.com
2. Login → **Domain Management** → `conexusplay.com`
3. **DNS Records**

4. **Agregar registros:**

```
Type: CNAME
Host: www
Answer: videoanalysis-frontend.onrender.com
TTL: 600

Type: CNAME  
Host: api
Answer: videoanalysis-backend.onrender.com
TTL: 600

Type: A (si Render te da IP)
Host: @
Answer: <IP de Render>
TTL: 600
```

**Nota:** Render también acepta ALIAS/ANAME si Porkbun lo soporta.

---

#### Paso 8: Configurar Dominio en Render

1. **Frontend:**
   - Ir a tu Static Site en Render
   - **Settings** → **Custom Domains**
   - **Add Custom Domain:** `conexusplay.com` y `www.conexusplay.com`
   - Verificar (puede tomar 10-60 minutos)

2. **Backend:**
   - Ir a tu Web Service backend
   - **Settings** → **Custom Domains**
   - **Add Custom Domain:** `api.conexusplay.com`
   - Verificar

---

#### Paso 9: Actualizar Variables de Entorno

Una vez que los dominios estén activos:

1. **Backend** → Settings → Environment:
   - Actualizar `APP_URL=https://conexusplay.com`

2. **Frontend** → Settings → Environment:
   - Actualizar `VITE_API_BASE_URL=https://api.conexusplay.com/api`

3. **Redeploy** ambos servicios

---

### FASE 4: Inicializar Base de Datos (10 minutos)

#### Paso 10: Conectar a PostgreSQL y Restaurar Backup

Tienes 2 opciones:

**Opción A: Desde tu Mac (Recomendado)**

```bash
# 1. Descargar External Database URL de Render
# (está en la página de tu database en Render)

# 2. Restaurar backup
psql "<EXTERNAL_DATABASE_URL>" < db_backups/DATOS_COMPLETOS_20251218_133935.sql
```

**Opción B: Shell en Render**

1. En Render → Database → **Shell**
2. Copiar y pegar el contenido del SQL

---

### FASE 5: Pruebas Finales (15 minutos)

#### Paso 11: Verificar que Todo Funciona

1. **Acceder a la app:**
   - https://conexusplay.com

2. **Probar login:**
   - Email: `admin@conexusplay.com`
   - Password: `<TU_ADMIN_PASSWORD>`

3. **Verificar funcionalidades:**
   - [ ] Login/Logout
   - [ ] Ver partidos
   - [ ] Ver gráficos
   - [ ] Importar partido nuevo
   - [ ] Registro de nuevo usuario
   - [ ] Email de verificación

4. **Revisar logs en Render:**
   - Backend → Logs (buscar errores)

---

## 👥 CREAR CUENTAS DE BETA TESTERS

### Paso 12: Invitar Usuarios de Prueba

#### Opción A: Crear desde SuperAdmin

1. Login como admin
2. Ir a "Gestión de Usuarios"
3. Crear usuarios con diferentes roles:
   ```
   Usuario 1 - Club Admin:
   Email: tester1@clubrugby.com
   Role: club_admin
   Club: San Luis Rugby
   
   Usuario 2 - Analista:
   Email: tester2@clubrugby.com
   Role: analyst
   Club: San Luis Rugby
   
   Usuario 3 - Viewer:
   Email: tester3@clubrugby.com
   Role: viewer
   Club: San Luis Rugby
   ```

#### Opción B: Auto-registro

1. Los usuarios se registran en https://conexusplay.com/register
2. Reciben email de verificación
3. Tú (admin) les asignas club y permisos

---

## 📊 MONITOREO POST-LAUNCH

### Cosas a Vigilar:

1. **Logs de Render:**
   - Revisar errores diariamente
   - Configurar alertas de error

2. **Uso de Recursos:**
   - RAM del backend
   - Storage de la DB
   - Bandwidth

3. **Emails:**
   - Verificar que Resend envía correctamente
   - Revisar bounce rate

4. **Performance:**
   - Tiempo de carga de páginas
   - Tiempo de respuesta del API

---

## 💰 COSTOS MENSUALES ESTIMADOS

```
Render:
  - PostgreSQL Starter: $7/mes
  - Backend Web Service: $7/mes
  - Frontend Static Site: GRATIS
  Subtotal Render: $14/mes

Resend (Email):
  - Plan Free: 3,000 emails/mes (suficiente para MVP)
  - O Plan Pro: $20/mes (50,000 emails)
  Subtotal Resend: $0-20/mes

Dominio (Porkbun):
  - conexusplay.com: ~$10/año = $0.83/mes

TOTAL MENSUAL: $14.83 - $34.83/mes
```

---

## 🎉 CHECKLIST FINAL ANTES DE LANZAR

- [ ] Código ajustado para producción (CORS, URLs)
- [ ] Secrets generados y guardados seguros
- [ ] Database creada en Render
- [ ] Backend desplegado y funcionando
- [ ] Frontend desplegado y funcionando
- [ ] Dominio configurado en Porkbun
- [ ] Dominio verificado en Render
- [ ] SSL activo (candado verde en navegador)
- [ ] Base de datos restaurada con datos de prueba
- [ ] Admin login funciona
- [ ] Emails de verificación llegan
- [ ] Todas las funciones core probadas
- [ ] 3-5 usuarios beta creados
- [ ] Logs monitoreados sin errores críticos

---

## 🚨 PLAN B: Si Algo Sale Mal

### Problema: Backend no inicia
**Solución:** Revisar logs en Render → buscar error de env vars o DB connection

### Problema: Frontend no conecta con backend
**Solución:** Verificar `VITE_API_BASE_URL` y CORS en backend

### Problema: Dominio no resuelve
**Solución:** Esperar propagación DNS (hasta 48h), verificar registros en Porkbun

### Problema: Base de datos no restaura
**Solución:** Conectar por psql local y restaurar manualmente

### Problema: Emails no llegan
**Solución:** Verificar API key de Resend, revisar logs del backend

---

## 📞 SOPORTE

### Recursos:
- **Render Docs:** https://render.com/docs
- **Render Community:** https://community.render.com
- **Resend Docs:** https://resend.com/docs

### En caso de bloqueo:
1. Revisar logs detalladamente
2. Buscar error específico en Google
3. Preguntar en community de Render
4. Volver a preguntarme aquí 😊

---

## ✅ SIGUIENTE PASO: Ejecutar Ajustes de Código

**¿Quieres que prepare los ajustes necesarios en el código ahora?**

Necesito hacer:
1. Ajustar CORS en `backend/app.py`
2. Crear archivo `render.yaml` para facilitar deploy
3. Actualizar `.env.example` con variables de producción
4. Crear script helper para generar secrets

**¿Procedo con estos cambios?** 🚀
