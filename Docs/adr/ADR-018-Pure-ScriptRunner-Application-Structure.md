# ADR-018: Pure ScriptRunner Application Structure

**Date**: 2025-06-25

**Status**: Accepted

## Context

The UMIG application must be deployed into a Confluence environment using only ScriptRunner. The deployment process needs to be simple, automatable, and confined, allowing the application to be unpacked into a shared scripts directory without conflicting with other applications or requiring a formal Java plugin compilation process.

## Decision Drivers

- The desire to avoid the complexity of a formal Confluence plugin structure (i.e., `atlassian-plugin.xml`, Maven builds).
- The need for a lean, easily automatable deployment process (e.g., copy and extract a tarball).
- The requirement to keep all application files (backend logic, UI macros, web assets) organized within a single, coherent project structure.
- The need to prevent naming collisions with other scripts on the same Confluence instance.

## Considered Options

1.  **Standard Confluence Plugin Structure**: Using `src/main/java`, `src/main/resources`, and `atlassian-plugin.xml`. This was rejected as it introduces unnecessary build complexity and does not align with the goal of a simple, script-based deployment.
2.  **Flat Script Structure**: Placing all Groovy scripts, macros, and assets in a single folder. This was rejected as it lacks organization, separation of concerns, and poses a high risk of naming conflicts.
3.  **Packaged Pure ScriptRunner Structure**: A structured, packaged layout within a single source directory, relying entirely on ScriptRunner's features.

## Decision Outcome

We will adopt Option 3. The project's source code will be organized as follows:

```
src/
├── com/umig/         # Packaged backend code (API, Repository)
├── macros/           # ScriptRunner Script Macros for UI rendering
└── web/              # CSS and JS assets for the frontend
```

- **Backend Code (`com/umig/`)**: All backend Groovy classes will be placed in a Java-style package to prevent naming conflicts. ScriptRunner's REST Endpoint feature will scan this package for API endpoints.
- **Macros (`macros/`)**: UI will be rendered by ScriptRunner Script Macros. These Groovy scripts will generate the necessary HTML shell.
- **Web Assets (`web/`)**: CSS and JavaScript files will be served via a dedicated, simple REST endpoint that reads from this directory. This approach is chosen over programmatic methods (e.g., `WebInterfaceManager`) for its simplicity, robustness, and loose coupling from Confluence's internal APIs. It provides a single, scalable mechanism for serving all frontend assets and supersedes legacy script fragment patterns.

This structure provides a clean separation of concerns while remaining 100% within the ScriptRunner ecosystem, enabling a simple and robust deployment model.

## Validation

This architecture will be considered successful when we can bundle the contents of the `src` directory, deploy it to a Confluence instance, and have the API, macros, and UI function correctly without any manual compilation steps.