# ScriptRunner Database Connection Pool Setup Guide

## Problem

The Plans API is returning an error: `{"error":"Internal server error: No hstore extension installed."}`. This is misleading - UMIG doesn't use the hstore extension. The real issue is that the ScriptRunner connection pool needs to be configured.

## Solution

### Step 1: Access ScriptRunner Administration

1. Go to Confluence Administration
2. Navigate to Add-ons → ScriptRunner → Resources → Connection Pools

### Step 2: Create Connection Pool

Create a new connection pool with these settings:

**Pool Configuration:**

- **Pool Name**: `umig_db_pool` (MUST match exactly)
- **JDBC URL**: `jdbc:postgresql://postgres:5432/umig_app_db` (Note: Use 'postgres' hostname in Podman context, not 'localhost')
- **Driver Class Name**: `org.postgresql.Driver`
- **Username**: `umig_app_user`
- **Password**: `123456`

**Advanced Settings (Optional):**

- **Initial Pool Size**: 5
- **Max Pool Size**: 20
- **Min Idle**: 5
- **Max Idle**: 10
- **Test Query**: `SELECT 1`

### Step 3: Test the Connection

1. Click "Test Connection" in ScriptRunner
2. You should see "Connection successful"

### Step 4: Verify with Test Scripts

Run this in ScriptRunner Console to test:

```groovy
import com.onresolve.scriptrunner.db.DatabaseUtil

// Test basic connection
DatabaseUtil.withSql('umig_db_pool') { sql ->
    def result = sql.firstRow("SELECT version() as version, current_database() as db")
    println "Connected to: ${result.db}"
    println "PostgreSQL: ${result.version}"
}

// Test Plans table
DatabaseUtil.withSql('umig_db_pool') { sql ->
    def count = sql.firstRow("SELECT COUNT(*) as cnt FROM plans_master_plm")
    println "Master plans count: ${count.cnt}"
}
```

### Step 5: Test the Plans API

After configuring the pool, test the API:

```bash
# Test master plans endpoint
curl -u "${UMIG_AUTH_CREDENTIALS:-admin:admin}" http://localhost:8090/rest/scriptrunner/latest/custom/plans/master

# Test debug endpoint (if PlansApiDebug.groovy is deployed)
curl -u "${UMIG_AUTH_CREDENTIALS:-admin:admin}" http://localhost:8090/rest/scriptrunner/latest/custom/plans/test
```

## Troubleshooting

### Error: "No hstore extension installed"

This error is misleading. It usually means:

1. Connection pool is not configured
2. Pool name doesn't match exactly (`umig_db_pool`)
3. Database credentials are incorrect

### Error: "Connection pool 'umig_db_pool' not found"

1. Pool name is misspelled
2. Pool hasn't been created yet
3. ScriptRunner needs to be restarted

### Error: "FATAL: password authentication failed"

1. Check username/password in pool configuration
2. Verify PostgreSQL is running: `podman ps`
3. Check `.env` file for correct credentials

### Connection Successful but API Still Fails

1. Clear ScriptRunner cache: Administration → ScriptRunner → Built-in Scripts → Clear Groovy class cache
2. Restart Confluence
3. Check that PlansApi.groovy and PlanRepository.groovy are in the correct directories

## Alternative: Direct Connection (Not Recommended)

If pool configuration continues to fail, you can temporarily use PlansApiDirect.groovy which bypasses the repository pattern. However, this is not recommended for production use.

## Code Pattern Reference

The correct pattern used throughout UMIG:

```groovy
// Repository class
import umig.utils.DatabaseUtil

class SomeRepository {
    def findSomething() {
        DatabaseUtil.withSql { sql ->
            return sql.rows("SELECT * FROM some_table")
        }
    }
}
```

The DatabaseUtil wrapper ensures consistent pool usage across all repositories.
