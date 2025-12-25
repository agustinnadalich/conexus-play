#!/bin/bash
# ============================================================================
# Script de Aplicación Segura de Migraciones
# ============================================================================

set -e  # Exit on error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Función para confirmar acción
confirm() {
    read -p "$(echo -e ${YELLOW}$1${NC}) [y/N]: " response
    case "$response" in
        [yY][eE][sS]|[yY]) 
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Detectar entorno
detect_environment() {
    if [ -z "$1" ]; then
        print_error "Debes especificar el entorno: local, stage, o production"
        exit 1
    fi
    
    ENVIRONMENT=$1
    case "$ENVIRONMENT" in
        local)
            DB_URL="postgresql://admin:changeme@localhost:5432/videoanalysis"
            ;;
        stage)
            print_warning "Para STAGE, usa Railway CLI: railway environment stage"
            exit 1
            ;;
        production)
            print_error "Para PRODUCCIÓN, sigue el proceso manual documentado en README_MIGRATION_001.md"
            exit 1
            ;;
        *)
            print_error "Entorno no válido. Usa: local, stage, o production"
            exit 1
            ;;
    esac
}

# Verificar requisitos
check_requirements() {
    if ! command -v psql &> /dev/null; then
        print_error "psql no está instalado. Instálalo con: brew install postgresql"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        print_warning "docker no está instalado, intentando con psql directo"
        USE_DOCKER=false
    else
        USE_DOCKER=true
    fi
}

# Crear backup
create_backup() {
    local backup_file="db_backups/backup_pre_migration_001_$(date +%Y%m%d_%H%M%S).sql"
    
    print_info "Creando backup en $backup_file..."
    
    mkdir -p db_backups
    
    if [ "$USE_DOCKER" = true ]; then
        docker exec conexus-play-db pg_dump -U admin videoanalysis > "$backup_file"
    else
        pg_dump "$DB_URL" > "$backup_file"
    fi
    
    if [ $? -eq 0 ]; then
        local backup_size=$(du -h "$backup_file" | cut -f1)
        print_success "Backup creado exitosamente: $backup_file ($backup_size)"
    else
        print_error "Error al crear backup"
        exit 1
    fi
}

# Ejecutar migración
run_migration() {
    local migration_file="backend/migrations/add_is_opponent_to_teams.sql"
    
    if [ ! -f "$migration_file" ]; then
        print_error "Archivo de migración no encontrado: $migration_file"
        exit 1
    fi
    
    print_info "Ejecutando migración..."
    
    if [ "$USE_DOCKER" = true ]; then
        docker exec -i conexus-play-db psql -U admin -d videoanalysis < "$migration_file"
    else
        psql "$DB_URL" < "$migration_file"
    fi
    
    if [ $? -eq 0 ]; then
        print_success "Migración ejecutada exitosamente"
    else
        print_error "Error al ejecutar migración"
        print_warning "Considera ejecutar rollback si es necesario"
        exit 1
    fi
}

# Verificar migración
verify_migration() {
    print_info "Verificando migración..."
    
    local verify_query="SELECT 
        COUNT(*) as total_teams,
        SUM(CASE WHEN is_opponent = FALSE THEN 1 ELSE 0 END) as own_teams,
        SUM(CASE WHEN is_opponent = TRUE THEN 1 ELSE 0 END) as opponent_teams
    FROM teams;"
    
    if [ "$USE_DOCKER" = true ]; then
        docker exec -i conexus-play-db psql -U admin -d videoanalysis -c "$verify_query"
    else
        psql "$DB_URL" -c "$verify_query"
    fi
    
    print_success "Verificación completada"
}

# Ejecutar rollback
run_rollback() {
    local rollback_file="backend/migrations/rollback_001_add_is_opponent_to_teams.sql"
    
    if [ ! -f "$rollback_file" ]; then
        print_error "Archivo de rollback no encontrado: $rollback_file"
        exit 1
    fi
    
    print_warning "Ejecutando ROLLBACK..."
    
    if [ "$USE_DOCKER" = true ]; then
        docker exec -i conexus-play-db psql -U admin -d videoanalysis < "$rollback_file"
    else
        psql "$DB_URL" < "$rollback_file"
    fi
    
    if [ $? -eq 0 ]; then
        print_success "Rollback ejecutado exitosamente"
    else
        print_error "Error al ejecutar rollback"
        exit 1
    fi
}

# Menú principal
show_menu() {
    echo ""
    echo "=========================================="
    echo "  Gestión de Migración 001"
    echo "  Entorno: $ENVIRONMENT"
    echo "=========================================="
    echo "1) Aplicar migración (con backup automático)"
    echo "2) Solo crear backup"
    echo "3) Verificar estado de migración"
    echo "4) Ejecutar ROLLBACK"
    echo "5) Salir"
    echo "=========================================="
}

# Main
main() {
    clear
    echo "=========================================="
    echo "  🗄️  Sistema de Migración Segura"
    echo "  Migración 001: add_is_opponent_to_teams"
    echo "=========================================="
    echo ""
    
    # Detectar entorno
    if [ -z "$1" ]; then
        print_error "Uso: $0 {local|stage|production}"
        echo ""
        echo "Ejemplo: $0 local"
        exit 1
    fi
    
    detect_environment "$1"
    check_requirements
    
    while true; do
        show_menu
        read -p "Selecciona una opción: " option
        
        case $option in
            1)
                echo ""
                print_warning "Vas a aplicar la migración en: $ENVIRONMENT"
                if confirm "¿Estás seguro?"; then
                    create_backup
                    run_migration
                    verify_migration
                    print_success "Proceso completado"
                else
                    print_info "Operación cancelada"
                fi
                ;;
            2)
                create_backup
                ;;
            3)
                verify_migration
                ;;
            4)
                echo ""
                print_error "¡ADVERTENCIA! Esto revertirá la migración"
                if confirm "¿Estás ABSOLUTAMENTE seguro?"; then
                    run_rollback
                else
                    print_info "Rollback cancelado"
                fi
                ;;
            5)
                print_info "Saliendo..."
                exit 0
                ;;
            *)
                print_error "Opción inválida"
                ;;
        esac
        
        echo ""
        read -p "Presiona Enter para continuar..."
    done
}

# Ejecutar
main "$@"
