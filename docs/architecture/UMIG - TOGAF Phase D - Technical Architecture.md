# UMIG Technology Architecture

**Version:** 1.1  
**Date:** August 28, 2025  
**Status:** Revised Draft  
**TOGAF Phase:** Phase D - Technology Architecture  
**Part of:** UMIG Enterprise Architecture

## Executive Summary

This document defines the Technology Architecture for the Unified Migration Implementation Guide (UMIG) system, encompassing infrastructure components, deployment patterns, security frameworks, and operational capabilities. The architecture leverages the existing enterprise Confluence platform with ScriptRunner plugin for production deployment, while utilizing containerization for development environments only.

## 1. Technology Architecture Vision & Principles

### 1.1 Technology Architecture Vision

Establish a resilient, secure, and scalable technology foundation that maximizes existing enterprise platform investments (Confluence) while providing isolated development environments through containerization, ensuring reliable migration execution with minimal infrastructure overhead.

### 1.2 Technology Architecture Principles

| Principle                  | Statement                              | Rationale                         | Implications                   |
| -------------------------- | -------------------------------------- | --------------------------------- | ------------------------------ |
| **Platform Maximization**  | Leverage existing enterprise platforms | Reduces infrastructure complexity | Confluence/ScriptRunner focus  |
| **Environment Isolation**  | Separate dev/test from production      | Ensures production stability      | Container-based development    |
| **Database Flexibility**   | Support multiple database platforms    | Enterprise database standards     | PostgreSQL dev, Oracle prod    |
| **Minimal Footprint**      | Deploy within existing infrastructure  | Reduces operational overhead      | No additional servers required |
| **Security Integration**   | Use platform security features         | Leverages enterprise security     | Confluence SSO/LDAP            |
| **Operational Simplicity** | Minimize operational complexity        | Reduces maintenance burden        | Platform-native deployment     |

## 2. Technology Stack Overview

### 2.1 Production Technology Stack (ArchiMate Node Components)

| Technology Service        | Technology Component  | Version | ArchiMate Element      | Purpose                           |
| ------------------------- | --------------------- | ------- | ---------------------- | --------------------------------- |
| **Application Platform**  | Atlassian Confluence  | 9.2.7+  | System Software        | Enterprise collaboration platform |
| **Execution Environment** | ScriptRunner          | 9.21.0+ | Technology Service     | Application runtime service       |
| **Database Service**      | Oracle Database       | 19c/21c | System Software        | Enterprise data persistence       |
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
| **Database**          | PostgreSQL 14            | Oracle 19c/21c        |
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
               │ Oracle Net/1521
               ▼
┌─────────────────────────────────────────┐
│  Database Network (ArchiMate Network)   │
│  ┌─────────────────────────────────┐   │
│  │ Oracle Database                  │   │
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

### 5.1 Production Database (Oracle)

```yaml
Oracle Database Configuration (ArchiMate Artifact):
  Version: 19c or 21c Enterprise Edition

  Architecture:
    Deployment: RAC (optional) or Single Instance
    High Availability: Data Guard
    Backup: RMAN with Enterprise Backup

  Configuration:
    Character Set: AL32UTF8
    Block Size: 8KB
    SGA Target: 8-16GB
    PGA Target: 4-8GB

  Schema Design:
    Owner: UMIG_OWNER
    Application User: UMIG_APP
    Read-Only User: UMIG_READ

  Performance:
    Connection Pool: 20-50 connections
    Statement Cache: 50
    Result Cache: Enabled
```

### 5.2 Development Database (PostgreSQL)

```yaml
PostgreSQL Configuration (Development Only):
  Version: 14
  Purpose: Development and testing only

  Configuration:
    max_connections: 100
    shared_buffers: 256MB
    work_mem: 4MB

  Migration Strategy:
    Tool: Liquibase
    Compatibility: Oracle SQL translation required
    Testing: Validate on Oracle before production
```

### 5.3 Database Migration Considerations

| Aspect           | PostgreSQL (Dev)     | Oracle (Prod)           | Migration Impact             |
| ---------------- | -------------------- | ----------------------- | ---------------------------- |
| **Data Types**   | SERIAL, TEXT         | NUMBER, VARCHAR2        | Schema translation required  |
| **UUID Support** | Native uuid type     | RAW(16) or VARCHAR2(36) | Type mapping needed          |
| **Sequences**    | SERIAL/IDENTITY      | SEQUENCE objects        | Explicit sequences in Oracle |
| **Functions**    | PostgreSQL functions | PL/SQL procedures       | Rewrite required             |
| **Indexes**      | B-tree default       | Multiple types          | Performance tuning needed    |

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
    - Authentication: LDAP/SSO + Additional MFA layers (ADR-042)
    - Authorization: Confluence groups + 3-tier RBAC (NORMAL/PILOT/ADMIN)
    - Session Management: Secure session handling + Timeout controls
    - Plugin Security: ScriptRunner sandbox + Security validation

  Application Security (ADR-Integrated):
    - Service: UMIG Application Security Framework
    - Input Validation: Type safety enforcement (ADR-031, 043)
    - SQL Injection Prevention: Parameterized queries + Type casting
    - URL Security: Comprehensive sanitization (ADR-048)
    - Error Handling: Secure error responses (ADR-039)
    - Data Classification: Automated sensitivity classification

  Database Security (Multi-Platform):
    - Service: Unified Database Security Model
    - Production: Oracle TDE + Advanced Security + Audit Vault
    - Development: PostgreSQL security baseline + Audit logging
    - Access Control: Role-based schema access + Connection pooling
    - Compliance: GDPR/SOX audit trail validation

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
    Tool: Oracle Enterprise Manager
    Metrics:
      - Query performance
      - Wait events
      - Resource utilization
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
    - Oracle primary database
    - Active user traffic

  DR Site:
    - Standby Confluence cluster
    - Oracle Data Guard standby
    - Passive configuration

  Recovery Targets:
    - RTO: 4 hours
    - RPO: 1 hour
    - Failover: Manual with runbook
```

### 9.2 Backup Strategy

| Component      | Environment | Method         | Frequency                  | Retention  |
| -------------- | ----------- | -------------- | -------------------------- | ---------- |
| **Confluence** | Production  | Native backup  | Daily                      | 30 days    |
| **Oracle DB**  | Production  | RMAN           | Daily full, hourly archive | 30 days    |
| **Scripts**    | All         | Git repository | On commit                  | Permanent  |
| **PostgreSQL** | Dev         | pg_dump        | Manual                     | Local only |

## 10. Capacity Planning

### 10.1 Production Capacity Requirements

```yaml
Current Production Capacity:
  Confluence Nodes:
    CPU: 8 cores per node
    Memory: 16 GB per node
    Nodes: 2-3

  Oracle Database:
    CPU: 16 cores
    Memory: 64 GB
    Storage: 2 TB

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

### 11.1 Database Migration Path

```yaml
PostgreSQL to Oracle Migration:
  Phase 1 - Analysis:
    - Schema compatibility assessment
    - Data type mapping
    - Function/procedure conversion

  Phase 2 - Translation:
    - Liquibase script conversion
    - SQL dialect translation
    - PL/SQL development

  Phase 3 - Testing:
    - Oracle development instance
    - Performance validation
    - Data migration testing

  Phase 4 - Production:
    - Production schema creation
    - Data migration execution
    - Cutover coordination
```

### 11.2 Risk Mitigation

| Risk                        | Mitigation                     | Contingency                   |
| --------------------------- | ------------------------------ | ----------------------------- |
| **SQL Incompatibility**     | Dual testing on both databases | Maintain compatibility layer  |
| **Performance Differences** | Oracle-specific optimization   | Performance tuning engagement |
| **Data Type Mismatches**    | Comprehensive mapping document | Data validation scripts       |
| **Migration Failures**      | Rollback procedures            | Parallel run capability       |

## Appendices

### A. Technology Component Compatibility Matrix

Matrix showing version compatibility between all components.

### B. Oracle Migration Checklist

Detailed checklist for PostgreSQL to Oracle migration.

### C. References

- TOGAF 9.2 Technology Architecture Guidelines
- ArchiMate 3.1 Specification
- Oracle Database Best Practices
- Atlassian Confluence Administration Guide

### D. Revision History

| Version | Date       | Author            | Description                                                           |
| ------- | ---------- | ----------------- | --------------------------------------------------------------------- |
| 1.0     | 2025-08-28 | Architecture Team | Initial technology architecture                                       |
| 1.2     | 2025-08-28 | Architecture Team | Revised for production reality (no containers in prod, Oracle target) |

---

_This document is part of the UMIG Enterprise Architecture and should be reviewed in conjunction with Business, Data, and Application Architecture documents._
