# ADR-014: Database Naming Conventions

**Status:** Accepted
**Date:** 2025-06-25
**Context:**
As the project's data model evolves to include canonical plan templates and live execution instances, a clear and consistent naming convention is critical. The previous conventions were incomplete and did not cover these new architectural patterns. This ADR establishes a comprehensive standard for all database objects to ensure clarity, maintainability, and reduce errors.

## Decision

The following naming conventions are adopted for all new and existing database objects.

### 1. Table Naming

#### 1.1. Core Entity Tables
- **Pattern:** `plural_entity_name_suf`
- **Description:** Standard tables representing a core entity. The suffix is a unique three-letter abbreviation of the table name.
- **Examples:**
  - `teams_tms`
  - `users_usr`
  - `environments_env`

#### 1.2. Canonical (Master) Tables
- **Pattern:** `entity_name_master_suf` or `entity_name_canonical_suf`
- **Description:** Tables that store the "template" or "master" definition of a complex entity, like an implementation plan.
- **Examples:**
  - `implementation_plans_canonical_ipc`
  - `sequences_master_sqm`
  - `steps_master_stm`
  - `controls_master_ctl`

#### 1.3. Instance Tables
- **Pattern:** `entity_name_instance_sui`
- **Description:** Tables that store data for a specific execution or "instance" of a canonical entity. The suffix is a unique three-letter abbreviation.
- **Examples:**
  - `steps_instance_sti`
  - `controls_instance_cti`

#### 1.4. Join Tables
- **Pattern:** `table1_suf_x_table2_suf`
- **Description:** Join tables for many-to-many relationships. The name is formed by combining the suffixes of the two joined tables.
- **Example:**
  - `steps_instance_sti_x_users_usr` (linking users to specific step instances)

### 2. Column Naming

#### 2.1. Primary Keys
- **Pattern:** `suf_id`
- **Description:** The primary key for a table. The name is composed of the table's unique suffix followed by `_id`. For legacy tables using `id`, this will be refactored over time.
- **Examples:**
  - In `steps_master_stm`, the primary key is `stm_id`.
  - In `teams_tms`, the primary key is `id` (legacy, to be refactored to `tms_id`).
  - In `steps_instance_sti`, the primary key will be `sti_id`.

#### 2.2. Foreign Keys
- **Pattern:** `referenced_table_suffix_id`
- **Description:** A foreign key column should be named after the primary key it references.
- **Example:**
  - A foreign key in `steps_master_stm` referencing `chapters_master_chm` (PK `chm_id`) should be named `chm_id`.

### 3. Constraints
- **Pattern:** `fk_sourcetable_destinationtable_column`
- **Description:** Foreign key constraints should be explicitly named for clarity.
- **Example:**
  - `CONSTRAINT fk_stm_chm FOREIGN KEY (chm_id) REFERENCES chapters_master_chm(chm_id)`

## Consequences

- All new schema development must adhere to these conventions.
- Existing tables and columns that do not conform will be refactored as opportunities arise.
- This standardizes the data model, making it easier to understand, maintain, and extend.

## See Also
- `/docs/dataModel/README.md`
- `/CHANGELOG.md`
- `/docs/adr/ADR-012_standardized_database_management_and_documentation.md`

---
*This ADR has been accepted and serves as the official guideline for database naming.*
