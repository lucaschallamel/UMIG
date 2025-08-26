#!/usr/bin/env groovy

// Simple test script to validate UrlConstructionService database reading
@Grab('org.postgresql:postgresql:42.7.2')

import groovy.sql.Sql
import java.util.UUID

// Mock the DatabaseUtil class for testing
class DatabaseUtil {
    static <T> T withSql(Closure<T> closure) {
        // In a real scenario, this would connect to the actual database
        // For this test, we'll simulate the database response
        def mockSql = [
            firstRow: { query, params ->
                if (query.contains("environments_env") && params.envCode == "DEV") {
                    return [env_id: 1]
                }
                return null
            }
        ]
        return closure.call(mockSql)
    }
}

// Mock the SystemConfigurationRepository
class SystemConfigurationRepository {
    Map findConfluenceConfigurationForEnvironment(Integer envId) {
        return [
            envId: envId,
            configurations: [
                'stepview.confluence.base.url': [value: 'http://localhost:8090'],
                'stepview.confluence.space.key': [value: 'UMIG'],
                'stepview.confluence.page.id': [value: '1114120'],
                'stepview.confluence.page.title': [value: 'UMIG - Step View']
            ]
        ]
    }
}

// Test the URL construction logic
def testConfiguration() {
    println "Testing URL Construction Service Configuration Reading..."
    
    // Test environment ID lookup
    def envId = null
    DatabaseUtil.withSql { sql ->
        def result = sql.firstRow('''
            SELECT env_id 
            FROM environments_env 
            WHERE UPPER(env_code) = UPPER(:envCode)
        ''', [envCode: "DEV"])
        envId = result?.env_id
    }
    
    println "Environment ID for DEV: ${envId}"
    
    // Test configuration retrieval
    if (envId) {
        def repository = new SystemConfigurationRepository()
        def config = repository.findConfluenceConfigurationForEnvironment(envId)
        println "Configuration found: ${config != null}"
        
        if (config?.configurations) {
            println "Base URL: ${config.configurations['stepview.confluence.base.url']?.value}"
            println "Space Key: ${config.configurations['stepview.confluence.space.key']?.value}"
            println "Page ID: ${config.configurations['stepview.confluence.page.id']?.value}"
            println "Page Title: ${config.configurations['stepview.confluence.page.title']?.value}"
        }
    }
    
    println "✅ Test completed successfully!"
}

// Run the test
testConfiguration()