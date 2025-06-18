# Changelog

## [Unreleased] - 2025-06-18
### Changed
- Investigated and attempted to resolve PostgreSQL JDBC driver issues (`org.postgresql.Driver not found`) for ScriptRunner in the local development environment. This involved multiple attempts to bundle the driver in the custom Confluence Docker image (`local-dev-setup/confluence/Containerfile`).
- Pivoted strategy towards utilizing ScriptRunner's built-in "Database Connection" resource feature as the primary method for database connectivity. This change is pending full implementation and testing.
- ADR-009 (Containerize JDBC Driver) will be updated to reflect this pivot.
- **Local Development Documentation & Setup:**
  - Clarified and centralized Liquibase CLI installation instructions in `local-dev-setup/README.md`.
  - Updated `local-dev-setup/README.md` to consistently prioritize manual ScriptRunner installation via the in-app Marketplace (aligning with ADR-007).
  - Removed the ScriptRunner JAR check from `local-dev-setup/setup.yml` (Ansible playbook).
  - Clarified the distinct roles of `local-dev-setup/start.sh` & `stop.sh` (for daily start/stop including migrations) versus `ansible-playbook setup.yml` (for initial setup and Confluence image rebuilds) in `local-dev-setup/README.md`.
  - Removed explicit PostgreSQL JDBC driver copying from `local-dev-setup/confluence/Containerfile` as ScriptRunner's native database connection is now used (follow-up to superseded ADR-009).
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Automated Database Migrations**:
  - Integrated Liquibase to manage database schema changes automatically on startup.
  - Added `start.sh` and `stop.sh` scripts for simplified environment lifecycle management.
  - Included initial Liquibase changelog for `teams` and `team_members` tables.
  - Added `ADR-008` to document the database migration strategy.

### Changed
- **Groovy REST Endpoints**: Refactored error handling in the `ImplementationPlanManager` script. All CRUD endpoints now have more robust exception handling, provide clearer log messages with full stack traces, and return more consistent JSON error responses to the client.
- **Local Development Environment**: Refactored `postgres/init-db.sh` to only handle database and user creation, making Liquibase the single source of truth for schema.
- The recommended method for installing ScriptRunner is now a manual installation via the Confluence UI Marketplace. This is more reliable than the previous automated `COPY` method.
- The `Containerfile` has been simplified to remove the automated plugin installation step.
- The `README.md` has been significantly updated with detailed instructions for the new local development setup, manual plugin installation, and a full validation workflow for both backend and frontend development.

### Fixed
- **Database Connectivity**: Resolved a `java.sql.SQLException: org.postgresql.Driver not found` error by building a custom Confluence image that includes the PostgreSQL JDBC driver. This allows ScriptRunner scripts to connect to the database in the local development environment. See `ADR-009` for details.
- Resolved critical container instability by increasing the default memory allocation for the Confluence container from 2GB to 6GB, preventing Out Of Memory (OOM) crashes during startup and plugin installation.

## [0.1.0] - 2025-06-16
### Added
- **Local Development Environment (`local-dev-setup`):**
  - Initial setup using Ansible and Podman.
  - Custom Confluence image (`Containerfile`) to pre-install ScriptRunner.
  - `podman-compose.yml` to orchestrate Confluence, PostgreSQL, and MailHog services.
  - Ansible playbook (`setup.yml`) to automate environment validation and startup.
  - Configuration for a separate UMIG application database via a PostgreSQL `init-db.sh` script.
  - `src` directory mounted into the Confluence container for live development of Groovy and frontend assets.

### Fixed
- **ScriptRunner Installation:**
  - Corrected the `Containerfile` to copy the ScriptRunner plugin to the valid `/var/atlassian/application-data/confluence/plugins/installed-plugins` directory.
  - Changed the `COPY` instruction to use an explicit filename instead of a wildcard to prevent issues in cross-platform build environments (ARM64).
  - Added `--no-cache` flag to the Ansible build command to force a clean rebuild of the Confluence image, bypassing corrupted cache layers.
