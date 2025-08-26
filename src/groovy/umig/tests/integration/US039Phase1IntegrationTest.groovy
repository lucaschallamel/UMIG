package umig.tests.integration

import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.test.GroovyTestCase
import umig.utils.DatabaseUtil
import umig.utils.StepContentFormatter
import umig.utils.EnhancedEmailService
import java.util.UUID

/**
 * Integration tests for US-039 Phase 1: Enhanced Email Notifications with Mobile Templates
 * 
 * Tests the complete flow from content formatting through mobile-responsive email generation
 * 
 * @since 2025-08-26 US-039 Phase 1
 */
class US039Phase1IntegrationTest extends GroovyTestCase {
    
    void testStepContentFormatterHealthCheck() {
        println "=== Testing StepContentFormatter Health Check ==="
        
        def healthCheck = StepContentFormatter.healthCheck()
        
        assert healthCheck != null
        assert healthCheck.service == 'StepContentFormatter'
        assert healthCheck.status == 'healthy'
        assert healthCheck.capabilities != null
        assert healthCheck.capabilities.contentFormatting == true
        assert healthCheck.capabilities.htmlSanitization == true
        assert healthCheck.capabilities.instructionRetrieval == true
        assert healthCheck.capabilities.mobileOptimization == true
        
        println "✅ StepContentFormatter health check passed"
    }
    
    void testBasicContentFormatting() {
        println "=== Testing Basic Content Formatting ==="
        
        def testStepInstance = [
            sti_id: UUID.randomUUID(),
            sti_name: 'Test Step Instance',
            sti_description: 'This is a test step description with **bold text** and *italic text*',
            sti_duration_minutes: 45,
            stm_id: UUID.randomUUID(),
            stm_name: 'Test Master Step',
            stm_description: 'Master step description',
            owner_team_name: 'Test Team',
            environment_name: 'Development'
        ]
        
        def stepViewUrl = 'https://confluence.example.com/display/UMIG/step/123'
        
        def contentResult = StepContentFormatter.formatStepContentForEmail(testStepInstance, stepViewUrl)
        
        assert contentResult != null
        assert contentResult.stepDescription != null
        assert contentResult.stepDescription.contains('<strong>bold text</strong>')
        assert contentResult.stepDescription.contains('<em>italic text</em>')
        assert contentResult.instructionsHtml != null
        assert contentResult.instructionsCount >= 0
        assert contentResult.viewMoreUrl == stepViewUrl
        assert contentResult.estimatedDuration != null
        
        println "✅ Basic content formatting passed"
        println "   - Step description formatted: ${contentResult.stepDescription.length()} chars"
        println "   - Instructions HTML generated: ${contentResult.instructionsHtml.length()} chars"
        println "   - Estimated duration: ${contentResult.estimatedDuration}"
    }
    
    void testHtmlSanitization() {
        println "=== Testing HTML Sanitization ==="
        
        def unsafeContent = '''
            <script>alert('xss')</script>
            <div onclick="malicious()">Click me</div>
            <p style="color: red;">Some content</p>
            **Bold text** and *italic text*
            - Bullet point 1
            - Bullet point 2
        '''
        
        def sanitized = StepContentFormatter.sanitizeHtml(unsafeContent)
        
        assert sanitized != null
        assert !sanitized.contains('<script>')
        assert !sanitized.contains('onclick=')
        assert !sanitized.contains('style=')
        assert sanitized.contains('<strong>Bold text</strong>')
        assert sanitized.contains('<em>italic text</em>')
        assert sanitized.contains('• Bullet point 1')
        assert sanitized.contains('• Bullet point 2')
        
        println "✅ HTML sanitization passed"
        println "   - Script tags removed: ${!sanitized.contains('<script>')}"
        println "   - Event handlers removed: ${!sanitized.contains('onclick=')}"
        println "   - Unsafe styles removed: ${!sanitized.contains('style=')}"
        println "   - Markdown formatting preserved: ${sanitized.contains('<strong>')}"
    }
    
    void testStepMetadataFormatting() {
        println "=== Testing Step Metadata Formatting ==="
        
        def testStepInstance = [
            owner_team_name: 'Infrastructure Team',
            environment_name: 'Production',
            sti_duration_minutes: 90
        ]
        
        def metadata = StepContentFormatter.formatStepMetadata(testStepInstance)
        
        assert metadata != null
        assert metadata.contains('👥 Infrastructure Team')
        assert metadata.contains('🌐 Production') 
        assert metadata.contains('⏱️ 1h 30m')
        
        println "✅ Step metadata formatting passed"
        println "   - Metadata: ${metadata}"
    }
    
    void testEnhancedEmailServiceHealthCheck() {
        println "=== Testing EnhancedEmailService Health Check ==="
        
        def healthCheck = EnhancedEmailService.healthCheck()
        
        assert healthCheck != null
        assert healthCheck.service == 'EnhancedEmailService'
        // Note: Status might be degraded if URL construction config is missing, but that's expected
        assert healthCheck.status in ['healthy', 'degraded']
        assert healthCheck.capabilities != null
        assert healthCheck.capabilities.emailTemplates == true
        assert healthCheck.capabilities.auditLogging == true
        
        println "✅ EnhancedEmailService health check passed"
        println "   - Service status: ${healthCheck.status}"
        println "   - URL construction available: ${healthCheck.capabilities.dynamicUrls}"
    }
    
    void testMobileTemplateVariables() {
        println "=== Testing Mobile Template Variables ==="
        
        def testStepInstance = [
            sti_id: UUID.randomUUID(),
            sti_name: 'Mobile Test Step',
            sti_description: 'Test mobile template variables',
            owner_team_name: 'Mobile Team'
        ]
        
        def contentDetails = StepContentFormatter.formatStepContentForEmail(testStepInstance)
        
        // Verify all expected template variables are present
        assert contentDetails.stepDescription != null
        assert contentDetails.instructionsHtml != null
        assert contentDetails.instructionsCount != null
        assert contentDetails.estimatedDuration != null
        
        def stepMetadata = StepContentFormatter.formatStepMetadata(testStepInstance)
        assert stepMetadata != null
        assert stepMetadata.contains('👥 Mobile Team')
        
        println "✅ Mobile template variables test passed"
        println "   - All required variables present for mobile templates"
    }
    
    void testContentTruncation() {
        println "=== Testing Content Truncation ==="
        
        // Create a step with very long description
        def longDescription = "Very long description. " * 200 // ~4000 characters
        
        def testStepInstance = [
            sti_id: UUID.randomUUID(),
            sti_name: 'Long Content Test Step',
            sti_description: longDescription,
            stm_id: UUID.randomUUID()
        ]
        
        def contentResult = StepContentFormatter.formatStepContentForEmail(testStepInstance)
        
        assert contentResult != null
        assert contentResult.stepDescription != null
        
        // Content should be truncated if too long (MAX_CONTENT_LENGTH = 2000)
        if (longDescription.length() > 2000) {
            assert contentResult.stepDescription.length() <= 2000 + 10 // Allow for '...' suffix
            assert contentResult.stepDescription.contains('...')
        }
        
        println "✅ Content truncation test passed"
        println "   - Original length: ${longDescription.length()}"
        println "   - Formatted length: ${contentResult.stepDescription.length()}"
    }
    
    // Test runner method
    void testAllUS039Phase1Features() {
        println "\n🚀 Running US-039 Phase 1 Integration Tests"
        println "=" * 60
        
        try {
            testStepContentFormatterHealthCheck()
            testBasicContentFormatting()
            testHtmlSanitization()
            testStepMetadataFormatting()
            testEnhancedEmailServiceHealthCheck()
            testMobileTemplateVariables()
            testContentTruncation()
            
            println "\n" + "=" * 60
            println "✅ ALL US-039 PHASE 1 TESTS PASSED"
            println "📱 Mobile email templates integration ready for testing"
            println "🔄 Enhanced notification flow operational"
            println "📧 Rich content formatting functional"
            println "=" * 60
        } catch (Exception e) {
            println "\n" + "=" * 60
            println "❌ TEST FAILURE: ${e.message}"
            println "📧 US-039 Phase 1 integration incomplete"
            println "=" * 60
            throw e
        }
    }
}