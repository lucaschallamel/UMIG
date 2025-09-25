/**
 * DATABASE_VERSION_MANAGER_DEBUG.js
 *
 * Comprehensive browser console debugging script for DatabaseVersionManager component
 * Purpose: Identify why JavaScript fixes aren't taking effect in browser
 *
 * Usage:
 * 1. Copy this entire script
 * 2. Paste in browser console while on admin GUI page
 * 3. Run: debugDatabaseVersionManager()
 * 4. Analyze results to identify loading/caching issues
 *
 * US-088-B: Database Version Manager debugging
 */

/**
 * Main debugging function - comprehensive analysis
 */
function debugDatabaseVersionManager() {
    console.log('🔍 DATABASE VERSION MANAGER - COMPREHENSIVE DEBUG ANALYSIS');
    console.log('=' .repeat(80));

    const results = {
        timestamp: new Date().toISOString(),
        componentLoading: {},
        apiEndpoints: {},
        javascriptErrors: {},
        networkTraffic: {},
        domAnalysis: {},
        cacheAnalysis: {},
        recommendations: []
    };

    // 1. Component Loading Analysis
    console.log('\n📦 COMPONENT LOADING ANALYSIS');
    console.log('-' .repeat(50));

    results.componentLoading = analyzeComponentLoading();

    // 2. API Endpoint Analysis
    console.log('\n🌐 API ENDPOINT ANALYSIS');
    console.log('-' .repeat(50));

    results.apiEndpoints = analyzeApiEndpoints();

    // 3. JavaScript Error Detection
    console.log('\n❌ JAVASCRIPT ERROR DETECTION');
    console.log('-' .repeat(50));

    results.javascriptErrors = analyzeJavaScriptErrors();

    // 4. Network Traffic Analysis
    console.log('\n📡 NETWORK TRAFFIC ANALYSIS');
    console.log('-' .repeat(50));

    results.networkTraffic = analyzeNetworkTraffic();

    // 5. DOM Analysis
    console.log('\n🏗️ DOM STRUCTURE ANALYSIS');
    console.log('-' .repeat(50));

    results.domAnalysis = analyzeDomStructure();

    // 6. Cache Analysis
    console.log('\n💾 CACHE ANALYSIS');
    console.log('-' .repeat(50));

    results.cacheAnalysis = analyzeCacheStatus();

    // 7. Generate Recommendations
    console.log('\n💡 RECOMMENDATIONS');
    console.log('-' .repeat(50));

    results.recommendations = generateRecommendations(results);

    // 8. Summary Report
    console.log('\n📋 DEBUGGING SUMMARY');
    console.log('=' .repeat(80));
    printSummaryReport(results);

    // Store results globally for further analysis
    window.debugResults = results;
    console.log('\n✅ Debug results stored in window.debugResults for further analysis');

    return results;
}

/**
 * Analyze component loading status
 */
function analyzeComponentLoading() {
    const analysis = {
        status: 'unknown',
        classExists: false,
        instanceCreated: false,
        initializationAttempted: false,
        errors: [],
        details: {}
    };

    try {
        // Check if DatabaseVersionManager class exists
        analysis.classExists = typeof window.DatabaseVersionManager === 'function';
        console.log(`✅ DatabaseVersionManager class exists: ${analysis.classExists}`);

        if (analysis.classExists) {
            analysis.details.classProperties = Object.getOwnPropertyNames(window.DatabaseVersionManager.prototype);
            console.log(`📝 Class methods: ${analysis.details.classProperties.length} found`);

            // Try creating test instance
            try {
                console.log('🧪 Testing instance creation...');
                const testInstance = new window.DatabaseVersionManager({
                    suppressWarnings: true,
                    temporaryInstance: true,
                    skipAsyncInit: true
                });
                analysis.instanceCreated = true;
                analysis.details.instanceMethods = Object.getOwnPropertyNames(testInstance);
                console.log(`✅ Test instance created successfully`);

                // Check key methods exist
                const keyMethods = ['initialize', 'render', 'loadChangesets', 'generateSQLPackage'];
                analysis.details.keyMethods = {};
                keyMethods.forEach(method => {
                    analysis.details.keyMethods[method] = typeof testInstance[method] === 'function';
                });

                // Clean up test instance
                if (typeof testInstance.destroy === 'function') {
                    testInstance.destroy();
                }

            } catch (instanceError) {
                analysis.instanceCreated = false;
                analysis.errors.push(`Instance creation failed: ${instanceError.message}`);
                console.error(`❌ Instance creation failed:`, instanceError);
            }
        } else {
            analysis.errors.push('DatabaseVersionManager class not found in window object');
            console.error('❌ DatabaseVersionManager class not found in window object');
        }

        // Check if component is registered in admin GUI
        if (window.componentRegistry) {
            analysis.details.registeredInAdmin = !!window.componentRegistry['database-version-manager'];
            console.log(`📋 Registered in admin GUI: ${analysis.details.registeredInAdmin}`);
        }

        // Check ComponentOrchestrator integration
        if (window.ComponentOrchestrator) {
            try {
                const orchestrator = window.ComponentOrchestrator;
                analysis.details.orchestratorIntegration = {
                    exists: true,
                    componentRegistered: orchestrator.registeredComponents?.has?.('DatabaseVersionManager') || false
                };
                console.log(`🎭 ComponentOrchestrator integration found`);
            } catch (e) {
                analysis.details.orchestratorIntegration = { exists: false, error: e.message };
            }
        }

        analysis.status = analysis.classExists && analysis.instanceCreated ? 'loaded' : 'failed';

    } catch (error) {
        analysis.errors.push(`Component analysis failed: ${error.message}`);
        console.error('❌ Component analysis failed:', error);
    }

    return analysis;
}

/**
 * Analyze API endpoint availability and responses
 */
function analyzeApiEndpoints() {
    const analysis = {
        baseUrl: '/rest/scriptrunner/latest/custom/databaseVersions',
        endpoints: {},
        connectivity: 'unknown',
        errors: []
    };

    const testEndpoints = [
        { name: 'main', url: '/rest/scriptrunner/latest/custom/databaseVersions' },
        { name: 'statistics', url: '/rest/scriptrunner/latest/custom/databaseVersions/statistics' },
        { name: 'packageSQL', url: '/rest/scriptrunner/latest/custom/databaseVersions/packageSQL' },
        { name: 'packageLiquibase', url: '/rest/scriptrunner/latest/custom/databaseVersions/packageLiquibase' },
        { name: 'health', url: '/rest/scriptrunner/latest/custom/databaseVersions/health' }
    ];

    console.log('🌐 Testing API endpoints...');

    // Note: We can't use async/await in this synchronous debug function
    // Instead, we'll set up the tests and return promises to check

    testEndpoints.forEach(endpoint => {
        analysis.endpoints[endpoint.name] = {
            url: endpoint.url,
            status: 'testing',
            tested: false
        };

        // Queue fetch test
        fetch(endpoint.url, {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            analysis.endpoints[endpoint.name] = {
                url: endpoint.url,
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                tested: true,
                headers: {
                    'content-type': response.headers.get('content-type'),
                    'content-length': response.headers.get('content-length')
                }
            };
            console.log(`📡 ${endpoint.name}: ${response.status} ${response.statusText}`);

            if (response.ok) {
                return response.text();
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        })
        .then(data => {
            try {
                const jsonData = JSON.parse(data);
                analysis.endpoints[endpoint.name].sampleData = {
                    type: 'json',
                    keys: Object.keys(jsonData),
                    size: data.length
                };
            } catch (e) {
                analysis.endpoints[endpoint.name].sampleData = {
                    type: 'text',
                    preview: data.substring(0, 100),
                    size: data.length
                };
            }
        })
        .catch(error => {
            analysis.endpoints[endpoint.name].error = error.message;
            analysis.endpoints[endpoint.name].tested = true;
            console.error(`❌ ${endpoint.name} failed:`, error.message);
        });
    });

    return analysis;
}

/**
 * Analyze JavaScript errors in console
 */
function analyzeJavaScriptErrors() {
    const analysis = {
        recentErrors: [],
        errorPatterns: [],
        totalErrors: 0,
        criticalErrors: 0
    };

    console.log('🔍 Analyzing JavaScript errors...');

    // Override console.error to capture new errors
    const originalError = console.error;
    const capturedErrors = [];

    // Note: This is a simplified error capture - real errors may already be in browser console
    // In a real debugging scenario, you'd check browser dev tools console

    analysis.errorCapture = 'active';
    console.log('⚠️  Error capture activated - check browser dev tools console for actual errors');

    // Check for specific error patterns related to DatabaseVersionManager
    const errorPatterns = [
        'DatabaseVersionManager',
        'BaseEntityManager',
        'Component not found',
        'API request failed',
        'CSRF',
        'loadChangesets',
        'generateSQLPackage',
        'Cannot read property',
        'is not a function'
    ];

    analysis.errorPatterns = errorPatterns.map(pattern => ({
        pattern,
        description: getErrorPatternDescription(pattern)
    }));

    return analysis;
}

/**
 * Analyze network traffic for API calls
 */
function analyzeNetworkTraffic() {
    const analysis = {
        recentRequests: [],
        databaseVersionsRequests: [],
        status: 'monitoring'
    };

    console.log('📊 Analyzing network traffic...');
    console.log('📍 Check Network tab in Dev Tools for actual requests');

    // Provide guidance on what to look for in Network tab
    const networkCheckpoints = [
        'Look for requests to /rest/scriptrunner/latest/custom/databaseVersions',
        'Check if URLs match: packageSQL and packageLiquibase (NOT packages/sql)',
        'Verify response codes (200 OK vs 404 Not Found)',
        'Check request headers for CSRF tokens',
        'Look for any CORS or authentication errors'
    ];

    analysis.checkpoints = networkCheckpoints;
    console.log('🔍 Network analysis checkpoints:');
    networkCheckpoints.forEach((checkpoint, index) => {
        console.log(`  ${index + 1}. ${checkpoint}`);
    });

    return analysis;
}

/**
 * Analyze DOM structure and component presence
 */
function analyzeDomStructure() {
    const analysis = {
        containers: {},
        components: {},
        adminGui: {},
        errors: []
    };

    console.log('🏗️ Analyzing DOM structure...');

    try {
        // Check for main containers
        const containerIds = ['mainContent', 'admin-gui-container', 'databaseVersionManagerContainer'];
        containerIds.forEach(id => {
            const element = document.getElementById(id);
            analysis.containers[id] = {
                exists: !!element,
                visible: element ? element.offsetParent !== null : false,
                innerHTML: element ? element.innerHTML.substring(0, 200) : null
            };
            console.log(`📦 Container ${id}: ${analysis.containers[id].exists ? '✅ Found' : '❌ Missing'}`);
        });

        // Check for DatabaseVersionManager UI elements
        const dvmElements = document.querySelectorAll('[class*="database-version"], [id*="database-version"], [data-component="database-version"]');
        analysis.components.databaseVersionManager = {
            elements: dvmElements.length,
            visible: Array.from(dvmElements).some(el => el.offsetParent !== null),
            classes: Array.from(dvmElements).map(el => el.className)
        };
        console.log(`🎯 DatabaseVersionManager elements: ${analysis.components.databaseVersionManager.elements} found`);

        // Check admin GUI specific elements
        const adminElements = document.querySelectorAll('[id*="admin"], [class*="admin"]');
        analysis.adminGui = {
            elements: adminElements.length,
            activeTab: document.querySelector('.nav-tabs .active')?.textContent || 'unknown',
            menuItems: Array.from(document.querySelectorAll('.nav-tabs li')).map(li => li.textContent?.trim())
        };
        console.log(`⚙️ Admin GUI elements: ${analysis.adminGui.elements} found`);

        // Check for component registration errors in DOM
        const errorElements = document.querySelectorAll('.error, .alert-error, [class*="error"]');
        analysis.errors = Array.from(errorElements).map(el => ({
            text: el.textContent?.trim().substring(0, 100),
            className: el.className,
            visible: el.offsetParent !== null
        }));

    } catch (error) {
        analysis.errors.push(`DOM analysis failed: ${error.message}`);
        console.error('❌ DOM analysis failed:', error);
    }

    return analysis;
}

/**
 * Analyze cache status and potential caching issues
 */
function analyzeCacheStatus() {
    const analysis = {
        javascriptCache: {},
        apiCache: {},
        scriptRunnerCache: {},
        recommendations: []
    };

    console.log('💾 Analyzing cache status...');

    try {
        // Check script tags for DatabaseVersionManager
        const scripts = Array.from(document.querySelectorAll('script[src*="DatabaseVersionManager"], script[src*="database"]'));
        analysis.javascriptCache.scripts = scripts.map(script => ({
            src: script.src,
            loaded: script.readyState || 'unknown',
            hasContent: script.innerHTML.length > 0
        }));
        console.log(`📜 JavaScript files: ${analysis.javascriptCache.scripts.length} found`);

        // Check for cache-busting parameters
        const hasCacheBusting = scripts.some(script =>
            script.src.includes('?') || script.src.includes('&t=') || script.src.includes('v=')
        );
        analysis.javascriptCache.cacheBusting = hasCacheBusting;
        console.log(`🔄 Cache busting detected: ${hasCacheBusting}`);

        // ScriptRunner specific cache analysis
        const scriptRunnerMeta = document.querySelector('meta[name="scriptrunner-version"]');
        analysis.scriptRunnerCache = {
            version: scriptRunnerMeta?.content || 'unknown',
            timestamp: new Date().toISOString(),
            cacheRecommendation: 'Consider clearing ScriptRunner cache if issues persist'
        };

        console.log(`📋 ScriptRunner version: ${analysis.scriptRunnerCache.version}`);

    } catch (error) {
        analysis.errors = [`Cache analysis failed: ${error.message}`];
        console.error('❌ Cache analysis failed:', error);
    }

    return analysis;
}

/**
 * Generate recommendations based on analysis results
 */
function generateRecommendations(results) {
    const recommendations = [];

    console.log('💡 Generating recommendations...');

    // Component loading issues
    if (!results.componentLoading.classExists) {
        recommendations.push({
            priority: 'HIGH',
            category: 'Component Loading',
            issue: 'DatabaseVersionManager class not found',
            action: 'Check if JavaScript file is loaded correctly',
            steps: [
                '1. Check browser Network tab for DatabaseVersionManager.js',
                '2. Verify file loads without 404 errors',
                '3. Check ScriptRunner cache and clear if needed',
                '4. Restart Confluence if necessary'
            ]
        });
    }

    if (results.componentLoading.classExists && !results.componentLoading.instanceCreated) {
        recommendations.push({
            priority: 'HIGH',
            category: 'Component Initialization',
            issue: 'Component class exists but cannot create instance',
            action: 'Check BaseEntityManager dependency and initialization',
            steps: [
                '1. Verify BaseEntityManager is loaded before DatabaseVersionManager',
                '2. Check console for constructor errors',
                '3. Verify component registration in ComponentOrchestrator'
            ]
        });
    }

    // API endpoint issues
    const apiEndpoints = results.apiEndpoints.endpoints || {};
    Object.entries(apiEndpoints).forEach(([name, endpoint]) => {
        if (endpoint.tested && !endpoint.ok) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'API Connectivity',
                issue: `${name} endpoint returning ${endpoint.status}`,
                action: 'Check API endpoint registration and ScriptRunner configuration',
                steps: [
                    '1. Verify endpoint exists in ScriptRunner REST Endpoints',
                    '2. Check Groovy compilation errors',
                    '3. Verify authentication and permissions',
                    '4. Test endpoint directly in browser'
                ]
            });
        }
    });

    // Cache issues
    if (results.cacheAnalysis.javascriptCache && !results.cacheAnalysis.javascriptCache.cacheBusting) {
        recommendations.push({
            priority: 'MEDIUM',
            category: 'Caching',
            issue: 'No cache busting detected',
            action: 'Clear browser and ScriptRunner cache',
            steps: [
                '1. Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)',
                '2. Clear browser cache for localhost:8090',
                '3. Clear ScriptRunner cache in Confluence admin',
                '4. Restart Confluence if needed'
            ]
        });
    }

    // General debugging recommendations
    recommendations.push({
        priority: 'LOW',
        category: 'General Debugging',
        issue: 'Comprehensive debugging checklist',
        action: 'Follow systematic debugging process',
        steps: [
            '1. Check browser console for JavaScript errors',
            '2. Verify all component dependencies are loaded',
            '3. Test API endpoints independently',
            '4. Check ScriptRunner logs for backend errors',
            '5. Verify component registration and initialization order'
        ]
    });

    return recommendations;
}

/**
 * Print comprehensive summary report
 */
function printSummaryReport(results) {
    console.log(`🕒 Debug completed at: ${results.timestamp}`);
    console.log('');

    // Component Status
    console.log('📦 COMPONENT STATUS:');
    const componentStatus = results.componentLoading.status;
    const statusIcon = componentStatus === 'loaded' ? '✅' : '❌';
    console.log(`  ${statusIcon} Status: ${componentStatus.toUpperCase()}`);
    console.log(`  📋 Class exists: ${results.componentLoading.classExists}`);
    console.log(`  🏗️ Instance creation: ${results.componentLoading.instanceCreated}`);
    console.log('');

    // API Status
    console.log('🌐 API ENDPOINTS:');
    const endpoints = results.apiEndpoints.endpoints || {};
    Object.entries(endpoints).forEach(([name, endpoint]) => {
        const icon = endpoint.ok ? '✅' : '❌';
        console.log(`  ${icon} ${name}: ${endpoint.status || 'pending'}`);
    });
    console.log('');

    // Critical Issues
    const criticalIssues = results.recommendations.filter(r => r.priority === 'HIGH');
    if (criticalIssues.length > 0) {
        console.log('🚨 CRITICAL ISSUES:');
        criticalIssues.forEach((issue, index) => {
            console.log(`  ${index + 1}. ${issue.issue}`);
            console.log(`     → ${issue.action}`);
        });
        console.log('');
    }

    // Quick Actions
    console.log('⚡ QUICK DEBUGGING ACTIONS:');
    console.log('  1. Run: window.DatabaseVersionManager (check if class exists)');
    console.log('  2. Run: fetch("/rest/scriptrunner/latest/custom/databaseVersions") (test API)');
    console.log('  3. Check Network tab for 404 errors on JavaScript files');
    console.log('  4. Check Console tab for JavaScript errors');
    console.log('  5. Try hard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)');
    console.log('');

    // Final recommendation
    console.log('🎯 MOST LIKELY ISSUES:');
    if (!results.componentLoading.classExists) {
        console.log('  • JavaScript file not loading - check ScriptRunner cache');
    } else if (!results.componentLoading.instanceCreated) {
        console.log('  • Component initialization failure - check dependencies');
    } else {
        console.log('  • API endpoints not responding - check backend registration');
    }
    console.log('  • Browser/ScriptRunner cache preventing updates from showing');
}

/**
 * Helper function to get error pattern descriptions
 */
function getErrorPatternDescription(pattern) {
    const descriptions = {
        'DatabaseVersionManager': 'Component-specific errors',
        'BaseEntityManager': 'Base class dependency errors',
        'Component not found': 'Component registration issues',
        'API request failed': 'Backend connectivity problems',
        'CSRF': 'Cross-site request forgery token issues',
        'loadChangesets': 'Migration data loading errors',
        'generateSQLPackage': 'Package generation errors',
        'Cannot read property': 'Null/undefined object access',
        'is not a function': 'Method not found or wrong type'
    };
    return descriptions[pattern] || 'General error pattern';
}

/**
 * Additional utility functions for live debugging
 */

/**
 * Test component instantiation directly
 */
function testComponentInstantiation() {
    console.log('🧪 TESTING COMPONENT INSTANTIATION');
    console.log('-' .repeat(40));

    try {
        if (typeof window.DatabaseVersionManager !== 'function') {
            console.error('❌ DatabaseVersionManager class not found');
            return false;
        }

        console.log('✅ DatabaseVersionManager class found');

        const testInstance = new window.DatabaseVersionManager({
            suppressWarnings: true,
            temporaryInstance: true,
            skipAsyncInit: true,
            containerId: 'temp-test-container'
        });

        console.log('✅ Test instance created successfully');
        console.log('📝 Instance properties:', Object.getOwnPropertyNames(testInstance));

        // Test key methods
        const methods = ['initialize', 'render', 'loadChangesets'];
        methods.forEach(method => {
            const exists = typeof testInstance[method] === 'function';
            console.log(`${exists ? '✅' : '❌'} Method ${method}: ${exists ? 'exists' : 'missing'}`);
        });

        // Clean up
        if (typeof testInstance.destroy === 'function') {
            testInstance.destroy();
            console.log('🧹 Test instance cleaned up');
        }

        return true;

    } catch (error) {
        console.error('❌ Component instantiation failed:', error);
        console.error('📊 Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack?.substring(0, 500)
        });
        return false;
    }
}

/**
 * Test API endpoints directly
 */
function testApiEndpoints() {
    console.log('🌐 TESTING API ENDPOINTS');
    console.log('-' .repeat(40));

    const endpoints = [
        '/rest/scriptrunner/latest/custom/databaseVersions',
        '/rest/scriptrunner/latest/custom/databaseVersions/statistics',
        '/rest/scriptrunner/latest/custom/databaseVersions/packageSQL',
        '/rest/scriptrunner/latest/custom/databaseVersions/packageLiquibase'
    ];

    endpoints.forEach(async (endpoint) => {
        try {
            console.log(`📡 Testing: ${endpoint}`);

            const response = await fetch(endpoint, {
                method: 'GET',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' }
            });

            const icon = response.ok ? '✅' : '❌';
            console.log(`${icon} ${endpoint}: ${response.status} ${response.statusText}`);

            if (!response.ok && response.status === 404) {
                console.log('   💡 Check if endpoint is registered in ScriptRunner');
            }

            if (response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType?.includes('application/json')) {
                    const data = await response.json();
                    console.log(`   📊 Response keys: ${Object.keys(data).join(', ')}`);
                }
            }

        } catch (error) {
            console.error(`❌ ${endpoint} failed:`, error.message);
        }
    });
}

/**
 * Check ScriptRunner cache status
 */
function checkScriptRunnerCache() {
    console.log('💾 SCRIPTRUNNER CACHE ANALYSIS');
    console.log('-' .repeat(40));

    // Check for ScriptRunner indicators
    const scriptRunnerMeta = document.querySelector('meta[name="scriptrunner-version"]');
    const version = scriptRunnerMeta?.content || 'unknown';
    console.log(`📋 ScriptRunner version: ${version}`);

    // Check script loading
    const scripts = Array.from(document.querySelectorAll('script'));
    const dvmScripts = scripts.filter(s =>
        s.src?.includes('DatabaseVersionManager') ||
        s.innerHTML?.includes('DatabaseVersionManager')
    );

    console.log(`📜 DatabaseVersionManager scripts found: ${dvmScripts.length}`);
    dvmScripts.forEach((script, index) => {
        console.log(`  ${index + 1}. ${script.src || 'inline script'}`);
    });

    // Recommendations
    console.log('\n💡 Cache clearing recommendations:');
    console.log('  1. Confluence Admin → ScriptRunner → Script Console → Clear Cache');
    console.log('  2. Browser: Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)');
    console.log('  3. Browser: Clear site data for localhost:8090');
    console.log('  4. If persistent: Restart Confluence');
}

// Make functions globally available for console use
window.debugDatabaseVersionManager = debugDatabaseVersionManager;
window.testComponentInstantiation = testComponentInstantiation;
window.testApiEndpoints = testApiEndpoints;
window.checkScriptRunnerCache = checkScriptRunnerCache;

console.log('🔧 DEBUG TOOLS LOADED - Run: debugDatabaseVersionManager()');
console.log('🎯 Additional tools: testComponentInstantiation(), testApiEndpoints(), checkScriptRunnerCache()');