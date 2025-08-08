# UMIG Data Generator Scripts

**Last Updated**: August 8, 2025  
**Purpose**: Automated test data generation for UMIG development  
**Compatibility**: Confluence 9.2.7 + ScriptRunner 9.21.0

## Overview

This directory contains numbered generator scripts (001-100) that create comprehensive test data for all UMIG entities. The scripts are designed to be run in sequence, respecting foreign key dependencies and maintaining data integrity.

## Script Organization

### Numbering Convention

Scripts are numbered 001-100 based on dependency order and functional grouping:

```
001-020: Foundation (Users, Teams, Environments, Applications)
021-040: Migration Hierarchy (Migrations, Iterations, Plans)  
041-060: Execution Hierarchy (Sequences, Phases, Steps)
061-080: Details (Instructions, Controls, Labels)
081-100: Advanced/Bulk Operations
```

### Directory Structure

```
generators/
├── 001-050/              # Core entity generators
│   ├── 001_generate_confluence_users.js
│   ├── 020_generate_teams.js
│   ├── 025_generate_migrations.js
│   ├── 030_generate_iterations.js
│   ├── 040_generate_plans.js
│   └── ...
├── 051-100/              # Advanced generators
│   ├── 051_generate_sequences.js
│   ├── 055_generate_phases.js
│   ├── 060_generate_steps.js
│   └── ...
└── README.md            # This file
```

## Generator Scripts by Category

### Foundation Entities (001-020)

| Script | Entity | Description | Dependencies |
|--------|--------|-------------|--------------|
| 001 | Confluence Users | Creates test users in Confluence | None |
| 005 | Environments | Development, QA, Production environments | None |
| 010 | Applications | Application catalog | None |
| 015 | Labels | Categorization labels | None |
| 020 | Teams | Team structures with users | Users |

### Migration Hierarchy (021-040)

| Script | Entity | Description | Dependencies |
|--------|--------|-------------|--------------|
| 025 | Migrations | Top-level migration containers | Teams |
| 030 | Iterations | Time-bound execution windows | Migrations |
| 035 | Plans (Master) | Reusable plan templates | None |
| 040 | Plans (Instance) | Plan instances linked to iterations | Iterations, Plans Master |

### Execution Hierarchy (041-060)

| Script | Entity | Description | Dependencies |
|--------|--------|-------------|--------------|
| 045 | Sequences (Master) | Sequence templates | Plans Master |
| 050 | Sequences (Instance) | Sequence instances | Plans Instance |
| 055 | Phases | Execution phases | Sequences |
| 060 | Steps | Detailed execution steps | Phases, Teams |

### Detail Entities (061-080)

| Script | Entity | Description | Dependencies |
|--------|--------|-------------|--------------|
| 065 | Instructions | Step-level instructions | Steps |
| 070 | Controls | Validation checkpoints | Phases |
| 075 | Assignments | Team/user assignments | Steps, Teams |
| 080 | Relationships | Cross-entity relationships | Multiple |

### Advanced Operations (081-100)

| Script | Entity | Description | Dependencies |
|--------|--------|-------------|--------------|
| 085 | Bulk Steps | Mass step generation | All hierarchies |
| 090 | Performance Data | Large-scale test data | All entities |
| 095 | Scenario Setup | Complete migration scenarios | All entities |
| 099 | Data Validation | Integrity verification | All entities |
| 100 | Cleanup | Remove all test data | None |

## Usage Guidelines

### Running Individual Generators

```bash
# From local-dev-setup directory
node scripts/generators/001-050/001_generate_confluence_users.js
node scripts/generators/001-050/025_generate_migrations.js
```

### Running Complete Suite

```bash
# From local-dev-setup directory
npm run generate-data        # Run all generators in sequence
npm run generate-data:erase  # Clear database and regenerate
```

### Custom Data Generation

```bash
# Generate specific hierarchy
node scripts/generators/001-050/025_generate_migrations.js
node scripts/generators/001-050/030_generate_iterations.js
node scripts/generators/001-050/040_generate_plans.js
```

## Data Characteristics

### Status Values (Per ADR-035)

All generators use normalized status values:

- **Migration/Iteration/Plan/Sequence/Phase**: PLANNING, IN_PROGRESS, COMPLETED, CANCELLED
- **Step**: PENDING, TODO, IN_PROGRESS, COMPLETED, FAILED, BLOCKED, CANCELLED
- **Control**: TODO, PASSED, FAILED, CANCELLED
- **Instruction**: Boolean completion (no status FK)

### Audit Fields

Every generated entity includes:

- `created_by`: User ID from users_usr table
- `created_at`: Timestamp of creation
- `updated_by`: User ID of last modifier
- `updated_at`: Timestamp of last update

### Scale Parameters

Default generation creates:

- 5 Migrations
- 30 Iterations (6 per migration)
- 5 Plan templates
- 150 Plan instances
- 450 Sequences
- 1,350 Phases
- 13,500+ Steps
- 40,000+ Instructions

## Development Best Practices

1. **Dependency Order**: Always run generators in numerical sequence
2. **Database State**: Ensure clean database or known state before generation
3. **Container Status**: Verify PostgreSQL container is running
4. **Transaction Safety**: Generators use transactions for atomicity
5. **Error Handling**: Check console output for any failures
6. **Backup First**: Use infrastructure backup before bulk operations

## Troubleshooting

### Common Issues

**Foreign Key Violations**:

- Ensure dependent entities exist (run generators in order)
- Check status values match ADR-035 specification

**Connection Errors**:

- Verify PostgreSQL container is running: `podman ps`
- Check database credentials in configuration

**Performance Issues**:

- For large datasets, run generators individually
- Monitor PostgreSQL memory usage
- Consider adjusting batch sizes in scripts

### Validation

After generation, validate data integrity:

```bash
node scripts/generators/081-100/099_validate_data_integrity.js
```

## Integration Points

- **Liquibase Migrations**: Schema must be current before generation
- **Backup System**: Generated data included in enterprise backups
- **API Testing**: Generated data supports integration tests
- **UI Development**: Provides realistic data for interface development

## Maintenance Notes

- **Platform Compatibility**: Updated for Confluence 9.2.7 + ScriptRunner 9.21.0
- **Status Normalization**: Aligned with US-017 status field normalization
- **Performance**: Optimized for PostgreSQL 14+ with batch inserts
- **Idempotency**: Most generators can be run multiple times safely

---

**Warning**: These scripts generate test data only. Do not run in production environments.