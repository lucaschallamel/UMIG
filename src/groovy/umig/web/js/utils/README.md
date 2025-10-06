# Frontend Utilities

Client-side utility functions for caching, logging, performance monitoring, and security.

## Responsibilities

- Provide bounded cache implementation for performance
- Client-side logging and debugging utilities
- Performance monitoring and metrics collection
- Security utilities for XSS/CSRF prevention
- Status code management and display
- URL construction and routing

## Structure

```
utils/
├── BoundedCache.js              # LRU cache with size limits
├── EntityMigrationTracker.js    # Entity migration state tracking
├── FeatureToggle.js             # Feature flag evaluation
├── Logger.js                    # Client-side logging
├── PerformanceMonitor.js        # Performance metrics collection
├── SecurityUtils.js             # XSS/CSRF prevention utilities
├── StatusProvider.js            # Status code and display management
└── url-constructor.js           # URL building and routing
```

## Key Utilities

### BoundedCache

LRU cache implementation with configurable size limits for performance optimization.

### Logger

Structured logging with log levels, timestamps, and optional remote logging.

### PerformanceMonitor

Captures performance metrics (API latency, render time) for monitoring and optimization.

### SecurityUtils

Provides HTML entity encoding, CSRF token management, and input sanitization.

### StatusProvider

Centralized status code management with display formatting and color coding.

## Related

- See `../components/` for components using these utilities
- See `../../../utils/` for backend utilities
