# Repository Coding Patterns (UMIG)

This folder contains all Groovy classes that encapsulate database access logic using the repository pattern.

## Why Use the Repository Pattern?

- **Separation of Concerns:** Keeps SQL/data logic out of API/macro scripts ([CA]).
- **Testability:** Makes it easy to mock DB operations in tests ([TDT]).
- **Reusability:** Centralizes queries for each entity/table ([DRY]).
- **DTO Integration:** Enhanced repositories support unified DTOs (US-056-A).

## MANDATORY DatabaseUtil.withSql Pattern

**ALL repository methods MUST use `DatabaseUtil.withSql` pattern for database connections.**

```groovy
import umig.utils.DatabaseUtil

class ExampleRepository {
    def findById(UUID id) {
        DatabaseUtil.withSql { sql ->
            return sql.firstRow('''
                SELECT * FROM table_name
                WHERE id = :id
            ''', [id: id])
        }
    }
}
```

## Type Safety Requirements (ADR-031)

**MANDATORY**: All query parameters must use explicit type casting:

```groovy
// ✅ CORRECT - Explicit casting
def migrationId = UUID.fromString(filters.migrationId as String)
def teamId = Integer.parseInt(filters.teamId as String)

// ❌ INCORRECT - Implicit casting
def migrationId = UUID.fromString(filters.migrationId)
def teamId = filters.teamId as Integer
```

## CRUD Method Naming Convention

**Standardization Goal**: Use simple method names (`create`, `update`, `delete`, `findById`) for consistency across all repositories.

```groovy
// Preferred naming convention (future standard)
def create(Map params) { ... }
def update(UUID id, Map params) { ... }
def delete(UUID id) { ... }
def findById(UUID id) { ... }

// Legacy naming (being phased out)
def createTeam(Map params) { ... }  // Avoid entity-specific prefixes
def updateTeam(UUID id, Map params) { ... }
def deleteTeam(UUID id) { ... }
```

**Note**: Some repositories still use entity-prefixed names (e.g., `createTeam`, `updateTeam`). These will be standardized in future refactoring.

## Repository Implementation Pattern

```groovy
package umig.repository

import umig.utils.DatabaseUtil
import java.util.UUID

/**
 * Repository for [Entity] data operations
 * Follows ADR-031 type safety and hierarchical filtering patterns
 */
class ExampleRepository {

    /**
     * Find by ID with explicit type casting
     */
    def findById(UUID id) {
        DatabaseUtil.withSql { sql ->
            return sql.firstRow('''
                SELECT col1, col2, col3
                FROM table_name
                WHERE id = :id
            ''', [id: id])
        }
    }

    /**
     * Hierarchical filtering - uses INSTANCE IDs, not master IDs
     */
    def findByParentId(UUID parentInstanceId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows('''
                SELECT e.*
                FROM entity_table e
                WHERE e.parent_instance_id = :parentId
                ORDER BY e.sequence_number
            ''', [parentId: parentInstanceId])
        }
    }
}
```

## Testing Pattern

All repositories support comprehensive mocking for unit tests:

```groovy
// Test mock example
DatabaseUtil.metaClass.static.withSql = { Closure closure ->
    return closure.call([
        firstRow: { query, params -> return mockData },
        rows: { query, params -> return mockDataList }
    ])
}
```

## Current Repositories (27 Total)

### Core Entity Repositories

- **ApplicationRepository.groovy** - Application management with label associations
- **EnvironmentRepository.groovy** - Environment management with application/iteration associations
- **LabelRepository.groovy** - Label management with application and step associations
- **TeamRepository.groovy** - Team management with hierarchical filtering
- **TeamMembersRepository.groovy** - Team membership operations with robust checks
- **UserRepository.groovy** - User management with role and team associations (client-side pagination support)

### Migration Hierarchy Repositories

- **MigrationRepository.groovy** - Migration and iteration management
- **MigrationTypesRepository.groovy** - Migration type configurations and validation
- **IterationTypeRepository.groovy** - Iteration type configurations and workflow rules
- **PlanRepository.groovy** - Plan management with hierarchical filtering
- **ImplementationPlanRepository.groovy** - Implementation plan management with hierarchical filtering
- **SequenceRepository.groovy** - Sequence management with advanced ordering logic
- **PhaseRepository.groovy** - Phase management with sequence associations
- **StepRepository.groovy** - Step master and instance operations with comments system
- **InstructionRepository.groovy** - Instruction template and instance operations (19 methods)

### Import System Repositories

- **ImportRepository.groovy** - Main import operations and data transformation
- **ImportQueueManagementRepository.groovy** - Import queue processing and status management
- **ImportResourceLockRepository.groovy** - Resource locking for concurrent import prevention
- **ScheduledImportRepository.groovy** - Scheduled import configuration and execution
- **StagingImportRepository.groovy** - Staging area for import data validation

### Supporting Repositories

- **AuditLogRepository.groovy** - Audit logging and history tracking
- **ControlRepository.groovy** - Control point management for steps and instructions
- **EmailTemplateRepository.groovy** - Email template management and rendering
- **LookupRepository.groovy** - General lookup table operations for dropdowns
- **StatusRepository.groovy** - Centralized status management with color coding
- **StepTypeRepository.groovy** - Step type lookup operations
- **SystemConfigurationRepository.groovy** - System-wide configuration and settings management

## Key Implementation Standards

### Hierarchical Filtering

- **CRITICAL**: Use instance IDs (e.g., `pli_id`, `sqi_id`, `phi_id`) for filtering, NOT master IDs
- Support multiple filter combinations for progressive refinement
- Include ALL database fields referenced in result mapping

### Error Handling

- SQL state mappings: 23503→400 (foreign key), 23505→409 (unique constraint)
- Robust existence checks for all operations
- Clear, actionable error messages

### Production-Ready Patterns (ADR-047)

- Connection pooling through DatabaseUtil.withSql
- Transaction management for bulk operations
- Performance optimization for large datasets
- Proper resource cleanup and error handling

### Comment System (StepsApi Enhancement)

- Comprehensive comment CRUD operations in StepRepository
- User ownership validation for update/delete operations
- Enhanced error messages for comment endpoints

## References

- **PRIMARY**: [ADR-031](../../docs/adr/ADR-031-Type-Safety-Improvements.md) - Type safety requirements
- [ADR-010](../../docs/adr/ADR-010-Database-Connection-Pooling.md) - Database connection pooling
- [ADR-023](../../docs/adr/ADR-023-Standardized-Rest-Api-Patterns.md) - API patterns
- [ADR-047](../../../../docs/adr/ADR-047-postgresql-patterns.md) - PostgreSQL production-ready patterns
- [Testing Guidelines](../tests/README.md) - Repository testing patterns
