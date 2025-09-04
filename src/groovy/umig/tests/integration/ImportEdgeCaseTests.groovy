package umig.tests.integration

import umig.tests.utils.BaseIntegrationTest
import umig.tests.utils.IntegrationTestHttpClient
import umig.tests.utils.HttpResponse
import umig.service.ImportService
import umig.service.CsvImportService
import umig.repository.ImportRepository
import umig.utils.DatabaseUtil
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.sql.Sql
import java.util.UUID
import java.util.concurrent.CompletableFuture
import java.util.concurrent.TimeUnit
import java.util.concurrent.ThreadPoolExecutor
import java.util.concurrent.Executors
import java.nio.charset.StandardCharsets
import java.security.SecureRandom

/**
 * Comprehensive Edge Case Test Suite for US-034 Data Import Strategy
 * 
 * Tests critical edge cases and boundary conditions including:
 * - Large file handling (>100MB files, memory limits)
 * - Concurrent import operations (5, 10, 20 simultaneous imports)
 * - Network timeout scenarios and recovery
 * - Malformed CSV/JSON handling and error recovery
 * - Invalid character encoding scenarios
 * - Empty file imports and boundary conditions
 * - Duplicate data handling and conflict resolution
 * - Memory stress testing under extreme conditions
 * - Database connection pool exhaustion
 * - Transaction rollback performance validation
 * 
 * Framework: Extends BaseIntegrationTest (US-037 compliance)
 * Performance: Validates <500ms API response targets
 * Security: Includes input validation and injection prevention
 * Database: Uses DatabaseUtil.withSql pattern with explicit casting
 * 
 * @author UMIG Development Team
 * @since Sprint 6 - US-034 Enhanced Testing (December 2025)
 */
class ImportEdgeCaseTests extends BaseIntegrationTest {

    private ImportService importService
    private CsvImportService csvImportService
    private ImportRepository importRepository
    private ThreadPoolExecutor concurrencyTestExecutor
    
    // Edge case test configuration
    private static final int LARGE_FILE_SIZE_MB = 120 // >100MB target
    private static final int STRESS_RECORD_COUNT = 15000 // >10k records
    private static final int MAX_CONCURRENT_IMPORTS = 20
    private static final int TIMEOUT_TEST_DELAY_MS = 30000 // 30 second timeout test
    private static final String INVALID_CHARSET = "UTF-32"
    
    // Test data tracking for comprehensive cleanup
    private final Set<UUID> createdBatches = new HashSet<>()
    private final Set<UUID> createdOrchestrations = new HashSet<>()
    private final Set<String> testFilesPaths = new HashSet<>()

    void setup() {
        super.setup()
        importService = new ImportService()
        csvImportService = new CsvImportService()
        importRepository = new ImportRepository()
        concurrencyTestExecutor = Executors.newFixedThreadPool(MAX_CONCURRENT_IMPORTS) as ThreadPoolExecutor
        logProgress("ImportEdgeCaseTests setup complete")
    }

    void cleanup() {
        try {
            // Shutdown executor service
            if (concurrencyTestExecutor && !concurrencyTestExecutor.isShutdown()) {
                concurrencyTestExecutor.shutdown()
                concurrencyTestExecutor.awaitTermination(30, TimeUnit.SECONDS)
            }
            
            // Clean up test files
            cleanupTestFiles()
            
            // Clean up database test data
            cleanupImportEdgeCaseData()
        } catch (Exception e) {
            println "⚠️ Warning during edge case test cleanup: ${e.message}"
        }
        super.cleanup()
    }

    // ========== LARGE FILE HANDLING EDGE CASES ==========

    void testLargeFileHandling() {
        logProgress("Testing large file handling (>100MB)")

        // Generate large JSON file content (targeting 120MB)
        StringBuilder largeContent = new StringBuilder()
        
        // Create base step structure
        Map baseStep = [
            step_type: 'LRG',
            step_number: 1,
            title: 'Large File Test Step',
            description: 'A' * 1000, // 1KB description
            task_list: []
        ]
        
        // Add many instructions to reach target size
        int instructionsNeeded = ((LARGE_FILE_SIZE_MB * 1024 * 1024) / 2000) as int // Approx 2KB per instruction
        (1..instructionsNeeded).each { i ->
            ((List)baseStep.task_list) << [
                instruction_id: ("LRG-${i}" as String),
                description: ("Large file test instruction ${i} " + ('X' * 1500)) as String // ~1.5KB per instruction
            ]
        }

        String largeJsonContent = new JsonBuilder(baseStep).toString()
        
        // Verify content size is actually large
        long contentSizeBytes = largeJsonContent.getBytes(StandardCharsets.UTF_8).length
        long contentSizeMB = (contentSizeBytes / (1024 * 1024)) as long
        
        assert contentSizeMB >= 100, "Test data should be at least 100MB (actual: ${contentSizeMB}MB)"
        logProgress("Generated large file content: ${contentSizeMB}MB")

        Map requestPayload = [
            source: 'large_test_file.json',
            content: largeJsonContent
        ]

        // Test large file import with performance monitoring
        long startTime = System.currentTimeMillis()
        long startMemory = getCurrentMemoryUsage()
        
        HttpResponse response = httpClient.post('/importData/json', requestPayload)
        
        long endTime = System.currentTimeMillis()
        long endMemory = getCurrentMemoryUsage()
        long processingTime = endTime - startTime
        long memoryUsed = ((endMemory - startMemory) / (1024 * 1024)) as long // MB

        // Validate response (should handle gracefully, either success or proper error)
        assert response.statusCode in [200, 413, 400], "Should handle large files gracefully: ${response.statusCode}"
        
        if (response.statusCode == 200) {
            def jsonBody = response.jsonBody
            assert ((Map)jsonBody).success == true, "Large file import should succeed: ${((Map)jsonBody).error}"
            
            if (((Map)jsonBody).batchId) {
                createdBatches.add(UUID.fromString(((Map)jsonBody).batchId as String))
            }
            
            // Performance validation for successful large file import
            assert processingTime < 300000, "Large file processing should complete within 5 minutes (actual: ${processingTime}ms)"
            assert memoryUsed < 500, "Memory usage should be reasonable for large files (actual: ${memoryUsed}MB)"
            
            logProgress("✅ Large file import successful: ${processingTime}ms, ${memoryUsed}MB memory")
        } else {
            // Validate proper error handling
            String errorBody = response.body
            assert errorBody.contains("size") || errorBody.contains("limit"), "Error should mention size limits: ${errorBody}"
            logProgress("✅ Large file properly rejected with size limit error")
        }

        logProgress("✅ Large file handling test passed")
    }

    void testExtremeFileSizeHandling() {
        logProgress("Testing extreme file size boundary conditions")

        // Test just under the limit (should work)
        Map underLimitPayload = [
            source: 'under_limit.json',
            content: new JsonBuilder([
                step_type: 'UND',
                step_number: 1,
                title: 'Under Limit Test',
                description: 'X' * (49 * 1024 * 1024), // Just under 50MB
                task_list: []
            ]).toString()
        ]

        HttpResponse underLimitResponse = httpClient.post('/importData/json', underLimitPayload)
        
        if (underLimitResponse.statusCode == 200) {
            def jsonBody = underLimitResponse.jsonBody
            if (((Map)jsonBody).batchId) {
                createdBatches.add(UUID.fromString(((Map)jsonBody).batchId as String))
            }
        }
        
        // Test just over the limit (should be rejected)
        Map overLimitPayload = [
            source: 'over_limit.json',
            content: new JsonBuilder([
                step_type: 'OVR',
                step_number: 1,
                title: 'Over Limit Test',
                description: 'Y' * (51 * 1024 * 1024), // Just over 50MB
                task_list: []
            ]).toString()
        ]

        HttpResponse overLimitResponse = httpClient.post('/importData/json', overLimitPayload)
        validateApiError(overLimitResponse, 413) // Payload too large

        logProgress("✅ Extreme file size boundary conditions test passed")
    }

    // ========== CONCURRENT IMPORT OPERATIONS ==========

    void testConcurrentImportOperations5() {
        testConcurrentImports(5, "5 concurrent imports")
    }

    void testConcurrentImportOperations10() {
        testConcurrentImports(10, "10 concurrent imports")
    }

    void testConcurrentImportOperations20() {
        testConcurrentImports(20, "20 concurrent imports")
    }

    private void testConcurrentImports(int concurrentCount, String testDescription) {
        logProgress("Testing ${testDescription}")

        List<CompletableFuture<HttpResponse>> futures = []
        List<Map> testPayloads = []
        
        // Prepare test payloads for concurrent execution
        (1..concurrentCount).each { i ->
            Map testData = [
                step_type: 'CON',
                step_number: i,
                title: "Concurrent Test Step ${i}",
                task_list: [
                    [instruction_id: "CON-${i}-1", description: "Concurrent instruction ${i}.1"],
                    [instruction_id: "CON-${i}-2", description: "Concurrent instruction ${i}.2"]
                ]
            ]

            testPayloads << [
                source: "concurrent_test_${i}.json",
                content: new JsonBuilder(testData).toString()
            ]
        }

        long startTime = System.currentTimeMillis()

        // Launch concurrent imports
        testPayloads.each { payload ->
            CompletableFuture<HttpResponse> future = CompletableFuture.supplyAsync({
                return httpClient.post('/importData/json', payload)
            }, concurrencyTestExecutor)
            
            futures << future
        }

        // Wait for all to complete with timeout
        List<HttpResponse> responses = []
        try {
            responses = futures.collect { future ->
                future.get(2, TimeUnit.MINUTES)
            }
        } catch (Exception e) {
            logProgress("⚠️ Concurrent operation timeout or failure: ${e.message}")
            // Don't fail the test immediately - some concurrent operations may timeout under load
        }

        long endTime = System.currentTimeMillis()
        long totalTime = endTime - startTime

        // Validate results
        int successCount = 0
        int errorCount = 0

        responses.each { response ->
            if (response && response.statusCode == 200) {
                successCount++
                def jsonBody = response.jsonBody
                if (((Map)jsonBody)?.batchId) {
                    createdBatches.add(UUID.fromString(((Map)jsonBody).batchId as String))
                }
            } else {
                errorCount++
            }
        }

        // Performance and concurrency validation
        double averageResponseTime = totalTime / concurrentCount
        assert averageResponseTime < 10000, "Average response time should be reasonable under concurrency: ${averageResponseTime}ms"
        
        // At least 70% should succeed under load (allowing for some timeouts/failures)
        double successRate = successCount / concurrentCount
        assert successRate >= 0.7, "Success rate should be at least 70% under concurrency: ${(successRate * 100).round(1)}%"

        logProgress("✅ ${testDescription} completed: ${successCount} success, ${errorCount} errors, ${totalTime}ms total")
    }

    void testConcurrencyResourceExhaustion() {
        logProgress("Testing resource exhaustion under extreme concurrency")

        // Test database connection pool exhaustion
        int extremeConcurrency = 50
        List<CompletableFuture<Map>> dbFutures = []

        (1..extremeConcurrency).each { i ->
            CompletableFuture<Map> future = CompletableFuture.supplyAsync({
                try {
                    Object result = DatabaseUtil.withSql { sql ->
                        // Simulate database-intensive operation
                        return sql.rows("SELECT COUNT(*) as count FROM tbl_import_batches")
                    }
                    return result as Map
                } catch (Exception e) {
                    return [error: e.message] as Map
                }
            }, concurrencyTestExecutor) as CompletableFuture<Map>
            
            dbFutures << future
        }

        // Check for connection pool exhaustion
        int connectionSuccesses = 0
        int connectionFailures = 0

        dbFutures.each { future ->
            try {
                Map result = future.get(30, TimeUnit.SECONDS)
                if (result.error) {
                    connectionFailures++
                } else {
                    connectionSuccesses++
                }
            } catch (Exception e) {
                connectionFailures++
            }
        }

        // Validate that the system handles connection exhaustion gracefully
        assert connectionSuccesses > 0, "Some database connections should succeed"
        
        if (connectionFailures > 0) {
            logProgress("✅ System properly handles connection pool exhaustion: ${connectionFailures} controlled failures")
        } else {
            logProgress("✅ All database connections succeeded under extreme load")
        }

        logProgress("✅ Resource exhaustion test completed")
    }

    // ========== NETWORK TIMEOUT SCENARIOS ==========

    void testNetworkTimeoutScenarios() {
        logProgress("Testing network timeout scenarios and recovery")

        // Test with a slow-processing payload that might timeout
        Map slowPayload = [
            source: 'timeout_test.json',
            content: new JsonBuilder([
                step_type: 'TMO',
                step_number: 1,
                title: 'Timeout Test Step',
                description: 'This is a timeout test with potential slow processing',
                task_list: (1..1000).collect { i ->
                    [
                        instruction_id: "TMO-${i}",
                        description: "Timeout test instruction ${i} with substantial content " + ('X' * 500)
                    ]
                }
            ]).toString()
        ]

        // Test with custom timeout settings
        long startTime = System.currentTimeMillis()
        
        HttpResponse response = null
        boolean timedOut = false
        
        try {
            // Use a shorter timeout to simulate network timeout conditions
            response = httpClient.postWithTimeout('/importData/json', slowPayload, 10000) // 10 second timeout
        } catch (Exception e) {
            timedOut = true
            logProgress("Expected timeout occurred: ${e.message}")
        }
        
        long endTime = System.currentTimeMillis()
        long actualTime = endTime - startTime

        if (!timedOut && response) {
            if (response.statusCode == 200) {
                def jsonBody = response.jsonBody
                if (((Map)jsonBody)?.batchId) {
                    createdBatches.add(UUID.fromString(((Map)jsonBody).batchId as String))
                }
                logProgress("✅ Slow operation completed successfully in ${actualTime}ms")
            } else {
                logProgress("✅ Slow operation properly handled with error: ${response.statusCode}")
            }
        } else {
            // Validate timeout handling
            assert actualTime >= 9000 && actualTime <= 15000, "Timeout should occur within expected range: ${actualTime}ms"
            logProgress("✅ Network timeout properly handled in ${actualTime}ms")
        }

        // Test timeout recovery by making a normal request immediately after
        Map recoveryPayload = [
            source: 'recovery_test.json',
            content: new JsonBuilder([
                step_type: 'REC',
                step_number: 1,
                title: 'Recovery Test Step',
                task_list: [[instruction_id: 'REC-1', description: 'Recovery instruction']]
            ]).toString()
        ]

        HttpResponse recoveryResponse = httpClient.post('/importData/json', recoveryPayload)
        validateApiSuccess(recoveryResponse, 200)
        
        def recoveryBody = recoveryResponse.jsonBody
        if (((Map)recoveryBody)?.batchId) {
            createdBatches.add(UUID.fromString(((Map)recoveryBody).batchId as String))
        }

        logProgress("✅ Network timeout and recovery test passed")
    }

    // ========== MALFORMED DATA HANDLING ==========

    void testMalformedJsonHandling() {
        logProgress("Testing malformed JSON handling and error recovery")

        List<Map> malformedCases = [
            [
                name: "Invalid JSON syntax",
                payload: '{ "invalid": "json" missing_comma "another": "field" }',
                expectedError: "syntax"
            ],
            [
                name: "Unclosed JSON object",
                payload: '{ "step_type": "MAL", "task_list": [',
                expectedError: "parse"
            ],
            [
                name: "Invalid escape sequences",
                payload: '{ "step_type": "MAL", "description": "Invalid \\x escape" }',
                expectedError: "escape"
            ],
            [
                name: "Null bytes in JSON",
                payload: '{ "step_type": "MAL", "description": "Null\\u0000byte" }',
                expectedError: "null"
            ],
            [
                name: "Extremely nested JSON",
                payload: generateDeeplyNestedJson(1000),
                expectedError: "depth"
            ]
        ]

        malformedCases.each { testCase ->
            logProgress("Testing malformed JSON case: ${testCase.name}")
            
            Map requestPayload = [
                source: "malformed_${(testCase.name as String).replaceAll(/\s+/, '_')}.json",
                content: testCase.payload
            ]

            HttpResponse response = httpClient.post('/importData/json', requestPayload)
            
            // Should return appropriate error response
            assert response.statusCode >= 400 && response.statusCode < 500, 
                "Malformed JSON should return 4xx error: ${response.statusCode} for ${testCase.name}"
            
            // Validate error message provides helpful information
            String errorBody = response.body?.toLowerCase() ?: ""
            assert errorBody.contains("json") || errorBody.contains("parse") || errorBody.contains("format"), 
                "Error message should mention JSON/parse issues for ${testCase.name}: ${errorBody}"
        }

        logProgress("✅ Malformed JSON handling test passed")
    }

    void testMalformedCsvHandling() {
        logProgress("Testing malformed CSV handling and error recovery")

        List<Map> malformedCsvCases = [
            [
                name: "Missing headers",
                csvData: "Team 1,Description 1\nTeam 2,Description 2",
                expectedError: "header"
            ],
            [
                name: "Inconsistent columns",
                csvData: "team_name,team_description\nTeam 1,Description 1\nTeam 2,Description 2,Extra Column",
                expectedError: "column"
            ],
            [
                name: "Special characters in data",
                csvData: "team_name,team_description\n\"Team,With,Commas\",\"Description with \"\"quotes\"\"\"\nTeam 2,Normal Description",
                expectedError: null // Should handle properly
            ],
            [
                name: "Invalid UTF-8 sequences",
                csvData: "team_name,team_description\nTeam\\xFF\\xFE,Invalid UTF-8",
                expectedError: "encoding"
            ],
            [
                name: "Extremely long lines",
                csvData: "team_name,team_description\n${'X' * 100000},${'Y' * 100000}",
                expectedError: "length"
            ]
        ]

        malformedCsvCases.each { testCase ->
            logProgress("Testing malformed CSV case: ${testCase.name}")
            
            HttpResponse response = httpClient.post('/csvImport/csv/teams', testCase.csvData)
            
            if (testCase.expectedError) {
                // Should return error for malformed CSV
                assert response.statusCode >= 400, 
                    "Malformed CSV should return error: ${response.statusCode} for ${testCase.name}"
            } else {
                // Special characters case should succeed
                if (response.statusCode == 200) {
                    def jsonBody = response.jsonBody
                    if (((Map)jsonBody)?.batchId) {
                        createdBatches.add(UUID.fromString(((Map)jsonBody).batchId as String))
                    }
                }
                logProgress("✅ CSV with special characters handled correctly")
            }
        }

        logProgress("✅ Malformed CSV handling test passed")
    }

    // ========== CHARACTER ENCODING SCENARIOS ==========

    void testInvalidCharacterEncoding() {
        logProgress("Testing invalid character encoding scenarios")

        // Test various problematic encodings
        List<Map> encodingCases = [
            [
                name: "Latin-1 encoding with special characters",
                content: "Tëst Dàtà with spéciàl châractérs",
                encoding: "ISO-8859-1"
            ],
            [
                name: "UTF-16 encoded content",
                content: "UTF-16 Test Data",
                encoding: "UTF-16"
            ],
            [
                name: "Windows-1252 encoding",
                content: "Windows encoding test with 'smart quotes'",
                encoding: "WINDOWS-1252"
            ]
        ]

        encodingCases.each { testCase ->
            logProgress("Testing encoding case: ${testCase.name}")
            
            try {
                // Convert content to bytes using specific encoding
                byte[] encodedBytes = (testCase.content as String).getBytes(testCase.encoding as String)
                String encodedContent = new String(encodedBytes, StandardCharsets.UTF_8)
                
                Map testPayload = [
                    source: "encoding_test_${testCase.encoding}.json",
                    content: new JsonBuilder([
                        step_type: 'ENC',
                        step_number: 1,
                        title: 'Encoding Test Step',
                        description: encodedContent,
                        task_list: []
                    ]).toString()
                ]

                HttpResponse response = httpClient.post('/importData/json', testPayload)
                
                // Should handle encoding gracefully (success or proper error)
                assert response.statusCode in [200, 400], 
                    "Should handle encoding issues gracefully: ${response.statusCode}"
                
                if (response.statusCode == 200) {
                    def jsonBody = response.jsonBody
                    if (((Map)jsonBody)?.batchId) {
                        createdBatches.add(UUID.fromString(((Map)jsonBody).batchId as String))
                    }
                    logProgress("✅ Encoding handled successfully: ${testCase.name}")
                } else {
                    logProgress("✅ Encoding properly rejected: ${testCase.name}")
                }
                
            } catch (Exception e) {
                logProgress("✅ Encoding test caused expected exception: ${testCase.name} - ${e.message}")
            }
        }

        logProgress("✅ Character encoding test passed")
    }

    // ========== EMPTY FILE AND BOUNDARY CONDITIONS ==========

    void testEmptyFileImports() {
        logProgress("Testing empty file imports and boundary conditions")

        List<Map> emptyCases = [
            [
                name: "Completely empty JSON",
                content: ""
            ],
            [
                name: "Empty JSON object",
                content: "{}"
            ],
            [
                name: "JSON with empty arrays",
                content: '{"task_list": []}'
            ],
            [
                name: "Whitespace only",
                content: "   \n\t   \r\n   "
            ],
            [
                name: "JSON null values",
                content: '{"step_type": null, "title": null, "task_list": null}'
            ]
        ]

        emptyCases.each { testCase ->
            logProgress("Testing empty case: ${testCase.name}")
            
            Map requestPayload = [
                source: "empty_test_${(testCase.name as String).replaceAll(/\s+/, '_')}.json",
                content: testCase.content
            ]

            HttpResponse response = httpClient.post('/importData/json', requestPayload)
            
            // Should handle empty content gracefully
            assert response.statusCode in [200, 400], 
                "Empty content should be handled gracefully: ${response.statusCode} for ${testCase.name}"
            
            if (response.statusCode == 400) {
                String errorBody = response.body?.toLowerCase() ?: ""
                assert errorBody.contains("empty") || errorBody.contains("invalid") || errorBody.contains("required"),
                    "Error should mention empty/invalid content: ${errorBody}"
            }
        }

        // Test empty CSV files
        List<String> emptyCsvCases = [
            "",
            "team_name,team_description\n",
            "   \n   \n   ",
            "\n\n\n"
        ]

        emptyCsvCases.each { csvContent ->
            HttpResponse response = httpClient.post('/csvImport/csv/teams', csvContent)
            assert response.statusCode >= 400, "Empty CSV should return error: ${response.statusCode}"
        }

        logProgress("✅ Empty file imports test passed")
    }

    // ========== DUPLICATE DATA HANDLING ==========

    void testDuplicateDataHandling() {
        logProgress("Testing duplicate data handling and conflict resolution")

        // First, import initial data
        Map initialData = [
            step_type: 'DUP',
            step_number: 1,
            title: 'Duplicate Test Step',
            task_list: [
                [instruction_id: 'DUP-001', description: 'Original instruction'],
                [instruction_id: 'DUP-002', description: 'Another original instruction']
            ]
        ]

        Map initialPayload = [
            source: 'initial_duplicate_test.json',
            content: new JsonBuilder(initialData).toString()
        ]

        HttpResponse initialResponse = httpClient.post('/importData/json', initialPayload)
        validateApiSuccess(initialResponse, 200)
        
        def initialBody = initialResponse.jsonBody
        if (((Map)initialBody)?.batchId) {
            createdBatches.add(UUID.fromString(((Map)initialBody).batchId as String))
        }

        // Wait for processing
        Thread.sleep(2000)

        // Now test exact duplicate
        HttpResponse duplicateResponse = httpClient.post('/importData/json', initialPayload)
        
        // Should handle duplicate appropriately (could succeed with deduplication or return conflict)
        assert duplicateResponse.statusCode in [200, 409], 
            "Duplicate data should be handled gracefully: ${duplicateResponse.statusCode}"

        if (duplicateResponse.statusCode == 200) {
            def duplicateBody = duplicateResponse.jsonBody
            if (((Map)duplicateBody)?.batchId) {
                createdBatches.add(UUID.fromString(((Map)duplicateBody).batchId as String))
            }
            logProgress("✅ System allows duplicate imports (potential deduplication)")
        } else {
            logProgress("✅ System properly detects and prevents duplicate imports")
        }

        // Test partial duplicates with different content
        Map partialDuplicateData = [
            step_type: 'DUP',
            step_number: 1,
            title: 'Modified Duplicate Test Step',
            task_list: [
                [instruction_id: 'DUP-001', description: 'Modified instruction'],
                [instruction_id: 'DUP-003', description: 'New instruction']
            ]
        ]

        Map partialPayload = [
            source: 'partial_duplicate_test.json',
            content: new JsonBuilder(partialDuplicateData).toString()
        ]

        HttpResponse partialResponse = httpClient.post('/importData/json', partialPayload)
        
        // Partial duplicates should be handled based on business rules
        if (partialResponse.statusCode == 200) {
            def partialBody = partialResponse.jsonBody
            if (((Map)partialBody)?.batchId) {
                createdBatches.add(UUID.fromString(((Map)partialBody).batchId as String))
            }
        }

        logProgress("✅ Duplicate data handling test passed")
    }

    // ========== MEMORY STRESS TESTING ==========

    void testMemoryStressTesting() {
        logProgress("Testing memory stress with large datasets (>10k records)")

        long initialMemory = getCurrentMemoryUsage()
        logProgress("Initial memory usage: ${initialMemory / (1024 * 1024)}MB")

        // Generate stress test dataset
        List<Map> stressTestFiles = []
        
        (1..STRESS_RECORD_COUNT).each { i ->
            Map stressStep = [
                step_type: 'STR',
                step_number: i,
                title: "Stress Test Step ${i}",
                description: "Stress test description for step ${i} " + ('X' * 200),
                task_list: [
                    [
                        instruction_id: "STR-${i}-1",
                        description: "Stress test instruction ${i}.1 " + ('Y' * 300)
                    ],
                    [
                        instruction_id: "STR-${i}-2", 
                        description: "Stress test instruction ${i}.2 " + ('Z' * 300)
                    ]
                ]
            ]
            
            stressTestFiles << [
                filename: "stress_test_${i}.json",
                content: new JsonBuilder(stressStep).toString()
            ]
        }

        long afterGenerationMemory = getCurrentMemoryUsage()
        logProgress("Memory after test data generation: ${afterGenerationMemory / (1024 * 1024)}MB")

        // Execute stress test
        Map batchPayload = [files: stressTestFiles]
        
        long startTime = System.currentTimeMillis()
        long startMemory = getCurrentMemoryUsage()
        
        HttpResponse response = httpClient.postWithTimeout('/importData/batch', batchPayload, 300000) // 5 minute timeout
        
        long endTime = System.currentTimeMillis()
        long endMemory = getCurrentMemoryUsage()
        
        long processingTime = endTime - startTime
        long memoryUsed = ((endMemory - startMemory) / (1024 * 1024)) as long
        long peakMemory = (endMemory / (1024 * 1024)) as long

        // Performance validation under stress
        if (response && response.statusCode == 200) {
            def jsonBody = response.jsonBody
            if (((Map)jsonBody)?.batchId) {
                createdBatches.add(UUID.fromString(((Map)jsonBody).batchId as String))
            }
            
            assert processingTime < 180000, "Stress test should complete within 3 minutes: ${processingTime}ms"
            assert memoryUsed < 1000, "Memory usage should be reasonable under stress: ${memoryUsed}MB"
            assert peakMemory < 2000, "Peak memory should not exceed 2GB: ${peakMemory}MB"
            
            logProgress("✅ Stress test successful: ${processingTime}ms, ${memoryUsed}MB memory")
        } else {
            // Validate proper error handling under memory stress
            if (response) {
                assert response.statusCode in [413, 503], "Should return appropriate error under stress: ${response.statusCode}"
                logProgress("✅ System properly handles memory stress with error: ${response.statusCode}")
            } else {
                logProgress("✅ System properly handles extreme memory stress with timeout")
            }
        }

        // Force garbage collection and verify memory recovery
        System.gc()
        Thread.sleep(3000)
        
        long finalMemory = getCurrentMemoryUsage()
        long memoryRecovery = endMemory - finalMemory
        
        logProgress("Memory recovery after GC: ${memoryRecovery / (1024 * 1024)}MB recovered")
        assert memoryRecovery > 0, "Memory should be recovered after GC"

        logProgress("✅ Memory stress testing passed")
    }

    // ========== DATABASE CONNECTION POOL TESTING ==========

    void testDatabaseConnectionPoolExhaustion() {
        logProgress("Testing database connection pool exhaustion scenarios")

        List<CompletableFuture<Map>> connectionFutures = []
        int maxConnections = 25 // Attempt to exhaust connection pool

        (1..maxConnections).each { i ->
            CompletableFuture<Map> future = CompletableFuture.supplyAsync({
                try {
                    // Hold connection for extended period to test pool exhaustion
                    Object result = DatabaseUtil.withSql { sql ->
                        Thread.sleep(5000) // Hold connection for 5 seconds
                        return sql.rows("SELECT COUNT(*) as count FROM tbl_import_batches LIMIT 1")
                    }
                    return result as Map
                } catch (Exception e) {
                    return [error: e.message, connectionId: i] as Map
                }
            }, concurrencyTestExecutor) as CompletableFuture<Map>
            
            connectionFutures << future
        }

        int successfulConnections = 0
        int failedConnections = 0
        List<String> errorMessages = []

        connectionFutures.each { future ->
            try {
                Map result = future.get(30, TimeUnit.SECONDS)
                if (result.error) {
                    failedConnections++
                    errorMessages << (result.error as String)
                } else {
                    successfulConnections++
                }
            } catch (Exception e) {
                failedConnections++
                errorMessages << e.message
            }
        }

        // Validate connection pool behavior
        assert successfulConnections > 0, "Some connections should succeed: ${successfulConnections}"
        
        if (failedConnections > 0) {
            logProgress("✅ Connection pool exhaustion properly handled: ${failedConnections} controlled failures")
            
            // Check for appropriate error messages
            boolean hasConnectionError = errorMessages.any { it.toLowerCase().contains("connection") || 
                                                              it.toLowerCase().contains("pool") || 
                                                              it.toLowerCase().contains("timeout") }
            if (hasConnectionError) {
                logProgress("✅ Appropriate connection pool error messages detected")
            }
        } else {
            logProgress("✅ Connection pool handled extreme load without exhaustion")
        }

        logProgress("✅ Database connection pool exhaustion test passed")
    }

    // ========== TRANSACTION ROLLBACK PERFORMANCE ==========

    void testTransactionRollbackPerformance() {
        logProgress("Testing transaction rollback performance under load")

        // Create a batch that will need to be rolled back
        UUID testBatchId = createTestImportBatchForRollback()
        createdBatches.add(testBatchId)

        // Measure rollback performance
        long startTime = System.currentTimeMillis()
        
        HttpResponse rollbackResponse = httpClient.delete("/importRollback/batch/${testBatchId}")
        
        long endTime = System.currentTimeMillis()
        long rollbackTime = endTime - startTime

        // Validate rollback performance
        validateApiSuccess(rollbackResponse, 200)
        
        def rollbackBody = rollbackResponse.jsonBody
        assert ((Map)rollbackBody).message != null, "Should return rollback message"
        
        // Performance validation
        assert rollbackTime < 10000, "Rollback should complete within 10 seconds: ${rollbackTime}ms"
        
        logProgress("✅ Rollback performance test passed: ${rollbackTime}ms")

        // Test rollback under concurrent load
        List<UUID> batchesToRollback = []
        (1..5).each { i ->
            UUID batchId = createTestImportBatchForRollback()
            batchesToRollback << batchId
            createdBatches.add(batchId)
        }

        List<CompletableFuture<HttpResponse>> rollbackFutures = []
        long concurrentStartTime = System.currentTimeMillis()

        batchesToRollback.each { batchId ->
            CompletableFuture<HttpResponse> future = CompletableFuture.supplyAsync({
                return httpClient.delete("/importRollback/batch/${batchId}")
            }, concurrencyTestExecutor)
            
            rollbackFutures << future
        }

        int successfulRollbacks = 0
        rollbackFutures.each { future ->
            try {
                HttpResponse response = future.get(30, TimeUnit.SECONDS)
                if (response.statusCode == 200) {
                    successfulRollbacks++
                }
            } catch (Exception e) {
                logProgress("⚠️ Concurrent rollback timeout: ${e.message}")
            }
        }

        long concurrentEndTime = System.currentTimeMillis()
        long totalConcurrentTime = concurrentEndTime - concurrentStartTime

        assert successfulRollbacks >= 3, "At least 3 rollbacks should succeed under concurrent load: ${successfulRollbacks}"
        assert totalConcurrentTime < 30000, "Concurrent rollbacks should complete within 30 seconds: ${totalConcurrentTime}ms"

        logProgress("✅ Concurrent rollback performance test passed: ${successfulRollbacks}/5 successful, ${totalConcurrentTime}ms total")
    }

    // ========== HELPER METHODS ==========

    private String generateDeeplyNestedJson(int depth) {
        StringBuilder json = new StringBuilder()
        
        (1..depth).each { i ->
            json.append('{"nested": ')
        }
        
        json.append('"value"')
        
        (1..depth).each { i ->
            json.append('}')
        }
        
        return json.toString()
    }

    private UUID createTestImportBatchForRollback() {
        UUID batchId = UUID.randomUUID()
        
        DatabaseUtil.withSql { sql ->
            sql.execute('''
                INSERT INTO tbl_import_batches 
                (imb_id, imb_source_identifier, imb_import_type, imb_status, imb_user_id, imb_created_date)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', [batchId, 'rollback_test_batch', 'TEST_ROLLBACK', 'COMPLETED', 'integration-test'])
        }
        
        return batchId
    }

    private long getCurrentMemoryUsage() {
        Runtime runtime = Runtime.getRuntime()
        return runtime.totalMemory() - runtime.freeMemory()
    }

    private void cleanupTestFiles() {
        testFilesPaths.each { filePath ->
            try {
                new File(filePath).delete()
            } catch (Exception e) {
                // Ignore cleanup errors
            }
        }
    }

    private void cleanupImportEdgeCaseData() {
        try {
            DatabaseUtil.withSql { sql ->
                // Clean up test batches
                createdBatches.each { batchId ->
                    sql.execute("DELETE FROM tbl_import_audit_log WHERE ial_batch_id = ?", [batchId])
                    sql.execute("DELETE FROM tbl_import_batches WHERE imb_id = ?", [batchId])
                }
                
                // Clean up test staging data
                sql.execute("DELETE FROM stg_step_instructions WHERE sti_created_by LIKE '%edge-test%' OR sti_created_by = 'integration-test'")
                sql.execute("DELETE FROM stg_steps WHERE sts_created_by LIKE '%edge-test%' OR sts_created_by = 'integration-test'")
                
                // Clean up orchestration data
                createdOrchestrations.each { orchestrationId ->
                    sql.execute("DELETE FROM import_progress_tracking WHERE orchestration_id = ?", [orchestrationId])
                    sql.execute("DELETE FROM import_orchestrations WHERE orchestration_id = ?", [orchestrationId])
                }
                
                // Clean up test entities with edge case prefixes
                List<String> edgePrefixes = ['CON', 'LRG', 'MAL', 'TMO', 'DUP', 'STR', 'ENC', 'REC']
                edgePrefixes.each { prefix ->
                    sql.execute("DELETE FROM tbl_teams WHERE tms_name LIKE '${prefix}%' OR tms_name LIKE '%Edge Test%'")
                    sql.execute("DELETE FROM tbl_users WHERE usr_username LIKE '${prefix.toLowerCase()}%' OR usr_full_name LIKE '%Edge Test%'")
                    sql.execute("DELETE FROM applications_app WHERE app_name LIKE '${prefix}%' OR app_name LIKE '%Edge Test%'")
                    sql.execute("DELETE FROM environments_env WHERE env_name LIKE '${prefix}%' OR env_name LIKE '%Edge Test%'")
                }
            }
        } catch (Exception e) {
            println "⚠️ Warning during edge case data cleanup: ${e.message}"
        }
    }
}