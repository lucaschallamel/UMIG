# ADR-003: Database Technology - PostgreSQL

- **Status:** Accepted
- **Date:** 2025-06-16
- **Deciders:** UMIG Project Team
- **Technical Story:** N/A

## Context and Problem Statement

The UMIG application requires a persistent data store for guides, steps, tasks, schedules, and related metadata. The chosen database must support concurrent read/write operations, ensure data integrity, be scalable to meet project needs, and align with the enterprise's approved technology stack.

## Decision Drivers

- **Data Integrity and Reliability:** The database must ensure ACID properties.
- **Concurrency:** Must efficiently handle concurrent read and write operations from multiple users interacting with the application via ScriptRunner.
- **Scalability:** Should be able to handle the expected volume of data and user load.
- **Approved Technology:** Must be an approved database technology within the enterprise (`techContext.md`).
- **Integration:** Easily accessible from Atlassian ScriptRunner (Groovy).
- **Maintainability and Support:** Availability of tools and expertise for management and support.

## Considered Options

- **Option 1: PostgreSQL (Chosen)**
  - Description: A powerful, open-source object-relational database system.
  - Pros: Robust, reliable, and feature-rich. Excellent support for complex queries and data integrity. Handles high concurrency well. Part of the approved technology stack (`techContext.md`, `activeContext.md`). Good driver support for Java/Groovy.
  - Cons: Requires a separate database server instance to be provisioned and managed (though this is standard for enterprise applications).
- **Option 2: SQLite**
  - Description: A C-language library that implements a small, fast, self-contained, high-reliability, full-featured, SQL database engine.
  - Pros: Simple to set up (file-based). No separate server process. Good for single-user applications or read-heavy workloads.
  - Cons: Explicitly rejected due to limitations with concurrent write operations (`activeContext.md`, `techContext.md`), which is a key requirement for UMIG. Not suitable for multi-user web applications requiring simultaneous updates.
- **Option 3: H2 Database (Embedded or Server Mode)**
  - Description: An open-source relational database management system written in Java. It can be embedded in Java applications or run in client-server mode.
  - Pros: Easy to embed within a Java application (like Confluence/ScriptRunner). Good for development and testing.
  - Cons: While capable, PostgreSQL is generally considered more robust and scalable for production enterprise applications. Not explicitly listed as the primary choice in `techContext.md` for this type of application, though often used in Java environments.
- **Option 4: Confluence Internal Database (HSQLDB or other)**
  - Description: Using Confluence's own internal database.
  - Pros: No separate database setup required.
  - Cons: Strongly discouraged by Atlassian for storing significant amounts of custom application data. Confluence's internal database is optimized for Confluence's own needs and can be subject to change during upgrades. Risk of data loss or performance degradation. Not designed for direct application use.

## Decision Outcome

Chosen option: **"PostgreSQL"**.

PostgreSQL was selected due to its robustness, strong support for concurrent operations, data integrity features, and its status as an approved enterprise database technology (`activeContext.md`, `techContext.md`). This aligns with the project's need for a reliable backend data store capable of handling multiple users and complex relationships as defined in the UMIG application. The explicit rejection of SQLite due to concurrency limitations further reinforces the choice of a server-based RDBMS like PostgreSQL.

### Positive Consequences

- Reliable and robust data storage.
- Efficient handling of concurrent user operations.
- Scalability to accommodate future growth in data and usage.
- Alignment with enterprise technology standards and support.

### Negative Consequences (if any)

- Requires provisioning and maintenance of a separate PostgreSQL server instance.

## Validation

- Successful creation and interaction with the database schema from ScriptRunner.
- No data corruption or loss under normal operating conditions.
- Database performance meets application requirements under expected load.

## Pros and Cons of the Options

(Covered in "Considered Options" section)

## Links

- ADR-001: Confluence-Integrated Application Architecture
- ADR-002: Backend Implementation with Atlassian ScriptRunner
- `cline-docs/activeContext.md`
- `cline-docs/techContext.md`
- `cline-docs/systemPatterns.md` (mentions data model)

## Amendment History

- N/A
