# Data Transfer Objects (DTOs)

Structured data containers implementing the master/instance template separation pattern for step-level data with JSON schema validation and centralized transformation.

## Responsibilities

- Define canonical data structures for step master templates and step instances
- Provide type-safe data containers with explicit casting and null handling (ADR-031)
- Support JSON schema validation for data integrity and API contracts
- Enable centralized data transformation through service layer integration
- Facilitate JSON serialization for API responses and email template preparation
- Implement defensive programming patterns with comprehensive null safety

## Structure

```
dto/
├── StepInstanceDTO.groovy           # Step execution instance records (516 lines)
├── StepMasterDTO.groovy             # Step template definitions (231 lines)
├── CommentDTO.groovy                # Comment data structure for steps
├── schemas/                         # JSON schema validation
│   ├── StepInstanceDTO.schema.json  # Instance DTO validation schema
│   ├── StepMasterDTO.schema.json    # Master DTO validation schema
│   └── stepDataSchema.json          # Comprehensive step data schema
└── README.md
```

## Key Components

### StepInstanceDTO.groovy (516 lines)

**Purpose**: Step execution instance records with runtime data and operational state

**Key Fields**:

- Instance identifiers (sti_id, pli_id, sqi_id, phi_id for hierarchy)
- Execution metadata (status, assigned_to, actual_start/end dates)
- Runtime data (execution_notes, outcome, completion_percentage)
- Audit fields (created_at, updated_at, created_by, updated_by)
- Relationships (associated teams, applications, environments)

**Data Transformation**: Via StepDataTransformationService for enrichment with:

- Parent entity details (plan, sequence, phase names)
- User information (assignee names, creator details)
- Aggregated metrics (total steps, completed count, progress)

### StepMasterDTO.groovy (231 lines)

**Purpose**: Step template definitions and configurations for reusable blueprints

**Key Fields**:

- Template identifiers (stm_id, phm_id for phase master relationship)
- Configuration metadata (step_order, category, estimated_duration)
- Template data (title, description, instructions)
- Validation rules (required controls, dependencies)
- Reusability metadata (usage_count, last_instantiated)

**Instantiation Pattern**: Master templates instantiated to create step instances during iteration creation

### CommentDTO.groovy

**Purpose**: Comment data structure for step instance annotations and collaboration

**Key Fields**:

- Comment identifiers and relationships (step instance association)
- Content (comment_text, author, timestamp)
- Threading support (parent_comment_id for nested replies)
- Metadata (edited status, visibility flags)

### schemas/ Directory

**Purpose**: JSON schema definitions for DTO validation and API contract enforcement

**Schema Files**:

- **StepInstanceDTO.schema.json** - Validates step instance structure with 30+ fields
- **StepMasterDTO.schema.json** - Validates step master template structure with 20+ fields
- **stepDataSchema.json** - Comprehensive schema covering full step data model with validation rules

## Architectural Patterns (ADR-047, ADR-031)

### Master/Instance Template Separation

```groovy
// Master Template (Reusable Blueprint)
step_master_stm {
    stm_id: UUID (primary key)
    phm_id: UUID (phase master foreign key)
    step_order: Integer
    title: String
    description: String
    estimated_duration: Integer
}

// Instance Record (Execution Tracking)
step_instance_sti {
    sti_id: UUID (primary key)
    phi_id: UUID (phase instance foreign key)
    stm_id: UUID (template reference)
    status: String
    assigned_to: UUID
    actual_start: Timestamp
    actual_end: Timestamp
}
```

### Single Enrichment Point (ADR-047)

All DTO enrichment occurs through StepDataTransformationService:

- **Input**: Raw database records from repositories
- **Transformation**: Denormalize relationships, aggregate metrics, format dates
- **Output**: Fully enriched DTO ready for API response or email template
- **Benefit**: Centralized logic, consistent formatting, maintainable transformations

### Type Safety (ADR-031)

```groovy
// Explicit casting in DTO construction
def dto = new StepInstanceDTO(
    sti_id: UUID.fromString(row.sti_id as String),
    status: (row.status as String)?.toUpperCase(),
    completion_percentage: row.completion_percentage ?
        Integer.parseInt(row.completion_percentage as String) : 0
)
```

### Defensive Null Handling

```groovy
// Safe navigation and null coalescing
def assignedToName = row.assigned_to_name ?: 'Unassigned'
def actualDuration = row.actual_end && row.actual_start ?
    calculateDuration(row.actual_start, row.actual_end) : null
```

## Integration Points

**Service Layer Integration**:

- **StepDataTransformationService** (580 lines) - Centralized DTO transformation and enrichment
- **StatusService** - Status validation and transition rules
- **UserService** - User lookup for assignee and creator enrichment

**Repository Layer Integration**:

- **StepRepository** - Provides raw database records for transformation
- **PhaseRepository** - Parent entity details for hierarchy enrichment
- **UserRepository** - User details for assignee enrichment

**API Layer Integration**:

- **StepsApi** - JSON serialization for HTTP GET/POST/PUT responses
- **stepViewApi** - Enhanced view with aggregated DTO collections
- **InstructionsApi** - Instruction-level DTO usage

**Email System Integration**:

- **EnhancedEmailService** - Template data preparation for notifications
- **StepNotificationIntegration** - Step assignment and completion emails

## Schema Validation

**Validation Strategy**:

- JSON schemas enforce structure and type constraints
- Runtime validation during API request processing
- Pre-save validation before database persistence
- Schema versioning for backward compatibility

**Validation Rules**:

- Required fields enforcement (sti_id, stm_id, status mandatory)
- Type constraints (UUID format, integer ranges, enum values)
- Relationship integrity (foreign key references must exist)
- Business logic rules (status transitions, date ordering)

## Related

- See `../service/StepDataTransformationService.groovy` for DTO transformation logic
- See `../repository/StepRepository.groovy` for raw data retrieval
- See `../api/v2/StepsApi.groovy` for DTO usage in API responses
- See `../utils/EnhancedEmailService.groovy` for email template integration
