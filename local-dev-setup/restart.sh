#!/bin/bash
# This script stops, optionally resets the database volume, and restarts the environment.
set -e

# Navigate to the script's directory to ensure other scripts are found
cd "$(dirname "$0")"

# --- Stop the environment ---
echo "🛑 Stopping all services..."
# Pass the first argument (e.g., --reset) directly to the stop script
./stop.sh "$1"
echo "All services stopped."
echo

# --- Start the environment ---
echo "🚀 Starting all services..."
./start.sh

echo "✅ Restart complete."