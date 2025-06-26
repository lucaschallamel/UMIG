# Product Context

# No changes from the previous version. This document is stable.

## 1. Problem Statement

The historical method of managing IT cutover Implementation Plans (IPs) using a large, macro-enabled Excel file proved to be sluggish, not scalable, and impossible for real-time collaboration. The subsequent evolution to a Confluence and Draw.io based system, while improving documentation accessibility, created a new set of problems. The current system is fundamentally a static documentation platform, not a dynamic execution engine. Orchestration relies on fragile, manual processes like `mailto:` links and Outlook reminders.

This leads to several critical issues:
*   **No Single Source of Truth:** The real-time status of the cutover is fragmented across email inboxes and requires manual updates to a master diagram.
*   **High Risk of Human Error:** Manual dependency tracking and notifications can be forgotten or missed, causing delays that cascade through the plan.
*   **Poor Auditability:** Generating post-run reports is a time-consuming forensic exercise of collating page histories and email threads.
*   **High Cognitive Load:** The Cutover Manager is forced into a reactive state of constantly chasing status updates rather than strategically managing exceptions.

## 2. Product Vision

This product will be the definitive command and control centre for all IT cutover activities. It will transform the Implementation Plan (IP) from a static document into a living, breathing execution plan. An IP is created for a specific Data Migration (e.g., identified by a code name) and can have multiple Iterations (e.g., DR1, DR2, Go-Live Cutover) representing different phases or practice runs of the same overall plan.

It should work as follows:
*   A Cutover Pilot opens a designated Confluence page and interacts with a live dashboard.
*   The system clearly shows which steps are ready to start based on dependency rules.
*   When a pilot activates a step, the assigned team is automatically notified with a link to their detailed instructions.
*   When a team completes their task and updates the status in the tool, the system logs the event, updates the dashboard for everyone, and automatically makes the next dependent tasks available.
*   The system will track planned vs. actual durations and flag any delays, allowing for proactive management of the timeline.
*   The system will provide a planning view to generate a shareable, time-based HTML macro-plan for leadership and stakeholder communication.

## 3. Recent Improvements Supporting the Vision

The adoption of the SPA + REST pattern (ADR020) for all administrative interfaces, together with a robust integration testing framework, has significantly improved the reliability, maintainability, and user experience of the product. Admin UIs are now dynamic, scalable, and consistent, supporting rapid onboarding and confident operation. Integration testing ensures that backend and database changes are always aligned, reducing operational risk and supporting the product's goal of being a trustworthy command and control centre.
