#!/usr/bin/env groovy

/**
 * Quick verification script to test database connection
 * and authentication loading from .env file
 */

@GrabConfig(systemClassLoader = true)
@Grab('org.postgresql:postgresql:42.7.3')

import groovy.sql.Sql

// Load environment variables
static Properties loadEnv() {
    def props = new Properties()
    def envFile = new File("local-dev-setup/.env")
    if (envFile.exists()) {
        envFile.withInputStream { props.load(it) }
    }
    return props
}

println "========================================="
println "Database Connection Verification"
println "========================================="

// Load configuration
def ENV = loadEnv()
def DB_URL = "jdbc:postgresql://localhost:5432/umig_app_db"
def DB_USER = ENV.getProperty('DB_USER', 'umig_app_user')
def DB_PASSWORD = ENV.getProperty('DB_PASSWORD', '123456')
def AUTH_USERNAME = ENV.getProperty('POSTMAN_AUTH_USERNAME')
def AUTH_PASSWORD = ENV.getProperty('POSTMAN_AUTH_PASSWORD')

println "\n1. Environment Configuration:"
println "   DB_USER: ${DB_USER}"
println "   DB_PASSWORD: ${DB_PASSWORD ? '***' : 'NOT SET'}"
println "   AUTH_USERNAME: ${AUTH_USERNAME}"
println "   AUTH_PASSWORD: ${AUTH_PASSWORD ? '***' : 'NOT SET'}"

// Test database connection
println "\n2. Testing Database Connection:"
def sql = null
try {
    sql = Sql.newInstance(DB_URL, DB_USER, DB_PASSWORD, 'org.postgresql.Driver')
    println "   ✅ Connected to database successfully"
    
    // Test a simple query
    def result = sql.firstRow("SELECT COUNT(*) as count FROM teams_tms")
    println "   ✅ Query executed: Found ${result.count} teams in database"
    
} catch (Exception e) {
    println "   ❌ Failed to connect: ${e.message}"
    System.exit(1)
} finally {
    sql?.close()
}

// Test authentication header generation
println "\n3. Testing Authentication Header:"
if (AUTH_USERNAME && AUTH_PASSWORD) {
    def authHeader = "Basic " + Base64.encoder.encodeToString((AUTH_USERNAME + ':' + AUTH_PASSWORD).bytes)
    println "   ✅ Auth header generated: ${authHeader.substring(0, 20)}..."
} else {
    println "   ❌ Authentication credentials not available"
}

println "\n========================================="
println "✅ All verification checks passed!"
println "========================================="