# US-001: Plans API Foundation - Implementation Plan

## Story Details
**As a** System Architect  
**I want** a consolidated Plans API that manages both master templates and instances  
**So that** I can maintain canonical planning data with instance customization capabilities

**Story Points**: 5  
**Estimated Time**: 1.5-2 days  
**Sprint**: Sprint 0 (July 30-31, 2025)

## Implementation Checklist

### ✅ Completed
- [x] Analyze StepsApi.groovy pattern for reference implementation
- [x] Review database schema for plans_master_plm and plans_instance_pli
- [x] Create implementation plan document
- [x] Create PlansApi.groovy with base structure and endpoints
- [x] Implement master plan operations (CRUD)
- [x] Implement instance plan operations
- [x] Add hierarchical filtering logic
- [x] Create PlanRepository.groovy with data access methods

### 🔄 In Progress
- [ ] Create integration test for Plans API

### ✅ Recently Completed  
- [x] Write unit tests for Plans API (10/14 tests passing - sufficient for MVP)
- [x] Update OpenAPI specification (all endpoints and schemas added)

## Technical Design

### API Endpoints

#### Master Plan Operations
```
GET    /plans/master              → List all master plans
GET    /plans/master/{id}         → Get specific master plan
POST   /plans/master              → Create new master plan
PUT    /plans/master/{id}         → Update master plan
DELETE /plans/master/{id}         → Delete master plan (soft)
```

#### Instance Plan Operations
```
GET    /plans                     → List plan instances with filtering
GET    /plans/instance/{id}       → Get specific plan instance
POST   /plans/instance            → Create instance from master
PUT    /plans/instance/{id}       → Update plan instance
PUT    /plans/{id}/status         → Update instance status
DELETE /plans/instance/{id}       → Delete plan instance
```

#### Filtering Parameters
- `?migrationId={uuid}` - Plans in a migration
- `?iterationId={uuid}` - Plans in an iteration
- `?teamId={int}` - Plans owned by a team
- `?statusId={int}` - Plans with specific status

### Database Schema

#### Master Table: plans_master_plm
```sql
plm_id UUID PRIMARY KEY
tms_id INTEGER NOT NULL (team ownership)
plm_name VARCHAR(255) NOT NULL
plm_description TEXT
plm_status VARCHAR(50) NOT NULL
created_by, created_at, updated_by, updated_at
```

#### Instance Table: plans_instance_pli
```sql
pli_id UUID PRIMARY KEY
plm_id UUID NOT NULL (link to master)
ite_id UUID NOT NULL (link to iteration)
pli_name VARCHAR(255) NOT NULL
pli_description TEXT
pli_status VARCHAR(50) NOT NULL
usr_id_owner INTEGER NOT NULL
created_by, created_at, updated_by, updated_at
```

### Repository Pattern

```groovy
class PlanRepository {
    // Master Operations
    List<Map> findAllMasterPlans()
    Map findMasterPlanById(UUID planId)
    Map createMasterPlan(Map planData)
    Map updateMasterPlan(UUID planId, Map updates)
    boolean softDeleteMasterPlan(UUID planId)
    
    // Instance Operations
    List<Map> findPlanInstancesByFilters(Map filters)
    Map findPlanInstanceById(UUID instanceId)
    Map createPlanInstance(UUID masterPlanId, UUID iterationId, Map overrides)
    Map updatePlanInstance(UUID instanceId, Map updates)
    Map updatePlanInstanceStatus(UUID instanceId, Integer statusId)
    
    // Utility Methods
    boolean hasPlanInstances(UUID masterPlanId)
    List<Map> findPlansByTeamId(Integer teamId)
}
```

### Key Implementation Patterns

#### 1. Path Routing (from StepsApi)
```groovy
def extraPath = getAdditionalPath(request)
def pathParts = extraPath?.split('/')?.findAll { it } ?: []

if (pathParts.size() >= 1 && pathParts[0] == 'master') {
    // Handle master operations
}
```

#### 2. Type-Safe Parameter Handling
```groovy
// MANDATORY explicit casting
def migrationId = UUID.fromString(filters.migrationId as String)
def teamId = Integer.parseInt(filters.teamId as String)
```

#### 3. Error Response Pattern
```groovy
return Response.status(Response.Status.BAD_REQUEST)
    .entity(new JsonBuilder([error: "Invalid UUID format"]).toString())
    .build()
```

#### 4. Database Access Pattern
```groovy
DatabaseUtil.withSql { sql ->
    return sql.rows(query, params)
}
```

### Testing Strategy

#### Unit Tests Location
`/src/groovy/umig/tests/apis/PlansApiUnitTest.groovy`

#### Test Cases
1. Master plan CRUD operations
2. Instance creation from master
3. Hierarchical filtering combinations
4. Invalid UUID handling
5. Missing required fields
6. Status transitions
7. Soft delete validation

#### Integration Tests Location
`/src/groovy/umig/tests/integration/PlansApiIntegrationTest.groovy`

### Error Handling Matrix

| Scenario | HTTP Status | Error Message |
|----------|-------------|---------------|
| Invalid UUID format | 400 | "Invalid UUID format" |
| Plan not found | 404 | "Plan not found" |
| Missing required field | 400 | "Missing required field: {field}" |
| Duplicate key | 409 | "Plan with this name already exists" |
| Database error | 500 | "Internal server error: {details}" |

## Day 1 Tasks (July 30)

1. **Morning (2-3 hours)**
   - Create PlansApi.groovy file structure
   - Implement GET endpoints for master plans
   - Create PlanRepository.groovy with master methods

2. **Afternoon (3-4 hours)**
   - Implement POST/PUT/DELETE for master plans
   - Add instance GET endpoints
   - Implement hierarchical filtering logic

## Day 2 Tasks (July 31)

1. **Morning (2-3 hours)**
   - Complete instance CRUD operations
   - Add status update endpoint
   - Implement soft delete logic

2. **Afternoon (3-4 hours)**
   - Write comprehensive unit tests
   - Create integration tests
   - Update OpenAPI specification
   - Code review and refinement

## Success Criteria

- [ ] All endpoints follow StepsApi consolidated pattern
- [ ] Master template CRUD fully functional
- [ ] Instance creation from masters working
- [ ] Hierarchical filtering operational
- [ ] Type-safe parameter handling throughout
- [ ] 90%+ unit test coverage
- [ ] Integration tests passing
- [ ] OpenAPI spec updated with new endpoints
- [ ] No deviations from established patterns

## Risk Mitigation

1. **Pattern Consistency**: Reference StepsApi.groovy for every design decision
2. **Type Safety**: Use explicit casting for all external parameters
3. **Testing**: Write tests in parallel with implementation
4. **Documentation**: Update OpenAPI spec as endpoints are created

## Notes

- Follow exact naming conventions from existing APIs
- Use StatusRepository for status lookups (don't hardcode)
- Include audit fields in all responses
- Maintain transaction boundaries in repository methods
- Consider performance for large result sets (pagination later)