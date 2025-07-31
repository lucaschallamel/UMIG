/**
 * Test script to verify ScriptRunner database connection pool
 * Run this in ScriptRunner Console to test the connection
 */

import com.onresolve.scriptrunner.db.DatabaseUtil

// Test 1: Direct ScriptRunner DatabaseUtil
try {
    def result = DatabaseUtil.withSql('umig_db_pool') { sql ->
        return sql.firstRow("SELECT version() as version")
    }
    println "✅ Direct ScriptRunner connection successful"
    println "PostgreSQL version: ${result.version}"
} catch (Exception e) {
    println "❌ Direct ScriptRunner connection failed: ${e.message}"
    println "Stack trace:"
    e.printStackTrace()
}

println "\n" + "="*50 + "\n"

// Test 2: Using UMIG's DatabaseUtil wrapper
import umig.utils.DatabaseUtil as UmigDatabaseUtil

try {
    def result = UmigDatabaseUtil.withSql { sql ->
        return sql.firstRow("SELECT current_database() as db_name, current_user as db_user")
    }
    println "✅ UMIG DatabaseUtil wrapper successful"
    println "Database: ${result.db_name}"
    println "User: ${result.db_user}"
} catch (Exception e) {
    println "❌ UMIG DatabaseUtil wrapper failed: ${e.message}"
}

println "\n" + "="*50 + "\n"

// Test 3: Check if hstore extension exists (but not required)
try {
    def extensions = DatabaseUtil.withSql('umig_db_pool') { sql ->
        return sql.rows("SELECT extname FROM pg_extension WHERE extname = 'hstore'")
    }
    if (extensions) {
        println "ℹ️ hstore extension is installed (but not required for UMIG)"
    } else {
        println "ℹ️ hstore extension is NOT installed (this is OK for UMIG)"
    }
} catch (Exception e) {
    println "❌ Could not check extensions: ${e.message}"
}

println "\n" + "="*50 + "\n"

// Test 4: Try a simple Plans query
try {
    def plans = DatabaseUtil.withSql('umig_db_pool') { sql ->
        return sql.rows("SELECT COUNT(*) as count FROM plans_master_plm")
    }
    println "✅ Plans table query successful"
    println "Master plans count: ${plans[0].count}"
} catch (Exception e) {
    println "❌ Plans table query failed: ${e.message}"
}

println "\n" + "="*50 + "\n"
println "Connection Pool Configuration:"
println "Pool name: umig_db_pool"
println "Expected JDBC URL: jdbc:postgresql://postgres:5432/umig_app_db"
println "Expected Username: umig_app_user"
println "\nNote: Use 'postgres' as hostname (not 'localhost') in Podman context"
println "Ensure the connection pool is configured in ScriptRunner with these settings."