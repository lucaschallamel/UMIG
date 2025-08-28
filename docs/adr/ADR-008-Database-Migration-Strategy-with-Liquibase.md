# ADR-008: Database Migration Strategy with Liquibase

- **Status:** Proposed
- **Date:** 2025-06-17
- **Deciders:** The UMIG Development Team
- **Technical Story:** N/A

## Context and Problem Statement

The current process for managing database schema changes relies on two methods:

1. An `init-db.sh` script that runs only when a new, empty database volume is created.
2. Manual execution of SQL scripts for any subsequent changes on existing databases.

This approach is not scalable, is prone to human error, and lacks version control. As the application grows, it will become increasingly difficult to ensure that all developer environments—and future production environments—have a consistent and correct database schema. We need a reliable, automated, and safe way to evolve the database schema over time.

## Decision Drivers

- **Repeatability:** Migrations must be runnable automatically and produce the same result on any environment.
- **Safety:** The system should prevent accidental re-application of the same migration and support safe rollbacks where possible.
- **Version Control:** Database schema changes should be versioned and stored alongside the application source code.
- **Developer Experience:** New developers should be able to get a correctly-schemed database with a single command.
- **Environment Consistency:** Ensure local, testing, and production environments are all on the same schema version.

## Considered Options

1. **Manual SQL Scripts:** Continue with the current ad-hoc process of writing and running SQL scripts manually.
2. **Custom Shell Scripts:** Develop a set of custom shell scripts to manage the order and execution of SQL migration files.
3. **Adopt a Dedicated Migration Tool (Liquibase):** Integrate a specialized, open-source tool designed for database change management.

## Decision Outcome

Chosen option: **"Adopt a Dedicated Migration Tool (Liquibase)"**, because it is a mature, industry-standard tool that directly addresses all of our decision drivers. It provides a robust framework for versioning, tracking, and applying database changes automatically. While it introduces a new dependency, the benefits in safety, consistency, and developer efficiency far outweigh the initial setup cost.

### Positive Consequences

- Database schema changes become automated, version-controlled, and auditable.
- Greatly reduces the risk of manual errors when applying schema changes.
- Simplifies the onboarding process for new developers.
- Ensures consistency across all environments.
- Provides a clear and structured process for database evolution.

### Negative Consequences (if any)

- Introduces a new dependency (Liquibase) to the project stack.
- Adds a small amount of complexity to the local development setup (e.g., a new container).
- Requires a minor learning curve for developers to understand Liquibase's structure and commands.

## Validation

The decision will be considered successful when:

1. Database migrations are applied automatically upon starting the development environment.
2. A new developer can clone the repository, run `podman-compose up`, and have a fully migrated database without manual intervention.
3. Schema changes can be reliably and repeatedly deployed across different machines.

## Pros and Cons of the Options

### Manual SQL Scripts

- Pros:
  - No new dependencies.
  - Simple for a single, initial setup.
- Cons:
  - Highly error-prone.
  - Not scalable.
  - No version tracking.
  - Inconsistent across environments.

### Custom Shell Scripts

- Pros:
  - No third-party dependencies.
  - More structured than a purely manual process.
- Cons:
  - Requires building and maintaining a custom, fragile solution.
  - Reinvents the wheel, ignoring mature solutions.
  - Lacks advanced features like checksums, contexts, and automated rollback.

### Adopt a Dedicated Migration Tool (Liquibase)

- Pros:
  - Fully automated and reliable.
  - Industry-standard, well-documented, and community-supported.
  - Provides robust features like change tracking, contexts, and preconditions.
  - Database-agnostic, providing future flexibility.
- Cons:
  - Adds a new tool to the project.
  - Requires initial configuration effort.
