# Frontend (SPA) Coding Patterns (UMIG)

This document describes the conventions for all frontend code in the UMIG project, especially for ScriptRunner-based SPAs.

## General Principles
- **One JS file per entity** (e.g., `user-list.js`).
- **SPA pattern:** All navigation and rendering is handled client-side in a single container div.
- **AJAX/Fetch:** All data is loaded via REST API calls (see `/src/com/umig/api/`).
- **Dynamic rendering:** Tables and forms are generated from entity fields, not hardcoded.
- **Type handling:** Ensure all payloads match backend expectations (booleans, numbers, etc.).
- **AUI Styles:** Use Atlassian AUI for all UI elements.
- **Error handling:** Show clear error messages for all failed API calls.

## Example
```js
// src/web/js/user-list.js
fetch(`/rest/scriptrunner/latest/custom/users/1`)
  .then(res => res.json())
  .then(user => renderUserDetail(user));
```

## See Also
- [Macro Coding Patterns](../macros/README.md)
- [ADR020 - SPA+REST Pattern](../../docs/adr/ARD020-spa-rest-admin-entity-management.md)
