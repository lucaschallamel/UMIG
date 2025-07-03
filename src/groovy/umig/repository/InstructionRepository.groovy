package com.umig.repository

import com.umig.utils.DatabaseUtil

/**
 * Repository for INSTRUCTION master and instance data for a given STEP instance.
 */
class InstructionRepository {
    /**
     * Fetches all master instructions for a STEP, ordered by istm_order.
     */
    def findInstructionsMaster(UUID stmId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows('''
                SELECT inm.inm_order, inm.inm_body
                FROM instructions_master_inm inm
                WHERE inm.stm_id = :stmId
                ORDER BY inm.inm_order
            ''', [stmId: stmId])
        }
    }

    /**
     * Fetches all instruction instances for a given STEP instance.
     */
    def findInstructionInstances(UUID stiId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows('''
                SELECT isti.isti_id, isti.istm_id, isti.sti_id, isti.isti_status, isti.isti_completed_at, isti.isti_completed_by
                FROM instructions_instance_isti isti
                WHERE isti.sti_id = :stiId
            ''', [stiId: stiId])
        }
    }
}
