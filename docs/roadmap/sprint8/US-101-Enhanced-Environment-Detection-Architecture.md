# US-101: Enhanced Environment Detection Architecture

**Epic**: Sprint 8 - Security Architecture Enhancement
**Story Points**: 5
**Priority**: High
**Status**: Ready for Development
**Created**: 2025-10-07
**Sprint**: Sprint 8

## Story

**As a** UMIG Administrator / DevOps Engineer
**I want** environment auto-detection from Confluence base URL via database configuration
**So that** new environments can be added without code changes, detection is robust and resilient

## Business Context

### Problem Statement

The UAT environment was mis-detected as DEV, causing StepView email URLs to display `localhost:8090` instead of the correct `https://confluence-evx.corp.ubp.ch`. This occurred because environment detection relies on fragile hardcoded hostname pattern matching rather than the database-driven configuration infrastructure built in US-098.

**Emergency Fix Applied** (Temporary):

```groovy
// Line 249, UrlConstructionService.groovy
if (hostname.contains('test') || hostname.contains('ev1') || hostname.contains('evx')) return 'UAT'
```

### Root Cause

Environment detection uses brittle string pattern matching instead of leveraging the existing `system_configuration_scf` table that already stores environment-specific Confluence URLs (established in US-098).

### Business Impact

- **Operational Risk**: Each new environment requires code changes and deployment
- **User Experience**: Incorrect URLs in automated emails damage credibility
- **Maintainability**: Pattern matching becomes unmaintainable as environments proliferate
- **Configuration Drift**: Database has authoritative URLs but code ignores them

### Value Proposition

Database-backed environment detection provides:

- **Zero-touch deployment**: Add environments via database without code changes
- **Single source of truth**: `system_configuration_scf` becomes authoritative
- **Operational flexibility**: System property/environment variable overrides for edge cases
- **Bootstrap resilience**: Pattern fallback if database unavailable during startup

## Target Architecture

### 4-Tier Hybrid Detection Strategy

```
┌─────────────────────────────────────────────────────────────┐
│ Tier 1: System Property Override                            │
│ -Dumig.environment=UAT (highest precedence)                 │
└─────────────────────────────────────────────────────────────┘
                            ↓ (if not set)
┌─────────────────────────────────────────────────────────────┐
│ Tier 2: Environment Variable                                │
│ UMIG_ENVIRONMENT=UAT (second precedence)                    │
└─────────────────────────────────────────────────────────────┘
                            ↓ (if not set)
┌─────────────────────────────────────────────────────────────┐
│ Tier 3A: Database URL Lookup (PRIMARY)                      │
│ Query system_configuration_scf for URL match                │
└─────────────────────────────────────────────────────────────┘
                            ↓ (if database unavailable)
┌─────────────────────────────────────────────────────────────┐
│ Tier 3B: Pattern Fallback (RESILIENCE)                      │
│ Use existing hostname pattern matching                      │
└─────────────────────────────────────────────────────────────┘
                            ↓ (if no match)
┌─────────────────────────────────────────────────────────────┐
│ Tier 4: Fail-Safe Default                                   │
│ Return PROD with warning log                                │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema (US-098, Existing)

```sql
SELECT
    e.env_code,
    scf.scf_value as confluence_base_url
FROM system_configuration_scf scf
JOIN environments_env e ON scf.env_id = e.env_id
WHERE scf.scf_key = 'stepview.confluence.base.url'
  AND scf.is_active = true;
```

**Example Data**:

```
env_code | confluence_base_url
---------|------------------------------------------
DEV      | http://localhost:8090
UAT      | https://confluence-evx.corp.ubp.ch
PROD     | https://confluence-prod.corp.ubp.ch
```

## Acceptance Criteria

### AC1: Database-Backed URL Detection (PRIMARY)

**Given** the application is starting with database available
**When** environment detection executes
**Then** it should query `system_configuration_scf` to match current Confluence base URL
**And** normalize URLs for comparison (trailing slash, port, case, www prefix)
**And** return the matching environment code

**Verification**:

- UAT URL `https://confluence-evx.corp.ubp.ch` → `UAT` environment
- DEV URL `http://localhost:8090` → `DEV` environment
- URL variations (`http://localhost:8090/`, `HTTP://LOCALHOST:8090`) → `DEV` environment
- Unknown URL `https://unknown.corp.ubp.ch` → Log warning, fall back to pattern matching

**Implementation Notes**:

- Use `ConfigurationService` to query database
- Implement URL normalization utility
- Cache result for session to avoid repeated queries
- Handle database connection failures gracefully

### AC2: Pattern Fallback for Resilience (FALLBACK)

**Given** database is unavailable or URL not found in database
**When** environment detection executes
**Then** it should fall back to existing hostname pattern matching
**And** log that fallback mode is active

**Verification**:

- With database down, `localhost` → `DEV`
- With database down, `confluence-evx` → `UAT`
- With database down, `confluence-test` → `UAT`
- Fallback mode logged at WARN level

**Implementation Notes**:

- Preserve existing pattern matching logic as fallback
- Add telemetry to track fallback usage
- Consider health check alert if fallback persists

### AC3: Operational Overrides (HIGHEST PRECEDENCE)

**Given** operational override is configured
**When** environment detection executes
**Then** it should respect override hierarchy:

1. System property `-Dumig.environment=UAT`
2. Environment variable `UMIG_ENVIRONMENT=UAT`
3. Database/pattern auto-detection

**Verification**:

- System property `-Dumig.environment=UAT` overrides all (even on localhost)
- Environment variable `UMIG_ENVIRONMENT=UAT` overrides auto-detection
- Override logged at INFO level with source
- Invalid override value logs ERROR and falls back

**Implementation Notes**:

- Use Groovy `System.getProperty()` and `System.getenv()`
- Validate override value against known environments
- Document override mechanism in deployment guide

### AC4: URL Normalization (CORRECTNESS)

**Given** Confluence base URLs with variations
**When** URL comparison executes
**Then** it should handle:

- Trailing slashes: `http://localhost:8090/` == `http://localhost:8090`
- Port defaults: `http://localhost` == `http://localhost:80`
- Case insensitivity: `HTTP://LOCALHOST` == `http://localhost`
- www prefix: `http://www.example.com` == `http://example.com`
- HTTPS port: `https://example.com` == `https://example.com:443`

**Verification**:

```groovy
normalizeUrl("http://localhost:8090/") == normalizeUrl("http://localhost:8090")
normalizeUrl("HTTP://LOCALHOST") == normalizeUrl("http://localhost")
normalizeUrl("http://www.example.com") == normalizeUrl("http://example.com")
```

**Implementation Notes**:

- Create `UrlNormalizationUtil.groovy` in `src/groovy/umig/utils/`
- Use Apache Commons URI or Groovy URL parsing
- Handle malformed URLs gracefully

### AC5: Error Handling and Observability (OPERATIONS)

**Given** environment detection encounters errors
**When** detection fails or is ambiguous
**Then** it should:

- Log clear error messages with context
- List available environments when URL not found
- Include detection source in logs (database, pattern, override)
- Fail safe to PROD with warning
- Expose detection result via health check endpoint

**Verification**:

```
WARN: Environment detection fell back to pattern matching (database unavailable)
ERROR: URL 'https://unknown.com' not found in configuration. Available: [DEV, UAT, PROD]
INFO: Environment detected as UAT (source: database, URL: https://confluence-evx.corp.ubp.ch)
INFO: Environment override active: UAT (source: system.property)
```

**Implementation Notes**:

- Add structured logging with detection metadata
- Include detection result in `/rest/scriptrunner/latest/custom/admin-version` response
- Consider Prometheus metric for detection source distribution

## Technical Specification

### Implementation Files

**Primary Changes**:

1. `src/groovy/umig/service/ConfigurationService.groovy`
   - Add `detectEnvironmentFromUrl(String currentUrl)` method
   - Query `system_configuration_scf` for URL matching
   - Return environment code or null

2. `src/groovy/umig/utils/UrlConstructionService.groovy`
   - Refactor `detectEnvironment()` to use 4-tier strategy
   - Add operational override checks (Tier 1, 2)
   - Call `ConfigurationService.detectEnvironmentFromUrl()` (Tier 3A)
   - Preserve pattern matching as fallback (Tier 3B)
   - Add logging for detection source

3. `src/groovy/umig/utils/UrlNormalizationUtil.groovy` (NEW)
   - Implement URL normalization for comparison
   - Handle edge cases (trailing slash, port, case, www)

**Testing**: 4. `src/groovy/umig/tests/unit/ConfigurationServiceTest.groovy`

- Test database URL lookup
- Test URL normalization
- Test database unavailability handling

5. `src/groovy/umig/tests/unit/UrlConstructionServiceTest.groovy` (UPDATE)
   - Test 4-tier detection hierarchy
   - Test operational overrides
   - Test pattern fallback
   - Test all AC scenarios

**Documentation**: 6. `docs/deployment/ENVIRONMENT_CONFIGURATION.md` (UPDATE)

- Document 4-tier detection strategy
- Document operational override mechanism
- Document URL normalization rules
- Provide troubleshooting guide

### Code Structure

```groovy
// ConfigurationService.groovy
class ConfigurationService {
    /**
     * Detect environment from Confluence base URL using database configuration.
     *
     * @param currentUrl Current Confluence base URL
     * @return Environment code (DEV, UAT, PROD) or null if not found
     */
    String detectEnvironmentFromUrl(String currentUrl) {
        try {
            def normalizedCurrent = UrlNormalizationUtil.normalize(currentUrl)

            DatabaseUtil.withSql { sql ->
                def results = sql.rows('''
                    SELECT e.env_code, scf.scf_value
                    FROM system_configuration_scf scf
                    JOIN environments_env e ON scf.env_id = e.env_id
                    WHERE scf.scf_key = 'stepview.confluence.base.url'
                      AND scf.is_active = true
                ''')

                for (row in results) {
                    def normalizedConfigured = UrlNormalizationUtil.normalize(row.scf_value as String)
                    if (normalizedCurrent == normalizedConfigured) {
                        log.info("Environment detected from database: ${row.env_code} (URL: ${currentUrl})")
                        return row.env_code as String
                    }
                }

                log.warn("URL '${currentUrl}' not found in configuration. Available environments: ${results*.env_code}")
                return null
            }
        } catch (Exception e) {
            log.warn("Database environment detection failed, will use pattern fallback: ${e.message}")
            return null
        }
    }
}

// UrlConstructionService.groovy (refactored)
class UrlConstructionService {
    private static String detectEnvironment() {
        // Tier 1: System property override
        def systemOverride = System.getProperty('umig.environment')
        if (systemOverride) {
            log.info("Environment override via system property: ${systemOverride}")
            return validateAndReturn(systemOverride, 'system.property')
        }

        // Tier 2: Environment variable
        def envOverride = System.getenv('UMIG_ENVIRONMENT')
        if (envOverride) {
            log.info("Environment override via environment variable: ${envOverride}")
            return validateAndReturn(envOverride, 'environment.variable')
        }

        // Tier 3A: Database URL lookup (PRIMARY)
        def currentUrl = getCurrentConfluenceUrl()
        def dbEnvironment = new ConfigurationService().detectEnvironmentFromUrl(currentUrl)
        if (dbEnvironment) {
            return dbEnvironment
        }

        // Tier 3B: Pattern fallback (RESILIENCE)
        log.warn("Falling back to pattern-based environment detection")
        def patternEnvironment = detectEnvironmentFromPattern()
        if (patternEnvironment) {
            log.info("Environment detected from pattern: ${patternEnvironment}")
            return patternEnvironment
        }

        // Tier 4: Fail-safe default
        log.warn("Unable to detect environment, defaulting to PROD")
        return 'PROD'
    }

    private static String detectEnvironmentFromPattern() {
        // Existing pattern matching logic (preserved as fallback)
        def hostname = getCurrentHostname()

        if (hostname.contains('localhost') || hostname.contains('127.0.0.1')) return 'DEV'
        if (hostname.contains('test') || hostname.contains('ev1') || hostname.contains('evx')) return 'UAT'
        if (hostname.contains('prod')) return 'PROD'

        return null
    }
}

// UrlNormalizationUtil.groovy (NEW)
class UrlNormalizationUtil {
    static String normalize(String url) {
        if (!url) return null

        try {
            def uri = new URI(url.toLowerCase().trim())
            def scheme = uri.scheme ?: 'http'
            def host = uri.host?.replaceAll('^www\\.', '') // Remove www prefix
            def port = normalizePort(scheme, uri.port)
            def path = uri.path?.replaceAll('/$', '') ?: '' // Remove trailing slash

            return port > 0 ? "${scheme}://${host}:${port}${path}" : "${scheme}://${host}${path}"
        } catch (Exception e) {
            log.warn("Failed to normalize URL '${url}': ${e.message}")
            return url.toLowerCase().trim()
        }
    }

    private static int normalizePort(String scheme, int port) {
        if (port == -1) return -1 // No port specified
        if (scheme == 'http' && port == 80) return -1 // Default HTTP port
        if (scheme == 'https' && port == 443) return -1 // Default HTTPS port
        return port
    }
}
```

### Database Schema (No Changes Required)

The `system_configuration_scf` table from US-098 already contains the required data:

```sql
-- Existing schema (no changes)
CREATE TABLE system_configuration_scf (
    scf_id UUID PRIMARY KEY,
    env_id UUID REFERENCES environments_env(env_id),
    scf_key VARCHAR(255) NOT NULL,
    scf_value TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Existing data (example)
INSERT INTO system_configuration_scf (scf_id, env_id, scf_key, scf_value, is_active)
VALUES
    (gen_random_uuid(), (SELECT env_id FROM environments_env WHERE env_code = 'DEV'),
     'stepview.confluence.base.url', 'http://localhost:8090', true),
    (gen_random_uuid(), (SELECT env_id FROM environments_env WHERE env_code = 'UAT'),
     'stepview.confluence.base.url', 'https://confluence-evx.corp.ubp.ch', true),
    (gen_random_uuid(), (SELECT env_id FROM environments_env WHERE env_code = 'PROD'),
     'stepview.confluence.base.url', 'https://confluence-prod.corp.ubp.ch', true);
```

### Testing Strategy

**Unit Tests** (Groovy):

```groovy
// ConfigurationServiceTest.groovy
@Test
void testDetectEnvironmentFromUrl_DatabaseMatch() {
    def service = new ConfigurationService()
    assert service.detectEnvironmentFromUrl('https://confluence-evx.corp.ubp.ch') == 'UAT'
    assert service.detectEnvironmentFromUrl('http://localhost:8090') == 'DEV'
}

@Test
void testDetectEnvironmentFromUrl_UrlNormalization() {
    def service = new ConfigurationService()
    assert service.detectEnvironmentFromUrl('http://localhost:8090/') == 'DEV' // Trailing slash
    assert service.detectEnvironmentFromUrl('HTTP://LOCALHOST:8090') == 'DEV' // Case
}

@Test
void testDetectEnvironmentFromUrl_DatabaseUnavailable() {
    // Mock database failure
    def service = new ConfigurationService()
    assert service.detectEnvironmentFromUrl('http://localhost:8090') == null
}

// UrlConstructionServiceTest.groovy (updated)
@Test
void testDetectEnvironment_SystemPropertyOverride() {
    System.setProperty('umig.environment', 'UAT')
    assert UrlConstructionService.detectEnvironment() == 'UAT'
    System.clearProperty('umig.environment')
}

@Test
void testDetectEnvironment_DatabasePrimary() {
    // Mock database returning UAT for current URL
    assert UrlConstructionService.detectEnvironment() == 'UAT'
}

@Test
void testDetectEnvironment_PatternFallback() {
    // Mock database unavailable
    // Verify pattern fallback works
    assert UrlConstructionService.detectEnvironment() == 'DEV' // localhost
}

// UrlNormalizationUtilTest.groovy (new)
@Test
void testNormalize_TrailingSlash() {
    assert UrlNormalizationUtil.normalize('http://localhost:8090/') ==
           UrlNormalizationUtil.normalize('http://localhost:8090')
}

@Test
void testNormalize_CaseInsensitive() {
    assert UrlNormalizationUtil.normalize('HTTP://LOCALHOST') ==
           UrlNormalizationUtil.normalize('http://localhost')
}

@Test
void testNormalize_WwwPrefix() {
    assert UrlNormalizationUtil.normalize('http://www.example.com') ==
           UrlNormalizationUtil.normalize('http://example.com')
}

@Test
void testNormalize_DefaultPorts() {
    assert UrlNormalizationUtil.normalize('http://localhost:80') ==
           UrlNormalizationUtil.normalize('http://localhost')
    assert UrlNormalizationUtil.normalize('https://example.com:443') ==
           UrlNormalizationUtil.normalize('https://example.com')
}
```

**Integration Tests** (Manual):

1. UAT environment detection via database (AC1)
2. Database unavailable fallback (AC2)
3. System property override (AC3)
4. Environment variable override (AC3)
5. URL normalization edge cases (AC4)
6. Error logging verification (AC5)

**Regression Tests**:

- Verify existing StepView email URLs still work
- Verify UrlConstructionService backward compatibility
- Verify no impact on other URL construction methods

### Deployment Considerations

**Zero-Downtime Deployment**:

- Backward compatible (pattern fallback preserved)
- No database schema changes required
- No configuration changes required
- Can be deployed without system restart

**Rollback Strategy**:

- Remove new detection tier by reverting code
- Pattern fallback ensures continuity
- No data migration required

**Monitoring**:

- Add log analysis for detection source distribution
- Alert if pattern fallback usage exceeds threshold (indicates database issues)
- Track override usage for operational visibility

### Security Considerations

- **No new vulnerabilities**: Only reads existing configuration data
- **No SQL injection**: Uses parameterized queries
- **No authentication bypass**: Detection happens after authentication
- **No sensitive data exposure**: Environment codes are not sensitive

## Dependencies

### Required (Completed)

- ✅ **US-098**: Configuration Management System (provides `system_configuration_scf` table)

### Related

- **ADR-073**: Environment Detection Architecture (to be created)
- **ADR-069**: UrlConstructionService (existing, to be referenced)
- **ADR-042**: Authentication Service (tangentially related)

## Tasks & Subtasks

### Task 1: Implement URL Normalization Utility (2 hours)

- [ ] Create `src/groovy/umig/utils/UrlNormalizationUtil.groovy`
- [ ] Implement `normalize(String url)` method
- [ ] Handle trailing slash, port, case, www prefix
- [ ] Write unit tests (`UrlNormalizationUtilTest.groovy`)
- [ ] Verify all AC4 scenarios pass

### Task 2: Enhance ConfigurationService (2 hours)

- [ ] Add `detectEnvironmentFromUrl(String currentUrl)` method
- [ ] Implement database query logic
- [ ] Add URL normalization integration
- [ ] Handle database connection failures
- [ ] Write unit tests (`ConfigurationServiceTest.groovy`)
- [ ] Verify AC1 scenarios pass

### Task 3: Refactor UrlConstructionService (2 hours)

- [ ] Implement 4-tier detection hierarchy
- [ ] Add system property check (Tier 1)
- [ ] Add environment variable check (Tier 2)
- [ ] Integrate `ConfigurationService.detectEnvironmentFromUrl()` (Tier 3A)
- [ ] Preserve pattern matching as fallback (Tier 3B)
- [ ] Add structured logging for detection source
- [ ] Update existing tests (`UrlConstructionServiceTest.groovy`)
- [ ] Verify AC2, AC3, AC5 scenarios pass

### Task 4: Testing & Validation (1.5 hours)

- [ ] Run complete unit test suite
- [ ] Manual integration testing in DEV environment
- [ ] Test database unavailable scenario
- [ ] Test operational overrides
- [ ] Test URL normalization edge cases
- [ ] Verify StepView emails show correct URLs
- [ ] Performance testing (detection should be <10ms)

### Task 5: Documentation & ADR (0.5 hours)

- [ ] Update `docs/deployment/ENVIRONMENT_CONFIGURATION.md`
- [ ] Document 4-tier detection strategy
- [ ] Document operational override mechanism
- [ ] Document troubleshooting procedures
- [ ] Create ADR-073: Environment Detection Architecture
- [ ] Update US-098 documentation with cross-reference

## Definition of Done

- [ ] **Code Complete**: All 3 files implemented and reviewed
- [ ] **Tests Pass**: 100% unit test coverage, all scenarios verified
- [ ] **Documentation Updated**: Deployment guide, ADR created
- [ ] **Code Review Approved**: Peer review completed
- [ ] **Integration Tested**: Manual testing in DEV environment
- [ ] **UAT Verified**: UAT environment correctly detected from database
- [ ] **Performance Verified**: Detection time <10ms average
- [ ] **Logging Verified**: All detection sources logged correctly
- [ ] **Backward Compatible**: Existing functionality unchanged
- [ ] **No Regressions**: Full regression test suite passes

## Notes

### Design Decisions

**Why 4-tier hybrid approach?**

- **Tier 1-2 (Overrides)**: Operational flexibility for edge cases (local testing, disaster recovery)
- **Tier 3A (Database)**: Primary detection for production use (scalable, maintainable)
- **Tier 3B (Pattern)**: Resilience fallback if database unavailable (bootstrap, disaster recovery)
- **Tier 4 (Default)**: Fail-safe prevents application crash

**Why preserve pattern matching?**

- **Backward compatibility**: Existing deployments work without configuration
- **Bootstrap resilience**: Application can start even if database unavailable
- **Disaster recovery**: Manual override possible without database access

**Why URL normalization?**

- **Robustness**: Handles real-world URL variations (trailing slash, case, www)
- **User experience**: Administrators don't need exact URL match syntax
- **Maintainability**: Reduces configuration errors

### Future Enhancements (Out of Scope)

- **Dynamic environment registry**: Allow runtime addition of environments without deployment
- **Multi-URL support**: Multiple URLs per environment (load balancing, DR sites)
- **Detection caching**: Cache detection result in application scope (performance)
- **Health check integration**: Expose detection status via monitoring endpoint
- **Prometheus metrics**: Track detection source distribution, fallback frequency

### Migration Plan

**Phase 1: Code Deployment** (This US)

- Deploy enhanced detection logic
- Pattern fallback ensures no service disruption
- Monitor logs for detection source

**Phase 2: Database Validation** (Post-deployment)

- Verify all environments have correct URLs in `system_configuration_scf`
- Update any incorrect URLs via Admin GUI

**Phase 3: Pattern Deprecation** (Future Sprint)

- Once database detection proves reliable, remove pattern fallback
- Convert to pure database-driven detection

### Success Metrics

**Operational**:

- Zero production incidents related to environment mis-detection
- Database detection used >95% of the time (fallback <5%)
- Override usage <1% (indicates stable auto-detection)

**Technical**:

- Detection time <10ms average (no performance impact)
- Zero false positives (correct environment detected)
- Zero false negatives (environment always detected)

**Business**:

- New environments deployed without code changes
- StepView email URLs 100% correct
- Reduced deployment risk and operational overhead

---

**Estimated Effort**: 5 story points (8 hours)
**Risk Level**: Low (backward compatible, fallback preserved)
**Business Value**: High (operational efficiency, correctness, scalability)
