# Service Layer

Business logic layer implementing centralized orchestration and data transformation between repository and API layers following US-056 Service Layer Standardization.

## Responsibilities

- Implement business logic and orchestration between repository and API layers
- Provide centralized data transformation for complex entities (Step DTO enrichment)
- Handle multi-repository operations with transaction coordination
- Enforce business rules and validation logic before persistence
- Manage import workflows with queue processing and error handling
- Support authentication patterns with dual fallback (ADR-042)
- Integrate with external systems (email, notifications, SMTP)

## Structure

```
service/
├── Core Transformation Services
│   ├── StepDataTransformationService.groovy  # Central Step DTO transformation (580 lines)
│
├── Authentication & User Services
│   ├── UserService.groovy                    # User context management (348 lines)
│   ├── StatusService.groovy                  # Status management with hierarchical validation
│   ├── ConfigurationService.groovy           # System configuration management
│
├── Import Services
│   ├── ImportService.groovy                  # Core import processing (597 lines)
│   ├── CsvImportService.groovy               # CSV parsing and batch operations (738 lines)
│   ├── ImportOrchestrationService.groovy     # Multi-step workflow coordination (889 lines)
│   ├── ImportPerformanceMonitoringService.groovy  # Performance tracking and metrics
│   ├── PerformanceOptimizedCsvImportService.groovy # Optimized CSV processing
│   └── PerformanceOptimizedImportService.groovy   # Optimized import operations
│
├── test_csv_parser.groovy                    # CSV parser testing utility
└── README.md
```

## Key Components

### StepDataTransformationService.groovy (580 lines)

**Purpose**: Central transformation hub for Step data from database records to enriched DTOs to email templates

**Responsibilities**:

- Transform raw database records into StepInstanceDTO with complete enrichment
- Aggregate parent entity details (plan, sequence, phase names and metadata)
- Denormalize relationships (assigned user details, team associations, controls)
- Calculate metrics (progress percentages, duration, completion status)
- Prepare email template data for step notifications
- Implement Single Enrichment Point pattern (ADR-047)

**Integration Points**:

- StepRepository provides raw database records
- PhaseRepository, PlanRepository for parent entity enrichment
- UserRepository for assignee and creator details
- EnhancedEmailService consumes transformed data for notifications

### UserService.groovy (348 lines)

**Purpose**: User authentication and context management with dual authentication fallback (ADR-042)

**Responsibilities**:

- Retrieve current user from request context or session
- Fallback hierarchy: Request Context → Session → Confluence → Anonymous
- Support system user operations for automated workflows
- Provide user lookup and caching with 5-minute TTL
- Handle Confluence user integration and synchronization

**Authentication Pattern**:

```groovy
// Primary: Request context (ADR-042)
def user = ComponentManager.getInstance()
    .getJiraAuthenticationContext()
    .getLoggedInUser()

// Fallback: Session-based authentication
if (!user) {
    user = request.session.getAttribute('currentUser')
}

// Final fallback: Anonymous user with limited permissions
```

### StatusService.groovy

**Purpose**: Centralized status management with color coding and hierarchical validation

**Responsibilities**:

- Validate status transitions based on workflow rules
- Provide status color coding for UI display (green, yellow, red)
- Support hierarchical status aggregation (step → phase → sequence → plan)
- Calculate completion percentages based on child entity statuses
- Enforce status constraints (cannot complete parent until all children complete)

### Import Services

**Purpose**: Bulk import operations with queue management, validation, and error handling

**Import Service Components**:

**ImportService.groovy** (597 lines):

- Core import processing logic with validation framework
- Data integrity checks before persistence
- Progress tracking with percentage calculation
- Error collection and reporting
- Transaction management with rollback support

**CsvImportService.groovy** (738 lines):

- CSV file parsing with Apache Commons CSV
- Batch operations for high-volume imports (1000+ records)
- Column mapping and validation
- Error reporting with line numbers and field details
- Encoding detection (UTF-8, ISO-8859-1)

**ImportOrchestrationService.groovy** (889 lines):

- Multi-step import workflow coordination
- Queue management with priority and dependencies
- Resource locking to prevent concurrent import conflicts
- Validation → Staging → Production promotion pipeline
- Comprehensive error handling with rollback
- Performance monitoring and metrics collection

**Performance-Optimized Services**:

- **PerformanceOptimizedCsvImportService**: Streaming CSV processing for large files (>100MB)
- **PerformanceOptimizedImportService**: Batch insertion optimization with prepared statements
- **ImportPerformanceMonitoringService**: Real-time metrics and performance tracking

## Service Architecture Patterns

### Single Responsibility Principle

Each service has focused business purpose:

- StepDataTransformationService → Step DTO transformation only
- UserService → Authentication and user context only
- StatusService → Status management and validation only
- Import services → Import workflows and data processing

### Repository Integration Pattern

```groovy
class SomeService {
    def someRepository = new SomeRepository()
    def anotherRepository = new AnotherRepository()

    def businessOperation(UUID id) {
        // Fetch data from repositories
        def entity = someRepository.findById(id)
        def relatedEntities = anotherRepository.findByEntityId(id)

        // Apply business logic
        def result = applyBusinessRules(entity, relatedEntities)

        // Persist through repositories (no direct database access)
        someRepository.update(id, result)

        return result
    }
}
```

### Type Safety (ADR-031)

```groovy
// Explicit casting in service methods
def transformStep(Map rawStep) {
    return [
        sti_id: UUID.fromString(rawStep.sti_id as String),
        status: (rawStep.status as String)?.toUpperCase(),
        completion_percentage: rawStep.completion_percentage ?
            Integer.parseInt(rawStep.completion_percentage as String) : 0,
        assigned_to_name: (rawStep.assigned_to_name as String) ?: 'Unassigned'
    ]
}
```

### Error Handling

```groovy
try {
    // Business operation
    def result = processImport(data)
    return [success: true, result: result]
} catch (ValidationException e) {
    log.warn("Validation failed: ${e.message}")
    return [success: false, errors: e.validationErrors]
} catch (DataIntegrityException e) {
    log.error("Data integrity violation: ${e.message}")
    return [success: false, error: "Data integrity constraint violated"]
} catch (Exception e) {
    log.error("Unexpected error in service operation", e)
    return [success: false, error: "Internal server error: ${e.message}"]
}
```

## Testing Standards

**Unit Testing**:

- Mock repository dependencies using Groovy metaprogramming
- Test business logic in isolation from database
- Validate type casting and null handling
- Test error scenarios and exception handling
- Verify business rules and validation logic

**Integration Testing**:

- Test service coordination with real repositories
- Validate transaction management and rollback
- Test import workflows end-to-end
- Verify status transition rules with real data
- Test authentication fallback hierarchy

## Performance Considerations

**Transformation Performance**:

- StepDataTransformationService caches parent entity lookups (plan, sequence, phase)
- User lookup cache with 5-minute TTL reduces database hits
- Status color coding cached at service layer
- Batch DTO transformation for list operations (transformSteps method)

**Import Performance**:

- CSV streaming for files >100MB to avoid memory issues
- Batch insertions (500 records per batch) for import operations
- Resource locking to prevent concurrent import conflicts
- Queue-based processing for asynchronous import workflows
- Progress tracking without excessive database queries

## Related

- See `../repository/` for data access layer consumed by services
- See `../api/v2/` for API endpoints that consume services
- See `../dto/` for data transfer objects used in transformations
- See `../utils/EnhancedEmailService.groovy` for email integration
- See `../utils/AuthenticationService.groovy` for authentication utilities
- See `../tests/unit/service/` for service unit tests
