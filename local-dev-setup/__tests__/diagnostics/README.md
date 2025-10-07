# Diagnostics Directory

**Purpose**: Unified location for all diagnostic utilities - both automated tests and manual diagnostic scripts.

## Structure

```
diagnostics/
├── README.md           # This file
├── automated/          # Automated Jest diagnostic tests
│   └── (future automated tests)
└── manual/             # Manual diagnostic utilities
    ├── groovy/         # ScriptRunner console diagnostics
    │   ├── test-email-enrichment.groovy
    │   ├── test-email-service-debug.groovy
    │   ├── test-environment-detection-bugfix.groovy
    │   └── testDatabaseConnection.groovy
    └── sql/            # Direct SQL diagnostics
        └── verify-step-instance-data.sql
```

---

## Manual Diagnostics

### Groovy Scripts (ScriptRunner Console)

**Purpose**: Run in ScriptRunner console for testing Confluence/ScriptRunner integration

#### 1. `test-email-enrichment.groovy` (11KB)

**Purpose**: Test email template variable enrichment and EmailService functionality

**Usage**:

1. Open ScriptRunner → Console
2. Copy script contents
3. Run in console
4. Review output for email enrichment results

**Tests**:

- Email template variable population
- StepView URL construction
- EmailService integration
- MailHog delivery verification

---

#### 2. `test-email-service-debug.groovy` (11KB)

**Purpose**: Debug EmailService configuration and connectivity

**Usage**:

1. Open ScriptRunner → Console
2. Copy script contents
3. Run to diagnose email issues

**Tests**:

- SMTP configuration validation
- MailHog connectivity
- Email template loading
- ConfigurationService integration

---

#### 3. `test-environment-detection-bugfix.groovy` (11KB)

**Purpose**: Verify environment detection via ConfigurationService (ADR-073, ADR-074)

**Usage**:

1. Run in ScriptRunner console
2. Validates 4-tier environment detection
3. Tests ComponentLocator compatibility

**Tests**:

- System property detection
- Environment variable detection
- URL pattern matching
- Default fallback logic

**Related Documentation**:

- `/docs/troubleshooting/bugfixes/componentlocator-environment-detection.md`
- `/docs/architecture/adr/ADR-073-Enhanced-4-Tier-Environment-Detection.md`
- `/docs/architecture/adr/ADR-074-ComponentLocator-Compatibility.md`

---

#### 4. `testDatabaseConnection.groovy` (2KB)

**Purpose**: Quick database connectivity validation

**Usage**:

1. Run in ScriptRunner console
2. Verifies PostgreSQL connection
3. Tests DatabaseUtil.withSql pattern

**Tests**:

- Database connectivity
- SQL query execution
- Connection pooling
- DatabaseUtil helper methods

---

### SQL Scripts

#### 1. `verify-step-instance-data.sql` (5KB)

**Purpose**: Validate step instance data integrity and relationships

**Usage**:

```bash
# Run directly via psql
PGPASSWORD=123456 psql -h localhost -U umig_app_user -d umig_app_db -f verify-step-instance-data.sql

# Or via npm (if script added)
npm run diagnostic:sql:step-validation
```

**Validates**:

- Step instance data completeness
- Foreign key relationships
- Status consistency
- Migration hierarchy integrity

---

## Automated Diagnostics (Future)

### Purpose

Convert manual diagnostics to automated Jest tests for CI/CD integration

### Planned Tests

**`automated/email-enrichment.test.js`**

- Automated testing of email enrichment logic
- Integration with EmailService
- StepView URL validation

**`automated/step-instance-validation.test.js`**

- Automated database validation
- SQL query testing
- Data integrity checks

**`automated/database-connectivity.test.js`**

- Automated connectivity tests
- Connection pool validation
- Query performance testing

### npm Scripts (Planned)

```json
{
  "diagnostic": "npm run diagnostic:all",
  "diagnostic:all": "npm run diagnostic:automated && npm run diagnostic:manual:info",
  "diagnostic:automated": "jest --config jest.config.diagnostics.js",
  "diagnostic:email": "jest --testPathPattern='email-enrichment'",
  "diagnostic:database": "jest --testPathPattern='database-connectivity|step-instance'",
  "diagnostic:manual:info": "cat __tests__/diagnostics/manual/README.md"
}
```

---

## When to Use Diagnostics

### Manual Groovy Scripts

**Use when**:

- Debugging ScriptRunner integration
- Testing in actual Confluence environment
- Verifying MailHog email delivery
- Quick console-based validation

**Do NOT use**:

- For automated CI/CD testing (use automated tests)
- For regression testing (use Jest)
- For production validation (use monitoring)

### SQL Scripts

**Use when**:

- Validating database state after migrations
- Debugging data integrity issues
- Quick database health checks
- Investigating step instance problems

### Automated Tests (Future)

**Use when**:

- Running in CI/CD pipelines
- Regression testing after code changes
- Automated health monitoring
- Scheduled diagnostic checks

---

## Migration History

**Date**: October 7, 2025
**Migration**: Consolidated scattered diagnostic utilities

**Consolidated from**:

- `/local-dev-setup/diagnostic-scripts/` → 2 scripts moved
- `/src/groovy/umig/tests/diagnostics/` → 3 Groovy tests moved

**Eliminated directories**:

- `/local-dev-setup/diagnostic-scripts/` (redundant)
- `/local-dev-setup/diagnostics/` (empty after docs moved to `/docs/`)
- `/src/groovy/umig/tests/diagnostics/` (consolidated here)

**Rationale**:

- Single source of truth for diagnostic utilities
- Clear separation: automated vs manual diagnostics
- Better organization by execution context
- Easier discovery and maintenance
- Alignment with test infrastructure patterns

---

## Related Documentation

- **Troubleshooting Guides**: `/docs/troubleshooting/guides/`
- **Bugfix Documentation**: `/docs/troubleshooting/bugfixes/`
- **Test Documentation**: `/docs/testing/`
- **Operations Procedures**: `/docs/operations/procedures/`
- **Architecture Decisions**: `/docs/architecture/adr/`

---

## Best Practices

### Creating New Diagnostics

**Manual Groovy Scripts**:

1. Place in `manual/groovy/`
2. Use descriptive names: `test-[feature]-[purpose].groovy`
3. Include comprehensive comments
4. Document in this README

**SQL Scripts**:

1. Place in `manual/sql/`
2. Use descriptive names: `verify-[entity]-[aspect].sql`
3. Include comments explaining validation logic
4. Document in this README

**Automated Tests**:

1. Place in `automated/`
2. Follow Jest naming: `*.test.js`
3. Use technology prefix: `js:diagnostics` in npm scripts
4. Integrate with CI/CD

### Maintenance

- Review diagnostics quarterly
- Remove obsolete scripts
- Update documentation
- Convert frequently-used manual scripts to automated tests
- Keep diagnostics focused and single-purpose

---

**Last Updated**: October 7, 2025
**Maintainer**: UMIG Development Team
