# ADR-051: UI-Level RBAC Interim Solution for Migration Types Management

**Status:** Accepted  
**Date:** 2025-08-05  
**Context:** US-042 Migration Types Management Phase 4  
**Related:** US-042, ADR-042 (Authentication Context), ADR-049 (Service Layer)  
**Technical Debt:** Yes - API-level RBAC deferred to Phase 5

## Context

During US-042 Migration Types Management Phase 4 implementation, a decision was required regarding Role-Based Access Control (RBAC) enforcement approach. While API-level RBAC represents best practice for enterprise security, Sprint 6 scope constraints necessitated an interim solution to deliver functional SUPERADMIN access controls.

**Current Implementation Status:**

- ✅ Database foundation complete (Phases 1-2)
- ✅ REST API endpoints complete with full CRUD operations
- ✅ Comprehensive testing infrastructure (945+ lines backend, 1,324+ lines tests)
- 🔄 Frontend development with RBAC integration (Phase 4)

**Security Requirements:**

- Migration Types management must be restricted to SUPERADMIN users only
- Non-authorized users should receive clear access denied messaging
- Navigation elements should be hidden from unauthorized users
- Audit trail for authorization decisions required

## Decision

**Implement UI-Level RBAC as interim solution** with the following approach:

### UI-Level Security Implementation

```javascript
// Primary authorization check
async checkUserAuthorization() {
    const userResponse = await fetch('/rest/scriptrunner/latest/custom/users/current');
    const userData = await userResponse.json();

    this.isAuthorized = userData && userData.role === 'SUPERADMIN';

    if (!this.isAuthorized) {
        this.showAccessDenied();
        this.hideNavigationElements();
    }
}
```

### Access Control Components

1. **User Role Verification**
   - Fetch current user context via existing authentication API
   - Check for SUPERADMIN role requirement
   - Log authorization decisions for audit trail

2. **Interface Access Control**
   - Show/hide entire migration types interface based on authorization
   - Display clear access denied messaging with role information
   - Hide navigation menu items for unauthorized users

3. **Graceful Degradation**
   - Handle authentication failures gracefully
   - Provide clear user feedback on access requirements
   - Maintain interface consistency with other UMIG admin components

### Technical Implementation

- **File:** `src/groovy/umig/web/js/admin-gui/migration-types.js`
- **Pattern:** Following existing UMIG `superadminSection` pattern from mock/admin-gui.html
- **Integration:** Consistent with ADR-042 authentication context management
- **Navigation:** Dynamic visibility control for menu elements

## Consequences

### Positive

- **Rapid Delivery:** Enables Sprint 6 completion within scope constraints
- **User Experience:** Clear access control messaging and interface hiding
- **Consistency:** Follows established UMIG admin interface patterns
- **Audit Trail:** Authorization decisions logged for security monitoring
- **Technical Debt Management:** Explicit documentation of interim approach

### Negative (Technical Debt)

- **Security Gap:** API endpoints remain accessible to authenticated users regardless of role
- **Defense in Depth:** Lacks backend authorization layer for comprehensive security
- **Maintenance Overhead:** Requires frontend authorization logic maintenance
- **Compliance Risk:** May not meet enterprise security audit requirements
- **Attack Surface:** Potential for UI bypass if API endpoints directly accessed

### Risk Mitigation

1. **Immediate Actions:**
   - Document as technical debt with clear remediation path
   - Create Phase 5 backlog item for API-level RBAC implementation
   - Implement audit logging for authorization decisions
   - Monitor for unauthorized API access patterns

2. **Phase 5 Transition Plan:**
   - Implement API-level RBAC with proper authorization middleware
   - Add role-based endpoint protection at service layer
   - Maintain UI-level controls for user experience
   - Comprehensive security testing for both layers

## Technical Debt Record

**Debt Type:** Security Architecture  
**Severity:** Medium  
**Remediation Timeline:** Phase 5 (Post-Sprint 6)  
**Estimated Effort:** 2-3 days  
**Business Risk:** Medium - UI bypass potential exists

**Remediation Requirements:**

- API-level role checking middleware implementation
- Service layer authorization integration with ADR-042 authentication context
- Comprehensive RBAC testing framework
- Security audit compliance validation

## Implementation Details

### Authorization Flow

```
User Access Request
    ↓
UI-Level Role Check (/users/current API)
    ↓
SUPERADMIN Role?
    ├── YES → Show Interface + Log Success
    └── NO  → Access Denied + Hide Navigation + Log Denial
```

### Error Handling

```javascript
showAccessDenied() {
    container.innerHTML = `
        <div class="aui-message aui-message-error">
            <p><strong>Access Denied</strong></p>
            <p>Migration Types management requires SUPERADMIN privileges.</p>
            <p>Current role: ${this.currentUser?.role || 'Unknown'}</p>
            <p>Required role: SUPERADMIN</p>
        </div>
    `;
}
```

### Navigation Integration

```javascript
setupMigrationTypesNavigation() {
    // Dynamic menu visibility based on role
    if (userData?.role === 'SUPERADMIN') {
        migrationTypesSection.style.display = 'block';
    } else {
        migrationTypesSection.style.display = 'none';
    }
}
```

## Alternative Considered

**API-Level RBAC (Deferred to Phase 5):**

- **Pros:** Enterprise security best practice, comprehensive protection
- **Cons:** Requires additional service layer changes, extends Sprint 6 scope
- **Decision:** Defer to Phase 5 for proper implementation with adequate testing time

## Success Metrics

1. **Functional:** SUPERADMIN users can access migration types management
2. **Security:** Non-SUPERADMIN users receive access denied messaging
3. **UX:** Navigation elements hidden for unauthorized users
4. **Audit:** Authorization decisions logged and traceable
5. **Technical Debt:** Phase 5 backlog item created for API-level RBAC

## Related Documentation

- **Implementation:** `src/groovy/umig/web/js/admin-gui/migration-types.js`
- **Testing:** `local-dev-setup/__tests__/ui/migration-types-rbac.test.js` (pending)
- **Authentication Context:** ADR-042
- **Service Layer:** ADR-049
- **Phase 5 Planning:** US-048 (Complete Admin GUI with API-Level RBAC)

## Approval

- **Technical Lead:** Approved (interim solution with clear technical debt path)
- **Security Review:** Conditional approval with Phase 5 remediation commitment
- **Product Owner:** Approved for Sprint 6 delivery

---

**This ADR documents an interim technical solution with explicit technical debt management and clear remediation path to enterprise-grade API-level RBAC in Phase 5.**
