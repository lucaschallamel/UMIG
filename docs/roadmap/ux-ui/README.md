# UI/UX Specifications

This directory contains all user interface and user experience specifications for the UMIG project.

## UI/UX Files Organization

### Core UI Specifications
- **[admin_gui.md](./admin_gui.md)** - Admin GUI specification for entity management (users, teams, environments, applications, labels)
- **[iteration-view.md](./iteration-view.md)** - Detailed specification for the Iteration View (primary runsheet interface)
- **[step-view.md](./step-view.md)** - Specification for the Step View display in Confluence pages

### Design Assets & Templates
- **[StepView.drawio](./StepView.drawio)** - Visual diagram for Step View architecture using Draw.io
- **[template.md](./template.md)** - Template for creating new UI/UX specifications
- **[ROADMAP.md](./ROADMAP.md)** - UI-focused roadmap and design progression

## UI Architecture Overview

### Interface Types
1. **Admin GUI (SPA)**: Single Page Application for administrative entity management
2. **Iteration View**: Primary operational interface for cutover execution
3. **Step View**: Focused task execution interface embeddable in Confluence pages

### Technology Stack
- **Frontend**: Vanilla JavaScript with modular architecture (8-module pattern)
- **Styling**: AUI (Atlassian User Interface) components with custom CSS
- **Integration**: Confluence macro system with ScriptRunner backend APIs

### Key Design Principles
- **Role-Based Access**: NORMAL, PILOT, ADMIN permission levels with visual controls
- **Real-Time Updates**: AJAX polling for live status updates during cutover operations
- **Responsive Design**: Mobile-friendly interfaces for field operations
- **Accessibility**: WCAG compliance with keyboard navigation and screen reader support

## Implementation Status

### ✅ Completed Interfaces
- **Admin GUI**: Full 8-module SPA with CRUD operations for all entities
- **Iteration View**: Complete operational interface with hierarchical filtering
- **Step View**: Standalone focused interface with URL parameter-driven configuration

### 🚧 In Development
- **Main Dashboard**: Central command and control interface (post-Sprint 3)
- **Planning Feature**: HTML export for shareable macro-plans (post-Sprint 3)

### 📋 Future Enhancements
- **Mobile Optimization**: Enhanced mobile experience for field operations
- **Offline Support**: Cached operations for intermittent connectivity
- **Advanced Visualizations**: Progress charts and dependency graphs

## File Naming Convention

- **{interface-name}.md** - Complete specification with wireframes and behavior
- **{interface-name}.drawio** - Visual diagrams and architecture
- **template.md** - Standard template for new specifications

## Cross-References

### Related Sprint 3 Work
- UI components implemented through Sprint 3 APIs (in `/docs/roadmap/sprint3/`)
- API endpoints documented support these UI specifications

### Implementation Files
- JavaScript modules: `/src/groovy/umig/web/js/admin-gui/*`
- Macro implementations: `/src/groovy/umig/macros/`
- API endpoints: `/src/groovy/umig/api/v2/`

---

**UI/UX Focus**: Creating intuitive, role-based interfaces that transform complex IT cutover operations into manageable, real-time collaborative experiences.