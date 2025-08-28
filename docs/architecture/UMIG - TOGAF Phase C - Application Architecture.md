# UMIG Application Architecture

**Version:** 1.0  
**Date:** August 28, 2025  
**Status:** Initial Draft  
**TOGAF Phase:** Phase C - Application Architecture  
**Part of:** UMIG Enterprise Architecture

## Executive Summary

This document defines the Application Architecture for the Unified Migration Implementation Guide (UMIG) system, encompassing application components, services, interfaces, and integration patterns. The architecture supports complex migration execution through a modular, service-oriented design that leverages Confluence platform capabilities while maintaining clear separation of concerns.

## 1. Application Architecture Vision & Principles

### 1.1 Application Architecture Vision

Deliver a cohesive, scalable application ecosystem that enables seamless migration execution through well-defined services, clear interfaces, and robust integration patterns while maximizing platform capabilities and minimizing complexity.

### 1.2 Application Architecture Principles

| Principle                     | Statement                                                      | Rationale                           | Implications                      |
| ----------------------------- | -------------------------------------------------------------- | ----------------------------------- | --------------------------------- |
| **Service Orientation**       | Applications expose capabilities through well-defined services | Enables reusability and integration | RESTful API design required       |
| **Platform Leverage**         | Maximize use of Confluence platform capabilities               | Reduces custom development          | ScriptRunner-based implementation |
| **Separation of Concerns**    | Clear boundaries between application layers                    | Improves maintainability            | N-tier architecture enforcement   |
| **Stateless Services**        | Services maintain no session state                             | Enables scalability                 | Request context in each call      |
| **Interface Standardization** | Consistent API patterns across all services                    | Reduces integration complexity      | REST conventions mandatory        |
| **Progressive Enhancement**   | UI adapts to user capabilities                                 | Improves user experience            | Role-based UI rendering           |

## 2. Application Portfolio Catalog

### 2.1 Core Applications

| Application           | Type            | Purpose                                       | Technology          | Status     |
| --------------------- | --------------- | --------------------------------------------- | ------------------- | ---------- |
| **Migration Manager** | Web Application | Strategic migration planning and oversight    | Groovy/ScriptRunner | Production |
| **Iteration Runner**  | Web Application | Execution runsheet and real-time coordination | JavaScript/AUI      | Production |
| **Step Executor**     | Web Component   | Individual step execution interface           | JavaScript/AUI      | Production |
| **Admin Console**     | Web Application | System administration and configuration       | JavaScript SPA      | Production |
| **Email Service**     | Backend Service | Notification generation and delivery          | Groovy/ScriptRunner | Production |
| **API Gateway**       | Service Layer   | REST API exposure and routing                 | ScriptRunner REST   | Production |

### 2.2 Supporting Applications

| Application            | Type    | Purpose                          | Technology        | Status      |
| ---------------------- | ------- | -------------------------------- | ----------------- | ----------- |
| **Data Generator**     | Utility | Test data creation               | Node.js           | Development |
| **Migration Importer** | Utility | Confluence JSON import           | PostgreSQL/Shell  | Production  |
| **Health Monitor**     | Utility | System health checking           | Node.js           | Production  |
| **Test Framework**     | Testing | Automated testing infrastructure | Groovy/JavaScript | Production  |

### 2.3 Application Classifications

```
Strategic Applications (Core Business):
├── Migration Manager
├── Iteration Runner
└── Step Executor

Operational Applications (Support):
├── Admin Console
├── Email Service
└── API Gateway

Utility Applications (Infrastructure):
├── Data Generator
├── Migration Importer
├── Health Monitor
└── Test Framework
```

## 3. N-Tier Architecture Model

### 3.1 Architecture Layers

```
┌─────────────────────────────────────────────────────┐
│            Presentation Layer (UI)                   │
│  - ScriptRunner Macros                              │
│  - JavaScript Controllers                           │
│  - Atlassian AUI Components                         │
├─────────────────────────────────────────────────────┤
│         Business Process Layer                       │
│  - API Endpoint Handlers                            │
│  - Workflow Orchestration                           │
│  - Business Rule Enforcement                        │
├─────────────────────────────────────────────────────┤
│      Business Objects Layer                          │
│  - Domain Model Definitions                         │
│  - Entity Classes                                   │
│  - Value Objects                                    │
├─────────────────────────────────────────────────────┤
│      Data Transformation Layer                       │
│  - DTO Mappings                                     │
│  - Repository Result Mappers                        │
│  - API Response Builders                            │
├─────────────────────────────────────────────────────┤
│         Data Access Layer (DAL)                      │
│  - Repository Classes                               │
│  - DatabaseUtil                                     │
│  - SQL Query Builders                               │
└─────────────────────────────────────────────────────┘
```

### 3.2 Layer Responsibilities

| Layer                   | Responsibilities                     | Technologies            | Constraints              |
| ----------------------- | ------------------------------------ | ----------------------- | ------------------------ |
| **Presentation**        | User interaction, visual rendering   | JavaScript, AUI, CSS    | No business logic        |
| **Business Process**    | Workflow coordination, orchestration | Groovy scripts          | Stateless operations     |
| **Business Objects**    | Domain model representation          | Groovy classes          | Immutable where possible |
| **Data Transformation** | Format conversion, mapping           | Groovy transformers     | Type safety enforced     |
| **Data Access**         | Database interaction                 | SQL, Repository pattern | Connection pooling       |

## 4. Application Services Catalog

### 4.1 Core Services

| Service                   | Type           | Operations                       | Protocol  | Consumers             |
| ------------------------- | -------------- | -------------------------------- | --------- | --------------------- |
| **Migration Service**     | Business       | CRUD migrations, status updates  | REST/JSON | UI, Admin Console     |
| **Iteration Service**     | Business       | Iteration management, scheduling | REST/JSON | UI, Migration Service |
| **Step Service**          | Business       | Step execution, status tracking  | REST/JSON | UI, Email Service     |
| **Team Service**          | Business       | Team management, assignments     | REST/JSON | UI, Admin Console     |
| **User Service**          | Business       | User authentication, roles       | REST/JSON | All applications      |
| **Notification Service**  | Infrastructure | Email generation, delivery       | REST/JSON | Step Service          |
| **Configuration Service** | Infrastructure | System settings management       | REST/JSON | All applications      |

### 4.2 Service Interfaces

#### 4.2.1 REST API Standards

```yaml
API Design Patterns:
  - Base URL: /rest/scriptrunner/latest/custom
  - Versioning: /api/v{version}/{resource}
  - Methods: GET, POST, PUT, DELETE
  - Status Codes: Standard HTTP codes
  - Error Format: Structured JSON with guidance
  - Authentication: Confluence session-based
  - Content Type: application/json
```

#### 4.2.2 Service Operation Patterns

```groovy
// Standard CRUD Operations
GET    /{resource}        // List with filtering
GET    /{resource}/{id}   // Single resource
POST   /{resource}        // Create new
PUT    /{resource}/{id}   // Full update
PATCH  /{resource}/{id}   // Partial update
DELETE /{resource}/{id}   // Remove

// Hierarchical Filtering
GET    /{resource}?migrationId={uuid}
GET    /{resource}?iterationId={uuid}
GET    /{resource}?planId={uuid}

// Pagination
GET    /{resource}?page={n}&size={n}
```

## 5. Application Components

### 5.1 Frontend Components

| Component         | Purpose                   | Technology     | Integration |
| ----------------- | ------------------------- | -------------- | ----------- |
| **IterationView** | Main execution dashboard  | JavaScript/AUI | REST API    |
| **StepView**      | Individual step interface | JavaScript/AUI | REST API    |
| **AdminGUI**      | Administration interface  | JavaScript SPA | REST API    |
| **CommentSystem** | Collaboration interface   | JavaScript     | REST API    |
| **StatusBoard**   | Real-time status display  | JavaScript     | Polling API |

### 5.2 Backend Components

| Component         | Purpose                 | Technology          | Pattern                 |
| ----------------- | ----------------------- | ------------------- | ----------------------- |
| **API Endpoints** | REST service exposure   | Groovy/ScriptRunner | CustomEndpointDelegate  |
| **Repositories**  | Data access abstraction | Groovy              | Repository pattern      |
| **Services**      | Business logic          | Groovy              | Service layer           |
| **Transformers**  | Data transformation     | Groovy              | DTO pattern             |
| **Validators**    | Input validation        | Groovy              | Chain of responsibility |

### 5.3 Component Interactions

```mermaid
graph LR
    UI[UI Components] --> API[API Gateway]
    API --> SVC[Service Layer]
    SVC --> REPO[Repositories]
    REPO --> DB[(Database)]
    SVC --> EMAIL[Email Service]
    EMAIL --> SMTP[SMTP Server]
    SVC --> CONF[Config Service]
```

## 6. Application Communication Matrix

### 6.1 Synchronous Communications

| Source        | Target                | Protocol   | Purpose            | Frequency        |
| ------------- | --------------------- | ---------- | ------------------ | ---------------- |
| IterationView | Step Service          | REST/HTTPS | Status updates     | Every 60s        |
| StepView      | Step Service          | REST/HTTPS | Step operations    | On demand        |
| AdminGUI      | All Services          | REST/HTTPS | CRUD operations    | On demand        |
| Email Service | User Service          | REST/HTTPS | Recipient lookup   | Per notification |
| All UI        | Configuration Service | REST/HTTPS | Settings retrieval | On load          |

### 6.2 Asynchronous Communications

| Source         | Target        | Mechanism         | Purpose                    | Frequency          |
| -------------- | ------------- | ----------------- | -------------------------- | ------------------ |
| Step Service   | Email Service | Database trigger  | Status change notification | Event-driven       |
| UI Components  | API Gateway   | AJAX polling      | Real-time updates          | 60-second interval |
| Health Monitor | All Services  | HTTP health check | Availability monitoring    | Every 30s          |

### 6.3 Integration Patterns

```yaml
Integration Patterns:
  Request-Response:
    - Pattern: Synchronous REST calls
    - Timeout: 30 seconds
    - Retry: 3 attempts with backoff

  Polling:
    - Pattern: Client-side AJAX polling
    - Interval: 60 seconds default
    - Smart Detection: Checksum-based changes

  Event Notification:
    - Pattern: Database triggers
    - Delivery: Email via SMTP
    - Guarantee: At-least-once delivery
```

## 7. Application-to-Data Mapping

### 7.1 Entity Ownership

| Application           | Primary Entities                | Operations                    | Access Pattern       |
| --------------------- | ------------------------------- | ----------------------------- | -------------------- |
| **Migration Manager** | migrations, iterations          | CRUD                          | Direct repository    |
| **Iteration Runner**  | plans, sequences, phases, steps | Read, Update status           | Repository + caching |
| **Step Executor**     | steps, instructions, comments   | Read, Update, Create comments | Direct repository    |
| **Admin Console**     | All entities                    | CRUD                          | Repository pattern   |
| **Email Service**     | templates, audit_log            | Read templates, Write audit   | Direct SQL           |

### 7.2 Data Access Patterns

```groovy
// Repository Pattern Implementation
class StepRepository {
    // Direct database access
    def getStep(UUID stepId) {
        DatabaseUtil.withSql { sql ->
            sql.firstRow(STEP_QUERY, [stepId: stepId])
        }
    }

    // Hierarchical access
    def getStepsByPhase(UUID phaseId) {
        DatabaseUtil.withSql { sql ->
            sql.rows(STEPS_BY_PHASE_QUERY, [phaseId: phaseId])
        }
    }
}
```

### 7.3 Data Transformation Flow

```
Database Row → Repository → DTO → Service → API Response → UI Model
     ↓           ↓           ↓        ↓           ↓            ↓
   Map        Domain      Transfer  Business    JSON      JavaScript
  Object      Object       Object    Logic     Object       Object
```

## 8. Application Integration Architecture

### 8.1 Platform Integration

| Platform             | Integration Type | Purpose                      | Technology      |
| -------------------- | ---------------- | ---------------------------- | --------------- |
| **Confluence**       | Native           | Authentication, UI rendering | ScriptRunner    |
| **JIRA**             | Optional         | Issue tracking integration   | REST API        |
| **Active Directory** | Authentication   | User synchronization         | Confluence LDAP |
| **SMTP Server**      | Notification     | Email delivery               | JavaMail API    |

### 8.2 External System Integration

```yaml
Confluence Integration:
  Authentication:
    - Method: Session-based
    - Token: X-Atlassian-Token
    - Validation: Per request

  User Management:
    - Source: Confluence user directory
    - Sync: Real-time lookup
    - Cache: 5-minute TTL

  Content Rendering:
    - Method: ScriptRunner macros
    - Location: Confluence pages
    - Assets: Versioned JS/CSS
```

### 8.3 API Gateway Pattern

```groovy
// CustomEndpointDelegate Pattern
@RestEndpoint(httpMethod = "GET", groups = ["confluence-users"])
class StepEndpoint implements CustomEndpointDelegate {

    Response doHandle(HttpServletRequest request) {
        // Authentication
        def user = authenticateUser(request)

        // Authorization
        if (!authorizeAccess(user, resource)) {
            return Response.status(403).build()
        }

        // Service invocation
        def result = stepService.getStep(stepId)

        // Response transformation
        return Response.ok(toJson(result)).build()
    }
}
```

## 9. Application Lifecycle Management

### 9.1 Development Lifecycle

| Phase           | Activities                    | Tools                 | Outputs              |
| --------------- | ----------------------------- | --------------------- | -------------------- |
| **Design**      | API specification, UI mockups | OpenAPI, Figma        | Specifications       |
| **Development** | Coding, unit testing          | IntelliJ, VS Code     | Source code          |
| **Testing**     | Integration, UAT              | Groovy test framework | Test reports         |
| **Deployment**  | Package, configure, deploy    | ScriptRunner          | Deployed application |
| **Operation**   | Monitor, maintain, support    | Health checks, logs   | Metrics, incidents   |

### 9.2 Version Management

```yaml
Versioning Strategy:
  API Versions:
    - Pattern: /api/v{major}
    - Current: v2
    - Backward Compatibility: 1 version

  UI Components:
    - Pattern: Semantic versioning
    - Assets: Versioned paths (/js/v1.2.3/)

  Database Schema:
    - Tool: Liquibase
    - Pattern: Sequential migrations
    - Rollback: Supported
```

### 9.3 Deployment Architecture

```
Development Environment:
├── Local Containers (Podman)
├── Development Database
├── Mock SMTP (MailHog)
└── Development Confluence

Testing Environment:
├── Test Confluence Instance
├── Test Database
└── Integration Test Suite

Production Environment:
├── Production Confluence
├── Production Database
├── Enterprise SMTP
└── Monitoring Systems
```

## 10. UI Component Architecture

### 10.1 Component Catalog

| Component           | Type                 | Framework        | Responsibilities            |
| ------------------- | -------------------- | ---------------- | --------------------------- |
| **IterationView**   | Full Application     | Vanilla JS + AUI | Complete runsheet interface |
| **StepView**        | Standalone Component | Vanilla JS + AUI | Single step execution       |
| **AdminGUI**        | SPA                  | Vanilla JS       | Entity management           |
| **CommentWidget**   | Reusable Component   | Vanilla JS       | Comment threading           |
| **StatusIndicator** | Micro Component      | CSS + JS         | Status visualization        |

### 10.2 UI Rendering Pattern

```javascript
// Macro-based initialization
function initializeComponent(config) {
    // 1. Load configuration
    const settings = loadConfiguration(config);

    // 2. Fetch initial data
    const data = await fetchData(settings.apiUrl);

    // 3. Render UI
    renderComponent(data);

    // 4. Start polling
    startPolling(settings.pollInterval);
}
```

### 10.3 Role-Based UI Adaptation

```javascript
// Progressive enhancement based on user role
class UIController {
  applyRoleBasedControls() {
    const role = this.userRole;

    if (role === "NORMAL") {
      this.disableEditControls();
      this.hideAdminFeatures();
    } else if (role === "PILOT") {
      this.enableEditControls();
      this.hideAdminFeatures();
    } else if (role === "ADMIN") {
      this.enableAllControls();
    }
  }
}
```

## 11. Service Architecture Patterns

### 11.1 Email Notification Architecture

```groovy
// Email Service Implementation
class EmailService {

    def sendStepStatusNotification(stepId, oldStatus, newStatus, userId) {
        // 1. Load template
        def template = templateRepository.getActive('STEP_STATUS_CHANGED')

        // 2. Gather data
        def stepData = stepService.getStepDetails(stepId)
        def recipients = teamService.getTeamEmails(stepData.teams)

        // 3. Process template
        def email = processTemplate(template, [
            step: stepData,
            oldStatus: oldStatus,
            newStatus: newStatus,
            changedBy: userService.getUser(userId)
        ])

        // 4. Send email
        smtpService.send(recipients, email)

        // 5. Audit
        auditService.logEmailSent(email, recipients)
    }
}
```

### 11.2 Service Layer Standards

```groovy
// Unified DTO Architecture
class StepDataTransferObject {
    String stepId
    String stepName
    String stepStatus
    String migrationCode
    String iterationCode
    String phaseCode
    List<Comment> recentComments

    // Validation
    boolean validate() {
        return stepId && stepName && stepStatus
    }

    // Builder pattern
    static Builder builder() {
        return new Builder()
    }
}
```

### 11.3 Repository Pattern

```groovy
// Repository implementation
class StepRepository {

    private static final String STEP_QUERY = """
        SELECT s.*, p.phi_name, t.tms_name
        FROM steps_instance_sti s
        LEFT JOIN phases_instance_phi p ON s.phi_id = p.phi_id
        LEFT JOIN teams_tms t ON s.tms_id_owner = t.tms_id
        WHERE s.sti_id = :stepId
    """

    StepDTO getStep(UUID stepId) {
        DatabaseUtil.withSql { sql ->
            def row = sql.firstRow(STEP_QUERY, [stepId: stepId])
            return transformToDTO(row)
        }
    }
}
```

## 12. Quality Attributes

### 12.1 Performance Requirements

| Component      | Metric              | Target | Current   |
| -------------- | ------------------- | ------ | --------- |
| API Response   | Latency             | <500ms | 350ms avg |
| UI Load        | Time to interactive | <3s    | 2.5s      |
| Database Query | Execution time      | <100ms | 75ms avg  |
| Email Delivery | Processing time     | <5s    | 3s        |
| Polling Update | Interval            | 60s    | 60s       |

### 12.2 Scalability Characteristics

```yaml
Scalability Metrics:
  Concurrent Users: 100
  Concurrent Migrations: 10
  Steps per Migration: 1,500
  API Requests/sec: 50
  Database Connections: 20 (pooled)
```

### 12.3 Security Architecture

| Layer                | Security Control          | Implementation     |
| -------------------- | ------------------------- | ------------------ |
| **Authentication**   | Confluence session        | Platform-native    |
| **Authorization**    | Role-based (RBAC)         | 3-tier model       |
| **Input Validation** | Type safety, sanitization | Explicit casting   |
| **SQL Injection**    | Parameterized queries     | Repository pattern |
| **XSS Prevention**   | Output encoding           | Template escaping  |
| **Audit Trail**      | All modifications logged  | Database triggers  |

## 13. Compliance & Standards

### 13.1 Architecture Compliance

| Standard          | Compliance      | Evidence                   |
| ----------------- | --------------- | -------------------------- |
| **TOGAF 9.2**     | Full compliance | This document structure    |
| **ArchiMate 3.1** | Aligned         | Layer separation model     |
| **REST Maturity** | Level 2         | HTTP verbs, resources      |
| **12-Factor App** | Partial         | Config, dependencies, logs |

### 13.2 Development Standards

```yaml
Development Standards:
  API Design:
    - OpenAPI 3.0 specification
    - REST conventions
    - JSON response format

  Code Quality:
    - Static type checking (Groovy)
    - Explicit casting patterns
    - Repository pattern

  Testing:
    - 95% code coverage
    - Integration test suite
    - UAT validation
```

## Appendices

### A. Application Inventory

Complete inventory of all application components, versions, and dependencies.

### B. Interface Specifications

Detailed API specifications in OpenAPI 3.0 format.

### C. References

- TOGAF 9.2 Application Architecture Guidelines
- ArchiMate 3.1 Application Layer Specification
- REST API Design Best Practices
- UMIG Business Architecture Document
- UMIG Data Architecture Document

### D. Revision History

| Version | Date       | Author            | Description                               |
| ------- | ---------- | ----------------- | ----------------------------------------- |
| 1.2     | 2025-08-28 | Architecture Team | Initial application architecture document |

---

_This document is part of the UMIG Enterprise Architecture and should be reviewed in conjunction with Business, Data, and Technology Architecture documents._
