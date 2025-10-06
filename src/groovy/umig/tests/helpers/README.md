# Test Helpers

Reusable test utilities, mock objects, and helper functions for test development.

## Responsibilities

- Provide mock implementations for external services
- Test data generation and fixture management
- Common assertion utilities and matchers
- Database seeding and cleanup helpers

## Structure

```
helpers/
├── MailServerManagerMockHelper.groovy    # MailServerManager mock for email testing
└── [Additional test helper utilities]
```

## Key Helpers

### MailServerManagerMockHelper

Provides mock MailServerManager for email testing without SMTP dependencies.

## Related

- See `../config/` for test configuration
- See `../unit/mock/` for unit test mocks
