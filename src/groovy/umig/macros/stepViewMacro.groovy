/**
 * STEP View Macro — UMIG Project
 *
 * Renders a placeholder div and loads the client-side JavaScript controller.
 * The JS controller fetches and renders the actual STEP View from a REST endpoint.
 * This allows the view to be driven by URL parameters.
 */

// The base path for the REST endpoint that serves static assets from src/web.
// This follows the pattern established in other parts of the application.
def restApiBase = "/rest/scriptrunner/latest/custom/web"

return """
<div id="umig-step-view-root">
    <div class="aui-message">Loading STEP View...</div>
</div>
<script type="text/javascript" src="${restApiBase}/js/step-view.js"></script>
"""
