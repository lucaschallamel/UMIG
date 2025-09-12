# Labels Entity Test Specification

**Target Coverage**: 95% functional, 85% integration, 88% accessibility, 85% cross-browser, 92% performance  
**Security Priority**: MEDIUM (categorization and search security important)
**Unique Focus**: Categorization logic, search optimization, bulk operations, hierarchical relationships

## Entity-Specific Test Structure

```
labels/
├── labels.unit.test.js              # Core label operations
├── labels.integration.test.js       # API & search integration
├── labels.security.test.js          # Categorization & search security (25+ scenarios)
├── labels.performance.test.js       # Search & bulk operation performance
├── labels.accessibility.test.js     # Label management UI
├── labels.edge-cases.test.js        # Categorization and hierarchy edge cases
├── labels.cross-browser.test.js     # Label interface compatibility
└── builders/
    └── LabelBuilder.js             # Label test data builder
```

## LabelBuilder Specializations

```javascript
class LabelBuilder {
    constructor() {
        this.data = this.getDefaultLabelData();
        this.categories = [];
        this.hierarchy = { parent: null, children: [] };
        this.searchIndex = {};
        this.bulkOperations = [];
        this.relationships = [];
    }
    
    getDefaultLabelData() {
        return {
            labelId: generateUUID(),
            name: `label-${Date.now()}`,
            description: 'Test Label',
            color: '#007bff',
            textColor: '#ffffff',
            category: 'general',
            type: 'tag',
            isActive: true,
            isSystem: false,
            sortOrder: 0,
            usageCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'test-user',
            metadata: {}
        };
    }
    
    // Category-specific builders
    withCategory(category) {
        this.data.category = category;
        this.categories.push({
            name: category,
            description: `Category: ${category}`,
            rules: [],
            constraints: []
        });
        return this;
    }
    
    withHierarchy(parent, children = []) {
        if (parent) {
            this.hierarchy.parent = {
                labelId: parent.labelId || parent,
                name: parent.name || 'Parent Label',
                level: parent.level || 0
            };
        }
        
        this.hierarchy.children = children.map(child => ({
            labelId: child.labelId || child,
            name: child.name || 'Child Label',
            level: (this.hierarchy.parent?.level || 0) + 1
        }));
        
        return this;
    }
    
    withBulkLabels(count, pattern = {}) {
        this.bulkOperations = Array.from({ length: count }, (_, index) => ({
            labelId: generateUUID(),
            name: pattern.nameTemplate ? 
                pattern.nameTemplate.replace('{index}', index) : 
                `bulk-label-${index}`,
            category: pattern.category || this.data.category,
            color: pattern.color || this.data.color,
            type: pattern.type || this.data.type
        }));
        return this;
    }
    
    withSearchIndex() {
        this.searchIndex = {
            terms: this.extractSearchTerms(),
            synonyms: [],
            weights: {
                name: 1.0,
                description: 0.7,
                category: 0.5,
                metadata: 0.3
            },
            boost: 1.0,
            facets: ['category', 'type', 'color']
        };
        return this;
    }
    
    withColor(color, textColor = null) {
        this.data.color = color;
        this.data.textColor = textColor || this.calculateContrastColor(color);
        return this;
    }
    
    withRelationships(relationships) {
        this.relationships = relationships.map(rel => ({
            type: rel.type, // 'requires', 'excludes', 'implies', 'related'
            targetLabelId: rel.targetLabelId,
            weight: rel.weight || 1.0,
            bidirectional: rel.bidirectional || false
        }));
        return this;
    }
    
    withUsageMetrics(metrics) {
        this.data.usageCount = metrics.usageCount || 0;
        this.data.metadata.lastUsed = metrics.lastUsed;
        this.data.metadata.popularityScore = metrics.popularityScore || 0;
        this.data.metadata.contexts = metrics.contexts || [];
        return this;
    }
    
    asSystemLabel() {
        this.data.isSystem = true;
        this.data.category = 'system';
        this.data.color = '#6c757d';
        this.data.type = 'system';
        return this;
    }
    
    asHighPriorityLabel() {
        this.data.category = 'priority';
        this.data.color = '#dc3545';
        this.data.textColor = '#ffffff';
        this.data.sortOrder = 1000;
        return this;
    }
    
    asDeprecatedLabel() {
        this.data.isActive = false;
        this.data.category = 'deprecated';
        this.data.color = '#6c757d';
        this.data.metadata.deprecationReason = 'No longer used';
        this.data.metadata.replacedBy = [];
        return this;
    }
    
    withInvalidData() {
        this.data.name = ''; // Invalid empty name
        this.data.color = 'invalid-color';
        this.data.category = null;
        return this;
    }
    
    withSpecialCharacters() {
        this.data.name = '<script>alert("xss")</script>';
        this.data.description = '${injection} attempt';
        this.data.metadata = {
            maliciousKey: '../../etc/passwd',
            sqlInjection: "'; DROP TABLE labels; --"
        };
        return this;
    }
    
    extractSearchTerms() {
        const text = `${this.data.name} ${this.data.description} ${this.data.category}`;
        return text.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    }
    
    calculateContrastColor(bgColor) {
        // Simple contrast calculation for accessibility
        const hex = bgColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 155 ? '#000000' : '#ffffff';
    }
    
    build() {
        return {
            ...this.data,
            categories: this.categories,
            hierarchy: this.hierarchy,
            searchIndex: this.searchIndex,
            bulkOperations: this.bulkOperations,
            relationships: this.relationships
        };
    }
}
```

## Critical Test Scenarios

### 1. Categorization and Search Security Tests (25+ scenarios)

```javascript
describe('Labels Security Tests', () => {
    const securityTester = new SecurityTester();
    const labelBuilder = new LabelBuilder();
    
    describe('Input Sanitization', () => {
        test('prevents XSS in label names and descriptions', async () => {
            const label = labelBuilder
                .withSpecialCharacters()
                .build();
            
            const xssTest = await securityTester.testXssVulnerability(label);
            expect(xssTest.hasXssVulnerability).toBe(false);
            expect(xssTest.sanitizedName).not.toContain('<script>');
            expect(xssTest.sanitizedDescription).not.toContain('${injection}');
        });
        
        test('prevents SQL injection in search queries', async () => {
            const maliciousSearch = "'; DROP TABLE labels; --";
            
            const injectionTest = await securityTester.testSqlInjection(
                'labelSearch',
                { query: maliciousSearch }
            );
            
            expect(injectionTest.isVulnerable).toBe(false);
            expect(injectionTest.queryExecuted).not.toContain('DROP TABLE');
        });
        
        test('validates path traversal in metadata', async () => {
            const label = labelBuilder
                .withUsageMetrics({
                    contexts: ['../../etc/passwd', '../config/secrets.json']
                })
                .build();
            
            const pathTest = await securityTester.testPathTraversal(label);
            expect(pathTest.hasPathTraversal).toBe(false);
            expect(pathTest.sanitizedPaths).not.toMatch(/\.\./);
        });
    });
    
    describe('Search Security', () => {
        test('prevents search enumeration attacks', async () => {
            const searchAttempts = Array.from({ length: 100 }, (_, i) => 
                `system-label-${i}`
            );
            
            const enumerationTest = await securityTester.testSearchEnumeration(
                searchAttempts
            );
            
            expect(enumerationTest.rateLimited).toBe(true);
            expect(enumerationTest.blockedAfterThreshold).toBe(true);
        });
        
        test('validates search result access control', async () => {
            const restrictedLabel = labelBuilder
                .asSystemLabel()
                .withCategory('internal')
                .build();
            
            const accessTest = await securityTester.testSearchAccessControl(
                'internal',
                { userRole: 'basic-user' }
            );
            
            expect(accessTest.hasUnauthorizedAccess).toBe(false);
            expect(accessTest.filteredResults).not.toContain(restrictedLabel.labelId);
        });
        
        test('prevents information disclosure through search', async () => {
            const sensitiveLabel = labelBuilder
                .withCategory('sensitive')
                .withUsageMetrics({
                    contexts: ['classified-project', 'internal-team']
                })
                .build();
            
            const disclosureTest = await securityTester.testInformationDisclosure(
                sensitiveLabel
            );
            
            expect(disclosureTest.exposesSecrets).toBe(false);
            expect(disclosureTest.metadataFiltered).toBe(true);
        });
    });
    
    describe('Bulk Operation Security', () => {
        test('validates bulk operation authorization', async () => {
            const bulkOperation = {
                action: 'delete',
                labelIds: Array.from({ length: 50 }, () => generateUUID())
            };
            
            const bulkSecurityTest = await securityTester.testBulkOperationSecurity(
                bulkOperation,
                { userRole: 'read-only' }
            );
            
            expect(bulkSecurityTest.operationBlocked).toBe(true);
            expect(bulkSecurityTest.errorCode).toBe(403);
        });
        
        test('prevents bulk operation resource exhaustion', async () => {
            const largeBulkOperation = {
                action: 'create',
                labels: Array.from({ length: 10000 }, () => 
                    labelBuilder.build()
                )
            };
            
            const resourceTest = await securityTester.testResourceExhaustion(
                largeBulkOperation
            );
            
            expect(resourceTest.operationLimited).toBe(true);
            expect(resourceTest.maxBatchSize).toBeLessThanOrEqual(1000);
        });
    });
});
```

### 2. Search Performance and Optimization

```javascript
describe('Labels Search Performance Tests', () => {
    const performanceTracker = new PerformanceRegressionTracker();
    
    test('search performance with large label datasets', async () => {
        // Create test dataset
        const labels = Array.from({ length: 10000 }, (_, i) => 
            new LabelBuilder()
                .withCategory(['priority', 'status', 'team', 'project'][i % 4])
                .withSearchIndex()
                .build()
        );
        
        await testDatabase.insertLabels(labels);
        
        const searchBenchmark = await performanceTracker.measureSearchPerformance({
            queries: [
                'priority',
                'status:active',
                'team:frontend',
                'project AND status'
            ],
            iterations: 100
        });
        
        expect(searchBenchmark.averageSearchTime).toBeLessThan(100); // 100ms
        expect(searchBenchmark.p95SearchTime).toBeLessThan(500); // 500ms
        expect(searchBenchmark.searchThroughput).toBeGreaterThan(10); // queries/sec
    });
    
    test('faceted search performance', async () => {
        const facetedSearchBenchmark = await performanceTracker.measureFacetedSearch({
            facets: ['category', 'type', 'color', 'isActive'],
            dataset_size: 10000,
            concurrent_users: 20
        });
        
        expect(facetedSearchBenchmark.averageFacetTime).toBeLessThan(50);
        expect(facetedSearchBenchmark.facetAccuracy).toBeGreaterThan(0.99);
    });
    
    test('autocomplete performance', async () => {
        const autocompleteBenchmark = await performanceTracker.measureAutocomplete({
            prefixes: ['pr', 'sta', 'tea', 'proj'],
            min_length: 2,
            max_results: 10
        });
        
        expect(autocompleteBenchmark.averageAutocompleteTime).toBeLessThan(50);
        expect(autocompleteBenchmark.relevanceScore).toBeGreaterThan(0.8);
    });
    
    test('bulk operations performance', async () => {
        const bulkSizes = [10, 50, 100, 500, 1000];
        
        for (const size of bulkSizes) {
            const bulkBenchmark = await performanceTracker.measureBulkOperation({
                operation: 'create',
                size: size,
                data: () => new LabelBuilder().build()
            });
            
            const expectedTime = size * 10; // 10ms per label
            expect(bulkBenchmark.totalTime).toBeLessThan(expectedTime);
            expect(bulkBenchmark.successRate).toBe(1.0);
        }
    });
});
```

### 3. Hierarchical Relationship Management

```javascript
describe('Label Hierarchy and Relationships', () => {
    const labelBuilder = new LabelBuilder();
    
    test('validates hierarchical constraints', async () => {
        const grandparent = labelBuilder
            .withCategory('root')
            .build();
        
        const parent = labelBuilder
            .withCategory('branch')
            .withHierarchy(grandparent)
            .build();
        
        const child = labelBuilder
            .withCategory('leaf')
            .withHierarchy(parent)
            .build();
        
        // Test circular dependency prevention
        const circularTest = await labelManager.validateHierarchy(child, grandparent);
        expect(circularTest.hasCircularDependency).toBe(false);
        
        // Test depth limits
        const depthTest = await labelManager.validateHierarchyDepth(child);
        expect(depthTest.exceedsMaxDepth).toBe(false);
        expect(depthTest.currentDepth).toBeLessThanOrEqual(5);
    });
    
    test('manages label relationships', async () => {
        const urgentLabel = labelBuilder
            .withCategory('priority')
            .build();
        
        const blockerLabel = labelBuilder
            .withCategory('status')
            .withRelationships([
                { type: 'implies', targetLabelId: urgentLabel.labelId }
            ])
            .build();
        
        const relationshipTest = await labelManager.validateRelationships(blockerLabel);
        expect(relationshipTest.hasValidRelationships).toBe(true);
        expect(relationshipTest.impliedLabels).toContain(urgentLabel.labelId);
    });
    
    test('handles orphaned labels in hierarchy changes', async () => {
        const parent = labelBuilder.build();
        const child = labelBuilder.withHierarchy(parent).build();
        
        // Create parent and child
        await apiClient.post('/labels', parent);
        await apiClient.post('/labels', child);
        
        // Delete parent
        await apiClient.delete(`/labels/${parent.labelId}`);
        
        // Check child handling
        const orphanTest = await apiClient.get(`/labels/${child.labelId}`);
        expect(orphanTest.data.hierarchy.parent).toBeNull();
        expect(orphanTest.data.isOrphan).toBe(true);
    });
});
```

### 4. Integration with Entity Labeling

```javascript
describe('Labels Integration Tests', () => {
    let testDatabase;
    let apiClient;
    
    beforeAll(async () => {
        testDatabase = await TestDatabaseManager.createCleanInstance();
        apiClient = new ApiTestClient();
    });
    
    test('integrates with migration labeling', async () => {
        const priorityLabel = new LabelBuilder()
            .asHighPriorityLabel()
            .build();
        
        const migration = new MigrationBuilder()
            .withLabels([priorityLabel.labelId])
            .build();
        
        // Create label and migration
        const labelResponse = await apiClient.post('/labels', priorityLabel);
        const migrationResponse = await apiClient.post('/migrations', migration);
        
        // Test label association
        const labelAssociation = await apiClient.get(
            `/migrations/${migrationResponse.data.id}/labels`
        );
        
        expect(labelAssociation.data.labels).toHaveLength(1);
        expect(labelAssociation.data.labels[0].id).toBe(labelResponse.data.id);
    });
    
    test('manages label lifecycle with entity relationships', async () => {
        const teamLabel = new LabelBuilder()
            .withCategory('team')
            .build();
        
        const team = new TeamBuilder()
            .withLabels([teamLabel.labelId])
            .build();
        
        // Create label and team
        const labelResponse = await apiClient.post('/labels', teamLabel);
        const teamResponse = await apiClient.post('/teams', team);
        
        // Try to delete label (should check usage)
        const deleteResponse = await apiClient.delete(`/labels/${labelResponse.data.id}`);
        expect(deleteResponse.status).toBe(409); // Conflict - label in use
        expect(deleteResponse.data.usageCount).toBeGreaterThan(0);
    });
    
    test('supports label-based filtering and search', async () => {
        const statusLabels = ['active', 'inactive', 'pending'].map(status =>
            new LabelBuilder()
                .withCategory('status')
                .withUsageMetrics({ usageCount: 10 })
                .build()
        );
        
        // Create labels
        for (const label of statusLabels) {
            await apiClient.post('/labels', label);
        }
        
        // Test filtering by labels
        const filterResponse = await apiClient.get('/migrations', {
            params: { labels: 'status:active,status:pending' }
        });
        
        expect(filterResponse.status).toBe(200);
        expect(filterResponse.data.filters.appliedLabels).toBeDefined();
    });
});
```

## Accessibility Focus Areas

- Label selection interfaces (keyboard navigation)
- Color picker accessibility (screen reader support)
- Hierarchical label trees (ARIA tree roles)
- Bulk selection operations (accessible multiselect)
- Search result announcements

## Cross-Browser Label Management

- Color rendering consistency
- Drag-and-drop for hierarchy management
- Search autocomplete functionality
- Label preview and visualization

## Performance Benchmarks

- **Search response**: < 100ms average, < 500ms p95
- **Bulk operations**: < 10ms per label
- **Autocomplete**: < 50ms response time
- **Faceted search**: < 50ms with 10,000+ labels
- **Hierarchy operations**: < 200ms for deep trees

## Security Quality Gate Requirements

- **Minimum Security Score**: 8.5/10
- **Input sanitization**: 25+ test scenarios
- **Search security**: Complete query sanitization
- **Access control**: Proper result filtering
- **Resource protection**: Bulk operation limits
- **Information disclosure prevention**: Metadata filtering

## Critical Test Infrastructure Requirements

**⚠️ MANDATORY INFRASTRUCTURE PATTERNS** - These issues prevented ANY test execution during Teams migration (0% → 78-80% success rate):

### Pre-Implementation Infrastructure Checklist (NON-NEGOTIABLE)

**Before writing ANY Labels entity tests, verify ALL patterns are implemented:**

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
let labelBuilder;
let securityTester;
let performanceTracker;
let container;
let mockLabelManager;
let testData;
let searchEngine;
let hierarchyManager;

describe('Labels Entity Tests', () => {
    // Tests can access all module-level variables
});
```

### 2. Complete Service Mocking for Labels (MANDATORY)
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
        searchService: { // CRITICAL for Labels entity
            indexLabel: jest.fn().mockResolvedValue(true),
            searchLabels: jest.fn().mockResolvedValue({ results: [], total: 0 }),
            autocomplete: jest.fn().mockResolvedValue(['suggestion1', 'suggestion2']),
            facetedSearch: jest.fn().mockResolvedValue({ facets: {}, results: [] })
        },
        categoryService: { // CRITICAL for Labels entity
            validateCategory: jest.fn().mockReturnValue({ valid: true }),
            getCategories: jest.fn().mockReturnValue(['general', 'priority', 'status']),
            getCategoryRules: jest.fn().mockReturnValue({ rules: [] }),
            applyCategoryConstraints: jest.fn().mockReturnValue(true)
        },
        hierarchyService: { // CRITICAL for Labels entity
            validateHierarchy: jest.fn().mockReturnValue({ valid: true, depth: 2 }),
            checkCircularDependency: jest.fn().mockReturnValue(false),
            updateHierarchy: jest.fn().mockResolvedValue(true),
            getAncestors: jest.fn().mockReturnValue([]),
            getDescendants: jest.fn().mockReturnValue([])
        }
    };
});
```

### 3. Labels-Specific Mock Components (MANDATORY)
```javascript
const createMockLabelComponent = (type, additionalProps = {}) => ({
    id: `mock-label-${type}`,
    type: type,
    migrationMode: true, // CRITICAL
    data: [], // CRITICAL - initialize label data
    categories: [],
    hierarchy: { parent: null, children: [] },
    searchIndex: {},
    isSearching: false,
    selectedLabels: [],
    initialize: jest.fn().mockResolvedValue(true),
    mount: jest.fn(),
    render: jest.fn(),
    update: jest.fn(),
    unmount: jest.fn(),
    destroy: jest.fn(),
    emit: jest.fn(), // CRITICAL for event system
    on: jest.fn(),
    off: jest.fn(),
    // Label-specific methods
    searchLabels: jest.fn(),
    createLabel: jest.fn(),
    updateHierarchy: jest.fn(),
    bulkOperation: jest.fn(),
    ...additionalProps
});
```

### 4. Label Search Event Handling Pattern (MANDATORY)
```javascript
// REQUIRED - manual event emission for search events
test('label search event handling', async () => {
    const labelComponent = createMockLabelComponent('search');
    orchestrator.registerComponent(labelComponent);
    
    const searchData = {
        query: 'priority',
        results: [{ id: 'label1', name: 'High Priority' }],
        facets: { category: ['priority'], type: ['tag'] }
    };
    
    // Manual emission - avoids async timing issues
    labelComponent.emit('searchCompleted', searchData);
    
    // Immediate verification
    expect(orchestrator.handleEvent).toHaveBeenCalledWith(
        'searchCompleted', 
        expect.objectContaining({ query: 'priority' })
    );
});
```

### 5. Labels Entity Test Discovery (MANDATORY)
```javascript
// jest.config.unit.js - REQUIRED for Labels entity tests
module.exports = {
    testMatch: [
        '**/__tests__/**/*.(test|spec).js',
        '**/*.(test|spec).js',
        '**/__tests__/entities/labels/**/*.(test|spec).js', // CRITICAL
        '**/__tests__/entities/**/*.(test|spec).js', // CRITICAL
        '**/__tests__/components/**/*.(test|spec).js',
        '**/__tests__/security/**/*.(test|spec).js'
    ],
    testEnvironment: 'jsdom', // CRITICAL for DOM access
    setupFilesAfterEnv: ['<rootDir>/jest.setup.unit.js'] // CRITICAL for polyfills
};
```

### Infrastructure Failure Impact on Labels Entity

**Labels entity is especially vulnerable to infrastructure failures because:**

1. **Search Services**: Labels tests depend heavily on search and indexing service mocks
2. **Category Management**: Complex categorization rules require proper service mocking
3. **Hierarchy Operations**: Tree-like relationships need complete hierarchy service mocking
4. **Bulk Operations**: Large dataset operations use events and async patterns extensively
5. **Form Interactions**: Label creation and editing forms require proper JSDOM setup

### Labels-Specific Infrastructure Validation

**Additional Labels entity validation steps:**

- [ ] ✅ searchService mock includes indexing, search, autocomplete, faceted search methods
- [ ] ✅ categoryService mock includes validation, rules, constraints methods  
- [ ] ✅ hierarchyService mock includes validation, circular dependency checks, hierarchy updates
- [ ] ✅ Mock components include categories, hierarchy, searchIndex, selectedLabels properties
- [ ] ✅ Event handlers for search, categorization, and hierarchy events properly mocked
- [ ] ✅ Test data includes realistic label hierarchy and categorization scenarios
- [ ] ✅ JSDOM setup includes form elements for label creation and editing
- [ ] ✅ Async operations (search, bulk operations, hierarchy updates) use manual emission pattern
- [ ] ✅ Search result rendering and selection components properly mocked

**CRITICAL**: Without these infrastructure patterns, Labels entity tests will fail at 0% execution rate due to complex search service dependencies and extensive async operations in categorization and hierarchy management.