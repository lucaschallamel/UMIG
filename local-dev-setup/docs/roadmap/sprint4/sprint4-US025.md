# US-025: MigrationsAPI Refactoring to Modern Patterns with Dashboard Support

## Story Header

| Field | Value |
|-------|--------|
| **Story ID** | US-025 |
| **Epic** | API Modernization & Standardization |
| **Title** | MigrationsAPI Refactoring to Modern Patterns with Dashboard Support |
| **Priority** | HIGH |
| **Complexity** | 3 points |
| **Sprint** | Sprint 4 |
| **Timeline** | Days 2-3 |
| **Assignee** | Backend Developer |
| **Status** | Ready for Development |

## User Story

**As a** UMIG system administrator and dashboard consumer  
**I want** the MigrationsAPI to follow modern Sprint 3 patterns and support comprehensive progress aggregation  
**So that** I can efficiently manage the top-level migration entities and prepare for dashboard functionality with real-time progress rollups.

## Background and Current State Analysis

### Current State
The existing MigrationAPI (`src/groovy/umig/api/v2/migrationApi.groovy`) serves primarily as a hierarchical navigation endpoint with basic CRUD operations. As the root entity in UMIG's hierarchy, migrations are critical for:

- Dashboard foundation and top-level progress aggregation
- Multi-migration portfolio management
- System-wide status monitoring and reporting
- Cross-migration analysis and comparison
- Executive-level visibility into cutover operations

### Current API Capabilities
- ✅ Basic migration CRUD operations
- ✅ Hierarchical navigation (/migrations/{id}/iterations/{id}/...)
- ✅ Iteration management under migrations
- ❌ Missing modern Sprint 3 patterns and features

### Technical Debt
Current MigrationsAPI limitations:
- No comprehensive filtering or advanced query parameters
- No bulk operations support
- Missing status field normalization (ADR-035)
- No progress aggregation endpoints for dashboard preparation
- Inconsistent error handling patterns
- No pagination support for large migration lists
- No performance optimization for complex rollup calculations

### Sprint 3 Modernization Reference
Sprint 3 successfully established consistent patterns across:
- **PlansApi** (US-001): Comprehensive filtering, pagination, hierarchical queries
- **SequencesApi** (US-002): Bulk operations, advanced filtering
- **PhasesApi** (US-003): Master/instance separation, performance optimization
- **InstructionsApi** (US-004): Sub-200ms response times, enhanced error handling

## Detailed Acceptance Criteria

### AC1: Core API Modernization
**Given** the existing MigrationAPI structure  
**When** implementing modern Sprint 3 patterns  
**Then** the API must include:

- ✅ Status field normalization compliance (ADR-035)
- ✅ Type safety patterns with explicit casting (ADR-031)
- ✅ Enhanced error handling with proper HTTP status codes
- ✅ DatabaseUtil.withSql pattern consistency
- ✅ Comprehensive CRUD operations with validation

**Technical Specifications:**
```groovy
// Enhanced migration endpoint structure
migrations(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    def params = [:]
    def filters = extractQueryFilters(request)
    
    // Type safety compliance (ADR-031)
    if (filters.ownerId) {
        params.ownerId = UUID.fromString(filters.ownerId as String)
    }
    if (filters.year) {
        params.year = Integer.parseInt(filters.year as String)
    }
    
    // Status normalization (ADR-035)
    if (filters.status) {
        params.statusId = StatusRepository.resolveStatusId(filters.status as String)
    }
    
    // Date range filtering
    if (filters.startDateFrom || filters.startDateTo) {
        params.startDateRange = parseDateRange(filters.startDateFrom, filters.startDateTo)
    }
}
```

### AC2: Advanced Query Parameters and Filtering
**Given** the need for comprehensive migration management  
**When** querying migrations with various criteria  
**Then** the system must support:

- ✅ Filtering by migration owner (ownerId parameter)
- ✅ Filtering by migration type (type parameter)
- ✅ Filtering by status with normalized status handling
- ✅ Filtering by date ranges (startDate, endDate, businessCutoverDate)
- ✅ Search functionality across name and description fields
- ✅ Pagination with configurable page size (1-100 records)
- ✅ Sorting by multiple fields with ASC/DESC direction

**Query Parameter Matrix:**
```yaml
Filtering Parameters:
  - ownerId: UUID (filter by migration owner)
  - type: String (migration type filter)
  - status: String (normalized status filter)
  - startDateFrom/startDateTo: Date (date range filters)
  - endDateFrom/endDateTo: Date (date range filters)
  - businessCutoverFrom/businessCutoverTo: Date (cutover range filters)
  - search: String (full-text search, max 100 chars)
  - year: Integer (filter by cutover year)

Pagination Parameters:
  - page: Integer (1-based page number, default: 1)
  - size: Integer (page size 1-100, default: 20)

Sorting Parameters:
  - sort: String (field name: name, startDate, endDate, businessCutoverDate, status)
  - direction: String (asc/desc, default: asc)
```

### AC3: Progress Aggregation Endpoints
**Given** the requirement for dashboard functionality  
**When** requesting migration progress summaries  
**Then** the system must provide:

- ✅ Progress rollup calculations from child entities
- ✅ Status distribution across iterations and plans
- ✅ Completion percentage calculations
- ✅ Timeline adherence metrics
- ✅ Team workload distribution summaries

**Progress Aggregation Endpoints:**
```yaml
GET /migrations/{id}/progress:
  Returns:
    - Overall completion percentage (0-100)
    - Status breakdown by child entities
    - Critical path analysis
    - Timeline adherence metrics

GET /migrations/{id}/dashboard:
  Returns:
    - Executive summary data
    - Key performance indicators
    - Risk indicators and alerts
    - Resource utilization metrics

GET /migrations/portfolio-summary:
  Returns:
    - Cross-migration comparison data
    - Portfolio-level KPIs
    - Resource allocation overview
    - Timeline conflict analysis
```

### AC4: Bulk Operations Support
**Given** the need for efficient migration management  
**When** performing operations on multiple migrations  
**Then** the system must support:

- ✅ Bulk status updates with validation
- ✅ Bulk date adjustments with business rule validation
- ✅ Bulk owner reassignment
- ✅ Transaction-based operations with rollback capability

**Bulk Operations Structure:**
```groovy
// POST /migrations/bulk
{
  "operation": "updateStatus",
  "migrationIds": ["uuid1", "uuid2", "uuid3"],
  "data": {
    "statusId": 3,
    "reason": "Bulk status update for Q4 migrations",
    "updatedBy": "admin@company.com"
  }
}
```

### AC5: Enhanced Error Handling and Validation
**Given** the critical nature of migration operations  
**When** API errors occur  
**Then** the system must provide:

- ✅ Detailed error messages with specific field validation failures
- ✅ Proper HTTP status codes (400, 404, 409, 422, 500)
- ✅ Error correlation IDs for troubleshooting
- ✅ Structured error responses with actionable guidance

**Error Response Structure:**
```json
{
  "error": "Validation failed",
  "correlationId": "mig-api-2025-08-08-12345",
  "details": {
    "field": "businessCutoverDate",
    "message": "Business cutover date cannot be before start date",
    "code": "DATE_SEQUENCE_INVALID"
  },
  "suggestions": [
    "Adjust business cutover date to be after start date",
    "Review migration timeline for conflicts"
  ]
}
```

## Technical Implementation Plan

### Phase 1: Core API Modernization (Day 1)
1. **Repository Enhancement**
   - Add comprehensive filtering methods to MigrationRepository
   - Implement pagination support with offset/limit
   - Add status normalization queries with JOIN to status table
   - Optimize queries for large migration lists

2. **API Endpoint Refactoring**
   - Refactor main GET /migrations endpoint with modern patterns
   - Implement type safety patterns throughout
   - Add comprehensive query parameter parsing and validation
   - Enhance error handling with structured responses

3. **Status Field Normalization**
   - Implement ADR-035 status field normalization
   - Update all migration queries to JOIN with status table
   - Provide backward compatibility for existing consumers

### Phase 2: Progress Aggregation Implementation (Day 2)
1. **Progress Calculation Logic**
   - Implement hierarchical progress rollup algorithms
   - Create cached progress calculations for performance
   - Develop status distribution analytics
   - Build completion percentage calculations

2. **Dashboard Preparation Endpoints**
   - Implement /migrations/{id}/progress endpoint
   - Create /migrations/{id}/dashboard endpoint
   - Develop /migrations/portfolio-summary endpoint
   - Add real-time progress caching mechanisms

3. **Performance Optimization**
   - Implement query result caching for expensive rollup operations
   - Add database indexes for frequently queried fields
   - Optimize complex JOIN operations for hierarchy traversal

### Phase 3: Bulk Operations and Advanced Features (Day 3)
1. **Bulk Operations Implementation**
   - Create POST /migrations/bulk endpoint
   - Implement transaction-based bulk updates
   - Add comprehensive validation for bulk operations
   - Develop rollback mechanisms for failed operations

2. **Advanced Query Features**
   - Implement full-text search across migration fields
   - Add complex date range filtering
   - Create sorting mechanisms for multiple fields
   - Develop query performance monitoring

3. **Integration Testing**
   - Create comprehensive test suite for all endpoints
   - Implement performance benchmarks
   - Add bulk operations testing scenarios
   - Validate progress aggregation accuracy

## Progress Calculation and Rollup Logic

### Hierarchical Progress Calculation
```groovy
/**
 * Calculates migration progress based on child entity completion
 * Migration -> Iterations -> Plans -> Sequences -> Phases -> Steps
 */
def calculateMigrationProgress(UUID migrationId) {
    return DatabaseUtil.withSql { sql ->
        def result = sql.firstRow('''
            WITH step_progress AS (
                SELECT 
                    m.mig_id,
                    COUNT(si.sti_id) as total_steps,
                    COUNT(CASE WHEN st.sts_name = 'Completed' THEN 1 END) as completed_steps,
                    COUNT(CASE WHEN st.sts_name IN ('In Progress', 'On Hold') THEN 1 END) as active_steps,
                    COUNT(CASE WHEN st.sts_name = 'Not Started' THEN 1 END) as pending_steps
                FROM migrations_mig m
                JOIN iterations_ite i ON m.mig_id = i.mig_id
                JOIN plans_instance_pli pli ON i.ite_id = pli.ite_id
                JOIN sequences_instance_sqi sqi ON pli.pli_id = sqi.pli_id
                JOIN phases_instance_phi phi ON sqi.sqi_id = phi.sqi_id
                JOIN steps_instance_sti si ON phi.phi_id = si.phi_id
                JOIN status_sts st ON si.sts_id = st.sts_id
                WHERE m.mig_id = ?
                GROUP BY m.mig_id
            )
            SELECT 
                mig_id,
                total_steps,
                completed_steps,
                active_steps,
                pending_steps,
                CASE 
                    WHEN total_steps = 0 THEN 0
                    ELSE ROUND((completed_steps * 100.0 / total_steps), 2)
                END as completion_percentage
            FROM step_progress
        ''', [migrationId])
        
        return [
            migrationId: migrationId,
            totalSteps: result.total_steps ?: 0,
            completedSteps: result.completed_steps ?: 0,
            activeSteps: result.active_steps ?: 0,
            pendingSteps: result.pending_steps ?: 0,
            completionPercentage: result.completion_percentage ?: 0.0,
            lastCalculated: new Date()
        ]
    }
}
```

### Status Distribution Analytics
```groovy
def getMigrationStatusDistribution(UUID migrationId) {
    return DatabaseUtil.withSql { sql ->
        return sql.rows('''
            SELECT 
                st.sts_name as status_name,
                st.sts_color as status_color,
                COUNT(si.sti_id) as step_count,
                ROUND((COUNT(si.sti_id) * 100.0 / total_counts.total), 2) as percentage
            FROM migrations_mig m
            JOIN iterations_ite i ON m.mig_id = i.mig_id
            JOIN plans_instance_pli pli ON i.ite_id = pli.ite_id
            JOIN sequences_instance_sqi sqi ON pli.pli_id = sqi.pli_id
            JOIN phases_instance_phi phi ON sqi.sqi_id = phi.sqi_id
            JOIN steps_instance_sti si ON phi.phi_id = si.phi_id
            JOIN status_sts st ON si.sts_id = st.sts_id
            CROSS JOIN (
                SELECT COUNT(si2.sti_id) as total
                FROM migrations_mig m2
                JOIN iterations_ite i2 ON m2.mig_id = i2.mig_id
                JOIN plans_instance_pli pli2 ON i2.ite_id = pli2.ite_id
                JOIN sequences_instance_sqi sqi2 ON pli2.pli_id = sqi2.pli_id
                JOIN phases_instance_phi phi2 ON sqi2.sqi_id = phi2.sqi_id
                JOIN steps_instance_sti si2 ON phi2.phi_id = si2.phi_id
                WHERE m2.mig_id = ?
            ) total_counts
            WHERE m.mig_id = ?
            GROUP BY st.sts_name, st.sts_color, total_counts.total
            ORDER BY step_count DESC
        ''', [migrationId, migrationId])
    }
}
```

## Testing Strategy for Complex Scenarios

### Unit Testing Approach
```groovy
// Test progress calculation accuracy
@Test
void testMigrationProgressCalculation() {
    def migrationId = createTestMigration()
    def iterationId = createTestIteration(migrationId)
    def planId = createTestPlan(iterationId)
    
    // Create test steps with known statuses
    createTestSteps(planId, [
        [status: 'Completed', count: 70],
        [status: 'In Progress', count: 20],
        [status: 'Not Started', count: 10]
    ])
    
    def progress = migrationRepository.calculateMigrationProgress(migrationId)
    
    assert progress.totalSteps == 100
    assert progress.completedSteps == 70
    assert progress.completionPercentage == 70.0
}
```

### Integration Testing Scenarios
```groovy
// Test bulk operations with rollback
@Test
void testBulkUpdateWithRollback() {
    def migrationIds = createMultipleTestMigrations(5)
    
    // Attempt bulk update with one invalid migration
    def bulkRequest = [
        operation: 'updateStatus',
        migrationIds: migrationIds + [UUID.randomUUID()], // Invalid ID
        data: [statusId: 3]
    ]
    
    def response = post('/migrations/bulk', bulkRequest)
    
    assert response.status == 400
    // Verify no migrations were updated due to rollback
    migrationIds.each { migId ->
        def migration = migrationRepository.findMigrationById(migId)
        assert migration.sts_id != 3 // Should remain unchanged
    }
}
```

### Performance Testing Requirements
```yaml
Performance Benchmarks:
  - GET /migrations (paginated): < 200ms for 1000 migrations
  - GET /migrations/{id}/progress: < 500ms for complex migrations (>500 steps)
  - GET /migrations/{id}/dashboard: < 1000ms with full aggregation
  - POST /migrations/bulk: < 2000ms for 50 migrations
  - GET /migrations/portfolio-summary: < 3000ms for 10 migrations
```

## Success Criteria and Performance Targets

### Functional Success Metrics
- ✅ All Sprint 3 patterns implemented consistently
- ✅ Progress aggregation accuracy verified across hierarchy levels
- ✅ Bulk operations support with transaction integrity
- ✅ Dashboard endpoints providing real-time data
- ✅ Comprehensive error handling with actionable messages

### Performance Targets
```yaml
Response Time Targets:
  - Simple migrations list: < 200ms
  - Filtered migrations query: < 300ms
  - Migration progress calculation: < 500ms
  - Dashboard data aggregation: < 1000ms
  - Bulk operations (50 items): < 2000ms

Scalability Targets:
  - Support 1000+ migrations without pagination degradation
  - Handle complex progress calculations for migrations with 10,000+ steps
  - Maintain performance with deep hierarchy traversal (5+ levels)
```

### Quality Assurance Criteria
- ✅ 95%+ test coverage for new functionality
- ✅ Zero breaking changes for existing API consumers
- ✅ Complete ADR-035 status normalization compliance
- ✅ Database query optimization with proper indexing
- ✅ Comprehensive API documentation updates

## Dependencies on Other Entities

### Direct Dependencies
1. **Status Normalization (ADR-035)**
   - Requires status table JOIN operations
   - Depends on normalized status field implementation
   - Must maintain backward compatibility

2. **Child Entity Progress Data**
   - Relies on accurate step instance status tracking
   - Depends on phase/sequence completion calculations
   - Requires consistent audit field updates

3. **User Management Integration**
   - Migration owner validation against user repository
   - Permission-based filtering for multi-tenant scenarios
   - Audit trail integration with user context

### Indirect Dependencies
1. **Database Performance**
   - Complex hierarchical queries require optimized indexes
   - Progress calculation caching mechanisms
   - Transaction management for bulk operations

2. **Frontend Integration**
   - Dashboard UI components expecting specific data structures
   - Admin GUI pagination and filtering compatibility
   - Iteration view integration requirements

## Dashboard Preparation Considerations

### Data Structure Optimization
```json
// Optimized dashboard response structure
{
  "migrationSummary": {
    "id": "uuid",
    "name": "Q4 2025 Migration",
    "status": "In Progress",
    "completionPercentage": 67.5,
    "totalSteps": 1247,
    "completedSteps": 841
  },
  "progressMetrics": {
    "onTrack": true,
    "daysRemaining": 45,
    "criticalPathItems": 12,
    "riskLevel": "Medium"
  },
  "statusDistribution": [
    {"status": "Completed", "count": 841, "percentage": 67.5},
    {"status": "In Progress", "count": 234, "percentage": 18.8},
    {"status": "Not Started", "count": 172, "percentage": 13.8}
  ],
  "teamWorkload": [
    {"teamName": "Infrastructure", "activeSteps": 45, "utilization": "High"},
    {"teamName": "Application", "activeSteps": 23, "utilization": "Medium"}
  ]
}
```

### Real-time Update Mechanisms
```groovy
// Progress cache invalidation strategy
def invalidateProgressCache(UUID migrationId) {
    // Invalidate migration-level cache
    cacheManager.evict("migration-progress", migrationId)
    
    // Invalidate portfolio-level cache if needed
    if (isPortfolioMigration(migrationId)) {
        cacheManager.evict("portfolio-summary")
    }
    
    // Trigger dashboard refresh event
    eventPublisher.publishProgressUpdate(migrationId)
}
```

### Frontend Integration Preparation
```yaml
Dashboard API Requirements:
  - Real-time progress updates via AJAX polling
  - Optimized JSON responses for chart rendering
  - Cached aggregation data with 5-minute refresh
  - Mobile-responsive data structures
  - Export capabilities for executive reporting
```

## Implementation Notes

### Database Migration Requirements
```sql
-- Add indexes for migration filtering and sorting
CREATE INDEX idx_migrations_owner_status ON migrations_mig(usr_id_owner, sts_id);
CREATE INDEX idx_migrations_dates ON migrations_mig(mig_start_date, mig_end_date, mig_business_cutover_date);
CREATE INDEX idx_migrations_type_status ON migrations_mig(mig_type, sts_id);

-- Add progress calculation cache table
CREATE TABLE migration_progress_cache (
    mig_id UUID PRIMARY KEY REFERENCES migrations_mig(mig_id),
    total_steps INTEGER NOT NULL,
    completed_steps INTEGER NOT NULL,
    completion_percentage DECIMAL(5,2) NOT NULL,
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Configuration Requirements
```yaml
# Performance tuning configuration
migration_api:
  pagination:
    default_page_size: 20
    max_page_size: 100
  caching:
    progress_cache_ttl: 300 # 5 minutes
    portfolio_cache_ttl: 600 # 10 minutes
  bulk_operations:
    max_batch_size: 50
    transaction_timeout: 30000 # 30 seconds
```

This comprehensive user story provides detailed technical specifications for modernizing the MigrationsAPI while preparing it to serve as the foundation for dashboard functionality and system-wide progress monitoring.