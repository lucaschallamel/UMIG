-- liquibase formatted sql

-- changeset LucasChallamel:026_us034_import_tables author:UMIG Development Team
-- comment: Create US-034 Enhanced Import Architecture tables with correct stg_ prefix naming

-- Step 1: Import Queue Management Table
CREATE TABLE IF NOT EXISTS stg_import_queue_management_iqm (
    iqm_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iqm_request_id UUID NOT NULL UNIQUE,
    iqm_priority INTEGER NOT NULL DEFAULT 5,
    iqm_status VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
    iqm_import_type VARCHAR(50) NOT NULL,
    iqm_requested_by VARCHAR(100) NOT NULL,
    iqm_requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    iqm_started_at TIMESTAMPTZ NULL,
    iqm_estimated_duration INTEGER NULL, -- minutes
    iqm_resource_requirements JSONB NULL,
    iqm_configuration JSONB NOT NULL,
    iqm_queue_position INTEGER NULL,
    iqm_assigned_worker VARCHAR(50) NULL,
    iqm_created_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    iqm_last_modified_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    iqm_is_active BOOLEAN DEFAULT true,

    CONSTRAINT chk_iqm_status CHECK (iqm_status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    CONSTRAINT chk_iqm_priority CHECK (iqm_priority BETWEEN 1 AND 20)
);

-- Indexes for queue performance
CREATE INDEX IF NOT EXISTS idx_iqm_status_priority ON stg_import_queue_management_iqm (iqm_status, iqm_priority DESC, iqm_requested_at);
CREATE INDEX IF NOT EXISTS idx_iqm_worker_status ON stg_import_queue_management_iqm (iqm_assigned_worker, iqm_status);

-- Step 2: Resource Lock Management Table
CREATE TABLE IF NOT EXISTS stg_import_resource_locks_irl (
    irl_id SERIAL PRIMARY KEY,
    irl_resource_type VARCHAR(50) NOT NULL,
    irl_resource_id VARCHAR(100) NOT NULL,
    irl_lock_type VARCHAR(20) NOT NULL, -- EXCLUSIVE, SHARED
    irl_locked_by_request UUID NOT NULL REFERENCES stg_import_queue_management_iqm(iqm_request_id),
    irl_locked_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    irl_expires_at TIMESTAMPTZ NOT NULL,
    irl_created_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    irl_is_active BOOLEAN DEFAULT true,

    CONSTRAINT uk_irl_resource_request UNIQUE (irl_resource_type, irl_resource_id, irl_locked_by_request),
    CONSTRAINT chk_irl_lock_type CHECK (irl_lock_type IN ('EXCLUSIVE', 'SHARED')),
    CONSTRAINT chk_irl_expires_future CHECK (irl_expires_at > irl_locked_at)
);

-- Index for lock management
CREATE INDEX IF NOT EXISTS idx_irl_resource_expires ON stg_import_resource_locks_irl (irl_resource_type, irl_resource_id, irl_expires_at);

-- Step 3: Scheduled Import Schedules Table
CREATE TABLE IF NOT EXISTS stg_scheduled_import_schedules_sis (
    sis_id SERIAL PRIMARY KEY,
    sis_schedule_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    sis_schedule_name VARCHAR(255) NOT NULL,
    sis_import_type VARCHAR(50) NOT NULL,
    sis_schedule_expression VARCHAR(100) NOT NULL, -- Cron expression or ISO datetime
    sis_recurring BOOLEAN DEFAULT false,
    sis_priority INTEGER DEFAULT 5 CHECK (sis_priority BETWEEN 1 AND 20),
    sis_created_by VARCHAR(100) NOT NULL,
    sis_status VARCHAR(20) DEFAULT 'SCHEDULED',
    sis_next_execution TIMESTAMPTZ NOT NULL,
    sis_last_execution TIMESTAMPTZ NULL,
    sis_execution_count INTEGER DEFAULT 0,
    sis_success_count INTEGER DEFAULT 0,
    sis_failure_count INTEGER DEFAULT 0,
    sis_import_configuration JSONB NOT NULL,
    sis_notification_settings JSONB NULL,
    sis_max_retries INTEGER DEFAULT 3,
    sis_retry_delay_minutes INTEGER DEFAULT 15,
    sis_timeout_minutes INTEGER DEFAULT 60,
    sis_created_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    sis_last_modified_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    sis_is_active BOOLEAN DEFAULT true,

    CONSTRAINT chk_sis_status CHECK (sis_status IN ('SCHEDULED', 'EXECUTING', 'COMPLETED', 'FAILED', 'CANCELLED', 'PAUSED')),
    CONSTRAINT chk_sis_next_execution_future CHECK (sis_next_execution > sis_created_date),
    CONSTRAINT chk_sis_execution_counts CHECK (sis_success_count >= 0 AND sis_failure_count >= 0 AND sis_execution_count >= (sis_success_count + sis_failure_count))
);

-- Indexes for schedule management
CREATE INDEX IF NOT EXISTS idx_sis_next_execution ON stg_scheduled_import_schedules_sis (sis_next_execution);
CREATE INDEX IF NOT EXISTS idx_sis_created_by_status ON stg_scheduled_import_schedules_sis (sis_created_by, sis_status);
CREATE INDEX IF NOT EXISTS idx_sis_recurring_active ON stg_scheduled_import_schedules_sis (sis_recurring, sis_is_active);

-- Step 4: Schedule Execution History Table
CREATE TABLE IF NOT EXISTS stg_schedule_execution_history_seh (
    seh_id SERIAL PRIMARY KEY,
    sis_id INTEGER NOT NULL REFERENCES stg_scheduled_import_schedules_sis(sis_id) ON DELETE CASCADE,
    seh_execution_id UUID NOT NULL,
    seh_started_at TIMESTAMPTZ NOT NULL,
    seh_completed_at TIMESTAMPTZ NULL,
    seh_status VARCHAR(20) NOT NULL,
    seh_records_processed INTEGER DEFAULT 0,
    seh_error_message TEXT NULL,
    seh_execution_details JSONB NULL,
    seh_created_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_seh_status CHECK (seh_status IN ('STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED'))
);

-- Index for execution history queries
CREATE INDEX IF NOT EXISTS idx_seh_sis_started ON stg_schedule_execution_history_seh (sis_id, seh_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_seh_execution_id ON stg_schedule_execution_history_seh (seh_execution_id);

-- Step 5: Schedule Resource Reservations Table
CREATE TABLE IF NOT EXISTS stg_schedule_resource_reservations_srr (
    srr_id SERIAL PRIMARY KEY,
    sis_id INTEGER NOT NULL REFERENCES stg_scheduled_import_schedules_sis(sis_id) ON DELETE CASCADE,
    srr_resource_type VARCHAR(50) NOT NULL,
    srr_resource_amount INTEGER NOT NULL,
    srr_reserved_from TIMESTAMPTZ NOT NULL,
    srr_reserved_until TIMESTAMPTZ NOT NULL,
    srr_status VARCHAR(20) DEFAULT 'RESERVED',
    srr_created_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_srr_status CHECK (srr_status IN ('RESERVED', 'ACTIVE', 'RELEASED', 'EXPIRED')),
    CONSTRAINT chk_srr_resource_amount_positive CHECK (srr_resource_amount > 0),
    CONSTRAINT chk_srr_reservation_period CHECK (srr_reserved_until > srr_reserved_from)
);

-- Index for resource reservation management
CREATE INDEX IF NOT EXISTS idx_srr_resource_time ON stg_schedule_resource_reservations_srr (srr_resource_type, srr_reserved_from, srr_reserved_until);

-- Step 6: Tenant Resource Limits Table
CREATE TABLE IF NOT EXISTS stg_tenant_resource_limits_trl (
    trl_id SERIAL PRIMARY KEY,
    trl_tenant_id VARCHAR(50) NOT NULL,
    trl_resource_type VARCHAR(50) NOT NULL,
    trl_resource_limit INTEGER NOT NULL,
    trl_resource_unit VARCHAR(20) NOT NULL, -- MB, COUNT, PERCENTAGE
    trl_enforcement_level VARCHAR(20) DEFAULT 'HARD', -- HARD, SOFT, ADVISORY
    trl_created_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    trl_last_modified_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    trl_is_active BOOLEAN DEFAULT true,

    CONSTRAINT uk_trl_tenant_resource UNIQUE (trl_tenant_id, trl_resource_type),
    CONSTRAINT chk_trl_resource_limit_positive CHECK (trl_resource_limit > 0),
    CONSTRAINT chk_trl_enforcement_level CHECK (trl_enforcement_level IN ('HARD', 'SOFT', 'ADVISORY')),
    CONSTRAINT chk_trl_resource_unit CHECK (trl_resource_unit IN ('MB', 'COUNT', 'PERCENTAGE', 'GB', 'SECONDS'))
);

-- Pre-populate default resource limits
INSERT INTO stg_tenant_resource_limits_trl (trl_tenant_id, trl_resource_type, trl_resource_limit, trl_resource_unit) VALUES
('default', 'cpu_slots', 2, 'COUNT'),
('default', 'memory', 1024, 'MB'),
('default', 'db_connections', 3, 'COUNT'),
('default', 'concurrent_imports', 2, 'COUNT')
ON CONFLICT (trl_tenant_id, trl_resource_type) DO NOTHING;

-- Step 7: Orchestration Dependencies Table
-- Note: This table will be enabled once stg_import_orchestrations_ior is created in migration 025
CREATE TABLE IF NOT EXISTS stg_orchestration_dependencies_od (
    od_id SERIAL PRIMARY KEY,
    od_orchestration_id UUID NOT NULL,
    od_depends_on_orchestration UUID NOT NULL,
    od_dependency_type VARCHAR(30) NOT NULL, -- SEQUENTIAL, RESOURCE, DATA
    od_created_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_od_orchestration_dependency UNIQUE (od_orchestration_id, od_depends_on_orchestration),
    CONSTRAINT chk_od_dependency_type CHECK (od_dependency_type IN ('SEQUENTIAL', 'RESOURCE', 'DATA'))
);

-- Index for dependency resolution
CREATE INDEX IF NOT EXISTS idx_od_orchestration ON stg_orchestration_dependencies_od (od_orchestration_id);
CREATE INDEX IF NOT EXISTS idx_od_depends_on ON stg_orchestration_dependencies_od (od_depends_on_orchestration);

-- Add foreign key constraints (will be successful once stg_import_orchestrations_ior table exists)
-- These constraints ensure referential integrity between orchestration dependencies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stg_import_orchestrations_ior') THEN
        ALTER TABLE stg_orchestration_dependencies_od 
        ADD CONSTRAINT fk_od_orchestration_id 
        FOREIGN KEY (od_orchestration_id) REFERENCES stg_import_orchestrations_ior(ior_id) ON DELETE CASCADE;
        
        ALTER TABLE stg_orchestration_dependencies_od 
        ADD CONSTRAINT fk_od_depends_on_orchestration 
        FOREIGN KEY (od_depends_on_orchestration) REFERENCES stg_import_orchestrations_ior(ior_id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 8: Add comments for US-034 tables
COMMENT ON TABLE stg_import_queue_management_iqm IS 'US-034: Manages concurrent import request queuing and coordination';
COMMENT ON TABLE stg_import_resource_locks_irl IS 'US-034: Prevents resource conflicts between concurrent import operations';
COMMENT ON TABLE stg_scheduled_import_schedules_sis IS 'US-034: Manages scheduled and recurring import operations';
COMMENT ON TABLE stg_schedule_execution_history_seh IS 'US-034: Audit trail for scheduled import executions';
COMMENT ON TABLE stg_schedule_resource_reservations_srr IS 'US-034: Resource reservations for scheduled imports';
COMMENT ON TABLE stg_tenant_resource_limits_trl IS 'US-034: Multi-tenant resource limit enforcement';
COMMENT ON TABLE stg_orchestration_dependencies_od IS 'US-034: Manages dependencies between import orchestrations';

--rollback DROP TABLE IF EXISTS stg_orchestration_dependencies_od CASCADE;
--rollback DROP TABLE IF EXISTS stg_tenant_resource_limits_trl CASCADE;
--rollback DROP TABLE IF EXISTS stg_schedule_resource_reservations_srr CASCADE;
--rollback DROP TABLE IF EXISTS stg_schedule_execution_history_seh CASCADE;
--rollback DROP TABLE IF EXISTS stg_scheduled_import_schedules_sis CASCADE;
--rollback DROP TABLE IF EXISTS stg_import_resource_locks_irl CASCADE;
--rollback DROP TABLE IF EXISTS stg_import_queue_management_iqm CASCADE;