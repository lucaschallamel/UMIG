# ADR-029: Full Attribute Instantiation for Instance Tables

**Status:** Proposed  
**Date:** 2025-07-04

## Context

Historically, the UMIG data model separated master (template) and instance tables for core workflow entities: sequences, phases, steps, instructions, and controls. Instance tables referenced only a subset of fields, inheriting most attributes from their master records. This limited flexibility for pilots and made it difficult to track overrides, learnings, and runtime changes across iterations.

## Decision

**We will replicate all (or nearly all) relevant master table attributes into their corresponding instance tables.**

- Each instance table (e.g., `sequences_instance_sqi`, `phases_instance_phi`, etc.) will have its own copy of all fields that may need to be overridden or adjusted at runtime.
- This includes names, descriptions, ordering, relationships, durations, types, and other business attributes.
- The schema is updated via Liquibase migration `010_replicate_seq_master_fields_in_instance.sql`.

## Rationale

- **Runtime Flexibility:** Pilots and users can override any attribute of sequences, phases, steps, instructions, or controls for a given iteration, without affecting the master template.
- **Auditability & Change Tracking:** All changes and overrides are stored per iteration, enabling full traceability of what was changed, when, and by whom.
- **Learning & Evolution:** Over time, admins/content managers can review changes made in real-world iterations and promote valuable instance-level modifications back into master records, supporting continuous improvement.
- **Future-proofing:** This approach supports advanced features such as instance-to-master promotion, granular rollback, and richer analytics on process evolution.

## Consequences

- **Schema Growth:** Instance tables will be larger and more redundant, but this is acceptable for the benefits of flexibility and auditability.
- **Migration Complexity:** Care must be taken to keep master and instance schemas aligned for all relevant fields.
- **Application Logic:** The application must ensure that instance overrides are respected at runtime, and that new instances are initialized with master values by default.
- **Documentation:** The ERD, data model docs, and data generation scripts must be kept in sync with these changes.

## Alternatives Considered

- **Minimal Instance Schema:** Only reference master records, with overrides stored in a sparse/patch table. This was rejected due to complexity and lack of transparency.
- **Partial Replication:** Only replicate the most commonly overridden fields. This was rejected as it would require frequent migrations and be hard to predict.

## References

- `/local-dev-setup/liquibase/changelogs/010_replicate_seq_master_fields_in_instance.sql`
- [Data Model Refinement Workflow](/data-model)
- [Project Guidelines](/.clinerules/rules/01-ProjectGuidelines.md)

---

_This ADR documents a foundational shift in our approach to workflow entity modeling, prioritizing flexibility, auditability, and continuous learning._
