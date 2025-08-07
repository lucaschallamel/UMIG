# Groovy Development Guidelines for UMIG

This document outlines the key coding conventions, patterns, and workarounds for developing Groovy scripts within the ScriptRunner for Confluence environment for the UMIG project.

## 1. REST Endpoints

All REST endpoints **must** be implemented using the `CustomEndpointDelegate` pattern. This is the only pattern that has proven to be stable and compile correctly in our environment.

**Key Requirements:**

- Annotate the script with `@BaseScript CustomEndpointDelegate delegate`.
- Define endpoints as methods named after the resource (e.g., `plans`, `teams`).
- The method must accept `httpMethod`, `request`, and `binding` as arguments.
- The method must return a `javax.ws.rs.core.Response` object.
- Secure endpoints by default by including `groups: ["confluence-users"]`.

**Example:**

```groovy
import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import groovy.transform.BaseScript

@BaseScript CustomEndpointDelegate delegate

plans(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    // ... implementation
    return Response.ok(/* payload */).build()
}
```

For more details, see `ADR-011-ScriptRunner-REST-Endpoint-Configuration.md`.

## 2. Database Access

All database access **must** be performed using the `withSql` pattern provided by `com.umig.utils.DatabaseUtil`. This pattern is the correct, safe, and idiomatic way to handle database connections in ScriptRunner. It automatically manages the connection lifecycle (opening and closing) and is fully compatible with the IDE's static type checker.

**Correct Usage:**

```groovy
// In DatabaseUtil.groovy
import com.onresolve.scriptrunner.db.DatabaseUtil as SRDatabaseUtil
import groovy.transform.stc.ClosureParams
import groovy.transform.stc.FromString

class DatabaseUtil {
    static <T> T withSql(@ClosureParams(value = FromString, options = "groovy.sql.Sql") Closure<T> closure) {
        return SRDatabaseUtil.withSql('umig_db_pool', closure)
    }
}

// In a repository class
def findAllTeams() {
    DatabaseUtil.withSql { sql ->
        // Thanks to @ClosureParams, the 'sql' variable is correctly typed as groovy.sql.Sql
        return sql.rows('SELECT * FROM teams_tms')
    }
}
```

**Why this pattern?**

- **Safe:** It prevents connection leaks by ensuring the database connection is always closed correctly, even if errors occur.
- **IDE-Friendly:** It resolves all static analysis warnings in the IDE.
- **Correct:** It is the officially recommended approach by Adaptavist for database interactions.

## 3. Handling Static Type Checking

The Groovy static type checker in IntelliJ can be aggressive and may not always correctly infer types from the ScriptRunner environment. When you are certain of an object's type at runtime, but the IDE reports an error, use an explicit cast with the `as` keyword.

**Example:**

```groovy
// When a database query returns a generated ID (e.g., with RETURNING), the static checker
// may infer it as Object. Cast it to the correct type (e.g., UUID, Long) before use.
def result = sql.firstRow("INSERT ... RETURNING mig_id")
if (result?.mig_id) {
    def typedId = result.mig_id as UUID
    return findPlanById(typedId)
}
```

## 4. Path Parameters

To retrieve additional path segments from a URL (e.g., the `123` in `/rest/scriptrunner/latest/custom/plans/123`), use the `getAdditionalPath` helper method provided by the delegate.

**Example:**

```groovy
def path = getAdditionalPath(request) // Returns "/123"
if (path) {
    def planId = path.substring(1) as Integer
    // ... use planId
}
```
