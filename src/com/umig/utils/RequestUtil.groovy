package com.umig.utils

import javax.servlet.http.HttpServletRequest

/**
 * Utility class for parsing information from an HTTP request.
 */
class RequestUtil {

    /**
     * Extracts a numeric path variable from the request URL.
     * Assumes the variable is the first segment after the script path.
     * e.g., for a request to /api/v2/users/42, request.pathInfo might be "/42"
     * @param request The HttpServletRequest object.
     * @return The path variable as an Integer, or null if not present or not a number.
     */
    static Integer getPathVariableAsInt(HttpServletRequest request) {
        if (request.pathInfo) {
            // Split path by / and find the first non-empty part
            def pathParts = request.pathInfo.split('/').findAll { it }
            if (pathParts.size() > 0) {
                try {
                    return pathParts[0].toInteger()
                } catch (NumberFormatException e) {
                    // Path variable is present but not a valid integer
                    return null
                }
            }
        }
        // No path variable found
        return null
    }
}
