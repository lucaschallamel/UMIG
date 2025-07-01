--liquibase formatted sql

--changeset cascade:005_add_labels_applications_join context:all
--comment: Add join table for associating labels with applications (labels_lbl_x_applications_app)

CREATE TABLE labels_lbl_x_applications_app (
    lbl_x_app_id SERIAL PRIMARY KEY,
    lbl_id INTEGER NOT NULL,
    app_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by VARCHAR(64),
    CONSTRAINT uq_lbl_x_app UNIQUE (lbl_id, app_id),
    CONSTRAINT fk_lbl_x_app_lbl_id FOREIGN KEY (lbl_id) REFERENCES labels_lbl(lbl_id) ON DELETE CASCADE,
    CONSTRAINT fk_lbl_x_app_app_id FOREIGN KEY (app_id) REFERENCES applications_app(app_id) ON DELETE CASCADE
);

COMMENT ON TABLE labels_lbl_x_applications_app IS 'Join table linking labels to applications for flexible categorization.';
COMMENT ON COLUMN labels_lbl_x_applications_app.lbl_id IS 'References labels_lbl (label definition).';
COMMENT ON COLUMN labels_lbl_x_applications_app.app_id IS 'References applications_app (application).';
COMMENT ON COLUMN labels_lbl_x_applications_app.created_by IS 'User or process that created the association.';
