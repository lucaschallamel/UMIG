# UMIG Specialized Features

**Version:** 2025-08-27  
**Part of:** [UMIG Solution Architecture](./solution-architecture.md)  
**Navigation:** [Architecture Foundation](./architecture-foundation.md) | [API & Data Architecture](./api-data-architecture.md) | [Development & Operations](./development-operations.md) | [Implementation Patterns](./implementation-patterns.md)

## Overview

This document defines specialized features and components for the UMIG project, including email notification systems, authentication patterns, UI enhancement frameworks, and advanced service architectures. These features provide enhanced functionality beyond core CRUD operations.

---

## 1. Email Notification System ([ADR-032])

### 1.1. Architecture Overview

The email notification system provides automated notifications for step status changes during migration events using Confluence's native mail API.

#### System Components

- **EmailService**: Core notification service with template processing
- **EmailTemplateRepository**: Template management with CRUD operations
- **AuditLogRepository**: Comprehensive audit logging for all email events
- **EmailTemplatesApi**: REST API for template management

#### Integration Points

- StepRepository methods trigger email notifications for status changes
- Multi-team notification (owner + impacted teams)
- MailHog integration for local development testing

### 1.2. Enhanced Email Notifications (US-039)

The UMIG application implements comprehensive email notification capabilities with mobile-first responsive design:

- **Mobile-Responsive Templates**: Table-based HTML layouts for cross-platform email client compatibility (8+ supported clients)
- **Complete Content Rendering**: Full step details, instructions, and metadata delivered directly in email format
- **Static Content Display**: Security-compliant read-only email content with NO interactive elements (dropdowns, forms, buttons)
- **Confluence Integration**: Environment-specific "View in Confluence" links using existing UrlConstructionService
- **Security Framework**: XSS prevention, input validation, and CSRF protection through secure URL generation
- **Performance Standards**: <3s email generation, <5MB email size limits, cross-client compatibility validation
- **Admin Configuration**: Email template management and monitoring through Admin GUI interface

### 1.3. Email Templates

#### Template Storage

Email templates are stored in `email_templates_emt` table with:

- HTML content with GString variable substitution
- Active/inactive status management
- Template types: STEP_OPENED, INSTRUCTION_COMPLETED, STEP_STATUS_CHANGED

#### Template Processing Pattern

```groovy
// Template variable preparation
def variables = [
    stepInstance: stepInstance,
    stepUrl: "${baseUrl}/display/SPACE/IterationView?stepId=${stepInstance.sti_id}",
    changedAt: new Date().format('yyyy-MM-dd HH:mm:ss'),
    changedBy: getUsernameById(sql, userId)
]

// Process template with SimpleTemplateEngine
def processedSubject = processTemplate(template.emt_subject, variables)
def processedBody = processTemplate(template.emt_body_html, variables)
```

### 1.4. Email Template Error Resolution & Defensive Patterns (August 27, 2025)

Critical architecture discovery during US-039 implementation revealed fundamental data structure inconsistencies requiring systematic defensive patterns:

**Root Cause Identified**:

- **Service Discrepancy**: EmailService vs EnhancedEmailService inconsistent data handling approaches
- **Type Mismatch**: Empty string (`""`) vs empty list (`[]`) conversion failures in Groovy template rendering
- **Template Engine Rigidity**: Groovy template engine requires specific data structure formats for field access

**Defensive Type Checking Pattern**:

```groovy
// MANDATORY template variable validation pattern
def safeRecentComments = binding.variables.recentComments ?: []
if (!(safeRecentComments instanceof List)) {
    safeRecentComments = []
}
// Template can now safely iterate over safeRecentComments
```

**Implementation Standards**:

- **Always validate template variable types** before field access or iteration
- **Provide graceful degradation** for missing or malformed data
- **Implement consistent data transformation** across service boundaries
- **Log template variable mismatches** for debugging and system monitoring

This pattern prevents entire classes of "No such property" runtime errors and provides foundation for US-056 systematic architecture improvement.

### 1.5. Notification Triggers

#### Step Status Changes

- **STEP_OPENED**: Notifies owner + impacted teams when PILOT opens a step
- **STEP_STATUS_CHANGED**: Notifies owner + impacted teams + cutover team for status updates
- **INSTRUCTION_COMPLETED**: Notifies owner + impacted teams when instruction is completed

#### Recipient Logic

```groovy
// Multi-team notification pattern
def allTeams = new ArrayList(teams)
if (cutoverTeam) {
    allTeams.add(cutoverTeam)
}
def recipients = extractTeamEmails(allTeams)
```

### 1.6. Audit Logging

#### Comprehensive Email Audit Trail

All email events are logged to `audit_log_aud` table:

- **EMAIL_SENT**: Successful email delivery with full details
- **EMAIL_FAILED**: Failed email attempts with error messages
- **STATUS_CHANGED**: Business event logging separate from email notifications

#### JSONB Audit Details

```groovy
def details = [
    recipients: recipients,
    subject: subject,
    template_id: templateId?.toString(),
    status: 'SENT',
    notification_type: 'STEP_STATUS_CHANGED',
    step_name: stepInstance.sti_name,
    old_status: oldStatus,
    new_status: newStatus
]
```

### 1.7. Development Testing

#### MailHog Integration

- Local SMTP server (localhost:1025) for email testing
- Web interface (localhost:8025) for email verification
- Graceful fallback when MailHog is not available

#### Testing Pattern

```groovy
// ScriptRunner Console testing
def stepRepo = new StepRepository()
def result = stepRepo.openStepInstanceWithNotification(stepId, userId)
// Check result.success and result.emailsSent
```

---

## 2. Authentication & Authorization

### 2.1. Dual Authentication Context Management (ADR-042)

The UMIG application implements a sophisticated dual authentication context management system that separates platform authorization from application audit logging:

- **Platform Authorization (Confluence)**: Handles the fundamental question "can they access?" through standard Confluence security mechanisms
- **Application Audit Logging (UMIG)**: Handles the audit question "who performed this action?" through internal user context management
- **UserService Intelligent Fallback Hierarchy**:
  - Primary: Direct UMIG User (preferred for comprehensive audit trails)
  - Secondary: System User (for system-initiated operations)
  - Tertiary: Confluence System User (platform fallback)
  - Fallback: Anonymous (error state requiring investigation)
- **Session-Level Caching**: Expensive user lookups are cached at the session level to optimize performance
- **Frontend Authentication Requirements**:
  ```javascript
  headers: {
    "X-Atlassian-Token": "no-check",  // XSRF protection
    "Content-Type": "application/json"
  },
  credentials: "same-origin"  // Include auth cookies
  ```

### 2.2. Role-Based Access Control ([ADR-033])

The system implements a comprehensive three-tier role-based access control to ensure operational safety during cutover events:

#### User Role Definitions

**NORMAL (Read-Only Users):**

- View iteration runsheets and step details
- Read comments and historical data
- No modification capabilities
- Visual read-only indicators throughout UI

**PILOT (Operational Users):**

- All NORMAL capabilities plus:
- Update step statuses
- Complete/uncomplete instructions
- Add, edit, and delete comments
- Execute step actions
- View operational controls

**ADMIN (System Administrators):**

- All PILOT capabilities plus:
- Access administrative functions
- User and system management
- Configuration capabilities
- Full system control

#### Frontend Implementation

**CSS Class-Based Control:**

```css
.pilot-only {
  /* Shown only to PILOT and ADMIN users */
}

.admin-only {
  /* Shown only to ADMIN users */
}

.role-disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}
```

**JavaScript Role Detection:**

```javascript
// User context injected via Confluence macro
window.UMIG_ITERATION_CONFIG = {
    confluence: {
        username: "user@company.com",
        fullName: "John Doe",
        email: "user@company.com"
    },
    api: {
        baseUrl: "/rest/scriptrunner/latest/custom"
    }
};

// Dynamic role application
applyRoleBasedControls() {
    const role = this.userRole;
    if (role === 'NORMAL') {
        this.hideElementsWithClass('admin-only');
        this.disableElementsWithClass('pilot-only');
        this.addReadOnlyIndicators();
    } else if (role === 'PILOT') {
        this.hideElementsWithClass('admin-only');
        this.showAndEnableElementsWithClass('pilot-only');
    } else if (role === 'ADMIN') {
        this.showAndEnableElementsWithClass('admin-only');
        this.showAndEnableElementsWithClass('pilot-only');
    }
}
```

---

## 3. UI Component Patterns & Enhancements

### 3.1. UI Component Patterns (US-036)

The UMIG application implements comprehensive UI component patterns to ensure visual consistency and optimal user experience:

- **Visual Consistency Methodology**: 40-point validation framework ensuring uniform appearance across all interface components
- **Standardized CSS Classes**:
  - `.pilot-only`: Controls visibility for PILOT role users
  - `.admin-only`: Controls visibility for ADMIN role users
  - `.metadata-item`: Consistent styling for metadata display components
- **Role-Based UI Rendering Patterns**: Dynamic interface adaptation based on user roles (NORMAL/PILOT/ADMIN)
- **Comment System Architecture**: Implements grey background styling (#f5f5f5) with consistent visual hierarchy for user feedback
- **Real-Time Synchronization**: Smart polling mechanism with 60-second intervals optimized for performance and user experience

### 3.2. StepView UI Enhancement Patterns (US-036)

#### Implementation Overview

**Status:** 80% Complete (August 2025)  
**Impact:** Critical - Comprehensive UI enhancement establishing new frontend architecture patterns  
**Scope Evolution:** Original 3 points → 8-10 points actual complexity through testing feedback integration

US-036 evolved from basic UI refactoring into comprehensive StepView enhancement, establishing new architectural patterns for feature parity, RBAC implementation, and frontend integration reliability.

#### Architectural Patterns Established

**Direct API Integration Pattern:**

Pattern Decision: Replicate IterationView's direct API approach over complex caching architectures.

```javascript
// Direct API pattern for reliability
function refreshCommentsSection(stepId) {
  return CommentsAPI.getComments(stepId)
    .then((comments) => renderCommentsWithStyling(comments))
    .catch((error) => handleCommentErrors(error));
}
```

**Benefits:**

- **Reliability**: Eliminates complex caching layer failures
- **Consistency**: Matches proven IterationView architecture
- **Maintainability**: Simple, direct integration patterns
- **Performance**: Maintains <3s load times despite simplification

**RBAC Security Pattern:**

```javascript
function initializeRoleBasedAccess() {
  // Correct: null for unknown users, not NORMAL default
  const userRole = getCurrentUserRole(); // null, NORMAL, PILOT, or ADMIN
  return applyRoleBasedPermissions(userRole);
}
```

**Security Benefits:**

- **Fail-Safe Design**: Unknown users receive minimal permissions
- **Role Clarity**: Explicit role detection prevents privilege escalation
- **Error Prevention**: Robust error handling prevents access control bypass

**CSS Consistency Pattern:**

- **Shared Stylesheet**: `iteration-view.css` provides consistent styling
- **Component Alignment**: StepView matches IterationView visual hierarchy
- **Maintenance Efficiency**: Single source of truth for UI styling

### 3.3. Custom Confirmation Dialog Pattern

The environment management system implements a custom confirmation dialog pattern to resolve UI flickering issues that occur with the native JavaScript `confirm()` function in complex modal contexts.

#### Problem Context

During environment association management, the native `confirm()` function would flicker and disappear immediately when used within modal dialogs containing real-time updates and notification systems. This made it impossible for users to confirm destructive operations like removing associations.

#### Technical Implementation

```javascript
showSimpleConfirm: function(message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const dialog = document.createElement('div');
        dialog.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 8px; max-width: 400px; text-align: center;">
                <p>${message}</p>
                <div style="margin-top: 20px;">
                    <button id="confirmOk" style="margin-right: 10px; padding: 8px 16px; background: #0052cc; color: white; border: none; border-radius: 4px; cursor: pointer;">OK</button>
                    <button id="confirmCancel" style="padding: 8px 16px; background: #f5f5f5; color: #333; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;">Cancel</button>
                </div>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Handle button clicks
        dialog.querySelector('#confirmOk').addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve(true);
        });

        dialog.querySelector('#confirmCancel').addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve(false);
        });
    });
}
```

#### Usage Pattern

```javascript
// Custom confirmation dialog usage
const confirmed = await this.showSimpleConfirm(
  "Are you sure you want to remove this association?",
);
if (confirmed) {
  // Proceed with destructive operation
  await ApiClient.environments.disassociateApplication(envId, appId);
}
```

#### Benefits

- **Eliminates UI Flickering**: Prevents visual interruptions during confirmation workflows
- **Consistent Styling**: Maintains application UI consistency across all confirmation interactions
- **Promise-Based**: Integrates seamlessly with modern async/await patterns
- **Reliable Event Handling**: Avoids timing conflicts with notification systems and modal state management
- **High Z-Index**: Ensures dialog appears above all other elements including existing modals
- **Blocking Design**: Prevents user interaction with underlying UI until confirmation is provided

### 3.4. Admin GUI Architecture (August 2025)

- **Complete Administration System**: Comprehensive interface managing **11 functional entities** (expanded from initial 6): Users, Teams, Environments, Applications, Labels, Migrations, Plans, Sequences, Phases, Steps, and Instructions
- **SPA Pattern Implementation**: Single JavaScript controller (`admin-gui.js`) managing all entities through dynamic routing and content loading
- **EntityConfig.js Central Management**: Centralized configuration system (2,150+ lines) providing standardized field definitions, validation rules, UI behavior, and renderer functions for all entity types
- **Hybrid Authentication Architecture**: Implements frontend fallback pattern with userId injection for StepView debugging scenarios ([ADR-042])
- **Current Status**: 11/14 entities functional with comprehensive CRUD operations and testing validation

#### Implementation Details

- **Entity Coverage**: SUPERADMIN (5 entities: Users, Teams, Environments, Applications, Labels), ADMIN (1 entity: Migrations), PILOT (5 entities: Plans, Sequences, Phases, Steps, Instructions)
- **Manual Registration Requirements**: 3 endpoints (phases, controls, status) require manual ScriptRunner UI setup due to authentication limitations
- **Testing Framework**: AdminGuiAllEndpointsTest.groovy provides comprehensive endpoint validation with environment-aware configuration
- **Navigation Mapping**: Dynamic entity-to-configuration mapping handles complex hierarchical relationships (e.g., 'plansinstance' → 'plans')

#### Extended Features

- **Association Management**: Modal-based interfaces for managing many-to-many relationships (e.g., environment-application, environment-iteration, application-label associations)
- **Custom Confirmation Dialogs**: Promise-based confirmation system replacing native `confirm()` to prevent UI flickering issues during destructive operations
- **Notification System**: User feedback through slide-in/slide-out notifications with automatic dismissal
- **Role-Based Access Control**: Navigation sections dynamically shown based on user roles (SUPERADMIN, ADMIN, PILOT)

### 3.5. Standalone Step View Pattern (July 2025)

- **Purpose**: Provides focused, embeddable view for individual step execution outside the main iteration runsheet
- **Architecture**: URL parameter-driven macro accepting migration name, iteration name, and step code for unique identification
- **Implementation Pattern**:
  - ScriptRunner macro (`stepViewMacro.groovy`) accepts three parameters: `?mig=xxx&ite=xxx&stepid=XXX-nnn`
  - Dedicated API endpoint (`/stepViewApi/instance`) filters by migration and iteration names plus step code
  - Comprehensive JavaScript controller (`step-view.js`) replicating all iteration view step functionality
- **Features**: Role-based controls, instruction tracking, comment management, status updates, email notifications
- **Use Cases**: Confluence page embedding, direct step linking, focused task execution

#### Implementation Details

- **Unique Identification**: Three-parameter approach (`migrationName`, `iterationName`, `stepCode`) ensures step uniqueness across multiple migrations and iterations
- **API Integration**: Custom endpoint validates parameters and queries step instances using hierarchical filtering
- **UI Consistency**: Reuses all iteration view components and styling for consistent user experience
- **Role-Based Security**: Inherits same access control patterns as main iteration interface

---

## 4. Service Architecture & Advanced Patterns

### 4.1. URL Construction Service Architecture ([ADR-048])

#### Context

UMIG requires robust URL construction system for generating clickable links in email notifications, navigation components, and deep-linking functionality. Critical system-wide URL construction failures occurred due to database schema mismatches, inconsistent environment configuration handling, and type safety violations.

#### Problem Context

System-wide URL construction failures manifested as:

- Database schema mismatches preventing configuration retrieval
- Inconsistent environment-specific configuration handling
- Type safety violations in Groovy 3.0.15 static type checking
- Security vulnerabilities in URL parameter handling
- Missing validation and sanitization for complex parameter values

#### Solution Architecture

**Decision**: Implement **Key-Value Configuration Pattern with JOIN** approach because it aligns with existing database schema, provides maximum flexibility for environment-specific configuration, and maintains consistency with overall system architecture.

**Core Components:**

**1. UrlConstructionService.groovy**

- Centralized URL construction with environment auto-detection
- Configuration caching (5-minute TTL) for performance optimization
- Comprehensive parameter validation and sanitization
- Type-safe implementation with explicit casting

**2. Database Integration Pattern**

```sql
SELECT scf.scf_key, scf.scf_value
FROM system_configuration_scf scf
INNER JOIN environments_env e ON scf.env_id = e.env_id
WHERE e.env_code = :envCode
  AND scf.scf_is_active = true
  AND scf.scf_category = 'MACRO_LOCATION'
```

**3. Configuration Keys Structure**

- `stepview.confluence.base.url` - Base Confluence URL per environment
- `stepview.confluence.space.key` - Confluence space identifier
- `stepview.confluence.page.id` - Target page ID for StepView macro
- `stepview.confluence.page.title` - Human-readable page title

**4. URL Format Pattern**

```
{baseURL}/pages/viewpage.action?pageId={pageId}&mig={migrationCode}&ite={iterationCode}&stepid={stepCode}
```

**Implementation Benefits:**

- **System Reliability**: 100% URL construction success rate, eliminating navigation failures
- **Environment Flexibility**: Supports multiple deployment environments with specific configurations
- **Performance Optimization**: 5-minute configuration caching with automatic refresh
- **Type Safety**: Explicit casting patterns preventing runtime failures
- **Security Enhancement**: Parameter validation and sanitization preventing injection attacks

### 4.2. Service Layer Standardization Architecture (US-056)

#### JSON-Based Step Data Architecture Epic

**Strategic Architecture Decision**: Comprehensive solution addressing data structure inconsistencies discovered during US-039 debugging.

#### Phase A Complete (August 27, 2025) ✅

**Core Components:**

**1. StepDataTransferObject Architecture** - 516-line unified DTO with 30+ standardized properties, JSON schema validation, and comprehensive type safety implemented and validated

**2. StepDataTransformationService Implementation** - 580-line central transformation service with database→DTO→template pipeline, batch processing optimization, and legacy entity migration support

**3. Enhanced Repository Integration Pattern** - 335+ lines of DTO integration methods maintaining backward compatibility while enabling parallel code paths for gradual migration

**4. Comprehensive Integration Testing Framework** - 1,566+ lines across 3 specialized test classes with 95%+ coverage ensuring architecture changes don't break existing functionality

#### Implementation Architecture

**Core Components:**

**1. StepDataTransferObject (516 lines)**

- 30+ standardized properties with comprehensive type safety
- JSON schema validation framework with type constraints
- Builder pattern for fluent API construction
- Defensive programming with null safety throughout

**2. StepDataTransformationService (580 lines)**

- Database → DTO transformation pipeline
- DTO → Template/API transformation logic
- Legacy entity migration support
- Batch processing optimization with caching

**3. Enhanced StepRepository (335+ lines)**

- DTO integration methods maintaining backward compatibility
- Type-safe query methods returning DTOs instead of generic Maps
- Performance-optimized queries for DTO construction
- Standardized error handling across all DTO operations

#### Migration Strategy - Strangler Fig Pattern

**Parallel Code Paths**: Preserve existing functionality during migration

**Gradual Migration**: From Map-based to DTO-based operations

**Zero-Disruption Rollout**: Supporting production stability

### 4.3. Infrastructure Modernization Service Patterns (August 2025)

#### Cross-Platform Development Infrastructure

- **Complete Shell Script Elimination**: 100% elimination in favor of JavaScript/Node.js implementations ensuring Windows/macOS/Linux development environment parity with enhanced error handling and debugging capabilities
- **Feature-Based Test Infrastructure Architecture**: Specialized test runner organization (13 test runners) with comprehensive validation, enhanced error reporting, and modular design patterns for improved maintainability and test execution speed
- **Service Layer Foundation Patterns**: TemplateRetrievalService.js and enhanced email utilities establish clean service layer patterns as foundation for US-056 systematic architecture improvement, enabling consistent data transformation and cross-service integration
- **Strategic Documentation Optimization**: Archive obsolete documentation (28,087 lines) while preserving historical knowledge, reducing cognitive overhead while maintaining complete project history accessibility through organized archive structure

---

## 5. Quality Assurance & Testing Patterns

### 5.1. Quality Assurance Framework

#### 40-Point Validation System

**Framework Established**: Comprehensive validation checklist for UI component testing.

**Validation Categories:**

- **Visual Consistency**: 100% alignment verification with IterationView
- **Cross-Role Testing**: NORMAL/PILOT/ADMIN user scenario validation
- **Browser Compatibility**: Chrome, Firefox, Safari, Edge validation
- **Performance Benchmarking**: Load time and interaction responsiveness
- **Security Validation**: RBAC implementation comprehensive testing

**Quality Results:**

- **40/40 Validation Points**: 100% success rate achieved
- **95% Test Coverage**: Maintained throughout scope expansion
- **Zero Critical Defects**: Quality excellence sustained

#### Cross-Platform Testing Matrix

**Testing Architecture**: Multi-dimensional validation ensuring consistent experience.

**Matrix Dimensions:**

- **User Roles**: NORMAL, PILOT, ADMIN access patterns
- **Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Devices**: Desktop, tablet, mobile responsiveness
- **Operations**: All CRUD operations across user types

### 5.2. Performance Standards

**Performance Benchmarks:**

- **Email Generation**: <3s processing time
- **Email Size Limits**: <5MB per email
- **UI Load Time**: <3s for complete StepView loading
- **API Response Time**: <500ms for standard operations
- **Cross-client Compatibility**: 8+ email client validation

**Quality Gates:**

- **Test Coverage**: ≥95% for specialized features
- **Cross-Role Validation**: 100% success across user roles
- **Browser Compatibility**: 100% across supported browsers
- **Security Validation**: Zero critical vulnerabilities
- **Performance Regression**: 0% tolerance for critical operations

---

## 6. Reference Documentation

### 6.1. Consolidated ADR References

This Specialized Features documentation consolidates the following architectural decisions:

### Communication & Notifications

- [ADR-032](../adr/archive/ADR-032-email-notification-architecture.md) - Email Notification Architecture

### Security & Access Control

- [ADR-033](../adr/archive/ADR-033-role-based-access-control-implementation.md) - Role-Based Access Control Implementation
- [ADR-042](../adr/ADR-042-dual-authentication-context-management.md) - Dual Authentication Context Management

### UI Patterns & Components

- [ADR-020](../adr/archive/ADR-020-spa-rest-admin-entity-management.md) - SPA+REST Admin Entity Management

### Service Architecture

- [ADR-048](../adr/ADR-048-url-construction-service-architecture.md) - URL Construction Service Architecture
- [ADR-049](../adr/ADR-049-service-layer-standardization-architecture.md) - Service Layer Standardization Architecture

### US-056 JSON-Based Step Data Architecture

- [ADR-055] - StepDataTransferObject Architecture
- [ADR-056] - StepDataTransformationService Implementation
- [ADR-057] - Enhanced Repository Integration Pattern
- [ADR-058] - Comprehensive Integration Testing Framework

### Infrastructure Modernization

- [ADR-051] - Cross-Platform Development Infrastructure
- [ADR-052] - Feature-Based Test Infrastructure Architecture
- [ADR-053] - Service Layer Foundation Patterns
- [ADR-054] - Strategic Documentation Optimization

---

## Navigation

- **Previous:** [Development & Operations](./development-operations.md) - DevOps, testing, and operational patterns
- **Next:** [Implementation Patterns](./implementation-patterns.md) - Type safety, filtering, and coding patterns
- **Related:** [API & Data Architecture](./api-data-architecture.md) - REST API design and database patterns
- **See Also:** [Main Architecture Index](./solution-architecture.md) - Complete architecture navigation

---

_Part of UMIG Solution Architecture Documentation_
