package umig.repository

import umig.utils.DatabaseUtil

/**
 * Repository for managing team membership data.
 * Handles all database operations for the teams_tms_x_users_usr table.
 */
class TeamMembersRepository {

    /**
     * Finds all members for a given team.
     * @param teamId The ID of the team.
     * @return A list of maps, where each map is a user in the team.
     */
    def findAll(int teamId) {
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
    def add(int teamId, int userId) {
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
    def remove(int teamId, int userId) {
        DatabaseUtil.withSql { sql ->
            def deleteQuery = "DELETE FROM teams_tms_x_users_usr WHERE tms_id = :teamId AND usr_id = :userId"
            return sql.executeUpdate(deleteQuery, [teamId: teamId, userId: userId])
        }
    }
}
