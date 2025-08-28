# UMIG Implementation Patterns

**Version:** 2025-08-27  
**Part of:** [UMIG Solution Architecture](./solution-architecture.md)  
**Navigation:** [Architecture Foundation](./architecture-foundation.md) | [API & Data](./api-data-architecture.md) | [Development & Operations](./development-operations.md) | [Specialized Features](./specialized-features.md)

## Overview

This document defines the essential implementation patterns, type safety standards, error handling frameworks, and service layer architectures that ensure consistent, maintainable, and production-ready code across the UMIG system. It serves as the definitive guide for developers implementing new features and maintaining existing functionality.

---

## 1. Type Safety & Filtering Patterns

### 1.1. Type Safety Enforcement (ADR-031)

The UMIG system enforces strict type safety through explicit casting patterns that prevent runtime errors and ensure compatibility with Groovy 3.0.15 static type checking.

#### 1.1.1. Mandatory Casting Patterns

**Core Principle**: All query parameters must be explicitly cast to their expected types.

```groovy
// MANDATORY explicit casting patterns
params.migrationId = UUID.fromString(filters.migrationId as String)
params.teamId = Integer.parseInt(filters.teamId as String)
params.pageNumber = Integer.parseInt(page as String)
params.isActive = Boolean.parseBoolean(activeFlag as String)
```

**Type Validation with Error Handling**:

```groovy
// UUID Parameter Validation
try {
    migrationId = UUID.fromString(pathParts[0])
} catch (IllegalArgumentException e) {
    return Response.status(Response.Status.BAD_REQUEST)
        .entity(new JsonBuilder([error: "Invalid migration UUID"]).toString())
        .build()
}
```

**Critical Bug Fix Examples**:

```groovy
// CRITICAL BUG FIX: Integer to String casting for mig_type parameter
def migType = params.mig_type as String  // Fixed from Integer casting

// Pagination with validation
int pageNumber = 1
if (page) {
    try {
        pageNumber = Integer.parseInt(page as String)
        if (pageNumber < 1) pageNumber = 1
    } catch (NumberFormatException e) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid page number format"]).toString())
            .build()
    }
}
```

#### 1.1.2. Database Type Safety

**Repository Pattern Type Constraints**:

```groovy
// Backend type fixes
params.userId = Integer.parseInt(userIdString as String)  // Explicit casting
params.stepId = UUID.fromString(stepIdString as String)   // UUID handling

// Query parameter type safety
def migType = params.mig_type as String  // String type enforcement
def statusValues = params.status?.split(',')?.collect { it.trim() as String }
```

### 1.2. Hierarchical Filtering Implementation

#### 1.2.1. Instance-Based Filtering Pattern

**Core Principle**: Use instance IDs (pli_id, sqi_id, phi_id), NOT master IDs for hierarchical filtering.

```groovy
// CORRECT: Instance-based filtering
def queryBuilder = new StringBuilder()
queryBuilder.append("SELECT DISTINCT * FROM steps_stp s ")
queryBuilder.append("INNER JOIN phase_instances_phi phi ON s.phi_id = phi.phi_id ")

if (pliId) {
    queryBuilder.append("AND phi.pli_id = :pliId ")
    params.pliId = UUID.fromString(pliId as String)
}
```

#### 1.2.2. Comprehensive Filter Support

**Advanced Filtering Implementation**:

```groovy
// Multi-dimensional filtering with type safety
private void buildFilterClauses(StringBuilder query, Map<String, Object> params, Map filters) {
    // Search filtering
    if (filters.search) {
        query.append(" AND (LOWER(m.mig_name) LIKE LOWER(:search) OR LOWER(m.mig_description) LIKE LOWER(:search))")
        params.search = "%${filters.search as String}%"
    }

    // Status filtering with multi-value support
    if (filters.status) {
        def statusValues = (filters.status as String).split(',').collect { it.trim() }
        query.append(" AND m.mig_status IN (:statusValues)")
        params.statusValues = statusValues
    }

    // Date range filtering
    if (filters.fromDate) {
        query.append(" AND m.mig_planned_start >= :fromDate")
        params.fromDate = Date.parse('yyyy-MM-dd', filters.fromDate as String)
    }
}
```

### 1.3. Admin GUI Compatibility Patterns

#### 1.3.1. Parameterless Call Handling

**Pattern**: Handle Admin GUI integration requirements for entity management.

```groovy
// Handle parameterless calls for Admin GUI integration
if (stepId) {
    return handleInstructionsByStepId(stepId)
} else if (stepInstanceId) {
    return handleInstructionsByStepInstanceId(stepInstanceId)
} else {
    // For Admin GUI - return empty array when no filters provided
    return Response.ok(new JsonBuilder([]).toString()).build()
}
```

#### 1.3.2. Full Attribute Instantiation Pattern

**Core Requirement**: Include ALL fields in SELECT that are referenced in result mapping.

```groovy
// COMPLETE attribute selection for Admin GUI
def query = """
    SELECT s.stp_id, s.stp_code, s.stp_name, s.stp_description,
           s.stp_type, s.stp_status, s.stp_created_date, s.stp_updated_date,
           s.stp_order, s.phi_id, s.tmt_id, s.app_id,
           phi.phi_code, phi.phi_name,
           tmt.tmt_code, tmt.tmt_name,
           app.app_code, app.app_name
    FROM steps_stp s
    LEFT JOIN phase_instances_phi phi ON s.phi_id = phi.phi_id
    LEFT JOIN teams_tmt tmt ON s.tmt_id = tmt.tmt_id
    LEFT JOIN applications_app app ON s.app_id = app.app_id
"""
```

---

## 2. Enhanced Error Handling Framework (ADR-039)

### 2.1. Standardized Error Response Structure

#### 2.1.1. Core Error Object Format

**Comprehensive Error Response**:

```json
{
  "error": "Brief error description",
  "status": 400,
  "endpoint": "API endpoint that failed",
  "details": {
    "message": "Detailed explanation",
    "provided": "What the user provided",
    "expected": "What was expected",
    "reason": "Why it failed",
    "suggestions": ["Actionable recommendations"],
    "documentation": "Link to relevant docs"
  }
}
```

#### 2.1.2. Enhanced Error Builder Pattern

```groovy
class EnhancedErrorBuilder {
    static EnhancedErrorBuilder create(String error, Integer status)
    EnhancedErrorBuilder endpoint(String endpoint)
    EnhancedErrorBuilder message(String message)
    EnhancedErrorBuilder provided(Object provided)
    EnhancedErrorBuilder expected(Object expected)
    EnhancedErrorBuilder reason(String reason)
    EnhancedErrorBuilder suggestions(List<String> suggestions)
    EnhancedErrorBuilder documentation(String documentation)
    Map<String, Object> build()
}
```

### 2.2. SQL Exception Mapping Framework

#### 2.2.1. Database Error Translation

**Comprehensive SQL State Mapping**:

```groovy
private Response.Status mapSqlExceptionToHttpStatus(SQLException e) {
    def sqlState = e.getSQLState()
    switch (sqlState) {
        case '23503': return Response.Status.CONFLICT      // FK violation
        case '23505': return Response.Status.CONFLICT      // Unique constraint
        case '23502': return Response.Status.BAD_REQUEST   // Not null
        case '42P01': return Response.Status.INTERNAL_SERVER_ERROR  // Table doesn't exist
        case '42703': return Response.Status.INTERNAL_SERVER_ERROR  // Column doesn't exist
        default: return Response.Status.INTERNAL_SERVER_ERROR
    }
}
```

#### 2.2.2. Context-Aware Error Messages

**Before (Generic)**:

```json
{ "error": "Invalid request", "status": 400 }
```

**After (Enhanced)**:

```json
{
  "error": "Invalid step type parameter",
  "status": 400,
  "endpoint": "POST /steps",
  "details": {
    "message": "The provided step_type value is not supported",
    "provided": "CUSTOM_TYPE",
    "expected": "One of: MANUAL, AUTOMATED, VERIFICATION, APPROVAL",
    "reason": "Step type must be from predefined enumeration",
    "suggestions": [
      "Use GET /steps/types to see all valid options",
      "Check spelling and capitalization",
      "Refer to API documentation for step type descriptions"
    ],
    "documentation": "/docs/api/steps-creation.md#step-types"
  }
}
```

### 2.3. Error Context Analysis Framework

```groovy
class ErrorContextService {
    static Map<String, Object> analyzeFailureContext(
        Exception exception,
        String endpoint,
        Map<String, Object> requestParams
    ) {
        // Context analysis logic
    }
}
```

### 2.4. Developer Experience Standards

#### 2.4.1. Error Message Quality Checklist

- **Specific**: Clearly states what went wrong
- **Contextual**: Explains why it failed given the input
- **Actionable**: Provides concrete steps to resolve
- **Educational**: Helps user understand the system better
- **Professional**: Maintains appropriate tone and language
- **Consistent**: Follows standardized format

---

## 3. Service Layer Standards (ADR-049)

### 3.1. Unified DTO Architecture

#### 3.1.1. StepDataTransferObject Pattern

**Comprehensive Data Transfer Object (516 lines)**:

```groovy
class StepDataTransferObject {
    // Core Properties
    String stepId
    String stepCode
    String stepName
    String stepDescription
    String stepType
    String stepStatus

    // Hierarchical Context
    String migrationCode
    String iterationCode
    String phaseCode

    // Relationships
    String teamCode
    String applicationCode
    List<Map<String, Object>> recentComments

    // Metadata
    Date createdDate
    Date updatedDate
    Integer orderIndex

    // Builder Pattern
    static Builder builder() { return new Builder() }

    // JSON Schema Validation
    Map<String, Object> validate() {
        // Validation logic with type constraints
    }

    // Null Safety
    String getStepName() {
        return stepName ?: "Unnamed Step"
    }
}
```

#### 3.1.2. Transformation Service Architecture

**StepDataTransformationService (580 lines)**:

```groovy
@Component
class StepDataTransformationService {

    // Database → DTO transformation
    StepDataTransferObject transformFromDatabaseRow(Map<String, Object> row) {
        return StepDataTransferObject.builder()
            .stepId(row.stp_id as String)
            .stepCode(row.stp_code as String)
            .stepName(row.stp_name as String)
            // ... comprehensive mapping with type safety
            .build()
    }

    // DTO → Template transformation
    Map<String, Object> transformForTemplate(StepDataTransferObject dto) {
        return [
            stepId: dto.stepId,
            stepName: dto.stepName,
            recentComments: dto.recentComments,
            // ... template-specific formatting
        ]
    }

    // Batch processing optimization
    List<StepDataTransferObject> transformBatch(List<Map<String, Object>> rows) {
        return rows.parallelStream()
            .map { row -> transformFromDatabaseRow(row) }
            .collect(Collectors.toList())
    }
}
```

### 3.2. Repository Pattern Integration

#### 3.2.1. Enhanced Repository Methods

**Type-Safe Repository Implementation**:

```groovy
class StepRepository {

    // DTO-based methods
    StepDataTransferObject getStepAsDto(UUID stepId) {
        return DatabaseUtil.withSql { sql ->
            def row = sql.firstRow(STEP_QUERY, [stepId: stepId])
            return transformationService.transformFromDatabaseRow(row)
        }
    }

    // Backward compatibility methods
    Map<String, Object> getStep(UUID stepId) {
        // Legacy Map-based implementation
    }

    // Batch processing with DTOs
    List<StepDataTransferObject> getStepsAsDtos(List<UUID> stepIds) {
        return DatabaseUtil.withSql { sql ->
            def rows = sql.rows(BATCH_STEP_QUERY, [stepIds: stepIds])
            return transformationService.transformBatch(rows)
        }
    }
}
```

### 3.3. Migration Strategy - Strangler Fig Pattern

#### 3.3.1. Parallel Code Paths

```groovy
// Service method supporting both patterns
class StepService {

    def getStepData(UUID stepId, boolean useDto = false) {
        if (useDto) {
            return stepRepository.getStepAsDto(stepId)
        } else {
            return stepRepository.getStep(stepId)  // Legacy
        }
    }

    // Gradual migration approach
    def processStepForEmail(UUID stepId) {
        def stepDto = stepRepository.getStepAsDto(stepId)  // New DTO approach
        return transformationService.transformForTemplate(stepDto)
    }
}
```

#### 3.3.2. Zero-Disruption Rollout

**Migration Phases**:

1. **Parallel Implementation**: Both DTO and Map-based methods coexist
2. **Incremental Adoption**: New features use DTO, existing features remain unchanged
3. **Validation Period**: Comprehensive testing ensures parity between approaches
4. **Legacy Retirement**: Gradual removal of Map-based methods after validation

---

## 4. Database Quality Validation Framework (ADR-040)

### 4.1. DatabaseQualityValidator Architecture

```groovy
class DatabaseQualityValidator {
    private DatabaseUtil databaseUtil
    private PerformanceBenchmark benchmark
    private IntegrityChecker integrity
    private SchemaValidator schema

    def validateDatabaseHealth() {
        def results = [:]
        results.performance = benchmark.runPerformanceTests()
        results.integrity = integrity.validateDataIntegrity()
        results.schema = schema.validateSchemaConsistency()
        results.constraints = validateConstraints()
        return results
    }
}
```

### 4.2. Performance Benchmarking Module

**Query Performance Analysis**:

- Connection pooling effectiveness validation
- Query execution time analysis (<500ms standard)
- Index usage validation and optimization recommendations
- Concurrency testing under load
- Scalability assessment for projected growth

### 4.3. Data Integrity Validation Framework

**Comprehensive Integrity Checking**:

- Foreign key constraint violations detection
- Unique constraint violations identification
- Check constraint validation across all tables
- Business rule compliance verification
- Referential integrity comprehensive verification

### 4.4. Validation Categories

#### 4.4.1. Performance Metrics

- Query execution time (average, min, max)
- Connection pool utilization rates
- Index effectiveness scores
- Transaction throughput measurements
- Concurrent operation handling capacity

#### 4.4.2. Integrity Metrics

- Constraint violation detection rates
- Business rule compliance scoring
- Data consistency validation results
- Orphaned record identification
- Relationship integrity verification status

---

## 5. Liquibase SQL Compatibility Constraints (ADR-034)

### 5.1. SQL Parser Limitations

**Problem Context**: Liquibase's SQL parser has difficulty handling PostgreSQL's dollar-quoting mechanism (`DO $$ ... END $$`), causing "Unterminated dollar quote" errors.

### 5.2. Implementation Guidelines

#### 5.2.1. Prohibited Patterns

**❌ Avoid These Patterns**:

```sql
-- This will cause Liquibase parsing errors
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'status_sts') THEN
        RAISE EXCEPTION 'Migration prerequisite failed: status_sts table does not exist.';
    END IF;
    RAISE NOTICE 'Validation passed';
END $$;
```

#### 5.2.2. Recommended Patterns

**✅ Use These Patterns Instead**:

```sql
-- Simple validation query that Liquibase can parse
SELECT COUNT(*) AS status_count FROM status_sts;

-- Multi-table validation using UNION
SELECT 'migrations_mig' as table_name, COUNT(*) as null_count FROM migrations_mig WHERE mig_status IS NULL
UNION ALL
SELECT 'iterations_ite', COUNT(*) FROM iterations_ite WHERE ite_status IS NULL;
```

### 5.3. Alternative Approaches

**When complex logic is necessary**:

1. **Multiple Changesets**: Separate complex operations into discrete steps
2. **Stored Procedures**: Called by simple SQL if absolutely required
3. **Application Logic**: Move complex validation to service layer
4. **Error Detection**: Rely on SQL errors (FK violations, NOT NULL constraints) for validation

---

## 6. UI Implementation Patterns (US-036)

### 6.1. Direct API Integration Pattern

**Pattern Decision**: Replicate IterationView's direct API approach over complex caching architectures.

```javascript
// Direct API pattern for reliability
function refreshCommentsSection(stepId) {
  return CommentsAPI.getComments(stepId)
    .then((comments) => renderCommentsWithStyling(comments))
    .catch((error) => handleCommentErrors(error));
}
```

**Benefits**:

- **Reliability**: Eliminates complex caching layer failures
- **Consistency**: Matches proven IterationView architecture
- **Maintainability**: Simple, direct integration patterns
- **Performance**: Maintains <3s load times despite simplification

### 6.2. RBAC Security Implementation

**Pattern Decision**: Proper null handling for unknown users vs default role assignment.

```javascript
function initializeRoleBasedAccess() {
  // Correct: null for unknown users, not NORMAL default
  const userRole = getCurrentUserRole(); // null, NORMAL, PILOT, or ADMIN
  return applyRoleBasedPermissions(userRole);
}
```

**Security Benefits**:

- **Fail-Safe Design**: Unknown users receive minimal permissions
- **Role Clarity**: Explicit role detection prevents privilege escalation
- **Error Prevention**: Robust error handling prevents access control bypass

### 6.3. CSS Consistency Framework

**Pattern Decision**: Shared CSS approach via iteration-view.css for visual consistency.

```css
/* Shared stylesheet approach */
@import url("iteration-view.css");

.step-view-container {
  /* Inherits consistent styling patterns */
  background: #f8f8f8;
  border: 1px solid #ddd;
  padding: 15px;
}
```

### 6.4. Quality Validation Framework

#### 6.4.1. 40-Point Validation System

**Comprehensive UI Testing Framework**:

- **Visual Consistency**: 100% alignment verification with IterationView
- **Cross-Role Testing**: NORMAL/PILOT/ADMIN user scenario validation
- **Browser Compatibility**: Chrome, Firefox, Safari, Edge validation
- **Performance Benchmarking**: Load time and interaction responsiveness
- **Security Validation**: RBAC implementation comprehensive testing

---

## 7. URL Construction Service Architecture (ADR-048)

### 7.1. Service Architecture

**UrlConstructionService.groovy Implementation**:

```groovy
@Component
class UrlConstructionService {
    private static final int CACHE_TTL_MINUTES = 5
    private Map<String, Object> configCache = [:]

    String buildStepViewUrl(String migrationCode, String iterationCode, String stepCode) {
        def config = getCachedConfiguration()
        def baseUrl = config['stepview.confluence.base.url']
        def pageId = config['stepview.confluence.page.id']

        return "${baseUrl}/pages/viewpage.action?pageId=${pageId}" +
               "&mig=${URLEncoder.encode(migrationCode, 'UTF-8')}" +
               "&ite=${URLEncoder.encode(iterationCode, 'UTF-8')}" +
               "&stepid=${URLEncoder.encode(stepCode, 'UTF-8')}"
    }

    private Map<String, Object> getCachedConfiguration() {
        // 5-minute caching with environment detection
    }
}
```

### 7.2. Database Integration Pattern

```sql
SELECT scf.scf_key, scf.scf_value
FROM system_configuration_scf scf
INNER JOIN environments_env e ON scf.env_id = e.env_id
WHERE e.env_code = :envCode
  AND scf.scf_is_active = true
  AND scf.scf_category = 'MACRO_LOCATION'
```

### 7.3. Configuration Management

**Environment-Specific URL Configuration**:

```groovy
// Configuration keys structure
configurationKeys = [
    'stepview.confluence.base.url': 'https://confluence-dev.company.com',
    'stepview.confluence.space.key': 'UMIG',
    'stepview.confluence.page.id': '123456789',
    'stepview.confluence.page.title': 'UMIG StepView Dashboard'
]
```

---

## 8. Authentication Context Management (ADR-042)

### 8.1. Dual Authentication Context Pattern

**Problem**: Enterprise environments require separation of platform authorization from application audit logging.

**Solution**: Implement intelligent fallback mechanisms for robust user context management.

```groovy
class AuthenticationContextManager {

    UserContext resolveUserContext(HttpServletRequest request) {
        // Primary: Platform authorization
        def platformUser = extractPlatformUser(request)
        if (platformUser) {
            return createPlatformContext(platformUser)
        }

        // Fallback: Session-level caching
        def sessionUser = getSessionCachedUser(request)
        if (sessionUser) {
            return createSessionContext(sessionUser)
        }

        // Last resort: Anonymous context with minimal permissions
        return createAnonymousContext()
    }

    private UserContext createPlatformContext(PlatformUser user) {
        return UserContext.builder()
            .userId(user.id)
            .username(user.username)
            .role(mapPlatformRole(user.role))
            .permissions(calculatePermissions(user))
            .authenticationMethod(AuthMethod.PLATFORM)
            .build()
    }
}
```

### 8.2. Session-Level Caching Strategy

**Intelligent User Service Hierarchies**:

```groovy
// Multi-tier authentication fallback
def userService = new CompositeUserService([
    new ConfluenceUserService(),      // Primary
    new CachedUserService(),          // Fallback
    new AnonymousUserService()        // Last resort
])

def userContext = userService.resolveUser(request)
```

---

## 9. Performance Optimization Patterns

### 9.1. Smart Change Detection Framework

**Evolution**: From resource-intensive real-time polling to intelligent smart change detection.

**Achievement**: 97% server load reduction while maintaining real-time user experience.

```javascript
class SmartChangeDetector {
  constructor(pollInterval = 30000) {
    // 30 seconds default
    this.lastChecksum = null;
    this.pollInterval = pollInterval;
    this.subscribers = new Set();
  }

  async detectChanges(endpoint) {
    const response = await fetch(`${endpoint}?checksum=true`);
    const currentChecksum = response.headers.get("Content-Checksum");

    if (this.lastChecksum !== currentChecksum) {
      this.lastChecksum = currentChecksum;
      this.notifySubscribers();
    }
  }

  // Intelligent polling frequency adjustment
  adjustPollingFrequency(activityLevel) {
    if (activityLevel === "high") {
      this.pollInterval = 10000; // 10 seconds
    } else if (activityLevel === "low") {
      this.pollInterval = 60000; // 1 minute
    }
  }
}
```

### 9.2. Caching Strategy Implementation

**Multi-Level Caching Framework**:

```groovy
@Service
class CachingService {

    // Configuration caching (5-minute TTL)
    @Cacheable(value = "configuration", ttl = 300)
    Map<String, Object> getSystemConfiguration(String environment) {
        return configurationRepository.getActiveConfiguration(environment)
    }

    // Data transformation caching (1-minute TTL)
    @Cacheable(value = "transformations", ttl = 60)
    StepDataTransferObject getCachedStepDto(UUID stepId) {
        return transformationService.transformFromDatabase(stepId)
    }

    // Invalidation strategy
    @CacheEvict(value = "transformations", key = "#stepId")
    void invalidateStepCache(UUID stepId) {
        // Cache invalidation on data modification
    }
}
```

---

## Navigation

- **Previous:** [Specialized Features](./specialized-features.md) - Email systems, authentication, and UI enhancements
- **Back to:** [Solution Architecture Index](./solution-architecture.md) - Complete architecture navigation
- **Related:** [API & Data Architecture](./api-data-architecture.md) - REST API patterns and database design

---

_Part of UMIG Solution Architecture Documentation_
