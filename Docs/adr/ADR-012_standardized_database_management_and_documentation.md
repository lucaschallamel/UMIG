# ADR-012: Standardized Database Management and Documentation

**Date**: 2025-06-19

**Status**: Accepted

## Context

The project's database schema was evolving, but the process for managing and documenting it was fragile. We encountered a critical failure where Liquibase migrations were not applied correctly due to configuration errors (duplicate changelog files, non-idempotent scripts). Furthermore, the data model was not formally documented, making it difficult for developers to understand table structures and relationships.

## Decision

We will adopt a standardized and robust approach for both database migration management and data model documentation.

1. **Reliable Liquibase Configuration**: The project will maintain a single, definitive master changelog file (`liquibase/changelogs/db.changelog-master.xml`). All migration scripts (`.sql` changesets) must be made idempotent (e.g., using `IF NOT EXISTS` for `CREATE` statements) to ensure they can be re-run without causing errors.

2. **Formal Data Model Documentation**: The database schema will be formally documented in the `/docs/dataModel` directory. The primary documentation will be a `README.md` file containing:
    * An **Entity-Relationship Diagram (ERD)** generated using Mermaid syntax to provide a clear visual overview.
    * **Detailed Markdown tables** describing each table, column, data type, and constraint.

3. **Version-Controlled API Tests**: API tests will be maintained in a Postman collection and stored in the repository at `/docs/api/postman`. This keeps tests in sync with the code and makes them easily accessible to all developers.

## Consequences

**Positive**:
* **Increased Reliability**: The database migration process is now robust and predictable, preventing schema drift.
* **Improved Clarity**: The data model is clearly documented, reducing ambiguity and onboarding time for developers.
* **Consistency**: API tests are version-controlled and standardized, improving testing consistency.
* **Maintainability**: All related assets (migrations, documentation, tests) are stored together in the repository.

**Negative**:
* **Slight Overhead**: Developers must now adhere to the practice of updating the data model documentation when making schema changes.
