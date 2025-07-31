#!/bin/bash
set -e

# This script is executed when the PostgreSQL container starts.
# It creates dedicated users and databases for UMIG and Confluence applications if they don't exist.
# The UMIG schema itself is managed by Liquibase.

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

# Create Confluence database and user
echo "Creating Confluence database and user..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create the confluence user if it doesn't exist.
    DO
    \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'confluence_user') THEN
            CREATE USER confluence_user WITH PASSWORD '123456';
        END IF;
    END
    \$\$;
EOSQL

# Check if confluence database exists and create it if not.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -tc "SELECT 1 FROM pg_database WHERE datname = 'confluence_db'" | grep -q 1 || psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c "CREATE DATABASE confluence_db"

# Grant privileges on the confluence database to the confluence user.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c "GRANT ALL PRIVILEGES ON DATABASE confluence_db TO confluence_user;"
