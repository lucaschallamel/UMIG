-- Verify StepView Configuration Data
-- Run this script to check if the system configuration is properly loaded

-- Check if system_configuration_scf table exists
SELECT 'system_configuration_scf table' as check_type,
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.tables 
           WHERE table_name = 'system_configuration_scf'
       ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check if environments table has data
SELECT 'environments_env data' as check_type,
       CASE WHEN COUNT(*) > 0 THEN '✅ DATA FOUND (' || COUNT(*) || ' records)' 
            ELSE '❌ NO DATA' END as status
FROM information_schema.tables t 
LEFT JOIN environments_env e ON t.table_name = 'environments_env'
WHERE t.table_name = 'environments_env';

-- Check if system configuration has MACRO_LOCATION data
SELECT 'MACRO_LOCATION configs' as check_type,
       CASE WHEN COUNT(*) > 0 THEN '✅ CONFIGS FOUND (' || COUNT(*) || ' records)' 
            ELSE '❌ NO CONFIGS' END as status
FROM information_schema.tables t 
LEFT JOIN system_configuration_scf s ON t.table_name = 'system_configuration_scf'
WHERE t.table_name = 'system_configuration_scf' 
  AND (s.scf_category = 'MACRO_LOCATION' OR s.scf_category IS NULL);

-- Show actual MACRO_LOCATION configurations if they exist
SELECT '=== MACRO_LOCATION Configuration Data ===' as section;

SELECT 
    e.env_code,
    e.env_name,
    s.scf_key,
    s.scf_value,
    s.scf_is_active,
    s.created_at
FROM system_configuration_scf s
JOIN environments_env e ON s.env_id = e.env_id
WHERE s.scf_category = 'MACRO_LOCATION'
  AND s.scf_is_active = true
ORDER BY e.env_code, s.scf_key;

-- Show missing configurations for StepView
SELECT '=== Missing Required Configurations ===' as section;

WITH required_configs AS (
    SELECT unnest(ARRAY[
        'stepview.confluence.base.url',
        'stepview.confluence.space.key', 
        'stepview.confluence.page.id',
        'stepview.confluence.page.title'
    ]) as required_key
),
dev_env AS (
    SELECT env_id FROM environments_env WHERE env_code = 'DEV' LIMIT 1
)
SELECT 
    r.required_key,
    CASE WHEN s.scf_key IS NOT NULL THEN '✅ CONFIGURED' ELSE '❌ MISSING' END as status
FROM required_configs r
LEFT JOIN system_configuration_scf s ON s.scf_key = r.required_key 
    AND s.env_id = (SELECT env_id FROM dev_env)
    AND s.scf_category = 'MACRO_LOCATION'
    AND s.scf_is_active = true;

-- Health check query that matches UrlConstructionService logic
SELECT '=== Health Check (matching UrlConstructionService) ===' as section;

SELECT 
    'DEV Environment Config' as check_type,
    CASE WHEN COUNT(*) = 4 THEN '✅ ALL 4 CONFIGS PRESENT' 
         ELSE '❌ INCOMPLETE (' || COUNT(*) || '/4 configs)' END as status
FROM system_configuration_scf s
INNER JOIN environments_env e ON s.env_id = e.env_id
WHERE e.env_code = 'DEV' 
  AND s.scf_is_active = true
  AND s.scf_category = 'MACRO_LOCATION'
  AND s.scf_key IN (
      'stepview.confluence.base.url', 
      'stepview.confluence.space.key',
      'stepview.confluence.page.id', 
      'stepview.confluence.page.title'
  );