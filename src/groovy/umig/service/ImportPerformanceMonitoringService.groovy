package umig.service

import groovy.json.JsonBuilder
import groovy.sql.Sql
import umig.utils.DatabaseUtil
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import java.util.concurrent.*
import java.util.concurrent.atomic.AtomicLong
import java.util.concurrent.atomic.AtomicInteger
import java.lang.management.ManagementFactory
import java.lang.management.MemoryMXBean
import java.lang.management.GarbageCollectorMXBean

/**
 * Import Performance Monitoring Service for US-034
 * Provides comprehensive performance metrics, monitoring, and alerting for import operations
 * 
 * Key Features:
 * - Real-time performance monitoring
 * - Memory usage tracking and alerts  
 * - Import throughput analysis
 * - Performance trend analysis
 * - Automatic performance tuning recommendations
 * - JVM metrics collection
 * - Performance alerting thresholds
 * 
 * @author UMIG Development Team
 * @since Sprint 6 - US-034 Performance Enhancement
 */
class ImportPerformanceMonitoringService {
    
    private static final Logger log = LoggerFactory.getLogger(ImportPerformanceMonitoringService.class)
    
    // Performance thresholds
    private static final double MIN_ACCEPTABLE_THROUGHPUT = 100.0 // records per second
    private static final long MAX_ACCEPTABLE_MEMORY = 500 * 1024 * 1024 // 500MB
    private static final long MAX_ACCEPTABLE_RESPONSE_TIME = 30000 // 30 seconds
    private static final double MAX_ERROR_RATE = 0.05 // 5%
    
    // Monitoring state
    private final AtomicLong totalOperations = new AtomicLong(0)
    private final AtomicLong totalProcessingTime = new AtomicLong(0)
    private final AtomicInteger totalRecords = new AtomicInteger(0)
    private final AtomicInteger totalErrors = new AtomicInteger(0)
    private final AtomicLong peakMemoryUsage = new AtomicLong(0)
    
    // Performance history (sliding window)
    private final ConcurrentLinkedQueue<PerformanceSample> performanceHistory = new ConcurrentLinkedQueue<>()
    private final int MAX_HISTORY_SIZE = 1000
    
    // JVM monitoring
    private final MemoryMXBean memoryMBean = ManagementFactory.getMemoryMXBean()
    private final List<GarbageCollectorMXBean> gcMBeans = ManagementFactory.getGarbageCollectorMXBeans()
    
    // Alert callbacks
    private final List<PerformanceAlertListener> alertListeners = []
    
    /**
     * Performance sample data point
     */
    static class PerformanceSample {
        long timestamp
        String operation
        int recordsProcessed
        long processingTimeMs
        long memoryUsedMB
        int errorCount
        double throughput
        Map<String, Object> additionalMetrics
        
        PerformanceSample(String operation, int recordsProcessed, long processingTimeMs, long memoryUsedMB, int errorCount) {
            this.timestamp = System.currentTimeMillis()
            this.operation = operation
            this.recordsProcessed = recordsProcessed
            this.processingTimeMs = processingTimeMs
            this.memoryUsedMB = memoryUsedMB
            this.errorCount = errorCount
            this.throughput = processingTimeMs > 0 ? (recordsProcessed * 1000.0) / processingTimeMs : 0.0
            this.additionalMetrics = [:]
        }
    }
    
    /**
     * Performance alert listener interface
     */
    static interface PerformanceAlertListener {
        void onPerformanceAlert(PerformanceAlert alert)
    }
    
    /**
     * Performance alert data
     */
    static class PerformanceAlert {
        String type
        String severity
        String message
        Map<String, Object> metrics
        long timestamp
        String recommendation
        
        PerformanceAlert(String type, String severity, String message, Map<String, Object> metrics, String recommendation) {
            this.type = type
            this.severity = severity
            this.message = message
            this.metrics = metrics
            this.recommendation = recommendation
            this.timestamp = System.currentTimeMillis()
        }
    }
    
    /**
     * Comprehensive performance metrics
     */
    static class ImportPerformanceMetrics {
        // Basic metrics
        long totalOperations
        long totalProcessingTimeMs
        int totalRecords
        int totalErrors
        double averageThroughput
        double errorRate
        
        // Memory metrics
        long currentMemoryUsageMB
        long peakMemoryUsageMB
        long availableMemoryMB
        
        // JVM metrics
        long totalGCTime
        int gcCount
        double cpuUsage
        
        // Trend analysis
        double throughputTrend
        double memoryTrend
        List<String> recommendations
        
        // Time-based metrics
        double recordsPerSecond
        double operationsPerMinute
        
        Map toMap() {
            return [
                totalOperations: totalOperations,
                totalProcessingTimeMs: totalProcessingTimeMs,
                totalRecords: totalRecords,
                totalErrors: totalErrors,
                averageThroughput: averageThroughput,
                errorRate: errorRate,
                currentMemoryUsageMB: currentMemoryUsageMB,
                peakMemoryUsageMB: peakMemoryUsageMB,
                availableMemoryMB: availableMemoryMB,
                totalGCTime: totalGCTime,
                gcCount: gcCount,
                cpuUsage: cpuUsage,
                throughputTrend: throughputTrend,
                memoryTrend: memoryTrend,
                recordsPerSecond: recordsPerSecond,
                operationsPerMinute: operationsPerMinute,
                recommendations: recommendations
            ]
        }
    }
    
    ImportPerformanceMonitoringService() {
        log.info("Import Performance Monitoring Service initialized")
        
        // Start background monitoring
        startBackgroundMonitoring()
    }
    
    /**
     * Record a performance sample for an import operation
     */
    void recordPerformanceSample(String operation, int recordsProcessed, long processingTimeMs, int errorCount = 0) {
        long memoryUsedMB = getCurrentMemoryUsageMB()
        
        PerformanceSample sample = new PerformanceSample(operation, recordsProcessed, processingTimeMs, memoryUsedMB, errorCount)
        
        // Update global counters
        totalOperations.incrementAndGet()
        totalProcessingTime.addAndGet(processingTimeMs)
        totalRecords.addAndGet(recordsProcessed)
        totalErrors.addAndGet(errorCount)
        peakMemoryUsage.updateAndGet { current -> Math.max(current, memoryUsedMB * 1024 * 1024) }
        
        // Add to history with size limit
        performanceHistory.offer(sample)
        while (performanceHistory.size() > MAX_HISTORY_SIZE) {
            performanceHistory.poll()
        }
        
        // Check for performance alerts
        checkPerformanceAlerts(sample)
        
        log.debug("Performance sample recorded: ${operation} - ${recordsProcessed} records in ${processingTimeMs}ms (${sample.throughput} records/sec)")
    }
    
    /**
     * Get comprehensive performance metrics
     */
    ImportPerformanceMetrics getPerformanceMetrics() {
        ImportPerformanceMetrics metrics = new ImportPerformanceMetrics()
        
        // Basic metrics
        metrics.totalOperations = totalOperations.get()
        metrics.totalProcessingTimeMs = totalProcessingTime.get()
        metrics.totalRecords = totalRecords.get()
        metrics.totalErrors = totalErrors.get()
        
        // Calculate rates
        if (metrics.totalProcessingTimeMs > 0) {
            metrics.averageThroughput = (metrics.totalRecords * 1000.0) / metrics.totalProcessingTimeMs
            metrics.recordsPerSecond = metrics.averageThroughput
        } else {
            metrics.averageThroughput = 0
            metrics.recordsPerSecond = 0
        }
        
        if (metrics.totalRecords > 0) {
            metrics.errorRate = metrics.totalErrors / (double) metrics.totalRecords
        } else {
            metrics.errorRate = 0
        }
        
        // Memory metrics
        metrics.currentMemoryUsageMB = getCurrentMemoryUsageMB()
        metrics.peakMemoryUsageMB = (peakMemoryUsage.get() / 1024 / 1024) as Long
        metrics.availableMemoryMB = getAvailableMemoryMB()
        
        // JVM metrics
        Map jvmMetrics = getJVMMetrics()
        metrics.totalGCTime = jvmMetrics.totalGCTime as Long
        metrics.gcCount = jvmMetrics.gcCount as Integer
        metrics.cpuUsage = jvmMetrics.cpuUsage as Double
        
        // Trend analysis
        Map trends = analyzeTrends()
        metrics.throughputTrend = trends.throughputTrend as Double
        metrics.memoryTrend = trends.memoryTrend as Double
        
        // Generate recommendations
        metrics.recommendations = generateRecommendations(metrics)
        
        // Time-based calculations
        if (metrics.totalOperations > 0) {
            long timeSpanMs = getTimeSpanMs()
            if (timeSpanMs > 0) {
                metrics.operationsPerMinute = (metrics.totalOperations * 60000.0) / timeSpanMs
            }
        }
        
        return metrics
    }
    
    /**
     * Get recent performance trends for specific time window
     */
    Map getPerformanceTrends(int minutesBack = 10) {
        long cutoffTime = System.currentTimeMillis() - (minutesBack * 60 * 1000)
        
        List<PerformanceSample> recentSamples = performanceHistory.findAll { sample ->
            sample.timestamp >= cutoffTime
        }.toList()
        
        if (recentSamples.isEmpty()) {
            return [
                samplesCount: 0,
                averageThroughput: 0,
                averageMemoryUsageMB: 0,
                totalRecords: 0,
                totalErrors: 0,
                trend: "INSUFFICIENT_DATA"
            ]
        }
        
        // Calculate averages
        double avgThroughput = (recentSamples.collect { it.throughput }.sum() as Number).doubleValue() / recentSamples.size()
        double avgMemory = (recentSamples.collect { it.memoryUsedMB }.sum() as Number).doubleValue() / recentSamples.size()
        int totalRecentRecords = (recentSamples.collect { it.recordsProcessed }.sum() as Number).intValue()
        int totalRecentErrors = (recentSamples.collect { it.errorCount }.sum() as Number).intValue()
        
        // Determine trend direction
        String trend = determineTrendDirection(recentSamples)
        
        return [
            samplesCount: recentSamples.size(),
            averageThroughput: avgThroughput,
            averageMemoryUsageMB: avgMemory,
            totalRecords: totalRecentRecords,
            totalErrors: totalRecentErrors,
            errorRate: totalRecentRecords > 0 ? (totalRecentErrors / (double) totalRecentRecords) : 0,
            trend: trend,
            timeWindowMinutes: minutesBack
        ]
    }
    
    /**
     * Get performance recommendations based on current metrics
     */
    List<String> getPerformanceRecommendations() {
        ImportPerformanceMetrics metrics = getPerformanceMetrics()
        return generateRecommendations(metrics)
    }
    
    /**
     * Check if performance is within acceptable thresholds
     */
    Map checkPerformanceHealth() {
        ImportPerformanceMetrics metrics = getPerformanceMetrics()
        List<String> issues = []
        String healthStatus = "HEALTHY"
        
        // Check throughput
        if (metrics.averageThroughput < MIN_ACCEPTABLE_THROUGHPUT && metrics.totalRecords > 100) {
            issues << "Low throughput: ${metrics.averageThroughput} records/sec (min: ${MIN_ACCEPTABLE_THROUGHPUT})".toString()
            healthStatus = "WARNING"
        }
        
        // Check memory usage
        if (metrics.currentMemoryUsageMB * 1024 * 1024 > MAX_ACCEPTABLE_MEMORY) {
            issues << "High memory usage: ${metrics.currentMemoryUsageMB}MB (max: ${MAX_ACCEPTABLE_MEMORY / 1024 / 1024}MB)".toString()
            healthStatus = "WARNING"
        }
        
        // Check error rate
        if (metrics.errorRate > MAX_ERROR_RATE && metrics.totalRecords > 10) {
            issues << "High error rate: ${(metrics.errorRate * 100).round(2)}% (max: ${MAX_ERROR_RATE * 100}%)".toString()
            healthStatus = "CRITICAL"
        }
        
        return [
            status: healthStatus,
            issues: issues,
            metrics: metrics.toMap(),
            recommendations: issues.isEmpty() ? [] : generateRecommendations(metrics)
        ]
    }
    
    /**
     * Reset performance metrics
     */
    void resetMetrics() {
        totalOperations.set(0)
        totalProcessingTime.set(0)
        totalRecords.set(0)
        totalErrors.set(0)
        peakMemoryUsage.set(0)
        performanceHistory.clear()
        
        log.info("Performance metrics reset")
    }
    
    /**
     * Export performance data for analysis
     */
    Map exportPerformanceData() {
        List<Map<String, Object>> samples = performanceHistory.collect { sample ->
            [
                timestamp: sample.timestamp,
                operation: sample.operation,
                recordsProcessed: sample.recordsProcessed,
                processingTimeMs: sample.processingTimeMs,
                memoryUsedMB: sample.memoryUsedMB,
                errorCount: sample.errorCount,
                throughput: sample.throughput
            ] as Map<String, Object>
        }
        
        return [
            exportTimestamp: System.currentTimeMillis(),
            samplesCount: samples.size(),
            overallMetrics: getPerformanceMetrics().toMap(),
            performanceSamples: samples,
            jvmMetrics: getJVMMetrics(),
            systemInfo: getSystemInfo()
        ]
    }
    
    /**
     * Add performance alert listener
     */
    void addAlertListener(PerformanceAlertListener listener) {
        alertListeners << listener
    }
    
    // Private methods
    
    private void checkPerformanceAlerts(PerformanceSample sample) {
        // Low throughput alert
        if (sample.throughput < MIN_ACCEPTABLE_THROUGHPUT && sample.recordsProcessed > 50) {
            PerformanceAlert alert = new PerformanceAlert(
                "LOW_THROUGHPUT",
                "WARNING",
                "Import throughput below threshold: ${sample.throughput} records/sec",
                [operation: sample.operation, throughput: sample.throughput, threshold: MIN_ACCEPTABLE_THROUGHPUT],
                "Consider increasing batch size, enabling parallel processing, or optimizing CSV parsing"
            )
            fireAlert(alert)
        }
        
        // High memory usage alert
        if (sample.memoryUsedMB * 1024 * 1024 > MAX_ACCEPTABLE_MEMORY) {
            PerformanceAlert alert = new PerformanceAlert(
                "HIGH_MEMORY_USAGE",
                "WARNING",
                "Memory usage exceeds threshold: ${sample.memoryUsedMB}MB",
                [operation: sample.operation, memoryUsedMB: sample.memoryUsedMB, thresholdMB: MAX_ACCEPTABLE_MEMORY / 1024 / 1024],
                "Reduce batch size, enable chunked processing, or increase JVM heap size"
            )
            fireAlert(alert)
        }
        
        // High error rate alert (check recent samples)
        Map recentTrends = getPerformanceTrends(5)
        if ((recentTrends.errorRate as Double) > MAX_ERROR_RATE && (recentTrends.totalRecords as Integer) > 10) {
            PerformanceAlert alert = new PerformanceAlert(
                "HIGH_ERROR_RATE",
                "CRITICAL",
                "Error rate exceeds threshold: ${((recentTrends.errorRate as Double) * 100).round(2)}%",
                [errorRate: recentTrends.errorRate, threshold: MAX_ERROR_RATE],
                "Review data validation rules, check source data quality, or investigate error patterns"
            )
            fireAlert(alert)
        }
    }
    
    private void fireAlert(PerformanceAlert alert) {
        log.warn("Performance Alert [${alert.severity}]: ${alert.message}")
        
        alertListeners.each { listener ->
            try {
                listener.onPerformanceAlert(alert)
            } catch (Exception e) {
                log.error("Error firing performance alert: ${e.message}", e)
            }
        }
    }
    
    private Map getJVMMetrics() {
        // GC metrics
        long totalGCTime = (gcMBeans.collect { it.collectionTime }.sum() as Number)?.longValue() ?: 0L
        int gcCount = (gcMBeans.collect { it.collectionCount }.sum() as Number)?.intValue() ?: 0
        
        // Memory metrics
        def heapMemory = memoryMBean.heapMemoryUsage
        def nonHeapMemory = memoryMBean.nonHeapMemoryUsage
        
        return [
            totalGCTime: totalGCTime,
            gcCount: gcCount,
            heapUsedMB: heapMemory.used / 1024 / 1024,
            heapMaxMB: heapMemory.max / 1024 / 1024,
            nonHeapUsedMB: nonHeapMemory.used / 1024 / 1024,
            cpuUsage: getCPUUsage()
        ]
    }
    
    private double getCPUUsage() {
        try {
            def operatingSystemMXBean = ManagementFactory.getOperatingSystemMXBean()
            // Use reflection to access implementation-specific methods
            Class<?> beanClass = operatingSystemMXBean.getClass()
            try {
                beanClass.getMethod('getProcessCpuLoad')
                Object cpuLoad = beanClass.getMethod('getProcessCpuLoad').invoke(operatingSystemMXBean)
                if (cpuLoad != null && cpuLoad instanceof Number) {
                    return ((Number) cpuLoad).doubleValue() * 100
                }
            } catch (NoSuchMethodException e) {
                // Method not available on this JVM implementation
                log.debug("getProcessCpuLoad method not available")
            }
        } catch (Exception e) {
            log.debug("Could not get CPU usage: ${e.message}")
        }
        return -1.0 // Indicates unavailable
    }
    
    private long getCurrentMemoryUsageMB() {
        Runtime runtime = Runtime.getRuntime()
        return ((runtime.totalMemory() - runtime.freeMemory()) / 1024 / 1024) as Long
    }
    
    private long getAvailableMemoryMB() {
        Runtime runtime = Runtime.getRuntime()
        return ((runtime.maxMemory() - (runtime.totalMemory() - runtime.freeMemory())) / 1024 / 1024) as Long
    }
    
    private Map analyzeTrends() {
        if (performanceHistory.size() < 10) {
            return [throughputTrend: 0.0, memoryTrend: 0.0]
        }
        
        List<PerformanceSample> recentSamples = performanceHistory.toList().takeRight(20)
        
        // Simple linear trend calculation
        double throughputTrend = calculateLinearTrend(recentSamples.collect { it.throughput as Number })
        double memoryTrend = calculateLinearTrend(recentSamples.collect { it.memoryUsedMB as Number })
        
        return [throughputTrend: throughputTrend, memoryTrend: memoryTrend]
    }
    
    private double calculateLinearTrend(List<Number> values) {
        if (values.size() < 2) return 0.0
        
        double sumX = 0, sumY = 0, sumXY = 0, sumXX = 0
        int n = values.size()
        
        values.eachWithIndex { val, idx ->
            double x = idx
            double y = val.doubleValue()
            sumX += x
            sumY += y
            sumXY += x * y
            sumXX += x * x
        }
        
        double denominator = n * sumXX - sumX * sumX
        if (denominator == 0) return 0.0
        
        return (n * sumXY - sumX * sumY) / denominator
    }
    
    private String determineTrendDirection(List<PerformanceSample> samples) {
        if (samples.size() < 5) return "INSUFFICIENT_DATA"
        
        List<Number> throughputs = samples.collect { it.throughput as Number }
        double trend = calculateLinearTrend(throughputs)
        
        if (trend > 0.1) return "IMPROVING"
        else if (trend < -0.1) return "DECLINING"
        else return "STABLE"
    }
    
    private List<String> generateRecommendations(ImportPerformanceMetrics metrics) {
        List<String> recommendations = []
        
        if (metrics.averageThroughput < MIN_ACCEPTABLE_THROUGHPUT) {
            recommendations.add("Increase batch size to improve throughput (current: ${metrics.averageThroughput.round(2)} records/sec)".toString())
            recommendations.add("Enable parallel processing for large batches")
            recommendations.add("Consider using the optimized streaming CSV parser")
        }
        
        if (metrics.currentMemoryUsageMB > 300) {
            recommendations.add("Reduce batch size to lower memory usage (current: ${metrics.currentMemoryUsageMB}MB)".toString())
            recommendations.add("Enable chunked processing to manage memory better")
            recommendations.add("Consider increasing JVM heap size if system allows")
        }
        
        if (metrics.errorRate > 0.02) {
            recommendations.add("Review data validation rules - error rate is ${(metrics.errorRate * 100).round(2)}%".toString())
            recommendations.add("Implement data quality checks before import")
            recommendations.add("Check source data for formatting issues")
        }
        
        if (metrics.totalGCTime > 1000 && metrics.gcCount > 10) {
            recommendations.add("High GC activity detected - consider tuning JVM garbage collection")
            recommendations.add("Reduce object allocation in import processing")
        }
        
        if (recommendations.isEmpty()) {
            recommendations.add("Performance is within acceptable ranges")
            recommendations.add("Consider enabling async promotion for even better response times")
        }
        
        return recommendations
    }
    
    private long getTimeSpanMs() {
        if (performanceHistory.isEmpty()) return 0
        
        List<PerformanceSample> samples = performanceHistory.toList()
        return samples.last().timestamp - samples.first().timestamp
    }
    
    private Map getSystemInfo() {
        Runtime runtime = Runtime.getRuntime()
        return [
            availableProcessors: runtime.availableProcessors(),
            maxMemoryMB: runtime.maxMemory() / 1024 / 1024,
            totalMemoryMB: runtime.totalMemory() / 1024 / 1024,
            freeMemoryMB: runtime.freeMemory() / 1024 / 1024,
            javaVersion: System.getProperty("java.version"),
            osName: System.getProperty("os.name"),
            osArch: System.getProperty("os.arch")
        ]
    }
    
    private void startBackgroundMonitoring() {
        // Start a background thread for periodic monitoring
        Thread.startDaemon("ImportPerformanceMonitor") {
            while (true) {
                try {
                    Thread.sleep(60000) // Check every minute
                    
                    // Perform periodic health checks
                    Map healthCheck = checkPerformanceHealth()
                    if (healthCheck.status != "HEALTHY") {
                        log.warn("Performance health check: ${healthCheck.status} - Issues: ${healthCheck.issues}")
                    }
                    
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt()
                    break
                } catch (Exception e) {
                    log.error("Error in background monitoring: ${e.message}", e)
                }
            }
        }
    }
}