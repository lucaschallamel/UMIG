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

## See Also
- [Frontend SPA Pattern](../web/README.md)
- [ADR020 - SPA+REST Pattern](../../docs/adr/ARD020-spa-rest-admin-entity-management.md)
