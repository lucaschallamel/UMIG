# UMIG Roadmap Directory

The `/docs/roadmap/` directory contains structured project management documentation including sprint planning, strategic roadmaps, and UI/UX specifications for the UMIG project.

## Directory Purpose

This folder serves as the central hub for:

- **Sprint-based development planning** and progress tracking
- **Strategic roadmap documentation** with business objectives
- **UI/UX interface specifications** and design assets
- **Project backlog management** and priority planning

## Content Organization

### 📋 Sprint Documentation

**Structure**: `sprint{N}/` directories for each sprint cycle

Contains user stories, technical specifications, completion reports, and sprint retrospectives. Each sprint folder includes:

- User story breakdowns and acceptance criteria
- Technical implementation guides and patterns
- Progress tracking and velocity metrics
- Completion reports and lessons learned

**Current Active Sprints**: Sprint 7 (in progress), Sprint 8 (planned)
**Completed Sprints**: Sprint 3-6 (archived with full documentation)

### 🎯 Strategic Planning

**Location**: Root directory files

- **[unified-roadmap.md](./unified-roadmap.md)** - **PRIMARY REFERENCE** - Complete project roadmap with business strategy and timelines
- High-level project vision and milestone planning
- AI-accelerated development strategies
- Business value delivery tracking

### 🎨 UI/UX Specifications

**Location**: [ux-ui/](./ux-ui/) subdirectory

Complete interface documentation including:

- Admin GUI specifications (entity management SPA)
- Iteration View (primary runsheet interface)
- Step View (focused task execution)
- Design assets and visual diagrams
- UI implementation templates

### 📦 Backlog Management

**Locations**: `backlog/` and sprint-specific backlogs

Organized product backlog with:

- Deferred user stories from completed sprints
- Future feature planning and prioritization
- Epic organization and story dependencies
- Technical debt items and infrastructure work

## Document Types & Standards

### Sprint Documentation

- **sprint{N}-story-breakdown.md** - Complete user story specifications
- **US-{XXX}-{title}.md** - Individual user story details
- **TD-{XXX}-{title}.md** - Technical debt items
- **README.md** - Sprint overview and navigation

### Status Tracking

- **\_done/** subdirectories for completed work
- **\_technical_details/** for implementation specifics
- Progress indicators: ✅ (complete), ⏳ (in progress), 📋 (planned)

### Cross-References

All roadmap documents link to:

- Architecture decisions in `/docs/architecture/`
- API specifications in `/docs/api/`
- Development journal entries in `/docs/devJournal/`
- Project setup in root `CLAUDE.md`

## Navigation Guide

### For Current Work

1. **Start Here**: [unified-roadmap.md](./unified-roadmap.md) for project overview
2. **Active Sprint**: Check sprint7/ for current development tasks
3. **Immediate Tasks**: Look for ⏳ status indicators

### For Planning

1. **Backlog Review**: Check backlog/ directory for future work
2. **Sprint Planning**: Review completed sprints for velocity and patterns
3. **Strategic Direction**: Unified roadmap for long-term objectives

### For Implementation

1. **Technical Specs**: Individual user story files contain implementation details
2. **UI References**: ux-ui/ directory for interface requirements
3. **Patterns**: Completed sprints demonstrate proven development patterns

## Key Features

- **Sprint-based organization** with clear completion tracking
- **Scalable structure** supporting multiple concurrent development streams
- **Cross-referenced documentation** linking to architectural decisions
- **Status visibility** with real-time progress indicators
- **Template standardization** for consistent documentation quality
- **Historical preservation** of completed work for pattern reuse

## Related Documentation

- **[/docs/architecture/](/docs/architecture/)** - Architectural decisions and ADRs
- **[/docs/api/](/docs/api/)** - API specifications and endpoint documentation
- **[/docs/devJournal/](/docs/devJournal/)** - Daily development progress
- **[/CLAUDE.md](/CLAUDE.md)** - Project overview and development patterns

---

_This directory serves as the authoritative source for UMIG project planning, progress tracking, and strategic direction._
