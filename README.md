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

For a complete, in-depth explanation and a full Entity Relationship Diagram (ERD), please see the## Project History and Documentation

- Sprint reviews and retrospectives are documented in `/docs/devJournal/` using the `{yyyymmdd}-sprint-review.md` convention (see persistent template).
- The STEP View macro & SPA MVP is now delivered as a reference implementation for migration/release steps (see `/src/web/step-view.js` and `/src/macros/stepViewMacro.groovy`).
- All major milestones, ADRs, and changelogs are kept up to date and in sync.
](./docs/dataModel/README.md)**.

## Application Architecture & Structure

The UMIG application is built as a **pure ScriptRunner application**, not a formal, compiled Confluence plugin. This approach keeps the project lean, simplifies deployment, and relies entirely on ScriptRunner's native features. The two core architectural patterns are auto-discovered REST endpoints and resource-based database connections.

## Admin UI Pattern: SPA + REST (ARD020)

**All administrative entity management interfaces (user, team, plan, etc.) now follow a dynamic SPA (Single Page Application) pattern, as formalized in [ADR020](./docs/adr/ARD020-spa-rest-admin-entity-management.md):**

- **STEP View Macro & SPA:**
  - The project now includes a macro and SPA for displaying migration/release steps in Confluence. This feature uses ScriptRunner REST to fetch and render step data, and is a reference implementation for future migration-related UIs.

- **Backend:** ScriptRunner REST endpoints (Groovy) expose CRUD operations for each entity, using the repository pattern and robust type handling.
- **Frontend:** Each entity has a dedicated JS SPA that dynamically renders list, detail, and edit views in a single container—no page reloads or macro HTML fetching.
- **Dynamic forms/tables:** Both read-only and edit forms are generated from the entity’s fields, so new fields are automatically supported.
- **Edit forms:** All fields except the primary key are editable, with input types inferred by field name and value type.
- **Type safety:** Payloads are constructed to match backend expectations (booleans as booleans, numbers as numbers).
- **UX:** Atlassian AUI styles, seamless navigation, and clear messaging.

**This pattern is now the standard for all new admin UIs.** See `src/web/js/user-list.js` and `src/com/umig/api/v2/UserApi.groovy` for canonical examples.

## UI/UX Documentation & Roadmap

All user interface and user experience specifications are maintained in the `/docs/ui-ux/` directory. This includes:
- A persistent `template.md` for all new UI/UX specs
- Detailed specifications for each major UI component (e.g., `step-view.md`)
- A living `ROADMAP.md` that outlines the phased rollout of UX/UI features, including the current strategy to prioritize admin UI SPA patterns for all entity management.

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

## Testing

The project maintains two distinct types of tests:

*   **Unit Tests**: Located in `src/test/`, these are fast, in-memory tests that validate individual components in isolation. They use mocking to simulate dependencies.
*   **Integration Tests**: Located in the root `/tests` directory, these are designed to run against the live development environment to validate the integration between different components (e.g., API and database).

For detailed instructions on how to run the integration test suite, please see the **[Testing Guide](./tests/README.md)**.

## Local Development Environment

The local development environment is managed via Podman and a set of convenient shell scripts located in the `local-dev-setup/` directory.

**Quick Commands:**
- `./local-dev-setup/start.sh`: Starts the environment.
- `./local-dev-setup/stop.sh`: Stops the environment.
- `./local-dev-setup/restart.sh`: Restarts the environment. Use the `--reset` flag to delete the database and start fresh.

For detailed setup instructions, see the [Local Dev Setup README](./local-dev-setup/README.md).
