# ComponentOrchestrator Security Patterns

## Overview
Security implementation patterns from ComponentOrchestrator.js achieving 8.5/10 enterprise security rating, applicable to all entity migrations.

## Core Security Architecture

### Rate Limiting Implementation
```javascript
class EntityRateLimiter {
  constructor(entityType, limits = { requests: 100, window: 60000 }) {
    this.entityType = entityType;
    this.limits = limits;
    this.requestCounts = new Map();
  }
  
  checkLimit(userId, action) {
    const key = `${userId}_${this.entityType}_${action}`;
    const now = Date.now();
    const requests = this.requestCounts.get(key) || [];
    const recentRequests = requests.filter(time => now - time < this.limits.window);
    
    if (recentRequests.length >= this.limits.requests) {
      throw new SecurityError('Rate limit exceeded');
    }
    
    recentRequests.push(now);
    this.requestCounts.set(key, recentRequests);
    return true;
  }
}
```

### Input Sanitization Framework
```javascript
class EntitySecurityManager {
  sanitizeInput(input, context = 'default') {
    // HTML entity encoding
    const htmlEncoded = this.htmlEncode(input);
    
    // Context-specific sanitization
    switch(context) {
      case 'html': return this.sanitizeHTML(htmlEncoded);
      case 'sql': return this.sanitizeSQL(htmlEncoded);
      case 'javascript': return this.sanitizeJS(htmlEncoded);
      default: return htmlEncoded;
    }
  }
  
  validateCSRFToken(token, session) {
    const expectedToken = session.getAttribute('csrfToken');
    if (!token || !expectedToken || token !== expectedToken) {
      throw new SecurityError('Invalid CSRF token');
    }
    return true;
  }
}
```

### Memory Security Controls
```javascript
class ComponentLifecycleManager {
  registerComponent(component) {
    this.trackMemoryUsage(component);
    this.scheduleCleanup(component);
  }
  
  trackMemoryUsage(component) {
    const startMemory = performance.memory?.usedJSHeapSize || 0;
    component.memoryBaseline = startMemory;
    
    // Monitor for memory leaks
    setInterval(() => {
      const currentMemory = performance.memory?.usedJSHeapSize || 0;
      const growth = currentMemory - startMemory;
      if (growth > this.MEMORY_LEAK_THRESHOLD) {
        this.handleMemoryLeak(component);
      }
    }, 30000);
  }
}
```

## Security Control Categories

### 1. Authentication & Authorization
- Multi-layer user context validation
- Session management with timeout
- Role-based access control (RBAC)
- Audit logging for all security events

### 2. Input Validation & Sanitization
- Client-side real-time validation
- Server-side comprehensive sanitization
- Database constraint validation
- Context-aware output encoding

### 3. Cross-Site Attack Prevention
- XSS protection through HTML encoding
- CSRF token validation
- Content Security Policy headers
- Origin header validation

### 4. Resource Protection
- Rate limiting per user/action
- Memory usage monitoring
- Resource cleanup automation
- Denial of Service prevention

### 5. Data Protection
- Sensitive data encryption
- Secure data transmission (HTTPS)
- Data retention policies
- Privacy compliance (GDPR/CCPA)

## Security Testing Framework

### Automated Security Testing
```javascript
class SecurityTestSuite {
  static runSecurityTests(entityManager) {
    const tests = [
      () => this.testXSSPrevention(entityManager),
      () => this.testCSRFProtection(entityManager),
      () => this.testInputValidation(entityManager),
      () => this.testRateLimiting(entityManager),
      () => this.testMemoryLeaks(entityManager)
    ];
    
    return tests.map(test => test()).every(result => result === true);
  }
}
```

## Implementation Guidelines

### Security Baseline Requirements
- Minimum security rating: 8.5/10
- Zero critical vulnerabilities
- Comprehensive input validation
- Automated security testing
- Regular security audits

### Monitoring & Alerting
- Real-time security event monitoring
- Automatic threat detection
- Security incident response procedures
- Performance impact monitoring

## Success Metrics
- Teams Migration: 8.8/10 security rating achieved
- Zero security incidents during migration
- 100% test coverage for security controls
- < 5ms performance impact from security controls

## Risk Mitigation
- Automated rollback on security failures
- Multiple validation layers
- Comprehensive audit logging
- Regular security assessments

## Critical Test Infrastructure Requirements

**MANDATORY PATTERNS** learned from Teams migration that prevented tests from executing at all (from 0% to 78-80% pass rate):

### 1. Variable Scoping Pattern
```javascript
// WRONG - declared inside describe blocks
describe('Component Tests', () => {
  let performanceResults; // Causes scoping issues
});

// CORRECT - declared at module level
let performanceResults; // Module-level declaration
let container;
let orchestrator;

describe('Component Tests', () => {
  // Tests can access module-level variables
});
```

### 2. TextEncoder/TextDecoder Polyfills (MANDATORY)
```javascript
// jest.setup.unit.js - REQUIRED for Node.js environment
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
```

### 3. JSDOM Container Initialization Pattern
```javascript
// MANDATORY defensive container creation
beforeEach(() => {
    container = document.getElementById('test-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'test-container';
        document.body.appendChild(container);
    }
    container.innerHTML = ''; // Clean slate for each test
});
```

### 4. Complete Service Mock Setup
```javascript
// MANDATORY - complete UMIGServices mock
beforeEach(() => {
    window.UMIGServices = {
        notificationService: { 
            show: jest.fn(),
            hide: jest.fn(),
            showError: jest.fn(),
            showSuccess: jest.fn()
        },
        featureFlagService: { 
            isEnabled: jest.fn().mockReturnValue(true),
            getVariant: jest.fn().mockReturnValue('default')
        },
        userService: { 
            getCurrentUser: jest.fn().mockReturnValue({ id: 'test-user' })
        }
    };
});
```

### 5. Mock Component Integration Pattern
```javascript
// MANDATORY - complete mock components with all properties
const createMockComponent = (type, additionalProps = {}) => ({
    id: `mock-${type}`,
    type: type,
    migrationMode: true, // REQUIRED
    data: [], // REQUIRED - initialize data
    initialize: jest.fn().mockResolvedValue(true),
    mount: jest.fn(),
    render: jest.fn(),
    update: jest.fn(),
    unmount: jest.fn(),
    destroy: jest.fn(),
    emit: jest.fn(), // REQUIRED for event handling
    ...additionalProps
});
```

### 6. Test Discovery Configuration
```javascript
// jest.config.unit.js - MANDATORY expanded testMatch
module.exports = {
    testMatch: [
        '**/__tests__/**/*.(test|spec).js',
        '**/*.(test|spec).js',
        '**/__tests__/entities/**/*.(test|spec).js', // CRITICAL
        '**/__tests__/components/**/*.(test|spec).js', // CRITICAL
        '**/__tests__/security/**/*.(test|spec).js' // CRITICAL
    ]
};
```

### 7. Async Event Handling Pattern
```javascript
// MANDATORY - manual event emission for test control
test('event handling', async () => {
    const component = createMockComponent('test');
    orchestrator.registerComponent(component);
    
    // Manual event emission - more reliable than waiting
    component.emit('dataLoaded', { data: testData });
    
    // Verify handling immediately
    expect(orchestrator.handleEvent).toHaveBeenCalledWith('dataLoaded', expect.any(Object));
});
```

### Infrastructure Issues That Caused 100% Test Failures
1. **Variable scoping** - Tests couldn't access shared data
2. **Missing polyfills** - Node.js environment incomplete
3. **DOM initialization** - Containers null, tests crashed
4. **Incomplete mocks** - Services undefined, components failed
5. **Test discovery** - Jest couldn't find test files
6. **Event timing** - Async events never resolved

**CRITICAL**: These patterns are NON-NEGOTIABLE for entity test suites. Apply ALL patterns to prevent infrastructure failures that make tests unrunnable.