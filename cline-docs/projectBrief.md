# Project Brief: Runsheet Orchestration Engine

## 1. High-Level Overview

This project is to design and build a bespoke, multi-user, real-time web application to manage and orchestrate complex IT cutover events for a private bank's data migration project. The application will serve as a central command and control platform, replacing a less efficient system based on Confluence, Draw.io diagrams, and manual email notifications.

**Note:** As of June 2025, the architecture and local development environment are finalized and stable. All technical and architectural decisions are now locked for the MVP phase, as documented in the ADRs and memory bank.

## 2. Core Requirements

* **Real-Time Orchestration:** Provide a live, single-source-of-truth dashboard displaying the status of the entire implementation plan.
* **Multi-User Collaboration:** Support multiple concurrent pilots managing the plan and up to 100 end-users executing tasks.
* **Hierarchical Plan Management:** Model a hierarchical structure: `Implementation Plan > Macro-Phase > Chapter > Step > Task`.
* **Dependency Management:** Enforce predecessor/successor relationships between steps.
* **Automated Notifications:** Automate email notifications for task activation and status changes.
* **Auditing and Logging:** Maintain an immutable audit trail of all actions, status changes, and communications for compliance and post-mortem analysis.
* **Quality Assurance:** Integrate a system of `Controls` to validate the successful completion of tasks within specific iterations (e.g., `RUN1`, `DR1`).
* **Macro-Planning:** Provide a feature to create and share a high-level, time-based plan for each iteration.

## 3. Primary Goal

The primary goal is to deliver a Minimum Viable Product (MVP) within a strict four-week timeframe. This MVP must replace the core orchestration functionality of the current system, reducing manual effort, minimising human error, and providing clear, real-time visibility into the cutover progress, all while operating within the bank's approved technology portfolio.
