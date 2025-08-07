# UMIG Roadmap Directory

**Last Updated**: August 6, 2025  
**Project Status**: Sprint 3 - 🔄 IN PROGRESS (21/26 points completed, US-006 pending)

This directory contains the comprehensive development roadmap, sprint planning, and UI/UX specifications for the UMIG project, organized into focused subfolders for scalable project management.

## Directory Organization

### 📋 Sprint Planning & Development

**Location**: [sprint3/](./sprint3/)

Sprint-based development planning with detailed user stories, technical specifications, and progress tracking.

**Current Sprint**: Sprint 3 - API Foundation (July 30-Aug 6, 2025) 🔄

- **[sprint3/README.md](./sprint3/README.md)** - Sprint overview and file organization
- **[sprint3/sprint3-user-stories.md](./sprint3/sprint3-user-stories.md)** - Complete user story breakdown (US-001 through US-006)
- **[sprint3/sprint3-technical-tasks.md](./sprint3/sprint3-technical-tasks.md)** - Detailed technical implementation guide
- **[sprint3/sprint3-current-status.md](./sprint3/sprint3-current-status.md)** - Real-time progress tracking and velocity

**Individual User Stories**:

- **[sprint3/sprint3-us001.md](./sprint3/sprint3-us001.md)** - US-001: Plans API Foundation (✅ COMPLETED)
- **[sprint3/sprint3-us002.md](./sprint3/sprint3-us002.md)** - US-002: Sequences API with Ordering (✅ COMPLETED)
- **[sprint3/sprint3-us003.md](./sprint3/sprint3-us003.md)** - US-003: Phases API with Control Points (✅ COMPLETED)
- **[sprint3/sprint3-us004.md](./sprint3/sprint3-us004.md)** - US-004: Instructions API with Distribution (✅ COMPLETED)
- **[sprint3/sprint3-us005.md](./sprint3/sprint3-us005.md)** - US-005: Controls API Implementation (✅ COMPLETED)
- **[sprint3/sprint3-us006.md](./sprint3/sprint3-us006.md)** - US-006: Status Field Normalization (📋 PENDING)

**Future Structure**:

```
sprint1/    # UI Development & Integration
sprint2/    # Advanced Features & Testing
sprint4/    # Production Deployment & Optimization
```

### 🎨 UI/UX Specifications

**Location**: [ux-ui/](./ux-ui/)

Complete interface specifications, design assets, and UI templates for all UMIG interfaces.

- **[ux-ui/README.md](./ux-ui/README.md)** - UI/UX overview and implementation status
- **[ux-ui/admin_gui.md](./ux-ui/admin_gui.md)** - Admin GUI specification (SPA for entity management)
- **[ux-ui/iteration-view.md](./ux-ui/iteration-view.md)** - Iteration View specification (primary runsheet interface)
- **[ux-ui/step-view.md](./ux-ui/step-view.md)** - Step View specification (focused task execution)
- **[ux-ui/template.md](./ux-ui/template.md)** - Template for creating new UI specifications
- **[ux-ui/ROADMAP.md](./ux-ui/ROADMAP.md)** - UI-focused development roadmap
- **[ux-ui/StepView.drawio](./ux-ui/StepView.drawio)** - Visual diagrams and architecture

### 📈 Strategic Planning

**Location**: Root Directory

High-level strategic planning and comprehensive roadmap documentation.

- **[unified-roadmap.md](./unified-roadmap.md)** - **PRIMARY REFERENCE** - Complete development roadmap with business strategy, technical implementation, and AI-accelerated timelines
- **README.md** - This file - Directory organization and navigation guide

## Project Status Overview

### 🔄 Sprint 3 In Progress (21 of 26 Story Points)

**Epic 1: Canonical Data API Foundation**

- **US-001: Plans API Foundation** - Consolidated API managing master templates + instances (5 points) ✅
- **US-002: Sequences API with Ordering** - Drag-drop ordering with circular dependency detection (5 points) ✅
- **US-003: Phases API with Control Points** - Quality gates with progress aggregation (5 points) ✅
- **US-004: Instructions API with Distribution** - Team assignment with hierarchical filtering (3 points) ✅
- **US-005: Controls API Implementation** - Validation rules with override capabilities (3 points) ✅
- **US-006: Status Field Normalization** - Database quality with zero data loss migration (5 points) 📋

**Foundation Infrastructure**

- **Architecture Consolidation** - All 33 ADRs consolidated in solution-architecture.md
- **Admin GUI Implementation** - Complete 8-module SPA for entity management
- **Iteration View** - Primary runsheet interface with hierarchical filtering
- **Development Infrastructure** - Automated Postman collections, enhanced documentation
- **Pattern Library** - Reusable patterns enabling 46%+ velocity improvements

### 📋 Product Backlog (19 Story Points)

**Epic 2: Database Schema Evolution (8 points)**

- US-007: Assignment Schema Migration (3 points)
- US-008: Distribution Tracking Migration (2 points)
- US-009: Migration Rollback Scripts (3 points)

**Epic 3: Repository Layer Implementation (8 points)**

- US-010: Plan Repository with Canonical Methods (2 points)
- US-011: Sequence Repository with Ordering (2 points)
- US-012: Phase Repository with Progress (2 points)
- US-013: Instruction Repository with Distribution (2 points)

**Epic 4: UI Components (3 points)**

- US-014: Master Plan Template UI Design (1 point)
- US-015: Sequence Ordering Interface Design (1 point)
- US-016: Assignment Interface Prototype (1 point)

## Key Documentation Benefits

### Organized Structure

1. **Clear Separation**: Development planning (sprints) vs Design specifications (ux-ui)
2. **Scalable Organization**: Ready for multiple sprints and UI components
3. **Comprehensive Documentation**: Each subfolder has detailed README
4. **Progress Visibility**: Real-time status tracking and completion reports

### Sprint-Based Development

1. **User Story Tracking**: Individual files for each user story with complete specifications
2. **Technical Implementation**: Detailed guides following proven patterns
3. **Progress Monitoring**: Velocity measurement and sprint planning
4. **Knowledge Retention**: Lessons learned and pattern documentation

### UI/UX Centralization

1. **Interface Specifications**: Complete specifications for all interfaces
2. **Design Assets**: Visual diagrams and architectural drawings
3. **Implementation Status**: Current status and future enhancements
4. **Template System**: Standardized approach for new UI specifications

## Navigation Guide

### For Development Work

1. **Start Here**: [unified-roadmap.md](./unified-roadmap.md) for complete project overview
2. **Current Sprint**: [sprint3/README.md](./sprint3/README.md) for current development tasks
3. **Next Tasks**: [sprint3/sprint3-current-status.md](./sprint3/sprint3-current-status.md) for immediate priorities

### For UI/UX Work

1. **Interface Overview**: [ux-ui/README.md](./ux-ui/README.md) for complete UI status
2. **Specific Interfaces**: Individual .md files in ux-ui/ folder
3. **New Specifications**: Use [ux-ui/template.md](./ux-ui/template.md)

### For Project Planning

1. **Strategic Planning**: [unified-roadmap.md](./unified-roadmap.md) for AI-accelerated timelines
2. **Sprint Planning**: [sprint3/sprint3-user-stories.md](./sprint3/sprint3-user-stories.md) for user story breakdown
3. **Technical Planning**: [sprint3/sprint3-technical-tasks.md](./sprint3/sprint3-technical-tasks.md) for implementation details

## File Naming Conventions

### Sprint Files

- **sprint{N}-user-stories.md** - Complete user story breakdown for sprint
- **sprint{N}-technical-tasks.md** - Technical implementation guide and scaffolding
- **sprint{N}-current-status.md** - Real-time progress tracking and velocity
- **sprint{N}-us{XXX}.md** - Individual user story specifications
- **sprint{N}-us{XXX}-completion.md** - User story completion reports

### UI/UX Files

- **{interface-name}.md** - Complete interface specification
- **{interface-name}.drawio** - Visual diagrams and architecture
- **template.md** - Standard template for new specifications
- **ROADMAP.md** - UI-focused development roadmap

## Related Documentation

### Technical References

- **[Solution Architecture](/docs/solution-architecture.md)** - Consolidated architectural decisions (33 ADRs)
- **[API Documentation](/docs/api/)** - OpenAPI specifications and endpoint documentation
- **[Data Model](/docs/dataModel/)** - Database schema and entity relationships
- **[Development Journal](/docs/devJournal/)** - Daily development progress and lessons learned

### Project Context

- **[CLAUDE.md](/CLAUDE.md)** - Project overview and development patterns
- **[CHANGELOG.md](/CHANGELOG.md)** - Release notes and feature completion tracking
- **[README.md](/README.md)** - Project setup and getting started guide

## Sprint 3 Current Results 🔄

### Velocity Achievement

- **Planned**: 26 story points over 5 working days (5.2 points/day planned)
- **Delivered**: 21 story points completed, 5 pending (US-006)
- **Total Achievement**: 40 story points including enhancements
- **Completion Rate**: 80% (5 of 6 user stories completed)
- **Status**: 🔄 IN PROGRESS - US-006 pending to complete sprint

### Technical Achievements

- **Complete API Foundation**: 6 consolidated APIs managing master templates + instances
- **Data Quality Excellence**: Zero data loss migration across 2,500+ records
- **ScriptRunner Integration**: All deployment challenges resolved with lazy-loading patterns
- **Type Safety Compliance**: ADR-031 patterns proven and documented across all APIs
- **Infrastructure Enhancement**: Automated Postman generation with comprehensive documentation
- **Pattern Library**: Established reusable patterns enabling 46%+ velocity improvements
- **Performance Excellence**: Sub-200ms response times across all endpoints

---

**Next Phase**: Begin MVP development using the established API patterns and backlog items from Epic 2, 3, and 4.
