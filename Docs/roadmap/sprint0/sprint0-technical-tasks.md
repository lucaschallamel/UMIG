# Sprint 0 Technical Tasks (July 30-31, Aug 2-6, 2025)

## Overview
Sprint 0 establishes the foundation for AI-accelerated development with a **canonical-first approach**. We implement consolidated APIs that manage both master (canonical) and instance data layers, following the proven StepsApi pattern. This approach ensures proper canonical data management before instance operations.

## Canonical Data Architecture

### Design Decision: Consolidated APIs
Following the successful StepsApi pattern, we implement **consolidated APIs** that handle both master (canonical) and instance operations in a single, cohesive API per entity type. This approach:
- **Reduces complexity**: 6 APIs instead of 12+ separate APIs
- **Maintains consistency**: Follows proven StepsApi patterns
- **Accelerates delivery**: Critical for 4-week MVP timeline
- **Simplifies frontend**: Single API endpoint per entity

### Canonical Entity Hierarchy
1. **plans_master_plm** → plans_instance_pli
2. **sequences_master_sqm** → sequences_instance_sqi  
3. **phases_master_phm** → phases_instance_phi
4. **steps_master_stm** → steps_instance_sti (existing)
5. **instructions_master_inm** → instructions_instance_ini
6. **controls_master_ctm** → (embedded in phases)

## Day 1-2 (Wed-Thu, July 30-31): Technical Design & API Scaffolding

### 1. Generate Consolidated API Boilerplate

#### Plans API (`/src/groovy/umig/api/v2/PlansApi.groovy`)
```groovy
@BaseScript CustomEndpointDelegate delegate

// Consolidated API handling both master and instance operations
plans(httpMethod: "GET", groups: ["confluence-users"]) { 
    MultivaluedMap queryParams, String body, HttpServletRequest request ->
    
    def pathParts = getAdditionalPath(request)?.tokenize('/') ?: []
    
    // Master operations
    if (pathParts.size() >= 1 && pathParts[0] == 'master') {
        // GET /plans/master - List all master plans
        // GET /plans/master/{id} - Get specific master plan
        return handleMasterOperations(pathParts, queryParams)
    }
    
    // Instance operations
    if (pathParts.size() >= 1 && pathParts[0] == 'instance') {
        // GET /plans/instance/{id} - Get specific instance
        return handleInstanceDetails(pathParts[1])
    }
    
    // Default: List plan instances with filtering
    // GET /plans?migrationId=x&iterationId=y
    return handleInstanceListing(queryParams)
}

plans(httpMethod: "POST", groups: ["confluence-users"]) {
    // POST /plans/master - Create master plan
    // POST /plans/instance - Create plan instance
}

plans(httpMethod: "PUT", groups: ["confluence-users"]) {
    // PUT /plans/master/{id} - Update master plan
    // PUT /plans/instance/{id} - Update instance
    // PUT /plans/{id}/status - Update instance status
}

plans(httpMethod: "DELETE", groups: ["confluence-administrators"]) {
    // DELETE /plans/master/{id} - Delete master plan
    // DELETE /plans/instance/{id} - Delete instance
}
```

**Key Features**:
- Master CRUD operations with template management
- Instance creation from masters with override capability
- Hierarchical filtering (migration → iteration → plan)
- Status management for instances
- Audit logging for all operations

#### Sequences API (`/src/groovy/umig/api/v2/SequencesApi.groovy`)
```groovy
// Follows same consolidated pattern
sequences(httpMethod: "GET", groups: ["confluence-users"]) {
    // GET /sequences/master - All master sequences
    // GET /sequences/master?planId={uuid} - Sequences for a plan
    // GET /sequences - Instance sequences with filtering
    // GET /sequences/instance/{id} - Specific instance
}

sequences(httpMethod: "PUT", groups: ["confluence-users"]) {
    // PUT /sequences/reorder - Bulk reorder operation
    // PUT /sequences/{id}/order - Update single sequence order
}
```

**Special Features**:
- Order management (sqm_order field)
- Bulk reordering operations
- Plan-based filtering
- Progress roll-up calculations

#### Phases API (`/src/groovy/umig/api/v2/PhasesApi.groovy`)
```groovy
phases(httpMethod: "GET", groups: ["confluence-users"]) {
    // GET /phases/master - All master phases
    // GET /phases/master?sequenceId={uuid} - Phases for sequence
    // GET /phases - Instance phases
    // GET /phases/{id}/controls - Control points for phase
}

phases(httpMethod: "POST", groups: ["confluence-users"]) {
    // POST /phases/{id}/controls - Add control point
}
```

**Special Features**:
- Control point (quality gate) management
- Progress aggregation from steps
- Sequence-based filtering
- Control validation logic

#### Instructions API (`/src/groovy/umig/api/v2/InstructionsApi.groovy`)
```groovy
instructions(httpMethod: "GET", groups: ["confluence-users"]) {
    // GET /instructions/master - All master instructions
    // GET /instructions/master?stepId={uuid} - For specific step
    // GET /instructions - Instance instructions
    // GET /instructions/{id}/distribution - Distribution status
}

instructions(httpMethod: "POST", groups: ["confluence-users"]) {
    // POST /instructions/{id}/distribute - Trigger distribution
    // POST /instructions/{id}/complete - Mark as complete
}
```

**Special Features**:
- Distribution tracking
- Completion status
- Step-based filtering
- Bulk operations support

#### Controls API (`/src/groovy/umig/api/v2/ControlsApi.groovy`)
```groovy
// Optional - could be embedded in PhasesApi
controls(httpMethod: "GET", groups: ["confluence-users"]) {
    // GET /controls/master - All control templates
    // GET /controls?phaseId={uuid} - Controls for phase
}
```

**Special Features**:
- Quality gate templates
- Validation rules
- Progress dependencies

### 2. Create Database Migrations

#### Migration 034: Assignment Tables
```sql
-- assignment_rules table
CREATE TABLE assignment_rules_asr (
    asr_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asr_name VARCHAR(255) NOT NULL,
    asr_type VARCHAR(50) NOT NULL, -- 'manual', 'role_based', 'team_based'
    asr_criteria JSONB,
    asr_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- step_assignments table
CREATE TABLE step_assignments_sta (
    sta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sti_id UUID NOT NULL REFERENCES steps_instance_sti(sti_id),
    usr_id UUID REFERENCES users_usr(usr_id),
    tms_id INTEGER REFERENCES teams_tms(tms_id),
    asr_id UUID REFERENCES assignment_rules_asr(asr_id),
    sta_status VARCHAR(50) DEFAULT 'assigned',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);
```

#### Migration 035: Distribution Tracking
```sql
-- distribution_log table
CREATE TABLE distribution_log_dsl (
    dsl_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ini_id UUID NOT NULL REFERENCES instructions_instance_ini(ini_id),
    usr_id UUID NOT NULL REFERENCES users_usr(usr_id),
    dsl_channel VARCHAR(50) NOT NULL, -- 'email', 'confluence', 'teams'
    dsl_status VARCHAR(50) NOT NULL, -- 'pending', 'sent', 'delivered', 'failed'
    dsl_sent_at TIMESTAMP,
    dsl_delivered_at TIMESTAMP,
    dsl_metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Create Repository Classes (Canonical-First Design)

#### PlanRepository.groovy
```groovy
class PlanRepository {
    // Master (Canonical) Operations
    List<Map> findAllMasterPlans() { 
        DatabaseUtil.withSql { sql ->
            sql.rows("""SELECT plm.*, sts.sts_name, sts.sts_color 
                       FROM plans_master_plm plm
                       JOIN status_sts sts ON plm.sts_id = sts.sts_id
                       WHERE plm.soft_delete_flag = false
                       ORDER BY plm.created_at DESC""")
        }
    }
    
    Map createMasterPlan(Map planData) { }
    Map updateMasterPlan(String planId, Map updates) { }
    
    // Instance Operations  
    List<Map> findPlanInstancesByMigrationId(String migrationId) { }
    List<Map> findPlanInstancesByIterationId(String iterationId) { }
    Map createPlanInstance(String masterPlanId, String iterationId) { }
    Map updatePlanInstance(String instanceId, Map overrides) { }
}
```

#### SequenceRepository.groovy
```groovy
class SequenceRepository {
    // Master Operations
    List<Map> findMasterSequencesByPlanId(String planId) { }
    Map reorderMasterSequences(String planId, List<Map> orderData) { }
    
    // Instance Operations
    List<Map> findSequenceInstancesByPlanInstanceId(String pliId) { }
    Map updateSequenceInstanceOrder(String siiId, Integer newOrder) { }
}
```

#### PhaseRepository.groovy
```groovy
class PhaseRepository {
    // Master Operations with Controls
    List<Map> findMasterPhasesBySequenceId(String sequenceId) { }
    List<Map> findControlsByPhaseId(String phaseId) { }
    
    // Instance Operations with Progress
    Map calculatePhaseProgress(String phiId) { }
    Map updatePhaseInstanceStatus(String phiId, Integer statusId) { }
}
```

#### InstructionRepository.groovy
```groovy
class InstructionRepository {
    // Master Operations
    List<Map> findMasterInstructionsByStepId(String stepId) { }
    
    // Instance Operations with Distribution
    List<Map> findInstructionInstancesByStepInstanceId(String stiId) { }
    Map markInstructionDistributed(String iniId, Map distributionData) { }
    Map markInstructionComplete(String iniId, String userId) { }
}
```

#### ControlRepository.groovy (Optional)
```groovy
class ControlRepository {
    // Control Templates
    List<Map> findAllControlTemplates() { }
    Map createControlForPhase(String phaseId, Map controlData) { }
}

### 4. UI Component Scaffolding (Canonical Management Focus)

#### Admin GUI Components (New Tabs)
- **Plans Management**: 
  - Master plan templates library
  - Plan cloning/versioning interface
  - Instance creation from masters
- **Sequences Ordering**:
  - Drag-drop reordering for masters
  - Visual sequence flow editor
  - Instance override management
- **Phases Control Editor**:
  - Control point template management
  - Quality gate configuration
  - Progress threshold settings
- **Instructions Bulk Editor**:
  - Master instruction templates
  - Bulk import/export capability
  - Distribution channel configuration

#### Iteration View Extensions
- **Template Selection**:
  - Master plan dropdown selector
  - Quick instance creation buttons
  - Override highlighting
- **Assignment Interface**:
  - Drag-drop from team lists
  - Bulk assignment by role
  - Assignment rule builder
- **Progress Tracking**:
  - Real-time progress bars
  - Control point status indicators
  - Distribution completion metrics

## Day 3 (Fri, Aug 2): Resume After Swiss Holiday

### Quick Sync & Review
- Review Day 1-2 outputs
- Identify any blockers
- Prepare parallel streams

## Day 4-5 (Mon-Tue, Aug 5-6): Parallel API Development

### Stream 1: Plans & Sequences APIs (GENDEV_SystemArchitect)
- Complete API implementation
- Add hierarchical filtering
- Implement ordering logic
- Generate unit tests

### Stream 2: Phases & Instructions APIs (GENDEV_ApiDesigner)
- Control point management
- Distribution endpoints
- Completion tracking
- Test generation

### Stream 3: Assignment Schema & Repository (GENDEV_DatabaseSchemaDesigner)
- Refine assignment schema
- Create assignment repository
- Bulk assignment methods
- Performance optimization

### Stream 4: UI Mockups & Frontend (GENDEV_InterfaceDesigner)
- Assignment interface mockup
- Distribution dashboard design
- Progress tracking components
- Integration points

## Day 5 (Wed, Aug 6): Integration & Testing

### Morning: Integration
- Merge all parallel streams
- Resolve any conflicts
- Update dependencies

### Afternoon: Testing & Documentation
- Run full test suite
- Update OpenAPI spec
- Generate Postman collection
- Update project documentation

## Deliverables Checklist

### APIs (5-6 Consolidated APIs with Master/Instance Operations)
- [ ] Plans API (master templates + instances)
- [ ] Sequences API (with ordering operations)
- [ ] Phases API (with control points)
- [ ] Instructions API (with distribution)
- [ ] Controls API (optional - or embedded in Phases)
- [ ] All APIs follow StepsApi consolidated pattern

### Database (2 migrations)
- [ ] Assignment tables migration
- [ ] Distribution tracking migration

### Repositories (5-6 classes with Canonical-First Design)
- [ ] PlanRepository (master + instance methods)
- [ ] SequenceRepository (with ordering logic)
- [ ] PhaseRepository (with control management)
- [ ] InstructionRepository (with distribution)
- [ ] ControlRepository (optional)

### UI Components (Canonical Management Focus)
- [ ] Master plan template management UI
- [ ] Sequence ordering interface
- [ ] Phase control point editor
- [ ] Instruction bulk management
- [ ] Assignment drag-drop interface
- [ ] Distribution status dashboard
- [ ] Progress tracking visualization

### Documentation
- [ ] Updated OpenAPI specification
- [ ] Postman collection with master/instance examples
- [ ] API documentation showing consolidated patterns
- [ ] Canonical data management guide

## Success Criteria

1. **Canonical-First Implementation**: All APIs properly manage master templates before instances
2. **Consolidated API Pattern**: All 5-6 APIs follow StepsApi pattern with master/instance operations
3. **Database Ready**: Migrations support full canonical→instance replication with overrides
4. **Repository Pattern**: Clear separation of master vs instance operations in repositories
5. **UI Support**: Admin GUI can manage canonical templates and create instances
6. **Test Coverage**: 90%+ coverage with specific tests for master/instance operations
7. **Documentation**: Clear examples of canonical management and instance creation

## Risk Mitigation

### Technical Risks
- **Pattern Deviation**: Strictly follow StepsApi.groovy patterns
- **Integration Issues**: Daily integration checkpoints
- **Holiday Disruption**: Front-load critical work before Aug 1

### Process Risks
- **Parallel Conflicts**: Clear ownership boundaries
- **Communication Gaps**: 5 PM daily sync mandatory
- **Scope Creep**: Strict adherence to defined deliverables

## Key Technical Decisions

### Why Consolidated APIs?
1. **StepsApi Success**: 745 lines handles both master/instance elegantly
2. **Time Efficiency**: 6 APIs vs 12+ separate APIs for MVP
3. **Frontend Simplicity**: Single endpoint per entity type
4. **Maintenance**: Related operations stay together

### Canonical-First Benefits
1. **Template Reusability**: Create once, use many times
2. **Version Control**: Track changes to master templates
3. **Override Management**: Instances can customize without affecting masters
4. **Consistency**: Enforce standards through templates

## Next Steps (Post Sprint 0)

1. **MVP Week 1**: Full implementation of all consolidated APIs
2. **Assignment Engine**: Build on Sprint 0 assignment tables
3. **Distribution System**: Implement email/Teams/Confluence channels
4. **Progress Tracking**: Real-time aggregation and WebSocket updates
5. **Instance Creation**: Bulk instance creation from master templates

---

> Sprint 0 Start: July 30, 2025 | Duration: 5 working days | Delivery: August 6, 2025
> Focus: Canonical-First Architecture with Consolidated APIs