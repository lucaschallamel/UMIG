# Macro Scripts (UMIG)

**Purpose**: ScriptRunner UI macro scripts for UMIG with container rendering, asset loading, and versioned deployment

## Key Components

- **v1/adminGuiMacro.groovy** - Unified admin interface with CRUD operations, role-based access, pagination
- **v1/iterationViewMacro.groovy** - Primary runsheet interface with hierarchical filtering, real-time collaboration
- **v1/stepViewMacro.groovy** - Standalone step view with URL parameters and role-based controls
- **Asset management** - JS/CSS reference via script/link tags (no inline assets)
- **Versioning structure** - v1/ subfolders for breaking changes and parallel development

## Responsibilities

- **Container rendering** - Render only container div for UI components
- **Asset loading** - Load required JS/CSS assets via script/link tags
- **No business logic** - All dynamic behavior in frontend JS
- **Naming convention** - One macro per UI component, feature-based naming
- **Version control** - Subfolder versioning for breaking changes

## Macro Features

- **adminGuiMacro** - Users, teams, environments, applications, labels management
- **iterationViewMacro** - Cutover events, status tracking, real-time collaboration
- **stepViewMacro** - Individual step embedding, instruction tracking, comment management
- **Asset optimization** - US-088 build process integration with 84% size reduction
- **Performance enhancement** - ComponentOrchestrator integration with ADR-061 patterns

## Integration

- **Build process** - US-088 4-phase orchestration with self-contained deployment
- **Database compatibility** - US-088-B Liquibase schema integration
- **Security alignment** - ADR-061 ScriptRunner endpoint patterns
- **Component architecture** - ComponentOrchestrator integration for lifecycle management

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
