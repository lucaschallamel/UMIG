# US-002c: Status Fields Normalization

**Sprint:** Sprint 0  
**Priority:** High  
**Type:** Technical Debt / Database Refactoring  
**Estimated Effort:** 3-4 hours  
**Dependencies:** US-002b (Audit Fields Standardization)  
**Created:** 2025-08-04  

## User Story

**As a** system administrator and developer  
**I want** all status fields to properly reference the centralized status_sts table  
**So that** we have consistent status management, validation, and color coding across the entire system  

## Background & Problem Statement

The system already has a centralized `status_sts` table (created in migration 015) with predefined statuses for each entity type. However:
- All status fields are currently VARCHAR(50) without foreign key constraints
- No validation against allowed status values
- No consistent way to retrieve status metadata (colors, allowed transitions)
- Risk of invalid status values being inserted
- Inconsistent status naming across the codebase

Current status fields that need normalization:
- `migrations_mig.mig_status`
- `iterations_ite.ite_status`
- `plans_master_plm.plm_status`
- `plans_instance_pli.pli_status`
- `sequences_instance_sqi.sqi_status`
- `phases_instance_phi.phi_status`
- `steps_instance_sti.sti_status`
- `controls_instance_cti.cti_status`

## Acceptance Criteria

### Database Changes

1. **Add Foreign Key Constraints**
   - [ ] All status fields must reference status_sts table
   - [ ] Maintain existing status values during migration
   - [ ] Handle any invalid status values appropriately

2. **Existing Status_sts Table Structure**
   ```sql
   status_sts (
       sts_id SERIAL PRIMARY KEY,
       sts_name VARCHAR(50) NOT NULL,
       sts_color VARCHAR(7) NOT NULL,
       sts_type VARCHAR(20) NOT NULL,
       created_date TIMESTAMP WITH TIME ZONE,
       updated_date TIMESTAMP WITH TIME ZONE,
       created_by VARCHAR(100),
       updated_by VARCHAR(100)
   )
   ```

3. **Tables to Update**
   - [ ] migrations_mig - Add FK constraint on mig_status
   - [ ] iterations_ite - Add FK constraint on ite_status
   - [ ] plans_master_plm - Add FK constraint on plm_status
   - [ ] plans_instance_pli - Add FK constraint on pli_status
   - [ ] sequences_instance_sqi - Add FK constraint on sqi_status
   - [ ] phases_instance_phi - Add FK constraint on phi_status
   - [ ] steps_instance_sti - Add FK constraint on sti_status
   - [ ] controls_instance_cti - Add FK constraint on cti_status

### Implementation Requirements

1. **Migration Strategy**
   - Change status fields from VARCHAR to INTEGER (FK to sts_id)
   - Map existing string values to status_sts records
   - Handle any unmapped status values
   - Preserve historical data integrity

2. **Repository Updates**
   - Update all repository methods to work with status IDs
   - Create StatusRepository for status lookups
   - Add helper methods for status retrieval with metadata

3. **API Updates**
   - APIs should return both status name and color
   - Validate status changes against allowed values
   - Maintain backward compatibility where possible

## Technical Design

### Database Migration Approach

```sql
-- Step 1: Add new column for status ID
ALTER TABLE migrations_mig 
ADD COLUMN mig_status_id INTEGER;

-- Step 2: Populate with mapped values
UPDATE migrations_mig m
SET mig_status_id = s.sts_id
FROM status_sts s
WHERE s.sts_name = m.mig_status
AND s.sts_type = 'Migration';

-- Step 3: Handle any unmapped values (set to default or log for review)
UPDATE migrations_mig
SET mig_status_id = (
    SELECT sts_id FROM status_sts 
    WHERE sts_name = 'PLANNING' AND sts_type = 'Migration'
)
WHERE mig_status_id IS NULL;

-- Step 4: Add NOT NULL and FK constraint
ALTER TABLE migrations_mig
ALTER COLUMN mig_status_id SET NOT NULL,
ADD CONSTRAINT fk_mig_status_sts 
    FOREIGN KEY (mig_status_id) 
    REFERENCES status_sts(sts_id);

-- Step 5: Drop old column (after verification)
ALTER TABLE migrations_mig
DROP COLUMN mig_status;

-- Step 6: Rename new column
ALTER TABLE migrations_mig
RENAME COLUMN mig_status_id TO mig_status;
```

### Repository Pattern Updates

```groovy
class StatusRepository {
    
    def getStatusById(Integer statusId) {
        DatabaseUtil.withSql { sql ->
            def query = '''
                SELECT sts_id, sts_name, sts_color, sts_type
                FROM status_sts
                WHERE sts_id = :statusId
            '''
            return sql.firstRow(query, [statusId: statusId])
        }
    }
    
    def getStatusByNameAndType(String name, String type) {
        DatabaseUtil.withSql { sql ->
            def query = '''
                SELECT sts_id, sts_name, sts_color, sts_type
                FROM status_sts
                WHERE sts_name = :name AND sts_type = :type
            '''
            return sql.firstRow(query, [name: name, type: type])
        }
    }
    
    def getAllStatusesForType(String type) {
        DatabaseUtil.withSql { sql ->
            def query = '''
                SELECT sts_id, sts_name, sts_color
                FROM status_sts
                WHERE sts_type = :type
                ORDER BY sts_id
            '''
            return sql.rows(query, [type: type])
        }
    }
}
```

### API Response Enhancement

```groovy
// Before: Returns just status name
{
    "mig_id": "123",
    "mig_status": "IN_PROGRESS"
}

// After: Returns status with metadata
{
    "mig_id": "123",
    "mig_status": {
        "id": 2,
        "name": "IN_PROGRESS",
        "color": "#0066CC"
    }
}
```

## Success Metrics

- All status fields properly reference status_sts table
- No invalid status values in the database
- APIs return consistent status information with colors
- Status validation prevents invalid values
- No breaking changes to existing API contracts

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data migration errors | High | Backup database, test migration thoroughly, have rollback plan |
| API compatibility | Medium | Support both old and new formats temporarily |
| Missing status mappings | Low | Create comprehensive mapping, add missing statuses to status_sts |
| Performance impact | Low | Add appropriate indexes on FK columns |

## Dependencies

- US-002b should be completed first to ensure status_sts table has audit fields
- Existing status_sts table (migration 015)

## Definition of Done

- [ ] Liquibase migration created and tested
- [ ] All status fields converted to FK references
- [ ] StatusRepository created with helper methods
- [ ] All repositories updated to use status IDs
- [ ] APIs return status with metadata (name, color)
- [ ] Status validation implemented
- [ ] Documentation updated
- [ ] Code reviewed and approved
- [ ] Integration tests passing
- [ ] No breaking changes to existing functionality

## Notes

- The status_sts table already includes audit fields (created_date, updated_date, created_by, updated_by)
- Consider future enhancement: status transition validation (state machine)
- This normalization enables consistent UI color coding across all status displays
- APIs can maintain backward compatibility by returning status name as string when needed
- Future: Consider adding status ordering for workflow progression