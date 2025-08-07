# ADR-011: ScriptRunner REST Endpoint Configuration and Implementation

**Status:** Accepted

**Date:** 2025-06-25 (Updated)

## Context

The project requires a stable, maintainable, and scalable method for defining and deploying Groovy-based REST endpoints in ScriptRunner for Confluence. Initial development attempts resulted in two primary issues:

1. **Runtime Errors:** Using manual UI registration or incorrect system properties led to `bundle://... Cannot open URL` errors, where ScriptRunner could discover endpoints but not locate the script files at execution time.
2. **Compilation Errors:** Attempts to use certain implementation patterns (e.g., `@Endpoint` annotation) resulted in `unable to resolve class` errors, preventing the scripts from compiling and registering.

## Decision

We will exclusively use file-based REST endpoints coupled with ScriptRunner's automatic "Script Root Scanning" feature. This approach combines a specific environment configuration with a mandatory implementation pattern to ensure reliability and correctness.

### 1. Environment Configuration

The configuration is managed in `podman-compose.yml` by setting two specific Java system properties via `CATALINA_OPTS`:

- `-Dplugin.script.roots=/var/atlassian/application-data/confluence/scripts`: This property points to the root directory that contains the Groovy package structure.
- `-Dplugin.rest.scripts.package=com.umig.api.v1,com.umig.api.v2`: This property provides a comma-delimited list of packages that ScriptRunner should scan for REST endpoints.

### 2. Implementation Pattern

All endpoint `.groovy` files must meet three criteria:

1. Be placed within the appropriate package structure under `src/`.
2. **Declare their package at the top of the file** (e.g., `package com.umig.api.v2`). This is mandatory for the classloader to resolve the script path correctly.
3. **Implement the `CustomEndpointDelegate` pattern.** This is the standard, officially documented pattern for creating robust REST endpoints and is required to avoid compilation errors.

The key components of this pattern are:

- **Annotation:** `@BaseScript com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate delegate`
- **Method-based Endpoints:** Each HTTP verb is handled by a separate method invocation named after the resource.
- **Path Parameters:** Handled using the `getAdditionalPath(request)` helper method.

```groovy
// Example: src/com/umig/api/v2/Plans.groovy
package com.umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import groovy.transform.BaseScript
// ... other imports

@BaseScript CustomEndpointDelegate delegate

plans(httpMethod: "GET", groups: ["confluence-users"]) { /* ... closure body ... */ }
plans(httpMethod: "POST", groups: ["confluence-users"]) { /* ... closure body ... */ }
```

## Consequences

### Positive

- **Zero Manual Registration:** Eliminates the need to manually add or update endpoints in the ScriptRunner UI.
- **Automatic Discovery:** Endpoints are automatically discovered and registered when Confluence starts.
- **Resolves Runtime & Compilation Errors:** Correctly configures the script path and enforces a valid implementation pattern, fixing both `bundle://` and `unable to resolve class` errors.
- **Improved Structure:** Enforces a clean, package-based organization for all REST endpoint scripts.
- **Version Controlled:** The entire configuration is stored and versioned in `podman-compose.yml`.

### Negative

- **Requires Container Recreation:** Changes to `CATALINA_OPTS` in `podman-compose.yml` require the container to be fully recreated (`--force-recreate`) to take effect.
- **Configuration Abstraction:** Developers must understand the relationship between the volume mount, the `script.roots` property, and the `rest.scripts.package` property.
- **URL Structure:** The `CustomEndpointDelegate` pattern generates URLs under the `/rest/scriptrunner/latest/custom/` path. The full URL, including the Confluence context path (defaulting to `/confluence`), is `http://<host>:<port>/confluence/rest/scriptrunner/latest/custom/<endpoint_name>`. For local development, an example is `http://localhost:8090/confluence/rest/scriptrunner/latest/custom/plans`. This differs from a more conventional `/api/v2/plans` structure and may require a reverse proxy or URL rewriting if a custom URL scheme is desired.
