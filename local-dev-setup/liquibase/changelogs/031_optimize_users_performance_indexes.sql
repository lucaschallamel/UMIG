-- Migration V1.48: Performance optimization indexes for Users entity bidirectional queries
-- US-082-C: Entity Migration Standard - Users Performance Optimization
-- Created: 2025-09-15
-- Purpose: Optimize Users entity performance for bidirectional relationships and role management
-- Target: <200ms for all user operations, audit queries, and role transitions

-- Primary performance index for user lookups by ID (most common query)
CREATE INDEX IF NOT EXISTS idx_users_usr_id_active 
ON users_usr(usr_id, usr_active) 
WHERE usr_active = true;

-- Index for efficient user searches by code (username lookups)
CREATE INDEX IF NOT EXISTS idx_users_code_active 
ON users_usr(usr_code, usr_active) 
WHERE usr_active = true;

-- Index for efficient email-based user lookups (authentication)
CREATE INDEX IF NOT EXISTS idx_users_email_active 
ON users_usr(usr_email, usr_active) 
WHERE usr_active = true;

-- Composite index for role-based queries and filtering
CREATE INDEX IF NOT EXISTS idx_users_role_active 
ON users_usr(rls_id, usr_active, created_at DESC) 
WHERE usr_active = true;

-- Index for name-based searches (first name + last name combinations)
CREATE INDEX IF NOT EXISTS idx_users_names_search 
ON users_usr USING gin(to_tsvector('english', usr_first_name || ' ' || usr_last_name)) 
WHERE usr_active = true;

-- Index for audit trail queries by user
CREATE INDEX IF NOT EXISTS idx_audit_log_user_entity 
ON audit_log(entity_type, entity_id, changed_at DESC) 
WHERE entity_type = 'user';

-- Index for audit trail queries by changed_by (who made changes)
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by 
ON audit_log(changed_by, changed_at DESC) 
WHERE changed_by IS NOT NULL;

-- Index for user activity queries (combined entity and changed_by)
CREATE INDEX IF NOT EXISTS idx_audit_log_user_activity 
ON audit_log(changed_by, entity_type, changed_at DESC) 
WHERE changed_by IS NOT NULL;

-- Index for role transition audit queries
CREATE INDEX IF NOT EXISTS idx_audit_log_role_changes 
ON audit_log(entity_type, action, changed_at DESC) 
WHERE entity_type = 'user' AND action = 'role_change';

-- Composite index for team membership queries (complement to teams indexes)
CREATE INDEX IF NOT EXISTS idx_teams_users_reverse_lookup 
ON teams_tms_x_users_usr(usr_id, tms_id, created_at DESC);

-- Index for orphaned relationship cleanup queries
CREATE INDEX IF NOT EXISTS idx_teams_users_cleanup 
ON teams_tms_x_users_usr(created_at) 
WHERE created_at < (NOW() - INTERVAL '90 days');

-- Index for user deactivation/restoration fields
CREATE INDEX IF NOT EXISTS idx_users_deactivation_tracking 
ON users_usr(usr_deactivated_at, usr_deactivated_by) 
WHERE usr_deactivated_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_restoration_tracking 
ON users_usr(usr_restored_at, usr_restored_by) 
WHERE usr_restored_at IS NOT NULL;

-- Index for role hierarchy queries (used in role transition validation)
CREATE INDEX IF NOT EXISTS idx_roles_hierarchy 
ON roles_rls(rls_code, rls_id);

-- Partial index for admin users (performance for admin-only operations)
CREATE INDEX IF NOT EXISTS idx_users_admin_active 
ON users_usr(usr_id, usr_first_name, usr_last_name) 
WHERE usr_is_admin = true AND usr_active = true;

-- Index for pagination queries with sorting
CREATE INDEX IF NOT EXISTS idx_users_pagination_sort 
ON users_usr(usr_active, usr_last_name, usr_first_name, usr_id);

-- Index for team membership statistics
CREATE INDEX IF NOT EXISTS idx_teams_users_member_stats 
ON teams_tms_x_users_usr(usr_id) 
INCLUDE (tms_id, created_at);

-- Index for users without team memberships queries
CREATE INDEX IF NOT EXISTS idx_users_without_teams 
ON users_usr(usr_id, usr_active) 
WHERE usr_active = true 
AND NOT EXISTS (
    SELECT 1 FROM teams_tms_x_users_usr 
    WHERE teams_tms_x_users_usr.usr_id = users_usr.usr_id
);

-- Update table statistics for query planner optimization
ANALYZE users_usr;
ANALYZE roles_rls;
ANALYZE teams_tms_x_users_usr;
ANALYZE audit_log;

-- Add performance monitoring comments
COMMENT ON INDEX idx_users_usr_id_active IS 'Primary performance index for user ID lookups - US-082-C Users optimization';
COMMENT ON INDEX idx_users_code_active IS 'Performance index for username-based authentication - US-082-C Users optimization';
COMMENT ON INDEX idx_users_email_active IS 'Performance index for email-based user lookups - US-082-C Users optimization';
COMMENT ON INDEX idx_users_role_active IS 'Performance index for role-based queries and filtering - US-082-C Users optimization';
COMMENT ON INDEX idx_users_names_search IS 'Full-text search index for user name searches - US-082-C Users optimization';
COMMENT ON INDEX idx_audit_log_user_entity IS 'Performance index for user audit trail queries - US-082-C Users optimization';
COMMENT ON INDEX idx_audit_log_changed_by IS 'Performance index for "who changed what" audit queries - US-082-C Users optimization';
COMMENT ON INDEX idx_audit_log_user_activity IS 'Performance index for user activity tracking - US-082-C Users optimization';
COMMENT ON INDEX idx_audit_log_role_changes IS 'Performance index for role change audit queries - US-082-C Users optimization';
COMMENT ON INDEX idx_teams_users_reverse_lookup IS 'Performance index for user team membership queries - US-082-C Users optimization';
COMMENT ON INDEX idx_teams_users_cleanup IS 'Performance index for orphaned relationship cleanup - US-082-C Users optimization';
COMMENT ON INDEX idx_users_deactivation_tracking IS 'Performance index for user deactivation tracking - US-082-C Users optimization';
COMMENT ON INDEX idx_users_restoration_tracking IS 'Performance index for user restoration tracking - US-082-C Users optimization';
COMMENT ON INDEX idx_roles_hierarchy IS 'Performance index for role hierarchy queries - US-082-C Users optimization';
COMMENT ON INDEX idx_users_admin_active IS 'Partial index for admin user operations - US-082-C Users optimization';
COMMENT ON INDEX idx_users_pagination_sort IS 'Performance index for paginated user listings - US-082-C Users optimization';
COMMENT ON INDEX idx_teams_users_member_stats IS 'Performance index for team membership statistics - US-082-C Users optimization';
COMMENT ON INDEX idx_users_without_teams IS 'Partial index for users without team memberships - US-082-C Users optimization';

-- Performance verification queries (commented for reference)
/*
-- Verify performance improvements with EXPLAIN ANALYZE:

-- 1. User lookup by ID (should use idx_users_usr_id_active)
EXPLAIN ANALYZE SELECT * FROM users_usr WHERE usr_id = 123 AND usr_active = true;

-- 2. User search by name (should use idx_users_names_search)
EXPLAIN ANALYZE SELECT * FROM users_usr WHERE to_tsvector('english', usr_first_name || ' ' || usr_last_name) @@ to_tsquery('english', 'john');

-- 3. User activity query (should use idx_audit_log_user_activity)
EXPLAIN ANALYZE SELECT * FROM audit_log WHERE changed_by = '123' AND changed_at >= NOW() - INTERVAL '30 days' ORDER BY changed_at DESC;

-- 4. Team membership query (should use idx_teams_users_reverse_lookup)
EXPLAIN ANALYZE SELECT t.* FROM teams_tms t JOIN teams_tms_x_users_usr j ON t.tms_id = j.tms_id WHERE j.usr_id = 123 ORDER BY j.created_at DESC;

-- 5. Role-based filtering (should use idx_users_role_active)
EXPLAIN ANALYZE SELECT * FROM users_usr WHERE rls_id = 2 AND usr_active = true ORDER BY created_at DESC;
*/