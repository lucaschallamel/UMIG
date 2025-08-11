# UMIG Development Scripts

**Last Updated**: August 8, 2025  
**Status**: Production-Ready with Enterprise Infrastructure  
**Platform**: Confluence 9.2.7 + ScriptRunner 9.21.0

## Overview

This directory contains development and operational scripts for the UMIG project, organized by functional area to support development workflows, data generation, and system operations.

## Directory Structure

```
scripts/
├── generators/           # Data generation scripts (001-100)
│   ├── 001-050/         # Core entity generators
│   └── 051-100/         # Advanced generators
└── utilities/           # Development utilities (if added)
```

## Script Categories

### Data Generators (`generators/`)

Comprehensive suite of numbered generator scripts for creating test data across all UMIG entities.

**Key Scripts**:

- **001-020**: User and Team management
- **021-040**: Migration hierarchy (Migrations, Iterations, Plans)
- **041-060**: Execution hierarchy (Sequences, Phases, Steps)
- **061-080**: Instructions and Controls
- **081-100**: Advanced scenarios and bulk operations

**Usage Pattern**:

```bash
# From local-dev-setup directory
node scripts/generators/001-050/001_generate_confluence_users.js
node scripts/generators/001-050/020_generate_teams.js
```

### Generator Features

- **Idempotent Operations**: Safe to run multiple times
- **Foreign Key Awareness**: Respects database relationships
- **Status Field Compliance**: Uses normalized status values per ADR-035
- **Audit Fields**: Populates created_by, updated_by timestamps
- **Realistic Data**: Generates production-like test scenarios

## Integration with Infrastructure

These scripts work in conjunction with the infrastructure management tools:

- **Database Setup**: Requires PostgreSQL container running
- **Liquibase Migrations**: Database schema must be current
- **Confluence Integration**: Some generators interact with Confluence APIs
- **Backup Compatibility**: Generated data included in backup operations

## Common Operations

### Generate Complete Test Dataset

```bash
# From local-dev-setup directory
npm run generate-data        # Generate all test data
npm run generate-data:erase  # Clear and regenerate
```

### Individual Entity Generation

```bash
# Generate specific entities
node scripts/generators/001-050/025_generate_migrations.js
node scripts/generators/001-050/030_generate_iterations.js
node scripts/generators/001-050/040_generate_plans.js
```

### Data Validation

```bash
# Verify generated data integrity
node scripts/generators/081-100/099_validate_data_integrity.js
```

## Best Practices

1. **Run in Order**: Execute generators in numerical sequence for dependencies
2. **Check Container Status**: Ensure PostgreSQL is running before generation
3. **Review Logs**: Monitor console output for any warnings or errors
4. **Backup First**: Use infrastructure backup before bulk operations
5. **Validate After**: Run validation scripts post-generation

## Related Documentation

- [Infrastructure README](../infrastructure/README.md) - Infrastructure management
- [Development Setup](../README.md) - Complete development environment
- [Data Model](../../docs/dataModel/README.md) - Database schema reference
- [Operations Guide](../../docs/operations/README.md) - Operational procedures

## Script Maintenance

- **Compatibility**: Scripts updated for Confluence 9.2.7 + ScriptRunner 9.21.0
- **Status Values**: All generators use normalized status values
- **Performance**: Optimized for large dataset generation
- **Error Handling**: Comprehensive error reporting and recovery

## Future Enhancements

- Additional bulk operation scripts
- Performance testing data generators
- Migration scenario simulators
- Data anonymization utilities

---

**Note**: All scripts in this directory are development tools and should not be run in production environments.
