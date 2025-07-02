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

### Test Suite Stability (2025-07-02)
- The test suite has been stabilized with specific SQL query mocks following [ADR-026](docs/adr/ADR-026-Specific-Mocks-In-Tests.md).
- Tests now use precise mock patterns that match exact SQL queries rather than generic patterns.
- All tests respect the [SEC-1] security principle, avoiding modification of sensitive files like `.env`.
- Module system compatibility issues (CommonJS vs. ES Modules) are handled without modifying source code.
- Comprehensive mock resets ensure proper test isolation and prevent cross-test contamination.

### Confluence HTML Importer (In Progress)
A new utility is being developed in `local-dev-setup/data-utils/Confluence_Importer` for importing and extracting structured data from Confluence pages exported as HTML. It supports both Bash and PowerShell environments and outputs structured step/instruction data. The tool is not yet complete—see the README in that folder for details and usage.

The UMIG project utilizes a sophisticated, two-part data model that separates reusable "Canonical" templates from time-bound "Instance" executions. This design provides maximum flexibility for managing complex migrations.

### Core Philosophy: Canonical vs. Instance

### New Commenting Features (2025-06-30)
UMIG now supports rich commenting for both canonical plan steps and executed step instances:
- `step_pilot_comments_spc` allows users to add comments to canonical plan steps (stored in the template).
- `step_instance_comments_sic` allows tracking of comments on specific executions of a step.
- See the schema details in migrations `002_add_step_pilot_comments.sql` and `003_add_step_instance_comments.sql`.
- See [ADR-021](docs/adr/ADR-021%20-%20adr-step-comments.md) for the rationale and implementation details.

#### Canonical (Master) Data
- "Canonical" refers to master templates.
- These are reusable, versioned definitions that do not change between executions.
- Example: A "Windows Server Migration" canonical plan defines the standard steps for any Windows server migration.

#### Instance Data
- "Instance" data represents a specific execution of a canonical template.
- Contains time-bound, execution-specific details.
- Example: The migration of server "WEB01" on July 15th, 2025, follows the "Windows Server Migration" template but with its own status, timing, and specifics.

This two-part model enables:
1. Standardization via canonical templates
2. Customization for specific executions
3. Historical tracking of all migrations
4. Performance analytics across similar migrations

## Table Structure

### Canonical (Master) Tables

Master tables contain reusable template data:

- `plans_master_plm`: Defines migration plan templates
- `sequences_master_sqm`: Logical groupings of steps within a plan
- `phases_master_phm`: Phases that organize sequences (e.g., "Pre-migration", "Migration", "Post-migration")
- `steps_master_stm`: Individual task definitions within sequences
- `instructions_master_inm`: Detailed instructions for completing steps
- `controls_master_ctm`: Control points or validation checks

### Instance Tables

Instance tables contain execution-specific data:

- `plans_instance_pli`: Specific migrations based on master plans
- `sequences_instance_sqi`: Execution of sequences within an instance
- `phases_instance_phi`: Execution of phases within an instance
- `steps_instance_sti`: Execution of steps with their status and timing
- `instructions_instance_ini`: Execution of instructions with status
- `controls_instance_cti`: Execution of control checks with results

## Database Schema

For a complete database schema diagram and details, see the [Data Model Documentation](./docs/dataModel/README.md).

## Getting Started

### Local Development Setup

The project uses a Node.js-based orchestration layer for local development, with Podman/Docker and Ansible for containerization.

#### Prerequisites

- Node.js 18+
- Podman or Docker
- Ansible (if using the Ansible-based setup)

#### Initial Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/umig.git
   cd umig
   ```

2. Install dependencies:
   ```bash
   cd local-dev-setup
   npm install
   ```

3. Create a `.env` file in the `local-dev-setup` directory:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start the local environment:
   ```bash
   npm run start
   # or use the new CLI
   ./umig-local start
   ```

### Environment Management

The `umig-local` CLI provides a unified interface for managing the local development environment:

```bash
# Start the environment
./umig-local start

# Stop the environment
./umig-local stop

# Restart the environment
./umig-local restart

# View logs
./umig-local logs

# Check service status
./umig-local status

# Access database shell
./umig-local db

# Clean up environment (removes containers and volumes)
./umig-local clean
```

### Data Generation

The project includes data generators for creating synthetic test data:

```bash
# Generate all test data
npm run generate-all

# Generate specific data sets
npm run generate -- --script=01_generate_core_metadata
npm run generate -- --script=02_generate_teams_apps
# etc.
```

### Testing

The project uses Jest for testing:

```bash
# Run all tests
npm test

# Run specific test file
npm test -- __tests__/generators/99_generate_instance_data.test.js

# Run tests with specific name pattern
npm test -- -t "should truncate tables"
```

## Rules & Coding Standards

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