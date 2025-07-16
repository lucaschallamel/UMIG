# Email Templates API

The Email Templates API provides CRUD operations for managing email templates used by the UMIG notification system.

## Overview

The email notification system in UMIG uses customizable templates for different types of notifications:
- **STEP_OPENED**: Sent when a PILOT opens a step
- **INSTRUCTION_COMPLETED**: Sent when a USER completes an instruction
- **STEP_STATUS_CHANGED**: Sent when a USER changes step-level status
- **CUSTOM**: For custom notification types

## Base URL

All endpoints are relative to: `/rest/scriptrunner/latest/custom/emailTemplates`

## Authentication

All endpoints require Confluence user authentication. Administrative operations (create, update, delete) require `confluence-administrators` group membership.

## Email Template Structure

Email templates support Groovy template syntax for dynamic content substitution:

```html
<h1>Step ${stepInstance.sti_name} is now ${newStatus}</h1>
<p>Changed by: ${changedBy}</p>
<p>Changed at: ${changedAt}</p>
```

### Available Variables by Template Type

#### STEP_OPENED
- `stepInstance`: Step instance object
- `stepUrl`: Direct URL to the step

#### INSTRUCTION_COMPLETED
- `instruction`: Instruction object
- `stepInstance`: Related step instance
- `completedAt`: Completion timestamp
- `completedBy`: Username of completing user

#### STEP_STATUS_CHANGED
- `stepInstance`: Step instance object
- `oldStatus`: Previous status
- `newStatus`: New status
- `statusColor`: Color code for status display
- `changedAt`: Change timestamp
- `changedBy`: Username of changing user

## Testing

The email service integrates with:
- **Confluence Mail Server**: For production email sending
- **MailHog**: For local development testing at <http://localhost:8025>

## Integration Points

The email templates are used by:
- `StepRepository.updateStepStatus()` - For status change notifications
- `StepRepository.openStep()` - For step opening notifications
- `StepRepository.completeInstruction()` - For instruction completion notifications

## Audit Logging

All email notifications are logged in the `audit_log_aud` table with:
- Recipients list
- Subject line
- Template used
- Send status (SENT/FAILED)
- Additional context data

## Error Handling

The API follows standard HTTP status codes:
- `400`: Bad Request - Invalid template data or type
- `404`: Not Found - Template doesn't exist
- `409`: Conflict - Template name already exists
- `500`: Internal Server Error - Database or mail server issues

## Example Usage

### Creating a Step Status Change Template

```json
{
  "emt_type": "STEP_STATUS_CHANGED",
  "emt_name": "Step Status Alert",
  "emt_subject": "[UMIG] Step Status Changed: ${stepInstance.sti_name}",
  "emt_body_html": "<h2>Step Status Update</h2><p>Step <strong>${stepInstance.sti_name}</strong> has changed from <span style=\"color: #6c757d\">${oldStatus}</span> to <span style=\"color: ${statusColor}\">${newStatus}</span>.</p><p>Changed by: ${changedBy}<br>Changed at: ${changedAt}</p>",
  "emt_body_text": "Step ${stepInstance.sti_name} has changed from ${oldStatus} to ${newStatus}. Changed by: ${changedBy} at ${changedAt}",
  "emt_is_active": true
}
```

### Response

```json
{
  "emt_id": "550e8400-e29b-41d4-a716-446655440000",
  "emt_type": "STEP_STATUS_CHANGED",
  "emt_name": "Step Status Alert",
  "emt_subject": "[UMIG] Step Status Changed: ${stepInstance.sti_name}",
  "emt_body_html": "<h2>Step Status Update</h2>...",
  "emt_body_text": "Step ${stepInstance.sti_name} has changed...",
  "emt_is_active": true,
  "emt_created_date": "2025-01-16T10:30:00.000Z",
  "emt_updated_date": "2025-01-16T10:30:00.000Z",
  "emt_created_by": "admin",
  "emt_updated_by": "admin"
}
```

## Security Considerations

- Template creation and updates require administrator privileges
- HTML templates should be sanitized to prevent XSS attacks
- Templates are stored in the database with audit trails
- All email sending is logged for monitoring and compliance