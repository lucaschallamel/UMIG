# Tech Context

## Technologies Used

- **Host Platform:** Atlassian Confluence (version 8.5.6)
- **Frontend:** Custom Confluence Macro (HTML, CSS, Vanilla JavaScript ES6+)
- **Backend:** Atlassian ScriptRunner (Groovy) exposing REST APIs
- **Database:** PostgreSQL, managed via Liquibase for automated migrations
- **Containerisation:** Podman and Podman Compose
- **Configuration Management:** Ansible
- **Version Control:** Git

## Development Setup

- Local development is orchestrated with Podman Compose and Ansible, providing containers for Confluence, PostgreSQL, and MailHog.
- Database schema changes are managed and versioned with Liquibase, applied automatically on environment startup.
- The codebase is structured for separation of concerns, with all development scripts and assets in the `src/` directory (`css`, `js`, `groovy`).
- ScriptRunner is installed manually via the Confluence UI Marketplace for stability and compatibility.
- Database connectivity for ScriptRunner is managed via its built-in Database Connection resource, not by bundling the JDBC driver.

## Technical Constraints

- No modern JavaScript frameworks (React, Vue, Angular, etc.) are permitted; all frontend logic must use vanilla JS.
- Only Atlassian ScriptRunner (Groovy) or a containerised NodeJS application are allowed for backend logic, but ScriptRunner is preferred for deep Confluence integration.
- PostgreSQL is the only approved database; SQLite and other embedded databases are not permitted.
- All authentication must use the enterprise Active Directory; email notifications must use Exchange.
- All major technical decisions are documented in ADRs and referenced in the memory bank.

## Tool Usage Patterns

- Ansible is used for initial environment setup and rebuilding the custom Confluence image.
- Daily development is managed with `start.sh` and `stop.sh` scripts for starting and stopping all services and running migrations.
- Live-reload for backend and frontend code is enabled via volume mounts in the Confluence container.
- All environment variables and secrets are managed via `.env` files, never committed to version control.
