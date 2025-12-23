#!/bin/bash

echo "🚀 Iniciando VideoAnalysis con Docker Compose..."
echo ""

# Detener contenedores existentes
echo "🛑 Deteniendo contenedores anteriores..."
docker compose down

# Iniciar todos los servicios
echo "🎬 Iniciando servicios (DB + Backend + Frontend)..."
docker compose up -d

# Esperar a que los servicios estén listos
echo ""
echo "⏳ Esperando a que los servicios estén listos..."
sleep 8

# Verificar estado
echo ""
echo "📊 Estado de los contenedores:"
docker compose ps

echo ""
echo "✅ Sistema iniciado!"
echo ""
echo "📍 URLs de acceso:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5001"
echo "   Database: localhost:5432"
echo ""
echo "🔑 Credenciales (configuradas en .env):"
echo "   Email:    \${INITIAL_ADMIN_EMAIL}"
echo "   Password: \${INITIAL_ADMIN_PASSWORD}"
echo ""
echo "📝 Ver logs en tiempo real:"
echo "   docker compose logs -f"
echo ""
echo "🛑 Detener todos los servicios:"
echo "   docker compose down"
echo ""
