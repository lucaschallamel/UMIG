# Users Entity Manager

Entity manager for user profile and role management in admin GUI.

## Responsibilities

- Manage user entity CRUD operations
- Provide user-specific UI components and forms
- Handle Confluence user integration (ADR-042)
- Manage user role assignments and team memberships

## Structure

```
users/
└── UsersEntityManager.js    # User entity manager
```

## Related

- See `../` for entity manager framework
- See `../../../../api/v2/UsersApi.groovy` for backend API
