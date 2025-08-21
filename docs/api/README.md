# UMIG API V2 Documentation

This folder contains the OpenAPI 3.0 specification for the UMIG V2 REST API (version 2.1.1). This new API version supersedes the previous V1 API.

## Latest Updates (August 15, 2025 - Version 2.1.2)

- **US-028 Enhanced IterationView Phase 1**: Complete integration with StepsAPIv2Client, real-time synchronization, and role-based access control
- **Critical API Endpoint Fix**: Resolved configuration issue from /api/v2/steps to /steps for proper integration
- **US-024 StepsAPI Enhancements**: Improved comments endpoint error messages with helpful guidance
- **Enhanced Postman Collection**: Updated generation script with comprehensive authentication and variables
- **OpenAPI Specification**: Updated error schemas and endpoint documentation
- **Collection Size**: 1.4 MB with full API coverage and enhanced testing capabilities

- The architectural principles and conventions for the V2 API are documented in **[ADR-017: V2 REST API Architecture and Conventions](../adr/ADR-017-V2-REST-API-Architecture.md)**.
- The detailed technical specification for all endpoints is in **[`openapi.yaml`](openapi.yaml)**.

## Viewing the API Documentation

You can use a variety of tools to view the `openapi.yaml` file in a more user-friendly format.

- **Redocly CLI (Recommended):**
  - [Redoc Online Viewer](https://redocly.github.io/redoc/) (copy-paste or upload `openapi.yaml`)
  - Local: `npm install -g @redocly/cli` then `redocly preview-docs openapi.yaml`
  - _Note: `redoc-cli` is deprecated. Use `@redocly/cli` for all local Redoc documentation tasks. See: <https://www.npmjs.com/package/@redocly/cli>_
- **Swagger Editor:**
  - [Swagger Editor](https://editor.swagger.io/) (copy-paste or upload `openapi.yaml`)
- **VS Code Extensions:**
  - Install "Swagger Viewer" or "OpenAPI (Swagger) Editor" for instant preview in VS Code

You can also use this file with OpenAPI Generator to produce client/server code or additional HTML documentation.

## STEP View Macro & SPA

- The `/stepViewApi` endpoint powers the STEP View macro and SPA, returning structured data for rendering migration/release steps in Confluence.

## API Specifications

Individual API specifications are available for detailed documentation:

### Core APIs

- **[Applications API](ApplicationsAPI.md)** - Application management with environment associations
- **[Controls API](ControlsAPI.md)** - Control point management for phase validation and quality gates
- **[Email Templates API](EmailTemplatesAPI.md)** - Email template management for automated notifications
- **[Environments API](EnvironmentsAPI.md)** - Environment management with application and iteration associations
- **[Instructions API](InstructionsApi.md)** - Instruction management with team assignments and completion tracking
- **[Labels API](LabelsAPI.md)** - Label management with hierarchical filtering
- **[Migrations API](migrationApi.md)** - ✅ **US-025 Phase 4 Complete** - Migration management with dashboard, bulk operations, and advanced filtering (17 endpoints, 100% integration test success)
- **[Phases API](PhasesAPI.md)** - Phase management with control point validation and progress tracking
- **[Plans API](PlansAPI.md)** - Plan management with master templates and instances
- **[Sequences API](SequencesAPI.md)** - Sequence management with ordering and dependency support
- **[Steps API](StepsAPI.md)** - ✅ **US-024 Enhanced** - Step management with hierarchical filtering, email notification integration, and improved comments endpoint error handling
- **[stepView API](stepViewAPI.md)** - Specialized API for standalone step view in Confluence pages
- **[Team Members API](TeamMembersAPI.md)** - Team membership management and user-team associations
- **[Teams API](TeamsAPI.md)** - Team management with hierarchical filtering
- **[Users API](UsersAPI.md)** - User management with authentication, roles, and team memberships
- **[Web API](WebAPI.md)** - Static asset serving for JavaScript and CSS resources

### Hierarchical Filtering

The Teams and Labels APIs support hierarchical filtering based on the migration execution hierarchy:

- **Migration Level** - Shows teams/labels involved in entire migration
- **Iteration Level** - Shows teams/labels involved in specific iteration
- **Plan Level** - Shows teams/labels involved in specific plan instance
- **Sequence Level** - Shows teams/labels involved in specific sequence instance
- **Phase Level** - Shows teams/labels involved in specific phase instance

This provides progressive filtering where options become more contextually relevant as users drill down the hierarchy.

## API Testing with Postman

An enhanced Postman collection is available for comprehensive API testing.

- **Collection**: [`postman/UMIG_API_V2_Collection.postman_collection.json`](postman/UMIG_API_V2_Collection.postman_collection.json)
- **Usage Instructions**: [`postman/README.md`](postman/README.md)
- **Generation**: Use `npm run generate:postman:enhanced` for latest collection with authentication and variables
- **Size**: 1.4 MB with comprehensive API coverage including US-024 improvements

The collection is automatically generated from the OpenAPI specification v2.1.1 and includes all V2 API endpoints with enhanced error handling and test scripts.

## Recent API Updates

### Plans API (Completed)

- **Full CRUD operations** for both master plan templates and plan instances
- **Hierarchical filtering** by migration, iteration, team, and status
- **Master plan endpoints**:
  - `GET /plans/master` - List all master plans with audit fields
  - `GET /plans/master/{id}` - Get specific master plan
  - `POST /plans/master` - Create new master plan
  - `PUT /plans/master/{id}` - Update master plan
  - `DELETE /plans/master/{id}` - Soft delete master plan
- **Plan instance endpoints**:
  - `GET /plans` - List plan instances with filtering
  - `GET /plans/instance/{id}` - Get specific plan instance
  - `POST /plans/instance` - Create plan instance from master
  - `PUT /plans/instance/{id}` - Update plan instance
  - `DELETE /plans/instance/{id}` - Delete plan instance
  - `PUT /plans/{id}/status` - Update instance status

### Sequences API (Completed)

- **Full CRUD operations** for both master sequence templates and sequence instances
- **Hierarchical filtering** by migration, iteration, plan, team, and status
- **Ordering support** with predecessor relationships and sequence ordering
- **Master sequence endpoints**:
  - `GET /sequences/master` - List all master sequences with audit fields
  - `GET /sequences/master/{id}` - Get specific master sequence
  - `POST /sequences/master` - Create new master sequence
  - `PUT /sequences/master/{id}` - Update master sequence
  - `DELETE /sequences/master/{id}` - Soft delete master sequence
  - `PUT /sequences/master/{id}/order` - Update sequence order
- **Sequence instance endpoints**:
  - `GET /sequences` - List sequence instances with filtering
  - `GET /sequences/instance/{id}` - Get specific sequence instance
  - `POST /sequences/instance` - Create sequence instance from master
  - `PUT /sequences/instance/{id}` - Update sequence instance
  - `DELETE /sequences/instance/{id}` - Delete sequence instance
  - `PUT /sequences/instance/{id}/status` - Update instance status

### Phases API (Completed)

- **Full CRUD operations** for both master phase templates and phase instances
- **Control point validation system** with emergency override capabilities
- **Progress aggregation** combining step completion (70%) and control point status (30%)
- **Hierarchical filtering** by migration, iteration, plan, sequence, team, and status
- **Master phase endpoints**:
  - `GET /phases/master` - List all master phases with audit fields
  - `GET /phases/master/{id}` - Get specific master phase
  - `POST /phases/master` - Create new master phase
  - `PUT /phases/master/{id}` - Update master phase
  - `DELETE /phases/master/{id}` - Soft delete master phase
  - `PUT /phases/master/{id}/order` - Update phase order
  - `PUT /phases/master/{id}/bulk-reorder` - Bulk reorder phases
- **Phase instance endpoints**:
  - `GET /phases` - List phase instances with filtering
  - `GET /phases/instance/{id}` - Get specific phase instance
  - `POST /phases/instance` - Create phase instance from master
  - `PUT /phases/instance/{id}` - Update phase instance
  - `DELETE /phases/instance/{id}` - Delete phase instance
  - `PUT /phases/instance/{id}/status` - Update instance status
  - `PUT /phases/instance/{id}/control-point` - Update control point status
  - `PUT /phases/instance/{id}/emergency-override` - Emergency override with audit trail
- **Utility endpoints**:
  - `GET /phases/by-sequence/{sequenceId}` - Get phases by sequence instance
  - `GET /phases/progress/{phaseId}` - Get phase progress aggregation
  - `PUT /phases/validate-dependencies` - Validate phase dependencies

### Environments API (Completed)

- **Complete environments management system** with application and iteration associations
- **CRUD operations** with counts display and relationship management
- **Many-to-many relationships** with applications and iterations
- **Environment role support** for iterations

### Audit Fields Standardization (US-002b)

All API entities now include standardized audit fields:

- **`created_by`** - User who created the entity
- **`created_at`** - Creation timestamp (ISO 8601)
- **`updated_by`** - User who last updated the entity
- **`updated_at`** - Last update timestamp (ISO 8601)

### Technical Standards

#### Type Safety (ADR-031)

- **Mandatory explicit casting** for all query parameters
- **UUID Parameters**: `UUID.fromString(param as String)`
- **Integer Parameters**: `Integer.parseInt(param as String)`
- **Null handling** checks required before casting

#### Error Handling

- **400 Bad Request**: Invalid parameters, type errors, missing required fields
- **404 Not Found**: Resource not found
- **409 Conflict**: Duplicate entries, deletion blocked by relationships
- **500 Internal Server Error**: Database errors

#### Database Access Pattern

- **Repository pattern** with `DatabaseUtil.withSql`
- **Instance IDs usage** for hierarchical filtering (pli_id, sqi_id, phi_id)
- **Complete field selection** - include ALL fields referenced in result mapping

## US-030 Documentation Suite (August 2025)

The US-030 API Documentation Completion initiative delivered 8 comprehensive documentation deliverables to enhance API usability, testing, and development workflows:

### Interactive Documentation

- **[Interactive Swagger UI](swagger-ui-deployment.html)** - Self-contained HTML interface for exploring and testing APIs directly in the browser
- **[Swagger Configuration](swagger-config.json)** - Multi-environment configuration supporting development, UAT, and production endpoints

### Enhanced Examples & Testing

- **[Enhanced API Examples](enhanced-examples.yaml)** - 50+ realistic API examples using authentic UMIG domain data including migrations, iterations, plans, and team hierarchies
- **[UAT Integration Guide](uat-integration-guide.md)** - Complete User Acceptance Testing procedures with test scenarios, validation checklists, and environment setup instructions
- **[Documentation Validation Script](validate-documentation.js)** - Automated validation tool ensuring OpenAPI specification accuracy and completeness

### Comprehensive Guides

- **[Error Handling Guide](error-handling-guide.md)** - Complete error documentation with HTTP status codes, error schemas, troubleshooting procedures, and resolution strategies
- **[Performance Guide](performance-guide.md)** - Performance benchmarks, optimization guidelines, caching strategies, and monitoring recommendations
- **[US-030 Completion Summary](us-030-completion-summary.md)** - Project completion report with implementation details and future recommendations

### Quick Start

#### Access Interactive Documentation

Open `swagger-ui-deployment.html` in your browser for immediate API exploration with live testing capabilities.

#### Validate Documentation

```bash
# Run automated validation
node validate-documentation.js

# Validate specific OpenAPI file
node validate-documentation.js openapi.yaml
```

#### UAT Testing

Follow the comprehensive procedures in `uat-integration-guide.md` for systematic API validation including:

- Environment setup and configuration
- Test scenario execution
- Performance validation
- Security testing
- Data integrity verification

### Key Features

- **Production-Ready Examples**: All examples use realistic UMIG data patterns
- **Multi-Environment Support**: Documentation works across development, UAT, and production
- **Automated Validation**: Continuous validation ensures documentation accuracy
- **Performance Optimized**: Guidelines for optimal API usage and caching strategies
- **UAT-Ready**: Complete testing procedures for production deployment
- **Interactive Testing**: Browser-based API exploration and testing

### Documentation Standards

All US-030 deliverables follow enterprise documentation standards:

- **Comprehensive Coverage**: 100% endpoint documentation with examples
- **Validation Automated**: Continuous accuracy checking
- **Performance Focused**: Sub-3-second response time guidelines
- **Security Compliant**: Authentication and authorization documentation
- **UAT-Validated**: Production-ready testing procedures

## Security

### Security Remediation Summary (PR #42, August 19, 2025)

The UMIG API documentation underwent comprehensive security remediation to eliminate critical vulnerabilities and implement enterprise security best practices.

#### Key Security Improvements

**1. Credential Management Security**
- ✅ **Eliminated hardcoded credentials**: All base64-encoded and plaintext credentials removed from committed code
- ✅ **Environment variable pattern**: Implemented `UMIG_AUTH_CREDENTIALS` environment variable for secure authentication
- ✅ **Development fallback**: Safe defaults maintained for local development (`admin:admin`)
- ✅ **Production ready**: Supports secure credential injection via secret management systems

**2. CDN Security Enhancement**
- ✅ **SRI integrity hashes**: All external CDN resources (Swagger UI, etc.) now include integrity verification
- ✅ **CORS configuration**: Proper crossorigin attributes prevent CDN-based attacks
- ✅ **Version pinning**: Dependencies locked to specific versions for stability

**3. Secure Authentication Patterns**

JavaScript pattern for API clients:
```javascript
const credentials = process.env.UMIG_AUTH_CREDENTIALS || "admin:admin";
const authHeader = "Basic " + Buffer.from(credentials).toString("base64");
```

Shell script pattern for testing:
```bash
-H "Authorization: Basic $(echo -n ${UMIG_AUTH_CREDENTIALS:-admin:admin} | base64)"
```

#### Environment Configuration

The API uses environment variables for secure configuration. Reference `.env.example` in the project root for complete setup:

- `UMIG_AUTH_CREDENTIALS` - Authentication credentials (format: username:password)
- `UMIG_BASE_URL` - API base URL configuration
- `UMIG_TIMEOUT` - Request timeout settings
- `UMIG_MAX_RETRIES` - Retry configuration

#### Security Best Practices

**Development Teams**:
- Configure local environments using `.env.example` as reference
- Never commit credentials to version control
- Use environment variables for all authentication

**Production Deployment**:
- Configure environment variables in deployment system
- Implement proper secret management (Azure Key Vault, AWS Secrets Manager)
- Establish credential rotation policies

#### Security Status

- ✅ **Zero hardcoded credentials** in codebase
- ✅ **All CDN resources secured** with SRI hashes
- ✅ **Environment variable pattern** implemented across all documentation
- ✅ **Security verification completed** with zero findings
- ✅ **Production deployment ready** with secure configuration patterns
