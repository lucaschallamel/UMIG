import com.onresolve.scriptrunner.db.DatabaseUtil
import groovy.sql.Sql

// Simple check for CUTOVER iterations with PROD environments
DatabaseUtil.withSql("umig_db_pool") { Sql sql ->
    println "=== Checking CUTOVER Iterations and PROD Environments ==="
    
    // 1. Count total CUTOVER iterations
    def cutoverCount = sql.firstRow('''
        SELECT COUNT(*) as count 
        FROM iterations_ite 
        WHERE itt_code = 'CUTOVER'
    ''')
    println "\nTotal CUTOVER iterations: ${cutoverCount.count}"
    
    // 2. Count CUTOVER iterations with PROD environments
    def cutoverWithProd = sql.firstRow('''
        SELECT COUNT(DISTINCT ite.ite_id) as count
        FROM iterations_ite ite
        JOIN environments_env_x_iterations_ite eei ON eei.ite_id = ite.ite_id
        JOIN environment_roles_enr enr ON eei.enr_id = enr.enr_id
        WHERE ite.itt_code = 'CUTOVER' AND enr.enr_name = 'PROD'
    ''')
    println "CUTOVER iterations with PROD environments: ${cutoverWithProd.count}"
    
    // 3. List first 5 CUTOVER iterations and their PROD environments
    println "\nFirst 5 CUTOVER iterations and their PROD environments:"
    def cutoverList = sql.rows('''
        SELECT 
            ite.ite_id,
            ite.ite_name,
            env.env_name,
            enr.enr_name as role_name
        FROM iterations_ite ite
        LEFT JOIN environments_env_x_iterations_ite eei ON eei.ite_id = ite.ite_id
        LEFT JOIN environment_roles_enr enr ON eei.enr_id = enr.enr_id AND enr.enr_name = 'PROD'
        LEFT JOIN environments_env env ON eei.env_id = env.env_id
        WHERE ite.itt_code = 'CUTOVER'
        ORDER BY ite.ite_name
        LIMIT 5
    ''')
    
    cutoverList.each { row ->
        if (row.env_name) {
            println "  - ${row.ite_name}: ${row.env_name} (${row.role_name})"
        } else {
            println "  - ${row.ite_name}: NO PROD ENVIRONMENT"
        }
    }
    
    // 4. Check environment role IDs
    println "\nEnvironment roles in the system:"
    def roles = sql.rows('SELECT enr_id, enr_name, enr_code FROM environment_roles_enr ORDER BY enr_name')
    roles.each { role ->
        println "  - ${role.enr_name} (ID: ${role.enr_id}, Code: ${role.enr_code})"
    }
    
    // 5. Sample step with PROD environment role
    println "\nSample steps with PROD environment role:"
    def prodSteps = sql.rows('''
        SELECT 
            sti.sti_id,
            stm.stt_code,
            stm.stm_number,
            sti.enr_id,
            enr.enr_name,
            ite.ite_name,
            ite.itt_code
        FROM steps_instance_sti sti
        JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
        JOIN environment_roles_enr enr ON sti.enr_id = enr.enr_id
        JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
        JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
        JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
        JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
        WHERE enr.enr_name = 'PROD' AND ite.itt_code = 'CUTOVER'
        LIMIT 3
    ''')
    
    prodSteps.each { step ->
        println "  - Step ${step.stt_code}-${step.stm_number} in ${step.ite_name} has role: ${step.enr_name}"
    }
}