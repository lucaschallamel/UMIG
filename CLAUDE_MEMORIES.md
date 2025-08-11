# Claude Memories for UMIG Project

## Critical Lessons Learned

### Sprint 3 API Modernization Incomplete Implementation (August 2025)

**Issue**: MigrationRepository was missing essential CRUD methods (`create`, `update`, `delete`) that the modernized MigrationAPI was trying to call.

**Discovery Context**:

- Date: August 2025
- During: US-025 MigrationsAPI refactoring
- Symptom: Static type checking errors showing "Cannot find matching method" for createMigration, updateMigration, deleteMigration
- Root Cause: API was modernized to call `create()`, `update()`, `delete()` but repository still didn't have these methods at all

**Pattern Inconsistency Found**:

- TeamRepository uses: `createTeam()`, `updateTeam()`, `deleteTeam()`
- MigrationAPI expects: `create()`, `update()`, `delete()`
- MigrationRepository had: Nothing! No CRUD methods at all, despite having 25+ complex query methods

**Why This Matters**:

1. **Incomplete Refactoring Risk**: When modernizing APIs, ALWAYS verify both API and Repository layers are updated together
2. **Testing Gap**: This would have been caught immediately with integration tests - no write operations would have worked
3. **Design Pattern Confusion**: Mixed patterns between different repositories (Team vs Migration) suggest incomplete standardization

**Action Items for Future Work**:

- Always check BOTH API and Repository when modernizing
- Run integration tests after any API modernization
- Verify method names match between API calls and Repository methods
- Check for pattern consistency across all repositories

**Files Affected**:

- `/src/groovy/umig/api/v2/migrationApi.groovy` (lines 458, 559, 623)
- `/src/groovy/umig/repository/MigrationRepository.groovy` (added lines 1006-1131)

---

## Repository Patterns in UMIG

### Standard CRUD Method Naming

**Current State** (Mixed):

- TeamRepository: `createTeam()`, `updateTeam()`, `deleteTeam()`, `findTeamById()`
- MigrationRepository: `create()`, `update()`, `delete()`, `findMigrationById()`

**Recommendation**: Standardize on simple names (`create`, `update`, `delete`) for all repositories in future refactoring.

### DatabaseUtil Pattern (Mandatory)

All database operations MUST use:

```groovy
DatabaseUtil.withSql { sql ->
    // operations here
}
```

Never use direct SQL connections.

---

_Last Updated: August 2025_
