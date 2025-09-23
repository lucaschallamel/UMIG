---
version: 1.1.0
last_updated: 2025-09-21
tested_with:
  confluence: "9.2.7"
  scriptrunner: "9.21.0"
  postgres: "14"
  node: "18.17.0"
maintainer: "UMIG Development Team"
related_docs:
  - ../../SESSION_AUTH_UTILITIES.md
  - ../../../docs/roadmap/sprint7/TD-008-session-based-authentication-infrastructure.md
  - ../README.md
  - ../utilities/README.md
---

# UMIG Data Generator Scripts

**Purpose**: Automated test data generation for UMIG development with session authentication support
**Sprint**: Enhanced in Sprint 7 for TD-008 session authentication integration
**Compatibility**: Confluence 9.2.7 + ScriptRunner 9.21.0 + PostgreSQL 14

## Overview

This directory contains numbered generator scripts (001-100) that create comprehensive test data for all UMIG entities. The scripts respect foreign key dependencies, maintain data integrity, and integrate with session-based authentication for API validation.

## Prerequisites

- **Node.js 18+** for modern JavaScript features and fetch API
- **PostgreSQL 14** running in container
- **UMIG stack operational** (`npm start` from project root)
- **Session authentication** configured (TD-008)
- **Clean database state** or known baseline

## Quick Start

```bash
# 1. Ensure stack is running
npm start

# 2. Generate all test data
npm run generate-data

# 3. Generate with database reset
npm run generate-data:erase

# 4. Validate with session authentication
npm run auth:capture-session
export JSESSIONID=YOUR_SESSION_ID
npm run validate:generated-data
```

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
├── validate_with_session.js  # TD-008 session validation
└── README.md            # This file
```

## Generator Scripts by Category

### Foundation Entities (001-020)

| Script | Entity           | Description                              | Dependencies | Session Auth |
| ------ | ---------------- | ---------------------------------------- | ------------ | ------------ |
| 001    | Confluence Users | Creates test users in Confluence         | None         | Required     |
| 005    | Environments     | Development, QA, Production environments | None         | Optional     |
| 010    | Applications     | Application catalog                      | None         | Optional     |
| 015    | Labels           | Categorization labels                    | None         | Optional     |
| 020    | Teams            | Team structures with users               | Users        | Required     |

### Migration Hierarchy (021-040)

| Script | Entity           | Description                         | Dependencies             | Session Auth |
| ------ | ---------------- | ----------------------------------- | ------------------------ | ------------ |
| 025    | Migrations       | Top-level migration containers      | Teams                    | Optional     |
| 030    | Iterations       | Time-bound execution windows        | Migrations               | Optional     |
| 035    | Plans (Master)   | Reusable plan templates             | None                     | Optional     |
| 040    | Plans (Instance) | Plan instances linked to iterations | Iterations, Plans Master | Optional     |

### Execution Hierarchy (041-060)

| Script | Entity               | Description              | Dependencies   | Session Auth |
| ------ | -------------------- | ------------------------ | -------------- | ------------ |
| 045    | Sequences (Master)   | Sequence templates       | Plans Master   | Optional     |
| 050    | Sequences (Instance) | Sequence instances       | Plans Instance | Optional     |
| 055    | Phases               | Execution phases         | Sequences      | Optional     |
| 060    | Steps                | Detailed execution steps | Phases, Teams  | Required     |

### Detail Entities (061-080)

| Script | Entity        | Description                | Dependencies | Session Auth |
| ------ | ------------- | -------------------------- | ------------ | ------------ |
| 065    | Instructions  | Step-level instructions    | Steps        | Optional     |
| 070    | Controls      | Validation checkpoints     | Phases       | Optional     |
| 075    | Assignments   | Team/user assignments      | Steps, Teams | Required     |
| 080    | Relationships | Cross-entity relationships | Multiple     | Optional     |

### Advanced Operations (081-100)

| Script | Entity           | Description                  | Dependencies    | Session Auth |
| ------ | ---------------- | ---------------------------- | --------------- | ------------ |
| 085    | Bulk Steps       | Mass step generation         | All hierarchies | Optional     |
| 090    | Performance Data | Large-scale test data        | All entities    | Optional     |
| 095    | Scenario Setup   | Complete migration scenarios | All entities    | Required     |
| 099    | Data Validation  | Integrity verification       | All entities    | Required     |
| 100    | Cleanup          | Remove all test data         | None            | Optional     |

## Session Authentication Integration (TD-008)

### Obtaining Session for Validation

```bash
# 1. Login to Confluence
# Navigate to http://localhost:8090 and login as admin:123456

# 2. Capture session
cd ../..  # Navigate to local-dev-setup
npm run auth:capture-session

# 3. Export for use in generators
export JSESSIONID=YOUR_SESSION_ID
```

### Validating Generated Data via API

```javascript
// validate_with_session.js
const sessionId = process.env.JSESSIONID;
const headers = {
  Cookie: `JSESSIONID=${sessionId}`,
  "X-Requested-With": "XMLHttpRequest",
  Accept: "application/json",
};

// Validate teams were created
const response = await fetch(
  "http://localhost:8090/rest/scriptrunner/latest/custom/teams",
  {
    headers,
  },
);
```

## Usage Guidelines

### Running Individual Generators

```bash
# From local-dev-setup directory
node scripts/generators/001-050/001_generate_confluence_users.js
node scripts/generators/001-050/025_generate_migrations.js

# With session validation
JSESSIONID=$JSESSIONID node scripts/generators/001-050/020_generate_teams.js
```

### Running Complete Suite

```bash
# From local-dev-setup directory
npm run generate-data        # Run all generators in sequence
npm run generate-data:erase  # Clear database and regenerate

# With session validation
JSESSIONID=$JSESSIONID npm run generate-data:validate
```

### Custom Data Generation

```bash
# Generate specific hierarchy
node scripts/generators/001-050/025_generate_migrations.js
node scripts/generators/001-050/030_generate_iterations.js
node scripts/generators/001-050/040_generate_plans.js

# Validate via API with session
JSESSIONID=$JSESSIONID node scripts/generators/validate_with_session.js
```

## Data Characteristics

### Status Values (Per ADR-035 & TD-003)

All generators use normalized status values aligned with Sprint 7 consolidation:

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
- `session_id`: Optional session tracking (when authenticated)

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

### Performance Metrics

| Operation    | Records | Time  | Rate    |
| ------------ | ------- | ----- | ------- |
| Users        | 100     | ~2s   | 50/sec  |
| Teams        | 20      | ~1s   | 20/sec  |
| Steps        | 13,500  | ~30s  | 450/sec |
| Instructions | 40,000  | ~60s  | 667/sec |
| Full Suite   | ~55,000 | ~3min | 306/sec |

## Development Best Practices

1. **Dependency Order**: Always run generators in numerical sequence
2. **Database State**: Ensure clean database or known state before generation
3. **Container Status**: Verify PostgreSQL container is running
4. **Transaction Safety**: Generators use transactions for atomicity
5. **Error Handling**: Check console output for any failures
6. **Backup First**: Use infrastructure backup before bulk operations
7. **Session Validation**: Use TD-008 utilities for API validation
8. **Performance Monitoring**: Track generation times for optimization

## Troubleshooting

### Common Issues

#### Foreign Key Violations

```
Error: Foreign key constraint violation
```

**Solution**:

- Ensure dependent entities exist (run generators in order)
- Check status values match ADR-035/TD-003 specification
- Verify team and user relationships

#### Session Authentication Failures

```
Error: 401 Unauthorized when validating
```

**Solution**:

- Ensure Confluence session is active
- Refresh JSESSIONID using `npm run auth:capture-session`
- Check session hasn't expired (30-minute timeout)

#### Connection Errors

```
Error: ECONNREFUSED ::1:5432
```

**Solution**:

- Verify PostgreSQL container is running: `podman ps`
- Check database credentials in configuration
- Ensure stack is started: `npm start`

#### Performance Issues

```
Warning: Generation taking longer than expected
```

**Solution**:

- For large datasets, run generators individually
- Monitor PostgreSQL memory usage
- Consider adjusting batch sizes in scripts
- Check for database locks: `SELECT * FROM pg_locks`

### Validation Commands

```bash
# Validate data integrity
node scripts/generators/081-100/099_validate_data_integrity.js

# Validate via API with session
JSESSIONID=$JSESSIONID node scripts/generators/validate_with_session.js

# Check record counts
psql -U umig_app_user -d umig_app_db -c "
SELECT
    'migrations' as entity, COUNT(*) as count FROM migrations_mig
UNION ALL
SELECT 'iterations', COUNT(*) FROM iterations_ite
UNION ALL
SELECT 'steps', COUNT(*) FROM steps_instance_sti
ORDER BY entity;"

# Verify relationships
psql -U umig_app_user -d umig_app_db -c "
SELECT
    COUNT(DISTINCT mig_id) as migrations,
    COUNT(DISTINCT ite_id) as iterations,
    COUNT(DISTINCT pli_id) as plans,
    COUNT(*) as steps
FROM steps_instance_sti;"
```

## Integration Points

### API Integration

- Generated data accessible via REST APIs
- Session authentication required for validation
- Use TD-008 utilities for API testing

### Testing Integration

- **Unit Tests**: Use minimal generated data
- **Integration Tests**: Full hierarchy generation
- **Performance Tests**: Use bulk generators (085-090)
- **E2E Tests**: Complete scenario setup (095)

### Development Workflow

1. **Local Development**: Generate minimal dataset
2. **Feature Testing**: Generate specific entities
3. **Integration Testing**: Full suite generation
4. **Performance Testing**: Bulk data generation
5. **API Validation**: Session-based verification

## Monitoring & Maintenance

### Health Checks

```bash
# Check generator health
npm run health:generators

# Validate database state
npm run db:validate

# Check session authentication
npm run auth:test-session
```

### Performance Monitoring

```javascript
// Add to generators for timing
const startTime = Date.now();
// ... generation code ...
const duration = Date.now() - startTime;
console.log(
  `Generated ${count} records in ${duration}ms (${(count * 1000) / duration}/sec)`,
);
```

### Maintenance Schedule

- **Weekly**: Validate generator compatibility
- **Sprint**: Update for schema changes
- **Monthly**: Performance optimization review
- **Quarterly**: Bulk data cleanup

## Security Considerations

1. **Test Data Only**: Never use in production
2. **Session Security**: Don't commit JSESSIONID values
3. **Data Sensitivity**: No PII in generated data
4. **Access Control**: Restrict to development environments
5. **Cleanup**: Remove test data after use

## Related Documentation

- [Session Authentication Utilities](../../SESSION_AUTH_UTILITIES.md)
- [TD-008: Session Authentication](../../../docs/roadmap/sprint7/TD-008-session-based-authentication-infrastructure.md)
- [Scripts README](../README.md)
- [Utilities README](../utilities/README.md)
- [Infrastructure README](../../infrastructure/README.md)

## Version History

- **v1.1.0** (2025-09-21): Added TD-008 session authentication support
- **v1.0.0** (2025-09): Sprint 7 updates with TD-003 status normalization
- **v0.9.0** (2025-08): Initial implementation for Sprint 6

---

**Warning**: These scripts generate test data only. Do not run in production environments. Always validate data generation in isolated development environments first.
