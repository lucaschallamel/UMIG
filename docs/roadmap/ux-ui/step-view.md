# STEPS Subview — UI/UX Specification (Iteration View)

## 1. Title & Purpose

- **View/Component Name:** STEPS Subview (within Iteration View)
- **Purpose:**  
  To provide a comprehensive, user-friendly interface for end users (NORMAL, PILOT, and CUTOVER roles) to view and interact with step details within the iteration view context. This subview serves as the primary touchpoint for executing, tracking, and commenting on implementation steps during cutover events, with integrated email notifications and audit logging.

## 2. Scope & Context

- **User Roles:**
  - **NORMAL User:** Views step details, marks instructions as complete, adds comments
  - **PILOT User:** Has all NORMAL capabilities, plus can open steps (triggers email notifications)
  - **ADMIN User:** Has all PILOT capabilities, plus can change step status and perform escalations
- **Entry Points:**
  - Accessed via the Iteration View macro (`iterationViewMacro.groovy`) as a right-panel subview
  - Activated by clicking on a step row in the main runsheet table
  - Context is provided by the selected migration/iteration and applied filters
- **Dependencies:**
  - **Backend APIs:** StepsApi, EmailTemplatesApi, audit logging endpoints
  - **Database Tables:** steps_instance_sti, instructions_instance_ini, audit_log_aud, email_templates_emt
  - **Services:** EmailService for notifications, AuditLogRepository for tracking
  - **UI Components:** Main runsheet table selection, filter bar state, notification system

## 3. Data Requirements

- **Primary Data Sources:**
  - `steps_instance_sti` (instance execution records)
  - `instructions_instance_ini` (instruction execution records)
  - `steps_master_stm` (canonical step templates)
  - `instructions_master_inm` (canonical instruction templates)
  - `teams_tms` and `steps_master_stm_x_teams_tms_impacted` (team information for notifications)
  - `labels_lbl`, `labels_lbl_x_steps_master_stm` (labels associated to the Step)
  - `audit_log_aud` (comprehensive audit trail)
  - `email_templates_emt` (notification templates)
  - `iterations_ite`,`migrations_mig`,`phases_instance_phi`,`phases_master_phm`,`plans_instance_pli`,`plans_master_plm`,`sequences_instance_sqi`,`sequences_master_sqm` (Hierarchical positionning of the step in a migration > plan > iteration > sequence > phase)
  - `environment_roles_enr`,`environments_env`,`environments_env_x_iterations_ite` (environment scope for the step)
- **Key Data Fields:**
  - **STEP INSTANCE:** sti_id, sti_name, sti_status, sti_opened_by, sti_opened_date, sti_phase, sti_team_owner, sti_impacted_teams
  - **INSTRUCTION INSTANCE:** ini_id, ini_body, ini_order, ini_status, ini_completed_by, ini_completed_date, ini_team_owner
  - **AUDIT DATA:** usr_id, aud_action, aud_entity_type, aud_entity_id, aud_details (JSONB)
  - **TEAMS:** tms_name, tms_email (for notifications)
  - **EMAIL TEMPLATES:** emt_type, emt_subject, emt_body_html, emt_body_text
- **Derived/Computed Data:**
  - Step selection from runsheet table click (sti_id passed to details panel)
  - Instruction completion progress (completed count / total count)
  - Email notification recipients (owner + impacted teams)

## 4. UI Layout & Structure

- **Sections:**
  1. **Panel Header:** "📄 STEP DETAILS" with close/minimize controls
  2. **Step Summary Card:** Key information and current status
  3. **Step Actions Bar:** Status change buttons (role-based visibility)
  4. **Instructions Table:** Ordered list with completion tracking
  5. **Comments Section:** Chronological comments with form (future)
- **Field/Table Layout:**
  - **Step Summary:** Name, Status, Phase, Owner Team, Impacted Teams, Labels, Audit Info
  - **Instructions Table:**
    - Order | Body | Team | Status | Completed At | Completed By | Actions
  - **Action Buttons:** Open Step, Update Status, Mark Instructions Complete (role-based)
  - **Comments:** Author, Timestamp, Body, Reply Actions (future)
- **Current Implementation:**
  - Right panel (aside) with fixed width in iteration view
  - Dynamic content loading based on selected step from runsheet
  - Placeholder message when no step is selected

## 5. UX & Interaction

### 5.1. Interactive Elements (Pink Rectangles from Draw.io Mock)

Based on the comprehensive Draw.io mock analysis, the following elements are interactive:

#### Status Management

- **Status Dropdown (STI_STATUS):**
  - **Functionality:** Color-coded dropdown that changes background color dynamically to reflect the current status
  - **Implementation:** Status options fetched from status_sts table where sts_type='Step'
    - PENDING (#808080) - Gray
    - TODO (#FFA500) - Orange
    - IN_PROGRESS (#0066CC) - Blue
    - COMPLETED (#00AA00) - Green
    - FAILED (#CC0000) - Red
    - BLOCKED (#FF6600) - Dark Orange
    - CANCELLED (#666666) - Dark Gray
  - **Visual Feedback:** Dropdown background color matches the selected status color from sts_color field
  - **Role Access:** PILOT+ roles can change status
  - **Email Trigger:** Status changes trigger `STEP_STATUS_CHANGED` notifications

#### Instruction Completion

- **Instruction Checkboxes (INI_IS_COMPLETE):**
  - **Functionality:** Individual checkboxes for each instruction in the instructions table
  - **Implementation:** Three separate checkboxes as shown in mock (one per instruction row)
  - **Role Access:** All authenticated users can mark instructions complete
  - **Email Trigger:** Completion triggers `INSTRUCTION_COMPLETED` notifications

#### Comments Management (Full CRUD)

- **CREATE: "NEW COMMENT" Button**
  - **Functionality:** Opens comment creation modal/form
  - **Role Access:** All authenticated users
  - **Implementation:** Modal with text area and submit/cancel buttons
- **EDIT: "EDIT" Buttons (per comment)**
  - **Functionality:** Opens comment editing modal pre-populated with existing content
  - **Role Access:** Comment author or ADMIN+ roles only
  - **Implementation:** In-place editing or modal with save/cancel options
- **DELETE: "DELETE" Buttons (per comment)**
  - **Functionality:** Confirmation dialog followed by comment removal
  - **Role Access:** Comment author or ADMIN+ roles only
  - **Implementation:** Custom confirmation dialog (avoid native confirm() flickering)

### 5.2. User Actions & Workflows

- **Step Selection:** Click step row in runsheet → loads details in right panel
- **Open Step (PILOT):** Button to open step → triggers email notifications to the associated teams (primary assignee and impacted via association table steps_master_stm_x_teams_tms_impacted) + event logging
- **Update Status (PILOT+):** Dynamic color dropdown to change step status → triggers email notifications and event logging
  - Status values fetched from status_sts table filtered by sts_type='Step'
  - Dropdown background color dynamically changes based on sts_color value
  - Available statuses: PENDING, TODO, IN_PROGRESS, COMPLETED, FAILED, BLOCKED, CANCELLED
- **Mark Instructions Complete (ALL):** Individual checkboxes per instruction → triggers email notifications + event logging
- **Comment Operations (ALL):**
  - **CREATE:** "NEW COMMENT" button → opens creation modal
  - **EDIT:** "EDIT" button → opens editing modal (author/ADMIN only)
  - **DELETE:** "DELETE" button → confirmation dialog + removal (author/ADMIN only)

### 5.3. UI States & Feedback

- **Loading:** Spinner with "Loading step details..." message
- **Empty:** Placeholder "👋 Select a step from the runsheet to view details"
- **Error:** Error message with retry option and specific error details
- **Success:** Confirmation notifications for all actions with email delivery status

### 5.4. Validation & Feedback

- **Status Validation:** Prevent invalid state transitions (e.g., cannot reopen completed steps)
- **Role-Based Actions:** Show/hide buttons based on user role (NORMAL/PILOT/ADMIN)
- **Immediate Feedback:** Toast notifications for all actions including email delivery status
- **Audit Trail:** Show who, when, and what changed in step summary
- **Dynamic Color Feedback:** Status dropdown background color reflects current status

### 5.5. Accessibility

- **Keyboard Navigation:** Tab order through all interactive elements
- **ARIA Labels:** Descriptive labels for screen readers
- **Color Contrast:** Status indicators and dynamic colors meet WCAG AA standards
- **Focus Management:** Proper focus handling for modal dialogs and dropdowns

## 6. Notifications & Side Effects

- **Email Notification Triggers:**
  - **Step Opened (PILOT action):**
    - Template: STEP_OPENED
    - Recipients: Owner team + Impacted teams
    - Audit: EMAIL_SENT/EMAIL_FAILED + STEP_OPENED actions
  - **Step Status Changed (ADMIN action):**
    - Template: STEP_STATUS_CHANGED
    - Recipients: Owner team + Impacted teams + Cutover team
    - Audit: EMAIL_SENT/EMAIL_FAILED + STATUS_CHANGED actions
  - **Instruction Completed (ALL users):**
    - Template: INSTRUCTION_COMPLETED
    - Recipients: Owner team + Impacted teams
    - Audit: EMAIL_SENT/EMAIL_FAILED + INSTRUCTION_COMPLETED actions
- **Audit/Tracking (audit_log_aud):**
  - **User Actions:** All actions logged with usr_id, timestamp, and JSONB details
  - **Email Events:** Comprehensive logging of email delivery with recipient details
  - **Status Changes:** Before/after status values with business justification
  - **System Events:** Template processing, error conditions, retry attempts

## 7. Implementation Status & Next Steps

### ✅ Completed (July 2025)

- **Backend Integration:** StepsApi with email notification methods implemented
- **Email System:** Complete notification workflow with template management
- **Audit Logging:** Comprehensive tracking of all user actions and email events
- **Basic UI Structure:** Panel layout with step selection and details display
- **Data Loading:** Dynamic step details loading from backend API

### 🚧 Current Implementation Gaps

- **Interactive Elements:** Pink rectangle elements from Draw.io mock not yet implemented
- **Dynamic Status Dropdown:** Color-coded status dropdown with dynamic background colors
- **Comments CRUD:** Full CREATE/EDIT/DELETE comment operations with role-based access
- **Role-Based UI:** All users see same interface (role detection not implemented)
- **Status Updates:** Frontend needs to call StepsApi PUT/POST endpoints
- **Email Feedback:** UI needs to show email delivery status to users
- **Instruction Checkboxes:** Individual instruction completion checkboxes not implemented

### 📋 Immediate Next Steps

1. **Implement Interactive Elements (Pink Rectangles):**
   - **Status Dropdown:** Create color-coded dropdown with dynamic background colors
     - Fetch status options and colors from backend
     - Update dropdown background color when selection changes
     - Role-based access control (PILOT+ only)
   - **Instruction Checkboxes:** Individual checkboxes for each instruction row
     - Update `INI_IS_COMPLETE` status on checkbox change
     - Trigger email notifications on completion
   - **Comments CRUD Operations:**
     - "NEW COMMENT" button → opens creation modal
     - "EDIT" buttons → opens editing modal (author/ADMIN only)
     - "DELETE" buttons → custom confirmation dialog + removal (author/ADMIN only)

2. **Connect Action Buttons:** Replace placeholder methods with actual API calls
   - `startStep()` → `StepsApi.openStepInstanceWithNotification()`
   - `updateStatus()` → `StepsApi.updateStepInstanceStatusWithNotification()`
   - `markInstructionComplete()` → `StepsApi.completeInstructionWithNotification()`

3. **Role-Based UI Implementation:**
   - Implement user role detection (NORMAL/PILOT/ADMIN)
   - Show/hide interactive elements based on user permissions
   - Conditional access to edit/delete operations for comments

4. **Technical Implementation:**
   - Dynamic color management for status dropdown
   - Custom confirmation dialogs (avoid native confirm() flickering)
   - Email delivery status feedback in notifications
   - Progress tracking for instruction completion

### 🔮 Future Enhancements

- **Comments System:** Rich text comments with team notifications
- **Real-Time Updates:** WebSocket or polling for live status updates
- **Offline Support:** Cache step details for offline access
- **Advanced Controls:** CUTOVER role reassignment capabilities
- **Bulk Operations:** Multiple instruction completion, bulk status updates
- **Mobile Optimization:** Responsive design for tablet/mobile access

### 🛠️ Technical Considerations

#### Dynamic Color Status Dropdown Implementation

- **Color Management:**
  - Backend API provides status options with associated color codes
  - JavaScript dynamically updates dropdown background color on selection change
  - Color inheritance for both dropdown background and option styling
- **Technical Pattern:**

  ```javascript
  // Example implementation approach
  const statusDropdown = document.getElementById("status-dropdown");
  statusDropdown.addEventListener("change", (e) => {
    const selectedStatus = e.target.value;
    const statusColor = getStatusColor(selectedStatus); // from API data
    e.target.style.backgroundColor = statusColor;
  });
  ```

#### Comment Management System

- **Modal Management:** Reuse existing ModalManager patterns from admin GUI
- **Custom Confirmation:** Implement custom confirmation dialogs to avoid native confirm() flickering
- **Role-Based Access:** Check user permissions before showing edit/delete buttons
- **Audit Integration:** All comment operations logged to audit_log_aud table

#### General Technical Requirements

- **Error Handling:** Robust error handling for network failures and API errors
- **Performance:** Optimize for large step lists with virtual scrolling
- **Accessibility:** Full WCAG AA compliance with screen reader support
- **Internationalization:** Multi-language support for global teams
- **Email Integration:** Real-time feedback on email delivery status for all notifications

---

> This specification should be updated as requirements evolve. Link to this file from progress docs, ADRs, and dev journal entries as relevant.
