/**
 * DATABASE VERIFICATION SCRIPT
 *
 * Purpose: Verify the step instance data exists and step_code is correctly computed
 *
 * Usage:
 *   docker exec -it umig-postgres psql -U umig_app_user -d umig_app_db -f /path/to/this/file.sql
 *
 * Or connect via psql and paste:
 *   psql -h localhost -p 5432 -U umig_app_user -d umig_app_db
 */

\echo '================================================================'
\echo 'STEP INSTANCE DATA VERIFICATION'
\echo '================================================================'
\echo ''

-- Test UUID: 821ccc8f-1e4f-4986-8478-96cc2ce4ecd0 (latest test)
\echo 'Testing UUID: 821ccc8f-1e4f-4986-8478-96cc2ce4ecd0'
\echo ''

\echo '1. STEP INSTANCE BASIC DATA:'
\echo '----------------------------'
SELECT
    sti.sti_id,
    sti.sti_name,
    sti.sti_status,
    sti.sti_duration_minutes,
    sti.stm_id,
    sti.phi_id
FROM steps_instance_sti sti
WHERE sti.sti_id = '821ccc8f-1e4f-4986-8478-96cc2ce4ecd0';

\echo ''
\echo '2. STEP MASTER DATA (for step_code construction):'
\echo '--------------------------------------------------'
SELECT
    stm.stm_id,
    stm.stm_name,
    stm.stm_number,
    stm.stt_code,
    stm.stt_code || '-' || LPAD(stm.stm_number::text, 3, '0') as step_code_computed,
    stm.enr_id_target,
    stm.tms_id_owner
FROM steps_instance_sti sti
JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
WHERE sti.sti_id = '821ccc8f-1e4f-4986-8478-96cc2ce4ecd0';

\echo ''
\echo '3. COMPLETE ENRICHED DATA (as returned by query):'
\echo '-------------------------------------------------'
SELECT
    -- Step instance core
    sti.sti_id,
    sti.sti_name,
    sti.sti_status,

    -- Step master details
    stm.stm_name as master_name,
    stm.stm_number,
    stm.stt_code,
    CONCAT(stm.stt_code, '-', LPAD(stm.stm_number::text, 3, '0')) as step_code,

    -- Environment information
    env.env_name as environment_name,
    enr.enr_name as environment_role_name,

    -- Team assignments
    owner_team.tms_name as team_name,
    owner_team.tms_email as team_email,

    -- Counts
    (SELECT COUNT(*) FROM instructions_instance_ini WHERE sti_id = sti.sti_id) as instruction_count,
    (SELECT COUNT(*) FROM step_instance_comments_sic WHERE sti_id = sti.sti_id) as comment_count

FROM steps_instance_sti sti
JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
LEFT JOIN environment_roles_enr enr ON stm.enr_id_target = enr.enr_id
LEFT JOIN teams_tms owner_team ON stm.tms_id_owner = owner_team.tms_id
JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
LEFT JOIN environments_env_x_iterations_ite eei ON eei.ite_id = ite.ite_id AND eei.enr_id = enr.enr_id
LEFT JOIN environments_env env ON eei.env_id = env.env_id
WHERE sti.sti_id = '821ccc8f-1e4f-4986-8478-96cc2ce4ecd0';

\echo ''
\echo '4. INSTRUCTIONS DATA:'
\echo '--------------------'
SELECT
    ini.ini_id,
    COALESCE(ini.ini_body, inm.inm_body) as body,
    COALESCE(ini.ini_order, inm.inm_order) as order_number,
    ini.ini_is_completed,
    tms.tms_name as team_name
FROM instructions_instance_ini ini
JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
LEFT JOIN teams_tms tms ON COALESCE(ini.tms_id, inm.tms_id) = tms.tms_id
WHERE ini.sti_id = '821ccc8f-1e4f-4986-8478-96cc2ce4ecd0'
ORDER BY COALESCE(ini.ini_order, inm.inm_order);

\echo ''
\echo '5. COMMENTS DATA:'
\echo '----------------'
SELECT
    sic.sic_id,
    sic.sic_text as comment_text,
    sic.sic_created_at,
    usr.usr_username as author
FROM step_instance_comments_sic sic
LEFT JOIN users_usr usr ON sic.usr_id = usr.usr_id
WHERE sic.sti_id = '821ccc8f-1e4f-4986-8478-96cc2ce4ecd0'
ORDER BY sic.sic_created_at DESC;

\echo ''
\echo '6. IMPACTED TEAMS:'
\echo '-----------------'
SELECT
    imp_team.tms_id,
    imp_team.tms_name,
    imp_team.tms_email
FROM steps_instance_sti sti
JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
JOIN steps_master_stm_x_teams_tms_impacted imp_x ON imp_x.stm_id = stm.stm_id
JOIN teams_tms imp_team ON imp_x.tms_id = imp_team.tms_id
WHERE sti.sti_id = '821ccc8f-1e4f-4986-8478-96cc2ce4ecd0';

\echo ''
\echo '================================================================'
\echo 'VERIFICATION COMPLETE'
\echo '================================================================'
\echo ''
\echo 'INTERPRETATION:'
\echo '  - If step_code shows value (e.g., TRT-004): Database is correct ✅'
\echo '  - If step_code is NULL: Check stm.stt_code or stm.stm_number ❌'
\echo '  - If instruction_count > 0 but no instructions shown: FK issue ⚠️'
\echo '  - If comment_count > 0 but no comments shown: FK issue ⚠️'
\echo ''
\echo 'NEXT STEPS:'
\echo '  1. If all data looks good here, the issue is ScriptRunner cache'
\echo '  2. Run the groovy diagnostic script to test enrichment method'
\echo '  3. Force ScriptRunner cache refresh (see instructions)'
\echo ''
