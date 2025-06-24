# Tech Context

## Technologies Used

- **Host Platform:** Atlassian Confluence (version 8.5.6)
- **Frontend:** Custom Confluence Macro (HTML, CSS, Vanilla JavaScript ES6+)
- **Backend:** Atlassian ScriptRunner (Groovy) exposing REST APIs
- **Database:** PostgreSQL, managed via Liquibase for automated migrations
- **Containerisation:** Podman and Podman Compose
- **Configuration Management:** Ansible
- **Version Control:** Git
- **Testing Framework:** Jest for Node.js utilities
- **Development Utilities:** Node.js for data generation and CSV importing

## Development Setup

- Local development is orchestrated with Podman Compose and Ansible, providing containers for Confluence, PostgreSQL, and MailHog.
- Database schema changes are managed and versioned with Liquibase, applied automatically on environment startup.
- The codebase is structured for separation of concerns, with all development scripts and assets in the `src/` directory (`css`, `js`, `groovy`).
- ScriptRunner is installed manually via the Confluence UI Marketplace for stability and compatibility.
- Database connectivity for ScriptRunner is managed via its built-in Database Resource Pool feature, eliminating the need for manual JDBC driver management or custom image modifications.
- The PostgreSQL JDBC driver is automatically handled by ScriptRunner for pooled resources.
- REST endpoints are discovered automatically using ScriptRunner's package scanning feature via Java system properties set in `podman-compose.yml`.
- Ping tests using `SELECT 1` via the ScriptRunner console are used to validate connectivity.
- Podman named volumes are used for PostgreSQL data persistence, with proper volume management required during environment restarts.

## Technical Constraints

- No modern JavaScript frameworks (React, Vue, Angular, etc.) are permitted; all frontend logic must use vanilla JS.
- Only Atlassian ScriptRunner (Groovy) or a containerised NodeJS application are allowed for backend logic, but ScriptRunner is preferred for deep Confluence integration.
- PostgreSQL is the only approved database; SQLite and other embedded databases are not permitted.
- All authentication must use the enterprise Active Directory; email notifications must use Exchange.
- All major technical decisions are documented in ADRs and referenced in the memory bank.

## Tool Usage Patterns

- Ansible is used for initial environment setup and rebuilding the custom Confluence image.
- Daily development is managed with `start.sh` and `stop.sh` scripts for starting and stopping all services and running migrations.
- Live-reload for backend and frontend code is supported via volume mounts.
- ScriptRunner database connectivity is validated by running a simple `SELECT 1` in the ScriptRunner console.
- Data generation has been completely refactored from a monolithic script into a modular system with single-responsibility generator files:
  - `01_generate_core_metadata.js`
  - `02_generate_teams_apps.js`
  - `03_generate_users.js`
  - `04_generate_environments.js`
  - `05_generate_legacy_plans.js`
  - `06_generate_canonical_plans.js`
- The main `umig_generate_fake_data.js` script now orchestrates these modular components, making the system far easier to manage and extend.
- Data generation now supports both legacy and canonical implementation plan structures, with dedicated generators for each.
- Reference tables (`status_sts`, `step_type_stt`) and Liquibase migration tracking tables are protected during database resets.
- Step types are prepopulated with codes, names, descriptions, and colour codes using idempotent insert logic.
- CSV importing is supported via `umig_csv_importer.js` with flexible field mapping between CSV headers and database columns.
- Enhanced synthetic data generation supports role-based user creation (NORMAL, ADMIN, PILOT) with intelligent team assignment logic.
- Jest is used for testing Node.js utilities, with deterministic fixtures ensuring reproducible test results.
- All Node.js utilities enforce strict environment safety, refusing to run in production environments and requiring confirmation for destructive operations.
- Integration tests verify data integrity rules, including team membership guarantees and role-based assignments.
