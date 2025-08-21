#!/usr/bin/env groovy
import groovy.json.JsonSlurper

// Test script to verify JSON property casting works
def jsonText = '''
{
    "envId": "123",
    "scfKey": "test.key",
    "scfCategory": "TEST_CATEGORY",
    "scfValue": "test value",
    "scfDescription": "Test description",
    "scfIsActive": "true",
    "scfIsSystemManaged": "false",
    "changeReason": "Testing",
    "configurations": [
        {"key": "value1"},
        {"key": "value2"}
    ]
}
'''

def json = new JsonSlurper().parseText(jsonText)

println "Testing JSON property access with proper casting:"

// Test the patterns we fixed
try {
    def envId = (json as Map).envId as String
    def scfKey = (json as Map).scfKey as String
    def scfCategory = (json as Map).scfCategory as String
    def scfValue = (json as Map).scfValue as String
    def scfDescription = (json as Map).scfDescription as String
    def scfIsActive = (json as Map).scfIsActive != null ? Boolean.parseBoolean((json as Map).scfIsActive as String) : true
    def scfIsSystemManaged = (json as Map).scfIsSystemManaged != null ? Boolean.parseBoolean((json as Map).scfIsSystemManaged as String) : false
    def changeReason = (json as Map).changeReason as String
    def configurations = (json as Map).configurations as List

    println "✅ envId: $envId (${envId.class.simpleName})"
    println "✅ scfKey: $scfKey (${scfKey.class.simpleName})"
    println "✅ scfCategory: $scfCategory (${scfCategory.class.simpleName})"
    println "✅ scfValue: $scfValue (${scfValue.class.simpleName})"
    println "✅ scfDescription: $scfDescription (${scfDescription.class.simpleName})"
    println "✅ scfIsActive: $scfIsActive (${scfIsActive.class.simpleName})"
    println "✅ scfIsSystemManaged: $scfIsSystemManaged (${scfIsSystemManaged.class.simpleName})"
    println "✅ changeReason: $changeReason (${changeReason.class.simpleName})"
    println "✅ configurations: $configurations (${configurations.class.simpleName}) - size: ${configurations.size()}"

    println "\nAll JSON property access patterns work correctly with proper casting!"
} catch (Exception e) {
    println "❌ Error: ${e.message}"
    e.printStackTrace()
}