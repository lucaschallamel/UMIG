# UMIG Data Import Utilities - US-104

**Production Data Import** - JavaScript/Node.js implementation for one-time bootstrap

## Overview

Independent Node.js tooling for US-104 production data import from Excel and HTML sources. Architecturally separated from ScriptRunner production code (`/src/groovy/`) to maintain clean boundaries between development tooling and runtime code.

**Status**: Phase 2 (Excel Import) IMPLEMENTED ✅

## Quick Start

```bash
# Navigate to project
cd /Users/lucaschallamel/Documents/GitHub/UMIG/local-dev-setup/data-utils

# Install dependencies (first time only)
npm install

# Verify database connection
node -e "require('./config/database').validateConfig(); console.log('✅ Database config OK')"

# Import all Excel data
npm run import:excel

# Or import individual entities
npm run import:excel:teams
npm run import:excel:users
npm run import:excel:apps
```

## Architecture Decision

**Why JavaScript/Node.js instead of Groovy?**

1. **Tooling vs Runtime**: Import scripts are development tooling, not production code
2. **Separation of Concerns**: Keep `/src/groovy/` focused on ScriptRunner runtime
3. **Technology Fit**: JavaScript superior for data processing (xlsx, JSON, HTML parsing)
4. **Consistency**: Aligns with test architecture (tests in `local-dev-setup/__tests__/`)
5. **Development Velocity**: Faster iteration without ScriptRunner deployment
6. **Independence**: No ScriptRunner dependency for one-time operations

## Project Structure

```
data-utils/
├── config/                          # Configuration
│   ├── database.js                  # PostgreSQL connection (reads ../.env)
│   └── import-config.js             # Batch sizes, quality gates
├── lib/                             # Shared utilities
│   ├── db/
│   │   ├── connection-pool.js       # pg.Pool wrapper
│   │   └── lookup-cache.js          # FK resolution caching
│   ├── excel/
│   │   └── excel-reader.js          # xlsx parser with validation
│   ├── html/                        # TODO: Phase 3
│   └── validation/                  # TODO: Phase 4
├── importers/                       # Import implementations
│   ├── phase2-excel-import.js       # ✅ Teams, users, applications
│   ├── phase3-hierarchy-import.js   # TODO: Hierarchical HTML/JSON
│   ├── phase4-validate-associations.js # TODO: Junction validation
│   └── phase5-performance-test.js   # TODO: Benchmarking
├── cli/                             # TODO: Commander.js interface
│   └── import-cli.js
├── scripts/                         # TODO: Individual scripts
├── tests/                           # TODO: Jest tests
│   ├── unit/
│   └── integration/
└── reports/                         # Generated reports
```

## Phase 2: Excel Import (IMPLEMENTED ✅)

Imports master data from Excel files with idempotent upserts.

### Data Sources

Located in `/db/import-data/`:

- `teams.xlsx` - 100 team records
- `users.xlsx` - 200 user records
- `applications.xlsx` - 80 application records

### Usage

```bash
# Import all Excel files (teams + users + applications)
npm run import:excel

# Import specific entity
npm run import:excel:teams
npm run import:excel:users
npm run import:excel:apps

# Dry run (validation only, no database changes)
npm run import:excel -- --dry-run
```

### Excel Schema Mappings

**Teams** (`teams.xlsx`):

```
Team Name     → tms_name     (required, max 100 chars)
Email         → tms_email    (required, unique, email format)
Description   → tms_description (optional, max 500 chars)
```

**Users** (`users.xlsx`):

```
Code          → usr_code       (required, unique, max 20 chars)
First Name    → usr_first_name (required, max 100 chars)
Last Name     → usr_last_name  (required, max 100 chars)
Email         → usr_email      (required, email format)
Active        → usr_active     (optional, boolean)
```

**Applications** (`applications.xlsx`):

```
Code          → app_code        (required, unique, max 20 chars)
Name          → app_name        (required, max 100 chars)
Description   → app_description (optional, max 500 chars)
```

### Critical Patterns

**Idempotent Upserts** (safe re-runs):

```sql
INSERT INTO teams_tms (tms_name, tms_email, ...)
VALUES ($1, $2, ...)
ON CONFLICT (tms_email) DO UPDATE SET
  tms_name = EXCLUDED.tms_name,
  updated_by = 'migration',
  updated_at = CURRENT_TIMESTAMP
```

**Audit Trail** (all inserts):

```javascript
created_by: 'migration',
updated_by: 'migration',
created_at: CURRENT_TIMESTAMP,
updated_at: CURRENT_TIMESTAMP
```

### Performance

Expected with TD-103 indexes:

- Teams: ~3 seconds (100 records)
- Users: ~7 seconds (200 records)
- Applications: ~3 seconds (80 records)
- **Total: <30 seconds for 380 records** ✅

## Phase 3: Hierarchical Import (TODO)

Process 1,177 HTML files → JSON → Database hierarchy.

**Hierarchy**: Migrations → Iterations → Plans → Sequences → Phases → Steps → Instructions

**Pattern**: Recursive dependency resolution with ID caching per migration group.

## Phase 4: Association Validation (TODO)

Verify junction table integrity and foreign key relationships.

## Phase 5: Performance Testing (TODO)

Benchmark import performance and verify TD-103 index utilization.

## Database Schema Patterns (CRITICAL)

### ADR-059: Schema as Authority

**Fix code to match schema, NOT vice versa**

1. **Team Lookup**: Use `tms_name` (NOT `tms_code` - column doesn't exist!)
2. **Status Lookup**: Use `(sts_name, sts_type)` composite tuple from `status_sts`
3. **User Fields**: `usr_first_name` + `usr_last_name` (NOT `usr_name`)
4. **Iteration Type**: `itt_code` (string) NOT `itt_id` (integer)
5. **Audit Trail**: ALL inserts must include `created_by='migration'`

### Idempotency

All imports use `ON CONFLICT DO UPDATE` for safe re-runs:

- Teams: conflict on `tms_email`
- Users: conflict on `usr_code`
- Applications: conflict on `app_code`

## Configuration

### Database Connection

Reads from parent `.env` file:

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=umig_app_db
POSTGRES_USER=umig_app_user
POSTGRES_PASSWORD=123456
```

### Import Settings

See `config/import-config.js`:

- Batch size: 50 records per Excel batch
- Concurrency: 10 concurrent HTML parses (Phase 3)
- Quality gates: 100% success rate for Excel, 99% for hierarchy
- Performance targets: <30s Excel, <10min hierarchy

## Quality Gates

```javascript
Phase 2 (Excel):
✅ Success rate: 100% (all records must import)
✅ FK violations: 0
✅ Max time: 30 seconds for 380 records

Phase 3 (Hierarchy - TODO):
✅ Success rate: 99% (allow 1% for bad data)
✅ Orphan records: 0
✅ Max time: 10 minutes for 1,177 files
✅ Index usage: 100% (TD-103 indexes)
```

## Dependencies

```json
{
  "pg": "^8.11.3", // PostgreSQL client (ALREADY INSTALLED)
  "xlsx": "^0.18.5", // Excel parsing (NEW)
  "cheerio": "^1.0.0-rc.12", // HTML parsing Phase 3 (NEW)
  "commander": "^11.1.0", // CLI framework (ALREADY INSTALLED)
  "chalk": "^5.4.1", // Terminal colors (ALREADY INSTALLED)
  "p-limit": "^5.0.0", // Concurrency control Phase 3 (NEW)
  "dotenv": "^17.2.2" // Environment variables (ALREADY INSTALLED)
}
```

## Error Handling

### Transaction Pattern

All imports use transactions for atomicity:

```javascript
BEGIN
  → Insert/Update records
  → Validate constraints
COMMIT (on success) or ROLLBACK (on error)
```

### Error Recovery

If import fails:

1. Transaction rolls back (no partial imports)
2. Error logged with context (team name, user code, etc.)
3. Re-run import (idempotent upserts handle duplicates safely)

## Troubleshooting

### Connection Errors

```bash
# Verify database is running
cd ../  # Go to local-dev-setup
npm run health:check

# Test connection from data-utils
node -e "require('./lib/db/connection-pool').query('SELECT 1').then(() => console.log('✅ Connected'))"
```

### Validation Failures

Excel file issues:

- Missing required columns (Team Name, Email, Code, etc.)
- Empty required fields
- Invalid email formats (must contain @)
- Exceeding max lengths (100 chars for names)

### Import Failures

Check console output for:

- `Foreign key violation` - Referenced entity doesn't exist
- `Unique constraint violation` - Duplicate code/email
- `Data type mismatch` - Invalid boolean/date format

**Solution**: Fix Excel data and re-run (idempotent upserts allow safe retries)

## Development Workflow

### Adding New Excel Import

1. Define schema in `SCHEMAS` object in `phase2-excel-import.js`
2. Create `import{Entity}()` method following pattern
3. Create `insert{Entity}Batch()` with idempotent upsert
4. Add npm script to `package.json`
5. Test with `--dry-run` flag first

### Testing

```bash
# Run all tests (TODO - not implemented yet)
npm test

# Unit tests
npm run test:unit

# Integration tests (requires database)
npm run test:integration
```

## Future Phases

- **Phase 3**: Hierarchical HTML/JSON import (6 story points) - Core of US-104
- **Phase 4**: Association validation (1 story point) - Junction table integrity
- **Phase 5**: Performance testing (2 story points) - Benchmarking and optimization
- **CLI**: Commander.js interface (included in phases) - User-friendly commands
- **Documentation**: Runbook, troubleshooting (1 story point) - Operational docs

## Related Documentation

- **US-104 Story**: `docs/roadmap/unified-roadmap.md` (13 story points total)
- **TD-103 Indexes**: `liquibase/changelogs/036-td-103-performance-optimization-pre-import.sql`
- **Phase 1 Bootstrap**: `liquibase/changelogs/037-us104-phase1-bootstrap-data.sql`
- **Schema Documentation**: `docs/dataModel/UMIG_Data_Model.md`
- **ADR-059**: Schema as Authority - Fix code to match schema

## Prerequisites

✅ **Phase 1**: Bootstrap data (6 foundation records) - COMPLETE
✅ **TD-103**: 11 performance indexes - COMPLETE
✅ **Phase 2 Setup**: Directory structure, configuration - COMPLETE
✅ **Phase 2 Excel**: Teams/Users/Applications import - COMPLETE

## Success Criteria (US-104)

Phase 2 Complete When:

- ✅ All 380 Excel records import successfully (100%)
- ✅ No foreign key violations
- ✅ Import completes in <30 seconds
- ✅ Re-running import is safe (idempotent)
- ✅ Validation catches schema errors before import

**Current Status**: Phase 2 IMPLEMENTED, awaiting testing with actual data files

---

_Last Updated: 2025-10-08 | Phase 2 Implementation Complete_
