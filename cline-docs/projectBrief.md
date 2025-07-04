# Project Brief: Runsheet Orchestration Engine

## 1. High-Level Overview

This project is to design and build a bespoke, multi-user, real-time web application to manage and orchestrate complex IT cutover events for a private bank's data migration project. The application will serve as a central command and control platform, replacing a less efficient system based on Confluence, Draw.io diagrams, and manual email notifications.

## 2. Core Requirements

* **Real-Time Orchestration:** Provide a live, single-source-of-truth dashboard displaying the status of the entire implementation plan via AJAX polling. The Iteration View macro now renders correctly with robust, environment-agnostic static asset serving.
* **Multi-User Collaboration:** Support multiple concurrent pilots managing the plan and up to 100 end-users executing tasks.
* **Hierarchical Plan Management:** Model a hierarchical structure: `Migration > Iteration > Plan > Sequence > Phase > Step > Instruction`. The data model has been refactored to be "iteration-centric" to support flexible plan execution across different iterations.
* **Dependency Management:** Enforce predecessor/successor relationships between steps.
* **Automated Notifications:** Automate email notifications for task activation and status changes via the enterprise Exchange server.
* **Auditing and Logging:** Maintain an immutable audit trail of all actions, status changes, and communications for compliance and post-mortem analysis.
* **Quality Assurance:** Integrate a system of `Controls` to validate the successful completion of tasks within specific iterations (e.g., `RUN1`, `DR1`).
* **Data Import Robustness:** Implement a robust and efficient pipeline for importing structured data from Confluence JSON exports into the PostgreSQL database, ensuring data integrity and performance.
* **Macro-Planning:** Provide a feature to create and share a high-level, time-based plan for each iteration in HTML format.

## 3. Architectural Principles

* **N-Tier Architecture:** The application adheres to an N-Tier architecture model, segregating the codebase into distinct layers: UI, Business Process, Business Objects Definition, Data Transformation, and Data Access Layer.
* **Pure ScriptRunner Application Structure:** The project follows a consolidated `src/groovy/umig/` namespace for all backend code and frontend assets, ensuring clarity, future-proofing, and adherence to ScriptRunner's scan path.
* **Node.js-based Local Development:** The local development environment is orchestrated by Node.js scripts using Podman/Docker and Ansible, providing a unified and reproducible setup.
* **Standardised REST API Patterns:** All REST API endpoints follow strict patterns for implementation, error handling, and idempotency, as detailed in ADR-023.

## 4. Primary Goal

The primary goal is to deliver a Minimum Viable Product (MVP) within a strict four-week timeframe. This MVP must replace the core orchestration functionality of the current system, reducing manual effort, minimising human error, and providing clear, real-time visibility into the cutover progress, all while operating within the bank's approved technology portfolio (Confluence, ScriptRunner, PostgreSQL, vanilla JavaScript). The focus is on delivering a robust, maintainable, and scalable solution that aligns with modern architectural best practices.
