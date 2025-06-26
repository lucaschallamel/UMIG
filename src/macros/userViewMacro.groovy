/**
 * User View Macro — UMIG Project
 *
 * Renders a placeholder div and loads the client-side JavaScript controller
 * that will fetch and display user data based on a URL parameter.
 */

// The base path for the REST endpoint that serves web resources.
// Assumes an endpoint is configured at '/rest/scriptrunner/latest/custom/web' that serves files from 'src/web'.
def webResourcesPath = "/rest/scriptrunner/latest/custom/web"

return """
<div id="umig-user-view-root">
    <div class="aui-message">Loading User View...</div>
</div>
<script src="${webResourcesPath}/js/user-view.js"></script>
"""
