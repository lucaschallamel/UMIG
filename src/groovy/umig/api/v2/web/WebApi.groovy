package umig.api.v2.web

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import groovy.transform.BaseScript
import umig.service.ConfigurationService

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response

@BaseScript CustomEndpointDelegate delegate

// This script serves static assets (CSS, JS) from the 'web' directory.

// --- Configuration ---
/**
 * UMIG Web Resource Endpoint
 *
 * Serves static assets (CSS, JS, images, etc.) for UMIG macros and SPA.
 *
 * US-098 Phase 5E: Uses separate filesystem path configuration
 * - umig.web.filesystem.root: File system path for serving static files
 * - umig.web.root: URL path for macro resource loading (NOT used here)
 *
 * Configuration hierarchy:
 * 1. Database (environment-specific)
 * 2. Database (global)
 * 3. Environment variable - UMIG_WEB_FILESYSTEM_ROOT
 * 4. Default value - Fallback path
 *
 * Example usage (DEV):
 *   export UMIG_WEB_FILESYSTEM_ROOT=/Users/youruser/Documents/GitHub/UMIG/src/groovy/umig/web
 *   (or set in local-dev-setup/.env file)
 */
def webRootDir = new File(ConfigurationService.getString('umig.web.filesystem.root', '/var/atlassian/application-data/confluence/scripts/umig/web'))

def mimeTypes = [
    'css' : 'text/css',
    'js'  : 'application/javascript',
    'svg' : 'image/svg+xml',
    'png' : 'image/png',
    'jpg' : 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif' : 'image/gif',
    'html': 'text/html'
]

web(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    // --- Logic ---
    String requestedPath = getAdditionalPath(request)

    if (!requestedPath || requestedPath == '/') {
        return Response.status(Response.Status.BAD_REQUEST).entity('File path is required.').build()
    }

    // Construct the full path to the requested file, removing leading slash if present.
    def safePath = requestedPath.startsWith("/") ? requestedPath.substring(1) : requestedPath
    def requestedFile = new File(webRootDir, safePath)

    // ** Security Check **
    // Prevent directory traversal attacks. Ensure the requested file is actually inside the web root directory.
    if (!requestedFile.getCanonicalPath().startsWith(webRootDir.getCanonicalPath())) {
        return Response.status(Response.Status.FORBIDDEN).entity('Access denied.').build()
    }

    if (!requestedFile.exists() || !requestedFile.isFile()) {
        return Response.status(Response.Status.NOT_FOUND).entity('File not found: ' + safePath).build()
    }

    def ext = requestedFile.name.tokenize('.').last().toLowerCase()
    def mimeType = mimeTypes.get(ext, 'application/octet-stream')

    // Use binary streaming for non-text files
    if (['png','jpg','jpeg','gif','svg'].contains(ext)) {
        return Response.ok(requestedFile.bytes).type(mimeType).build()
    } else {
        return Response.ok(requestedFile.text).type(mimeType).build()
    }
}
