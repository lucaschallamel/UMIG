# Migrations Entity Manager

Entity manager for migration orchestration and lifecycle management in admin GUI.

## Responsibilities

- Manage migration entity CRUD operations
- Provide migration workflow UI components
- Handle migration status transitions
- Coordinate migration hierarchy (iterations, plans, sequences, phases, steps)

## Structure

```
migrations/
└── MigrationsEntityManager.js    # Migration entity manager
```

## Related

- See `../` for entity manager framework
- See `../../../../api/v2/migrationApi.groovy` for backend API
