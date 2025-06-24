# UMIG Data Utilities

This directory contains CLI tools for generating synthetic test data and importing CSV data into the UMIG PostgreSQL database for local development and testing.

## Requirements

- Node.js (v18+ recommended)
- npm
- PostgreSQL database (local or in Podman container)
- `.env` file in `/local-dev-setup` with all required DB connection variables:
  - `POSTGRES_HOST`
  - `POSTGRES_PORT`
  - `UMIG_DB_USER`
  - `UMIG_DB_PASSWORD`
  - `UMIG_DB_NAME`

## Setup

1. Install dependencies:
   ```sh
   npm install
   ```
2. Ensure your `/local-dev-setup/.env` file is configured. See `.env.example` for required variables.

---

## 1. Fake Data Generator

**Script:** `umig_generate_fake_data.js`

**Purpose:** Populates the local database with a foundational set of synthetic data for development and testing. It generates the high-level structures for migrations, iterations, and sequences, along with the necessary users, teams, applications, and environments. It does **not** yet generate the detailed plan data within those structures (e.g., chapters, steps, tasks).

**Environment Safety:** The script includes critical safety checks:
- It will **only** run if the `--env dev` or `--env test` flag is explicitly provided.
- If the `--reset` flag is used, it will prompt for confirmation before truncating tables to prevent accidental data loss.
- It will fail with a clear error if any required database connection variables from `.env` are missing.

### Usage

- **Generate data (without resetting):**
  ```sh
  node umig_generate_fake_data.js --env dev
  ```
- **Reset and generate new data:**
  ```sh
  node umig_generate_fake_data.js --env dev --reset
  ```

### Configuration (`fake_data_config.json`)

The generation process is controlled by `fake_data_config.json`. Below is a description of each parameter:

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `num_migrations` | Number | The total number of migrations (`migrations_mig`) to create. |
| `mig_type` | String | The type assigned to all generated migrations (e.g., "EXTERNAL"). |
| `mig_start_date_range`| Array | A `[start, end]` string array defining the date range for migration start dates. |
| `mig_duration_months`| Number | The duration in months for each migration, used to calculate the end date. |
| `iterations` | Object | Defines the number of `RUN`, `DR`, and `CUTOVER` iterations per migration. |
| `num_teams` | Number | The number of regular teams to generate (in addition to the special `IT_CUTOVER` team). |
| `teams_email_domain` | String | The email domain used for all generated users (e.g., "example.com"). |
| `num_applications` | Number | The number of applications to generate. |
| `num_users` | Number | The number of users with the `NORMAL` role to generate. |
| `num_pilot_users` | Number | The number of users with the `PILOT` role to generate. |
| `num_admin_users` | Number | The number of users with the `ADMIN` role to generate. |

### Data Generation Logic and Conventions

The script follows specific rules to ensure data integrity and realism:

- **High-Level Structure:** The script generates a specified number of `migrations_mig`. For each migration, it creates a corresponding set of `iterations_ite` (RUN, DR, CUTOVER) and `sequences_sqc` (PRE-MIGRATION, CSD MIGRATION, etc.).

- **Users, Teams, and Roles:**
  - A special **`IT_CUTOVER`** team is always created first (`tms_code` = `T00`).
  - `ADMIN` and `PILOT` users are assigned exclusively to the `IT_CUTOVER` team.
  - `NORMAL` users are distributed across the other generated teams.

- **Applications and Environments:**
  - A fixed list of environments (`PROD`, `EV1`, etc.) is created.
  - A specified number of applications are generated and randomly linked to teams via the `teams_applications_tap` table.

- **Pending Implementation:** The script does **not** yet populate the tables for chapters, steps, tasks, controls, statuses, or their related join tables. This is the next logical area for expansion.

- **Applications (`applications_app`):**
  - Applications are generated with unique 3-letter codes.
  - Each application is randomly assigned to one of the generated teams (excluding `IT_CUTOVER`).

- **Users (`users_usr`):**
  - **Roles:** Users are generated for three roles: `NORMAL`, `ADMIN`, and `PILOT`. The number for each is set in the config.
  - **Unique Trigrams:** Every user is assigned a unique, randomly generated 3-letter uppercase trigram (`usr_trigram`).
  - **Team Assignment Logic:**
    - All `ADMIN` and `PILOT` users are assigned **exclusively** to the `IT_CUTOVER` team.
    - `NORMAL` users are distributed among the other teams.
    - The script **guarantees** that every non-`IT_CUTOVER` team has at least one `NORMAL` user assigned to it, preventing orphaned teams.
  - **Email:** User emails are generated in the format `firstname.lastname@<teams_email_domain>`.

---

## 2. CSV Import Utility

**Script:** `umig_csv_importer.js`

- **Purpose:** Import teams or team members from a flat CSV file, with a flexible field mapping between CSV headers and DB columns (using a JSON mapping file).
- **Environment Safety:** Refuses to run unless `--env dev` or `--env test` is specified. Will fail with a clear error if any required DB environment variable is missing.
- **Reset Option:** Use `--reset` to truncate the target table before import (with confirmation prompt).
- **Dry-Run Option:** Use `--dry-run` to validate and preview what would be imported, without modifying the database.

### Usage

```sh
node umig_csv_importer.js --table team_members --csv ./sample_team_members.csv --mapping-file ./sample_team_members_mapping.json --env dev --dry-run
node umig_csv_importer.js --table teams --csv ./sample_teams.csv --mapping-file ./sample_teams_mapping.json --env dev --reset
```

- The `--mapping-file` option should point to a JSON file mapping DB fields to CSV headers. See the provided sample files.
- You will be prompted to confirm before truncating the table if `--reset` is used.

### Sample Files

- `sample_team_members.csv`, `sample_team_members_mapping.json`
- `sample_teams.csv`, `sample_teams_mapping.json`

### Test Fixtures

- Deterministic fixture files are provided in `__tests__/fixtures/` for all automated tests:
  - `fixture_team_members.csv`, `fixture_team_members_mapping.json`
  - `fixture_teams.csv`, `fixture_teams_mapping.json`
- All core and CLI tests reference these fixtures for stable, reproducible results. Update these as needed to match your evolving data model.

---

## 3. Testing

Automated tests ensure the reliability and maintainability of these utilities. Tests are located in the `__tests__/` subfolder and use [Jest](https://jestjs.io/).

### Running Tests

- To run all tests:
  ```sh
  npm test
  ```
- To run a specific test file:
  ```sh
  npx jest __tests__/umig_csv_importer.unit.test.js
  ```
- Tests are run in verbose mode, so all conditions tested and passed will be clearly listed in the output.

### Test Types
- **Unit tests:** Validate core logic (e.g., mapping, validation, CLI parsing). No database or file system side effects.
- **Integration/CLI tests:** Simulate CLI usage and check for correct behavior, error handling, and environment safety.
- **Integration tests for user and team assignment:**
  - Every team has at least one member.
  - Every user belongs to exactly one team.
  - Every application is assigned to exactly one team.
  - All ADMIN and PILOT users exist in the correct numbers and are assigned to IT_CUTOVER.

### Test Safety & Maintenance
- **No tests will ever modify, rename, or delete your `.env` file.**
- Tests that require `.env` to be missing will simply skip themselves if `.env` is present, and print a warning.
- All tests use fixture files for deterministic, reproducible results.
- If you add new features, extend the corresponding test file or add a new one in `__tests__/`.
- Keep sample CSV, mapping, and fixture files up to date as your schema evolves.
- Review test output for warnings about skipped tests—these are expected if `.env` is present.

### Adding or Updating Tests
- Place new tests in `__tests__/`, following the existing structure.
- Use Jest’s [documentation](https://jestjs.io/docs/getting-started) for advanced usage.
- Ensure new features are covered by unit and/or integration tests before merging.

---

## References
- [docs/dataModel/README.md](../../docs/dataModel/README.md)
- ADR-013 (Node.js utilities rationale)

---

## Recent Changes

- **2025-06-23:**
  - `env_code` now always matches `env_name` for environments.
  - Team names are now abstract (`TEAM_X`), not person/company names.
  - Team codes (`tms_code`) are now deterministic: `T00` for IT_CUTOVER, then `T01`, `T02`, ...
  - Updated all examples and documentation to reflect these conventions.

## Extending
- Add new entity generators or importers as your data model evolves.
- Update mapping files as needed for new fields.
