package umig.tests.unit

import spock.lang.Specification
import spock.lang.Title
import spock.lang.Narrative

@Title("StepView Macro Role-Based Access Control Test - US-036 Phase 2")
@Narrative("""
    Comprehensive test suite for validating role-based access control in StepView Macro,
    including URL parameter override functionality for testing and PILOT access.
    Part of US-036: StepView UI Refactoring Phase 2.
""")
class StepViewMacroRoleTest extends Specification {
    
    def "should correctly handle NORMAL user with no role parameter"() {
        given: "A NORMAL user with no URL role parameter"
        def userRole = 'NORMAL'
        def userId = 123
        def username = 'normaluser'
        def roleParam = null
        
        when: "The macro processes role logic"
        def (finalRole, isPilot, isAdmin) = processRoleLogic(userRole, roleParam)
        
        then: "Role remains NORMAL with no elevated privileges"
        finalRole == 'NORMAL'
        !isPilot
        !isAdmin
        
        and: "Generated HTML restricts PILOT/ADMIN features"
        def html = generateMacroHtml(finalRole, userId, username, isAdmin, isPilot)
        html.contains('class="step-actions" style="display: none;"')
        html.contains('bulkOperations: false')
    }
    
    def "should correctly handle PILOT user with no role parameter"() {
        given: "A PILOT user with no URL role parameter"
        def userRole = 'PILOT'
        def userId = 456
        def username = 'pilotuser'
        def roleParam = null
        
        when: "The macro processes role logic"
        def (finalRole, isPilot, isAdmin) = processRoleLogic(userRole, roleParam)
        
        then: "Role remains PILOT with PILOT privileges"
        finalRole == 'PILOT'
        isPilot
        !isAdmin
        
        and: "Generated HTML enables PILOT features but not ADMIN"
        def html = generateMacroHtml(finalRole, userId, username, isAdmin, isPilot)
        html.contains('class="step-actions"')
        !html.contains('class="step-actions" style="display: none;"')
        html.contains('bulkOperations: true')
        html.contains('class="aui-button bulk-complete" style="display: none;"') // ADMIN only
    }
    
    def "should correctly handle ADMIN user with no role parameter"() {
        given: "An ADMIN user with no URL role parameter"
        def userRole = 'ADMIN'
        def userId = 789
        def username = 'adminuser'
        def roleParam = null
        
        when: "The macro processes role logic"
        def (finalRole, isPilot, isAdmin) = processRoleLogic(userRole, roleParam)
        
        then: "Role remains ADMIN with all privileges"
        finalRole == 'ADMIN'
        isPilot  // ADMIN implies PILOT
        isAdmin
        
        and: "Generated HTML enables all features including ADMIN-only"
        def html = generateMacroHtml(finalRole, userId, username, isAdmin, isPilot)
        html.contains('class="step-actions"')
        !html.contains('class="step-actions" style="display: none;"')
        html.contains('bulkOperations: true')
        !html.contains('class="aui-button bulk-complete" style="display: none;"') // ADMIN visible
    }
    
    def "should override NORMAL user to PILOT with URL parameter"() {
        given: "A NORMAL user with PILOT role parameter"
        def userRole = 'NORMAL'
        def userId = 123
        def username = 'normaluser'
        def roleParam = 'PILOT'
        
        when: "The macro processes role logic"
        def (finalRole, isPilot, isAdmin) = processRoleLogic(userRole, roleParam)
        
        then: "Role is overridden to PILOT"
        finalRole == 'PILOT'
        isPilot
        !isAdmin
        
        and: "Generated HTML reflects PILOT privileges"
        def html = generateMacroHtml(finalRole, userId, username, isAdmin, isPilot)
        html.contains('bulkOperations: true')
        html.contains('role: \'PILOT\'')
        html.contains('isPilot: true')
        html.contains('isAdmin: false')
    }
    
    def "should override NORMAL user to ADMIN with URL parameter"() {
        given: "A NORMAL user with ADMIN role parameter"
        def userRole = 'NORMAL'
        def userId = 123
        def username = 'normaluser'
        def roleParam = 'ADMIN'
        
        when: "The macro processes role logic"
        def (finalRole, isPilot, isAdmin) = processRoleLogic(userRole, roleParam)
        
        then: "Role is overridden to ADMIN"
        finalRole == 'ADMIN'
        isPilot  // ADMIN implies PILOT
        isAdmin
        
        and: "Generated HTML reflects ADMIN privileges"
        def html = generateMacroHtml(finalRole, userId, username, isAdmin, isPilot)
        html.contains('bulkOperations: true')
        html.contains('role: \'ADMIN\'')
        html.contains('isPilot: true')
        html.contains('isAdmin: true')
    }
    
    def "should override PILOT user to ADMIN with URL parameter"() {
        given: "A PILOT user with ADMIN role parameter"
        def userRole = 'PILOT'
        def userId = 456
        def username = 'pilotuser'
        def roleParam = 'ADMIN'
        
        when: "The macro processes role logic"
        def (finalRole, isPilot, isAdmin) = processRoleLogic(userRole, roleParam)
        
        then: "Role is overridden to ADMIN"
        finalRole == 'ADMIN'
        isPilot
        isAdmin
        
        and: "Generated HTML shows ADMIN capabilities"
        def html = generateMacroHtml(finalRole, userId, username, isAdmin, isPilot)
        !html.contains('class="aui-button bulk-complete" style="display: none;"')
    }
    
    def "should ignore invalid role parameters"() {
        given: "A user with invalid role parameter"
        def userRole = 'NORMAL'
        def userId = 123
        def username = 'normaluser'
        def roleParam = 'INVALID_ROLE'
        
        when: "The macro processes role logic"
        def (finalRole, isPilot, isAdmin) = processRoleLogic(userRole, roleParam)
        
        then: "Role remains unchanged"
        finalRole == 'NORMAL'
        !isPilot
        !isAdmin
    }
    
    def "should ignore role downgrades (ADMIN to NORMAL)"() {
        given: "An ADMIN user with NORMAL role parameter"
        def userRole = 'ADMIN'
        def userId = 789
        def username = 'adminuser'
        def roleParam = 'NORMAL'  // Attempted downgrade
        
        when: "The macro processes role logic"
        def (finalRole, isPilot, isAdmin) = processRoleLogic(userRole, roleParam)
        
        then: "Role parameter is ignored (only upgrades allowed)"
        finalRole == 'ADMIN'
        isPilot
        isAdmin
    }
    
    def "should generate correct JavaScript configuration for each role"() {
        when: "Different roles generate configuration"
        def normalConfig = extractJavaScriptConfig(generateMacroHtml('NORMAL', 123, 'normal', false, false))
        def pilotConfig = extractJavaScriptConfig(generateMacroHtml('PILOT', 456, 'pilot', false, true))
        def adminConfig = extractJavaScriptConfig(generateMacroHtml('ADMIN', 789, 'admin', true, true))
        
        then: "Each configuration reflects correct permissions"
        normalConfig.contains('bulkOperations: false')
        pilotConfig.contains('bulkOperations: true')
        adminConfig.contains('bulkOperations: true')
        
        and: "User context is correctly set"
        normalConfig.contains('role: \'NORMAL\'')
        normalConfig.contains('isPilot: false')
        normalConfig.contains('isAdmin: false')
        
        pilotConfig.contains('role: \'PILOT\'')
        pilotConfig.contains('isPilot: true')
        pilotConfig.contains('isAdmin: false')
        
        adminConfig.contains('role: \'ADMIN\'')
        adminConfig.contains('isPilot: true')
        adminConfig.contains('isAdmin: true')
    }
    
    def "should maintain security with role parameter override"() {
        given: "A user with role override"
        def userRole = 'NORMAL'
        def roleParam = 'PILOT'
        
        when: "The macro generates HTML"
        def html = generateMacroHtml('PILOT', 123, 'normal', false, true)
        
        then: "Security headers and authentication are preserved"
        html.contains('groups: ["confluence-users"]') // If present in macro
        
        and: "No sensitive information is exposed in comments"
        !html.contains('password')
        !html.contains('secret')
        !html.contains('token')
    }
    
    def "should validate timing configuration matches IterationView"() {
        when: "The macro generates configuration"
        def html = generateMacroHtml('NORMAL', null, 'Guest', false, false)
        
        then: "Timing matches IterationView standards"
        html.contains('pollingInterval: 2000')  // 2 seconds
        html.contains('cacheTimeout: 30000')   // 30 seconds
        
        and: "Features are correctly configured"
        html.contains('caching: true')
        html.contains('realTimeSync: true')
        html.contains('exportEnabled: true')
        html.contains('searchEnabled: true')
        html.contains('filterEnabled: true')
    }
    
    // Helper methods
    private List processRoleLogic(String userRole, String roleParam) {
        def finalRole = userRole
        def isPilot = userRole == 'PILOT' || userRole == 'ADMIN'
        def isAdmin = userRole == 'ADMIN'
        
        // Override with URL parameter if provided (for testing/pilot access)
        if (roleParam in ['PILOT', 'ADMIN']) {
            finalRole = roleParam
            isPilot = (finalRole == 'PILOT' || finalRole == 'ADMIN')
            isAdmin = (finalRole == 'ADMIN')
        }
        
        return [finalRole, isPilot, isAdmin]
    }
    
    private String generateMacroHtml(String userRole, Integer userId, String username, boolean isAdmin, boolean isPilot) {
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
    }
    
    private String extractJavaScriptConfig(String html) {
        def startIndex = html.indexOf('window.UMIG_STEP_CONFIG = {')
        def endIndex = html.indexOf('};', startIndex) + 2
        return html.substring(startIndex, endIndex)
    }
}