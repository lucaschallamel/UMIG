-- liquibase formatted sql

-- changeset UMIG_MODEL_EXPANSION:add_dates_to_iterations_ite
-- comment: Add begindate and enddate to iterations_ite
ALTER TABLE iterations_ite
ADD COLUMN begindate TIMESTAMP,
ADD COLUMN enddate TIMESTAMP;
