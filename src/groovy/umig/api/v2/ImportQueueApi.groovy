package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.service.ImportOrchestrationService
import umig.repository.ImportQueueManagementRepository
import umig.repository.ImportResourceLockRepository
import umig.repository.ScheduledImportRepository
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.transform.BaseScript
import groovy.transform.Field
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import java.util.UUID
import java.sql.Timestamp

/**
 * Import Queue Management API - US-034 Enhancement
 * 
 * Provides endpoints for managing import queues, scheduling, and resource monitoring
 * integrated with the 7 new database tables from US-034.
 * 
 * Endpoints:
 * - GET/POST /queue -> Queue management
 * - GET/POST/PUT/DELETE /schedules -> Schedule management  
 * - GET /resources -> Resource monitoring
 * 
 * @author UMIG Development Team
 * @since Sprint 6 - US-034 Phase 2 Integration
 */
@BaseScript CustomEndpointDelegate delegate

@Field final Logger logger = LoggerFactory.getLogger("umig.api.v2.ImportQueueApi")

/**
 * Import Queue Status and Management
 * GET /import-queue -> Get queue status and active imports
 * POST /import-queue -> Submit import request to queue
 */
importQueue(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    try {
        def queueRepository = new ImportQueueManagementRepository()
        def lockRepository = new ImportResourceLockRepository()
        
        // Get comprehensive queue status
        Map queueStatus = queueRepository.getQueueStatus()
        Map activeLocks = lockRepository.getSystemResourceStatus()
        
        // Get orchestration service for system statistics
        def orchestrationService = new ImportOrchestrationService()
        Map systemStatus = orchestrationService.getImportQueueStatus()
        
        Map result = [
            timestamp: new Timestamp(System.currentTimeMillis()),
            queue: queueStatus,
            resources: activeLocks,
            system: systemStatus,
            recommendations: generateSystemRecommendations(queueStatus, activeLocks)
        ]
        
        logger.info("Queue status retrieved successfully")
        return Response.ok(new JsonBuilder(result).toString()).build()
        
    } catch (Exception e) {
        logger.error("Failed to get import queue status: ${e.message}", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([
                error: "Failed to retrieve queue status",
                details: e.message
            ]).toString())
            .build()
    }
}

importQueue(httpMethod: "POST", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    try {
        def jsonSlurper = new JsonSlurper()
        def requestData = jsonSlurper.parseText(body) as Map
        
        // Extract import configuration
        String importType = requestData.importType as String ?: 'COMPLETE_IMPORT'
        Integer priority = requestData.priority as Integer ?: 5
        Map configuration = requestData.configuration as Map ?: [:]
        String userId = requestData.userId as String ?: 'system'
        
        // Validate required fields
        if (!configuration) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([
                    error: "Missing required field: configuration"
                ]).toString())
                .build()
        }
        
        def queueRepository = new ImportQueueManagementRepository()
        UUID requestId = UUID.randomUUID()
        
        // Calculate resource requirements and duration estimate
        def orchestrationService = new ImportOrchestrationService()
        Map resourceReqs = orchestrationService.calculateResourceRequirements(configuration)
        Integer estimatedDuration = orchestrationService.estimateImportDuration(configuration)
        
        // Submit to queue
        Map queueResult = queueRepository.queueImportRequest(
            requestId,
            importType,
            userId, 
            priority,
            configuration,
            resourceReqs,
            estimatedDuration
        )
        
        if (queueResult.success) {
            Map response = [
                success: true,
                requestId: requestId.toString(),
                queuePosition: queueResult.queuePosition,
                estimatedWaitTime: queueResult.estimatedWaitTime,
                estimatedDuration: estimatedDuration,
                priority: priority
            ]
            
            logger.info("Import request queued successfully: ${requestId}")
            return Response.ok(new JsonBuilder(response).toString()).build()
        } else {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([
                    error: queueResult.error
                ]).toString())
                .build()
        }
        
    } catch (Exception e) {
        logger.error("Failed to queue import request: ${e.message}", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([
                error: "Failed to queue import request",
                details: e.message
            ]).toString())
            .build()
    }
}

/**
 * Import Request Management
 * GET /import-request/{requestId} -> Get request status
 * DELETE /import-request/{requestId} -> Cancel queued request
 */
importRequest(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    if (pathParts.isEmpty()) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([
                error: "Missing request ID. Expected: /import-request/{requestId}"
            ]).toString())
            .build()
    }
    
    try {
        UUID requestId = UUID.fromString(pathParts[0])
        
        def orchestrationService = new ImportOrchestrationService()
        Map requestStatus = orchestrationService.getImportRequestStatus(requestId)
        
        logger.info("Request status retrieved for: ${requestId}")
        return Response.ok(new JsonBuilder(requestStatus).toString()).build()
        
    } catch (IllegalArgumentException e) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([
                error: "Invalid request ID format: must be a valid UUID"
            ]).toString())
            .build()
    } catch (Exception e) {
        logger.error("Failed to get request status: ${e.message}", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([
                error: "Failed to retrieve request status",
                details: e.message
            ]).toString())
            .build()
    }
}

importRequest(httpMethod: "DELETE", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    if (pathParts.isEmpty()) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([
                error: "Missing request ID. Expected: /import-request/{requestId}"
            ]).toString())
            .build()
    }
    
    try {
        UUID requestId = UUID.fromString(pathParts[0])
        
        // Parse cancellation reason
        String reason = "User requested cancellation"
        if (body) {
            def jsonSlurper = new JsonSlurper()
            def requestData = jsonSlurper.parseText(body) as Map
            reason = requestData.reason as String ?: reason
        }
        
        def orchestrationService = new ImportOrchestrationService()
        Map cancelResult = orchestrationService.cancelImportRequest(requestId, reason)
        
        if (cancelResult.success) {
            logger.info("Import request cancelled successfully: ${requestId}")
            return Response.ok(new JsonBuilder(cancelResult).toString()).build()
        } else {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder(cancelResult).toString())
                .build()
        }
        
    } catch (IllegalArgumentException e) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([
                error: "Invalid request ID format: must be a valid UUID"
            ]).toString())
            .build()
    } catch (Exception e) {
        logger.error("Failed to cancel request: ${e.message}", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([
                error: "Failed to cancel request",
                details: e.message
            ]).toString())
            .build()
    }
}

/**
 * Import Schedule Management  
 * GET /import-schedules -> List all schedules
 * POST /import-schedules -> Create new schedule
 */
importSchedules(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    try {
        def scheduleRepository = new ScheduledImportRepository()
        
        // Parse query parameters with explicit casting per ADR-031
        String userId = queryParams.getFirst("userId") as String
        Integer limit = queryParams.getFirst("limit") ? Integer.parseInt(queryParams.getFirst("limit") as String) : 50
        Boolean activeOnly = queryParams.getFirst("activeOnly") ? Boolean.parseBoolean(queryParams.getFirst("activeOnly") as String) : true
        
        List<Map> schedules = scheduleRepository.getSchedulesByUser(userId, limit, activeOnly)
        Map statistics = scheduleRepository.getScheduleStatistics()
        
        Map result = [
            schedules: schedules,
            statistics: statistics
        ]
        
        logger.info("Retrieved ${schedules.size()} schedules")
        return Response.ok(new JsonBuilder(result).toString()).build()
        
    } catch (Exception e) {
        logger.error("Failed to retrieve schedules: ${e.message}", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([
                error: "Failed to retrieve schedules",
                details: e.message
            ]).toString())
            .build()
    }
}

importSchedules(httpMethod: "POST", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    try {
        def jsonSlurper = new JsonSlurper()
        def requestData = jsonSlurper.parseText(body) as Map
        
        // Extract schedule configuration
        String scheduleName = requestData.scheduleName as String
        String description = requestData.description as String ?: ""
        Timestamp scheduledTime = new Timestamp(requestData.scheduledTime as Long)
        Boolean recurring = requestData.recurring as Boolean ?: false
        String recurringPattern = requestData.recurringPattern as String
        Integer priority = requestData.priority as Integer ?: 5
        Map importConfiguration = requestData.importConfiguration as Map
        String userId = requestData.userId as String ?: 'system'
        
        // Validate required fields
        if (!scheduleName || !scheduledTime || !importConfiguration) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([
                    error: "Missing required fields: scheduleName, scheduledTime, importConfiguration"
                ]).toString())
                .build()
        }
        
        def scheduleRepository = new ScheduledImportRepository()
        Map scheduleResult = scheduleRepository.createSchedule(
            scheduleName,
            description,
            scheduledTime,
            recurring,
            recurringPattern,
            importConfiguration,
            userId,
            priority
        )
        
        if (!scheduleResult.success) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([
                    error: "Failed to create schedule",
                    details: scheduleResult.error
                ]).toString())
                .build()
        }
        
        Map response = [
            success: true,
            scheduleId: scheduleResult.scheduleId,
            scheduleName: scheduleName,
            scheduledTime: scheduledTime.toString(),
            nextExecution: scheduleResult.nextExecution?.toString(),
            message: "Schedule created successfully"
        ]
        
        logger.info("Import schedule created successfully: ${scheduleResult.scheduleId}")
        return Response.ok(new JsonBuilder(response).toString()).build()
        
    } catch (Exception e) {
        logger.error("Failed to create schedule: ${e.message}", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([
                error: "Failed to create schedule",
                details: e.message
            ]).toString())
            .build()
    }
}

/**
 * Resource Monitoring
 * GET /import-resources -> Get current resource utilization and locks
 */
importResources(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    try {
        def lockRepository = new ImportResourceLockRepository()
        def queueRepository = new ImportQueueManagementRepository()
        
        Map result = [
            timestamp: new Timestamp(System.currentTimeMillis()),
            resourceLocks: lockRepository.getActiveResourceLocks(),
            systemStatus: lockRepository.getSystemResourceStatus(),
            queueStatistics: queueRepository.getQueueStatistics(),
            recommendations: generateResourceRecommendations(lockRepository, queueRepository)
        ]
        
        logger.info("Resource status retrieved successfully")
        return Response.ok(new JsonBuilder(result).toString()).build()
        
    } catch (Exception e) {
        logger.error("Failed to get resource status: ${e.message}", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([
                error: "Failed to retrieve resource status",
                details: e.message
            ]).toString())
            .build()
    }
}

/**
 * Helper Methods
 */
private List<String> generateSystemRecommendations(Map queueStatus, Map activeLocks) {
    List<String> recommendations = []
    
    // Check queue congestion
    Integer queueLength = queueStatus.queuedRequests as Integer ?: 0
    if (queueLength > 5) {
        recommendations.add("Queue congestion detected (${queueLength} requests). Consider increasing concurrent import slots." as String)
    }
    
    // Check resource lock duration
    List<Map> locks = activeLocks.activeLocks as List<Map> ?: []
    long avgLockDuration = 0L
    if (!locks.isEmpty()) {
        Long totalDuration = locks.collect { 
            System.currentTimeMillis() - (it.lockedAt as Timestamp).time 
        }.sum() as Long ?: 0L
        avgLockDuration = totalDuration / Math.max(locks.size(), 1) as Long
    }
    
    if (avgLockDuration > 300000) { // 5 minutes
        recommendations.add("Long-running resource locks detected. Monitor for potential deadlocks." as String)
    }
    
    if (recommendations.isEmpty()) {
        recommendations.add("System operating within normal parameters" as String)
    }
    
    return recommendations
}

private List<String> generateResourceRecommendations(ImportResourceLockRepository lockRepo, ImportQueueManagementRepository queueRepo) {
    List<String> recommendations = []
    
    try {
        Map systemStatus = lockRepo.getSystemResourceStatus()
        Map queueStats = queueRepo.getQueueStatistics()
        
        // Memory utilization check
        Double memoryUtilization = ((systemStatus.memoryUtilizationPercent as Number)?.doubleValue() ?: 0.0) as Double
        if (memoryUtilization > 80.0) {
            recommendations.add("High memory utilization (${String.format('%.1f', memoryUtilization)}%). Consider reducing concurrent imports." as String)
        }
        
        // Queue backlog check
        Integer backlogSize = queueStats.totalQueued as Integer ?: 0
        if (backlogSize > 10) {
            recommendations.add("Import queue backlog is high (${backlogSize} requests). Consider optimizing import processes." as String)
        }
        
        if (recommendations.isEmpty()) {
            recommendations.add("Resource utilization is within acceptable limits" as String)
        }
        
    } catch (Exception e) {
        logger.warn("Failed to generate resource recommendations: ${e.message}")
        recommendations.add("Unable to generate recommendations due to monitoring error" as String)
    }
    
    return recommendations
}