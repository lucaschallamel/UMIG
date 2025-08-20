# UMIG Testing Documentation

## Overview

This directory contains the consolidated testing documentation for the UMIG project, streamlined from 6+ redundant files into 3 essential documents.

## Current Documentation Structure

### Core Documentation

1. **[TESTING_GUIDE.md](./TESTING_GUIDE.md)**
   - Complete testing framework overview
   - Script descriptions and usage
   - Coverage details
   - Troubleshooting guide
   - **Use this for**: Understanding the testing structure and how to run tests

2. **[US-036-comprehensive-testing-guide.md](./US-036-comprehensive-testing-guide.md)**
   - **NEW**: Consolidated US-036 StepView testing guide
   - Executive summary and quick reference
   - Complete testing framework and validation procedures
   - Role-based access control testing
   - Performance and security validation
   - **Use this for**: All US-036 StepView testing and validation

3. **[NPM_COMMANDS_REFERENCE.md](./NPM_COMMANDS_REFERENCE.md)**
   - NPM-based testing commands reference
   - Cross-platform testing approach
   - **Use this for**: Running tests via NPM commands

### Archives

Historical validation reports and documentation from completed work:

- `archives/US-024-VALIDATION-REPORT.md` - StepsAPI refactoring validation results
- `../archived/us-036-testing/` - **NEW**: US-036 StepView testing documentation (6 consolidated files)

## Quick Start

### Running Tests

```bash
# Quick health check
cd local-dev-setup
./scripts/quality-check/immediate-health-check.sh

# API testing
./scripts/quality-check/api-smoke-test.sh

# Full validation suite
./scripts/quality-check/master-quality-check.sh
```

### Test Scripts Location

```
local-dev-setup/scripts/quality-check/
├── immediate-health-check.sh      # Environment validation
├── api-smoke-test.sh              # API endpoint testing
├── phase-b-test-execution.sh      # Groovy test runner
└── master-quality-check.sh        # Full orchestration
```

## Documentation Consolidation Results

### US-036 Consolidation (August 2025)

**Before (6 redundant files)**:
- `US-036-testing-strategy-summary.md`
- `STEPVIEW_IMMEDIATE_EXECUTION_GUIDE.md`
- `STEPVIEW_QA_FRAMEWORK_SUMMARY.md`
- `STEPVIEW_QA_FRAMEWORK.md`
- `StepView_StatusDropdown_QA_ValidationReport.md`
- `STEPVIEW_VALIDATION_CHECKLIST.md`
- **Problems**: 90% content overlap, confusing which to use, maintenance burden

**After (1 comprehensive guide)**:
- `US-036-comprehensive-testing-guide.md` - Single definitive testing resource
- **Benefits**: Eliminated redundancy, single source of truth, actionable guidance

### Previous US-024 Consolidation

- Consolidated 8 test scripts into 4 essential ones
- Reduced 6 documents into 2 active + archives
- **Benefits**: No duplication, clear purpose, easy maintenance

## What Changed in US-024

### Testing Improvements

- Consolidated 8 test scripts into 4 essential ones
- Fixed comments endpoint error messages
- Improved diagnostic capabilities
- Created reusable testing framework

### Documentation Updates

- Consolidated 6 documents into 2 active + archives
- Created clear separation of concerns
- Established reusable templates
- Documented lessons learned

## Related Documentation

- [API Documentation](../api/openapi.yaml) - OpenAPI specification
- [Solution Architecture](../solution-architecture.md) - System design and ADRs
- [Development Setup](../../local-dev-setup/README.md) - Environment configuration

## Maintenance Guidelines

### When to Update

- After adding new test capabilities
- When test procedures change
- After major refactoring efforts
- When new validation requirements emerge

### How to Update

1. Update TESTING_FRAMEWORK.md for structural changes
2. Update QUALITY_CHECK_PROCEDURES.md for process changes
3. Archive old validation reports in `archives/`
4. Keep this README current with the structure

---

_Last Updated: 2025-08-20_  
_Post US-036 Testing Documentation Consolidation_
