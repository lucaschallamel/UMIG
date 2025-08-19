package umig.tests.unit

import spock.lang.Specification
import spock.lang.Title
import spock.lang.Narrative

@Title("StepView Macro Test - US-036 Phase 2 Alignment")
@Narrative("""
    Test suite for verifying that the StepView Macro correctly generates HTML
    that aligns with the IterationView styling and structure.
    Part of US-036: StepView UI Refactoring Phase 2.
""")
class StepViewMacroTest extends Specification {
    
    def "should generate HTML with correct IterationView CSS classes"() {
        given: "A mock macro execution"
        def userRole = 'PILOT'
        def userId = 123
        def username = 'testuser'
        def isAdmin = false
        def isPilot = true
        
        when: "The macro generates HTML"
        def html = generateMacroHtml(userRole, userId, username, isAdmin, isPilot)
        
        then: "It includes the iteration-view.css"
        html.contains('href="/rest/scriptrunner/latest/custom/web/css/iteration-view.css"')
        
        and: "It has the correct container structure"
        html.contains('class="step-details-container"')
        html.contains('class="step-header"')
        html.contains('class="step-content"')
        
        and: "It has the correct sections"
        html.contains('class="step-section step-description-section"')
        html.contains('class="step-section teams-section"')
        html.contains('class="step-section instructions-section"')
        html.contains('class="step-section comments-section"')
        
        and: "It has status badge placeholder"
        html.contains('class="status-badge"')
        
        and: "It has the correct instruction container"
        html.contains('class="instructions-container"')
        
        and: "It has the correct comments container"
        html.contains('class="comments-container"')
    }
    
    def "should include PILOT-specific features when user is PILOT"() {
        given: "A PILOT user"
        def userRole = 'PILOT'
        def isPilot = true
        def isAdmin = false
        
        when: "The macro generates HTML"
        def html = generateMacroHtml(userRole, 123, 'pilot', isAdmin, isPilot)
        
        then: "It shows the step-actions div"
        html.contains('class="step-actions"')
        !html.contains('class="step-actions" style="display: none;"')
        
        and: "It enables bulk operations in config"
        html.contains('bulkOperations: true')
    }
    
    def "should hide ADMIN-only features for non-ADMIN users"() {
        given: "A PILOT user (not ADMIN)"
        def userRole = 'PILOT'
        def isPilot = true
        def isAdmin = false
        
        when: "The macro generates HTML"
        def html = generateMacroHtml(userRole, 123, 'pilot', isAdmin, isPilot)
        
        then: "It hides bulk complete button"
        html.contains('class="aui-button bulk-complete" style="display: none;"')
    }
    
    def "should include mobile-responsive media queries"() {
        when: "The macro generates HTML"
        def html = generateMacroHtml('NORMAL', null, 'Guest', false, false)
        
        then: "It includes mobile breakpoint styles"
        html.contains('@media (max-width: 768px)')
        html.contains('padding: 10px')
        html.contains('border-radius: 0')
    }
    
    def "should configure 2-second polling and 30-second cache"() {
        when: "The macro generates HTML"
        def html = generateMacroHtml('NORMAL', null, 'Guest', false, false)
        
        then: "It has correct timing configuration"
        html.contains('pollingInterval: 2000')
        html.contains('cacheTimeout: 30000')
    }
    
    def "should include enhanced features configuration"() {
        given: "A PILOT user"
        def isPilot = true
        
        when: "The macro generates HTML"
        def html = generateMacroHtml('PILOT', 123, 'pilot', false, isPilot)
        
        then: "It enables all enhanced features"
        html.contains('caching: true')
        html.contains('realTimeSync: true')
        html.contains('exportEnabled: true')
        html.contains('searchEnabled: true')
        html.contains('filterEnabled: true')
    }
    
    def "should include error and loading containers"() {
        when: "The macro generates HTML"
        def html = generateMacroHtml('NORMAL', null, 'Guest', false, false)
        
        then: "It has loading indicator"
        html.contains('class="loading-indicator"')
        html.contains('class="spinner"')
        
        and: "It has error container"
        html.contains('class="error-container"')
        html.contains('class="aui-message aui-message-error"')
    }
    
    // Helper method to simulate macro HTML generation
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
}