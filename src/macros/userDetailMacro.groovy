/**
 * User Detail Macro — UMIG Project
 *
 * Renders a placeholder div and loads the client-side JavaScript controller
 * that will fetch and display the details for a single user (with edit support).
 */

def webResourcesPath = "/rest/scriptrunner/latest/custom/web"

return """
<div id="user-detail-container" data-user-id="${request.getParameter('userId') ?: ''}">
    <div class="aui-message">Loading User Details...</div>
</div>
<script src="${webResourcesPath}/js/user-detail.js"></script>
"""
