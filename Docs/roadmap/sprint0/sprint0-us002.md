# US-002: Sequences API with Ordering

**Date**: July 31, 2025  
**Sprint**: Sprint 0 - API Foundation  
**Status**: READY TO START  
**Estimated Duration**: 3-4 hours  
**Story Points**: 5

## User Story

**As a** cutover coordinator  
**I want** a Sequences API with drag-drop ordering capabilities  
**So that** I can organize execution sequences logically

## Acceptance Criteria

- [ ] CRUD operations for master sequences
- [ ] Bulk reordering endpoint (/sequences/reorder)
- [ ] Order field management (sqm_order)
- [ ] Plan-based filtering
- [ ] Progress roll-up calculations
- [ ] Integration tests for ordering logic

## Technical Requirements

### API Endpoints Structure

Following the proven PlansApi consolidated pattern:

```groovy
// GET endpoints
GET /sequences/master                    // List all master sequences
GET /sequences/master/{id}              // Get specific master sequence
GET /sequences/master?planId={uuid}     // Master sequences for a plan
GET /sequences                          // Instance sequences with filtering
GET /sequences?planInstanceId={uuid}    // Sequences for plan instance
GET /sequences/instance/{id}            // Get specific sequence instance

// POST endpoints  
POST /sequences/master                  // Create master sequence
POST /sequences/instance                // Create sequence instance

// PUT endpoints
PUT /sequences/master/{id}              // Update master sequence
PUT /sequences/instance/{id}            // Update sequence instance
PUT /sequences/{id}/status              // Update instance status
PUT /sequences/reorder                  // SPECIAL: Bulk reorder operation

// DELETE endpoints
DELETE /sequences/master/{id}           // Delete master sequence (admin only)
DELETE /sequences/instance/{id}         // Delete sequence instance (admin only)
```

### Key Features

1. **Ordering Management**
   - `sqm_order` field management in master sequences
   - Bulk reordering operations for logical flow
   - Order propagation to instances with override capability

2. **Hierarchical Filtering**
   - Filter by plan (master level)
   - Filter by plan instance (instance level)
   - Migration and iteration context filtering

3. **Progress Calculations**
   - Roll-up progress from phases within sequences
   - Completion percentage calculations
   - Status aggregation

## Implementation Pattern

### 1. SequencesApi.groovy

```groovy
@BaseScript CustomEndpointDelegate delegate

// GET operations
sequences(httpMethod: "GET", groups: ["confluence-users"]) { 
    MultivaluedMap queryParams, String body, HttpServletRequest request ->
    
    def pathParts = getAdditionalPath(request)?.tokenize('/') ?: []
    def sequenceRepository = getSequenceRepository()
    
    try {
        // Master operations: /sequences/master
        if (pathParts.size() >= 1 && pathParts[0] == 'master') {
            if (pathParts.size() == 1) {
                // GET /sequences/master with optional planId filter
                def planId = queryParams.getFirst('planId')
                def masterSequences = planId ? 
                    sequenceRepository.findMasterSequencesByPlanId(planId) :
                    sequenceRepository.findAllMasterSequences()
                
                return Response.ok(new JsonBuilder(masterSequences).toString())
                    .header('Content-Type', 'application/json')
                    .build()
            } else if (pathParts.size() == 2) {
                // GET /sequences/master/{id}
                def sequenceId = pathParts[1]
                def masterSequence = sequenceRepository.findMasterSequenceById(sequenceId)
                
                if (masterSequence) {
                    return Response.ok(new JsonBuilder(masterSequence).toString())
                        .header('Content-Type', 'application/json')
                        .build()
                } else {
                    return Response.status(404)
                        .entity(new JsonBuilder([error: "Master sequence not found"]).toString())
                        .build()
                }
            }
        }
        
        // Instance operations: /sequences/instance/{id}
        if (pathParts.size() == 2 && pathParts[0] == 'instance') {
            def instanceId = pathParts[1]
            def sequenceInstance = sequenceRepository.findSequenceInstanceById(instanceId)
            
            if (sequenceInstance) {
                return Response.ok(new JsonBuilder(sequenceInstance).toString())
                    .header('Content-Type', 'application/json')
                    .build()
            } else {
                return Response.status(404)
                    .entity(new JsonBuilder([error: "Sequence instance not found"]).toString())
                    .build()
            }
        }
        
        // Default: List sequence instances with filtering
        def filters = [:]
        if (queryParams.getFirst('planInstanceId')) {
            filters.planInstanceId = UUID.fromString(queryParams.getFirst('planInstanceId') as String)
        }
        if (queryParams.getFirst('migrationId')) {
            filters.migrationId = UUID.fromString(queryParams.getFirst('migrationId') as String)
        }
        if (queryParams.getFirst('iterationId')) {
            filters.iterationId = UUID.fromString(queryParams.getFirst('iterationId') as String)
        }
        
        def sequenceInstances = sequenceRepository.findSequenceInstancesWithFilters(filters)
        
        return Response.ok(new JsonBuilder(sequenceInstances).toString())
            .header('Content-Type', 'application/json')
            .build()
            
    } catch (Exception e) {
        log.error("Error in sequences GET operation", e)
        return Response.status(500)
            .entity(new JsonBuilder([error: "Internal server error", details: e.message]).toString())
            .build()
    }
}

// POST operations
sequences(httpMethod: "POST", groups: ["confluence-users"]) {
    MultivaluedMap queryParams, String body, HttpServletRequest request ->
    
    def pathParts = getAdditionalPath(request)?.tokenize('/') ?: []
    def sequenceRepository = getSequenceRepository()
    
    try {
        def requestData = new JsonSlurper().parseText(body)
        
        // Master operations: POST /sequences/master
        if (pathParts.size() == 1 && pathParts[0] == 'master') {
            def masterSequence = sequenceRepository.createMasterSequence(requestData)
            
            return Response.status(201)
                .entity(new JsonBuilder(masterSequence).toString())
                .header('Content-Type', 'application/json')
                .build()
        }
        
        // Instance operations: POST /sequences/instance
        if (pathParts.size() == 1 && pathParts[0] == 'instance') {
            def sequenceInstance = sequenceRepository.createSequenceInstance(requestData)
            
            return Response.status(201)
                .entity(new JsonBuilder(sequenceInstance).toString())
                .header('Content-Type', 'application/json')
                .build()
        }
        
        // Default instance creation
        def sequenceInstance = sequenceRepository.createSequenceInstance(requestData)
        
        return Response.status(201)
            .entity(new JsonBuilder(sequenceInstance).toString())
            .header('Content-Type', 'application/json')
            .build()
            
    } catch (Exception e) {
        log.error("Error in sequences POST operation", e)
        return Response.status(500)
            .entity(new JsonBuilder([error: "Internal server error", details: e.message]).toString())
            .build()
    }
}

// PUT operations (including special reorder)
sequences(httpMethod: "PUT", groups: ["confluence-users"]) {
    MultivaluedMap queryParams, String body, HttpServletRequest request ->
    
    def pathParts = getAdditionalPath(request)?.tokenize('/') ?: []
    def sequenceRepository = getSequenceRepository()
    
    try {
        def requestData = new JsonSlurper().parseText(body)
        
        // Special bulk reorder operation: PUT /sequences/reorder
        if (pathParts.size() == 1 && pathParts[0] == 'reorder') {
            def reorderResult = sequenceRepository.reorderMasterSequences(requestData)
            
            return Response.ok(new JsonBuilder(reorderResult).toString())
                .header('Content-Type', 'application/json')
                .build()
        }
        
        // Master operations: PUT /sequences/master/{id}
        if (pathParts.size() == 2 && pathParts[0] == 'master') {
            def sequenceId = pathParts[1]
            def updatedSequence = sequenceRepository.updateMasterSequence(sequenceId, requestData)
            
            return Response.ok(new JsonBuilder(updatedSequence).toString())
                .header('Content-Type', 'application/json')
                .build()
        }
        
        // Instance operations: PUT /sequences/instance/{id}
        if (pathParts.size() == 2 && pathParts[0] == 'instance') {
            def instanceId = pathParts[1]
            def updatedInstance = sequenceRepository.updateSequenceInstance(instanceId, requestData)
            
            return Response.ok(new JsonBuilder(updatedInstance).toString())
                .header('Content-Type', 'application/json')
                .build()
        }
        
        // Status update: PUT /sequences/{id}/status
        if (pathParts.size() == 2 && pathParts[1] == 'status') {
            def instanceId = pathParts[0]
            def statusUpdate = sequenceRepository.updateSequenceInstanceStatus(instanceId, requestData.statusId as Integer)
            
            return Response.ok(new JsonBuilder(statusUpdate).toString())
                .header('Content-Type', 'application/json')
                .build()
        }
        
        return Response.status(400)
            .entity(new JsonBuilder([error: "Invalid PUT operation path"]).toString())
            .build()
            
    } catch (Exception e) {
        log.error("Error in sequences PUT operation", e)
        return Response.status(500)
            .entity(new JsonBuilder([error: "Internal server error", details: e.message]).toString())
            .build()
    }
}

// DELETE operations
sequences(httpMethod: "DELETE", groups: ["confluence-administrators"]) {
    MultivaluedMap queryParams, String body, HttpServletRequest request ->
    
    def pathParts = getAdditionalPath(request)?.tokenize('/') ?: []
    def sequenceRepository = getSequenceRepository()
    
    try {
        // Master operations: DELETE /sequences/master/{id}
        if (pathParts.size() == 2 && pathParts[0] == 'master') {
            def sequenceId = pathParts[1]
            def deleteResult = sequenceRepository.deleteMasterSequence(sequenceId)
            
            return Response.ok(new JsonBuilder(deleteResult).toString())
                .header('Content-Type', 'application/json')
                .build()
        }
        
        // Instance operations: DELETE /sequences/instance/{id}
        if (pathParts.size() == 2 && pathParts[0] == 'instance') {
            def instanceId = pathParts[1]
            def deleteResult = sequenceRepository.deleteSequenceInstance(instanceId)
            
            return Response.ok(new JsonBuilder(deleteResult).toString())
                .header('Content-Type', 'application/json')
                .build()
        }
        
        return Response.status(400)
            .entity(new JsonBuilder([error: "Invalid DELETE operation path"]).toString())
            .build()
            
    } catch (Exception e) {
        log.error("Error in sequences DELETE operation", e)
        return Response.status(500)
            .entity(new JsonBuilder([error: "Internal server error", details: e.message]).toString())
            .build()
    }
}

// Lazy repository loading (ScriptRunner pattern)
def getSequenceRepository() {
    def repoClass = this.class.classLoader.loadClass('umig.repository.SequenceRepository')
    return repoClass.newInstance()
}
```

### 2. SequenceRepository.groovy

```groovy
package umig.repository

import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import umig.utils.DatabaseUtil

class SequenceRepository {

    // Master Sequence Operations
    
    List<Map> findAllMasterSequences() {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT sqm.*, sts.sts_name, sts.sts_color,
                       COUNT(phi.phi_id) as total_phases,
                       COUNT(CASE WHEN sts_phi.sts_name = 'Completed' THEN 1 END) as completed_phases
                FROM sequences_master_sqm sqm
                JOIN status_sts sts ON sqm.sts_id = sts.sts_id
                LEFT JOIN phases_master_phm phm ON sqm.sqm_id = phm.sqm_id
                LEFT JOIN phases_instance_phi phi ON phm.phm_id = phi.phm_id
                LEFT JOIN status_sts sts_phi ON phi.sts_id = sts_phi.sts_id
                WHERE sqm.soft_delete_flag = false
                GROUP BY sqm.sqm_id, sts.sts_name, sts.sts_color
                ORDER BY sqm.sqm_order ASC, sqm.created_at DESC
            """)
        }
    }
    
    List<Map> findMasterSequencesByPlanId(String planId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT sqm.*, sts.sts_name, sts.sts_color, plm.plm_name
                FROM sequences_master_sqm sqm
                JOIN status_sts sts ON sqm.sts_id = sts.sts_id
                JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id
                WHERE sqm.plm_id = ?::uuid
                  AND sqm.soft_delete_flag = false
                ORDER BY sqm.sqm_order ASC
            """, [planId])
        }
    }
    
    Map findMasterSequenceById(String sequenceId) {
        DatabaseUtil.withSql { sql ->
            def rows = sql.rows("""
                SELECT sqm.*, sts.sts_name, sts.sts_color, plm.plm_name,
                       COUNT(phm.phm_id) as total_master_phases
                FROM sequences_master_sqm sqm
                JOIN status_sts sts ON sqm.sts_id = sts.sts_id
                JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id
                LEFT JOIN phases_master_phm phm ON sqm.sqm_id = phm.sqm_id AND phm.soft_delete_flag = false
                WHERE sqm.sqm_id = ?::uuid
                  AND sqm.soft_delete_flag = false
                GROUP BY sqm.sqm_id, sts.sts_name, sts.sts_color, plm.plm_name
            """, [sequenceId])
            
            return rows.isEmpty() ? null : rows[0]
        }
    }
    
    Map createMasterSequence(Map sequenceData) {
        DatabaseUtil.withSql { sql ->
            // Get next order number for the plan
            def maxOrder = sql.firstRow("""
                SELECT COALESCE(MAX(sqm_order), 0) as max_order
                FROM sequences_master_sqm
                WHERE plm_id = ?::uuid AND soft_delete_flag = false
            """, [sequenceData.plm_id])?.max_order ?: 0
            
            def newOrder = maxOrder + 1
            
            def insertedRows = sql.executeInsert("""
                INSERT INTO sequences_master_sqm (
                    plm_id, sqm_name, sqm_description, sqm_order, 
                    sqm_estimated_duration_minutes, sts_id
                ) VALUES (
                    ?::uuid, ?, ?, ?, ?, ?
                )
            """, [
                sequenceData.plm_id,
                sequenceData.sqm_name,
                sequenceData.sqm_description,
                newOrder,
                sequenceData.sqm_estimated_duration_minutes ?: 0,
                sequenceData.sts_id ?: 1 // Default to Active status
            ])
            
            def newSequenceId = insertedRows[0][0]
            return findMasterSequenceById(newSequenceId.toString())
        }
    }
    
    Map updateMasterSequence(String sequenceId, Map updates) {
        DatabaseUtil.withSql { sql ->
            def setClause = []
            def params = []
            
            if (updates.sqm_name) {
                setClause << "sqm_name = ?"
                params << updates.sqm_name
            }
            if (updates.sqm_description != null) {
                setClause << "sqm_description = ?"
                params << updates.sqm_description
            }
            if (updates.sqm_estimated_duration_minutes != null) {
                setClause << "sqm_estimated_duration_minutes = ?"
                params << (updates.sqm_estimated_duration_minutes as Integer)
            }
            if (updates.sts_id) {
                setClause << "sts_id = ?"
                params << (updates.sts_id as Integer)
            }
            
            if (setClause) {
                params << sequenceId
                
                sql.executeUpdate("""
                    UPDATE sequences_master_sqm
                    SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
                    WHERE sqm_id = ?::uuid
                """, params)
            }
            
            return findMasterSequenceById(sequenceId)
        }
    }
    
    Map reorderMasterSequences(Map reorderData) {
        DatabaseUtil.withSql { sql ->
            def planId = reorderData.planId
            def sequenceOrders = reorderData.sequences // List of [id, order] pairs
            
            sql.withTransaction {
                sequenceOrders.each { sequenceOrder ->
                    sql.executeUpdate("""
                        UPDATE sequences_master_sqm
                        SET sqm_order = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE sqm_id = ?::uuid AND plm_id = ?::uuid
                    """, [
                        sequenceOrder.order as Integer,
                        sequenceOrder.id,
                        planId
                    ])
                }
            }
            
            return [
                success: true,
                message: "Sequences reordered successfully",
                updated_sequences: sequenceOrders.size()
            ]
        }
    }
    
    Map deleteMasterSequence(String sequenceId) {
        DatabaseUtil.withSql { sql ->
            sql.executeUpdate("""
                UPDATE sequences_master_sqm
                SET soft_delete_flag = true, updated_at = CURRENT_TIMESTAMP
                WHERE sqm_id = ?::uuid
            """, [sequenceId])
            
            return [success: true, message: "Master sequence deleted successfully"]
        }
    }
    
    // Instance Sequence Operations
    
    List<Map> findSequenceInstancesWithFilters(Map filters) {
        DatabaseUtil.withSql { sql ->
            def whereClause = ["sqi.soft_delete_flag = false"]
            def params = []
            
            if (filters.planInstanceId) {
                whereClause << "sqi.pli_id = ?::uuid"
                params << filters.planInstanceId.toString()
            }
            if (filters.migrationId) {
                whereClause << "pli.mig_id = ?::uuid"
                params << filters.migrationId.toString()
            }
            if (filters.iterationId) {
                whereClause << "pli.ite_id = ?::uuid"
                params << filters.iterationId.toString()
            }
            
            return sql.rows("""
                SELECT sqi.*, sts.sts_name, sts.sts_color,
                       sqm.sqm_name as master_name, sqm.sqm_description as master_description,
                       pli.pli_name as plan_instance_name,
                       COUNT(phi.phi_id) as total_phases,
                       COUNT(CASE WHEN sts_phi.sts_name = 'Completed' THEN 1 END) as completed_phases,
                       CASE 
                           WHEN COUNT(phi.phi_id) > 0 
                           THEN ROUND(COUNT(CASE WHEN sts_phi.sts_name = 'Completed' THEN 1 END) * 100.0 / COUNT(phi.phi_id), 1)
                           ELSE 0 
                       END as progress_percentage
                FROM sequences_instance_sqi sqi
                JOIN status_sts sts ON sqi.sts_id = sts.sts_id
                JOIN sequences_master_sqm sqm ON sqi.sqm_id = sqm.sqm_id
                JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                LEFT JOIN phases_instance_phi phi ON sqi.sqi_id = phi.sqi_id AND phi.soft_delete_flag = false
                LEFT JOIN status_sts sts_phi ON phi.sts_id = sts_phi.sts_id
                WHERE ${whereClause.join(' AND ')}
                GROUP BY sqi.sqi_id, sts.sts_name, sts.sts_color, sqm.sqm_name, sqm.sqm_description, pli.pli_name
                ORDER BY sqi.sqi_order ASC, sqi.created_at DESC
            """, params)
        }
    }
    
    Map findSequenceInstanceById(String instanceId) {
        DatabaseUtil.withSql { sql ->
            def rows = sql.rows("""
                SELECT sqi.*, sts.sts_name, sts.sts_color,
                       sqm.sqm_name as master_name, sqm.sqm_description as master_description,
                       pli.pli_name as plan_instance_name,
                       COUNT(phi.phi_id) as total_phases,
                       COUNT(CASE WHEN sts_phi.sts_name = 'Completed' THEN 1 END) as completed_phases
                FROM sequences_instance_sqi sqi
                JOIN status_sts sts ON sqi.sts_id = sts.sts_id
                JOIN sequences_master_sqm sqm ON sqi.sqm_id = sqm.sqm_id
                JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                LEFT JOIN phases_instance_phi phi ON sqi.sqi_id = phi.sqi_id AND phi.soft_delete_flag = false
                LEFT JOIN status_sts sts_phi ON phi.sts_id = sts_phi.sts_id
                WHERE sqi.sqi_id = ?::uuid AND sqi.soft_delete_flag = false
                GROUP BY sqi.sqi_id, sts.sts_name, sts.sts_color, sqm.sqm_name, sqm.sqm_description, pli.pli_name
            """, [instanceId])
            
            return rows.isEmpty() ? null : rows[0]
        }
    }
    
    Map createSequenceInstance(Map instanceData) {
        DatabaseUtil.withSql { sql ->
            // Get master sequence for default values
            def masterSequence = findMasterSequenceById(instanceData.sqm_id as String)
            if (!masterSequence) {
                throw new IllegalArgumentException("Master sequence not found")
            }
            
            // Get next order number for the plan instance
            def maxOrder = sql.firstRow("""
                SELECT COALESCE(MAX(sqi_order), 0) as max_order
                FROM sequences_instance_sqi
                WHERE pli_id = ?::uuid AND soft_delete_flag = false
            """, [instanceData.pli_id])?.max_order ?: 0
            
            def newOrder = maxOrder + 1
            
            def insertedRows = sql.executeInsert("""
                INSERT INTO sequences_instance_sqi (
                    sqm_id, pli_id, sqi_name, sqi_description, sqi_order,
                    sqi_estimated_duration_minutes, sts_id
                ) VALUES (
                    ?::uuid, ?::uuid, ?, ?, ?, ?, ?
                )
            """, [
                instanceData.sqm_id,
                instanceData.pli_id,
                instanceData.sqi_name ?: masterSequence.sqm_name,
                instanceData.sqi_description ?: masterSequence.sqm_description,
                instanceData.sqi_order ?: newOrder,
                instanceData.sqi_estimated_duration_minutes ?: masterSequence.sqm_estimated_duration_minutes,
                instanceData.sts_id ?: 1 // Default to Active status
            ])
            
            def newInstanceId = insertedRows[0][0]
            return findSequenceInstanceById(newInstanceId.toString())
        }
    }
    
    Map updateSequenceInstance(String instanceId, Map updates) {
        DatabaseUtil.withSql { sql ->
            def setClause = []
            def params = []
            
            if (updates.sqi_name) {
                setClause << "sqi_name = ?"
                params << updates.sqi_name
            }
            if (updates.sqi_description != null) {
                setClause << "sqi_description = ?"
                params << updates.sqi_description
            }
            if (updates.sqi_order != null) {
                setClause << "sqi_order = ?"
                params << (updates.sqi_order as Integer)
            }
            if (updates.sqi_estimated_duration_minutes != null) {
                setClause << "sqi_estimated_duration_minutes = ?"
                params << (updates.sqi_estimated_duration_minutes as Integer)
            }
            if (updates.sts_id) {
                setClause << "sts_id = ?"
                params << (updates.sts_id as Integer)
            }
            
            if (setClause) {
                params << instanceId
                
                sql.executeUpdate("""
                    UPDATE sequences_instance_sqi
                    SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
                    WHERE sqi_id = ?::uuid
                """, params)
            }
            
            return findSequenceInstanceById(instanceId)
        }
    }
    
    Map updateSequenceInstanceStatus(String instanceId, Integer statusId) {
        DatabaseUtil.withSql { sql ->
            sql.executeUpdate("""
                UPDATE sequences_instance_sqi
                SET sts_id = ?, updated_at = CURRENT_TIMESTAMP
                WHERE sqi_id = ?::uuid
            """, [statusId, instanceId])
            
            return findSequenceInstanceById(instanceId)
        }
    }
    
    Map deleteSequenceInstance(String instanceId) {
        DatabaseUtil.withSql { sql ->
            sql.executeUpdate("""
                UPDATE sequences_instance_sqi
                SET soft_delete_flag = true, updated_at = CURRENT_TIMESTAMP
                WHERE sqi_id = ?::uuid
            """, [instanceId])
            
            return [success: true, message: "Sequence instance deleted successfully"]
        }
    }
}
```

## Database Schema Requirements

The sequences tables should already exist, but key fields for ordering:

```sql
-- sequences_master_sqm table
-- sqm_order INTEGER NOT NULL  -- Critical for ordering functionality

-- sequences_instance_sqi table  
-- sqi_order INTEGER NOT NULL  -- Allows instance-level reordering
```

## Testing Strategy

### 1. Integration Tests

```groovy
// SequencesApiIntegrationTest.groovy
class SequencesApiIntegrationTest {
    
    void testMasterSequenceCreation() {
        // Test creating master sequence with automatic ordering
    }
    
    void testBulkReordering() {
        // Test PUT /sequences/reorder with multiple sequences
    }
    
    void testInstanceCreationFromMaster() {
        // Test creating instance that inherits master properties
    }
    
    void testHierarchicalFiltering() {
        // Test filtering by planId, planInstanceId, etc.
    }
    
    void testProgressCalculations() {
        // Test progress roll-up from phases
    }
}
```

### 2. Unit Tests for Repository

```groovy
void testReorderMasterSequences() {
    // Test bulk reordering logic with transaction handling
}

void testProgressAggregation() {
    // Test phase completion percentage calculations
}
```

## OpenAPI Specification Updates

Add to `/docs/api/openapi.yaml`:

- 12 new endpoints for sequences operations
- SequenceMaster and SequenceInstance schemas
- BulkReorderRequest schema
- Progress aggregation response schemas

## Dependencies & Prerequisites

- [x] US-001 completed (Plans API pattern established)
- [x] Database sequences tables exist
- [x] ScriptRunner connection pool configured
- [x] DatabaseUtil patterns proven

## Success Criteria

1. **API Completeness**: All 12 endpoints operational following PlansApi pattern
2. **Ordering Functionality**: Bulk reordering works reliably with transaction safety
3. **Progress Calculations**: Accurate roll-up from phases with proper percentage calculations
4. **Type Safety**: ADR-031 compliance with explicit casting throughout
5. **Error Handling**: Comprehensive error responses with appropriate HTTP status codes
6. **Test Coverage**: ≥90% coverage with integration tests for all endpoints
7. **Documentation**: OpenAPI spec updated with all new endpoints and schemas

## Implementation Notes

- **Follow PlansApi Pattern**: Copy exact structure and adapt for sequences
- **Lazy Repository Loading**: Use same ScriptRunner class loading pattern as PlansApi
- **Transaction Safety**: Use `sql.withTransaction` for bulk reordering operations
- **Progress Calculations**: Implement efficient aggregation queries with LEFT JOINs
- **Order Management**: Handle both master and instance ordering with proper defaults

## Estimated Timeline

- **Hour 1**: SequencesApi.groovy basic structure (copy from PlansApi)
- **Hour 2**: SequenceRepository.groovy with ordering logic
- **Hour 3**: Integration tests and bulk reordering functionality
- **Hour 4**: OpenAPI updates, testing, and documentation

---

**Ready to implement following the proven US-001 patterns!**