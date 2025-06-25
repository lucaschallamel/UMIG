package com.umig.repository

import com.umig.utils.DatabaseUtil
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
        def sql = DatabaseUtil.getSql()
        def user = sql.firstRow("""
            SELECT usr_id, usr_code, usr_first_name, usr_last_name, usr_email, usr_is_admin, tms_id, rls_id
            FROM users_usr
            WHERE usr_id = :userId
        """, [userId: userId])

        return user
    }

    /**
     * Retrieves all users from the database.
     * @return A list of maps, where each map is a user.
     */
    def findAllUsers() {
        def sql = DatabaseUtil.getSql()
        def users = sql.rows("""
            SELECT usr_id, usr_code, usr_first_name, usr_last_name, usr_email, usr_is_admin, tms_id, rls_id
            FROM users_usr
            ORDER BY usr_id
        """)
        return users
    }

    /**
     * Creates a new user in the database.
     * @param userData A map containing the data for the new user.
     * @return A map representing the newly created user, including the generated ID.
     */
    def createUser(Map userData) {
        def sql = DatabaseUtil.getSql()
        def insertQuery = """
            INSERT INTO users_usr (usr_code, usr_first_name, usr_last_name, usr_email, usr_is_admin, tms_id, rls_id)
            VALUES (:usr_code, :usr_first_name, :usr_last_name, :usr_email, :usr_is_admin, :tms_id, :rls_id)
        """

        // executeInsert returns a list containing the generated keys
        def generatedKeys = sql.executeInsert(insertQuery, userData)

        if (generatedKeys && generatedKeys[0]) {
            def newId = generatedKeys[0][0] as int
            return findUserById(newId) // Reuse findUserById to return the full user object
        }

        return null // Should not happen if insert is successful
    }

    /**
     * Updates an existing user.
     * @param userId The ID of the user to update.
     * @param userData A map containing the new data for the user.
     * @return A map representing the updated user.
     */
    def updateUser(int userId, Map userData) {
        def sql = DatabaseUtil.getSql()

        // Ensure the user exists before attempting an update
        if (findUserById(userId) == null) {
            return null
        }

        // Build the SET part of the query dynamically from a whitelist of fields
        def setClauses = []
        def queryParams = [:]
        def updatableFields = ['usr_code', 'usr_first_name', 'usr_last_name', 'usr_email', 'usr_is_admin', 'tms_id', 'rls_id']

        userData.each { key, value ->
            if (key in updatableFields) {
                setClauses.add("${key} = :${key}")
                queryParams[key] = value
            }
        }

        if (setClauses.isEmpty()) {
            // If no valid fields were provided for update, return the current user data
            return findUserById(userId)
        }

        queryParams['usr_id'] = userId
        def updateQuery = "UPDATE users_usr SET ${setClauses.join(', ')} WHERE usr_id = :usr_id"

        sql.executeUpdate(updateQuery, queryParams)

        // Return the updated user data
        return findUserById(userId)
    }

    /**
     * Deletes a user from the database.
     * @param userId The ID of the user to delete.
     * @return true if the user was deleted, false otherwise.
     */
    def deleteUser(int userId) {
        def sql = DatabaseUtil.getSql()
        def deleteQuery = "DELETE FROM users_usr WHERE usr_id = :userId"
        def rowsAffected = sql.executeUpdate(deleteQuery, [userId: userId])
        return rowsAffected > 0
    }
}
