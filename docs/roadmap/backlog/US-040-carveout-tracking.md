# US-040 Carve-out Tracking Document

**Date**: August 21, 2025  
**Author**: Development Team  
**Purpose**: Track scope changes from US-036 to US-040

## Summary

Email content features originally planned in US-036 (StepView UI Refactoring) have been carved out and moved to US-040 (Enhanced Email Notifications) to better manage scope and complexity.

## Features Moved from US-036 to US-040

### 1. Email Content Export Features

- **PDF export for step details** - Now part of US-040 Phase 0 (email template enhancement)
- **Print-friendly view with optimized layout** - Transformed into mobile-responsive email templates
- **Step data export for email distribution** - Incorporated into comprehensive email content

### 2. Mobile-Responsive Email Templates

- **Complete step details rendering** in email body
- **All detailed instructions** (excluding comments) formatted for email
- **Mobile-friendly responsive design** (320px-1024px width support)
- **Cross-platform email client compatibility** (8+ email clients)

### 3. Content Formatting Features

- **HTML sanitization** for security while preserving formatting
- **Progressive enhancement** with plain text fallbacks
- **Touch-friendly interfaces** for mobile email clients
- **Proper font scaling** and readability optimization

## Scope Impact

### US-036 (StepView UI Refactoring)

- **Original Points**: 3 points
- **Remaining Scope**: 3 points (unchanged, focused on UI within Confluence)
- **Status**: Email export features removed, focus on in-app experience

### US-040 (Enhanced Email Notifications)

- **Original Points**: 3 points (clickable links only)
- **Updated Points**: 5 points (full step content + clickable links)
- **New Effort**: 34 hours (increased from 22 hours)
- **Status**: Expanded to include comprehensive email content delivery

## Technical Changes

### New Phase 0 Added to US-040

**Email Template Enhancement** (12 hours)

- Mobile-responsive HTML templates
- Content formatting service implementation
- Template variable enhancement for step metadata
- Cross-client compatibility testing

### API Integration Updates

- Enhanced data retrieval for complete step content
- Instruction formatting for email rendering
- Security validation for HTML content
- Performance optimization for larger emails

## Benefits of Carve-out

1. **Better Scope Management**: Each story now has a clear, focused objective
2. **Mobile-First Strategy**: US-040 can focus entirely on mobile email experience
3. **Risk Mitigation**: Complex email rendering separated from UI refactoring
4. **Parallel Development**: Teams can work on both stories independently
5. **Clear Testing Boundaries**: Distinct acceptance criteria for each story

## Dependencies

- US-040 does NOT depend on US-036 completion
- Both stories can proceed in parallel
- Shared components: StepsAPI v2 for data retrieval
- No blocking dependencies between stories

## Timeline Impact

- **US-036**: Remains in Sprint 5 (Days 3-4) with 3 points
- **US-040**: Moved to backlog with 5 points, prioritized for next sprint
- **No impact** on Sprint 5 MVP delivery timeline

## Approval

This carve-out has been documented and tracked for project transparency. The scope changes have been reflected in both user stories with clear cross-references.

---

**Document Status**: COMPLETE  
**Last Updated**: August 21, 2025
