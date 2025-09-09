--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18
-- Dumped by pg_dump version 14.18

-- Started on 2025-09-09 10:59:01 UTC

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
-- TOC entry 293 (class 1255 OID 83314)
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
-- TOC entry 4230 (class 0 OID 0)
-- Dependencies: 293
-- Name: FUNCTION get_user_code(email_input character varying); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_code(email_input character varying) IS 'Helper function to retrieve user trigram (usr_code) from email for audit fields';


--
-- TOC entry 292 (class 1255 OID 83281)
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
-- TOC entry 291 (class 1255 OID 83147)
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
-- TOC entry 212 (class 1259 OID 82445)
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
-- TOC entry 211 (class 1259 OID 82444)
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
-- TOC entry 4231 (class 0 OID 0)
-- Dependencies: 211
-- Name: applications_app_app_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.applications_app_app_id_seq OWNED BY public.applications_app.app_id;


--
-- TOC entry 245 (class 1259 OID 82914)
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
-- TOC entry 4232 (class 0 OID 0)
-- Dependencies: 245
-- Name: TABLE audit_log_aud; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.audit_log_aud IS 'Logs all major events like status changes, assignments, and comments for full traceability.';


--
-- TOC entry 4233 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN audit_log_aud.aud_details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_log_aud.aud_details IS 'Stores JSON data capturing the state change, e.g., { "from_status": "PENDING", "to_status": "IN_PROGRESS" }.';


--
-- TOC entry 244 (class 1259 OID 82913)
-- Name: audit_log_aud_aud_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_log_aud_aud_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4234 (class 0 OID 0)
-- Dependencies: 244
-- Name: audit_log_aud_aud_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_log_aud_aud_id_seq OWNED BY public.audit_log_aud.aud_id;


--
-- TOC entry 239 (class 1259 OID 82822)
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
-- TOC entry 4235 (class 0 OID 0)
-- Dependencies: 239
-- Name: TABLE controls_instance_cti; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.controls_instance_cti IS 'Control instances linked to phase instances per ADR-016 - controls are phase-level quality gates';


--
-- TOC entry 4236 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN controls_instance_cti.phi_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.controls_instance_cti.phi_id IS 'Reference to the phase instance this control point belongs to';


--
-- TOC entry 4237 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN controls_instance_cti.cti_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.controls_instance_cti.cti_order IS 'Override order for the control instance (copied from master by default)';


--
-- TOC entry 4238 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN controls_instance_cti.cti_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.controls_instance_cti.cti_name IS 'Override name for the control instance (copied from master by default)';


--
-- TOC entry 4239 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN controls_instance_cti.cti_description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.controls_instance_cti.cti_description IS 'Override description for the control instance (copied from master by default)';


--
-- TOC entry 4240 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN controls_instance_cti.cti_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.controls_instance_cti.cti_type IS 'Override type for the control instance (copied from master by default)';


--
-- TOC entry 4241 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN controls_instance_cti.cti_is_critical; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.controls_instance_cti.cti_is_critical IS 'Override criticality for the control instance (copied from master by default)';


--
-- TOC entry 4242 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN controls_instance_cti.cti_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.controls_instance_cti.cti_code IS 'Override code for the control instance (copied from master by default)';


--
-- TOC entry 4243 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN controls_instance_cti.cti_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.controls_instance_cti.cti_status IS 'Status ID referencing status_sts table (normalized from VARCHAR)';


--
-- TOC entry 232 (class 1259 OID 82678)
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
-- TOC entry 209 (class 1259 OID 82434)
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
-- TOC entry 210 (class 1259 OID 82439)
-- Name: databasechangeloglock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.databasechangeloglock (
    id integer NOT NULL,
    locked boolean NOT NULL,
    lockgranted timestamp without time zone,
    lockedby character varying(255)
);


--
-- TOC entry 263 (class 1259 OID 83149)
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
    CONSTRAINT email_templates_emt_emt_type_check CHECK (((emt_type)::text = ANY ((ARRAY['STEP_OPENED'::character varying, 'INSTRUCTION_COMPLETED'::character varying, 'INSTRUCTION_UNCOMPLETED'::character varying, 'STEP_STATUS_CHANGED'::character varying, 'STEP_NOTIFICATION_MOBILE'::character varying, 'STEP_STATUS_CHANGED_WITH_URL'::character varying, 'STEP_OPENED_WITH_URL'::character varying, 'INSTRUCTION_COMPLETED_WITH_URL'::character varying, 'CUSTOM'::character varying])::text[])))
);


--
-- TOC entry 4244 (class 0 OID 0)
-- Dependencies: 263
-- Name: TABLE email_templates_emt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.email_templates_emt IS 'Stores HTML email templates for various notification types in UMIG';


--
-- TOC entry 4245 (class 0 OID 0)
-- Dependencies: 263
-- Name: COLUMN email_templates_emt.emt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.email_templates_emt.emt_id IS 'Unique identifier for the email template';


--
-- TOC entry 4246 (class 0 OID 0)
-- Dependencies: 263
-- Name: COLUMN email_templates_emt.emt_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.email_templates_emt.emt_name IS 'Human-readable name for the template (must be unique)';


--
-- TOC entry 4247 (class 0 OID 0)
-- Dependencies: 263
-- Name: COLUMN email_templates_emt.emt_subject; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.email_templates_emt.emt_subject IS 'Email subject line with optional placeholders';


--
-- TOC entry 4248 (class 0 OID 0)
-- Dependencies: 263
-- Name: COLUMN email_templates_emt.emt_body_html; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.email_templates_emt.emt_body_html IS 'HTML body content with Groovy GString placeholders';


--
-- TOC entry 4249 (class 0 OID 0)
-- Dependencies: 263
-- Name: COLUMN email_templates_emt.emt_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.email_templates_emt.emt_type IS 'Type of notification this template is for (STEP_OPENED, INSTRUCTION_COMPLETED, INSTRUCTION_UNCOMPLETED, STEP_STATUS_CHANGED, CUSTOM)';


--
-- TOC entry 4250 (class 0 OID 0)
-- Dependencies: 263
-- Name: COLUMN email_templates_emt.emt_is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.email_templates_emt.emt_is_active IS 'Whether this template is currently active';


--
-- TOC entry 228 (class 1259 OID 82613)
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
-- TOC entry 227 (class 1259 OID 82612)
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
-- TOC entry 4251 (class 0 OID 0)
-- Dependencies: 227
-- Name: environment_roles_enr_enr_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.environment_roles_enr_enr_id_seq OWNED BY public.environment_roles_enr.enr_id;


--
-- TOC entry 214 (class 1259 OID 82456)
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
-- TOC entry 213 (class 1259 OID 82455)
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
-- TOC entry 4252 (class 0 OID 0)
-- Dependencies: 213
-- Name: environments_env_env_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.environments_env_env_id_seq OWNED BY public.environments_env.env_id;


--
-- TOC entry 241 (class 1259 OID 82863)
-- Name: environments_env_x_applications_app; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.environments_env_x_applications_app (
    env_id integer NOT NULL,
    app_id integer NOT NULL
);


--
-- TOC entry 242 (class 1259 OID 82878)
-- Name: environments_env_x_iterations_ite; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.environments_env_x_iterations_ite (
    env_id integer NOT NULL,
    ite_id uuid NOT NULL,
    enr_id integer NOT NULL
);


--
-- TOC entry 267 (class 1259 OID 83415)
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
-- TOC entry 4253 (class 0 OID 0)
-- Dependencies: 267
-- Name: TABLE import_batches_imb; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.import_batches_imb IS 'Tracks import operations for audit trail and rollback capability';


--
-- TOC entry 4254 (class 0 OID 0)
-- Dependencies: 267
-- Name: COLUMN import_batches_imb.imb_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_batches_imb.imb_id IS 'Unique identifier for the import batch';


--
-- TOC entry 4255 (class 0 OID 0)
-- Dependencies: 267
-- Name: COLUMN import_batches_imb.imb_source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_batches_imb.imb_source IS 'Source of the import (filename, API, etc.)';


--
-- TOC entry 4256 (class 0 OID 0)
-- Dependencies: 267
-- Name: COLUMN import_batches_imb.imb_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_batches_imb.imb_type IS 'Type of import (JSON_IMPORT, CSV_IMPORT, etc.)';


--
-- TOC entry 4257 (class 0 OID 0)
-- Dependencies: 267
-- Name: COLUMN import_batches_imb.imb_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_batches_imb.imb_status IS 'Status: IN_PROGRESS, COMPLETED, FAILED, ROLLED_BACK';


--
-- TOC entry 4258 (class 0 OID 0)
-- Dependencies: 267
-- Name: COLUMN import_batches_imb.imb_statistics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_batches_imb.imb_statistics IS 'JSON statistics about the import (counts, etc.)';


--
-- TOC entry 238 (class 1259 OID 82800)
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
-- TOC entry 4259 (class 0 OID 0)
-- Dependencies: 238
-- Name: COLUMN instructions_instance_ini.tms_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instructions_instance_ini.tms_id IS 'Override template step ID for the instruction instance (copied from master by default)';


--
-- TOC entry 4260 (class 0 OID 0)
-- Dependencies: 238
-- Name: COLUMN instructions_instance_ini.cti_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instructions_instance_ini.cti_id IS 'Override custom template ID for the instruction instance (copied from master by default)';


--
-- TOC entry 4261 (class 0 OID 0)
-- Dependencies: 238
-- Name: COLUMN instructions_instance_ini.ini_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instructions_instance_ini.ini_order IS 'Override order for the instruction instance (copied from master by default)';


--
-- TOC entry 4262 (class 0 OID 0)
-- Dependencies: 238
-- Name: COLUMN instructions_instance_ini.ini_body; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instructions_instance_ini.ini_body IS 'Override body for the instruction instance (copied from master by default)';


--
-- TOC entry 4263 (class 0 OID 0)
-- Dependencies: 238
-- Name: COLUMN instructions_instance_ini.ini_duration_minutes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instructions_instance_ini.ini_duration_minutes IS 'Override duration for the instruction instance (copied from master by default)';


--
-- TOC entry 233 (class 1259 OID 82692)
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
-- TOC entry 223 (class 1259 OID 82544)
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
-- TOC entry 224 (class 1259 OID 82549)
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
-- TOC entry 4264 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN iterations_ite.ite_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.iterations_ite.ite_status IS 'Status ID referencing status_sts table (normalized from VARCHAR)';


--
-- TOC entry 251 (class 1259 OID 82982)
-- Name: labels_lbl; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.labels_lbl (
    lbl_id integer NOT NULL,
    mig_id uuid NOT NULL,
    lbl_name text NOT NULL,
    lbl_description text,
    lbl_color character varying(7),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255) DEFAULT 'system'::character varying,
    updated_by character varying(255) DEFAULT 'system'::character varying,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 4265 (class 0 OID 0)
-- Dependencies: 251
-- Name: COLUMN labels_lbl.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.labels_lbl.created_at IS 'Timestamp when record was created';


--
-- TOC entry 4266 (class 0 OID 0)
-- Dependencies: 251
-- Name: COLUMN labels_lbl.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.labels_lbl.created_by IS 'User trigram (usr_code) or system/generator/migration identifier';


--
-- TOC entry 4267 (class 0 OID 0)
-- Dependencies: 251
-- Name: COLUMN labels_lbl.updated_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.labels_lbl.updated_by IS 'User trigram (usr_code) who last updated the record';


--
-- TOC entry 4268 (class 0 OID 0)
-- Dependencies: 251
-- Name: COLUMN labels_lbl.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.labels_lbl.updated_at IS 'Timestamp when record was last updated';


--
-- TOC entry 250 (class 1259 OID 82981)
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
-- TOC entry 4269 (class 0 OID 0)
-- Dependencies: 250
-- Name: labels_lbl_lbl_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.labels_lbl_lbl_id_seq OWNED BY public.labels_lbl.lbl_id;


--
-- TOC entry 255 (class 1259 OID 83029)
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
-- TOC entry 4270 (class 0 OID 0)
-- Dependencies: 255
-- Name: TABLE labels_lbl_x_applications_app; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.labels_lbl_x_applications_app IS 'TIER 2 ASSOCIATION: Label-Application associations with minimal audit';


--
-- TOC entry 4271 (class 0 OID 0)
-- Dependencies: 255
-- Name: COLUMN labels_lbl_x_applications_app.lbl_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.labels_lbl_x_applications_app.lbl_id IS 'References labels_lbl (label definition).';


--
-- TOC entry 4272 (class 0 OID 0)
-- Dependencies: 255
-- Name: COLUMN labels_lbl_x_applications_app.app_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.labels_lbl_x_applications_app.app_id IS 'References applications_app (application).';


--
-- TOC entry 254 (class 1259 OID 83028)
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
-- TOC entry 4273 (class 0 OID 0)
-- Dependencies: 254
-- Name: labels_lbl_x_applications_app_lbl_x_app_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.labels_lbl_x_applications_app_lbl_x_app_id_seq OWNED BY public.labels_lbl_x_applications_app.lbl_x_app_id;


--
-- TOC entry 259 (class 1259 OID 83071)
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
-- TOC entry 4274 (class 0 OID 0)
-- Dependencies: 259
-- Name: TABLE labels_lbl_x_controls_master_ctm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.labels_lbl_x_controls_master_ctm IS 'TIER 2 ASSOCIATION: Label-Control associations with minimal audit';


--
-- TOC entry 258 (class 1259 OID 83070)
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
-- TOC entry 4275 (class 0 OID 0)
-- Dependencies: 258
-- Name: labels_lbl_x_controls_master_ctm_lbl_x_ctm_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.labels_lbl_x_controls_master_ctm_lbl_x_ctm_id_seq OWNED BY public.labels_lbl_x_controls_master_ctm.lbl_x_ctm_id;


--
-- TOC entry 253 (class 1259 OID 82999)
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
-- TOC entry 4276 (class 0 OID 0)
-- Dependencies: 253
-- Name: TABLE labels_lbl_x_steps_master_stm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.labels_lbl_x_steps_master_stm IS 'TIER 2 ASSOCIATION: Label-Step associations with minimal audit (created_at, created_by for legacy support)';


--
-- TOC entry 252 (class 1259 OID 82998)
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
-- TOC entry 4277 (class 0 OID 0)
-- Dependencies: 252
-- Name: labels_lbl_x_steps_master_stm_lbl_x_stm_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.labels_lbl_x_steps_master_stm_lbl_x_stm_id_seq OWNED BY public.labels_lbl_x_steps_master_stm.lbl_x_stm_id;


--
-- TOC entry 290 (class 1259 OID 83667)
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
-- TOC entry 4278 (class 0 OID 0)
-- Dependencies: 290
-- Name: TABLE migration_types_mit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.migration_types_mit IS 'US-042: Master configuration table for release types. Defines available release type templates with visual and management properties.';


--
-- TOC entry 4279 (class 0 OID 0)
-- Dependencies: 290
-- Name: COLUMN migration_types_mit.mit_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.migration_types_mit.mit_id IS 'Primary key - auto-incrementing ID';


--
-- TOC entry 4280 (class 0 OID 0)
-- Dependencies: 290
-- Name: COLUMN migration_types_mit.mit_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.migration_types_mit.mit_code IS 'Unique business code for migration type (e.g., INFRA, APP, DATA)';


--
-- TOC entry 4281 (class 0 OID 0)
-- Dependencies: 290
-- Name: COLUMN migration_types_mit.mit_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.migration_types_mit.mit_name IS 'Human-readable name for migration type';


--
-- TOC entry 4282 (class 0 OID 0)
-- Dependencies: 290
-- Name: COLUMN migration_types_mit.mit_description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.migration_types_mit.mit_description IS 'Detailed description of migration type purpose and usage';


--
-- TOC entry 4283 (class 0 OID 0)
-- Dependencies: 290
-- Name: COLUMN migration_types_mit.mit_color; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.migration_types_mit.mit_color IS 'Hex color code for UI representation (#RRGGBB format)';


--
-- TOC entry 4284 (class 0 OID 0)
-- Dependencies: 290
-- Name: COLUMN migration_types_mit.mit_icon; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.migration_types_mit.mit_icon IS 'Icon identifier for UI representation (Font Awesome style)';


--
-- TOC entry 4285 (class 0 OID 0)
-- Dependencies: 290
-- Name: COLUMN migration_types_mit.mit_display_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.migration_types_mit.mit_display_order IS 'Sort order for UI display (lower numbers first)';


--
-- TOC entry 4286 (class 0 OID 0)
-- Dependencies: 290
-- Name: COLUMN migration_types_mit.mit_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.migration_types_mit.mit_active IS 'Whether this migration type is available for selection';


--
-- TOC entry 289 (class 1259 OID 83666)
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
-- TOC entry 4287 (class 0 OID 0)
-- Dependencies: 289
-- Name: migration_types_mit_mit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migration_types_mit_mit_id_seq OWNED BY public.migration_types_mit.mit_id;


--
-- TOC entry 222 (class 1259 OID 82527)
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
-- TOC entry 4288 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN migrations_mig.mig_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.migrations_mig.mig_status IS 'Status ID referencing status_sts table (normalized from VARCHAR)';


--
-- TOC entry 236 (class 1259 OID 82758)
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
-- TOC entry 4289 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN phases_instance_phi.phi_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.phases_instance_phi.phi_order IS 'Override order for the phase instance (copied from master by default)';


--
-- TOC entry 4290 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN phases_instance_phi.phi_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.phases_instance_phi.phi_name IS 'Override name for the phase instance (copied from master by default)';


--
-- TOC entry 4291 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN phases_instance_phi.phi_description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.phases_instance_phi.phi_description IS 'Override description for the phase instance (copied from master by default)';


--
-- TOC entry 4292 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN phases_instance_phi.predecessor_phi_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.phases_instance_phi.predecessor_phi_id IS 'Override predecessor phase master ID for the instance (copied from master by default)';


--
-- TOC entry 4293 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN phases_instance_phi.phi_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.phases_instance_phi.phi_status IS 'Status ID referencing status_sts table (normalized from VARCHAR)';


--
-- TOC entry 226 (class 1259 OID 82594)
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
-- TOC entry 234 (class 1259 OID 82715)
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
-- TOC entry 4294 (class 0 OID 0)
-- Dependencies: 234
-- Name: COLUMN plans_instance_pli.pli_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plans_instance_pli.pli_status IS 'Status ID referencing status_sts table (normalized from VARCHAR)';


--
-- TOC entry 221 (class 1259 OID 82510)
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
-- TOC entry 4295 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN plans_master_plm.plm_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plans_master_plm.plm_status IS 'Status ID referencing status_sts table (normalized from VARCHAR)';


--
-- TOC entry 216 (class 1259 OID 82467)
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
-- TOC entry 215 (class 1259 OID 82466)
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
-- TOC entry 4296 (class 0 OID 0)
-- Dependencies: 215
-- Name: roles_rls_rls_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_rls_rls_id_seq OWNED BY public.roles_rls.rls_id;


--
-- TOC entry 235 (class 1259 OID 82742)
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
-- TOC entry 4297 (class 0 OID 0)
-- Dependencies: 235
-- Name: COLUMN sequences_instance_sqi.sqi_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sequences_instance_sqi.sqi_name IS 'Override name for the sequence instance (copied from master by default)';


--
-- TOC entry 4298 (class 0 OID 0)
-- Dependencies: 235
-- Name: COLUMN sequences_instance_sqi.sqi_description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sequences_instance_sqi.sqi_description IS 'Override description for the sequence instance (copied from master by default)';


--
-- TOC entry 4299 (class 0 OID 0)
-- Dependencies: 235
-- Name: COLUMN sequences_instance_sqi.sqi_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sequences_instance_sqi.sqi_order IS 'Override order for the sequence instance (copied from master by default)';


--
-- TOC entry 4300 (class 0 OID 0)
-- Dependencies: 235
-- Name: COLUMN sequences_instance_sqi.predecessor_sqi_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sequences_instance_sqi.predecessor_sqi_id IS 'Override predecessor sequence master ID for the instance (copied from master by default)';


--
-- TOC entry 4301 (class 0 OID 0)
-- Dependencies: 235
-- Name: COLUMN sequences_instance_sqi.sqi_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sequences_instance_sqi.sqi_status IS 'Status ID referencing status_sts table (normalized from VARCHAR)';


--
-- TOC entry 225 (class 1259 OID 82576)
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
-- TOC entry 265 (class 1259 OID 83178)
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
-- TOC entry 4302 (class 0 OID 0)
-- Dependencies: 265
-- Name: TABLE status_sts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.status_sts IS 'Centralized status management for all entity types with color coding';


--
-- TOC entry 4303 (class 0 OID 0)
-- Dependencies: 265
-- Name: COLUMN status_sts.sts_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.status_sts.sts_id IS 'Primary key for status records';


--
-- TOC entry 4304 (class 0 OID 0)
-- Dependencies: 265
-- Name: COLUMN status_sts.sts_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.status_sts.sts_name IS 'Status name (e.g., PENDING, IN_PROGRESS, COMPLETED)';


--
-- TOC entry 4305 (class 0 OID 0)
-- Dependencies: 265
-- Name: COLUMN status_sts.sts_color; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.status_sts.sts_color IS 'Hex color code for UI display (#RRGGBB format)';


--
-- TOC entry 4306 (class 0 OID 0)
-- Dependencies: 265
-- Name: COLUMN status_sts.sts_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.status_sts.sts_type IS 'Entity type this status applies to (Migration, Plan, Step, etc.)';


--
-- TOC entry 264 (class 1259 OID 83177)
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
-- TOC entry 4307 (class 0 OID 0)
-- Dependencies: 264
-- Name: status_sts_sts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.status_sts_sts_id_seq OWNED BY public.status_sts.sts_id;


--
-- TOC entry 249 (class 1259 OID 82956)
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
-- TOC entry 248 (class 1259 OID 82955)
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
-- TOC entry 4308 (class 0 OID 0)
-- Dependencies: 248
-- Name: step_instance_comments_sic_sic_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.step_instance_comments_sic_sic_id_seq OWNED BY public.step_instance_comments_sic.sic_id;


--
-- TOC entry 247 (class 1259 OID 82929)
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
-- TOC entry 246 (class 1259 OID 82928)
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
-- TOC entry 4309 (class 0 OID 0)
-- Dependencies: 246
-- Name: step_pilot_comments_spc_spc_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.step_pilot_comments_spc_spc_id_seq OWNED BY public.step_pilot_comments_spc.spc_id;


--
-- TOC entry 229 (class 1259 OID 82623)
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
-- TOC entry 237 (class 1259 OID 82774)
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
-- TOC entry 4310 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN steps_instance_sti.sti_id_predecessor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.steps_instance_sti.sti_id_predecessor IS 'Override predecessor step master ID for the instance (copied from master by default)';


--
-- TOC entry 4311 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN steps_instance_sti.sti_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.steps_instance_sti.sti_name IS 'Override name for the step instance (copied from master by default)';


--
-- TOC entry 4312 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN steps_instance_sti.sti_description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.steps_instance_sti.sti_description IS 'Override description for the step instance (copied from master by default)';


--
-- TOC entry 4313 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN steps_instance_sti.sti_duration_minutes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.steps_instance_sti.sti_duration_minutes IS 'Override duration for the step instance (copied from master by default)';


--
-- TOC entry 4314 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN steps_instance_sti.sti_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.steps_instance_sti.sti_status IS 'Status ID referencing status_sts table (normalized from VARCHAR)';


--
-- TOC entry 230 (class 1259 OID 82628)
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
-- TOC entry 231 (class 1259 OID 82663)
-- Name: steps_master_stm_x_iteration_types_itt; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.steps_master_stm_x_iteration_types_itt (
    stm_id uuid NOT NULL,
    itt_code character varying(10) NOT NULL
);


--
-- TOC entry 243 (class 1259 OID 82898)
-- Name: steps_master_stm_x_teams_tms_impacted; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.steps_master_stm_x_teams_tms_impacted (
    stm_id uuid NOT NULL,
    tms_id integer NOT NULL
);


--
-- TOC entry 275 (class 1259 OID 83503)
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
-- TOC entry 4315 (class 0 OID 0)
-- Dependencies: 275
-- Name: TABLE stg_import_entity_dependencies_ied; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stg_import_entity_dependencies_ied IS 'US-034: Manages entity import dependencies and validation for proper sequencing';


--
-- TOC entry 274 (class 1259 OID 83502)
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
-- TOC entry 4316 (class 0 OID 0)
-- Dependencies: 274
-- Name: stg_import_entity_dependencies_ied_ied_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stg_import_entity_dependencies_ied_ied_id_seq OWNED BY public.stg_import_entity_dependencies_ied.ied_id;


--
-- TOC entry 269 (class 1259 OID 83437)
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
-- TOC entry 4317 (class 0 OID 0)
-- Dependencies: 269
-- Name: TABLE stg_import_orchestrations_ior; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stg_import_orchestrations_ior IS 'US-034: Tracks complete import orchestration workflows with phase management and progress tracking';


--
-- TOC entry 271 (class 1259 OID 83456)
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
-- TOC entry 4318 (class 0 OID 0)
-- Dependencies: 271
-- Name: TABLE stg_import_progress_tracking_ipt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stg_import_progress_tracking_ipt IS 'US-034: Real-time progress tracking for import orchestrations with granular step monitoring';


--
-- TOC entry 270 (class 1259 OID 83455)
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
-- TOC entry 4319 (class 0 OID 0)
-- Dependencies: 270
-- Name: stg_import_progress_tracking_ipt_ipt_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stg_import_progress_tracking_ipt_ipt_id_seq OWNED BY public.stg_import_progress_tracking_ipt.ipt_id;


--
-- TOC entry 276 (class 1259 OID 83522)
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
-- TOC entry 4320 (class 0 OID 0)
-- Dependencies: 276
-- Name: TABLE stg_import_queue_management_iqm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stg_import_queue_management_iqm IS 'US-034: Manages concurrent import request queuing and coordination';


--
-- TOC entry 278 (class 1259 OID 83543)
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
-- TOC entry 4321 (class 0 OID 0)
-- Dependencies: 278
-- Name: TABLE stg_import_resource_locks_irl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stg_import_resource_locks_irl IS 'US-034: Prevents resource conflicts between concurrent import operations';


--
-- TOC entry 277 (class 1259 OID 83542)
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
-- TOC entry 4322 (class 0 OID 0)
-- Dependencies: 277
-- Name: stg_import_resource_locks_irl_irl_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stg_import_resource_locks_irl_irl_id_seq OWNED BY public.stg_import_resource_locks_irl.irl_id;


--
-- TOC entry 273 (class 1259 OID 83479)
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
-- TOC entry 4323 (class 0 OID 0)
-- Dependencies: 273
-- Name: TABLE stg_import_rollback_actions_ira; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stg_import_rollback_actions_ira IS 'US-034: Audit trail for all rollback operations with recovery data preservation';


--
-- TOC entry 272 (class 1259 OID 83478)
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
-- TOC entry 4324 (class 0 OID 0)
-- Dependencies: 272
-- Name: stg_import_rollback_actions_ira_ira_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stg_import_rollback_actions_ira_ira_id_seq OWNED BY public.stg_import_rollback_actions_ira.ira_id;


--
-- TOC entry 288 (class 1259 OID 83647)
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
-- TOC entry 4325 (class 0 OID 0)
-- Dependencies: 288
-- Name: TABLE stg_orchestration_dependencies_od; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stg_orchestration_dependencies_od IS 'US-034: Manages dependencies between import orchestrations';


--
-- TOC entry 287 (class 1259 OID 83646)
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
-- TOC entry 4326 (class 0 OID 0)
-- Dependencies: 287
-- Name: stg_orchestration_dependencies_od_od_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stg_orchestration_dependencies_od_od_id_seq OWNED BY public.stg_orchestration_dependencies_od.od_id;


--
-- TOC entry 282 (class 1259 OID 83594)
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
-- TOC entry 4327 (class 0 OID 0)
-- Dependencies: 282
-- Name: TABLE stg_schedule_execution_history_seh; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stg_schedule_execution_history_seh IS 'US-034: Audit trail for scheduled import executions';


--
-- TOC entry 281 (class 1259 OID 83593)
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
-- TOC entry 4328 (class 0 OID 0)
-- Dependencies: 281
-- Name: stg_schedule_execution_history_seh_seh_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stg_schedule_execution_history_seh_seh_id_seq OWNED BY public.stg_schedule_execution_history_seh.seh_id;


--
-- TOC entry 284 (class 1259 OID 83613)
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
-- TOC entry 4329 (class 0 OID 0)
-- Dependencies: 284
-- Name: TABLE stg_schedule_resource_reservations_srr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stg_schedule_resource_reservations_srr IS 'US-034: Resource reservations for scheduled imports';


--
-- TOC entry 283 (class 1259 OID 83612)
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
-- TOC entry 4330 (class 0 OID 0)
-- Dependencies: 283
-- Name: stg_schedule_resource_reservations_srr_srr_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stg_schedule_resource_reservations_srr_srr_id_seq OWNED BY public.stg_schedule_resource_reservations_srr.srr_id;


--
-- TOC entry 280 (class 1259 OID 83563)
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
-- TOC entry 4331 (class 0 OID 0)
-- Dependencies: 280
-- Name: TABLE stg_scheduled_import_schedules_sis; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stg_scheduled_import_schedules_sis IS 'US-034: Manages scheduled and recurring import operations';


--
-- TOC entry 279 (class 1259 OID 83562)
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
-- TOC entry 4332 (class 0 OID 0)
-- Dependencies: 279
-- Name: stg_scheduled_import_schedules_sis_sis_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stg_scheduled_import_schedules_sis_sis_id_seq OWNED BY public.stg_scheduled_import_schedules_sis.sis_id;


--
-- TOC entry 262 (class 1259 OID 83119)
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
-- TOC entry 4333 (class 0 OID 0)
-- Dependencies: 262
-- Name: TABLE stg_step_instructions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stg_step_instructions IS 'Staging: instructions détaillées pour chaque step.';


--
-- TOC entry 4334 (class 0 OID 0)
-- Dependencies: 262
-- Name: COLUMN stg_step_instructions.nominated_user; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stg_step_instructions.nominated_user IS 'User nominated for this instruction';


--
-- TOC entry 4335 (class 0 OID 0)
-- Dependencies: 262
-- Name: COLUMN stg_step_instructions.instruction_assigned_team; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stg_step_instructions.instruction_assigned_team IS 'Team assigned to this instruction';


--
-- TOC entry 4336 (class 0 OID 0)
-- Dependencies: 262
-- Name: COLUMN stg_step_instructions.associated_controls; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stg_step_instructions.associated_controls IS 'Control references associated with this instruction';


--
-- TOC entry 4337 (class 0 OID 0)
-- Dependencies: 262
-- Name: COLUMN stg_step_instructions.duration_minutes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stg_step_instructions.duration_minutes IS 'Estimated duration in minutes';


--
-- TOC entry 4338 (class 0 OID 0)
-- Dependencies: 262
-- Name: COLUMN stg_step_instructions.instruction_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stg_step_instructions.instruction_order IS 'Order of instruction within the step';


--
-- TOC entry 261 (class 1259 OID 83118)
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
-- TOC entry 260 (class 1259 OID 83109)
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
-- TOC entry 4339 (class 0 OID 0)
-- Dependencies: 260
-- Name: TABLE stg_steps; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stg_steps IS 'Staging: informations principales de chaque step importée (Confluence JSON).';


--
-- TOC entry 4340 (class 0 OID 0)
-- Dependencies: 260
-- Name: COLUMN stg_steps.step_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stg_steps.step_type IS 'Three-character step type code (e.g., IGO, CHK, DUM, TRT, BGO, BUS, GON, PRE, SYS)';


--
-- TOC entry 286 (class 1259 OID 83631)
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
-- TOC entry 4341 (class 0 OID 0)
-- Dependencies: 286
-- Name: TABLE stg_tenant_resource_limits_trl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stg_tenant_resource_limits_trl IS 'US-034: Multi-tenant resource limit enforcement';


--
-- TOC entry 285 (class 1259 OID 83630)
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
-- TOC entry 4342 (class 0 OID 0)
-- Dependencies: 285
-- Name: stg_tenant_resource_limits_trl_trl_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stg_tenant_resource_limits_trl_trl_id_seq OWNED BY public.stg_tenant_resource_limits_trl.trl_id;


--
-- TOC entry 266 (class 1259 OID 83368)
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
-- TOC entry 4343 (class 0 OID 0)
-- Dependencies: 266
-- Name: TABLE system_configuration_scf; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.system_configuration_scf IS 'Central configuration table for runtime system settings, Confluence macro locations, and environment-specific parameters';


--
-- TOC entry 4344 (class 0 OID 0)
-- Dependencies: 266
-- Name: COLUMN system_configuration_scf.scf_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configuration_scf.scf_key IS 'Unique configuration key within environment (e.g., stepview.confluence.space.key)';


--
-- TOC entry 4345 (class 0 OID 0)
-- Dependencies: 266
-- Name: COLUMN system_configuration_scf.scf_category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configuration_scf.scf_category IS 'Configuration category for organization (MACRO_LOCATION, API_CONFIG, SYSTEM_SETTING)';


--
-- TOC entry 4346 (class 0 OID 0)
-- Dependencies: 266
-- Name: COLUMN system_configuration_scf.scf_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configuration_scf.scf_value IS 'Configuration value as text (supports all data types)';


--
-- TOC entry 4347 (class 0 OID 0)
-- Dependencies: 266
-- Name: COLUMN system_configuration_scf.scf_is_system_managed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configuration_scf.scf_is_system_managed IS 'TRUE for configurations managed by system migrations/generators';


--
-- TOC entry 4348 (class 0 OID 0)
-- Dependencies: 266
-- Name: COLUMN system_configuration_scf.scf_data_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configuration_scf.scf_data_type IS 'Expected data type for validation (STRING, INTEGER, BOOLEAN, JSON, URL)';


--
-- TOC entry 4349 (class 0 OID 0)
-- Dependencies: 266
-- Name: COLUMN system_configuration_scf.scf_validation_pattern; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configuration_scf.scf_validation_pattern IS 'Regex pattern for value validation';


--
-- TOC entry 218 (class 1259 OID 82478)
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
-- TOC entry 4350 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN teams_tms.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teams_tms.created_by IS 'User trigram (usr_code) or system/generator/migration identifier';


--
-- TOC entry 4351 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN teams_tms.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teams_tms.created_at IS 'Timestamp when record was created';


--
-- TOC entry 4352 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN teams_tms.updated_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teams_tms.updated_by IS 'User trigram (usr_code) who last updated the record';


--
-- TOC entry 4353 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN teams_tms.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teams_tms.updated_at IS 'Timestamp when record was last updated';


--
-- TOC entry 217 (class 1259 OID 82477)
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
-- TOC entry 4354 (class 0 OID 0)
-- Dependencies: 217
-- Name: teams_tms_tms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.teams_tms_tms_id_seq OWNED BY public.teams_tms.tms_id;


--
-- TOC entry 240 (class 1259 OID 82848)
-- Name: teams_tms_x_applications_app; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams_tms_x_applications_app (
    tms_id integer NOT NULL,
    app_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 4355 (class 0 OID 0)
-- Dependencies: 240
-- Name: TABLE teams_tms_x_applications_app; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.teams_tms_x_applications_app IS 'TIER 2 ASSOCIATION: Team-Application links with minimal audit (created_at only)';


--
-- TOC entry 257 (class 1259 OID 83049)
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
-- TOC entry 4356 (class 0 OID 0)
-- Dependencies: 257
-- Name: TABLE teams_tms_x_users_usr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.teams_tms_x_users_usr IS 'TIER 1 ASSOCIATION: User-Team assignments with full audit tracking (created_at, created_by)';


--
-- TOC entry 4357 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN teams_tms_x_users_usr.tms_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teams_tms_x_users_usr.tms_id IS 'References teams_tms (team).';


--
-- TOC entry 4358 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN teams_tms_x_users_usr.usr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teams_tms_x_users_usr.usr_id IS 'References users_usr (user).';


--
-- TOC entry 256 (class 1259 OID 83048)
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
-- TOC entry 4359 (class 0 OID 0)
-- Dependencies: 256
-- Name: teams_tms_x_users_usr_tms_x_usr_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.teams_tms_x_users_usr_tms_x_usr_id_seq OWNED BY public.teams_tms_x_users_usr.tms_x_usr_id;


--
-- TOC entry 220 (class 1259 OID 82489)
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
-- TOC entry 4360 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN users_usr.usr_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users_usr.usr_active IS 'Indicates whether the user account is active (TRUE) or inactive (FALSE). Default is active.';


--
-- TOC entry 4361 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN users_usr.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users_usr.created_at IS 'Timestamp when record was created';


--
-- TOC entry 4362 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN users_usr.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users_usr.updated_at IS 'Timestamp when record was last updated';


--
-- TOC entry 4363 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN users_usr.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users_usr.created_by IS 'User trigram (usr_code) or system/generator/migration identifier';


--
-- TOC entry 4364 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN users_usr.updated_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users_usr.updated_by IS 'User trigram (usr_code) who last updated the record';


--
-- TOC entry 219 (class 1259 OID 82488)
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
-- TOC entry 4365 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_usr_usr_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_usr_usr_id_seq OWNED BY public.users_usr.usr_id;


--
-- TOC entry 268 (class 1259 OID 83432)
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
-- TOC entry 4366 (class 0 OID 0)
-- Dependencies: 268
-- Name: VIEW v_staging_validation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_staging_validation IS 'Validation view for staging data before promotion to master tables';


--
-- TOC entry 3501 (class 2604 OID 82448)
-- Name: applications_app app_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications_app ALTER COLUMN app_id SET DEFAULT nextval('public.applications_app_app_id_seq'::regclass);


--
-- TOC entry 3618 (class 2604 OID 82917)
-- Name: audit_log_aud aud_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_aud ALTER COLUMN aud_id SET DEFAULT nextval('public.audit_log_aud_aud_id_seq'::regclass);


--
-- TOC entry 3561 (class 2604 OID 82616)
-- Name: environment_roles_enr enr_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.environment_roles_enr ALTER COLUMN enr_id SET DEFAULT nextval('public.environment_roles_enr_enr_id_seq'::regclass);


--
-- TOC entry 3506 (class 2604 OID 82459)
-- Name: environments_env env_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.environments_env ALTER COLUMN env_id SET DEFAULT nextval('public.environments_env_env_id_seq'::regclass);


--
-- TOC entry 3625 (class 2604 OID 82985)
-- Name: labels_lbl lbl_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl ALTER COLUMN lbl_id SET DEFAULT nextval('public.labels_lbl_lbl_id_seq'::regclass);


--
-- TOC entry 3633 (class 2604 OID 83032)
-- Name: labels_lbl_x_applications_app lbl_x_app_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_applications_app ALTER COLUMN lbl_x_app_id SET DEFAULT nextval('public.labels_lbl_x_applications_app_lbl_x_app_id_seq'::regclass);


--
-- TOC entry 3639 (class 2604 OID 83074)
-- Name: labels_lbl_x_controls_master_ctm lbl_x_ctm_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_controls_master_ctm ALTER COLUMN lbl_x_ctm_id SET DEFAULT nextval('public.labels_lbl_x_controls_master_ctm_lbl_x_ctm_id_seq'::regclass);


--
-- TOC entry 3631 (class 2604 OID 83002)
-- Name: labels_lbl_x_steps_master_stm lbl_x_stm_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_steps_master_stm ALTER COLUMN lbl_x_stm_id SET DEFAULT nextval('public.labels_lbl_x_steps_master_stm_lbl_x_stm_id_seq'::regclass);


--
-- TOC entry 3760 (class 2604 OID 83670)
-- Name: migration_types_mit mit_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migration_types_mit ALTER COLUMN mit_id SET DEFAULT nextval('public.migration_types_mit_mit_id_seq'::regclass);


--
-- TOC entry 3511 (class 2604 OID 82470)
-- Name: roles_rls rls_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles_rls ALTER COLUMN rls_id SET DEFAULT nextval('public.roles_rls_rls_id_seq'::regclass);


--
-- TOC entry 3653 (class 2604 OID 83181)
-- Name: status_sts sts_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_sts ALTER COLUMN sts_id SET DEFAULT nextval('public.status_sts_sts_id_seq'::regclass);


--
-- TOC entry 3623 (class 2604 OID 82959)
-- Name: step_instance_comments_sic sic_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_instance_comments_sic ALTER COLUMN sic_id SET DEFAULT nextval('public.step_instance_comments_sic_sic_id_seq'::regclass);


--
-- TOC entry 3620 (class 2604 OID 82932)
-- Name: step_pilot_comments_spc spc_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_pilot_comments_spc ALTER COLUMN spc_id SET DEFAULT nextval('public.step_pilot_comments_spc_spc_id_seq'::regclass);


--
-- TOC entry 3700 (class 2604 OID 83506)
-- Name: stg_import_entity_dependencies_ied ied_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_entity_dependencies_ied ALTER COLUMN ied_id SET DEFAULT nextval('public.stg_import_entity_dependencies_ied_ied_id_seq'::regclass);


--
-- TOC entry 3688 (class 2604 OID 83459)
-- Name: stg_import_progress_tracking_ipt ipt_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_progress_tracking_ipt ALTER COLUMN ipt_id SET DEFAULT nextval('public.stg_import_progress_tracking_ipt_ipt_id_seq'::regclass);


--
-- TOC entry 3713 (class 2604 OID 83546)
-- Name: stg_import_resource_locks_irl irl_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_resource_locks_irl ALTER COLUMN irl_id SET DEFAULT nextval('public.stg_import_resource_locks_irl_irl_id_seq'::regclass);


--
-- TOC entry 3695 (class 2604 OID 83482)
-- Name: stg_import_rollback_actions_ira ira_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_rollback_actions_ira ALTER COLUMN ira_id SET DEFAULT nextval('public.stg_import_rollback_actions_ira_ira_id_seq'::regclass);


--
-- TOC entry 3755 (class 2604 OID 83650)
-- Name: stg_orchestration_dependencies_od od_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_orchestration_dependencies_od ALTER COLUMN od_id SET DEFAULT nextval('public.stg_orchestration_dependencies_od_od_id_seq'::regclass);


--
-- TOC entry 3737 (class 2604 OID 83597)
-- Name: stg_schedule_execution_history_seh seh_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_schedule_execution_history_seh ALTER COLUMN seh_id SET DEFAULT nextval('public.stg_schedule_execution_history_seh_seh_id_seq'::regclass);


--
-- TOC entry 3741 (class 2604 OID 83616)
-- Name: stg_schedule_resource_reservations_srr srr_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_schedule_resource_reservations_srr ALTER COLUMN srr_id SET DEFAULT nextval('public.stg_schedule_resource_reservations_srr_srr_id_seq'::regclass);


--
-- TOC entry 3719 (class 2604 OID 83566)
-- Name: stg_scheduled_import_schedules_sis sis_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_scheduled_import_schedules_sis ALTER COLUMN sis_id SET DEFAULT nextval('public.stg_scheduled_import_schedules_sis_sis_id_seq'::regclass);


--
-- TOC entry 3747 (class 2604 OID 83634)
-- Name: stg_tenant_resource_limits_trl trl_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_tenant_resource_limits_trl ALTER COLUMN trl_id SET DEFAULT nextval('public.stg_tenant_resource_limits_trl_trl_id_seq'::regclass);


--
-- TOC entry 3516 (class 2604 OID 82481)
-- Name: teams_tms tms_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams_tms ALTER COLUMN tms_id SET DEFAULT nextval('public.teams_tms_tms_id_seq'::regclass);


--
-- TOC entry 3636 (class 2604 OID 83052)
-- Name: teams_tms_x_users_usr tms_x_usr_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams_tms_x_users_usr ALTER COLUMN tms_x_usr_id SET DEFAULT nextval('public.teams_tms_x_users_usr_tms_x_usr_id_seq'::regclass);


--
-- TOC entry 3521 (class 2604 OID 82492)
-- Name: users_usr usr_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_usr ALTER COLUMN usr_id SET DEFAULT nextval('public.users_usr_usr_id_seq'::regclass);


--
-- TOC entry 3768 (class 2606 OID 82454)
-- Name: applications_app applications_app_app_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications_app
    ADD CONSTRAINT applications_app_app_code_key UNIQUE (app_code);


--
-- TOC entry 3770 (class 2606 OID 82452)
-- Name: applications_app applications_app_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications_app
    ADD CONSTRAINT applications_app_pkey PRIMARY KEY (app_id);


--
-- TOC entry 3867 (class 2606 OID 82922)
-- Name: audit_log_aud audit_log_aud_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_aud
    ADD CONSTRAINT audit_log_aud_pkey PRIMARY KEY (aud_id);


--
-- TOC entry 3855 (class 2606 OID 82827)
-- Name: controls_instance_cti controls_instance_cti_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.controls_instance_cti
    ADD CONSTRAINT controls_instance_cti_pkey PRIMARY KEY (cti_id);


--
-- TOC entry 3828 (class 2606 OID 82686)
-- Name: controls_master_ctm controls_master_ctm_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.controls_master_ctm
    ADD CONSTRAINT controls_master_ctm_pkey PRIMARY KEY (ctm_id);


--
-- TOC entry 3766 (class 2606 OID 82443)
-- Name: databasechangeloglock databasechangeloglock_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.databasechangeloglock
    ADD CONSTRAINT databasechangeloglock_pkey PRIMARY KEY (id);


--
-- TOC entry 3903 (class 2606 OID 83162)
-- Name: email_templates_emt email_templates_emt_emt_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates_emt
    ADD CONSTRAINT email_templates_emt_emt_name_key UNIQUE (emt_name);


--
-- TOC entry 3905 (class 2606 OID 83160)
-- Name: email_templates_emt email_templates_emt_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates_emt
    ADD CONSTRAINT email_templates_emt_pkey PRIMARY KEY (emt_id);


--
-- TOC entry 3814 (class 2606 OID 82622)
-- Name: environment_roles_enr environment_roles_enr_enr_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.environment_roles_enr
    ADD CONSTRAINT environment_roles_enr_enr_name_key UNIQUE (enr_name);


--
-- TOC entry 3816 (class 2606 OID 82620)
-- Name: environment_roles_enr environment_roles_enr_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.environment_roles_enr
    ADD CONSTRAINT environment_roles_enr_pkey PRIMARY KEY (enr_id);


--
-- TOC entry 3773 (class 2606 OID 82465)
-- Name: environments_env environments_env_env_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.environments_env
    ADD CONSTRAINT environments_env_env_code_key UNIQUE (env_code);


--
-- TOC entry 3775 (class 2606 OID 82463)
-- Name: environments_env environments_env_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.environments_env
    ADD CONSTRAINT environments_env_pkey PRIMARY KEY (env_id);


--
-- TOC entry 3861 (class 2606 OID 82867)
-- Name: environments_env_x_applications_app environments_env_x_applications_app_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.environments_env_x_applications_app
    ADD CONSTRAINT environments_env_x_applications_app_pkey PRIMARY KEY (env_id, app_id);


--
-- TOC entry 3863 (class 2606 OID 82882)
-- Name: environments_env_x_iterations_ite environments_env_x_iterations_ite_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.environments_env_x_iterations_ite
    ADD CONSTRAINT environments_env_x_iterations_ite_pkey PRIMARY KEY (env_id, ite_id);


--
-- TOC entry 3927 (class 2606 OID 83428)
-- Name: import_batches_imb import_batches_imb_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_batches_imb
    ADD CONSTRAINT import_batches_imb_pkey PRIMARY KEY (imb_id);


--
-- TOC entry 3853 (class 2606 OID 82806)
-- Name: instructions_instance_ini instructions_instance_ini_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instructions_instance_ini
    ADD CONSTRAINT instructions_instance_ini_pkey PRIMARY KEY (ini_id);


--
-- TOC entry 3834 (class 2606 OID 82699)
-- Name: instructions_master_inm instructions_master_inm_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instructions_master_inm
    ADD CONSTRAINT instructions_master_inm_pkey PRIMARY KEY (inm_id);


--
-- TOC entry 3803 (class 2606 OID 82548)
-- Name: iteration_types_itt iteration_types_itt_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iteration_types_itt
    ADD CONSTRAINT iteration_types_itt_pkey PRIMARY KEY (itt_code);


--
-- TOC entry 3806 (class 2606 OID 82560)
-- Name: iterations_ite iterations_ite_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iterations_ite
    ADD CONSTRAINT iterations_ite_pkey PRIMARY KEY (ite_id);


--
-- TOC entry 3876 (class 2606 OID 82990)
-- Name: labels_lbl labels_lbl_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl
    ADD CONSTRAINT labels_lbl_pkey PRIMARY KEY (lbl_id);


--
-- TOC entry 3884 (class 2606 OID 83035)
-- Name: labels_lbl_x_applications_app labels_lbl_x_applications_app_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_applications_app
    ADD CONSTRAINT labels_lbl_x_applications_app_pkey PRIMARY KEY (lbl_x_app_id);


--
-- TOC entry 3892 (class 2606 OID 83077)
-- Name: labels_lbl_x_controls_master_ctm labels_lbl_x_controls_master_ctm_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_controls_master_ctm
    ADD CONSTRAINT labels_lbl_x_controls_master_ctm_pkey PRIMARY KEY (lbl_x_ctm_id);


--
-- TOC entry 3880 (class 2606 OID 83005)
-- Name: labels_lbl_x_steps_master_stm labels_lbl_x_steps_master_stm_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_steps_master_stm
    ADD CONSTRAINT labels_lbl_x_steps_master_stm_pkey PRIMARY KEY (lbl_x_stm_id);


--
-- TOC entry 3981 (class 2606 OID 83682)
-- Name: migration_types_mit migration_types_mit_mit_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migration_types_mit
    ADD CONSTRAINT migration_types_mit_mit_code_key UNIQUE (mit_code);


--
-- TOC entry 3983 (class 2606 OID 83680)
-- Name: migration_types_mit migration_types_mit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migration_types_mit
    ADD CONSTRAINT migration_types_mit_pkey PRIMARY KEY (mit_id);


--
-- TOC entry 3799 (class 2606 OID 82538)
-- Name: migrations_mig migrations_mig_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations_mig
    ADD CONSTRAINT migrations_mig_pkey PRIMARY KEY (mig_id);


--
-- TOC entry 3845 (class 2606 OID 82763)
-- Name: phases_instance_phi phases_instance_phi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phases_instance_phi
    ADD CONSTRAINT phases_instance_phi_pkey PRIMARY KEY (phi_id);


--
-- TOC entry 3812 (class 2606 OID 82601)
-- Name: phases_master_phm phases_master_phm_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phases_master_phm
    ADD CONSTRAINT phases_master_phm_pkey PRIMARY KEY (phm_id);


--
-- TOC entry 3826 (class 2606 OID 82667)
-- Name: steps_master_stm_x_iteration_types_itt pk_stm_itt; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_master_stm_x_iteration_types_itt
    ADD CONSTRAINT pk_stm_itt PRIMARY KEY (stm_id, itt_code);


--
-- TOC entry 3865 (class 2606 OID 82902)
-- Name: steps_master_stm_x_teams_tms_impacted pk_stm_tms_impacted; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_master_stm_x_teams_tms_impacted
    ADD CONSTRAINT pk_stm_tms_impacted PRIMARY KEY (stm_id, tms_id);


--
-- TOC entry 3837 (class 2606 OID 82726)
-- Name: plans_instance_pli plans_instance_pli_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans_instance_pli
    ADD CONSTRAINT plans_instance_pli_pkey PRIMARY KEY (pli_id);


--
-- TOC entry 3796 (class 2606 OID 82521)
-- Name: plans_master_plm plans_master_plm_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans_master_plm
    ADD CONSTRAINT plans_master_plm_pkey PRIMARY KEY (plm_id);


--
-- TOC entry 3778 (class 2606 OID 82474)
-- Name: roles_rls roles_rls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles_rls
    ADD CONSTRAINT roles_rls_pkey PRIMARY KEY (rls_id);


--
-- TOC entry 3780 (class 2606 OID 82476)
-- Name: roles_rls roles_rls_rls_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles_rls
    ADD CONSTRAINT roles_rls_rls_code_key UNIQUE (rls_code);


--
-- TOC entry 3841 (class 2606 OID 82747)
-- Name: sequences_instance_sqi sequences_instance_sqi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequences_instance_sqi
    ADD CONSTRAINT sequences_instance_sqi_pkey PRIMARY KEY (sqi_id);


--
-- TOC entry 3809 (class 2606 OID 82583)
-- Name: sequences_master_sqm sequences_master_sqm_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequences_master_sqm
    ADD CONSTRAINT sequences_master_sqm_pkey PRIMARY KEY (sqm_id);


--
-- TOC entry 3911 (class 2606 OID 83189)
-- Name: status_sts status_sts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_sts
    ADD CONSTRAINT status_sts_pkey PRIMARY KEY (sts_id);


--
-- TOC entry 3873 (class 2606 OID 82964)
-- Name: step_instance_comments_sic step_instance_comments_sic_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_instance_comments_sic
    ADD CONSTRAINT step_instance_comments_sic_pkey PRIMARY KEY (sic_id);


--
-- TOC entry 3870 (class 2606 OID 82938)
-- Name: step_pilot_comments_spc step_pilot_comments_spc_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_pilot_comments_spc
    ADD CONSTRAINT step_pilot_comments_spc_pkey PRIMARY KEY (spc_id);


--
-- TOC entry 3818 (class 2606 OID 82627)
-- Name: step_types_stt step_types_stt_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_types_stt
    ADD CONSTRAINT step_types_stt_pkey PRIMARY KEY (stt_code);


--
-- TOC entry 3850 (class 2606 OID 82779)
-- Name: steps_instance_sti steps_instance_sti_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_instance_sti
    ADD CONSTRAINT steps_instance_sti_pkey PRIMARY KEY (sti_id);


--
-- TOC entry 3822 (class 2606 OID 82637)
-- Name: steps_master_stm steps_master_stm_phm_id_stt_code_stm_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_master_stm
    ADD CONSTRAINT steps_master_stm_phm_id_stt_code_stm_number_key UNIQUE (phm_id, stt_code, stm_number);


--
-- TOC entry 3824 (class 2606 OID 82635)
-- Name: steps_master_stm steps_master_stm_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_master_stm
    ADD CONSTRAINT steps_master_stm_pkey PRIMARY KEY (stm_id);


--
-- TOC entry 3939 (class 2606 OID 83515)
-- Name: stg_import_entity_dependencies_ied stg_import_entity_dependencies_ied_ied_entity_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_entity_dependencies_ied
    ADD CONSTRAINT stg_import_entity_dependencies_ied_ied_entity_type_key UNIQUE (ied_entity_type);


--
-- TOC entry 3941 (class 2606 OID 83513)
-- Name: stg_import_entity_dependencies_ied stg_import_entity_dependencies_ied_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_entity_dependencies_ied
    ADD CONSTRAINT stg_import_entity_dependencies_ied_pkey PRIMARY KEY (ied_id);


--
-- TOC entry 3931 (class 2606 OID 83452)
-- Name: stg_import_orchestrations_ior stg_import_orchestrations_ior_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_orchestrations_ior
    ADD CONSTRAINT stg_import_orchestrations_ior_pkey PRIMARY KEY (ior_id);


--
-- TOC entry 3934 (class 2606 OID 83471)
-- Name: stg_import_progress_tracking_ipt stg_import_progress_tracking_ipt_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_progress_tracking_ipt
    ADD CONSTRAINT stg_import_progress_tracking_ipt_pkey PRIMARY KEY (ipt_id);


--
-- TOC entry 3945 (class 2606 OID 83539)
-- Name: stg_import_queue_management_iqm stg_import_queue_management_iqm_iqm_request_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_queue_management_iqm
    ADD CONSTRAINT stg_import_queue_management_iqm_iqm_request_id_key UNIQUE (iqm_request_id);


--
-- TOC entry 3947 (class 2606 OID 83537)
-- Name: stg_import_queue_management_iqm stg_import_queue_management_iqm_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_queue_management_iqm
    ADD CONSTRAINT stg_import_queue_management_iqm_pkey PRIMARY KEY (iqm_id);


--
-- TOC entry 3950 (class 2606 OID 83553)
-- Name: stg_import_resource_locks_irl stg_import_resource_locks_irl_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_resource_locks_irl
    ADD CONSTRAINT stg_import_resource_locks_irl_pkey PRIMARY KEY (irl_id);


--
-- TOC entry 3937 (class 2606 OID 83490)
-- Name: stg_import_rollback_actions_ira stg_import_rollback_actions_ira_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_rollback_actions_ira
    ADD CONSTRAINT stg_import_rollback_actions_ira_pkey PRIMARY KEY (ira_id);


--
-- TOC entry 3974 (class 2606 OID 83654)
-- Name: stg_orchestration_dependencies_od stg_orchestration_dependencies_od_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_orchestration_dependencies_od
    ADD CONSTRAINT stg_orchestration_dependencies_od_pkey PRIMARY KEY (od_id);


--
-- TOC entry 3963 (class 2606 OID 83604)
-- Name: stg_schedule_execution_history_seh stg_schedule_execution_history_seh_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_schedule_execution_history_seh
    ADD CONSTRAINT stg_schedule_execution_history_seh_pkey PRIMARY KEY (seh_id);


--
-- TOC entry 3966 (class 2606 OID 83623)
-- Name: stg_schedule_resource_reservations_srr stg_schedule_resource_reservations_srr_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_schedule_resource_reservations_srr
    ADD CONSTRAINT stg_schedule_resource_reservations_srr_pkey PRIMARY KEY (srr_id);


--
-- TOC entry 3957 (class 2606 OID 83587)
-- Name: stg_scheduled_import_schedules_sis stg_scheduled_import_schedules_sis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_scheduled_import_schedules_sis
    ADD CONSTRAINT stg_scheduled_import_schedules_sis_pkey PRIMARY KEY (sis_id);


--
-- TOC entry 3959 (class 2606 OID 83589)
-- Name: stg_scheduled_import_schedules_sis stg_scheduled_import_schedules_sis_sis_schedule_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_scheduled_import_schedules_sis
    ADD CONSTRAINT stg_scheduled_import_schedules_sis_sis_schedule_id_key UNIQUE (sis_schedule_id);


--
-- TOC entry 3899 (class 2606 OID 83127)
-- Name: stg_step_instructions stg_step_instructions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_step_instructions
    ADD CONSTRAINT stg_step_instructions_pkey PRIMARY KEY (id);


--
-- TOC entry 3897 (class 2606 OID 83117)
-- Name: stg_steps stg_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_steps
    ADD CONSTRAINT stg_steps_pkey PRIMARY KEY (id);


--
-- TOC entry 3968 (class 2606 OID 83643)
-- Name: stg_tenant_resource_limits_trl stg_tenant_resource_limits_trl_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_tenant_resource_limits_trl
    ADD CONSTRAINT stg_tenant_resource_limits_trl_pkey PRIMARY KEY (trl_id);


--
-- TOC entry 3919 (class 2606 OID 83382)
-- Name: system_configuration_scf system_configuration_scf_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configuration_scf
    ADD CONSTRAINT system_configuration_scf_pkey PRIMARY KEY (scf_id);


--
-- TOC entry 3783 (class 2606 OID 82485)
-- Name: teams_tms teams_tms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams_tms
    ADD CONSTRAINT teams_tms_pkey PRIMARY KEY (tms_id);


--
-- TOC entry 3785 (class 2606 OID 82487)
-- Name: teams_tms teams_tms_tms_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams_tms
    ADD CONSTRAINT teams_tms_tms_email_key UNIQUE (tms_email);


--
-- TOC entry 3859 (class 2606 OID 82852)
-- Name: teams_tms_x_applications_app teams_tms_x_applications_app_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams_tms_x_applications_app
    ADD CONSTRAINT teams_tms_x_applications_app_pkey PRIMARY KEY (tms_id, app_id);


--
-- TOC entry 3888 (class 2606 OID 83055)
-- Name: teams_tms_x_users_usr teams_tms_x_users_usr_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams_tms_x_users_usr
    ADD CONSTRAINT teams_tms_x_users_usr_pkey PRIMARY KEY (tms_x_usr_id);


--
-- TOC entry 3952 (class 2606 OID 83555)
-- Name: stg_import_resource_locks_irl uk_irl_resource_request; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_resource_locks_irl
    ADD CONSTRAINT uk_irl_resource_request UNIQUE (irl_resource_type, irl_resource_id, irl_locked_by_request);


--
-- TOC entry 3976 (class 2606 OID 83656)
-- Name: stg_orchestration_dependencies_od uk_od_orchestration_dependency; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_orchestration_dependencies_od
    ADD CONSTRAINT uk_od_orchestration_dependency UNIQUE (od_orchestration_id, od_depends_on_orchestration);


--
-- TOC entry 3901 (class 2606 OID 83409)
-- Name: stg_step_instructions uk_stg_step_instructions_step_instruction; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_step_instructions
    ADD CONSTRAINT uk_stg_step_instructions_step_instruction UNIQUE (step_id, instruction_id);


--
-- TOC entry 3970 (class 2606 OID 83645)
-- Name: stg_tenant_resource_limits_trl uk_trl_tenant_resource; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_tenant_resource_limits_trl
    ADD CONSTRAINT uk_trl_tenant_resource UNIQUE (trl_tenant_id, trl_resource_type);


--
-- TOC entry 3921 (class 2606 OID 83384)
-- Name: system_configuration_scf unique_scf_key_per_env; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configuration_scf
    ADD CONSTRAINT unique_scf_key_per_env UNIQUE (env_id, scf_key);


--
-- TOC entry 3831 (class 2606 OID 83069)
-- Name: controls_master_ctm uq_ctm_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.controls_master_ctm
    ADD CONSTRAINT uq_ctm_code UNIQUE (ctm_code);


--
-- TOC entry 3878 (class 2606 OID 82992)
-- Name: labels_lbl uq_labels_lbl_mig_id_lbl_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl
    ADD CONSTRAINT uq_labels_lbl_mig_id_lbl_name UNIQUE (mig_id, lbl_name);


--
-- TOC entry 3894 (class 2606 OID 83079)
-- Name: labels_lbl_x_controls_master_ctm uq_labels_lbl_x_controls_master_ctm_lbl_id_ctm_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_controls_master_ctm
    ADD CONSTRAINT uq_labels_lbl_x_controls_master_ctm_lbl_id_ctm_id UNIQUE (lbl_id, ctm_id);


--
-- TOC entry 3882 (class 2606 OID 83007)
-- Name: labels_lbl_x_steps_master_stm uq_labels_lbl_x_steps_master_stm_lbl_id_stm_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_steps_master_stm
    ADD CONSTRAINT uq_labels_lbl_x_steps_master_stm_lbl_id_stm_id UNIQUE (lbl_id, stm_id);


--
-- TOC entry 3886 (class 2606 OID 83037)
-- Name: labels_lbl_x_applications_app uq_lbl_x_app; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_applications_app
    ADD CONSTRAINT uq_lbl_x_app UNIQUE (lbl_id, app_id);


--
-- TOC entry 3913 (class 2606 OID 83191)
-- Name: status_sts uq_status_sts_name_type; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_sts
    ADD CONSTRAINT uq_status_sts_name_type UNIQUE (sts_name, sts_type);


--
-- TOC entry 3890 (class 2606 OID 83057)
-- Name: teams_tms_x_users_usr uq_tms_x_usr; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams_tms_x_users_usr
    ADD CONSTRAINT uq_tms_x_usr UNIQUE (tms_id, usr_id);


--
-- TOC entry 3789 (class 2606 OID 82495)
-- Name: users_usr users_usr_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_usr
    ADD CONSTRAINT users_usr_pkey PRIMARY KEY (usr_id);


--
-- TOC entry 3791 (class 2606 OID 82497)
-- Name: users_usr users_usr_usr_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_usr
    ADD CONSTRAINT users_usr_usr_code_key UNIQUE (usr_code);


--
-- TOC entry 3793 (class 2606 OID 82499)
-- Name: users_usr users_usr_usr_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_usr
    ADD CONSTRAINT users_usr_usr_email_key UNIQUE (usr_email);


--
-- TOC entry 3771 (class 1259 OID 83299)
-- Name: idx_app_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_audit ON public.applications_app USING btree (created_at);


--
-- TOC entry 3856 (class 1259 OID 83367)
-- Name: idx_controls_instance_cti_status_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_controls_instance_cti_status_id ON public.controls_instance_cti USING btree (cti_status);


--
-- TOC entry 3857 (class 1259 OID 83311)
-- Name: idx_cti_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cti_audit ON public.controls_instance_cti USING btree (created_at);


--
-- TOC entry 3829 (class 1259 OID 83306)
-- Name: idx_ctm_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ctm_audit ON public.controls_master_ctm USING btree (created_at);


--
-- TOC entry 3906 (class 1259 OID 83164)
-- Name: idx_emt_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emt_name ON public.email_templates_emt USING btree (emt_name);


--
-- TOC entry 3907 (class 1259 OID 83163)
-- Name: idx_emt_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emt_type ON public.email_templates_emt USING btree (emt_type) WHERE (emt_is_active = true);


--
-- TOC entry 3776 (class 1259 OID 83300)
-- Name: idx_env_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_env_audit ON public.environments_env USING btree (created_at);


--
-- TOC entry 3922 (class 1259 OID 83431)
-- Name: idx_imb_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_imb_created ON public.import_batches_imb USING btree (imb_created_date DESC);


--
-- TOC entry 3923 (class 1259 OID 83521)
-- Name: idx_imb_ior_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_imb_ior_start ON public.import_batches_imb USING btree (ior_id, imb_start_time DESC);


--
-- TOC entry 3924 (class 1259 OID 83429)
-- Name: idx_imb_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_imb_status ON public.import_batches_imb USING btree (imb_status);


--
-- TOC entry 3925 (class 1259 OID 83430)
-- Name: idx_imb_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_imb_user ON public.import_batches_imb USING btree (imb_user_id);


--
-- TOC entry 3851 (class 1259 OID 83310)
-- Name: idx_ini_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ini_audit ON public.instructions_instance_ini USING btree (created_at);


--
-- TOC entry 3832 (class 1259 OID 83305)
-- Name: idx_inm_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inm_audit ON public.instructions_master_inm USING btree (created_at);


--
-- TOC entry 3928 (class 1259 OID 83454)
-- Name: idx_ior_status_started; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ior_status_started ON public.stg_import_orchestrations_ior USING btree (ior_status, ior_started DESC);


--
-- TOC entry 3929 (class 1259 OID 83453)
-- Name: idx_ior_user_started; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ior_user_started ON public.stg_import_orchestrations_ior USING btree (ior_user_id, ior_started DESC);


--
-- TOC entry 3932 (class 1259 OID 83477)
-- Name: idx_ipt_ior_phase; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ipt_ior_phase ON public.stg_import_progress_tracking_ipt USING btree (ior_id, ipt_phase_name);


--
-- TOC entry 3942 (class 1259 OID 83540)
-- Name: idx_iqm_status_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iqm_status_priority ON public.stg_import_queue_management_iqm USING btree (iqm_status, iqm_priority DESC, iqm_requested_at);


--
-- TOC entry 3943 (class 1259 OID 83541)
-- Name: idx_iqm_worker_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iqm_worker_status ON public.stg_import_queue_management_iqm USING btree (iqm_assigned_worker, iqm_status);


--
-- TOC entry 3935 (class 1259 OID 83501)
-- Name: idx_ira_ior_executed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ira_ior_executed ON public.stg_import_rollback_actions_ira USING btree (ior_id, ira_executed_at DESC);


--
-- TOC entry 3948 (class 1259 OID 83561)
-- Name: idx_irl_resource_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_irl_resource_expires ON public.stg_import_resource_locks_irl USING btree (irl_resource_type, irl_resource_id, irl_expires_at);


--
-- TOC entry 3800 (class 1259 OID 83665)
-- Name: idx_iteration_types_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iteration_types_active ON public.iteration_types_itt USING btree (itt_active);


--
-- TOC entry 3801 (class 1259 OID 83664)
-- Name: idx_iteration_types_display_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iteration_types_display_order ON public.iteration_types_itt USING btree (itt_display_order, itt_active);


--
-- TOC entry 3804 (class 1259 OID 83331)
-- Name: idx_iterations_ite_status_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iterations_ite_status_id ON public.iterations_ite USING btree (ite_status);


--
-- TOC entry 3874 (class 1259 OID 83301)
-- Name: idx_lbl_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lbl_audit ON public.labels_lbl USING btree (created_at);


--
-- TOC entry 3977 (class 1259 OID 83684)
-- Name: idx_migration_types_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_migration_types_active ON public.migration_types_mit USING btree (mit_active);


--
-- TOC entry 3978 (class 1259 OID 83685)
-- Name: idx_migration_types_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_migration_types_code ON public.migration_types_mit USING btree (mit_code);


--
-- TOC entry 3979 (class 1259 OID 83683)
-- Name: idx_migration_types_display_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_migration_types_display_order ON public.migration_types_mit USING btree (mit_display_order, mit_active);


--
-- TOC entry 3797 (class 1259 OID 83325)
-- Name: idx_migrations_mig_status_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_migrations_mig_status_id ON public.migrations_mig USING btree (mig_status);


--
-- TOC entry 3971 (class 1259 OID 83658)
-- Name: idx_od_depends_on; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_od_depends_on ON public.stg_orchestration_dependencies_od USING btree (od_depends_on_orchestration);


--
-- TOC entry 3972 (class 1259 OID 83657)
-- Name: idx_od_orchestration; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_od_orchestration ON public.stg_orchestration_dependencies_od USING btree (od_orchestration_id);


--
-- TOC entry 3842 (class 1259 OID 83355)
-- Name: idx_phases_instance_phi_status_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phases_instance_phi_status_id ON public.phases_instance_phi USING btree (phi_status);


--
-- TOC entry 3843 (class 1259 OID 83308)
-- Name: idx_phi_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phi_audit ON public.phases_instance_phi USING btree (created_at);


--
-- TOC entry 3810 (class 1259 OID 83303)
-- Name: idx_phm_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phm_audit ON public.phases_master_phm USING btree (created_at);


--
-- TOC entry 3835 (class 1259 OID 83343)
-- Name: idx_plans_instance_pli_status_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plans_instance_pli_status_id ON public.plans_instance_pli USING btree (pli_status);


--
-- TOC entry 3794 (class 1259 OID 83337)
-- Name: idx_plans_master_plm_status_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plans_master_plm_status_id ON public.plans_master_plm USING btree (plm_status);


--
-- TOC entry 3914 (class 1259 OID 83393)
-- Name: idx_scf_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scf_audit ON public.system_configuration_scf USING btree (created_at);


--
-- TOC entry 3915 (class 1259 OID 83392)
-- Name: idx_scf_category_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scf_category_active ON public.system_configuration_scf USING btree (scf_category, scf_is_active);


--
-- TOC entry 3916 (class 1259 OID 83390)
-- Name: idx_scf_env_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scf_env_category ON public.system_configuration_scf USING btree (env_id, scf_category);


--
-- TOC entry 3917 (class 1259 OID 83391)
-- Name: idx_scf_key_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scf_key_active ON public.system_configuration_scf USING btree (scf_key, scf_is_active);


--
-- TOC entry 3960 (class 1259 OID 83611)
-- Name: idx_seh_execution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seh_execution_id ON public.stg_schedule_execution_history_seh USING btree (seh_execution_id);


--
-- TOC entry 3961 (class 1259 OID 83610)
-- Name: idx_seh_sis_started; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seh_sis_started ON public.stg_schedule_execution_history_seh USING btree (sis_id, seh_started_at DESC);


--
-- TOC entry 3838 (class 1259 OID 83349)
-- Name: idx_sequences_instance_sqi_status_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sequences_instance_sqi_status_id ON public.sequences_instance_sqi USING btree (sqi_status);


--
-- TOC entry 3871 (class 1259 OID 82980)
-- Name: idx_sic_sti_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sic_sti_id ON public.step_instance_comments_sic USING btree (sti_id);


--
-- TOC entry 3953 (class 1259 OID 83591)
-- Name: idx_sis_created_by_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sis_created_by_status ON public.stg_scheduled_import_schedules_sis USING btree (sis_created_by, sis_status);


--
-- TOC entry 3954 (class 1259 OID 83590)
-- Name: idx_sis_next_execution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sis_next_execution ON public.stg_scheduled_import_schedules_sis USING btree (sis_next_execution);


--
-- TOC entry 3955 (class 1259 OID 83592)
-- Name: idx_sis_recurring_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sis_recurring_active ON public.stg_scheduled_import_schedules_sis USING btree (sis_recurring, sis_is_active);


--
-- TOC entry 3868 (class 1259 OID 82954)
-- Name: idx_spc_stm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spc_stm_id ON public.step_pilot_comments_spc USING btree (stm_id);


--
-- TOC entry 3839 (class 1259 OID 83307)
-- Name: idx_sqi_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sqi_audit ON public.sequences_instance_sqi USING btree (created_at);


--
-- TOC entry 3807 (class 1259 OID 83302)
-- Name: idx_sqm_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sqm_audit ON public.sequences_master_sqm USING btree (created_at);


--
-- TOC entry 3964 (class 1259 OID 83629)
-- Name: idx_srr_resource_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_srr_resource_time ON public.stg_schedule_resource_reservations_srr USING btree (srr_resource_type, srr_reserved_from, srr_reserved_until);


--
-- TOC entry 3908 (class 1259 OID 83193)
-- Name: idx_status_sts_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_status_sts_name ON public.status_sts USING btree (sts_name);


--
-- TOC entry 3909 (class 1259 OID 83192)
-- Name: idx_status_sts_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_status_sts_type ON public.status_sts USING btree (sts_type);


--
-- TOC entry 3846 (class 1259 OID 83176)
-- Name: idx_steps_instance_sti_enr_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_steps_instance_sti_enr_id ON public.steps_instance_sti USING btree (enr_id);


--
-- TOC entry 3847 (class 1259 OID 83361)
-- Name: idx_steps_instance_sti_status_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_steps_instance_sti_status_id ON public.steps_instance_sti USING btree (sti_status);


--
-- TOC entry 3819 (class 1259 OID 83175)
-- Name: idx_steps_master_stm_enr_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_steps_master_stm_enr_id ON public.steps_master_stm USING btree (enr_id);


--
-- TOC entry 3895 (class 1259 OID 83407)
-- Name: idx_stg_steps_import_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stg_steps_import_batch ON public.stg_steps USING btree (import_batch_id);


--
-- TOC entry 3848 (class 1259 OID 83309)
-- Name: idx_sti_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sti_audit ON public.steps_instance_sti USING btree (created_at);


--
-- TOC entry 3820 (class 1259 OID 83304)
-- Name: idx_stm_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stm_audit ON public.steps_master_stm USING btree (created_at);


--
-- TOC entry 3781 (class 1259 OID 83297)
-- Name: idx_tms_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tms_audit ON public.teams_tms USING btree (created_at);


--
-- TOC entry 3786 (class 1259 OID 83144)
-- Name: idx_users_usr_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_usr_active ON public.users_usr USING btree (usr_active);


--
-- TOC entry 3787 (class 1259 OID 83298)
-- Name: idx_usr_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usr_audit ON public.users_usr USING btree (created_at);


--
-- TOC entry 4069 (class 2620 OID 83284)
-- Name: applications_app update_applications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications_app FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- TOC entry 4083 (class 2620 OID 83296)
-- Name: controls_instance_cti update_controls_instance_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_controls_instance_updated_at BEFORE UPDATE ON public.controls_instance_cti FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- TOC entry 4077 (class 2620 OID 83291)
-- Name: controls_master_ctm update_controls_master_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_controls_master_updated_at BEFORE UPDATE ON public.controls_master_ctm FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- TOC entry 4070 (class 2620 OID 83285)
-- Name: environments_env update_environments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_environments_updated_at BEFORE UPDATE ON public.environments_env FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- TOC entry 4082 (class 2620 OID 83295)
-- Name: instructions_instance_ini update_instructions_instance_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_instructions_instance_updated_at BEFORE UPDATE ON public.instructions_instance_ini FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- TOC entry 4078 (class 2620 OID 83290)
-- Name: instructions_master_inm update_instructions_master_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_instructions_master_updated_at BEFORE UPDATE ON public.instructions_master_inm FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- TOC entry 4084 (class 2620 OID 83286)
-- Name: labels_lbl update_labels_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_labels_updated_at BEFORE UPDATE ON public.labels_lbl FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- TOC entry 4080 (class 2620 OID 83293)
-- Name: phases_instance_phi update_phases_instance_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_phases_instance_updated_at BEFORE UPDATE ON public.phases_instance_phi FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- TOC entry 4075 (class 2620 OID 83288)
-- Name: phases_master_phm update_phases_master_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_phases_master_updated_at BEFORE UPDATE ON public.phases_master_phm FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- TOC entry 4079 (class 2620 OID 83292)
-- Name: sequences_instance_sqi update_sequences_instance_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sequences_instance_updated_at BEFORE UPDATE ON public.sequences_instance_sqi FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- TOC entry 4074 (class 2620 OID 83287)
-- Name: sequences_master_sqm update_sequences_master_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sequences_master_updated_at BEFORE UPDATE ON public.sequences_master_sqm FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- TOC entry 4081 (class 2620 OID 83294)
-- Name: steps_instance_sti update_steps_instance_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_steps_instance_updated_at BEFORE UPDATE ON public.steps_instance_sti FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- TOC entry 4076 (class 2620 OID 83289)
-- Name: steps_master_stm update_steps_master_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_steps_master_updated_at BEFORE UPDATE ON public.steps_master_stm FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- TOC entry 4071 (class 2620 OID 83282)
-- Name: teams_tms update_teams_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams_tms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- TOC entry 4073 (class 2620 OID 83283)
-- Name: users_usr update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users_usr FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- TOC entry 4072 (class 2620 OID 83148)
-- Name: users_usr update_users_usr_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_usr_updated_at BEFORE UPDATE ON public.users_usr FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4040 (class 2606 OID 82923)
-- Name: audit_log_aud fk_aud_usr_usr_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_aud
    ADD CONSTRAINT fk_aud_usr_usr_id FOREIGN KEY (usr_id) REFERENCES public.users_usr(usr_id);


--
-- TOC entry 4030 (class 2606 OID 83362)
-- Name: controls_instance_cti fk_controls_instance_cti_status; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.controls_instance_cti
    ADD CONSTRAINT fk_controls_instance_cti_status FOREIGN KEY (cti_status) REFERENCES public.status_sts(sts_id);


--
-- TOC entry 4026 (class 2606 OID 82833)
-- Name: controls_instance_cti fk_cti_ctm_ctm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.controls_instance_cti
    ADD CONSTRAINT fk_cti_ctm_ctm_id FOREIGN KEY (ctm_id) REFERENCES public.controls_master_ctm(ctm_id);


--
-- TOC entry 4029 (class 2606 OID 83315)
-- Name: controls_instance_cti fk_cti_phi_phi_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.controls_instance_cti
    ADD CONSTRAINT fk_cti_phi_phi_id FOREIGN KEY (phi_id) REFERENCES public.phases_instance_phi(phi_id);


--
-- TOC entry 4028 (class 2606 OID 82843)
-- Name: controls_instance_cti fk_cti_usr_biz_validator; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.controls_instance_cti
    ADD CONSTRAINT fk_cti_usr_biz_validator FOREIGN KEY (usr_id_biz_validator) REFERENCES public.users_usr(usr_id);


--
-- TOC entry 4027 (class 2606 OID 82838)
-- Name: controls_instance_cti fk_cti_usr_it_validator; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.controls_instance_cti
    ADD CONSTRAINT fk_cti_usr_it_validator FOREIGN KEY (usr_id_it_validator) REFERENCES public.users_usr(usr_id);


--
-- TOC entry 4005 (class 2606 OID 82687)
-- Name: controls_master_ctm fk_ctm_phm_phm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.controls_master_ctm
    ADD CONSTRAINT fk_ctm_phm_phm_id FOREIGN KEY (phm_id) REFERENCES public.phases_master_phm(phm_id);


--
-- TOC entry 4034 (class 2606 OID 82873)
-- Name: environments_env_x_applications_app fk_exa_app_app_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.environments_env_x_applications_app
    ADD CONSTRAINT fk_exa_app_app_id FOREIGN KEY (app_id) REFERENCES public.applications_app(app_id);


--
-- TOC entry 4033 (class 2606 OID 82868)
-- Name: environments_env_x_applications_app fk_exa_env_env_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.environments_env_x_applications_app
    ADD CONSTRAINT fk_exa_env_env_id FOREIGN KEY (env_id) REFERENCES public.environments_env(env_id);


--
-- TOC entry 4037 (class 2606 OID 82893)
-- Name: environments_env_x_iterations_ite fk_exi_enr_enr_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.environments_env_x_iterations_ite
    ADD CONSTRAINT fk_exi_enr_enr_id FOREIGN KEY (enr_id) REFERENCES public.environment_roles_enr(enr_id);


--
-- TOC entry 4035 (class 2606 OID 82883)
-- Name: environments_env_x_iterations_ite fk_exi_env_env_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.environments_env_x_iterations_ite
    ADD CONSTRAINT fk_exi_env_env_id FOREIGN KEY (env_id) REFERENCES public.environments_env(env_id);


--
-- TOC entry 4036 (class 2606 OID 82888)
-- Name: environments_env_x_iterations_ite fk_exi_ite_ite_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.environments_env_x_iterations_ite
    ADD CONSTRAINT fk_exi_ite_ite_id FOREIGN KEY (ite_id) REFERENCES public.iterations_ite(ite_id);


--
-- TOC entry 4024 (class 2606 OID 82812)
-- Name: instructions_instance_ini fk_ini_inm_inm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instructions_instance_ini
    ADD CONSTRAINT fk_ini_inm_inm_id FOREIGN KEY (inm_id) REFERENCES public.instructions_master_inm(inm_id);


--
-- TOC entry 4023 (class 2606 OID 82807)
-- Name: instructions_instance_ini fk_ini_sti_sti_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instructions_instance_ini
    ADD CONSTRAINT fk_ini_sti_sti_id FOREIGN KEY (sti_id) REFERENCES public.steps_instance_sti(sti_id);


--
-- TOC entry 4025 (class 2606 OID 82817)
-- Name: instructions_instance_ini fk_ini_usr_usr_id_completed_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instructions_instance_ini
    ADD CONSTRAINT fk_ini_usr_usr_id_completed_by FOREIGN KEY (usr_id_completed_by) REFERENCES public.users_usr(usr_id);


--
-- TOC entry 4008 (class 2606 OID 82710)
-- Name: instructions_master_inm fk_inm_ctm_ctm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instructions_master_inm
    ADD CONSTRAINT fk_inm_ctm_ctm_id FOREIGN KEY (ctm_id) REFERENCES public.controls_master_ctm(ctm_id);


--
-- TOC entry 4006 (class 2606 OID 82700)
-- Name: instructions_master_inm fk_inm_stm_stm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instructions_master_inm
    ADD CONSTRAINT fk_inm_stm_stm_id FOREIGN KEY (stm_id) REFERENCES public.steps_master_stm(stm_id);


--
-- TOC entry 4007 (class 2606 OID 82705)
-- Name: instructions_master_inm fk_inm_tms_tms_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instructions_master_inm
    ADD CONSTRAINT fk_inm_tms_tms_id FOREIGN KEY (tms_id) REFERENCES public.teams_tms(tms_id);


--
-- TOC entry 3991 (class 2606 OID 82571)
-- Name: iterations_ite fk_ite_itt_code; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iterations_ite
    ADD CONSTRAINT fk_ite_itt_code FOREIGN KEY (itt_code) REFERENCES public.iteration_types_itt(itt_code);


--
-- TOC entry 3989 (class 2606 OID 82561)
-- Name: iterations_ite fk_ite_mig_mig_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iterations_ite
    ADD CONSTRAINT fk_ite_mig_mig_id FOREIGN KEY (mig_id) REFERENCES public.migrations_mig(mig_id);


--
-- TOC entry 3990 (class 2606 OID 82566)
-- Name: iterations_ite fk_ite_plm_plm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iterations_ite
    ADD CONSTRAINT fk_ite_plm_plm_id FOREIGN KEY (plm_id) REFERENCES public.plans_master_plm(plm_id);


--
-- TOC entry 3992 (class 2606 OID 83326)
-- Name: iterations_ite fk_iterations_ite_status; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iterations_ite
    ADD CONSTRAINT fk_iterations_ite_status FOREIGN KEY (ite_status) REFERENCES public.status_sts(sts_id);


--
-- TOC entry 4053 (class 2606 OID 83043)
-- Name: labels_lbl_x_applications_app fk_lbl_x_app_app_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_applications_app
    ADD CONSTRAINT fk_lbl_x_app_app_id FOREIGN KEY (app_id) REFERENCES public.applications_app(app_id) ON DELETE CASCADE;


--
-- TOC entry 4052 (class 2606 OID 83038)
-- Name: labels_lbl_x_applications_app fk_lbl_x_app_lbl_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_applications_app
    ADD CONSTRAINT fk_lbl_x_app_lbl_id FOREIGN KEY (lbl_id) REFERENCES public.labels_lbl(lbl_id) ON DELETE CASCADE;


--
-- TOC entry 4059 (class 2606 OID 83095)
-- Name: labels_lbl_x_controls_master_ctm fk_lbl_x_ctm_ctm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_controls_master_ctm
    ADD CONSTRAINT fk_lbl_x_ctm_ctm_id FOREIGN KEY (ctm_id) REFERENCES public.controls_master_ctm(ctm_id) ON DELETE CASCADE;


--
-- TOC entry 4058 (class 2606 OID 83090)
-- Name: labels_lbl_x_controls_master_ctm fk_lbl_x_ctm_lbl_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_controls_master_ctm
    ADD CONSTRAINT fk_lbl_x_ctm_lbl_id FOREIGN KEY (lbl_id) REFERENCES public.labels_lbl(lbl_id) ON DELETE CASCADE;


--
-- TOC entry 4050 (class 2606 OID 83018)
-- Name: labels_lbl_x_steps_master_stm fk_lbl_x_stm_lbl_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_steps_master_stm
    ADD CONSTRAINT fk_lbl_x_stm_lbl_id FOREIGN KEY (lbl_id) REFERENCES public.labels_lbl(lbl_id) ON DELETE CASCADE;


--
-- TOC entry 4051 (class 2606 OID 83023)
-- Name: labels_lbl_x_steps_master_stm fk_lbl_x_stm_stm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_steps_master_stm
    ADD CONSTRAINT fk_lbl_x_stm_stm_id FOREIGN KEY (stm_id) REFERENCES public.steps_master_stm(stm_id) ON DELETE CASCADE;


--
-- TOC entry 3987 (class 2606 OID 82539)
-- Name: migrations_mig fk_mig_usr_usr_id_owner; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations_mig
    ADD CONSTRAINT fk_mig_usr_usr_id_owner FOREIGN KEY (usr_id_owner) REFERENCES public.users_usr(usr_id);


--
-- TOC entry 3988 (class 2606 OID 83320)
-- Name: migrations_mig fk_migrations_mig_status; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations_mig
    ADD CONSTRAINT fk_migrations_mig_status FOREIGN KEY (mig_status) REFERENCES public.status_sts(sts_id);


--
-- TOC entry 4018 (class 2606 OID 83350)
-- Name: phases_instance_phi fk_phases_instance_phi_status; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phases_instance_phi
    ADD CONSTRAINT fk_phases_instance_phi_status FOREIGN KEY (phi_status) REFERENCES public.status_sts(sts_id);


--
-- TOC entry 4017 (class 2606 OID 82769)
-- Name: phases_instance_phi fk_phi_phm_phm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phases_instance_phi
    ADD CONSTRAINT fk_phi_phm_phm_id FOREIGN KEY (phm_id) REFERENCES public.phases_master_phm(phm_id);


--
-- TOC entry 4016 (class 2606 OID 82764)
-- Name: phases_instance_phi fk_phi_sqi_sqi_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phases_instance_phi
    ADD CONSTRAINT fk_phi_sqi_sqi_id FOREIGN KEY (sqi_id) REFERENCES public.sequences_instance_sqi(sqi_id);


--
-- TOC entry 3996 (class 2606 OID 82607)
-- Name: phases_master_phm fk_phm_phm_predecessor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phases_master_phm
    ADD CONSTRAINT fk_phm_phm_predecessor FOREIGN KEY (predecessor_phm_id) REFERENCES public.phases_master_phm(phm_id);


--
-- TOC entry 3995 (class 2606 OID 82602)
-- Name: phases_master_phm fk_phm_sqm_sqm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phases_master_phm
    ADD CONSTRAINT fk_phm_sqm_sqm_id FOREIGN KEY (sqm_id) REFERENCES public.sequences_master_sqm(sqm_id);


--
-- TOC entry 4012 (class 2606 OID 83338)
-- Name: plans_instance_pli fk_plans_instance_pli_status; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans_instance_pli
    ADD CONSTRAINT fk_plans_instance_pli_status FOREIGN KEY (pli_status) REFERENCES public.status_sts(sts_id);


--
-- TOC entry 3986 (class 2606 OID 83332)
-- Name: plans_master_plm fk_plans_master_plm_status; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans_master_plm
    ADD CONSTRAINT fk_plans_master_plm_status FOREIGN KEY (plm_status) REFERENCES public.status_sts(sts_id);


--
-- TOC entry 4010 (class 2606 OID 82732)
-- Name: plans_instance_pli fk_pli_ite_ite_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans_instance_pli
    ADD CONSTRAINT fk_pli_ite_ite_id FOREIGN KEY (ite_id) REFERENCES public.iterations_ite(ite_id);


--
-- TOC entry 4009 (class 2606 OID 82727)
-- Name: plans_instance_pli fk_pli_plm_plm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans_instance_pli
    ADD CONSTRAINT fk_pli_plm_plm_id FOREIGN KEY (plm_id) REFERENCES public.plans_master_plm(plm_id);


--
-- TOC entry 4011 (class 2606 OID 82737)
-- Name: plans_instance_pli fk_pli_usr_usr_id_owner; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans_instance_pli
    ADD CONSTRAINT fk_pli_usr_usr_id_owner FOREIGN KEY (usr_id_owner) REFERENCES public.users_usr(usr_id);


--
-- TOC entry 3985 (class 2606 OID 82522)
-- Name: plans_master_plm fk_plm_tms_tms_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans_master_plm
    ADD CONSTRAINT fk_plm_tms_tms_id FOREIGN KEY (tms_id) REFERENCES public.teams_tms(tms_id);


--
-- TOC entry 4061 (class 2606 OID 83385)
-- Name: system_configuration_scf fk_scf_env_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configuration_scf
    ADD CONSTRAINT fk_scf_env_id FOREIGN KEY (env_id) REFERENCES public.environments_env(env_id);


--
-- TOC entry 4015 (class 2606 OID 83344)
-- Name: sequences_instance_sqi fk_sequences_instance_sqi_status; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequences_instance_sqi
    ADD CONSTRAINT fk_sequences_instance_sqi_status FOREIGN KEY (sqi_status) REFERENCES public.status_sts(sts_id);


--
-- TOC entry 4013 (class 2606 OID 82748)
-- Name: sequences_instance_sqi fk_sqi_pli_pli_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequences_instance_sqi
    ADD CONSTRAINT fk_sqi_pli_pli_id FOREIGN KEY (pli_id) REFERENCES public.plans_instance_pli(pli_id);


--
-- TOC entry 4014 (class 2606 OID 82753)
-- Name: sequences_instance_sqi fk_sqi_sqm_sqm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequences_instance_sqi
    ADD CONSTRAINT fk_sqi_sqm_sqm_id FOREIGN KEY (sqm_id) REFERENCES public.sequences_master_sqm(sqm_id);


--
-- TOC entry 3993 (class 2606 OID 82584)
-- Name: sequences_master_sqm fk_sqm_plm_plm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequences_master_sqm
    ADD CONSTRAINT fk_sqm_plm_plm_id FOREIGN KEY (plm_id) REFERENCES public.plans_master_plm(plm_id);


--
-- TOC entry 3994 (class 2606 OID 82589)
-- Name: sequences_master_sqm fk_sqm_sqm_predecessor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequences_master_sqm
    ADD CONSTRAINT fk_sqm_sqm_predecessor FOREIGN KEY (predecessor_sqm_id) REFERENCES public.sequences_master_sqm(sqm_id);


--
-- TOC entry 4021 (class 2606 OID 83170)
-- Name: steps_instance_sti fk_steps_instance_sti_environment_roles_enr; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_instance_sti
    ADD CONSTRAINT fk_steps_instance_sti_environment_roles_enr FOREIGN KEY (enr_id) REFERENCES public.environment_roles_enr(enr_id);


--
-- TOC entry 4022 (class 2606 OID 83356)
-- Name: steps_instance_sti fk_steps_instance_sti_status; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_instance_sti
    ADD CONSTRAINT fk_steps_instance_sti_status FOREIGN KEY (sti_status) REFERENCES public.status_sts(sts_id);


--
-- TOC entry 4002 (class 2606 OID 83165)
-- Name: steps_master_stm fk_steps_master_stm_environment_roles_enr; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_master_stm
    ADD CONSTRAINT fk_steps_master_stm_environment_roles_enr FOREIGN KEY (enr_id) REFERENCES public.environment_roles_enr(enr_id);


--
-- TOC entry 4060 (class 2606 OID 83410)
-- Name: stg_step_instructions fk_stg_step_instructions_stg_steps_step_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_step_instructions
    ADD CONSTRAINT fk_stg_step_instructions_stg_steps_step_id FOREIGN KEY (step_id) REFERENCES public.stg_steps(id) ON DELETE CASCADE;


--
-- TOC entry 4019 (class 2606 OID 82780)
-- Name: steps_instance_sti fk_sti_phi_phi_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_instance_sti
    ADD CONSTRAINT fk_sti_phi_phi_id FOREIGN KEY (phi_id) REFERENCES public.phases_instance_phi(phi_id);


--
-- TOC entry 4020 (class 2606 OID 82785)
-- Name: steps_instance_sti fk_sti_stm_stm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_instance_sti
    ADD CONSTRAINT fk_sti_stm_stm_id FOREIGN KEY (stm_id) REFERENCES public.steps_master_stm(stm_id);


--
-- TOC entry 4001 (class 2606 OID 82658)
-- Name: steps_master_stm fk_stm_enr_target; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_master_stm
    ADD CONSTRAINT fk_stm_enr_target FOREIGN KEY (enr_id_target) REFERENCES public.environment_roles_enr(enr_id);


--
-- TOC entry 4004 (class 2606 OID 82673)
-- Name: steps_master_stm_x_iteration_types_itt fk_stm_itt_itt_code; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_master_stm_x_iteration_types_itt
    ADD CONSTRAINT fk_stm_itt_itt_code FOREIGN KEY (itt_code) REFERENCES public.iteration_types_itt(itt_code) ON DELETE CASCADE;


--
-- TOC entry 4003 (class 2606 OID 82668)
-- Name: steps_master_stm_x_iteration_types_itt fk_stm_itt_stm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_master_stm_x_iteration_types_itt
    ADD CONSTRAINT fk_stm_itt_stm_id FOREIGN KEY (stm_id) REFERENCES public.steps_master_stm(stm_id) ON DELETE CASCADE;


--
-- TOC entry 3997 (class 2606 OID 82638)
-- Name: steps_master_stm fk_stm_phm_phm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_master_stm
    ADD CONSTRAINT fk_stm_phm_phm_id FOREIGN KEY (phm_id) REFERENCES public.phases_master_phm(phm_id);


--
-- TOC entry 4000 (class 2606 OID 82653)
-- Name: steps_master_stm fk_stm_stm_predecessor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_master_stm
    ADD CONSTRAINT fk_stm_stm_predecessor FOREIGN KEY (stm_id_predecessor) REFERENCES public.steps_master_stm(stm_id);


--
-- TOC entry 3999 (class 2606 OID 82648)
-- Name: steps_master_stm fk_stm_stt_code; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_master_stm
    ADD CONSTRAINT fk_stm_stt_code FOREIGN KEY (stt_code) REFERENCES public.step_types_stt(stt_code);


--
-- TOC entry 4038 (class 2606 OID 82903)
-- Name: steps_master_stm_x_teams_tms_impacted fk_stm_tms_impacted_stm; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_master_stm_x_teams_tms_impacted
    ADD CONSTRAINT fk_stm_tms_impacted_stm FOREIGN KEY (stm_id) REFERENCES public.steps_master_stm(stm_id) ON DELETE CASCADE;


--
-- TOC entry 4039 (class 2606 OID 82908)
-- Name: steps_master_stm_x_teams_tms_impacted fk_stm_tms_impacted_tms; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_master_stm_x_teams_tms_impacted
    ADD CONSTRAINT fk_stm_tms_impacted_tms FOREIGN KEY (tms_id) REFERENCES public.teams_tms(tms_id) ON DELETE CASCADE;


--
-- TOC entry 3998 (class 2606 OID 82643)
-- Name: steps_master_stm fk_stm_tms_owner; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps_master_stm
    ADD CONSTRAINT fk_stm_tms_owner FOREIGN KEY (tms_id_owner) REFERENCES public.teams_tms(tms_id);


--
-- TOC entry 4054 (class 2606 OID 83058)
-- Name: teams_tms_x_users_usr fk_tms_x_usr_tms_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams_tms_x_users_usr
    ADD CONSTRAINT fk_tms_x_usr_tms_id FOREIGN KEY (tms_id) REFERENCES public.teams_tms(tms_id) ON DELETE CASCADE;


--
-- TOC entry 4055 (class 2606 OID 83063)
-- Name: teams_tms_x_users_usr fk_tms_x_usr_usr_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams_tms_x_users_usr
    ADD CONSTRAINT fk_tms_x_usr_usr_id FOREIGN KEY (usr_id) REFERENCES public.users_usr(usr_id) ON DELETE CASCADE;


--
-- TOC entry 4032 (class 2606 OID 82858)
-- Name: teams_tms_x_applications_app fk_txa_app_app_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams_tms_x_applications_app
    ADD CONSTRAINT fk_txa_app_app_id FOREIGN KEY (app_id) REFERENCES public.applications_app(app_id);


--
-- TOC entry 4031 (class 2606 OID 82853)
-- Name: teams_tms_x_applications_app fk_txa_tms_tms_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams_tms_x_applications_app
    ADD CONSTRAINT fk_txa_tms_tms_id FOREIGN KEY (tms_id) REFERENCES public.teams_tms(tms_id);


--
-- TOC entry 3984 (class 2606 OID 82505)
-- Name: users_usr fk_usr_rls_rls_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_usr
    ADD CONSTRAINT fk_usr_rls_rls_id FOREIGN KEY (rls_id) REFERENCES public.roles_rls(rls_id);


--
-- TOC entry 4062 (class 2606 OID 83516)
-- Name: import_batches_imb import_batches_imb_ior_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_batches_imb
    ADD CONSTRAINT import_batches_imb_ior_id_fkey FOREIGN KEY (ior_id) REFERENCES public.stg_import_orchestrations_ior(ior_id) ON DELETE SET NULL;


--
-- TOC entry 4047 (class 2606 OID 82993)
-- Name: labels_lbl labels_lbl_mig_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl
    ADD CONSTRAINT labels_lbl_mig_id_fkey FOREIGN KEY (mig_id) REFERENCES public.migrations_mig(mig_id) ON DELETE CASCADE;


--
-- TOC entry 4057 (class 2606 OID 83085)
-- Name: labels_lbl_x_controls_master_ctm labels_lbl_x_controls_master_ctm_ctm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_controls_master_ctm
    ADD CONSTRAINT labels_lbl_x_controls_master_ctm_ctm_id_fkey FOREIGN KEY (ctm_id) REFERENCES public.controls_master_ctm(ctm_id) ON DELETE CASCADE;


--
-- TOC entry 4056 (class 2606 OID 83080)
-- Name: labels_lbl_x_controls_master_ctm labels_lbl_x_controls_master_ctm_lbl_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_controls_master_ctm
    ADD CONSTRAINT labels_lbl_x_controls_master_ctm_lbl_id_fkey FOREIGN KEY (lbl_id) REFERENCES public.labels_lbl(lbl_id) ON DELETE CASCADE;


--
-- TOC entry 4048 (class 2606 OID 83008)
-- Name: labels_lbl_x_steps_master_stm labels_lbl_x_steps_master_stm_lbl_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_steps_master_stm
    ADD CONSTRAINT labels_lbl_x_steps_master_stm_lbl_id_fkey FOREIGN KEY (lbl_id) REFERENCES public.labels_lbl(lbl_id) ON DELETE CASCADE;


--
-- TOC entry 4049 (class 2606 OID 83013)
-- Name: labels_lbl_x_steps_master_stm labels_lbl_x_steps_master_stm_stm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels_lbl_x_steps_master_stm
    ADD CONSTRAINT labels_lbl_x_steps_master_stm_stm_id_fkey FOREIGN KEY (stm_id) REFERENCES public.steps_master_stm(stm_id) ON DELETE CASCADE;


--
-- TOC entry 4045 (class 2606 OID 82970)
-- Name: step_instance_comments_sic step_instance_comments_sic_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_instance_comments_sic
    ADD CONSTRAINT step_instance_comments_sic_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users_usr(usr_id);


--
-- TOC entry 4044 (class 2606 OID 82965)
-- Name: step_instance_comments_sic step_instance_comments_sic_sti_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_instance_comments_sic
    ADD CONSTRAINT step_instance_comments_sic_sti_id_fkey FOREIGN KEY (sti_id) REFERENCES public.steps_instance_sti(sti_id) ON DELETE CASCADE;


--
-- TOC entry 4046 (class 2606 OID 82975)
-- Name: step_instance_comments_sic step_instance_comments_sic_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_instance_comments_sic
    ADD CONSTRAINT step_instance_comments_sic_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users_usr(usr_id);


--
-- TOC entry 4042 (class 2606 OID 82944)
-- Name: step_pilot_comments_spc step_pilot_comments_spc_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_pilot_comments_spc
    ADD CONSTRAINT step_pilot_comments_spc_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users_usr(usr_id);


--
-- TOC entry 4041 (class 2606 OID 82939)
-- Name: step_pilot_comments_spc step_pilot_comments_spc_stm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_pilot_comments_spc
    ADD CONSTRAINT step_pilot_comments_spc_stm_id_fkey FOREIGN KEY (stm_id) REFERENCES public.steps_master_stm(stm_id) ON DELETE CASCADE;


--
-- TOC entry 4043 (class 2606 OID 82949)
-- Name: step_pilot_comments_spc step_pilot_comments_spc_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_pilot_comments_spc
    ADD CONSTRAINT step_pilot_comments_spc_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users_usr(usr_id);


--
-- TOC entry 4063 (class 2606 OID 83472)
-- Name: stg_import_progress_tracking_ipt stg_import_progress_tracking_ipt_ior_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_progress_tracking_ipt
    ADD CONSTRAINT stg_import_progress_tracking_ipt_ior_id_fkey FOREIGN KEY (ior_id) REFERENCES public.stg_import_orchestrations_ior(ior_id) ON DELETE CASCADE;


--
-- TOC entry 4066 (class 2606 OID 83556)
-- Name: stg_import_resource_locks_irl stg_import_resource_locks_irl_irl_locked_by_request_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_resource_locks_irl
    ADD CONSTRAINT stg_import_resource_locks_irl_irl_locked_by_request_fkey FOREIGN KEY (irl_locked_by_request) REFERENCES public.stg_import_queue_management_iqm(iqm_request_id);


--
-- TOC entry 4065 (class 2606 OID 83496)
-- Name: stg_import_rollback_actions_ira stg_import_rollback_actions_ira_imb_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_rollback_actions_ira
    ADD CONSTRAINT stg_import_rollback_actions_ira_imb_id_fkey FOREIGN KEY (imb_id) REFERENCES public.import_batches_imb(imb_id) ON DELETE SET NULL;


--
-- TOC entry 4064 (class 2606 OID 83491)
-- Name: stg_import_rollback_actions_ira stg_import_rollback_actions_ira_ior_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_import_rollback_actions_ira
    ADD CONSTRAINT stg_import_rollback_actions_ira_ior_id_fkey FOREIGN KEY (ior_id) REFERENCES public.stg_import_orchestrations_ior(ior_id) ON DELETE CASCADE;


--
-- TOC entry 4067 (class 2606 OID 83605)
-- Name: stg_schedule_execution_history_seh stg_schedule_execution_history_seh_sis_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_schedule_execution_history_seh
    ADD CONSTRAINT stg_schedule_execution_history_seh_sis_id_fkey FOREIGN KEY (sis_id) REFERENCES public.stg_scheduled_import_schedules_sis(sis_id) ON DELETE CASCADE;


--
-- TOC entry 4068 (class 2606 OID 83624)
-- Name: stg_schedule_resource_reservations_srr stg_schedule_resource_reservations_srr_sis_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_schedule_resource_reservations_srr
    ADD CONSTRAINT stg_schedule_resource_reservations_srr_sis_id_fkey FOREIGN KEY (sis_id) REFERENCES public.stg_scheduled_import_schedules_sis(sis_id) ON DELETE CASCADE;


-- Completed on 2025-09-09 10:59:02 UTC

--
-- PostgreSQL database dump complete
--

