# Project Brief

## Overview

UMIG is a unified migration and integration guide platform designed to streamline and standardise complex migration processes. The project aims to provide robust, maintainable, and user-friendly tools for managing migration steps, team membership, and associated data, with a strong emphasis on clarity, consistency, and automation.

## Recent Milestones

### Standard REST API Implementation Patterns (2025-07-01)
The project formalised standard REST API implementation patterns across the platform. This milestone significantly improves the consistency, robustness, and maintainability of all backend endpoints, ensuring a predictable and high-quality client experience.

### Iteration-Centric Data Model (2025-07-02)
The core data model has been refactored to be "iteration-centric" ("Model C"). The `iterations_ite` table now links a migration to a master plan via `plm_id`, allowing a single migration to use different plans for different iterations.

### Node.js-based Local Development Orchestration (2025-07-02)
The entire local development setup has been refactored to use a Node.js-based orchestration layer, replacing shell scripts with Node.js equivalents and introducing a unified `umig-local` CLI for environment management.

### Test Suite Stability and Reliability (2025-07-02)
The project's test suite has been significantly stabilised and hardened through precise SQL query mocks and improved test isolation, adhering to the new `ADR-026` standard for specific mocks in tests.

### Generator Naming Convention Overhaul (2025-07-02)
All data generator scripts and their corresponding tests now follow a consistent 3-digit numeric prefix naming convention, ensuring robust ordering, traceability, and simplified maintenance.

### Faker Deprecation and Test Suite Fixes (2025-07-02)
Deprecated `faker` API calls have been replaced, and critical Jest configuration issues have been resolved, ensuring the test suite runs successfully without warnings.

## Core Goals

- Deliver a reliable, extensible migration management system.
- Ensure all APIs and user interfaces are consistent, well-documented, and easy to use.
- Maintain a single source of truth for all API contracts via OpenAPI specifications.
- Foster a development culture of clarity, error resilience, and best practice adherence.
