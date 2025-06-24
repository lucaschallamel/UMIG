--liquibase formatted sql
--changeset cascade:011_refactor_status_sts context:all
--comment: Refactor status_sts to support entity-specific statuses and prepopulate combinations

-- 1. Rename sts_code to entity_type
ALTER TABLE status_sts RENAME COLUMN sts_code TO entity_type;

-- 2. Prepopulate entity_type/sta_name combinations
INSERT INTO status_sts (entity_type, sts_name, sts_description) VALUES
  -- MIGRATION
  ('MIGRATION', 'NEW', ''),
  ('MIGRATION', 'IN PROGRESS', ''),
  ('MIGRATION', 'DONE', ''),
  ('MIGRATION', 'CANCELLED', ''),
  -- ITERATION
  ('ITERATION', 'NEW', ''),
  ('ITERATION', 'IN PROGRESS', ''),
  ('ITERATION', 'DONE', ''),
  ('ITERATION', 'CANCELLED', ''),
  -- SEQUENCE
  ('SEQUENCE', 'NEW', ''),
  ('SEQUENCE', 'IN PROGRESS', ''),
  ('SEQUENCE', 'DONE', ''),
  -- CHAPTER
  ('CHAPTER', 'NEW', ''),
  ('CHAPTER', 'IN PROGRESS', ''),
  ('CHAPTER', 'DONE', ''),
  -- STEP
  ('STEP', 'NEW', ''),
  ('STEP', 'IN PROGRESS', ''),
  ('STEP', 'DONE', ''),
  ('STEP', 'CANCELLED', ''),
  ('STEP', 'DEFERRED', ''),
  -- INSTRUCTION
  ('INSTRUCTION', 'NEW', ''),
  ('INSTRUCTION', 'IN PROGRESS', ''),
  ('INSTRUCTION', 'DONE', ''),
  ('INSTRUCTION', 'CANCELLED', ''),
  -- CONTROL
  ('CONTROL', 'NEW', ''),
  ('CONTROL', 'PRODUCED', ''),
  ('CONTROL', 'IT VALIDATED', ''),
  ('CONTROL', 'BIZ VALIDATED', ''),
  ('CONTROL', 'PASSED', ''),
  ('CONTROL', 'FAILED', ''),
  ('CONTROL', 'CANCELLED', '');
