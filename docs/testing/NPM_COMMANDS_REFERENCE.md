# NPM Test Commands - Quick Reference

**Updated**: October 1, 2025 | **Status**: Active Development | **Working Directory**: `/local-dev-setup/`

## 🚀 Essential Commands

### Smart Testing (Infrastructure-Aware)

```bash
# Smart testing (adapts to environment)
npm test                         # Detects infrastructure, runs appropriate tests
npm run test:all:quick           # Quick validation (~158 tests, no infrastructure needed)
```

### Core Testing Commands (Technology-Prefixed Architecture)

```bash
# JavaScript Unit Tests (Jest Framework)
npm run test:js:unit             # JavaScript unit tests via Jest
npm run test:js:integration      # JavaScript integration tests
npm run test:js:e2e              # End-to-end JavaScript tests

# Groovy Unit Tests (Self-Contained Architecture)
npm run test:groovy:unit         # Groovy unit tests (requires ScriptRunner context for some tests)
npm run test:groovy:integration  # Groovy integration tests

# Legacy Commands (Maintained for Compatibility)
npm run test:unit                # All unit tests for repositories and core logic
npm run test:unit:pattern        # Unit tests matching specific pattern
npm run test:unit:category       # Unit tests filtered by category

# Integration Tests
npm run test:integration          # Core integration tests for all APIs
npm run test:integration:auth     # Integration tests with authentication support
npm run test:integration:core     # Comprehensive integration test suite

# User Acceptance Tests
npm run test:uat                  # User acceptance testing validation
npm run test:uat:quick           # Quick UAT validation (essential tests only)

# UI Component Tests
npm run test:iterationview        # IterationView UI component tests

# Email Testing (MailHog Integration)
npm run mailhog:test             # Test SMTP connectivity to MailHog
npm run mailhog:check            # Check MailHog inbox message count
npm run mailhog:clear            # Clear all messages from MailHog inbox
```

### Comprehensive Test Suites

```bash
# Technology-Prefixed Architecture
npm run test:js:all              # Complete JavaScript test suite (Jest framework)
npm run test:groovy:all          # Complete Groovy test suite
npm run test:all                 # All tests: JavaScript + Groovy + integration + UAT

# Legacy Test Execution (Maintained for Compatibility)
npm run test:groovy              # Groovy-specific tests: unit + integration

# Story-Specific Test Suites
npm run test:us022               # US-022 integration test expansion
npm run test:us028               # US-028 enhanced IterationView tests
```

## 📋 Command Options & Parameters

### Common Options

| Option                  | Description                        | Example                                     |
| ----------------------- | ---------------------------------- | ------------------------------------------- |
| `--dry-run`             | Validate command without execution | `npm run test:unit --dry-run`               |
| `--verbose`             | Detailed output for debugging      | `npm run test:integration --verbose`        |
| `--pattern <pattern>`   | Run tests matching pattern         | `npm run test:unit:pattern StepsRepository` |
| `--category <category>` | Run tests in specific category     | `npm run test:unit:category API`            |
| `--quick`               | Run essential tests only           | `npm run test:uat:quick`                    |
| `--auth`                | Include authentication tests       | `npm run test:integration:auth`             |
| `--core`                | Run comprehensive test suite       | `npm run test:integration:core`             |

### Email Testing Commands

| Command                 | Description                           | Example                    |
| ----------------------- | ------------------------------------- | -------------------------- |
| `npm run mailhog:test`  | Test SMTP connectivity to MailHog     | Tests email infrastructure |
| `npm run mailhog:check` | Check message count in MailHog inbox  | Returns number of emails   |
| `npm run mailhog:clear` | Clear all messages from MailHog inbox | Resets test environment    |

### Component-Specific Testing

```bash
# Test specific components
npm run test:js:components -- --testPathPattern='TeamsEntityManager'
npm run test:js:components -- --testPathPattern='ComponentOrchestrator'
npm run test:js:security -- --testPathPattern='ComponentOrchestrator.pentest'

# Test entity managers
npm run test:js:components -- --testPathPattern='.*EntityManager'
```

### Advanced Usage Examples

```bash
# Technology-Prefixed Pattern Testing
npm run test:js:unit --testPathPattern="Repository"     # JavaScript repository tests
npm run test:groovy:unit --pattern="Steps"             # Groovy Steps-related tests

# Legacy Pattern-based testing (Maintained for Compatibility)
npm run test:unit:pattern "Repository"        # All repository tests
npm run test:unit:pattern "Steps"            # All Steps-related tests

# Category-based testing
npm run test:unit:category "API"             # API unit tests only
npm run test:unit:category "Database"        # Database unit tests only

# Self-Contained Groovy Architecture
npm run test:groovy:unit --self-contained    # Self-contained execution mode
npm run test:groovy:integration --isolated   # Isolated execution environment

# Quick validation
npm run test:uat:quick                       # Essential UAT tests only
npm run test:integration --dry-run           # Validate integration setup

# Email testing workflow
npm run mailhog:test                         # Test SMTP connectivity
npm run mailhog:clear                        # Clear test inbox
npm run test:integration                     # Run tests (may send emails)
npm run mailhog:check                        # Verify email notifications
```

## 🏆 Testing Architecture Features (TD-001/TD-002)

**Status**: ✅ Active Development (October 1, 2025)

### Phase 6 Technology-Prefixed Commands (TD-001)

**Goal**: Self-Contained Groovy Architecture with clear technology separation

| Technology-Prefixed Command       | Framework | Architecture Feature          |
| --------------------------------- | --------- | ----------------------------- |
| `npm run test:js:unit`            | Jest      | Zero configuration Jest setup |
| `npm run test:js:integration`     | Jest      | E2E JavaScript testing        |
| `npm run test:groovy:unit`        | Groovy    | Self-contained execution      |
| `npm run test:groovy:integration` | Groovy    | Isolated architecture         |

### Testing Infrastructure (TD-002)

**Goal**: Elimination of external dependencies for Groovy tests

#### Self-Contained Groovy Architecture

```bash
# Features:
npm run test:groovy:unit --self-contained    # Zero external dependencies
npm run test:groovy:integration --isolated   # Complete isolation from environment
npm run test:groovy:all                      # Complete Groovy test suite
```

#### Key Architectural Features:

- ✅ **Self-Contained Execution**: Embedded test infrastructure
- ✅ **Zero External Dependencies**: No shell script dependencies
- ✅ **Technology Separation**: Clear JavaScript vs Groovy boundaries
- ✅ **Cross-Platform**: Windows/macOS/Linux compatibility
- ⚠️ **ScriptRunner Context**: Some tests require ScriptRunner execution environment

## 🔄 Shell Script Migration Status

**Status**: ✅ Complete (August 18, 2025) | **Updated**: October 1, 2025

### Migration Mapping

| ❌ Deprecated Shell Script              | ✅ NPM Legacy                   | 🚀 Technology-Prefixed                       | Purpose                      |
| --------------------------------------- | ------------------------------- | -------------------------------------------- | ---------------------------- |
| `run-unit-tests.sh`                     | `npm run test:unit`             | `npm run test:groovy:unit`                   | Groovy unit tests            |
| `javascript-unit-tests.sh`              | `npm run test:unit`             | `npm run test:js:unit`                       | JavaScript testing           |
| `run-integration-tests.sh`              | `npm run test:integration`      | `npm run test:groovy:integration`            | Groovy integration tests     |
| `run-authenticated-tests.sh`            | `npm run test:integration:auth` | `npm run test:groovy:integration --auth`     | Authentication-enabled tests |
| `run-all-integration-tests.sh`          | `npm run test:integration:core` | `npm run test:groovy:all`                    | Complete Groovy suite        |
| `run-uat-validation.sh`                 | `npm run test:uat`              | `npm run test:js:e2e`                        | E2E validation               |
| `run-enhanced-iterationview-tests.sh`   | `npm run test:iterationview`    | `npm run test:js:integration --ui`           | UI component integration     |
| `run-integration-tests-in-container.sh` | `npm run test:integration`      | `npm run test:groovy:integration --isolated` | Isolated execution           |
| `run-tests-via-scriptrunner.sh`         | `npm run test:integration`      | `npm run test:groovy:all --self-contained`   | Self-contained architecture  |

### ⚠️ Important Notes

- **Shell scripts are DEPRECATED**: Located in `/src/groovy/umig/tests/archived-shell-scripts/`
- **Use NPM commands only**: All shell script functionality preserved in NPM commands
- **Functional equivalence**: Core features maintained through NPM commands
- **Cross-platform support**: NPM commands work on Windows/macOS/Linux

## 🎯 Use Case Commands

### Development Workflow

```bash
# Quick unit test validation during development
npm run test:unit:category RepositoryTests

# Integration test for specific API endpoint
npm run test:integration:auth

# Full validation before commit
npm run test:groovy
```

### CI/CD Pipeline

```bash
# Standard CI/CD test execution
npm run test:all

# Parallel CI/CD execution (can be run concurrently)
npm run test:unit & npm run test:integration & npm run test:uat
```

### User Story Testing

```bash
# Testing specific user story implementations
npm run test:us022               # Integration test expansion
npm run test:us028               # Enhanced IterationView features
```

### Debug and Troubleshooting

```bash
# Dry run mode (validation without execution)
npm run test:unit --dry-run
npm run test:integration --dry-run

# Verbose output for troubleshooting
npm run test:unit --verbose
npm run test:integration --verbose
```

## 🔧 Technical Features

### JavaScript Test Runners

**Location**: `/local-dev-setup/scripts/`

| JavaScript File                  | Purpose                                | Shell Script Replaced                                    |
| -------------------------------- | -------------------------------------- | -------------------------------------------------------- |
| `test-unit.js`                   | Unit test execution with filtering     | `run-unit-tests.sh`                                      |
| `test-integration.js`            | Integration tests with auth/core modes | `run-integration-tests.sh`, `run-authenticated-tests.sh` |
| `test-uat.js`                    | UAT validation with quick mode         | `run-uat-validation.sh`                                  |
| `test-enhanced-iterationview.js` | IterationView component testing        | `run-enhanced-iterationview-tests.sh`                    |

### Key Features

✅ **SDKMAN Integration**: Automatic Groovy version management
✅ **PostgreSQL JDBC**: Database connection handling
✅ **XML Parser Config**: Groovy compatibility settings
✅ **Test Reporting**: Comprehensive success/failure tracking
✅ **Error Handling**: Enhanced error reporting and diagnostics
✅ **Cross-Platform**: Windows/macOS/Linux compatibility
✅ **Container Support**: Podman/Docker integration
✅ **ScriptRunner Integration**: Full ScriptRunner environment support

## 🚨 Troubleshooting

### Quick Diagnostics

```bash
# Verify NPM commands are available
npm run --silent 2>&1 | grep "test:"

# Check test runner setup
npm run test:unit --dry-run
npm run test:integration --dry-run

# Test JavaScript runners are functional
node scripts/test-unit.js --dry-run
node scripts/test-integration.js --dry-run
```

### Common Issues

**1. Command Not Found**

```bash
# Verify NPM commands are available
npm run --silent 2>&1 | grep "test:"
```

**2. Test Execution Fails**

```bash
# Check test runner setup
npm run test:unit --dry-run
npm run test:integration --dry-run
```

**3. Authentication Issues**

```bash
# Use authentication-enabled tests
npm run test:integration:auth
```

**4. Performance Issues**

```bash
# Use quick validation mode
npm run test:uat:quick
```

## 📖 Best Practices

### Development Workflow

1. **During Development**:

   ```bash
   npm run test:unit:category RepositoryTests    # Quick validation
   ```

2. **Before Commit**:

   ```bash
   npm run test:groovy                           # Groovy tests
   npm run test:uat:quick                        # Quick UAT validation
   ```

3. **Full Validation**:

   ```bash
   npm run test:all                              # Complete test suite
   ```

### CI/CD Integration

```yaml
# Example GitHub Actions integration
- name: Run Unit Tests
  run: npm run test:unit

- name: Run Integration Tests
  run: npm run test:integration:core

- name: Run UAT Validation
  run: npm run test:uat
```

### Performance Optimization

- Use `--quick` mode for fast feedback loops
- Use `--pattern` filtering for targeted testing
- Use `--dry-run` for command validation
- Run tests in parallel where possible

## 🎓 Quick Start Guide

### Environment Setup (one-time)

```bash
cd local-dev-setup
npm install
npm start                        # Start development environment
```

### Health Check

```bash
# Quick environment validation
./scripts/quality-check/immediate-health-check.sh

# Test command functionality
npm run test:integration --dry-run
```

### Development Cycle

```bash
# Targeted testing during development
npm run test:unit:pattern "YourNewFeature"     # Specific test patterns
npm run test:integration:auth                  # Integration validation
npm run test:uat:quick                        # Quick acceptance check
```

## 📊 Test Execution Status

### Current Test Status (October 1, 2025)

**Note**: Test execution metrics are under validation. See TD-014 progress tracking for current coverage data.

| Test Suite                        | Status          | Notes                                      |
| --------------------------------- | --------------- | ------------------------------------------ |
| `npm run test:groovy:unit`        | ⚠️ Partial      | Some tests require ScriptRunner context    |
| `npm run test:groovy:integration` | ⚠️ Partial      | Isolated tests need manual execution       |
| `npm run test:js:unit`            | ✅ Active       | Jest framework tests                       |
| `npm run test:js:integration`     | ✅ Active       | JavaScript integration tests               |
| `npm run test:groovy:all`         | ⚠️ Under Review | See TD-014 for comprehensive test coverage |

### Validation in Progress

- **TD-014**: Repository Layer comprehensive testing (43% complete)
- **Sprint 8**: Security architecture enhancement with ADRs 67-70
- **Test Infrastructure**: Path fixes applied, execution validation ongoing

## 📞 Support

### Related Documentation

- **Testing Guide**: `/docs/testing/TESTING_GUIDE.md` - Comprehensive framework documentation
- **TD-014 Progress**: `/docs/roadmap/sprint8/TD-014-COMPLETE-PROGRESS.md` - Current test coverage status
- **Solution Architecture**: `/docs/solution-architecture.md` - System design and ADRs
- **API Documentation**: `/docs/api/openapi.yaml` - OpenAPI specification

### Configuration Files

- **NPM Scripts**: `/local-dev-setup/package.json`
- **Test Runners**: `/local-dev-setup/scripts/test-*.js`
- **Shared Utilities**: `/local-dev-setup/scripts/shared/`

### Archive Reference

- **Deprecated Shell Scripts**: `/src/groovy/umig/tests/archived-shell-scripts/README.md`

---

**Quick Start**: `cd local-dev-setup && npm run test:groovy:all`
**Technology-Prefixed Commands**: ✅ Active development with self-contained Groovy execution
**TD-001/TD-002 Goals**: Self-contained architecture with technology separation
**Migration Status**: ✅ Shell scripts → NPM → Technology-prefixed architecture complete
**Email Testing**: ✅ MailHog integration with SMTP testing (August 27, 2025)
**Current Focus**: TD-014 comprehensive test coverage validation (Sprint 8)
