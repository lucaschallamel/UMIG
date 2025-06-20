-- liquibase formatted sql

-- changeset UMIG_MODEL_EXPANSION:create_controls_ctl_table
-- comment: Create controls_ctl table
CREATE TABLE IF NOT EXISTS controls_ctl (
    id SERIAL PRIMARY KEY,
    stp_id INTEGER NOT NULL,
    ctl_description TEXT,
    ctl_command TEXT,
    ctl_expected_result TEXT,
    ctl_actual_result TEXT,
    ctl_is_blocking BOOLEAN,
    ctl_is_automated BOOLEAN,
    ctl_execution_status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
