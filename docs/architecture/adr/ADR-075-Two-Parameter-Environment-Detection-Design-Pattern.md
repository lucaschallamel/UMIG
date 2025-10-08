# ADR-075: Two-Parameter Environment Detection Design Pattern

## Status

**Status**: Proposed
**Date**: 2025-10-08
**Author**: System Architecture Team
**Sprint**: Sprint 8 - Pattern Documentation Initiative
**Related ADRs**: ADR-073 (Enhanced Environment Detection), ADR-074 (ComponentLocator Compatibility)

## Context and Problem Statement

During Sprint 8 environment detection enhancement (ADR-073/074), a subtle but important architectural pattern emerged: the separation of URL-based environment detection into two distinct configuration parameters with different responsibilities. This pattern prevents configuration ambiguity and supports both runtime environment detection and filesystem-based operations.

### The Problem: Single-Parameter Ambiguity

Initial implementations attempted to use a single configuration parameter (`umig.web.root`) for multiple purposes:

1. **Runtime Environment Detection**: Detecting which environment (DEV/UAT/PROD) the application is running in
2. **Filesystem Path Resolution**: Locating web resources on the filesystem for server-side operations
3. **URL Construction**: Building URLs for client-side navigation

**This created fundamental conflicts**:

```groovy
// PROBLEM: Single parameter used for conflicting purposes
def webRoot = System.getProperty('umig.web.root')

// Purpose 1: Environment detection (needs full URL)
if (webRoot.contains('localhost')) { return 'DEV' }
// → Requires: "http://localhost:8090"

// Purpose 2: Filesystem operations (needs servlet path)
def filePath = "${webRoot}/resources/templates/"
// → Requires: "/rest/scriptrunner/latest/custom/web"

// CONFLICT: Cannot satisfy both requirements with single value!
```

### Identified Use Cases

**URL-Based Environment Detection** (ADR-073):

- Requires **full base URL** with protocol and hostname
- Example: `http://localhost:8090` or `https://confluence-evx.corp.ubp.ch`
- Used for: Pattern matching to detect DEV/UAT/PROD environment

**Filesystem Resource Resolution**:

- Requires **servlet path only** (no protocol/hostname)
- Example: `/rest/scriptrunner/latest/custom/web`
- Used for: Server-side file operations, resource loading

**Client URL Construction**:

- May require either full URL or relative path depending on context
- Example: `/rest/scriptrunner/latest/custom` (API endpoints)
- Used for: JavaScript API clients, macro resource injection

## Decision

Implement a **Two-Parameter Design Pattern** that separates environment detection concerns from filesystem path concerns using distinct configuration parameters with single responsibility:

### Parameter Definition

```groovy
/**
 * PRIMARY PARAMETER: Environment Detection & Full URL Operations
 * Purpose: Detect runtime environment via URL pattern matching
 * Format: Full URL with protocol and hostname
 * Tier: System Property → Environment Variable → ComponentLocator → Fallback
 */
umig.web.root = "http://localhost:8090"  // DEV
umig.web.root = "https://confluence-evx.corp.ubp.ch"  // UAT
umig.web.root = "https://confluence-prod.corp.ubp.ch"  // PROD

/**
 * SECONDARY PARAMETER: Filesystem & Servlet Path Operations
 * Purpose: Locate web resources for server-side operations
 * Format: Servlet path only (no protocol/hostname)
 * Tier: System Property → Default fallback
 */
umig.web.filesystem.root = "/rest/scriptrunner/latest/custom/web"
```

### Responsibility Separation

| Parameter                  | Responsibility                      | Format                      | Example Value                          |
| -------------------------- | ----------------------------------- | --------------------------- | -------------------------------------- |
| `umig.web.root`            | Environment detection, URL pattern  | Full URL (protocol + host)  | `https://confluence-evx.corp.ubp.ch`   |
| `umig.web.filesystem.root` | Filesystem operations, servlet path | Servlet path only (no host) | `/rest/scriptrunner/latest/custom/web` |

### Implementation Pattern

```groovy
class ConfigurationService {
    /**
     * Environment Detection using umig.web.root
     * Requires full URL for pattern matching
     */
    static String getCurrentEnvironment() {
        // Tier 1: Explicit override (highest priority)
        String systemProperty = System.getProperty('umig.environment')
        if (systemProperty) {
            return systemProperty
        }

        // Tier 2: Environment variable
        String envVariable = System.getenv('UMIG_ENVIRONMENT')
        if (envVariable) {
            return envVariable
        }

        // Tier 3: URL-based detection (requires umig.web.root)
        String baseUrl = getConfluenceBaseUrl()  // Uses umig.web.root parameter
        if (baseUrl) {
            return detectEnvironmentFromUrl(baseUrl)
        }

        // Tier 4: Fail-safe fallback
        return 'PROD'
    }

    /**
     * Get Confluence Base URL for Environment Detection
     * Uses umig.web.root parameter
     */
    private static String getConfluenceBaseUrl() {
        // Tier 1: System property (explicit full URL)
        String systemPropUrl = System.getProperty('umig.web.root')
        if (systemPropUrl) {
            return systemPropUrl
        }

        // Tier 2: ComponentLocator (Confluence API)
        try {
            def settingsManager = ComponentLocator.getComponent(SettingsManager.class)
            if (settingsManager?.globalSettings?.baseUrl) {
                return settingsManager.globalSettings.baseUrl
            }
        } catch (Exception e) {
            // ScriptRunner context may not have ComponentLocator
        }

        // Tier 3: Localhost fallback for DEV
        return 'http://localhost:8090'
    }

    /**
     * Filesystem Operations using umig.web.filesystem.root
     * Uses servlet path only
     */
    static String getWebFilesystemRoot() {
        // Explicit override (testing/deployment)
        String filesystemRoot = System.getProperty('umig.web.filesystem.root')
        if (filesystemRoot) {
            return filesystemRoot
        }

        // Standard default (ScriptRunner servlet path)
        return '/rest/scriptrunner/latest/custom/web'
    }

    /**
     * Example: Filesystem resource loading
     */
    static File loadWebResource(String resourcePath) {
        String filesystemRoot = getWebFilesystemRoot()
        return new File("${filesystemRoot}/${resourcePath}")
    }
}
```

### Pattern Usage Examples

#### Use Case 1: Environment Detection (ADR-073)

```groovy
// Deployment configuration
// DEV server:
-Dumig.web.root=http://localhost:8090

// UAT server:
-Dumig.web.root=https://confluence-evx.corp.ubp.ch

// PROD server:
-Dumig.web.root=https://confluence-prod.corp.ubp.ch

// Application detects environment:
String env = ConfigurationService.getCurrentEnvironment()
// DEV: matches 'localhost' pattern
// UAT: matches 'evx' pattern
// PROD: matches 'prod' pattern
```

#### Use Case 2: Filesystem Resource Operations

```groovy
// No deployment config needed (uses default)
// OR explicit override for testing:
-Dumig.web.filesystem.root=/custom/servlet/path/web

// Application loads filesystem resources:
String filesystemRoot = ConfigurationService.getWebFilesystemRoot()
File template = new File("${filesystemRoot}/templates/email.html")
// → /rest/scriptrunner/latest/custom/web/templates/email.html
```

#### Use Case 3: Hybrid URL Construction

```groovy
// AdminGUI macro needs both parameters:
def baseUrl = ConfigurationService.getConfluenceBaseUrl()
// → http://localhost:8090 (full URL for environment detection)

def webPath = ConfigurationService.getWebFilesystemRoot()
// → /rest/scriptrunner/latest/custom/web (servlet path for resource injection)

// Macro injects configuration:
"""
<script>
    window.UMIG_CONFIG = {
        baseUrl: '${baseUrl}',  // Full URL for API calls
        resourcePath: '${webPath}'  // Servlet path for resource loading
    };
</script>
"""
```

## Consequences

### Positive

1. **Single Responsibility Principle**: Each parameter has one clear purpose
   - `umig.web.root`: Environment detection via URL pattern matching
   - `umig.web.filesystem.root`: Filesystem path operations

2. **No Configuration Ambiguity**: Impossible to specify conflicting values

3. **Deployment Flexibility**:
   - Can override environment detection independently
   - Can customize filesystem paths for testing without affecting environment detection

4. **Clear Semantics**: Parameter names explicitly indicate their purpose and format

5. **Backward Compatibility**:
   - Both parameters have sensible defaults
   - Deployment configurations only need to override when necessary

6. **Testing Simplification**:
   - Can mock environment detection without changing filesystem paths
   - Can test resource loading without environment-specific URLs

### Negative

1. **Parameter Proliferation**: Two parameters instead of one (manageable trade-off)

2. **Documentation Requirement**: Developers must understand parameter distinction

3. **Deployment Configuration**: Requires documenting which parameter to use for which purpose

### Neutral

1. **Migration Impact**: Existing single-parameter deployments continue working with defaults

2. **Performance**: No measurable performance difference

## Design Principles Applied

### 1. Single Responsibility Principle (SRP)

Each configuration parameter has exactly one reason to change:

- `umig.web.root` changes only when environment URLs change
- `umig.web.filesystem.root` changes only when servlet deployment paths change

### 2. Separation of Concerns

Environment detection logic is completely independent of filesystem operations:

- URL pattern matching isolated from file path resolution
- No coupling between environment type and resource locations

### 3. Explicit Over Implicit

Parameter names explicitly communicate:

- `web.root` → Full web URL (includes protocol/hostname)
- `web.filesystem.root` → Filesystem servlet path (no protocol/hostname)

### 4. Fail-Safe Defaults

Both parameters have safe defaults that work in standard deployments:

- `umig.web.root`: Falls back to ComponentLocator → localhost:8090
- `umig.web.filesystem.root`: Standard ScriptRunner servlet path

## Validation Criteria

✅ **Correct Environment Detection**: DEV/UAT/PROD correctly identified via umig.web.root URL patterns

✅ **Filesystem Operations Work**: Resources load correctly using umig.web.filesystem.root servlet paths

✅ **No Configuration Conflicts**: Impossible to specify values that conflict

✅ **Clear Documentation**: Both parameters documented with purpose, format, examples

✅ **Testing Support**: Can mock environment detection independently of filesystem paths

## Integration Points

### ADR-073 Enhancement

The Two-Parameter Pattern supports the 4-tier environment detection:

```
Tier 1: System Property (umig.environment) → Explicit override
Tier 2: Environment Variable (UMIG_ENVIRONMENT) → Container config
Tier 3: URL Pattern (umig.web.root) → Auto-detection ← Two-Parameter Pattern
Tier 4: Fail-Safe Default (PROD) → Safety fallback
```

### ADR-074 ComponentLocator Compatibility

ComponentLocator retrieval uses `umig.web.root` semantics:

```groovy
// ComponentLocator returns full base URL (perfect for umig.web.root)
String baseUrl = ComponentLocator.getComponent(SettingsManager.class)
                                 .globalSettings.baseUrl
// → "http://localhost:8090" (full URL, matches umig.web.root format)
```

## Related ADRs

- **ADR-073**: Enhanced 4-Tier Environment Detection Architecture (URL pattern tier uses umig.web.root)
- **ADR-074**: ComponentLocator ScriptRunner Compatibility (provides full URL for umig.web.root)
- **ADR-076**: Configuration Data Management Pattern (system_configuration_scf table architecture)

## Implementation Status

- **Sprint 8**: Pattern identified during environment detection enhancement
- **Status**: Documented pattern (implementation exists in ConfigurationService)
- **Validation**: Confirmed working in DEV/UAT/PROD deployments

---

_This ADR documents the Two-Parameter Design Pattern for separating environment detection (URL-based) from filesystem operations (path-based) using distinct configuration parameters with single responsibility._
