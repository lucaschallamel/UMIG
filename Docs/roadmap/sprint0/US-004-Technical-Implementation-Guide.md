# US-004 Instructions API - Technical Implementation Guide

**Document Type**: Technical Reference  
**Audience**: Developers, DevOps, Technical Leads  
**Status**: ✅ COMPLETE  
**Last Updated**: August 5, 2025  

---

## 1. Architecture Overview

### 1.1 System Integration
The Instructions API completes UMIG's hierarchical migration management architecture as the leaf-level entity in the following structure:

```
Migration (mig)
└── Iteration (ite)
    └── Plan Instance (pli)
        └── Sequence Instance (sqi)
            └── Phase Instance (phi)
                └── Step Instance (sti)
                    └── Instruction Instance (ini) ← This API
```

### 1.2 Design Patterns Used
- **Canonical Master/Instance Pattern**: Template definitions with runtime instances
- **Consolidated Endpoint Pattern**: Single entry point per HTTP method with path routing
- **Repository Pattern**: Data access layer abstraction with transaction management
- **Type Safety Pattern**: Explicit casting per ADR-031
- **Hierarchical Filtering Pattern**: CTE-based multi-level filtering

### 1.3 Technology Stack
- **Backend**: Groovy + ScriptRunner for Confluence
- **Database**: PostgreSQL 12+ with existing schema
- **API Design**: RESTful with OpenAPI 3.0 specification
- **Testing**: Spock (Groovy) + Jest (Node.js)
- **Documentation**: Confluence + OpenAPI + Postman

---

## 2. Database Schema Implementation

### 2.1 Production Schema Status
**✅ ZERO SCHEMA CHANGES REQUIRED** - Uses existing production tables from `001_unified_baseline.sql`

### 2.2 Table Structures

#### Master Instructions (`instructions_master_inm`)
```sql
-- Template definitions for reusable instructions
CREATE TABLE instructions_master_inm (
    inm_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stm_id UUID NOT NULL,                  -- Parent step (required)
    tms_id INTEGER,                        -- Team assignment (optional) 
    ctm_id UUID,                          -- Control point (optional)
    inm_order INTEGER NOT NULL,           -- Execution order within step
    inm_body TEXT,                        -- Instruction content
    inm_duration_minutes INTEGER          -- Time estimate
);

-- Foreign key constraints
CONSTRAINT fk_inm_stm_stm_id FOREIGN KEY (stm_id) REFERENCES steps_master_stm(stm_id),
CONSTRAINT fk_inm_tms_tms_id FOREIGN KEY (tms_id) REFERENCES teams_tms(tms_id),
CONSTRAINT fk_inm_ctm_ctm_id FOREIGN KEY (ctm_id) REFERENCES controls_master_ctm(ctm_id)
```

#### Instance Instructions (`instructions_instance_ini`)
```sql
-- Runtime instances with completion tracking
CREATE TABLE instructions_instance_ini (
    ini_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sti_id UUID NOT NULL,                 -- Parent step instance (required)
    inm_id UUID NOT NULL,                 -- Master template (required)
    ini_is_completed BOOLEAN DEFAULT FALSE, -- Simple completion flag
    ini_completed_at TIMESTAMPTZ,         -- Completion timestamp
    usr_id_completed_by INTEGER           -- Completing user
);

-- Foreign key constraints
CONSTRAINT fk_ini_sti_sti_id FOREIGN KEY (sti_id) REFERENCES steps_instance_sti(sti_id),
CONSTRAINT fk_ini_inm_inm_id FOREIGN KEY (inm_id) REFERENCES instructions_master_inm(inm_id),
CONSTRAINT fk_ini_usr_usr_id_completed_by FOREIGN KEY (usr_id_completed_by) REFERENCES users_usr(usr_id)
```

### 2.3 Performance Indexes
```sql
-- Essential indexes for query performance
CREATE INDEX idx_inm_stm_id_order ON instructions_master_inm(stm_id, inm_order);
CREATE INDEX idx_ini_sti_id ON instructions_instance_ini(sti_id);
CREATE INDEX idx_ini_completion ON instructions_instance_ini(ini_is_completed, ini_completed_at);
CREATE INDEX idx_inm_tms_id ON instructions_master_inm(tms_id) WHERE tms_id IS NOT NULL;
```

---

## 3. API Implementation Details

### 3.1 Consolidated Endpoint Structure

**Base Path**: `/rest/scriptrunner/latest/custom/instructions`

```groovy
@BaseScript CustomEndpointDelegate delegate

final InstructionRepository instructionRepository = new InstructionRepository()

// Single GET endpoint with path-based routing
instructions(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    def pathInfo = request.pathInfo
    def queryParams = request.parameterMap
    
    try {
        if (pathInfo.startsWith("/master/")) {
            return handleMasterInstructionGet(pathInfo, queryParams)
        } else if (pathInfo.startsWith("/instance/filtered")) {
            return handleHierarchicalFilteredGet(queryParams)
        } else if (pathInfo.startsWith("/instance/")) {
            return handleInstanceInstructionGet(pathInfo, queryParams)
        } else if (pathInfo.equals("/statistics")) {
            return handleStatisticsGet(queryParams)
        }
        
        return Response.status(404).entity([error: "Endpoint not found"]).build()
        
    } catch (Exception e) {
        return handleError(e, request)
    }
}
```

### 3.2 Key Implementation Patterns

#### Type Safety (ADR-031)
```groovy
// Explicit casting for all parameters to prevent runtime errors
def parseRequestParameters(parameterMap) {
    def params = [:]
    
    if (parameterMap.stepId) {
        params.stepId = UUID.fromString(parameterMap.stepId[0] as String)
    }
    if (parameterMap.teamId) {
        params.teamId = Integer.parseInt(parameterMap.teamId[0] as String)
    }
    if (parameterMap.isCompleted) {
        params.isCompleted = Boolean.parseBoolean(parameterMap.isCompleted[0] as String)
    }
    
    return params
}
```

#### Error Handling with SQL State Mapping
```groovy
def handleError(Exception e, HttpServletRequest request) {
    if (e instanceof SQLException) {
        switch (e.sqlState) {
            case '23503': // Foreign key violation
                return Response.status(400)
                    .entity([error: "Invalid reference", detail: e.message])
                    .build()
            case '23505': // Unique violation
                return Response.status(409)
                    .entity([error: "Duplicate entry", detail: e.message])
                    .build()
            default:
                return Response.status(500)
                    .entity([error: "Database error"])
                    .build()
        }
    }
    
    return Response.status(500)
        .entity([error: "Internal server error"])
        .build()
}
```

#### Hierarchical Filtering Implementation
```groovy
def findInstructionsWithHierarchicalFiltering(Map filters) {
    def whereConditions = []
    def parameters = []
    
    // Build hierarchical filter conditions
    if (filters.migrationId) {
        whereConditions << "mig.mig_id = ?"
        parameters << filters.migrationId
    }
    if (filters.iterationId) {
        whereConditions << "ite.ite_id = ?"
        parameters << filters.iterationId
    }
    if (filters.planInstanceId) {
        whereConditions << "pli.pli_id = ?"
        parameters << filters.planInstanceId
    }
    if (filters.sequenceInstanceId) {
        whereConditions << "sqi.sqi_id = ?"
        parameters << filters.sequenceInstanceId
    }
    if (filters.phaseInstanceId) {
        whereConditions << "phi.phi_id = ?"
        parameters << filters.phaseInstanceId
    }
    if (filters.stepInstanceId) {
        whereConditions << "sti.sti_id = ?"
        parameters << filters.stepInstanceId
    }
    if (filters.teamId) {
        whereConditions << "inm.tms_id = ?"
        parameters << filters.teamId
    }
    if (filters.isCompleted != null) {
        whereConditions << "ini.ini_is_completed = ?"
        parameters << filters.isCompleted
    }
    
    def whereClause = whereConditions ? "WHERE " + whereConditions.join(" AND ") : ""
    
    return DatabaseUtil.withSql { sql ->
        sql.rows("""
            WITH RECURSIVE hierarchy AS (
                SELECT 
                    ini.ini_id,
                    ini.sti_id,
                    ini.inm_id,
                    ini.ini_is_completed,
                    ini.ini_completed_at,
                    ini.usr_id_completed_by,
                    inm.inm_order,
                    inm.inm_body,
                    inm.inm_duration_minutes,
                    inm.tms_id,
                    inm.ctm_id,
                    sti.sti_name,
                    phi.phi_name,
                    sqi.sqi_name,
                    pli.pli_name,
                    ite.ite_name,
                    mig.mig_name
                FROM instructions_instance_ini ini
                JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
                JOIN steps_instance_sti sti ON ini.sti_id = sti.sti_id
                JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                JOIN migrations_mig mig ON ite.mig_id = mig.mig_id
                ${whereClause}
            )
            SELECT * FROM hierarchy
            ORDER BY inm_order
        """, parameters)
    }
}
```

---

## 4. Repository Pattern Implementation

### 4.1 Repository Structure
```groovy
package umig.repository

class InstructionRepository {
    
    // Core CRUD operations
    def findAllMasterInstructions(Map filters = [:]) { /* implementation */ }
    def findMasterInstructionById(UUID inmId) { /* implementation */ }
    def createMasterInstruction(Map params) { /* implementation */ }
    def updateMasterInstruction(UUID inmId, Map updates) { /* implementation */ }
    def deleteMasterInstruction(UUID inmId) { /* implementation */ }
    
    // Instance operations
    def findInstructionInstances(Map filters) { /* implementation */ }
    def findInstructionInstanceById(UUID iniId) { /* implementation */ }
    def createInstructionInstance(Map params) { /* implementation */ }
    def updateInstructionInstance(UUID iniId, Map updates) { /* implementation */ }
    def deleteInstructionInstance(UUID iniId) { /* implementation */ }
    
    // Advanced operations
    def bulkCreateInstances(UUID stepInstanceId, List<UUID> masterIds) { /* implementation */ }
    def bulkCompleteInstructions(List<UUID> instanceIds, Integer userId) { /* implementation */ }
    def reorderInstructions(UUID stepId, List<UUID> orderedIds, boolean isMaster) { /* implementation */ }
    def getInstructionStatistics(UUID stepInstanceId, Map options = [:]) { /* implementation */ }
}
```

### 4.2 Transaction Management Pattern
```groovy
def bulkCompleteInstructions(List<UUID> instanceIds, Integer userId) {
    return DatabaseUtil.withSql { sql ->
        sql.withTransaction { conn ->
            def results = []
            instanceIds.each { instanceId ->
                def rowsUpdated = sql.executeUpdate("""
                    UPDATE instructions_instance_ini 
                    SET ini_is_completed = true,
                        ini_completed_at = NOW(),
                        usr_id_completed_by = ?
                    WHERE ini_id = ? AND ini_is_completed = false
                """, [userId, instanceId])
                
                if (rowsUpdated > 0) {
                    results << [ini_id: instanceId, status: 'completed']
                } else {
                    results << [ini_id: instanceId, status: 'already_completed']
                }
            }
            return results
        }
    }
}
```

### 4.3 SQL Query Patterns
```groovy
// Pattern 1: Basic instruction retrieval with enriched data
def findInstructionsForStepInstance(UUID stepInstanceId) {
    return DatabaseUtil.withSql { sql ->
        sql.rows("""
            SELECT 
                ini.ini_id,
                ini.ini_is_completed,
                ini.ini_completed_at,
                inm.inm_id,
                inm.inm_order,
                inm.inm_body,
                inm.inm_duration_minutes,
                tms.tms_name,
                ctm.ctm_name,
                usr.usr_display_name as completed_by_name
            FROM instructions_instance_ini ini
            JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
            LEFT JOIN teams_tms tms ON inm.tms_id = tms.tms_id
            LEFT JOIN controls_master_ctm ctm ON inm.ctm_id = ctm.ctm_id
            LEFT JOIN users_usr usr ON ini.usr_id_completed_by = usr.usr_id
            WHERE ini.sti_id = ?
            ORDER BY inm.inm_order
        """, [stepInstanceId])
    }
}

// Pattern 2: Statistics and aggregation
def getCompletionStatistics(UUID stepInstanceId) {
    return DatabaseUtil.withSql { sql ->
        sql.firstRow("""
            SELECT 
                COUNT(*) as total_instructions,
                COUNT(CASE WHEN ini_is_completed THEN 1 END) as completed_instructions,
                ROUND(
                    COUNT(CASE WHEN ini_is_completed THEN 1 END) * 100.0 / COUNT(*), 
                    2
                ) as completion_percentage,
                SUM(inm.inm_duration_minutes) as total_estimated_minutes,
                AVG(CASE 
                    WHEN ini_is_completed THEN 
                        EXTRACT(EPOCH FROM (ini_completed_at - ini.created_at))/60 
                    END
                ) as avg_completion_minutes
            FROM instructions_instance_ini ini
            JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
            WHERE ini.sti_id = ?
        """, [stepInstanceId])
    }
}
```

---

## 5. Testing Implementation

### 5.1 Unit Testing with SQL Mocking (ADR-026)
```groovy
// Spock test specification for repository
@TestFor(InstructionRepository)
class InstructionRepositorySpec extends Specification {
    
    def mockSql = Mock(Sql)
    def repository = new InstructionRepository()
    
    def setup() {
        repository.metaClass.getDatabaseUtil = { -> 
            [withSql: { closure -> closure.call(mockSql) }]
        }
    }
    
    def "findMasterInstructionsByStepId returns ordered instructions"() {
        given: "A step ID and expected SQL pattern"
        def stepId = UUID.randomUUID()
        def expectedQuery = ~/SELECT.*FROM instructions_master_inm.*WHERE.*stm_id.*ORDER BY inm_order/
        
        when: "Finding instructions by step"
        def result = repository.findMasterInstructionsByStepId(stepId)
        
        then: "SQL is called with correct pattern and parameters"
        1 * mockSql.rows({ it =~ expectedQuery }, [stmId: stepId]) >> [
            [inm_id: UUID.randomUUID(), inm_order: 1, inm_body: "First instruction"],
            [inm_id: UUID.randomUUID(), inm_order: 2, inm_body: "Second instruction"]
        ]
        
        and: "Results are properly ordered"
        result.size() == 2
        result[0].inm_order == 1
        result[1].inm_order == 2
    }
    
    def "bulkCompleteInstructions uses transaction for atomicity"() {
        given: "Multiple instruction IDs and user"
        def instructionIds = [UUID.randomUUID(), UUID.randomUUID()]
        def userId = 123
        
        when: "Bulk completing instructions"
        repository.bulkCompleteInstructions(instructionIds, userId)
        
        then: "Transaction is used for atomicity"
        1 * mockSql.withTransaction(_) >> { Closure closure ->
            closure.call()
        }
        
        and: "Update is called for each instruction"
        instructionIds.size() * mockSql.executeUpdate(
            { it.contains("UPDATE instructions_instance_ini") },
            _
        ) >> 1
    }
}
```

### 5.2 Integration Testing
```groovy
// Full integration test with real database
class InstructionsApiIntegrationTest extends BaseApiTest {
    
    def "complete instruction workflow end-to-end"() {
        given: "A step instance with master instructions"
        def stepInstanceId = createTestStepInstance()
        def masterInstructionId = createTestMasterInstruction(stepInstanceId)
        
        when: "Creating instruction instance"
        def createResponse = post("/instructions/instance", [
            inm_id: masterInstructionId,
            sti_id: stepInstanceId
        ])
        
        then: "Instance created successfully"
        createResponse.status == 201
        def instanceId = createResponse.json.ini_id
        
        when: "Completing the instruction"
        def completeResponse = put("/instructions/instance/${instanceId}/complete", [
            completed_by: "test.user"
        ])
        
        then: "Completion recorded with audit trail"
        completeResponse.status == 200
        completeResponse.json.ini_is_completed == true
        completeResponse.json.ini_completed_at != null
        
        and: "Database reflects completion"
        def dbRecord = sql.firstRow("""
            SELECT * FROM instructions_instance_ini WHERE ini_id = ?
        """, [UUID.fromString(instanceId)])
        dbRecord.ini_is_completed == true
        dbRecord.usr_id_completed_by != null
    }
}
```

### 5.3 Performance Testing
```javascript
// Jest performance test with load generation
describe('Instructions API Performance', () => {
    test('handles 50 concurrent instruction completions within SLA', async () => {
        // Setup test data
        const instructions = await createBulkInstructions(100);
        
        // Create concurrent completion requests
        const completionPromises = instructions.slice(0, 50).map(instruction => 
            completeInstruction(instruction.id, `user${Math.floor(Math.random() * 10)}`)
        );
        
        // Execute and measure
        const startTime = Date.now();
        const results = await Promise.all(completionPromises);
        const duration = Date.now() - startTime;
        
        // Verify performance
        expect(duration).toBeLessThan(5000); // 5 second max
        expect(results.every(r => r.status === 200)).toBe(true);
        
        // Verify average response time
        const avgResponseTime = duration / results.length;
        expect(avgResponseTime).toBeLessThan(200); // 200ms SLA
    });
});
```

---

## 6. Deployment and Operations

### 6.1 Deployment Process
```bash
# 1. Backup database (precautionary)
pg_dump umig_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Deploy ScriptRunner scripts
# Copy files to Confluence ScriptRunner console:
# - InstructionRepository.groovy → Repository
# - InstructionsApi.groovy → REST Endpoints

# 3. Create recommended indexes (optional optimization)
psql umig_prod << EOF
CREATE INDEX CONCURRENTLY idx_inm_stm_id_order ON instructions_master_inm(stm_id, inm_order);
CREATE INDEX CONCURRENTLY idx_ini_sti_id ON instructions_instance_ini(sti_id);
CREATE INDEX CONCURRENTLY idx_ini_completion ON instructions_instance_ini(ini_is_completed, ini_completed_at);
EOF

# 4. Verify deployment
curl -u admin:password http://localhost:8090/rest/scriptrunner/latest/custom/instructions/master

# 5. Run smoke tests
npm run test:smoke-instructions
```

### 6.2 Monitoring Configuration
```yaml
# Application Insights configuration
performance_counters:
  - name: "instructions_api_response_time"
    metric: "customMetrics/InstructionsAPI/ResponseTime"
    threshold: 200ms
    
  - name: "instructions_completion_rate" 
    metric: "customMetrics/InstructionsAPI/CompletionRate"
    aggregation: "count_per_minute"
    
alerts:
  - name: "Instructions API High Response Time"
    condition: "avg(instructions_api_response_time) > 500"
    severity: "warning"
    
  - name: "Instructions API Error Rate"
    condition: "error_rate > 5%"
    severity: "critical"
```

### 6.3 Health Checks
```groovy
// Health check endpoint
healthCheck(httpMethod: "GET") { request, binding ->
    try {
        // Test database connectivity
        DatabaseUtil.withSql { sql ->
            sql.firstRow("SELECT COUNT(*) as count FROM instructions_master_inm LIMIT 1")
        }
        
        // Test repository functionality
        def testRepo = new InstructionRepository()
        testRepo.findAllMasterInstructions([limit: 1])
        
        return Response.ok([
            status: "healthy",
            timestamp: new Date(),
            version: "2.0.0",
            database: "connected",
            repository: "functional"
        ]).build()
        
    } catch (Exception e) {
        return Response.status(503)
            .entity([
                status: "unhealthy", 
                error: e.message,
                timestamp: new Date()
            ])
            .build()
    }
}
```

---

## 7. Troubleshooting Guide

### 7.1 Common Issues and Solutions

#### Issue: Slow Response Times (>500ms)
**Symptoms**: API responses taking longer than expected
**Diagnosis**:
```sql
-- Check query performance
EXPLAIN ANALYZE
SELECT ini.*, inm.* 
FROM instructions_instance_ini ini
JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
WHERE ini.sti_id = 'some-uuid';

-- Check index usage
SELECT indexname, idx_scan, idx_tup_read 
FROM pg_stat_user_indexes 
WHERE tablename IN ('instructions_master_inm', 'instructions_instance_ini');
```
**Solutions**:
- Create missing indexes on frequently queried columns
- Optimize hierarchical filter queries with CTE tuning
- Increase database connection pool size

#### Issue: 409 Conflicts on Completion
**Symptoms**: Multiple completion attempts returning conflict errors  
**Diagnosis**: Check for race conditions in completion logic
**Solutions**:
```groovy
// Implement idempotent completion
def completeInstruction(UUID instanceId, Integer userId) {
    return DatabaseUtil.withSql { sql ->
        def rowsUpdated = sql.executeUpdate("""
            UPDATE instructions_instance_ini 
            SET ini_is_completed = CASE 
                WHEN ini_is_completed = false THEN true 
                ELSE ini_is_completed 
            END,
            ini_completed_at = CASE 
                WHEN ini_is_completed = false THEN NOW() 
                ELSE ini_completed_at 
            END,
            usr_id_completed_by = CASE 
                WHEN ini_is_completed = false THEN ? 
                ELSE usr_id_completed_by 
            END
            WHERE ini_id = ?
        """, [userId, instanceId])
        
        // Return success regardless of whether update occurred
        return [status: 'completed', updated: rowsUpdated > 0]
    }
}
```

#### Issue: Missing Instructions in Filtered Results
**Symptoms**: Expected instructions not appearing in hierarchical filtering
**Diagnosis**:
```sql
-- Verify data relationships
SELECT 
    inm.inm_id,
    inm.stm_id,
    ini.ini_id,
    ini.sti_id,
    sti.phi_id,
    phi.sqi_id
FROM instructions_master_inm inm
LEFT JOIN instructions_instance_ini ini ON inm.inm_id = ini.inm_id
LEFT JOIN steps_instance_sti sti ON ini.sti_id = sti.sti_id
LEFT JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
WHERE inm.inm_id = 'problematic-instruction-id';
```
**Solutions**:
- Verify foreign key relationships are intact
- Check that instruction instances were properly created
- Validate hierarchical filtering parameters

### 7.2 Performance Optimization

#### Database Query Optimization
```sql
-- Optimize hierarchical queries with materialized views
CREATE MATERIALIZED VIEW instruction_hierarchy_view AS
SELECT 
    ini.ini_id,
    ini.sti_id,
    ini.inm_id,
    ini.ini_is_completed,
    inm.inm_order,
    inm.tms_id,
    sti.phi_id,
    phi.sqi_id,
    sqi.pli_id,
    pli.ite_id,
    ite.mig_id
FROM instructions_instance_ini ini
JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
JOIN steps_instance_sti sti ON ini.sti_id = sti.sti_id
JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
JOIN iterations_ite ite ON pli.ite_id = ite.ite_id;

-- Create index on materialized view
CREATE INDEX idx_instruction_hierarchy_migration ON instruction_hierarchy_view(mig_id, ini_is_completed);

-- Refresh materialized view (schedule regularly)
REFRESH MATERIALIZED VIEW instruction_hierarchy_view;
```

#### Application-Level Caching
```groovy
// Simple in-memory cache for master instructions
class InstructionCache {
    private static final Map<String, Object> cache = [:]
    private static final long CACHE_TTL = 5 * 60 * 1000 // 5 minutes
    
    static def getMasterInstructions(UUID stepId) {
        def cacheKey = "master_instructions_${stepId}"
        def cached = cache[cacheKey]
        
        if (cached && (System.currentTimeMillis() - cached.timestamp) < CACHE_TTL) {
            return cached.data
        }
        
        // Fetch from database
        def data = new InstructionRepository().findMasterInstructionsByStepId(stepId)
        cache[cacheKey] = [data: data, timestamp: System.currentTimeMillis()]
        
        return data
    }
    
    static def invalidateCache(UUID stepId) {
        cache.remove("master_instructions_${stepId}")
    }
}
```

---

## 8. Security Implementation

### 8.1 Authentication and Authorization
```groovy
// Confluence user authentication with group-based authorization
instructions(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    def userContext = ComponentLocator.getComponent(UserManager)
        .getRemoteUser(request)
    
    if (!userContext) {
        return Response.status(401)
            .entity([error: "Authentication required"])
            .build()
    }
    
    // Additional team-based filtering can be applied here
    return handleInstructionRequest(request, userContext)
}

// Write operations with enhanced security
instructions(httpMethod: "POST", groups: ["confluence-users"]) { request, binding ->
    def userContext = ComponentLocator.getComponent(UserManager)
        .getRemoteUser(request)
    
    // Validate user permissions for instruction creation
    if (!hasInstructionCreatePermission(userContext, request.parameters)) {
        return Response.status(403)
            .entity([error: "Insufficient permissions"])
            .build()
    }
    
    return handleInstructionCreation(request, userContext)
}
```

### 8.2 Input Validation and Sanitization
```groovy
def validateInstructionInput(Map input) {
    def errors = []
    
    // UUID validation
    if (input.stm_id && !isValidUUID(input.stm_id)) {
        errors << "Invalid step ID format"
    }
    
    // Text content sanitization
    if (input.inm_body) {
        input.inm_body = sanitizeTextContent(input.inm_body)
        if (input.inm_body.length() > 4000) {
            errors << "Instruction body too long (max 4000 characters)"
        }
    }
    
    // Numeric validation
    if (input.inm_order && (input.inm_order < 1 || input.inm_order > 10000)) {
        errors << "Order must be between 1 and 10000"
    }
    
    if (input.inm_duration_minutes && (input.inm_duration_minutes < 0 || input.inm_duration_minutes > 1440)) {
        errors << "Duration must be between 0 and 1440 minutes"
    }
    
    return errors
}

def sanitizeTextContent(String content) {
    // Remove potential XSS vectors
    return content
        .replaceAll(/<script[^>]*>.*?<\/script>/gi, '')
        .replaceAll(/<[^>]*>/g, '') // Remove HTML tags
        .replaceAll(/javascript:/gi, '')
        .trim()
}
```

### 8.3 Audit Trail Implementation
```groovy
def recordInstructionCompletion(UUID instanceId, Integer userId, String userDisplayName) {
    // Log completion event for audit trail
    def auditEvent = [
        event_type: 'INSTRUCTION_COMPLETED',
        timestamp: new Date(),
        user_id: userId,
        user_display_name: userDisplayName,
        resource_type: 'instruction_instance',
        resource_id: instanceId.toString(),
        details: [
            action: 'complete',
            ip_address: getClientIpAddress(),
            user_agent: getUserAgent()
        ]
    ]
    
    // Store in audit log table or external system
    auditLogger.log(auditEvent)
    
    // Update instruction with completion data
    DatabaseUtil.withSql { sql ->
        sql.executeUpdate("""
            UPDATE instructions_instance_ini 
            SET ini_is_completed = true,
                ini_completed_at = NOW(),
                usr_id_completed_by = ?
            WHERE ini_id = ?
        """, [userId, instanceId])
    }
    
    return auditEvent
}
```

---

## 9. API Documentation

### 9.1 OpenAPI Specification (Key Sections)
```yaml
openapi: 3.0.0
info:
  title: UMIG Instructions API
  version: 2.0.0
  description: |
    REST API for managing Instructions in the UMIG migration management system.
    Supports master/instance pattern with simplified completion tracking.

paths:
  /instructions/master:
    get:
      summary: List master instructions
      parameters:
        - name: stepId
          in: query
          required: true
          schema:
            type: string
            format: uuid
          description: Parent step ID to filter instructions
      responses:
        200:
          description: List of master instructions
          content:
            application/json:
              schema:
                type: object
                properties:
                  instructions:
                    type: array
                    items:
                      $ref: '#/components/schemas/MasterInstruction'
                  total:
                    type: integer

  /instructions/instance/{ini_id}/complete:
    put:
      summary: Complete instruction instance
      parameters:
        - name: ini_id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                completed_by:
                  type: string
                  description: User identifier completing the instruction
      responses:
        200:
          description: Instruction completed successfully
        409:
          description: Instruction already completed
        404:
          description: Instruction not found

components:
  schemas:
    MasterInstruction:
      type: object
      properties:
        inm_id:
          type: string
          format: uuid
        stm_id:
          type: string
          format: uuid
        inm_order:
          type: integer
        inm_body:
          type: string
        inm_duration_minutes:
          type: integer
        tms_id:
          type: integer
          nullable: true
        tms_name:
          type: string
          nullable: true
```

### 9.2 Client SDK Example
```javascript
// JavaScript client for Instructions API
class InstructionsClient {
    constructor(baseUrl, authToken) {
        this.baseUrl = baseUrl;
        this.headers = {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        };
    }
    
    async getMasterInstructions(stepId) {
        const response = await fetch(
            `${this.baseUrl}/instructions/master?stepId=${stepId}`,
            { headers: this.headers }
        );
        
        if (!response.ok) {
            throw new Error(`Failed to fetch instructions: ${response.statusText}`);
        }
        
        return response.json();
    }
    
    async completeInstruction(instructionId, userId) {
        const response = await fetch(
            `${this.baseUrl}/instructions/instance/${instructionId}/complete`,
            {
                method: 'PUT',
                headers: this.headers,
                body: JSON.stringify({ completed_by: userId })
            }
        );
        
        if (!response.ok) {
            if (response.status === 409) {
                return { status: 'already_completed' };
            }
            throw new Error(`Failed to complete instruction: ${response.statusText}`);
        }
        
        return response.json();
    }
    
    async getFilteredInstructions(filters) {
        const queryParams = new URLSearchParams(filters);
        const response = await fetch(
            `${this.baseUrl}/instructions/instance/filtered?${queryParams}`,
            { headers: this.headers }
        );
        
        return response.json();
    }
}

// Usage example
const client = new InstructionsClient('http://localhost:8090/rest/scriptrunner/v2', 'auth-token');

// Get instructions for a step
const instructions = await client.getMasterInstructions('step-uuid');

// Complete an instruction
const result = await client.completeInstruction('instruction-uuid', 'user123');
```

---

## 10. Future Enhancement Considerations

### 10.1 Potential Improvements
- **Rich Text Support**: Markdown or HTML content for instruction bodies
- **File Attachments**: Document attachments linked to instructions
- **Advanced Time Tracking**: Start/pause/resume functionality
- **Mobile API Optimizations**: Lightweight endpoints for mobile apps
- **GraphQL Endpoint**: Single endpoint for complex queries

### 10.2 Scalability Enhancements
- **Database Partitioning**: Partition by migration for large enterprises
- **Read Replicas**: Separate read/write workloads
- **Caching Layer**: Redis integration for high-frequency data
- **Async Processing**: Background jobs for bulk operations

### 10.3 Integration Opportunities  
- **Webhook Support**: Real-time notifications for external systems
- **SAML/OAuth Integration**: Enhanced authentication options
- **Metrics Export**: Prometheus/Grafana integration
- **Machine Learning**: Predictive analytics for completion times

---

**Document Status**: ✅ COMPLETE - Technical Implementation Guide  
**Usage**: Reference for development, deployment, and maintenance  
**Maintenance**: Update when implementation patterns change  

---

*This technical implementation guide provides comprehensive coverage of the Instructions API architecture, implementation patterns, and operational procedures for the UMIG development team.*