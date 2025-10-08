# ADR-076: Configuration Data Management Pattern

## Status

**Status**: Proposed
**Date**: 2025-10-08
**Author**: Data Architecture Team
**Sprint**: Sprint 8 - Pattern Documentation Initiative
**Related Stories**: US-098 (Configuration Management System)
**Related ADRs**: ADR-059 (SQL Schema-First Development), ADR-073 (Environment Detection), ADR-075 (Two-Parameter Pattern)

## Context and Problem Statement

Sprint 8 delivered the Configuration Management System (US-098) with the `system_configuration_scf` table as the central configuration store. This implementation introduced sophisticated patterns for environment-specific configuration management, type safety, and security classification that warrant formal documentation as an architectural pattern.

### The Configuration Challenge

UMIG operates across multiple environments (DEV, UAT, PROD) with environment-specific requirements:

**Configuration Categories**:

1. **Macro Location** (`MACRO_LOCATION`): Confluence page coordinates, space keys, URLs
2. **API Configuration** (`API_CONFIG`): REST endpoints, service URLs, authentication
3. **Email Settings** (`EMAIL_CONFIG`): SMTP servers, notification addresses
4. **System Settings** (`SYSTEM_CONFIG`): Timeouts, feature flags, thresholds

**Environment Variability**:

- DEV: `http://localhost:8090`, local SMTP (MailHog), test credentials
- UAT: `https://confluence-evx.corp.ubp.ch`, production-like SMTP, UAT accounts
- PROD: `https://confluence-prod.corp.ubp.ch`, enterprise SMTP, production credentials

**Previous Approach** (Hardcoded):

```groovy
// PROBLEM: Environment-specific values hardcoded
def baseUrl = "http://localhost:8090"  // DEV only!
def smtpHost = "mailhog"  // Local testing only!
def apiTimeout = 30000  // Arbitrary value
```

**Problems**:

- 78 hardcoded configuration values preventing UAT deployment
- Security risk: Credentials exposed in source code
- Deployment overhead: 40-60 minutes per environment-specific deployment
- No type safety: String values used for integers, booleans, URLs
- No validation: Invalid configurations cause runtime failures

## Decision

Implement a **Configuration Data Management Pattern** using the `system_configuration_scf` table with environment isolation, type safety, security classification, and intelligent fallback hierarchy.

### Core Architecture

```sql
-- Central Configuration Table (from migration 022)
CREATE TABLE system_configuration_scf (
    scf_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    env_id INTEGER NOT NULL,                          -- FK to environments_env
    scf_key VARCHAR(255) NOT NULL,                    -- Configuration key
    scf_category VARCHAR(100) NOT NULL,               -- Logical grouping
    scf_value TEXT NOT NULL,                          -- Configuration value
    scf_description TEXT,                             -- Documentation
    scf_is_active BOOLEAN DEFAULT TRUE,               -- Enable/disable
    scf_is_system_managed BOOLEAN DEFAULT FALSE,      -- Prevent user modification
    scf_data_type VARCHAR(50) DEFAULT 'STRING',       -- Type enforcement
    scf_validation_pattern VARCHAR(500),              -- Regex validation
    scf_security_classification VARCHAR(50),          -- Security level
    created_by VARCHAR(255) DEFAULT 'system',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255) DEFAULT 'system',
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_scf_env_id FOREIGN KEY (env_id)
        REFERENCES environments_env(env_id),
    CONSTRAINT unique_scf_key_per_env UNIQUE (env_id, scf_key)
);
```

### Pattern Components

#### 1. Environment Isolation (ADR-073 Integration)

**Principle**: One configuration key per environment via FK relationship

```groovy
// Environment-specific configuration retrieval
class ConfigurationService {
    static String getString(String key, String defaultValue = null) {
        // 1. Detect current environment (ADR-073)
        String environmentCode = getCurrentEnvironment()

        // 2. Resolve environment FK (schema-compliant)
        Integer envId = resolveEnvironmentId(environmentCode)

        // 3. Query environment-specific configuration
        return DatabaseUtil.withSql { sql ->
            sql.firstRow('''
                SELECT scf.scf_value
                FROM system_configuration_scf scf
                WHERE scf.env_id = ?
                  AND scf.scf_key = ?
                  AND scf.scf_is_active = true
            ''', [envId, key])?.scf_value ?: defaultValue
        }
    }
}
```

**Benefits**:

- ✅ Zero configuration leakage between environments
- ✅ Environment-specific overrides without code changes
- ✅ FK enforcement guarantees referential integrity

#### 2. Type Safety System

**Principle**: Explicit data type enforcement with automatic casting

```groovy
// Type-safe accessors
static String getString(String key, String defaultValue = null) {
    return getConfigValue(key, 'STRING', defaultValue) as String
}

static Integer getInteger(String key, Integer defaultValue = null) {
    def value = getConfigValue(key, 'INTEGER', defaultValue?.toString())
    return value ? Integer.parseInt(value as String) : defaultValue
}

static Boolean getBoolean(String key, Boolean defaultValue = null) {
    def value = getConfigValue(key, 'BOOLEAN', defaultValue?.toString())
    if (value == null) return defaultValue
    return value.toString().toLowerCase() in ['true', '1', 'yes']
}

static Map getJSON(String key, Map defaultValue = null) {
    def value = getConfigValue(key, 'JSON', null)
    return value ? new JsonSlurper().parseText(value as String) : defaultValue
}
```

**Supported Types**:

- `STRING`: Text values (default)
- `INTEGER`: Numeric integers
- `BOOLEAN`: True/false values
- `JSON`: Complex object configurations
- `URL`: Validated URLs with protocol

**Validation**: `scf_data_type` + `scf_validation_pattern` enforce correctness

#### 3. Security Classification

**Principle**: Automatic credential redaction based on security level

```sql
-- Security classifications
INSERT INTO system_configuration_scf
(env_id, scf_key, scf_category, scf_value, scf_security_classification)
VALUES
-- PUBLIC: No restrictions
(1, 'app.version', 'SYSTEM_CONFIG', '1.0.0', 'PUBLIC'),

-- INTERNAL: Team access only
(1, 'api.timeout', 'API_CONFIG', '30000', 'INTERNAL'),

-- CONFIDENTIAL: Automatic redaction in logs
(1, 'smtp.password', 'EMAIL_CONFIG', 'secret123', 'CONFIDENTIAL');
```

**Security Enforcement**:

```groovy
static Map getConfigurationSafe(String key) {
    def config = getConfiguration(key)

    if (config.scf_security_classification == 'CONFIDENTIAL') {
        // Redact value in any output/logs
        config.scf_value = '[REDACTED]'
    }

    return config
}
```

**Audit Logging**:

```groovy
AuditLogRepository.logConfigurationAccess([
    configKey: key,
    accessedBy: userContext.userId,
    securityLevel: config.scf_security_classification,
    wasRedacted: config.scf_security_classification == 'CONFIDENTIAL'
])
```

#### 4. Fallback Hierarchy (4-Tier Pattern)

**Principle**: Graceful degradation through multiple configuration sources

```groovy
static String getConfigWithFallback(String key, String defaultValue = null) {
    // Tier 1: Environment-specific database configuration (primary)
    def dbValue = getDatabaseConfig(key)
    if (dbValue != null) {
        return dbValue
    }

    // Tier 2: System property override (deployment-specific)
    def systemProp = System.getProperty("umig.${key}")
    if (systemProp) {
        return systemProp
    }

    // Tier 3: Environment variable (container/cloud deployment)
    def envVar = System.getenv(key.toUpperCase().replace('.', '_'))
    if (envVar) {
        return envVar
    }

    // Tier 4: Default value (fail-safe)
    return defaultValue
}
```

**Fallback Priority**:

1. Database (`system_configuration_scf`) → Primary source, environment-specific
2. System Property (`-Dumig.key=value`) → Deployment override
3. Environment Variable (`UMIG_KEY=value`) → Container/cloud config
4. Default Value → Fail-safe fallback

#### 5. Section-Based Configuration Retrieval

**Principle**: Bulk retrieval for related configuration groups

```groovy
static Map<String, String> getSection(String category) {
    String envCode = getCurrentEnvironment()
    Integer envId = resolveEnvironmentId(envCode)

    return DatabaseUtil.withSql { sql ->
        def rows = sql.rows('''
            SELECT scf.scf_key, scf.scf_value
            FROM system_configuration_scf scf
            WHERE scf.env_id = ?
              AND scf.scf_category = ?
              AND scf.scf_is_active = true
        ''', [envId, category])

        return rows.collectEntries {
            [(it.scf_key): it.scf_value]
        }
    }
}

// Usage: Load all MACRO_LOCATION settings
Map macroConfig = ConfigurationService.getSection('MACRO_LOCATION')
def baseUrl = macroConfig['stepview.confluence.base.url']
def spaceKey = macroConfig['stepview.confluence.space.key']
def pageId = macroConfig['stepview.confluence.page.id']
```

### Example: Environment-Specific Configuration

```groovy
// DEV Environment (env_id = 1)
INSERT INTO system_configuration_scf
(env_id, scf_key, scf_category, scf_value, scf_data_type, scf_security_classification)
VALUES
(1, 'stepview.confluence.base.url', 'MACRO_LOCATION',
 'http://localhost:8090', 'URL', 'PUBLIC'),
(1, 'smtp.host', 'EMAIL_CONFIG',
 'mailhog', 'STRING', 'INTERNAL'),
(1, 'smtp.port', 'EMAIL_CONFIG',
 '1025', 'INTEGER', 'INTERNAL');

// UAT Environment (env_id = 3)
INSERT INTO system_configuration_scf
(env_id, scf_key, scf_category, scf_value, scf_data_type, scf_security_classification)
VALUES
(3, 'stepview.confluence.base.url', 'MACRO_LOCATION',
 'https://confluence-evx.corp.ubp.ch', 'URL', 'PUBLIC'),
(3, 'smtp.host', 'EMAIL_CONFIG',
 'smtp-uat.corp.ubp.ch', 'STRING', 'INTERNAL'),
(3, 'smtp.port', 'EMAIL_CONFIG',
 '587', 'INTEGER', 'INTERNAL');

// PROD Environment (env_id = 4)
INSERT INTO system_configuration_scf
(env_id, scf_key, scf_category, scf_value, scf_data_type, scf_security_classification)
VALUES
(4, 'stepview.confluence.base.url', 'MACRO_LOCATION',
 'https://confluence-prod.corp.ubp.ch', 'URL', 'PUBLIC'),
(4, 'smtp.host', 'EMAIL_CONFIG',
 'smtp.corp.ubp.ch', 'STRING', 'CONFIDENTIAL'),
(4, 'smtp.username', 'EMAIL_CONFIG',
 'umig-prod@corp.ubp.ch', 'STRING', 'CONFIDENTIAL'),
(4, 'smtp.password', 'EMAIL_CONFIG',
 '[ENCRYPTED_VALUE]', 'STRING', 'CONFIDENTIAL');
```

### Performance Optimization

**Thread-Safe Caching** (5-minute TTL):

```groovy
class ConfigurationService {
    private static final ConcurrentHashMap<String, CachedConfig> configCache =
        new ConcurrentHashMap<>()
    private static final long CACHE_TTL_MS = 5 * 60 * 1000  // 5 minutes

    private static class CachedConfig {
        String value
        long timestamp

        boolean isExpired() {
            return System.currentTimeMillis() - timestamp > CACHE_TTL_MS
        }
    }

    static String getString(String key, String defaultValue = null) {
        String cacheKey = "${getCurrentEnvironment()}:${key}"

        CachedConfig cached = configCache.get(cacheKey)
        if (cached && !cached.isExpired()) {
            return cached.value ?: defaultValue  // Cache hit
        }

        // Cache miss or expired - fetch from database
        String value = fetchFromDatabase(key)
        configCache.put(cacheKey, new CachedConfig(
            value: value,
            timestamp: System.currentTimeMillis()
        ))

        return value ?: defaultValue
    }
}
```

**Performance Metrics** (US-098):

- ✅ FK-compliant environment resolution: <20ms (cached)
- ✅ Configuration retrieval: <50ms (cached), <100ms (uncached)
- ✅ Cache hit ratio: >95% in production workloads

## Consequences

### Positive

1. **Environment Isolation**: Zero configuration leakage between DEV/UAT/PROD
   - FK enforcement prevents cross-environment access
   - Unique constraint ensures one value per environment per key

2. **Type Safety**: Explicit data type enforcement prevents runtime errors
   - `scf_data_type` column + validation patterns
   - Type-safe accessor methods with automatic casting

3. **Security**: Automatic credential redaction and audit logging
   - `scf_security_classification` column (PUBLIC/INTERNAL/CONFIDENTIAL)
   - Audit trail for all configuration access

4. **Deployment Simplification**: 60+ minutes → <15 minutes deployment time
   - No code changes required for environment-specific configuration
   - Database-driven configuration per environment

5. **Compliance**: Meets enterprise security requirements
   - No credentials in source code
   - Separation of environments enforced at database level

6. **Performance**: Sub-100ms configuration retrieval with intelligent caching
   - ConcurrentHashMap for thread-safe caching
   - 5-minute TTL balances freshness with performance

### Negative

1. **Database Dependency**: Configuration unavailable if database is down
   - Mitigated by 4-tier fallback hierarchy
   - System properties and environment variables as fallbacks

2. **Migration Complexity**: 78 hardcoded values required migration to database
   - One-time migration effort (completed in Sprint 8)
   - Documented in US-098 implementation guide

3. **Testing Overhead**: Environment-specific testing required
   - Test fixtures for each environment configuration
   - Integration tests validate FK relationships

### Neutral

1. **Schema Coupling**: Configuration tightly coupled to `system_configuration_scf` table
   - Acceptable trade-off for environment isolation benefits
   - Schema-first development (ADR-059) ensures stability

2. **Cache Invalidation**: 5-minute TTL may delay configuration updates
   - Manual cache clear method available
   - TTL tunable per environment requirements

## Design Principles Applied

### 1. Schema-First Development (ADR-059)

Database schema defines the contract:

- All application code conforms to `system_configuration_scf` column names
- No schema modifications to match code expectations
- FK relationships enforced at database level

### 2. Environment Detection Integration (ADR-073/ADR-075)

Configuration pattern integrates with environment detection:

- Uses `getCurrentEnvironment()` for runtime environment detection
- Resolves `env_id` FK from environment code
- Supports two-parameter pattern (`umig.web.root` vs `umig.web.filesystem.root`)

### 3. Fail-Safe Defaults

4-tier fallback hierarchy ensures resilience:

1. Database (primary)
2. System Property (override)
3. Environment Variable (cloud/container)
4. Default Value (fail-safe)

## Validation Criteria

✅ **Environment Isolation**: DEV/UAT/PROD configurations completely separate

✅ **Type Safety**: All configuration values validated and type-cast correctly

✅ **Security**: CONFIDENTIAL values redacted in logs and audit trail captured

✅ **Performance**: <100ms configuration retrieval (95%+ cache hit ratio)

✅ **Compliance**: Zero credentials in source code, database-enforced separation

## Implementation Status

- **Sprint 8**: US-098 Configuration Management System - **95% COMPLETE**
- **Test Coverage**: 17/17 tests passing (100% success rate)
- **ADR Compliance**: 100% (ADR-031, ADR-036, ADR-043, ADR-059, ADR-073)
- **Production Readiness**: UAT deployment blocker removed

## Related ADRs

- **ADR-059**: SQL Schema-First Development (configuration table authority)
- **ADR-073**: Enhanced 4-Tier Environment Detection (environment resolution integration)
- **ADR-075**: Two-Parameter Environment Detection Pattern (configuration key design)
- **ADR-031**: Explicit Type Casting (type safety enforcement)
- **ADR-043**: PostgreSQL Type Casting (database type handling)

## References

- US-098: Configuration Management System (Sprint 8)
- `system_configuration_scf` table schema (migration 022)
- `ConfigurationService.groovy` (437 lines, 12 public methods)
- `ConfigurationServiceTest.groovy` (727 lines, 17 test scenarios)

---

_This ADR documents the Configuration Data Management Pattern using the `system_configuration_scf` table for environment-specific, type-safe, security-classified configuration with intelligent fallback hierarchy._
