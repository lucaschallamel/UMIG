# ADR-014: Database Naming Conventions

**Status:** Draft (pending review)
**Date:** 2025-06-23
**Context:**
The UMIG project previously used inconsistent table and column naming conventions, with legacy names such as `teams`, `team_members`, and `implementation_plans`. This created confusion and increased the risk of errors during schema evolution and integration.

## Decision

- All core tables now use a suffix for clarity and uniqueness:
    - `teams_tms` (was `teams`)
    - `users_usr` (was `team_members`/`team_members_usr`)
    - `migrations_mig` (was `implementation_plans`/`implementation_plans_ipl`)
- Foreign key columns use the format `<ref>_id` (e.g., `tms_id`, `usr_id`, `mig_id`).
- Join tables and constraints follow the same convention.
- All changelogs, constraints, and documentation have been updated to match.

## Consequences

- Improved clarity and maintainability for all developers and contributors.
- Reduced risk of naming collisions and migration errors.
- A full database reset is required after this refactor.

## See Also
- `/docs/dataModel/README.md`
- `/CHANGELOG.md`
- `/README.md`

---
*Please review and approve this ADR, or suggest edits as needed.*
