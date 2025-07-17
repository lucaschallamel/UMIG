/**
 * STEP View Macro — UMIG Project
 *
 * Renders a standalone view for a single step instance with all the features
 * from the iteration view's step details panel. Supports role-based controls,
 * instruction completion tracking, comments, and status management.
 * 
 * The view is driven by the 'stepid' URL parameter (format: STT-nnn)
 */

import com.atlassian.confluence.user.AuthenticatedUserThreadLocal
import com.atlassian.confluence.user.ConfluenceUser
import umig.repository.UserRepository

// Get current user context
def currentConfluenceUser = AuthenticatedUserThreadLocal.get() as ConfluenceUser
def userRole = 'NORMAL'
def isAdmin = false
def userId = null

if (currentConfluenceUser) {
    def username = currentConfluenceUser.name
    
    def userRepository = new UserRepository()
    def user = userRepository.findUserByUsername(username)
    
    if (user) {
        userId = user['usr_id'] as Integer
        userRole = (user['role_code'] ?: 'NORMAL') as String
        isAdmin = userRole == 'ADMIN'
    }
}

// The base path for the REST endpoint that serves static assets
def restApiBase = "/rest/scriptrunner/latest/custom/web"

return """
<!-- Include the iteration view CSS for consistent styling -->
<link rel="stylesheet" type="text/css" href="${restApiBase}/css/iteration-view.css">

<style>
    /* Additional styles specific to standalone step view */
    #umig-step-view-root {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
    }
    
    .step-view-header {
        background: #f4f5f7;
        border-radius: 3px;
        padding: 20px;
        margin-bottom: 20px;
    }
    
    .step-view-content {
        background: white;
        border: 1px solid #ddd;
        border-radius: 3px;
        padding: 20px;
    }
</style>

<div id="umig-step-view-root">
    <div class="aui-message aui-message-info">
        <span class="aui-icon icon-info"></span>
        Loading step details...
    </div>
</div>

<script type="text/javascript">
    // Pass configuration to the step view
    window.UMIG_STEP_CONFIG = {
        api: {
            baseUrl: '/rest/scriptrunner/latest/custom'
        },
        user: {
            id: ${userId ?: 'null'},
            role: '${userRole}',
            isAdmin: ${isAdmin}
        }
    };
</script>

<script type="text/javascript" src="${restApiBase}/js/step-view.js"></script>
"""
