--liquibase formatted sql
--changeset lucas.challamel:20250630-004-add-labels-and-step-label-join context:all
--comment: Create labels table (labels_lbl) and join table for labels and steps_master (labels_lbl_x_steps_master_stm)

-- Create labels table (labels_lbl)
CREATE TABLE labels_lbl (
    lbl_id SERIAL PRIMARY KEY,
    mig_id UUID NOT NULL REFERENCES migrations_mig(mig_id) ON DELETE CASCADE,
    lbl_name TEXT NOT NULL,
    lbl_description TEXT,
    lbl_color VARCHAR(7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    CONSTRAINT uq_labels_lbl_mig_id_lbl_name UNIQUE (mig_id, lbl_name)
);

-- Create join table for labels and steps_master (labels_lbl_x_steps_master_stm)
CREATE TABLE labels_lbl_x_steps_master_stm (
    lbl_x_stm_id SERIAL PRIMARY KEY,
    lbl_id INTEGER NOT NULL REFERENCES labels_lbl(lbl_id) ON DELETE CASCADE,
    stm_id UUID NOT NULL REFERENCES steps_master_stm(stm_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    CONSTRAINT uq_labels_lbl_x_steps_master_stm_lbl_id_stm_id UNIQUE (lbl_id, stm_id)
);

-- Add foreign key constraints with explicit names
ALTER TABLE labels_lbl_x_steps_master_stm
    ADD CONSTRAINT fk_lbl_x_stm_lbl_id FOREIGN KEY (lbl_id) REFERENCES labels_lbl(lbl_id) ON DELETE CASCADE;
ALTER TABLE labels_lbl_x_steps_master_stm
    ADD CONSTRAINT fk_lbl_x_stm_stm_id FOREIGN KEY (stm_id) REFERENCES steps_master_stm(stm_id) ON DELETE CASCADE;
