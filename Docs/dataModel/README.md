# UMIG Data Model

This document provides a comprehensive overview of the UMIG application's PostgreSQL database schema. The schema is managed via Liquibase, with the baseline defined in [`001_baseline_schema.sql`](../../local-dev-setup/liquibase/changelogs/001_baseline_schema.sql).

This model is a direct translation of the original SQL Server schema, located at [`docs/dataModel/sql/UMIG.sql`](./sql/UMIG.sql).

## Schema Overview

The database consists of 19 tables designed to manage migration plans, steps, teams, applications, and related metadata.

### Naming Conventions

-   **Tables**: Suffixes are used to denote the entity type (e.g., `_tms` for teams, `_app` for applications).
-   **Columns**: Foreign key columns are named after the entity they reference, followed by `_id` (e.g., `tms_id`, `app_id`).
-   **Primary Keys**: All tables use a surrogate `id` column of type `SERIAL` as the primary key, except for `environments_env` which uses a natural key.

## Entity Relationship Diagram (ERD)

```mermaid
erDiagram
  environments_iterations_eit {
    int id PK
    varchar env_id FK
    int ite_id FK
    varchar eit_role
  }
  additional_instructions_ais {
    int id PK
    int stp_id FK
    text instructions
    int usr_id FK
    int ite_id FK
  }
  applications_app {
    int id PK
    varchar app_code
    varchar app_name
    text app_description
  }
  chapter_cha {
    int id PK
    varchar cha_code
    varchar cha_name
    int sqc_id FK
    int cha_previous FK
    timestamp cha_start_date
    timestamp cha_end_date
    timestamp cha_effective_start_date
    timestamp cha_effective_end_date
  }
  controls_ctl {
    int id PK
    varchar ctl_code
    text ctl_name
    int ctl_producer
    int ctl_it_validator
    text ctl_it_comments
    text ctl_biz_comments
    int ctl_biz_validator
  }
  environments_env {
    varchar id PK
    varchar env_code
    varchar env_name
    text env_description
  }
  environments_applications_eap {
    int id PK
    varchar env_id FK
    int app_id FK
    text comments
  }
  instructions_ins {
    int id PK
    varchar ins_code
    text ins_description
    int stp_id FK
    int tms_id FK
    int ctl_id FK
  }
  iterations_ite {
    int id PK
    varchar ite_code
    varchar ite_name
    int mig_id FK
    varchar ite_type
    text description
    timestamp ite_start_date
    timestamp ite_end_date
  }
  iterations_tracking_itt {
    varchar id PK
    varchar mig_code
    varchar ite_code
    varchar entity_type
    varchar entity_id
    varchar entity_status
    timestamp start_date
    timestamp end_date
    text comments
  }
  migrations_mig {
    int id PK
    varchar mig_code
    varchar mig_name
    text mig_description
    timestamp mig_planned_start_date
    timestamp mig_planned_end_date
    enum mty_type
  }
  release_notes_rnt {
    int id PK
    varchar rnt_code
    varchar rnt_name
    text rnt_description
    timestamp rnt_date
  }
  roles_rls {
    int id PK
    varchar rle_code
    varchar rle_name
    text rle_description
  }
  sequences_sqc {
    int id PK
    int mig_id FK
    int ite_id FK
    varchar sqc_name
    int sqc_order
    timestamp start_date
    timestamp end_date
    int sqc_previous FK
  
    int id PK
    int mig_id FK
    varchar sqc_name
    int sqc_order
    timestamp start_date
    timestamp end_date
    int sqc_previous
  }
  status_sts {
    int id PK
    varchar sts_code
    varchar sts_name
    text sts_description
  }
  steps_stp {
    int id PK
    varchar stp_code
    varchar stp_name
    int cha_id FK
    int tms_id FK
    int stt_type FK
    int stp_previous
    text stp_description
    int sts_id FK
    int owner_id FK
    varchar target_env FK
  }
  step_type_stt {
    int id PK
    varchar stt_code
    varchar stt_name
    text stt_description
  }
  teams_tms {
    int id PK
    varchar tms_code
    varchar tms_name
    text tms_description
    varchar tms_email
  }
  teams_applications_tap {
    int id PK
    int tms_id FK
    int app_id FK
  }
  users_usr {
    int id PK
    varchar usr_first_name
    varchar usr_last_name
    varchar usr_trigram
    varchar usr_email
    int tms_id FK
    int rle_id FK
  }

  additional_instructions_ais }|--|| steps_stp : "to step"
  additional_instructions_ais }|--|| users_usr : "by user"
  additional_instructions_ais }o--o| iterations_ite : "for iteration"
  chapter_cha }o--o| sequences_sqc : "in sequence"
  chapter_cha }o--o| chapter_cha : "follows"
  environments_applications_eap }|--|| environments_env : "links"
  environments_applications_eap }|--|| applications_app : "links"
  environments_iterations_eit }|--|| environments_env : "links"
  environments_iterations_eit }|--|| iterations_ite : "links"
  instructions_ins }|--|| steps_stp : "for step"
  instructions_ins }o--o| teams_tms : "for team"
  instructions_ins }o--o| controls_ctl : "has control"
  iterations_ite }|--|| migrations_mig : "part of migration"
  migrations_mig }o--o| migration_type_mty : "has type"
  sequences_sqc }|--|| migrations_mig : "for migration"
  sequences_sqc }|--|| iterations_ite : "for iteration"
  sequences_sqc }o--o| sequences_sqc : "previous sequence"
  steps_stp }o--o| chapter_cha : "in chapter"
  steps_stp }o--o| teams_tms : "assigned to team"
  steps_stp }o--o| step_type_stt : "has type"
  steps_stp }o--o| steps_stp : "previous step"
  steps_stp }o--o| status_sts : "has status"
  steps_stp }o--o| users_usr : "owned by"
  steps_stp }o--o| environments_env : "targets"
  teams_applications_tap }|--|| teams_tms : "links"
  teams_applications_tap }|--|| applications_app : "links"
  users_usr }o--o| roles_rls : "has role"
  users_usr }o--o| teams_tms : "member of team"
```

## Table and Field Listing

#### **RELEASE_NOTES_RNT**
- `id` SERIAL PRIMARY KEY
- `rnt_code` VARCHAR(10)
- `rnt_name` VARCHAR(64)
- `rnt_description` TEXT
- `rnt_date` TIMESTAMP


#### **ADDITIONAL_INSTRUCTIONS_AIS**
- `id` SERIAL PRIMARY KEY
- `stp_id` INTEGER NOT NULL
- `instructions` TEXT
- `usr_id` INTEGER NOT NULL
- `ite_id` INTEGER

#### **APPLICATIONS_APP**
- `id` SERIAL PRIMARY KEY
- `app_code` VARCHAR(50) NOT NULL
- `app_name` VARCHAR(10)
- `app_description` TEXT

#### **CHAPTER_CHA**
- `id` SERIAL PRIMARY KEY
- `cha_code` VARCHAR(10)
- `cha_name` VARCHAR(10)
- `sqc_id` INTEGER
- `cha_previous` INTEGER
- `cha_start_date` TIMESTAMP
- `cha_end_date` TIMESTAMP
- `cha_effective_start_date` TIMESTAMP
- `cha_effective_end_date` TIMESTAMP

#### **CONTROLS_CTL**
- `id` SERIAL PRIMARY KEY
- `ctl_code` VARCHAR(10)
- `ctl_name` TEXT
- `ctl_producer` INTEGER
- `ctl_it_validator` INTEGER
- `ctl_it_comments` TEXT
- `ctl_biz_comments` TEXT
- `ctl_biz_validator` INTEGER

#### **ENVIRONMENTS_ENV**
- `id` VARCHAR(10) PRIMARY KEY
- `env_code` VARCHAR(10)
- `env_name` VARCHAR(64)
- `env_description` TEXT

#### **ENVIRONMENTS_APPLICATIONS_EAP**
- `id` SERIAL PRIMARY KEY
- `env_id` VARCHAR(10) NOT NULL
- `app_id` INTEGER NOT NULL
- `comments` TEXT

#### **ENVIRONMENTS_ITERATIONS_EIT**
- `id` SERIAL PRIMARY KEY
- `env_id` VARCHAR(10) NOT NULL
- `ite_id` INTEGER NOT NULL
- `eit_role` VARCHAR(10)

#### **INSTRUCTIONS_INS**
- `id` SERIAL PRIMARY KEY
- `ins_code` VARCHAR(10)
- `ins_description` TEXT
- `stp_id` INTEGER NOT NULL
- `tms_id` INTEGER
- `ctl_id` INTEGER

#### **ITERATIONS_ITE**
- `id` SERIAL PRIMARY KEY
- `ite_code` VARCHAR(10)
- `ite_name` VARCHAR(64)
- `mig_id` INTEGER
- `ite_type` VARCHAR(16)
- `description` TEXT
- `ite_start_date` TIMESTAMP
- `ite_end_date` TIMESTAMP

#### **ITERATIONS_TRACKING_ITT**
- `id` VARCHAR(10) PRIMARY KEY
- `mig_code` VARCHAR(10)
- `ite_code` VARCHAR(10)
- `entity_type` VARCHAR(10)
- `entity_id` VARCHAR(10)
- `entity_status` VARCHAR(10)
- `start_date` TIMESTAMP
- `end_date` TIMESTAMP
- `comments` TEXT

#### **MIGRATIONS_MIG**
- `id` SERIAL PRIMARY KEY
- `mig_code` VARCHAR(10)
- `mig_name` VARCHAR(128)
- `mig_description` TEXT
- `mig_planned_start_date` TIMESTAMP
- `mig_planned_end_date` TIMESTAMP
- `mty_type` ENUM('EXTERNAL', 'INTERNAL')

> **Note:** The migration type is now an ENUM (`migration_type_enum`) with allowed values: 'EXTERNAL', 'INTERNAL'. The `migration_type_mty` table has been removed for simplicity and clarity.

#### **ROLES_RLS**
- `id` SERIAL PRIMARY KEY
- `rle_code` VARCHAR(10)
- `rle_name` VARCHAR(64)
- `rle_description` TEXT

#### **SEQUENCES_SQC**
- `id`: Surrogate PK
- `mig_id`: FK to `migrations_mig.id`
- `ite_id`: FK to `iterations_ite.id` (**NEW: links sequence to its iteration**)
- `sqc_name`: Sequence name
- `sqc_order`: Sequence order within iteration
- `start_date`, `end_date`: Sequence timing
- `sqc_previous`: FK to previous sequence (if any)

- `id` SERIAL PRIMARY KEY
- `mig_id` INTEGER NOT NULL
- `sqc_name` VARCHAR(255)
- `sqc_order` INTEGER
- `start_date` TIMESTAMP
- `end_date` TIMESTAMP
- `sqc_previous` INTEGER

#### **STATUS_STS**
- `id` SERIAL PRIMARY KEY
- `sts_code` VARCHAR(10)
- `sts_name` VARCHAR(64)
- `sts_description` TEXT

#### **STEPS_STP**
- `id` SERIAL PRIMARY KEY
- `stp_code` VARCHAR(10)
- `stp_name` VARCHAR(64)
- `cha_id` INTEGER
- `tms_id` INTEGER
- `stt_type` INTEGER
- `stp_previous` INTEGER
- `stp_description` TEXT
- `sts_id` INTEGER
- `owner_id` INTEGER
- `target_env` VARCHAR(10)

#### **STEP_TYPE_STT**
- `id` SERIAL PRIMARY KEY
- `stt_code` VARCHAR(10)
- `stt_name` VARCHAR(64)
- `stt_description` TEXT

#### **TEAMS_TMS**
- `id` SERIAL PRIMARY KEY
- `tms_code` VARCHAR(10)
- `tms_name` VARCHAR(64)
- `tms_description` TEXT
- `tms_email` VARCHAR(255)

#### **TEAMS_APPLICATIONS_TAP**
- `id` SERIAL PRIMARY KEY
- `tms_id` INTEGER NOT NULL
- `app_id` INTEGER NOT NULL

#### **USERS_USR**
- `id` SERIAL PRIMARY KEY
- `usr_first_name` VARCHAR(64)
- `usr_last_name` VARCHAR(64)
- `usr_trigram` VARCHAR(3)
- `usr_email` VARCHAR(128)
- `rle_id` INTEGER
- `tms_id` INTEGER
