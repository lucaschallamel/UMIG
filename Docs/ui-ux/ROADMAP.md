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

| Iteration | Features/Views                         | Linked Specs              | Status      |
|-----------|----------------------------------------|---------------------------|-------------|
| 1         | STEP View (Normal, Cutover)            | step-view.md              | In progress |
| 2         | Dashboard, Team Management             | dashboard.md, team.md     | Planned     |
| 3         | Admin Screens, Advanced Filtering      | admin.md, filtering.md    | Backlog     |
| ...       | ...                                    | ...                       | ...         |

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
