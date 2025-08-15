# Project Brief: Runsheet Orchestration Engine

## 1. High-Level Overview

This project is to design and build a bespoke, multi-user, real-time web application to manage and orchestrate complex IT cutover events for a private bank's data migration project. The application will serve as a central command and control platform, replacing a less efficient system based on Confluence, Draw.io diagrams, and manual email notifications.

## 2. Core Requirements

- **Real-Time Orchestration:** Provide a live, single-source-of-truth dashboard displaying the status of the entire implementation plan.
- **Multi-User Collaboration:** Support multiple concurrent pilots managing the plan and up to 100 end-users executing tasks.
- **Hierarchical Plan Management:** Model a hierarchical structure: `Implementation Plan > Macro-Phase > Chapter > Step > Task`.
- **Dependency Management:** Enforce predecessor/successor relationships between steps.
- **Automated Notifications:** Automate email notifications for task activation and status changes.
- **Auditing and Logging:** Maintain an immutable audit trail of all actions, status changes, and communications for compliance and post-mortem analysis.
- **Quality Assurance:** Integrate a system of `Controls` to validate the successful completion of tasks within specific iterations (e.g., `RUN1`, `DR1`).
- **Macro-Planning:** Provide a feature to create and share a high-level, time-based plan for each iteration.

## 3. Primary Goal

The primary goal is to deliver a Minimum Viable Product (MVP) within a strict four-week timeframe. This MVP must replace the core orchestration functionality of the current system, reducing manual effort, minimising human error, and providing clear, real-time visibility into the cutover progress, all while operating within the bank's approved technology portfolio.

## 4. Current Project Status (August 15, 2025)

**Sprint 4 Progress**: 58.6% complete (17 of 29 story points delivered)
**Timeline Risk**: Reduced to LOW following successful US-028 Phase 1 completion
**Major Milestone**: Enhanced IterationView operational interface with production-ready real-time capabilities

### Recent Achievements
- **US-028 Enhanced IterationView Phase 1**: 100% complete with comprehensive UAT validation
- **StepsAPIv2Client**: Production-ready intelligent caching reducing API calls by 60%
- **Real-Time Synchronization**: 2-second polling with optimized performance (<2.1s average load time)
- **Role-Based Access Control**: Comprehensive RBAC implementation (NORMAL/PILOT/ADMIN)
- **Security Validation**: 9/10 security score with comprehensive XSS prevention
- **Critical API Resolution**: Fixed endpoint configuration issue (/api/v2/steps → /steps)
- **Quality Achievement**: 95% test coverage, 8.8/10 code review score

### Remaining MVP Components
- Enhanced IterationView Phases 2-3: Drag-drop reordering, team collaboration features
- Admin GUI Complete Integration: Final administrative interface completion
- API Documentation: Comprehensive API reference completion
- Integration Test Suite: Expanded test coverage across all components
