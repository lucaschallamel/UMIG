# US-097: Include-Based Version Management System

**Story Points**: 13
**Priority**: Medium
**Epic**: Infrastructure Modernization
**Sprint**: Future (Backlog)
**Created**: 2025-09-25

## User Story

As a **DevOps engineer and system administrator**,
I want **centralized version management through include files for both Groovy and JavaScript domains**,
So that **I can maintain consistent versioning across all UMIG components without manual synchronization**.

## Background

Currently, UMIG components manage versions inconsistently:
- Admin GUI hardcodes version in `adminGuiMacro.groovy` line 31: `def jsVersion = "3.9.8"`
- REST APIs use implicit v2.x.y versioning without centralized control
- UI Macros follow v1.x.y pattern but lack systematic management
- JavaScript components have no version tracking
- Build manifests cannot accurately report component versions

This creates deployment confusion and maintenance overhead.

## Acceptance Criteria

### Phase 1: Foundation (5 points)

**AC1.1**: Create centralized version include files
- `src/groovy/umig/includes/versions.groovy` for Groovy domain
- `src/groovy/umig/web/js/includes/versions.js` for JavaScript domain
- Support for semantic versioning (MAJOR.MINOR.PATCH) with build metadata

**AC1.2**: Implement version family structure
- REST APIs: `v2.x.y` family for all API endpoints
- UI Macros: `v1.x.y` family for adminGuiMacro, iterationViewMacro, stepViewMacro
- JS Components: New version family for ComponentOrchestrator, BaseComponent, etc.

**AC1.3**: Create version accessor utilities
- Groovy: `VersionUtils.getApiVersion()`, `VersionUtils.getMacroVersion(macroName)`
- JavaScript: `window.UMIG.versions.getComponentVersion(componentName)`

### Phase 2: Migration (5 points)

**AC2.1**: Replace hardcoded versions in Groovy components
- Update `adminGuiMacro.groovy` line 31 to use include-based version
- Update all API endpoints to use centralized version management
- Ensure backward compatibility during migration

**AC2.2**: Implement JavaScript version integration
- Integrate with ComponentOrchestrator for version reporting
- Update component registration to include version metadata
- Add version display in admin interface

**AC2.3**: Update build system integration
- Modify MetadataGenerator.js to read from include files
- Ensure build manifests report accurate component versions
- Add version validation in build process

### Phase 3: Validation & Documentation (3 points)

**AC3.1**: Comprehensive testing
- Unit tests for version utilities in both domains
- Integration tests for build system version reporting
- Validation that all components report consistent versions

**AC3.2**: Documentation and guidelines
- Update CLAUDE.md with version management patterns
- Create developer guidelines for version updates
- Document release process with version coordination

**AC3.3**: Admin interface enhancement
- Update web component version display to use new system
- Add version history tracking capability
- Ensure deployment packages include accurate version information

## Technical Implementation Notes

### Groovy Include Structure
```groovy
// src/groovy/umig/includes/Versions.groovy
class Versions {
    // REST API Family - v2.x.y
    public static final String API_MAJOR = "2"
    public static final String API_MINOR = "1"
    public static final String API_PATCH = "0"

    // UI Macro Family - v1.x.y
    public static final String MACRO_MAJOR = "1"
    public static final String MACRO_MINOR = "4"
    public static final String MACRO_PATCH = "2"

    // Utility methods
    static String getApiVersion() {
        return "${API_MAJOR}.${API_MINOR}.${API_PATCH}"
    }

    static String getMacroVersion(String macroName = null) {
        return "${MACRO_MAJOR}.${MACRO_MINOR}.${MACRO_PATCH}"
    }
}
```

### JavaScript Include Structure
```javascript
// src/groovy/umig/web/js/includes/versions.js
window.UMIG = window.UMIG || {};
window.UMIG.versions = {
    // Component Family - v1.x.y
    COMPONENT_MAJOR: "1",
    COMPONENT_MINOR: "0",
    COMPONENT_PATCH: "0",

    // Utility methods
    getComponentVersion: function(componentName) {
        return `${this.COMPONENT_MAJOR}.${this.COMPONENT_MINOR}.${this.COMPONENT_PATCH}`;
    },

    // Build metadata
    getBuildInfo: function() {
        return {
            component: this.getComponentVersion(),
            timestamp: '<!-- BUILD_TIMESTAMP -->', // Replaced by build process
            commit: '<!-- GIT_COMMIT -->' // Replaced by build process
        };
    }
};
```

## Dependencies

- **Depends on**: US-088 Phase 3 (build system completion)
- **Blocks**: Future release management automation
- **Related**: Component architecture (US-082)

## Definition of Done

- [ ] All hardcoded versions replaced with include-based system
- [ ] Build manifests report accurate component versions
- [ ] Admin interface displays consistent version information
- [ ] Developer documentation updated with version management guidelines
- [ ] All tests passing with version system integration
- [ ] Backward compatibility maintained during migration

## Risk Assessment

**Risk Level**: Medium

**Primary Risks**:
1. **Backward Compatibility**: Changes to version reporting might affect existing integrations
2. **Build Process Integration**: Complex interaction with existing build manifest generation
3. **Cross-Domain Coordination**: Synchronizing Groovy and JavaScript version updates

**Mitigation Strategies**:
- Implement gradual migration with fallback mechanisms
- Comprehensive testing of build system integration
- Clear documentation of version update procedures

## Business Value

**Primary Benefits**:
- Eliminates manual version synchronization errors
- Enables accurate deployment tracking and audit trails
- Simplifies release management and coordination
- Improves deployment package accuracy and reliability

**Metrics**:
- Reduce version-related deployment issues by 90%
- Decrease manual version update time from 15 minutes to 2 minutes
- Achieve 100% accurate version reporting in build manifests

---

*This user story was generated as part of the US-088 build system completion work and addresses the systematic version management requirements identified during Phase 3 implementation.*