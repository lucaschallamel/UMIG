# StepView QA Framework - Immediate Execution Guide
**US-036 Phase 2 - Execute Now to Validate Changes**

## ⚡ Quick Start (5 minutes)

Execute these commands immediately to validate your StepView changes:

```bash
# Navigate to project root
cd /Users/lucaschallamel/Documents/GitHub/UMIG

# Ensure environment is running
cd local-dev-setup
npm start

# Execute comprehensive StepView validation
npm run test:us036

# If you want quick validation only
npm run test:us036:quick
```

## 🔍 Step-by-Step Execution

### Step 1: Environment Check
```bash
cd /Users/lucaschallamel/Documents/GitHub/UMIG/local-dev-setup

# Verify services are running
curl -s -o /dev/null -w "%{http_code}" http://localhost:8090
# Should return: 200

# Verify database
npm run test:integration:core --quick
```

### Step 2: Execute Unit Tests
```bash
# Test macro HTML generation
npm run test:stepview:unit:macro

# Test role-based access control
npm run test:stepview:unit:role

# View results
echo "Unit test results completed"
```

### Step 3: Execute Integration Tests  
```bash
# Test JavaScript-HTML synchronization
npm run test:stepview:integration

# Test role-based UI elements
npm run test:stepview:integration:rbac

# View results
echo "Integration test results completed"
```

### Step 4: Execute UAT Tests
```bash
# Full UAT validation
npm run test:stepview:uat

# Mobile responsiveness
npm run test:stepview:uat:mobile

# Performance validation
npm run test:stepview:uat:performance

# View results and screenshots
ls -la ../src/groovy/umig/tests/uat/screenshots/
```

## 🚨 Critical Issues to Watch For

### 1. Role-Based Access Control
**Test**: URL parameter override functionality
```bash
# Test specific roles
node scripts/test-stepview-validation.js --role NORMAL
node scripts/test-stepview-validation.js --role PILOT  
node scripts/test-stepview-validation.js --role ADMIN
```

**Expected Results**:
- NORMAL: No action buttons visible
- PILOT: Update Status button visible, Bulk Complete hidden
- ADMIN: All buttons visible

### 2. HTML Structure Alignment
**Test**: CSS classes match IterationView
```bash
# Check for these classes in browser console:
# .step-details-container
# .step-header
# .step-content
# .instructions-container
# .comments-container
```

**Expected Results**:
- All IterationView CSS classes present
- iteration-view.css loaded
- Mobile responsive (768px breakpoint)

### 3. JavaScript Synchronization
**Test**: DOM manipulation working correctly
```bash
# Browser console check:
# window.UMIG_STEP_CONFIG should exist
# StepViewCache should be defined
# Polling should work (2-second interval)
```

**Expected Results**:
- Configuration object properly populated
- Cache working with 30-second TTL
- Real-time synchronization active

## 📊 Quality Gate Validation

After running tests, verify these quality gates:

### ✅ PASS Criteria
- [ ] All unit tests pass (0 failures)
- [ ] All integration tests pass (0 failures)  
- [ ] All UAT tests pass (0 failures)
- [ ] Page loads in <3 seconds
- [ ] Screenshots show correct UI layout
- [ ] No JavaScript console errors
- [ ] Mobile layout works at 375px width
- [ ] Role-based features function correctly

### ❌ FAIL Criteria (DO NOT COMMIT)
- [ ] Any test failures
- [ ] Page load time >3 seconds
- [ ] Missing CSS classes from IterationView
- [ ] Broken role-based access control
- [ ] Mobile layout issues
- [ ] JavaScript errors in console
- [ ] DOM synchronization problems

## 🔧 Troubleshooting Common Issues

### Issue 1: Tests Not Finding Files
```bash
# Check file paths exist:
ls -la src/groovy/umig/macros/v1/stepViewMacro.groovy
ls -la src/groovy/umig/web/js/step-view.js
ls -la src/groovy/umig/tests/unit/stepViewMacro*.groovy
```

### Issue 2: Environment Not Running
```bash
# Start the environment:
cd local-dev-setup
npm start

# Wait 2 minutes for full startup
# Verify: http://localhost:8090
```

### Issue 3: Database Connection Issues
```bash
# Check database:
npm run test:integration --quick

# Regenerate data if needed:
npm run generate-data:erase
```

### Issue 4: Screenshots Not Generated
```bash
# Create directory:
mkdir -p src/groovy/umig/tests/uat/screenshots

# Check permissions:
chmod 755 src/groovy/umig/tests/uat/screenshots
```

## 📸 Screenshot Validation

After running UAT tests, review these screenshots:

**Expected Screenshots** (should be created automatically):
- `stepview-initial-load.png` - Page loads correctly
- `stepview-container.png` - Container structure
- `stepview-header.png` - Header with status badge
- `stepview-content-sections.png` - Instructions and comments
- `stepview-pilot-button.png` - PILOT role features
- `stepview-mobile.png` - Mobile responsiveness
- `stepview-final-state.png` - Complete UI

**Manual Review**:
1. Open each screenshot
2. Verify UI looks consistent with IterationView
3. Check mobile layout is responsive
4. Confirm role-based elements appear correctly

## ⚡ Express Validation (2 minutes)

If you need fastest possible validation:

```bash
# Quick smoke test
npm run test:stepview:unit:macro && npm run test:stepview:uat:performance

# Check result
echo $? 
# 0 = success, non-zero = failure
```

## 🎯 Final Validation Commands

**Before committing, run this exact sequence:**

```bash
# Full validation suite
npm run test:us036

# Check exit code
if [ $? -eq 0 ]; then
  echo "✅ VALIDATION PASSED - Safe to commit"
else
  echo "❌ VALIDATION FAILED - Do not commit"
fi
```

## 📋 Results Interpretation

### Success Output Example:
```
🚀 StepView UI Refactoring Validation - US-036 Phase 2
✅ Unit Tests - Macro Generation - PASSED
✅ Unit Tests - Role-Based Access - PASSED  
✅ Integration Tests - JavaScript Sync - PASSED
✅ UAT Tests - Complete UI Validation - PASSED
📈 Validation Summary:
✅ Passed: 12
❌ Failed: 0
🎯 Success Rate: 100.0%
✅ VALIDATION PASSED - Code is ready for commit
```

### Failure Output Example:
```
❌ Integration Tests - JavaScript Sync - FAILED
❌ UAT Tests - Complete UI Validation - FAILED
📈 Validation Summary:
✅ Passed: 8
❌ Failed: 4
🎯 Success Rate: 66.7%
❌ VALIDATION FAILED - Do not commit broken code
```

## 🆘 Emergency Rollback

If validation fails and you need to rollback:

```bash
# Revert recent changes
git log --oneline -5
git revert HEAD

# Or reset to previous working state
git reset --hard HEAD~1

# Verify rollback worked
npm run test:us036:quick
```

---

**Execute this validation NOW before committing any US-036 Phase 2 changes.**

**Time Investment**: 10-15 minutes for comprehensive validation  
**Benefit**: Prevents broken code commits and maintains quality standards  
**Requirement**: MANDATORY before any US-036 related commits