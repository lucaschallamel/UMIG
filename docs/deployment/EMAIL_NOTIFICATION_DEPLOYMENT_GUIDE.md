# UMIG Enhanced Email Notification System - Deployment Guide

**Version**: 1.0.0  
**Date**: August 21, 2025  
**Author**: UMIG Project Team

## Overview

This guide covers the deployment of the enhanced email notification system that provides clickable stepView URLs in email notifications. The system includes URL construction based on environment-specific configuration, secure parameter handling, and comprehensive audit logging.

## Architecture Components

### Core Components

- **UrlConstructionService**: Builds secure, environment-specific URLs
- **EnhancedEmailService**: Email notifications with dynamic URL integration
- **StepNotificationIntegration**: Repository-level integration for notifications
- **EnhancedStepsApi**: REST endpoints with URL-aware notifications
- **system_configuration_scf**: Database table for environment configurations

### Dependencies

- Existing EmailService and repository patterns
- system_configuration_scf database table (with data)
- Email template system
- ScriptRunner environment

## Pre-Deployment Checklist

### 1. Database Requirements

✅ **system_configuration_scf table exists and populated**

- Table created: ✅ (completed in previous work)
- Default data loaded: ✅ (EV1-EV5, PROD configurations)
- Verify configurations are active: `SELECT * FROM system_configuration_scf WHERE scf_is_active = true`

### 2. Email Template Updates

✅ **Email templates support URL variables**

- Templates updated with URL support: ✅ (SQL script created)
- Template variables include: `stepViewUrl`, `hasStepViewUrl`, `migrationCode`, `iterationCode`

### 3. Environment Configuration

**Required System Properties**:

```bash
# Optional: Specify environment explicitly (default: auto-detection)
-Dumig.environment=PROD

# Optional: Override base URL (default: from database config)
-Dumig.base.url=https://confluence.company.com
```

## Deployment Steps

### Step 1: Database Schema Deployment

1. **Verify system_configuration_scf table exists**:

   ```sql
   SELECT count(*) FROM information_schema.tables
   WHERE table_name = 'system_configuration_scf';
   ```

2. **Apply email template updates** (if not already applied):

   ```bash
   # Run the email template update script
   psql -h localhost -U umig_user -d umig_db -f src/groovy/umig/sql/email-templates-with-urls.sql
   ```

3. **Verify email templates have URL support**:

   ```sql
   SELECT emt_type, emt_subject
   FROM email_templates_emt
   WHERE emt_body_html LIKE '%stepViewUrl%'
   AND emt_is_active = true;
   ```

### Step 2: Deploy Core Services

1. **Deploy UrlConstructionService**:
   - Copy `src/groovy/umig/utils/UrlConstructionService.groovy` to ScriptRunner
   - Verify class loads without errors

2. **Deploy EnhancedEmailService**:
   - Copy `src/groovy/umig/utils/EnhancedEmailService.groovy` to ScriptRunner
   - Verify integration with existing EmailService patterns

3. **Deploy StepNotificationIntegration**:
   - Copy `src/groovy/umig/utils/StepNotificationIntegration.groovy` to ScriptRunner
   - Verify repository integration works correctly

### Step 3: Deploy Enhanced API Endpoints

1. **Deploy EnhancedStepsApi**:
   - Copy `src/groovy/umig/api/v2/EnhancedStepsApi.groovy` to ScriptRunner
   - Verify endpoints are accessible:
     - `GET /rest/scriptrunner/latest/custom/enhanced-steps` - Basic info
     - `GET /rest/scriptrunner/latest/custom/enhanced-steps/health` - Health check
     - `GET /rest/scriptrunner/latest/custom/enhanced-steps/config` - Configuration status

### Step 4: Validation and Testing

1. **Health Check Validation**:

   ```bash
   # Check system health
   curl -X GET "http://localhost:8090/rest/scriptrunner/latest/custom/enhanced-steps/health" \
        -H "Authorization: Basic [base64_credentials]"

   # Expected response:
   {
     "service": "EnhancedEmailService",
     "status": "healthy",
     "urlConstruction": {
       "status": "healthy",
       "environment": "DEV",
       "configurationFound": true
     }
   }
   ```

2. **Configuration Validation**:

   ```bash
   # Check configuration status
   curl -X GET "http://localhost:8090/rest/scriptrunner/latest/custom/enhanced-steps/config" \
        -H "Authorization: Basic [base64_credentials]"
   ```

3. **URL Construction Test**:

   ```groovy
   // Test URL construction in ScriptRunner console
   import umig.utils.UrlConstructionService

   def stepId = UUID.fromString("12345678-1234-1234-1234-123456789012")
   def url = UrlConstructionService.buildStepViewUrl(stepId, "TORONTO", "run1", "DEV")
   println "Constructed URL: ${url}"

   // Expected format:
   // http://localhost:8090/spaces/UMIG/pages/123456789/StepView?mig=TORONTO&ite=run1&stepid=DUM-001
   ```

## Environment-Specific Configuration

### Development Environment (DEV)

```sql
-- Verify DEV configuration
SELECT * FROM system_configuration_scf WHERE scf_environment_code = 'DEV';

-- Should show:
-- scf_base_url: http://localhost:8090
-- scf_space_key: UMIG
-- scf_page_id: 123456789
-- scf_page_title: StepView
```

### Production Environment (PROD)

```sql
-- Update PROD configuration with actual values
UPDATE system_configuration_scf
SET
    scf_base_url = 'https://confluence.company.com',
    scf_space_key = 'UMIG',
    scf_page_id = '987654321',
    scf_page_title = 'StepView'
WHERE scf_environment_code = 'PROD';
```

### Environment-Specific Testing

```bash
# Set environment for testing
export JAVA_OPTS="$JAVA_OPTS -Dumig.environment=PROD"

# Or set in Confluence/ScriptRunner startup script
-Dumig.environment=PROD
```

## Integration with Existing System

### Backward Compatibility

The enhanced system maintains full backward compatibility:

1. **Existing StepsApi endpoints remain unchanged**
2. **New EnhancedStepsApi provides enhanced functionality**
3. **Fallback to standard notifications when URL construction fails**
4. **Existing email templates continue to work**

### Gradual Migration Strategy

**Phase 1**: Deploy enhanced components (non-breaking)

- Deploy all new services and APIs
- Existing system continues to work normally
- Enhanced APIs available for testing

**Phase 2**: Update client applications (optional)

- Frontend applications can optionally use enhanced endpoints
- Enhanced endpoints provide additional fields in responses
- Standard endpoints remain fully functional

**Phase 3**: Monitor and optimize (ongoing)

- Monitor URL construction performance
- Review email delivery rates and click-through rates
- Optimize cache settings and environment detection

## Monitoring and Health Checks

### Built-in Health Checks

1. **Enhanced Email Service Health**:

   ```
   GET /enhanced-steps/health
   ```

   Returns: service status, URL construction capability, configuration status

2. **URL Construction Health**:

   ```groovy
   import umig.utils.UrlConstructionService
   def health = UrlConstructionService.healthCheck()
   ```

3. **Configuration Cache Status**:

   ```groovy
   import umig.utils.UrlConstructionService
   def cached = UrlConstructionService.getCachedConfigurations()
   ```

### Recommended Monitoring

1. **Log Monitoring**: Watch for URL construction failures

   ```
   grep "UrlConstructionService.*ERROR" /path/to/confluence/logs/atlassian-confluence.log
   ```

2. **Database Monitoring**: Monitor system_configuration_scf table access

   ```sql
   -- Check configuration access patterns
   SELECT scf_environment_code, COUNT(*) as access_count
   FROM system_configuration_scf
   WHERE scf_is_active = true
   GROUP BY scf_environment_code;
   ```

3. **Email Delivery Monitoring**: Check audit logs for notification success rates

   ```sql
   -- Monitor email notification success rates
   SELECT
       aud_action,
       COUNT(*) as count,
       DATE(aud_timestamp) as date
   FROM audit_log_aud
   WHERE aud_action LIKE '%EMAIL%'
   GROUP BY aud_action, DATE(aud_timestamp)
   ORDER BY date DESC;
   ```

## Troubleshooting

### Common Issues

#### 1. URL Construction Returns Null

**Symptoms**: Enhanced notifications fall back to standard notifications
**Causes**:

- Missing system configuration for environment
- Invalid configuration data (malformed URLs)
- Database connection issues
- Security validation rejecting parameters

**Resolution**:

```sql
-- Check configuration exists
SELECT * FROM system_configuration_scf
WHERE scf_environment_code = 'YOUR_ENV'
AND scf_is_active = true;

-- Verify URL format
SELECT scf_base_url FROM system_configuration_scf
WHERE scf_environment_code = 'YOUR_ENV';
-- Should be: http://... or https://...
```

#### 2. Environment Detection Issues

**Symptoms**: Wrong environment detected, configuration not found
**Causes**:

- System properties not set correctly
- Hostname-based detection failing
- Multiple Confluence instances on same host

**Resolution**:

```bash
# Explicitly set environment
-Dumig.environment=PROD

# Check current environment detection
import umig.utils.UrlConstructionService
def env = UrlConstructionService.detectEnvironment()
println "Detected environment: ${env}"
```

#### 3. Email Templates Not Processing URLs

**Symptoms**: Emails sent but URLs not clickable or missing
**Causes**:

- Email templates not updated with URL variables
- Template processing errors
- Variables not passed correctly

**Resolution**:

```sql
-- Check template has URL support
SELECT emt_body_html FROM email_templates_emt
WHERE emt_type = 'STEP_STATUS_CHANGED'
AND emt_is_active = true;
-- Should contain: ${stepViewUrl}, ${hasStepViewUrl}
```

#### 4. Security Validation Rejecting Parameters

**Symptoms**: URL construction returns null, security warnings in logs
**Causes**:

- Migration/iteration codes contain invalid characters
- Step codes have special characters
- Parameter sanitization too strict

**Resolution**:

```groovy
// Test parameter validation
import umig.utils.UrlConstructionService
def result = UrlConstructionService.sanitizeParameter("YOUR_PARAM")
println "Sanitized parameter: ${result}"
// null means rejected, non-null means accepted
```

### Debug Mode

Enable debug logging for troubleshooting:

```groovy
// In ScriptRunner console
import umig.utils.UrlConstructionService
import umig.utils.EnhancedEmailService

// Clear cache to force fresh data
UrlConstructionService.clearCache()

// Test URL construction with debug output
def url = UrlConstructionService.buildStepViewUrl(
    UUID.fromString("12345678-1234-1234-1234-123456789012"),
    "DEBUG_MIGRATION",
    "debug_run",
    "DEV"
)
println "Debug URL result: ${url}"

// Check health status
def health = EnhancedEmailService.healthCheck()
println "Service health: ${health}"
```

## Security Considerations

### URL Construction Security

1. **Parameter Sanitization**: All parameters validated against whitelist regex
2. **URL Validation**: Base URLs validated for protocol and format
3. **Injection Prevention**: SQL injection and XSS prevention in place
4. **Cache Security**: Configuration cache limited to 5-minute TTL

### Email Security

1. **Recipient Validation**: Email addresses validated before sending
2. **Template Security**: Template variables sanitized
3. **Audit Logging**: All email activity logged for compliance
4. **Error Handling**: Sensitive information not exposed in error messages

## Performance Considerations

### Caching Strategy

1. **Configuration Cache**: 5-minute TTL to balance performance and freshness
2. **Database Connection Pooling**: Uses ScriptRunner's built-in pool
3. **Lazy Loading**: Components loaded only when needed
4. **Concurrent Access**: Thread-safe implementation for multiple users

### Optimization Tips

1. **Environment Detection**: Set explicit environment to avoid hostname lookup
2. **Configuration Updates**: Clear cache after configuration changes
3. **Database Indexing**: Ensure system_configuration_scf has appropriate indexes
4. **Email Template Optimization**: Keep templates concise for faster processing

## Rollback Procedures

### Emergency Rollback

If issues occur, the system can be safely rolled back:

1. **Disable Enhanced APIs**: Remove or rename EnhancedStepsApi.groovy
2. **Revert Email Templates**: Restore original templates from backup
3. **Clear Configuration**: Set all system_configuration_scf records to inactive

```sql
-- Emergency disable enhanced notifications
UPDATE system_configuration_scf SET scf_is_active = false;
```

2. **Restart Confluence**: Restart to clear any cached classes

### Gradual Rollback

For partial rollback while maintaining functionality:

1. **Keep core services deployed** for backward compatibility
2. **Redirect client applications** to standard endpoints
3. **Monitor for any residual issues**
4. **Plan re-deployment** with fixes

## Support and Maintenance

### Regular Maintenance Tasks

1. **Weekly**: Review email notification success rates
2. **Monthly**: Validate environment configurations
3. **Quarterly**: Performance review and optimization
4. **As needed**: Clear URL construction cache after configuration changes

### Support Contacts

- **Technical Issues**: UMIG Development Team
- **Configuration Changes**: System Administrators
- **Email Delivery Issues**: Infrastructure Team
- **Security Concerns**: Security Team

---

**End of Deployment Guide**

For questions or issues during deployment, consult the troubleshooting section or contact the UMIG development team.
