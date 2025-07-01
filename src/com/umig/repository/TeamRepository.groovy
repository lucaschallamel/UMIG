package com.umig.repository

import com.umig.utils.DatabaseUtil

/**
 * Repository class for managing Team data.
 * Handles all database operations for the teams_tms table.
 */
class TeamRepository {

    /**
     * Finds a team by its ID.
     * @param teamId The ID of the team to find.
     * @return A map representing the team, or null if not found.
     */
    def findTeamById(int teamId) {
        DatabaseUtil.withSql { sql ->
            return sql.firstRow("""
                SELECT tms_id, tms_name, tms_description
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
                SELECT tms_id, tms_name, tms_description
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
                INSERT INTO teams_tms (tms_name, tms_description)
                VALUES (:tms_name, :tms_description)
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
            def updatableFields = ['tms_name', 'tms_description']

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
                    u.usr_trigram,
                    u.usr_first_name,
                    u.usr_last_name,
                    u.usr_email,
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
}
