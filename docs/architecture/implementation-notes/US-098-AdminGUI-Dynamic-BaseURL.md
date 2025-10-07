# US-098 AdminGUI Dynamic Base URL Configuration

**Date**: 2025-10-07
**Branch**: `bugfix/uat-deployment-issues`
**Related**: US-098 Configuration Management System, ADR-042 (Authentication)

## Problem Statement

The AdminGUI interface had a hard-coded API base URL (`/rest/scriptrunner/latest/custom`) in `admin-gui.js` line 66, which caused failures in UAT environment where the URL was being corrupted from "latest" to "1.tom". This hard-coded path escaped the US-098 configuration abstraction layer.

### Root Cause Analysis

1. **Hard-coded path**: `/rest/scriptrunner/latest/custom` in JavaScript
2. **Environment-specific behavior**: UAT URL corruption pattern
3. **Missing configuration injection**: Macro wasn't providing API base URL
4. **No fallback mechanism**: Single point of failure for URL construction

## Solution Implementation

### 1. Dynamic BaseURL Getter in admin-gui.js

**File**: `src/groovy/umig/web/js/admin-gui.js`
**Lines**: 64-104

Converted `baseUrl` from a static property to a dynamic getter with three-tier fallback:

```javascript
api: {
  // Dynamic baseUrl getter implementing US-098 configuration patterns
  get baseUrl() {
    // Tier 1: Check injected configuration from macro (preferred)
    if (window.UMIG_CONFIG && window.UMIG_CONFIG.api && window.UMIG_CONFIG.api.baseUrl) {
      console.debug('[AdminGUI] Using baseUrl from UMIG_CONFIG:', window.UMIG_CONFIG.api.baseUrl);
      return window.UMIG_CONFIG.api.baseUrl;
    }

    // Tier 2: Construct from window.location (works in all environments)
    if (window.location && window.location.origin) {
      const constructedUrl = `${window.location.origin}/rest/scriptrunner/latest/custom`;
      console.debug('[AdminGUI] Constructed baseUrl from window.location:', constructedUrl);
      return constructedUrl;
    }

    // Tier 3: Hard-coded fallback for development (last resort)
    console.warn('[AdminGUI] Using hard-coded baseUrl fallback');
    return "/rest/scriptrunner/latest/custom";
  },
  endpoints: { ... }
}
```

**Fallback Chain**:

1. **Tier 1**: `window.UMIG_CONFIG.api.baseUrl` (injected by macro - environment-aware)
2. **Tier 2**: Constructed from `window.location.origin` (works in all environments)
3. **Tier 3**: Hard-coded default (development fallback)

### 2. Configuration Injection in AdminGUI Macro

**File**: `src/groovy/umig/macros/v1/adminGuiMacro.groovy`
**Lines**: 33-43, 411-439

#### Configuration Construction (Lines 33-43)

```groovy
// US-098 Configuration Management: Web resources and API base URL
def webResourcesPath = ConfigurationService.getString('umig.web.root', '/rest/scriptrunner/latest/custom/web')

// Construct API base URL for environment-aware configuration
def apiBaseUrl = ConfigurationService.getString('umig.api.base.url', null)
if (!apiBaseUrl) {
    // Fallback: construct from web resources path (remove /web suffix)
    apiBaseUrl = webResourcesPath.replaceAll('/web$', '')
}
```

#### Window Configuration Injection (Lines 411-439)

```groovy
<script type="text/javascript">
    window.UMIG_CONFIG = {
        confluence: {
            username: "${confluenceUsername}",
            fullName: "${confluenceFullName}",
            email: "${confluenceEmail}"
        },
        api: {
            baseUrl: "${apiBaseUrl}",
            webResourcesPath: "${webResourcesPath}"
        },
        environment: {
            code: "${ConfigurationService.getCurrentEnvironment()}",
            detected: "server-side"
        },
        features: {
            superAdminEnabled: true,
            bulkOperations: true,
            exportEnabled: true
        }
    };
    console.log('[UMIG] Configuration loaded:', {
        environment: window.UMIG_CONFIG.environment.code,
        apiBaseUrl: window.UMIG_CONFIG.api.baseUrl,
        webResourcesPath: window.UMIG_CONFIG.api.webResourcesPath
    });
</script>
```

## Architecture Alignment

### US-098 Configuration Management System

This implementation follows US-098 patterns:

1. **ConfigurationService Integration**: Uses `ConfigurationService.getString()` for environment-aware configuration
2. **4-Tier Hierarchy**: Leverages existing database → environment → default fallback chain
3. **Environment Detection**: Uses `ConfigurationService.getCurrentEnvironment()` for accurate detection
4. **Caching Support**: Benefits from ConfigurationService's 5-minute TTL cache

### Configuration Keys

New optional configuration keys (backward compatible):

- `umig.api.base.url`: Direct API base URL override (if needed)
- `umig.web.root`: Web resources path (already existed from US-098 Phase 5E)

### ADR Compliance

- **ADR-031/043**: Type safety with explicit casting in Groovy
- **ADR-042**: Authentication context maintained through configuration
- **ADR-059**: Schema-first approach - configuration from database

## Testing Considerations

### Browser Console Validation

```javascript
// Check injected configuration
console.log(window.UMIG_CONFIG);

// Verify dynamic baseUrl resolution
console.log(window.adminGui.api.baseUrl);

// Check fallback chain
delete window.UMIG_CONFIG; // Simulate missing config
console.log(window.adminGui.api.baseUrl); // Should use window.location
```

### Environment-Specific Behavior

| Environment     | Expected baseUrl                                                     | Configuration Source                           |
| --------------- | -------------------------------------------------------------------- | ---------------------------------------------- |
| DEV (localhost) | `http://localhost:8090/rest/scriptrunner/latest/custom`              | Tier 2 (constructed) or Tier 1 (if configured) |
| UAT             | `https://confluence-evx.corp.ubp.ch/rest/scriptrunner/latest/custom` | Tier 1 (macro injection)                       |
| PROD            | `https://confluence.corp.ubp.ch/rest/scriptrunner/latest/custom`     | Tier 1 (macro injection)                       |

### Backward Compatibility

The implementation is fully backward compatible:

1. **No configuration needed**: Works out of the box with Tier 2 (window.location construction)
2. **Existing code unchanged**: All `this.api.baseUrl` references work automatically
3. **Graceful degradation**: Falls back through all tiers if configuration missing

## Deployment Notes

### No Database Migration Required

This is a code-only change - no schema modifications needed.

### ScriptRunner Cache Refresh

After deployment, refresh ScriptRunner cache to load updated JavaScript:

1. Navigate to Confluence Admin
2. ScriptRunner → Script Roots
3. Click "Refresh" or restart Confluence

### UAT Testing Priority

**Critical**: Test specifically in UAT environment where the URL corruption was observed:

1. Clear browser cache
2. Load AdminGUI macro page
3. Check browser console for configuration logs
4. Verify API calls use correct base URL (no "1.tom" corruption)
5. Test authentication and data loading

## Monitoring & Validation

### Console Logs to Watch For

**Success Indicators**:

```
[UMIG] Configuration loaded: {environment: "UAT", apiBaseUrl: "...", ...}
[AdminGUI] Using baseUrl from UMIG_CONFIG: https://confluence-evx.corp.ubp.ch/rest/scriptrunner/latest/custom
```

**Warning Indicators** (acceptable in development):

```
[AdminGUI] Constructed baseUrl from window.location: http://localhost:8090/rest/scriptrunner/latest/custom
```

**Error Indicators** (investigate immediately):

```
[AdminGUI] Using hard-coded baseUrl fallback - configuration injection may have failed
```

### API Call Verification

Monitor network tab for API requests - all should use the correct base URL without "1.tom" corruption:

- ✅ `https://confluence-evx.corp.ubp.ch/rest/scriptrunner/latest/custom/users/current`
- ❌ `https://confluence-evx.corp.ubp.ch/rest/scriptrunner/1.tom/custom/users/current`

## Related Documentation

- **US-098**: Configuration Management System (`docs/roadmap/sprint8/US-098-configuration-management-system.md`)
- **ADR-042**: Authentication Patterns (`docs/architecture/adr/ADR-042-authentication-patterns.md`)
- **ConfigurationService**: `src/groovy/umig/service/ConfigurationService.groovy`
- **UrlConstructionService**: `src/groovy/umig/utils/UrlConstructionService.groovy` (similar pattern)

## Future Enhancements

### Optional Database Configuration

If needed, administrators can add environment-specific API base URLs to the database:

```sql
-- Example: Override API base URL for specific environment
INSERT INTO system_configuration_scf
  (scf_key, scf_value, scf_category, env_id, scf_is_active)
VALUES
  ('umig.api.base.url', 'https://custom-url.corp.ubp.ch/rest/scriptrunner/latest/custom',
   'API_CONFIGURATION', <env_id>, true);
```

### Cross-Browser Testing

Test the dynamic URL construction across:

- Chrome/Edge (primary)
- Firefox
- Safari (if applicable)

## Success Criteria

- [x] Hard-coded URL replaced with dynamic getter
- [x] Three-tier fallback chain implemented
- [x] ConfigurationService integration complete
- [x] Environment detection included
- [x] Console logging for debugging
- [x] Backward compatibility maintained
- [x] No database migration required
- [ ] UAT environment testing (pending deployment)
- [ ] User "GUQ" authentication test (pending UAT)

## Author & Review

**Implemented By**: Claude Code
**Date**: 2025-10-07
**Reviewed By**: [Pending]
**Approved By**: [Pending]

---

_This document tracks the implementation of dynamic base URL configuration for AdminGUI, completing the US-098 configuration abstraction layer._
