# Progress

## 2025-07-01

### Key Developments

- **User-Team Relationship Migration:**
  - Migrated from a deprecated one-to-many (`tms_id` in `users_usr`) to a fully normalised, auditable many-to-many join table (`teams_tms_x_users_usr`).
  - Created and applied migration script `006_add_teams_users_join.sql` to update schema, migrate data, and drop the old foreign key.
  - Refactored data generation (`03_generate_users.js`) and tests to use the join table, enforcing the business rule that each user belongs to exactly one team.
  - All `ADMIN` and `PILOT` users are now assigned to the `IT_CUTOVER` team.
  - Updated all relevant documentation, including the root `README.md`, `Docs/dataModel/README.md`, and ADR-022, to reflect the new model and business rules.
  - All unit and integration tests updated and passing.

### Current Status

- The UMIG project now uses a robust, future-proof N-N user-team relationship, with all code, tests, and documentation in sync.
- The business rule of exactly one team per user is enforced at the data generation level, but the schema supports future flexibility.
- All documentation (CHANGELOG, READMEs, ADR-022) is up to date and references the migration and rationale.

### Next Steps

- Monitor for any downstream effects in backend APIs or scripts that may have assumed a direct FK.
- Continue to run all tests regularly to ensure stability.
- If business rules change, update the generator and tests to allow true N-N assignments.
- Begin any necessary backend and API refactoring to consume the new join table logic.
- Encourage team review of ADR-022 and documentation for further feedback or improvement.

## 2025-06-30

### Key Developments

- **Confluence HTML Importer Utility (In Progress):**
  - Initiated a new cross-platform utility for importing and extracting structured data from Confluence-exported HTML files.
  - Located in `local-dev-setup/data-utils/Confluence_Importer`, supporting both Bash and PowerShell.
  - Documentation updated in the root README and within the utility's folder.
  - The tool is a work in progress; further field extraction, error handling, and automated tests are planned.
  - No core application logic was changed during this session.

- **Flexible Labelling System for Canonical Steps:**
  - Introduced `labels_lbl` and `labels_lbl_x_steps_master_stm` tables to enable grouping steps into logical categories or "streams" within a migration.
  - Added Liquibase changelog `004_add_labels_and_step_label_join.sql`.
  - Updated `sequences_master_sqm` with a `mig_id` foreign key for improved data integrity.

- **Database and Data Generation Enhancements:**
  - Added tables for step pilot comments (`step_pilot_comments_spc`) and step instance comments (`step_instance_comments_sic`).
  - Liquibase migrations `002_add_step_pilot_comments.sql` and `003_add_step_instance_comments.sql` introduced.
  - Data generators now populate these tables with realistic synthetic comments.
  - Improved audit fields and data realism in all generators.
  - New Jest integration test for step instance comments.

- **Test Suite Refactoring and Stabilisation:**
  - Refactored the data generator test suite, converting slow integration tests to fast, isolated unit tests using dependency injection and full mocking.
  - Fixed a critical memory leak in a test mock and removed a redundant integration test.
  - Updated all generator scripts and the main orchestrator to support the new testing pattern.

- **Local Development Environment Improvements:**
  - The `stop.sh` script now automatically removes PostgreSQL and Confluence data volumes to ensure a clean start.

- **Governance and Pattern Enforcement:**
  - Project governance and coding standards further formalised and documented.
  - SPA + REST pattern (ADR020) enforced for all admin UIs.
  - All documentation, including ADRs and READMEs, synchronised with the latest standards.

### Current Status

- The Confluence HTML importer utility is available for collaborative development, with clear guidance for further contributions.
- All documentation is up to date and consistent with project rules.
- The project continues to prioritise maintainability, testability, and clear governance.

### Next Steps

- Integrate automated tests and sample fixtures for the importer utility.
- Enhance error handling and extensibility in the importer scripts.
- Continue applying the SPA + REST pattern to all admin UIs.
- Expand integration test coverage for all endpoints and entities.
- Maintain documentation discipline and promote team adoption of new standards.
