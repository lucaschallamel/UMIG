# UMIG Data Model

This document provides a comprehensive overview of the Unified Migration (UMIG) data model. It is designed to be a central reference for developers, architects, and anyone else interacting with the UMIG database.

## Core Design Philosophy: Canonical vs. Instance

The UMIG data model is built on a fundamental design principle: the strict separation of **Canonical (Master)** entities from **Instance (Execution)** entities.

- **Canonical Entities**: These are the master templates or "playbooks." They define *what* should be done, in what order, and who is responsible. They are reusable, version-controlled, and represent the standardized process for a migration. All canonical tables use the `_master_` suffix (e.g., `plans_master_plm`).

- **Instance Entities**: These are time-bound, execution-specific records. They represent a single, real-world "run" of a canonical plan, such as a disaster recovery test, a dress rehearsal, or the actual go-live event. They track *when* something was done, by whom, and what the outcome was. All instance tables use the `_instance_` suffix (e.g., `plans_instance_pli`).

This separation provides critical flexibility, allowing a single canonical plan to be executed multiple times for different purposes (iterations), with each execution having its own distinct history, status, and audit trail.

## Entity Hierarchy

The data model follows a clear hierarchical structure, flowing from high-level strategic projects down to granular, executable instructions.

### Label & Stream Assignment (Matrix Grouping for Steps)

In addition to the strict hierarchy, UMIG supports flexible, migration-specific grouping of canonical steps ("streams" or other labels) via a normalized label system:

> **labels_lbl_x_applications_app**: This join table enables flexible, many-to-many assignment of labels to applications, supporting categorization by business, technical, or operational perspective.

- **labels_lbl**: Stores labels scoped to a migration (fields: lbl_id, mig_id, lbl_name, lbl_description, lbl_color, created_at, created_by).
- **labels_lbl_x_steps_master_stm**: Join table linking labels to canonical steps (fields: lbl_x_stm_id, lbl_id, stm_id, created_at, created_by).
- **labels_lbl_x_applications_app**: Join table linking labels to applications for flexible categorization (fields: lbl_x_app_id, lbl_id, app_id, created_at, created_by).
- Each label is unique within a migration. Steps can have multiple labels, and labels can be reused across steps within the same migration.
- This enables matrix/faceted views such as "streams" for steps, supporting advanced planning and reporting.


### 1. The Strategic Layer

- **Migration (`migrations_mig`)**: The highest-level container representing a complete strategic initiative (e.g., "Data Center Consolidation 2025"). It has a business owner and a final cutover date.
- **Iteration (`iterations_ite`)**: A specific, time-bound execution event under a Migration (e.g., "Go-Live Weekend," "Q3 Disaster Recovery Test"). It has its own technical cutover dates and is linked to a specific set of environments.

### 2. The Canonical (Master) Layer

This layer defines 

#### Table: step_pilot_comments_spc

- **Purpose:** Stores accrued comments, tips, and recommendations for each canonical step, specifically for pilots and release managers. These are distinct from formal instructions and intended to capture operational wisdom and context.
- **Fields:**
  - `spc_id`: Primary key.
  - `stm_id`: Foreign key to `steps_master_stm` (the step this comment relates to).
  - `comment_body`: The comment or tip content.
  - `author`: (Optional) Who wrote the comment.
  - `created_at`: Timestamp of creation.
  - `visibility`: Intended audience (default: 'pilot').

**Relationship:**  
Each `steps_master_stm` row can have zero or more related `step_pilot_comments_spc` rows (one-to-many).

**ERD Update:**  
Add a one-to-many arrow from `steps_master_stm` to `step_pilot_comments_spc`.

the reusable playbook.

- **Plan (`plans_master_plm`)**: The master playbook containing the end-to-end set of procedures.
- **Sequence (`sequences_master_sqm`)**: A major chapter in the plan (e.g., "Pre-Migration Setup," "Application Failover").
- **Phase (`phases_master_phm`)**: A distinct stage of work within a sequence (e.g., "Configure Network ACLs," "Start Database Replication").
- **Control (`controls_master_ctm`)**: A quality gate or verification checkpoint linked to a **Phase**. It defines a standard check that must be performed (e.g., "Verify End-to-End Connectivity").
- **Step (`steps_master_stm`)**: A granular, executable task within a phase (e.g., "Restart the primary application server").
- **Instruction (`instructions_master_inm`)**: The most detailed level of the playbook, providing the specific command or procedure for a step. An instruction can be optionally linked to a master **Control** to indicate that this specific procedure satisfies the phase-level quality check.

### 3. The Instance (Execution) Layer

This layer defines 

#### Table: step_instance_comments_sic

- **Purpose:** Stores user comments on the execution of a specific step instance (`steps_instance_sti`). Enables collaborative, auditable commentary during plan/iteration runs.
- **Fields:**
  - `sic_id`: Primary key.
  - `sti_id`: Foreign key to `steps_instance_sti` (the executed step).
  - `comment_body`: The comment text (long, unbounded).
  - `created_by`: User who wrote the comment (FK to `users_usr`).
  - `created_at`: Timestamp of creation.
  - `updated_by`: User who last edited (nullable, FK to `users_usr`).
  - `updated_at`: Timestamp of last update (nullable).

**Relationship:**  
Each `steps_instance_sti` row can have zero or more related `step_instance_comments_sic` rows (one-to-many).

**ERD Update:**  
Add a one-to-many arrow from `steps_instance_sti` to `step_instance_comments_sic`.

a direct, time-stamped snapshot of the canonical layer for a specific iteration.

- **Plan Instance (`plans_instance_pli`)**: A snapshot of a master plan, created for and linked to a single **Iteration**.
- **Sequence Instance (`sequences_instance_sqi`)**: An instance of a sequence for a specific plan instance.
- **Phase Instance (`phases_instance_phi`)**: An instance of a phase.
- **Step Instance (`steps_instance_sti`)**: An instance of a step, where status (e.g., 'COMPLETED', 'FAILED') is tracked.
- **Instruction Instance (`instructions_instance_ini`)**: The record of a specific instruction being performed at a specific time by a specific user.
- **Control Instance (`controls_instance_cti`)**: The record of a control being executed, linked directly to the **Step Instance** it validates. This provides an audit trail confirming that the phase-level quality check was performed for a given step.

## Entity Relationship Diagram (ERD)

The following ERD illustrates the relationships between all entities in the UMIG data model.

```mermaid
erDiagram
    labels_lbl_x_applications_app }o--|| labels_lbl : "label"
    labels_lbl_x_applications_app }o--|| applications_app : "application"
    applications_app {
        INT app_id PK
        VARCHAR app_code
        VARCHAR app_name
        TEXT app_description
    }

    environments_env {
        INT env_id PK
        VARCHAR env_code
        VARCHAR env_name
        TEXT env_description
    }

    teams_tms {
        INT tms_id PK
        VARCHAR tms_name
        VARCHAR tms_email
        TEXT tms_description
    }

    users_usr {
        INT usr_id PK
        INT tms_id FK
        VARCHAR usr_trigram
        VARCHAR usr_first_name
        VARCHAR usr_last_name
        VARCHAR usr_email
    }

    roles_rls {
        INT rls_id PK
        VARCHAR rls_name
    }

    environment_roles_enr {
        INT enr_id PK
        VARCHAR enr_name
    }

    step_types_stt {
        VARCHAR stt_code PK
        VARCHAR stt_name
    }

    iteration_types_itt {
        VARCHAR itt_code PK
        VARCHAR itt_name
    }

    migrations_mig {
        UUID mig_id PK
        UUID usr_id_owner FK
        VARCHAR mig_name
        TEXT mig_description
        DATE mig_business_cutover_date
    }

    iterations_ite {
        UUID ite_id PK
        UUID mig_id FK
        VARCHAR ite_name
        TEXT ite_description
        TIMESTAMPTZ ite_static_cutover_date
        TIMESTAMPTZ ite_dynamic_cutover_date
    }

    plans_master_plm {
        UUID plm_id PK
        INT tms_id FK
        VARCHAR plm_name
        TEXT plm_description
    }

    sequences_master_sqm {
        UUID sqm_id PK
        UUID plm_id FK
        INT sqm_order
        VARCHAR sqm_name
        UUID predecessor_sqm_id FK
    }

    phases_master_phm {
        UUID phm_id PK
        UUID sqm_id FK
        INT phm_order
        VARCHAR phm_name
        UUID predecessor_phm_id FK
    }

    steps_master_stm {
        UUID stm_id PK
        UUID phm_id FK
        INT tms_id_owner FK
        VARCHAR stt_code FK
        INT stm_number
        VARCHAR stm_name
        UUID stm_id_predecessor FK
    }

    controls_master_ctm {
        UUID ctm_id PK
        UUID phm_id FK
        INT ctm_order
        VARCHAR ctm_name
        VARCHAR ctm_type
        BOOLEAN ctm_is_critical
    }

    instructions_master_inm {
        UUID inm_id PK
        UUID stm_id FK
        INT tms_id FK
        UUID ctm_id FK
        INT inm_order
        TEXT inm_body
    }

    %% Instance Tables

    plans_instance_pli {
        UUID pli_id PK
        UUID plm_id FK
        UUID ite_id FK
        VARCHAR pli_name
    }

    sequences_instance_sqi {
        UUID sqi_id PK
        UUID pli_id FK
        UUID sqm_id FK
    }

    phases_instance_phi {
        UUID phi_id PK
        UUID sqi_id FK
        UUID phm_id FK
    }

    steps_instance_sti {
        UUID sti_id PK
        UUID phi_id FK
        UUID stm_id FK
    }

    instructions_instance_ini {
        UUID ini_id PK
        UUID sti_id FK
        UUID inm_id FK
    }

    controls_instance_cti {
        UUID cti_id PK
        UUID sti_id FK
        UUID ctm_id FK
    }

    %% Join Tables

    teams_tms_x_applications_app {
        INT tms_id FK
        INT app_id FK
    }

    environments_env_x_applications_app {
        INT env_id FK
        INT app_id FK
    }

    environments_env_x_iterations_ite {
        UUID ite_id FK
        INT env_id FK
        INT enr_id FK
    }

    steps_master_stm_x_iteration_types_itt {
        UUID stm_id FK
        VARCHAR itt_code FK
    }

    steps_master_stm_x_teams_tms_impacted {
        UUID stm_id FK
        INT tms_id FK
    }

    %% Relationships

    users_usr }o--|| teams_tms : "belongs to"
    migrations_mig }o--|| users_usr : "owned by"
    iterations_ite }o--|| migrations_mig : "belongs to"
    plans_master_plm }o--|| teams_tms : "owned by"
    sequences_master_sqm }o--|| plans_master_plm : "belongs to"
    phases_master_phm }o--|| sequences_master_sqm : "belongs to"
    steps_master_stm }o--|| phases_master_phm : "belongs to"
    steps_master_stm }o--|| teams_tms : "owned by"
    steps_master_stm }o--|| step_types_stt : "is of type"
    controls_master_ctm }o--|| phases_master_phm : "validates"
    instructions_master_inm }o--|| steps_master_stm : "details"
    instructions_master_inm }o--|| teams_tms : "owned by"
    instructions_master_inm }o--|| controls_master_ctm : "can satisfy"

    plans_instance_pli }o--|| plans_master_plm : "instantiates"
    plans_instance_pli }o--|| iterations_ite : "executes for"
    sequences_instance_sqi }o--|| plans_instance_pli : "part of"
    sequences_instance_sqi }o--|| sequences_master_sqm : "instantiates"
    phases_instance_phi }o--|| sequences_instance_sqi : "part of"
    phases_instance_phi }o--|| phases_master_phm : "instantiates"
    steps_instance_sti }o--|| phases_instance_phi : "part of"
    steps_instance_sti }o--|| steps_master_stm : "instantiates"
    instructions_instance_ini }o--|| steps_instance_sti : "part of"
    instructions_instance_ini }o--|| instructions_master_inm : "instantiates"
    controls_instance_cti }o--|| steps_instance_sti : "validates"
    controls_instance_cti }o--|| controls_master_ctm : "instantiates"

    teams_tms_x_applications_app }o--|| teams_tms : ""
    teams_tms_x_applications_app }o--|| applications_app : ""
    environments_env_x_applications_app }o--|| environments_env : ""
    environments_env_x_applications_app }o--|| applications_app : ""
    environments_env_x_iterations_ite }o--|| environments_env : ""
    environments_env_x_iterations_ite }o--|| iterations_ite : ""
    environments_env_x_iterations_ite }o--|| environment_roles_enr : ""
    steps_master_stm_x_iteration_types_itt }o--|| steps_master_stm : ""
    steps_master_stm_x_iteration_types_itt }o--|| iteration_types_itt : ""
    steps_master_stm_x_teams_tms_impacted }o--|| steps_master_stm : ""
    steps_master_stm_x_teams_tms_impacted }o--|| teams_tms : ""
