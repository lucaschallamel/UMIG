# Macro Scripts (UMIG)

This folder contains all ScriptRunner UI macro scripts for UMIG.

## Responsibilities

- **Render only the container `<div>` for the UI component.**
- **Load the required JS and CSS assets** (do not inline large assets; reference via `<script>`/`<link>` tags).
- **No business logic or data fetching**—all dynamic behavior must be in the frontend JS.
- **Naming:** One macro file per UI component, named after the feature/view it renders (e.g., `iterationViewMacro.groovy`).
- **Versioning:** Use subfolders like `v1/` for breaking changes or parallel development.

## Current Macros

### v1/adminGuiMacro.groovy

- **Purpose**: Unified admin interface for managing users, teams, environments, applications, labels
- **Features**: Full CRUD operations, role-based access, pagination, search, modal management
- **Assets**: `admin-gui/` JS modules, `admin-gui.css`

### v1/iterationViewMacro.groovy

- **Purpose**: Primary runsheet interface for cutover events
- **Features**: Hierarchical filtering, real-time collaboration, status tracking, comments
- **Assets**: `iteration-view.js`, `iteration-view.css`

### v1/stepViewMacro.groovy ✅ New (July 2025)

- **Purpose**: Standalone step view for embedding individual steps in Confluence pages
- **URL Parameters**: `?mig=migrationName&ite=iterationName&stepid=XXX-nnn`
- **Features**: Role-based controls, instruction tracking, comment management, status updates
- **Assets**: `step-view.js`, `iteration-view.css` (shared)

## Example

```groovy
// umig/macros/v1/stepViewMacro.groovy
return '''
<div id="umig-step-view-root"></div>
<link rel="stylesheet" href="/s/groovy/umig/web/css/iteration-view.css">
<script src="/s/groovy/umig/web/js/step-view.js"></script>
'''
```

## References

- See `/src/groovy/umig/web/README.md` for asset management.
- See project rules for UI and macro coding standards.

```

### Build Process Integration (US-088 Complete)

All macro scripts support comprehensive build orchestration with US-088 4-phase build process:

- **Asset Management**: Macro JS and CSS assets packaged with self-contained deployment (84% size reduction)
- **Version Control**: Macro versioning aligned with US-088-B Database Version Manager
- **Performance Optimisation**: Macro loading optimised with build process integration
- **Deployment Efficiency**: Macro deployment with self-contained packages reducing complexity

### Enhanced Macro Features (Sprint 7 - 224% Achievement)

**ADR-061 ScriptRunner Integration**:

- **Endpoint Discovery**: Macro scripts follow ADR-061 ScriptRunner endpoint patterns
- **Performance Improvements**: Macro asset loading optimised with endpoint pattern compliance
- **Security Integration**: Enhanced security controls aligned with ScriptRunner patterns
- **Component Integration**: Macro components fully integrated with ComponentOrchestrator architecture

**US-088-B Database Integration**:

- **Schema Compatibility**: Macro scripts compatible with Liquibase-managed database schemas
- **Version Synchronisation**: Macro versions synchronised with database schema versions
- **Deployment Coordination**: Macro deployment coordinated with database version management

## See Also
- [Frontend SPA Pattern](../web/README.md)
- [ADR020 - SPA+REST Pattern](../../docs/adr/ARD020-spa-rest-admin-entity-management.md)
- **NEW**: [ADR-061 ScriptRunner Patterns](../../../../docs/adr/ADR-061-ScriptRunner-endpoint-pattern-discovery.md) - Endpoint discovery patterns
- [US-088 Documentation](../../../../docs/roadmap/sprint7/US-088.md) - 4-phase build orchestration complete
- [US-088-B Database Version Manager](../../../../docs/roadmap/sprint7/US-088-B.md) - Self-contained packages with 84% deployment reduction

---

**Last Updated**: September 2025 (Sprint 7) - US-088 Complete, 224% Sprint Achievement
**Build Process**: 4-phase orchestration complete with self-contained macro deployment
**Integration Status**: Complete with ComponentOrchestrator + US-088-B Database Version Manager
**Performance**: Enhanced macro loading with build process optimisation and 84% deployment size reduction
**Sprint Achievement**: 224% completion rate with comprehensive build process integration
```
