-- liquibase formatted sql
-- changeset umig:grant_app_user_privileges_1
-- comment: Grant all necessary privileges to application user for all tables and sequences in public schema

-- Tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO umig_app_user;

-- Sequences (for SERIAL columns)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO umig_app_user;

-- Default privileges for future tables/sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO umig_app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO umig_app_user;

-- (Optional) Grant usage on schema
GRANT USAGE ON SCHEMA public TO umig_app_user;
