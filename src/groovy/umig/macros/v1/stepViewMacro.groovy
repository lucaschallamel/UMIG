/**
 * STEP View Macro — UMIG Project
 *
 * Renders a standalone view for a single step instance with all the features
 * from the iteration view's step details panel. Supports role-based controls,
 * instruction completion tracking, comments, and status management.
 * 
 * The view is driven by the 'stepid' URL parameter (format: STT-nnn)
 * 
 * Phase 2 Enhancement: Aligned with IterationView styling using iteration-view.css
 * and matching HTML structure for consistency across the UMIG platform.
 */

import com.atlassian.confluence.user.AuthenticatedUserThreadLocal
import com.atlassian.confluence.user.ConfluenceUser
import umig.repository.UserRepository

// Get current user context
def currentConfluenceUser = AuthenticatedUserThreadLocal.get() as ConfluenceUser
def userRole = 'NORMAL'
def isAdmin = false
def isPilot = false
def userId = null
def username = 'Guest'

// Check for role parameter in the URL (restricted to development environment only)
def roleParam = null
if (System.getProperty('confluence.dev.mode') == 'true') {
    try {
        // Access the request parameters from the page context - DEV ONLY
        def pageContext = com.atlassian.confluence.renderer.radeox.macros.MacroUtils.getPageContext()
        if (pageContext && pageContext.request) {
            roleParam = pageContext.request.getParameter('role')
        }
    } catch (Exception e) {
        // Ignore if request context is not available
    }
}

if (currentConfluenceUser) {
    username = currentConfluenceUser.name
    
    def userRepository = new UserRepository()
    def user = userRepository.findUserByUsername(username)
    
    if (user) {
        // Type-safe handling with validation
        userId = user['usr_id'] ? Integer.parseInt(user['usr_id'].toString()) : null
        userRole = (user['role_code']?.toString()?.toUpperCase() ?: 'NORMAL') as String
        
        // Validate role is one of allowed values
        if (!(userRole in ['NORMAL', 'PILOT', 'ADMIN'])) {
            userRole = 'NORMAL'
            log.warn("Invalid role '${user['role_code']}' for user ${username}, defaulting to NORMAL")
        }
        
        isAdmin = userRole == 'ADMIN'
        isPilot = userRole == 'PILOT' || isAdmin
    }
}

// Override with URL parameter if provided (development environment only)
if (System.getProperty('confluence.dev.mode') == 'true' && roleParam in ['PILOT', 'ADMIN']) {
    userRole = roleParam
    isPilot = (userRole == 'PILOT' || userRole == 'ADMIN')
    isAdmin = (userRole == 'ADMIN')
    // Log this override for audit purposes
    log.warn("DEV MODE: User role overridden to ${userRole} for ${username}")
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
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    }
    
    /* Ensure proper layout matching IterationView */
    .step-details-container {
        background: white;
        border: 1px solid #dfe1e6;
        border-radius: 3px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    }
    
    /* Mobile responsiveness matching IterationView */
    @media (max-width: 768px) {
        #umig-step-view-root {
            padding: 10px;
        }
        
        .step-details-container {
            border-radius: 0;
            border-left: none;
            border-right: none;
        }
    }
</style>

<div id="umig-step-view-root">
    <!-- Main container matching IterationView structure -->
    <div class="step-details-container">
        <!-- Step header section with status badge -->
        <div class="step-header">
            <div class="step-header-content">
                <div class="step-title-row">
                    <h2 class="step-name">
                        <span class="step-code"></span>
                        <span class="step-title-text"></span>
                    </h2>
                    <span class="status-badge"></span>
                </div>
                <div class="step-meta">
                    <span class="step-owner"></span>
                    <span class="step-timing"></span>
                </div>
            </div>
        </div>
        
        <!-- Step content sections -->
        <div class="step-content">
            <!-- Description section -->
            <div class="step-section step-description-section">
                <h3 class="section-title">Description</h3>
                <div class="section-content">
                    <p class="step-description"></p>
                </div>
            </div>
            
            <!-- Teams section -->
            <div class="step-section teams-section">
                <h3 class="section-title">Teams</h3>
                <div class="section-content">
                    <div class="teams-grid">
                        <div class="team-assigned">
                            <label class="team-label">Assigned Team:</label>
                            <span class="team-value"></span>
                        </div>
                        <div class="team-impacted">
                            <label class="team-label">Impacted Teams:</label>
                            <span class="team-value"></span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Instructions section with 6-column layout -->
            <div class="step-section instructions-section">
                <h3 class="section-title">
                    Instructions
                    <span class="instruction-count"></span>
                </h3>
                <div class="section-content">
                    <div class="instructions-container">
                        <!-- Instructions will be rendered here with 6-column grid layout -->
                    </div>
                </div>
            </div>
            
            <!-- Comments section with card-based layout -->
            <div class="step-section comments-section">
                <h3 class="section-title">
                    Comments
                    <span class="comment-count"></span>
                </h3>
                <div class="section-content">
                    <div class="comments-container">
                        <!-- Comments will be rendered here with card-based layout -->
                    </div>
                    <div class="comment-form" style="display: none;">
                        <textarea class="comment-input" placeholder="Add a comment..."></textarea>
                        <div class="comment-actions">
                            <button class="aui-button aui-button-primary submit-comment">Add Comment</button>
                            <button class="aui-button cancel-comment">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Action buttons for PILOT/ADMIN users -->
            <div class="step-actions" style="${isPilot ? '' : 'display: none;'}">
                <button class="aui-button update-status">Update Status</button>
                <button class="aui-button bulk-complete" style="${isAdmin ? '' : 'display: none;'}">Bulk Complete Instructions</button>
            </div>
        </div>
    </div>
    
    <!-- Loading indicator -->
    <div class="loading-indicator" style="display: none;">
        <div class="spinner"></div>
        <span>Loading step details...</span>
    </div>
    
    <!-- Error message container -->
    <div class="error-container" style="display: none;">
        <div class="aui-message aui-message-error">
            <span class="aui-icon icon-error"></span>
            <span class="error-message"></span>
        </div>
    </div>
</div>

<script type="text/javascript">
    // Pass configuration to the step view with enhanced user context
    window.UMIG_STEP_CONFIG = {
        api: {
            baseUrl: '/rest/scriptrunner/latest/custom',
            pollingInterval: 2000,  // 2-second polling matching IterationView
            cacheTimeout: 30000     // 30-second cache TTL
        },
        user: {
            id: ${userId ?: 'null'},
            username: '${username}',
            role: '${userRole}',
            isAdmin: ${isAdmin},
            isPilot: ${isPilot}
        },
        features: {
            caching: true,
            realTimeSync: true,
            bulkOperations: ${isPilot},
            exportEnabled: true,
            searchEnabled: true,
            filterEnabled: true
        }
    };
</script>

<script type="text/javascript" src="${restApiBase}/js/step-view.js"></script>
"""
