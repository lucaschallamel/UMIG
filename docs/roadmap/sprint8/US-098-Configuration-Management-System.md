# US-098: Configuration Management System Implementation

**Story ID**: US-098
**Epic**: Infrastructure Modernization
**Sprint**: 7
**Story Points**: 13
**Priority**: High
**Type**: Technical Story
**Created**: 2024-09-26

## Story Description

**As a** UMIG system administrator
**I want** a centralized configuration management system that supports environment-specific configurations
**So that** I can deploy UMIG across multiple environments (LOCAL, DEV, UAT, PROD) without hardcoded values and ensure proper configuration isolation

## Business Value & Justification

### Critical Business Need

- **Deployment Blocker**: 78 hardcoded configuration values prevent UAT deployment
- **Security Risk**: SMTP credentials, database URLs, and API endpoints exposed in source code
- **Operational Efficiency**: Manual configuration changes across environments increase deployment time by 40-60 minutes
- **Compliance Risk**: Hardcoded production settings in development environments violate security policies

### Business Impact

- **Enables UAT Deployment**: Removes primary blocker for user acceptance testing phase
- **Reduces Deployment Time**: From 60+ minutes to <15 minutes for environment-specific deployments
- **Improves Security Posture**: Eliminates hardcoded credentials and environment-specific data in source code
- **Supports Scalability**: Foundation for multi-tenant and cloud deployment strategies

### ROI Calculation

- **Time Savings**: 45 minutes × 3 deployments/week × 4 weeks = 9 hours/month saved
- **Risk Mitigation**: Prevents potential security incidents from exposed credentials
- **Compliance Value**: Meets enterprise security requirements for environment separation

## Current State Analysis

### Configuration Audit Results

```
Total Hardcoded Values: 78
├── SMTP Settings: 12 values
├── Database Configuration: 8 values
├── API Endpoints: 15 values
├── File Paths: 18 values
├── Timeout Values: 11 values
├── Feature Flags: 8 values
└── Security Settings: 6 values
```

### Environment Detection Requirements

- **LOCAL**: Development using .env files with live-reload capability
- **DEV**: Development server with database-stored configurations
- **UAT**: User Acceptance Testing environment with production-like settings
- **PROD**: Production environment with security-hardened configurations

### Existing Infrastructure

- ✅ `system_configuration_scf` table exists with environment field support
- ✅ ScriptRunner manages database connections (no additional setup required)
- ✅ PostgreSQL backend supports JSON configuration storage
- ⚠️ No centralized configuration access pattern currently exists

## Detailed Acceptance Criteria

### AC-1: ConfigurationService Utility Class

**Given** a need for centralized configuration management
**When** I implement the ConfigurationService class
**Then** it should provide:

- Environment detection (LOCAL, DEV, UAT, PROD)
- Configuration retrieval with fallback hierarchy
- Caching mechanism with 5-minute TTL
- Type-safe configuration access methods
- Logging of configuration source for audit trails

**Technical Specifications**:

```groovy
// Core service methods required
class ConfigurationService {
    static String getString(String key, String defaultValue = null)
    static Integer getInteger(String key, Integer defaultValue = null)
    static Boolean getBoolean(String key, Boolean defaultValue = false)
    static Map<String, Object> getSection(String section)
    static void clearCache()
    static String getCurrentEnvironment()
}
```

### AC-2: Environment Detection Logic

**Given** the application is running in any environment
**When** ConfigurationService determines the environment
**Then** it should:

- Detect LOCAL environment via .env file presence or system properties
- Identify DEV/UAT/PROD via database environment markers
- Default to PROD if detection fails (fail-safe approach)
- Log environment detection for operational visibility
- Support manual environment override via system property

**Environment Detection Priority**:

1. System property: `-Dumig.environment=ENV`
2. Environment variable: `UMIG_ENVIRONMENT`
3. Database query: `SELECT environment FROM system_configuration_scf WHERE key = 'app.environment'`
4. Default: PROD (security-first fallback)

### AC-3: Fallback Hierarchy Implementation

**Given** a configuration key is requested
**When** ConfigurationService retrieves the value
**Then** it should follow this hierarchy:

1. Environment-specific value from database (`key` + environment)
2. Global value from database (`key` with environment = 'GLOBAL')
3. .env file value (LOCAL environment only)
4. Hardcoded default value
5. Return null or throw exception if no value found and no default provided

**Fallback Logic Example**:

```groovy
// For key "smtp.host" in UAT environment:
// 1. Check: smtp.host + environment='UAT'
// 2. Check: smtp.host + environment='GLOBAL'
// 3. Return: hardcoded default or null
```

### AC-4: Caching Strategy

**Given** configuration values are accessed frequently
**When** ConfigurationService retrieves values
**Then** it should:

- Cache values for 5 minutes to reduce database load
- Provide cache invalidation mechanism
- Log cache hits/misses for performance monitoring
- Handle cache expiration gracefully
- Support manual cache clearing for immediate updates

**Performance Requirements**:

- Configuration retrieval: <50ms (cached), <200ms (uncached)
- Cache memory usage: <10MB for all configurations
- Cache hit ratio: >85% in steady-state operation

### AC-5: Database Integration

**Given** the existing `system_configuration_scf` table
**When** ConfigurationService accesses database configurations
**Then** it should:

- Use existing table structure without modifications
- Support environment-specific and global configurations
- Handle database connectivity failures gracefully
- Use proper SQL patterns with prepared statements
- Follow existing DatabaseUtil.withSql pattern

**Database Schema Usage**:

```sql
-- Existing table structure (NO CHANGES REQUIRED)
system_configuration_scf (
    id UUID PRIMARY KEY,
    key VARCHAR(255) NOT NULL,
    value TEXT,
    environment VARCHAR(50), -- 'LOCAL', 'DEV', 'UAT', 'PROD', 'GLOBAL'
    description TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
```

### AC-6: Security & Audit Requirements

**Given** sensitive configuration data
**When** ConfigurationService operates
**Then** it should:

- Never log sensitive values (passwords, API keys, tokens)
- Provide audit trail of configuration access
- Support configuration value encryption for sensitive data
- Validate configuration key patterns to prevent injection
- Log all configuration changes with user context

**Security Classifications**:

- **PUBLIC**: Feature flags, timeouts, non-sensitive URLs
- **INTERNAL**: Database hosts, service endpoints
- **CONFIDENTIAL**: API keys, passwords, security tokens

## Technical Requirements

### TR-1: Implementation Architecture

```groovy
// Location: src/groovy/umig/service/ConfigurationService.groovy
class ConfigurationService {
    private static final Map<String, CachedValue> cache = [:]
    private static final long CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

    // Core configuration access
    static String getString(String key, String defaultValue = null)
    static Integer getInteger(String key, Integer defaultValue = null)
    static Boolean getBoolean(String key, Boolean defaultValue = false)

    // Advanced access patterns
    static Map<String, Object> getSection(String sectionPrefix)
    static List<String> getList(String key, List<String> defaultValue = [])

    // Environment and cache management
    static String getCurrentEnvironment()
    static void clearCache()
    static void refreshConfiguration()

    // Internal methods
    private static String detectEnvironment()
    private static String fetchFromDatabase(String key, String environment)
    private static String fetchFromEnvFile(String key)
    private static boolean isCacheValid(String key)
}
```

### TR-2: Configuration Key Naming Convention

```
Naming Pattern: {domain}.{subdomain}.{property}

Examples:
- smtp.server.host
- smtp.server.port
- smtp.auth.username
- database.connection.timeout
- api.external.confluence.url
- security.token.expiration
- feature.flags.advanced.notifications
```

### TR-3: Environment Configuration Strategy

```groovy
// LOCAL: .env file support (development only)
SMTP_HOST=localhost
SMTP_PORT=1025

// DEV/UAT/PROD: Database storage
INSERT INTO system_configuration_scf VALUES
('smtp.server.host', 'mail.company.com', 'PROD', 'Production SMTP server'),
('smtp.server.host', 'mail-dev.company.com', 'DEV', 'Development SMTP server'),
('smtp.server.host', 'mail-uat.company.com', 'UAT', 'UAT SMTP server');
```

### TR-4: Error Handling & Resilience

```groovy
// Graceful degradation patterns
try {
    return fetchFromDatabase(key, environment)
} catch (SQLException e) {
    log.warn("Database unavailable for config ${key}, using fallback")
    return fetchFromEnvFile(key) ?: getHardcodedDefault(key)
}
```

### TR-5: Testing Requirements

- Unit tests for all configuration access patterns
- Integration tests with database configuration scenarios
- Performance tests for cache efficiency
- Security tests for sensitive data handling
- Environment detection tests across all target environments

## Implementation Phases

### Phase 1: Foundation (Story Points: 5)

**Duration**: 3-4 days
**Scope**: Core ConfigurationService implementation

**Deliverables**:

- ConfigurationService.groovy implementation
- Environment detection logic
- Basic configuration retrieval with fallback hierarchy
- Unit test suite (>90% coverage)
- Documentation for configuration key naming standards

**Success Criteria**:

- ✅ Environment detection works across LOCAL/DEV/UAT/PROD
- ✅ Configuration retrieval follows proper fallback hierarchy
- ✅ All unit tests pass
- ✅ Performance: <50ms cached, <200ms uncached access

### Phase 2: Database Integration & Caching (Story Points: 3)

**Duration**: 2-3 days
**Scope**: Database connectivity and caching implementation

**Deliverables**:

- Database integration with system_configuration_scf table
- Caching mechanism with 5-minute TTL
- Cache management utilities
- Integration test suite
- Performance benchmarking

**Success Criteria**:

- ✅ Database queries use existing DatabaseUtil.withSql pattern
- ✅ Cache hit ratio >85% in testing
- ✅ Cache invalidation works correctly
- ✅ Graceful degradation when database unavailable

### Phase 3: Security & Audit (Story Points: 2)

**Duration**: 1-2 days
**Scope**: Security hardening and audit capabilities

**Deliverables**:

- Sensitive data protection (no logging of passwords/keys)
- Configuration access audit logging
- Security classification implementation
- Security test suite
- Audit trail verification

**Success Criteria**:

- ✅ No sensitive values appear in logs
- ✅ All configuration access is audited
- ✅ Security tests verify data protection
- ✅ Audit trails are complete and accurate

### Phase 4: Migration Planning (Story Points: 3)

**Duration**: 2-3 days
**Scope**: Migration strategy for 78 hardcoded values

**Deliverables**:

- Complete inventory of 78 hardcoded configurations
- Migration scripts for database population
- Environment-specific configuration templates
- Migration validation tests
- Rollback procedures

**Success Criteria**:

- ✅ All 78 configurations identified and categorized
- ✅ Migration scripts tested in development environment
- ✅ Configuration templates validated for all environments
- ✅ Rollback procedures verified

## Configuration Migration Strategy

### High-Priority Configurations (Phase 4A)

**Target**: Critical path for UAT deployment

```
1. SMTP Settings (12 values)
   - smtp.server.host, smtp.server.port
   - smtp.auth.username, smtp.auth.password
   - smtp.security.tls, smtp.timeout.connection

2. Database Configuration (8 values)
   - database.connection.timeout
   - database.pool.max.size
   - database.query.timeout

3. API Endpoints (15 values)
   - api.confluence.base.url
   - api.external.service.urls
   - api.timeout.default
```

### Medium-Priority Configurations (Phase 4B)

**Target**: Operational efficiency improvements

```
4. File Paths (18 values)
   - logging.file.path
   - upload.directory.path
   - backup.location.path

5. Feature Flags (8 values)
   - feature.notifications.email
   - feature.advanced.filtering
   - feature.audit.logging
```

### Low-Priority Configurations (Phase 4C)

**Target**: System optimization

```
6. Timeout Values (11 values)
7. Security Settings (6 values)
```

## Success Metrics

### Quantitative Metrics

- **Configuration Coverage**: 78/78 hardcoded values migrated (100%)
- **Environment Support**: 4/4 environments supported (LOCAL, DEV, UAT, PROD)
- **Performance**: <50ms cached access, <200ms uncached access
- **Cache Efficiency**: >85% cache hit ratio
- **Test Coverage**: >90% unit test coverage, >80% integration coverage
- **Security Compliance**: 0 sensitive values logged, 100% audit coverage

### Qualitative Metrics

- **Deployment Readiness**: UAT environment deployment enabled
- **Operational Efficiency**: Deployment time reduced from 60+ minutes to <15 minutes
- **Developer Experience**: Simplified environment-specific configuration management
- **Security Posture**: Elimination of hardcoded credentials and environment data

### Acceptance Testing Scenarios

1. **Environment Detection**: Verify correct environment identification across all target environments
2. **Configuration Retrieval**: Test fallback hierarchy works correctly for all configuration types
3. **Performance**: Validate cache efficiency and response times meet requirements
4. **Security**: Confirm sensitive data protection and audit trail completeness
5. **Migration**: Verify all 78 configurations migrated successfully with proper environment targeting

## Dependencies & Prerequisites

### Internal Dependencies

- ✅ `system_configuration_scf` table exists and is accessible
- ✅ DatabaseUtil.withSql pattern established and functional
- ✅ ScriptRunner environment provides database connectivity
- ✅ Existing logging framework available for audit trails

### External Dependencies

- **Database Access**: PostgreSQL connectivity maintained by ScriptRunner
- **Environment Variables**: System support for environment variable access
- **File System**: .env file access for LOCAL development environment
- **Logging Infrastructure**: Existing log4j/logback configuration

### Blockers & Risk Mitigation

#### Risk 1: Database Performance Impact

**Risk**: Configuration queries impact database performance
**Probability**: Low
**Impact**: Medium
**Mitigation**:

- Implement 5-minute caching to reduce database load
- Use prepared statements for query optimization
- Monitor query performance during implementation

#### Risk 2: Cache Coherency Issues

**Risk**: Cached values become stale during configuration updates
**Probability**: Medium
**Impact**: Low
**Mitigation**:

- Provide manual cache invalidation mechanism
- Implement cache expiration logging
- Include cache refresh in operational procedures

#### Risk 3: Environment Detection Failures

**Risk**: Incorrect environment detection leads to wrong configurations
**Probability**: Low
**Impact**: High
**Mitigation**:

- Multiple detection methods with clear priority hierarchy
- Fail-safe default to PROD environment
- Comprehensive environment detection testing
- Manual override capability via system properties

#### Risk 4: Migration Data Loss

**Risk**: Configuration migration causes loss of existing settings
**Probability**: Low
**Impact**: High
**Mitigation**:

- Complete backup of existing configurations before migration
- Rollback procedures tested and documented
- Phased migration approach with validation at each step
- Parallel operation during transition period

## Definition of Done

### Technical Completion Criteria

- [ ] ConfigurationService.groovy implemented with all required methods
- [ ] Environment detection logic functional across all target environments
- [ ] Fallback hierarchy implemented and tested
- [ ] Caching mechanism operational with 5-minute TTL
- [ ] Database integration using existing patterns
- [ ] Security protections implemented for sensitive data
- [ ] Audit logging operational for all configuration access

### Quality Assurance Criteria

- [ ] Unit test coverage >90%
- [ ] Integration test coverage >80%
- [ ] Performance benchmarks meet requirements (<50ms cached, <200ms uncached)
- [ ] Security tests verify no sensitive data in logs
- [ ] All 78 configurations identified and migration planned

### Documentation Criteria

- [ ] Configuration key naming standards documented
- [ ] Environment setup procedures documented for each target environment
- [ ] Migration procedures documented with rollback steps
- [ ] Operational procedures updated for configuration management
- [ ] Security classification guide created for configuration types

### Deployment Readiness Criteria

- [ ] UAT environment configuration validated
- [ ] Production deployment procedures tested in UAT
- [ ] Configuration backup and restore procedures verified
- [ ] Monitoring and alerting configured for configuration system health
- [ ] Stakeholder sign-off obtained for UAT deployment readiness

## Related Stories & Technical Debt

### Enables Future Work

- **US-099**: Multi-tenant configuration support
- **US-100**: Configuration management UI for administrators
- **US-101**: Configuration version control and change tracking
- **TD-008**: Elimination of remaining hardcoded values in JavaScript components

### Technical Debt Resolution

- **TD-003**: Database configuration standardization (partial resolution)
- **TD-006**: Environment-specific deployment automation (enables resolution)

### Cross-Story Dependencies

- **US-087**: Admin GUI Phase 2 requires configuration management for environment-specific settings
- **US-089**: Full system deployment depends on configuration management completion

---

**Story Owner**: Infrastructure Team
**Technical Lead**: [TBD]
**Stakeholders**: DevOps Team, Security Team, Product Owner
**Review Date**: Weekly sprint reviews
**Target Completion**: Sprint 7 (End of Week 3)

---

_This story document follows UMIG project standards and integrates with existing Sprint 7 objectives. Implementation should follow established architectural patterns and maintain compatibility with existing ScriptRunner environment._
