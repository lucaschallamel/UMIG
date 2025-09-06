# US-056F: Dual DTO Architecture - Step Master and Instance Separation

**Story ID**: US-056F  
**Title**: Dual DTO Architecture - Step Master and Instance Separation  
**Epic**: US-056 JSON-Based Step Data Architecture  
**Priority**: Critical (Prerequisite for US-056C)  
**Story Points**: 2  
**Sprint**: Sprint 6  
**Status**: Ready for Development  
**Type**: Technical Enabler

---

## Story Overview

During US-056C planning, we discovered that the current `StepDataTransferObject` is designed specifically for Step **instances** (execution records) with fields like status, assignments, and execution dates. However, UMIG's architecture has both Step **masters** (templates) and Step **instances** (executions). This story creates the necessary dual DTO architecture to properly handle both entity types.

## User Story Statement

**As a** developer working with UMIG's Step entities  
**I want** separate DTOs for Step master templates and Step instance executions  
**So that** I have type-safe, clear data structures that accurately represent each entity type without confusion or unnecessary null fields

## Problem Statement

**Current Issue**:
- Single `StepDataTransferObject` designed for instances (has stepStatus, assignedTeamId, etc.)
- Step masters don't have execution-specific fields
- API endpoints need to handle both masters and instances
- Mixing concerns leads to confusion and potential bugs

**Solution**:
- Create `StepMasterDTO` for template entities
- Rename existing to `StepInstanceDTO` for execution records
- Clear separation of concerns

## Acceptance Criteria

### AC1: Create StepMasterDTO Class

- **GIVEN** Step master entities need their own DTO representation
- **WHEN** creating the new `StepMasterDTO` class
- **THEN** it must include only master-relevant fields:
  - `stepMasterId` (UUID as String)
  - `stepTypeCode` (String)
  - `stepNumber` (Integer)
  - `stepName` (String)
  - `stepDescription` (String)
  - `phaseId` (UUID as String) - parent phase reference
  - `createdDate` (String ISO format)
  - `lastModifiedDate` (String ISO format)
  - `isActive` (Boolean)
- **AND** exclude all execution-specific fields (no status, no assignments, no execution dates)
- **AND** follow UMIG's Jackson annotation patterns
- **AND** include proper toString, equals, and hashCode methods

### AC2: Rename Existing DTO to StepInstanceDTO

- **GIVEN** the current `StepDataTransferObject` represents instance data
- **WHEN** refactoring the existing class
- **THEN** rename it to `StepInstanceDTO` for clarity
- **AND** update all imports and references throughout the codebase
- **AND** maintain all existing functionality without breaking changes
- **AND** update class documentation to clarify instance-specific purpose

### AC3: Update StepDataTransformationService

- **GIVEN** the transformation service needs to handle both DTO types
- **WHEN** updating `StepDataTransformationService`
- **THEN** add new methods for master transformations:
  - `fromMasterDatabaseRow(Map row): StepMasterDTO`
  - `fromMasterDatabaseRows(List<Map> rows): List<StepMasterDTO>`
- **AND** rename existing methods to clarify instance usage:
  - `fromDatabaseRow` → `fromInstanceDatabaseRow`
  - `fromDatabaseRows` → `fromInstanceDatabaseRows`
- **AND** maintain backward compatibility during transition

### AC4: Update StepRepository for Dual DTO Support

- **GIVEN** StepRepository needs to return appropriate DTOs
- **WHEN** updating repository methods
- **THEN** add master-specific DTO methods:
  - `findMasterByIdAsDTO(UUID stepMasterId): StepMasterDTO`
  - `findAllMastersAsDTO(): List<StepMasterDTO>`
- **AND** rename instance methods for clarity:
  - `findByIdAsDTO` → `findInstanceByIdAsDTO`
  - `findByPhaseIdAsDTO` → `findInstancesByPhaseIdAsDTO`
- **AND** use appropriate transformation service methods

### AC5: Comprehensive Testing

- **GIVEN** new DTO architecture needs validation
- **WHEN** implementing test coverage
- **THEN** create unit tests for:
  - StepMasterDTO creation and serialization
  - StepInstanceDTO (renamed) functionality
  - Transformation service handling both types
  - Repository methods returning correct DTO types
- **AND** achieve ≥95% test coverage
- **AND** mock specific SQL queries per ADR-026

## Technical Requirements

### StepMasterDTO Structure

```groovy
package umig.dto

import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import groovy.transform.ToString
import groovy.transform.EqualsAndHashCode

/**
 * Step Master Data Transfer Object
 * Represents template/blueprint Step entities without execution data
 * Part of US-056F dual DTO architecture
 */
@ToString(includeNames = true)
@EqualsAndHashCode(includes = ['stepMasterId'])
@JsonIgnoreProperties(ignoreUnknown = true)
class StepMasterDTO {
    
    @JsonProperty("stepMasterId")
    String stepMasterId
    
    @JsonProperty("stepTypeCode")
    String stepTypeCode
    
    @JsonProperty("stepNumber")
    Integer stepNumber
    
    @JsonProperty("stepName")
    String stepName
    
    @JsonProperty("stepDescription")
    String stepDescription
    
    @JsonProperty("phaseId")
    String phaseId
    
    @JsonProperty("createdDate")
    String createdDate
    
    @JsonProperty("lastModifiedDate")
    String lastModifiedDate
    
    @JsonProperty("isActive")
    Boolean isActive
    
    // Metadata counts (computed fields)
    @JsonProperty("instructionCount")
    Integer instructionCount
    
    @JsonProperty("instanceCount")
    Integer instanceCount
}
```

### Repository Pattern

```groovy
// StepRepository additions
def findMasterByIdAsDTO(UUID stepMasterId) {
    DatabaseUtil.withSql { sql ->
        def row = sql.firstRow(STEP_MASTER_DTO_QUERY, stepMasterId.toString())
        return row ? transformationService.fromMasterDatabaseRow(row) : null
    }
}
```

## Dependencies

### Prerequisites
- US-056A: Service Layer Standardization (Complete) ✅
- US-056B: Template Integration (Complete) ✅

### Blocks
- **US-056C**: API Layer Integration - Cannot proceed without dual DTO architecture

### Future Work (Out of Scope)
- Team relationship DTOs
- Iteration type DTOs
- Comment DTOs for masters
- Full hierarchy DTOs (will be addressed in future stories)

## Risk Assessment

### Technical Risks

1. **Refactoring Impact**
   - **Risk**: Renaming existing DTO affects multiple files
   - **Mitigation**: Use IDE refactoring tools, comprehensive testing
   - **Likelihood**: Low | **Impact**: Medium

2. **API Compatibility**
   - **Risk**: Existing API consumers might be affected
   - **Mitigation**: Maintain method signatures, gradual migration
   - **Likelihood**: Low | **Impact**: Low

### Business Risks

1. **Development Delay**
   - **Risk**: Adds 2 story points to Sprint 6
   - **Mitigation**: Critical for clean architecture, prevents future tech debt
   - **Likelihood**: Medium | **Impact**: Low

## Testing Strategy

### Unit Tests (Target: 95% Coverage)

1. **StepMasterDTO Tests**:
   - Creation and initialization
   - Jackson serialization/deserialization
   - Null safety handling
   - Equals and hashCode behavior

2. **StepInstanceDTO Tests** (renamed):
   - Maintain existing test coverage
   - Verify rename doesn't break functionality

3. **Transformation Service Tests**:
   - Master transformation methods
   - Instance transformation methods
   - Null handling and defensive programming

### Integration Tests

1. **Repository Integration**:
   - Master DTO queries against test database
   - Instance DTO queries maintain functionality
   - Performance benchmarking (51ms target)

## Definition of Done

### Development Complete
- [ ] StepMasterDTO class created with master-only fields
- [ ] StepDataTransferObject renamed to StepInstanceDTO
- [ ] All references updated throughout codebase
- [ ] StepDataTransformationService handles both DTO types
- [ ] StepRepository includes master DTO methods
- [ ] Code follows UMIG patterns (ADR-031, ADR-047, ADR-049)

### Testing Complete
- [ ] Unit tests achieve ≥95% coverage
- [ ] Integration tests pass for both DTO types
- [ ] Performance maintained at 51ms query target
- [ ] Mock SQL queries follow ADR-026 patterns

### Documentation Complete
- [ ] Class-level documentation for both DTOs
- [ ] Method documentation in transformation service
- [ ] Updated API documentation noting dual DTO pattern
- [ ] ADR-052: Dual DTO Architecture Pattern documented

### Quality Assurance
- [ ] Code review completed
- [ ] No breaking changes to existing functionality
- [ ] Type safety maintained with explicit casting
- [ ] Defensive null handling implemented

## Story Points: 2

**Complexity Factors**:
- **DTO Creation**: Low - Simple data structure for masters
- **Refactoring**: Medium - Rename affects multiple files
- **Service Updates**: Low - Add new transformation methods
- **Testing**: Medium - Comprehensive coverage needed
- **Risk**: Low - Additive changes, minimal disruption

**Total Estimated Effort**: 8 hours

## Implementation Notes

### Development Approach

1. Create StepMasterDTO class first
2. Update transformation service with master methods
3. Rename existing DTO to StepInstanceDTO
4. Update all references systematically
5. Add repository methods for master DTOs
6. Comprehensive testing at each step

### Key Patterns to Follow

```groovy
// Mandatory DatabaseUtil.withSql pattern
DatabaseUtil.withSql { sql ->
    // Query execution
}

// Type safety (ADR-031)
UUID.fromString(stepMasterId as String)

// Defensive null handling
row?.step_name ?: ""
```

### Out of Scope (Future Stories)

- Instruction DTOs (master vs instance)
- Phase/Sequence/Plan DTOs
- Team relationship handling
- Iteration type associations
- Comment system DTOs
- Full hierarchical DTO structures

## Change Log

| Date       | Version | Changes                | Author |
|------------|---------|------------------------|--------|
| 2025-09-06 | 1.0     | Initial story creation | System |

---

**Story Status**: Ready for Sprint 6 Implementation  
**Next Story**: US-056C API Layer Integration (unblocked after this)  
**Risk Level**: Low (focused, well-defined scope)  
**Strategic Value**: High (enables clean architecture for entire US-056 epic)