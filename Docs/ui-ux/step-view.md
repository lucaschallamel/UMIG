# STEP View — UI/UX Specification

## 1. Title & Purpose
- **View/Component Name:** STEP View
- **Purpose:**  
  To provide a comprehensive, user-friendly interface for end users (NORMAL and CUTOVER roles) to view and interact with the details of a specific STEP within a migration/iteration/plan context. This view serves as the primary touchpoint for executing, tracking, and commenting on implementation steps during a cutover event.

## 2. Scope & Context
- **User Roles:**  
  - NORMAL User: Executes and reviews steps, marks instructions as complete, adds comments.
  - CUTOVER User: Has all NORMAL user capabilities, plus may have additional permissions for status changes or escalations.
- **Entry Points:**  
  - Accessed via a Confluence page rendered by a ScriptRunner macro.
  - Invoked with a query parameter (e.g., `?step=TRT-1200`), which is parsed to identify the STEP.
- **Dependencies:**  
  - Relies on backend REST endpoints and database tables for STEP, INSTRUCTION, TEAM, ENVIRONMENT, PHASE, CONTROL, and COMMENT data.
  - Must reconcile data from both MASTER and INSTANCE tables for steps and instructions.

## 3. Data Requirements
- **Primary Data Sources:**  
  - `steps_master_stm` (composite key: `stt_code`, `stm_number`)
  - `steps_instance_sti`
  - `instructions_master_istm`
  - `instructions_instance_isti`
  - `teams`, `environments`, `phases`, `controls`
  - Comments table (for iteration-specific comments)
- **Key Data Fields:**  
  - STEP: Code, Name/Title, Phase, Owning Team, Impacted Teams, Target Environment, Iteration Scope (RUN/DR/CUTOVER), Status, Audit (Start_Time, End_Time, Updated_by), Duration, Header
  - INSTRUCTION: Order, Body, Owning Team, Status (Done Y/N), Audit (Completed_at, Completed_by), Attached Control (Code)
  - COMMENTS: Author, Timestamp, Body, (Iteration context)
- **Derived/Computed Data:**  
  - STEP ID parsed from query parameter (split into `stt_code` and `stm_number`)
  - Reconciliation between master and instance data for current state

## 4. UI Layout & Structure
- **Sections:**  
  1. STEP Header (Code, Name/Title)
  2. STEP Details Table (Phase, Teams, Environment, Iteration Scope, Status, Audit, Duration, Header)
  3. Instructions Table (Ordered list of instructions with all required fields)
  4. Comments Section (Chronological list for the current iteration)
- **Field/Table Layout:**  
  - STEP details in a summary table or card at the top
  - Instructions as a table with columns:
    - Order | Body | Owning Team | Status | Completed At | Completed By | Control Code
  - Comments as a list or table at the bottom
- **Wireframe/Sketch:**  
  (Optional: Add screenshot or diagram in future)

## 5. UX & Interaction
- **User Actions:**  
  - Change STEP Status (button/dropdown, triggers backend update and notifications)
  - Mark Instruction as Complete (checkbox/button per row, triggers backend update and notifications)
  - Add Comment (form at bottom, posts to backend and refreshes comments list)
- **States:**  
  - Loading (spinner or placeholder)
  - Error (error message with retry option)
  - Empty (no instructions or comments)
  - Success (confirmation on actions)
- **Validation & Feedback:**  
  - Prevent invalid state changes (e.g., cannot mark as complete if already completed)
  - Show immediate feedback for all actions (toasts, banners, inline messages)
- **Accessibility:**  
  - Keyboard navigation for all actions
  - ARIA labels for interactive elements
  - Sufficient color contrast for all roles/statuses

## 6. Notifications & Side Effects
- **Triggers:**  
  - STEP status change: Sends email notifications to owning and impacted teams, updates audit/tracking tables
  - Instruction completion: Sends email notifications, updates audit/tracking tables
  - Comment addition: May notify relevant users (optional, future)
- **Audit/Tracking:**  
  - All status changes and completions are logged with timestamp and user

## 7. Open Questions & To-Do
- Comments, STEP HEADER, and Instruction BODY must support rich text (vanilla HTML tags). No attachments required at this stage.
- CUTOVER users must have additional controls (e.g., reassign STEP and INSTRUCTIONS to different TEAMS or ENVIRONMENTS) with role-based permissions on these interactive elements. These changes apply only to the specific STEP instance in the present ITERATION.
- Instructions are not editable in this view; editing is only possible via ADMIN/API at this stage.
- No pagination or lazy loading is needed for instructions/comments (assume ≤20 instructions per STEP).
- Future enhancements (candidate features for the UX/UI roadmap): inline editing, real-time updates, advanced filtering.

---

> This specification should be updated as requirements evolve. Link to this file from progress docs, ADRs, and dev journal entries as relevant.
