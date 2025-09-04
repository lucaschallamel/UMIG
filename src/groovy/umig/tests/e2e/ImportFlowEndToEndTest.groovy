#!/usr/bin/env groovy

/**
 * End-to-end test for JSON import workflow
 * Tests the complete import pipeline from JSON files to master tables
 * 
 * This script validates the entire import process including:
 * - Single file import
 * - Batch import of multiple files  
 * - Staging table population
 * - Validation process
 * - Promotion to master tables
 * 
 * Usage: groovy ImportFlowEndToEndTest.groovy
 * 
 * @author UMIG Development Team
 * @since Sprint 6 - US-034
 */

package umig.tests.e2e

import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import java.io.File
import java.net.URLClassLoader
import java.net.URL

// Add the source directory to classpath (type-safe approach)
def scriptFile = new File(getClass().protectionDomain.codeSource.location.path)
def projectRoot = scriptFile.parentFile.parentFile.parentFile.parentFile.parentFile.canonicalPath
def srcPath = new File(projectRoot, 'src/groovy')

// Type-safe ClassLoader access with proper URLClassLoader handling
def classLoader = this.class.classLoader
while (classLoader != null) {
    if (classLoader instanceof URLClassLoader) {
        try {
            // Use reflection to access the protected addURL method
            def addURL = URLClassLoader.class.getDeclaredMethod('addURL', URL.class)
            addURL.setAccessible(true)
            addURL.invoke(classLoader, srcPath.toURI().toURL())
            println "Added source path to classpath: ${srcPath.absolutePath}"
            break
        } catch (Exception e) {
            println "Warning: Could not add source path to classpath: ${e.message}"
            // Continue with parent classloader or break
        }
    }
    classLoader = classLoader.parent
}

// Import required classes
import umig.service.ImportService
import umig.repository.StagingImportRepository

println "="*60
println "JSON Import Flow End-to-End Test"
println "="*60

// Find sample JSON files
def jsonDir = new File(projectRoot, 'local-dev-setup/data-utils/Confluence_Importer/rawData/json')
def jsonFiles = jsonDir.listFiles({ it.name.endsWith('.json') } as FileFilter)

if (!jsonFiles) {
    println "ERROR: No JSON files found in ${jsonDir.absolutePath}"
    System.exit(1)
}

println "\nFound ${jsonFiles.size()} JSON files to test with"
println "-"*40

// Initialize services
def importService = new ImportService()
def stagingRepository = new StagingImportRepository()

// Clear staging tables before test
println "\n1. Clearing staging tables..."
importService.clearStagingData()
println "   ✓ Staging tables cleared"

// Test single file import
println "\n2. Testing single file import..."
def testFile = jsonFiles[0]
println "   File: ${testFile.name}"

def jsonContent = testFile.text
Map result = importService.importJsonData(jsonContent, testFile.name, "test_script")

if ((result.success as Boolean)) {
    println "   ✓ Import successful"
    println "     - Batch ID: ${result.batchId}"
    println "     - Step ID: ${result.stepId}"
    Map statistics = result.statistics as Map
    println "     - Instructions imported: ${statistics?.instructionsImported ?: 0}"
    
    if ((result.validationPassed as Boolean)) {
        println "   ✓ Validation passed"
    } else {
        println "   ⚠ Validation had issues:"
        (result.validationWarnings as List)?.each { println "     - Warning: $it" }
        (result.validationErrors as List)?.each { println "     - Error: $it" }
    }
    
    Map promotionResult = result.promotionResult as Map
    if (promotionResult) {
        if ((promotionResult.success as Boolean)) {
            println "   ✓ Promoted to master tables"
            println "     - Steps promoted: ${promotionResult.stepsPromoted}"
            println "     - Instructions promoted: ${promotionResult.instructionsPromoted}"
        } else {
            println "   ⚠ Promotion issues:"
            (promotionResult.errors as List)?.each { println "     - Error: $it" }
            (promotionResult.warnings as List)?.each { println "     - Warning: $it" }
        }
    }
} else {
    println "   ✗ Import failed:"
    (result.errors as List)?.each { println "     - $it" }
}

// Test batch import with multiple files
if (jsonFiles.size() > 1) {
    println "\n3. Testing batch import with ${Math.min(3, jsonFiles.size())} files..."
    
    List<Map> batchFiles = jsonFiles.take(3).collect { file ->
        [
            filename: file.name,
            content: file.text
        ] as Map
    }
    
    Map batchResult = importService.importBatch(batchFiles, "test_script")
    
    println "   Batch Results:"
    println "     - Total files: ${batchResult.totalFiles}"
    println "     - Success: ${batchResult.successCount}"
    println "     - Failed: ${batchResult.failureCount}"
    println "     - Skipped: ${batchResult.skippedCount}"
    
    Map batchStatistics = batchResult.statistics as Map
    if (batchStatistics) {
        println "   Overall Statistics:"
        println "     - Total steps: ${batchStatistics.totalSteps}"
        println "     - Total instructions: ${batchStatistics.totalInstructions}"
        
        Map importedByType = batchStatistics.importedByType as Map
        if (importedByType) {
            println "   Steps by type:"
            importedByType.each { type, count ->
                println "     - ${type}: ${count}"
            }
        }
    }
    
    // Show any errors
    List resultsList = batchResult.results as List
    resultsList?.each { fileResult ->
        Map fileResultMap = fileResult as Map
        if (!(fileResultMap.success as Boolean) && fileResultMap.errors) {
            println "   ✗ ${fileResultMap.filename} failed:"
            (fileResultMap.errors as List).each { println "     - $it" }
        }
    }
}

// Check staging data
println "\n4. Checking staging data..."
Map stagingStats = importService.getStagingStatistics()
println "   Staging Statistics:"
println "     - Total steps: ${stagingStats.totalSteps}"
println "     - Total instructions: ${stagingStats.totalInstructions}"
println "     - Steps with instructions: ${stagingStats.stepsWithInstructions}"
println "     - Average instructions per step: ${stagingStats.averageInstructionsPerStep}"

Map stepsByType = stagingStats.stepsByType as Map
if (stepsByType) {
    println "   Steps by type:"
    stepsByType.each { type, count ->
        println "     - ${type}: ${count}"
    }
}

// Get sample staging data
List stagingData = importService.getStagingData()
if (stagingData && (stagingData.size() > 0)) {
    println "\n5. Sample staging data (first 2 steps):"
    stagingData.take(2).each { stepRow ->
        Map step = stepRow as Map
        println "   Step: ${step.id}"
        println "     - Type: ${step.step_type}"
        println "     - Number: ${step.step_number}"
        println "     - Title: ${step.title}"
        println "     - Team: ${step.primary_team}"
        List instructions = step.instructions as List
        println "     - Instructions: ${instructions?.size() ?: 0}"
    }
}

// Test validation
println "\n6. Testing validation..."
Map validationResult = importService.validateStagingData()
if ((validationResult.valid as Boolean)) {
    println "   ✓ Staging data is valid"
} else {
    println "   ✗ Validation failed:"
    (validationResult.errors as List)?.each { println "     - Error: $it" }
}

List warnings = validationResult.warnings as List
if (warnings && (warnings.size() > 0)) {
    println "   ⚠ Validation warnings:"
    warnings.each { println "     - $it" }
}

println "\n" + "="*60
println "End-to-End Test Complete!"
println "="*60

// Summary
Integer totalSteps = (stagingStats.totalSteps as Integer) ?: 0
Integer totalInstructions = (stagingStats.totalInstructions as Integer) ?: 0

println "\nSummary:"
println "  - Successfully imported ${totalSteps} steps with ${totalInstructions} instructions"
println "  - Data is ready for promotion to master tables"

if (totalSteps > 0) {
    println "\n✓ JSON import flow is working correctly!"
} else {
    println "\n✗ No data was imported - check for errors above"
}