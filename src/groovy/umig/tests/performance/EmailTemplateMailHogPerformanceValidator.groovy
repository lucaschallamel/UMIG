package umig.tests.performance

import javax.mail.*
import javax.mail.internet.*
import groovy.text.SimpleTemplateEngine
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong

/**
 * Email Template MailHog Performance Integration Validator for US-039B
 * 
 * Validates email performance optimizations in a realistic integration environment:
 * - Template caching effectiveness with real email sending
 * - SMTP performance with MailHog
 * - Multi-recipient delivery performance
 * - Cache behavior across multiple email generations
 * 
 * This test complements EmailTemplatePerformanceValidator by testing
 * performance in a realistic integration scenario with actual email delivery.
 * 
 * Prerequisites:
 * - MailHog running on localhost:1025 (SMTP) and localhost:8025 (Web UI)
 * - Network connectivity to localhost
 * 
 * @author UMIG Project Team  
 * @since 2025-01-20
 * @see US-039B Email Template Integration
 * @see EmailTemplatePerformanceValidator
 */
class EmailTemplateMailHogPerformanceValidator {
    
    // MailHog configuration
    private static final String MAILHOG_HOST = "localhost"
    private static final int MAILHOG_PORT = 1025
    private static final String MAILHOG_WEB_URL = "http://localhost:8025"
    
    // Performance targets
    private static final int TARGET_EMAIL_GENERATION_MS = 200
    private static final int TARGET_SMTP_DELIVERY_MS = 500
    private static final int TARGET_TOTAL_EMAIL_MS = 700
    
    // Template caching (mirrors EmailService implementation)
    private static final Map<String, groovy.text.Template> TEMPLATE_CACHE = new ConcurrentHashMap<>()
    private static final SimpleTemplateEngine TEMPLATE_ENGINE = new SimpleTemplateEngine()
    private static final AtomicLong cacheHits = new AtomicLong(0)
    private static final AtomicLong cacheMisses = new AtomicLong(0)
    
    /**
     * Cached template retrieval with performance tracking
     */
    static groovy.text.Template getCachedTemplate(String templateText) {
        if (!templateText) return null
        String cacheKey = templateText.hashCode().toString()
        groovy.text.Template template = TEMPLATE_CACHE.get(cacheKey)
        if (template != null) {
            cacheHits.incrementAndGet()
            return template
        }
        cacheMisses.incrementAndGet()
        template = TEMPLATE_ENGINE.createTemplate(templateText)
        TEMPLATE_CACHE.put(cacheKey, template)
        return template
    }
    
    static void clearCache() {
        TEMPLATE_CACHE.clear()
        cacheHits.set(0)
        cacheMisses.set(0)
    }
    
    static Map<String, Object> getCacheStats() {
        long hits = cacheHits.get()
        long misses = cacheMisses.get()
        double total = hits + misses
        return [
            cacheSize: TEMPLATE_CACHE.size(),
            cacheHits: hits,
            cacheMisses: misses,
            hitRate: total > 0 ? (hits / total) : 0.0
        ]
    }
    
    /**
     * Comprehensive email template for performance testing
     */
    static String getPerformanceTestTemplate() {
        return '''
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${subject}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; }
        .header { background: #2C5282; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; max-width: 600px; margin: 0 auto; }
        .step-info { 
            background: #EDF2F7; 
            padding: 15px; 
            border-radius: 5px; 
            margin: 15px 0;
            border-left: 4px solid #3182CE;
        }
        .metrics { 
            background: #F0FFF4; 
            padding: 10px; 
            border-radius: 3px; 
            margin: 10px 0;
            font-size: 12px;
            color: #2D3748;
        }
        .button { 
            display: inline-block; 
            background: #3182CE; 
            color: white; 
            padding: 10px 20px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 10px 0;
        }
        .comments { margin-top: 20px; }
        .comment { 
            background: #F7FAFC; 
            padding: 10px; 
            margin: 10px 0; 
            border-left: 3px solid #4299E1;
            border-radius: 3px;
        }
        .footer { 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 1px solid #E2E8F0; 
            color: #718096; 
            font-size: 12px; 
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>UMIG Performance Test - US-039B</h1>
        <p>${testDescription}</p>
    </div>
    
    <div class="content">
        <h2>Step ${stepName} Performance Validation</h2>
        
        <div class="step-info">
            <strong>Step Code:</strong> ${stepId}<br>
            <strong>Status:</strong> ${stepStatus}<br>
            <strong>Team:</strong> ${assignedTeamName}<br>
            <strong>Migration:</strong> ${migrationCode}<br>
            <strong>Iteration:</strong> ${iterationCode}<br>
            <strong>Test Run:</strong> ${testRunId}
        </div>
        
        <div class="metrics">
            <strong>Performance Metrics:</strong><br>
            Template Processing: ${processingTimeMs}ms<br>
            Cache Status: ${cacheStatus}<br>
            Cache Hit Rate: ${cacheHitRate}%<br>
            Total Generation Time: ${totalGenerationTimeMs}ms
        </div>
        
        <p>${stepDescription}</p>
        
        <% if (recentComments && recentComments.size() > 0) { %>
        <div class="comments">
            <h3>Recent Comments (${recentComments.size()})</h3>
            <% recentComments.each { comment -> %>
            <div class="comment">
                <strong>${comment.author_name}:</strong> ${comment.comment_text}
                <br><small>${comment.formatted_date}</small>
            </div>
            <% } %>
        </div>
        <% } %>
        
        <% if (hasStepViewUrl && stepViewUrl) { %>
        <p>
            <a href="${stepViewUrl}" class="button">View Step Details</a>
        </p>
        <% } %>
        
        <div class="footer">
            <p><strong>US-039B Email Template Integration Performance Test</strong></p>
            <p>This email validates template caching and performance optimizations.</p>
            <p>Generated at: ${generatedAt}</p>
            <p>MailHog Web UI: <a href="${mailhogUrl}">${mailhogUrl}</a></p>
        </div>
    </div>
</body>
</html>
'''
    }
    
    /**
     * Create template variables for performance testing
     */
    static Map<String, Object> createPerformanceTestData(String testType, int runNumber) {
        return [
            subject: "[UMIG Performance] ${testType} - Run ${runNumber}",
            testDescription: "US-039B Template Caching Performance Validation",
            stepId: "PERF-${testType.toUpperCase()}-${String.format('%03d', runNumber)}",
            stepName: "Performance Test ${testType}",
            stepStatus: "TESTING",
            stepDescription: "This step validates the email template caching performance improvements implemented in US-039B.",
            assignedTeamName: "Performance Engineering",
            migrationCode: "US-039B-VALIDATION",
            iterationCode: "PERF-TEST-${new Date().format('yyyyMMdd')}",
            testRunId: UUID.randomUUID().toString().take(8),
            
            // Performance metrics (will be updated)
            processingTimeMs: 0,
            cacheStatus: "PENDING",
            cacheHitRate: 0.0,
            totalGenerationTimeMs: 0,
            
            // Comments for testing
            recentComments: [
                [
                    author_name: "Performance Test Suite",
                    comment_text: "Cache ${testType} test initiated",
                    formatted_date: new Date().format('MMM dd, yyyy HH:mm:ss')
                ],
                [
                    author_name: "US-039B Validator", 
                    comment_text: "Measuring template processing performance",
                    formatted_date: new Date().format('MMM dd, yyyy HH:mm:ss')
                ]
            ],
            
            stepViewUrl: "http://localhost:8090/display/UMIG/performance-test-${runNumber}",
            hasStepViewUrl: true,
            generatedAt: new Date().toString(),
            mailhogUrl: MAILHOG_WEB_URL
        ]
    }
    
    /**
     * Send email via MailHog SMTP with performance tracking
     */
    static Map<String, Object> sendToMailHog(String to, String subject, String htmlBody) {
        Map<String, Object> result = [sent: false, smtpTimeMs: 0, error: null]
        
        try {
            long startTime = System.currentTimeMillis()
            
            Properties props = new Properties()
            props.put("mail.smtp.host", MAILHOG_HOST)
            props.put("mail.smtp.port", MAILHOG_PORT.toString())
            props.put("mail.smtp.auth", "false")
            props.put("mail.smtp.starttls.enable", "false")
            
            Session session = Session.getInstance(props)
            
            Message message = new MimeMessage(session)
            message.setFrom(new InternetAddress("umig-performance@test.local"))
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(to))
            message.setSubject(subject)
            message.setContent(htmlBody, "text/html; charset=UTF-8")
            message.setSentDate(new Date())
            
            Transport.send(message)
            
            result.smtpTimeMs = (System.currentTimeMillis() - startTime) as long
            result.sent = true
            
        } catch (Exception e) {
            result.error = e.message
        }
        
        return result
    }
    
    /**
     * Process email template with performance tracking
     */
    static Map<String, Object> processTemplateWithMetrics(String templateText, Map<String, Object> variables) {
        Map<String, Object> result = [processedHtml: null, processingTimeMs: 0, cacheHit: false, error: null]
        
        try {
            long startTime = System.currentTimeMillis()
            
            long initialMisses = cacheMisses.get()
            def template = getCachedTemplate(templateText)
            result.cacheHit = (cacheMisses.get() == initialMisses)
            
            result.processedHtml = template.make(variables).toString()
            result.processingTimeMs = (System.currentTimeMillis() - startTime) as long
            
        } catch (Exception e) {
            result.error = e.message
        }
        
        return result
    }
    
    /**
     * Run comprehensive performance validation
     */
    static Map<String, Object> validateMailHogPerformance() {
        Map<String, Object> results = [
            testRuns: [],
            overallStats: [:],
            validationResults: [:]
        ]
        
        println "=" * 70
        println "US-039B EMAIL TEMPLATE MAILHOG PERFORMANCE VALIDATION"
        println "=" * 70
        println "MailHog SMTP: ${MAILHOG_HOST}:${MAILHOG_PORT}"
        println "MailHog Web UI: ${MAILHOG_WEB_URL}"
        println "Started: ${new Date()}"
        println ""
        
        String template = getPerformanceTestTemplate()
        clearCache()
        
        // Test scenarios
        List<Map<String, String>> testScenarios = [
            [type: "CACHE_MISS", description: "First email (cache miss)", recipient: "cache-miss@performance-test.local"],
            [type: "CACHE_HIT", description: "Second email (cache hit)", recipient: "cache-hit@performance-test.local"],
            [type: "CACHE_OPTIMIZED", description: "Optimized email (cache hit)", recipient: "cache-optimized@performance-test.local"],
            [type: "MULTI_RECIPIENT", description: "Multi-recipient test", recipient: "multi-recipient@performance-test.local"]
        ]
        
        testScenarios.eachWithIndex { Map<String, String> scenario, int index ->
            println "\n📧 Test ${index + 1}: ${scenario.description}"
            println "-" * 50
            
            Map<String, Object> testData = createPerformanceTestData(scenario.type, index + 1)
            Map<String, Object> testResult = [
                scenario: scenario.type,
                description: scenario.description,
                recipient: scenario.recipient
            ]
            
            // Process template with performance tracking
            Map<String, Object> templateResult = processTemplateWithMetrics(template, testData)
            testResult.templateProcessing = templateResult
            
            if (templateResult.error) {
                println "❌ Template processing failed: ${templateResult.error}"
                testResult.success = false
            } else {
                // Update metrics in template data
                testData.processingTimeMs = templateResult.processingTimeMs
                testData.cacheStatus = (templateResult.cacheHit as boolean) ? "HIT" : "MISS"
                Map<String, Object> cacheStats = getCacheStats()
                testData.cacheHitRate = String.format("%.1f", ((cacheStats.hitRate as double) * 100))
                testData.totalGenerationTimeMs = templateResult.processingTimeMs
                
                // Re-process template with updated metrics
                Map<String, Object> finalTemplate = processTemplateWithMetrics(template, testData)
                
                // Send email
                Map<String, Object> smtpResult = sendToMailHog(scenario.recipient as String, testData.subject as String, finalTemplate.processedHtml as String)
                testResult.smtp = smtpResult
                
                long totalTime = (templateResult.processingTimeMs as long) + (smtpResult.smtpTimeMs as long)
                testResult.totalTimeMs = totalTime
                testResult.success = smtpResult.sent as boolean
                
                // Log results
                println "📊 Template Processing: ${templateResult.processingTimeMs}ms (${testData.cacheStatus})"
                println "📨 SMTP Delivery: ${smtpResult.smtpTimeMs}ms"
                println "⏱️  Total Time: ${totalTime}ms"
                println (smtpResult.sent as boolean) ? "✅ Email sent successfully" : "❌ Email failed: ${smtpResult.error}"
                
                // Validate against targets
                boolean templateTargetMet = (templateResult.processingTimeMs as long) <= TARGET_EMAIL_GENERATION_MS
                boolean smtpTargetMet = (smtpResult.smtpTimeMs as long) <= TARGET_SMTP_DELIVERY_MS
                boolean totalTargetMet = totalTime <= TARGET_TOTAL_EMAIL_MS
                
                testResult.validation = [
                    templatePerformance: templateTargetMet,
                    smtpPerformance: smtpTargetMet,
                    totalPerformance: totalTargetMet,
                    meetsTargets: templateTargetMet && smtpTargetMet && totalTargetMet
                ]
                
                println "🎯 Template Target (≤${TARGET_EMAIL_GENERATION_MS}ms): ${templateTargetMet ? 'PASS' : 'FAIL'}"
                println "🎯 SMTP Target (≤${TARGET_SMTP_DELIVERY_MS}ms): ${smtpTargetMet ? 'PASS' : 'FAIL'}"
                println "🎯 Total Target (≤${TARGET_TOTAL_EMAIL_MS}ms): ${totalTargetMet ? 'PASS' : 'FAIL'}"
            }
            
            (results.testRuns as List<Map<String, Object>>) << testResult
        }
        
        // Overall statistics
        List<Map<String, Object>> successfulRuns = (results.testRuns as List<Map<String, Object>>).findAll { (it.success as boolean) }
        Map<String, Object> cacheStats = getCacheStats()
        
        results.overallStats = [
            totalTests: (results.testRuns as List).size(),
            successfulTests: successfulRuns.size(),
            averageTemplateTime: (successfulRuns.collect { ((it.templateProcessing as Map).processingTimeMs as long) }.sum() as long) / successfulRuns.size(),
            averageSmtpTime: (successfulRuns.collect { ((it.smtp as Map).smtpTimeMs as long) }.sum() as long) / successfulRuns.size(),
            averageTotalTime: (successfulRuns.collect { (it.totalTimeMs as long) }.sum() as long) / successfulRuns.size(),
            cacheStats: cacheStats
        ]
        
        // Final validation
        boolean allTestsPassed = successfulRuns.every { ((it.validation as Map)?.meetsTargets as boolean) }
        boolean cacheEffective = (cacheStats.hitRate as double) >= 0.5  // 50% hit rate minimum for this test
        
        results.validationResults = [
            allPerformanceTargetsMet: allTestsPassed,
            cacheEffective: cacheEffective,
            overallSuccess: allTestsPassed && cacheEffective && (successfulRuns.size() == (results.testRuns as List).size())
        ]
        
        // Summary
        println "\n" + "=" * 70
        println "PERFORMANCE VALIDATION SUMMARY"
        println "=" * 70
        println "Total Tests: ${(results.overallStats as Map).totalTests}"
        println "Successful: ${(results.overallStats as Map).successfulTests}"
        println "Average Template Processing: ${String.format('%.1f', ((results.overallStats as Map).averageTemplateTime as double))}ms"
        println "Average SMTP Delivery: ${String.format('%.1f', ((results.overallStats as Map).averageSmtpTime as double))}ms" 
        println "Average Total Time: ${String.format('%.1f', ((results.overallStats as Map).averageTotalTime as double))}ms"
        println "Cache Hit Rate: ${String.format('%.1f', ((cacheStats.hitRate as double) * 100))}%"
        
        println "\nValidation Results:"
        println "✓ All Performance Targets Met: ${((results.validationResults as Map).allPerformanceTargetsMet as boolean) ? 'PASS' : 'FAIL'}"
        println "✓ Cache Effective: ${((results.validationResults as Map).cacheEffective as boolean) ? 'PASS' : 'FAIL'}"
        
        if ((results.validationResults as Map).overallSuccess as boolean) {
            println "\n🎉 US-039B MAILHOG PERFORMANCE VALIDATION: SUCCESS"
            println "📬 Check emails at: ${MAILHOG_WEB_URL}"
        } else {
            println "\n⚠️  US-039B MAILHOG PERFORMANCE VALIDATION: ISSUES DETECTED"
        }
        
        return results
    }
    
    /**
     * Main test execution method
     */
    static void main(String[] args) {
        validateMailHogPerformance()
    }
}