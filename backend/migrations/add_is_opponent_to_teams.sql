-- ============================================================================
-- MIGRATION: add_is_opponent_to_teams
-- Version: 001
-- Date: 2024-12-25
-- Description: Añadir campo is_opponent a la tabla teams para distinguir
--              equipos propios (FALSE) de equipos rivales (TRUE)
-- ============================================================================

-- VERIFICACIÓN PREVIA: Comprobar si la columna ya existe
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'teams' 
        AND column_name = 'is_opponent'
    ) THEN
        RAISE NOTICE '⚠️  La columna is_opponent ya existe. Saltando migración.';
    ELSE
        RAISE NOTICE '✅ Columna is_opponent no existe. Procediendo con migración.';
    END IF;
END $$;

-- PASO 1: Añadir columna is_opponent
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS is_opponent BOOLEAN DEFAULT FALSE;

-- PASO 2: Actualizar equipos existentes (por defecto son equipos propios)
UPDATE teams 
SET is_opponent = FALSE 
WHERE is_opponent IS NULL;

-- PASO 3: Crear índice para mejorar búsquedas de opponents por club
CREATE INDEX IF NOT EXISTS idx_teams_club_opponent 
ON teams(club_id, is_opponent);

-- PASO 4: Agregar constraint NOT NULL después de actualizar datos existentes
ALTER TABLE teams 
ALTER COLUMN is_opponent SET NOT NULL;

-- VERIFICACIÓN POST-MIGRACIÓN
DO $$ 
DECLARE
    total_teams INTEGER;
    teams_with_flag INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_teams FROM teams;
    SELECT COUNT(*) INTO teams_with_flag FROM teams WHERE is_opponent IS NOT NULL;
    
    RAISE NOTICE '📊 Total de equipos: %', total_teams;
    RAISE NOTICE '📊 Equipos con is_opponent asignado: %', teams_with_flag;
    
    IF total_teams = teams_with_flag THEN
        RAISE NOTICE '✅ Migración completada exitosamente';
    ELSE
        RAISE EXCEPTION '❌ Error: % equipos sin is_opponent asignado', (total_teams - teams_with_flag);
    END IF;
END $$;
