# Web Assets for Macros (UMIG)

This folder contains all JavaScript and CSS assets used by UMIG macros.

## Structure
- `js/`: All macro frontend JavaScript files
- `css/`: All macro frontend CSS files

## Usage
- Each macro references its assets via `<script>` and `<link>` tags (see macros/README.md).
- **Do not inline large assets in Groovy scripts.**
- Versioning: If you need to support multiple versions, use subfolders (e.g., `js/v1/`).

## How Assets Are Served in Confluence
- **Recommended:** Use ScriptRunner's static resource servlet to serve assets from this folder. This enables maintainable, version-controlled asset delivery.
- **Alternative:** Attach assets to a Confluence page and reference them by URL, or use a web server if available.
- **Important:** Update asset URLs in macros if the serving method changes. Document the serving method here for future maintainers.

## Example
```groovy
// In a macro script
return '''
<div id="umig-iteration-view-root"></div>
<link rel="stylesheet" href="/s/groovy/umig/web/css/iteration-view.css">
<script src="/s/groovy/umig/web/js/iteration-view.js"></script>
'''
```

## References
- See macros/README.md for macro/asset integration patterns.
- [ADR020 - SPA+REST Pattern](../../docs/adr/ARD020-spa-rest-admin-entity-management.md)
