# TD-008: Legacy populateFilter Function Migration

**Type**: Technical Debt
**Sprint**: 7 (or future)
**Priority**: LOW
**Impact**: Code Cleanup / Maintenance
**Story Points**: 2
**Status**: TODO

## Problem Statement

The iteration-view.js file contains legacy `populateFilter` functions that are deprecated and should be migrated to use the new StatusProvider pattern. Console warnings indicate these functions are still being called but are no longer actively used in the application logic.

### Current Console Warnings

```
Legacy populateFilter function called for plan
Legacy populateFilter function called for sequence
Legacy populateFilter function called for phase
Legacy populateFilter function called for team
Legacy populateFilter function called for label
```

## Technical Context

### Current Implementation

- **Location**: `/src/groovy/umig/web/js/iteration-view.js` (lines ~420-530)
- **Pattern**: Direct DOM manipulation with hardcoded options
- **Security**: Limited XSS protection
- **Maintenance**: Duplicated code across filter types

### Target Implementation

- **Pattern**: StatusProvider centralized service
- **Security**: Enterprise-grade security with sanitization
- **Maintenance**: Single source of truth for status management

## Scope of Work

### Phase 1: Assessment

1. Identify all references to `populateFilter` functions
2. Map dependencies and call chains
3. Document current filter population logic

### Phase 2: Migration

1. Extend StatusProvider to handle filter population for:
   - Plan filters
   - Sequence filters
   - Phase filters
   - Team filters
   - Label filters

2. Update iteration-view.js to:
   - Remove legacy `populateFilter` functions
   - Use StatusProvider for all filter population
   - Maintain backward compatibility during transition

### Phase 3: Validation

1. Test all filter functionality
2. Verify no regressions in filtering behavior
3. Confirm console warnings are eliminated

## Implementation Details

### Files to Modify

- `/src/groovy/umig/web/js/iteration-view.js` - Remove legacy functions
- `/src/groovy/umig/web/js/utils/StatusProvider.js` - Add filter population methods

### Example Migration Pattern

```javascript
// Before (Legacy)
function populatePlanFilter(plans) {
  const filterElement = document.getElementById("plan-filter");
  filterElement.innerHTML = '<option value="">All Plans</option>';
  plans.forEach((plan) => {
    const option = document.createElement("option");
    option.value = plan.id;
    option.textContent = plan.name;
    filterElement.appendChild(option);
  });
}

// After (StatusProvider)
async function updatePlanFilter() {
  const statusProvider = window.StatusProvider.getInstance();
  await statusProvider.populateFilter("plan-filter", "Plan", plans);
}
```

## Benefits

1. **Code Reduction**: ~100 lines of duplicated filter code
2. **Security**: Centralized XSS/CSRF protection
3. **Maintainability**: Single source for filter population logic
4. **Consistency**: Aligned with ADR-058 security patterns

## Risks

- **LOW**: Functions are already deprecated and not critical to operation
- Console warnings are cosmetic and don't affect functionality
- Migration can be done incrementally without breaking changes

## Acceptance Criteria

1. ✅ All legacy `populateFilter` functions removed
2. ✅ StatusProvider handles all filter population
3. ✅ No console warnings about legacy functions
4. ✅ All filters work as expected
5. ✅ Security enhanced with proper sanitization

## Dependencies

- Completion of StatusProvider implementation (DONE)
- Understanding of current filter usage patterns

## Notes

This is a cleanup task that improves code quality but doesn't add new functionality. It can be scheduled for any future sprint when there's capacity for maintenance work.

The warnings don't affect application functionality - they're informational only and indicate technical debt that should eventually be addressed.
