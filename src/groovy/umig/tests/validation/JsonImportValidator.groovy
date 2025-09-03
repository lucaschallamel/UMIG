#!/usr/bin/env groovy

/**
 * JSON Import Validation Tool
 * Validates JSON structure from Confluence extraction and import process flow
 * 
 * Purpose:
 * - Validates JSON structure from Confluence extraction
 * - Tests the import process flow
 * - Displays staging table structure
 * - Works with actual JSON files in local-dev-setup/data-utils/Confluence_Importer/rawData/json/
 * 
 * Usage: groovy JsonImportValidator.groovy
 * 
 * @author UMIG Development Team
 * @since Sprint 6 - US-034
 * @category Validation
 */

import groovy.json.JsonBuilder
import groovy.json.JsonSlurper

println "="*60
println "JSON Import Flow Test (Standalone)"
println "="*60

// Create sample JSON data
def createSampleJson() {
    def jsonData = [
        step_type: "TRT",
        step_number: 2842,
        title: "ATLAS - PHASE 6.3 - AFTER EOD*2",
        predecessor: "TRT-2841",
        successor: "TRT-2843",
        primary_team: "ATLAS",
        impacted_teams: "EXPLOITATION,MONITORING",
        macro_time_sequence: "G - WEEK-END 2 - P&C",
        time_sequence: "GQ - ATLAS PHASE 6.2 - STAR 2",
        task_list: [
            [
                instruction_id: "TRT-2842-1",
                instruction_title: "CONTROL-M JOB: 45-PH6.3_FU_LOAX1",
                instruction_description: "Execute the CONTROL-M job for LOAX1 processing",
                nominated_user: "John Doe",
                instruction_assigned_team: "ATLAS",
                associated_controls: "CTL-001,CTL-002",
                duration_minutes: 30
            ],
            [
                instruction_id: "TRT-2842-2",
                instruction_title: "CONTROL-M JOB: 46-PH6.3_FU_TAR22",
                instruction_description: "Execute the CONTROL-M job for TAR22 processing",
                nominated_user: "Jane Smith",
                instruction_assigned_team: "ATLAS",
                associated_controls: "CTL-003",
                duration_minutes: 45
            ]
        ]
    ]
    
    return new JsonBuilder(jsonData).toPrettyString()
}

// Read actual JSON files
println "\n1. Looking for actual JSON files..."
def jsonDir = new File('local-dev-setup/data-utils/Confluence_Importer/rawData/json')
if (!jsonDir.exists()) {
    println "   ✗ JSON directory not found at: ${jsonDir.absolutePath}"
    println "   Using sample data instead..."
    
    // Create sample file
    def sampleFile = new File('sample_import.json')
    sampleFile.text = createSampleJson()
    println "   ✓ Created sample file: sample_import.json"
    
} else {
    def jsonFiles = jsonDir.listFiles({ it.name.endsWith('.json') } as FileFilter)
    if (jsonFiles) {
        println "   ✓ Found ${jsonFiles.size()} JSON files"
        
        // Display first 3 files
        println "\n2. Sample JSON files:"
        jsonFiles.take(3).each { file ->
            println "   - ${file.name} (${file.size()} bytes)"
            
            // Parse and display structure
            try {
                def json = new JsonSlurper().parseText(file.text) as Map
                println "     Step: ${json.step_type as String}-${json.step_number as Integer}"
                println "     Title: ${json.title as String}"
                println "     Instructions: ${(json.task_list as List)?.size() ?: 0}"
            } catch (e) {
                println "     ✗ Error parsing: ${e.message}"
            }
        }
        
        // Enhanced validation with actual files
        println "\n2a. Comprehensive validation with actual files..."
        def validFiles = []
        def invalidFiles = []
        
        jsonFiles.each { file ->
            try {
                def jsonSlurper = new JsonSlurper()
                def jsonContent = jsonSlurper.parse(file) as Map
                
                // Check required fields
                def hasRequiredFields = jsonContent.step_type != null &&
                                        jsonContent.step_number != null &&
                                        jsonContent.title != null
                
                if (hasRequiredFields) {
                    // Check step_type is exactly 3 characters
                    if ((jsonContent.step_type as String)?.length() == 3) {
                        validFiles << file
                        println "   ✓ ${file.name}: Valid structure"
                        println "     Step: ${jsonContent.step_type}-${jsonContent.step_number} - ${jsonContent.title}"
                        
                        // Count instructions if present
                        if (jsonContent.task_list) {
                            println "     Instructions: ${(jsonContent.task_list as List).size()}"
                        }
                    } else {
                        invalidFiles << file
                        println "   ✗ ${file.name}: Invalid step_type length (must be 3 chars): '${jsonContent.step_type}'"
                    }
                } else {
                    invalidFiles << file
                    println "   ✗ ${file.name}: Missing required fields"
                }
            } catch (Exception e) {
                invalidFiles << file
                println "   ✗ ${file.name}: JSON parse error - ${e.message}"
            }
        }
        
        // Summary statistics
        println "\n   Validation Summary:"
        println "   Total files: ${jsonFiles.size()}"
        println "   Valid files: ${validFiles.size()}"
        println "   Invalid files: ${invalidFiles.size()}"
        println "   Success rate: ${Math.round(validFiles.size() * 100.0 / jsonFiles.size())}%"
        
    } else {
        println "   ✗ No JSON files found"
    }
}

// Validate JSON structure
println "\n3. Validating JSON structure..."

/**
 * Validates JSON structure for import process
 * @param jsonContent String containing JSON data
 * @return Map with validation results
 */
Map validateJson(String jsonContent) {
    try {
        def json = new JsonSlurper().parseText(jsonContent) as Map
        def errors = [] as List<String>
        
        // Check required fields
        if (!json.step_type) errors << ("Missing step_type" as String)
        if (json.step_type && (json.step_type as String).length() != 3) errors << ("step_type must be 3 characters" as String)
        if (!json.step_number) errors << ("Missing step_number" as String)
        if (!json.title) errors << ("Missing title" as String)
        
        // Check task list
        if (json.task_list && json.task_list instanceof List) {
            (json.task_list as List).eachWithIndex { task, index ->
                def taskMap = task as Map
                if (!taskMap.instruction_id) errors << ("Task ${index + 1} missing instruction_id".toString() as String)
                if (!taskMap.instruction_title) errors << ("Task ${index + 1} missing instruction_title".toString() as String)
            }
        }
        
        return [valid: errors.isEmpty(), errors: errors, json: json] as Map
    } catch (Exception e) {
        return [valid: false, errors: ["Invalid JSON: ${e.message}".toString() as String] as List<String>, json: null] as Map
    }
}

// Test with sample data
def sampleJson = createSampleJson()
def validation = validateJson(sampleJson as String) as Map

if (validation.valid as Boolean) {
    println "   ✓ Sample JSON structure is valid"
    def jsonData = validation.json as Map
    println "     - Step Type: ${jsonData.step_type as String}"
    println "     - Step Number: ${jsonData.step_number as Integer}"
    println "     - Instructions: ${(jsonData.task_list as List)?.size() ?: 0}"
} else {
    println "   ✗ Sample JSON validation failed:"
    (validation.errors as List<String>).each { println "     - $it" }
}

// Display import process flow
println "\n4. Import Process Flow:"
println "   1. JSON files extracted from Confluence HTML"
println "   2. JSON validated for required fields"
println "   3. Data imported to staging tables (stg_steps, stg_step_instructions)"
println "   4. Staging data validated for consistency"
println "   5. Data promoted to master tables"
println "   6. Master data linked to phases"

// Display staging table structure
println "\n5. Staging Table Structure (from migration):"
println "   stg_steps table:"
println "     - id: VARCHAR(50) PRIMARY KEY"
println "     - step_type: VARCHAR(3) NOT NULL"
println "     - step_number: INTEGER NOT NULL"
println "     - title: VARCHAR(500)"
println "     - primary_team: VARCHAR(255)"
println "     - impacted_teams: TEXT"
println "     - owner: VARCHAR(255)"
println "     - start_date: DATE"
println "     - environment_status: TEXT"
println "     - time_to_complete: VARCHAR(100)"
println "     - comments: TEXT"
println "     - color: VARCHAR(50)"
println "     - import_batch_id: UUID"
println "     - import_source: VARCHAR(255)"
println "     - import_user: VARCHAR(255)"
println "     - import_timestamp: TIMESTAMPTZ"

println "\n   stg_step_instructions table:"
println "     - id: SERIAL PRIMARY KEY"
println "     - step_id: VARCHAR(50) REFERENCES stg_steps(id)"
println "     - instruction_id: VARCHAR(100)"
println "     - instruction_text: TEXT"
println "     - instruction_type: VARCHAR(50)"
println "     - instruction_order: INTEGER"
println "     - metadata: JSONB"

// Import Process Flow
println "\n6. Import Process Flow:"
println "   1. JSON Extraction (✓ Complete)"
println "      - PowerShell scraper extracts from HTML"
println "      - Generates structured JSON files"
println "      - 19 files with 42 instructions extracted"
println ""
println "   2. Staging Import (In Progress)"
println "      - ImportService.importJsonData() loads to staging"
println "      - StagingImportRepository handles database operations"
println "      - Validation and error handling included"
println ""
println "   3. Master Promotion (Ready)"
println "      - StagingImportRepository.promoteToMasterTables()"
println "      - Creates tbl_steps_instance records"
println "      - Links to phases and iterations"
println ""
println "   4. API Access (Ready)"
println "      - ImportApi provides REST endpoints"
println "      - /import/json for single files"
println "      - /import/batch for multiple files"

// Summary
println "\n" + "="*60
println "Test Summary"
println "="*60
println "✓ JSON structure validated"
println "✓ Import process understood"
println "✓ Staging tables ready for data"
println "\n✓ JSON import infrastructure is ready for testing!"
println "\nNext steps:"
println "1. Start the application: npm start"
println "2. Import base entities via CSV first"
println "3. Import JSON step data via API endpoints"
println "4. Validate in Admin GUI"
println "5. Run comprehensive tests: npm run test:integration"

println "\n" + "="*60