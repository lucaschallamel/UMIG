# DTO JSON Schemas

JSON Schema definitions for DTO validation and documentation using JSON Schema Draft 7 specification.

## Responsibilities

- Define structural validation rules for DTOs
- Document expected data formats and constraints
- Enable automatic validation in API layer
- Support OpenAPI schema generation

## Structure

```
schemas/
├── StepMasterDTO.schema.json     # Step template validation
├── StepInstanceDTO.schema.json   # Step execution validation
└── stepDataSchema.json           # Step data payload validation
```

## Schema Format

All schemas follow JSON Schema Draft 7 with:

- Type definitions for all fields
- Required field specifications
- Format validators (uuid, date-time, email)
- Enum constraints for status codes
- Pattern matching for structured data

## Usage

Schemas are referenced in OpenAPI specification and used for runtime validation at API boundaries.

## Related

- See `../` for DTO implementations
- See `/docs/api/openapi.yaml` for OpenAPI integration
