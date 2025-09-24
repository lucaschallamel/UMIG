# UMIG Development Workflows

This guide covers the essential development workflows for contributing to the UMIG project, including Git practices, testing procedures, API development patterns, and component development guidelines.

## Git Workflow and Branching Strategy

### Branch Structure

UMIG follows a feature-branch workflow with sprint-based organization:

```
main                    # Production-ready code
├── feature/US-xxx-*    # User story branches
├── feature/TD-xxx-*    # Technical debt branches
├── hotfix/*           # Emergency fixes
└── release/*          # Release preparation
```

### Branch Naming Conventions

- **User Stories**: `feature/US-087-admin-gui-phase1-teams-manager`
- **Technical Debt**: `feature/TD-005-javascript-test-infrastructure`
- **Hotfixes**: `hotfix/critical-security-patch`
- **Releases**: `release/sprint-7-completion`

### Typical Development Workflow

#### 1. Start New Feature

```bash
# Ensure you're on main and up to date
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/US-XXX-your-feature-name

# Push branch to remote
git push -u origin feature/US-XXX-your-feature-name
```

#### 2. Development Cycle

```bash
# Make changes following coding standards
# ... development work ...

# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: implement user authentication service

- Add AuthenticationService.js with 4-level fallback
- Implement session-based authentication per ADR-042
- Add comprehensive test coverage (20/20 tests passing)
- Update API endpoints to use authentication context"

# Push changes regularly
git push origin feature/US-XXX-your-feature-name
```

#### 3. Pre-Merge Validation

```bash
# Run complete test suite
npm run test:all:comprehensive

# Run code quality checks (from project root)
cd ..
podman run --rm -v $(pwd):/tmp/lint:rw,Z oxsecurity/megalinter:v8

# Run security scans
podman run --rm -v $(pwd):/src:rw,Z semgrep/semgrep:latest \
  semgrep --config=auto /src
```

#### 4. Create Pull Request

**Pull Request Template**:

```markdown
## Summary

Brief description of changes and their purpose.

## User Story/Technical Debt

- Resolves US-XXX or TD-XXX
- Links to related documentation or ADRs

## Changes Made

- [ ] Backend changes (Groovy APIs/repositories)
- [ ] Frontend changes (JavaScript components)
- [ ] Database changes (Liquibase migrations)
- [ ] Test coverage added/updated
- [ ] Documentation updated

## Testing

- [ ] Unit tests passing (npm run test:js:unit, npm run test:groovy:unit)
- [ ] Integration tests passing (npm run test:integration)
- [ ] Manual testing completed
- [ ] Security validation performed

## Quality Gates

- [ ] All tests passing (100% success rate)
- [ ] Code quality checks passed (MegaLinter)
- [ ] Security scans passed (Semgrep)
- [ ] Documentation updated
- [ ] ADRs created/updated if architectural changes
```

### Commit Message Conventions

Follow conventional commits format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types**:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, no logic changes)
- `refactor`: Code refactoring without feature changes
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:

```bash
feat(api): add teams relationship endpoint

fix(ui): resolve pagination component loading issue

docs(architecture): add ADR-060 for BaseEntityManager pattern

test(security): add penetration testing suite for components
```

## Testing Workflows

### Technology-Prefixed Test Architecture

UMIG uses separate test frameworks for different technologies:

```bash
# JavaScript Testing (Jest)
npm run test:js                    # All JavaScript tests
npm run test:js:unit               # JavaScript unit tests
npm run test:js:integration        # JavaScript integration tests
npm run test:js:components         # Component architecture tests
npm run test:js:security           # Security validation tests

# Groovy Testing (Self-contained)
npm run test:groovy:all            # All Groovy tests
npm run test:groovy:unit           # Groovy unit tests
npm run test:groovy:integration    # Groovy integration tests

# Cross-Technology Testing
npm run test:all:comprehensive     # Complete test suite
npm run test:all:unit             # All unit tests
npm run test:all:quick            # Quick validation
```

### Test Development Workflow

#### 1. Write Tests First (TDD Approach)

```bash
# Create test file for new feature
touch __tests__/features/new-feature.test.js

# Write failing test
npm run test:js:unit -- --testPathPattern='new-feature.test.js'

# Implement feature to make test pass
# ... development ...

# Verify test passes
npm run test:js:unit -- --testPathPattern='new-feature.test.js'
```

#### 2. Test Categories and Placement

**JavaScript Tests** (`local-dev-setup/__tests__/`):

- **Unit Tests**: `__tests__/unit/`
- **Integration Tests**: `__tests__/integration/`
- **Component Tests**: `__tests__/components/`
- **Security Tests**: `__tests__/security/`
- **E2E Tests**: `__tests__/e2e/`

**Groovy Tests** (`src/groovy/umig/tests/`):

- **Unit Tests**: `tests/unit/`
- **Integration Tests**: `tests/integration/`
- **API Tests**: `tests/apis/`

#### 3. Test Quality Standards

- **Coverage Requirement**: 95%+ for new code
- **Test Isolation**: Each test must be independent
- **Clear Naming**: Test names should describe expected behavior
- **Comprehensive Assertions**: Test all edge cases and error conditions

```javascript
// Good test example
describe("AuthenticationService", () => {
  describe("authenticateUser", () => {
    it("should return user data for valid credentials", async () => {
      // Arrange
      const validCredentials = { username: "testuser", password: "validpass" };

      // Act
      const result = await authService.authenticateUser(validCredentials);

      // Assert
      expect(result.success).toBe(true);
      expect(result.user.username).toBe("testuser");
      expect(result.user.password).toBeUndefined(); // Security check
    });

    it("should throw error for invalid credentials", async () => {
      // Arrange
      const invalidCredentials = {
        username: "testuser",
        password: "wrongpass",
      };

      // Act & Assert
      await expect(
        authService.authenticateUser(invalidCredentials),
      ).rejects.toThrow("Authentication failed");
    });
  });
});
```

#### 4. Running Specific Tests

```bash
# Run single test file
npm run test:js:unit -- --testPathPattern='specific.test.js'

# Run tests matching pattern
npm run test:js:unit -- --testNamePattern='AuthenticationService'

# Run tests in watch mode during development
npm run test:js:unit -- --watch

# Run tests with coverage
npm run test:js:unit -- --coverage
```

### Continuous Testing During Development

```bash
# Set up test watching in one terminal
npm run test:js:unit -- --watch

# Develop in another terminal
# Tests will automatically rerun when files change
```

## API Development Patterns

### RESTful API Development Workflow

#### 1. API Design First

Before coding, design your API:

```yaml
# Add to docs/api/openapi.yaml
/api/v2/newentity:
  get:
    summary: List new entities
    parameters:
      - name: limit
        in: query
        schema:
          type: integer
          default: 50
    responses:
      200:
        description: Success
        content:
          application/json:
            schema:
              type: array
              items:
                $ref: "#/components/schemas/NewEntity"
```

#### 2. Create Repository Layer

```groovy
// src/groovy/umig/repository/NewEntityRepository.groovy
package umig.repository

import groovy.transform.CompileStatic
import umig.utils.DatabaseUtil

@CompileStatic
class NewEntityRepository {

    static List<Map<String, Object>> findAll(int limit = 50) {
        return DatabaseUtil.withSql { sql ->
            return sql.rows('''
                SELECT
                    ne_id,
                    ne_name,
                    ne_description,
                    ne_created_at,
                    ne_updated_at
                FROM new_entities_ne
                ORDER BY ne_name
                LIMIT ?
            ''', [limit])
        }
    }

    static Map<String, Object> findById(UUID id) {
        return DatabaseUtil.withSql { sql ->
            def rows = sql.rows('''
                SELECT
                    ne_id,
                    ne_name,
                    ne_description,
                    ne_created_at,
                    ne_updated_at
                FROM new_entities_ne
                WHERE ne_id = ?
            ''', [id])

            return rows.isEmpty() ? null : rows[0]
        }
    }
}
```

#### 3. Implement API Endpoint

```groovy
// src/groovy/umig/api/v2/NewEntityApi.groovy
package umig.api.v2

import groovy.json.JsonBuilder
import groovy.transform.BaseScript
import groovy.transform.CompileStatic
import umig.repository.NewEntityRepository

import javax.ws.rs.core.Response

@BaseScript CustomEndpointDelegate delegate

// GET /rest/scriptrunner/latest/custom/newentity
newentity(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    try {
        // Extract and validate parameters
        def limit = params.limit ? Integer.parseInt(params.limit as String) : 50

        // Repository call with DatabaseUtil pattern
        def entities = NewEntityRepository.findAll(limit)

        // Return JSON response
        return Response.ok(new JsonBuilder(entities).toString()).build()

    } catch (NumberFormatException e) {
        return Response.status(400)
            .entity(new JsonBuilder([error: "Invalid limit parameter"]).toString())
            .build()
    } catch (Exception e) {
        return Response.status(500)
            .entity(new JsonBuilder([error: "Internal server error"]).toString())
            .build()
    }
}

// GET /rest/scriptrunner/latest/custom/newentity/{id}
newentity(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    try {
        def id = UUID.fromString(pathParams.id as String)
        def entity = NewEntityRepository.findById(id)

        if (!entity) {
            return Response.status(404)
                .entity(new JsonBuilder([error: "Entity not found"]).toString())
                .build()
        }

        return Response.ok(new JsonBuilder(entity).toString()).build()

    } catch (IllegalArgumentException e) {
        return Response.status(400)
            .entity(new JsonBuilder([error: "Invalid ID format"]).toString())
            .build()
    }
}
```

#### 4. Write API Tests

```groovy
// src/groovy/umig/tests/apis/NewEntityApiTest.groovy
package umig.tests.apis

import groovy.json.JsonSlurper
import groovy.transform.CompileStatic

@CompileStatic
class NewEntityApiTest {

    static void testGetAllEntities() {
        // Embedded test dependencies (self-contained pattern)
        def mockSql = new MockSql()
        def testData = [
            [ne_id: UUID.randomUUID(), ne_name: 'Test Entity', ne_description: 'Test Description']
        ]
        mockSql.rows = testData

        // Test repository method
        def result = NewEntityRepository.findAll(10)

        assert result.size() == 1
        assert result[0].ne_name == 'Test Entity'

        println "✅ testGetAllEntities passed"
    }

    static void main(String[] args) {
        testGetAllEntities()
        println "🎉 All NewEntityApi tests passed!"
    }
}
```

### API Error Handling Standards

**SQL State Mappings**:

```groovy
try {
    // Database operation
} catch (SQLException e) {
    switch (e.getSQLState()) {
        case '23503': // Foreign key violation
            return Response.status(400)
                .entity(new JsonBuilder([error: "Referenced entity does not exist"]).toString())
                .build()
        case '23505': // Unique constraint violation
            return Response.status(409)
                .entity(new JsonBuilder([error: "Entity already exists"]).toString())
                .build()
        default:
            return Response.status(500)
                .entity(new JsonBuilder([error: "Database error"]).toString())
                .build()
    }
}
```

### API Testing Workflow

```bash
# Test API endpoints manually
curl -X GET "http://localhost:8090/rest/scriptrunner/latest/custom/newentity?limit=10" \
  -H "Authorization: Basic $(echo -n 'admin:admin' | base64)"

# Use session-based authentication (recommended)
npm run auth:capture-session
# Use captured session ID in subsequent requests

# Run API integration tests
npm run test:integration:auth
```

## Component Development Guidelines

### Frontend Component Architecture

UMIG uses a component-based architecture with BaseEntityManager pattern:

#### 1. Create Entity Manager

```javascript
// src/groovy/umig/web/js/entities/new-entity/NewEntityManager.js
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
      ne_description: {
        label: "Description",
        type: "textarea",
        required: false,
        validation: {
          maxLength: 500,
        },
      },
    };
  }

  async validateEntity(entity) {
    const errors = await super.validateEntity(entity);

    // Custom validation logic
    if (entity.ne_name && entity.ne_name.length < 3) {
      errors.ne_name = "Name must be at least 3 characters";
    }

    return errors;
  }

  async transformEntityForDisplay(entity) {
    // Custom display transformations
    return {
      ...entity,
      displayName: entity.ne_name,
      formattedDate: this.formatDate(entity.ne_created_at),
    };
  }
}

// Register with global scope
window.NewEntityManager = NewEntityManager;
```

#### 2. Create Component Integration

```javascript
// src/groovy/umig/web/js/admin-gui/entities/NewEntityComponent.js
class NewEntityComponent extends BaseComponent {
  constructor() {
    super();
    this.entityManager = new NewEntityManager();
    this.componentId = "new-entity-component";
  }

  async initialize() {
    await super.initialize();
    this.setupEventListeners();
    return this;
  }

  setupEventListeners() {
    // Entity-specific event handling
    this.addEventListener(
      "entity:created",
      this.handleEntityCreated.bind(this),
    );
    this.addEventListener(
      "entity:updated",
      this.handleEntityUpdated.bind(this),
    );
  }

  async handleEntityCreated(event) {
    const { entity } = event.detail;
    await this.showSuccessMessage(`${entity.ne_name} created successfully`);
    await this.refreshEntityList();
  }

  render() {
    return `
            <div id="${this.componentId}" class="entity-component">
                <h2>New Entity Management</h2>
                <div class="entity-controls">
                    <button class="aui-button aui-button-primary" data-action="create">
                        Create New Entity
                    </button>
                </div>
                <div class="entity-list-container">
                    <!-- Entity list will be rendered here -->
                </div>
            </div>
        `;
  }
}

// Register component
window.NewEntityComponent = NewEntityComponent;
```

#### 3. Component Testing

```javascript
// __tests__/components/NewEntityComponent.test.js
describe("NewEntityComponent", () => {
  let component;
  let mockEntityManager;

  beforeEach(() => {
    // Setup component
    mockEntityManager = {
      findAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    component = new NewEntityComponent();
    component.entityManager = mockEntityManager;

    // Setup DOM
    document.body.innerHTML = '<div id="test-container"></div>';
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("should initialize correctly", async () => {
    await component.initialize();

    expect(component.componentId).toBe("new-entity-component");
    expect(component.entityManager).toBeDefined();
  });

  it("should render component structure", () => {
    const rendered = component.render();

    expect(rendered).toContain("New Entity Management");
    expect(rendered).toContain("Create New Entity");
    expect(rendered).toContain("entity-list-container");
  });

  it("should handle entity creation", async () => {
    const testEntity = { ne_name: "Test Entity", ne_description: "Test" };
    mockEntityManager.create.mockResolvedValue(testEntity);

    await component.handleEntityCreated({ detail: { entity: testEntity } });

    expect(mockEntityManager.create).not.toHaveBeenCalled(); // Handler doesn't create
  });
});
```

### Component Security Standards

All components must implement security controls:

```javascript
class SecureComponent extends BaseComponent {
  constructor() {
    super();
    this.securityLevel = "high";
    this.enableXssProtection = true;
    this.enableCsrfProtection = true;
  }

  sanitizeInput(input) {
    // Use SecurityUtils for XSS protection
    return window.SecurityUtils.sanitizeHtml(input);
  }

  validatePermissions(action) {
    // Check user permissions for action
    return window.SecurityUtils.hasPermission(action);
  }

  async performSecureAction(action, data) {
    if (!this.validatePermissions(action)) {
      throw new Error("Insufficient permissions");
    }

    const sanitizedData = this.sanitizeInput(data);
    const csrfToken = await window.SecurityUtils.getCsrfToken();

    return this.apiCall(action, sanitizedData, { "X-CSRF-Token": csrfToken });
  }
}
```

## Database Development Workflow

### Liquibase Migration Pattern

#### 1. Create Migration File

```bash
# Create new changeset file
touch local-dev-setup/liquibase/changelogs/$(date +%Y%m%d)_add_new_entity_table.sql
```

#### 2. Write Migration

```sql
-- local-dev-setup/liquibase/changelogs/20241201_add_new_entity_table.sql
--changeset lucas.challamel:20241201_add_new_entity_table context:all

CREATE TABLE new_entities_ne (
    ne_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ne_name VARCHAR(100) NOT NULL,
    ne_description TEXT,
    ne_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    ne_created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ne_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ne_created_by VARCHAR(100),
    ne_updated_by VARCHAR(100)
);

-- Create indexes
CREATE INDEX idx_new_entities_name ON new_entities_ne(ne_name);
CREATE INDEX idx_new_entities_status ON new_entities_ne(ne_status);
CREATE INDEX idx_new_entities_created_at ON new_entities_ne(ne_created_at);

-- Add constraints
ALTER TABLE new_entities_ne ADD CONSTRAINT chk_ne_status
    CHECK (ne_status IN ('ACTIVE', 'INACTIVE', 'DEPRECATED'));

--rollback DROP TABLE new_entities_ne;
```

#### 3. Test Migration

```bash
# Apply migration
liquibase --defaults-file=local-dev-setup/liquibase/liquibase.properties update

# Verify in database
psql -h localhost -p 5432 -U umig_app_user -d umig_app_db \
  -c "SELECT * FROM new_entities_ne LIMIT 5;"
```

### Database Naming Conventions

- **Tables**: `entity_name_abbreviation` (e.g., `new_entities_ne`)
- **Columns**: `abbreviation_field_name` (e.g., `ne_name`, `ne_description`)
- **Primary Keys**: `abbreviation_id` (e.g., `ne_id`)
- **Foreign Keys**: `fk_source_target` (e.g., `fk_ne_team`)
- **Indexes**: `idx_table_column` (e.g., `idx_new_entities_name`)

## Development Environment Best Practices

### Environment Management

```bash
# Daily startup routine
npm start                    # Start environment
npm run generate-data:erase  # Fresh test data
npm test                     # Verify all systems working

# Daily shutdown routine
npm stop                     # Stop all services
```

### Code Quality Workflow

```bash
# Before committing changes
npm run test:all:comprehensive  # Run all tests
npm run health:check           # Verify system health

# From project root - run quality checks
cd ..
podman run --rm -v $(pwd):/tmp/lint:rw,Z oxsecurity/megalinter:v8

# Security scan
podman run --rm -v $(pwd):/src:rw,Z semgrep/semgrep:latest \
  semgrep --config=auto /src
```

### Performance Monitoring

```bash
# Monitor resource usage
podman stats

# Check response times
npm run test:performance

# Monitor database performance
npm run health:check:database
```

## Documentation Workflow

### Architecture Decision Records (ADRs)

When making architectural decisions:

1. **Create ADR**: Use template in `docs/architecture/adr/template.md`
2. **Number Sequentially**: Next available ADR number
3. **Link Related**: Reference related ADRs and user stories
4. **Update Index**: Add to main architecture specification

```bash
# Create new ADR
cp docs/architecture/adr/template.md docs/architecture/adr/ADR-061-your-decision.md

# Edit ADR with your decision
vim docs/architecture/adr/ADR-061-your-decision.md

# Update architecture specification
vim docs/architecture/UMIG\ -\ TOGAF\ Phases\ A-D\ -\ Architecture\ Requirements\ Specification.md
```

### API Documentation

Update OpenAPI specification for new APIs:

```bash
# Edit API spec
vim docs/api/openapi.yaml

# Regenerate documentation
npm run docs:api:generate
```

### Code Documentation

- **Groovy**: Use Groovydoc comments
- **JavaScript**: Use JSDoc comments
- **README Files**: Update relevant README files
- **User Guides**: Update user guides for new features

## Integration with External Tools

### Session-Based Authentication

For API testing with external tools:

```bash
# Capture browser session
npm run auth:capture-session

# Test with captured session
curl -X GET "http://localhost:8090/rest/scriptrunner/latest/custom/users" \
  -H "Cookie: JSESSIONID=YOUR_SESSION_ID"
```

### Postman Integration

```bash
# Update Postman collection
npm run postman:update-collection

# Export environment variables
npm run postman:export-env
```

## Summary

This development workflow ensures:

- **Quality**: Comprehensive testing and code quality checks
- **Security**: Security scanning and secure coding practices
- **Performance**: Response time and resource monitoring
- **Consistency**: Standardized patterns and conventions
- **Documentation**: Complete documentation for all changes
- **Collaboration**: Clear Git workflow and pull request process

For questions about specific workflows, refer to:

- **[Getting Started Guide](getting-started.md)** - Basic introduction
- **[Installation Guide](installation-guide.md)** - Environment setup
- **[Coding Standards](coding-standards.md)** - Code quality requirements
- **Architecture Documentation** - Design principles and patterns

---

**Happy coding!** 🚀
