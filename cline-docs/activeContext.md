# Active Context

## Current Focus

- The project is in active development of the Implementation Plan macro backend and its supporting infrastructure.
- The local development environment is now robust, using Podman, Ansible, and Liquibase for automated, version-controlled database migrations.
- All "hello-world" and development scripts have been moved to the `src/` directory for clear separation of concerns.
- The Confluence reference version is now 8.5.6 across all documentation and setup scripts.

## Recent Changes

- Major architectural pivot: The project moved from a standalone NodeJS/React stack to a Confluence-integrated application, using vanilla JS for the frontend and ScriptRunner (Groovy) for the backend, as mandated by enterprise constraints.
- Local development setup stabilised: Memory allocation for Confluence increased to 6GB, and ScriptRunner installation is now manual via the Marketplace (ADR-007).
- Database connectivity: The project now uses ScriptRunner's built-in Database Connection resource for PostgreSQL, superseding the previous approach of bundling the JDBC driver (ADR-009).
- Liquibase adopted for all schema migrations, with initial tables for teams and team_members created and managed via versioned SQL scripts.
- Documentation and setup scripts have been clarified and centralised, with clear distinction between initial setup (Ansible) and daily workflows (`start.sh`/`stop.sh`).
- All ADRs are now consistently referenced and available in `docs/adr/`.

## Next Steps

- Continue backend feature development for the Implementation Plan macro, focusing on CRUD endpoints and integration with the new database connection pattern.
- Monitor and validate the stability of ScriptRunner's database connection in practice.
- Maintain up-to-date documentation and ensure all new features and changes are reflected in the memory bank and ADRs.
