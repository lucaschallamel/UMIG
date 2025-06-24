# UMIG Project

## Database Schema (as of June 24, 2025)

### Core Tables
- `teams_tms`: Stores team records.
- `users_usr`: Stores user records. Each user may belong to a team (`tms_id`).
- `migrations_mig`: Stores implementation plan (migration) records.
- `iterations_ite`: Stores iteration records for migrations.
- `iterations_tracking_itt`: Tracks execution and status of steps per iteration.

### Canonical Implementation Plan Model (New)
A new canonical implementation plan model has been implemented (see ADR-015) with the following tables:
- `implementation_plans_canonical_ipc`: Canonical implementation plan templates
- `sequences_master_sqm`: Canonical sequences/phases
- `chapters_master_chm`: Canonical chapters
- `steps_master_stm`: Canonical steps
- `instructions_master_inm`: Canonical instructions
- `controls_master_ctl`: Canonical controls/validation checks

This model introduces a clear separation between reusable plan templates and their execution instances, enabling versioning, reuse, and robust plan-vs-actual analysis.

### Naming Conventions
- All tables use a suffix for clarity (e.g., `_tms`, `_usr`, `_mig`).
- Foreign key columns use the format `<ref>_id` (e.g., `tms_id`, `usr_id`, `mig_id`).
- Join tables and constraints follow the same convention.
- Canonical implementation plan tables use `_master_` naming pattern (e.g., `sequences_master_sqm`).

### Recent Schema Refactor
- Old tables (`teams`, `team_members`, `implementation_plans`) have been removed.
- All references and constraints now use the new table names and conventions.
- The monolithic data generation script has been refactored into modular, single-responsibility generator files.

### Data Utilities
The data generation system has been completely refactored into a modular structure with the following components:
- `01_generate_core_metadata.js`: Generates reference data
- `02_generate_teams_apps.js`: Generates teams and applications
- `03_generate_users.js`: Generates users with role-based assignment
- `04_generate_environments.js`: Generates environments
- `05_generate_legacy_plans.js`: Generates legacy implementation plans
- `06_generate_canonical_plans.js`: Generates canonical implementation plans

See `/docs/dataModel/README.md` for full schema details and rationale.
See `/local-dev-setup/data-utils/README.md` for details on the data utilities.
