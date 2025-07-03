package com.umig.utils

import com.onresolve.scriptrunner.db.DatabaseUtil as SRDatabaseUtil
import groovy.transform.stc.ClosureParams
import groovy.transform.stc.FromString

/**
 * Utility class for handling database connections.
 * Centralizes access to the database connection pool configured in ScriptRunner.
 */
class DatabaseUtil {

    /**
     * Executes a closure with a managed groovy.sql.Sql instance from the ScriptRunner connection pool.
     * This is the recommended, safe way to interact with the database.
     * @param closure The closure to execute with the Sql object.
     * @return The result of the closure.
     */
    static <T> T withSql(@ClosureParams(value = FromString, options = "groovy.sql.Sql") Closure<T> closure) {
        // This uses ScriptRunner's built-in utility to get a connection from the pool
        // configured in the ScriptRunner administration. The JNDI name 'jdbc/umig' is defined in server.xml.
        // This pattern automatically handles the connection lifecycle.
        return SRDatabaseUtil.withSql('umig_db_pool', closure)
    }
}
