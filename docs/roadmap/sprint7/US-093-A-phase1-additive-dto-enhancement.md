# US-093-A: Phase 1 - Additive DTO Enhancement Foundation

## Story Overview
**Story Points**: 13
**Sprint**: 7
**Priority**: High
**Type**: Technical Implementation
**Parent Epic**: US-093
**Risk**: Medium (backward compatibility focus reduces risk)

## User Story
**As a** UMIG system architect
**I want to** enhance Step DTOs with additional fields and methods using an additive approach
**So that** we can establish the foundation for canonical JSON format without breaking existing consumers

## Context
This is Phase 1 of the Step DTO Canonical Format Architecture epic (US-093). The focus is on adding new capabilities while maintaining 100% backward compatibility with the 22 files using StepInstanceDTO and 14 files using StepMasterDTO.

## Acceptance Criteria

### DTO Enhancement
- [ ] StepInstanceDTO includes new fields without modifying existing ones
  - [ ] stepMasterId reference added
  - [ ] impactedTeams collection added
  - [ ] environment association added
  - [ ] instructions collection added
  - [ ] dependencies (predecessors/successors) added
  - [ ] overrides pattern for master/instance fields added
- [ ] StepMasterDTO enhanced with full hierarchy
  - [ ] migrationId, migrationCode added
  - [ ] iterationId, iterationCode added
  - [ ] sequenceId, sequenceName added
  - [ ] Complete hierarchy navigation added

### Method Implementation
- [ ] Existing toTemplateMap() method remains unchanged
- [ ] New toCanonicalJson() method returns canonical format
- [ ] Both methods coexist and function independently
- [ ] Deprecated annotation NOT added yet (Phase 2)

### Repository Enhancement
- [ ] New findCompleteStepInstance(UUID) method created
- [ ] Method uses single optimized query with JOINs
- [ ] Batch loading implemented for collections
- [ ] Performance target: ≤3 database queries per request
- [ ] Existing repository methods remain unchanged

### API Integration
- [ ] GET /steps endpoint accepts ?canonical=true parameter
- [ ] Default behavior (no parameter) returns legacy format
- [ ] Canonical parameter returns new enhanced format
- [ ] Response time ≤800ms for canonical format
- [ ] CSV export continues using legacy format

### Testing Requirements
- [ ] 100% unit test coverage for new methods
- [ ] Integration tests verify both formats work
- [ ] Regression tests confirm no breaking changes
- [ ] Performance tests establish baseline metrics
- [ ] EmailService tests validate toTemplateMap() unchanged

## Technical Design

### 1. StepInstanceDTO Enhancement
```groovy
class StepInstanceDTO {
    // === EXISTING FIELDS (unchanged) ===
    String stepId
    String stepInstanceId
    String stepName
    String stepDescription
    String stepStatus
    String assignedTeamId
    String assignedTeamName
    // ... all current fields remain

    // === NEW FIELDS (additive) ===
    @JsonProperty("stepMasterId")
    String stepMasterId

    @JsonProperty("impactedTeams")
    List<Map<String, Object>> impactedTeams = []

    @JsonProperty("environment")
    Map<String, Object> environment

    @JsonProperty("instructions")
    List<Map<String, Object>> instructions = []

    @JsonProperty("dependencies")
    Map<String, List<Map>> dependencies = [
        predecessors: [],
        successors: []
    ]

    @JsonProperty("overrides")
    Map<String, Object> overrides = [
        hasOverrides: false,
        overriddenFields: [:],
        masterValues: [:]
    ]

    // === EXISTING METHOD (unchanged) ===
    Map<String, Object> toTemplateMap() {
        // Current implementation preserved exactly
        return [/* existing mapping */]
    }

    // === NEW METHOD (additive) ===
    Map<String, Object> toCanonicalJson() {
        return [
            "$schema": "https://umig.internal/schemas/step-instance/v1.0.0",
            metadata: [
                version: "1.0.0",
                generated: new Date().toISOString(),
                type: "step_instance"
            ],
            identity: [
                stepInstanceId: this.stepInstanceId,
                stepMasterId: this.stepMasterId,
                stepName: this.stepName,
                // ... complete canonical structure
            ],
            // ... full canonical format
        ]
    }
}
```

### 2. Repository Enhancement
```groovy
class StepRepository {
    // New method for complete data retrieval
    StepInstanceDTO findCompleteStepInstance(UUID stepInstanceId, Set<String> includes = ['ALL']) {
        DatabaseUtil.withSql { sql ->
            // Main query with hierarchy JOINs
            def stepData = sql.firstRow("""
                SELECT
                    sti.*,
                    stm.stm_id as step_master_id,
                    -- Full hierarchy
                    mig.mig_id, mig.mig_code, mig.mig_name,
                    ite.ite_id, ite.ite_code, ite.ite_name,
                    pli.pli_id, pli.pli_name,
                    sqi.sqi_id, sqi.sqi_code, sqi.sqi_name,
                    phi.phi_id, phi.phi_code, phi.phi_name
                FROM steps_instance_sti sti
                JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                JOIN migrations_mig mig ON ite.mig_id = mig.mig_id
                WHERE sti.sti_id = ?
            """, [stepInstanceId])

            if (!stepData) return null

            // Enrich with relationships if requested
            if (includes.contains('ALL') || includes.contains('TEAMS')) {
                stepData.impactedTeams = findImpactedTeams(stepData.stm_id)
            }

            if (includes.contains('ALL') || includes.contains('INSTRUCTIONS')) {
                stepData.instructions = findInstructions(stepInstanceId)
            }

            if (includes.contains('ALL') || includes.contains('ENVIRONMENT')) {
                stepData.environment = findEnvironment(stepData.env_id)
            }

            // Transform to DTO
            return transformToDTO(stepData)
        }
    }

    // Helper methods for relationship loading
    private List<Map> findImpactedTeams(UUID stepMasterId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT
                    t.tea_id as teamId,
                    t.tea_name as teamName,
                    t.tea_code as teamCode,
                    x.impact_level,
                    x.notification_required
                FROM steps_master_stm_x_teams_tms_impacted x
                JOIN teams_tea t ON x.tea_id = t.tea_id
                WHERE x.stm_id = ?
            """, [stepMasterId])
        }
    }
}
```

### 3. API Enhancement
```groovy
// In StepsApi.groovy
steps(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def canonical = queryParams.getFirst("canonical") == "true"

    if (canonical) {
        // New canonical format path
        List<StepInstanceDTO> steps = stepRepository.findCompleteStepInstances(filters, ['ALL'])
        List<Map> canonicalSteps = steps.collect { it.toCanonicalJson() }
        return Response.ok(new JsonBuilder(canonicalSteps).toString()).build()
    } else {
        // Existing legacy format path (unchanged)
        List<StepInstanceDTO> stepDTOs = stepRepository.findFilteredStepInstancesAsDTO(filters)
        // ... existing transformation logic
    }
}
```

## Implementation Tasks

### Database Layer (3 points)
- [ ] Create findImpactedTeams() query method
- [ ] Create findInstructions() query method
- [ ] Create findEnvironment() query method
- [ ] Create findDependencies() query method
- [ ] Optimize queries with appropriate indexes

### DTO Enhancement (3 points)
- [ ] Add new fields to StepInstanceDTO
- [ ] Implement toCanonicalJson() method
- [ ] Add hierarchy fields to StepMasterDTO
- [ ] Update validation rules for new fields

### Repository Layer (3 points)
- [ ] Implement findCompleteStepInstance() method
- [ ] Add batch loading optimization
- [ ] Create transformation helpers
- [ ] Ensure backward compatibility

### API Integration (2 points)
- [ ] Add canonical parameter handling
- [ ] Implement format negotiation logic
- [ ] Update API documentation
- [ ] Add response examples

### Testing (2 points)
- [ ] Write unit tests for new methods
- [ ] Create integration tests for both formats
- [ ] Add performance tests
- [ ] Verify regression test suite passes

## Testing Strategy

### Unit Tests
- Test toCanonicalJson() produces valid JSON
- Test toTemplateMap() remains unchanged
- Test new repository methods return correct data
- Test field validation for new properties

### Integration Tests
- Test API with canonical=true returns new format
- Test API without parameter returns legacy format
- Test EmailService continues working with toTemplateMap()
- Test CSV export functions correctly

### Regression Tests
- Run full test suite (95+ tests)
- Verify no breaking changes in 22 files using StepInstanceDTO
- Confirm EmailService notifications work
- Validate Admin GUI functionality

### Performance Tests
- Baseline: Current /steps endpoint response time
- Target: ≤800ms for canonical format
- Load test with 100+ concurrent requests
- Memory usage profiling

## Definition of Done
- [ ] All code implemented and peer reviewed
- [ ] Unit tests written and passing (100% coverage)
- [ ] Integration tests passing
- [ ] Regression tests confirm no breaking changes
- [ ] Performance baseline established and met
- [ ] API documentation updated
- [ ] Code deployed to development environment
- [ ] Acceptance criteria verified by QA

## Risks and Mitigation

### Risk 1: Performance Impact
**Risk**: Additional JOINs and data slow down API
**Mitigation**: Use includes parameter for selective loading

### Risk 2: Memory Usage
**Risk**: Large DTOs consume excessive memory
**Mitigation**: Implement pagination and field filtering

### Risk 3: Backward Compatibility Break
**Risk**: Accidental modification of existing behavior
**Mitigation**: Comprehensive regression testing, additive-only approach

## Dependencies
- Database schema supports required relationships
- Test data includes complete hierarchy examples
- Performance testing environment available

## Notes
- This is Phase 1 of 3 for the canonical format transformation
- Phase 2 (US-093-B) will handle API versioning and migration
- Phase 3 (US-093-C) will optimize and remove deprecated code
- Coordinates with US-087 Admin GUI enhancement efforts

---

*Created: 2025-09-21*
*Sprint: 7*
*Status: Ready for Development*