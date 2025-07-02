# ADR-022: Migration to Many-to-Many User-Team Relationship

* **Status:** Accepted
* **Date:** 2025-07-01
* **Deciders:** UMIG Architecture Team
* **Technical Story:** See GitHub issue #NNN (link to migration epic)

## Context and Problem Statement

Previously, the UMIG data model represented user-team membership as a one-to-many (1-N) relationship, with a `tms_id` foreign key in the `users_usr` table. This approach limited flexibility and did not accurately reflect real-world scenarios where users may need to belong to multiple teams (and vice versa). It also complicated auditability and future feature expansion.

## Decision Drivers

* Need for true many-to-many (N-N) relationships between users and teams
* Improved auditability and normalization
* Alignment with best practices and extensibility for future requirements
* Simpler enforcement of business rules via join tables
* Clearer data migration and rollback path

## Considered Options

* **Option 1: Retain 1-N model with `tms_id` in `users_usr`**
  * Pros: Simple, minimal schema change
  * Cons: Not flexible, does not support N-N, complicates future features and auditing

* **Option 2: Move to N-N model with join table (`teams_tms_x_users_usr`)**
  * Pros: Fully normalized, supports any user-team assignment, enables robust audit fields, aligns with industry standards, simplifies business logic
  * Cons: Requires migration, updates to data generation, and code refactoring

## Decision Outcome

Chosen option: **"Move to N-N model with join table"**, because it provides maximum flexibility, aligns with best practices, and future-proofs the data model for advanced team/user scenarios. The migration is justified by the need for robust auditability and extensibility.

### Positive Consequences

* Users can belong to multiple teams (if business rules change)
* All team membership is auditable via join table (`created_by`, `created_at` fields)
* Data generation and tests are now more robust and aligned with schema
* Enables future features (e.g., cross-team roles, analytics)

### Negative Consequences (if any)

* Requires a data migration and code/test refactor
* Slightly more complex queries for user/team lookups

## Validation

* All data generation and integration tests must pass
* Data migration script (`006_add_teams_users_join.sql`) executes cleanly and preserves all user-team assignments
* No orphaned users or teams after migration
* Code and documentation are fully aligned with new model

## Pros and Cons of the Options

### Retain 1-N model with `tms_id`
* Pros:
  * Simple
  * No migration required
* Cons:
  * Not flexible
  * Poor auditability
  * Not future-proof

### N-N model with join table
* Pros:
  * Fully normalized
  * Flexible and extensible
  * Robust audit trail
* Cons:
  * Requires migration and code changes

## Links
* [006_add_teams_users_join.sql](../../local-dev-setup/liquibase/changelogs/006_add_teams_users_join.sql)
* [User generation script](../../local-dev-setup/data-utils/generators/03_generate_users.js)
* [User generator test](../../local-dev-setup/data-utils/__tests__/generators/03_generate_users.test.js)
* [Data Model Documentation](../dataModel/README.md)

## Amendment History
* 2025-07-01: Initial adoption of N-N user-team relationship, migration, and supporting code/test changes.
