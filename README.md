# 🏉 ConexusPlay - Análisis de Rugby

**ConexusPlay** es una plataforma web para analizar partidos de rugby. Importa datos de sistemas como LongoMatch, Sportscode o Nacsport, y visualiza estadísticas y eventos conectados con video.

---

## 🚀 Inicio Rápido (Para desarrolladores)

### Requisitos
- Docker instalado
- Git instalado

### 3 Pasos para arrancar

```bash
# 1. Clonar el proyecto
git clone https://github.com/agustinnadalich/conexus-play.git
cd conexus-play

# 2. Copiar configuración de ejemplo
cp .env.example .env

# 3. Iniciar todo
docker compose up -d
```

Abre tu navegador en: **http://localhost:3000**

---

## 🔐 Acceso al Sistema

**Usuario administrador por defecto:**
- Email: `admin@conexusplay.com`
- Contraseña: `Admin123!`

---

## 📁 ¿Qué hay en este proyecto?

```
conexus-play/
├── backend/          → Servidor (Python + Flask)
├── frontend/         → Interfaz web (React)
├── docker-compose.yml → Configuración para arrancar todo
└── .env              → Contraseñas y configuración (EDITAR SOLO ESTE)
```

---

## 🛠️ Comandos Útiles

### Ver logs (qué está pasando)
```bash
docker compose logs -f
```

### Detener todo
```bash
docker compose down
```

### Reiniciar un servicio
```bash
docker compose restart backend
```

---

## 📚 Documentación Completa

- **[Guía de Deploy Gratis](GUIA_DEPLOY_GRATIS_Y_LOW_COST.md)** - Cómo subir a internet (Railway gratis 2-3 meses)
- **[Deploy Rápido a Railway](QUICKSTART_RAILWAY.md)** - 30 minutos para tener tu web online
- **[Estrategia de Branches](BRANCH_STRATEGY.md)** - Cómo trabajar con Git (develop → stage → main)
- **[Ejemplos de Importación](EJEMPLOS_IMPORTACION.md)** - Cómo importar datos de LongoMatch/Sportscode

---

## 🆘 Ayuda Rápida

**¿No arranca?**
```bash
# Ver qué falló
docker compose logs

# Reiniciar todo
docker compose down
docker compose up -d
```

**¿Olvidaste la contraseña del admin?**
- Edita `.env`
- Cambia `INITIAL_ADMIN_PASSWORD=TuNuevaPassword123!`
- Reinicia: `docker compose restart backend`

**¿Base de datos vacía?**
- Importa datos desde la interfaz web (http://localhost:3000/import)
- O restaura backup: `docker compose exec -T db psql -U conexus_user -d conexus_db < backup.sql`

---

## 🌐 Producción

**Dominio:** https://conexusplay.com (próximamente)

Para deploy a producción, sigue: **[QUICKSTART_RAILWAY.md](QUICKSTART_RAILWAY.md)**

---

## 🏗️ Estructura de Branches

- `main` - Producción (código en vivo)
- `stage` - Testing (pruebas antes de producción)
- `develop` - Desarrollo activo (trabajo del día a día)

---

## 📧 Contacto

- **Repo:** https://github.com/agustinnadalich/conexus-play
- **Email:** admin@conexusplay.com

---

**¡Listo para analizar rugby! 🏉**
