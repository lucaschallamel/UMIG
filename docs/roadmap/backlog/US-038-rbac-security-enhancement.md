# US-038: RBAC Security Enhancement with Audit Logging and Permission Validation

## User Story

**As a** System Administrator  
**I want** comprehensive security controls and audit logging for the RBAC system  
**So that** I can ensure proper access control, maintain compliance audit trails, and prevent unauthorized privilege escalation in the UMIG application

## Acceptance Criteria

### AC1: Audit Logging Implementation
- **GIVEN** the UMIG application has user and role management
- **WHEN** any role assignment, role change, or `user_is_admin` flag modification occurs
- **THEN** the system must log the change with timestamp, actor, target user, old value, new value, and IP address
- **AND** audit logs must be immutable and stored in a dedicated audit table
- **AND** audit logs must be accessible via REST API with appropriate authorization

### AC2: Permission Validation Logic
- **GIVEN** a user has role and admin flag assignments
- **WHEN** the system validates user permissions
- **THEN** conflicting permissions must be detected and prevented (e.g., USER role with admin flag = true)
- **AND** validation rules must enforce the hierarchy: SUPERADMIN > ADMIN > PILOT > USER
- **AND** validation must occur on all user creation, update, and role assignment operations

### AC3: Row-Level Security Implementation
- **GIVEN** users have different role levels
- **WHEN** querying data through the application
- **THEN** data access must be filtered based on user role automatically
- **AND** SUPERADMIN users can access all data
- **AND** ADMIN users can access data within their scope
- **AND** PILOT and USER roles have restricted data access based on business rules

### AC4: Admin Flag Control and Documentation
- **GIVEN** the `user_is_admin` flag grants SUPERADMIN privileges
- **WHEN** modifying this flag
- **THEN** only existing SUPERADMIN users can make this change
- **AND** the change must require additional validation/confirmation
- **AND** comprehensive audit logging must capture the change
- **AND** system documentation must clearly define admin flag usage and control procedures

### AC5: API Security Enhancements
- **GIVEN** existing REST APIs for user and role management
- **WHEN** accessing security-sensitive endpoints
- **THEN** enhanced authorization checks must be implemented beyond basic `groups: ["confluence-users"]`
- **AND** role-based endpoint access must be enforced
- **AND** audit logs must capture all API access attempts (successful and failed)

## Technical Implementation Notes

### Database Changes (Liquibase Migration)
```sql
-- Audit table for security changes
CREATE TABLE audit_security_changes (
    asc_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asc_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    asc_actor_user_id UUID NOT NULL REFERENCES users_usr(usr_id),
    asc_target_user_id UUID NOT NULL REFERENCES users_usr(usr_id),
    asc_action VARCHAR(50) NOT NULL, -- 'ROLE_CHANGE', 'ADMIN_FLAG_CHANGE'
    asc_old_value TEXT,
    asc_new_value TEXT,
    asc_ip_address INET,
    asc_user_agent TEXT
);

-- Enable RLS on sensitive tables
ALTER TABLE users_usr ENABLE ROW LEVEL SECURITY;
ALTER TABLE migrations_mig ENABLE ROW LEVEL SECURITY;
-- Add policies based on user roles
```

### Repository Pattern (AuditSecurityRepository.groovy)
```groovy
class AuditSecurityRepository {
    static List<Map> getAuditTrail(UUID userId, String action = null) {
        return DatabaseUtil.withSql { sql ->
            def query = """
                SELECT asc_id, asc_timestamp, asc_action, asc_old_value, asc_new_value
                FROM audit_security_changes 
                WHERE asc_target_user_id = ?
            """
            def params = [userId as String]
            if (action) {
                query += " AND asc_action = ?"
                params << action
            }
            return sql.rows(query + " ORDER BY asc_timestamp DESC", params)
        }
    }
    
    static void logSecurityChange(UUID actorId, UUID targetId, String action, 
                                String oldValue, String newValue, String ipAddress) {
        DatabaseUtil.withSql { sql ->
            sql.executeInsert("""
                INSERT INTO audit_security_changes 
                (asc_actor_user_id, asc_target_user_id, asc_action, asc_old_value, asc_new_value, asc_ip_address)
                VALUES (?, ?, ?, ?, ?, ?::inet)
            """, [actorId as String, targetId as String, action, oldValue, newValue, ipAddress])
        }
    }
}
```

### Enhanced UsersRepository with Validation
```groovy
class EnhancedUsersRepository {
    static void validateUserPermissions(Map user) {
        def roleId = user.usr_role_id as UUID
        def isAdmin = user.user_is_admin as Boolean
        
        // Get role name for validation
        def role = DatabaseUtil.withSql { sql ->
            sql.firstRow("SELECT rls_name FROM roles_rls WHERE rls_id = ?", [roleId as String])
        }
        
        // Validate no conflicting permissions
        if (role?.rls_name == 'USER' && isAdmin) {
            throw new IllegalArgumentException("USER role cannot have admin privileges")
        }
        // Add more validation rules...
    }
}
```

### API Security Enhancements
```groovy
@BaseScript CustomEndpointDelegate delegate
usersSecurityManagement(httpMethod: "POST", groups: ["confluence-users"]) { request, binding ->
    def currentUser = getCurrentUser()
    
    // Enhanced authorization - only SUPERADMIN can modify admin flags
    if (!isUserSuperAdmin(currentUser.usr_id)) {
        return Response.status(403).entity([error: "Insufficient privileges"]).build()
    }
    
    // Validation and audit logging
    EnhancedUsersRepository.validateUserPermissions(requestData)
    AuditSecurityRepository.logSecurityChange(...)
    
    return Response.ok().build()
}
```

### Row-Level Security Policies
```sql
-- Example RLS policy for user data access
CREATE POLICY user_data_access ON users_usr 
    FOR ALL TO application_role 
    USING (
        usr_id = current_setting('app.current_user_id')::uuid OR
        is_user_admin(current_setting('app.current_user_id')::uuid) = true
    );
```

## Test Scenarios

### Unit Tests
1. **Permission Validation Tests**
   - Test valid role/admin flag combinations
   - Test invalid combinations (USER + admin flag)
   - Test hierarchy enforcement

2. **Audit Logging Tests**
   - Verify audit records are created for all changes
   - Test audit log immutability
   - Verify audit log data integrity

### Integration Tests
1. **API Security Tests**
   - Test role-based endpoint access
   - Test SUPERADMIN-only operations
   - Test unauthorized access attempts

2. **Row-Level Security Tests**
   - Verify data filtering by role
   - Test cross-user data access restrictions
   - Performance impact assessment

### Security Tests
1. **Privilege Escalation Tests**
   - Attempt to elevate USER to admin without proper authorization
   - Test role assignment bypassing validation
   - Test direct database manipulation protection

2. **Audit Trail Integrity Tests**
   - Attempt to modify audit logs
   - Test audit log completeness
   - Verify log retention and immutability

### Performance Tests
1. **RLS Performance Impact**
   - Benchmark query performance with RLS enabled
   - Test with large datasets
   - Verify index effectiveness

## Definition of Done

- [ ] Database migrations implemented and tested
- [ ] Repository layer enhanced with validation and audit logging
- [ ] API endpoints secured with role-based authorization
- [ ] Row-level security policies implemented and tested
- [ ] Comprehensive unit and integration tests (>90% coverage)
- [ ] Security penetration testing completed
- [ ] Performance impact assessed and documented
- [ ] Admin documentation updated with security procedures
- [ ] Code review completed with security focus
- [ ] UAT testing with different role levels

## Story Points: 8

**Complexity Factors:**
- Multi-layer implementation (database, repository, API)
- Security-critical functionality requiring extensive testing
- Row-level security implementation complexity
- Comprehensive audit logging requirements
- Integration with existing RBAC system
- Performance optimization needs

## Dependencies

- **Preconditions:** Current user and role management system (existing)
- **Parallel Work:** None identified
- **Follow-up Stories:** UI enhancements for audit log viewing, advanced RLS policies

## Risk Mitigation

- **Security Risk:** Extensive testing and code review required
- **Performance Risk:** Benchmark testing with RLS enabled
- **Data Risk:** Backup and rollback procedures for schema changes
- **Integration Risk:** Thorough testing with existing authentication flows

## Notes

- Created based on system architect recommendations for RBAC security enhancements
- Focus on audit compliance and preventing unauthorized privilege escalation
- Aligns with existing repository patterns and DatabaseUtil security model