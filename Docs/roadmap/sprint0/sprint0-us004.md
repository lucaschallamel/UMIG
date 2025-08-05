# Sprint 0 - User Story 004: Instructions API with Distribution

**Story ID**: US-004  
**Sprint**: Sprint 0 (MVP Foundation)  
**Status**: Planning  
**Estimated Effort**: 4-5 hours  
**Dependencies**: US-001 (Plans), US-002 (Sequences), US-003 (Phases), Steps API (existing)

## Story Overview

### User Story
As a migration coordinator, I need to manage detailed instructions within each step of the migration process, including the ability to distribute instructions to specific teams or individuals, so that I can ensure clear communication and precise execution of migration tasks.

### Business Value
- Provides granular task management at the instruction level
- Enables distribution of specific instructions to responsible parties
- Completes the hierarchical data model for migration management
- Supports ordered execution of instructions within steps

## Requirements Analysis

### Functional Requirements
1. **CRUD Operations for Master Instructions**
   - Create master instruction templates linked to master steps
   - Read/retrieve master instructions with filtering
   - Update master instruction details
   - Delete master instructions with cascade handling

2. **CRUD Operations for Instance Instructions**
   - Instantiate instructions from master templates
   - Read/retrieve instance instructions with filtering
   - Update instance instruction status and assignments
   - Delete instance instructions with validation

3. **Hierarchical Filtering**
   - Filter by migration, iteration, plan, sequence, phase, and step
   - Support both master step ID (stm_id) and instance step ID (sti_id)
   - Maintain consistency with established filtering patterns

4. **Instruction Ordering**
   - Support ordered instructions within a step
   - Provide reordering capabilities with gap handling
   - Prevent circular dependencies if prerequisites exist

5. **Distribution Management**
   - Assign instructions to teams or users
   - Track distribution status
   - Support bulk distribution operations

### Non-Functional Requirements
1. **Performance**: API response times <200ms
2. **Security**: Confluence user group authorization
3. **Compatibility**: ScriptRunner and PostgreSQL compatible
4. **Testing**: 90%+ code coverage
5. **Documentation**: Complete API documentation

## Technical Design

### API Endpoints (Following Consolidated Pattern)
```
/rest/scriptrunner/latest/custom/instructions
├── GET /instructions/master                    # List all master instructions
├── GET /instructions/master/{inm_id}          # Get specific master instruction
├── POST /instructions/master                   # Create master instruction
├── PUT /instructions/master/{inm_id}          # Update master instruction
├── DELETE /instructions/master/{inm_id}       # Delete master instruction
├── PUT /instructions/master/reorder           # Reorder master instructions
├── POST /instructions/master/{inm_id}/instantiate  # Create instances from master
├── GET /instructions/instance                  # List instruction instances
├── GET /instructions/instance/{ini_id}        # Get specific instance
├── PUT /instructions/instance/{ini_id}        # Update instance
├── DELETE /instructions/instance/{ini_id}     # Delete instance
├── PUT /instructions/instance/reorder         # Reorder instances
├── PUT /instructions/instance/{ini_id}/status # Update status
├── PUT /instructions/instance/{ini_id}/distribute  # Distribute to team/user
├── POST /instructions/instance/bulk-distribute    # Bulk distribution
```

### Database Schema
Following the canonical MASTER/INSTANCE pattern:

#### Master Instructions Table (instructions_master_inm)
```sql
- inm_id (UUID, PK)
- stm_id (UUID, FK to steps_master_stm)
- inm_name (VARCHAR 255)
- inm_description (TEXT)
- inm_order (INTEGER)
- inm_estimated_duration (INTEGER) -- in minutes
- inm_is_critical (BOOLEAN)
- created_by (VARCHAR 255)
- created_at (TIMESTAMP)
- updated_by (VARCHAR 255)
- updated_at (TIMESTAMP)
```

#### Instance Instructions Table (instructions_instance_ini)
```sql
- ini_id (UUID, PK)
- inm_id (UUID, FK to instructions_master_inm)
- sti_id (UUID, FK to steps_instance_sti)
- ini_name (VARCHAR 255)
- ini_description (TEXT)
- ini_order (INTEGER)
- ini_status (VARCHAR 50) -- PENDING, IN_PROGRESS, COMPLETED, BLOCKED
- ini_assigned_team_id (INTEGER, FK to teams_tms)
- ini_assigned_user_id (INTEGER, FK to users_usr)
- ini_actual_duration (INTEGER)
- ini_completion_notes (TEXT)
- ini_completed_at (TIMESTAMP)
- ini_completed_by (VARCHAR 255)
- created_by (VARCHAR 255)
- created_at (TIMESTAMP)
- updated_by (VARCHAR 255)
- updated_at (TIMESTAMP)
```

### Repository Pattern Implementation
Following established patterns, InstructionRepository will include:

1. **Find Operations** (6 methods)
   - findAllMasterInstructions()
   - findMasterInstructionById(UUID inmId)
   - findMasterInstructionsByStepId(UUID stmId)
   - findInstructionInstances(filters)
   - findInstructionInstanceById(UUID iniId)
   - findInstructionInstancesByStepInstanceId(UUID stiId)

2. **Create Operations** (2 methods)
   - createMasterInstruction(instruction)
   - createInstructionInstancesFromMaster(inmId, stiId, filters)

3. **Update Operations** (5 methods)
   - updateMasterInstruction(inmId, updates)
   - updateInstructionInstance(iniId, updates)
   - updateInstructionInstanceStatus(iniId, status, actor)
   - updateInstructionOrder(instructions)
   - distributeInstruction(iniId, teamId, userId)

4. **Delete Operations** (2 methods)
   - deleteMasterInstruction(inmId)
   - deleteInstructionInstance(iniId)

5. **Advanced Operations** (4 methods)
   - reorderInstructions(stepId, orderedIds, isMaster)
   - bulkDistributeInstructions(distributions)
   - validateInstructionOrder(stepId)
   - getInstructionStatistics(stepId)

### Implementation Plan

#### Phase 1: Repository Implementation (1.5 hours)
1. Create InstructionRepository.groovy
2. Implement all 19 repository methods
3. Add transaction support for complex operations
4. Include ordering logic with gap handling

#### Phase 2: API Implementation (2 hours)
1. Create InstructionsApi.groovy with consolidated endpoint
2. Implement all 14 REST endpoints
3. Add hierarchical filtering support
4. Include type safety with explicit casting

#### Phase 3: Testing (1 hour)
1. Create InstructionRepositoryTest.groovy
2. Create InstructionsApiIntegrationTest.groovy
3. Add validation script
4. Achieve 90%+ coverage

#### Phase 4: Documentation (0.5 hours)
1. Create InstructionsAPI.md
2. Update openapi.yaml
3. Regenerate Postman collection
4. Update CHANGELOG.md

## Testing Strategy

### Unit Tests
- Mock SQL queries with regex patterns
- Test all repository methods
- Validate ordering logic
- Test distribution functionality

### Integration Tests
- Test all 14 endpoints
- Validate hierarchical filtering
- Test status transitions
- Verify distribution operations
- Performance validation (<200ms)

### Test Scenarios
1. Create master instruction
2. Update master instruction
3. Delete master with instances
4. Instantiate from master
5. Filter by hierarchy levels
6. Reorder instructions
7. Update instance status
8. Distribute to team
9. Distribute to user
10. Bulk distribution
11. Invalid status transitions
12. Circular dependency prevention
13. Authorization validation
14. Performance under load
15. Concurrent updates

## Dependencies and Risks

### Dependencies
- Existing Steps API (parent entity)
- Teams and Users APIs (for distribution)
- Audit fields infrastructure (US-002b)
- DatabaseUtil and ScriptRunner setup

### Risks
1. **Complexity of distribution logic** - Mitigate with clear requirements
2. **Performance with large instruction sets** - Mitigate with proper indexing
3. **Ordering conflicts** - Mitigate with transaction management

## Success Criteria

1. All 14 API endpoints implemented and functional
2. 90%+ test coverage achieved
3. Response times <200ms for all operations
4. Hierarchical filtering working correctly
5. Distribution functionality operational
6. Documentation complete and accurate
7. Postman collection updated
8. No regression in existing APIs

## Notes

- This is the final API in the Sprint 0 hierarchical structure
- Follows all established patterns from US-001, US-002, US-003
- Uses consolidated endpoint structure introduced in US-003
- Completes the migration data model foundation

---

**Next Steps**: 
1. Review and approve this specification
2. Create database migrations if needed
3. Begin implementation following the phased approach