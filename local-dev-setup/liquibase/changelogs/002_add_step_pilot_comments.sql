--liquibase formatted sql
--changeset lucas.challamel:002_add_step_pilot_comments context:all
--comment: Adds step_pilot_comments_spc to support accrued pilot/release manager comments per step

CREATE TABLE IF NOT EXISTS step_pilot_comments_spc (
    spc_id        SERIAL PRIMARY KEY,
    stm_id        UUID NOT NULL REFERENCES steps_master_stm(stm_id) ON DELETE CASCADE,
    comment_body  TEXT NOT NULL,
    created_by    INTEGER NOT NULL REFERENCES users_usr(usr_id),
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by    INTEGER REFERENCES users_usr(usr_id),
    updated_at    TIMESTAMP,
    visibility    VARCHAR(30) DEFAULT 'pilot'
);

CREATE INDEX IF NOT EXISTS idx_spc_stm_id ON step_pilot_comments_spc(stm_id);
