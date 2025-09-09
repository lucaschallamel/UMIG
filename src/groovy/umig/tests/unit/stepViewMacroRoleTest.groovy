package umig.tests.unit

/**
 * StepView Macro Role-Based Access Control Test - US-036 Phase 2
 * 
 * Comprehensive test suite for validating role-based access control in StepView Macro,
 * including URL parameter override functionality for testing and PILOT access.
 * Part of US-036: StepView UI Refactoring Phase 2.
 * 
 * Converted from Spock to standard Groovy testing (ADR-036)
 */
class StepViewMacroRoleTest {
    
    static void main(String[] args) {
        StepViewMacroRoleTest test = new StepViewMacroRoleTest()
        
        println "=== StepView Macro Role-Based Access Control Tests ==="
        
        int passed = 0
        int failed = 0
        
        // Run all test methods
        try {
            test.testNormalUserWithNoRoleParameter()
            passed++
        } catch (AssertionError e) {
            failed++
            println "❌ testNormalUserWithNoRoleParameter: ${e.message}"
        }
        
        try {
            test.testPilotUserWithNoRoleParameter()
            passed++
        } catch (AssertionError e) {
            failed++
            println "❌ testPilotUserWithNoRoleParameter: ${e.message}"
        }
        
        try {
            test.testAdminUserWithNoRoleParameter()
            passed++
        } catch (AssertionError e) {
            failed++
            println "❌ testAdminUserWithNoRoleParameter: ${e.message}"
        }
        
        try {
            test.testNormalUserOverrideToPilot()
            passed++
        } catch (AssertionError e) {
            failed++
            println "❌ testNormalUserOverrideToPilot: ${e.message}"
        }
        
        try {
            test.testNormalUserOverrideToAdmin()
            passed++
        } catch (AssertionError e) {
            failed++
            println "❌ testNormalUserOverrideToAdmin: ${e.message}"
        }
        
        try {
            test.testPilotUserOverrideToAdmin()
            passed++
        } catch (AssertionError e) {
            failed++
            println "❌ testPilotUserOverrideToAdmin: ${e.message}"
        }
        
        try {
            test.testInvalidRoleParameters()
            passed++
        } catch (AssertionError e) {
            failed++
            println "❌ testInvalidRoleParameters: ${e.message}"
        }
        
        try {
            test.testRoleDowngradeIgnored()
            passed++
        } catch (AssertionError e) {
            failed++
            println "❌ testRoleDowngradeIgnored: ${e.message}"
        }
        
        try {
            test.testJavaScriptConfigurationForRoles()
            passed++
        } catch (AssertionError e) {
            failed++
            println "❌ testJavaScriptConfigurationForRoles: ${e.message}"
        }
        
        try {
            test.testSecurityWithRoleOverride()
            passed++
        } catch (AssertionError e) {
            failed++
            println "❌ testSecurityWithRoleOverride: ${e.message}"
        }
        
        try {
            test.testTimingConfigurationMatchesIterationView()
            passed++
        } catch (AssertionError e) {
            failed++
            println "❌ testTimingConfigurationMatchesIterationView: ${e.message}"
        }
        
        println "\n=== Test Results ==="
        println "Passed: ${passed}"
        println "Failed: ${failed}"
        println "Total: ${passed + failed}"
        
        if (failed == 0) {
            println "✅ All role-based access control tests passed!"
        } else {
            println "❌ Some tests failed"
            System.exit(1)
        }
    }
    
    void testNormalUserWithNoRoleParameter() {
        // Given: A NORMAL user with no URL role parameter
        String userRole = 'NORMAL'
        int userId = 123
        String username = 'normaluser'
        String roleParam = null
        
        // When: The macro processes role logic
        def (finalRole, isPilot, isAdmin) = processRoleLogic(userRole, roleParam)
        
        // Then: Role remains NORMAL with no elevated privileges
        assert finalRole == 'NORMAL' : "Role should remain NORMAL"
        assert !isPilot : "Should not have pilot privileges"
        assert !isAdmin : "Should not have admin privileges"
        
        // And: Generated HTML restricts PILOT/ADMIN features
        String html = generateMacroHtml(finalRole, userId, username, isAdmin, isPilot)
        assert html.contains('class="step-actions" style="display: none;"') : "Step actions should be hidden for normal users"
        assert html.contains('bulkOperations: false') : "Bulk operations should be disabled"
        
        println "✅ testNormalUserWithNoRoleParameter passed"
    }
    
    void testPilotUserWithNoRoleParameter() {
        // Given: A PILOT user with no URL role parameter
        String userRole = 'PILOT'
        int userId = 456
        String username = 'pilotuser'
        String roleParam = null
        
        // When: The macro processes role logic
        def (finalRole, isPilot, isAdmin) = processRoleLogic(userRole, roleParam)
        
        // Then: Role remains PILOT with PILOT privileges
        assert finalRole == 'PILOT' : "Role should remain PILOT"
        assert isPilot : "Should have pilot privileges"
        assert !isAdmin : "Should not have admin privileges"
        
        // And: Generated HTML enables PILOT features but not ADMIN
        String html = generateMacroHtml(finalRole, userId, username, isAdmin, isPilot)
        assert html.contains('class="step-actions"') : "Should contain step-actions"
        assert !html.contains('class="step-actions" style="display: none;"') : "Step actions should be visible for pilots"
        assert html.contains('bulkOperations: true') : "Bulk operations should be enabled"
        assert html.contains('class="aui-button bulk-complete" style="display: none;"') : "Bulk complete should be hidden (ADMIN only)"
        
        println "✅ testPilotUserWithNoRoleParameter passed"
    }
    
    void testAdminUserWithNoRoleParameter() {
        // Given: An ADMIN user with no URL role parameter
        String userRole = 'ADMIN'
        int userId = 789
        String username = 'adminuser'
        String roleParam = null
        
        // When: The macro processes role logic
        def (finalRole, isPilot, isAdmin) = processRoleLogic(userRole, roleParam)
        
        // Then: Role remains ADMIN with all privileges
        assert finalRole == 'ADMIN' : "Role should remain ADMIN"
        assert isPilot : "ADMIN should imply PILOT privileges"
        assert isAdmin : "Should have admin privileges"
        
        // And: Generated HTML enables all features including ADMIN-only
        String html = generateMacroHtml(finalRole, userId, username, isAdmin, isPilot)
        assert html.contains('class="step-actions"') : "Should contain step-actions"
        assert !html.contains('class="step-actions" style="display: none;"') : "Step actions should be visible for admins"
        assert html.contains('bulkOperations: true') : "Bulk operations should be enabled"
        assert !html.contains('class="aui-button bulk-complete" style="display: none;"') : "Bulk complete should be visible for admins"
        
        println "✅ testAdminUserWithNoRoleParameter passed"
    }
    
    void testNormalUserOverrideToPilot() {
        // Given: A NORMAL user with PILOT role parameter
        String userRole = 'NORMAL'
        int userId = 123
        String username = 'normaluser'
        String roleParam = 'PILOT'
        
        // When: The macro processes role logic
        def (finalRole, isPilot, isAdmin) = processRoleLogic(userRole, roleParam)
        
        // Then: Role is overridden to PILOT
        assert finalRole == 'PILOT' : "Role should be overridden to PILOT"
        assert isPilot : "Should have pilot privileges"
        assert !isAdmin : "Should not have admin privileges"
        
        // And: Generated HTML reflects PILOT privileges
        String html = generateMacroHtml(finalRole, userId, username, isAdmin, isPilot)
        assert html.contains('bulkOperations: true') : "Bulk operations should be enabled"
        assert html.contains('role: \'PILOT\'') : "Role should be PILOT in config"
        assert html.contains('isPilot: true') : "isPilot should be true"
        assert html.contains('isAdmin: false') : "isAdmin should be false"
        
        println "✅ testNormalUserOverrideToPilot passed"
    }
    
    void testNormalUserOverrideToAdmin() {
        // Given: A NORMAL user with ADMIN role parameter
        String userRole = 'NORMAL'
        int userId = 123
        String username = 'normaluser'
        String roleParam = 'ADMIN'
        
        // When: The macro processes role logic
        def (finalRole, isPilot, isAdmin) = processRoleLogic(userRole, roleParam)
        
        // Then: Role is overridden to ADMIN
        assert finalRole == 'ADMIN' : "Role should be overridden to ADMIN"
        assert isPilot : "ADMIN should imply PILOT privileges"
        assert isAdmin : "Should have admin privileges"
        
        // And: Generated HTML reflects ADMIN privileges
        String html = generateMacroHtml(finalRole, userId, username, isAdmin, isPilot)
        assert html.contains('bulkOperations: true') : "Bulk operations should be enabled"
        assert html.contains('role: \'ADMIN\'') : "Role should be ADMIN in config"
        assert html.contains('isPilot: true') : "isPilot should be true"
        assert html.contains('isAdmin: true') : "isAdmin should be true"
        
        println "✅ testNormalUserOverrideToAdmin passed"
    }
    
    void testPilotUserOverrideToAdmin() {
        // Given: A PILOT user with ADMIN role parameter
        String userRole = 'PILOT'
        int userId = 456
        String username = 'pilotuser'
        String roleParam = 'ADMIN'
        
        // When: The macro processes role logic
        def (finalRole, isPilot, isAdmin) = processRoleLogic(userRole, roleParam)
        
        // Then: Role is overridden to ADMIN
        assert finalRole == 'ADMIN' : "Role should be overridden to ADMIN"
        assert isPilot : "Should maintain pilot privileges"
        assert isAdmin : "Should have admin privileges"
        
        // And: Generated HTML shows ADMIN capabilities
        String html = generateMacroHtml(finalRole, userId, username, isAdmin, isPilot)
        assert !html.contains('class="aui-button bulk-complete" style="display: none;"') : "Bulk complete should be visible for admins"
        
        println "✅ testPilotUserOverrideToAdmin passed"
    }
    
    void testInvalidRoleParameters() {
        // Given: A user with invalid role parameter
        String userRole = 'NORMAL'
        int userId = 123
        String username = 'normaluser'
        String roleParam = 'INVALID_ROLE'
        
        // When: The macro processes role logic
        def (finalRole, isPilot, isAdmin) = processRoleLogic(userRole, roleParam)
        
        // Then: Role remains unchanged
        assert finalRole == 'NORMAL' : "Role should remain NORMAL with invalid parameter"
        assert !isPilot : "Should not have pilot privileges"
        assert !isAdmin : "Should not have admin privileges"
        
        println "✅ testInvalidRoleParameters passed"
    }
    
    void testRoleDowngradeIgnored() {
        // Given: An ADMIN user with NORMAL role parameter (attempted downgrade)
        String userRole = 'ADMIN'
        int userId = 789
        String username = 'adminuser'
        String roleParam = 'NORMAL'
        
        // When: The macro processes role logic
        def (finalRole, isPilot, isAdmin) = processRoleLogic(userRole, roleParam)
        
        // Then: Role parameter is ignored (only upgrades allowed)
        assert finalRole == 'ADMIN' : "Role should remain ADMIN (downgrades ignored)"
        assert isPilot : "Should maintain pilot privileges"
        assert isAdmin : "Should maintain admin privileges"
        
        println "✅ testRoleDowngradeIgnored passed"
    }
    
    void testJavaScriptConfigurationForRoles() {
        // When: Different roles generate configuration
        String normalConfig = extractJavaScriptConfig(generateMacroHtml('NORMAL', 123, 'normal', false, false))
        String pilotConfig = extractJavaScriptConfig(generateMacroHtml('PILOT', 456, 'pilot', false, true))
        String adminConfig = extractJavaScriptConfig(generateMacroHtml('ADMIN', 789, 'admin', true, true))
        
        // Then: Each configuration reflects correct permissions
        assert normalConfig.contains('bulkOperations: false') : "Normal user should not have bulk operations"
        assert pilotConfig.contains('bulkOperations: true') : "Pilot user should have bulk operations"
        assert adminConfig.contains('bulkOperations: true') : "Admin user should have bulk operations"
        
        // And: User context is correctly set
        assert normalConfig.contains('role: \'NORMAL\'') : "Normal config should have NORMAL role"
        assert normalConfig.contains('isPilot: false') : "Normal config should have isPilot false"
        assert normalConfig.contains('isAdmin: false') : "Normal config should have isAdmin false"
        
        assert pilotConfig.contains('role: \'PILOT\'') : "Pilot config should have PILOT role"
        assert pilotConfig.contains('isPilot: true') : "Pilot config should have isPilot true"
        assert pilotConfig.contains('isAdmin: false') : "Pilot config should have isAdmin false"
        
        assert adminConfig.contains('role: \'ADMIN\'') : "Admin config should have ADMIN role"
        assert adminConfig.contains('isPilot: true') : "Admin config should have isPilot true"
        assert adminConfig.contains('isAdmin: true') : "Admin config should have isAdmin true"
        
        println "✅ testJavaScriptConfigurationForRoles passed"
    }
    
    void testSecurityWithRoleOverride() {
        // Given: A user with role override
        String userRole = 'NORMAL'
        String roleParam = 'PILOT'
        
        // When: The macro generates HTML
        String html = generateMacroHtml('PILOT', 123, 'normal', false, true)
        
        // Then: No sensitive information is exposed in comments
        assert !html.contains('password') : "Should not contain password"
        assert !html.contains('secret') : "Should not contain secret"
        assert !html.contains('token') : "Should not contain token"
        
        println "✅ testSecurityWithRoleOverride passed"
    }
    
    void testTimingConfigurationMatchesIterationView() {
        // When: The macro generates configuration
        String html = generateMacroHtml('NORMAL', null, 'Guest', false, false)
        
        // Then: Timing matches IterationView standards
        assert html.contains('pollingInterval: 2000') : "Should have 2-second polling interval"
        assert html.contains('cacheTimeout: 30000') : "Should have 30-second cache timeout"
        
        // And: Features are correctly configured
        assert html.contains('caching: true') : "Should have caching enabled"
        assert html.contains('realTimeSync: true') : "Should have real-time sync enabled"
        assert html.contains('exportEnabled: true') : "Should have export enabled"
        assert html.contains('searchEnabled: true') : "Should have search enabled"
        assert html.contains('filterEnabled: true') : "Should have filter enabled"
        
        println "✅ testTimingConfigurationMatchesIterationView passed"
    }
    
    // Helper methods
    private List processRoleLogic(String userRole, String roleParam) {
        String finalRole = userRole
        boolean isPilot = userRole == 'PILOT' || userRole == 'ADMIN'
        boolean isAdmin = userRole == 'ADMIN'
        
        // Override with URL parameter if provided (for testing/pilot access)
        // Only allow upgrades, not downgrades
        if (roleParam in ['PILOT', 'ADMIN']) {
            // Only upgrade if current role is lower
            if (roleParam == 'PILOT' && userRole == 'NORMAL') {
                finalRole = 'PILOT'
                isPilot = true
                isAdmin = false
            } else if (roleParam == 'ADMIN' && userRole != 'ADMIN') {
                finalRole = 'ADMIN'
                isPilot = true
                isAdmin = true
            }
        }
        
        return [finalRole, isPilot, isAdmin]
    }
    
    private String generateMacroHtml(String userRole, Integer userId, String username, boolean isAdmin, boolean isPilot) {
        String restApiBase = "/rest/scriptrunner/latest/custom/web"
        
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
        int startIndex = html.indexOf('window.UMIG_STEP_CONFIG = {')
        int endIndex = html.indexOf('};', startIndex) + 2
        return html.substring(startIndex, endIndex)
    }
}