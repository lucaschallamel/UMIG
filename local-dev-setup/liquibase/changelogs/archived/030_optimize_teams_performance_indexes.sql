-- Migration V1.47: Performance optimization indexes for Teams entity bidirectional queries
-- US-082-C: Entity Migration Standard - Performance Optimization
-- Created: 2025-09-12
-- Purpose: Optimize getTeamsForUser() and getUsersForTeam() performance from 639ms to <200ms

-- Index for efficient team membership lookups by user
CREATE INDEX IF NOT EXISTS idx_teams_users_usr_id_created 
ON teams_tms_x_users_usr(usr_id, created_at DESC);

-- Index for efficient user lookups by team
CREATE INDEX IF NOT EXISTS idx_teams_users_tms_id_created 
ON teams_tms_x_users_usr(tms_id, created_at ASC);

-- Composite index for role determination (created_by checks)
CREATE INDEX IF NOT EXISTS idx_teams_users_created_by 
ON teams_tms_x_users_usr(created_by, usr_id, tms_id);

-- Index for active user filtering
CREATE INDEX IF NOT EXISTS idx_users_active 
ON users_usr(usr_active) 
WHERE usr_active = true;

-- Composite index for team stats aggregation
CREATE INDEX IF NOT EXISTS idx_teams_users_stats 
ON teams_tms_x_users_usr(tms_id, created_at);

-- Analyze tables to update statistics for query planner
ANALYZE teams_tms;
ANALYZE users_usr;
ANALYZE teams_tms_x_users_usr;

-- Add comment documentation
COMMENT ON INDEX idx_teams_users_usr_id_created IS 'Performance index for getTeamsForUser() - US-082-C optimization';
COMMENT ON INDEX idx_teams_users_tms_id_created IS 'Performance index for getUsersForTeam() - US-082-C optimization';
COMMENT ON INDEX idx_teams_users_created_by IS 'Performance index for role determination in bidirectional queries';
COMMENT ON INDEX idx_users_active IS 'Partial index for efficient active user filtering';
COMMENT ON INDEX idx_teams_users_stats IS 'Performance index for team statistics aggregation';