--liquibase formatted sql

--changeset lucaschallamel:applications-performance-primary-indexes
--comment: US-082-C Phase 3: Applications Performance Optimization - Primary Table Indexes
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'applications_app' AND indexname = 'idx_applications_app_code_lookup';

-- Applications Performance Indexes Migration
-- US-082-C Phase 3: Applications Entity Performance Optimization
--
-- This migration creates specialized indexes for the Applications entity to achieve
-- the <200ms response time target established in the BaseEntityManager pattern.
-- Based on proven index strategies from Teams, Users, and Environments entities.
--
-- Performance Targets:
-- - Application lookups by code: <50ms
-- - Application searches: <200ms
-- - Relationship queries: <100ms
-- - Pagination queries: <150ms
-- - Count aggregations: <100ms

-- Index for fast application code lookups (most common query pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_app_code_lookup
ON applications_app (app_code);

-- Index for application name searches and sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_app_name_search
ON applications_app (UPPER(app_name));

-- Composite index for search queries across code, name, and description
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_search_composite
ON applications_app USING gin (
    to_tsvector('english',
        COALESCE(app_code, '') || ' ' ||
        COALESCE(app_name, '') || ' ' ||
        COALESCE(app_description, '')
    )
);

-- Index for pagination and sorting optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_pagination
ON applications_app (app_id, app_code, app_name);

--rollback DROP INDEX IF EXISTS idx_applications_app_code_lookup;
--rollback DROP INDEX IF EXISTS idx_applications_app_name_search;
--rollback DROP INDEX IF EXISTS idx_applications_search_composite;
--rollback DROP INDEX IF EXISTS idx_applications_pagination;

--changeset lucaschallamel:applications-performance-environment-relationships
--comment: US-082-C Phase 3: Environment-Application relationship indexes
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'environments_env_x_applications_app' AND indexname = 'idx_env_app_assoc_app_id';

-- Environment-Application association indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_env_app_assoc_app_id
ON environments_env_x_applications_app (app_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_env_app_assoc_env_id
ON environments_env_x_applications_app (env_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_env_app_assoc_composite
ON environments_env_x_applications_app (app_id, env_id);

--rollback DROP INDEX IF EXISTS idx_env_app_assoc_app_id;
--rollback DROP INDEX IF EXISTS idx_env_app_assoc_env_id;
--rollback DROP INDEX IF EXISTS idx_env_app_assoc_composite;

--changeset lucaschallamel:applications-performance-team-relationships
--comment: US-082-C Phase 3: Team-Application relationship indexes
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'teams_tms_x_applications_app' AND indexname = 'idx_team_app_assoc_app_id';

-- Team-Application association indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_app_assoc_app_id
ON teams_tms_x_applications_app (app_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_app_assoc_team_id
ON teams_tms_x_applications_app (tms_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_app_assoc_composite
ON teams_tms_x_applications_app (app_id, tms_id);

--rollback DROP INDEX IF EXISTS idx_team_app_assoc_app_id;
--rollback DROP INDEX IF EXISTS idx_team_app_assoc_team_id;
--rollback DROP INDEX IF EXISTS idx_team_app_assoc_composite;

--changeset lucaschallamel:applications-performance-label-relationships
--comment: US-082-C Phase 3: Label-Application relationship indexes
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'labels_lbl_x_applications_app' AND indexname = 'idx_label_app_assoc_app_id';

-- Label-Application association indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_label_app_assoc_app_id
ON labels_lbl_x_applications_app (app_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_label_app_assoc_label_id
ON labels_lbl_x_applications_app (lbl_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_label_app_assoc_composite
ON labels_lbl_x_applications_app (app_id, lbl_id);

--rollback DROP INDEX IF EXISTS idx_label_app_assoc_app_id;
--rollback DROP INDEX IF EXISTS idx_label_app_assoc_label_id;
--rollback DROP INDEX IF EXISTS idx_label_app_assoc_composite;

--changeset lucaschallamel:applications-performance-optimization-indexes
--comment: US-082-C Phase 3: Performance optimization indexes with INCLUDE columns
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'applications_app' AND indexname = 'idx_applications_count_optimization';

-- Index for count aggregation queries (dashboard and list views)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_count_optimization
ON applications_app (app_id) INCLUDE (app_code, app_name);

-- Index for filtering applications with/without relationships
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_with_environments
ON environments_env_x_applications_app (app_id) INCLUDE (env_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_with_teams
ON teams_tms_x_applications_app (app_id) INCLUDE (tms_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_with_labels
ON labels_lbl_x_applications_app (app_id) INCLUDE (lbl_id);

--rollback DROP INDEX IF EXISTS idx_applications_count_optimization;
--rollback DROP INDEX IF EXISTS idx_applications_with_environments;
--rollback DROP INDEX IF EXISTS idx_applications_with_teams;
--rollback DROP INDEX IF EXISTS idx_applications_with_labels;

--changeset lucaschallamel:applications-performance-specialized-queries
--comment: US-082-C Phase 3: Specialized query optimization indexes
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'applications_app' AND indexname = 'idx_applications_with_counts_optimization';

-- Index for ApplicationRepository.findAllApplicationsWithCounts() optimization
-- This composite index supports the complex JOIN queries with counts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_with_counts_optimization
ON applications_app (app_code, app_name) INCLUDE (app_id, app_description);

-- Index for ApplicationRepository.findApplicationById() with relationships
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_detail_lookup
ON applications_app (app_id) INCLUDE (app_code, app_name, app_description);

--rollback DROP INDEX IF EXISTS idx_applications_with_counts_optimization;
--rollback DROP INDEX IF EXISTS idx_applications_detail_lookup;

--changeset lucaschallamel:applications-performance-count-indexes
--comment: US-082-C Phase 3: Relationship count optimization indexes
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'environments_env_x_applications_app' AND indexname = 'idx_env_count_per_app';

-- Indexes for filtering by relationship counts
-- These support queries like "applications with more than X environments"
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_env_count_per_app
ON environments_env_x_applications_app (app_id)
INCLUDE (env_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_count_per_app
ON teams_tms_x_applications_app (app_id)
INCLUDE (tms_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_label_count_per_app
ON labels_lbl_x_applications_app (app_id)
INCLUDE (lbl_id);

--rollback DROP INDEX IF EXISTS idx_env_count_per_app;
--rollback DROP INDEX IF EXISTS idx_team_count_per_app;
--rollback DROP INDEX IF EXISTS idx_label_count_per_app;

--changeset lucaschallamel:applications-performance-advanced-filtering
--comment: US-082-C Phase 3: Advanced filtering indexes
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'environments_env_x_applications_app' AND indexname = 'idx_apps_by_environment';

-- Index for filtering applications by specific environment
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apps_by_environment
ON environments_env_x_applications_app (env_id, app_id);

-- Index for filtering applications by specific team
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apps_by_team
ON teams_tms_x_applications_app (tms_id, app_id);

-- Index for filtering applications by specific label
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apps_by_label
ON labels_lbl_x_applications_app (lbl_id, app_id);

--rollback DROP INDEX IF EXISTS idx_apps_by_environment;
--rollback DROP INDEX IF EXISTS idx_apps_by_team;
--rollback DROP INDEX IF EXISTS idx_apps_by_label;

--changeset lucaschallamel:applications-performance-statistics-update
--comment: US-082-C Phase 3: Update table statistics for query planner optimization
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:1 SELECT COUNT(*) FROM pg_tables WHERE tablename = 'applications_app';

-- Update table statistics to help query planner
ANALYZE applications_app;
ANALYZE environments_env_x_applications_app;
ANALYZE teams_tms_x_applications_app;
ANALYZE labels_lbl_x_applications_app;

--rollback -- No rollback needed for ANALYZE commands

--changeset lucaschallamel:applications-performance-monitoring-views
--comment: US-082-C Phase 3: Create performance monitoring views
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM information_schema.views WHERE table_name = 'v_applications_performance_stats';

-- Create a view for monitoring application query performance
CREATE OR REPLACE VIEW v_applications_performance_stats AS
SELECT
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation,
    most_common_vals[1:5] as top_values
FROM pg_stats
WHERE schemaname = current_schema()
  AND tablename IN (
      'applications_app',
      'environments_env_x_applications_app',
      'teams_tms_x_applications_app',
      'labels_lbl_x_applications_app'
  )
ORDER BY tablename, attname;

-- Create a view for monitoring index usage
CREATE OR REPLACE VIEW v_applications_index_usage AS
SELECT
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan as times_used
FROM pg_stat_user_indexes
WHERE schemaname = current_schema()
  AND (
      tablename = 'applications_app' OR
      tablename LIKE '%_x_applications_app'
  )
ORDER BY times_used DESC;

--rollback DROP VIEW IF EXISTS v_applications_performance_stats;
--rollback DROP VIEW IF EXISTS v_applications_index_usage;