# US-025: Data Model Enhancement Plan

## Repository Layer Enhancements

### Current State Analysis
The existing MigrationRepository has basic CRUD operations but lacks:
- Advanced filtering and pagination
- Dashboard aggregation capabilities  
- Bulk operation support
- Transaction handling
- Performance optimization for large datasets

### Required New Methods

#### 1. Enhanced Core CRUD Methods

```groovy
// Enhanced findAllMigrations with comprehensive filtering
def findAllMigrations(int page, int size, String search, String sort, String direction, Map filters)

// Optimized single migration with status metadata
def findMigrationByIdWithMetadata(UUID migrationId)

// Bulk operation methods
def bulkUpdateMigrationStatus(List<UUID> migrationIds, String newStatus, String reason)
def bulkExportMigrations(List<UUID> migrationIds, String format, boolean includeIterations)
```

#### 2. Dashboard Aggregation Methods

```groovy
// Dashboard summary with status counts
def getDashboardSummary()

// Progress aggregation for specific migration or date range  
def getProgressAggregation(UUID migrationId = null, Date dateFrom = null, Date dateTo = null)

// Performance metrics over time periods
def getPerformanceMetrics(String period, UUID migrationId = null)

// Upcoming deadlines and recent updates
def getUpcomingDeadlines(int limit = 10)
def getRecentUpdates(int limit = 10)
```

#### 3. Advanced Filtering Support

```groovy
// Multi-status filtering
def findMigrationsByStatus(List<String> statusNames, int page, int size)

// Date range filtering
def findMigrationsByDateRange(Date startDate, Date endDate, String dateField, int page, int size)

// Team assignment filtering
def findMigrationsByTeam(Integer teamId, int page, int size)

// Owner filtering
def findMigrationsByOwner(Integer ownerId, int page, int size)

// Combined filtering with search
def findMigrationsWithFilters(Map filterCriteria, int page, int size, String sort, String direction)
```

## Database Optimization Strategy

### ⚠️ ScriptRunner Database Constraints

**IMPORTANT**: All database access MUST use ScriptRunner's Database resource through `DatabaseUtil.withSql { }`. 

**NO DIRECT SQL IS AUTHORIZED**:
- No direct index creation (managed by ScriptRunner/Confluence)  
- No view creation (use repository methods instead)
- No schema modifications outside Liquibase migrations
- All queries must go through DatabaseUtil pattern

### Performance Optimization Within ScriptRunner Constraints

#### 1. Query Optimization Strategies
- Use efficient SQL queries within `DatabaseUtil.withSql { sql -> }`
- Leverage existing database indexes (cannot create new ones)
- Optimize JOIN patterns and WHERE clauses for performance
- Use parameterized queries for security and performance

#### 2. Repository-Level Optimizations
- Implement query result caching at repository level
- Use efficient pagination patterns with LIMIT/OFFSET
- Minimize N+1 query problems with batch loading
- Implement smart filtering to reduce dataset sizes

#### 3. Dashboard Aggregation Through Repository Methods
Instead of database views, implement aggregation logic in repository methods:

```groovy
// Dashboard summary through optimized repository queries
def getDashboardSummary() {
    return DatabaseUtil.withSql { sql ->
        // Status count aggregation query
        def statusCounts = sql.rows("""
            SELECT s.sts_name, s.sts_color, COUNT(m.mig_id) as migration_count
            FROM status_sts s
            LEFT JOIN migrations_mig m ON m.mig_status = s.sts_id
            WHERE s.sts_type = 'migration'
            GROUP BY s.sts_id, s.sts_name, s.sts_color
        """)
        
        // Process results in Groovy code
        return processStatusCounts(statusCounts)
    }
}

// Progress calculation through hierarchical queries
def getProgressAggregation(UUID migrationId) {
    return DatabaseUtil.withSql { sql ->
        // Step completion query with joins
        def stepData = sql.rows("""
            SELECT 
                m.mig_id, m.mig_name,
                COUNT(st.sti_id) as total_steps,
                COUNT(CASE WHEN st_status.sts_name = 'Completed' THEN 1 END) as completed_steps
            FROM migrations_mig m
            LEFT JOIN iterations_ite i ON i.mig_id = m.mig_id
            LEFT JOIN plans_instance_pli pli ON pli.ite_id = i.ite_id
            LEFT JOIN sequences_instance_sqi sqi ON sqi.pli_id = pli.pli_id
            LEFT JOIN phases_instance_phi phi ON phi.sqi_id = sqi.sqi_id
            LEFT JOIN steps_instance_sti st ON st.phi_id = phi.phi_id
            LEFT JOIN status_sts st_status ON st.sti_status = st_status.sts_id
            WHERE m.mig_id = :migrationId
            GROUP BY m.mig_id, m.mig_name
        """, [migrationId: migrationId])
        
        // Calculate percentages in Groovy
        return calculateProgressPercentages(stepData)
    }
}
```

## Query Optimization Patterns

### 1. Efficient Pagination

```groovy
def buildPaginatedQuery(String baseQuery, int page, int size, String sort, String direction) {
    def offset = (page - 1) * size
    def sortField = validateAndNormalizeSortField(sort)
    def sortDir = (direction?.toLowerCase() == 'desc') ? 'DESC' : 'ASC'
    
    return """
        ${baseQuery}
        ORDER BY ${sortField} ${sortDir}
        LIMIT ${size}
        OFFSET ${offset}
    """
}

// Separate optimized count query
def buildCountQuery(String baseQuery) {
    // Remove ORDER BY and LIMIT from base query for count
    def countQuery = baseQuery.replaceAll(/ORDER BY.*$/, '')
    return "SELECT COUNT(*) as total FROM (${countQuery}) as count_query"
}
```

### 2. Dynamic Filter Building

```groovy
def buildFilterCriteria(Map filters) {
    def criteria = []
    def params = [:]
    
    if (filters.status) {
        criteria << "m.mig_status IN (SELECT sts_id FROM status_sts WHERE sts_name IN (:statusNames))"
        params.statusNames = filters.status instanceof List ? filters.status : [filters.status]
    }
    
    if (filters.dateFrom) {
        criteria << "m.created_at >= :dateFrom"
        params.dateFrom = filters.dateFrom
    }
    
    if (filters.dateTo) {
        criteria << "m.created_at <= :dateTo"
        params.dateTo = filters.dateTo
    }
    
    if (filters.search) {
        criteria << "(m.mig_name ILIKE :search OR m.mig_description ILIKE :search)"
        params.search = "%${filters.search}%"
    }
    
    if (filters.teamId) {
        criteria << """EXISTS (
            SELECT 1 FROM steps_instance_sti st
            JOIN phases_instance_phi phi ON st.phi_id = phi.phi_id
            JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
            JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
            JOIN iterations_ite i ON pli.ite_id = i.ite_id
            WHERE i.mig_id = m.mig_id AND st.tms_id_assigned_to = :teamId
        )"""
        params.teamId = filters.teamId
    }
    
    return [
        whereClause: criteria.isEmpty() ? "" : "WHERE " + criteria.join(" AND "),
        parameters: params
    ]
}
```

### 3. Dashboard Aggregation Queries

```groovy
// Optimized dashboard summary
def getDashboardSummary() {
    return DatabaseUtil.withSql { sql ->
        def summary = sql.firstRow("""
            SELECT 
                COUNT(*) as total_migrations,
                COUNT(CASE WHEN s.sts_name = 'Planning' THEN 1 END) as planning_count,
                COUNT(CASE WHEN s.sts_name = 'Active' THEN 1 END) as active_count,
                COUNT(CASE WHEN s.sts_name = 'Completed' THEN 1 END) as completed_count,
                COUNT(CASE WHEN s.sts_name = 'Cancelled' THEN 1 END) as cancelled_count
            FROM migrations_mig m
            JOIN status_sts s ON m.mig_status = s.sts_id
        """)
        
        def upcomingDeadlines = sql.rows("""
            SELECT mig_id, mig_name, mig_end_date
            FROM migrations_mig 
            WHERE mig_end_date > CURRENT_DATE 
            AND mig_end_date <= CURRENT_DATE + INTERVAL '30 days'
            ORDER BY mig_end_date ASC
            LIMIT 5
        """)
        
        def recentUpdates = sql.rows("""
            SELECT mig_id, mig_name, updated_at, updated_by
            FROM migrations_mig
            ORDER BY updated_at DESC
            LIMIT 5
        """)
        
        return [
            totalMigrations: summary.total_migrations,
            byStatus: [
                planning: summary.planning_count,
                active: summary.active_count,
                completed: summary.completed_count,
                cancelled: summary.cancelled_count
            ],
            upcomingDeadlines: upcomingDeadlines,
            recentUpdates: recentUpdates
        ]
    }
}
```

## Transaction Handling Strategy

### Bulk Operations with Rollback

```groovy
def bulkUpdateMigrationStatus(List<UUID> migrationIds, String newStatus, String reason) {
    return DatabaseUtil.withSql { sql ->
        sql.withTransaction { 
            def results = [updated: [], failed: []]
            
            // Validate status exists
            def statusRow = sql.firstRow("SELECT sts_id FROM status_sts WHERE sts_name = :status", [status: newStatus])
            if (!statusRow) {
                throw new IllegalArgumentException("Invalid status: ${newStatus}")
            }
            
            migrationIds.each { migrationId ->
                try {
                    def rowsUpdated = sql.executeUpdate("""
                        UPDATE migrations_mig 
                        SET mig_status = :statusId, updated_at = CURRENT_TIMESTAMP, updated_by = :updatedBy
                        WHERE mig_id = :migrationId
                    """, [
                        statusId: statusRow.sts_id,
                        migrationId: migrationId,
                        updatedBy: 'bulk-operation'
                    ])
                    
                    if (rowsUpdated > 0) {
                        results.updated << migrationId
                        
                        // Note: Audit logging would need to be implemented through 
                        // application-level logging since we cannot create audit tables
                        // without Liquibase migrations
                    } else {
                        results.failed << [migrationId: migrationId, error: "Migration not found"]
                    }
                } catch (Exception e) {
                    results.failed << [migrationId: migrationId, error: e.message]
                }
            }
            
            return [
                updated: results.updated,
                failed: results.failed,
                summary: [
                    total: migrationIds.size(),
                    updated: results.updated.size(),
                    failed: results.failed.size()
                ]
            ]
        }
    }
}
```

## Performance Considerations

### 1. Connection Pooling
- Use efficient connection pooling in DatabaseUtil
- Set appropriate timeout values for long-running dashboard queries
- Monitor connection usage during bulk operations

### 2. Query Optimization Within ScriptRunner
- Profile queries using ScriptRunner logging and monitoring
- Implement application-level caching for frequently accessed dashboard data
- Use efficient SQL patterns within DatabaseUtil.withSql constraints
- Implement query timeout handling for user-facing operations

### 3. Memory Management
- Stream large result sets instead of loading all into memory
- Use pagination for all list operations
- Implement result set limits for safety

### 4. Monitoring
- Add performance logging for slow queries
- Monitor dashboard query execution times
- Track bulk operation performance and success rates

---

**Created**: August 11, 2025  
**Updated**: August 11, 2025  
**Status**: Phase 1 - Data Model Enhancement Planning  
**Next**: Phase 2 - Repository Implementation