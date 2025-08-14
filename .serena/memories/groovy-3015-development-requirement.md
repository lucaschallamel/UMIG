# Groovy 3.0.15 Development Environment Requirement

## Critical Requirement

**UMIG requires Groovy 3.0.15 specifically** for local command-line development and testing.

## Why Groovy 3.0.15 Specifically?

- **ScriptRunner 9.21.0 Compatibility**: The Confluence ScriptRunner environment uses Groovy 3.0.15
- **ADR-031 Type Safety**: Type casting patterns (`as String`, `as Integer`) require this version
- **Static Type Checking**: Recent codebase improvements depend on 3.0.15 compatibility
- **Testing Consistency**: Local testing must match containerized ScriptRunner environment

## Installation Method (SDKMAN Recommended)

```bash
# Install SDKMAN
curl -s "https://get.sdkman.io" | bash
source ~/.sdkman/bin/sdkman-init.sh

# Install Groovy 3.0.15
sdk install groovy 3.0.15
sdk default groovy 3.0.15

# Verify
groovy --version  # Should show: Groovy Version: 3.0.15
```

## Local Testing Pattern

```groovy
@Grab('org.postgresql:postgresql:42.6.0')
import groovy.sql.Sql

def withSql(closure) {
    def url = "jdbc:postgresql://localhost:5432/umig_db"
    def sql = Sql.newInstance(url, "umig_user", "umig_password", "org.postgresql.Driver")
    try {
        return closure(sql)
    } finally {
        sql.close()
    }
}

// Test repository patterns locally
withSql { sql ->
    def steps = sql.rows("SELECT sti_id, sti_name FROM tbl_step_instances LIMIT 5")
    println "Found ${steps.size()} steps"
}
```

## Documentation Location

- **Main Documentation**: `/Users/lucaschallamel/Documents/GitHub/UMIG/local-dev-setup/README.md`
- **Updated**: August 14, 2025
- **Section**: Prerequisites and Groovy 3.0.15 Installation

## Development Workflow Benefits

- **Local Testing**: Test repository methods before deployment
- **API Development**: Validate database queries and type safety
- **Pattern Consistency**: Ensure local development matches ScriptRunner environment
- **Performance Testing**: Benchmark queries outside container environment

## Integration with UMIG Patterns

- Uses same `DatabaseUtil.withSql` pattern as production code
- Supports ADR-031 type safety casting patterns
- Compatible with existing repository and API patterns
- Works with all UMIG database operations and testing frameworks

This requirement is **essential** for effective UMIG development and should be included in all developer onboarding and environment setup processes.
