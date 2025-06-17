-- Migration 001: Create initial tables for teams and team_members.
-- This script is idempotent and can be run on a database where these tables might already exist.

-- Grant permissions on the public schema to the application user if not already granted.
-- Note: This might already be set by init-db.sh, but it's safe to include.
GRANT ALL ON SCHEMA public TO umig_app_user;

-- Create the 'teams' table to store information about different teams.
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the 'team_members' table to store information about team members.
CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100),
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (name, team_id) -- A person can't be on the same team twice.
);

-- Grant all necessary privileges on the new tables to the application user.
GRANT ALL PRIVILEGES ON TABLE teams, team_members TO umig_app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO umig_app_user;

-- Optional: Add a comment to the database to track that this migration has been applied.
COMMENT ON TABLE teams IS 'Migration 001 applied';
