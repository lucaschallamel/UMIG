# UMIG Service Layer

**Purpose**: Centralized business logic layer implementing US-056 Service Layer Standardization between repository and API layers

## Key Services

- **StepDataTransformationService.groovy** - Central transformation hub for Step data (database → DTOs → email templates)
- **UserService.groovy** - User authentication and context management with dual authentication fallback
- **AuthenticationService.groovy** - Enhanced authentication with system user support and anonymous fallback
- **StatusService.groovy** - Centralized status management with color coding and hierarchical validation
- **ImportService.groovy** - Core import processing logic with data validation and progress tracking
- **CsvImportService.groovy** - Specialized CSV processing with batch operations and error reporting
- **ImportOrchestrationService.groovy** - Multi-step import workflow coordination with rollback support

## Service Architecture

- **Single responsibility principle** - Each service has focused business purpose
- **Repository integration** - Services use repositories for all data access (no direct database)
- **Type safety** - Explicit casting throughout service methods (ADR-031)
- **Error handling** - Comprehensive exception management with meaningful messages
- **Testing ready** - Designed for unit testing with mocked dependencies

## Usage Pattern

- Services provide business logic between repository and API layers
- APIs use services for data transformation and business rules
- All Step-related operations require StepDataTransformationService for consistency
