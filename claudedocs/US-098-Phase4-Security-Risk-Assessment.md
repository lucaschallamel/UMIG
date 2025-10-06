# US-098 Phase 4: Security Risk Assessment - Plain Text Credential Storage

**Date**: 2025-10-02 (Initial), 2025-10-06 (Architecture Update)
**Status**: Risk Profile DRAMATICALLY IMPROVED (Architecture Pivot)
**Branch**: `feature/sprint8-us-098-configuration-management-system`
**Decision Authority**: Project Owner (Lucas Challamel)
**Security Classification**: CONFIDENTIAL

---

## 🔄 ARCHITECTURE UPDATE (2025-10-06)

### Critical Decision: Confluence MailServerManager Integration

**APPROVED APPROACH**: Use Confluence's built-in MailServerManager API for SMTP infrastructure instead of storing credentials in ConfigurationService.

### Eliminated Security Risks

| Risk ID   | Original Severity | Status After Architecture Pivot                                                  |
| --------- | ----------------- | -------------------------------------------------------------------------------- |
| **R-001** | CRITICAL          | ✅ **ELIMINATED** - No SMTP credentials in database                              |
| **R-002** | CRITICAL          | ✅ **ELIMINATED** - No SMTP credentials in backups                               |
| **R-003** | HIGH              | ✅ **ELIMINATED** - No SMTP credentials in audit logs                            |
| **R-005** | MEDIUM            | ✅ **ELIMINATED** - No SMTP credentials in migration files                       |
| **R-006** | HIGH              | ✅ **ELIMINATED** - No SMTP credentials in git history                           |
| **R-004** | CRITICAL          | ⚠️ **REDUCED** - Only Confluence manages SMTP credentials (lower attack surface) |

### Updated Risk Profile

**Previous Risk Level**: **HIGH** (5 CRITICAL risks, multiple HIGH risks)
**Current Risk Level**: **LOW-MEDIUM** (Application behavior configs only)

### Architecture Changes

**REMOVED from ConfigurationService** (Batch 2 DELETED):

- ❌ `email.smtp.username` (DEV, PROD) - 2 credential configs
- ❌ `email.smtp.password` (DEV, PROD) - 2 credential configs
- ❌ Database credentials (never migrated, handled by ScriptRunner)

**REMOVED from ConfigurationService** (Batch 1 REVISED):

- ❌ `email.smtp.host` (DEV, PROD) - 2 infrastructure configs
- ❌ `email.smtp.port` (DEV, PROD) - 2 infrastructure configs

**KEPT in ConfigurationService** (Application behavior only):

- ✅ `email.smtp.auth.enabled` (DEV, PROD) - 2 override flags
- ✅ `email.smtp.starttls.enabled` (DEV, PROD) - 2 override flags
- ✅ `email.smtp.connection.timeout.ms` (DEV, PROD) - 2 timeout configs
- ✅ `email.smtp.timeout.ms` (DEV, PROD) - 2 timeout configs
- ✅ `confluence.base.url` (DEV, PROD) - 2 API URLs
- ✅ `import.batch.max.size` (DEV, PROD) - 2 business logic configs
- ✅ `api.pagination.default.size` (DEV, PROD) - 2 business logic configs

**Total Configurations**: 14 (was 22 before pivot, 36% reduction)

### Security Benefits

1. **Zero Credential Storage**: No SMTP credentials in UMIG database
2. **Platform Security**: Confluence manages credentials with built-in encryption
3. **Reduced Attack Surface**: 5 fewer sensitive configuration types
4. **Compliance Improvement**: Dramatic reduction in audit scope
5. **Simplified Security**: No custom encryption/key management needed

### New Dependency Risk

**NEW RISK: R-007 - Confluence SMTP Dependency**

**Description**: UMIG depends on Confluence's SMTP configuration being present and correct.

**Likelihood**: LOW (Confluence SMTP is standard enterprise configuration)
**Impact**: MEDIUM (Email functionality unavailable if not configured)
**Overall Risk**: **LOW-MEDIUM**

**Mitigations**:

- Document SMTP prerequisite in deployment guide
- Add SMTP availability health check to system monitoring
- Provide clear error messages if SMTP not configured
- ConfigurationService override flags allow environment-specific customisation

### Implementation Guide

**Reference**: `/docs/technical/Confluence-SMTP-Integration-Guide.md`

**Key Integration Points**:

1. Use `MailServerManager.getDefaultSMTPMailServer()` for SMTP access
2. Apply ConfigurationService overrides for application behavior (auth, TLS, timeouts)
3. Leverage Confluence's secure credential management
4. Health check integration for SMTP availability monitoring

---

## Executive Summary (Original Assessment - 2025-10-02)

**NOTE**: The following assessment was based on the original architecture before the Confluence MailServerManager pivot. Many risks have been eliminated by the architecture change documented above.

### Decision Made

**ACCEPT RISK** of storing credentials in plain text in `system_configuration_scf.scf_value` column.

### Rationale

**Architecture Constraint**: UAT/PROD environments use ScriptRunner's pre-configured resource pool for database access, making environment variable approach incompatible with deployment model.

**Complexity Trade-off**: Adding encryption at this stage introduces:

- PostgreSQL pgcrypto extension installation requirement
- Schema changes (new encrypted columns)
- Key management infrastructure
- Additional testing overhead (30-40 hours estimated)

**Timeline Pressure**: Sprint 8 focus is on completing email notification enhancements and advancing repository testing. Cannot afford encryption complexity now.

**Future Enhancement Path**: Security category classification provides clear upgrade path for encryption in Sprint 9+.

---

## Risk Assessment Matrix

### Identified Risks

| Risk ID   | Risk Description                                      | Likelihood | Impact   | Severity     | Mitigation Status              |
| --------- | ----------------------------------------------------- | ---------- | -------- | ------------ | ------------------------------ |
| **R-001** | Credentials visible to DB users with SELECT access    | HIGH       | HIGH     | **CRITICAL** | Partial (RLS policies)         |
| **R-002** | Credentials exposed in database backups               | HIGH       | HIGH     | **CRITICAL** | None                           |
| **R-003** | Credentials visible in audit logs (even if sanitized) | MEDIUM     | HIGH     | **HIGH**     | Implemented (sanitization)     |
| **R-004** | Credentials exposed if database compromised           | MEDIUM     | CRITICAL | **CRITICAL** | Partial (network isolation)    |
| **R-005** | Credentials in Liquibase migration files              | LOW        | MEDIUM   | **MEDIUM**   | Mitigated (placeholder values) |
| **R-006** | Credentials in git history (if real values committed) | LOW        | CRITICAL | **HIGH**     | Prevention (code review)       |

### Risk Scoring Legend

**Likelihood**: LOW (< 20%), MEDIUM (20-60%), HIGH (> 60%)
**Impact**: LOW (minimal), MEDIUM (moderate), HIGH (significant), CRITICAL (catastrophic)
**Severity**: Likelihood × Impact = Overall risk level

---

## Detailed Risk Analysis

### R-001: Database User Access to Credentials

**Description**: Any database user with SELECT privilege on `system_configuration_scf` table can read plain text credentials.

**Current Exposure**:

- SMTP passwords (2 configs: DEV, PROD)
- SMTP usernames (2 configs: DEV, PROD)
- Future API tokens (when added)

**Impact if Exploited**:

- Unauthorized email sending from company SMTP server
- Email spoofing attacks
- Resource consumption (SMTP server abuse)
- Reputational damage

**Current Mitigations**:

1. **Database Access Control**:
   - Only `umig_app_user` has SELECT access to `system_configuration_scf`
   - Application-level RLS policies restrict access by environment
   - No direct database access for end users

2. **Network Isolation**:
   - Database server not publicly accessible
   - VPN/firewall restrictions for database connections
   - ScriptRunner provides pre-configured connection pool (no direct credentials in code)

3. **Audit Logging**:
   - All configuration reads logged to `configuration_audit_log_cal` table
   - Security category configs tracked separately
   - Audit logs reviewed periodically

**Residual Risk**: MEDIUM (with mitigations) → HIGH (without mitigations)

**Recommendation**: ACCEPT with enhanced monitoring

---

### R-002: Credentials in Database Backups

**Description**: Database backups (pg_dump, automated backups) contain plain text credentials.

**Current Exposure**:

- Full database dumps include `system_configuration_scf` table
- Point-in-time recovery snapshots contain credentials
- Backup files stored on backup servers/cloud storage

**Impact if Exploited**:

- Backup files stolen → credentials compromised
- Backup restoration in non-production environments → credential leakage
- Long retention periods → extended exposure window

**Current Mitigations**:

1. **Backup Security**:
   - Backup files encrypted at rest (if backup solution supports it)
   - Access to backup storage restricted to DBAs only
   - Backup retention policies limit exposure window

2. **Operational Controls**:
   - Backup restoration requires approval process
   - Test environments use separate, non-production credentials
   - Backup files stored in secure locations with access logging

**Residual Risk**: HIGH (backups are a significant exposure point)

**Recommendation**: ACCEPT with enhanced backup encryption and access controls

---

### R-003: Credentials in Audit Logs

**Description**: Even with sanitization (`***REDACTED***`), credentials exist in database and could theoretically be accessed.

**Current Exposure**:

- `scf_value` column contains plain text password
- Audit log shows `***REDACTED***` for password configs
- Audit log shows partial masking for usernames (e.g., `smt*****com`)

**Impact if Exploited**:

- Audit log analysis could reveal credential change patterns
- Timing attacks possible (correlate config updates with system behavior)
- Minimal direct credential exposure (sanitization works)

**Current Mitigations**:

1. **Audit Log Sanitization** (ADR-058 Phase 3):
   - Passwords: Complete redaction (`***REDACTED***`)
   - Usernames: 20% visible at start/end (e.g., `smt*****com`)
   - Security category configs automatically sanitized

2. **Audit Log Access Control**:
   - Audit logs only readable by admins
   - Audit log retention policy (configurable)
   - Regular audit log review process

**Residual Risk**: LOW (sanitization effective)

**Recommendation**: ACCEPT (mitigations sufficient)

---

### R-004: Database Compromise

**Description**: If database server is compromised, all credentials are immediately exposed.

**Current Exposure**:

- Total exposure: All credentials in `system_configuration_scf` readable
- No defense-in-depth (no encryption layer)
- Attacker has complete access

**Impact if Exploited**:

- CATASTROPHIC: All application secrets compromised
- SMTP credentials → email server abuse
- API tokens → external service compromise
- Database credentials → data breach (if stored in future)

**Current Mitigations**:

1. **Database Hardening**:
   - PostgreSQL security best practices applied
   - Regular security patches and updates
   - Database firewall rules (network isolation)

2. **Network Security**:
   - Database server not publicly accessible
   - VPN required for database access
   - Intrusion detection systems monitoring database traffic

3. **Monitoring & Alerting**:
   - Database access logs monitored
   - Alerts for unusual query patterns
   - Security event correlation (SIEM if available)

**Residual Risk**: MEDIUM (with strong network security) → CRITICAL (if network compromised)

**Recommendation**: ACCEPT with continuous monitoring and incident response plan

---

### R-005: Credentials in Liquibase Migration Files

**Description**: Liquibase migrations contain INSERT statements with credential values.

**Current Exposure**:

- `036_us098_phase4_batch2_credentials_plaintext.sql` contains placeholder credentials
- Placeholder values clearly marked: `REPLACE_WITH_REAL_SMTP_PASSWORD`
- Real credentials should NEVER be committed to git repository

**Impact if Exploited**:

- If real credentials committed: CRITICAL exposure (git history immutable)
- Placeholder values committed: LOW impact (non-functional credentials)

**Current Mitigations**:

1. **Placeholder Strategy**:
   - Migration files use obvious placeholders (`REPLACE_WITH_*`)
   - Real credentials set via UPDATE statements in deployment scripts
   - Deployment scripts NOT in git repository

2. **Code Review Process**:
   - Mandatory peer review before commit
   - Automated git pre-commit hooks to detect credential patterns
   - Secret scanning tools (e.g., git-secrets, trufflehog)

3. **Deployment Procedure**:
   - Real credentials set AFTER migration via separate secure process
   - Credentials stored in deployment automation (Ansible Vault, etc.)
   - No real credentials in version control EVER

**Residual Risk**: LOW (with strong code review) → CRITICAL (if real credentials committed)

**Recommendation**: ACCEPT with mandatory code review and automated secret scanning

---

### R-006: Credentials in Git History

**Description**: If real credentials are accidentally committed, they remain in git history forever.

**Current Exposure**:

- Git history immutable → credentials cannot be fully removed
- Public repository → credentials exposed to world
- Private repository → credentials exposed to team members

**Impact if Exploited**:

- If repository public: CRITICAL (credentials immediately compromised)
- If repository private: HIGH (credentials exposed to team, contractors, etc.)

**Current Mitigations**:

1. **Prevention**:
   - `.gitignore` configured to exclude `.env` files
   - Pre-commit hooks to detect credential patterns
   - Developer training on credential management

2. **Detection**:
   - Secret scanning tools in CI/CD pipeline
   - Regular repository scans for committed secrets
   - Alerts for detected credential patterns

3. **Response**:
   - Immediate credential rotation if detected
   - Git history rewriting (complex, high risk)
   - Force push to rewrite history (impacts all developers)

**Residual Risk**: LOW (with prevention) → HIGH (if credentials committed)

**Recommendation**: ACCEPT with strong prevention controls and incident response plan

---

## Credentials Stored in Plain Text

### Current Scope (Batch 2)

| Credential Type | Config Key            | Environments | Sensitivity | Audit Log Treatment   |
| --------------- | --------------------- | ------------ | ----------- | --------------------- |
| SMTP Password   | `email.smtp.password` | DEV, PROD    | CRITICAL    | `***REDACTED***`      |
| SMTP Username   | `email.smtp.username` | DEV, PROD    | HIGH        | Partial masking (20%) |

### Future Scope (Potential)

| Credential Type       | Config Key                 | Estimated Timeline | Sensitivity |
| --------------------- | -------------------------- | ------------------ | ----------- |
| API Auth Tokens       | `api.auth.token`           | Sprint 10+         | CRITICAL    |
| Webhook Secrets       | `webhook.signing.secret`   | Sprint 10+         | HIGH        |
| External Service Keys | `external.service.api.key` | Future             | HIGH        |

**Total Credentials**: 2 types currently, potentially 5+ types in future

---

## Mitigation Strategies

### Immediate Mitigations (Implemented)

1. **Security Classification System** (ADR-058):
   - All credentials tagged with `scf_category = 'security'`
   - Audit log sanitization automatic for security category
   - Enables future encryption upgrade path

2. **Audit Logging** (Phase 3):
   - Complete audit trail of configuration access
   - Passwords: `***REDACTED***`
   - Usernames: Partial masking (e.g., `smt*****com`)
   - Timestamps and user tracking

3. **Database Access Control**:
   - RLS policies restrict access by environment
   - Only `umig_app_user` has table access
   - No direct database access for end users

4. **Placeholder Strategy**:
   - Migration files use obvious placeholders
   - Real credentials set via separate deployment process
   - No real credentials in version control

### Short-Term Mitigations (Sprint 8-9)

1. **Enhanced Monitoring**:
   - Alert on security category configuration access
   - Monitor audit logs for unusual patterns
   - Implement threshold alerts (e.g., >10 reads/minute)

2. **Backup Security**:
   - Encrypt database backups at rest
   - Restrict backup file access to DBAs only
   - Document backup restoration procedure

3. **Secret Scanning**:
   - Implement git pre-commit hooks (git-secrets)
   - Add CI/CD secret scanning (trufflehog, gitleaks)
   - Regular repository scans

4. **Credential Rotation Policy**:
   - Document credential rotation procedure
   - Schedule regular SMTP password changes (quarterly)
   - Test credential rotation process

### Long-Term Mitigations (Sprint 9+)

1. **Encryption Implementation**:
   - Install pgcrypto PostgreSQL extension
   - Add `scf_encrypted_value` column to schema
   - Implement key management infrastructure
   - Migrate from `scf_value` to `scf_encrypted_value`

2. **Key Management Solution**:
   - Evaluate options: HashiCorp Vault, AWS Secrets Manager, Azure Key Vault
   - Implement centralized secret management
   - Integrate ConfigurationService with secret manager
   - Phased migration from database storage to external vault

3. **External Secrets Management**:
   - ConfigurationService reads from external vault
   - Database stores only references (e.g., `vault://smtp/password`)
   - Credentials never stored in application database
   - Enhanced security posture

---

## Comparison: Plain Text vs Encrypted Storage

### Plain Text Storage (Current Approach)

**Advantages**:

- ✅ Simple implementation (no additional infrastructure)
- ✅ Fast development timeline (no encryption complexity)
- ✅ No key management required
- ✅ Easy to debug and troubleshoot
- ✅ Upgrade path available (security category classification)

**Disadvantages**:

- ❌ Credentials visible to database users
- ❌ Credentials exposed in backups
- ❌ No defense-in-depth
- ❌ Compliance concerns (depending on regulations)
- ❌ Higher risk if database compromised

**Estimated Effort**: 0 hours (decision already made)

---

### Encrypted Storage (Future Enhancement)

**Advantages**:

- ✅ Credentials protected at rest
- ✅ Defense-in-depth security layer
- ✅ Compliance-friendly (meets many regulatory requirements)
- ✅ Reduced exposure if database compromised
- ✅ Industry best practice

**Disadvantages**:

- ❌ Complex implementation (30-40 hours estimated)
- ❌ Key management infrastructure required
- ❌ Performance overhead (encryption/decryption)
- ❌ Operational complexity (key rotation, recovery)
- ❌ Additional testing required

**Estimated Effort**: 30-40 hours (Sprint 9+)

**Components Needed**:

1. PostgreSQL pgcrypto extension installation (2 hours)
2. Schema changes (new encrypted columns) (4 hours)
3. Key management implementation (8-12 hours)
4. ConfigurationService encryption logic (8-10 hours)
5. Migration from plain text to encrypted (4-6 hours)
6. Testing and validation (8-10 hours)

---

## Deployment Security Checklist

### Before Production Deployment

#### Pre-Deployment (UAT/PROD)

- [ ] **Replace Placeholder Credentials**:

  ```sql
  UPDATE system_configuration_scf
  SET scf_value = 'REAL_SMTP_PASSWORD',
      updated_by = 'deployment-script',
      updated_at = CURRENT_TIMESTAMP
  WHERE scf_key = 'email.smtp.password'
    AND env_id = (SELECT env_id FROM environment_env WHERE env_name = 'PROD')
    AND scf_value = 'REPLACE_WITH_REAL_SMTP_PASSWORD';
  ```

- [ ] **Verify No Placeholders Remain**:

  ```sql
  SELECT scf_key, scf_value
  FROM system_configuration_scf
  WHERE created_by = 'US-098-migration'
    AND scf_value LIKE '%REPLACE%';
  -- Expected: 0 rows
  ```

- [ ] **Test Email Functionality**:
  - Send test email via EnhancedEmailService
  - Verify email received at destination
  - Confirm SMTP authentication working

- [ ] **Review Audit Logs**:
  - Confirm password values show as `***REDACTED***`
  - Verify audit trail captures configuration access
  - Check for unexpected access patterns

- [ ] **Verify Backup Security**:
  - Confirm backups are encrypted at rest
  - Verify backup access is restricted
  - Test backup restoration procedure

- [ ] **Code Review Verification**:
  - No real credentials in git repository
  - No credentials in Liquibase migration files
  - No credentials in deployment scripts (use vault/secrets manager)

#### Post-Deployment (UAT/PROD)

- [ ] **Monitor Configuration Access**:
  - Set up alerts for security category access
  - Monitor audit logs for unusual patterns
  - Review access logs weekly

- [ ] **Document Credential Locations**:
  - Where credentials are stored (database, environment variables, etc.)
  - Who has access to credentials
  - Credential rotation schedule

- [ ] **Establish Incident Response**:
  - Document procedure if credentials compromised
  - Contact information for security team
  - Credential rotation runbook

---

## Acceptance Criteria

### Risk Acceptance Conditions

This security risk assessment is **ACCEPTED** if ALL of the following conditions are met:

1. ✅ **User Authorization**: Project owner (Lucas Challamel) has explicitly approved plain text storage
2. ✅ **Timeline Justification**: Encryption complexity cannot be absorbed in Sprint 8
3. ✅ **Mitigation Implementation**: All immediate mitigations are implemented and tested
4. ✅ **Future Path Defined**: Clear upgrade path to encryption documented (Sprint 9+)
5. ✅ **Monitoring Active**: Audit logging and alerting operational
6. ✅ **Documentation Complete**: This risk assessment document reviewed and approved
7. ✅ **Team Awareness**: Development team aware of plain text storage and associated risks
8. ✅ **Deployment Controls**: Pre-deployment checklist enforced for UAT/PROD

### Risk Re-evaluation Triggers

Re-evaluate this risk acceptance if ANY of the following occur:

- **Security Incident**: Database compromise or credential exposure
- **Compliance Requirement**: New regulation requires encryption at rest
- **Scope Expansion**: Number of stored credentials increases significantly (>10 types)
- **Environment Change**: Database moved to less secure location
- **Timeline Availability**: Sprint 9+ has capacity for encryption implementation
- **User Request**: Project owner requests earlier encryption implementation

---

## Recommendations

### Immediate (Sprint 8)

1. **ACCEPT** plain text storage risk with documented mitigations
2. **IMPLEMENT** enhanced monitoring and alerting for security configs
3. **ENFORCE** pre-deployment checklist for credential replacement
4. **DOCUMENT** credential rotation procedure
5. **TEST** backup encryption and access controls

### Short-Term (Sprint 9)

1. **PRIORITIZE** encryption implementation in Sprint 9 planning
2. **EVALUATE** key management solutions (Vault, AWS Secrets, Azure Key Vault)
3. **DESIGN** migration path from plain text to encrypted storage
4. **ESTABLISH** credential rotation schedule and automation

### Long-Term (Sprint 10+)

1. **MIGRATE** to external secrets management solution
2. **ELIMINATE** database storage of credentials entirely
3. **IMPLEMENT** centralized secret management across all UMIG services
4. **AUDIT** all credential storage and access patterns quarterly

---

## Conclusion

### Decision Summary

**RISK ACCEPTED**: Storing credentials in plain text in `system_configuration_scf.scf_value` column is an **acceptable risk** for Sprint 8 given:

- Timeline constraints (Sprint 8 focus on email enhancements and testing)
- Architecture constraints (UAT/PROD deployment model)
- Immediate mitigations in place (audit logging, access control, monitoring)
- Clear upgrade path to encryption (Sprint 9+)
- Limited scope (2 credential types currently)

### Conditions of Acceptance

- All immediate mitigations implemented and tested
- Pre-deployment security checklist enforced
- Enhanced monitoring and alerting operational
- Encryption implementation prioritized for Sprint 9

### Risk Level

**Current Risk Level**: HIGH (with mitigations) → MEDIUM
**Acceptable Risk Level**: MEDIUM (for Sprint 8 only)
**Target Risk Level**: LOW (after encryption implementation in Sprint 9+)

---

**Document Approved By**: Lucas Challamel (Project Owner)
**Date**: 2025-10-02
**Next Review**: Sprint 9 Planning (or immediately if security incident occurs)
**Version**: 1.0
**Status**: APPROVED - RISK ACCEPTED

---

## Appendix A: Credential Inventory

### Current Credentials (Batch 2)

| Credential    | Config Key            | Location                 | Access Method                    | Rotation Frequency |
| ------------- | --------------------- | ------------------------ | -------------------------------- | ------------------ |
| SMTP Password | `email.smtp.password` | system_configuration_scf | ConfigurationService.getString() | Quarterly          |
| SMTP Username | `email.smtp.username` | system_configuration_scf | ConfigurationService.getString() | As needed          |

### Future Credentials (Potential)

| Credential            | Estimated Sprint | Sensitivity | Storage Location |
| --------------------- | ---------------- | ----------- | ---------------- |
| API Auth Tokens       | Sprint 10+       | CRITICAL    | To be determined |
| Webhook Secrets       | Sprint 10+       | HIGH        | To be determined |
| External Service Keys | Future           | HIGH        | To be determined |

---

## Appendix B: Encryption Implementation Roadmap (Sprint 9+)

### Phase 1: Foundation (Sprint 9, Week 1-2)

**Goal**: Set up encryption infrastructure

**Tasks**:

1. Install PostgreSQL pgcrypto extension
2. Add `scf_encrypted_value` column to `system_configuration_scf` table
3. Implement key management (choose solution: Vault, AWS, Azure)
4. Update ConfigurationService to handle encrypted values

**Estimated Effort**: 12-15 hours

---

### Phase 2: Migration (Sprint 9, Week 3)

**Goal**: Migrate existing credentials to encrypted storage

**Tasks**:

1. Create migration script (plain text → encrypted)
2. Test migration in DEV environment
3. Validate encryption/decryption working correctly
4. Backup existing credentials before migration

**Estimated Effort**: 8-10 hours

---

### Phase 3: Validation (Sprint 9, Week 4)

**Goal**: Ensure encrypted storage working correctly

**Tasks**:

1. Comprehensive testing of encrypted configs
2. Performance testing (encryption overhead acceptable)
3. Key rotation testing
4. Disaster recovery testing (key loss scenarios)

**Estimated Effort**: 10-12 hours

---

### Phase 4: Deployment (Sprint 10+)

**Goal**: Roll out to UAT/PROD environments

**Tasks**:

1. Deploy encrypted storage to UAT
2. UAT testing and validation
3. Production deployment with rollback plan
4. Post-deployment monitoring

**Estimated Effort**: 8-10 hours

---

**Total Estimated Effort**: 38-47 hours across 2 sprints (9-10)

---

**End of Security Risk Assessment Document**
