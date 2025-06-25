# Tech Context

## Technologies Used

- **Host Platform:** Atlassian Confluence (version 8.5.6)
- **Frontend:** Planned custom Confluence Macro (HTML, CSS, Vanilla JavaScript ES6+)
- **Backend:** Atlassian ScriptRunner (Groovy) exposing REST APIs, following the "Pure ScriptRunner Application" pattern
- **Database:** PostgreSQL, managed via Liquibase for automated migrations
- **Containerisation:** Podman and Podman Compose
- **Configuration Management:** Ansible
- **Version Control:** Git
- **Testing Framework:** Jest for Node.js utilities
- **Development Utilities:** Node.js for data generation and CSV importing
- **Package Management:** NPM for Node.js utilities

## Development Setup

- Local development is orchestrated with Podman Compose and Ansible, providing containers for Confluence, PostgreSQL, and MailHog.
- Database schema changes are managed and versioned with Liquibase, applied automatically on environment startup.
- The codebase is structured for separation of concerns: all backend code resides in `src/com/umig/` (API, repository, utility), frontend assets in `src/web/`.
- ScriptRunner is installed manually via the Confluence UI Marketplace for stability and compatibility.
- Database connectivity for ScriptRunner is managed via its built-in Database Resource Pool feature (`umig_db_pool`), with all backend access using the type-safe `withSql` pattern.
- The PostgreSQL JDBC driver is included in the custom Confluence image.
- REST endpoints are auto-discovered by ScriptRunner from the `src/com/umig/api/v2` directory.
- OpenAPI specification is maintained at version 3.0.0 for compatibility.
- Podman named volumes are used for PostgreSQL data persistence, with proper volume management required during environment restarts.
- Improved shell scripts (`start.sh`, `stop.sh`, `restart.sh` with `--reset`) manage the environment lifecycle.
- All backend coding conventions and database access patterns are documented in `src/README.md`.
- Node.js utilities are managed with NPM, with proper package.json and package-lock.json in the 'local-dev-setup/data-utils' directory.
- Jest is configured for testing Node.js utilities, with comprehensive test coverage for all generator components.

## Technical Constraints

- No modern JavaScript frameworks (React, Vue, Angular, etc.) are permitted; all frontend logic must use vanilla JS.
- Only Atlassian ScriptRunner (Groovy) or a containerised NodeJS application are allowed for backend logic, but ScriptRunner is preferred for deep Confluence integration.
- PostgreSQL is the only approved database; SQLite and other embedded databases are not permitted.
- All authentication must use the enterprise Active Directory; email notifications must use Exchange.
- All major technical decisions are documented in ADRs and referenced in the memory bank.
- Node.js utilities must be compatible with Node.js v18+ for long-term support.
- All database access from ScriptRunner must use the type-safe `withSql` pattern.
- All REST endpoints must follow the "Pure ScriptRunner Application" pattern.
- All database tables must follow the standardized naming conventions.

## Dependencies

### Backend Dependencies

- **ScriptRunner for Confluence:** Version 8.43.0
- **PostgreSQL JDBC Driver:** Version 42.7.7
- **Groovy:** Version bundled with ScriptRunner (2.5.x)

### Frontend Dependencies

- **Vanilla JavaScript:** ES6+
- **HTML/CSS:** Standard web technologies

### Development Dependencies

- **Node.js:** Version 18+ (LTS)
- **NPM:** Version 9+
- **Jest:** Version 29.7.0 (Testing framework)
- **Faker.js:** Version 8.4.1 (Synthetic data generation)
- **pg:** Version 8.16.2 (PostgreSQL client for Node.js)
- **commander:** Version 11.1.0 (Command-line interface)
- **dotenv:** Version 16.5.0 (Environment variable management)
- **csv-parser:** Version 3.0.0 (CSV parsing)
- **Podman:** Version 4.5+
- **Podman Compose:** Version 1.0.6+
- **Ansible:** Version 2.15+
- **Liquibase:** Version 4.23+

## Tool Usage Patterns

- **Ansible** is used for initial environment setup and rebuilding the custom Confluence image.
- **Daily development** is managed with `start.sh`, `stop.sh`, and `restart.sh` scripts for starting, stopping, and resetting all services and running migrations.
- **Live-reload** for backend and frontend code is supported via volume mounts.
- **ScriptRunner database connectivity** is validated by running a simple `SELECT 1` in the ScriptRunner console.
- **Data generation** is fully modular, with single-responsibility generator files:
  - `01_generate_core_metadata.js` - Prepopulates reference tables with idempotent inserts
  - `02_generate_teams_apps.js` - Creates teams and applications with deterministic codes
  - `03_generate_users.js` - Generates users with role-based team assignments
  - `04_generate_environments.js` - Creates environments with consistent naming
  - `05_generate_migrations.js` - Creates migration records with realistic dates
  - `06_generate_canonical_plans.js` - Builds master plan templates with fixed sequence structure
  - `07_generate_instance_data.js` - Creates plan instances (ACTIVE and DRAFT) for each iteration
- The main `umig_generate_fake_data.js` script orchestrates these modular components with a centralized configuration object.
- Only the **canonical implementation plan structure** is supported; all legacy generators and models have been removed.
- **Reference tables** (`status_sts`, `step_type_stt`) and Liquibase migration tracking tables are protected during database resets.
- **Step types** are prepopulated with codes, names, descriptions, and colour codes using idempotent insert logic.
- **CSV importing** is supported via `umig_csv_importer.js` with flexible field mapping between CSV headers and database columns.
- **Enhanced synthetic data generation** supports role-based user creation (NORMAL, ADMIN, PILOT) with intelligent team assignment logic.
- **Jest** is used for testing Node.js utilities, with deterministic fixtures ensuring reproducible test results.
- All **Node.js utilities** enforce strict environment safety, refusing to run in production environments and requiring confirmation for destructive operations.
- **Integration tests** verify data integrity rules, including team membership guarantees and role-based assignments.
- **NPM scripts** are configured for running tests and other common tasks.
- **Git** is configured to ignore Node.js artifacts, including node_modules, coverage reports, and npm debug logs.
- **Database access** from ScriptRunner follows the type-safe `withSql` pattern with explicit type casting.
- **REST endpoints** follow the "Pure ScriptRunner Application" pattern with proper error handling.
- **OpenAPI specification** is maintained at version 3.0.0 for compatibility.
