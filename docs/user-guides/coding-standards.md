# UMIG Coding Standards and Best Practices

This document outlines the **non-negotiable** coding standards and best practices for the UMIG project. All code contributions must adhere to these standards to ensure consistency, maintainability, and security.

## Table of Contents

1. [Architectural Principles](#architectural-principles)
2. [Database Patterns](#database-patterns)
3. [API Development Standards](#api-development-standards)
4. [Frontend Development Rules](#frontend-development-rules)
5. [Component Architecture Standards](#component-architecture-standards)
6. [Type Safety Requirements](#type-safety-requirements)
7. [Error Handling Standards](#error-handling-standards)
8. [Security Requirements](#security-requirements)
9. [Testing Standards](#testing-standards)
10. [Documentation Requirements](#documentation-requirements)

## Architectural Principles

### Non-Negotiable Standards

1. **Database Access**: `DatabaseUtil.withSql` pattern ONLY
2. **Type Safety**: Explicit casting for ALL parameters
3. **Frontend**: Pure vanilla JavaScript, NO frameworks
4. **Security**: `groups: ["confluence-users"]` on all endpoints
5. **Testing**: Self-contained architecture for Groovy tests
6. **Naming**: Database `snake_case` with `_master_`/`_instance_` suffixes
7. **Repository Pattern**: ALL data access through repositories
8. **Error Handling**: SQL state mappings with actionable messages
9. **Layer Separation**: Single enrichment point in repositories (ADR-047)
10. **Service Layer**: Unified DTOs with transformation service (ADR-049)

### Project Structure Compliance

```
src/groovy/umig/
├── api/v2/              # REST API endpoints only
├── macros/v1/           # ScriptRunner macros only
├── repository/          # Data access layer only
├── tests/               # All Groovy tests
├── utils/               # Utility classes
└── web/                 # Frontend assets only
    ├── css/             # Stylesheets
    └── js/              # JavaScript files
```

**Rule**: Never place files outside their designated directories.

## Database Patterns

### Mandatory Database Access Pattern

**ALWAYS use `DatabaseUtil.withSql`**:

```groovy
// ✅ CORRECT - Use this pattern exclusively
static List<Map<String, Object>> findAll() {
    return DatabaseUtil.withSql { sql ->
        return sql.rows('SELECT * FROM table_name ORDER BY name')
    }
}

// ❌ INCORRECT - Never use direct SQL connections
static List<Map<String, Object>> findAllIncorrect() {
    // Direct database connections are forbidden
}
```

### Database Naming Conventions

**Tables**:

```sql
-- Pattern: {entity}_{type}_{abbreviation}
users_master_usm          -- Master/template records
users_instance_usi        -- Instance/execution records
teams_master_tem          -- Teams master
teams_instance_tei        -- Teams instance
```

**Columns**:

```sql
-- Pattern: {abbreviation}_{field_name}
usm_id UUID PRIMARY KEY   -- User master ID
usm_name VARCHAR(100)     -- User master name
usm_email VARCHAR(255)    -- User master email
```

**Constraints and Indexes**:

```sql
-- Foreign Keys: fk_{source_table}_{target_table}
CONSTRAINT fk_teams_master_users_master

-- Indexes: idx_{table}_{column(s)}
CREATE INDEX idx_users_master_email ON users_master_usm(usm_email);

-- Check Constraints: chk_{table}_{column}
CONSTRAINT chk_users_master_status CHECK (usm_status IN ('ACTIVE', 'INACTIVE'))
```

### Schema Authority Principle (ADR-059)

**Rule**: Database schema is immutable truth - fix code, not schema.

```groovy
// ✅ CORRECT - Adapt code to match schema
def result = sql.rows('''
    SELECT usm_id, usm_name, usm_email
    FROM users_master_usm
    WHERE usm_status = ?
''', ['ACTIVE'])

// ❌ INCORRECT - Never modify schema to match code expectations
// ALTER TABLE users_master_usm RENAME COLUMN usm_name TO name; -- FORBIDDEN
```

## API Development Standards

### REST Endpoint Pattern

**Mandatory Template**:

```groovy
@BaseScript CustomEndpointDelegate delegate

entityName(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    try {
        // 1. Explicit type casting (MANDATORY)
        def migrationId = UUID.fromString(filters.migrationId as String)
        def limit = Integer.parseInt(filters.limit as String ?: "50")

        // 2. Repository pattern with DatabaseUtil
        def repository = new EntityRepository()
        def results = repository.findByMigration(migrationId, limit)

        // 3. Return JSON response
        return Response.ok(new JsonBuilder(results).toString()).build()

    } catch (IllegalArgumentException e) {
        // 4. Proper error handling with actionable messages
        return Response.status(400)
            .entity(new JsonBuilder([error: "Invalid parameter format"]).toString())
            .build()
    }
}
```

### Admin GUI Compatibility

**Handle parameterless calls**:

```groovy
// ✅ REQUIRED - Admin GUI compatibility
if (!filters || filters.isEmpty()) {
    return Response.ok(new JsonBuilder([]).toString()).build()
}

// Regular processing for non-empty filters
def results = repository.findAll(filters)
return Response.ok(new JsonBuilder(results).toString()).build()
```

### SQL State Error Mappings

**Mandatory error mappings**:

```groovy
catch (SQLException e) {
    switch (e.getSQLState()) {
        case '23503': // Foreign key violation
            return Response.status(400)
                .entity(new JsonBuilder([
                    error: "Referenced entity does not exist",
                    detail: "Check that all referenced IDs are valid"
                ]).toString()).build()

        case '23505': // Unique constraint violation
            return Response.status(409)
                .entity(new JsonBuilder([
                    error: "Entity already exists",
                    detail: "An entity with this identifier already exists"
                ]).toString()).build()

        default:
            return Response.status(500)
                .entity(new JsonBuilder([error: "Database error"]).toString())
                .build()
    }
}
```

## Frontend Development Rules

### Zero Framework Policy

**FORBIDDEN**:

- React, Vue, Angular, or any JavaScript framework
- jQuery (use vanilla JavaScript)
- External CSS frameworks beyond Atlassian AUI
- Build tools that require compilation (TypeScript, JSX, etc.)

**REQUIRED**:

- Pure vanilla JavaScript ES6+
- Atlassian AUI for styling
- Dynamic rendering without page reloads
- Manual DOM manipulation

### JavaScript Patterns

**✅ CORRECT JavaScript Pattern**:

```javascript
// Use vanilla JavaScript with modern ES6+ features
class EntityManager {
  constructor() {
    this.apiEndpoint = "/rest/scriptrunner/latest/custom/entity";
    this.cache = new Map();
  }

  async fetchEntities() {
    try {
      const response = await fetch(this.apiEndpoint);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch entities:", error);
      throw error;
    }
  }

  renderEntityList(entities) {
    const container = document.getElementById("entity-list");
    container.innerHTML = entities
      .map(
        (entity) => `
            <div class="entity-item" data-id="${entity.id}">
                <h3>${this.escapeHtml(entity.name)}</h3>
                <p>${this.escapeHtml(entity.description)}</p>
            </div>
        `,
      )
      .join("");
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}
```

**❌ INCORRECT - Framework Usage**:

```javascript
// FORBIDDEN - No React/Vue/Angular
function EntityComponent() {
  const [entities, setEntities] = useState([]);
  return (
    <div>
      {entities.map((e) => (
        <Entity key={e.id} data={e} />
      ))}
    </div>
  );
}
```

## Component Architecture Standards

### BaseEntityManager Pattern (ADR-060)

**All entity managers MUST extend BaseEntityManager**:

```javascript
class NewEntityManager extends BaseEntityManager {
  constructor() {
    super();
    this.entityName = "newentity";
    this.apiEndpoint = "/rest/scriptrunner/latest/custom/newentity";
    this.displayName = "New Entity";
    this.fields = this.defineFields();
  }

  defineFields() {
    return {
      ne_id: {
        label: "ID",
        type: "uuid",
        required: true,
        readonly: true,
      },
      ne_name: {
        label: "Name",
        type: "text",
        required: true,
        validation: {
          maxLength: 100,
          pattern: /^[a-zA-Z0-9\s-]+$/,
        },
      },
    };
  }

  // Override validation if needed
  async validateEntity(entity) {
    const errors = await super.validateEntity(entity);
    // Custom validation logic
    return errors;
  }
}

// ✅ MANDATORY - Register with global scope
window.NewEntityManager = NewEntityManager;
```

### Module Loading Anti-Pattern (ADR-057)

**❌ FORBIDDEN - IIFE Wrapper with Availability Checks**:

```javascript
// DO NOT USE - Causes race conditions
(function() {
    if (typeof BaseComponent === 'undefined') {
        console.error('BaseComponent not available');
        return;
    }
    class ModalComponent extends BaseComponent { ... }
})();
```

**✅ REQUIRED - Direct Class Declaration**:

```javascript
// USE THIS PATTERN - Direct class declaration
class ModalComponent extends BaseComponent {
  constructor() {
    super();
    // Component implementation
  }
}

// Always register with global scope
window.ModalComponent = ModalComponent;
```

## Type Safety Requirements

### Explicit Casting (ADR-031, ADR-043)

**MANDATORY for all parameters**:

```groovy
// ✅ REQUIRED - Explicit casting for ALL parameters
params.migrationId = UUID.fromString(filters.migrationId as String)
params.teamId = Integer.parseInt(filters.teamId as String)
params.name = (filters.name as String).toUpperCase()
params.isActive = Boolean.parseBoolean(filters.isActive as String)

// ❌ FORBIDDEN - No implicit casting
params.migrationId = filters.migrationId  // Will cause type errors
params.teamId = filters.teamId           // Will cause type errors
```

### Static Type Checking Compliance

**Enable static compilation**:

```groovy
@CompileStatic
class MyRepository {
    // All methods must be statically typed
    static List<Map<String, Object>> findAll() {
        // Implementation
    }
}
```

### Null Safety Patterns

```groovy
// ✅ Defensive null checking
def name = entity?.name ?: 'Unknown'
def count = results?.size() ?: 0

// ✅ Explicit null checks
if (entity != null && entity.name != null) {
    processEntity(entity)
}

// ❌ AVOID - Direct access without null checks
def length = entity.name.length()  // Can cause NPE
```

## Error Handling Standards

### Exception Handling Hierarchy

```groovy
try {
    // Database operation
    return repository.performOperation(params)

} catch (IllegalArgumentException e) {
    // Bad request - client error
    return Response.status(400)
        .entity(new JsonBuilder([
            error: "Invalid input",
            detail: e.getMessage()
        ]).toString()).build()

} catch (SQLException e) {
    // Database-specific error handling
    return handleSqlException(e)

} catch (Exception e) {
    // Generic server error
    log.error("Unexpected error in ${this.class.name}", e)
    return Response.status(500)
        .entity(new JsonBuilder([error: "Internal server error"]).toString())
        .build()
}
```

### Actionable Error Messages

**✅ GOOD - Actionable messages**:

```json
{
  "error": "Referenced team does not exist",
  "detail": "Team ID '123e4567-e89b-12d3-a456-426614174000' was not found. Please verify the team ID and try again.",
  "field": "teamId",
  "code": "ENTITY_NOT_FOUND"
}
```

**❌ BAD - Vague messages**:

```json
{
  "error": "Error occurred"
}
```

## Security Requirements

### Global SecurityUtils Access (ADR-058)

**REQUIRED pattern for security**:

```javascript
// ✅ REQUIRED - Use global SecurityUtils
class ComponentWithSecurity {
  constructor() {
    if (!window.SecurityUtils) {
      throw new Error(
        "SecurityUtils not available - load SecurityUtils.js first",
      );
    }
  }

  sanitizeInput(userInput) {
    return window.SecurityUtils.sanitizeHtml(userInput);
  }

  validateCsrfToken(token) {
    return window.SecurityUtils.validateCsrfToken(token);
  }

  checkPermissions(action) {
    return window.SecurityUtils.hasPermission(action);
  }
}
```

### Input Validation

**MANDATORY for all user input**:

```groovy
// ✅ Server-side validation
def validateInput(String input) {
    if (!input || input.trim().isEmpty()) {
        throw new IllegalArgumentException("Input cannot be empty")
    }

    if (input.length() > 255) {
        throw new IllegalArgumentException("Input too long (max 255 characters)")
    }

    // XSS prevention
    if (input.contains('<script>') || input.contains('javascript:')) {
        throw new IllegalArgumentException("Invalid input detected")
    }

    return input.trim()
}
```

```javascript
// ✅ Client-side validation
function validateUserInput(input) {
  if (!input || input.trim().length === 0) {
    throw new Error("Input cannot be empty");
  }

  // Use SecurityUtils for XSS protection
  return window.SecurityUtils.sanitizeHtml(input);
}
```

### Authentication Context (ADR-042)

**Dual authentication support**:

```groovy
// ✅ REQUIRED - Dual authentication pattern
def getCurrentUser() {
    // Try ThreadLocal first (ScriptRunner context)
    def user = ComponentAccessor.getUserManager().getCurrentUser()

    if (!user) {
        // Fallback to request parameter
        def userId = params.userId as String
        if (userId) {
            user = ComponentAccessor.getUserManager().getUserByName(userId)
        }
    }

    if (!user) {
        throw new IllegalStateException("No authenticated user found")
    }

    return user
}
```

## Testing Standards

### Self-Contained Test Architecture (TD-001)

**Groovy tests MUST be self-contained**:

```groovy
@CompileStatic
class SelfContainedTest {

    // ✅ REQUIRED - Embed all dependencies in test
    static class MockSql {
        List<Map<String, Object>> rows = []

        List<Map<String, Object>> rows(String query, List params = []) {
            return rows
        }
    }

    static class MockDatabaseUtil {
        static MockSql sql = new MockSql()

        static Object withSql(Closure closure) {
            return closure.call(sql)
        }
    }

    static void testRepositoryMethod() {
        // Setup test data
        MockDatabaseUtil.sql.rows = [
            [id: UUID.randomUUID(), name: 'Test Entity']
        ]

        // Test the method
        def result = EntityRepository.findAll()

        // Assertions
        assert result.size() == 1
        assert result[0].name == 'Test Entity'

        println "✅ testRepositoryMethod passed"
    }

    static void main(String[] args) {
        testRepositoryMethod()
        println "🎉 All tests passed!"
    }
}
```

### JavaScript Test Standards

**Use Jest with proper test structure**:

```javascript
describe("ComponentManager", () => {
  let manager;

  beforeEach(() => {
    // Setup fresh instance for each test
    manager = new ComponentManager();

    // Mock global dependencies
    global.fetch = jest.fn();
    window.SecurityUtils = {
      sanitizeHtml: jest.fn((input) => input),
      validateCsrfToken: jest.fn(() => true),
    };
  });

  afterEach(() => {
    // Cleanup
    jest.clearAllMocks();
  });

  it("should initialize with correct defaults", () => {
    expect(manager.apiEndpoint).toBeDefined();
    expect(manager.cache).toBeInstanceOf(Map);
  });

  it("should handle API errors gracefully", async () => {
    // Setup
    global.fetch.mockRejectedValue(new Error("Network error"));

    // Test
    await expect(manager.fetchData()).rejects.toThrow("Network error");
  });
});
```

### Test Coverage Requirements

- **Minimum Coverage**: 95% for new code
- **Test Types**: Unit, integration, component, security
- **Technology Split**: Use technology-prefixed commands (`test:js:unit`, `test:groovy:unit`)

## Documentation Requirements

### Code Documentation

**Groovy Documentation**:

```groovy
/**
 * Repository for managing user entities with master/instance pattern.
 *
 * This repository provides CRUD operations for both master templates
 * and instance execution records, following the canonical-instance
 * data model pattern defined in ADR-015.
 *
 * @author Your Name
 * @since 1.0
 * @see ADR-015 for canonical-instance pattern details
 */
@CompileStatic
class UserRepository {

    /**
     * Finds all user master records with optional filtering.
     *
     * @param filters Optional map of filter criteria
     * @param limit Maximum number of records to return (default: 50)
     * @return List of user master records
     * @throws IllegalArgumentException if limit is negative
     */
    static List<Map<String, Object>> findAllMasters(Map filters = [:], int limit = 50) {
        // Implementation
    }
}
```

**JavaScript Documentation**:

```javascript
/**
 * Manages user entity operations with security and caching.
 *
 * This class provides a secure interface for user management,
 * implementing the BaseEntityManager pattern with XSS protection
 * and CSRF validation.
 *
 * @class UserManager
 * @extends {BaseEntityManager}
 * @author Your Name
 * @since 1.0
 */
class UserManager extends BaseEntityManager {
  /**
   * Creates a new user with validation and security checks.
   *
   * @param {Object} userData - User data object
   * @param {string} userData.name - User's full name (required)
   * @param {string} userData.email - User's email address (required)
   * @returns {Promise<Object>} Created user object
   * @throws {Error} If validation fails or user already exists
   */
  async createUser(userData) {
    // Implementation
  }
}
```

### Architecture Decision Records

**Required for architectural changes**:

1. Create ADR using `/docs/architecture/adr/template.md`
2. Number sequentially (ADR-061, ADR-062, etc.)
3. Link to related user stories and ADRs
4. Update main architecture specification

### API Documentation

**Update OpenAPI specification** for all new endpoints:

```yaml
# docs/api/openapi.yaml
/api/v2/users:
  get:
    summary: List users
    description: Retrieves a list of users with optional filtering
    parameters:
      - name: limit
        in: query
        description: Maximum number of users to return
        schema:
          type: integer
          default: 50
          minimum: 1
          maximum: 1000
    responses:
      200:
        description: Success
        content:
          application/json:
            schema:
              type: array
              items:
                $ref: "#/components/schemas/User"
```

## Performance Standards

### Response Time Requirements

- **API Endpoints**: <200ms average response time
- **Database Queries**: <50ms for simple queries, <200ms for complex
- **Frontend Rendering**: <150ms for component updates
- **Page Load**: <3s for complete page load

### Caching Standards

```javascript
// ✅ Implement intelligent caching
class CachedApiClient {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async fetchWithCache(url, options = {}) {
    const cacheKey = `${url}_${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    const response = await fetch(url, options);
    const data = await response.json();

    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    return data;
  }
}
```

## Quality Gates

Before merging any code, ensure:

### ✅ Automated Checks

- [ ] All tests passing (100% success rate)
- [ ] Code coverage ≥95% for new code
- [ ] MegaLinter quality checks passed
- [ ] Semgrep security scan passed
- [ ] Type safety compliance (no casting warnings)

### ✅ Manual Checks

- [ ] Code follows all non-negotiable standards
- [ ] Architecture patterns correctly implemented
- [ ] Error handling includes actionable messages
- [ ] Security controls implemented
- [ ] Documentation updated
- [ ] ADRs created for architectural decisions

### ✅ Integration Checks

- [ ] API endpoints accessible via REST
- [ ] Database changes include rollback scripts
- [ ] Frontend components integrate with existing system
- [ ] Authentication and authorization working
- [ ] Email notifications functioning (if applicable)

## Enforcement

### Code Review Requirements

All pull requests must:

1. **Follow Standards**: 100% compliance with these standards
2. **Include Tests**: Comprehensive test coverage
3. **Update Documentation**: Relevant docs updated
4. **Pass Quality Gates**: All automated checks passing
5. **Architecture Approval**: ADRs for significant changes

### Automated Enforcement

```bash
# Pre-commit hooks (recommended)
npm run test:all:comprehensive
npm run quality:check
npm run security:scan

# CI/CD pipeline checks
npm run validate:standards
npm run validate:architecture
npm run validate:security
```

## Summary

These coding standards ensure:

- **Consistency**: Uniform code patterns across the project
- **Quality**: High-quality, maintainable code
- **Security**: Enterprise-grade security measures
- **Performance**: Optimal response times and resource usage
- **Reliability**: Robust error handling and testing
- **Documentation**: Complete documentation for all code

**Non-compliance with these standards will result in pull request rejection.**

For questions about specific standards:

- **[Getting Started Guide](getting-started.md)** - Basic introduction
- **[Installation Guide](installation-guide.md)** - Environment setup
- **[Development Workflows](development-workflows.md)** - Development processes
- **Architecture Documentation** - Design principles and ADRs

---

**Remember**: These standards exist to ensure the long-term maintainability and quality of the UMIG project. When in doubt, follow the established patterns! 📐
