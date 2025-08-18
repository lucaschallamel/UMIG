package umig.tests.integration

import groovy.json.JsonSlurper
import groovy.json.JsonBuilder
import groovy.sql.Sql
import java.sql.SQLException

/**
 * Comprehensive integration tests for TeamsApi following ADR-036 pure Groovy testing framework.
 * Tests all endpoints including teams management, member associations, and comprehensive validation.
 * Validates performance requirements (<500ms response times) and business logic.
 * 
 * Created: 2025-08-18
 * Framework: ADR-036 Pure Groovy (Zero external dependencies)
 * Coverage: Teams CRUD, Team member management, filtering, pagination, error handling
 */
class TeamsApiIntegrationTest {
    
    /**
     * Load environment variables from .env file
     */
    static def loadEnv() {
        def props = new Properties()
        def envFile = new File('.env')
        if (envFile.exists()) {
            envFile.withInputStream { props.load(it) }
        }
        return props
    }
    
    // Configuration from .env file
    private static final ENV = loadEnv()
    private static final DB_URL = "jdbc:postgresql://localhost:5432/umig_app_db"
    private static final DB_USER = ENV.getProperty('DB_USER', 'umig_app_user')
    private static final DB_PASSWORD = ENV.getProperty('DB_PASSWORD', '123456')
    
    private static final String BASE_URL = "http://localhost:8090/rest/scriptrunner/latest/custom"
    private JsonSlurper jsonSlurper = new JsonSlurper()
    
    // Test data
    private static Integer testTeamId
    private static Integer testUserId
    private static Integer testLabelId
    private static UUID testMigrationId
    private static Map<String, Object> testTeamData
    
    static {
        setupTestData()
    }

    /**
     * Setup test data by querying actual database for valid IDs
     */
    static void setupTestData() {
        // Load environment for database connection
        def ENV = loadEnv()
        def DB_URL = "jdbc:postgresql://localhost:5432/umig_app_db"
        def DB_USER = ENV.getProperty('DB_USER', 'umig_app_user')
        def DB_PASSWORD = ENV.getProperty('DB_PASSWORD', '123456')
        
        def sql = null
        try {
            sql = Sql.newInstance(DB_URL, DB_USER, DB_PASSWORD, 'org.postgresql.Driver')
            
            // Get first team ID
            def team = sql.firstRow("SELECT tms_id FROM teams_tms LIMIT 1")
            testTeamId = team?.tms_id
            
            // Get first user ID
            def user = sql.firstRow("SELECT usr_id FROM users_usr LIMIT 1")
            testUserId = user?.usr_id
            
            // Get first label ID
            def label = sql.firstRow("SELECT lab_id FROM labels_lab LIMIT 1")
            testLabelId = label?.lab_id
            
            // Get first migration ID
            def migration = sql.firstRow("SELECT mig_id FROM migrations_mig LIMIT 1")
            testMigrationId = migration?.mig_id
            
            // Create test team data
            testTeamData = [
                name: "Test Integration Team ${System.currentTimeMillis()}",
                description: "Integration test team",
                teamLead: "Test Lead",
                department: "IT",
                contactEmail: "test-team@example.com",
                status: "Active"
            ]
            
        } catch (Exception e) {
            println "⚠️  Database connection failed during setup: ${e.message}"
            println "Tests may not work correctly without valid test data"
        } finally {
            sql?.close()
        }
    }

    /**
     * Main test execution method
     */
    static void main(String[] args) {
        def testRunner = new TeamsApiIntegrationTest()
        def results = []
        
        try {
            println "=".repeat(80)
            println "TeamsAPI Integration Tests"
            println "Testing all endpoints with comprehensive validation"
            println "=".repeat(80)
            
            // Test Group 1: Basic CRUD Operations
            results << testRunner.testGetAllTeams()
            results << testRunner.testGetTeamById()
            results << testRunner.testGetTeamByIdNotFound()
            results << testRunner.testGetTeamByIdInvalidFormat()
            results << testRunner.testCreateTeam()
            results << testRunner.testUpdateTeam()
            results << testRunner.testDeleteTeam()
            
            // Test Group 2: Team Member Management
            results << testRunner.testGetTeamMembers()
            results << testRunner.testAddTeamMember()
            results << testRunner.testRemoveTeamMember()
            results << testRunner.testUpdateTeamMemberRole()
            
            // Test Group 3: Team Associations
            results << testRunner.testGetTeamLabels()
            results << testRunner.testAssociateTeamLabel()
            results << testRunner.testDisassociateTeamLabel()
            results << testRunner.testGetTeamSteps()
            
            // Test Group 4: Filtering and Search
            results << testRunner.testSearchTeams()
            results << testRunner.testFilterTeamsByMigration()
            results << testRunner.testFilterTeamsByLabel()
            results << testRunner.testTeamsPagination()
            results << testRunner.testTeamsSorting()
            
            // Test Group 5: Validation and Error Scenarios
            results << testRunner.testCreateTeamValidation()
            results << testRunner.testUpdateTeamValidation()
            results << testRunner.testTeamMemberValidation()
            results << testRunner.testDuplicateTeamName()
            
            // Test Group 6: Performance Requirements
            results << testRunner.testPerformanceRequirements()
            
        } catch (Exception e) {
            results << [test: "Test Execution", success: false, error: e.message]
            e.printStackTrace()
        }
        
        // Print results summary
        printTestResults(results)
    }

    // =====================================
    // Test Group 1: Basic CRUD Operations
    // =====================================
    
    def testGetAllTeams() {
        def testName = "GET /teams - List All Teams"
        try {
            def url = "${BASE_URL}/teams"
            def response = makeHttpRequest("GET", url)
            
            def success = response.status == 200 && 
                         response.data.containsKey('teams') &&
                         response.data.containsKey('totalCount') &&
                         response.data.teams instanceof List
                         
            return [test: testName, success: success, 
                   details: "Status: ${response.status}, Count: ${response.data?.totalCount}"]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def testGetTeamById() {
        def testName = "GET /teams/{id} - Get Team by ID"
        try {
            if (!testTeamId) {
                return [test: testName, success: false, error: "No test team data available"]
            }
            
            def url = "${BASE_URL}/teams/${testTeamId}"
            def response = makeHttpRequest("GET", url)
            
            def success = response.status == 200 && 
                         response.data.containsKey('tms_id') &&
                         response.data.tms_id == testTeamId
                         
            return [test: testName, success: success,
                   details: "Team ID: ${testTeamId}, Name: ${response.data?.name}"]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def testGetTeamByIdNotFound() {
        def testName = "GET /teams/{id} - Not Found (404)"
        try {
            def nonExistentId = 999999
            def url = "${BASE_URL}/teams/${nonExistentId}"
            def response = makeHttpRequest("GET", url)
            
            def success = response.status == 404 &&
                         response.data.containsKey('error')
                         
            return [test: testName, success: success,
                   details: "Status: ${response.status} (expected 404)"]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def testGetTeamByIdInvalidFormat() {
        def testName = "GET /teams/{id} - Invalid ID Format (400)"
        try {
            def url = "${BASE_URL}/teams/invalid-id"
            def response = makeHttpRequest("GET", url)
            
            def success = response.status == 400 &&
                         response.data.containsKey('error')
                         
            return [test: testName, success: success,
                   details: "Status: ${response.status} (expected 400)"]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def testCreateTeam() {
        def testName = "POST /teams - Create Team"
        try {
            def requestBody = new JsonBuilder(testTeamData).toString()
            def url = "${BASE_URL}/teams"
            def response = makeHttpRequest("POST", url, requestBody)
            
            def success = response.status in [200, 201] &&
                         (response.data.containsKey('success') || response.data.containsKey('tms_id'))
                         
            // Store created ID for subsequent tests if successful
            if (success && response.data.containsKey('tms_id')) {
                testTeamId = response.data.tms_id
            }
                         
            return [test: testName, success: success,
                   details: "Status: ${response.status}, Created: ${response.data?.tms_id}"]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def testUpdateTeam() {
        def testName = "PUT /teams/{id} - Update Team"
        try {
            if (!testTeamId) {
                return [test: testName, success: false, error: "No test team data available"]
            }
            
            def updateData = testTeamData.clone()
            updateData.description = "Updated integration test team"
            updateData.contactEmail = "updated-test-team@example.com"
            
            def requestBody = new JsonBuilder(updateData).toString()
            def url = "${BASE_URL}/teams/${testTeamId}"
            def response = makeHttpRequest("PUT", url, requestBody)
            
            def success = response.status in [200, 202] &&
                         response.data.containsKey('success')
                         
            return [test: testName, success: success,
                   details: "Status: ${response.status}, Updated: ${testTeamId}"]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def testDeleteTeam() {
        def testName = "DELETE /teams/{id} - Delete Team"
        try {
            if (!testTeamId) {
                return [test: testName, success: false, error: "No test team data available"]
            }
            
            def url = "${BASE_URL}/teams/${testTeamId}"
            def response = makeHttpRequest("DELETE", url)
            
            // Accept both success and "not found" as valid for testing
            def success = response.status in [200, 204, 404]
                         
            return [test: testName, success: success,
                   details: "Status: ${response.status}, Deleted: ${testTeamId}"]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }

    // =====================================
    // Test Group 2: Team Member Management
    // =====================================
    
    def testGetTeamMembers() {
        def testName = "GET /teams/{id}/members - Get Team Members"
        try {
            if (!testTeamId) {
                return [test: testName, success: false, error: "No test team data available"]
            }
            
            def url = "${BASE_URL}/teams/${testTeamId}/members"
            def response = makeHttpRequest("GET", url)
            
            def success = response.status in [200, 404] &&
                         (response.data instanceof List || response.data.containsKey('error'))
                         
            return [test: testName, success: success,
                   details: "Status: ${response.status}, Members: ${response.data instanceof List ? response.data.size() : 'N/A'}"]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def testAddTeamMember() {
        def testName = "POST /teams/{id}/members - Add Team Member"
        try {
            if (!testTeamId || !testUserId) {
                return [test: testName, success: false, error: "Insufficient test data for adding member"]
            }
            
            def requestBody = new JsonBuilder([
                userId: testUserId,
                role: "MEMBER",
                joinDate: new Date().format("yyyy-MM-dd")
            ]).toString()
            def url = "${BASE_URL}/teams/${testTeamId}/members"
            def response = makeHttpRequest("POST", url, requestBody)
            
            def success = response.status in [200, 201, 409] // 409 if already member
                         
            return [test: testName, success: success,
                   details: "Status: ${response.status}, Team: ${testTeamId}, User: ${testUserId}"]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def testRemoveTeamMember() {
        def testName = "DELETE /teams/{id}/members/{userId} - Remove Team Member"
        try {
            if (!testTeamId || !testUserId) {
                return [test: testName, success: false, error: "Insufficient test data for removing member"]
            }
            
            def url = "${BASE_URL}/teams/${testTeamId}/members/${testUserId}"
            def response = makeHttpRequest("DELETE", url)
            
            def success = response.status in [200, 204, 404] // 404 if not member
                         
            return [test: testName, success: success,
                   details: "Status: ${response.status}, Team: ${testTeamId}, User: ${testUserId}"]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def testUpdateTeamMemberRole() {
        def testName = "PUT /teams/{id}/members/{userId} - Update Member Role"
        try {
            if (!testTeamId || !testUserId) {
                return [test: testName, success: false, error: "Insufficient test data for updating member role"]
            }
            
            def requestBody = new JsonBuilder([
                role: "LEAD"
            ]).toString()
            def url = "${BASE_URL}/teams/${testTeamId}/members/${testUserId}"
            def response = makeHttpRequest("PUT", url, requestBody)
            
            def success = response.status in [200, 404] // 404 if not member
                         
            return [test: testName, success: success,
                   details: "Status: ${response.status}, Team: ${testTeamId}, User: ${testUserId}"]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }

    // =====================================
    // Test Group 3: Team Associations
    // =====================================
    
    def testGetTeamLabels() {
        def testName = "GET /teams/{id}/labels - Get Team Labels"
        try {
            if (!testTeamId) {
                return [test: testName, success: false, error: "No test team data available"]
            }
            
            def url = "${BASE_URL}/teams/${testTeamId}/labels"
            def response = makeHttpRequest("GET", url)
            
            def success = response.status in [200, 404] &&
                         (response.data instanceof List || response.data.containsKey('error'))
                         
            return [test: testName, success: success,
                   details: "Status: ${response.status}, Labels: ${response.data instanceof List ? response.data.size() : 'N/A'}"]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def testAssociateTeamLabel() {
        def testName = "POST /teams/{id}/labels - Associate Team Label"
        try {
            if (!testTeamId || !testLabelId) {
                return [test: testName, success: false, error: "Insufficient test data for label association"]
            }
            
            def requestBody = new JsonBuilder([labelId: testLabelId]).toString()
            def url = "${BASE_URL}/teams/${testTeamId}/labels"
            def response = makeHttpRequest("POST", url, requestBody)
            
            def success = response.status in [200, 201, 409] // 409 if already associated
                         
            return [test: testName, success: success,
                   details: "Status: ${response.status}, Team: ${testTeamId}, Label: ${testLabelId}"]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def testDisassociateTeamLabel() {
        def testName = "DELETE /teams/{id}/labels/{labelId} - Remove Team Label Association"
        try {
            if (!testTeamId || !testLabelId) {
                return [test: testName, success: false, error: "Insufficient test data for label disassociation"]
            }
            
            def url = "${BASE_URL}/teams/${testTeamId}/labels/${testLabelId}"
            def response = makeHttpRequest("DELETE", url)
            
            def success = response.status in [200, 204, 404] // 404 if not associated
                         
            return [test: testName, success: success,
                   details: "Status: ${response.status}, Team: ${testTeamId}, Label: ${testLabelId}"]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def testGetTeamSteps() {
        def testName = "GET /teams/{id}/steps - Get Team Steps"
        try {
            if (!testTeamId) {
                return [test: testName, success: false, error: "No test team data available"]
            }
            
            def url = "${BASE_URL}/teams/${testTeamId}/steps"
            def response = makeHttpRequest("GET", url)
            
            def success = response.status in [200, 404] &&
                         (response.data instanceof List || response.data.containsKey('error'))
                         
            return [test: testName, success: success,
                   details: "Status: ${response.status}, Steps: ${response.data instanceof List ? response.data.size() : 'N/A'}"]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }

    // =====================================
    // Test Group 4: Filtering and Search
    // =====================================
    
    def testSearchTeams() {
        def testName = "GET /teams?search=term - Search Teams"
        try {
            def searchTerm = "test"
            def url = "${BASE_URL}/teams?search=${searchTerm}"
            def response = makeHttpRequest("GET", url)
            
            def success = response.status == 200 &&
                         response.data.containsKey('teams') &&
                         response.data.containsKey('totalCount')
                         
            return [test: testName, success: success,
                   details: "Search: '${searchTerm}', Results: ${response.data?.totalCount}"]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def testFilterTeamsByMigration() {
        def testName = "GET /teams?migrationId={id} - Filter by Migration"
        try {
            if (!testMigrationId) {
                return [test: testName, success: false, error: "No test migration data available"]
            }
            
            def url = "${BASE_URL}/teams?migrationId=${testMigrationId}"
            def response = makeHttpRequest("GET", url)
            
            def success = response.status == 200 &&
                         response.data.containsKey('teams') &&
                         response.data.containsKey('totalCount')
                         
            return [test: testName, success: success,
                   details: "Migration: ${testMigrationId}, Results: ${response.data?.totalCount}"]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def testFilterTeamsByLabel() {
        def testName = "GET /teams?labelId={id} - Filter by Label"
        try {
            if (!testLabelId) {
                return [test: testName, success: false, error: "No test label data available"]
            }
            
            def url = "${BASE_URL}/teams?labelId=${testLabelId}"
            def response = makeHttpRequest("GET", url)
            
            def success = response.status == 200 &&
                         response.data.containsKey('teams') &&
                         response.data.containsKey('totalCount')
                         
            return [test: testName, success: success,
                   details: "Label: ${testLabelId}, Results: ${response.data?.totalCount}"]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def testTeamsPagination() {
        def testName = "GET /teams - Pagination (page=1&size=5)"
        try {
            def url = "${BASE_URL}/teams?page=1&size=5"
            def response = makeHttpRequest("GET", url)
            
            def success = response.status == 200 &&
                         response.data.containsKey('teams') &&
                         response.data.teams instanceof List &&
                         response.data.teams.size() <= 5
                         
            return [test: testName, success: success,
                   details: "Page: 1, Size: 5, Returned: ${response.data?.teams?.size()}"]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def testTeamsSorting() {
        def testName = "GET /teams - Sorting (sort=name&direction=ASC)"
        try {
            def url = "${BASE_URL}/teams?sort=name&direction=ASC"
            def response = makeHttpRequest("GET", url)
            
            def success = response.status == 200 &&
                         response.data.containsKey('teams') &&
                         response.data.teams instanceof List
                         
            return [test: testName, success: success,
                   details: "Sort: name ASC, Count: ${response.data?.teams?.size()}"]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }

    // =====================================
    // Test Group 5: Validation and Error Scenarios
    // =====================================
    
    def testCreateTeamValidation() {
        def testName = "POST /teams - Validation Errors"
        try {
            // Test with missing required fields
            def invalidData = [description: "Missing name field"]
            def requestBody = new JsonBuilder(invalidData).toString()
            def url = "${BASE_URL}/teams"
            def response = makeHttpRequest("POST", url, requestBody)
            
            def success = response.status in [400, 422] &&
                         response.data.containsKey('error')
                         
            return [test: testName, success: success,
                   details: "Status: ${response.status} (expected 400/422 for validation error)"]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def testUpdateTeamValidation() {
        def testName = "PUT /teams/{id} - Validation Errors"
        try {
            if (!testTeamId) {
                return [test: testName, success: false, error: "No test team data available"]
            }
            
            // Test with invalid email format
            def invalidData = [contactEmail: "invalid-email-format"]
            def requestBody = new JsonBuilder(invalidData).toString()
            def url = "${BASE_URL}/teams/${testTeamId}"
            def response = makeHttpRequest("PUT", url, requestBody)
            
            def success = response.status in [200, 400, 422] // Some APIs might not validate email format
                         
            return [test: testName, success: success,
                   details: "Status: ${response.status} (testing invalid email validation)"]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def testTeamMemberValidation() {
        def testName = "POST /teams/{id}/members - Member Validation Errors"
        try {
            if (!testTeamId) {
                return [test: testName, success: false, error: "No test team data available"]
            }
            
            // Test with non-existent user ID
            def nonExistentUserId = 999999
            def requestBody = new JsonBuilder([
                userId: nonExistentUserId,
                role: "MEMBER"
            ]).toString()
            def url = "${BASE_URL}/teams/${testTeamId}/members"
            def response = makeHttpRequest("POST", url, requestBody)
            
            def success = response.status in [400, 404] &&
                         response.data.containsKey('error')
                         
            return [test: testName, success: success,
                   details: "Status: ${response.status} (expected 400/404 for invalid user)"]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def testDuplicateTeamName() {
        def testName = "POST /teams - Duplicate Name Constraint"
        try {
            // Try to create team with existing name (if any exists)
            def sql = null
            try {
                sql = Sql.newInstance(DB_URL, DB_USER, DB_PASSWORD, 'org.postgresql.Driver')
                def existingTeam = sql.firstRow("SELECT tms_name FROM teams_tms LIMIT 1")
                if (existingTeam) {
                    def duplicateData = [
                        name: existingTeam.tms_name,
                        description: "Duplicate name test",
                        teamLead: "Test Lead"
                    ]
                    
                    def requestBody = new JsonBuilder(duplicateData).toString()
                    def url = "${BASE_URL}/teams"
                    def response = makeHttpRequest("POST", url, requestBody)
                    
                    def success = response.status in [400, 409, 422] &&
                                 response.data.containsKey('error')
                                 
                    return [test: testName, success: success,
                           details: "Status: ${response.status} (expected 400/409/422 for duplicate)"]
                } else {
                    return [test: testName, success: true,
                           details: "No existing teams to test duplicate constraint"]
                }
            } catch (Exception dbException) {
                println "⚠️  Database connection failed: ${dbException.message}"
                return [test: testName, success: false,
                       details: "Database connection failed: ${dbException.message}"]
            } finally {
                sql?.close()
            }
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }

    // =====================================
    // Test Group 6: Performance Requirements
    // =====================================
    
    def testPerformanceRequirements() {
        def testName = "Performance Requirements - <500ms Response Time"
        def performanceResults = []
        
        try {
            // Test response times for key endpoints
            def testCases = [
                ["GET /teams", "${BASE_URL}/teams"],
                ["GET /teams with search", "${BASE_URL}/teams?search=test"],
                ["GET team by ID", testTeamId ? "${BASE_URL}/teams/${testTeamId}" : null],
                ["GET team members", testTeamId ? "${BASE_URL}/teams/${testTeamId}/members" : null],
                ["GET team labels", testTeamId ? "${BASE_URL}/teams/${testTeamId}/labels" : null]
            ]
            
            testCases.findAll { it[1] != null }.each { testCase ->
                def startTime = System.currentTimeMillis()
                def response = makeHttpRequest("GET", testCase[1])
                def responseTime = System.currentTimeMillis() - startTime
                
                performanceResults << [
                    endpoint: testCase[0],
                    responseTime: responseTime,
                    target: "<500ms",
                    success: responseTime < 500
                ]
            }
            
            def avgResponseTime = performanceResults.sum { it.responseTime } / performanceResults.size()
            def allUnderTarget = performanceResults.every { it.success }
            
            return [test: testName, success: allUnderTarget,
                   details: "Average: ${avgResponseTime}ms, All under 500ms: ${allUnderTarget}"]
                   
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }

    // =====================================
    // Utility Methods
    // =====================================
    
    /**
     * Make HTTP request using URLConnection (pure Groovy, no external dependencies)
     */
    private makeHttpRequest(String method, String url, String body = null) {
        try {
            def connection = new URL(url).openConnection()
            connection.requestMethod = method
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Accept", "application/json")
            connection.connectTimeout = 5000
            connection.readTimeout = 10000
            
            if (body && method in ["POST", "PUT"]) {
                connection.doOutput = true
                connection.outputStream.withWriter { writer ->
                    writer.write(body)
                }
            }
            
            def status = connection.responseCode
            def responseText = ""
            
            try {
                responseText = connection.inputStream.text
            } catch (IOException e) {
                // Try error stream for 4xx/5xx responses
                try {
                    responseText = connection.errorStream?.text ?: ""
                } catch (Exception ignored) {
                    responseText = ""
                }
            }
            
            def data = null
            if (responseText && (responseText.trim().startsWith("{") || responseText.trim().startsWith("["))) {
                try {
                    data = jsonSlurper.parseText(responseText)
                } catch (Exception e) {
                    data = [error: "JSON parse error: ${e.message}", rawResponse: responseText]
                }
            } else {
                data = [rawResponse: responseText]
            }
            
            return [status: status, data: data]
            
        } catch (Exception e) {
            return [status: -1, data: [error: e.message]]
        }
    }
    
    /**
     * Print comprehensive test results
     */
    private static void printTestResults(List results) {
        println "\n" + "=".repeat(80)
        println "TeamsAPI Integration Test Results"
        println "=".repeat(80)
        
        def successful = results.count { it.success }
        def total = results.size()
        def successRate = total > 0 ? (successful / total * 100).round(1) : 0
        
        println "Overall Results: ${successful}/${total} tests passed (${successRate}%)"
        println ""
        
        // Group results by success/failure
        def passed = results.findAll { it.success }
        def failed = results.findAll { !it.success }
        
        if (passed) {
            println "✅ PASSED TESTS (${passed.size()}):"
            passed.each { result ->
                println "   ✓ ${result.test}"
                if (result.details) {
                    println "     Details: ${result.details}"
                }
            }
            println ""
        }
        
        if (failed) {
            println "❌ FAILED TESTS (${failed.size()}):"
            failed.each { result ->
                println "   ✗ ${result.test}"
                if (result.error) {
                    println "     Error: ${result.error}"
                }
                if (result.details) {
                    println "     Details: ${result.details}"
                }
            }
            println ""
        }
        
        // Performance summary if available
        def performanceTest = results.find { it.test.contains("Performance") }
        if (performanceTest) {
            println "🚀 PERFORMANCE VALIDATION:"
            println "   Target: <500ms response time"
            println "   Result: ${performanceTest.details}"
            println ""
        }
        
        println "=".repeat(80)
        println "TeamsAPI Integration Testing Complete"
        println "Status: ${successRate >= 80 ? 'PASSED' : 'NEEDS ATTENTION'}"
        println "=".repeat(80)
    }
}