# ADR-016: Control and Instruction Model Refactoring

* **Status:** Accepted
* **Date:** 2025-06-25
* **Deciders:** Lucas Challamel, Cascade
* **Technical Story:** N/A

## Context and Problem Statement

The initial data model linked master controls (`controls_master_ctm`) directly to master steps (`steps_master_stm`). This created a rigid, tightly-coupled relationship that limited the reusability of controls. A single control (e.g., "Verify network connectivity") could not be easily applied to an entire phase of work without being redundantly linked to multiple steps. Additionally, the `instructions_master_inm` table contained redundant fields (`inm_title`, `inm_format`) and a complex, self-referencing predecessor relationship that was unnecessary given the explicit ordering provided by `inm_order`.

## Decision Drivers

* **Logical Cohesion:** Controls are conceptually "quality gates" for a phase of work, not for a single, granular step.
* **Reusability:** A single control definition should be reusable across multiple steps within a phase.
* **Simplicity:** The data model should be as simple as possible, removing redundant or unnecessary fields and relationships (as per ADR-014).
* **Clear Ownership:** Every instruction should have a clear, designated owner team.
* **Maintainability:** A cleaner, more logical schema is easier to understand, maintain, and extend.

## Considered Options

* **Option 1: Keep the existing model.**
  * Description: Leave controls linked to steps and retain the existing fields in the instruction table.
  * Pros: No changes required.
  * Cons: Retains the logical inconsistencies, limits reusability, and adds unnecessary complexity to the data model.

* **Option 2: Elevate Controls to Phases and Streamline Instructions.**
  * Description: Refactor the `controls_master_ctm` table to link to `phases_master_phm` via a `phm_id`. Refactor the `instructions_master_inm` table to remove redundant fields, eliminate the self-referencing predecessor, and add explicit team ownership (`tms_id`).
  * Pros: Creates a more logical and flexible data model, significantly improves control reusability, simplifies the instruction entity, and clarifies ownership.
  * Cons: Requires changes to the database schema and data generation scripts.

## Decision Outcome

Chosen option: **"Option 2: Elevate Controls to Phases and Streamline Instructions"**, because it creates a fundamentally more logical, reusable, and maintainable data model. It aligns with the project's core principle of simplicity and ensures that controls serve as effective, phase-level quality gates. The benefits of a cleaner and more flexible architecture far outweigh the one-time cost of refactoring the schema and data generators.

### Positive Consequences

* Controls are now logically scoped to an entire phase of work.
* The `instructions_master_inm` table is simpler and easier to manage.
* The data model is more flexible and easier to extend in the future.
* Team ownership of individual instructions is now explicitly tracked.

### Negative Consequences (if any)

* None. The required refactoring has been completed.

## Validation

The success of this decision is validated by the successful execution of the updated Liquibase migration and the successful generation of a complete, logically consistent dataset by the updated data generation scripts. The new `docs/dataModel/README.md` and its ERD visually confirm the correctness of the new structure.

## Pros and Cons of the Options

### Keep the existing model

* Pros:
  * No immediate development effort required.
* Cons:
  * Poor logical cohesion between controls and their intended scope.
  * Limited reusability of control definitions.
  * Unnecessary complexity in the `instructions_master_inm` table.

### Elevate Controls to Phases and Streamline Instructions

* Pros:
  * Creates a more logical and architecturally sound data model.
  * Maximizes the reusability of control definitions.
  * Simplifies the schema by removing redundant fields and relationships.
  * Improves long-term maintainability.
* Cons:
  * Required a one-time effort to refactor the schema and data generation scripts.
