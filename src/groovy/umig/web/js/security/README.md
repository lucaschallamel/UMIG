# Frontend Security

Client-side security controls including CSP enforcement, XSS prevention, and security utilities.

## Responsibilities

- Enforce Content Security Policy (CSP) restrictions
- Provide XSS/CSRF prevention utilities
- Implement security headers and validation
- Coordinate with backend security controls (ADR-058)

## Structure

```
security/
└── CSPManager.js    # Content Security Policy enforcement
```

## Key Components

### CSPManager

Manages Content Security Policy directives for safe inline scripts and external resources.

## Related

- See `../../../utils/security/` for backend security utilities
- See `/docs/architecture/adr/ADR-058-component-security-controls.md`
