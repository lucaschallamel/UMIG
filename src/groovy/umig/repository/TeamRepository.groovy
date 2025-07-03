package com.umig.repository

import com.umig.utils.DatabaseUtil

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
                SELECT tms_id, tms_name, tms_description, tms_email
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
            return sql.rows("""
                SELECT tms_id, tms_name, tms_description, tms_email
                FROM teams_tms
                ORDER BY tms_name
            """)
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
            def updatableFields = ['tms_name', 'tms_description', 'tms_email']

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
}
