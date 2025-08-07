# UX/UI Roadmap

## Purpose

This roadmap outlines the planned rollout and evolution of UX/UI features for the UMIG MVP and beyond. It references all detailed specifications and explains the strategic, phased approach adopted by the team.

## Phased Strategy & Rationale

For the MVP, we are prioritizing the delivery of high-impact end-user UI components (e.g., STEP View) to validate usability and business value early.

- **Admin and backend management features** (e.g., managing migrations, iterations, teams, users, environments) will initially be handled via API endpoints and Postman workflows. This allows for rapid progress and robust backend validation before investing in a full-fledged admin UI.
- This phased approach is intentional: it enables faster feedback, reduces complexity for the initial release, and ensures that future admin UIs are built on a stable, proven API foundation.
- The roadmap will be updated as priorities shift and as the need for more advanced UI features emerges.

## Current State

- STEP View ([step-view.md](./step-view.md)): In progress

## Iteration Plan

---

### Iteration View (Implementation Plan View)

[Spec: iteration-view.md](./iteration-view.md)

**Epic:** As an end user or IT Cutover team member, I want a comprehensive, interactive runsheet view (Iteration View) to track, filter, and explore all steps and instructions for a selected migration and iteration, so I can execute my cutover tasks efficiently and with full context.

**User Stories:**

1. **Context Selection**
   - As a user, I can select a Migration and Iteration from dropdowns, so that the runsheet view is scoped to the relevant implementation plan context.

2. **Runsheet Browsing & Filtering**
   - As a user, I can browse all steps grouped by sequence and phase, and filter by sequence, phase, team, label, or my own teams, so I can quickly find the steps relevant to me.

3. **Step Detail Exploration**
   - As a user, when I click on a step in the runsheet, I see a detailed view of its attributes, instructions, and comments, so I have all the information I need to execute or review the step.

4. **Responsive, Accessible Layout**
   - As a user, the view adapts responsively to my screen and supports keyboard navigation and accessibility standards, so I can use it comfortably regardless of device or ability.

5. **Read-Only State (MVP)**
   - As a user, I can view all steps, instructions, and comments, but cannot yet make changes (future interactive features will be added in later phases).

6. **State Synchronization**
   - As a user, all filters, selections, and context are synchronized across the three subviews (selector, runsheet, step detail), so my navigation is intuitive and consistent.

7. **Error & Empty States**
   - As a user, I receive clear feedback if there are no steps, if data fails to load, or if I lack permissions, so I always know what’s happening.

**Future Enhancements (Backlog):**

- Mark steps/instructions as complete (with audit trail)
- Add/edit comments inline
- Inline status changes (with permissions)
- Export runsheet to PDF/CSV
- Custom user dashboards

---

| Iteration | Features/Views                    | Linked Specs           | Status      |
| --------- | --------------------------------- | ---------------------- | ----------- |
| 1         | STEP View (Normal, Cutover)       | step-view.md           | In progress |
| 2         | Dashboard, Team Management        | dashboard.md, team.md  | Planned     |
| 3         | Admin Screens, Advanced Filtering | admin.md, filtering.md | Backlog     |
| ...       | ...                               | ...                    | ...         |

## Future Enhancements

- Inline editing
- Real-time updates
- Advanced filtering
- Accessibility improvements
- Full-featured admin UI (to replace API/Postman approach)
- Robust context/session management for STEP/iteration selection
- User role mapping (Confluence user to user_usr)
- Comments system for STEP instances

## Revision History

- 2025-06-26: Roadmap created

---

> This roadmap is a living document. Update it as priorities and requirements evolve. All detailed UX/UI specs should be linked here for traceability.
