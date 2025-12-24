#!/bin/bash

# 🔐 Script de Verificación de Secretos
# Verifica que no haya API keys, passwords u otros secretos expuestos antes de push

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Verificando secretos en archivos..."

ERRORS=0

# Patrones peligrosos a buscar
PATTERNS=(
    "sk-[a-zA-Z0-9]{20,}"          # OpenAI API keys
    "re_[a-zA-Z0-9_]{30,}"         # Resend API keys  
    "postgres://[^<][^@]*:[^<][^@]*@"  # Database URLs con credenciales reales
    "JWT_SECRET=[^<][a-zA-Z0-9]{40,}"  # JWT secrets reales
    "API_KEY=[^<][a-zA-Z0-9]{20,}" # Generic API keys
    "SECRET=[^<][a-zA-Z0-9]{20,}"  # Generic secrets
)

# Archivos a verificar (excluir .env y archivos de node_modules)
FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(md|py|js|ts|tsx|yml|yaml|json|sh)$' || true)

if [ -z "$FILES" ]; then
    echo -e "${GREEN}✅ No hay archivos staged para verificar${NC}"
    exit 0
fi

echo "📄 Verificando archivos:"
echo "$FILES" | sed 's/^/  - /'
echo ""

for FILE in $FILES; do
    if [ ! -f "$FILE" ]; then
        continue
    fi
    
    for PATTERN in "${PATTERNS[@]}"; do
        MATCHES=$(grep -nE "$PATTERN" "$FILE" 2>/dev/null || true)
        
        if [ ! -z "$MATCHES" ]; then
            echo -e "${RED}❌ SECRETO DETECTADO en $FILE:${NC}"
            echo "$MATCHES" | sed 's/^/     /'
            echo ""
            ERRORS=$((ERRORS + 1))
        fi
    done
done

# Verificar específicamente que archivos .md no contengan valores reales
MD_FILES=$(echo "$FILES" | grep '\.md$' || true)
if [ ! -z "$MD_FILES" ]; then
    echo "📋 Verificando archivos Markdown..."
    for FILE in $MD_FILES; do
        # Buscar líneas con API_KEY= que NO contengan placeholder
        REAL_KEYS=$(grep -nE "(API_KEY|SECRET|PASSWORD)=([^<].*[a-zA-Z0-9]{15,})" "$FILE" 2>/dev/null | grep -v "<TU_" | grep -v "<GENERAR" | grep -v "<ELEGIR" | grep -v "<PASSWORD" || true)
        
        if [ ! -z "$REAL_KEYS" ]; then
            echo -e "${RED}❌ Posible secreto real en documentación $FILE:${NC}"
            echo "$REAL_KEYS" | sed 's/^/     /'
            echo -e "${YELLOW}💡 Usa placeholders como: <TU_API_KEY>, <TU_SECRET>, etc.${NC}"
            echo ""
            ERRORS=$((ERRORS + 1))
        fi
    done
fi

# Verificar que .env no esté staged
if echo "$FILES" | grep -q "^\.env$"; then
    echo -e "${RED}❌ PELIGRO: .env está staged!${NC}"
    echo -e "${YELLOW}💡 Nunca commits .env al repositorio${NC}"
    echo -e "${YELLOW}   Usa: git reset HEAD .env${NC}"
    echo ""
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "═══════════════════════════════════════"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ No se detectaron secretos expuestos${NC}"
    echo -e "${GREEN}✅ Seguro para push${NC}"
    exit 0
else
    echo -e "${RED}❌ DETECTADOS $ERRORS PROBLEMAS DE SEGURIDAD${NC}"
    echo ""
    echo -e "${YELLOW}🔧 SOLUCIONES:${NC}"
    echo "  1. Reemplaza valores reales por placeholders:"
    echo "     ❌ RESEND_API_KEY=re_abc123..."
    echo "     ✅ RESEND_API_KEY=<TU_RESEND_API_KEY>"
    echo ""
    echo "  2. Si ya commiteaste secretos:"
    echo "     git reset HEAD <archivo>"
    echo "     # Edita el archivo y vuelve a agregar"
    echo ""
    echo "  3. Si el secreto ya está en el historial:"
    echo "     # Revoca la key inmediatamente"
    echo "     # Genera una nueva"
    echo ""
    echo -e "${RED}⚠️  PUSH BLOQUEADO POR SEGURIDAD${NC}"
    exit 1
fi
