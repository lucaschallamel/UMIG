# Macro Scripts (UMIG)

This folder contains all ScriptRunner UI macro scripts for UMIG.

## Responsibilities
- **Render only the container `<div>` for the UI component.**
- **Load the required JS and CSS assets** (do not inline large assets; reference via `<script>`/`<link>` tags).
- **No business logic or data fetching**—all dynamic behavior must be in the frontend JS.
- **Naming:** One macro file per UI component, named after the feature/view it renders (e.g., `iterationViewMacro.groovy`).
- **Versioning:** Use subfolders like `v1/` for breaking changes or parallel development.

## Example
```groovy
// umig/macros/iterationViewMacro.groovy
return '''
<div id="umig-iteration-view-root"></div>
<link rel="stylesheet" href="/s/groovy/umig/web/css/iteration-view.css">
<script src="/s/groovy/umig/web/js/iteration-view.js"></script>
'''
```

## References
- See `/src/groovy/umig/web/README.md` for asset management.
- See project rules for UI and macro coding standards.
```

## See Also
- [Frontend SPA Pattern](../web/README.md)
- [ADR020 - SPA+REST Pattern](../../docs/adr/ARD020-spa-rest-admin-entity-management.md)
