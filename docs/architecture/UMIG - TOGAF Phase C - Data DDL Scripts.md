# UMIG Data Architecture - DDL Scripts and Schema Definitions

**Version:** 2.4  
**Date:** September 9, 2025  
**Status:** ✅ COMPLETE - 100% Coverage (55/55 tables, 85+ foreign keys, 140+ indexes)  
**TOGAF Phase:** Phase C - Data Architecture  
**Source of Truth:** `/docs/dataModel/umig_app_db.sql`

## Executive Summary

This document contains the complete DDL (Data Definition Language) scripts for the UMIG database schema, comprehensively updated from the PostgreSQL source of truth. All 55 tables are documented with complete CREATE TABLE statements, all 85+ foreign key constraints, and 140+ indexes. This represents 100% coverage of the database schema with production-ready DDL scripts including US-034 Enhanced Data Import Architecture (7 tables) and Sprint 6 Type Management enhancements (US-042/043).

## 1. Critical Schema Notes

### 1.1 Status Field Normalization ✅ IMPLEMENTED

**All status fields are normalized to INTEGER foreign keys referencing status_sts table:**

- `mig_status` → INTEGER FK to `status_sts(sts_id)`
- `ite_status` → INTEGER FK to `status_sts(sts_id)`
- `pli_status` → INTEGER FK to `status_sts(sts_id)`
- `sqi_status` → INTEGER FK to `status_sts(sts_id)`
- `phi_status` → INTEGER FK to `status_sts(sts_id)`
- `sti_status` → INTEGER FK to `status_sts(sts_id)`
- `cti_status` → INTEGER FK to `status_sts(sts_id)`

### 1.2 Table Count: 55 Tables Total

**Categories:**

- **Core Business Tables:** 25 tables
- **Association/Junction Tables:** 7 tables
- **Staging Tables:** 9 tables (stg_steps, stg_step_instructions, + 7 US-034 tables)
- **System Tables:** 4 tables (Liquibase, audit, system config)
- **Lookup/Reference Tables:** 6 tables (includes migration_types_mit from Migration 029)
- **Enhanced Tables:** 4 tables (migration 028-029 updates)

## 2. Lookup/Reference Tables (Create First - No Dependencies)

### 2.1 Status Management Table

```sql
-- Status management table (CENTRAL REFERENCE)
DROP TABLE IF EXISTS "public"."status_sts";
CREATE SEQUENCE IF NOT EXISTS status_sts_sts_id_seq;

CREATE TABLE "public"."status_sts" (
    "sts_id" int4 NOT NULL DEFAULT nextval('status_sts_sts_id_seq'::regclass),
    "sts_name" varchar(50) NOT NULL,
    "sts_color" varchar(7) NOT NULL CHECK ((sts_color)::text ~ '^#[0-9A-Fa-f]{6}$'::text),
    "sts_type" varchar(20) NOT NULL CHECK ((sts_type)::text = ANY ((ARRAY['Migration'::character varying, 'Iteration'::character varying, 'Plan'::character varying, 'Sequence'::character varying, 'Phase'::character varying, 'Step'::character varying, 'Control'::character varying])::text[])),
    "created_date" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_date" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "created_by" varchar(100) DEFAULT 'system'::character varying,
    "updated_by" varchar(100) DEFAULT 'system'::character varying,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("sts_id")
);

-- Comments
COMMENT ON TABLE "public"."status_sts" IS 'Centralized status management for all entity types with color coding';
COMMENT ON COLUMN "public"."status_sts"."sts_id" IS 'Primary key for status records';
COMMENT ON COLUMN "public"."status_sts"."sts_name" IS 'Status name (e.g., PENDING, IN_PROGRESS, COMPLETED)';
COMMENT ON COLUMN "public"."status_sts"."sts_color" IS 'Hex color code for UI display (#RRGGBB format)';
COMMENT ON COLUMN "public"."status_sts"."sts_type" IS 'Entity type this status applies to (Migration, Plan, Step, etc.)';

-- Indexes
CREATE UNIQUE INDEX uq_status_sts_name_type ON public.status_sts USING btree (sts_name, sts_type);
CREATE INDEX idx_status_sts_type ON public.status_sts USING btree (sts_type);
CREATE INDEX idx_status_sts_name ON public.status_sts USING btree (sts_name);
```

### 2.2 Step Types Table

```sql
-- Step types lookup
DROP TABLE IF EXISTS "public"."step_types_stt";
CREATE TABLE "public"."step_types_stt" (
    "stt_code" varchar(3) NOT NULL,
    "stt_name" varchar(50) NOT NULL,
    "stt_description" text,
    "created_by" varchar(255) DEFAULT 'system'::character varying,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_by" varchar(255) DEFAULT 'system'::character varying,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("stt_code")
);

-- Comments
COMMENT ON TABLE "public"."step_types_stt" IS 'Step type definitions (e.g., DB, APP, CHK)';
```

### 2.3 Iteration Types Table ✅ ENHANCED (Migration 028)

```sql
-- Iteration types lookup (Enhanced US-043 Phase 1)
DROP TABLE IF EXISTS "public"."iteration_types_itt";
CREATE TABLE "public"."iteration_types_itt" (
    "itt_code" varchar(10) NOT NULL,
    "itt_name" varchar(100) NOT NULL,
    -- Enhanced management fields (Migration 028)
    "itt_description" TEXT,
    "itt_color" VARCHAR(10) DEFAULT '#6B73FF',
    "itt_icon" VARCHAR(50) DEFAULT 'play-circle',
    "itt_display_order" INTEGER DEFAULT 0,
    "itt_active" BOOLEAN DEFAULT TRUE,
    -- Audit fields (existing from migration 016)
    "created_by" varchar(255) DEFAULT 'system'::character varying,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_by" varchar(255) DEFAULT 'system'::character varying,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("itt_code")
);

-- Comments
COMMENT ON TABLE "public"."iteration_types_itt" IS 'Iteration type definitions with enhanced management capabilities (US-043)';
COMMENT ON COLUMN "public"."iteration_types_itt"."itt_code" IS 'Unique iteration type code (e.g., RUN, DR, CUTOVER)';
COMMENT ON COLUMN "public"."iteration_types_itt"."itt_name" IS 'Human-readable iteration type name';
COMMENT ON COLUMN "public"."iteration_types_itt"."itt_description" IS 'Detailed description of iteration type purpose';
COMMENT ON COLUMN "public"."iteration_types_itt"."itt_color" IS 'Hex color code for UI representation (#RRGGBB format)';
COMMENT ON COLUMN "public"."iteration_types_itt"."itt_icon" IS 'Icon identifier for UI representation (Font Awesome style)';
COMMENT ON COLUMN "public"."iteration_types_itt"."itt_display_order" IS 'Sort order for UI display (lower numbers first)';
COMMENT ON COLUMN "public"."iteration_types_itt"."itt_active" IS 'Whether this iteration type is available for selection';

-- Enhanced indexes (Migration 028)
CREATE INDEX idx_iteration_types_display_order ON public.iteration_types_itt USING btree (itt_display_order, itt_active);
CREATE INDEX idx_iteration_types_active ON public.iteration_types_itt USING btree (itt_active);

-- Default data with enhancements
INSERT INTO iteration_types_itt (itt_code, itt_name, itt_description, itt_color, itt_icon, itt_display_order, itt_active, created_by) VALUES
('RUN', 'Production Run', 'Production run iteration - Execute the actual migration plan', '#2E7D32', 'play-circle', 1, TRUE, 'system'),
('DR', 'Dress Rehearsal', 'Dress rehearsal iteration - Practice run before cutover', '#F57C00', 'refresh', 2, TRUE, 'system'),
('CUTOVER', 'Final Cutover', 'Final cutover iteration - Live production migration', '#C62828', 'check-circle', 3, TRUE, 'system');
```

### 2.4 Roles Table

```sql
-- Roles lookup
DROP TABLE IF EXISTS "public"."roles_rls";
CREATE SEQUENCE IF NOT EXISTS roles_rls_rls_id_seq;

CREATE TABLE "public"."roles_rls" (
    "rls_id" int4 NOT NULL DEFAULT nextval('roles_rls_rls_id_seq'::regclass),
    "rls_code" varchar(10),
    "rls_description" text,
    "created_by" varchar(255) DEFAULT 'system'::character varying,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_by" varchar(255) DEFAULT 'system'::character varying,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("rls_id")
);

-- Indexes
CREATE UNIQUE INDEX roles_rls_rls_code_key ON public.roles_rls USING btree (rls_code);
```

### 2.5 Environment Roles Table

```sql
-- Environment Roles lookup
DROP TABLE IF EXISTS "public"."environment_roles_enr";
CREATE SEQUENCE IF NOT EXISTS environment_roles_enr_enr_id_seq;

CREATE TABLE "public"."environment_roles_enr" (
    "enr_id" int4 NOT NULL DEFAULT nextval('environment_roles_enr_enr_id_seq'::regclass),
    "enr_name" varchar(50) NOT NULL,
    "enr_description" text,
    "created_by" varchar(255) DEFAULT 'system'::character varying,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_by" varchar(255) DEFAULT 'system'::character varying,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("enr_id")
);

-- Indexes
CREATE UNIQUE INDEX environment_roles_enr_enr_name_key ON public.environment_roles_enr USING btree (enr_name);
```

### 2.6 Migration Types Master Table ✅ NEW (Migration 029)

```sql
-- Migration Types Master (US-042 Phase 2)
DROP TABLE IF EXISTS "public"."migration_types_mit";

CREATE TABLE "public"."migration_types_mit" (
    -- Primary key
    "mit_id" SERIAL PRIMARY KEY,

    -- Business keys (unique identifiers for migration types)
    "mit_code" VARCHAR(20) NOT NULL UNIQUE,
    "mit_name" VARCHAR(100) NOT NULL,
    "mit_description" TEXT,

    -- Visual representation fields
    "mit_color" VARCHAR(10) DEFAULT '#6B73FF',
    "mit_icon" VARCHAR(50) DEFAULT 'layers',

    -- Management fields
    "mit_display_order" INTEGER DEFAULT 0,
    "mit_active" BOOLEAN DEFAULT TRUE,

    -- Audit fields (following ADR-016 standardization)
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(255),
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(255)
);

-- Comments
COMMENT ON TABLE "public"."migration_types_mit" IS 'US-042: Master configuration table for release types. Defines available release type templates with visual and management properties.';
COMMENT ON COLUMN "public"."migration_types_mit"."mit_id" IS 'Primary key - auto-incrementing ID';
COMMENT ON COLUMN "public"."migration_types_mit"."mit_code" IS 'Unique business code for migration type (e.g., INFRA, APP, DATA)';
COMMENT ON COLUMN "public"."migration_types_mit"."mit_name" IS 'Human-readable name for migration type';
COMMENT ON COLUMN "public"."migration_types_mit"."mit_description" IS 'Detailed description of migration type purpose and usage';
COMMENT ON COLUMN "public"."migration_types_mit"."mit_color" IS 'Hex color code for UI representation (#RRGGBB format)';
COMMENT ON COLUMN "public"."migration_types_mit"."mit_icon" IS 'Icon identifier for UI representation (Font Awesome style)';
COMMENT ON COLUMN "public"."migration_types_mit"."mit_display_order" IS 'Sort order for UI display (lower numbers first)';
COMMENT ON COLUMN "public"."migration_types_mit"."mit_active" IS 'Whether this migration type is available for selection';

-- Indexes
CREATE INDEX idx_migration_types_display_order ON public.migration_types_mit USING btree (mit_display_order, mit_active);
CREATE INDEX idx_migration_types_active ON public.migration_types_mit USING btree (mit_active);
CREATE INDEX idx_migration_types_code ON public.migration_types_mit USING btree (mit_code);

-- Default data (8 predefined types)
INSERT INTO migration_types_mit (mit_code, mit_name, mit_description, mit_color, mit_icon, mit_display_order, mit_active, created_by) VALUES
('INFRASTRUCTURE', 'Infrastructure Release', 'Server, network, and infrastructure component releases requiring physical or virtual resource changes', '#E65100', 'server', 1, TRUE, 'system'),
('APPLICATION', 'Application Release', 'Software application deployments, upgrades, and configuration changes affecting business applications', '#1976D2', 'desktop', 2, TRUE, 'system'),
('DATABASE', 'Database Release', 'Database schema changes, data releases, and database platform upgrades requiring careful coordination', '#388E3C', 'database', 3, TRUE, 'system'),
('NETWORK', 'Network Release', 'Network configuration changes, routing updates, and connectivity modifications affecting system communication', '#7B1FA2', 'globe', 4, TRUE, 'system'),
('SECURITY', 'Security Release', 'Security system updates, access control changes, and compliance-related releases requiring special handling', '#D32F2F', 'shield', 5, TRUE, 'system'),
('INTEGRATION', 'Integration Release', 'API changes, interface modifications, and system integration updates affecting inter-system communication', '#F57C00', 'link', 6, TRUE, 'system'),
('ACQUISITION', 'Acquisition Data Migration', 'Migration of customer, positions and contracts data as part of an external acquisition', '#5D4037', 'life-ring', 7, TRUE, 'system'),
('DECOMMISSION', 'System Decommission', 'End-of-life system shutdown, data archival, and cleanup releases activities', '#616161', 'trash', 8, TRUE, 'system');
```

### 2.7 Liquibase System Tables

```sql
-- Liquibase change log tracking
DROP TABLE IF EXISTS "public"."databasechangelog";

CREATE TABLE "public"."databasechangelog" (
    "id" varchar(255) NOT NULL,
    "author" varchar(255) NOT NULL,
    "filename" varchar(255) NOT NULL,
    "dateexecuted" timestamp NOT NULL,
    "orderexecuted" int4 NOT NULL,
    "exectype" varchar(10) NOT NULL,
    "md5sum" varchar(35),
    "description" varchar(255),
    "comments" varchar(255),
    "tag" varchar(255),
    "liquibase" varchar(20),
    "contexts" varchar(255),
    "labels" varchar(255),
    "deployment_id" varchar(10)
);

-- Liquibase lock mechanism
DROP TABLE IF EXISTS "public"."databasechangeloglock";

CREATE TABLE "public"."databasechangeloglock" (
    "id" int4 NOT NULL,
    "locked" bool NOT NULL,
    "lockgranted" timestamp,
    "lockedby" varchar(255),
    PRIMARY KEY ("id")
);
```

## 3. Core Business Tables

### 3.1 Teams Table

```sql
-- Teams
DROP TABLE IF EXISTS "public"."teams_tms";
CREATE SEQUENCE IF NOT EXISTS teams_tms_tms_id_seq;

CREATE TABLE "public"."teams_tms" (
    "tms_id" int4 NOT NULL DEFAULT nextval('teams_tms_tms_id_seq'::regclass),
    "tms_name" varchar(64) NOT NULL,
    "tms_email" varchar(255),
    "tms_description" text,
    "created_by" varchar(255) DEFAULT 'system'::character varying,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_by" varchar(255) DEFAULT 'system'::character varying,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("tms_id")
);

-- Column Comments
COMMENT ON COLUMN "public"."teams_tms"."created_by" IS 'User trigram (usr_code) or system/generator/migration identifier';
COMMENT ON COLUMN "public"."teams_tms"."created_at" IS 'Timestamp when record was created';
COMMENT ON COLUMN "public"."teams_tms"."updated_by" IS 'User trigram (usr_code) who last updated the record';
COMMENT ON COLUMN "public"."teams_tms"."updated_at" IS 'Timestamp when record was last updated';
```

### 3.2 Users Table

```sql
-- Users
DROP TABLE IF EXISTS "public"."users_usr";
CREATE SEQUENCE IF NOT EXISTS users_usr_usr_id_seq;

CREATE TABLE "public"."users_usr" (
    "usr_id" int4 NOT NULL DEFAULT nextval('users_usr_usr_id_seq'::regclass),
    "usr_code" varchar(3) NOT NULL,
    "usr_first_name" varchar(50) NOT NULL,
    "usr_last_name" varchar(50) NOT NULL,
    "usr_email" varchar(255) NOT NULL,
    "usr_is_admin" bool DEFAULT false,
    "rls_id" int4,
    "usr_active" bool NOT NULL DEFAULT true,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "created_by" varchar(255) DEFAULT 'system'::character varying,
    "updated_by" varchar(255) DEFAULT 'system'::character varying,
    "usr_confluence_user_id" varchar(255),
    PRIMARY KEY ("usr_id")
);

-- Column Comments
COMMENT ON COLUMN "public"."users_usr"."usr_active" IS 'Indicates whether the user account is active (TRUE) or inactive (FALSE). Default is active.';
COMMENT ON COLUMN "public"."users_usr"."created_at" IS 'Timestamp when record was created';
COMMENT ON COLUMN "public"."users_usr"."updated_at" IS 'Timestamp when record was last updated';
COMMENT ON COLUMN "public"."users_usr"."created_by" IS 'User trigram (usr_code) or system/generator/migration identifier';
COMMENT ON COLUMN "public"."users_usr"."updated_by" IS 'User trigram (usr_code) who last updated the record';

-- Indexes
CREATE INDEX idx_usr_audit ON public.users_usr USING btree (created_at);
CREATE UNIQUE INDEX users_usr_usr_code_key ON public.users_usr USING btree (usr_code);
CREATE UNIQUE INDEX users_usr_usr_email_key ON public.users_usr USING btree (usr_email);
```

### 3.3 Migrations Table

```sql
-- Migrations (Strategic Level)
DROP TABLE IF EXISTS "public"."migrations_mig";

CREATE TABLE "public"."migrations_mig" (
    "mig_id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "usr_id_owner" int4 NOT NULL,
    "mig_name" varchar(255) NOT NULL,
    "mig_description" text,
    "mig_type" varchar(50) NOT NULL,
    "mig_start_date" date,
    "mig_end_date" date,
    "mig_business_cutover_date" date,
    "mig_status" int4 NOT NULL,
    "created_by" varchar(255) DEFAULT 'system'::character varying,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_by" varchar(255) DEFAULT 'system'::character varying,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("mig_id")
);

-- Column Comments
COMMENT ON COLUMN "public"."migrations_mig"."mig_status" IS 'Status ID referencing status_sts table (normalized from VARCHAR)';

-- Indexes
CREATE INDEX idx_migrations_mig_status_id ON public.migrations_mig USING btree (mig_status);
```

### 3.4 Iterations Table

```sql
-- Iterations (Time Windows)
DROP TABLE IF EXISTS "public"."iterations_ite";

CREATE TABLE "public"."iterations_ite" (
    "ite_id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "mig_id" uuid NOT NULL,
    "plm_id" uuid,
    "itt_code" varchar(10) NOT NULL,
    "ite_name" varchar(255) NOT NULL,
    "ite_description" text,
    "ite_start_date" date,
    "ite_end_date" date,
    "ite_status" int4 NOT NULL,
    "created_by" varchar(255) DEFAULT 'system'::character varying,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_by" varchar(255) DEFAULT 'system'::character varying,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("ite_id")
);

-- Column Comments
COMMENT ON COLUMN "public"."iterations_ite"."ite_status" IS 'Status ID referencing status_sts table (normalized from VARCHAR)';

-- Indexes
CREATE INDEX idx_iterations_ite_status_id ON public.iterations_ite USING btree (ite_status);
```

### 3.5 Applications Table

```sql
-- Applications registry
DROP TABLE IF EXISTS "public"."applications_app";
CREATE SEQUENCE IF NOT EXISTS applications_app_app_id_seq;

CREATE TABLE "public"."applications_app" (
    "app_id" int4 NOT NULL DEFAULT nextval('applications_app_app_id_seq'::regclass),
    "app_code" varchar(50) NOT NULL,
    "app_name" varchar(64),
    "app_description" text,
    "created_by" varchar(255) DEFAULT 'system'::character varying,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_by" varchar(255) DEFAULT 'system'::character varying,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("app_id")
);

-- Indexes
CREATE UNIQUE INDEX applications_app_app_code_key ON public.applications_app USING btree (app_code);
CREATE INDEX idx_app_audit ON public.applications_app USING btree (created_at);
```

### 3.6 Environments Table

```sql
-- Environments registry
DROP TABLE IF EXISTS "public"."environments_env";
CREATE SEQUENCE IF NOT EXISTS environments_env_env_id_seq;

CREATE TABLE "public"."environments_env" (
    "env_id" int4 NOT NULL DEFAULT nextval('environments_env_env_id_seq'::regclass),
    "env_code" varchar(10),
    "env_name" varchar(64),
    "env_description" text,
    "created_by" varchar(255) DEFAULT 'system'::character varying,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_by" varchar(255) DEFAULT 'system'::character varying,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("env_id")
);

-- Indexes
CREATE UNIQUE INDEX environments_env_env_code_key ON public.environments_env USING btree (env_code);
CREATE INDEX idx_env_audit ON public.environments_env USING btree (created_at);
```

## 4. Template (Master) Tables

### 4.1 Plans Master Table

```sql
-- Plans Master (Templates)
DROP TABLE IF EXISTS "public"."plans_master_plm";

CREATE TABLE "public"."plans_master_plm" (
    "plm_id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "tms_id" int4 NOT NULL,
    "plm_name" varchar(255) NOT NULL,
    "plm_description" text,
    "created_by" varchar(255) DEFAULT 'system'::character varying,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_by" varchar(255) DEFAULT 'system'::character varying,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "plm_status" int4 NOT NULL,
    PRIMARY KEY ("plm_id")
);

-- Column Comments
COMMENT ON COLUMN "public"."plans_master_plm"."plm_status" IS 'Status ID referencing status_sts table (normalized from VARCHAR)';

-- Indexes
CREATE INDEX idx_plans_master_plm_status_id ON public.plans_master_plm USING btree (plm_status);
```

### 4.2 Sequences Master Table

```sql
-- Sequences Master (Templates)
DROP TABLE IF EXISTS "public"."sequences_master_sqm";

CREATE TABLE "public"."sequences_master_sqm" (
    "sqm_id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "plm_id" uuid NOT NULL,
    "sqm_order" int4,
    "sqm_name" varchar(255),
    "sqm_description" text,
    "predecessor_sqm_id" uuid,
    "created_by" varchar(255) DEFAULT 'system'::character varying,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_by" varchar(255) DEFAULT 'system'::character varying,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("sqm_id")
);

-- Indexes
CREATE INDEX idx_sqm_audit ON public.sequences_master_sqm USING btree (created_at);
```

### 4.3 Phases Master Table

```sql
-- Phases Master (Templates)
DROP TABLE IF EXISTS "public"."phases_master_phm";

CREATE TABLE "public"."phases_master_phm" (
    "phm_id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "sqm_id" uuid NOT NULL,
    "phm_order" int4,
    "phm_name" varchar(255),
    "phm_description" text,
    "predecessor_phm_id" uuid,
    "created_by" varchar(255) DEFAULT 'system'::character varying,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_by" varchar(255) DEFAULT 'system'::character varying,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("phm_id")
);

-- Indexes
CREATE INDEX idx_phm_audit ON public.phases_master_phm USING btree (created_at);
```

### 4.4 Steps Master Table

```sql
-- Steps Master (Templates)
DROP TABLE IF EXISTS "public"."steps_master_stm";

CREATE TABLE "public"."steps_master_stm" (
    "stm_id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "phm_id" uuid NOT NULL,
    "tms_id_owner" int4,
    "stt_code" varchar(3),
    "stm_number" int4,
    "stm_code" varchar(50),
    "stm_name" varchar(255),
    "stm_description" text,
    "stm_duration_minutes" int4,
    "stm_id_predecessor" uuid,
    "enr_id_target" int4,
    "enr_id" int4,
    "created_by" varchar(255) DEFAULT 'system'::character varying,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_by" varchar(255) DEFAULT 'system'::character varying,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("stm_id")
);

-- Indexes
CREATE UNIQUE INDEX steps_master_stm_phm_id_stt_code_stm_number_key ON public.steps_master_stm USING btree (phm_id, stt_code, stm_number);
CREATE INDEX idx_steps_master_stm_enr_id ON public.steps_master_stm USING btree (enr_id);
CREATE INDEX idx_stm_audit ON public.steps_master_stm USING btree (created_at);
```

### 4.5 Controls Master Table

```sql
-- Controls Master (Templates)
DROP TABLE IF EXISTS "public"."controls_master_ctm";

CREATE TABLE "public"."controls_master_ctm" (
    "ctm_id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "phm_id" uuid NOT NULL,
    "ctm_code" varchar(50),
    "ctm_order" int4,
    "ctm_name" varchar(255),
    "ctm_description" text,
    "ctm_type" varchar(50),
    "ctm_is_critical" bool DEFAULT false,
    "created_by" varchar(255) DEFAULT 'system'::character varying,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_by" varchar(255) DEFAULT 'system'::character varying,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("ctm_id")
);

-- Indexes
CREATE UNIQUE INDEX uq_ctm_code ON public.controls_master_ctm USING btree (ctm_code);
CREATE INDEX idx_ctm_audit ON public.controls_master_ctm USING btree (created_at);
```

### 4.6 Instructions Master Table

```sql
-- Instructions Master (Templates)
DROP TABLE IF EXISTS "public"."instructions_master_inm";

CREATE TABLE "public"."instructions_master_inm" (
    "inm_id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "stm_id" uuid NOT NULL,
    "tms_id" int4,
    "ctm_id" uuid,
    "inm_order" int4 NOT NULL,
    "inm_body" text,
    "inm_duration_minutes" int4,
    "created_by" varchar(255) DEFAULT 'system'::character varying,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_by" varchar(255) DEFAULT 'system'::character varying,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("inm_id")
);

-- Indexes
CREATE INDEX idx_inm_audit ON public.instructions_master_inm USING btree (created_at);
```

## 5. Instance Tables

### 5.1 Plans Instance Table

```sql
-- Plans Instance (Executable Plans)
DROP TABLE IF EXISTS "public"."plans_instance_pli";

CREATE TABLE "public"."plans_instance_pli" (
    "pli_id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "plm_id" uuid NOT NULL,
    "ite_id" uuid NOT NULL,
    "usr_id_owner" int4,
    "pli_name" varchar(255),
    "pli_description" text,
    "pli_start_time" timestamptz,
    "pli_end_time" timestamptz,
    "pli_status" int4 NOT NULL,
    "created_by" varchar(255) DEFAULT 'system'::character varying,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_by" varchar(255) DEFAULT 'system'::character varying,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("pli_id")
);

-- Column Comments
COMMENT ON COLUMN "public"."plans_instance_pli"."pli_status" IS 'Status ID referencing status_sts table (normalized from VARCHAR)';

-- Indexes
CREATE INDEX idx_plans_instance_pli_status_id ON public.plans_instance_pli USING btree (pli_status);
```

### 5.2 Steps Instance Table

```sql
-- Steps Instance (Executable Tasks)
DROP TABLE IF EXISTS "public"."steps_instance_sti";

CREATE TABLE "public"."steps_instance_sti" (
    "sti_id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "phi_id" uuid NOT NULL,
    "stm_id" uuid NOT NULL,
    "sti_start_time" timestamptz,
    "sti_end_time" timestamptz,
    "sti_id_predecessor" uuid,
    "sti_name" varchar(255),
    "sti_description" text,
    "sti_duration_minutes" int4,
    "sti_status" int4 NOT NULL,
    "created_by" varchar(255) DEFAULT 'system'::character varying,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_by" varchar(255) DEFAULT 'system'::character varying,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "enr_id" int4,
    PRIMARY KEY ("sti_id")
);

-- Column Comments
COMMENT ON COLUMN "public"."steps_instance_sti"."sti_description" IS 'Override description for the step instance (copied from master by default)';
COMMENT ON COLUMN "public"."steps_instance_sti"."sti_duration_minutes" IS 'Override duration for the step instance (copied from master by default)';
COMMENT ON COLUMN "public"."steps_instance_sti"."sti_status" IS 'Status ID referencing status_sts table (normalized from VARCHAR)';

-- Indexes
CREATE INDEX idx_steps_instance_sti_enr_id ON public.steps_instance_sti USING btree (enr_id);
CREATE INDEX idx_sti_audit ON public.steps_instance_sti USING btree (created_at);
CREATE INDEX idx_steps_instance_sti_status_id ON public.steps_instance_sti USING btree (sti_status);
```

### 5.3 Sequences Instance Table

```sql
-- Sequences Instance (Execution Sequences)
DROP TABLE IF EXISTS "public"."sequences_instance_sqi";

CREATE TABLE "public"."sequences_instance_sqi" (
    "sqi_id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "pli_id" uuid NOT NULL,
    "sqm_id" uuid NOT NULL,
    "sqi_status" int4 NOT NULL,
    "sqi_name" varchar(255),
    "sqi_description" text,
    "sqi_order" int4,
    "predecessor_sqi_id" uuid,
    "created_by" varchar(255) DEFAULT 'system'::character varying,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_by" varchar(255) DEFAULT 'system'::character varying,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("sqi_id")
);

-- Indexes
CREATE INDEX idx_sqi_audit ON public.sequences_instance_sqi USING btree (created_at);
CREATE INDEX idx_sequences_instance_sqi_status_id ON public.sequences_instance_sqi USING btree (sqi_status);
```

### 5.4 Phases Instance Table

```sql
-- Phases Instance (Execution Phases)
DROP TABLE IF EXISTS "public"."phases_instance_phi";

CREATE TABLE "public"."phases_instance_phi" (
    "phi_id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "sqi_id" uuid NOT NULL,
    "phm_id" uuid NOT NULL,
    "phi_status" int4 NOT NULL,
    "phi_order" int4,
    "phi_name" varchar(255),
    "phi_description" text,
    "predecessor_phi_id" uuid,
    "created_by" varchar(255) DEFAULT 'system'::character varying,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_by" varchar(255) DEFAULT 'system'::character varying,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("phi_id")
);

-- Indexes
CREATE INDEX idx_phi_audit ON public.phases_instance_phi USING btree (created_at);
CREATE INDEX idx_phases_instance_phi_status_id ON public.phases_instance_phi USING btree (phi_status);
```

### 5.5 Controls Instance Table

```sql
-- Controls Instance (Execution Controls)
DROP TABLE IF EXISTS "public"."controls_instance_cti";

CREATE TABLE "public"."controls_instance_cti" (
    "cti_id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "phi_id" uuid NOT NULL,
    "ctm_id" uuid NOT NULL,
    "usr_id_it_validator" int4,
    "usr_id_biz_validator" int4,
    "cti_status" int4 NOT NULL,
    "cti_order" int4,
    "cti_name" varchar(255),
    "cti_description" text,
    "cti_type" varchar(50),
    "cti_is_critical" bool,
    "cti_code" text,
    "created_by" varchar(255) DEFAULT 'system'::character varying,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_by" varchar(255) DEFAULT 'system'::character varying,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("cti_id")
);

-- Indexes
CREATE INDEX idx_cti_audit ON public.controls_instance_cti USING btree (created_at);
CREATE INDEX idx_controls_instance_cti_status_id ON public.controls_instance_cti USING btree (cti_status);
```

### 5.6 Instructions Instance Table

```sql
-- Instructions Instance (Execution Instructions)
DROP TABLE IF EXISTS "public"."instructions_instance_ini";

CREATE TABLE "public"."instructions_instance_ini" (
    "ini_id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "sti_id" uuid NOT NULL,
    "inm_id" uuid NOT NULL,
    "usr_id_completed_by" int4,
    "ini_order" int4,
    "ini_body" text,
    "ini_duration_minutes" int4,
    "ini_is_completed" bool DEFAULT false,
    "ini_completed_at" timestamptz,
    "created_by" varchar(255) DEFAULT 'system'::character varying,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_by" varchar(255) DEFAULT 'system'::character varying,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("ini_id")
);

-- Indexes
CREATE INDEX idx_ini_audit ON public.instructions_instance_ini USING btree (created_at);
```

## 6. Staging Tables ✅ NEWLY ADDED

```sql
-- Staging: Steps data for import
DROP TABLE IF EXISTS "public"."stg_steps";

CREATE TABLE "public"."stg_steps" (
    "step_id" varchar(255),
    "description" text,
    "owner_team_id" int4,
    "environment_id" int4,
    "app_id" int4,
    "phase_id" varchar(255),
    "order_number" int4,
    "duration_minutes" int4,
    "step_type" varchar(50),
    "environments" text,
    "applications" text,
    "teams_impacted" text,
    "iteration_types" text
);

-- Comments
COMMENT ON TABLE "public"."stg_steps" IS 'Staging: étapes de migration avec détails d''environnement et d''applications.';

-- Staging: Step instructions data for import
DROP TABLE IF EXISTS "public"."stg_step_instructions";

CREATE TABLE "public"."stg_step_instructions" (
    "instruction_id" varchar(255),
    "step_id" varchar(255),
    "instruction_text" text,
    "order_number" int4,
    "duration_minutes" int4
);

-- Comments
COMMENT ON TABLE "public"."stg_step_instructions" IS 'Staging: instructions détaillées pour chaque step.';
```

### 6.1 US-034 Enhanced Data Import Tables ✅ COMPLETE (Sprint 6)

**Implementation Status**: All 7 tables implemented via migration 026 with proven 51ms performance

```sql
-- US-034 Import Queue Management Table
DROP TABLE IF EXISTS "public"."stg_import_queue_management_iqm";

CREATE TABLE "public"."stg_import_queue_management_iqm" (
    "iqm_id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "iqm_request_id" uuid NOT NULL,
    "iqm_priority" int4 NOT NULL DEFAULT 5 CHECK ((iqm_priority >= 1) AND (iqm_priority <= 20)),
    "iqm_status" varchar(20) NOT NULL DEFAULT 'QUEUED'::character varying CHECK ((iqm_status)::text = ANY ((ARRAY['QUEUED'::character varying, 'PROCESSING'::character varying, 'COMPLETED'::character varying, 'FAILED'::character varying, 'CANCELLED'::character varying])::text[])),
    "iqm_import_type" varchar(50) NOT NULL,
    "iqm_requested_by" varchar(100) NOT NULL,
    "iqm_requested_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "iqm_started_at" timestamptz,
    "iqm_estimated_duration" int4,
    "iqm_resource_requirements" jsonb,
    "iqm_configuration" jsonb NOT NULL,
    "iqm_queue_position" int4,
    "iqm_assigned_worker" varchar(50),
    "iqm_created_date" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "iqm_last_modified_date" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "iqm_is_active" bool DEFAULT true,
    PRIMARY KEY ("iqm_id")
);

-- Resource Lock Management Table
DROP TABLE IF EXISTS "public"."stg_import_resource_locks_irl";
CREATE SEQUENCE IF NOT EXISTS stg_import_resource_locks_irl_irl_id_seq;

CREATE TABLE "public"."stg_import_resource_locks_irl" (
    "irl_id" int4 NOT NULL DEFAULT nextval('stg_import_resource_locks_irl_irl_id_seq'::regclass),
    "irl_resource_type" varchar(50) NOT NULL,
    "irl_resource_id" varchar(100) NOT NULL,
    "irl_lock_type" varchar(20) NOT NULL CHECK ((irl_lock_type)::text = ANY ((ARRAY['EXCLUSIVE'::character varying, 'SHARED'::character varying])::text[])),
    "irl_locked_by_request" uuid NOT NULL,
    "irl_locked_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "irl_expires_at" timestamptz NOT NULL CHECK (irl_expires_at > irl_locked_at),
    "irl_created_date" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "irl_is_active" bool DEFAULT true,
    PRIMARY KEY ("irl_id")
);

-- Scheduled Import Schedules Table
DROP TABLE IF EXISTS "public"."stg_scheduled_import_schedules_sis";
CREATE SEQUENCE IF NOT EXISTS stg_scheduled_import_schedules_sis_sis_id_seq;

CREATE TABLE "public"."stg_scheduled_import_schedules_sis" (
    "sis_id" int4 NOT NULL DEFAULT nextval('stg_scheduled_import_schedules_sis_sis_id_seq'::regclass),
    "sis_schedule_id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "sis_schedule_name" varchar(255) NOT NULL,
    "sis_import_type" varchar(50) NOT NULL,
    "sis_schedule_expression" varchar(100) NOT NULL,
    "sis_recurring" bool DEFAULT false,
    "sis_priority" int4 DEFAULT 5 CHECK ((sis_priority >= 1) AND (sis_priority <= 20)),
    "sis_created_by" varchar(100) NOT NULL,
    "sis_status" varchar(20) DEFAULT 'SCHEDULED'::character varying CHECK ((sis_status)::text = ANY ((ARRAY['SCHEDULED'::character varying, 'EXECUTING'::character varying, 'COMPLETED'::character varying, 'FAILED'::character varying, 'CANCELLED'::character varying, 'PAUSED'::character varying])::text[])),
    "sis_next_execution" timestamptz NOT NULL,
    "sis_last_execution" timestamptz,
    "sis_execution_count" int4 DEFAULT 0,
    "sis_success_count" int4 DEFAULT 0,
    "sis_failure_count" int4 DEFAULT 0,
    "sis_import_configuration" jsonb NOT NULL,
    "sis_notification_settings" jsonb,
    "sis_max_retries" int4 DEFAULT 3,
    "sis_retry_delay_minutes" int4 DEFAULT 15,
    "sis_timeout_minutes" int4 DEFAULT 60,
    "sis_created_date" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "sis_last_modified_date" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "sis_is_active" bool DEFAULT true,
    PRIMARY KEY ("sis_id")
);

-- Schedule Execution History Table
DROP TABLE IF EXISTS "public"."stg_schedule_execution_history_seh";
CREATE SEQUENCE IF NOT EXISTS stg_schedule_execution_history_seh_seh_id_seq;

CREATE TABLE "public"."stg_schedule_execution_history_seh" (
    "seh_id" int4 NOT NULL DEFAULT nextval('stg_schedule_execution_history_seh_seh_id_seq'::regclass),
    "sis_id" int4 NOT NULL,
    "seh_execution_id" uuid NOT NULL,
    "seh_started_at" timestamptz NOT NULL,
    "seh_completed_at" timestamptz,
    "seh_status" varchar(20) NOT NULL CHECK ((seh_status)::text = ANY ((ARRAY['STARTED'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'FAILED'::character varying, 'CANCELLED'::character varying])::text[])),
    "seh_records_processed" int4 DEFAULT 0,
    "seh_error_message" text,
    "seh_execution_details" jsonb,
    "seh_created_date" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("seh_id")
);

-- Multi-tenant Resource Limits Table
DROP TABLE IF EXISTS "public"."stg_tenant_resource_limits_trl";
CREATE SEQUENCE IF NOT EXISTS stg_tenant_resource_limits_trl_trl_id_seq;

CREATE TABLE "public"."stg_tenant_resource_limits_trl" (
    "trl_id" int4 NOT NULL DEFAULT nextval('stg_tenant_resource_limits_trl_trl_id_seq'::regclass),
    "trl_tenant_id" varchar(50) NOT NULL,
    "trl_resource_type" varchar(50) NOT NULL,
    "trl_resource_limit" int4 NOT NULL CHECK (trl_resource_limit > 0),
    "trl_resource_unit" varchar(20) NOT NULL CHECK ((trl_resource_unit)::text = ANY ((ARRAY['MB'::character varying, 'COUNT'::character varying, 'PERCENTAGE'::character varying, 'GB'::character varying, 'SECONDS'::character varying])::text[])),
    "trl_enforcement_level" varchar(20) DEFAULT 'HARD'::character varying CHECK ((trl_enforcement_level)::text = ANY ((ARRAY['HARD'::character varying, 'SOFT'::character varying, 'ADVISORY'::character varying])::text[])),
    "trl_created_date" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "trl_last_modified_date" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "trl_is_active" bool DEFAULT true,
    PRIMARY KEY ("trl_id")
);

-- Schedule Resource Reservations Table
DROP TABLE IF EXISTS "public"."stg_schedule_resource_reservations_srr";
CREATE SEQUENCE IF NOT EXISTS stg_schedule_resource_reservations_srr_srr_id_seq;

CREATE TABLE "public"."stg_schedule_resource_reservations_srr" (
    "srr_id" int4 NOT NULL DEFAULT nextval('stg_schedule_resource_reservations_srr_srr_id_seq'::regclass),
    "sis_id" int4 NOT NULL,
    "srr_resource_type" varchar(50) NOT NULL,
    "srr_resource_amount" int4 NOT NULL,
    "srr_resource_unit" varchar(20) NOT NULL,
    "srr_reserved_from" timestamptz NOT NULL,
    "srr_reserved_until" timestamptz NOT NULL CHECK (srr_reserved_until > srr_reserved_from),
    "srr_created_date" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "srr_is_active" bool DEFAULT true,
    PRIMARY KEY ("srr_id")
);

-- Orchestration Dependencies Table
DROP TABLE IF EXISTS "public"."stg_orchestration_dependencies_od";
CREATE SEQUENCE IF NOT EXISTS stg_orchestration_dependencies_od_od_id_seq;

CREATE TABLE "public"."stg_orchestration_dependencies_od" (
    "od_id" int4 NOT NULL DEFAULT nextval('stg_orchestration_dependencies_od_od_id_seq'::regclass),
    "od_orchestration_id" uuid NOT NULL,
    "od_depends_on_orchestration" uuid NOT NULL,
    "od_dependency_type" varchar(30) NOT NULL CHECK ((od_dependency_type)::text = ANY ((ARRAY['SEQUENTIAL'::character varying, 'RESOURCE'::character varying, 'DATA'::character varying])::text[])),
    "od_created_date" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("od_id")
);

-- Comments for US-034 tables
COMMENT ON TABLE "public"."stg_import_queue_management_iqm" IS 'US-034: Priority-based import queue with resource coordination and worker assignment';
COMMENT ON TABLE "public"."stg_import_resource_locks_irl" IS 'US-034: Resource conflict prevention with exclusive/shared locks and expiration handling';
COMMENT ON TABLE "public"."stg_scheduled_import_schedules_sis" IS 'US-034: Recurring import scheduling with cron expressions and execution history';
COMMENT ON TABLE "public"."stg_schedule_execution_history_seh" IS 'US-034: Schedule execution audit trail with performance metrics and error logging';
COMMENT ON TABLE "public"."stg_tenant_resource_limits_trl" IS 'US-034: Multi-tenant resource governance with enforcement levels';
COMMENT ON TABLE "public"."stg_schedule_resource_reservations_srr" IS 'US-034: Schedule resource management with time-based reservations';
COMMENT ON TABLE "public"."stg_orchestration_dependencies_od" IS 'US-034: Import dependency orchestration for execution order management';

-- Indexes for US-034 tables
CREATE UNIQUE INDEX uq_iqm_request_id ON public.stg_import_queue_management_iqm USING btree (iqm_request_id);
CREATE INDEX idx_iqm_status_priority ON public.stg_import_queue_management_iqm USING btree (iqm_status, iqm_priority DESC, iqm_requested_at);
CREATE INDEX idx_iqm_worker_status ON public.stg_import_queue_management_iqm USING btree (iqm_assigned_worker, iqm_status);
CREATE UNIQUE INDEX uq_irl_resource_request ON public.stg_import_resource_locks_irl USING btree (irl_resource_type, irl_resource_id, irl_locked_by_request);
CREATE INDEX idx_irl_resource_expires ON public.stg_import_resource_locks_irl USING btree (irl_resource_type, irl_resource_id, irl_expires_at);
CREATE UNIQUE INDEX uq_sis_schedule_id ON public.stg_scheduled_import_schedules_sis USING btree (sis_schedule_id);
CREATE INDEX idx_sis_next_execution ON public.stg_scheduled_import_schedules_sis USING btree (sis_next_execution);
CREATE INDEX idx_sis_created_by_status ON public.stg_scheduled_import_schedules_sis USING btree (sis_created_by, sis_status);
CREATE INDEX idx_sis_recurring_active ON public.stg_scheduled_import_schedules_sis USING btree (sis_recurring, sis_is_active);
CREATE INDEX idx_seh_sis_started ON public.stg_schedule_execution_history_seh USING btree (sis_id, seh_started_at DESC);
CREATE INDEX idx_seh_execution_id ON public.stg_schedule_execution_history_seh USING btree (seh_execution_id);
CREATE UNIQUE INDEX uq_trl_tenant_resource ON public.stg_tenant_resource_limits_trl USING btree (trl_tenant_id, trl_resource_type);
CREATE INDEX idx_srr_resource_time ON public.stg_schedule_resource_reservations_srr USING btree (srr_resource_type, srr_reserved_from, srr_reserved_until);
CREATE INDEX idx_od_orchestration ON public.stg_orchestration_dependencies_od USING btree (od_orchestration_id);
CREATE INDEX idx_od_depends_on ON public.stg_orchestration_dependencies_od USING btree (od_depends_on_orchestration);
CREATE UNIQUE INDEX uq_od_orchestration_dependency ON public.stg_orchestration_dependencies_od USING btree (od_orchestration_id, od_depends_on_orchestration);
```

## 7. Additional System Tables

### 7.1 Labels Management

```sql
-- Labels for categorization
DROP TABLE IF EXISTS "public"."labels_lbl";
CREATE SEQUENCE IF NOT EXISTS labels_lbl_lbl_id_seq;

CREATE TABLE "public"."labels_lbl" (
    "lbl_id" int4 NOT NULL DEFAULT nextval('labels_lbl_lbl_id_seq'::regclass),
    "mig_id" uuid NOT NULL,
    "lbl_name" text NOT NULL,
    "lbl_description" text,
    "lbl_color" varchar(7),
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "created_by" int4,
    PRIMARY KEY ("lbl_id")
);

-- Indexes
CREATE UNIQUE INDEX uq_labels_lbl_mig_id_lbl_name ON public.labels_lbl USING btree (mig_id, lbl_name);
CREATE INDEX idx_lbl_audit ON public.labels_lbl USING btree (created_at);
```

### 7.2 Email Templates

```sql
-- Email notification templates
DROP TABLE IF EXISTS "public"."email_templates_emt";

CREATE TABLE "public"."email_templates_emt" (
    "emt_id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "emt_type" varchar(50) CHECK (emt_type IN ('STEP_NOTIFICATION', 'MIGRATION_UPDATE', 'SYSTEM_ALERT')),
    "emt_name" varchar(255),
    "emt_subject" text,
    "emt_body_html" text,
    "emt_body_text" text,
    "emt_is_active" bool DEFAULT true,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz,
    "created_by" varchar(255),
    "updated_by" varchar(255),
    PRIMARY KEY ("emt_id")
);

-- Indexes
CREATE UNIQUE INDEX email_templates_emt_emt_name_key ON public.email_templates_emt USING btree (emt_name);
CREATE INDEX idx_emt_type ON public.email_templates_emt USING btree (emt_type) WHERE (emt_is_active = true);
CREATE INDEX idx_emt_name ON public.email_templates_emt USING btree (emt_name);
```

### 7.3 Step Comments

```sql
-- Step instance comments
DROP TABLE IF EXISTS "public"."step_instance_comments_sic";
CREATE SEQUENCE IF NOT EXISTS step_instance_comments_sic_sic_id_seq;

CREATE TABLE "public"."step_instance_comments_sic" (
    "sic_id" int4 NOT NULL DEFAULT nextval('step_instance_comments_sic_sic_id_seq'::regclass),
    "sti_id" uuid NOT NULL,
    "comment_body" text,
    "created_by" int4,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_by" int4,
    "updated_at" timestamptz,
    PRIMARY KEY ("sic_id")
);

-- Indexes
CREATE INDEX idx_sic_sti_id ON public.step_instance_comments_sic USING btree (sti_id);
```

### 7.4 Step Pilot Comments

```sql
-- Step pilot comments
DROP TABLE IF EXISTS "public"."step_pilot_comments_spc";
CREATE SEQUENCE IF NOT EXISTS step_pilot_comments_spc_spc_id_seq;

CREATE TABLE "public"."step_pilot_comments_spc" (
    "spc_id" int4 NOT NULL DEFAULT nextval('step_pilot_comments_spc_spc_id_seq'::regclass),
    "stm_id" uuid NOT NULL,
    "comment_body" text,
    "author" varchar(255),
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "visibility" varchar(50),
    "created_by" int4,
    "updated_by" int4,
    PRIMARY KEY ("spc_id")
);

-- Indexes
CREATE INDEX idx_spc_stm_id ON public.step_pilot_comments_spc USING btree (stm_id);
```

### 7.5 System Configuration

```sql
-- System configuration settings
DROP TABLE IF EXISTS "public"."system_configuration_scf";

CREATE TABLE "public"."system_configuration_scf" (
    "scf_id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "env_id" int4 NOT NULL,
    "scf_key" varchar(255) NOT NULL,
    "scf_category" varchar(50) CHECK (scf_category IN ('MACRO_LOCATION', 'API_CONFIG', 'SYSTEM_SETTING')),
    "scf_value" text,
    "scf_description" text,
    "scf_is_active" bool DEFAULT true,
    "scf_is_system_managed" bool DEFAULT false,
    "scf_data_type" varchar(20) DEFAULT 'STRING' CHECK (scf_data_type IN ('STRING', 'NUMBER', 'BOOLEAN', 'JSON')),
    "scf_validation_pattern" varchar(500),
    "created_by" varchar(255),
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_by" varchar(255),
    "updated_at" timestamptz,
    PRIMARY KEY ("scf_id")
);

-- Indexes
CREATE UNIQUE INDEX unique_scf_key_per_env ON public.system_configuration_scf USING btree (env_id, scf_key);
CREATE INDEX idx_scf_env_category ON public.system_configuration_scf USING btree (env_id, scf_category);
CREATE INDEX idx_scf_key_active ON public.system_configuration_scf USING btree (scf_key, scf_is_active);
CREATE INDEX idx_scf_category_active ON public.system_configuration_scf USING btree (scf_category, scf_is_active);
CREATE INDEX idx_scf_audit ON public.system_configuration_scf USING btree (created_at);
```

### 7.6 Audit Log

```sql
-- System audit log
DROP TABLE IF EXISTS "public"."audit_log_aud";

CREATE TABLE "public"."audit_log_aud" (
    "aud_id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "usr_id" int4,
    "aud_action" varchar(100),
    "aud_entity_type" varchar(100),
    "aud_entity_id" varchar(255),
    "aud_details" jsonb,
    "aud_timestamp" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "aud_ip_address" varchar(45),
    "aud_user_agent" text,
    PRIMARY KEY ("aud_id")
);
```

## 8. Association/Junction Tables

### 8.1 Team-User Associations

```sql
-- Team-User many-to-many relationships
DROP TABLE IF EXISTS "public"."teams_tms_x_users_usr";
CREATE SEQUENCE IF NOT EXISTS teams_tms_x_users_usr_tms_x_usr_id_seq;

CREATE TABLE "public"."teams_tms_x_users_usr" (
    "tms_x_usr_id" int4 NOT NULL DEFAULT nextval('teams_tms_x_users_usr_tms_x_usr_id_seq'::regclass),
    "tms_id" int4 NOT NULL,
    "usr_id" int4 NOT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "created_by" varchar(255),
    PRIMARY KEY ("tms_x_usr_id")
);

-- Indexes
CREATE UNIQUE INDEX uq_tms_x_usr ON public.teams_tms_x_users_usr USING btree (tms_id, usr_id);
```

### 8.2 Team-Application Associations

```sql
-- Team-Application many-to-many relationships
DROP TABLE IF EXISTS "public"."teams_tms_x_applications_app";

CREATE TABLE "public"."teams_tms_x_applications_app" (
    "tms_id" int4 NOT NULL,
    "app_id" int4 NOT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("tms_id", "app_id")
);
```

### 8.3 Environment-Application Associations

```sql
-- Environment-Application many-to-many relationships
DROP TABLE IF EXISTS "public"."environments_env_x_applications_app";

CREATE TABLE "public"."environments_env_x_applications_app" (
    "env_id" int4 NOT NULL,
    "app_id" int4 NOT NULL,
    PRIMARY KEY ("env_id", "app_id")
);
```

### 8.4 Environment-Iteration Associations

```sql
-- Environment-Iteration many-to-many relationships
DROP TABLE IF EXISTS "public"."environments_env_x_iterations_ite";

CREATE TABLE "public"."environments_env_x_iterations_ite" (
    "env_id" int4 NOT NULL,
    "ite_id" uuid NOT NULL,
    "enr_id" int4,
    PRIMARY KEY ("env_id", "ite_id")
);
```

### 8.5 Step-Iteration Type Associations

```sql
-- Step-Iteration Type many-to-many relationships
DROP TABLE IF EXISTS "public"."steps_master_stm_x_iteration_types_itt";

CREATE TABLE "public"."steps_master_stm_x_iteration_types_itt" (
    "stm_id" uuid NOT NULL,
    "itt_code" varchar(10) NOT NULL,
    PRIMARY KEY ("stm_id", "itt_code")
);

-- Indexes
CREATE UNIQUE INDEX pk_stm_itt ON public.steps_master_stm_x_iteration_types_itt USING btree (stm_id, itt_code);
```

### 8.6 Step-Team Impact Associations

```sql
-- Step-Team Impact many-to-many relationships
DROP TABLE IF EXISTS "public"."steps_master_stm_x_teams_tms_impacted";

CREATE TABLE "public"."steps_master_stm_x_teams_tms_impacted" (
    "stm_id" uuid NOT NULL,
    "tms_id" int4 NOT NULL,
    PRIMARY KEY ("stm_id", "tms_id")
);

-- Indexes
CREATE UNIQUE INDEX pk_stm_tms_impacted ON public.steps_master_stm_x_teams_tms_impacted USING btree (stm_id, tms_id);
```

### 8.7 Label Associations

```sql
-- Label-Step associations
DROP TABLE IF EXISTS "public"."labels_lbl_x_steps_master_stm";
CREATE SEQUENCE IF NOT EXISTS labels_lbl_x_steps_master_stm_lbl_x_stm_id_seq;

CREATE TABLE "public"."labels_lbl_x_steps_master_stm" (
    "lbl_x_stm_id" int4 NOT NULL DEFAULT nextval('labels_lbl_x_steps_master_stm_lbl_x_stm_id_seq'::regclass),
    "lbl_id" int4 NOT NULL,
    "stm_id" uuid NOT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "created_by" varchar(255),
    PRIMARY KEY ("lbl_x_stm_id")
);

-- Indexes
CREATE UNIQUE INDEX uq_labels_lbl_x_steps_master_stm_lbl_id_stm_id ON public.labels_lbl_x_steps_master_stm USING btree (lbl_id, stm_id);
```

```sql
-- Label-Application associations
DROP TABLE IF EXISTS "public"."labels_lbl_x_applications_app";
CREATE SEQUENCE IF NOT EXISTS labels_lbl_x_applications_app_lbl_x_app_id_seq;

CREATE TABLE "public"."labels_lbl_x_applications_app" (
    "lbl_x_app_id" int4 NOT NULL DEFAULT nextval('labels_lbl_x_applications_app_lbl_x_app_id_seq'::regclass),
    "lbl_id" int4 NOT NULL,
    "app_id" int4 NOT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "created_by" varchar(255),
    PRIMARY KEY ("lbl_x_app_id")
);

-- Indexes
CREATE UNIQUE INDEX uq_lbl_x_app ON public.labels_lbl_x_applications_app USING btree (lbl_id, app_id);
```

```sql
-- Label-Control associations
DROP TABLE IF EXISTS "public"."labels_lbl_x_controls_master_ctm";
CREATE SEQUENCE IF NOT EXISTS labels_lbl_x_controls_master_ctm_lbl_x_ctm_id_seq;

CREATE TABLE "public"."labels_lbl_x_controls_master_ctm" (
    "lbl_x_ctm_id" int4 NOT NULL DEFAULT nextval('labels_lbl_x_controls_master_ctm_lbl_x_ctm_id_seq'::regclass),
    "lbl_id" int4 NOT NULL,
    "ctm_id" uuid NOT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "created_by" varchar(255),
    PRIMARY KEY ("lbl_x_ctm_id")
);

-- Indexes
CREATE UNIQUE INDEX uq_labels_lbl_x_controls_master_ctm_lbl_id_ctm_id ON public.labels_lbl_x_controls_master_ctm USING btree (lbl_id, ctm_id);
```

## 9. Complete Foreign Key Constraints

### 9.1 Core Entity Relationships

```sql
-- Users relationships
ALTER TABLE "public"."users_usr" ADD FOREIGN KEY ("rls_id") REFERENCES "public"."roles_rls"("rls_id");

-- Migration hierarchy
ALTER TABLE "public"."migrations_mig" ADD FOREIGN KEY ("mig_status") REFERENCES "public"."status_sts"("sts_id");
ALTER TABLE "public"."migrations_mig" ADD FOREIGN KEY ("usr_id_owner") REFERENCES "public"."users_usr"("usr_id");

ALTER TABLE "public"."iterations_ite" ADD FOREIGN KEY ("itt_code") REFERENCES "public"."iteration_types_itt"("itt_code");
ALTER TABLE "public"."iterations_ite" ADD FOREIGN KEY ("mig_id") REFERENCES "public"."migrations_mig"("mig_id");
ALTER TABLE "public"."iterations_ite" ADD FOREIGN KEY ("ite_status") REFERENCES "public"."status_sts"("sts_id");
ALTER TABLE "public"."iterations_ite" ADD FOREIGN KEY ("plm_id") REFERENCES "public"."plans_master_plm"("plm_id");

-- Plans (Master and Instance)
ALTER TABLE "public"."plans_master_plm" ADD FOREIGN KEY ("tms_id") REFERENCES "public"."teams_tms"("tms_id");
ALTER TABLE "public"."plans_master_plm" ADD FOREIGN KEY ("plm_status") REFERENCES "public"."status_sts"("sts_id");

ALTER TABLE "public"."plans_instance_pli" ADD FOREIGN KEY ("ite_id") REFERENCES "public"."iterations_ite"("ite_id");
ALTER TABLE "public"."plans_instance_pli" ADD FOREIGN KEY ("pli_status") REFERENCES "public"."status_sts"("sts_id");
ALTER TABLE "public"."plans_instance_pli" ADD FOREIGN KEY ("plm_id") REFERENCES "public"."plans_master_plm"("plm_id");
ALTER TABLE "public"."plans_instance_pli" ADD FOREIGN KEY ("usr_id_owner") REFERENCES "public"."users_usr"("usr_id");
```

### 9.2 Master Template Relationships

```sql
-- Sequences Master
ALTER TABLE "public"."sequences_master_sqm" ADD FOREIGN KEY ("plm_id") REFERENCES "public"."plans_master_plm"("plm_id");
ALTER TABLE "public"."sequences_master_sqm" ADD FOREIGN KEY ("predecessor_sqm_id") REFERENCES "public"."sequences_master_sqm"("sqm_id");

-- Phases Master
ALTER TABLE "public"."phases_master_phm" ADD FOREIGN KEY ("sqm_id") REFERENCES "public"."sequences_master_sqm"("sqm_id");
ALTER TABLE "public"."phases_master_phm" ADD FOREIGN KEY ("predecessor_phm_id") REFERENCES "public"."phases_master_phm"("phm_id");

-- Steps Master
ALTER TABLE "public"."steps_master_stm" ADD FOREIGN KEY ("stt_code") REFERENCES "public"."step_types_stt"("stt_code");
ALTER TABLE "public"."steps_master_stm" ADD FOREIGN KEY ("enr_id_target") REFERENCES "public"."environment_roles_enr"("enr_id");
ALTER TABLE "public"."steps_master_stm" ADD FOREIGN KEY ("phm_id") REFERENCES "public"."phases_master_phm"("phm_id");
ALTER TABLE "public"."steps_master_stm" ADD FOREIGN KEY ("enr_id") REFERENCES "public"."environment_roles_enr"("enr_id");
ALTER TABLE "public"."steps_master_stm" ADD FOREIGN KEY ("stm_id_predecessor") REFERENCES "public"."steps_master_stm"("stm_id");
ALTER TABLE "public"."steps_master_stm" ADD FOREIGN KEY ("tms_id_owner") REFERENCES "public"."teams_tms"("tms_id");

-- Controls Master
ALTER TABLE "public"."controls_master_ctm" ADD FOREIGN KEY ("phm_id") REFERENCES "public"."phases_master_phm"("phm_id");

-- Instructions Master
ALTER TABLE "public"."instructions_master_inm" ADD FOREIGN KEY ("stm_id") REFERENCES "public"."steps_master_stm"("stm_id");
ALTER TABLE "public"."instructions_master_inm" ADD FOREIGN KEY ("tms_id") REFERENCES "public"."teams_tms"("tms_id");
ALTER TABLE "public"."instructions_master_inm" ADD FOREIGN KEY ("ctm_id") REFERENCES "public"."controls_master_ctm"("ctm_id");
```

### 9.3 Instance Execution Relationships

```sql
-- Sequences Instance
ALTER TABLE "public"."sequences_instance_sqi" ADD FOREIGN KEY ("sqi_status") REFERENCES "public"."status_sts"("sts_id");
ALTER TABLE "public"."sequences_instance_sqi" ADD FOREIGN KEY ("sqm_id") REFERENCES "public"."sequences_master_sqm"("sqm_id");
ALTER TABLE "public"."sequences_instance_sqi" ADD FOREIGN KEY ("pli_id") REFERENCES "public"."plans_instance_pli"("pli_id");

-- Phases Instance
ALTER TABLE "public"."phases_instance_phi" ADD FOREIGN KEY ("sqi_id") REFERENCES "public"."sequences_instance_sqi"("sqi_id");
ALTER TABLE "public"."phases_instance_phi" ADD FOREIGN KEY ("phi_status") REFERENCES "public"."status_sts"("sts_id");
ALTER TABLE "public"."phases_instance_phi" ADD FOREIGN KEY ("phm_id") REFERENCES "public"."phases_master_phm"("phm_id");

-- Steps Instance
ALTER TABLE "public"."steps_instance_sti" ADD FOREIGN KEY ("sti_status") REFERENCES "public"."status_sts"("sts_id");
ALTER TABLE "public"."steps_instance_sti" ADD FOREIGN KEY ("phi_id") REFERENCES "public"."phases_instance_phi"("phi_id");
ALTER TABLE "public"."steps_instance_sti" ADD FOREIGN KEY ("enr_id") REFERENCES "public"."environment_roles_enr"("enr_id");
ALTER TABLE "public"."steps_instance_sti" ADD FOREIGN KEY ("stm_id") REFERENCES "public"."steps_master_stm"("stm_id");

-- Controls Instance
ALTER TABLE "public"."controls_instance_cti" ADD FOREIGN KEY ("usr_id_it_validator") REFERENCES "public"."users_usr"("usr_id");
ALTER TABLE "public"."controls_instance_cti" ADD FOREIGN KEY ("usr_id_biz_validator") REFERENCES "public"."users_usr"("usr_id");
ALTER TABLE "public"."controls_instance_cti" ADD FOREIGN KEY ("cti_status") REFERENCES "public"."status_sts"("sts_id");
ALTER TABLE "public"."controls_instance_cti" ADD FOREIGN KEY ("ctm_id") REFERENCES "public"."controls_master_ctm"("ctm_id");
ALTER TABLE "public"."controls_instance_cti" ADD FOREIGN KEY ("phi_id") REFERENCES "public"."phases_instance_phi"("phi_id");

-- Instructions Instance
ALTER TABLE "public"."instructions_instance_ini" ADD FOREIGN KEY ("usr_id_completed_by") REFERENCES "public"."users_usr"("usr_id");
ALTER TABLE "public"."instructions_instance_ini" ADD FOREIGN KEY ("inm_id") REFERENCES "public"."instructions_master_inm"("inm_id");
ALTER TABLE "public"."instructions_instance_ini" ADD FOREIGN KEY ("sti_id") REFERENCES "public"."steps_instance_sti"("sti_id");
```

### 9.4 Association Table Relationships

```sql
-- Environment/Application associations
ALTER TABLE "public"."environments_env_x_applications_app" ADD FOREIGN KEY ("app_id") REFERENCES "public"."applications_app"("app_id");
ALTER TABLE "public"."environments_env_x_applications_app" ADD FOREIGN KEY ("env_id") REFERENCES "public"."environments_env"("env_id");

-- Environment/Iteration associations
ALTER TABLE "public"."environments_env_x_iterations_ite" ADD FOREIGN KEY ("env_id") REFERENCES "public"."environments_env"("env_id");
ALTER TABLE "public"."environments_env_x_iterations_ite" ADD FOREIGN KEY ("ite_id") REFERENCES "public"."iterations_ite"("ite_id");
ALTER TABLE "public"."environments_env_x_iterations_ite" ADD FOREIGN KEY ("enr_id") REFERENCES "public"."environment_roles_enr"("enr_id");

-- Step/Iteration Type associations
ALTER TABLE "public"."steps_master_stm_x_iteration_types_itt" ADD FOREIGN KEY ("stm_id") REFERENCES "public"."steps_master_stm"("stm_id") ON DELETE CASCADE;
ALTER TABLE "public"."steps_master_stm_x_iteration_types_itt" ADD FOREIGN KEY ("itt_code") REFERENCES "public"."iteration_types_itt"("itt_code") ON DELETE CASCADE;

-- Step/Team Impact associations
ALTER TABLE "public"."steps_master_stm_x_teams_tms_impacted" ADD FOREIGN KEY ("tms_id") REFERENCES "public"."teams_tms"("tms_id") ON DELETE CASCADE;
ALTER TABLE "public"."steps_master_stm_x_teams_tms_impacted" ADD FOREIGN KEY ("stm_id") REFERENCES "public"."steps_master_stm"("stm_id") ON DELETE CASCADE;

-- Team/Application associations
ALTER TABLE "public"."teams_tms_x_applications_app" ADD FOREIGN KEY ("tms_id") REFERENCES "public"."teams_tms"("tms_id");
ALTER TABLE "public"."teams_tms_x_applications_app" ADD FOREIGN KEY ("app_id") REFERENCES "public"."applications_app"("app_id");

-- Team/User associations
ALTER TABLE "public"."teams_tms_x_users_usr" ADD FOREIGN KEY ("tms_id") REFERENCES "public"."teams_tms"("tms_id") ON DELETE CASCADE;
ALTER TABLE "public"."teams_tms_x_users_usr" ADD FOREIGN KEY ("usr_id") REFERENCES "public"."users_usr"("usr_id") ON DELETE CASCADE;
```

### 9.5 Support Table Relationships

```sql
-- Audit and Comments
ALTER TABLE "public"."audit_log_aud" ADD FOREIGN KEY ("usr_id") REFERENCES "public"."users_usr"("usr_id");

ALTER TABLE "public"."step_instance_comments_sic" ADD FOREIGN KEY ("sti_id") REFERENCES "public"."steps_instance_sti"("sti_id") ON DELETE CASCADE;
ALTER TABLE "public"."step_instance_comments_sic" ADD FOREIGN KEY ("created_by") REFERENCES "public"."users_usr"("usr_id");
ALTER TABLE "public"."step_instance_comments_sic" ADD FOREIGN KEY ("updated_by") REFERENCES "public"."users_usr"("usr_id");

ALTER TABLE "public"."step_pilot_comments_spc" ADD FOREIGN KEY ("created_by") REFERENCES "public"."users_usr"("usr_id");
ALTER TABLE "public"."step_pilot_comments_spc" ADD FOREIGN KEY ("stm_id") REFERENCES "public"."steps_master_stm"("stm_id") ON DELETE CASCADE;
ALTER TABLE "public"."step_pilot_comments_spc" ADD FOREIGN KEY ("updated_by") REFERENCES "public"."users_usr"("usr_id");

-- System Configuration
ALTER TABLE "public"."system_configuration_scf" ADD FOREIGN KEY ("env_id") REFERENCES "public"."environments_env"("env_id");

-- Labels
ALTER TABLE "public"."labels_lbl" ADD FOREIGN KEY ("mig_id") REFERENCES "public"."migrations_mig"("mig_id") ON DELETE CASCADE;

-- Label associations
ALTER TABLE "public"."labels_lbl_x_steps_master_stm" ADD FOREIGN KEY ("lbl_id") REFERENCES "public"."labels_lbl"("lbl_id") ON DELETE CASCADE;
ALTER TABLE "public"."labels_lbl_x_steps_master_stm" ADD FOREIGN KEY ("stm_id") REFERENCES "public"."steps_master_stm"("stm_id") ON DELETE CASCADE;

ALTER TABLE "public"."labels_lbl_x_applications_app" ADD FOREIGN KEY ("app_id") REFERENCES "public"."applications_app"("app_id") ON DELETE CASCADE;
ALTER TABLE "public"."labels_lbl_x_applications_app" ADD FOREIGN KEY ("lbl_id") REFERENCES "public"."labels_lbl"("lbl_id") ON DELETE CASCADE;

ALTER TABLE "public"."labels_lbl_x_controls_master_ctm" ADD FOREIGN KEY ("lbl_id") REFERENCES "public"."labels_lbl"("lbl_id") ON DELETE CASCADE;
ALTER TABLE "public"."labels_lbl_x_controls_master_ctm" ADD FOREIGN KEY ("ctm_id") REFERENCES "public"."controls_master_ctm"("ctm_id") ON DELETE CASCADE;

-- Staging table relationship
ALTER TABLE "public"."stg_step_instructions" ADD FOREIGN KEY ("step_id") REFERENCES "public"."stg_steps"("id") ON DELETE CASCADE;
```

## 8. Performance Indexes

```sql
-- Status-based query optimization
CREATE INDEX idx_active_migrations ON migrations_mig(mig_id)
    WHERE mig_status IN (1, 2); -- PLANNING, IN_PROGRESS

CREATE INDEX idx_active_iterations ON iterations_ite(ite_id)
    WHERE ite_status IN (9, 10); -- PLANNING, IN_PROGRESS

-- Audit trail indexes
CREATE INDEX idx_mig_audit ON public.migrations_mig USING btree (created_at);
CREATE INDEX idx_ite_audit ON public.iterations_ite USING btree (created_at);
CREATE INDEX idx_pli_audit ON public.plans_instance_pli USING btree (created_at);
```

## 9. Schema Validation Queries

```sql
-- Verify status normalization
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND column_name LIKE '%_status'
ORDER BY table_name;

-- Verify foreign key constraints to status_sts
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'status_sts'
ORDER BY tc.table_name;

-- Count total tables
SELECT COUNT(*) as total_tables
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';
```

---

**Document Status:** ✅ FULLY ALIGNED with PostgreSQL Source of Truth (Migration 028-029)  
**Total Tables:** 55 (verified against live database - September 9, 2025)  
**Total Columns:** 562  
**Primary Keys:** 54  
**Foreign Keys:** 85  
**Unique Constraints:** 25  
**Indexes:** 140  
**Views:** 1  
**Status Normalization:** ✅ COMPLETE (all status fields are INTEGER FK)  
**US-042/043 Migrations:** ✅ COMPLETE (Migration 028: iteration_types_itt enhanced, Migration 029: migration_types_mit created)  
**Sprint 6 Integration:** ✅ COMPLETE (Type management enhancements fully documented)
