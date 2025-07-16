package umig.repository

import umig.utils.DatabaseUtil
// Potentially import a User data class later

/**
 * Repository class for managing User data.
 * Handles all database operations for the users_usr table.
 */
class UserRepository {

    /**
     * Finds a user by their ID.
     * @param userId The ID of the user to find.
     * @return A map representing the user, or null if not found.
     */
    def findUserById(int userId) {
        DatabaseUtil.withSql { sql ->
            def user = sql.firstRow("""
                SELECT usr_id, usr_code, usr_first_name, usr_last_name, usr_email, usr_is_admin, usr_active, rls_id, created_at, updated_at
                FROM users_usr
                WHERE usr_id = :userId
            """, [userId: userId])
            if (!user) return null
            // Always attach teams array
            user.teams = sql.rows("""
                SELECT t.tms_id, t.tms_name, t.tms_description, t.tms_email
                FROM teams_tms_x_users_usr j
                JOIN teams_tms t ON t.tms_id = j.tms_id
                WHERE j.usr_id = :userId
            """, [userId: user.usr_id])
            return user
        }
    }

    /**
     * Retrieves all users from the database (legacy method for backward compatibility).
     * @return A list of maps, where each map is a user.
     */
    def findAllUsers() {
        DatabaseUtil.withSql { sql ->
            def users = sql.rows("""
                SELECT usr_id, usr_code, usr_first_name, usr_last_name, usr_email, usr_is_admin, usr_active, rls_id, created_at, updated_at
                FROM users_usr
                ORDER BY usr_id
            """)
            // Attach teams for each user
            users.each { user ->
                user.teams = sql.rows("""
                    SELECT t.tms_id, t.tms_name, t.tms_description, t.tms_email
                    FROM teams_tms_x_users_usr j
                    JOIN teams_tms t ON t.tms_id = j.tms_id
                    WHERE j.usr_id = :userId
                """, [userId: user.usr_id])
            }
            return users
        }
    }

    /**
     * Retrieves paginated users from the database with optional search and sorting.
     * @param pageNumber The page number (1-based).
     * @param pageSize The number of users per page.
     * @param searchTerm Optional search term to filter users.
     * @param sortField Optional field to sort by.
     * @param sortDirection Sort direction ('asc' or 'desc').
     * @return A map containing users list and pagination metadata.
     */
    def findAllUsers(int pageNumber, int pageSize, String searchTerm = null, String sortField = null, String sortDirection = 'asc', Integer teamId = null, Boolean activeFilter = null) {
        DatabaseUtil.withSql { sql ->
            // Build WHERE clause for search and team filtering
            def whereConditions = []
            def params = [:]
            
            if (searchTerm && !searchTerm.trim().isEmpty()) {
                def trimmedSearch = searchTerm.trim()
                whereConditions.add("(u.usr_first_name ILIKE :searchTerm OR u.usr_last_name ILIKE :searchTerm OR u.usr_email ILIKE :searchTerm OR u.usr_code ILIKE :searchTerm)")
                params.searchTerm = "%${trimmedSearch}%".toString()  // Convert GString to String
            }
            
            if (teamId != null) {
                whereConditions.add("EXISTS (SELECT 1 FROM teams_tms_x_users_usr t WHERE t.usr_id = u.usr_id AND t.tms_id = :teamId)")
                params.teamId = teamId
            }
            
            if (activeFilter != null) {
                whereConditions.add("u.usr_active = :activeFilter")
                params.activeFilter = activeFilter
            }
            
            def whereClause = whereConditions.empty ? "" : "WHERE " + whereConditions.join(" AND ")
            
            // Build ORDER BY clause with validation
            def orderClause = "ORDER BY u.usr_id ASC" // Default sort
            if (sortField) {
                def direction = (sortDirection?.toLowerCase() == 'desc') ? 'DESC' : 'ASC'
                // Handle special sorting cases
                if (sortField == 'rls_id') {
                    // Sort by role name, with NULL values last
                    orderClause = "ORDER BY r.rls_code ${direction} NULLS LAST"
                } else {
                    // Validate sort field to prevent SQL injection
                    def validSortFields = ['usr_id', 'usr_code', 'usr_first_name', 'usr_last_name', 'usr_email', 'usr_is_admin', 'usr_active']
                    if (validSortFields.contains(sortField)) {
                        orderClause = "ORDER BY u.${sortField} ${direction}"
                    }
                }
            }
            
            // Get total count
            def countQuery = "SELECT COUNT(*) as total FROM users_usr u LEFT JOIN roles_rls r ON u.rls_id = r.rls_id ${whereClause}"
            def totalCount = sql.firstRow(countQuery, params).total as long
            
            // Calculate pagination
            def offset = (pageNumber - 1) * pageSize
            def totalPages = (totalCount + pageSize - 1) / pageSize as int
            
            // Get paginated users with role information for sorting
            def usersQuery = """
                SELECT u.usr_id, u.usr_code, u.usr_first_name, u.usr_last_name, u.usr_email, u.usr_is_admin, u.usr_active, u.rls_id, u.created_at, u.updated_at
                FROM users_usr u
                LEFT JOIN roles_rls r ON u.rls_id = r.rls_id
                ${whereClause}
                ${orderClause}
                LIMIT :pageSize OFFSET :offset
            """
            
            // Create params for main query (reuse the same params from count query)
            params.pageSize = pageSize
            params.offset = offset
            
            
            def users = sql.rows(usersQuery, params)
            
            // Attach teams for each user
            users.each { user ->
                user.teams = sql.rows("""
                    SELECT t.tms_id, t.tms_name, t.tms_description, t.tms_email
                    FROM teams_tms_x_users_usr j
                    JOIN teams_tms t ON t.tms_id = j.tms_id
                    WHERE j.usr_id = :userId
                """, [userId: user.usr_id])
            }
            
            return [
                content: users,
                totalElements: totalCount,
                totalPages: totalPages,
                pageNumber: pageNumber,
                pageSize: pageSize,
                hasNext: pageNumber < totalPages,
                hasPrevious: pageNumber > 1,
                sortField: sortField,
                sortDirection: sortDirection
            ]
        }
    }

    /**
     * Creates a new user in the database.
     * @param userData A map containing the data for the new user.
     * @return A map representing the newly created user, including the generated ID.
     */
    def createUser(Map userData) {
        DatabaseUtil.withSql { sql ->
            def insertQuery = """
                INSERT INTO users_usr (usr_code, usr_first_name, usr_last_name, usr_email, usr_is_admin, usr_active, rls_id)
                VALUES (:usr_code, :usr_first_name, :usr_last_name, :usr_email, :usr_is_admin, :usr_active, :rls_id)
            """
            // Set default value for usr_active if not provided
            if (!userData.containsKey('usr_active')) {
                userData.usr_active = true
            }
            def userInsertData = userData.findAll { k, v -> ["usr_code", "usr_first_name", "usr_last_name", "usr_email", "usr_is_admin", "usr_active", "rls_id"].contains(k) }
            def generatedKeys = sql.executeInsert(insertQuery, userInsertData, ['usr_id'])
            if (generatedKeys && generatedKeys[0]) {
                def newId = generatedKeys[0][0] as int
                // If team assignment provided, insert into join table
                if (userData.teams && userData.teams instanceof List) {
                    userData.teams.each { tmsId ->
                        sql.executeInsert("INSERT INTO teams_tms_x_users_usr (tms_id, usr_id, created_at) VALUES (:tmsId, :usrId, now())", [tmsId: tmsId, usrId: newId])
                    }
                }
                return findUserById(newId)
            }
            return null
        }
    }

    /**
     * Updates an existing user.
     * @param userId The ID of the user to update.
     * @param userData A map containing the new data for the user.
     * @return A map representing the updated user.
     */
    def updateUser(int userId, Map userData) {
        // It's better to perform the check and update in the same transaction
        DatabaseUtil.withSql { sql ->
            // Ensure the user exists before attempting an update
            def currentUser = sql.firstRow('SELECT usr_id FROM users_usr WHERE usr_id = :userId', [userId: userId])
            if (!currentUser) {
                return null
            }

            // Build the SET part of the query dynamically from a whitelist of fields
            def setClauses = []
            def queryParams = [:]
            def updatableFields = ['usr_code', 'usr_first_name', 'usr_last_name', 'usr_email', 'usr_is_admin', 'usr_active', 'rls_id']
            userData.each { key, value ->
                if (key in updatableFields) {
                    setClauses.add("${key} = :${key}")
                    queryParams[key] = value
                }
            }
            if (!setClauses.isEmpty()) {
                queryParams['usr_id'] = userId
                def updateQuery = "UPDATE users_usr SET ${setClauses.join(', ')} WHERE usr_id = :usr_id"
                sql.executeUpdate(updateQuery, queryParams)
            }
            // Handle team assignment updates if provided
            if (userData.teams && userData.teams instanceof List) {
                // Remove existing memberships
                sql.executeUpdate("DELETE FROM teams_tms_x_users_usr WHERE usr_id = :usrId", [usrId: userId])
                // Add new memberships
                userData.teams.each { tmsId ->
                    sql.executeInsert("INSERT INTO teams_tms_x_users_usr (tms_id, usr_id, created_at) VALUES (:tmsId, :usrId, now())", [tmsId: tmsId, usrId: userId])
                }
            }
        }
        return findUserById(userId)
    }

    /**
     * Deletes a user from the database.
     * @param userId The ID of the user to delete.
     * @return true if the user was deleted, false otherwise.
     */
    /**
     * Deletes a user and all their team associations.
     * @param userId The ID of the user to delete.
     * @return [deleted: true/false, deletedTeams: List<Map>]
     */
    // Only attempt to delete the user row; do NOT delete team associations or other referencing records here.
    def deleteUser(int userId) {
        DatabaseUtil.withSql { sql ->
            def deleteQuery = "DELETE FROM users_usr WHERE usr_id = :userId"
            def rowsAffected = sql.executeUpdate(deleteQuery, [userId: userId])
            return [deleted: rowsAffected > 0]
        }
    }

    /**
     * Returns all relationships that block deletion of a user.
     * @param userId The ID of the user.
     * @return Map of relationship type to list of referencing records.
     */
    def getUserBlockingRelationships(int userId) {
        DatabaseUtil.withSql { sql ->
            def blocking = [:]

            // Teams
            def teams = sql.rows("""
                SELECT t.tms_id, t.tms_name
                FROM teams_tms_x_users_usr j
                JOIN teams_tms t ON t.tms_id = j.tms_id
                WHERE j.usr_id = :userId
            """, [userId: userId])
            if (teams) blocking['teams'] = teams

            // Migrations owned
            def migrations = sql.rows("SELECT mig_id FROM migrations_mig WHERE usr_id_owner = :userId", [userId: userId])
            if (migrations) blocking['migrations_owned'] = migrations

            // Plan instances owned
            def plans = sql.rows("SELECT pli_id FROM plans_instance_pli WHERE usr_id_owner = :userId", [userId: userId])
            if (plans) blocking['plan_instances_owned'] = plans

            // Step instances owned/assigned
            def step_instances_owned = sql.rows("SELECT sti_id FROM steps_instance_sti WHERE usr_id_owner = :userId", [userId: userId])
            if (step_instances_owned) blocking['step_instances_owned'] = step_instances_owned
            def step_instances_assigned = sql.rows("SELECT sti_id FROM steps_instance_sti WHERE usr_id_assignee = :userId", [userId: userId])
            if (step_instances_assigned) blocking['step_instances_assigned'] = step_instances_assigned

            // Instructions completed
            def instructions = sql.rows("SELECT ini_id FROM instructions_instance_ini WHERE usr_id_completed_by = :userId", [userId: userId])
            if (instructions) blocking['instructions_completed'] = instructions

            // Controls validated
            def controls_it = sql.rows("SELECT cti_id FROM controls_instance_cti WHERE usr_id_it_validator = :userId", [userId: userId])
            if (controls_it) blocking['controls_it_validated'] = controls_it
            def controls_biz = sql.rows("SELECT cti_id FROM controls_instance_cti WHERE usr_id_biz_validator = :userId", [userId: userId])
            if (controls_biz) blocking['controls_biz_validated'] = controls_biz

            // Audit logs
            def audit_logs = sql.rows("SELECT aud_id FROM audit_log_aud WHERE usr_id = :userId", [userId: userId])
            if (audit_logs) blocking['audit_logs'] = audit_logs

            // Step pilot comments
            def pilot_comments_created = sql.rows("SELECT spc_id FROM step_pilot_comments_spc WHERE created_by = :userId", [userId: userId])
            if (pilot_comments_created) blocking['pilot_comments_created'] = pilot_comments_created
            def pilot_comments_updated = sql.rows("SELECT spc_id FROM step_pilot_comments_spc WHERE updated_by = :userId", [userId: userId])
            if (pilot_comments_updated) blocking['pilot_comments_updated'] = pilot_comments_updated

            // Step instance comments
            def step_comments_created = sql.rows("SELECT sic_id FROM step_instance_comments_sic WHERE created_by = :userId", [userId: userId])
            if (step_comments_created) blocking['step_comments_created'] = step_comments_created
            def step_comments_updated = sql.rows("SELECT sic_id FROM step_instance_comments_sic WHERE updated_by = :userId", [userId: userId])
            if (step_comments_updated) blocking['step_comments_updated'] = step_comments_updated

            return blocking
        }
    }
}
