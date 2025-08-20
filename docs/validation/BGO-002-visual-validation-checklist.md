# BGO-002 Visual Validation Checklist

**Step Code**: BGO-002  
**Location**: Migration 1 → RUN Iteration 2 → Sequence 1 → Phase 1  
**Date**: August 19, 2025  
**Purpose**: Validate visual consistency between StepView standalone and IterationView StepView pane

## ✅ Backend Data Validation Complete

The backend data layer has been validated and confirmed working correctly:
- Hierarchical context: Complete 5-level chain available
- Team assignment: "Electronics Squad" correctly resolved
- Status: "CANCELLED" name returned (not ID)
- Labels: 1 label with color #376e4e
- Instructions: 2 instructions with completion tracking
- Comments: Full system operational

## 📋 Visual Validation Checklist

### Section 1: Breadcrumb Navigation
- [ ] **Migration Name**: Shows "Migration 1"
- [ ] **Iteration Name**: Shows "RUN Iteration 2"  
- [ ] **Plan Name**: Shows correct plan name
- [ ] **Sequence Name**: Shows "Sequence 1"
- [ ] **Phase Name**: Shows "Phase 1"
- [ ] **Separator**: Uses "›" between items
- [ ] **Clickability**: Each breadcrumb item is clickable (if implemented)

### Section 2: Step Header
- [ ] **Step Code**: Displays as "BGO-002" (properly formatted)
- [ ] **Step Name**: Shows step master name after dash
- [ ] **Icon**: Shows appropriate step type icon (📋 or similar)
- [ ] **Title Format**: "BGO-002 - [Step Name]"

### Section 3: Status Information
- [ ] **Status Dropdown**: Shows "CANCELLED" (not a numeric ID)
- [ ] **Status Color**: Appropriate color for CANCELLED status
- [ ] **Editability**: PILOT/ADMIN users can change status
- [ ] **Read-only**: NORMAL users see status as read-only

### Section 4: Team Information
- [ ] **Primary Team**: Shows "Electronics Squad" (not team ID)
- [ ] **Team Icon**: Shows team icon if available
- [ ] **Impacted Teams**: Lists any impacted teams by name

### Section 5: Labels Display
- [ ] **Label Present**: At least 1 label shown
- [ ] **Label Color**: Background color #376e4e applied
- [ ] **Label Text**: Readable contrast against background
- [ ] **Label Style**: Rounded corners, proper padding

### Section 6: Instructions Table
- [ ] **Instruction Count**: Shows 2 instructions
- [ ] **Order Column**: Sequential numbering (1, 2)
- [ ] **Description Column**: Full instruction text visible
- [ ] **Checkbox State**: Reflects completion status
- [ ] **Team Column**: Shows assigned team if any
- [ ] **Duration Column**: Shows duration in minutes

### Section 7: Comments Section
- [ ] **Comment Count**: Header shows "(N)" count
- [ ] **Author Display**: Shows user full name
- [ ] **Author Team**: Shows team in parentheses
- [ ] **Timestamp**: Shows "time ago" format
- [ ] **Comment Body**: Properly escaped HTML content
- [ ] **Add Comment**: Button/form available for adding comments

### Section 8: Environment Information
- [ ] **Target Environment**: Shows "BACKUP (!No Environment Assigned Yet!)"
- [ ] **Environment Icon**: Appropriate icon displayed
- [ ] **Warning Indicator**: Shows warning for unassigned environment

### Section 9: Action Buttons
- [ ] **Start Step**: Available for appropriate roles
- [ ] **Complete Step**: Available when step is in progress
- [ ] **Block Step**: Available for PILOT/ADMIN roles
- [ ] **Add Comment**: Available for all users

## 🔍 Comparison Points

### StepView Standalone vs IterationView Pane
Compare these specific elements between the two views:

| Element | StepView Standalone | IterationView Pane | Match? |
|---------|-------------------|-------------------|---------|
| Step Code Format | | | [ ] |
| Breadcrumb Display | | | [ ] |
| Status Dropdown | | | [ ] |
| Team Display | | | [ ] |
| Labels Rendering | | | [ ] |
| Instructions Table | | | [ ] |
| Comments Section | | | [ ] |
| Action Buttons | | | [ ] |
| Responsive Layout | | | [ ] |
| Loading States | | | [ ] |

## 🐛 Issues Found

### Critical Issues
1. **Issue**: [Description]
   - **Location**: [StepView/IterationView]
   - **Expected**: [What should happen]
   - **Actual**: [What actually happens]
   - **Impact**: [User impact]

### Minor Issues
1. **Issue**: [Description]
   - **Location**: [StepView/IterationView]
   - **Expected**: [What should happen]
   - **Actual**: [What actually happens]
   - **Impact**: [User impact]

## 📊 Validation Summary

**Total Checks**: 40  
**Passed**: ___  
**Failed**: ___  
**Success Rate**: ___%

**Overall Assessment**: [ ] PASS | [ ] FAIL

## 📝 Notes

- Backend data layer confirmed working (100% validation passed)
- Focus on visual presentation and UI consistency
- Test with different user roles (NORMAL, PILOT, ADMIN)
- Verify real-time updates between views

## ✍️ Sign-off

**Validated By**: _________________  
**Date**: _________________  
**Role**: _________________  
**Environment**: Development