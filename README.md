# UMIG Project

## Data Model Overview

### Iteration-Centric Data Model (2025-07-02)
- **Breaking Change:** The core data model has been refactored to be "iteration-centric".
- The `iterations_ite` table now links a migration to a master plan via `plm_id`.
- The direct link from `migrations_mig` to plans has been removed.
- This allows a single migration to use different plans for different iterations (e.g., a DR test vs. a production run).
- See [ADR-024](docs/adr/ADR-024-iteration-centric-data-model.md) and the updated [Data Model Documentation](./docs/dataModel/README.md) for full details.

### User-Team Membership (2025-07-01)
- User-team membership is now managed exclusively via the many-to-many join table `teams_tms_x_users_usr`.
- The `users_usr` table no longer has a `tms_id` foreign key.
- Each user belongs to exactly one team (current business rule), but the schema supports many-to-many assignments for future flexibility.
- All `ADMIN` and `PILOT` users are assigned to the `IT_CUTOVER` team during data generation (see `03_generate_users.js`).
- See [ADR-022](docs/adr/ADR-022-user-team-nn-relationship.md) and the migration script `006_add_teams_users_join.sql` for rationale and implementation details.

### Confluence HTML Importer (In Progress)
A new utility is being developed in `local-dev-setup/data-utils/Confluence_Importer` for importing and extracting structured data from Confluence pages exported as HTML. It supports both Bash and PowerShell environments and outputs structured step/instruction data. The tool is not yet complete—see the README in that folder for details and usage.

The UMIG project utilizes a sophisticated, two-part data model that separates reusable "Canonical" templates from time-bound "Instance" executions. This design provides maximum flexibility for managing complex migrations.

### Core Philosophy: Canonical vs. Instance

### New Commenting Features (2025-06-30)
UMIG now supports rich commenting for both canonical plan steps and executed step instances:
- `step_pilot_comments_spc`: Stores pilot/release manager comments on canonical steps (design-time feedback, instructions, etc.).
- `step_instance_comments_sic`: Stores user comments on step instances (real-time execution feedback, issues, and discussion).

The data generation utilities now populate these tables with realistic synthetic comments for development and testing. See the data-utils README for details.

* **Canonical (Master) Model**: Defines the reusable playbooks for a migration (`plans_master_plm`, `sequences_master_sqm`, `phases_master_phm`, etc.). These are the "what" and "how."
* **Instance Model**: Represents a specific, live execution of a canonical plan for a given iteration (`plans_instance_pli`, `sequences_instance_sqi`, etc.). These track the "when" and "what happened."

### Hierarchy

The model follows a clear hierarchy:

1. **Strategic Layer**: `Migrations` > `Iterations`
2. **Canonical Layer**: `Plans` > `Sequences` > `Phases` > `Steps` > `Instructions`
3. **Quality Gates**: `Controls` are defined at the `Phase` level.
4. **Instance Layer**: Mirrors the canonical hierarchy, with `Control Instances` linked directly to the `Instruction Instance` they validate.

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
The project includes a modular system for generating realistic fake data for development and testing. All data utilities are managed via `npm` scripts defined in `local-dev-setup/package.json`.

- **To generate all data (with reset):** `npm run generate-data:erase`
- **To generate data without resetting:** `npm run generate-data`

See `/docs/dataModel/README.md` for full schema details and rationale.
See `/local-dev-setup/README.md` for more details on the data utilities and other commands.

## Testing

The project maintains three distinct types of tests:

* **Unit Tests**: Located in `src/test/`, these are fast, in-memory tests that validate individual components in isolation. They use mocking to simulate dependencies.
* **Integration Tests**: Located in the root `/tests` directory, these are designed to run against the live development environment to validate the integration between different components (e.g., API and database).
* **Data Generator Tests**: Located in `local-dev-setup/__tests__/`, these are Jest-based tests that validate the correctness of our synthetic data generation scripts.

**Testing Standard for Mocks:** To ensure reliability, all tests that use mocks (especially for database queries) must use **highly specific matchers**. Generic mocks are discouraged as they can hide regressions. For more details, see **[ADR-026: Enforcing Specificity in Test Mocks](./docs/adr/ADR-026-Specific-Mocks-In-Tests.md)**.

For detailed instructions on how to run the integration test suite, please see the **[Testing Guide](./tests/README.md)**.

## Local Development Environment

The local development environment is managed via a unified Node.js application and Podman. All commands are run via `npm` from the `local-dev-setup/` directory.

**Quick Commands (run from `local-dev-setup/`):**
- `npm start`: Starts the environment.
- `npm stop`: Stops the environment.
- `npm run restart`: Restarts the environment.
- `npm run restart:erase`: Wipes all data and restarts the environment for a clean slate.

For detailed setup instructions and all available commands, see the **[Local Dev Setup README](./local-dev-setup/README.md)**.

## Project Governance & Coding Standards

This project adheres to a strict set of rules and principles to ensure code quality, consistency, and maintainability. These rules are defined in detail within the `.clinerules/rules/` directory and are mandatory for all contributors, including AI assistants.

The rulebook covers:
- **Project Guidelines:** High-level policies and standards.
- **Core Coding Principles:** Universal rules of software craftsmanship.
- **Project Scaffolding:** Mandatory file and folder structure.
- **The Twelve-Factor App:** Principles for building cloud-native applications.
- **Microservice Architecture:** Patterns for designing and implementing microservices.

All contributors are expected to familiarize themselves with these rules before starting work.

## AI Assistant Integration

This project integrates with AI assistants to streamline development workflows. Detailed guidelines and configurations for specific AI tools are provided in dedicated documentation files:

* **Claude AI Assistant**: Refer to [CLAUDE.md](./CLAUDE.md) for usage instructions and project-specific guidelines.
* **Gemini CLI**: Refer to [GEMINI.md](./GEMINI.md) for details on leveraging Gemini CLI for various tasks.

## Code Quality & Security Scanning

This project uses **Semgrep** and **MegaLinter** to enforce code quality, security, and consistency.

### Semgrep
- **Purpose:** Static analysis and security scanning.
- **Ignore rules:** See `.semgrepignore` at the project root.
- **Install on Mac:**
  ```sh
  brew install semgrep
  ```
- **Usage:**
  ```sh
  semgrep scan --config=auto .
  ```

### MegaLinter
- **Purpose:** Multi-language linting and formatting.
- **Configuration:** See `.mega-linter.yml` at the project root.
- **Run via Podman:**
  ```sh
podman run --rm \
  -e VALIDATE_ALL_CODEBASE=true \
  -v $(pwd):/tmp/lint \
  oxsecurity/megalinter:v8
  ```
  (You can also use Docker if available.)

- **Note:** The linter will only analyze files that match the configuration and are not excluded by `.gitignore` or `.mega-linter.yml`.

