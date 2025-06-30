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

**Purpose:** Populates the local database with a comprehensive, hierarchical set of synthetic data. It generates migrations, canonical plans, users, teams, applications, and all supporting data required for development and testing.

**Key Features:**
- **Hierarchical Plans:** Creates a full structure of migrations, iterations, sequences, phases, and steps.
- **Rich Supporting Data:** Generates users with distinct roles (`NORMAL`, `ADMIN`, `PILOT`), teams, and applications.
- **Label Generation:** Creates migration-specific labels (e.g., "Stream 1") and associates them with canonical steps, enabling flexible, matrix-style reporting.
- **Comment Generation:** Populates pilot comments on canonical steps and user comments on instance steps to simulate real-world collaboration.

**Environment Safety:** The script includes critical safety checks:
- It will fail with a clear error if any required database connection variables from `.env` are missing.

### Usage

- **Generate data (with full reset):**
  ```sh
  node umig_generate_fake_data.js --reset
  ```
- **Run a single generator script:**
  ```sh
  node umig_generate_fake_data.js --script 08
  ```

### Configuration

The generation process is controlled by the `CONFIG` object at the top of `umig_generate_fake_data.js`. This centralizes all parameters for easy management.

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `MIGRATIONS.COUNT` | Number | The total number of migrations to create. |
| `MIGRATIONS.TYPE` | String | The type for all generated migrations (e.g., "EXTERNAL"). |
| `MIGRATIONS.START_DATE_RANGE`| Array | Date range `[start, end]` for migration start dates. |
| `MIGRATIONS.DURATION_MONTHS`| Number | Duration in months for each migration. |
| `MIGRATIONS.ITERATIONS` | Object | Defines the min/max number of `RUN`, `DR`, and `CUTOVER` iterations per migration. |
| `TEAMS.COUNT` | Number | The number of teams to generate. |
| `TEAMS.EMAIL_DOMAIN` | String | The email domain for all generated users. |
| `APPLICATIONS.COUNT` | Number | The number of applications to generate. |
| `USERS.NORMAL.COUNT` | Number | The number of users with the `NORMAL` role. |
| `USERS.ADMIN.COUNT` | Number | The number of users with the `ADMIN` role. |
| `USERS.PILOT.COUNT` | Number | The number of users with the `PILOT` role. |
| `CONTROLS.COUNT` | Number | The number of controls to generate. |
| `CANONICAL_PLANS.PER_MIGRATION`| Number | The number of canonical plans to generate for each migration. |
| `LABELS.PER_MIGRATION` | Object | Defines the min/max number of labels to generate per migration. |

### Data Generation Logic and Conventions

The script follows specific rules and principles to ensure data integrity, predictability, and safety.

#### Core Principles

- **Data Model Integrity:** The database schema is considered stable and must not be altered. All scripts and tests must conform to the existing data model. Tests adapt to the model, not the other way around.
- **Targeted Data Reset:** All data generation scripts must support a `--reset` flag. When used, this option selectively truncates **only** the tables the script is responsible for populating. System-critical tables (e.g., `databasechangelog`, `databasechangeloglock`) are explicitly protected. Core reference tables (e.g., `roles_rls`, `step_types_stt`) are populated idempotently by the `01_generate_core_metadata.js` script and are therefore not affected by the `--reset` flag.

- **Step Type Reference Data (`step_type_stt`):**
  - The script always prepopulates `step_type_stt` with a fixed set of step types, each with a code, name, description, and a hexadecimal color code (`type_color`).
  - Color codes are stored in the `type_color` field (`VARCHAR(7)`, e.g., `#1ba1e2`).
  - The current reference set is:

    | stt_code | stt_name      | stt_description                 | type_color |
    |----------|---------------|----------------------------------|------------|
    | TRT      | TREATMENTS    | Treatments steps                 | #1ba1e2    |
    | PRE      | PREPARATION   | Preparation steps                | #008a00    |
    | IGO      | IT GO         | IT Validation steps              | #7030a0    |
    | CHK      | CHECK         | Controls and check activities    | #ffff00    |
    | BUS      | BUS           | Bus related steps                | #ff00ff    |
    | SYS      | SYSTEM        | System related activities        | #000000    |
    | GON      | GO/NOGO       | Go/No Go steps                   | #ff0000    |
    | BGO      | BUSINESS GO   | Business Validation steps        | #ffc000    |
    | DUM      | DUMPS         | Database related activities      | #948a54    |

  - The script uses `ON CONFLICT (stt_code) DO NOTHING` to ensure idempotency: running the script multiple times will never create duplicates or errors.

- **Canonical Plan and Instance Generation:**
  - The script generates **one master canonical plan** to serve as a reusable template.
  - This plan is built with a predefined, ordered set of five sequences: `PREMIG`, `CSD`, `W12`, `P&C`, and `POSTMIG`.
  - For each iteration, the script creates exactly **two plan instances** from this master template:
    - An **`ACTIVE`** instance, which includes the full hierarchy of sequences, phases, steps, and audit logs.
    - A **`DRAFT`** instance, which is created without the full hierarchy to save space and reflect a realistic workflow.

- **Users, Teams, and Roles:**
  - A special **`IT_CUTOVER`** team is always created first (`tms_code` = `T00`).
  - `ADMIN` and `PILOT` users are assigned exclusively to the `IT_CUTOVER` team.
  - `NORMAL` users are distributed across the other generated teams.

- **Applications and Environments:**
  - A fixed list of environments (`PROD`, `EV1`, etc.) is created.
  - A specified number of applications are generated and randomly linked to teams via the `teams_applications_tap` table.



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

**Important:** The integration tests now expect data to be already generated. Always run the data generation script before running tests:

```sh
node umig_generate_fake_data.js --env dev --reset
npm test
```

- To run all tests (after data generation):
  ```sh
  npm test
  ```
- To run a specific test file:
  ```sh
  npx jest __tests__/umig_csv_importer.unit.test.js
  ```
- Tests are run in verbose mode, so all conditions tested and passed will be clearly listed in the output.

### Test Strategies and Types

The project employs two primary testing strategies tailored to the different utilities:

1. **Mock-Based Testing for Data Generators:**
    - The data generator scripts (e.g., `04_generate_environments.js`) are tested using **in-memory mocks** (via Jest). This approach isolates the script's logic from the database, allowing for fast, predictable unit tests that verify functions, query construction, and error handling without needing a live database connection or pre-existing data.

2. **Fixture-Based Testing for the CSV Importer:**
    - The `umig_csv_importer.js` utility is tested using **static fixture files** located in `__tests__/fixtures/`. This is because testing a file importer requires reading and parsing actual files to validate its core functionality. These tests ensure the importer can handle real-world CSV structures and mappings correctly.

#### Test Types
- **Unit tests:** Validate core logic (e.g., data transformations, validation, CLI parsing). Most unit tests use mocks and have no database or file system side effects.
- **Integration/CLI tests:** Simulate full CLI execution to check for correct behavior, error handling, and database interaction. These tests require a live database populated with generated data.

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

- **2025-06-25:**
  - **Refined Plan Generation Logic:** Refactored the data generator to create a single master canonical plan and two instances (`ACTIVE` and `DRAFT`) per iteration.
  - **Standardized Plan Structure:** The canonical plan is now built using a predefined, ordered list of five specific sequences (`PREMIG`, `CSD`, etc.) instead of random ones.
  - **Enriched Instance Data:** Plan instances now include a dynamic `pli_description` based on the master plan name and iteration type.

- **2025-06-25:**
  - Removed the legacy data generator (`05_generate_legacy_plans.js`) as part of the complete removal of the legacy data model. The data generation process now exclusively uses the canonical and instance models.

- **2025-06-24:**
  - Refactored `status_sts` table: renamed `sts_code` to `entity_type`, widened columns, and prepopulated with entity-specific statuses via migration `011_refactor_status_sts.sql`.
  - Added unique constraint to `stt_code` in `step_type_stt` (baseline schema).
  - Added `type_color` column (hex color code, VARCHAR(7)) to `step_type_stt` via migration `012_add_type_color_to_step_type_stt.sql`.
  - Updated data generation script to prepopulate `step_type_stt` with codes, names, descriptions, and color codes; uses idempotent insert logic.
  - Improved `resetDatabase()` to protect reference and migration tracking tables from truncation.
  - All integration and unit tests pass, confirming robust reference data and safe resets.
  - Documentation updated to reflect schema and data generation changes, including new color code support for step types.

- **2025-06-23:**
  - `env_code` now always matches `env_name` for environments.
  - Team names are now abstract (`TEAM_X`), not person/company names.
  - Team codes (`tms_code`) are now deterministic: `T00` for IT_CUTOVER, then `T01`, `T02`, ...
  - Updated all examples and documentation to reflect these conventions.

## Extending
- Add new entity generators or importers as your data model evolves.
- Update mapping files as needed for new fields.
