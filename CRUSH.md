# UMIG Project - Crush Configuration

## Build Commands
```bash
# Start development environment (from local-dev-setup/)
npm start

# Stop services
npm stop

# Restart environment
npm run restart

# Restart and erase all data
npm run restart:erase
```

## Test Commands
```bash
# Run all Node.js tests
npm test

# Run Groovy unit tests
./src/groovy/umig/tests/run-unit-tests.sh

# Run Groovy integration tests
./src/groovy/umig/tests/run-integration-tests.sh

# Run a single Groovy test
groovy -cp "$JDBC_DRIVER_PATH" tests/unit/YourTestFile.groovy

# Run specific Jest test file
npm test -- testNamePattern="your-test-name"
```

## Lint Commands
```bash
# Linting is handled by MegaLinter
# Check megalinter-reports/ for lint results
```

## Code Style Guidelines

### Imports
- Use DatabaseUtil.withSql for all database access
- Follow repository pattern for data access
- Group standard library imports first, then project imports

### Formatting
- Groovy: Follow standard Groovy conventions
- JavaScript: Vanilla JS only, no frameworks
- SQL: Use explicit field selection matching result mapping
- Indentation: 4 spaces for Groovy, 2 spaces for JS/CSS

### Types
- Explicit casting required: `UUID.fromString(filters.id as String)`
- Use proper Groovy types for database fields
- Type-safe parameter handling for all query parameters

### Naming Conventions
- Database: snake_case with _master_/_instance_ suffixes
- Classes: PascalCase
- Methods/Variables: camelCase
- Tables: plural names (users_usr, teams_tms, etc.)

### Error Handling
- SQL state mappings: 23503→400 (FK violation), 23505→409 (unique violation)
- Use try-catch blocks for database operations
- Return appropriate HTTP status codes (400, 404, 409, 500)
- Validate input parameters before processing

### API Patterns
- Use CustomEndpointDelegate for REST endpoints
- Include groups: ["confluence-users"] for security
- Hierarchical filtering with instance IDs (not master IDs)
- Master vs Instance entity pattern for canonical vs execution data

### Security
- All endpoints require Confluence user authentication
- Use UUID path parameters for security
- Validate all input parameters