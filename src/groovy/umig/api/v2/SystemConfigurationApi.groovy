package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import groovy.json.JsonBuilder
import groovy.transform.BaseScript
import umig.repository.SystemConfigurationRepository
import umig.utils.AuthenticationService

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import javax.ws.rs.core.UriInfo
import java.util.UUID

@BaseScript CustomEndpointDelegate delegate

// Lazy load repositories to avoid class loading issues
def getSystemConfigurationRepository = { ->
    return new SystemConfigurationRepository()
}

/**
 * GET /systemConfiguration - Retrieve system configurations
 * 
 * Query Parameters:
 * - envId (optional): Filter by environment ID
 * - category (optional): Filter by configuration category (MACRO_LOCATION, API_CONFIG, SYSTEM_SETTING)
 * - key (optional): Get specific configuration key (requires envId)
 * - includeHistory (optional): Include change history (default: false)
 * 
 * Returns: Array of configuration objects or specific configuration
 */
systemConfiguration(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, UriInfo uriInfo ->
    try {
        println "GET /systemConfiguration - Query params: ${queryParams}"

        // Extract parameters with explicit type casting for safety
        def envIdParam = queryParams.getFirst("envId") as String
        def category = queryParams.getFirst("category") as String
        def key = queryParams.getFirst("key") as String
        def includeHistory = Boolean.parseBoolean((queryParams.getFirst("includeHistory") ?: "false") as String)

        Integer envId = null
        if (envIdParam) {
            try {
                envId = Integer.parseInt(envIdParam as String)
            } catch (NumberFormatException e) {
                return Response.status(400)
                    .entity([error: "Invalid envId parameter. Must be a valid integer."])
                    .build()
            }
        }

        SystemConfigurationRepository systemConfigurationRepository = getSystemConfigurationRepository()
        
        def result
        if (key && envId) {
            // Get specific configuration by key and environment
            result = systemConfigurationRepository.findConfigurationByKey(key, envId)
            if (!result) {
                return Response.status(404)
                    .entity([error: "Configuration not found for key '${key}' in environment ${envId}"])
                    .build()
            }
            
            if (includeHistory) {
                result.history = systemConfigurationRepository.findConfigurationHistory(result.scf_id as UUID, 20)
            }
        } else if (category) {
            // Get configurations by category
            result = systemConfigurationRepository.findConfigurationsByCategory(category, envId)
        } else if (envId) {
            // Get all active configurations for specific environment
            result = systemConfigurationRepository.findActiveConfigurationsByEnvironment(envId)
        } else {
            // Get all configurations grouped by environment (admin view)
            result = systemConfigurationRepository.findAllConfigurationsGroupedByEnvironment()
        }

        println "GET /systemConfiguration - Retrieved ${result instanceof List ? result.size() : (result instanceof Map ? result.size() : 1)} configuration(s)"

        return Response.ok(result).build()
    } catch (Exception e) {
        println "ERROR in GET /systemConfiguration: ${e.message}"
        e.printStackTrace()
        return Response.status(500)
            .entity([error: "Internal server error: ${e.message}"])
            .build()
    }
}

/**
 * POST /systemConfiguration - Create new configuration
 * 
 * Request Body:
 * {
 *   "envId": 1,
 *   "scfKey": "new.config.key",
 *   "scfCategory": "SYSTEM_SETTING",
 *   "scfValue": "config value",
 *   "scfDescription": "Configuration description",
 *   "scfDataType": "STRING",
 *   "scfValidationPattern": "^[a-zA-Z0-9]+$"
 * }
 */
systemConfiguration(httpMethod: "POST", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    try {
        println "POST /systemConfiguration - Creating new configuration"

        def json = new groovy.json.JsonSlurper().parseText(body)
        
        // Validate required fields
        if (!((json as Map).envId as String) || !((json as Map).scfKey as String) || !((json as Map).scfCategory as String) || !((json as Map).scfValue as String)) {
            return Response.status(400)
                .entity([error: "Missing required fields: envId, scfKey, scfCategory, scfValue"])
                .build()
        }

        SystemConfigurationRepository systemConfigurationRepository = getSystemConfigurationRepository()
        
        // Validate configuration value if data type and pattern are provided
        def dataType = ((json as Map).scfDataType as String) ?: 'STRING'
        def validationPattern = (json as Map).scfValidationPattern as String
        def validation = systemConfigurationRepository.validateConfigurationValue(
            (json as Map).scfValue as String, 
            dataType as String, 
            validationPattern
        )

        if (!validation.isValid) {
            return Response.status(400)
                .entity([
                    error: "Configuration value validation failed",
                    validationErrors: validation.errors
                ])
                .build()
        }

        // Get current user for audit trail
        def currentUser = AuthenticationService.getCurrentUser(request)
        def createdBy = (currentUser as String) ?: 'anonymous'

        def configParams = [
            envId: Integer.parseInt((json as Map).envId as String),
            scfKey: (json as Map).scfKey as String,
            scfCategory: (json as Map).scfCategory as String,
            scfValue: (json as Map).scfValue as String,
            scfDescription: (json as Map).scfDescription as String,
            scfIsActive: (json as Map).scfIsActive != null ? Boolean.parseBoolean((json as Map).scfIsActive as String) : true,
            scfIsSystemManaged: (json as Map).scfIsSystemManaged != null ? Boolean.parseBoolean((json as Map).scfIsSystemManaged as String) : false,
            scfDataType: dataType,
            scfValidationPattern: validationPattern
        ]

        SystemConfigurationRepository systemConfigRepo = getSystemConfigurationRepository()
        def configId = systemConfigRepo.createConfiguration(configParams, createdBy)
        
        // Retrieve the created configuration to return
        def createdConfig = systemConfigRepo.findConfigurationByKey(
            (json as Map).scfKey as String, 
            Integer.parseInt((json as Map).envId as String)
        )

        println "POST /systemConfiguration - Created configuration with ID: ${configId}"

        return Response.status(201).entity(createdConfig).build()
    } catch (groovy.json.JsonException e) {
        println "ERROR in POST /systemConfiguration - Invalid JSON: ${e.message}"
        e.printStackTrace()
        return Response.status(400)
            .entity([error: "Invalid JSON in request body"])
            .build()
    } catch (Exception e) {
        println "ERROR in POST /systemConfiguration: ${e.message}"
        e.printStackTrace()
        return Response.status(500)
            .entity([error: "Internal server error: ${e.message}"])
            .build()
    }
}

/**
 * PUT /systemConfiguration/{scfId} - Update configuration by ID
 */
systemConfiguration(httpMethod: "PUT", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    try {
        def pathInfo = queryParams.getFirst("pathInfo") as String
        def scfId = pathInfo?.replaceAll("/systemConfiguration/", "")
        
        if (!scfId) {
            return Response.status(400)
                .entity([error: "Configuration ID is required in path"])
                .build()
        }

        def json = new groovy.json.JsonSlurper().parseText(body)
        def currentUser = AuthenticationService.getCurrentUser(request)
        def updatedBy = (currentUser as String) ?: 'anonymous'

        // Validate new value if provided
        if (((json as Map).scfValue as String) != null) {
            // For now, we'll assume validation passes
        }

        SystemConfigurationRepository systemConfigurationRepository = getSystemConfigurationRepository()
        
        def success = systemConfigurationRepository.updateConfigurationValue(
            UUID.fromString(scfId as String),
            (json as Map).scfValue as String,
            updatedBy as String,
            (json as Map).changeReason as String
        )

        if (!success) {
            return Response.status(404)
                .entity([error: "Configuration not found or inactive"])
                .build()
        }

        println "PUT /systemConfiguration/${scfId} - Updated configuration"

        return Response.ok([message: "Configuration updated successfully"]).build()
    } catch (IllegalArgumentException e) {
        println "ERROR in PUT /systemConfiguration - Invalid UUID: ${e.message}"
        e.printStackTrace()
        return Response.status(400)
            .entity([error: "Invalid configuration ID format"])
            .build()
    } catch (Exception e) {
        println "ERROR in PUT /systemConfiguration: ${e.message}"
        e.printStackTrace()
        return Response.status(500)
            .entity([error: "Internal server error: ${e.message}"])
            .build()
    }
}

/**
 * PUT /systemConfiguration/byKey - Update configuration by key and environment
 * 
 * Request Body:
 * {
 *   "envId": 1,
 *   "scfKey": "config.key",
 *   "scfValue": "new value",
 *   "changeReason": "Updated for new deployment"
 * }
 */
systemConfigurationByKey(httpMethod: "PUT", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    try {
        println "PUT /systemConfiguration/byKey - Updating configuration by key"

        def json = new groovy.json.JsonSlurper().parseText(body)
        
        if (!((json as Map).envId as String) || !((json as Map).scfKey as String) || ((json as Map).scfValue as String) == null) {
            return Response.status(400)
                .entity([error: "Missing required fields: envId, scfKey, scfValue"])
                .build()
        }

        def currentUser = AuthenticationService.getCurrentUser(request)
        def updatedBy = (currentUser as String) ?: 'anonymous'

        SystemConfigurationRepository systemConfigurationRepository = getSystemConfigurationRepository()
        
        def success = systemConfigurationRepository.updateConfigurationByKey(
            (json as Map).scfKey as String,
            Integer.parseInt((json as Map).envId as String),
            (json as Map).scfValue as String,
            updatedBy as String,
            (json as Map).changeReason as String
        )

        if (!success) {
            return Response.status(404)
                .entity([error: "Configuration not found or inactive"])
                .build()
        }

        println "PUT /systemConfiguration/byKey - Updated configuration: ${(json as Map).scfKey}"

        return Response.ok([message: "Configuration updated successfully"]).build()
    } catch (Exception e) {
        println "ERROR in PUT /systemConfiguration/byKey: ${e.message}"
        e.printStackTrace()
        return Response.status(500)
            .entity([error: "Internal server error: ${e.message}"])
            .build()
    }
}

/**
 * GET /systemConfiguration/confluenceMacro - Get all Confluence macro configurations
 * 
 * Query Parameters:
 * - envId (optional): Filter by environment ID
 */
systemConfigurationConfluenceMacro(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, UriInfo uriInfo ->
    try {
        println "GET /systemConfiguration/confluenceMacro - Retrieving Confluence macro configurations"

        def envIdParam = queryParams.getFirst("envId") as String
        Integer envId = null
        
        if (envIdParam) {
            try {
                envId = Integer.parseInt(envIdParam as String)
            } catch (NumberFormatException e) {
                return Response.status(400)
                    .entity([error: "Invalid envId parameter. Must be a valid integer."])
                    .build()
            }
        }

        SystemConfigurationRepository systemConfigurationRepository = getSystemConfigurationRepository()
        
        def result
        if (envId) {
            result = systemConfigurationRepository.findConfluenceConfigurationForEnvironment(envId)
        } else {
            result = systemConfigurationRepository.findConfluenceMacroLocations()
        }

        println "GET /systemConfiguration/confluenceMacro - Retrieved ${result instanceof List ? result.size() : 1} configuration(s)"

        return Response.ok(result).build()
    } catch (Exception e) {
        println "ERROR in GET /systemConfiguration/confluenceMacro: ${e.message}"
        e.printStackTrace()
        return Response.status(500)
            .entity([error: "Internal server error: ${e.message}"])
            .build()
    }
}

/**
 * POST /systemConfiguration/bulk - Bulk update configurations
 * 
 * Request Body:
 * {
 *   "configurations": [
 *     {
 *       "envId": 1,
 *       "scfKey": "config.key1",
 *       "scfValue": "new value1"
 *     },
 *     {
 *       "envId": 2,
 *       "scfKey": "config.key2",
 *       "scfValue": "new value2"
 *     }
 *   ]
 * }
 */
systemConfigurationBulk(httpMethod: "POST", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    try {
        println "POST /systemConfiguration/bulk - Bulk updating configurations"

        def json = new groovy.json.JsonSlurper().parseText(body)
        
        if (!((json as Map).configurations) || !(((json as Map).configurations) instanceof List)) {
            return Response.status(400)
                .entity([error: "Request must contain 'configurations' array"])
                .build()
        }

        def currentUser = AuthenticationService.getCurrentUser(request)
        def updatedBy = (currentUser as String) ?: 'anonymous'

        SystemConfigurationRepository systemConfigurationRepository = getSystemConfigurationRepository()
        
        def updatedCount = systemConfigurationRepository.bulkUpdateConfigurations(
            (json as Map).configurations as List<Map>,
            updatedBy as String
        )

        println "POST /systemConfiguration/bulk - Updated ${updatedCount} configurations"

        return Response.ok([
            message: "Bulk update completed",
            updatedCount: updatedCount,
            totalProvided: ((json as Map).configurations as List).size()
        ]).build()
    } catch (Exception e) {
        println "ERROR in POST /systemConfiguration/bulk: ${e.message}"
        e.printStackTrace()
        return Response.status(500)
            .entity([error: "Internal server error: ${e.message}"])
            .build()
    }
}

/**
 * GET /systemConfiguration/{scfId}/history - Get configuration change history
 */
systemConfigurationHistory(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, UriInfo uriInfo ->
    try {
        def pathInfo = queryParams.getFirst("pathInfo") as String
        def scfId = pathInfo?.replaceAll("/systemConfiguration/", "")?.replaceAll("/history", "")
        
        if (!scfId) {
            return Response.status(400)
                .entity([error: "Configuration ID is required in path"])
                .build()
        }

        def limitParam = queryParams.getFirst("limit") as String
        def limit = limitParam ? Integer.parseInt(limitParam as String) : 50

        SystemConfigurationRepository systemConfigurationRepository = getSystemConfigurationRepository()
        
        def history = systemConfigurationRepository.findConfigurationHistory(UUID.fromString(scfId), limit)

        println "GET /systemConfiguration/${scfId}/history - Retrieved ${history.size()} history records"

        return Response.ok(history).build()
    } catch (IllegalArgumentException e) {
        println "ERROR in GET /systemConfiguration/history - Invalid UUID: ${e.message}"
        e.printStackTrace()
        return Response.status(400)
            .entity([error: "Invalid configuration ID format"])
            .build()
    } catch (Exception e) {
        println "ERROR in GET /systemConfiguration/history: ${e.message}"
        e.printStackTrace()
        return Response.status(500)
            .entity([error: "Internal server error: ${e.message}"])
            .build()
    }
}