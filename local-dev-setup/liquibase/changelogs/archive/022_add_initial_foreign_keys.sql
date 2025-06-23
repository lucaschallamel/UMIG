-- liquibase formatted sql

-- changeset UMIG_MODEL_EXPANSION:add_initial_foreign_keys_1
-- comment: Add foreign key constraints to migrations_mig table
ALTER TABLE migrations_mig
    ADD CONSTRAINT fk_migrations_mig_applications_app FOREIGN KEY (mig_app_id) REFERENCES applications_app(id),
    ADD CONSTRAINT fk_migrations_mig_status_sts FOREIGN KEY (sts_id) REFERENCES status_sts(id);

-- changeset UMIG_MODEL_EXPANSION:add_initial_foreign_keys_2
-- comment: Add foreign key constraints to phases_phs table
ALTER TABLE phases_phs
    ADD CONSTRAINT fk_phases_phs_migrations_mig FOREIGN KEY (mig_id) REFERENCES migrations_mig(id);

-- changeset UMIG_MODEL_EXPANSION:add_initial_foreign_keys_3
-- comment: Add foreign key constraints to chapter_cha table
ALTER TABLE chapter_cha
    ADD CONSTRAINT fk_chapter_cha_phases_phs FOREIGN KEY (phs_id) REFERENCES phases_phs(id);

-- changeset UMIG_MODEL_EXPANSION:add_initial_foreign_keys_4
-- comment: Add foreign key constraints to steps_stp table
ALTER TABLE steps_stp
    ADD CONSTRAINT fk_steps_stp_chapter_cha FOREIGN KEY (cha_id) REFERENCES chapter_cha(id),
    ADD CONSTRAINT fk_steps_stp_step_type_stt FOREIGN KEY (stt_id) REFERENCES step_type_stt(id),
            ADD CONSTRAINT fk_steps_stp_users_responsible FOREIGN KEY (stp_responsible_usr_id) REFERENCES users_usr(id), -- users_usr
    ADD CONSTRAINT fk_steps_stp_status_sts FOREIGN KEY (sts_id) REFERENCES status_sts(id);

-- changeset UMIG_MODEL_EXPANSION:add_initial_foreign_keys_5
-- comment: Add foreign key constraints to additional_instructions_ais table
ALTER TABLE additional_instructions_ais
    ADD CONSTRAINT fk_additional_instructions_ais_steps_stp FOREIGN KEY (stp_id) REFERENCES steps_stp(id)


-- changeset UMIG_MODEL_EXPANSION:add_initial_foreign_keys_6
-- comment: Add foreign key constraints to controls_ctl table
ALTER TABLE controls_ctl
    ADD CONSTRAINT fk_controls_ctl_steps_stp FOREIGN KEY (stp_id) REFERENCES steps_stp(id);

-- changeset UMIG_MODEL_EXPANSION:add_initial_foreign_keys_7
-- comment: Add foreign key constraints to iterations_ite table
ALTER TABLE iterations_ite
    ADD CONSTRAINT fk_iterations_ite_migrations_mig FOREIGN KEY (mig_id) REFERENCES migrations_mig(id);

-- changeset UMIG_MODEL_EXPANSION:add_initial_foreign_keys_8
-- comment: Add foreign key constraints to logs_log table
ALTER TABLE logs_log
    ADD CONSTRAINT fk_logs_log_migrations_mig FOREIGN KEY (mig_id) REFERENCES migrations_mig(id),
    ADD CONSTRAINT fk_logs_log_phases_phs FOREIGN KEY (phs_id) REFERENCES phases_phs(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_logs_log_chapter_cha FOREIGN KEY (cha_id) REFERENCES chapter_cha(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_logs_log_steps_stp FOREIGN KEY (stp_id) REFERENCES steps_stp(id) ON DELETE SET NULL,
            ADD CONSTRAINT fk_logs_log_users FOREIGN KEY (usr_id) REFERENCES users_usr(id);

-- changeset UMIG_MODEL_EXPANSION:add_initial_foreign_keys_9
-- comment: Add foreign keys and unique constraint to environments_applications_eap (join table)
ALTER TABLE environments_applications_eap
    ADD CONSTRAINT fk_eap_environments_env FOREIGN KEY (env_id) REFERENCES environments_env(id),
    ADD CONSTRAINT fk_eap_applications_app FOREIGN KEY (app_id) REFERENCES applications_app(id),
    ADD CONSTRAINT uq_eap_env_app UNIQUE (env_id, app_id);

-- changeset UMIG_MODEL_EXPANSION:add_initial_foreign_keys_10
-- comment: Add foreign keys and unique constraint to impacted_teams_its (join table)
ALTER TABLE impacted_teams_its
    ADD CONSTRAINT fk_its_steps_stp FOREIGN KEY (stp_id) REFERENCES steps_stp(id),
            ADD CONSTRAINT fk_its_teams_tms FOREIGN KEY (tms_id) REFERENCES teams_tms(id),
    ADD CONSTRAINT uq_its_stp_tms UNIQUE (stp_id, tms_id);

-- changeset UMIG_MODEL_EXPANSION:add_initial_foreign_keys_11
-- comment: Add foreign keys and unique constraint to migrations_environments_mev (join table)
ALTER TABLE migrations_environments_mev
    ADD CONSTRAINT fk_mev_migrations_mig FOREIGN KEY (mig_id) REFERENCES migrations_mig(id),
    ADD CONSTRAINT fk_mev_environments_env FOREIGN KEY (env_id) REFERENCES environments_env(id),
    ADD CONSTRAINT uq_mev_mig_env UNIQUE (mig_id, env_id);

-- changeset UMIG_MODEL_EXPANSION:add_initial_foreign_keys_12
-- comment: Add foreign keys and unique constraint to steps_instructions_sin (join table)
ALTER TABLE steps_instructions_sin
    ADD CONSTRAINT fk_sin_steps_stp FOREIGN KEY (stp_id) REFERENCES steps_stp(id),
    ADD CONSTRAINT fk_sin_instructions_ins FOREIGN KEY (ins_id) REFERENCES instructions_ins(id),
    ADD CONSTRAINT uq_sin_stp_ins UNIQUE (stp_id, ins_id);

-- changeset UMIG_MODEL_EXPANSION:add_initial_foreign_keys_13
-- comment: Add foreign keys and unique constraint to teams_applications_tap (join table)
ALTER TABLE teams_applications_tap
            ADD CONSTRAINT fk_tap_teams_tms FOREIGN KEY (tms_id) REFERENCES teams_tms(id),
    ADD CONSTRAINT fk_tap_applications_app FOREIGN KEY (app_id) REFERENCES applications_app(id),
    ADD CONSTRAINT uq_tap_tms_app UNIQUE (tms_id, app_id);
