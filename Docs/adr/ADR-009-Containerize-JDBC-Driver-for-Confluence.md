# ADR-009: Containerize PostgreSQL JDBC Driver for Confluence

*   **Status:** Superseded
*   **Date:** 2025-06-18
*   **Deciders:** Lucas Challamel, Cascade
*   **Technical Story:** N/A

## Context and Problem Statement

During local development setup, ScriptRunner Groovy scripts executing within Confluence could not connect to the external PostgreSQL database. The root cause was a `java.sql.SQLException: org.postgresql.Driver not found` error, indicating that the PostgreSQL JDBC driver was not available in the Confluence application's classpath. This prevents any feature requiring direct database access from ScriptRunner from functioning in the local development environment, blocking development and testing.

## Decision Drivers

*   **Reproducibility:** The development environment setup must be consistent and reproducible for all team members.
*   **Encapsulation:** Environment dependencies should be managed within the environment's definition, not as manual post-setup steps.
*   **Simplicity:** The solution should not add significant complexity to the local environment startup process.
*   **Maintainability:** The method for including the driver should be easy to update and manage.

## Considered Options

*   **Option 1: Build a Custom Confluence Image with the JDBC Driver**
    *   Description: Create a `Containerfile` (Dockerfile) that uses the official `atlassian/confluence-server` image as a base and copies the PostgreSQL JDBC driver JAR file directly into the `/opt/atlassian/confluence/confluence/WEB-INF/lib/` directory. The `podman-compose.yml` file is then updated to build and use this custom image.
    *   Pros:
        *   Fully encapsulates the dependency within the container image.
        *   Highly reproducible; anyone running `podman-compose up --build` gets the correct setup.
        *   The dependency is version-controlled along with the `Containerfile`.
    *   Cons:
        *   Adds a one-time image build step to the initial setup, which can take a few minutes.

*   **Option 2: Manually Copy the Driver into the Container**
    *   Description: After starting the Confluence container, use a `podman cp` command to manually copy the JDBC driver JAR from the host into the running container's `WEB-INF/lib` directory, followed by a container restart.
    *   Pros:
        *   Conceptually simple for a one-off fix.
    *   Cons:
        *   Manual step is error-prone and easily forgotten.
        *   Not easily automated or integrated into the `podman-compose` workflow.
        *   Makes the environment setup stateful and less declarative.

*   **Option 3: Use a Volume Mount for the Driver**
    *   Description: Mount the single JDBC driver JAR file from the host directly into the Confluence container's `WEB-INF/lib` directory using a volume mount in `podman-compose.yml`.
    *   Pros:
        *   Easy to implement within `podman-compose.yml`.
        *   Avoids the need for a custom image build.
    *   Cons:
        *   Can be fragile if file permissions on the host are incorrect.
        *   "Pollutes" the container's internal library directory with a direct mount, which can sometimes have unintended side effects or be overwritten by application startup processes.
        *   Less encapsulated than building a custom image.

## Original Decision Outcome (Superseded)

**This section describes the original decision which was later superseded. See 'Amendment - Pivot to ScriptRunner Native Connection' below.**

Original chosen option: **"Option 1: Build a Custom Confluence Image with the JDBC Driver"**, because it was believed to provide the most robust, reproducible, and encapsulated solution. It aligned with modern containerization best practices by treating the application and its core runtime dependencies as a single, immutable artifact. This approach aimed to eliminate manual steps and ensure that the development environment was consistent across all machines, directly addressing the primary decision drivers of reproducibility and encapsulation.

### Positive Consequences

*   The local development environment is now self-contained and works out-of-the-box for features requiring database access from ScriptRunner.
*   The process for adding other required libraries to Confluence in the future is now clearly established.
*   The dependency (JDBC driver) is version-controlled with the project.

### Negative Consequences (if any)

*   The initial startup of the development environment will be slightly longer due to the one-time image build process.

## Original Validation (Based on Superseded Decision)

**This validation corresponds to the original, superseded decision.**

The original decision was initially considered successful because developers could run the local environment and execute ScriptRunner scripts that connect to the PostgreSQL database without encountering a `Driver not found` error. This was validated by successfully creating, reading, updating, and deleting Implementation Plans via the custom REST endpoints using the bundled driver.

---

## Amendment - Pivot to ScriptRunner Native Connection

*   **Date of Amendment:** 2025-06-18
*   **Reason for Amendment:** While Option 1 (Build a Custom Confluence Image with the JDBC Driver) initially resolved the `Driver not found` error, subsequent development on feature `feat/ip-macro-ui` revealed persistent and difficult-to-diagnose `java.lang.NoClassDefFoundError` issues, likely related to classloader conflicts within Confluence when the driver was bundled this way. These issues blocked further progress.

### New Decision Outcome

**Chosen New Option: Utilize ScriptRunner's built-in Database Connection resource feature.**

This approach involves:
1.  Removing the JDBC driver from the custom Confluence image (`Containerfile`).
2.  Configuring a new 'Database Connection' directly within the ScriptRunner admin interface in Confluence, pointing to the PostgreSQL container.
3.  Refactoring Groovy scripts (e.g., `ImplementationPlanManager.groovy`) to use `DatabaseUtil.withSql()` or equivalent methods that leverage ScriptRunner's managed connections.

**Reasoning for New Decision:**
*   **Reliability:** This is the officially recommended and supported method by Adaptavist (ScriptRunner vendor) for database interactions, minimizing risks of classloader conflicts.
*   **Simplicity:** Delegates connection pooling and management to ScriptRunner, simplifying the application code.
*   **Maintainability:** Easier to manage and update connection details through the ScriptRunner UI.

### Positive Consequences (of New Decision)

*   Resolves the `NoClassDefFoundError` issues, unblocking feature development.
*   Aligns with ScriptRunner best practices for database connectivity.
*   Potentially simplifies the `Containerfile` by removing driver management.

### Negative Consequences (of New Decision)

*   Requires a one-time manual configuration step in the ScriptRunner UI for each new environment to set up the Database Connection resource.
*   Slightly less encapsulation of the full environment setup within `podman-compose.yml` alone, as a UI step is now involved.

### Validation (of New Decision)

The new decision will be considered successful when:
1.  The ScriptRunner Database Connection resource can be successfully configured to connect to the PostgreSQL database.
2.  Groovy scripts, particularly the endpoints in `ImplementationPlanManager.groovy` for the `feat/ip-macro-ui` feature, can perform all required CRUD operations against the database without `Driver not found` or `NoClassDefFoundError` issues.
3.  The `Containerfile` has been cleaned of JDBC driver `COPY` instructions.

## Links

*   [PostgreSQL JDBC Driver Download Page](https://jdbc.postgresql.org/download/)
