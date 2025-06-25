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

## Technical Constraints

- No modern JavaScript frameworks (React, Vue, Angular, etc.) are permitted; all frontend logic must use vanilla JS.
- Only Atlassian ScriptRunner (Groovy) or a containerised NodeJS application are allowed for backend logic, but ScriptRunner is preferred for deep Confluence integration.
- PostgreSQL is the only approved database; SQLite and other embedded databases are not permitted.
- All authentication must use the enterprise Active Directory; email notifications must use Exchange.
- All major technical decisions are documented in ADRs and referenced in the memory bank.

## Tool Usage Patterns

- Ansible is used for initial environment setup and rebuilding the custom Confluence image.
- Daily development is managed with `start.sh`, `stop.sh`, and `restart.sh` scripts for starting, stopping, and resetting all services and running migrations.
- Live-reload for backend and frontend code is supported via volume mounts.
- ScriptRunner database connectivity is validated by running a simple `SELECT 1` in the ScriptRunner console.
- Data generation is fully modular, with single-responsibility generator files:
  - `01_generate_core_metadata.js`
  - `02_generate_teams_apps.js`
  - `03_generate_users.js`
  - `04_generate_environments.js`
  - `06_generate_canonical_plans.js`
  - `07_generate_instance_data.js`
- The main `umig_generate_fake_data.js` script orchestrates these modular components.
- Only the canonical implementation plan structure is supported; all legacy generators and models have been removed.
- Reference tables (`status_sts`, `step_type_stt`) and Liquibase migration tracking tables are protected during database resets.
- Step types are prepopulated with codes, names, descriptions, and colour codes using idempotent insert logic.
- CSV importing is supported via `umig_csv_importer.js` with flexible field mapping between CSV headers and database columns.
- Enhanced synthetic data generation supports role-based user creation (NORMAL, ADMIN, PILOT) with intelligent team assignment logic.
- Jest is used for testing Node.js utilities, with deterministic fixtures ensuring reproducible test results.
- All Node.js utilities enforce strict environment safety, refusing to run in production environments and requiring confirmation for destructive operations.
- Integration tests verify data integrity rules, including team membership guarantees and role-based assignments.
