# StepView RBAC Security Redesign

## Current Security Issues Identified

### Critical Vulnerabilities

1. **Development Role Override Hack**: URL parameter `?role=ADMIN` allows privilege escalation in production
2. **Missing Backend Integration**: No proper API integration for user role detection from `/users/current`
3. **Incomplete Team-Based Permissions**: Team membership checks not implemented
4. **ADMIN Read-Only Bug**: ADMIN users incorrectly getting read-only access

### Current Implementation Problems

- Role detection relies on `window.UMIG_STEP_CONFIG.user.role` which may not be populated
- Fallback to `null` role causes all users to get read-only access
- No integration with existing `/users/current` API endpoint
- No checks for assigned team (`tms_id_owner`) or impacted team membership
- Development hacks present in production code

## Correct RBAC Policy Requirements

### User Roles

- **ADMIN**: Full administrative access (rls_id = 1)
- **PILOT**: Advanced user with elevated permissions (rls_id = 3)
- **USER**: Standard user permissions (rls_id = 2)

### Team-Based Permissions

- **Assigned Team Members**: Members of step's owner team (`tms_id_owner`)
- **Impacted Team Members**: Members of teams affected by the step

### Allowed Actions by Role/Team

| Action                | ADMIN | PILOT | USER | Assigned Team | Impacted Team |
| --------------------- | ----- | ----- | ---- | ------------- | ------------- |
| View step details     | ✅    | ✅    | ✅   | ✅            | ✅            |
| Add comments          | ✅    | ✅    | ✅   | ✅            | ✅            |
| Change status         | ✅    | ✅    | ❌   | ✅            | ✅            |
| Complete instructions | ✅    | ✅    | ❌   | ✅            | ✅            |
| Edit comments         | ✅    | ✅    | ❌   | ✅            | ❌            |
| Bulk operations       | ✅    | ✅    | ❌   | ❌            | ❌            |
| Email step details    | ✅    | ✅    | ❌   | ❌            | ❌            |
| Debug panel           | ✅    | ❌    | ❌   | ❌            | ❌            |

## Proposed Solution Architecture

### 1. Backend API Integration

#### New StepView User Context API

```groovy
// Add to stepViewApi.groovy
stepViewApi(httpMethod: "GET", groups: ["confluence-users"]) { ... ->
    if (pathParts.size() == 1 && pathParts[0] == 'userContext') {
        // GET /stepViewApi/userContext?stepCode=XXX-nnn
        final String stepCode = queryParams.getFirst("stepCode")

        // Get current user from UserService
        def userContext = UserService.getCurrentUserContext()
        def username = userContext?.confluenceUsername

        // Get user details with role
        def currentUser = userRepository.findUserByUsername(username)
        def roleCode = getUserRoleCode(currentUser.rls_id)

        // Get step team information
        def stepTeams = getStepTeamContext(stepCode)

        // Check team membership
        def userTeamMemberships = getUserTeamMemberships(currentUser.usr_id)

        // Calculate effective permissions
        def permissions = calculateUserPermissions(
            roleCode,
            userTeamMemberships,
            stepTeams
        )

        return Response.ok(new JsonBuilder([
            userId: currentUser.usr_id,
            username: currentUser.usr_code,
            role: roleCode,
            isAdmin: currentUser.usr_is_admin,
            teamMemberships: userTeamMemberships,
            stepContext: stepTeams,
            permissions: permissions,
            source: "stepview_user_context"
        ]).toString()).build()
    }
}
```

### 2. Team Membership Resolution

#### Step Team Context Query

```sql
SELECT
    stm.tms_id_owner as assigned_team_id,
    owner_team.tms_name as assigned_team_name,
    -- Get impacted teams (teams that have members working on this step)
    impacted_teams.team_ids as impacted_team_ids,
    impacted_teams.team_names as impacted_team_names
FROM steps_master_stm stm
LEFT JOIN teams_tms owner_team ON stm.tms_id_owner = owner_team.tms_id
LEFT JOIN (
    -- Subquery to get all teams impacted by this step
    SELECT
        stm_id,
        array_agg(DISTINCT tms_id) as team_ids,
        array_agg(DISTINCT tms_name) as team_names
    FROM team_members_tme tm
    JOIN teams_tms t ON tm.tms_id = t.tms_id
    WHERE tm.usr_id IN (
        -- Users who have worked on instructions for this step
        SELECT DISTINCT ins.usr_id_modified
        FROM instructions_ins ins
        JOIN steps_instance_sti sti ON ins.sti_id = sti.sti_id
        WHERE sti.stm_id = :stm_id
    )
    GROUP BY stm_id
) impacted_teams ON stm.stm_id = impacted_teams.stm_id
WHERE stm.stt_code = :stt_code AND stm.stm_number = :stm_number
```

#### User Team Memberships Query

```sql
SELECT
    tm.tms_id,
    t.tms_name,
    tm.tme_role
FROM team_members_tme tm
JOIN teams_tms t ON tm.tms_id = t.tms_id
WHERE tm.usr_id = :usr_id AND tm.tme_active = true
```

### 3. Frontend Permission Engine Redesign

#### Enhanced RBAC System

```javascript
class StepViewRBAC {
  constructor(stepView) {
    this.stepView = stepView;
    this.userContext = null;
    this.permissions = null;
    this.stepTeams = null;
  }

  async initialize(stepCode) {
    try {
      // Fetch user context from backend API
      const response = await fetch(
        `${this.stepView.config.api.baseUrl}/stepViewApi/userContext?stepCode=${stepCode}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
        },
      );

      if (!response.ok) {
        throw new Error(`User context API failed: ${response.status}`);
      }

      this.userContext = await response.json();
      this.permissions = this.userContext.permissions;
      this.stepTeams = this.userContext.stepContext;

      console.log("🔐 StepView RBAC: User context loaded:", {
        userId: this.userContext.userId,
        role: this.userContext.role,
        teams: this.userContext.teamMemberships,
        permissions: Object.keys(this.permissions).filter(
          (p) => this.permissions[p],
        ),
      });

      return true;
    } catch (error) {
      console.error("🚨 StepView RBAC: Failed to load user context:", error);

      // Secure fallback - minimal permissions
      this.userContext = {
        userId: null,
        username: null,
        role: null,
        isAdmin: false,
        teamMemberships: [],
        stepContext: {},
        permissions: this.getMinimalPermissions(),
      };
      this.permissions = this.userContext.permissions;

      return false;
    }
  }

  calculateUserPermissions(role, userTeams, stepTeams) {
    const permissions = {
      view_step_details: true, // Always allowed
      add_comments: true, // Always allowed
      update_step_status: false,
      complete_instructions: false,
      edit_comments: false,
      bulk_operations: false,
      email_step_details: false,
      advanced_controls: false,
      extended_shortcuts: false,
      debug_panel: false,
      force_refresh_cache: false,
      security_logging: false,
    };

    // Role-based permissions
    if (role === "ADMIN") {
      Object.keys(permissions).forEach((key) => (permissions[key] = true));
    } else if (role === "PILOT") {
      permissions.update_step_status = true;
      permissions.complete_instructions = true;
      permissions.edit_comments = true;
      permissions.bulk_operations = true;
      permissions.email_step_details = true;
      permissions.advanced_controls = true;
      permissions.extended_shortcuts = true;
      permissions.force_refresh_cache = true;
    }

    // Team-based permissions
    const userTeamIds = userTeams.map((t) => t.tms_id);
    const assignedTeamId = stepTeams.assigned_team_id;
    const impactedTeamIds = stepTeams.impacted_team_ids || [];

    const isAssignedTeamMember =
      assignedTeamId && userTeamIds.includes(assignedTeamId);
    const isImpactedTeamMember = impactedTeamIds.some((id) =>
      userTeamIds.includes(id),
    );

    if (isAssignedTeamMember) {
      permissions.update_step_status = true;
      permissions.complete_instructions = true;
      permissions.edit_comments = true;
    }

    if (isImpactedTeamMember) {
      permissions.update_step_status = true;
      permissions.complete_instructions = true;
      // Note: Impacted teams can't edit comments, only assigned team
    }

    return permissions;
  }

  hasPermission(feature) {
    if (!this.permissions) {
      console.warn(
        "🚨 RBAC: Permissions not initialized, denying access to:",
        feature,
      );
      return false;
    }

    const hasAccess = this.permissions[feature] === true;

    if (!hasAccess) {
      console.log(
        `🔒 RBAC: Permission denied for feature '${feature}' (user: ${this.userContext?.role})`,
      );
      this.logSecurityEvent("permission_denied", {
        feature,
        role: this.userContext?.role,
      });
    }

    return hasAccess;
  }

  getMinimalPermissions() {
    return {
      view_step_details: true,
      add_comments: true,
      update_step_status: false,
      complete_instructions: false,
      edit_comments: false,
      bulk_operations: false,
      email_step_details: false,
      advanced_controls: false,
      extended_shortcuts: false,
      debug_panel: false,
      force_refresh_cache: false,
      security_logging: false,
    };
  }

  logSecurityEvent(event, details) {
    // Security audit logging
    console.log("🔍 RBAC Security Event:", {
      event,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  getUserDisplayInfo() {
    return {
      role: this.userContext?.role || "UNKNOWN",
      username: this.userContext?.username || "anonymous",
      assignedTeams:
        this.userContext?.teamMemberships?.map((t) => t.tms_name) || [],
      effectivePermissions: Object.keys(this.permissions || {}).filter(
        (p) => this.permissions[p],
      ),
    };
  }
}
```

### 4. UI Integration Changes

#### Remove Development Hacks

```javascript
// REMOVE THIS BLOCK ENTIRELY from step-view.js lines 2719-2734:
// RBAC: Development role override (temporary testing capability)
const urlRoleOverride = params.get("role");
if (
  urlRoleOverride &&
  ["NORMAL", "PILOT", "ADMIN"].includes(urlRoleOverride.toUpperCase())
) {
  console.warn(
    "🧪 StepView: Development role override active:",
    urlRoleOverride.toUpperCase(),
  );
  this.userRole = urlRoleOverride.toUpperCase();
  this.isAdmin = this.userRole === "ADMIN";
  this.logSecurityEvent("role_override", {
    originalRole: this.config.user?.role || "NORMAL",
    overrideRole: this.userRole,
    timestamp: new Date().toISOString(),
  });
}
```

#### Replace with Secure Initialization

```javascript
// Replace the constructor initialization
class StepView {
  constructor() {
    this.config = window.UMIG_STEP_CONFIG || {
      api: { baseUrl: "/rest/scriptrunner/latest/custom" },
    };

    // Initialize RBAC system - will load from backend
    this.rbac = new StepViewRBAC(this);
    this.userContext = null;
    this.permissions = null;

    // Legacy properties for backward compatibility
    this.userRole = null;
    this.isAdmin = false;
    this.userId = null;
  }

  async initializeStep(migrationName, iterationName, stepCode) {
    // Initialize RBAC first
    const rbacSuccess = await this.rbac.initialize(stepCode);

    if (rbacSuccess) {
      // Update legacy properties for backward compatibility
      this.userContext = this.rbac.userContext;
      this.userRole = this.userContext.role;
      this.isAdmin = this.userContext.isAdmin;
      this.userId = this.userContext.userId;
      this.permissions = this.rbac.permissions;
    } else {
      console.error(
        "🚨 StepView: RBAC initialization failed, using minimal permissions",
      );
    }

    // Continue with step loading...
    await this.loadStepData(migrationName, iterationName, stepCode);
    this.renderStep();
    this.applyRBACControls();
  }

  hasPermission(feature) {
    return this.rbac ? this.rbac.hasPermission(feature) : false;
  }
}
```

### 5. Production Security Measures

#### Security Validation

```javascript
// Add to step-view.js initialization
validateProductionSecurity() {
    // Check for development hacks
    const urlParams = new URLSearchParams(window.location.search);
    const suspiciousParams = ['role', 'admin', 'debug', 'override'];

    suspiciousParams.forEach(param => {
        if (urlParams.has(param)) {
            console.error(`🚨 SECURITY VIOLATION: Suspicious URL parameter '${param}' detected`);
            this.rbac.logSecurityEvent("suspicious_url_parameter", {
                parameter: param,
                value: urlParams.get(param),
                url: window.location.href
            });
        }
    });

    // Validate RBAC system is properly initialized
    if (!this.rbac || !this.permissions) {
        console.error("🚨 SECURITY VIOLATION: RBAC system not properly initialized");
        throw new Error("Security system initialization failed");
    }
}
```

## Implementation Plan

### Phase 1: Backend API Development

1. ✅ Add `/stepViewApi/userContext` endpoint
2. ✅ Implement team membership queries
3. ✅ Create permission calculation logic
4. ✅ Add security audit logging

### Phase 2: Frontend RBAC Engine

1. ✅ Create StepViewRBAC class
2. ✅ Implement secure initialization
3. ✅ Remove development hacks
4. ✅ Add production security validation

### Phase 3: Integration & Testing

1. ⏳ Update StepView constructor
2. ⏳ Test all permission scenarios
3. ⏳ Validate team-based access
4. ⏳ Security penetration testing

### Phase 4: Production Deployment

1. ⏳ Remove all development overrides
2. ⏳ Enable security audit logging
3. ⏳ Monitor for security violations
4. ⏳ Performance optimization

## Security Testing Requirements

### Test Scenarios

1. **Role-Based Access**: Verify ADMIN/PILOT/USER permissions
2. **Team-Based Access**: Test assigned and impacted team member access
3. **Permission Inheritance**: Validate correct permission combinations
4. **Security Boundaries**: Ensure no privilege escalation possible
5. **Fallback Security**: Test behavior when backend APIs fail
6. **URL Parameter Security**: Verify no development hacks work in production

### Security Validation Checklist

- [ ] No URL parameter role overrides work
- [ ] Backend user context API properly validates user sessions
- [ ] Team membership correctly restricts access
- [ ] ADMIN users have full access
- [ ] PILOT users have elevated but not full access
- [ ] Regular users have appropriate team-based access
- [ ] Anonymous/unknown users have minimal read-only access
- [ ] All security events are properly logged
- [ ] System fails securely when backend is unavailable

## Monitoring & Audit

### Security Event Logging

- Permission denied attempts
- Suspicious URL parameters
- Role escalation attempts
- Team membership violations
- Backend API failures
- System initialization failures

### Performance Metrics

- RBAC initialization time
- Permission check latency
- Team membership query performance
- Security event logging overhead

This redesign eliminates all identified security vulnerabilities while implementing proper enterprise-grade RBAC with team-based permissions as specified in the requirements.
