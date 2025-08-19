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
// Commenting out role override due to static type checking issues
// This feature needs to be reimplemented with proper type handling
/*
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
*/

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
// Commented out due to static type checking issues - needs reimplementation
/*
if (System.getProperty('confluence.dev.mode') == 'true' && roleParam in ['PILOT', 'ADMIN']) {
    userRole = roleParam
    isPilot = (userRole == 'PILOT' || userRole == 'ADMIN')
    isAdmin = (userRole == 'ADMIN')
    // Log this override for audit purposes
    log.warn("DEV MODE: User role overridden to ${userRole} for ${username}")
}
*/

// Use the same pattern as iterationViewMacro for consistency
def webRoot = System.getenv('UMIG_WEB_ROOT') ?: '/rest/scriptrunner/latest/custom/web'

return """
<!-- Include the iteration view CSS for consistent styling -->
<link rel="stylesheet" type="text/css" href="${webRoot}/css/iteration-view.css" id="iteration-view-css">

<!-- CSS Loading Debug Information -->
<script type="text/javascript">
console.log('🎨 StepView CSS Debug: CSS Link Element Created');
console.log('🔗 CSS Path: ${webRoot}/css/iteration-view.css');

// Check if CSS loads successfully
document.getElementById('iteration-view-css').addEventListener('load', function() {
    console.log('✅ StepView CSS: iteration-view.css loaded successfully');
});

document.getElementById('iteration-view-css').addEventListener('error', function() {
    console.error('❌ StepView CSS: Failed to load iteration-view.css');
    console.error('🔗 Failed URL: ${webRoot}/css/iteration-view.css');
});

// Debug CSS rules after DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        console.log('🔍 StepView CSS Debug: Checking CSS rules...');
        const stepPanel = document.querySelector('.step-details-panel');
        if (stepPanel) {
            const computedStyle = window.getComputedStyle(stepPanel);
            console.log('📊 .step-details-panel computed styles:');
            console.log('  background:', computedStyle.background);
            console.log('  border:', computedStyle.border);
            console.log('  border-radius:', computedStyle.borderRadius);
            console.log('  box-shadow:', computedStyle.boxShadow);
            console.log('  display:', computedStyle.display);
            console.log('  flex-direction:', computedStyle.flexDirection);
            console.log('  height:', computedStyle.height);
            console.log('  overflow:', computedStyle.overflow);
        } else {
            console.error('❌ .step-details-panel element not found!');
        }
        
        const panelHeader = document.querySelector('.panel-header');
        if (panelHeader) {
            const headerStyle = window.getComputedStyle(panelHeader);
            console.log('📊 .panel-header computed styles:');
            console.log('  font-size:', headerStyle.fontSize);
            console.log('  font-weight:', headerStyle.fontWeight);
            console.log('  color:', headerStyle.color);
            console.log('  margin-bottom:', headerStyle.marginBottom);
        } else {
            console.error('❌ .panel-header element not found!');
        }
        
        // Check for CSS variables
        const rootStyle = window.getComputedStyle(document.documentElement);
        console.log('🎨 CSS Variables Check:');
        console.log('  --color-primary:', rootStyle.getPropertyValue('--color-primary'));
        console.log('  --color-bg-primary:', rootStyle.getPropertyValue('--color-bg-primary'));
        console.log('  --color-border:', rootStyle.getPropertyValue('--color-border'));
        console.log('  --font-family:', rootStyle.getPropertyValue('--font-family'));
    }, 1000);
});
</script>

<style>
    /* Additional styles specific to standalone step view with debug info */
    #umig-step-view-root {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        background: #f4f5f7 !important; /* Force background to match IterationView */
    }
    
    /* Ensure proper layout matching IterationView with enhanced specificity */
    #umig-step-view-root .step-details-panel {
        background: white !important;
        border: 1px solid #dfe1e6 !important;
        border-radius: 4px !important;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
        display: flex !important;
        flex-direction: column !important;
        padding: 16px !important;
        min-width: 0 !important;
        height: auto !important;
        overflow: visible !important;
    }
    
    /* Panel header styling matching IterationView */
    #umig-step-view-root .panel-header {
        font-size: 16px !important;
        font-weight: 600 !important;
        color: #0052cc !important;
        margin-bottom: 8px !important;
        padding-bottom: 8px !important;
        border-bottom: 1px solid #dfe1e6 !important;
    }
    
    /* Step section styling */
    #umig-step-view-root .step-section {
        margin-bottom: 24px !important;
    }
    
    #umig-step-view-root .section-title {
        font-size: 14px !important;
        font-weight: 600 !important;
        color: #5e6c84 !important;
        margin-bottom: 8px !important;
    }
    
    #umig-step-view-root .section-content {
        background: white !important;
        border: 1px solid #dfe1e6 !important;
        border-radius: 4px !important;
        padding: 12px !important;
    }
    
    /* Step header content */
    #umig-step-view-root .step-header-content {
        background: white !important;
    }
    
    #umig-step-view-root .step-title-row {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        margin-bottom: 8px !important;
    }
    
    #umig-step-view-root .step-name {
        font-size: 18px !important;
        font-weight: 600 !important;
        color: #0052cc !important;
        margin: 0 !important;
    }
    
    #umig-step-view-root .step-meta {
        display: flex !important;
        gap: 16px !important;
        font-size: 12px !important;
        color: #5e6c84 !important;
    }
    
    /* Teams grid styling */
    #umig-step-view-root .teams-grid {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 16px !important;
    }
    
    #umig-step-view-root .team-label {
        font-weight: 600 !important;
        color: #5e6c84 !important;
        margin-right: 8px !important;
    }
    
    #umig-step-view-root .team-value {
        color: #172b4d !important;
        font-weight: 500 !important;
    }
    
    /* Instructions container */
    #umig-step-view-root .instructions-container {
        background: white !important;
        border: 1px solid #dfe1e6 !important;
        border-radius: 4px !important;
    }
    
    /* Comments container */
    #umig-step-view-root .comments-container {
        background: white !important;
    }
    
    /* Action buttons */
    #umig-step-view-root .step-actions {
        display: flex !important;
        gap: 8px !important;
        padding-top: 16px !important;
        border-top: 1px solid #dfe1e6 !important;
        margin-top: 8px !important;
    }
    
    /* Mobile responsiveness matching IterationView */
    @media (max-width: 768px) {
        #umig-step-view-root {
            padding: 10px !important;
        }
        
        #umig-step-view-root .step-details-panel {
            border-radius: 0 !important;
            border-left: none !important;
            border-right: none !important;
        }
        
        #umig-step-view-root .teams-grid {
            grid-template-columns: 1fr !important;
        }
    }
    
    /* Debug helper - highlight elements for troubleshooting */
    .debug-highlight {
        border: 2px solid red !important;
        background: rgba(255, 0, 0, 0.1) !important;
    }
</style>

<div id="umig-step-view-root">
    <!-- Version Marker: US-036 Phase 2 v2.2 - ${new Date().format('yyyy-MM-dd HH:mm:ss')} -->
    <div class="version-marker" style="background: #0747a6; color: white; padding: 8px; margin-bottom: 10px; border-radius: 3px; font-size: 12px;">
        🚀 StepView v2.2 - US-036 CSS Debug Enhanced (Deployed: ${new Date().format('HH:mm:ss')})
    </div>
    <!-- Main container matching IterationView structure -->
    <div class="step-details-panel">
        <!-- Step header section with status badge -->
        <div class="panel-header">
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
        <div class="step-details-content">
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

<script type="text/javascript" src="${webRoot}/js/step-view.js"></script>
"""
