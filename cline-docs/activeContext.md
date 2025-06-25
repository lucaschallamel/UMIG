# Active Context

## Current Focus

- The project is centred on stabilising the V2 REST API, refining the canonical data model, and ensuring all supporting tooling and documentation are robust and developer-friendly.
- Recent work has established a deterministic, business-aligned synthetic data generation pipeline, with a single canonical plan template and a fixed, predictable structure.
- The data model strictly separates canonical (master) entities from instance (execution) entities, supporting reusable templates and precise execution tracking.
- The backend architecture now follows a "Pure ScriptRunner Application" pattern, with auto-discovered REST endpoints and resource-based database connections.
- The local development environment has been enhanced for reliability and ease of use, including improved shell scripts and clear documentation.

## Recent Changes

- **API Refactoring & Stabilisation**:
  - Resolved critical runtime database errors by correcting the ScriptRunner resource pool name (`umig_db_pool`).
  - Refactored all repository classes to use a new, type-safe `withSql` pattern for database access, ensuring safe connection handling and eliminating static analysis warnings.
  - Added the `@ClosureParams` annotation and explicit type casting to harden static typing in Groovy scripts.
  - Created a new `src/README.md` to document backend coding conventions and database access patterns.
  - Downgraded the OpenAPI specification to 3.0.0 for compatibility with Swagger UI.
  - Updated ADR-010 and other documentation to reflect these changes.

- **Data Generation Pipeline**:
  - Implemented a single "master" canonical plan template with a predefined structure of five specific sequences (`PREMIG`, `CSD`, `W12`, `P&C`, `POSTMIG`).
  - For each iteration, exactly two instances are generated: one ACTIVE (with full hierarchy) and one DRAFT (lightweight).
  - Plan instances now include dynamic descriptions based on the master plan name and iteration type.
  - Refactored the data generator into modular components:
    - `01_generate_core_metadata.js`
    - `02_generate_teams_apps.js`
    - `03_generate_users.js`
    - `04_generate_environments.js`
    - `06_generate_canonical_plans.js`
    - `07_generate_instance_data.js`
  - Removed all legacy data model and generator components.

- **Data Model Refactoring**:
  - Elevated `controls_master_ctm` from step level to phase level, improving logical grouping and reusability.
  - Simplified `instructions_master_inm` by removing redundant fields and adding team ownership (`tms_id`) and direct control association (`ctm_id`).
  - Standardised table and column naming conventions; updated all foreign key constraints and relationships.

- **Database & Tooling Improvements**:
  - Consolidated all schema migrations into a single unified baseline file, made idempotent with proper `DROP TABLE` statements.
  - Established and documented Liquibase conventions for changesets, tags, and labels.
  - Improved local dev scripts: added `restart.sh` (with `--reset` and confirmation), simplified `stop.sh`, and clarified usage in documentation.
  - Custom Confluence image now includes the PostgreSQL JDBC driver; ScriptRunner is installed manually for stability.

- **Testing and Validation**:
  - Enhanced Jest tests for plan and instance generation, enforcing deterministic business rules.
  - Implemented comprehensive integration and unit tests for all data utilities.
  - Updated test fixtures and documentation to match the current data model.

- **Documentation Updates**:
  - Created detailed data model documentation with a complete Mermaid ERD.
  - Updated all relevant README files, ADRs, and developer journal entries.
  - Documented new backend patterns, database conventions, and migration strategies.

## Next Steps

- Finalise and push all documentation and code updates to the remote repositories (`main` and feature branches).
- Begin development of backend services and API endpoints to leverage the refined canonical plan structure.
- Develop frontend components for plan visualisation and user interaction.
- Continue refining data generation and backend logic based on testing and feedback.
- Prepare for the next major development phase, focusing on implementation plan execution and user-facing features.
