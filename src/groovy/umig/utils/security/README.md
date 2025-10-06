# Security Utilities

Security helper utilities for input validation, sanitization, and XSS/CSRF protection.

## Responsibilities

- Provide XSS prevention through input sanitization
- CSRF token generation and validation
- SQL injection prevention helpers
- Path traversal detection and prevention
- Content Security Policy (CSP) enforcement utilities

## Structure

```
security/
└── [Security utility classes for validation and sanitization]
```

## Security Patterns

### Input Sanitization

HTML entity encoding for XSS prevention in user-generated content.

### CSRF Protection

Token-based CSRF protection for state-changing operations.

### SQL Injection Prevention

Parameter binding enforcement and input validation for database operations.

## Related

- See `../AuthenticationService.groovy` for authentication logic
- See `../../web/js/security/` for frontend security controls
- See `/docs/architecture/adr/ADR-058-component-security-controls.md` for security architecture
