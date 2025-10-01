--
-- PostgreSQL database dump
--

\restrict FpZ1h8lnS4WxaqdLqaqHpALnqpqACGtOP7asEGOgK4UIxkkp2fvJI6UG3jLhebL

-- Dumped from database version 14.18
-- Dumped by pg_dump version 16.10 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: get_user_code(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_code(email_input character varying) RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    user_code VARCHAR;
BEGIN
    SELECT usr_code INTO user_code
    FROM users_usr
    WHERE usr_email = email_input;
    
    RETURN COALESCE(user_code, 'system');
END;
$$;


--
-- Name: FUNCTION get_user_code(email_input character varying); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_code(email_input character varying) IS 'Helper function to retrieve user trigram (usr_code) from email for audit fields';


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: applications_app; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.applications_app (
    app_id integer NOT NULL,
    app_code character varying(50) NOT NULL,
    app_name character varying(64),
    app_description text,
    created_by character varying(255) DEFAULT 'system'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by character varying(255) DEFAULT 'system'::character varying,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: applications_app_app_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.applications_app_app_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: applications_app_app_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.applications_app_app_id_seq OWNED BY public.applications_app.app_id;


--
-- Name: audit_log_aud; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_aud (
    aud_id bigint NOT NULL,
    aud_timestamp timestamp with time zone DEFAULT now() NOT NULL,
    usr_id integer,
    aud_action character varying(255) NOT NULL,
    aud_entity_type character varying(50) NOT NULL,
    aud_entity_id uuid NOT NULL,
    aud_details jsonb
);


--
-- Name: TABLE audit_log_aud; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.audit_log_aud IS 'Logs all major events like status changes, assignments, and comments for full traceability.';


--
-- Name: COLUMN audit_log_aud.aud_details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_log_aud.aud_details IS 'Stores JSON data capturing the state change, e.g., { "from_status": "PENDING", "to_status": "IN_PROGRESS" }.';


--
-- Name: audit_log_aud_aud_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_log_aud_aud_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_log_aud_aud_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_log_aud_aud_id_seq OWNED BY public.audit_log_aud.aud_id;


--
-- Name: controls_instance_cti; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.controls_instance_cti (
    cti_id uuid DEFAULT gen_random_uuid() NOT NULL,
    phi_id uuid NOT NULL,
    ctm_id uuid NOT NULL,
    cti_validated_at timestamp with time zone,
    usr_id_it_validator integer,
    usr_id_biz_validator integer,
    cti_order integer,
    cti_name character varying(255),
    cti_description text,
    cti_type character varying(64),
    cti_is_critical boolean,
    cti_code text,
    created_by character varying(255) DEFAULT 'system'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by character varying(255) DEFAULT 'system'::character varying,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    cti_status integer NOT NULL
);


--
-- Name: TABLE controls_instance_cti; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.controls_instance_cti IS 'Control instances linked to phase instances per ADR-016 - controls are phase-level quality gates';


--
-- Name: COLUMN controls_instance_cti.phi_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.controls_instance_cti.phi_id IS 'Reference to the phase instance this control point belongs to';


--
-- Name: COLUMN controls_instance_cti.cti_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.controls_instance_cti.cti_order IS 'Override order for the control instance (copied from master by default)';


--
-- Name: COLUMN controls_instance_cti.cti_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.controls_instance_cti.cti_name IS 'Override name for the control instance (copied from master by default)';


--
-- Name: COLUMN controls_instance_cti.cti_description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.controls_instance_cti.cti_description IS 'Override description for the control instance (copied from master by default)';


--
-- Name: COLUMN controls_instance_cti.cti_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.controls_instance_cti.cti_type IS 'Override type for the control instance (copied from master by default)';


--
-- Name: COLUMN controls_instance_cti.cti_is_critical; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.controls_instance_cti.cti_is_critical IS 'Override criticality for the control instance (copied from master by default)';


--
-- Name: COLUMN controls_instance_cti.cti_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.controls_instance_cti.cti_code IS 'Override code for the control instance (copied from master by default)';


--
-- Name: COLUMN controls_instance_cti.cti_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.controls_instance_cti.cti_status IS 'Status ID referencing status_sts table (normalized from VARCHAR)';


--
-- Name: controls_master_ctm; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.controls_master_ctm (
    ctm_id uuid DEFAULT gen_random_uuid() NOT NULL,
    phm_id uuid NOT NULL,
    ctm_order integer NOT NULL,
    ctm_name character varying(255) NOT NULL,
    ctm_description text,
    ctm_type character varying(50) NOT NULL,
    ctm_is_critical boolean DEFAULT false,
    ctm_code character varying(10) NOT NULL,
    created_by character varying(255) DEFAULT 'system'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by character varying(255) DEFAULT 'system'::character varying,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: databasechangelog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.databasechangelog (
    id character varying(255) NOT NULL,
    author character varying(255) NOT NULL,
    filename character varying(255) NOT NULL,
    dateexecuted timestamp without time zone NOT NULL,
    orderexecuted integer NOT NULL,
    exectype character varying(10) NOT NULL,
    md5sum character varying(35),
    description character varying(255),
    comments character varying(255),
    tag character varying(255),
    liquibase character varying(20),
    contexts character varying(255),
    labels character varying(255),
    deployment_id character varying(10)
);


--
-- Name: databasechangeloglock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.databasechangeloglock (
    id integer NOT NULL,
    locked boolean NOT NULL,
    lockgranted timestamp without time zone,
    lockedby character varying(255)
);


--
-- Name: email_templates_emt; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_templates_emt (
    emt_id uuid DEFAULT gen_random_uuid() NOT NULL,
    emt_name character varying(255) NOT NULL,
    emt_subject text NOT NULL,
    emt_body_html text NOT NULL,
    emt_body_text text,
    emt_type character varying(50) NOT NULL,
    emt_is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by character varying(255),
    updated_by character varying(255),
    CONSTRAINT email_templates_emt_emt_type_check CHECK (((emt_type)::text = ANY (ARRAY[('STEP_OPENED'::character varying)::text, ('INSTRUCTION_COMPLETED'::character varying)::text, ('INSTRUCTION_UNCOMPLETED'::character varying)::text, ('STEP_STATUS_CHANGED'::character varying)::text, ('STEP_NOTIFICATION_MOBILE'::character varying)::text, ('STEP_STATUS_CHANGED_WITH_URL'::character varying)::text, ('STEP_OPENED_WITH_URL'::character varying)::text, ('INSTRUCTION_COMPLETED_WITH_URL'::character varying)::text, ('BULK_STEP_STATUS_CHANGED'::character varying)::text, ('ITERATION_EVENT'::character varying)::text, ('CUSTOM'::character varying)::text])))
);


--
-- Name: TABLE email_templates_emt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.email_templates_emt IS 'Stores HTML email templates for various notification types in UMIG';


--
-- Name: COLUMN email_templates_emt.emt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.email_templates_emt.emt_id IS 'Unique identifier for the email template';


--
-- Name: COLUMN email_templates_emt.emt_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.email_templates_emt.emt_name IS 'Human-readable name for the template (must be unique)';


--
-- Name: COLUMN email_templates_emt.emt_subject; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.email_templates_emt.emt_subject IS 'Email subject line with optional placeholders';


--
-- Name: COLUMN email_templates_emt.emt_body_html; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.email_templates_emt.emt_body_html IS 'HTML body content with Groovy GString placeholders';


--
-- Name: COLUMN email_templates_emt.emt_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.email_templates_emt.emt_type IS 'Type of notification this template is for (STEP_OPENED, INSTRUCTION_COMPLETED, INSTRUCTION_UNCOMPLETED, STEP_STATUS_CHANGED, CUSTOM)';


--
-- Name: COLUMN email_templates_emt.emt_is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.email_templates_emt.emt_is_active IS 'Whether this template is currently active';


--
-- Name: environment_roles_enr; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.environment_roles_enr (
    enr_id integer NOT NULL,
    enr_name character varying(50) NOT NULL,
    enr_description text,
    created_by character varying(255) DEFAULT 'system'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by character varying(255) DEFAULT 'system'::character varying,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: environment_roles_enr_enr_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.environment_roles_enr_enr_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: environment_roles_enr_enr_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.environment_roles_enr_enr_id_seq OWNED BY public.environment_roles_enr.enr_id;


--
-- Name: environments_env; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.environments_env (
    env_id integer NOT NULL,
    env_code character varying(10),
    env_name character varying(64),
    env_description text,
    created_by character varying(255) DEFAULT 'system'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by character varying(255) DEFAULT 'system'::character varying,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: environments_env_env_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.environments_env_env_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: environments_env_env_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.environments_env_env_id_seq OWNED BY public.environments_env.env_id;


--
-- Name: environments_env_x_applications_app; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.environments_env_x_applications_app (
    env_id integer NOT NULL,
    app_id integer NOT NULL
);


--
-- Name: environments_env_x_iterations_ite; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.environments_env_x_iterations_ite (
    env_id integer NOT NULL,
    ite_id uuid NOT NULL,
    enr_id integer NOT NULL
);


--
-- Name: import_batches_imb; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_batches_imb (
    imb_id uuid DEFAULT gen_random_uuid() NOT NULL,
    imb_source character varying(255) NOT NULL,
    imb_type character varying(50) DEFAULT 'JSON_IMPORT'::character varying,
    imb_status character varying(50) DEFAULT 'IN_PROGRESS'::character varying,
    imb_user_id character varying(255),
    imb_start_time timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    imb_end_time timestamp with time zone,
    imb_statistics jsonb,
    imb_error_message text,
    imb_created_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    imb_last_modified_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    imb_is_active boolean DEFAULT true,
    ior_id uuid,
    imb_entity_type character varying(50)
);


--
-- Name: TABLE import_batches_imb; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.import_batches_imb IS 'Tracks import operations for audit trail and rollback capability';


--
-- Name: COLUMN import_batches_imb.imb_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_batches_imb.imb_id IS 'Unique identifier for the import batch';


--
-- Name: COLUMN import_batches_imb.imb_source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_batches_imb.imb_source IS 'Source of the import (filename, API, etc.)';


--
-- Name: COLUMN import_batches_imb.imb_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_batches_imb.imb_type IS 'Type of import (JSON_IMPORT, CSV_IMPORT, etc.)';


--
-- Name: COLUMN import_batches_imb.imb_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_batches_imb.imb_status IS 'Status: IN_PROGRESS, COMPLETED, FAILED, ROLLED_BACK';


--
-- Name: COLUMN import_batches_imb.imb_statistics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_batches_imb.imb_statistics IS 'JSON statistics about the import (counts, etc.)';


--
-- Name: instructions_instance_ini; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.instructions_instance_ini (
    ini_id uuid DEFAULT gen_random_uuid() NOT NULL,
    sti_id uuid NOT NULL,
    inm_id uuid NOT NULL,
    ini_is_completed boolean DEFAULT false,
    ini_completed_at timestamp with time zone,
    usr_id_completed_by integer,
    tms_id integer,
    cti_id uuid,
    ini_order integer,
    ini_body text,
    ini_duration_minutes integer,
    created_by character varying(255) DEFAULT 'system'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by character varying(255) DEFAULT 'system'::character varying,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: COLUMN instructions_instance_ini.tms_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instructions_instance_ini.tms_id IS 'Override template step ID for the instruction instance (copied from master by default)';


--
-- Name: COLUMN instructions_instance_ini.cti_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instructions_instance_ini.cti_id IS 'Override custom template ID for the instruction instance (copied from master by default)';


--
-- Name: COLUMN instructions_instance_ini.ini_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instructions_instance_ini.ini_order IS 'Override order for the instruction instance (copied from master by default)';


--
-- Name: COLUMN instructions_instance_ini.ini_body; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instructions_instance_ini.ini_body IS 'Override body for the instruction instance (copied from master by default)';


--
-- Name: COLUMN instructions_instance_ini.ini_duration_minutes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instructions_instance_ini.ini_duration_minutes IS 'Override duration for the instruction instance (copied from master by default)';


--
-- Name: instructions_master_inm; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.instructions_master_inm (
    inm_id uuid DEFAULT gen_random_uuid() NOT NULL,
    stm_id uuid NOT NULL,
    tms_id integer,
    ctm_id uuid,
    inm_order integer NOT NULL,
    inm_body text,
    inm_duration_minutes integer,
    created_by character varying(255) DEFAULT 'system'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by character varying(255) DEFAULT 'system'::character varying,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: iteration_types_itt; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.iteration_types_itt (
    itt_code character varying(10) NOT NULL,
    itt_name character varying(100) NOT NULL,
    created_by character varying(255) DEFAULT 'system'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by character varying(255) DEFAULT 'system'::character varying,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    itt_description text,
    itt_color character varying(10) DEFAULT '#6B73FF'::character varying,
    itt_icon character varying(50) DEFAULT 'play-circle'::character varying,
    itt_display_order integer DEFAULT 0,
    itt_active boolean DEFAULT true
);


--
-- Name: iterations_ite; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.iterations_ite (
    ite_id uuid DEFAULT gen_random_uuid() NOT NULL,
    mig_id uuid NOT NULL,
    plm_id uuid NOT NULL,
    itt_code character varying(10) NOT NULL,
    ite_name character varying(255) NOT NULL,
    ite_description text,
    ite_static_cutover_date timestamp with time zone,
    ite_dynamic_cutover_date timestamp with time zone,
    created_by character varying(255) DEFAULT 'system'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by character varying(255) DEFAULT 'system'::character varying,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    ite_status integer NOT NULL
);


--
-- Name: COLUMN iterations_ite.ite_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.iterations_ite.ite_status IS 'Status ID referencing status_sts table (normalized from VARCHAR)';


--
-- Name: labels_lbl; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.labels_lbl (
    lbl_id integer NOT NULL,
    mig_id uuid NOT NULL,
    lbl_name text NOT NULL,
    lbl_description text,
    lbl_color character varying(7),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by character varying(255) DEFAULT 'system'::character varying,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255) DEFAULT 'system'::character varying
);


--
-- Name: COLUMN labels_lbl.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.labels_lbl.created_at IS 'Timestamp when record was created';


--
-- Name: COLUMN labels_lbl.updated_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.labels_lbl.updated_by IS 'User trigram (usr_code) who last updated the record';


--
-- Name: COLUMN labels_lbl.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.labels_lbl.updated_at IS 'Timestamp when record was last updated';


--
-- Name: COLUMN labels_lbl.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.labels_lbl.created_by IS 'User trigram (usr_code) or system/generator/migration identifier';


--
-- Name: labels_lbl_lbl_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.labels_lbl_lbl_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: labels_lbl_lbl_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.labels_lbl_lbl_id_seq OWNED BY public.labels_lbl.lbl_id;


--
-- Name: labels_lbl_x_applications_app; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.labels_lbl_x_applications_app (
    lbl_x_app_id integer NOT NULL,
    lbl_id integer NOT NULL,
    app_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by character varying(255) DEFAULT 'system'::character varying
);


--
-- Name: TABLE labels_lbl_x_applications_app; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.labels_lbl_x_applications_app IS 'TIER 2 ASSOCIATION: Label-Application associations with minimal audit';


--
-- Name: COLUMN labels_lbl_x_applications_app.lbl_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.labels_lbl_x_applications_app.lbl_id IS 'References labels_lbl (label definition).';


--
-- Name: COLUMN labels_lbl_x_applications_app.app_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.labels_lbl_x_applications_app.app_id IS 'References applications_app (application).';


--
-- Name: labels_lbl_x_applications_app_lbl_x_app_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.labels_lbl_x_applications_app_lbl_x_app_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: labels_lbl_x_applications_app_lbl_x_app_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.labels_lbl_x_applications_app_lbl_x_app_id_seq OWNED BY public.labels_lbl_x_applications_app.lbl_x_app_id;


--
-- Name: labels_lbl_x_controls_master_ctm; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.labels_lbl_x_controls_master_ctm (
    lbl_x_ctm_id integer NOT NULL,
    lbl_id integer NOT NULL,
    ctm_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255) DEFAULT 'system'::character varying
);


--
-- Name: TABLE labels_lbl_x_controls_master_ctm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.labels_lbl_x_controls_master_ctm IS 'TIER 2 ASSOCIATION: Label-Control associations with minimal audit';


--
-- Name: COLUMN labels_lbl_x_controls_master_ctm.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.labels_lbl_x_controls_master_ctm.created_by IS 'User trigram (usr_code) or system/generator/migration identifier';


--
-- Name: labels_lbl_x_controls_master_ctm_lbl_x_ctm_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.labels_lbl_x_controls_master_ctm_lbl_x_ctm_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: labels_lbl_x_controls_master_ctm_lbl_x_ctm_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.labels_lbl_x_controls_master_ctm_lbl_x_ctm_id_seq OWNED BY public.labels_lbl_x_controls_master_ctm.lbl_x_ctm_id;


--
-- Name: labels_lbl_x_steps_master_stm; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.labels_lbl_x_steps_master_stm (
    lbl_x_stm_id integer NOT NULL,
    lbl_id integer NOT NULL,
    stm_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255) DEFAULT 'system'::character varying
);


--
-- Name: TABLE labels_lbl_x_steps_master_stm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.labels_lbl_x_steps_master_stm IS 'TIER 2 ASSOCIATION: Label-Step associations with minimal audit (created_at, created_by for legacy support)';


--
-- Name: labels_lbl_x_steps_master_stm_lbl_x_stm_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.labels_lbl_x_steps_master_stm_lbl_x_stm_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: labels_lbl_x_steps_master_stm_lbl_x_stm_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.labels_lbl_x_steps_master_stm_lbl_x_stm_id_seq OWNED BY public.labels_lbl_x_steps_master_stm.lbl_x_stm_id;


--
-- Name: migration_types_mit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migration_types_mit (
    mit_id integer NOT NULL,
    mit_code character varying(20) NOT NULL,
    mit_name character varying(100) NOT NULL,
    mit_description text,
    mit_color character varying(10) DEFAULT '#6B73FF'::character varying,
    mit_icon character varying(50) DEFAULT 'layers'::character varying,
    mit_display_order integer DEFAULT 0,
    mit_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255),
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by character varying(255)
);


--
-- Name: TABLE migration_types_mit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.migration_types_mit IS 'US-042: Master configuration table for release types. Defines available release type templates with visual and management properties.';


--
-- Name: COLUMN migration_types_mit.mit_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.migration_types_mit.mit_id IS 'Primary key - auto-incrementing ID';


--
-- Name: COLUMN migration_types_mit.mit_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.migration_types_mit.mit_code IS 'Unique business code for migration type (e.g., INFRA, APP, DATA)';


--
-- Name: COLUMN migration_types_mit.mit_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.migration_types_mit.mit_name IS 'Human-readable name for migration type';


--
-- Name: COLUMN migration_types_mit.mit_description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.migration_types_mit.mit_description IS 'Detailed description of migration type purpose and usage';


--
-- Name: COLUMN migration_types_mit.mit_color; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.migration_types_mit.mit_color IS 'Hex color code for UI representation (#RRGGBB format)';


--
-- Name: COLUMN migration_types_mit.mit_icon; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.migration_types_mit.mit_icon IS 'Icon identifier for UI representation (Font Awesome style)';


--
-- Name: COLUMN migration_types_mit.mit_display_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.migration_types_mit.mit_display_order IS 'Sort order for UI display (lower numbers first)';


--
-- Name: COLUMN migration_types_mit.mit_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.migration_types_mit.mit_active IS 'Whether this migration type is available for selection';


--
-- Name: migration_types_mit_mit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migration_types_mit_mit_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: migration_types_mit_mit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migration_types_mit_mit_id_seq OWNED BY public.migration_types_mit.mit_id;


--
-- Name: migrations_mig; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migrations_mig (
    mig_id uuid DEFAULT gen_random_uuid() NOT NULL,
    usr_id_owner integer NOT NULL,
    mig_name character varying(255) NOT NULL,
    mig_description text,
    mig_type character varying(50) NOT NULL,
    mig_start_date date,
    mig_end_date date,
    mig_business_cutover_date date,
    created_by character varying(255) DEFAULT 'system'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by character varying(255) DEFAULT 'system'::character varying,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    mig_status integer NOT NULL
);


--
-- Name: COLUMN migrations_mig.mig_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.migrations_mig.mig_status IS 'Status ID referencing status_sts table (normalized from VARCHAR)';


--
-- Name: phases_instance_phi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.phases_instance_phi (
    phi_id uuid DEFAULT gen_random_uuid() NOT NULL,
    sqi_id uuid NOT NULL,
    phm_id uuid NOT NULL,
    phi_start_time timestamp with time zone,
    phi_end_time timestamp with time zone,
    phi_order integer,
    phi_name character varying(255),
    phi_description text,
    predecessor_phi_id uuid,
    created_by character varying(255) DEFAULT 'system'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by character varying(255) DEFAULT 'system'::character varying,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    phi_status integer NOT NULL
);


--
-- Name: COLUMN phases_instance_phi.phi_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.phases_instance_phi.phi_order IS 'Override order for the phase instance (copied from master by default)';


--
-- Name: COLUMN phases_instance_phi.phi_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.phases_instance_phi.phi_name IS 'Override name for the phase instance (copied from master by default)';


--
-- Name: COLUMN phases_instance_phi.phi_description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.phases_instance_phi.phi_description IS 'Override description for the phase instance (copied from master by default)';


--
-- Name: COLUMN phases_instance_phi.predecessor_phi_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.phases_instance_phi.predecessor_phi_id IS 'Override predecessor phase master ID for the instance (copied from master by default)';


--
-- Name: COLUMN phases_instance_phi.phi_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.phases_instance_phi.phi_status IS 'Status ID referencing status_sts table (normalized from VARCHAR)';


--
-- Name: phases_master_phm; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.phases_master_phm (
    phm_id uuid DEFAULT gen_random_uuid() NOT NULL,
    sqm_id uuid NOT NULL,
    phm_order integer NOT NULL,
    phm_name character varying(255) NOT NULL,
    phm_description text,
    predecessor_phm_id uuid,
    created_by character varying(255) DEFAULT 'system'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by character varying(255) DEFAULT 'system'::character varying,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: plans_instance_pli; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plans_instance_pli (
    pli_id uuid DEFAULT gen_random_uuid() NOT NULL,
    plm_id uuid NOT NULL,
    ite_id uuid NOT NULL,
    pli_name character varying(255) NOT NULL,
    pli_description text,
    usr_id_owner integer NOT NULL,
    created_by character varying(255) DEFAULT 'system'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by character varying(255) DEFAULT 'system'::character varying,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    pli_status integer NOT NULL
);


--
-- Name: COLUMN plans_instance_pli.pli_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plans_instance_pli.pli_status IS 'Status ID referencing status_sts table (normalized from VARCHAR)';


--
-- Name: plans_master_plm; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plans_master_plm (
    plm_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tms_id integer NOT NULL,
    plm_name character varying(255) NOT NULL,
    plm_description text,
    created_by character varying(255) DEFAULT 'system'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by character varying(255) DEFAULT 'system'::character varying,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    plm_status integer NOT NULL
);


--
-- Name: COLUMN plans_master_plm.plm_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plans_master_plm.plm_status IS 'Status ID referencing status_sts table (normalized from VARCHAR)';


--
-- Name: roles_rls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles_rls (
    rls_id integer NOT NULL,
    rls_code character varying(10),
    rls_description text,
    created_by character varying(255) DEFAULT 'system'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by character varying(255) DEFAULT 'system'::character varying,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: roles_rls_rls_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_rls_rls_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_rls_rls_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_rls_rls_id_seq OWNED BY public.roles_rls.rls_id;


--
-- Name: sequences_instance_sqi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sequences_instance_sqi (
    sqi_id uuid DEFAULT gen_random_uuid() NOT NULL,
    pli_id uuid NOT NULL,
    sqm_id uuid NOT NULL,
    sqi_start_time timestamp with time zone,
    sqi_end_time timestamp with time zone,
    sqi_name character varying(255),
    sqi_description text,
    sqi_order integer,
    predecessor_sqi_id uuid,
    created_by character varying(255) DEFAULT 'system'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by character varying(255) DEFAULT 'system'::character varying,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    sqi_status integer NOT NULL
);


--
-- Name: COLUMN sequences_instance_sqi.sqi_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sequences_instance_sqi.sqi_name IS 'Override name for the sequence instance (copied from master by default)';


--
-- Name: COLUMN sequences_instance_sqi.sqi_description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sequences_instance_sqi.sqi_description IS 'Override description for the sequence instance (copied from master by default)';


--
-- Name: COLUMN sequences_instance_sqi.sqi_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sequences_instance_sqi.sqi_order IS 'Override order for the sequence instance (copied from master by default)';


--
-- Name: COLUMN sequences_instance_sqi.predecessor_sqi_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sequences_instance_sqi.predecessor_sqi_id IS 'Override predecessor sequence master ID for the instance (copied from master by default)';


--
-- Name: COLUMN sequences_instance_sqi.sqi_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sequences_instance_sqi.sqi_status IS 'Status ID referencing status_sts table (normalized from VARCHAR)';


--
-- Name: sequences_master_sqm; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sequences_master_sqm (
    sqm_id uuid DEFAULT gen_random_uuid() NOT NULL,
    plm_id uuid NOT NULL,
    sqm_order integer NOT NULL,
    sqm_name character varying(255) NOT NULL,
    sqm_description text,
    predecessor_sqm_id uuid,
    created_by character varying(255) DEFAULT 'system'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by character varying(255) DEFAULT 'system'::character varying,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: status_sts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.status_sts (
    sts_id integer NOT NULL,
    sts_name character varying(50) NOT NULL,
    sts_color character varying(7) NOT NULL,
    sts_type character varying(20) NOT NULL,
    created_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(100) DEFAULT 'system'::character varying,
    updated_by character varying(100) DEFAULT 'system'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_status_sts_color CHECK (((sts_color)::text ~ '^#[0-9A-Fa-f]{6}$'::text)),
    CONSTRAINT ck_status_sts_type CHECK (((sts_type)::text = ANY ((ARRAY['Migration'::character varying, 'Iteration'::character varying, 'Plan'::character varying, 'Sequence'::character varying, 'Phase'::character varying, 'Step'::character varying, 'Control'::character varying])::text[])))
);


--
-- Name: TABLE status_sts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.status_sts IS 'Centralized status management for all entity types with color coding';


--
-- Name: COLUMN status_sts.sts_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.status_sts.sts_id IS 'Primary key for status records';


--
-- Name: COLUMN status_sts.sts_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.status_sts.sts_name IS 'Status name (e.g., PENDING, IN_PROGRESS, COMPLETED)';


--
-- Name: COLUMN status_sts.sts_color; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.status_sts.sts_color IS 'Hex color code for UI display (#RRGGBB format)';


--
-- Name: COLUMN status_sts.sts_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.status_sts.sts_type IS 'Entity type this status applies to (Migration, Plan, Step, etc.)';


--
-- Name: status_sts_sts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.status_sts_sts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: status_sts_sts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.status_sts_sts_id_seq OWNED BY public.status_sts.sts_id;


--
-- Name: step_instance_comments_sic; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.step_instance_comments_sic (
    sic_id integer NOT NULL,
    sti_id uuid NOT NULL,
    comment_body text NOT NULL,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by integer,
    updated_at timestamp without time zone
);


--
-- Name: step_instance_comments_sic_sic_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.step_instance_comments_sic_sic_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: step_instance_comments_sic_sic_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.step_instance_comments_sic_sic_id_seq OWNED BY public.step_instance_comments_sic.sic_id;


--
-- Name: step_pilot_comments_spc; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.step_pilot_comments_spc (
    spc_id integer NOT NULL,
    stm_id uuid NOT NULL,
    comment_body text NOT NULL,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by integer,
    updated_at timestamp without time zone,
    visibility character varying(30) DEFAULT 'pilot'::character varying
);


--
-- Name: step_pilot_comments_spc_spc_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.step_pilot_comments_spc_spc_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: step_pilot_comments_spc_spc_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.step_pilot_comments_spc_spc_id_seq OWNED BY public.step_pilot_comments_spc.spc_id;


--
-- Name: step_types_stt; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.step_types_stt (
    stt_code character varying(3) NOT NULL,
    stt_name character varying(100) NOT NULL,
    stt_color character varying(7) NOT NULL,
    created_by character varying(255) DEFAULT 'system'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by character varying(255) DEFAULT 'system'::character varying,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: steps_instance_sti; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.steps_instance_sti (
    sti_id uuid DEFAULT gen_random_uuid() NOT NULL,
    phi_id uuid NOT NULL,
    stm_id uuid NOT NULL,
    sti_start_time timestamp with time zone,
    sti_end_time timestamp with time zone,
    sti_id_predecessor uuid,
    sti_name character varying(255),
    sti_description text,
    sti_duration_minutes integer,
    enr_id integer,
    created_by character varying(255) DEFAULT 'system'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by character varying(255) DEFAULT 'system'::character varying,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    sti_status integer NOT NULL
);


--
-- Name: COLUMN steps_instance_sti.sti_id_predecessor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.steps_instance_sti.sti_id_predecessor IS 'Override predecessor step master ID for the instance (copied from master by default)';


--
-- Name: COLUMN steps_instance_sti.sti_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.steps_instance_sti.sti_name IS 'Override name for the step instance (copied from master by default)';


--
-- Name: COLUMN steps_instance_sti.sti_description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.steps_instance_sti.sti_description IS 'Override description for the step instance (copied from master by default)';


--
-- Name: COLUMN steps_instance_sti.sti_duration_minutes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.steps_instance_sti.sti_duration_minutes IS 'Override duration for the step instance (copied from master by default)';


--
-- Name: COLUMN steps_instance_sti.sti_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.steps_instance_sti.sti_status IS 'Status ID referencing status_sts table (normalized from VARCHAR)';


--
-- Name: steps_master_stm; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.steps_master_stm (
    stm_id uuid DEFAULT gen_random_uuid() NOT NULL,
    phm_id uuid NOT NULL,
    tms_id_owner integer NOT NULL,
    stt_code character varying(3) NOT NULL,
    stm_number integer NOT NULL,
    stm_id_predecessor uuid,
    enr_id_target integer NOT NULL,
    stm_name character varying(255) NOT NULL,
    stm_description text,
    stm_duration_minutes integer,
    enr_id integer,
    created_by character varying(255) DEFAULT 'system'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by character varying(255) DEFAULT 'system'::character varying,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: steps_master_stm_x_iteration_types_itt; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.steps_master_stm_x_iteration_types_itt (
    stm_id uuid NOT NULL,
    itt_code character varying(10) NOT NULL
);


--
-- Name: steps_master_stm_x_teams_tms_impacted; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.steps_master_stm_x_teams_tms_impacted (
    stm_id uuid NOT NULL,
    tms_id integer NOT NULL
);


--
-- Name: stg_import_entity_dependencies_ied; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stg_import_entity_dependencies_ied (
    ied_id integer NOT NULL,
    ied_entity_type character varying(50) NOT NULL,
    ied_depends_on character varying(50),
    ied_import_order integer NOT NULL,
    ied_is_required boolean DEFAULT true,
    ied_validation_query text,
    ied_rollback_query text,
    ied_created_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    ied_is_active boolean DEFAULT true
);


--
-- Name: TABLE stg_import_entity_dependencies_ied; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stg_import_entity_dependencies_ied IS 'US-034: Manages entity import dependencies and validation for proper sequencing';


--
-- Name: stg_import_entity_dependencies_ied_ied_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stg_import_entity_dependencies_ied_ied_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stg_import_entity_dependencies_ied_ied_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stg_import_entity_dependencies_ied_ied_id_seq OWNED BY public.stg_import_entity_dependencies_ied.ied_id;


--
-- Name: stg_import_orchestrations_ior; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stg_import_orchestrations_ior (
    ior_id uuid DEFAULT gen_random_uuid() NOT NULL,
    ior_status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    ior_started timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ior_completed timestamp with time zone,
    ior_user_id character varying(100) NOT NULL,
    ior_phase_count integer DEFAULT 5,
    ior_success_count integer DEFAULT 0,
    ior_error_count integer DEFAULT 0,
    ior_phase_details jsonb,
    ior_configuration jsonb,
    ior_statistics jsonb,
    ior_error_details jsonb,
    ior_rollback_reason character varying(500),
    ior_last_update timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    ior_created_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    ior_is_active boolean DEFAULT true
);


--
-- Name: TABLE stg_import_orchestrations_ior; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stg_import_orchestrations_ior IS 'US-034: Tracks complete import orchestration workflows with phase management and progress tracking';


--
-- Name: stg_import_progress_tracking_ipt; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stg_import_progress_tracking_ipt (
    ipt_id integer NOT NULL,
    ior_id uuid NOT NULL,
    ipt_phase_name character varying(50) NOT NULL,
    ipt_step_name character varying(100),
    ipt_progress_percentage integer DEFAULT 0,
    ipt_items_processed integer DEFAULT 0,
    ipt_items_total integer DEFAULT 0,
    ipt_status character varying(20) DEFAULT 'PENDING'::character varying,
    ipt_message character varying(500),
    ipt_started timestamp with time zone,
    ipt_completed timestamp with time zone,
    ipt_last_update timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    ipt_created_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    ipt_is_active boolean DEFAULT true,
    CONSTRAINT stg_import_progress_tracking_ipt_ipt_progress_percentage_check CHECK (((ipt_progress_percentage >= 0) AND (ipt_progress_percentage <= 100)))
);


--
-- Name: TABLE stg_import_progress_tracking_ipt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stg_import_progress_tracking_ipt IS 'US-034: Real-time progress tracking for import orchestrations with granular step monitoring';


--
-- Name: stg_import_progress_tracking_ipt_ipt_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stg_import_progress_tracking_ipt_ipt_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stg_import_progress_tracking_ipt_ipt_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stg_import_progress_tracking_ipt_ipt_id_seq OWNED BY public.stg_import_progress_tracking_ipt.ipt_id;


--
-- Name: stg_import_queue_management_iqm; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stg_import_queue_management_iqm (
    iqm_id uuid DEFAULT gen_random_uuid() NOT NULL,
    iqm_request_id uuid NOT NULL,
    iqm_priority integer DEFAULT 5 NOT NULL,
    iqm_status character varying(20) DEFAULT 'QUEUED'::character varying NOT NULL,
    iqm_import_type character varying(50) NOT NULL,
    iqm_requested_by character varying(100) NOT NULL,
    iqm_requested_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    iqm_started_at timestamp with time zone,
    iqm_estimated_duration integer,
    iqm_resource_requirements jsonb,
    iqm_configuration jsonb NOT NULL,
    iqm_queue_position integer,
    iqm_assigned_worker character varying(50),
    iqm_created_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    iqm_last_modified_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    iqm_is_active boolean DEFAULT true,
    CONSTRAINT chk_iqm_priority CHECK (((iqm_priority >= 1) AND (iqm_priority <= 20))),
    CONSTRAINT chk_iqm_status CHECK (((iqm_status)::text = ANY ((ARRAY['QUEUED'::character varying, 'PROCESSING'::character varying, 'COMPLETED'::character varying, 'FAILED'::character varying, 'CANCELLED'::character varying])::text[])))
);


--
-- Name: TABLE stg_import_queue_management_iqm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stg_import_queue_management_iqm IS 'US-034: Manages concurrent import request queuing and coordination';


--
-- Name: stg_import_resource_locks_irl; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stg_import_resource_locks_irl (
    irl_id integer NOT NULL,
    irl_resource_type character varying(50) NOT NULL,
    irl_resource_id character varying(100) NOT NULL,
    irl_lock_type character varying(20) NOT NULL,
    irl_locked_by_request uuid NOT NULL,
    irl_locked_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    irl_expires_at timestamp with time zone NOT NULL,
    irl_created_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    irl_is_active boolean DEFAULT true,
    CONSTRAINT chk_irl_expires_future CHECK ((irl_expires_at > irl_locked_at)),
    CONSTRAINT chk_irl_lock_type CHECK (((irl_lock_type)::text = ANY ((ARRAY['EXCLUSIVE'::character varying, 'SHARED'::character varying])::text[])))
);


--
-- Name: TABLE stg_import_resource_locks_irl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stg_import_resource_locks_irl IS 'US-034: Prevents resource conflicts between concurrent import operations';


--
-- Name: stg_import_resource_locks_irl_irl_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stg_import_resource_locks_irl_irl_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stg_import_resource_locks_irl_irl_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stg_import_resource_locks_irl_irl_id_seq OWNED BY public.stg_import_resource_locks_irl.irl_id;


--
-- Name: stg_import_rollback_actions_ira; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stg_import_rollback_actions_ira (
    ira_id integer NOT NULL,
    ior_id uuid NOT NULL,
    imb_id uuid,
    ira_action_type character varying(50) NOT NULL,
    ira_target_phase character varying(50),
    ira_rollback_reason character varying(500) NOT NULL,
    ira_rollback_details jsonb,
    ira_executed_by character varying(100) NOT NULL,
    ira_executed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    ira_success boolean DEFAULT false,
    ira_error_message character varying(1000),
    ira_recovery_data jsonb,
    ira_created_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    ira_is_active boolean DEFAULT true
);


--
-- Name: TABLE stg_import_rollback_actions_ira; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stg_import_rollback_actions_ira IS 'US-034: Audit trail for all rollback operations with recovery data preservation';


--
-- Name: stg_import_rollback_actions_ira_ira_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stg_import_rollback_actions_ira_ira_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stg_import_rollback_actions_ira_ira_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stg_import_rollback_actions_ira_ira_id_seq OWNED BY public.stg_import_rollback_actions_ira.ira_id;


--
-- Name: stg_orchestration_dependencies_od; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stg_orchestration_dependencies_od (
    od_id integer NOT NULL,
    od_orchestration_id uuid NOT NULL,
    od_depends_on_orchestration uuid NOT NULL,
    od_dependency_type character varying(30) NOT NULL,
    od_created_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_od_dependency_type CHECK (((od_dependency_type)::text = ANY ((ARRAY['SEQUENTIAL'::character varying, 'RESOURCE'::character varying, 'DATA'::character varying])::text[])))
);


--
-- Name: TABLE stg_orchestration_dependencies_od; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stg_orchestration_dependencies_od IS 'US-034: Manages dependencies between import orchestrations';


--
-- Name: stg_orchestration_dependencies_od_od_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stg_orchestration_dependencies_od_od_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stg_orchestration_dependencies_od_od_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stg_orchestration_dependencies_od_od_id_seq OWNED BY public.stg_orchestration_dependencies_od.od_id;


--
-- Name: stg_schedule_execution_history_seh; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stg_schedule_execution_history_seh (
    seh_id integer NOT NULL,
    sis_id integer NOT NULL,
    seh_execution_id uuid NOT NULL,
    seh_started_at timestamp with time zone NOT NULL,
    seh_completed_at timestamp with time zone,
    seh_status character varying(20) NOT NULL,
    seh_records_processed integer DEFAULT 0,
    seh_error_message text,
    seh_execution_details jsonb,
    seh_created_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_seh_status CHECK (((seh_status)::text = ANY ((ARRAY['STARTED'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'FAILED'::character varying, 'CANCELLED'::character varying])::text[])))
);


--
-- Name: TABLE stg_schedule_execution_history_seh; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stg_schedule_execution_history_seh IS 'US-034: Audit trail for scheduled import executions';


--
-- Name: stg_schedule_execution_history_seh_seh_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stg_schedule_execution_history_seh_seh_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stg_schedule_execution_history_seh_seh_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stg_schedule_execution_history_seh_seh_id_seq OWNED BY public.stg_schedule_execution_history_seh.seh_id;


--
-- Name: stg_schedule_resource_reservations_srr; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stg_schedule_resource_reservations_srr (
    srr_id integer NOT NULL,
    sis_id integer NOT NULL,
    srr_resource_type character varying(50) NOT NULL,
    srr_resource_amount integer NOT NULL,
    srr_reserved_from timestamp with time zone NOT NULL,
    srr_reserved_until timestamp with time zone NOT NULL,
    srr_status character varying(20) DEFAULT 'RESERVED'::character varying,
    srr_created_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_srr_reservation_period CHECK ((srr_reserved_until > srr_reserved_from)),
    CONSTRAINT chk_srr_resource_amount_positive CHECK ((srr_resource_amount > 0)),
    CONSTRAINT chk_srr_status CHECK (((srr_status)::text = ANY ((ARRAY['RESERVED'::character varying, 'ACTIVE'::character varying, 'RELEASED'::character varying, 'EXPIRED'::character varying])::text[])))
);


--
-- Name: TABLE stg_schedule_resource_reservations_srr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stg_schedule_resource_reservations_srr IS 'US-034: Resource reservations for scheduled imports';


--
-- Name: stg_schedule_resource_reservations_srr_srr_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stg_schedule_resource_reservations_srr_srr_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stg_schedule_resource_reservations_srr_srr_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stg_schedule_resource_reservations_srr_srr_id_seq OWNED BY public.stg_schedule_resource_reservations_srr.srr_id;


--
-- Name: stg_scheduled_import_schedules_sis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stg_scheduled_import_schedules_sis (
    sis_id integer NOT NULL,
    sis_schedule_id uuid DEFAULT gen_random_uuid() NOT NULL,
    sis_schedule_name character varying(255) NOT NULL,
    sis_import_type character varying(50) NOT NULL,
    sis_schedule_expression character varying(100) NOT NULL,
    sis_recurring boolean DEFAULT false,
    sis_priority integer DEFAULT 5,
    sis_created_by character varying(100) NOT NULL,
    sis_status character varying(20) DEFAULT 'SCHEDULED'::character varying,
    sis_next_execution timestamp with time zone NOT NULL,
    sis_last_execution timestamp with time zone,
    sis_execution_count integer DEFAULT 0,
    sis_success_count integer DEFAULT 0,
    sis_failure_count integer DEFAULT 0,
    sis_import_configuration jsonb NOT NULL,
    sis_notification_settings jsonb,
    sis_max_retries integer DEFAULT 3,
    sis_retry_delay_minutes integer DEFAULT 15,
    sis_timeout_minutes integer DEFAULT 60,
    sis_created_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    sis_last_modified_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    sis_is_active boolean DEFAULT true,
    CONSTRAINT chk_sis_execution_counts CHECK (((sis_success_count >= 0) AND (sis_failure_count >= 0) AND (sis_execution_count >= (sis_success_count + sis_failure_count)))),
    CONSTRAINT chk_sis_next_execution_future CHECK ((sis_next_execution > sis_created_date)),
    CONSTRAINT chk_sis_status CHECK (((sis_status)::text = ANY ((ARRAY['SCHEDULED'::character varying, 'EXECUTING'::character varying, 'COMPLETED'::character varying, 'FAILED'::character varying, 'CANCELLED'::character varying, 'PAUSED'::character varying])::text[]))),
    CONSTRAINT stg_scheduled_import_schedules_sis_sis_priority_check CHECK (((sis_priority >= 1) AND (sis_priority <= 20)))
);


--
-- Name: TABLE stg_scheduled_import_schedules_sis; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stg_scheduled_import_schedules_sis IS 'US-034: Manages scheduled and recurring import operations';


--
-- Name: stg_scheduled_import_schedules_sis_sis_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stg_scheduled_import_schedules_sis_sis_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stg_scheduled_import_schedules_sis_sis_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stg_scheduled_import_schedules_sis_sis_id_seq OWNED BY public.stg_scheduled_import_schedules_sis.sis_id;


--
-- Name: stg_step_instructions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stg_step_instructions (
    id integer NOT NULL,
    step_id character varying(255) NOT NULL,
    instruction_id text NOT NULL,
    instruction_text text,
    instruction_assignee character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    nominated_user character varying(255),
    instruction_assigned_team character varying(255),
    associated_controls text,
    duration_minutes integer,
    instruction_order integer
);


--
-- Name: TABLE stg_step_instructions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stg_step_instructions IS 'Staging: instructions détaillées pour chaque step.';


--
-- Name: COLUMN stg_step_instructions.nominated_user; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stg_step_instructions.nominated_user IS 'User nominated for this instruction';


--
-- Name: COLUMN stg_step_instructions.instruction_assigned_team; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stg_step_instructions.instruction_assigned_team IS 'Team assigned to this instruction';


--
-- Name: COLUMN stg_step_instructions.associated_controls; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stg_step_instructions.associated_controls IS 'Control references associated with this instruction';


--
-- Name: COLUMN stg_step_instructions.duration_minutes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stg_step_instructions.duration_minutes IS 'Estimated duration in minutes';


--
-- Name: COLUMN stg_step_instructions.instruction_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stg_step_instructions.instruction_order IS 'Order of instruction within the step';


--
-- Name: stg_step_instructions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.stg_step_instructions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.stg_step_instructions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: stg_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stg_steps (
    id character varying(255) NOT NULL,
    step_type character varying(3),
    step_number integer,
    step_title text,
    step_predecessor character varying(255),
    step_successor character varying(255),
    step_assigned_team character varying(255),
    step_impacted_teams character varying(255),
    step_macro_time_sequence text,
    step_time_sequence text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    import_batch_id uuid,
    import_source character varying(255),
    imported_by character varying(255),
    imported_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_stg_steps_step_type_length CHECK ((length((step_type)::text) = 3))
);


--
-- Name: TABLE stg_steps; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stg_steps IS 'Staging: informations principales de chaque step importée (Confluence JSON).';


--
-- Name: COLUMN stg_steps.step_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stg_steps.step_type IS 'Three-character step type code (e.g., IGO, CHK, DUM, TRT, BGO, BUS, GON, PRE, SYS)';


--
-- Name: stg_tenant_resource_limits_trl; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stg_tenant_resource_limits_trl (
    trl_id integer NOT NULL,
    trl_tenant_id character varying(50) NOT NULL,
    trl_resource_type character varying(50) NOT NULL,
    trl_resource_limit integer NOT NULL,
    trl_resource_unit character varying(20) NOT NULL,
    trl_enforcement_level character varying(20) DEFAULT 'HARD'::character varying,
    trl_created_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    trl_last_modified_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    trl_is_active boolean DEFAULT true,
    CONSTRAINT chk_trl_enforcement_level CHECK (((trl_enforcement_level)::text = ANY ((ARRAY['HARD'::character varying, 'SOFT'::character varying, 'ADVISORY'::character varying])::text[]))),
    CONSTRAINT chk_trl_resource_limit_positive CHECK ((trl_resource_limit > 0)),
    CONSTRAINT chk_trl_resource_unit CHECK (((trl_resource_unit)::text = ANY ((ARRAY['MB'::character varying, 'COUNT'::character varying, 'PERCENTAGE'::character varying, 'GB'::character varying, 'SECONDS'::character varying])::text[])))
);


--
-- Name: TABLE stg_tenant_resource_limits_trl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stg_tenant_resource_limits_trl IS 'US-034: Multi-tenant resource limit enforcement';


--
-- Name: stg_tenant_resource_limits_trl_trl_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stg_tenant_resource_limits_trl_trl_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stg_tenant_resource_limits_trl_trl_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stg_tenant_resource_limits_trl_trl_id_seq OWNED BY public.stg_tenant_resource_limits_trl.trl_id;


--
-- Name: system_configuration_scf; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_configuration_scf (
    scf_id uuid DEFAULT gen_random_uuid() NOT NULL,
    env_id integer NOT NULL,
    scf_key character varying(255) NOT NULL,
    scf_category character varying(100) NOT NULL,
    scf_value text NOT NULL,
    scf_description text,
    scf_is_active boolean DEFAULT true,
    scf_is_system_managed boolean DEFAULT false,
    scf_data_type character varying(50) DEFAULT 'STRING'::character varying,
    scf_validation_pattern character varying(500),
    created_by character varying(255) DEFAULT 'system'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by character varying(255) DEFAULT 'system'::character varying,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE system_configuration_scf; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.system_configuration_scf IS 'Central configuration table for runtime system settings, Confluence macro locations, and environment-specific parameters';


--
-- Name: COLUMN system_configuration_scf.scf_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configuration_scf.scf_key IS 'Unique configuration key within environment (e.g., stepview.confluence.space.key)';


--
-- Name: COLUMN system_configuration_scf.scf_category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configuration_scf.scf_category IS 'Configuration category for organization (MACRO_LOCATION, API_CONFIG, SYSTEM_SETTING)';


--
-- Name: COLUMN system_configuration_scf.scf_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configuration_scf.scf_value IS 'Configuration value as text (supports all data types)';


--
-- Name: COLUMN system_configuration_scf.scf_is_system_managed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configuration_scf.scf_is_system_managed IS 'TRUE for configurations managed by system migrations/generators';


--
-- Name: COLUMN system_configuration_scf.scf_data_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configuration_scf.scf_data_type IS 'Expected data type for validation (STRING, INTEGER, BOOLEAN, JSON, URL)';


--
-- Name: COLUMN system_configuration_scf.scf_validation_pattern; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configuration_scf.scf_validation_pattern IS 'Regex pattern for value validation';


--
-- Name: teams_tms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams_tms (
    tms_id integer NOT NULL,
    tms_name character varying(64) NOT NULL,
    tms_email character varying(255),
    tms_description text,
    created_by character varying(255) DEFAULT 'system'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by character varying(255) DEFAULT 'system'::character varying,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: COLUMN teams_tms.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teams_tms.created_by IS 'User trigram (usr_code) or system/generator/migration identifier';


--
-- Name: COLUMN teams_tms.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teams_tms.created_at IS 'Timestamp when record was created';


--
-- Name: COLUMN teams_tms.updated_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teams_tms.updated_by IS 'User trigram (usr_code) who last updated the record';


--
-- Name: COLUMN teams_tms.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teams_tms.updated_at IS 'Timestamp when record was last updated';


--
-- Name: teams_tms_tms_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.teams_tms_tms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: teams_tms_tms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.teams_tms_tms_id_seq OWNED BY public.teams_tms.tms_id;


--
-- Name: teams_tms_x_applications_app; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams_tms_x_applications_app (
    tms_id integer NOT NULL,
    app_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE teams_tms_x_applications_app; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.teams_tms_x_applications_app IS 'TIER 2 ASSOCIATION: Team-Application links with minimal audit (created_at only)';


--
-- Name: teams_tms_x_users_usr; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams_tms_x_users_usr (
    tms_x_usr_id integer NOT NULL,
    tms_id integer NOT NULL,
    usr_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by character varying(255) DEFAULT 'system'::character varying
);


--
-- Name: TABLE teams_tms_x_users_usr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.teams_tms_x_users_usr IS 'TIER 1 ASSOCIATION: User-Team assignments with full audit tracking (created_at, created_by)';


--
-- Name: COLUMN teams_tms_x_users_usr.tms_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teams_tms_x_users_usr.tms_id IS 'References teams_tms (team).';


--
-- Name: COLUMN teams_tms_x_users_usr.usr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teams_tms_x_users_usr.usr_id IS 'References users_usr (user).';


--
-- Name: teams_tms_x_users_usr_tms_x_usr_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.teams_tms_x_users_usr_tms_x_usr_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: teams_tms_x_users_usr_tms_x_usr_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.teams_tms_x_users_usr_tms_x_usr_id_seq OWNED BY public.teams_tms_x_users_usr.tms_x_usr_id;


--
-- Name: users_usr; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users_usr (
    usr_id integer NOT NULL,
    usr_code character varying(3) NOT NULL,
    usr_first_name character varying(50) NOT NULL,
    usr_last_name character varying(50) NOT NULL,
    usr_email character varying(255) NOT NULL,
    usr_is_admin boolean DEFAULT false,
    rls_id integer,
    usr_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255) DEFAULT 'system'::character varying,
    updated_by character varying(255) DEFAULT 'system'::character varying,
    usr_confluence_user_id character varying(255)
);


--
-- Name: COLUMN users_usr.usr_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users_usr.usr_active IS 'Indicates whether the user account is active (TRUE) or inactive (FALSE). Default is active.';


--
-- Name: COLUMN users_usr.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users_usr.created_at IS 'Timestamp when record was created';


--
-- Name: COLUMN users_usr.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users_usr.updated_at IS 'Timestamp when record was last updated';


--
-- Name: COLUMN users_usr.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users_usr.created_by IS 'User trigram (usr_code) or system/generator/migration identifier';


--
-- Name: COLUMN users_usr.updated_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users_usr.updated_by IS 'User trigram (usr_code) who last updated the record';


--
-- Name: users_usr_usr_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_usr_usr_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_usr_usr_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_usr_usr_id_seq OWNED BY public.users_usr.usr_id;


--
-- Name: v_staging_validation; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_staging_validation AS
 SELECT s.id AS step_id,
    s.step_type,
    s.step_number,
    s.step_title,
    s.step_assigned_team AS primary_team,
    s.step_impacted_teams AS impacted_teams,
    s.import_batch_id,
    s.import_source,
    count(i.id) AS instruction_count,
    count(DISTINCT i.instruction_assigned_team) AS unique_teams,
    count(i.nominated_user) AS nominated_users_count,
    count(i.associated_controls) AS controls_count
   FROM (public.stg_steps s
     LEFT JOIN public.stg_step_instructions i ON (((s.id)::text = (i.step_id)::text)))
  GROUP BY s.id, s.step_type, s.step_number, s.step_title, s.step_assigned_team, s.step_impacted_teams, s.import_batch_id, s.import_source;


--
-- Name: VIEW v_staging_validation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_staging_validation IS 'Validation view for staging data before promotion to master tables';


--
-- Name: applications_app app_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications_app ALTER COLUMN app_id SET DEFAULT nextval('public.applications_app_app_id_seq'::regclass);


--
-- Name: audit_log_aud aud_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_aud ALTER COLUMN aud_id SET DEFAULT nextval('public.audit_log_aud_aud_id_seq'::regclass);


--
-- Name: environment_roles_enr enr_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.environment_roles_enr ALTER COLUMN enr_id SET DEFAULT nextval('public.environment_roles_enr_enr_id_seq'::regclass);


--
-- Name: environments_env env_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.environments_env ALTER COLUMN env_id SET DEFAULT nextval('public.environments_env_env_id_seq'::regclass);


--
-- Name: labels_lbl lbl_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl ALTER COLUMN lbl_id SET DEFAULT nextval('public.labels_lbl_lbl_id_seq'::regclass);


--
-- Name: labels_lbl_x_applications_app lbl_x_app_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_applications_app ALTER COLUMN lbl_x_app_id SET DEFAULT nextval('public.labels_lbl_x_applications_app_lbl_x_app_id_seq'::regclass);


--
-- Name: labels_lbl_x_controls_master_ctm lbl_x_ctm_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_controls_master_ctm ALTER COLUMN lbl_x_ctm_id SET DEFAULT nextval('public.labels_lbl_x_controls_master_ctm_lbl_x_ctm_id_seq'::regclass);


--
-- Name: labels_lbl_x_steps_master_stm lbl_x_stm_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_steps_master_stm ALTER COLUMN lbl_x_stm_id SET DEFAULT nextval('public.labels_lbl_x_steps_master_stm_lbl_x_stm_id_seq'::regclass);


--
-- Name: migration_types_mit mit_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migration_types_mit ALTER COLUMN mit_id SET DEFAULT nextval('public.migration_types_mit_mit_id_seq'::regclass);


--
-- Name: roles_rls rls_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles_rls ALTER COLUMN rls_id SET DEFAULT nextval('public.roles_rls_rls_id_seq'::regclass);


--
-- Name: status_sts sts_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_sts ALTER COLUMN sts_id SET DEFAULT nextval('public.status_sts_sts_id_seq'::regclass);


--
-- Name: step_instance_comments_sic sic_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_instance_comments_sic ALTER COLUMN sic_id SET DEFAULT nextval('public.step_instance_comments_sic_sic_id_seq'::regclass);


--
-- Name: step_pilot_comments_spc spc_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_pilot_comments_spc ALTER COLUMN spc_id SET DEFAULT nextval('public.step_pilot_comments_spc_spc_id_seq'::regclass);


--
-- Name: stg_import_entity_dependencies_ied ied_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_entity_dependencies_ied ALTER COLUMN ied_id SET DEFAULT nextval('public.stg_import_entity_dependencies_ied_ied_id_seq'::regclass);


--
-- Name: stg_import_progress_tracking_ipt ipt_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_progress_tracking_ipt ALTER COLUMN ipt_id SET DEFAULT nextval('public.stg_import_progress_tracking_ipt_ipt_id_seq'::regclass);


--
-- Name: stg_import_resource_locks_irl irl_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_resource_locks_irl ALTER COLUMN irl_id SET DEFAULT nextval('public.stg_import_resource_locks_irl_irl_id_seq'::regclass);


--
-- Name: stg_import_rollback_actions_ira ira_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_rollback_actions_ira ALTER COLUMN ira_id SET DEFAULT nextval('public.stg_import_rollback_actions_ira_ira_id_seq'::regclass);


--
-- Name: stg_orchestration_dependencies_od od_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_orchestration_dependencies_od ALTER COLUMN od_id SET DEFAULT nextval('public.stg_orchestration_dependencies_od_od_id_seq'::regclass);


--
-- Name: stg_schedule_execution_history_seh seh_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_schedule_execution_history_seh ALTER COLUMN seh_id SET DEFAULT nextval('public.stg_schedule_execution_history_seh_seh_id_seq'::regclass);


--
-- Name: stg_schedule_resource_reservations_srr srr_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_schedule_resource_reservations_srr ALTER COLUMN srr_id SET DEFAULT nextval('public.stg_schedule_resource_reservations_srr_srr_id_seq'::regclass);


--
-- Name: stg_scheduled_import_schedules_sis sis_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_scheduled_import_schedules_sis ALTER COLUMN sis_id SET DEFAULT nextval('public.stg_scheduled_import_schedules_sis_sis_id_seq'::regclass);


--
-- Name: stg_tenant_resource_limits_trl trl_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_tenant_resource_limits_trl ALTER COLUMN trl_id SET DEFAULT nextval('public.stg_tenant_resource_limits_trl_trl_id_seq'::regclass);


--
-- Name: teams_tms tms_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams_tms ALTER COLUMN tms_id SET DEFAULT nextval('public.teams_tms_tms_id_seq'::regclass);


--
-- Name: teams_tms_x_users_usr tms_x_usr_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams_tms_x_users_usr ALTER COLUMN tms_x_usr_id SET DEFAULT nextval('public.teams_tms_x_users_usr_tms_x_usr_id_seq'::regclass);


--
-- Name: users_usr usr_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_usr ALTER COLUMN usr_id SET DEFAULT nextval('public.users_usr_usr_id_seq'::regclass);


--
-- Name: applications_app applications_app_app_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications_app
    ADD CONSTRAINT applications_app_app_code_key UNIQUE (app_code);


--
-- Name: applications_app applications_app_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications_app
    ADD CONSTRAINT applications_app_pkey PRIMARY KEY (app_id);


--
-- Name: audit_log_aud audit_log_aud_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_aud
    ADD CONSTRAINT audit_log_aud_pkey PRIMARY KEY (aud_id);


--
-- Name: controls_instance_cti controls_instance_cti_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.controls_instance_cti
    ADD CONSTRAINT controls_instance_cti_pkey PRIMARY KEY (cti_id);


--
-- Name: controls_master_ctm controls_master_ctm_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.controls_master_ctm
    ADD CONSTRAINT controls_master_ctm_pkey PRIMARY KEY (ctm_id);


--
-- Name: databasechangeloglock databasechangeloglock_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.databasechangeloglock
    ADD CONSTRAINT databasechangeloglock_pkey PRIMARY KEY (id);


--
-- Name: email_templates_emt email_templates_emt_emt_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates_emt
    ADD CONSTRAINT email_templates_emt_emt_name_key UNIQUE (emt_name);


--
-- Name: email_templates_emt email_templates_emt_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates_emt
    ADD CONSTRAINT email_templates_emt_pkey PRIMARY KEY (emt_id);


--
-- Name: environment_roles_enr environment_roles_enr_enr_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.environment_roles_enr
    ADD CONSTRAINT environment_roles_enr_enr_name_key UNIQUE (enr_name);


--
-- Name: environment_roles_enr environment_roles_enr_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.environment_roles_enr
    ADD CONSTRAINT environment_roles_enr_pkey PRIMARY KEY (enr_id);


--
-- Name: environments_env environments_env_env_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.environments_env
    ADD CONSTRAINT environments_env_env_code_key UNIQUE (env_code);


--
-- Name: environments_env environments_env_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.environments_env
    ADD CONSTRAINT environments_env_pkey PRIMARY KEY (env_id);


--
-- Name: environments_env_x_applications_app environments_env_x_applications_app_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.environments_env_x_applications_app
    ADD CONSTRAINT environments_env_x_applications_app_pkey PRIMARY KEY (env_id, app_id);


--
-- Name: environments_env_x_iterations_ite environments_env_x_iterations_ite_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.environments_env_x_iterations_ite
    ADD CONSTRAINT environments_env_x_iterations_ite_pkey PRIMARY KEY (env_id, ite_id);


--
-- Name: import_batches_imb import_batches_imb_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_batches_imb
    ADD CONSTRAINT import_batches_imb_pkey PRIMARY KEY (imb_id);


--
-- Name: instructions_instance_ini instructions_instance_ini_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instructions_instance_ini
    ADD CONSTRAINT instructions_instance_ini_pkey PRIMARY KEY (ini_id);


--
-- Name: instructions_master_inm instructions_master_inm_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instructions_master_inm
    ADD CONSTRAINT instructions_master_inm_pkey PRIMARY KEY (inm_id);


--
-- Name: iteration_types_itt iteration_types_itt_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iteration_types_itt
    ADD CONSTRAINT iteration_types_itt_pkey PRIMARY KEY (itt_code);


--
-- Name: iterations_ite iterations_ite_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iterations_ite
    ADD CONSTRAINT iterations_ite_pkey PRIMARY KEY (ite_id);


--
-- Name: labels_lbl labels_lbl_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl
    ADD CONSTRAINT labels_lbl_pkey PRIMARY KEY (lbl_id);


--
-- Name: labels_lbl_x_applications_app labels_lbl_x_applications_app_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_applications_app
    ADD CONSTRAINT labels_lbl_x_applications_app_pkey PRIMARY KEY (lbl_x_app_id);


--
-- Name: labels_lbl_x_controls_master_ctm labels_lbl_x_controls_master_ctm_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_controls_master_ctm
    ADD CONSTRAINT labels_lbl_x_controls_master_ctm_pkey PRIMARY KEY (lbl_x_ctm_id);


--
-- Name: labels_lbl_x_steps_master_stm labels_lbl_x_steps_master_stm_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_steps_master_stm
    ADD CONSTRAINT labels_lbl_x_steps_master_stm_pkey PRIMARY KEY (lbl_x_stm_id);


--
-- Name: migration_types_mit migration_types_mit_mit_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migration_types_mit
    ADD CONSTRAINT migration_types_mit_mit_code_key UNIQUE (mit_code);


--
-- Name: migration_types_mit migration_types_mit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migration_types_mit
    ADD CONSTRAINT migration_types_mit_pkey PRIMARY KEY (mit_id);


--
-- Name: migrations_mig migrations_mig_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations_mig
    ADD CONSTRAINT migrations_mig_pkey PRIMARY KEY (mig_id);


--
-- Name: phases_instance_phi phases_instance_phi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phases_instance_phi
    ADD CONSTRAINT phases_instance_phi_pkey PRIMARY KEY (phi_id);


--
-- Name: phases_master_phm phases_master_phm_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phases_master_phm
    ADD CONSTRAINT phases_master_phm_pkey PRIMARY KEY (phm_id);


--
-- Name: steps_master_stm_x_iteration_types_itt pk_stm_itt; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_master_stm_x_iteration_types_itt
    ADD CONSTRAINT pk_stm_itt PRIMARY KEY (stm_id, itt_code);


--
-- Name: steps_master_stm_x_teams_tms_impacted pk_stm_tms_impacted; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_master_stm_x_teams_tms_impacted
    ADD CONSTRAINT pk_stm_tms_impacted PRIMARY KEY (stm_id, tms_id);


--
-- Name: plans_instance_pli plans_instance_pli_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans_instance_pli
    ADD CONSTRAINT plans_instance_pli_pkey PRIMARY KEY (pli_id);


--
-- Name: plans_master_plm plans_master_plm_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans_master_plm
    ADD CONSTRAINT plans_master_plm_pkey PRIMARY KEY (plm_id);


--
-- Name: roles_rls roles_rls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles_rls
    ADD CONSTRAINT roles_rls_pkey PRIMARY KEY (rls_id);


--
-- Name: roles_rls roles_rls_rls_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles_rls
    ADD CONSTRAINT roles_rls_rls_code_key UNIQUE (rls_code);


--
-- Name: sequences_instance_sqi sequences_instance_sqi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequences_instance_sqi
    ADD CONSTRAINT sequences_instance_sqi_pkey PRIMARY KEY (sqi_id);


--
-- Name: sequences_master_sqm sequences_master_sqm_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequences_master_sqm
    ADD CONSTRAINT sequences_master_sqm_pkey PRIMARY KEY (sqm_id);


--
-- Name: status_sts status_sts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_sts
    ADD CONSTRAINT status_sts_pkey PRIMARY KEY (sts_id);


--
-- Name: step_instance_comments_sic step_instance_comments_sic_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_instance_comments_sic
    ADD CONSTRAINT step_instance_comments_sic_pkey PRIMARY KEY (sic_id);


--
-- Name: step_pilot_comments_spc step_pilot_comments_spc_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_pilot_comments_spc
    ADD CONSTRAINT step_pilot_comments_spc_pkey PRIMARY KEY (spc_id);


--
-- Name: step_types_stt step_types_stt_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_types_stt
    ADD CONSTRAINT step_types_stt_pkey PRIMARY KEY (stt_code);


--
-- Name: steps_instance_sti steps_instance_sti_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_instance_sti
    ADD CONSTRAINT steps_instance_sti_pkey PRIMARY KEY (sti_id);


--
-- Name: steps_master_stm steps_master_stm_phm_id_stt_code_stm_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_master_stm
    ADD CONSTRAINT steps_master_stm_phm_id_stt_code_stm_number_key UNIQUE (phm_id, stt_code, stm_number);


--
-- Name: steps_master_stm steps_master_stm_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_master_stm
    ADD CONSTRAINT steps_master_stm_pkey PRIMARY KEY (stm_id);


--
-- Name: stg_import_entity_dependencies_ied stg_import_entity_dependencies_ied_ied_entity_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_entity_dependencies_ied
    ADD CONSTRAINT stg_import_entity_dependencies_ied_ied_entity_type_key UNIQUE (ied_entity_type);


--
-- Name: stg_import_entity_dependencies_ied stg_import_entity_dependencies_ied_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_entity_dependencies_ied
    ADD CONSTRAINT stg_import_entity_dependencies_ied_pkey PRIMARY KEY (ied_id);


--
-- Name: stg_import_orchestrations_ior stg_import_orchestrations_ior_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_orchestrations_ior
    ADD CONSTRAINT stg_import_orchestrations_ior_pkey PRIMARY KEY (ior_id);


--
-- Name: stg_import_progress_tracking_ipt stg_import_progress_tracking_ipt_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_progress_tracking_ipt
    ADD CONSTRAINT stg_import_progress_tracking_ipt_pkey PRIMARY KEY (ipt_id);


--
-- Name: stg_import_queue_management_iqm stg_import_queue_management_iqm_iqm_request_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_queue_management_iqm
    ADD CONSTRAINT stg_import_queue_management_iqm_iqm_request_id_key UNIQUE (iqm_request_id);


--
-- Name: stg_import_queue_management_iqm stg_import_queue_management_iqm_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_queue_management_iqm
    ADD CONSTRAINT stg_import_queue_management_iqm_pkey PRIMARY KEY (iqm_id);


--
-- Name: stg_import_resource_locks_irl stg_import_resource_locks_irl_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_resource_locks_irl
    ADD CONSTRAINT stg_import_resource_locks_irl_pkey PRIMARY KEY (irl_id);


--
-- Name: stg_import_rollback_actions_ira stg_import_rollback_actions_ira_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_rollback_actions_ira
    ADD CONSTRAINT stg_import_rollback_actions_ira_pkey PRIMARY KEY (ira_id);


--
-- Name: stg_orchestration_dependencies_od stg_orchestration_dependencies_od_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_orchestration_dependencies_od
    ADD CONSTRAINT stg_orchestration_dependencies_od_pkey PRIMARY KEY (od_id);


--
-- Name: stg_schedule_execution_history_seh stg_schedule_execution_history_seh_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_schedule_execution_history_seh
    ADD CONSTRAINT stg_schedule_execution_history_seh_pkey PRIMARY KEY (seh_id);


--
-- Name: stg_schedule_resource_reservations_srr stg_schedule_resource_reservations_srr_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_schedule_resource_reservations_srr
    ADD CONSTRAINT stg_schedule_resource_reservations_srr_pkey PRIMARY KEY (srr_id);


--
-- Name: stg_scheduled_import_schedules_sis stg_scheduled_import_schedules_sis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_scheduled_import_schedules_sis
    ADD CONSTRAINT stg_scheduled_import_schedules_sis_pkey PRIMARY KEY (sis_id);


--
-- Name: stg_scheduled_import_schedules_sis stg_scheduled_import_schedules_sis_sis_schedule_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_scheduled_import_schedules_sis
    ADD CONSTRAINT stg_scheduled_import_schedules_sis_sis_schedule_id_key UNIQUE (sis_schedule_id);


--
-- Name: stg_step_instructions stg_step_instructions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_step_instructions
    ADD CONSTRAINT stg_step_instructions_pkey PRIMARY KEY (id);


--
-- Name: stg_steps stg_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_steps
    ADD CONSTRAINT stg_steps_pkey PRIMARY KEY (id);


--
-- Name: stg_tenant_resource_limits_trl stg_tenant_resource_limits_trl_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_tenant_resource_limits_trl
    ADD CONSTRAINT stg_tenant_resource_limits_trl_pkey PRIMARY KEY (trl_id);


--
-- Name: system_configuration_scf system_configuration_scf_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configuration_scf
    ADD CONSTRAINT system_configuration_scf_pkey PRIMARY KEY (scf_id);


--
-- Name: teams_tms teams_tms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams_tms
    ADD CONSTRAINT teams_tms_pkey PRIMARY KEY (tms_id);


--
-- Name: teams_tms teams_tms_tms_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams_tms
    ADD CONSTRAINT teams_tms_tms_email_key UNIQUE (tms_email);


--
-- Name: teams_tms_x_applications_app teams_tms_x_applications_app_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams_tms_x_applications_app
    ADD CONSTRAINT teams_tms_x_applications_app_pkey PRIMARY KEY (tms_id, app_id);


--
-- Name: teams_tms_x_users_usr teams_tms_x_users_usr_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams_tms_x_users_usr
    ADD CONSTRAINT teams_tms_x_users_usr_pkey PRIMARY KEY (tms_x_usr_id);


--
-- Name: stg_import_resource_locks_irl uk_irl_resource_request; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_resource_locks_irl
    ADD CONSTRAINT uk_irl_resource_request UNIQUE (irl_resource_type, irl_resource_id, irl_locked_by_request);


--
-- Name: stg_orchestration_dependencies_od uk_od_orchestration_dependency; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_orchestration_dependencies_od
    ADD CONSTRAINT uk_od_orchestration_dependency UNIQUE (od_orchestration_id, od_depends_on_orchestration);


--
-- Name: stg_step_instructions uk_stg_step_instructions_step_instruction; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_step_instructions
    ADD CONSTRAINT uk_stg_step_instructions_step_instruction UNIQUE (step_id, instruction_id);


--
-- Name: stg_tenant_resource_limits_trl uk_trl_tenant_resource; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_tenant_resource_limits_trl
    ADD CONSTRAINT uk_trl_tenant_resource UNIQUE (trl_tenant_id, trl_resource_type);


--
-- Name: system_configuration_scf unique_scf_key_per_env; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configuration_scf
    ADD CONSTRAINT unique_scf_key_per_env UNIQUE (env_id, scf_key);


--
-- Name: controls_master_ctm uq_ctm_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.controls_master_ctm
    ADD CONSTRAINT uq_ctm_code UNIQUE (ctm_code);


--
-- Name: labels_lbl uq_labels_lbl_mig_id_lbl_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl
    ADD CONSTRAINT uq_labels_lbl_mig_id_lbl_name UNIQUE (mig_id, lbl_name);


--
-- Name: labels_lbl_x_controls_master_ctm uq_labels_lbl_x_controls_master_ctm_lbl_id_ctm_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_controls_master_ctm
    ADD CONSTRAINT uq_labels_lbl_x_controls_master_ctm_lbl_id_ctm_id UNIQUE (lbl_id, ctm_id);


--
-- Name: labels_lbl_x_steps_master_stm uq_labels_lbl_x_steps_master_stm_lbl_id_stm_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_steps_master_stm
    ADD CONSTRAINT uq_labels_lbl_x_steps_master_stm_lbl_id_stm_id UNIQUE (lbl_id, stm_id);


--
-- Name: labels_lbl_x_applications_app uq_lbl_x_app; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_applications_app
    ADD CONSTRAINT uq_lbl_x_app UNIQUE (lbl_id, app_id);


--
-- Name: status_sts uq_status_sts_name_type; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_sts
    ADD CONSTRAINT uq_status_sts_name_type UNIQUE (sts_name, sts_type);


--
-- Name: teams_tms_x_users_usr uq_tms_x_usr; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams_tms_x_users_usr
    ADD CONSTRAINT uq_tms_x_usr UNIQUE (tms_id, usr_id);


--
-- Name: users_usr users_usr_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_usr
    ADD CONSTRAINT users_usr_pkey PRIMARY KEY (usr_id);


--
-- Name: users_usr users_usr_usr_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_usr
    ADD CONSTRAINT users_usr_usr_code_key UNIQUE (usr_code);


--
-- Name: users_usr users_usr_usr_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_usr
    ADD CONSTRAINT users_usr_usr_email_key UNIQUE (usr_email);


--
-- Name: idx_app_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_audit ON public.applications_app USING btree (created_at);


--
-- Name: idx_applications_app_code_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_app_code_lookup ON public.applications_app USING btree (app_code);


--
-- Name: INDEX idx_applications_app_code_lookup; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_applications_app_code_lookup IS 'Primary performance index for application code lookups - US-082-C Applications optimization';


--
-- Name: idx_applications_app_name_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_app_name_search ON public.applications_app USING btree (upper((app_name)::text));


--
-- Name: INDEX idx_applications_app_name_search; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_applications_app_name_search IS 'Performance index for application name searches - US-082-C Applications optimization';


--
-- Name: idx_applications_count_optimization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_count_optimization ON public.applications_app USING btree (app_id) INCLUDE (app_code, app_name);


--
-- Name: INDEX idx_applications_count_optimization; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_applications_count_optimization IS 'Performance index for application count queries - US-082-C Applications optimization';


--
-- Name: idx_applications_detail_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_detail_lookup ON public.applications_app USING btree (app_id) INCLUDE (app_code, app_name, app_description);


--
-- Name: INDEX idx_applications_detail_lookup; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_applications_detail_lookup IS 'Performance index for application detail lookups - US-082-C Applications optimization';


--
-- Name: idx_applications_pagination; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_pagination ON public.applications_app USING btree (app_id, app_code, app_name);


--
-- Name: INDEX idx_applications_pagination; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_applications_pagination IS 'Performance index for application pagination - US-082-C Applications optimization';


--
-- Name: idx_applications_search_composite; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_search_composite ON public.applications_app USING gin (to_tsvector('english'::regconfig, (((((COALESCE(app_code, ''::character varying))::text || ' '::text) || (COALESCE(app_name, ''::character varying))::text) || ' '::text) || COALESCE(app_description, ''::text))));


--
-- Name: INDEX idx_applications_search_composite; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_applications_search_composite IS 'Full-text search index for applications - US-082-C Applications optimization';


--
-- Name: idx_applications_with_counts_optimization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_with_counts_optimization ON public.applications_app USING btree (app_code, app_name) INCLUDE (app_id, app_description);


--
-- Name: INDEX idx_applications_with_counts_optimization; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_applications_with_counts_optimization IS 'Performance index for application count queries - US-082-C Applications optimization';


--
-- Name: idx_applications_with_environments; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_with_environments ON public.environments_env_x_applications_app USING btree (app_id) INCLUDE (env_id);


--
-- Name: INDEX idx_applications_with_environments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_applications_with_environments IS 'Performance index for applications with environments - US-082-C Applications optimization';


--
-- Name: idx_applications_with_labels; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_with_labels ON public.labels_lbl_x_applications_app USING btree (app_id) INCLUDE (lbl_id);


--
-- Name: INDEX idx_applications_with_labels; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_applications_with_labels IS 'Performance index for applications with labels - US-082-C Applications optimization';


--
-- Name: idx_applications_with_teams; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_with_teams ON public.teams_tms_x_applications_app USING btree (app_id) INCLUDE (tms_id);


--
-- Name: INDEX idx_applications_with_teams; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_applications_with_teams IS 'Performance index for applications with teams - US-082-C Applications optimization';


--
-- Name: idx_apps_by_environment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apps_by_environment ON public.environments_env_x_applications_app USING btree (env_id, app_id);


--
-- Name: INDEX idx_apps_by_environment; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_apps_by_environment IS 'Performance index for applications filtered by environment - US-082-C Applications optimization';


--
-- Name: idx_apps_by_label; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apps_by_label ON public.labels_lbl_x_applications_app USING btree (lbl_id, app_id);


--
-- Name: INDEX idx_apps_by_label; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_apps_by_label IS 'Performance index for applications filtered by label - US-082-C Applications optimization';


--
-- Name: idx_apps_by_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apps_by_team ON public.teams_tms_x_applications_app USING btree (tms_id, app_id);


--
-- Name: INDEX idx_apps_by_team; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_apps_by_team IS 'Performance index for applications filtered by team - US-082-C Applications optimization';


--
-- Name: idx_audit_log_changed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_changed_by ON public.audit_log_aud USING btree (usr_id, aud_timestamp DESC) WHERE (usr_id IS NOT NULL);


--
-- Name: INDEX idx_audit_log_changed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_audit_log_changed_by IS 'Performance index for "who changed what" audit queries - US-082-C Users optimization';


--
-- Name: idx_audit_log_role_changes; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_role_changes ON public.audit_log_aud USING btree (aud_entity_type, aud_action, aud_timestamp DESC) WHERE (((aud_entity_type)::text = 'user'::text) AND ((aud_action)::text = 'role_change'::text));


--
-- Name: INDEX idx_audit_log_role_changes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_audit_log_role_changes IS 'Performance index for role change audit queries - US-082-C Users optimization';


--
-- Name: idx_audit_log_user_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_user_activity ON public.audit_log_aud USING btree (usr_id, aud_entity_type, aud_timestamp DESC) WHERE (usr_id IS NOT NULL);


--
-- Name: INDEX idx_audit_log_user_activity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_audit_log_user_activity IS 'Performance index for user activity tracking - US-082-C Users optimization';


--
-- Name: idx_audit_log_user_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_user_entity ON public.audit_log_aud USING btree (aud_entity_type, aud_entity_id, aud_timestamp DESC) WHERE ((aud_entity_type)::text = 'user'::text);


--
-- Name: INDEX idx_audit_log_user_entity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_audit_log_user_entity IS 'Performance index for user audit trail queries - US-082-C Users optimization';


--
-- Name: idx_controls_instance_cti_status_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_controls_instance_cti_status_id ON public.controls_instance_cti USING btree (cti_status);


--
-- Name: idx_cti_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cti_audit ON public.controls_instance_cti USING btree (created_at);


--
-- Name: idx_ctm_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ctm_audit ON public.controls_master_ctm USING btree (created_at);


--
-- Name: idx_dto_comments_aggregation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dto_comments_aggregation ON public.step_instance_comments_sic USING btree (sti_id, created_at DESC);


--
-- Name: INDEX idx_dto_comments_aggregation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_dto_comments_aggregation IS 'US-056-C DTO: Aggregation optimization for comments count and latest date subqueries';


--
-- Name: idx_dto_instructions_count; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dto_instructions_count ON public.instructions_instance_ini USING btree (sti_id, ini_is_completed, ini_completed_at);


--
-- Name: INDEX idx_dto_instructions_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_dto_instructions_count IS 'US-056-C DTO: Aggregation optimization for instructions count subqueries';


--
-- Name: idx_dto_mig_name_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dto_mig_name_lookup ON public.migrations_mig USING btree (mig_name, mig_id);


--
-- Name: INDEX idx_dto_mig_name_lookup; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_dto_mig_name_lookup IS 'US-056-C DTO: Migration name lookup optimization for API filtering';


--
-- Name: idx_dto_phi_hierarchy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dto_phi_hierarchy ON public.phases_instance_phi USING btree (phi_id, sqi_id, phi_status);


--
-- Name: INDEX idx_dto_phi_hierarchy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_dto_phi_hierarchy IS 'US-056-C DTO: Hierarchical navigation index for phases to sequences relationship';


--
-- Name: idx_dto_pli_context; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dto_pli_context ON public.plans_instance_pli USING btree (pli_id, ite_id, pli_status);


--
-- Name: INDEX idx_dto_pli_context; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_dto_pli_context IS 'US-056-C DTO: Context lookup index for plan to migration/iteration filtering';


--
-- Name: idx_dto_sqi_plan_navigation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dto_sqi_plan_navigation ON public.sequences_instance_sqi USING btree (sqi_id, pli_id, sqi_status);


--
-- Name: INDEX idx_dto_sqi_plan_navigation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_dto_sqi_plan_navigation IS 'US-056-C DTO: Navigation index for sequence to plan relationships';


--
-- Name: idx_dto_status_steps_covering; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dto_status_steps_covering ON public.steps_instance_sti USING btree (sti_status, phi_id) INCLUDE (sti_id, stm_id, created_at);


--
-- Name: INDEX idx_dto_status_steps_covering; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_dto_status_steps_covering IS 'US-056-C DTO: Covering index for status-based step queries';


--
-- Name: idx_dto_sti_covering; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dto_sti_covering ON public.steps_instance_sti USING btree (sti_id) INCLUDE (stm_id, sti_name, sti_description, sti_status, created_at, updated_at, phi_id);


--
-- Name: INDEX idx_dto_sti_covering; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_dto_sti_covering IS 'US-056-C DTO: Covering index for single step lookups avoiding table access';


--
-- Name: idx_dto_sti_status_phi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dto_sti_status_phi ON public.steps_instance_sti USING btree (sti_status, phi_id, stm_id);


--
-- Name: INDEX idx_dto_sti_status_phi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_dto_sti_status_phi IS 'US-056-C DTO: Primary filtering index for steps with status and hierarchical relationships';


--
-- Name: idx_dto_stm_hierarchy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dto_stm_hierarchy ON public.steps_master_stm USING btree (stm_id, phm_id, stt_code, stm_number);


--
-- Name: INDEX idx_dto_stm_hierarchy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_dto_stm_hierarchy IS 'US-056-C DTO: Step master hierarchy optimization for numbering and relationships';


--
-- Name: idx_dto_team_assignment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dto_team_assignment ON public.teams_tms USING btree (tms_id, tms_name);


--
-- Name: INDEX idx_dto_team_assignment; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_dto_team_assignment IS 'US-056-C DTO: Team assignment optimization for JOIN operations';


--
-- Name: idx_emt_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emt_name ON public.email_templates_emt USING btree (emt_name);


--
-- Name: idx_emt_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emt_type ON public.email_templates_emt USING btree (emt_type) WHERE (emt_is_active = true);


--
-- Name: idx_env_app_assoc_app_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_env_app_assoc_app_id ON public.environments_env_x_applications_app USING btree (app_id);


--
-- Name: INDEX idx_env_app_assoc_app_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_env_app_assoc_app_id IS 'Performance index for applications by environment - US-082-C Applications optimization';


--
-- Name: idx_env_app_assoc_composite; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_env_app_assoc_composite ON public.environments_env_x_applications_app USING btree (app_id, env_id);


--
-- Name: INDEX idx_env_app_assoc_composite; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_env_app_assoc_composite IS 'Composite performance index for environment-application queries - US-082-C Applications optimization';


--
-- Name: idx_env_app_assoc_env_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_env_app_assoc_env_id ON public.environments_env_x_applications_app USING btree (env_id);


--
-- Name: INDEX idx_env_app_assoc_env_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_env_app_assoc_env_id IS 'Performance index for environments by application - US-082-C Applications optimization';


--
-- Name: idx_env_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_env_audit ON public.environments_env USING btree (created_at);


--
-- Name: idx_env_count_per_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_env_count_per_app ON public.environments_env_x_applications_app USING btree (app_id) INCLUDE (env_id);


--
-- Name: INDEX idx_env_count_per_app; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_env_count_per_app IS 'Performance index for environment counts per application - US-082-C Applications optimization';


--
-- Name: idx_imb_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_imb_created ON public.import_batches_imb USING btree (imb_created_date DESC);


--
-- Name: idx_imb_ior_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_imb_ior_start ON public.import_batches_imb USING btree (ior_id, imb_start_time DESC);


--
-- Name: idx_imb_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_imb_status ON public.import_batches_imb USING btree (imb_status);


--
-- Name: idx_imb_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_imb_user ON public.import_batches_imb USING btree (imb_user_id);


--
-- Name: idx_ini_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ini_audit ON public.instructions_instance_ini USING btree (created_at);


--
-- Name: idx_inm_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inm_audit ON public.instructions_master_inm USING btree (created_at);


--
-- Name: idx_ior_status_started; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ior_status_started ON public.stg_import_orchestrations_ior USING btree (ior_status, ior_started DESC);


--
-- Name: idx_ior_user_started; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ior_user_started ON public.stg_import_orchestrations_ior USING btree (ior_user_id, ior_started DESC);


--
-- Name: idx_ipt_ior_phase; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ipt_ior_phase ON public.stg_import_progress_tracking_ipt USING btree (ior_id, ipt_phase_name);


--
-- Name: idx_iqm_status_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iqm_status_priority ON public.stg_import_queue_management_iqm USING btree (iqm_status, iqm_priority DESC, iqm_requested_at);


--
-- Name: idx_iqm_worker_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iqm_worker_status ON public.stg_import_queue_management_iqm USING btree (iqm_assigned_worker, iqm_status);


--
-- Name: idx_ira_ior_executed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ira_ior_executed ON public.stg_import_rollback_actions_ira USING btree (ior_id, ira_executed_at DESC);


--
-- Name: idx_irl_resource_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_irl_resource_expires ON public.stg_import_resource_locks_irl USING btree (irl_resource_type, irl_resource_id, irl_expires_at);


--
-- Name: idx_iteration_types_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iteration_types_active ON public.iteration_types_itt USING btree (itt_active);


--
-- Name: idx_iteration_types_display_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iteration_types_display_order ON public.iteration_types_itt USING btree (itt_display_order, itt_active);


--
-- Name: idx_iterations_ite_status_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iterations_ite_status_id ON public.iterations_ite USING btree (ite_status);


--
-- Name: idx_label_app_assoc_app_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_label_app_assoc_app_id ON public.labels_lbl_x_applications_app USING btree (app_id);


--
-- Name: INDEX idx_label_app_assoc_app_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_label_app_assoc_app_id IS 'Performance index for applications by label - US-082-C Applications optimization';


--
-- Name: idx_label_app_assoc_composite; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_label_app_assoc_composite ON public.labels_lbl_x_applications_app USING btree (app_id, lbl_id);


--
-- Name: INDEX idx_label_app_assoc_composite; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_label_app_assoc_composite IS 'Composite performance index for label-application queries - US-082-C Applications optimization';


--
-- Name: idx_label_app_assoc_label_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_label_app_assoc_label_id ON public.labels_lbl_x_applications_app USING btree (lbl_id);


--
-- Name: INDEX idx_label_app_assoc_label_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_label_app_assoc_label_id IS 'Performance index for labels by application - US-082-C Applications optimization';


--
-- Name: idx_label_count_per_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_label_count_per_app ON public.labels_lbl_x_applications_app USING btree (app_id) INCLUDE (lbl_id);


--
-- Name: INDEX idx_label_count_per_app; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_label_count_per_app IS 'Performance index for label counts per application - US-082-C Applications optimization';


--
-- Name: idx_lbl_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lbl_audit ON public.labels_lbl USING btree (created_at);


--
-- Name: idx_migration_types_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_migration_types_active ON public.migration_types_mit USING btree (mit_active);


--
-- Name: idx_migration_types_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_migration_types_code ON public.migration_types_mit USING btree (mit_code);


--
-- Name: idx_migration_types_display_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_migration_types_display_order ON public.migration_types_mit USING btree (mit_display_order, mit_active);


--
-- Name: idx_migrations_mig_status_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_migrations_mig_status_id ON public.migrations_mig USING btree (mig_status);


--
-- Name: idx_od_depends_on; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_od_depends_on ON public.stg_orchestration_dependencies_od USING btree (od_depends_on_orchestration);


--
-- Name: idx_od_orchestration; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_od_orchestration ON public.stg_orchestration_dependencies_od USING btree (od_orchestration_id);


--
-- Name: idx_phases_instance_phi_status_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phases_instance_phi_status_id ON public.phases_instance_phi USING btree (phi_status);


--
-- Name: idx_phi_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phi_audit ON public.phases_instance_phi USING btree (created_at);


--
-- Name: idx_phm_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phm_audit ON public.phases_master_phm USING btree (created_at);


--
-- Name: idx_plans_instance_pli_status_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plans_instance_pli_status_id ON public.plans_instance_pli USING btree (pli_status);


--
-- Name: idx_plans_master_plm_status_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plans_master_plm_status_id ON public.plans_master_plm USING btree (plm_status);


--
-- Name: idx_roles_hierarchy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roles_hierarchy ON public.roles_rls USING btree (rls_code, rls_id);


--
-- Name: INDEX idx_roles_hierarchy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_roles_hierarchy IS 'Performance index for role hierarchy queries - US-082-C Users optimization';


--
-- Name: idx_scf_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scf_audit ON public.system_configuration_scf USING btree (created_at);


--
-- Name: idx_scf_category_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scf_category_active ON public.system_configuration_scf USING btree (scf_category, scf_is_active);


--
-- Name: idx_scf_env_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scf_env_category ON public.system_configuration_scf USING btree (env_id, scf_category);


--
-- Name: idx_scf_key_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scf_key_active ON public.system_configuration_scf USING btree (scf_key, scf_is_active);


--
-- Name: idx_seh_execution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seh_execution_id ON public.stg_schedule_execution_history_seh USING btree (seh_execution_id);


--
-- Name: idx_seh_sis_started; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seh_sis_started ON public.stg_schedule_execution_history_seh USING btree (sis_id, seh_started_at DESC);


--
-- Name: idx_sequences_instance_sqi_status_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sequences_instance_sqi_status_id ON public.sequences_instance_sqi USING btree (sqi_status);


--
-- Name: idx_sic_sti_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sic_sti_id ON public.step_instance_comments_sic USING btree (sti_id);


--
-- Name: idx_sis_created_by_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sis_created_by_status ON public.stg_scheduled_import_schedules_sis USING btree (sis_created_by, sis_status);


--
-- Name: idx_sis_next_execution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sis_next_execution ON public.stg_scheduled_import_schedules_sis USING btree (sis_next_execution);


--
-- Name: idx_sis_recurring_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sis_recurring_active ON public.stg_scheduled_import_schedules_sis USING btree (sis_recurring, sis_is_active);


--
-- Name: idx_spc_stm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spc_stm_id ON public.step_pilot_comments_spc USING btree (stm_id);


--
-- Name: idx_sqi_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sqi_audit ON public.sequences_instance_sqi USING btree (created_at);


--
-- Name: idx_sqm_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sqm_audit ON public.sequences_master_sqm USING btree (created_at);


--
-- Name: idx_srr_resource_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_srr_resource_time ON public.stg_schedule_resource_reservations_srr USING btree (srr_resource_type, srr_reserved_from, srr_reserved_until);


--
-- Name: idx_status_sts_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_status_sts_name ON public.status_sts USING btree (sts_name);


--
-- Name: idx_status_sts_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_status_sts_type ON public.status_sts USING btree (sts_type);


--
-- Name: idx_steps_instance_sti_enr_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_steps_instance_sti_enr_id ON public.steps_instance_sti USING btree (enr_id);


--
-- Name: idx_steps_instance_sti_status_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_steps_instance_sti_status_id ON public.steps_instance_sti USING btree (sti_status);


--
-- Name: idx_steps_master_stm_enr_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_steps_master_stm_enr_id ON public.steps_master_stm USING btree (enr_id);


--
-- Name: idx_stg_steps_import_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stg_steps_import_batch ON public.stg_steps USING btree (import_batch_id);


--
-- Name: idx_sti_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sti_audit ON public.steps_instance_sti USING btree (created_at);


--
-- Name: idx_stm_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stm_audit ON public.steps_master_stm USING btree (created_at);


--
-- Name: idx_team_app_assoc_app_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_app_assoc_app_id ON public.teams_tms_x_applications_app USING btree (app_id);


--
-- Name: INDEX idx_team_app_assoc_app_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_team_app_assoc_app_id IS 'Performance index for applications by team - US-082-C Applications optimization';


--
-- Name: idx_team_app_assoc_composite; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_app_assoc_composite ON public.teams_tms_x_applications_app USING btree (app_id, tms_id);


--
-- Name: INDEX idx_team_app_assoc_composite; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_team_app_assoc_composite IS 'Composite performance index for team-application queries - US-082-C Applications optimization';


--
-- Name: idx_team_app_assoc_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_app_assoc_team_id ON public.teams_tms_x_applications_app USING btree (tms_id);


--
-- Name: INDEX idx_team_app_assoc_team_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_team_app_assoc_team_id IS 'Performance index for teams by application - US-082-C Applications optimization';


--
-- Name: idx_team_count_per_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_count_per_app ON public.teams_tms_x_applications_app USING btree (app_id) INCLUDE (tms_id);


--
-- Name: INDEX idx_team_count_per_app; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_team_count_per_app IS 'Performance index for team counts per application - US-082-C Applications optimization';


--
-- Name: idx_teams_users_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_users_created_at ON public.teams_tms_x_users_usr USING btree (created_at);


--
-- Name: INDEX idx_teams_users_created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_teams_users_created_at IS 'Performance index for created_at queries and cleanup operations - US-082-C Users optimization';


--
-- Name: idx_teams_users_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_users_created_by ON public.teams_tms_x_users_usr USING btree (created_by, usr_id, tms_id);


--
-- Name: INDEX idx_teams_users_created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_teams_users_created_by IS 'Performance index for role determination in bidirectional queries';


--
-- Name: idx_teams_users_member_stats; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_users_member_stats ON public.teams_tms_x_users_usr USING btree (usr_id) INCLUDE (tms_id, created_at);


--
-- Name: INDEX idx_teams_users_member_stats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_teams_users_member_stats IS 'Performance index for team membership statistics - US-082-C Users optimization';


--
-- Name: idx_teams_users_reverse_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_users_reverse_lookup ON public.teams_tms_x_users_usr USING btree (usr_id, tms_id, created_at DESC);


--
-- Name: INDEX idx_teams_users_reverse_lookup; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_teams_users_reverse_lookup IS 'Performance index for user team membership queries - US-082-C Users optimization';


--
-- Name: idx_teams_users_stats; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_users_stats ON public.teams_tms_x_users_usr USING btree (tms_id, created_at);


--
-- Name: INDEX idx_teams_users_stats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_teams_users_stats IS 'Performance index for team statistics aggregation';


--
-- Name: idx_teams_users_tms_id_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_users_tms_id_created ON public.teams_tms_x_users_usr USING btree (tms_id, created_at);


--
-- Name: INDEX idx_teams_users_tms_id_created; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_teams_users_tms_id_created IS 'Performance index for getUsersForTeam() - US-082-C Teams optimization';


--
-- Name: idx_teams_users_usr_id_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_users_usr_id_created ON public.teams_tms_x_users_usr USING btree (usr_id, created_at DESC);


--
-- Name: INDEX idx_teams_users_usr_id_created; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_teams_users_usr_id_created IS 'Performance index for getTeamsForUser() - US-082-C Teams optimization';


--
-- Name: idx_tms_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tms_audit ON public.teams_tms USING btree (created_at);


--
-- Name: idx_users_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_active ON public.users_usr USING btree (usr_active) WHERE (usr_active = true);


--
-- Name: INDEX idx_users_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_users_active IS 'Partial index for efficient active user filtering';


--
-- Name: idx_users_admin_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_admin_active ON public.users_usr USING btree (usr_id, usr_first_name, usr_last_name) WHERE ((usr_is_admin = true) AND (usr_active = true));


--
-- Name: INDEX idx_users_admin_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_users_admin_active IS 'Partial index for admin user operations - US-082-C Users optimization';


--
-- Name: idx_users_code_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_code_active ON public.users_usr USING btree (usr_code, usr_active) WHERE (usr_active = true);


--
-- Name: INDEX idx_users_code_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_users_code_active IS 'Performance index for username-based authentication - US-082-C Users optimization';


--
-- Name: idx_users_email_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email_active ON public.users_usr USING btree (usr_email, usr_active) WHERE (usr_active = true);


--
-- Name: INDEX idx_users_email_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_users_email_active IS 'Performance index for email-based user lookups - US-082-C Users optimization';


--
-- Name: idx_users_names_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_names_search ON public.users_usr USING gin (to_tsvector('english'::regconfig, (((usr_first_name)::text || ' '::text) || (usr_last_name)::text))) WHERE (usr_active = true);


--
-- Name: INDEX idx_users_names_search; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_users_names_search IS 'Full-text search index for user name searches - US-082-C Users optimization';


--
-- Name: idx_users_pagination_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_pagination_sort ON public.users_usr USING btree (usr_active, usr_last_name, usr_first_name, usr_id);


--
-- Name: INDEX idx_users_pagination_sort; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_users_pagination_sort IS 'Performance index for paginated user listings - US-082-C Users optimization';


--
-- Name: idx_users_role_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role_active ON public.users_usr USING btree (rls_id, usr_active, created_at DESC) WHERE (usr_active = true);


--
-- Name: INDEX idx_users_role_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_users_role_active IS 'Performance index for role-based queries and filtering - US-082-C Users optimization';


--
-- Name: idx_users_usr_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_usr_active ON public.users_usr USING btree (usr_active);


--
-- Name: idx_users_usr_id_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_usr_id_active ON public.users_usr USING btree (usr_id, usr_active) WHERE (usr_active = true);


--
-- Name: INDEX idx_users_usr_id_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_users_usr_id_active IS 'Primary performance index for user ID lookups - US-082-C Users optimization';


--
-- Name: idx_usr_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usr_audit ON public.users_usr USING btree (created_at);


--
-- Name: applications_app update_applications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications_app FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: controls_instance_cti update_controls_instance_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_controls_instance_updated_at BEFORE UPDATE ON public.controls_instance_cti FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: controls_master_ctm update_controls_master_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_controls_master_updated_at BEFORE UPDATE ON public.controls_master_ctm FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: environments_env update_environments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_environments_updated_at BEFORE UPDATE ON public.environments_env FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: instructions_instance_ini update_instructions_instance_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_instructions_instance_updated_at BEFORE UPDATE ON public.instructions_instance_ini FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: instructions_master_inm update_instructions_master_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_instructions_master_updated_at BEFORE UPDATE ON public.instructions_master_inm FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: labels_lbl update_labels_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_labels_updated_at BEFORE UPDATE ON public.labels_lbl FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: phases_instance_phi update_phases_instance_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_phases_instance_updated_at BEFORE UPDATE ON public.phases_instance_phi FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: phases_master_phm update_phases_master_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_phases_master_updated_at BEFORE UPDATE ON public.phases_master_phm FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: sequences_instance_sqi update_sequences_instance_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sequences_instance_updated_at BEFORE UPDATE ON public.sequences_instance_sqi FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: sequences_master_sqm update_sequences_master_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sequences_master_updated_at BEFORE UPDATE ON public.sequences_master_sqm FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: steps_instance_sti update_steps_instance_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_steps_instance_updated_at BEFORE UPDATE ON public.steps_instance_sti FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: steps_master_stm update_steps_master_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_steps_master_updated_at BEFORE UPDATE ON public.steps_master_stm FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: teams_tms update_teams_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams_tms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: users_usr update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users_usr FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: users_usr update_users_usr_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_usr_updated_at BEFORE UPDATE ON public.users_usr FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: audit_log_aud fk_aud_usr_usr_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_aud
    ADD CONSTRAINT fk_aud_usr_usr_id FOREIGN KEY (usr_id) REFERENCES public.users_usr(usr_id);


--
-- Name: controls_instance_cti fk_controls_instance_cti_status; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.controls_instance_cti
    ADD CONSTRAINT fk_controls_instance_cti_status FOREIGN KEY (cti_status) REFERENCES public.status_sts(sts_id);


--
-- Name: controls_instance_cti fk_cti_ctm_ctm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.controls_instance_cti
    ADD CONSTRAINT fk_cti_ctm_ctm_id FOREIGN KEY (ctm_id) REFERENCES public.controls_master_ctm(ctm_id);


--
-- Name: controls_instance_cti fk_cti_phi_phi_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.controls_instance_cti
    ADD CONSTRAINT fk_cti_phi_phi_id FOREIGN KEY (phi_id) REFERENCES public.phases_instance_phi(phi_id);


--
-- Name: controls_instance_cti fk_cti_usr_biz_validator; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.controls_instance_cti
    ADD CONSTRAINT fk_cti_usr_biz_validator FOREIGN KEY (usr_id_biz_validator) REFERENCES public.users_usr(usr_id);


--
-- Name: controls_instance_cti fk_cti_usr_it_validator; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.controls_instance_cti
    ADD CONSTRAINT fk_cti_usr_it_validator FOREIGN KEY (usr_id_it_validator) REFERENCES public.users_usr(usr_id);


--
-- Name: controls_master_ctm fk_ctm_phm_phm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.controls_master_ctm
    ADD CONSTRAINT fk_ctm_phm_phm_id FOREIGN KEY (phm_id) REFERENCES public.phases_master_phm(phm_id);


--
-- Name: environments_env_x_applications_app fk_exa_app_app_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.environments_env_x_applications_app
    ADD CONSTRAINT fk_exa_app_app_id FOREIGN KEY (app_id) REFERENCES public.applications_app(app_id);


--
-- Name: environments_env_x_applications_app fk_exa_env_env_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.environments_env_x_applications_app
    ADD CONSTRAINT fk_exa_env_env_id FOREIGN KEY (env_id) REFERENCES public.environments_env(env_id);


--
-- Name: environments_env_x_iterations_ite fk_exi_enr_enr_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.environments_env_x_iterations_ite
    ADD CONSTRAINT fk_exi_enr_enr_id FOREIGN KEY (enr_id) REFERENCES public.environment_roles_enr(enr_id);


--
-- Name: environments_env_x_iterations_ite fk_exi_env_env_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.environments_env_x_iterations_ite
    ADD CONSTRAINT fk_exi_env_env_id FOREIGN KEY (env_id) REFERENCES public.environments_env(env_id);


--
-- Name: environments_env_x_iterations_ite fk_exi_ite_ite_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.environments_env_x_iterations_ite
    ADD CONSTRAINT fk_exi_ite_ite_id FOREIGN KEY (ite_id) REFERENCES public.iterations_ite(ite_id);


--
-- Name: instructions_instance_ini fk_ini_inm_inm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instructions_instance_ini
    ADD CONSTRAINT fk_ini_inm_inm_id FOREIGN KEY (inm_id) REFERENCES public.instructions_master_inm(inm_id);


--
-- Name: instructions_instance_ini fk_ini_sti_sti_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instructions_instance_ini
    ADD CONSTRAINT fk_ini_sti_sti_id FOREIGN KEY (sti_id) REFERENCES public.steps_instance_sti(sti_id);


--
-- Name: instructions_instance_ini fk_ini_usr_usr_id_completed_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instructions_instance_ini
    ADD CONSTRAINT fk_ini_usr_usr_id_completed_by FOREIGN KEY (usr_id_completed_by) REFERENCES public.users_usr(usr_id);


--
-- Name: instructions_master_inm fk_inm_ctm_ctm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instructions_master_inm
    ADD CONSTRAINT fk_inm_ctm_ctm_id FOREIGN KEY (ctm_id) REFERENCES public.controls_master_ctm(ctm_id);


--
-- Name: instructions_master_inm fk_inm_stm_stm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instructions_master_inm
    ADD CONSTRAINT fk_inm_stm_stm_id FOREIGN KEY (stm_id) REFERENCES public.steps_master_stm(stm_id);


--
-- Name: instructions_master_inm fk_inm_tms_tms_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instructions_master_inm
    ADD CONSTRAINT fk_inm_tms_tms_id FOREIGN KEY (tms_id) REFERENCES public.teams_tms(tms_id);


--
-- Name: iterations_ite fk_ite_itt_code; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iterations_ite
    ADD CONSTRAINT fk_ite_itt_code FOREIGN KEY (itt_code) REFERENCES public.iteration_types_itt(itt_code);


--
-- Name: iterations_ite fk_ite_mig_mig_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iterations_ite
    ADD CONSTRAINT fk_ite_mig_mig_id FOREIGN KEY (mig_id) REFERENCES public.migrations_mig(mig_id);


--
-- Name: iterations_ite fk_ite_plm_plm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iterations_ite
    ADD CONSTRAINT fk_ite_plm_plm_id FOREIGN KEY (plm_id) REFERENCES public.plans_master_plm(plm_id);


--
-- Name: iterations_ite fk_iterations_ite_status; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iterations_ite
    ADD CONSTRAINT fk_iterations_ite_status FOREIGN KEY (ite_status) REFERENCES public.status_sts(sts_id);


--
-- Name: labels_lbl_x_applications_app fk_lbl_x_app_app_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_applications_app
    ADD CONSTRAINT fk_lbl_x_app_app_id FOREIGN KEY (app_id) REFERENCES public.applications_app(app_id) ON DELETE CASCADE;


--
-- Name: labels_lbl_x_applications_app fk_lbl_x_app_lbl_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_applications_app
    ADD CONSTRAINT fk_lbl_x_app_lbl_id FOREIGN KEY (lbl_id) REFERENCES public.labels_lbl(lbl_id) ON DELETE CASCADE;


--
-- Name: labels_lbl_x_controls_master_ctm fk_lbl_x_ctm_ctm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_controls_master_ctm
    ADD CONSTRAINT fk_lbl_x_ctm_ctm_id FOREIGN KEY (ctm_id) REFERENCES public.controls_master_ctm(ctm_id) ON DELETE CASCADE;


--
-- Name: labels_lbl_x_controls_master_ctm fk_lbl_x_ctm_lbl_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_controls_master_ctm
    ADD CONSTRAINT fk_lbl_x_ctm_lbl_id FOREIGN KEY (lbl_id) REFERENCES public.labels_lbl(lbl_id) ON DELETE CASCADE;


--
-- Name: labels_lbl_x_steps_master_stm fk_lbl_x_stm_lbl_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_steps_master_stm
    ADD CONSTRAINT fk_lbl_x_stm_lbl_id FOREIGN KEY (lbl_id) REFERENCES public.labels_lbl(lbl_id) ON DELETE CASCADE;


--
-- Name: labels_lbl_x_steps_master_stm fk_lbl_x_stm_stm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_steps_master_stm
    ADD CONSTRAINT fk_lbl_x_stm_stm_id FOREIGN KEY (stm_id) REFERENCES public.steps_master_stm(stm_id) ON DELETE CASCADE;


--
-- Name: migrations_mig fk_mig_usr_usr_id_owner; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations_mig
    ADD CONSTRAINT fk_mig_usr_usr_id_owner FOREIGN KEY (usr_id_owner) REFERENCES public.users_usr(usr_id);


--
-- Name: migrations_mig fk_migrations_mig_status; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations_mig
    ADD CONSTRAINT fk_migrations_mig_status FOREIGN KEY (mig_status) REFERENCES public.status_sts(sts_id);


--
-- Name: phases_instance_phi fk_phases_instance_phi_status; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phases_instance_phi
    ADD CONSTRAINT fk_phases_instance_phi_status FOREIGN KEY (phi_status) REFERENCES public.status_sts(sts_id);


--
-- Name: phases_instance_phi fk_phi_phm_phm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phases_instance_phi
    ADD CONSTRAINT fk_phi_phm_phm_id FOREIGN KEY (phm_id) REFERENCES public.phases_master_phm(phm_id);


--
-- Name: phases_instance_phi fk_phi_sqi_sqi_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phases_instance_phi
    ADD CONSTRAINT fk_phi_sqi_sqi_id FOREIGN KEY (sqi_id) REFERENCES public.sequences_instance_sqi(sqi_id);


--
-- Name: phases_master_phm fk_phm_phm_predecessor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phases_master_phm
    ADD CONSTRAINT fk_phm_phm_predecessor FOREIGN KEY (predecessor_phm_id) REFERENCES public.phases_master_phm(phm_id);


--
-- Name: phases_master_phm fk_phm_sqm_sqm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phases_master_phm
    ADD CONSTRAINT fk_phm_sqm_sqm_id FOREIGN KEY (sqm_id) REFERENCES public.sequences_master_sqm(sqm_id);


--
-- Name: plans_instance_pli fk_plans_instance_pli_status; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans_instance_pli
    ADD CONSTRAINT fk_plans_instance_pli_status FOREIGN KEY (pli_status) REFERENCES public.status_sts(sts_id);


--
-- Name: plans_master_plm fk_plans_master_plm_status; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans_master_plm
    ADD CONSTRAINT fk_plans_master_plm_status FOREIGN KEY (plm_status) REFERENCES public.status_sts(sts_id);


--
-- Name: plans_instance_pli fk_pli_ite_ite_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans_instance_pli
    ADD CONSTRAINT fk_pli_ite_ite_id FOREIGN KEY (ite_id) REFERENCES public.iterations_ite(ite_id);


--
-- Name: plans_instance_pli fk_pli_plm_plm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans_instance_pli
    ADD CONSTRAINT fk_pli_plm_plm_id FOREIGN KEY (plm_id) REFERENCES public.plans_master_plm(plm_id);


--
-- Name: plans_instance_pli fk_pli_usr_usr_id_owner; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans_instance_pli
    ADD CONSTRAINT fk_pli_usr_usr_id_owner FOREIGN KEY (usr_id_owner) REFERENCES public.users_usr(usr_id);


--
-- Name: plans_master_plm fk_plm_tms_tms_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans_master_plm
    ADD CONSTRAINT fk_plm_tms_tms_id FOREIGN KEY (tms_id) REFERENCES public.teams_tms(tms_id);


--
-- Name: system_configuration_scf fk_scf_env_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configuration_scf
    ADD CONSTRAINT fk_scf_env_id FOREIGN KEY (env_id) REFERENCES public.environments_env(env_id);


--
-- Name: sequences_instance_sqi fk_sequences_instance_sqi_status; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequences_instance_sqi
    ADD CONSTRAINT fk_sequences_instance_sqi_status FOREIGN KEY (sqi_status) REFERENCES public.status_sts(sts_id);


--
-- Name: sequences_instance_sqi fk_sqi_pli_pli_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequences_instance_sqi
    ADD CONSTRAINT fk_sqi_pli_pli_id FOREIGN KEY (pli_id) REFERENCES public.plans_instance_pli(pli_id);


--
-- Name: sequences_instance_sqi fk_sqi_sqm_sqm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequences_instance_sqi
    ADD CONSTRAINT fk_sqi_sqm_sqm_id FOREIGN KEY (sqm_id) REFERENCES public.sequences_master_sqm(sqm_id);


--
-- Name: sequences_master_sqm fk_sqm_plm_plm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequences_master_sqm
    ADD CONSTRAINT fk_sqm_plm_plm_id FOREIGN KEY (plm_id) REFERENCES public.plans_master_plm(plm_id);


--
-- Name: sequences_master_sqm fk_sqm_sqm_predecessor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequences_master_sqm
    ADD CONSTRAINT fk_sqm_sqm_predecessor FOREIGN KEY (predecessor_sqm_id) REFERENCES public.sequences_master_sqm(sqm_id);


--
-- Name: steps_instance_sti fk_steps_instance_sti_environment_roles_enr; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_instance_sti
    ADD CONSTRAINT fk_steps_instance_sti_environment_roles_enr FOREIGN KEY (enr_id) REFERENCES public.environment_roles_enr(enr_id);


--
-- Name: steps_instance_sti fk_steps_instance_sti_status; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_instance_sti
    ADD CONSTRAINT fk_steps_instance_sti_status FOREIGN KEY (sti_status) REFERENCES public.status_sts(sts_id);


--
-- Name: steps_master_stm fk_steps_master_stm_environment_roles_enr; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_master_stm
    ADD CONSTRAINT fk_steps_master_stm_environment_roles_enr FOREIGN KEY (enr_id) REFERENCES public.environment_roles_enr(enr_id);


--
-- Name: stg_step_instructions fk_stg_step_instructions_stg_steps_step_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_step_instructions
    ADD CONSTRAINT fk_stg_step_instructions_stg_steps_step_id FOREIGN KEY (step_id) REFERENCES public.stg_steps(id) ON DELETE CASCADE;


--
-- Name: steps_instance_sti fk_sti_phi_phi_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_instance_sti
    ADD CONSTRAINT fk_sti_phi_phi_id FOREIGN KEY (phi_id) REFERENCES public.phases_instance_phi(phi_id);


--
-- Name: steps_instance_sti fk_sti_stm_stm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_instance_sti
    ADD CONSTRAINT fk_sti_stm_stm_id FOREIGN KEY (stm_id) REFERENCES public.steps_master_stm(stm_id);


--
-- Name: steps_master_stm fk_stm_enr_target; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_master_stm
    ADD CONSTRAINT fk_stm_enr_target FOREIGN KEY (enr_id_target) REFERENCES public.environment_roles_enr(enr_id);


--
-- Name: steps_master_stm_x_iteration_types_itt fk_stm_itt_itt_code; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_master_stm_x_iteration_types_itt
    ADD CONSTRAINT fk_stm_itt_itt_code FOREIGN KEY (itt_code) REFERENCES public.iteration_types_itt(itt_code) ON DELETE CASCADE;


--
-- Name: steps_master_stm_x_iteration_types_itt fk_stm_itt_stm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_master_stm_x_iteration_types_itt
    ADD CONSTRAINT fk_stm_itt_stm_id FOREIGN KEY (stm_id) REFERENCES public.steps_master_stm(stm_id) ON DELETE CASCADE;


--
-- Name: steps_master_stm fk_stm_phm_phm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_master_stm
    ADD CONSTRAINT fk_stm_phm_phm_id FOREIGN KEY (phm_id) REFERENCES public.phases_master_phm(phm_id);


--
-- Name: steps_master_stm fk_stm_stm_predecessor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_master_stm
    ADD CONSTRAINT fk_stm_stm_predecessor FOREIGN KEY (stm_id_predecessor) REFERENCES public.steps_master_stm(stm_id);


--
-- Name: steps_master_stm fk_stm_stt_code; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_master_stm
    ADD CONSTRAINT fk_stm_stt_code FOREIGN KEY (stt_code) REFERENCES public.step_types_stt(stt_code);


--
-- Name: steps_master_stm_x_teams_tms_impacted fk_stm_tms_impacted_stm; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_master_stm_x_teams_tms_impacted
    ADD CONSTRAINT fk_stm_tms_impacted_stm FOREIGN KEY (stm_id) REFERENCES public.steps_master_stm(stm_id) ON DELETE CASCADE;


--
-- Name: steps_master_stm_x_teams_tms_impacted fk_stm_tms_impacted_tms; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_master_stm_x_teams_tms_impacted
    ADD CONSTRAINT fk_stm_tms_impacted_tms FOREIGN KEY (tms_id) REFERENCES public.teams_tms(tms_id) ON DELETE CASCADE;


--
-- Name: steps_master_stm fk_stm_tms_owner; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_master_stm
    ADD CONSTRAINT fk_stm_tms_owner FOREIGN KEY (tms_id_owner) REFERENCES public.teams_tms(tms_id);


--
-- Name: teams_tms_x_users_usr fk_tms_x_usr_tms_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams_tms_x_users_usr
    ADD CONSTRAINT fk_tms_x_usr_tms_id FOREIGN KEY (tms_id) REFERENCES public.teams_tms(tms_id) ON DELETE CASCADE;


--
-- Name: teams_tms_x_users_usr fk_tms_x_usr_usr_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams_tms_x_users_usr
    ADD CONSTRAINT fk_tms_x_usr_usr_id FOREIGN KEY (usr_id) REFERENCES public.users_usr(usr_id) ON DELETE CASCADE;


--
-- Name: teams_tms_x_applications_app fk_txa_app_app_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams_tms_x_applications_app
    ADD CONSTRAINT fk_txa_app_app_id FOREIGN KEY (app_id) REFERENCES public.applications_app(app_id);


--
-- Name: teams_tms_x_applications_app fk_txa_tms_tms_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams_tms_x_applications_app
    ADD CONSTRAINT fk_txa_tms_tms_id FOREIGN KEY (tms_id) REFERENCES public.teams_tms(tms_id);


--
-- Name: users_usr fk_usr_rls_rls_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_usr
    ADD CONSTRAINT fk_usr_rls_rls_id FOREIGN KEY (rls_id) REFERENCES public.roles_rls(rls_id);


--
-- Name: import_batches_imb import_batches_imb_ior_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_batches_imb
    ADD CONSTRAINT import_batches_imb_ior_id_fkey FOREIGN KEY (ior_id) REFERENCES public.stg_import_orchestrations_ior(ior_id) ON DELETE SET NULL;


--
-- Name: labels_lbl labels_lbl_mig_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl
    ADD CONSTRAINT labels_lbl_mig_id_fkey FOREIGN KEY (mig_id) REFERENCES public.migrations_mig(mig_id) ON DELETE CASCADE;


--
-- Name: labels_lbl_x_controls_master_ctm labels_lbl_x_controls_master_ctm_ctm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_controls_master_ctm
    ADD CONSTRAINT labels_lbl_x_controls_master_ctm_ctm_id_fkey FOREIGN KEY (ctm_id) REFERENCES public.controls_master_ctm(ctm_id) ON DELETE CASCADE;


--
-- Name: labels_lbl_x_controls_master_ctm labels_lbl_x_controls_master_ctm_lbl_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_controls_master_ctm
    ADD CONSTRAINT labels_lbl_x_controls_master_ctm_lbl_id_fkey FOREIGN KEY (lbl_id) REFERENCES public.labels_lbl(lbl_id) ON DELETE CASCADE;


--
-- Name: labels_lbl_x_steps_master_stm labels_lbl_x_steps_master_stm_lbl_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_steps_master_stm
    ADD CONSTRAINT labels_lbl_x_steps_master_stm_lbl_id_fkey FOREIGN KEY (lbl_id) REFERENCES public.labels_lbl(lbl_id) ON DELETE CASCADE;


--
-- Name: labels_lbl_x_steps_master_stm labels_lbl_x_steps_master_stm_stm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_steps_master_stm
    ADD CONSTRAINT labels_lbl_x_steps_master_stm_stm_id_fkey FOREIGN KEY (stm_id) REFERENCES public.steps_master_stm(stm_id) ON DELETE CASCADE;


--
-- Name: step_instance_comments_sic step_instance_comments_sic_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_instance_comments_sic
    ADD CONSTRAINT step_instance_comments_sic_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users_usr(usr_id);


--
-- Name: step_instance_comments_sic step_instance_comments_sic_sti_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_instance_comments_sic
    ADD CONSTRAINT step_instance_comments_sic_sti_id_fkey FOREIGN KEY (sti_id) REFERENCES public.steps_instance_sti(sti_id) ON DELETE CASCADE;


--
-- Name: step_instance_comments_sic step_instance_comments_sic_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_instance_comments_sic
    ADD CONSTRAINT step_instance_comments_sic_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users_usr(usr_id);


--
-- Name: step_pilot_comments_spc step_pilot_comments_spc_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_pilot_comments_spc
    ADD CONSTRAINT step_pilot_comments_spc_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users_usr(usr_id);


--
-- Name: step_pilot_comments_spc step_pilot_comments_spc_stm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_pilot_comments_spc
    ADD CONSTRAINT step_pilot_comments_spc_stm_id_fkey FOREIGN KEY (stm_id) REFERENCES public.steps_master_stm(stm_id) ON DELETE CASCADE;


--
-- Name: step_pilot_comments_spc step_pilot_comments_spc_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_pilot_comments_spc
    ADD CONSTRAINT step_pilot_comments_spc_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users_usr(usr_id);


--
-- Name: stg_import_progress_tracking_ipt stg_import_progress_tracking_ipt_ior_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_progress_tracking_ipt
    ADD CONSTRAINT stg_import_progress_tracking_ipt_ior_id_fkey FOREIGN KEY (ior_id) REFERENCES public.stg_import_orchestrations_ior(ior_id) ON DELETE CASCADE;


--
-- Name: stg_import_resource_locks_irl stg_import_resource_locks_irl_irl_locked_by_request_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_resource_locks_irl
    ADD CONSTRAINT stg_import_resource_locks_irl_irl_locked_by_request_fkey FOREIGN KEY (irl_locked_by_request) REFERENCES public.stg_import_queue_management_iqm(iqm_request_id);


--
-- Name: stg_import_rollback_actions_ira stg_import_rollback_actions_ira_imb_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_rollback_actions_ira
    ADD CONSTRAINT stg_import_rollback_actions_ira_imb_id_fkey FOREIGN KEY (imb_id) REFERENCES public.import_batches_imb(imb_id) ON DELETE SET NULL;


--
-- Name: stg_import_rollback_actions_ira stg_import_rollback_actions_ira_ior_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_rollback_actions_ira
    ADD CONSTRAINT stg_import_rollback_actions_ira_ior_id_fkey FOREIGN KEY (ior_id) REFERENCES public.stg_import_orchestrations_ior(ior_id) ON DELETE CASCADE;


--
-- Name: stg_schedule_execution_history_seh stg_schedule_execution_history_seh_sis_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_schedule_execution_history_seh
    ADD CONSTRAINT stg_schedule_execution_history_seh_sis_id_fkey FOREIGN KEY (sis_id) REFERENCES public.stg_scheduled_import_schedules_sis(sis_id) ON DELETE CASCADE;


--
-- Name: stg_schedule_resource_reservations_srr stg_schedule_resource_reservations_srr_sis_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_schedule_resource_reservations_srr
    ADD CONSTRAINT stg_schedule_resource_reservations_srr_sis_id_fkey FOREIGN KEY (sis_id) REFERENCES public.stg_scheduled_import_schedules_sis(sis_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict FpZ1h8lnS4WxaqdLqaqHpALnqpqACGtOP7asEGOgK4UIxkkp2fvJI6UG3jLhebL

