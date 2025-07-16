# ADR-032: Email Notification Architecture

* **Status:** Proposed
* **Date:** 2025-01-16
* **Deciders:** UMIG Project Team
* **Technical Story:** Implementation of email notifications for step status changes and workflow events

## Context and Problem Statement

The UMIG application requires a robust email notification system to alert teams when steps are activated, status changes occur, and instructions are completed. The initial project brainstorm identified email notifications as a critical feature for replacing manual MAILTO links and Outlook notifications. We need to decide on the technical approach for implementing email functionality within our Confluence-integrated architecture.

## Decision Drivers

* **Integration with existing infrastructure**: Must work with Confluence's built-in email capabilities
* **No external dependencies**: Avoid introducing new libraries that need management
* **Audit trail requirements**: All email events must be logged for compliance
* **Template management**: Support for customizable HTML email templates
* **Local development**: Must work with MailHog in development environment
* **Reuse existing schema**: Leverage existing database tables where appropriate
* **Consistency**: Follow established UMIG patterns and conventions

## Considered Options

### Option 1: JavaMail with External SMTP Configuration
* Description: Use JavaMail API with custom SMTP configuration
* Pros:
  * Full control over email sending process
  * Wide industry adoption and documentation
  * Direct SMTP configuration for MailHog
* Cons:
  * Requires external JAR dependencies
  * Bypasses Confluence's mail configuration
  * Additional complexity in managing mail server settings
  * May conflict with Confluence's classloaders

### Option 2: Confluence Native Mail API
* Description: Use Confluence's built-in ConfluenceMailServerManager and com.atlassian.mail.Email
* Pros:
  * No external dependencies required
  * Uses Confluence's configured mail server automatically
  * Integrates with Confluence's mail queue and monitoring
  * Respects server-level email configuration
  * Already available in ScriptRunner context
* Cons:
  * Limited to Confluence's email capabilities
  * Requires different configuration for local MailHog testing

### Option 3: Third-party Email Service (SendGrid/Mailgun)
* Description: Integrate with external email service provider
* Pros:
  * Advanced features (tracking, analytics, templates)
  * High deliverability
  * Scalable infrastructure
* Cons:
  * External dependency and API keys
  * Additional cost
  * Network dependency
  * Complex for local development

## Decision Outcome

Chosen option: **"Option 2: Confluence Native Mail API"**, because it provides the best balance of functionality, maintainability, and integration with our existing architecture. This approach aligns with our principle of leveraging Confluence's built-in capabilities and avoiding external dependencies.

### Implementation Details

1. **Email Service**: Update existing `EmailService.groovy` to use:
   ```groovy
   import com.atlassian.confluence.mail.ConfluenceMailServerManager
   import com.atlassian.mail.Email
   import com.atlassian.sal.api.component.ComponentLocator
   ```

2. **Audit Logging**: Use existing `audit_log_aud` table instead of creating new `event_log`:
   - `aud_action`: EMAIL_SENT, EMAIL_FAILED, etc.
   - `aud_entity_type`: EMAIL, STEP_INSTANCE, etc.
   - `aud_details`: JSONB with recipients, subject, template_id, etc.

3. **Template Management**: Create new `email_templates` table:
   ```sql
   CREATE TABLE email_templates (
       emt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       emt_name VARCHAR(255) NOT NULL UNIQUE,
       emt_subject TEXT NOT NULL,
       emt_body_html TEXT NOT NULL,
       emt_active BOOLEAN DEFAULT true,
       emt_created_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
       emt_updated_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
       emt_created_by VARCHAR(255),
       emt_updated_by VARCHAR(255)
   );
   ```

4. **Local Development**: Configure MailHog compatibility through environment-specific settings

### Positive Consequences

* **Zero new dependencies**: Reduces maintenance burden and potential conflicts
* **Consistent with architecture**: Follows established pattern of using Confluence capabilities
* **Simplified deployment**: No additional JARs or configurations needed
* **Audit trail integration**: Leverages existing audit_log_aud table
* **Production-ready**: Uses same email infrastructure as Confluence

### Negative Consequences

* **Limited email features**: No advanced tracking or analytics without additional work
* **MailHog configuration**: Requires special handling for local development
* **Template limitations**: Basic Groovy GString templating instead of advanced template engines

## Validation

Success criteria:
1. Email notifications sent successfully in both local and production environments
2. All email events logged to audit_log_aud table
3. Templates manageable through admin interface
4. No new external dependencies introduced
5. Integration tests pass with MailHog

## Pros and Cons of the Options

### JavaMail with External SMTP
* Pros:
  * Industry standard API
  * Full control over configuration
  * Direct MailHog integration
* Cons:
  * External dependency management
  * Potential classloader conflicts
  * Bypasses Confluence mail queue

### Confluence Native Mail API
* Pros:
  * No dependencies
  * Integrated with Confluence
  * Uses existing mail configuration
  * Consistent with architecture
* Cons:
  * Limited to basic email features
  * Tied to Confluence's implementation

### Third-party Email Service
* Pros:
  * Advanced features and analytics
  * High deliverability
  * Rich template management
* Cons:
  * External service dependency
  * Additional costs
  * Complex local setup

## Links

* [ScriptRunner Email Documentation](https://docs.adaptavist.com/sr4conf/latest/features/script-examples/send-custom-email)
* [Confluence Mail API JavaDoc](https://docs.atlassian.com/confluence/latest/com/atlassian/confluence/mail/package-summary.html)
* Initial brainstorm: `/docs/devJournal/20250616-00 - Initial brainstorm.md`

## Amendment History

* 2025-01-16: Initial proposal for email notification architecture