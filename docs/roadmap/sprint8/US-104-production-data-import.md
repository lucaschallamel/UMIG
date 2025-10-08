# US-104: Production Data Import

**Status**: Backlog
**Priority**: High
**Story Points**: 13
**Sprint**: TBD
**Type**: Data Migration
**Related**: TD-103 (Performance Optimization - Prerequisite)

---

## Changelog

**Version 2.0** (2025-10-08):

- ✅ **REMOVED**: All references to `teams_tms.tms_code` column addition (schema is correct with tms_id + tms_name)
- ✅ **REMOVED**: UNIQUE constraint recommendations for sequences/phases (handled via lookup queries)
- ✅ **REMOVED**: CHECK constraint recommendations for status values (managed via status_sts table)
- ✅ **UPDATED**: Team lookup logic to use `tms_name` instead of `tms_code`
- ✅ **UPDATED**: Bootstrap data defaults (Plan: ACTIVE status, Migration: PLANNING + MIGRATION type)
- ✅ **UPDATED**: Explicit audit trail handling (updated_at = created_at on INSERT)
- ✅ **ADDED**: Reference to prerequisite performance optimization migration (TD-103)
- ✅ **CONFIRMED**: Schema validation report findings incorporated with stakeholder corrections

**Version 1.0** (2025-10-08):

- Initial user story creation with schema validation analysis

---

## User Story

**As a** UMIG system administrator
**I want** to import production cutover data from 5 Excel files and 1,174 JSON files into the UMIG database
**So that** the system is populated with real-world migration plans, sequences, phases, steps, and instructions for operational use

---

## Business Context

### Problem Statement

The UMIG application currently operates with empty or minimal bootstrap data. To become operationally useful, it requires a comprehensive dataset reflecting real-world cutover scenarios including:

- **Organizational data**: Teams (≈120), Users (≈200), Applications (≈150)
- **Reference data**: Step types, iteration types, environment roles
- **Master templates**: Sequences (≈40), Phases (≈120), Steps (≈1,200), Instructions (≈12,000), Controls (≈240)
- **Associations**: Team-user memberships (≈400), step-team impacts (≈1,800)

**Total Expected Records**: ≈15,282 across 15 database tables

### Business Value

- **Immediate operational readiness**: System populated with production-quality data
- **Reduced manual entry**: Eliminates need for manual data creation (estimated 200+ hours saved)
- **Improved testing accuracy**: Integration and UAT testing with realistic data volumes
- **Accelerated adoption**: Stakeholders can evaluate system with familiar cutover scenarios
- **Knowledge preservation**: Captures institutional knowledge from historical cutover events

### Success Criteria

1. **Data Integrity**: 100% referential integrity maintained across all foreign keys
2. **Data Completeness**: All 15,282+ records successfully imported with no data loss
3. **Lookup Accuracy**: All cascading entity lookups (teams, sequences, phases, controls) function correctly
4. **Audit Trail**: All records have proper `created_by='migration'` and timestamp values
5. **Performance**: Import completes in <30 minutes for full dataset
6. **Idempotency**: Import can be re-run safely without duplicate data creation

---

## Prerequisites

### TD-103: Performance Optimization Migration (CRITICAL)

**MUST BE COMPLETED BEFORE** this data import:

#### Scope

Implement performance indexes based on schema validation recommendations #3, #4, #5:

**Recommendation #3: Lookup Performance Indexes**

```sql
CREATE INDEX idx_sqm_name_plm ON sequences_master_sqm(plm_id, sqm_name);
CREATE INDEX idx_phm_name_sqm ON phases_master_phm(sqm_id, phm_name);
CREATE INDEX idx_ctm_code_phm ON controls_master_ctm(phm_id, ctm_code);
CREATE INDEX idx_tms_name ON teams_tms(tms_name);
CREATE INDEX idx_stm_phm ON steps_master_stm(phm_id);
CREATE INDEX idx_inm_stm ON instructions_master_inm(stm_id);
```

**Recommendation #4: Partial Indexes for Nullable FKs**

```sql
CREATE INDEX idx_inm_ctm_not_null ON instructions_master_inm(ctm_id)
WHERE ctm_id IS NOT NULL;

CREATE INDEX idx_inm_tms_not_null ON instructions_master_inm(tms_id)
WHERE tms_id IS NOT NULL;
```

**Recommendation #5: Junction Table Indexes**

```sql
CREATE INDEX idx_tms_x_usr_tms ON teams_tms_x_users_usr(tms_id);
CREATE INDEX idx_tms_x_usr_usr ON teams_tms_x_users_usr(usr_id);
CREATE INDEX idx_stm_x_tms_stm ON steps_master_stm_x_teams_tms_impacted(stm_id);
CREATE INDEX idx_stm_x_tms_tms ON steps_master_stm_x_teams_tms_impacted(tms_id);
```

#### Deliverable

- **Liquibase Changeset**: `performance-optimization-pre-import.xml`
- **Estimated Duration**: 1-2 hours
- **Story Points**: 2

---

## Acceptance Criteria

### AC-1: Bootstrap Data Successfully Created ✅

**GIVEN** an empty database with schema migrations applied
**WHEN** bootstrap data import executes
**THEN**:

- ✅ 3 roles created (ADM, USR, VWR)
- ✅ 1 default team created (tms_id=1, tms_name='Default Team')
- ✅ 1 admin user created with role ADM
- ✅ 1 default plan created with status ACTIVE (referencing status_sts table)
- ✅ 1 default migration created with status PLANNING and type MIGRATION (referencing status_sts table)
- ✅ All records have `created_by='migration'` and `updated_by='migration'`
- ✅ All records have `updated_at = created_at = CURRENT_TIMESTAMP`

**Status Values Clarification**:

- Plan status: Look up status_sts table for "ACTIVE" status ID
- Migration status: Look up status_sts table for "PLANNING" status ID
- Migration type: Look up migration_types table for "MIGRATION" type ID (NOT hardcoded string)

### AC-2: Excel Data Successfully Imported ✅

**GIVEN** bootstrap data exists
**WHEN** Excel file import executes
**THEN**:

- ✅ **applications_app.xlsx**: ≈150 application records created
- ⚠️ **step_types_stt.xlsx**: 9 step types imported (TRT, CHK, IGO, BGO, DUM, SYS, GON, BUS, PRE) with color codes
- ⚠️ **sequences_master_sqm.xlsx**: ≈40 base sequence records created with auto-generated `sqm_order`
- ✅ **teams_tms.xlsx**: ≈30 team records created (lookup by `tms_name`, NOT tms_code)
- ✅ **users_usr.xlsx**: ≈200 user records created with team associations
- ✅ All records include audit trail fields populated correctly

**Note**: ⚠️ indicates items requiring implementation (discovered 2025-10-08 during Phase 3 prep)

**Team Lookup Logic** (CORRECTED):

```sql
-- Lookup existing team by name
SELECT tms_id FROM teams_tms WHERE tms_name = ?

-- If not found, create new team
INSERT INTO teams_tms (tms_name, tms_email, created_by, updated_by, created_at, updated_at)
VALUES (?, ?, 'migration', 'migration', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
RETURNING tms_id;
```

### AC-3: JSON Hierarchical Import Succeeds ✅

**GIVEN** Excel data and bootstrap data exist
**WHEN** JSON file import executes across 1,174 files
**THEN**:

- ✅ **Sequences**: Additional ≈10-15 sequences created via cascading lookup
- ✅ **Phases**: ≈120 phases created with auto-generated `phm_order` per sequence
- ✅ **Steps**: ≈1,200 steps created (always create new, no lookup)
- ✅ **Instructions**: ≈12,000 instructions created (always create new)
- ✅ **Controls**: ≈240 controls created via cascading lookup by `ctm_code` within phase
- ✅ All parent-child relationships properly linked via foreign keys
- ✅ All nullable FKs handled gracefully (instructions without teams or controls)

**Lookup vs Create Logic**:

- **Sequences**: Lookup by `sqm_name` within `plm_id`, create if not found
- **Phases**: Lookup by `phm_name` within `sqm_id`, create if not found
- **Steps**: ALWAYS create new (no lookup)
- **Instructions**: ALWAYS create new (no lookup)
- **Controls**: Lookup by `ctm_code` within `phm_id`, create if not found
- **Teams**: Lookup by `tms_name`, create if not found (NO tms_code column exists)

### AC-4: Association Tables Populated ✅

**GIVEN** primary entity data exists
**WHEN** association import executes
**THEN**:

- ✅ **teams_tms_x_users_usr**: ≈400 memberships created (avg 2 teams per user)
- ✅ **steps_master_stm_x_teams_tms_impacted**: ≈1,800 associations (avg 1.5 impacted teams per step)
- ✅ All composite primary keys properly enforced
- ✅ All foreign keys validated before insertion
- ✅ Duplicate associations prevented via UNIQUE constraints

### AC-5: Data Integrity Verification Passes ✅

**GIVEN** import completed
**WHEN** validation queries execute
**THEN**:

- ✅ Zero orphaned records (all FKs reference valid parents)
- ✅ All NOT NULL constraints satisfied
- ✅ All UNIQUE constraints satisfied
- ✅ Record counts match expected totals (±5% tolerance for cascading variations)
- ✅ Sample data spot-checks validate correctness

**Validation Query Example**:

```sql
-- Verify no orphaned steps
SELECT COUNT(*) FROM steps_master_stm stm
LEFT JOIN phases_master_phm phm ON stm.phm_id = phm.phm_id
WHERE phm.phm_id IS NULL;
-- Expected result: 0
```

### AC-6: Audit Trail Fields Properly Set ✅

**GIVEN** any imported record
**WHEN** examining audit fields
**THEN**:

- ✅ `created_by = 'migration'` for all import records
- ✅ `updated_by = 'migration'` for all import records
- ✅ `created_at` set to import timestamp
- ✅ `updated_at = created_at` on INSERT operations (explicitly set, not relying on triggers)
- ✅ Timestamps are in UTC (TIMESTAMPTZ type)

**Implementation Detail**:

```groovy
// MANDATORY: Explicitly set updated_at = created_at on INSERT
def now = new java.sql.Timestamp(System.currentTimeMillis())
def auditFields = [
    created_by: 'migration',
    created_at: now,
    updated_by: 'migration',
    updated_at: now  // Explicitly set, do not rely on trigger
]
```

### AC-7: Error Handling Implements ADR-023 ✅

**GIVEN** import script execution
**WHEN** SQL errors occur
**THEN**:

- ✅ **23503** (FK violation): Clear error message with entity context
- ✅ **23505** (UNIQUE violation): Log duplicate, skip gracefully for lookup-or-create pattern
- ✅ **23502** (NOT NULL violation): Report missing required field
- ✅ **22001** (String truncation): Report value too long with column context
- ✅ All errors logged with timestamp, file context, record details
- ✅ Failed file imports do not block remaining files (granular rollback)

### AC-8: Transaction Boundaries Properly Defined ✅

**GIVEN** import execution
**WHEN** database operations occur
**THEN**:

- ✅ **Bootstrap**: Single transaction, rollback all on failure
- ✅ **Excel files**: Separate transaction per file, granular rollback
- ✅ **JSON files**: Separate transaction per file, continue on failure
- ✅ **Associations**: Single transaction, rollback all on failure
- ✅ All transactions use `Connection.TRANSACTION_READ_COMMITTED` isolation
- ✅ Successful commits logged, failed transactions rolled back and logged

### AC-9: Import Script Uses DatabaseUtil Pattern ✅

**GIVEN** import script implementation
**WHEN** reviewing code
**THEN**:

- ✅ **MANDATORY**: Uses `DatabaseUtil.withSql { sql -> }` pattern for all database access
- ✅ **MANDATORY**: Explicit type casting per ADR-031/ADR-043
- ✅ Uses prepared statements for all parameterized queries
- ✅ Follows repository pattern for data access (no inline SQL)
- ✅ Implements proper exception handling with typed exceptions
- ✅ No direct SQL connection management (handled by DatabaseUtil)

**Pattern Example**:

```groovy
DatabaseUtil.withSql { sql ->
    try {
        sql.connection.autoCommit = false

        def teamId = lookupOrCreateTeam(sql, teamName as String)
        def userId = createUser(sql, userData, teamId as Integer)

        sql.commit()
        return userId
    } catch (SQLException e) {
        sql.rollback()
        handleSqlException(e)
    }
}
```

### AC-10: Import Idempotency Verified ✅

**GIVEN** import has run once successfully
**WHEN** import runs again with same data
**THEN**:

- ✅ No duplicate records created
- ✅ Existing records not modified (INSERT...ON CONFLICT DO NOTHING or lookup-skip pattern)
- ✅ Import completes successfully with "already exists" log messages
- ✅ Record counts remain unchanged
- ✅ Updated_at timestamps not changed for existing records

### AC-11: Performance Targets Met ✅

**GIVEN** full dataset import
**WHEN** execution completes **THEN**:

- ✅ Bootstrap phase: <1 minute
- ✅ Excel import: <5 minutes (all 5 files)
- ✅ JSON import: <20 minutes (all 1,174 files)
- ✅ Association import: <4 minutes
- ✅ **Total duration**: <30 minutes for complete import
- ✅ Memory usage: <2GB for import process
- ✅ CPU usage: <80% average during import

---

## Technical Implementation

### Phase 1: Bootstrap Data Import (NO SCHEMA CHANGES NEEDED)

**Scope**: Create foundational data required for foreign key relationships

**Implementation**:

```sql
--liquibase formatted sql
--changeset lucas.challamel:044_us104_bootstrap_data splitStatements:false

-- Step 1: Insert 3 roles
INSERT INTO roles_rls (rls_code, rls_description, created_by, updated_by)
VALUES
    ('ADM', 'Administrator', 'migration', 'migration'),
    ('USR', 'Standard User', 'migration', 'migration'),
    ('VWR', 'Viewer', 'migration', 'migration')
ON CONFLICT (rls_code) DO NOTHING;

-- Step 2: Insert default team (lookup by tms_name in subsequent imports)
INSERT INTO teams_tms (tms_id, tms_name, tms_email, created_by, updated_by, created_at, updated_at)
VALUES (
    1,
    'Default Team',
    'default@example.com',
    'migration',
    'migration',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (tms_id) DO NOTHING;

-- Step 3: Insert admin user
INSERT INTO users_usr (usr_code, usr_first_name, usr_last_name, usr_email, usr_is_admin, rls_id, created_by, updated_by, created_at, updated_at)
SELECT
    'ADM',
    'Admin',
    'User',
    'admin@example.com',
    TRUE,
    rls_id,
    'migration',
    'migration',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM roles_rls WHERE rls_code = 'ADM'
ON CONFLICT (usr_code) DO NOTHING;

-- Step 4: Insert default plan with ACTIVE status
INSERT INTO plans_master_plm (plm_id, tms_id, plm_name, plm_status, created_by, updated_by, created_at, updated_at)
SELECT
    gen_random_uuid(),
    1,
    'Default Plan',
    sts_id,  -- Lookup ACTIVE status from status_sts table
    'migration',
    'migration',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM status_sts WHERE sts_name = 'ACTIVE';

-- Step 5: Insert default migration with PLANNING status and MIGRATION type
INSERT INTO migrations_mig (mig_id, usr_id_owner, mig_name, mig_status, mig_type, created_by, updated_by, created_at, updated_at)
SELECT
    gen_random_uuid(),
    usr.usr_id,
    'Default Migration',
    sts.sts_id,  -- Lookup PLANNING status
    'MIGRATION',  -- Migration type (verify this is correct column type)
    'migration',
    'migration',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM users_usr usr
CROSS JOIN status_sts sts
WHERE usr.usr_code = 'ADM' AND sts.sts_name = 'PLANNING';

--rollback DELETE FROM migrations_mig WHERE created_by = 'migration';
--rollback DELETE FROM plans_master_plm WHERE created_by = 'migration';
--rollback DELETE FROM users_usr WHERE created_by = 'migration';
--rollback DELETE FROM teams_tms WHERE created_by = 'migration';
--rollback DELETE FROM roles_rls WHERE created_by = 'migration';
```

**Deliverables**:

- ✅ `044_us104_bootstrap_data.sql` in `local-dev-setup/liquibase/changelogs/`
- ✅ Validation query confirming 3 roles, 1 team, 1 user, 1 plan, 1 migration

### Phase 2: Excel Data Import

**Scope**: Import 5 Excel files with independent entity data

**File Processing Order**:

1. ✅ `applications_app.xlsx` (≈150 records, no dependencies) - **COMPLETED**
2. ⚠️ `step_types_stt.xlsx` (9 types: TRT, CHK, IGO, BGO, DUM, SYS, GON, BUS, PRE with colors) - **NEEDS IMPLEMENTATION**
3. ⚠️ `sequences_master_sqm.xlsx` (≈40 records, depends on default plan) - **NEEDS IMPLEMENTATION**
4. ✅ `teams_tms.xlsx` (≈30 records, lookup by tms_name) - **COMPLETED**
5. ✅ `users_usr.xlsx` (≈200 records, depends on roles, teams) - **COMPLETED**

**Phase 2 Status** (2025-10-08):

- Items 1, 4, 5 completed successfully with 241/241 records imported
- Items 2, 3 discovered missing during Phase 3 preparation
- These must be completed before Phase 3 can proceed

**Implementation Approach**:

**Option 1: Groovy Script → Liquibase SQL Changeset** (Recommended)

```groovy
// ExcelToLiquibaseGenerator.groovy
class ExcelToLiquibaseGenerator {
    static void main(String[] args) {
        def excelFiles = [
            'applications_app.xlsx',
            'step_types_stt.xlsx',
            'sequences_master_sqm.xlsx',
            'teams_tms.xlsx',
            'users_usr.xlsx'
        ]

        def changelog = generateLiquibaseChangelog(excelFiles)
        new File('045_us104_excel_import.sql').write(changelog)
        println "Generated 045_us104_excel_import.sql"
    }

    static String generateLiquibaseChangelog(List<String> files) {
        def sql = new StringBuilder()
        sql << "--liquibase formatted sql\n"
        sql << "--changeset lucas.challamel:045_us104_excel_import splitStatements:false\n\n"

        files.each { file ->
            sql << "-- Import from ${file}\n"
            sql << generateInsertStatements(file)
            sql << "\n"
        }

        sql << generateRollbackStatements()
        return sql.toString()
    }

    static String generateInsertStatements(String excelFile) {
        // Use Apache POI to read Excel
        // Generate INSERT...ON CONFLICT DO UPDATE statements
        // Include audit fields: created_by='migration', updated_at=created_at
    }
}
```

**Option 2: Direct Groovy Import Service** (Alternative)

```groovy
class ExcelImportService {

    void importAllExcelFiles() {
        DatabaseUtil.withSql { sql ->
            try {
                sql.connection.autoCommit = false

                def counts = [:]
                counts.applications = importApplications(sql)
                counts.stepTypes = importStepTypes(sql)
                counts.sequences = importSequences(sql)
                counts.teams = importTeams(sql)
                counts.users = importUsers(sql)

                sql.commit()
                log.info("Excel import complete: ${counts}")

            } catch (SQLException e) {
                sql.rollback()
                throw new RuntimeException("Excel import failed: ${e.message}", e)
            }
        }
    }

    int importTeams(Sql sql) {
        def workbook = new XSSFWorkbook(new File('teams_tms.xlsx'))
        def sheet = workbook.getSheetAt(0)

        int count = 0
        sheet.each { row ->
            if (row.rowNum == 0) return  // Skip header

            def teamName = row.getCell(0)?.stringCellValue
            def teamEmail = row.getCell(1)?.stringCellValue

            // Lookup by tms_name, NOT tms_code
            def existing = sql.firstRow(
                'SELECT tms_id FROM teams_tms WHERE tms_name = ?',
                [teamName]
            )

            if (!existing) {
                def now = new Timestamp(System.currentTimeMillis())
                sql.execute('''
                    INSERT INTO teams_tms (tms_name, tms_email, created_by, updated_by, created_at, updated_at)
                    VALUES (?, ?, 'migration', 'migration', ?, ?)
                ''', [teamName, teamEmail, now, now])
                count++
            }
        }

        return count
    }
}
```

**Deliverables**:

- ✅ `ExcelImportService.groovy` OR `045_us104_excel_import.sql`
- ✅ Unit tests for each Excel import method
- ✅ Integration test verifying record counts

### Phase 3: JSON Hierarchical Import

**Scope**: Import 1,174 JSON files creating sequences, phases, steps, instructions, controls

**JSON File Structure Example**:

```json
{
  "sequence": "PRE-MIGRATION",
  "phase": "PREPARATION",
  "step": {
    "number": "PRE-001",
    "name": "Verify source database connectivity",
    "owner_team": "Database Team",
    "type": "MAN",
    "target_environment": "Production",
    "impacted_teams": ["Database Team", "Application Team"]
  },
  "instructions": [
    {
      "order": 1,
      "body": "Connect to source database server",
      "assigned_team": "Database Team",
      "control": null
    },
    {
      "order": 2,
      "body": "Execute connectivity test script",
      "assigned_team": "Database Team",
      "control": "PRE-PREP-001"
    }
  ],
  "controls": [
    {
      "code": "PRE-PREP-001",
      "name": "Database Connection Verification",
      "type": "GATE"
    }
  ]
}
```

**Implementation Pattern**:

```groovy
class JsonImportService {

    Map<String, Integer> importAllJsonFiles() {
        DatabaseUtil.withSql { sql ->
            def jsonDir = new File('db/import-data/rawData/json')
            def jsonFiles = jsonDir.listFiles()?.findAll { it.name.endsWith('.json') }

            def totalCounts = [sequences: 0, phases: 0, steps: 0, instructions: 0, controls: 0]
            def failed = []

            jsonFiles.each { jsonFile ->
                try {
                    sql.connection.autoCommit = false

                    def counts = importSingleJsonFile(sql, jsonFile)
                    totalCounts.sequences += counts.sequences
                    totalCounts.phases += counts.phases
                    totalCounts.steps += counts.steps
                    totalCounts.instructions += counts.instructions
                    totalCounts.controls += counts.controls

                    sql.commit()
                    log.info("Imported ${jsonFile.name}: ${counts}")

                } catch (Exception e) {
                    sql.rollback()
                    log.error("Failed ${jsonFile.name}: ${e.message}", e)
                    failed << jsonFile.name
                }
            }

            if (failed) {
                log.warn("Failed files: ${failed}")
            }

            return totalCounts
        }
    }

    Map<String, Integer> importSingleJsonFile(Sql sql, File jsonFile) {
        def json = new JsonSlurper().parse(jsonFile)
        def counts = [sequences: 0, phases: 0, steps: 0, instructions: 0, controls: 0]

        // Get default plan UUID
        def defaultPlan = sql.firstRow('SELECT plm_id FROM plans_master_plm WHERE plm_name = ?', ['Default Plan'])
        def plmId = defaultPlan.plm_id

        // Step 1: Lookup or create sequence
        def sqmId = lookupOrCreateSequence(sql, json.sequence as String, plmId, counts)

        // Step 2: Lookup or create phase
        def phmId = lookupOrCreatePhase(sql, json.phase as String, sqmId, counts)

        // Step 3: Create controls (lookup-or-create by code within phase)
        def controlMap = [:]
        json.controls?.each { ctrl ->
            def ctmId = lookupOrCreateControl(sql, ctrl, phmId, counts)
            controlMap[ctrl.code as String] = ctmId
        }

        // Step 4: ALWAYS create new step (no lookup)
        def stmId = createStep(sql, json.step as Map, phmId, counts)

        // Step 5: ALWAYS create new instructions
        json.instructions?.each { instr ->
            createInstruction(sql, instr as Map, stmId, controlMap, counts)
        }

        // Step 6: Create impacted team associations
        createImpactedTeamAssociations(sql, stmId, json.step.impacted_teams as List)

        return counts
    }

    UUID lookupOrCreateSequence(Sql sql, String sqmName, UUID plmId, Map counts) {
        // Lookup by name within plan
        def existing = sql.firstRow(
            'SELECT sqm_id FROM sequences_master_sqm WHERE plm_id = ? AND sqm_name = ?',
            [plmId, sqmName]
        )

        if (existing) {
            return existing.sqm_id as UUID
        }

        // Auto-generate sqm_order = MAX + 1
        def maxOrder = sql.firstRow(
            'SELECT COALESCE(MAX(sqm_order), 0) as max_order FROM sequences_master_sqm WHERE plm_id = ?',
            [plmId]
        ).max_order as Integer

        def newOrder = maxOrder + 1
        def now = new Timestamp(System.currentTimeMillis())

        def result = sql.firstRow('''
            INSERT INTO sequences_master_sqm
            (sqm_id, plm_id, sqm_order, sqm_name, created_by, updated_by, created_at, updated_at)
            VALUES (gen_random_uuid(), ?, ?, ?, 'migration', 'migration', ?, ?)
            RETURNING sqm_id
        ''', [plmId, newOrder, sqmName, now, now])

        counts.sequences++
        return result.sqm_id as UUID
    }

    UUID lookupOrCreatePhase(Sql sql, String phmName, UUID sqmId, Map counts) {
        // Lookup by name within sequence
        def existing = sql.firstRow(
            'SELECT phm_id FROM phases_master_phm WHERE sqm_id = ? AND phm_name = ?',
            [sqmId, phmName]
        )

        if (existing) {
            return existing.phm_id as UUID
        }

        // Auto-generate phm_order = MAX + 1 within sequence
        def maxOrder = sql.firstRow(
            'SELECT COALESCE(MAX(phm_order), 0) as max_order FROM phases_master_phm WHERE sqm_id = ?',
            [sqmId]
        ).max_order as Integer

        def newOrder = maxOrder + 1
        def now = new Timestamp(System.currentTimeMillis())

        def result = sql.firstRow('''
            INSERT INTO phases_master_phm
            (phm_id, sqm_id, phm_order, phm_name, created_by, updated_by, created_at, updated_at)
            VALUES (gen_random_uuid(), ?, ?, ?, 'migration', 'migration', ?, ?)
            RETURNING phm_id
        ''', [sqmId, newOrder, phmName, now, now])

        counts.phases++
        return result.phm_id as UUID
    }

    Integer lookupOrCreateTeamByName(Sql sql, String teamName) {
        // Lookup team by tms_name (NOT tms_code)
        def existing = sql.firstRow(
            'SELECT tms_id FROM teams_tms WHERE tms_name = ?',
            [teamName]
        )

        if (existing) {
            return existing.tms_id as Integer
        }

        // Create new team if not found
        def now = new Timestamp(System.currentTimeMillis())
        def result = sql.firstRow('''
            INSERT INTO teams_tms (tms_name, created_by, updated_by, created_at, updated_at)
            VALUES (?, 'migration', 'migration', ?, ?)
            RETURNING tms_id
        ''', [teamName, now, now])

        return result.tms_id as Integer
    }

    UUID createStep(Sql sql, Map stepData, UUID phmId, Map counts) {
        // ALWAYS create new step (no lookup)
        def ownerTeamId = lookupOrCreateTeamByName(sql, stepData.owner_team as String)
        def sttCode = stepData.type as String

        // Lookup environment role by target environment name
        def enrRow = sql.firstRow(
            'SELECT enr_id FROM environment_roles_enr WHERE enr_name = ?',
            [stepData.target_environment]
        )
        def enrId = enrRow?.enr_id as Integer

        def now = new Timestamp(System.currentTimeMillis())

        def result = sql.firstRow('''
            INSERT INTO steps_master_stm
            (stm_id, phm_id, tms_id_owner, stt_code, stm_number, enr_id_target, stm_name,
             created_by, updated_by, created_at, updated_at)
            VALUES (gen_random_uuid(), ?, ?, ?, ?, ?, ?, 'migration', 'migration', ?, ?)
            RETURNING stm_id
        ''', [phmId, ownerTeamId, sttCode, stepData.number, enrId, stepData.name, now, now])

        counts.steps++
        return result.stm_id as UUID
    }

    void createInstruction(Sql sql, Map instrData, UUID stmId, Map<String, UUID> controlMap, Map counts) {
        // ALWAYS create new instruction (no lookup)
        def tmsId = instrData.assigned_team ?
            lookupOrCreateTeamByName(sql, instrData.assigned_team as String) : null

        def ctmId = instrData.control ? controlMap[instrData.control as String] : null

        def now = new Timestamp(System.currentTimeMillis())

        sql.execute('''
            INSERT INTO instructions_master_inm
            (inm_id, stm_id, inm_order, inm_body, tms_id, ctm_id,
             created_by, updated_by, created_at, updated_at)
            VALUES (gen_random_uuid(), ?, ?, ?, ?, ?, 'migration', 'migration', ?, ?)
        ''', [stmId, instrData.order as Integer, instrData.body, tmsId, ctmId, now, now])

        counts.instructions++
    }
}
```

**Deliverables**:

- ✅ `JsonImportService.groovy`
- ✅ Unit tests for lookup-or-create logic
- ✅ Integration test with sample JSON files
- ✅ Error handling and logging

### Phase 4: Association Tables Import

**Scope**: Populate many-to-many relationships

**Implementation**:

```groovy
class AssociationImportService {

    void importAllAssociations() {
        DatabaseUtil.withSql { sql ->
            try {
                sql.connection.autoCommit = false

                // Already handled during user import and JSON import
                // This phase is for validation and any missing associations

                def counts = [
                    teamUsers: validateTeamUserAssociations(sql),
                    stepImpactedTeams: validateStepImpactedTeams(sql)
                ]

                sql.commit()
                log.info("Association validation complete: ${counts}")

            } catch (SQLException e) {
                sql.rollback()
                throw new RuntimeException("Association import failed: ${e.message}", e)
            }
        }
    }
}
```

**Deliverables**:

- ✅ Validation queries confirming association counts
- ✅ Orphan detection and correction logic

---

## Testing Strategy

### Unit Tests

**ExcelImportServiceTest.groovy**:

```groovy
class ExcelImportServiceTest extends Specification {

    def "should import teams and lookup by tms_name"() {
        given: "Excel file with 30 teams"
        def excelFile = createTestExcelFile([
            ['Team Name', 'Email'],
            ['Database Team', 'db@example.com'],
            ['App Team', 'app@example.com']
        ])

        and: "empty database"
        cleanDatabase()

        when: "importing teams"
        def count = excelImportService.importTeams(excelFile)

        then: "teams created with correct lookup by name"
        count == 2
        def teams = sql.rows('SELECT tms_name FROM teams_tms ORDER BY tms_name')
        teams*.tms_name == ['App Team', 'Database Team']

        and: "re-import is idempotent"
        def count2 = excelImportService.importTeams(excelFile)
        count2 == 0  // No new records
    }
}
```

**JsonImportServiceTest.groovy**:

```groovy
class JsonImportServiceTest extends Specification {

    def "should create sequences with lookup-or-create pattern"() {
        given: "default plan exists"
        setupDefaultPlan()

        and: "JSON with sequence name"
        def json = [sequence: 'PRE-MIGRATION', phase: 'PREP', ...]

        when: "importing first time"
        def sqmId1 = jsonImportService.lookupOrCreateSequence(sql, 'PRE-MIGRATION', plmId, counts)

        then: "sequence created"
        sqmId1 != null
        counts.sequences == 1

        when: "importing second time with same name"
        def sqmId2 = jsonImportService.lookupOrCreateSequence(sql, 'PRE-MIGRATION', plmId, counts)

        then: "same sequence returned"
        sqmId2 == sqmId1
        counts.sequences == 1  // Not incremented
    }

    def "should auto-generate sqm_order correctly"() {
        given: "3 existing sequences with orders 1, 2, 3"
        setupSequences([
            [name: 'SEQ-A', order: 1],
            [name: 'SEQ-B', order: 2],
            [name: 'SEQ-C', order: 3]
        ])

        when: "creating new sequence"
        def sqmId = jsonImportService.lookupOrCreateSequence(sql, 'SEQ-D', plmId, counts)

        then: "order is 4"
        def result = sql.firstRow('SELECT sqm_order FROM sequences_master_sqm WHERE sqm_id = ?', [sqmId])
        result.sqm_order == 4
    }
}
```

### Integration Tests

**US104DataImportIntegrationTest.groovy**:

```groovy
class US104DataImportIntegrationTest extends Specification {

    def "should complete full import with expected record counts"() {
        given: "clean database with schema"
        resetDatabaseToBaseline()

        when: "running complete import"
        def bootstrapCounts = bootstrapImportService.importBootstrapData()
        def excelCounts = excelImportService.importAllExcelFiles()
        def jsonCounts = jsonImportService.importAllJsonFiles()
        def assocCounts = associationImportService.importAllAssociations()

        then: "bootstrap data correct"
        bootstrapCounts.roles == 3
        bootstrapCounts.teams == 1
        bootstrapCounts.users == 1
        bootstrapCounts.plans == 1
        bootstrapCounts.migrations == 1

        and: "Excel data within expected ranges"
        excelCounts.applications >= 140 && excelCounts.applications <= 160
        excelCounts.teams >= 25 && excelCounts.teams <= 35
        excelCounts.users >= 190 && excelCounts.users <= 210

        and: "JSON data within expected ranges"
        jsonCounts.sequences >= 35 && jsonCounts.sequences <= 45
        jsonCounts.phases >= 110 && jsonCounts.phases <= 130
        jsonCounts.steps >= 1100 && jsonCounts.steps <= 1300
        jsonCounts.instructions >= 11000 && jsonCounts.instructions <= 13000
        jsonCounts.controls >= 230 && jsonCounts.controls <= 250

        and: "associations correct"
        assocCounts.teamUsers >= 380 && assocCounts.teamUsers <= 420
        assocCounts.stepImpactedTeams >= 1700 && assocCounts.stepImpactedTeams <= 1900

        and: "audit fields properly set"
        verifyAuditFields()
    }

    def "should handle import errors gracefully"() {
        given: "corrupt JSON file"
        def corruptFile = createCorruptJsonFile()

        when: "importing"
        def result = jsonImportService.importSingleJsonFile(sql, corruptFile)

        then: "error logged but execution continues"
        thrown(JsonParseException)

        and: "transaction rolled back for failed file"
        sql.rows('SELECT COUNT(*) FROM steps_master_stm WHERE created_by = ?', ['migration']).count == 0
    }

    def "should verify referential integrity after import"() {
        given: "complete import executed"
        runCompleteImport()

        expect: "no orphaned records"
        sql.firstRow('''
            SELECT COUNT(*) as cnt FROM steps_master_stm stm
            LEFT JOIN phases_master_phm phm ON stm.phm_id = phm.phm_id
            WHERE phm.phm_id IS NULL
        ''').cnt == 0

        sql.firstRow('''
            SELECT COUNT(*) as cnt FROM instructions_master_inm inm
            LEFT JOIN steps_master_stm stm ON inm.stm_id = stm.stm_id
            WHERE stm.stm_id IS NULL
        ''').cnt == 0
    }
}
```

### Manual Test Scenarios

**Test Scenario 1: Fresh Import**

```bash
# 1. Reset database
cd local-dev-setup
npm run restart:erase

# 2. Apply schema migrations
npm run liquibase:update

# 3. Run import
groovy src/groovy/umig/scripts/RunDataImport.groovy

# 4. Verify counts
psql -h localhost -U umig_app -d umig_app_db -f verify_import_counts.sql

# Expected output:
# roles_rls: 3
# teams_tms: ~120
# users_usr: ~200
# sequences_master_sqm: ~40
# phases_master_phm: ~120
# steps_master_stm: ~1200
# instructions_master_inm: ~12000
# controls_master_ctm: ~240
```

**Test Scenario 2: Idempotent Re-Import**

```bash
# 1. Run import twice
groovy src/groovy/umig/scripts/RunDataImport.groovy
groovy src/groovy/umig/scripts/RunDataImport.groovy

# 2. Verify counts unchanged
psql -h localhost -U umig_app -d umig_app_db -c "
SELECT COUNT(*) FROM teams_tms;
"
# Expected: Same count as Test Scenario 1

# 3. Verify no duplicate sequences
psql -h localhost -U umig_app -d umig_app_db -c "
SELECT sqm_name, COUNT(*) as cnt
FROM sequences_master_sqm
GROUP BY sqm_name, plm_id
HAVING COUNT(*) > 1;
"
# Expected: 0 rows
```

**Test Scenario 3: Audit Trail Verification**

```bash
psql -h localhost -U umig_app -d umig_app_db -c "
SELECT created_by, COUNT(*) as cnt
FROM steps_master_stm
GROUP BY created_by;
"
# Expected: created_by='migration', cnt~1200

psql -h localhost -U umig_app -d umig_app_db -c "
SELECT COUNT(*) as cnt
FROM instructions_master_inm
WHERE updated_at != created_at;
"
# Expected: 0 (both timestamps should be equal on INSERT)
```

---

## Risks & Mitigation

### Risk 1: JSON File Parsing Failures

**Likelihood**: Medium | **Impact**: Medium
**Mitigation**:

- ✅ Implement granular rollback (per-file transactions)
- ✅ Log all parsing errors with file context
- ✅ Continue processing remaining files after failure
- ✅ Generate failure report at end of import
- ✅ Validate JSON schema before processing

### Risk 2: Cascading Lookup Performance Degradation

**Likelihood**: Low | **Impact**: High
**Mitigation**:

- ✅ **PREREQUISITE**: TD-103 performance optimization migration MUST run first
- ✅ Use prepared statements with parameter caching
- ✅ Implement batch lookups where possible
- ✅ Monitor import performance with logging timestamps
- ✅ Add indexes for lookup columns (prerequisite)

### Risk 3: Data Consistency Issues (Duplicate Teams)

**Likelihood**: Medium | **Impact**: Medium
**Mitigation**:

- ✅ Use `tms_name` as lookup key (CORRECTED from tms_code)
- ✅ Standardize team name formats (trim whitespace, case-insensitive comparison)
- ✅ Generate deduplication report before import
- ✅ Manual review of team merges if needed

### Risk 4: Memory Exhaustion with Large JSON Files

**Likelihood**: Low | **Impact**: High
**Mitigation**:

- ✅ Process JSON files one at a time (no bulk loading)
- ✅ Use streaming JSON parser if file >10MB
- ✅ Commit transactions per file to release memory
- ✅ Monitor JVM heap usage during import

### Risk 5: Import Duration Exceeds 30-Minute Target

**Likelihood**: Medium | **Impact**: Medium
**Mitigation**:

- ✅ **PREREQUISITE**: TD-103 performance indexes MUST exist
- ✅ Implement progress logging (file X of Y)
- ✅ Consider parallel JSON import (if >45 minutes observed)
- ✅ Optimize lookup queries with indexes (prerequisite)

---

## Dependencies

### Prerequisite Stories/Tasks

- **TD-103**: Performance Optimization Migration (CRITICAL - MUST RUN FIRST)
  - Implements recommendations #3, #4, #5 from schema validation
  - Estimated: 1-2 hours, 2 story points
  - Deliverable: `performance-optimization-pre-import.xml`

### External Dependencies

- ✅ Schema migrations 001-043 applied
- ✅ Bootstrap environment roles, iteration types, step types exist
- ✅ status_sts table populated with status values
- ✅ migration_types table populated (verify MIGRATION type exists)
- ✅ Excel files available at `db/import-data/rawData/*.xlsx`
- ✅ JSON files available at `db/import-data/rawData/json/*.json`

### Technical Dependencies

- ✅ DatabaseUtil.withSql pattern (MANDATORY)
- ✅ Apache POI library for Excel reading
- ✅ Groovy JsonSlurper for JSON parsing
- ✅ Liquibase for changeset management
- ✅ PostgreSQL 14+ with UUID support

---

## Documentation Requirements

### Developer Documentation

- ✅ **Data Import Developer Guide**: `docs/technical/US-104-Data-Import-Developer-Guide.md`
  - Import script architecture
  - Lookup-or-create pattern examples
  - Error handling patterns
  - Testing strategies

### Operational Documentation

- ✅ **Data Import Runbook**: `docs/operations/US-104-Data-Import-Runbook.md`
  - Pre-import checklist
  - Execution commands
  - Verification queries
  - Rollback procedures

### User Documentation

- ✅ **Data Import User Guide**: `docs/user-guides/US-104-Data-Import-User-Guide.md`
  - What data is imported
  - Expected outcomes
  - Troubleshooting common issues

---

## Story Points Breakdown

**Total: 13 Story Points**

| Phase                    | Complexity | Risk   | Story Points |
| ------------------------ | ---------- | ------ | ------------ |
| Bootstrap Data           | Simple     | Low    | 1            |
| Excel Import             | Moderate   | Medium | 3            |
| JSON Hierarchical Import | High       | High   | 6            |
| Association Import       | Simple     | Low    | 1            |
| Testing & Validation     | Moderate   | Medium | 2            |

**Rationale**:

- Large dataset (15,282 records) across 15 tables
- Complex hierarchical relationships requiring cascading lookups
- Multiple data sources (Excel + JSON)
- Idempotency requirements
- Performance optimization considerations
- Comprehensive error handling and logging

---

## Definition of Done

- [✅] All 15 acceptance criteria met and verified
- [✅] TD-103 prerequisite migration completed successfully
- [✅] Bootstrap data import tested and validated
- [✅] Excel import tested with all 5 files
- [✅] JSON import tested with sample files (minimum 100 files)
- [✅] Association tables populated correctly
- [✅] All unit tests passing (100% coverage for import logic)
- [✅] Integration test passing with full dataset
- [✅] Performance targets met (<30 minutes total import)
- [✅] Idempotency verified (re-import produces no duplicates)
- [✅] Audit trail verified (created_by='migration', updated_at=created_at)
- [✅] Referential integrity verified (no orphaned records)
- [✅] Error handling tested with corrupt data
- [✅] Documentation complete (developer guide, runbook, user guide)
- [✅] Code review completed (ADR-031, ADR-043, DatabaseUtil compliance)
- [✅] ADR created documenting import decisions

---

## Related Documentation

- **Schema Validation Report**: `/claudedocs/US-104-Schema-Validation-Report.md`
- **ADR-059**: Schema as Authority - Fix Code, Not Schema
- **ADR-031**: Type Safety - Explicit Casting for Parameters
- **ADR-043**: PostgreSQL JDBC Type Casting Requirements
- **ADR-023**: SQL Error Handling with State Codes
- **CLAUDE.md**: DatabaseUtil.withSql Pattern (MANDATORY)

---

## Notes

### Stakeholder Feedback Incorporated (2025-10-08)

**CRITICAL SCHEMA CORRECTIONS**:

1. ❌ **REMOVED**: `teams_tms.tms_code` column requirement - Schema is correct with `tms_id` (PK) + `tms_name`
2. ❌ **REMOVED**: UNIQUE constraints on sequences/phases - Handled via lookup queries, not DB constraints
3. ❌ **REMOVED**: CHECK constraints for status values - Managed via `status_sts` table, not hardcoded strings
4. ✅ **CORRECTED**: Team lookup logic uses `tms_name`, NOT `tms_code`
5. ✅ **CORRECTED**: Bootstrap defaults reference `status_sts` table (ACTIVE, PLANNING statuses)
6. ✅ **CONFIRMED**: Explicit `updated_at = created_at` on INSERT operations required
7. ✅ **ADDED**: Prerequisite TD-103 for performance optimization migration

**Key Principle**: ADR-059 compliance - Schema is authority. Import logic adapts to schema, not vice versa.

### Implementation Priority

1. **FIRST**: Complete TD-103 (performance indexes) - BLOCKS all data import work
2. **SECOND**: Bootstrap data import (foundation for all other imports)
3. **THIRD**: Excel imports (independent entity data)
4. **FOURTH**: JSON hierarchical import (largest complexity)
5. **FIFTH**: Validation and testing

### Success Metrics

- **Data Completeness**: 100% of source records successfully imported
- **Data Accuracy**: Spot-check validation confirms data integrity
- **Performance**: Import completes in <30 minutes
- **Reliability**: Idempotent re-runs produce consistent results
- **Auditability**: All records traceable via `created_by='migration'`
