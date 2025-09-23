package umig.repository

import umig.utils.DatabaseUtil

/**
 * Repository class for managing Team data.
 * Handles all database operations for the teams_tms table.
 */
class TeamRepository {

    /**
     * Returns all relationships that block deletion of a team.
     * @param teamId The ID of the team.
     * @return Map of relationship type to list of referencing records.
     */
    def getTeamBlockingRelationships(int teamId) {
        DatabaseUtil.withSql { sql ->
            def blocking = [:]

            // Team memberships (users)
            def members = sql.rows("""
                SELECT u.usr_id, (u.usr_first_name || ' ' || u.usr_last_name) AS usr_name, u.usr_email
                FROM teams_tms_x_users_usr j
                JOIN users_usr u ON u.usr_id = j.usr_id
                WHERE j.tms_id = :teamId
            """, [teamId: teamId])
            if (members) blocking['team_members'] = members

            // Impacted steps (steps_master_stm_x_teams_tms_impacted)
            def impacted_steps = sql.rows("""
                SELECT s.stm_id, s.stm_name, s.stm_description
                FROM steps_master_stm_x_teams_tms_impacted i
                JOIN steps_master_stm s ON s.stm_id = i.stm_id
                WHERE i.tms_id = :teamId
            """, [teamId: teamId])
            if (impacted_steps) blocking['impacted_steps'] = impacted_steps

            // Add more referencing tables as needed (future-proof)

            return blocking
        }
    }


    /**
     * Finds a team by its ID.
     * @param teamId The ID of the team to find.
     * @return A map representing the team, or null if not found.
     */
    def findTeamById(int teamId) {
        DatabaseUtil.withSql { sql ->
            return sql.firstRow("""
                SELECT tms_id, tms_name, tms_description, tms_email,
                       created_at, updated_at, created_by, updated_by
                FROM teams_tms
                WHERE tms_id = :teamId
            """, [teamId: teamId])
        }
    }

    /**
     * Retrieves all teams from the database.
     * @return A list of maps, where each map is a team.
     */
    def findAllTeams() {
        DatabaseUtil.withSql { sql ->
            def results = sql.rows("""
                SELECT
                    t.tms_id,
                    t.tms_name,
                    t.tms_description,
                    t.tms_email,
                    t.created_at,
                    t.updated_at,
                    t.created_by,
                    t.updated_by,
                    COALESCE(m.member_count, 0) as member_count,
                    COALESCE(a.app_count, 0) as app_count
                FROM teams_tms t
                LEFT JOIN (
                    SELECT tms_id, COUNT(*) as member_count
                    FROM teams_tms_x_users_usr
                    GROUP BY tms_id
                ) m ON t.tms_id = m.tms_id
                LEFT JOIN (
                    SELECT tms_id, COUNT(*) as app_count
                    FROM teams_tms_x_applications_app
                    GROUP BY tms_id
                ) a ON t.tms_id = a.tms_id
                ORDER BY t.tms_name
            """)

            // Return database field names for admin GUI compatibility
            return results
        }
    }

    /**
     * Retrieves teams with pagination, search, and sorting.
     * @param pageNumber The page number (1-based).
     * @param pageSize The number of teams per page.
     * @param searchTerm Optional search term to filter teams.
     * @param sortField Optional field to sort by.
     * @param sortDirection Optional sort direction ('asc' or 'desc').
     * @return A map containing paginated teams data and metadata.
     */
    def findAllTeams(int pageNumber, int pageSize, String searchTerm = null, String sortField = null, String sortDirection = 'asc') {
        DatabaseUtil.withSql { sql ->
            // Build WHERE clause for search
            def whereClause = ""
            def params = [:]
            
            if (searchTerm && !searchTerm.trim().isEmpty()) {
                def trimmedSearch = searchTerm.trim()
                whereClause = "WHERE (t.tms_name ILIKE :searchTerm OR t.tms_description ILIKE :searchTerm OR t.tms_email ILIKE :searchTerm)"
                params.searchTerm = "%${trimmedSearch}%".toString()
            }
            
            // Build ORDER BY clause with validation
            def orderClause = "ORDER BY t.tms_name ASC" // Default sort
            if (sortField) {
                // Validate sort field to prevent SQL injection
                def validSortFields = ['tms_id', 'tms_name', 'tms_description', 'tms_email', 'member_count', 'app_count']
                if (validSortFields.contains(sortField)) {
                    def direction = (sortDirection?.toLowerCase() == 'desc') ? 'DESC' : 'ASC'
                    if (sortField == 'member_count') {
                        orderClause = "ORDER BY COALESCE(m.member_count, 0) ${direction}"
                    } else if (sortField == 'app_count') {
                        orderClause = "ORDER BY COALESCE(a.app_count, 0) ${direction}"
                    } else {
                        orderClause = "ORDER BY t.${sortField} ${direction}"
                    }
                }
            }
            
            // Build the main query
            def baseQuery = """
                SELECT
                    t.tms_id,
                    t.tms_name,
                    t.tms_description,
                    t.tms_email,
                    t.created_at,
                    t.updated_at,
                    t.created_by,
                    t.updated_by,
                    COALESCE(m.member_count, 0) as member_count,
                    COALESCE(a.app_count, 0) as app_count
                FROM teams_tms t
                LEFT JOIN (
                    SELECT tms_id, COUNT(*) as member_count
                    FROM teams_tms_x_users_usr
                    GROUP BY tms_id
                ) m ON t.tms_id = m.tms_id
                LEFT JOIN (
                    SELECT tms_id, COUNT(*) as app_count
                    FROM teams_tms_x_applications_app
                    GROUP BY tms_id
                ) a ON t.tms_id = a.tms_id
                ${whereClause}
                ${orderClause}
            """
            
            // Count total records
            def countQuery = """
                SELECT COUNT(DISTINCT t.tms_id) as total_count
                FROM teams_tms t
                LEFT JOIN (
                    SELECT tms_id, COUNT(*) as member_count
                    FROM teams_tms_x_users_usr
                    GROUP BY tms_id
                ) m ON t.tms_id = m.tms_id
                LEFT JOIN (
                    SELECT tms_id, COUNT(*) as app_count
                    FROM teams_tms_x_applications_app
                    GROUP BY tms_id
                ) a ON t.tms_id = a.tms_id
                ${whereClause}
            """
            
            def totalCount = (sql.firstRow(countQuery, params)?.total_count ?: 0) as Integer
            
            // Calculate pagination
            def offset = (pageNumber - 1) * pageSize
            params.limit = pageSize
            params.offset = offset
            
            // Execute paginated query
            def paginatedQuery = "${baseQuery} LIMIT :limit OFFSET :offset"
            def teams = sql.rows(paginatedQuery, params)
            
            // Calculate pagination metadata
            def totalPages = Math.ceil((double) totalCount / pageSize) as int
            def hasNext = pageNumber < totalPages
            def hasPrevious = pageNumber > 1
            
            return [
                content: teams,
                totalElements: totalCount,
                totalPages: totalPages,
                pageNumber: pageNumber,
                pageSize: pageSize,
                hasNext: hasNext,
                hasPrevious: hasPrevious,
                sortField: sortField,
                sortDirection: sortDirection
            ]
        }
    }

    /**
     * Creates a new team in the database.
     * @param teamData A map containing the data for the new team.
     * @return A map representing the newly created team.
     */
    def createTeam(Map teamData) {
        DatabaseUtil.withSql { sql ->
            def insertQuery = """
                INSERT INTO teams_tms (tms_name, tms_description, tms_email)
                VALUES (:tms_name, :tms_description, :tms_email)
            """

            def generatedKeys = sql.executeInsert(insertQuery, teamData, ['tms_id'])

            if (generatedKeys && generatedKeys[0]) {
                def newId = generatedKeys[0][0] as int
                return findTeamById(newId)
            }

            return null
        }
    }

    /**
     * Updates an existing team.
     * @param teamId The ID of the team to update.
     * @param teamData A map containing the new data for the team.
     * @return A map representing the updated team.
     */
    def updateTeam(int teamId, Map teamData) {
        DatabaseUtil.withSql { sql ->
            if (sql.firstRow('SELECT tms_id FROM teams_tms WHERE tms_id = :teamId', [teamId: teamId]) == null) {
                return null
            }

            def setClauses = []
            def queryParams = [:]
            def updatableFields = ['tms_name', 'tms_description', 'tms_email', 'tms_status']

            teamData.each { key, value ->
                if (key in updatableFields) {
                    setClauses.add("${key} = :${key}")
                    queryParams[key] = value
                }
            }

            if (setClauses.isEmpty()) {
                return
            }

            queryParams['tms_id'] = teamId
            def updateQuery = "UPDATE teams_tms SET ${setClauses.join(', ')} WHERE tms_id = :tms_id"

            sql.executeUpdate(updateQuery, queryParams)
        }
        return findTeamById(teamId)
    }

    /**
     * Deletes a team from the database.
     * @param teamId The ID of the team to delete.
     * @return true if the team was deleted, false otherwise.
     */
    def deleteTeam(int teamId) {
        DatabaseUtil.withSql { sql ->
            def deleteQuery = "DELETE FROM teams_tms WHERE tms_id = :teamId"
            def rowsAffected = sql.executeUpdate(deleteQuery, [teamId: teamId])
            return rowsAffected > 0
        }
    }

    /**
     * Returns all users for a given team, including audit fields from the join table.
     * @param teamId The team ID.
     * @return List of user+membership maps.
     */
    def findTeamMembers(int teamId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
            SELECT
                u.usr_id,
                (u.usr_first_name || ' ' || u.usr_last_name) AS usr_name,
                u.usr_email,
                u.usr_code,
                u.rls_id,
                j.created_at,
                j.created_by
            FROM teams_tms_x_users_usr j
            JOIN users_usr u ON u.usr_id = j.usr_id
            WHERE j.tms_id = :teamId
            ORDER BY u.usr_last_name, u.usr_first_name
        """, [teamId: teamId])
        }
    }

    /**
     * Adds a user to a team.
     * @param teamId The ID of the team.
     * @param userId The ID of the user.
     * @return A map with status: 'created' on success, 'exists' if already a member.
     */
    def addUserToTeam(int teamId, int userId) {
        DatabaseUtil.withSql { sql ->
            def existing = sql.firstRow("""SELECT 1 FROM teams_tms_x_users_usr WHERE tms_id = :teamId AND usr_id = :userId""", [teamId: teamId, userId: userId])
            if (existing) {
                return [status: 'exists']
            }

            def insertQuery = """
                INSERT INTO teams_tms_x_users_usr (tms_id, usr_id, created_at, created_by)
                VALUES (:teamId, :userId, now(), null) -- Assuming created_by can be null or has a default
            """
            def rowsAffected = sql.executeUpdate(insertQuery, [teamId: teamId, userId: userId])
            return rowsAffected > 0 ? [status: 'created'] : [status: 'error']
        }
    }

    /**
     * Removes a user from a team.
     * @param teamId The ID of the team.
     * @param userId The ID of the user.
     * @return The number of rows affected (1 if successful, 0 if not).
     */
    def removeUserFromTeam(int teamId, int userId) {
        DatabaseUtil.withSql { sql ->
            def deleteQuery = "DELETE FROM teams_tms_x_users_usr WHERE tms_id = :teamId AND usr_id = :userId"
            return sql.executeUpdate(deleteQuery, [teamId: teamId, userId: userId])
        }
    }

    /**
     * Finds teams involved in a specific migration.
     * @param migrationId The UUID of the migration.
     * @return A list of teams involved in the migration.
     */
    def findTeamsByMigrationId(UUID migrationId) {
        DatabaseUtil.withSql { sql ->
            def results = sql.rows("""
                SELECT DISTINCT 
                    t.tms_id, 
                    t.tms_name, 
                    t.tms_description, 
                    t.tms_email,
                    COALESCE(m.member_count, 0) as member_count,
                    COALESCE(a.app_count, 0) as app_count
                FROM teams_tms t
                JOIN steps_master_stm_x_teams_tms_impacted sti ON t.tms_id = sti.tms_id
                JOIN steps_master_stm s ON sti.stm_id = s.stm_id
                JOIN phases_master_phm p ON s.phm_id = p.phm_id
                JOIN sequences_master_sqm sq ON p.sqm_id = sq.sqm_id
                JOIN plans_master_plm pl ON sq.plm_id = pl.plm_id
                JOIN iterations_ite i ON pl.plm_id = i.plm_id
                LEFT JOIN (
                    SELECT tms_id, COUNT(*) as member_count
                    FROM teams_tms_x_users_usr
                    GROUP BY tms_id
                ) m ON t.tms_id = m.tms_id
                LEFT JOIN (
                    SELECT tms_id, COUNT(*) as app_count
                    FROM teams_tms_x_applications_app
                    GROUP BY tms_id
                ) a ON t.tms_id = a.tms_id
                WHERE i.mig_id = :migrationId
                ORDER BY t.tms_name
            """, [migrationId: migrationId])
            
            // Transform to normalized field names for iteration view consumer
            return results.collect { row ->
                [
                    id: row.tms_id,
                    name: row.tms_name,
                    description: row.tms_description,
                    email: row.tms_email,
                    member_count: row.member_count,
                    app_count: row.app_count
                ]
            }
        }
    }

    /**
     * Finds teams involved in a specific iteration.
     * @param iterationId The UUID of the iteration.
     * @return A list of teams involved in the iteration.
     */
    def findTeamsByIterationId(UUID iterationId) {
        DatabaseUtil.withSql { sql ->
            def results = sql.rows("""
                SELECT DISTINCT
                    t.tms_id,
                    t.tms_name,
                    t.tms_description,
                    t.tms_email,
                    COALESCE(m.member_count, 0) as member_count,
                    COALESCE(a.app_count, 0) as app_count
                FROM teams_tms t
                JOIN steps_master_stm s ON t.tms_id = s.tms_id_owner
                JOIN steps_instance_sti si ON s.stm_id = si.stm_id
                JOIN phases_instance_phi phi ON si.phi_id = phi.phi_id
                JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                LEFT JOIN (
                    SELECT tms_id, COUNT(*) as member_count
                    FROM teams_tms_x_users_usr
                    GROUP BY tms_id
                ) m ON t.tms_id = m.tms_id
                LEFT JOIN (
                    SELECT tms_id, COUNT(*) as app_count
                    FROM teams_tms_x_applications_app
                    GROUP BY tms_id
                ) a ON t.tms_id = a.tms_id
                WHERE pli.ite_id = :iterationId
                ORDER BY t.tms_name
            """, [iterationId: iterationId])
            
            // Transform to normalized field names for iteration view consumer
            return results.collect { row ->
                [
                    id: row.tms_id,
                    name: row.tms_name,
                    description: row.tms_description,
                    email: row.tms_email,
                    member_count: row.member_count,
                    app_count: row.app_count
                ]
            }
        }
    }

    /**
     * Finds teams involved in a specific plan instance.
     * @param planInstanceId The UUID of the plan instance.
     * @return A list of teams involved in the plan instance.
     */
    def findTeamsByPlanId(UUID planInstanceId) {
        DatabaseUtil.withSql { sql ->
            def results = sql.rows("""
                SELECT DISTINCT 
                    t.tms_id, 
                    t.tms_name, 
                    t.tms_description, 
                    t.tms_email,
                    COALESCE(m.member_count, 0) as member_count,
                    COALESCE(a.app_count, 0) as app_count
                FROM teams_tms t
                JOIN steps_master_stm_x_teams_tms_impacted sti ON t.tms_id = sti.tms_id
                JOIN steps_master_stm s ON sti.stm_id = s.stm_id
                JOIN phases_master_phm p ON s.phm_id = p.phm_id
                JOIN sequences_master_sqm sq ON p.sqm_id = sq.sqm_id
                JOIN plans_instance_pli pli ON sq.plm_id = pli.plm_id
                LEFT JOIN (
                    SELECT tms_id, COUNT(*) as member_count
                    FROM teams_tms_x_users_usr
                    GROUP BY tms_id
                ) m ON t.tms_id = m.tms_id
                LEFT JOIN (
                    SELECT tms_id, COUNT(*) as app_count
                    FROM teams_tms_x_applications_app
                    GROUP BY tms_id
                ) a ON t.tms_id = a.tms_id
                WHERE pli.pli_id = :planInstanceId
                ORDER BY t.tms_name
            """, [planInstanceId: planInstanceId])
            
            // Transform to normalized field names for iteration view consumer
            return results.collect { row ->
                [
                    id: row.tms_id,
                    name: row.tms_name,
                    description: row.tms_description,
                    email: row.tms_email,
                    member_count: row.member_count,
                    app_count: row.app_count
                ]
            }
        }
    }

    /**
     * Finds teams involved in a specific sequence instance.
     * @param sequenceInstanceId The UUID of the sequence instance.
     * @return A list of teams involved in the sequence instance.
     */
    def findTeamsBySequenceId(UUID sequenceInstanceId) {
        DatabaseUtil.withSql { sql ->
            def results = sql.rows("""
                SELECT DISTINCT
                    t.tms_id,
                    t.tms_name,
                    t.tms_description,
                    t.tms_email,
                    COALESCE(m.member_count, 0) as member_count,
                    COALESCE(a.app_count, 0) as app_count
                FROM teams_tms t
                JOIN steps_master_stm s ON t.tms_id = s.tms_id_owner
                JOIN steps_instance_sti si ON s.stm_id = si.stm_id
                JOIN phases_instance_phi phi ON si.phi_id = phi.phi_id
                JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                LEFT JOIN (
                    SELECT tms_id, COUNT(*) as member_count
                    FROM teams_tms_x_users_usr
                    GROUP BY tms_id
                ) m ON t.tms_id = m.tms_id
                LEFT JOIN (
                    SELECT tms_id, COUNT(*) as app_count
                    FROM teams_tms_x_applications_app
                    GROUP BY tms_id
                ) a ON t.tms_id = a.tms_id
                WHERE sqi.sqi_id = :sequenceInstanceId
                ORDER BY t.tms_name
            """, [sequenceInstanceId: sequenceInstanceId])
            
            // Transform to normalized field names for iteration view consumer
            return results.collect { row ->
                [
                    id: row.tms_id,
                    name: row.tms_name,
                    description: row.tms_description,
                    email: row.tms_email,
                    member_count: row.member_count,
                    app_count: row.app_count
                ]
            }
        }
    }

    /**
     * Finds teams involved in a specific phase instance.
     * @param phaseInstanceId The UUID of the phase instance.
     * @return A list of teams involved in the phase instance.
     */
    def findTeamsByPhaseId(UUID phaseInstanceId) {
        DatabaseUtil.withSql { sql ->
            def results = sql.rows("""
                SELECT DISTINCT
                    t.tms_id,
                    t.tms_name,
                    t.tms_description,
                    t.tms_email,
                    COALESCE(m.member_count, 0) as member_count,
                    COALESCE(a.app_count, 0) as app_count
                FROM teams_tms t
                JOIN steps_master_stm s ON t.tms_id = s.tms_id_owner
                JOIN steps_instance_sti si ON s.stm_id = si.stm_id
                JOIN phases_instance_phi phi ON si.phi_id = phi.phi_id
                LEFT JOIN (
                    SELECT tms_id, COUNT(*) as member_count
                    FROM teams_tms_x_users_usr
                    GROUP BY tms_id
                ) m ON t.tms_id = m.tms_id
                LEFT JOIN (
                    SELECT tms_id, COUNT(*) as app_count
                    FROM teams_tms_x_applications_app
                    GROUP BY tms_id
                ) a ON t.tms_id = a.tms_id
                WHERE phi.phi_id = :phaseInstanceId
                ORDER BY t.tms_name
            """, [phaseInstanceId: phaseInstanceId])
            
            // Transform to normalized field names for iteration view consumer
            return results.collect { row ->
                [
                    id: row.tms_id,
                    name: row.tms_name,
                    description: row.tms_description,
                    email: row.tms_email,
                    member_count: row.member_count,
                    app_count: row.app_count
                ]
            }
        }
    }

    /**
     * Finds applications associated with a team.
     * @param teamId The ID of the team.
     * @return A list of applications associated with the team.
     */
    def findTeamApplications(int teamId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT
                    a.app_id,
                    a.app_name,
                    a.app_code,
                    a.app_description
                FROM applications_app a
                JOIN teams_tms_x_applications_app j ON a.app_id = j.app_id
                WHERE j.tms_id = :teamId
                ORDER BY a.app_name
            """, [teamId: teamId])
        }
    }

    /**
     * Adds an application to a team.
     * @param teamId The ID of the team.
     * @param applicationId The ID of the application to add.
     * @return A map with status information.
     */
    def addApplicationToTeam(int teamId, int applicationId) {
        DatabaseUtil.withSql { sql ->
            def existing = sql.firstRow("""SELECT 1 FROM teams_tms_x_applications_app WHERE tms_id = :teamId AND app_id = :applicationId""", [teamId: teamId, applicationId: applicationId])
            if (existing) {
                return [status: 'exists']
            }
            def insertQuery = """
                INSERT INTO teams_tms_x_applications_app (tms_id, app_id)
                VALUES (:teamId, :applicationId)
            """
            sql.executeUpdate(insertQuery, [teamId: teamId, applicationId: applicationId])
            return [status: 'created']
        }
    }

    /**
     * Removes an application from a team.
     * @param teamId The ID of the team.
     * @param applicationId The ID of the application to remove.
     * @return The number of rows affected.
     */
    def removeApplicationFromTeam(int teamId, int applicationId) {
        DatabaseUtil.withSql { sql ->
            def deleteQuery = "DELETE FROM teams_tms_x_applications_app WHERE tms_id = :teamId AND app_id = :applicationId"
            return sql.executeUpdate(deleteQuery, [teamId: teamId, applicationId: applicationId])
        }
    }

    // BIDIRECTIONAL RELATIONSHIP MANAGEMENT METHODS

    /**
     * Get all teams for a specific user with membership details.
     * Optimized for performance with CTEs and simplified role logic.
     * @param userId The ID of the user.
     * @param includeArchived Whether to include archived teams (default: false).
     * @return List of teams with membership details.
     */
    def getTeamsForUser(int userId, boolean includeArchived = false) {
        DatabaseUtil.withSql { sql ->
            def whereClause = includeArchived ? "" : "AND t.tms_status != 'archived'"
            return sql.rows("""
                WITH team_stats AS (
                    -- Pre-calculate team statistics once
                    SELECT 
                        tms_id,
                        COUNT(*) as member_count,
                        MIN(created_at) + INTERVAL '1 day' as admin_threshold
                    FROM teams_tms_x_users_usr
                    GROUP BY tms_id
                ),
                user_teams AS (
                    -- Get user's team memberships with simplified role logic
                    SELECT 
                        j.tms_id,
                        j.created_at as membership_created,
                        j.created_by as membership_created_by,
                        CASE 
                            WHEN j.created_by = :userId THEN 'owner'
                            WHEN j.created_at < ts.admin_threshold THEN 'admin'
                            ELSE 'member'
                        END as role,
                        ts.member_count,
                        ts.admin_threshold
                    FROM teams_tms_x_users_usr j
                    JOIN team_stats ts ON ts.tms_id = j.tms_id
                    WHERE j.usr_id = :userId
                )
                SELECT 
                    t.tms_id,
                    t.tms_name,
                    t.tms_description,
                    t.tms_email,
                    t.tms_status,
                    ut.membership_created,
                    ut.membership_created_by,
                    COALESCE(ut.member_count, 0) as total_members,
                    ut.role
                FROM teams_tms t
                JOIN user_teams ut ON t.tms_id = ut.tms_id
                WHERE 1=1
                ${whereClause}
                ORDER BY ut.membership_created DESC, t.tms_name
            """, [userId: userId])
        }
    }

    /**
     * Get all users for a specific team with roles and status.
     * Optimized for performance with CTEs and simplified role logic.
     * @param teamId The ID of the team.
     * @param includeInactive Whether to include inactive users (default: false).
     * @return List of users with their roles and membership details.
     */
    def getUsersForTeam(int teamId, boolean includeInactive = false) {
        DatabaseUtil.withSql { sql ->
            def whereClause = includeInactive ? "" : "AND u.usr_active = true"
            return sql.rows("""
                WITH team_metadata AS (
                    -- Calculate admin threshold once for the team
                    SELECT 
                        MIN(created_at) + INTERVAL '1 day' as admin_threshold
                    FROM teams_tms_x_users_usr
                    WHERE tms_id = :teamId
                ),
                team_members AS (
                    -- Get all team members with role calculation
                    SELECT 
                        j.usr_id,
                        j.created_at as membership_created,
                        j.created_by as membership_created_by,
                        CASE 
                            WHEN j.created_by = j.usr_id THEN 'owner'
                            WHEN j.created_at < tm.admin_threshold THEN 'admin'
                            ELSE 'member'
                        END as role,
                        CASE 
                            WHEN j.created_by = j.usr_id THEN 1
                            WHEN j.created_at < tm.admin_threshold THEN 2
                            ELSE 3
                        END as role_priority,
                        EXTRACT(DAYS FROM (NOW() - j.created_at)) as days_in_team
                    FROM teams_tms_x_users_usr j
                    CROSS JOIN team_metadata tm
                    WHERE j.tms_id = :teamId
                )
                SELECT 
                    u.usr_id,
                    u.usr_first_name,
                    u.usr_last_name,
                    (u.usr_first_name || ' ' || u.usr_last_name) AS usr_name,
                    u.usr_email,
                    u.usr_code,
                    u.usr_active,
                    u.rls_id,
                    tm.membership_created,
                    tm.membership_created_by,
                    creator.usr_first_name || ' ' || creator.usr_last_name as created_by_name,
                    tm.role,
                    tm.days_in_team
                FROM team_members tm
                JOIN users_usr u ON u.usr_id = tm.usr_id
                LEFT JOIN users_usr creator ON creator.usr_id = tm.membership_created_by
                WHERE 1=1
                ${whereClause}
                ORDER BY 
                    tm.role_priority,
                    tm.membership_created ASC,
                    u.usr_last_name, u.usr_first_name
            """, [teamId: teamId])
        }
    }

    /**
     * Validate bidirectional relationship integrity between team and user.
     * @param teamId The ID of the team.
     * @param userId The ID of the user.
     * @return Map with validation results and details.
     */
    def validateRelationshipIntegrity(int teamId, int userId) {
        DatabaseUtil.withSql { sql ->
            def result = [:]
            
            // Check if team exists
            def team = sql.firstRow("SELECT tms_id, tms_name, tms_status FROM teams_tms WHERE tms_id = :teamId", [teamId: teamId])
            result.teamExists = team != null
            result.teamStatus = team?.tms_status
            
            // Check if user exists
            def user = sql.firstRow("SELECT usr_id, usr_first_name, usr_last_name, usr_active FROM users_usr WHERE usr_id = :userId", [userId: userId])
            result.userExists = user != null
            result.userActive = user?.usr_active ?: false
            
            // Check if relationship exists
            def relationship = sql.firstRow("""
                SELECT created_at, created_by 
                FROM teams_tms_x_users_usr 
                WHERE tms_id = :teamId AND usr_id = :userId
            """, [teamId: teamId, userId: userId])
            result.relationshipExists = relationship != null
            result.membershipDate = relationship?.created_at
            
            // Check for orphaned relationships
            int orphanedFromTeam = (sql.firstRow("""
                SELECT COUNT(*) as count
                FROM teams_tms_x_users_usr j
                LEFT JOIN teams_tms t ON t.tms_id = j.tms_id
                WHERE j.usr_id = :userId AND t.tms_id IS NULL
            """, [userId: userId])?.count ?: 0) as Integer

            int orphanedFromUser = (sql.firstRow("""
                SELECT COUNT(*) as count
                FROM teams_tms_x_users_usr j
                LEFT JOIN users_usr u ON u.usr_id = j.usr_id
                WHERE j.tms_id = :teamId AND u.usr_id IS NULL
            """, [teamId: teamId])?.count ?: 0) as Integer
            
            result.orphanedRelationships = [
                fromTeam: orphanedFromTeam,
                fromUser: orphanedFromUser
            ]
            
            // Overall integrity check
            result.isValid = result.teamExists && result.userExists && 
                           (result.relationshipExists ? (result.teamStatus != 'deleted' && result.userActive) : true) &&
                           orphanedFromTeam == 0 && orphanedFromUser == 0
            
            // Detailed validation messages
            List<String> validationMessages = []
            result.validationMessages = validationMessages
            if (!result.teamExists) {
                validationMessages << "Team with ID ${teamId} does not exist".toString()
            }
            if (!result.userExists) {
                validationMessages << "User with ID ${userId} does not exist".toString()
            }
            if (result.relationshipExists && result.teamStatus == 'deleted') {
                validationMessages << "Team is marked as deleted but relationship still exists".toString()
            }
            if (result.relationshipExists && !result.userActive) {
                validationMessages << "User is inactive but relationship still exists".toString()
            }
            if (orphanedFromTeam > 0) {
                validationMessages << "User has ${orphanedFromTeam} orphaned team relationships".toString()
            }
            if (orphanedFromUser > 0) {
                validationMessages << "Team has ${orphanedFromUser} orphaned user relationships".toString()
            }
            
            return result
        }
    }

    /**
     * Protect against cascade delete by checking for active relationships.
     * @param teamId The ID of the team to check.
     * @return Map with protection status and blocking relationships.
     */
    def protectCascadeDelete(int teamId) {
        DatabaseUtil.withSql { sql ->
            def result = [
                canDelete: true,
                blockingRelationships: [:],
                totalBlockingItems: 0 as Integer
            ]
            
            // Get active team members
            def activeMembers = sql.rows("""
                SELECT u.usr_id, (u.usr_first_name || ' ' || u.usr_last_name) AS usr_name, u.usr_email
                FROM teams_tms_x_users_usr j
                JOIN users_usr u ON u.usr_id = j.usr_id
                WHERE j.tms_id = :teamId AND u.usr_active = true
            """, [teamId: teamId])
            
            if (activeMembers) {
                result.blockingRelationships['active_members'] = activeMembers
                result.totalBlockingItems = (result.totalBlockingItems as Integer) + (activeMembers.size() as Integer)
                result.canDelete = false
            }
            
            // Get active applications
            def activeApplications = sql.rows("""
                SELECT a.app_id, a.app_name, a.app_code
                FROM teams_tms_x_applications_app j
                JOIN applications_app a ON a.app_id = j.app_id
                WHERE j.tms_id = :teamId
            """, [teamId: teamId])
            
            if (activeApplications) {
                result.blockingRelationships['active_applications'] = activeApplications
                result.totalBlockingItems = (result.totalBlockingItems as Integer) + (activeApplications.size() as Integer)
                result.canDelete = false
            }
            
            // Get impacted steps
            def impactedSteps = sql.rows("""
                SELECT s.stm_id, s.stm_name, s.stm_description
                FROM steps_master_stm_x_teams_tms_impacted i
                JOIN steps_master_stm s ON s.stm_id = i.stm_id
                WHERE i.tms_id = :teamId
            """, [teamId: teamId])
            
            if (impactedSteps) {
                result.blockingRelationships['impacted_steps'] = impactedSteps
                result.totalBlockingItems = (result.totalBlockingItems as Integer) + (impactedSteps.size() as Integer)
                result.canDelete = false
            }
            
            // Check for active migrations involving this team
            def activeMigrations = sql.rows("""
                SELECT DISTINCT i.mig_id, m.mig_name, m.mig_status
                FROM iterations_ite i
                JOIN migrations_mig m ON m.mig_id = i.mig_id
                JOIN plans_master_plm pl ON pl.plm_id = i.plm_id
                JOIN sequences_master_sqm sq ON sq.plm_id = pl.plm_id
                JOIN phases_master_phm p ON p.sqm_id = sq.sqm_id
                JOIN steps_master_stm s ON s.phm_id = p.phm_id
                JOIN steps_master_stm_x_teams_tms_impacted sti ON sti.stm_id = s.stm_id
                WHERE sti.tms_id = :teamId 
                AND m.mig_status IN ('planned', 'in_progress', 'pending')
            """, [teamId: teamId])
            
            if (activeMigrations) {
                result.blockingRelationships['active_migrations'] = activeMigrations
                result.totalBlockingItems = (result.totalBlockingItems as Integer) + (activeMigrations.size() as Integer)
                result.canDelete = false
            }
            
            result.protectionLevel = result.canDelete ? 'none' :
                                   ((result.totalBlockingItems as Integer) > 10 ? 'high' :
                                    (result.totalBlockingItems as Integer) > 5 ? 'medium' : 'low')
            
            return result
        }
    }

    /**
     * Soft delete a team by setting status to archived.
     * @param teamId The ID of the team to archive.
     * @param userContext Map containing user information for audit.
     * @return Map with soft delete results.
     */
    def softDeleteTeam(int teamId, Map userContext = [:]) {
        DatabaseUtil.withSql { sql ->
            def result = [success: false, archivedAt: null, previousStatus: null]
            
            // Get current team status
            def team = sql.firstRow("SELECT tms_status FROM teams_tms WHERE tms_id = :teamId", [teamId: teamId])
            if (!team) {
                result.error = "Team not found"
                return result
            }
            
            result.previousStatus = team.tms_status
            
            // Check if already archived
            if (team.tms_status == 'archived') {
                result.error = "Team is already archived"
                return result
            }
            
            // Update status to archived with timestamp
            def now = new Date()
            def updateQuery = """
                UPDATE teams_tms 
                SET tms_status = 'archived',
                    tms_archived_at = :archivedAt,
                    tms_archived_by = :archivedBy
                WHERE tms_id = :teamId
            """
            
            def rowsAffected = sql.executeUpdate(updateQuery, [
                teamId: teamId,
                archivedAt: now,
                archivedBy: userContext.userId ?: null
            ])
            
            if (rowsAffected > 0) {
                result.success = true
                result.archivedAt = now
                
                // Create audit log entry
                sql.executeUpdate("""
                    INSERT INTO audit_log (entity_type, entity_id, action, old_value, new_value, changed_by, changed_at)
                    VALUES ('team', :teamId, 'soft_delete', :oldStatus, 'archived', :changedBy, :changedAt)
                """, [
                    teamId: teamId,
                    oldStatus: result.previousStatus,
                    changedBy: userContext.userId ?: 'system',
                    changedAt: now
                ])
            }
            
            return result
        }
    }

    /**
     * Restore an archived team.
     * @param teamId The ID of the team to restore.
     * @param userContext Map containing user information for audit.
     * @return Map with restore results.
     */
    def restoreTeam(int teamId, Map userContext = [:]) {
        DatabaseUtil.withSql { sql ->
            def result = [success: false, restoredAt: null, newStatus: 'active']
            
            // Get current team status
            def team = sql.firstRow("""
                SELECT tms_status, tms_archived_at 
                FROM teams_tms 
                WHERE tms_id = :teamId
            """, [teamId: teamId])
            
            if (!team) {
                result.error = "Team not found"
                return result
            }
            
            if (team.tms_status != 'archived') {
                result.error = "Team is not archived"
                return result
            }
            
            // Restore team to active status
            def now = new Date()
            def updateQuery = """
                UPDATE teams_tms 
                SET tms_status = 'active',
                    tms_archived_at = NULL,
                    tms_archived_by = NULL,
                    tms_restored_at = :restoredAt,
                    tms_restored_by = :restoredBy
                WHERE tms_id = :teamId
            """
            
            def rowsAffected = sql.executeUpdate(updateQuery, [
                teamId: teamId,
                restoredAt: now,
                restoredBy: userContext.userId ?: null
            ])
            
            if (rowsAffected > 0) {
                result.success = true
                result.restoredAt = now
                
                // Create audit log entry
                sql.executeUpdate("""
                    INSERT INTO audit_log (entity_type, entity_id, action, old_value, new_value, changed_by, changed_at)
                    VALUES ('team', :teamId, 'restore', 'archived', 'active', :changedBy, :changedAt)
                """, [
                    teamId: teamId,
                    changedBy: userContext.userId ?: 'system',
                    changedAt: now
                ])
            }
            
            return result
        }
    }

    /**
     * Clean up orphaned member relationships.
     * @return Map with cleanup results and statistics.
     */
    def cleanupOrphanedMembers() {
        DatabaseUtil.withSql { sql ->
            def result = [
                orphanedFromTeams: 0 as Integer,
                orphanedFromUsers: 0 as Integer,
                invalidRelationships: 0 as Integer,
                totalCleaned: 0 as Integer,
                details: [] as List<String>
            ]
            
            // Find and remove relationships where team no longer exists
            int orphanedFromTeams = sql.executeUpdate("""
                DELETE FROM teams_tms_x_users_usr
                WHERE tms_id NOT IN (SELECT tms_id FROM teams_tms)
            """) as Integer
            result.orphanedFromTeams = orphanedFromTeams

            if (orphanedFromTeams > 0) {
                (result.details as List<String>) << "Removed ${orphanedFromTeams} relationships with non-existent teams".toString()
            }

            // Find and remove relationships where user no longer exists
            int orphanedFromUsers = sql.executeUpdate("""
                DELETE FROM teams_tms_x_users_usr
                WHERE usr_id NOT IN (SELECT usr_id FROM users_usr)
            """) as Integer
            result.orphanedFromUsers = orphanedFromUsers

            if (orphanedFromUsers > 0) {
                (result.details as List<String>) << "Removed ${orphanedFromUsers} relationships with non-existent users".toString()
            }

            // Find and remove relationships with archived teams and inactive users
            int invalidRelationships = sql.executeUpdate("""
                DELETE FROM teams_tms_x_users_usr j
                WHERE EXISTS (
                    SELECT 1 FROM teams_tms t
                    WHERE t.tms_id = j.tms_id
                    AND t.tms_status = 'deleted'
                ) OR EXISTS (
                    SELECT 1 FROM users_usr u
                    WHERE u.usr_id = j.usr_id
                    AND u.usr_active = false
                    AND j.created_at < (NOW() - INTERVAL '90 days')
                )
            """) as Integer
            result.invalidRelationships = invalidRelationships

            if (invalidRelationships > 0) {
                (result.details as List<String>) << "Removed ${invalidRelationships} invalid relationships (deleted teams/inactive users)".toString()
            }
            
            // Find teams without any owners
            def teamsWithoutOwners = sql.rows("""
                SELECT t.tms_id, t.tms_name, COUNT(j.usr_id) as member_count
                FROM teams_tms t
                LEFT JOIN teams_tms_x_users_usr j ON t.tms_id = j.tms_id
                WHERE t.tms_status = 'active'
                GROUP BY t.tms_id, t.tms_name
                HAVING COUNT(j.usr_id) = 0
            """)
            
            if (teamsWithoutOwners) {
                (result.details as List<String>) << "Found ${teamsWithoutOwners.size()} teams without any members that may need attention".toString()
                result.teamsWithoutMembers = teamsWithoutOwners
            }

            result.totalCleaned = (result.orphanedFromTeams as Integer) + (result.orphanedFromUsers as Integer) + (result.invalidRelationships as Integer)

            // Create audit log entry for cleanup
            if ((result.totalCleaned as Integer) > 0) {
                sql.executeUpdate("""
                    INSERT INTO audit_log (entity_type, entity_id, action, old_value, new_value, changed_by, changed_at)
                    VALUES ('system', NULL, 'cleanup_orphaned_members', :oldCount, :newCount, 'system', :changedAt)
                """, [
                    oldCount: result.totalCleaned.toString(),
                    newCount: '0',
                    changedAt: new Date()
                ])
            }
            
            return result
        }
    }

    /**
     * Get comprehensive team statistics for relationship analysis.
     * @return Map with team statistics and relationship health metrics.
     */
    def getTeamRelationshipStatistics() {
        DatabaseUtil.withSql { sql ->
            def stats = [:]
            
            // Basic team counts
            def teamCounts = sql.firstRow("""
                SELECT 
                    COUNT(*) as total_teams,
                    COUNT(CASE WHEN tms_status = 'active' THEN 1 END) as active_teams,
                    COUNT(CASE WHEN tms_status = 'archived' THEN 1 END) as archived_teams,
                    COUNT(CASE WHEN tms_status = 'deleted' THEN 1 END) as deleted_teams
                FROM teams_tms
            """)
            stats.teams = teamCounts
            
            // Member statistics
            def memberStats = sql.firstRow("""
                SELECT 
                    COUNT(*) as total_memberships,
                    COUNT(DISTINCT usr_id) as unique_users,
                    COUNT(DISTINCT tms_id) as teams_with_members,
                    AVG(members_per_team) as avg_members_per_team,
                    MAX(members_per_team) as max_members_per_team
                FROM (
                    SELECT tms_id, COUNT(usr_id) as members_per_team
                    FROM teams_tms_x_users_usr
                    GROUP BY tms_id
                ) team_counts
            """)
            stats.members = memberStats
            
            // Relationship health
            def healthStats = sql.firstRow("""
                SELECT 
                    COUNT(CASE WHEN t.tms_id IS NULL THEN 1 END) as orphaned_from_teams,
                    COUNT(CASE WHEN u.usr_id IS NULL THEN 1 END) as orphaned_from_users,
                    COUNT(CASE WHEN t.tms_status = 'deleted' THEN 1 END) as relationships_with_deleted_teams,
                    COUNT(CASE WHEN u.usr_active = false THEN 1 END) as relationships_with_inactive_users
                FROM teams_tms_x_users_usr j
                LEFT JOIN teams_tms t ON t.tms_id = j.tms_id
                LEFT JOIN users_usr u ON u.usr_id = j.usr_id
            """)
            stats.health = healthStats
            
            // Team size distribution
            def sizeDistribution = sql.rows("""
                SELECT 
                    CASE 
                        WHEN member_count = 0 THEN '0 members'
                        WHEN member_count = 1 THEN '1 member'
                        WHEN member_count BETWEEN 2 AND 5 THEN '2-5 members'
                        WHEN member_count BETWEEN 6 AND 10 THEN '6-10 members'
                        WHEN member_count BETWEEN 11 AND 20 THEN '11-20 members'
                        ELSE '20+ members'
                    END as size_category,
                    COUNT(*) as team_count
                FROM (
                    SELECT t.tms_id, COUNT(j.usr_id) as member_count
                    FROM teams_tms t
                    LEFT JOIN teams_tms_x_users_usr j ON t.tms_id = j.tms_id
                    WHERE t.tms_status = 'active'
                    GROUP BY t.tms_id
                ) team_sizes
                GROUP BY size_category
                ORDER BY 
                    CASE size_category
                        WHEN '0 members' THEN 1
                        WHEN '1 member' THEN 2
                        WHEN '2-5 members' THEN 3
                        WHEN '6-10 members' THEN 4
                        WHEN '11-20 members' THEN 5
                        ELSE 6
                    END
            """)
            stats.sizeDistribution = sizeDistribution
            
            return stats
        }
    }
}
