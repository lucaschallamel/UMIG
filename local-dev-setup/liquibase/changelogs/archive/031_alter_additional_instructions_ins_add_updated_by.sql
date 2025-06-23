-- liquibase formatted sql

-- changeset UMIG_MODEL_EXPANSION:add_updated_by_to_additional_instructions_ins
-- comment: Add updated_by field to additional_instructions_ins, referencing users_usr
ALTER TABLE additional_instructions_ais
ADD COLUMN updated_by INTEGER REFERENCES users_usr(id);
