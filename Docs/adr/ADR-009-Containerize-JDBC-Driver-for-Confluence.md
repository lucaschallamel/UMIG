# ADR-009: Containerize PostgreSQL JDBC Driver for Confluence

*   **Status:** Accepted
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

## Decision Outcome

Chosen option: **"Option 1: Build a Custom Confluence Image with the JDBC Driver"**, because it provides the most robust, reproducible, and encapsulated solution. It aligns with modern containerization best practices by treating the application and its core runtime dependencies as a single, immutable artifact. This approach eliminates manual steps and ensures that the development environment is consistent across all machines, directly addressing the primary decision drivers of reproducibility and encapsulation.

### Positive Consequences

*   The local development environment is now self-contained and works out-of-the-box for features requiring database access from ScriptRunner.
*   The process for adding other required libraries to Confluence in the future is now clearly established.
*   The dependency (JDBC driver) is version-controlled with the project.

### Negative Consequences (if any)

*   The initial startup of the development environment will be slightly longer due to the one-time image build process.

## Validation

The decision is considered successful because developers can now run the local environment and execute ScriptRunner scripts that connect to the PostgreSQL database without encountering a `Driver not found` error. This is validated by successfully creating, reading, updating, and deleting Implementation Plans via the custom REST endpoints.

## Links

*   [PostgreSQL JDBC Driver Download Page](https://jdbc.postgresql.org/download/)
