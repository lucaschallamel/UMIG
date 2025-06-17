#!/bin/bash
set -e

# This script is executed when the PostgreSQL container starts for the first time.
# It creates a dedicated user and database for the UMIG application.
# The schema itself is managed by Liquibase.

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create the application user if it doesn't exist.
    DO
    \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${UMIG_DB_USER}') THEN
            CREATE USER ${UMIG_DB_USER} WITH PASSWORD '${UMIG_DB_PASSWORD}';
        END IF;
    END
    \$\$;

    -- Create the application database if it doesn't exist.
    -- We must disconnect from the current DB and connect as the postgres user to do this.
    -- The creation is handled by checking for its existence first.
EOSQL

# Check if database exists and create it if not.
# This is done separately because CREATE DATABASE cannot be run inside a transaction block.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -tc "SELECT 1 FROM pg_database WHERE datname = '${UMIG_DB_NAME}'" | grep -q 1 || psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c "CREATE DATABASE ${UMIG_DB_NAME}"

# Grant privileges on the new database to the application user.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c "GRANT ALL PRIVILEGES ON DATABASE ${UMIG_DB_NAME} TO ${UMIG_DB_USER};"
