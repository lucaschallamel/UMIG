package com.umig.repository

import com.umig.utils.DatabaseUtil

/**
 * Repository for step type data.
 */
class StepTypeRepository {
    /**
     * Fetches a step type by its code.
     */
    def findStepTypeByCode(String sttCode) {
        DatabaseUtil.withSql { sql ->
            return sql.firstRow('''
                SELECT stt_name
                FROM step_types_stt
                WHERE stt_code = :sttCode
            ''', [sttCode: sttCode])
        }
    }
}
