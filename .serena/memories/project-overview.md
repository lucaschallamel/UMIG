# UMIG Project Overview

## Purpose
UMIG (Unified Migration Implementation Guide) is a pure ScriptRunner application for Atlassian Confluence designed to manage complex IT cutover events. It provides a structured approach to planning, tracking, and executing large-scale IT migrations with hierarchical organization and real-time progress tracking.

## Key Characteristics
- **Domain**: IT migration planning and execution management
- **Context**: Enterprise IT infrastructure migrations, data center moves, application cutover events
- **Scale**: Manages migrations with 1000+ steps across multiple teams and environments
- **Users**: IT managers, migration coordinators, technical teams, executives

## Core Features
- Hierarchical migration structure (Migrations → Iterations → Plans → Sequences → Phases → Steps → Instructions)
- Team-based assignment and responsibility tracking
- Real-time progress monitoring and dashboards
- Email notifications and status updates
- Control point validation and compliance tracking with emergency override capabilities
- Quality gate management system with automated validation preventing execution errors
- Runsheet generation and execution tracking

## Project Status (August 2025)
- **Phase**: Sprint 3 COMPLETED - All foundational APIs delivered
- **Sprint History**: Sprint 1 (16-27 Jun), Sprint 2 (28 Jun-17 Jul), Sprint 3 (30 Jul-6 Aug)
- **Sprint Progress**: 21 of 26 story points completed, US-006 Status Field Normalization pending
- **Completed (August 2025)**: All 5 Core APIs (Plans, Sequences, Phases, Instructions, Controls), Admin UI, comprehensive testing
- **Recent Achievement**: Controls API (US-005) with quality gate management system completed 6 August 2025
- **Remaining for MVP**: Main Dashboard UI, Planning Feature (HTML export), Data Import Strategy
- **Technical Foundation**: 184 control instances validated, 20+ endpoints per major API, 90%+ test coverage
- **Documentation**: Sprint renaming completed from "Sprint 0" to "Sprint 3" across all project documentation

## Business Context
- **Target Users**: Enterprise IT teams managing complex migration projects
- **Use Cases**: Data center migrations, cloud transitions, application cutover events
- **Success Metrics**: Reduced migration risk, improved coordination, faster execution times
- **Integration**: Deep Confluence integration for collaboration and documentation