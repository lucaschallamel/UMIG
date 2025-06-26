/**
 * User List Macro — UMIG Project
 *
 * Renders a placeholder div and loads the client-side JavaScript controller
 * that will fetch and display a list of all users.
 */

// The base path for the REST endpoint that serves web resources.
// Assumes an endpoint is configured at '/rest/scriptrunner/latest/custom/web' that serves files from 'src/web'.
def webResourcesPath = "/rest/scriptrunner/latest/custom/web"

return """
<div id="user-list-container">
    <div class="aui-message">Loading User List...</div>
</div>
<script src="${webResourcesPath}/js/user-list.js"></script>
"""