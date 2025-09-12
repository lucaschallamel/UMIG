# Users Entity Test Specification

**Target Coverage**: 95% functional, 85% integration, 88% accessibility, 85% cross-browser, 92% performance  
**Security Priority**: HIGH (authentication & authorization critical)
**Unique Focus**: Authentication, session management, role-based access control

## Entity-Specific Test Structure

```
users/
├── users.unit.test.js              # Core user operations
├── users.integration.test.js       # API & database integration
├── users.security.test.js          # Authentication & authorization (35+ scenarios)
├── users.performance.test.js       # Login performance & session handling
├── users.accessibility.test.js     # User interface accessibility
├── users.edge-cases.test.js        # Authentication edge cases
├── users.cross-browser.test.js     # Login compatibility
└── builders/
    └── UserBuilder.js              # User test data builder
```

## UserBuilder Specializations

```javascript
class UserBuilder {
    constructor() {
        this.data = this.getDefaultUserData();
        this.authSettings = {};
        this.permissions = [];
        this.sessionConfig = {};
    }
    
    getDefaultUserData() {
        return {
            userId: generateUUID(),
            username: generateUniqueUsername(),
            email: generateValidEmail(),
            displayName: 'Test User',
            isActive: true,
            lastLogin: null,
            failedLoginAttempts: 0,
            accountLocked: false,
            passwordExpiry: null,
            mfaEnabled: false,
            roles: ['confluence-users']
        };
    }
    
    // Authentication-specific builders
    withRole(role) {
        this.data.roles = [...this.data.roles, role];
        return this;
    }
    
    withAuthenticationMethod(method) {
        this.authSettings.method = method;
        this.authSettings.config = this.getAuthConfig(method);
        return this;
    }
    
    withExpiredSession() {
        this.sessionConfig.expiry = Date.now() - 1000;
        return this;
    }
    
    withLockedAccount() {
        this.data.accountLocked = true;
        this.data.failedLoginAttempts = 5;
        return this;
    }
    
    withMfaEnabled(type = '2fa') {
        this.data.mfaEnabled = true;
        this.authSettings.mfaType = type;
        return this;
    }
    
    withExpiredPassword() {
        this.data.passwordExpiry = Date.now() - 86400000; // 1 day ago
        return this;
    }
    
    withPermissions(permissions) {
        this.permissions = Array.isArray(permissions) ? permissions : [permissions];
        return this;
    }
    
    withInvalidCredentials() {
        this.data.password = 'invalid_password';
        return this;
    }
    
    asSystemAdmin() {
        this.data.roles = ['confluence-administrators', 'system-admin'];
        return this;
    }
    
    asReadOnlyUser() {
        this.data.roles = ['confluence-users'];
        this.permissions = ['read'];
        return this;
    }
    
    build() {
        return {
            ...this.data,
            authSettings: this.authSettings,
            permissions: this.permissions,
            sessionConfig: this.sessionConfig
        };
    }
}
```

## Critical Test Scenarios

### 1. Authentication Security Tests (35+ scenarios)

```javascript
describe('Users Security Tests', () => {
    const securityTester = new SecurityTester();
    const userBuilder = new UserBuilder();
    
    describe('Authentication Security', () => {
        test('prevents brute force attacks', async () => {
            const user = userBuilder.build();
            
            // Simulate multiple failed login attempts
            for (let i = 0; i < 6; i++) {
                await securityTester.attemptLogin(user.username, 'wrong_password');
            }
            
            const lockResult = await securityTester.checkAccountLock(user.username);
            expect(lockResult.isLocked).toBe(true);
            expect(lockResult.lockDuration).toBeGreaterThan(300); // 5 minutes
        });
        
        test('enforces session timeout', async () => {
            const user = userBuilder.withExpiredSession().build();
            
            const sessionTest = await securityTester.testSessionSecurity(user);
            expect(sessionTest.sessionValid).toBe(false);
            expect(sessionTest.requiresReauth).toBe(true);
        });
        
        test('validates MFA enforcement', async () => {
            const user = userBuilder.withMfaEnabled().build();
            
            const mfaTest = await securityTester.testMfaBypass(user);
            expect(mfaTest.bypassAttemptFailed).toBe(true);
            expect(mfaTest.requiresMfaToken).toBe(true);
        });
        
        test('prevents privilege escalation', async () => {
            const user = userBuilder.asReadOnlyUser().build();
            
            const escalationTest = await securityTester.testPrivilegeEscalation(
                user, 
                'admin_action'
            );
            expect(escalationTest.actionBlocked).toBe(true);
            expect(escalationTest.errorCode).toBe(403);
        });
    });
    
    describe('Authorization Matrix', () => {
        const roles = ['read-only', 'user', 'team-lead', 'admin', 'system-admin'];
        const actions = ['read', 'create', 'update', 'delete', 'admin'];
        
        roles.forEach(role => {
            actions.forEach(action => {
                test(`${role} role ${action} permission validation`, async () => {
                    const user = userBuilder.withRole(role).build();
                    const authTest = await securityTester.testAuthorization(user, action);
                    
                    const expected = getExpectedPermission(role, action);
                    expect(authTest.hasPermission).toBe(expected);
                });
            });
        });
    });
});
```

### 2. Performance Critical Paths

```javascript
describe('Users Performance Tests', () => {
    const performanceTracker = new PerformanceRegressionTracker();
    
    test('login performance under load', async () => {
        const users = Array.from({ length: 50 }, () => 
            new UserBuilder().withValidData().build()
        );
        
        const benchmark = await performanceTracker.measureConcurrentLogins(users);
        
        expect(benchmark.averageLoginTime).toBeLessThan(200);
        expect(benchmark.p95LoginTime).toBeLessThan(500);
        expect(benchmark.successRate).toBeGreaterThan(0.99);
    });
    
    test('session management performance', async () => {
        const sessionTest = await performanceTracker.measureSessionOperations({
            create: 1000,
            validate: 5000,
            refresh: 2000,
            destroy: 1000
        });
        
        expect(sessionTest.createSession).toBeLessThan(50);
        expect(sessionTest.validateSession).toBeLessThan(10);
        expect(sessionTest.refreshSession).toBeLessThan(100);
    });
});
```

### 3. Integration with UMIG Authorization

```javascript
describe('Users Integration Tests', () => {
    let testDatabase;
    let apiClient;
    
    beforeAll(async () => {
        testDatabase = await TestDatabaseManager.createCleanInstance();
        apiClient = new ApiTestClient();
    });
    
    test('integrates with team membership', async () => {
        const user = new UserBuilder().build();
        const team = new TeamBuilder().build();
        
        // Create user and team
        const userResponse = await apiClient.post('/users', user);
        const teamResponse = await apiClient.post('/teams', team);
        
        // Add user to team
        const membershipResponse = await apiClient.post('/team-members', {
            userId: userResponse.data.id,
            teamId: teamResponse.data.id,
            role: 'member'
        });
        
        expect(membershipResponse.status).toBe(201);
        
        // Validate user can access team resources
        const accessTest = await apiClient.get(`/teams/${teamResponse.data.id}`, {
            headers: { 'X-User-Id': userResponse.data.id }
        });
        
        expect(accessTest.status).toBe(200);
    });
    
    test('cascades permissions through entity hierarchy', async () => {
        const admin = new UserBuilder().asSystemAdmin().build();
        const migration = new MigrationBuilder().build();
        
        const adminResponse = await apiClient.post('/users', admin);
        const migrationResponse = await apiClient.post('/migrations', migration, {
            headers: { 'X-User-Id': adminResponse.data.id }
        });
        
        expect(migrationResponse.status).toBe(201);
        
        // Test cascade through Plans -> Sequences -> Phases -> Steps
        const planResponse = await apiClient.post('/plans', {
            migrationId: migrationResponse.data.id,
            name: 'Test Plan'
        }, {
            headers: { 'X-User-Id': adminResponse.data.id }
        });
        
        expect(planResponse.status).toBe(201);
    });
});
```

## Accessibility Focus Areas

- Login form keyboard navigation
- Screen reader announcements for authentication states
- Error message accessibility
- Focus management during MFA flows
- High contrast support for authentication UI

## Cross-Browser Authentication Testing

- SSO integration across browsers
- Session persistence
- Cookie handling differences
- MFA token compatibility

## Performance Benchmarks

- **Login time**: < 200ms average, < 500ms p95
- **Session validation**: < 10ms
- **Permission check**: < 5ms
- **User search**: < 100ms for 10,000 users
- **Concurrent logins**: 100 users/second

## Security Quality Gate Requirements

- **Minimum Security Score**: 9.0/10 (higher than 8.8 due to authentication criticality)
- **Authentication scenarios**: 35+ test cases
- **Authorization matrix**: Complete role/permission testing
- **Session security**: 10+ session-related security tests
- **Zero authentication bypasses**: All auth paths must be secure

## Critical Test Infrastructure Requirements

**⚠️ MANDATORY INFRASTRUCTURE PATTERNS** - These issues prevented ANY test execution during Teams migration (0% → 78-80% success rate):

### Pre-Implementation Infrastructure Checklist (NON-NEGOTIABLE)

**Before writing ANY Users entity tests, verify ALL patterns are implemented:**

- [ ] ✅ All shared test variables declared at module level (not in describe blocks)
- [ ] ✅ TextEncoder/TextDecoder polyfills added to jest.setup.unit.js
- [ ] ✅ Defensive container creation pattern in all beforeEach hooks
- [ ] ✅ Complete UMIGServices mock with all required service methods
- [ ] ✅ Mock components include migrationMode, data, and emit properties
- [ ] ✅ Jest testMatch patterns include entities/** directories
- [ ] ✅ Event handling uses manual emission pattern (not async waiting)
- [ ] ✅ JSDOM environment configured in Jest configuration

### 1. Variable Scoping Pattern (CRITICAL)
```javascript
// CORRECT - Module level declarations
let userBuilder;
let securityTester;
let performanceTracker;
let container;
let mockUserManager;
let testData;

describe('Users Entity Tests', () => {
    // Tests can access all module-level variables
});
```

### 2. Complete Service Mocking for Users (MANDATORY)
```javascript
beforeEach(() => {
    window.UMIGServices = {
        notificationService: { 
            show: jest.fn(),
            showError: jest.fn(),
            showSuccess: jest.fn()
        },
        featureFlagService: { 
            isEnabled: jest.fn().mockReturnValue(true),
            getVariant: jest.fn().mockReturnValue('default')
        },
        userService: { 
            getCurrentUser: jest.fn().mockReturnValue({ 
                id: 'test-user',
                name: 'Test User',
                roles: ['confluence-users']
            }),
            validateSession: jest.fn().mockReturnValue(true),
            checkPermissions: jest.fn().mockReturnValue(true)
        },
        authenticationService: { // CRITICAL for Users entity
            login: jest.fn().mockResolvedValue(true),
            logout: jest.fn().mockResolvedValue(true),
            validateToken: jest.fn().mockReturnValue(true),
            checkMfa: jest.fn().mockReturnValue(false)
        }
    };
});
```

### 3. Users-Specific Mock Components (MANDATORY)
```javascript
const createMockUserComponent = (type, additionalProps = {}) => ({
    id: `mock-user-${type}`,
    type: type,
    migrationMode: true, // CRITICAL
    data: [], // CRITICAL - initialize user data
    currentUser: null,
    isAuthenticated: false,
    permissions: [],
    initialize: jest.fn().mockResolvedValue(true),
    mount: jest.fn(),
    render: jest.fn(),
    update: jest.fn(),
    unmount: jest.fn(),
    destroy: jest.fn(),
    emit: jest.fn(), // CRITICAL for event system
    on: jest.fn(),
    off: jest.fn(),
    // Users-specific methods
    authenticateUser: jest.fn(),
    validatePermissions: jest.fn(),
    refreshSession: jest.fn(),
    ...additionalProps
});
```

### 4. Authentication Event Handling Pattern (MANDATORY)
```javascript
// REQUIRED - manual event emission for auth events
test('user authentication event handling', async () => {
    const userComponent = createMockUserComponent('auth');
    orchestrator.registerComponent(userComponent);
    
    const authData = {
        userId: 'test-user',
        authenticated: true,
        roles: ['confluence-users']
    };
    
    // Manual emission - avoids async timing issues
    userComponent.emit('userAuthenticated', authData);
    
    // Immediate verification
    expect(orchestrator.handleEvent).toHaveBeenCalledWith(
        'userAuthenticated', 
        expect.objectContaining({ userId: 'test-user' })
    );
});
```

### 5. Users Entity Test Discovery (MANDATORY)
```javascript
// jest.config.unit.js - REQUIRED for Users entity tests
module.exports = {
    testMatch: [
        '**/__tests__/**/*.(test|spec).js',
        '**/*.(test|spec).js',
        '**/__tests__/entities/users/**/*.(test|spec).js', // CRITICAL
        '**/__tests__/entities/**/*.(test|spec).js', // CRITICAL
        '**/__tests__/components/**/*.(test|spec).js',
        '**/__tests__/security/**/*.(test|spec).js'
    ],
    testEnvironment: 'jsdom', // CRITICAL for DOM access
    setupFilesAfterEnv: ['<rootDir>/jest.setup.unit.js'] // CRITICAL for polyfills
};
```

### Infrastructure Failure Impact on Users Entity

**Users entity is especially vulnerable to infrastructure failures because:**

1. **Authentication Services**: Users tests depend heavily on auth service mocks
2. **Session Management**: Complex session state requires proper mock setup
3. **Permission Checking**: Authorization tests need complete service mocking
4. **Event-Driven Auth**: Authentication flows use events extensively
5. **DOM Interactions**: Login forms require proper JSDOM setup

### Users-Specific Infrastructure Validation

**Additional Users entity validation steps:**

- [ ] ✅ authenticationService mock includes all auth methods
- [ ] ✅ userService mock includes session and permission methods  
- [ ] ✅ Mock components include authentication state properties
- [ ] ✅ Event handlers for authentication events properly mocked
- [ ] ✅ Test data includes realistic user authentication scenarios
- [ ] ✅ JSDOM setup includes form elements for login testing

**CRITICAL**: Without these infrastructure patterns, Users entity tests will fail at 0% execution rate due to authentication service dependencies and complex event flows.