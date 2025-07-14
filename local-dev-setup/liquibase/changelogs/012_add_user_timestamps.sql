--liquibase formatted sql

--changeset lucas.challamel:012_add_user_timestamps context:all
--comment: Add created_at and updated_at timestamp fields to users_usr table

-- Add timestamp fields to users_usr table
ALTER TABLE users_usr 
ADD COLUMN created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- Update existing records to have timestamps
UPDATE users_usr 
SET created_at = CURRENT_TIMESTAMP, 
    updated_at = CURRENT_TIMESTAMP 
WHERE created_at IS NULL OR updated_at IS NULL;

-- Create trigger function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $func$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END
$func$ language 'plpgsql';

-- Create trigger to automatically update updated_at on any UPDATE
CREATE TRIGGER update_users_usr_updated_at
    BEFORE UPDATE ON users_usr
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

--rollback DROP TRIGGER IF EXISTS update_users_usr_updated_at ON users_usr;
--rollback DROP FUNCTION IF EXISTS update_updated_at_column();
--rollback ALTER TABLE users_usr DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_at;