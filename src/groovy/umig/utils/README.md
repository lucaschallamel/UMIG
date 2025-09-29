# UMIG Utility Classes

**Purpose**: Core utility classes providing foundational services for database access, authentication, email, security, and common operations across UMIG application

## Key Components

- **DatabaseUtil.groovy** - MANDATORY centralized database connection management with ScriptRunner integration
- **AuthenticationService.groovy** - Core authentication logic with ADR-042 dual authentication context
- **EnhancedEmailService.groovy** - Advanced email service with mobile optimization and US-039 integration
- **SecurityUtils (ErrorSanitizer, RateLimitManager)** - Security infrastructure with injection prevention
- **UrlConstructionService.groovy** - Environment-aware URL construction following ADR-048

## Database Utilities

- **DatabaseUtil pattern** - Connection pooling with test/production mode detection (MANDATORY usage)
- **DatabaseFieldDebugUtil** - Field mapping validation, query debugging, performance analysis
- **Integration requirement** - All repositories must use DatabaseUtil.withSql pattern

## Security & Authentication

- **AuthenticationService** - User context retrieval, role validation, session management
- **RBACUtil** - Role-Based Access Control with permission validation
- **RateLimiter/RateLimitManager** - Request rate limiting and abuse prevention
- **ErrorSanitizer** - SQL injection prevention and sensitive data hiding

## Email & Communication

- **EmailService/EnhancedEmailService** - Template rendering, SMTP integration, mobile optimization
- **StepNotificationIntegration** - Step-specific email templates and status-based notifications
- **Mobile-responsive templates** - Enhanced formatting with US-039 mobile optimization

## Architecture Compliance

- **ADR alignment** - ADR-010 (connection pooling), ADR-031 (type safety), ADR-042 (authentication), ADR-048 (URL construction)
- **Security standards** - Input validation, output encoding, error sanitization, access control
- **Performance optimization** - Caching, connection pooling, resource management, lazy loading
- **US-088 integration** - Build orchestration support with 84% deployment size reduction

### Authentication & Security Utilities

**AuthenticationService.groovy**

- **Purpose**: Core authentication logic with ScriptRunner integration
- **Features**: User context retrieval, role validation, session management
- **Pattern**: [ADR-042](../../../docs/adr/ADR-042-dual-authentication-context-management.md) - Dual authentication context
- **Integration**: Used by all APIs requiring user authentication

**RBACUtil.groovy**

- **Purpose**: Role-Based Access Control utilities
- **Features**: Permission validation, role checking, access control enforcement
- **Security**: Implements RBAC patterns for secure access control
- **Integration**: Used by APIs and macros requiring role-based security

### Security Infrastructure

**RateLimiter.groovy**

- **Purpose**: Basic rate limiting implementation
- **Features**: Request rate limiting, abuse prevention, configurable limits
- **Security**: Prevents API abuse and DOS attacks
- **Integration**: Used by high-traffic API endpoints

**security/ErrorSanitizer.groovy**

- **Purpose**: Security-focused error message sanitization
- **Features**: SQL injection prevention, sensitive data hiding, safe error responses
- **Security**: Prevents information disclosure through error messages
- **Integration**: Used by all API error handling

**security/RateLimitManager.groovy**

- **Purpose**: Advanced rate limiting with persistence
- **Features**: Distributed rate limiting, persistent counters, sophisticated algorithms
- **Security**: Enterprise-grade rate limiting for production environments
- **Integration**: Production API endpoints and security layer

### Email Services

**EmailService.groovy**

- **Purpose**: Core email functionality for notifications
- **Features**: Template rendering, SMTP integration, attachment support
- **Integration**: Step notifications, user communications, automated alerts
- **Configuration**: Environment-aware SMTP configuration

**EnhancedEmailService.groovy**

- **Purpose**: Advanced email service with mobile optimization
- **Features**: Mobile-responsive templates, rich formatting, enhanced attachments
- **Integration**: [US-039](../../../docs/roadmap/sprint6/US-039-enhanced-email-notifications.md) - Enhanced email notifications
- **Templates**: Mobile-optimized HTML templates with responsive design

**StepNotificationIntegration.groovy**

- **Purpose**: Specialized step notification logic
- **Features**: Step-specific email templates, status-based notifications, user targeting
- **Integration**: Step workflow notifications, status change alerts
- **Pattern**: Event-driven notification system

### JSON & Data Utilities

**JsonUtil.groovy**

- **Purpose**: JSON processing utilities with validation
- **Features**: JSON parsing, validation, pretty printing, error handling
- **Security**: Safe JSON parsing with injection prevention
- **Integration**: API request/response processing, configuration management

### URL & Construction Services

**UrlConstructionService.groovy**

- **Purpose**: Environment-aware URL construction
- **Features**: Dynamic URL building, environment detection, parameter handling
- **Pattern**: [ADR-048](../../../docs/adr/ADR-048-url-construction-service.md) - URL construction service
- **Integration**: Email templates, API responses, frontend redirects

### Audit & Monitoring Utilities

**AuditFieldsUtil.groovy**

- **Purpose**: Standardized audit field management
- **Features**: Created/modified timestamps, user tracking, audit trail
- **Pattern**: Consistent audit field handling across all entities
- **Integration**: All repository operations requiring audit trails

### API Validation

**ApiPatternValidator.groovy**

- **Purpose**: API pattern compliance validation
- **Features**: ADR compliance checking, pattern validation, standard enforcement
- **Quality**: Ensures API endpoints follow UMIG standards
- **Integration**: Development validation, quality gates, ADR enforcement

## 🔧 Utility Integration Patterns

### Repository Integration

All repositories must use DatabaseUtil:

```groovy
import umig.utils.DatabaseUtil

class ExampleRepository {
    def findById(UUID id) {
        DatabaseUtil.withSql { sql ->
            return sql.firstRow('SELECT * FROM table WHERE id = ?', [id])
        }
    }
}
```

### API Security Integration

APIs use multiple security utilities:

```groovy
import umig.utils.AuthenticationService
import umig.utils.RBACUtil
import umig.utils.security.RateLimitManager

// API endpoint with security
def authService = new AuthenticationService()
def currentUser = authService.getCurrentUser()

// Rate limiting
def rateLimiter = new RateLimitManager()
rateLimiter.checkLimit(request)

// RBAC validation
if (!RBACUtil.hasPermission(currentUser, "read:steps")) {
    return Response.status(403).build()
}
```

### Email Integration

Email utilities work together for notifications:

```groovy
import umig.utils.EnhancedEmailService
import umig.utils.UrlConstructionService

def emailService = new EnhancedEmailService()
def urlService = new UrlConstructionService()

def templateData = [
    stepUrl: urlService.buildStepUrl(stepId),
    userContext: authService.getUserContext()
]

emailService.sendStepNotification(templateData)
```

## 🎯 Utility Design Patterns

### Singleton Pattern

Many utilities use singleton pattern for performance:

```groovy
class DatabaseUtil {
    private static DatabaseUtil instance

    static DatabaseUtil getInstance() {
        if (!instance) {
            instance = new DatabaseUtil()
        }
        return instance
    }
}
```

### Configuration-Driven

Utilities support environment-specific configuration:

```groovy
class EmailService {
    private Properties getEmailConfig() {
        def env = System.getProperty("environment", "development")
        return loadConfiguration("email-${env}.properties")
    }
}
```

### Thread-Safe Operations

Utilities designed for concurrent access:

```groovy
class RateLimitManager {
    private final ConcurrentHashMap<String, AtomicInteger> counters = new ConcurrentHashMap<>()

    synchronized boolean checkLimit(String key) {
        // Thread-safe rate limiting logic
    }
}
```

## 📊 Quality & Performance

### Error Handling

All utilities implement comprehensive error handling:

```groovy
try {
    return processData(input)
} catch (SecurityException e) {
    log.warn("Security violation: ${e.message}")
    throw new UtilityException("Access denied", e)
} catch (Exception e) {
    log.error("Utility operation failed", e)
    throw new UtilityException("Operation failed", e)
}
```

### Performance Optimization

- **Caching**: Frequently accessed data cached in utilities
- **Connection Pooling**: Efficient database connection management
- **Resource Management**: Proper cleanup and resource disposal
- **Lazy Loading**: Resources loaded only when needed

### Security Standards

- **Input Validation**: All inputs validated and sanitized
- **Output Encoding**: Safe output encoding to prevent XSS
- **Error Sanitization**: Error messages sanitized for security
- **Access Control**: Proper authentication and authorization

## 🔗 Architecture Compliance

### ADR Alignment

- **[ADR-010](../../../docs/adr/ADR-010-Database-Connection-Pooling.md)**: Database connection pooling
- **[ADR-031](../../../docs/adr/ADR-031-Type-Safety-Improvements.md)**: Type safety in utility methods
- **[ADR-042](../../../docs/adr/ADR-042-dual-authentication-context-management.md)**: Authentication utilities
- **[ADR-048](../../../docs/adr/ADR-048-url-construction-service.md)**: URL construction service

### Utility Standards

- **Single Responsibility**: Each utility has one focused purpose
- **Type Safety**: Explicit type casting throughout utility methods
- **Error Handling**: Comprehensive exception management
- **Security First**: Security considerations in all utility design
- **Performance**: Optimized for high-throughput operations

### Integration Requirements

- **Repository Integration**: All data access through DatabaseUtil
- **Security Integration**: Authentication and authorization through dedicated utilities
- **Configuration**: Environment-aware configuration support
- **Monitoring**: Comprehensive logging for operational monitoring

## 🚧 Development Guidelines

### Adding New Utilities

1. **Define Clear Purpose**: Single, well-defined utility function
2. **Follow Naming Convention**: Clear, descriptive class names ending in 'Util' or 'Service'
3. **Implement Security**: Security considerations for all operations
4. **Add Documentation**: Clear javadoc with usage examples
5. **Write Tests**: Comprehensive unit tests for all utility methods

### Utility Testing Strategy

```groovy
// Utility test pattern
class DatabaseUtilTest extends Specification {
    def "should execute closure with SQL connection"() {
        given:
        def testQuery = "SELECT 1"
        def expectedResult = [result: 1]

        when:
        def result = DatabaseUtil.withSql { sql ->
            return sql.firstRow(testQuery)
        }

        then:
        result == expectedResult
    }
}
```

### Performance Considerations

- **Stateless Design**: Utilities should be stateless when possible
- **Thread Safety**: Consider concurrent access patterns
- **Resource Management**: Proper cleanup of resources
- **Caching Strategy**: Cache expensive operations appropriately

## 📖 Related Documentation

- **[Repository Layer README](../repository/README.md)**: DatabaseUtil integration
- **[API Layer README](../api/README.md)**: Security and authentication integration
- **[Service Layer README](../service/README.md)**: Utility service integration
- **[Testing README](../tests/README.md)**: Utility testing strategies
- **[Security Documentation](../../../docs/security/README.md)**: Security utility usage

### Build Process Integration (US-088 Complete)

All utility classes support comprehensive build orchestration with US-088 4-phase build process:

- **Utility Packaging**: Self-contained utility packaging with 84% deployment size reduction
- **Dependency Management**: Utility dependencies managed through US-088 build orchestration
- **Performance Optimisation**: Utility performance improved with build process integration
- **Testing Integration**: Utility testing integrated with 4-phase build validation

### Enhanced Utility Features (Sprint 7 - 224% Achievement)

**US-088-B Database Integration**:

- **Schema Compatibility**: Utilities compatible with Liquibase-managed database schemas
- **Version Synchronisation**: Database utilities synchronised with schema version management
- **Migration Support**: Utilities support database migration with version control integration

**ADR-061 ScriptRunner Integration**:

- **Endpoint Pattern Support**: Utilities aligned with ADR-061 ScriptRunner endpoint patterns
- **Performance Improvements**: Utility performance optimised with endpoint pattern compliance
- **Security Enhancement**: Enhanced security controls aligned with ScriptRunner patterns

### Strategic Utility Roadmap (Post US-088)

**Planned Utility Enhancements**:

- **BuildOrchestrationUtil**: Utility support for build process coordination
- **DatabaseVersionUtil**: Utilities for US-088-B database version management
- **DeploymentOptimisationUtil**: Self-contained deployment utility optimisation
- **PerformanceMonitoringUtil**: Enhanced monitoring with build process integration

**Enhancement Opportunities**:

- **Microservice Utilities**: Utility decomposition with US-088 self-contained patterns
- **Event-Driven Utilities**: Utility event architecture with build process integration
- **Auto-Scaling Utilities**: Dynamic utility scaling with build process metrics
- **Advanced Security**: Enhanced security utilities with build process integration

---

**Last Updated**: September 2025 (Sprint 7) - US-088 Complete, 224% Sprint Achievement
**Architecture Version**: Core infrastructure utilities + US-088 Build Process Integration
**Build Process**: 4-phase orchestration complete with self-contained utility deployment
**Pattern Compliance**: Single responsibility + ADR-061 endpoint patterns + comprehensive error handling
**Integration Status**: Complete with all UMIG layers + US-088-B Database Version Manager
**Quality Score**: Production-ready with security hardening + 100% utility test pass rate
**Sprint Achievement**: 224% completion rate with US-088 build orchestration and 84% deployment optimisation
