# Utility Scripts

Purpose: Cross-platform development tools for Groovy integration, email testing, API documentation, and workflow automation

## Groovy Integration

### groovy-with-jdbc.js

- **Purpose**: Run Groovy scripts with PostgreSQL JDBC classpath
- **Usage**: `node scripts/utilities/groovy-with-jdbc.js your-script.groovy`
- **Features**: Cross-platform execution, automatic JDBC integration, comprehensive error handling

### setup-groovy-classpath.js

- **Purpose**: Manage GROOVY_CLASSPATH and CLASSPATH environment variables
- **Usage**: `npm run groovy:classpath`
- **Commands**: setup, status, reset

## Email Testing

### email-database-sender.js

- **Purpose**: Database-driven email testing with MailHog SMTP
- **Usage**: `npm run email:test:database`
- **Features**: Database template retrieval, real SMTP testing, mobile-responsive templates

### demo-enhanced-email.js

- **Purpose**: Email template demonstration and validation
- **Usage**: `npm run email:demo`
- **Features**: Template showcase, visual validation, multi-device testing

### test-mailhog-smtp.js

- **Purpose**: MailHog SMTP connectivity testing
- **Usage**: `npm run mailhog:test`
- **Features**: Connection testing, configuration verification, health monitoring

## API Documentation

### fix-openapi-examples.js

- **Purpose**: OpenAPI specification example validation and fixing
- **Features**: Example validation, automatic fixing, schema compliance

### fix-openapi-security.js

- **Purpose**: OpenAPI security configuration validation
- **Features**: Security schema validation, authentication configuration

### remove-duplicate-security.js

- **Purpose**: Remove duplicate security configurations from OpenAPI specs
- **Features**: Duplicate detection, clean-up operations

## Integration Commands

```bash
# Groovy utilities
npm run groovy:classpath        # Environment setup
npm run test:groovy:unit        # Uses groovy-with-jdbc.js

# Email utilities
npm run email:test:database     # Database email testing
npm run mailhog:test            # SMTP connectivity testing

# API utilities
npm run validate:openapi        # OpenAPI validation
```

## Features

- Cross-platform compatibility (Windows/macOS/Linux)
- Zero shell script dependencies
- Self-contained architecture support
- Enterprise-grade security integration
- 100% test success rate compatibility
