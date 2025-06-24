--liquibase formatted sql

-- changeset cline:iterations_tracking_itt-creation
CREATE TABLE IF NOT EXISTS public.iterations_tracking_itt
(
    id VARCHAR(10) NOT NULL,
    mig_code VARCHAR(10),
    ite_code VARCHAR(10),
    stp_start_date TIMESTAMP,
    stp_end_date TIMESTAMP,
    comments TEXT,
    cha_code VARCHAR,
    cha_name VARCHAR,
    stp_code VARCHAR,
    stp_name VARCHAR,
    usr_name VARCHAR,
    stp_status VARCHAR,
    CONSTRAINT iterations_tracking_itt_pkey PRIMARY KEY (id)
);

ALTER TABLE IF EXISTS public.iterations_tracking_itt
    OWNER TO umig_app_user;

GRANT ALL ON TABLE public.iterations_tracking_itt TO umig_app_user;
