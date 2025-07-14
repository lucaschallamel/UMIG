-- liquibase formatted sql

-- changeset lucas.challamel:011-add-usr-active-field
-- Add usr_active boolean field to users_usr table to track active/inactive status
-- Default value is TRUE (active) for all users

-- Add the usr_active column with NOT NULL constraint and default value TRUE
ALTER TABLE users_usr 
ADD COLUMN usr_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Add comment to document the field purpose
COMMENT ON COLUMN users_usr.usr_active IS 'Indicates whether the user account is active (TRUE) or inactive (FALSE). Default is active.';

-- Create index on usr_active for performance when filtering by status
CREATE INDEX idx_users_usr_active ON users_usr(usr_active);

-- Update existing users to be active (redundant due to default, but explicit for clarity)
UPDATE users_usr SET usr_active = TRUE WHERE usr_active IS NULL;

-- rollback ALTER TABLE users_usr DROP COLUMN usr_active;
-- rollback DROP INDEX IF EXISTS idx_users_usr_active;