# Frontend Services

Client-side service layer for API communication, authentication, and feature management.

## Responsibilities

- Provide service facade for backend API communication
- Handle authentication and session management
- Manage feature flags and toggles
- Coordinate notifications and user feedback

## Structure

```
services/
├── AdminGuiService.js           # Admin GUI orchestration service
├── ApiService.js                # Generic API communication service
├── AuthenticationService.js     # Client-side authentication
├── FeatureFlagService.js        # Feature toggle management
└── NotificationService.js       # User notification handling
```

## Key Services

### AdminGuiService

Orchestrates admin GUI initialization, state management, and entity coordination.

### ApiService

Generic HTTP client for RESTful API communication with error handling and retry logic.

### AuthenticationService

Client-side authentication state management and session validation.

### FeatureFlagService

Feature toggle evaluation and configuration management.

### NotificationService

User notification display and toast message management.

## Related

- See `../../../api/v2/` for backend API endpoints
- See `../utils/` for utility functions
