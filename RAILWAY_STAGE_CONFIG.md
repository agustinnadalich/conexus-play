# 🎯 Configuración Railway: Rama STAGE

**Branch:** `stage`  
**Ambiente:** Testing/Beta  
**Costo:** Gratis (2-3 meses con trial)  
**URL:** https://stage.conexusplay.com (o Railway subdomain)

---

## 🔧 Configuración en Railway

### 1. Vincular Rama Stage

En Railway Dashboard:
1. Ve a tu proyecto
2. Settings → **"Environment"**
3. Agregar nuevo ambiente: **"Staging"**
4. **"Source"** → Branch: `stage`
5. Guardar

Railway desplegará automáticamente cuando hagas `git push origin stage`

---

### 2. Variables de Entorno (Staging)

Ir a **Variables** del servicio Backend en ambiente Staging:

```bash
# Base de Datos (Railway)
DATABASE_URL=<Railway_proporcionará_automáticamente>

# Seguridad
JWT_SECRET=<GENERAR_NUEVO_DIFERENTE_A_PRODUCCION>
AUTH_ENABLED=true
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Admin Inicial (para testing)
INITIAL_ADMIN_EMAIL=admin@conexusplay.com
INITIAL_ADMIN_PASSWORD=<PASSWORD_STAGE_TESTING>

# Email (Resend real)
RESEND_API_KEY=re_axRSdarV_B4Q7mmDrVZLHcZf56JxUsREc
RESEND_FROM=noreply@conexusplay.com

# Configuración Email
VERIFICATION_EXP_HOURS=24
RESET_EXP_MINUTES=60

# URLs (ajustar según tu dominio stage)
APP_URL=https://stage.conexusplay.com
FRONTEND_URL=https://stage.conexusplay.com

# Flask
FLASK_ENV=production
```

---

### 3. Generar Secrets para Stage

Ejecutar localmente:

```bash
cd /Users/Agustin/wa/videoanalisis/VideoAnalysis
./generate_secrets.sh
```

**IMPORTANTE:** 
- Usar valores DIFERENTES a los de producción
- Guardar en lugar seguro (1Password, etc.)
- NO compartir con usuarios beta

---

### 4. Configuración Frontend (Staging)

Variables del servicio Frontend:

```bash
VITE_API_BASE_URL=https://videoanalysis-backend-stage.up.railway.app/api
# O si configuras dominio:
VITE_API_BASE_URL=https://api-stage.conexusplay.com/api
```

---

## 🌐 Configuración de Dominio Stage (Opcional)

Si quieres usar `stage.conexusplay.com`:

### En Railway:

**Backend:**
```
Custom Domain: api-stage.conexusplay.com
```

**Frontend:**
```
Custom Domain: stage.conexusplay.com
```

### En Porkbun (DNS):

```
Type: CNAME
Host: api-stage
Answer: <backend-railway-url>.railway.app
TTL: 600

Type: CNAME
Host: stage
Answer: <frontend-railway-url>.railway.app
TTL: 600
```

---

## 🚀 Deploy a Stage

### Primera vez:

```bash
# Asegúrate de estar en rama stage
git checkout stage

# Push a origin
git push -u origin stage
```

Railway detectará el push y desplegará automáticamente.

### Actualizaciones futuras:

```bash
# 1. Desarrolla en base_de_datos
git checkout base_de_datos
# ... commits ...

# 2. Merge a stage
git checkout stage
git merge base_de_datos

# 3. Push (deploy automático)
git push origin stage
```

---

## 👥 Crear Usuarios Beta en Stage

### Opción A: Como SuperAdmin

1. Login en stage como admin
2. Ir a **"Gestión de Usuarios"**
3. Crear usuarios manualmente:

```
Usuario Beta 1:
Email: beta1@email.com
Role: analyst
Club: San Luis Rugby
Password: TestBeta123!

Usuario Beta 2:
Email: beta2@email.com
Role: club_admin
Club: Avezzano Rugby
Password: TestBeta123!

Usuario Beta 3:
Email: beta3@email.com
Role: viewer
Club: L'Aquila Rugby
Password: TestBeta123!
```

### Opción B: Auto-registro

1. Usuarios se registran en https://stage.conexusplay.com/register
2. Reciben email de verificación
3. Verifican email
4. Tú (admin) les asignas club y permisos

---

## 📊 Monitoreo de Stage

### Ver Logs en Railway:

1. Railway Dashboard → Tu proyecto
2. Click en servicio (backend/frontend)
3. **"Deployments"** → Click en deployment activo
4. Ver logs en tiempo real

### Métricas importantes:

- **Errores de backend:** Buscar `❌` o `ERROR` en logs
- **Uso de RAM:** Railway muestra en dashboard
- **Tiempo de respuesta:** Ver logs de requests
- **Créditos restantes:** Railway → Usage

---

## 🐛 Troubleshooting Stage

### Backend no arranca:
```bash
# Ver logs
Railway → Backend → Deployments → Logs

# Buscar:
- Error de DATABASE_URL
- Missing env vars
- Python errors
```

### Frontend no conecta:
```bash
# Verificar:
VITE_API_BASE_URL=<URL_correcta_del_backend>

# En Railway:
Frontend → Variables → VITE_API_BASE_URL
```

### Base de datos sin datos:
```bash
# Restaurar backup:
# 1. Obtener DATABASE_URL de Railway
# 2. En tu Mac:
psql "<DATABASE_URL>" < db_backups/DATOS_COMPLETOS_20251218_133935.sql
```

### Emails no llegan:
```bash
# Verificar:
1. RESEND_API_KEY correcto
2. RESEND_FROM verificado en Resend
3. Ver logs del backend para errores de email
```

---

## 🔄 Rollback en Stage

Si algo sale mal:

```bash
# Opción 1: Rollback en Railway UI
Railway → Backend → Deployments → Click deployment anterior → Redeploy

# Opción 2: Revertir commit
git checkout stage
git revert HEAD
git push origin stage
```

---

## 📝 Feedback de Usuarios Beta

### Recolectar feedback:

1. **Google Form** con preguntas:
   - ¿Pudiste importar un partido?
   - ¿Los gráficos son útiles?
   - ¿Qué mejorarías?
   - Bugs encontrados

2. **Reuniones 1-a-1:**
   - Observar cómo usan la app
   - Tomar notas de pain points
   - Preguntar qué falta

3. **Analytics simples:**
   - Ver logs de Railway
   - Qué features usan más
   - Errores comunes

### Documentar feedback:

Crear archivo `FEEDBACK_STAGE.md` con:
```markdown
# Feedback Usuario Beta 1 (23 Dic 2025)
- ✅ Importación funciona bien
- ❌ Confuso el selector de categorías
- 💡 Sugiere agregar filtro por jugador
```

---

## ✅ Checklist Deployment Stage

- [ ] Rama `stage` creada
- [ ] Secrets generados para stage (`./generate_secrets.sh`)
- [ ] Railway proyecto configurado con branch `stage`
- [ ] Variables de entorno configuradas en Railway
- [ ] Backend desplegado y running
- [ ] Frontend desplegado y running
- [ ] Base de datos inicializada
- [ ] Datos de prueba restaurados
- [ ] Dominio stage configurado (opcional)
- [ ] SSL verificado (Railway lo hace automático)
- [ ] Admin login funciona
- [ ] Emails de verificación llegan
- [ ] Importación de partidos probada
- [ ] Gráficos cargan correctamente
- [ ] 3-5 usuarios beta creados
- [ ] Invitaciones enviadas a beta testers
- [ ] Logs monitoreados (sin errores críticos)

---

## 🎯 Criterios de Éxito para Stage

**Para poder promocionar a Production:**

- ✅ Mínimo 3 usuarios beta activos por 1 semana
- ✅ Feedback positivo en funcionalidades core
- ✅ Sin bugs críticos reportados
- ✅ Performance aceptable (<2s carga de página)
- ✅ Emails funcionando al 100%
- ✅ Importación exitosa de mínimo 5 partidos diferentes
- ✅ Gráficos mostrando datos correctos
- ✅ Sistema estable por 7 días seguidos

---

## 📞 Siguiente Paso

**Una vez que stage esté estable y validado:**

1. Leer `BRANCH_STRATEGY.md`
2. Crear rama `production`
3. Seguir guía de deployment a producción
4. Configurar dominio principal: conexusplay.com

---

**Última actualización:** 23 Diciembre 2025  
**Estado:** Stage lista para deploy
