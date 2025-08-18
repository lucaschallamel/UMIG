package umig.repository

import umig.utils.DatabaseUtil
import java.util.UUID

/**
 * Repository class for managing Migration data.
 * Handles all database operations for the migrations_mig table.
 */
class MigrationRepository {
    /**
     * Retrieves all migrations from the database.
     * @return A list of maps, where each map is a migration.
     */
    def findAllMigrations() {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT mig_id, usr_id_owner, mig_name, mig_description, mig_status, mig_type, mig_start_date, mig_end_date, mig_business_cutover_date, created_by, created_at, updated_by, updated_at
                FROM migrations_mig
                ORDER BY mig_name
            """)
        }
    }

    /**
     * Retrieves migrations with advanced filtering, pagination, and sorting (Sprint 3 pattern).
     * @param pageNumber Page number (1-based, default 1)
     * @param pageSize Number of items per page (default 50, max 100)
     * @param searchTerm Search term for migration name/description (optional)
     * @param sortField Field to sort by (optional, validated against allowed fields)
     * @param sortDirection Sort direction 'asc' or 'desc' (default 'asc')
     * @return Map with data array and pagination metadata
     */
    def findAllMigrations(int pageNumber, int pageSize, String searchTerm = null, String sortField = null, String sortDirection = 'asc') {
        DatabaseUtil.withSql { sql ->
            // Validate and set defaults
            pageNumber = Math.max(1, pageNumber)
            pageSize = Math.min(100, Math.max(1, pageSize))
            
            // Allowed sort fields for security
            def allowedSortFields = ['mig_id', 'mig_name', 'mig_description', 'mig_status', 'mig_type', 'mig_start_date', 'mig_end_date', 'created_at', 'updated_at']
            if (!sortField || !allowedSortFields.contains(sortField)) {
                sortField = 'mig_name'
            }
            
            sortDirection = (sortDirection?.toLowerCase() == 'desc') ? 'DESC' : 'ASC'
            
            // Build base query with optional search
            def baseQuery = """
                SELECT m.mig_id, m.usr_id_owner, m.mig_name, m.mig_description, m.mig_status, m.mig_type, 
                       m.mig_start_date, m.mig_end_date, m.mig_business_cutover_date, 
                       m.created_by, m.created_at, m.updated_by, m.updated_at,
                       s.sts_id, s.sts_name, s.sts_color, s.sts_type
                FROM migrations_mig m
                JOIN status_sts s ON m.mig_status = s.sts_id
            """
            
            def whereClause = ""
            def params = [:]
            
            if (searchTerm && searchTerm.trim()) {
                whereClause = "WHERE (m.mig_name ILIKE :search OR m.mig_description ILIKE :search)"
                params.search = "%${searchTerm.trim()}%"
            }
            
            // Count total records
            def countQuery = "SELECT COUNT(*) as total FROM migrations_mig m ${whereClause}"
            def totalCount = sql.firstRow(countQuery, params)?.total ?: 0
            
            // Calculate pagination
            def offset = (pageNumber - 1) * pageSize
            def totalPages = (int) Math.ceil((double) totalCount / (double) pageSize)
            
            // Build paginated data query
            def dataQuery = """
                ${baseQuery}
                ${whereClause}
                ORDER BY m.${sortField} ${sortDirection}
                LIMIT ${pageSize}
                OFFSET ${offset}
            """
            
            def migrations = sql.rows(dataQuery, params)
            
            // Enrich with status metadata
            def enrichedMigrations = migrations.collect { row ->
                return enrichMigrationWithStatusMetadata(row)
            }
            
            return [
                data: enrichedMigrations,
                pagination: [
                    page: pageNumber,
                    size: pageSize,
                    total: totalCount,
                    totalPages: totalPages,
                    hasNext: pageNumber < totalPages,
                    hasPrevious: pageNumber > 1
                ],
                filters: [
                    search: searchTerm,
                    sort: sortField,
                    direction: sortDirection.toLowerCase()
                ]
            ]
        }
    }

    /**
     * Finds a migration by its UUID.
     * @param migrationId The UUID of the migration to find.
     * @return A map representing the migration, or null if not found.
     */
    def findMigrationById(UUID migrationId) {
        DatabaseUtil.withSql { sql ->
            return sql.firstRow("""
                SELECT mig_id, usr_id_owner, mig_name, mig_description, mig_status, mig_type, mig_start_date, mig_end_date, mig_business_cutover_date, created_by, created_at, updated_by, updated_at
                FROM migrations_mig
                WHERE mig_id = :migrationId
            """, [migrationId: migrationId])
        }
    }

    /**
     * Finds all iterations for a given migration ID.
     * @param migrationId The UUID of the migration.
     * @return A list of maps, each representing an iteration.
     */
    def findIterationsByMigrationId(UUID migrationId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT ite_id, mig_id, plm_id, itt_code, ite_name, ite_description, ite_status,
                       ite_static_cutover_date, ite_dynamic_cutover_date, created_by, created_at, updated_by, updated_at
                FROM iterations_ite
                WHERE mig_id = :migrationId
                ORDER BY ite_static_cutover_date
            """, [migrationId: migrationId])
        }
    }

    /**
     * Finds a single iteration by its UUID.
     * @param iterationId The UUID of the iteration to find.
     * @return A map representing the iteration, or null if not found.
     */
    def findIterationById(UUID iterationId) {
        DatabaseUtil.withSql { sql ->
            return sql.firstRow("""
                SELECT ite_id, mig_id, plm_id, itt_code, ite_name, ite_description, ite_status,
                       ite_static_cutover_date, ite_dynamic_cutover_date, created_by, created_at, updated_by, updated_at
                FROM iterations_ite
                WHERE ite_id = :iterationId
            """, [iterationId: iterationId])
        }
    }
    /**
     * Finds all plan instances for a given iteration ID.
     * @param iterationId The UUID of the iteration.
     * @return A list of maps, each representing a plan instance (pli_id, plm_name).
     */
    def findPlanInstancesByIterationId(UUID iterationId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT pli.pli_id, plm.plm_name
                FROM plans_instance_pli pli
                JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                WHERE pli.ite_id = :iterationId
                ORDER BY plm.plm_name
            """, [iterationId: iterationId])
        }
    }

    /**
     * Finds all sequences for a given plan instance ID.
     * @param planInstanceId The UUID of the plan instance.
     * @return A list of maps, each representing a sequence (sqi_id, sqi_name).
     */
    def findSequencesByPlanInstanceId(UUID planInstanceId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT sqi_id, sqi_name
                FROM sequences_instance_sqi
                WHERE pli_id = :planInstanceId
                ORDER BY sqi_name
            """, [planInstanceId: planInstanceId])
        }
    }

    /**
     * Finds all phases for a given plan instance ID.
     * @param planInstanceId The UUID of the plan instance.
     * @return A list of maps, each representing a phase (phi_id, phi_name).
     */
    def findPhasesByPlanInstanceId(UUID planInstanceId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT phi.phi_id, phi.phi_name
                FROM phases_instance_phi phi
                JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                WHERE sqi.pli_id = :planInstanceId
                ORDER BY phi.phi_name
            """, [planInstanceId: planInstanceId])
        }
    }

    /**
     * Finds all phases for a given sequence ID.
     * @param sequenceId The UUID of the sequence.
     * @return A list of maps, each representing a phase (phi_id, phi_name).
     */
    def findPhasesBySequenceId(UUID sequenceId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT phi.phi_id, phi.phi_name
                FROM phases_instance_phi phi
                WHERE phi.sqi_id = :sequenceId
                ORDER BY phi.phi_name
            """, [sequenceId: sequenceId])
        }
    }

    /**
     * Finds all sequences for a given iteration ID.
     * @param iterationId The UUID of the iteration.
     * @return A list of maps, each representing a sequence (sqi_id, sqi_name).
     */
    def findSequencesByIterationId(UUID iterationId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT DISTINCT sqi.sqi_id, sqi.sqi_name
                FROM sequences_instance_sqi sqi
                JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                WHERE pli.ite_id = :iterationId
                ORDER BY sqi.sqi_name
            """, [iterationId: iterationId])
        }
    }

    /**
     * Finds all phases for a given iteration ID.
     * @param iterationId The UUID of the iteration.
     * @return A list of maps, each representing a phase (phi_id, phi_name).
     */
    def findPhasesByIterationId(UUID iterationId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT DISTINCT phi.phi_id, phi.phi_name
                FROM phases_instance_phi phi
                JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                WHERE pli.ite_id = :iterationId
                ORDER BY phi.phi_name
            """, [iterationId: iterationId])
        }
    }
    
    /**
     * Enriches migration data with status metadata while maintaining backward compatibility.
     * @param row Database row containing migration and status data
     * @return Enhanced migration map with statusMetadata
     */
    private Map enrichMigrationWithStatusMetadata(Map row) {
        return [
            mig_id: row.mig_id,
            usr_id_owner: row.usr_id_owner,
            mig_name: row.mig_name,
            mig_description: row.mig_description,
            mig_status: row.sts_name, // Backward compatibility - return status name as string
            mig_type: row.mig_type,
            mig_start_date: row.mig_start_date,
            mig_end_date: row.mig_end_date,
            mig_business_cutover_date: row.mig_business_cutover_date,
            created_by: row.created_by,
            created_at: row.created_at,
            updated_by: row.updated_by,
            updated_at: row.updated_at,
            // Enhanced status metadata
            statusMetadata: [
                id: row.sts_id,
                name: row.sts_name,
                color: row.sts_color,
                type: row.sts_type
            ]
        ]
    }
    
    /**
     * Enriches iteration data with status metadata while maintaining backward compatibility.
     * @param row Database row containing iteration and status data
     * @return Enhanced iteration map with statusMetadata
     */
    private Map enrichIterationWithStatusMetadata(Map row) {
        return [
            ite_id: row.ite_id,
            mig_id: row.mig_id,
            plm_id: row.plm_id,
            itt_code: row.itt_code,
            ite_name: row.ite_name,
            ite_description: row.ite_description,
            ite_status: row.sts_name, // Backward compatibility - return status name as string
            ite_static_cutover_date: row.ite_static_cutover_date,
            ite_dynamic_cutover_date: row.ite_dynamic_cutover_date,
            created_by: row.created_by,
            created_at: row.created_at,
            updated_by: row.updated_by,
            updated_at: row.updated_at,
            // Enhanced status metadata
            statusMetadata: [
                id: row.sts_id,
                name: row.sts_name,
                color: row.sts_color,
                type: row.sts_type
            ]
        ]
    }
    
    // ========== PHASE 2 ENHANCEMENTS: ADVANCED FILTERING METHODS ==========
    
    /**
     * Finds migrations by multiple status values with pagination.
     * @param statusNames List of status names to filter by
     * @param pageNumber Page number (1-based)
     * @param pageSize Number of items per page
     * @return Map with data array and pagination metadata
     */
    def findMigrationsByStatuses(List<String> statusNames, int pageNumber = 1, int pageSize = 50) {
        DatabaseUtil.withSql { sql ->
            pageNumber = Math.max(1, pageNumber)
            pageSize = Math.min(100, Math.max(1, pageSize))
            
            // Build IN clause for multiple statuses
            def statusPlaceholders = statusNames.collect { '?' }.join(', ')
            
            def countQuery = """
                SELECT COUNT(*) as total 
                FROM migrations_mig m
                JOIN status_sts s ON m.mig_status = s.sts_id
                WHERE s.sts_name IN (${statusPlaceholders})
            """
            String countQueryStr = countQuery.toString()
            def countResult = sql.firstRow(countQueryStr, statusNames as List<Object>)
            def totalCount = ((countResult as Map)?.total ?: 0) as Integer
            
            def offset = (pageNumber - 1) * pageSize
            def dataQuery = """
                SELECT m.*, s.sts_id, s.sts_name, s.sts_color, s.sts_type
                FROM migrations_mig m
                JOIN status_sts s ON m.mig_status = s.sts_id
                WHERE s.sts_name IN (${statusPlaceholders})
                ORDER BY m.mig_name ASC
                LIMIT ${pageSize} OFFSET ${offset}
            """
            
            String dataQueryStr = dataQuery.toString()
            def migrations = sql.rows(dataQueryStr, statusNames as List<Object>)
            def enrichedMigrations = migrations.collect { enrichMigrationWithStatusMetadata(it as Map) }
            
            return [
                data: enrichedMigrations,
                pagination: [
                    page: pageNumber,
                    size: pageSize,
                    total: totalCount,
                    totalPages: (int) Math.ceil((double) totalCount / (double) pageSize)
                ]
            ]
        }
    }
    
    /**
     * Finds migrations within a date range.
     * @param startDate Start date filter
     * @param endDate End date filter  
     * @param dateField Which date field to filter on
     * @param pageNumber Page number (1-based)
     * @param pageSize Number of items per page
     * @return Map with data array and pagination metadata
     */
    def findMigrationsByDateRange(Date startDate, Date endDate, String dateField = 'mig_start_date', int pageNumber = 1, int pageSize = 50) {
        DatabaseUtil.withSql { sql ->
            pageNumber = Math.max(1, pageNumber)
            pageSize = Math.min(100, Math.max(1, pageSize))
            
            def allowedDateFields = ['mig_start_date', 'mig_end_date', 'mig_business_cutover_date', 'created_at', 'updated_at']
            if (!allowedDateFields.contains(dateField)) {
                dateField = 'mig_start_date'
            }
            
            def countQuery = """
                SELECT COUNT(*) as total 
                FROM migrations_mig m
                WHERE m.${dateField} >= ? AND m.${dateField} <= ?
            """
            def totalCount = sql.firstRow(countQuery, [startDate, endDate])?.total ?: 0
            
            def offset = (pageNumber - 1) * pageSize
            def dataQuery = """
                SELECT m.*, s.sts_id, s.sts_name, s.sts_color, s.sts_type
                FROM migrations_mig m
                JOIN status_sts s ON m.mig_status = s.sts_id
                WHERE m.${dateField} >= ? AND m.${dateField} <= ?
                ORDER BY m.${dateField} ASC
                LIMIT ${pageSize} OFFSET ${offset}
            """
            
            def migrations = sql.rows(dataQuery, [startDate, endDate])
            def enrichedMigrations = migrations.collect { enrichMigrationWithStatusMetadata(it) }
            
            return [
                data: enrichedMigrations,
                pagination: [
                    page: pageNumber,
                    size: pageSize,
                    total: totalCount,
                    totalPages: (int) Math.ceil((double) totalCount / (double) pageSize)
                ]
            ]
        }
    }
    
    /**
     * Finds migrations by team assignment.
     * @param teamId Team ID to filter by
     * @param pageNumber Page number (1-based)
     * @param pageSize Number of items per page
     * @return Map with data array and pagination metadata
     */
    def findMigrationsByTeamAssignment(Integer teamId, int pageNumber = 1, int pageSize = 50) {
        DatabaseUtil.withSql { sql ->
            pageNumber = Math.max(1, pageNumber)
            pageSize = Math.min(100, Math.max(1, pageSize))
            
            def countQuery = """
                SELECT COUNT(DISTINCT m.mig_id) as total
                FROM migrations_mig m
                JOIN iterations_ite i ON i.mig_id = m.mig_id
                JOIN plans_instance_pli pli ON pli.ite_id = i.ite_id
                JOIN sequences_instance_sqi sqi ON sqi.pli_id = pli.pli_id
                JOIN phases_instance_phi phi ON phi.sqi_id = sqi.sqi_id
                JOIN steps_instance_sti sti ON sti.phi_id = phi.phi_id
                WHERE sti.tms_id_assigned_to = ?
            """
            def totalCount = sql.firstRow(countQuery, [teamId])?.total ?: 0
            
            def offset = (pageNumber - 1) * pageSize
            def dataQuery = """
                SELECT DISTINCT m.*, s.sts_id, s.sts_name, s.sts_color, s.sts_type
                FROM migrations_mig m
                JOIN status_sts s ON m.mig_status = s.sts_id
                JOIN iterations_ite i ON i.mig_id = m.mig_id
                JOIN plans_instance_pli pli ON pli.ite_id = i.ite_id
                JOIN sequences_instance_sqi sqi ON sqi.pli_id = pli.pli_id
                JOIN phases_instance_phi phi ON phi.sqi_id = sqi.sqi_id
                JOIN steps_instance_sti sti ON sti.phi_id = phi.phi_id
                WHERE sti.tms_id_assigned_to = ?
                ORDER BY m.mig_name ASC
                LIMIT ${pageSize} OFFSET ${offset}
            """
            
            def migrations = sql.rows(dataQuery, [teamId])
            def enrichedMigrations = migrations.collect { enrichMigrationWithStatusMetadata(it) }
            
            return [
                data: enrichedMigrations,
                pagination: [
                    page: pageNumber,
                    size: pageSize,
                    total: totalCount,
                    totalPages: (int) Math.ceil((double) totalCount / (double) pageSize)
                ]
            ]
        }
    }
    
    /**
     * Finds migrations by owner.
     * @param ownerId Owner user ID to filter by
     * @param pageNumber Page number (1-based)
     * @param pageSize Number of items per page
     * @return Map with data array and pagination metadata
     */
    def findMigrationsByOwner(Integer ownerId, int pageNumber = 1, int pageSize = 50) {
        DatabaseUtil.withSql { sql ->
            pageNumber = Math.max(1, pageNumber)
            pageSize = Math.min(100, Math.max(1, pageSize))
            
            def countQuery = """
                SELECT COUNT(*) as total
                FROM migrations_mig m
                WHERE m.usr_id_owner = ?
            """
            def totalCount = sql.firstRow(countQuery, [ownerId])?.total ?: 0
            
            def offset = (pageNumber - 1) * pageSize
            def dataQuery = """
                SELECT m.*, s.sts_id, s.sts_name, s.sts_color, s.sts_type
                FROM migrations_mig m
                JOIN status_sts s ON m.mig_status = s.sts_id
                WHERE m.usr_id_owner = ?
                ORDER BY m.mig_name ASC
                LIMIT ${pageSize} OFFSET ${offset}
            """
            
            def migrations = sql.rows(dataQuery, [ownerId])
            def enrichedMigrations = migrations.collect { enrichMigrationWithStatusMetadata(it) }
            
            return [
                data: enrichedMigrations,
                pagination: [
                    page: pageNumber,
                    size: pageSize,
                    total: totalCount,
                    totalPages: (int) Math.ceil((double) totalCount / (double) pageSize)
                ]
            ]
        }
    }
    
    /**
     * Combined filtering with multiple criteria.
     * @param filters Map of filter criteria
     * @param pageNumber Page number (1-based)
     * @param pageSize Number of items per page
     * @param sortField Field to sort by
     * @param sortDirection Sort direction
     * @return Map with data array and pagination metadata
     */
    def findMigrationsWithFilters(Map filters, int pageNumber = 1, int pageSize = 50, String sortField = null, String sortDirection = 'asc') {
        DatabaseUtil.withSql { sql ->
            pageNumber = Math.max(1, pageNumber)
            pageSize = Math.min(100, Math.max(1, pageSize))
            
            def whereConditions = []
            def params = []
            
            // Build dynamic WHERE clause
            if (filters.status) {
                if (filters.status instanceof List) {
                    def placeholders = filters.status.collect { '?' }.join(', ')
                    whereConditions << ("s.sts_name IN (${placeholders})".toString())
                    params.addAll(filters.status)
                } else {
                    whereConditions << "s.sts_name = ?"
                    params << filters.status
                }
            }
            
            if (filters.ownerId) {
                whereConditions << "m.usr_id_owner = ?"
                params << Integer.parseInt(filters.ownerId as String)
            }
            
            if (filters.search) {
                whereConditions << "(m.mig_name ILIKE ? OR m.mig_description ILIKE ?)"
                params << "%${filters.search}%"
                params << "%${filters.search}%"
            }
            
            if (filters.startDateFrom && filters.startDateTo) {
                whereConditions << "m.mig_start_date BETWEEN ? AND ?"
                params << filters.startDateFrom
                params << filters.startDateTo
            }
            
            def whereClause = whereConditions ? "WHERE " + whereConditions.join(" AND ") : ""
            
            // Count query
            def countQuery = """
                SELECT COUNT(DISTINCT m.mig_id) as total
                FROM migrations_mig m
                JOIN status_sts s ON m.mig_status = s.sts_id
                ${whereClause}
            """
            def totalCount = sql.firstRow(countQuery, params)?.total ?: 0
            
            // Validate sort field
            def allowedSortFields = ['mig_id', 'mig_name', 'mig_status', 'mig_start_date', 'mig_end_date', 'created_at']
            if (!sortField || !allowedSortFields.contains(sortField)) {
                sortField = 'mig_name'
            }
            sortDirection = (sortDirection?.toLowerCase() == 'desc') ? 'DESC' : 'ASC'
            
            // Data query
            def offset = (pageNumber - 1) * pageSize
            def dataQuery = """
                SELECT DISTINCT m.*, s.sts_id, s.sts_name, s.sts_color, s.sts_type
                FROM migrations_mig m
                JOIN status_sts s ON m.mig_status = s.sts_id
                ${whereClause}
                ORDER BY m.${sortField} ${sortDirection}
                LIMIT ${pageSize} OFFSET ${offset}
            """
            
            def migrations = sql.rows(dataQuery, params)
            def enrichedMigrations = migrations.collect { enrichMigrationWithStatusMetadata(it) }
            
            return [
                data: enrichedMigrations,
                pagination: [
                    page: pageNumber,
                    size: pageSize,
                    total: totalCount,
                    totalPages: (int) Math.ceil((double) totalCount / (double) pageSize)
                ],
                filters: filters
            ]
        }
    }
    
    // ========== PHASE 2 ENHANCEMENTS: BULK OPERATIONS ==========
    
    /**
     * Bulk update migration status with transaction support.
     * @param migrationIds List of migration UUIDs to update
     * @param newStatus New status name to set
     * @param reason Optional reason for the status change
     * @return Map with updated and failed lists
     */
    def bulkUpdateStatus(List<UUID> migrationIds, String newStatus, String reason = null) {
        DatabaseUtil.withSql { sql ->
            sql.withTransaction {
                def results = [updated: [], failed: []]
                
                // First validate the new status exists
                def statusRow = sql.firstRow("""
                    SELECT sts_id FROM status_sts 
                    WHERE sts_name = ? AND sts_type = 'migration'
                """, [newStatus])
                
                if (!statusRow) {
                    throw new IllegalArgumentException("Invalid status: ${newStatus}")
                }
                
                def statusId = statusRow.sts_id
                def now = new Date()
                
                migrationIds.each { migrationId ->
                    try {
                        def updateCount = sql.executeUpdate("""
                            UPDATE migrations_mig
                            SET mig_status = ?, updated_at = ?, updated_by = ?
                            WHERE mig_id = ?
                        """, [statusId, now, 'bulk-update', migrationId])
                        
                        if (updateCount > 0) {
                            results.updated << migrationId
                        } else {
                            results.failed << [id: migrationId, error: "Migration not found"]
                        }
                    } catch (Exception e) {
                        results.failed << [id: migrationId, error: e.message]
                    }
                }
                
                return results
            }
        }
    }
    
    /**
     * Bulk export migrations data.
     * @param migrationIds List of migration UUIDs to export
     * @param format Export format (json or csv)
     * @param includeIterations Whether to include iteration data
     * @return Export data in requested format
     */
    def bulkExportMigrations(List<UUID> migrationIds, String format = 'json', boolean includeIterations = false) {
        DatabaseUtil.withSql { sql ->
            def placeholders = migrationIds.collect { '?' }.join(', ')
            
            def query = """
                SELECT m.*, s.sts_name as status_name, u.usr_name as owner_name
                FROM migrations_mig m
                LEFT JOIN status_sts s ON m.mig_status = s.sts_id
                LEFT JOIN users_usr u ON m.usr_id_owner = u.usr_id
                WHERE m.mig_id IN (${placeholders})
                ORDER BY m.mig_name
            """
            
            String queryStr = query.toString()
            def migrations = sql.rows(queryStr, migrationIds as List<Object>)
            
            if (includeIterations) {
                migrations.each { migration ->
                    def migMap = migration as Map
                    migMap.iterations = findIterationsByMigrationId(migMap.mig_id as UUID)
                }
            }
            
            if (format == 'csv') {
                return convertToCSV(migrations as List<Map>)
            } else {
                return migrations
            }
        }
    }
    
    private String convertToCSV(List<Map> data) {
        if (!data) return ""
        
        def headers = data[0].keySet()
        def csv = new StringBuilder()
        csv.append(headers.join(',') + '\n')
        
        data.each { row ->
            csv.append(headers.collect { row[it] ?: '' }.join(',') + '\n')
        }
        
        return csv.toString()
    }
    
    // ========== PHASE 2 ENHANCEMENTS: DASHBOARD AGGREGATION ==========
    
    /**
     * Get dashboard summary with status counts and key metrics.
     * @return Map with summary statistics
     */
    def getDashboardSummary() {
        DatabaseUtil.withSql { sql ->
            // Status counts
            def statusCounts = sql.rows("""
                SELECT s.sts_name, s.sts_color, COUNT(m.mig_id) as count
                FROM status_sts s
                LEFT JOIN migrations_mig m ON m.mig_status = s.sts_id
                WHERE s.sts_type = 'migration'
                GROUP BY s.sts_id, s.sts_name, s.sts_color
                ORDER BY s.sts_name
            """)
            
            // Upcoming deadlines (next 30 days)
            def upcomingDeadlines = sql.rows("""
                SELECT mig_id, mig_name, mig_end_date
                FROM migrations_mig
                WHERE mig_end_date > CURRENT_DATE 
                  AND mig_end_date <= CURRENT_DATE + INTERVAL '30 days'
                ORDER BY mig_end_date ASC
                LIMIT 5
            """)
            
            // Recent updates (last 7 days)
            def recentUpdates = sql.rows("""
                SELECT mig_id, mig_name, updated_at, updated_by
                FROM migrations_mig
                WHERE updated_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
                ORDER BY updated_at DESC
                LIMIT 5
            """)
            
            // Total counts
            def totalMigrations = sql.firstRow("SELECT COUNT(*) as total FROM migrations_mig")?.total ?: 0
            def activeMigrations = sql.firstRow("""
                SELECT COUNT(*) as total FROM migrations_mig m
                JOIN status_sts s ON m.mig_status = s.sts_id
                WHERE s.sts_name IN ('In Progress', 'Active')
            """)?.total ?: 0
            
            return [
                totalMigrations: totalMigrations,
                activeMigrations: activeMigrations,
                statusDistribution: statusCounts,
                upcomingDeadlines: upcomingDeadlines,
                recentUpdates: recentUpdates
            ]
        }
    }
    
    /**
     * Get progress aggregation for migrations.
     * @param migrationId Optional specific migration UUID
     * @param dateFrom Optional start date filter
     * @param dateTo Optional end date filter
     * @return Map with progress metrics
     */
    def getProgressAggregation(UUID migrationId = null, Date dateFrom = null, Date dateTo = null) {
        DatabaseUtil.withSql { sql ->
            def whereConditions = []
            def params = []
            
            if (migrationId) {
                whereConditions << "m.mig_id = ?"
                params << migrationId
            }
            
            if (dateFrom && dateTo) {
                whereConditions << "m.mig_start_date >= ? AND m.mig_end_date <= ?"
                params << dateFrom
                params << dateTo
            }
            
            def whereClause = whereConditions ? "WHERE " + whereConditions.join(" AND ") : ""
            
            def progressQuery = """
                SELECT 
                    m.mig_id,
                    m.mig_name,
                    COUNT(DISTINCT i.ite_id) as total_iterations,
                    COUNT(DISTINCT CASE WHEN ist.sts_name = 'Completed' THEN i.ite_id END) as completed_iterations,
                    COUNT(DISTINCT sti.sti_id) as total_steps,
                    COUNT(DISTINCT CASE WHEN stst.sts_name = 'Completed' THEN sti.sti_id END) as completed_steps
                FROM migrations_mig m
                LEFT JOIN iterations_ite i ON i.mig_id = m.mig_id
                LEFT JOIN status_sts ist ON i.ite_status = ist.sts_id
                LEFT JOIN plans_instance_pli pli ON pli.ite_id = i.ite_id
                LEFT JOIN sequences_instance_sqi sqi ON sqi.pli_id = pli.pli_id
                LEFT JOIN phases_instance_phi phi ON phi.sqi_id = sqi.sqi_id
                LEFT JOIN steps_instance_sti sti ON sti.phi_id = phi.phi_id
                LEFT JOIN status_sts stst ON sti.sti_status = stst.sts_id
                ${whereClause}
                GROUP BY m.mig_id, m.mig_name
            """
            
            def progressData = sql.rows(progressQuery, params)
            
            // Calculate percentages
            progressData.each { row ->
                def rowMap = row as Map
                def totalIterations = (rowMap.total_iterations as Integer) ?: 0
                def completedIterations = (rowMap.completed_iterations as Integer) ?: 0
                def totalSteps = (rowMap.total_steps as Integer) ?: 0
                def completedSteps = (rowMap.completed_steps as Integer) ?: 0
                
                rowMap.iterationProgress = totalIterations > 0 ? 
                    ((completedIterations * 100.0) / totalIterations).round(2) : 0.0
                rowMap.stepProgress = totalSteps > 0 ? 
                    ((completedSteps * 100.0) / totalSteps).round(2) : 0.0
                rowMap.overallProgress = ((rowMap.iterationProgress as Double) + (rowMap.stepProgress as Double)) / 2.0
            }
            
            return progressData
        }
    }
    
    /**
     * Get performance metrics for migrations.
     * @param period Time period (day, week, month, quarter)
     * @param migrationId Optional specific migration UUID
     * @return Map with performance metrics
     */
    def getMetrics(String period = 'month', UUID migrationId = null) {
        DatabaseUtil.withSql { sql ->
            def intervalMap = [
                'day': '1 day',
                'week': '7 days',
                'month': '30 days',
                'quarter': '90 days'
            ]
            
            def interval = intervalMap[period] ?: '30 days'
            
            def whereConditions = [("m.created_at >= CURRENT_TIMESTAMP - INTERVAL '${interval}'".toString())]
            def params = []
            
            if (migrationId) {
                whereConditions << ("m.mig_id = ?" as String)
                params << migrationId
            }
            
            def whereClause = "WHERE " + whereConditions.join(" AND ")
            
            def metricsQuery = """
                SELECT 
                    COUNT(DISTINCT m.mig_id) as total_migrations,
                    COUNT(DISTINCT CASE WHEN s.sts_name = 'Completed' THEN m.mig_id END) as completed_migrations,
                    AVG(EXTRACT(EPOCH FROM (m.mig_end_date - m.mig_start_date))/86400)::numeric(10,2) as avg_duration_days,
                    MIN(m.mig_start_date) as earliest_start,
                    MAX(m.mig_end_date) as latest_end
                FROM migrations_mig m
                JOIN status_sts s ON m.mig_status = s.sts_id
                ${whereClause}
            """
            
            def metrics = sql.firstRow(metricsQuery, params) as Map
            
            metrics.period = period
            def totalMigrations = (metrics.total_migrations as Integer) ?: 0
            def completedMigrations = (metrics.completed_migrations as Integer) ?: 0
            metrics.completionRate = totalMigrations > 0 ? 
                ((completedMigrations * 100.0) / totalMigrations).round(2) : 0.0
            
            return metrics
        }
    }
    
    // ========== PHASE 2 ENHANCEMENTS: VALIDATION AND TRANSACTION SUPPORT ==========
    
    /**
     * Validates a UUID format.
     * @param id The UUID to validate
     * @param fieldName Name of the field for error messages
     * @throws IllegalArgumentException if UUID is invalid
     */
    private void validateUUID(UUID id, String fieldName) {
        if (!id) {
            throw new IllegalArgumentException("${fieldName} cannot be null")
        }
        
        try {
            UUID.fromString(id.toString())
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid ${fieldName} format: ${id}")
        }
    }
    
    /**
     * Validates a status value against the status_sts table.
     * @param status Status name to validate
     * @return The validated status ID
     * @throws IllegalArgumentException if status is invalid
     */
    private Integer validateStatus(String status) {
        DatabaseUtil.withSql { sql ->
            def statusRow = sql.firstRow("""
                SELECT sts_id FROM status_sts 
                WHERE sts_name = ? AND sts_type = 'migration'
            """, [status])
            
            if (!statusRow) {
                throw new IllegalArgumentException("Invalid migration status: ${status}")
            }
            
            return statusRow.sts_id as Integer
        }
    }
    
    /**
     * Validates date range logic.
     * @param startDate Start date
     * @param endDate End date
     * @throws IllegalArgumentException if dates are invalid
     */
    private void validateDateRange(Date startDate, Date endDate) {
        if (startDate && endDate && startDate.after(endDate)) {
            throw new IllegalArgumentException("Start date cannot be after end date")
        }
    }
    
    /**
     * Sanitizes query parameters to prevent SQL injection.
     * @param value The value to sanitize
     * @param maxLength Maximum allowed length
     * @return Sanitized value
     */
    private String sanitizeQueryParam(String value, int maxLength = 100) {
        if (!value) return null
        
        // Remove any SQL special characters
        def sanitized = value.replaceAll(/[';\\-\-\/\*\*\/]/, '')
        
        // Truncate to max length
        return sanitized.take(maxLength)
    }
    
    /**
     * Gets status metadata for a given status ID.
     * @param statusId The status ID
     * @return Map with status details (id, name, color, type) or null if not found
     */
    def getStatusMetadata(Integer statusId) {
        if (!statusId) return null
        
        DatabaseUtil.withSql { sql ->
            def status = sql.firstRow("""
                SELECT sts_id, sts_name, sts_color, sts_type
                FROM status_sts
                WHERE sts_id = ?
            """, [statusId])
            
            return status ? [
                id: status.sts_id,
                name: status.sts_name,
                color: status.sts_color,
                type: status.sts_type
            ] : null
        }
    }
    
    /**
     * Executes a database operation with transaction support.
     * @param operation The operation to execute
     * @return Result of the operation
     */
    private def executeWithTransaction(Closure operation) {
        DatabaseUtil.withSql { sql ->
            sql.withTransaction {
                try {
                    return operation(sql)
                } catch (Exception e) {
                    // Map SQL error codes to meaningful messages (Sprint 3 pattern)
                    if (e.message?.contains('23503')) {
                        throw new IllegalArgumentException("Cannot perform operation due to referential integrity constraints")
                    } else if (e.message?.contains('23505')) {
                        throw new IllegalArgumentException("Duplicate entry - record already exists")
                    } else {
                        throw e
                    }
                }
            }
        }
    }
    
    /**
     * Creates a new migration.
     * @param migrationData Map containing the migration data
     * @return The created migration with its generated ID
     */
    def create(Map migrationData) {
        DatabaseUtil.withSql { sql ->
            // Set default status if not provided
            if (!migrationData.mig_status) {
                def defaultStatus = sql.firstRow("SELECT sts_id FROM status_sts WHERE sts_name = 'PLANNING' AND sts_type = 'Migration'")
                migrationData.mig_status = defaultStatus?.sts_id ?: 1
            }
            
            // Generate UUID for the new migration
            def migrationId = UUID.randomUUID()
            
            def insertQuery = """
                INSERT INTO migrations_mig (
                    mig_id, usr_id_owner, mig_name, mig_description, mig_status, 
                    mig_type, mig_start_date, mig_end_date, mig_business_cutover_date,
                    created_by, created_at, updated_by, updated_at
                ) VALUES (
                    :mig_id, :usr_id_owner, :mig_name, :mig_description, :mig_status,
                    :mig_type, :mig_start_date, :mig_end_date, :mig_business_cutover_date,
                    :created_by, CURRENT_TIMESTAMP, :updated_by, CURRENT_TIMESTAMP
                )
            """
            
            def params = [
                mig_id: migrationId,
                usr_id_owner: migrationData.usr_id_owner as Integer,
                mig_name: (migrationData.mig_name ?: migrationData.name).toString(),
                mig_description: (migrationData.mig_description ?: migrationData.description) as String,
                mig_status: (migrationData.mig_status ?: migrationData.status) as Integer,
                mig_type: (migrationData.mig_type ?: migrationData.type ?: 'MIGRATION') as String,
                mig_start_date: migrationData.mig_start_date ?: migrationData.startDate,
                mig_end_date: migrationData.mig_end_date ?: migrationData.endDate,
                mig_business_cutover_date: migrationData.mig_business_cutover_date ?: migrationData.businessCutoverDate,
                created_by: (migrationData.created_by ?: 'system') as String,
                updated_by: (migrationData.updated_by ?: 'system') as String
            ]
            
            sql.executeInsert(insertQuery, params)
            
            // Return the newly created migration
            return findMigrationById(migrationId)
        }
    }
    
    /**
     * Updates an existing migration.
     * @param migrationId The UUID of the migration to update
     * @param migrationData Map containing the updated data
     * @return The updated migration or null if not found
     */
    def update(UUID migrationId, Map migrationData) {
        DatabaseUtil.withSql { sql ->
            // Build dynamic update query based on provided fields
            def updateFields = []
            Map<String, Object> params = [mig_id: migrationId]
            
            // Map both snake_case and camelCase field names
            if (migrationData.containsKey('mig_name') || migrationData.containsKey('name')) {
                updateFields << "mig_name = :mig_name"
                params.mig_name = (migrationData.mig_name ?: migrationData.name) as String
            }
            if (migrationData.containsKey('mig_description') || migrationData.containsKey('description')) {
                updateFields << "mig_description = :mig_description"
                params.mig_description = (migrationData.mig_description ?: migrationData.description) as String
            }
            if (migrationData.containsKey('mig_status') || migrationData.containsKey('status')) {
                updateFields << "mig_status = :mig_status"
                params.mig_status = (migrationData.mig_status ?: migrationData.status) as Integer
            }
            if (migrationData.containsKey('mig_type') || migrationData.containsKey('type')) {
                updateFields << "mig_type = :mig_type"
                params.mig_type = (migrationData.mig_type ?: migrationData.type) as String
            }
            if (migrationData.containsKey('mig_start_date') || migrationData.containsKey('startDate')) {
                updateFields << "mig_start_date = :mig_start_date"
                params.mig_start_date = migrationData.mig_start_date ?: migrationData.startDate
            }
            if (migrationData.containsKey('mig_end_date') || migrationData.containsKey('endDate')) {
                updateFields << "mig_end_date = :mig_end_date"
                params.mig_end_date = migrationData.mig_end_date ?: migrationData.endDate
            }
            if (migrationData.containsKey('mig_business_cutover_date') || migrationData.containsKey('businessCutoverDate')) {
                updateFields << "mig_business_cutover_date = :mig_business_cutover_date"
                params.mig_business_cutover_date = migrationData.mig_business_cutover_date ?: migrationData.businessCutoverDate
            }
            if (migrationData.containsKey('usr_id_owner') || migrationData.containsKey('ownerId')) {
                updateFields << "usr_id_owner = :usr_id_owner"
                params.usr_id_owner = (migrationData.usr_id_owner ?: migrationData.ownerId) as Integer
            }
            
            // Always update the updated_at and updated_by fields
            updateFields << "updated_at = CURRENT_TIMESTAMP"
            updateFields << "updated_by = :updated_by"
            params.updated_by = (migrationData.updated_by ?: 'system') as String
            
            if (updateFields.isEmpty()) {
                return findMigrationById(migrationId) // No fields to update
            }
            
            def updateQuery = """
                UPDATE migrations_mig
                SET ${updateFields.join(', ')}
                WHERE mig_id = :mig_id
            """
            
            def rowsUpdated = sql.executeUpdate(updateQuery, params)
            
            if (rowsUpdated > 0) {
                return findMigrationById(migrationId)
            }
            return null
        }
    }
    
    /**
     * Deletes a migration by ID.
     * @param migrationId The UUID of the migration to delete
     * @return true if deleted, false if not found
     */
    def delete(UUID migrationId) {
        DatabaseUtil.withSql { sql ->
            def deleteQuery = "DELETE FROM migrations_mig WHERE mig_id = ?"
            def rowsDeleted = sql.executeUpdate(deleteQuery, [migrationId])
            return rowsDeleted > 0
        }
    }
}
