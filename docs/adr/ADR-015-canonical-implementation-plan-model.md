# ADR-015: Canonical Implementation Plan Data Model

**Status:** Accepted  
**Date:** 2025-06-24

## Context

UMIG requires a robust, reusable, and auditable structure for defining implementation plans ("plans of record") that are decoupled from execution/tracking data. The current model mixes forecast, template, and instance data, making reuse, versioning, and plan-vs-actual analysis difficult.

## Decision

We will introduce a new canonical plan hierarchy, implemented as a set of normalized tables. These will serve as the authoritative templates for all implementation plans, supporting versioning, reuse, and separation of concerns.

### New Tables

- `implementation_plans_canonical_ipc` — Canonical implementation plan (template)
- `sequences_master_sqm` — Canonical sequences/phases
- `chapters_master_chm` — Canonical chapters
- `steps_master_stm` — Canonical steps
- `instructions_master_inm` — Canonical instructions
- `controls_master_ctl` — Canonical controls/validation checks

### Table Structure Overview

| Table Name                         | Key Fields & Relationships                                                                                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| implementation_plans_canonical_ipc | ipc_id (PK), name, description, version, status, author_id, created_at, updated_at                                                                         |
| sequences_master_sqm               | sqm_id (PK), ipc_id (FK), predecessor_sqm_id, name, description, duration (min)                                                                            |
| chapters_master_chm                | chm_id (PK), sqm_id (FK), predecessor_chm_id, name, description, duration (min)                                                                            |
| steps_master_stm                   | stm_id (PK), chm_id (FK), name, description, type, duration (min), team_id (FK), env_type (enum_list: PROD, TEST, BACKUP), predecessor_stm_id, step_prereq |
| instructions_master_inm            | inm_id (PK), stm_id (FK), instruction_order, title, body, format, duration (min), ctl_id (FK)                                                              |
| controls_master_ctl                | ctl_id (PK), code, name, critical (boolean), description, producer_team_id, it_validator_team_id, biz_validator_team_id                                    |

## Rationale

- **Separation of Concerns:** Cleanly separates canonical ("template") plan definitions from instance/execution data.
- **Reusability:** Enables reuse of plans, sequences, chapters, steps, and instructions across migrations/projects.
- **Auditability & Versioning:** Supports plan versioning and audit trails at the canonical plan level.
- **Plan vs. Actual:** Lays groundwork for robust plan-vs-actual analysis and reporting.

## Consequences

- Requires refactoring of existing planning and asset tables.
- Migration scripts and ERD/documentation must be updated.
- Execution/tracking tables will reference canonical tables for traceability.

## See Also

- `/docs/dataModel/README.md`
- `/CHANGELOG.md`
- `/docs/adr/ADR-012_standardized_database_management_and_documentation.md`
