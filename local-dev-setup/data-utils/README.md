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

- **Purpose:** Populate your local DEV database with fake teams, team members, and implementation plans for development/testing.
- **Environment Safety:** Refuses to run unless `--env dev` or `--env test` is specified. Will fail with a clear error if any required DB environment variable is missing.

### Usage

```sh
node umig_generate_fake_data.js --plans 2 --teams 10 --members-per-team 5 --env dev
```

- To reset (truncate) all relevant tables before generating new data (with confirmation):
  ```sh
  node umig_generate_fake_data.js --plans 2 --teams 10 --members-per-team 5 --env dev --reset
  ```
- All options are optional; defaults are provided for local dev.

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

### Test Types
- **Unit tests:** Validate core logic (e.g., mapping, validation, CLI parsing). No database or file system side effects.
- **Integration/CLI tests:** Simulate CLI usage and check for correct behavior, error handling, and environment safety.

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

## Extending
- Add new entity generators or importers as your data model evolves.
- Update mapping files as needed for new fields.
