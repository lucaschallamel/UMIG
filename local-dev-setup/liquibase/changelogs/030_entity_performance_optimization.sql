--liquibase formatted sql

-- ================================================================================
-- Entity Performance Optimization Migration
-- US-082-C: Entity Migration Standard - Comprehensive Performance Optimization
-- ================================================================================
--
-- This consolidated migration optimizes performance for Teams, Users, and Applications
-- entities to achieve <200ms response time targets for all operations.
--
-- Consolidates the following migrations:
-- - 030_optimize_teams_performance_indexes.sql (Teams performance optimization)
-- - 031_optimize_users_performance_indexes.sql (Users performance optimization)
-- - 032_applications_performance_indexes.sql (Applications performance optimization)
--
-- Performance Targets:
-- - Teams bidirectional queries: <200ms (from 639ms)
-- - Users entity operations: <200ms
-- - Applications operations: <200ms
-- - Relationship queries: <100ms
-- - Pagination queries: <150ms
-- - Count aggregations: <100ms
-- - Authentication lookups: <50ms
--
-- Created: 2025-09-15
-- Author: Lucas Challamel
-- ================================================================================

--changeset lucaschallamel:teams-entity-performance-optimization runInTransaction:false
--comment: US-082-C Teams Entity: Bidirectional query performance optimization
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'teams_tms_x_users_usr' AND indexname = 'idx_teams_users_usr_id_created';

-- ================================================================================
-- TEAMS ENTITY PERFORMANCE INDEXES
-- ================================================================================
-- Purpose: Optimize getTeamsForUser() and getUsersForTeam() performance from 639ms to <200ms

-- Index for efficient team membership lookups by user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_users_usr_id_created
ON teams_tms_x_users_usr(usr_id, created_at DESC);

-- Index for efficient user lookups by team
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_users_tms_id_created
ON teams_tms_x_users_usr(tms_id, created_at ASC);

-- Composite index for role determination (created_by checks)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_users_created_by
ON teams_tms_x_users_usr(created_by, usr_id, tms_id);

-- Index for active user filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active
ON users_usr(usr_active)
WHERE usr_active = true;

-- Composite index for team stats aggregation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_users_stats
ON teams_tms_x_users_usr(tms_id, created_at);

-- Add comment documentation for Teams indexes
COMMENT ON INDEX idx_teams_users_usr_id_created IS 'Performance index for getTeamsForUser() - US-082-C Teams optimization';
COMMENT ON INDEX idx_teams_users_tms_id_created IS 'Performance index for getUsersForTeam() - US-082-C Teams optimization';
COMMENT ON INDEX idx_teams_users_created_by IS 'Performance index for role determination in bidirectional queries';
COMMENT ON INDEX idx_users_active IS 'Partial index for efficient active user filtering';
COMMENT ON INDEX idx_teams_users_stats IS 'Performance index for team statistics aggregation';

--rollback DROP INDEX IF EXISTS idx_teams_users_usr_id_created;
--rollback DROP INDEX IF EXISTS idx_teams_users_tms_id_created;
--rollback DROP INDEX IF EXISTS idx_teams_users_created_by;
--rollback DROP INDEX IF EXISTS idx_users_active;
--rollback DROP INDEX IF EXISTS idx_teams_users_stats;

--changeset lucaschallamel:users-entity-primary-performance-optimization runInTransaction:false
--comment: US-082-C Users Entity: Primary performance indexes for user operations
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'users_usr' AND indexname = 'idx_users_usr_id_active';

-- ================================================================================
-- USERS ENTITY PERFORMANCE INDEXES - PRIMARY OPERATIONS
-- ================================================================================
-- Purpose: Optimize Users entity performance for bidirectional relationships and role management
-- Target: <200ms for all user operations, audit queries, and role transitions

-- Primary performance index for user lookups by ID (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_usr_id_active
ON users_usr(usr_id, usr_active)
WHERE usr_active = true;

-- Index for efficient user searches by code (username lookups)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_code_active
ON users_usr(usr_code, usr_active)
WHERE usr_active = true;

-- Index for efficient email-based user lookups (authentication)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active
ON users_usr(usr_email, usr_active)
WHERE usr_active = true;

-- Composite index for role-based queries and filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_active
ON users_usr(rls_id, usr_active, created_at DESC)
WHERE usr_active = true;

-- Index for name-based searches (first name + last name combinations)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_names_search
ON users_usr USING gin(to_tsvector('english', usr_first_name || ' ' || usr_last_name))
WHERE usr_active = true;

-- Performance comments for primary user indexes
COMMENT ON INDEX idx_users_usr_id_active IS 'Primary performance index for user ID lookups - US-082-C Users optimization';
COMMENT ON INDEX idx_users_code_active IS 'Performance index for username-based authentication - US-082-C Users optimization';
COMMENT ON INDEX idx_users_email_active IS 'Performance index for email-based user lookups - US-082-C Users optimization';
COMMENT ON INDEX idx_users_role_active IS 'Performance index for role-based queries and filtering - US-082-C Users optimization';
COMMENT ON INDEX idx_users_names_search IS 'Full-text search index for user name searches - US-082-C Users optimization';

--rollback DROP INDEX IF EXISTS idx_users_usr_id_active;
--rollback DROP INDEX IF EXISTS idx_users_code_active;
--rollback DROP INDEX IF EXISTS idx_users_email_active;
--rollback DROP INDEX IF EXISTS idx_users_role_active;
--rollback DROP INDEX IF EXISTS idx_users_names_search;

--changeset lucaschallamel:users-entity-audit-performance-optimization runInTransaction:false
--comment: US-082-C Users Entity: Audit trail and activity tracking performance indexes
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'audit_log_aud' AND indexname = 'idx_audit_log_user_entity';

-- ================================================================================
-- USERS ENTITY PERFORMANCE INDEXES - AUDIT TRAIL
-- ================================================================================

-- Index for audit trail queries by user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_user_entity
ON audit_log_aud(aud_entity_type, aud_entity_id, aud_timestamp DESC)
WHERE aud_entity_type = 'user';

-- Index for audit trail queries by user who made changes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_changed_by
ON audit_log_aud(usr_id, aud_timestamp DESC)
WHERE usr_id IS NOT NULL;

-- Index for user activity queries (combined user and entity type)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_user_activity
ON audit_log_aud(usr_id, aud_entity_type, aud_timestamp DESC)
WHERE usr_id IS NOT NULL;

-- Index for role transition audit queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_role_changes
ON audit_log_aud(aud_entity_type, aud_action, aud_timestamp DESC)
WHERE aud_entity_type = 'user' AND aud_action = 'role_change';

-- Performance comments for audit indexes
COMMENT ON INDEX idx_audit_log_user_entity IS 'Performance index for user audit trail queries - US-082-C Users optimization';
COMMENT ON INDEX idx_audit_log_changed_by IS 'Performance index for "who changed what" audit queries - US-082-C Users optimization';
COMMENT ON INDEX idx_audit_log_user_activity IS 'Performance index for user activity tracking - US-082-C Users optimization';
COMMENT ON INDEX idx_audit_log_role_changes IS 'Performance index for role change audit queries - US-082-C Users optimization';

--rollback DROP INDEX IF EXISTS idx_audit_log_user_entity;
--rollback DROP INDEX IF EXISTS idx_audit_log_changed_by;
--rollback DROP INDEX IF EXISTS idx_audit_log_user_activity;
--rollback DROP INDEX IF EXISTS idx_audit_log_role_changes;

--changeset lucaschallamel:users-entity-relationship-performance-optimization runInTransaction:false
--comment: US-082-C Users Entity: Team relationship and lifecycle tracking performance indexes
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'teams_tms_x_users_usr' AND indexname = 'idx_teams_users_reverse_lookup';

-- ================================================================================
-- USERS ENTITY PERFORMANCE INDEXES - RELATIONSHIPS & LIFECYCLE
-- ================================================================================

-- Composite index for team membership queries (complement to teams indexes)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_users_reverse_lookup
ON teams_tms_x_users_usr(usr_id, tms_id, created_at DESC);

-- Index for created_at queries (useful for cleanup operations)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_users_created_at
ON teams_tms_x_users_usr(created_at);

-- Index for role hierarchy queries (used in role transition validation)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_roles_hierarchy
ON roles_rls(rls_code, rls_id);

-- Partial index for admin users (performance for admin-only operations)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_admin_active
ON users_usr(usr_id, usr_first_name, usr_last_name)
WHERE usr_is_admin = true AND usr_active = true;

-- Index for pagination queries with sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_pagination_sort
ON users_usr(usr_active, usr_last_name, usr_first_name, usr_id);

-- Index for team membership statistics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_users_member_stats
ON teams_tms_x_users_usr(usr_id)
INCLUDE (tms_id, created_at);

-- Performance comments for relationship indexes
COMMENT ON INDEX idx_teams_users_reverse_lookup IS 'Performance index for user team membership queries - US-082-C Users optimization';
COMMENT ON INDEX idx_teams_users_created_at IS 'Performance index for created_at queries and cleanup operations - US-082-C Users optimization';
COMMENT ON INDEX idx_roles_hierarchy IS 'Performance index for role hierarchy queries - US-082-C Users optimization';
COMMENT ON INDEX idx_users_admin_active IS 'Partial index for admin user operations - US-082-C Users optimization';
COMMENT ON INDEX idx_users_pagination_sort IS 'Performance index for paginated user listings - US-082-C Users optimization';
COMMENT ON INDEX idx_teams_users_member_stats IS 'Performance index for team membership statistics - US-082-C Users optimization';

--rollback DROP INDEX IF EXISTS idx_teams_users_reverse_lookup;
--rollback DROP INDEX IF EXISTS idx_teams_users_created_at;
--rollback DROP INDEX IF EXISTS idx_roles_hierarchy;
--rollback DROP INDEX IF EXISTS idx_users_admin_active;
--rollback DROP INDEX IF EXISTS idx_users_pagination_sort;
--rollback DROP INDEX IF EXISTS idx_teams_users_member_stats;

--changeset lucaschallamel:applications-entity-primary-performance-optimization runInTransaction:false
--comment: US-082-C Applications Entity: Primary table performance indexes
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'applications_app' AND indexname = 'idx_applications_app_code_lookup';

-- ================================================================================
-- APPLICATIONS ENTITY PERFORMANCE INDEXES - PRIMARY OPERATIONS
-- ================================================================================
-- Purpose: Optimize Applications entity performance to achieve <200ms response times
-- Based on proven index strategies from Teams, Users, and Environments entities

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

-- Performance comments for primary application indexes
COMMENT ON INDEX idx_applications_app_code_lookup IS 'Primary performance index for application code lookups - US-082-C Applications optimization';
COMMENT ON INDEX idx_applications_app_name_search IS 'Performance index for application name searches - US-082-C Applications optimization';
COMMENT ON INDEX idx_applications_search_composite IS 'Full-text search index for applications - US-082-C Applications optimization';
COMMENT ON INDEX idx_applications_pagination IS 'Performance index for application pagination - US-082-C Applications optimization';

--rollback DROP INDEX IF EXISTS idx_applications_app_code_lookup;
--rollback DROP INDEX IF EXISTS idx_applications_app_name_search;
--rollback DROP INDEX IF EXISTS idx_applications_search_composite;
--rollback DROP INDEX IF EXISTS idx_applications_pagination;

--changeset lucaschallamel:applications-entity-relationship-performance-optimization runInTransaction:false
--comment: US-082-C Applications Entity: Environment, Team, and Label relationship indexes
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'environments_env_x_applications_app' AND indexname = 'idx_env_app_assoc_app_id';

-- ================================================================================
-- APPLICATIONS ENTITY PERFORMANCE INDEXES - RELATIONSHIPS
-- ================================================================================

-- Environment-Application association indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_env_app_assoc_app_id
ON environments_env_x_applications_app (app_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_env_app_assoc_env_id
ON environments_env_x_applications_app (env_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_env_app_assoc_composite
ON environments_env_x_applications_app (app_id, env_id);

-- Team-Application association indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_app_assoc_app_id
ON teams_tms_x_applications_app (app_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_app_assoc_team_id
ON teams_tms_x_applications_app (tms_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_app_assoc_composite
ON teams_tms_x_applications_app (app_id, tms_id);

-- Label-Application association indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_label_app_assoc_app_id
ON labels_lbl_x_applications_app (app_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_label_app_assoc_label_id
ON labels_lbl_x_applications_app (lbl_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_label_app_assoc_composite
ON labels_lbl_x_applications_app (app_id, lbl_id);

-- Performance comments for relationship indexes
COMMENT ON INDEX idx_env_app_assoc_app_id IS 'Performance index for applications by environment - US-082-C Applications optimization';
COMMENT ON INDEX idx_env_app_assoc_env_id IS 'Performance index for environments by application - US-082-C Applications optimization';
COMMENT ON INDEX idx_env_app_assoc_composite IS 'Composite performance index for environment-application queries - US-082-C Applications optimization';
COMMENT ON INDEX idx_team_app_assoc_app_id IS 'Performance index for applications by team - US-082-C Applications optimization';
COMMENT ON INDEX idx_team_app_assoc_team_id IS 'Performance index for teams by application - US-082-C Applications optimization';
COMMENT ON INDEX idx_team_app_assoc_composite IS 'Composite performance index for team-application queries - US-082-C Applications optimization';
COMMENT ON INDEX idx_label_app_assoc_app_id IS 'Performance index for applications by label - US-082-C Applications optimization';
COMMENT ON INDEX idx_label_app_assoc_label_id IS 'Performance index for labels by application - US-082-C Applications optimization';
COMMENT ON INDEX idx_label_app_assoc_composite IS 'Composite performance index for label-application queries - US-082-C Applications optimization';

--rollback DROP INDEX IF EXISTS idx_env_app_assoc_app_id;
--rollback DROP INDEX IF EXISTS idx_env_app_assoc_env_id;
--rollback DROP INDEX IF EXISTS idx_env_app_assoc_composite;
--rollback DROP INDEX IF EXISTS idx_team_app_assoc_app_id;
--rollback DROP INDEX IF EXISTS idx_team_app_assoc_team_id;
--rollback DROP INDEX IF EXISTS idx_team_app_assoc_composite;
--rollback DROP INDEX IF EXISTS idx_label_app_assoc_app_id;
--rollback DROP INDEX IF EXISTS idx_label_app_assoc_label_id;
--rollback DROP INDEX IF EXISTS idx_label_app_assoc_composite;

--changeset lucaschallamel:applications-entity-advanced-performance-optimization runInTransaction:false
--comment: US-082-C Applications Entity: Advanced performance optimization with INCLUDE columns
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'applications_app' AND indexname = 'idx_applications_count_optimization';

-- ================================================================================
-- APPLICATIONS ENTITY PERFORMANCE INDEXES - ADVANCED OPTIMIZATIONS
-- ================================================================================

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

-- Index for ApplicationRepository.findAllApplicationsWithCounts() optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_with_counts_optimization
ON applications_app (app_code, app_name) INCLUDE (app_id, app_description);

-- Index for ApplicationRepository.findApplicationById() with relationships
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_detail_lookup
ON applications_app (app_id) INCLUDE (app_code, app_name, app_description);

-- Indexes for filtering by relationship counts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_env_count_per_app
ON environments_env_x_applications_app (app_id)
INCLUDE (env_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_count_per_app
ON teams_tms_x_applications_app (app_id)
INCLUDE (tms_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_label_count_per_app
ON labels_lbl_x_applications_app (app_id)
INCLUDE (lbl_id);

-- Index for filtering applications by specific environment
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apps_by_environment
ON environments_env_x_applications_app (env_id, app_id);

-- Index for filtering applications by specific team
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apps_by_team
ON teams_tms_x_applications_app (tms_id, app_id);

-- Index for filtering applications by specific label
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apps_by_label
ON labels_lbl_x_applications_app (lbl_id, app_id);

-- Performance comments for advanced optimization indexes
COMMENT ON INDEX idx_applications_count_optimization IS 'Performance index for application count queries - US-082-C Applications optimization';
COMMENT ON INDEX idx_applications_with_environments IS 'Performance index for applications with environments - US-082-C Applications optimization';
COMMENT ON INDEX idx_applications_with_teams IS 'Performance index for applications with teams - US-082-C Applications optimization';
COMMENT ON INDEX idx_applications_with_labels IS 'Performance index for applications with labels - US-082-C Applications optimization';
COMMENT ON INDEX idx_applications_with_counts_optimization IS 'Performance index for application count queries - US-082-C Applications optimization';
COMMENT ON INDEX idx_applications_detail_lookup IS 'Performance index for application detail lookups - US-082-C Applications optimization';
COMMENT ON INDEX idx_env_count_per_app IS 'Performance index for environment counts per application - US-082-C Applications optimization';
COMMENT ON INDEX idx_team_count_per_app IS 'Performance index for team counts per application - US-082-C Applications optimization';
COMMENT ON INDEX idx_label_count_per_app IS 'Performance index for label counts per application - US-082-C Applications optimization';
COMMENT ON INDEX idx_apps_by_environment IS 'Performance index for applications filtered by environment - US-082-C Applications optimization';
COMMENT ON INDEX idx_apps_by_team IS 'Performance index for applications filtered by team - US-082-C Applications optimization';
COMMENT ON INDEX idx_apps_by_label IS 'Performance index for applications filtered by label - US-082-C Applications optimization';

--rollback DROP INDEX IF EXISTS idx_applications_count_optimization;
--rollback DROP INDEX IF EXISTS idx_applications_with_environments;
--rollback DROP INDEX IF EXISTS idx_applications_with_teams;
--rollback DROP INDEX IF EXISTS idx_applications_with_labels;
--rollback DROP INDEX IF EXISTS idx_applications_with_counts_optimization;
--rollback DROP INDEX IF EXISTS idx_applications_detail_lookup;
--rollback DROP INDEX IF EXISTS idx_env_count_per_app;
--rollback DROP INDEX IF EXISTS idx_team_count_per_app;
--rollback DROP INDEX IF EXISTS idx_label_count_per_app;
--rollback DROP INDEX IF EXISTS idx_apps_by_environment;
--rollback DROP INDEX IF EXISTS idx_apps_by_team;
--rollback DROP INDEX IF EXISTS idx_apps_by_label;

--changeset lucaschallamel:entity-performance-statistics-update
--comment: US-082-C Entity Performance: Update table statistics for query planner optimization
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:1 SELECT COUNT(*) FROM pg_tables WHERE tablename = 'teams_tms';

-- ================================================================================
-- ENTITY PERFORMANCE OPTIMIZATION - STATISTICS UPDATE
-- ================================================================================
-- Update table statistics to help query planner make optimal decisions

-- Teams entity tables
ANALYZE teams_tms;
ANALYZE users_usr;
ANALYZE teams_tms_x_users_usr;

-- Users entity tables
ANALYZE roles_rls;
ANALYZE audit_log_aud;

-- Applications entity tables
ANALYZE applications_app;
ANALYZE environments_env_x_applications_app;
ANALYZE teams_tms_x_applications_app;
ANALYZE labels_lbl_x_applications_app;

--rollback -- No rollback needed for ANALYZE commands

-- Note: Monitoring views removed to avoid unnecessary database views
-- Performance can be monitored using standard PostgreSQL catalog queries when needed