# US-036 StepView Status Display - Manual Testing Checklist

## Quick Start Testing Guide

**Time Required**: ~30 minutes  
**Prerequisites**: Access to UMIG StepView with a valid step ID

### 🎯 Test Objectives

Validate that status display shows correctly based on user roles:

- **Formal roles** (NORMAL, PILOT, ADMIN): Show dropdown controls only
- **Non-formal roles** (or no role): Show static status badge only
- **No redundancy**: Never show both badge and dropdown simultaneously

---

## ✅ Test Case 1: ADMIN Role (Already Confirmed ✅)

**Status**: PASSED - Current working behavior confirmed by user

**URL**: `/display/UMIG/Step+View?stepid=ABC123&role=admin`

**Expected Behavior**:

- ✅ Status dropdown visible and functional
- ✅ Static status badge hidden
- ✅ User can change status via dropdown

**Validation**:

- [x] No static badge visible in DOM
- [x] Dropdown is populated and functional
- [x] Console shows: "Skipping badge updates for ADMIN user"

---

## 🔄 Test Case 2: PILOT Role

**URL**: `/display/UMIG/Step+View?stepid=ABC123&role=pilot`

**Expected Behavior**:

- [ ] Status dropdown visible and functional
- [ ] Static status badge hidden
- [ ] User can interact with status controls

**Validation Steps**:

1. [ ] Navigate to URL with `&role=pilot`
2. [ ] Open browser dev tools (F12)
3. [ ] Inspect DOM: Verify no `.status-badge` elements are visible
4. [ ] Inspect DOM: Verify `#step-status-dropdown` is visible
5. [ ] Check console for: "Skipping badge updates for PILOT user"
6. [ ] Test dropdown functionality (if applicable)

**Results**:

- Status: [ ] PASS [ ] FAIL
- Notes: **\*\***\*\***\*\***\_\_\_\_**\*\***\*\***\*\***

---

## 📖 Test Case 3: NORMAL Role

**URL**: `/display/UMIG/Step+View?stepid=ABC123&role=normal`

**Expected Behavior**:

- [ ] No status controls visible (read-only)
- [ ] Static status badge hidden
- [ ] Status dropdown hidden

**Validation Steps**:

1. [ ] Navigate to URL with `&role=normal`
2. [ ] Verify both status badge and dropdown are hidden
3. [ ] Confirm interface is read-only
4. [ ] Check console for: "Skipping badge updates for NORMAL user"

**Results**:

- Status: [ ] PASS [ ] FAIL
- Notes: **\*\***\*\***\*\***\_\_\_\_**\*\***\*\***\*\***

---

## 🔑 Test Case 4: Default User (KEY TEST)

**URL**: `/display/UMIG/Step+View?stepid=ABC123` (NO role parameter)

**Expected Behavior**:

- [ ] Static status badge visible with proper styling
- [ ] Status dropdown hidden
- [ ] Badge shows current status with correct color

**Validation Steps**:

1. [ ] Navigate to URL WITHOUT `&role=` parameter
2. [ ] Inspect DOM: Verify `.status-badge` elements are present and visible
3. [ ] Inspect DOM: Verify dropdown elements are hidden
4. [ ] Check badge text and color match the current status
5. [ ] Console should NOT show "Skipping badge updates" message
6. [ ] Console should show badge update messages

**Browser Console Commands**:

```javascript
// Check current role and badge logic
console.log("Current Role:", window.stepView?.userRole);
console.log(
  "Should show badge:",
  !["NORMAL", "PILOT", "ADMIN"].includes(window.stepView?.userRole),
);

// Inspect badge elements
const badges = document.querySelectorAll(".status-badge");
console.log("Badge elements found:", badges.length);
badges.forEach((badge, i) => {
  console.log(
    `Badge ${i + 1}:`,
    badge.textContent,
    badge.style.display !== "none" ? "VISIBLE" : "HIDDEN",
  );
});
```

**Results**:

- Status: [ ] PASS [ ] FAIL
- Badge visible: [ ] YES [ ] NO
- Badge text: **\*\***\*\***\*\***\_\_\_\_**\*\***\*\***\*\***
- Badge color: **\*\***\*\***\*\***\_\_\_\_**\*\***\*\***\*\***
- Console messages: **\*\***\*\***\*\***\_\_\_\_**\*\***\*\***\*\***

---

## 🚫 Test Case 5: Invalid Role

**URL**: `/display/UMIG/Step+View?stepid=ABC123&role=guest`

**Expected Behavior**:

- [ ] Invalid role ignored, falls back to default behavior
- [ ] Static status badge visible
- [ ] Status dropdown hidden

**Validation Steps**:

1. [ ] Navigate to URL with `&role=guest` (invalid role)
2. [ ] Verify same behavior as Test Case 4 (default user)
3. [ ] Badge should be visible, dropdown hidden

**Results**:

- Status: [ ] PASS [ ] FAIL
- Notes: **\*\***\*\***\*\***\_\_\_\_**\*\***\*\***\*\***

---

## 🔍 Test Case 6: Edge Cases

### 6a. Empty Role Parameter

**URL**: `/display/UMIG/Step+View?stepid=ABC123&role=`

**Expected**: Should show static badge (invalid role ignored)
**Result**: [ ] PASS [ ] FAIL

### 6b. Multiple Role Parameters

**URL**: `/display/UMIG/Step+View?stepid=ABC123&role=admin&role=pilot`

**Expected**: Should use first role (admin) - dropdown visible
**Result**: [ ] PASS [ ] FAIL

### 6c. Case Sensitivity

**URL**: `/display/UMIG/Step+View?stepid=ABC123&role=Admin`

**Expected**: Should show static badge (case-sensitive check)
**Result**: [ ] PASS [ ] FAIL

---

## 🛠️ Debugging Tools

### Browser Console Validation Commands

```javascript
// 1. Check current configuration
console.log("Current Role:", window.stepView?.userRole);
console.log("Config:", window.UMIG_STEP_CONFIG?.user);

// 2. Validate badge visibility logic
const currentRole = window.stepView?.userRole;
console.log(
  "Should show badge:",
  !["NORMAL", "PILOT", "ADMIN"].includes(currentRole),
);

// 3. Count DOM elements
const badges = document.querySelectorAll(".status-badge");
const dropdowns = document.querySelectorAll('[id*="step-status-dropdown"]');
console.log(`Found ${badges.length} badges, ${dropdowns.length} dropdowns`);

// 4. Check for redundancy
const visibleBadges = Array.from(badges).filter(
  (b) => b.offsetWidth > 0,
).length;
const visibleDropdowns = Array.from(dropdowns).filter(
  (d) => d.offsetWidth > 0,
).length;
console.log(`Visible: ${visibleBadges} badges, ${visibleDropdowns} dropdowns`);
if (visibleBadges > 0 && visibleDropdowns > 0) {
  console.error("🚨 REDUNDANCY DETECTED: Both badge and dropdown visible!");
}
```

---

## 📊 Results Summary

| Test Case    | Status        | Expected      | Actual        | Notes             |
| ------------ | ------------- | ------------- | ------------- | ----------------- |
| Admin Role   | ✅ PASS       | Dropdown only | Dropdown only | Confirmed working |
| Pilot Role   | [ ] PASS/FAIL | Dropdown only | **\_\_\_**    | **\_\_\_**        |
| Normal Role  | [ ] PASS/FAIL | No controls   | **\_\_\_**    | **\_\_\_**        |
| Default User | [ ] PASS/FAIL | Badge only    | **\_\_\_**    | **\_\_\_**        |
| Invalid Role | [ ] PASS/FAIL | Badge only    | **\_\_\_**    | **\_\_\_**        |
| Edge Cases   | [ ] PASS/FAIL | Various       | **\_\_\_**    | **\_\_\_**        |

### Critical Issues Found

- [ ] None
- [ ] Badge and dropdown both visible (CRITICAL)
- [ ] Badge not showing for non-formal roles
- [ ] Dropdown not showing for formal roles
- [ ] Console errors or warnings
- [ ] Other: **\*\***\*\***\*\***\_\_\_\_**\*\***\*\***\*\***

### Overall Status

- [ ] ✅ All tests PASSED - Ready for production
- [ ] ⚠️ Minor issues found - Needs attention
- [ ] ❌ Major issues found - Requires fixes

---

## 📋 Next Steps

### If All Tests Pass

1. [ ] Document successful validation
2. [ ] Update test results in testing strategy
3. [ ] Proceed with UAT sign-off
4. [ ] Deploy to next environment

### If Tests Fail

1. [ ] Document specific failures and error messages
2. [ ] Create bug tickets with reproduction steps
3. [ ] Analyze root cause in implementation
4. [ ] Retest after fixes

### Follow-up Actions

1. [ ] Create automated test script for future regression testing
2. [ ] Update user documentation for role-based behavior
3. [ ] Monitor production logs for role detection issues
4. [ ] Set up alerts for redundant status display detection

---

## 🔧 Quick Fix Commands (If Needed)

### Force Role Override (Temporary Testing)

```javascript
// Force role change for testing (browser console)
if (window.stepView) {
  window.stepView.userRole = "GUEST"; // or any test role
  console.log("Role changed to:", window.stepView.userRole);
  // Refresh page or re-run initialization
}
```

### Reset Configuration

```javascript
// Reset config for testing
window.UMIG_STEP_CONFIG.user.role = null;
location.reload(); // Refresh page
```

---

**Testing Complete**: **_/_**/**\_**  
**Tester**: **\*\***\*\***\*\***\_\_\_\_**\*\***\*\***\*\***  
**Environment**: **\*\***\*\***\*\***\_\_\_\_**\*\***\*\***\*\***  
**Overall Result**: [ ] PASSED [ ] FAILED [ ] NEEDS REVIEW
