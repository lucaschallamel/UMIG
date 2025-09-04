#!/usr/bin/env groovy

/**
 * Test script for CSV parsing functionality
 * Tests the native Groovy CSV parser independently
 */

// Extract just the CSV parsing method for testing
List<String[]> parseCsvContent(String csvContent) {
    if (!csvContent?.trim()) {
        return []
    }
    
    List<String[]> rows = []
    String[] lines = csvContent.split(/\r?\n/)
    
    for (String line : lines) {
        if (line.trim().isEmpty()) {
            continue // Skip empty lines
        }
        
        List<String> fields = []
        StringBuilder currentField = new StringBuilder()
        boolean inQuotes = false
        boolean escapeNext = false
        
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i)
            
            if (escapeNext) {
                currentField.append(c)
                escapeNext = false
            } else if (c == '\\') {
                escapeNext = true
            } else if (c == '"') {
                inQuotes = !inQuotes
            } else if (c == ',' && !inQuotes) {
                fields.add(currentField.toString().trim())
                currentField = new StringBuilder()
            } else {
                currentField.append(c)
            }
        }
        
        // Add the last field
        fields.add(currentField.toString().trim())
        rows.add(fields as String[])
    }
    
    return rows
}

// Test cases
println "Testing CSV Parser..."

// Test 1: Basic CSV
String basicCsv = """tms_id,tms_name,tms_email,tms_description
1,Team Alpha,alpha@example.com,Development team
2,Team Beta,beta@example.com,Testing team"""

List<String[]> result1 = parseCsvContent(basicCsv)
println "Test 1 - Basic CSV: " + (result1.size() == 3 ? "PASS" : "FAIL")
println "  Headers: " + result1[0].join(", ")
println "  Row 1: " + result1[1].join(", ")

// Test 2: CSV with quoted fields and commas
String quotedCsv = """app_id,app_code,app_name,app_description
1,APP001,"Customer Management System","Manages customer data, billing, and support"
2,APP002,Inventory Tracker,Simple inventory tracking"""

List<String[]> result2 = parseCsvContent(quotedCsv)
println "Test 2 - Quoted CSV: " + (result2.size() == 3 ? "PASS" : "FAIL")
println "  Row 1 Description: " + result2[1][3]

// Test 3: Empty content
String emptyCsv = ""
List<String[]> result3 = parseCsvContent(emptyCsv)
println "Test 3 - Empty CSV: " + (result3.size() == 0 ? "PASS" : "FAIL")

// Test 4: CSV with empty lines
String csvWithEmptyLines = """env_id,env_code,env_name,env_description
1,DEV,Development,Development environment

2,TEST,Testing,Testing environment"""

List<String[]> result4 = parseCsvContent(csvWithEmptyLines)
println "Test 4 - CSV with empty lines: " + (result4.size() == 3 ? "PASS" : "FAIL")

println "CSV Parser testing completed successfully!"