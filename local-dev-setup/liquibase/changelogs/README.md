# Database Migration Changelogs

Purpose: Individual SQL migration files applied sequentially by Liquibase

## Structure

```
changelogs/
├── 001_unified_baseline.sql                      # Initial schema (15KB)
├── 002-008_*.sql                                 # Early additions
├── 009_create_stg_import_tables.sql             # Staging tables
├── 010-015_*.sql                                # Core schema evolution
├── 016-019_*.sql                                # Audit standardization
├── 020-029_*.sql                                # Recent features
├── 030-035_*.sql                                # US-098 configuration management
└── *.md                                         # Migration documentation
```

## Migration Categories

### Schema Baseline (001)

- Complete initial database structure
- All core tables and relationships
- 15KB baseline migration

### Field Additions (002-008, 011-012, 014, 020)

- Pilot comments, labels, associations
- User management fields
- Status tracking enhancements
- Confluence user integration

### Major Features (009, 013, 022, 027-035)

- Staging import tables (009)
- Email templates system (013, 023-024)
- System configuration (022, 027-029)
- Configuration management (030-035)

### Data Normalization (016-019, 021)

- Audit field standardization (16-17)
- Status field normalization (19)
- Foreign key additions (21)

### Structural Fixes (010, 015, 018, 025-026)

- Sequence field replication (010)
- Step instance status table (015)
- Controls-phase relationship fix (018)
- Staging table extensions (025-026)

## File Naming

- **Format**: `NNN_descriptive_name.sql`
- **Numbers**: 001-035+ (sequential)
- **Scope**: Single logical database change
- **Size**: Typically 500 bytes to 42KB

## Key Migrations Reference

| Migration | Size    | Purpose                | Sprint          |
| --------- | ------- | ---------------------- | --------------- |
| 001       | 15KB    | Unified baseline       | Initial         |
| 013       | 8KB     | Email templates        | Sprint 5        |
| 016       | 31KB    | Audit standardization  | Sprint 6        |
| 019       | 21KB    | Status normalization   | Sprint 6        |
| 024       | 42KB    | Mobile email templates | Sprint 7        |
| 030-035   | Various | Configuration mgmt     | Sprint 8 US-098 |

## Documentation Files

- **035_us098_phase4_batch1_revised_FIX_SUMMARY.md** - US-098 Phase 4 migration details
- Other .md files provide context for complex migrations

## Migration Execution

Migrations are applied:

1. Sequentially by number (001, 002, 003...)
2. Only once per database (tracked in `databasechangelog` table)
3. Automatically on container startup
4. Transactionally (rollback on failure)

## Viewing Applied Migrations

```bash
# Connect to database
psql -U umig_app_user -d umig_app_db

# View migration history
SELECT * FROM databasechangelog ORDER BY dateexecuted DESC;
```

## Guidelines

- Never modify existing migration files
- Create new migrations for schema changes
- Test locally before committing
- Include descriptive names
- Document complex migrations with .md files

---

_Last Updated: 2025-10-06_
