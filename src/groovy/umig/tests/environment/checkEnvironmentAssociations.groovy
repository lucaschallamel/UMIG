import com.onresolve.scriptrunner.db.DatabaseUtil
import groovy.sql.Sql

// Use the configured ScriptRunner database pool
DatabaseUtil.withSql("umig_db_pool") { Sql sql ->
    println "=== Checking Environment Associations ==="
    
    // First, check if we have any environments
    println "\n1. All Environments in the system:"
    def allEnvs = sql.rows('''
        SELECT env.env_id, env.env_name, env.env_code
        FROM environments_env env
        LIMIT 10
    ''')
    allEnvs.each { println "  - ${it.env_name} (${it.env_code})" }
    
    // Check environment-iteration associations
    println "\n2. Environment-Iteration associations for PROD:"
    def associations = sql.rows('''
        SELECT 
            ite.ite_name,
            ite.itt_code as iteration_type,
            env.env_name,
            enr.enr_name as role_name
        FROM environments_env_x_iterations_ite eei
        JOIN iterations_ite ite ON eei.ite_id = ite.ite_id
        JOIN environments_env env ON eei.env_id = env.env_id
        JOIN environment_roles_enr enr ON eei.enr_id = enr.enr_id
        WHERE enr.enr_name = 'PROD'
        LIMIT 10
    ''')
    
    if (associations.size() == 0) {
        println "  NO PROD environment associations found!"
    } else {
        associations.each { 
            println "  - Iteration: ${it.ite_name} (${it.iteration_type}) -> Environment: ${it.env_name} (${it.role_name})"
        }
    }
    
    // Check CUTOVER iterations specifically
    println "\n3. CUTOVER iterations and their PROD environments:"
    def cutoverAssociations = sql.rows('''
        SELECT 
            ite.ite_name,
            env.env_name,
            enr.enr_name as role_name
        FROM iterations_ite ite
        LEFT JOIN environments_env_x_iterations_ite eei ON ite.ite_id = eei.ite_id
        LEFT JOIN environments_env env ON eei.env_id = env.env_id
        LEFT JOIN environment_roles_enr enr ON eei.enr_id = enr.enr_id AND enr.enr_name = 'PROD'
        WHERE ite.itt_code = 'CUTOVER'
        LIMIT 10
    ''')
    
    cutoverAssociations.each { 
        if (it.env_name) {
            println "  - ${it.ite_name} -> ${it.env_name} (${it.role_name})"
        } else {
            println "  - ${it.ite_name} -> NO PROD ENVIRONMENT ASSIGNED"
        }
    }
    
    // Check if the junction table has any data at all
    println "\n4. Total associations in environments_env_x_iterations_ite:"
    def totalCount = sql.firstRow('SELECT COUNT(*) as count FROM environments_env_x_iterations_ite')
    println "  Total: ${totalCount.count}"
}