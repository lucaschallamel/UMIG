# Groovy Workspace Conventions for UMIG (ScriptRunner/Confluence)

## Purpose
This document captures code conventions, syntax rules, and best practices for Groovy scripts in the UMIG project, especially those used as ScriptRunner REST endpoints.

---

## General Principles
- **Explicit Typing:** Always cast parsed JSON to `Map` and check types before accessing fields. Avoid relying on Groovy's dynamic typing in REST endpoints.
- **Input Validation:** Validate all incoming data for type and presence before using it. Example: check `input.name instanceof String` and `!((input.name as String).trim()).isEmpty()`.
- **Error Handling:** Use helper methods to build consistent, structured error responses. Always return a valid `Response` object.
- **Database Access:** Use `DatabaseUtil.withSql('POOL_NAME') { Sql sql -> ... }` for all DB operations. Never hardcode credentials.
- **REST Endpoint Pattern:** Use the `CustomEndpointDelegate` pattern for all REST endpoints. Avoid annotation-based endpoints (`@Endpoint`, `@RestEndpoint`), as they may not be reliably resolved in ScriptRunner for Confluence.
- **Static Type Checking:** Ensure code passes static type checking in ScriptRunner. Explicit casts and type checks are preferred over implicit coercion.
- **Minimal Comments:** Comment only on non-obvious logic or workarounds. Keep code readable and self-explanatory.
- **Consistent Naming:** Use lowerCamelCase for method and variable names. Endpoint names should be descriptive (e.g., `createTeam`, `listTeams`).
- **Atomic Functions:** Each endpoint should do one thing (CRUD operation) and handle all errors internally.
- **JSON Responses:** Always serialize responses with `JsonBuilder` or `JsonOutput` for consistency.
- **Testing:** Test endpoints using Postman or curl. Validate both success and error responses.

---

## Example Patterns

### JSON Parsing and Validation
```groovy
def inputObj = parseJsonBody(body)
Map input = (inputObj instanceof Map) ? (Map) inputObj : [:]
if (!input || !(input.name instanceof String) || !((input.name as String).trim())) {
    return buildErrorResponse(400, 'Missing or invalid "name" field.')
}
```

### Error Response Helper
```groovy
def buildErrorResponse(int status, String message) {
    return Response.status(status).entity(new JsonBuilder([error: message]).toString()).build()
}
```

### Database Access
```groovy
DatabaseUtil.withSql('umig_app_db_pool') { Sql sql ->
    // SQL operations
}
```

### REST Endpoint Declaration

All REST endpoints **must** be file-based and rely on ScriptRunner's automatic scanning and registration feature. This provides a stable, maintainable, and version-controlled approach.

**Configuration:**
The development environment (`local-dev-setup/podman-compose.yml`) is configured with the necessary Java system properties:
- `-Dplugin.script.roots=/var/atlassian/application-data/confluence/scripts/groovy`: Defines the base directory for your Groovy packages.
- `-Dplugin.rest.scripts.package=v1.teams`: A comma-delimited list of packages to scan for endpoints.

**Pattern:**
Place your endpoint files within the correct package structure inside `src/groovy/`. For example, an endpoint in the `v1.teams` package would be located at `src/groovy/v1/teams/myEndpoint.groovy`.

```groovy
// Located at: src/groovy/v1/teams/myEndpoint.groovy
package v1.teams // Mandatory: This MUST match the directory structure.

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import groovy.transform.BaseScript
import javax.ws.rs.core.Response
import groovy.json.JsonBuilder

@BaseScript CustomEndpointDelegate delegate

myEndpoint(httpMethod: "GET", groups: ["confluence-administrators"]) { queryParams, body ->
    // handler code
    Response.ok(new JsonBuilder([status: "success"]).toString()).build()
}
```

---

## Updating This Document
Update this file whenever new patterns, workarounds, or conventions are adopted. Keep it concise and actionable.
