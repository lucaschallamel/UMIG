# Archived Shell Scripts - DEPRECATED

**Status**: DEPRECATED (August 18, 2025) - Migration to JavaScript NPM runners complete

## Purpose

Historical archive of shell scripts migrated to JavaScript NPM runners with 100% functional equivalence and enhanced cross-platform compatibility.

## Files

```
archived-shell-scripts/
├── README.md                              # This file
├── run-unit-tests.sh                     # → npm run test:groovy:unit
├── run-integration-tests.sh              # → npm run test:groovy:integration
├── run-authenticated-tests.sh            # → npm run test:integration:auth
├── run-uat-validation.sh                 # → npm run test:uat
├── run-enhanced-iterationview-tests.sh   # → npm run test:iterationview
├── run-integration-tests-core.sh         # → npm run test:integration:core
├── run-all-integration-tests.sh          # → npm run test:groovy:integration
└── run-iterationview-stepview-tests.sh   # → npm run test:iterationview
```

## Migration Summary

### NPM Replacement Commands

```bash
# Modern NPM commands (USE THESE)
npm run test:groovy:unit           # Unit tests
npm run test:groovy:integration    # Integration tests
npm run test:integration:auth      # Authenticated tests
npm run test:integration:core      # Core integration tests
npm run test:uat                   # UAT validation
npm run test:iterationview         # IterationView tests
```

### Migration Benefits

**Cross-Platform Compatibility**:
- ✅ Windows, macOS, Linux support
- ❌ Previously Unix-only (shell scripts)

**Maintainability**:
- ✅ Centralized JavaScript test runners
- ✅ Shared utility functions
- ❌ Previously 8 separate shell scripts with duplicated logic

**Developer Experience**:
- ✅ Simple `npm run` commands
- ✅ Automatic dependency management
- ✅ Enhanced error handling and logging
- ❌ Previously complex shell script dependencies

**CI/CD Integration**:
- ✅ Standard NPM test commands
- ✅ Compatible with all CI/CD systems
- ❌ Previously platform-specific execution

## Migration Timeline

- **August 12, 2025**: Deprecation warnings added to shell scripts
- **August 15, 2025**: JavaScript NPM runners implemented (100% parity)
- **August 18, 2025**: ✅ **COMPLETE** - Shell scripts archived
- **August 28, 2025**: Final documentation cleanup

## Quality Validation

All 8 NPM replacements validated for:
- ✅ Functional equivalence (100%)
- ✅ Test coverage maintained
- ✅ Equal or better performance
- ✅ Enhanced error handling
- ✅ Cross-platform support

## Historical Context

### Original Purpose
- Automated testing for Groovy/ScriptRunner environment
- Integration testing with PostgreSQL
- Authentication testing workflows
- UAT validation processes

### Technical Implementation
- Bash scripting with SDKMAN integration
- XML parser configuration for Groovy compatibility
- JDBC driver dependency management
- Test result tracking and reporting

### Features Preserved in NPM Migration
- SDKMAN integration for Groovy version management
- PostgreSQL JDBC driver handling
- XML parser configuration
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

## ⚠️ DO NOT USE THESE SCRIPTS

These archived shell scripts should **NOT** be used for development or testing. Use the NPM replacements instead.

### Why NPM Commands Are Better

1. **Universal Compatibility**: Work on Windows, macOS, Linux
2. **Simplified Commands**: Consistent `npm run` syntax
3. **Better Maintainability**: Centralized JavaScript runners
4. **Enhanced Features**: Improved error handling, logging, debugging
5. **Modern Workflow**: Standard NPM testing patterns

## Related Documentation

- **Migration Report**: `/src/groovy/umig/tests/JAVASCRIPT_MIGRATION_COMPLETION_REPORT.md`
- **Migration Summary**: `/src/groovy/umig/tests/JAVASCRIPT_MIGRATION_SUMMARY.md`
- **Testing Documentation**: `/docs/testing/`
- **NPM Scripts**: `/local-dev-setup/package.json`

---

**Status**: Archived (Deprecated)
**Migration Date**: August 18, 2025
**Replacement**: JavaScript NPM runners
**Functional Parity**: 100%
