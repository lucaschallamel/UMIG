# ADR-021: Introduction of Step-Level and Instance-Level Comments

- **Status:** Accepted
- **Date:** 2025-06-30
- **Deciders:** UMIG Core Team
- **Technical Story:** N/A

## Context and Problem Statement

There was no structured way to capture collaborative feedback, discussion, or audit trails directly on canonical (design-time) plan steps or on executed step instances. This limited both the transparency of the migration process and the ability to capture valuable domain knowledge and lessons learned.

## Decision Drivers

- Need for richer collaboration and feedback mechanisms
- Auditability and traceability for compliance and continuous improvement
- Alignment with user expectations for modern workflow tools
- Support for future features (e.g., notifications, reporting)

## Considered Options

- **Option 1: Add dedicated comment tables for both canonical and instance steps**
  - Pros: Clean separation, easy to query, aligns with existing schema patterns, flexible for future extensions
  - Cons: Slight schema complexity increase, more joins
- **Option 2: Use a single polymorphic comments table**
  - Pros: Simpler schema, fewer tables
  - Cons: More complex queries, risk of misuse, harder to enforce referential integrity
- **Option 3: Store comments as JSONB arrays on step/instance tables**
  - Pros: Minimal schema change
  - Cons: Poor queryability, hard to enforce constraints, not normalized

## Decision Outcome

Chosen option: **"Add dedicated comment tables for both canonical and instance steps"**, because it provides the best balance of clarity, extensibility, and data integrity.

### Positive Consequences

- Enables direct, structured feedback and discussion on both plan design and execution
- Supports audit trails and future features (notifications, analytics)
- Keeps schema clean and queries simple

### Negative Consequences

- Slight increase in schema complexity (two new tables)

## Validation

- Successful population and use of these tables in data generation and tests
- Developer and user feedback
- No regressions in test suite

## Links

- See migrations: `002_add_step_pilot_comments.sql`, `003_add_step_instance_comments.sql`
- See data generation: `06_generate_canonical_plans.js`, `07_generate_instance_data.js`
