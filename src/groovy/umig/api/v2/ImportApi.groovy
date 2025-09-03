package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.service.ImportService
import umig.service.CsvImportService
import umig.service.UserService
import umig.repository.ImportRepository
import umig.utils.DatabaseUtil
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.transform.BaseScript
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import java.util.UUID
import java.sql.SQLException

/**
 * Import API - Handles data import operations for JSON extracted from Confluence HTML
 * Follows UMIG patterns for repository instantiation and error handling
 * 
 * @author UMIG Development Team
 * @since Sprint 6 - US-034
 */
@BaseScript CustomEndpointDelegate delegate

// Logger for audit trail - follows UMIG pattern and avoids masking ScriptRunner's 'log' binding
final Logger logger = LoggerFactory.getLogger("umig.api.v2.ImportApi")

/**
 * Handles POST requests for importing JSON data from Confluence extraction
 * - POST /import/json -> Import single JSON file
 * - POST /import/batch -> Import multiple JSON files
 * 
 * Expected JSON payload structure:
 * {
 *   "source": "filename.json",
 *   "content": "{ ... json content ... }"
 * }
 * 
 * For batch:
 * {
 *   "files": [
 *     { "filename": "file1.json", "content": "..." },
 *     { "filename": "file2.json", "content": "..." }
 *   ]
 * }
 */
importData(httpMethod: "POST", groups: ["confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    // Lazy load service to avoid class loading issues
    def getImportService = { ->
        return new ImportService()
    }
    
    try {
        def importService = getImportService()
        def jsonSlurper = new JsonSlurper()
        def requestData = jsonSlurper.parseText(body)
        
        // Get user context from session using UserService.getCurrentUserContext()
        def userContext = UserService.getCurrentUserContext()
        String userId = (userContext?.confluenceUsername as String) ?: 'system'
        
        logger.info("Import request received from user: ${userId}")
        
        // Handle batch import if path contains 'batch'
        if (pathParts.contains('batch')) {
            // Batch import - cast requestData to Map for type safety
            Map requestDataMap = (Map) requestData
            def filesData = requestDataMap.files
            if (!filesData || !(filesData instanceof List)) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([
                        error: "Invalid batch import format. Expected 'files' array"
                    ]).toString())
                    .build()
            }
            
            List<Map> filesList = (List<Map>) filesData
            logger.info("Processing batch import of ${filesList.size()} files")
            
            Map result = importService.importBatch(filesList, userId)
            
            return Response.ok(new JsonBuilder(result).toString()).build()
            
        } else if (pathParts.contains('json')) {
            // Single JSON import - cast requestData to Map for type safety
            Map requestDataMap = (Map) requestData
            String source = requestDataMap.source as String
            String content = requestDataMap.content as String
            
            if (!source || !content) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([
                        error: "Missing required fields: 'source' and 'content'"
                    ]).toString())
                    .build()
            }
            
            logger.info("Processing single JSON import from source: ${source}")
            
            Map result = importService.importJsonData(content, source, userId)
            
            // Return appropriate status based on success
            boolean success = result.success as Boolean
            if (success) {
                return Response.ok(new JsonBuilder(result).toString()).build()
            } else {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder(result).toString())
                    .build()
            }
        } else {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([
                    error: "Invalid import path. Use /import/json or /import/batch"
                ]).toString())
                .build()
        }
        
    } catch (IllegalArgumentException e) {
        logger.error("Invalid import data: ${e.message}", e)
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([
                error: e.message
            ]).toString())
            .build()
    } catch (SQLException e) {
        logger.error("Database error during import: ${e.message}", e)
        // Handle specific SQL states
        if (e.getSQLState() == "23505") {
            return Response.status(Response.Status.CONFLICT)
                .entity(new JsonBuilder([
                    error: "Duplicate data detected",
                    details: e.message
                ]).toString())
                .build()
        }
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([
                error: "Database error",
                details: e.message
            ]).toString())
            .build()
    } catch (Exception e) {
        logger.error("Unexpected error during import: ${e.message}", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([
                error: "Import failed",
                details: e.message
            ]).toString())
            .build()
    }
}

/**
 * Handles GET requests for import history and batch details
 * - GET /import/history -> Get import history (optionally filtered by user)
 * - GET /import/history?userId={username} -> Get import history for specific user
 * - GET /import/batch/{batchId} -> Get details of a specific import batch
 * - GET /import/statistics -> Get overall import statistics
 */
importHistory(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    // Lazy load repository
    def getImportRepository = { ->
        return new ImportRepository()
    }
    
    try {
        def importRepository = getImportRepository()
        
        if (pathParts.contains('history')) {
            // Get import history - cast query parameters to proper types
            String userIdParam = queryParams.getFirst("userId") as String
            String limitParam = queryParams.getFirst("limit") as String
            Integer limit = limitParam ? Integer.parseInt(limitParam) : 50
            
            List history = importRepository.getImportHistory(userIdParam, limit)
            
            return Response.ok(new JsonBuilder(history).toString()).build()
            
        } else if (pathParts.contains('batch') && pathParts.size() > 1) {
            // Get specific batch details
            int batchIdIndex = pathParts.indexOf('batch') + 1
            if (batchIdIndex < pathParts.size()) {
                UUID batchId = UUID.fromString(pathParts[batchIdIndex])
                Map batchDetails = importRepository.getImportBatchDetails(batchId)
                
                if (batchDetails) {
                    return Response.ok(new JsonBuilder(batchDetails).toString()).build()
                } else {
                    return Response.status(Response.Status.NOT_FOUND)
                        .entity(new JsonBuilder([
                            error: "Import batch not found: ${batchId}"
                        ]).toString())
                        .build()
                }
            }
            
        } else if (pathParts.contains('statistics')) {
            // Get import statistics
            Map statistics = importRepository.getImportStatistics()
            
            return Response.ok(new JsonBuilder(statistics).toString()).build()
            
        } else {
            // Default: return recent import history
            List history = importRepository.getImportHistory(null, 10)
            
            return Response.ok(new JsonBuilder(history).toString()).build()
        }
        
    } catch (IllegalArgumentException e) {
        logger.error("Invalid request: ${e.message}", e)
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([
                error: e.message
            ]).toString())
            .build()
    } catch (Exception e) {
        logger.error("Error retrieving import data: ${e.message}", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([
                error: "Failed to retrieve import data",
                details: e.message
            ]).toString())
            .build()
    }
}

/**
 * Handles DELETE requests for import rollback
 * - DELETE /import/batch/{batchId} -> Rollback a specific import batch
 * 
 * Expected JSON payload:
 * {
 *   "reason": "Reason for rollback"
 * }
 */
importRollback(httpMethod: "DELETE", groups: ["confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    // Lazy load repository
    def getImportRepository = { ->
        return new ImportRepository()
    }
    
    try {
        if (pathParts.contains('batch') && pathParts.size() > 1) {
            int batchIdIndex = pathParts.indexOf('batch') + 1
            if (batchIdIndex < pathParts.size()) {
                UUID batchId = UUID.fromString(pathParts[batchIdIndex])
                
                // Parse rollback reason from body
                def jsonSlurper = new JsonSlurper()
                def requestDataRaw = body ? jsonSlurper.parseText(body) : [:]
                Map requestData = (Map) requestDataRaw
                String reason = (requestData.reason as String) ?: "Manual rollback requested"
                
                logger.info("Rollback requested for batch ${batchId}: ${reason}")
                
                def importRepository = getImportRepository()
                
                // Check if batch exists
                if (!importRepository.batchExists(batchId)) {
                    return Response.status(Response.Status.NOT_FOUND)
                        .entity(new JsonBuilder([
                            error: "Import batch not found: ${batchId}"
                        ]).toString())
                        .build()
                }
                
                // Perform rollback
                boolean success = importRepository.rollbackImportBatch(batchId, reason)
                
                if (success) {
                    return Response.ok(new JsonBuilder([
                        message: "Import batch successfully rolled back",
                        batchId: batchId.toString(),
                        reason: reason
                    ]).toString()).build()
                } else {
                    return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                        .entity(new JsonBuilder([
                            error: "Failed to rollback import batch",
                            batchId: batchId.toString()
                        ]).toString())
                        .build()
                }
            }
        }
        
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([
                error: "Invalid rollback request. Expected: DELETE /import/batch/{batchId}"
            ]).toString())
            .build()
        
    } catch (IllegalArgumentException e) {
        logger.error("Invalid batch ID format: ${e.message}", e)
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([
                error: "Invalid batch ID format: must be a valid UUID"
            ]).toString())
            .build()
    } catch (Exception e) {
        logger.error("Error during rollback: ${e.message}", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([
                error: "Rollback failed",
                details: e.message
            ]).toString())
            .build()
    }
}

/**
 * Handles PUT requests for updating import batch status
 * - PUT /import/batch/{batchId}/status -> Update batch status
 * 
 * Expected JSON payload:
 * {
 *   "status": "COMPLETED|FAILED|IN_PROGRESS",
 *   "statistics": { ... optional statistics object ... }
 * }
 */
importStatusUpdate(httpMethod: "PUT", groups: ["confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    try {
        if (pathParts.contains('batch') && pathParts.contains('status')) {
            int batchIdIndex = pathParts.indexOf('batch') + 1
            if (batchIdIndex < pathParts.size()) {
                UUID batchId = UUID.fromString(pathParts[batchIdIndex])
                
                // Parse status update from body
                def jsonSlurper = new JsonSlurper()
                def requestDataRaw = jsonSlurper.parseText(body)
                Map requestData = (Map) requestDataRaw
                
                String status = requestData.status as String
                if (!status) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([
                            error: "Missing required field: 'status'"
                        ]).toString())
                        .build()
                }
                
                logger.info("Updating status for batch ${batchId} to: ${status}")
                
                DatabaseUtil.withSql { sql ->
                    def importRepository = new ImportRepository()
                    Map statistics = (requestData.statistics as Map) ?: [:]
                    importRepository.updateImportBatchStatus(sql, batchId, status, statistics)
                }
                
                return Response.ok(new JsonBuilder([
                    message: "Batch status updated successfully",
                    batchId: batchId.toString(),
                    status: status
                ]).toString()).build()
            }
        }
        
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([
                error: "Invalid status update request. Expected: PUT /import/batch/{batchId}/status"
            ]).toString())
            .build()
        
    } catch (IllegalArgumentException e) {
        logger.error("Invalid request: ${e.message}", e)
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([
                error: e.message
            ]).toString())
            .build()
    } catch (Exception e) {
        logger.error("Error updating batch status: ${e.message}", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([
                error: "Failed to update batch status",
                details: e.message
            ]).toString())
            .build()
    }
}

/**
 * Handles CSV import for base entities
 * - POST /import/csv/teams -> Import teams from CSV
 * - POST /import/csv/users -> Import users from CSV
 * - POST /import/csv/applications -> Import applications from CSV
 * - POST /import/csv/environments -> Import environments from CSV
 * - POST /import/csv/all -> Import all base entities in proper order
 * 
 * Expected body: Raw CSV content
 */
csvImport(httpMethod: "POST", groups: ["confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    // Lazy load service
    def getCsvImportService = { ->
        return new CsvImportService()
    }
    
    try {
        // Check for CSV path segment
        if (!pathParts.contains('csv')) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([
                    error: "Invalid import path. Expected: /import/csv/[entity]"
                ]).toString())
                .build()
        }
        
        def csvService = getCsvImportService()
        
        // Get user context
        def userContext = UserService.getCurrentUserContext()
        String userId = (userContext?.confluenceUsername as String) ?: 'system'
        
        logger.info("CSV import request received from user: ${userId}")
        
        // Determine entity type
        Map result
        if (pathParts.contains('teams')) {
            logger.info("Processing CSV import for teams")
            result = csvService.importTeams(body, "teams_import.csv", userId)
            
        } else if (pathParts.contains('users')) {
            logger.info("Processing CSV import for users")
            result = csvService.importUsers(body, "users_import.csv", userId)
            
        } else if (pathParts.contains('applications')) {
            logger.info("Processing CSV import for applications")
            result = csvService.importApplications(body, "applications_import.csv", userId)
            
        } else if (pathParts.contains('environments')) {
            logger.info("Processing CSV import for environments")
            result = csvService.importEnvironments(body, "environments_import.csv", userId)
            
        } else if (pathParts.contains('all')) {
            // For 'all', expect JSON with CSV content for each entity
            def jsonSlurper = new JsonSlurper()
            def csvData = jsonSlurper.parseText(body)
            Map csvMap = (Map) csvData
            
            logger.info("Processing CSV import for all base entities")
            result = csvService.importAllBaseEntities(csvMap, userId)
            
        } else {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([
                    error: "Unknown entity type. Supported: teams, users, applications, environments, all"
                ]).toString())
                .build()
        }
        
        // Return result based on success
        boolean success = result.success as Boolean
        if (success) {
            return Response.ok(new JsonBuilder(result).toString()).build()
        } else {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder(result).toString())
                .build()
        }
        
    } catch (Exception e) {
        logger.error("CSV import error: ${e.message}", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([
                error: "CSV import failed",
                details: e.message
            ]).toString())
            .build()
    }
}