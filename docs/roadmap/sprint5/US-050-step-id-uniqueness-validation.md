# US-050: Step ID Uniqueness Validation in StepsAPI

**Epic**: Data Integrity and Validation  
**Story Points**: 2  
**Priority**: Medium  
**Sprint**: Backlog  
**Created**: 2025-01-26  

## Story Description

As a system administrator creating or editing Master Steps, I need the system to validate that Step IDs (combination of step_code + step_number) are globally unique across all steps, so that I can maintain proper step identification and prevent data conflicts.

**Business Value**: Prevents duplicate Step IDs that could cause confusion, tracking issues, and data integrity problems in cutover planning and execution.

## Problem Statement

Master Steps use a composite ID pattern where `step_code` (xxx) + `step_number` (nnnn) creates a `stepid` (xxx-nnnn). Currently, there is no validation to prevent duplicate Step IDs across the system, which can lead to:

- Confusion during step identification and tracking
- Potential data integrity issues in reporting
- Difficulty in referencing specific steps uniquely
- Problems with step dependencies and sequencing

## Acceptance Criteria

### AC1: Create Master Step Uniqueness Validation
**Given** a user is creating a new Master Step with step_code "DB" and step_number "0042"  
**When** the system validates the Step ID before creation  
**Then** the system should check if "DB-0042" already exists globally  
**And** return HTTP 409 Conflict with descriptive error if duplicate found  
**And** allow creation if Step ID is unique  

### AC2: Edit Master Step Uniqueness Validation
**Given** a user is editing an existing Master Step's step_code or step_number  
**When** the new combination would create a duplicate Step ID  
**Then** the system should prevent the update with HTTP 409 Conflict  
**And** provide clear error message with existing step details  
**And** allow update if the new Step ID remains unique  

### AC3: Comprehensive Error Response
**Given** a duplicate Step ID is detected during validation  
**When** the system returns the error response  
**Then** the error message should include:  
- The conflicting Step ID (e.g., "DB-0042")  
- Name of the existing step using that ID  
- Phase and status of the existing step  
- Suggested next available number for that code prefix  

### AC4: Frontend Error Handling
**Given** the API returns a Step ID uniqueness error  
**When** the Admin GUI receives the error response  
**Then** the form should display the validation error clearly  
**And** prevent form submission until a unique ID is provided  
**And** optionally suggest alternative step numbers  

### AC5: Performance and Edge Case Handling
**Given** the uniqueness validation is implemented  
**When** validation queries are executed  
**Then** the database query should be optimized for performance  
**And** handle case insensitivity appropriately  
**And** validate Step ID format (letters + numbers)  
**And** handle concurrent creation attempts safely  

## Technical Implementation Approach

### Backend Changes (StepsAPI.groovy)

```groovy
// Add validation method
private boolean isStepIdUnique(String stepCode, String stepNumber, String excludeStepId = null) {
    String stepId = "${stepCode}-${stepNumber}".toUpperCase()
    
    DatabaseUtil.withSql { sql ->
        String query = """
            SELECT sma_id, sma_step_name, sma_status 
            FROM tbl_steps_master 
            WHERE UPPER(CONCAT(sma_step_code, '-', sma_step_number)) = ?
        """
        
        if (excludeStepId) {
            query += " AND sma_id != ?"
            return sql.rows(query, [stepId, excludeStepId]).isEmpty()
        } else {
            return sql.rows(query, [stepId]).isEmpty()
        }
    }
}

// Enhanced validation in create/update methods
private Map<String, Object> validateStepId(String stepCode, String stepNumber, String excludeStepId = null) {
    String stepId = "${stepCode}-${stepNumber}".toUpperCase()
    
    // Format validation
    if (!stepCode.matches(/^[A-Z]{2,4}$/)) {
        return [valid: false, error: "Step code must be 2-4 uppercase letters"]
    }
    
    if (!stepNumber.matches(/^\d{4}$/)) {
        return [valid: false, error: "Step number must be 4 digits"]
    }
    
    // Uniqueness validation
    if (!isStepIdUnique(stepCode, stepNumber, excludeStepId)) {
        DatabaseUtil.withSql { sql ->
            def existing = sql.firstRow("""
                SELECT sma_step_name, sma_status 
                FROM tbl_steps_master 
                WHERE UPPER(CONCAT(sma_step_code, '-', sma_step_number)) = ?
            """, [stepId])
            
            // Suggest next available number
            def nextAvailable = findNextAvailableNumber(stepCode)
            
            return [
                valid: false, 
                error: "Step ID '${stepId}' already exists for step '${existing.sma_step_name}' (Status: ${existing.sma_status})",
                suggestion: "${stepCode}-${nextAvailable}"
            ]
        }
    }
    
    return [valid: true]
}

private String findNextAvailableNumber(String stepCode) {
    DatabaseUtil.withSql { sql ->
        def maxNumber = sql.firstRow("""
            SELECT MAX(CAST(sma_step_number AS INTEGER)) as max_num
            FROM tbl_steps_master 
            WHERE UPPER(sma_step_code) = ?
        """, [stepCode.toUpperCase()])
        
        int nextNum = (maxNumber?.max_num ?: 0) + 1
        return String.format("%04d", nextNum)
    }
}
```

### Database Optimization

```sql
-- Add index for optimized uniqueness queries
CREATE INDEX IF NOT EXISTS idx_steps_master_composite_id 
ON tbl_steps_master (UPPER(sma_step_code), sma_step_number);

-- Alternative: Add computed column with unique constraint
ALTER TABLE tbl_steps_master 
ADD COLUMN sma_step_id_computed VARCHAR(10) 
GENERATED ALWAYS AS (UPPER(sma_step_code) || '-' || sma_step_number) STORED;

CREATE UNIQUE INDEX idx_steps_master_unique_id 
ON tbl_steps_master (sma_step_id_computed);
```

### Frontend Enhancement (admin-gui/steps.js)

```javascript
// Enhanced validation in step form
function validateStepId(stepCode, stepNumber) {
    // Format validation
    if (!/^[A-Z]{2,4}$/.test(stepCode)) {
        showError('Step code must be 2-4 uppercase letters');
        return false;
    }
    
    if (!/^\d{4}$/.test(stepNumber)) {
        showError('Step number must be 4 digits');
        return false;
    }
    
    return true;
}

// Handle API uniqueness errors
function handleStepIdError(response) {
    if (response.status === 409) {
        response.json().then(data => {
            showError(data.message);
            if (data.suggestion) {
                showSuggestion(`Suggested ID: ${data.suggestion}`);
            }
        });
    }
}

// Real-time validation (optional enhancement)
document.getElementById('stepCode').addEventListener('input', debounce(checkStepIdAvailability, 500));
document.getElementById('stepNumber').addEventListener('input', debounce(checkStepIdAvailability, 500));
```

## Error Message Specifications

### Duplicate Step ID Error
```json
{
  "error": "DUPLICATE_STEP_ID",
  "message": "Step ID 'DB-0042' already exists for step 'Database Backup Validation' (Status: Active)",
  "conflictingStepId": "DB-0042",
  "existingStep": {
    "name": "Database Backup Validation",
    "phase": "Pre-Cutover",
    "status": "Active"
  },
  "suggestion": "DB-0043"
}
```

### Format Validation Error
```json
{
  "error": "INVALID_STEP_ID_FORMAT",
  "message": "Step code must be 2-4 uppercase letters and step number must be 4 digits",
  "violations": [
    "Step code 'db1' contains invalid characters",
    "Step number '42' must be 4 digits"
  ]
}
```

## Testing Scenarios

### Unit Tests
1. **Uniqueness Validation**:
   - Test creating step with unique ID (should pass)
   - Test creating step with duplicate ID (should fail)
   - Test editing step to duplicate ID (should fail)
   - Test editing step to unique ID (should pass)

2. **Format Validation**:
   - Valid formats: "DB-0001", "PREP-9999"
   - Invalid codes: "d", "DB1", "VERYLONGCODE"
   - Invalid numbers: "1", "12345", "ABC1"

3. **Edge Cases**:
   - Case insensitivity: "db-0001" vs "DB-0001"
   - Leading zeros: "0001" vs "1"
   - Concurrent creation attempts
   - Null/empty values

### Integration Tests
1. **API Endpoint Testing**:
   - POST `/api/v2/steps/master` with duplicate data
   - PUT `/api/v2/steps/master/{id}` with conflicting update
   - Error response format validation

2. **Database Performance**:
   - Query execution time under load
   - Index utilization verification
   - Concurrent transaction handling

### User Acceptance Tests
1. **Admin GUI Workflow**:
   - Create new step with duplicate ID
   - Edit existing step to duplicate ID
   - Verify error display and form prevention
   - Verify suggestion functionality

## Performance Considerations

1. **Database Query Optimization**:
   - Use composite index on (step_code, step_number)
   - Limit query scope to necessary columns
   - Consider caching for frequently accessed data

2. **Validation Timing**:
   - Server-side validation on form submission (mandatory)
   - Optional real-time validation with debouncing
   - Batch validation for bulk operations

3. **Memory Usage**:
   - Avoid loading all steps for validation
   - Use efficient SQL queries with LIMIT 1
   - Implement proper connection pooling

## Definition of Done

- [ ] Backend validation implemented in StepsAPI
- [ ] Database index created for performance
- [ ] Frontend error handling implemented
- [ ] Unit tests written and passing (95% coverage)
- [ ] Integration tests covering all scenarios
- [ ] Performance validation completed (<100ms for uniqueness check)
- [ ] Error message specifications documented
- [ ] Admin GUI updated with validation feedback
- [ ] Code review completed
- [ ] Documentation updated

## Dependencies

- **Depends On**: StepsAPI existing functionality
- **Blocks**: None
- **Related**: US-051 (Step Dependencies), US-052 (Step Archiving)

## Risk Assessment

**Low Risk** - Straightforward validation logic with well-established patterns

**Mitigations**:
- Use existing DatabaseUtil patterns
- Follow established error handling conventions
- Implement comprehensive testing
- Add performance monitoring for validation queries

## Technical Notes

1. **Backward Compatibility**: Existing steps with duplicate IDs (if any) should be identified and resolved before implementation
2. **Migration Strategy**: Consider data cleanup script if duplicates exist
3. **Monitoring**: Add logging for validation failures to track usage patterns
4. **Future Enhancement**: Consider automatic step numbering feature