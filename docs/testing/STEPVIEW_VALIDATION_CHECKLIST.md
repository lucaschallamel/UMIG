# StepView UI Refactoring Validation Checklist
**US-036 Phase 2 - Quality Assurance Protocol**

## Pre-Testing Validation ✅

### Environment Setup
- [ ] Local development environment running (`npm start`)
- [ ] Confluence accessible at `http://localhost:8090`
- [ ] Database connectivity confirmed
- [ ] Screenshot directories created
- [ ] Test data populated

### Code Review Checklist
- [ ] **Macro File**: `/src/groovy/umig/macros/v1/stepViewMacro.groovy`
  - [ ] URL parameter role detection implemented
  - [ ] Role logic correctly handles NORMAL, PILOT, ADMIN
  - [ ] CSS includes `iteration-view.css`
  - [ ] HTML structure uses IterationView classes
  - [ ] Mobile responsive styles included
  - [ ] JavaScript configuration correctly passed

- [ ] **JavaScript File**: `/src/groovy/umig/web/js/step-view.js`
  - [ ] StepViewCache class implemented
  - [ ] 2-second polling configuration
  - [ ] 30-second cache TTL
  - [ ] DOM manipulation uses correct selectors
  - [ ] Role-based UI element handling
  - [ ] Error handling implemented

## Test Execution Phase

### 1. Unit Test Validation ⚙️

**Command**: `npm run test:stepview:unit`

- [ ] **stepViewMacro.test.groovy** - Basic HTML generation
  - [ ] `should generate HTML with correct IterationView CSS classes`
  - [ ] `should include PILOT-specific features when user is PILOT`
  - [ ] `should hide ADMIN-only features for non-ADMIN users`
  - [ ] `should include mobile-responsive media queries`
  - [ ] `should configure 2-second polling and 30-second cache`
  - [ ] `should include enhanced features configuration`
  - [ ] `should include error and loading containers`

- [ ] **stepViewMacroRoleTest.groovy** - Role-based access control
  - [ ] `should correctly handle NORMAL user with no role parameter`
  - [ ] `should correctly handle PILOT user with no role parameter`
  - [ ] `should correctly handle ADMIN user with no role parameter`
  - [ ] `should override NORMAL user to PILOT with URL parameter`
  - [ ] `should override NORMAL user to ADMIN with URL parameter`
  - [ ] `should override PILOT user to ADMIN with URL parameter`
  - [ ] `should ignore invalid role parameters`
  - [ ] `should ignore role downgrades (ADMIN to NORMAL)`
  - [ ] `should generate correct JavaScript configuration for each role`
  - [ ] `should maintain security with role parameter override`
  - [ ] `should validate timing configuration matches IterationView`

**Success Criteria**: All unit tests pass (100% success rate)

### 2. Integration Test Validation 🔗

**Command**: `npm run test:stepview:integration`

- [ ] **stepViewJavaScriptSyncTest.js** - JavaScript-HTML synchronization
  - [ ] `should verify UMIG_STEP_CONFIG is properly initialized`
  - [ ] `should verify HTML structure matches expected CSS classes`
  - [ ] `should verify iteration-view.css is loaded and applied`
  - [ ] `should verify JavaScript DOM manipulation works correctly`
  - [ ] `should verify role-based UI elements display correctly`
  - [ ] `should verify caching and real-time sync configuration`
  - [ ] `should verify error handling and loading states`

**Role-based Integration Tests**:
- [ ] **NORMAL User Test** (`?role=NORMAL`)
  - [ ] Action buttons hidden
  - [ ] Bulk operations disabled
  - [ ] Read-only access confirmed

- [ ] **PILOT User Test** (`?role=PILOT`)
  - [ ] Update status button visible
  - [ ] Bulk complete button hidden
  - [ ] PILOT features enabled

- [ ] **ADMIN User Test** (`?role=ADMIN`)
  - [ ] All buttons visible
  - [ ] Bulk operations enabled
  - [ ] Full administrative access

**Success Criteria**: All integration tests pass, role-based access working correctly

### 3. UAT Test Validation 🎯

**Command**: `npm run test:stepview:uat`

- [ ] **stepview-alignment-uat.test.js** - Complete UI validation
  - [ ] `should load StepView page and verify initial state`
    - [ ] Page loads in <3 seconds
    - [ ] Initial screenshot captured
    - [ ] Performance requirement met

  - [ ] `should verify CSS alignment with IterationView styling`
    - [ ] iteration-view.css detected or styles applied
    - [ ] Container structure with correct classes
    - [ ] Container screenshot captured

  - [ ] `should verify header and status elements`
    - [ ] Header with `.step-header` class found
    - [ ] Status badge with `.status-badge` class found
    - [ ] Header screenshot captured

  - [ ] `should verify instructions and comments sections`
    - [ ] Instructions container found
    - [ ] Comments container found
    - [ ] Content sections screenshot captured

  - [ ] `should verify PILOT role-based access control (RBAC)`
    - [ ] Update status button found for PILOT role
    - [ ] Role indicator displayed correctly
    - [ ] PILOT button screenshot captured

  - [ ] `should test mobile responsiveness`
    - [ ] Mobile viewport (375px width) tested
    - [ ] Content accessible on mobile
    - [ ] Container width respects mobile constraints
    - [ ] Mobile screenshot captured

  - [ ] `should verify complete page structure and take comprehensive screenshots`
    - [ ] Page title contains 'UMIG'
    - [ ] No JavaScript errors detected
    - [ ] Page structure logged for debugging
    - [ ] Final state screenshot captured

**Success Criteria**: 100% UAT pass rate, all screenshots captured successfully

## Quality Gates Evaluation 🚪

### Critical Quality Gates
- [ ] **Test Success Rate**: 100% (no failed tests)
- [ ] **Performance Baseline**: Page load <3 seconds
- [ ] **Role-based Security**: All role tests pass
- [ ] **Mobile Responsiveness**: 100% mobile compatibility
- [ ] **CSS Alignment**: IterationView styling consistency
- [ ] **JavaScript Sync**: DOM manipulation working correctly

### Performance Metrics
- [ ] **Load Time**: < 3000ms (target from US-028)
- [ ] **Cache Performance**: 30-second TTL working
- [ ] **Polling Performance**: 2-second interval not impacting UX
- [ ] **Memory Usage**: No memory leaks detected

### Security Validation
- [ ] **Role Parameter Security**: URL tampering handled safely
- [ ] **Authentication**: Confluence authentication preserved
- [ ] **Permission Escalation**: NORMAL users can't access ADMIN features
- [ ] **Session Security**: Role override doesn't persist

## Cross-Browser Compatibility 🌐

### Desktop Browsers
- [ ] **Chrome** (Primary): Full functionality
- [ ] **Firefox**: UI alignment and functionality
- [ ] **Safari**: MacOS compatibility
- [ ] **Edge**: Windows compatibility

### Mobile Browsers
- [ ] **Mobile Safari**: iOS compatibility
- [ ] **Chrome Mobile**: Android compatibility
- [ ] **Responsive Design**: 375px viewport working

## Accessibility Validation ♿

- [ ] **WCAG 2.1 AA**: Screen reader compatibility
- [ ] **Keyboard Navigation**: Tab order working correctly
- [ ] **Color Contrast**: Minimum 4.5:1 ratio maintained
- [ ] **Focus Indicators**: Visible focus states
- [ ] **Alt Text**: Images have appropriate alt attributes

## Pre-Commit Final Checklist ✅

### Automated Validation
- [ ] Run: `npm run test:stepview:all`
- [ ] All tests pass (0 failures)
- [ ] Quality gates satisfied
- [ ] Performance benchmarks met

### Manual Verification
- [ ] Visual review of screenshots
- [ ] No visual regressions detected
- [ ] Role-based functionality confirmed
- [ ] Mobile layout acceptable

### Documentation Updates
- [ ] Test results documented
- [ ] Screenshots archived appropriately
- [ ] Issues logged in backlog if any
- [ ] Success criteria validated

## Risk Assessment & Rollback Plan 🚨

### High-Risk Areas Verified
- [ ] **Role Parameter Security**: URL tampering attempts blocked
- [ ] **JavaScript-HTML Sync**: No mismatched selectors
- [ ] **CSS Override Conflicts**: No style conflicts with IterationView
- [ ] **Cache Invalidation**: No stale data issues
- [ ] **Mobile Layout**: No responsive design breakage

### Rollback Readiness
- [ ] Git commit ready for revert if needed
- [ ] Backup of previous working version available
- [ ] Rollback procedure documented and tested

## Execution Commands Summary 📋

```bash
# Quick validation (5-10 minutes)
npm run test:us036:quick

# Full comprehensive validation (15-20 minutes)  
npm run test:us036

# Role-specific testing
node scripts/test-stepview-validation.js --role PILOT
node scripts/test-stepview-validation.js --role ADMIN

# Mobile-focused testing
node scripts/test-stepview-validation.js --mobile

# Performance-focused testing
node scripts/test-stepview-validation.js --performance

# Full validation with detailed logging
node scripts/test-stepview-validation.js --full --verbose
```

## Success Criteria Summary ✅

**PASS Criteria**:
- ✅ 100% test pass rate (0 failures)
- ✅ Page load time <3 seconds
- ✅ All role-based features working
- ✅ Mobile responsiveness confirmed  
- ✅ CSS alignment with IterationView achieved
- ✅ JavaScript-HTML synchronization working
- ✅ No security vulnerabilities detected

**FAIL Criteria** (Do NOT commit if any apply):
- ❌ Any test failures
- ❌ Page load time >3 seconds
- ❌ Role-based access not working
- ❌ Mobile layout broken
- ❌ CSS conflicts with IterationView
- ❌ JavaScript errors detected

---

**Validation Completed**: ___/___/___ by: _____________  
**Quality Gate Status**: PASS ✅ / FAIL ❌  
**Commit Approved**: YES ✅ / NO ❌

*This checklist must be completed before committing US-036 Phase 2 changes.*