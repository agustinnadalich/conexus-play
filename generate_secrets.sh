#!/bin/bash
# ====================================
# Generador de Secrets para Producción
# ====================================
# Este script genera todos los valores secretos necesarios
# para desplegar VideoAnalysis en producción

echo "🔐 Generador de Secrets para VideoAnalysis"
echo "=========================================="
echo ""

# Verificar que Python3 está instalado
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python3 no está instalado"
    exit 1
fi

echo "✅ Generando secrets seguros..."
echo ""

# Generar JWT Secret
echo "🔑 JWT_SECRET (para tokens de autenticación):"
JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(64))")
echo "$JWT_SECRET"
echo ""

# Generar password para admin
echo "👤 INITIAL_ADMIN_PASSWORD (para cuenta admin inicial):"
ADMIN_PASS=$(python3 -c "import secrets; print(secrets.token_urlsafe(16))")
echo "$ADMIN_PASS"
echo ""

# Generar password para base de datos
echo "🗄️  POSTGRES_PASSWORD (para PostgreSQL):"
DB_PASS=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
echo "$DB_PASS"
echo ""

echo "=========================================="
echo "📋 COPIAR ESTOS VALORES A:"
echo ""
echo "1. Railway → Variables de cada servicio"
echo "2. O archivo .env en VPS"
echo ""
echo "⚠️  IMPORTANTE: Guardar en lugar seguro (1Password, etc)"
echo "❌ NO SUBIR A GITHUB"
echo ""

# Opción: guardar en archivo (comentado por seguridad)
# echo "¿Guardar en archivo .env.production? (y/n)"
# read -r response
# if [[ "$response" == "y" ]]; then
#     echo "JWT_SECRET=$JWT_SECRET" > .env.production
#     echo "INITIAL_ADMIN_PASSWORD=$ADMIN_PASS" >> .env.production
#     echo "POSTGRES_PASSWORD=$DB_PASS" >> .env.production
#     echo "✅ Guardado en .env.production"
#     echo "⚠️  Recuerda: NO subir este archivo a git"
# fi
