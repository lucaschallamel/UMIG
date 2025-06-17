#!/bin/bash
# This script provides a reliable way to stop the development environment.
set -e

cd "$(dirname "$0")"

echo "Stopping and removing all services forcefully..."

# Forcefully remove containers by name to prevent naming conflicts on restart.
# The '|| true' ensures the script doesn't fail if a container doesn't exist.
podman rm -f umig_confluence umig_postgres umig_liquibase umig_mailhog || true

# Run 'down' to clean up the network and other resources.
podman-compose down
echo "Environment stopped." 
