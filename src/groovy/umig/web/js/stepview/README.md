# Step View Components

Specialized components for step execution view with real-time status updates and RBAC controls.

## Responsibilities

- Provide step-specific UI components
- Implement role-based access control (RBAC) for step operations
- Handle real-time status updates
- Manage step comments and execution tracking

## Structure

```
stepview/
└── StepViewRBAC.js    # Role-based access control for step view
```

## Key Components

### StepViewRBAC

Implements permission-based UI control for step operations (view, edit, execute, comment).

## Related

- See `../../../macros/v1/stepViewMacro.groovy` for container
- See `../components/` for reusable components
- See `../../../api/v2/StepsApi.groovy` for backend API
