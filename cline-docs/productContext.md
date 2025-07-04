# Product Context

## 1. Problem Statement

The historical method of managing IT cutover runbooks using a large, macro-enabled Excel file proved to be sluggish, not scalable, and impossible for real-time collaboration. The subsequent evolution to a Confluence and Draw.io based system, while improving documentation accessibility, created a new set of problems. The current system is fundamentally a static documentation platform, not a dynamic execution engine. Orchestration relies on fragile, manual processes like `mailto:` links and Outlook reminders.

This leads to several critical issues:
* **No Single Source of Truth:** The real-time status of the cutover is fragmented across email inboxes and requires manual updates to a master diagram.
* **High Risk of Human Error:** Manual dependency tracking and notifications can be forgotten or missed, causing delays that cascade through the plan.
* **Poor Auditability:** Generating post-run reports is a time-consuming forensic exercise of collating page histories and email threads.
* **High Cognitive Load:** The Cutover Manager is forced into a reactive state of constantly chasing status updates rather than strategically managing exceptions.

## 2. Product Vision

This product will be the definitive command and control centre for all IT cutover activities. It will transform the runsheet from a static document into a living, breathing execution plan, supported by a robust N-Tier architecture and a consolidated, maintainable codebase.

It should work as follows:
* A Cutover Pilot opens a designated Confluence page and interacts with a live dashboard. The Iteration View macro now renders correctly, providing a reliable and interactive user interface.
* The system clearly shows which steps are ready to start based on dependency rules, leveraging the new iteration-centric data model for flexible plan execution.
* When a pilot activates a step, the assigned team is automatically notified with a link to their detailed instructions.
* When a team completes their task and updates the status in the tool, the system logs the event, updates the dashboard for everyone, and automatically makes the next dependent tasks available. The backend APIs ensure robust handling of these updates, with enhanced error reporting for reliability.
* The system will track planned vs. actual durations and flag any delays, allowing for proactive management of the timeline.
* The system will provide a planning view to generate a shareable, time-based HTML macro-plan for leadership and stakeholder communication.
* A robust data import pipeline, utilising `psql \copy` with staging tables, ensures efficient and reliable ingestion of large volumes of structured data from Confluence JSON exports, maintaining data integrity and performance.
