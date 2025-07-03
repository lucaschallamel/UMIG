# ADR-028: Data Import Strategy for Confluence JSON Exports

* **Status:** Proposed
* **Date:** 2025-07-02
* **Deciders:** Franck, Cascade
* **Technical Story:** N/A

## Context and Problem Statement

The project requires an efficient, robust, and simple method to import a large volume of structured data (over 500 JSON files) into the PostgreSQL database. These JSON files are generated from Confluence HTML exports. The import process must be completed in under 3 minutes, must not introduce new third-party dependencies to the project, and must be easy for any developer to execute.

## Decision Drivers

* **Performance:** The solution must be able to handle the bulk import of hundreds of files quickly and efficiently.
* **No New Dependencies:** The solution must rely exclusively on the existing technology stack (PostgreSQL, shell scripts) as per project constraints.
* **Simplicity and Maintainability:** The process should be orchestrated by a single, easy-to-run script. The logic should be straightforward to understand and maintain.
* **Robustness and Idempotency:** The import process must be transactional (all or nothing) and safely re-executable without creating duplicate data or causing side effects.
* **Adherence to Project Rules:** The solution must align with established project guidelines, such as using Liquibase for schema changes ([DPS]) and following Twelve-Factor App principles ([TFA]).

## Considered Options

### Option 1: `psql` `\copy` with a Staging Table

*   **Description:** A shell script (`bash`) orchestrates the entire process. It first creates a temporary staging table. Then, it uses the native `psql \copy` command to bulk-load the raw content of all JSON files into this table. Finally, it executes a single, powerful SQL query within the same transaction to parse the JSONB data, transform it, and insert/update it into the final destination tables (`cutover_steps`, `cutover_step_instructions`).
*   **Pros:**
    *   Extremely high performance by leveraging PostgreSQL's native bulk loading and server-side JSON processing.
    *   Zero new dependencies.
    *   Inherently transactional and robust.
    *   Simple to execute with a single command.
*   **Cons:**
    *   Transformation logic is concentrated in a single SQL query, which could become complex for more advanced scenarios.

### Option 2: External Script (e.g., Python, Node.js) with a Database Driver

*   **Description:** An external script would iterate through each JSON file, parse it in the script's memory, and then execute individual `INSERT` or `UPDATE` statements for each record against the database.
*   **Pros:**
    *   Transformation logic can be expressed in a familiar programming language, which can be easier for complex business rules.
*   **Cons:**
    *   Significantly slower due to row-by-row processing and high network latency (one round trip per statement).
    *   Requires careful manual transaction management to ensure atomicity.
    *   Potentially adds new dependencies if a specific library is needed.

### Option 3: Dedicated ETL Tool

*   **Description:** Use a dedicated ETL (Extract, Transform, Load) tool like Apache NiFi or Talend to build a visual data pipeline for the import.
*   **Pros:**
    *   Powerful and scalable for very complex, enterprise-level data integration scenarios.
*   **Cons:**
    *   Massive overkill for this specific need.
    *   Introduces significant new dependencies and a steep learning curve.
    *   Violates the "no new dependencies" constraint.

## Decision Outcome

Chosen option: **"Option 1: `psql` `\copy` with a Staging Table"**, because it is the only solution that meets all the stated requirements. It offers unparalleled performance by minimizing network overhead and leveraging the database engine's native, optimized functions for both bulk loading and JSON parsing. This approach perfectly respects the "no new dependencies" constraint. The resulting script is self-contained, transactional, and idempotent, making it robust and simple to integrate into the development workflow.

While an external script (Option 2) might seem more flexible, its performance would be orders of magnitude worse, failing the sub-3-minute requirement. A dedicated ETL tool (Option 3) would introduce unnecessary complexity and dependencies, which is contrary to the project's principles.

### Positive Consequences

*   The import process will be extremely fast and well within the time limit.
*   The project's dependency footprint remains minimal.
*   The solution is robust, safe, and easily automated.
*   The resulting script is maintainable and relies on standard, well-understood tools.

### Negative Consequences (if any)

*   For future, more complex data transformations, the central SQL query might grow in complexity. However, for the current scope, it remains perfectly manageable.

## Validation

The success of this decision will be validated when the `import_cutover_data.sh` script successfully imports all 500+ JSON files into the production-like database in under 3 minutes. Data integrity will be confirmed by running SQL queries to verify that the counts of steps and instructions in the database match the source files.
