# Product Context

## Purpose

UMIG exists to simplify and standardise the management of complex migration and integration processes. The platform is designed to provide a seamless experience for both technical and non-technical users, ensuring that migration steps, team membership, and related data are managed efficiently and transparently.

## User Experience Goals

- Consistent and predictable API behaviour, reducing client-side confusion and errors.
- Clear, informative error messages and robust handling of edge cases.
- Comprehensive documentation and synchronisation between API implementation and specification.
- Easy onboarding for new developers and users, supported by formalised patterns and guides.

## Recent Enhancements

As of July 2025, the adoption of standardised REST API implementation patterns (ADR-023) has significantly improved the client experience and maintainability of the platform. Team membership management, in particular, now benefits from robust routing, idempotent operations, and precise error handling, ensuring users can interact with the system confidently and reliably. The Users API has also seen significant enhancements in robustness and error reporting.

Furthermore, the refactoring to an iteration-centric data model (ADR-024) provides greater flexibility for managing migration plans across different iterations, the new Node.js-based local development orchestration (ADR-025) streamlines the development setup, and the enhanced test suite stability (ADR-026) ensures a more reliable development and deployment process. The addition of `ctm_code` to controls also improves data clarity and usability. The overhaul of generator naming conventions and fixes for Faker deprecation further contribute to a more robust and maintainable codebase. The migration to a many-to-many user-team relationship (ADR-022) and the introduction of step-level and instance-level comments (ADR-021) enhance flexibility, auditability, and collaboration.
