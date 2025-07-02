--liquibase formatted sql

--changeset lucas.challamel:007_add_ctm_code_to_controls_v1 context:all
--comment: Add ctm_code to controls_master_ctm to serve as a unique business key.
ALTER TABLE public.controls_master_ctm
ADD COLUMN ctm_code VARCHAR(10) NOT NULL;

ALTER TABLE public.controls_master_ctm
ADD CONSTRAINT uq_ctm_code UNIQUE (ctm_code);
