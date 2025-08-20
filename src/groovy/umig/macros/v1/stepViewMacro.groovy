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
<link rel=\"stylesheet\" type=\"text/css\" href=\"${webRoot}/css/iteration-view.css\" id=\"iteration-view-css\">

<!-- CSS Loading Debug Information -->
<script type=\"text/javascript\">
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
            console.warn('⚠️ .step-details-panel element not found - this is expected until step details are loaded');
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
            console.warn('⚠️ .panel-header element not found - this is expected until step details are loaded');
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
    /* Minimal styles for standalone step view - let iteration-view.css handle most styling */
    .step-view-standalone {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
    }
    
    /* Mobile responsiveness */
    @media (max-width: 768px) {
        .step-view-standalone {
            padding: 10px;
        }
    }
</style>

<div class=\"iteration-view step-view-standalone\">
    <!-- Version Marker: US-036 UI Refactoring v2.4 - ${new Date().format('yyyy-MM-dd HH:mm:ss')} -->
    <div class=\"version-marker\" style=\"background: #0747a6; color: white; padding: 8px; margin-bottom: 10px; border-radius: 3px; font-size: 12px;\">
        🚀 StepView v2.4 - UI Streamlined & Redundancy Removed (Deployed: ${new Date().format('HH:mm:ss')})
    </div>
    <!-- Main container for JavaScript to populate -->
    <aside id=\"umig-step-view-root\" class=\"step-details-panel\">
        <!-- JavaScript will populate this container with step details -->
        <div class=\"placeholder-message\">
            <p>Loading step details...</p>
        </div>
    </aside>
    
    <!-- Loading indicator -->
    <div class=\"loading-indicator\" style=\"display: none;\">
        <div class=\"spinner\"></div>
        <span>Loading step details...</span>
    </div>
    
    <!-- Error message container -->
    <div class=\"error-container\" style=\"display: none;\">
        <div class=\"aui-message aui-message-error\">
            <span class=\"aui-icon icon-error\"></span>
            <span class=\"error-message\"></span>
        </div>
    </div>
</div>

<script type=\"text/javascript\">
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
            searchEnabled: false,     // US-036: Search removed
            filterEnabled: false      // US-036: Filters removed
        }
    };
    
    // Debug URL parameters and container availability
    console.log('🔍 StepView Debug: Initializing...');
    console.log('🔗 Current URL:', window.location.href);
    console.log('📋 URL Search params:', window.location.search);
    
    const urlParams = new URLSearchParams(window.location.search);
    console.log('🎯 URL Parameters:');
    console.log('  mig (migration):', urlParams.get('mig'));
    console.log('  ite (iteration):', urlParams.get('ite'));
    console.log('  stepid:', urlParams.get('stepid'));
    
    document.addEventListener('DOMContentLoaded', function() {
        const container = document.getElementById('umig-step-view-root');
        if (container) {
            console.log('✅ StepView: Container #umig-step-view-root found successfully');
            console.log('📋 Container classes:', container.className);
            console.log('📋 Container innerHTML length:', container.innerHTML.length);
        } else {
            console.error('❌ StepView: Container #umig-step-view-root NOT FOUND');
            console.log('🔍 Available elements with IDs:');
            document.querySelectorAll('[id]').forEach(el => {
                console.log('  -', el.id, '(tag:', el.tagName + ')');
            });
        }
    });
</script>

<script type=\"text/javascript\" src=\"${webRoot}/js/step-view.js\"></script>
"""
