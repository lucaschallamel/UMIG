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
