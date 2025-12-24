# 🔐 Estrategia de Seguridad por Ambiente

**Fecha:** 24 Diciembre 2025  
**Proyecto:** ConexusPlay

---

## 🎯 Principio Fundamental

**Cada ambiente DEBE tener secretos completamente diferentes:**

```
LOCAL ≠ STAGE ≠ PRODUCTION
```

Si un secreto de STAGE se expone → PRODUCTION sigue seguro  
Si un secreto de LOCAL se expone → STAGE y PRODUCTION siguen seguros

---

## 🏗️ Ambientes y sus Características

### 1. **LOCAL** (Desarrollo)

**Ubicación:** Tu Mac  
**Archivo:** `.env` (ya existe, en .gitignore)  
**Propósito:** Desarrollo y pruebas locales  
**Seguridad:** Media (solo tú tienes acceso)

**Características:**
- Passwords simples y memorables (ej: `Admin123!`)
- Base de datos local (Docker)
- Emails en modo log (sin Resend, opcional)
- No expuesto a internet

**Secretos:**
```bash
JWT_SECRET=<tu_secret_actual_local>
INITIAL_ADMIN_PASSWORD=Admin123!  # Simple para desarrollo
POSTGRES_PASSWORD=videoanalysis_db_password!!  # Simple
RESEND_API_KEY=<opcional_para_testing_emails>
```

---

### 2. **STAGE** (Testing/Beta)

**Ubicación:** Railway  
**Configuración:** Variables de entorno en Railway  
**Propósito:** Testing con usuarios beta reales  
**Seguridad:** Alta (expuesto a internet + usuarios externos)  
**URL:** `stage.conexusplay.com`

**Características:**
- Passwords muy seguros (20+ caracteres)
- Base de datos Railway PostgreSQL
- Emails reales con Resend
- 5-10 usuarios beta

**Secretos:**
```bash
JWT_SECRET=<GENERAR_NUEVO_64_BYTES>  # ⚠️ DIFERENTE a local
INITIAL_ADMIN_PASSWORD=<GENERAR_NUEVO_20_CHARS>  # ⚠️ DIFERENTE a local
POSTGRES_PASSWORD=<Railway_lo_genera>
RESEND_API_KEY=<TU_RESEND_API_KEY_REAL>
```

**⚠️ IMPORTANTE:** 
- Generar con `./generate_secrets.sh` → opción 2 (STAGE)
- Guardar en gestor de contraseñas (1Password)
- Configurar en Railway → Variables

---

### 3. **PRODUCTION** (Producción)

**Ubicación:** Railway (o Hetzner VPS en futuro)  
**Configuración:** Variables de entorno en Railway  
**Propósito:** Usuarios finales pagando  
**Seguridad:** Máxima (datos reales + privacidad)  
**URL:** `conexusplay.com`

**Características:**
- Passwords ULTRA seguros (24+ caracteres)
- Base de datos con backups automáticos
- Emails reales con dominio verificado
- Monitoreo y alertas

**Secretos:**
```bash
JWT_SECRET=<GENERAR_NUEVO_64_BYTES>  # ⚠️ DIFERENTE a stage y local
INITIAL_ADMIN_PASSWORD=<GENERAR_NUEVO_24_CHARS>  # ⚠️ DIFERENTE a stage y local
POSTGRES_PASSWORD=<Railway_lo_genera_o_super_seguro>
RESEND_API_KEY=<TU_RESEND_API_KEY_REAL>
```

**⚠️ CRÍTICO:**
- Generar con `./generate_secrets.sh` → opción 3 (PRODUCTION)
- Guardar en 2 lugares seguros (1Password + backup físico)
- NUNCA reutilizar secretos de otros ambientes
- Rotación periódica (cada 6 meses mínimo)

---

## 🔧 Workflow de Generación de Secretos

### Paso 1: Generar Secretos

```bash
cd /Users/Agustin/wa/videoanalisis/conexus-play
./generate_secrets.sh
```

Opciones:
1. LOCAL → Para desarrollo local
2. STAGE → Para testing en Railway
3. PRODUCTION → Para producción en Railway
4. TODOS → Generar los 3 sets de una vez

### Paso 2: Guardar en Lugar Seguro

**Recomendaciones:**
- **1Password** (ideal)
- **LastPass**
- **Bitwarden**
- **Nota segura en iCloud** (mínimo)

**Estructura sugerida en 1Password:**

```
ConexusPlay - LOCAL
├── JWT_SECRET
├── ADMIN_PASSWORD
└── DB_PASSWORD

ConexusPlay - STAGE
├── JWT_SECRET
├── ADMIN_PASSWORD
└── RESEND_API_KEY

ConexusPlay - PRODUCTION
├── JWT_SECRET
├── ADMIN_PASSWORD
└── RESEND_API_KEY
```

### Paso 3: Configurar en Destino

**LOCAL:**
```bash
# Ya está en tu .env actual
# No necesitas cambiar nada para desarrollo
```

**STAGE:**
```bash
# Railway Dashboard → Tu proyecto → Backend service
# Settings → Variables → Agregar una por una
```

**PRODUCTION:**
```bash
# Railway Dashboard → Tu proyecto → Backend service
# Settings → Variables → Agregar una por una
# O crear ambiente separado en Railway
```

---

## 🚨 Qué Hacer Si un Secreto Se Expone

### Si se expone LOCAL:
- ✅ No hay problema (solo uso interno)
- 🔄 Opcional: regenerar si quieres

### Si se expone STAGE:
1. 🚨 Regenerar INMEDIATAMENTE todos los secretos de STAGE
2. 🔄 Actualizar en Railway
3. 🔄 Resetear passwords de usuarios beta
4. ✅ PRODUCTION sigue seguro (secretos diferentes)

### Si se expone PRODUCTION:
1. 🚨🚨🚨 ALERTA MÁXIMA
2. 🔒 Regenerar TODOS los secretos de PRODUCTION
3. 🔄 Actualizar en Railway
4. 🔄 Forzar logout de todos los usuarios (JWT_SECRET nuevo)
5. 📧 Notificar a usuarios del cambio
6. 🔍 Auditar logs para detectar accesos no autorizados
7. 📝 Documentar incidente

---

## 📋 Checklist de Seguridad

### Antes de Deploy a STAGE:
- [ ] Generar secretos con `./generate_secrets.sh` (opción 2)
- [ ] Guardar en gestor de contraseñas
- [ ] Configurar en Railway → Variables
- [ ] Verificar que NO están en .env local
- [ ] Hacer prueba de login en stage
- [ ] Verificar que emails funcionan

### Antes de Deploy a PRODUCTION:
- [ ] Generar secretos con `./generate_secrets.sh` (opción 3)
- [ ] Guardar en 2 lugares seguros
- [ ] Configurar en Railway → Variables
- [ ] Verificar que son DIFERENTES a STAGE
- [ ] Probar login en production
- [ ] Configurar backups automáticos
- [ ] Configurar monitoreo de errores

### Cada 6 Meses:
- [ ] Rotar JWT_SECRET de PRODUCTION
- [ ] Cambiar ADMIN_PASSWORD de PRODUCTION
- [ ] Verificar que Resend API Key sigue activa
- [ ] Auditar logs de accesos

---

## 🛡️ Protecciones Implementadas

### 1. **Git Hook Pre-commit**
```bash
# Se ejecuta automáticamente antes de cada commit
.git/hooks/pre-commit
```

- ✅ Detecta API keys expuestas
- ✅ Bloquea commit si encuentra secretos
- ✅ Previene exposición accidental

### 2. **.gitignore Reforzado**
```bash
.env
.env.*
.env.local
.env.stage
.env.production
```

- ✅ Protege todos los archivos .env
- ✅ Incluye variantes con sufijos
- ✅ No permite commits accidentales

### 3. **Script de Verificación**
```bash
./check_secrets.sh
```

- ✅ Verifica archivos antes de push
- ✅ Escanea patrones de secretos
- ✅ Puede ejecutarse manualmente

---

## 💡 Best Practices

### ✅ SÍ Hacer:

1. **Usar gestores de contraseñas** (1Password, LastPass)
2. **Generar secretos diferentes por ambiente**
3. **Rotar secretos periódicamente**
4. **Guardar backups de secretos de producción**
5. **Usar placeholders en documentación** (`<TU_API_KEY>`)
6. **Verificar con `./check_secrets.sh` antes de push**

### ❌ NUNCA Hacer:

1. **Commitear archivos .env al repositorio**
2. **Reutilizar secretos entre ambientes**
3. **Compartir secretos por email/chat**
4. **Poner secretos en documentación**
5. **Usar passwords débiles en producción**
6. **Ignorar alertas del pre-commit hook**

---

## 📞 Contacto en Caso de Incidente

**Si detectas exposición de secretos:**
1. No entrar en pánico
2. Seguir checklist de "Qué Hacer Si un Secreto Se Expone"
3. Documentar el incidente
4. Implementar mejoras para prevenir recurrencia

---

## 🔄 Rotación de Secretos (Futuro)

### Cuándo Rotar:

- **JWT_SECRET:** Cada 6 meses o después de incidente
- **ADMIN_PASSWORD:** Cada 3 meses o después de acceso no autorizado
- **DB_PASSWORD:** Cada 12 meses o después de incidente
- **API_KEYS:** Cuando el proveedor lo recomiende

### Cómo Rotar:

1. Generar nuevos secretos con `./generate_secrets.sh`
2. Programar ventana de mantenimiento
3. Actualizar en Railway
4. Redeploy servicios
5. Probar que todo funciona
6. Archivar secretos antiguos (por si rollback)
7. Esperar 7 días antes de borrar secretos antiguos

---

**Última actualización:** 24 Diciembre 2025  
**Versión:** 1.0  
**Responsable:** Agustín Nadalich

---

## ✅ Estado Actual

- ✅ Estrategia definida
- ✅ Script de generación listo
- ✅ Protecciones Git implementadas
- 🔄 Pendiente: Generar secretos STAGE
- 🔄 Pendiente: Generar secretos PRODUCTION
- 🔄 Pendiente: Configurar en Railway
