# UMIG Project

## Database Schema (as of June 23, 2025)

### Core Tables
- `teams_tms`: Stores team records.
- `users_usr`: Stores user records. Each user may belong to a team (`tms_id`).
- `migrations_mig`: Stores implementation plan (migration) records.
- `iteration_plan_itp`: Stores iteration plan structure (chapters, steps, timings).
- `iterations_tracking_itt`: Tracks execution and status of steps per iteration.

### Naming Conventions
- All tables use a suffix for clarity (e.g., `_tms`, `_usr`, `_mig`).
- Foreign key columns use the format `<ref>_id` (e.g., `tms_id`, `usr_id`, `mig_id`).
- Join tables and constraints follow the same convention.

### Recent Schema Refactor
- Old tables (`teams`, `team_members`, `implementation_plans`) have been removed.
- All references and constraints now use the new table names and conventions.

See `/docs/dataModel/README.md` for full schema details and rationale.
