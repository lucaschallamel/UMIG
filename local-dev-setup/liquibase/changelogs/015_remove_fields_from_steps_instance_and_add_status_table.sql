--liquibase formatted sql
--changeset lucaschallamel:015_remove_fields_from_steps_instance_and_add_status_table context:all

-- Remove redundant fields from steps_instance_sti table
ALTER TABLE steps_instance_sti 
DROP COLUMN IF EXISTS usr_id_owner,
DROP COLUMN IF EXISTS usr_id_assignee,
DROP COLUMN IF EXISTS enr_id_target;

-- Create status_sts table for managing statuses across different entity types
CREATE TABLE status_sts (
    sts_id SERIAL PRIMARY KEY,
    sts_name VARCHAR(50) NOT NULL,
    sts_color VARCHAR(7) NOT NULL, -- Hex color code format (#RRGGBB)
    sts_type VARCHAR(20) NOT NULL,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'system',
    updated_by VARCHAR(100) DEFAULT 'system',
    
    CONSTRAINT uq_status_sts_name_type UNIQUE (sts_name, sts_type),
    CONSTRAINT ck_status_sts_type CHECK (sts_type IN ('Migration', 'Iteration', 'Plan', 'Sequence', 'Phase', 'Step', 'Control')),
    CONSTRAINT ck_status_sts_color CHECK (sts_color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Create indexes for performance
CREATE INDEX idx_status_sts_type ON status_sts(sts_type);
CREATE INDEX idx_status_sts_name ON status_sts(sts_name);

-- Insert predefined statuses for each entity type

-- Migration, Plan, Iteration, Sequence, Phase statuses
INSERT INTO status_sts (sts_name, sts_color, sts_type) VALUES
-- Migration statuses
('PLANNING', '#FFA500', 'Migration'),     -- Orange
('IN_PROGRESS', '#0066CC', 'Migration'),  -- Blue
('COMPLETED', '#00AA00', 'Migration'),    -- Green
('CANCELLED', '#CC0000', 'Migration'),    -- Red

-- Plan statuses
('PLANNING', '#FFA500', 'Plan'),          -- Orange
('IN_PROGRESS', '#0066CC', 'Plan'),       -- Blue
('COMPLETED', '#00AA00', 'Plan'),         -- Green
('CANCELLED', '#CC0000', 'Plan'),         -- Red

-- Iteration statuses
('PLANNING', '#FFA500', 'Iteration'),     -- Orange
('IN_PROGRESS', '#0066CC', 'Iteration'),  -- Blue
('COMPLETED', '#00AA00', 'Iteration'),    -- Green
('CANCELLED', '#CC0000', 'Iteration'),    -- Red

-- Sequence statuses
('PLANNING', '#FFA500', 'Sequence'),      -- Orange
('IN_PROGRESS', '#0066CC', 'Sequence'),   -- Blue
('COMPLETED', '#00AA00', 'Sequence'),     -- Green
('CANCELLED', '#CC0000', 'Sequence'),     -- Red

-- Phase statuses
('PLANNING', '#FFA500', 'Phase'),         -- Orange
('IN_PROGRESS', '#0066CC', 'Phase'),      -- Blue
('COMPLETED', '#00AA00', 'Phase'),        -- Green
('CANCELLED', '#CC0000', 'Phase'),        -- Red

-- Step statuses (more granular)
('PENDING', '#DDDDDD', 'Step'),           -- Light Grey
('TODO', '#FFFF00', 'Step'),              -- Yellow
('IN_PROGRESS', '#0066CC', 'Step'),       -- Blue
('COMPLETED', '#00AA00', 'Step'),         -- Green
('FAILED', '#FF0000', 'Step'),            -- Red
('BLOCKED', '#FF6600', 'Step'),           -- Orange
('CANCELLED', '#CC0000', 'Step'),         -- Dark Red

-- Control statuses
('TODO', '#FFFF00', 'Control'),           -- Yellow
('PASSED', '#00AA00', 'Control'),         -- Green
('FAILED', '#FF0000', 'Control'),         -- Red
('CANCELLED', '#CC0000', 'Control');      -- Dark Red

-- Add comments
COMMENT ON TABLE status_sts IS 'Centralized status management for all entity types with color coding';
COMMENT ON COLUMN status_sts.sts_id IS 'Primary key for status records';
COMMENT ON COLUMN status_sts.sts_name IS 'Status name (e.g., PENDING, IN_PROGRESS, COMPLETED)';
COMMENT ON COLUMN status_sts.sts_color IS 'Hex color code for UI display (#RRGGBB format)';
COMMENT ON COLUMN status_sts.sts_type IS 'Entity type this status applies to (Migration, Plan, Step, etc.)';