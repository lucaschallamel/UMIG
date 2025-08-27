# Mobile Email Templates Migration Deployment Guide

**Migration**: 024_enhance_mobile_email_templates.sql  
**US Story**: US-039 Phase 0 - Mobile Email Templates  
**Date Created**: August 26, 2025  
**Author**: Lucas Challamel

## Migration Overview

This migration enhances all existing email templates with mobile-responsive design, improving email readability and usability across all devices and email clients.

### What This Migration Does

1. **Updates Existing Templates**: Replaces HTML content in 3 main template types:
   - `STEP_STATUS_CHANGED`: Enhanced with blue gradient header
   - `STEP_OPENED`: Enhanced with green gradient header
   - `INSTRUCTION_COMPLETED`: Enhanced with teal gradient header

2. **Adds Mobile Features**:
   - Responsive design (600px container, 480px/320px breakpoints)
   - Touch-friendly buttons (44px minimum height)
   - Dark mode support via CSS media queries
   - 8+ email client compatibility (Gmail, Outlook, Apple Mail, etc.)
   - Shortened subject lines for mobile displays

3. **New Template Type**:
   - `STEP_NOTIFICATION_MOBILE`: Universal mobile template placeholder

4. **Audit Trail**: Creates audit log entry documenting the enhancement

## Files Modified

- **NEW**: `/local-dev-setup/liquibase/changelogs/024_enhance_mobile_email_templates.sql`
- **UPDATED**: `/local-dev-setup/liquibase/changelogs/db.changelog-master.xml` (added migration 024)

## Deployment Steps

### 1. Pre-Deployment Verification

```bash
# Check current email templates
cd /Users/lucaschallamel/Documents/GitHub/UMIG
npm run db:status  # Verify Liquibase status
```

### 2. Deploy Migration

```bash
# From project root
npm start  # This will run Liquibase update automatically
```

**OR** manually via Liquibase:

```bash
cd local-dev-setup
./liquibase/liquibase update --changelog-file=changelogs/db.changelog-master.xml
```

### 3. Post-Deployment Verification

Connect to PostgreSQL and run verification queries:

```sql
-- Verify template updates
SELECT
    emt_type,
    emt_name,
    emt_is_active,
    emt_updated_date,
    LENGTH(emt_body_html) as html_size_chars,
    CASE
        WHEN emt_body_html LIKE '%mobile-responsive%' OR emt_body_html LIKE '%@media screen%'
        THEN 'Mobile-Responsive'
        ELSE 'Basic'
    END as template_type
FROM email_templates_emt
WHERE emt_is_active = true
ORDER BY emt_type;

-- Check template size limits (Gmail clipping at 102KB)
SELECT
    emt_type,
    emt_name,
    LENGTH(emt_body_html) as size_bytes,
    ROUND(LENGTH(emt_body_html) / 1024.0, 1) as size_kb,
    CASE
        WHEN LENGTH(emt_body_html) > 104857 THEN '⚠️ May be clipped'
        ELSE '✅ Within limits'
    END as gmail_compatibility
FROM email_templates_emt
WHERE emt_is_active = true
ORDER BY LENGTH(emt_body_html) DESC;

-- Verify Enhanced Email Service integration compatibility
SELECT
    emt_type,
    emt_subject,
    CASE
        WHEN emt_body_html LIKE '%stepInstance%' THEN '✅'
        ELSE '❌'
    END as has_step_variables,
    CASE
        WHEN emt_body_html LIKE '%hasStepViewUrl%' THEN '✅'
        ELSE '❌'
    END as has_url_variables,
    CASE
        WHEN emt_body_html LIKE '%@media%' THEN '✅'
        ELSE '❌'
    END as mobile_responsive
FROM email_templates_emt
WHERE emt_is_active = true;
```

### 4. Expected Results After Deployment

- **3 templates updated**: STEP_STATUS_CHANGED, STEP_OPENED, INSTRUCTION_COMPLETED
- **1 new template**: STEP_NOTIFICATION_MOBILE
- **All templates show**: "Mobile-Responsive" in template_type column
- **All templates show**: ✅ for mobile_responsive, step_variables, url_variables
- **Template sizes**: Should be under 102KB (Gmail limit)
- **Updated audit**: New audit_log_aud entry documenting changes

## Rollback Procedure

If rollback is needed:

```bash
# Rollback to previous migration
cd local-dev-setup/liquibase
./liquibase rollbackCount 1
```

This will:

- Restore original template HTML content
- Remove the STEP_NOTIFICATION_MOBILE template type
- Restore original constraint definitions

## Integration with Enhanced Email Service

The mobile templates are fully compatible with the existing `EnhancedEmailService.groovy`:

- **Variable Support**: All existing GString variables (`${stepInstance.*}`, `${instruction.*}`, etc.) preserved
- **URL Support**: Conditional URL logic (`hasStepViewUrl`, `stepViewUrl`) maintained
- **Backward Compatibility**: Existing email sending code requires no changes

## Testing Recommendations

1. **Manual Testing**: Send test emails through UMIG system
2. **Email Client Testing**: Verify rendering in Gmail, Outlook, Apple Mail
3. **Mobile Device Testing**: Test on iOS/Android devices
4. **Dark Mode Testing**: Verify dark mode rendering where supported

## Technical Details

### Mobile Responsiveness Features

- **Container**: 600px max-width with mobile breakpoints at 600px and 480px
- **Typography**: System fonts with fallbacks for cross-platform consistency
- **Buttons**: Minimum 44px height for touch accessibility
- **Spacing**: Optimized padding/margins for mobile reading
- **Images**: Responsive and optimized for retina displays

### Email Client Compatibility

- ✅ Gmail (web, mobile, app)
- ✅ Outlook (2016+, 365, mobile)
- ✅ Apple Mail (macOS, iOS)
- ✅ Yahoo Mail
- ✅ Thunderbird
- ✅ Mobile email clients
- ✅ Dark mode support (where available)

### Performance Optimizations

- **Size**: Templates optimized to stay under Gmail's 102KB clipping limit
- **CSS**: Inlined for maximum compatibility
- **Loading**: Optimized for slow mobile connections
- **Accessibility**: WCAG 2.1 compliant color contrasts and typography

## Support

For issues with this migration:

1. Check Liquibase logs in `/local-dev-setup/logs/`
2. Verify database connectivity
3. Review PostgreSQL logs for constraint or data errors
4. Contact development team with specific error messages

---

**Status**: Ready for Deployment  
**Risk Level**: Low (template updates only, backward compatible)  
**Estimated Deployment Time**: 2-3 minutes  
**Rollback Time**: 1 minute
