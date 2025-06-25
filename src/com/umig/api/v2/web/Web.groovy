package com.umig.api.v2.web

import javax.servlet.http.HttpServletResponse

// This script serves static assets (CSS, JS) from the 'web' directory.
// It is mapped to the REST endpoint /api/v2/web/*

// --- Configuration ---
// Determine the root directory for our web assets.
// The script is at .../scripts/com/umig/api/v2/web/Web.groovy
// The assets are at .../scripts/web/
// So we need to go up 5 levels from the script's location to get to the script root.
def scriptFile = new File(getClass().protectionDomain.codeSource.location.path)
def webRootDir = scriptFile.parentFile.parentFile.parentFile.parentFile.parentFile.toPath().resolve('web').toFile()

// A map of file extensions to MIME types for common web assets.
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

// --- Logic ---
// Get the requested file path from the URL (e.g., /css/styles.css)
def requestedPath = request.pathInfo

if (!requestedPath || requestedPath == '/') {
    response.sendError(HttpServletResponse.SC_BAD_REQUEST, 'File path is required.')
    return
}

// Construct the full path to the requested file.
def requestedFile = new File(webRootDir, requestedPath.substring(1))

// ** Security Check **
// Prevent directory traversal attacks. Ensure the requested file is actually inside the web root directory.
if (!requestedFile.getCanonicalPath().startsWith(webRootDir.getCanonicalPath())) {
    response.sendError(HttpServletResponse.SC_FORBIDDEN, 'Access denied.')
    return
}

if (!requestedFile.exists() || requestedFile.isDirectory()) {
    response.sendError(HttpServletResponse.SC_NOT_FOUND, "File not found: ${requestedPath}")
    return
}

// Determine the content type from the file extension.
def fileExtension = requestedFile.name.split('\\.')[-1]
def contentType = mimeTypes.get(fileExtension, 'application/octet-stream') // Default to binary stream

// Serve the file.
response.contentType = contentType
response.setContentLength(requestedFile.bytes.length)
response.outputStream << requestedFile.newInputStream()
