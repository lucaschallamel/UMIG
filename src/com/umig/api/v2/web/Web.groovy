package com.umig.api.v2.web

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import groovy.transform.BaseScript

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response

@BaseScript CustomEndpointDelegate delegate

// This script serves static assets (CSS, JS) from the 'web' directory.

// --- Configuration ---
def scriptFile = new File(getClass().protectionDomain.codeSource.location.path)
// The script is at .../scripts/com/umig/api/v2/web/Web.groovy, assets are at .../scripts/web/
def webRootDir = scriptFile.parentFile.parentFile.parentFile.parentFile.parentFile.toPath().resolve('web').toFile()

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

    // Construct the full path to the requested file, removing leading slash.
    def requestedFile = new File(webRootDir, requestedPath.substring(1))

    // ** Security Check **
    // Prevent directory traversal attacks. Ensure the requested file is actually inside the web root directory.
    if (!requestedFile.getCanonicalPath().startsWith(webRootDir.getCanonicalPath())) {
        return Response.status(Response.Status.FORBIDDEN).entity('Access denied.').build()
    }

    if (!requestedFile.exists() || requestedFile.isDirectory()) {
        return Response.status(Response.Status.NOT_FOUND).entity("File not found: ${requestedPath}").build()
    }

    // Determine the content type from the file extension.
    def fileExtension = requestedFile.name.split(/\./).last()
    def contentType = mimeTypes.get(fileExtension, 'application/octet-stream') // Default to binary stream

    // Serve the file.
    return Response.ok(requestedFile.newInputStream()).type(contentType).build()
}

