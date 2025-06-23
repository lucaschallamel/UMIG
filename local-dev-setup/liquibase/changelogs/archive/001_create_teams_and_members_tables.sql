-- liquibase formatted sql

-- changeset umig:1
-- comment: Create the 'teams_tms' table to store information about different teams.
CREATE TABLE IF NOT EXISTS teams_tms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- changeset umig:2
-- comment: Create the 'users_usr' table to store information about users.
CREATE TABLE IF NOT EXISTS users_usr (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(100),
    tms_id INTEGER REFERENCES teams_tms(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- changeset umig:3
-- comment: Grant permissions to the application user.
GRANT ALL PRIVILEGES ON TABLE teams_tms, users_usr TO umig_app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO umig_app_user;
