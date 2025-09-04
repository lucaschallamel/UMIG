# EPIC-100: UMIG Standalone Migration

**Epic ID**: EPIC-100  
**Title**: Migrate UMIG from Confluence/ScriptRunner to Standalone Application  
**Status**: Planning  
**Priority**: High  
**Business Value**: Critical  
**Total Story Points**: 475  
**Estimated Timeline**: 7-9 months  
**Team Size Required**: 5-6 developers  
**Budget Estimate**: $300k-470k  

---

## Executive Summary

This epic encompasses the complete migration of UMIG from its current Confluence/ScriptRunner architecture to a standalone Spring Boot application deployed on Linux/Tomcat with Oracle Database v19. The migration will eliminate vendor dependencies, improve maintainability, and align with enterprise technology standards while preserving all current functionality.

## Business Case

### Drivers
- Architecture committee mandate for technology standardization
- Elimination of Confluence/ScriptRunner licensing dependencies ($150k+ annual savings)
- Alignment with enterprise Linux/Tomcat/Oracle standards
- Improved system maintainability and supportability
- Enhanced scalability and performance capabilities

### Success Criteria
- 100% feature parity with current system
- Zero data loss during migration
- <3 second response time for all operations
- 99.9% availability post-migration
- 95% user adoption within 2 weeks
- Complete legacy system decommissioning

## Technical Overview

### Current Architecture
- **Platform**: Confluence 9.2.7 + ScriptRunner 9.21.0
- **Backend**: Groovy 3.0.15 REST APIs
- **Frontend**: Vanilla JS with AUI components
- **Database**: PostgreSQL with Liquibase
- **Development**: Podman containers
- **Scale**: 1000+ users, 1,443+ step instances

### Target Architecture
- **Platform**: Linux/Tomcat 9.0+
- **Backend**: Spring Boot 3.1+ (Java 17)
- **Frontend**: React with TypeScript
- **Database**: Oracle Database v19
- **Authentication**: Spring Security + LDAP
- **Deployment**: WAR file deployment

### Migration Strategy
**Recommended Approach**: Strangler Fig Pattern with parallel operation
- Gradual feature migration over 7-9 months
- Blue-Green deployment for risk mitigation
- Parallel validation with existing system
- Instant rollback capability maintained

## Scope & Deliverables

### In Scope
- Complete application re-architecture to Spring Boot
- Database migration from PostgreSQL to Oracle v19
- Authentication system replacement (Confluence → LDAP)
- Frontend migration from AUI to React
- All 24 REST APIs recreation
- Admin GUI, IterationView, and StepView interfaces
- Email notification system
- Data migration and validation
- User training and documentation
- Legacy system decommissioning

### Out of Scope
- New feature development (feature parity only)
- Process re-engineering
- Data model redesign
- Integration with additional systems

## Technical Requirements

### Functional Requirements
1. **Data Management**
   - Hierarchical model: Migrations → Iterations → Plans → Sequences → Phases → Steps → Instructions
   - Support for 5+ migrations, 30+ iterations, 1,443+ step instances
   - Complete CRUD operations for all entities

2. **API Layer** (13 REST endpoints)
   - Users, Teams, Environments, Applications
   - Labels, Migrations, Plans, Sequences
   - Phases, Instructions, Iterations, Status, Steps

3. **User Interface**
   - Admin GUI for all 13 entity types
   - IterationView with real-time sync
   - StepView with status management
   - Role-based access (NORMAL/PILOT/ADMIN)

### Non-Functional Requirements
- **Performance**: <3s response time, 1000+ concurrent users
- **Availability**: 99.9% uptime (8.77 hours/year max downtime)
- **Security**: LDAP integration, encryption, audit trails
- **Usability**: WCAG 2.1 AA compliance, minimal retraining

## Risk Assessment

### Critical Risks
1. **Authentication Migration** (HIGH)
   - Impact: User access disruption
   - Mitigation: Phased rollout with fallback

2. **Database Migration** (HIGH)
   - Impact: Data integrity issues
   - Mitigation: Comprehensive validation, parallel run

3. **Frontend Dependencies** (MEDIUM-HIGH)
   - Impact: UI/UX regression
   - Mitigation: User testing, design system

### Risk Mitigation Strategy
- Strangler Fig pattern for gradual migration
- Comprehensive testing at each phase
- Parallel system operation during transition
- Automated rollback procedures
- Daily data synchronization during migration

## Resource Requirements

### Team Composition
- 2x Senior Java Developers (Spring Boot expertise)
- 1x Frontend Developer (React/TypeScript)
- 1x Database Administrator (Oracle specialist)
- 1x DevOps Engineer (Linux/Tomcat)
- 1x QA Engineer (automation focus)
- 0.5x Project Manager
- 0.5x Business Analyst

### Infrastructure
- Development environment (Linux/Tomcat/Oracle)
- Testing environment (full production replica)
- Staging environment (pre-production validation)
- Production environment (HA configuration)

## Timeline & Phases

### Phase 1: Foundation (Months 1-2) - 55 Points
- Infrastructure setup (Linux/Tomcat/Oracle)
- Spring Boot application bootstrap
- Authentication framework (LDAP)
- Testing framework establishment

### Phase 2: Data Architecture (Months 2-3) - 65 Points
- PostgreSQL to Oracle schema mapping
- Data migration scripts and validation
- JPA entity model creation
- Repository layer implementation

### Phase 3: API Recreation (Months 3-4) - 85 Points
- Core entity APIs (Users, Teams, etc.)
- Complex business logic APIs
- API security and authentication
- Integration testing

### Phase 4: Frontend Migration (Months 4-6) - 95 Points
- React framework setup
- Admin GUI development
- IterationView and StepView
- Mobile responsiveness

### Phase 5: Advanced Features (Months 5-7) - 70 Points
- Email notification system
- Import/Export functionality
- Audit trail implementation
- Performance optimization

### Phase 6: Testing & Validation (Months 6-8) - 60 Points
- Comprehensive testing suites
- User acceptance testing
- Performance testing
- Security testing

### Phase 7: Cutover & Stabilization (Months 7-9) - 45 Points
- Production deployment
- Data migration execution
- Go-live support
- Legacy decommissioning

## Cost Breakdown

### Development Costs
- Development team (9 months): $450k-600k
- Project management: $50k-75k
- **Subtotal**: $500k-675k

### Infrastructure Costs
- Oracle Database licensing: $50k-100k/year
- Server infrastructure: $30k-50k
- Migration tools: $20k-40k
- **Subtotal**: $100k-190k

### Additional Costs
- Training and documentation: $20k-30k
- Contingency (20%): $124k-179k
- **Subtotal**: $144k-209k

### **Total Estimated Cost**: $744k-1,074k

## User Story Summary

### Critical Path Stories (First 10)

| Story ID | Title | Points | Priority |
|----------|-------|--------|----------|
| US-101 | Linux/Tomcat Environment Setup | 8 | Critical |
| US-102 | Oracle Database v19 Provisioning | 8 | Critical |
| US-104 | Spring Boot Application Bootstrap | 8 | Critical |
| US-105 | Spring Security/LDAP Integration | 13 | Critical |
| US-201 | PostgreSQL to Oracle Schema Mapping | 13 | Critical |
| US-204 | JPA Entity Model Creation | 13 | Critical |
| US-301 | Users & Teams APIs | 13 | Critical |
| US-306 | Phases API with Business Logic | 13 | High |
| US-406 | Admin GUI for Entity Management | 21 | High |
| US-501 | Email Notification System | 13 | High |

### Story Distribution by Phase

| Phase | Story Count | Total Points | Percentage |
|-------|------------|--------------|------------|
| Foundation | 8 | 55 | 11.6% |
| Data Architecture | 8 | 65 | 13.7% |
| API Recreation | 10 | 85 | 17.9% |
| Frontend Migration | 10 | 95 | 20.0% |
| Advanced Features | 10 | 70 | 14.7% |
| Testing & Validation | 8 | 60 | 12.6% |
| Cutover | 8 | 45 | 9.5% |
| **TOTAL** | **62** | **475** | **100%** |

## Dependencies & Constraints

### Technical Dependencies
- Oracle Database v19 licensing and provisioning
- Linux/Tomcat infrastructure availability
- LDAP/Active Directory integration access
- Network connectivity between tiers

### Organizational Dependencies
- Architecture committee approvals
- Database team support for Oracle
- Infrastructure team for server provisioning
- Security team for reviews and approvals

### Constraints
- 9-month delivery window (non-negotiable)
- Budget ceiling of $1M
- Minimal business disruption during cutover
- Regulatory compliance maintenance

## Success Metrics

### Technical Metrics
- Response time: 100% of operations <3s
- Availability: ≥99.9% uptime achieved
- Security: Zero critical vulnerabilities
- Quality: <5% defect rate in production

### Business Metrics
- User adoption: 95% within 2 weeks
- Feature parity: 100% functionality preserved
- Cost savings: $150k+ annual licensing reduction
- Maintenance effort: 20% reduction achieved

### Process Metrics
- Timeline adherence: Delivery within 9 months
- Budget compliance: Within $1M budget
- Change management: 90% training completion
- Risk management: No critical risks materialized

## Approval & Sign-off

### Required Approvals
- [ ] Architecture Committee
- [ ] IT Leadership
- [ ] Budget Approval
- [ ] Security Review
- [ ] User Representative Groups

### Key Stakeholders
- **Sponsor**: Architecture Committee Chair
- **Business Owner**: UMIG Product Owner
- **Technical Lead**: Enterprise Architecture Team
- **Project Manager**: TBD
- **Development Lead**: TBD

## Related Documentation

- [US-101 to US-708: Detailed User Stories](./US-101-through-708-standalone-migration.md)
- [Technical Architecture Design](./standalone-architecture-design.md)
- [Database Migration Strategy](./oracle-migration-strategy.md)
- [Risk Management Plan](./risk-management-plan.md)
- [Training and Change Management Plan](./change-management-plan.md)

---

*Last Updated: December 29, 2024*  
*Status: Pending Architecture Committee Review*  
*Next Steps: Stakeholder review session scheduled for January 2025*