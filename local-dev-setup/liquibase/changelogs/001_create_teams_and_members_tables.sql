-- liquibase formatted sql

-- changeset umig:1
-- comment: Create the 'teams' table to store information about different teams.
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- changeset umig:2
-- comment: Create the 'team_members' table to store information about team members.
CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100),
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (name, team_id)
);

-- changeset umig:3
-- comment: Grant permissions to the application user.
GRANT ALL PRIVILEGES ON TABLE teams, team_members TO umig_app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO umig_app_user;
