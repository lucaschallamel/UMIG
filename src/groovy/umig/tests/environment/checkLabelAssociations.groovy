import com.onresolve.scriptrunner.runner.customisers.WithPlugin
import com.onresolve.scriptrunner.runner.customisers.PluginModule
@WithPlugin("com.onresolve.scriptrunner.runner")

import com.onresolve.scriptrunner.db.DatabaseUtil

// Check label associations for steps
DatabaseUtil.withSql('umig_db_pool') { sql ->
    println "=== Checking Label Associations for Steps ==="
    
    // 1. Count total labels
    def totalLabels = sql.firstRow('SELECT COUNT(*) as count FROM labels_lbl')
    println "\n1. Total labels in system: ${totalLabels.count}"
    
    // 2. Count label-step associations
    def totalAssociations = sql.firstRow('SELECT COUNT(*) as count FROM labels_lbl_x_steps_master_stm')
    println "\n2. Total label-step associations: ${totalAssociations.count}"
    
    // 3. Show sample associations
    println "\n3. Sample label-step associations:"
    def associations = sql.rows('''
        SELECT 
            l.lbl_name,
            l.lbl_color,
            stm.stt_code,
            stm.stm_number,
            stm.stm_name
        FROM labels_lbl_x_steps_master_stm lxs
        JOIN labels_lbl l ON lxs.lbl_id = l.lbl_id
        JOIN steps_master_stm stm ON lxs.stm_id = stm.stm_id
        LIMIT 10
    ''')
    
    associations.each { assoc ->
        println "   - Label '${assoc.lbl_name}' (${assoc.lbl_color}) -> Step ${assoc.stt_code}-${String.format('%03d', assoc.stm_number)}: ${assoc.stm_name}"
    }
    
    // 4. Check a specific step (the one you're testing with)
    println "\n4. Checking labels for a specific step:"
    def stepWithLabels = sql.firstRow('''
        SELECT 
            stm.stm_id,
            stm.stt_code,
            stm.stm_number,
            stm.stm_name,
            COUNT(lxs.lbl_id) as label_count
        FROM steps_master_stm stm
        LEFT JOIN labels_lbl_x_steps_master_stm lxs ON stm.stm_id = lxs.stm_id
        GROUP BY stm.stm_id, stm.stt_code, stm.stm_number, stm.stm_name
        HAVING COUNT(lxs.lbl_id) > 0
        LIMIT 1
    ''')
    
    if (stepWithLabels) {
        println "   Step ${stepWithLabels.stt_code}-${String.format('%03d', stepWithLabels.stm_number)}: ${stepWithLabels.stm_name}"
        println "   Step ID: ${stepWithLabels.stm_id}"
        println "   Label count: ${stepWithLabels.label_count}"
        
        // Get actual labels for this step
        def stepLabels = sql.rows('''
            SELECT l.lbl_name, l.lbl_color
            FROM labels_lbl l
            JOIN labels_lbl_x_steps_master_stm lxs ON l.lbl_id = lxs.lbl_id
            WHERE lxs.stm_id = :stmId
        ''', [stmId: stepWithLabels.stm_id])
        
        stepLabels.each { label ->
            println "   - ${label.lbl_name} (${label.lbl_color})"
        }
    } else {
        println "   No steps found with label associations!"
    }
}