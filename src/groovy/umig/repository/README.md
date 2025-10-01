# Repository Layer

Data access layer implementing repository pattern with mandatory DatabaseUtil.withSql connection management for all PostgreSQL database operations.

## Responsibilities

- Encapsulate all database access through repository pattern with clean separation
- Execute SQL queries using DatabaseUtil.withSql pattern for connection management (MANDATORY)
- Enforce type safety with explicit casting for all parameters (ADR-031 compliance)
- Implement hierarchical filtering using instance IDs (pli_id, sqi_id, phi_id) NOT master IDs
- Provide CRUD operations for all entity types with consistent error handling
- Handle SQL state mappings for constraint violations (23503, 23505) with actionable errors
- Serve as single enrichment point for data transformation (ADR-047)

## Structure

```
repository/
├── Core Entity Repositories (7 files)
│   ├── ApplicationRepository.groovy       # Application catalog (287 lines)
│   ├── EnvironmentRepository.groovy       # Environment management (363 lines)
│   ├── LabelRepository.groovy             # Taxonomy (475 lines)
│   ├── TeamRepository.groovy              # Team organization
│   ├── TeamMembersRepository.groovy       # Team membership
│   ├── UserRepository.groovy              # User profiles
│   └── LookupRepository.groovy            # Generic lookups
│
├── Migration Hierarchy Repositories (10 files)
│   ├── MigrationRepository.groovy         # Top-level migrations (2,210 lines)
│   ├── IterationTypeRepository.groovy     # Iteration classifications
│   ├── MigrationTypesRepository.groovy    # Migration categorizations
│   ├── PlanRepository.groovy              # Implementation plans
│   ├── SequenceRepository.groovy          # Execution sequences
│   ├── PhaseRepository.groovy             # Migration phases (1,662 lines)
│   ├── StepRepository.groovy              # Step operations (most comprehensive)
│   ├── StepTypeRepository.groovy          # Step type definitions
│   ├── InstructionRepository.groovy       # Detailed instructions (1,531 lines)
│   └── ImplementationPlanRepository.groovy # Legacy plans
│
├── Import System Repositories (5 files)
│   ├── ImportRepository.groovy            # Bulk import (789 lines)
│   ├── ImportQueueManagementRepository.groovy # Queue operations (594 lines)
│   ├── ImportResourceLockRepository.groovy # Resource locking (711 lines)
│   ├── ScheduledImportRepository.groovy   # Scheduled imports
│   └── StagingImportRepository.groovy     # Staging area
│
├── Configuration Repositories (6 files)
│   ├── ControlRepository.groovy           # Control inventory (1,383 lines, 55+ controls)
│   ├── EmailTemplateRepository.groovy     # Email templates
│   ├── StatusRepository.groovy            # Status codes
│   ├── SystemConfigurationRepository.groovy # System settings
│   ├── AuditLogRepository.groovy          # Audit trail (279 lines)
│   └── DatabaseVersionRepository.groovy   # Schema versions (552 lines)
│
└── README.md
```

## Mandatory Patterns (ADR-023, ADR-031, ADR-047)

### DatabaseUtil.withSql Pattern (MANDATORY)

**Critical**: ALL database operations MUST use this pattern. No exceptions.

```groovy
import umig.utils.DatabaseUtil

class SomeRepository {
    def findById(UUID id) {
        return DatabaseUtil.withSql { sql ->
            def row = sql.firstRow('SELECT * FROM table_name WHERE id = ?', [id])
            return row ? mapToEntity(row) : null
        }
    }

    def findAll() {
        return DatabaseUtil.withSql { sql ->
            def rows = sql.rows('SELECT * FROM table_name ORDER BY name')
            return rows.collect { mapToEntity(it) }
        }
    }

    def create(Map entity) {
        return DatabaseUtil.withSql { sql ->
            def id = UUID.randomUUID()
            sql.execute('''
                INSERT INTO table_name (id, name, created_at)
                VALUES (?, ?, NOW())
            ''', [id, entity.name])
            return id
        }
    }

    def update(UUID id, Map entity) {
        return DatabaseUtil.withSql { sql ->
            def updated = sql.executeUpdate('''
                UPDATE table_name
                SET name = ?, updated_at = NOW()
                WHERE id = ?
            ''', [entity.name, id])
            return updated > 0
        }
    }

    def delete(UUID id) {
        return DatabaseUtil.withSql { sql ->
            try {
                def deleted = sql.executeUpdate('DELETE FROM table_name WHERE id = ?', [id])
                return deleted > 0
            } catch (Exception e) {
                if (e.getSQLState() == '23503') {
                    throw new Exception("Cannot delete: referenced by other records")
                }
                throw e
            }
        }
    }
}
```

### Type Safety (ADR-031 MANDATORY)

```groovy
// ✅ CORRECT - Explicit casting for all parameters
def migrationId = UUID.fromString(params.migrationId as String)
def pageSize = Integer.parseInt(params.pageSize as String)
def status = (params.status as String)?.toUpperCase()

// ❌ WRONG - No casting or implicit conversions
def migrationId = params.migrationId  // UNSAFE
def pageSize = params.pageSize       // UNSAFE
```

### Hierarchical Filtering (ADR-030 CRITICAL)

```groovy
// ✅ CORRECT - Use instance IDs for filtering execution records
WHERE pli_id = ?  // Plan instance ID
WHERE sqi_id = ?  // Sequence instance ID
WHERE phi_id = ?  // Phase instance ID
WHERE sti_id = ?  // Step instance ID

// ❌ WRONG - Never use master IDs for instance filtering
WHERE plm_id = ?  // Plan master ID - INCORRECT
WHERE sqm_id = ?  // Sequence master ID - INCORRECT
WHERE phm_id = ?  // Phase master ID - INCORRECT (unless querying masters)
WHERE stm_id = ?  // Step master ID - INCORRECT (unless querying masters)

// Master IDs ONLY for template queries
SELECT * FROM step_master_stm WHERE stm_id = ?  // ✅ Correct context
```

### Single Enrichment Point (ADR-047)

```groovy
// All data enrichment happens in repositories
def enrichedStep = DatabaseUtil.withSql { sql ->
    def step = sql.firstRow('''
        SELECT
            sti.*,
            phi.name as phase_name,
            pli.name as plan_name,
            u.display_name as assigned_to_name
        FROM step_instance_sti sti
        LEFT JOIN phase_instance_phi phi ON sti.phi_id = phi.phi_id
        LEFT JOIN plan_instance_pli pli ON phi.pli_id = pli.pli_id
        LEFT JOIN users u ON sti.assigned_to = u.user_id
        WHERE sti.sti_id = ?
    ''', [stepId])

    return step ? mapToEnrichedDTO(step) : null
}
```

### Error Handling with SQL State Mapping

```groovy
try {
    sql.executeUpdate('DELETE FROM entity WHERE id = ?', [id])
} catch (Exception e) {
    if (e.getSQLState() == '23503') {
        throw new BadRequestException("Cannot delete: entity is referenced by ${getReferencingTables(id)}")
    } else if (e.getSQLState() == '23505') {
        throw new ConflictException("Duplicate entry: ${entity.name} already exists")
    } else if (e.getSQLState() == '23502') {
        throw new BadRequestException("Missing required field: ${getMissingField(e)}")
    }
    throw new InternalServerErrorException("Database error: ${e.message}")
}
```

## Repository Categories (28 Total)

### Core Entity Repositories (7)

**Purpose**: Foundational data entities with full CRUD operations and relationship management

- **ApplicationRepository** (287 lines) - Application catalog with environment associations
- **EnvironmentRepository** (363 lines) - Environment configuration with validation
- **LabelRepository** (475 lines) - Taxonomy and categorization with hierarchical support
- **TeamRepository** - Team organization structure with membership tracking
- **TeamMembersRepository** - Team membership relationships and role assignments
- **UserRepository** - User profiles with Confluence integration (ADR-042)
- **LookupRepository** - Generic lookup tables for reference data

### Migration Hierarchy Repositories (10)

**Purpose**: Hierarchical migration workflow with master/instance template separation

- **MigrationRepository** (2,210 lines) - Top-level migration orchestration with comprehensive operations
- **IterationTypeRepository** - Iteration classification (Standard, Emergency, Rollback)
- **MigrationTypesRepository** - Migration categorization (Application, Infrastructure, Data)
- **PlanRepository** - Implementation plan templates and instances
- **SequenceRepository** - Execution sequence definitions and tracking
- **PhaseRepository** (1,662 lines) - Migration phase structure with aggregations
- **StepRepository** - Most comprehensive repository with step master and instance operations
- **StepTypeRepository** - Step type definitions (Manual, Automated, Validation)
- **InstructionRepository** (1,531 lines) - Detailed instruction management with step associations
- **ImplementationPlanRepository** - Legacy plan support (deprecated, use PlanRepository)

### Import System Repositories (5)

**Purpose**: Bulk import operations with queue management and resource locking

- **ImportRepository** (789 lines) - Bulk CSV import with validation and error handling
- **ImportQueueManagementRepository** (594 lines) - Queue operations with priority and status tracking
- **ImportResourceLockRepository** (711 lines) - Pessimistic locking for concurrent import safety
- **ScheduledImportRepository** - Scheduled import operations with cron support
- **StagingImportRepository** - Staging area for import validation before production commits

### Configuration Repositories (6)

**Purpose**: System configuration, control inventory, and operational metadata

- **ControlRepository** (1,383 lines) - Control inventory with 55+ pre-configured controls (Security, Compliance, Performance)
- **EmailTemplateRepository** - Email templates for 4 notification types (iteration start/end, step assignment/completion)
- **StatusRepository** - Status code management with workflow transitions
- **SystemConfigurationRepository** - System-wide settings (SMTP, URLs, features)
- **AuditLogRepository** (279 lines) - Audit trail with user actions and data changes
- **DatabaseVersionRepository** (552 lines) - Liquibase schema version tracking and health checks

## Performance Considerations

**Query Optimization**:

- Use indexed columns for WHERE clauses (all ID fields are indexed)
- Limit result sets with LIMIT/OFFSET for pagination
- Avoid SELECT \* in production code - specify required columns
- Use LEFT JOIN only when optional relationships needed
- Aggregate functions (COUNT, SUM) should include appropriate GROUP BY

**Connection Management**:

- DatabaseUtil.withSql handles connection pooling automatically
- Connections are automatically closed after lambda execution
- No manual connection management required
- Thread-safe for concurrent requests

**Caching Strategy**:

- Configuration data (controls, templates, types) cached at application layer
- User lookup cache with 5-minute TTL
- Status code cache with 30-minute TTL
- No repository-level caching (managed by service layer)

## Testing Standards

**Unit Tests** (100% pass rate):

- Mock DatabaseUtil.withSql using Groovy metaprogramming
- Test all CRUD operations with various scenarios
- Validate SQL state handling for constraint violations
- Verify type casting and null handling

**Integration Tests**:

- Real database connections using test containers
- Transaction rollback after each test
- Validate hierarchical filtering with real data
- Test complex queries with multiple joins

## Related

- See `../api/v2/` for API endpoints that consume repositories
- See `../service/` for business logic that orchestrates repositories
- See `../utils/DatabaseUtil.groovy` for connection management utility
- See `../dto/` for data transfer objects used by repositories
- See `../tests/unit/repository/` for repository unit tests
- See `../tests/integration/repositories/` for repository integration tests
