# 🚀 GUÍA PASO A PASO - Sistema de Autenticación

## ✅ Todo está listo. Solo debes seguir estos pasos:

### PASO 1: Verificar que el Backend esté corriendo
```bash
# Ver si el backend está activo
docker ps | grep backend

# Si no está corriendo, iniciarlo:
cd /Users/Agustin/wa/videoanalisis/VideoAnalysis
docker compose -f docker-compose.db.yml up -d
```

**✅ Verificación**: Deberías ver logs del backend sin errores
```bash
docker logs videoanalysis-backend-1 --tail 20
```

Busca esta línea:
```
✅ Super admin creado: admin@videoanalysis.com
```

---

### PASO 2: Iniciar el Frontend
```bash
# Abrir una nueva terminal
cd /Users/Agustin/wa/videoanalisis/VideoAnalysis/frontend

# Instalar dependencias (solo la primera vez)
npm install

# Iniciar el servidor de desarrollo
npm run dev
```

**✅ Verificación**: Deberías ver algo como:
```
VITE v5.x.x  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

### PASO 3: Probar el Login

1. **Abrir el navegador** en `http://localhost:5173`

2. **Serás redirigido automáticamente** a `/login`

3. **Usar estas credenciales**:
   - **Email**: `admin@videoanalysis.com`
   - **Password**: `Admin123!`

4. **Click en "Entrar"**

**✅ Verificación**: Deberías:
- Ver un mensaje "Accediendo..."
- Ser redirigido al dashboard con la lista de partidos
- NO ver errores en la consola del navegador (F12)

---

### PASO 4: Verificar que funciona

Una vez dentro, deberías poder:
- ✅ Ver la lista de partidos
- ✅ Hacer click en un partido y ver los eventos
- ✅ Navegar por todas las secciones
- ✅ Ver tu usuario en la esquina superior (si hay un componente de usuario)

---

## 🔍 Si algo no funciona...

### Error: "No se pudo iniciar sesión"
```bash
# 1. Verificar que el backend esté corriendo
docker ps | grep backend

# 2. Verificar logs del backend
docker logs videoanalysis-backend-1 --tail 50

# 3. Probar el endpoint manualmente
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@videoanalysis.com","password":"Admin123!"}'
```

### Error: "Failed to fetch" o "Network error"
```bash
# Verificar que el backend esté en el puerto 5001
curl http://localhost:5001/api/matches

# Si no responde, reiniciar el backend
docker compose -f docker-compose.db.yml restart backend
```

### Error 401 al cargar datos
- Significa que el token no se está enviando
- Verificar en DevTools (F12) → Application → Local Storage → `access_token`
- Si no hay token, volver a hacer login

---

## 🧪 Prueba Rápida (Opcional)

Ejecutar el script de testing automatizado:
```bash
cd /Users/Agustin/wa/videoanalisis/VideoAnalysis
bash test_auth.sh
```

Si todo está bien, verás:
```
✅ Token obtenido: eyJhbGciOiJI...
✅ Datos del usuario obtenidos
✅ Acceso a matches exitoso
✅ Rechazo sin token (401) - CORRECTO
```

---

## 📋 Checklist Final

Antes de reportar cualquier problema, verificar:

- [ ] Backend corriendo (`docker ps`)
- [ ] Frontend corriendo (`npm run dev`)
- [ ] Backend sin errores en logs
- [ ] Frontend accesible en `http://localhost:5173`
- [ ] Backend accesible en `http://localhost:5001`
- [ ] Variables de entorno configuradas (`.env` en raíz y en `frontend/`)
- [ ] Credenciales correctas: `admin@videoanalysis.com` / `Admin123!`

---

## 🎯 Credenciales por Defecto

**Super Admin:**
- Email: `admin@videoanalysis.com`
- Password: `Admin123!`

⚠️ **IMPORTANTE**: Cambiar esta contraseña en producción

---

## 📞 ¿Necesitas Ayuda?

Si sigues teniendo problemas:

1. **Copiar** el error exacto que ves
2. **Copiar** los logs del backend: `docker logs videoanalysis-backend-1 --tail 50`
3. **Tomar captura** de la consola del navegador (F12 → Console)
4. Compartir toda esta información

---

## 🎉 ¡Eso es todo!

El sistema de autenticación está **100% funcional** y listo para usar.

Ahora puedes:
- Iniciar sesión como super admin
- Crear nuevos usuarios desde el backend
- Asignar roles y permisos
- Controlar acceso a partidos y equipos

**¡Disfruta de tu nueva funcionalidad de seguridad!** 🔒
