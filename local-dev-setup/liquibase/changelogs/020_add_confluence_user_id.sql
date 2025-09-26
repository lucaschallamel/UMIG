--liquibase formatted sql

--changeset lucas.challamel:020_add_confluence_user_id
-- Add usr_confluence_user_id column to users_usr table for integration test compatibility

-- Add the column if it doesn't exist
ALTER TABLE users_usr 
ADD COLUMN IF NOT EXISTS usr_confluence_user_id VARCHAR(255);

-- Update existing records with a default value based on email
UPDATE users_usr 
SET usr_confluence_user_id = LOWER(REPLACE(usr_email, '@', '_at_'))
WHERE usr_confluence_user_id IS NULL;

--rollback ALTER TABLE users_usr DROP COLUMN IF EXISTS usr_confluence_user_id;