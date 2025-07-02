package com.umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import com.umig.repository.UserRepository
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.transform.BaseScript

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response

@BaseScript CustomEndpointDelegate delegate

final UserRepository userRepository = new UserRepository()

// Utility to extract userId from additional path
private Integer getUserIdFromPath(HttpServletRequest request) {
    def extraPath = getAdditionalPath(request)
    if (extraPath) {
        def pathParts = extraPath.split('/').findAll { it }
        if (pathParts) {
            try {
                return pathParts[0].toInteger()
            } catch (NumberFormatException e) {
                return null
            }
        }
    }
    return null
}

// Handles GET /users (list) and GET /users/{id} (detail)
users(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    Integer userId = null
    if (extraPath) {
        def pathParts = extraPath.split('/').findAll { it }
        if (pathParts.size() == 1) {
            try {
                userId = pathParts[0].toInteger()
            } catch (NumberFormatException ignored) {}
        }
    }
    if (userId != null) {
        // Detail: /users/{id}
        def user = userRepository.findUserById(userId)
        if (user) {
            // Always return teams as an array (even if empty)
            if (!user.containsKey('teams')) user.teams = []
            return Response.ok(new JsonBuilder(user).toString()).build()
        } else {
            return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "User with ID ${userId} not found."]).toString()).build()
        }
    } else {
        // List: /users or /users/
        def users = userRepository.findAllUsers()
        users.each { if (!it.containsKey('teams')) it.teams = [] }
        return Response.ok(new JsonBuilder(users).toString()).build()
    }
}

// Utility: Map SQL/type errors to standardized HTTP responses per ADR-023
private Response handleApiException(Exception e) {
    // SQLState codes: 23503 = FK violation, 23505 = Unique violation
    String msg = e.message ?: "Unknown error"
    if (e instanceof java.sql.SQLException || e.cause instanceof java.sql.SQLException) {
        def sqlEx = (e instanceof java.sql.SQLException) ? e : e.cause
        def sqlState = sqlEx.SQLState ?: (sqlEx.cause?.SQLState)
        if (sqlState == '23503') {
            // Foreign Key Violation
            if (msg.toLowerCase().contains('delete')) {
                return Response.status(Response.Status.CONFLICT).entity(new JsonBuilder([error: "Resource is still in use (foreign key constraint).", details: msg]).toString()).build()
            } else {
                return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Referenced resource does not exist (foreign key constraint).", details: msg]).toString()).build()
            }
        } else if (sqlState == '23505') {
            // Unique Key Violation
            return Response.status(Response.Status.CONFLICT).entity(new JsonBuilder([error: "Duplicate resource (unique constraint violation).", details: msg]).toString()).build()
        } else if (msg.toLowerCase().contains('column') && msg.toLowerCase().contains('type')) {
            // Type mismatch
            def fieldMatch = msg =~ /column \"(.*?)\" is of type/;
            def field = fieldMatch ? fieldMatch[0][1] : null
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([
                error: "Invalid type for field${field ? " '${field}'" : ''}. Please check your input.",
                details: msg
            ]).toString()).build()
        }
    }
    // Fallback: generic bad request
    return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([
        error: "Invalid request: ${msg.split('\n')[0]}"
    ]).toString()).build()
}

// Handles POST /users (create)
users(httpMethod: "POST", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    try {
        Map userData = new JsonSlurper().parseText(body) as Map
        if (userData.containsKey('teams')) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([
                    error: "Team membership must be managed via the Teams API. The 'teams' field is not accepted here."
                ]).toString()).build()
        }
        def newUser = userRepository.createUser(userData)
        if (newUser) {
            if (!newUser.containsKey('teams')) newUser.teams = []
            return Response.status(Response.Status.CREATED).entity(new JsonBuilder(newUser).toString()).build()
        } else {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "Failed to create user."]).toString()).build()
        }
    } catch (Exception e) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid request body: ${e.message}"]).toString()).build()
    }
}

// Handles PUT /users/{id} (update)
users(httpMethod: "PUT", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    Integer userId = getUserIdFromPath(request)
    if (userId == null) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "User ID is required for PUT method."]).toString()).build()
    }
    try {
        Map userData = new JsonSlurper().parseText(body) as Map
        if (userData.containsKey('teams')) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([
                    error: "Team membership must be managed via the Teams API. The 'teams' field is not accepted here."
                ]).toString()).build()
        }
        def updatedUser = userRepository.updateUser(userId, userData)
        if (updatedUser) {
            if (!updatedUser.containsKey('teams')) updatedUser.teams = []
            return Response.ok(new JsonBuilder(updatedUser).toString()).build()
        } else {
            return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "User with ID ${userId} not found for update."]).toString()).build()
        }
    } catch (Exception e) {
        return handleApiException(e)
    }
}





