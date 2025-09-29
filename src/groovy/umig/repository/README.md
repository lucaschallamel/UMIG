# UMIG Repository Layer

**Purpose**: Data access layer using repository pattern with DatabaseUtil.withSql for connection management

## Mandatory Patterns

- **DatabaseUtil.withSql**: ALL database operations must use this pattern
- **Type Safety (ADR-031)**: Explicit casting for all parameters
- **Hierarchical Filtering**: Use instance IDs (pli_id, sqi_id, phi_id), NOT master IDs
- **Single Enrichment Point (ADR-047)**: All data enrichment occurs in repositories

## Repository Categories (27 Total)

### Core Entities

- ApplicationRepository, EnvironmentRepository, LabelRepository
- TeamRepository, TeamMembersRepository, UserRepository

### Migration Hierarchy

- MigrationRepository, MigrationTypesRepository, IterationTypeRepository
- PlanRepository, SequenceRepository, PhaseRepository
- StepRepository (most comprehensive), InstructionRepository

### Import System

- ImportRepository, ImportQueueManagementRepository
- ImportResourceLockRepository, ScheduledImportRepository, StagingImportRepository

### Supporting

- AuditLogRepository, ControlRepository, EmailTemplateRepository
- LookupRepository, StatusRepository, SystemConfigurationRepository
