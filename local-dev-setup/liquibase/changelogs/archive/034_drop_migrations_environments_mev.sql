-- liquibase formatted sql

-- changeset UMIG_MODEL_EXPANSION:drop_migrations_environments_mev
-- comment: Drop the migrations_environments_mev association table
DROP TABLE IF EXISTS migrations_environments_mev;
