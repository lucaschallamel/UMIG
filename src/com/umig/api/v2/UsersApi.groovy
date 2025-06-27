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
            return Response.ok(new JsonBuilder(user).toString()).build()
        } else {
            return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "User with ID ${userId} not found."]).toString()).build()
        }
    } else {
        // List: /users or /users/
        def users = userRepository.findAllUsers()
        return Response.ok(new JsonBuilder(users).toString()).build()
    }
}

// Handles POST /users (create)
users(httpMethod: "POST", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    try {
        Map userData = new JsonSlurper().parseText(body) as Map
        def newUser = userRepository.createUser(userData)
        if (newUser) {
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
        def updatedUser = userRepository.updateUser(userId, userData)
        if (updatedUser) {
            return Response.ok(new JsonBuilder(updatedUser).toString()).build()
        } else {
            return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "User with ID ${userId} not found for update."]).toString()).build()
        }
    } catch (Exception e) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid request body: ${e.message}"]).toString()).build()
    }
}





