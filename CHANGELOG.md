### [Unreleased]
#### Changed
- Updated the `controls_ctl` table to match the original SQL Server specification: added producer, IT/biz validator and comments fields, removed description/type/status.
- Removed the `env_type` field from the `environments_env` table as it is no longer needed.
- Added the `environments_iterations_eit` join table to associate environments and iterations, with optional role support.
- The `iterations_ite` table: removed the `ite_sequence` column and added a free `description` field.
- The `sequences_sqc` table now references `migrations_mig` via `mig_id` instead of `iterations_ite` via `ite_id`. Added `start_date` and `end_date` columns to support scheduling and tracking.
- Added a `comments` field to the `environments_applications_eap` table for storing additional notes or metadata about environment-application relationships.
- Modified the `users_usr` table to replace the single `usr_name` field with `usr_first_name`, `usr_last_name`, and `usr_trigram` to allow for more granular user data management. Updated all relevant schema files and documentation.
#### Fixed
- Corrected the baseline Liquibase schema (`001_baseline_schema.sql`) to be a complete 1:1 representation of the original SQL Server data model.
- Added previously missing tables (`ITERATIONS_TRACKING_ITT`) and columns (`tms_email` in `TEAMS_TMS`) to ensure full synchronization.
- Verified all 19 tables and their fields are now correctly defined as per the source model.

#### Changed
- Refactored database schema to enforce new table and column naming conventions:
    - `teams` → `teams_tms`
    - `team_members`/`team_members_usr` → `users_usr`
    - `implementation_plans`/`implementation_plans_ipl` → `migrations_mig`
- Updated all foreign key constraints, join tables, and references accordingly.
- Removed legacy table definitions and references from all changelogs.
