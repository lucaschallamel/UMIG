# Enhanced Mobile Email Template Integration Guide

**Version**: 1.0  
**Date**: 2025-08-26  
**Context**: US-039 Enhanced Email Notifications - Phase 0 Template Design

## Overview

This guide documents the integration of the new mobile-responsive email templates with the existing Enhanced Email Service foundation. The templates build upon the 30% complete foundation from US-036 and provide enterprise-grade mobile compatibility across 8+ email clients.

## Template Variables Reference

### Core Step Instance Variables

The Enhanced Email Service provides these variables to all templates:

```groovy
// Available in all notification types
stepInstance: [
    sti_id: UUID,                    // Step instance ID
    sti_code: String,                // Step code (e.g., "STP-001")
    sti_name: String,                // Step name
    sti_description: String,         // Step description
    sti_status: String,              // Current status
    sti_duration_minutes: Integer,   // Estimated duration
    team_name: String,               // Assigned team name
    environment_name: String,        // Target environment
    predecessor_code: String,        // Previous step code
    predecessor_name: String,        // Previous step name
    plan_name: String,               // Plan name
    sequence_name: String,           // Sequence name
    phase_name: String,              // Phase name
    migration_name: String,          // Migration name
    iteration_name: String,          // Iteration name
    instructions: List<Map>          // List of instructions
]

// URL Construction Variables (Enhanced Service)
stepViewUrl: String,                 // Constructed Confluence URL
hasStepViewUrl: Boolean,             // URL availability flag
migrationCode: String,               // Migration code for URL
iterationCode: String                // Iteration code for URL

// Notification Context Variables
changedAt: String,                   // Formatted timestamp
changedBy: String,                   // Username who made changes
openedBy: String,                    // Username who opened step
completedBy: String,                 // Username who completed instruction
```

### Status Change Notifications

Additional variables for `STEP_STATUS_CHANGED` notifications:

```groovy
oldStatus: String,                   // Previous status
newStatus: String,                   // New status
statusColor: String                  // CSS color for status badge
```

### Instruction Completion Notifications

Additional variables for `INSTRUCTION_COMPLETED` notifications:

```groovy
instruction: [
    ini_id: UUID,                    // Instruction ID
    ini_name: String,                // Instruction name
    ini_description: String,         // Instruction description
    ini_duration_minutes: Integer,   // Duration in minutes
    completed: Boolean               // Completion status
]
```

## Email Client Compatibility Matrix

### ✅ Supported Email Clients (8+)

| Client           | Version            | Mobile | Desktop | Notes                           |
| ---------------- | ------------------ | ------ | ------- | ------------------------------- |
| **Outlook**      | 2013/2016/2019/365 | ✅     | ✅      | MSO conditional styles included |
| **Gmail**        | Web/Mobile         | ✅     | ✅      | Responsive design optimized     |
| **Apple Mail**   | iOS/macOS          | ✅     | ✅      | Webkit optimizations            |
| **Yahoo Mail**   | Web/Mobile         | ✅     | ✅      | Table-based layout              |
| **Android Mail** | Native             | ✅     | N/A     | Touch-friendly buttons          |
| **Thunderbird**  | 78+                | ✅     | ✅      | Standards compliant             |
| **Protonmail**   | Web/Mobile         | ✅     | ✅      | Security-focused design         |
| **Office 365**   | Web/Mobile         | ✅     | ✅      | Exchange integration            |

### 🎯 Design Specifications

- **Maximum Width**: 600px (desktop), 100% (mobile)
- **Minimum Touch Target**: 44x44px (iOS guidelines)
- **Font Stack**: Segoe UI, system-ui, -apple-system, Helvetica Neue, Arial
- **Color Contrast**: WCAG AA compliant (4.5:1 minimum)
- **Image Alt Text**: Descriptive text for all images
- **Semantic HTML**: Proper role attributes for accessibility

## Integration with Enhanced Email Service

### Template Storage

Templates are stored in the `email_templates_emt` table with these fields:

```sql
emt_id UUID,                     -- Template UUID
emt_type VARCHAR(50),            -- Notification type
emt_name VARCHAR(255),           -- Human-readable name
emt_subject TEXT,                -- Email subject with variables
emt_body_html TEXT,              -- HTML template content
emt_is_active BOOLEAN            -- Active status
```

### Template Processing

The Enhanced Email Service processes templates using Groovy's `SimpleTemplateEngine`:

```groovy
// Template variable substitution
def variables = [
    stepInstance: stepData,
    oldStatus: previousStatus,
    newStatus: currentStatus,
    statusColor: getStatusColor(currentStatus),
    stepViewUrl: urlService.buildStepViewUrl(...),
    hasStepViewUrl: urlService.isAvailable(),
    // ... other context variables
]

def processedHtml = processTemplate(template.emt_body_html, variables)
```

### URL Construction Integration

The Enhanced Email Service automatically constructs stepView URLs:

```groovy
// URL construction (already implemented)
stepViewUrl = UrlConstructionService.buildStepViewUrl(
    stepInstanceUuid,
    migrationCode,
    iterationCode
)

// Template receives:
hasStepViewUrl: stepViewUrl != null
stepViewUrl: 'https://confluence.company.com/...'
```

## Mobile Responsive Features

### Breakpoints

```css
/* Tablet (600px and below) */
@media screen and (max-width: 600px) {
  .email-container {
    margin: 0 10px !important;
  }
  .header-title {
    font-size: 24px !important;
  }
  .cta-button {
    width: 80% !important;
  }
}

/* Mobile (480px and below) */
@media screen and (max-width: 480px) {
  .email-container {
    margin: 0 5px !important;
  }
  .header-title {
    font-size: 22px !important;
  }
  .cta-button {
    width: 90% !important;
  }
}
```

### Touch-Friendly Elements

- **CTA Buttons**: Minimum 44x44px, centered layout
- **Footer Links**: Stacked vertically on mobile
- **Instruction Items**: Adequate padding for touch interaction
- **Status Badges**: Large enough for easy reading

### Content Adaptation

- **Single Column**: All content stacks vertically on mobile
- **Collapsible Sections**: Instructions fold appropriately
- **Readable Typography**: Minimum 14px font size on mobile
- **Adequate Spacing**: Touch-friendly padding between elements

## Dark Mode Support

### Automatic Detection

```css
@media (prefers-color-scheme: dark) {
  body {
    background-color: #1a1a1a !important;
  }
  .email-container {
    background-color: #2d2d2d !important;
  }
  .section-title {
    color: #ffffff !important;
  }
  /* ... additional dark mode styles */
}
```

### Color Palette

| Element    | Light Mode | Dark Mode |
| ---------- | ---------- | --------- |
| Background | #f8f9fa    | #1a1a1a   |
| Container  | #ffffff    | #2d2d2d   |
| Cards      | #f8f9fa    | #3a3a3a   |
| Text       | #212529    | #ffffff   |
| Muted Text | #6c757d    | #cccccc   |

## Database Migration Required

Update existing templates to use the enhanced mobile template:

```sql
-- Update existing templates with mobile-responsive design
UPDATE email_templates_emt
SET emt_body_html = '<!-- Content from enhanced-mobile-email-template.html -->'
WHERE emt_type IN ('STEP_STATUS_CHANGED', 'STEP_OPENED', 'INSTRUCTION_COMPLETED')
  AND emt_is_active = true;
```

## Testing Checklist

### ✅ Pre-Production Validation

- [ ] Template renders correctly in all 8+ supported email clients
- [ ] Mobile responsive design functions on devices 320px-768px
- [ ] All Groovy template variables resolve properly
- [ ] CTA buttons have minimum 44x44px touch targets
- [ ] Dark mode colors provide adequate contrast
- [ ] Print styles produce readable hardcopy
- [ ] Accessibility features work with screen readers
- [ ] URL construction integration functions correctly

### ✅ Performance Validation

- [ ] Email HTML size < 102KB (Gmail clipping limit)
- [ ] Inline CSS doesn't exceed client limits
- [ ] Images load properly or have descriptive alt text
- [ ] Template processing time < 500ms
- [ ] No external dependencies (fonts, scripts, etc.)

## Deployment Steps

1. **Deploy Template**: Add new HTML template to `src/groovy/umig/web/`
2. **Update Database**: Run SQL to update existing template records
3. **Test Integration**: Verify Enhanced Email Service processes templates
4. **Validate URLs**: Confirm URL construction works with new template
5. **Client Testing**: Test across all supported email clients
6. **Production Release**: Deploy to production environment

## Troubleshooting

### Common Issues

1. **Template Variables Not Resolving**
   - Check Groovy syntax in template
   - Verify variable names match Enhanced Email Service
   - Ensure template type matches notification type

2. **Mobile Layout Problems**
   - Validate CSS media queries
   - Check table-based layout structure
   - Test on actual mobile devices

3. **URL Construction Failures**
   - Verify UrlConstructionService configuration
   - Check system_configuration_scf table
   - Confirm migration/iteration codes are valid

4. **Email Client Compatibility**
   - Use table-based layout for Outlook
   - Inline all CSS for maximum compatibility
   - Test with Email on Acid or Litmus

## Support Resources

- **Enhanced Email Service**: `src/groovy/umig/utils/EnhancedEmailService.groovy`
- **URL Construction**: `src/groovy/umig/utils/UrlConstructionService.groovy`
- **Template Repository**: `src/groovy/umig/repository/EmailTemplateRepository.groovy`
- **Database Schema**: `local-dev-setup/liquibase/changelogs/013_create_email_templates_table.sql`
- **Testing Suite**: Contact DevOps team for email testing tools

---

**Next Phase**: US-039 Phase 1 - Template deployment and integration testing with the existing Enhanced Email Service foundation.
