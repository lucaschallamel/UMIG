# ADR-010: Database Connection Pooling with ScriptRunner for Confluence

*   **Status:** Accepted
*   **Date:** 2025-06-19
*   **Deciders:** UMIG Engineering Team
*   **Technical Story:** N/A

## Context and Problem Statement

Previously, database connectivity for backend Groovy scripts in UMIG required manual management of the PostgreSQL JDBC driver and direct instantiation of connections using `groovy.sql.Sql.newInstance`. This led to maintainability issues and errors (e.g., `org.postgresql.Driver not found`) in the local development environment, requiring custom image modifications and manual driver bundling.

## Decision Drivers

*   Maintainability and simplicity
*   Reliability of local development setup
*   Alignment with ScriptRunner best practices
*   Avoidance of manual dependency management

## Considered Options

*   **Option 1: Manual JDBC Driver Management**
    *   Description: Bundle the PostgreSQL JDBC driver in the Confluence container and instantiate connections manually in Groovy scripts.
    *   Pros: Fine-grained control, works in any Groovy environment.
    *   Cons: Fragile, error-prone, requires custom image builds, not portable, not aligned with ScriptRunner best practices.
*   **Option 2: ScriptRunner Database Resource Pool (Chosen)**
    *   Description: Use ScriptRunner’s built-in Database Resource Pool feature to manage database connections and drivers.
    *   Pros: Simpler, more reliable, no manual driver management, officially supported, portable across environments.
    *   Cons: Slightly less flexibility, requires configuration via the Confluence Admin UI.

## Decision Outcome

Chosen option: **"ScriptRunner Database Resource Pool"**

This approach leverages ScriptRunner’s built-in support for managing JDBC drivers and connection pooling, eliminating the need for manual driver management. It simplifies the development environment and reduces the risk of classpath errors.

### Positive Consequences

*   No more manual driver management or custom image modifications
*   Reliable and portable database connectivity
*   Aligned with ScriptRunner and Atlassian best practices

### Negative Consequences (if any)

*   Slightly less flexibility in connection instantiation
*   Requires initial configuration in the Confluence Admin UI

## Validation

Successful connection and query execution via ScriptRunner’s Database Resource Pool, validated by running a `SELECT 1` ping test in the ScriptRunner console:

```groovy
import com.onresolve.scriptrunner.db.DatabaseUtil
DatabaseUtil.withSql('umig_app_db_pool') { sql ->
    sql.firstRow('SELECT 1')
}
```

## Links

*   [ADR-009-Containerize-JDBC-Driver-for-Confluence.md](ADR-009-Containerize-JDBC-Driver-for-Confluence.md)
*   [UMIG Tech Context](../../cline-docs/techContext.md)

## Amendment History

*   2025-06-19: Initial decision and documentation.