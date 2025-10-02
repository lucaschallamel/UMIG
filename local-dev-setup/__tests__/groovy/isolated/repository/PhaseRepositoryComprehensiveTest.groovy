#!/usr/bin/env groovy

/**
 * PhaseRepositoryComprehensiveTest.groovy
 *
 * Comprehensive test suite for PhaseRepository using TD-001 self-contained architecture.
 *
 * Architecture: Pure Groovy script with embedded classes (zero external dependencies)
 * Pattern: No JUnit annotations, direct method execution with enhanced error reporting
 * Coverage: 21 methods across dual-table pattern (phases_master_phm + phases_instance_phi)
 * Quality Target: 26+ tests, 100% pass rate, 9.5+/10 quality score
 *
 * TD-001 Compliance:
 * - Zero external dependencies (embedded DatabaseUtil, repository, mock SQL)
 * - Self-contained execution (./PhaseRepositoryComprehensiveTest.groovy)
 * - No JUnit infrastructure required
 * - Complete test isolation through embedded mock data
 *
 * ADR-031 Compliance:
 * - Explicit type casting for all parameters
 * - UUID.fromString(param as String)
 * - Integer.parseInt(param as String)
 * - Proper null handling
 *
 * Test Categories:
 * - Category A: Master Phase CRUD (6 tests)
 * - Category B: Instance Phase CRUD (5 tests)
 * - Category C: Pagination & Filtering (6 tests)
 * - Category D: Hierarchical Filtering (5 tests)
 * - Category E: Edge Cases & Complex Operations (4 tests)
 *
 * Execution:
 *   groovy local-dev-setup/__tests__/groovy/isolated/repository/PhaseRepositoryComprehensiveTest.groovy
 *
 * Date: October 2, 2025
 * Sprint 8: TD-014-B Repository Testing Enhancement
 */

// ==================== EMBEDDED CLASSES (TD-001 SELF-CONTAINED ARCHITECTURE) ====================

/**
 * Embedded DatabaseUtil - Zero external dependencies
 * Provides withSql pattern for all database access
 */
class EmbeddedDatabaseUtil {
    static def withSql(Closure closure) {
        def mockSql = new EmbeddedMockSql()
        return closure.call(mockSql)
    }
}

/**
 * Embedded PhaseRepository - Simplified implementation for TD-001 testing
 * Implements core phase operations without StatusService complexity
 */
class EmbeddedPhaseRepository {

    // ==================== MASTER PHASE OPERATIONS ====================

    def findAllMasterPhases() {
        EmbeddedDatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT phm.*, sqm.sqm_name, sqm.plm_id, plm.plm_name, plm.tms_id, tms.tms_name,
                       pred.phm_name as predecessor_name
                FROM phases_master_phm phm
                JOIN sequences_master_sqm sqm ON phm.sqm_id = sqm.sqm_id
                JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id
                LEFT JOIN teams_tms tms ON plm.tms_id = tms.tms_id
                LEFT JOIN phases_master_phm pred ON phm.predecessor_phm_id = pred.phm_id
                ORDER BY plm.plm_name, sqm.sqm_order, phm.phm_order
            """)
        }
    }

    def findMasterPhasesBySequenceId(UUID sequenceId) {
        EmbeddedDatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT phm.*, sqm.sqm_name, pred.phm_name as predecessor_name
                FROM phases_master_phm phm
                JOIN sequences_master_sqm sqm ON phm.sqm_id = sqm.sqm_id
                LEFT JOIN phases_master_phm pred ON phm.predecessor_phm_id = pred.phm_id
                WHERE phm.sqm_id = :sequenceId
                ORDER BY phm.phm_order
            """, [sequenceId: sequenceId])
        }
    }

    def findMasterPhaseById(UUID phaseId) {
        EmbeddedDatabaseUtil.withSql { sql ->
            def row = sql.firstRow("""
                SELECT phm.*, sqm.sqm_name, sqm.plm_id, plm.plm_name, plm.tms_id, tms.tms_name,
                       pred.phm_name as predecessor_name,
                       COALESCE(step_counts.step_count, 0) as step_count,
                       COALESCE(instance_counts.instance_count, 0) as instance_count
                FROM phases_master_phm phm
                JOIN sequences_master_sqm sqm ON phm.sqm_id = sqm.sqm_id
                JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id
                LEFT JOIN teams_tms tms ON plm.tms_id = tms.tms_id
                LEFT JOIN phases_master_phm pred ON phm.predecessor_phm_id = pred.phm_id
                LEFT JOIN (SELECT phm_id, COUNT(*) as step_count FROM steps_master_stm GROUP BY phm_id) step_counts
                    ON phm.phm_id = step_counts.phm_id
                LEFT JOIN (SELECT phm_id, COUNT(*) as instance_count FROM phases_instance_phi GROUP BY phm_id) instance_counts
                    ON phm.phm_id = instance_counts.phm_id
                WHERE phm.phm_id = :phaseId
            """, [phaseId: phaseId])

            return row ? enrichMasterPhaseWithStatusMetadata(row) : null
        }
    }

    def createMasterPhase(Map phaseData) {
        EmbeddedDatabaseUtil.withSql { sql ->
            def result = sql.firstRow("""
                INSERT INTO phases_master_phm (sqm_id, phm_order, phm_name, phm_description, predecessor_phm_id, created_by, updated_by)
                VALUES (:sqm_id, :phm_order, :phm_name, :phm_description, :predecessor_phm_id, 'system', 'system')
                RETURNING phm_id
            """, phaseData)

            return result?.phm_id ? findMasterPhaseById(result.phm_id as UUID) : null
        }
    }

    def updateMasterPhase(UUID phaseId, Map phaseData) {
        EmbeddedDatabaseUtil.withSql { sql ->
            def setClauses = []
            def queryParams = [:]
            def updatableFields = ['phm_name', 'phm_description', 'predecessor_phm_id', 'phm_order', 'sqm_id']

            phaseData.each { key, value ->
                if (key in updatableFields) {
                    setClauses.add("${key} = :${key}")
                    queryParams[key] = value
                }
            }

            if (setClauses.isEmpty()) {
                return findMasterPhaseById(phaseId)
            }

            queryParams['phaseId'] = phaseId
            setClauses.add("updated_by = 'system'")
            setClauses.add("updated_at = CURRENT_TIMESTAMP")

            sql.executeUpdate("UPDATE phases_master_phm SET ${setClauses.join(', ')} WHERE phm_id = :phaseId", queryParams)

            return findMasterPhaseById(phaseId)
        }
    }

    def deleteMasterPhase(UUID phaseId) {
        EmbeddedDatabaseUtil.withSql { sql ->
            def hasInstances = sql.firstRow("SELECT COUNT(*) as count FROM phases_instance_phi WHERE phm_id = :phaseId", [phaseId: phaseId])
            if ((hasInstances?.count as Long ?: 0L) > 0) return false

            def hasSteps = sql.firstRow("SELECT COUNT(*) as count FROM steps_master_stm WHERE phm_id = :phaseId", [phaseId: phaseId])
            if ((hasSteps?.count as Long ?: 0L) > 0) return false

            def rowsDeleted = sql.executeUpdate("DELETE FROM phases_master_phm WHERE phm_id = :phaseId", [phaseId: phaseId])
            return rowsDeleted > 0
        }
    }

    def findMasterPhasesWithFilters(Map filters, int pageNumber = 1, int pageSize = 50, String sortField = null, String sortDirection = 'asc') {
        EmbeddedDatabaseUtil.withSql { sql ->
            pageNumber = Math.max(1, pageNumber)
            pageSize = Math.min(100, Math.max(1, pageSize))

            def whereConditions = []
            def params = []

            if (filters.ownerId) {
                whereConditions << "plm.tms_id = ?"
                params << Integer.parseInt(filters.ownerId as String)
            }

            if (filters.search) {
                whereConditions << "(phm.phm_name ILIKE ? OR phm.phm_description ILIKE ?)"
                params << "%${filters.search}%".toString()
                params << "%${filters.search}%".toString()
            }

            if (filters.sqm_id) {
                whereConditions << "phm.sqm_id = ?"
                params << UUID.fromString(filters.sqm_id as String)
            }

            def whereClause = whereConditions ? "WHERE " + whereConditions.join(" AND ") : ""

            def totalCount = sql.firstRow("""
                SELECT COUNT(DISTINCT phm.phm_id) as total
                FROM phases_master_phm phm
                JOIN sequences_master_sqm sqm ON phm.sqm_id = sqm.sqm_id
                JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id
                ${whereClause}
            """, params)?.total ?: 0

            def allowedSortFields = ['phm_id', 'phm_name', 'phm_order', 'sqm_name', 'created_at', 'updated_at']
            if (!sortField || !allowedSortFields.contains(sortField)) {
                sortField = 'phm_name'
            }
            sortDirection = (sortDirection?.toLowerCase() == 'desc') ? 'DESC' : 'ASC'

            def offset = (pageNumber - 1) * pageSize
            def phases = sql.rows("""
                SELECT DISTINCT phm.*, sqm.sqm_name, sqm.plm_id, plm.plm_name, plm.tms_id
                FROM phases_master_phm phm
                JOIN sequences_master_sqm sqm ON phm.sqm_id = sqm.sqm_id
                JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id
                ${whereClause}
                ORDER BY phm.${sortField} ${sortDirection}
                LIMIT ${pageSize} OFFSET ${offset}
            """, params)

            return [
                phases: phases.collect { enrichMasterPhaseWithStatusMetadata(it) },
                total: totalCount
            ]
        }
    }

    // ==================== INSTANCE PHASE OPERATIONS ====================

    def findPhaseInstanceById(UUID instanceId) {
        EmbeddedDatabaseUtil.withSql { sql ->
            def result = sql.firstRow("""
                SELECT phi.*, phm.phm_name as master_name, sqi.sqi_name, sqm.sqm_name, pli.pli_name, plm.plm_name,
                       sts.sts_id, sts.sts_name, sts.sts_color, pred.phi_name as predecessor_name
                FROM phases_instance_phi phi
                JOIN phases_master_phm phm ON phi.phm_id = phm.phm_id
                JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                JOIN sequences_master_sqm sqm ON sqi.sqm_id = sqm.sqm_id
                JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                LEFT JOIN status_sts sts ON phi.phi_status = sts.sts_id
                LEFT JOIN phases_instance_phi pred ON phi.predecessor_phi_id = pred.phi_id
                WHERE phi.phi_id = :instanceId
            """, [instanceId: instanceId])

            return result ? enrichPhaseInstanceWithStatusMetadata(result) : null
        }
    }

    def createPhaseInstance(UUID masterPhaseId, UUID sequenceInstanceId, Map overrides = [:]) {
        EmbeddedDatabaseUtil.withSql { sql ->
            def result = []
            sql.withTransaction {
                def masterPhase = sql.firstRow("SELECT * FROM phases_master_phm WHERE phm_id = :phaseId", [phaseId: masterPhaseId])
                if (!masterPhase) {
                    result = null
                    return
                }

                def statusId = getDefaultPhaseInstanceStatusId(sql)

                def instanceData = [
                    sqi_id: sequenceInstanceId,
                    phm_id: masterPhaseId,
                    phi_status: statusId,
                    phi_name: overrides.phi_name ?: masterPhase.phm_name,
                    phi_description: overrides.phi_description ?: masterPhase.phm_description,
                    phi_order: overrides.phi_order ?: masterPhase.phm_order,
                    predecessor_phi_id: overrides.predecessor_phi_id
                ]

                def created = sql.firstRow("""
                    INSERT INTO phases_instance_phi (sqi_id, phm_id, phi_status, phi_name, phi_description, phi_order, predecessor_phi_id, created_by, updated_by)
                    VALUES (:sqi_id, :phm_id, :phi_status, :phi_name, :phi_description, :phi_order, :predecessor_phi_id, 'system', 'system')
                    RETURNING phi_id
                """, instanceData)

                result = created?.phi_id ? [
                    phi_id: created.phi_id,
                    sqi_id: sequenceInstanceId,
                    phm_id: masterPhaseId,
                    phi_status: 'PLANNING',
                    phi_name: instanceData.phi_name,
                    phi_description: instanceData.phi_description,
                    phi_order: instanceData.phi_order
                ] : null
            }
            return result
        }
    }

    def updatePhaseInstance(UUID instanceId, Map updates) {
        EmbeddedDatabaseUtil.withSql { sql ->
            def setClauses = []
            def queryParams = [:]
            def updatableFields = ['phi_name', 'phi_description', 'phi_status', 'phi_order', 'predecessor_phi_id']

            updates.each { key, value ->
                if (key in updatableFields) {
                    setClauses.add("${key} = :${key}")
                    queryParams[key] = value
                }
            }

            if (setClauses.isEmpty()) {
                return findPhaseInstanceById(instanceId)
            }

            queryParams['instanceId'] = instanceId
            setClauses.add("updated_by = 'system'")
            setClauses.add("updated_at = CURRENT_TIMESTAMP")

            sql.executeUpdate("UPDATE phases_instance_phi SET ${setClauses.join(', ')} WHERE phi_id = :instanceId", queryParams)

            return findPhaseInstanceById(instanceId)
        }
    }

    // ==================== UTILITY OPERATIONS ====================

    def reorderMasterPhases(UUID sequenceId, Map<UUID, Integer> phaseOrderMap) {
        EmbeddedDatabaseUtil.withSql { sql ->
            sql.withTransaction {
                phaseOrderMap.each { phaseId, newOrder ->
                    sql.executeUpdate("""
                        UPDATE phases_master_phm
                        SET phm_order = :newOrder, updated_by = 'system', updated_at = CURRENT_TIMESTAMP
                        WHERE phm_id = :phaseId AND sqm_id = :sequenceId
                    """, [phaseId: phaseId, newOrder: newOrder, sequenceId: sequenceId])
                }
            }
            return true
        }
    }

    def normalizePhaseOrder(UUID sequenceId) {
        EmbeddedDatabaseUtil.withSql { sql ->
            def phases = sql.rows("SELECT phm_id FROM phases_master_phm WHERE sqm_id = :sequenceId ORDER BY phm_order", [sequenceId: sequenceId])

            phases.eachWithIndex { phase, index ->
                sql.executeUpdate("""
                    UPDATE phases_master_phm
                    SET phm_order = :newOrder, updated_by = 'system', updated_at = CURRENT_TIMESTAMP
                    WHERE phm_id = :phaseId
                """, [newOrder: index + 1, phaseId: phase.phm_id])
            }

            return true
        }
    }

    def hasCircularDependency(groovy.sql.Sql sql, UUID sequenceId, UUID candidatePredecessorId, UUID targetPhaseId = null) {
        def result = sql.firstRow("""
            WITH RECURSIVE dependency_chain AS (
                SELECT phm_id, predecessor_phm_id, 1 as depth, ARRAY[phm_id] as path
                FROM phases_master_phm
                WHERE phm_id = :candidatePredecessorId AND sqm_id = :sequenceId

                UNION ALL

                SELECT p.phm_id, p.predecessor_phm_id, dc.depth + 1, dc.path || p.phm_id
                FROM phases_master_phm p
                JOIN dependency_chain dc ON p.phm_id = dc.predecessor_phm_id
                WHERE p.phm_id != ALL(dc.path) AND dc.depth < 100
            )
            SELECT EXISTS (SELECT 1 FROM dependency_chain WHERE :targetPhaseId = ANY(path)) as has_cycle
        """, [candidatePredecessorId: candidatePredecessorId, sequenceId: sequenceId, targetPhaseId: targetPhaseId])

        return result?.has_cycle ?: false
    }

    def getPhaseStatistics(UUID sequenceId) {
        EmbeddedDatabaseUtil.withSql { sql ->
            def stats = sql.firstRow("""
                SELECT COUNT(*) as total_phases, MIN(created_at) as first_created, MAX(updated_at) as last_updated
                FROM phases_master_phm
                WHERE sqm_id = :sequenceId
            """, [sequenceId: sequenceId])

            // Get total steps count for all phases in this sequence
            def stepCountResult = sql.firstRow("""
                SELECT COUNT(*) as total_steps
                FROM steps_master_stm stm
                JOIN phases_master_phm phm ON stm.phm_id = phm.phm_id
                WHERE phm.sqm_id = :sequenceId
            """, [sequenceId: sequenceId])

            return [
                total_phases: stats.total_phases,
                total_steps: stepCountResult?.total_steps ?: 0,
                first_created: stats.first_created,
                last_updated: stats.last_updated,
                sequence_type: 'master'
            ]
        }
    }

    // ==================== HELPER METHODS ====================

    private Integer getDefaultPhaseInstanceStatusId(def sql) {
        def status = sql.firstRow("SELECT sts_id FROM status_sts WHERE sts_name = 'PLANNING' AND sts_type = 'Phase' LIMIT 1")
        return (status?.sts_id as Integer) ?: 1
    }

    private Map enrichMasterPhaseWithStatusMetadata(Map row) {
        return [
            phm_id: row.phm_id,
            sqm_id: row.sqm_id,
            phm_name: row.phm_name,
            phm_description: row.phm_description,
            phm_order: row.phm_order,
            predecessor_phm_id: row.predecessor_phm_id,
            created_by: row.created_by,
            created_at: row.created_at,
            updated_by: row.updated_by,
            updated_at: row.updated_at,
            sqm_name: row.sqm_name,
            plm_id: row.plm_id,
            plm_name: row.plm_name,
            tms_id: row.tms_id,
            tms_name: row.tms_name,
            predecessor_phm_name: row.predecessor_name,
            step_count: row.step_count ?: 0,
            instance_count: row.instance_count ?: 0
        ]
    }

    private Map enrichPhaseInstanceWithStatusMetadata(Map row) {
        return [
            phi_id: row.phi_id,
            sqi_id: row.sqi_id,
            phm_id: row.phm_id,
            phi_status: row.sts_name ?: 'UNKNOWN',
            phi_name: row.phi_name,
            phi_description: row.phi_description,
            phi_order: row.phi_order,
            predecessor_phi_id: row.predecessor_phi_id,
            created_at: row.created_at,
            updated_at: row.updated_at,
            master_name: row.master_name,
            sqi_name: row.sqi_name,
            sqm_name: row.sqm_name,
            pli_name: row.pli_name,
            plm_name: row.plm_name,
            predecessor_name: row.predecessor_name,
            statusMetadata: row.sts_id ? [
                id: row.sts_id,
                name: row.sts_name,
                color: row.sts_color
            ] : null
        ]
    }

    // ==================== ADDITIONAL METHODS FOR TEST COVERAGE ====================

    def findPhaseInstances(Map filters = [:]) {
        EmbeddedDatabaseUtil.withSql { sql ->
            def whereClauses = []
            def params = [:]

            if (filters.mig_id) {
                whereClauses << "mig.mig_id = :migId"
                params.migId = filters.mig_id
            }
            if (filters.itr_id) {
                whereClauses << "itr.itr_id = :itrId"
                params.itrId = filters.itr_id
            }
            if (filters.pli_id) {
                whereClauses << "pli.pli_id = :pliId"
                params.pliId = filters.pli_id
            }
            if (filters.sqi_id) {
                whereClauses << "sqi.sqi_id = :sqiId"
                params.sqiId = filters.sqi_id
            }

            def whereClause = whereClauses ? "WHERE " + whereClauses.join(" AND ") : ""

            def results = sql.rows("""
                SELECT phi.*, phm.phm_name as master_name,
                       sqi.sqi_name, sqm.sqm_name, pli.pli_name, plm.plm_name,
                       sts.sts_id, sts.sts_name, sts.sts_color
                FROM phases_instance_phi phi
                JOIN phases_master_phm phm ON phi.phm_id = phm.phm_id
                JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                JOIN sequences_master_sqm sqm ON sqi.sqm_id = sqm.sqm_id
                JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                JOIN iterations_itr itr ON pli.itr_id = itr.itr_id
                JOIN migrations_mig mig ON itr.mig_id = mig.mig_id
                LEFT JOIN status_sts sts ON phi.phi_status = sts.sts_id
                ${whereClause}
                ORDER BY phi.phi_order
            """, params)

            return results.collect { enrichPhaseInstanceWithStatusMetadata(it) }
        }
    }

    def reorderMasterPhases(UUID sequenceId, UUID phaseId, Integer newOrder) {
        EmbeddedDatabaseUtil.withSql { sql ->
            sql.executeUpdate("""
                UPDATE phases_master_phm
                SET phm_order = :newOrder, updated_by = 'system', updated_at = CURRENT_TIMESTAMP
                WHERE phm_id = :phaseId AND sqm_id = :sequenceId
            """, [newOrder: newOrder, phaseId: phaseId, sequenceId: sequenceId])
            return true
        }
    }

    def hasStepInstances(UUID instanceId) {
        EmbeddedDatabaseUtil.withSql { sql ->
            def count = sql.firstRow("""
                SELECT COUNT(*) as count FROM steps_instance_sti
                WHERE phi_id = :instanceId
            """, [instanceId: instanceId])

            return (count?.count ?: 0) > 0
        }
    }
}

/**
 * Embedded Mock SQL - Complete mock database with phase-specific data
 */
class EmbeddedMockSql {
    // Mock data storage
    def masterPhases = []
    def instancePhases = []
    def masterSequences = []
    def instanceSequences = []
    def masterPlans = []
    def instancePlans = []
    def teams = []
    def iterations = []
    def migrations = []
    def statuses = []
    def steps = []
    def stepInstances = []

    // Error tracking
    def errorState = null
    def nextPhaseId = 5

    EmbeddedMockSql() {
        resetMockData()
    }

    /**
     * Reset mock data to initial state
     */
    def resetMockData() {
        errorState = null

        // Initialize teams
        teams = [
            [tms_id: 1, tms_name: 'Team Alpha', tms_code: 'ALPHA'],
            [tms_id: 2, tms_name: 'Team Beta', tms_code: 'BETA']
        ]

        // Initialize migrations
        migrations = [
            [mig_id: UUID.fromString('00000000-0000-0000-0000-000000000001'), mig_name: 'Migration Alpha'],
            [mig_id: UUID.fromString('00000000-0000-0000-0000-000000000002'), mig_name: 'Migration Beta']
        ]

        // Initialize iterations
        iterations = [
            [ite_id: UUID.fromString('10000000-0000-0000-0000-000000000001'), ite_name: 'Wave 1', mig_id: UUID.fromString('00000000-0000-0000-0000-000000000001')],
            [ite_id: UUID.fromString('10000000-0000-0000-0000-000000000002'), ite_name: 'Wave 2', mig_id: UUID.fromString('00000000-0000-0000-0000-000000000002')]
        ]

        // Initialize master plans
        masterPlans = [
            [plm_id: 1, plm_name: 'Infrastructure Plan', plm_order: 1, tms_id: 1],
            [plm_id: 2, plm_name: 'Application Plan', plm_order: 2, tms_id: 2]
        ]

        // Initialize plan instances
        instancePlans = [
            [pli_id: UUID.fromString('20000000-0000-0000-0000-000000000001'), pli_name: 'Infrastructure Plan Instance', ite_id: UUID.fromString('10000000-0000-0000-0000-000000000001'), plm_id: 1],
            [pli_id: UUID.fromString('20000000-0000-0000-0000-000000000002'), pli_name: 'Application Plan Instance', ite_id: UUID.fromString('10000000-0000-0000-0000-000000000002'), plm_id: 2]
        ]

        // Initialize master sequences
        masterSequences = [
            [sqm_id: UUID.fromString('30000000-0000-0000-0000-000000000001'), sqm_name: 'Network Setup', sqm_order: 1, plm_id: 1],
            [sqm_id: UUID.fromString('30000000-0000-0000-0000-000000000002'), sqm_name: 'Database Migration', sqm_order: 2, plm_id: 2]
        ]

        // Initialize sequence instances
        instanceSequences = [
            [sqi_id: UUID.fromString('40000000-0000-0000-0000-000000000001'), sqi_name: 'Network Setup Instance', pli_id: UUID.fromString('20000000-0000-0000-0000-000000000001'), sqm_id: UUID.fromString('30000000-0000-0000-0000-000000000001')],
            [sqi_id: UUID.fromString('40000000-0000-0000-0000-000000000002'), sqi_name: 'Database Migration Instance', pli_id: UUID.fromString('20000000-0000-0000-0000-000000000002'), sqm_id: UUID.fromString('30000000-0000-0000-0000-000000000002')]
        ]

        // Initialize statuses
        statuses = [
            [sts_id: 1, sts_name: 'PLANNING', sts_type: 'Phase', sts_color: '#0000FF'],
            [sts_id: 2, sts_name: 'IN_PROGRESS', sts_type: 'Phase', sts_color: '#FFA500'],
            [sts_id: 3, sts_name: 'COMPLETED', sts_type: 'Phase', sts_color: '#00FF00']
        ]

        // Initialize master phases (4 phases total)
        masterPhases = [
            [
                phm_id: UUID.fromString('50000000-0000-0000-0000-000000000001'),
                sqm_id: UUID.fromString('30000000-0000-0000-0000-000000000001'),
                phm_name: 'Preparation',
                phm_description: 'Initial preparation phase',
                phm_order: 1,
                predecessor_phm_id: null,
                created_by: 'admin',
                created_at: new java.sql.Timestamp(System.currentTimeMillis()),
                updated_by: 'admin',
                updated_at: new java.sql.Timestamp(System.currentTimeMillis())
            ],
            [
                phm_id: UUID.fromString('50000000-0000-0000-0000-000000000002'),
                sqm_id: UUID.fromString('30000000-0000-0000-0000-000000000001'),
                phm_name: 'Configuration',
                phm_description: 'Configuration phase',
                phm_order: 2,
                predecessor_phm_id: UUID.fromString('50000000-0000-0000-0000-000000000001'),
                created_by: 'admin',
                created_at: new java.sql.Timestamp(System.currentTimeMillis()),
                updated_by: 'admin',
                updated_at: new java.sql.Timestamp(System.currentTimeMillis())
            ],
            [
                phm_id: UUID.fromString('50000000-0000-0000-0000-000000000003'),
                sqm_id: UUID.fromString('30000000-0000-0000-0000-000000000002'),
                phm_name: 'Data Migration',
                phm_description: 'Migrate database data',
                phm_order: 1,
                predecessor_phm_id: null,
                created_by: 'admin',
                created_at: new java.sql.Timestamp(System.currentTimeMillis()),
                updated_by: 'admin',
                updated_at: new java.sql.Timestamp(System.currentTimeMillis())
            ],
            [
                phm_id: UUID.fromString('50000000-0000-0000-0000-000000000004'),
                sqm_id: UUID.fromString('30000000-0000-0000-0000-000000000002'),
                phm_name: 'Validation',
                phm_description: 'Validate migration',
                phm_order: 2,
                predecessor_phm_id: UUID.fromString('50000000-0000-0000-0000-000000000003'),
                created_by: 'admin',
                created_at: new java.sql.Timestamp(System.currentTimeMillis()),
                updated_by: 'admin',
                updated_at: new java.sql.Timestamp(System.currentTimeMillis())
            ]
        ]

        // Initialize phase instances
        instancePhases = [
            [
                phi_id: UUID.fromString('60000000-0000-0000-0000-000000000001'),
                sqi_id: UUID.fromString('40000000-0000-0000-0000-000000000001'),
                phm_id: UUID.fromString('50000000-0000-0000-0000-000000000001'),
                phi_status: 1, // PLANNING
                phi_name: 'Preparation Instance',
                phi_description: 'Initial preparation phase instance',
                phi_order: 1,
                predecessor_phi_id: null,
                created_at: new java.sql.Timestamp(System.currentTimeMillis()),
                updated_at: new java.sql.Timestamp(System.currentTimeMillis())
            ],
            [
                phi_id: UUID.fromString('60000000-0000-0000-0000-000000000002'),
                sqi_id: UUID.fromString('40000000-0000-0000-0000-000000000002'),
                phm_id: UUID.fromString('50000000-0000-0000-0000-000000000003'),
                phi_status: 2, // IN_PROGRESS
                phi_name: 'Data Migration Instance',
                phi_description: 'Migrate database data instance',
                phi_order: 1,
                predecessor_phi_id: null,
                created_at: new java.sql.Timestamp(System.currentTimeMillis()),
                updated_at: new java.sql.Timestamp(System.currentTimeMillis())
            ]
        ]

        // Initialize steps (for counting)
        steps = [
            [stm_id: 1, stm_name: 'Configure Network', phm_id: UUID.fromString('50000000-0000-0000-0000-000000000001')],
            [stm_id: 2, stm_name: 'Setup Firewall', phm_id: UUID.fromString('50000000-0000-0000-0000-000000000001')],
            [stm_id: 3, stm_name: 'Deploy Application', phm_id: UUID.fromString('50000000-0000-0000-0000-000000000002')]
        ]

        // Initialize step instances
        stepInstances = [
            [sti_id: UUID.fromString('70000000-0000-0000-0000-000000000001'), sti_name: 'Configure Network Instance', stm_id: 1, phi_id: UUID.fromString('60000000-0000-0000-0000-000000000001')]
        ]
    }

    /**
     * Execute SQL query with mock data
     */
    def rows(String query, Map params = [:]) {
        def queryUpper = query.toUpperCase()

        // findAllMasterPhases - basic list
        if (queryUpper.contains('SELECT PHM.*') &&
            queryUpper.contains('FROM PHASES_MASTER_PHM PHM') &&
            queryUpper.contains('JOIN SEQUENCES_MASTER_SQM SQM') &&
            queryUpper.contains('ORDER BY PLM.PLM_NAME, SQM.SQM_ORDER, PHM.PHM_ORDER')) {

            return masterPhases.collect { phase ->
                def sequence = masterSequences.find { it.sqm_id == phase.sqm_id }
                def plan = masterPlans.find { it.plm_id == sequence?.plm_id }
                def team = teams.find { it.tms_id == plan?.tms_id }
                def predecessor = masterPhases.find { it.phm_id == phase.predecessor_phm_id }

                new groovy.sql.GroovyRowResult([
                    phm_id: phase.phm_id,
                    sqm_id: phase.sqm_id,
                    phm_name: phase.phm_name,
                    phm_description: phase.phm_description,
                    phm_order: phase.phm_order,
                    predecessor_phm_id: phase.predecessor_phm_id,
                    created_by: phase.created_by,
                    created_at: phase.created_at,
                    updated_by: phase.updated_by,
                    updated_at: phase.updated_at,
                    sqm_name: sequence?.sqm_name,
                    plm_id: plan?.plm_id,
                    plm_name: plan?.plm_name,
                    tms_id: team?.tms_id,
                    tms_name: team?.tms_name,
                    predecessor_name: predecessor?.phm_name
                ])
            }
        }

        // findMasterPhasesBySequenceId
        if (queryUpper.contains('WHERE PHM.SQM_ID = :SEQUENCEID')) {
            def sequenceId = params.sequenceId as UUID
            def filteredPhases = masterPhases.findAll { it.sqm_id == sequenceId }

            return filteredPhases.collect { phase ->
                def sequence = masterSequences.find { it.sqm_id == phase.sqm_id }
                def predecessor = masterPhases.find { it.phm_id == phase.predecessor_phm_id }

                new groovy.sql.GroovyRowResult([
                    phm_id: phase.phm_id,
                    sqm_id: phase.sqm_id,
                    phm_name: phase.phm_name,
                    phm_description: phase.phm_description,
                    phm_order: phase.phm_order,
                    predecessor_phm_id: phase.predecessor_phm_id,
                    created_by: phase.created_by,
                    created_at: phase.created_at,
                    updated_by: phase.updated_by,
                    updated_at: phase.updated_at,
                    sqm_name: sequence?.sqm_name,
                    predecessor_name: predecessor?.phm_name
                ])
            }
        }

        // findMasterPhasesWithFilters - pagination query
        if (queryUpper.contains('SELECT DISTINCT PHM.*') &&
            queryUpper.contains('LIMIT') &&
            queryUpper.contains('OFFSET')) {

            def filteredPhases = masterPhases

            // Apply filters
            if (params.containsKey('ownerId')) {
                def ownerId = Integer.parseInt(params.get(params.size() - 3) as String)
                filteredPhases = filteredPhases.findAll { phase ->
                    def sequence = masterSequences.find { it.sqm_id == phase.sqm_id }
                    def plan = masterPlans.find { it.plm_id == sequence?.plm_id }
                    plan?.tms_id == ownerId
                }
            }

            if (params.containsKey('search')) {
                def searchTerm = params.get(params.size() - 2) as String
                def search = searchTerm.toLowerCase().replace('%', '')
                filteredPhases = filteredPhases.findAll { phase ->
                    phase.phm_name.toLowerCase().contains(search) ||
                    phase.phm_description?.toLowerCase()?.contains(search)
                }
            }

            if (params.containsKey('sqm_id')) {
                def sqmId = UUID.fromString(params.get(params.size() - 1) as String)
                filteredPhases = filteredPhases.findAll { it.sqm_id == sqmId }
            }

            return filteredPhases.collect { phase ->
                def sequence = masterSequences.find { it.sqm_id == phase.sqm_id }
                def plan = masterPlans.find { it.plm_id == sequence?.plm_id }
                def team = teams.find { it.tms_id == plan?.tms_id }
                def predecessor = masterPhases.find { it.phm_id == phase.predecessor_phm_id }
                def stepCount = steps.count { it.phm_id == phase.phm_id }
                def instanceCount = instancePhases.count { it.phm_id == phase.phm_id }

                new groovy.sql.GroovyRowResult([
                    phm_id: phase.phm_id,
                    sqm_id: phase.sqm_id,
                    phm_name: phase.phm_name,
                    phm_description: phase.phm_description,
                    phm_order: phase.phm_order,
                    predecessor_phm_id: phase.predecessor_phm_id,
                    created_by: phase.created_by,
                    created_at: phase.created_at,
                    updated_by: phase.updated_by,
                    updated_at: phase.updated_at,
                    sqm_name: sequence?.sqm_name,
                    plm_id: plan?.plm_id,
                    plm_name: plan?.plm_name,
                    tms_id: plan?.tms_id,
                    tms_name: team?.tms_name,
                    predecessor_name: predecessor?.phm_name,
                    step_count: stepCount,
                    instance_count: instanceCount
                ])
            }
        }

        // Count query for pagination
        if (queryUpper.contains('SELECT COUNT(DISTINCT PHM.PHM_ID) AS TOTAL')) {
            def filteredPhases = masterPhases

            // Apply same filters as data query
            if (params.containsKey('ownerId')) {
                def ownerId = Integer.parseInt(params.get(0) as String)
                filteredPhases = filteredPhases.findAll { phase ->
                    def sequence = masterSequences.find { it.sqm_id == phase.sqm_id }
                    def plan = masterPlans.find { it.plm_id == sequence?.plm_id }
                    plan?.tms_id == ownerId
                }
            }

            if (params.containsKey('search')) {
                def searchTerm = params.get(params.containsKey('ownerId') ? 1 : 0) as String
                def search = searchTerm.toLowerCase().replace('%', '')
                filteredPhases = filteredPhases.findAll { phase ->
                    phase.phm_name.toLowerCase().contains(search) ||
                    phase.phm_description?.toLowerCase()?.contains(search)
                }
            }

            if (params.containsKey('sqm_id')) {
                def sqmId = UUID.fromString(params.get(params.size() - 1) as String)
                filteredPhases = filteredPhases.findAll { it.sqm_id == sqmId }
            }

            return [new groovy.sql.GroovyRowResult([total: filteredPhases.size()])]
        }

        // getDefaultPhaseInstanceStatusId
        if (queryUpper.contains("SELECT STS_ID") &&
            queryUpper.contains("FROM STATUS_STS") &&
            queryUpper.contains("WHERE STS_NAME = 'PLANNING'")) {
            def status = statuses.find { it.sts_name == 'PLANNING' && it.sts_type == 'Phase' }
            return status ? [new groovy.sql.GroovyRowResult([sts_id: status.sts_id])] : []
        }

        // Get steps for counting
        if (queryUpper.contains('SELECT PHM_ID, COUNT(*) AS STEP_COUNT') &&
            queryUpper.contains('FROM STEPS_MASTER_STM')) {
            def counts = steps.groupBy { it.phm_id }.collectEntries { k, v -> [(k): v.size()] }
            return counts.collect { phm_id, count ->
                new groovy.sql.GroovyRowResult([phm_id: phm_id, step_count: count])
            }
        }

        // Get phase instances for counting
        if (queryUpper.contains('SELECT PHM_ID, COUNT(*) AS INSTANCE_COUNT') &&
            queryUpper.contains('FROM PHASES_INSTANCE_PHI')) {
            def counts = instancePhases.groupBy { it.phm_id }.collectEntries { k, v -> [(k): v.size()] }
            return counts.collect { phm_id, count ->
                new groovy.sql.GroovyRowResult([phm_id: phm_id, instance_count: count])
            }
        }

        // Check steps exist for deletion validation
        if (queryUpper.contains('SELECT COUNT(*) AS COUNT') &&
            queryUpper.contains('FROM STEPS_MASTER_STM') &&
            queryUpper.contains('WHERE PHM_ID = :PHASEID')) {
            def phaseId = params.phaseId as UUID
            def count = steps.count { it.phm_id == phaseId }
            return [new groovy.sql.GroovyRowResult([count: count])]
        }

        // Check phase instances exist for deletion validation
        if (queryUpper.contains('SELECT COUNT(*) AS COUNT') &&
            queryUpper.contains('FROM PHASES_INSTANCE_PHI') &&
            queryUpper.contains('WHERE PHM_ID = :PHASEID')) {
            def phaseId = params.phaseId as UUID
            def count = instancePhases.count { it.phm_id == phaseId }
            return [new groovy.sql.GroovyRowResult([count: count])]
        }

        // Get phase statistics
        if (queryUpper.contains('SELECT COUNT(*) AS TOTAL_PHASES') &&
            queryUpper.contains('WHERE SQM_ID = :SEQUENCEID')) {
            def sequenceId = params.sequenceId as UUID
            def phases = masterPhases.findAll { it.sqm_id == sequenceId }
            return [new groovy.sql.GroovyRowResult([
                total_phases: phases.size(),
                first_created: phases*.created_at.min(),
                last_updated: phases*.updated_at.max()
            ])]
        }

        // Get total steps for phase statistics
        if (queryUpper.contains('SELECT COUNT(*) AS TOTAL_STEPS') &&
            queryUpper.contains('FROM STEPS_MASTER_STM STM') &&
            queryUpper.contains('JOIN PHASES_MASTER_PHM PHM')) {
            def sequenceId = params.sequenceId as UUID
            def phaseIds = masterPhases.findAll { it.sqm_id == sequenceId }*.phm_id
            def totalSteps = steps.count { it.phm_id in phaseIds }
            return [new groovy.sql.GroovyRowResult([total_steps: totalSteps])]
        }

        // Get phases for reordering
        if (queryUpper.contains('SELECT PHM_ID FROM PHASES_MASTER_PHM') &&
            queryUpper.contains('WHERE SQM_ID = :SEQUENCEID') &&
            queryUpper.contains('ORDER BY PHM_ORDER')) {
            def sequenceId = params.sequenceId as UUID
            def phases = masterPhases.findAll { it.sqm_id == sequenceId }.sort { it.phm_order }
            return phases.collect { new groovy.sql.GroovyRowResult([phm_id: it.phm_id]) }
        }

        return []
    }

    // Support positional parameters (ArrayList/List) - delegate to Map-based version
    def rows(String query, ArrayList params) {
        // For positional parameters, delegate to Map-based version with empty map
        // The query handlers should handle the logic based on query structure
        return rows(query, [:])
    }

    def rows(String query, List params) {
        return rows(query, params as ArrayList)
    }

    def firstRow(String query, Map params = [:]) {
        def queryUpper = query.toUpperCase()

        // findMasterPhaseById - with detailed counts
        if (queryUpper.contains('WHERE PHM.PHM_ID = :PHASEID')) {
            def phaseId = params.phaseId as UUID
            def phase = masterPhases.find { it.phm_id == phaseId }
            if (!phase) return null

            def sequence = masterSequences.find { it.sqm_id == phase.sqm_id }
            def plan = masterPlans.find { it.plm_id == sequence?.plm_id }
            def team = teams.find { it.tms_id == plan?.tms_id }
            def predecessor = masterPhases.find { it.phm_id == phase.predecessor_phm_id }
            def stepCount = steps.count { it.phm_id == phaseId }
            def instanceCount = instancePhases.count { it.phm_id == phaseId }

            return new groovy.sql.GroovyRowResult([
                phm_id: phase.phm_id,
                sqm_id: phase.sqm_id,
                phm_name: phase.phm_name,
                phm_description: phase.phm_description,
                phm_order: phase.phm_order,
                predecessor_phm_id: phase.predecessor_phm_id,
                created_by: phase.created_by,
                created_at: phase.created_at,
                updated_by: phase.updated_by,
                updated_at: phase.updated_at,
                sqm_name: sequence?.sqm_name,
                plm_id: plan?.plm_id,
                plm_name: plan?.plm_name,
                tms_id: team?.tms_id,
                tms_name: team?.tms_name,
                predecessor_name: predecessor?.phm_name,
                step_count: stepCount,
                instance_count: instanceCount
            ])
        }

        // findPhaseInstanceById
        if (queryUpper.contains('SELECT PHI.*') &&
            queryUpper.contains('FROM PHASES_INSTANCE_PHI PHI') &&
            queryUpper.contains('WHERE PHI.PHI_ID = :INSTANCEID')) {
            def instanceId = params.instanceId as UUID
            def instance = instancePhases.find { it.phi_id == instanceId }
            if (!instance) return null

            def masterPhase = masterPhases.find { it.phm_id == instance.phm_id }
            def sequenceInstance = instanceSequences.find { it.sqi_id == instance.sqi_id }
            def masterSequence = masterSequences.find { it.sqm_id == sequenceInstance?.sqm_id }
            def planInstance = instancePlans.find { it.pli_id == sequenceInstance?.pli_id }
            def masterPlan = masterPlans.find { it.plm_id == planInstance?.plm_id }
            def status = statuses.find { it.sts_id == instance.phi_status }
            def predecessor = instancePhases.find { it.phi_id == instance.predecessor_phi_id }

            return new groovy.sql.GroovyRowResult([
                phi_id: instance.phi_id,
                sqi_id: instance.sqi_id,
                phm_id: instance.phm_id,
                phi_status: instance.phi_status,
                phi_name: instance.phi_name,
                phi_description: instance.phi_description,
                phi_order: instance.phi_order,
                predecessor_phi_id: instance.predecessor_phi_id,
                created_at: instance.created_at,
                updated_at: instance.updated_at,
                master_name: masterPhase?.phm_name,
                sqi_name: sequenceInstance?.sqi_name,
                sqm_name: masterSequence?.sqm_name,
                pli_name: planInstance?.pli_name,
                plm_name: masterPlan?.plm_name,
                sts_id: status?.sts_id,
                sts_name: status?.sts_name,
                sts_color: status?.sts_color,
                predecessor_name: predecessor?.phi_name
            ])
        }

        // Get master phase for createPhaseInstance
        if (queryUpper.contains('SELECT * FROM PHASES_MASTER_PHM') &&
            queryUpper.contains('WHERE PHM_ID = :PHASEID')) {
            def phaseId = params.phaseId as UUID
            def phase = masterPhases.find { it.phm_id == phaseId }
            return phase ? new groovy.sql.GroovyRowResult(phase) : null
        }

        // INSERT returning phm_id for createMasterPhase
        if (queryUpper.contains('INSERT INTO PHASES_MASTER_PHM') &&
            queryUpper.contains('RETURNING PHM_ID')) {
            def newId = UUID.randomUUID()
            return new groovy.sql.GroovyRowResult([phm_id: newId])
        }

        // INSERT returning phi_id for createPhaseInstance
        if (queryUpper.contains('INSERT INTO PHASES_INSTANCE_PHI') &&
            queryUpper.contains('RETURNING PHI_ID')) {
            def newId = UUID.randomUUID()
            return new groovy.sql.GroovyRowResult([phi_id: newId])
        }

        // Get phase statistics - total_phases query
        if (queryUpper.contains('SELECT COUNT(*) AS TOTAL_PHASES') &&
            queryUpper.contains('WHERE SQM_ID = :SEQUENCEID')) {
            def sequenceId = params.sequenceId as UUID
            def phases = masterPhases.findAll { it.sqm_id == sequenceId }
            return new groovy.sql.GroovyRowResult([
                total_phases: phases.size(),
                first_created: phases*.created_at.min(),
                last_updated: phases*.updated_at.max()
            ])
        }

        // Get total steps for phase statistics
        if (queryUpper.contains('SELECT COUNT(*) AS TOTAL_STEPS') &&
            queryUpper.contains('FROM STEPS_MASTER_STM STM') &&
            queryUpper.contains('JOIN PHASES_MASTER_PHM PHM')) {
            def sequenceId = params.sequenceId as UUID
            def phaseIds = masterPhases.findAll { it.sqm_id == sequenceId }*.phm_id
            def totalSteps = steps.count { it.phm_id in phaseIds }
            return new groovy.sql.GroovyRowResult([total_steps: totalSteps])
        }

        // Default: try rows() and return first
        def results = rows(query, params)
        return results ? results[0] : null
    }

    // Support positional parameters (ArrayList/List) - delegate to Map-based version
    def firstRow(String query, ArrayList params) {
        // For positional parameters, try to delegate to rows() with empty map
        // The query handlers should handle the logic based on query structure
        def results = rows(query, [:])
        return results ? results[0] : null
    }

    def firstRow(String query, List params) {
        return firstRow(query, params as ArrayList)
    }

    def executeUpdate(String query, Map params = [:]) {
        def queryUpper = query.toUpperCase()

        // INSERT master phase
        if (queryUpper.contains('INSERT INTO PHASES_MASTER_PHM')) {
            def newPhase = [
                phm_id: nextPhaseId++,
                sqm_id: params.sqm_id,
                phm_order: params.phm_order,
                phm_name: params.phm_name,
                phm_description: params.phm_description,
                predecessor_phm_id: params.predecessor_phm_id,
                created_by: 'system',
                created_at: new java.sql.Timestamp(System.currentTimeMillis()),
                updated_by: 'system',
                updated_at: new java.sql.Timestamp(System.currentTimeMillis())
            ]
            masterPhases.add(newPhase)
            return 1
        }

        // UPDATE master phase
        if (queryUpper.contains('UPDATE PHASES_MASTER_PHM') &&
            queryUpper.contains('WHERE PHM_ID = :PHASEID')) {
            def phaseId = params.phaseId
            def phase = masterPhases.find { it.phm_id == phaseId }
            if (phase) {
                if (params.containsKey('phm_name')) phase.phm_name = params.phm_name
                if (params.containsKey('phm_description')) phase.phm_description = params.phm_description
                if (params.containsKey('predecessor_phm_id')) phase.predecessor_phm_id = params.predecessor_phm_id
                if (params.containsKey('phm_order')) phase.phm_order = params.phm_order
                if (params.containsKey('sqm_id')) phase.sqm_id = params.sqm_id
                phase.updated_at = new java.sql.Timestamp(System.currentTimeMillis())
                return 1
            }
            return 0
        }

        // UPDATE master phase order during reordering
        if (queryUpper.contains('UPDATE PHASES_MASTER_PHM') &&
            queryUpper.contains('SET PHM_ORDER = :NEWORDER') &&
            queryUpper.contains('WHERE PHM_ID = :PHASEID')) {
            def phaseId = params.phaseId
            def phase = masterPhases.find { it.phm_id == phaseId }
            if (phase) {
                phase.phm_order = params.newOrder
                phase.updated_at = new java.sql.Timestamp(System.currentTimeMillis())
                return 1
            }
            return 0
        }

        // DELETE master phase
        if (queryUpper.contains('DELETE FROM PHASES_MASTER_PHM') &&
            queryUpper.contains('WHERE PHM_ID = :PHASEID')) {
            def phaseId = params.phaseId as UUID
            def removed = masterPhases.removeAll { it.phm_id == phaseId }
            return removed ? 1 : 0
        }

        // INSERT phase instance
        if (queryUpper.contains('INSERT INTO PHASES_INSTANCE_PHI')) {
            def newInstance = [
                phi_id: UUID.randomUUID(),
                sqi_id: params.sqi_id,
                phm_id: params.phm_id,
                phi_status: params.phi_status,
                phi_name: params.phi_name,
                phi_description: params.phi_description,
                phi_order: params.phi_order,
                predecessor_phi_id: params.predecessor_phi_id,
                created_at: new java.sql.Timestamp(System.currentTimeMillis()),
                updated_at: new java.sql.Timestamp(System.currentTimeMillis())
            ]
            instancePhases.add(newInstance)
            return 1
        }

        // UPDATE phase instance
        if (queryUpper.contains('UPDATE PHASES_INSTANCE_PHI') &&
            queryUpper.contains('WHERE PHI_ID = :INSTANCEID')) {
            def instanceId = params.instanceId
            def instance = instancePhases.find { it.phi_id == instanceId }
            if (instance) {
                if (params.containsKey('phi_name')) instance.phi_name = params.phi_name
                if (params.containsKey('phi_description')) instance.phi_description = params.phi_description
                if (params.containsKey('phi_status')) instance.phi_status = params.phi_status
                if (params.containsKey('phi_order')) instance.phi_order = params.phi_order
                if (params.containsKey('predecessor_phi_id')) instance.predecessor_phi_id = params.predecessor_phi_id
                instance.updated_at = new java.sql.Timestamp(System.currentTimeMillis())
                return 1
            }
            return 0
        }

        return 0
    }

    def withTransaction(Closure closure) {
        closure.call()
    }
}

// ==================== TEST EXECUTION FRAMEWORK ====================

class TestExecutor {
    static int totalTests = 0
    static int passedTests = 0
    static int failedTests = 0
    static long startTime = 0

    static void runTest(String testName, Closure testBody) {
        totalTests++
        print "  ${testName} ... "
        try {
            testBody()
            passedTests++
            println "✅ PASSED"
        } catch (AssertionError e) {
            failedTests++
            println "❌ FAILED"
            println "    Error: ${e.message}"
        } catch (Exception e) {
            failedTests++
            println "❌ ERROR"
            println "    Exception: ${e.message}"
            e.printStackTrace()
        }
    }

    static void printSummary() {
        long endTime = System.currentTimeMillis()
        long duration = endTime - startTime

        println "\n${'='*80}"
        println "Test Summary"
        println "${'='*80}"
        println "Total Tests: ${totalTests}"
        println "Passed: ${passedTests}"
        println "Failed: ${failedTests}"
        println "Success Rate: ${totalTests > 0 ? String.format('%.1f', (passedTests / totalTests) * 100) : 0}%"
        println "Execution Time: ${duration}ms"
        println "${'='*80}\n"

        if (failedTests == 0) {
            println "🎉 ALL ${totalTests} TESTS PASSED! TD-014-B PhaseRepository coverage complete. 🚀"
        } else {
            println "⚠️  ${failedTests} test(s) failed. Review failures above."
        }
    }
}

// ==================== TEST CATEGORIES ====================

println "\n${'='*80}"
println "PhaseRepository Comprehensive Test Suite"
println "TD-001 Self-Contained Architecture | Zero External Dependencies"
println "${'='*80}\n"

TestExecutor.startTime = System.currentTimeMillis()

// Category A: Master Phase CRUD Operations
println "Category A: Master Phase CRUD Operations (6 tests)"
println "${'-'*80}"

TestExecutor.runTest("A1: findAllMasterPhases returns all phases") {
    def repository = new EmbeddedPhaseRepository()
    def result = repository.findAllMasterPhases()
    
    assert result != null : "Result should not be null"
    assert result.size() == 4 : "Should return all 4 master phases"
    
    // Verify hierarchical enrichment
    def firstPhase = result[0]
    assert firstPhase.phm_id != null : "Phase should have ID"
    assert firstPhase.phm_name != null : "Phase should have name"
    assert firstPhase.sqm_name != null : "Phase should include sequence name"
    assert firstPhase.plm_name != null : "Phase should include plan name"
    assert firstPhase.tms_name != null : "Phase should include team name"
    
    // Verify ordering (by plan name, sequence order, phase order)
    assert result[0].phm_name == 'Preparation' : "First phase should be Preparation"
    assert result[1].phm_name == 'Configuration' : "Second phase should be Configuration"
}

TestExecutor.runTest("A2: findMasterPhasesBySequenceId filters by sequence") {
    def repository = new EmbeddedPhaseRepository()
    def sequenceId = UUID.fromString('30000000-0000-0000-0000-000000000001')
    def result = repository.findMasterPhasesBySequenceId(sequenceId)
    
    assert result != null : "Result should not be null"
    assert result.size() == 2 : "Sequence 1 should have 2 phases"
    
    // Verify all results belong to the requested sequence
    result.each { phase ->
        assert phase.sqm_id == sequenceId : "All phases should belong to sequence ${sequenceId}"
    }
    
    // Verify ordering by phase order
    assert result[0].phm_order == 1 : "First phase should have order 1"
    assert result[1].phm_order == 2 : "Second phase should have order 2"
    
    // Verify predecessor relationship enrichment
    assert result[1].predecessor_name == 'Preparation' : "Second phase predecessor should be 'Preparation'"
}

TestExecutor.runTest("A3: findMasterPhaseById includes counts and details") {
    def repository = new EmbeddedPhaseRepository()
    def phaseId = UUID.fromString('50000000-0000-0000-0000-000000000001')
    def result = repository.findMasterPhaseById(phaseId)
    
    assert result != null : "Result should not be null"
    assert result.phm_id == phaseId : "Should return correct phase ID"
    assert result.phm_name == 'Preparation' : "Should have correct name"
    
    // Verify hierarchical enrichment
    assert result.sqm_name == 'Infrastructure Setup' : "Should include sequence name"
    assert result.plm_name == 'Technical Migration' : "Should include plan name"
    assert result.tms_name == 'Team Alpha' : "Should include team name"
    
    // Verify counts
    assert result.step_count == 2 : "Phase 1 should have 2 steps"
    assert result.instance_count == 1 : "Phase 1 should have 1 instance"
    
    // Verify predecessor (should be null for first phase)
    assert result.predecessor_phm_id == null : "First phase should have no predecessor"
}

TestExecutor.runTest("A4: findMasterPhasesWithFilters pagination and sorting") {
    def repository = new EmbeddedPhaseRepository()
    
    // Test basic pagination
    def filters = [offset: 0, limit: 2]
    def result = repository.findMasterPhasesWithFilters(filters)
    
    assert result != null : "Result should not be null"
    assert result.phases != null : "Should have phases list"
    assert result.total != null : "Should have total count"
    assert result.phases.size() == 2 : "Should return 2 phases (limit)"
    assert result.total == 4 : "Total should be 4 phases"
    
    // Test pagination with offset
    def page2 = repository.findMasterPhasesWithFilters([offset: 2, limit: 2])
    assert page2.phases.size() == 2 : "Second page should have 2 phases"
    assert page2.phases[0].phm_id != result.phases[0].phm_id : "Second page should have different phases"
    
    // Test with sqm_id filter
    def sequenceId = UUID.fromString('30000000-0000-0000-0000-000000000001')
    def filtered = repository.findMasterPhasesWithFilters([sqm_id: sequenceId, offset: 0, limit: 10])
    assert filtered.phases.size() == 2 : "Should return 2 phases for sequence 1"
    assert filtered.total == 2 : "Total should be 2 for filtered results"
}

TestExecutor.runTest("A5: createMasterPhase successful creation") {
    def repository = new EmbeddedPhaseRepository()
    
    // Create new phase
    def sequenceId = UUID.fromString('30000000-0000-0000-0000-000000000001')
    def phaseData = [
        sqm_id: sequenceId,
        phm_order: 3,
        phm_name: 'New Test Phase',
        phm_description: 'Test phase description',
        predecessor_phm_id: UUID.fromString('50000000-0000-0000-0000-000000000002')
    ]
    
    def result = repository.createMasterPhase(phaseData)
    
    assert result != null : "Result should not be null"
    assert result.phm_id != null : "Created phase should have ID"
    assert result.phm_name == 'New Test Phase' : "Should have correct name"
    assert result.phm_description == 'Test phase description' : "Should have correct description"
    assert result.phm_order == 3 : "Should have correct order"
    assert result.sqm_id == sequenceId : "Should belong to correct sequence"
    assert result.predecessor_phm_id == UUID.fromString('50000000-0000-0000-0000-000000000002') : "Should have correct predecessor"
    
    // Verify it's actually in the repository
    def allPhases = repository.findAllMasterPhases()
    assert allPhases.size() == 5 : "Should now have 5 phases total"
}

TestExecutor.runTest("A6: updateMasterPhase updates fields") {
    def repository = new EmbeddedPhaseRepository()
    
    // Get existing phase
    def phaseId = UUID.fromString('50000000-0000-0000-0000-000000000001')
    def originalPhase = repository.findMasterPhaseById(phaseId)
    assert originalPhase != null : "Original phase should exist"
    
    // Update phase
    def updates = [
        phm_name: 'Updated Preparation Phase',
        phm_description: 'Updated description for preparation',
        phm_order: 5
    ]
    
    def result = repository.updateMasterPhase(phaseId, updates)
    
    assert result != null : "Result should not be null"
    assert result.phm_id == phaseId : "Should have same ID"
    assert result.phm_name == 'Updated Preparation Phase' : "Name should be updated"
    assert result.phm_description == 'Updated description for preparation' : "Description should be updated"
    assert result.phm_order == 5 : "Order should be updated"
    
    // Verify the update persisted
    def updatedPhase = repository.findMasterPhaseById(phaseId)
    assert updatedPhase.phm_name == 'Updated Preparation Phase' : "Updated name should persist"
    assert updatedPhase.phm_order == 5 : "Updated order should persist"
}

// Category B: Instance Phase CRUD Operations
println "\nCategory B: Instance Phase CRUD Operations (5 tests)"
println "${'-'*80}"

TestExecutor.runTest("B1: findPhaseInstances hierarchical filtering") {
    def repository = new EmbeddedPhaseRepository()
    
    // Test filtering by sequence instance
    def sequenceInstanceId = UUID.fromString('40000000-0000-0000-0000-000000000001')
    def filters = [sqi_id: sequenceInstanceId]
    def result = repository.findPhaseInstances(filters)
    
    assert result != null : "Result should not be null"
    assert result.size() == 1 : "Should return 1 phase instance for sequence instance 1"
    assert result[0].sqi_id == sequenceInstanceId : "Should belong to correct sequence instance"
    
    // Verify hierarchical enrichment
    def instance = result[0]
    assert instance.phi_name != null : "Should have instance name"
    assert instance.phm_name != null : "Should include master phase name"
    assert instance.statusName == 'PLANNING' : "Should include status metadata"
    
    // Test with different sequence instance
    def sequenceInstanceId2 = UUID.fromString('40000000-0000-0000-0000-000000000002')
    def result2 = repository.findPhaseInstances([sqi_id: sequenceInstanceId2])
    assert result2.size() == 1 : "Should return 1 phase instance for sequence instance 2"
    assert result2[0].statusName == 'IN_PROGRESS' : "Should have correct status"
}

TestExecutor.runTest("B2: findPhaseInstanceById enriched with metadata") {
    def repository = new EmbeddedPhaseRepository()
    
    def instanceId = UUID.fromString('60000000-0000-0000-0000-000000000001')
    def result = repository.findPhaseInstanceById(instanceId)
    
    assert result != null : "Result should not be null"
    assert result.phi_id == instanceId : "Should return correct instance ID"
    assert result.phi_name == 'Preparation Instance' : "Should have correct name"
    
    // Verify hierarchical enrichment
    assert result.phm_name == 'Preparation' : "Should include master phase name"
    assert result.sqm_name == 'Infrastructure Setup' : "Should include sequence name"
    assert result.plm_name == 'Technical Migration' : "Should include plan name"
    
    // Verify status metadata enrichment
    assert result.statusName == 'PLANNING' : "Should include status name"
    assert result.statusDescription != null : "Should include status description"
    
    // Verify counts
    assert result.step_instance_count == 1 : "Should have correct step instance count"
}

TestExecutor.runTest("B3: createPhaseInstance from master template") {
    def repository = new EmbeddedPhaseRepository()
    
    // Create instance from master phase
    def masterPhaseId = UUID.fromString('50000000-0000-0000-0000-000000000002')
    def sequenceInstanceId = UUID.fromString('40000000-0000-0000-0000-000000000001')
    
    def result = repository.createPhaseInstance(masterPhaseId, sequenceInstanceId)
    
    assert result != null : "Result should not be null"
    assert result.phi_id != null : "Created instance should have ID"
    assert result.phm_id == masterPhaseId : "Should reference correct master phase"
    assert result.sqi_id == sequenceInstanceId : "Should belong to correct sequence instance"
    assert result.phi_name == 'Configuration' : "Should inherit name from master phase"
    assert result.phi_status == 'PLANNING' : "Should have default PLANNING status"
    
    // Verify with overrides
    def overrides = [
        phi_name: 'Custom Phase Name',
        phi_order: 10
    ]
    def customResult = repository.createPhaseInstance(masterPhaseId, sequenceInstanceId, overrides)
    assert customResult.phi_name == 'Custom Phase Name' : "Should use override name"
    assert customResult.phi_order == 10 : "Should use override order"
}

TestExecutor.runTest("B4: updatePhaseInstance updates fields") {
    def repository = new EmbeddedPhaseRepository()
    
    // Get existing instance
    def instanceId = UUID.fromString('60000000-0000-0000-0000-000000000001')
    def originalInstance = repository.findPhaseInstanceById(instanceId)
    assert originalInstance != null : "Original instance should exist"
    
    // Update instance
    def updates = [
        phi_name: 'Updated Preparation Instance',
        phi_description: 'Updated description',
        phi_order: 10
    ]
    
    def result = repository.updatePhaseInstance(instanceId, updates)
    
    assert result != null : "Result should not be null"
    assert result.phi_id == instanceId : "Should have same ID"
    assert result.phi_name == 'Updated Preparation Instance' : "Name should be updated"
    assert result.phi_description == 'Updated description' : "Description should be updated"
    assert result.phi_order == 10 : "Order should be updated"
    
    // Verify the update persisted
    def updatedInstance = repository.findPhaseInstanceById(instanceId)
    assert updatedInstance.phi_name == 'Updated Preparation Instance' : "Updated name should persist"
    assert updatedInstance.phi_order == 10 : "Updated order should persist"
}

TestExecutor.runTest("B5: deletePhaseInstance dependency check") {
    def repository = new EmbeddedPhaseRepository()
    
    // Try to delete instance with step instances (should fail)
    def instanceIdWithSteps = UUID.fromString('60000000-0000-0000-0000-000000000001')
    def hasSteps = repository.hasStepInstances(instanceIdWithSteps)
    assert hasSteps == true : "Instance should have step instances"
    
    try {
        repository.deletePhaseInstance(instanceIdWithSteps)
        assert false : "Should throw exception when deleting instance with step instances"
    } catch (Exception e) {
        assert e.message.contains('Cannot delete phase instance') : "Should have appropriate error message"
    }
    
    // Delete instance without dependencies (should succeed)
    def instanceIdWithoutSteps = UUID.fromString('60000000-0000-0000-0000-000000000002')
    def hasNoSteps = repository.hasStepInstances(instanceIdWithoutSteps)
    assert hasNoSteps == false : "Instance should not have step instances"
    
    def result = repository.deletePhaseInstance(instanceIdWithoutSteps)
    assert result == true : "Delete should succeed"
    
    // Verify deletion
    def deletedInstance = repository.findPhaseInstanceById(instanceIdWithoutSteps)
    assert deletedInstance == null : "Deleted instance should not be found"
}

// Category C: Pagination & Filtering
println "\nCategory C: Pagination & Filtering (6 tests)"
println "${'-'*80}"

TestExecutor.runTest("C1: findMasterPhasesWithFilters owner filter") {
    def repository = new EmbeddedPhaseRepository()
    
    // Filter by team owner
    def filters = [ownerId: 1, offset: 0, limit: 10]
    def result = repository.findMasterPhasesWithFilters(filters)
    
    assert result != null : "Result should not be null"
    assert result.phases != null : "Should have phases list"
    assert result.total == 2 : "Team 1 should own 2 phases (through plan)"
    
    // Verify all phases belong to Team Alpha
    result.phases.each { phase ->
        assert phase.tms_id == 1 : "All phases should belong to Team Alpha"
        assert phase.tms_name == 'Team Alpha' : "Should include team name"
    }
    
    // Test with different owner
    def team2Result = repository.findMasterPhasesWithFilters([ownerId: 2, offset: 0, limit: 10])
    assert team2Result.total == 2 : "Team 2 should own 2 phases"
}

TestExecutor.runTest("C2: findMasterPhasesWithFilters search filter") {
    def repository = new EmbeddedPhaseRepository()
    
    // Search for "Preparation" in name
    def filters = [search: '%Preparation%', offset: 0, limit: 10]
    def result = repository.findMasterPhasesWithFilters(filters)
    
    assert result != null : "Result should not be null"
    assert result.total == 1 : "Should find 1 phase matching 'Preparation'"
    assert result.phases[0].phm_name == 'Preparation' : "Should return Preparation phase"
    
    // Search in description
    def descResult = repository.findMasterPhasesWithFilters([search: '%migration%', offset: 0, limit: 10])
    assert descResult.total >= 1 : "Should find phases with 'migration' in description"
    
    // Search with no results
    def noResult = repository.findMasterPhasesWithFilters([search: '%nonexistent%', offset: 0, limit: 10])
    assert noResult.total == 0 : "Should return 0 results for nonexistent search"
    assert noResult.phases.size() == 0 : "Phases list should be empty"
}

TestExecutor.runTest("C3: findMasterPhasesWithFilters date range filter") {
    def repository = new EmbeddedPhaseRepository()
    
    // Get current timestamp
    def now = new java.sql.Timestamp(System.currentTimeMillis())
    def yesterday = new java.sql.Timestamp(System.currentTimeMillis() - 86400000) // 1 day ago
    def tomorrow = new java.sql.Timestamp(System.currentTimeMillis() + 86400000) // 1 day ahead
    
    // All phases created today should be found
    def filters = [createdAfter: yesterday, createdBefore: tomorrow, offset: 0, limit: 10]
    def result = repository.findMasterPhasesWithFilters(filters)
    
    assert result != null : "Result should not be null"
    assert result.total == 4 : "Should find all 4 phases created today"
    
    // No phases before yesterday
    def beforeResult = repository.findMasterPhasesWithFilters([createdBefore: yesterday, offset: 0, limit: 10])
    assert beforeResult.total == 0 : "Should find no phases before yesterday"
    
    // All phases after yesterday
    def afterResult = repository.findMasterPhasesWithFilters([createdAfter: yesterday, offset: 0, limit: 10])
    assert afterResult.total == 4 : "Should find all phases after yesterday"
}

TestExecutor.runTest("C4: findMasterPhasesWithFilters multiple filters") {
    def repository = new EmbeddedPhaseRepository()
    
    // Combine owner + sequence filters
    def sequenceId = UUID.fromString('30000000-0000-0000-0000-000000000001')
    def filters = [
        ownerId: 1,
        sqm_id: sequenceId,
        offset: 0,
        limit: 10
    ]
    def result = repository.findMasterPhasesWithFilters(filters)
    
    assert result != null : "Result should not be null"
    assert result.total == 2 : "Should find 2 phases matching both filters"
    
    // Verify results match all criteria
    result.phases.each { phase ->
        assert phase.tms_id == 1 : "Should belong to Team Alpha"
        assert phase.sqm_id == sequenceId : "Should belong to sequence"
    }
    
    // Combine search + owner
    def searchOwnerResult = repository.findMasterPhasesWithFilters([
        search: '%Preparation%',
        ownerId: 1,
        offset: 0,
        limit: 10
    ])
    assert searchOwnerResult.total == 1 : "Should find 1 phase matching search and owner"
    assert searchOwnerResult.phases[0].phm_name == 'Preparation' : "Should return Preparation phase"
}

TestExecutor.runTest("C5: findMasterPhasesWithFilters pagination edge cases") {
    def repository = new EmbeddedPhaseRepository()
    
    // Test offset beyond total
    def beyondResult = repository.findMasterPhasesWithFilters([offset: 10, limit: 10])
    assert beyondResult.phases.size() == 0 : "Should return empty list when offset beyond total"
    assert beyondResult.total == 4 : "Total should still be correct"
    
    // Test limit larger than total
    def largeLimit = repository.findMasterPhasesWithFilters([offset: 0, limit: 100])
    assert largeLimit.phases.size() == 4 : "Should return all phases when limit > total"
    assert largeLimit.total == 4 : "Total should be correct"
    
    // Test offset at exact boundary
    def boundaryResult = repository.findMasterPhasesWithFilters([offset: 3, limit: 10])
    assert boundaryResult.phases.size() == 1 : "Should return 1 phase at boundary"
    
    // Test very first page
    def firstPage = repository.findMasterPhasesWithFilters([offset: 0, limit: 1])
    assert firstPage.phases.size() == 1 : "Should return 1 phase"
    assert firstPage.total == 4 : "Total should be 4"
}

TestExecutor.runTest("C6: findMasterPhasesWithFilters sort validation") {
    def repository = new EmbeddedPhaseRepository()
    
    // Test default sort (by plan name, sequence order, phase order)
    def defaultSort = repository.findMasterPhasesWithFilters([offset: 0, limit: 10])
    assert defaultSort.phases.size() == 4 : "Should return all 4 phases"
    
    // Verify sort order: first by plan name, then sequence order, then phase order
    def firstPhase = defaultSort.phases[0]
    def secondPhase = defaultSort.phases[1]
    
    assert firstPhase.plm_name <= secondPhase.plm_name : "Should be sorted by plan name first"
    
    // If same plan, verify sequence order
    if (firstPhase.plm_name == secondPhase.plm_name) {
        assert firstPhase.sqm_order <= secondPhase.sqm_order : "Should be sorted by sequence order"
        
        // If same sequence, verify phase order
        if (firstPhase.sqm_id == secondPhase.sqm_id) {
            assert firstPhase.phm_order <= secondPhase.phm_order : "Should be sorted by phase order"
        }
    }
    
    // Verify all phases maintain hierarchical ordering
    assert defaultSort.phases[0].phm_name == 'Preparation' : "First should be Preparation"
    assert defaultSort.phases[1].phm_name == 'Configuration' : "Second should be Configuration"
}

// Category D: Hierarchical Filtering
println "\nCategory D: Hierarchical Filtering (5 tests)"
println "${'-'*80}"

TestExecutor.runTest("D1: findMasterPhasesBySequenceId empty sequence") {
    def repository = new EmbeddedPhaseRepository()
    
    // Create a sequence with no phases
    def emptySequenceId = UUID.fromString('99999999-0000-0000-0000-000000000099')
    def result = repository.findMasterPhasesBySequenceId(emptySequenceId)
    
    assert result != null : "Result should not be null"
    assert result.size() == 0 : "Should return empty list for sequence with no phases"
    assert result instanceof List : "Should return a list"
}

TestExecutor.runTest("D2: findPhaseInstances migration level") {
    def repository = new EmbeddedPhaseRepository()
    
    // Filter by migration ID - should find instances through hierarchy
    def migrationId = UUID.fromString('00000000-0000-0000-0000-000000000001')
    def filters = [mig_id: migrationId]
    def result = repository.findPhaseInstances(filters)
    
    assert result != null : "Result should not be null"
    assert result.size() >= 1 : "Should find phase instances for migration"
    
    // Verify hierarchical filtering worked
    result.each { instance ->
        assert instance.phi_id != null : "Should have instance ID"
        assert instance.phm_name != null : "Should include master phase name"
    }
    
    // Test with different migration
    def migration2Id = UUID.fromString('00000000-0000-0000-0000-000000000002')
    def result2 = repository.findPhaseInstances([mig_id: migration2Id])
    assert result2.size() >= 1 : "Should find instances for migration 2"
}

TestExecutor.runTest("D3: findPhaseInstances iteration level") {
    def repository = new EmbeddedPhaseRepository()
    
    // Filter by iteration ID
    def iterationId = UUID.fromString('10000000-0000-0000-0000-000000000001')
    def filters = [itr_id: iterationId]
    def result = repository.findPhaseInstances(filters)
    
    assert result != null : "Result should not be null"
    assert result.size() >= 1 : "Should find phase instances for iteration"
    
    // Verify results belong to the iteration (through plan instance hierarchy)
    result.each { instance ->
        assert instance.sqi_id != null : "Should have sequence instance ID"
        assert instance.phm_name != null : "Should include master phase name"
    }
    
    // Test with different iteration
    def iteration2Id = UUID.fromString('10000000-0000-0000-0000-000000000002')
    def result2 = repository.findPhaseInstances([itr_id: iteration2Id])
    assert result2.size() >= 1 : "Should find instances for iteration 2"
}

TestExecutor.runTest("D4: findPhaseInstances plan instance level") {
    def repository = new EmbeddedPhaseRepository()
    
    // Filter by plan instance ID
    def planInstanceId = UUID.fromString('20000000-0000-0000-0000-000000000001')
    def filters = [pli_id: planInstanceId]
    def result = repository.findPhaseInstances(filters)
    
    assert result != null : "Result should not be null"
    assert result.size() >= 1 : "Should find phase instances for plan instance"
    
    // Verify hierarchical relationships
    result.each { instance ->
        assert instance.phi_id != null : "Should have phase instance ID"
        assert instance.sqi_id != null : "Should have sequence instance ID"
        assert instance.plm_name != null : "Should include plan name"
    }
    
    // Test with different plan instance
    def planInstance2Id = UUID.fromString('20000000-0000-0000-0000-000000000002')
    def result2 = repository.findPhaseInstances([pli_id: planInstance2Id])
    assert result2.size() >= 1 : "Should find instances for plan instance 2"
}

TestExecutor.runTest("D5: findPhaseInstances sequence instance level") {
    def repository = new EmbeddedPhaseRepository()
    
    // Filter by sequence instance ID (most specific hierarchical level)
    def sequenceInstanceId = UUID.fromString('40000000-0000-0000-0000-000000000001')
    def filters = [sqi_id: sequenceInstanceId]
    def result = repository.findPhaseInstances(filters)
    
    assert result != null : "Result should not be null"
    assert result.size() == 1 : "Should find 1 phase instance for sequence instance"
    
    // Verify instance belongs to correct sequence instance
    def instance = result[0]
    assert instance.sqi_id == sequenceInstanceId : "Instance should belong to sequence instance"
    assert instance.phi_name == 'Preparation Instance' : "Should have correct name"
    assert instance.sqm_name == 'Infrastructure Setup' : "Should include sequence name"
    
    // Test with different sequence instance
    def sequenceInstance2Id = UUID.fromString('40000000-0000-0000-0000-000000000002')
    def result2 = repository.findPhaseInstances([sqi_id: sequenceInstance2Id])
    assert result2.size() == 1 : "Should find 1 instance for sequence instance 2"
    assert result2[0].phi_name == 'Data Migration Instance' : "Should have correct name"
}

// Category E: Edge Cases & Complex Operations
println "\nCategory E: Edge Cases & Complex Operations (4 tests)"
println "${'-'*80}"

TestExecutor.runTest("E1: reorderMasterPhases shift positions") {
    def repository = new EmbeddedPhaseRepository()
    
    // Get initial phases in a sequence
    def sequenceId = UUID.fromString('30000000-0000-0000-0000-000000000001')
    def initialPhases = repository.findMasterPhasesBySequenceId(sequenceId)
    
    assert initialPhases.size() == 2 : "Should have 2 phases initially"
    assert initialPhases[0].phm_order == 1 : "First phase should have order 1"
    assert initialPhases[1].phm_order == 2 : "Second phase should have order 2"
    
    // Reorder: move second phase to position 1 (should shift first to position 2)
    def phaseToMove = initialPhases[1].phm_id
    def result = repository.reorderMasterPhases(sequenceId, phaseToMove, 1)
    
    assert result == true : "Reorder should succeed"
    
    // Verify new order
    def reorderedPhases = repository.findMasterPhasesBySequenceId(sequenceId)
    assert reorderedPhases[0].phm_id == phaseToMove : "Moved phase should now be first"
    assert reorderedPhases[0].phm_order == 1 : "Should have order 1"
    assert reorderedPhases[1].phm_order == 2 : "Other phase should have order 2"
}

TestExecutor.runTest("E2: normalizePhaseOrder fixes gaps") {
    def repository = new EmbeddedPhaseRepository()
    
    // Create phases with gaps in ordering (1, 3, 5, 10)
    def sequenceId = UUID.fromString('30000000-0000-0000-0000-000000000001')
    
    // Manually update phases to have gaps
    def phases = repository.findMasterPhasesBySequenceId(sequenceId)
    if (phases.size() >= 2) {
        repository.updateMasterPhase(phases[0].phm_id, [phm_order: 1])
        repository.updateMasterPhase(phases[1].phm_id, [phm_order: 10])
    }
    
    // Verify gaps exist
    def gappedPhases = repository.findMasterPhasesBySequenceId(sequenceId)
    assert gappedPhases[1].phm_order == 10 : "Should have gap in ordering"
    
    // Normalize ordering
    def result = repository.normalizePhaseOrder(sequenceId)
    assert result == true : "Normalization should succeed"
    
    // Verify gaps are removed (should be 1, 2, 3, ...)
    def normalizedPhases = repository.findMasterPhasesBySequenceId(sequenceId)
    for (int i = 0; i < normalizedPhases.size(); i++) {
        assert normalizedPhases[i].phm_order == (i + 1) : "Phase ${i} should have order ${i + 1}"
    }
}

TestExecutor.runTest("E3: hasCircularDependency detects cycles") {
    def repository = new EmbeddedPhaseRepository()
    
    // Test with no circular dependencies (normal case)
    def sequenceId = UUID.fromString('30000000-0000-0000-0000-000000000001')
    def phase1 = UUID.fromString('50000000-0000-0000-0000-000000000001')
    def phase2 = UUID.fromString('50000000-0000-0000-0000-000000000002')
    
    // Phase 2 depends on Phase 1 (no cycle)
    def noCycle = repository.hasCircularDependency(sequenceId, phase2, phase1)
    assert noCycle == false : "Should detect no circular dependency for valid predecessor"
    
    // Test potential cycle: Phase 1 depending on Phase 2 (which depends on Phase 1)
    def hasCycle = repository.hasCircularDependency(sequenceId, phase1, phase2)
    assert hasCycle == true : "Should detect circular dependency when creating cycle"
    
    // Test self-reference
    def selfReference = repository.hasCircularDependency(sequenceId, phase1, phase1)
    assert selfReference == true : "Should detect circular dependency for self-reference"
    
    // Test null predecessor (no dependency, no cycle)
    def nullPredecessor = repository.hasCircularDependency(sequenceId, phase1, null)
    assert nullPredecessor == false : "Should have no circular dependency with null predecessor"
}

TestExecutor.runTest("E4: getPhaseStatistics aggregation") {
    def repository = new EmbeddedPhaseRepository()
    
    // Get statistics for a sequence
    def sequenceId = UUID.fromString('30000000-0000-0000-0000-000000000001')
    def stats = repository.getPhaseStatistics(sequenceId)
    
    assert stats != null : "Statistics should not be null"
    assert stats.total_phases != null : "Should include total phases count"
    assert stats.total_phases == 2 : "Sequence 1 should have 2 phases"
    
    // Verify statistics include useful aggregations
    assert stats.total_steps >= 0 : "Should include step count"
    assert stats.total_instances >= 0 : "Should include instance count"
    
    // Test statistics for different sequence
    def sequence2Id = UUID.fromString('30000000-0000-0000-0000-000000000002')
    def stats2 = repository.getPhaseStatistics(sequence2Id)
    assert stats2.total_phases == 2 : "Sequence 2 should have 2 phases"
    
    // Test statistics for empty sequence
    def emptySequenceId = UUID.fromString('99999999-0000-0000-0000-000000000099')
    def emptyStats = repository.getPhaseStatistics(emptySequenceId)
    assert emptyStats.total_phases == 0 : "Empty sequence should have 0 phases"
}

// Print test summary
TestExecutor.printSummary()

// Exit with appropriate code
System.exit(TestExecutor.failedTests == 0 ? 0 : 1)
