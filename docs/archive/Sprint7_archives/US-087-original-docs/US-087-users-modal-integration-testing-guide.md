# US-087 Users Modal Integration Testing Guide

**Sprint**: Sprint 7
**Component**: Users Modal Integration (Phase 2)
**Implementation Date**: 2025-09-22
**Status**: ✅ READY FOR TESTING

## Overview

This document provides comprehensive testing instructions for the integration of the new ModalComponent with the Users "Add New User" button, replacing the legacy modal implementation as part of US-087 Phase 2.

## Changes Made

### 1. AdminGuiController.js

- Updated `addNewBtn` click handler to detect current section
- For Users entity: delegate to `UsersEntityManager.handleAdd()`
- For other entities: fallback to legacy `window.ModalManager.showEditModal(null)`

### 2. admin-gui.js

- Updated `addNewBtn` click handler with similar delegation logic
- Uses `this.componentManagers.users.handleAdd()` for Users entity
- Fallback to `this.showEditModal(null)` for other entities

## Pre-Testing Setup

1. Ensure the UMIG development stack is running (`npm start`)
2. Navigate to Confluence Admin GUI: http://localhost:8090/plugins/servlet/umig-admin
3. Log in and navigate to the Users section

## Critical Test Scenarios

### Test Case 1: New Modal Integration ⭐ PRIORITY

**Objective**: Verify the "Add New User" button opens the new ModalComponent

**Steps**:

1. Navigate to Users section in Admin GUI
2. Click the "Add New User" button in the banner
3. Verify the modal that opens has:
   - Title: "Add New User"
   - Form fields: User Code, First Name, Last Name, Email, Active, Administrator Role
   - Proper validation messages
   - Cancel and Save buttons

**Expected Result**:

- Modern ModalComponent opens (not legacy modal)
- Console shows: `[AdminGuiController] Delegating Add New User to UsersEntityManager` or `[AdminGUI] Delegating Add New User to UsersEntityManager`
- Console shows: `[UsersEntityManager] Opening Add User modal`

### Test Case 2: User Creation Workflow ⭐ PRIORITY

**Objective**: Test complete user creation workflow

**Steps**:

1. Open "Add New User" modal (from Test Case 1)
2. Fill in valid user data:
   - User Code: `test.user.$(timestamp)`
   - First Name: `Test`
   - Last Name: `User`
   - Email: `test.user@example.com`
   - Active: checked
   - Administrator Role: unchecked
3. Click "Save"

**Expected Result**:

- Modal closes automatically on success
- Success notification appears: "User Test User has been created successfully"
- Users table refreshes and shows the new user
- Console shows: `[UsersEntityManager] User created successfully`

### Test Case 3: Form Validation 🔒 SECURITY

**Objective**: Test form validation works properly

**Steps**:

1. Open "Add New User" modal
2. Try to submit with empty required fields
3. Try to submit with invalid email format
4. Try to submit with invalid user code (special characters)

**Expected Result**:

- Modal remains open with validation errors
- Appropriate error messages displayed for each field
- Form does not submit until all validation passes

### Test Case 4: Error Handling 🔒 SECURITY

**Objective**: Test error handling for duplicate users

**Steps**:

1. Create a user with user code `duplicate.test`
2. Try to create another user with the same user code

**Expected Result**:

- Modal remains open
- Error notification appears with appropriate message
- Console shows error details

### Test Case 5: Fallback for Other Entities 🔄 COMPATIBILITY

**Objective**: Verify other entities still use legacy modal

**Steps**:

1. Navigate to Teams section
2. Click "Add New Team" button
3. Verify legacy modal opens (not the new ModalComponent)

**Expected Result**:

- Legacy modal opens for Teams entity
- No delegation console messages appear
- Existing functionality preserved

### Test Case 6: Modal Component Features 🎛️ UX

**Objective**: Test ModalComponent advanced features

**Steps**:

1. Open "Add New User" modal
2. Test keyboard navigation (Tab, Shift+Tab, Escape)
3. Test clicking outside modal (should close if configured)
4. Test form reset when closing and reopening

**Expected Result**:

- Keyboard navigation works properly
- Modal closes on Escape key
- Form resets to default values when reopened

## Regression Testing

### Areas to Verify No Regression

1. **Table Component**: Ensure Users table still loads, sorts, filters, and paginates properly
2. **Edit Operations**: Verify "Edit User" still works from table actions
3. **Delete Operations**: Verify "Delete User" still works from table actions
4. **View Operations**: Verify "View User" still works from table actions
5. **Refresh Button**: Verify "Refresh" button still reloads Users data
6. **Other Entities**: Verify Teams, Environments, etc. still work normally

## Performance Testing

### Metrics to Monitor

1. **Modal Open Time**: Should be <300ms
2. **Form Submission Time**: Should be <2s for user creation
3. **Table Refresh Time**: Should be <1s after user creation
4. **Memory Usage**: No memory leaks when opening/closing modals repeatedly

## Troubleshooting

### Common Issues and Solutions

#### Issue: Modal doesn't open

**Symptoms**: Click "Add New User" but nothing happens
**Check**:

- Console for errors
- Verify `window.adminGui.componentManagers.users` exists
- Verify `UsersEntityManager.handleAdd` method exists

#### Issue: Legacy modal opens instead of new modal

**Symptoms**: Old modal style opens, console shows fallback warnings
**Check**:

- Current section detection: `this.state.currentSection` should be 'users'
- UsersEntityManager initialization status
- Component manager registration

#### Issue: Form validation not working

**Symptoms**: Modal allows invalid data submission
**Check**:

- SecurityUtils availability
- Form configuration in UsersEntityManager
- ModalComponent initialization

## Success Criteria Checklist

- [ ] New ModalComponent opens for Users "Add New User" button
- [ ] Complete user creation workflow functional
- [ ] Form validation working properly
- [ ] Error handling working properly
- [ ] No regressions in existing Users functionality
- [ ] Other entities continue using legacy modal (fallback working)
- [ ] Performance metrics within acceptable ranges

## Files Modified

- `/src/groovy/umig/web/js/AdminGuiController.js` - Updated addNewBtn click handler
- `/src/groovy/umig/web/js/admin-gui.js` - Updated addNewBtn click handler

## Related Documentation

- [US-087-REMAINING-WORK-ANALYSIS.md](./US-087-REMAINING-WORK-ANALYSIS.md)
- [US-087-admin-gui-component-migration.md](./US-087-admin-gui-component-migration.md)
- UsersEntityManager.js - handleAdd() method implementation
- ModalComponent.js - Enterprise modal component
- Component Architecture Documentation

## Implementation Notes

This testing guide focuses specifically on the modal integration component of US-087 Phase 2. The Users entity CRUD operations are covered separately in the main US-087 documentation.

**Test Priority Order**:

1. Modal Integration (Test Cases 1-2) - CRITICAL
2. Form Validation & Error Handling (Test Cases 3-4) - HIGH
3. Fallback Compatibility (Test Case 5) - MEDIUM
4. Advanced Features (Test Case 6) - LOW

**Testing Environment**: Development stack with full component architecture loaded.
