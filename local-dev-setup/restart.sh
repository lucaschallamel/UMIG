#!/bin/bash
# This script stops, optionally resets the database volume, and restarts the environment.
set -e

# Navigate to the script's directory to ensure other scripts are found
cd "$(dirname "$0")"

# --- Stop the environment ---
echo "🛑 Stopping all services..."
./stop.sh
echo "All services stopped."
echo

# --- Handle optional data reset ---
if [[ "$1" == "--reset" ]]; then
  # Ask for confirmation before deleting the volume
  read -p "❓ Are you sure you want to permanently delete the PostgreSQL data volume? [y/N] " -n 1 -r
  echo # Move to a new line
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  Deleting PostgreSQL data volume..."
    if podman volume exists local-dev-setup_postgres_data >/dev/null 2>&1; then
      podman volume rm local-dev-setup_postgres_data
      echo "Volume 'local-dev-setup_postgres_data' removed successfully."
    else
      echo "Volume 'local-dev-setup_postgres_data' does not exist. Skipping removal."
    fi
  else
    echo "Skipping volume deletion."
  fi
  echo
fi

# --- Start the environment ---
echo "🚀 Starting all services..."
./start.sh

echo "✅ Restart complete."