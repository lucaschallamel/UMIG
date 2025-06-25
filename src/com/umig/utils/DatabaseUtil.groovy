package com.umig.utils

import groovy.sql.Sql
import com.onresolve.scriptrunner.db.DatabaseUtil as SRDatabaseUtil

/**
 * Utility class for handling database connections.
 * Centralizes access to the database connection pool configured in ScriptRunner.
 */
class DatabaseUtil {

    /**
     * Gets a Groovy Sql instance from the ScriptRunner connection pool.
     * @return A configured groovy.sql.Sql object.
     */
    static Sql getSql() {
        // This uses ScriptRunner's built-in utility to get a connection
        // from the pool configured in the ScriptRunner administration.
        return SRDatabaseUtil.getSql()
    }
}
