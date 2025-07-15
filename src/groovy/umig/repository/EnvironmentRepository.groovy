package umig.repository

import umig.utils.DatabaseUtil

/**
 * Repository class for managing Environment data.
 * Handles all database operations for the environments_env table
 * and related association tables.
 */
class EnvironmentRepository {

    /**
     * Finds all environments with relationship counts.
     * @return A list of environments with application and iteration counts.
     */
    List findAllEnvironmentsWithCounts() {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT 
                    e.env_id,
                    e.env_code,
                    e.env_name,
                    e.env_description,
                    COALESCE(app_counts.app_count, 0)::INTEGER AS application_count,
                    COALESCE(ite_counts.iteration_count, 0)::INTEGER AS iteration_count
                FROM environments_env e
                LEFT JOIN (
                    SELECT env_id, COUNT(*)::INTEGER AS app_count
                    FROM environments_env_x_applications_app
                    GROUP BY env_id
                ) app_counts ON e.env_id = app_counts.env_id
                LEFT JOIN (
                    SELECT env_id, COUNT(*)::INTEGER AS iteration_count
                    FROM environments_env_x_iterations_ite
                    GROUP BY env_id
                ) ite_counts ON e.env_id = ite_counts.env_id
                ORDER BY e.env_code
            """)
        }
    }

    /**
     * Finds an environment by its ID with full details.
     * @param envId The ID of the environment to find.
     * @return A map representing the environment with related data, or null if not found.
     */
    Map findEnvironmentById(int envId) {
        DatabaseUtil.withSql { sql ->
            def environment = sql.firstRow("""
                SELECT 
                    e.env_id,
                    e.env_code,
                    e.env_name,
                    e.env_description
                FROM environments_env e
                WHERE e.env_id = :envId
            """, [envId: envId])

            if (environment) {
                // Get related applications
                environment.applications = sql.rows("""
                    SELECT a.app_id, a.app_code, a.app_name
                    FROM applications_app a
                    JOIN environments_env_x_applications_app exa ON a.app_id = exa.app_id
                    WHERE exa.env_id = :envId
                    ORDER BY a.app_code
                """, [envId: envId])

                // Get related iterations with roles
                environment.iterations = sql.rows("""
                    SELECT 
                        i.ite_id, 
                        i.ite_name,
                        er.enr_id,
                        er.enr_name AS role_name,
                        er.enr_description AS role_description
                    FROM iterations_ite i
                    JOIN environments_env_x_iterations_ite exi ON i.ite_id = exi.ite_id
                    JOIN environment_roles_enr er ON exi.enr_id = er.enr_id
                    WHERE exi.env_id = :envId
                    ORDER BY i.ite_name, er.enr_name
                """, [envId: envId])
            }

            return environment
        }
    }

    /**
     * Creates a new environment.
     * @param environment A map containing the environment data.
     * @return The created environment with its generated ID.
     */
    Map createEnvironment(Map environment) {
        DatabaseUtil.withSql { sql ->
            def keys = sql.executeInsert("""
                INSERT INTO environments_env (env_code, env_name, env_description)
                VALUES (:env_code, :env_name, :env_description)
            """, environment)
            
            environment.env_id = keys[0][0]
            return environment
        }
    }

    /**
     * Updates an existing environment.
     * @param envId The ID of the environment to update.
     * @param updates A map containing the fields to update.
     * @return The updated environment.
     */
    Map updateEnvironment(int envId, Map updates) {
        DatabaseUtil.withSql { sql ->
            sql.executeUpdate("""
                UPDATE environments_env
                SET env_code = :env_code,
                    env_name = :env_name,
                    env_description = :env_description
                WHERE env_id = :env_id
            """, updates + [env_id: envId])
            
            return findEnvironmentById(envId)
        }
    }

    /**
     * Deletes an environment.
     * @param envId The ID of the environment to delete.
     * @return true if deleted successfully, false otherwise.
     */
    boolean deleteEnvironment(int envId) {
        DatabaseUtil.withSql { sql ->
            def rowsAffected = sql.executeUpdate("""
                DELETE FROM environments_env WHERE env_id = :envId
            """, [envId: envId])
            
            return rowsAffected > 0
        }
    }

    /**
     * Returns all relationships that block deletion of an environment.
     * @param envId The ID of the environment.
     * @return Map of relationship type to list of referencing records.
     */
    Map getEnvironmentBlockingRelationships(int envId) {
        DatabaseUtil.withSql { sql ->
            def blocking = [:]

            // Applications
            def applications = sql.rows("""
                SELECT a.app_id, a.app_code, a.app_name
                FROM applications_app a
                JOIN environments_env_x_applications_app exa ON a.app_id = exa.app_id
                WHERE exa.env_id = :envId
            """, [envId: envId])
            if (applications) blocking['applications'] = applications

            // Iterations
            def iterations = sql.rows("""
                SELECT 
                    i.ite_id, 
                    i.ite_name,
                    er.enr_name AS role_name
                FROM iterations_ite i
                JOIN environments_env_x_iterations_ite exi ON i.ite_id = exi.ite_id
                JOIN environment_roles_enr er ON exi.enr_id = er.enr_id
                WHERE exi.env_id = :envId
            """, [envId: envId])
            if (iterations) blocking['iterations'] = iterations

            return blocking
        }
    }

    /**
     * Gets iteration details for an environment grouped by role.
     * @param envId The ID of the environment.
     * @return A map of role names to lists of iterations.
     */
    Map getIterationsByEnvironmentGroupedByRole(int envId) {
        DatabaseUtil.withSql { sql ->
            def results = sql.rows("""
                SELECT 
                    er.enr_name AS role_name,
                    er.enr_description AS role_description,
                    i.ite_id, 
                    i.ite_name,
                    i.itt_code AS ite_type,
                    i.ite_status
                FROM iterations_ite i
                JOIN environments_env_x_iterations_ite exi ON i.ite_id = exi.ite_id
                JOIN environment_roles_enr er ON exi.enr_id = er.enr_id
                WHERE exi.env_id = :envId
                ORDER BY er.enr_name, i.ite_name
            """, [envId: envId])

            // Group by role
            def groupedByRole = [:]
            results.each { row ->
                def roleName = row.role_name as String
                if (!groupedByRole.containsKey(roleName)) {
                    groupedByRole[roleName] = [
                        role_description: row.role_description,
                        iterations: []
                    ]
                }
                def roleData = groupedByRole[roleName] as Map
                def iterations = roleData.iterations as List
                iterations << [
                    ite_id: row.ite_id,
                    ite_name: row.ite_name,
                    ite_type: row.ite_type,
                    ite_status: row.ite_status
                ]
            }

            return groupedByRole
        }
    }

    /**
     * Associates an application with an environment.
     * @param envId The environment ID.
     * @param appId The application ID.
     * @return true if association created successfully, false if already exists.
     */
    boolean associateApplication(int envId, int appId) {
        DatabaseUtil.withSql { sql ->
            try {
                sql.executeInsert("""
                    INSERT INTO environments_env_x_applications_app (env_id, app_id)
                    VALUES (:envId, :appId)
                """, [envId: envId, appId: appId])
                return true
            } catch (Exception e) {
                // Handle duplicate key error gracefully
                if (e.message.contains("duplicate key") || e.message.contains("unique constraint")) {
                    return false
                }
                throw e
            }
        }
    }

    /**
     * Removes an application association from an environment.
     * @param envId The environment ID.
     * @param appId The application ID.
     * @return true if removed successfully, false otherwise.
     */
    boolean disassociateApplication(int envId, int appId) {
        DatabaseUtil.withSql { sql ->
            def rowsAffected = sql.executeUpdate("""
                DELETE FROM environments_env_x_applications_app
                WHERE env_id = :envId AND app_id = :appId
            """, [envId: envId, appId: appId])
            
            return rowsAffected > 0
        }
    }

    /**
     * Associates an iteration with an environment in a specific role.
     * @param envId The environment ID.
     * @param iteId The iteration ID (UUID).
     * @param enrId The environment role ID.
     * @return true if association created successfully, false if already exists.
     */
    boolean associateIteration(int envId, String iteId, int enrId) {
        DatabaseUtil.withSql { sql ->
            try {
                sql.executeInsert("""
                    INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, enr_id)
                    VALUES (:envId, :iteId::uuid, :enrId)
                """, [envId: envId, iteId: iteId, enrId: enrId])
                return true
            } catch (Exception e) {
                // Handle duplicate key error gracefully
                if (e.message.contains("duplicate key") || e.message.contains("unique constraint")) {
                    return false
                }
                throw e
            }
        }
    }

    /**
     * Removes an iteration association from an environment.
     * @param envId The environment ID.
     * @param iteId The iteration ID (UUID).
     * @return true if removed successfully, false otherwise.
     */
    boolean disassociateIteration(int envId, String iteId) {
        DatabaseUtil.withSql { sql ->
            def rowsAffected = sql.executeUpdate("""
                DELETE FROM environments_env_x_iterations_ite
                WHERE env_id = :envId AND ite_id = :iteId::uuid
            """, [envId: envId, iteId: iteId])
            
            return rowsAffected > 0
        }
    }

    /**
     * Gets all available environment roles.
     * @return A list of environment roles.
     */
    List getAllEnvironmentRoles() {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT enr_id, enr_name, enr_description
                FROM environment_roles_enr
                ORDER BY enr_name
            """)
        }
    }
}