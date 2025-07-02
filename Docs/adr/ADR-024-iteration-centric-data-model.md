# ADR 024: Iteration-Centric Data Model for Migrations and Plans

**Date:** 2025-07-02

**Status:** Accepted

## Context

The previous data model created a direct, mandatory foreign key relationship from a migration (`migrations_mig`) to a master plan (`plans_master_plm`). This architecture was too rigid, as it implied that a single migration event was tied to only one master plan for its entire lifecycle. In practice, a migration event might require different plans for different phases, such as a Dress Rehearsal (DR) test versus the final cutover run. This led to inflexibility and did not accurately represent the business process.

Furthermore, this rigid dependency caused recurring errors in the Liquibase schema setup, as the table creation order often violated foreign key constraints.

## Decision

We have adopted a more flexible, iteration-centric data model, referred to as "Model C". The key changes are:

1.  **Decouple Migrations from Plans:** The direct foreign key (`plm_id`) from `migrations_mig` to `plans_master_plm` has been removed. A migration is now a container for a high-level event, independent of any single plan.

2.  **Link Iterations to Plans:** The `iterations_ite` table is now the central link. It contains foreign keys to both `migrations_mig` (`mig_id`) and `plans_master_plm` (`plm_id`).

This new structure makes the iteration the entity that connects a specific migration run to a specific master plan. A single migration can now have multiple iterations, each linked to a different master plan, providing maximum flexibility.

## Consequences

**Positive:**

-   **Flexibility:** The model now accurately supports complex migration scenarios where different plans are used for different iterations (e.g., DR vs. Production).
-   **Schema Stability:** Decoupling the tables resolved the circular dependency issues in the Liquibase changelog, leading to stable and error-free schema migrations.
-   **Clarity:** The relationships between migrations, iterations, and plans are now more logical and better reflect the real-world process.

**Negative:**

-   **Query Complexity:** Retrieving the plan for a migration now requires joining through the `iterations_ite` table. This is a minor, acceptable trade-off for the added flexibility.
