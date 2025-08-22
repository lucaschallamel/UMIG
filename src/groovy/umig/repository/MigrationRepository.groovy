package umig.repository

import umig.utils.DatabaseUtil
import java.util.UUID
import org.slf4j.Logger
import org.slf4j.LoggerFactory

/**
 * Repository class for managing Migration data.
 * Handles all database operations for the migrations_mig table.
 */
class MigrationRepository {
    private static final Logger log = LoggerFactory.getLogger(MigrationRepository.class)
    /**
     * Retrieves all migrations from the database.
     * @return A list of maps, where each map is a migration.
     */
    def findAllMigrations() {
        DatabaseUtil.withSql { sql ->
            def migrations = sql.rows("""
                SELECT m.mig_id, m.usr_id_owner, m.mig_name, m.mig_description, m.mig_status, m.mig_type, 
                       m.mig_start_date, m.mig_end_date, m.mig_business_cutover_date, 
                       m.created_by, m.created_at, m.updated_by, m.updated_at,
                       s.sts_id, s.sts_name, s.sts_color, s.sts_type,
                       COALESCE(iteration_counts.iteration_count, 0) as iteration_count,
                       COALESCE(plan_counts.plan_count, 0) as plan_count
                FROM migrations_mig m
                JOIN status_sts s ON m.mig_status = s.sts_id
                LEFT JOIN (
                    SELECT mig_id, COUNT(*) as iteration_count
                    FROM iterations_ite
                    GROUP BY mig_id
                ) iteration_counts ON m.mig_id = iteration_counts.mig_id
                LEFT JOIN (
                    SELECT ite.mig_id, COUNT(DISTINCT ite.plm_id) as plan_count
                    FROM iterations_ite ite
                    GROUP BY ite.mig_id
                ) plan_counts ON m.mig_id = plan_counts.mig_id
                ORDER BY m.mig_name
            """)
            
            // Enrich with status metadata
            return migrations.collect { row ->
                return enrichMigrationWithStatusMetadata(row)
            }
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
            def allowedSortFields = ['mig_id', 'mig_name', 'mig_description', 'mig_status', 'mig_type', 'mig_start_date', 'mig_end_date', 'created_at', 'updated_at', 'iteration_count', 'plan_count']
            if (!sortField || !allowedSortFields.contains(sortField)) {
                sortField = 'mig_name'
            }
            
            sortDirection = (sortDirection?.toLowerCase() == 'desc') ? 'DESC' : 'ASC'
            
            // Build base query with optional search and computed counts
            def baseQuery = """
                SELECT m.mig_id, m.usr_id_owner, m.mig_name, m.mig_description, m.mig_status, m.mig_type, 
                       m.mig_start_date, m.mig_end_date, m.mig_business_cutover_date, 
                       m.created_by, m.created_at, m.updated_by, m.updated_at,
                       s.sts_id, s.sts_name, s.sts_color, s.sts_type,
                       COALESCE(iteration_counts.iteration_count, 0) as iteration_count,
                       COALESCE(plan_counts.plan_count, 0) as plan_count
                FROM migrations_mig m
                JOIN status_sts s ON m.mig_status = s.sts_id
                LEFT JOIN (
                    SELECT mig_id, COUNT(*) as iteration_count
                    FROM iterations_ite
                    GROUP BY mig_id
                ) iteration_counts ON m.mig_id = iteration_counts.mig_id
                LEFT JOIN (
                    SELECT ite.mig_id, COUNT(DISTINCT ite.plm_id) as plan_count
                    FROM iterations_ite ite
                    GROUP BY ite.mig_id
                ) plan_counts ON m.mig_id = plan_counts.mig_id
            """
            
            def whereClause = ""
            def params = [:]
            
            if (searchTerm && searchTerm.trim()) {
                whereClause = "WHERE (m.mig_name ILIKE :search OR m.mig_description ILIKE :search)"
                params.search = "%${searchTerm.trim()}%"
            }
            
            // Count total records
            def countQuery = """
                SELECT COUNT(DISTINCT m.mig_id) as total
                FROM migrations_mig m
                JOIN status_sts s ON m.mig_status = s.sts_id
                ${whereClause}
            """
            def totalCount = sql.firstRow(countQuery, params)?.total ?: 0
            
            // Calculate pagination
            def offset = (pageNumber - 1) * pageSize
            def totalPages = (int) Math.ceil((double) totalCount / (double) pageSize)
            
            // Build paginated data query
            def dataQuery = """
                ${baseQuery}
                ${whereClause}
                ORDER BY ${['iteration_count', 'plan_count'].contains(sortField) ? sortField : 'm.' + sortField} ${sortDirection}
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
            def migration = sql.firstRow("""
                SELECT m.mig_id, m.usr_id_owner, m.mig_name, m.mig_description, m.mig_status, m.mig_type, 
                       m.mig_start_date, m.mig_end_date, m.mig_business_cutover_date, 
                       m.created_by, m.created_at, m.updated_by, m.updated_at,
                       s.sts_id, s.sts_name, s.sts_color, s.sts_type,
                       COALESCE(iteration_counts.iteration_count, 0) as iteration_count,
                       COALESCE(plan_counts.plan_count, 0) as plan_count
                FROM migrations_mig m
                JOIN status_sts s ON m.mig_status = s.sts_id
                LEFT JOIN (
                    SELECT mig_id, COUNT(*) as iteration_count
                    FROM iterations_ite
                    GROUP BY mig_id
                ) iteration_counts ON m.mig_id = iteration_counts.mig_id
                LEFT JOIN (
                    SELECT ite.mig_id, COUNT(DISTINCT ite.plm_id) as plan_count
                    FROM iterations_ite ite
                    GROUP BY ite.mig_id
                ) plan_counts ON m.mig_id = plan_counts.mig_id
                WHERE m.mig_id = :migrationId
            """, [migrationId: migrationId])
            
            // If found, enrich with status metadata
            return migration ? enrichMigrationWithStatusMetadata(migration) : null
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
            // Computed fields from joins
            iteration_count: row.iteration_count ?: 0,
            plan_count: row.plan_count ?: 0,
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
                params << "%${filters.search}%".toString()
                params << "%${filters.search}%".toString()
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
            def allowedSortFields = ['mig_id', 'mig_name', 'mig_status', 'mig_start_date', 'mig_end_date', 'created_at', 'updated_at', 'iteration_count', 'plan_count']
            if (!sortField || !allowedSortFields.contains(sortField)) {
                sortField = 'mig_name'
            }
            sortDirection = (sortDirection?.toLowerCase() == 'desc') ? 'DESC' : 'ASC'
            
            // Data query with computed fields
            def offset = (pageNumber - 1) * pageSize
            def dataQuery = """
                SELECT DISTINCT m.*, s.sts_id, s.sts_name, s.sts_color, s.sts_type,
                       COALESCE(iteration_counts.iteration_count, 0) as iteration_count,
                       COALESCE(plan_counts.plan_count, 0) as plan_count
                FROM migrations_mig m
                JOIN status_sts s ON m.mig_status = s.sts_id
                LEFT JOIN (
                    SELECT mig_id, COUNT(*) as iteration_count
                    FROM iterations_ite
                    GROUP BY mig_id
                ) iteration_counts ON m.mig_id = iteration_counts.mig_id
                LEFT JOIN (
                    SELECT ite.mig_id, COUNT(DISTINCT ite.plm_id) as plan_count
                    FROM iterations_ite ite
                    GROUP BY ite.mig_id
                ) plan_counts ON m.mig_id = plan_counts.mig_id
                ${whereClause}
                ORDER BY ${['iteration_count', 'plan_count'].contains(sortField) ? sortField : 'm.' + sortField} ${sortDirection}
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
                    WHERE sts_name = ? AND sts_type = 'Migration'
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
                WHERE s.sts_type = 'Migration'
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
                WHERE sts_name = ? AND sts_type = 'Migration'
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
            log.info("MigrationRepository.create() - Input data: ${migrationData}")
            
            // Validate required fields
            if (!migrationData.mig_name && !migrationData.name) {
                log.error("MigrationRepository.create() - Missing migration name in data: ${migrationData}")
                throw new IllegalArgumentException("Migration name is required")
            }
            
            // Handle status - can be either a string name or an integer ID
            def statusId = null
            def statusValue = migrationData.mig_status ?: migrationData.status
            log.debug("MigrationRepository.create() - Processing status value: ${statusValue} (type: ${statusValue?.getClass()?.simpleName})")
            
            if (statusValue) {
                // Check if it's a string (status name) or integer (status ID)
                if (statusValue instanceof String) {
                    // Look up the status ID by name
                    def statusRow = sql.firstRow(
                        "SELECT sts_id FROM status_sts WHERE sts_name = :statusName AND sts_type = 'Migration'",
                        [statusName: statusValue]
                    )
                    if (!statusRow) {
                        log.error("MigrationRepository.create() - Invalid status name '${statusValue}'. Available statuses: ${sql.rows('SELECT sts_name FROM status_sts WHERE sts_type = \'Migration\'').collect { it.sts_name }}")
                        throw new IllegalArgumentException("Invalid status name: ${statusValue}. Available statuses: ${sql.rows('SELECT sts_name FROM status_sts WHERE sts_type = \'Migration\'').collect { it.sts_name }.join(', ')}")
                    }
                    statusId = statusRow.sts_id
                    log.debug("MigrationRepository.create() - Resolved status '${statusValue}' to ID: ${statusId}")
                } else {
                    // It's already an integer ID - validate it exists
                    statusId = statusValue as Integer
                    def statusExists = sql.firstRow(
                        "SELECT sts_id FROM status_sts WHERE sts_id = :statusId AND sts_type = 'Migration'",
                        [statusId: statusId]
                    )
                    if (!statusExists) {
                        log.error("MigrationRepository.create() - Invalid status ID: ${statusId}")
                        throw new IllegalArgumentException("Invalid status ID: ${statusId}")
                    }
                    log.debug("MigrationRepository.create() - Validated status ID: ${statusId}")
                }
            } else {
                // Set default status if not provided
                def defaultStatus = sql.firstRow("SELECT sts_id FROM status_sts WHERE sts_name = 'PLANNING' AND sts_type = 'Migration'")
                if (!defaultStatus) {
                    // Try alternative default status names
                    defaultStatus = sql.firstRow("SELECT sts_id FROM status_sts WHERE sts_name IN ('Planning', 'Draft', 'New') AND sts_type = 'Migration' ORDER BY sts_name LIMIT 1")
                    if (!defaultStatus) {
                        log.error("MigrationRepository.create() - No default status found. Available migration statuses: ${sql.rows('SELECT sts_name FROM status_sts WHERE sts_type = \'Migration\'').collect { it.sts_name }}")
                        throw new IllegalArgumentException("No default status found in database. Available statuses: ${sql.rows('SELECT sts_name FROM status_sts WHERE sts_type = \'Migration\'').collect { it.sts_name }.join(', ')}")
                    }
                }
                statusId = defaultStatus.sts_id
                log.info("MigrationRepository.create() - Using default status: ${defaultStatus.sts_name} (ID: ${statusId})")
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
            
            // Handle owner - default to system user if not provided
            def ownerId = null
            if (migrationData.usr_id_owner) {
                ownerId = migrationData.usr_id_owner as Integer
                // Validate that the owner exists
                def ownerExists = sql.firstRow("SELECT usr_id FROM users_usr WHERE usr_id = ?", [ownerId])
                if (!ownerExists) {
                    log.error("MigrationRepository.create() - Invalid owner ID: ${ownerId}")
                    throw new IllegalArgumentException("Invalid owner ID: ${ownerId}. User does not exist.")
                }
                log.debug("MigrationRepository.create() - Using provided owner ID: ${ownerId}")
            } else {
                // Get default system user - prefer admin, then any active user
                def systemUser = sql.firstRow("SELECT usr_id, usr_name FROM users_usr WHERE usr_is_admin = true AND usr_active = true LIMIT 1")
                if (!systemUser) {
                    // If no admin exists, get any active user
                    systemUser = sql.firstRow("SELECT usr_id, usr_name FROM users_usr WHERE usr_active = true LIMIT 1")
                }
                if (!systemUser) {
                    // Last resort - get any user
                    systemUser = sql.firstRow("SELECT usr_id, usr_name FROM users_usr LIMIT 1")
                }
                if (!systemUser) {
                    log.error("MigrationRepository.create() - No users exist in the system")
                    throw new IllegalArgumentException("No users exist in the system. Cannot create migration without owner.")
                }
                ownerId = systemUser.usr_id
                log.info("MigrationRepository.create() - Auto-assigned owner: ${systemUser.usr_name} (ID: ${ownerId})")
            }
            
            // Parse dates if they're strings
            def parseDate = { dateValue ->
                if (!dateValue) return null
                if (dateValue instanceof java.sql.Date || dateValue instanceof java.sql.Timestamp) return dateValue
                if (dateValue instanceof Date) {
                    return new java.sql.Date(dateValue.time)
                }
                if (dateValue instanceof String) {
                    try {
                        def parsedDate = Date.parse('yyyy-MM-dd', dateValue)
                        return new java.sql.Date(parsedDate.time)
                    } catch (Exception e) {
                        // Try ISO format with time
                        try {
                            def parsedDate = Date.parse("yyyy-MM-dd'T'HH:mm:ss", dateValue)
                            return new java.sql.Timestamp(parsedDate.time)
                        } catch (Exception e2) {
                            try {
                                def parsedDate = Date.parse("yyyy-MM-dd'T'HH:mm:ss.SSS", dateValue)
                                return new java.sql.Timestamp(parsedDate.time)
                            } catch (Exception e3) {
                                log.warn("MigrationRepository.create() - Failed to parse date string: ${dateValue}")
                                return null
                            }
                        }
                    }
                }
                return null
            }
            
            def params = [
                mig_id: migrationId,
                usr_id_owner: ownerId,
                mig_name: (migrationData.mig_name ?: migrationData.name).toString(),
                mig_description: (migrationData.mig_description ?: migrationData.description) as String,
                mig_status: statusId,
                mig_type: (migrationData.mig_type ?: migrationData.type ?: 'MIGRATION').toString(),
                mig_start_date: parseDate(migrationData.mig_start_date ?: migrationData.startDate),
                mig_end_date: parseDate(migrationData.mig_end_date ?: migrationData.endDate),
                mig_business_cutover_date: parseDate(migrationData.mig_business_cutover_date ?: migrationData.businessCutoverDate),
                created_by: (migrationData.created_by ?: 'system') as String,
                updated_by: (migrationData.updated_by ?: 'system') as String
            ]
            
            try {
                log.info("MigrationRepository.create() - Executing insert with params: ${params.findAll { k, v -> k != 'mig_description' }}")
                def insertResult = sql.executeInsert(insertQuery, params)
                log.info("MigrationRepository.create() - Insert result: ${insertResult}")
                
                // Return the newly created migration
                def createdMigration = findMigrationById(migrationId)
                log.info("MigrationRepository.create() - Successfully created migration: ${createdMigration?.mig_id}")
                return createdMigration
            } catch (java.sql.SQLException e) {
                log.error("MigrationRepository.create() - SQL Exception. SQL State: ${e.SQLState}, Error Code: ${e.errorCode}, Message: ${e.message}. Params: ${params}", e)
                
                // Provide specific error messages for common SQL errors
                if (e.SQLState == '23503') {
                    if (e.message?.contains('usr_id_owner')) {
                        throw new IllegalArgumentException("Invalid owner user ID ${params.usr_id_owner} - user does not exist")
                    } else if (e.message?.contains('mig_status')) {
                        throw new IllegalArgumentException("Invalid status ID ${params.mig_status} - status does not exist")
                    }
                    throw new IllegalArgumentException("Foreign key constraint violation: ${e.message}")
                } else if (e.SQLState == '23505') {
                    if (e.message?.contains('mig_name')) {
                        throw new IllegalArgumentException("A migration with the name '${params.mig_name}' already exists")
                    }
                    throw new IllegalArgumentException("Unique constraint violation: ${e.message}")
                } else if (e.SQLState == '23502') {
                    throw new IllegalArgumentException("Missing required field: ${e.message}")
                }
                throw e
            } catch (Exception e) {
                log.error("MigrationRepository.create() - Unexpected error during migration creation. Params: ${params}", e)
                throw e
            }
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
            log.info("MigrationRepository.update() - Updating migration ${migrationId} with data: ${migrationData}")
            
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
                def statusValue = migrationData.mig_status ?: migrationData.status
                log.debug("MigrationRepository.update() - Processing status update: ${statusValue} (type: ${statusValue?.getClass()?.simpleName})")
                
                // Handle both string names and integer IDs
                if (statusValue instanceof String) {
                    // Look up the status ID by name
                    def statusRow = sql.firstRow(
                        "SELECT sts_id FROM status_sts WHERE sts_name = :statusName AND sts_type = 'Migration'",
                        [statusName: statusValue]
                    )
                    if (!statusRow) {
                        log.error("MigrationRepository.update() - Invalid status name '${statusValue}'. Available statuses: ${sql.rows('SELECT sts_name FROM status_sts WHERE sts_type = \'Migration\'').collect { it.sts_name }}")
                        throw new IllegalArgumentException("Invalid status name: ${statusValue}. Available statuses: ${sql.rows('SELECT sts_name FROM status_sts WHERE sts_type = \'Migration\'').collect { it.sts_name }.join(', ')}")
                    }
                    params.mig_status = statusRow.sts_id
                    log.debug("MigrationRepository.update() - Resolved status '${statusValue}' to ID: ${statusRow.sts_id}")
                } else {
                    // It's already an integer ID - validate it exists
                    def statusId = statusValue as Integer
                    def statusExists = sql.firstRow(
                        "SELECT sts_id FROM status_sts WHERE sts_id = :statusId AND sts_type = 'Migration'",
                        [statusId: statusId]
                    )
                    if (!statusExists) {
                        log.error("MigrationRepository.update() - Invalid status ID: ${statusId}")
                        throw new IllegalArgumentException("Invalid status ID: ${statusId}")
                    }
                    params.mig_status = statusId
                    log.debug("MigrationRepository.update() - Validated status ID: ${statusId}")
                }
            }
            if (migrationData.containsKey('mig_type') || migrationData.containsKey('type')) {
                updateFields << "mig_type = :mig_type"
                params.mig_type = (migrationData.mig_type ?: migrationData.type) as String
            }
            // Date parsing helper function (same as create method)
            def parseDate = { dateValue ->
                if (dateValue == null) return null
                if (dateValue instanceof String) {
                    try {
                        def parsedDate = Date.parse('yyyy-MM-dd', dateValue)
                        return new java.sql.Date(parsedDate.time)
                    } catch (Exception e) {
                        try {
                            def parsedDate = Date.parse("yyyy-MM-dd'T'HH:mm:ss", dateValue)
                            return new java.sql.Timestamp(parsedDate.time)
                        } catch (Exception e2) {
                            try {
                                def parsedDate = Date.parse("yyyy-MM-dd'T'HH:mm:ss.SSS", dateValue)
                                return new java.sql.Timestamp(parsedDate.time)
                            } catch (Exception e3) {
                                log.warn("MigrationRepository.update() - Failed to parse date string: ${dateValue}, using as-is")
                                return dateValue // Let database handle it
                            }
                        }
                    }
                }
                return dateValue // Already a Date object or other type
            }
            
            if (migrationData.containsKey('mig_start_date') || migrationData.containsKey('startDate')) {
                updateFields << "mig_start_date = :mig_start_date"
                def rawDate = migrationData.mig_start_date ?: migrationData.startDate
                params.mig_start_date = parseDate(rawDate)
                log.debug("MigrationRepository.update() - Parsed start date: ${rawDate} -> ${params.mig_start_date}")
            }
            if (migrationData.containsKey('mig_end_date') || migrationData.containsKey('endDate')) {
                updateFields << "mig_end_date = :mig_end_date"
                def rawDate = migrationData.mig_end_date ?: migrationData.endDate
                params.mig_end_date = parseDate(rawDate)
                log.debug("MigrationRepository.update() - Parsed end date: ${rawDate} -> ${params.mig_end_date}")
            }
            if (migrationData.containsKey('mig_business_cutover_date') || migrationData.containsKey('businessCutoverDate')) {
                updateFields << "mig_business_cutover_date = :mig_business_cutover_date"
                def rawDate = migrationData.mig_business_cutover_date ?: migrationData.businessCutoverDate
                params.mig_business_cutover_date = parseDate(rawDate)
                log.debug("MigrationRepository.update() - Parsed business cutover date: ${rawDate} -> ${params.mig_business_cutover_date}")
            }
            if (migrationData.containsKey('usr_id_owner') || migrationData.containsKey('ownerId')) {
                updateFields << "usr_id_owner = :usr_id_owner"
                def ownerId = (migrationData.usr_id_owner ?: migrationData.ownerId) as Integer
                // Validate that the owner exists
                def ownerExists = sql.firstRow("SELECT usr_id FROM users_usr WHERE usr_id = ?", [ownerId])
                if (!ownerExists) {
                    log.error("MigrationRepository.update() - Invalid owner ID: ${ownerId}")
                    throw new IllegalArgumentException("Invalid owner ID: ${ownerId}. User does not exist.")
                }
                params.usr_id_owner = ownerId
                log.debug("MigrationRepository.update() - Updating owner to ID: ${ownerId}")
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
            
            try {
                log.info("MigrationRepository.update() - Executing update query with params: ${params.findAll { k, v -> k != 'mig_description' }}")
                def rowsUpdated = sql.executeUpdate(updateQuery, params)
                log.info("MigrationRepository.update() - Updated ${rowsUpdated} rows for migration ${migrationId}")
                
                if (rowsUpdated > 0) {
                    def updatedMigration = findMigrationById(migrationId)
                    log.info("MigrationRepository.update() - Successfully updated migration: ${migrationId}")
                    return updatedMigration
                }
                log.warn("MigrationRepository.update() - No rows updated for migration ${migrationId} - migration may not exist")
                return null
            } catch (java.sql.SQLException e) {
                log.error("MigrationRepository.update() - SQL Exception. SQL State: ${e.SQLState}, Error Code: ${e.errorCode}, Message: ${e.message}. Params: ${params}", e)
                
                // Provide specific error messages for common SQL errors
                if (e.SQLState == '23503') {
                    if (e.message?.contains('usr_id_owner')) {
                        throw new IllegalArgumentException("Invalid owner user ID ${params.usr_id_owner} - user does not exist")
                    } else if (e.message?.contains('mig_status')) {
                        throw new IllegalArgumentException("Invalid status ID ${params.mig_status} - status does not exist")
                    }
                    throw new IllegalArgumentException("Foreign key constraint violation: ${e.message}")
                } else if (e.SQLState == '23505') {
                    if (e.message?.contains('mig_name')) {
                        throw new IllegalArgumentException("A migration with the name '${params.mig_name}' already exists")
                    }
                    throw new IllegalArgumentException("Unique constraint violation: ${e.message}")
                } else if (e.SQLState == '23502') {
                    throw new IllegalArgumentException("Missing required field: ${e.message}")
                }
                throw e
            } catch (Exception e) {
                log.error("MigrationRepository.update() - Unexpected error during migration update. Params: ${params}", e)
                throw e
            }
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
