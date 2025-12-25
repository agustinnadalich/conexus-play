-- ============================================================================
-- ROLLBACK: add_is_opponent_to_teams
-- Version: 001
-- Date: 2024-12-25
-- Description: Revertir migración que añadió campo is_opponent a teams
-- WARNING: Este script eliminará la columna is_opponent y su índice
-- ============================================================================

-- VERIFICACIÓN PREVIA: Comprobar si la columna existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'teams' 
        AND column_name = 'is_opponent'
    ) THEN
        RAISE NOTICE '⚠️  La columna is_opponent no existe. Nada que revertir.';
    ELSE
        RAISE NOTICE '✅ Columna is_opponent existe. Procediendo con rollback.';
    END IF;
END $$;

-- PASO 1: Eliminar índice
DROP INDEX IF EXISTS idx_teams_club_opponent;

-- PASO 2: Eliminar columna is_opponent
ALTER TABLE teams 
DROP COLUMN IF EXISTS is_opponent;

-- VERIFICACIÓN POST-ROLLBACK
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'teams' 
        AND column_name = 'is_opponent'
    ) THEN
        RAISE NOTICE '✅ Rollback completado exitosamente';
    ELSE
        RAISE EXCEPTION '❌ Error: La columna is_opponent aún existe';
    END IF;
END $$;
