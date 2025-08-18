-- Check Environment Associations for UMIG

-- 1. All Environments in the system
SELECT env_id, env_name, env_code
FROM environments_env
LIMIT 10;

-- 2. Environment-Iteration associations for PROD role
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
LIMIT 10;

-- 3. CUTOVER iterations and their PROD environments
SELECT 
    ite.ite_name,
    env.env_name,
    enr.enr_name as role_name
FROM iterations_ite ite
LEFT JOIN environments_env_x_iterations_ite eei ON ite.ite_id = eei.ite_id
LEFT JOIN environments_env env ON eei.env_id = env.env_id
LEFT JOIN environment_roles_enr enr ON eei.enr_id = enr.enr_id AND enr.enr_name = 'PROD'
WHERE ite.itt_code = 'CUTOVER'
LIMIT 10;

-- 4. Total associations in environments_env_x_iterations_ite
SELECT COUNT(*) as total_associations
FROM environments_env_x_iterations_ite;

-- 5. Check environment roles
SELECT enr_id, enr_name, enr_code
FROM environment_roles_enr;

-- 6. Check if CUTOVER iterations have ANY environment associations
SELECT 
    ite.ite_name,
    ite.itt_code,
    COUNT(eei.ite_id) as env_count
FROM iterations_ite ite
LEFT JOIN environments_env_x_iterations_ite eei ON ite.ite_id = eei.ite_id
WHERE ite.itt_code = 'CUTOVER'
GROUP BY ite.ite_id, ite.ite_name, ite.itt_code
LIMIT 10;