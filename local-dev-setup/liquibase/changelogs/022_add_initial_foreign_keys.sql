-- liquibase formatted sql

-- changeset UMIG_MODEL_EXPANSION:add_initial_foreign_keys_1
-- comment: Add foreign key constraints to migrations_mig table
ALTER TABLE migrations_mig
    ADD CONSTRAINT fk_migrations_mig_applications_app FOREIGN KEY (mig_app_id) REFERENCES applications_app(id),
    ADD CONSTRAINT fk_migrations_mig_implementation_plans FOREIGN KEY (mig_ipl_id) REFERENCES implementation_plans(id),
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
    ADD CONSTRAINT fk_steps_stp_team_members_responsible FOREIGN KEY (stp_responsible_usr_id) REFERENCES team_members(id), -- users_usr maps to team_members
    ADD CONSTRAINT fk_steps_stp_status_sts FOREIGN KEY (sts_id) REFERENCES status_sts(id);

-- changeset UMIG_MODEL_EXPANSION:add_initial_foreign_keys_5
-- comment: Add foreign key constraints to additional_instructions_ais table
ALTER TABLE additional_instructions_ais
    ADD CONSTRAINT fk_additional_instructions_ais_steps_stp FOREIGN KEY (stp_id) REFERENCES steps_stp(id)


-- changeset UMIG_MODEL_EXPANSION:add_initial_foreign_keys_6
-- comment: Add foreign key constraints to controls_ctl table
ALTER TABLE controls_ctl
    ADD CONSTRAINT fk_controls_ctl_steps_stp FOREIGN KEY (ctl_stp_id) REFERENCES steps_stp(stp_id),
    ADD CONSTRAINT fk_controls_ctl_status_sts FOREIGN KEY (ctl_sts_id) REFERENCES status_sts(sts_id);

-- changeset UMIG_MODEL_EXPANSION:add_initial_foreign_keys_7
-- comment: Add foreign key constraints to iteration_ite table
ALTER TABLE iteration_ite
    ADD CONSTRAINT fk_iteration_ite_migrations_mig FOREIGN KEY (ite_mig_id) REFERENCES migrations_mig(mig_id);

-- changeset UMIG_MODEL_EXPANSION:add_initial_foreign_keys_8
-- comment: Add foreign key constraints to logs_log table
ALTER TABLE logs_log
    ADD CONSTRAINT fk_logs_log_migrations_mig FOREIGN KEY (log_mig_id) REFERENCES migrations_mig(mig_id),
    ADD CONSTRAINT fk_logs_log_iteration_ite FOREIGN KEY (log_ite_id) REFERENCES iteration_ite(ite_id) ON DELETE SET NULL, -- Assuming logs can exist without iteration
    ADD CONSTRAINT fk_logs_log_phases_phs FOREIGN KEY (log_phs_id) REFERENCES phases_phs(phs_id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_logs_log_chapter_cha FOREIGN KEY (log_cha_id) REFERENCES chapter_cha(cha_id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_logs_log_steps_stp FOREIGN KEY (log_stp_id) REFERENCES steps_stp(stp_id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_logs_log_controls_ctl FOREIGN KEY (log_ctl_id) REFERENCES controls_ctl(ctl_id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_logs_log_team_members FOREIGN KEY (log_usr_id) REFERENCES team_members(id); -- users_usr maps to team_members

-- changeset UMIG_MODEL_EXPANSION:add_initial_foreign_keys_9
-- comment: Add foreign keys and unique constraint to environments_applications_eap (join table)
ALTER TABLE environments_applications_eap
    ADD CONSTRAINT fk_eap_environments_env FOREIGN KEY (eap_env_id) REFERENCES environments_env(env_id),
    ADD CONSTRAINT fk_eap_applications_app FOREIGN KEY (eap_app_id) REFERENCES applications_app(app_id),
    ADD CONSTRAINT uq_eap_env_app UNIQUE (eap_env_id, eap_app_id);

-- changeset UMIG_MODEL_EXPANSION:add_initial_foreign_keys_10
-- comment: Add foreign keys and unique constraint to impacted_teams_its (join table)
ALTER TABLE impacted_teams_its
    ADD CONSTRAINT fk_its_migrations_mig FOREIGN KEY (its_mig_id) REFERENCES migrations_mig(mig_id),
    ADD CONSTRAINT fk_its_teams FOREIGN KEY (its_tms_id) REFERENCES teams(id), -- TEAMS_TMS maps to teams
    ADD CONSTRAINT uq_its_mig_tms UNIQUE (its_mig_id, its_tms_id);

-- changeset UMIG_MODEL_EXPANSION:add_initial_foreign_keys_11
-- comment: Add foreign keys and unique constraint to migrations_environments_mev (join table)
ALTER TABLE migrations_environments_mev
    ADD CONSTRAINT fk_mev_migrations_mig FOREIGN KEY (mev_mig_id) REFERENCES migrations_mig(mig_id),
    ADD CONSTRAINT fk_mev_environments_env FOREIGN KEY (mev_env_id) REFERENCES environments_env(env_id),
    ADD CONSTRAINT uq_mev_mig_env UNIQUE (mev_mig_id, mev_env_id);

-- changeset UMIG_MODEL_EXPANSION:add_initial_foreign_keys_12
-- comment: Add foreign keys and unique constraint to steps_instructions_sin (join table)
ALTER TABLE steps_instructions_sin
    ADD CONSTRAINT fk_sin_steps_stp FOREIGN KEY (sin_stp_id) REFERENCES steps_stp(stp_id),
    ADD CONSTRAINT fk_sin_instructions_ins FOREIGN KEY (sin_ins_id) REFERENCES instructions_ins(ins_id),
    ADD CONSTRAINT uq_sin_stp_ins UNIQUE (sin_stp_id, sin_ins_id);

-- changeset UMIG_MODEL_EXPANSION:add_initial_foreign_keys_13
-- comment: Add foreign keys and unique constraint to teams_applications_tap (join table)
ALTER TABLE teams_applications_tap
    ADD CONSTRAINT fk_tap_teams FOREIGN KEY (tap_tms_id) REFERENCES teams(id), -- TEAMS_TMS maps to teams
    ADD CONSTRAINT fk_tap_applications_app FOREIGN KEY (tap_app_id) REFERENCES applications_app(app_id),
    ADD CONSTRAINT uq_tap_tms_app UNIQUE (tap_tms_id, tap_app_id);
