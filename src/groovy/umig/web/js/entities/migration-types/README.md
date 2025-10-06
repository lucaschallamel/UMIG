# Migration Types Entity Manager

Entity manager for migration type categorization management in admin GUI.

## Responsibilities

- Manage migration type entity CRUD operations
- Provide migration type configuration UI
- Handle type definitions (Application, Infrastructure, Data)
- Validate migration type business rules

## Structure

```
migration-types/
└── MigrationTypesEntityManager.js    # Migration type entity manager
```

## Related

- See `../` for entity manager framework
- See `../../../../api/v2/MigrationTypesApi.groovy` for backend API
