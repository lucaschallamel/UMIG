# UMIG Configuration Classes

**Purpose**: Configuration management for system settings, import queues, and database version management

## Key Files

- **ImportQueueConfiguration.groovy** - Import queue management settings (sizing, timeouts, retry policies)
- **DatabaseVersionConfiguration.groovy** - Liquibase-based Database Version Manager configuration (US-088-B)

## Configuration Patterns

- **Environment-Aware**: Support for dev/test/prod specific settings
- **Validation**: Comprehensive validation with security-focused checks
- **Secure Handling**: Environment variables for sensitive data
- **Service Integration**: Used by Import APIs, services, and version management

## Categories

- **System**: Database connections, caching, logging, security timeouts
- **Feature**: Feature flags, component enablement, UI parameters
- **Performance**: Thread pools, memory limits, timeouts, batch processing
- **Security**: Authentication, rate limiting, session timeouts, CSRF protection

## Integration Points

- Service Layer: Configuration for business logic operations
- API Layer: Operational parameters and security settings
- Database Version Manager: Liquibase changelog orchestration (US-088-B)
- Import System: Queue processing and performance tuning
