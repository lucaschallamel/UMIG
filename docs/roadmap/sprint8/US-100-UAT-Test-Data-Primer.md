# US-100: UAT Test Data Primer - Lightweight Data Generation

**Story Points**: 3 (8-9 hours)
**Priority**: HIGH
**Sprint**: Sprint 8 or Sprint 9
**Status**: Ready for Implementation
**Created**: October 6, 2025

## Story Overview

**Epic**: UAT Infrastructure & Testing Automation
**Related Work**: US-098 Configuration Management System (100% complete)

## User Story

**As a** UAT environment administrator
**I want** a lightweight test data generation script that creates a minimal but complete dataset
**So that** I can quickly initialize UAT environments with consistent, shared-email test users for efficient testing workflows

## Business Value

- **Reduces UAT setup time** from manual data entry (30+ minutes) to automated generation (<10 seconds)
- **Enables rapid environment refresh** for iterative testing cycles
- **Supports shared email testing** (guq@ext.ubp.ch) for simplified UAT user management
- **Provides consistent baseline** for UAT acceptance testing and demonstrations

## Acceptance Criteria

### Functional Requirements

#### AC-1: Script Execution

**Given** the UAT environment requires initialization
**When** I execute `npm run generate-data:light` from local-dev-setup directory
**Then** the script completes successfully within 10 seconds
**And** all data is generated without errors
**And** execution logs confirm successful data creation

#### AC-2: User Generation with Shared Email

**Given** the script executes successfully
**When** I query the users_usr table
**Then** exactly 4 users exist with email 'guq@ext.ubp.ch'
**And** 1 user has role 'ADMIN' with trigram 'GUQ'
**And** 1 user has role 'PILOT'
**And** 2 users have role 'NORMAL'
**And** all users have valid UUIDs and timestamps

**Database Validation**:

```sql
SELECT usr_trigram, usr_email, usr_role, usr_status
FROM users_usr
WHERE usr_email = 'guq@ext.ubp.ch';
-- Expected: 4 rows returned
```

#### AC-3: Admin User Configuration

**Given** users are generated
**When** I query for the ADMIN user
**Then** the user has trigram 'GUQ'
**And** email 'guq@ext.ubp.ch'
**And** role 'ADMIN'
**And** status 'ACTIVE'
**And** is associated with IT_CUTOVER team

#### AC-4: Team Generation

**Given** the script executes successfully
**When** I query the teams_team table
**Then** exactly 3 teams exist:

- IT_CUTOVER (team_code: 'IT_CUTOVER')
- ALPHA (team_code: 'ALPHA')
- BETA (team_code: 'BETA')
  **And** all teams have status 'ACTIVE'

#### AC-5: Team-User Associations

**Given** users and teams are generated
**When** I query the team_members_tmbr table
**Then** ADMIN user is member of IT_CUTOVER team
**And** PILOT user is member of IT_CUTOVER team
**And** 1 NORMAL user is member of ALPHA team
**And** 1 NORMAL user is member of BETA team
**And** all associations have valid foreign keys

**Database Validation**:

```sql
SELECT t.team_name, u.usr_trigram, u.usr_role
FROM team_members_tmbr tm
JOIN teams_team t ON tm.tmbr_team_id = t.team_id
JOIN users_usr u ON tm.tmbr_usr_id = u.usr_id
ORDER BY t.team_name, u.usr_role DESC;
-- Expected: 4 rows with correct team assignments
```

#### AC-6: Minimal Canonical Plan Hierarchy

**Given** the script executes successfully
**When** I query the plan hierarchy tables
**Then** exactly 1 master sequence exists (seq_type = 'CANONICAL')
**And** exactly 1 master phase exists linked to the sequence
**And** exactly 1 master step exists linked to the phase
**And** exactly 1 master instruction exists linked to the step
**And** exactly 1 master control exists associated with the step
**And** all hierarchy relationships maintain referential integrity

**Database Validation**:

```sql
SELECT
  (SELECT COUNT(*) FROM sequences_seq WHERE seq_type = 'CANONICAL') as sequences,
  (SELECT COUNT(*) FROM phases_phs) as phases,
  (SELECT COUNT(*) FROM steps_stp) as steps,
  (SELECT COUNT(*) FROM instructions_inst) as instructions,
  (SELECT COUNT(*) FROM controls_ctrl) as controls;
-- Expected: 1, 1, 1, 1, 1
```

#### AC-7: Migration and Iteration Generation

**Given** the script executes successfully
**When** I query migrations and iterations tables
**Then** exactly 1 migration exists
**And** exactly 1 iteration exists with name 'RUN1'
**And** iteration type is 'RUN'
**And** iteration is linked to the migration via foreign key

#### AC-8: Referential Integrity

**Given** all data is generated
**When** I validate foreign key relationships
**Then** all user-team associations reference valid users and teams
**And** all plan hierarchy relationships are valid
**And** all iteration-migration relationships are valid
**And** no orphaned records exist
**And** all UUIDs are properly formatted

**Database Validation**:

```sql
-- Validate no FK violations
SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
  AND table_schema = 'public'
  AND NOT is_deferrable;
-- All constraints should pass validation
```

#### AC-9: Environment Generation

**Given** the script executes successfully
**When** I query the environments table
**Then** exactly 3 environments exist: DEV, UAT, PROD
**And** all environments have status 'ACTIVE'
**And** environment codes match existing system configuration

### Technical Requirements

#### AC-10: Performance Optimization

**Given** the script is executed
**When** I measure execution time
**Then** total execution completes in less than 10 seconds
**And** database connection pool is used efficiently
**And** no memory leaks occur during execution

**Performance Validation**:

```bash
time npm run generate-data:light
# Expected: real < 10.0s
```

#### AC-11: Idempotency

**Given** the script has been executed once
**When** I execute `npm run generate-data:light` again
**Then** the script completes successfully
**And** no duplicate records are created
**And** existing data is either preserved or cleanly replaced
**And** referential integrity is maintained

**Idempotency Test**:

```bash
npm run generate-data:light
COUNT1=$(psql -d umig_app_db -tAc "SELECT COUNT(*) FROM users_usr WHERE usr_email = 'guq@ext.ubp.ch'")
npm run generate-data:light
COUNT2=$(psql -d umig_app_db -tAc "SELECT COUNT(*) FROM users_usr WHERE usr_email = 'guq@ext.ubp.ch'")
[ "$COUNT1" -eq "$COUNT2" ] && echo "PASS: Idempotent" || echo "FAIL: Duplicate data"
```

#### AC-12: Schema Migration Safety

**Given** Liquibase migration 037 is created
**When** I apply the migration
**Then** the UNIQUE constraint on users_usr.usr_email is removed
**And** the migration executes without errors
**And** existing data remains intact
**And** the constraint removal is logged in databasechangelog

**Migration Validation**:

```sql
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'users_usr'
  AND constraint_type = 'UNIQUE';
-- Expected: No UNIQUE constraint on usr_email column
```

#### AC-13: Rollback Capability

**Given** migration 037 is applied
**When** I execute Liquibase rollback to tag before migration 037
**Then** the UNIQUE constraint is restored on users_usr.usr_email
**And** the rollback completes without errors
**And** database state matches pre-migration 037 schema

**Rollback Test**:

```bash
npm run db:rollback -- --count=1
# Expected: Migration 037 rolled back successfully
psql -d umig_app_db -c "\d users_usr" | grep "usr_email.*unique"
# Expected: UNIQUE constraint present
```

#### AC-14: Error Handling and Transaction Safety

**Given** the script encounters an error during execution
**When** any data generation step fails
**Then** all changes are rolled back via transaction
**And** the database returns to pre-execution state
**And** a clear error message is logged
**And** the script exits with non-zero status code

#### AC-15: Comprehensive Logging

**Given** the script executes
**When** I review the execution logs
**Then** each major step is logged (users, teams, plans, migrations)
**And** record counts are reported for each entity type
**And** execution time is logged
**And** any warnings or errors are clearly identified
**And** log level supports debugging mode

**Log Output Example**:

```
[INFO] Starting lightweight UAT data generation...
[INFO] ✓ Schema migration 037 verified
[INFO] ✓ Generated 4 users with shared email guq@ext.ubp.ch
[INFO] ✓ Generated 3 teams (IT_CUTOVER, ALPHA, BETA)
[INFO] ✓ Generated minimal canonical plan hierarchy
[INFO] ✓ Generated 1 migration with iteration RUN1
[INFO] ✓ All referential integrity checks passed
[INFO] Execution completed in 7.2 seconds
```

### Quality Requirements

#### AC-16: Documentation Completeness

**Given** the implementation is complete
**When** I review the documentation
**Then** local-dev-setup/README.md includes `npm run generate-data:light` command
**And** command usage, purpose, and expected output are documented
**And** UAT workflow documentation explains when to use light vs full data generation
**And** troubleshooting guide covers common errors
**And** schema migration 037 rationale is documented in migration file

## Technical Specifications

### Database Schema Changes

#### Migration 037: Remove Email UNIQUE Constraint

**File**: `local-dev-setup/liquibase/changelogs/037_remove_usr_email_unique_constraint.sql`

```sql
-- Liquibase formatted SQL
-- changeset lucas:037-remove-usr-email-unique-constraint
-- comment: Remove UNIQUE constraint from users_usr.usr_email to support UAT testing with shared email addresses
-- preconditions onFail:MARK_RAN
-- precondition-sql-check expectedResult:1 SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_name='users_usr' AND constraint_type='UNIQUE' AND constraint_name LIKE '%usr_email%'

-- Remove UNIQUE constraint on usr_email column
ALTER TABLE users_usr
DROP CONSTRAINT IF EXISTS users_usr_usr_email_key;

-- Add comment documenting the schema change
COMMENT ON COLUMN users_usr.usr_email IS 'User email address (UNIQUE constraint removed for UAT testing - see US-100)';

-- rollback ALTER TABLE users_usr ADD CONSTRAINT users_usr_usr_email_key UNIQUE (usr_email);
-- rollback COMMENT ON COLUMN users_usr.usr_email IS 'User email address (unique)';
```

**Justification**:

- UAT testing requires 4 test users sharing email 'guq@ext.ubp.ch'
- Simplifies UAT environment management with single email credential
- User-approved exception to ADR-059 (Schema is Truth principle)
- Production environments will maintain email uniqueness through application logic

**Impact Analysis**:

- **Database**: UNIQUE constraint removed, allows duplicate emails
- **Application**: May require validation logic updates to handle duplicate emails
- **Testing**: Enables simplified UAT user management
- **Security**: No security impact - email is not used for authentication in test environments

### Script Architecture

#### File Structure

```
local-dev-setup/
├── scripts/
│   ├── umig_generate_light_data.js          # Main script (new)
│   ├── umig_generate_data.js                # Existing full data generation
│   └── utils/
│       ├── db_utils.js                       # Database utilities (reuse)
│       ├── faker_config.js                   # Faker configuration (reuse)
│       └── light_data_generators.js          # Minimal dataset generators (new)
└── package.json                              # Add new npm script
```

#### Configuration

```javascript
const CONFIG = {
  SHARED_EMAIL: "guq@ext.ubp.ch",
  ADMIN_TRIGRAM: "GUQ",
  TEAMS: ["IT_CUTOVER", "ALPHA", "BETA"],
  ITERATION_NAME: "RUN1",
  ITERATION_TYPE: "RUN",
};
```

#### Data Generation Summary

| Entity       | Count | Details                                                      |
| ------------ | ----- | ------------------------------------------------------------ |
| Users        | 4     | 1 ADMIN (GUQ), 1 PILOT, 2 NORMAL - all email: guq@ext.ubp.ch |
| Teams        | 3     | IT_CUTOVER, ALPHA, BETA                                      |
| Environments | 3     | DEV, UAT, PROD                                               |
| Sequences    | 1     | CANONICAL type                                               |
| Phases       | 1     | Linked to sequence                                           |
| Steps        | 1     | Linked to phase                                              |
| Instructions | 1     | Linked to step                                               |
| Controls     | 1     | Linked to step                                               |
| Migrations   | 1     | UAT Migration                                                |
| Iterations   | 1     | RUN1 (RUN type)                                              |

### npm Script Configuration

**File**: `local-dev-setup/package.json`

```json
{
  "scripts": {
    "generate-data:light": "node scripts/umig_generate_light_data.js",
    "generate-data:light:verbose": "DEBUG=* node scripts/umig_generate_light_data.js"
  }
}
```

## Implementation Phases

### Phase 1: Schema Migration (1-2 hours)

**Tasks**:

1. Create `local-dev-setup/liquibase/changelogs/037_remove_usr_email_unique_constraint.sql`
2. Add migration to `db.changelog-master.xml`
3. Test migration application
4. Test migration rollback
5. Update database documentation

**Validation**:

```bash
npm run db:migrate
psql -d umig_app_db -c "\d users_usr" | grep -i unique
# Should NOT show UNIQUE constraint on usr_email
```

### Phase 2: Script Architecture (2-3 hours)

**Tasks**:

1. Create `local-dev-setup/scripts/umig_generate_light_data.js`
2. Create `local-dev-setup/scripts/utils/light_data_generators.js`
3. Design configuration object
4. Implement main execution function with transaction safety
5. Add npm script to package.json

**Deliverables**:

- Main script with transaction management
- Configuration object with all settings
- npm script integration

### Phase 3: Data Generators (2-3 hours)

**Tasks**:

1. Implement `generateLightUsers()` with shared email support
2. Implement `generateLightTeams()` for 3 teams
3. Implement `generateMinimalCanonicalPlan()` with complete hierarchy
4. Implement `generateLightMigration()` for migration and iteration
5. Implement team-user association logic

**Deliverables**:

- User generator (4 users, shared email)
- Team generator (3 teams)
- Canonical plan generator (1-1-1-1-1 hierarchy)
- Migration generator (1 migration, 1 iteration)
- Association logic

### Phase 4: Testing & Validation (2-3 hours)

**Tasks**:

1. Execute script and validate all 16 acceptance criteria
2. Write unit tests for all generator functions
3. Write integration test for complete E2E execution
4. Test idempotency (run script twice)
5. Test error handling and transaction rollback
6. Performance test (verify <10 seconds)
7. Test migration rollback

**Validation Commands**:

```bash
npm run test:js:unit -- --testPathPattern=light_data
npm run test:js:integration -- --testPathPattern=light_data_e2e
time npm run generate-data:light  # Measure performance
```

### Phase 5: Documentation (1 hour)

**Tasks**:

1. Update `local-dev-setup/README.md` with new command
2. Create UAT workflow documentation
3. Add troubleshooting guide
4. Document migration 037 rationale
5. Add JSDoc comments to all functions

**Documentation Checklist**:

- [ ] README includes generate-data:light command
- [ ] Usage examples provided
- [ ] Troubleshooting section complete
- [ ] Migration includes header comments
- [ ] JSDoc comments on all functions

## Testing Strategy

### Unit Tests

**File**: `local-dev-setup/__tests__/scripts/light_data_generation.test.js`

**Test Coverage**:

- generateLightUsers() - 4 users with shared email
- generateLightTeams() - 3 teams
- generateMinimalCanonicalPlan() - complete hierarchy
- generateLightMigration() - 1 migration + 1 iteration
- Idempotency - safe to run multiple times
- Performance - execution time <10 seconds

### Integration Tests

**File**: `local-dev-setup/__tests__/integration/light_data_e2e.test.js`

**Test Scenarios**:

- Complete UAT dataset generation
- Referential integrity validation
- Transaction rollback on error
- Migration application and rollback

### Manual Testing Checklist

- [ ] Execute `npm run generate-data:light` successfully
- [ ] Verify 4 users with email guq@ext.ubp.ch in database
- [ ] Verify ADMIN user has trigram GUQ
- [ ] Verify 3 teams created (IT_CUTOVER, ALPHA, BETA)
- [ ] Verify team-user associations correct
- [ ] Verify minimal canonical plan hierarchy complete
- [ ] Verify 1 migration with 1 iteration RUN1
- [ ] Verify execution time <10 seconds
- [ ] Execute script twice to verify idempotency
- [ ] Test migration 037 rollback capability
- [ ] Verify all foreign key relationships intact
- [ ] Review execution logs for completeness

## Risk Mitigation

### Risk 1: Email Duplication Impact (MEDIUM)

**Risk**: Removing UNIQUE constraint may affect existing validation logic

**Mitigation**:

- Comprehensive testing of all email-based features
- Review codebase for email uniqueness assumptions
- Document exception in ADR
- Application-level validation for production environments

**Validation**:

```bash
# Search for email uniqueness validations
grep -r "usr_email.*unique" src/
grep -r "email.*duplicate" src/
```

### Risk 2: Performance Degradation (LOW)

**Risk**: Script may exceed 10-second performance target

**Mitigation**:

- Use database connection pooling
- Batch insert operations where possible
- Optimize query execution
- Profile execution time during development

### Risk 3: Referential Integrity Violations (LOW)

**Risk**: Foreign key violations during data generation

**Mitigation**:

- Transaction-based execution with rollback
- Explicit foreign key validation step
- Comprehensive integration testing
- Database constraint verification

## Dependencies

### Technical Dependencies

- Existing `umig_generate_data.js` infrastructure
- Liquibase migration system (migrations 001-036)
- Faker.js library for data generation
- PostgreSQL 14 database
- npm script ecosystem

### Functional Dependencies

- US-098 Configuration Management System (completed)
- Database schema version 036 (current baseline)
- UAT environment configuration

## Success Metrics

### Functional Success

- ✅ Script executes successfully via `npm run generate-data:light`
- ✅ All 16 acceptance criteria validated
- ✅ Zero referential integrity violations
- ✅ Idempotent execution confirmed

### Technical Success

- ✅ Execution time <10 seconds (target: 7-8 seconds)
- ✅ Migration 037 applied and tested
- ✅ Rollback capability verified
- ✅ Transaction safety confirmed

### Quality Success

- ✅ Unit test coverage ≥80%
- ✅ Integration tests passing
- ✅ Documentation complete and reviewed
- ✅ Code reviewed and approved

## Definition of Done

- [ ] Migration 037 created, tested, and documented
- [ ] umig_generate_light_data.js implemented with all generators
- [ ] npm script `generate-data:light` functional
- [ ] All 16 acceptance criteria validated
- [ ] Unit tests written and passing (≥80% coverage)
- [ ] Integration tests written and passing
- [ ] Performance target met (<10 seconds)
- [ ] Idempotency verified
- [ ] Error handling and transaction rollback tested
- [ ] Documentation updated (README, workflow, troubleshooting)
- [ ] Migration rollback capability verified
- [ ] Code reviewed and approved
- [ ] Committed to feature branch
- [ ] Ready for UAT deployment

---

**Story Status**: Ready for Implementation
**Created**: October 6, 2025
**Story Points**: 3 (8-9 hours estimated effort)
**Sprint**: Sprint 8 or Sprint 9 (11.5 points remaining in Sprint 8)
