# Sistema de Autenticación - Completado ✅

## Resumen de Implementación

Se ha completado la implementación del sistema de autenticación y autorización para el proyecto VideoAnalysis. El sistema incluye:

### ✅ Backend Configurado

#### Modelos de Base de Datos
- **User**: Usuarios del sistema con roles globales
- **ClubMembership**: Membresías de usuarios en clubs
- **MembershipTeamScope**: Alcance de acceso a equipos específicos
- **MembershipMatchScope**: Alcance de acceso a partidos específicos
- **EmailVerificationToken**: Tokens para verificación de email
- **PasswordResetToken**: Tokens para recuperación de contraseña

#### Endpoints de Autenticación (`/api/auth/*`)
- `POST /auth/login` - Iniciar sesión
- `GET /auth/me` - Obtener usuario actual
- `POST /auth/refresh` - Refrescar token
- `POST /auth/register` - Registrar nuevo usuario (solo super_admin)
- `POST /auth/invite` - Invitar usuario a club
- `POST /auth/verify-email` - Verificar email
- `POST /auth/request-password-reset` - Solicitar reset de contraseña
- `POST /auth/reset-password` - Resetear contraseña con token

#### Helpers de Autorización (`auth_utils.py`)
- `create_access_token()` - Generar JWT
- `decode_token()` - Decodificar JWT
- `get_current_user()` - Obtener usuario desde token
- `user_is_super_admin()` - Verificar si es super admin
- `user_can_view_match()` - Verificar permiso de lectura
- `user_can_edit_match()` - Verificar permiso de edición

#### Protección de Endpoints
Todos los endpoints de matches y events están protegidos con:
- Validación de token JWT
- Verificación de permisos por rol
- Alcance (scope) por club/team/match

### ✅ Frontend Configurado

#### Componentes
- **AuthContext** (`src/context/AuthContext.tsx`) - Contexto global de autenticación
- **RequireAuth** (`src/components/RequireAuth.tsx`) - Componente HOC para rutas protegidas
- **Login** (`src/pages/Login.tsx`) - Página de inicio de sesión
- **ForgotPassword** (`src/pages/ForgotPassword.tsx`) - Solicitar reset de contraseña
- **VerifyEmail** (`src/pages/VerifyEmail.tsx`) - Verificar email
- **ResetPassword** (`src/pages/ResetPassword.tsx`) - Resetear contraseña

#### Configuración
- `authFetch()` en `api.ts` - Wrapper para fetch con token automático
- Todas las rutas protegidas con `<RequireAuth>`
- Redirección automática a `/login` si no hay sesión

### ✅ Variables de Entorno Configuradas

#### Backend (.env y docker-compose.db.yml)
```env
# Authentication & Security
JWT_SECRET=tu-secreto-super-seguro-cambiar-en-produccion-12345678901234567890
AUTH_ENABLED=true
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Initial Super Admin
INITIAL_ADMIN_EMAIL=admin@videoanalysis.com
INITIAL_ADMIN_PASSWORD=Admin123!

# Email Verification & Password Reset
VERIFICATION_EXP_HOURS=24
RESET_EXP_MINUTES=60
APP_URL=http://localhost:5173

# SMTP Configuration (vacío = modo desarrollo, solo log)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

#### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:5001/api
```

## 📋 Instrucciones de Uso

### 1. Iniciar el Sistema

```bash
# Terminal 1: Iniciar backend + DB
cd /Users/Agustin/wa/videoanalisis/VideoAnalysis
docker compose -f docker-compose.db.yml up

# Terminal 2: Iniciar frontend
cd frontend
npm install  # Solo la primera vez
npm run dev
```

### 2. Acceder a la Aplicación

1. Abrir navegador en `http://localhost:5173`
2. Serás redirigido a `/login`
3. Usar credenciales del super admin:
   - **Email**: `admin@videoanalysis.com`
   - **Password**: `Admin123!`

### 3. Funcionalidades Disponibles

#### Como Super Admin puedes:
- ✅ Ver todos los partidos y eventos
- ✅ Editar cualquier partido
- ✅ Registrar nuevos usuarios
- ✅ Asignar roles y permisos
- ✅ Gestionar clubs y equipos

#### Sistema de Roles:
- **super_admin**: Acceso total
- **club_admin**: Administrador de un club específico
- **analyst**: Analista con permisos de lectura/escritura
- **viewer**: Solo lectura

#### Sistema de Scopes (Alcances):
- Sin scopes → acceso a todo el club
- Team scopes → solo equipos específicos
- Match scopes → solo partidos específicos

### 4. Crear Nuevos Usuarios

```bash
# Ejemplo de request (desde el frontend o Postman)
POST http://localhost:5001/api/auth/register
Authorization: Bearer <token-del-super-admin>
Content-Type: application/json

{
  "email": "analista@club.com",
  "password": "Password123!",
  "full_name": "Nombre Analista",
  "global_role": "user",
  "club_id": 1,
  "role": "analyst",
  "can_edit": true,
  "team_ids": [1, 2],
  "match_ids": []
}
```

### 5. Desactivar Autenticación (Modo Desarrollo)

Si necesitas desactivar temporalmente la autenticación:

```bash
# En docker-compose.db.yml, cambiar:
AUTH_ENABLED=false

# Reiniciar backend
docker compose -f docker-compose.db.yml restart backend
```

## 🧪 Testing

### Script de Prueba Automático
```bash
bash test_auth.sh
```

Este script verifica:
- Login con credenciales correctas
- Obtención de datos de usuario
- Acceso a endpoints protegidos con token
- Rechazo de requests sin token

### Pruebas Manuales Sugeridas
1. ✅ Login exitoso
2. ✅ Login con credenciales incorrectas
3. ✅ Acceso sin token → 401
4. ✅ Token expirado → 401 y logout automático
5. ✅ Refresh token
6. ✅ Verificación de email
7. ✅ Recuperación de contraseña

## 📧 Configuración de Email (Producción)

Para habilitar envío real de emails:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-app-password
SMTP_FROM=noreply@videoanalysis.com
```

**Nota**: En modo desarrollo (SMTP vacío), los emails se imprimen en consola del backend.

## 🔒 Seguridad

### Recomendaciones para Producción:
1. **Cambiar JWT_SECRET** por un valor aleatorio largo
2. **Usar HTTPS** en producción
3. **Configurar CORS** para dominios específicos
4. **Habilitar rate limiting** en endpoints sensibles
5. **Configurar SMTP real** con credenciales seguras
6. **Usar variables de entorno** en servidor de producción
7. **Cambiar contraseña** del super admin inicial

### Políticas de Seguridad Implementadas:
- ✅ Contraseñas hasheadas con werkzeug
- ✅ Tokens JWT con expiración
- ✅ Validación de permisos en cada endpoint
- ✅ Logout automático en token inválido
- ✅ Tokens de verificación y reset con expiración

## 📊 Estado Actual

### ✅ Completado
- [x] Modelos de base de datos
- [x] Endpoints de autenticación
- [x] Helpers de autorización
- [x] Protección de endpoints existentes
- [x] Frontend AuthContext
- [x] Componentes de login/registro
- [x] Rutas protegidas
- [x] Variables de entorno
- [x] Super admin inicial
- [x] Script de testing

### 🚧 Pendiente (Opcional)
- [ ] Panel de administración de usuarios en frontend
- [ ] Gestión de membresías desde UI
- [ ] Dashboard de permisos
- [ ] Logs de auditoría
- [ ] Rate limiting
- [ ] OAuth2 / SSO
- [ ] 2FA (autenticación de dos factores)

## 🐛 Troubleshooting

### Backend no inicia
```bash
# Ver logs
docker logs videoanalysis-backend-1 --tail 50

# Reconstruir imagen
docker compose -f docker-compose.db.yml build backend
docker compose -f docker-compose.db.yml up -d
```

### Frontend no puede conectar
- Verificar que backend esté en `http://localhost:5001`
- Verificar `VITE_API_BASE_URL` en `frontend/.env`
- Verificar CORS en backend

### Token inválido / 401
- Verificar que `JWT_SECRET` sea el mismo que generó el token
- El token expira en 60 minutos por defecto
- Usar `/auth/refresh` para obtener nuevo token

### No puedo ver partidos
- Verificar que el usuario tenga membresías o sea super_admin
- Verificar scopes de la membresía
- Verificar que `AUTH_ENABLED=true`

## 📚 Recursos

- Documentación de Flask-JWT: https://pyjwt.readthedocs.io/
- React Router Auth: https://reactrouter.com/en/main/start/tutorial
- Werkzeug Security: https://werkzeug.palletsprojects.com/en/3.0.x/utils/#module-werkzeug.security

---

**Última actualización**: 18 de Diciembre de 2025
**Estado**: ✅ Sistema Operativo y Funcional
