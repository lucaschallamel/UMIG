# US-093: Step DTO Canonical Format Architecture - Epic

## Epic Overview

**Story Points**: 34
**Sprint**: 7 (Epic spans multiple sprints)
**Priority**: High
**Type**: Technical Architecture Enhancement
**Risk**: High (affects 5+ critical production systems)

## Executive Summary

Transform Step DTOs (StepInstanceDTO and StepMasterDTO) into comprehensive "one-stop-shop" canonical JSON formats that serve as the single source of truth for all UMIG consumers. By passing just a UUID, the DTO returns everything needed for IterationView, StepView, email templates, Admin GUI, and APIs.

## Business Value

- **Simplified Integration**: Single API call provides all data for any view
- **Consistency**: Standardized format across all system components
- **Performance**: Optimized queries reduce database load by 60%
- **Future-Proof**: Canonical format supports new features without schema changes
- **Maintainability**: Single source of truth reduces code duplication

## Current State Analysis

### Scope of Impact

- **StepInstanceDTO**: Used in 22 files across codebase
- **StepMasterDTO**: Used in 14 files
- **Critical Dependencies**:
  - GET /steps API endpoint
  - CSV export functionality
  - EmailService.toTemplateMap() for notifications
  - StepDataTransformationService for DB row conversion
  - Admin GUI step management interface

### Identified Gaps

- Missing stepMasterId reference in StepInstanceDTO
- No impacted teams collection (only single assigned team)
- Environment associations not included
- Instructions data structure absent
- Comments limited to 5 most recent
- Full hierarchy not available in StepMasterDTO
- No master/instance override pattern

## Target State Architecture

### Canonical StepInstanceDTO Structure

```json
{
  "$schema": "https://umig.internal/schemas/step-instance/v1.0.0",
  "metadata": { "version": "1.0.0", "type": "step_instance" },
  "identity": {
    "stepInstanceId": "uuid",
    "stepMasterId": "uuid",
    "stepName": "string",
    "stepStatus": "enum"
  },
  "hierarchy": {
    "migration": { "id", "code", "name", "status" },
    "iteration": { "id", "code", "name", "order", "status" },
    "plan": { "id", "name", "type" },
    "sequence": { "id", "code", "name", "order", "type" },
    "phase": { "id", "code", "name", "order", "type" }
  },
  "assignments": {
    "assignedTeam": { "id", "name", "role", "email" },
    "impactedTeams": [ /* array of team objects */ ],
    "escalationChain": [ /* ordered escalation levels */ ]
  },
  "environment": {
    "id", "name", "code", "type", "region", "criticality"
  },
  "instructions": [ /* complete instruction list with status */ ],
  "labels": [ /* categorization labels */ ],
  "dependencies": {
    "predecessors": [ /* blocking steps */ ],
    "successors": [ /* dependent steps */ ]
  },
  "progress": {
    "progressPercentage", "totalInstructions", "completedInstructions",
    "isReady", "isBlocked", "blockingReason"
  },
  "comments": [ /* full comment thread */ ],
  "audit": { /* creation, modification tracking */ },
  "overrides": { /* master/instance field overrides */ },
  "links": { /* RESTful navigation links */ }
}
```

## Epic Phases

### Phase 1: Additive Enhancement Foundation (US-093-A) - 13 points

- Add new fields to DTOs without modifying existing
- Create toCanonicalJson() method alongside toTemplateMap()
- Extend repository methods for new relationships
- Add API parameter for canonical format
- Maintain 100% backward compatibility

### Phase 2: API Versioning & Migration (US-093-B) - 13 points

- Create /v2/steps endpoint with canonical format
- Implement format negotiation (Accept headers)
- Update Admin GUI to consume canonical format
- Migrate EmailService to use canonical structure
- Add deprecation warnings to legacy methods

### Phase 3: Consolidation & Optimization (US-093-C) - 8 points

- Remove deprecated methods after migration period
- Optimize database queries with materialized views
- Implement caching layer for frequently accessed steps
- Complete performance testing and tuning
- Archive legacy transformation code

## Acceptance Criteria

### Functional Requirements

- [ ] Single repository method returns complete step data with one UUID
- [ ] Canonical JSON format validates against published schema
- [ ] All existing consumers continue functioning without modification (Phase 1)
- [ ] New format supports IterationView, StepView, and email templates
- [ ] Instructions include completion status and assigned teams
- [ ] Impacted teams show role and notification requirements
- [ ] Environment information includes maintenance windows
- [ ] Full hierarchy from Migration to Phase is accessible
- [ ] Comments include entire thread, not just recent 5
- [ ] Master/instance override pattern clearly indicates field sources

### Non-Functional Requirements

- [ ] Response time ≤800ms for single step retrieval
- [ ] Batch operations handle 100+ steps in ≤3 seconds
- [ ] No more than 3 database queries per step retrieval
- [ ] JSON payload size ≤50KB per step (compressed)
- [ ] Zero breaking changes to existing APIs (Phase 1)
- [ ] 100% unit test coverage for new methods
- [ ] Integration tests validate all consumers
- [ ] Performance tests establish baselines

## Technical Design

### Repository Pattern Enhancement

```groovy
class StepRepository {
    // New canonical method
    StepInstanceDTO findCompleteStepInstance(UUID stepInstanceId, Set<String> includes = ['ALL']) {
        // Single optimized query with JOINs
        // JSON aggregation for collections
        // Batch loading for relationships
    }

    // Backward compatible existing method
    StepInstanceDTO findStepInstance(UUID stepInstanceId) {
        // Unchanged implementation
    }
}
```

### Service Layer Strategy

```groovy
class StepDataTransformationService {
    // Existing method - unchanged
    Map toTemplateMap(StepInstanceDTO dto) { /* current implementation */ }

    // New canonical method
    Map toCanonicalJson(StepInstanceDTO dto) { /* new format */ }
}
```

### API Integration Points

```groovy
// Existing endpoint - enhanced
GET /steps?canonical=true  // Returns canonical format
GET /steps                 // Returns legacy format (default)

// New versioned endpoint (Phase 2)
GET /v2/steps              // Always returns canonical format
```

## Database Schema Requirements

### Existing Tables (Verified)

- `steps_instance_sti` - Core step instance data ✅
- `steps_master_stm` - Master template data ✅
- `steps_master_stm_x_teams_tms_impacted` - Impacted teams ✅
- `labels_lbl_x_steps_master_stm` - Label associations ✅
- `instructions_instance_ini` - Instance instructions ✅
- `instructions_master_inm` - Master instructions ✅

### Required Additions

- `comments_com` - Generic comments table (new)
- `step_dependencies_sde` - Step dependency tracking (new)
- Performance indexes on relationship joins

## Risk Assessment

### High Risk Areas

1. **EmailService Breaking Changes** - Email templates depend on specific field names
2. **Admin GUI Compatibility** - Frontend expects current DTO structure
3. **API Contract Changes** - External integrations may break
4. **Performance Degradation** - Additional data may slow responses
5. **Test Coverage Gaps** - 20+ test files need updates

### Mitigation Strategies

- Additive-only approach in Phase 1
- Comprehensive regression testing
- Feature flags for gradual rollout
- Performance baselines and monitoring
- Clear deprecation timeline
- Consumer migration guide

## Dependencies

- Database schema must support all relationships
- Performance testing environment required
- API documentation tools for schema publishing
- Admin GUI team coordination for Phase 2
- Email template review and testing

## Success Metrics

- Zero production incidents during rollout
- API response time improvement of 20%
- Code duplication reduced by 40%
- Developer productivity increased (measured by implementation time)
- 100% consumer migration within 3 sprints

## Implementation Timeline

- **Sprint 7**: Phase 1 (US-093-A) - Foundation
- **Sprint 8**: Phase 2 (US-093-B) - Migration
- **Sprint 9**: Phase 3 (US-093-C) - Optimization

## Notes

- This epic addresses technical debt from US-056 (Service Layer Standardization)
- Aligns with ADR-047 (Single Enrichment Point Pattern)
- Supports future Admin GUI enhancements (US-087)
- Enables efficient IterationView implementation

---

_Created: 2025-09-21_
_Status: Planning_
_Owner: Development Team_
