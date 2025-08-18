# NPM Test Commands - Quick Reference

**Updated**: August 18, 2025 | **Status**: Production Ready | **Working Directory**: `/local-dev-setup/`

## 🚀 Essential Commands

### Core Testing Commands

```bash
# Unit Tests
npm run test:unit                 # All unit tests for repositories and core logic
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
```

### Comprehensive Test Suites

```bash
# Complete Test Execution
npm run test:all                  # All tests: unit + integration + UAT
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

### Advanced Usage Examples

```bash
# Pattern-based testing
npm run test:unit:pattern "Repository"        # All repository tests
npm run test:unit:pattern "Steps"            # All Steps-related tests

# Category-based testing
npm run test:unit:category "API"             # API unit tests only
npm run test:unit:category "Database"        # Database unit tests only

# Quick validation
npm run test:uat:quick                       # Essential UAT tests only
npm run test:integration --dry-run           # Validate integration setup
```

## 🔄 Shell Script Migration Status

**Status**: ✅ **COMPLETE** (August 18, 2025)

### Migration Mapping

| ❌ Deprecated Shell Script              | ✅ NPM Replacement              | Purpose                                    |
| --------------------------------------- | ------------------------------- | ------------------------------------------ |
| `run-unit-tests.sh`                     | `npm run test:unit`             | Unit tests for repositories and core logic |
| `run-integration-tests.sh`              | `npm run test:integration`      | Core integration tests for all APIs        |
| `run-authenticated-tests.sh`            | `npm run test:integration:auth` | Integration tests with authentication      |
| `run-all-integration-tests.sh`          | `npm run test:integration:core` | Comprehensive integration suite            |
| `run-uat-validation.sh`                 | `npm run test:uat`              | User acceptance testing validation         |
| `run-enhanced-iterationview-tests.sh`   | `npm run test:iterationview`    | IterationView UI component tests           |
| `run-integration-tests-in-container.sh` | `npm run test:integration`      | Container-based testing                    |
| `run-tests-via-scriptrunner.sh`         | `npm run test:integration`      | ScriptRunner environment testing           |

### ⚠️ Important Notes

- **Shell scripts are DEPRECATED**: Located in `/src/groovy/umig/tests/archived-shell-scripts/`
- **Use NPM commands only**: All shell script functionality preserved in NPM commands
- **100% functional equivalence**: No features lost in migration
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

## 📊 Performance Metrics

| Test Type             | Average Runtime | Cross-Platform | Features                         |
| --------------------- | --------------- | -------------- | -------------------------------- |
| **Unit Tests**        | 42s             | ✅ Universal   | Pattern matching, categorization |
| **Integration Tests** | 115s            | ✅ Universal   | Authentication, core mode        |
| **UAT Tests**         | 165s            | ✅ Universal   | Quick mode, full validation      |
| **Complete Suite**    | 322s            | ✅ Universal   | Parallel execution support       |

## 📞 Support

### Related Documentation

- **Testing Guide**: `/docs/testing/TESTING_GUIDE.md` - Comprehensive framework documentation
- **Solution Architecture**: `/docs/solution-architecture.md` - System design and ADRs
- **API Documentation**: `/docs/api/openapi.yaml` - OpenAPI specification

### Configuration Files

- **NPM Scripts**: `/local-dev-setup/package.json`
- **Test Runners**: `/local-dev-setup/scripts/test-*.js`
- **Shared Utilities**: `/local-dev-setup/scripts/shared/`

### Archive Reference

- **Deprecated Shell Scripts**: `/src/groovy/umig/tests/archived-shell-scripts/README.md`

---

**Quick Start**: `cd local-dev-setup && npm run test:all`  
**Migration Status**: ✅ Shell scripts fully migrated to NPM (August 18, 2025)  
**Support**: Comprehensive testing framework with enhanced cross-platform compatibility
