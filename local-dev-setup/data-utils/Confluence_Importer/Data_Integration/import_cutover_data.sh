#!/bin/bash
set -eo pipefail # Exit on error and treat pipe failures as errors

# --- Configuration ---
# Get the directory of the script to build absolute paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
# Correct the path to point to the parent directory's rawData folder
JSON_DIR="$SCRIPT_DIR/../rawData"

# --- Database Connection ---
# Check for required environment variables from liquibase.properties
: "${UMIG_DB_HOST:=172.21.4.34}" # Default to 'postgres' if not set
: "${UMIG_DB_PORT:=5432}"
: "${UMIG_DB_NAME:=umig_app_db}"
: "${UMIG_DB_USER:=umig_app_user}"
: "${UMIG_DB_PASSWORD:=123456}"

# Export standard PostgreSQL environment variables for psql
export PGHOST="$UMIG_DB_HOST"
export PGPORT="$UMIG_DB_PORT"
export PGDATABASE="$UMIG_DB_NAME"
export PGUSER="$UMIG_DB_USER"
export PGPASSWORD="$UMIG_DB_PASSWORD"

echo "Starting data import for staging steps..."
echo "Host: $PGHOST, DB: $PGDATABASE"

# --- Staging, Loading, and Transformation ---

# 1. Create a temporary table that persists across connections in this script.
# We use a regular table and drop it at the end for more control.
psql -v ON_ERROR_STOP=1 -c "CREATE TABLE IF NOT EXISTS json_import_stage (data JSONB); TRUNCATE TABLE json_import_stage;"
echo "[DIAGNOSTIC] Staging table 'json_import_stage' created and truncated."

# 2. Loop through each file, telling psql to read it directly from disk.
# This avoids the environmental stdin issues we've been facing.
while IFS= read -r -d $'\0' file; do
    echo "[DIAGNOSTIC] Processing file: $file"

    # Basic check for an empty or near-empty file
    if [ "$(wc -c <"$file")" -lt 5 ]; then
        echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
        echo "!!! ERROR: File is suspiciously small (likely corrupt): $file"
        echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
        continue # Skip to the next file
    fi

    # Use `\copy FROM 'filename'` which tells psql to read the file from disk, bypassing stdin.
    # Note the quoting: double quotes for the shell to expand ${file}, single quotes for SQL to see a string literal.
    if ! psql -v ON_ERROR_STOP=1 --quiet -c "\\copy json_import_stage (data) FROM '${file}'"; then
        echo "FATAL: psql command failed for file: '${file}'." >&2
        echo "Please check the file content and PostgreSQL logs." >&2
        exit 1
    fi
done < <(find "${JSON_DIR}/json" -name "*.json" -print0)

echo "[DIAGNOSTIC] All files imported successfully into staging table."

# 3. Run the final transformation in a single transaction.
psql -v ON_ERROR_STOP=1 <<-SQL
    BEGIN;

    WITH source_data AS (
        SELECT data FROM json_import_stage
    ),
    upsert_steps AS (
        INSERT INTO stg_steps (
            id, step_type, step_number, step_title, step_predecessor,
            step_successor, step_assigned_team, step_impacted_teams,
            step_macro_time_sequence, step_time_sequence
        )
        SELECT
            (data->>'step_name') AS id,
            (data->>'step_type')::stg_step_type AS step_type,
            (data->>'step_number')::INT AS step_number,
            (data->>'step_title') AS step_title,
            (data->>'step_predecessor') AS step_predecessor,
            (data->>'step_successor') AS step_successor,
            (data->>'step_assigned_team') AS step_assigned_team,
            (data->'step_impacted_teams') AS step_impacted_teams,
            (data->>'step_macro_time_sequence') AS step_macro_time_sequence,
            (data->>'step_time_sequence') AS step_time_sequence
        FROM source_data
        ON CONFLICT (id) DO UPDATE SET
            step_type = EXCLUDED.step_type,
            step_number = EXCLUDED.step_number,
            step_title = EXCLUDED.step_title,
            step_predecessor = EXCLUDED.step_predecessor,
            step_successor = EXCLUDED.step_successor,
            step_assigned_team = EXCLUDED.step_assigned_team,
            step_impacted_teams = EXCLUDED.step_impacted_teams,
            step_macro_time_sequence = EXCLUDED.step_macro_time_sequence,
            step_time_sequence = EXCLUDED.step_time_sequence
        RETURNING id
    ),
    delete_instructions AS (
        DELETE FROM stg_step_instructions
        WHERE step_id IN (SELECT id FROM upsert_steps)
    )
    INSERT INTO stg_step_instructions (step_id, instruction_id, instruction_text, instruction_assignee)
    SELECT
        s.data->>'step_name',
        i.id,
        i.text,
        i.assignee
    FROM source_data s, jsonb_to_recordset(s.data->'step_instructions') AS i(id TEXT, text TEXT, assignee TEXT)
    WHERE s.data->>'step_name' IN (SELECT id FROM upsert_steps);

    -- Clean up the staging table
    DROP TABLE json_import_stage;

    COMMIT;
SQL
echo "Import script finished."
