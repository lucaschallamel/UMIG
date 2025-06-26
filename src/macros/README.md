# Macro Coding Patterns (UMIG)

This document outlines the conventions for Groovy UI macros in ScriptRunner for UMIG.

## General Principles
- **One macro file per UI component** (e.g., `userListMacro.groovy`).
- **Minimal HTML:** Macros should only render a container div and load the appropriate JS/CSS assets.
- **No business logic:** Macros do not fetch data or perform logic; all dynamic behavior is in JS.
- **Data attributes:** Use data attributes on container divs for passing context if needed.
- **AUI Styles:** Use Atlassian AUI classes for containers and buttons.

## Example
```groovy
// src/macros/userListMacro.groovy
def html = '''
<div id="user-list-container"></div>
<script src="/s/scripts/user-list.js"></script>
'''
return html
```

## See Also
- [Frontend SPA Pattern](../web/README.md)
- [ADR020 - SPA+REST Pattern](../../docs/adr/ARD020-spa-rest-admin-entity-management.md)
