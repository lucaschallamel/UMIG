-- Performance Monitoring Queries for DTO-Based Endpoints (US-056-C)
-- 
-- These queries help monitor the performance of the newly migrated DTO endpoints
-- and track progress against the <51ms single entity and <500ms paginated targets.
-- 
-- Run regularly (daily/weekly) to track performance trends and identify regressions.

-- ==============================================================================
-- REAL-TIME PERFORMANCE MONITORING
-- ==============================================================================

-- 1. Current slow queries affecting DTO endpoints (>51ms)
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    stddev_time,
    max_time,
    min_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE query LIKE '%steps_instance_sti%'
    OR query LIKE '%buildDTOBaseQuery%'
    OR query LIKE '%StepInstanceDTO%'
ORDER BY mean_time DESC
LIMIT 10;

-- 2. Index usage effectiveness for DTO queries
SELECT 
    t.tablename,
    indexrelname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    idx_blks_read,
    idx_blks_hit,
    CASE 
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'LOW_USAGE'
        WHEN idx_scan < 1000 THEN 'MODERATE_USAGE'
        ELSE 'HIGH_USAGE'
    END as usage_level
FROM pg_stat_user_indexes i
JOIN pg_stat_user_tables t ON i.relid = t.relid
WHERE t.tablename IN ('steps_instance_sti', 'steps_master_stm', 'phases_instance_phi',
                      'sequences_instance_sqi', 'plans_instance_pli', 'migrations_mig', 'teams_tms')
ORDER BY idx_scan DESC;

-- 3. Table scan vs index scan ratios (higher % is better)
SELECT 
    tablename,
    seq_scan as table_scans,
    seq_tup_read as rows_scanned,
    idx_scan as index_scans,
    idx_tup_fetch as rows_fetched,
    CASE 
        WHEN seq_scan + idx_scan = 0 THEN 0
        ELSE ROUND(100.0 * idx_scan / (seq_scan + idx_scan), 2)
    END as index_usage_percent,
    CASE 
        WHEN seq_scan + idx_scan = 0 THEN 'NO_ACTIVITY'
        WHEN 100.0 * idx_scan / (seq_scan + idx_scan) > 95 THEN 'EXCELLENT'
        WHEN 100.0 * idx_scan / (seq_scan + idx_scan) > 80 THEN 'GOOD' 
        WHEN 100.0 * idx_scan / (seq_scan + idx_scan) > 60 THEN 'MODERATE'
        ELSE 'POOR'
    END as performance_rating
FROM pg_stat_user_tables
WHERE tablename IN ('steps_instance_sti', 'steps_master_stm', 'phases_instance_phi',
                   'sequences_instance_sqi', 'plans_instance_pli', 'migrations_mig', 'teams_tms')
ORDER BY seq_scan DESC;

-- 4. Buffer cache hit ratios (should be >99%)
SELECT 
    tablename,
    heap_blks_read + heap_blks_hit as total_reads,
    heap_blks_hit,
    CASE 
        WHEN heap_blks_read + heap_blks_hit = 0 THEN 0
        ELSE ROUND(100.0 * heap_blks_hit / (heap_blks_read + heap_blks_hit), 2)
    END as cache_hit_percent
FROM pg_stat_user_tables
WHERE tablename IN ('steps_instance_sti', 'steps_master_stm', 'phases_instance_phi',
                   'sequences_instance_sqi', 'plans_instance_pli', 'migrations_mig', 'teams_tms')
ORDER BY cache_hit_percent;

-- ==============================================================================
-- DTO-SPECIFIC PERFORMANCE TESTS  
-- ==============================================================================

-- 5. Test single step lookup performance (target: <51ms)
-- This simulates the findByIdAsDTO() method performance
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    stm.stm_id,
    sti.sti_id,
    COALESCE(sti.sti_name, stm.stm_name) as stm_name,
    sti.sti_status,
    tms.tms_name,
    mig.mig_code
FROM steps_instance_sti sti
JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id  
LEFT JOIN teams_tms tms ON sti.assigned_team_id = tms.tms_id
LEFT JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
LEFT JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id  
LEFT JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
LEFT JOIN migrations_mig mig ON pli.mig_id = mig.mig_id
WHERE sti.sti_is_active = true
LIMIT 1;

-- 6. Test paginated query performance (target: <500ms for 50 rows)
-- This simulates the findFilteredStepInstancesAsDTO() method
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    stm.stm_id,
    sti.sti_id,
    COALESCE(sti.sti_name, stm.stm_name) as stm_name,
    sti.sti_status,
    tms.tms_name,
    mig.mig_code,
    ite.ite_code
FROM steps_instance_sti sti
JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
LEFT JOIN teams_tms tms ON sti.assigned_team_id = tms.tms_id
LEFT JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
LEFT JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
LEFT JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
LEFT JOIN migrations_mig mig ON pli.mig_id = mig.mig_id
LEFT JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
WHERE sti.sti_is_active = true
ORDER BY sti.sti_priority DESC, sti.sti_created_date DESC
LIMIT 50;

-- 7. Test aggregation subquery performance
-- This tests the expensive parts of buildDTOBaseQuery()
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    sti.sti_id,
    COALESCE(dep_counts.dependency_count, 0) as dependency_count,
    COALESCE(inst_counts.instruction_count, 0) as instruction_count,
    COALESCE(comment_counts.comment_count, 0) as comment_count
FROM steps_instance_sti sti
LEFT JOIN (
    SELECT 
        sti_id,
        COUNT(*) as dependency_count
    FROM step_dependencies_sde 
    WHERE is_active = true
    GROUP BY sti_id
) dep_counts ON sti.sti_id = dep_counts.sti_id
LEFT JOIN (
    SELECT 
        sti_id,
        COUNT(*) as instruction_count
    FROM instructions_instance_ini
    WHERE ini_is_active = true
    GROUP BY sti_id
) inst_counts ON sti.sti_id = inst_counts.sti_id
LEFT JOIN (
    SELECT 
        sti_id,
        COUNT(*) as comment_count
    FROM step_instance_comments_sic
    WHERE is_active = true
    GROUP BY sti_id
) comment_counts ON sti.sti_id = comment_counts.sti_id
WHERE sti.sti_is_active = true
LIMIT 10;

-- ==============================================================================
-- PERFORMANCE BENCHMARKING QUERIES
-- ==============================================================================

-- 8. Benchmark common API filter patterns
-- Test hierarchical filtering performance

-- Migration-based filtering (very common)
EXPLAIN (ANALYZE, BUFFERS)
SELECT COUNT(*)
FROM steps_instance_sti sti
LEFT JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
LEFT JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
LEFT JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id  
LEFT JOIN migrations_mig mig ON pli.mig_id = mig.mig_id
WHERE sti.sti_is_active = true
    AND mig.mig_code LIKE 'MIG%';

-- Team-based filtering (common)
EXPLAIN (ANALYZE, BUFFERS) 
SELECT COUNT(*)
FROM steps_instance_sti sti
JOIN teams_tms tms ON sti.assigned_team_id = tms.tms_id
WHERE sti.sti_is_active = true
    AND tms.tms_name IN ('Infrastructure Team', 'Database Team');

-- Status-based filtering with priority ordering (common)
EXPLAIN (ANALYZE, BUFFERS)
SELECT sti.sti_id, sti.sti_status, sti.sti_priority
FROM steps_instance_sti sti  
WHERE sti.sti_is_active = true
    AND sti.sti_status IN ('PENDING', 'IN_PROGRESS')
ORDER BY sti.sti_priority DESC, sti.sti_created_date DESC
LIMIT 50;

-- ==============================================================================
-- CONNECTION AND RESOURCE MONITORING
-- ==============================================================================

-- 9. Monitor connection usage (important for DTO query performance)
SELECT 
    state,
    COUNT(*) as connection_count,
    MAX(EXTRACT(EPOCH FROM (now() - query_start))) as longest_running_seconds
FROM pg_stat_activity 
WHERE datname = 'umig_app_db'
GROUP BY state
ORDER BY connection_count DESC;

-- 10. Check for lock contention that could affect DTO queries
SELECT 
    blocked_locks.pid         AS blocked_pid,
    blocked_activity.usename  AS blocked_user,
    blocking_locks.pid        AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query    AS blocked_statement,
    blocking_activity.query   AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.DATABASE IS NOT DISTINCT FROM blocked_locks.DATABASE
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation  
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.GRANTED;

-- ==============================================================================
-- PERFORMANCE TREND ANALYSIS
-- ==============================================================================

-- 11. Track query performance over time (requires pg_stat_statements)
-- Run this weekly and store results for trend analysis
SELECT 
    NOW() as measurement_time,
    'DTO_QUERIES' as query_type,
    COUNT(*) as query_count,
    AVG(mean_time) as avg_response_time,
    MAX(max_time) as worst_response_time,
    SUM(calls) as total_calls,
    SUM(total_time) as total_time_spent
FROM pg_stat_statements
WHERE query LIKE '%steps_instance_sti%'
    OR query LIKE '%findFilteredStepInstancesAsDTO%';

-- 12. Database size growth monitoring (affects performance over time)
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables
WHERE tablename IN ('steps_instance_sti', 'steps_master_stm', 'phases_instance_phi',
                   'sequences_instance_sqi', 'plans_instance_pli', 'migrations_mig', 'teams_tms')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ==============================================================================
-- ALERTS AND THRESHOLDS
-- ==============================================================================

/*
PERFORMANCE ALERT THRESHOLDS:

1. CRITICAL (Immediate Action Required):
   - Any DTO query averaging >100ms
   - Index usage < 80% for core tables
   - Cache hit ratio < 95%
   - More than 5 concurrent slow queries

2. WARNING (Monitor Closely):
   - Any DTO query averaging >51ms  
   - Index usage < 95% for core tables
   - Cache hit ratio < 99%
   - Connection count > 80% of max

3. INFO (Track Trends):
   - Query count increases >50% week-over-week
   - Database size growth >20% month-over-month
   - Any new sequential scans on core tables

RECOMMENDED MONITORING FREQUENCY:
- Real-time: Monitor active slow queries (queries 1, 11)
- Hourly: Check index usage and cache ratios (queries 2, 3, 4)  
- Daily: Run performance benchmarks (queries 5, 6, 7, 8)
- Weekly: Analyze trends and database growth (queries 11, 12)
*/