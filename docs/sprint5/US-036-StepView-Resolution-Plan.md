# US-036 StepView UI Refactoring - Resolution Plan

**Date**: August 19, 2025  
**Sprint**: 5 (Days 3-4)  
**Story Points**: 3  
**Priority**: High (MVP Completion)

## Executive Summary

Complete visual alignment between IterationView StepView pane (source of truth) and standalone StepView macro to achieve 100% consistency across UMIG platform. Analysis reveals 8 critical visual inconsistencies requiring structured resolution approach.

## Problem Analysis

### Backend Status: ✅ VALIDATED

- API endpoints: 100% functional
- Data delivery: Confirmed correct for BGO-002 test case
- Test case BGO-002: All data elements properly returned

### Frontend Status: 🔧 REQUIRES ALIGNMENT

**Key Differences Identified:**

| Component              | IterationView (Source of Truth)                 | StepView Standalone                             | Issue                   |
| ---------------------- | ----------------------------------------------- | ----------------------------------------------- | ----------------------- |
| **Title Structure**    | `<h3>📋 ${StepCode} - ${Name}</h3>`             | `<h2 class="step-name">...`                     | HTML level mismatch     |
| **Breadcrumb Order**   | Migration › Plan › Iteration › Sequence › Phase | Migration › Iteration › Plan › Sequence › Phase | Wrong sequence          |
| **Status Display**     | Dropdown with populateStatusDropdown()          | Badge with createStatusBadge()                  | Different mechanisms    |
| **Team Property**      | `summary.AssignedTeam`                          | `summary.AssignedTeamName`                      | Property mapping issue  |
| **Labels Section**     | Proper section wrapper                          | Missing wrapper structure                       | Structure inconsistency |
| **Instructions Table** | 6 columns with specific headers                 | Different column structure                      | Table mismatch          |
| **CSS Approach**       | Clean CSS classes                               | Excessive inline styles                         | Styling approach        |
| **Component Methods**  | Integrated with IterationView                   | Standalone class methods                        | Architecture difference |

## Resolution Strategy

### Phase 1: Critical Structure Alignment (Day 3 AM)

**GENDEV Agent**: Code Reviewer (Frontend Focus)  
**Duration**: 4 hours  
**Priority**: P0 (Blocking)

#### Objectives:

1. **HTML Structure Harmonization**
   - Change StepView `<h2>` to `<h3>` to match IterationView
   - Align CSS class naming conventions
   - Remove excessive inline style overrides

2. **Breadcrumb Sequence Fix**
   - **Current**: Migration › Iteration › Plan › Sequence › Phase
   - **Target**: Migration › Plan › Iteration › Sequence › Phase
   - Update breadcrumb rendering order in `renderStepView()` method

3. **Data Property Mapping**
   - Standardize team property usage (`AssignedTeam` vs `AssignedTeamName`)
   - Ensure consistent property references across both views
   - Validate all data mapping points

#### Files to Modify:

- `/src/groovy/umig/web/js/step-view.js` (lines 1801-1850)
- Focus on `renderStepView()` method alignment

#### Validation Criteria:

- [ ] HTML structure matches IterationView exactly
- [ ] Breadcrumb order follows IterationView sequence
- [ ] No inline style overrides present
- [ ] All data properties map correctly

### Phase 2: Component Behavior Harmonization (Day 3 PM)

**GENDEV Agent**: Design Reviewer (UI/UX Focus)  
**Duration**: 4 hours  
**Priority**: P0 (Blocking)

#### Objectives:

1. **Status Display Alignment**
   - Implement dropdown rendering mechanism matching IterationView
   - Ensure role-based controls work identically
   - Align status loading and update behaviors

2. **Labels Section Standardization**
   - Add proper section wrapper structure
   - Match IterationView labels rendering exactly
   - Ensure color and contrast calculations align

3. **Instructions Table Harmonization**
   - Align column headers and structure
   - Match instruction ordering and formatting
   - Ensure completion checkbox behavior is identical

#### Files to Modify:

- `renderStepView()` method (status section)
- `renderLabels()` method (structure alignment)
- `renderInstructions()` method (table structure)

#### Validation Criteria:

- [ ] Status dropdown renders identically
- [ ] Labels section structure matches exactly
- [ ] Instructions table has identical columns and headers
- [ ] All interactive elements behave consistently

### Phase 3: Visual Validation & Testing (Day 4 AM)

**GENDEV Agent**: QA Coordinator (Testing Focus)  
**Duration**: 4 hours  
**Priority**: P1 (Critical)

#### Objectives:

1. **40-Point Validation Checklist Execution**
   - Complete BGO-002 visual validation checklist
   - Document all pass/fail results
   - Identify any remaining discrepancies

2. **Cross-Role Testing**
   - Test NORMAL user role (read-only view)
   - Test PILOT user role (edit capabilities)
   - Test ADMIN user role (full access)

3. **Browser Compatibility**
   - Chrome, Firefox, Safari testing
   - Mobile responsive behavior validation
   - Performance impact assessment

#### Validation Framework:

```markdown
## Section 1: Breadcrumb Navigation ✅

- [x] Migration Name: Shows "Migration 1"
- [x] Iteration Name: Shows "RUN Iteration 2"
- [x] Plan Name: Shows correct plan name
- [x] Sequence Name: Shows "Sequence 1"
- [x] Phase Name: Shows "Phase 1"
- [x] Separator: Uses "›" between items

## Section 2: Step Header ✅

- [x] Step Code: Displays as "BGO-002"
- [x] Step Name: Shows step master name after dash
- [x] Icon: Shows appropriate step type icon
- [x] Title Format: "BGO-002 - [Step Name]"

... [Continue for all 40 points]
```

### Phase 4: Integration Testing & Documentation (Day 4 PM)

**GENDEV Agent**: Documentation Generator  
**Duration**: 2 hours  
**Priority**: P2 (Important)

#### Objectives:

1. **Documentation Updates**
   - Update visual consistency guide
   - Document component alignment decisions
   - Create cross-reference architecture guide

2. **Final Validation Report**
   - Generate comprehensive test results
   - Document performance impact
   - Create maintenance guidelines

## Risk Assessment & Mitigation

### High Risk Items:

1. **CSS Conflict Resolution** - Inline styles may override shared CSS
   - **Mitigation**: Remove all inline styles, use CSS classes only
2. **Data Property Dependencies** - Different property names may break functionality
   - **Mitigation**: Systematic testing of all data mappings

3. **Role-based Control Alignment** - Security implications if controls differ
   - **Mitigation**: Comprehensive role-based testing

### Medium Risk Items:

1. **Browser Compatibility** - Different rendering across browsers
   - **Mitigation**: Cross-browser testing in Phase 3

2. **Performance Impact** - Changes may affect load times
   - **Mitigation**: Performance baseline comparison

## Success Criteria

### Definition of Done:

- [ ] All 40 validation points pass for BGO-002 test case
- [ ] Zero visual differences between IterationView pane and standalone view
- [ ] All user roles (NORMAL, PILOT, ADMIN) function identically
- [ ] Performance impact < 5% of baseline
- [ ] Cross-browser compatibility maintained
- [ ] Code review approval from frontend team
- [ ] QA sign-off on visual consistency

### Key Performance Indicators:

- **Visual Consistency Score**: 100% (40/40 validation points)
- **Cross-Role Functionality**: 100% identical behavior
- **Performance Impact**: <5% degradation
- **Browser Support**: Chrome, Firefox, Safari full compatibility

## Timeline & Dependencies

### Critical Path:

```
Day 3 AM: Phase 1 (Structure) → Day 3 PM: Phase 2 (Behavior) → Day 4 AM: Phase 3 (Testing) → Day 4 PM: Phase 4 (Documentation)
```

### Dependencies:

- **Upstream**: Backend validation complete ✅
- **Downstream**: Sprint 5 MVP delivery (August 22)
- **External**: No external dependencies

### Contingency Plan:

If issues arise:

1. **Day 3**: Focus on critical structure alignment only
2. **Day 4**: Prioritize testing over documentation
3. **Escalation**: Involve senior developer if complex CSS conflicts arise

## Agent Assignments & Contact

### Primary Agents:

1. **Code Reviewer** (Frontend): Structure alignment and property mapping
2. **Design Reviewer** (UI/UX): Visual consistency and component behavior
3. **QA Coordinator** (Testing): Validation execution and cross-role testing
4. **Documentation Generator**: Final documentation and reporting

### Coordination Protocol:

- **Daily Standup**: 9 AM status updates
- **Mid-day Check**: 1 PM progress review
- **End-of-day**: 5 PM completion confirmation
- **Escalation**: Immediate for blocking issues

## Approval & Sign-off

**Plan Approved By**: ********\_********  
**Technical Lead**: ********\_********  
**QA Lead**: ********\_********  
**Date**: August 19, 2025

---

_This resolution plan ensures 100% visual alignment between StepView components while maintaining all functional requirements and security controls._
