/**
 * Quick test script to verify MigrationRepository computed counts functionality
 */
@Grab('org.postgresql:postgresql:42.7.1')
import groovy.sql.Sql
import java.util.UUID

// Import the repository
class DatabaseUtil {
    static def withSql(Closure closure) {
        def sql = Sql.newInstance(
            'jdbc:postgresql://localhost:5432/umig', 
            'umig_app_user', 
            'umig_app_password', 
            'org.postgresql.Driver'
        )
        try {
            return closure(sql)
        } finally {
            sql.close()
        }
    }
}

// Import the repository class (simplified inline version for testing)
class TestMigrationRepository {
    
    def findAllMigrations() {
        DatabaseUtil.withSql { sql ->
            def migrations = sql.rows("""
                SELECT m.mig_id, m.mig_name,
                       COALESCE(iteration_counts.iteration_count, 0) as iteration_count,
                       COALESCE(plan_counts.plan_count, 0) as plan_count
                FROM migrations_mig m
                LEFT JOIN (
                    SELECT mig_id, COUNT(*) as iteration_count
                    FROM iterations_ite
                    GROUP BY mig_id
                ) iteration_counts ON m.mig_id = iteration_counts.mig_id
                LEFT JOIN (
                    SELECT ite.mig_id, COUNT(DISTINCT ite.plm_id) as plan_count
                    FROM iterations_ite ite
                    GROUP BY ite.mig_id
                ) plan_counts ON m.mig_id = plan_counts.mig_id
                ORDER BY m.mig_name
                LIMIT 5
            """)
            
            return migrations
        }
    }
}

// Test the functionality
println "Testing MigrationRepository computed counts..."
def repo = new TestMigrationRepository()

try {
    def migrations = repo.findAllMigrations()
    
    println "\nFound ${migrations.size()} migrations with computed counts:"
    migrations.each { migration ->
        println "Migration: ${migration.mig_name}"
        println "  - Iterations: ${migration.iteration_count}"
        println "  - Plans: ${migration.plan_count}"
        println ""
    }
    
    // Verify that all results have the computed fields
    def hasComputedFields = migrations.every { 
        it.hasProperty('iteration_count') && it.hasProperty('plan_count') 
    }
    
    if (hasComputedFields) {
        println "✅ SUCCESS: All migrations have computed iteration_count and plan_count fields"
    } else {
        println "❌ FAILURE: Some migrations are missing computed fields"
    }
    
} catch (Exception e) {
    println "❌ ERROR: ${e.message}"
    e.printStackTrace()
}