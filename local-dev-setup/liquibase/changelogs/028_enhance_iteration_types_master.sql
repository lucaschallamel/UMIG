--liquibase formatted sql

--changeset lucas.challamel:028_enhance_iteration_types_master context:all
--comment: US-043 Phase 1: Enhance iteration_types_itt table with management fields for iteration types administration. Adds display_order, is_active, icon, color while preserving existing functionality and leveraging existing audit fields.

-- Note: We keep the existing table name iteration_types_itt following ADR-014 naming conventions
-- The suffix 'itt' is maintained for all new columns

-- Step 1: Add new management fields with itt_ prefix
ALTER TABLE iteration_types_itt ADD COLUMN itt_description TEXT;
ALTER TABLE iteration_types_itt ADD COLUMN itt_color VARCHAR(10) DEFAULT '#6B73FF';
ALTER TABLE iteration_types_itt ADD COLUMN itt_icon VARCHAR(50) DEFAULT 'play-circle';
ALTER TABLE iteration_types_itt ADD COLUMN itt_display_order INTEGER DEFAULT 0;
ALTER TABLE iteration_types_itt ADD COLUMN itt_active BOOLEAN DEFAULT TRUE;

-- Step 2: Audit fields already exist from migration 016_standardize_audit_fields
-- No need to add them again - they were already added in migration 016

-- Step 3: Update existing data with meaningful defaults
UPDATE iteration_types_itt SET
    itt_description = 'Production run iteration - Execute the actual migration plan',
    itt_color = '#2E7D32',
    itt_icon = 'play-circle',
    itt_display_order = 1,
    itt_active = TRUE
WHERE itt_code = 'RUN';

UPDATE iteration_types_itt SET
    itt_description = 'Dress rehearsal iteration - Practice run before cutover',
    itt_color = '#F57C00',
    itt_icon = 'refresh',
    itt_display_order = 2,
    itt_active = TRUE
WHERE itt_code = 'DR';

UPDATE iteration_types_itt SET
    itt_description = 'Final cutover iteration - Live production migration',
    itt_color = '#C62828',
    itt_icon = 'check-circle',
    itt_display_order = 3,
    itt_active = TRUE
WHERE itt_code = 'CUTOVER';

-- Step 4: Create indexes for efficient querying
-- Create index on display_order and active status for sorting active iteration types
CREATE INDEX idx_iteration_types_display_order ON iteration_types_itt(itt_display_order, itt_active);

-- Create index on active status for efficient filtering of active iteration types
CREATE INDEX idx_iteration_types_active ON iteration_types_itt(itt_active);

--rollback DROP INDEX IF EXISTS idx_iteration_types_active;
--rollback DROP INDEX IF EXISTS idx_iteration_types_display_order;
--rollback UPDATE iteration_types_itt SET itt_description = NULL, itt_color = NULL, itt_icon = NULL, itt_display_order = NULL, itt_active = NULL;
--rollback ALTER TABLE iteration_types_itt DROP COLUMN IF EXISTS itt_active;
--rollback ALTER TABLE iteration_types_itt DROP COLUMN IF EXISTS itt_display_order;
--rollback ALTER TABLE iteration_types_itt DROP COLUMN IF EXISTS itt_icon;
--rollback ALTER TABLE iteration_types_itt DROP COLUMN IF EXISTS itt_color;
--rollback ALTER TABLE iteration_types_itt DROP COLUMN IF EXISTS itt_description;
--rollback ALTER TABLE iteration_types_itt RENAME TO iteration_types_itt;