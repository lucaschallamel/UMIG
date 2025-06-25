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
        def sql = DatabaseUtil.getSql()
        def team = sql.firstRow("""
            SELECT tms_id, tms_name, tms_email, tms_description
            FROM teams_tms
            WHERE tms_id = :teamId
        """, [teamId: teamId])

        return team
    }

    /**
     * Retrieves all teams from the database.
     * @return A list of maps, where each map is a team.
     */
    def findAllTeams() {
        def sql = DatabaseUtil.getSql()
        def teams = sql.rows("""
            SELECT tms_id, tms_name, tms_email, tms_description
            FROM teams_tms
            ORDER BY tms_name
        """)

        return teams
    }

    /**
     * Creates a new team in the database.
     * @param teamData A map containing the data for the new team.
     * @return A map representing the newly created team.
     */
    def createTeam(Map teamData) {
        def sql = DatabaseUtil.getSql()
        def insertQuery = """
            INSERT INTO teams_tms (tms_name, tms_email, tms_description)
            VALUES (:tms_name, :tms_email, :tms_description)
        """

        def generatedKeys = sql.executeInsert(insertQuery, teamData)

        if (generatedKeys && generatedKeys[0]) {
            def newId = generatedKeys[0][0] as int
            return findTeamById(newId)
        }

        return null
    }

    /**
     * Updates an existing team.
     * @param teamId The ID of the team to update.
     * @param teamData A map containing the new data for the team.
     * @return A map representing the updated team.
     */
    def updateTeam(int teamId, Map teamData) {
        def sql = DatabaseUtil.getSql()
        def updateQuery = """
            UPDATE teams_tms SET
                tms_name = :tms_name,
                tms_email = :tms_email,
                tms_description = :tms_description
            WHERE tms_id = :tms_id
        """

        teamData.tms_id = teamId
        def updatedRows = sql.executeUpdate(updateQuery, teamData)

        if (updatedRows > 0) {
            return findTeamById(teamId)
        }

        return null
    }

    /**
     * Deletes a team from the database.
     * @param teamId The ID of the team to delete.
     * @return true if the team was deleted, false otherwise.
     */
    def deleteTeam(int teamId) {
        def sql = DatabaseUtil.getSql()
        def deleteQuery = "DELETE FROM teams_tms WHERE tms_id = :teamId"
        def deletedRows = sql.executeUpdate(deleteQuery, [teamId: teamId])

        return deletedRows > 0
    }
}
