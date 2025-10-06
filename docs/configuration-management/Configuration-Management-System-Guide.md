# Configuration Management System - Technical Reference Guide

**Created**: 2025-10-06
**Last Updated**: 2025-10-06
**Owner**: Lucas Challamel
**Lifecycle**: Living Document
**Version**: 1.2
**Cross-References**: [Sprint Completion Report](../../roadmap/sprint8/US-098-Configuration-Management-System-Sprint-Completion.md), [Operations Guide](../../operations/Configuration-Management-Deployment.md)

**Document Updates**:

- **v1.2 (2025-10-06)**: Consolidated UMIG Web Root Configuration Guide content from Sprint 8 roadmap
  - Added Case Study: UMIG_WEB_ROOT Migration (Migration & Deployment section)
  - Enhanced Troubleshooting Guide with web resource-specific scenarios
  - Preserved all critical migration details, code examples, and deployment checklists

---

## Overview

The Configuration Management System provides centralized, environment-aware configuration services for the UMIG application through `ConfigurationService.groovy`. This guide serves as the authoritative technical reference for developers integrating with the configuration system.

**Core Capabilities**:

- Environment-aware configuration retrieval (DEV, UAT, PROD)
- Type-safe accessors with fallback defaults
- Thread-safe caching with 5-minute TTL
- Security classification and value sanitization
- Comprehensive audit logging
- FK-compliant environment resolution
- Graceful degradation on database unavailability

**File Location**: `src/groovy/umig/service/ConfigurationService.groovy` (595 lines)

---

## Public API Reference

### Configuration Retrieval Methods

#### getString(String key, String defaultValue = null)

Retrieves string configuration value with 4-tier fallback hierarchy.

**Signature**:

```groovy
static String getString(String key, String defaultValue = null)
```

**Parameters**:

- `key` (String, required): Configuration key to retrieve
- `defaultValue` (String, optional): Value returned if config not found (default: null)

**Returns**: String value from first available source:

1. Environment-specific database config (env_id = current environment)
2. Global database config (env_id = NULL)
3. System environment variable (LOCAL/DEV only)
4. Default value parameter

**Example Usage**:

```groovy
// Retrieve with default
String smtpHost = ConfigurationService.getString('email.smtp.host', 'localhost')

// Retrieve without default (returns null if not found)
String optionalConfig = ConfigurationService.getString('optional.key')

// Environment-specific retrieval (automatic)
// DEV environment: uses env_id=1
// UAT environment: uses env_id=3
// PROD environment: uses env_id=2
String apiUrl = ConfigurationService.getString('app.api.base.url')
```

**Caching Behavior**:

- First retrieval: Database query (~100-150ms)
- Subsequent retrievals: Cache hit (<50ms)
- Cache TTL: 5 minutes
- Cache key format: `"${key}:${currentEnvironment}"`

**Audit Logging**: Every retrieval logged with classification, source, and sanitized value

**ADR Compliance**: ADR-031 (type safety), ADR-042 (audit logging)

---

#### getInteger(String key, Integer defaultValue = null)

Retrieves integer configuration value with type-safe parsing.

**Signature**:

```groovy
static Integer getInteger(String key, Integer defaultValue = null)
```

**Parameters**:

- `key` (String, required): Configuration key to retrieve
- `defaultValue` (Integer, optional): Value returned if config not found or unparseable

**Returns**: Integer value from parsed string config, or default if:

- Configuration not found
- Value cannot be parsed as Integer
- NumberFormatException occurs

**Example Usage**:

```groovy
// Retrieve timeout with default
Integer timeout = ConfigurationService.getInteger('app.timeout.seconds', 30)

// Retrieve optional integer
Integer batchSize = ConfigurationService.getInteger('import.batch.size')

// Invalid value handling (returns default)
// Config value: "not-a-number"
Integer invalid = ConfigurationService.getInteger('invalid.key', 100)
// Returns: 100 (default)
```

**Error Handling**:

```groovy
try {
    return Integer.parseInt(stringValue as String)
} catch (NumberFormatException e) {
    log.warn("Failed to parse integer for key '${key}': ${e.message}")
    return defaultValue
}
```

**Performance**: Additional parsing overhead <1ms

**ADR Compliance**: ADR-031 (explicit casting)

---

#### getBoolean(String key, Boolean defaultValue = false)

Retrieves boolean configuration value with flexible parsing.

**Signature**:

```groovy
static Boolean getBoolean(String key, Boolean defaultValue = false)
```

**Parameters**:

- `key` (String, required): Configuration key to retrieve
- `defaultValue` (Boolean, optional): Value returned if config not found or unparseable (default: false)

**Returns**: Boolean value from parsed string config

**Accepted True Values** (case-insensitive):

- "true"
- "yes"
- "1"
- "enabled"
- "on"

**Accepted False Values** (case-insensitive):

- "false"
- "no"
- "0"
- "disabled"
- "off"

**Example Usage**:

```groovy
// Retrieve feature flag
Boolean emailEnabled = ConfigurationService.getBoolean('feature.email.enabled', true)

// Retrieve with various string formats
// Config value: "YES" → Returns: true
// Config value: "enabled" → Returns: true
// Config value: "1" → Returns: true
// Config value: "OFF" → Returns: false
// Config value: "invalid" → Returns: false (default)

Boolean debugMode = ConfigurationService.getBoolean('app.debug.mode')
```

**Parsing Logic**:

```groovy
String lowerValue = (value as String).toLowerCase()
if (lowerValue in ['true', 'yes', '1', 'enabled', 'on']) {
    return true
} else if (lowerValue in ['false', 'no', '0', 'disabled', 'off']) {
    return false
} else {
    log.warn("Invalid boolean value for key '${key}': ${value}")
    return defaultValue
}
```

**ADR Compliance**: ADR-031 (type safety)

---

#### getSection(String sectionPrefix)

Retrieves all configurations matching a prefix, returning a map with shortened keys.

**Signature**:

```groovy
static Map<String, Object> getSection(String sectionPrefix)
```

**Parameters**:

- `sectionPrefix` (String, required): Prefix to filter configurations (e.g., "email.smtp.")

**Returns**: Map<String, Object> with:

- Keys: Original key with prefix stripped (e.g., "host" from "email.smtp.host")
- Values: Configuration values as strings

**Example Usage**:

```groovy
// Retrieve all SMTP configs
Map<String, Object> smtpConfig = ConfigurationService.getSection('email.smtp.')
// Returns:
// {
//   "auth.enabled": "false",
//   "starttls.enabled": "false",
//   "connection.timeout.ms": "5000",
//   "timeout.ms": "5000"
// }

// Access specific values from section
String authEnabled = smtpConfig.get('auth.enabled')
String tlsEnabled = smtpConfig.get('starttls.enabled')

// Empty prefix returns all configs (not recommended)
Map<String, Object> allConfigs = ConfigurationService.getSection('')
```

**Key Stripping Behavior**:

```groovy
// Database: "email.smtp.host" = "localhost"
// Section prefix: "email.smtp."
// Returned key: "host"
// Returned value: "localhost"
```

**Performance**: Single database query retrieves all matching configs

**Use Cases**:

- Bulk configuration retrieval for subsystems
- Configuration group validation
- Dynamic configuration discovery

**ADR Compliance**: ADR-036 (repository pattern)

---

### Environment Management Methods

#### getCurrentEnvironment()

Returns current environment code based on 3-tier detection hierarchy.

**Signature**:

```groovy
static String getCurrentEnvironment()
```

**Parameters**: None

**Returns**: Environment code (String): "DEV", "UAT", or "PROD"

**Detection Hierarchy** (priority order):

1. **System Property**: `-Dumig.environment=UAT`
2. **Environment Variable**: `UMIG_ENVIRONMENT=PROD`
3. **Default**: `PROD` (fail-safe)

**Example Usage**:

```groovy
// Get current environment
String env = ConfigurationService.getCurrentEnvironment()
// Returns: "DEV" | "UAT" | "PROD"

// Conditional logic based on environment
if (env == 'DEV') {
    // Development-specific behavior
} else if (env == 'UAT') {
    // UAT-specific behavior
} else {
    // Production behavior
}
```

**Configuration Examples**:

```groovy
// Option 1: System property (highest priority)
System.setProperty('umig.environment', 'UAT')

// Option 2: Environment variable
export UMIG_ENVIRONMENT=PROD

// Option 3: Default (no configuration)
// Returns: PROD (fail-safe)
```

**Security Note**: Default to PROD ensures production-grade security when environment not explicitly set

**ADR Compliance**: ADR-059 (schema-first, code adapts)

---

#### getCurrentEnvironmentId()

Returns current environment FK (INTEGER env_id) for database operations.

**Signature**:

```groovy
static Integer getCurrentEnvironmentId()
```

**Parameters**: None

**Returns**: Integer env_id (FK to environments_env table)

**Throws**: IllegalStateException if environment code cannot be resolved to env_id

**Example Usage**:

```groovy
// Get current environment ID
Integer envId = ConfigurationService.getCurrentEnvironmentId()
// DEV: Returns 1
// UAT: Returns 3
// PROD: Returns 2

// Use in database queries
DatabaseUtil.withSql { sql ->
    sql.execute(
        'INSERT INTO audit_log (env_id, action) VALUES (?, ?)',
        [envId, 'CONFIG_ACCESS']
    )
}
```

**Resolution Process**:

1. Get environment code via `getCurrentEnvironment()`
2. Resolve env_id via `resolveEnvironmentId(code)`
3. Cache env_id for 5 minutes
4. Return INTEGER for FK compliance

**Error Handling**:

```groovy
if (envId == null) {
    throw new IllegalStateException(
        "Cannot resolve env_id for current environment: ${currentEnv}"
    )
}
```

**ADR Compliance**: ADR-043 (FK compliance, INTEGER type)

---

#### resolveEnvironmentId(String envCode)

Converts environment code to INTEGER env_id with caching.

**Signature**:

```groovy
static Integer resolveEnvironmentId(String envCode)
```

**Parameters**:

- `envCode` (String, required): Environment code ("DEV", "UAT", "PROD")

**Returns**: Integer env_id or null if environment doesn't exist

**Database Query**:

```sql
SELECT env_id FROM environments_env
WHERE UPPER(env_code) = UPPER(:envCode)
```

**Caching Strategy**:

- First lookup: Database query (~10-20ms)
- Subsequent lookups: Cache hit (<1ms)
- Cache TTL: 5 minutes
- Cache structure: ConcurrentHashMap<String, Integer>

**Example Usage**:

```groovy
// Resolve specific environment
Integer devId = ConfigurationService.resolveEnvironmentId('DEV')
// Returns: 1

Integer uatId = ConfigurationService.resolveEnvironmentId('UAT')
// Returns: 3

Integer prodId = ConfigurationService.resolveEnvironmentId('PROD')
// Returns: 2

// Invalid environment
Integer invalid = ConfigurationService.resolveEnvironmentId('INVALID')
// Returns: null
```

**Case Insensitivity**: Accepts "dev", "DEV", "Dev" (normalized to uppercase)

**ADR Compliance**: ADR-043 (INTEGER FK), ADR-031 (explicit casting)

---

#### environmentExists(String envCode)

Validates if environment code exists in database.

**Signature**:

```groovy
static boolean environmentExists(String envCode)
```

**Parameters**:

- `envCode` (String, required): Environment code to validate

**Returns**: true if environment exists, false otherwise

**Example Usage**:

```groovy
// Validate environment before operations
if (ConfigurationService.environmentExists('UAT')) {
    // Safe to use UAT environment
    Integer uatId = ConfigurationService.resolveEnvironmentId('UAT')
}

// Guard against invalid environments
String envCode = userInput.trim().toUpperCase()
if (!ConfigurationService.environmentExists(envCode)) {
    throw new IllegalArgumentException("Invalid environment: ${envCode}")
}
```

**Implementation**:

```groovy
try {
    Integer envId = resolveEnvironmentId(envCode)
    return envId != null
} catch (Exception e) {
    log.error("Failed to check environment existence: ${e.message}")
    return false
}
```

**Use Cases**:

- Input validation
- Environment availability checks
- Pre-operation validation

---

### Cache Management Methods

#### clearCache()

Removes all entries from configuration and environment caches.

**Signature**:

```groovy
static void clearCache()
```

**Parameters**: None

**Returns**: void

**Effect**:

- Clears configuration cache (all key-value pairs)
- Clears environment ID cache (all env_id mappings)
- Next configuration retrieval will hit database

**Example Usage**:

```groovy
// Clear all caches
ConfigurationService.clearCache()

// Use case: After database configuration updates
updateConfiguration('email.smtp.host', 'new-host.example.com')
ConfigurationService.clearCache()  // Force reload from database

// Use case: After migration execution
executeLiquibaseMigration('035_us098_phase4_batch1_revised.sql')
ConfigurationService.clearCache()  // Ensure new configs visible
```

**Performance Impact**:

- Next retrieval: ~100-150ms (uncached database query)
- Subsequent retrievals: <50ms (cache repopulated)

**Thread Safety**: ConcurrentHashMap.clear() is atomic and thread-safe

---

#### refreshConfiguration()

Alias for `clearCache()` with more intuitive naming.

**Signature**:

```groovy
static void refreshConfiguration()
```

**Parameters**: None

**Returns**: void

**Example Usage**:

```groovy
// Semantically clearer than clearCache()
ConfigurationService.refreshConfiguration()

// Use case: Hot-reload configuration without restart
if (configurationChanged()) {
    ConfigurationService.refreshConfiguration()
    log.info("Configuration refreshed from database")
}
```

**Equivalence**: `refreshConfiguration()` internally calls `clearCache()`

---

#### getCacheStats()

Returns cache statistics for monitoring and debugging.

**Signature**:

```groovy
static Map<String, Object> getCacheStats()
```

**Parameters**: None

**Returns**: Map containing:

- `configCacheSize` (Integer): Number of cached configuration entries
- `environmentCacheSize` (Integer): Number of cached environment ID mappings
- `cacheTtlMinutes` (Integer): Cache TTL in minutes (5)
- `configCacheKeys` (List<String>): All cached configuration keys
- `environmentCacheEntries` (List<Map>): All cached env_id mappings

**Example Usage**:

```groovy
// Get cache statistics
Map<String, Object> stats = ConfigurationService.getCacheStats()

println "Config cache size: ${stats.configCacheSize}"
println "Environment cache size: ${stats.environmentCacheSize}"
println "Cache TTL: ${stats.cacheTtlMinutes} minutes"

// Inspect cached keys
stats.configCacheKeys.each { key ->
    println "Cached key: ${key}"
}

// Inspect environment mappings
stats.environmentCacheEntries.each { entry ->
    println "Environment: ${entry.envCode} → ID: ${entry.envId}"
}
```

**Example Output**:

```groovy
{
    configCacheSize: 12,
    environmentCacheSize: 3,
    cacheTtlMinutes: 5,
    configCacheKeys: [
        "email.smtp.host:DEV",
        "email.smtp.port:DEV",
        "app.api.base.url:UAT",
        ...
    ],
    environmentCacheEntries: [
        {envCode: "DEV", envId: 1},
        {envCode: "UAT", envId: 3},
        {envCode: "PROD", envId: 2}
    ]
}
```

**Use Cases**:

- Performance monitoring
- Cache hit ratio calculation
- Troubleshooting configuration issues
- Capacity planning

---

#### clearExpiredCacheEntries()

Removes only expired entries from caches (based on TTL).

**Signature**:

```groovy
static void clearExpiredCacheEntries()
```

**Parameters**: None

**Returns**: void

**TTL Check**:

```groovy
long currentTime = System.currentTimeMillis()
long cacheTime = cachedValue.timestamp
long ttlMillis = 5 * 60 * 1000  // 5 minutes

if (currentTime - cacheTime > ttlMillis) {
    // Entry expired, remove from cache
}
```

**Example Usage**:

```groovy
// Periodic cleanup (e.g., scheduled job)
@Scheduled(cron = "0 */5 * * * ?")  // Every 5 minutes
void cleanupExpiredCache() {
    ConfigurationService.clearExpiredCacheEntries()
    log.debug("Expired cache entries cleaned up")
}

// Manual cleanup before cache stats
ConfigurationService.clearExpiredCacheEntries()
Map stats = ConfigurationService.getCacheStats()
// Now stats show only active cache entries
```

**Performance**: O(n) iteration over all cache entries, but typically <10ms for normal cache sizes

**Memory Optimization**: Prevents cache from growing indefinitely

---

## Architecture & Design Patterns

### 4-Tier Fallback Hierarchy

**Retrieval Order** (getString, getInteger, getBoolean):

```
┌─────────────────────────────────────────────────┐
│ 1. Environment-Specific Database Configuration  │
│    SELECT scf_value FROM system_configuration_  │
│    WHERE scf_key = ? AND env_id = 3 (UAT)       │
└─────────────────────────────────────────────────┘
                     │
                     ▼ Not found
┌─────────────────────────────────────────────────┐
│ 2. Global Database Configuration                │
│    SELECT scf_value FROM system_configuration_  │
│    WHERE scf_key = ? AND env_id IS NULL         │
└─────────────────────────────────────────────────┘
                     │
                     ▼ Not found
┌─────────────────────────────────────────────────┐
│ 3. System Environment Variables (LOCAL/DEV only)│
│    System.getenv(key.toUpperCase()              │
│                      .replace('.', '_'))        │
└─────────────────────────────────────────────────┘
                     │
                     ▼ Not found
┌─────────────────────────────────────────────────┐
│ 4. Default Value (parameter)                    │
│    return defaultValue                          │
└─────────────────────────────────────────────────┘
```

**Design Rationale**:

1. Environment-specific configs take precedence for environment-aware behavior
2. Global configs provide organization-wide defaults
3. Environment variables support legacy .env file patterns (DEV only)
4. Default values ensure graceful degradation

**Example Flow**:

```groovy
// Request: getString('app.timeout.seconds', '30')
// Current environment: UAT (env_id = 3)

// Step 1: Query UAT-specific config
// Result: Found "10" in database

// Return: "10" (environment-specific value)

// Request: getString('missing.key', 'default-value')

// Step 1: Query UAT-specific → Not found
// Step 2: Query global → Not found
// Step 3: Check .env → Not applicable (not DEV)
// Step 4: Return default → "default-value"
```

---

### Thread-Safe Caching Strategy

**Cache Implementation**:

```groovy
private static Map<String, CachedValue> configurationCache =
    new ConcurrentHashMap<>()

private static Map<String, Integer> environmentIdCache =
    new ConcurrentHashMap<>()
```

**CachedValue Structure**:

```groovy
private static class CachedValue {
    String value
    long timestamp
    SecurityClassification classification

    CachedValue(String value, long timestamp,
                SecurityClassification classification) {
        this.value = value
        this.timestamp = timestamp
        this.classification = classification
    }

    boolean isExpired() {
        long currentTime = System.currentTimeMillis()
        long ttlMillis = 5 * 60 * 1000  // 5 minutes
        return (currentTime - timestamp) > ttlMillis
    }
}
```

**Thread Safety Guarantees**:

- ConcurrentHashMap provides lock-free reads
- Atomic put/remove operations
- No external synchronization required
- Safe for concurrent access from multiple threads

**Cache Key Format**:

```groovy
String cacheKey = "${configKey}:${currentEnvironment}"
// Examples:
// "email.smtp.host:DEV"
// "app.api.base.url:UAT"
// "feature.email.enabled:PROD"
```

**TTL Management**:

- Cache timestamp: System.currentTimeMillis() at insertion
- TTL duration: 5 minutes (300,000 milliseconds)
- Expiration check: Lazy (on access) or manual (clearExpiredCacheEntries)

**Performance Characteristics**:

- Cache hit: O(1) lookup, <1ms typical
- Cache miss: Database query + cache insertion, ~100-150ms
- Cache clear: O(n) iteration, <5ms typical for normal sizes

---

### Security Classification System

**3-Level Classification**:

```groovy
private static enum SecurityClassification {
    PUBLIC,      // Default - general configuration
    INTERNAL,    // Infrastructure details
    CONFIDENTIAL // Credentials and secrets
}
```

**Automatic Classification Logic**:

```groovy
private static SecurityClassification classifyConfigurationKey(String key) {
    String lowerKey = (key as String).toLowerCase()

    // Priority 1: CONFIDENTIAL (highest sensitivity)
    if (lowerKey.contains('password') ||
        lowerKey.contains('token') ||
        lowerKey.contains('key') ||
        lowerKey.contains('secret') ||
        lowerKey.contains('credential')) {
        return SecurityClassification.CONFIDENTIAL
    }

    // Priority 2: INTERNAL (infrastructure)
    if (lowerKey.contains('host') ||
        lowerKey.contains('port') ||
        lowerKey.contains('url') ||
        lowerKey.contains('path')) {
        return SecurityClassification.INTERNAL
    }

    // Default: PUBLIC
    return SecurityClassification.PUBLIC
}
```

**Pattern Keywords**:

| Classification | Keywords                                 | Example Keys                           |
| -------------- | ---------------------------------------- | -------------------------------------- |
| CONFIDENTIAL   | password, token, key, secret, credential | email.smtp.password, api.access.token  |
| INTERNAL       | host, port, url, path                    | smtp.server.host, app.api.base.url     |
| PUBLIC         | (all others)                             | app.timeout.seconds, import.batch.size |

**Value Sanitization Strategy**:

```groovy
private static String sanitizeValue(String value,
                                     SecurityClassification classification) {
    if (!value) return value

    switch (classification) {
        case SecurityClassification.CONFIDENTIAL:
            return '***REDACTED***'  // Complete redaction

        case SecurityClassification.INTERNAL:
            // Partial masking (20% visible at start/end)
            if (value.length() <= 5) {
                return value  // Too short to mask
            }
            int visibleChars = Math.max(1, (int)(value.length() * 0.2))
            String start = value.substring(0, visibleChars)
            String end = value.substring(value.length() - visibleChars)
            return "${start}*****${end}"

        case SecurityClassification.PUBLIC:
            return value  // No sanitization

        default:
            return value
    }
}
```

**Sanitization Examples**:

| Original Value             | Classification | Sanitized Value |
| -------------------------- | -------------- | --------------- |
| SuperSecret123!            | CONFIDENTIAL   | **_REDACTED_**  |
| smtp.example.com           | INTERNAL       | smt**\***com    |
| https://api.example.com/v2 | INTERNAL       | htt**\***m/v2   |
| 30                         | PUBLIC         | 30              |
| true                       | PUBLIC         | true            |

**Use in Audit Logging**:

```groovy
log.info(
    "AUDIT: user=${username}, key=${key}, " +
    "classification=${classification}, " +
    "value=${sanitizeValue(value, classification)}, " +
    "source=${source}, success=${success}, " +
    "timestamp=${timestamp}"
)
```

---

### Audit Logging Framework

**Audit Event Structure**:

```groovy
private static void auditConfigurationAccess(
    String key,
    String value,
    SecurityClassification classification,
    boolean success,
    String source
) {
    String username = getUsernameForAudit()
    String sanitizedValue = sanitizeValue(value, classification)
    String timestamp = new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")

    log.info(
        "AUDIT: user=${username}, key=${key}, " +
        "classification=${classification}, value=${sanitizedValue}, " +
        "source=${source}, success=${success}, timestamp=${timestamp}"
    )
}
```

**Audit Sources**:

| Source        | Description                                   | Example                               |
| ------------- | --------------------------------------------- | ------------------------------------- |
| cache         | Retrieved from cache                          | Cache hit for existing config         |
| database      | Retrieved from system_configuration_scf table | Environment-specific or global config |
| environment   | Retrieved from system environment variable    | .env file value (DEV only)            |
| default       | Returned default parameter value              | No config found, using fallback       |
| parsed        | Type conversion successful                    | Integer.parseInt() succeeded          |
| parse-error   | Type conversion failed                        | NumberFormatException caught          |
| section-query | Section retrieval database query              | getSection() called                   |
| section-error | Section retrieval failed                      | Database error during section query   |

**Integration Points** (14 total):

**getString() Method** (5 audit points):

1. Cache hit
2. Environment-specific database retrieval
3. Global database retrieval
4. System environment variable retrieval
5. Default value fallback

**getInteger() Method** (2 audit points):

1. Successful integer parsing
2. Parse failure with default fallback

**getBoolean() Method** (3 audit points):

1. True value parsed
2. False value parsed
3. Invalid value with default fallback

**getSection() Method** (2 audit points):

1. Each configuration in section (multiple audit events)
2. Section query failure

**Additional** (2 integration points):

1. refreshConfiguration() cache clear audit
2. Database unavailability fallback audit

**User Attribution**:

```groovy
private static String getUsernameForAudit() {
    try {
        // Try to get current Confluence user
        return UserService.getCurrentUsername()
    } catch (Exception e) {
        // Fallback to system identity
        return "system"
    }
}
```

**Performance Overhead**: <5ms per configuration access (validated in performance tests)

**Log Level**: INFO (can be disabled in production via logging configuration)

**Compliance**: Satisfies ADR-042 (Audit Logging Requirements)

---

## Integration Patterns

### Basic Configuration Usage

**Simple String Retrieval**:

```groovy
import umig.service.ConfigurationService

class MyService {
    void sendEmail() {
        String smtpHost = ConfigurationService.getString(
            'email.smtp.host',
            'localhost'
        )

        Integer smtpPort = ConfigurationService.getInteger(
            'email.smtp.port',
            1025
        )

        // Use retrieved configuration
        smtpClient.connect(smtpHost, smtpPort)
    }
}
```

**Environment-Aware Configuration**:

```groovy
class ApiClient {
    private String baseUrl

    ApiClient() {
        // Automatically uses current environment's config
        // DEV: http://localhost:8090
        // UAT: https://confluence-evx.corp.ubp.ch
        // PROD: https://confluence.corp.ubp.ch
        this.baseUrl = ConfigurationService.getString('app.api.base.url')
    }

    void callApi(String endpoint) {
        String fullUrl = "${baseUrl}/rest/api/${endpoint}"
        // Make HTTP request...
    }
}
```

**Feature Flags**:

```groovy
class EmailNotificationService {
    boolean shouldSendNotification() {
        // Check if email notifications enabled for current environment
        return ConfigurationService.getBoolean(
            'feature.email.notifications.enabled',
            true  // Default: enabled
        )
    }

    void sendNotification() {
        if (shouldSendNotification()) {
            // Send email notification
        } else {
            log.debug("Email notifications disabled via configuration")
        }
    }
}
```

---

### Advanced Integration Patterns

**Configuration Section Loading**:

```groovy
class SmtpConfigLoader {
    Map<String, String> loadSmtpConfig() {
        // Load all SMTP-related configurations at once
        Map<String, Object> smtpSection =
            ConfigurationService.getSection('email.smtp.')

        // Convert to strongly-typed config object
        return [
            authEnabled: smtpSection.get('auth.enabled'),
            tlsEnabled: smtpSection.get('starttls.enabled'),
            connectionTimeout: smtpSection.get('connection.timeout.ms'),
            operationTimeout: smtpSection.get('timeout.ms')
        ]
    }
}
```

**Dynamic Configuration with Cache Refresh**:

```groovy
class DynamicConfigurationManager {
    void updateConfiguration(String key, String value) {
        // Update database configuration
        DatabaseUtil.withSql { sql ->
            sql.execute(
                '''UPDATE system_configuration_scf
                   SET scf_value = :value
                   WHERE scf_key = :key AND env_id = :envId''',
                [
                    key: key,
                    value: value,
                    envId: ConfigurationService.getCurrentEnvironmentId()
                ]
            )
        }

        // Force reload from database
        ConfigurationService.refreshConfiguration()

        log.info("Configuration updated and cache refreshed: ${key}")
    }

    String getLatestConfiguration(String key) {
        // Always returns fresh value after updateConfiguration()
        return ConfigurationService.getString(key)
    }
}
```

**Environment-Specific Behavior**:

```groovy
class BatchProcessor {
    Integer getBatchSize() {
        String env = ConfigurationService.getCurrentEnvironment()

        // Environment-specific batch sizes
        // DEV: 100 (smaller for faster testing)
        // UAT: 500 (medium for UAT validation)
        // PROD: 1000 (large for production efficiency)
        return ConfigurationService.getInteger('import.batch.size', 100)
    }

    void processBatch(List items) {
        Integer batchSize = getBatchSize()
        items.collate(batchSize).each { batch ->
            processSingleBatch(batch)
        }
    }
}
```

**Timeout Configuration Pattern**:

```groovy
class ApiClientWithTimeouts {
    private Integer connectionTimeout
    private Integer operationTimeout

    ApiClientWithTimeouts() {
        // Load timeouts from configuration
        this.connectionTimeout = ConfigurationService.getInteger(
            'api.connection.timeout.ms',
            5000  // 5 seconds default
        )

        this.operationTimeout = ConfigurationService.getInteger(
            'api.operation.timeout.ms',
            10000  // 10 seconds default
        )
    }

    void makeApiCall() {
        httpClient
            .setConnectTimeout(connectionTimeout)
            .setReadTimeout(operationTimeout)
            .execute(request)
    }
}
```

**Configuration Validation Pattern**:

```groovy
class ConfigurationValidator {
    void validateRequiredConfigs() {
        List<String> requiredKeys = [
            'app.api.base.url',
            'email.smtp.host',
            'import.batch.size'
        ]

        List<String> missingKeys = []

        requiredKeys.each { key ->
            String value = ConfigurationService.getString(key)
            if (!value) {
                missingKeys << key
            }
        }

        if (missingKeys) {
            throw new IllegalStateException(
                "Missing required configurations: ${missingKeys.join(', ')}"
            )
        }

        log.info("All required configurations present")
    }
}
```

---

## ADR Compliance Reference

### ADR-031: Type Safety Requirements

**Compliance**: ✅ Full

**Implementation**:

- All parameters explicitly cast: `(key as String)`, `(value as String)`
- INTEGER env_id: `(row.env_id as Integer)`
- Type-safe parsing: `Integer.parseInt(value as String)`
- Boolean casting: `(lowerValue as String).toLowerCase()`

**Code Examples**:

```groovy
// ✅ CORRECT: Explicit casting
static String getString(String key, String defaultValue = null) {
    Integer envId = getCurrentEnvironmentId()
    def config = getRepository().findConfigurationByKey(key as String, envId)
    return config?.scf_value as String ?: defaultValue
}

// ✅ CORRECT: Integer parsing with casting
static Integer getInteger(String key, Integer defaultValue = null) {
    String value = getString(key, null)
    if (value == null) return defaultValue

    try {
        return Integer.parseInt(value as String)
    } catch (NumberFormatException e) {
        return defaultValue
    }
}
```

---

### ADR-036: Repository Pattern

**Compliance**: ✅ Full

**Implementation**:

- Lazy repository initialization
- All database access via SystemConfigurationRepository
- No direct SQL in service layer (except environment resolution)

**Code Examples**:

```groovy
// ✅ CORRECT: Lazy repository initialization
private static SystemConfigurationRepository getRepository() {
    return new SystemConfigurationRepository()
}

// ✅ CORRECT: Repository delegation
static String getString(String key, String defaultValue = null) {
    def repository = getRepository()
    def config = repository.findConfigurationByKey(key as String, envId)
    // ...
}

static Map<String, Object> getSection(String sectionPrefix) {
    def repository = getRepository()
    def configs = repository.findActiveConfigurationsByEnvironment(envId)
    // ...
}
```

**Exception**: Direct SQL allowed for `resolveEnvironmentId()` because it queries `environments_env` table, not `system_configuration_scf`

---

### ADR-042: Audit Logging

**Compliance**: ✅ Full

**Implementation**:

- 14 integration points across all configuration access methods
- User attribution via UserService
- ISO-8601 timestamps
- Classification-aware value sanitization
- Success/failure status tracking

**Code Examples**:

```groovy
// ✅ CORRECT: Audit logging with classification
private static void auditConfigurationAccess(
    String key,
    String value,
    SecurityClassification classification,
    boolean success,
    String source
) {
    String username = getUsernameForAudit()
    String sanitizedValue = sanitizeValue(value, classification)
    String timestamp = new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")

    log.info(
        "AUDIT: user=${username}, key=${key}, " +
        "classification=${classification}, value=${sanitizedValue}, " +
        "source=${source}, success=${success}, timestamp=${timestamp}"
    )
}
```

**Audit Event Examples**:

```
AUDIT: user=admin, key=email.smtp.password, classification=CONFIDENTIAL,
       value=***REDACTED***, source=database, success=true,
       timestamp=2025-10-02T14:23:45.123Z

AUDIT: user=system, key=app.api.base.url, classification=INTERNAL,
       value=htt*****com, source=cache, success=true,
       timestamp=2025-10-02T14:24:12.456Z
```

---

### ADR-043: PostgreSQL Type Casting (FK Compliance)

**Compliance**: ✅ Full

**Implementation**:

- All env_id values are INTEGER type
- FK relationship maintained: system_configuration_scf.env_id → environments_env.env_id
- Explicit casting in all env_id operations

**Code Examples**:

```groovy
// ✅ CORRECT: INTEGER env_id resolution
static Integer resolveEnvironmentId(String envCode) {
    String normalizedCode = (envCode as String).toUpperCase()

    def envId = DatabaseUtil.withSql { sql ->
        def row = sql.firstRow(
            'SELECT env_id FROM environments_env WHERE UPPER(env_code) = UPPER(:envCode)',
            [envCode: normalizedCode]
        )
        return row ? (row.env_id as Integer) : null
    }

    return envId
}

// ✅ CORRECT: INTEGER env_id usage in repository
def config = repository.findConfigurationByKey(key as String, envId as Integer)
```

---

### ADR-059: Schema-First Development

**Compliance**: ✅ Full

**Implementation**:

- Code adapted to existing database schema
- No schema modifications to match code
- Actual column names used: scf_key, scf_value, env_id

**Schema Reference**:

```sql
CREATE TABLE system_configuration_scf (
    scf_id UUID PRIMARY KEY,
    env_id INTEGER NOT NULL,  -- FK to environments_env(env_id)
    scf_key VARCHAR(255) NOT NULL,
    scf_value TEXT NOT NULL,
    scf_description TEXT,
    scf_is_active BOOLEAN DEFAULT true,
    scf_security_classification VARCHAR(50) DEFAULT 'PUBLIC',
    scf_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scf_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_env_key UNIQUE(env_id, scf_key)
);
```

**Code Adaptation**:

```groovy
// ✅ CORRECT: Uses actual column names
def config = repository.findConfigurationByKey(key as String, envId as Integer)
if (config?.scf_value) {
    return config.scf_value as String
}

// ✅ CORRECT: Respects FK constraint
Integer envId = getCurrentEnvironmentId()  // Returns INTEGER for FK

// ✅ CORRECT: Honors unique constraint UNIQUE(env_id, scf_key)
String cacheKey = "${key}:${getCurrentEnvironment()}"
```

---

## Error Handling & Edge Cases

### Graceful Degradation

**Database Unavailability**:

```groovy
try {
    def config = repository.findConfigurationByKey(key as String, envId)
    return config?.scf_value as String
} catch (Exception e) {
    log.error("Database unavailable for config key '${key}': ${e.message}")

    // Fallback to default value
    auditConfigurationAccess(
        key,
        defaultValue,
        classification,
        false,  // success = false
        'database-error'
    )

    return defaultValue
}
```

**Invalid Environment Code**:

```groovy
Integer envId = resolveEnvironmentId(envCode)
if (envId == null) {
    throw new IllegalStateException(
        "Cannot resolve env_id for environment: ${envCode}"
    )
}
```

**Type Conversion Failures**:

```groovy
// Integer parsing
try {
    return Integer.parseInt(value as String)
} catch (NumberFormatException e) {
    log.warn("Failed to parse integer for key '${key}': ${e.message}")
    return defaultValue
}

// Boolean parsing
if (lowerValue in ['true', 'yes', '1', 'enabled', 'on']) {
    return true
} else if (lowerValue in ['false', 'no', '0', 'disabled', 'off']) {
    return false
} else {
    log.warn("Invalid boolean value for key '${key}': ${value}")
    return defaultValue
}
```

**Null Configuration Values**:

```groovy
// Always check for null before operations
String value = getString(key, null)
if (value == null) {
    return defaultValue
}

// Safe navigation operator
return config?.scf_value as String ?: defaultValue
```

---

## Performance Optimization

### Cache Efficiency Recommendations

**Pre-load Critical Configurations**:

```groovy
class ConfigurationPreloader {
    void warmupCache() {
        List<String> criticalKeys = [
            'app.api.base.url',
            'email.smtp.host',
            'import.batch.size',
            'feature.email.notifications.enabled'
        ]

        criticalKeys.each { key ->
            ConfigurationService.getString(key)  // Load into cache
        }

        log.info("Configuration cache warmed up with ${criticalKeys.size()} keys")
    }
}
```

**Bulk Configuration Loading**:

```groovy
// ✅ EFFICIENT: Single database query for multiple configs
Map<String, Object> smtpConfig = ConfigurationService.getSection('email.smtp.')

// ❌ INEFFICIENT: Multiple database queries
String host = ConfigurationService.getString('email.smtp.host')
String port = ConfigurationService.getString('email.smtp.port')
String auth = ConfigurationService.getString('email.smtp.auth.enabled')
String tls = ConfigurationService.getString('email.smtp.starttls.enabled')
```

**Cache Monitoring**:

```groovy
@Scheduled(cron = "0 */5 * * * ?")  // Every 5 minutes
void logCacheStats() {
    Map stats = ConfigurationService.getCacheStats()

    log.info("Configuration cache stats: " +
             "size=${stats.configCacheSize}, " +
             "env_cache_size=${stats.environmentCacheSize}")

    // Alert if cache size exceeds threshold
    if (stats.configCacheSize > 1000) {
        log.warn("Configuration cache size exceeds threshold: ${stats.configCacheSize}")
    }
}
```

---

## Testing & Validation

### Unit Testing ConfigurationService Integration

**Test Pattern**:

```groovy
class MyServiceTest {
    void testConfigurationUsage() {
        // Set test environment
        System.setProperty('umig.environment', 'DEV')

        try {
            // Test code that uses ConfigurationService
            String value = ConfigurationService.getString('test.key', 'default')

            assert value == 'expected-value'

        } finally {
            // Always clean up environment property
            System.clearProperty('umig.environment')
        }
    }
}
```

**Mock Pattern** (for isolated unit tests):

```groovy
// Note: ConfigurationService is static, so mocking requires PowerMock or similar
// Recommended: Use integration tests with real database for ConfigurationService testing
```

### Integration Testing

**Database Fixture Setup**:

```groovy
void setupConfigurationFixture() {
    DatabaseUtil.withSql { sql ->
        // Insert test configuration
        sql.execute(
            '''INSERT INTO system_configuration_scf
               (scf_id, env_id, scf_key, scf_value, scf_is_active)
               VALUES (:id, :envId, :key, :value, true)''',
            [
                id: UUID.randomUUID(),
                envId: 1,  // DEV environment
                key: 'test.key',
                value: 'test-value'
            ]
        )
    }

    // Clear cache to ensure fresh database read
    ConfigurationService.clearCache()
}

void cleanupConfigurationFixture() {
    DatabaseUtil.withSql { sql ->
        sql.execute(
            'DELETE FROM system_configuration_scf WHERE scf_key LIKE :pattern',
            [pattern: 'test.%']
        )
    }

    ConfigurationService.clearCache()
}
```

**Test Execution**:

```groovy
void testEnvironmentSpecificConfig() {
    setupConfigurationFixture()
    System.setProperty('umig.environment', 'DEV')

    try {
        String value = ConfigurationService.getString('test.key')
        assert value == 'test-value'

        // Verify cache hit on second retrieval
        long startTime = System.nanoTime()
        String cachedValue = ConfigurationService.getString('test.key')
        long duration = (System.nanoTime() - startTime) / 1_000_000

        assert cachedValue == 'test-value'
        assert duration < 50  // Cache hit should be <50ms

    } finally {
        System.clearProperty('umig.environment')
        cleanupConfigurationFixture()
    }
}
```

---

## Troubleshooting Guide

### Common Issues

**Issue**: Configuration not found, returns default value

- **Symptom**: `getString()` always returns default parameter
- **Diagnosis**:
  1. Check if configuration exists in database: `SELECT * FROM system_configuration_scf WHERE scf_key = 'your.key'`
  2. Verify environment ID matches: `SELECT getCurrentEnvironmentId()` vs database env_id
  3. Check scf_is_active = true
- **Resolution**:
  ```sql
  -- Insert missing configuration
  INSERT INTO system_configuration_scf (scf_id, env_id, scf_key, scf_value, scf_is_active)
  VALUES (gen_random_uuid(), 1, 'your.key', 'your-value', true);
  ```

**Issue**: Stale configuration values after database update

- **Symptom**: `getString()` returns old value even after database update
- **Diagnosis**: Cache contains outdated value (5-minute TTL)
- **Resolution**:

  ```groovy
  // Force cache refresh
  ConfigurationService.refreshConfiguration()

  // Or wait 5 minutes for automatic expiration
  ```

**Issue**: IllegalStateException: "Cannot resolve env_id"

- **Symptom**: Exception thrown when calling `getCurrentEnvironmentId()`
- **Diagnosis**: Environment code doesn't exist in environments_env table
- **Resolution**:

  ```sql
  -- Verify environment exists
  SELECT * FROM environments_env;

  -- Insert missing environment
  INSERT INTO environments_env (env_id, env_code, env_name, env_is_active)
  VALUES (3, 'UAT', 'UAT Environment', true);
  ```

**Issue**: ClassCastException in type conversion

- **Symptom**: Exception when calling `getInteger()` or `getBoolean()`
- **Diagnosis**: Configuration value cannot be parsed to requested type
- **Resolution**:
  ```groovy
  // Use try-catch for safer type conversion
  Integer value = ConfigurationService.getInteger('invalid.key', 100)
  // Returns: 100 (default) instead of throwing exception
  ```

**Issue**: Audit logs not appearing

- **Symptom**: No AUDIT log entries in Confluence logs
- **Diagnosis**: Logging level set too high (WARN or ERROR)
- **Resolution**:
  ```xml
  <!-- In logging configuration -->
  <logger name="umig.service.ConfigurationService" level="INFO"/>
  ```

**Issue**: CSS/JS Not Loading (404 Errors) - Web Resources

- **Symptom**: Browser console shows 404 errors for `.css` and `.js` files, Iteration View and Step View appear unstyled
- **Diagnosis**:
  1. Check ConfigurationService value:
     ```groovy
     import umig.service.ConfigurationService
     def webRoot = ConfigurationService.getString('umig.web.root', 'NOT_FOUND')
     log.info("UMIG_WEB_ROOT: ${webRoot}")
     ```
  2. Check database configuration:
     ```sql
     SELECT e.env_name, scf.scf_key, scf.scf_value, scf.scf_is_active
     FROM system_configuration_scf scf
     JOIN environments_env e ON scf.env_id = e.env_id
     WHERE scf.scf_key = 'umig.web.root';
     ```
  3. Check environment detection:
     ```groovy
     def currentEnv = ConfigurationService.getCurrentEnvironment()
     log.info("Current Environment: ${currentEnv}")
     ```
- **Resolution**:
  - **DEV**: Check `.env` file has `UMIG_WEB_ROOT` set correctly
  - **UAT/PROD**: Verify database has configuration for environment
  - **All**: Check WebApi endpoint is accessible: `/rest/scriptrunner/latest/custom/web/css/iteration-view.css`

**Issue**: Wrong Path Being Used - Web Resources

- **Symptom**: ConfigurationService returns unexpected path
- **Diagnosis**:
  1. Check tier resolution order:
     ```groovy
     log.debug("Tier 1 (DB env-specific): ${...}")
     log.debug("Tier 2 (DB global): ${...}")
     log.debug("Tier 3 (Env var): ${System.getenv('UMIG_WEB_ROOT')}")
     log.debug("Tier 4 (Default): ${...}")
     ```
  2. Remember: ConfigurationService has 5-minute cache TTL
- **Resolution**:
  - **DEV**: Update `.env` file and restart containers (`npm run restart:erase`)
  - **UAT/PROD**: Update database configuration and clear cache
  - **Force cache clear**: Restart Confluence service or call `ConfigurationService.refreshConfiguration()`

**Issue**: Environment Variable Not Working (UAT/PROD)

- **Symptom**: UAT/PROD trying to use environment variable instead of database
- **Root Cause**: ConfigurationService Tier 3 (environment variables) is **ONLY** for DEV/LOCAL (line 239: `if (currentEnv == 'LOCAL' || currentEnv == 'DEV')`)
- **Resolution**:
  - **DO NOT** use `.env` files in UAT/PROD
  - Environment variables are intentionally disabled for UAT/PROD
  - Use database configuration (Tier 1) instead
  - Verify `getCurrentEnvironment()` returns correct environment

**Issue**: WebApi Endpoint Not Accessible

- **Symptom**: 404 errors when accessing `/rest/scriptrunner/latest/custom/web/*`
- **Diagnosis**:
  1. Check endpoint registration: Confluence Admin → ScriptRunner → Custom Endpoints
  2. Verify `web` endpoint is registered and enabled
  3. Check file existence:
     ```groovy
     def webRootDir = new File(ConfigurationService.getString('umig.web.root', 'NOT_FOUND'))
     log.info("Web root exists: ${webRootDir.exists()}")
     log.info("Web root path: ${webRootDir.absolutePath}")
     ```
- **Resolution**:
  - Refresh ScriptRunner endpoint cache (Admin UI)
  - Verify file permissions on web directory
  - Check Confluence logs for endpoint registration errors

---

## Migration & Deployment

### Configuration Migration Pattern

**Migration File Structure** (Liquibase):

```sql
-- Migration: 035_us098_phase4_batch1_revised.sql

-- DEV Environment Configurations (env_id = 1)
INSERT INTO system_configuration_scf (scf_id, env_id, scf_key, scf_value, scf_description, scf_is_active)
VALUES
    (gen_random_uuid(), 1, 'email.smtp.auth.enabled', 'false', 'SMTP authentication enabled (DEV: MailHog no auth)', true),
    (gen_random_uuid(), 1, 'email.smtp.starttls.enabled', 'false', 'SMTP STARTTLS enabled (DEV: MailHog no TLS)', true),
    -- ... additional DEV configs

-- UAT Environment Configurations (env_id = 3)
INSERT INTO system_configuration_scf (scf_id, env_id, scf_key, scf_value, scf_description, scf_is_active)
VALUES
    (gen_random_uuid(), 3, 'email.smtp.auth.enabled', 'true', 'SMTP authentication enabled (UAT: Confluence SMTP with auth)', true),
    (gen_random_uuid(), 3, 'email.smtp.starttls.enabled', 'true', 'SMTP STARTTLS enabled (UAT: TLS required)', true),
    -- ... additional UAT configs

-- PROD Environment Configurations (env_id = 2)
INSERT INTO system_configuration_scf (scf_id, env_id, scf_key, scf_value, scf_description, scf_is_active)
VALUES
    (gen_random_uuid(), 2, 'email.smtp.auth.enabled', 'true', 'SMTP authentication enabled (PROD: Confluence SMTP with auth)', true),
    (gen_random_uuid(), 2, 'email.smtp.starttls.enabled', 'true', 'SMTP STARTTLS enabled (PROD: TLS required)', true);
    -- ... additional PROD configs
```

**Migration Validation Queries**:

```sql
-- Verify all configurations inserted
SELECT COUNT(*) FROM system_configuration_scf WHERE scf_key LIKE 'email.smtp%';
-- Expected: 12 (4 configs × 3 environments)

-- Verify environment distribution
SELECT env_id, COUNT(*) as config_count
FROM system_configuration_scf
GROUP BY env_id;
-- Expected: env_id=1 (7), env_id=3 (10), env_id=2 (10)

-- Verify specific configuration values
SELECT env_id, scf_key, scf_value
FROM system_configuration_scf
WHERE scf_key = 'app.api.base.url'
ORDER BY env_id;
-- Expected:
--   env_id=1: http://localhost:8090
--   env_id=3: https://confluence-evx.corp.ubp.ch
--   env_id=2: https://confluence.corp.ubp.ch
```

---

### Case Study: UMIG_WEB_ROOT Migration (US-098 Phase 5)

**Priority**: P0 Critical
**Status**: Resolved (2025-10-06)
**Problem**: UAT/PROD 404 errors for web resources before production migration

#### Executive Summary

Migration of `UMIG_WEB_ROOT` from hardcoded environment variables to ConfigurationService resolved critical deployment gap preventing UAT/PROD CSS, JS, and image resource loading.

**Before Migration**:

- 3 files used `System.getenv('UMIG_WEB_ROOT')` with hardcoded fallbacks
- DEV: Worked via `.env` file (Tier 3)
- UAT/PROD: **BROKEN** - No `.env` file, fell back to non-existent hardcoded paths
- Result: 404 errors for all web resources in UAT/PROD

**After Migration**:

- All files use `ConfigurationService.getString('umig.web.root', default)`
- DEV: Uses `.env` file (Tier 3 fallback) - **NO CHANGE**
- UAT/PROD: Uses database configuration (Tier 1) - **NOW WORKS**
- Result: Proper web resource loading in all environments

#### Migration Database Script (036)

**File**: `local-dev-setup/liquibase/changelogs/036_add_umig_web_root_configuration.sql`

**Configuration Created**:

- UAT and PROD environment-specific configurations
- Value: `/rest/scriptrunner/latest/custom/web` (ScriptRunner endpoint)
- DEV intentionally uses `.env` file (Tier 3) for developer flexibility

```sql
INSERT INTO system_configuration_scf (
    env_id, scf_key, scf_category, scf_value, scf_description,
    scf_is_active, scf_is_system_managed, scf_data_type,
    created_by, updated_by
) VALUES
-- UAT: ScriptRunner custom endpoint
(
    (SELECT env_id FROM environments_env WHERE env_code = 'UAT' LIMIT 1),
    'umig.web.root',
    'infrastructure',
    '/rest/scriptrunner/latest/custom/web',
    'Root path for UMIG web resources (CSS, JS, images) - UAT',
    true, true, 'STRING',
    'US-098-migration', 'US-098-migration'
),
-- PROD: ScriptRunner custom endpoint
(
    (SELECT env_id FROM environments_env WHERE env_code = 'PROD' LIMIT 1),
    'umig.web.root',
    'infrastructure',
    '/rest/scriptrunner/latest/custom/web',
    'Root path for UMIG web resources (CSS, JS, images) - PROD',
    true, true, 'STRING',
    'US-098-migration', 'US-098-migration'
);
```

#### Code Refactoring Examples

**File 1: WebApi.groovy**

Before:

```groovy
def webRootDir = new File(System.getenv('UMIG_WEB_ROOT') ?: '/var/atlassian/application-data/confluence/scripts/umig/web')
```

After:

```groovy
import umig.service.ConfigurationService

def webRootDir = new File(ConfigurationService.getString('umig.web.root', '/var/atlassian/application-data/confluence/scripts/umig/web'))
```

**File 2: stepViewMacro.groovy** (line 79)

Before:

```groovy
def webRoot = System.getenv('UMIG_WEB_ROOT') ?: '/rest/scriptrunner/latest/custom/web'
```

After:

```groovy
import umig.service.ConfigurationService

// US-098 Phase 5: Migrated to ConfigurationService with 4-tier hierarchy
def webRoot = ConfigurationService.getString('umig.web.root', '/rest/scriptrunner/latest/custom/web')
```

**File 3: iterationViewMacro.groovy** (line 16)

Before:

```groovy
def webRoot = System.getenv('UMIG_WEB_ROOT') ?: '/rest/scriptrunner/latest/custom/web'
```

After:

```groovy
import umig.service.ConfigurationService

// US-098 Phase 5: Migrated to ConfigurationService with 4-tier hierarchy
def webRoot = ConfigurationService.getString('umig.web.root', '/rest/scriptrunner/latest/custom/web')
```

#### Why ScriptRunner Endpoint for UAT/PROD?

**Standard Deployment Pattern**:

- No filesystem access required
- Served via `WebApi.groovy` endpoint
- Proper security through Confluence authentication
- High availability through Confluence infrastructure
- No filesystem dependencies
- Centralized configuration management

**Environment-Specific Values**:

- DEV: `/var/atlassian/application-data/confluence/scripts/umig/web` (filesystem via .env)
- UAT: `/rest/scriptrunner/latest/custom/web` (ScriptRunner endpoint via database)
- PROD: `/rest/scriptrunner/latest/custom/web` (ScriptRunner endpoint via database)

#### Deployment Checklist

**Pre-Deployment**:

- [ ] Verify migration file created: `036_add_umig_web_root_configuration.sql`
- [ ] Verify master changelog updated: `db.changelog-master.xml`
- [ ] Code changes reviewed: WebApi.groovy, stepViewMacro.groovy, iterationViewMacro.groovy
- [ ] Documentation updated: `.env.example`

**Deployment Steps (DEV)**:

1. Pull latest code changes
2. Run `npm run restart:erase` (full reset)
3. Verify `.env` file has `UMIG_WEB_ROOT` set
4. Test web resource loading: Check browser console for 404 errors
5. Verify Iteration View loads with CSS
6. Verify Step View loads with CSS

**Deployment Steps (UAT)**:

1. Deploy code to UAT Confluence
2. Run Liquibase migration: `npm run db:migrate`
3. Verify database configuration:
   ```sql
   SELECT * FROM system_configuration_scf WHERE scf_key = 'umig.web.root';
   ```
4. Restart Confluence (or refresh ScriptRunner cache)
5. Test web resource loading in UAT
6. Monitor Confluence logs for errors
7. Verify Iteration View and Step View functionality

**Deployment Steps (PROD)**:

1. **STOP**: UAT must be successfully deployed and tested first
2. Deploy code to PROD Confluence (same as UAT)
3. Run Liquibase migration (same as UAT)
4. Verify database configuration (same as UAT)
5. Restart Confluence (or refresh ScriptRunner cache)
6. Test web resource loading in PROD
7. Monitor Confluence logs for errors
8. Notify stakeholders of successful deployment

**Post-Deployment Verification (All Environments)**:

1. **Web Resources Load**:
   - [ ] CSS files load without 404 errors
   - [ ] JavaScript files load without 404 errors
   - [ ] Iteration View displays correctly
   - [ ] Step View displays correctly

2. **ConfigurationService Works**:
   - [ ] Correct tier being used (DB for UAT/PROD, env var for DEV)
   - [ ] Cache functioning properly
   - [ ] Logs show configuration access

3. **No Regressions**:
   - [ ] Existing functionality unchanged
   - [ ] No new errors in Confluence logs
   - [ ] Performance acceptable

### Post-Deployment Validation

**Health Check Script**:

```groovy
// Execute in ScriptRunner console after deployment

import umig.service.ConfigurationService

println "=== Configuration Service Health Check ==="

// 1. Verify environment detection
String env = ConfigurationService.getCurrentEnvironment()
Integer envId = ConfigurationService.getCurrentEnvironmentId()
println "Environment: ${env} (ID: ${envId})"

// 2. Verify configuration retrieval
String apiUrl = ConfigurationService.getString('app.api.base.url')
println "API URL: ${apiUrl}"

// 3. Verify cache functionality
Map stats = ConfigurationService.getCacheStats()
println "Cache size: ${stats.configCacheSize} configs, ${stats.environmentCacheSize} environments"

// 4. Verify section retrieval
Map smtpSection = ConfigurationService.getSection('email.smtp.')
println "SMTP configurations: ${smtpSection.size()} keys"

println "=== Health Check Complete ==="
```

---

## Appendix: Configuration Schema Reference

### Database Schema

**Table**: `system_configuration_scf`

```sql
CREATE TABLE system_configuration_scf (
    scf_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    env_id INTEGER NOT NULL,
    scf_key VARCHAR(255) NOT NULL,
    scf_value TEXT NOT NULL,
    scf_description TEXT,
    scf_is_active BOOLEAN DEFAULT true NOT NULL,
    scf_security_classification VARCHAR(50) DEFAULT 'PUBLIC',
    scf_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scf_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scf_created_by VARCHAR(255),
    scf_updated_by VARCHAR(255),

    CONSTRAINT fk_scf_environment
        FOREIGN KEY (env_id)
        REFERENCES environments_env(env_id)
        ON DELETE CASCADE,

    CONSTRAINT unique_env_key
        UNIQUE(env_id, scf_key),

    CONSTRAINT check_classification
        CHECK (scf_security_classification IN ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL'))
);

CREATE INDEX idx_scf_env_id ON system_configuration_scf(env_id);
CREATE INDEX idx_scf_key ON system_configuration_scf(scf_key);
CREATE INDEX idx_scf_is_active ON system_configuration_scf(scf_is_active);
```

**Table**: `environments_env`

```sql
CREATE TABLE environments_env (
    env_id INTEGER PRIMARY KEY,
    env_code VARCHAR(50) NOT NULL UNIQUE,
    env_name VARCHAR(255) NOT NULL,
    env_description TEXT,
    env_is_active BOOLEAN DEFAULT true NOT NULL,
    env_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    env_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Standard environments
INSERT INTO environments_env (env_id, env_code, env_name, env_is_active)
VALUES
    (1, 'DEV', 'Development', true),
    (2, 'PROD', 'Production', true),
    (3, 'UAT', 'User Acceptance Testing', true);
```

---

## Quick Reference Card

**Essential Methods**:

```groovy
// Configuration retrieval
ConfigurationService.getString(key, default)
ConfigurationService.getInteger(key, default)
ConfigurationService.getBoolean(key, default)
ConfigurationService.getSection(prefix)

// Environment management
ConfigurationService.getCurrentEnvironment()
ConfigurationService.getCurrentEnvironmentId()
ConfigurationService.resolveEnvironmentId(envCode)
ConfigurationService.environmentExists(envCode)

// Cache management
ConfigurationService.clearCache()
ConfigurationService.refreshConfiguration()
ConfigurationService.getCacheStats()
ConfigurationService.clearExpiredCacheEntries()
```

**Common Patterns**:

```groovy
// Basic usage
String value = ConfigurationService.getString('key', 'default')

// Type-safe usage
Integer timeout = ConfigurationService.getInteger('timeout.ms', 5000)
Boolean enabled = ConfigurationService.getBoolean('feature.enabled', true)

// Section loading
Map config = ConfigurationService.getSection('prefix.')

// Cache refresh after DB update
ConfigurationService.refreshConfiguration()
```

**Performance Targets**:

- Cached access: <50ms
- Uncached access: <200ms
- Cache hit ratio: >85%
- Audit overhead: <5ms

**ADR Compliance Checklist**:

- ✅ ADR-031: Explicit type casting
- ✅ ADR-036: Repository pattern
- ✅ ADR-042: Audit logging
- ✅ ADR-043: INTEGER env_id FK
- ✅ ADR-059: Schema-first code

---

## Appendix A: Enhanced Pattern Matching Examples

### Pattern Matching Algorithm Details

The security classification system uses sophisticated pattern matching to automatically infer the appropriate classification level for configuration keys:

**CONFIDENTIAL Pattern Detection** (Highest Priority):

```groovy
*password*     // Authentication credentials
*secret*       // API secrets
*token*        // Access tokens
*api_key*      // API keys
*private_key*  // Encryption keys
*credential*   // Generic credentials
```

**Examples**:

- `smtp.password` → CONFIDENTIAL (auto-detected from "password" pattern)
- `oauth.client_secret` → CONFIDENTIAL (auto-detected from "secret" pattern)
- `encryption.private_key` → CONFIDENTIAL (auto-detected from "private_key" pattern)

**INTERNAL Pattern Detection** (Medium Priority):

```groovy
*url*       // URLs reveal architecture
*timeout*   // Timeouts reveal capacity
*batch*     // Batch sizes reveal scale
*limit*     // Limits reveal constraints
```

**Examples**:

- `app.base_url` → INTERNAL (auto-detected from "url" pattern)
- `query.timeout_ms` → INTERNAL (auto-detected from "timeout" pattern)
- `import.batch_size` → INTERNAL (auto-detected from "batch" pattern)

**PUBLIC Classification** (Default):

- All configurations NOT matching CONFIDENTIAL or INTERNAL patterns
- Examples: `ui.theme`, `feature.dark_mode_enabled`, `pagination.default_size`

### Classification by Configuration Type

| Configuration Type      | Typical Classification | Reasoning                               |
| ----------------------- | ---------------------- | --------------------------------------- |
| Database credentials    | CONFIDENTIAL           | Pattern: "password", "credential"       |
| API endpoints           | INTERNAL               | Pattern: "url", reveals architecture    |
| Public display names    | PUBLIC                 | No sensitive patterns detected          |
| Feature flags           | PUBLIC                 | Boolean settings, non-sensitive         |
| Performance timeouts    | INTERNAL               | Pattern: "timeout", reveals capacity    |
| Batch processing limits | INTERNAL               | Pattern: "batch"/"limit", reveals scale |

---

## Appendix B: Data Masking Implementation Deep Dive

### Complete Masking Logic

The masking system applies classification-appropriate transformations to protect sensitive values:

```groovy
static String maskSensitiveValue(String value, SecurityClassification classification) {
    if (value == null || classification == SecurityClassification.PUBLIC) {
        return value  // No masking for PUBLIC or null values
    }

    if (classification == SecurityClassification.CONFIDENTIAL) {
        return "[REDACTED]"  // Complete redaction, no hints
    }

    // INTERNAL: Partial masking
    if (value.length() <= 4) {
        return "***"  // Too short to show any characters
    }
    return value.substring(0, 4) + "***"  // First 4 chars + masked remainder
}
```

### Masking Behavior Examples

**CONFIDENTIAL Masking** (Complete Redaction):

```
Input:  "MySecretPassword123!"
Output: "[REDACTED]"
Rationale: Zero information leakage for credentials

Input:  "abc123xyz789" (OAuth secret)
Output: "[REDACTED]"
Rationale: No hints about secret format or length
```

**INTERNAL Masking** (Partial, First 4 Characters):

```
Input:  "https://confluence.company.com"
Output: "http***"
Rationale: Shows protocol type but hides domain

Input:  "30000" (timeout value)
Output: "3000***"
Rationale: Shows scale but hides exact value

Input:  "100" (batch size)
Output: "***"
Rationale: Too short (≤4 chars), complete masking applied
```

**PUBLIC Masking** (No Masking):

```
Input:  "dark" (UI theme)
Output: "dark"
Rationale: Non-sensitive display preference

Input:  "true" (feature flag)
Output: "true"
Rationale: Public configuration, safe to log
```

### Masking in Different Contexts

**Audit Logging**:

- All audit events log masked values according to classification
- Format: `AUDIT: user=admin, key=smtp.password, classification=CONFIDENTIAL, value=[REDACTED], ...`
- Ensures sensitive values never appear in logs

**Debug Output**:

- Cache statistics show masked values for INTERNAL/CONFIDENTIAL
- Example: `Cache entry: app.base_url = htt***`

**Error Messages**:

- Failed retrievals mask attempted values
- Example: `Failed to parse: key=timeout, value=inva***`

---

## Appendix C: Phase 3 Environment Configuration Fix - Debugging Case Study

### Problem Statement

During Phase 3 testing, 21 out of 22 tests in `ConfigurationServiceSecurityTest.groovy` initially failed due to environment configuration mismatches between test setup and service execution.

**Symptoms**:

- All security classification tests failing
- All sensitive data protection tests failing
- Most audit logging tests failing
- Error pattern: "Configuration not found" despite test data insertion

### Root Cause Analysis

**Initial Investigation**:

1. Tests were creating configuration records with `env_id=1` (DEV environment)
2. Test assertions were checking for these configurations via `ConfigurationService.getString()`
3. All retrieval attempts were returning `null` or default values

**Deeper Analysis**:
`ConfigurationService.getCurrentEnvironment()` was returning "PROD" (default) when no environment was explicitly set, resulting in:

- Test data inserted with `env_id=1` (DEV)
- Service querying with `env_id=2` (PROD)
- **Environment ID Mismatch**: Service couldn't find test configurations

**Environment Resolution Logic**:

```groovy
static String getCurrentEnvironment() {
    // Priority 1: System property (highest)
    String envFromProperty = System.getProperty('umig.environment')
    if (envFromProperty) return envFromProperty

    // Priority 2: Environment variable
    String envFromVar = System.getenv('UMIG_ENVIRONMENT')
    if (envFromVar) return envFromVar

    // Priority 3: Default (PROD for fail-safe security)
    return 'PROD'
}
```

**Problem**: Tests weren't setting `umig.environment` system property, so service defaulted to PROD.

### Debugging Methodology

**Step 1: Hypothesis Formation**

- Hypothesis: Environment mismatch causing configuration lookup failures
- Validation: Added logging to show which env_id was being queried
- Result: Confirmed service was querying env_id=2 (PROD) instead of env_id=1 (DEV)

**Step 2: Test Isolation Analysis**

- Reviewed ADR-036 requirements for self-contained testing
- Identified need for explicit environment configuration in tests
- Determined that tests must set environment BEFORE any ConfigurationService calls

**Step 3: Solution Design**

- Pattern: Wrap test execution with environment property management
- Use try-finally to ensure cleanup (prevent cross-test contamination)
- Set property at very beginning of test method (before any service calls)

### Solution Implementation

**Fix Pattern Applied to 21 Test Methods**:

```groovy
void testSecurityClassification_ThreeLevelSystem() {
    try {
        // CRITICAL: Set DEV environment BEFORE any ConfigurationService calls
        System.setProperty('umig.environment', 'DEV')

        // Now test data (env_id=1) matches service query (env_id=1)
        def publicConfig = createTestConfiguration([
            scf_key: 'ui.theme',
            scf_value: 'dark',
            scf_classification: 'PUBLIC',
            env_id: 1  // DEV
        ])

        // Service now queries env_id=1, finds configuration
        assert ConfigurationService.getClassification('ui.theme') == SecurityClassification.PUBLIC

    } finally {
        // Always clear in finally block to prevent cross-test contamination
        System.clearProperty('umig.environment')
    }
}
```

**Methods Fixed** (21 total in ConfigurationServiceSecurityTest.groovy):

**Security Classification Tests** (5 methods):

- `testSecurityClassification_ThreeLevelSystem()`
- `testSecurityClassification_AutomaticInference()`
- `testSecurityClassification_PublicByDefault()`
- `testSecurityClassification_ConfidentialPasswords()`
- `testSecurityClassification_InternalUrls()`

**Sensitive Data Protection Tests** (6 methods):

- `testSensitiveDataProtection_PasswordMasking()`
- `testSensitiveDataProtection_ConfidentialRedaction()`
- `testSensitiveDataProtection_InternalPartialMasking()`
- `testSensitiveDataProtection_PublicNoMasking()`
- `testSensitiveDataProtection_ClassificationEnforcement()`
- `testSensitiveDataProtection_EdgeCases()`

**Audit Logging Tests** (7 methods):

- `testAuditLogging_BasicEventCapture()`
- `testAuditLogging_EventTypeRecording()`
- `testAuditLogging_MaskedValueInAudit()`
- `testAuditLogging_UserContextCapture()`
- `testAuditLogging_PerformanceOverhead()`
- `testAuditLogging_ConcurrentAccess()`
- `testAuditLogging_SectionRetrieval()` (\*)

**Pattern Matching Tests** (3 methods):

- `testPatternMatching_PasswordDetection()`
- `testPatternMatching_SecretDetection()`
- `testPatternMatching_UrlDetection()`

(\*) One test required additional fix beyond environment configuration (see section retrieval fix below)

### Additional Fix Required: Test Bug - Audit Logging Section Retrieval

**Problem**: `testAuditLogging_SectionRetrieval()` still failed after environment fix.

**Error**:

```
Expected: audit log containing both keys smtp.host and smtp.port
Actual: audit log contained neither key (found only 'host', 'port')
```

**Root Cause**:
`ConfigurationService.getSection()` returns keys with section prefix stripped:

```groovy
// getSection() implementation (line 290)
sectionResult.put(key.substring(sectionPrefix.length()), value)
// Input:  "smtp.host" → Output: "host"
// Input:  "smtp.port" → Output: "port"
```

**Solution**: Fix test expectation to match actual behavior:

```groovy
// Before (lines 829-833):
assert auditMessage.contains('smtp.host')
assert auditMessage.contains('smtp.port')

// After (lines 829-833):
assert auditMessage.contains('host')  // Prefix already stripped
assert auditMessage.contains('port')  // Prefix already stripped
```

### Impact Summary

**Tests Fixed**: 21 tests via environment configuration pattern + 1 test via expectation correction = **22/22 security tests now passing**

**Files Modified**:

- `ConfigurationServiceSecurityTest.groovy` (lines 280-945): Environment configuration wrapper added to 21 test methods
- `ConfigurationServiceSecurityTest.groovy` (lines 829-833): Test assertion corrected for section retrieval behavior

**ADR Compliance**:

- **ADR-036 (Self-Contained Testing)**: Maintained through try-finally cleanup pattern
- **ADR-059 (Schema Authority)**: Test adapted to service behavior, not vice versa

### Lessons Learned for Future Reference

**Test Isolation Best Practices**:

1. **Always set environment explicitly** in tests that use `ConfigurationService`
2. **Use try-finally pattern** to guarantee cleanup
3. **Set environment BEFORE any service calls** to avoid race conditions
4. **Verify service behavior** rather than assuming API contracts

**ADR-036 Compliance Pattern**:

```groovy
// Standard pattern for ConfigurationService tests
void testMethodName() {
    try {
        System.setProperty('umig.environment', 'DEV')
        // Test execution logic
    } finally {
        System.clearProperty('umig.environment')
        // Optional: additional cleanup
    }
}
```

**Debugging Approach Validated**:

1. **Hypothesize** based on symptoms
2. **Validate** through logging and inspection
3. **Isolate** the minimal reproducible case
4. **Design** solution respecting ADRs
5. **Apply** systematically across all affected tests
6. **Verify** with full test suite execution

**Key Takeaway**: Environment configuration is CRITICAL for test isolation when testing environment-aware services. Always explicitly set environment properties in tests to prevent default values from causing unexpected behavior.

---

## Related Documentation

- **Operations Guide**: [Configuration Management Deployment](../../operations/Configuration-Management-Deployment.md)
- **Sprint Completion**: [US-098 Configuration Management System](../roadmap/sprint8/US-098-Configuration-Management-System-Sprint-Completion.md)
- **ADR References**: ADR-031 (Type Safety), ADR-036 (Repository Pattern), ADR-042 (Audit Logging), ADR-043 (FK Compliance), ADR-059 (Schema-First)
- **Source Files**: `ConfigurationService.groovy`, Migration 036 (`036_add_umig_web_root_configuration.sql`)
- **Consolidated From**: `UMIG-WEB-ROOT-Configuration-Guide.md` (Sprint 8 roadmap, 2025-10-06)

---

_Last Updated: 2025-10-06_
_Version: 1.2 (Production)_
_Document Status: Authoritative technical reference with consolidated web root migration case study_
