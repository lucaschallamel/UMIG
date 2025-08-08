# US-032: Confluence Upgrade to v9.2.7 & ScriptRunner 9.21.0

## Story Metadata

**Story ID**: US-032  
**Epic**: Infrastructure & Platform Stability  
**Sprint**: 4  
**Priority**: URGENT (Day 2)  
**Story Points**: 3 (Medium)  
**Story Type**: Infrastructure  
**Status**: Ready for Implementation  
**Author**: Development Team  
**Created**: August 8, 2025  
**Updated**: August 8, 2025  

---

## User Story Statement

**As a** UMIG development team and system administrator  
**I want** to upgrade our Confluence instance to v9.2.7 and ScriptRunner to v9.21.0  
**So that** I can ensure platform security, stability, and compatibility for continued UMIG development and maintain support coverage for our production migration management system  

### Value Statement

This infrastructure upgrade is critical to maintain a secure, stable, and supported platform for UMIG operations. The upgrade ensures compatibility with latest security patches, performance improvements, and continued vendor support, enabling safe development of remaining Sprint 4 features.

---

## Background and Context

### Current State

UMIG is a mission-critical ScriptRunner-based application running on Confluence that manages complex IT migration cutover events. The system currently operates on:

- **Confluence**: Version requiring upgrade to v9.2.7
- **ScriptRunner**: Version requiring upgrade to v9.21.0
- **UMIG Components**: 25+ REST API endpoints, Admin GUI (SPA), PostgreSQL integration
- **Tech Stack**: Groovy 3.0.15, vanilla JavaScript frontend, DatabaseUtil patterns
- **Scale**: Managing 5 migrations, 30 iterations, 1,443+ step instances

### Business Impact

- **Operational Risk**: Running on unsupported versions creates security vulnerabilities
- **Development Blocker**: Sprint 4 features cannot proceed safely without platform stability
- **Compliance**: Vendor support requirements for production systems
- **Performance**: Latest versions include optimization improvements

### Technical Context

The UMIG application relies heavily on ScriptRunner's CustomEndpointDelegate pattern for REST APIs and uses advanced Groovy features. The upgrade must maintain backward compatibility with our established patterns:

```groovy
// Critical UMIG patterns that must remain functional
DatabaseUtil.withSql { sql -> /* database operations */ }
@BaseScript CustomEndpointDelegate delegate
entityName(httpMethod: "GET", groups: ["confluence-users"]) { /* endpoints */ }
```

---

## Acceptance Criteria

### AC1: Pre-Upgrade Environment Validation
**Given** the current UMIG development environment  
**When** I perform pre-upgrade validation  
**Then** all critical components are documented and verified

#### Sub-tasks:
- [ ] Document current Confluence and ScriptRunner versions
- [ ] Backup all UMIG ScriptRunner scripts and configurations
- [ ] Verify all 25+ API endpoints are functioning via automated tests
- [ ] Document all custom ScriptRunner configurations and dependencies
- [ ] Create complete database backup of development environment
- [ ] Validate Admin GUI functionality across all 8 modular components

### AC2: Confluence Platform Upgrade
**Given** a validated pre-upgrade environment  
**When** I upgrade Confluence to v9.2.7  
**Then** the platform upgrade completes successfully without data loss

#### Sub-tasks:
- [ ] Perform Confluence upgrade to v9.2.7 following Atlassian guidelines
- [ ] Verify Confluence starts successfully and all basic functions work
- [ ] Confirm user authentication and authorization remain functional
- [ ] Validate Confluence administration panel accessibility
- [ ] Test ScriptRunner console access and basic functionality
- [ ] Verify database connectivity remains intact

### AC3: ScriptRunner Plugin Upgrade
**Given** a successfully upgraded Confluence instance  
**When** I upgrade ScriptRunner to v9.21.0  
**Then** the plugin upgrade maintains all UMIG functionality

#### Sub-tasks:
- [ ] Upgrade ScriptRunner plugin to version 9.21.0
- [ ] Verify all existing ScriptRunner scripts remain accessible
- [ ] Test CustomEndpointDelegate pattern compatibility
- [ ] Validate Groovy 3.0.15 static type checking continues to work
- [ ] Confirm security group configurations remain intact
- [ ] Test ScriptRunner's REST endpoint functionality

### AC4: UMIG Application Compatibility Verification
**Given** upgraded Confluence and ScriptRunner  
**When** I test UMIG application functionality  
**Then** all core features work without degradation

#### Sub-tasks:
- [ ] Execute complete integration test suite (`./src/groovy/umig/tests/run-integration-tests.sh`)
- [ ] Verify all 25+ REST API endpoints respond correctly
- [ ] Test Admin GUI functionality across all modules:
  - [ ] Users management
  - [ ] Teams management  
  - [ ] Environments management
  - [ ] Applications management
  - [ ] Labels management
  - [ ] Steps management
  - [ ] Plans management
  - [ ] Sequences management
  - [ ] Phases management
  - [ ] Instructions management
- [ ] Validate Iteration View with filtering and sorting
- [ ] Test DatabaseUtil.withSql pattern functionality
- [ ] Verify EmailService integration remains functional
- [ ] Confirm type safety patterns continue to work correctly

### AC5: Performance and Security Validation
**Given** a fully functional upgraded environment  
**When** I perform performance and security testing  
**Then** the system meets or exceeds baseline performance and security standards

#### Sub-tasks:
- [ ] Execute performance baseline tests and compare to pre-upgrade metrics
- [ ] Verify security group enforcement for all API endpoints
- [ ] Test SSL/HTTPS configuration and certificate validity
- [ ] Validate audit logging functionality
- [ ] Confirm user session management works correctly
- [ ] Test concurrent user access patterns

### AC6: Documentation and Knowledge Transfer
**Given** a successfully upgraded and validated environment  
**When** I complete documentation and knowledge transfer  
**Then** all stakeholders have necessary information for ongoing operations

#### Sub-tasks:
- [ ] Update solution-architecture.md with version information
- [ ] Document any compatibility issues discovered and their resolutions
- [ ] Update local-dev-setup README with new version requirements
- [ ] Create upgrade troubleshooting guide for future reference
- [ ] Brief team on any breaking changes or new features available
- [ ] Update deployment procedures with version-specific requirements

---

## Technical Implementation Plan

### Phase 1: Preparation and Backup (Day 1 - Morning)
```bash
# 1. Environment Documentation
npm run document-current-state

# 2. Complete Backup Strategy
backup-confluence-home
backup-postgresql-database
export-scriptrunner-configurations

# 3. Test Environment Validation
npm test
./src/groovy/umig/tests/run-integration-tests.sh
```

### Phase 2: Confluence Upgrade (Day 1 - Afternoon)
```bash
# 1. Stop UMIG services
npm stop

# 2. Confluence Upgrade Process
# Follow Atlassian upgrade documentation
# Maintain database connections
# Preserve user data and configurations

# 3. Initial Validation
confluence-startup-verification
basic-functionality-test
```

### Phase 3: ScriptRunner Upgrade (Day 2 - Morning)
```groovy
// 1. Plugin Upgrade
// Through Confluence UPM (Universal Plugin Manager)
// Maintain existing script compatibility

// 2. UMIG Pattern Validation
DatabaseUtil.withSql { sql ->
    // Verify database pattern still works
    return sql.rows('SELECT COUNT(*) as count FROM umig_migration_master')
}

// 3. REST Endpoint Testing
@BaseScript CustomEndpointDelegate delegate
testEndpoint(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    return Response.ok([status: "upgraded_system_functional"]).build()
}
```

### Phase 4: Comprehensive Testing (Day 2 - Afternoon)
```bash
# 1. Automated Testing Suite
npm test                                    # Node.js tests
./src/groovy/umig/tests/run-integration-tests.sh  # Groovy integration tests

# 2. Manual Testing Checklist
# - All API endpoints via Postman/REST client
# - Admin GUI functionality per module
# - Database operations and transactions
# - Email service integration
# - Security group enforcement
```

### Phase 5: Performance and Documentation (Day 3)
```bash
# 1. Performance Baseline
performance-test-suite
compare-upgrade-metrics

# 2. Documentation Updates
update-architecture-docs
create-upgrade-log
update-deployment-procedures
```

---

## Risk Assessment and Mitigation

### High-Risk Areas

#### Risk 1: ScriptRunner API Compatibility
**Probability**: Medium  
**Impact**: High  
**Description**: CustomEndpointDelegate pattern may have breaking changes

**Mitigation Strategy**:
- Test all API patterns in isolated environment first
- Maintain version compatibility documentation
- Prepare alternative implementation approaches
- Have rollback plan ready for immediate revert

#### Risk 2: Groovy Version Compatibility
**Probability**: Low-Medium  
**Impact**: High  
**Description**: Groovy 3.0.15 static type checking may conflict with new ScriptRunner

**Mitigation Strategy**:
- Validate type checking patterns during testing phase
- Document any required code modifications
- Test all repository patterns thoroughly
- Prepare compatibility shims if needed

#### Risk 3: Database Connection Stability
**Probability**: Low  
**Impact**: Critical  
**Description**: DatabaseUtil.withSql pattern may be affected by platform changes

**Mitigation Strategy**:
- Test database patterns extensively during upgrade
- Have database rollback procedures ready
- Validate connection pooling and transaction management
- Monitor database performance post-upgrade

### Medium-Risk Areas

#### Risk 4: Admin GUI JavaScript Compatibility
**Probability**: Medium  
**Impact**: Medium  
**Description**: Confluence UI changes may affect vanilla JavaScript integration

**Mitigation Strategy**:
- Test all 8 Admin GUI modules systematically
- Validate AUI (Atlassian User Interface) compatibility
- Have frontend rollback code prepared
- Test across different browsers

#### Risk 5: Email Service Integration
**Probability**: Low  
**Impact**: Medium  
**Description**: EmailService.groovy may require configuration updates

**Mitigation Strategy**:
- Test email functionality during upgrade validation
- Verify SMTP configuration remains intact
- Have email service configuration backup
- Test notification delivery end-to-end

### Low-Risk Areas

#### Risk 6: User Authentication
**Probability**: Low  
**Impact**: Medium  
**Description**: Security group configurations may require updates

**Mitigation Strategy**:
- Document current security configurations
- Test user access patterns post-upgrade
- Validate confluence-users group functionality
- Have authentication rollback procedures

---

## Testing Strategy

### Automated Testing Approach

#### 1. Integration Test Suite Execution
```bash
# Pre-upgrade baseline
./src/groovy/umig/tests/run-integration-tests.sh --baseline
npm test --coverage

# Post-upgrade validation
./src/groovy/umig/tests/run-integration-tests.sh --validate
npm test --regression-check
```

#### 2. API Endpoint Validation
```bash
# Automated API testing for all 25+ endpoints
api-test-suite --endpoints=all
api-test-suite --security-validation
api-test-suite --performance-baseline
```

### Manual Testing Protocol

#### 1. Admin GUI Testing Matrix
| Module | Test Cases | Priority |
|--------|------------|----------|
| Users Management | CRUD operations, filtering, validation | Critical |
| Teams Management | Team assignment, hierarchy | Critical |
| Environments Management | Environment configuration | High |
| Applications Management | Application lifecycle | High |
| Labels Management | Label operations, consistency | Medium |
| Steps Management | Step creation, dependencies | Critical |
| Plans Management | Plan workflow, execution | Critical |
| Sequences Management | Sequence ordering, validation | High |
| Phases Management | Phase transitions | High |
| Instructions Management | Instruction rendering | Medium |

#### 2. Iteration View Testing
- [ ] Filter functionality (migration, iteration, team, status)
- [ ] Sorting capabilities across all columns
- [ ] Pagination and data loading performance
- [ ] Export functionality validation
- [ ] Real-time updates and refresh mechanisms

#### 3. Database Integration Testing
```groovy
// Test all critical DatabaseUtil patterns
DatabaseUtil.withSql { sql ->
    // Test complex queries
    def results = sql.rows('''
        SELECT pli.*, pm.migration_name 
        FROM umig_plan_instance pli
        JOIN umig_migration_master pm ON pli.migration_id = pm.migration_id
        WHERE pli.status = ? AND pm.is_active = true
    ''', ['active'])
    
    assert results.size() > 0
    assert results[0].containsKey('migration_name')
}
```

### Performance Testing

#### Baseline Metrics
- API response times: < 200ms for simple queries
- Database query performance: < 100ms for standard operations
- Admin GUI load times: < 3 seconds for initial load
- Concurrent user capacity: Support for 20+ simultaneous users

#### Post-Upgrade Validation
- Compare all baseline metrics
- Validate no performance degradation
- Test under load conditions
- Monitor memory and CPU usage patterns

---

## Success Criteria and Validation

### Primary Success Criteria

#### 1. Zero Data Loss
- [ ] All migration data preserved and accessible
- [ ] No corruption in hierarchical relationships (migrations → iterations → plans → sequences → phases → steps)
- [ ] All user configurations and customizations intact
- [ ] Complete audit trail preservation

#### 2. Full Functional Compatibility
- [ ] All 25+ REST API endpoints respond correctly
- [ ] Admin GUI operates without errors across all 8 modules
- [ ] Database operations perform at baseline levels
- [ ] Integration tests pass at 100% rate
- [ ] Email service functionality validated

#### 3. Security and Access Control
- [ ] All security group configurations preserved
- [ ] User authentication and authorization working
- [ ] API endpoint security enforcement functional
- [ ] SSL/HTTPS configuration maintained

#### 4. Performance Maintenance
- [ ] API response times within baseline tolerances
- [ ] Database query performance maintained or improved
- [ ] Admin GUI loading times acceptable
- [ ] System resource utilization within normal parameters

### Validation Checklist

#### Technical Validation
- [ ] `npm test` passes all tests
- [ ] `./src/groovy/umig/tests/run-integration-tests.sh` completes successfully
- [ ] All API endpoints return expected responses
- [ ] Database connectivity and transaction integrity verified
- [ ] Frontend JavaScript functionality confirmed across browsers

#### Business Validation
- [ ] Core migration management workflows function correctly
- [ ] Iteration View displays accurate, filtered data
- [ ] User management and team assignment operations work
- [ ] Planning and execution features remain operational
- [ ] Reporting and audit capabilities maintained

#### Operational Validation
- [ ] System startup and shutdown procedures work correctly
- [ ] Backup and recovery procedures validated
- [ ] Monitoring and logging systems functional
- [ ] Documentation updated and accurate
- [ ] Team knowledge transfer completed

---

## Dependencies and Constraints

### Technical Dependencies

#### External Dependencies
- **Atlassian Confluence v9.2.7**: Platform compatibility and support requirements
- **ScriptRunner v9.21.0**: Plugin compatibility with Confluence version
- **PostgreSQL**: Database version compatibility with upgraded platform
- **Java Runtime Environment**: Version requirements for new Confluence/ScriptRunner

#### Internal Dependencies
- **UMIG Codebase**: All 25+ API endpoints and Admin GUI modules must remain functional
- **Database Schema**: Liquibase migrations and existing data structure integrity
- **Development Environment**: Container orchestration and local setup compatibility
- **Testing Infrastructure**: Integration test suite and validation procedures

### Resource Constraints

#### Time Constraints
- **Sprint 4 Dependency**: Must complete before other Sprint 4 development work
- **Business Operations**: Minimize downtime during upgrade process
- **Team Availability**: Coordinate with team schedules for testing and validation

#### Technical Constraints
- **Backward Compatibility**: Maintain existing UMIG API contracts
- **Data Preservation**: Zero tolerance for data loss during upgrade
- **Security Requirements**: Maintain current security posture and compliance
- **Performance Standards**: No degradation in system performance metrics

### Organizational Constraints

#### Change Management
- **Stakeholder Communication**: Keep business users informed of upgrade timeline
- **Risk Approval**: Obtain approval for upgrade execution from project stakeholders
- **Documentation Requirements**: Update all relevant documentation post-upgrade

#### Compliance Requirements
- **Vendor Support**: Maintain supported software versions for production readiness
- **Security Standards**: Ensure upgrade meets organizational security requirements
- **Audit Trail**: Maintain complete upgrade documentation for compliance purposes

---

## Rollback Plan

### Rollback Triggers

#### Immediate Rollback Triggers
- Data corruption or loss detected
- Critical API endpoints non-functional
- Database connectivity failures
- Security vulnerabilities introduced
- Performance degradation > 50%

#### Planned Rollback Triggers
- Integration test failure rate > 10%
- Admin GUI functionality severely impaired
- Email service completely non-functional
- Unresolvable compatibility issues discovered

### Rollback Procedures

#### Phase 1: Immediate Response (< 30 minutes)
```bash
# 1. Stop current services
npm stop

# 2. Assess rollback scope
rollback-assessment --critical-systems

# 3. Initiate emergency procedures
emergency-rollback-protocol --activate
```

#### Phase 2: System Restoration (30 minutes - 2 hours)
```bash
# 1. Database Restoration
restore-postgresql-backup --timestamp=pre-upgrade
validate-data-integrity

# 2. Confluence Restoration
restore-confluence-home --version=previous
restore-confluence-configuration

# 3. ScriptRunner Restoration  
install-scriptrunner --version=previous
import-scriptrunner-configurations
```

#### Phase 3: Validation and Recovery (2-4 hours)
```bash
# 1. System Validation
npm start
npm test
./src/groovy/umig/tests/run-integration-tests.sh

# 2. User Communication
notify-stakeholders --rollback-complete
update-project-status --rollback-reason

# 3. Root Cause Analysis
analyze-upgrade-failure
document-lessons-learned
plan-alternative-upgrade-approach
```

### Rollback Success Criteria
- [ ] All UMIG functionality restored to pre-upgrade state
- [ ] No data loss or corruption
- [ ] All users can access system normally  
- [ ] Performance metrics return to baseline
- [ ] Integration tests pass at pre-upgrade levels

### Post-Rollback Actions
- [ ] Complete incident documentation
- [ ] Stakeholder communication and explanation
- [ ] Alternative upgrade strategy planning
- [ ] Team retrospective and lessons learned
- [ ] Updated risk assessment for future upgrade attempts

---

## Communication Plan

### Stakeholder Notifications

#### Pre-Upgrade Communication
- **Recipients**: Development team, business stakeholders, infrastructure team
- **Timeline**: 48 hours before upgrade
- **Content**: Upgrade schedule, expected downtime, rollback procedures

#### During Upgrade Communication  
- **Recipients**: Core development team, project manager
- **Timeline**: Real-time updates during critical phases
- **Content**: Progress updates, any issues encountered, estimated completion times

#### Post-Upgrade Communication
- **Recipients**: All stakeholders, end users
- **Timeline**: Within 2 hours of completion
- **Content**: Upgrade success confirmation, any changes or improvements, next steps

### Escalation Procedures

#### Level 1: Technical Team
- Issues within expected parameters
- Standard troubleshooting procedures
- Team lead decision making

#### Level 2: Project Management
- Timeline delays > 4 hours
- Rollback consideration required
- Resource allocation decisions

#### Level 3: Executive Stakeholders
- Critical system failures
- Business impact assessment
- Strategic decision requirements

---

## Lessons Learned Integration

### Knowledge Capture
- [ ] Document all unexpected issues and their resolutions
- [ ] Record performance improvements or degradations observed
- [ ] Capture any new features or capabilities discovered
- [ ] Note any deprecated functionality or breaking changes

### Process Improvement
- [ ] Evaluate upgrade procedures for future efficiency
- [ ] Assess testing coverage and identify gaps
- [ ] Review communication effectiveness
- [ ] Update rollback procedures based on experience

### Documentation Updates
- [ ] Update solution-architecture.md with version details
- [ ] Revise deployment procedures with lessons learned
- [ ] Create upgrade troubleshooting guide
- [ ] Update risk assessment for future upgrades

---

**Story Owner**: Development Team  
**Stakeholders**: System Administrators, Project Manager, Business Users  
**Review Date**: Post-upgrade completion  
**Next Review**: Quarterly infrastructure review  

---

*This user story follows INVEST principles: Independent, Negotiable, Valuable, Estimable, Small (right-sized), Testable. It provides comprehensive guidance for the critical infrastructure upgrade required for continued UMIG development and operational stability.*