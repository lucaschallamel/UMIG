--liquibase formatted sql

--changeset lucas.challamel:029_create_migration_types_mit context:all
--comment: US-042 Phase 2: Create migration_types_mit table for migration types administration. Provides standardized migration type management with display_order, is_active, icon, color following UMIG patterns established in US-043.

-- Note: Using migration_types_mit following ADR-014 naming conventions
-- The suffix 'master' indicates this is a template/master configuration table

-- Step 1: Create the migration_types_mit table
CREATE TABLE migration_types_mit (
    -- Primary key
    mit_id SERIAL PRIMARY KEY,
    
    -- Business keys (unique identifiers for migration types)
    mit_code VARCHAR(20) NOT NULL UNIQUE,
    mit_name VARCHAR(100) NOT NULL,
    mit_description TEXT,
    
    -- Visual representation fields
    mit_color VARCHAR(10) DEFAULT '#6B73FF',
    mit_icon VARCHAR(50) DEFAULT 'layers',
    
    -- Management fields
    mit_display_order INTEGER DEFAULT 0,
    mit_active BOOLEAN DEFAULT TRUE,
    
    -- Audit fields (following ADR-016 standardization)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255)
);

-- Step 2: Add table comment for documentation
COMMENT ON TABLE migration_types_mit IS 'US-042: Master configuration table for release types. Defines available release type templates with visual and management properties.';

-- Step 3: Add column comments for clarity
COMMENT ON COLUMN migration_types_mit.mit_id IS 'Primary key - auto-incrementing ID';
COMMENT ON COLUMN migration_types_mit.mit_code IS 'Unique business code for migration type (e.g., INFRA, APP, DATA)';
COMMENT ON COLUMN migration_types_mit.mit_name IS 'Human-readable name for migration type';
COMMENT ON COLUMN migration_types_mit.mit_description IS 'Detailed description of migration type purpose and usage';
COMMENT ON COLUMN migration_types_mit.mit_color IS 'Hex color code for UI representation (#RRGGBB format)';
COMMENT ON COLUMN migration_types_mit.mit_icon IS 'Icon identifier for UI representation (Font Awesome style)';
COMMENT ON COLUMN migration_types_mit.mit_display_order IS 'Sort order for UI display (lower numbers first)';
COMMENT ON COLUMN migration_types_mit.mit_active IS 'Whether this migration type is available for selection';

-- Step 4: Create essential indexes for efficient querying
-- Primary business key index (already unique constraint)
-- Create index on display_order and active status for sorting active migration types
CREATE INDEX idx_migration_types_display_order ON migration_types_mit(mit_display_order, mit_active);

-- Create index on active status for efficient filtering of active migration types
CREATE INDEX idx_migration_types_active ON migration_types_mit(mit_active);

-- Create index on code for efficient lookups
CREATE INDEX idx_migration_types_code ON migration_types_mit(mit_code);

-- Step 5: Insert default migration types based on UMIG domain analysis
INSERT INTO migration_types_mit (mit_code, mit_name, mit_description, mit_color, mit_icon, mit_display_order, mit_active, created_by) VALUES
('ACQUISITION', 'Acquisition Data Migration', 'Migration of customer, positions and contracts data as part of an external acquisition', '#5D4037', 'life-ring', 7, TRUE, 'system'),
('INFRASTRUCTURE', 'Infrastructure Release', 'Server, network, and infrastructure component releases requiring physical or virtual resource changes', '#E65100', 'server', 1, TRUE, 'system'),
('APPLICATION', 'Application Release', 'Software application deployments, upgrades, and configuration changes affecting business applications', '#1976D2', 'desktop', 2, TRUE, 'system'),
('DATABASE', 'Database Release', 'Database schema changes, data releases, and database platform upgrades requiring careful coordination', '#388E3C', 'database', 3, TRUE, 'system'),
('NETWORK', 'Network Release', 'Network configuration changes, routing updates, and connectivity modifications affecting system communication', '#7B1FA2', 'globe', 4, TRUE, 'system'),
('SECURITY', 'Security Release', 'Security system updates, access control changes, and compliance-related releases requiring special handling', '#D32F2F', 'shield', 5, TRUE, 'system'),
('INTEGRATION', 'Integration Release', 'API changes, interface modifications, and system integration updates affecting inter-system communication', '#F57C00', 'link', 6, TRUE, 'system'),
('DECOMMISSION', 'System Decommission', 'End-of-life system shutdown, data archival, and cleanup releases activities', '#616161', 'trash', 8, TRUE, 'system');

-- Step 6: Update timestamps for inserted records
UPDATE migration_types_mit SET updated_at = CURRENT_TIMESTAMP, updated_by = 'system' WHERE created_by = 'system';

--rollback DROP INDEX IF EXISTS idx_migration_types_code;
--rollback DROP INDEX IF EXISTS idx_migration_types_active;
--rollback DROP INDEX IF EXISTS idx_migration_types_display_order;
--rollback DROP TABLE migration_types_mit;