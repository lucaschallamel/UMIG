# Migration Types Entity Test Specification

**Target Coverage**: 95% functional, 85% integration, 88% accessibility, 85% cross-browser, 92% performance  
**Security Priority**: HIGH (workflow state security critical for migration integrity)
**Unique Focus**: Workflow state validation, transition rules, approval processes, rollback procedures

## Entity-Specific Test Structure

```
migration-types/
├── migration-types.unit.test.js           # Core migration type operations
├── migration-types.integration.test.js    # API & workflow integration
├── migration-types.security.test.js       # Workflow & approval security (30+ scenarios)
├── migration-types.performance.test.js    # Workflow performance & state transitions
├── migration-types.accessibility.test.js  # Migration type management UI
├── migration-types.edge-cases.test.js     # State transition edge cases
├── migration-types.cross-browser.test.js  # Workflow interface compatibility
└── builders/
    └── MigrationTypeBuilder.js           # Migration type test data builder
```

## MigrationTypeBuilder Specializations

```javascript
class MigrationTypeBuilder {
    constructor() {
        this.data = this.getDefaultMigrationTypeData();
        this.workflowStates = [];
        this.transitionRules = [];
        this.approvalProcess = {};
        this.rollbackStrategy = {};
        this.templates = [];
        this.auditConfiguration = {};
    }
    
    getDefaultMigrationTypeData() {
        return {
            migrationTypeId: generateUUID(),
            name: `migration-type-${Date.now()}`,
            description: 'Test Migration Type',
            category: 'standard',
            version: '1.0.0',
            isActive: true,
            isSystem: false,
            complexity: 'medium',
            estimatedDuration: 240, // minutes
            riskLevel: 'medium',
            requiredApprovals: ['technical', 'business'],
            rollbackSupported: true,
            automationLevel: 'semi-automated',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'test-user',
            metadata: {}
        };
    }
    
    // Workflow-specific builders
    withWorkflowStates(states) {
        this.workflowStates = states.map(state => ({
            stateId: state.stateId || generateUUID(),
            name: state.name,
            description: state.description,
            type: state.type || 'intermediate', // 'initial', 'intermediate', 'final', 'error'
            isSystemState: state.isSystemState || false,
            allowedActions: state.allowedActions || [],
            requiredPermissions: state.requiredPermissions || [],
            timeoutMinutes: state.timeoutMinutes,
            notifications: state.notifications || [],
            validationRules: state.validationRules || []
        }));
        return this;
    }
    
    withTransitionRules(rules) {
        this.transitionRules = rules.map(rule => ({
            ruleId: rule.ruleId || generateUUID(),
            fromState: rule.fromState,
            toState: rule.toState,
            triggerType: rule.triggerType || 'manual', // 'manual', 'automatic', 'conditional'
            conditions: rule.conditions || [],
            requiredApprovals: rule.requiredApprovals || [],
            executionOrder: rule.executionOrder || 0,
            rollbackSupported: rule.rollbackSupported !== false,
            validationChecks: rule.validationChecks || [],
            preActions: rule.preActions || [],
            postActions: rule.postActions || []
        }));
        return this;
    }
    
    withApprovalProcess(process) {
        this.approvalProcess = {
            enabled: process.enabled !== false,
            sequential: process.sequential || false,
            minimumApprovers: process.minimumApprovers || 1,
            approverRoles: process.approverRoles || ['migration-approver'],
            escalationRules: process.escalationRules || [],
            timeoutRules: process.timeoutRules || [],
            bypassConditions: process.bypassConditions || [],
            auditRequirements: process.auditRequirements || {
                logAllActions: true,
                requireComments: true,
                trackDecisionReasons: true
            }
        };
        return this;
    }
    
    withRollbackStrategy(strategy) {
        this.rollbackStrategy = {
            supported: strategy.supported !== false,
            automatic: strategy.automatic || false,
            timeLimit: strategy.timeLimit || 3600, // seconds
            requiredApprovals: strategy.requiredApprovals || ['technical-lead'],
            rollbackStates: strategy.rollbackStates || [],
            dataBackupRequired: strategy.dataBackupRequired !== false,
            rollbackChecks: strategy.rollbackChecks || [],
            rollbackActions: strategy.rollbackActions || []
        };
        return this;
    }
    
    withTemplate(template) {
        this.templates.push({
            templateId: template.templateId || generateUUID(),
            name: template.name,
            type: template.type || 'migration-plan',
            version: template.version || '1.0.0',
            content: template.content || {},
            requiredFields: template.requiredFields || [],
            validationRules: template.validationRules || [],
            isDefault: template.isDefault || false
        });
        return this;
    }
    
    withAuditConfiguration(config) {
        this.auditConfiguration = {
            enabled: config.enabled !== false,
            logLevel: config.logLevel || 'detailed',
            retentionPeriod: config.retentionPeriod || 2555, // days (7 years)
            encryptionRequired: config.encryptionRequired !== false,
            realTimeMonitoring: config.realTimeMonitoring || false,
            alertThresholds: config.alertThresholds || {},
            complianceRequirements: config.complianceRequirements || []
        };
        return this;
    }
    
    asHighRiskMigrationType() {
        this.data.riskLevel = 'high';
        this.data.complexity = 'high';
        this.data.requiredApprovals = ['technical', 'business', 'security', 'executive'];
        this.data.estimatedDuration = 480; // 8 hours
        this.withApprovalProcess({
            sequential: true,
            minimumApprovers: 2,
            escalationRules: [
                { threshold: 24, escalateTo: 'management' },
                { threshold: 48, escalateTo: 'executive' }
            ]
        });
        return this;
    }
    
    asAutomatedMigrationType() {
        this.data.automationLevel = 'fully-automated';
        this.data.complexity = 'low';
        this.data.requiredApprovals = ['technical'];
        this.withTransitionRules([
            {
                fromState: 'initiated',
                toState: 'in-progress',
                triggerType: 'automatic',
                conditions: ['all-validations-passed']
            }
        ]);
        return this;
    }
    
    asLegacyMigrationType() {
        this.data.category = 'legacy';
        this.data.version = '0.9.0';
        this.data.isSystem = true;
        this.rollbackStrategy.supported = false;
        this.data.metadata.deprecationWarning = 'This migration type is deprecated';
        return this;
    }
    
    withInvalidWorkflow() {
        this.workflowStates = [
            { name: 'start', type: 'initial' },
            // Missing intermediate states
            { name: 'end', type: 'final' }
        ];
        this.transitionRules = [
            // Invalid transition - no intermediate states
            { fromState: 'start', toState: 'end' }
        ];
        return this;
    }
    
    withCircularWorkflow() {
        this.workflowStates = [
            { name: 'state-a', type: 'intermediate' },
            { name: 'state-b', type: 'intermediate' },
            { name: 'state-c', type: 'intermediate' }
        ];
        this.transitionRules = [
            { fromState: 'state-a', toState: 'state-b' },
            { fromState: 'state-b', toState: 'state-c' },
            { fromState: 'state-c', toState: 'state-a' } // Circular
        ];
        return this;
    }
    
    build() {
        return {
            ...this.data,
            workflowStates: this.workflowStates,
            transitionRules: this.transitionRules,
            approvalProcess: this.approvalProcess,
            rollbackStrategy: this.rollbackStrategy,
            templates: this.templates,
            auditConfiguration: this.auditConfiguration
        };
    }
}
```

## Critical Test Scenarios

### 1. Workflow Security Tests (30+ scenarios)

```javascript
describe('Migration Types Security Tests', () => {
    const securityTester = new SecurityTester();
    const migrationTypeBuilder = new MigrationTypeBuilder();
    
    describe('State Transition Security', () => {
        test('prevents unauthorized state transitions', async () => {
            const migrationType = migrationTypeBuilder
                .withWorkflowStates([
                    { name: 'draft', type: 'initial' },
                    { name: 'approved', type: 'intermediate', requiredPermissions: ['approve-migrations'] },
                    { name: 'in-progress', type: 'intermediate' }
                ])
                .withTransitionRules([
                    { fromState: 'draft', toState: 'approved', requiredApprovals: ['business'] }
                ])
                .build();
            
            const transitionTest = await securityTester.testUnauthorizedTransition(
                migrationType,
                { fromState: 'draft', toState: 'approved' },
                { userRole: 'basic-user' }
            );
            
            expect(transitionTest.transitionBlocked).toBe(true);
            expect(transitionTest.errorCode).toBe(403);
            expect(transitionTest.requiredPermissions).toContain('approve-migrations');
        });
        
        test('validates approval process integrity', async () => {
            const migrationType = migrationTypeBuilder
                .asHighRiskMigrationType()
                .build();
            
            const approvalTest = await securityTester.testApprovalBypass(
                migrationType,
                { attemptedBypass: true, userRole: 'admin' }
            );
            
            expect(approvalTest.bypassPrevented).toBe(true);
            expect(approvalTest.auditLogged).toBe(true);
            expect(approvalTest.escalationTriggered).toBe(true);
        });
        
        test('prevents state manipulation attacks', async () => {
            const migrationType = migrationTypeBuilder
                .withWorkflowStates([
                    { name: 'pending', type: 'initial' },
                    { name: 'completed', type: 'final' }
                ])
                .build();
            
            const manipulationTest = await securityTester.testStateManipulation(
                migrationType,
                { 
                    directStateChange: 'completed',
                    bypassTransitionRules: true
                }
            );
            
            expect(manipulationTest.manipulationPrevented).toBe(true);
            expect(manipulationTest.integrityMaintained).toBe(true);
        });
        
        test('validates rollback authorization', async () => {
            const migrationType = migrationTypeBuilder
                .withRollbackStrategy({
                    supported: true,
                    requiredApprovals: ['security-lead', 'technical-lead']
                })
                .build();
            
            const rollbackTest = await securityTester.testRollbackAuthorization(
                migrationType,
                { userRole: 'operator' }
            );
            
            expect(rollbackTest.rollbackBlocked).toBe(true);
            expect(rollbackTest.missingApprovals).toHaveLength(2);
        });
    });
    
    describe('Approval Process Security', () => {
        test('prevents approval forgery', async () => {
            const migrationType = migrationTypeBuilder
                .withApprovalProcess({
                    minimumApprovers: 2,
                    approverRoles: ['business-approver', 'technical-approver']
                })
                .build();
            
            const forgeryTest = await securityTester.testApprovalForgery(
                migrationType,
                { 
                    forgedApprovals: [
                        { role: 'business-approver', signature: 'fake-signature' }
                    ]
                }
            );
            
            expect(forgeryTest.forgeryDetected).toBe(true);
            expect(forgeryTest.approvalRejected).toBe(true);
            expect(forgeryTest.auditAlertTriggered).toBe(true);
        });
        
        test('validates approval chain integrity', async () => {
            const migrationType = migrationTypeBuilder
                .withApprovalProcess({
                    sequential: true,
                    approverRoles: ['level1', 'level2', 'level3']
                })
                .build();
            
            const chainTest = await securityTester.testApprovalChainIntegrity(
                migrationType,
                { skipToLevel: 3 }
            );
            
            expect(chainTest.chainViolationDetected).toBe(true);
            expect(chainTest.sequentialOrderEnforced).toBe(true);
        });
    });
    
    describe('Audit Trail Security', () => {
        test('ensures tamper-proof audit logs', async () => {
            const migrationType = migrationTypeBuilder
                .withAuditConfiguration({
                    logLevel: 'detailed',
                    encryptionRequired: true
                })
                .build();
            
            const auditTest = await securityTester.testAuditTampering(
                migrationType,
                { attemptLogModification: true }
            );
            
            expect(auditTest.tamperPrevented).toBe(true);
            expect(auditTest.integrityHashValid).toBe(true);
            expect(auditTest.encryptionActive).toBe(true);
        });
        
        test('validates complete audit coverage', async () => {
            const migrationType = migrationTypeBuilder
                .withAuditConfiguration({
                    logLevel: 'detailed',
                    realTimeMonitoring: true
                })
                .build();
            
            const coverageTest = await securityTester.testAuditCoverage(migrationType);
            expect(coverageTest.allActionsLogged).toBe(true);
            expect(coverageTest.realTimeAlertsActive).toBe(true);
        });
    });
});
```

### 2. Workflow Validation and State Management

```javascript
describe('Migration Type Workflow Validation', () => {
    const migrationTypeBuilder = new MigrationTypeBuilder();
    
    test('validates workflow state graph integrity', async () => {
        const validWorkflow = migrationTypeBuilder
            .withWorkflowStates([
                { name: 'draft', type: 'initial' },
                { name: 'review', type: 'intermediate' },
                { name: 'approved', type: 'intermediate' },
                { name: 'in-progress', type: 'intermediate' },
                { name: 'completed', type: 'final' },
                { name: 'failed', type: 'error' }
            ])
            .withTransitionRules([
                { fromState: 'draft', toState: 'review' },
                { fromState: 'review', toState: 'approved' },
                { fromState: 'review', toState: 'draft' },
                { fromState: 'approved', toState: 'in-progress' },
                { fromState: 'in-progress', toState: 'completed' },
                { fromState: 'in-progress', toState: 'failed' }
            ])
            .build();
        
        const validation = await workflowValidator.validateWorkflow(validWorkflow);
        
        expect(validation.isValid).toBe(true);
        expect(validation.hasUnreachableStates).toBe(false);
        expect(validation.hasCircularDependencies).toBe(false);
        expect(validation.hasFinalStates).toBe(true);
    });
    
    test('detects circular workflow dependencies', async () => {
        const circularWorkflow = migrationTypeBuilder
            .withCircularWorkflow()
            .build();
        
        const validation = await workflowValidator.validateWorkflow(circularWorkflow);
        
        expect(validation.isValid).toBe(false);
        expect(validation.hasCircularDependencies).toBe(true);
        expect(validation.circularPaths).toHaveLength(1);
    });
    
    test('validates transition rule consistency', async () => {
        const inconsistentRules = migrationTypeBuilder
            .withWorkflowStates([
                { name: 'start', type: 'initial' },
                { name: 'end', type: 'final' }
            ])
            .withTransitionRules([
                { fromState: 'start', toState: 'nonexistent' },
                { fromState: 'start', toState: 'end', conditions: ['invalid-condition'] }
            ])
            .build();
        
        const validation = await workflowValidator.validateTransitionRules(inconsistentRules);
        
        expect(validation.isValid).toBe(false);
        expect(validation.invalidTransitions).toHaveLength(1);
        expect(validation.invalidConditions).toHaveLength(1);
    });
    
    test('validates approval process configuration', async () => {
        const invalidApprovalConfig = {
            enabled: true,
            minimumApprovers: 3,
            approverRoles: ['role1', 'role2'] // Only 2 roles for 3 minimum approvers
        };
        
        const migrationType = migrationTypeBuilder
            .withApprovalProcess(invalidApprovalConfig)
            .build();
        
        const validation = await approvalValidator.validateApprovalProcess(migrationType);
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Insufficient approver roles');
    });
});
```

### 3. Performance and Scalability Tests

```javascript
describe('Migration Types Performance Tests', () => {
    const performanceTracker = new PerformanceRegressionTracker();
    
    test('workflow state transition performance', async () => {
        const complexWorkflow = migrationTypeBuilder
            .withWorkflowStates(
                Array.from({ length: 20 }, (_, i) => ({
                    name: `state-${i}`,
                    type: i === 0 ? 'initial' : i === 19 ? 'final' : 'intermediate'
                }))
            )
            .withTransitionRules(
                Array.from({ length: 30 }, (_, i) => ({
                    fromState: `state-${i % 19}`,
                    toState: `state-${(i % 19) + 1}`
                }))
            )
            .build();
        
        const transitionBenchmark = await performanceTracker.measureStateTransitions({
            migrationType: complexWorkflow,
            transitionCount: 1000,
            concurrentTransitions: 10
        });
        
        expect(transitionBenchmark.averageTransitionTime).toBeLessThan(100);
        expect(transitionBenchmark.concurrentTransitionSupport).toBe(true);
        expect(transitionBenchmark.stateConsistency).toBe(1.0);
    });
    
    test('approval process performance under load', async () => {
        const approvalIntensiveMigration = migrationTypeBuilder
            .asHighRiskMigrationType()
            .build();
        
        const approvalBenchmark = await performanceTracker.measureApprovalProcessing({
            migrationType: approvalIntensiveMigration,
            concurrentApprovals: 50,
            approvalChainLength: 4
        });
        
        expect(approvalBenchmark.averageApprovalTime).toBeLessThan(200);
        expect(approvalBenchmark.approvalThroughput).toBeGreaterThan(5); // per second
        expect(approvalBenchmark.sequentialIntegrityMaintained).toBe(true);
    });
    
    test('audit log performance', async () => {
        const auditIntensiveMigration = migrationTypeBuilder
            .withAuditConfiguration({
                logLevel: 'detailed',
                realTimeMonitoring: true
            })
            .build();
        
        const auditBenchmark = await performanceTracker.measureAuditPerformance({
            migrationType: auditIntensiveMigration,
            actionsPerSecond: 100,
            duration: 60000 // 1 minute
        });
        
        expect(auditBenchmark.auditLatency).toBeLessThan(50);
        expect(auditBenchmark.auditThroughput).toBeGreaterThan(95); // 95% of actions logged
        expect(auditBenchmark.storageEfficiency).toBeGreaterThan(0.8);
    });
});
```

### 4. Integration with Migration Execution

```javascript
describe('Migration Types Integration Tests', () => {
    let testDatabase;
    let apiClient;
    
    beforeAll(async () => {
        testDatabase = await TestDatabaseManager.createCleanInstance();
        apiClient = new ApiTestClient();
    });
    
    test('integrates with migration instance creation', async () => {
        const migrationType = new MigrationTypeBuilder()
            .withWorkflowStates([
                { name: 'planning', type: 'initial' },
                { name: 'approved', type: 'intermediate' },
                { name: 'executing', type: 'intermediate' },
                { name: 'completed', type: 'final' }
            ])
            .withApprovalProcess({ enabled: true })
            .build();
        
        const migration = new MigrationBuilder()
            .withMigrationType(migrationType.migrationTypeId)
            .build();
        
        // Create migration type and migration
        const migrationTypeResponse = await apiClient.post('/migration-types', migrationType);
        const migrationResponse = await apiClient.post('/migrations', migration);
        
        // Test workflow initialization
        const workflowStatus = await apiClient.get(
            `/migrations/${migrationResponse.data.id}/workflow`
        );
        
        expect(workflowStatus.data.currentState).toBe('planning');
        expect(workflowStatus.data.availableTransitions).toContain('approved');
    });
    
    test('manages template inheritance and customization', async () => {
        const baseTemplate = {
            name: 'Standard Migration Plan',
            content: {
                phases: ['preparation', 'execution', 'validation'],
                requiredApprovals: 2
            }
        };
        
        const migrationType = new MigrationTypeBuilder()
            .withTemplate(baseTemplate)
            .build();
        
        const customMigration = new MigrationBuilder()
            .withMigrationType(migrationType.migrationTypeId)
            .withCustomTemplate({
                phases: ['preparation', 'testing', 'execution', 'validation'],
                requiredApprovals: 3
            })
            .build();
        
        const migrationTypeResponse = await apiClient.post('/migration-types', migrationType);
        const migrationResponse = await apiClient.post('/migrations', customMigration);
        
        // Test template application
        const migrationPlan = await apiClient.get(
            `/migrations/${migrationResponse.data.id}/plan`
        );
        
        expect(migrationPlan.data.phases).toHaveLength(4); // Custom template
        expect(migrationPlan.data.baseTemplate).toBe(baseTemplate.name);
    });
    
    test('enforces rollback constraints across migration hierarchy', async () => {
        const rollbackCapableMigrationType = new MigrationTypeBuilder()
            .withRollbackStrategy({
                supported: true,
                timeLimit: 3600,
                requiredApprovals: ['technical-lead']
            })
            .build();
        
        const migration = new MigrationBuilder()
            .withMigrationType(rollbackCapableMigrationType.migrationTypeId)
            .withState('in-progress')
            .build();
        
        // Create migration type and migration
        const migrationTypeResponse = await apiClient.post('/migration-types', rollbackCapableMigrationType);
        const migrationResponse = await apiClient.post('/migrations', migration);
        
        // Test rollback capability
        const rollbackTest = await apiClient.post(
            `/migrations/${migrationResponse.data.id}/rollback`,
            { reason: 'Test rollback' }
        );
        
        expect(rollbackTest.status).toBe(202); // Accepted for processing
        expect(rollbackTest.data.rollbackSupported).toBe(true);
    });
});
```

## Accessibility Focus Areas

- Workflow state visualization (screen reader friendly)
- Approval process interfaces (keyboard navigation)
- Template editing forms (form validation announcements)
- State transition controls (clear action labeling)
- Audit trail viewing (table navigation)

## Cross-Browser Workflow Management

- Workflow diagram rendering
- Real-time state updates
- Complex form interactions
- File upload for templates

## Performance Benchmarks

- **State transitions**: < 100ms average
- **Approval processing**: < 200ms per approval
- **Workflow validation**: < 500ms for complex workflows
- **Template rendering**: < 300ms
- **Audit logging**: < 50ms latency

## Security Quality Gate Requirements

- **Minimum Security Score**: 9.2/10 (highest due to workflow criticality)
- **State transition security**: 30+ test scenarios
- **Approval process integrity**: 100% tamper-proof
- **Audit trail protection**: Complete immutable logging
- **Authorization validation**: Complete permission matrix testing
- **Rollback security**: Secure rollback authorization and tracking

## Critical Test Infrastructure Requirements

**⚠️ MANDATORY INFRASTRUCTURE PATTERNS** - These issues prevented ANY test execution during Teams migration (0% → 78-80% success rate):

### Pre-Implementation Infrastructure Checklist (NON-NEGOTIABLE)

**Before writing ANY Migration Types entity tests, verify ALL patterns are implemented:**

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
let migrationTypeBuilder;
let securityTester;
let performanceTracker;
let container;
let mockWorkflowManager;
let testData;
let workflowValidator;
let approvalValidator;
let auditTracker;

describe('Migration Types Entity Tests', () => {
    // Tests can access all module-level variables
});
```

### 2. Complete Service Mocking for Migration Types (MANDATORY)
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
                name: 'Test User'
            })
        },
        workflowService: { // CRITICAL for Migration Types entity
            validateWorkflow: jest.fn().mockReturnValue({ valid: true }),
            executeTransition: jest.fn().mockResolvedValue({ success: true }),
            getAvailableTransitions: jest.fn().mockReturnValue(['approved']),
            validateStateTransition: jest.fn().mockReturnValue(true),
            checkCircularDependencies: jest.fn().mockReturnValue(false)
        },
        approvalService: { // CRITICAL for Migration Types entity
            requestApproval: jest.fn().mockResolvedValue({ id: 'approval-1' }),
            validateApprovers: jest.fn().mockReturnValue({ valid: true }),
            checkApprovalChain: jest.fn().mockReturnValue({ complete: false }),
            processApproval: jest.fn().mockResolvedValue({ approved: true }),
            preventApprovalBypass: jest.fn().mockReturnValue(true)
        },
        auditService: { // CRITICAL for Migration Types entity
            logAction: jest.fn().mockResolvedValue(true),
            validateAuditTrail: jest.fn().mockReturnValue({ intact: true }),
            encryptAuditLog: jest.fn().mockReturnValue('encrypted_log'),
            checkTampering: jest.fn().mockReturnValue(false),
            getAuditHistory: jest.fn().mockReturnValue([])
        },
        templateService: { // CRITICAL for Migration Types entity
            validateTemplate: jest.fn().mockReturnValue({ valid: true }),
            applyTemplate: jest.fn().mockReturnValue({ applied: true }),
            inheritTemplate: jest.fn().mockReturnValue({ inherited: true }),
            customizeTemplate: jest.fn().mockReturnValue({ customized: true })
        }
    };
});
```

### 3. Migration Types-Specific Mock Components (MANDATORY)
```javascript
const createMockMigrationTypeComponent = (type, additionalProps = {}) => ({
    id: `mock-migration-type-${type}`,
    type: type,
    migrationMode: true, // CRITICAL
    data: [], // CRITICAL - initialize migration type data
    workflowStates: [],
    transitionRules: [],
    approvalProcess: {},
    currentState: 'draft',
    availableTransitions: [],
    isProcessing: false,
    initialize: jest.fn().mockResolvedValue(true),
    mount: jest.fn(),
    render: jest.fn(),
    update: jest.fn(),
    unmount: jest.fn(),
    destroy: jest.fn(),
    emit: jest.fn(), // CRITICAL for event system
    on: jest.fn(),
    off: jest.fn(),
    // Migration Type-specific methods
    executeTransition: jest.fn(),
    requestApproval: jest.fn(),
    validateWorkflow: jest.fn(),
    auditAction: jest.fn(),
    ...additionalProps
});
```

### 4. Workflow State Event Handling Pattern (MANDATORY)
```javascript
// REQUIRED - manual event emission for workflow events
test('migration type state transition event handling', async () => {
    const migrationTypeComponent = createMockMigrationTypeComponent('workflow');
    orchestrator.registerComponent(migrationTypeComponent);
    
    const transitionData = {
        migrationTypeId: 'test-migration-type',
        fromState: 'draft',
        toState: 'approved',
        approvals: [{ role: 'business', approved: true }],
        auditId: 'audit-123'
    };
    
    // Manual emission - avoids async timing issues
    migrationTypeComponent.emit('stateTransitioned', transitionData);
    
    // Immediate verification
    expect(orchestrator.handleEvent).toHaveBeenCalledWith(
        'stateTransitioned', 
        expect.objectContaining({ fromState: 'draft', toState: 'approved' })
    );
});
```

### 5. Migration Types Entity Test Discovery (MANDATORY)
```javascript
// jest.config.unit.js - REQUIRED for Migration Types entity tests
module.exports = {
    testMatch: [
        '**/__tests__/**/*.(test|spec).js',
        '**/*.(test|spec).js',
        '**/__tests__/entities/migration-types/**/*.(test|spec).js', // CRITICAL
        '**/__tests__/entities/**/*.(test|spec).js', // CRITICAL
        '**/__tests__/components/**/*.(test|spec).js',
        '**/__tests__/security/**/*.(test|spec).js'
    ],
    testEnvironment: 'jsdom', // CRITICAL for DOM access
    setupFilesAfterEnv: ['<rootDir>/jest.setup.unit.js'] // CRITICAL for polyfills
};
```

### Infrastructure Failure Impact on Migration Types Entity

**Migration Types entity is especially vulnerable to infrastructure failures because:**

1. **Workflow Services**: Migration Types tests depend heavily on workflow and state management service mocks
2. **Approval Processing**: Complex approval chain validation requires proper service mocking
3. **Audit Systems**: Comprehensive audit trail management needs complete service mocking
4. **Template Management**: Template inheritance and customization use events extensively
5. **State Management**: Complex state transitions require proper JSDOM setup for UI components

### Migration Types-Specific Infrastructure Validation

**Additional Migration Types entity validation steps:**

- [ ] ✅ workflowService mock includes validation, transition execution, state management methods
- [ ] ✅ approvalService mock includes approval request, validation, chain management methods  
- [ ] ✅ auditService mock includes logging, validation, encryption, tampering detection methods
- [ ] ✅ templateService mock includes validation, application, inheritance, customization methods
- [ ] ✅ Mock components include workflowStates, transitionRules, approvalProcess, currentState properties
- [ ] ✅ Event handlers for state transition, approval, and audit events properly mocked
- [ ] ✅ Test data includes realistic workflow states, transition rules, and approval scenarios
- [ ] ✅ JSDOM setup includes form elements for workflow and approval management
- [ ] ✅ Async operations (state transitions, approvals, auditing) use manual emission pattern
- [ ] ✅ Complex workflow visualization components properly mocked

**CRITICAL**: Without these infrastructure patterns, Migration Types entity tests will fail at 0% execution rate due to highly complex workflow service dependencies and extensive async operations in state management, approval processing, and audit trail management.