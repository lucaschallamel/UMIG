# US-002d: Audit Fields Clarification & Association Tables

**Sprint:** Sprint 0  
**Priority:** Medium  
**Type:** Technical Design Clarification  
**Status:** COMPLETED  
**Created:** 2025-08-04  
**Completed:** 2025-08-04  
**Effort:** 2 hours  

## Design Clarifications

### 1. Audit Field Content Standards

#### created_by / updated_by Field Values
These VARCHAR(255) fields should store the **user_code (trigram)** from the users_usr table:

| Context | Value | Example |
|---------|-------|---------|
| Confluence User | User trigram (usr_code) | "JSM", "ABC", "XYZ" |
| Data Generation | Static identifier | "generator" |
| System Operations | System identifier | "system" |
| Data Migration | Migration identifier | "migration", "import_2025" |
| API Operations | User trigram from users_usr | Look up usr_code by email |

**Implementation in Groovy:**
```groovy
// In API endpoints
def getUserCode(String email) {
    def result = DatabaseUtil.withSql { sql ->
        sql.firstRow('SELECT usr_code FROM users_usr WHERE usr_email = ?', [email])
    }
    return result?.usr_code ?: 'system'
}

// Usage in API
def currentUserEmail = request.remoteUser  // Confluence provides email
def userCode = getUserCode(currentUserEmail)
params.created_by = userCode
params.updated_by = userCode
```

### 2. Association Tables Audit Strategy

#### Current Inconsistencies
| Table | Has Audit Fields | Type |
|-------|-----------------|------|
| teams_tms_x_users_usr | created_at, created_by (INTEGER) | User-Team |
| labels_lbl_x_steps_master_stm | created_at, created_by (INTEGER) | Label-Step |
| teams_tms_x_applications_app | NONE | Team-App |
| Other association tables | Varies | Various |

#### Recommended Approach: Tiered Audit Strategy

**Tier 1: Critical Associations** (Full audit)
- User-Team assignments
- User-Role assignments  
- Permission grants
- Add: `created_at`, `created_by` (VARCHAR), `deleted_at` (for soft deletes)

**Tier 2: Standard Associations** (Minimal audit)
- Team-Application links
- Step-Label associations
- Add: `created_at` only

**Tier 3: Pure Join Tables** (No audit)
- Simple many-to-many relationships with no additional attributes
- No audit fields needed

### 3. Migration Path

#### Phase 1: Standardize Existing Audit Fields
Fix inconsistencies in existing tables:
1. Convert INTEGER `created_by` to VARCHAR(255) in association tables
2. Add missing `created_at` to all Tier 1 and Tier 2 tables

#### Phase 2: Implement Tiered Strategy
```sql
-- Example for teams_tms_x_applications_app (Tier 2)
ALTER TABLE teams_tms_x_applications_app
ADD COLUMN created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- Example for teams_tms_x_users_usr (Tier 1) - fix type
ALTER TABLE teams_tms_x_users_usr
ALTER COLUMN created_by TYPE VARCHAR(255) USING created_by::VARCHAR,
ALTER COLUMN created_by SET DEFAULT 'system';
```

### 4. API Implementation Pattern

```groovy
class AssociationService {
    // Helper to get user code from email
    static String getUserCode(String email) {
        def result = DatabaseUtil.withSql { sql ->
            sql.firstRow('SELECT usr_code FROM users_usr WHERE usr_email = ?', [email])
        }
        return result?.usr_code ?: 'system'
    }
    
    // For Tier 1 associations (critical)
    static Map createCriticalAssociation(Map params, String userEmail) {
        params.created_at = new Timestamp(System.currentTimeMillis())
        params.created_by = getUserCode(userEmail)
        return params
    }
    
    // For Tier 2 associations (standard)
    static Map createStandardAssociation(Map params) {
        params.created_at = new Timestamp(System.currentTimeMillis())
        return params
    }
    
    // For soft delete support (future)
    static Map softDeleteAssociation(Map params, String userEmail) {
        params.deleted_at = new Timestamp(System.currentTimeMillis())
        params.deleted_by = getUserCode(userEmail)
        return params
    }
}
```

### 5. Decision Points

#### Q1: Should we standardize all association tables now?
**Recommendation:** Yes, but using the tiered approach to avoid over-engineering.

#### Q2: Should created_by in associations be VARCHAR or INTEGER (foreign key)?
**Decision:** VARCHAR(255) storing user_code (trigram) for consistency with other tables and human readability.

#### Q3: Should we add updated_at/updated_by to association tables?
**Recommendation:** No, association records are typically immutable (created or deleted, not updated).

### 6. Benefits of This Approach

1. **Consistency**: All tables follow predictable patterns
2. **Flexibility**: Tiered approach avoids over-engineering
3. **Auditability**: Critical associations are fully tracked
4. **Performance**: Minimal overhead for simple associations
5. **Future-Ready**: Supports soft deletes when needed

### 7. Next Steps

1. Review and approve the tiered audit strategy
2. Create migration 017 to standardize association tables
3. Update generators to handle association audit fields
4. Document the pattern in development guidelines
5. Update existing APIs to populate audit fields correctly

## Implementation Checklist

- [x] Approve tiered audit strategy
- [x] Create migration 017_standardize_association_audit_fields.sql
- [x] Update data generators for association tables
- [ ] Update repository patterns for associations (pending)
- [ ] Test with real Confluence usernames (pending)
- [x] Document in dataModel/README.md

## Implementation Summary

Successfully implemented the tiered audit strategy for association tables:

1. **Migration 017**: Created and applied successfully
   - Converted INTEGER created_by to VARCHAR(255) in existing association tables
   - Added created_at to teams_tms_x_applications_app (Tier 2)
   - Created get_user_code() helper function for user trigram lookups
   - Used splitStatements:false to handle PostgreSQL dollar quotes in Liquibase

2. **Data Generators Updated**:
   - 002_generate_teams_apps.js: Added created_at for team-app associations
   - 003_generate_users.js: Updated to use VARCHAR created_by with 'generator'
   - 008_generate_labels.js: Updated all label associations with proper audit fields

3. **Documentation Updated**:
   - dataModel/README.md: Added comprehensive documentation of tiered approach
   - Added audit field value standards (user_code vs system/generator/migration)
   - Updated ERD to reflect association table changes
   - Added implementation patterns for handling audit fields in code

4. **Technical Challenges Resolved**:
   - Fixed Liquibase dollar quote parsing errors with splitStatements directive
   - Handled type conversion from INTEGER to VARCHAR for existing created_by fields
   - Simplified DO blocks to avoid PostgreSQL syntax errors