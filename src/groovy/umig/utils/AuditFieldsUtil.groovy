package umig.utils

import java.sql.Timestamp

/**
 * Utility class for managing audit fields across all UMIG database operations.
 * Provides consistent handling of created_by, created_at, updated_by, and updated_at fields.
 * 
 * Following US-002b: Audit Fields Standardization
 * 
 * @author UMIG Development Team
 * @since 2025-08-04
 */
class AuditFieldsUtil {
    
    /**
     * Sets all audit fields for a new record creation.
     * Adds created_by, created_at, updated_by, and updated_at to the params map.
     * 
     * @param params The parameter map to add audit fields to
     * @param username The username to set (defaults to 'system' if null)
     * @return The modified params map with audit fields
     */
    static Map<String, Object> setCreateAuditFields(Map params, String username = null) {
        def auditUser = username ?: 'system'
        def now = new Timestamp(System.currentTimeMillis())
        
        params.created_by = auditUser
        params.created_at = now
        params.updated_by = auditUser
        params.updated_at = now
        
        return params
    }
    
    /**
     * Sets update audit fields for an existing record modification.
     * Only updates updated_by and updated_at fields.
     * 
     * @param params The parameter map to add audit fields to
     * @param username The username to set (defaults to 'system' if null)
     * @return The modified params map with update audit fields
     */
    static Map<String, Object> setUpdateAuditFields(Map params, String username = null) {
        def auditUser = username ?: 'system'
        def now = new Timestamp(System.currentTimeMillis())
        
        params.updated_by = auditUser
        params.updated_at = now
        
        return params
    }
    
    /**
     * Creates an INSERT SQL statement with audit fields automatically included.
     * This method helps standardize INSERT operations across all repositories.
     * 
     * @param tableName The name of the table to insert into
     * @param fields Map of field names to values (audit fields will be added)
     * @param username The username for audit fields (defaults to 'system')
     * @return A formatted INSERT SQL statement with placeholders
     */
    static String createInsertWithAudit(String tableName, Map fields, String username = null) {
        def auditFields = setCreateAuditFields([:], username)
        def allFields = fields + auditFields
        
        def fieldNames = allFields.keySet().join(', ')
        def placeholders = allFields.keySet().collect { ':' + it }.join(', ')
        
        return """
            INSERT INTO ${tableName} (${fieldNames})
            VALUES (${placeholders})
        """
    }
    
    /**
     * Creates an UPDATE SQL statement with audit fields automatically included.
     * This method helps standardize UPDATE operations across all repositories.
     * 
     * @param tableName The name of the table to update
     * @param fields Map of field names to values (audit fields will be added)
     * @param whereClause The WHERE clause for the update (without 'WHERE' keyword)
     * @param username The username for audit fields (defaults to 'system')
     * @return A formatted UPDATE SQL statement with placeholders
     */
    static String createUpdateWithAudit(String tableName, Map fields, String whereClause, String username = null) {
        def auditFields = setUpdateAuditFields([:], username)
        def allFields = fields + auditFields
        
        def setClause = allFields.collect { key, value ->
            "${key} = :${key}"
        }.join(', ')
        
        return """
            UPDATE ${tableName}
            SET ${setClause}
            WHERE ${whereClause}
        """
    }
    
    /**
     * Validates that a map contains all required audit fields.
     * Useful for checking data before insert/update operations.
     * 
     * @param params The parameter map to validate
     * @param checkUpdate If true, only checks update fields (updated_by, updated_at)
     * @return true if all required audit fields are present, false otherwise
     */
    static boolean validateAuditFields(Map params, boolean checkUpdate = false) {
        if (checkUpdate) {
            return params.containsKey('updated_by') && params.containsKey('updated_at')
        } else {
            return params.containsKey('created_by') && 
                   params.containsKey('created_at') && 
                   params.containsKey('updated_by') && 
                   params.containsKey('updated_at')
        }
    }
    
    /**
     * Extracts the username from the current context.
     * This can be enhanced to get the actual logged-in user from Confluence.
     * 
     * @param context Optional context object (e.g., HTTP request)
     * @return The username of the current user or 'system' as fallback
     */
    static String getCurrentUsername(Object context = null) {
        // TODO: Implement actual user extraction from Confluence context
        // For now, return 'system' as default
        // In the future, this could extract from:
        // - HTTP session
        // - Confluence user context
        // - API authentication token
        
        return 'system'
    }
    
    /**
     * Adds audit fields to an existing parameter map, preserving existing values.
     * This is useful when working with partially populated audit fields.
     * 
     * @param params The existing parameter map
     * @param username The username to use for missing audit fields
     * @param forUpdate If true, only adds update fields
     * @return The params map with audit fields added (existing values preserved)
     */
    static Map<String, Object> addAuditFields(Map params, String username = null, boolean forUpdate = false) {
        def auditUser = username ?: 'system'
        def now = new Timestamp(System.currentTimeMillis())
        
        if (!forUpdate) {
            params.created_by = params.created_by ?: auditUser
            params.created_at = params.created_at ?: now
        }
        
        params.updated_by = params.updated_by ?: auditUser
        params.updated_at = params.updated_at ?: now
        
        return params
    }
    
    /**
     * Helper method to format audit field information for logging.
     * Useful for debugging and audit trail purposes.
     * 
     * @param params Map containing audit fields
     * @return Formatted string with audit information
     */
    static String formatAuditInfo(Map params) {
        return """Audit Info:
            Created: ${params.created_by} at ${params.created_at}
            Updated: ${params.updated_by} at ${params.updated_at}
        """
    }
    
    /**
     * Creates a map with default audit values for system operations.
     * Useful for batch operations and migrations.
     * 
     * @param username Optional username (defaults to 'system')
     * @return Map with all four audit fields populated
     */
    static Map<String, Object> getDefaultAuditFields(String username = null) {
        return setCreateAuditFields([:], username)
    }
    
    /**
     * Integration helper for DatabaseUtil.withSql pattern.
     * Automatically adds audit fields to parameters before execution.
     * 
     * Example usage:
     * DatabaseUtil.withSql { sql ->
     *     def params = AuditFieldsUtil.prepareInsertParams([
     *         name: 'Test',
     *         description: 'Test description'
     *     ])
     *     sql.execute(insertQuery, params)
     * }
     * 
     * @param params Original parameters
     * @param username Username for audit (optional)
     * @return Parameters with audit fields added
     */
    static Map<String, Object> prepareInsertParams(Map params, String username = null) {
        return setCreateAuditFields(params, username)
    }
    
    /**
     * Integration helper for DatabaseUtil.withSql pattern for updates.
     * Automatically adds update audit fields to parameters before execution.
     * 
     * @param params Original parameters
     * @param username Username for audit (optional)
     * @return Parameters with update audit fields added
     */
    static Map<String, Object> prepareUpdateParams(Map params, String username = null) {
        return setUpdateAuditFields(params, username)
    }
}