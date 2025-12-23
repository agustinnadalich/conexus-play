# 🚀 Guía de Deployment - VideoAnalysis

## Checklist Pre-Deployment

### ✅ Archivos Necesarios para Producción

#### Configuración Principal
- [x] `docker-compose.yml` - Orquestación de contenedores
- [x] `.env.example` - Template de configuración (copiar a `.env`)
- [x] `.gitignore` - Archivos a ignorar en git

#### Backend
- [x] `backend/Dockerfile` - Build del backend
- [x] `backend/requirements.txt` - Dependencias Python
- [x] `backend/app.py` - Aplicación principal
- [x] `backend/db.py` - Configuración de base de datos
- [x] `backend/models.py` - Modelos SQLAlchemy
- [x] `backend/init_db.py` - Script de inicialización
- [x] `backend/auth_utils.py` - Utilidades de autenticación
- [x] `backend/importer.py` - Importación de datos
- [x] `backend/normalizer.py` - Normalización de datos
- [x] `backend/enricher.py` - Enriquecimiento de datos
- [x] `backend/translator.py` - Traducción
- [x] `backend/mail_service.py` - Servicio de email
- [x] `backend/register_routes.py` - Registro de rutas
- [x] `backend/routes/` - Todos los endpoints

#### Frontend
- [x] `frontend/Dockerfile` - Build del frontend
- [x] `frontend/package.json` - Dependencias Node
- [x] `frontend/vite.config.ts` - Configuración Vite
- [x] `frontend/src/` - Código fuente React

#### Datos
- [x] `db_backups/DATOS_COMPLETOS_20251218_133935.sql` - Backup completo

---

## 📋 Pasos para Deploy en Nuevo Servidor

### 1. Preparar el Servidor

```bash
# Instalar Docker y Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Verificar instalación
docker --version
docker compose version
```

### 2. Clonar Repositorio

```bash
git clone https://github.com/agustinnadalich/VideoAnalysis.git
cd VideoAnalysis
```

### 3. Configurar Variables de Entorno

```bash
# Copiar template
cp .env.example .env

# IMPORTANTE: Editar .env con valores de producción
nano .env
```

**Valores CRÍTICOS a cambiar:**

```bash
# Generar JWT_SECRET seguro
python3 -c "import secrets; print(secrets.token_urlsafe(64))"

# Editar .env:
POSTGRES_PASSWORD=<password-seguro-complejo>
DATABASE_URL=postgresql://videoanalysis_db_user:<password-seguro-complejo>@db:5432/videoanalysis_db
JWT_SECRET=<resultado-del-comando-anterior>
INITIAL_ADMIN_PASSWORD=<password-admin-seguro>
APP_URL=https://tu-dominio.com  # URL de producción
```

### 4. Crear Volumen de Base de Datos

```bash
# Crear volumen externo para persistir datos
docker volume create videoanalysis_postgres-data
```

### 5. (OPCIONAL) Restaurar Datos desde Backup

Si tienes backup SQL:

```bash
# Iniciar solo la base de datos
docker compose up -d db

# Esperar a que esté lista
sleep 10

# Restaurar backup
docker compose exec -T db psql -U videoanalysis_db_user -d videoanalysis_db < db_backups/DATOS_COMPLETOS_20251218_133935.sql
```

### 6. Iniciar Todos los Servicios

#### Opción A: Desarrollo (Flask dev server + Vite hot-reload)
```bash
# Build y start con hot-reload
docker compose up -d

# Ver logs
docker compose logs -f
```

#### Opción B: Producción (Gunicorn + Nginx optimizado)
```bash
# Build y start con Gunicorn + Nginx
docker compose -f docker-compose.prod.yml up -d

# Ver logs
docker compose -f docker-compose.prod.yml logs -f
```

**Diferencias:**
- **Desarrollo:** Flask dev server (auto-reload), Vite dev server (HMR)
- **Producción:** Gunicorn (4 workers), Nginx (static files optimizados)

### 7. Verificar Funcionamiento

```bash
# Test backend
curl http://localhost:5001/api/clubs

# Test login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@videoanalysis.com","password":"TU_PASSWORD"}'

# Acceder a frontend
# http://localhost:3000
```

### 8. Configurar Reverse Proxy (Producción)

Para producción con dominio, usar Nginx:

```nginx
# /etc/nginx/sites-available/videoanalysis
server {
    listen 80;
    server_name tu-dominio.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Activar y SSL:

```bash
# Activar sitio
sudo ln -s /etc/nginx/sites-available/videoanalysis /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Configurar SSL con Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com
```

---

## 🔄 Migraciones de Base de Datos

### Migración Automática (Recomendado)

El backend crea automáticamente las tablas al iniciar usando `Base.metadata.create_all()`.

**NO se necesitan migraciones manuales para inicialización.**

### Backup y Restore

```bash
# Crear backup
docker compose exec db pg_dump -U videoanalysis_db_user videoanalysis_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup
docker compose exec -T db psql -U videoanalysis_db_user -d videoanalysis_db < backup.sql
```

---

## 🔐 Seguridad en Producción

### Checklist de Seguridad

- [ ] Cambiar `POSTGRES_PASSWORD` a password complejo
- [ ] Generar `JWT_SECRET` único de 64 bytes
- [ ] Cambiar `INITIAL_ADMIN_PASSWORD`
- [ ] Configurar SMTP real (no dejar vacío)
- [ ] Configurar firewall (solo puertos 80/443)
- [ ] Usar HTTPS con certificado SSL
- [ ] Configurar backups automáticos
- [ ] Limitar acceso a puerto 5432 (PostgreSQL)
- [ ] Revisar permisos de archivos sensibles

### Comandos de Seguridad

```bash
# Proteger .env
chmod 600 .env

# Firewall (UFW)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 📊 Monitoreo

### Logs

```bash
# Ver logs de todos los servicios
docker compose logs -f

# Solo backend
docker compose logs -f backend

# Solo base de datos
docker compose logs -f db
```

### Health Checks

```bash
# Estado de contenedores
docker compose ps

# Uso de recursos
docker stats

# Verificar base de datos
docker compose exec db psql -U videoanalysis_db_user -d videoanalysis_db -c "SELECT COUNT(*) FROM matches;"
```

---

## 🆘 Troubleshooting

### Problema: Backend no conecta a DB

```bash
# Verificar que DB esté corriendo
docker compose ps db

# Ver logs de DB
docker compose logs db

# Verificar credenciales en .env
cat .env | grep POSTGRES
```

### Problema: Frontend no encuentra API

```bash
# Verificar variable de entorno
docker compose exec frontend env | grep VITE_API

# Debe ser: VITE_API_BASE_URL=http://localhost:5001/api
```

### Problema: Token JWT inválido

```bash
# Verificar que JWT_SECRET esté configurado
docker compose exec backend python -c "import os; from dotenv import load_dotenv; load_dotenv(); print('JWT_SECRET:', os.getenv('JWT_SECRET')[:20] + '...')"

# Reiniciar backend después de cambiar .env
docker compose restart backend
```

---

## ✅ Verificación Final

Checklist post-deployment:

- [ ] Frontend accesible en http://localhost:3000
- [ ] Login funciona con credenciales admin
- [ ] Backend responde en http://localhost:5001/api/clubs
- [ ] Datos cargados correctamente (matches, clubs, players)
- [ ] Logs no muestran errores
- [ ] Volumen de PostgreSQL persistente configurado
- [ ] Backups programados (cron)

---

## 📚 Archivos de Referencia

- `README_NUEVO.md` - Documentación principal
- `GUIA_RAPIDA.md` - Comandos rápidos
- `AUTENTICACION_COMPLETADO.md` - Sistema de auth
- `MAPPINGS_DOCUMENTATION.md` - Perfiles de importación
- `WORKFLOW.md` - Flujo de trabajo
