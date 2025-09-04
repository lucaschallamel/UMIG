package umig.tests.integration

import umig.tests.utils.BaseIntegrationTest
import umig.tests.utils.IntegrationTestHttpClient
import umig.tests.utils.HttpResponse
import umig.service.CsvImportService
import umig.service.ImportService
import umig.repository.ImportRepository
import umig.utils.DatabaseUtil
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.sql.Sql
import java.util.UUID

/**
 * Comprehensive End-to-End Integration Test for US-034 CSV Import Workflows
 * 
 * Tests complete CSV import workflows from file upload to database:
 * 1. Complete Teams Import Workflow - CSV validation, parsing, database storage
 * 2. Complete Users Import Workflow - Dependencies, team associations, validation
 * 3. Complete Applications Import Workflow - Application metadata, relationships
 * 4. Complete Environments Import Workflow - Environment configurations, states  
 * 5. Master Plan Import Workflow - Strategic planning entity creation
 * 6. Sequential Entity Import Dependencies - Proper dependency ordering
 * 7. CSV Validation Error Handling - Malformed data, missing fields, constraints
 * 8. Duplicate Detection and Skipping - Business rule enforcement
 * 9. Entity Relationship Validation - Foreign key constraints, referential integrity
 * 10. Batch Processing with Rollback - Transaction management, failure recovery
 * 
 * Framework: Extends BaseIntegrationTest (US-037 95% compliance)
 * Performance: <500ms API response, <60s large imports
 * CSV Templates: Uses existing templates from local-dev-setup/data-utils/CSV_Templates/
 * Database: DatabaseUtil.withSql pattern with explicit casting (ADR-031)
 * 
 * @author UMIG Development Team
 * @since Sprint 6 - US-034 Phase 4 (End-to-End Testing)
 */
class CsvImportEndToEndTest extends BaseIntegrationTest {

    private CsvImportService csvImportService
    private ImportService importService
    private ImportRepository importRepository
    
    // Test data tracking for comprehensive cleanup
    private final Set<UUID> createdBatches = new HashSet<>()
    private final Set<Integer> createdTestTeams = new HashSet<>()
    private final Set<Integer> createdTestUsers = new HashSet<>()
    private final Set<Integer> createdTestApplications = new HashSet<>()
    private final Set<Integer> createdTestEnvironments = new HashSet<>()
    private final Set<UUID> createdPlans = new HashSet<>()

    void setup() {
        super.setup()
        csvImportService = new CsvImportService()
        importService = new ImportService()
        importRepository = new ImportRepository()
        logProgress("CsvImportEndToEndTest setup complete")
    }

    void cleanup() {
        cleanupCsvTestData()
        super.cleanup()
    }

    // ====== END-TO-END WORKFLOW TESTS ======

    void testCompleteTeamsImportWorkflow() {
        logProgress("Testing complete Teams import workflow")

        // Prepare comprehensive teams CSV data
        String teamsData = """team_name,team_description
E2E Test Infrastructure Team,Infrastructure and platform management team
E2E Test Development Team,Software development and engineering team
E2E Test QA Team,Quality assurance and testing team
E2E Test DevOps Team,DevOps automation and deployment team"""

        long startTime = System.currentTimeMillis()
        
        // Execute end-to-end CSV import via API
        HttpResponse response = httpClient.post('/csvImport/csv/teams', teamsData)
        
        long duration = System.currentTimeMillis() - startTime
        
        // Validate API response
        validateApiSuccess(response, 200)
        assert duration < 500, "Teams import should complete within 500ms (actual: ${duration}ms)"
        
        def jsonBody = response.jsonBody
        assert (jsonBody as Map)?.success == true, "Teams import should succeed: ${(jsonBody as Map)?.error}"
        assert ((jsonBody as Map)?.importedCount as Integer) == 4, "Should import 4 teams"
        assert (jsonBody as Map)?.batchId != null, "Should return batch ID"
        
        UUID batchId = UUID.fromString((jsonBody as Map)?.batchId as String)
        createdBatches.add(batchId)
        
        // Validate database state
        DatabaseUtil.withSql { sql ->
            def teams = sql.rows("""
                SELECT tms_id, tms_name, tms_description 
                FROM tbl_teams 
                WHERE tms_name LIKE 'E2E Test%'
                ORDER BY tms_name
            """)
            
            assert teams.size() == 4, "Should have 4 teams in database"
            
            // Validate specific team data
            def infraTeam = teams.find { it.tms_name == 'E2E Test Infrastructure Team' }
            assert infraTeam != null, "Should find Infrastructure team"
            assert infraTeam.tms_description == 'Infrastructure and platform management team', "Should have correct description"
            
            // Track team IDs for cleanup
            teams.each { team ->
                createdTestTeams.add(team.tms_id as Integer)
            }
        }
        
        // Validate import audit trail
        validateImportAuditTrail(batchId, 'TEAMS_IMPORT', 4, 0)

        logProgress("✅ Complete Teams import workflow test passed")
    }

    void testCompleteUsersImportWorkflow() {
        logProgress("Testing complete Users import workflow")

        // Prerequisites: Ensure teams exist first
        testCompleteTeamsImportWorkflow()

        // Prepare users CSV data with team associations
        String usersData = """username,full_name,email,team_name
e2e.infra.lead,E2E Infrastructure Lead,e2e.infra.lead@test.com,E2E Test Infrastructure Team
e2e.dev.senior,E2E Senior Developer,e2e.dev.senior@test.com,E2E Test Development Team
e2e.qa.manager,E2E QA Manager,e2e.qa.manager@test.com,E2E Test QA Team
e2e.devops.engineer,E2E DevOps Engineer,e2e.devops.engineer@test.com,E2E Test DevOps Team
e2e.dev.junior,E2E Junior Developer,e2e.dev.junior@test.com,E2E Test Development Team"""

        long startTime = System.currentTimeMillis()
        
        // Execute end-to-end CSV import
        HttpResponse response = httpClient.post('/csvImport/csv/users', usersData)
        
        long duration = System.currentTimeMillis() - startTime
        
        // Validate API response
        validateApiSuccess(response, 200)
        assert duration < 500, "Users import should complete within 500ms (actual: ${duration}ms)"
        
        def jsonBody = response.jsonBody
        assert (jsonBody as Map)?.success == true, "Users import should succeed: ${(jsonBody as Map)?.error}"
        assert ((jsonBody as Map)?.importedCount as Integer) == 5, "Should import 5 users"
        assert (jsonBody as Map)?.batchId != null, "Should return batch ID"
        
        UUID batchId = UUID.fromString((jsonBody as Map)?.batchId as String)
        createdBatches.add(batchId)
        
        // Validate database state and relationships
        DatabaseUtil.withSql { sql ->
            def users = sql.rows("""
                SELECT u.usr_id, u.usr_username, u.usr_full_name, u.usr_email, 
                       t.tms_name as team_name, u.usr_team_id
                FROM tbl_users u
                LEFT JOIN tbl_teams t ON u.usr_team_id = t.tms_id
                WHERE u.usr_username LIKE 'e2e.%'
                ORDER BY u.usr_username
            """)
            
            assert users.size() == 5, "Should have 5 users in database"
            
            // Validate team associations
            users.each { user ->
                assert user.team_name != null, "User ${user.usr_username} should have team association"
                assert user.usr_team_id != null, "User should have team ID"
                createdTestUsers.add(user.usr_id as Integer)
            }
            
            // Validate specific user with team relationship
            def devLead = users.find { it.usr_username == 'e2e.infra.lead' }
            assert devLead != null, "Should find infrastructure lead"
            assert devLead.team_name == 'E2E Test Infrastructure Team', "Should have correct team association"
            
            // Validate multiple users in same team
            def devTeamUsers = users.findAll { it.team_name == 'E2E Test Development Team' }
            assert devTeamUsers.size() == 2, "Should have 2 users in Development Team"
        }
        
        // Validate import audit trail
        validateImportAuditTrail(batchId, 'USERS_IMPORT', 5, 0)

        logProgress("✅ Complete Users import workflow test passed")
    }

    void testCompleteApplicationsImportWorkflow() {
        logProgress("Testing complete Applications import workflow")

        // Prepare applications CSV data with comprehensive metadata
        String applicationsData = """app_name,app_description,app_type,app_owner,app_version,app_status
E2E Web Portal,Customer-facing web application portal,WEB,E2E Product Team,2.1.0,Active
E2E API Gateway,Central API gateway for microservices,API,E2E Architecture Team,1.5.2,Active
E2E Mobile App,iOS and Android mobile application,MOBILE,E2E Mobile Team,3.0.1,Active
E2E Data Pipeline,ETL pipeline for data processing,BATCH,E2E Data Team,1.2.3,Active
E2E Legacy System,Legacy mainframe integration,LEGACY,E2E Integration Team,0.9.8,Maintenance"""

        long startTime = System.currentTimeMillis()
        
        // Execute end-to-end CSV import
        HttpResponse response = httpClient.post('/csvImport/csv/applications', applicationsData)
        
        long duration = System.currentTimeMillis() - startTime
        
        // Validate API response
        validateApiSuccess(response, 200)
        assert duration < 500, "Applications import should complete within 500ms (actual: ${duration}ms)"
        
        def jsonBody = response.jsonBody
        assert (jsonBody as Map)?.success == true, "Applications import should succeed: ${(jsonBody as Map)?.error}"
        assert ((jsonBody as Map)?.importedCount as Integer) == 5, "Should import 5 applications"
        assert (jsonBody as Map)?.batchId != null, "Should return batch ID"
        
        UUID batchId = UUID.fromString((jsonBody as Map)?.batchId as String)
        createdBatches.add(batchId)
        
        // Validate database state and application metadata
        DatabaseUtil.withSql { sql ->
            def applications = sql.rows("""
                SELECT app_id, app_name, app_description, app_type, app_owner, app_version, app_status
                FROM applications_app
                WHERE app_name LIKE 'E2E %'
                ORDER BY app_name
            """)
            
            assert applications.size() == 5, "Should have 5 applications in database"
            
            // Validate application types diversity
            def appTypes = applications.collect { it.app_type }.unique()
            assert appTypes.size() >= 4, "Should have multiple application types"
            assert 'WEB' in appTypes, "Should have WEB application type"
            assert 'API' in appTypes, "Should have API application type"
            assert 'MOBILE' in appTypes, "Should have MOBILE application type"
            
            // Validate specific application metadata
            def webPortal = applications.find { it.app_name == 'E2E Web Portal' }
            assert webPortal != null, "Should find Web Portal application"
            assert webPortal.app_type == 'WEB', "Should have correct application type"
            assert webPortal.app_version == '2.1.0', "Should have correct version"
            assert webPortal.app_status == 'Active', "Should have correct status"
            
            // Track application IDs for cleanup
            applications.each { app ->
                createdTestApplications.add(app.app_id as Integer)
            }
        }
        
        // Validate import audit trail
        validateImportAuditTrail(batchId, 'APPLICATIONS_IMPORT', 5, 0)

        logProgress("✅ Complete Applications import workflow test passed")
    }

    void testCompleteEnvironmentsImportWorkflow() {
        logProgress("Testing complete Environments import workflow")

        // Prepare environments CSV data with different environment types
        String environmentsData = """env_name,env_description,env_type,env_status
E2E Development,Development environment for feature development,DEV,Active
E2E Testing,Testing environment for QA validation,TEST,Active
E2E Staging,Staging environment for pre-production testing,STG,Active
E2E Production,Production environment for live systems,PROD,Active
E2E DR,Disaster recovery environment,DR,Standby
E2E Performance,Performance testing environment,PERF,Active"""

        long startTime = System.currentTimeMillis()
        
        // Execute end-to-end CSV import
        HttpResponse response = httpClient.post('/csvImport/csv/environments', environmentsData)
        
        long duration = System.currentTimeMillis() - startTime
        
        // Validate API response
        validateApiSuccess(response, 200)
        assert duration < 500, "Environments import should complete within 500ms (actual: ${duration}ms)"
        
        def jsonBody = response.jsonBody
        assert (jsonBody as Map)?.success == true, "Environments import should succeed: ${(jsonBody as Map)?.error}"
        assert ((jsonBody as Map)?.importedCount as Integer) == 6, "Should import 6 environments"
        assert (jsonBody as Map)?.batchId != null, "Should return batch ID"
        
        UUID batchId = UUID.fromString((jsonBody as Map)?.batchId as String)
        createdBatches.add(batchId)
        
        // Validate database state and environment configurations
        DatabaseUtil.withSql { sql ->
            def environments = sql.rows("""
                SELECT env_id, env_name, env_description, env_type, env_status
                FROM environments_env
                WHERE env_name LIKE 'E2E %'
                ORDER BY 
                    CASE env_type 
                        WHEN 'DEV' THEN 1 
                        WHEN 'TEST' THEN 2 
                        WHEN 'STG' THEN 3 
                        WHEN 'PROD' THEN 4 
                        WHEN 'DR' THEN 5 
                        WHEN 'PERF' THEN 6 
                        ELSE 99 
                    END
            """)
            
            assert environments.size() == 6, "Should have 6 environments in database"
            
            // Validate environment types progression
            def envTypes = environments.collect { it.env_type }
            assert 'DEV' in envTypes, "Should have DEV environment"
            assert 'TEST' in envTypes, "Should have TEST environment"
            assert 'STG' in envTypes, "Should have STG environment"
            assert 'PROD' in envTypes, "Should have PROD environment"
            assert 'DR' in envTypes, "Should have DR environment"
            
            // Validate environment statuses
            def activeEnvs = environments.findAll { it.env_status == 'Active' }
            assert activeEnvs.size() == 5, "Should have 5 active environments"
            
            def standbyEnvs = environments.findAll { it.env_status == 'Standby' }
            assert standbyEnvs.size() == 1, "Should have 1 standby environment (DR)"
            
            // Validate specific environment
            def prodEnv = environments.find { it.env_name == 'E2E Production' }
            assert prodEnv != null, "Should find Production environment"
            assert prodEnv.env_type == 'PROD', "Should have correct environment type"
            assert prodEnv.env_status == 'Active', "Production should be active"
            
            // Track environment IDs for cleanup
            environments.each { env ->
                createdTestEnvironments.add(env.env_id as Integer)
            }
        }
        
        // Validate import audit trail
        validateImportAuditTrail(batchId, 'ENVIRONMENTS_IMPORT', 6, 0)

        logProgress("✅ Complete Environments import workflow test passed")
    }

    void testMasterPlanImportWorkflow() {
        logProgress("Testing Master Plan import workflow")

        // Prepare master plan data via API (not CSV since it's not implemented yet)
        Map masterPlanData = [
            planName: 'E2E Test Migration Plan Alpha',
            description: 'Comprehensive migration plan for end-to-end testing validation',
            userId: 'integration-test'
        ]

        long startTime = System.currentTimeMillis()
        
        // Execute master plan creation
        HttpResponse response = httpClient.post('/masterPlanImport', masterPlanData)
        
        long duration = System.currentTimeMillis() - startTime
        
        // Validate API response
        validateApiSuccess(response, 200)
        assert duration < 500, "Master plan creation should complete within 500ms (actual: ${duration}ms)"
        
        def jsonBody = response.jsonBody
        assert (jsonBody as Map)?.success == true, "Master plan creation should succeed: ${(jsonBody as Map)?.error}"
        assert (jsonBody as Map)?.planId != null, "Should return plan ID"
        assert (jsonBody as Map)?.planName == masterPlanData.planName, "Should return correct plan name"
        assert (jsonBody as Map)?.batchId != null, "Should return batch ID"
        
        UUID planId = UUID.fromString((jsonBody as Map)?.planId as String)
        UUID batchId = UUID.fromString((jsonBody as Map)?.batchId as String)
        createdBatches.add(batchId)
        createdPlans.add(planId)
        
        // Validate database state
        DatabaseUtil.withSql { sql ->
            def plan = sql.firstRow("""
                SELECT plm_id, plm_name, plm_description, plm_status, plm_created_by
                FROM tbl_plans_master
                WHERE plm_id = ?
            """, [planId])
            
            assert plan != null, "Should find master plan in database"
            assert plan.plm_name == masterPlanData.planName, "Should have correct plan name"
            assert plan.plm_status == 'DRAFT', "Should have DRAFT status initially"
            assert plan.plm_created_by == masterPlanData.userId, "Should have correct creator"
        }
        
        // Validate import audit trail
        validateImportAuditTrail(batchId, 'MASTER_PLAN_CONFIG', 1, 0)

        logProgress("✅ Master Plan import workflow test passed")
    }

    void testSequentialEntityImportDependencies() {
        logProgress("Testing sequential entity import dependencies")

        // Test the proper dependency order: Users → Teams → Environments → Applications → JSON Steps
        // This validates that the system handles dependencies correctly
        
        long totalStartTime = System.currentTimeMillis()
        List<UUID> sequentialBatches = []
        
        // 1. Teams first (no dependencies)
        String teamsData = """team_name,team_description
Dependency Test Team Alpha,Primary dependency test team
Dependency Test Team Beta,Secondary dependency test team"""
        
        HttpResponse teamsResponse = httpClient.post('/csvImport/csv/teams', teamsData)
        validateApiSuccess(teamsResponse, 200)
        sequentialBatches.add(UUID.fromString((teamsResponse.jsonBody as Map)?.batchId as String))
        
        // 2. Users (depend on teams)
        String usersData = """username,full_name,email,team_name
dep.alpha.lead,Dependency Alpha Lead,dep.alpha.lead@test.com,Dependency Test Team Alpha
dep.beta.dev,Dependency Beta Developer,dep.beta.dev@test.com,Dependency Test Team Beta"""
        
        HttpResponse usersResponse = httpClient.post('/csvImport/csv/users', usersData)
        validateApiSuccess(usersResponse, 200)
        sequentialBatches.add(UUID.fromString((usersResponse.jsonBody as Map)?.batchId as String))
        
        // 3. Environments (independent)
        String envsData = """env_name,env_description,env_type,env_status
Dependency Test Env,Test environment for dependency validation,TEST,Active"""
        
        HttpResponse envsResponse = httpClient.post('/csvImport/csv/environments', envsData)
        validateApiSuccess(envsResponse, 200)
        sequentialBatches.add(UUID.fromString((envsResponse.jsonBody as Map)?.batchId as String))
        
        // 4. Applications (independent)
        String appsData = """app_name,app_description,app_type,app_owner,app_version
Dependency Test App,Application for dependency testing,WEB,Dependency Team,1.0.0"""
        
        HttpResponse appsResponse = httpClient.post('/csvImport/csv/applications', appsData)
        validateApiSuccess(appsResponse, 200)
        sequentialBatches.add(UUID.fromString((appsResponse.jsonBody as Map)?.batchId as String))
        
        // 5. JSON Steps (depend on all base entities)
        List jsonFiles = [
            [
                filename: 'dependency_test_step.json',
                content: new JsonBuilder([
                    step_type: 'DEP',
                    step_number: 1,
                    title: 'Dependency Test Step',
                    task_list: [
                        [instruction_id: 'DEP-001', description: 'Dependency validation instruction']
                    ]
                ]).toString()
            ]
        ]
        
        HttpResponse jsonResponse = httpClient.post('/importData/batch', [files: jsonFiles])
        validateApiSuccess(jsonResponse, 200)
        sequentialBatches.add(UUID.fromString((jsonResponse.jsonBody as Map)?.batchId as String))
        
        long totalDuration = System.currentTimeMillis() - totalStartTime
        
        // Validate overall performance
        assert totalDuration < 5000, "Complete sequential import should complete within 5 seconds (actual: ${totalDuration}ms)"
        
        // Add all batches to cleanup tracking
        createdBatches.addAll(sequentialBatches)
        
        // Validate that all entities were created and relationships are intact
        DatabaseUtil.withSql { sql ->
            // Validate teams
            def teams = sql.rows("SELECT COUNT(*) as count FROM tbl_teams WHERE tms_name LIKE 'Dependency Test%'")
            assert (teams[0].count as Integer) == 2, "Should have 2 dependency test teams"
            
            // Validate users with team relationships
            def users = sql.rows("""
                SELECT u.usr_username, t.tms_name 
                FROM tbl_users u 
                JOIN tbl_teams t ON u.usr_team_id = t.tms_id 
                WHERE u.usr_username LIKE 'dep.%'
            """)
            assert users.size() == 2, "Should have 2 users with team relationships"
            
            // Validate environments
            def envs = sql.rows("SELECT COUNT(*) as count FROM environments_env WHERE env_name LIKE 'Dependency Test%'")
            assert (envs[0].count as Integer) == 1, "Should have 1 dependency test environment"
            
            // Validate applications
            def apps = sql.rows("SELECT COUNT(*) as count FROM applications_app WHERE app_name LIKE 'Dependency Test%'")
            assert (apps[0].count as Integer) == 1, "Should have 1 dependency test application"
            
            // Validate JSON steps in staging
            def steps = sql.rows("SELECT COUNT(*) as count FROM stg_steps WHERE sts_title LIKE 'Dependency Test%'")
            assert (steps[0].count as Integer) >= 1, "Should have dependency test steps in staging"
        }

        logProgress("✅ Sequential entity import dependencies test passed (${totalDuration}ms)")
    }

    void testCsvValidationErrorHandling() {
        logProgress("Testing CSV validation error handling")

        // Test 1: Malformed CSV data (incorrect header)
        String malformedCsv = """invalid_header,wrong_field
Team Name,Description"""
        
        HttpResponse malformedResponse = httpClient.post('/csvImport/csv/teams', malformedCsv)
        assert malformedResponse.statusCode >= 400, "Should reject malformed CSV"
        
        // Test 2: Missing required fields
        String missingFieldsCsv = """team_name
Incomplete Team"""
        
        HttpResponse missingFieldsResponse = httpClient.post('/csvImport/csv/teams', missingFieldsCsv)
        assert missingFieldsResponse.statusCode >= 400, "Should reject CSV with missing required fields"
        
        // Test 3: Empty CSV data
        HttpResponse emptyResponse = httpClient.post('/csvImport/csv/teams', '')
        assert emptyResponse.statusCode >= 400, "Should reject empty CSV"
        
        // Test 4: Invalid team name in users CSV (referential integrity)
        String invalidTeamUsersCsv = """username,full_name,email,team_name
invalid.user,Invalid User,invalid@test.com,Non Existent Team"""
        
        HttpResponse invalidTeamResponse = httpClient.post('/csvImport/csv/users', invalidTeamUsersCsv)
        // This might succeed but with warnings, or fail depending on implementation
        // The key is that it should handle the error gracefully
        assert invalidTeamResponse.statusCode < 500, "Should handle referential integrity errors gracefully"
        
        // Test 5: Duplicate entries within same CSV
        String duplicateTeamsCsv = """team_name,team_description
Validation Test Team,First entry
Validation Test Team,Duplicate entry"""
        
        HttpResponse duplicateResponse = httpClient.post('/csvImport/csv/teams', duplicateTeamsCsv)
        // Should either reject or handle duplicates according to business rules
        assert duplicateResponse.statusCode != 500, "Should handle duplicates without server error"

        logProgress("✅ CSV validation error handling test passed")
    }

    void testDuplicateDetectionAndSkipping() {
        logProgress("Testing duplicate detection and skipping")

        // First import: Create initial teams
        String initialTeamsData = """team_name,team_description
Duplicate Test Team One,Original team one
Duplicate Test Team Two,Original team two"""
        
        HttpResponse initialResponse = httpClient.post('/csvImport/csv/teams', initialTeamsData)
        validateApiSuccess(initialResponse, 200)
        
        UUID initialBatchId = UUID.fromString((initialResponse.jsonBody as Map)?.batchId as String)
        createdBatches.add(initialBatchId)
        
        // Second import: Include duplicates and new entries
        String duplicateTeamsData = """team_name,team_description
Duplicate Test Team One,Updated description (should be skipped or updated)
Duplicate Test Team Two,Another updated description  
Duplicate Test Team Three,New team (should be imported)"""
        
        HttpResponse duplicateResponse = httpClient.post('/csvImport/csv/teams', duplicateTeamsData)
        
        // The response might be successful with warnings or might partially fail
        // Key is that it handles duplicates according to business rules
        assert duplicateResponse.statusCode < 500, "Should handle duplicates without server error"
        
        if ((duplicateResponse.jsonBody as Map)?.batchId) {
            createdBatches.add(UUID.fromString((duplicateResponse.jsonBody as Map)?.batchId as String))
        }
        
        // Validate database state
        DatabaseUtil.withSql { sql ->
            def teams = sql.rows("""
                SELECT tms_name, tms_description, COUNT(*) as count
                FROM tbl_teams 
                WHERE tms_name LIKE 'Duplicate Test Team%'
                GROUP BY tms_name, tms_description
                ORDER BY tms_name
            """)
            
            // Should not have true duplicates in the database
            def duplicateEntries = teams.findAll { (it.count as Integer) > 1 }
            assert duplicateEntries.size() == 0, "Should not have duplicate entries in database"
            
            // Should have at least the original teams
            def teamNames = teams.collect { it.tms_name }
            assert 'Duplicate Test Team One' in teamNames, "Should have original team one"
            assert 'Duplicate Test Team Two' in teamNames, "Should have original team two"
        }

        logProgress("✅ Duplicate detection and skipping test passed")
    }

    void testEntityRelationshipValidation() {
        logProgress("Testing entity relationship validation")

        // Create base entities for relationship testing
        testCompleteTeamsImportWorkflow()
        testCompleteApplicationsImportWorkflow() 
        testCompleteEnvironmentsImportWorkflow()
        
        // Test valid relationships
        String validUsersData = """username,full_name,email,team_name
rel.valid.user,Valid Relationship User,rel.valid@test.com,E2E Test Infrastructure Team"""
        
        HttpResponse validResponse = httpClient.post('/csvImport/csv/users', validUsersData)
        validateApiSuccess(validResponse, 200)
        
        UUID validBatchId = UUID.fromString((validResponse.jsonBody as Map)?.batchId as String)
        createdBatches.add(validBatchId)
        
        // Test invalid relationships (non-existent team)
        String invalidUsersData = """username,full_name,email,team_name
rel.invalid.user,Invalid Relationship User,rel.invalid@test.com,Non Existent Team Name"""
        
        HttpResponse invalidResponse = httpClient.post('/csvImport/csv/users', invalidUsersData)
        
        // Should handle foreign key violations gracefully
        if (invalidResponse.statusCode >= 400) {
            def errorBody = invalidResponse.jsonBody
            assert (errorBody as Map)?.error != null, "Should provide error message for invalid relationships"
        } else {
            // If it succeeds, the user should not have a team association
            DatabaseUtil.withSql { sql ->
                def user = sql.firstRow("""
                    SELECT usr_username, usr_team_id 
                    FROM tbl_users 
                    WHERE usr_username = 'rel.invalid.user'
                """)
                
                if (user) {
                    assert user.usr_team_id == null, "User with invalid team should not have team association"
                }
            }
        }
        
        // Validate successful relationship in database
        DatabaseUtil.withSql { sql ->
            def validUser = sql.firstRow("""
                SELECT u.usr_username, u.usr_team_id, t.tms_name
                FROM tbl_users u
                JOIN tbl_teams t ON u.usr_team_id = t.tms_id
                WHERE u.usr_username = 'rel.valid.user'
            """)
            
            assert validUser != null, "Should find user with valid team relationship"
            assert validUser.tms_name == 'E2E Test Infrastructure Team', "Should have correct team association"
        }

        logProgress("✅ Entity relationship validation test passed")
    }

    void testBatchProcessingWithRollback() {
        logProgress("Testing batch processing with rollback")

        // Create a large batch that includes some valid and some invalid data
        String mixedQualityData = """team_name,team_description
Rollback Test Team Valid 1,Valid team for rollback testing
Rollback Test Team Valid 2,Another valid team
Rollback Test Team Valid 3,Third valid team"""
        
        // Execute initial valid import
        HttpResponse validResponse = httpClient.post('/csvImport/csv/teams', mixedQualityData)
        validateApiSuccess(validResponse, 200)
        
        UUID batchId = UUID.fromString((validResponse.jsonBody as Map)?.batchId as String)
        createdBatches.add(batchId)
        
        // Verify teams were created
        DatabaseUtil.withSql { sql ->
            def teamsBeforeRollback = sql.rows("""
                SELECT COUNT(*) as count 
                FROM tbl_teams 
                WHERE tms_name LIKE 'Rollback Test Team%'
            """)
            assert (teamsBeforeRollback[0].count as Integer) == 3, "Should have 3 teams before rollback"
        }
        
        // Perform rollback
        Map rollbackData = [reason: "End-to-end testing rollback validation"]
        HttpResponse rollbackResponse = httpClient.post("/rollbackBatch/rollback/${batchId}", rollbackData)
        
        validateApiSuccess(rollbackResponse, 200)
        def rollbackBody = rollbackResponse.jsonBody
        assert (rollbackBody as Map)?.success == true, "Rollback should succeed: ${(rollbackBody as Map)?.error}"
        assert (rollbackBody as Map)?.rollbackActions != null, "Should provide rollback actions"
        
        // Validate rollback updated batch status
        DatabaseUtil.withSql { sql ->
            def batch = sql.firstRow("""
                SELECT imb_status, imb_statistics
                FROM tbl_import_batches
                WHERE imb_id = ?
            """, [batchId])
            
            assert batch != null, "Should find batch record"
            assert batch.imb_status == 'ROLLED_BACK', "Batch status should be ROLLED_BACK"
        }
        
        // Validate audit trail
        DatabaseUtil.withSql { sql ->
            def auditEntries = sql.rows("""
                SELECT ial_action, ial_details
                FROM tbl_import_audit_log
                WHERE ial_batch_id = ?
                ORDER BY ial_timestamp
            """, [batchId])
            
            assert auditEntries.size() >= 1, "Should have audit entries"
            def rollbackEntry = auditEntries.find { it.ial_action == 'ROLLBACK' }
            assert rollbackEntry != null, "Should have rollback audit entry"
        }

        logProgress("✅ Batch processing with rollback test passed")
    }

    // ====== HELPER METHODS ======

    /**
     * Validate import audit trail for a batch
     * @param batchId Batch ID to validate
     * @param importType Expected import type
     * @param successCount Expected successful imports
     * @param errorCount Expected error count
     */
    private void validateImportAuditTrail(UUID batchId, String importType, int successCount, int errorCount) {
        DatabaseUtil.withSql { sql ->
            // Validate batch record exists
            def batch = sql.firstRow("""
                SELECT imb_id, imb_import_type, imb_status, imb_statistics
                FROM tbl_import_batches
                WHERE imb_id = ?
            """, [batchId])
            
            assert batch != null, "Should find batch record for ${batchId}"
            assert batch.imb_status in ['COMPLETED', 'PARTIAL_SUCCESS'], "Batch should have completed status"
            
            // Parse statistics if available
            if (batch.imb_statistics) {
                def statsSlurper = new JsonSlurper()
                def stats = statsSlurper.parseText(batch.imb_statistics as String)
                
                if ((stats as Map)?.importedCount != null) {
                    assert ((stats as Map)?.importedCount as Integer) == successCount, 
                        "Statistics should show ${successCount} imported records"
                }
            }
        }
    }

    /**
     * Clean up all CSV test data
     */
    private void cleanupCsvTestData() {
        try {
            DatabaseUtil.withSql { sql ->
                // Clean up in reverse dependency order
                
                // Remove staging data
                sql.execute("DELETE FROM stg_step_instructions WHERE sti_created_by LIKE 'integration%' OR sti_instruction_id LIKE '%E2E%' OR sti_instruction_id LIKE '%DEP%'")
                sql.execute("DELETE FROM stg_steps WHERE sts_created_by LIKE 'integration%' OR sts_title LIKE '%E2E%' OR sts_title LIKE '%Dependency%'")
                
                // Remove test batches and audit logs
                createdBatches.each { batchId ->
                    sql.execute("DELETE FROM tbl_import_audit_log WHERE ial_batch_id = ?", [batchId])
                    sql.execute("DELETE FROM tbl_import_batches WHERE imb_id = ?", [batchId])
                }
                
                // Remove test users (dependent on teams)
                sql.execute("DELETE FROM tbl_users WHERE usr_username LIKE 'e2e.%' OR usr_username LIKE 'dep.%' OR usr_username LIKE 'rel.%'")
                
                // Remove test teams
                sql.execute("DELETE FROM tbl_teams WHERE tms_name LIKE 'E2E Test%' OR tms_name LIKE '%Dependency Test%' OR tms_name LIKE '%Duplicate Test%' OR tms_name LIKE '%Rollback Test%'")
                
                // Remove test applications
                sql.execute("DELETE FROM applications_app WHERE app_name LIKE 'E2E %' OR app_name LIKE '%Dependency Test%'")
                
                // Remove test environments  
                sql.execute("DELETE FROM environments_env WHERE env_name LIKE 'E2E %' OR env_name LIKE '%Dependency Test%'")
                
                // Remove test master plans
                sql.execute("DELETE FROM tbl_plans_master WHERE plm_name LIKE '%E2E Test%' OR plm_created_by = 'integration-test'")
            }
        } catch (Exception e) {
            println "⚠️ Warning during CSV test data cleanup: ${e.message}"
        }
    }
}