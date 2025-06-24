### [Unreleased]
#### Added
- Enhanced `umig_generate_fake_data.js` to support configurable generation of NORMAL, ADMIN, and PILOT users, with unique trigrams and correct team assignment logic (all ADMIN and PILOT users assigned to IT_CUTOVER; every team receives at least one NORMAL user).
- Added/updated Jest integration tests to verify: every team has at least one member, every user belongs to exactly one team, every application is assigned to exactly one team, and all ADMIN/PILOT users are in IT_CUTOVER.
- Updated `fake_data_config.json` to allow configuration of user/role counts.
- **2025-06-24:**
    - Refactored `status_sts` table: renamed `sts_code` to `entity_type`, widened columns, prepopulated with entity-specific statuses via migration `011_refactor_status_sts.sql`.
    - Added unique constraint to `stt_code` in `step_type_stt` (baseline schema).
    - Added `type_color` column (hex color code, VARCHAR(7)) to `step_type_stt` via migration `012_add_type_color_to_step_type_stt.sql`.
    - Updated data generation script to prepopulate `step_type_stt` with codes, names, descriptions, and color codes; uses idempotent insert logic.
    - Improved `resetDatabase()` to protect reference and migration tracking tables from truncation.
    - All integration and unit tests pass, confirming robust reference data and safe resets.
    - Documentation and subfolder READMEs updated to reflect schema and data generation changes.

#### Changed
- Refactored `steps_stp` to use a foreign key to the re-introduced `status_sts` table, removing the hardcoded `status` column and normalizing the schema.
- Removed obsolete `usr_code` from `users_usr` in schema and documentation.
- Updated `/local-dev-setup/data-utils/README.md` to document new conventions, configuration, and tests.
- Updated the `controls_ctl` table to match the original SQL Server specification: added producer, IT/biz validator and comments fields, removed description/type/status.
- Removed the `env_type` field from the `environments_env` table as it is no longer needed.
- Added the `environments_iterations_eit` join table to associate environments and iterations, with optional role support.
- The `iterations_ite` table: removed the `ite_sequence` column and added a free `description` field.
- The `sequences_sqc` table now references `migrations_mig` via `mig_id` instead of `iterations_ite` via `ite_id`. Added `start_date` and `end_date` columns to support scheduling and tracking.
- Added a `comments` field to the `environments_applications_eap` table for storing additional notes or metadata about environment-application relationships.
- Modified the `users_usr` table to replace the single `usr_name` field with `usr_first_name`, `usr_last_name`, and `usr_trigram` to allow for more granular user data management. Updated all relevant schema files and documentation.
- Refactored database schema to enforce new table and column naming conventions:
    - `teams` → `teams_tms`
    - `team_members`/`team_members_usr` → `users_usr`
    - `implementation_plans`/`implementation_plans_ipl` → `migrations_mig`
- Updated all foreign key constraints, join tables, and references accordingly.
- Removed legacy table definitions and references from all changelogs.

#### Fixed
- Corrected the baseline Liquibase schema (`001_baseline_schema.sql`) to be a complete 1:1 representation of the original SQL Server data model.
- Added previously missing tables (`ITERATIONS_TRACKING_ITT`) and columns (`tms_email` in `TEAMS_TMS`) to ensure full synchronization.
- Verified all 19 tables and their fields are now correctly defined as per the source model.
- Fixed a bug in the data generation script (`umig_generate_fake_data.js`) where the `generateSequences` function was incorrectly trying to insert an `ite_id` instead of a `mig_id` into the `sequences_sqc` table.
