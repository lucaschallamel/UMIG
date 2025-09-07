package umig.tests.performance

import groovy.text.SimpleTemplateEngine
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong

/**
 * Email Template Performance Validator for US-039B
 * 
 * Validates the performance improvements from template caching and 
 * StepInstanceDTO.toTemplateMap() integration optimizations.
 * 
 * Performance Targets:
 * - Template processing: ≤200ms per email generation
 * - Cache hit savings: 80-120ms improvement
 * - Cache hit ratio: >80% in realistic scenarios
 * 
 * This test serves as regression protection for the email performance
 * optimizations implemented in US-039B.
 * 
 * @author UMIG Project Team
 * @since 2025-01-20
 * @see US-039B Email Template Integration
 */
class EmailTemplatePerformanceValidator {
    
    // Performance baselines (in milliseconds)
    private static final int TARGET_PERFORMANCE_MS = 200
    private static final int EXPECTED_CACHE_SAVINGS_MIN_MS = 80
    private static final int EXPECTED_CACHE_SAVINGS_MAX_MS = 120
    private static final double MIN_CACHE_HIT_RATIO = 0.80
    
    // Template cache implementation mirroring EmailService
    private static final Map<String, groovy.text.Template> TEMPLATE_CACHE = new ConcurrentHashMap<>()
    private static final SimpleTemplateEngine TEMPLATE_ENGINE = new SimpleTemplateEngine()
    private static final AtomicLong cacheHits = new AtomicLong(0)
    private static final AtomicLong cacheMisses = new AtomicLong(0)
    
    /**
     * Template caching method (mirrors EmailService implementation)
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
    
    /**
     * Clear cache and reset statistics
     */
    static void clearCache() {
        TEMPLATE_CACHE.clear()
        cacheHits.set(0)
        cacheMisses.set(0)
    }
    
    /**
     * Get cache performance statistics
     */
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
     * Sample email template for testing (based on actual UMIG templates)
     */
    static String getSampleTemplate() {
        return '''
<!DOCTYPE html>
<html>
<head>
    <title>Step Status: ${stepInstance?.sti_name ?: 'Unknown'}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .header { background: #2C5282; color: white; padding: 20px; }
        .content { padding: 20px; }
        .step-info { background: #EDF2F7; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .comments { margin-top: 20px; }
        .comment { background: #F7FAFC; padding: 10px; margin: 10px 0; border-left: 3px solid #4299E1; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Step ${stepInstance?.sti_code ?: ''} Status Update</h1>
    </div>
    
    <div class="content">
        <div class="step-info">
            <strong>Migration:</strong> ${migrationCode ?: 'N/A'}<br>
            <strong>Iteration:</strong> ${iterationCode ?: 'N/A'}<br>
            <strong>Status:</strong> ${stepInstance?.sti_status ?: 'PENDING'}<br>
            <strong>Team:</strong> ${stepInstance?.team_name ?: 'Unassigned'}
        </div>
        
        <p>${stepInstance?.sti_description ?: 'No description available'}</p>
        
        <% if (recentComments && recentComments.size() > 0) { %>
        <div class="comments">
            <h3>Recent Comments</h3>
            <% recentComments.each { comment -> %>
            <div class="comment">
                <strong>${comment.author_name ?: 'Anonymous'}:</strong>
                ${comment.comment_text ?: ''}
                <small>(${comment.formatted_date ?: 'Recent'})</small>
            </div>
            <% } %>
        </div>
        <% } %>
        
        <% if (stepViewUrl) { %>
        <p><a href="${stepViewUrl}">View Step Details</a></p>
        <% } %>
    </div>
</body>
</html>
'''
    }
    
    /**
     * Create sample template variables (simulating StepInstanceDTO.toTemplateMap())
     */
    static Map<String, Object> createSampleTemplateData() {
        return [
            stepInstance: [
                sti_id: UUID.randomUUID(),
                sti_code: "PERF-TEST-001",
                sti_name: "Performance Test Step",
                sti_status: "PENDING",
                sti_description: "Template caching performance validation step",
                team_name: "Platform Team"
            ],
            migrationCode: "Q1-2025-RELEASE",
            iterationCode: "PERFORMANCE-TEST",
            recentComments: [
                [
                    author_name: "Test User",
                    comment_text: "Performance validation in progress",
                    formatted_date: new Date().format('MMM dd, yyyy HH:mm')
                ]
            ],
            stepViewUrl: "http://localhost:8090/step/performance-test"
        ]
    }
    
    /**
     * Run performance validation tests
     */
    static Map<String, Object> validatePerformance() {
        Map<String, Object> results = [:]
        String template = getSampleTemplate()
        
        println "=" * 60
        println "US-039B Email Template Performance Validation"
        println "=" * 60
        
        // Test 1: Baseline performance without caching
        println "\n1. Testing baseline performance (no caching)"
        println "-" * 40
        
        clearCache()
        SimpleTemplateEngine engine = new SimpleTemplateEngine()
        long totalTimeNoCaching = 0
        int iterations = 10
        
        iterations.times { i ->
            Map<String, Object> data = createSampleTemplateData()
            long startTime = System.currentTimeMillis()
            
            groovy.text.Template compiledTemplate = engine.createTemplate(template)
            String output = compiledTemplate.make(data).toString()
            
            long duration = System.currentTimeMillis() - startTime
            totalTimeNoCaching += duration
            
            if (i == 0) {
                println "First run: ${duration}ms (includes JVM warmup)"
            }
        }
        
        double avgNoCaching = (double) totalTimeNoCaching / iterations
        results.baselineAvgMs = avgNoCaching
        println "Average time WITHOUT caching: ${avgNoCaching}ms"
        
        // Test 2: Performance with template caching
        println "\n2. Testing optimized performance (with caching)"
        println "-" * 40
        
        clearCache()
        long totalTimeCaching = 0
        
        iterations.times { i ->
            Map<String, Object> data = createSampleTemplateData()
            long startTime = System.currentTimeMillis()
            
            groovy.text.Template cachedTemplate = getCachedTemplate(template)
            String output = cachedTemplate.make(data).toString()
            
            long duration = System.currentTimeMillis() - startTime
            totalTimeCaching += duration
            
            if (i == 0) {
                println "First run (cache miss): ${duration}ms"
            }
        }
        
        double avgCaching = (double) totalTimeCaching / iterations
        results.optimizedAvgMs = avgCaching
        println "Average time WITH caching: ${avgCaching}ms"
        
        // Cache statistics
        Map<String, Object> cacheStats = getCacheStats()
        results.cacheStats = cacheStats
        println "\nCache Statistics:"
        println "  - Cache Size: ${cacheStats.cacheSize}"
        println "  - Cache Hits: ${cacheStats.cacheHits}"
        println "  - Cache Misses: ${cacheStats.cacheMisses}"
        println "  - Hit Rate: ${String.format('%.1f', (cacheStats.hitRate as double) * 100)}%"
        
        // Performance analysis
        double savings = avgNoCaching - avgCaching
        double percentImprovement = (savings / avgNoCaching) * 100
        results.savingsMs = savings
        results.percentImprovement = percentImprovement
        
        println "\n" + "=" * 60
        println "PERFORMANCE ANALYSIS"
        println "=" * 60
        println "Baseline (no caching): ${avgNoCaching}ms"
        println "Optimized (with caching): ${avgCaching}ms"
        println "Performance Improvement: ${savings}ms (${String.format('%.1f', percentImprovement)}%)"
        
        // Validation against targets
        boolean targetMet = avgCaching <= TARGET_PERFORMANCE_MS
        boolean savingsInRange = savings >= EXPECTED_CACHE_SAVINGS_MIN_MS && savings <= EXPECTED_CACHE_SAVINGS_MAX_MS
        boolean cacheEfficient = (cacheStats.hitRate as double) >= MIN_CACHE_HIT_RATIO
        
        Map<String, Object> validationResults = [
            targetPerformanceMet: targetMet,
            cacheSavingsInRange: savingsInRange,
            cacheEfficient: cacheEfficient,
            overallSuccess: targetMet && savingsInRange && cacheEfficient
        ]
        results.validationResults = validationResults
        
        println "\nValidation Results:"
        println "✓ Target Performance (≤${TARGET_PERFORMANCE_MS}ms): ${targetMet ? 'PASS' : 'FAIL'} (${avgCaching}ms)"
        println "✓ Cache Savings (${EXPECTED_CACHE_SAVINGS_MIN_MS}-${EXPECTED_CACHE_SAVINGS_MAX_MS}ms): ${savingsInRange ? 'PASS' : 'FAIL'} (${savings}ms)"
        println "✓ Cache Efficiency (≥${MIN_CACHE_HIT_RATIO * 100}%): ${cacheEfficient ? 'PASS' : 'FAIL'} (${String.format('%.1f', (cacheStats.hitRate as double) * 100)}%)"
        
        if (validationResults.overallSuccess as boolean) {
            println "\n🎉 US-039B PERFORMANCE VALIDATION: SUCCESS"
        } else {
            println "\n⚠️  US-039B PERFORMANCE VALIDATION: ISSUES DETECTED"
        }
        
        return results
    }
    
    /**
     * Main test execution method
     */
    static void main(String[] args) {
        validatePerformance()
    }
}