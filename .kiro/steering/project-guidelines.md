# Project Guidelines & Standards

## Documentation Requirements
- Update relevant documentation in `/docs` when modifying features
- Keep README.md in sync with new capabilities
- Maintain changelog entries in CHANGELOG.md
- All major changes must be reflected in README, ADRs, dev journals, and changelogs
- Use and maintain templates for sprint reviews and journal entries

## Architecture Decision Records (ADRs)
Create ADRs in `/docs/adr` for:
- Major dependency changes
- Architectural pattern changes
- New integration patterns
- Database schema changes
- Follow template in `/docs/adr/template.md`

## UMIG-Specific Patterns
- **REST Endpoints**: Must follow `CustomEndpointDelegate` pattern in package-scoped Groovy files
- **Package Declaration**: Always declare package at top of each endpoint file
- **Repository Pattern**: Use for all data access
- **Database Access**: Use `DatabaseUtil.withSql` pattern exclusively
- **Frontend**: Pure vanilla JavaScript with Atlassian AUI styling only
- **Security**: Include `groups: ["confluence-users"]` on all endpoints

## Testing Standards
- Unit tests required for business logic
- Integration tests for API endpoints
- E2E tests for critical user flows
- All critical endpoints and data utilities must have integration tests
- Synthetic data scripts must be idempotent and robust

## Security Requirements
- Input validation for all external data
- Proper authentication, authorization, and data protection
- Rate limit all API endpoints
- Use row-level security (RLS)
- Never read or modify without approval:
  - .env files
  - **/config/secrets.*
  - Any file containing API keys or credentials

## Database Management
- Use Liquibase for all schema changes (manual changes prohibited)
- Store all migration scripts under version control
- All environments must use same migration process
- Maintain up-to-date Entity Relationship Diagram (ERD)
- Use snake_case for all database identifiers
- Document all migrations with rationale

## Code Quality & CI/CD
- All code must pass linting and formatting checks before merge
- CI must run all tests and block merges on failure
- Use MegaLinter for multi-language linting
- Integrate Semgrep for static analysis and security scanning

## Local Development
- Use Podman containers with Ansible for environment setup
- Provide wrapper scripts for starting/stopping environment
- Ensure all environment configuration is version-controlled
- Never overwrite .env files without confirmation

## Project Structure Preferences
- Avoid unnecessary build complexity
- Keep files under 200-300 lines
- Prefer simple solutions over complex patterns
- Avoid duplication - check for existing similar functionality
- Make only requested changes or well-understood related changes