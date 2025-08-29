# ADR-033: Role-Based Access Control Implementation

- **Status:** Accepted
- **Date:** 2025-07-16
- **Deciders:** UMIG Development Team
- **Technical Story:** Iteration View Enhancement - Role-based Access Control

## Context and Problem Statement

The UMIG iteration view interface requires different levels of access control to ensure operational safety during cutover events. Not all users should have the ability to modify step statuses, complete instructions, or perform operational actions. The system needs to differentiate between read-only viewers, operational pilots, and system administrators while maintaining a seamless user experience.

## Decision Drivers

- **Operational Safety:** Prevent unauthorized changes during critical cutover events
- **Confluence Integration:** Leverage existing Confluence authentication without additional systems
- **User Experience:** Maintain intuitive interface while enforcing permissions
- **Role Clarity:** Clear distinction between user capabilities
- **Progressive Enhancement:** UI adapts gracefully based on user permissions
- **Audit Requirements:** Track who can perform operational actions

## Considered Options

- **Option 1: Simple Admin/Non-Admin Binary Roles**
  - Description: Basic two-tier system with admin and regular users
  - Pros: Simple implementation, easy to understand
  - Cons: Insufficient granularity for operational needs, no distinction between viewers and operators

- **Option 2: External Role Management System**
  - Description: Integrate with external identity management or custom role system
  - Pros: Comprehensive role management, external audit capabilities
  - Cons: Adds complexity, requires additional infrastructure, conflicts with Confluence-only requirement

- **Option 3: Three-Tier Role System with Confluence Integration**
  - Description: NORMAL (read-only), PILOT (operational), ADMIN (full access) roles using Confluence user attributes
  - Pros: Appropriate granularity, leverages existing authentication, clear operational boundaries
  - Cons: Requires user attribute management in Confluence

## Decision Outcome

Chosen option: **"Three-Tier Role System with Confluence Integration"**, because it provides the necessary operational safety with appropriate granularity while leveraging existing Confluence authentication infrastructure. This approach maintains the project's requirement for Confluence-only operation while providing clear role boundaries for operational activities.

### Positive Consequences

- **Clear Operational Boundaries:** NORMAL users can view without risk of accidental changes
- **Operational Safety:** Only authorized PILOT users can execute steps and complete instructions
- **Administrative Control:** ADMIN users maintain full system access for configuration and troubleshooting
- **Confluence Integration:** Seamless authentication using existing user accounts
- **Progressive UI:** Interface adapts intelligently based on user capabilities
- **Audit Trail:** Clear tracking of who has operational permissions

### Negative Consequences (if any)

- **Role Management Overhead:** Requires managing user roles in Confluence user attributes
- **UI Complexity:** Frontend logic becomes more complex with conditional rendering
- **Permission Edge Cases:** Potential for confusion when users expect access they don't have

## Validation

Success criteria:

- NORMAL users can view iteration details but cannot modify step statuses or complete instructions
- PILOT users can perform all operational activities (status updates, instruction completion, commenting)
- ADMIN users have full access to all system features
- UI provides clear feedback when users attempt unauthorized actions
- Role changes in Confluence are reflected in the interface without requiring re-authentication

## Implementation Details

### Frontend Implementation

**CSS Class-Based Control:**

```css
.pilot-only {
  /* Shown only to PILOT and ADMIN users */
}

.admin-only {
  /* Shown only to ADMIN users */
}

.role-disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}
```

**JavaScript Role Detection:**

```javascript
// User context injected via Confluence macro
window.UMIG_ITERATION_CONFIG = {
    confluence: {
        username: "user@company.com",
        fullName: "John Doe",
        email: "user@company.com"
    },
    api: {
        baseUrl: "/rest/scriptrunner/latest/custom"
    }
};

// Dynamic role application
applyRoleBasedControls() {
    const role = this.userRole;
    if (role === 'NORMAL') {
        this.hideElementsWithClass('admin-only');
        this.disableElementsWithClass('pilot-only');
        this.addReadOnlyIndicators();
    } else if (role === 'PILOT') {
        this.hideElementsWithClass('admin-only');
        this.showAndEnableElementsWithClass('pilot-only');
    } else if (role === 'ADMIN') {
        this.showAndEnableElementsWithClass('admin-only');
        this.showAndEnableElementsWithClass('pilot-only');
    }
}
```

### Backend Implementation

**User Context API:**

```groovy
user(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    // GET /user/context
    if (pathParts.size() == 1 && pathParts[0] == 'context') {
        def username = queryParams.getFirst('username')
        def user = userRepository.findUserByUsername(username as String)

        return Response.ok(new JsonBuilder([
            userId: userMap.usr_id,
            username: userMap.usr_code,
            firstName: userMap.usr_first_name,
            lastName: userMap.usr_last_name,
            isAdmin: userMap.usr_is_admin,
            roleId: userMap.rls_id,
            role: userMap.role_code ?: 'NORMAL'
        ]).toString()).build()
    }
}
```

### Role Definitions

- **NORMAL:**
  - View iteration runsheets and step details
  - Read comments and historical data
  - No modification capabilities
  - Visual read-only indicators

- **PILOT:**
  - All NORMAL capabilities plus:
  - Update step statuses
  - Complete/uncomplete instructions
  - Add, edit, and delete comments
  - Execute step actions

- **ADMIN:**
  - All PILOT capabilities plus:
  - Access to administrative functions
  - User and system management
  - Configuration capabilities

## Links

- [Confluence User Attributes Documentation](https://confluence.atlassian.com/doc/user-attributes-158827.html)
- [ADR-020: SPA+REST Admin Entity Management](./archive/ADR-020-spa-rest-admin-entity-management.md)
- [ScriptRunner Security Groups Documentation](https://docs.adaptavist.com/sr4c/latest/features/rest-endpoints#security)

## Amendment History

- 2025-07-16: Initial creation documenting role-based access control implementation
