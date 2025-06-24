--liquibase formatted sql
--changeset cascade:012_add_type_color_to_step_type_stt context:all
--comment: Add type_color column (hex color code) to step_type_stt for visual classification

ALTER TABLE step_type_stt ADD COLUMN type_color VARCHAR(7);
