# ADR-034: Liquibase SQL Compatibility Constraints

## Status

**Status**: Accepted  
**Date**: 2025-08-06  
**Author**: Development Team

## Context

During the implementation of migration 019 (Status Field Normalization), we encountered a recurring issue with Liquibase's ability to parse PostgreSQL dollar-quoted blocks (`DO $$ ... END $$`). This issue has manifested multiple times in the UMIG project, causing migration failures with "Unterminated dollar quote" errors.

The error occurs because Liquibase's SQL parser has difficulty handling PostgreSQL's dollar-quoting mechanism, which is commonly used for PL/pgSQL blocks. The parser appears to truncate at the first `$` character rather than recognizing `$$` as a delimiter pair.

## Decision

We will **avoid using dollar-quoted PL/pgSQL blocks** in all Liquibase migration files and instead use simpler, standard SQL statements that Liquibase can reliably parse.

### Specific Guidelines

1. **No DO blocks**: Replace `DO $$ BEGIN ... END $$;` with standard SQL
2. **Simple validation queries**: Use SELECT statements for pre/post-migration validation
3. **UNION for multi-table checks**: Replace procedural loops with UNION queries
4. **Avoid RAISE statements**: Use simple SELECT outputs instead of RAISE NOTICE/EXCEPTION
5. **Standard SQL only**: Stick to ANSI SQL and basic PostgreSQL features that Liquibase handles well

## Consequences

### Positive

- **Reliability**: Migrations will execute consistently without parsing errors
- **Portability**: Simpler SQL is more portable across different database versions
- **Debugging**: Easier to debug and test individual SQL statements
- **Maintenance**: Clearer, more straightforward migration scripts

### Negative

- **Limited logic**: Cannot use complex procedural logic in migrations
- **Verbose validation**: Multi-table validations require UNION queries instead of loops
- **No transactions**: Cannot use explicit transaction control within DO blocks
- **Less error handling**: Cannot use TRY/CATCH patterns for error recovery

## Examples

### ❌ Avoid This Pattern

```sql
-- This will cause Liquibase parsing errors
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'status_sts') THEN
        RAISE EXCEPTION 'Migration prerequisite failed: status_sts table does not exist.';
    END IF;

    RAISE NOTICE 'Validation passed';
END $$;
```

### ✅ Use This Pattern Instead

```sql
-- Simple validation query that Liquibase can parse
SELECT COUNT(*) AS status_count FROM status_sts;

-- Multi-table validation using UNION
SELECT 'migrations_mig' as table_name, COUNT(*) as null_count FROM migrations_mig WHERE mig_status IS NULL
UNION ALL
SELECT 'iterations_ite', COUNT(*) FROM iterations_ite WHERE ite_status IS NULL;
```

## Implementation Notes

1. **Validation Strategy**: Use simple SELECT queries that return result sets for validation
2. **Error Detection**: Rely on SQL errors (foreign key violations, NOT NULL constraints) for validation
3. **Complex Logic**: If complex logic is absolutely necessary, consider:
   - Breaking into multiple changesets
   - Using stored procedures called by simple SQL
   - Implementing logic in application code instead

## References

- Migration 019: Status Field Normalization (first documented occurrence)
- Liquibase Documentation: SQL Parser Limitations
- PostgreSQL Documentation: Dollar-Quoted String Constants

## Related ADRs

- ADR-008: Database Migration Strategy with Liquibase
- ADR-012: Standardized Database Management and Documentation

---

**Note**: This constraint applies to all future migrations in the UMIG project. Existing migrations that work should not be modified, but any new migrations must follow these guidelines to ensure reliable execution.
