# 🎯 Estrategia de Ramas: Stage → Production

## 📊 Estructura de Ramas

```
main (desarrollo local)
  ↓
base_de_datos (features completas)
  ↓
stage (testing con usuarios beta) ← ESTAMOS AQUÍ
  ↓
production (producción final) ← PRÓXIMAMENTE
```

---

## 🌿 Descripción de Ramas

### **`main`**
- Rama principal de desarrollo
- Código experimental y features en progreso
- Deploy: Local únicamente

### **`base_de_datos`**
- Features completadas y funcionales
- Sistema de autenticación implementado
- Base de datos relacional completa
- Deploy: Local con Docker

### **`stage`** ⭐ **ACTUAL**
- Ambiente de pruebas con usuarios reales
- Testing de MVP con beta testers
- Recolección de feedback
- Deploy: **Railway (gratis 2-3 meses)**
- URL: https://stage.conexusplay.com (o Railway subdomain)

### **`production`** 🚀 **PRÓXIMAMENTE**
- Versión estable para usuarios finales
- Solo se sube después de validar en stage
- Deploy: **Railway** (si ya pagas) o **Hetzner VPS** (más barato)
- URL: https://conexusplay.com

---

## 🔄 Workflow de Desarrollo

### Fase Actual: Testing en Stage

```bash
# 1. Trabajas en base_de_datos
git checkout base_de_datos
# ... haces cambios y commits ...

# 2. Mergeas a stage cuando esté listo para testing
git checkout stage
git merge base_de_datos

# 3. Push a stage (despliega automáticamente en Railway)
git push origin stage

# 4. Usuarios beta prueban en stage
# 5. Recoges feedback
# 6. Vuelves a base_de_datos para fixes
```

### Fase Futura: Promoción a Production

```bash
# Solo cuando stage esté TOTALMENTE validado:
git checkout production  # (cuando la crees)
git merge stage
git push origin production  # Despliega a producción
```

---

## 🚀 Configuración de Deployment por Rama

### Stage (Railway)
```bash
# Variables de entorno específicas de stage
FLASK_ENV=production
APP_URL=https://stage.conexusplay.com
FRONTEND_URL=https://stage.conexusplay.com

# Base de datos: Railway PostgreSQL Dev ($5/mes incluido en crédito)
DATABASE_URL=<Railway proporcionará>

# Email: Usar Resend real
RESEND_API_KEY=re_axRSdarV_B4Q7mmDrVZLHcZf56JxUsREc
RESEND_FROM=noreply@conexusplay.com

# Admin inicial para testing
INITIAL_ADMIN_EMAIL=admin@conexusplay.com
INITIAL_ADMIN_PASSWORD=<PASSWORD_STAGE>

# JWT secret específico de stage
JWT_SECRET=<STAGE_SECRET>
```

### Production (Futuro)
```bash
# Variables de entorno de producción real
FLASK_ENV=production
APP_URL=https://conexusplay.com
FRONTEND_URL=https://conexusplay.com

# Base de datos: Railway Pro o Hetzner PostgreSQL
DATABASE_URL=<URL_PRODUCCION>

# Email: Resend con dominio verificado
RESEND_API_KEY=re_axRSdarV_B4Q7mmDrVZLHcZf56JxUsREc
RESEND_FROM=noreply@conexusplay.com

# Admin de producción (diferente a stage)
INITIAL_ADMIN_EMAIL=admin@conexusplay.com
INITIAL_ADMIN_PASSWORD=<PASSWORD_PRODUCCION_SEGURO>

# JWT secret DIFERENTE a stage
JWT_SECRET=<PRODUCTION_SECRET>
```

---

## 📝 Checklist: Antes de Subir a Stage

- [x] Todos los tests locales pasan
- [x] Docker Compose funciona correctamente
- [x] Base de datos con datos de prueba
- [x] Autenticación probada
- [x] Emails funcionando (Resend)
- [x] Importación de partidos funcional
- [x] Gráficos y análisis operativos
- [ ] Generar nuevos secrets para stage (`./generate_secrets.sh`)
- [ ] Configurar Railway con branch `stage`
- [ ] Configurar dominio stage (opcional: stage.conexusplay.com)
- [ ] Crear usuarios beta de prueba
- [ ] Documentar bugs conocidos para usuarios beta

---

## 📝 Checklist: Antes de Subir a Production

- [ ] Stage probado por >3 usuarios beta
- [ ] Feedback recolectado e implementado
- [ ] Sin bugs críticos reportados por 1 semana
- [ ] Performance validado con carga real
- [ ] Backups configurados y probados
- [ ] Monitoreo configurado
- [ ] Plan de rollback documentado
- [ ] Generar nuevos secrets para production
- [ ] Migración de datos planificada (si aplicable)
- [ ] Dominio principal configurado (conexusplay.com)
- [ ] SSL verificado y funcionando

---

## 🔧 Comandos Útiles

### Ver rama actual
```bash
git branch
```

### Cambiar entre ramas
```bash
git checkout base_de_datos  # Para desarrollo
git checkout stage          # Para preparar release a testing
git checkout production     # Para release final (cuando exista)
```

### Mergear cambios de base_de_datos a stage
```bash
git checkout stage
git merge base_de_datos
git push origin stage
```

### Ver diferencias entre ramas
```bash
git diff base_de_datos..stage
```

### Ver commits únicos en una rama
```bash
git log stage..base_de_datos  # Commits en base_de_datos no en stage
```

---

## 🐛 Manejo de Bugs en Producción

### Si encuentras bug en stage:
1. **NO hagas hotfix directo en stage**
2. Vuelve a `base_de_datos`
3. Crea branch de fix: `git checkout -b fix/nombre-del-bug`
4. Arregla el bug y commitea
5. Merge a `base_de_datos`: `git checkout base_de_datos && git merge fix/nombre-del-bug`
6. Merge a `stage`: `git checkout stage && git merge base_de_datos`
7. Push: `git push origin stage`

### Si encuentras bug CRÍTICO en production (futuro):
1. Puedes hacer hotfix directo en `production`
2. Pero INMEDIATAMENTE mergear back a `stage` y `base_de_datos`
3. Para evitar divergencias

---

## 📊 Estado Actual del Proyecto

### Rama: `stage` (23 Dic 2025)

**Funcionalidades listas para testing:**
- ✅ Sistema de autenticación completo
- ✅ Gestión de clubes y teams
- ✅ Importación de partidos XML
- ✅ Análisis y visualizaciones
- ✅ Base de datos con datos reales
- ✅ Email con Resend configurado

**Pendiente para testing:**
- [ ] Validar flujo completo con usuarios reales
- [ ] Probar rendimiento con múltiples usuarios
- [ ] Verificar usabilidad de UI/UX
- [ ] Testear en diferentes dispositivos
- [ ] Recoger feedback de analistas de rugby

**Bugs conocidos:** Ninguno crítico reportado

---

## 🎯 Próximos Pasos

1. **HOY (23 Dic):**
   - [x] Crear rama `stage`
   - [ ] Generar secrets para stage
   - [ ] Deploy en Railway
   - [ ] Configurar dominio stage (opcional)

2. **Esta Semana:**
   - [ ] Invitar 3-5 usuarios beta
   - [ ] Monitorear uso y logs
   - [ ] Documentar feedback recibido

3. **Próximas 2 Semanas:**
   - [ ] Implementar fixes de feedback
   - [ ] Iterar mejoras de UX
   - [ ] Preparar documentación de usuario

4. **Mes 1-2:**
   - [ ] Validar estabilidad de stage
   - [ ] Decidir si migrar a Hetzner VPS
   - [ ] Crear rama `production`
   - [ ] Launch público

---

## 💡 Notas Importantes

- **NUNCA** commitear secrets (`.env`) al repo
- **SIEMPRE** usar diferentes secrets en stage vs production
- **DOCUMENTAR** todos los cambios importantes
- **TESTEAR** en stage antes de production
- **BACKUP** de base de datos antes de cada deploy importante

---

## 📞 Contacto y Soporte

**Desarrollador:** Agustín Nadalich  
**Proyecto:** VideoAnalysis / ConexusPlay  
**Repo:** github.com/agustinnadalich/VideoAnalysis  
**Email:** admin@conexusplay.com

---

**Última actualización:** 23 Diciembre 2025  
**Versión:** MVP Stage v1.0
