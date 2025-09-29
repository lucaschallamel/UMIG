# UMIG Technology Architecture

**Version:** 1.4
**Date:** September 29, 2025
**Status:** PostgreSQL Platform Aligned + Sprint 8 Cross-Reference Integration
**TOGAF Phase:** Phase D - Technology Architecture
**Part of:** UMIG Enterprise Architecture

**Sprint 8 Integration**: Cross-references updated for security architecture enhancement (ADRs 67-70, 8.6/10 security rating) and Data Dictionary (v1.0) technical specifications

## Executive Summary

This document defines the Technology Architecture for the Unified Migration Implementation Guide (UMIG) system, encompassing infrastructure components, deployment patterns, security frameworks, and operational capabilities. The architecture leverages the existing enterprise Confluence platform with ScriptRunner plugin for production deployment, while utilizing containerization for development environments only.

## 1. Technology Architecture Vision & Principles

### 1.1 Technology Architecture Vision

Establish a resilient, secure, and scalable technology foundation that maximizes existing enterprise platform investments (Confluence) while providing isolated development environments through containerization, ensuring reliable migration execution with minimal infrastructure overhead.

### 1.2 Technology Architecture Principles

| Principle                    | Statement                              | Rationale                         | Implications                   |
| ---------------------------- | -------------------------------------- | --------------------------------- | ------------------------------ |
| **Platform Maximization**    | Leverage existing enterprise platforms | Reduces infrastructure complexity | Confluence/ScriptRunner focus  |
| **Environment Isolation**    | Separate dev/test from production      | Ensures production stability      | Container-based development    |
| **Database Standardization** | Standardize on PostgreSQL platform     | Simplified database management    | PostgreSQL all environments    |
| **Minimal Footprint**        | Deploy within existing infrastructure  | Reduces operational overhead      | No additional servers required |
| **Security Integration**     | Use platform security features         | Leverages enterprise security     | Confluence SSO/LDAP            |
| **Operational Simplicity**   | Minimize operational complexity        | Reduces maintenance burden        | Platform-native deployment     |

## 2. Technology Stack Overview

### 2.1 Production Technology Stack (ArchiMate Node Components)

| Technology Service        | Technology Component  | Version | ArchiMate Element      | Purpose                           |
| ------------------------- | --------------------- | ------- | ---------------------- | --------------------------------- |
| **Application Platform**  | Atlassian Confluence  | 9.2.7+  | System Software        | Enterprise collaboration platform |
| **Execution Environment** | ScriptRunner          | 9.21.0+ | Technology Service     | Application runtime service       |
| **Database Service**      | PostgreSQL            | 14+     | System Software        | Enterprise data persistence       |
| **Runtime Platform**      | Java/JDK              | 17      | System Software        | JVM runtime environment           |
| **Web Service**           | Tomcat (embedded)     | 9.x     | System Software        | Servlet container                 |
| **Directory Service**     | Active Directory/LDAP | N/A     | Infrastructure Service | Authentication service            |

### 2.2 Development Technology Stack

| Technology Service          | Technology Component | Version  | ArchiMate Element  | Purpose                      |
| --------------------------- | -------------------- | -------- | ------------------ | ---------------------------- |
| **Container Platform**      | Podman               | 4.x      | Technology Service | Container runtime            |
| **Container Orchestration** | Podman Compose       | Latest   | Technology Service | Service orchestration        |
| **Development Database**    | PostgreSQL           | 14       | System Software    | Development data persistence |
| **Mail Emulator**           | MailHog              | 1.0.1    | Technology Service | SMTP testing (dev only)      |
| **Test Automation**         | Node.js              | 18.x LTS | System Software    | Test execution platform      |

### 2.3 Technology Architecture Layers (ArchiMate Technology Layer)

```
Production Environment:
┌─────────────────────────────────────────────────────┐
│         Technology Interface Layer                   │
│         HTTPS, REST API, Browser Access             │
├─────────────────────────────────────────────────────┤
│         Technology Service Layer                     │
│    ScriptRunner Services, Confluence Services       │
├─────────────────────────────────────────────────────┤
│         System Software Layer                        │
│    Confluence 9.2.7+, ScriptRunner 9.21.0+         │
├─────────────────────────────────────────────────────┤
│         Technology Function Layer                    │
│    Authentication, Authorization, Data Access       │
├─────────────────────────────────────────────────────┤
│         Infrastructure Service Layer                 │
│    Oracle Database, LDAP, SMTP Gateway             │
└─────────────────────────────────────────────────────┘

Development Environment:
┌─────────────────────────────────────────────────────┐
│         Container Service Layer                      │
│    Podman Runtime, Container Networking            │
├─────────────────────────────────────────────────────┤
│         Development Services                         │
│    PostgreSQL, MailHog, Local Confluence           │
└─────────────────────────────────────────────────────┘
```

## 3. Physical Deployment Architecture

### 3.1 Production Deployment Topology (ArchiMate Nodes)

```yaml
Production Environment (Enterprise Data Center):
  Application Node Cluster:
    Primary Node:
      Type: Physical/Virtual Server (ArchiMate Device)
      Components:
        - Confluence Server Instance
        - ScriptRunner Plugin
        - UMIG Application Scripts
      Resources:
        - CPU: 8-16 cores
        - Memory: 16-32 GB
        - Storage: 500 GB

    Secondary Nodes (2-N):
      Type: Physical/Virtual Server (ArchiMate Device)
      Configuration: Identical to Primary
      Purpose: Load distribution and HA

  Database Node:
    Type: Oracle Database Server (ArchiMate Node)
    Configuration:
      - Oracle 19c/21c Enterprise
      - RAC Configuration (optional)
      - Data Guard for DR
    Resources:
      - CPU: 16-32 cores
      - Memory: 64-128 GB
      - Storage: 2-10 TB

  Infrastructure Services (ArchiMate Infrastructure Services):
    - Load Balancer (F5/HAProxy)
    - SMTP Gateway (Exchange/Postfix)
    - LDAP/AD Services
    - Backup Infrastructure
```

### 3.2 Development Deployment (Local Workstation)

```yaml
Development Environment (ArchiMate Node - Workstation):
  Single Developer Workstation:
    Container Runtime (Podman):
      confluence-dev:
        Image: atlassian/confluence:9.2.7
        Port: 8090:8090
        Memory: 4GB
        Volume: ./confluence_home

      postgres-dev:
        Image: postgres:14-alpine
        Port: 5432:5432
        Memory: 2GB
        Volume: ./postgres_data

      mailhog-dev:
        Image: mailhog/mailhog:v1.0.1
        Ports: 8025:8025, 1025:1025
        Memory: 512MB
        Purpose: Email testing only
```

### 3.3 Environment Comparison

| Aspect                | Development              | Production            |
| --------------------- | ------------------------ | --------------------- |
| **Platform**          | Containerized Confluence | Enterprise Confluence |
| **Database**          | PostgreSQL 14            | PostgreSQL 14+        |
| **Deployment**        | Podman containers        | Native installation   |
| **Mail Service**      | MailHog emulator         | Enterprise SMTP       |
| **Authentication**    | Local users              | LDAP/SSO              |
| **High Availability** | None                     | Clustered             |
| **Backup**            | Manual                   | Automated enterprise  |

## 4. Network Architecture (ArchiMate Communication Networks)

### 4.1 Production Network Topology

```
┌─────────────────────────────────────────┐
│   Internet (ArchiMate Network)         │
│                                         │
└────────────┬────────────────────────────┘
             │ HTTPS/443
             ▼
┌─────────────────────────────────────────┐
│   DMZ Network (ArchiMate Network)      │
│   ┌───────────────────────────────┐    │
│   │  Load Balancer                │    │
│   │  (ArchiMate Node)             │    │
│   └───────────┬───────────────────┘    │
└───────────────┼─────────────────────────┘
                │ HTTPS/8090
                ▼
┌─────────────────────────────────────────┐
│  Application Network (ArchiMate Network)│
│  ┌─────────────────────────────────┐   │
│  │ Confluence Cluster               │   │
│  │ (ArchiMate System Software)     │   │
│  └───────────┬─────────────────────┘   │
└──────────────┼──────────────────────────┘
               │ PostgreSQL/5432
               ▼
┌─────────────────────────────────────────┐
│  Database Network (ArchiMate Network)   │
│  ┌─────────────────────────────────┐   │
│  │ PostgreSQL Database              │   │
│  │ (ArchiMate System Software)     │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### 4.2 Development Network (Simplified)

```
Developer Workstation (ArchiMate Device)
    │
    └── Podman Bridge Network (172.x.x.0/24)
        ├── Confluence Container (172.x.x.2)
        ├── PostgreSQL Container (172.x.x.3)
        └── MailHog Container (172.x.x.4)
```

### 4.3 Network Security Zones

| Zone            | Environment | CIDR         | ArchiMate Type        | Access Control     |
| --------------- | ----------- | ------------ | --------------------- | ------------------ |
| **External**    | Production  | Public IP    | Communication Network | WAF + Firewall     |
| **DMZ**         | Production  | 10.0.1.0/24  | Communication Network | Restricted inbound |
| **Application** | Production  | 10.0.10.0/24 | Communication Network | Internal only      |
| **Database**    | Production  | 10.0.20.0/24 | Communication Network | App tier only      |
| **Development** | Dev Only    | 172.x.x.0/24 | Communication Network | Local only         |

## 5. Database Architecture

### 5.1 PostgreSQL Database Architecture (All Environments)

```yaml
PostgreSQL Configuration (ArchiMate Artifact):
  Version: 14+ (Production), 14 (Development)

  Production Configuration:
    Deployment: Primary with optional Read Replicas
    High Availability: Streaming replication + automatic failover
    Backup: pg_dump + WAL-E/pgBackRest with enterprise backup

  Database Configuration:
    max_connections: 200 (Production), 100 (Development)
    shared_buffers: 2GB (Production), 256MB (Development)
    work_mem: 8MB (Production), 4MB (Development)
    effective_cache_size: 6GB (Production), 1GB (Development)

  Schema Design:
    Database: umig_app_db
    Owner: postgres (superuser)
    Application User: umig_app
    Read-Only User: umig_read

  Security Features:
    - Row Level Security (RLS) enabled where applicable
    - Audit logging via audit_log_aud table
    - SSL/TLS encryption for connections
    - Role-based access control

  Performance:
    Connection Pool: 20 connections (default via DatabaseUtil)
    Query Optimization: EXPLAIN ANALYZE for critical queries
    Indexing Strategy: B-tree primary, specialized indexes as needed
```

### 5.2 Database Security Implementation

```yaml
PostgreSQL Security Architecture:
  Authentication:
    - Password-based authentication
    - SSL certificate validation (production)
    - Connection pooling via DatabaseUtil.withSql

  Authorization:
    - Database-level user roles
    - Schema-level permissions
    - Table-level access control

  Audit & Compliance:
    - All modifications logged to audit_log_aud
    - Trigger-based audit trail
    - Change tracking with user context
    - GDPR compliance via data classification

  Data Protection:
    - Encrypted connections (SSL/TLS)
    - Backup encryption
    - Data at rest encryption (planned)
```

### 5.3 Database Performance Characteristics

| Metric               | Development | Production Target | Current Production |
| -------------------- | ----------- | ----------------- | ------------------ |
| **Connection Time**  | <100ms      | <50ms             | 45ms avg           |
| **Query Response**   | <100ms      | <51ms             | 49ms avg (US-056)  |
| **Concurrent Users** | 10          | 100               | 85 current         |
| **Database Size**    | <1GB        | <10GB             | 4.2GB current      |
| **Backup Time**      | <5min       | <30min            | 18min current      |

## 6. Security Architecture (ArchiMate Security Viewpoint)

### 6.1 Production Security Layers (Integrated Architecture)

```yaml
Integrated Security Services (ArchiMate Technology Services):
  Perimeter Security:
    - Service: Web Application Firewall + DDoS Protection
    - Implementation: Enterprise WAF with OWASP rule sets
    - Protection: OWASP Top 10 + Custom rule sets
    - Integration: SIEM logging + Threat intelligence feeds

  Platform Security (Confluence-Integrated):
    - Service: Enhanced Confluence Security Framework
    - Authentication: 4-level fallback hierarchy (ADR-042): ThreadLocal → Headers → Fallback → Default
    - Authorization: Confluence groups + 4-role RBAC (NORMAL/PILOT/ADMIN/SUPER_ADMIN)
    - Session Management: Secure session handling + Timeout controls
    - Plugin Security: ScriptRunner sandbox + Security validation

  Application Security (ADR-Integrated):
    - Service: UMIG Application Security Framework
    - Input Validation: Type safety enforcement (ADR-031, 043)
    - SQL Injection Prevention: Parameterized queries + Type casting
    - URL Security: Comprehensive sanitization (ADR-048)
    - Error Handling: Secure error responses (ADR-039)
    - Data Classification: Automated sensitivity classification

  Database Security (PostgreSQL):
    - Service: PostgreSQL Security Framework
    - Production: SSL/TLS encryption + Row Level Security + Audit logging
    - Development: PostgreSQL security baseline + Audit logging
    - Access Control: Role-based schema access + Connection pooling via DatabaseUtil
    - Compliance: GDPR/SOX audit trail via audit_log_aud table

  Network Security (Defense-in-Depth):
    - Service: Layered Network Protection
    - Segmentation: VLAN separation + Micro-segmentation
    - Monitoring: IDS/IPS + Network behavior analytics
    - Traffic Analysis: Flow monitoring + Anomaly detection
    - Zone Controls: DMZ + Application + Database tier isolation
```

### 6.2 Development Security (Secure Development Lifecycle)

```yaml
Secure Development Environment:
  Container Security:
    - Rootless Podman execution + Security scanning
    - User namespace mapping + Resource limits
    - No privileged containers + Image vulnerability scanning
    - Development-production security parity validation

  Access Controls:
    - Local development only + No external exposure
    - Localhost binding + Development certificates
    - Secure development practices + Code review requirements
    - Test data anonymization + Data protection

  Security Testing:
    - Automated security testing in CI/CD
    - Static application security testing (SAST)
    - Dynamic application security testing (DAST)
    - Dependency vulnerability scanning

  Compliance Development:
    - GDPR compliance testing + Privacy validation
    - SOX audit trail validation + Control testing
    - Security pattern validation (ADR compliance)
    - Secure coding standards enforcement
```

### 6.3 Current Security Assessment & Roadmap

```yaml
Security Assessment (Current State):
  Overall Rating: 6.1/10 (Moderate Risk)

  Strengths:
    - ✅ 4-level authentication fallback (ADR-042)
    - ✅ 4-role RBAC model (UI-level implementation)
    - ✅ SQL injection prevention via Repository pattern
    - ✅ Type safety enforcement (ADR-043)
    - ✅ Comprehensive audit logging (audit_log_aud)
    - ✅ Input validation and sanitization

  Areas for Improvement:
    - 🔄 API-level RBAC (currently UI-level only) - US-074
    - 🔄 Advanced XSS protection - US-082
    - 🔄 Enhanced DoS protection - ADR-046
    - 🔄 Security monitoring & alerting - US-038
    - 🔄 Security scanning & vulnerability management

  Improvement Roadmap:
    Sprint 7: API-level RBAC + Security assessment completion
    Sprint 8: Advanced security controls + monitoring
    Sprint 9: Enterprise-grade security features
```

## 7. Infrastructure Services (ArchiMate Infrastructure Layer)

### 7.1 Production Infrastructure Services

| Service                 | Type                 | Implementation             | ArchiMate Element      |
| ----------------------- | -------------------- | -------------------------- | ---------------------- |
| **Directory Service**   | Authentication       | Active Directory/LDAP      | Infrastructure Service |
| **Email Service**       | Notification         | Exchange/SMTP Gateway      | Infrastructure Service |
| **Backup Service**      | Data Protection      | Enterprise Backup Solution | Infrastructure Service |
| **Monitoring Service**  | Observability        | Enterprise APM             | Infrastructure Service |
| **Load Balancing**      | Traffic Distribution | F5/HAProxy                 | Infrastructure Service |
| **Certificate Service** | PKI                  | Enterprise CA              | Infrastructure Service |

### 7.2 Development Infrastructure (Local Services)

| Service               | Type             | Implementation       | Purpose            |
| --------------------- | ---------------- | -------------------- | ------------------ |
| **Database**          | Data Persistence | PostgreSQL Container | Development only   |
| **Mail Emulator**     | SMTP Testing     | MailHog Container    | Email testing only |
| **Container Runtime** | Virtualization   | Podman               | Local development  |

## 8. Monitoring & Observability Architecture

### 8.1 Production Monitoring

```yaml
Enterprise Monitoring Stack:
  Application Performance:
    Tool: Confluence built-in monitoring
    Metrics:
      - Page load times
      - Plugin performance
      - Database query times

  Infrastructure Monitoring:
    Tool: Enterprise solution (e.g., Datadog, New Relic)
    Metrics:
      - Server resources
      - Network performance
      - Storage utilization

  Database Monitoring:
    Tool: PostgreSQL built-in monitoring + pgAdmin/external tools
    Metrics:
      - Query performance (pg_stat_statements)
      - Connection statistics (pg_stat_activity)
      - Resource utilization (pg_stat_database)
      - Lock monitoring (pg_locks)
      - Index usage (pg_stat_user_indexes)
```

### 8.2 Development Monitoring

```yaml
Development Monitoring (Minimal):
  Container Monitoring:
    - podman stats
    - Container logs
    - Resource usage

  Application Testing:
    - Integration tests
    - Performance benchmarks
    - Local profiling
```

## 9. Disaster Recovery & Business Continuity

### 9.1 Production DR Strategy

```yaml
DR Architecture (ArchiMate Technology Collaboration):
  Primary Site:
    - Full Confluence cluster
    - PostgreSQL primary database
    - Active user traffic

  DR Site:
    - Standby Confluence cluster
    - PostgreSQL streaming replication standby
    - Passive configuration

  Recovery Targets:
    - RTO: 4 hours
    - RPO: 1 hour
    - Failover: Manual with runbook
```

### 9.2 Backup Strategy

| Component      | Environment | Method          | Frequency                  | Retention  |
| -------------- | ----------- | --------------- | -------------------------- | ---------- |
| **Confluence** | Production  | Native backup   | Daily                      | 30 days    |
| **PostgreSQL** | Production  | pg_dump + WAL-E | Daily full, continuous WAL | 30 days    |
| **Scripts**    | All         | Git repository  | On commit                  | Permanent  |
| **PostgreSQL** | Dev         | pg_dump         | Manual                     | Local only |

## 10. Capacity Planning

### 10.1 Production Capacity Requirements

```yaml
Current Production Capacity:
  Confluence Nodes:
    CPU: 8 cores per node
    Memory: 16 GB per node
    Nodes: 2-3

  PostgreSQL Database:
    CPU: 8-16 cores
    Memory: 32-64 GB
    Storage: 1-5 TB

  Expected Growth (12 months):
    Users: +50%
    Data: +100%
    Transactions: +75%
```

### 10.2 Development Capacity (Per Developer)

```yaml
Developer Workstation Requirements:
  Minimum:
    CPU: 4 cores
    Memory: 8 GB
    Storage: 50 GB

  Recommended:
    CPU: 8 cores
    Memory: 16 GB
    Storage: 100 GB
```

## 11. Technology Transition Planning

### 11.1 PostgreSQL Standardization Strategy

```yaml
PostgreSQL Standardization (All Environments):
  Phase 1 - Development Optimization:
    - Performance tuning for development workloads
    - Query optimization and indexing strategy
    - Connection pooling optimization (DatabaseUtil)

  Phase 2 - Production Preparation:
    - Production-grade PostgreSQL configuration
    - High availability setup (streaming replication)
    - Backup and recovery validation

  Phase 3 - Production Deployment:
    - Production database provisioning
    - Data migration from existing systems
    - Performance monitoring and optimization

  Phase 4 - Enterprise Integration:
    - Enterprise backup integration
    - Monitoring system integration
    - Security and compliance validation
```

### 11.2 PostgreSQL Technology Evolution

| Technology Area            | Current State   | Target State              | Timeline |
| -------------------------- | --------------- | ------------------------- | -------- |
| **High Availability**      | Single instance | Streaming replication     | Sprint 8 |
| **Backup Strategy**        | Basic pg_dump   | WAL-E + enterprise backup | Sprint 9 |
| **Performance Monitoring** | Basic logging   | Advanced monitoring tools | Sprint 8 |
| **Security Features**      | Basic security  | Advanced security (RLS)   | Sprint 7 |
| **Connection Management**  | Basic pooling   | Advanced pooling          | Sprint 8 |

## Appendices

### A. Technology Component Compatibility Matrix

Matrix showing version compatibility between all components.

### B. PostgreSQL Configuration Guide

Detailed PostgreSQL configuration and optimization guide.

### C. References

- TOGAF 9.2 Technology Architecture Guidelines
- ArchiMate 3.1 Specification
- PostgreSQL 14 Administration Guide
- Atlassian Confluence Administration Guide
- **UMIG Data Dictionary (v1.0)** - Complete technical data specifications and governance framework
- **UMIG Security Architecture (v2.2)** - Sprint 8 enhanced security with technology integration patterns

**Architecture Decision Records (ADRs)**:

- ADR-042: Authentication Context Management (4-level fallback)
- ADR-043: Type Safety Enforcement (explicit casting)
- **ADR-067**: Session Security Enhancement - Multi-session detection with device fingerprinting
- **ADR-068**: SecurityUtils Enhancement - Adaptive rate limiting with Redis coordination
- **ADR-069**: Component Security Boundary Enforcement - Namespace isolation and state protection
- **ADR-070**: Component Lifecycle Security - Comprehensive audit framework with multi-standard compliance
- ADR-046: DoS Protection via ImportQueue Configuration
- ADR-048: URL Security & Sanitization
- ADR-039: Secure Error Handling

**User Stories**:

- US-038: Security Assessment & Improvements
- US-074: API-Level RBAC Implementation
- US-082: Advanced Security Controls

### D. Revision History

| Version | Date       | Author            | Description                                                            |
| ------- | ---------- | ----------------- | ---------------------------------------------------------------------- |
| 1.3     | 2025-09-09 | Architecture Team | PostgreSQL standardization, 4-role RBAC, security assessment alignment |
| 1.2     | 2025-08-28 | Architecture Team | Revised for production reality (no containers in prod, Oracle target)  |
| 1.0     | 2025-08-28 | Architecture Team | Initial technology architecture                                        |

---

_This document is part of the UMIG Enterprise Architecture and should be reviewed in conjunction with Business, Data, and Application Architecture documents._
