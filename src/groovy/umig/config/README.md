# UMIG Configuration

This directory contains configuration classes and settings for various UMIG components and services.

## 📋 Configuration Files

### Import System Configuration

**ImportQueueConfiguration.groovy**

- **Purpose**: Configuration settings for import queue management system
- **Features**: Queue sizing, timeout settings, retry policies, performance parameters
- **Integration**: Used by Import APIs, ImportOrchestrationService, and queue management
- **Pattern**: Centralized configuration with environment-specific overrides

```groovy
class ImportQueueConfiguration {
    static final int DEFAULT_QUEUE_SIZE = 1000
    static final int DEFAULT_TIMEOUT_SECONDS = 300
    static final int DEFAULT_RETRY_ATTEMPTS = 3
    static final int DEFAULT_BATCH_SIZE = 100

    // Queue management settings
    int maxQueueSize = DEFAULT_QUEUE_SIZE
    int processingTimeoutSeconds = DEFAULT_TIMEOUT_SECONDS
    int maxRetryAttempts = DEFAULT_RETRY_ATTEMPTS
    int batchSize = DEFAULT_BATCH_SIZE

    // Performance tuning
    boolean enableParallelProcessing = true
    int maxConcurrentJobs = 5
    int threadPoolSize = 10
}
```

## 🔧 Configuration Patterns

### Environment-Aware Configuration

All configuration classes follow environment-aware patterns:

```groovy
class BaseConfiguration {
    private String environment = System.getProperty('umig.environment', 'development')

    protected Properties loadEnvironmentConfig(String configName) {
        def configFile = "${configName}-${environment}.properties"
        return loadPropertiesFile(configFile)
    }

    protected <T> T getConfigValue(String key, T defaultValue, Class<T> type) {
        def envValue = System.getProperty("umig.${key}")
        if (envValue) {
            return convertValue(envValue, type)
        }
        return defaultValue
    }
}
```

### Configuration Validation

Configuration classes include validation:

```groovy
class ValidatedConfiguration {
    void validate() {
        if (maxQueueSize <= 0) {
            throw new IllegalArgumentException("Queue size must be positive")
        }

        if (processingTimeoutSeconds < 30) {
            throw new IllegalArgumentException("Timeout must be at least 30 seconds")
        }

        if (maxRetryAttempts < 0 || maxRetryAttempts > 10) {
            throw new IllegalArgumentException("Retry attempts must be between 0 and 10")
        }
    }
}
```

## 🎯 Integration Patterns

### Service Integration

Configuration classes integrate with UMIG services:

```groovy
// Import service using configuration
import umig.config.ImportQueueConfiguration

class ImportService {
    private ImportQueueConfiguration config

    ImportService() {
        this.config = new ImportQueueConfiguration()
        this.config.validate()
    }

    def processImport(importData) {
        def queue = createQueue(config.maxQueueSize)
        def timeout = config.processingTimeoutSeconds * 1000

        return processWithTimeout(importData, timeout)
    }
}
```

### API Integration

APIs use configuration for operational parameters:

```groovy
// API using configuration
import umig.config.ImportQueueConfiguration

importApi(httpMethod: "POST", groups: ["confluence-users"]) { request, binding ->
    def config = new ImportQueueConfiguration()

    if (request.contentLength > config.maxFileSize) {
        return Response.status(413).entity([
            error: "File too large",
            maxSize: config.maxFileSize
        ]).build()
    }

    // Process with configuration settings
}
```

## 📊 Configuration Categories

### System Configuration

- Database connection settings
- Cache configuration
- Logging levels and output
- Security settings and timeouts

### Feature Configuration

- Feature flags and toggles
- Component enablement settings
- UI configuration parameters
- Integration endpoint settings

### Performance Configuration

- Thread pool sizing
- Memory allocation limits
- Timeout values
- Batch processing parameters

### Security Configuration

- Authentication settings
- Rate limiting parameters
- Session timeout values
- CSRF protection settings

## 🔒 Security Considerations

### Sensitive Configuration

Sensitive configuration handled securely:

```groovy
class SecureConfiguration {
    // Use environment variables for sensitive data
    String getDatabasePassword() {
        return System.getenv('UMIG_DB_PASSWORD') ?:
               loadFromSecureStore('database.password')
    }

    String getApiKey() {
        def key = System.getenv('UMIG_API_KEY')
        if (!key) {
            throw new SecurityException("API key not configured")
        }
        return key
    }
}
```

### Configuration Validation

Security-focused validation:

```groovy
class SecurityConfigValidation {
    void validateSecuritySettings() {
        // Ensure minimum security standards
        if (sessionTimeoutMinutes < 30) {
            throw new SecurityException("Session timeout too short")
        }

        if (maxLoginAttempts > 10) {
            throw new SecurityException("Max login attempts too high")
        }

        // Validate encryption settings
        validateEncryptionConfiguration()
    }
}
```

## 🚧 Development Guidelines

### Adding New Configuration

1. **Extend BaseConfiguration**: Use common configuration patterns
2. **Environment Support**: Include environment-specific overrides
3. **Validation**: Implement comprehensive validation
4. **Documentation**: Clear documentation of all settings
5. **Security**: Secure handling of sensitive values

### Configuration Testing

```groovy
// Configuration test pattern
class ImportQueueConfigurationTest extends Specification {
    def "should load default configuration"() {
        when:
        def config = new ImportQueueConfiguration()

        then:
        config.maxQueueSize == ImportQueueConfiguration.DEFAULT_QUEUE_SIZE
        config.processingTimeoutSeconds == ImportQueueConfiguration.DEFAULT_TIMEOUT_SECONDS
    }

    def "should validate configuration values"() {
        given:
        def config = new ImportQueueConfiguration()
        config.maxQueueSize = -1

        when:
        config.validate()

        then:
        thrown(IllegalArgumentException)
    }
}
```

## 📖 Related Documentation

- **[Service Layer README](../service/README.md)**: Service configuration integration
- **[API Layer README](../api/README.md)**: API configuration usage
- **[Utility Classes README](../utils/README.md)**: Configuration utility classes
- **[Testing README](../tests/README.md)**: Configuration testing strategies

---

**Last Updated**: September 2025 (Sprint 7)
**Configuration Status**: Import queue configuration implemented
**Integration**: Complete with import system and APIs
**Security**: Secure configuration handling with validation
