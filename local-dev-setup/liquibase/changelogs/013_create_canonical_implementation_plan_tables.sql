--liquibase formatted sql

--changeset lucas.challamel:13 context:all
--comment: Creates the canonical implementation plan tables as per ADR-015 and latest documentation.

-- Create ENUM type for env_type
-- For PostgreSQL ≤ 15: this will fail if the type already exists (acceptable for baseline/fresh DB)
CREATE TYPE env_type_enum AS ENUM ('PROD', 'TEST', 'BACKUP');

-- Table: implementation_plans_canonical_ipc
CREATE TABLE implementation_plans_canonical_ipc (
    ipc_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    author_user_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ipc_author_user FOREIGN KEY (author_user_id) REFERENCES users_usr(id)
);

-- Table: sequences_master_sqm
CREATE TABLE sequences_master_sqm (
    sqm_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ipc_id UUID NOT NULL,
    predecessor_sqm_id UUID,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration_min INTEGER,
    CONSTRAINT fk_sqm_ipc FOREIGN KEY (ipc_id) REFERENCES implementation_plans_canonical_ipc(ipc_id),
    CONSTRAINT fk_sqm_predecessor FOREIGN KEY (predecessor_sqm_id) REFERENCES sequences_master_sqm(sqm_id)
);

-- Table: chapters_master_chm
CREATE TABLE chapters_master_chm (
    chm_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sqm_id UUID NOT NULL,
    predecessor_chm_id UUID,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration_min INTEGER,
    CONSTRAINT fk_chm_sqm FOREIGN KEY (sqm_id) REFERENCES sequences_master_sqm(sqm_id),
    CONSTRAINT fk_chm_predecessor FOREIGN KEY (predecessor_chm_id) REFERENCES chapters_master_chm(chm_id)
);

-- Table: steps_master_stm
CREATE TABLE steps_master_stm (
    stm_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chm_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100),
    duration_min INTEGER,
    team_id INTEGER,
    env_type env_type_enum,
    predecessor_stm_id UUID,
    step_prereq UUID,
    CONSTRAINT fk_stm_chm FOREIGN KEY (chm_id) REFERENCES chapters_master_chm(chm_id),
    CONSTRAINT fk_stm_team FOREIGN KEY (team_id) REFERENCES teams_tms(id),
    CONSTRAINT fk_stm_predecessor FOREIGN KEY (predecessor_stm_id) REFERENCES steps_master_stm(stm_id),
    CONSTRAINT fk_stm_prereq FOREIGN KEY (step_prereq) REFERENCES steps_master_stm(stm_id)
);

-- Table: controls_master_ctl
CREATE TABLE controls_master_ctl (
    ctl_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    critical BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT,
    producer_team_id INTEGER,
    it_validator_team_id INTEGER,
    biz_validator_team_id INTEGER,
    CONSTRAINT fk_ctl_producer_team FOREIGN KEY (producer_team_id) REFERENCES teams_tms(id),
    CONSTRAINT fk_ctl_it_validator_team FOREIGN KEY (it_validator_team_id) REFERENCES teams_tms(id),
    CONSTRAINT fk_ctl_biz_validator_team FOREIGN KEY (biz_validator_team_id) REFERENCES teams_tms(id)
);

-- Table: instructions_master_inm
CREATE TABLE instructions_master_inm (
    inm_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stm_id UUID NOT NULL,
    instruction_order INTEGER,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    format VARCHAR(50),
    duration_min INTEGER,
    ctl_id UUID,
    CONSTRAINT fk_inm_stm FOREIGN KEY (stm_id) REFERENCES steps_master_stm(stm_id),
    CONSTRAINT fk_inm_ctl FOREIGN KEY (ctl_id) REFERENCES controls_master_ctl(ctl_id)
);

-- Add comments for clarity
COMMENT ON TYPE env_type_enum IS 'Environment type for canonical steps (PROD, TEST, BACKUP)';
COMMENT ON COLUMN steps_master_stm.env_type IS 'Environment type (enum: PROD, TEST, BACKUP)';
COMMENT ON COLUMN steps_master_stm.duration_min IS 'Step duration in minutes';
COMMENT ON COLUMN sequences_master_sqm.duration_min IS 'Sequence duration in minutes';
COMMENT ON COLUMN chapters_master_chm.duration_min IS 'Chapter duration in minutes';
COMMENT ON COLUMN instructions_master_inm.duration_min IS 'Instruction duration in minutes';
COMMENT ON COLUMN controls_master_ctl.critical IS 'Whether the control is critical (boolean)';

