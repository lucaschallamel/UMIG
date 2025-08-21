package umig.repository

import groovy.sql.Sql
import umig.utils.DatabaseUtil

/**
 * Repository for managing status lookup data from status_sts table
 */
class StatusRepository {

    /**
     * Find all statuses by entity type
     * @param entityType The type of entity (Migration, Iteration, Plan, Sequence, Phase, Step, Control)
     * @return List of status maps with id, name, color, and type
     */
    def findStatusesByType(String entityType) {
        DatabaseUtil.withSql { Sql sql ->
            def query = '''
                SELECT 
                    sts_id as id,
                    sts_name as name,
                    sts_color as color,
                    sts_type as type
                FROM status_sts
                WHERE sts_type = :entityType
                ORDER BY 
                    CASE sts_name
                        WHEN 'PENDING' THEN 1
                        WHEN 'TODO' THEN 2
                        WHEN 'PLANNING' THEN 3
                        WHEN 'IN_PROGRESS' THEN 4
                        WHEN 'PASSED' THEN 5
                        WHEN 'COMPLETED' THEN 6
                        WHEN 'FAILED' THEN 7
                        WHEN 'BLOCKED' THEN 8
                        WHEN 'CANCELLED' THEN 9
                        ELSE 10
                    END
            '''
            
            return sql.rows(query, [entityType: entityType])
        }
    }

    /**
     * Find a specific status by name and type
     * @param statusName The name of the status
     * @param entityType The type of entity
     * @return Status map with id, name, color, and type, or null if not found
     */
    def findStatusByNameAndType(String statusName, String entityType) {
        DatabaseUtil.withSql { Sql sql ->
            def query = '''
                SELECT 
                    sts_id as id,
                    sts_name as name,
                    sts_color as color,
                    sts_type as type
                FROM status_sts
                WHERE sts_name = :statusName
                AND sts_type = :entityType
            '''
            
            return sql.firstRow(query, [statusName: statusName, entityType: entityType])
        }
    }

    /**
     * Find all statuses (for admin purposes)
     * @return List of all status maps
     */
    def findAllStatuses() {
        DatabaseUtil.withSql { Sql sql ->
            def query = '''
                SELECT 
                    sts_id as id,
                    sts_name as name,
                    sts_color as color,
                    sts_type as type,
                    created_date,
                    updated_date,
                    created_by,
                    updated_by
                FROM status_sts
                ORDER BY sts_type, sts_name
            '''
            
            return sql.rows(query)
        }
    }

    /**
     * Validate if a status ID exists for a given entity type
     * @param statusId The status ID to validate
     * @param entityType The type of entity (Step, Phase, etc.)
     * @return true if valid, false otherwise
     */
    def isValidStatusId(Integer statusId, String entityType) {
        if (!statusId || !entityType) {
            return false
        }
        
        DatabaseUtil.withSql { Sql sql ->
            def query = '''
                SELECT COUNT(*) as count
                FROM status_sts
                WHERE sts_id = :statusId
                AND sts_type = :entityType
            '''
            
            def result = sql.firstRow(query, [statusId: statusId, entityType: entityType])
            return (result.count as Integer) > 0
        }
    }

    /**
     * Get valid status IDs for a given entity type
     * @param entityType The type of entity (Step, Phase, etc.)
     * @return List of valid status IDs
     */
    def getValidStatusIds(String entityType) {
        DatabaseUtil.withSql { Sql sql ->
            def query = '''
                SELECT sts_id as id
                FROM status_sts
                WHERE sts_type = :entityType
                ORDER BY 
                    CASE sts_name
                        WHEN 'PENDING' THEN 1
                        WHEN 'TODO' THEN 2
                        WHEN 'PLANNING' THEN 3
                        WHEN 'IN_PROGRESS' THEN 4
                        WHEN 'PASSED' THEN 5
                        WHEN 'COMPLETED' THEN 6
                        WHEN 'FAILED' THEN 7
                        WHEN 'BLOCKED' THEN 8
                        WHEN 'CANCELLED' THEN 9
                        ELSE 10
                    END
            '''
            
            return sql.rows(query, [entityType: entityType]).collect { it.id }
        }
    }
}