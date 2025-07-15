package umig.repository

import umig.utils.DatabaseUtil

/**
 * Repository class for managing Application data.
 * Handles all database operations for the applications_app table
 * and related association tables.
 */
class ApplicationRepository {

    /**
     * Finds all applications with relationship counts.
     * @return A list of applications with environment, team, and label counts.
     */
    List findAllApplicationsWithCounts() {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT 
                    a.app_id,
                    a.app_code,
                    a.app_name,
                    a.app_description,
                    COALESCE(env_counts.env_count, 0)::INTEGER AS environment_count,
                    COALESCE(team_counts.team_count, 0)::INTEGER AS team_count,
                    COALESCE(label_counts.label_count, 0)::INTEGER AS label_count
                FROM applications_app a
                LEFT JOIN (
                    SELECT app_id, COUNT(*)::INTEGER AS env_count
                    FROM environments_env_x_applications_app
                    GROUP BY app_id
                ) env_counts ON a.app_id = env_counts.app_id
                LEFT JOIN (
                    SELECT app_id, COUNT(*)::INTEGER AS team_count
                    FROM teams_tms_x_applications_app
                    GROUP BY app_id
                ) team_counts ON a.app_id = team_counts.app_id
                LEFT JOIN (
                    SELECT app_id, COUNT(*)::INTEGER AS label_count
                    FROM labels_lbl_x_applications_app
                    GROUP BY app_id
                ) label_counts ON a.app_id = label_counts.app_id
                ORDER BY a.app_code
            """)
        }
    }

    /**
     * Finds an application by its ID with full details.
     * @param appId The ID of the application to find.
     * @return A map representing the application with related data, or null if not found.
     */
    Map findApplicationById(int appId) {
        DatabaseUtil.withSql { sql ->
            def application = sql.firstRow("""
                SELECT 
                    a.app_id,
                    a.app_code,
                    a.app_name,
                    a.app_description
                FROM applications_app a
                WHERE a.app_id = :appId
            """, [appId: appId])

            if (application) {
                // Get related environments
                application.environments = sql.rows("""
                    SELECT e.env_id, e.env_code, e.env_name, e.env_description
                    FROM environments_env e
                    JOIN environments_env_x_applications_app exa ON e.env_id = exa.env_id
                    WHERE exa.app_id = :appId
                    ORDER BY e.env_code
                """, [appId: appId])

                // Get related teams
                application.teams = sql.rows("""
                    SELECT t.tms_id, t.tms_name, t.tms_description
                    FROM teams_tms t
                    JOIN teams_tms_x_applications_app txa ON t.tms_id = txa.tms_id
                    WHERE txa.app_id = :appId
                    ORDER BY t.tms_name
                """, [appId: appId])

                // Get related labels
                application.labels = sql.rows("""
                    SELECT l.lbl_id, l.lbl_name, l.lbl_color
                    FROM labels_lbl l
                    JOIN labels_lbl_x_applications_app lxa ON l.lbl_id = lxa.lbl_id
                    WHERE lxa.app_id = :appId
                    ORDER BY l.lbl_name
                """, [appId: appId])
            }

            return application
        }
    }

    /**
     * Creates a new application.
     * @param application A map containing the application data.
     * @return The created application with its generated ID.
     */
    Map createApplication(Map application) {
        DatabaseUtil.withSql { sql ->
            def keys = sql.executeInsert("""
                INSERT INTO applications_app (app_code, app_name, app_description)
                VALUES (:app_code, :app_name, :app_description)
            """, application)
            
            application.app_id = keys[0][0]
            return application
        }
    }

    /**
     * Updates an existing application.
     * @param appId The ID of the application to update.
     * @param updates A map containing the fields to update.
     * @return The updated application.
     */
    Map updateApplication(int appId, Map updates) {
        DatabaseUtil.withSql { sql ->
            sql.executeUpdate("""
                UPDATE applications_app
                SET app_code = :app_code,
                    app_name = :app_name,
                    app_description = :app_description
                WHERE app_id = :app_id
            """, updates + [app_id: appId])
            
            return findApplicationById(appId)
        }
    }

    /**
     * Deletes an application.
     * @param appId The ID of the application to delete.
     * @return true if deleted successfully, false otherwise.
     */
    boolean deleteApplication(int appId) {
        DatabaseUtil.withSql { sql ->
            def rowsAffected = sql.executeUpdate("""
                DELETE FROM applications_app WHERE app_id = :appId
            """, [appId: appId])
            
            return rowsAffected > 0
        }
    }

    /**
     * Returns all relationships that block deletion of an application.
     * @param appId The ID of the application.
     * @return Map of relationship type to list of referencing records.
     */
    Map getApplicationBlockingRelationships(int appId) {
        DatabaseUtil.withSql { sql ->
            def blocking = [:]

            // Environments
            def environments = sql.rows("""
                SELECT e.env_id, e.env_code, e.env_name
                FROM environments_env e
                JOIN environments_env_x_applications_app exa ON e.env_id = exa.env_id
                WHERE exa.app_id = :appId
            """, [appId: appId])
            if (environments) blocking['environments'] = environments

            // Teams
            def teams = sql.rows("""
                SELECT t.tms_id, t.tms_name, t.tms_description
                FROM teams_tms t
                JOIN teams_tms_x_applications_app txa ON t.tms_id = txa.tms_id
                WHERE txa.app_id = :appId
            """, [appId: appId])
            if (teams) blocking['teams'] = teams

            // Labels
            def labels = sql.rows("""
                SELECT l.lbl_id, l.lbl_name, l.lbl_color
                FROM labels_lbl l
                JOIN labels_lbl_x_applications_app lxa ON l.lbl_id = lxa.lbl_id
                WHERE lxa.app_id = :appId
            """, [appId: appId])
            if (labels) blocking['labels'] = labels

            return blocking
        }
    }

    /**
     * Associates an environment with an application.
     * @param appId The application ID.
     * @param envId The environment ID.
     * @return true if association created successfully, false if already exists.
     */
    boolean associateEnvironment(int appId, int envId) {
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
     * Removes an environment association from an application.
     * @param appId The application ID.
     * @param envId The environment ID.
     * @return true if removed successfully, false otherwise.
     */
    boolean disassociateEnvironment(int appId, int envId) {
        DatabaseUtil.withSql { sql ->
            def rowsAffected = sql.executeUpdate("""
                DELETE FROM environments_env_x_applications_app
                WHERE env_id = :envId AND app_id = :appId
            """, [envId: envId, appId: appId])
            
            return rowsAffected > 0
        }
    }

    /**
     * Associates a team with an application.
     * @param appId The application ID.
     * @param teamId The team ID.
     * @return true if association created successfully, false if already exists.
     */
    boolean associateTeam(int appId, int teamId) {
        DatabaseUtil.withSql { sql ->
            try {
                sql.executeInsert("""
                    INSERT INTO teams_tms_x_applications_app (tms_id, app_id)
                    VALUES (:teamId, :appId)
                """, [teamId: teamId, appId: appId])
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
     * Removes a team association from an application.
     * @param appId The application ID.
     * @param teamId The team ID.
     * @return true if removed successfully, false otherwise.
     */
    boolean disassociateTeam(int appId, int teamId) {
        DatabaseUtil.withSql { sql ->
            def rowsAffected = sql.executeUpdate("""
                DELETE FROM teams_tms_x_applications_app
                WHERE tms_id = :teamId AND app_id = :appId
            """, [teamId: teamId, appId: appId])
            
            return rowsAffected > 0
        }
    }

    /**
     * Finds all applications with relationship counts, supporting pagination and search.
     * @param page The page number (1-based)
     * @param size The page size
     * @param search Optional search term to filter applications
     * @param sortField The field to sort by
     * @param sortDirection The sort direction ('asc' or 'desc')
     * @return A paginated result with applications and metadata
     */
    Map findAllApplicationsWithCounts(int page, int size, String search, String sortField, String sortDirection) {
        DatabaseUtil.withSql { sql ->
            // Build WHERE clause for search
            String whereClause = ""
            Map<String, Object> params = [:]
            
            if (search && search.trim().length() >= 2) {
                whereClause = """
                    WHERE (
                        UPPER(a.app_code) LIKE UPPER(:search) OR
                        UPPER(a.app_name) LIKE UPPER(:search) OR
                        UPPER(a.app_description) LIKE UPPER(:search)
                    )
                """
                params.search = "%" + search.trim() + "%"
            }
            
            // Build ORDER BY clause - handle computed columns
            String orderClause
            if (sortField == 'environment_count') {
                orderClause = "ORDER BY COALESCE(env_counts.env_count, 0) " + sortDirection.toUpperCase()
            } else if (sortField == 'team_count') {
                orderClause = "ORDER BY COALESCE(team_counts.team_count, 0) " + sortDirection.toUpperCase()
            } else if (sortField == 'label_count') {
                orderClause = "ORDER BY COALESCE(label_counts.label_count, 0) " + sortDirection.toUpperCase()
            } else if (sortField) {
                // Safe for basic table columns - only if sortField is provided
                orderClause = "ORDER BY a." + sortField + " " + sortDirection.toUpperCase()
            } else {
                // Default sort by app_code if no sort field provided
                orderClause = "ORDER BY a.app_code " + sortDirection.toUpperCase()
            }
            
            // Calculate offset
            int offset = (page - 1) * size
            
            // Get total count
            def countQuery = """
                SELECT COUNT(*)
                FROM applications_app a
                ${whereClause}
            """
            
            def totalCount = sql.firstRow(countQuery, params)[0] as Long
            
            // Get paginated data
            def dataQuery = """
                SELECT 
                    a.app_id,
                    a.app_code,
                    a.app_name,
                    a.app_description,
                    COALESCE(env_counts.env_count, 0)::INTEGER AS environment_count,
                    COALESCE(team_counts.team_count, 0)::INTEGER AS team_count,
                    COALESCE(label_counts.label_count, 0)::INTEGER AS label_count
                FROM applications_app a
                LEFT JOIN (
                    SELECT app_id, COUNT(*)::INTEGER AS env_count
                    FROM environments_env_x_applications_app
                    GROUP BY app_id
                ) env_counts ON a.app_id = env_counts.app_id
                LEFT JOIN (
                    SELECT app_id, COUNT(*)::INTEGER AS team_count
                    FROM teams_tms_x_applications_app
                    GROUP BY app_id
                ) team_counts ON a.app_id = team_counts.app_id
                LEFT JOIN (
                    SELECT app_id, COUNT(*)::INTEGER AS label_count
                    FROM labels_lbl_x_applications_app
                    GROUP BY app_id
                ) label_counts ON a.app_id = label_counts.app_id
                ${whereClause}
                ${orderClause}
                LIMIT :size OFFSET :offset
            """
            
            params.size = size
            params.offset = offset
            
            def applications = sql.rows(dataQuery, params)
            
            // Calculate pagination metadata
            def totalPages = (totalCount + size - 1) / size as Long
            
            return [
                data: applications,
                pagination: [
                    currentPage: page,
                    pageSize: size,
                    totalItems: totalCount,
                    totalPages: totalPages,
                    hasNext: page < totalPages,
                    hasPrevious: page > 1
                ]
            ]
        }
    }

    /**
     * Get all labels associated with an application.
     * @param appId The ID of the application.
     * @return List of labels associated with the application.
     */
    List findApplicationLabels(int appId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT l.lbl_id, l.lbl_name, l.lbl_color
                FROM labels_lbl l
                JOIN labels_lbl_x_applications_app lxa ON l.lbl_id = lxa.lbl_id
                WHERE lxa.app_id = :appId
                ORDER BY l.lbl_name
            """, [appId: appId])
        }
    }

    /**
     * Associates a label with an application.
     * @param appId The application ID.
     * @param labelId The label ID.
     * @return true if association created successfully, false if already exists.
     */
    boolean associateLabel(int appId, int labelId) {
        DatabaseUtil.withSql { sql ->
            try {
                sql.executeInsert("""
                    INSERT INTO labels_lbl_x_applications_app (lbl_id, app_id)
                    VALUES (:labelId, :appId)
                """, [labelId: labelId, appId: appId])
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
     * Removes a label association from an application.
     * @param appId The application ID.
     * @param labelId The label ID.
     * @return true if removed successfully, false otherwise.
     */
    boolean disassociateLabel(int appId, int labelId) {
        DatabaseUtil.withSql { sql ->
            def rowsAffected = sql.executeUpdate("""
                DELETE FROM labels_lbl_x_applications_app
                WHERE lbl_id = :labelId AND app_id = :appId
            """, [labelId: labelId, appId: appId])
            
            return rowsAffected > 0
        }
    }
}