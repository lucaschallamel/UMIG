# UMIG Technology Stack Documentation

**Version**: 1.0
**Date**: 2025-10-08
**Status**: Active
**Related**: Sprint 8 Architecture Enhancement

## Executive Summary

This document consolidates the technology stack for UMIG, including Sprint 8 architectural patterns for configuration management, environment detection, and security authentication.

## Core Technology Stack

### Backend Technologies

- **Language**: Groovy 3.0.15
- **Runtime**: ScriptRunner 9.21.0+ for Confluence
- **Framework**: Pure ScriptRunner (no external frameworks)
- **Database**: PostgreSQL 14
- **Schema Migration**: Liquibase

### Frontend Technologies

- **Language**: Vanilla JavaScript (ES6+)
- **UI Framework**: Atlassian AUI (platform-provided)
- **Module Pattern**: Direct class declaration (no IIFE wrappers - see ADR-057)
- **Security**: Component-level security boundaries (ADR-069)

### Development Stack

- **Container Runtime**: Podman 4.x (primary), Docker (fallback)
- **Orchestration**: `podman-compose` / `docker-compose`
- **Testing**: Jest (JavaScript), Groovy self-contained tests
- **Email Testing**: MailHog 1.0.1 (DEV only)

## Sprint 8 Architectural Patterns

### 1. Configuration Management Pattern (ADR-076)

**Purpose**: Environment-specific configuration with type safety and security classification

**Table Architecture**:

```sql
system_configuration_scf (
    env_id INTEGER FK → environments_env
    scf_key VARCHAR(255)
    scf_category VARCHAR(100)  -- MACRO_LOCATION, API_CONFIG, EMAIL_CONFIG, SYSTEM_CONFIG
    scf_value TEXT
    scf_data_type VARCHAR(50)  -- STRING, INTEGER, BOOLEAN, JSON, URL
    scf_security_classification VARCHAR(50)  -- PUBLIC, INTERNAL, CONFIDENTIAL
    scf_validation_pattern VARCHAR(500)
    UNIQUE (env_id, scf_key)
)
```

**Features**:

- ✅ Environment isolation via FK (env_id)
- ✅ Type safety (STRING, INTEGER, BOOLEAN, JSON, URL)
- ✅ Security classification (PUBLIC, INTERNAL, CONFIDENTIAL)
- ✅ Automatic credential redaction for CONFIDENTIAL values
- ✅ 4-tier fallback hierarchy: Database → System Property → Environment Variable → Default

**Performance**:

- Cache TTL: 5 minutes (ConcurrentHashMap)
- Cache hit rate: >95% in production
- Configuration retrieval: <50ms (cached), <100ms (uncached)

**Reference**: ADR-076

### 2. Two-Parameter Environment Detection Pattern (ADR-075)

**Purpose**: Separate environment detection (URL-based) from filesystem operations (path-based)

**Parameter Separation**:

| Parameter                  | Purpose               | Format       | Example                                |
| -------------------------- | --------------------- | ------------ | -------------------------------------- |
| `umig.web.root`            | Environment detection | Full URL     | `https://confluence-evx.corp.ubp.ch`   |
| `umig.web.filesystem.root` | Filesystem operations | Servlet path | `/rest/scriptrunner/latest/custom/web` |

**Responsibility**:

- **`umig.web.root`**: Pattern matching for DEV/UAT/PROD detection
- **`umig.web.filesystem.root`**: Server-side file operations, resource loading

**Rationale**: Prevents configuration ambiguity when single parameter tried to serve both URL detection and filesystem path needs

**Reference**: ADR-075

### 3. Fail-Secure Authentication Pattern (ADR-077)

**Purpose**: Eliminate CWE-639 authorization bypass vulnerability through strict session-based authentication

**Security Enhancements**:

```groovy
// ❌ REMOVED: Query parameter authentication
// ❌ REMOVED: Request body userId for authentication
// ✅ ENFORCED: Session-only authentication

class UserService {
    static Map getSecureUserContext() {
        // Tier 1: Session authentication (PRIMARY)
        // Tier 2: ThreadLocal authentication (BACKEND)
        // Tier 3: Macro embedded (SIGNED only)
        // Tier 4: Anonymous (READ-ONLY)
    }
}
```

**Authorization Enforcement**:

- User can only access their own data
- Admin role required for cross-user data access
- All authorization failures audited
- Device fingerprinting + IP collision detection (ADR-067)

**Security Rating**: Upgraded from 6.5/10 → 9.0/10

**Compliance**:

- ✅ OWASP A01:2021 (Broken Access Control)
- ✅ NIST CSF PR.AC-1 (Identity Management)
- ✅ ISO27001 A.9.2.1
- ✅ GDPR Article 32

**Reference**: ADR-077

### 4. Enhanced 4-Tier Environment Detection (ADR-073)

**Purpose**: Intelligent environment detection with self-discovery and emergency override

**Detection Hierarchy**:

```
Tier 1: System Property (-Dumig.environment=UAT)     → Emergency override
Tier 2: Environment Variable (UMIG_ENVIRONMENT)       → Container config
Tier 3A: Database Self-Discovery (system_configuration_scf) → Auto-detection
Tier 3B: Pattern Matching (hostname patterns)         → Bootstrap fallback
Tier 4: Fail-Safe Default (PROD)                     → Safety
```

**URL Normalization**:

- Lowercase conversion
- Trailing slash removal
- Default port removal (`:80`, `:443`)
- `www.` prefix removal

**Cache**: 5-minute TTL, cleared on demand

**Reference**: ADR-073

### 5. ComponentLocator ScriptRunner Compatibility (ADR-074)

**Purpose**: Fix race condition in dependency lookup during component initialization

**Problem**: Original `ComponentLocator.getComponent(SettingsManager.class)` caused `NoSuchMethodError` due to early execution timing

**Solution**: Deferred ComponentLocator lookup via closure pattern

```groovy
// ❌ OLD (Race condition):
def settingsManager = ComponentLocator.getComponent(SettingsManager.class)

// ✅ NEW (Deferred lookup):
def getSettingsManager = {
    ComponentLocator.getComponent(SettingsManager.class)
}
// Invoke only when needed:
def baseUrl = getSettingsManager().globalSettings.baseUrl
```

**Reference**: ADR-074

## Security Architecture (ADRs 67-70)

### Session Security Enhancement (ADR-067) - BLOCKED

**Status**: PERMANENTLY BLOCKED - GDPR/CCPA Non-Compliant

**Privacy Violations**:

- ❌ Canvas fingerprinting (GDPR Article 6 violation)
- ❌ WebGL fingerprinting (GDPR Article 7 violation)
- ❌ Timing fingerprinting (GDPR Article 13/14 violation)
- ❌ No consent management (ePrivacy Directive violation)

**Approved Alternative**: ADR-071 Privacy-First Security Architecture

- ✅ Session timeout with secure token rotation
- ✅ Privacy-preserving anomaly detection
- ✅ User-controlled session management
- ✅ Transparent tracking with minimal data collection

**Reference**: ADR-067

### SecurityUtils Enhancement (ADR-068)

**Purpose**: Advanced rate limiting and Content Security Policy integration

**Features**:

- Multi-tier rate limiting (user/endpoint/global)
- Resource-aware rate adjustment
- Distributed attack pattern detection
- Component-specific CSP policies
- CSP violation tracking and response

**Performance**:

- Memory overhead: <3MB
- CPU overhead: <8% for advanced rate limiting
- Storage: Optimized violation tracking

**Reference**: ADR-068

### Component Security Boundary Enforcement (ADR-069)

**Purpose**: Advanced namespace protection and cross-component access control

**Security Levels**:

- PUBLIC: Low-risk components (pagination, notifications)
- INTERNAL: Standard components (filters, navigation)
- RESTRICTED: Sensitive components (modals, tables, forms)
- CONFIDENTIAL: Critical components (authentication, payments)

**Protection Mechanisms**:

- Namespace targeting prevention
- Cross-component data leakage prevention
- State manipulation detection
- DOM tampering detection

**Performance**:

- Memory overhead: ~4MB
- CPU overhead: <10% for boundary validation
- DOM performance: <5% impact

**Reference**: ADR-069

## Database Patterns

### Naming Conventions

- Tables: `snake_case` with `_master_` (templates) or `_instance_` (execution) suffixes
- Foreign Keys: `fk_` prefix
- Indexes: `idx_` prefix
- Sequences: `seq_` prefix

### Type Safety (ADR-031, ADR-043)

```groovy
// Mandatory explicit casting for ALL parameters
UUID.fromString(param as String)
Integer.parseInt(param as String)
param.toUpperCase() as String
```

### Database Access Pattern (MANDATORY)

```groovy
// ALWAYS use DatabaseUtil.withSql pattern
DatabaseUtil.withSql { sql ->
    return sql.rows('SELECT * FROM table_name WHERE id = ?', [id])
}
```

## API Architecture

### RESTful v2 APIs

**Pattern**:

```groovy
@BaseScript CustomEndpointDelegate delegate

entityName(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    def repository = new SomeRepository()  // Lazy load

    // Type safety with explicit casting
    params.migrationId = UUID.fromString(filters.migrationId as String)

    return Response.ok(payload).build()
}
```

**Security**: `groups: ["confluence-users"]` on ALL endpoints

**Documentation**: OpenAPI v2.12.0 specification

### Complete API Endpoints (31+ total)

**Core**: Users, Teams, TeamMembers, Environments, Applications, Labels, Migrations, Status

**Hierarchy**: Plans, Sequences, Phases, Steps, Instructions, Iterations

**Admin**: SystemConfiguration, UrlConfiguration, Controls, IterationTypes, MigrationTypes, EmailTemplates

**System**: AdminVersion, Dashboard, DatabaseVersions, Roles

**Special**: Import, ImportQueue, StepView, Web, TestEndpoint

**Relationships**: TeamsRelationship, UsersRelationship

## Frontend Component Architecture

### Module Loading Pattern (ADR-057)

```javascript
// ✅ CORRECT - Direct class declaration
class ModalComponent extends BaseComponent { ... }
window.ModalComponent = ModalComponent;

// ❌ WRONG - Never use IIFE wrappers (causes race conditions)
(function() { ... })();
```

### Component Lifecycle

```
initialize() → mount() → render() → update() → unmount() → destroy()
```

### Security Pattern (ADR-058)

```javascript
// Use window.SecurityUtils for XSS/CSRF protection
SecurityUtils.sanitizeXSS(content);
SecurityUtils.validateCSRFToken(token);
SecurityUtils.safeSetInnerHTML(element, html);
```

### Base Pattern (ADR-060)

All entity managers MUST extend `BaseEntityManager` for consistent behavior:

```javascript
class TeamsEntityManager extends BaseEntityManager {
  constructor(config) {
    super(config);
    // Component-specific initialization
  }
}
```

## Testing Architecture

### Technology-Prefixed Commands

```bash
# JavaScript Testing (Jest)
npm run test:js:unit
npm run test:js:integration
npm run test:js:e2e
npm run test:js:components      # 95%+ coverage
npm run test:js:security        # 28 scenarios
npm run test:js:security:pentest # 21 attack vectors

# Groovy Testing (Self-contained)
npm run test:groovy:unit        # 43/43 tests passing (100%)
npm run test:groovy:integration
npm run test:groovy:all

# Cross-Technology
npm run test:all:comprehensive
npm run test:all:unit
npm run test:all:quick
```

### Test Patterns

**JavaScript**: Jest with `jest.config.*.js` configurations
**Groovy**: Self-contained architecture (run from project root)

## Build & Deployment

### Environment Management

```bash
npm start                    # Start complete development stack
npm stop                     # Stop all services
npm run restart:erase        # Reset everything (clean slate)
npm run generate-data:erase  # Generate fake data with reset
```

### Build Commands

```bash
npm run build:uat            # UAT build
npm run build:prod           # Production build (84% size reduction)
npm run build:dev            # Development build with tests
```

### Health Checks

```bash
npm run health:check         # Verify system health
npm run logs:postgres        # View PostgreSQL logs
npm run logs:confluence      # View Confluence logs
npm run logs:all             # View all container logs
```

## Performance Metrics

### Sprint 8 Enhancements

- Configuration retrieval: <100ms (uncached), <50ms (cached)
- Cache hit ratio: >95%
- Environment detection: <500ms (cold), <5ms (cached)
- Component security boundary: <10% CPU overhead
- Rate limiting: <8% CPU overhead

### General Performance

- Test coverage: JavaScript 95%+, Groovy 100%
- Build time reduction: 84% size reduction in production
- Database access: All queries via repository pattern
- Security rating: 8.5/10 (baseline), 9.0/10 (with ADR-077)

## Related Documentation

### Architecture Decision Records

- **ADR-031**: Groovy Type Safety and Filtering Patterns
- **ADR-042**: Dual Authentication Context Management
- **ADR-043**: PostgreSQL Type Casting Conventions
- **ADR-057**: JavaScript Module Loading Pattern
- **ADR-058**: Global SecurityUtils Access Pattern
- **ADR-059**: SQL Schema-First Development Principle
- **ADR-060**: BaseEntityManager Interface Compatibility Pattern
- **ADR-064**: UMIG Namespace Prefixing
- **ADR-067**: Session Security Enhancement (BLOCKED - use ADR-071)
- **ADR-068**: SecurityUtils Enhancement
- **ADR-069**: Component Security Boundary Enforcement
- **ADR-070**: Component Lifecycle Security
- **ADR-071**: Privacy-First Security Architecture
- **ADR-072**: Dual-Track Testing Strategy
- **ADR-073**: Enhanced 4-Tier Environment Detection Architecture
- **ADR-074**: ComponentLocator ScriptRunner Compatibility Fix
- **ADR-075**: Two-Parameter Environment Detection Pattern
- **ADR-076**: Configuration Data Management Pattern
- **ADR-077**: Fail-Secure Authentication Architecture

### TOGAF Documentation

- **Phase B**: Business Architecture
- **Phase C**: Application Architecture, Data Architecture
- **Phase D**: Technology Architecture, Security Architecture

---

_This technology stack documentation is actively maintained and updated with each sprint's architectural enhancements._
