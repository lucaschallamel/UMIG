# ADMIN GUI — UI/UX Specification

## 1. Title & Purpose

- **View/Component Name:** ADMIN GUI
- **Purpose:**  
  Provide a centralized, secure interface for Admin users to manage core UMIG application entities (users, teams, roles, plans, audits, migrations, iterations, plans, sequences, phases, steps, instructions, controls configurations). The Admin GUI streamlines administrative workflows, enforces data integrity, and supports compliance/audit needs.

## 2. Scope & Context

- **User Roles:**
  - **SUPERADMIN**: Full access to all application admin features (user/team/plan management, audit logs, config). This role is defined by the flag usr_is_admin in table users_usr.
  - ADMIN: This Migration Admin role is defined in table users_usr by lookup of the field rls_id into roles_rls (Role 1)
  - PILOT: This operational role is defined in table users_usr by lookup of the field rls_id into roles_rls (Role 3)
- **Entry Points:**
  - Accessed via a dedicated Confluence page rendered by a ScriptRunner macro (e.g., "UMIG Admin Console").
  - Visible only to users with SUPERADMIN, ADMIN or PILOT role (checked via backend and UI guard).
- **Dependencies:**
  - Relies on backend REST endpoints for users, teams, roles, plans, audit logs, and config.
  - Interacts with master/instance tables for all managed entities.
  - May trigger notifications/logs for sensitive actions.

## 3. Data Requirements

- **Primary Data Sources:**
  - **Users, Teams and roles** in tables `users_usr`, `teams_tms`, `roles_rls`, `teams_tms_x_users_usr`
  - **Environments** are managed in `environment_roles_enr`, `environments_env`, `environments_env_x_applications_app`, `environments_env_x_iterations_ite`
  - **Applications** are managed in `applications_app`, `teams_tms_x_applications_app`, `environments_env_x_applications_app`, `labels_lbl_x_applications_app`
  - **Canonical data of Migrations** are managed in tables `iteration_types_itt`, `iterations_ite`, `migrations_mig`,
  - **Canonical data for Migration Plans** is managed in tables `phases_master_phm`, `plans_master_plm`, `sequences_master_sqm`, `controls_master_ctm`, `instructions_master_inm`, `labels_lbl_x_controls_master_ctm`, `labels_lbl_x_steps_master_stm`, `steps_master_stm`, `steps_master_stm_x_iteration_types_itt`, `steps_master_stm_x_teams_tms_impacted`
  - **Instance data for iteration plans** is managed vis tables `controls_instance_cti`, `instructions_instance_ini`, `phases_instance_phi`, `plans_instance_pli`, `sequences_master_sqm`, `steps_instance_sti`
  - Customer Labels are managed via this set of tables: `labels_lbl`, `labels_lbl_x_applications_app`, `labels_lbl_x_controls_master_ctm`, `labels_lbl_x_steps_master_stm`
  - All the data queries take place via the REST endpoints of the application: `/api/v2/users`, `/api/v2/teams`, `/api/v2/migrations`, `/api/v2/stepView`, `/api/v2/labels`, `/api/v2/webapp`, `/api/v2/steps`, etc.
- **Key Data Fields:**
  - **Users_usr**:
    - 1 usr_id int4 NO NULL "nextval('users_usr_usr_id_seq'::regclass)" NULL
      6 usr_is_admin bool YES NULL false NULL
      8 rls_id int4 YES NULL NULL public.roles_rls(rls_id) NULL

  - **Team_tms**:
    - 1 tms_id int4 NO NULL "nextval('teams_tms_tms_id_seq'::regclass)" NULL

  - **teams_tms_x_users_usr**
    - 2 tms_id int4 NO NULL NULL public.teams_tms(tms_id) References teams_tms (team).
      3 usr_id int4 NO NULL NULL public.users_usr(usr_id) References users_usr (user).

  - **Roles_rls**:
    - 1 rls_id int4 NO NULL "nextval('roles_rls_rls_id_seq'::regclass)" NULL
      2 rls_code varchar(10) YES NULL NULL NULL

  - **Migrations_mig**
    - 1 mig_id uuid NO NULL gen_random_uuid() NULL
      2 usr_id_owner int4 NO NULL NULL public.users_usr(usr_id) NULL

- **Derived/Computed Data:**
  - From the data sources and fields listed above, we can derive the permissions associated to a specific user.
    - SUPERADMIN privileges are determined users_usr.usr_is_admin. A super admin will be able to fully edit and maintain absolutely all data sets.
    - ADMIN privileges are determined by users.usr.rls_id, looking up into roles_rls.rls_id and roles_rls.rls_code = ADMIN (role 1). An ADMIN user will be able to manage and maintain content attached to their user_id, or to the tms_id of the team they are attached to. This can be:
      - Edit STEPS (and INSTRUCTIONS) attached to the TEAM
      - Manage APPLICATIONS attached to the TEAM
      - Manage all PLANS and canonical information attached to a migration: Plans, Sequences, Phases, Steps, Instructions, Controls
    - PILOT privileges are determined by users.usr.rls_id, looking up into roles_rls.rls_id and roles_rls.rls_code = PILOT (role 3). A PILOT user will be able to manage all PLANS instances and the instance information of specific iterations (Sequence, Phase, Steps, instructions, Controls)

## 4. UI Layout & Structure

- **Sections:**
  - Login Page: The user is invited to input their user code (trigram)
  - Upon LOGIN, the uiser is sent to a UMIG - ADMINISTRATION home page divided in 3 areas:
    - Top section is a TITLE section , including a LOGOUT button (return to LOGIN page)
    - Left section is a conditional menu, with options populated based on the user profile and privileges. It is subdivided in 3 areas:
      - Top area: SUPERADMIN features, including the following options:
        - Users
        - Teams
        - Environments
        - Applications
        - Labels
      - Mid-area: ADMIN features, including:
        - Migrations
        - Master Plans
        - Master Sequences
        - Master Phases
        - Master Steps (and instructions)
        - Master Controls
      - Bottom area: PILOT features, including
        - Iterations
        - Sequences
        - Phases
        - Steps and instructions
        - Controls
        - Audit logs
    - The right section is where the content and forms ara displayed, every time the user selects an option in the main menu. Content will be presented in lists, forms or tables, depending on the use case and context. (See below).
- **Field/Table Layout:**
  - Tabular views for all record types, including users, teams, environments, applications, labels, canonical migration records, and instance based records for each iteration.
    - No in line editing
    - Pagined results, with a default 50 records per page, and a previous/next navigation to parse all records.
    - Tables have headers that can be clicked to order alphabetically on a per column basis
    - Each column also enjoys a search field, to filter teh results by similarity
    - The tables will not display all fields but a selecttion of relevant ones.
    - Entire lines are clickable and lead to an edit screen to edit individually all the field values for each record (PUT API endpoint)
    - Each line has a "+" and "-" button:
      - The minus button is to delete the line record (with a confirmation popup) (DELETE API endpoint)
      - The plus button is to insert a new record after the current one (POST API endpoint)

    Inline editing for key fields (where safe)

  - Search/filter above each table
  - Pagination for large datasets

- **Wireframe/Sketch:**
  - (Placeholder: Add wireframe image or link here)

## 5. UX & Interaction

- **User Actions:**
  - Create, edit, delete all types of records
  - Assign roles and teams to users
  - Assign applications to teams
  - Assign environments to applications
  - Assign custom labels to applications and steps
  - Instantiate entire plans and assign to iterations
  - Assign Controls to Phases and to Instructions
  - View and filter audit logs
  - Search, filter, and paginate all lists
- **States:**
  - Loading, error, empty, success, confirmation dialogs
- **Validation & Feedback:**
  - Inline validation for forms (required fields, email format, etc.)
  - Error/success banners or toasts
  - Confirmation modal for destructive actions
- **Accessibility:**
  - Full keyboard navigation
  - ARIA labels for all interactive elements
  - Sufficient color contrast and focus indicators

## 6. Notifications & Side Effects

- **Triggers:**
  - Email/log notification on user/role changes, deletions, and config edits
  - Audit log entry for all admin actions
- **Audit/Tracking:**
  - All create/edit/delete actions are tracked with actor, timestamp, and before/after state

## 7. Implementation Status (July 2025)

### ✅ Completed Features

- **Complete User Management**: Full CRUD operations for users with role assignment (Admin/User/Pilot)
- **SPA Architecture**: Single-page application with modal forms and dynamic table rendering
- **Enhanced Error Handling**: Detailed SQL constraint violation reporting with field-specific messages
- **Automatic Timestamps**: Database-driven created_at/updated_at fields with triggers
- **Form Validation**: Comprehensive client-side validation with real-time feedback
- **Pagination & Search**: Working pagination (25/50/100 records) with search functionality
- **Table Sorting**: Clickable column headers with bidirectional sorting
- **CRUD Integration**: Complete API integration with UsersApi for all operations

### 🚧 In Development

- **Team Management**: Entity configuration ready, needs API integration
- **Environment Management**: Entity configuration ready, needs API integration
- **Application Management**: Entity configuration ready, needs API integration
- **Role-based Access Control**: Authentication logic implemented, needs privilege enforcement

### 📋 Implementation Details

- **Location**: `src/groovy/umig/macros/v1/adminGuiMacro.groovy`
- **Frontend**: `src/groovy/umig/web/js/admin-gui.js`
- **Styling**: `src/groovy/umig/web/css/admin-gui.css`
- **API Pattern**: SPA+REST with CustomEndpointDelegate

## 8. Open Questions & To-Do

- **Unresolved Issues:**
  - Should SUPERADMIN be supported in MVP?
  - What config options must be exposed in the GUI initially?
  - Should bulk actions (multi-select) be supported for users/teams?
- **Future Enhancements:**
  - Advanced reporting/dashboard widgets
  - Bulk import/export for users/teams
  - Integration with external identity providers (SSO)
  - Customizable audit log filters and exports
