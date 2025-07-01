--liquibase formatted sql

--changeset cascade:006_add_teams_users_join context:all
--comment: Add join table for associating users with multiple teams (teams_tms_x_users_usr), migrate existing data, and drop users_usr.tms_id

-- 1. Create the join table
CREATE TABLE teams_tms_x_users_usr (
    tms_x_usr_id SERIAL PRIMARY KEY,
    tms_id INTEGER NOT NULL,
    usr_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by INTEGER,
    CONSTRAINT uq_tms_x_usr UNIQUE (tms_id, usr_id),
    CONSTRAINT fk_tms_x_usr_tms_id FOREIGN KEY (tms_id) REFERENCES teams_tms(tms_id) ON DELETE CASCADE,
    CONSTRAINT fk_tms_x_usr_usr_id FOREIGN KEY (usr_id) REFERENCES users_usr(usr_id) ON DELETE CASCADE
);

COMMENT ON TABLE teams_tms_x_users_usr IS 'Join table linking teams and users for N-N team membership.';
COMMENT ON COLUMN teams_tms_x_users_usr.tms_id IS 'References teams_tms (team).';
COMMENT ON COLUMN teams_tms_x_users_usr.usr_id IS 'References users_usr (user).';
COMMENT ON COLUMN teams_tms_x_users_usr.created_by IS 'User ID that created the association (not FK, but integer).';

-- 2. Migrate existing user-team assignments (if any)
INSERT INTO teams_tms_x_users_usr (tms_id, usr_id, created_by)
SELECT tms_id, usr_id, usr_id
FROM users_usr
WHERE tms_id IS NOT NULL;

-- 3. Drop the old team_id column and its FK from users_usr
ALTER TABLE users_usr DROP CONSTRAINT IF EXISTS fk_usr_tms_tms_id;
ALTER TABLE users_usr DROP COLUMN IF EXISTS tms_id;
