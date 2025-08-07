# Step View API Specification

**Version:** 2.0.0  
**API Version:** v2  
**Last Updated:** August 7, 2025

## Overview

The Step View API is a specialized endpoint designed specifically for the standalone Step View Confluence macro. This API enables displaying individual step instances outside of the main iteration runsheet interface, allowing teams to embed specific steps directly in Confluence pages for focused visibility and communication.

Unlike the primary Steps API which focuses on comprehensive runsheet management, the Step View API uses a unique three-parameter identification system that matches natural team terminology - migration name, iteration name, and step code - rather than internal UUIDs.

## Architecture Overview

The Step View API follows UMIG's established patterns while serving a specialized use case:

- **Repository Pattern**: Leverages existing `StepRepository` for data access
- **Type Safety**: Explicit casting for all query parameters (ADR-031)
- **Natural Identification**: Uses business-friendly identifiers instead of technical UUIDs
- **Macro Integration**: Optimized for Confluence macro parameter collection
- **Error Handling**: Comprehensive validation for user-friendly parameter inputs

### Entity Relationships

```
Migration (by name) → Iteration (by name) → Plan Instance → Sequence Instance → Phase Instance → Step Instance
                                                                                                    ↑
Step Master (by code: XXX-nnn) ──────────────────────────────────────────────────────────────────┘
                     ↑
Instruction Master → Instruction Instance (attached to Step Instance)
```

## Authentication & Authorization

All endpoints require Confluence authentication with group membership:

```groovy
groups: ["confluence-users", "confluence-administrators"]
```

**Required Headers:**

- `Authorization`: Confluence session or basic auth
- `Content-Type`: Not required for GET requests

## Base URL Structure

The endpoint is relative to the ScriptRunner custom REST base:

```
{confluence-base-url}/rest/scriptrunner/latest/custom/stepViewApi
```

## API Endpoints

### GET /stepViewApi/instance - Get Step Instance for Macro Display

Retrieves a complete step instance using natural business identifiers for embedded display in Confluence pages.

**Endpoint Path:**

```
GET /stepViewApi/instance
```

**Query Parameters (All Required):**

- `migrationName` (string): The exact name of the migration
- `iterationName` (string): The exact name of the iteration within the migration
- `stepCode` (string): The step code in format XXX-nnn (e.g., "ENV-001", "DB-005")

### Parameter Format Requirements

#### migrationName

- **Type**: String
- **Format**: Exact migration name as stored in the system
- **Example**: `"Q3 2025 Migration"`, `"Emergency Hotfix Migration"`

#### iterationName

- **Type**: String
- **Format**: Exact iteration name within the specified migration
- **Example**: `"Iteration 1"`, `"Production Cutover"`, `"Rollback Test"`

#### stepCode

- **Type**: String
- **Format**: Follows pattern `XXX-nnn` where:
  - `XXX` = Step type code (3+ characters)
  - `-` = Separator (required)
  - `nnn` = Step number (integer)
- **Examples**: `"ENV-001"`, `"DB-027"`, `"APP-105"`
- **Validation**: Must contain at least one hyphen separator

## Example Requests and Responses

### Successful Request

**Request:**

```bash
GET /stepViewApi/instance?migrationName=Q3%202025%20Migration&iterationName=Production%20Cutover&stepCode=ENV-001
```

**Response (200 OK):**

```json
{
  "id": "step-inst-001",
  "code": "ENV-001",
  "name": "Verify database connectivity",
  "description": "Ensure database is accessible and responding to connection tests",
  "status": "IN_PROGRESS",
  "durationMinutes": 30,
  "estimatedStartTime": "2025-08-07T09:00:00Z",
  "estimatedEndTime": "2025-08-07T09:30:00Z",
  "actualStartTime": "2025-08-07T09:05:00Z",
  "actualEndTime": null,
  "ownerTeamId": 15,
  "ownerTeamName": "Database Team",
  "migrationName": "Q3 2025 Migration",
  "iterationName": "Production Cutover",
  "planName": "Database Migration Plan",
  "sequenceId": "seq-inst-001",
  "sequenceName": "Pre-Migration Sequence",
  "sequenceNumber": 1,
  "phaseId": "phase-inst-001",
  "phaseName": "Environment Preparation",
  "phaseNumber": 1,
  "predecessorStepCode": "NET-004",
  "predecessorStepName": "Network connectivity verification",
  "environmentRoleName": "Production Database",
  "environmentName": "PROD-DB-01",
  "instructions": [
    {
      "id": "inst-inst-001",
      "name": "Test connection string",
      "content": "Run: telnet db-server 1521\nExpected: Connected to db-server",
      "order": 1,
      "isCompleted": true,
      "createdAt": "2025-07-15T08:00:00Z",
      "updatedAt": "2025-08-07T09:10:00Z"
    },
    {
      "id": "inst-inst-002",
      "name": "Verify database response",
      "content": "Execute: SELECT 1 FROM DUAL\nExpected: Returns 1",
      "order": 2,
      "isCompleted": false,
      "createdAt": "2025-07-15T08:00:00Z",
      "updatedAt": "2025-07-15T08:00:00Z"
    }
  ],
  "labels": [
    {
      "id": "label-001",
      "name": "Critical",
      "color": "#ff0000"
    },
    {
      "id": "label-002",
      "name": "Database",
      "color": "#0066cc"
    }
  ],
  "createdAt": "2025-07-15T08:00:00Z",
  "updatedAt": "2025-08-07T09:05:00Z"
}
```

## Error Handling

### HTTP Status Codes

- **200 OK**: Step instance found and returned successfully
- **400 Bad Request**: Missing required parameters or invalid step code format
- **404 Not Found**: Step instance not found with provided identifiers
- **500 Internal Server Error**: Unexpected server error during processing

### Error Response Format

All errors return JSON with descriptive messages:

```json
{
  "error": "Descriptive error message"
}
```

### Common Error Scenarios

#### 1. Missing Required Parameters (400)

**Request:**

```bash
GET /stepViewApi/instance?migrationName=Q3%202025%20Migration&stepCode=ENV-001
# Missing iterationName parameter
```

**Response:**

```json
{
  "error": "Missing required parameters. Expected: migrationName, iterationName, stepCode"
}
```

#### 2. Invalid Step Code Format (400)

**Request:**

```bash
GET /stepViewApi/instance?migrationName=Q3%202025%20Migration&iterationName=Production%20Cutover&stepCode=ENV001
# Missing hyphen separator
```

**Response:**

```json
{
  "error": "Invalid 'stepCode' parameter. Expected format: XXX-nnn"
}
```

#### 3. Step Instance Not Found (404)

**Request:**

```bash
GET /stepViewApi/instance?migrationName=Nonexistent%20Migration&iterationName=Test&stepCode=ENV-001
```

**Response:**

```json
{
  "error": "No step instance found for step code: ENV-001 in migration: Nonexistent Migration, iteration: Test"
}
```

#### 4. Step Details Load Failure (500)

**Response:**

```json
{
  "error": "Failed to load step details"
}
```

#### 5. General Processing Error (500)

**Response:**

```json
{
  "error": "Could not load step view: Database connection timeout"
}
```

## Integration with Step View Macro

The Step View API is specifically designed for the Confluence Step View macro integration.

### Macro Parameter Mapping

The macro collects three user-friendly parameters:

```velocity
## Confluence Macro Parameters
Migration Name: Q3 2025 Migration
Iteration Name: Production Cutover
Step Code: ENV-001
```

### Macro Implementation Pattern

```javascript
// Example macro JavaScript integration
class StepViewMacro {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async loadStepData(migrationName, iterationName, stepCode) {
    const params = new URLSearchParams({
      migrationName: migrationName,
      iterationName: iterationName,
      stepCode: stepCode,
    });

    try {
      const response = await fetch(
        `${this.baseUrl}/stepViewApi/instance?${params}`,
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to load step data");
      }

      return await response.json();
    } catch (error) {
      console.error("Step View API Error:", error);
      throw error;
    }
  }

  renderStepView(stepData) {
    return `
      <div class="step-view-container">
        <h3>${stepData.code}: ${stepData.name}</h3>
        <div class="step-meta">
          <span class="status status-${stepData.status.toLowerCase()}">${stepData.status}</span>
          <span class="team">${stepData.ownerTeamName}</span>
          <span class="duration">${stepData.durationMinutes} min</span>
        </div>
        <div class="step-context">
          <p><strong>Migration:</strong> ${stepData.migrationName}</p>
          <p><strong>Iteration:</strong> ${stepData.iterationName}</p>
          <p><strong>Sequence:</strong> ${stepData.sequenceName} (#${stepData.sequenceNumber})</p>
          <p><strong>Phase:</strong> ${stepData.phaseName} (#${stepData.phaseNumber})</p>
        </div>
        <div class="step-description">
          <p>${stepData.description}</p>
        </div>
        ${this.renderInstructions(stepData.instructions)}
        ${this.renderLabels(stepData.labels)}
      </div>
    `;
  }

  renderInstructions(instructions) {
    if (!instructions || instructions.length === 0) {
      return '<div class="no-instructions">No instructions available</div>';
    }

    const instructionList = instructions
      .map(
        (inst) => `
      <div class="instruction ${inst.isCompleted ? "completed" : "pending"}">
        <h4>${inst.name}</h4>
        <pre>${inst.content}</pre>
        <div class="instruction-status">
          ${inst.isCompleted ? "✅ Completed" : "⏳ Pending"}
        </div>
      </div>
    `,
      )
      .join("");

    return `
      <div class="instructions-section">
        <h4>Instructions</h4>
        ${instructionList}
      </div>
    `;
  }

  renderLabels(labels) {
    if (!labels || labels.length === 0) {
      return "";
    }

    const labelTags = labels
      .map(
        (label) => `
      <span class="label" style="background-color: ${label.color}">
        ${label.name}
      </span>
    `,
      )
      .join("");

    return `
      <div class="labels-section">
        ${labelTags}
      </div>
    `;
  }
}

// Usage in Confluence macro
const stepViewMacro = new StepViewMacro("/rest/scriptrunner/latest/custom");

// Load and render step
async function displayStep(migrationName, iterationName, stepCode) {
  try {
    const stepData = await stepViewMacro.loadStepData(
      migrationName,
      iterationName,
      stepCode,
    );
    const stepHtml = stepViewMacro.renderStepView(stepData);
    document.getElementById("step-container").innerHTML = stepHtml;
  } catch (error) {
    document.getElementById("step-container").innerHTML = `
      <div class="error-message">
        Error loading step: ${error.message}
      </div>
    `;
  }
}
```

### Macro CSS Styling

```css
.step-view-container {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 16px;
  margin: 16px 0;
  background-color: #f9f9f9;
}

.step-view-container h3 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 18px;
}

.step-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.step-meta span {
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: bold;
}

.status {
  color: white;
}

.status-pending {
  background-color: #ffc107;
}
.status-in_progress {
  background-color: #007bff;
}
.status-completed {
  background-color: #28a745;
}
.status-failed {
  background-color: #dc3545;
}
.status-blocked {
  background-color: #6c757d;
}

.team {
  background-color: #e9ecef;
  color: #495057;
}

.duration {
  background-color: #d1ecf1;
  color: #0c5460;
}

.step-context {
  background-color: #f8f9fa;
  padding: 12px;
  border-left: 4px solid #0066cc;
  margin: 12px 0;
}

.step-context p {
  margin: 4px 0;
  font-size: 14px;
}

.instructions-section {
  margin: 16px 0;
}

.instructions-section h4 {
  margin: 0 0 8px 0;
  color: #495057;
}

.instruction {
  border: 1px solid #dee2e6;
  border-radius: 4px;
  margin: 8px 0;
  padding: 12px;
  background-color: white;
}

.instruction.completed {
  border-left: 4px solid #28a745;
}

.instruction.pending {
  border-left: 4px solid #ffc107;
}

.instruction h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
}

.instruction pre {
  background-color: #f8f9fa;
  padding: 8px;
  border-radius: 3px;
  font-size: 12px;
  margin: 8px 0;
}

.instruction-status {
  font-size: 12px;
  font-weight: bold;
}

.labels-section {
  margin: 12px 0 0 0;
}

.label {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 3px;
  color: white;
  font-size: 11px;
  font-weight: bold;
  margin-right: 4px;
}

.error-message {
  padding: 12px;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
  border-radius: 4px;
}

.no-instructions {
  padding: 8px;
  font-style: italic;
  color: #6c757d;
}
```

## Parameter Validation Details

### Migration Name Validation

- **Purpose**: Identifies the migration context
- **Case Sensitivity**: Exact match required
- **Special Characters**: Supported (spaces, punctuation)
- **Examples**: `"Q3 2025 Migration"`, `"Emergency-Hotfix_v2"`

### Iteration Name Validation

- **Purpose**: Identifies iteration within migration
- **Case Sensitivity**: Exact match required
- **Scope**: Must exist within specified migration
- **Examples**: `"Production Cutover"`, `"Rollback Test #2"`

### Step Code Validation

- **Format**: `XXX-nnn` pattern enforced
- **Step Type**: XXX portion identifies step category
- **Step Number**: nnn portion identifies specific step within type
- **Validation**: Must contain hyphen, both parts required
- **Examples**: `"ENV-001"`, `"DATABASE-027"`, `"APP-105"`

## Business Logic & Query Details

### Data Resolution Process

1. **Parse Step Code**: Split stepCode on hyphen to extract type code and number
2. **Query Resolution**: Use natural identifiers to find exact step instance:
   - Migration name → Migration entity
   - Iteration name within migration → Iteration entity
   - Step type code + number → Step master template
   - Find step instance for this master within the iteration
3. **Data Enrichment**: Use `StepRepository.findStepInstanceDetailsById()` for complete details
4. **Response Assembly**: Return comprehensive step data including context and instructions

### Query Performance

The API executes a single complex query that:

- Joins across the complete hierarchy (migration → iteration → plan → sequence → phase → step)
- Includes related entity data (teams, environments, predecessors)
- Orders by creation date (DESC) and limits to 1 result for latest instance
- Uses indexed columns (migration name, iteration name, step codes) for optimal performance

### Side Effects

- **Read-Only Operation**: No data modifications
- **No Notifications**: Does not trigger any notification systems
- **Audit-Safe**: No audit trail entries created
- **Cache-Friendly**: Results suitable for caching (step instances change infrequently)

## Integration Examples

### Confluence Velocity Macro

```velocity
## Step View Macro Template
#set($migrationName = $paramMigrationName)
#set($iterationName = $paramIterationName)
#set($stepCode = $paramStepCode)

<div id="step-view-$stepCode.replace('-', '_')" class="step-view-macro">
  <script type="text/javascript">
    (function() {
      const baseUrl = '$baseurl/rest/scriptrunner/latest/custom';
      const params = new URLSearchParams({
        migrationName: '$migrationName',
        iterationName: '$iterationName',
        stepCode: '$stepCode'
      });

      fetch(baseUrl + '/stepViewApi/instance?' + params)
        .then(response => {
          if (!response.ok) {
            return response.json().then(err => {
              throw new Error(err.error || 'Failed to load step');
            });
          }
          return response.json();
        })
        .then(stepData => {
          document.getElementById('step-view-$stepCode.replace("-", "_")').innerHTML =
            renderStepView(stepData);
        })
        .catch(error => {
          document.getElementById('step-view-$stepCode.replace("-", "_")').innerHTML =
            '<div class="error">Error: ' + error.message + '</div>';
        });
    })();
  </script>

  <div class="loading">Loading step $stepCode...</div>
</div>
```

### REST Client Integration

```groovy
// Groovy REST client example
@Service
class StepViewService {

    def getStepForDisplay(String migrationName, String iterationName, String stepCode) {
        def baseUrl = "http://localhost:8090/rest/scriptrunner/latest/custom"
        def params = [
            migrationName: migrationName,
            iterationName: iterationName,
            stepCode: stepCode
        ]

        def queryString = params.collect { k, v ->
            "${URLEncoder.encode(k, 'UTF-8')}=${URLEncoder.encode(v, 'UTF-8')}"
        }.join('&')

        def url = "${baseUrl}/stepViewApi/instance?${queryString}"

        try {
            def response = new URL(url).text
            return new JsonSlurper().parseText(response)
        } catch (Exception e) {
            log.error("Failed to fetch step view data", e)
            return [error: e.message]
        }
    }
}
```

### Frontend JavaScript Integration

```javascript
class StepViewWidget {
  constructor(containerId, migrationName, iterationName, stepCode) {
    this.container = document.getElementById(containerId);
    this.migrationName = migrationName;
    this.iterationName = iterationName;
    this.stepCode = stepCode;
    this.baseUrl = "/rest/scriptrunner/latest/custom";
  }

  async initialize() {
    try {
      this.showLoading();
      const stepData = await this.fetchStepData();
      this.render(stepData);
    } catch (error) {
      this.showError(error.message);
    }
  }

  async fetchStepData() {
    const params = new URLSearchParams({
      migrationName: this.migrationName,
      iterationName: this.iterationName,
      stepCode: this.stepCode,
    });

    const response = await fetch(
      `${this.baseUrl}/stepViewApi/instance?${params}`,
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  showLoading() {
    this.container.innerHTML = `
      <div class="step-loading">
        <span class="spinner"></span>
        Loading step ${this.stepCode}...
      </div>
    `;
  }

  showError(message) {
    this.container.innerHTML = `
      <div class="step-error">
        <strong>Error loading step ${this.stepCode}:</strong>
        <p>${message}</p>
      </div>
    `;
  }

  render(stepData) {
    // Use previously shown renderStepView logic
    this.container.innerHTML = this.renderStepView(stepData);
  }
}

// Usage
window.addEventListener("load", function () {
  const widget = new StepViewWidget(
    "step-container",
    "Q3 2025 Migration",
    "Production Cutover",
    "ENV-001",
  );
  widget.initialize();
});
```

## Best Practices

### 1. Parameter Handling

**URL Encoding:**

```javascript
// ✅ Good: Properly encode parameters
const params = new URLSearchParams({
  migrationName: migrationName, // Automatically encoded
  iterationName: iterationName,
  stepCode: stepCode,
});

// ❌ Avoid: Manual string concatenation without encoding
const url = `/stepViewApi/instance?migrationName=${migrationName}&iterationName=${iterationName}`;
```

**Parameter Validation:**

```javascript
// ✅ Good: Validate parameters before API call
function validateStepViewParams(migrationName, iterationName, stepCode) {
  if (!migrationName || !iterationName || !stepCode) {
    throw new Error(
      "All parameters are required: migrationName, iterationName, stepCode",
    );
  }

  if (!stepCode.includes("-")) {
    throw new Error("Invalid step code format. Expected: XXX-nnn");
  }

  return true;
}
```

### 2. Error Handling

**Comprehensive Error Handling:**

```javascript
async function loadStepView(migrationName, iterationName, stepCode) {
  try {
    validateStepViewParams(migrationName, iterationName, stepCode);

    const stepData = await fetchStepData(
      migrationName,
      iterationName,
      stepCode,
    );
    return stepData;
  } catch (error) {
    if (error.message.includes("Missing required parameters")) {
      console.error("Parameter validation failed:", error.message);
    } else if (error.message.includes("No step instance found")) {
      console.error("Step not found:", error.message);
    } else {
      console.error("Unexpected error:", error.message);
    }
    throw error;
  }
}
```

### 3. Performance Optimization

**Caching Strategy:**

```javascript
class CachedStepViewService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  getCacheKey(migrationName, iterationName, stepCode) {
    return `${migrationName}|${iterationName}|${stepCode}`;
  }

  async getStepData(migrationName, iterationName, stepCode) {
    const key = this.getCacheKey(migrationName, iterationName, stepCode);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    const stepData = await this.fetchStepData(
      migrationName,
      iterationName,
      stepCode,
    );
    this.cache.set(key, {
      data: stepData,
      timestamp: Date.now(),
    });

    return stepData;
  }
}
```

### 4. User Experience

**Loading States:**

```javascript
// ✅ Good: Provide clear loading states
function showStepLoading(stepCode) {
  return `
    <div class="step-loading">
      <div class="loading-spinner"></div>
      <p>Loading step ${stepCode}...</p>
    </div>
  `;
}

// ✅ Good: Graceful error display
function showStepError(stepCode, error) {
  return `
    <div class="step-error">
      <h4>Unable to load step ${stepCode}</h4>
      <p>${error}</p>
      <button onclick="retryLoad('${stepCode}')">Retry</button>
    </div>
  `;
}
```

## Security Considerations

### Input Validation

- **Parameter Sanitization**: All inputs validated for format and content
- **SQL Injection Prevention**: Parameterized queries with explicit type casting
- **XSS Protection**: Response data should be properly escaped when rendered in HTML

### Authentication & Authorization

- **Confluence Integration**: Leverages existing Confluence authentication
- **Group-Based Access**: Requires confluence-users or confluence-administrators membership
- **Session Validation**: Each request validates active Confluence session

### Data Exposure

- **Scoped Data Access**: Only returns data for steps that exist within user's accessible context
- **No Sensitive Data**: API response does not include sensitive system internals
- **Audit Compliance**: Read-only operations with no audit trail requirements

## Testing Examples

### Unit Testing

```groovy
class StepViewApiTest {
    @Test
    void testValidStepViewRequest() {
        def response = callStepViewApi([
            migrationName: "Test Migration",
            iterationName: "Test Iteration",
            stepCode: "TEST-001"
        ])

        assert response.status == 200
        assert response.data.code == "TEST-001"
        assert response.data.migrationName == "Test Migration"
    }

    @Test
    void testMissingParametersReturns400() {
        def response = callStepViewApi([
            migrationName: "Test Migration"
            // Missing iterationName and stepCode
        ])

        assert response.status == 400
        assert response.error.contains("Missing required parameters")
    }

    @Test
    void testInvalidStepCodeFormat() {
        def response = callStepViewApi([
            migrationName: "Test Migration",
            iterationName: "Test Iteration",
            stepCode: "TEST001" // Missing hyphen
        ])

        assert response.status == 400
        assert response.error.contains("Invalid 'stepCode' parameter")
    }
}
```

### Integration Testing

```bash
#!/bin/bash
# Integration test script

BASE_URL="http://localhost:8090/rest/scriptrunner/latest/custom/stepViewApi"

echo "Testing valid step view request..."
curl -s -X GET \
  "${BASE_URL}/instance?migrationName=Test%20Migration&iterationName=Test%20Iteration&stepCode=ENV-001" \
  | jq .

echo "Testing missing parameters..."
curl -s -X GET \
  "${BASE_URL}/instance?migrationName=Test%20Migration" \
  | jq .

echo "Testing invalid step code format..."
curl -s -X GET \
  "${BASE_URL}/instance?migrationName=Test%20Migration&iterationName=Test%20Iteration&stepCode=ENV001" \
  | jq .

echo "Testing nonexistent step..."
curl -s -X GET \
  "${BASE_URL}/instance?migrationName=Nonexistent&iterationName=Test&stepCode=FAKE-999" \
  | jq .
```

## Dependencies & Related Systems

### Internal Dependencies

- **StepRepository**: Primary data access layer for step instance details
- **DatabaseUtil**: Database connection management and transaction handling
- **Step Master/Instance Tables**: Core data entities for step template and execution tracking

### External Dependencies

- **Confluence Authentication**: Session-based authentication and group membership validation
- **ScriptRunner Framework**: REST endpoint hosting and request processing
- **PostgreSQL Database**: Primary data storage with complex hierarchical queries

### Integration Points

- **Step View Confluence Macro**: Primary consumer of this API
- **Main Steps API**: Complementary API for comprehensive step management
- **Instructions API**: Related data included in step instance details
- **Teams API**: Team information included in step details

## Performance Considerations

### Query Optimization

- **Single Complex Query**: One database query resolves complete step hierarchy and details
- **Indexed Lookups**: Uses indexed columns (migration names, iteration names, step codes)
- **Latest Instance Logic**: ORDER BY and LIMIT optimize for most recent step instance

### Caching Strategy

- **API Response Caching**: Step instances change infrequently, suitable for short-term caching
- **Database Query Caching**: Complex hierarchy queries benefit from query result caching
- **CDN Compatibility**: Static nature of step data allows CDN caching with appropriate TTL

### Scalability Notes

- **Read-Only Operations**: No write contention or locking concerns
- **Stateless Design**: Each request is independent, supporting horizontal scaling
- **Connection Pooling**: Leverages DatabaseUtil connection pooling for concurrent requests

## Troubleshooting Guide

### Common Issues

#### 1. "Missing required parameters" Error

- **Cause**: One or more of migrationName, iterationName, stepCode not provided
- **Solution**: Ensure all three parameters are included in query string
- **Check**: Verify parameter names are exactly: `migrationName`, `iterationName`, `stepCode`

#### 2. "Invalid 'stepCode' parameter" Error

- **Cause**: Step code doesn't contain required hyphen separator
- **Solution**: Ensure step code follows XXX-nnn format (e.g., ENV-001, not ENV001)
- **Check**: Verify step code contains at least one hyphen

#### 3. "No step instance found" Error

- **Cause**: Step doesn't exist with provided migration/iteration/code combination
- **Solution**: Verify exact names and codes exist in system
- **Check**: Migration and iteration names are case-sensitive and must match exactly

#### 4. Macro Display Issues

- **Cause**: JavaScript errors or CSS conflicts in Confluence
- **Solution**: Check browser developer console for errors
- **Check**: Ensure macro parameters are properly configured

### Debugging Steps

1. **Parameter Verification**: Test with known good migration/iteration/step combinations
2. **Manual API Testing**: Use browser or curl to test API directly
3. **Database Verification**: Confirm step instances exist in database with exact names
4. **Authentication Check**: Verify user has required Confluence group membership

## Changelog

### Version 2.0.0 (August 7, 2025)

- Initial Step View API implementation for Confluence macro integration
- Three-parameter identification system using natural business identifiers
- Comprehensive step instance details with instruction and label integration
- Specialized error handling for user-friendly parameter validation
- Optimized single-query resolution for step hierarchy lookup

---

> **Note:** This API is specifically designed for the Step View Confluence macro. For comprehensive step management capabilities, use the main Steps API. This specification should be updated whenever the API changes. For implementation details, see `/src/groovy/umig/api/v2/stepViewApi.groovy` and `/src/groovy/umig/repository/StepRepository.groovy`.
