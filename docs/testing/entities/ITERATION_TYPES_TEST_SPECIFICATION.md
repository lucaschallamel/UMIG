# Iteration Types Entity Test Specification

**Target Coverage**: 95% functional, 85% integration, 88% accessibility, 85% cross-browser, 92% performance  
**Security Priority**: MEDIUM-HIGH (template and scheduling security important)
**Unique Focus**: Template inheritance, scheduling constraints, resource allocation, timeline validation

## Entity-Specific Test Structure

```
iteration-types/
├── iteration-types.unit.test.js           # Core iteration type operations
├── iteration-types.integration.test.js    # API & scheduling integration
├── iteration-types.security.test.js       # Template & scheduling security (28+ scenarios)
├── iteration-types.performance.test.js    # Scheduling & resource performance
├── iteration-types.accessibility.test.js  # Iteration type management UI
├── iteration-types.edge-cases.test.js     # Scheduling and dependency edge cases
├── iteration-types.cross-browser.test.js  # Management interface compatibility
└── builders/
    └── IterationTypeBuilder.js           # Iteration type test data builder
```

## IterationTypeBuilder Specializations

```javascript
class IterationTypeBuilder {
    constructor() {
        this.data = this.getDefaultIterationTypeData();
        this.templates = [];
        this.scheduleConstraints = {};
        this.resourceRequirements = {};
        this.dependencyRules = [];
        this.executionPatterns = [];
        this.validationRules = [];
    }
    
    getDefaultIterationTypeData() {
        return {
            iterationTypeId: generateUUID(),
            name: `iteration-type-${Date.now()}`,
            description: 'Test Iteration Type',
            category: 'standard',
            version: '1.0.0',
            isActive: true,
            isTemplate: false,
            baseIterationType: null,
            complexity: 'medium',
            estimatedDuration: 120, // minutes
            minDuration: 60,
            maxDuration: 240,
            parallelExecutionSupported: true,
            rollbackSupported: true,
            automationLevel: 'semi-automated',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'test-user',
            metadata: {}
        };
    }
    
    // Template-specific builders
    withTemplate(template) {
        this.templates.push({
            templateId: template.templateId || generateUUID(),
            name: template.name,
            type: template.type || 'execution-plan',
            version: template.version || '1.0.0',
            isInherited: template.isInherited || false,
            parentTemplateId: template.parentTemplateId,
            content: template.content || {},
            variables: template.variables || {},
            requiredFields: template.requiredFields || [],
            validationRules: template.validationRules || [],
            customizations: template.customizations || {}
        });
        return this;
    }
    
    withSchedule(schedule) {
        this.scheduleConstraints = {
            startTimeConstraints: schedule.startTimeConstraints || {},
            endTimeConstraints: schedule.endTimeConstraints || {},
            timeWindows: schedule.timeWindows || [],
            excludedPeriods: schedule.excludedPeriods || [],
            bufferTime: schedule.bufferTime || 15, // minutes
            maxConcurrentIterations: schedule.maxConcurrentIterations || 5,
            resourceOverlapPolicy: schedule.resourceOverlapPolicy || 'prevent',
            timeZone: schedule.timeZone || 'UTC',
            workingHours: schedule.workingHours || {
                start: '09:00',
                end: '17:00',
                weekdays: [1, 2, 3, 4, 5] // Monday-Friday
            }
        };
        return this;
    }
    
    withResourceRequirements(resources) {
        this.resourceRequirements = {
            personnel: resources.personnel || [],
            systems: resources.systems || [],
            infrastructure: resources.infrastructure || [],
            tools: resources.tools || [],
            minimumTeamSize: resources.minimumTeamSize || 2,
            maximumTeamSize: resources.maximumTeamSize || 10,
            requiredSkills: resources.requiredSkills || [],
            exclusiveResources: resources.exclusiveResources || [],
            sharedResources: resources.sharedResources || []
        };
        return this;
    }
    
    withDependencyOrder(order) {
        this.dependencyRules = order.map(rule => ({
            ruleId: rule.ruleId || generateUUID(),
            dependsOn: rule.dependsOn,
            dependencyType: rule.dependencyType || 'finish-to-start',
            lag: rule.lag || 0, // minutes
            lead: rule.lead || 0,
            mandatory: rule.mandatory !== false,
            condition: rule.condition,
            failureHandling: rule.failureHandling || 'block'
        }));
        return this;
    }
    
    withExecutionPattern(pattern) {
        this.executionPatterns.push({
            patternId: pattern.patternId || generateUUID(),
            name: pattern.name,
            type: pattern.type || 'sequential',
            phases: pattern.phases || [],
            parallelism: pattern.parallelism || 1,
            retryPolicy: pattern.retryPolicy || {
                maxRetries: 3,
                retryDelay: 300, // seconds
                backoffStrategy: 'exponential'
            },
            failureHandling: pattern.failureHandling || 'abort',
            checkpoints: pattern.checkpoints || [],
            rollbackPoints: pattern.rollbackPoints || []
        });
        return this;
    }
    
    withValidationRules(rules) {
        this.validationRules = rules.map(rule => ({
            ruleId: rule.ruleId || generateUUID(),
            name: rule.name,
            type: rule.type,
            condition: rule.condition,
            errorMessage: rule.errorMessage,
            severity: rule.severity || 'error',
            phase: rule.phase || 'pre-execution',
            required: rule.required !== false
        }));
        return this;
    }
    
    asTemplateType() {
        this.data.isTemplate = true;
        this.data.category = 'template';
        this.data.baseIterationType = null;
        this.withTemplate({
            name: 'Base Template',
            type: 'master-template',
            content: {
                defaultPhases: ['preparation', 'execution', 'validation'],
                defaultDuration: this.data.estimatedDuration
            }
        });
        return this;
    }
    
    asInheritedType(baseTypeId) {
        this.data.baseIterationType = baseTypeId;
        this.data.isTemplate = false;
        this.withTemplate({
            name: 'Inherited Template',
            type: 'derived-template',
            isInherited: true,
            parentTemplateId: baseTypeId,
            customizations: {
                additionalPhases: ['custom-validation'],
                modifiedSettings: { bufferTime: 30 }
            }
        });
        return this;
    }
    
    asHighComplexityType() {
        this.data.complexity = 'high';
        this.data.estimatedDuration = 480; // 8 hours
        this.data.parallelExecutionSupported = false; // Too complex for parallel
        this.withResourceRequirements({
            minimumTeamSize: 5,
            maximumTeamSize: 15,
            requiredSkills: ['senior-engineer', 'system-architect', 'database-specialist']
        });
        this.withExecutionPattern({
            type: 'staged',
            phases: ['pre-check', 'phase-1', 'validation-1', 'phase-2', 'validation-2', 'finalization']
        });
        return this;
    }
    
    asAutomatedType() {
        this.data.automationLevel = 'fully-automated';
        this.data.complexity = 'low';
        this.data.parallelExecutionSupported = true;
        this.withExecutionPattern({
            type: 'parallel',
            parallelism: 5,
            failureHandling: 'continue-others'
        });
        this.withResourceRequirements({
            personnel: [],
            systems: ['automation-server', 'monitoring-system'],
            minimumTeamSize: 0
        });
        return this;
    }
    
    withInvalidScheduling() {
        this.scheduleConstraints = {
            startTimeConstraints: {
                earliestStart: new Date(Date.now() + 86400000), // Tomorrow
                latestStart: new Date(Date.now() - 86400000)    // Yesterday - Invalid!
            },
            maxConcurrentIterations: -1, // Invalid negative value
            workingHours: {
                start: '25:00', // Invalid hour
                end: '17:00'
            }
        };
        return this;
    }
    
    withCircularDependencies() {
        this.dependencyRules = [
            { dependsOn: 'iteration-b' },
            { dependsOn: 'iteration-c' },
            { dependsOn: 'iteration-a' } // Creates A->B->C->A cycle
        ];
        return this;
    }
    
    build() {
        return {
            ...this.data,
            templates: this.templates,
            scheduleConstraints: this.scheduleConstraints,
            resourceRequirements: this.resourceRequirements,
            dependencyRules: this.dependencyRules,
            executionPatterns: this.executionPatterns,
            validationRules: this.validationRules
        };
    }
}
```

## Critical Test Scenarios

### 1. Template and Scheduling Security Tests (28+ scenarios)

```javascript
describe('Iteration Types Security Tests', () => {
    const securityTester = new SecurityTester();
    const iterationTypeBuilder = new IterationTypeBuilder();
    
    describe('Template Security', () => {
        test('prevents template injection attacks', async () => {
            const maliciousTemplate = {
                name: 'Malicious Template',
                content: {
                    script: '${system.exec("rm -rf /"))',
                    sql: 'SELECT * FROM users WHERE id = ${user_input}',
                    eval: 'eval(user_provided_code)'
                }
            };
            
            const iterationType = iterationTypeBuilder
                .withTemplate(maliciousTemplate)
                .build();
            
            const injectionTest = await securityTester.testTemplateInjection(iterationType);
            expect(injectionTest.hasInjectionVulnerability).toBe(false);
            expect(injectionTest.sanitizedContent).not.toContain('system.exec');
        });
        
        test('validates template inheritance security', async () => {
            const parentTemplate = iterationTypeBuilder
                .asTemplateType()
                .build();
            
            const maliciousChild = iterationTypeBuilder
                .asInheritedType(parentTemplate.iterationTypeId)
                .withTemplate({
                    customizations: {
                        overrideSecuritySettings: true,
                        bypassValidation: '${admin.bypass()}'
                    }
                })
                .build();
            
            const inheritanceTest = await securityTester.testTemplateInheritanceSecurity(
                maliciousChild
            );
            
            expect(inheritanceTest.securityViolationDetected).toBe(true);
            expect(inheritanceTest.customizationBlocked).toBe(true);
        });
        
        test('prevents unauthorized template modifications', async () => {
            const systemTemplate = iterationTypeBuilder
                .asTemplateType()
                .build();
            
            const modificationTest = await securityTester.testUnauthorizedTemplateModification(
                systemTemplate,
                { userRole: 'basic-user', modification: 'critical-setting-change' }
            );
            
            expect(modificationTest.modificationBlocked).toBe(true);
            expect(modificationTest.auditLogged).toBe(true);
        });
    });
    
    describe('Scheduling Security', () => {
        test('prevents schedule manipulation for privilege escalation', async () => {
            const iterationType = iterationTypeBuilder
                .withSchedule({
                    timeWindows: [
                        { start: '00:00', end: '23:59', privileges: 'system-admin' }
                    ]
                })
                .build();
            
            const scheduleTest = await securityTester.testSchedulePrivilegeEscalation(
                iterationType,
                { userRole: 'operator' }
            );
            
            expect(scheduleTest.escalationPrevented).toBe(true);
            expect(scheduleTest.scheduleAccessDenied).toBe(true);
        });
        
        test('validates resource access authorization', async () => {
            const iterationType = iterationTypeBuilder
                .withResourceRequirements({
                    systems: ['production-database', 'backup-system'],
                    exclusiveResources: ['critical-server']
                })
                .build();
            
            const resourceTest = await securityTester.testResourceAccessAuthorization(
                iterationType,
                { userRole: 'developer' }
            );
            
            expect(resourceTest.unauthorizedResourcesBlocked).toBe(true);
            expect(resourceTest.accessibleResources).not.toContain('production-database');
        });
        
        test('prevents timing-based attacks', async () => {
            const iterationType = iterationTypeBuilder
                .withSchedule({
                    excludedPeriods: [
                        { start: '02:00', end: '03:00', reason: 'backup-window' }
                    ]
                })
                .build();
            
            const timingTest = await securityTester.testTimingAttackPrevention(iterationType);
            expect(timingTest.timingInformationLeakage).toBe(false);
            expect(timingTest.scheduleObfuscated).toBe(true);
        });
    });
    
    describe('Execution Pattern Security', () => {
        test('validates parallel execution security boundaries', async () => {
            const iterationType = iterationTypeBuilder
                .withExecutionPattern({
                    type: 'parallel',
                    parallelism: 10,
                    phases: ['data-migration', 'user-migration', 'cleanup']
                })
                .build();
            
            const parallelTest = await securityTester.testParallelExecutionSecurity(
                iterationType
            );
            
            expect(parallelTest.isolationMaintained).toBe(true);
            expect(parallelTest.resourceLeakagePrevented).toBe(true);
            expect(parallelTest.crossContaminationPrevented).toBe(true);
        });
        
        test('prevents execution pattern manipulation', async () => {
            const criticalIterationType = iterationTypeBuilder
                .asHighComplexityType()
                .build();
            
            const manipulationTest = await securityTester.testExecutionPatternManipulation(
                criticalIterationType,
                { attemptedChanges: ['bypass-validation', 'skip-approval'] }
            );
            
            expect(manipulationTest.manipulationPrevented).toBe(true);
            expect(manipulationTest.patternIntegrityMaintained).toBe(true);
        });
    });
});
```

### 2. Scheduling and Dependency Validation

```javascript
describe('Iteration Type Scheduling Validation', () => {
    const iterationTypeBuilder = new IterationTypeBuilder();
    
    test('validates scheduling constraint consistency', async () => {
        const validScheduling = iterationTypeBuilder
            .withSchedule({
                startTimeConstraints: {
                    earliestStart: new Date(Date.now() + 3600000), // 1 hour from now
                    latestStart: new Date(Date.now() + 86400000)   // 1 day from now
                },
                timeWindows: [
                    { start: '09:00', end: '17:00', weekdays: [1, 2, 3, 4, 5] }
                ],
                bufferTime: 15
            })
            .build();
        
        const validation = await scheduleValidator.validateScheduleConstraints(validScheduling);
        
        expect(validation.isValid).toBe(true);
        expect(validation.hasTimeConflicts).toBe(false);
        expect(validation.bufferTimeAdequate).toBe(true);
    });
    
    test('detects invalid scheduling configurations', async () => {
        const invalidScheduling = iterationTypeBuilder
            .withInvalidScheduling()
            .build();
        
        const validation = await scheduleValidator.validateScheduleConstraints(invalidScheduling);
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Latest start before earliest start');
        expect(validation.errors).toContain('Invalid working hours');
    });
    
    test('validates resource allocation feasibility', async () => {
        const resourceIntensiveType = iterationTypeBuilder
            .withResourceRequirements({
                minimumTeamSize: 10,
                maximumTeamSize: 5, // Invalid - min > max
                requiredSkills: ['skill1', 'skill2', 'skill3'],
                exclusiveResources: ['resource1', 'resource2']
            })
            .build();
        
        const resourceValidation = await resourceValidator.validateResourceRequirements(
            resourceIntensiveType
        );
        
        expect(resourceValidation.isValid).toBe(false);
        expect(resourceValidation.errors).toContain('Minimum team size exceeds maximum');
    });
    
    test('detects circular dependency chains', async () => {
        const circularDependencies = iterationTypeBuilder
            .withCircularDependencies()
            .build();
        
        const dependencyValidation = await dependencyValidator.validateDependencies(
            circularDependencies
        );
        
        expect(dependencyValidation.hasCircularDependencies).toBe(true);
        expect(dependencyValidation.circularChains).toHaveLength(1);
    });
    
    test('validates template inheritance hierarchy', async () => {
        const baseTemplate = new IterationTypeBuilder()
            .asTemplateType()
            .build();
        
        const derivedTemplate = new IterationTypeBuilder()
            .asInheritedType(baseTemplate.iterationTypeId)
            .build();
        
        const inheritanceValidation = await templateValidator.validateInheritance(
            derivedTemplate,
            baseTemplate
        );
        
        expect(inheritanceValidation.isValidInheritance).toBe(true);
        expect(inheritanceValidation.customizationsValid).toBe(true);
    });
});
```

### 3. Performance and Resource Optimization

```javascript
describe('Iteration Types Performance Tests', () => {
    const performanceTracker = new PerformanceRegressionTracker();
    
    test('template rendering performance', async () => {
        const complexTemplate = iterationTypeBuilder
            .withTemplate({
                content: {
                    phases: Array.from({ length: 50 }, (_, i) => `phase-${i}`),
                    variables: Object.fromEntries(
                        Array.from({ length: 100 }, (_, i) => [`var${i}`, `value${i}`])
                    )
                }
            })
            .build();
        
        const renderBenchmark = await performanceTracker.measureTemplateRendering({
            iterationType: complexTemplate,
            renderCount: 100,
            concurrentRenders: 10
        });
        
        expect(renderBenchmark.averageRenderTime).toBeLessThan(300);
        expect(renderBenchmark.memoryUsage).toBeLessThan(50 * 1024 * 1024); // 50MB
        expect(renderBenchmark.concurrentRenderSupport).toBe(true);
    });
    
    test('scheduling algorithm performance', async () => {
        const multipleIterationTypes = Array.from({ length: 100 }, () =>
            new IterationTypeBuilder()
                .withSchedule({
                    timeWindows: [
                        { start: '09:00', end: '17:00' }
                    ],
                    maxConcurrentIterations: Math.floor(Math.random() * 5) + 1
                })
                .withResourceRequirements({
                    minimumTeamSize: Math.floor(Math.random() * 3) + 2
                })
                .build()
        );
        
        const schedulingBenchmark = await performanceTracker.measureSchedulingPerformance({
            iterationTypes: multipleIterationTypes,
            schedulingWindow: 7 * 24 * 60, // 1 week in minutes
            resourcePool: {
                personnel: 50,
                systems: 20
            }
        });
        
        expect(schedulingBenchmark.averageSchedulingTime).toBeLessThan(1000);
        expect(schedulingBenchmark.resourceUtilizationEfficiency).toBeGreaterThan(0.8);
        expect(schedulingBenchmark.conflictResolutionTime).toBeLessThan(500);
    });
    
    test('dependency resolution performance', async () => {
        const complexDependencyChain = Array.from({ length: 50 }, (_, i) =>
            new IterationTypeBuilder()
                .withDependencyOrder(i > 0 ? [{ dependsOn: `iteration-${i - 1}` }] : [])
                .build()
        );
        
        const dependencyBenchmark = await performanceTracker.measureDependencyResolution({
            iterationTypes: complexDependencyChain,
            resolutionAlgorithm: 'topological-sort'
        });
        
        expect(dependencyBenchmark.averageResolutionTime).toBeLessThan(200);
        expect(dependencyBenchmark.correctnessScore).toBe(1.0);
    });
    
    test('resource allocation optimization', async () => {
        const resourceConstrainedScenario = Array.from({ length: 20 }, () =>
            new IterationTypeBuilder()
                .withResourceRequirements({
                    systems: [`system-${Math.floor(Math.random() * 10)}`],
                    minimumTeamSize: Math.floor(Math.random() * 5) + 1
                })
                .withSchedule({
                    timeWindows: [{ start: '09:00', end: '17:00' }]
                })
                .build()
        );
        
        const allocationBenchmark = await performanceTracker.measureResourceAllocation({
            iterationTypes: resourceConstrainedScenario,
            availableResources: {
                systems: Array.from({ length: 10 }, (_, i) => `system-${i}`),
                personnel: 25
            }
        });
        
        expect(allocationBenchmark.allocationEfficiency).toBeGreaterThan(0.85);
        expect(allocationBenchmark.resourceUtilization).toBeGreaterThan(0.9);
    });
});
```

### 4. Integration with Migration Execution Pipeline

```javascript
describe('Iteration Types Integration Tests', () => {
    let testDatabase;
    let apiClient;
    
    beforeAll(async () => {
        testDatabase = await TestDatabaseManager.createCleanInstance();
        apiClient = new ApiTestClient();
    });
    
    test('integrates with migration iteration scheduling', async () => {
        const iterationType = new IterationTypeBuilder()
            .withSchedule({
                timeWindows: [{ start: '09:00', end: '17:00' }],
                maxConcurrentIterations: 3
            })
            .withResourceRequirements({
                minimumTeamSize: 2,
                systems: ['test-system']
            })
            .build();
        
        const migration = new MigrationBuilder()
            .withIterations([
                { iterationTypeId: iterationType.iterationTypeId, scheduledStart: new Date() }
            ])
            .build();
        
        // Create iteration type and migration
        const iterationTypeResponse = await apiClient.post('/iteration-types', iterationType);
        const migrationResponse = await apiClient.post('/migrations', migration);
        
        // Test scheduling integration
        const scheduleResponse = await apiClient.get(
            `/migrations/${migrationResponse.data.id}/schedule`
        );
        
        expect(scheduleResponse.data.iterations).toHaveLength(1);
        expect(scheduleResponse.data.resourceAllocation).toBeDefined();
        expect(scheduleResponse.data.timelineValid).toBe(true);
    });
    
    test('manages template customization inheritance', async () => {
        const baseIterationType = new IterationTypeBuilder()
            .asTemplateType()
            .build();
        
        const customIterationType = new IterationTypeBuilder()
            .asInheritedType(baseIterationType.iterationTypeId)
            .build();
        
        const iteration = new IterationBuilder()
            .withIterationType(customIterationType.iterationTypeId)
            .withCustomSettings({
                bufferTime: 45,
                additionalValidation: true
            })
            .build();
        
        // Create hierarchy and iteration
        const baseResponse = await apiClient.post('/iteration-types', baseIterationType);
        const customResponse = await apiClient.post('/iteration-types', customIterationType);
        const iterationResponse = await apiClient.post('/iterations', iteration);
        
        // Test template inheritance
        const templateResponse = await apiClient.get(
            `/iterations/${iterationResponse.data.id}/template`
        );
        
        expect(templateResponse.data.baseTemplate).toBe(baseIterationType.name);
        expect(templateResponse.data.customizations.bufferTime).toBe(45);
        expect(templateResponse.data.inheritanceChain).toHaveLength(2);
    });
    
    test('validates resource conflicts across concurrent iterations', async () => {
        const exclusiveResourceType = new IterationTypeBuilder()
            .withResourceRequirements({
                exclusiveResources: ['critical-database'],
                systems: ['backup-system']
            })
            .build();
        
        const conflictingIterations = Array.from({ length: 3 }, () =>
            new IterationBuilder()
                .withIterationType(exclusiveResourceType.iterationTypeId)
                .withSchedule({
                    start: new Date(Date.now() + 3600000), // Same time
                    duration: 120
                })
                .build()
        );
        
        const iterationTypeResponse = await apiClient.post('/iteration-types', exclusiveResourceType);
        
        // Create conflicting iterations
        const iterationResponses = await Promise.all(
            conflictingIterations.map(iteration =>
                apiClient.post('/iterations', iteration)
            )
        );
        
        // Test conflict detection
        const conflictResponse = await apiClient.get('/iterations/conflicts');
        
        expect(conflictResponse.data.resourceConflicts).toHaveLength(1);
        expect(conflictResponse.data.conflictingResources).toContain('critical-database');
        expect(conflictResponse.data.affectedIterations).toHaveLength(3);
    });
    
    test('enforces execution pattern constraints', async () => {
        const sequentialIterationType = new IterationTypeBuilder()
            .withExecutionPattern({
                type: 'sequential',
                phases: ['phase-1', 'phase-2', 'phase-3'],
                failureHandling: 'abort'
            })
            .build();
        
        const iteration = new IterationBuilder()
            .withIterationType(sequentialIterationType.iterationTypeId)
            .withPhaseExecution([
                { phase: 'phase-1', status: 'completed' },
                { phase: 'phase-2', status: 'failed' }
                // phase-3 should not be executable due to phase-2 failure
            ])
            .build();
        
        const iterationTypeResponse = await apiClient.post('/iteration-types', sequentialIterationType);
        const iterationResponse = await apiClient.post('/iterations', iteration);
        
        // Test execution constraint enforcement
        const executionAttempt = await apiClient.post(
            `/iterations/${iterationResponse.data.id}/execute-phase`,
            { phase: 'phase-3' }
        );
        
        expect(executionAttempt.status).toBe(409); // Conflict
        expect(executionAttempt.data.error).toContain('Previous phase failed');
    });
});
```

## Accessibility Focus Areas

- Template editing interfaces (complex form navigation)
- Scheduling visualizations (calendar accessibility)
- Resource allocation displays (data table accessibility)
- Dependency diagram navigation (graph accessibility)
- Timeline and Gantt chart alternatives

## Cross-Browser Template Management

- Template editor compatibility
- Scheduling calendar widgets
- Drag-and-drop dependency management
- Real-time resource utilization charts

## Performance Benchmarks

- **Template rendering**: < 300ms for complex templates
- **Scheduling calculations**: < 1 second for 100+ iterations
- **Dependency resolution**: < 200ms for complex chains
- **Resource allocation**: < 500ms optimization
- **Template inheritance**: < 100ms resolution

## Security Quality Gate Requirements

- **Minimum Security Score**: 8.6/10
- **Template security**: 28+ test scenarios
- **Scheduling authorization**: Complete access control validation
- **Resource protection**: Prevent unauthorized resource access
- **Inheritance security**: Secure template customization
- **Execution pattern integrity**: Prevent pattern manipulation

## Critical Test Infrastructure Requirements

**⚠️ MANDATORY INFRASTRUCTURE PATTERNS** - These issues prevented ANY test execution during Teams migration (0% → 78-80% success rate):

### Pre-Implementation Infrastructure Checklist (NON-NEGOTIABLE)

**Before writing ANY Iteration Types entity tests, verify ALL patterns are implemented:**

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
let iterationTypeBuilder;
let securityTester;
let performanceTracker;
let container;
let mockIterationManager;
let testData;
let scheduleValidator;
let resourceValidator;
let templateValidator;
let dependencyValidator;

describe('Iteration Types Entity Tests', () => {
    // Tests can access all module-level variables
});
```

### 2. Complete Service Mocking for Iteration Types (MANDATORY)
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
        templateService: { // CRITICAL for Iteration Types entity
            renderTemplate: jest.fn().mockResolvedValue({ rendered: true }),
            validateTemplate: jest.fn().mockReturnValue({ valid: true }),
            inheritTemplate: jest.fn().mockReturnValue({ inherited: true }),
            customizeTemplate: jest.fn().mockReturnValue({ customized: true }),
            resolveInheritance: jest.fn().mockReturnValue({ chain: [] })
        },
        schedulingService: { // CRITICAL for Iteration Types entity
            validateSchedule: jest.fn().mockReturnValue({ valid: true }),
            calculateOptimalSchedule: jest.fn().mockResolvedValue({ schedule: {} }),
            checkResourceConflicts: jest.fn().mockReturnValue({ conflicts: [] }),
            allocateResources: jest.fn().mockResolvedValue({ allocated: true }),
            validateTimeWindows: jest.fn().mockReturnValue(true)
        },
        resourceService: { // CRITICAL for Iteration Types entity
            validateResourceRequirements: jest.fn().mockReturnValue({ valid: true }),
            checkResourceAvailability: jest.fn().mockResolvedValue({ available: true }),
            allocateExclusiveResources: jest.fn().mockResolvedValue({ allocated: true }),
            optimizeResourceAllocation: jest.fn().mockResolvedValue({ optimized: true }),
            trackResourceUtilization: jest.fn().mockReturnValue({ utilization: 0.7 })
        },
        dependencyService: { // CRITICAL for Iteration Types entity
            validateDependencies: jest.fn().mockReturnValue({ valid: true, cycles: [] }),
            resolveDependencyOrder: jest.fn().mockReturnValue({ order: [] }),
            checkCircularDependencies: jest.fn().mockReturnValue(false),
            calculateCriticalPath: jest.fn().mockReturnValue({ path: [], duration: 0 })
        }
    };
});
```

### 3. Iteration Types-Specific Mock Components (MANDATORY)
```javascript
const createMockIterationTypeComponent = (type, additionalProps = {}) => ({
    id: `mock-iteration-type-${type}`,
    type: type,
    migrationMode: true, // CRITICAL
    data: [], // CRITICAL - initialize iteration type data
    templates: [],
    scheduleConstraints: {},
    resourceRequirements: {},
    dependencyRules: [],
    executionPatterns: [],
    isScheduling: false,
    isProcessingTemplate: false,
    initialize: jest.fn().mockResolvedValue(true),
    mount: jest.fn(),
    render: jest.fn(),
    update: jest.fn(),
    unmount: jest.fn(),
    destroy: jest.fn(),
    emit: jest.fn(), // CRITICAL for event system
    on: jest.fn(),
    off: jest.fn(),
    // Iteration Type-specific methods
    renderTemplate: jest.fn(),
    calculateSchedule: jest.fn(),
    validateDependencies: jest.fn(),
    allocateResources: jest.fn(),
    ...additionalProps
});
```

### 4. Template and Scheduling Event Handling Pattern (MANDATORY)
```javascript
// REQUIRED - manual event emission for template and scheduling events
test('iteration type template rendering event handling', async () => {
    const iterationTypeComponent = createMockIterationTypeComponent('template');
    orchestrator.registerComponent(iterationTypeComponent);
    
    const templateData = {
        iterationTypeId: 'test-iteration-type',
        templateId: 'test-template',
        renderedContent: { phases: ['prep', 'exec', 'validate'] },
        inheritanceChain: ['base-template'],
        customizations: { bufferTime: 30 }
    };
    
    // Manual emission - avoids async timing issues
    iterationTypeComponent.emit('templateRendered', templateData);
    
    // Immediate verification
    expect(orchestrator.handleEvent).toHaveBeenCalledWith(
        'templateRendered', 
        expect.objectContaining({ templateId: 'test-template' })
    );
});
```

### 5. Iteration Types Entity Test Discovery (MANDATORY)
```javascript
// jest.config.unit.js - REQUIRED for Iteration Types entity tests
module.exports = {
    testMatch: [
        '**/__tests__/**/*.(test|spec).js',
        '**/*.(test|spec).js',
        '**/__tests__/entities/iteration-types/**/*.(test|spec).js', // CRITICAL
        '**/__tests__/entities/**/*.(test|spec).js', // CRITICAL
        '**/__tests__/components/**/*.(test|spec).js',
        '**/__tests__/security/**/*.(test|spec).js'
    ],
    testEnvironment: 'jsdom', // CRITICAL for DOM access
    setupFilesAfterEnv: ['<rootDir>/jest.setup.unit.js'] // CRITICAL for polyfills
};
```

### Infrastructure Failure Impact on Iteration Types Entity

**Iteration Types entity is especially vulnerable to infrastructure failures because:**

1. **Template Services**: Iteration Types tests depend heavily on template rendering and inheritance service mocks
2. **Scheduling Systems**: Complex scheduling and resource allocation requires proper service mocking
3. **Dependency Management**: Dependency resolution and circular dependency detection need complete service mocking
4. **Resource Management**: Resource allocation and conflict detection use events extensively
5. **Complex UI Components**: Template editors and scheduling visualizations require proper JSDOM setup

### Iteration Types-Specific Infrastructure Validation

**Additional Iteration Types entity validation steps:**

- [ ] ✅ templateService mock includes rendering, validation, inheritance, customization methods
- [ ] ✅ schedulingService mock includes validation, optimization, conflict checking methods  
- [ ] ✅ resourceService mock includes requirement validation, availability checking, allocation methods
- [ ] ✅ dependencyService mock includes validation, resolution, circular dependency detection methods
- [ ] ✅ Mock components include templates, scheduleConstraints, resourceRequirements, dependencyRules properties
- [ ] ✅ Event handlers for template rendering, scheduling, and resource allocation events properly mocked
- [ ] ✅ Test data includes realistic template inheritance, scheduling constraints, and dependency scenarios
- [ ] ✅ JSDOM setup includes form elements for template editing and scheduling configuration
- [ ] ✅ Async operations (template rendering, scheduling, resource allocation) use manual emission pattern
- [ ] ✅ Complex scheduling and template visualization components properly mocked

**CRITICAL**: Without these infrastructure patterns, Iteration Types entity tests will fail at 0% execution rate due to complex template service dependencies and extensive async operations in scheduling, resource allocation, and dependency management.