# US-032: Confluence Upgrade Action Plan

## Confluence 8.5.6 → 9.2.7 & ScriptRunner → 9.21.0

**Created**: August 8, 2025  
**Priority**: 🚨 CRITICAL - Day 2 Sprint 4 Blocker  
**Team**: System Architect, DevOps, Security, QA  
**Strategy**: Stream A - Container Image Replacement (Recommended)

---

## Executive Summary

This action plan consolidates the analysis and planning from multiple GENDEV specialists for the critical Confluence platform upgrade. The upgrade addresses **CRITICAL security vulnerabilities** (CVE-2024-21683, CVE-2023-22527) and must be completed before other Sprint 4 development proceeds.

**Key Decision**: Implement Stream A (Container Image Replacement) strategy to preserve data integrity and enable rapid rollback capability.

---

## 1. Current State Assessment

### Infrastructure

- **Confluence**: v8.5.6 (JDK17 container)
- **ScriptRunner**: Unknown version (manually installed)
- **PostgreSQL**: v14-alpine with named volumes
- **Container Runtime**: Podman-compose
- **UMIG Components**: 25+ REST APIs, Admin GUI, 1,443+ step instances

### Critical Security Vulnerabilities

| CVE            | CVSS Score    | Impact                | UMIG Risk           |
| -------------- | ------------- | --------------------- | ------------------- |
| CVE-2024-21683 | 9.6 Critical  | Authentication Bypass | ALL APIs vulnerable |
| CVE-2023-22527 | 10.0 Critical | Remote Code Execution | Complete compromise |
| CVE-2024-1597  | 8.5 High      | SQL Injection         | Database exposure   |

---

## 2. Implementation Strategy: Stream A

### Approach

Container image replacement with preserved named volumes:

- ✅ **Data Preservation**: 100% guaranteed via named volumes
- ✅ **Rollback Time**: <5 minutes
- ✅ **Testing**: Full validation before commitment
- ✅ **Risk**: Minimal with proper backup

### Technical Implementation

```dockerfile
# Update Containerfile
FROM atlassian/confluence-server:9.2.7-jdk17

ENV JVM_MINIMUM_MEMORY=1024m
ENV JVM_MAXIMUM_MEMORY=6144m
ENV CATALINA_OPTS=-Dplugin.script.roots=/var/atlassian/application-data/confluence/scripts
```

---

## 3. Pre-Upgrade Checklist

### Day 1 Preparation (4 hours)

- [ ] **System Backup**

  ```bash
  # Full volume backup
  podman volume export confluence_data > confluence_data_backup.tar
  podman volume export postgres_data > postgres_data_backup.tar

  # Encrypted database backup
  pg_dump umig_app_db | gpg --symmetric > umig_backup_encrypted.sql.gpg
  ```

- [ ] **Baseline Documentation**

  ```bash
  # Run baseline generator
  ./src/groovy/umig/tests/upgrade/pre-upgrade-baseline-generator.groovy
  ```

- [ ] **Security Audit**
  - Document all user sessions
  - Export confluence-users group
  - Catalog API tokens

- [ ] **Test Environment Validation**

  ```bash
  # Run current state tests
  ./src/groovy/umig/tests/run-integration-tests.sh
  ```

---

## 4. Upgrade Execution Plan

### Day 2 Morning: Infrastructure Upgrade (2 hours)

#### Phase 1: Container Preparation (30 min)

```bash
# 1. Update Containerfile
vim local-dev-setup/confluence/Containerfile
# Change: FROM atlassian/confluence-server:8.5.6-jdk17
# To: FROM atlassian/confluence-server:9.2.7-jdk17

# 2. Build new image
cd local-dev-setup
podman build -t umig/confluence-custom:9.2.7 ./confluence/

# 3. Tag for rollback
podman tag umig/confluence-custom:8.5.6 umig/confluence-custom:8.5.6-backup
```

#### Phase 2: Container Deployment (45 min)

```bash
# 1. Graceful shutdown
podman-compose stop confluence

# 2. Update compose file
vim podman-compose.yml
# Update image: umig/confluence-custom:9.2.7

# 3. Deploy new container
podman-compose up -d confluence

# 4. Monitor startup
podman logs -f confluence
```

#### Phase 3: ScriptRunner Upgrade (45 min)

1. Access Confluence UI: <http://localhost:8090>
2. Navigate to: Administration → Manage Apps
3. Upload ScriptRunner 9.21.0 JAR
4. Verify installation and licensing
5. Test Script Console access

### Day 2 Afternoon: Validation (3 hours)

#### Smoke Tests (30 min)

```bash
./src/groovy/umig/tests/upgrade/smoke-test-suite.sh
```

#### Integration Tests (90 min)

```bash
./src/groovy/umig/tests/run-integration-tests.sh
```

#### Security Validation (60 min)

```bash
groovy src/groovy/umig/tests/upgrade/security-validation-test.groovy
```

---

## 5. Test Validation Matrix

### Critical Path Testing

| Component           | Test Type     | Success Criteria        | Rollback Trigger       |
| ------------------- | ------------- | ----------------------- | ---------------------- |
| Confluence Platform | Smoke         | Startup < 2 min         | Startup failure        |
| ScriptRunner        | Functional    | Console accessible      | Script execution fails |
| Database            | Connectivity  | All connections succeed | Connection pool errors |
| REST APIs (25+)     | Integration   | All endpoints respond   | >10% failure rate      |
| Admin GUI           | UI            | All modules load        | JavaScript errors      |
| Performance         | Benchmark     | <200ms response         | >50% degradation       |
| Security            | Vulnerability | No critical issues      | Any HIGH/CRITICAL      |

### Automated Test Execution

```bash
# Master test orchestration
./src/groovy/umig/tests/upgrade/master-test-orchestration.sh

# Results location
ls -la test-reports/$(date +%Y%m%d-%H%M%S)/
```

---

## 6. Rollback Procedures

### Immediate Rollback (<5 minutes)

```bash
# 1. Stop upgraded container
podman-compose stop confluence

# 2. Revert compose file
git checkout podman-compose.yml

# 3. Deploy previous version
podman-compose up -d confluence

# 4. Verify rollback
./src/groovy/umig/tests/upgrade/smoke-test-suite.sh
```

### Data Recovery (if needed)

```bash
# Restore volumes
podman volume import confluence_data < confluence_data_backup.tar
podman volume import postgres_data < postgres_data_backup.tar

# Restore database
gpg --decrypt umig_backup_encrypted.sql.gpg | psql umig_app_db
```

---

## 7. Success Criteria

### Functional Requirements

- ✅ Confluence 9.2.7 running successfully
- ✅ ScriptRunner 9.21.0 operational
- ✅ All 25+ REST APIs functional
- ✅ Admin GUI fully operational
- ✅ Database connectivity maintained

### Performance Requirements

- ✅ API response times <200ms
- ✅ No performance degradation
- ✅ Memory usage <6GB
- ✅ CPU usage <70%

### Security Requirements

- ✅ All critical vulnerabilities patched
- ✅ Authentication working correctly
- ✅ No data exposure issues
- ✅ Audit logging functional

---

## 8. Risk Mitigation

### High Priority Risks

| Risk                    | Probability | Impact   | Mitigation                              |
| ----------------------- | ----------- | -------- | --------------------------------------- |
| API Incompatibility     | Medium      | High     | Comprehensive testing, gradual rollout  |
| Performance Degradation | Low         | Medium   | Baseline comparison, optimization ready |
| Data Corruption         | Very Low    | Critical | Volume backups, transaction logs        |
| Security Breach         | Low         | Critical | Immediate patching, monitoring          |

### Contingency Plans

1. **Partial Failure**: Feature flags for gradual enablement
2. **Performance Issues**: Query optimization scripts ready
3. **Integration Problems**: API compatibility layer prepared
4. **Complete Failure**: Full rollback in <15 minutes

---

## 9. Communication Plan

### Stakeholder Notifications

| Time     | Audience   | Message                                  |
| -------- | ---------- | ---------------------------------------- |
| Day 1 PM | All Users  | Upgrade announcement, expected downtime  |
| Day 2 AM | Tech Team  | Upgrade starting, monitoring required    |
| Day 2 PM | Management | Upgrade status, test results             |
| Day 3 AM | All Users  | Upgrade complete, new features available |

### Escalation Path

1. **Level 1**: DevOps Team Lead (0-15 min)
2. **Level 2**: Engineering Manager (15-30 min)
3. **Level 3**: CTO/Security Officer (30+ min)

---

## 10. Post-Upgrade Activities

### Day 3: Stabilization

- [ ] Monitor system performance (48 hours)
- [ ] Review security scan results
- [ ] Document any issues encountered
- [ ] Update runbooks and procedures

### Week 1: Optimization

- [ ] Implement enhanced RBAC
- [ ] Deploy API rate limiting
- [ ] Configure advanced monitoring
- [ ] Complete security hardening

### Documentation Updates

- [ ] Update system requirements
- [ ] Revise deployment procedures
- [ ] Document new features
- [ ] Update troubleshooting guides

---

## Appendix A: File Locations

### Configuration Files

- `local-dev-setup/confluence/Containerfile`
- `local-dev-setup/podman-compose.yml`
- `local-dev-setup/scripts/provision-confluence.sh`

### Test Scripts

- `src/groovy/umig/tests/upgrade/pre-upgrade-baseline-generator.groovy`
- `src/groovy/umig/tests/upgrade/smoke-test-suite.sh`
- `src/groovy/umig/tests/upgrade/security-validation-test.groovy`
- `src/groovy/umig/tests/upgrade/performance-comparison-test.groovy`
- `src/groovy/umig/tests/upgrade/master-test-orchestration.sh`

### Documentation

- `docs/roadmap/sprint4/sprint4-US032.md` (User Story)
- `docs/deployment/US032-upgrade-deployment-plan.md` (Deployment Plan)
- `docs/roadmap/sprint4/US-032-action-plan.md` (This Document)

---

## Appendix B: Quick Reference Commands

```bash
# Backup
podman volume export confluence_data > confluence_data_backup.tar
pg_dump umig_app_db | gpg --symmetric > backup.sql.gpg

# Upgrade
podman build -t umig/confluence-custom:9.2.7 ./confluence/
podman-compose up -d confluence

# Test
./src/groovy/umig/tests/upgrade/master-test-orchestration.sh

# Rollback
podman-compose stop confluence
git checkout podman-compose.yml
podman-compose up -d confluence

# Monitor
podman logs -f confluence
podman stats confluence
```

---

**Document Status**: READY FOR EXECUTION  
**Next Action**: Begin Day 1 preparation activities  
**Owner**: DevOps Team with Architecture oversight  
**Review Required**: Security Officer approval before execution
