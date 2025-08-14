# UMIG Testing Documentation

## Overview

This directory contains the consolidated testing documentation for the UMIG project, streamlined from 6+ redundant files into 3 essential documents.

## Current Documentation Structure

### Core Documentation

1. **[TESTING_FRAMEWORK.md](./TESTING_FRAMEWORK.md)**
   - Complete testing framework overview
   - Script descriptions and usage
   - Coverage details
   - Troubleshooting guide
   - **Use this for**: Understanding the testing structure and how to run tests

2. **[QUALITY_CHECK_PROCEDURES.md](./QUALITY_CHECK_PROCEDURES.md)**
   - Generic, reusable validation procedures
   - Phase-based testing approach
   - Decision criteria and reporting templates
   - **Use this for**: Planning and executing quality validation for any component

### Archives

Historical validation reports and documentation from completed work:

- `archives/US-024-VALIDATION-REPORT.md` - StepsAPI refactoring validation results

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

### Before (6 files)

- 3 execution plan documents (redundant)
- 2 consolidation strategy documents (overlapping)
- 1 validation report (historical)
- **Problems**: 80% content duplication, unclear which to use, maintenance burden

### After (2 active + archives)

- 1 comprehensive framework guide
- 1 reusable procedures template
- Archives for historical reference
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

_Last Updated: 2025-08-14_  
_Post US-024 Consolidation_
