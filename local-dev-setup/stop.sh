#!/bin/bash
# This script provides a reliable way to stop the development environment.
set -e

cd "$(dirname "$0")"

echo "Stopping and removing all services defined in podman-compose.yml..."

# 'podman-compose down' is the canonical way to stop and remove all resources
# (containers, networks) associated with the project. It is idempotent and
# will not produce errors if the environment is already stopped.
podman-compose down

echo "Environment stopped."

# --- Handle optional data reset ---
if [[ "$1" == "--reset" ]]; then
  # Ask for confirmation before deleting the volumes
  read -p "❓ Are you sure you want to permanently delete all persistent data volumes (PostgreSQL and Confluence)? [y/N] " -n 1 -r
  echo # Move to a new line
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  Deleting persistent data volumes..."
    # Use '|| true' to prevent script failure if a volume doesn't exist
    podman volume rm local-dev-setup_postgres_data || true
    podman volume rm local-dev-setup_confluence_data || true
    echo "All persistent data volumes have been removed."
  else
    echo "Skipping volume deletion."
  fi
fi 
