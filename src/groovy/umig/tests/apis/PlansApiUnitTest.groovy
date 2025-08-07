#!/usr/bin/env groovy
/**
 * Unit tests for Plans API
 * Tests all endpoints and error scenarios without database dependencies
 * Run: groovy PlansApiUnitTest.groovy
 */

import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import javax.ws.rs.core.Response
import javax.ws.rs.core.MultivaluedMap
import javax.servlet.http.HttpServletRequest

// --- Mock Classes ---
class MockMultivaluedMap implements MultivaluedMap<String, String> {
    private Map<String, List<String>> data = [:]
    
    void add(String key, String value) { 
        if (!data[key]) data[key] = []
        data[key] << value
    }
    
    void putSingle(String key, String value) { 
        data[key] = [value]
    }
    
    String getFirst(String key) { 
        return data[key]?.first()
    }
    
    List<String> get(Object key) { return data[key] }
    int size() { return data.size() }
    boolean isEmpty() { return data.isEmpty() }
    boolean containsKey(Object key) { return data.containsKey(key) }
    boolean containsValue(Object value) { return false }
    Object put(String key, List<String> value) { return data.put(key, value) }
    List<String> remove(Object key) { return data.remove(key) }
    void putAll(Map<? extends String, ? extends List<String>> m) { data.putAll(m) }
    void clear() { data.clear() }
    Set<String> keySet() { return data.keySet() }
    Collection<List<String>> values() { return data.values() }
    Set<Map.Entry<String, List<String>>> entrySet() { return data.entrySet() }
}

class MockHttpServletRequest implements HttpServletRequest {
    String pathInfo = ""
    
    // Implement only the methods we need
    String getPathInfo() { return pathInfo }
    
    // Stub out other required methods
    String getAuthType() { null }
    Cookie[] getCookies() { null }
    long getDateHeader(String name) { 0 }
    String getHeader(String name) { null }
    Enumeration<String> getHeaders(String name) { null }
    Enumeration<String> getHeaderNames() { null }
    int getIntHeader(String name) { 0 }
    String getMethod() { "GET" }
    String getPathTranslated() { null }
    String getContextPath() { "" }
    String getQueryString() { null }
    String getRemoteUser() { null }
    boolean isUserInRole(String role) { false }
    java.security.Principal getUserPrincipal() { null }
    String getRequestedSessionId() { null }
    String getRequestURI() { "" }
    StringBuffer getRequestURL() { new StringBuffer() }
    String getServletPath() { "" }
    javax.servlet.http.HttpSession getSession(boolean create) { null }
    javax.servlet.http.HttpSession getSession() { null }
    String changeSessionId() { null }
    boolean isRequestedSessionIdValid() { false }
    boolean isRequestedSessionIdFromCookie() { false }
    boolean isRequestedSessionIdFromURL() { false }
    boolean isRequestedSessionIdFromUrl() { false }
    boolean authenticate(javax.servlet.http.HttpServletResponse response) { false }
    void login(String username, String password) {}
    void logout() {}
    Collection<javax.servlet.http.Part> getParts() { null }
    javax.servlet.http.Part getPart(String name) { null }
    <T extends javax.servlet.http.HttpUpgradeHandler> T upgrade(Class<T> handlerClass) { null }
    Object getAttribute(String name) { null }
    Enumeration<String> getAttributeNames() { null }
    String getCharacterEncoding() { null }
    void setCharacterEncoding(String env) {}
    int getContentLength() { 0 }
    long getContentLengthLong() { 0 }
    String getContentType() { null }
    javax.servlet.ServletInputStream getInputStream() { null }
    String getParameter(String name) { null }
    Enumeration<String> getParameterNames() { null }
    String[] getParameterValues(String name) { null }
    Map<String, String[]> getParameterMap() { [:] }
    String getProtocol() { null }
    String getScheme() { null }
    String getServerName() { null }
    int getServerPort() { 0 }
    java.io.BufferedReader getReader() { null }
    String getRemoteAddr() { null }
    String getRemoteHost() { null }
    void setAttribute(String name, Object o) {}
    void removeAttribute(String name) {}
    java.util.Locale getLocale() { null }
    Enumeration<java.util.Locale> getLocales() { null }
    boolean isSecure() { false }
    javax.servlet.RequestDispatcher getRequestDispatcher(String path) { null }
    String getRealPath(String path) { null }
    int getRemotePort() { 0 }
    String getLocalName() { null }
    String getLocalAddr() { null }
    int getLocalPort() { 0 }
    javax.servlet.ServletContext getServletContext() { null }
    javax.servlet.AsyncContext startAsync() { null }
    javax.servlet.AsyncContext startAsync(javax.servlet.ServletRequest servletRequest, javax.servlet.ServletResponse servletResponse) { null }
    boolean isAsyncStarted() { false }
    boolean isAsyncSupported() { false }
    javax.servlet.AsyncContext getAsyncContext() { null }
    javax.servlet.DispatcherType getDispatcherType() { null }
}

// --- Mock Repositories ---
class MockPlanRepository {
    boolean throwException = false
    String exceptionMessage = "Database error"
    boolean hasPlanInstancesFlag = false
    
    List<Map> findAllMasterPlans() {
        if (throwException) throw new Exception(exceptionMessage)
        return [
            [
                plm_id: UUID.fromString("123e4567-e89b-12d3-a456-426614174000"),
                tms_id: 1,
                plm_name: "Test Plan 1",
                plm_description: "Description 1",
                plm_status: "DRAFT",
                sts_name: "Draft",
                sts_color: "#808080",
                tms_name: "Team Alpha",
                created_by: "system",
                created_at: new Date(),
                updated_by: "system",
                updated_at: new Date()
            ],
            [
                plm_id: UUID.fromString("223e4567-e89b-12d3-a456-426614174000"),
                tms_id: 2,
                plm_name: "Test Plan 2",
                plm_description: "Description 2",
                plm_status: "ACTIVE",
                sts_name: "Active",
                sts_color: "#00FF00",
                tms_name: "Team Beta",
                created_by: "system",
                created_at: new Date(),
                updated_by: "system",
                updated_at: new Date()
            ]
        ]
    }
    
    Map findMasterPlanById(UUID planId) {
        if (throwException) throw new Exception(exceptionMessage)
        if (planId.toString() == "123e4567-e89b-12d3-a456-426614174000") {
            return [
                plm_id: planId,
                tms_id: 1,
                plm_name: "Test Plan 1",
                plm_description: "Description 1",
                plm_status: "DRAFT",
                sts_name: "Draft",
                sts_color: "#808080",
                tms_name: "Team Alpha",
                created_by: "system",
                created_at: new Date(),
                updated_by: "system",
                updated_at: new Date()
            ]
        }
        return null
    }
    
    Map createMasterPlan(Map planData) {
        if (throwException) {
            if (exceptionMessage.contains("duplicate key")) {
                throw new Exception("duplicate key value violates unique constraint")
            }
            throw new Exception(exceptionMessage)
        }
        return [
            plm_id: UUID.randomUUID(),
            tms_id: planData.tms_id,
            plm_name: planData.plm_name,
            plm_description: planData.plm_description,
            plm_status: planData.plm_status,
            sts_name: "Draft",
            sts_color: "#808080",
            tms_name: "Team Alpha",
            created_by: "system",
            created_at: new Date(),
            updated_by: "system",
            updated_at: new Date()
        ]
    }
    
    Map updateMasterPlan(UUID planId, Map updates) {
        if (throwException) throw new Exception(exceptionMessage)
        if (planId.toString() != "123e4567-e89b-12d3-a456-426614174000") {
            return null
        }
        return findMasterPlanById(planId)
    }
    
    boolean softDeleteMasterPlan(UUID planId) {
        if (throwException) throw new Exception(exceptionMessage)
        return planId.toString() == "123e4567-e89b-12d3-a456-426614174000"
    }
    
    List<Map> findPlanInstancesByFilters(Map filters) {
        if (throwException) throw new Exception(exceptionMessage)
        def results = [
            [
                pli_id: UUID.fromString("323e4567-e89b-12d3-a456-426614174000"),
                plm_id: UUID.fromString("123e4567-e89b-12d3-a456-426614174000"),
                ite_id: UUID.fromString("423e4567-e89b-12d3-a456-426614174000"),
                pli_name: "Instance 1",
                pli_description: "Instance Description 1",
                pli_status: "IN_PROGRESS",
                sts_name: "In Progress",
                sts_color: "#0000FF",
                usr_id_owner: 1,
                owner_name: "John Doe",
                plm_name: "Test Plan 1",
                itr_name: "Iteration 1",
                mig_name: "Migration 1",
                created_at: new Date(),
                updated_at: new Date()
            ]
        ]
        
        // Filter based on provided filters
        if (filters.migrationId && filters.migrationId != "523e4567-e89b-12d3-a456-426614174000") {
            return []
        }
        
        return results
    }
    
    Map findPlanInstanceById(UUID instanceId) {
        if (throwException) throw new Exception(exceptionMessage)
        if (instanceId.toString() == "323e4567-e89b-12d3-a456-426614174000") {
            return [
                pli_id: instanceId,
                plm_id: UUID.fromString("123e4567-e89b-12d3-a456-426614174000"),
                ite_id: UUID.fromString("423e4567-e89b-12d3-a456-426614174000"),
                pli_name: "Instance 1",
                pli_description: "Instance Description 1",
                pli_status: "IN_PROGRESS",
                sts_name: "In Progress",
                sts_color: "#0000FF",
                usr_id_owner: 1,
                owner_name: "John Doe",
                plm_name: "Test Plan 1",
                plm_description: "Test Plan Description",
                tms_id: 1,
                itr_name: "Iteration 1",
                mig_name: "Migration 1",
                created_by: "system",
                created_at: new Date(),
                updated_by: "system",
                updated_at: new Date()
            ]
        }
        return null
    }
    
    Map createPlanInstance(UUID masterPlanId, UUID iterationId, Integer userId, Map overrides = [:]) {
        if (throwException) throw new Exception(exceptionMessage)
        if (masterPlanId.toString() != "123e4567-e89b-12d3-a456-426614174000") {
            return null
        }
        return [
            pli_id: UUID.randomUUID(),
            plm_id: masterPlanId,
            ite_id: iterationId,
            pli_name: overrides.pli_name ?: "Instance from Master",
            pli_description: overrides.pli_description ?: "Created from master plan",
            pli_status: "PLANNING",
            usr_id_owner: userId,
            created_at: new Date(),
            updated_at: new Date()
        ]
    }
    
    Map updatePlanInstance(UUID instanceId, Map updates) {
        if (throwException) throw new Exception(exceptionMessage)
        if (instanceId.toString() != "323e4567-e89b-12d3-a456-426614174000") {
            return null
        }
        return findPlanInstanceById(instanceId)
    }
    
    boolean updatePlanInstanceStatus(UUID instanceId, Integer statusId) {
        if (throwException) throw new Exception(exceptionMessage)
        return instanceId.toString() == "323e4567-e89b-12d3-a456-426614174000" && statusId == 5
    }
    
    boolean deletePlanInstance(UUID instanceId) {
        if (throwException) throw new Exception(exceptionMessage)
        return instanceId.toString() == "323e4567-e89b-12d3-a456-426614174000"
    }
    
    boolean hasPlanInstances(UUID masterPlanId) {
        if (throwException) throw new Exception(exceptionMessage)
        return hasPlanInstancesFlag
    }
}

class MockStatusRepository {
    // Not used in these tests but needed for API initialization
}

class MockUserRepository {
    // Not used in these tests but needed for API initialization
}

// --- Test Helper Functions ---
def getAdditionalPath(HttpServletRequest request) {
    def pathInfo = request.getPathInfo()
    if (pathInfo && pathInfo.startsWith("/plans")) {
        return pathInfo.substring("/plans".length())
    }
    return pathInfo
}

def buildJsonResponse(int status, Object entity) {
    return [
        status: status,
        entity: entity
    ]
}

// --- Tests ---
class PlansApiTests {
    MockPlanRepository planRepository = new MockPlanRepository()
    MockStatusRepository statusRepository = new MockStatusRepository()
    MockUserRepository userRepository = new MockUserRepository()
    
    // Helper to simulate API method call
    def callApi(String method, String path, Map queryParams = [:], String body = null) {
        def request = new MockHttpServletRequest()
        request.pathInfo = "/plans${path}"
        
        def multiValuedMap = new MockMultivaluedMap()
        queryParams.each { k, v ->
            multiValuedMap.putSingle(k, v.toString())
        }
        
        // Call the appropriate method
        if (method == "GET") {
            return plansGET(multiValuedMap, body, request)
        } else if (method == "POST") {
            return plansPOST(multiValuedMap, body, request)
        } else if (method == "PUT") {
            return plansPUT(multiValuedMap, body, request)
        } else if (method == "DELETE") {
            return plansDELETE(multiValuedMap, body, request)
        }
    }
    
    // GET endpoint implementation
    def plansGET(MultivaluedMap queryParams, String body, HttpServletRequest request) {
        def extraPath = getAdditionalPath(request)
        def pathParts = extraPath?.split('/')?.findAll { it } ?: []
        
        try {
            // GET /plans/master/{id}
            if (pathParts.size() == 2 && pathParts[0] == 'master') {
                def planId = UUID.fromString(pathParts[1])
                def masterPlan = planRepository.findMasterPlanById(planId)
                
                if (!masterPlan) {
                    return buildJsonResponse(404, 
                        new JsonBuilder([error: "Master plan not found for ID: ${planId}"]).toString())
                }
                
                return buildJsonResponse(200, new JsonBuilder(masterPlan).toString())
            }
            
            // GET /plans/master
            if (pathParts.size() == 1 && pathParts[0] == 'master') {
                def masterPlans = planRepository.findAllMasterPlans()
                def result = masterPlans.collect { plan ->
                    [
                        plm_id: plan.plm_id,
                        tms_id: plan.tms_id,
                        plm_name: plan.plm_name,
                        plm_description: plan.plm_description,
                        plm_status: plan.plm_status,
                        status_name: plan.sts_name,
                        status_color: plan.sts_color,
                        team_name: plan.tms_name,
                        created_by: plan.created_by,
                        created_at: plan.created_at,
                        updated_by: plan.updated_by,
                        updated_at: plan.updated_at
                    ]
                }
                return buildJsonResponse(200, new JsonBuilder(result).toString())
            }
            
            // GET /plans/instance/{id}
            if (pathParts.size() == 2 && pathParts[0] == 'instance') {
                def instanceId = UUID.fromString(pathParts[1])
                def planInstance = planRepository.findPlanInstanceById(instanceId)
                
                if (!planInstance) {
                    return buildJsonResponse(404,
                        new JsonBuilder([error: "Plan instance not found for ID: ${instanceId}"]).toString())
                }
                
                return buildJsonResponse(200, new JsonBuilder(planInstance).toString())
            }
            
            // GET /plans with filters
            if (pathParts.empty) {
                def filters = [:] 
                
                if (queryParams.getFirst("migrationId")) {
                    filters.migrationId = queryParams.getFirst("migrationId")
                }
                
                if (queryParams.getFirst("iterationId")) {
                    filters.iterationId = queryParams.getFirst("iterationId")
                }
                
                def planInstances = planRepository.findPlanInstancesByFilters(filters)
                def result = planInstances.collect { plan ->
                    [
                        pli_id: plan.pli_id,
                        plm_id: plan.plm_id,
                        ite_id: plan.ite_id,
                        pli_name: plan.pli_name,
                        pli_description: plan.pli_description,
                        pli_status: plan.pli_status,
                        status_name: plan.sts_name,
                        status_color: plan.sts_color,
                        usr_id_owner: plan.usr_id_owner,
                        owner_name: plan.owner_name,
                        master_plan_name: plan.plm_name,
                        iteration_name: plan.itr_name,
                        migration_name: plan.mig_name,
                        created_at: plan.created_at,
                        updated_at: plan.updated_at
                    ]
                }
                return buildJsonResponse(200, new JsonBuilder(result).toString())
            }
            
        } catch (IllegalArgumentException e) {
            return buildJsonResponse(400, 
                new JsonBuilder([error: "Invalid UUID format"]).toString())
        } catch (Exception e) {
            return buildJsonResponse(500,
                new JsonBuilder([error: "Internal server error: ${e.message}"]).toString())
        }
        
        return buildJsonResponse(404, new JsonBuilder([error: "Endpoint not found"]).toString())
    }
    
    // POST endpoint implementation
    def plansPOST(MultivaluedMap queryParams, String body, HttpServletRequest request) {
        def extraPath = getAdditionalPath(request)
        def pathParts = extraPath?.split('/')?.findAll { it } ?: []
        
        try {
            // POST /plans/master
            if (pathParts.size() == 1 && pathParts[0] == 'master') {
                if (!body) {
                    return buildJsonResponse(400,
                        new JsonBuilder([error: "Request body is required"]).toString())
                }
                
                def requestData = new JsonSlurper().parseText(body) as Map
                def requiredFields = ['tms_id', 'plm_name', 'plm_status']
                def missingFields = requiredFields.findAll { !requestData.containsKey(it) || !requestData[it] }
                
                if (missingFields) {
                    return buildJsonResponse(400,
                        new JsonBuilder([error: "Missing required fields: ${missingFields.join(', ')}"]).toString())
                }
                
                def result = planRepository.createMasterPlan(requestData)
                
                if (result) {
                    return buildJsonResponse(201, new JsonBuilder(result).toString())
                } else {
                    return buildJsonResponse(500,
                        new JsonBuilder([error: "Failed to create master plan"]).toString())
                }
            }
            
            // POST /plans/instance
            if (pathParts.size() == 1 && pathParts[0] == 'instance') {
                if (!body) {
                    return buildJsonResponse(400,
                        new JsonBuilder([error: "Request body is required"]).toString())
                }
                
                def requestData = new JsonSlurper().parseText(body) as Map
                def requiredFields = ['plm_id', 'ite_id', 'usr_id_owner']
                def missingFields = requiredFields.findAll { !requestData.containsKey(it) || !requestData[it] }
                
                if (missingFields) {
                    return buildJsonResponse(400,
                        new JsonBuilder([error: "Missing required fields: ${missingFields.join(', ')}"]).toString())
                }
                
                def masterPlanId = UUID.fromString(requestData.plm_id as String)
                def iterationId = UUID.fromString(requestData.ite_id as String)
                def overrides = requestData.overrides ?: [:] as Map
                
                def result = planRepository.createPlanInstance(masterPlanId, iterationId, 
                    requestData.usr_id_owner as Integer, overrides)
                
                if (result) {
                    return buildJsonResponse(201, new JsonBuilder(result).toString())
                } else {
                    return buildJsonResponse(500,
                        new JsonBuilder([error: "Failed to create plan instance"]).toString())
                }
            }
            
        } catch (IllegalArgumentException e) {
            return buildJsonResponse(400,
                new JsonBuilder([error: "Invalid UUID format"]).toString())
        } catch (Exception e) {
            if (e.message?.contains("duplicate key")) {
                return buildJsonResponse(409,
                    new JsonBuilder([error: "Plan with this name already exists"]).toString())
            }
            return buildJsonResponse(500,
                new JsonBuilder([error: "Failed to create plan: ${e.message}"]).toString())
        }
        
        return buildJsonResponse(404, new JsonBuilder([error: "Endpoint not found"]).toString())
    }
    
    // PUT endpoint implementation
    def plansPUT(MultivaluedMap queryParams, String body, HttpServletRequest request) {
        def extraPath = getAdditionalPath(request)
        def pathParts = extraPath?.split('/')?.findAll { it } ?: []
        
        try {
            // PUT /plans/master/{id}
            if (pathParts.size() == 2 && pathParts[0] == 'master') {
                def planId = UUID.fromString(pathParts[1])
                
                if (!body) {
                    return buildJsonResponse(400,
                        new JsonBuilder([error: "Request body is required"]).toString())
                }
                
                def requestData = new JsonSlurper().parseText(body) as Map
                def result = planRepository.updateMasterPlan(planId, requestData)
                
                if (result) {
                    return buildJsonResponse(200, new JsonBuilder(result).toString())
                } else {
                    return buildJsonResponse(404,
                        new JsonBuilder([error: "Master plan not found"]).toString())
                }
            }
            
            // PUT /plans/{id}/status
            if (pathParts.size() == 2 && pathParts[1] == 'status') {
                def instanceId = UUID.fromString(pathParts[0])
                
                if (!body) {
                    return buildJsonResponse(400,
                        new JsonBuilder([error: "Request body is required"]).toString())
                }
                
                def requestData = new JsonSlurper().parseText(body) as Map
                def statusId = requestData.statusId as Integer
                
                if (!statusId) {
                    return buildJsonResponse(400,
                        new JsonBuilder([error: "Missing required field: statusId"]).toString())
                }
                
                def result = planRepository.updatePlanInstanceStatus(instanceId, statusId)
                
                if (result) {
                    return buildJsonResponse(200, new JsonBuilder([
                        success: true,
                        message: "Plan status updated successfully",
                        planInstanceId: instanceId,
                        newStatusId: statusId
                    ]).toString())
                } else {
                    return buildJsonResponse(404,
                        new JsonBuilder([error: "Plan instance not found"]).toString())
                }
            }
            
        } catch (IllegalArgumentException e) {
            return buildJsonResponse(400,
                new JsonBuilder([error: "Invalid UUID format"]).toString())
        } catch (Exception e) {
            return buildJsonResponse(500,
                new JsonBuilder([error: "Failed to update plan: ${e.message}"]).toString())
        }
        
        return buildJsonResponse(404, new JsonBuilder([error: "Endpoint not found"]).toString())
    }
    
    // DELETE endpoint implementation  
    def plansDELETE(MultivaluedMap queryParams, String body, HttpServletRequest request) {
        def extraPath = getAdditionalPath(request)
        def pathParts = extraPath?.split('/')?.findAll { it } ?: []
        
        try {
            // DELETE /plans/master/{id}
            if (pathParts.size() == 2 && pathParts[0] == 'master') {
                def planId = UUID.fromString(pathParts[1])
                
                if (planRepository.hasPlanInstances(planId)) {
                    return buildJsonResponse(409,
                        new JsonBuilder([error: "Cannot delete master plan with active instances"]).toString())
                }
                
                def result = planRepository.softDeleteMasterPlan(planId)
                
                if (result) {
                    return buildJsonResponse(200, new JsonBuilder([
                        success: true,
                        message: "Master plan deleted successfully"
                    ]).toString())
                } else {
                    return buildJsonResponse(404,
                        new JsonBuilder([error: "Master plan not found"]).toString())
                }
            }
            
            // DELETE /plans/instance/{id}
            if (pathParts.size() == 2 && pathParts[0] == 'instance') {
                def instanceId = UUID.fromString(pathParts[1])
                def result = planRepository.deletePlanInstance(instanceId)
                
                if (result) {
                    return buildJsonResponse(200, new JsonBuilder([
                        success: true,
                        message: "Plan instance deleted successfully"
                    ]).toString())
                } else {
                    return buildJsonResponse(404,
                        new JsonBuilder([error: "Plan instance not found"]).toString())
                }
            }
            
        } catch (IllegalArgumentException e) {
            return buildJsonResponse(400,
                new JsonBuilder([error: "Invalid UUID format"]).toString())
        } catch (Exception e) {
            return buildJsonResponse(500,
                new JsonBuilder([error: "Failed to delete plan: ${e.message}"]).toString())
        }
        
        return buildJsonResponse(404, new JsonBuilder([error: "Endpoint not found"]).toString())
    }
    
    // Run all tests
    void runTests() {
        println "Running Plans API Unit Tests..."
        int passed = 0
        int failed = 0
        
        // Test 1: GET all master plans
        try {
            def result = callApi("GET", "/master")
            assert result.status == 200
            def data = new JsonSlurper().parseText(result.entity)
            assert data.size() == 2
            assert data[0].plm_name == "Test Plan 1"
            println "✅ Test 1 passed: GET all master plans"
            passed++
        } catch (AssertionError e) {
            println "❌ Test 1 failed: ${e.message}"
            failed++
        }
        
        // Test 2: GET master plan by ID
        try {
            def result = callApi("GET", "/master/123e4567-e89b-12d3-a456-426614174000")
            assert result.status == 200
            def data = new JsonSlurper().parseText(result.entity)
            assert data.plm_name == "Test Plan 1"
            println "✅ Test 2 passed: GET master plan by ID"
            passed++
        } catch (AssertionError e) {
            println "❌ Test 2 failed: ${e.message}"
            failed++
        }
        
        // Test 3: GET master plan - not found
        try {
            def result = callApi("GET", "/master/999e4567-e89b-12d3-a456-426614174000")
            assert result.status == 404
            def data = new JsonSlurper().parseText(result.entity)
            assert data.error.contains("not found")
            println "✅ Test 3 passed: GET master plan not found"
            passed++
        } catch (AssertionError e) {
            println "❌ Test 3 failed: ${e.message}"
            failed++
        }
        
        // Test 4: GET master plan - invalid UUID
        try {
            def result = callApi("GET", "/master/invalid-uuid")
            assert result.status == 400
            def data = new JsonSlurper().parseText(result.entity)
            assert data.error == "Invalid UUID format"
            println "✅ Test 4 passed: GET master plan invalid UUID"
            passed++
        } catch (AssertionError e) {
            println "❌ Test 4 failed: ${e.message}"
            failed++
        }
        
        // Test 5: GET plan instances with filters
        try {
            def result = callApi("GET", "", [migrationId: "523e4567-e89b-12d3-a456-426614174000"])
            assert result.status == 200
            def data = new JsonSlurper().parseText(result.entity)
            assert data.size() == 1
            assert data[0].pli_name == "Instance 1"
            println "✅ Test 5 passed: GET plan instances with filters"
            passed++
        } catch (AssertionError e) {
            println "❌ Test 5 failed: ${e.message}"
            failed++
        }
        
        // Test 6: GET plan instance by ID
        try {
            def result = callApi("GET", "/instance/323e4567-e89b-12d3-a456-426614174000")
            assert result.status == 200
            def data = new JsonSlurper().parseText(result.entity)
            assert data.pli_name == "Instance 1"
            println "✅ Test 6 passed: GET plan instance by ID"
            passed++
        } catch (AssertionError e) {
            println "❌ Test 6 failed: ${e.message}"
            failed++
        }
        
        // Test 7: POST create master plan
        try {
            def body = new JsonBuilder([
                tms_id: 1,
                plm_name: "New Plan",
                plm_description: "New plan description",
                plm_status: "DRAFT"
            ]).toString()
            
            def result = callApi("POST", "/master", [:], body)
            assert result.status == 201
            def data = new JsonSlurper().parseText(result.entity)
            assert data.plm_name == "New Plan"
            println "✅ Test 7 passed: POST create master plan"
            passed++
        } catch (AssertionError e) {
            println "❌ Test 7 failed: ${e.message}"
            failed++
        }
        
        // Test 8: POST create master plan - missing fields
        try {
            def body = new JsonBuilder([
                tms_id: 1,
                plm_name: "New Plan"
                // Missing plm_status
            ]).toString()
            
            def result = callApi("POST", "/master", [:], body)
            assert result.status == 400
            def data = new JsonSlurper().parseText(result.entity)
            assert data.error.contains("Missing required fields")
            assert data.error.contains("plm_status")
            println "✅ Test 8 passed: POST master plan missing fields"
            passed++
        } catch (AssertionError e) {
            println "❌ Test 8 failed: ${e.message}"
            failed++
        }
        
        // Test 9: POST create master plan - duplicate key
        try {
            planRepository.throwException = true
            planRepository.exceptionMessage = "duplicate key value violates unique constraint"
            
            def body = new JsonBuilder([
                tms_id: 1,
                plm_name: "Duplicate Plan",
                plm_status: "DRAFT"
            ]).toString()
            
            def result = callApi("POST", "/master", [:], body)
            assert result.status == 409
            def data = new JsonSlurper().parseText(result.entity)
            assert data.error == "Plan with this name already exists"
            
            planRepository.throwException = false
            println "✅ Test 9 passed: POST master plan duplicate key"
            passed++
        } catch (AssertionError e) {
            planRepository.throwException = false
            println "❌ Test 9 failed: ${e.message}"
            failed++
        }
        
        // Test 10: POST create plan instance
        try {
            def body = new JsonBuilder([
                plm_id: "123e4567-e89b-12d3-a456-426614174000",
                ite_id: "423e4567-e89b-12d3-a456-426614174000",
                usr_id_owner: 1,
                overrides: [
                    pli_name: "Custom Instance Name"
                ]
            ]).toString()
            
            def result = callApi("POST", "/instance", [:], body)
            assert result.status == 201
            def data = new JsonSlurper().parseText(result.entity)
            assert data.pli_name == "Custom Instance Name"
            println "✅ Test 10 passed: POST create plan instance"
            passed++
        } catch (AssertionError e) {
            println "❌ Test 10 failed: ${e.message}"
            failed++
        }
        
        // Test 11: PUT update master plan
        try {
            def body = new JsonBuilder([
                plm_name: "Updated Plan Name",
                plm_description: "Updated description"
            ]).toString()
            
            def result = callApi("PUT", "/master/123e4567-e89b-12d3-a456-426614174000", [:], body)
            assert result.status == 200
            def data = new JsonSlurper().parseText(result.entity)
            assert data.plm_id.toString() == "123e4567-e89b-12d3-a456-426614174000"
            println "✅ Test 11 passed: PUT update master plan"
            passed++
        } catch (AssertionError e) {
            println "❌ Test 11 failed: ${e.message}"
            failed++
        }
        
        // Test 12: PUT update plan instance status
        try {
            def body = new JsonBuilder([
                statusId: 5
            ]).toString()
            
            def result = callApi("PUT", "/323e4567-e89b-12d3-a456-426614174000/status", [:], body)
            assert result.status == 200
            def data = new JsonSlurper().parseText(result.entity)
            assert data.success == true
            assert data.newStatusId == 5
            println "✅ Test 12 passed: PUT update plan instance status"
            passed++
        } catch (AssertionError e) {
            println "❌ Test 12 failed: ${e.message}"
            failed++
        }
        
        // Test 13: DELETE master plan - has instances
        try {
            planRepository.hasPlanInstancesFlag = true
            
            def result = callApi("DELETE", "/master/123e4567-e89b-12d3-a456-426614174000")
            assert result.status == 409
            def data = new JsonSlurper().parseText(result.entity)
            assert data.error == "Cannot delete master plan with active instances"
            
            planRepository.hasPlanInstancesFlag = false
            println "✅ Test 13 passed: DELETE master plan with instances"
            passed++
        } catch (AssertionError e) {
            planRepository.hasPlanInstancesFlag = false
            println "❌ Test 13 failed: ${e.message}"
            failed++
        }
        
        // Test 14: DELETE master plan - success
        try {
            def result = callApi("DELETE", "/master/123e4567-e89b-12d3-a456-426614174000")
            assert result.status == 200
            def data = new JsonSlurper().parseText(result.entity)
            assert data.success == true
            println "✅ Test 14 passed: DELETE master plan success"
            passed++
        } catch (AssertionError e) {
            println "❌ Test 14 failed: ${e.message}"
            failed++
        }
        
        // Test 15: DELETE plan instance
        try {
            def result = callApi("DELETE", "/instance/323e4567-e89b-12d3-a456-426614174000")
            assert result.status == 200
            def data = new JsonSlurper().parseText(result.entity)
            assert data.success == true
            println "✅ Test 15 passed: DELETE plan instance"
            passed++
        } catch (AssertionError e) {
            println "❌ Test 15 failed: ${e.message}"
            failed++
        }
        
        // Test 16: Error handling - database exception
        try {
            planRepository.throwException = true
            planRepository.exceptionMessage = "Database connection failed"
            
            def result = callApi("GET", "/master")
            assert result.status == 500
            def data = new JsonSlurper().parseText(result.entity)
            assert data.error.contains("Database connection failed")
            
            planRepository.throwException = false
            println "✅ Test 16 passed: Database exception handling"
            passed++
        } catch (AssertionError e) {
            planRepository.throwException = false
            println "❌ Test 16 failed: ${e.message}"
            failed++
        }
        
        println "\n========== Test Summary =========="
        println "Total tests: ${passed + failed}"
        println "Passed: ${passed}"
        println "Failed: ${failed}"
        println "Success rate: ${passed / (passed + failed) * 100}%"
        println "=================================="
        
        if (failed > 0) {
            System.exit(1)
        }
    }
}

// Run the tests
def tests = new PlansApiTests()
tests.runTests()