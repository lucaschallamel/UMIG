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
                SELECT u.usr_id, u.usr_code, u.usr_first_name, u.usr_last_name, u.usr_email,
                       u.usr_is_admin, u.usr_active, u.rls_id, u.created_at, u.updated_at, u.created_by, u.updated_by,
                       r.rls_code as role_code, r.rls_description as role_description
                FROM users_usr u
                LEFT JOIN roles_rls r ON u.rls_id = r.rls_id
                WHERE u.usr_id = :userId
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
     * Finds a user by their username (usr_code) with role information.
     * @param username The username (usr_code) to search for.
     * @return User object with role information or null if not found.
     */
    def findUserByUsername(String username) {
        DatabaseUtil.withSql { sql ->
            def user = sql.firstRow("""
                SELECT u.usr_id, u.usr_code, u.usr_first_name, u.usr_last_name, u.usr_email,
                       u.usr_is_admin, u.usr_active, u.rls_id, u.usr_confluence_user_id,
                       u.created_at, u.updated_at, u.created_by, u.updated_by,
                       r.rls_code as role_code, r.rls_description as role_description
                FROM users_usr u
                LEFT JOIN roles_rls r ON u.rls_id = r.rls_id
                WHERE LOWER(u.usr_code) = LOWER(:username) OR LOWER(u.usr_confluence_user_id) = LOWER(:username)
            """, [username: username])
            
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
                SELECT u.usr_id, u.usr_code, u.usr_first_name, u.usr_last_name, u.usr_email, u.usr_is_admin, u.usr_active, u.rls_id, u.created_at, u.updated_at, u.created_by, u.updated_by,
                       r.rls_code as role_code, r.rls_description as role_description
                FROM users_usr u
                LEFT JOIN roles_rls r ON u.rls_id = r.rls_id
                ORDER BY u.usr_id
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
                SELECT u.usr_id, u.usr_code, u.usr_first_name, u.usr_last_name, u.usr_email, u.usr_is_admin, u.usr_active, u.rls_id, u.created_at, u.updated_at, u.created_by, u.updated_by,
                       r.rls_code as role_code, r.rls_description as role_description
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

            // Step instances - Note: usr_id_owner and usr_id_assignee columns were removed in migration 015
            // These queries have been removed as the columns no longer exist in the database

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

    // BIDIRECTIONAL RELATIONSHIP MANAGEMENT METHODS
    // Following the proven patterns from TeamRepository implementation

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
     * Validate bidirectional relationship integrity between user and team.
     * @param userId The ID of the user.
     * @param teamId The ID of the team.
     * @return Map with validation results and details.
     */
    def validateRelationshipIntegrity(int userId, int teamId) {
        DatabaseUtil.withSql { sql ->
            def result = [:]
            
            // Check if user exists
            def user = sql.firstRow("SELECT usr_id, usr_first_name, usr_last_name, usr_active FROM users_usr WHERE usr_id = :userId", [userId: userId])
            result.userExists = user != null
            result.userActive = user?.usr_active ?: false
            result.userName = user ? "${user.usr_first_name} ${user.usr_last_name}".toString() : null
            
            // Check if team exists
            def team = sql.firstRow("SELECT tms_id, tms_name, tms_status FROM teams_tms WHERE tms_id = :teamId", [teamId: teamId])
            result.teamExists = team != null
            result.teamStatus = team?.tms_status
            result.teamName = team?.tms_name
            
            // Check if relationship exists
            def relationship = sql.firstRow("""
                SELECT created_at, created_by 
                FROM teams_tms_x_users_usr 
                WHERE usr_id = :userId AND tms_id = :teamId
            """, [userId: userId, teamId: teamId])
            result.relationshipExists = relationship != null
            result.membershipDate = relationship?.created_at
            
            // Check for orphaned relationships
            int orphanedFromUser = (sql.firstRow("""
                SELECT COUNT(*) as count
                FROM teams_tms_x_users_usr j
                LEFT JOIN users_usr u ON u.usr_id = j.usr_id
                WHERE j.tms_id = :teamId AND u.usr_id IS NULL
            """, [teamId: teamId])?.count ?: 0) as Integer

            int orphanedFromTeam = (sql.firstRow("""
                SELECT COUNT(*) as count
                FROM teams_tms_x_users_usr j
                LEFT JOIN teams_tms t ON t.tms_id = j.tms_id
                WHERE j.usr_id = :userId AND t.tms_id IS NULL
            """, [userId: userId])?.count ?: 0) as Integer
            
            result.orphanedRelationships = [
                fromUser: orphanedFromUser,
                fromTeam: orphanedFromTeam
            ]
            
            // Overall integrity check
            result.isValid = result.userExists && result.teamExists && 
                           (result.relationshipExists ? (result.userActive && result.teamStatus != 'deleted') : true) &&
                           orphanedFromUser == 0 && orphanedFromTeam == 0
            
            // Detailed validation messages
            List<String> validationMessages = []
            result.validationMessages = validationMessages
            if (!result.userExists) {
                validationMessages << "User with ID ${userId} does not exist".toString()
            }
            if (!result.teamExists) {
                validationMessages << "Team with ID ${teamId} does not exist".toString()
            }
            if (result.relationshipExists && !result.userActive) {
                validationMessages << "User is inactive but relationship still exists".toString()
            }
            if (result.relationshipExists && result.teamStatus == 'deleted') {
                validationMessages << "Team is marked as deleted but relationship still exists".toString()
            }
            if (orphanedFromUser > 0) {
                validationMessages << "Team has ${orphanedFromUser} orphaned user relationships".toString()
            }
            if (orphanedFromTeam > 0) {
                validationMessages << "User has ${orphanedFromTeam} orphaned team relationships".toString()
            }
            
            return result
        }
    }

    /**
     * Protect against cascade delete by checking for active relationships.
     * @param userId The ID of the user to check.
     * @return Map with protection status and blocking relationships.
     */
    def protectCascadeDelete(int userId) {
        DatabaseUtil.withSql { sql ->
            def result = [
                canDelete: true,
                blockingRelationships: [:],
                totalBlockingItems: 0 as Integer
            ]
            
            // Get active team memberships
            def activeTeams = sql.rows("""
                SELECT t.tms_id, t.tms_name, t.tms_email
                FROM teams_tms_x_users_usr j
                JOIN teams_tms t ON t.tms_id = j.tms_id
                WHERE j.usr_id = :userId AND t.tms_status = 'active'
            """, [userId: userId])
            
            if (activeTeams) {
                result.blockingRelationships['active_teams'] = activeTeams
                result.totalBlockingItems = (result.totalBlockingItems as Integer) + (activeTeams.size() as Integer)
                result.canDelete = false
            }
            
            // Get owned migrations
            def ownedMigrations = sql.rows("""
                SELECT mig_id, mig_name, mig_status
                FROM migrations_mig
                WHERE usr_id_owner = :userId AND mig_status IN ('planned', 'in_progress', 'pending')
            """, [userId: userId])
            
            if (ownedMigrations) {
                result.blockingRelationships['owned_migrations'] = ownedMigrations
                result.totalBlockingItems = (result.totalBlockingItems as Integer) + (ownedMigrations.size() as Integer)
                result.canDelete = false
            }
            
            // Get owned plan instances
            def ownedPlans = sql.rows("""
                SELECT pli.pli_id, i.ite_name, m.mig_name
                FROM plans_instance_pli pli
                JOIN iterations_ite i ON i.ite_id = pli.ite_id
                JOIN migrations_mig m ON m.mig_id = i.mig_id
                WHERE pli.usr_id_owner = :userId
                AND i.ite_status IN ('planned', 'in_progress', 'pending')
            """, [userId: userId])
            
            if (ownedPlans) {
                result.blockingRelationships['owned_plans'] = ownedPlans
                result.totalBlockingItems = (result.totalBlockingItems as Integer) + (ownedPlans.size() as Integer)
                result.canDelete = false
            }
            
            // Get assigned step instances
            def assignedSteps = sql.rows("""
                SELECT sti.sti_id, sm.stm_name, i.ite_name
                FROM steps_instance_sti sti
                JOIN steps_master_stm sm ON sm.stm_id = sti.stm_id
                JOIN phases_instance_phi phi ON phi.phi_id = sti.phi_id
                JOIN sequences_instance_sqi sqi ON sqi.sqi_id = phi.sqi_id
                JOIN plans_instance_pli pli ON pli.pli_id = sqi.pli_id
                JOIN iterations_ite i ON i.ite_id = pli.ite_id
                WHERE (sti.usr_id_owner = :userId OR sti.usr_id_assignee = :userId)
                AND sti.sti_status IN ('planned', 'in_progress', 'pending')
            """, [userId: userId])
            
            if (assignedSteps) {
                result.blockingRelationships['assigned_steps'] = assignedSteps
                result.totalBlockingItems = (result.totalBlockingItems as Integer) + (assignedSteps.size() as Integer)
                result.canDelete = false
            }
            
            result.protectionLevel = result.canDelete ? 'none' :
                                   ((result.totalBlockingItems as Integer) > 10 ? 'high' :
                                    (result.totalBlockingItems as Integer) > 5 ? 'medium' : 'low')
            
            return result
        }
    }

    /**
     * Soft delete a user by setting status to inactive.
     * @param userId The ID of the user to deactivate.
     * @param userContext Map containing user information for audit.
     * @return Map with soft delete results.
     */
    def softDeleteUser(int userId, Map userContext = [:]) {
        DatabaseUtil.withSql { sql ->
            def result = [success: false, deactivatedAt: null, previousStatus: null]
            
            // Get current user status
            def user = sql.firstRow("SELECT usr_active FROM users_usr WHERE usr_id = :userId", [userId: userId])
            if (!user) {
                result.error = "User not found"
                return result
            }
            
            result.previousStatus = user.usr_active
            
            // Check if already inactive
            if (!user.usr_active) {
                result.error = "User is already inactive"
                return result
            }
            
            // Update status to inactive with timestamp
            def now = new Date()
            def updateQuery = """
                UPDATE users_usr 
                SET usr_active = false,
                    usr_deactivated_at = :deactivatedAt,
                    usr_deactivated_by = :deactivatedBy
                WHERE usr_id = :userId
            """
            
            def rowsAffected = sql.executeUpdate(updateQuery, [
                userId: userId,
                deactivatedAt: now,
                deactivatedBy: userContext.userId ?: null
            ])
            
            if (rowsAffected > 0) {
                result.success = true
                result.deactivatedAt = now
                
                // Create audit log entry
                sql.executeUpdate("""
                    INSERT INTO audit_log (entity_type, entity_id, action, old_value, new_value, changed_by, changed_at)
                    VALUES ('user', :userId, 'soft_delete', 'active', 'inactive', :changedBy, :changedAt)
                """, [
                    userId: userId,
                    changedBy: userContext.userId ?: 'system',
                    changedAt: now
                ])
            }
            
            return result
        }
    }

    /**
     * Restore an inactive user.
     * @param userId The ID of the user to restore.
     * @param userContext Map containing user information for audit.
     * @return Map with restore results.
     */
    def restoreUser(int userId, Map userContext = [:]) {
        DatabaseUtil.withSql { sql ->
            def result = [success: false, restoredAt: null, newStatus: true]
            
            // Get current user status
            def user = sql.firstRow("""
                SELECT usr_active, usr_deactivated_at 
                FROM users_usr 
                WHERE usr_id = :userId
            """, [userId: userId])
            
            if (!user) {
                result.error = "User not found"
                return result
            }
            
            if (user.usr_active) {
                result.error = "User is already active"
                return result
            }
            
            // Restore user to active status
            def now = new Date()
            def updateQuery = """
                UPDATE users_usr 
                SET usr_active = true,
                    usr_deactivated_at = NULL,
                    usr_deactivated_by = NULL,
                    usr_restored_at = :restoredAt,
                    usr_restored_by = :restoredBy
                WHERE usr_id = :userId
            """
            
            def rowsAffected = sql.executeUpdate(updateQuery, [
                userId: userId,
                restoredAt: now,
                restoredBy: userContext.userId ?: null
            ])
            
            if (rowsAffected > 0) {
                result.success = true
                result.restoredAt = now
                
                // Create audit log entry
                sql.executeUpdate("""
                    INSERT INTO audit_log (entity_type, entity_id, action, old_value, new_value, changed_by, changed_at)
                    VALUES ('user', :userId, 'restore', 'inactive', 'active', :changedBy, :changedAt)
                """, [
                    userId: userId,
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
                orphanedFromUsers: 0 as Integer,
                orphanedFromTeams: 0 as Integer,
                invalidRelationships: 0 as Integer,
                totalCleaned: 0 as Integer,
                details: [] as List<String>
            ]
            
            // Find and remove relationships where user no longer exists
            int orphanedFromUsers = sql.executeUpdate("""
                DELETE FROM teams_tms_x_users_usr
                WHERE usr_id NOT IN (SELECT usr_id FROM users_usr)
            """) as Integer
            result.orphanedFromUsers = orphanedFromUsers

            if (orphanedFromUsers > 0) {
                (result.details as List<String>) << "Removed ${orphanedFromUsers} relationships with non-existent users".toString()
            }

            // Find and remove relationships where team no longer exists
            int orphanedFromTeams = sql.executeUpdate("""
                DELETE FROM teams_tms_x_users_usr
                WHERE tms_id NOT IN (SELECT tms_id FROM teams_tms)
            """) as Integer
            result.orphanedFromTeams = orphanedFromTeams

            if (orphanedFromTeams > 0) {
                (result.details as List<String>) << "Removed ${orphanedFromTeams} relationships with non-existent teams".toString()
            }

            // Find and remove relationships with deleted teams and inactive users
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
            
            // Find users without any team memberships
            def usersWithoutTeams = sql.rows("""
                SELECT u.usr_id, u.usr_first_name, u.usr_last_name, u.usr_email
                FROM users_usr u
                LEFT JOIN teams_tms_x_users_usr j ON u.usr_id = j.usr_id
                WHERE u.usr_active = true
                AND j.usr_id IS NULL
            """)
            
            if (usersWithoutTeams) {
                (result.details as List<String>) << "Found ${usersWithoutTeams.size()} users without any team memberships that may need attention".toString()
                result.usersWithoutTeams = usersWithoutTeams
            }

            result.totalCleaned = (result.orphanedFromUsers as Integer) + (result.orphanedFromTeams as Integer) + (result.invalidRelationships as Integer)

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
     * Get comprehensive user statistics for relationship analysis.
     * @return Map with user statistics and relationship health metrics.
     */
    def getUserRelationshipStatistics() {
        DatabaseUtil.withSql { sql ->
            def stats = [:]
            
            // Basic user counts
            def userCounts = sql.firstRow("""
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN usr_active = true THEN 1 END) as active_users,
                    COUNT(CASE WHEN usr_active = false THEN 1 END) as inactive_users,
                    COUNT(CASE WHEN usr_is_admin = true THEN 1 END) as admin_users
                FROM users_usr
            """)
            stats.users = userCounts
            
            // Team membership statistics
            def membershipStats = sql.firstRow("""
                SELECT 
                    COUNT(*) as total_memberships,
                    COUNT(DISTINCT usr_id) as users_with_teams,
                    COUNT(DISTINCT tms_id) as teams_with_users,
                    AVG(teams_per_user) as avg_teams_per_user,
                    MAX(teams_per_user) as max_teams_per_user
                FROM (
                    SELECT usr_id, COUNT(tms_id) as teams_per_user
                    FROM teams_tms_x_users_usr
                    GROUP BY usr_id
                ) user_counts
            """)
            stats.memberships = membershipStats
            
            // Relationship health
            def healthStats = sql.firstRow("""
                SELECT 
                    COUNT(CASE WHEN u.usr_id IS NULL THEN 1 END) as orphaned_from_users,
                    COUNT(CASE WHEN t.tms_id IS NULL THEN 1 END) as orphaned_from_teams,
                    COUNT(CASE WHEN u.usr_active = false THEN 1 END) as relationships_with_inactive_users,
                    COUNT(CASE WHEN t.tms_status = 'deleted' THEN 1 END) as relationships_with_deleted_teams
                FROM teams_tms_x_users_usr j
                LEFT JOIN users_usr u ON u.usr_id = j.usr_id
                LEFT JOIN teams_tms t ON t.tms_id = j.tms_id
            """)
            stats.health = healthStats
            
            // User team distribution
            def teamDistribution = sql.rows("""
                SELECT 
                    CASE 
                        WHEN team_count = 0 THEN '0 teams'
                        WHEN team_count = 1 THEN '1 team'
                        WHEN team_count BETWEEN 2 AND 3 THEN '2-3 teams'
                        WHEN team_count BETWEEN 4 AND 5 THEN '4-5 teams'
                        WHEN team_count BETWEEN 6 AND 10 THEN '6-10 teams'
                        ELSE '10+ teams'
                    END as team_category,
                    COUNT(*) as user_count
                FROM (
                    SELECT u.usr_id, COUNT(j.tms_id) as team_count
                    FROM users_usr u
                    LEFT JOIN teams_tms_x_users_usr j ON u.usr_id = j.usr_id
                    WHERE u.usr_active = true
                    GROUP BY u.usr_id
                ) user_teams
                GROUP BY team_category
                ORDER BY 
                    CASE team_category
                        WHEN '0 teams' THEN 1
                        WHEN '1 team' THEN 2
                        WHEN '2-3 teams' THEN 3
                        WHEN '4-5 teams' THEN 4
                        WHEN '6-10 teams' THEN 5
                        ELSE 6
                    END
            """)
            stats.teamDistribution = teamDistribution
            
            return stats
        }
    }

    /**
     * Role transition validation and management.
     * @param userId The ID of the user.
     * @param fromRole Current role ID.
     * @param toRole Target role ID.
     * @return Map with validation results.
     */
    def validateRoleTransition(int userId, Integer fromRole, Integer toRole) {
        DatabaseUtil.withSql { sql ->
            def result = [
                valid: false,
                reason: null,
                fromRoleName: null,
                toRoleName: null,
                requiresApproval: false
            ]
            
            // Get role information
            if (fromRole) {
                def fromRoleInfo = sql.firstRow("SELECT rls_code, rls_description FROM roles_rls WHERE rls_id = :roleId", [roleId: fromRole])
                result.fromRoleName = fromRoleInfo?.rls_code
            }
            
            if (toRole) {
                def toRoleInfo = sql.firstRow("SELECT rls_code, rls_description FROM roles_rls WHERE rls_id = :roleId", [roleId: toRole])
                result.toRoleName = toRoleInfo?.rls_code
            }
            
            // Role hierarchy validation (following Teams pattern)
            def roleHierarchy = [
                'SUPERADMIN': 3,
                'ADMIN': 2,
                'USER': 1
            ]
            
            def validTransitions = [
                'USER': ['ADMIN'],
                'ADMIN': ['USER', 'SUPERADMIN'],
                'SUPERADMIN': ['ADMIN', 'USER']
            ]
            
            if (result.fromRoleName && result.toRoleName) {
                def allowedTransitions = validTransitions[result.fromRoleName] ?: []
                if (allowedTransitions.contains(result.toRoleName)) {
                    result.valid = true
                    
                    // Check if approval is required for elevation
                    def fromLevel = roleHierarchy[result.fromRoleName] ?: 0
                    def toLevel = roleHierarchy[result.toRoleName] ?: 0
                    result.requiresApproval = toLevel > fromLevel
                } else {
                    result.reason = "Direct transition from ${result.fromRoleName} to ${result.toRoleName} is not allowed"
                }
            } else {
                result.reason = "Invalid role IDs provided"
            }
            
            return result
        }
    }

    /**
     * Change user role with audit trail.
     * @param userId The ID of the user.
     * @param newRoleId The new role ID.
     * @param userContext Map containing user information for audit.
     * @return Map with role change results.
     */
    def changeUserRole(int userId, Integer newRoleId, Map userContext = [:]) {
        DatabaseUtil.withSql { sql ->
            def result = [success: false, changedAt: null, previousRole: null, newRole: null]
            
            // Get current user and role
            def user = sql.firstRow("""
                SELECT u.usr_id, u.rls_id, r.rls_code as current_role_code
                FROM users_usr u
                LEFT JOIN roles_rls r ON u.rls_id = r.rls_id
                WHERE u.usr_id = :userId
            """, [userId: userId])
            
            if (!user) {
                result.error = "User not found"
                return result
            }
            
            result.previousRole = user.current_role_code
            
            // Get new role information
            def newRole = sql.firstRow("SELECT rls_code FROM roles_rls WHERE rls_id = :roleId", [roleId: newRoleId])
            if (!newRole) {
                result.error = "Invalid new role ID"
                return result
            }
            
            result.newRole = newRole.rls_code
            
            // Validate transition if there's a current role
            if (user.rls_id) {
                Map validation = validateRoleTransition(userId, user.rls_id as Integer, newRoleId) as Map
                if (!(validation.valid as Boolean)) {
                    result.error = validation.reason as String
                    return result
                }
                result.requiresApproval = validation.requiresApproval as Boolean
            }
            
            // Update user role
            def now = new Date()
            def updateQuery = """
                UPDATE users_usr 
                SET rls_id = :newRoleId,
                    updated_at = :updatedAt
                WHERE usr_id = :userId
            """
            
            def rowsAffected = sql.executeUpdate(updateQuery, [
                userId: userId,
                newRoleId: newRoleId,
                updatedAt: now
            ])
            
            if (rowsAffected > 0) {
                result.success = true
                result.changedAt = now
                
                // Create audit log entry
                sql.executeUpdate("""
                    INSERT INTO audit_log (entity_type, entity_id, action, old_value, new_value, changed_by, changed_at)
                    VALUES ('user', :userId, 'role_change', :oldRole, :newRole, :changedBy, :changedAt)
                """, [
                    userId: userId,
                    oldRole: result.previousRole ?: 'none',
                    newRole: result.newRole,
                    changedBy: userContext.userId ?: 'system',
                    changedAt: now
                ])
            }
            
            return result
        }
    }

    /**
     * Get user activity history for audit purposes.
     * @param userId The ID of the user.
     * @param days Number of days of history to retrieve.
     * @return List of activity records.
     */
    def getUserActivity(int userId, int days = 30) {
        // [SF] [SFT] Input validation and SQL injection prevention
        if (userId <= 0) {
            throw new IllegalArgumentException("User ID must be positive")
        }
        if (days <= 0 || days > 365) {
            throw new IllegalArgumentException("Days must be between 1 and 365")
        }
        
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT 
                    entity_type,
                    entity_id,
                    action,
                    old_value,
                    new_value,
                    changed_at,
                    changed_by
                FROM audit_log
                WHERE ((entity_type = 'user' AND entity_id = :userId)
                   OR changed_by = :userId)
                   AND changed_at >= (NOW() - INTERVAL '1 day' * :days)
                ORDER BY changed_at DESC
                LIMIT 1000
            """, [userId: userId, days: days])
        }
    }

    /**
     * Security validation for user activity access.
     * [SFT] Ensures users can only access their own activity or when properly authorized
     * @param requestingUserId The user making the request
     * @param targetUserId The user whose activity is being requested
     * @param isAdmin Whether the requesting user is an administrator
     * @return true if access is allowed, false otherwise
     */
    boolean canAccessUserActivity(int requestingUserId, int targetUserId, boolean isAdmin = false) {
        // [SFT] Users can always access their own activity
        if (requestingUserId == targetUserId) {
            return true
        }
        
        // [SFT] Administrators can access any user's activity
        if (isAdmin) {
            return true
        }
        
        // [SFT] Regular users cannot access other users' activity
        return false
    }

    /**
     * Batch validate multiple users for team assignments.
     * @param userIds List of user IDs to validate.
     * @return Map with validation results for each user.
     */
    def batchValidateUsers(List<Integer> userIds) {
        DatabaseUtil.withSql { sql ->
            def results = [
                valid: [] as List<Map>,
                invalid: [] as List<Map>,
                summary: [
                    total: userIds.size(),
                    validCount: 0,
                    invalidCount: 0
                ]
            ]
            
            userIds.each { userId ->
                def user = sql.firstRow("""
                    SELECT usr_id, usr_first_name, usr_last_name, usr_email, usr_active, rls_id
                    FROM users_usr
                    WHERE usr_id = :userId
                """, [userId: userId])
                
                if (user && user.usr_active) {
                    (results.valid as List<Map>) << [
                        userId: userId,
                        name: "${user.usr_first_name} ${user.usr_last_name}".toString(),
                        email: user.usr_email,
                        roleId: user.rls_id
                    ]
                    (results.summary as Map).validCount = ((results.summary as Map).validCount as Integer) + 1
                } else {
                    (results.invalid as List<Map>) << [
                        userId: userId,
                        reason: user ? (user.usr_active ? 'Unknown error' : 'User is inactive') : 'User not found'
                    ]
                    (results.summary as Map).invalidCount = ((results.summary as Map).invalidCount as Integer) + 1
                }
            }
            
            return results
        }
    }
}
