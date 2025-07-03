-- liquibase formatted sql

-- changeset LucasChallamel:1688376000-1 author:Cascade
-- comment: Create tables for cutover steps and instructions import

CREATE TABLE IF NOT EXISTS cutover_steps (
    id VARCHAR(255) PRIMARY KEY,
    step_type VARCHAR(50),
    step_number INT,
    step_title TEXT,
    step_predecessor VARCHAR(255),
    step_successor VARCHAR(255),
    step_assigned_team VARCHAR(255),
    step_impacted_teams VARCHAR(255),
    step_macro_time_sequence VARCHAR(255),
    step_time_sequence VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cutover_step_instructions (
    id VARCHAR(255) PRIMARY KEY,
    cutover_step_id VARCHAR(255) NOT NULL,
    instruction_text TEXT,
    assignee VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_cutover_step
        FOREIGN KEY(cutover_step_id)
        REFERENCES cutover_steps(id)
        ON DELETE CASCADE
);

COMMENT ON TABLE cutover_steps IS 'Stores the main information for each cutover step, imported from Confluence JSON exports.';
COMMENT ON TABLE cutover_step_instructions IS 'Stores the detailed instructions for each cutover step.';
