package umig.repository

import umig.utils.DatabaseUtil

/**
 * Lightweight lookup helpers for teams, environments, phases, and controls.
 */
class LookupRepository {
    def findTeamById(Long tmsId) {
        DatabaseUtil.withSql { sql ->
            sql.firstRow('SELECT tms_id, tms_name FROM teams_tms WHERE tms_id = :tmsId', [tmsId: tmsId])
        }
    }
    def findTeamsByIds(List<Long> tmsIds) {
        if (!tmsIds) return []
        DatabaseUtil.withSql { sql ->
            def placeholders = tmsIds.collect { '?' }.join(',')
            def query = "SELECT tms_id, tms_name FROM teams_tms WHERE tms_id IN (${placeholders})"
            return sql.rows(query, *tmsIds)
        }
    }
    def findEnvironmentById(Long envId) {
        DatabaseUtil.withSql { sql ->
            sql.firstRow('SELECT env_id, env_name FROM environments_env WHERE env_id = :envId', [envId: envId])
        }
    }
    def findPhaseById(Long phmId) {
        DatabaseUtil.withSql { sql ->
            sql.firstRow('SELECT phm_id, phm_name FROM phases_phm WHERE phm_id = :phmId', [phmId: phmId])
        }
    }
    def findControlById(Long ctmId) {
        DatabaseUtil.withSql { sql ->
            sql.firstRow('SELECT ctm_id, ctm_code FROM controls_ctm WHERE ctm_id = :ctmId', [ctmId: ctmId])
        }
    }
}
