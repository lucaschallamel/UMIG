# UMIG Data Transfer Objects (DTOs)

**Purpose**: Unified data structures implementing the dual architecture pattern for master/instance template separation

## Architecture

- **Master DTOs**: Template definitions (`step_master_stm` table)
- **Instance DTOs**: Execution records (`step_instance_sti` table)
- **Transformation**: Centralized via StepDataTransformationService (580 lines)

## Key Files

- `StepInstanceDTO.groovy` (516 lines) - Step execution instance records with runtime data
- `StepMasterDTO.groovy` (231 lines) - Step template definitions and configurations
- `CommentDTO.groovy` - Comment data structure for step instances

## Schema Validation

- `dto/schemas/` - JSON schema definitions for DTO validation
- Type safety with explicit casting (ADR-031)
- Defensive null handling throughout

## Integration Points

- **Service Layer**: StepDataTransformationService for data transformation
- **Repository Layer**: Single enrichment point pattern (ADR-047)
- **API Layer**: JSON serialization for HTTP responses
- **Email System**: Template data preparation for notifications
