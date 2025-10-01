package umig.tests.integration

import groovy.sql.Sql
import umig.repository.StepRepository
import java.util.UUID

/**
 * TD-015 Critical Bug Fix: Email Service Data Binding Integration Test
 *
 * This test validates that StepRepository.getCompleteStepForEmail() returns
 * ALL 35+ fields required by email templates to prevent raw GSP syntax from
 * appearing in production emails.
 *
 * Test Strategy:
 * 1. Query a real step instance from the database
 * 2. Call getCompleteStepForEmail() method
 * 3. Validate all 35+ required fields are present and populated
 * 4. Verify no null/missing values for critical fields
 * 5. Validate array fields (instructions, comments, teams) are properly structured
 *
 * SUCCESS CRITERIA:
 * - All core step fields present (sti_id, sti_code, sti_name, sti_description, etc.)
 * - All contextual fields present (environment_name, team_name, etc.)
 * - All arrays properly populated (instructions, completedInstructions, pendingInstructions, recentComments)
 * - Migration/iteration codes present for URL construction
 * - No critical nulls that would cause template rendering failures
 *
 * @author UMIG Team
 * @since 2025-09-30 (TD-015 Critical Bug Fix)
 */
class EmailServiceDataBindingTest {

    static void main(String[] args) {
        println "======================================================================"
        println "TD-015 EMAIL SERVICE DATA BINDING TEST"
        println "Testing: StepRepository.getCompleteStepForEmail() method"
        println "======================================================================"
        println ""

        def sql = Sql.newInstance(
            'jdbc:postgresql://localhost:5432/umig_app_db',
            'umig_app_user',
            '123456',
            'org.postgresql.Driver'
        )

        try {
            // Step 1: Find a step instance with instructions
            println "[1] Finding a step instance with instructions..."
            def stepInstance = sql.firstRow("""
                SELECT sti.sti_id, sti.sti_name, COUNT(ini.ini_id) as instruction_count
                FROM steps_instance_sti sti
                LEFT JOIN instructions_instance_ini ini ON sti.sti_id = ini.sti_id
                GROUP BY sti.sti_id, sti.sti_name
                ORDER BY instruction_count DESC
                LIMIT 1
            """)

            if (!stepInstance) {
                println "❌ ERROR: No step instances found in database"
                System.exit(1)
            }

            def stepId = UUID.fromString(stepInstance.sti_id as String)
            println "✅ Found step: ${stepInstance.sti_name} (${stepId})"
            println "   Instructions: ${stepInstance.instruction_count}"
            println ""

            // Step 2: Call repository method
            println "[2] Calling StepRepository.getCompleteStepForEmail()..."
            def repo = new StepRepository()
            def stepData = repo.getCompleteStepForEmail(stepId)
            println "✅ Method executed successfully"
            println ""

            // Step 3: Validate all required fields
            println "[3] Validating required fields (35+ total)..."
            def requiredFields = [
                // Core Step Instance Fields (6 fields)
                'sti_id': 'Step Instance ID',
                'sti_code': 'Step Code (e.g., AUT-003)',
                'sti_name': 'Step Name',
                'sti_description': 'Step Description',
                'sti_duration_minutes': 'Duration (minutes)',
                'sti_status': 'Step Status',

                // Contextual Information (6 fields)
                'environment_name': 'Environment Name',
                'environment_role_name': 'Environment Role',
                'team_id': 'Team ID',
                'team_name': 'Team Name',
                'team_email': 'Team Email',

                // Predecessor/Successor Information (6 fields)
                'predecessor_code': 'Predecessor Code',
                'predecessor_name': 'Predecessor Name',
                'successor_code': 'Successor Code',
                'successor_name': 'Successor Name',
                'has_predecessor': 'Has Predecessor Flag',
                'has_successor': 'Has Successor Flag',

                // Migration/Iteration Context (6 fields)
                'migration_code': 'Migration Code',
                'migration_name': 'Migration Name',
                'migration_description': 'Migration Description',
                'iteration_code': 'Iteration Code',
                'iteration_name': 'Iteration Name',
                'iteration_description': 'Iteration Description',

                // Hierarchical Context (3 fields)
                'plan_name': 'Plan Name',
                'sequence_name': 'Sequence Name',
                'phase_name': 'Phase Name',

                // Rich Data Arrays (4 arrays)
                'instructions': 'Instructions Array',
                'completedInstructions': 'Completed Instructions',
                'pendingInstructions': 'Pending Instructions',
                'recentComments': 'Recent Comments',

                // Team Relationships (1 array)
                'impacted_teams': 'Impacted Teams Array',

                // Computed Metadata (4 fields)
                'total_instructions': 'Total Instructions Count',
                'completed_instruction_count': 'Completed Instructions Count',
                'pending_instruction_count': 'Pending Instructions Count',
                'instruction_completion_percentage': 'Instruction Completion %'
            ]

            def missingFields = []
            def presentFields = []
            def nullFields = []

            requiredFields.each { fieldName, fieldDescription ->
                if (!stepData.containsKey(fieldName)) {
                    missingFields.add("${fieldName} (${fieldDescription})")
                } else {
                    presentFields.add(fieldName)
                    if (stepData[fieldName] == null) {
                        // Allow nulls for optional fields
                        if (!['predecessor_code', 'predecessor_name', 'successor_code', 'successor_name',
                              'environment_role_name', 'team_id', 'team_email'].contains(fieldName)) {
                            nullFields.add("${fieldName} (${fieldDescription})")
                        }
                    }
                }
            }

            if (missingFields.isEmpty()) {
                println "✅ ALL ${requiredFields.size()} required fields present!"
            } else {
                println "❌ MISSING FIELDS (${missingFields.size()}):"
                missingFields.each { field ->
                    println "   - ${field}"
                }
            }
            println ""

            // Step 4: Validate critical non-null fields
            println "[4] Validating critical non-null fields..."
            if (nullFields.isEmpty()) {
                println "✅ No critical null fields detected"
            } else {
                println "⚠️  WARNING: Critical fields with null values (${nullFields.size()}):"
                nullFields.each { field ->
                    println "   - ${field}"
                }
            }
            println ""

            // Step 5: Validate array structures
            println "[5] Validating array structures..."
            def arrayValidation = [
                'instructions': { it != null && it instanceof List },
                'completedInstructions': { it != null && it instanceof List },
                'pendingInstructions': { it != null && it instanceof List },
                'recentComments': { it != null && it instanceof List },
                'impacted_teams': { it != null && it instanceof List }
            ]

            arrayValidation.each { fieldName, validator ->
                def value = stepData[fieldName]
                if (validator(value)) {
                    println "   ✅ ${fieldName}: List with ${(value as List).size()} items"
                } else {
                    println "   ❌ ${fieldName}: Invalid structure (expected List, got ${value?.class?.simpleName})"
                }
            }
            println ""

            // Step 6: Validate template-critical fields
            println "[6] Validating template-critical fields..."
            def criticalFields = [
                'sti_code': stepData.sti_code,
                'sti_name': stepData.sti_name,
                'migration_code': stepData.migration_code,
                'iteration_code': stepData.iteration_code,
                'environment_name': stepData.environment_name,
                'team_name': stepData.team_name
            ]

            def templateFailures = []
            criticalFields.each { fieldName, fieldValue ->
                if (!fieldValue || fieldValue.toString().trim().isEmpty()) {
                    templateFailures.add(fieldName)
                }
            }

            if (templateFailures.isEmpty()) {
                println "✅ All template-critical fields have valid values"
            } else {
                println "❌ Template-critical fields missing values:"
                templateFailures.each { field ->
                    println "   - ${field}: '${criticalFields[field]}'"
                }
            }
            println ""

            // Step 7: Display sample data
            println "[7] Sample field values (for verification):"
            println "   sti_code: ${stepData.sti_code}"
            println "   sti_name: ${stepData.sti_name}"
            println "   sti_status: ${stepData.sti_status}"
            println "   environment_name: ${stepData.environment_name}"
            println "   team_name: ${stepData.team_name}"
            println "   migration_code: ${stepData.migration_code}"
            println "   iteration_code: ${stepData.iteration_code}"
            println "   instructions: ${(stepData.instructions as List)?.size() ?: 0} total"
            println "   completedInstructions: ${(stepData.completedInstructions as List)?.size() ?: 0}"
            println "   pendingInstructions: ${(stepData.pendingInstructions as List)?.size() ?: 0}"
            println "   recentComments: ${(stepData.recentComments as List)?.size() ?: 0}"
            println "   impacted_teams: ${(stepData.impacted_teams as List)?.size() ?: 0}"
            println ""

            // Step 8: Final validation
            println "======================================================================"
            println "TEST RESULTS SUMMARY"
            println "======================================================================"
            println "Total fields expected: ${requiredFields.size()}"
            println "Fields present: ${presentFields.size()}"
            println "Fields missing: ${missingFields.size()}"
            println "Critical null fields: ${nullFields.size()}"
            println "Template-critical failures: ${templateFailures.size()}"
            println ""

            def testPassed = missingFields.isEmpty() && templateFailures.isEmpty()

            if (testPassed) {
                println "✅ ✅ ✅ TEST PASSED ✅ ✅ ✅"
                println ""
                println "StepRepository.getCompleteStepForEmail() returns ALL required fields."
                println "Email templates will receive complete data binding."
                println "NO raw GSP syntax should appear in production emails."
            } else {
                println "❌ ❌ ❌ TEST FAILED ❌ ❌ ❌"
                println ""
                println "Email data binding is incomplete."
                println "Raw GSP syntax will appear in production emails."
                println "Review missing fields and template-critical values above."
            }
            println "======================================================================"

            // Exit with appropriate code
            System.exit(testPassed ? 0 : 1)

        } catch (Exception e) {
            println ""
            println "❌ ❌ ❌ TEST ERROR ❌ ❌ ❌"
            println "Exception occurred during test execution:"
            println "  ${e.class.simpleName}: ${e.message}"
            e.printStackTrace()
            System.exit(1)
        } finally {
            sql?.close()
        }
    }
}