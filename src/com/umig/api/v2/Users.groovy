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

users(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    final Integer userId = getUserIdFromPath(request)

    if (userId != null) {
        def user = userRepository.findUserById(userId)
        if (user) {
            return Response.ok(new JsonBuilder(user).toString()).build()
        } else {
            return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "User with ID ${userId} not found."]).toString()).build()
        }
    } else {
        def users = userRepository.findAllUsers()
        return Response.ok(new JsonBuilder(users).toString()).build()
    }
}

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

users(httpMethod: "PUT", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    final Integer userId = getUserIdFromPath(request)
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

users(httpMethod: "DELETE", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    final Integer userId = getUserIdFromPath(request)
    if (userId == null) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "User ID is required for DELETE method."]).toString()).build()
    }

    if (userRepository.deleteUser(userId)) {
        return Response.noContent().build()
    } else {
        return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "User with ID ${userId} not found for deletion."]).toString()).build()
    }
}
