# US-002: Sequences API with Ordering - Implementation Plan

**Sprint**: Sprint 0 - API Foundation  
**Status**: Ready for Development  
**Estimated Duration**: 4-6 hours  
**Dependencies**: US-001 Plans API (✅ Completed)  
**Confidence Level**: High - ScriptRunner patterns proven  

## Team Assembly & Coordination
✅ **GENDEV Specialist Agents Engaged:**
- **Requirements Analyst**: Comprehensive functional & technical requirements analysis
- **API Designer**: Complete technical architecture with ScriptRunner patterns  
- **QA Coordinator**: Robust testing strategy following ADR-026 compliance

## Executive Summary

**Objective**: Implement Sequences API with ordering functionality following proven US-001 patterns
**Timeline**: 3-4 hours development + 1-2 hours testing = **4-6 hours total**
**Confidence**: High - ScriptRunner integration challenges resolved, established patterns proven

## 📋 Detailed Implementation Plan

### Phase 1: Repository Foundation (1.5 hours)
**Lead: API Designer patterns + Requirements specifications**

#### Task 1.1: Create SequenceRepository.groovy (1 hour)
```groovy
// Target: 600+ lines following PlanRepository.groovy (451 lines)
Location: src/groovy/umig/repository/SequenceRepository.groovy

Core Methods (13+ required):
✓ findAllMasterSequences()
✓ findMasterSequenceById(UUID)
✓ findSequenceInstances(Map filters) // Hierarchical filtering
✓ createMasterSequence(Map data)
✓ createSequenceInstancesFromMaster(UUID planInstanceId, String user)
✓ reorderMasterSequence(UUID id, Integer newOrder, UUID predecessor)
✓ updateSequenceInstanceStatus(UUID id, String status, String user)  
✓ validateSequenceOrdering(UUID planId, boolean isInstance)
✓ hasCircularDependency(sql, UUID sequence, UUID predecessor)
```

**Critical Patterns**:
- **ADR-031 Type Safety**: `UUID.fromString(param as String)`, `Integer.parseInt(param as String)`
- **Hierarchical Filtering**: Use instance IDs (`pli_id`, `sqi_id`) not master IDs
- **Full Attribute Instantiation**: Copy all master fields to instances with override capability

#### Task 1.2: Database Connection Testing (0.5 hours)
- Verify `umig_db_pool` connection configuration
- Test lazy repository loading pattern
- Validate SQL query execution

### Phase 2: API Implementation (2 hours)
**Lead: API Designer architecture + Requirements endpoint specs**

#### Task 2.1: Create SequencesApi.groovy (1.5 hours)
```groovy
// Target: 400+ lines following PlansApi.groovy pattern
Location: src/groovy/umig/api/v2/SequencesApi.groovy

Endpoint Structure:
GET /sequences                    → Instance filtering with hierarchy
GET /sequences/master            → All master sequences  
GET /sequences/master/{id}       → Specific master sequence
GET /sequences/instance/{id}     → Specific instance
POST /sequences/master           → Create master sequence
POST /sequences/instance         → Create sequence instances
PUT /sequences/master/{id}/order → Update sequence order
PUT /sequences/instance/{id}     → Update instance status
DELETE /sequences/master/{id}    → Delete master (validation required)
```

**Implementation Checklist**:
- ✅ Lazy repository loading: `def getSequenceRepository = { -> new SequenceRepository() }`
- ✅ Path-based routing: `getAdditionalPath(request)?.split('/')`
- ✅ Type-safe parameter extraction with explicit casting
- ✅ Comprehensive error handling with SQL state mapping
- ✅ JsonBuilder response formatting

#### Task 2.2: Hierarchical Filtering Implementation (0.5 hours)
```groovy
// Query parameter processing (ADR-031 compliant)
def filters = [:]
if (queryParams.getFirst('migrationId')) {
    filters.migrationId = UUID.fromString(queryParams.getFirst('migrationId') as String)
}
if (queryParams.getFirst('iterationId')) {
    filters.iterationId = UUID.fromString(queryParams.getFirst('iterationId') as String)
}
// Continue for planId, teamId, statusId
```

### Phase 3: Ordering & Dependencies (1 hour)
**Lead: Requirements dependency logic + API Designer validation patterns**

#### Task 3.1: Sequence Ordering Logic (0.5 hours)
- Implement order number management with gap handling
- Validate order uniqueness within plan scope
- Support predecessor relationship management

#### Task 3.2: Circular Dependency Detection (0.5 hours)
```sql
-- Recursive CTE for cycle detection
WITH RECURSIVE dependency_chain AS (
    SELECT sqm_id, predecessor_sqm_id, 1 as depth, ARRAY[sqm_id] as path
    FROM sequences_master_sqm WHERE plm_id = :planId
    UNION ALL
    SELECT s.sqm_id, s.predecessor_sqm_id, dc.depth + 1, dc.path || s.sqm_id
    FROM sequences_master_sqm s
    JOIN dependency_chain dc ON s.predecessor_sqm_id = dc.sqm_id
    WHERE s.sqm_id != ALL(dc.path)
)
SELECT * FROM dependency_chain WHERE sqm_id = ANY(path[1:array_length(path,1)-1])
```

### Phase 4: Testing & Validation (1.5 hours)
**Lead: QA Coordinator strategy + Requirements validation**

#### Task 4.1: Unit Tests (0.5 hours)
```groovy
// File: src/groovy/umig/tests/unit/SequenceRepositoryTest.groovy
// Following ADR-026 specific mock patterns

Key Test Methods:
✓ findSequencesByIteration() - Specific SQL regex validation
✓ updateSequenceOrder() - Constraint validation with exact query match
✓ findCircularDependencies() - Recursive CTE pattern validation
✓ reorderSequences() - Gap filling and consistency checks
```

#### Task 4.2: Integration Tests (1 hour)
```groovy
// File: src/groovy/umig/tests/integration/SequencesApiIntegrationTest.groovy
// Mirror PlansApiIntegrationTest.groovy (297 lines)

Test Scenarios (20 tests planned):
1-5:   Basic CRUD operations (Create master, Create instance, Get operations)
6-12:  Hierarchical filtering (Migration, Iteration, Plan, Team, Combined)
13-16: Ordering operations (Update order, Bulk reorder, Gap normalization)
17-20: Error handling (Invalid UUIDs, Constraint violations, Dependencies)
```

## 🔧 Technical Implementation Details

### ScriptRunner Integration (Proven Patterns)
```groovy
// Lazy repository loading (prevents class loading conflicts)
def getSequenceRepository = { ->
    return new SequenceRepository()
}

// Type-safe parameter handling (ADR-031)
if (pathParts.size() >= 1) {
    def sequenceId = UUID.fromString(pathParts[0] as String)
}

// Connection pool usage
DatabaseUtil.withSql { sql ->
    return sql.rows(query, params)
}
```

### Database Schema (Already Implemented)
```sql
-- Master sequences (canonical templates)
sequences_master_sqm:
- sqm_id (UUID, PK)
- plm_id (UUID, FK to plans_master_plm) 
- sqm_order (INTEGER)
- sqm_name (VARCHAR(255))
- sqm_description (TEXT)
- predecessor_sqm_id (UUID, self-referencing FK)

-- Instance sequences (execution records)  
sequences_instance_sqi:
- sqi_id (UUID, PK)
- pli_id (UUID, FK to plans_instance_pli)
- sqm_id (UUID, FK to sequences_master_sqm)
- sqi_order (INTEGER) -- Override capability
- sqi_name (VARCHAR(255)) -- Override capability
- sqi_status (VARCHAR(50))
- predecessor_sqi_id (UUID, FK to sequences_instance_sqi)
```

## 📊 Quality Assurance Matrix

### Test Coverage Requirements
- **Unit Tests**: 90% line coverage, 100% critical methods
- **Integration Tests**: 100% API endpoints, 100% error scenarios
- **SQL Mock Validation**: All queries require specific regex patterns (ADR-026)

### Error Handling Coverage
```yaml
HTTP Status Mapping:
- 400: Invalid UUID format, missing required fields, circular dependencies
- 404: Sequence not found  
- 409: Duplicate order numbers, constraint violations
- 500: Database errors, system failures

SQL State Translation:
- 23503 (FK violation) → 400 Bad Request
- 23505 (Unique violation) → 409 Conflict
```

## ⚡ Risk Assessment & Mitigation

### Technical Risks (All Mitigated)
- ✅ **ScriptRunner Integration**: Resolved via US-001 lazy-loading patterns
- ✅ **Type Safety**: ADR-031 explicit casting patterns established
- ✅ **Database Connectivity**: Connection pool configuration documented
- ✅ **Performance**: Proven hierarchical filtering patterns from existing APIs

### Development Risks (Low)
- **Circular Dependency Complexity**: Mitigated with recursive CTE validation
- **Order Conflict Resolution**: Mitigated with transaction-based updates
- **Instance Override Logic**: Mitigated with established ADR-029 patterns

## 🎯 Success Criteria & Validation

### Functional Acceptance
- ✅ All CRUD operations working with proper error handling
- ✅ Hierarchical filtering supporting 5+ filter combinations  
- ✅ Sequence ordering with dependency validation
- ✅ Instance override capabilities per ADR-029

### Technical Validation
- ✅ API response times <200ms for typical queries
- ✅ Type-safe parameter handling per ADR-031
- ✅ Repository pattern consistency with existing APIs
- ✅ OpenAPI specification compliance

### Integration Readiness
- ✅ Foundation prepared for US-003: Phases API
- ✅ UI-ready data formats and filtering capabilities
- ✅ Seamless integration with existing Plans API

## ⏱️ Execution Timeline

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| **Repository Foundation** | 1.5h | SequenceRepository.groovy (600+ lines) |
| **API Implementation** | 2h | SequencesApi.groovy (400+ lines) |  
| **Ordering & Dependencies** | 1h | Validation logic, circular detection |
| **Testing & Validation** | 1.5h | Unit tests (90% coverage) + Integration tests (20 scenarios) |
| **Total** | **6h** | **Production-ready Sequences API** |

## 🚀 Next Steps After Completion

1. **Update OpenAPI Specification** - Add 11+ new endpoints with schemas
2. **Regenerate Postman Collection** - Use enhanced automation (28,374-line collection)
3. **Documentation Updates** - Update solution-architecture.md
4. **Prepare US-003 Foundation** - Phases API can immediately follow established patterns

## 🏆 Team Coordination Summary

**Requirements Analyst**: Provided comprehensive functional breakdown and integration requirements
**API Designer**: Delivered complete technical architecture with concrete code examples  
**QA Coordinator**: Created robust testing strategy with 90%+ coverage and ADR-026 compliance

**Collective Confidence**: **High** - All agents confirm US-001 patterns provide solid foundation for accelerated development with proven ScriptRunner integration mastery.

---

**Created**: 2025-07-31  
**Sprint**: Sprint 0 - API Foundation  
**User Story**: US-002: Sequences API with Ordering