import com.onresolve.scriptrunner.db.DatabaseUtil
import groovy.sql.Sql

// Compare current environment assignments with expected rules
DatabaseUtil.withSql("umig_db_pool") { Sql sql ->
    println "=== Environment Assignment Analysis ==="
    
    // 1. Check if each iteration has all three roles
    println "\n1. Iterations missing required roles:"
    def missingRoles = sql.rows('''
        SELECT 
            ite.ite_id,
            ite.ite_name,
            ite.itt_code,
            STRING_AGG(DISTINCT enr.enr_name, ', ' ORDER BY enr.enr_name) as assigned_roles
        FROM iterations_ite ite
        LEFT JOIN environments_env_x_iterations_ite eei ON ite.ite_id = eei.ite_id
        LEFT JOIN environment_roles_enr enr ON eei.enr_id = enr.enr_id
        GROUP BY ite.ite_id, ite.ite_name, ite.itt_code
        HAVING COUNT(DISTINCT enr.enr_name) < 3 OR COUNT(DISTINCT enr.enr_name) IS NULL
        ORDER BY ite.itt_code, ite.ite_name
    ''')
    
    missingRoles.each { row ->
        println "  - ${row.itt_code} ${row.ite_name}: Has roles [${row.assigned_roles ?: 'NONE'}]"
    }
    
    // 2. Check PROD environment usage in RUN/DR iterations
    println "\n2. RUN/DR iterations using PROD environment (should be 0):"
    def runDrWithProd = sql.rows('''
        SELECT 
            ite.ite_name,
            ite.itt_code,
            env.env_name,
            enr.enr_name as role_name
        FROM iterations_ite ite
        JOIN environments_env_x_iterations_ite eei ON ite.ite_id = eei.ite_id
        JOIN environments_env env ON eei.env_id = env.env_id
        JOIN environment_roles_enr enr ON eei.enr_id = enr.enr_id
        WHERE ite.itt_code IN ('RUN', 'DR') AND env.env_name = 'PROD'
        ORDER BY ite.itt_code, ite.ite_name
    ''')
    
    if (runDrWithProd.size() == 0) {
        println "  ✓ Good! No RUN/DR iterations are using PROD environment"
    } else {
        runDrWithProd.each { row ->
            println "  ✗ ${row.itt_code} ${row.ite_name} uses PROD environment in ${row.role_name} role"
        }
    }
    
    // 3. Check CUTOVER iterations for PROD environment in PROD role
    println "\n3. CUTOVER iterations - PROD role assignments:"
    def cutoverProdRole = sql.rows('''
        SELECT 
            ite.ite_name,
            env.env_name,
            enr.enr_name as role_name
        FROM iterations_ite ite
        LEFT JOIN environments_env_x_iterations_ite eei ON ite.ite_id = eei.ite_id AND eei.enr_id = (SELECT enr_id FROM environment_roles_enr WHERE enr_name = 'PROD')
        LEFT JOIN environments_env env ON eei.env_id = env.env_id
        LEFT JOIN environment_roles_enr enr ON eei.enr_id = enr.enr_id
        WHERE ite.itt_code = 'CUTOVER'
        ORDER BY ite.ite_name
    ''')
    
    cutoverProdRole.each { row ->
        if (row.env_name == 'PROD') {
            println "  ✓ ${row.ite_name}: PROD environment in PROD role"
        } else if (row.env_name) {
            println "  ✗ ${row.ite_name}: ${row.env_name} environment in PROD role (should be PROD)"
        } else {
            println "  ✗ ${row.ite_name}: NO environment in PROD role"
        }
    }
    
    // 4. Summary statistics
    println "\n4. Overall statistics:"
    def stats = sql.firstRow('''
        SELECT 
            (SELECT COUNT(*) FROM iterations_ite) as total_iterations,
            (SELECT COUNT(DISTINCT ite_id) FROM environments_env_x_iterations_ite) as iterations_with_any_env,
            (SELECT COUNT(*) FROM iterations_ite WHERE itt_code = 'CUTOVER') as cutover_count,
            (SELECT COUNT(DISTINCT ite.ite_id) 
             FROM iterations_ite ite 
             JOIN environments_env_x_iterations_ite eei ON ite.ite_id = eei.ite_id
             GROUP BY ite.ite_id 
             HAVING COUNT(DISTINCT eei.enr_id) = 3) as iterations_with_all_roles
    ''')
    
    println "  - Total iterations: ${stats.total_iterations}"
    println "  - Iterations with at least one environment: ${stats.iterations_with_any_env}"
    println "  - Iterations with all 3 roles: ${stats.iterations_with_all_roles ?: 0}"
    println "  - CUTOVER iterations: ${stats.cutover_count}"
    
    // 5. Recommended fixes
    println "\n5. Recommended data fixes:"
    println "  - Ensure every iteration has all 3 roles (PROD, TEST, BACKUP)"
    println "  - Never assign PROD environment to RUN/DR iterations"
    println "  - Always assign PROD environment to PROD role in CUTOVER iterations"
    println "  - Use EV1-EV5 for non-production roles and RUN/DR iterations"
}