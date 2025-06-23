# System Patterns

## Architecture

- The system is a Confluence-integrated application, with all business logic handled by Atlassian ScriptRunner (Groovy) and the frontend implemented as a custom Confluence macro using vanilla JavaScript, HTML, and CSS.
- The backend exposes REST endpoints via ScriptRunner, which interact with a dedicated PostgreSQL database.
- Real-time updates are achieved through AJAX polling from the frontend to the ScriptRunner backend (ADR-005).
- The local development environment is orchestrated using Podman Compose and Ansible, with automated database migrations managed by Liquibase.
- The database schema is a faithful translation of the original SQL Server model, maintaining all relationships and constraints while leveraging PostgreSQL-specific features.

## Key Technical Decisions

- ScriptRunner is installed manually via the Confluence UI Marketplace for stability (ADR-007).
- Database connectivity is managed through ScriptRunner's built-in Database Connection resource, not by bundling the JDBC driver (ADR-009).
- All database schema changes are version-controlled and applied automatically using Liquibase (ADR-008).
- Database management follows a standardised approach for schema definition, documentation and migration (ADR-012).
- The codebase is structured for separation of concerns: all development scripts and assets reside in the `src/` directory, with subfolders for `css`, `js`, and `groovy`.

## Component Relationships

- The Confluence macro frontend (vanilla JS) communicates with backend REST endpoints (Groovy/ScriptRunner) for all business logic and data operations.
- The backend interacts with PostgreSQL for persistent storage, using managed connections.
- The local environment ensures live-reload for both backend scripts and frontend assets via volume mounts.
- Database schema documentation is maintained in sync with the actual implementation using Mermaid ERD diagrams.

## Implementation Paths

- Initial setup is performed via Ansible, which builds the custom Confluence image and starts all services.
- Daily development uses `start.sh` and `stop.sh` scripts for environment lifecycle management.
- Developers must manually install ScriptRunner and configure the database connection in the Confluence UI on first setup.
- Database migrations are applied automatically via Liquibase during environment startup.

## Patterns and Practices

- All major technical decisions are captured in ADRs and referenced in documentation.
- The project enforces strict separation of concerns and clear documentation to manage the complexity of a vanilla JS frontend and Groovy backend.
- The system is designed for reproducibility, maintainability, and compliance with enterprise technology constraints.
- Documentation is kept meticulously in sync with implementation, particularly for database schema and API endpoints.
