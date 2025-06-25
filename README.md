# UMIG Project

## Data Model Overview

The UMIG project utilizes a clean, two-part data model designed for creating and managing reusable implementation plans.

### 1. Canonical (Master) Model
This part of the model defines the reusable templates for implementation plans. It consists of a hierarchical structure:
- `implementation_plans_canonical_ipc`: The top-level plan template.
- `sequences_master_sqm`: Reusable sequences or phases within a plan.
- `chapters_master_chm`: Chapters that group related steps.
- `steps_master_stm`: Individual steps to be executed.
- `instructions_master_inm`: Detailed instructions for a step.
- `controls_master_ctl`: Validation checks associated with a step.

This design allows for the creation of standardized, version-controlled plans that can be reused across multiple projects or migrations.

### 2. Instance Model
This model represents the live execution of a canonical plan. Each canonical entity has a corresponding instance entity to track its progress and status:
- `migration_iterations_mic`: A specific run or iteration of a canonical plan.
- `sequences_instance_sqi`: An instance of a sequence for a specific iteration.
- `chapters_instance_chi`: An instance of a chapter.
- `steps_instance_sti`: An instance of a step, which can be assigned to users.
- `instructions_instance_ini`: An instance of an instruction to be completed.
- `controls_instance_cti`: An instance of a control to be validated.

### Core Supporting Tables
A set of core tables supports the data model by managing users, teams, applications, and other essential metadata:
- `applications_app`
- `environments_env`
- `roles_rls`
- `status_sts`
- `teams_tms`
- `users_usr`

### Naming Conventions
- All tables use a three-letter suffix for clarity (e.g., `_ipc`, `_sqm`, `_usr`).
- Foreign key columns follow the format `<ref_table_pk>` (e.g., `ipc_id`, `sqm_id`).
- Canonical tables use a `_master_` infix, while instance tables use `_instance_`.

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
