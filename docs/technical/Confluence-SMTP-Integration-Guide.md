# Confluence SMTP Integration Guide

**Status**: Architecture Documentation
**Created**: 2025-10-06
**Related**: US-098 Phase 4, ADR-067 through ADR-070
**Version**: 1.0

## Overview

UMIG uses Confluence's built-in SMTP configuration via the MailServerManager API instead of storing SMTP credentials independently. This approach eliminates credential storage security risks while leveraging platform capabilities.

## Architecture Decision

**Decision**: Use Confluence MailServerManager API for SMTP infrastructure
**ADR Reference**: US-098 Phase 4 Architecture Pivot (October 2025)
**Security Benefit**: Zero credential storage in UMIG database
**Risk Reduction**: Eliminated R-001, R-002, R-003, R-005, R-006 (HIGH-severity credential risks)

### Why This Approach?

1. **Security**: No SMTP credentials stored in UMIG database or configuration files
2. **Platform Integration**: Leverages existing Confluence infrastructure management
3. **Maintainability**: Single source of truth for SMTP configuration (Confluence Admin UI)
4. **Compliance**: Reduced audit surface area for sensitive data
5. **Simplicity**: No custom credential encryption/decryption logic needed

## Prerequisites

### Confluence SMTP Configuration

1. **Access**: Confluence Administrator privileges required
2. **Location**: Confluence Admin → Mail Servers
3. **Requirement**: At least one SMTP server configured and set as default
4. **Validation**: Send test email through Confluence UI before integrating

### Development Environment (DEV)

- **SMTP Server**: MailHog container (included in docker-compose)
- **Host**: `umig_mailhog` (internal container network)
- **Port**: `1025` (SMTP), `8025` (Web UI)
- **Authentication**: None required (test environment)
- **TLS**: Disabled

### Production Environment (PROD)

- **SMTP Server**: Organisation production mail server
- **Authentication**: Required (username/password managed by Confluence)
- **TLS**: STARTTLS enabled (port 587 standard)
- **Configuration**: Managed through Confluence Admin UI

## Code Integration

### 1. Get Confluence SMTP Server

```groovy
import com.atlassian.confluence.mail.MailServerManager
import com.atlassian.mail.server.SMTPMailServer
import com.atlassian.sal.api.component.ComponentLocator
import javax.mail.Session
import javax.mail.Message
import javax.mail.internet.MimeMessage
import javax.mail.internet.InternetAddress
import javax.mail.Transport

class EnhancedEmailService {
    private MailServerManager mailServerManager

    EnhancedEmailService() {
        this.mailServerManager = ComponentLocator.getComponent(MailServerManager.class)
    }

    void sendEmail(String to, String subject, String body) {
        // Get Confluence's configured SMTP server
        SMTPMailServer mailServer = mailServerManager.getDefaultSMTPMailServer()

        if (!mailServer) {
            throw new IllegalStateException(
                "No SMTP server configured in Confluence. " +
                "Please configure in Confluence Admin → Mail Servers"
            )
        }

        // Confluence handles authentication automatically
        Session session = mailServer.getSession()

        // Send email using session
        MimeMessage message = new MimeMessage(session)
        message.setFrom(new InternetAddress(mailServer.getDefaultFrom()))
        message.addRecipient(Message.RecipientType.TO, new InternetAddress(to))
        message.setSubject(subject)
        message.setText(body)

        Transport.send(message)
    }
}
```

### 2. Apply ConfigurationService Overrides

```groovy
import umig.services.ConfigurationService

void sendEmailWithOverrides(String to, String subject, String body) {
    SMTPMailServer mailServer = mailServerManager.getDefaultSMTPMailServer()

    if (!mailServer) {
        throw new IllegalStateException("No SMTP server configured in Confluence")
    }

    // Get application-level override flags from ConfigurationService
    boolean useAuth = ConfigurationService.getBoolean("email.smtp.auth.enabled")
    boolean useTLS = ConfigurationService.getBoolean("email.smtp.starttls.enabled")

    Properties props = new Properties()
    props.put("mail.smtp.host", mailServer.getHostname())
    props.put("mail.smtp.port", String.valueOf(mailServer.getPort()))

    // Apply overrides if configured (allows environment-specific behavior)
    if (useAuth != null) {
        props.put("mail.smtp.auth", String.valueOf(useAuth))
    }
    if (useTLS != null) {
        props.put("mail.smtp.starttls.enable", String.valueOf(useTLS))
    }

    // Get application-level timeouts from ConfigurationService
    String connectionTimeout = ConfigurationService.getString("email.smtp.connection.timeout.ms")
    String timeout = ConfigurationService.getString("email.smtp.timeout.ms")

    if (connectionTimeout) {
        props.put("mail.smtp.connectiontimeout", connectionTimeout)
    }
    if (timeout) {
        props.put("mail.smtp.timeout", timeout)
    }

    // Create session with configured properties
    Session session = Session.getInstance(props, mailServer.getAuthenticator())

    // Send email
    MimeMessage message = new MimeMessage(session)
    message.setFrom(new InternetAddress(mailServer.getDefaultFrom()))
    message.addRecipient(Message.RecipientType.TO, new InternetAddress(to))
    message.setSubject(subject)
    message.setText(body)

    Transport.send(message)
}
```

### 3. Comprehensive Email Service Implementation

```groovy
package umig.services

import com.atlassian.confluence.mail.MailServerManager
import com.atlassian.mail.server.SMTPMailServer
import com.atlassian.sal.api.component.ComponentLocator
import groovy.util.logging.Slf4j
import javax.mail.*
import javax.mail.internet.InternetAddress
import javax.mail.internet.MimeMessage

@Slf4j
class EmailService {
    private MailServerManager mailServerManager
    private ConfigurationService configurationService

    EmailService() {
        this.mailServerManager = ComponentLocator.getComponent(MailServerManager.class)
        this.configurationService = new ConfigurationService()
    }

    /**
     * Send email using Confluence MailServerManager with ConfigurationService overrides
     * @param to Recipient email address
     * @param subject Email subject
     * @param body Email body (plain text)
     * @throws MessagingException if email sending fails
     * @throws IllegalStateException if no SMTP server configured
     */
    void sendEmail(String to, String subject, String body) {
        log.info("Sending email to: ${to}, subject: ${subject}")

        // Validate SMTP configuration
        SMTPMailServer mailServer = validateSMTPConfiguration()

        try {
            // Build email session with application overrides
            Session session = buildEmailSession(mailServer)

            // Create and send message
            MimeMessage message = createMessage(session, mailServer, to, subject, body)
            Transport.send(message)

            log.info("Email sent successfully to: ${to}")

        } catch (MessagingException e) {
            log.error("Failed to send email to ${to}: ${e.message}", e)
            throw new RuntimeException("Email sending failed: ${e.message}", e)
        }
    }

    /**
     * Validate Confluence SMTP configuration exists
     * @return SMTPMailServer instance
     * @throws IllegalStateException if no SMTP server configured
     */
    private SMTPMailServer validateSMTPConfiguration() {
        SMTPMailServer mailServer = mailServerManager.getDefaultSMTPMailServer()

        if (!mailServer) {
            String errorMsg = "No SMTP server configured in Confluence. " +
                            "Please configure in Confluence Admin → Mail Servers"
            log.error(errorMsg)
            throw new IllegalStateException(errorMsg)
        }

        log.debug("Using SMTP server: ${mailServer.getHostname()}:${mailServer.getPort()}")
        return mailServer
    }

    /**
     * Build JavaMail session with Confluence settings and ConfigurationService overrides
     * @param mailServer Confluence SMTP mail server
     * @return Configured JavaMail session
     */
    private Session buildEmailSession(SMTPMailServer mailServer) {
        Properties props = new Properties()

        // Base configuration from Confluence
        props.put("mail.smtp.host", mailServer.getHostname())
        props.put("mail.smtp.port", String.valueOf(mailServer.getPort()))

        // Application-level overrides from ConfigurationService
        applyConfigurationOverrides(props)

        // Create session with authenticator from Confluence
        return Session.getInstance(props, mailServer.getAuthenticator())
    }

    /**
     * Apply ConfigurationService overrides to JavaMail properties
     * @param props JavaMail properties to modify
     */
    private void applyConfigurationOverrides(Properties props) {
        // Authentication override
        Boolean authEnabled = configurationService.getBoolean("email.smtp.auth.enabled")
        if (authEnabled != null) {
            props.put("mail.smtp.auth", String.valueOf(authEnabled))
            log.debug("Applied auth override: ${authEnabled}")
        }

        // STARTTLS override
        Boolean tlsEnabled = configurationService.getBoolean("email.smtp.starttls.enabled")
        if (tlsEnabled != null) {
            props.put("mail.smtp.starttls.enable", String.valueOf(tlsEnabled))
            log.debug("Applied TLS override: ${tlsEnabled}")
        }

        // Connection timeout
        String connectionTimeout = configurationService.getString("email.smtp.connection.timeout.ms")
        if (connectionTimeout) {
            props.put("mail.smtp.connectiontimeout", connectionTimeout)
            log.debug("Applied connection timeout: ${connectionTimeout}ms")
        }

        // Operation timeout
        String operationTimeout = configurationService.getString("email.smtp.timeout.ms")
        if (operationTimeout) {
            props.put("mail.smtp.timeout", operationTimeout)
            log.debug("Applied operation timeout: ${operationTimeout}ms")
        }
    }

    /**
     * Create MimeMessage with email content
     * @param session JavaMail session
     * @param mailServer SMTP mail server
     * @param to Recipient address
     * @param subject Email subject
     * @param body Email body
     * @return Configured MimeMessage
     */
    private MimeMessage createMessage(Session session, SMTPMailServer mailServer,
                                     String to, String subject, String body) {
        MimeMessage message = new MimeMessage(session)
        message.setFrom(new InternetAddress(mailServer.getDefaultFrom()))
        message.addRecipient(Message.RecipientType.TO, new InternetAddress(to))
        message.setSubject(subject)
        message.setText(body)
        return message
    }

    /**
     * Check SMTP availability for health checks
     * @return true if SMTP configured, false otherwise
     */
    boolean isSMTPAvailable() {
        try {
            SMTPMailServer mailServer = mailServerManager.getDefaultSMTPMailServer()
            return mailServer != null
        } catch (Exception e) {
            log.warn("SMTP availability check failed: ${e.message}")
            return false
        }
    }
}
```

## Configuration Mapping

### Managed by Confluence (via MailServerManager)

**Infrastructure Settings** (NOT stored in ConfigurationService):

| Setting              | Description                  | Managed By                      |
| -------------------- | ---------------------------- | ------------------------------- |
| `mail.smtp.host`     | SMTP server hostname         | Confluence Admin UI             |
| `mail.smtp.port`     | SMTP server port             | Confluence Admin UI             |
| `mail.smtp.username` | SMTP authentication username | Confluence Admin UI (secure)    |
| `mail.smtp.password` | SMTP authentication password | Confluence Admin UI (encrypted) |

### Managed by ConfigurationService

**Application Behavior Overrides** (stored in `system_configuration_scf`):

| Configuration Key                  | Type    | Purpose                          | DEV Value | PROD Value |
| ---------------------------------- | ------- | -------------------------------- | --------- | ---------- |
| `email.smtp.auth.enabled`          | BOOLEAN | Override Confluence auth setting | `false`   | `true`     |
| `email.smtp.starttls.enabled`      | BOOLEAN | Override Confluence TLS setting  | `false`   | `true`     |
| `email.smtp.connection.timeout.ms` | INTEGER | Application connection timeout   | `5000`    | `15000`    |
| `email.smtp.timeout.ms`            | INTEGER | Application operation timeout    | `5000`    | `30000`    |

**Other Application Settings**:

| Configuration Key                       | Type    | Purpose                              |
| --------------------------------------- | ------- | ------------------------------------ |
| `confluence.base.url`                   | STRING  | Confluence base URL for API calls    |
| `import.batch.max.size`                 | INTEGER | Maximum import batch size            |
| `api.pagination.default.size`           | INTEGER | Default API pagination size          |
| `import.email.notifications.enabled`    | BOOLEAN | Enable import email notifications    |
| `import.monitoring.performance.enabled` | BOOLEAN | Enable import performance monitoring |

## Deployment Checklist

### Development (DEV)

- [ ] **Confluence SMTP configured** for MailHog
  - Host: `umig_mailhog`
  - Port: `1025`
  - Authentication: None
  - Test: Send test email through Confluence Admin UI

- [ ] **ConfigurationService settings**
  - `email.smtp.auth.enabled=false`
  - `email.smtp.starttls.enabled=false`
  - `email.smtp.connection.timeout.ms=5000`
  - `email.smtp.timeout.ms=5000`

- [ ] **MailHog verification**
  - Access: http://localhost:8025
  - Test: Send email through UMIG → Check MailHog inbox

### UAT

- [ ] **Confluence SMTP configured** for UAT mail server
  - Host: [UAT SMTP server]
  - Port: [UAT SMTP port]
  - Authentication: Required
  - Credentials: Managed in Confluence Admin UI

- [ ] **ConfigurationService settings**
  - Environment-specific timeout values
  - Test email notifications enabled

- [ ] **Integration testing**
  - Test email delivery via MailServerManager API
  - Verify timeout behaviour
  - Validate error handling

### Production (PROD)

- [ ] **Confluence SMTP configured** for production mail server
  - Host: [Production SMTP server]
  - Port: `587` (standard STARTTLS port)
  - Authentication: Required
  - Credentials: Managed securely in Confluence Admin UI

- [ ] **ConfigurationService settings**
  - `email.smtp.auth.enabled=true`
  - `email.smtp.starttls.enabled=true`
  - `email.smtp.connection.timeout.ms=15000`
  - `email.smtp.timeout.ms=30000`

- [ ] **Production validation**
  - Send test email through Confluence UI
  - Send test email through UMIG
  - Monitor email delivery logs
  - Verify TLS encryption active

## Error Handling

### Common Error Scenarios

#### 1. No SMTP Server Configured

```groovy
try {
    emailService.sendEmail(to, subject, body)
} catch (IllegalStateException e) {
    // Handle SMTP configuration error
    log.error("SMTP not configured: ${e.message}")
    // Show user-friendly error message
    return Response.serverError()
        .entity([error: "Email service unavailable. Please contact administrator."])
        .build()
}
```

#### 2. Email Sending Failure

```groovy
try {
    emailService.sendEmail(to, subject, body)
} catch (MessagingException e) {
    // Handle email sending failure
    log.error("Email sending failed: ${e.message}", e)
    // Queue for retry or notify administrator
    emailRetryQueue.add(emailTask)
}
```

#### 3. Timeout Errors

```groovy
try {
    emailService.sendEmail(to, subject, body)
} catch (MessagingException e) {
    if (e.cause instanceof SocketTimeoutException) {
        log.warn("Email timeout - may need to increase timeout values")
        // Consider increasing timeout configuration
    }
}
```

## Health Check Integration

### SMTP Availability Check

```groovy
class SystemHealthCheck {
    private EmailService emailService

    Map<String, Object> checkEmailService() {
        boolean available = emailService.isSMTPAvailable()

        return [
            service: 'email',
            status: available ? 'UP' : 'DOWN',
            smtp_configured: available,
            timestamp: new Date()
        ]
    }
}
```

### Monitoring Dashboard

```groovy
// Include in system dashboard
def emailStatus = systemHealthCheck.checkEmailService()

if (!emailStatus.smtp_configured) {
    // Alert: SMTP not configured
    systemAlerts.add([
        severity: 'HIGH',
        message: 'SMTP server not configured in Confluence',
        action: 'Configure in Confluence Admin → Mail Servers'
    ])
}
```

## Troubleshooting

### Issue: "No SMTP server configured"

**Symptoms**: `IllegalStateException` thrown when sending email

**Solution**:

1. Log in to Confluence as Administrator
2. Navigate to: ⚙️ → General Configuration → Mail Servers
3. Click "Add SMTP Mail Server"
4. Configure SMTP settings:
   - Name: `Primary SMTP Server`
   - From address: `noreply@example.com`
   - Hostname: [your SMTP server]
   - Port: `587` (STARTTLS) or `465` (SSL/TLS)
   - Authentication: Username and password
5. Set as default mail server
6. Send test email to verify

### Issue: Email not sending

**Check**:

1. **Confluence SMTP configuration correct?**
   - Test via Confluence Admin → Mail Servers → Send Test Email

2. **ConfigurationService override flags correct?**
   - Query: `SELECT * FROM system_configuration_scf WHERE scf_key LIKE 'email.smtp%'`
   - Verify DEV has `auth=false, tls=false`
   - Verify PROD has `auth=true, tls=true`

3. **Network connectivity to SMTP server?**
   - Test: `telnet [smtp-host] [smtp-port]`
   - Check firewall rules

4. **SMTP server credentials valid?**
   - Verify in Confluence Admin UI
   - Check for password expiry

### Issue: Authentication failures

**Check**:

1. **ConfigurationService auth flag**
   - Ensure `email.smtp.auth.enabled=true` for production
   - Ensure credentials configured in Confluence

2. **Confluence SMTP credentials**
   - Verify username/password in Confluence Admin UI
   - Test authentication via Confluence test email

3. **SMTP server requirements**
   - Check if server allows authentication from Confluence IP
   - Verify firewall/security group rules

### Issue: Timeout errors

**Symptoms**: `SocketTimeoutException` or slow email sending

**Solutions**:

1. **Increase timeout values**
   - Update `email.smtp.connection.timeout.ms` (currently 5s DEV, 15s PROD)
   - Update `email.smtp.timeout.ms` (currently 5s DEV, 30s PROD)

2. **Check network latency**
   - Test: `ping [smtp-host]`
   - Investigate network bottlenecks

3. **SMTP server performance**
   - Check SMTP server load
   - Contact mail server administrators

### Issue: TLS/STARTTLS errors

**Symptoms**: `SSLHandshakeException` or certificate errors

**Solutions**:

1. **Verify TLS configuration**
   - Ensure `email.smtp.starttls.enabled=true` for production
   - Check SMTP server supports STARTTLS on port 587

2. **Certificate trust**
   - Ensure Confluence JVM trusts SMTP server certificate
   - Import certificate to JVM keystore if needed

3. **TLS version compatibility**
   - Check SMTP server supported TLS versions
   - Ensure Confluence JVM supports required TLS version

## Security Considerations

### Benefits of MailServerManager Approach

1. **No Credential Storage**: Zero SMTP credentials in UMIG database
2. **Confluence Encryption**: Credentials encrypted by Confluence platform
3. **Reduced Attack Surface**: Fewer places to secure credential storage
4. **Audit Trail**: Confluence audit log tracks SMTP configuration changes
5. **Access Control**: Only Confluence admins can modify SMTP settings

### Security Best Practices

1. **Principle of Least Privilege**: Restrict Confluence admin access
2. **Regular Credential Rotation**: Update SMTP credentials periodically
3. **TLS Enforcement**: Always use STARTTLS in production
4. **Monitoring**: Alert on SMTP configuration changes
5. **Backup Security**: Ensure Confluence backups are encrypted

## Performance Considerations

### Timeout Configuration

**Development** (fast feedback):

- Connection timeout: 5 seconds
- Operation timeout: 5 seconds

**Production** (reliability):

- Connection timeout: 15 seconds (network latency)
- Operation timeout: 30 seconds (large attachments)

### Connection Pooling

Confluence MailServerManager handles connection pooling automatically. No manual connection management needed.

### Asynchronous Email Sending

For bulk email operations, consider implementing asynchronous queue:

```groovy
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class AsyncEmailService {
    private EmailService emailService
    private ExecutorService executorService

    AsyncEmailService() {
        this.emailService = new EmailService()
        this.executorService = Executors.newFixedThreadPool(5)
    }

    void sendEmailAsync(String to, String subject, String body) {
        executorService.submit {
            try {
                emailService.sendEmail(to, subject, body)
            } catch (Exception e) {
                log.error("Async email failed: ${e.message}", e)
                // Handle error (retry, alert, etc.)
            }
        }
    }
}
```

## Migration from Legacy SMTP Configuration

If migrating from legacy SMTP configuration in ConfigurationService:

### Step 1: Configure Confluence SMTP

1. Extract current SMTP settings from ConfigurationService
2. Configure in Confluence Admin → Mail Servers
3. Test email delivery through Confluence

### Step 2: Update Application Code

1. Replace direct SMTP configuration with MailServerManager
2. Implement ConfigurationService overrides for application behavior
3. Update EmailService to use new pattern

### Step 3: Database Cleanup

1. Remove legacy SMTP infrastructure configs from `system_configuration_scf`
2. Keep application behavior configs (auth, TLS, timeouts)
3. Run verification queries

### Step 4: Validation

1. Test email sending in DEV environment
2. Validate UAT email delivery
3. Perform production smoke tests
4. Monitor for errors

## References

### Atlassian Documentation

- [Confluence Mail Server Configuration](https://confluence.atlassian.com/doc/configuring-a-smtp-mail-server-148442.html)
- [JavaMail API Documentation](https://javaee.github.io/javamail/)
- [ComponentLocator API](https://docs.atlassian.com/sal-api/latest/com/atlassian/sal/api/component/ComponentLocator.html)

### UMIG Documentation

- Security Risk Assessment: `/docs/roadmap/sprint8/US-098-Phase4-Security-Risk-Assessment.md`
- Migration Execution Plan: `/claudedocs/US-098-Phase4-Step2-Migration-Execution-Plan-REVISED.md`
- ADR-067: Configuration Management System Architecture
- ADR-068: Configuration Security Framework
- ADR-069: Configuration Migration Strategy
- ADR-070: Configuration Deployment Process

### Internal Resources

- MailHog Testing Guide: `/local-dev-setup/README.md#email-testing`
- Development Environment Setup: `/local-dev-setup/README.md`
- ConfigurationService Documentation: `/docs/technical/ConfigurationService.md`

---

**Document Version**: 1.0
**Last Updated**: 2025-10-06
**Maintained By**: UMIG Development Team
**Review Frequency**: Quarterly or on architecture changes
