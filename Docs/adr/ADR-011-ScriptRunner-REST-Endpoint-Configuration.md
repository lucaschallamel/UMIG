# ADR-011: ScriptRunner REST Endpoint Configuration

**Status:** Accepted

**Date:** 2025-06-19

## Context

The project requires a stable, maintainable, and scalable method for defining and deploying Groovy-based REST endpoints in ScriptRunner for Confluence. Initial development attempts using manual UI registration and various system properties (e.g., `-Dplugin.scriptrunner.home`) resulted in persistent runtime errors (`bundle://... Cannot open URL`). These errors indicated that while ScriptRunner could discover the endpoints, it failed to locate the script files at execution time.

## Decision

We will exclusively use file-based REST endpoints coupled with ScriptRunner's automatic "Script Root Scanning" feature. This approach removes manual configuration and ensures reliability.

The configuration is managed in `podman-compose.yml` by setting two specific Java system properties via `CATALINA_OPTS`:

1.  `-Dplugin.script.roots=/var/atlassian/application-data/confluence/scripts/groovy`: This property points to the root directory that contains the Groovy package structure.
2.  `-Dplugin.rest.scripts.package=v1.teams`: This property provides a comma-delimited list of packages that ScriptRunner should scan for REST endpoints.

All endpoint `.groovy` files must meet two criteria:
1.  Be placed within the appropriate package structure under `src/groovy/`.
2.  **Declare their package at the top of the file** (e.g., `package v1.teams`). This is mandatory for the classloader to resolve the script path correctly.

## Consequences

### Positive

-   **Zero Manual Registration:** Eliminates the need to manually add or update endpoints in the ScriptRunner UI.
-   **Automatic Discovery:** Endpoints are automatically discovered and registered when Confluence starts, streamlining development.
-   **Resolves Runtime Errors:** Correctly configures the script path, permanently fixing the `bundle://` file loading errors.
-   **Improved Structure:** Enforces a clean, package-based organization for all REST endpoint scripts, enhancing code maintainability.
-   **Version Controlled:** The entire configuration is stored and versioned in `podman-compose.yml`.

### Negative

-   **Requires Container Recreation:** Changes to `CATALINA_OPTS` in `podman-compose.yml` require the container to be fully recreated (`--force-recreate`) to take effect.
-   **Configuration Abstraction:** Developers must understand the relationship between the volume mount, the `script.roots` property, and the `rest.scripts.package` property for the system to work correctly.
