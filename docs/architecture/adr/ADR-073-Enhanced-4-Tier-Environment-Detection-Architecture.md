# ADR-073: Enhanced 4-Tier Hybrid Environment Detection Architecture

## Status

**Status**: Proposed
**Date**: 2025-10-07
**Author**: System Architecture Team
**Technical Story**: Sprint 8 - Environment Detection & Configuration Management Enhancement
**Related User Stories**: US-101, US-098 (Configuration Management System)
**Incident**: UAT environment mis-detection showing `localhost:8090` instead of `https://confluence-evx.corp.ubp.ch`

## Context and Problem Statement

UMIG's environment detection system experienced a critical failure in UAT where the application displayed development URLs (`localhost:8090`) instead of production URLs (`https://confluence-evx.corp.ubp.ch`). This incident revealed fundamental fragility in hostname pattern matching and a missed opportunity for intelligent self-discovery.

### Incident Analysis

**What Happened:**

- **Environment**: UAT (User Acceptance Testing)
- **Observed**: StepView UI displayed `localhost:8090` URLs in navigation and email notifications
- **Expected**: `https://confluence-evx.corp.ubp.ch` URLs
- **Root Cause**: Missing 'evx' hostname pattern in `detectEnvironment()` method

**Immediate Impact:**

- User confusion with incorrect URLs
- Email notifications with wrong links
- Cross-environment navigation failures
- Loss of confidence in environment detection reliability

**Emergency Fix Applied:**

```groovy
// Emergency pattern addition
if (hostname.contains('evx')) {
    return 'UAT'
}
```

### Core Problems with Current Approach

#### 1. Pattern Matching Fragility

The current `ConfigurationService.detectEnvironment()` relies exclusively on hostname pattern matching:

```groovy
String detectEnvironment() {
    String hostname = getHostname()

    if (hostname.contains('localhost') || hostname.contains('127.0.0.1')) {
        return 'DEV'
    } else if (hostname.contains('ev1')) {
        return 'EV1'
    } else if (hostname.contains('ev2')) {
        return 'EV2'
    } else if (hostname.contains('prod')) {
        return 'PROD'
    }

    return 'PROD' // Default fallback
}
```

**Weaknesses:**

- Requires code changes for every new environment or hostname variant
- No validation that detected environment matches configuration
- Easy to miss patterns (as demonstrated with 'evx')
- Tight coupling between detection logic and environment names
- No self-discovery capability despite having configuration data

#### 2. Configuration Duplication

US-098 introduced comprehensive environment configuration in the database:

```sql
SELECT e.env_code, scf.scf_key, scf.scf_value
FROM system_configuration_scf scf
JOIN environments_env e ON scf.env_id = e.env_id
WHERE scf.scf_key = 'stepview.confluence.base.url'
  AND scf.scf_is_active = true
```

**Example Data:**

```
ENV_CODE | SCF_KEY                          | SCF_VALUE
---------|----------------------------------|----------------------------------
DEV      | stepview.confluence.base.url     | http://localhost:8090
EV1      | stepview.confluence.base.url     | https://confluence-ev1.corp.ubp.ch
EV2      | stepview.confluence.base.url     | https://confluence-ev2.corp.ubp.ch
UAT      | stepview.confluence.base.url     | https://confluence-evx.corp.ubp.ch
PROD     | stepview.confluence.base.url     | https://confluence-prod.corp.ubp.ch
```

**Problem**: Environment URLs are stored in database but not used for environment detection, leading to:

- Duplication of environment knowledge
- Risk of configuration-code mismatch
- Missed opportunity for self-discovery

#### 3. No Override Mechanism

**Scenarios Requiring Override:**

- Emergency environment switching during incidents
- Testing specific environment behavior in development
- Disaster recovery scenarios
- Blue-green deployment validation

**Current State**: No way to override detected environment without code changes

### Decision Drivers

- **Self-Discovery**: System should use existing configuration data to detect environment
- **Override Capability**: Support emergency and testing overrides
- **Resilience**: Maintain bootstrap capability when database is unavailable
- **Zero Code Changes**: Adding new environments should not require code modifications
- **Fail-Safe**: Always have a deterministic fallback strategy
- **Performance**: Minimize detection overhead on every request
- **Maintainability**: Reduce coupling between detection logic and environment definitions
- **Observability**: Clear logging of detection process and decisions

## Considered Options

### Option 1: Pure System Property Override

**Description**: Use only system properties (`-Dumig.environment=UAT`) or environment variables for environment detection.

**Implementation:**

```groovy
String detectEnvironment() {
    return System.getProperty('umig.environment') ?:
           System.getenv('UMIG_ENVIRONMENT') ?:
           'PROD'
}
```

**Pros:**

- Extremely simple implementation
- Explicit environment control
- Fast execution (no database queries)
- Easy to test and debug

**Cons:**

- Loses self-discovery capability
- Requires manual configuration per deployment
- No validation against actual Confluence URL
- Deployment configuration overhead
- Human error risk in multi-environment deployments

### Option 2: Pure Database Lookup (Self-Discovery)

**Description**: Always detect environment by comparing current Confluence base URL against database configuration.

**Implementation:**

```groovy
String detectEnvironment() {
    String baseUrl = SettingsManager.getGlobalSettings().getBaseUrl()
    String normalized = normalizeUrl(baseUrl)

    return DatabaseUtil.withSql { sql ->
        sql.firstRow('''
            SELECT e.env_code
            FROM system_configuration_scf scf
            JOIN environments_env e ON scf.env_id = e.env_id
            WHERE scf.scf_key = 'stepview.confluence.base.url'
              AND LOWER(scf.scf_value) = LOWER(?)
        ''', [normalized])?.env_code ?: 'PROD'
    }
}
```

**Pros:**

- Perfect self-discovery
- Zero configuration files needed
- Automatic adaptation to new environments
- Single source of truth (database)
- No code changes for new environments

**Cons:**

- Requires database connectivity at startup
- Bootstrap problem: cannot connect to database until environment known
- No emergency override capability
- Performance overhead on every detection call
- Complex error handling for database failures

### Option 3: Pattern Matching Only (Current - Improved)

**Description**: Enhance current pattern matching with comprehensive pattern set and better fallback.

**Implementation:**

```groovy
String detectEnvironment() {
    String hostname = getHostname()

    // Comprehensive pattern set
    Map<String, List<String>> patterns = [
        'DEV': ['localhost', '127.0.0.1', 'dev', 'local'],
        'EV1': ['ev1', 'test1'],
        'EV2': ['ev2', 'test2'],
        'UAT': ['evx', 'uat', 'staging'],
        'PROD': ['prod', 'production']
    ]

    for (entry in patterns) {
        if (entry.value.any { hostname.contains(it) }) {
            return entry.key
        }
    }

    return 'PROD' // Default
}
```

**Pros:**

- No database dependency
- Fast execution
- Bootstrap-safe
- Easy to understand

**Cons:**

- Still requires code changes for new patterns
- Cannot validate detection accuracy
- Fragile pattern matching
- No self-discovery
- Configuration duplication persists

### Option 4: Enhanced 4-Tier Hybrid Architecture (Recommended)

**Description**: Intelligent tiered approach combining explicit override, self-discovery, pattern resilience, and fail-safe defaults.

**Implementation:**

```groovy
String detectEnvironment() {
    // Tier 1: System Property (explicit override - highest priority)
    String propertyEnv = System.getProperty('umig.environment')
    if (propertyEnv) {
        log.info("Environment detected via system property: ${propertyEnv}")
        return propertyEnv
    }

    // Tier 2: Environment Variable (container/deployment override)
    String envVar = System.getenv('UMIG_ENVIRONMENT')
    if (envVar) {
        log.info("Environment detected via environment variable: ${envVar}")
        return envVar
    }

    // Tier 3A: Database Self-Discovery (primary detection)
    try {
        String baseUrl = SettingsManager.getGlobalSettings().getBaseUrl()
        String normalized = normalizeUrl(baseUrl)

        String dbEnv = DatabaseUtil.withSql { sql ->
            sql.firstRow('''
                SELECT e.env_code
                FROM system_configuration_scf scf
                JOIN environments_env e ON scf.env_id = e.env_id
                WHERE scf.scf_key = 'stepview.confluence.base.url'
                  AND LOWER(scf.scf_value) = LOWER(?)
            ''', [normalized])?.env_code
        }

        if (dbEnv) {
            log.info("Environment detected via database lookup: ${dbEnv} (URL: ${baseUrl})")
            return dbEnv
        }
    } catch (Exception e) {
        log.warn("Database environment detection failed, falling back to pattern matching", e)
    }

    // Tier 3B: Pattern Matching (bootstrap resilience)
    String hostname = getHostname()
    String patternEnv = detectByPattern(hostname)
    log.info("Environment detected via pattern matching: ${patternEnv} (hostname: ${hostname})")

    // Tier 4: Fail-safe default
    return patternEnv ?: 'PROD'
}

private String normalizeUrl(String url) {
    if (!url) return null

    // Lowercase for case-insensitive comparison
    String normalized = url.toLowerCase()

    // Remove trailing slashes
    normalized = normalized.replaceAll(/\/+$/, '')

    // Remove default ports
    normalized = normalized.replaceAll(/:80($|\/)/, '$1')
    normalized = normalized.replaceAll(/:443($|\/)/, '$1')

    // Remove www prefix
    normalized = normalized.replaceAll(/\/\/www\./, '//')

    return normalized
}
```

**Pros:**

- **Emergency Override**: Tier 1-2 enable immediate environment switching
- **Self-Discovery**: Tier 3A uses database configuration for automatic detection
- **Bootstrap Safety**: Tier 3B pattern matching when database unavailable
- **Zero Code Changes**: New environments only need database configuration
- **Validation**: Detection validated against actual configuration
- **Fail-Safe**: Always has deterministic fallback
- **Performance**: Can be cached after first detection

**Cons:**

- More complex implementation with 4 tiers
- More testing scenarios required
- Potential confusion about precedence order
- Need comprehensive documentation

## Decision Outcome

Chosen option: **"Enhanced 4-Tier Hybrid Architecture"** (Option 4), because it combines the best aspects of all approaches while addressing the core problems:

1. **Solves Emergency Override**: Tiers 1-2 provide immediate override capability
2. **Solves Self-Discovery**: Tier 3A uses existing database configuration
3. **Solves Fragility**: New environments only need database entries
4. **Solves Bootstrap**: Tier 3B pattern matching when database unavailable
5. **Solves Configuration Duplication**: Database is primary source of truth

### Implementation Details

#### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Environment Detection                     │
│                    4-Tier Hierarchy                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌────────────────────────────────────────┐
        │   Tier 1: System Property Override     │
        │   -Dumig.environment=UAT               │
        │   Priority: HIGHEST (Emergency)        │
        └────────────────────────────────────────┘
                              │
                        ┌─────┴──────┐
                        │  Found?    │
                        └─────┬──────┘
                              │ No
                              ▼
        ┌────────────────────────────────────────┐
        │   Tier 2: Environment Variable         │
        │   UMIG_ENVIRONMENT=UAT                 │
        │   Priority: HIGH (Deployment)          │
        └────────────────────────────────────────┘
                              │
                        ┌─────┴──────┐
                        │  Found?    │
                        └─────┬──────┘
                              │ No
                              ▼
        ┌────────────────────────────────────────┐
        │   Tier 3A: Database Self-Discovery     │
        │   Compare SettingsManager.baseUrl      │
        │   with system_configuration_scf        │
        │   Priority: NORMAL (Self-Discovery)    │
        └────────────────────────────────────────┘
                              │
                        ┌─────┴──────┐
                        │  Found &   │
                        │  Valid?    │
                        └─────┬──────┘
                              │ No
                              ▼
        ┌────────────────────────────────────────┐
        │   Tier 3B: Pattern Matching            │
        │   Hostname pattern fallback            │
        │   Priority: LOW (Bootstrap)            │
        └────────────────────────────────────────┘
                              │
                              ▼
        ┌────────────────────────────────────────┐
        │   Tier 4: Fail-Safe Default            │
        │   Return PROD                          │
        │   Priority: FALLBACK (Safety)          │
        └────────────────────────────────────────┘
```

#### URL Normalization Strategy

**Purpose**: Enable case-insensitive, format-tolerant URL comparison for Tier 3A self-discovery.

**Normalization Rules:**

1. Convert to lowercase
2. Remove trailing slashes
3. Remove default ports (`:80`, `:443`)
4. Remove `www.` prefix
5. Preserve protocol, hostname, and path structure

**Examples:**

```
Input:   https://Confluence-EVX.corp.ubp.ch/
Output:  https://confluence-evx.corp.ubp.ch

Input:   http://localhost:8090/
Output:  http://localhost:8090

Input:   https://www.confluence-prod.corp.ubp.ch:443/wiki
Output:  https://confluence-prod.corp.ubp.ch/wiki
```

#### Configuration Service Enhancement

```groovy
package umig.services

import com.atlassian.sal.api.pluginsettings.PluginSettingsFactory
import com.atlassian.confluence.setup.settings.SettingsManager
import umig.utils.DatabaseUtil
import org.apache.log4j.Logger

class ConfigurationService {
    private static final Logger log = Logger.getLogger(ConfigurationService)

    // Cache environment detection (5-minute TTL)
    private static String cachedEnvironment = null
    private static long cacheTimestamp = 0
    private static final long CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

    /**
     * Detect current environment using 4-tier hierarchy:
     * 1. System Property (-Dumig.environment=UAT) - Emergency override
     * 2. Environment Variable (UMIG_ENVIRONMENT) - Deployment override
     * 3A. Database Self-Discovery - Primary detection
     * 3B. Pattern Matching - Bootstrap fallback
     * 4. Default to PROD - Fail-safe
     *
     * @return Environment code (DEV, EV1, EV2, UAT, PROD)
     */
    static String detectEnvironment() {
        // Check cache validity
        long now = System.currentTimeMillis()
        if (cachedEnvironment && (now - cacheTimestamp) < CACHE_TTL_MS) {
            log.debug("Returning cached environment: ${cachedEnvironment}")
            return cachedEnvironment
        }

        String detectedEnv = detectEnvironmentInternal()

        // Update cache
        cachedEnvironment = detectedEnv
        cacheTimestamp = now

        log.info("Environment detection complete: ${detectedEnv}")
        return detectedEnv
    }

    private static String detectEnvironmentInternal() {
        // Tier 1: System Property (highest priority - emergency override)
        String propertyEnv = System.getProperty('umig.environment')
        if (propertyEnv) {
            String normalized = propertyEnv.toUpperCase()
            log.info("[Tier 1] Environment detected via system property: ${normalized}")
            return normalized
        }

        // Tier 2: Environment Variable (deployment override)
        String envVar = System.getenv('UMIG_ENVIRONMENT')
        if (envVar) {
            String normalized = envVar.toUpperCase()
            log.info("[Tier 2] Environment detected via environment variable: ${normalized}")
            return normalized
        }

        // Tier 3A: Database Self-Discovery (primary detection)
        try {
            def settingsManager = getSettingsManager()
            String baseUrl = settingsManager.getGlobalSettings().getBaseUrl()

            if (baseUrl) {
                String normalized = normalizeUrl(baseUrl)
                log.debug("[Tier 3A] Attempting database lookup for URL: ${normalized}")

                String dbEnv = DatabaseUtil.withSql { sql ->
                    def row = sql.firstRow('''
                        SELECT e.env_code
                        FROM system_configuration_scf scf
                        JOIN environments_env e ON scf.env_id = e.env_id
                        WHERE scf.scf_key = 'stepview.confluence.base.url'
                          AND scf.scf_is_active = true
                          AND LOWER(scf.scf_value) = LOWER(?)
                    ''', [normalized])

                    return row?.env_code as String
                }

                if (dbEnv) {
                    log.info("[Tier 3A] Environment detected via database self-discovery: ${dbEnv} (URL: ${baseUrl})")
                    return dbEnv
                } else {
                    log.warn("[Tier 3A] No database match found for URL: ${baseUrl}")
                }
            } else {
                log.warn("[Tier 3A] Base URL from SettingsManager is null")
            }
        } catch (Exception e) {
            log.error("[Tier 3A] Database self-discovery failed, falling back to pattern matching", e)
        }

        // Tier 3B: Pattern Matching (bootstrap fallback)
        String hostname = getHostname()
        String patternEnv = detectByPattern(hostname)
        log.info("[Tier 3B] Environment detected via pattern matching: ${patternEnv} (hostname: ${hostname})")

        // Tier 4: Fail-safe default
        return patternEnv ?: 'PROD'
    }

    /**
     * Normalize URL for case-insensitive, format-tolerant comparison
     *
     * @param url Original URL string
     * @return Normalized URL (lowercase, no trailing slash, no default ports, no www)
     */
    static String normalizeUrl(String url) {
        if (!url) return null

        String normalized = url.toLowerCase()

        // Remove trailing slashes
        normalized = normalized.replaceAll(/\/+$/, '')

        // Remove default ports
        normalized = normalized.replaceAll(/:80($|\/)/, '$1')
        normalized = normalized.replaceAll(/:443($|\/)/, '$1')

        // Remove www prefix
        normalized = normalized.replaceAll(/^(https?:\/\/)www\./, '$1')

        return normalized
    }

    /**
     * Pattern-based environment detection (bootstrap fallback)
     *
     * @param hostname Hostname to analyze
     * @return Environment code or null if no pattern matches
     */
    private static String detectByPattern(String hostname) {
        if (!hostname) return null

        String lower = hostname.toLowerCase()

        // DEV patterns
        if (lower.contains('localhost') ||
            lower.contains('127.0.0.1') ||
            lower.contains('dev') ||
            lower.contains('local')) {
            return 'DEV'
        }

        // EV1 patterns
        if (lower.contains('ev1') || lower.contains('test1')) {
            return 'EV1'
        }

        // EV2 patterns
        if (lower.contains('ev2') || lower.contains('test2')) {
            return 'EV2'
        }

        // UAT patterns
        if (lower.contains('evx') ||
            lower.contains('uat') ||
            lower.contains('staging')) {
            return 'UAT'
        }

        // PROD patterns
        if (lower.contains('prod') || lower.contains('production')) {
            return 'PROD'
        }

        // No pattern matched
        return null
    }

    /**
     * Get hostname from Confluence SettingsManager
     *
     * @return Hostname string or 'unknown' if unavailable
     */
    private static String getHostname() {
        try {
            def settingsManager = getSettingsManager()
            String baseUrl = settingsManager.getGlobalSettings().getBaseUrl()

            if (baseUrl) {
                URL url = new URL(baseUrl)
                return url.getHost()
            }
        } catch (Exception e) {
            log.error("Failed to get hostname from SettingsManager", e)
        }

        return 'unknown'
    }

    /**
     * Get SettingsManager instance (to be implemented based on ScriptRunner context)
     *
     * @return SettingsManager instance
     */
    private static SettingsManager getSettingsManager() {
        // Implementation depends on ScriptRunner context
        // May use ComponentLocator or injection
        throw new UnsupportedOperationException("SettingsManager retrieval not yet implemented")
    }

    /**
     * Clear cached environment (for testing or manual override)
     */
    static void clearCache() {
        cachedEnvironment = null
        cacheTimestamp = 0
        log.info("Environment detection cache cleared")
    }
}
```

#### URL Construction Service Integration

**File**: `src/groovy/umig/utils/UrlConstructionService.groovy`

**Enhancement**: Integrate 4-tier environment detection:

```groovy
class UrlConstructionService {
    // Existing implementation...

    private static String getEnvironmentCode() {
        // Use enhanced ConfigurationService
        return ConfigurationService.detectEnvironment()
    }

    // Rest of implementation unchanged...
}
```

### Positive Consequences

1. **Self-Discovery Excellence**
   - Zero code changes for new environments
   - Database configuration is single source of truth
   - Automatic adaptation to environment changes

2. **Emergency Override Capability**
   - Tier 1: System property for immediate override (`-Dumig.environment=UAT`)
   - Tier 2: Environment variable for container orchestration (`UMIG_ENVIRONMENT=PROD`)
   - No code deployment required for emergency switching

3. **Bootstrap Resilience**
   - Pattern matching fallback when database unavailable
   - Graceful degradation during startup
   - No hard dependency on database connectivity

4. **Configuration Consolidation**
   - Eliminates duplication between code patterns and database configuration
   - Single source of truth in `system_configuration_scf` table
   - Consistent with US-098 Configuration Management System

5. **Fail-Safe Architecture**
   - Always has deterministic environment (defaults to PROD)
   - Multiple validation layers prevent mis-detection
   - Comprehensive error handling and logging

6. **Performance Optimization**
   - 5-minute cache reduces detection overhead
   - Database query only on first access or cache expiration
   - Pattern matching fallback is lightweight

7. **Maintainability**
   - Clear tier precedence documentation
   - Comprehensive logging for debugging
   - Testable architecture with clear boundaries

8. **Validation Confidence**
   - Detection result validated against actual configuration
   - Mismatches detected and logged
   - Audit trail of detection process

### Negative Consequences

1. **Implementation Complexity**
   - 4 tiers require comprehensive testing
   - More code to maintain than simple pattern matching
   - Potential confusion about precedence order

2. **Testing Overhead**
   - Must test all 4 tiers independently
   - Must test tier transitions and fallbacks
   - Need integration tests for database interactions

3. **Performance Consideration**
   - Database query adds latency (mitigated by caching)
   - URL normalization processing overhead
   - Cache invalidation complexity

4. **Documentation Burden**
   - Operators need to understand 4-tier hierarchy
   - Deployment guides require updates
   - Troubleshooting procedures more complex

### Mitigation Strategies

**For Complexity:**

- Comprehensive inline documentation
- Clear tier precedence diagram
- Dedicated troubleshooting guide

**For Testing:**

- Unit tests for each tier independently
- Integration tests for tier transitions
- Mock database for Tier 3A testing

**For Performance:**

- 5-minute cache TTL (configurable)
- Async cache warming on startup
- Metrics for detection latency

**For Documentation:**

- Deployment checklist updates
- Operator runbook creation
- Health check endpoint for environment verification

## Validation

### Functional Validation

#### Success Criteria

1. **Tier 1 Validation**: System property override works correctly

   ```bash
   # Start Confluence with property
   -Dumig.environment=UAT

   # Verify detection
   Expected: UAT (regardless of database or hostname)
   ```

2. **Tier 2 Validation**: Environment variable override works correctly

   ```bash
   # Set environment variable
   export UMIG_ENVIRONMENT=EV1

   # Verify detection
   Expected: EV1 (if no system property set)
   ```

3. **Tier 3A Validation**: Database self-discovery works correctly

   ```sql
   -- Given database configuration
   INSERT INTO system_configuration_scf (env_id, scf_key, scf_value)
   VALUES
     ((SELECT env_id FROM environments_env WHERE env_code = 'UAT'),
      'stepview.confluence.base.url',
      'https://confluence-evx.corp.ubp.ch');

   -- When SettingsManager returns 'https://confluence-evx.corp.ubp.ch'
   -- Then detectEnvironment() returns 'UAT'
   ```

4. **Tier 3B Validation**: Pattern matching fallback works correctly

   ```groovy
   // When database unavailable or no match
   // And hostname contains 'evx'
   // Then detectEnvironment() returns 'UAT'
   ```

5. **Tier 4 Validation**: Default fallback works correctly

   ```groovy
   // When all tiers fail
   // Then detectEnvironment() returns 'PROD'
   ```

6. **URL Normalization Validation**: Case-insensitive comparison works
   ```groovy
   assert normalizeUrl('HTTPS://Confluence-EVX.corp.ubp.ch/') ==
          normalizeUrl('https://confluence-evx.corp.ubp.ch')
   ```

### Performance Validation

**Targets:**

- First detection (cold): <500ms (includes database query)
- Cached detection: <5ms (cache lookup only)
- Pattern fallback: <50ms (no database query)
- Cache hit rate: >95% (with 5-minute TTL)

**Measurement:**

```groovy
long start = System.currentTimeMillis()
String env = ConfigurationService.detectEnvironment()
long elapsed = System.currentTimeMillis() - start

log.info("Environment detection took ${elapsed}ms: ${env}")
```

### Integration Validation

**UrlConstructionService Integration:**

- Verify UrlConstructionService uses ConfigurationService.detectEnvironment()
- Test URL construction in all environments (DEV, EV1, EV2, UAT, PROD)
- Validate email notification URLs contain correct environment URLs

**US-098 Configuration Management Integration:**

- Verify environment detection uses `system_configuration_scf` table
- Test configuration changes reflect in environment detection
- Validate environment code consistency

### Security Validation

**Override Security:**

- Verify system property override requires server restart (not user-modifiable)
- Confirm environment variable override requires deployment permissions
- Test tier precedence prevents unauthorized environment switching

### Regression Testing

**Prevent Recurrence:**

- Test case for 'evx' hostname pattern
- Test case for case-insensitive URL matching
- Test case for URL variations (trailing slashes, default ports, www prefix)
- Test case for new environment addition without code changes

## Testing Strategy

### Unit Tests

```groovy
class ConfigurationServiceTest extends GroovyTestCase {

    void testTier1SystemPropertyOverride() {
        System.setProperty('umig.environment', 'UAT')
        assert ConfigurationService.detectEnvironment() == 'UAT'
        System.clearProperty('umig.environment')
    }

    void testTier2EnvironmentVariableOverride() {
        // Mock environment variable
        assert ConfigurationService.detectEnvironment() == 'EV1'
    }

    void testTier3ADatabaseSelfDiscovery() {
        // Mock SettingsManager baseUrl
        // Mock database query result
        assert ConfigurationService.detectEnvironment() == 'UAT'
    }

    void testTier3BPatternMatching() {
        // Mock database failure
        // Mock hostname containing 'evx'
        assert ConfigurationService.detectEnvironment() == 'UAT'
    }

    void testTier4DefaultFallback() {
        // Mock all tier failures
        assert ConfigurationService.detectEnvironment() == 'PROD'
    }

    void testUrlNormalization() {
        assert ConfigurationService.normalizeUrl('HTTPS://Confluence-EVX.corp.ubp.ch/') ==
               'https://confluence-evx.corp.ubp.ch'

        assert ConfigurationService.normalizeUrl('http://localhost:8090/') ==
               'http://localhost:8090'

        assert ConfigurationService.normalizeUrl('https://www.prod.example.com:443/wiki/') ==
               'https://prod.example.com/wiki'
    }

    void testCacheInvalidation() {
        ConfigurationService.clearCache()
        // Verify next detection hits database
    }
}
```

### Integration Tests

```groovy
class EnvironmentDetectionIntegrationTest extends GroovyTestCase {

    void testDatabaseSelfDiscoveryWithRealDatabase() {
        // Use real database connection
        // Insert test configuration
        // Verify detection matches
    }

    void testUrlConstructionServiceIntegration() {
        // Verify UrlConstructionService uses ConfigurationService
        // Test URL generation in each environment
    }

    void testNewEnvironmentWithoutCodeChanges() {
        // Add new environment to database only
        // Verify detection works without code deployment
    }
}
```

### Manual Testing Checklist

- [ ] UAT environment correctly detected with 'evx' hostname
- [ ] System property override works (`-Dumig.environment=UAT`)
- [ ] Environment variable override works (`UMIG_ENVIRONMENT=EV1`)
- [ ] Database self-discovery works in all environments
- [ ] Pattern matching fallback works when database unavailable
- [ ] Default fallback to PROD works when all tiers fail
- [ ] URL normalization handles case-insensitive comparison
- [ ] Cache reduces detection overhead
- [ ] Email notifications contain correct environment URLs
- [ ] StepView URLs show correct environment
- [ ] New environment addition works without code changes

## Implementation Timeline

### Phase 1: Foundation (Week 1)

**Deliverables:**

1. Implement `ConfigurationService.normalizeUrl()` method
2. Implement Tier 1 (System Property) detection
3. Implement Tier 2 (Environment Variable) detection
4. Implement basic caching mechanism
5. Unit tests for Tier 1-2

**Acceptance Criteria:**

- [ ] System property override works
- [ ] Environment variable override works
- [ ] Cache reduces detection overhead
- [ ] All unit tests pass

### Phase 2: Self-Discovery (Week 2)

**Deliverables:**

1. Implement Tier 3A (Database Self-Discovery)
2. Integrate with `system_configuration_scf` table
3. URL normalization with comprehensive rules
4. Integration tests with real database
5. Performance benchmarking

**Acceptance Criteria:**

- [ ] Database lookup works correctly
- [ ] URL normalization handles all variations
- [ ] Detection matches database configuration
- [ ] Performance <500ms cold, <5ms cached
- [ ] Integration tests pass

### Phase 3: Resilience (Week 3)

**Deliverables:**

1. Implement Tier 3B (Pattern Matching fallback)
2. Implement Tier 4 (Default fallback)
3. Error handling and logging
4. Health check endpoint
5. Comprehensive testing

**Acceptance Criteria:**

- [ ] Pattern matching works when database unavailable
- [ ] Default fallback ensures deterministic result
- [ ] All error scenarios handled gracefully
- [ ] Health check validates detection
- [ ] All integration tests pass

### Phase 4: Integration (Week 4)

**Deliverables:**

1. Integrate with `UrlConstructionService`
2. Update deployment documentation
3. Create operator runbook
4. Performance optimization
5. UAT validation

**Acceptance Criteria:**

- [ ] UrlConstructionService uses new detection
- [ ] Email notifications work in all environments
- [ ] StepView URLs correct in all environments
- [ ] Documentation complete
- [ ] UAT validation successful

## Operational Considerations

### Deployment Checklist

**Prerequisites:**

- [ ] US-098 Configuration Management database schema deployed
- [ ] `system_configuration_scf` table populated with environment URLs
- [ ] `environments_env` table contains all target environments

**Deployment Steps:**

1. Deploy `ConfigurationService` enhancements
2. Verify database connectivity
3. Test Tier 3A self-discovery
4. Configure system property or environment variable (if needed)
5. Clear detection cache
6. Verify environment detection
7. Validate URL construction
8. Test email notifications

**Rollback Plan:**

- Keep previous pattern-matching code as fallback
- Emergency system property override: `-Dumig.environment=PROD`
- Database rollback script if needed

### Troubleshooting Guide

**Problem**: Wrong environment detected

**Diagnosis:**

```bash
# Check tier precedence
1. Check system property: java ... | grep umig.environment
2. Check environment variable: echo $UMIG_ENVIRONMENT
3. Check database configuration:
   SELECT * FROM system_configuration_scf
   WHERE scf_key = 'stepview.confluence.base.url'
4. Check hostname pattern matching
```

**Solutions:**

1. Override with system property: `-Dumig.environment=CORRECT_ENV`
2. Override with environment variable: `UMIG_ENVIRONMENT=CORRECT_ENV`
3. Fix database configuration
4. Add missing hostname pattern
5. Clear cache: `ConfigurationService.clearCache()`

**Problem**: Detection slow or failing

**Diagnosis:**

```bash
# Check detection latency
# Review logs: grep "Environment detection" confluence.log
# Check database connectivity
# Verify cache hit rate
```

**Solutions:**

1. Verify database connectivity
2. Check cache TTL configuration
3. Review database query performance
4. Fallback to pattern matching (automatic)
5. Use override for immediate fix

### Health Check Endpoint

**New Endpoint**: `/rest/scriptrunner/latest/custom/system/health/environment`

**Response:**

```json
{
  "environment": "UAT",
  "detectionTier": "3A_DATABASE",
  "detectionTime": "2025-10-07T10:30:15Z",
  "detectionDurationMs": 45,
  "cacheHit": false,
  "validations": {
    "systemProperty": null,
    "environmentVariable": null,
    "databaseUrl": "https://confluence-evx.corp.ubp.ch",
    "hostnamePattern": "evx"
  },
  "confidence": "HIGH"
}
```

## Links

- [ConfigurationService.groovy Implementation](/src/groovy/umig/services/ConfigurationService.groovy)
- [UrlConstructionService.groovy Integration](/src/groovy/umig/utils/UrlConstructionService.groovy)
- [ADR-042: Dual Authentication Context Management](/docs/architecture/adr/ADR-042-dual-authentication-context-management.md) - Related authentication architecture
- [ADR-048: URL Construction Service Architecture](/docs/architecture/adr/ADR-048-url-construction-service-architecture.md) - URL construction foundation
- [US-098: Configuration Management System](/docs/roadmap/sprint8/US-098-Configuration-Management-System.md) - Database configuration foundation
- [US-101: Enhanced Environment Detection](/docs/roadmap/sprint8/US-101-Enhanced-Environment-Detection.md) - Implementation user story
- [system_configuration_scf Table Schema](/local-dev-setup/liquibase/changelogs/)
- [UAT Deployment Incident Report](/docs/incidents/2025-10-07-UAT-Environment-Detection-Failure.md)

## Related ADRs

- **[ADR-031](ADR-031-groovy-type-safety-and-filtering-patterns.md)**: Type Safety Standards - Implementation compliance
- **[ADR-042](ADR-042-dual-authentication-context-management.md)**: Dual Authentication Pattern - Similar tiered fallback approach
- **[ADR-048](ADR-048-url-construction-service-architecture.md)**: URL Construction Service - Direct integration point
- **[ADR-059](ADR-059-sql-schema-first-development-principle.md)**: SQL Schema-First Development - Schema authority in environment detection
- **[ADR-072](ADR-072-dual-track-testing-strategy.md)**: Dual-Track Testing - Testing strategy guidance
- **[ADR-074](ADR-074-ComponentLocator-ScriptRunner-Compatibility-Fix.md)**: ComponentLocator Compatibility - Builds upon this ADR's environment detection foundation

## Amendment History

- **2025-10-07**: Initial ADR proposal based on UAT incident analysis and US-098 configuration foundation
- **2025-10-07**: Added comprehensive architecture diagram, implementation details, and testing strategy
- **2025-10-07**: Incorporated URL normalization strategy and health check endpoint design
