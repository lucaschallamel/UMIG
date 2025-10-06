# Diagnostic Scripts

Purpose: System diagnostic and troubleshooting tools for UMIG development environment

## Structure

```
diagnostic-scripts/
├── INVESTIGATION_SUMMARY.md            # Investigation findings and resolutions
├── QUICK_START_GUIDE.md                # Quick troubleshooting reference
├── SCRIPTRUNNER_CACHE_REFRESH.md      # ScriptRunner cache management guide
├── TEMPLATE_VARIABLE_MAPPING.md       # Email template variable mappings
├── test-email-enrichment.groovy       # Email enrichment testing script
└── verify-step-instance-data.sql      # Step instance data verification query
```

## Contents

### Documentation (4 files)

- **INVESTIGATION_SUMMARY.md** - Comprehensive investigation findings, root causes, and resolutions
- **QUICK_START_GUIDE.md** - Quick reference for common troubleshooting scenarios
- **SCRIPTRUNNER_CACHE_REFRESH.md** - ScriptRunner cache clearing procedures
- **TEMPLATE_VARIABLE_MAPPING.md** - Email template variable structure and mappings

### Scripts (2 files)

- **test-email-enrichment.groovy** - Test script for email enrichment functionality
- **verify-step-instance-data.sql** - SQL query for step instance data validation

## Use Cases

### Email Template Diagnostics

- Variable mapping verification
- Template enrichment testing
- Email generation validation
- Template variable availability checks

### ScriptRunner Issues

- Cache refresh procedures
- Class loading problems
- Script registration issues
- Module dependency resolution

### Data Verification

- Step instance data integrity
- Entity relationship validation
- Database state verification
- Migration validation

### Common Troubleshooting

- Quick start procedures
- Known issues and resolutions
- Performance investigation
- Configuration validation

## Quick Commands

```bash
# Test email enrichment
# Copy test-email-enrichment.groovy to ScriptRunner Script Console and execute

# Verify step instance data
psql -U umig_app_user -d umig_app_db -f diagnostic-scripts/verify-step-instance-data.sql

# View investigation summaries
cat diagnostic-scripts/INVESTIGATION_SUMMARY.md

# Check template mappings
cat diagnostic-scripts/TEMPLATE_VARIABLE_MAPPING.md
```

## Integration

- **Email Testing**: Works with MailHog integration (`npm run email:test`)
- **Database**: Direct SQL queries for data verification
- **ScriptRunner**: Groovy scripts for runtime diagnostics
- **Documentation**: References for issue resolution

## Related Resources

- `/local-dev-setup/SESSION_AUTH_UTILITIES.md` - API authentication
- `/local-dev-setup/scripts/services/` - Email service implementation
- `/docs/api/openapi.yaml` - API endpoint reference
- `/claudedocs/TD-016-CONSOLIDATED-Email-Template-System-Fix.md` - Email system fixes

---

_Last Updated: 2025-10-06_
