#!/bin/bash
# This script provides a reliable way to start the development environment,
# bypassing a dependency resolution bug in podman-compose.
set -e # Exit immediately if a command exits with a non-zero status.

# Navigate to the script's directory to ensure podman-compose finds the .yml file
cd "$(dirname "$0")"

if [ -f .env ]; then
  # Use a robust method to load environment variables from the .env file.
  set -o allexport
  # shellcheck disable=SC1091
  source .env
  set +o allexport
fi



echo "[1/4] Starting PostgreSQL..."
podman-compose up -d postgres

echo "[2/4] Waiting for PostgreSQL to become healthy..."
while [[ "$(podman inspect --format '{{.State.Health.Status}}' umig_postgres 2>/dev/null)" != "healthy" ]]; do
    sleep 3
    echo -n "."
done
printf "\nPostgreSQL is healthy.\n"

# Actively poll the PostgreSQL port to ensure it's ready for connections before proceeding.
# This is more reliable than a fixed sleep, preventing race conditions.
echo "Waiting for PostgreSQL to accept connections..."
while ! nc -z localhost 5432; do
  sleep 1 # wait for 1 second before checking again
  echo -n "."
done
printf "\nPostgreSQL is ready for connections.\n"

echo "[3/4] Running database migrations with local Liquibase..."
# Run liquibase from the host, passing credentials directly to the command.
# This is the most explicit and reliable method to avoid environment substitution issues.
# The path to the properties file has been corrected.
liquibase \
    --defaults-file=liquibase/liquibase.properties \
    --search-path=./liquibase \
    --url="jdbc:postgresql://localhost:5432/${UMIG_DB_NAME}" \
    --username="${UMIG_DB_USER}" \
    --password="${UMIG_DB_PASSWORD}" \
    update
echo "Liquibase migrations complete."

printf "[4/4] Starting Confluence and MailHog...\n"
podman-compose up -d confluence mailhog

printf "\n🚀 Development environment is up and running!\n"
echo "Confluence: http://localhost:8090"
echo "MailHog:    http://localhost:8025"
