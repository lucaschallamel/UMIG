-- liquibase formatted sql

-- changeset UMIG_MODEL_EXPANSION:add_comment_to_environments_applications_eap
-- comment: Add comment field to environments_applications_eap
ALTER TABLE environments_applications_eap
ADD COLUMN comment TEXT;
