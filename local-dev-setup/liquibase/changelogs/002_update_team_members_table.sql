-- liquibase formatted sql

-- changeset umig:4
-- comment: Update 'team_members' to store person details and allow members to exist without a team.

-- Drop the old unique constraint that depends on the 'name' column
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_name_team_id_key;

-- Drop the old 'name' column
ALTER TABLE team_members DROP COLUMN name;

-- Add new columns for person details
ALTER TABLE team_members ADD COLUMN first_name VARCHAR(255) NOT NULL;
ALTER TABLE team_members ADD COLUMN last_name VARCHAR(255) NOT NULL;
ALTER TABLE team_members ADD COLUMN email VARCHAR(255) NOT NULL;

-- Add a unique constraint to email, as it's the new identifier for a person
ALTER TABLE team_members ADD CONSTRAINT team_members_email_key UNIQUE (email);

-- Make team_id nullable so a person can exist without a team
ALTER TABLE team_members ALTER COLUMN team_id DROP NOT NULL;
