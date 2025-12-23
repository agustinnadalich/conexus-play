#!/bin/bash
# Script de limpieza del repositorio VideoAnalysis
# Elimina archivos temporales, reportes, migraciones antiguas y duplicados

echo "🧹 Iniciando limpieza del repositorio..."

# Archivos temporales raíz
rm -f convert_polisportiva.py
rm -f create_test_excel.py
rm -f debug_data_flow.js
rm -f descargar_pdf.py
rm -f excel_to_json.py
rm -f fix_match_events.py
rm -f fix_syntax.py
rm -f fix_timestamp.py
rm -f reimport_xml.py
rm -f reporte_analisis_del_JSON}.txt
rm -f test_debug_time.json
rm -f test_file_converted.json
rm -f test_manual_periods.py
rm -f test_timestamp_fix.py
rm -f test_xml_import.py
rm -f test_xml_manual_import.py
rm -f test_api_endpoint.sh
rm -f test_auth.sh
rm -f test_excel_simple.xlsx
rm -f test_file.xlsx

# Scripts de migración temporales
rm -f migrate_db.sh
rm -f migrate_db_complete.sh
rm -f MIGRACION_FINAL.sh
rm -f backup_data_20251218_133422.sql

# Backend - archivos duplicados y temporales
rm -f backend/convert_polisportiva.py
rm -f backend/convert_polisportiva_complete.py
rm -f backend/convert_polisportiva_full.py
rm -f backend/custom_mappings_example.py
rm -f backend/fix_match_events.py
rm -f backend/fix_timestamp.py
rm -f backend/inspect_tries_origin.py
rm -f backend/reimport_match3.py
rm -f backend/reimport_match3_correct.py
rm -f backend/update_match3_video.py
rm -f backend/update_tries_origin.py
rm -f backend/migrate_timestamp.sql
rm -f backend/videoanalysis_schema.sql
rm -f backend/Analisis-GPT2.txt

# Directorios antiguos/no utilizados
rm -rf frontend-old/
rm -rf node_modules/
rm -rf "node_modules(old)/"
rm -rf backend/videoanalysis_demo.db/
rm -rf backend/debug/

# Backups SQL antiguos temporales (mantener db_backups/)
rm -f backup_data_20251218_133422.sql
echo "📦 Manteniendo db_backups/DATOS_COMPLETOS_20251218_133935.sql (backup completo)"

# Documentación duplicada o reemplazada
rm -f ANALISIS_XML_PESCARA.md
rm -f Analisis-GPT2.txt
rm -f "Estructura de proyecto."
rm -f "Lista de Estadisticas"
rm -f REFACTORING_LOG.md

echo "✅ Limpieza completada!"
echo ""
echo "📋 Archivos de documentación importantes mantenidos:"
echo "   - README_NUEVO.md (documentación principal)"
echo "   - GUIA_RAPIDA.md (comandos rápidos)"
echo "   - AUTENTICACION_COMPLETADO.md (sistema de auth)"
echo "   - MIGRACION_DB_RESUELTO.md (historial de migración)"
echo "   - SISTEMA_RESUELTO.md (estado final)"
echo "   - MAPPINGS_DOCUMENTATION.md (perfiles de importación)"
echo "   - WORKFLOW.md (flujo de trabajo)"
echo ""
echo "⚠️  Revisa manualmente db_backups/ si quieres eliminar backups antiguos"
