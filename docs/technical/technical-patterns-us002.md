# Technical Patterns Discovered - US-002 Implementation

**Date Created:** 2025-07-31  
**Sprint:** Sprint 3, US-002 (Sequences API with Ordering)  
**Focus:** Technical patterns, solutions, and code examples from advanced implementation

## Overview

This document captures the specific technical patterns, code solutions, and implementation discoveries made during US-002 (Sequences API with Ordering) implementation. These patterns represent significant technical innovations and problem-solving breakthroughs that should be preserved and applied to future development.

## Static Type Checking Solutions

### Problem Context

During US-002 implementation, we encountered multiple ClassCastException errors when ScriptRunner's static type checking was enabled. These runtime errors were difficult to debug and required systematic pattern identification and resolution.

### Root Cause Analysis

ScriptRunner's static type checking requires explicit type casting for all parameter operations. The Groovy dynamic typing system conflicts with ScriptRunner's compile-time type inference, leading to runtime type conversion failures.

### Proven Solutions

#### 1. UUID Parameter Type Casting

**Problematic Pattern (Causes ClassCastException)**:

```groovy
// This pattern fails in ScriptRunner with static type checking
def migrationId = filters.migrationId
params.migrationId = UUID.fromString(migrationId)

// Error: ClassCastException: Cannot cast [class] to UUID
```

**Correct Pattern (Type-Safe)**:

```groovy
// Explicit casting prevents ClassCastException
if (filters.migrationId) {
    query += ' AND mig.mig_id = :migrationId'
    params.migrationId = UUID.fromString(filters.migrationId as String)
}

// Alternative with null safety
def migrationId = filters.migrationId ?
    UUID.fromString(filters.migrationId as String) : null
```

#### 2. Integer Parameter Type Casting

**Problematic Pattern**:

```groovy
// Fails with type inference issues
def teamId = filters.teamId
params.teamId = Integer.parseInt(teamId)
```

**Correct Pattern**:

```groovy
// Explicit casting with error handling
if (filters.teamId) {
    try {
        params.teamId = Integer.parseInt(filters.teamId as String)
        query += ' AND stm.tms_id_owner = :teamId'
    } catch (NumberFormatException e) {
        throw new IllegalArgumentException("Invalid team ID format: ${filters.teamId}")
    }
}
```

#### 3. Path Parameter Extraction

**Problematic Pattern**:

```groovy
// Null pointer exceptions and type issues
def pathParts = getAdditionalPath(request).split('/')
def id = Integer.parseInt(pathParts[0])
```

**Correct Pattern**:

```groovy
// Safe path parameter handling with null protection
def pathParts = getAdditionalPath(request)?.split('/') ?: []
if (pathParts.size() >= 1) {
    try {
        def id = Integer.parseInt(pathParts[0] as String)
        // Process with id
    } catch (NumberFormatException e) {
        return Response.status(400)
            .entity([error: "Invalid ID format in path"])
            .build()
    }
}
```

### Evolution of Dynamic Property Access

#### Original Approach (Problematic)

```groovy
// Dynamic property access caused type inference issues
def result = sql.rows(query)
result.each { row ->
    // This pattern caused ClassCastException in ScriptRunner
    def stepId = row.step_id
    def stepName = row.step_name
    def teamId = row.team_id

    // Type inference failed for complex operations
    processStep(stepId, stepName, teamId)
}
```

#### Evolved Approach (Type-Safe)

```groovy
// Map notation with explicit casting
def result = sql.rows(query)
result.each { row ->
    // Explicit type casting for all property access
    def stepId = row['step_id'] as Integer
    def stepName = row['step_name'] as String
    def teamId = row['team_id'] as Integer

    // Safe processing with known types
    processStep(stepId, stepName, teamId)
}
```

### Complete Field Selection Requirements

#### Problem: "No such property" Errors

**Problematic Query (Missing Fields)**:

```groovy
// Missing fields cause runtime "No such property" errors
def query = '''
    SELECT sti.sti_id, sti.sti_name
    FROM steps_instance_sti sti
    JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
    JOIN step_types_stt stt ON stm.stt_id = stt.stt_id
'''

// Later code references missing fields
result.each { row ->
    def stepId = row.sti_id
    def stepName = row.sti_name
    def stepCode = row.stm_code    // ERROR: Field not in SELECT
    def stepType = row.stt_name    // ERROR: Field not in SELECT
}
```

**Correct Query (Complete Field Selection)**:

```groovy
// Include ALL fields referenced in result processing
def query = '''
    SELECT sti.sti_id, sti.sti_name, sti.sti_status,
           stm.stm_id, stm.stm_code, stm.stm_name,
           stt.stt_id, stt.stt_name, stt.stt_code,
           phi.phi_id, phi.phi_name
    FROM steps_instance_sti sti
    JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
    JOIN step_types_stt stt ON stm.stt_id = stt.stt_id
    JOIN phases_instance phi ON sti.phi_id = phi.phi_id
'''

// Safe property access for all referenced fields
result.each { row ->
    def stepInstance = [
        sti_id: row.sti_id as Integer,
        sti_name: row.sti_name as String,
        sti_status: row.sti_status as String,
        stm_code: row.stm_code as String,
        stt_name: row.stt_name as String,
        phi_name: row.phi_name as String
    ]
}
```

## Recursive CTE Pattern for Circular Dependencies

### Business Problem

Sequence dependencies can create circular references (A depends on B, B depends on C, C depends on A), which would cause infinite loops during execution. We needed a robust way to detect these cycles before allowing sequence creation or modification.

### Technical Solution

Implemented PostgreSQL recursive Common Table Expressions (CTEs) to traverse dependency graphs and detect cycles.

#### Complete Implementation

```sql
-- Recursive CTE for circular dependency detection
WITH RECURSIVE dependency_chain AS (
    -- Base case: Start with all sequences in the plan
    SELECT sqm_id,
           predecessor_sqm_id,
           1 as depth,
           ARRAY[sqm_id] as path,
           sqm_name
    FROM sequences_master_sqm
    WHERE plm_id = :planId

    UNION ALL

    -- Recursive case: Follow predecessor relationships
    SELECT s.sqm_id,
           s.predecessor_sqm_id,
           dc.depth + 1,
           dc.path || s.sqm_id,
           s.sqm_name
    FROM sequences_master_sqm s
    JOIN dependency_chain dc ON s.predecessor_sqm_id = dc.sqm_id
    WHERE s.sqm_id != ALL(dc.path)  -- Prevent infinite loops
      AND dc.depth < 50             -- Safety depth limit
)
-- Detect cycles: sequence appears in its own dependency path
SELECT dc.sqm_id,
       dc.path,
       dc.depth,
       'Circular dependency detected' as error_message
FROM dependency_chain dc
WHERE dc.sqm_id = ANY(dc.path[1:array_length(dc.path,1)-1])
ORDER BY dc.depth DESC
```

#### Groovy Integration

```groovy
def findCircularDependencies(UUID planId) {
    DatabaseUtil.withSql { sql ->
        def circularDeps = sql.rows('''
            WITH RECURSIVE dependency_chain AS (
                SELECT sqm_id, predecessor_sqm_id, 1 as depth,
                       ARRAY[sqm_id] as path
                FROM sequences_master_sqm WHERE plm_id = :planId
                UNION ALL
                SELECT s.sqm_id, s.predecessor_sqm_id, dc.depth + 1,
                       dc.path || s.sqm_id
                FROM sequences_master_sqm s
                JOIN dependency_chain dc ON s.predecessor_sqm_id = dc.sqm_id
                WHERE s.sqm_id != ALL(dc.path) AND dc.depth < 50
            )
            SELECT sqm_id, path, depth
            FROM dependency_chain
            WHERE sqm_id = ANY(path[1:array_length(path,1)-1])
        ''', [planId: planId])

        return circularDeps.collect { row ->
            [
                sequenceId: row.sqm_id as Integer,
                dependencyPath: row.path as Integer[],
                depth: row.depth as Integer,
                error: "Circular dependency detected in sequence ${row.sqm_id}"
            ]
        }
    }
}

def hasCircularDependency(UUID planId) {
    def circularDeps = findCircularDependencies(planId)
    return !circularDeps.isEmpty()
}
```

### Advanced Features

#### Path Tracking for Debugging

```groovy
def getDetailedDependencyPath(UUID planId, Integer sequenceId) {
    DatabaseUtil.withSql { sql ->
        sql.rows('''
            WITH RECURSIVE dependency_path AS (
                SELECT sqm_id, predecessor_sqm_id, sqm_name,
                       1 as level, ARRAY[sqm_name] as name_path
                FROM sequences_master_sqm
                WHERE sqm_id = :sequenceId AND plm_id = :planId
                UNION ALL
                SELECT s.sqm_id, s.predecessor_sqm_id, s.sqm_name,
                       dp.level + 1, dp.name_path || s.sqm_name
                FROM sequences_master_sqm s
                JOIN dependency_path dp ON s.sqm_id = dp.predecessor_sqm_id
                WHERE dp.level < 20
            )
            SELECT level, name_path, array_to_string(name_path, ' → ') as path_display
            FROM dependency_path
            ORDER BY level DESC
            LIMIT 1
        ''', [planId: planId, sequenceId: sequenceId])
    }
}
```

#### Performance Optimization

```sql
-- Optimized version with early termination
WITH RECURSIVE dependency_chain AS (
    SELECT sqm_id, predecessor_sqm_id, 1 as depth,
           ARRAY[sqm_id] as path
    FROM sequences_master_sqm WHERE plm_id = :planId
    UNION ALL
    SELECT s.sqm_id, s.predecessor_sqm_id, dc.depth + 1,
           dc.path || s.sqm_id
    FROM sequences_master_sqm s
    JOIN dependency_chain dc ON s.predecessor_sqm_id = dc.sqm_id
    WHERE s.sqm_id != ALL(dc.path)
      AND dc.depth < 50
      AND NOT EXISTS (
          -- Early termination if cycle already found
          SELECT 1 FROM dependency_chain dc2
          WHERE dc2.sqm_id = ANY(dc2.path[1:array_length(dc2.path,1)-1])
      )
)
SELECT COUNT(*) > 0 as has_cycle
FROM dependency_chain
WHERE sqm_id = ANY(path[1:array_length(path,1)-1])
```

## Transaction-Based Reordering Pattern

### Business Problem

Sequence reordering must be atomic to prevent inconsistent states during critical migrations. Partial updates could leave the system in an invalid state where sequences have duplicate orders or gaps that break execution logic.

### Technical Solution

Implemented explicit transaction management with comprehensive validation and rollback capability.

#### Complete Transaction Pattern

```groovy
def reorderMasterSequence(UUID planId, Map<UUID, Integer> sequenceOrderMap) {
    DatabaseUtil.withSql { sql ->
        // Start explicit transaction
        sql.execute("BEGIN")

        try {
            // Pre-validation: Check input data
            if (!validateOrderingMap(sequenceOrderMap)) {
                throw new IllegalArgumentException("Invalid ordering map provided")
            }

            // Pre-validation: Check for circular dependencies
            if (hasCircularDependency(planId)) {
                throw new IllegalStateException("Cannot reorder: circular dependencies exist")
            }

            // Create temporary staging for atomic updates
            sql.execute('''
                CREATE TEMP TABLE temp_sequence_order (
                    sqm_id UUID,
                    new_order INTEGER
                ) ON COMMIT DROP
            ''')

            // Stage all updates
            sequenceOrderMap.each { sequenceId, newOrder ->
                sql.executeInsert('''
                    INSERT INTO temp_sequence_order (sqm_id, new_order)
                    VALUES (?, ?)
                ''', [sequenceId, newOrder])
            }

            // Validate staged data for duplicates
            def duplicates = sql.rows('''
                SELECT new_order, COUNT(*) as count
                FROM temp_sequence_order
                GROUP BY new_order
                HAVING COUNT(*) > 1
            ''')

            if (!duplicates.isEmpty()) {
                throw new IllegalStateException("Duplicate order values detected: ${duplicates}")
            }

            // Apply atomic updates
            sql.executeUpdate('''
                UPDATE sequences_master_sqm
                SET sqm_order = temp.new_order,
                    updated_date = CURRENT_TIMESTAMP,
                    updated_by = 'system'
                FROM temp_sequence_order temp
                WHERE sequences_master_sqm.sqm_id = temp.sqm_id
                  AND sequences_master_sqm.plm_id = ?
            ''', [planId])

            // Post-validation: Verify ordering integrity
            if (!validateSequenceOrdering(planId)) {
                throw new IllegalStateException("Post-update ordering validation failed")
            }

            // Post-validation: Check for any new circular dependencies
            if (hasCircularDependency(planId)) {
                throw new IllegalStateException("Reordering created circular dependencies")
            }

            // Success: commit transaction
            sql.execute("COMMIT")

            return [
                success: true,
                message: "Sequences reordered successfully",
                updatedCount: sequenceOrderMap.size()
            ]

        } catch (Exception e) {
            // Failure: rollback all changes
            sql.execute("ROLLBACK")

            return [
                success: false,
                error: "Reordering failed: ${e.message}",
                details: e.class.simpleName
            ]
        }
    }
}
```

#### Gap Handling and Normalization

```groovy
def normalizeSequenceOrdering(UUID planId, boolean isInstance = false) {
    def tableName = isInstance ? 'sequences_instance_sqi' : 'sequences_master_sqm'
    def planField = isInstance ? 'pli_id' : 'plm_id'
    def orderField = isInstance ? 'sqi_order' : 'sqm_order'

    DatabaseUtil.withSql { sql ->
        sql.execute("BEGIN")

        try {
            // Find gaps in ordering
            def sequences = sql.rows("""
                SELECT ${tableName.contains('instance') ? 'sqi_id' : 'sqm_id'} as seq_id,
                       ${orderField} as current_order
                FROM ${tableName}
                WHERE ${planField} = :planId
                ORDER BY ${orderField}
            """, [planId: planId])

            // Renumber to eliminate gaps
            sequences.eachWithIndex { seq, index ->
                def newOrder = index + 1
                if (seq.current_order != newOrder) {
                    sql.executeUpdate("""
                        UPDATE ${tableName}
                        SET ${orderField} = :newOrder,
                            updated_date = CURRENT_TIMESTAMP
                        WHERE ${tableName.contains('instance') ? 'sqi_id' : 'sqm_id'} = :seqId
                    """, [newOrder: newOrder, seqId: seq.seq_id])
                }
            }

            sql.execute("COMMIT")
            return [success: true, normalizedCount: sequences.size()]

        } catch (Exception e) {
            sql.execute("ROLLBACK")
            throw new RuntimeException("Normalization failed: ${e.message}", e)
        }
    }
}
```

#### Validation Logic

```groovy
def validateSequenceOrdering(UUID planId, boolean isInstance = false) {
    def tableName = isInstance ? 'sequences_instance_sqi' : 'sequences_master_sqm'
    def planField = isInstance ? 'pli_id' : 'plm_id'
    def orderField = isInstance ? 'sqi_order' : 'sqm_order'

    DatabaseUtil.withSql { sql ->
        // Check for duplicate orders
        def duplicates = sql.rows("""
            SELECT ${orderField}, COUNT(*) as count
            FROM ${tableName}
            WHERE ${planField} = :planId
            GROUP BY ${orderField}
            HAVING COUNT(*) > 1
        """, [planId: planId])

        if (!duplicates.isEmpty()) {
            return [valid: false, error: "Duplicate orders found: ${duplicates}"]
        }

        // Check for negative or zero orders
        def invalidOrders = sql.rows("""
            SELECT COUNT(*) as count
            FROM ${tableName}
            WHERE ${planField} = :planId AND ${orderField} <= 0
        """, [planId: planId])

        if (invalidOrders[0].count > 0) {
            return [valid: false, error: "Invalid order values (≤0) found"]
        }

        // Check for reasonable order gaps (optional warning)
        def maxOrder = sql.rows("""
            SELECT MAX(${orderField}) as max_order, COUNT(*) as total_count
            FROM ${tableName}
            WHERE ${planField} = :planId
        """, [planId: planId])

        def max = maxOrder[0].max_order as Integer
        def count = maxOrder[0].total_count as Integer

        if (max > count * 2) {
            return [
                valid: true,
                warning: "Large gaps in ordering detected (max: ${max}, count: ${count})"
            ]
        }

        return [valid: true, message: "Ordering validation passed"]
    }
}
```

## Instance vs Master ID Filtering

### Problem Discovery

During hierarchical filtering implementation, we discovered that using master IDs for filtering would miss instance-specific data and return incorrect results.

### Root Cause

Master tables contain templates/blueprints, while instance tables contain execution records. When filtering for current execution state, we must use instance IDs to get accurate results.

#### Problematic Pattern (Using Master IDs)

```groovy
// WRONG: Filters by master plan ID
def query = '''
    SELECT sqi.sqi_id, sqi.sqi_name, sqi.sqi_status
    FROM sequences_instance_sqi sqi
    JOIN plans_master_plm plm ON sqi.plm_id = plm.plm_id  -- Wrong join!
    WHERE plm.plm_id = :planId  -- Filtering by master ID
'''

// This misses sequences that belong to plan instances
// because sqi.plm_id references plans_instance_pli.pli_id, not plans_master_plm.plm_id
```

#### Correct Pattern (Using Instance IDs)

```groovy
// CORRECT: Filters by instance plan ID
def query = '''
    SELECT sqi.sqi_id, sqi.sqi_name, sqi.sqi_status,
           pli.pli_name as plan_name, pli.pli_id as plan_instance_id
    FROM sequences_instance_sqi sqi
    JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id  -- Correct join!
    WHERE pli.pli_id = :planId  -- Filtering by instance ID
'''

// This correctly retrieves sequences for the specific plan instance
```

#### Complete Hierarchical Query Pattern

```groovy
def findSequencesByHierarchy(Map filters) {
    def query = '''
        SELECT DISTINCT sqi.sqi_id, sqi.sqi_name, sqi.sqi_order, sqi.sqi_status,
               pli.pli_id, pli.pli_name,
               itr.itr_id, itr.itr_name,
               mig.mig_id, mig.mig_name
        FROM sequences_instance_sqi sqi
        JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
        JOIN iterations_itr itr ON pli.itr_id = itr.itr_id
        JOIN migrations_mig mig ON itr.mig_id = mig.mig_id
        WHERE 1=1
    '''

    def params = [:]

    // Apply filters using instance IDs throughout the hierarchy
    if (filters.migrationId) {
        query += ' AND mig.mig_id = :migrationId'
        params.migrationId = UUID.fromString(filters.migrationId as String)
    }

    if (filters.iterationId) {
        query += ' AND itr.itr_id = :iterationId'
        params.iterationId = UUID.fromString(filters.iterationId as String)
    }

    if (filters.planId) {
        query += ' AND pli.pli_id = :planId'  // Instance ID, not master ID
        params.planId = UUID.fromString(filters.planId as String)
    }

    query += ' ORDER BY sqi.sqi_order'

    return DatabaseUtil.withSql { sql ->
        sql.rows(query, params)
    }
}
```

## Many-to-Many Relationship Handling

### Problem Context

Step labels represent a many-to-many relationship that's optional and can fail independently of main operations. We needed graceful handling that doesn't break API responses when label fetching fails.

### Solution Pattern

```groovy
// Graceful many-to-many relationship handling
def enrichStepWithLabels(Map step) {
    def stepLabels = []

    try {
        // Ensure proper UUID conversion
        def stmId = step.stmId instanceof UUID ?
            step.stmId :
            UUID.fromString(step.stmId.toString())

        // Fetch related labels
        stepLabels = stepRepository.findLabelsByStepId(stmId)

    } catch (Exception e) {
        // Log error but continue with empty labels
        log.warn("Failed to fetch labels for step ${step.stmId}: ${e.message}")
        stepLabels = []
    }

    // Ensure labels is always an array for frontend
    step.labels = stepLabels ?: []
    return step
}

// Repository method for label fetching
def findLabelsByStepId(UUID stepId) {
    DatabaseUtil.withSql { sql ->
        try {
            def labels = sql.rows('''
                SELECT lbl.lbl_id, lbl.lbl_name, lbl.lbl_color, lbl.lbl_description
                FROM labels_lbl lbl
                JOIN step_labels_sml sml ON lbl.lbl_id = sml.lbl_id
                WHERE sml.stm_id = :stepId
                ORDER BY lbl.lbl_name
            ''', [stepId: stepId])

            return labels.collect { row ->
                [
                    lbl_id: row.lbl_id as Integer,
                    lbl_name: row.lbl_name as String,
                    lbl_color: row.lbl_color as String,
                    lbl_description: row.lbl_description as String
                ]
            }

        } catch (SQLException e) {
            log.error("Database error fetching labels for step ${stepId}: ${e.message}")
            return []
        }
    }
}
```

## Error Handling Evolution

### Comprehensive HTTP Status Mapping

```groovy
// Complete error handling pattern for API endpoints
try {
    // Main operation logic
    def result = repository.performOperation(parameters)
    return Response.ok(new JsonBuilder(result).toString()).build()

} catch (IllegalArgumentException e) {
    // Invalid input parameters
    return Response.status(Response.Status.BAD_REQUEST)
        .entity(new JsonBuilder([
            error: "Invalid parameter",
            message: e.message,
            timestamp: new Date().format('yyyy-MM-dd HH:mm:ss')
        ]).toString())
        .build()

} catch (SQLException e) {
    // Database constraint violations
    switch (e.getSQLState()) {
        case '23503': // Foreign key constraint violation
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([
                    error: "Reference constraint violation",
                    message: "Referenced entity does not exist",
                    sqlState: e.getSQLState(),
                    details: e.message
                ]).toString())
                .build()

        case '23505': // Unique constraint violation
            return Response.status(Response.Status.CONFLICT)
                .entity(new JsonBuilder([
                    error: "Duplicate entry",
                    message: "Entity with these values already exists",
                    sqlState: e.getSQLState(),
                    details: e.message
                ]).toString())
                .build()

        case '23514': // Check constraint violation
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([
                    error: "Data validation failed",
                    message: "Data does not meet validation requirements",
                    sqlState: e.getSQLState(),
                    details: e.message
                ]).toString())
                .build()

        default:
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([
                    error: "Database error",
                    message: "An unexpected database error occurred",
                    sqlState: e.getSQLState()
                ]).toString())
                .build()
    }

} catch (Exception e) {
    // Unexpected errors
    log.error("Unexpected error in API operation", e)
    return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
        .entity(new JsonBuilder([
            error: "Internal server error",
            message: "An unexpected error occurred",
            timestamp: new Date().format('yyyy-MM-dd HH:mm:ss')
        ]).toString())
        .build()
}
```

## Performance Optimization Patterns

### Query Optimization for Complex Hierarchies

```groovy
// Optimized query with proper JOIN order and indexes
def findSequencesOptimized(Map filters) {
    // Build query with optimal JOIN order (most selective first)
    def query = '''
        SELECT DISTINCT sqi.sqi_id, sqi.sqi_name, sqi.sqi_order,
               pli.pli_name, itr.itr_name, mig.mig_name
        FROM sequences_instance_sqi sqi
        INNER JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
    '''

    def params = [:]
    def whereClauses = []

    // Add JOINs only when needed for filtering
    if (filters.migrationId || filters.iterationId) {
        query += ' INNER JOIN iterations_itr itr ON pli.itr_id = itr.itr_id'

        if (filters.migrationId) {
            query += ' INNER JOIN migrations_mig mig ON itr.mig_id = mig.mig_id'
            whereClauses << 'mig.mig_id = :migrationId'
            params.migrationId = filters.migrationId
        }

        if (filters.iterationId) {
            whereClauses << 'itr.itr_id = :iterationId'
            params.iterationId = filters.iterationId
        }
    }

    if (filters.planId) {
        whereClauses << 'pli.pli_id = :planId'
        params.planId = filters.planId
    }

    // Apply WHERE clauses
    if (whereClauses) {
        query += ' WHERE ' + whereClauses.join(' AND ')
    }

    query += ' ORDER BY sqi.sqi_order'

    return DatabaseUtil.withSql { sql ->
        sql.rows(query, params)
    }
}
```

## Summary

These technical patterns represent significant problem-solving breakthroughs discovered during US-002 implementation. They address fundamental challenges in:

1. **Type Safety**: Resolving ScriptRunner static type checking requirements
2. **Database Complexity**: Advanced SQL patterns for dependency management
3. **Transaction Management**: Atomic operations with comprehensive validation
4. **Error Handling**: Graceful failure modes with appropriate HTTP responses
5. **Performance**: Optimized queries for complex hierarchical data

These patterns should be consistently applied across all future API implementations to maintain quality, reliability, and performance standards established in US-002.
