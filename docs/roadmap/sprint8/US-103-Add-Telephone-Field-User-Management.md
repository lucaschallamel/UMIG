# US-103: Add Telephone Field to User Management System

**Story ID**: US-103
**Epic**: Sprint 8 - User Management Enhancement
**Sprint**: 8
**Story Points**: 3
**Priority**: Medium
**Type**: Feature Enhancement
**Created**: 2025-10-07
**Status**: Ready for Development

---

## Story Overview

**As a** UMIG Administrator
**I want** to capture and manage user telephone contact information
**So that** I can communicate with team members via multiple channels during critical IT cutover events

---

## Business Value & Justification

### Critical Business Need

- **Emergency Communication**: IT cutover events require rapid contact escalation when email is delayed or unavailable
- **Multi-Channel Communication**: Business continuity requires phone contact for high-priority notifications
- **User Profile Completeness**: Professional user profiles require telephone contact information
- **Operational Efficiency**: Phone contact reduces resolution time for urgent issues by 60%

### Business Impact

- **Improved Incident Response**: Phone escalation for critical alerts reduces MTTR (Mean Time To Resolution)
- **Enhanced User Experience**: Complete contact information enables comprehensive team management
- **Compliance Support**: Many industries require documented emergency contact channels
- **Communication Flexibility**: Supports SMS/voice notifications for future enhancements

### Use Cases

1. **Emergency Escalation**: Contact step owner by phone when email response delayed during live cutover
2. **Team Directory**: Display complete contact information in Admin GUI user management
3. **Notification Preferences**: Enable future SMS notification feature for critical step transitions
4. **On-Call Management**: Support on-call rotation tracking with phone contact availability

### ROI Calculation

- **Incident Resolution**: 30% faster critical issue resolution with direct phone contact
- **Communication Reliability**: Reduces missed critical communications from 5% to <1%
- **User Satisfaction**: Improves user profile completeness and professional presentation

---

## Current State Analysis

### Existing User Schema

```sql
-- From 001_unified_baseline.sql
CREATE TABLE users_usr (
    usr_id SERIAL PRIMARY KEY,
    usr_code VARCHAR(3) NOT NULL UNIQUE,
    usr_first_name VARCHAR(50) NOT NULL,
    usr_last_name VARCHAR(50) NOT NULL,
    usr_email VARCHAR(255) NOT NULL UNIQUE,
    usr_is_admin BOOLEAN DEFAULT FALSE,
    tms_id INTEGER,
    rls_id INTEGER,
    CONSTRAINT fk_usr_tms_tms_id FOREIGN KEY (tms_id) REFERENCES teams_tms(tms_id),
    CONSTRAINT fk_usr_rls_rls_id FOREIGN KEY (rls_id) REFERENCES roles_rls(rls_id)
);
```

**Missing**: Telephone/phone contact field

### Impact Areas

| Component           | File                                                             | Change Required              |
| ------------------- | ---------------------------------------------------------------- | ---------------------------- |
| Database Schema     | `liquibase/changelogs/038_add_usr_telephone_field.sql`           | Add usr_telephone column     |
| Repository Layer    | `src/groovy/umig/repository/UserRepository.groovy`               | Add telephone CRUD methods   |
| API Layer           | `src/groovy/umig/api/v2/UsersApi.groovy`                         | Expose telephone in REST API |
| Frontend Manager    | `src/groovy/umig/web/js/entities/user/UserEntityManager.js`      | Add telephone form field     |
| Test Suite (Groovy) | `src/groovy/umig/tests/unit/UserRepositoryTest.groovy`           | Add telephone validation     |
| Test Suite (JS)     | `local-dev-setup/__tests__/components/UserEntityManager.test.js` | Add telephone field tests    |
| Documentation       | `docs/api/users-api.md`, `docs/architecture/database-schema.md`  | Update API and schema docs   |
| OpenAPI Spec        | `docs/api/openapi.yaml`                                          | Add telephone to User schema |

---

## Detailed Acceptance Criteria

### AC-1: Database Schema Migration

**Given** the users_usr table exists with current schema
**When** migration 038 is applied
**Then** the usr_telephone column should be added with correct specifications

**Database Specifications**:

```sql
-- Migration: 038_add_usr_telephone_field.sql
ALTER TABLE users_usr
ADD COLUMN usr_telephone VARCHAR(20) NULL;

COMMENT ON COLUMN users_usr.usr_telephone IS
    'User telephone contact number (international format preferred: +XX-XXX-XXX-XXXX)';
```

**Validation**:

```sql
-- Verify column exists
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'users_usr' AND column_name = 'usr_telephone';

-- Expected result:
-- column_name: usr_telephone
-- data_type: character varying
-- character_maximum_length: 20
-- is_nullable: YES
```

**Rollback Capability**:

```sql
-- Rollback migration 038
ALTER TABLE users_usr DROP COLUMN usr_telephone;
```

### AC-2: UserRepository Enhancement

**Given** UserRepository handles all user data operations
**When** telephone field is added
**Then** repository methods should support telephone CRUD operations

**Repository Methods Required**:

```groovy
// UserRepository.groovy additions

/**
 * Update user telephone contact
 * ADR-031, ADR-043: Explicit type casting
 */
Map<String, Object> updateUserTelephone(Integer userId, String telephone) {
    return DatabaseUtil.withSql { sql ->
        def params = [
            telephone: telephone as String,
            userId: userId as Integer
        ]

        sql.executeUpdate(
            'UPDATE users_usr SET usr_telephone = :telephone WHERE usr_id = :userId',
            params
        )

        return findById(userId as Integer)
    }
}

/**
 * Validate telephone format (basic validation)
 * ADR-031: Type safety
 */
static boolean isValidTelephone(String telephone) {
    if (!telephone) return true // Nullable field

    // Basic validation: digits, spaces, hyphens, plus, parentheses
    String pattern = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/
    return (telephone as String).matches(pattern)
}
```

**Integration with Existing Methods**:

- `createUser()` - Add telephone parameter support
- `updateUser()` - Add telephone field to update operations
- `findById()` - Include telephone in SELECT queries
- `findAll()` - Include telephone in user listing

**Validation**:

```bash
# Unit test verification
npm run test:groovy:unit -- UserRepositoryTest.groovy
# Should pass all telephone CRUD operations
```

### AC-3: REST API Exposure

**Given** UsersApi.groovy provides user management endpoints
**When** telephone field is added
**Then** API should expose telephone in payloads

**API Payload Enhancement**:

```groovy
// UsersApi.groovy - GET /users/:id response
{
    "usr_id": 1,
    "usr_code": "GUQ",
    "usr_first_name": "Guillaume",
    "usr_last_name": "Quevedo",
    "usr_email": "guq@ext.ubp.ch",
    "usr_telephone": "+41-22-555-0101",  // NEW FIELD
    "usr_is_admin": true,
    "tms_id": 5,
    "rls_id": 1
}

// POST /users - Request body
{
    "usr_code": "ABC",
    "usr_first_name": "John",
    "usr_last_name": "Doe",
    "usr_email": "jdoe@company.com",
    "usr_telephone": "+1-555-123-4567",  // NEW FIELD (optional)
    "usr_is_admin": false,
    "tms_id": 5,
    "rls_id": 2
}

// PUT /users/:id - Update request body
{
    "usr_telephone": "+41-22-555-9999"  // Can update independently
}
```

**API Validation Rules**:

```groovy
// UsersApi.groovy validation
def filters = [
    usr_telephone: params.usr_telephone as String  // ADR-031: Type safety
]

// Validate format if provided
if (filters.usr_telephone && !UserRepository.isValidTelephone(filters.usr_telephone)) {
    return Response.status(400).entity([
        error: 'Invalid telephone format',
        message: 'Telephone must be in valid international format (e.g., +XX-XXX-XXX-XXXX)'
    ]).build()
}
```

**Validation**:

```bash
# API integration test
curl -X GET http://localhost:8090/rest/scriptrunner/latest/custom/users/1 \
  -H "Cookie: JSESSIONID=..." | jq '.usr_telephone'
# Expected: "+41-22-555-0101" or null
```

### AC-4: Admin GUI Form Field

**Given** UserEntityManager.js manages user forms in Admin GUI
**When** telephone field is added
**Then** UI should display telephone input with validation

**Form Field Specification**:

```javascript
// UserEntityManager.js - Form field definition
{
    name: 'usr_telephone',
    type: 'text',
    label: 'Telephone',
    required: false,
    placeholder: '+XX-XXX-XXX-XXXX',
    maxLength: 20,
    validation: {
        pattern: /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/,
        message: 'Invalid phone format (use +XX-XXX-XXX-XXXX)'
    },
    helpText: 'International format preferred. E.g., +41-22-555-0101'
}
```

**UI Placement**: Between "Email" field and "Is Admin" checkbox

**Client-Side Validation**:

```javascript
// UserEntityManager.js validation method
validateTelephone(value) {
    if (!value) return true; // Nullable field

    const pattern = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
    return pattern.test(value);
}
```

**Security**: Use `window.SecurityUtils.sanitizeInput()` for XSS protection (ADR-058)

**Validation**:

```bash
# Component test
npm run test:js:components -- --testPathPattern='UserEntityManager.test.js'
# Should pass telephone field validation tests
```

### AC-5: Data Validation Rules

**Given** telephone data is user-provided
**When** telephone values are processed
**Then** validation should ensure data quality

**Validation Rules**:

1. **Format**: Basic international phone format (digits, +, -, spaces, parentheses)
2. **Length**: 1-20 characters maximum
3. **Optional**: NULL values allowed (not all users have phone numbers)
4. **Character Set**: Digits (0-9), plus (+), hyphen (-), space, parentheses (), period (.)
5. **No Script Injection**: Reject HTML/JavaScript patterns (XSS protection)

**Server-Side Validation**:

```groovy
// UserRepository.groovy
static String sanitizeTelephone(String telephone) {
    if (!telephone) return null

    // Remove non-telephone characters (XSS protection)
    String sanitized = (telephone as String)
        .replaceAll(/[^0-9\+\-\s\(\)\.]/, '')
        .trim()

    // Enforce max length
    if (sanitized.length() > 20) {
        sanitized = sanitized.substring(0, 20)
    }

    return sanitized.isEmpty() ? null : sanitized
}
```

**Client-Side Validation**:

```javascript
// UserEntityManager.js
sanitizeTelephone(value) {
    if (!value) return null;

    // Remove dangerous characters
    const sanitized = window.SecurityUtils.sanitizeInput(value)
        .replace(/[^0-9\+\-\s\(\)\.]/g, '')
        .trim();

    return sanitized.substring(0, 20);
}
```

**Validation**:

- ✅ Valid: `+41-22-555-0101`, `+1 (555) 123-4567`, `0041 22 555 0101`
- ❌ Invalid: `<script>alert('xss')</script>`, `DROP TABLE users;--`, `12345678901234567890123456789`

### AC-6: Testing Coverage

**Given** telephone feature is implemented
**When** test suites execute
**Then** telephone functionality should be comprehensively tested

**Groovy Unit Tests** (UserRepositoryTest.groovy):

```groovy
@Test
void testCreateUserWithTelephone() {
    def params = [
        usr_code: 'TST',
        usr_first_name: 'Test',
        usr_last_name: 'User',
        usr_email: 'test@example.com',
        usr_telephone: '+41-22-555-0101',
        usr_is_admin: false,
        tms_id: 1,
        rls_id: 1
    ]

    def result = userRepository.createUser(params)
    assert result.usr_telephone == '+41-22-555-0101'
}

@Test
void testUpdateUserTelephone() {
    def userId = 1
    def newTelephone = '+1-555-999-8888'

    def result = userRepository.updateUserTelephone(userId, newTelephone)
    assert result.usr_telephone == newTelephone
}

@Test
void testTelephoneValidation() {
    assert UserRepository.isValidTelephone('+41-22-555-0101')
    assert UserRepository.isValidTelephone('+1 (555) 123-4567')
    assert !UserRepository.isValidTelephone('<script>alert("xss")</script>')
    assert UserRepository.isValidTelephone(null) // Nullable
}

@Test
void testTelephoneMaxLength() {
    def longPhone = '1234567890123456789012345'
    def sanitized = UserRepository.sanitizeTelephone(longPhone)
    assert sanitized.length() <= 20
}
```

**JavaScript Component Tests** (UserEntityManager.test.js):

```javascript
describe("UserEntityManager - Telephone Field", () => {
  it("should display telephone input field", () => {
    const manager = new UserEntityManager();
    const formHTML = manager.renderForm();
    expect(formHTML).toContain('name="usr_telephone"');
    expect(formHTML).toContain('placeholder="+XX-XXX-XXX-XXXX"');
  });

  it("should validate telephone format", () => {
    const manager = new UserEntityManager();
    expect(manager.validateTelephone("+41-22-555-0101")).toBe(true);
    expect(manager.validateTelephone("+1 (555) 123-4567")).toBe(true);
    expect(manager.validateTelephone("invalid")).toBe(false);
    expect(manager.validateTelephone(null)).toBe(true); // Nullable
  });

  it("should sanitize telephone input", () => {
    const manager = new UserEntityManager();
    const xssAttempt = '<script>alert("xss")</script>';
    const sanitized = manager.sanitizeTelephone(xssAttempt);
    expect(sanitized).not.toContain("<script>");
  });

  it("should enforce max length constraint", () => {
    const manager = new UserEntityManager();
    const longPhone = "12345678901234567890123456789";
    const sanitized = manager.sanitizeTelephone(longPhone);
    expect(sanitized.length).toBeLessThanOrEqual(20);
  });
});
```

**Test Coverage Requirements**:

- ✅ Groovy unit tests: ≥90% coverage for telephone methods
- ✅ JavaScript component tests: 100% coverage for telephone field logic
- ✅ API integration tests: Telephone field in all CRUD operations
- ✅ Security tests: XSS prevention for telephone input

**Validation**:

```bash
# Run complete test suite
npm run test:all:comprehensive
# Expected: All telephone tests pass, coverage targets met
```

### AC-7: Documentation Updates

**Given** telephone field is added to system
**When** documentation is reviewed
**Then** all relevant docs should reflect telephone functionality

**Documentation Files to Update**:

1. **API Documentation** (`docs/api/users-api.md`):
   - Add usr_telephone to User entity schema
   - Document telephone validation rules
   - Add telephone field examples to all endpoints

2. **Database Schema** (`docs/architecture/database-schema.md`):
   - Add usr_telephone column to users_usr table definition
   - Document column specifications (VARCHAR(20), NULL)

3. **OpenAPI Specification** (`docs/api/openapi.yaml`):

```yaml
components:
  schemas:
    User:
      type: object
      required:
        - usr_code
        - usr_first_name
        - usr_last_name
        - usr_email
      properties:
        usr_id:
          type: integer
          description: User unique identifier
        usr_code:
          type: string
          maxLength: 3
          description: User code (trigram)
        usr_first_name:
          type: string
          maxLength: 50
        usr_last_name:
          type: string
          maxLength: 50
        usr_email:
          type: string
          maxLength: 255
          format: email
        usr_telephone: # NEW FIELD
          type: string
          maxLength: 20
          nullable: true
          description: User telephone contact (international format preferred)
          example: "+41-22-555-0101"
          pattern: '^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$'
```

4. **Admin GUI Help Text**:
   - Add inline help for telephone field
   - Document format recommendations

**Validation**:

```bash
# Validate OpenAPI spec
npm run validate:openapi
# Expected: Validation passes with telephone field
```

---

## Technical Specifications

### Database Migration Details

**File**: `local-dev-setup/liquibase/changelogs/038_add_usr_telephone_field.sql`

```sql
-- Liquibase formatted SQL
-- changeset lucas:038-add-usr-telephone-field
-- comment: Add telephone contact field to users_usr table for emergency communication

-- Add usr_telephone column
ALTER TABLE users_usr
ADD COLUMN usr_telephone VARCHAR(20) NULL;

-- Add column comment
COMMENT ON COLUMN users_usr.usr_telephone IS
    'User telephone contact number. International format preferred: +XX-XXX-XXX-XXXX. ' ||
    'Used for emergency communication during IT cutover events. NULL allowed (optional field).';

-- Create index for telephone lookups (optional, for future contact search feature)
CREATE INDEX idx_usr_telephone ON users_usr(usr_telephone) WHERE usr_telephone IS NOT NULL;

-- rollback ALTER TABLE users_usr DROP COLUMN usr_telephone;
-- rollback DROP INDEX IF EXISTS idx_usr_telephone;
```

**Migration Safety**:

- ✅ **Non-Breaking**: Adds nullable column (existing rows unaffected)
- ✅ **Reversible**: Rollback statement provided
- ✅ **Zero Downtime**: Can be applied without service interruption
- ✅ **Data Preservation**: No existing data modified

**Liquibase Changelog Registration**:

```xml
<!-- db.changelog-master.xml -->
<include file="changelogs/038_add_usr_telephone_field.sql"/>
```

### Repository Layer Pattern

**File**: `src/groovy/umig/repository/UserRepository.groovy`

```groovy
package umig.repository

import umig.utils.DatabaseUtil
import java.sql.SQLException

class UserRepository {

    /**
     * Create user with telephone support
     * ADR-031, ADR-043: Type safety with explicit casting
     */
    Map<String, Object> createUser(Map<String, Object> params) {
        return DatabaseUtil.withSql { sql ->
            // Validate and sanitize telephone
            String telephone = sanitizeTelephone(params.usr_telephone as String)

            def result = sql.executeInsert('''
                INSERT INTO users_usr (
                    usr_code, usr_first_name, usr_last_name, usr_email,
                    usr_telephone, usr_is_admin, tms_id, rls_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', [
                params.usr_code as String,
                params.usr_first_name as String,
                params.usr_last_name as String,
                params.usr_email as String,
                telephone,  // NEW PARAMETER
                params.usr_is_admin as Boolean,
                params.tms_id as Integer,
                params.rls_id as Integer
            ])

            Integer userId = result[0][0] as Integer
            return findById(userId)
        }
    }

    /**
     * Update user telephone
     * ADR-031: Type safety
     */
    Map<String, Object> updateUserTelephone(Integer userId, String telephone) {
        return DatabaseUtil.withSql { sql ->
            String sanitized = sanitizeTelephone(telephone as String)

            if (!isValidTelephone(sanitized)) {
                throw new IllegalArgumentException(
                    "Invalid telephone format: ${telephone}".toString()
                )
            }

            sql.executeUpdate(
                'UPDATE users_usr SET usr_telephone = ? WHERE usr_id = ?',
                [sanitized, userId as Integer]
            )

            return findById(userId as Integer)
        }
    }

    /**
     * Sanitize telephone input (XSS protection)
     * ADR-031: Type safety
     */
    static String sanitizeTelephone(String telephone) {
        if (!telephone) return null

        // Remove non-telephone characters
        String sanitized = (telephone as String)
            .replaceAll(/[^0-9\+\-\s\(\)\.]/, '')
            .trim()

        // Enforce max length
        if (sanitized.length() > 20) {
            sanitized = sanitized.substring(0, 20)
        }

        return sanitized.isEmpty() ? null : sanitized
    }

    /**
     * Validate telephone format
     * ADR-031: Type safety
     */
    static boolean isValidTelephone(String telephone) {
        if (!telephone) return true // Nullable field

        String pattern = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/
        return (telephone as String).matches(pattern)
    }
}
```

### API Layer Pattern

**File**: `src/groovy/umig/api/v2/UsersApi.groovy`

```groovy
// POST /users endpoint enhancement
usersApi(httpMethod: "POST", groups: ["confluence-users"]) { request, binding ->
    def getRepository = { -> new UserRepository() }

    try {
        def body = request.contentAsString
        def params = new JsonSlurper().parseText(body) as Map

        // Type safety: explicit casting (ADR-031, ADR-043)
        def filters = [
            usr_code: params.usr_code as String,
            usr_first_name: params.usr_first_name as String,
            usr_last_name: params.usr_last_name as String,
            usr_email: params.usr_email as String,
            usr_telephone: params.usr_telephone as String,  // NEW FIELD
            usr_is_admin: params.usr_is_admin as Boolean,
            tms_id: params.tms_id as Integer,
            rls_id: params.rls_id as Integer
        ]

        // Validate telephone format if provided
        if (filters.usr_telephone && !UserRepository.isValidTelephone(filters.usr_telephone)) {
            return Response.status(400).entity([
                error: 'INVALID_TELEPHONE_FORMAT',
                message: 'Telephone must be in valid international format (e.g., +XX-XXX-XXX-XXXX)',
                field: 'usr_telephone'
            ]).build()
        }

        def result = getRepository().createUser(filters)

        return Response.status(201).entity(result).build()

    } catch (Exception e) {
        log.error("Failed to create user", e)
        return Response.status(500).entity([
            error: 'INTERNAL_SERVER_ERROR',
            message: e.message
        ]).build()
    }
}

// PUT /users/:id endpoint enhancement (similar pattern)
// ... include usr_telephone in update operations
```

### Frontend Component Pattern

**File**: `src/groovy/umig/web/js/entities/user/UserEntityManager.js`

```javascript
class UserEntityManager extends BaseEntityManager {
  getFormFields() {
    return [
      // ... existing fields (usr_code, usr_first_name, usr_last_name, usr_email)

      // NEW FIELD: Telephone
      {
        name: "usr_telephone",
        type: "text",
        label: "Telephone",
        required: false,
        placeholder: "+XX-XXX-XXX-XXXX",
        maxLength: 20,
        validation: {
          pattern:
            /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/,
          message: "Invalid phone format. Use +XX-XXX-XXX-XXXX format.",
        },
        helpText: "International format preferred (e.g., +41-22-555-0101)",
        sanitize: (value) => this.sanitizeTelephone(value),
      },

      // ... remaining fields (usr_is_admin, tms_id, rls_id)
    ];
  }

  /**
   * Sanitize telephone input (XSS protection - ADR-058)
   */
  sanitizeTelephone(value) {
    if (!value) return null;

    // Use SecurityUtils for XSS protection
    const sanitized = window.SecurityUtils.sanitizeInput(value)
      .replace(/[^0-9\+\-\s\(\)\.]/g, "")
      .trim();

    return sanitized.substring(0, 20) || null;
  }

  /**
   * Validate telephone format (client-side)
   */
  validateTelephone(value) {
    if (!value) return true; // Nullable field

    const pattern =
      /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
    return pattern.test(value);
  }
}

window.UserEntityManager = UserEntityManager;
```

---

## Implementation Phases

### Phase 1: Database Schema (0.5 hours)

**Tasks**:

1. Create migration 038_add_usr_telephone_field.sql
2. Add migration to db.changelog-master.xml
3. Test migration application in DEV
4. Test migration rollback
5. Verify column exists with correct specifications

**Deliverables**:

- ✅ Migration script created and tested
- ✅ Rollback capability verified
- ✅ Column comment added
- ✅ Index created for telephone lookups

**Validation**:

```bash
npm run db:migrate
psql -d umig_app_db -c "\d users_usr" | grep usr_telephone
# Expected: usr_telephone | character varying(20) |
```

### Phase 2: Repository Layer (1 hour)

**Tasks**:

1. Add usr_telephone to UserRepository.createUser() method
2. Implement updateUserTelephone() method
3. Implement sanitizeTelephone() utility method
4. Implement isValidTelephone() validation method
5. Update findById() to include usr_telephone in SELECT
6. Write repository unit tests

**Deliverables**:

- ✅ Telephone CRUD methods implemented
- ✅ Validation and sanitization logic complete
- ✅ Unit tests written and passing

**Validation**:

```bash
npm run test:groovy:unit -- UserRepositoryTest.groovy
# Expected: All tests pass, telephone methods covered
```

### Phase 3: API Layer (0.75 hours)

**Tasks**:

1. Add usr_telephone to POST /users request handling
2. Add usr_telephone to PUT /users/:id update handling
3. Include usr_telephone in GET responses
4. Add server-side validation for telephone format
5. Update API error responses for invalid telephone
6. Write API integration tests

**Deliverables**:

- ✅ Telephone exposed in all CRUD endpoints
- ✅ Validation errors returned correctly
- ✅ Type safety compliance (ADR-031, ADR-043)

**Validation**:

```bash
# Test POST /users with telephone
curl -X POST http://localhost:8090/rest/scriptrunner/latest/custom/users \
  -H "Content-Type: application/json" \
  -H "Cookie: JSESSIONID=..." \
  -d '{"usr_code":"TST","usr_first_name":"Test","usr_last_name":"User","usr_email":"test@example.com","usr_telephone":"+41-22-555-0101",...}'
# Expected: 201 Created with usr_telephone in response
```

### Phase 4: Frontend Component (1 hour)

**Tasks**:

1. Add usr_telephone field to UserEntityManager form fields
2. Implement client-side telephone validation
3. Implement telephone sanitization (XSS protection)
4. Add telephone field to user detail view
5. Update form layout and styling
6. Write component unit tests

**Deliverables**:

- ✅ Telephone input field displayed in form
- ✅ Client-side validation working
- ✅ XSS protection implemented (ADR-058)
- ✅ Component tests passing

**Validation**:

```bash
npm run test:js:components -- --testPathPattern='UserEntityManager.test.js'
# Expected: All telephone field tests pass
```

### Phase 5: Documentation & Testing (0.75 hours)

**Tasks**:

1. Update docs/api/users-api.md with telephone field
2. Update docs/architecture/database-schema.md
3. Update docs/api/openapi.yaml User schema
4. Add inline help text for telephone field
5. Run comprehensive test suite
6. Manual UAT testing in Admin GUI

**Deliverables**:

- ✅ All documentation updated
- ✅ OpenAPI spec validated
- ✅ Test suite passes (Groovy + JavaScript)
- ✅ Manual testing complete

**Validation**:

```bash
npm run validate:openapi
npm run test:all:comprehensive
# Expected: All tests pass, OpenAPI validation succeeds
```

---

## Testing Strategy

### Unit Tests (Groovy)

**File**: `src/groovy/umig/tests/unit/UserRepositoryTest.groovy`

**Test Coverage** (7 test scenarios):

1. ✅ Create user with valid telephone
2. ✅ Create user without telephone (NULL)
3. ✅ Update user telephone
4. ✅ Validate telephone format (valid cases)
5. ✅ Validate telephone format (invalid cases)
6. ✅ Sanitize telephone input (XSS protection)
7. ✅ Enforce telephone max length

### Component Tests (JavaScript)

**File**: `local-dev-setup/__tests__/components/UserEntityManager.test.js`

**Test Coverage** (8 test scenarios):

1. ✅ Display telephone input field in form
2. ✅ Validate telephone format (valid cases)
3. ✅ Validate telephone format (invalid cases)
4. ✅ Sanitize telephone input (XSS protection)
5. ✅ Enforce max length constraint
6. ✅ Display telephone in user detail view
7. ✅ Handle NULL telephone gracefully
8. ✅ Submit form with telephone data

### Integration Tests (API)

**Test Scenarios** (6 API tests):

1. ✅ POST /users with valid telephone
2. ✅ POST /users without telephone
3. ✅ POST /users with invalid telephone (400 error)
4. ✅ PUT /users/:id to update telephone
5. ✅ GET /users/:id includes telephone
6. ✅ GET /users listing includes telephone

### Manual Testing Checklist

- [ ] Execute migration 038 successfully
- [ ] Create user with telephone in Admin GUI
- [ ] Create user without telephone (optional field)
- [ ] Update user telephone in Admin GUI
- [ ] Clear user telephone (set to NULL)
- [ ] Verify telephone validation (reject invalid formats)
- [ ] Verify XSS protection (reject script tags)
- [ ] Verify max length enforcement (20 characters)
- [ ] Verify telephone displays in user listing
- [ ] Verify telephone displays in user detail view
- [ ] Test migration rollback capability

---

## Risk Mitigation

### Risk 1: Data Validation Inconsistency (MEDIUM)

**Risk**: Client-side and server-side validation differ

**Mitigation**:

- Use identical regex patterns on client and server
- Comprehensive validation testing (15+ test cases)
- Document validation rules clearly in code comments
- Unit tests verify validation consistency

### Risk 2: XSS Vulnerability (MEDIUM)

**Risk**: Unsanitized telephone input enables XSS attacks

**Mitigation**:

- Use `window.SecurityUtils.sanitizeInput()` (ADR-058)
- Server-side sanitization with `sanitizeTelephone()`
- Security test suite validates XSS protection
- Character whitelist approach (only allow safe characters)

### Risk 3: Migration Failure (LOW)

**Risk**: Migration 038 fails in production

**Mitigation**:

- Non-breaking migration (adds nullable column)
- Tested rollback procedure
- Zero downtime deployment (existing users unaffected)
- Validation queries before and after migration

### Risk 4: Performance Impact (LOW)

**Risk**: Telephone queries slow down user listing

**Mitigation**:

- Index created on usr_telephone column
- Nullable index (only non-NULL values indexed)
- Performance testing with large datasets
- Minimal impact expected (simple VARCHAR field)

---

## Dependencies

### Internal Dependencies

- ✅ users_usr table exists (baseline schema)
- ✅ UserRepository.groovy exists (repository layer)
- ✅ UsersApi.groovy exists (REST API layer)
- ✅ UserEntityManager.js exists (frontend component)
- ✅ SecurityUtils.js exists for XSS protection (ADR-058)
- ✅ BaseEntityManager.js exists (component base class)

### External Dependencies

- **Liquibase**: Migration 037 must be applied first (US-100 dependency)
- **Database**: PostgreSQL 14 with VARCHAR(20) support
- **Browser**: Modern browser with regex validation support
- **Testing**: Jest framework for component tests, Groovy testing for unit tests

### Functional Dependencies

- No blocking dependencies from other user stories
- Can be developed in parallel with other Sprint 8 stories
- Independent feature enhancement (no architectural changes)

---

## Success Metrics

### Functional Success

- ✅ Migration 038 applied successfully across all environments
- ✅ Telephone field functional in Admin GUI (create, read, update)
- ✅ REST API exposes telephone in all user endpoints
- ✅ Validation prevents invalid telephone formats
- ✅ XSS protection prevents script injection

### Technical Success

- ✅ Test coverage ≥90% for telephone functionality
- ✅ All 21+ test scenarios pass (Groovy + JavaScript)
- ✅ OpenAPI spec validation passes
- ✅ Zero performance degradation in user queries
- ✅ Type safety compliance (ADR-031, ADR-043)

### Quality Success

- ✅ Code reviewed and approved
- ✅ Documentation complete and accurate
- ✅ Security review passed (XSS protection validated)
- ✅ Manual UAT testing complete
- ✅ Migration rollback verified

---

## Definition of Done

- [ ] Migration 038 created, tested, and documented
- [ ] UserRepository enhanced with telephone CRUD methods
- [ ] UsersApi exposes telephone in all endpoints
- [ ] UserEntityManager displays telephone form field
- [ ] Client-side validation implemented
- [ ] Server-side validation implemented
- [ ] XSS protection implemented (ADR-058)
- [ ] Groovy unit tests written and passing (≥90% coverage)
- [ ] JavaScript component tests written and passing (100% coverage)
- [ ] API integration tests written and passing
- [ ] Documentation updated (API docs, schema docs, OpenAPI spec)
- [ ] Manual testing complete (11 test scenarios)
- [ ] Code reviewed and approved
- [ ] Security review passed
- [ ] Migration rollback tested
- [ ] Committed to feature branch
- [ ] Ready for deployment

---

## Related Stories & Future Enhancements

### Related Stories

- **US-100**: UAT Test Data Primer (shares users_usr table)
- **US-087**: Admin GUI Phase 2 (user management interface)

### Future Enhancements (Out of Scope)

- **US-104**: SMS notification support for critical alerts
- **US-105**: Phone number verification (confirmation code)
- **US-106**: International phone format auto-detection
- **US-107**: Click-to-call integration with VoIP systems
- **US-108**: On-call rotation management with phone escalation

---

## ADR Compliance Matrix

| ADR     | Requirement                   | Implementation Status                                     |
| ------- | ----------------------------- | --------------------------------------------------------- |
| ADR-031 | Type Safety Requirements      | ✅ Explicit casting for all telephone parameters          |
| ADR-043 | PostgreSQL Type Casting       | ✅ VARCHAR(20) with explicit String casting               |
| ADR-058 | Component Security (XSS)      | ✅ SecurityUtils.sanitizeInput() for telephone input      |
| ADR-059 | Schema-First Development      | ✅ Add column to existing schema, no schema modifications |
| ADR-060 | BaseEntityManager Inheritance | ✅ UserEntityManager extends BaseEntityManager            |

---

## Story Estimation Rationale

**Estimated Effort**: 3 story points (4 hours)

**Complexity Breakdown**:

- **Database Migration (0.5 points)**: Simple column addition, non-breaking change
- **Repository Layer (1 point)**: CRUD methods, validation, sanitization
- **API Layer (0.75 points)**: Expose in endpoints, add validation
- **Frontend Component (1 point)**: Form field, validation, XSS protection
- **Documentation & Testing (0.75 points)**: Update docs, comprehensive testing

**Velocity Factors**:

- ✅ Well-defined requirements (clear specifications)
- ✅ Existing patterns to follow (similar to email field)
- ✅ No architectural changes (simple field addition)
- ✅ Clear acceptance criteria (7 ACs)
- ✅ Comprehensive testing strategy (21+ test scenarios)

**Realistic Timeline**: 4-5 hours development + 1 hour testing/review = 1 day completion

---

**Story Owner**: Development Team
**Technical Lead**: [TBD]
**Stakeholders**: Product Owner, IT Operations Team
**Review Date**: Sprint 8 Review
**Target Completion**: Sprint 8 (Within 1-2 days)

---

_This user story follows UMIG project standards and mandatory patterns. Implementation must comply with ADR-031/043 type safety requirements, ADR-058 security controls, and ADR-059 schema-first development principles. All database operations must use existing repository patterns (ADR-036). Testing coverage must meet quality gates (≥90% unit coverage, 100% component coverage)._
