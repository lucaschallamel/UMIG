#!/usr/bin/env groovy

/**
 * DIAGNOSTIC SCRIPT: Test Email Enrichment
 *
 * Purpose: Test the getEnhancedStepInstanceForEmail() method directly
 * to verify it works correctly outside of email sending context.
 *
 * This script bypasses ScriptRunner caching and tests the query directly.
 *
 * Usage from project root:
 *   groovy local-dev-setup/diagnostic-scripts/test-email-enrichment.groovy
 *
 * Test UUIDs:
 *   - Old: b99fc20c-689e-478e-be56-89ece4e1d7ba
 *   - New: 821ccc8f-1e4f-4986-8478-96cc2ce4ecd0
 */

@Grapes([
    @Grab(group='org.postgresql', module='postgresql', version='42.7.2')
])

import groovy.sql.Sql
import java.sql.SQLException

// Database connection details (from .env)
def DB_HOST = System.getenv('POSTGRES_HOST') ?: 'localhost'
def DB_PORT = System.getenv('POSTGRES_PORT') ?: '5432'
def DB_NAME = System.getenv('POSTGRES_DB') ?: 'umig_app_db'
def DB_USER = System.getenv('POSTGRES_USER') ?: 'umig_app_user'
def DB_PASS = System.getenv('POSTGRES_PASSWORD') ?: 'umig_secure_password_2024'

def jdbcUrl = "jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}"

println """
╔════════════════════════════════════════════════════════════════╗
║        EMAIL ENRICHMENT DIAGNOSTIC TEST                        ║
╚════════════════════════════════════════════════════════════════╝

Database: ${DB_NAME}@${DB_HOST}:${DB_PORT}
User: ${DB_USER}

Testing getEnhancedStepInstanceForEmail() method...
"""

// Test UUIDs
def testUUIDs = [
    'b99fc20c-689e-478e-be56-89ece4e1d7ba', // Old test
    '821ccc8f-1e4f-4986-8478-96cc2ce4ecd0'  // New test
]

testUUIDs.each { uuidStr ->
    println "\n" + "="*70
    println "Testing UUID: ${uuidStr}"
    println "="*70

    try {
        def sql = Sql.newInstance(jdbcUrl, DB_USER, DB_PASS, 'org.postgresql.Driver')

        try {
            UUID stepInstanceId = UUID.fromString(uuidStr)

            // Execute the EXACT same query as in StepRepository.getEnhancedStepInstanceForEmail()
            def stepData = sql.firstRow('''
                SELECT
                    -- Step instance core
                    sti.sti_id,
                    sti.sti_name,
                    sti.sti_description,
                    sti.sti_status,
                    sti.sti_duration_minutes,

                    -- Step master details
                    stm.stm_id,
                    stm.stm_name,
                    stm.stm_description,
                    stm.stm_number,
                    stm.stt_code,
                    CONCAT(stm.stt_code, '-', LPAD(stm.stm_number::text, 3, '0')) as step_code,
                    stm.stm_scope,
                    stm.stm_location,

                    -- Environment information
                    enr.enr_id as env_role_id,
                    enr.enr_name as environment_role_name,
                    enr.enr_type as environment_role_type,
                    env.env_id,
                    env.env_name as environment_name,
                    env.env_type as environment_type,

                    -- Team assignments
                    owner_team.tms_id as owner_team_id,
                    owner_team.tms_name as team_name,
                    owner_team.tms_email as team_email,

                    -- Impacted teams (aggregated as JSON array)
                    COALESCE(
                        (SELECT JSON_AGG(JSON_BUILD_OBJECT(
                            'tms_id', imp_team.tms_id,
                            'tms_name', imp_team.tms_name,
                            'tms_email', imp_team.tms_email
                        ))
                        FROM steps_master_stm_x_teams_tms_impacted imp_x
                        JOIN teams_tms imp_team ON imp_x.tms_id = imp_team.tms_id
                        WHERE imp_x.stm_id = stm.stm_id),
                        '[]'::json
                    ) as impacted_teams_json,

                    -- Predecessor information
                    pred.stm_id as predecessor_id,
                    pred.stm_name as predecessor_name,
                    CONCAT(pred.stt_code, '-', LPAD(pred.stm_number::text, 3, '0')) as predecessor_code,

                    -- Hierarchy context
                    mig.mig_id,
                    mig.mig_code as migration_code,
                    mig.mig_name as migration_name,
                    ite.ite_id,
                    ite.ite_code as iteration_code,
                    ite.ite_name as iteration_name,
                    pli.pli_id,
                    plm.plm_name as plan_name,
                    sqi.sqi_id,
                    sqm.sqm_name as sequence_name,
                    phi.phi_id,
                    phm.phm_name as phase_name,

                    -- Counts for conditional fetching
                    (SELECT COUNT(*) FROM instructions_instance_ini WHERE sti_id = sti.sti_id) as instruction_count,
                    (SELECT COUNT(*) FROM step_instance_comments_sic WHERE sti_id = sti.sti_id) as comment_count,

                    -- Audit fields
                    sti.created_by,
                    sti.created_at,
                    sti.updated_by,
                    sti.updated_at

                FROM steps_instance_sti sti
                JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                LEFT JOIN environment_roles_enr enr ON stm.enr_id_target = enr.enr_id
                LEFT JOIN teams_tms owner_team ON stm.tms_id_owner = owner_team.tms_id
                LEFT JOIN steps_master_stm pred ON stm.stm_id_predecessor = pred.stm_id
                JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                JOIN phases_master_phm phm ON phi.phm_id = phm.phm_id
                JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                JOIN sequences_master_sqm sqm ON sqi.sqm_id = sqm.sqm_id
                JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                JOIN migrations_mig mig ON ite.mig_id = mig.mig_id
                LEFT JOIN environments_env_x_iterations_ite eei ON eei.ite_id = ite.ite_id AND eei.enr_id = enr.enr_id
                LEFT JOIN environments_env env ON eei.env_id = env.env_id
                WHERE sti.sti_id = ?
            ''', [stepInstanceId])

            if (stepData) {
                println "\n✅ SUCCESS - Step data retrieved!"
                println "\n📋 CRITICAL FIELDS:"
                println "   step_code: '${stepData.step_code}' ${stepData.step_code ? '✅' : '❌ EMPTY!'}"
                println "   stt_code: '${stepData.stt_code}'"
                println "   stm_number: ${stepData.stm_number}"
                println "   sti_name: '${stepData.sti_name}'"
                println "   sti_status: ${stepData.sti_status}"

                println "\n🌍 ENVIRONMENT:"
                println "   environment_name: '${stepData.environment_name ?: 'NULL'}'"
                println "   environment_role_name: '${stepData.environment_role_name ?: 'NULL'}'"

                println "\n👥 TEAM:"
                println "   team_name: '${stepData.team_name ?: 'NULL'}'"
                println "   team_email: '${stepData.team_email ?: 'NULL'}'"

                println "\n📊 COUNTS:"
                println "   instruction_count: ${stepData.instruction_count}"
                println "   comment_count: ${stepData.comment_count}"

                println "\n🗂️ HIERARCHY:"
                println "   migration_code: ${stepData.migration_code}"
                println "   iteration_code: ${stepData.iteration_code}"
                println "   plan_name: ${stepData.plan_name}"
                println "   sequence_name: ${stepData.sequence_name}"
                println "   phase_name: ${stepData.phase_name}"

                println "\n📝 ALL FIELDS:"
                stepData.each { key, value ->
                    println "   ${key}: ${value}"
                }

                // Test instructions fetch
                if ((stepData.instruction_count as Integer) > 0) {
                    println "\n📋 FETCHING INSTRUCTIONS..."
                    def instructions = sql.rows('''
                        SELECT
                            ini.ini_id,
                            COALESCE(ini.ini_body, inm.inm_body) as body,
                            COALESCE(ini.ini_order, inm.inm_order) as order_number,
                            COALESCE(ini.ini_duration_minutes, inm.inm_duration_minutes) as duration_minutes,
                            ini.ini_is_completed,
                            tms.tms_id as team_id,
                            tms.tms_name as team_name,
                            ctm.ctm_code as control_code,
                            ctm.ctm_name as control_name
                        FROM instructions_instance_ini ini
                        JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
                        LEFT JOIN teams_tms tms ON COALESCE(ini.tms_id, inm.tms_id) = tms.tms_id
                        LEFT JOIN controls_master_ctm ctm ON inm.ctm_id = ctm.ctm_id
                        WHERE ini.sti_id = ?
                        ORDER BY COALESCE(ini.ini_order, inm.inm_order)
                    ''', [stepInstanceId])

                    println "   Found ${instructions.size()} instructions"
                    instructions.eachWithIndex { inst, idx ->
                        println "   ${idx+1}. ${inst.body?.take(60)}..."
                    }
                }

                // Test comments fetch
                if ((stepData.comment_count as Integer) > 0) {
                    println "\n💬 FETCHING COMMENTS..."
                    def comments = sql.rows('''
                        SELECT
                            sic.sic_id,
                            sic.sic_text as comment_text,
                            sic.sic_created_at as comment_created_at,
                            usr.usr_username as author_username,
                            usr.usr_full_name as author_name
                        FROM step_instance_comments_sic sic
                        LEFT JOIN users_usr usr ON sic.usr_id = usr.usr_id
                        WHERE sic.sti_id = ?
                        ORDER BY sic.sic_created_at DESC
                    ''', [stepInstanceId])

                    println "   Found ${comments.size()} comments"
                    comments.eachWithIndex { comment, idx ->
                        println "   ${idx+1}. [${comment.author_username}] ${comment.comment_text?.take(60)}..."
                    }
                }

            } else {
                println "\n❌ FAILED - No data found for UUID: ${uuidStr}"
            }

        } finally {
            sql.close()
        }

    } catch (Exception e) {
        println "\n❌ ERROR: ${e.message}"
        e.printStackTrace()
    }
}

println "\n" + "="*70
println "DIAGNOSTIC TEST COMPLETE"
println "="*70
println """
If step_code is EMPTY but other fields have data:
  → Check the step master table (steps_master_stm) for stt_code and stm_number
  → Verify CONCAT logic: CONCAT(stm.stt_code, '-', LPAD(stm.stm_number::text, 3, '0'))

If no data found:
  → Verify UUID exists in steps_instance_sti table
  → Check foreign key relationships are intact

If you see data here but email is empty:
  → ScriptRunner cache needs refresh (see instructions below)
"""
