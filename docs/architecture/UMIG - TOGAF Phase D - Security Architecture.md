# UMIG Security Architecture

**Version:** 1.0  
**Date:** August 28, 2025  
**Status:** Initial Draft  
**TOGAF Phase:** Phase D - Technology Architecture (Security Viewpoint)  
**Part of:** UMIG Enterprise Architecture  
**ArchiMate Viewpoint:** Security & Risk Viewpoint

## Executive Summary

This document defines the Security Architecture for the Unified Migration Implementation Guide (UMIG) system using ArchiMate security concepts. It establishes a defence-in-depth strategy across all architectural layers, incorporating security controls derived from 49 ADRs with particular emphasis on authentication (ADR-042), authorisation (ADR-033), and data protection (ADR-031, ADR-043).

## 1. Security Architecture Vision & Principles

### 1.1 Security Vision

Establish a **platform-integrated zero-trust security architecture** that leverages Confluence enterprise SSO while implementing additional verification layers, protects migration data integrity through comprehensive controls, ensures authorized access via enhanced RBAC, maintains complete audit trails for compliance (GDPR/SOX), and implements defense-in-depth across all architectural layers with specific controls for ScriptRunner platform constraints.

### 1.2 Security Principles (ArchiMate Motivation Layer)

| Principle                          | Statement                                              | Rationale                                        | ArchiMate Element  |
| ---------------------------------- | ------------------------------------------------------ | ------------------------------------------------ | ------------------ |
| **Platform-Integrated Zero Trust** | Never trust, always verify within platform constraints | Leverages Confluence SSO + additional layers     | Security Principle |
| **Defence in Depth**               | Multiple security layers with platform awareness       | Addresses ScriptRunner sandbox limitations       | Security Principle |
| **Least Privilege**                | Minimal necessary access via enhanced RBAC             | 3-tier role model with granular permissions      | Security Principle |
| **Secure by Default**              | Security embedded, not added                           | ADR-driven security patterns (031, 043, 048)     | Security Principle |
| **Fail Secure**                    | Deny access on failure with graceful degradation       | Authentication fallback hierarchy (ADR-042)      | Security Principle |
| **Complete Auditability**          | Log all security events with compliance mapping        | GDPR/SOX audit requirements satisfied            | Security Principle |
| **Data Classification**            | Systematic sensitivity classification                  | Migration data, audit logs, user data, templates | Security Principle |
| **Compliance by Design**           | GDPR/SOX controls embedded                             | Automated compliance validation                  | Security Principle |

## 2. Security Domains & Threat Model

### 2.1 Security Domains (ArchiMate Grouping)

```
Security Domain Model:
+----------------------------------------------------+
|                 External Zone                      |
|         (ArchiMate Location - Untrusted)           |
+----------------------------------------------------+
|                    DMZ Zone                        |
|         (ArchiMate Location - Semi-trusted)        |
+----------------------------------------------------+
|              Application Security Zone             |
|          (ArchiMate Location - Trusted)            |
+----------------------------------------------------+
|                Data Security Zone                  |
|        (ArchiMate Location - Highly Trusted)       |
+----------------------------------------------------+
```

### 2.2 Threat Model (ArchiMate Assessment)

| Threat Category              | Specific Threats                                         | Impact   | Mitigation Controls                                                   | ArchiMate Element |
| ---------------------------- | -------------------------------------------------------- | -------- | --------------------------------------------------------------------- | ----------------- |
| **Authentication Bypass**    | Credential theft, session hijacking, SSO bypass          | Critical | Enhanced MFA + Session validation + ADR-042 fallback                  | Security Risk     |
| **Authorisation Violation**  | Privilege escalation, RBAC bypass, role confusion        | High     | 3-tier RBAC + Access reviews + ADR-033 enforcement                    | Security Risk     |
| **Data Breach**              | SQL injection, data exfiltration, compliance violation   | Critical | Type safety (ADR-043) + TDE + Data classification                     | Security Risk     |
| **Input Manipulation**       | XSS, command injection, type confusion, URL manipulation | High     | Input validation + ADR-031 patterns + URL sanitization (ADR-048)      | Security Risk     |
| **Denial of Service**        | Resource exhaustion, API flooding, service disruption    | Medium   | Rate limiting + Resource monitoring + Graceful degradation            | Security Risk     |
| **Audit Trail Manipulation** | Log tampering, deletion, compliance evidence loss        | High     | Immutable logging + GDPR/SOX audit trails + Forensic procedures       | Security Risk     |
| **Compliance Violation**     | GDPR breach, SOX audit failure, regulatory penalty       | Critical | Data classification + Privacy controls + Automated compliance         | Security Risk     |
| **Platform Vulnerabilities** | Confluence/ScriptRunner exploits, plugin security        | High     | Platform security monitoring + Update procedures + Sandbox validation | Security Risk     |

## 3. Security Architecture Layers

### 3.1 Business Layer Security (ArchiMate Business Layer)

#### 3.1.1 Identity & Access Management Model

```
RBAC Security Model (ArchiMate Business Actors & Roles):
+--------------------------------------------------+
|   Business Actor        Business Role            |
|                                                  |
|   Migration Manager ---> ADMIN Role              |
|                         (Full system access)    |
|                                                  |
|   Cutover Team Lead ---> PILOT Role              |
|                         (Operational access)    |
|                                                  |
|   Team Member --------> NORMAL Role              |
|                         (Read-only access)      |
+--------------------------------------------------+
```

#### 3.1.2 Security Processes (ArchiMate Business Process)

| Process                    | Security Controls                                         | Implementation                                       | ArchiMate Element | ADR Reference      |
| -------------------------- | --------------------------------------------------------- | ---------------------------------------------------- | ----------------- | ------------------ |
| **User Authentication**    | Confluence SSO + Enhanced MFA + Session validation        | 4-level authentication fallback hierarchy            | Business Process  | ADR-042            |
| **Authorisation Decision** | 3-tier RBAC + Resource permissions + Context validation   | Role-based API access with audit logging             | Business Process  | ADR-033            |
| **Data Classification**    | Automatic sensitivity tagging + Privacy impact assessment | Migration data, audit logs, user data classification | Business Process  | GDPR/SOX           |
| **Security Monitoring**    | SIEM integration + Threat detection + Behavior analytics  | Real-time security event correlation                 | Business Process  | Security Standards |
| **Incident Response**      | Automated detection + Response playbooks + Forensics      | Security incident lifecycle management               | Business Process  | ISO 27035          |
| **Compliance Validation**  | GDPR/SOX automated checks + Audit reporting               | Continuous compliance monitoring                     | Business Process  | Regulatory         |
| **Access Review**          | Periodic privilege audit + Role recertification           | Quarterly access reviews with risk scoring           | Business Process  | Access Governance  |

### 3.2 Application Layer Security (ArchiMate Application Layer)

#### 3.2.1 Application Security Services

```
Security Services Architecture (ArchiMate Application Services):
+---------------------------------------------------+
|           Authentication Service                  |
|     (ArchiMate Application Service)               |
|   - Confluence SSO Integration                    |
|   - 4-Level Fallback Hierarchy (ADR-042)         |
+---------------------------------------------------+
|           Authorisation Service                   |
|     (ArchiMate Application Service)               |
|   - RBAC Implementation (ADR-033)                 |
|   - Resource-level Permissions                    |
+---------------------------------------------------+
|           Input Validation Service                |
|     (ArchiMate Application Service)               |
|   - Type Safety Enforcement (ADR-031, 043)       |
|   - SQL Injection Prevention                      |
+---------------------------------------------------+
|           Audit Service                           |
|     (ArchiMate Application Service)               |
|   - Complete Activity Logging                     |
|   - Tamper-proof Audit Trail                     |
+---------------------------------------------------+
```

#### 3.2.2 Security Implementation Patterns

##### Authentication Fallback Pattern (ADR-042)

```groovy
// ArchiMate Application Function
class AuthenticationService {
    UserContext authenticateWithFallback(request) {
        // Level 1: Direct authentication
        if (request.hasAuthenticatedUser()) {
            return new UserContext(
                userId: request.authenticatedUser.id,
                contextType: 'AUTHENTICATED',
                auditIdentifier: request.authenticatedUser.username
            )
        }

        // Level 2: System context
        if (request.hasSystemContext()) {
            return new UserContext(
                userId: systemUserId,
                contextType: 'SYSTEM',
                auditIdentifier: 'SYSTEM_CONTEXT'
            )
        }

        // Level 3: Inferred context
        if (request.hasInferredContext()) {
            return new UserContext(
                userId: inferredUserId,
                contextType: 'INFERRED',
                auditIdentifier: "INFERRED_${request.source}"
            )
        }

        // Level 4: Anonymous
        return new UserContext(
            userId: null,
            contextType: 'ANONYMOUS',
            auditIdentifier: 'ANONYMOUS_USER'
        )
    }
}
```

##### Type Safety Security Pattern (ADR-031, 043)

```groovy
// ArchiMate Application Function
class InputValidationService {

    // Prevent injection through type enforcement
    def validateAndCast(input, expectedType) {
        // Explicit type casting prevents injection
        switch(expectedType) {
            case UUID:
                return UUID.fromString(input.toString())
            case Integer:
                return Integer.parseInt(input.toString())
            case Date:
                // Prevent date manipulation attacks
                return new java.sql.Timestamp(
                    Date.parse('yyyy-MM-dd', input.toString()).time
                )
            default:
                throw new SecurityException("Unsupported type")
        }
    }

    // SQL injection prevention through parameterisation
    def secureDatabaseOperation(params) {
        // All parameters explicitly typed
        def typedParams = params.collectEntries { k, v ->
            [k, validateAndCast(v, parameterTypes[k])]
        }

        // Use parameterised queries only
        return repository.executeQuery(PREPARED_STATEMENT, typedParams)
    }
}
```

### 3.3 Data Layer Security (ArchiMate Passive Structure)

#### 3.3.1 Data Security Architecture

```
Data Security Model (ArchiMate Data Objects):
+--------------------------------------------------+
|           Data Classification                    |
+--------------------------------------------------+
|  Confidential     |  Migration strategies        |
|  (Data Object)    |  Encrypted at rest           |
+------------------+-------------------------------+
|  Restricted       |  Audit logs, user data       |
|  (Data Object)    |  Access controlled           |
+------------------+-------------------------------+
|  Internal         |  Team assignments, status    |
|  (Data Object)    |  Role-based access           |
+------------------+-------------------------------+
|  Public           |  Templates, reference data   |
|  (Data Object)    |  Read access for all         |
+--------------------------------------------------+
```

#### 3.3.2 Database Security Controls

| Control                      | Implementation          | ArchiMate Element    | Coverage           |
| ---------------------------- | ----------------------- | -------------------- | ------------------ |
| **Encryption at Rest**       | Oracle TDE (Production) | Technology Service   | All sensitive data |
| **Encryption in Transit**    | TLS 1.3                 | Communication Path   | All connections    |
| **Access Control**           | Database roles          | Access Relationship  | Schema separation  |
| **SQL Injection Prevention** | Parameterised queries   | Application Function | 100% queries       |
| **Audit Logging**            | Database triggers       | Technology Function  | All DML operations |

### 3.4 Technology Layer Security (ArchiMate Technology Layer)

#### 3.4.1 Infrastructure Security Services

```
Infrastructure Security (ArchiMate Infrastructure Services):
+---------------------------------------------------+
|   Perimeter Security                              |
|   +---------------------------------------+       |
|   |  Web Application Firewall (WAF)      |       |
|   |  (ArchiMate Infrastructure Service)  |       |
|   +---------------------------------------+       |
+---------------------------------------------------+
|   Network Security                                |
|   +---------------------------------------+       |
|   |  Firewall & Network Segmentation     |       |
|   |  (ArchiMate Network)                 |       |
|   +---------------------------------------+       |
+---------------------------------------------------+
|   Endpoint Security                               |
|   +---------------------------------------+       |
|   |  Server Hardening & Patching         |       |
|   |  (ArchiMate Node)                    |       |
|   +---------------------------------------+       |
+---------------------------------------------------+
```

#### 3.4.2 Security Technology Stack

| Component      | Technology          | Security Features      | ArchiMate Element      |
| -------------- | ------------------- | ---------------------- | ---------------------- |
| **Platform**   | Confluence 9.2.7+   | SSO, LDAP integration  | System Software        |
| **Runtime**    | ScriptRunner 9.21.0 | Sandboxed execution    | System Software        |
| **Database**   | Oracle 19c/21c      | TDE, Advanced Security | System Software        |
| **Network**    | TLS 1.3             | Certificate pinning    | Communication Path     |
| **Monitoring** | Enterprise SIEM     | Threat detection       | Infrastructure Service |

## 4. Security Controls Implementation

### 4.1 Preventive Controls Matrix

| Control Category       | Specific Controls         | Implementation           | Validation             |
| ---------------------- | ------------------------- | ------------------------ | ---------------------- |
| **Access Control**     | RBAC, Least privilege     | ADR-033 implementation   | Access review          |
| **Input Validation**   | Type safety, sanitisation | ADR-031, 043 patterns    | Security testing       |
| **Cryptography**       | TLS, database encryption  | Platform configuration   | Certificate validation |
| **Session Management** | Timeout, secure cookies   | Confluence configuration | Session testing        |
| **Error Handling**     | Safe error messages       | ADR-039 patterns         | Error response audit   |

### 4.2 Detective Controls

| Control                      | Monitoring | Alert Criteria        | Response            |
| ---------------------------- | ---------- | --------------------- | ------------------- |
| **Authentication Failures**  | Real-time  | >5 failures/minute    | Account lockout     |
| **Authorisation Violations** | Real-time  | Any violation         | Alert security team |
| **SQL Injection Attempts**   | Real-time  | Pattern detection     | Block and alert     |
| **Data Exfiltration**        | Hourly     | Large data transfers  | Investigation       |
| **Audit Trail Gaps**         | Daily      | Missing audit records | Forensic analysis   |

### 4.3 Corrective Controls

| Incident Type             | Response Procedure           | Recovery Time | Escalation    |
| ------------------------- | ---------------------------- | ------------- | ------------- |
| **Authentication Breach** | Force re-authentication      | <5 minutes    | Security team |
| **Data Breach**           | Isolate, investigate, notify | <1 hour       | CISO          |
| **Service Attack**        | Rate limiting, blocking      | <15 minutes   | Operations    |
| **Privilege Escalation**  | Revoke access, audit         | <30 minutes   | Security team |

## 5. Security Compliance & Standards

### 5.1 Compliance Mapping

| Standard               | Requirements                    | Implementation           | Evidence              |
| ---------------------- | ------------------------------- | ------------------------ | --------------------- |
| **OWASP Top 10**       | Web security best practices     | All controls implemented | Security scan reports |
| **ISO 27001**          | Information security management | Policy and procedures    | Audit documentation   |
| **NIST Cybersecurity** | Framework implementation        | Risk-based approach      | Risk assessments      |
| **PCI DSS**            | If payment data handled         | N/A currently            | Scoping document      |
| **GDPR**               | Data privacy                    | Privacy controls         | Privacy assessment    |

### 5.2 Security Requirements Traceability

| Requirement ID | Description                         | Control Implementation                                                | ADR Reference        |
| -------------- | ----------------------------------- | --------------------------------------------------------------------- | -------------------- |
| NFR-S-001      | Enterprise SSO with enhanced MFA    | Confluence LDAP/SAML + Additional verification layers                 | ADR-001, 042         |
| NFR-S-002      | Role-based authorization with audit | 3-tier RBAC + Access reviews + Change logging                         | ADR-033              |
| NFR-S-003      | Comprehensive input validation      | Type safety framework + SQL injection prevention                      | ADR-031, 043         |
| NFR-S-004      | SQL injection prevention            | Parameterized queries + Type casting validation                       | ADR-043              |
| NFR-S-005      | XSS prevention with CSP             | Output encoding + Content Security Policy                             | Security Standards   |
| NFR-S-006      | Comprehensive audit logging         | Database triggers + Application logging + SIEM integration            | Compliance Standards |
| NFR-S-007      | Encryption in transit               | TLS 1.3 + Certificate validation                                      | Security Standards   |
| NFR-S-008      | Encryption at rest (production)     | Oracle TDE + Key management                                           | Tech Architecture    |
| NFR-S-009      | URL sanitization and validation     | Comprehensive validation framework + Injection prevention             | ADR-048              |
| NFR-S-010      | Authentication fallback security    | 4-level hierarchy + Context validation + Audit logging                | ADR-042              |
| NFR-S-011      | Data classification and privacy     | Automated data classification + Privacy controls + Retention policies | GDPR Compliance      |
| NFR-S-012      | Security monitoring and alerting    | SIEM integration + Threat detection + Incident response automation    | Security Operations  |

## 6. Security Operations

### 6.1 Security Monitoring Architecture

```
Security Monitoring (ArchiMate Collaboration):
+---------------------------------------------------+
|              Security Operations Centre           |
+---------------+---------------+-------------------+
|     SIEM      |   Threat Intel |   Incident      |
|   Monitoring  |     Feeds      |   Response      |
+---------------+---------------+-------------------+
        |               |                  |
        v               v                  v
   Log Collection  Correlation      Remediation
   (All layers)    Engine           Actions
```

### 6.2 Security Metrics & KPIs

| Metric                          | Target              | Measurement      | Frequency    |
| ------------------------------- | ------------------- | ---------------- | ------------ |
| **Vulnerability Count**         | 0 critical, <5 high | Security scans   | Weekly       |
| **Patch Currency**              | 100% within 30 days | Patch reports    | Monthly      |
| **Security Training**           | 100% completion     | Training records | Quarterly    |
| **Incident Response Time**      | <1 hour             | Incident logs    | Per incident |
| **Authentication Success Rate** | >99.5%              | Auth logs        | Daily        |
| **Failed Access Attempts**      | <0.1%               | Security logs    | Daily        |

### 6.3 Security Testing Requirements

| Test Type                  | Coverage         | Frequency    | Tools                |
| -------------------------- | ---------------- | ------------ | -------------------- |
| **Static Analysis**        | 100% codebase    | Every commit | SonarQube            |
| **Dynamic Testing**        | All endpoints    | Weekly       | OWASP ZAP            |
| **Penetration Testing**    | Full application | Quarterly    | Professional service |
| **Vulnerability Scanning** | All components   | Weekly       | Enterprise scanner   |
| **Security Code Review**   | Critical changes | Per PR       | Manual + automated   |

## 7. Security Incident Response

### 7.1 Incident Response Plan (ArchiMate Business Process)

```
Incident Response Process:
+----------+    +----------+    +----------+    +----------+
| Detect   |--->| Analyse  |--->| Contain  |--->| Eradicate |
+----------+    +----------+    +----------+    +----------+
                                                      |
                                                      v
                                 +----------+    +----------+
                                 | Lessons  |<---| Recover  |
                                 +----------+    +----------+
```

### 7.2 Incident Classification

| Severity     | Description                     | Response Time | Escalation       |
| ------------ | ------------------------------- | ------------- | ---------------- |
| **Critical** | System compromise, data breach  | <15 minutes   | CISO, CTO        |
| **High**     | Authentication bypass, DoS      | <1 hour       | Security Manager |
| **Medium**   | Failed attacks, vulnerabilities | <4 hours      | Security Team    |
| **Low**      | Policy violations, scanning     | <24 hours     | Security Analyst |

## 8. Security Governance

### 8.1 Security Roles & Responsibilities (ArchiMate Stakeholder View)

| Role                   | Responsibilities              | ArchiMate Element |
| ---------------------- | ----------------------------- | ----------------- |
| **CISO**               | Overall security strategy     | Stakeholder       |
| **Security Architect** | Security design and standards | Stakeholder       |
| **Security Engineer**  | Implementation and testing    | Stakeholder       |
| **Security Analyst**   | Monitoring and response       | Stakeholder       |
| **Developers**         | Secure coding practices       | Stakeholder       |
| **Operations**         | Security operations           | Stakeholder       |

### 8.2 Security Review Process

| Review Type             | Frequency   | Participants                   | Outputs                  |
| ----------------------- | ----------- | ------------------------------ | ------------------------ |
| **Architecture Review** | Per release | Security architect, developers | Approval/recommendations |
| **Code Review**         | Per commit  | Peer developers                | Approval/fixes           |
| **Security Assessment** | Quarterly   | Security team                  | Risk report              |
| **Compliance Audit**    | Annual      | External auditors              | Compliance report        |

### 8.3 Security Training Programme

| Training               | Audience      | Frequency | Topics                 |
| ---------------------- | ------------- | --------- | ---------------------- |
| **Security Awareness** | All staff     | Annual    | Basic security hygiene |
| **Secure Coding**      | Developers    | Bi-annual | OWASP, secure patterns |
| **Incident Response**  | Operations    | Quarterly | Response procedures    |
| **Security Tools**     | Security team | As needed | Tool-specific training |

## 9. Security Risk Management

### 9.1 Risk Assessment Matrix

| Risk                      | Likelihood | Impact   | Risk Level | Mitigation                 |
| ------------------------- | ---------- | -------- | ---------- | -------------------------- |
| **SQL Injection**         | Low        | Critical | High       | Type safety (ADR-043)      |
| **Authentication Bypass** | Low        | Critical | High       | Multi-factor auth          |
| **Privilege Escalation**  | Medium     | High     | High       | RBAC enforcement           |
| **Data Breach**           | Low        | Critical | High       | Encryption, access control |
| **XSS Attack**            | Medium     | Medium   | Medium     | Output encoding            |
| **DoS Attack**            | Medium     | Medium   | Medium     | Rate limiting              |

### 9.2 Risk Treatment Plan

| Risk                      | Treatment      | Controls                           | Residual Risk |
| ------------------------- | -------------- | ---------------------------------- | ------------- |
| **SQL Injection**         | Mitigate       | Parameterised queries, type safety | Low           |
| **Authentication Bypass** | Mitigate       | SSO, MFA, monitoring               | Low           |
| **Privilege Escalation**  | Mitigate       | RBAC, audit logging                | Low           |
| **Data Breach**           | Mitigate       | Encryption, DLP                    | Low           |
| **XSS Attack**            | Mitigate       | Input validation, CSP              | Low           |
| **DoS Attack**            | Accept/Monitor | Rate limiting, monitoring          | Medium        |

## Appendices

### Appendix A: Security Controls Checklist

Complete security implementation checklist aligned with all 49 ADRs.

### Appendix B: Security Testing Procedures

Detailed security testing procedures and scripts.

### Appendix C: Incident Response Playbooks

Specific response procedures for common security incidents.

### Appendix D: Security Configuration Standards

Baseline security configurations for all components.

### Appendix E: References

- TOGAF 9.2 Security Architecture
- ArchiMate 3.1 Security Viewpoint
- OWASP Application Security Verification Standard
- NIST Cybersecurity Framework
- All UMIG ADRs (particularly 031, 033, 039, 042, 043, 047, 048)

### Appendix F: Revision History

| Version | Date       | Author                     | Description                            |
| ------- | ---------- | -------------------------- | -------------------------------------- |
| 1.0     | 2025-08-28 | Security Architecture Team | Initial security architecture document |

---

_This Security Architecture document establishes the comprehensive security framework for the UMIG system, ensuring defence-in-depth protection across all architectural layers whilst maintaining alignment with enterprise security standards and all relevant ADRs._
