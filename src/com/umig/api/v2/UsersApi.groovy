package com.umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import com.umig.repository.UserRepository
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.transform.BaseScript
import groovy.transform.Field

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import java.sql.SQLException

@BaseScript CustomEndpointDelegate delegate

@Field
final UserRepository userRepository = new UserRepository()

private Integer getUserIdFromPath(HttpServletRequest request) {
    def extraPath = getAdditionalPath(request)
    if (extraPath) {
        def pathParts = extraPath.split('/').findAll { it }
        if (pathParts.size() == 1) {
            try {
                return pathParts[0].toInteger()
            } catch (NumberFormatException e) {
                // Will be handled by the caller by returning a 400
                return null
            }
        }
    }
    return null
}

// GET /users and /users/{id}
users(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    Integer userId = getUserIdFromPath(request)

    // Handle case where path is /users/{invalid_id}
    if (getAdditionalPath(request) && userId == null) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid User ID format."]).toString()).build()
    }

    try {
        if (userId != null) {
            def user = userRepository.findUserById(userId)
            if (!user) {
                return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "User with ID ${userId} not found."]).toString()).build()
            }
            return Response.ok(new JsonBuilder(user).toString()).build()
        } else {
            def users = userRepository.findAllUsers()
            return Response.ok(new JsonBuilder(users).toString()).build()
        }
    } catch (Exception e) {
        log.error("Unexpected error in GET /users", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "An unexpected internal error occurred."]).toString()).build()
    }
}

// POST /users
users(httpMethod: "POST", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    try {
        Map userData = new JsonSlurper().parseText(body) as Map

        if (userData.containsKey('teams')) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Team membership must be managed via the Teams API. The 'teams' field is not accepted here."]).toString()).build()
        }

        def missing = []
        if (!userData.usr_first_name || !(userData.usr_first_name instanceof String) || (userData.usr_first_name as String).trim().isEmpty()) missing << 'usr_first_name'
        if (!userData.usr_last_name || !(userData.usr_last_name instanceof String) || (userData.usr_last_name as String).trim().isEmpty()) missing << 'usr_last_name'
        if (userData.usr_is_admin == null || !(userData.usr_is_admin instanceof Boolean)) missing << 'usr_is_admin'
        if (missing) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Missing or invalid required field(s): ${missing.join(', ')}"]).toString()).build()
        }

        def newUser = userRepository.createUser(userData)
        return Response.status(Response.Status.CREATED).entity(new JsonBuilder(newUser).toString()).build()
    } catch (SQLException e) {
        if (e.getSQLState() == '23505') { // unique_violation
            return Response.status(Response.Status.CONFLICT).entity(new JsonBuilder([error: "A user with the provided details already exists."]).toString()).build()
        }
        log.error("Database error in POST /users", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "A database error occurred."]).toString()).build()
    } catch (Exception e) {
        log.error("Unexpected error in POST /users", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "An unexpected internal error occurred."]).toString()).build()
    }
}

// PUT /users/{id}
users(httpMethod: "PUT", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    Integer userId = getUserIdFromPath(request)
    if (userId == null) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "A numeric User ID must be provided in the URL path for PUT requests."]).toString()).build()
    }

    try {
        Map userData = new JsonSlurper().parseText(body) as Map

        if (userData.containsKey('teams')) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Team membership must be managed via the Teams API. The 'teams' field is not accepted here."]).toString()).build()
        }

        if (userRepository.findUserById(userId) == null) {
            return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "User with ID ${userId} not found."]).toString()).build()
        }

        def updatedUser = userRepository.updateUser(userId, userData)
        return Response.ok(new JsonBuilder(updatedUser).toString()).build()
    } catch (Exception e) {
        log.error("Unexpected error in PUT /users/${userId}", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "An unexpected internal error occurred."]).toString()).build()
    }
}

// DELETE /users/{id}
users(httpMethod: "DELETE", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    Integer userId = getUserIdFromPath(request)
    if (userId == null) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "A numeric User ID must be provided in the URL path for DELETE requests."]).toString()).build()
    }

    // Pre-fetch blocking relationships before attempting delete
    def blocking = userRepository.getUserBlockingRelationships(userId)
    try {
        if (userRepository.findUserById(userId) == null) {
            return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "User with ID ${userId} not found."]).toString()).build()
        }

        userRepository.deleteUser(userId)
        return Response.noContent().build() // Correct REST pattern for DELETE

    } catch (SQLException e) {
        if (e.getSQLState() == '23503') { // foreign_key_violation
            return Response.status(Response.Status.CONFLICT)
                .entity(new JsonBuilder([
                    error: "Cannot delete user with ID ${userId} as they are still referenced by other resources.",
                    blocking_relationships: blocking
                ]).toString()).build()
        }
        log.error("Database error in DELETE /users/${userId}", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "A database error occurred."]).toString()).build()
    } catch (Exception e) {
        log.error("Unexpected error in DELETE /users/${userId}", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "An unexpected internal error occurred."]).toString()).build()
    }
}
