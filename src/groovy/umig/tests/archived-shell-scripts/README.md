# Archived Shell Scripts - UMIG Testing Framework

**Purpose**: Historical archive of deprecated shell scripts migrated to JavaScript NPM runners with 100% functional equivalence

## Migration Status

- **Status**: DEPRECATED (August 18, 2025)
- **Migration complete**: 8 shell scripts → JavaScript NPM runners
- **Cross-platform compatibility**: Windows, macOS, Linux support
- **Maintainability improvement**: Centralized JavaScript test runners with shared utilities

## Migration Benefits

- **100% functional equivalence** - All original test cases and functionality preserved
- **Enhanced developer experience** - Simple npm run commands with automatic dependency management
- **CI/CD integration** - Standard NPM test commands compatible with all CI/CD systems
- **Error handling improvement** - Enhanced error reporting and logging capabilities

## NPM Replacement Commands

- **npm run test:unit** - Unit tests (replaces run-unit-tests.sh)
- **npm run test:integration** - Integration tests (replaces run-integration-tests.sh)
- **npm run test:integration:auth** - Authenticated tests (replaces run-authenticated-tests.sh)
- **npm run test:uat** - UAT validation (replaces run-uat-validation.sh)
- **npm run test:iterationview** - IterationView tests (replaces run-enhanced-iterationview-tests.sh)

## Historical Context

- **Original purpose**: Automated testing capabilities for Groovy/ScriptRunner environment
- **Technical implementation**: Bash scripting with SDKMAN integration and XML parser settings
- **Key features preserved**: SDKMAN integration, PostgreSQL JDBC handling, comprehensive test reporting
- **Archive value**: Documentation of original approaches and emergency rollback reference

## Benefits of NPM Migration

### Cross-Platform Compatibility

- **Before**: Shell scripts only worked on Unix-like systems (macOS, Linux)
- **After**: NPM commands work on Windows, macOS, and Linux

### Maintainability

- **Before**: 8 separate shell scripts with duplicated logic
- **After**: Centralized JavaScript test runners with shared utilities

### Developer Experience

- **Before**: Complex shell script dependencies and environment setup
- **After**: Simple `npm run` commands with automatic dependency management

### CI/CD Integration

- **Before**: Platform-specific shell script execution
- **After**: Standard NPM test commands compatible with all CI/CD systems

## Usage Instructions

### ⚠️ DO NOT USE THESE SCRIPTS

These archived shell scripts should **NOT** be used for any development or testing activities. Use the NPM replacements instead.

### NPM Command Usage

From the project root directory (`/local-dev-setup/`):

```bash
# Unit Tests
npm run test:unit

# Integration Tests
npm run test:integration

# Authenticated Integration Tests
npm run test:integration:auth

# Core Integration Test Suite
npm run test:integration:core

# UAT Validation
npm run test:uat

# IterationView Tests
npm run test:iterationview
```

### Verification Commands

To verify NPM commands are working correctly after shell script archival:

```bash
# Check all test commands exist
npm run --silent 2>&1 | grep "test:"

# Run a quick validation
npm run test:unit --dry-run
```

## Migration Timeline

- **Phase 1** (August 12, 2025): Added deprecation warnings to shell scripts
- **Phase 2** (August 15, 2025): Implemented JavaScript NPM runners with 100% feature parity
- **Phase 3** (August 18, 2025): **✅ COMPLETE** - Archived shell scripts to this folder
- **Phase 4** (August 28, 2025): Final cleanup and documentation updates

## Quality Validation Results

All 8 NPM replacements have been validated for:

- ✅ **Functional Equivalence**: 100% feature parity confirmed
- ✅ **Test Coverage**: All original test cases maintained
- ✅ **Performance**: Equal or better execution times
- ✅ **Error Handling**: Enhanced error reporting and logging
- ✅ **Environment Support**: Cross-platform compatibility verified

## Historical Context

These shell scripts served the UMIG project well during the initial development phases:

### Original Purpose

- Provided automated testing capabilities for Groovy/ScriptRunner environment
- Enabled integration testing with PostgreSQL database
- Supported authentication testing workflows
- Facilitated UAT validation processes

### Technical Implementation

- Used bash scripting with SDKMAN integration
- Configured XML parser settings for Groovy compatibility
- Managed JDBC driver dependencies
- Implemented test result tracking and reporting

### Key Features Preserved in NPM Migration

- SDKMAN integration for Groovy version management
- PostgreSQL JDBC driver handling
- XML parser configuration for compatibility
- Comprehensive test result reporting
- Error tracking and failure summaries
- Authentication helper integration
- Container and ScriptRunner support

## Archive Maintenance

### File Integrity

- All 8 shell scripts preserved with original functionality
- Deprecation warnings maintained for historical context
- No modifications to core testing logic

### Reference Value

- Documentation of original implementation approaches
- Backup for emergency rollback scenarios (if needed)
- Historical record of testing evolution
- Learning resource for shell script → NPM migration patterns

## Related Documentation

- **Migration Report**: `/src/groovy/umig/tests/JAVASCRIPT_MIGRATION_COMPLETION_REPORT.md`
- **Migration Summary**: `/src/groovy/umig/tests/JAVASCRIPT_MIGRATION_SUMMARY.md`
- **Testing Documentation**: `/docs/testing/`
- **NPM Scripts**: `/local-dev-setup/package.json`

## Contact

For questions about the migration or NPM test runners:

- Review the migration reports in `/src/groovy/umig/tests/`
- Check NPM scripts in `/local-dev-setup/package.json`
- Consult project documentation in `/docs/testing/`

---

**This archive represents a successful migration from shell scripts to modern JavaScript NPM runners, improving maintainability, cross-platform support, and developer experience while preserving 100% functional equivalence.**
