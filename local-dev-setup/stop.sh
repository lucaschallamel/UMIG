#!/bin/bash
# This script provides a reliable way to stop the development environment.
set -e

cd "$(dirname "$0")"

echo "Stopping and removing all services defined in podman-compose.yml..."

# 'podman-compose down' is the canonical way to stop and remove all resources
# (containers, networks) associated with the project. It is idempotent and
# will not produce errors if the environment is already stopped.
podman-compose down

echo "Removing persistent data volumes to ensure a clean start..."
# The '|| true' part ensures that the script doesn't fail if the volume doesn't exist
podman volume rm local-dev-setup_postgres_data || true
podman volume rm local-dev-setup_confluence_data || true

echo "Environment stopped and cleaned." 
