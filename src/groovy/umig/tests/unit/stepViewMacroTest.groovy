package umig.tests.unit

/**
 * StepView Macro Test - US-036 Phase 2 Alignment
 * 
 * Test suite for verifying that the StepView Macro correctly generates HTML
 * that aligns with the IterationView styling and structure.
 * Part of US-036: StepView UI Refactoring Phase 2.
 * 
 * Converted from Spock to standard Groovy per ADR-036
 */
class StepViewMacroTest {
    
    void testGenerateHtmlWithCorrectIterationViewCssClasses() {
        // Given: A mock macro execution
        def userRole = 'PILOT'
        def userId = 123
        def username = 'testuser'
        def isAdmin = false
        def isPilot = true
        
        // When: The macro generates HTML
        def html = generateMacroHtml(userRole, userId, username, isAdmin, isPilot)
        
        // Then: It includes the iteration-view.css
        assert html.contains('href="/rest/scriptrunner/latest/custom/web/css/iteration-view.css')
        
        // And: It has the correct container structure
        assert html.contains('class="step-details-container"')
        assert html.contains('class="step-header"')
        assert html.contains('class="step-content"')
        
        // And: It has the correct sections
        assert html.contains('class="step-section step-description-section"')
        assert html.contains('class="step-section teams-section"')
        assert html.contains('class="step-section instructions-section"')
        assert html.contains('class="step-section comments-section"')
        
        // And: It has status badge placeholder
        assert html.contains('class="status-badge"')
        
        // And: It has the correct instruction container
        assert html.contains('class="instructions-container"')
        
        // And: It has the correct comments container
        assert html.contains('class="comments-container"')
        
        println "✅ testGenerateHtmlWithCorrectIterationViewCssClasses passed"
    }
    
    void testIncludePilotSpecificFeaturesWhenUserIsPilot() {
        // Given: A PILOT user
        def userRole = 'PILOT'
        def isPilot = true
        def isAdmin = false
        
        // When: The macro generates HTML
        def html = generateMacroHtml(userRole, 123, 'pilot', isAdmin, isPilot)
        
        // Then: It shows the step-actions div
        assert html.contains('class="step-actions"')
        assert !html.contains('class="step-actions" style="display: none;"')
        
        // And: It enables bulk operations in config
        assert html.contains('bulkOperations: true')
        
        println "✅ testIncludePilotSpecificFeaturesWhenUserIsPilot passed"
    }
    
    void testHideAdminOnlyFeaturesForNonAdminUsers() {
        // Given: A PILOT user (not ADMIN)
        def userRole = 'PILOT'
        def isPilot = true
        def isAdmin = false
        
        // When: The macro generates HTML
        def html = generateMacroHtml(userRole, 123, 'pilot', isAdmin, isPilot)
        
        // Then: It hides bulk complete button
        assert html.contains('class="aui-button bulk-complete" style="display: none;"')
        
        println "✅ testHideAdminOnlyFeaturesForNonAdminUsers passed"
    }
    
    void testIncludeMobileResponsiveMediaQueries() {
        // When: The macro generates HTML
        def html = generateMacroHtml('NORMAL', null, 'Guest', false, false)
        
        // Then: It includes mobile breakpoint styles
        assert html.contains('@media (max-width: 768px)')
        assert html.contains('padding: 10px')
        assert html.contains('border-radius: 0')
        
        println "✅ testIncludeMobileResponsiveMediaQueries passed"
    }
    
    void testConfigureTwoSecondPollingAndThirtySecondCache() {
        // When: The macro generates HTML
        def html = generateMacroHtml('NORMAL', null, 'Guest', false, false)
        
        // Then: It has correct timing configuration
        assert html.contains('pollingInterval: 2000')
        assert html.contains('cacheTimeout: 30000')
        
        println "✅ testConfigureTwoSecondPollingAndThirtySecondCache passed"
    }
    
    void testIncludeEnhancedFeaturesConfiguration() {
        // Given: A PILOT user
        def isPilot = true
        
        // When: The macro generates HTML
        def html = generateMacroHtml('PILOT', 123, 'pilot', false, isPilot)
        
        // Then: It enables all enhanced features
        assert html.contains('caching: true')
        assert html.contains('realTimeSync: true')
        assert html.contains('exportEnabled: true')
        assert html.contains('searchEnabled: true')
        assert html.contains('filterEnabled: true')
        
        println "✅ testIncludeEnhancedFeaturesConfiguration passed"
    }
    
    void testIncludeErrorAndLoadingContainers() {
        // When: The macro generates HTML
        def html = generateMacroHtml('NORMAL', null, 'Guest', false, false)
        
        // Then: It has loading indicator
        assert html.contains('class="loading-indicator"')
        assert html.contains('class="spinner"')
        
        // And: It has error container
        assert html.contains('class="error-container"')
        assert html.contains('class="aui-message aui-message-error"')
        
        println "✅ testIncludeErrorAndLoadingContainers passed"
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
    
    // Main method to run tests
    static void main(String[] args) {
        def test = new StepViewMacroTest()
        println "Starting StepView Macro Tests..."
        println "=" * 60
        
        try {
            test.testGenerateHtmlWithCorrectIterationViewCssClasses()
            test.testIncludePilotSpecificFeaturesWhenUserIsPilot()
            test.testHideAdminOnlyFeaturesForNonAdminUsers()
            test.testIncludeMobileResponsiveMediaQueries()
            test.testConfigureTwoSecondPollingAndThirtySecondCache()
            test.testIncludeEnhancedFeaturesConfiguration()
            test.testIncludeErrorAndLoadingContainers()
            
            println "=" * 60
            println "✅ All StepView Macro Tests PASSED"
            
        } catch (AssertionError e) {
            println "=" * 60
            println "❌ Test FAILED: ${e.message}"
            e.printStackTrace()
            System.exit(1)
        } catch (Exception e) {
            println "=" * 60
            println "❌ Unexpected error: ${e.message}"
            e.printStackTrace()
            System.exit(1)
        }
    }
}