package com.umig.utils

import groovy.json.JsonOutput
import groovy.json.JsonSlurper
import javax.servlet.http.HttpServletRequest
import javax.servlet.http.HttpServletResponse

/**
 * Utility class for handling JSON serialization and standard HTTP responses.
 */
class JsonUtil {

    /**
     * Sends a successful JSON response.
     * @param response The HttpServletResponse object.
     * @param data The data to serialize to JSON.
     * @param statusCode The HTTP status code (e.g., 200 for OK, 201 for Created).
     */
    static void sendSuccess(HttpServletResponse response, Object data, int statusCode = 200) {
        response.status = statusCode
        response.contentType = 'application/json'
        response.writer.write(JsonOutput.toJson(data))
    }

    /**
     * Sends a standardized error JSON response.
     * @param response The HttpServletResponse object.
     * @param message The error message.
     * @param statusCode The HTTP status code (e.g., 400, 404, 500).
     */
    static void sendError(HttpServletResponse response, String message, int statusCode) {
        response.status = statusCode
        response.contentType = 'application/json'
        def errorPayload = [
            error: [
                code: statusCode,
                message: message
            ]
        ]
        response.writer.write(JsonOutput.toJson(errorPayload))
    }

    /**
     * Parses the JSON body of a request.
     * @param request The HttpServletRequest object.
     * @return The parsed JSON object.
     */
     static def parseRequest(HttpServletRequest request) {
        return new JsonSlurper().parse(request.reader)
    }
}
