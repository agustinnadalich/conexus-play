#!/bin/bash

# 🔐 Script para generar secrets seguros por ambiente
# Genera sets completos para: LOCAL, STAGE, PRODUCTION

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

function generate_secrets() {
    local env=$1
    
    echo -e "${BLUE}🔐 Generando secrets para ambiente: ${env}${NC}"
    echo ""
    
    # Generar JWT Secret (64 bytes - muy seguro)
    JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(64))")
    
    # Generar Admin Password (20 caracteres - seguro y memorable)
    ADMIN_PASS=$(python3 -c "import secrets, string; chars = string.ascii_letters + string.digits + '!@#$%^&*'; print(''.join(secrets.choice(chars) for _ in range(20)))")
    
    # Generar Database Password (24 caracteres - muy seguro)
    DB_PASS=$(python3 -c "import secrets, string; chars = string.ascii_letters + string.digits + '!@#$%^&*'; print(''.join(secrets.choice(chars) for _ in range(24)))")
    
    echo -e "${GREEN}✅ Secrets generados para ${env}${NC}"
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo -e "${YELLOW}⚠️  COPIAR Y GUARDAR EN LUGAR SEGURO${NC}"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    echo "# Ambiente: $env"
    echo "# Generado: $(date)"
    echo ""
    echo "JWT_SECRET=$JWT_SECRET"
    echo ""
    echo "INITIAL_ADMIN_PASSWORD=$ADMIN_PASS"
    echo ""
    echo "POSTGRES_PASSWORD=$DB_PASS"
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo ""
}

function save_to_file() {
    local env=$1
    local file=$2
    
    # Generar secrets
    JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(64))")
    ADMIN_PASS=$(python3 -c "import secrets, string; chars = string.ascii_letters + string.digits + '!@#$%^&*'; print(''.join(secrets.choice(chars) for _ in range(20)))")
    DB_PASS=$(python3 -c "import secrets, string; chars = string.ascii_letters + string.digits + '!@#$%^&*'; print(''.join(secrets.choice(chars) for _ in range(24)))")
    
    cat > "$file" << EOF
# $env Environment Variables
# Generated: $(date)
# ⚠️  NUNCA COMMITEAR ESTE ARCHIVO

# Authentication & Security
JWT_SECRET=$JWT_SECRET
AUTH_ENABLED=true
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Initial Admin
INITIAL_ADMIN_EMAIL=admin@conexusplay.com
INITIAL_ADMIN_PASSWORD=$ADMIN_PASS

# Database (Railway proporcionará DATABASE_URL)
# Solo necesitas POSTGRES_PASSWORD si gestionas tu propia DB
POSTGRES_PASSWORD=$DB_PASS

# Email (agregar tu Resend API Key)
RESEND_API_KEY=<TU_RESEND_API_KEY_AQUI>
RESEND_FROM=noreply@conexusplay.com

# Email Configuration
VERIFICATION_EXP_HOURS=24
RESET_EXP_MINUTES=60

# Flask
FLASK_ENV=production

# URLs (ajustar según tu dominio)
APP_URL=https://conexusplay.com
FRONTEND_URL=https://conexusplay.com
EOF
    
    echo -e "${GREEN}✅ Secretos guardados en: $file${NC}"
    echo -e "${YELLOW}⚠️  RECUERDA: Agregar tu RESEND_API_KEY al archivo${NC}"
}

# Menú principal
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "🔐 Generador de Secretos por Ambiente - ConexusPlay"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Selecciona el ambiente:"
echo "  1) LOCAL   - Para desarrollo local"
echo "  2) STAGE   - Para testing con usuarios beta"
echo "  3) PRODUCTION - Para producción real"
echo "  4) TODOS   - Generar para los 3 ambientes"
echo "  5) Salir"
echo ""
read -p "Opción (1-5): " option

case $option in
    1)
        generate_secrets "LOCAL"
        read -p "¿Guardar en .env.local? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            save_to_file "LOCAL" ".env.local"
        fi
        ;;
    2)
        generate_secrets "STAGE"
        read -p "¿Guardar en .env.stage? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            save_to_file "STAGE" ".env.stage"
        fi
        ;;
    3)
        generate_secrets "PRODUCTION"
        read -p "¿Guardar en .env.production? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            save_to_file "PRODUCTION" ".env.production"
        fi
        ;;
    4)
        echo ""
        echo "Generando secretos para TODOS los ambientes..."
        echo ""
        generate_secrets "LOCAL"
        echo ""
        generate_secrets "STAGE"
        echo ""
        generate_secrets "PRODUCTION"
        echo ""
        echo -e "${YELLOW}💡 TIP: Guarda cada set en un gestor de contraseñas (1Password, etc.)${NC}"
        ;;
    5)
        echo "👋 Saliendo..."
        exit 0
        ;;
    *)
        echo -e "${RED}❌ Opción inválida${NC}"
        exit 1
        ;;
esac

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "📝 Próximos pasos:"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "1️⃣  LOCAL:"
echo "   - Ya tienes tu .env actual con secretos de desarrollo"
echo "   - Mantén passwords simples para desarrollo"
echo ""
echo "2️⃣  STAGE:"
echo "   - Configura en Railway → Variables de Entorno"
echo "   - Usa el set de secretos STAGE generado"
echo "   - URL: stage.conexusplay.com"
echo ""
echo "3️⃣  PRODUCTION:"
echo "   - Configura en Railway → Variables de Entorno"
echo "   - Usa el set de secretos PRODUCTION generado"
echo "   - URL: conexusplay.com"
echo ""
echo -e "${YELLOW}⚠️  CRÍTICO:${NC}"
echo "   - Cada ambiente DEBE tener secretos DIFERENTES"
echo "   - NUNCA reutilizar JWT_SECRET entre ambientes"
echo "   - NUNCA commitear archivos .env.* al repositorio"
echo ""
echo -e "${GREEN}✅ Listo para configurar ambientes seguros${NC}"
echo ""
