--liquibase formatted sql

--changeset lucas.challamel:008_add_labels_controls_join_v1 context:all
--comment: Create join table for labels and controls_master (labels_lbl_x_controls_master_ctm).
CREATE TABLE labels_lbl_x_controls_master_ctm (
    lbl_x_ctm_id SERIAL PRIMARY KEY,
    lbl_id INTEGER NOT NULL REFERENCES labels_lbl(lbl_id) ON DELETE CASCADE,
    ctm_id UUID NOT NULL REFERENCES controls_master_ctm(ctm_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    CONSTRAINT uq_labels_lbl_x_controls_master_ctm_lbl_id_ctm_id UNIQUE (lbl_id, ctm_id)
);

ALTER TABLE labels_lbl_x_controls_master_ctm
    ADD CONSTRAINT fk_lbl_x_ctm_lbl_id FOREIGN KEY (lbl_id) REFERENCES labels_lbl(lbl_id) ON DELETE CASCADE;
ALTER TABLE labels_lbl_x_controls_master_ctm
    ADD CONSTRAINT fk_lbl_x_ctm_ctm_id FOREIGN KEY (ctm_id) REFERENCES controls_master_ctm(ctm_id) ON DELETE CASCADE;
