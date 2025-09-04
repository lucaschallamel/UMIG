# UMIG Architecture Requirements Specification

**Version:** 1.3  
**Date:** September 4, 2025  
**Status:** Final - All 49 ADRs + US-034 Phase 4-5 Enhancements Incorporated  
**TOGAF Phase:** Phase A-D Requirements  
**Part of:** UMIG Enterprise Architecture

## Executive Summary

This document consolidates all architectural requirements for the Unified Migration Implementation Guide (UMIG) system, comprehensively derived from 49 architectural decisions, business needs, and technical constraints. It serves as the definitive requirements baseline for architecture validation, compliance assessment, and implementation guidance.

## 1. Architecture Principles

### 1.1 Core Principles (Complete from 49 ADRs)

| Principle                         | Statement                                                | Source                             | Implications                                                  |
| --------------------------------- | -------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------- |
| **Confluence-Native Integration** | Application deeply integrated within Confluence platform | ADR-001                            | Leverage existing infrastructure, minimize custom development |
| **Simplicity & Maintainability**  | Prioritize simple, direct solutions over complex ones    | ADR-002, ADR-004, ADR-023          | Pure ScriptRunner, vanilla JavaScript, standardized patterns  |
| **Platform Maximization**         | Leverage existing enterprise platforms                   | ADR-001, ADR-006, ADR-032          | Reduce infrastructure complexity, use approved technologies   |
| **Separation of Concerns**        | Clear boundaries between application layers              | ADR-018, ADR-020, ADR-027, ADR-047 | N-tier architecture, single enrichment responsibility         |
| **Database Agnosticism**          | Support multiple database platforms                      | ADR-003, Tech Architecture         | PostgreSQL dev, Oracle production capability                  |
| **Automation & Reproducibility**  | Automate all environment and deployment tasks            | ADR-006, ADR-008, ADR-025          | Infrastructure as code, Node.js orchestration                 |
| **Test Specificity**              | Test mocks must be highly specific                       | ADR-026                            | Prevent regressions through precise validation                |
| **Zero Information Loss**         | Documentation consolidation without data loss            | ADR-038                            | Systematic preservation during refactoring                    |
| **Technical Debt Management**     | Proactive technical debt resolution within sprints       | ADR-041                            | Balance MVP delivery with long-term quality                   |
| **Type Safety First**             | Mandatory PostgreSQL type casting standards              | ADR-043                            | Eliminate JDBC type inference failures                        |

### 1.2 Derived Architecture Principles

| Principle                         | Rationale                               | Application                                     |
| --------------------------------- | --------------------------------------- | ----------------------------------------------- |
| **Zero Manual Configuration**     | Reduce human error, improve consistency | All configurations in code or automated scripts |
| **Fail-Safe Design**              | System should degrade gracefully        | Fallback mechanisms for all critical functions  |
| **Observable by Design**          | Built-in monitoring and logging         | Comprehensive metrics and audit trails          |
| **Security by Default**           | Security embedded at every layer        | Zero-trust approach, defense in depth           |
| **Enhanced Developer Experience** | Reduce debugging time and frustration   | ADR-039 contextual error messages               |
| **Single Enrichment Point**       | Prevent type casting failures           | ADR-047 repository-only data enrichment         |
| **Unified Data Structures**       | Consistency across all components       | ADR-049 service layer standardization           |

## 2. Functional Requirements

### 2.1 Migration Management Domain

| ID        | Requirement                                                                                     | Priority | Source                     |
| --------- | ----------------------------------------------------------------------------------------------- | -------- | -------------------------- |
| FR-MM-001 | System shall support creation and management of migration plans                                 | Critical | Business Architecture      |
| FR-MM-002 | System shall track migration progress through iterations                                        | Critical | ADR-024                    |
| FR-MM-003 | System shall support hierarchical plan structure (Migration→Iteration→Plan→Sequence→Phase→Step) | Critical | Data Architecture, ADR-024 |
| FR-MM-004 | System shall differentiate between canonical templates and execution instances                  | Critical | ADR-015                    |
| FR-MM-005 | System shall support plan reusability across migrations                                         | High     | ADR-015                    |
| FR-MM-006 | System shall support full attribute instantiation from master to instance                       | High     | ADR-029                    |
| FR-MM-007 | System shall decouple migrations from plans via iterations                                      | Critical | ADR-024                    |
| FR-MM-008 | System shall support URL construction for deep-linking                                          | Critical | ADR-048                    |

### 2.2 User & Access Management Domain

| ID        | Requirement                                                      | Priority | Source     |
| --------- | ---------------------------------------------------------------- | -------- | ---------- |
| FR-UA-001 | System shall integrate with Confluence authentication            | Critical | ADR-001    |
| FR-UA-002 | System shall implement 3-tier RBAC (NORMAL/PILOT/ADMIN)          | Critical | ADR-033    |
| FR-UA-003 | System shall support many-to-many user-team relationships        | High     | ADR-022    |
| FR-UA-004 | System shall provide role-based UI adaptation                    | High     | ADR-033    |
| FR-UA-005 | System shall maintain audit trail of all user actions            | Critical | Compliance |
| FR-UA-006 | System shall provide user context API for role determination     | High     | ADR-033    |
| FR-UA-007 | System shall implement dual authentication context with fallback | Critical | ADR-042    |
| FR-UA-008 | System shall support intelligent user identification hierarchy   | Critical | ADR-042    |

### 2.3 Collaboration Domain

| ID        | Requirement                                                        | Priority | Source  |
| --------- | ------------------------------------------------------------------ | -------- | ------- |
| FR-CO-001 | System shall support commenting on steps (master and instance)     | High     | ADR-021 |
| FR-CO-002 | System shall provide real-time updates via polling                 | Medium   | ADR-005 |
| FR-CO-003 | System shall support email notifications for status changes        | High     | ADR-032 |
| FR-CO-004 | System shall maintain comment history and audit trail              | High     | ADR-021 |
| FR-CO-005 | System shall use Confluence native mail API                        | High     | ADR-032 |
| FR-CO-006 | System shall support email template management                     | Medium   | ADR-032 |
| FR-CO-007 | System shall provide reliable template rendering with unified DTOs | Critical | ADR-049 |

### 2.4 Data Management Domain

| ID        | Requirement                                                        | Priority | Source            |
| --------- | ------------------------------------------------------------------ | -------- | ----------------- |
| FR-DM-001 | System shall support PostgreSQL for development                    | Critical | ADR-003           |
| FR-DM-002 | System shall support Oracle for production                         | Critical | Tech Architecture |
| FR-DM-003 | System shall use Liquibase for schema management                   | Critical | ADR-008           |
| FR-DM-004 | System shall support bulk data import from JSON                    | High     | ADR-028           |
| FR-DM-005 | System shall maintain full audit columns on all tables             | Critical | US-002b           |
| FR-DM-006 | System shall use centralized status management                     | High     | ADR-035           |
| FR-DM-007 | System shall import 500+ JSON files in under 3 minutes             | High     | ADR-028           |
| FR-DM-008 | System shall enforce PostgreSQL type casting standards             | Critical | ADR-043           |
| FR-DM-009 | System shall maintain single data enrichment point                 | Critical | ADR-047           |
| FR-DM-010 | System shall support concurrent data import operations             | High     | US-034 Phase 4    |
| FR-DM-011 | System shall provide import preview with validation                | High     | US-034 Phase 4    |
| FR-DM-012 | System shall support scheduled import execution                    | Medium   | US-034 Phase 4    |
| FR-DM-013 | System shall implement streaming CSV processing with memory limits | High     | US-034 Phase 5    |
| FR-DM-014 | System shall maintain import queue management with priority        | High     | US-034 Phase 4    |
| FR-DM-015 | System shall provide comprehensive security validation with CVSS   | Critical | US-034 Phase 5    |
| FR-DM-016 | System shall achieve 4x import performance improvement             | High     | US-034 Phase 5    |
| FR-DM-017 | System shall reduce memory usage by 85% during import operations   | High     | US-034 Phase 5    |

### 2.5 API Services Domain

| ID         | Requirement                                                          | Priority | Source           |
| ---------- | -------------------------------------------------------------------- | -------- | ---------------- |
| FR-API-001 | System shall provide RESTful API endpoints                           | Critical | ADR-017          |
| FR-API-002 | System shall use CustomEndpointDelegate pattern                      | Critical | ADR-011, ADR-023 |
| FR-API-003 | System shall support hierarchical filtering                          | High     | ADR-030          |
| FR-API-004 | System shall provide structured error responses                      | High     | ADR-039          |
| FR-API-005 | System shall implement API versioning (v1, v2)                       | Medium   | ADR-017          |
| FR-API-006 | System shall enforce separate endpoints per HTTP method              | Critical | ADR-023          |
| FR-API-007 | System shall provide enhanced error context with actionable guidance | High     | ADR-039          |
| FR-API-008 | System shall use closure-based repository access pattern             | Critical | ADR-044          |
| FR-API-009 | System shall enforce layer separation patterns                       | Critical | ADR-047          |

## 3. Non-Functional Requirements

### 3.1 Performance Requirements

| ID        | Requirement                    | Target                   | Measurement         | Source                |
| --------- | ------------------------------ | ------------------------ | ------------------- | --------------------- |
| NFR-P-001 | API response time (P95)        | <500ms                   | Response latency    | SLA                   |
| NFR-P-002 | UI page load time              | <3s                      | Time to interactive | US-036                |
| NFR-P-003 | Database query execution (P95) | <100ms                   | Query time          | ADR-040               |
| NFR-P-004 | Polling efficiency             | <10% server load         | CPU utilization     | ADR-005               |
| NFR-P-005 | Concurrent users support       | 100+                     | Active sessions     | Capacity Planning     |
| NFR-P-006 | Memory usage per user          | <50MB                    | Heap allocation     | Performance Standards |
| NFR-P-007 | Data import performance        | <3 minutes for 500 files | Import time         | ADR-028               |
| NFR-P-008 | URL construction response time | <50ms                    | Service latency     | ADR-048               |
| NFR-P-009 | Configuration cache efficiency | >80% hit rate            | Cache metrics       | ADR-048               |
| NFR-P-010 | Concurrent import operations   | 3 simultaneous imports   | Active imports      | US-034 Phase 4        |
| NFR-P-011 | Import queue processing        | <5s queue latency        | Queue processing    | US-034 Phase 4        |
| NFR-P-012 | Streaming CSV processing       | 10MB/10K row limits      | Memory efficiency   | US-034 Phase 5        |
| NFR-P-013 | Import performance enhancement | 4x speed improvement     | Throughput metrics  | US-034 Phase 5        |
| NFR-P-014 | Memory optimization            | 85% reduction            | Memory usage        | US-034 Phase 5        |
| NFR-P-015 | Import preview generation      | <30s for 20 files        | Preview latency     | US-034 Phase 4        |
| NFR-P-016 | Schedule execution accuracy    | ±2 minutes timing        | Schedule precision  | US-034 Phase 4        |

### 3.2 Security Requirements

| ID        | Requirement                                 | Implementation                                                          | Source              |
| --------- | ------------------------------------------- | ----------------------------------------------------------------------- | ------------------- |
| NFR-S-001 | Enterprise SSO with enhanced verification   | Confluence LDAP/SAML + Additional MFA layers                            | ADR-001, 042        |
| NFR-S-002 | Comprehensive role-based authorization      | 3-tier RBAC + Access reviews + Audit logging                            | ADR-033             |
| NFR-S-003 | Multi-layer input validation                | Type safety + SQL injection prevention + XSS protection                 | ADR-031, 043        |
| NFR-S-004 | SQL injection prevention framework          | Parameterized queries + Type casting + Validation                       | ADR-043             |
| NFR-S-005 | XSS prevention with Content Security Policy | Output encoding + CSP headers + Input sanitization                      | Security Standards  |
| NFR-S-006 | Comprehensive audit logging for compliance  | Database triggers + Application logging + SIEM integration              | GDPR/SOX Compliance |
| NFR-S-007 | Encryption in transit with validation       | TLS 1.3 + Certificate pinning + Validation                              | Security Standards  |
| NFR-S-008 | Encryption at rest with key management      | Oracle TDE + Key rotation + Access controls                             | Tech Architecture   |
| NFR-S-009 | URL security and injection prevention       | Comprehensive validation + Sanitization + Deep linking security         | ADR-048             |
| NFR-S-010 | Secure authentication fallback              | 4-level hierarchy + Context validation + Audit logging                  | ADR-042             |
| NFR-S-011 | Data classification for compliance          | Automated classification + Privacy controls + Retention policies        | GDPR Compliance     |
| NFR-S-012 | Security monitoring and incident response   | SIEM integration + Threat detection + Automated response                | Security Operations |
| NFR-S-013 | Platform security integration               | Confluence/ScriptRunner security + Plugin validation + Sandbox controls | Platform Security   |
| NFR-S-014 | Development-production security parity      | Consistent security controls + Testing + Validation                     | DevSecOps           |
| NFR-S-015 | CVSS vulnerability scoring implementation   | Complete CVSS v3.1 scoring with threat classification                   | US-034 Phase 5      |
| NFR-S-016 | Path traversal protection                   | Whitelist validation + Path sanitization + CVSS 9.1 mitigation          | US-034 Phase 5      |
| NFR-S-017 | File extension validation                   | Strict whitelist enforcement + CVSS 8.8 security controls               | US-034 Phase 5      |
| NFR-S-018 | Input size validation                       | 50MB request limits + CVSS 7.5 protection                               | US-034 Phase 5      |
| NFR-S-019 | Batch size security limits                  | 1000 file maximum + CVSS 6.5 controls                                   | US-034 Phase 5      |
| NFR-S-020 | Comprehensive security audit logging        | Complete threat tracking + Security event classification                | US-034 Phase 5      |
| NFR-S-021 | Defense-in-depth import security            | Multiple validation layers + Excellent (9.2/10) security rating         | US-034 Phase 5      |

### 3.3 Reliability & Availability Requirements

| ID        | Requirement                        | Target                                        | Measurement       | Source             |
| --------- | ---------------------------------- | --------------------------------------------- | ----------------- | ------------------ |
| NFR-R-001 | System availability                | 99.9%                                         | Uptime percentage | SLA                |
| NFR-R-002 | Recovery Time Objective (RTO)      | 4 hours                                       | Time to restore   | DR Plan            |
| NFR-R-003 | Recovery Point Objective (RPO)     | 1 hour                                        | Maximum data loss | DR Plan            |
| NFR-R-004 | Database backup frequency          | Daily full, hourly incremental                | Backup logs       | Operations         |
| NFR-R-005 | Graceful degradation               | Continue operation with reduced functionality | Failover testing  | Architecture       |
| NFR-R-006 | DELETE operation idempotency       | Always return 204                             | ADR-023           | API Standards      |
| NFR-R-007 | Authentication context reliability | Always provide audit identifier               | ADR-042           | Audit Requirements |

### 3.4 Scalability Requirements

| ID         | Requirement                  | Current      | Target (12 months) | Source            |
| ---------- | ---------------------------- | ------------ | ------------------ | ----------------- |
| NFR-SC-001 | User capacity                | 100          | 150                | Capacity Planning |
| NFR-SC-002 | Migration capacity           | 5 concurrent | 10 concurrent      | Business Growth   |
| NFR-SC-003 | Data volume                  | 250GB        | 625GB              | Growth Projection |
| NFR-SC-004 | API calls per day            | 10k          | 17.5k              | Usage Analysis    |
| NFR-SC-005 | Database connections         | 20           | 50                 | Connection Pool   |
| NFR-SC-006 | Email notifications per hour | 500          | 2000               | ADR-032           |

### 3.5 Usability Requirements

| ID        | Requirement                    | Criteria                                  | Source       |
| --------- | ------------------------------ | ----------------------------------------- | ------------ |
| NFR-U-001 | Browser compatibility          | Chrome, Firefox, Safari, Edge             | US-036       |
| NFR-U-002 | Mobile responsiveness (emails) | Render correctly on mobile devices        | ADR-032      |
| NFR-U-003 | Accessibility compliance       | WCAG 2.1 Level AA                         | Standards    |
| NFR-U-004 | Response time feedback         | Visual indicators for operations >1s      | UX Standards |
| NFR-U-005 | Error message clarity          | Actionable guidance in all errors         | ADR-039      |
| NFR-U-006 | Documentation consolidation    | 50% file reduction, zero information loss | ADR-038      |
| NFR-U-007 | URL deep-linking usability     | Valid clickable links in all contexts     | ADR-048      |

### 3.6 Maintainability Requirements

| ID        | Requirement                  | Target                        | Measurement               | Source    |
| --------- | ---------------------------- | ----------------------------- | ------------------------- | --------- |
| NFR-M-001 | Test coverage                | ≥95%                          | Code coverage tools       | ADR-037   |
| NFR-M-002 | Documentation currency       | 100%                          | Documentation reviews     | ADR-038   |
| NFR-M-003 | Code complexity              | Low                           | Cyclomatic complexity <10 | Standards |
| NFR-M-004 | Technical debt ratio         | <15%                          | Development effort        | ADR-041   |
| NFR-M-005 | Cross-platform compatibility | 100%                          | Windows/macOS/Linux       | ADR-025   |
| NFR-M-006 | Test script consolidation    | 50% reduction (8→4)           | Script count              | ADR-037   |
| NFR-M-007 | Mock specificity             | 100% specific SQL validation  | Test quality              | ADR-026   |
| NFR-M-008 | Service layer consistency    | Single transformation service | ADR-049                   |

### 3.7 Quality Assurance Requirements

| ID        | Requirement                 | Implementation                         | Source           |
| --------- | --------------------------- | -------------------------------------- | ---------------- |
| NFR-Q-001 | Database quality validation | Direct SQL validation framework        | ADR-040          |
| NFR-Q-002 | Performance benchmarking    | Query analysis and optimization        | ADR-040          |
| NFR-Q-003 | Data integrity checking     | Constraint and relationship validation | ADR-040          |
| NFR-Q-004 | Integration testing         | Pure Groovy framework                  | ADR-036          |
| NFR-Q-005 | Error scenario coverage     | All SQL states mapped to HTTP codes    | ADR-023, ADR-039 |
| NFR-Q-006 | Type casting validation     | Pre-operation type checking            | ADR-043          |
| NFR-Q-007 | Layer separation validation | Automated double-enrichment detection  | ADR-047          |

### 3.8 Compliance & Regulatory Requirements

| ID        | Requirement                     | Implementation                                                       | Validation                    | Source               |
| --------- | ------------------------------- | -------------------------------------------------------------------- | ----------------------------- | -------------------- |
| NFR-C-001 | GDPR data protection compliance | Data classification + Privacy controls + Consent management          | Privacy impact assessments    | GDPR Regulation      |
| NFR-C-002 | SOX audit trail requirements    | Immutable audit logging + Access controls + Change management        | Annual SOX compliance audit   | SOX Regulation       |
| NFR-C-003 | Right to be forgotten (GDPR)    | Automated data deletion + Anonymization + Audit trail                | Data deletion validation      | GDPR Article 17      |
| NFR-C-004 | Data breach notification        | Automated detection + 72-hour notification + Impact assessment       | Breach response testing       | GDPR Article 33      |
| NFR-C-005 | Access control audit trail      | Complete access logging + Role changes + Permission audits           | Quarterly access reviews      | SOX/GDPR             |
| NFR-C-006 | Data retention and archival     | Automated retention policies + Secure deletion + Legal hold          | Retention policy validation   | Legal Requirements   |
| NFR-C-007 | Cross-border data transfer      | Data localization + Transfer impact assessment + Consent             | Transfer mechanism validation | GDPR Chapter V       |
| NFR-C-008 | Security incident reporting     | Automated incident detection + Classification + Regulatory reporting | Incident response testing     | Multiple Regulations |

## 4. Constraints

### 4.1 Technical Constraints (Complete from 49 ADRs)

| ID     | Constraint                                              | Impact                                    | Source            |
| ------ | ------------------------------------------------------- | ----------------------------------------- | ----------------- |
| TC-001 | No external JavaScript frameworks (React, Vue, Angular) | Frontend complexity                       | ADR-004           |
| TC-002 | Must use ScriptRunner for backend                       | Limited to Groovy capabilities            | ADR-002           |
| TC-003 | Must use CustomEndpointDelegate pattern                 | API implementation restrictions           | ADR-011, ADR-023  |
| TC-004 | PostgreSQL for development only                         | Database compatibility requirements       | ADR-003           |
| TC-005 | Oracle for production                                   | Migration complexity                      | Tech Architecture |
| TC-006 | Confluence platform dependency                          | Version lock-in, upgrade coordination     | ADR-001           |
| TC-007 | No WebSockets support                                   | Polling-based updates only                | ADR-005           |
| TC-008 | Manual ScriptRunner plugin installation                 | Setup complexity                          | ADR-007           |
| TC-009 | No dollar-quoted PL/pgSQL blocks in Liquibase           | Limited migration logic                   | ADR-034           |
| TC-010 | Explicit type casting required                          | Verbose parameter handling                | ADR-031, ADR-043  |
| TC-011 | Node.js required for dev orchestration                  | Additional prerequisite                   | ADR-025           |
| TC-012 | No @Field access in private methods                     | Closure-based repository pattern required | ADR-044           |
| TC-013 | Must use java.sql types for dates                       | No java.util.Date allowed                 | ADR-043           |
| TC-014 | Single data enrichment point                            | Repository layer only                     | ADR-047           |
| TC-015 | Key-value configuration pattern                         | JOIN-based config retrieval               | ADR-048           |
| TC-016 | Maximum 3 concurrent import operations                  | Resource contention prevention            | US-034 Phase 4    |
| TC-017 | Streaming CSV processing memory limits                  | 10MB/10K row constraints                  | US-034 Phase 5    |
| TC-018 | Import queue size limitations                           | Maximum 10 queued operations              | US-034 Phase 4    |
| TC-019 | CVSS scoring mandatory for security validations         | All import threats must be scored         | US-034 Phase 5    |
| TC-020 | Batch processing size constraints                       | 1000 file maximum per batch               | US-034 Phase 5    |

### 4.2 Business Constraints

| ID     | Constraint                               | Impact                              | Source                    |
| ------ | ---------------------------------------- | ----------------------------------- | ------------------------- |
| BC-001 | Must use approved technology stack       | Limited technology choices          | Enterprise Standards      |
| BC-002 | Must integrate with existing Confluence  | No standalone deployment            | ADR-001                   |
| BC-003 | Must support existing user base          | Backward compatibility requirements | Business Requirements     |
| BC-004 | Must comply with enterprise security     | Additional security overhead        | Compliance                |
| BC-005 | Must complete MVP by August 28, 2025     | Feature prioritization              | Project Timeline, ADR-041 |
| BC-006 | No new dependencies for data import      | Limited to existing tools           | ADR-028                   |
| BC-007 | Technical debt resolution within sprints | Elevated sprint utilization         | ADR-041                   |

### 4.3 Operational Constraints

| ID     | Constraint                              | Impact                           | Source            |
| ------ | --------------------------------------- | -------------------------------- | ----------------- |
| OC-001 | No additional production infrastructure | Use existing Confluence servers  | ADR-001, ADR-032  |
| OC-002 | Limited container use (dev only)        | Production deployment complexity | Tech Architecture |
| OC-003 | Enterprise backup systems only          | Backup strategy limitations      | Operations        |
| OC-004 | Existing monitoring tools only          | Observability limitations        | Operations        |
| OC-005 | 92% sprint capacity utilization limit   | Minimal buffer for issues        | ADR-041           |

### 4.4 Architectural Constraints

| ID     | Constraint                            | Impact                             | Source           |
| ------ | ------------------------------------- | ---------------------------------- | ---------------- |
| AC-001 | Must follow N-tier architecture       | Increased initial complexity       | ADR-027          |
| AC-002 | Separate endpoints per HTTP method    | No central dispatchers             | ADR-023          |
| AC-003 | Instance-based filtering only         | Query complexity                   | ADR-030, ADR-031 |
| AC-004 | SPA+REST pattern for admin interfaces | Consistent UI patterns             | ADR-020          |
| AC-005 | Repository-only data enrichment       | API layer pass-through only        | ADR-047          |
| AC-006 | Unified DTO structures                | Single data transformation service | ADR-049          |

## 5. Assumptions

### 5.1 Technical Assumptions

| ID     | Assumption                                       | Risk if Invalid            | Mitigation                 |
| ------ | ------------------------------------------------ | -------------------------- | -------------------------- |
| TA-001 | Confluence will remain stable at 9.2.7+          | Compatibility issues       | Version testing            |
| TA-002 | ScriptRunner 9.21.0+ will be maintained          | Loss of runtime platform   | Alternative evaluation     |
| TA-003 | Oracle database will be available for production | Deployment blocker         | Early provisioning         |
| TA-004 | Network latency <50ms to database                | Performance degradation    | Connection pooling         |
| TA-005 | LDAP/AD integration will remain stable           | Authentication failures    | ADR-042 fallback hierarchy |
| TA-006 | Liquibase can parse simplified SQL               | Migration failures         | ADR-034 compliance         |
| TA-007 | PostgreSQL→Oracle migration is feasible          | Production deployment risk | Migration testing          |
| TA-008 | Groovy 3.0.15 static type checking stable        | Type safety failures       | ADR-031, ADR-043 patterns  |
| TA-009 | ScriptRunner context limitations manageable      | Repository access failures | ADR-044 patterns           |

### 5.2 Business Assumptions

| ID     | Assumption                                 | Risk if Invalid     | Mitigation             |
| ------ | ------------------------------------------ | ------------------- | ---------------------- |
| BA-001 | User base will not exceed 150 in 12 months | Capacity issues     | Scaling plan           |
| BA-002 | Migration complexity will remain similar   | Feature gaps        | ADR-029 flexibility    |
| BA-003 | Business processes will remain stable      | Rework required     | Agile adaptation       |
| BA-004 | Compliance requirements won't change       | Non-compliance      | Regular reviews        |
| BA-005 | Email volume manageable by Confluence      | Performance issues  | ADR-032 monitoring     |
| BA-006 | Technical debt manageable within sprints   | Quality degradation | ADR-041 prioritization |

### 5.3 Operational Assumptions

| ID     | Assumption                              | Risk if Invalid           | Mitigation          |
| ------ | --------------------------------------- | ------------------------- | ------------------- |
| OA-001 | Development team maintains current size | Delivery delays           | Resource planning   |
| OA-002 | Production support will be available    | Operational issues        | Support agreements  |
| OA-003 | Backup infrastructure remains available | Data loss risk            | Backup verification |
| OA-004 | Monitoring tools remain accessible      | Blind spots               | ADR-040 framework   |
| OA-005 | Environment configurations stable       | URL construction failures | ADR-048 caching     |

## 6. Quality Attributes Priority

### 6.1 Architecture Quality Attribute Scenarios

| Quality Attribute   | Scenario                                            | Priority | Measurement         |
| ------------------- | --------------------------------------------------- | -------- | ------------------- |
| **Reliability**     | System handles 100 concurrent users without failure | Critical | Load testing        |
| **Performance**     | Step status update completes in <500ms              | Critical | Response time       |
| **Security**        | Unauthorized access attempts are blocked            | Critical | Penetration testing |
| **Usability**       | New user completes first migration in <30 minutes   | High     | User testing        |
| **Maintainability** | New developer productive in <1 week                 | High     | Onboarding time     |
| **Scalability**     | System scales to 10x current load                   | Medium   | Load testing        |
| **Portability**     | System migrates from PostgreSQL to Oracle           | Medium   | Migration testing   |
| **Testability**     | All database operations validated directly          | High     | ADR-040 framework   |
| **Type Safety**     | Zero type casting failures in production            | Critical | ADR-043 validation  |

### 6.2 Trade-off Matrix

| Attribute 1      | Attribute 2           | Decision                           | Rationale            |
| ---------------- | --------------------- | ---------------------------------- | -------------------- |
| Simplicity       | Features              | Simplicity > Features              | ADR-023, ADR-027     |
| Performance      | Security              | Security > Performance             | Risk management      |
| Usability        | Technical Purity      | Usability > Technical Purity       | User adoption        |
| Speed to Market  | Technical Debt        | Balance required                   | ADR-041              |
| Cost             | Reliability           | Reliability > Cost                 | Business criticality |
| Generic Errors   | Response Size         | Detailed Errors > Small Response   | ADR-039              |
| Test Brittleness | Regression Prevention | Specific Tests > Generic           | ADR-026              |
| Memory Usage     | Data Consistency      | Unified DTOs > Memory Optimization | ADR-049              |

## 7. Compliance Requirements

### 7.1 Standards Compliance

| Standard        | Level                   | Validation           | Frequency     |
| --------------- | ----------------------- | -------------------- | ------------- |
| OWASP Top 10    | Full compliance         | Security scanning    | Quarterly     |
| WCAG 2.1        | Level AA                | Accessibility audit  | Annual        |
| ISO 27001       | Alignment               | Security assessment  | Annual        |
| TOGAF 9.2       | Architecture compliance | Architecture review  | Per phase     |
| SQL Standards   | ANSI SQL compliance     | Liquibase validation | Per migration |
| PostgreSQL JDBC | Type casting standards  | ADR-043 validation   | Per operation |

### 7.2 Regulatory Compliance

| Regulation        | Applicability        | Requirements                    | Implementation             |
| ----------------- | -------------------- | ------------------------------- | -------------------------- |
| GDPR              | If EU data processed | Data privacy, right to deletion | Audit trail, data controls |
| SOX               | Financial data       | Audit trails, access controls   | Comprehensive logging      |
| Internal Policies | All data             | Enterprise security standards   | Security controls          |

## 8. Requirements Traceability

### 8.1 Complete ADR Coverage (49 ADRs)

| ADR Range   | Key Contributions                                               | Primary Domain        |
| ----------- | --------------------------------------------------------------- | --------------------- |
| ADR 001-010 | Foundation architecture, Confluence integration, database setup | Infrastructure        |
| ADR 011-020 | API patterns, data model, SPA architecture                      | API & UI              |
| ADR 021-030 | Comments, relationships, filtering, type safety                 | Collaboration & Data  |
| ADR 031-040 | Testing, documentation, error handling, quality                 | Quality Assurance     |
| ADR 041-049 | Technical debt, authentication, type casting, layer separation  | Architecture Patterns |

### 8.2 Critical Implementation Patterns

| Pattern                                | Description                                      | ADR Source       | Mandatory |
| -------------------------------------- | ------------------------------------------------ | ---------------- | --------- |
| **Explicit Type Casting**              | All parameters must use explicit casting         | ADR-031, ADR-043 | Yes       |
| **Closure-Based Repository Access**    | Required for ScriptRunner compatibility          | ADR-044          | Yes       |
| **Single Data Enrichment**             | Repository layer only, prevent double enrichment | ADR-047          | Yes       |
| **Authentication Fallback**            | 4-level hierarchy for user identification        | ADR-042          | Yes       |
| **Unified DTOs**                       | Consistent data structures across all components | ADR-049          | Yes       |
| **Enhanced Error Responses**           | Structured errors with actionable guidance       | ADR-039          | Yes       |
| **Specific Test Mocks**                | All mocks must validate exact SQL structure      | ADR-026          | Yes       |
| **Environment-Aware URL Construction** | Multi-environment support with caching           | ADR-048          | Yes       |
| **Concurrent Import Coordination**     | Thread-safe resource allocation and queue mgmt   | US-034 Phase 4   | Yes       |
| **CVSS Security Validation**           | Comprehensive threat scoring and mitigation      | US-034 Phase 5   | Yes       |
| **Streaming Data Processing**          | Memory-efficient processing with adaptive limits | US-034 Phase 5   | Yes       |
| **Import Queue Management**            | Priority-based scheduling with resource planning | US-034 Phase 4   | Yes       |

### 8.3 US-034 Data Import Strategy Integration

#### 8.3.1 Phase 4-5 Enhancements Summary

The US-034 Data Import Strategy represents a comprehensive enhancement to UMIG's data processing capabilities, achieving:

**Phase 4 Achievements (Concurrent Operations)**:

- ✅ **Concurrent Import Handling**: Support for 3 simultaneous import operations
- ✅ **Import Queue Management**: Priority-based scheduling with resource allocation
- ✅ **Import Preview System**: Pre-validation and processing estimation
- ✅ **Import Scheduling**: Cron-based scheduling with tenant isolation
- ✅ **Enhanced Orchestration**: Multi-tenant coordination with conflict detection

**Phase 5 Achievements (Performance & Security)**:

- ✅ **Excellent Security Rating**: 9.2/10 with comprehensive CVSS scoring
- ✅ **4x Performance Improvement**: Through parallel chunked processing
- ✅ **85% Memory Reduction**: Via streaming parsers and adaptive management
- ✅ **Defense-in-Depth Security**: Multiple validation layers across all endpoints
- ✅ **Comprehensive Audit Logging**: Complete threat tracking and classification

#### 8.3.2 Architecture Integration Points

| Integration Domain    | Enhancement                                   | Impact                     |
| --------------------- | --------------------------------------------- | -------------------------- |
| **Data Architecture** | Enhanced schema with concurrent mgmt tables   | Multi-tenant isolation     |
| **API Architecture**  | Extended endpoints with security validations  | CVSS-scored error handling |
| **Service Layer**     | Streaming processing with memory optimization | 85% memory reduction       |
| **Security Layer**    | CVSS v3.1 scoring with threat classification  | 9.2/10 security rating     |
| **Performance Layer** | Parallel processing with adaptive chunking    | 4x throughput improvement  |

#### 8.3.3 Requirements Traceability

All US-034 enhancements maintain full traceability to:

- **Functional Requirements**: FR-DM-010 through FR-DM-017
- **Performance Requirements**: NFR-P-010 through NFR-P-016
- **Security Requirements**: NFR-S-015 through NFR-S-021
- **Technical Constraints**: TC-016 through TC-020
- **Implementation Patterns**: Concurrent coordination, CVSS validation, streaming processing

### 8.3 Validation Criteria

Each requirement must have:

1. Clear acceptance criteria with ADR reference
2. Mapped implementation component
3. Associated test case(s) following ADR-026 specificity
4. Type safety validation per ADR-043
5. Layer separation compliance per ADR-047
6. Sign-off from stakeholder

## 9. Implementation Guidance

### 9.1 Repository Implementation Requirements

All repositories must implement (from ADR-043, ADR-044, ADR-047):

```groovy
// Mandatory closure-based access pattern
def getRepository = { -> new EntityRepository() }

// Mandatory type conversion before operations
def convertToPostgreSQLTypes(Map data) {
    // Convert java.util.Date to java.sql types
    // Explicit UUID casting
    // Status ID resolution
}

// Single enrichment point
def findEntityById(UUID id) {
    // Database query
    // SINGLE enrichment
    // Return enriched data
}
```

### 9.2 API Implementation Requirements

All API endpoints must implement (from ADR-023, ADR-039, ADR-047):

```groovy
// Separate endpoints per HTTP method
entity(httpMethod: "GET", groups: ["confluence-users"]) { }
entity(httpMethod: "POST", groups: ["confluence-users"]) { }

// Pass-through pattern (no enrichment)
def entity = repository.findById(id)  // Already enriched
return Response.ok(new JsonBuilder([data: entity]).toString()).build()

// Enhanced error responses
return EnhancedErrorBuilder
    .create("Error description", statusCode)
    .suggestions(["actionable", "guidance"])
    .build()
```

### 9.3 Authentication Context Requirements

All operations requiring audit must implement (from ADR-042):

```groovy
// Get user context with fallback hierarchy
def userContext = UserService.getUserContextWithFallback(preferredUserId)

// Use audit identifier for logging
AuditLogRepository.logAction([
    auditIdentifier: userContext.auditIdentifier,
    contextType: userContext.contextType
])
```

## 10. Quality Gates

### 10.1 Sprint-Level Quality Gates (ADR-041)

| Gate                          | Criteria                      | Validation          | Timing            |
| ----------------------------- | ----------------------------- | ------------------- | ----------------- |
| **Technical Debt Assessment** | Debt ratio <15%               | ADR-041 methodology | Sprint planning   |
| **Test Coverage**             | ≥95% coverage achieved        | Coverage tools      | Sprint completion |
| **Type Safety**               | Zero type casting failures    | ADR-043 validation  | Each commit       |
| **Layer Separation**          | No double enrichment detected | ADR-047 validation  | PR review         |
| **Documentation**             | 100% current                  | Review checklist    | Sprint completion |

### 10.2 Release Quality Gates

| Gate                     | Criteria                      | Validation        | Source            |
| ------------------------ | ----------------------------- | ----------------- | ----------------- |
| **Database Quality**     | All integrity checks pass     | ADR-040 framework | Quality Standards |
| **Performance**          | All benchmarks met            | Performance tests | NFR-P-\*          |
| **Security**             | Zero critical vulnerabilities | Security scan     | NFR-S-\*          |
| **Integration**          | All endpoints tested          | ADR-036 framework | Test Standards    |
| **Production Readiness** | Zero critical defects         | UAT validation    | ADR-041           |

## Appendices

### A. Complete ADR Index

All 49 ADRs have been comprehensively analyzed and integrated into this specification, providing complete requirements coverage across all architectural domains with specific implementation guidance.

### B. Critical Anti-Patterns to Avoid

From ADR analysis, these patterns must be avoided:

- Double data enrichment (ADR-047)
- java.util.Date usage (ADR-043)
- @Field repository access (ADR-044)
- Generic test mocks (ADR-026)
- Central API dispatchers (ADR-023)
- Dollar-quoted SQL in Liquibase (ADR-034)

### C. Implementation Checklist

Complete checklist for ADR compliance available in implementation documentation.

### D. Revision History

| Version | Date       | Author            | Description                                                                                                                                                              |
| ------- | ---------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.0     | 2025-08-28 | Architecture Team | Initial requirements specification from first 20 ADRs                                                                                                                    |
| 1.1     | 2025-08-28 | Architecture Team | Expanded with ADRs 21-40                                                                                                                                                 |
| 1.2     | 2025-08-28 | Architecture Team | Final version with all 49 ADRs comprehensively integrated                                                                                                                |
| 1.3     | 2025-09-04 | Architecture Team | US-034 Phase 4-5 enhancements integrated: concurrent operations, security (CVSS 9.2/10), performance (4x improvement), streaming processing, comprehensive audit logging |

---

_This document represents the complete and final architectural requirements specification for the UMIG system, incorporating all 49 Architectural Decision Records with comprehensive implementation guidance and quality gates._
