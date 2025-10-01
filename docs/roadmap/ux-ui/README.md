# UI/UX Specifications & Email Template Guide

**Last Updated**: September 30, 2025 | **Sprint**: Sprint 8 - TD-015 Email Template Consistency Finalization

This directory contains all user interface and user experience specifications for the UMIG project, plus the **Email Template Selection Guide** for production email notifications.

---

## 📧 Email Template Selection Guide (TD-015)

### 🎯 Quick Start: Which Template Should I Use?

#### For Production Use

**✅ USE THIS**: `/canonical/enhanced-mobile-email-template.html`

- **100% Feature Complete** (20/20 features)
- **Mobile-First Responsive** (320px-1000px)
- **Enterprise Email Client Support** (Gmail, Outlook, Apple Mail)
- **Dark Mode & Print Styles** included
- **35 Variables Supported** (100% coverage)
- **WCAG 2.1 Compliant** (touch-friendly CTAs)

#### For Reference/Specification

**📚 REFERENCE ONLY**: `/reference/mobile-email-template-mock.html`

- Design specification/mockup
- DO NOT use for production emails
- Use as reference for feature requirements

#### ❌ DO NOT USE

**DEPRECATED**: `/deprecated/email-template.html`

- Pre-mobile enhancement template
- Missing 50% of features
- Superseded by canonical template

### 📂 Email Template Directory Structure

```
/docs/roadmap/ux-ui/
├── canonical/
│   └── enhanced-mobile-email-template.html  ← PRODUCTION TEMPLATE (45 KB)
├── reference/
│   └── mobile-email-template-mock.html       ← Design specification (43 KB)
├── deprecated/
│   ├── email-template.html                   ← Pre-mobile template (24 KB) ❌
│   └── README.md                              ← Deprecation notice
└── mock/                                      ← UI mockups and wireframes
```

### ✨ Canonical Template Features

- **Mobile-Responsive**: 4 breakpoints (320px, 600px, 768px, 1000px)
- **Dark Mode**: `@media (prefers-color-scheme: dark)` with 15+ overrides
- **Print Styles**: Professional layout for printed documentation
- **Outlook MSO**: Full Outlook 2007-2019 compatibility
- **Touch-Friendly CTAs**: 44px minimum height (WCAG 2.1)
- **Comments Section**: Recent comments display (up to 3)
- **Instructions Table**: Responsive 5-column table with status badges

### 📊 Template Comparison

| Feature            | Canonical    | Deprecated  |
| ------------------ | ------------ | ----------- |
| File Size          | 45.3 KB      | 24.0 KB     |
| Features           | 20/20 (100%) | 10/20 (50%) |
| Variables          | 35/35 (100%) | 18/35 (51%) |
| Mobile Breakpoints | 4            | 1           |
| Dark Mode          | ✅ Yes       | ❌ No       |
| Production Ready   | ✅ Yes       | ❌ No       |

### 🔗 Email Template Documentation

- **Phase 1 Audit**: `/docs/roadmap/sprint8/TD-015-Template-Audit-Report.md`
- **Phase 2 Database Validation**: `/docs/roadmap/sprint8/TD-015-Database-Validation-Report.md`
- **Phase 3 Consolidation**: `/docs/roadmap/sprint8/TD-015-Template-Consolidation-Report.md`
- **EmailService API**: `/docs/api/email-service.md`

---

## 🖥️ UI/UX Interface Specifications

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
