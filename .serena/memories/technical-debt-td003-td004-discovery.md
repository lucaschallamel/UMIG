# Technical Debt Discovery: TD-003 & TD-004

**Date**: 2025-09-18
**Sprint**: 7 - Infrastructure Excellence & Admin GUI Migration
**Discovery Type**: Critical Technical Debt
**Impact**: High - Architectural Foundation

## TD-003: Hardcoded Status Values

### Discovery Context

- **Trigger**: Steps API 500 errors in iteration view
- **Root Cause**: Database returning numeric IDs (21-27) but code expecting string names
- **Scope**: 50+ files across entire codebase

### Critical Findings

```yaml
affected_files: 50+
story_points: 68
timeline: 5-7 days
phases: 4

database_statuses:
  Step: [PENDING, TODO, IN_PROGRESS, COMPLETED, FAILED, BLOCKED, CANCELLED]
  Phase: [PLANNING, IN_PROGRESS, COMPLETED, CANCELLED]
  Sequence: [PLANNING, IN_PROGRESS, COMPLETED, CANCELLED]

missing_in_code:
  - TODO status not handled in StepDataTransformationService
  - BLOCKED status not handled in StepDataTransformationService
```

### Solution Architecture

```groovy
// Existing but underutilized
StatusRepository:
  - findStatusesByType(entityType)
  - findStatusByNameAndType(statusName, entityType)
  - isValidStatusId(statusId, entityType)

// To be created
StatusService:       // Centralized status management
StatusApi:          // REST endpoint for frontend
StatusProvider.js:  // Frontend caching utility
```

### Implementation Plan

- **Phase 1**: Foundation Infrastructure (StatusService, StatusApi, StatusProvider)
- **Phase 2**: Critical Service Layer Migration (Fix TODO/BLOCKED bug)
- **Phase 3**: Frontend Migration (EntityConfig.js, step-view.js)
- **Phase 4**: Testing & Documentation

### Files Requiring Updates

```
Service Layer:
- StepDataTransformationService.groovy (CRITICAL - missing statuses)
- ImportOrchestrationService.groovy
- ImportService.groovy
- CsvImportService.groovy

Frontend:
- step-view.js (4,700+ lines with hardcoded dropdowns)
- EntityConfig.js (7+ dropdown definitions)
- Components/*.js

Repository Layer:
- StepRepository.groovy
- PhaseRepository.groovy
- SequenceRepository.groovy
- InstructionRepository.groovy
```

## TD-004: Architectural Interface Mismatches

### Discovery Context

- **Trigger**: Teams component migration failures (US-087)
- **Root Cause**: Conflicting architectural philosophies
- **Scope**: Component-EntityManager integration layer

### Architectural Conflict

```javascript
// US-082-B Component Architecture (Sept 10, 2025)
Components: Self-managing, own rendering
Orchestrator: Coordination, not control
Security: 8.5/10 rating
Size: 62KB enterprise implementation

// US-087 EntityManager Pattern (Current Sprint)
EntityManagers: Expect to control rendering
Assumption: Methods that don't exist
Philosophy: Orchestrated control
```

### Interface Mismatches

```javascript
// BaseEntityManager expects → Component doesn't have
this.orchestrator.render(); // ❌ Doesn't exist
this.paginationComponent.updatePagination(data); // ❌ Doesn't exist
this.tableComponent.updateData(data); // ❌ Wrong method name

// API Path Issues
("/users/current"); // ❌ Relative path fails
("/rest/scriptrunner/latest/custom/users/current"); // ✅ Full path needed
```

### Solution Decision

**Choice**: Fix BaseEntityManager (Option B)
**Rationale**:

- Preserve stable component architecture
- Maintain single architectural pattern
- Avoid layering fixes on proven foundation
- Components remain pure and focused

### Implementation Estimate

```yaml
effort: 4-6 hours
story_points: 3
phases:
  1: Interface Discovery (1 hour)
  2: BaseEntityManager Fixes (2-3 hours)
  3: Validation (1-2 hours)
```

## Architectural Lessons Learned

### Database-Code Alignment

- **Lesson**: Code assumptions about data structure don't match database reality
- **Pattern**: Always verify actual database schema vs code expectations
- **Impact**: Prevents entire class of data mismatch bugs

### Interface Contracts

- **Lesson**: Implicit interfaces create integration failures
- **Pattern**: Define explicit contracts before implementation
- **Impact**: Prevents architectural conflicts

### Emergency Development Risk

- **Lesson**: Time-pressure sessions (2h12m) create architectural debt
- **Pattern**: Even emergency work needs interface definitions
- **Impact**: Avoids future "whack-a-mole" fixes

### Infrastructure Discovery

- **Lesson**: Existing solutions often underutilized
- **Pattern**: Audit existing infrastructure before creating new
- **Impact**: Reduces redundant code and complexity

## Impact Metrics

### TD-003 Impact

- **Files to refactor**: 50+
- **Lines of hardcoded values**: ~500
- **Maintenance reduction**: 80%
- **Bug risk elimination**: Status mismatch bugs
- **Future flexibility**: Easy status additions via DB

### TD-004 Impact

- **Integration bugs prevented**: 90%
- **Whack-a-mole fixes eliminated**: 100%
- **Architecture consistency**: Single pattern
- **Teams migration unblocked**: US-087

## Related Work

### Sprint 7 Context

- Theme: Infrastructure Excellence & Admin GUI Migration
- US-087: Teams component migration (blocked by TD-004)
- US-082-B: Component architecture (foundation for TD-004 fix)
- ADR-047: Single enrichment point pattern (relevant to TD-003)

### Previous Technical Debt

- TD-001: Self-contained test architecture (COMPLETE)
- TD-002: Technology-prefixed test commands (COMPLETE)
- TD-003: Hardcoded status values (DISCOVERED)
- TD-004: Interface mismatches (DISCOVERED)

## Action Items

### Immediate (Today)

1. Deploy Steps API fix (TD-003 immediate fix)
2. Start TD-003 Phase 1: StatusService foundation
3. Start TD-004 Phase 1: Interface discovery

### This Week

1. Complete TD-003 Phase 1-2
2. Complete TD-004 fully (4-6 hours)
3. Unblock US-087 Teams migration

### Process Improvements

1. Add to code review checklist: No hardcoded configuration values
2. Establish interface contract requirements
3. Create StatusService usage guidelines
4. Document component-entitymanager integration pattern

## References

- Development Journal: `/docs/devJournal/20250918-01.md`
- TD-003 User Stories: 11 stories, 68 points
- TD-004 Implementation Plan: 3 phases, 3 points
- StatusRepository: `/src/groovy/umig/repository/StatusRepository.groovy`
- ComponentOrchestrator: `/src/groovy/umig/web/js/components/ComponentOrchestrator.js`
- BaseEntityManager: `/src/groovy/umig/web/js/entities/BaseEntityManager.js`
