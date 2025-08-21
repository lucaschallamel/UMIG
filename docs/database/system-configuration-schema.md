# System Configuration Schema Documentation

## Overview

The system configuration schema provides centralized management for runtime configuration settings, Confluence macro locations, and environment-specific parameters in the UMIG application.

## Database Schema

### Primary Table: `system_configuration_scf`

Central configuration table storing all system settings with environment isolation.

```sql
CREATE TABLE system_configuration_scf (
    scf_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    env_id INTEGER NOT NULL,                    -- FK to environments_env
    scf_key VARCHAR(255) NOT NULL,              -- Configuration key (unique per environment)
    scf_category VARCHAR(100) NOT NULL,         -- MACRO_LOCATION, API_CONFIG, SYSTEM_SETTING
    scf_value TEXT NOT NULL,                    -- Configuration value (supports all data types)
    scf_description TEXT,                       -- Human-readable description
    scf_is_active BOOLEAN DEFAULT TRUE,         -- Enable/disable configuration
    scf_is_system_managed BOOLEAN DEFAULT FALSE, -- System vs user managed
    scf_data_type VARCHAR(50) DEFAULT 'STRING', -- STRING, INTEGER, BOOLEAN, JSON, URL
    scf_validation_pattern VARCHAR(500),        -- Regex validation pattern
    -- Standard audit fields
    created_by VARCHAR(255) DEFAULT 'system',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255) DEFAULT 'system',
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    -- Constraints
    CONSTRAINT fk_scf_env_id FOREIGN KEY (env_id) REFERENCES environments_env(env_id),
    CONSTRAINT unique_scf_key_per_env UNIQUE (env_id, scf_key)
);
```

### History Table: `system_configuration_history_sch`

Audit trail for all configuration changes with comprehensive change tracking.

```sql
CREATE TABLE system_configuration_history_sch (
    sch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scf_id UUID NOT NULL,                      -- FK to system_configuration_scf
    sch_old_value TEXT,                        -- Previous value (NULL for CREATE)
    sch_new_value TEXT NOT NULL,               -- New value
    sch_change_reason VARCHAR(500),            -- Human-readable reason
    sch_change_type VARCHAR(50) NOT NULL,      -- CREATE, UPDATE, DELETE, ACTIVATE, DEACTIVATE
    created_by VARCHAR(255) DEFAULT 'system',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sch_scf_id FOREIGN KEY (scf_id) REFERENCES system_configuration_scf(scf_id) ON DELETE CASCADE
);
```

## Configuration Categories

### MACRO_LOCATION

Confluence macro deployment settings:

- `stepview.confluence.space.key` - Confluence space key
- `stepview.confluence.page.id` - Page ID containing macro
- `stepview.confluence.page.title` - Page title
- `stepview.confluence.base.url` - Confluence base URL

### API_CONFIG

API runtime settings:

- `api.rate.limit.requests.per.minute` - Rate limiting
- `api.timeout.seconds` - Request timeout
- `api.retry.attempts` - Retry configuration

### SYSTEM_SETTING

General system configuration:

- `system.debug.enabled` - Debug mode
- `system.maintenance.mode` - Maintenance status
- `system.cache.ttl.minutes` - Cache settings

## Data Types & Validation

### Supported Data Types

- **STRING**: Text values (default)
- **INTEGER**: Numeric integers with validation
- **BOOLEAN**: true/false values
- **JSON**: Valid JSON structures
- **URL**: Valid URL format validation

### Validation Patterns

Regular expressions for value validation:

- Page IDs: `^[0-9]+$`
- Space Keys: `^[A-Z][A-Z0-9_-]{1,254}$`
- Email addresses: Standard email regex
- Custom patterns per configuration

## Repository Implementation

### SystemConfigurationRepository

Comprehensive data access layer with validation and audit support.

#### Key Methods

**Environment-based Queries**

```groovy
List findActiveConfigurationsByEnvironment(Integer envId)
Map findConfluenceConfigurationForEnvironment(Integer envId)
```

**Category-based Queries**

```groovy
List findConfigurationsByCategory(String category, Integer envId = null)
List findConfluenceMacroLocations(Integer envId = null)
```

**CRUD Operations**

```groovy
UUID createConfiguration(Map params, String createdBy = 'system')
boolean updateConfigurationValue(UUID scfId, String newValue, String updatedBy, String changeReason)
boolean updateConfigurationByKey(String key, Integer envId, String newValue, String updatedBy, String changeReason)
```

**Validation & History**

```groovy
Map validateConfigurationValue(String value, String dataType, String validationPattern = null)
List findConfigurationHistory(UUID scfId, int limit = 50)
```

**Bulk Operations**

```groovy
int bulkUpdateConfigurations(List<Map> configurations, String updatedBy = 'system')
Map findAllConfigurationsGroupedByEnvironment()
```

## API Endpoints

### SystemConfigurationApi

RESTful API for configuration management with comprehensive CRUD operations.

#### GET `/api/v2/systemConfiguration`

Retrieve configurations with filtering:

- `?envId=1` - Filter by environment
- `?category=MACRO_LOCATION` - Filter by category
- `?key=stepview.confluence.space.key&envId=1` - Get specific config
- `?includeHistory=true` - Include change history

#### POST `/api/v2/systemConfiguration`

Create new configuration:

```json
{
  "envId": 1,
  "scfKey": "new.config.key",
  "scfCategory": "SYSTEM_SETTING",
  "scfValue": "config value",
  "scfDescription": "Configuration description",
  "scfDataType": "STRING",
  "scfValidationPattern": "^[a-zA-Z0-9]+$"
}
```

#### PUT `/api/v2/systemConfiguration/byKey`

Update by key and environment:

```json
{
  "envId": 1,
  "scfKey": "config.key",
  "scfValue": "new value",
  "changeReason": "Updated for deployment"
}
```

#### GET `/api/v2/systemConfiguration/confluenceMacro`

Specialized endpoint for Confluence macro configurations:

- `?envId=1` - Environment-specific macro settings

#### POST `/api/v2/systemConfiguration/bulk`

Bulk update operations:

```json
{
  "configurations": [
    {
      "envId": 1,
      "scfKey": "config.key1",
      "scfValue": "new value1"
    }
  ]
}
```

## Default Configuration Data

### Environment-Specific Defaults

The migration automatically creates default configurations for all environments:

**Development Environment**

```
stepview.confluence.space.key = "UMIG-DEV"
stepview.confluence.page.id = "12345678"
stepview.confluence.base.url = "http://localhost:8090"
api.rate.limit.requests.per.minute = "1000"
system.debug.enabled = "true"
```

**Production Environment**

```
stepview.confluence.space.key = "UMIG-PROD"
stepview.confluence.page.id = "12345680"
stepview.confluence.base.url = "https://confluence.company.com"
api.rate.limit.requests.per.minute = "300"
system.debug.enabled = "false"
```

## Security & Access Control

### Authentication

- All API endpoints require `confluence-users` group membership
- User identity captured in audit fields via `AuthenticationService`

### Authorization

- System-managed configurations (`scf_is_system_managed = true`) should have restricted update access
- Environment-based isolation prevents cross-environment data access
- Admin interfaces can access all environments with proper role validation

## Performance Optimizations

### Database Indexes

```sql
CREATE INDEX idx_scf_env_category ON system_configuration_scf(env_id, scf_category);
CREATE INDEX idx_scf_key_active ON system_configuration_scf(scf_key, scf_is_active);
CREATE INDEX idx_scf_category_active ON system_configuration_scf(scf_category, scf_is_active);
CREATE INDEX idx_sch_scf_id ON system_configuration_history_sch(scf_id);
```

### Query Patterns

- Environment-scoped queries for application runtime
- Category-based queries for configuration management UIs
- Key-based lookups for specific configuration retrieval
- History queries with pagination for audit trails

## Automated Triggers

### Update Timestamp Trigger

```sql
CREATE TRIGGER update_system_configuration_updated_at
    BEFORE UPDATE ON system_configuration_scf
    FOR EACH ROW
    EXECUTE FUNCTION update_scf_updated_at();
```

### Audit History Trigger

```sql
CREATE TRIGGER audit_system_configuration_changes
    AFTER INSERT OR UPDATE ON system_configuration_scf
    FOR EACH ROW
    EXECUTE FUNCTION audit_system_configuration_changes();
```

## Integration Patterns

### Confluence Macro Integration

```groovy
def confluenceConfig = systemConfigurationRepository.findConfluenceConfigurationForEnvironment(envId)
def spaceKey = confluenceConfig.configurations["stepview.confluence.space.key"].value
def pageId = confluenceConfig.configurations["stepview.confluence.page.id"].value
def baseUrl = confluenceConfig.configurations["stepview.confluence.base.url"].value
```

### Environment-Aware Configuration

```groovy
def configs = systemConfigurationRepository.findActiveConfigurationsByEnvironment(getCurrentEnvironmentId())
configs.each { config ->
    System.setProperty(config.scf_key, config.scf_value)
}
```

## Deployment Strategy

### Migration Process

1. **Schema Creation**: Liquibase migration 022 creates tables and indexes
2. **Default Data**: Environment-specific default configurations inserted
3. **Validation**: Built-in data type and pattern validation
4. **Audit Setup**: Automatic trigger-based audit trail activation

### Configuration Management

1. **Development**: Local file-based overrides for development environments
2. **Testing**: Environment-specific validation and testing
3. **Production**: Change management process with approval workflows
4. **Rollback**: History-based rollback capabilities for configuration changes

## Monitoring & Maintenance

### Health Checks

- Configuration validation on startup
- Missing required configuration detection
- Data type consistency validation

### Maintenance Operations

- Configuration cleanup (remove unused configurations)
- History table pruning (retain X months of history)
- Performance monitoring for configuration queries

## Testing

### Unit Tests

Comprehensive test coverage in `SystemConfigurationRepositoryTest.groovy`:

- CRUD operations validation
- Data type validation testing
- Pattern matching validation
- History tracking verification
- Bulk operations testing

### Integration Tests

- End-to-end API testing
- Environment isolation validation
- Confluence macro integration testing
- Performance testing for large configuration sets

## Troubleshooting

### Common Issues

**Configuration Not Found**

- Verify environment ID and configuration key
- Check `scf_is_active` status
- Validate environment exists in `environments_env`

**Validation Failures**

- Review `scf_data_type` and `scf_validation_pattern`
- Test validation patterns with sample data
- Check for special characters in values

**Performance Issues**

- Monitor index usage on large configuration sets
- Consider pagination for admin interfaces
- Review query patterns for N+1 issues

### Debug Queries

```sql
-- Find all configurations for environment
SELECT * FROM system_configuration_scf WHERE env_id = 1 AND scf_is_active = true;

-- Check configuration history
SELECT * FROM system_configuration_history_sch WHERE scf_id = 'uuid-here' ORDER BY created_at DESC;

-- Validate data types
SELECT scf_key, scf_value, scf_data_type FROM system_configuration_scf WHERE scf_data_type != 'STRING';
```

This system configuration schema provides a robust, scalable foundation for managing runtime configuration with full audit trails, validation, and environment isolation.
