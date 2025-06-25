# UMIG Project

## Data Model Overview

The UMIG project utilizes a sophisticated, two-part data model that separates reusable "Canonical" templates from time-bound "Instance" executions. This design provides maximum flexibility for managing complex migrations.

### Core Philosophy: Canonical vs. Instance

*   **Canonical (Master) Model**: Defines the reusable playbooks for a migration (`plans_master_plm`, `sequences_master_sqm`, `phases_master_phm`, etc.). These are the "what" and "how."
*   **Instance Model**: Represents a specific, live execution of a canonical plan for a given iteration (`plans_instance_pli`, `sequences_instance_sqi`, etc.). These track the "when" and "what happened."

### Hierarchy

The model follows a clear hierarchy:

1.  **Strategic Layer**: `Migrations` > `Iterations`
2.  **Canonical Layer**: `Plans` > `Sequences` > `Phases` > `Steps` > `Instructions`
3.  **Quality Gates**: `Controls` are defined at the `Phase` level.
4.  **Instance Layer**: Mirrors the canonical hierarchy, with `Control Instances` linked directly to the `Instruction Instance` they validate.

For a complete, in-depth explanation and a full Entity Relationship Diagram (ERD), please see the **[UMIG Data Model Documentation](./docs/dataModel/README.md)**.

## Application Architecture & Structure

The UMIG application is built as a **pure ScriptRunner application**, not a formal, compiled Confluence plugin. This approach keeps the project lean, simplifies deployment, and relies entirely on ScriptRunner's native features. The two core architectural patterns are auto-discovered REST endpoints and resource-based database connections.

### Auto-Discovered REST Endpoints

The entire API is composed of Groovy scripts located in the `src/` directory. ScriptRunner is configured to automatically scan specific packages within this directory (`com.umig.api.v2` and `com.umig.api.v2.web`) for files that follow the `CustomEndpointDelegate` pattern.

When the Confluence container starts, ScriptRunner discovers these scripts and dynamically exposes them as REST endpoints under the `/rest/scriptrunner/latest/custom/` path. This means there is no manual registration or compilation step required to deploy or update an endpoint; simply updating the Groovy file is sufficient.

### Resource-Based Database Connection

Database connectivity is managed entirely within ScriptRunner. Instead of defining a JNDI resource at the container level (e.g., in `server.xml`), we use a **ScriptRunner Database Connection Resource**.

- **Configuration**: A connection pool named `umig_db_pool` is configured directly in the ScriptRunner **Resources** tab in the Confluence administration UI.
- **Access**: The application code accesses this connection pool by its name via the `DatabaseUtil.withSql('umig_db_pool', ...)` method.

This approach keeps the Confluence server configuration completely clean and standard. All application-specific configuration (database connections, script paths) is managed within ScriptRunner, making the setup more portable and easier to manage.

The source code is organized as follows:

```
src/
├── com/umig/         # Packaged backend code (API, Repository)
├── macros/           # ScriptRunner Script Macros for UI rendering
└── web/              # CSS and JS assets for the frontend
```

This structure ensures a clean separation of concerns while enabling a simple, automated deployment process. For a detailed explanation of the architectural decision, see **[ADR-018: Pure ScriptRunner Application Structure](./docs/adr/ADR-018-Pure-ScriptRunner-Application-Structure.md)**.

### Naming Conventions
- All tables use a three-letter suffix for clarity (e.g., `_plm`, `_sqm`, `_usr`).
- Canonical tables use a `_master_` infix, while instance tables use `_instance_`.
- Foreign key columns follow the format `<ref_table_pk>` (e.g., `plm_id`, `sqm_id`).

## Data Generation Utilities
The project includes a modular system for generating realistic fake data for development and testing. The main script `umig_generate_fake_data.js` orchestrates the following generators:
- `01_generate_core_metadata.js`: Populates reference data (roles, statuses).
- `02_generate_teams_apps.js`: Creates teams and applications.
- `03_generate_users.js`: Generates users and assigns them to teams.
- `04_generate_environments.js`: Creates different environments (e.g., DEV, PROD).
- `06_generate_canonical_plans.js`: Builds the reusable canonical plan templates.
- `07_generate_instance_data.js`: Creates live instances from the canonical plans.

See `/docs/dataModel/README.md` for full schema details and rationale.
See `/local-dev-setup/data-utils/README.md` for details on the data utilities.

## Local Development Environment

The local development environment is managed via Podman and a set of convenient shell scripts located in the `local-dev-setup/` directory.

**Quick Commands:**
- `./local-dev-setup/start.sh`: Starts the environment.
- `./local-dev-setup/stop.sh`: Stops the environment.
- `./local-dev-setup/restart.sh`: Restarts the environment. Use the `--reset` flag to delete the database and start fresh.

For detailed setup instructions, see the [Local Dev Setup README](./local-dev-setup/README.md).
