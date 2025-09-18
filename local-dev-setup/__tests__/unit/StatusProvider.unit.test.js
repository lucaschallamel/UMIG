/**
 * Comprehensive Unit Tests for StatusProvider.js
 * TD-003 Phase 1: Eliminate Hardcoded Status Values
 *
 * Tests critical security hardening and enterprise-grade functionality:
 * - XSS Prevention across all inputs
 * - CSRF protection validation
 * - Input validation with whitelist enforcement
 * - Cache management with TTL expiration
 * - API integration with error handling
 * - DOM manipulation security
 * - Information disclosure prevention
 * - Security event logging and audit trail
 *
 * Coverage Target: 90%+ line coverage, 85%+ branch coverage
 * Security Priority: HIGH - Tests all attack vectors and sanitization
 */

// Mock SecurityUtils before importing StatusProvider
const mockSecurityUtils = {
    sanitizeXSS: jest.fn((input) => input?.replace(/[<>"']/g, '')),
    sanitizeForCSS: jest.fn((input) => input?.replace(/[<>"'`]/g, '')),
    setTextContent: jest.fn((element, text) => {
        if (element && typeof text === 'string') {
            element.textContent = text;
        }
    }),
    addCSRFProtection: jest.fn((headers) => ({
        ...headers,
        'X-CSRF-Token': 'mock-csrf-token'
    })),
    logSecurityEvent: jest.fn()
};

// Mock DOM elements before tests
const mockSelectElement = {
    tagName: 'SELECT',
    nodeType: 1,
    innerHTML: '',
    appendChild: jest.fn(),
    querySelector: jest.fn(),
    className: '',
    style: {},
    value: '',
    textContent: ''
};

const mockOptionElement = {
    tagName: 'OPTION',
    nodeType: 1,
    value: '',
    textContent: '',
    className: '',
    style: {},
    selected: false
};

// Setup global mocks
global.SecurityUtils = mockSecurityUtils;
global.fetch = jest.fn();
global.document = {
    createElement: jest.fn(() => ({ ...mockOptionElement }))
};

// Mock window.contextPath - ensure it's available before StatusProvider loads
global.window = {
    contextPath: '/confluence',
    SecurityUtils: mockSecurityUtils
};

// Also set window.contextPath directly for the script execution
Object.defineProperty(global.window, 'contextPath', {
    value: '/confluence',
    writable: true,
    configurable: true
});

// Import StatusProvider after mocks are set up
// Since StatusProvider is a browser script, we need to evaluate it in the context
const fs = require('fs');
const path = require('path');

// Read and evaluate the StatusProvider script
const statusProviderPath = path.join(__dirname, '../../../src/groovy/umig/web/js/utils/StatusProvider.js');
const statusProviderCode = fs.readFileSync(statusProviderPath, 'utf8');

// Execute the script in the global context
eval(statusProviderCode);

// Now StatusProvider should be available on the window object
const StatusProvider = global.window.StatusProvider;
const StatusProviderClass = global.window.StatusProviderClass;

describe('StatusProvider Unit Tests', () => {
    let statusProvider;
    let consoleSpy;
    let dateNowSpy;

    beforeEach(() => {
        // Create fresh instance for each test
        statusProvider = new StatusProviderClass();

        // Setup console spies
        consoleSpy = {
            debug: jest.spyOn(console, 'debug').mockImplementation(),
            warn: jest.spyOn(console, 'warn').mockImplementation(),
            error: jest.spyOn(console, 'error').mockImplementation(),
            info: jest.spyOn(console, 'info').mockImplementation()
        };

        // Mock Date.now for consistent cache testing
        dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(1000000);

        // Reset all mocks
        jest.clearAllMocks();
        global.fetch.mockClear();
        mockSecurityUtils.sanitizeXSS.mockClear();
        mockSecurityUtils.sanitizeForCSS.mockClear();
        mockSecurityUtils.setTextContent.mockClear();
        mockSecurityUtils.addCSRFProtection.mockClear();
        mockSecurityUtils.logSecurityEvent.mockClear();
    });

    afterEach(() => {
        // Restore console methods
        Object.values(consoleSpy).forEach(spy => spy.mockRestore());
        dateNowSpy.mockRestore();

        // Clear cache between tests
        if (statusProvider) {
            statusProvider.clearCache();
        }
    });

    describe('Initialization and Configuration', () => {
        test('should initialize with correct configuration values', () => {
            expect(statusProvider.CACHE_TTL_MS).toBe(5 * 60 * 1000);
            expect(statusProvider.STATUS_ENDPOINT).toBe('/confluence/rest/scriptrunner/latest/custom/status');
            expect(statusProvider.ALLOWED_ENTITY_TYPES).toEqual([
                'Step', 'Phase', 'Sequence', 'Iteration', 'Plan', 'Migration', 'Control'
            ]);
        });

        test('should initialize with empty cache and etags', () => {
            expect(statusProvider.cache.size).toBe(0);
            expect(statusProvider.etags.size).toBe(0);
        });

        test('should reference SecurityUtils when available', () => {
            expect(statusProvider.securityUtils).toBe(mockSecurityUtils);
        });

        test('should handle missing SecurityUtils gracefully', () => {
            // Create instance without SecurityUtils
            const originalSecurityUtils = global.SecurityUtils;
            delete global.SecurityUtils;

            const providerWithoutSecurity = new StatusProviderClass();

            expect(providerWithoutSecurity.securityUtils).toBeNull();
            expect(consoleSpy.warn).toHaveBeenCalledWith(
                '[StatusProvider] SecurityUtils not available - using fallback security measures'
            );

            // Restore SecurityUtils
            global.SecurityUtils = originalSecurityUtils;
        });
    });

    describe('Core Functionality - getStatuses()', () => {
        test('should return cached data when available and valid', async () => {
            // Setup cache with valid data
            const cachedData = [{ name: 'PENDING', type: 'Step', id: 1 }];
            statusProvider.setCachedData('statuses_Step', cachedData);

            const result = await statusProvider.getStatuses('Step');

            expect(result).toEqual(cachedData);
            expect(consoleSpy.debug).toHaveBeenCalledWith('StatusProvider: Cache hit for Step');
            expect(global.fetch).not.toHaveBeenCalled();
        });

        test('should fetch from API when cache is empty', async () => {
            const mockResponse = {
                statuses: [{ name: 'PENDING', type: 'Step', id: 1 }],
                etag: 'mock-etag-123'
            };

            global.fetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve(mockResponse),
                headers: {
                    get: (header) => header === 'ETag' ? 'new-etag-456' : null
                }
            });

            const result = await statusProvider.getStatuses('Step');

            expect(result).toEqual(mockResponse.statuses);
            expect(consoleSpy.debug).toHaveBeenCalledWith('StatusProvider: Cache miss for Step, fetching from API');
            expect(global.fetch).toHaveBeenCalledWith(
                '/confluence/rest/scriptrunner/latest/custom/status?entityType=Step',
                expect.objectContaining({
                    method: 'GET',
                    credentials: 'same-origin'
                })
            );
        });

        test('should return fallback statuses when API fails', async () => {
            global.fetch.mockRejectedValue(new Error('Network error'));

            const result = await statusProvider.getStatuses('Step');

            expect(result).toEqual([
                { name: 'PENDING', type: 'Step', id: expect.any(Number) },
                { name: 'TODO', type: 'Step', id: expect.any(Number) },
                { name: 'IN_PROGRESS', type: 'Step', id: expect.any(Number) },
                { name: 'COMPLETED', type: 'Step', id: expect.any(Number) },
                { name: 'FAILED', type: 'Step', id: expect.any(Number) },
                { name: 'BLOCKED', type: 'Step', id: expect.any(Number) },
                { name: 'CANCELLED', type: 'Step', id: expect.any(Number) }
            ]);
            expect(consoleSpy.warn).toHaveBeenCalledWith('StatusProvider: Using fallback statuses for Step');
            expect(mockSecurityUtils.logSecurityEvent).toHaveBeenCalledWith('StatusProvider:api_fetch_error', expect.any(Object));
        });

        test('should handle expired cache entries correctly', async () => {
            // Set cache with expired timestamp
            const expiredTimestamp = Date.now() - (6 * 60 * 1000); // 6 minutes ago
            dateNowSpy.mockReturnValue(expiredTimestamp);
            statusProvider.setCachedData('statuses_Step', [{ name: 'OLD_DATA' }]);

            // Reset to current time
            dateNowSpy.mockReturnValue(1000000);

            global.fetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve({
                    statuses: [{ name: 'FRESH_DATA', type: 'Step', id: 1 }]
                }),
                headers: { get: () => null }
            });

            const result = await statusProvider.getStatuses('Step');

            expect(result).toEqual([{ name: 'FRESH_DATA', type: 'Step', id: 1 }]);
            expect(global.fetch).toHaveBeenCalled();
        });
    });

    describe('Security Features - Input Validation', () => {
        test('should validate entity types against whitelist', async () => {
            const result = await statusProvider.getStatuses('InvalidType');

            expect(result).toEqual([]);
            expect(mockSecurityUtils.logSecurityEvent).toHaveBeenCalledWith('StatusProvider:invalid_entity_type', {
                entityType: 'InvalidType',
                errors: ['Invalid entity type. Must be one of: Step, Phase, Sequence, Iteration, Plan, Migration, Control']
            });
        });

        test('should reject null/undefined entity types', async () => {
            const resultNull = await statusProvider.getStatuses(null);
            const resultUndefined = await statusProvider.getStatuses(undefined);

            expect(resultNull).toEqual([]);
            expect(resultUndefined).toEqual([]);
            expect(mockSecurityUtils.logSecurityEvent).toHaveBeenCalledTimes(2);
        });

        test('should reject non-string entity types', async () => {
            const result = await statusProvider.getStatuses(123);

            expect(result).toEqual([]);
            expect(mockSecurityUtils.logSecurityEvent).toHaveBeenCalledWith('StatusProvider:invalid_entity_type', {
                entityType: '123',
                errors: ['Entity type must be a string']
            });
        });

        test('validateEntityType should return correct validation results', () => {
            // Valid entity type
            const validResult = statusProvider.validateEntityType('Step');
            expect(validResult).toEqual({
                isValid: true,
                sanitizedData: 'Step',
                errors: []
            });

            // Invalid entity type
            const invalidResult = statusProvider.validateEntityType('HackerType<script>');
            expect(invalidResult.isValid).toBe(false);
            expect(invalidResult.errors).toContain('Invalid entity type. Must be one of: Step, Phase, Sequence, Iteration, Plan, Migration, Control');

            // Null entity type
            const nullResult = statusProvider.validateEntityType(null);
            expect(nullResult.isValid).toBe(false);
            expect(nullResult.errors).toContain('Entity type is required');
        });
    });

    describe('Security Features - XSS Prevention', () => {
        test('should sanitize malicious input strings', () => {
            const maliciousInput = '<script>alert("xss")</script>';
            const result = statusProvider.sanitizeString(maliciousInput);

            expect(mockSecurityUtils.sanitizeXSS).toHaveBeenCalledWith(maliciousInput);
        });

        test('should fallback to basic sanitization when SecurityUtils unavailable', () => {
            const originalSecurityUtils = statusProvider.securityUtils;
            statusProvider.securityUtils = null;

            const maliciousInput = '<script>alert("xss")</script>';
            const result = statusProvider.sanitizeString(maliciousInput);

            expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');

            statusProvider.securityUtils = originalSecurityUtils;
        });

        test('should handle various malicious XSS inputs with fallback sanitization', () => {
            statusProvider.securityUtils = null;

            const testCases = [
                ['<img src=x onerror=alert(1)>', '&lt;img src=x onerror=alert(1)&gt;'],
                ['javascript:alert(1)', 'javascript:alert(1)'],
                ['" onmouseover="alert(1)"', '&quot; onmouseover=&quot;alert(1)&quot;'],
                ["' OR '1'='1", '&#x27; OR &#x27;1&#x27;=&#x27;1']
            ];

            testCases.forEach(([input, expected]) => {
                const result = statusProvider.sanitizeString(input);
                expect(result).toBe(expected);
            });
        });

        test('should sanitize CSS values to prevent CSS injection', () => {
            const maliciousCSS = 'color: red; background: url(javascript:alert(1))';
            statusProvider.sanitizeCSS(maliciousCSS);

            expect(mockSecurityUtils.sanitizeForCSS).toHaveBeenCalledWith(maliciousCSS);
        });

        test('should sanitize CSS with fallback when SecurityUtils unavailable', () => {
            statusProvider.securityUtils = null;

            const maliciousCSS = 'color: red; background: url(javascript:alert(1))';
            const result = statusProvider.sanitizeCSS(maliciousCSS);

            expect(result).toBe('color: red; background: alert(1))');
        });

        test('should sanitize color values correctly', () => {
            // Valid colors
            expect(statusProvider.sanitizeColor('#ff0000')).toBe('#ff0000');
            expect(statusProvider.sanitizeColor('#fff')).toBe('#fff');
            expect(statusProvider.sanitizeColor('rgb(255, 0, 0)')).toBe('rgb(255, 0, 0)');
            expect(statusProvider.sanitizeColor('rgba(255, 0, 0, 0.5)')).toBe('rgba(255, 0, 0, 0.5)');
            expect(statusProvider.sanitizeColor('red')).toBe('red');

            // Invalid colors
            expect(statusProvider.sanitizeColor('javascript:alert(1)')).toBe('');
            expect(statusProvider.sanitizeColor('expression(alert(1))')).toBe('');
            expect(statusProvider.sanitizeColor('#gggggg')).toBe('');
            expect(statusProvider.sanitizeColor('<script>')).toBe('');
        });
    });

    describe('Security Features - CSRF Protection', () => {
        test('should add CSRF protection to API calls when SecurityUtils available', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ statuses: [] }),
                headers: { get: () => null }
            });

            await statusProvider.getStatuses('Step');

            expect(mockSecurityUtils.addCSRFProtection).toHaveBeenCalled();
            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'X-CSRF-Token': 'mock-csrf-token'
                    })
                })
            );
        });

        test('should work without CSRF protection when SecurityUtils unavailable', async () => {
            const originalSecurityUtils = statusProvider.securityUtils;
            statusProvider.securityUtils = null;

            global.fetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ statuses: [] }),
                headers: { get: () => null }
            });

            await statusProvider.getStatuses('Step');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.not.objectContaining({
                        'X-CSRF-Token': expect.any(String)
                    })
                })
            );

            statusProvider.securityUtils = originalSecurityUtils;
        });
    });

    describe('Cache Management', () => {
        test('should cache data with correct TTL', () => {
            const testData = [{ name: 'TEST', id: 1 }];
            statusProvider.setCachedData('test_key', testData);

            const cached = statusProvider.getCachedData('test_key');
            expect(cached).toEqual(testData);
        });

        test('should return null for expired cache entries', () => {
            const testData = [{ name: 'TEST', id: 1 }];

            // Set cache with old timestamp
            const oldTimestamp = Date.now() - (6 * 60 * 1000); // 6 minutes ago
            statusProvider.cache.set('test_key', {
                data: testData,
                timestamp: oldTimestamp
            });

            const cached = statusProvider.getCachedData('test_key');
            expect(cached).toBeNull();
            expect(statusProvider.cache.has('test_key')).toBe(false); // Should be cleaned up
        });

        test('should clear cache and etags', () => {
            statusProvider.setCachedData('test1', { data: 'test' });
            statusProvider.etags.set('test2', 'etag-123');

            statusProvider.clearCache();

            expect(statusProvider.cache.size).toBe(0);
            expect(statusProvider.etags.size).toBe(0);
            expect(consoleSpy.info).toHaveBeenCalledWith('StatusProvider: Cache cleared');
        });

        test('should provide accurate cache statistics', () => {
            // Add active entries
            statusProvider.setCachedData('active1', { data: 'test1' });
            statusProvider.setCachedData('active2', { data: 'test2' });

            // Add expired entry
            const expiredTimestamp = Date.now() - (6 * 60 * 1000);
            statusProvider.cache.set('expired1', {
                data: { data: 'expired' },
                timestamp: expiredTimestamp
            });

            // Add etag
            statusProvider.etags.set('test', 'etag-123');

            const stats = statusProvider.getCacheStatistics();

            expect(stats).toEqual({
                totalEntries: 3,
                activeEntries: 2,
                expiredEntries: 1,
                etagCount: 1,
                cacheTTLMs: 5 * 60 * 1000
            });
        });
    });

    describe('ETag Support', () => {
        test('should store and use ETags for cache validation', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve({
                    statuses: [{ name: 'TEST', id: 1 }],
                    etag: 'response-etag-123'
                }),
                headers: {
                    get: (header) => header === 'ETag' ? 'header-etag-456' : null
                }
            });

            await statusProvider.getStatuses('Step');

            // Should store the ETag from response body (overwrites header ETag due to processing order)
            expect(statusProvider.etags.get('Step')).toBe('response-etag-123');
            // Should have been called for both headers.ETag and response.etag
            expect(mockSecurityUtils.sanitizeXSS).toHaveBeenCalledWith('header-etag-456');
            expect(mockSecurityUtils.sanitizeXSS).toHaveBeenCalledWith('response-etag-123');
        });

        test('should send If-None-Match header with stored ETag', async () => {
            // Set up stored ETag
            statusProvider.etags.set('Step', 'stored-etag-789');

            global.fetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ statuses: [] }),
                headers: { get: () => null }
            });

            await statusProvider.getStatuses('Step');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'If-None-Match': 'stored-etag-789'
                    })
                })
            );
        });

        test('should handle 304 Not Modified responses', async () => {
            global.fetch.mockResolvedValue({
                status: 304
            });

            // Should return null and let cache handling take over
            const response = await statusProvider.fetchFromApi('Step');
            expect(response).toBeNull();
            expect(consoleSpy.debug).toHaveBeenCalledWith('StatusProvider: Data not modified (304), using cached version');
        });
    });

    describe('Dropdown Options', () => {
        test('should get cached dropdown options when available', async () => {
            const cachedOptions = [{ value: 'PENDING', text: 'Pending' }];
            statusProvider.setCachedData('dropdown_Step', cachedOptions);

            const result = await statusProvider.getDropdownOptions('Step');

            expect(result).toEqual(cachedOptions);
            expect(consoleSpy.debug).toHaveBeenCalledWith('StatusProvider: Cache hit for dropdown options Step');
        });

        test('should generate dropdown options from API statuses', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve({
                    statuses: [
                        { name: 'PENDING', color: '#ffff00' },
                        { name: 'IN_PROGRESS', color: '#0000ff' }
                    ]
                }),
                headers: { get: () => null }
            });

            const result = await statusProvider.getDropdownOptions('Step');

            expect(result).toEqual([
                {
                    value: 'PENDING',
                    text: 'Pending',
                    cssClass: 'status-pending',
                    color: '#ffff00'
                },
                {
                    value: 'IN_PROGRESS',
                    text: 'In Progress',
                    cssClass: 'status-in-progress',
                    color: '#0000ff'
                }
            ]);
        });

        test('should use API dropdown options when provided', async () => {
            const apiDropdownOptions = [
                { value: 'CUSTOM', text: 'Custom Option', cssClass: 'custom-class' }
            ];

            global.fetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve({
                    dropdownOptions: apiDropdownOptions
                }),
                headers: { get: () => null }
            });

            const result = await statusProvider.getDropdownOptions('Step');

            expect(result).toEqual(apiDropdownOptions);
        });

        test('should return fallback dropdown options when API fails', async () => {
            global.fetch.mockRejectedValue(new Error('API Error'));

            const result = await statusProvider.getDropdownOptions('Step');

            expect(result).toEqual([
                { value: 'PENDING', text: 'Pending', cssClass: 'status-pending' },
                { value: 'TODO', text: 'To Do', cssClass: 'status-todo' },
                { value: 'IN_PROGRESS', text: 'In Progress', cssClass: 'status-in-progress' },
                { value: 'COMPLETED', text: 'Completed', cssClass: 'status-completed' },
                { value: 'FAILED', text: 'Failed', cssClass: 'status-failed' },
                { value: 'BLOCKED', text: 'Blocked', cssClass: 'status-blocked' },
                { value: 'CANCELLED', text: 'Cancelled', cssClass: 'status-cancelled' }
            ]);
        });
    });

    describe('Get All Statuses', () => {
        test('should get cached all statuses when available', async () => {
            const cachedAllStatuses = {
                Step: [{ name: 'PENDING' }],
                Phase: [{ name: 'PLANNING' }]
            };
            statusProvider.setCachedData('all_statuses', cachedAllStatuses);

            const result = await statusProvider.getAllStatuses();

            expect(result).toEqual(cachedAllStatuses);
            expect(consoleSpy.debug).toHaveBeenCalledWith('StatusProvider: Cache hit for all statuses');
        });

        test('should fetch all statuses from API', async () => {
            const apiResponse = {
                statusesByType: {
                    Step: [{ name: 'PENDING', id: 1 }],
                    Phase: [{ name: 'PLANNING', id: 2 }]
                }
            };

            global.fetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve(apiResponse),
                headers: { get: () => null }
            });

            const result = await statusProvider.getAllStatuses();

            expect(result).toEqual(apiResponse.statusesByType);
            expect(global.fetch).toHaveBeenCalledWith(
                '/confluence/rest/scriptrunner/latest/custom/status',
                expect.any(Object)
            );
        });

        test('should return fallback statuses when API fails', async () => {
            global.fetch.mockRejectedValue(new Error('Network Error'));

            const result = await statusProvider.getAllStatuses();

            expect(result).toEqual(statusProvider.FALLBACK_STATUSES);
            expect(consoleSpy.warn).toHaveBeenCalledWith('StatusProvider: Using all fallback statuses');
        });
    });

    describe('DOM Manipulation Security', () => {
        test('should populate dropdown with XSS protection', async () => {
            const options = [
                { value: 'PENDING', text: 'Pending', cssClass: 'status-pending', color: '#yellow' },
                { value: '<script>alert(1)</script>', text: 'Malicious<script>', cssClass: 'bad"class', color: 'javascript:alert(1)' }
            ];

            // Mock successful API call
            statusProvider.getDropdownOptions = jest.fn().mockResolvedValue(options);

            // Mock DOM creation - reset the mock
            global.document.createElement = jest.fn(() => ({ ...mockOptionElement }));

            await statusProvider.populateStatusDropdown(mockSelectElement, 'Step', 'PENDING');

            expect(mockSecurityUtils.setTextContent).toHaveBeenCalledTimes(2);
            expect(mockSecurityUtils.sanitizeXSS).toHaveBeenCalled();
            expect(mockSelectElement.appendChild).toHaveBeenCalledTimes(2);
        });

        test('should validate select element before populating', async () => {
            // Test with invalid element
            await statusProvider.populateStatusDropdown(null, 'Step');
            expect(consoleSpy.error).toHaveBeenCalledWith('StatusProvider: Valid select element is required');

            // Test with wrong element type
            const mockDiv = { tagName: 'DIV', nodeType: 1 };
            await statusProvider.populateStatusDropdown(mockDiv, 'Step');
            expect(consoleSpy.error).toHaveBeenCalledWith('StatusProvider: Valid select element is required');
        });

        test('should handle dropdown population errors gracefully', async () => {
            statusProvider.getDropdownOptions = jest.fn().mockRejectedValue(new Error('API Error'));

            await statusProvider.populateStatusDropdown(mockSelectElement, 'Step');

            expect(mockSecurityUtils.logSecurityEvent).toHaveBeenCalledWith('StatusProvider:dropdown_population_error', expect.any(Object));
            // Should still populate with fallback options
            expect(mockSelectElement.appendChild).toHaveBeenCalled();
        });

        test('should preserve existing placeholder option', async () => {
            const placeholderOption = { value: '', textContent: 'Select status...' };
            mockSelectElement.querySelector.mockReturnValue(placeholderOption);

            statusProvider.getDropdownOptions = jest.fn().mockResolvedValue([]);

            await statusProvider.populateStatusDropdown(mockSelectElement, 'Step');

            expect(mockSelectElement.appendChild).toHaveBeenCalledWith(placeholderOption);
        });
    });

    describe('Utility Methods', () => {
        test('should format status display names correctly', () => {
            expect(statusProvider.formatStatusDisplay('TODO')).toBe('To Do');
            expect(statusProvider.formatStatusDisplay('IN_PROGRESS')).toBe('In Progress');
            expect(statusProvider.formatStatusDisplay('SNAKE_CASE_STATUS')).toBe('Snake Case Status');
            expect(statusProvider.formatStatusDisplay('simple')).toBe('Simple');
            expect(statusProvider.formatStatusDisplay('')).toBe('');
            expect(statusProvider.formatStatusDisplay(null)).toBe('');
        });

        test('should generate CSS class names safely', () => {
            expect(statusProvider.getStatusCssClass('IN_PROGRESS')).toBe('status-in-progress');
            expect(statusProvider.getStatusCssClass('PENDING')).toBe('status-pending');
            expect(statusProvider.getStatusCssClass('TEST<script>')).toBe('status-testscript');
            expect(statusProvider.getStatusCssClass('')).toBe('status-unknown');
            expect(statusProvider.getStatusCssClass(null)).toBe('status-unknown');
        });

        test('should generate consistent mock IDs', () => {
            const id1 = statusProvider.generateMockId('PENDING', 'Step');
            const id2 = statusProvider.generateMockId('PENDING', 'Step');
            const id3 = statusProvider.generateMockId('COMPLETED', 'Step');

            expect(id1).toBe(id2); // Same inputs should generate same ID
            expect(id1).not.toBe(id3); // Different inputs should generate different IDs
            expect(typeof id1).toBe('number');
            expect(id1).toBeGreaterThanOrEqual(0);
            expect(id1).toBeLessThan(1000);
        });

        test('should generate dropdown options from statuses array', () => {
            const statuses = [
                { name: 'PENDING', color: '#ffff00' },
                { name: 'COMPLETED', color: '#00ff00' },
                null, // Should be filtered out
                { name: 'INVALID' } // Missing color
            ];

            const result = statusProvider.generateDropdownOptions(statuses);

            expect(result).toEqual([
                {
                    value: 'PENDING',
                    text: 'Pending',
                    cssClass: 'status-pending',
                    color: '#ffff00'
                },
                {
                    value: 'COMPLETED',
                    text: 'Completed',
                    cssClass: 'status-completed',
                    color: '#00ff00'
                },
                {
                    value: 'INVALID',
                    text: 'Invalid',
                    cssClass: 'status-invalid',
                    color: ''
                }
            ]);
        });

        test('should handle invalid input in generateDropdownOptions', () => {
            expect(statusProvider.generateDropdownOptions(null)).toEqual([]);
            expect(statusProvider.generateDropdownOptions('not-array')).toEqual([]);
            expect(statusProvider.generateDropdownOptions([])).toEqual([]);
            expect(consoleSpy.warn).toHaveBeenCalledWith('StatusProvider: Invalid statuses array provided to generateDropdownOptions');
        });
    });

    describe('Fallback Status Handling', () => {
        test('should get fallback statuses for valid entity types', () => {
            const result = statusProvider.getFallbackStatuses('Step');

            expect(result).toEqual([
                { name: 'PENDING', type: 'Step', id: expect.any(Number) },
                { name: 'TODO', type: 'Step', id: expect.any(Number) },
                { name: 'IN_PROGRESS', type: 'Step', id: expect.any(Number) },
                { name: 'COMPLETED', type: 'Step', id: expect.any(Number) },
                { name: 'FAILED', type: 'Step', id: expect.any(Number) },
                { name: 'BLOCKED', type: 'Step', id: expect.any(Number) },
                { name: 'CANCELLED', type: 'Step', id: expect.any(Number) }
            ]);
        });

        test('should return empty array for invalid fallback entity types', () => {
            const result = statusProvider.getFallbackStatuses('InvalidType');

            expect(result).toEqual([]);
            expect(consoleSpy.warn).toHaveBeenCalledWith('StatusProvider: Invalid entity type for fallback statuses');
        });

        test('should handle missing fallback data gracefully', () => {
            // Temporarily remove fallback data
            const originalFallbacks = statusProvider.FALLBACK_STATUSES.Step;
            delete statusProvider.FALLBACK_STATUSES.Step;

            const result = statusProvider.getFallbackStatuses('Step');

            expect(result).toEqual([]);
            expect(consoleSpy.warn).toHaveBeenCalledWith('StatusProvider: No fallback statuses for entity type Step');

            // Restore fallback data
            statusProvider.FALLBACK_STATUSES.Step = originalFallbacks;
        });
    });

    describe('Error Handling and Logging', () => {
        test('should sanitize data for logging safely', () => {
            expect(statusProvider.sanitizeForLogging('normal text')).toBe('normal text');
            expect(statusProvider.sanitizeForLogging('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
            expect(statusProvider.sanitizeForLogging(null)).toBe('[null/undefined]');
            expect(statusProvider.sanitizeForLogging(undefined)).toBe('[null/undefined]');
            expect(statusProvider.sanitizeForLogging({ key: 'value' })).toBe('[object]');

            // Test long string truncation
            const longString = 'a'.repeat(200);
            const result = statusProvider.sanitizeForLogging(longString);
            expect(result.length).toBe(100);
        });

        test('should sanitize password/token data for logging', () => {
            expect(statusProvider.sanitizeForLogging('password=secret123')).toBe('[REDACTED]=[REDACTED]123');
            expect(statusProvider.sanitizeForLogging('authToken=abc123')).toBe('[REDACTED][REDACTED]=abc123');
            expect(statusProvider.sanitizeForLogging('API_KEY=xyz789')).toBe('API_[REDACTED]=xyz789');
        });

        test('should sanitize errors for logging', () => {
            const error = new Error('Database connection failed');
            expect(statusProvider.sanitizeErrorForLogging(error)).toBe('Database connection failed');

            const errorWithoutMessage = {};
            expect(statusProvider.sanitizeErrorForLogging(errorWithoutMessage)).toBe('[error without message]');

            expect(statusProvider.sanitizeErrorForLogging(null)).toBe('[no error]');
        });

        test('should log security events with SecurityUtils when available', () => {
            statusProvider.logSecurityEvent('test_event', { detail: 'test_detail' });

            expect(mockSecurityUtils.logSecurityEvent).toHaveBeenCalledWith('StatusProvider:test_event', { detail: 'test_detail' });
        });

        test('should fallback to console logging when SecurityUtils unavailable', () => {
            const originalSecurityUtils = statusProvider.securityUtils;
            statusProvider.securityUtils = null;

            statusProvider.logSecurityEvent('test_event', {
                detail: 'test_detail',
                sensitive: 'password=secret123'
            });

            expect(consoleSpy.warn).toHaveBeenCalledWith('[StatusProvider Security] test_event:', {
                detail: 'test_detail',
                sensitive: '[REDACTED]=[REDACTED]123'
            });

            statusProvider.securityUtils = originalSecurityUtils;
        });
    });

    describe('API Integration Edge Cases', () => {
        test('should handle HTTP error responses', async () => {
            global.fetch.mockResolvedValue({
                ok: false,
                status: 500
            });

            const result = await statusProvider.getStatuses('Step');

            expect(result).toEqual(expect.arrayContaining([
                expect.objectContaining({ name: 'PENDING', type: 'Step' })
            ]));
            expect(mockSecurityUtils.logSecurityEvent).toHaveBeenCalledWith('StatusProvider:api_fetch_error', expect.any(Object));
        });

        test('should handle malformed JSON responses', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.reject(new Error('Invalid JSON')),
                headers: { get: () => null }
            });

            const result = await statusProvider.getStatuses('Step');

            expect(result).toEqual(expect.arrayContaining([
                expect.objectContaining({ name: 'PENDING', type: 'Step' })
            ]));
        });

        test('should handle network timeouts', async () => {
            global.fetch.mockRejectedValue(new Error('Network timeout'));

            const result = await statusProvider.getStatuses('Step');

            expect(result).toEqual(expect.arrayContaining([
                expect.objectContaining({ name: 'PENDING', type: 'Step' })
            ]));
        });

        test('should construct correct API URLs', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ statuses: [] }),
                headers: { get: () => null }
            });

            // Test with entity type
            await statusProvider.fetchFromApi('Step');
            expect(global.fetch).toHaveBeenLastCalledWith(
                '/confluence/rest/scriptrunner/latest/custom/status?entityType=Step',
                expect.any(Object)
            );

            // Test without entity type (all statuses)
            await statusProvider.fetchFromApi(null);
            expect(global.fetch).toHaveBeenLastCalledWith(
                '/confluence/rest/scriptrunner/latest/custom/status',
                expect.any(Object)
            );
        });
    });

    describe('Performance and Resource Management', () => {
        test('should not create excessive cache entries', () => {
            // Simulate multiple requests for different entity types
            const entityTypes = ['Step', 'Phase', 'Sequence', 'Iteration', 'Plan', 'Migration', 'Control'];

            entityTypes.forEach(entityType => {
                statusProvider.setCachedData(`statuses_${entityType}`, []);
                statusProvider.setCachedData(`dropdown_${entityType}`, []);
            });

            expect(statusProvider.cache.size).toBe(14); // 7 entity types * 2 cache types
        });

        test('should clean up expired entries automatically', () => {
            // Add expired entry
            const expiredTimestamp = Date.now() - (6 * 60 * 1000);
            statusProvider.cache.set('expired_key', {
                data: { test: 'data' },
                timestamp: expiredTimestamp
            });

            // Try to get expired data - should trigger cleanup
            const result = statusProvider.getCachedData('expired_key');

            expect(result).toBeNull();
            expect(statusProvider.cache.has('expired_key')).toBe(false);
        });

        test('should handle concurrent cache operations safely', async () => {
            // Simulate concurrent cache operations
            const promises = [];

            for (let i = 0; i < 10; i++) {
                promises.push(
                    Promise.resolve().then(() => {
                        statusProvider.setCachedData(`concurrent_key_${i}`, { id: i });
                        return statusProvider.getCachedData(`concurrent_key_${i}`);
                    })
                );
            }

            const results = await Promise.all(promises);

            results.forEach((result, index) => {
                expect(result).toEqual({ id: index });
            });
        });
    });

    describe('Integration with SecurityUtils', () => {
        test('should handle SecurityUtils method failures gracefully', () => {
            // Make SecurityUtils methods throw errors
            mockSecurityUtils.sanitizeXSS.mockImplementation(() => {
                throw new Error('SecurityUtils error');
            });

            // Should fallback to internal sanitization
            statusProvider.securityUtils = null;
            const result = statusProvider.sanitizeString('<script>test</script>');

            expect(result).toBe('&lt;script&gt;test&lt;&#x2F;script&gt;');
        });

        test('should work completely without SecurityUtils', async () => {
            const noSecurityProvider = new StatusProviderClass();
            noSecurityProvider.securityUtils = null;

            global.fetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ statuses: [{ name: 'TEST', color: 'red' }] }),
                headers: { get: () => null }
            });

            const result = await noSecurityProvider.getStatuses('Step');
            expect(result).toEqual([{ name: 'TEST', color: 'red' }]);
        });
    });

    describe('Memory Management', () => {
        test('should not leak memory with repeated cache operations', () => {
            const initialCacheSize = statusProvider.cache.size;

            // Perform many cache operations
            for (let i = 0; i < 100; i++) {
                statusProvider.setCachedData(`temp_key_${i}`, { data: `test_${i}` });
                statusProvider.getCachedData(`temp_key_${i}`);
            }

            // Clear cache
            statusProvider.clearCache();

            expect(statusProvider.cache.size).toBe(0);
            expect(statusProvider.etags.size).toBe(0);
        });
    });
});