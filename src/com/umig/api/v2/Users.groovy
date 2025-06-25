package com.umig.api.v2

import com.umig.repository.UserRepository
import com.umig.utils.JsonUtil
import com.umig.utils.RequestUtil

import javax.servlet.http.HttpServletResponse

// This script is executed by ScriptRunner for requests to /api/v2/users*

// Instantiate the repository to access business logic
def userRepository = new UserRepository()

// Check for a path variable (e.g., a user ID like /users/42)
def userId = RequestUtil.getPathVariableAsInt(request)

// Main router to handle different HTTP methods
switch (request.method) {
    case 'GET':
        if (userId) {
            // Handle GET /api/v2/users/{userId}
            def user = userRepository.findUserById(userId)
            if (user) {
                JsonUtil.sendSuccess(response, user)
            } else {
                JsonUtil.sendError(response, "User with ID ${userId} not found.", HttpServletResponse.SC_NOT_FOUND)
            }
        } else {
            // Handle GET /api/v2/users
            def users = userRepository.findAllUsers()
            JsonUtil.sendSuccess(response, users)
        }
        break

    case 'POST':
        // Handle POST /api/v2/users
        try {
            def userData = JsonUtil.parseRequest(request)
            def newUser = userRepository.createUser(userData)
            if (newUser) {
                JsonUtil.sendSuccess(response, newUser, HttpServletResponse.SC_CREATED)
            } else {
                JsonUtil.sendError(response, "Failed to create user.", HttpServletResponse.SC_INTERNAL_SERVER_ERROR)
            }
        } catch (Exception e) {
            JsonUtil.sendError(response, "Invalid request body: ${e.message}", HttpServletResponse.SC_BAD_REQUEST)
        }
        break

    case 'PUT':
        // Handle PUT /api/v2/users/{userId}
        if (userId) {
            try {
                def userData = JsonUtil.parseRequest(request)
                def updatedUser = userRepository.updateUser(userId, userData)
                if (updatedUser) {
                    JsonUtil.sendSuccess(response, updatedUser)
                } else {
                    JsonUtil.sendError(response, "User with ID ${userId} not found for update.", HttpServletResponse.SC_NOT_FOUND)
                }
            } catch (Exception e) {
                JsonUtil.sendError(response, "Invalid request body: ${e.message}", HttpServletResponse.SC_BAD_REQUEST)
            }
        } else {
            JsonUtil.sendError(response, "User ID is required for PUT method.", HttpServletResponse.SC_BAD_REQUEST)
        }
        break

    case 'DELETE':
        // Handle DELETE /api/v2/users/{userId}
        if (userId) {
            if (userRepository.deleteUser(userId)) {
                response.status = HttpServletResponse.SC_NO_CONTENT
            } else {
                JsonUtil.sendError(response, "User with ID ${userId} not found for deletion.", HttpServletResponse.SC_NOT_FOUND)
            }
        } else {
            JsonUtil.sendError(response, "User ID is required for DELETE method.", HttpServletResponse.SC_BAD_REQUEST)
        }
        break

    default:
        JsonUtil.sendError(response, "HTTP method '${request.method}' not supported on this endpoint.", HttpServletResponse.SC_METHOD_NOT_ALLOWED)
        break
}
