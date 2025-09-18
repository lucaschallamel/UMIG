--liquibase formatted sql

-- ================================================================================
-- DTO Performance Optimization Migration
-- US-056-C: DTO-based endpoint performance optimization for buildDTOBaseQuery()
-- ================================================================================
--
-- This migration implements specialized indexes to optimize the new DTO-based endpoints
-- in StepRepository that use complex hierarchical JOINs with aggregation subqueries.
--
-- Performance Targets:
-- - Single entity queries: <51ms (from baseline analysis)
-- - Paginated queries: <500ms
-- - Hierarchical navigation: <200ms
-- - Aggregation subqueries: <100ms
-- - Team-based filtering: <150ms
--
-- Based on: CreateOptimizedIndexes.sql analysis
-- Original Author: Lucas Challamel
-- Migration Author: Lucas Challamel
-- Created: 2025-09-18
-- ================================================================================

--changeset lucaschallamel:dto-primary-filtering-indexes runInTransaction:false
--comment: US-056-C DTO Performance: Primary filtering indexes for buildDTOBaseQuery()
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'steps_instance_sti' AND indexname = 'idx_dto_sti_active_status_team';

-- ================================================================================
-- CRITICAL INDEXES FOR buildDTOBaseQuery() PERFORMANCE
-- ================================================================================

-- 1. Primary filtering index for steps_instance_sti (most critical)
-- Supports: sti_is_active = true AND sti_status = ? AND assigned_team_id = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dto_sti_active_status_team
ON steps_instance_sti (sti_is_active, sti_status, assigned_team_id, sti_priority DESC)
WHERE sti_is_active = true;

COMMENT ON INDEX idx_dto_sti_active_status_team IS 'US-056-C DTO: Primary filtering index for active steps with status and team filtering';

--rollback DROP INDEX IF EXISTS idx_dto_sti_active_status_team;

--changeset lucaschallamel:dto-hierarchical-navigation-indexes runInTransaction:false
--comment: US-056-C DTO Performance: Hierarchical navigation indexes for entity relationships
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'phases_instance_phi' AND indexname = 'idx_dto_phi_hierarchy';

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

COMMENT ON INDEX idx_dto_phi_hierarchy IS 'US-056-C DTO: Hierarchical navigation index for phases to sequences relationship';
COMMENT ON INDEX idx_dto_sqi_plan_navigation IS 'US-056-C DTO: Navigation index for sequence to plan relationships';
COMMENT ON INDEX idx_dto_pli_context IS 'US-056-C DTO: Context lookup index for plan to migration/iteration filtering';

--rollback DROP INDEX IF EXISTS idx_dto_phi_hierarchy;
--rollback DROP INDEX IF EXISTS idx_dto_sqi_plan_navigation;
--rollback DROP INDEX IF EXISTS idx_dto_pli_context;

--changeset lucaschallamel:dto-lookup-optimization-indexes runInTransaction:false
--comment: US-056-C DTO Performance: Lookup optimization indexes for common queries
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'migrations_mig' AND indexname = 'idx_dto_mig_code_lookup';

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

COMMENT ON INDEX idx_dto_mig_code_lookup IS 'US-056-C DTO: Migration code lookup optimization for API filtering';
COMMENT ON INDEX idx_dto_team_assignment IS 'US-056-C DTO: Team assignment optimization for JOIN operations';
COMMENT ON INDEX idx_dto_stm_hierarchy IS 'US-056-C DTO: Step master hierarchy optimization for ordering and relationships';

--rollback DROP INDEX IF EXISTS idx_dto_mig_code_lookup;
--rollback DROP INDEX IF EXISTS idx_dto_team_assignment;
--rollback DROP INDEX IF EXISTS idx_dto_stm_hierarchy;

--changeset lucaschallamel:dto-aggregation-subquery-indexes runInTransaction:false
--comment: US-056-C DTO Performance: Aggregation subquery optimization indexes
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'step_dependencies_sde' AND indexname = 'idx_dto_step_dependencies';

-- ================================================================================
-- AGGREGATION SUBQUERY OPTIMIZATION INDEXES
-- ================================================================================

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

COMMENT ON INDEX idx_dto_step_dependencies IS 'US-056-C DTO: Aggregation optimization for step dependencies count subqueries';
COMMENT ON INDEX idx_dto_instructions_count IS 'US-056-C DTO: Aggregation optimization for instructions count subqueries';
COMMENT ON INDEX idx_dto_comments_aggregation IS 'US-056-C DTO: Aggregation optimization for comments count and latest date subqueries';

--rollback DROP INDEX IF EXISTS idx_dto_step_dependencies;
--rollback DROP INDEX IF EXISTS idx_dto_instructions_count;
--rollback DROP INDEX IF EXISTS idx_dto_comments_aggregation;

--changeset lucaschallamel:dto-covering-indexes runInTransaction:false
--comment: US-056-C DTO Performance: Covering indexes for read-heavy operations
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'steps_instance_sti' AND indexname = 'idx_dto_sti_covering';

-- ================================================================================
-- COVERING INDEXES FOR READ-HEAVY OPERATIONS  
-- ================================================================================

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

COMMENT ON INDEX idx_dto_sti_covering IS 'US-056-C DTO: Covering index for single step lookups avoiding table access';
COMMENT ON INDEX idx_dto_team_steps_covering IS 'US-056-C DTO: Covering index for team-based step queries';

--rollback DROP INDEX IF EXISTS idx_dto_sti_covering;
--rollback DROP INDEX IF EXISTS idx_dto_team_steps_covering;

--changeset lucaschallamel:dto-statistics-update
--comment: US-056-C DTO Performance: Update table statistics for query planner optimization
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:1 SELECT COUNT(*) FROM pg_tables WHERE tablename = 'steps_instance_sti';

-- ================================================================================
-- QUERY OPTIMIZATION STATISTICS UPDATE
-- ================================================================================
-- Update table statistics to help the query planner make optimal decisions
-- Run this after creating indexes to ensure accurate cost estimates

-- Primary DTO tables
ANALYZE steps_instance_sti;
ANALYZE steps_master_stm;
ANALYZE phases_instance_phi;
ANALYZE sequences_instance_sqi;
ANALYZE plans_instance_pli;
ANALYZE migrations_mig;
ANALYZE iterations_ite;
ANALYZE teams_tms;

-- Aggregation tables
ANALYZE step_dependencies_sde;
ANALYZE instructions_instance_ini;
ANALYZE step_instance_comments_sic;

--rollback -- No rollback needed for ANALYZE commands

-- ================================================================================
-- PERFORMANCE MONITORING RECOMMENDATIONS
-- ================================================================================
--
-- After deployment, monitor index effectiveness with these queries:
--
-- 1. Monitor new index usage:
-- SELECT indexrelname as index_name, idx_tup_read as reads, idx_tup_fetch as fetches, idx_scan as scans
-- FROM pg_stat_user_indexes WHERE indexrelname LIKE 'idx_dto_%' ORDER BY idx_scan DESC;
--
-- 2. Check for unused indexes:
-- SELECT schemaname, tablename, indexrelname, idx_scan,
--        pg_size_pretty(pg_relation_size(indexrelname::regclass)) as size
-- FROM pg_stat_user_indexes WHERE indexrelname LIKE 'idx_dto_%' AND idx_scan = 0
-- ORDER BY pg_relation_size(indexrelname::regclass) DESC;
--
-- 3. Monitor buildDTOBaseQuery() performance:
-- Look for queries with mean_time > 51ms in pg_stat_statements
--
-- 4. Maintenance recommendations:
-- - Monitor index bloat monthly
-- - Reindex CONCURRENTLY if fragmentation > 20%
-- - Update statistics weekly for high-change tables
-- - Consider partitioning steps_instance_sti if > 1M rows
-- ================================================================================