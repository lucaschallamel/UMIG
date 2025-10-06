# Liquibase Database Migrations

Purpose: Database schema versioning and migration management for UMIG PostgreSQL database

## Structure

```
liquibase/
├── changelogs/              # Individual migration SQL files
│   ├── 001_unified_baseline.sql         # Initial schema baseline
│   ├── 002-008_*.sql                    # Early schema additions
│   ├── 009-026_*.sql                    # Core schema evolution
│   ├── 027-035_*.sql                    # Recent migrations (US-034, US-098)
│   └── *.md                             # Migration documentation
└── liquibase.properties     # Liquibase configuration
```

## Migration Naming Convention

- **Format**: `NNN_descriptive_name.sql`
- **Numbers**: Sequential (001-035+)
- **Scope**: Single logical change per migration
- **Documentation**: Critical migrations include .md summary files

## Key Migrations

### Baseline (001-010)

- 001: Unified baseline schema (complete initial structure)
- 002-008: Early field additions and associations
- 009: Staging import tables
- 010: Sequence master/instance field replication

### Core Evolution (011-020)

- 011-012: User management enhancements
- 013: Email templates system
- 014: Environment roles for steps
- 015: Status table introduction
- 016-019: Audit field standardization and status normalization
- 020: Confluence user ID tracking

### Recent Features (021-035+)

- 022: System configuration (US-088)
- 023-024: Email template enhancements
- 025-026: Staging table extensions (US-034)
- 027-029: Import queue and system config tables
- 030-035: Configuration management (US-098 phases)

## Configuration

**liquibase.properties** contains:

- Database connection settings (uses .env credentials)
- Changelog master file location
- Schema target (umig_app_db)

## Usage

Migrations are automatically applied by:

- `npm start` - Runs pending migrations on startup
- `npm run restart:erase` - Resets database, applies all migrations
- Container initialization - Liquibase runs before Confluence starts

## Migration Guidelines

1. **Never modify existing migrations** - Create new migrations for changes
2. **Test migrations locally** - Verify before committing
3. **Include rollback logic** - Where feasible, provide rollback SQL
4. **Document complex changes** - Add .md files for significant migrations
5. **Sequential numbering** - Maintain strict sequential order

## Viewing Migration Status

```bash
# Check migration history in database
psql -U umig_app_user -d umig_app_db -c "SELECT * FROM databasechangelog ORDER BY dateexecuted DESC LIMIT 10;"

# View container logs for migration execution
npm run logs:postgres
```

## Related Files

- `/local-dev-setup/postgres/init-db.sh` - Database initialization script
- `/claudedocs/035_us098_phase4_batch1_revised_FIX_SUMMARY.md` - Recent migration documentation
- `.env.example` - Database credentials template

---

_Last Updated: 2025-10-06_
