# UMIG Data Transfer Objects (DTOs)

This directory contains Data Transfer Objects (DTOs) that implement the **US-056 Service Layer Standardization** architecture, providing unified data structures for master/instance template pattern separation.

## 🏗️ Dual DTO Architecture Pattern

**Core Pattern**: Canonical (`_master_`) templates vs Instance (`_instance_`) execution records
**Implementation**: [ADR-049](../../../docs/adr/ADR-049-unified-dto-architecture.md) - Unified DTO Architecture with Single Enrichment Point

### Master vs Instance DTOs

```groovy
// Master DTOs: Template definitions (e.g., step_master_stm table)
StepMasterDTO stepMaster = new StepMasterDTO()
stepMaster.stmId = UUID.randomUUID()           // Master template ID
stepMaster.stepName = "Deploy Application"      // Template name
stepMaster.estimatedDuration = 30              // Expected minutes

// Instance DTOs: Execution records (e.g., step_instance_sti table)
StepInstanceDTO stepInstance = new StepInstanceDTO()
stepInstance.stiId = UUID.randomUUID()         // Instance execution ID
stepInstance.stmId = stepMaster.stmId          // References master template
stepInstance.actualDuration = 45               // Actual execution time
stepInstance.status = "completed"              // Runtime status
```

## 📋 Current DTOs

### Core DTOs

**StepInstanceDTO.groovy** (516 lines)

- **Purpose**: Step execution instance records with runtime data
- **Schema**: `dto/schemas/StepInstanceDTO.schema.json`
- **Fields**: Execution status, team assignments, progress tracking, timestamps
- **Features**: JSON serialization, defensive null handling, type safety (ADR-031)
- **Integration**: StepDataTransformationService, email templates, UI components

**StepMasterDTO.groovy** (231 lines)

- **Purpose**: Step template definitions and configurations
- **Schema**: `dto/schemas/StepMasterDTO.schema.json`
- **Fields**: Template configurations, estimated durations, instruction templates
- **Features**: Template rendering support, validation rules, master data integrity
- **Integration**: Plan creation, template management, configuration UIs

**CommentDTO.groovy**

- **Purpose**: Comment data structure for step instances
- **Fields**: Comment content, user attribution, timestamps, reply threading
- **Features**: User ownership validation, audit trail, rich text support
- **Integration**: StepsApi comment system, email notifications

### Schema Validation

**Schema Location**: `dto/schemas/`

- `StepInstanceDTO.schema.json` - JSON schema for instance DTO validation
- `StepMasterDTO.schema.json` - JSON schema for master DTO validation
- `stepDataSchema.json` - General step data validation rules

## 🔧 Key Features

### JSON Serialization & Deserialization

```groovy
// Automatic JSON conversion with Jackson annotations
@JsonProperty("stepName")
String stepName

@JsonIgnoreProperties(ignoreUnknown = true)
class StepInstanceDTO {
    // Handles unknown JSON fields gracefully
}
```

### Type Safety (ADR-031)

```groovy
// Explicit type casting throughout DTOs
def setTeamId(Object teamIdValue) {
    this.teamId = teamIdValue ? Integer.parseInt(teamIdValue as String) : null
}

def setMigrationId(Object migrationIdValue) {
    this.migrationId = migrationIdValue ? UUID.fromString(migrationIdValue as String) : null
}
```

### Defensive Programming

```groovy
// Null-safe field handling
String getDisplayStatus() {
    return status ?: 'unknown'
}

Integer getEffectiveDuration() {
    return actualDuration ?: estimatedDuration ?: 0
}
```

### Rich Data Enhancement

DTOs include computed fields for UI and template rendering:

```groovy
// StepInstanceDTO computed properties
String getFormattedStartTime()      // "2025-09-23 14:30:00"
String getStatusColor()             // Status-based color coding
String getProgressPercentage()      // "75%" completion
List<String> getAssignedTeamNames() // Resolved team names
Map<String, Object> getLabelsData() // Parsed labels JSON
```

## 🚀 Service Layer Integration

### StepDataTransformationService

**Central Transformation Hub** (580 lines):

- Database rows → DTOs
- DTOs → Email template data
- DTOs → UI JSON responses
- Legacy formats → Modern DTOs

```groovy
import umig.service.StepDataTransformationService

def transformationService = new StepDataTransformationService()

// Database row to DTO
StepInstanceDTO instance = transformationService.fromDatabaseRow(row)

// DTO to email template data
Map emailData = transformationService.toEmailTemplateData(instance)

// DTO to UI response
Map uiResponse = transformationService.toUIResponse(instance)
```

### Single Enrichment Point (ADR-047)

All data enrichment occurs in repositories, DTOs receive fully enriched data:

```groovy
// ✅ Correct - Repository enriches data
def repository = new StepRepository()
def enrichedRows = repository.findInstancesWithEnrichment(filters)
def dtos = enrichedRows.collect { transformationService.fromDatabaseRow(it) }

// ❌ Wrong - DTOs should not perform database operations
def dto = new StepInstanceDTO()
dto.enrichFromDatabase() // Anti-pattern
```

## 🎯 Integration Patterns

### API Integration

```groovy
// StepsApi usage pattern
import umig.dto.StepInstanceDTO
import umig.service.StepDataTransformationService

// API endpoint implementation
def transformationService = new StepDataTransformationService()
def repository = new StepRepository()

def instances = repository.findInstances(filters)
def dtos = instances.collect { row ->
    transformationService.fromDatabaseRow(row)
}

return Response.ok(new JsonBuilder(dtos).toString()).build()
```

### Email Template Integration

```groovy
// Email template data preparation
def templateData = transformationService.toEmailTemplateData(stepInstance)
def emailService = new EmailService()
emailService.sendStepNotification(templateData)
```

### Frontend Integration

```groovy
// UI component data preparation
def uiData = transformationService.toUIResponse(stepInstance)
// Returns JSON-ready data with computed fields for frontend consumption
```

## 📊 Validation & Quality

### Schema Validation

All DTOs support JSON schema validation:

```groovy
// Validate DTO against schema
def validator = new JsonSchemaValidator()
def isValid = validator.validate(stepInstanceDTO, "StepInstanceDTO.schema.json")
```

### Unit Testing

DTOs include comprehensive unit tests:

- JSON serialization/deserialization
- Type safety validation
- Null handling scenarios
- Computed field calculations
- Schema compliance

### Performance Optimization

- Lazy loading of computed properties
- Efficient JSON serialization
- Minimal memory footprint
- Optimized for bulk operations

## 🔗 Architecture Compliance

### ADR Alignment

- **[ADR-031](../../../docs/adr/ADR-031-Type-Safety-Improvements.md)**: Type safety with explicit casting
- **[ADR-047](../../../docs/adr/ADR-047-postgresql-patterns.md)**: Single enrichment point in repositories
- **[ADR-049](../../../docs/adr/ADR-049-unified-dto-architecture.md)**: Unified DTO architecture implementation
- **[US-056](../../../docs/roadmap/sprint6/US-056-service-layer-standardization.md)**: Service layer standardization

### Database Patterns

DTOs follow UMIG database naming conventions:

- Master table suffix: `_master_` (e.g., `step_master_stm`)
- Instance table suffix: `_instance_` (e.g., `step_instance_sti`)
- Field naming: `snake_case` in database, `camelCase` in DTOs

### Service Integration

DTOs integrate with the complete UMIG service ecosystem:

- **Repository Layer**: Data access and enrichment
- **Service Layer**: Business logic and transformations
- **API Layer**: HTTP endpoint responses
- **Email System**: Template rendering and notifications
- **Frontend Components**: UI data binding and display

## 🚧 Future Enhancements

### Planned DTO Additions (Post US-088)

- **PlanInstanceDTO** / **PlanMasterDTO**: Plan template/instance pattern
- **SequenceInstanceDTO** / **SequenceMasterDTO**: Sequence template/instance pattern
- **PhaseInstanceDTO** / **PhaseMasterDTO**: Phase template/instance pattern
- **InstructionInstanceDTO** / **InstructionMasterDTO**: Instruction template/instance pattern

### Enhancement Opportunities (Strategic Roadmap)

- **US-088 Integration**: DTO patterns for Database Version Manager self-contained packages
- GraphQL schema generation from DTOs with build process integration
- Advanced validation rules with ADR-061 endpoint pattern compliance
- Performance monitoring and optimization with 84% deployment size reduction patterns
- Automated DTO generation from database schemas using Liquibase integration
- Self-contained package DTO serialisation for deployment optimisation

## 📖 Related Documentation

- **[Service Layer README](../service/README.md)**: StepDataTransformationService integration
- **[Repository Layer README](../repository/README.md)**: Data access patterns
- **[API Layer README](../api/README.md)**: HTTP endpoint integration
- **[Testing README](../tests/README.md)**: DTO testing strategies
- **[Schema Documentation](../../../docs/database/schema.md)**: Database structure reference

---

**Last Updated**: September 2025 (Sprint 7) - US-088 Complete, 224% Sprint Achievement
**Architecture Version**: US-056 Service Layer Standardization + US-088 Database Version Manager Integration
**Pattern Compliance**: Dual DTO Architecture (Master/Instance) + Self-contained Package Support
**Integration Status**: Complete with StepDataTransformationService + Database Version Manager
**Quality Score**: Production-ready with comprehensive validation + 84% Deployment Optimisation
**Sprint Achievement**: 224% completion rate with US-088 4-phase build orchestration complete
