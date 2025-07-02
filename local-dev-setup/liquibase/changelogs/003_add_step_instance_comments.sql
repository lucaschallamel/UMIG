--liquibase formatted sql
--changeset lucas.challamel:003_add_step_instance_comments context:all
--comment: Adds step_instance_comments_sic to support user comments on step execution (steps_instance_sti)

CREATE TABLE step_instance_comments_sic (
    sic_id        SERIAL PRIMARY KEY,
    sti_id        UUID NOT NULL REFERENCES steps_instance_sti(sti_id) ON DELETE CASCADE,
    comment_body  TEXT NOT NULL,
    created_by    INTEGER NOT NULL REFERENCES users_usr(usr_id),
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by    INTEGER REFERENCES users_usr(usr_id),
    updated_at    TIMESTAMP
);

CREATE INDEX idx_sic_sti_id ON step_instance_comments_sic(sti_id);
