-- DTO Performance Optimization Indexes for US-056-C
-- Based on analysis of buildDTOBaseQuery() and common filtering patterns
-- 
-- These indexes are specifically designed to optimize the new DTO-based endpoints
-- in StepRepository that use complex hierarchical JOINs with aggregation subqueries.
--
-- Execute after performance analysis confirms these are the bottlenecks
-- Monitor index usage with: SELECT * FROM pg_stat_user_indexes WHERE indexrelname LIKE 'idx_dto_%';

-- ==============================================================================
-- CRITICAL INDEXES FOR buildDTOBaseQuery() PERFORMANCE
-- ==============================================================================

-- 1. Primary filtering index for steps_instance_sti (most critical)
-- Supports: sti_is_active = true AND sti_status = ? AND assigned_team_id = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dto_sti_active_status_team
ON steps_instance_sti (sti_is_active, sti_status, assigned_team_id, sti_priority DESC)
WHERE sti_is_active = true;

-- 2. Hierarchical navigation index for phases_instance_phi
-- Supports: phi.phi_id = sti.phi_id filtering and sqi_id lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dto_phi_hierarchy
ON phases_instance_phi (phi_id, sqi_id, phi_is_active);

-- 3. Sequence to plan navigation index
-- Supports: sqi.pli_id = pli.pli_id filtering in hierarchical queries  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dto_sqi_plan_navigation
ON sequences_instance_sqi (sqi_id, pli_id, sqi_is_active, sqi_number);

-- 4. Plan to migration/iteration lookup index
-- Supports: pli.mig_id and pli.ite_id filtering (most common API filters)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dto_pli_context
ON plans_instance_pli (pli_id, mig_id, ite_id, pli_is_active);

-- 5. Migration code lookup optimization
-- Supports: mig.mig_code = ? filtering (very common in API calls)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dto_mig_code_lookup
ON migrations_mig (mig_code, mig_id);

-- 6. Team assignment optimization
-- Supports: tms.tms_id = sti.assigned_team_id JOINs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dto_team_assignment
ON teams_tms (tms_id, tms_name);

-- 7. Step master hierarchy optimization
-- Supports: stm.phm_id = phm.phm_id JOINs and step ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dto_stm_hierarchy
ON steps_master_stm (stm_id, phm_id, stt_code, stm_order);

-- ==============================================================================
-- AGGREGATION SUBQUERY OPTIMIZATION INDEXES
-- ==============================================================================

-- 8. Step dependencies aggregation optimization
-- Supports: dependency count subqueries in buildDTOBaseQuery()
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dto_step_dependencies
ON step_dependencies_sde (sti_id, is_active, dependency_status)
WHERE is_active = true;

-- 9. Instructions aggregation optimization  
-- Supports: instruction count subqueries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dto_instructions_count
ON instructions_instance_ini (sti_id, ini_is_active, ini_status)
WHERE ini_is_active = true;

-- 10. Comments aggregation optimization
-- Supports: comment count and latest comment date subqueries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dto_comments_aggregation
ON step_instance_comments_sic (sti_id, is_active, created_at DESC)
WHERE is_active = true;

-- ==============================================================================
-- COVERING INDEXES FOR READ-HEAVY OPERATIONS  
-- ==============================================================================

-- 11. Single step lookup covering index (avoids table lookups)
-- Covers most fields needed for single step DTO transformation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dto_sti_covering
ON steps_instance_sti (sti_id) 
INCLUDE (stm_id, sti_name, sti_description, sti_status, sti_priority, 
         sti_created_date, sti_last_modified_date, assigned_team_id, phi_id);

-- 12. Team-based step lookup covering index
-- Optimizes "get all steps for team" queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dto_team_steps_covering  
ON steps_instance_sti (assigned_team_id, sti_is_active, sti_status)
INCLUDE (sti_id, stm_id, sti_priority, sti_created_date)
WHERE sti_is_active = true;

-- ==============================================================================
-- QUERY OPTIMIZATION STATISTICS UPDATE
-- ==============================================================================

-- Update table statistics to help the query planner
-- Run this after creating indexes
ANALYZE steps_instance_sti;
ANALYZE steps_master_stm;
ANALYZE phases_instance_phi;
ANALYZE sequences_instance_sqi;
ANALYZE plans_instance_pli;
ANALYZE migrations_mig;
ANALYZE iterations_ite;
ANALYZE teams_tms;
ANALYZE step_dependencies_sde;
ANALYZE instructions_instance_ini;
ANALYZE step_instance_comments_sic;

-- ==============================================================================
-- INDEX USAGE MONITORING QUERIES
-- ==============================================================================

-- Check index usage after deployment:
/*

-- 1. Monitor new index usage
SELECT 
    indexrelname as index_name,
    idx_tup_read as reads,
    idx_tup_fetch as fetches,
    idx_scan as scans
FROM pg_stat_user_indexes 
WHERE indexrelname LIKE 'idx_dto_%'
ORDER BY idx_scan DESC;

-- 2. Check for unused indexes (remove if consistently 0 scans)
SELECT 
    schemaname,
    tablename,
    indexrelname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelname::regclass)) as size
FROM pg_stat_user_indexes 
WHERE indexrelname LIKE 'idx_dto_%'
    AND idx_scan = 0
ORDER BY pg_relation_size(indexrelname::regclass) DESC;

-- 3. Monitor table scan reduction
SELECT 
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    CASE 
        WHEN seq_scan + idx_scan > 0 
        THEN ROUND(100.0 * idx_scan / (seq_scan + idx_scan), 2)
        ELSE 0 
    END as index_usage_percent
FROM pg_stat_user_tables
WHERE tablename IN ('steps_instance_sti', 'phases_instance_phi', 
                   'sequences_instance_sqi', 'plans_instance_pli')
ORDER BY index_usage_percent;

-- 4. Check for slow queries that might still need optimization
SELECT 
    query,
    mean_time,
    calls,
    total_time
FROM pg_stat_statements
WHERE query LIKE '%steps_instance_sti%'
    AND mean_time > 50  -- Queries taking more than 50ms on average
ORDER BY mean_time DESC;

*/

-- ==============================================================================
-- MAINTENANCE RECOMMENDATIONS
-- ==============================================================================

/*
MAINTENANCE NOTES:

1. Monitor index bloat monthly:
   SELECT * FROM pg_stat_user_indexes WHERE indexrelname LIKE 'idx_dto_%';
   
2. Reindex if fragmentation > 20%:
   REINDEX INDEX CONCURRENTLY idx_dto_sti_active_status_team;
   
3. Update statistics weekly for high-change tables:
   ANALYZE steps_instance_sti;
   
4. Consider partitioning steps_instance_sti by migration_id if > 1M rows
   
5. Monitor connection pool settings for optimal concurrent query performance

6. Set up alerting for queries exceeding 51ms target:
   Alert if mean_time > 51 in pg_stat_statements for DTO queries

*/