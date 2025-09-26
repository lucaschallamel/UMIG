# UMIG Service Layer

This directory contains the business logic layer implementing **US-056 Service Layer Standardization**, providing centralized services for data transformation, business operations, and system integrations.

## 🏗️ Service Layer Architecture

**Purpose**: Centralized business logic between repository and API layers
**Pattern**: Service-oriented architecture with single responsibility principle
**Integration**: [US-056](../../../docs/roadmap/sprint6/US-056-service-layer-standardization.md) - Complete service layer standardization

### Service Layer Benefits

- **Separation of Concerns**: Business logic separated from data access and presentation
- **Reusability**: Services used across multiple APIs, macros, and components
- **Testability**: Business logic easily unit tested with mocked dependencies
- **Consistency**: Standardized data transformations and business rules
- **Maintainability**: Centralized logic reduces code duplication

## 📋 Core Services

### Data Transformation Services

**StepDataTransformationService.groovy** (580 lines)

- **Purpose**: Central transformation hub for Step data across all formats
- **Features**: Database rows → DTOs, DTOs → Email templates, Legacy → Modern formats
- **Integration**: StepsApi, email notifications, UI components, runsheet views
- **Pattern**: Single transformation source eliminates inconsistent conversions
- **Usage**: Required for all Step-related data operations

```groovy
import umig.service.StepDataTransformationService

def service = new StepDataTransformationService()
StepInstanceDTO dto = service.fromDatabaseRow(row)
Map emailData = service.toEmailTemplateData(dto)
```

### Authentication & User Services

**UserService.groovy**

- **Purpose**: Centralized user authentication and context management
- **Features**: Dual authentication fallback, user context enrichment, role validation
- **Integration**: All APIs requiring user context, audit logging, security validation
- **Pattern**: [ADR-042](../../../docs/adr/ADR-042-dual-authentication-context-management.md) - Dual authentication context
- **Security**: Thread-local fallback with frontend user ID support

```groovy
import umig.service.UserService

def userService = new UserService()
def currentUser = userService.getCurrentUser()
def userContext = userService.getUserContext(currentUser?.name)
```

**AuthenticationService.groovy**

- **Purpose**: Enhanced authentication with system user support
- **Features**: Configurable system user, environment variable support, anonymous fallback
- **Integration**: API endpoints, background processing, automated tasks
- **Security**: Centralized authentication logic with comprehensive error handling

### Status & Configuration Services

**StatusService.groovy**

- **Purpose**: Centralized status management with color coding and validation
- **Features**: Status color mapping, validation rules, hierarchical status resolution
- **Integration**: All entities requiring status (Steps, Plans, Sequences, Phases)
- **Pattern**: Single source of truth for status-related business logic

```groovy
import umig.service.StatusService

def statusService = new StatusService()
String color = statusService.getStatusColor("completed")
boolean isValid = statusService.isValidStatus("in_progress")
```

### Import & Processing Services

**ImportService.groovy**

- **Purpose**: Core import processing logic and data validation
- **Features**: Data validation, transformation rules, error handling, progress tracking
- **Integration**: Import APIs, batch processing, data migration tools
- **Pattern**: Service-oriented import processing with comprehensive validation

**CsvImportService.groovy**

- **Purpose**: Specialized CSV file processing and validation
- **Features**: CSV parsing, data type validation, batch processing, error reporting
- **Integration**: File upload APIs, bulk data import, configuration import
- **Performance**: Optimized for large file processing with memory management

**PerformanceOptimizedCsvImportService.groovy**

- **Purpose**: High-performance CSV processing for large datasets
- **Features**: Memory-efficient processing, parallel processing, progress monitoring
- **Integration**: Large-scale data migrations, production imports
- **Performance**: Handles datasets with 10k+ records efficiently

**PerformanceOptimizedImportService.groovy**

- **Purpose**: Optimized general import processing
- **Features**: Batch processing, connection pooling, memory optimization
- **Integration**: Production import workflows, automated data processing
- **Reliability**: Enhanced error recovery and rollback capabilities

### Orchestration Services

**ImportOrchestrationService.groovy**

- **Purpose**: Coordinates complex multi-step import workflows
- **Features**: Workflow orchestration, dependency management, rollback coordination
- **Integration**: Complex import scenarios, multi-entity imports, staged processing
- **Pattern**: Orchestration pattern for complex business workflows

**ImportPerformanceMonitoringService.groovy**

- **Purpose**: Performance monitoring and optimization for import operations
- **Features**: Performance metrics, bottleneck detection, optimization recommendations
- **Integration**: Production monitoring, performance tuning, capacity planning
- **Monitoring**: Real-time performance tracking with alerting

## 🔧 Service Integration Patterns

### Repository Integration

Services integrate with repositories for data access:

```groovy
import umig.repository.StepRepository
import umig.service.StepDataTransformationService

class BusinessService {
    def stepRepository = new StepRepository()
    def transformationService = new StepDataTransformationService()

    def processSteps(filters) {
        def rows = stepRepository.findInstancesWithEnrichment(filters)
        return rows.collect { transformationService.fromDatabaseRow(it) }
    }
}
```

### API Integration

Services provide business logic for API endpoints:

```groovy
// API endpoint using service layer
import umig.service.StepDataTransformationService

steps(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    def service = new StepDataTransformationService()
    def repository = new StepRepository()

    def results = repository.findInstances(filters)
    def dtos = results.collect { service.fromDatabaseRow(it) }

    return Response.ok(new JsonBuilder(dtos).toString()).build()
}
```

### Email Integration

Services prepare data for email templates:

```groovy
import umig.service.StepDataTransformationService
import umig.utils.EmailService

def transformationService = new StepDataTransformationService()
def emailData = transformationService.toEmailTemplateData(stepInstance)
def emailService = new EmailService()
emailService.sendStepNotification(emailData)
```

## 🎯 Service Design Patterns

### Single Responsibility Principle

Each service has a focused responsibility:

- **StepDataTransformationService**: Only data transformations
- **UserService**: Only user authentication and context
- **StatusService**: Only status-related business logic
- **ImportService**: Only import processing logic

### Dependency Injection Ready

Services designed for easy dependency injection:

```groovy
class BusinessService {
    private StepDataTransformationService transformationService
    private UserService userService

    BusinessService(StepDataTransformationService transformation, UserService user) {
        this.transformationService = transformation
        this.userService = user
    }
}
```

### Configuration-Driven

Services support configuration for different environments:

```groovy
import umig.service.ImportService

def importService = new ImportService([
    batchSize: 1000,
    retryAttempts: 3,
    timeoutSeconds: 300
])
```

## 📊 Quality & Performance

### Error Handling

All services implement comprehensive error handling:

```groovy
try {
    def result = service.processData(input)
    return result
} catch (ValidationException e) {
    log.warn("Validation failed: ${e.message}")
    throw new ServiceException("Data validation failed", e)
} catch (Exception e) {
    log.error("Service processing failed", e)
    throw new ServiceException("Processing failed", e)
}
```

### Performance Optimization

- **Caching**: Frequently accessed data cached in services
- **Batch Processing**: Large datasets processed in optimized batches
- **Connection Management**: Efficient database connection usage
- **Memory Management**: Optimized for large data processing

### Testing Support

Services designed for comprehensive testing:

```groovy
// Unit test example
def mockRepository = Mock(StepRepository)
def service = new StepDataTransformationService()
service.stepRepository = mockRepository

// Service logic testing without database dependencies
```

## 🔗 Architecture Compliance

### ADR Alignment

- **[ADR-031](../../../docs/adr/ADR-031-Type-Safety-Improvements.md)**: Type safety in service parameters
- **[ADR-042](../../../docs/adr/ADR-042-dual-authentication-context-management.md)**: Authentication service patterns
- **[ADR-047](../../../docs/adr/ADR-047-postgresql-patterns.md)**: Repository integration patterns
- **[ADR-049](../../../docs/adr/ADR-049-unified-dto-architecture.md)**: DTO transformation services

### Service Layer Standards

- **Business Logic Separation**: No database access in services (use repositories)
- **Type Safety**: Explicit type casting throughout service methods
- **Error Handling**: Comprehensive exception handling with meaningful messages
- **Logging**: Structured logging for monitoring and debugging
- **Documentation**: Clear javadoc for all public service methods

### Integration Standards

- **Repository Pattern**: Services use repositories for all data access
- **DTO Integration**: Services work with standardized DTOs
- **Configuration**: Environment-aware configuration support
- **Security**: Authentication and authorization through dedicated services

## 🚧 Service Development Guidelines

### Adding New Services

1. **Define Clear Responsibility**: Single, well-defined business purpose
2. **Design Interfaces**: Clear method signatures with type safety
3. **Implement Error Handling**: Comprehensive exception management
4. **Add Unit Tests**: Mock dependencies for isolated testing
5. **Document Integration**: Clear examples and usage patterns

### Service Testing Strategy

```groovy
// Service test pattern
class StepDataTransformationServiceTest extends Specification {
    def "should transform database row to DTO"() {
        given:
        def service = new StepDataTransformationService()
        def row = [sti_id: UUID.randomUUID(), step_name: "Test Step"]

        when:
        def dto = service.fromDatabaseRow(row)

        then:
        dto.stiId == row.sti_id
        dto.stepName == row.step_name
    }
}
```

### Performance Considerations

- **Lazy Loading**: Load data only when needed
- **Batch Operations**: Process multiple items efficiently
- **Connection Pooling**: Efficient database connection usage
- **Memory Management**: Avoid memory leaks in long-running operations

## 📖 Related Documentation

- **[DTO Layer README](../dto/README.md)**: Data transfer objects integration
- **[Repository Layer README](../repository/README.md)**: Data access integration
- **[API Layer README](../api/README.md)**: HTTP endpoint integration
- **[Testing README](../tests/README.md)**: Service testing strategies
- **[US-056 Documentation](../../../docs/roadmap/sprint6/US-056-service-layer-standardization.md)**: Service layer architecture

### Build Process Integration (US-088 Complete)

All services support comprehensive build orchestration with US-088 4-phase build process:

- **Phase 1-4 Complete**: Build orchestration, testing, deployment, and monitoring phases operational
- **Self-Contained Packages**: US-088-B Database Version Manager with 84% deployment size reduction
- **Liquibase Integration**: Automated schema management with service layer compatibility
- **ADR-061 Patterns**: ScriptRunner endpoint pattern compliance across all service integrations
- **Build Automation**: Comprehensive build process validation with service layer testing

### Service Layer Testing Excellence (224% Sprint Achievement)

**Complete Test Coverage**:

- **100% Service Test Pass Rate**: All service layer unit and integration tests passing
- **Component Integration**: Services fully integrated with ComponentOrchestrator architecture
- **Performance Testing**: Service layer performance validated with build process integration
- **Security Testing**: 8-phase security controls validated across all service integrations
- **Database Version Testing**: US-088-B Liquibase integration testing with service compatibility

### Enhanced Service Features (Sprint 7 Achievements)

**US-088 Integration Enhancements**:

- **Build Process Services**: Integrated with 4-phase build orchestration
- **Database Version Services**: US-088-B Database Version Manager compatibility
- **Self-Contained Deployment**: Service packaging with 84% size reduction optimisation
- **Endpoint Pattern Services**: ADR-061 ScriptRunner pattern integration
- **Performance Optimisation**: Service layer performance improvements with build integration

## 🚀 Future Service Enhancements

### Strategic Service Roadmap (Post US-088)

**Planned Service Additions**:

- **BuildOrchestrationService**: Centralised build process management service
- **DatabaseVersionService**: US-088-B version management service layer
- **DeploymentOptimisationService**: Self-contained package management
- **PerformanceMonitoringService**: Enhanced monitoring with build process integration

**Enhancement Opportunities**:

- **Microservices Architecture**: Service decomposition with US-088 self-contained patterns
- **Event-Driven Services**: Service layer event architecture with build process integration
- **Service Mesh**: Advanced service communication with deployment optimisation
- **Auto-Scaling Services**: Dynamic service scaling with build process metrics

---

**Last Updated**: September 2025 (Sprint 7) - US-088 Complete, 224% Sprint Achievement
**Architecture Version**: US-056 Service Layer Standardization + US-088 Build Process Integration
**Build Process**: 4-phase orchestration complete with 84% deployment size reduction
**Pattern Compliance**: Service-oriented architecture + ADR-061 endpoint patterns
**Integration Status**: Complete with DTO and Repository layers + US-088-B Database Version Manager
**Quality Score**: Production-ready with comprehensive testing + 100% service test pass rate
**Sprint Achievement**: 224% completion rate with US-088 build orchestration and database version management
