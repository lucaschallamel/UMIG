#!/usr/bin/env groovy

import umig.repository.MigrationRepository

println "=== Debug Migration Creation ==="

def migrationData = [
    mig_name: "Test Migration ${System.currentTimeMillis()}",
    usr_id_owner: 1,
    mig_type: "MIGRATION",
    mig_status: 1,
    created_by: "admin",
    updated_by: "admin"
]

println "Test data:"
migrationData.each { key, value ->
    println "  ${key}: ${value} (${value?.class?.simpleName}) [length: ${value?.toString()?.length()}]"
}

try {
    def repository = new MigrationRepository()
    def result = repository.create(migrationData)
    println "✅ Created migration: ${result.mig_id}"
} catch (Exception e) {
    println "❌ Failed to create migration: ${e.message}"
    e.printStackTrace()
}