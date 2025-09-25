/**
 * ComponentVersionTracker.test.js
 * US-088 Phase 2: Comprehensive Test Suite
 *
 * Tests the ComponentVersionTracker component for:
 * - 4-component version detection (API, UI, Backend, Database)
 * - Version compatibility matrix generation
 * - Semantic version comparison logic
 * - Integration with DatabaseVersionManager
 * - Upgrade path recommendations
 * - Performance requirements validation
 */

const fs = require('fs');
const path = require('path');

// Mock DOM environment for component testing
require('../__mocks__/dom-mock');

// Load the component files
const baseComponentPath = path.join(__dirname, '../../../src/groovy/umig/web/js/components/BaseComponent.js');
const componentPath = path.join(__dirname, '../../../src/groovy/umig/web/js/components/ComponentVersionTracker.js');
const databaseManagerPath = path.join(__dirname, '../../../src/groovy/umig/web/js/components/DatabaseVersionManager.js');

// Check if files exist
if (!fs.existsSync(baseComponentPath)) {
    throw new Error(`BaseComponent.js not found at ${baseComponentPath}`);
}

if (!fs.existsSync(componentPath)) {
    throw new Error(`ComponentVersionTracker.js not found at ${componentPath}`);
}

if (!fs.existsSync(databaseManagerPath)) {
    throw new Error(`DatabaseVersionManager.js not found at ${databaseManagerPath}`);
}

// Mock BaseComponent for testing
global.BaseComponent = class BaseComponent {
    constructor(containerId, config = {}) {
        this.containerId = containerId;
        this.config = config;
        this.container = document.getElementById(containerId);
        this.isMounted = false;
        this.isInitialized = false;
        this.eventListeners = [];
    }

    async initialize() {
        this.isInitialized = true;
        return true;
    }

    async render() {
        // Mock render
    }

    async destroy() {
        this.isInitialized = false;
        this.isMounted = false;
    }

    debug(message) {
        if (this.config.debug) {
            console.log(`[DEBUG] ${message}`);
        }
    }

    error(message, error) {
        console.error(`[ERROR] ${message}`, error);
    }

    warn(message) {
        console.warn(`[WARN] ${message}`);
    }

    addDOMListener(element, event, handler) {
        this.eventListeners.push({ element, event, handler });
        element.addEventListener(event, handler);
    }
};

// Mock DatabaseVersionManager
global.DatabaseVersionManager = class MockDatabaseVersionManager {
    constructor(containerId, config = {}) {
        this.config = config;
        this.semanticVersionMap = new Map();
        this.isInitialized = false;

        // Mock semantic version data
        this.semanticVersionMap.set('001_unified_baseline.sql', {
            version: 'v1.0.0',
            sequence: 1,
            category: 'BASELINE',
            isBreaking: false,
            buildNumber: 1,
            releaseNotes: 'Initial database schema implementation'
        });

        this.semanticVersionMap.set('019_status_field_normalization.sql', {
            version: 'v1.2.0',
            sequence: 19,
            category: 'STATUS_MANAGEMENT',
            isBreaking: true,
            buildNumber: 19,
            releaseNotes: 'Status field normalization and improvements'
        });

        this.semanticVersionMap.set('031_dto_performance_optimization.sql', {
            version: 'v1.3.0',
            sequence: 31,
            category: 'DTO_OPTIMIZATION',
            isBreaking: false,
            buildNumber: 31,
            releaseNotes: 'Data transfer object performance improvements'
        });
    }

    async initialize() {
        this.isInitialized = true;
        return true;
    }

    async destroy() {
        this.isInitialized = false;
    }
};

// Mock fetch for API testing
global.fetch = jest.fn();

// Load the actual component (eval in global context)
const componentCode = fs.readFileSync(componentPath, 'utf8');
eval(componentCode);

describe('ComponentVersionTracker', () => {
    let tracker;
    let container;

    beforeEach(() => {
        // Setup DOM container
        document.body.innerHTML = '<div id="test-container"></div>';
        container = document.getElementById('test-container');

        // Reset fetch mock
        fetch.mockClear();

        // Create tracker instance
        tracker = new ComponentVersionTracker('test-container', {
            debug: true,
            enableAutoRefresh: false,
            refreshInterval: 60000
        });
    });

    afterEach(async () => {
        if (tracker) {
            await tracker.destroy();
        }
        document.body.innerHTML = '';
    });

    describe('Initialization', () => {
        test('should initialize with default configuration', async () => {
            expect(tracker).toBeDefined();
            expect(tracker.config.refreshInterval).toBe(60000);
            expect(tracker.config.enableAutoRefresh).toBe(false);
            expect(tracker.config.enableBreakingChangeDetection).toBe(true);
        });

        test('should initialize version registries', async () => {
            expect(tracker.versionRegistries.api).toBeInstanceOf(Map);
            expect(tracker.versionRegistries.ui).toBeInstanceOf(Map);
            expect(tracker.versionRegistries.backend).toBeInstanceOf(Map);
            expect(tracker.versionRegistries.database).toBeInstanceOf(Map);
        });

        test('should initialize compatibility matrix', async () => {
            expect(tracker.compatibilityMatrix).toBeInstanceOf(Map);
            expect(tracker.analysisCache).toBeInstanceOf(Map);
            expect(tracker.upgradePathCache).toBeInstanceOf(Map);
        });

        test('should initialize component types configuration', async () => {
            expect(tracker.componentTypes).toBeDefined();
            expect(tracker.componentTypes.api).toBeDefined();
            expect(tracker.componentTypes.ui).toBeDefined();
            expect(tracker.componentTypes.backend).toBeDefined();
            expect(tracker.componentTypes.database).toBeDefined();
        });
    });

    describe('DatabaseVersionManager Integration', () => {
        test('should integrate with DatabaseVersionManager when available', async () => {
            await tracker.initializeDatabaseVersionManagerIntegration();
            
            expect(tracker.databaseVersionIntegration.enabled).toBe(true);
            expect(tracker.databaseVersionManager).toBeInstanceOf(global.DatabaseVersionManager);
            expect(tracker.databaseVersionIntegration.lastSync).toBeInstanceOf(Date);
        });

        test('should sync database versions from DatabaseVersionManager', async () => {
            await tracker.initializeDatabaseVersionManagerIntegration();
            await tracker.syncDatabaseVersions();

            const databaseVersion = tracker.versionRegistries.database.get('current');
            expect(databaseVersion).toBeDefined();
            expect(databaseVersion.version).toMatch(/^v\d+\.\d+\.\d+$/);
            expect(databaseVersion.source).toBe('DatabaseVersionManager');
        });

        test('should handle DatabaseVersionManager unavailable gracefully', async () => {
            // Temporarily remove DatabaseVersionManager
            const originalDVManager = global.DatabaseVersionManager;
            delete global.DatabaseVersionManager;

            await tracker.initializeDatabaseVersionManagerIntegration();

            expect(tracker.databaseVersionIntegration.enabled).toBe(false);
            expect(tracker.databaseVersionManager).toBeNull();

            // Restore
            global.DatabaseVersionManager = originalDVManager;
        });
    });

    describe('API Version Detection', () => {
        test('should detect API versions through endpoint analysis', async () => {
            // Mock successful API response
            fetch.mockResolvedValueOnce({
                ok: true,
                headers: {
                    get: jest.fn().mockReturnValue(null)
                }
            });

            await tracker.detectApiVersions();

            const apiVersion = tracker.versionRegistries.api.get('current');
            expect(apiVersion).toBeDefined();
            expect(apiVersion.version).toBe('v2.4.0');
            expect(apiVersion.healthStatus).toBe('operational');
            expect(apiVersion.source).toBe('endpoint-analysis');
        });

        test('should handle API endpoint unavailable', async () => {
            // Mock failed API response
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 404
            });

            await tracker.detectApiVersions();

            const apiVersion = tracker.versionRegistries.api.get('current');
            expect(apiVersion).toBeDefined();
            expect(apiVersion.healthStatus).toBe('unavailable');
            expect(apiVersion.error).toBe('HTTP 404');
        });

        test('should handle network errors gracefully', async () => {
            // Mock network error
            fetch.mockRejectedValueOnce(new Error('Network error'));

            await tracker.detectApiVersions();

            const apiVersion = tracker.versionRegistries.api.get('current');
            expect(apiVersion).toBeDefined();
            expect(apiVersion.version).toBe('v2.4.0'); // Fallback version
            expect(apiVersion.healthStatus).toBe('unknown');
        });
    });

    describe('UI Component Version Detection', () => {
        test('should detect UI component versions through component analysis', async () => {
            // Mock some UI components in global namespace
            global.BaseComponent = class {};
            global.TableComponent = class {};
            global.ModalComponent = class {};
            global.ComponentOrchestrator = class {};

            await tracker.detectUiComponentVersions();

            const uiVersion = tracker.versionRegistries.ui.get('current');
            expect(uiVersion).toBeDefined();
            expect(uiVersion.source).toBe('component-analysis');
            expect(uiVersion.totalComponents).toBeGreaterThan(0);
            expect(uiVersion.availableComponents).toBeGreaterThan(0);
            expect(uiVersion.version).toMatch(/^v\d+\.\d+\.\d+/);
        });

        test('should calculate component availability ratio correctly', async () => {
            // Mock partial component availability
            global.BaseComponent = class {};
            global.TableComponent = class {};
            // Leave other components undefined

            await tracker.detectUiComponentVersions();

            const uiVersion = tracker.versionRegistries.ui.get('current');
            expect(uiVersion.availableComponents).toBeGreaterThan(0);
            expect(uiVersion.availableComponents).toBeLessThan(uiVersion.totalComponents);
            
            const ratio = uiVersion.availableComponents / uiVersion.totalComponents;
            expect(ratio).toBeGreaterThan(0);
            expect(ratio).toBeLessThan(1);
        });

        test('should extract component versions when available', () => {
            // Test component with version property
            const componentWithVersion = class {
                static version = '1.2.3';
            };

            const version = tracker.extractComponentVersion(componentWithVersion);
            expect(version).toBe('1.2.3');
        });
    });

    describe('Backend Service Version Detection', () => {
        test('should detect backend service versions through service analysis', async () => {
            // Mock successful service capability checks
            fetch.mockImplementation((url) => {
                if (url.includes('/users')) {
                    return Promise.resolve({ ok: true });
                }
                if (url.includes('/steps')) {
                    return Promise.resolve({ ok: true });
                }
                if (url.includes('/emailTemplates')) {
                    return Promise.resolve({ ok: true });
                }
                if (url.includes('/urlConfiguration')) {
                    return Promise.resolve({ ok: true });
                }
                return Promise.resolve({ ok: false });
            });

            await tracker.detectBackendServiceVersions();

            const backendVersion = tracker.versionRegistries.backend.get('current');
            expect(backendVersion).toBeDefined();
            expect(backendVersion.source).toBe('service-analysis');
            expect(backendVersion.services).toBeDefined();
            expect(backendVersion.version).toMatch(/^v\d+\.\d+\.\d+/);
            expect(backendVersion.healthStatus).toBeDefined();
        });

        test('should calculate service capability scores correctly', async () => {
            // Mock mixed service capabilities
            fetch.mockImplementation((url) => {
                if (url.includes('/users') || url.includes('/steps')) {
                    return Promise.resolve({ ok: true });
                }
                return Promise.resolve({ ok: false });
            });

            const capabilities = await tracker.checkServiceCapabilities();
            
            expect(capabilities.AuthenticationService).toBe('operational');
            expect(capabilities.StepDataTransformationService).toBe('operational');
            expect(capabilities.EmailService).toBe('limited');
            expect(capabilities.UrlConfigurationService).toBe('limited');
        });
    });

    describe('Semantic Version Parsing', () => {
        test('should parse semantic versions correctly', () => {
            const testCases = [
                { input: 'v1.2.3', expected: { major: 1, minor: 2, patch: 3, prerelease: null, build: null } },
                { input: '2.0.0', expected: { major: 2, minor: 0, patch: 0, prerelease: null, build: null } },
                { input: 'v1.0.0-beta', expected: { major: 1, minor: 0, patch: 0, prerelease: 'beta', build: null } },
                { input: '1.2.3+build.1', expected: { major: 1, minor: 2, patch: 3, prerelease: null, build: 'build.1' } },
                { input: 'invalid', expected: null }
            ];

            testCases.forEach(({ input, expected }) => {
                const result = tracker.parseSemanticVersion(input);
                if (expected === null) {
                    expect(result).toBeNull();
                } else {
                    expect(result.major).toBe(expected.major);
                    expect(result.minor).toBe(expected.minor);
                    expect(result.patch).toBe(expected.patch);
                    expect(result.prerelease).toBe(expected.prerelease);
                    expect(result.build).toBe(expected.build);
                }
            });
        });
    });

    describe('Compatibility Matrix Generation', () => {
        beforeEach(async () => {
            // Set up mock version data
            tracker.systemState.apiVersion = 'v2.4.0';
            tracker.systemState.uiVersion = 'v1.0.0';
            tracker.systemState.backendVersion = 'v1.0.0';
            tracker.systemState.databaseVersion = 'v1.3.0';
        });

        test('should build compatibility matrix for all component pairs', async () => {
            await tracker.buildCompatibilityMatrix();

            expect(tracker.compatibilityMatrix.size).toBeGreaterThan(0);

            // Check that all expected pairs exist
            const expectedPairs = [
                'api-ui', 'api-backend', 'api-database',
                'ui-backend', 'ui-database', 'backend-database'
            ];

            expectedPairs.forEach(pair => {
                expect(tracker.compatibilityMatrix.has(pair)).toBe(true);
            });
        });

        test('should calculate compatibility scores correctly', () => {
            const semVerA = { major: 1, minor: 2, patch: 3 };
            const semVerB = { major: 1, minor: 2, patch: 5 };

            const score = tracker.calculateCompatibilityScore('api', semVerA, 'database', semVerB);
            
            expect(score).toBeGreaterThan(0);
            expect(score).toBeLessThanOrEqual(1);
        });

        test('should detect breaking changes between major versions', () => {
            const semVerA = { major: 1, minor: 0, patch: 0 };
            const semVerB = { major: 2, minor: 0, patch: 0 };

            const breaking = tracker.detectBreakingChanges('api', semVerA, 'database', semVerB);
            expect(breaking).toBe(true);
        });

        test('should not detect breaking changes between minor versions', () => {
            const semVerA = { major: 1, minor: 1, patch: 0 };
            const semVerB = { major: 1, minor: 2, patch: 0 };

            const breaking = tracker.detectBreakingChanges('api', semVerA, 'database', semVerB);
            expect(breaking).toBe(false);
        });

        test('should apply component-specific compatibility rules', () => {
            const semVerA = { major: 2, minor: 4, patch: 0 };
            const semVerB = { major: 1, minor: 3, patch: 0 };

            // API-Database compatibility should be more strict
            const score = tracker.calculateCompatibilityScore('api', semVerA, 'database', semVerB);
            expect(score).toBeLessThan(0.8); // Should be reduced due to major version difference
        });
    });

    describe('System Compatibility Analysis', () => {
        beforeEach(async () => {
            // Set up mock compatibility matrix
            tracker.compatibilityMatrix.set('api-ui', {
                typeA: 'api', typeB: 'ui',
                score: 0.9, status: 'excellent',
                issues: [], recommendations: [], breaking: false
            });

            tracker.compatibilityMatrix.set('api-database', {
                typeA: 'api', typeB: 'database',
                score: 0.7, status: 'acceptable',
                issues: [{ severity: 'medium', description: 'Minor compatibility issue' }],
                recommendations: [{ priority: 'low', description: 'Consider upgrade' }],
                breaking: false
            });
        });

        test('should analyze overall system compatibility', async () => {
            await tracker.analyzeSystemCompatibility();

            expect(tracker.systemState.compatibilityScore).toBeGreaterThan(0);
            expect(tracker.systemState.compatibilityScore).toBeLessThanOrEqual(1);
            expect(tracker.systemState.overallHealth).toBeDefined();
        });

        test('should calculate correct average compatibility score', async () => {
            await tracker.analyzeSystemCompatibility();

            const expectedScore = (0.9 + 0.7) / 2; // Average of mock scores
            expect(tracker.systemState.compatibilityScore).toBeCloseTo(expectedScore, 2);
        });

        test('should determine overall health correctly', () => {
            tracker.systemState.compatibilityScore = 0.95;
            const health = tracker.determineOverallHealth();
            expect(health).toBe('excellent');

            tracker.systemState.compatibilityScore = 0.75;
            const health2 = tracker.determineOverallHealth();
            expect(health2).toBe('good');

            tracker.systemState.compatibilityScore = 0.4;
            const health3 = tracker.determineOverallHealth();
            expect(health3).toBe('poor');
        });

        test('should collect active issues from compatibility matrix', () => {
            const issues = tracker.collectActiveIssues();
            expect(issues).toHaveLength(1);
            expect(issues[0].severity).toBe('medium');
            expect(issues[0].description).toBe('Minor compatibility issue');
        });
    });

    describe('Upgrade Path Generation', () => {
        beforeEach(() => {
            tracker.systemState.apiVersion = 'v2.4.0';
            tracker.systemState.uiVersion = 'v1.0.0';
            tracker.systemState.backendVersion = 'v1.0.0';
            tracker.systemState.databaseVersion = 'v1.3.0';
        });

        test('should generate upgrade path with correct sequence', () => {
            const upgradePath = tracker.generateUpgradePath();

            expect(upgradePath.currentState).toBeDefined();
            expect(upgradePath.recommendedState).toBeDefined();
            expect(upgradePath.steps).toHaveLength(4); // One for each component

            // Verify step ordering (database first, UI last)
            const stepComponents = upgradePath.steps.map(step => step.component);
            expect(stepComponents[0]).toBe('Database');
            expect(stepComponents[stepComponents.length - 1]).toBe('UI');
        });

        test('should generate detailed upgrade steps', () => {
            const current = {
                database: 'v1.3.0',
                backend: 'v1.0.0',
                api: 'v2.4.0',
                ui: 'v1.0.0'
            };
            
            const recommended = {
                database: 'v1.4.0',
                backend: 'v1.1.0',
                api: 'v2.5.0',
                ui: 'v1.1.0'
            };

            const steps = tracker.generateUpgradeSteps(current, recommended);

            expect(steps).toHaveLength(4);
            steps.forEach(step => {
                expect(step.order).toBeGreaterThan(0);
                expect(step.component).toBeDefined();
                expect(step.from).toBeDefined();
                expect(step.to).toBeDefined();
                expect(step.description).toBeDefined();
                expect(step.risk).toMatch(/^(low|medium|high)$/);
            });
        });
    });

    describe('Performance Requirements', () => {
        test('should complete initialization within performance target', async () => {
            const startTime = performance.now();
            await tracker.initialize();
            const endTime = performance.now();

            const initTime = endTime - startTime;
            expect(initTime).toBeLessThan(5000); // Should complete within 5 seconds
        });

        test('should generate compatibility matrix within performance target', async () => {
            // Set up mock version data
            tracker.systemState.apiVersion = 'v2.4.0';
            tracker.systemState.uiVersion = 'v1.0.0';
            tracker.systemState.backendVersion = 'v1.0.0';
            tracker.systemState.databaseVersion = 'v1.3.0';

            const startTime = performance.now();
            await tracker.buildCompatibilityMatrix();
            const endTime = performance.now();

            const matrixTime = endTime - startTime;
            expect(matrixTime).toBeLessThan(2000); // Should complete within 2 seconds
        });

        test('should track performance metrics correctly', async () => {
            expect(tracker.performanceMetrics).toBeDefined();
            expect(tracker.performanceMetrics.detectionTime).toBeDefined();
            expect(tracker.performanceMetrics.matrixGenerationTime).toBeDefined();
            expect(tracker.performanceMetrics.analysisTime).toBeDefined();
            expect(tracker.performanceMetrics.totalOperationTime).toBeDefined();
        });
    });

    describe('Report Generation', () => {
        beforeEach(async () => {
            // Set up complete mock state
            tracker.systemState.apiVersion = 'v2.4.0';
            tracker.systemState.uiVersion = 'v1.0.0';
            tracker.systemState.backendVersion = 'v1.0.0';
            tracker.systemState.databaseVersion = 'v1.3.0';
            tracker.systemState.compatibilityScore = 0.85;
            tracker.systemState.overallHealth = 'good';
            
            await tracker.buildCompatibilityMatrix();
            await tracker.analyzeSystemCompatibility();
        });

        test('should generate comprehensive compatibility report', () => {
            const report = tracker.generateCompatibilityReport();

            expect(report).toContain('COMPONENT VERSION COMPATIBILITY REPORT');
            expect(report).toContain('COMPONENT VERSIONS:');
            expect(report).toContain('COMPATIBILITY MATRIX:');
            expect(report).toContain('PERFORMANCE METRICS:');
            expect(report).toContain(tracker.systemState.apiVersion);
            expect(report).toContain(tracker.systemState.overallHealth.toUpperCase());
        });

        test('should include all version information in report', () => {
            const report = tracker.generateCompatibilityReport();

            expect(report).toContain(`API Version:      ${tracker.systemState.apiVersion}`);
            expect(report).toContain(`UI Version:       ${tracker.systemState.uiVersion}`);
            expect(report).toContain(`Backend Version:  ${tracker.systemState.backendVersion}`);
            expect(report).toContain(`Database Version: ${tracker.systemState.databaseVersion}`);
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle missing container element gracefully', async () => {
            const badTracker = new ComponentVersionTracker('non-existent-container');
            
            // Should not throw but may have limited functionality
            expect(badTracker.container).toBeNull();
        });

        test('should handle invalid version strings', () => {
            const invalidVersions = ['not-a-version', '', null, undefined, 'v1.2', 'v1.2.3.4.5'];

            invalidVersions.forEach(version => {
                const parsed = tracker.parseSemanticVersion(version);
                expect(parsed).toBeNull();
            });
        });

        test('should handle network failures during version detection', async () => {
            fetch.mockRejectedValue(new Error('Network failure'));

            // Should not throw
            await expect(tracker.detectApiVersions()).resolves.not.toThrow();

            const apiVersion = tracker.versionRegistries.api.get('current');
            expect(apiVersion.healthStatus).toBe('unknown');
        });

        test('should handle empty compatibility matrix gracefully', async () => {
            // Clear the matrix
            tracker.compatibilityMatrix.clear();
            
            await tracker.analyzeSystemCompatibility();
            
            expect(tracker.systemState.compatibilityScore).toBe(0);
            expect(tracker.systemState.overallHealth).toBe('unknown');
        });
    });

    describe('Component Lifecycle', () => {
        test('should initialize and destroy cleanly', async () => {
            await tracker.initialize();
            expect(tracker.isInitialized).toBe(true);

            await tracker.destroy();
            expect(tracker.isInitialized).toBe(false);
        });

        test('should clean up resources on destroy', async () => {
            await tracker.initialize();
            
            // Add some data to registries
            tracker.versionRegistries.api.set('test', { version: 'v1.0.0' });
            tracker.compatibilityMatrix.set('test', { score: 0.8 });

            await tracker.destroy();

            expect(tracker.versionRegistries.api.size).toBe(0);
            expect(tracker.compatibilityMatrix.size).toBe(0);
        });

        test('should stop auto-refresh on destroy', async () => {
            const autoRefreshTracker = new ComponentVersionTracker('test-container', {
                enableAutoRefresh: true,
                refreshInterval: 100
            });

            await autoRefreshTracker.initialize();
            expect(autoRefreshTracker.refreshTimer).toBeDefined();

            await autoRefreshTracker.destroy();
            expect(autoRefreshTracker.refreshTimer).toBeNull();
        });
    });
});

describe('ComponentVersionTracker Integration', () => {
    test('should integrate with DatabaseVersionManager when available', async () => {
        document.body.innerHTML = '<div id="integration-test"></div>';
        
        const tracker = new ComponentVersionTracker('integration-test', {
            debug: true
        });

        await tracker.initialize();

        expect(tracker.databaseVersionIntegration.enabled).toBe(true);
        expect(tracker.databaseVersionManager).toBeInstanceOf(global.DatabaseVersionManager);

        const databaseVersion = tracker.versionRegistries.database.get('current');
        expect(databaseVersion).toBeDefined();
        expect(databaseVersion.source).toBe('DatabaseVersionManager');

        await tracker.destroy();
    });

    test('should provide complete version compatibility overview', async () => {
        document.body.innerHTML = '<div id="overview-test"></div>';
        
        const tracker = new ComponentVersionTracker('overview-test', {
            debug: false,
            enableAutoRefresh: false
        });

        // Mock fetch for API detection
        fetch.mockResolvedValue({
            ok: true,
            headers: { get: () => null }
        });

        await tracker.initialize();

        // Verify all component types have been detected
        expect(tracker.systemState.apiVersion).toBeDefined();
        expect(tracker.systemState.uiVersion).toBeDefined();
        expect(tracker.systemState.backendVersion).toBeDefined();
        expect(tracker.systemState.databaseVersion).toBeDefined();

        // Verify compatibility analysis
        expect(tracker.systemState.compatibilityScore).toBeGreaterThanOrEqual(0);
        expect(tracker.systemState.overallHealth).toBeDefined();

        // Verify matrix generation
        expect(tracker.compatibilityMatrix.size).toBeGreaterThan(0);

        await tracker.destroy();
    });
});