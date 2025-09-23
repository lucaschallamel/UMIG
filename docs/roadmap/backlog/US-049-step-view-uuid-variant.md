# US-049: Step View UUID Variant

**Epic**: User Interface Enhancement  
**Story Points**: 2  
**Priority**: Medium  
**Sprint**: Backlog

## Story

As a **system integrator and end user**, I want a **simplified Step View that accepts step instance UUIDs directly** so that I can **access specific steps without needing migration/iteration context hierarchy**.

## Business Value

- **Simplified Integration**: External systems can link directly to specific steps
- **Improved Usability**: Users can bookmark and share direct step links
- **Enhanced Performance**: Single UUID lookup vs hierarchical navigation
- **Mobile Accessibility**: QR codes and short links for mobile device access
- **Reduced Complexity**: Eliminates ambiguity when step IDs might not be unique across iterations

## Current State

- Existing StepView requires: `/stepview?migration=X&iteration=Y&stepId=XXX-NNNN`
- Depends on hierarchical navigation through migration → iteration → step
- Assumes step IDs are unique within each iteration
- Multiple API calls needed for complete data resolution

## Acceptance Criteria

### AC-1: UUID-Based Step View Creation

- **GIVEN** a step instance UUID
- **WHEN** I navigate to `/stepview-uuid?uuid={step-instance-uuid}`
- **THEN** the system displays complete step information including parent hierarchy context
- **AND** the view uses the same UI components and styling as existing StepView

### AC-2: Single API Endpoint Integration

- **GIVEN** a step instance UUID
- **WHEN** the UUID variant loads
- **THEN** it makes a single API call to retrieve complete step data
- **AND** the response includes step details, parent hierarchy, and all related information
- **AND** performance is better than or equal to the hierarchical approach

### AC-3: URL Parameter Validation

- **GIVEN** an invalid or non-existent UUID
- **WHEN** I access the UUID-based Step View
- **THEN** the system displays an appropriate error message
- **AND** suggests valid navigation options
- **AND** logs the invalid access attempt

### AC-4: Complete Feature Parity

- **GIVEN** the same step accessed via both view variants
- **WHEN** I compare the displayed information
- **THEN** both views show identical step data, instructions, and status
- **AND** all interactive elements (controls, buttons, links) function identically

### AC-5: Backward Compatibility

- **GIVEN** existing StepView functionality
- **WHEN** the UUID variant is implemented
- **THEN** the original StepView continues to function without changes
- **AND** both variants can coexist in the system
- **AND** users can switch between approaches based on their needs

## Technical Approach

### Frontend Implementation

```javascript
// New file: stepview-uuid.html
// Simplified parameter extraction
const urlParams = new URLSearchParams(window.location.search);
const stepUuid = urlParams.get("uuid");

// Single API call for complete data
async function loadStepByUuid(uuid) {
  const response = await fetch(`/api/v2/steps/instance/${uuid}`);
  return await response.json();
}

// Reuse existing UI components
// - StepDetailsComponent
// - InstructionsListComponent
// - StatusIndicatorComponent
// - ControlsComponent
```

### Backend API Enhancement

```groovy
// Add to StepsApi.groovy
@Path("/instance/{uuid}")
stepInstanceByUuid(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    def uuid = binding.variables.uuid

    // Single query with joins for complete data
    def stepData = StepRepository.findInstanceByUuidWithHierarchy(UUID.fromString(uuid))

    if (!stepData) {
        return Response.status(404).entity("Step instance not found").build()
    }

    return Response.ok(new JsonBuilder(stepData).toString()).build()
}
```

### Database Query Optimization

```sql
-- Single optimized query for complete step data
SELECT
    si.*, s.*, phi.*, seq.*, pli.*, mi.*,
    phi.phase_name, seq.sequence_name,
    pli.plan_name, mi.migration_name
FROM tbl_step_instance si
JOIN tbl_step_master s ON si.step_id = s.step_id
JOIN tbl_phase_instance phi ON si.phi_id = phi.phi_id
JOIN tbl_sequence_instance seq ON phi.sqi_id = seq.sqi_id
JOIN tbl_plan_instance pli ON seq.pli_id = pli.pli_id
JOIN tbl_migration_instance mi ON pli.migration_id = mi.migration_id
WHERE si.step_instance_id = ?
```

## URL Structure

### New Simplified Format

```
/stepview-uuid?uuid=550e8400-e29b-41d4-a716-446655440000
```

### Alternative Formats (for consideration)

```
/stepview/uuid?id=550e8400-e29b-41d4-a716-446655440000
/step/{uuid}
/s/{uuid} (ultra-short format)
```

### Current Format (unchanged)

```
/stepview?migration=MIGRATION_A&iteration=Q4_2024&stepId=APP-001
```

## API Endpoint Specification

### New Endpoint: GET /api/v2/steps/instance/{uuid}

**Request:**

```
GET /api/v2/steps/instance/550e8400-e29b-41d4-a716-446655440000
```

**Response:**

```json
{
    "stepInstanceId": "550e8400-e29b-41d4-a716-446655440000",
    "stepId": "APP-001",
    "stepName": "Application Server Shutdown",
    "instructions": [...],
    "status": "pending",
    "hierarchy": {
        "migrationId": "uuid",
        "migrationName": "MIGRATION_A",
        "iterationName": "Q4_2024",
        "planName": "Production Cutover",
        "sequenceName": "Application Tier",
        "phaseName": "Shutdown Phase"
    },
    "controls": {...},
    "auditFields": {...}
}
```

## Performance Considerations

### Query Optimization

- **Single Query**: Replace multiple hierarchical API calls with one optimized JOIN
- **Index Strategy**: Ensure step_instance_id has primary key index
- **Response Caching**: Consider caching responses for frequently accessed steps
- **Target Performance**: <500ms response time vs current ~1.5s for hierarchical approach

### Memory Usage

- **Reduced Overhead**: Eliminate intermediate navigation state storage
- **Direct Access**: Skip building hierarchical context objects
- **Payload Size**: Same data volume but delivered more efficiently

## Testing Requirements

### Unit Tests

- UUID validation (valid format, existence check)
- Error handling (invalid UUID, non-existent step)
- API response format validation
- Database query optimization verification

### Integration Tests

```groovy
// Test file: StepViewUuidIntegrationTest.groovy
void testStepAccessByUuid() {
    // Given: valid step instance UUID
    // When: access UUID-based view
    // Then: correct step data displayed
}

void testInvalidUuidHandling() {
    // Given: invalid UUID
    // When: access UUID-based view
    // Then: appropriate error response
}
```

### UI Tests

- URL parameter extraction and validation
- Component rendering with UUID-sourced data
- Error state display for invalid UUIDs
- Feature parity comparison with existing StepView

## Implementation Plan

### Phase 1: Backend API Enhancement (0.5 points)

1. Add UUID-based endpoint to StepsApi.groovy
2. Implement optimized database query
3. Create unit tests for new endpoint
4. Validate performance benchmarks

### Phase 2: Frontend View Creation (1.5 points)

1. Create stepview-uuid.html file
2. Implement simplified parameter handling
3. Integrate with new API endpoint
4. Reuse existing UI components
5. Add error handling for invalid UUIDs
6. Create integration tests

## Use Cases

### External System Integration

```javascript
// CRM system generating direct step links
const stepLink = `https://confluence.company.com/stepview-uuid?uuid=${stepInstanceId}`;
// Send in email notifications, reports, etc.
```

### Mobile QR Code Access

```
QR Code → https://confluence.company.com/stepview-uuid?uuid=550e8400...
Direct mobile access without navigation
```

### Bookmarking and Sharing

```
User bookmarks: /stepview-uuid?uuid=550e8400-e29b-41d4-a716-446655440000
Shareable link bypasses complex hierarchy navigation
```

## Migration Considerations

### Backward Compatibility

- Existing StepView URLs continue to function
- No breaking changes to current functionality
- Both variants can coexist indefinitely

### Optional Link Migration

- Consider adding UUID parameters to existing StepView URLs
- Gradual migration strategy for external integrations
- Analytics to track usage patterns between variants

## Definition of Done

- [ ] UUID-based Step View page created and functional
- [ ] New API endpoint implemented with optimized query
- [ ] Complete feature parity with existing StepView
- [ ] Error handling for invalid UUIDs implemented
- [ ] Unit and integration tests written and passing
- [ ] Performance benchmarks meet target (<500ms)
- [ ] Documentation updated with new URL format
- [ ] Backward compatibility verified
- [ ] Code review completed
- [ ] UAT testing passed

## Technical Risks

### Low Risk

- **Implementation Complexity**: Mostly reusing existing components
- **Performance Impact**: Expected improvement due to single query
- **User Experience**: Simplified navigation should improve usability

### Mitigation Strategies

- **UUID Validation**: Implement robust client and server-side validation
- **Error Recovery**: Provide clear navigation options when UUIDs are invalid
- **Monitoring**: Track usage patterns and performance metrics post-deployment

## Dependencies

- Existing StepsApi.groovy functionality
- Current StepView UI components
- Database step_instance table structure
- Frontend routing and parameter handling

---

**Created**: 2025-08-26  
**Author**: System  
**Status**: Ready for Sprint Planning  
**Estimated Effort**: 2 Story Points (0.5 backend + 1.5 frontend)
