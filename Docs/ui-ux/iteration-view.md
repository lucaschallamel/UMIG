# UI/UX Specification: Iteration View (Implementation Plan View)

> This document specifies the UI/UX for the primary runsheet view ("Iteration View" or "Implementation Plan View") as a ScriptRunner Macro for end users. It follows the project template. [SD][RP][CA]

---

## 1. Title & Purpose
- **View/Component Name:** Iteration View (Implementation Plan View)
- **Purpose:**
  - To provide end users with a comprehensive, interactive runsheet for managing and tracking Implementation Plans and their Iterations during IT cutover/migration events.
  - Addresses the need for real-time visibility, structured navigation, and actionable insights for all roles involved in the cutover process.

## 2. Scope & Context
- **User Roles:** This view will be useful primarily for end USERS, particpants of the release or the migration. Ultimately theey will be able to perform somes actions on this view such as adding comments, ticking instructions as done and changing the status of steps. Incidentally, it will be also used by the IT CUTOVER team members as an ongoing status and control view (even if we will develop later another more granular view devoted for these users). General management and other curious Confluence users will also be able to use this view in READ/ONLY mode.
- **Entry Points:** This view will be informed by 2 top context parameters: A selected MIGRATION, and a selected ITERATION within this migration (associated with a specific PLAN, as per our data model)
- **Dependencies:** This view will be uniquely dependent on the determination of the USER, its ROLE, and its relationship with one or several TEAMS in our data model. MIGRATION, ITERATION, PLAN, USER, ROLE, TEMAS are the key defining context variables for the view.

## 3. Data Requirements
- **Primary Data Sources:** We are only relying on our umig_app_db database, and this view will be pretty much reliant on all the tables
- **Key Data Fields:** All fields in all tables really, since we are going to parse the entirety of the data model to generate this view. 
- **Derived/Computed Data:** None at this stage

## 4. UI Layout & Structure
- **Sections:** We imagine to have 3 areas on screen
  - A top bar (aka the iteration selector subview)  in which we have 
    - a dropdown selector for the migrations
    - a dropdown selector for the iterations/plans

  - A left screen area in which we are going to display the entire run sheet (aka the runsheet subview) , to list all the STEPS, grouped by ordered SEQUENCES, and by ordered PHASES within each SEQUENCE. 
    - Steps are listed in a table form, with main attributes in columns: Step code, Step title, team, status, duration ...
    - This area offers the ability to filter the list according to the following attributes to get a custom subset of the run sheet:
      - Filter by SEQUENCE
      - Filter by PHASE
      - Filter by TEAM
      - Filter by LABEL
      - Filter for current USER

  - A right screen area (aka the step subview) in which we have a lookup view of the STEP currently selected or clicked on in the LEFTHAND screen area (the runsheet subview), with all their attributes, the list of instructions attached to it and the list of comments attached to it.

- **Field/Table Layout:** 
  - As specified above at a high level.
  - For the step subview we will present the fields in the followinh order:
    - STEP CODE - STEP NUMBER
    - STEP TITLE
    - TARGET ENVIRONMENT
    - SCOPE ARRAY: List of Iteration Types to which the step is associated: RUN, DR, CUTOVER
    - ASSIGNED TEAM + IMPACTED TEAMS
    - SEQUENCE + PHASE associated
    - DURATION in minutes 
    - Current STATUS
    - HADER description
    - Table of associated INSTRUCTIONS
      - Column 1: Instruction number (inm_order)
      - Column 2: Content (inm_body)
      - Column 3: Assigned team = lookup on tms_id
      - Column 4: Associated control = lookup on ctm_id
      - Column 6: Duration. (min)
      - Column 6: Is Completed = ini_is_completed

    - Table of associated user COMMENTS from table step_instance_comments_sic

- **Wireframe/Sketch:** _(Optional)_

## 5. UX & Interaction
- **User Actions:** 

  - Select a **MIGRATION** from the dropdown selector in the selector subview -> Create a context variable to filter in only the records attached to this migration (a sort of append to a master SQL statement: and mig_id=n)
  - Select an **ITERATION** from the second droopdown selector in the selector subview -> Narrows down the context to records for a specific iteration ID (and ite_id=n)
  - These top criteria or context variables define the list of sequences, phases and steps which end up being ordered and listed in the runsheet subview on the lefthand side of the screen. In this list the user can scroll up and down and click on a line to refresh the step details lookup view in the step subview on the righthand side.
  - Other actions include the possibility to use filters, courtesy of dropdown selectors that can be above the runsheet table:
    - a sequence selector -> Filters the view with only steps associated with the selected sequence
    - a phase selector -> Filters the view with only steps associated with the selected phase
    - a teams selector -> Filters the view with only steps associated with the selected team
    - a label selector -> Filters the view with only steps associated with the selected label
    - A checkbox to opt to display only steps associted with the teams to which the current user belongs

- **States:** The 3 sub-views in the iteration view are always in synch and in the same state. The state variables include:

  - The MIGRATION and ITERATIOn context defined in the selector subview at the top
  - The filter variables set in the runsheet subview: SEQUENCE, PHASE, TEAM, LABEL, USER

  Note that the state of the STEP itself (the ultimate child item of this view) is self maintained at database level through audit logging and the tracking of the STATUS, the start date and the end date.
- **Validation & Feedback:** At this stage we are presenting a READ only view to all users, so there's no validation nor feedback needed just yet.
- **Accessibility:** We want the general layout to be responsive with:

  - Top selector subview to be fixed height, just to accomdate for the 2 dropdown lists
  - Left runsheet subview to be responsive 50% in width, and otherwise to be scrollable within the available screen height
  - Right step subview to be responsive 50% in width, and otherwise to be scrollable within the available screen height


## 6. Notifications & Side Effects
- **Triggers:**  None at this stage
- **Audit/Tracking:** None at this stage

## 7. Open Questions & To-Do
- **Unresolved Issues:** _(To be specified)_
- **Future Enhancements:** _(To be specified)_

---

> Fill out each section as requirements are clarified. Link to related ADRs, dev journal entries, and user stories as relevant. Keep this spec updated as the design evolves.
