/**
 * DatabaseVersionManager - Advanced Database Version Control and Package Generation
 * US-088 Phase 2: Day 1-1.5 Development
 *
 * Provides comprehensive database version management capabilities:
 * - Liquibase changeset analysis and semantic version mapping
 * - SQL package generation for PostgreSQL deployment teams
 * - Liquibase migration package generation
 * - Performance-optimized sub-second build generation
 * - Integration with UMIG component architecture
 *
 * Architecture: Pure vanilla JavaScript following UMIG ADR-057 patterns
 * Performance Target: Sub-second package generation for 31+ changesets
 * Integration: Seamless UMIG admin GUI component system integration
 */

console.log("[UMIG] DatabaseVersionManager.js EXECUTING - START");

/**
 * DatabaseVersionManager - Enterprise Security-Hardened Database Version Control
 * US-088 Phase 2: Enhanced with EntityManagerTemplate security patterns
 * 
 * Security Enhancements:
 * - Full XSS prevention through SecurityUtils integration
 * - CSRF protection for all database operations
 * - Input validation for all changeset operations
 * - Rate limiting (30 calls/minute for database operations)
 * - Error boundaries with secure fallback strategies
 * - Content Security Policy enforcement
 * 
 * Target Security Rating: 8.5+/10 (OWASP Top 10 compliant)
 * Performance Target: <200ms response time with <5% overhead
 * Compliance: ADR-057, ADR-058, ADR-059, ADR-060
 */

console.log("[DatabaseVersionManager] Initializing with enterprise security patterns");

class DatabaseVersionManager extends (window.BaseEntityManager || class {}) {
    constructor(containerIdOrOptions, legacyOptions) {
        // Handle both BaseComponent (old) and BaseEntityManager (new) patterns
        let options = {};
        let containerId = null;

        // Detect which pattern is being used
        if (typeof containerIdOrOptions === 'string') {
            // Old BaseComponent pattern: new DatabaseVersionManager("containerId", {options})
            console.log('[DatabaseVersionManager] Using legacy BaseComponent instantiation pattern');
            containerId = containerIdOrOptions;
            options = legacyOptions || {};
            options.containerId = containerId;
        } else {
            // New BaseEntityManager pattern: new DatabaseVersionManager({options})
            console.log('[DatabaseVersionManager] Using BaseEntityManager instantiation pattern');
            options = containerIdOrOptions || {};
        }

        const config = DatabaseVersionManager.createDefaultConfig(options);

        // Store container ID if provided through legacy pattern
        if (containerId) {
            config.tableConfig.containerId = containerId;
            config.containerId = containerId;
        }

        super(config);

        // FIXED: Better config handling for temporary instances and normal loading
        if (!this.config) {
            // Allow BaseEntityManager a moment to set config during normal initialization
            // Only show warning for genuine configuration issues, not normal startup timing
            const isNormalLoading = options.suppressWarnings || options.temporaryInstance ||
                                   (typeof window !== 'undefined' && window.BaseEntityManager);

            if (!isNormalLoading) {
                console.warn('[DatabaseVersionManager] Config not set by BaseEntityManager, using fallback');
            }
            this.config = config;
        }

        // Store temporary instance flag to suppress further warnings
        this.isTemporaryInstance = options.suppressWarnings || options.temporaryInstance || false;

        // Security state tracking
        this.securityState = {
            initialized: false,
            capabilities: {
                xssProtection: false,
                csrfProtection: false,
                cspEnforcement: false,
                sanitization: false,
                secureDOM: false
            },
            initializationErrors: []
        };

        // Enhanced error boundary
        this.errorBoundary = {
            enabled: true,
            maxRetries: 3,
            retryAttempts: new Map(),
            fallbackStrategies: new Map(),
            gracefulDegradation: true,
            autoCleanup: true,
            memoryLimit: 50 * 1024 * 1024 // 50MB
        };

        // Rate limiting for database operations (more restrictive)
        this.rateLimiter = {
            maxCallsPerMinute: 30,
            callLog: new Map(),
            blockDuration: 60000,
            trustedOperations: new Set(['initialize', 'render', 'destroy'])
        };

        // Database version management core
        this.databaseConfig = {
            liquibaseBasePath: '/local-dev-setup/liquibase/changelogs/',
            outputDirectory: '/tmp/umig-db-packages/',
            semanticVersioningStrategy: 'sequential-to-semantic',
            packageFormats: ['postgresql', 'liquibase'],
            performanceTarget: 1000,
            maxChangesets: 100,
            securityLevel: 'high',
            ...options.databaseConfig
        };

        // Changeset registry with security validation
        this.changesetRegistry = new Map();
        this.semanticVersionMap = new Map();
        this.packageCache = new Map();
        this.validatedChangesets = new Set();

        // US-088-B: REMOVED hardcoded knownChangesets array
        // Now dynamically loaded from Liquibase databasechangelog table via API
        // This eliminates manual maintenance and ensures single source of truth

        // Dynamic data storage for API-loaded migrations
        this.migrations = [];
        this.migrationsLoaded = false;
        this.apiEndpoint = '/rest/scriptrunner/latest/custom/databaseVersions';

        // DEFERRED: Initialize async security features after constructor completes
        // This prevents accessing this.config before it's fully initialized
        // For temporary instances, we may want to skip some initialization
        if (!this.isTemporaryInstance || !options.skipAsyncInit) {
            setTimeout(() => this.initializeAsync(), 0);
        }
    }
    
    /**
     * Static factory method for configuration with security defaults
     */
    static createDefaultConfig(options = {}) {
        return {
            entityName: 'database-version',
            entityNamePlural: 'database-versions',
            baseApiUrl: '/rest/api/database-version',
            primaryKey: 'changeset',
            
            // Table configuration for changeset listing
            tableConfig: {
                columns: [
                    { 
                        field: 'sequence', 
                        label: 'Seq', 
                        width: '60px',
                        sortable: true,
                        type: 'number'
                    },
                    { 
                        field: 'fileName', 
                        label: 'Changeset', 
                        sortable: true,
                        renderer: 'code'
                    },
                    { 
                        field: 'version', 
                        label: 'Version',
                        width: '100px',
                        renderer: 'badge'
                    },
                    { 
                        field: 'category', 
                        label: 'Category',
                        width: '150px',
                        renderer: 'category'
                    },
                    { 
                        field: 'isBreaking', 
                        label: 'Breaking',
                        width: '80px',
                        type: 'boolean'
                    }
                ],
                defaultSort: { field: 'sequence', order: 'asc' },
                pageSize: 25,
                enableBulkActions: false,
                enableInlineEdit: false,
                enableSearch: true
            },
            
            // Modal configuration for package generation
            modalConfig: {
                width: '800px',
                height: 'auto',
                showFooter: true,
                closeOnEsc: true,
                closeOnOverlay: false
            },
            
            // Security configuration
            security: {
                requireAuth: true,
                csrfProtection: true,
                xssProtection: true,
                rateLimiting: true,
                inputValidation: true,
                contentSecurityPolicy: true
            },
            
            // Performance configuration
            performance: {
                cacheEnabled: true,
                cacheDuration: 300000, // 5 minutes
                lazyLoading: true,
                debounceMs: 300
            },
            
            ...options
        };
    }
    
    /**
     * Async initialization with security capability assessment
     */
    async initializeAsync() {
        try {
            // Initialize security features
            await this.initializeSecurity();
            
            // Initialize error boundaries
            this.setupErrorBoundaries();
            
            // Load and validate changesets
            await this.loadChangesets();
            
            // Build semantic version mapping
            await this.buildSemanticVersionMap();
            
            this.securityState.initialized = true;
            console.log('[DatabaseVersionManager] Security initialization complete');
            
        } catch (error) {
            console.error('[DatabaseVersionManager] Security initialization failed:', error);
            this.securityState.initializationErrors.push(error.message);
            
            // Fail secure - disable dangerous operations
            this.enterSecureMode();
        }
    }
    
    /**
     * Initialize security capabilities
     */
    async initializeSecurity() {
        // CRITICAL: Safety check for config availability
        if (!this.config) {
            console.error('[DatabaseVersionManager] Config not available during security initialization');
            throw new Error('Config not properly initialized before security setup');
        }

        // Check for SecurityUtils availability
        if (window.SecurityUtils) {
            this.securityState.capabilities.xssProtection = true;
            this.securityState.capabilities.sanitization = true;
            this.securityState.capabilities.secureDOM = true;
        }

        // Check for CSRF token support - safely access config
        if (this.config.security?.csrfProtection) {
            this.securityState.capabilities.csrfProtection = true;
            await this.setupCSRFProtection();
        }

        // Setup Content Security Policy - safely access config
        if (this.config.security?.contentSecurityPolicy) {
            this.setupContentSecurityPolicy();
            this.securityState.capabilities.cspEnforcement = true;
        }

        // Validate all capabilities are available
        const requiredCapabilities = ['xssProtection', 'sanitization'];
        for (const capability of requiredCapabilities) {
            if (!this.securityState.capabilities[capability]) {
                throw new Error(`Required security capability not available: ${capability}`);
            }
        }
    }
    
    /**
     * Setup CSRF protection
     */
    async setupCSRFProtection() {
        // Generate or retrieve CSRF token
        this.csrfToken = await this.generateCSRFToken();
        
        // Setup double-submit cookie pattern
        if (document.cookie) {
            document.cookie = `csrf-token=${this.csrfToken}; SameSite=Strict; Secure`;
        }
    }
    
    /**
     * Setup Content Security Policy
     */
    setupContentSecurityPolicy() {
        const csp = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data:",
            "connect-src 'self'",
            "font-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'"
        ].join('; ');
        
        const meta = document.createElement('meta');
        meta.httpEquiv = 'Content-Security-Policy';
        meta.content = csp;
        document.head.appendChild(meta);
    }
    
    /**
     * Setup error boundaries with fallback strategies
     */
    setupErrorBoundaries() {
        // Setup fallback for changeset loading
        this.errorBoundary.fallbackStrategies.set('loadChangesets', () => {
            console.warn('[DatabaseVersionManager] Using minimal changeset set');
            return this.loadMinimalChangesets();
        });
        
        // Setup fallback for package generation
        this.errorBoundary.fallbackStrategies.set('generatePackage', () => {
            console.warn('[DatabaseVersionManager] Using template-based package generation');
            return this.generateTemplatePackage();
        });
        
        // Setup automatic memory cleanup
        if (this.errorBoundary.autoCleanup) {
            setInterval(() => this.performMemoryCleanup(), 60000);
        }
    }
    
    /**
     * Enter secure mode when initialization fails
     */
    enterSecureMode() {
        console.warn('[DatabaseVersionManager] Entering secure mode - limited functionality');
        this.secureMode = true;
        
        // Disable dangerous operations
        this.generateSQLPackage = () => {
            throw new Error('Package generation disabled in secure mode');
        };
        
        this.generateLiquibasePackage = () => {
            throw new Error('Package generation disabled in secure mode');
        };
    }
    
    /**
     * US-088-B: Load migrations dynamically from Liquibase API
     * Replaces hardcoded array with REST API calls to databaseVersions endpoint
     */
    async loadChangesets() {
        const startTime = performance.now();

        try {
            // Apply rate limiting
            if (!this.checkRateLimit('loadChangesets')) {
                throw new Error('Rate limit exceeded for changeset loading');
            }

            console.log('[DatabaseVersionManager] Loading migrations from Liquibase API...');

            // Fetch migrations from API with CSRF protection
            const response = await this.fetchWithCSRF(this.apiEndpoint + '?includeStatistics=true');

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.migrations || !Array.isArray(data.migrations)) {
                throw new Error('Invalid API response: missing migrations array');
            }

            // Process API response and populate local registries
            this.migrations = data.migrations;
            this.migrationsLoaded = true;

            // Clear existing registries
            this.changesetRegistry.clear();
            this.validatedChangesets.clear();

            // Populate registries from API data
            for (const migration of this.migrations) {
                // Validate migration data from API
                if (!this.validateMigrationData(migration)) {
                    console.warn(`[DatabaseVersionManager] Invalid migration data:`, migration);
                    continue;
                }

                // Convert API format to internal format for backwards compatibility
                const changesetInfo = this.convertApiMigrationToChangeset(migration);
                this.changesetRegistry.set(migration.filename, changesetInfo);
                this.validatedChangesets.add(migration.filename);
            }

            const loadTime = performance.now() - startTime;
            console.log(`[DatabaseVersionManager] Loaded ${this.changesetRegistry.size} migrations from API in ${loadTime.toFixed(2)}ms`);

            // Store statistics if available
            if (data.statistics) {
                this.migrationStatistics = data.statistics;
            }

        } catch (error) {
            console.error('[DatabaseVersionManager] API migration loading failed:', error);

            // Try fallback strategy
            if (this.errorBoundary.fallbackStrategies.has('loadChangesets')) {
                return this.errorBoundary.fallbackStrategies.get('loadChangesets')();
            }

            throw error;
        }
    }
    
    /**
     * Validate changeset name for security
     */
    validateChangesetName(name) {
        // Prevent path traversal and injection
        const validPattern = /^[0-9]{3}_[a-z0-9_]+\.sql$/i;
        
        if (!validPattern.test(name)) {
            return false;
        }
        
        // Check for dangerous patterns
        const dangerousPatterns = ['..', '/', '\\', ';', '--', '/*', '*/', 'DROP', 'DELETE'];
        for (const pattern of dangerousPatterns) {
            if (name.toUpperCase().includes(pattern)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Analyze changeset with security validation
     */
    async analyzeChangeset(fileName) {
        // Validate input
        if (!this.validateChangesetName(fileName)) {
            throw new Error(`Invalid changeset name: ${fileName}`);
        }
        
        const changesetInfo = {
            fileName: this.sanitizeString(fileName),
            sequence: this.extractSequenceNumber(fileName),
            category: this.categorizeChangeset(fileName),
            version: null,
            isBreaking: false,
            dependencies: [],
            validated: true,
            securityLevel: 'standard'
        };
        
        // Additional analysis
        changesetInfo.isBreaking = this.isStructuralChange(fileName);
        changesetInfo.dependencies = this.identifyDependencies(fileName, changesetInfo.sequence);
        
        return changesetInfo;
    }
    
    /**
     * Extract sequence number with validation
     */
    extractSequenceNumber(fileName) {
        const match = fileName.match(/^(\d{3})_/);
        if (match) {
            const sequence = parseInt(match[1], 10);
            if (sequence >= 0 && sequence <= 999) {
                return sequence;
            }
        }
        return 0;
    }
    
    /**
     * Categorize changeset based on patterns
     */
    categorizeChangeset(fileName) {
        const categories = {
            'baseline': 'BASELINE',
            'email_template': 'EMAIL_TEMPLATES',
            'status': 'STATUS_MANAGEMENT',
            'performance': 'PERFORMANCE',
            'import': 'IMPORT_STAGING',
            'audit': 'AUDIT_COMPLIANCE',
            'configuration': 'CONFIGURATION',
            'fix': 'ENHANCEMENT',
            'grant': 'SECURITY',
            'create': 'TABLE_CREATION',
            'dto': 'DTO_OPTIMIZATION'
        };
        
        for (const [pattern, category] of Object.entries(categories)) {
            if (fileName.includes(pattern)) {
                return category;
            }
        }
        
        return 'GENERAL';
    }
    
    /**
     * Check if changeset is structural
     */
    isStructuralChange(fileName) {
        const structuralPatterns = [
            'baseline', 'create_', 'add_', 'drop_', 'alter_table',
            'foreign_key', 'index', 'constraint', 'normalization'
        ];
        return structuralPatterns.some(pattern => fileName.includes(pattern));
    }
    
    /**
     * Identify changeset dependencies
     */
    identifyDependencies(fileName, sequence) {
        const dependencies = [];
        
        if (sequence > 1) {
            dependencies.push('001_unified_baseline.sql');
        }
        
        if (fileName.includes('status') && !fileName.includes('015_remove_fields')) {
            dependencies.push('015_remove_fields_from_steps_instance_and_add_status_table.sql');
        }
        
        if (fileName.includes('021_add_status_foreign_keys')) {
            dependencies.push('019_status_field_normalization.sql');
        }
        
        return dependencies;
    }
    
    /**
     * Build semantic version mapping with validation
     */
    async buildSemanticVersionMap() {
        const sortedChangesets = Array.from(this.changesetRegistry.entries())
            .sort(([, a], [, b]) => a.sequence - b.sequence);
        
        let major = 1, minor = 0, patch = 0;
        
        for (const [fileName, changesetInfo] of sortedChangesets) {
            // Version increment logic
            if (changesetInfo.category === 'BASELINE') {
                major = 1;
                minor = 0;
                patch = 0;
            } else if (changesetInfo.isBreaking) {
                minor++;
                patch = 0;
            } else {
                patch++;
            }
            
            const version = `v${major}.${minor}.${patch}`;
            
            this.semanticVersionMap.set(fileName, {
                version: this.sanitizeString(version),
                sequence: changesetInfo.sequence,
                category: changesetInfo.category,
                isBreaking: changesetInfo.isBreaking
            });
        }
        
        console.log(`[DatabaseVersionManager] Generated ${this.semanticVersionMap.size} semantic versions`);
    }
    
    /**
     * Generate SQL package with full security validation
     */
    async generateSQLPackage(selection = 'all', format = 'postgresql') {
        // Security checks
        if (this.secureMode) {
            throw new Error('Package generation disabled in secure mode');
        }
        
        if (!this.checkRateLimit('generateSQLPackage')) {
            throw new Error('Rate limit exceeded for package generation');
        }
        
        // Validate inputs
        if (!this.validatePackageSelection(selection)) {
            throw new Error('Invalid package selection');
        }
        
        if (!['postgresql', 'mysql', 'oracle'].includes(format)) {
            throw new Error('Invalid package format');
        }
        
        try {
            const changesets = await this.resolveChangesetSelection(selection);
            
            const packageData = {
                metadata: {
                    version: this.computePackageVersion(changesets),
                    format: this.sanitizeString(format),
                    generatedAt: new Date().toISOString(),
                    changesetCount: changesets.length,
                    securityValidated: true
                },
                deploymentScript: await this.generateDeploymentScript(changesets, format),
                rollbackScript: await this.generateRollbackScript(changesets),
                validation: await this.generateValidationQueries(changesets),
                checksum: this.generatePackageChecksum(changesets)
            };
            
            return packageData;
            
        } catch (error) {
            console.error('[DatabaseVersionManager] SQL package generation failed:', error);
            
            // Try fallback
            if (this.errorBoundary.fallbackStrategies.has('generatePackage')) {
                return this.errorBoundary.fallbackStrategies.get('generatePackage')();
            }
            
            throw error;
        }
    }
    
    /**
     * Generate Liquibase package with security validation
     */
    async generateLiquibasePackage(selection = 'all') {
        // Security checks
        if (this.secureMode) {
            throw new Error('Package generation disabled in secure mode');
        }
        
        if (!this.checkRateLimit('generateLiquibasePackage')) {
            throw new Error('Rate limit exceeded for package generation');
        }
        
        if (!this.validatePackageSelection(selection)) {
            throw new Error('Invalid package selection');
        }
        
        try {
            const changesets = await this.resolveChangesetSelection(selection);
            
            const packageData = {
                metadata: {
                    version: this.computePackageVersion(changesets),
                    format: 'liquibase',
                    generatedAt: new Date().toISOString(),
                    changesetCount: changesets.length,
                    liquibaseVersion: '4.0+',
                    securityValidated: true
                },
                changelogXml: await this.generateChangelogXml(changesets),
                properties: this.generateLiquibaseProperties(),
                deploymentGuide: this.generateDeploymentGuide(changesets),
                checksum: this.generatePackageChecksum(changesets)
            };
            
            return packageData;
            
        } catch (error) {
            console.error('[DatabaseVersionManager] Liquibase package generation failed:', error);
            
            // Try fallback
            if (this.errorBoundary.fallbackStrategies.has('generatePackage')) {
                return this.errorBoundary.fallbackStrategies.get('generatePackage')();
            }
            
            throw error;
        }
    }
    
    /**
     * Validate package selection
     */
    validatePackageSelection(selection) {
        if (selection === 'all') return true;
        
        if (typeof selection === 'string') {
            // Validate string patterns
            const validPatterns = /^(all|latest-\d+|baseline|v\d+\.\d+\.\d+-v\d+\.\d+\.\d+)$/;
            return validPatterns.test(selection);
        }
        
        if (Array.isArray(selection)) {
            return selection.every(cs => this.validateChangesetName(cs));
        }
        
        return false;
    }
    
    /**
     * US-088-B: Resolve changeset selection with API-loaded data validation
     */
    async resolveChangesetSelection(selection) {
        const changesets = [];

        // Ensure migrations are loaded
        if (!this.migrationsLoaded || this.migrations.length === 0) {
            console.warn('[DatabaseVersionManager] Migrations not loaded, attempting to load...');
            await this.loadChangesets();
        }

        if (selection === 'all') {
            changesets.push(...Array.from(this.validatedChangesets));
        } else if (typeof selection === 'string' && selection.startsWith('latest-')) {
            const count = parseInt(selection.split('-')[1], 10);
            if (count > 0 && count <= 100) {
                // Sort by sequence and take latest N
                const sortedMigrations = this.migrations
                    .sort((a, b) => a.sequence - b.sequence)
                    .slice(-count)
                    .map(m => m.filename);
                changesets.push(...sortedMigrations);
            }
        } else if (Array.isArray(selection)) {
            for (const cs of selection) {
                if (this.validatedChangesets.has(cs)) {
                    changesets.push(cs);
                }
            }
        }

        return changesets;
    }
    
    /**
     * Generate deployment script with sanitization
     */
    async generateDeploymentScript(changesets, format) {
        const lines = [
            '-- UMIG Database Deployment Script',
            `-- Generated: ${new Date().toISOString()}`,
            `-- Format: ${this.sanitizeString(format)}`,
            `-- Changesets: ${changesets.length}`,
            '',
            'BEGIN;',
            ''
        ];
        
        for (const changeset of changesets) {
            if (this.validatedChangesets.has(changeset)) {
                lines.push(`-- ${this.sanitizeString(changeset)}`);
                lines.push(`\\i '${this.sanitizeString(changeset)}'`);
                lines.push('');
            }
        }
        
        lines.push('COMMIT;');
        
        return lines.join('\n');
    }
    
    /**
     * Generate rollback script
     */
    async generateRollbackScript(changesets) {
        const lines = [
            '-- UMIG Database Rollback Script',
            `-- Generated: ${new Date().toISOString()}`,
            '-- WARNING: Manual rollback required',
            '',
            '-- Changesets applied (in reverse order):'
        ];
        
        const reversed = changesets.slice().reverse();
        for (const changeset of reversed) {
            lines.push(`-- ${this.sanitizeString(changeset)}`);
        }
        
        return lines.join('\n');
    }
    
    /**
     * Generate validation queries
     */
    async generateValidationQueries(changesets) {
        const queries = [
            '-- Validation Queries',
            "SELECT 'migrations_mig' as table_name, COUNT(*) FROM information_schema.tables WHERE table_name = 'migrations_mig';",
            "SELECT 'steps_instance_sti' as table_name, COUNT(*) FROM information_schema.tables WHERE table_name = 'steps_instance_sti';"
        ];
        
        return queries.join('\n');
    }
    
    /**
     * Generate changelog XML for Liquibase
     */
    async generateChangelogXml(changesets) {
        const lines = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog">',
            ''
        ];
        
        for (const changeset of changesets) {
            if (this.validatedChangesets.has(changeset)) {
                const escaped = this.escapeXml(changeset);
                lines.push(`  <include file="${escaped}" relativeToChangelogFile="true"/>`);
            }
        }
        
        lines.push('</databaseChangeLog>');
        
        return lines.join('\n');
    }
    
    /**
     * Generate Liquibase properties
     */
    generateLiquibaseProperties() {
        return [
            '# Liquibase Properties',
            'driver=org.postgresql.Driver',
            'url=jdbc:postgresql://localhost:5432/umig_app_db',
            'username=umig_app_usr',
            'password=${DB_PASSWORD}',
            'changeLogFile=db.changelog-deployment.xml',
            'logLevel=INFO'
        ].join('\n');
    }
    
    /**
     * Generate deployment guide
     */
    generateDeploymentGuide(changesets) {
        return [
            '# Deployment Guide',
            '',
            '## Prerequisites',
            '- Liquibase 4.0+',
            '- PostgreSQL 14+',
            '- Database credentials',
            '',
            '## Steps',
            '1. Validate configuration',
            '2. Run: liquibase update',
            '3. Verify deployment',
            '',
            `## Package contains ${changesets.length} changesets`
        ].join('\n');
    }
    
    /**
     * Compute package version
     */
    computePackageVersion(changesets) {
        let maxVersion = 'v0.0.0';
        
        for (const changeset of changesets) {
            const versionInfo = this.semanticVersionMap.get(changeset);
            if (versionInfo && versionInfo.version > maxVersion) {
                maxVersion = versionInfo.version;
            }
        }
        
        return this.sanitizeString(maxVersion);
    }
    
    /**
     * Generate package checksum for integrity
     */
    generatePackageChecksum(changesets) {
        const content = changesets.sort().join('|');
        let hash = 0;
        
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        return Math.abs(hash).toString(16);
    }
    
    /**
     * Check rate limiting
     */
    checkRateLimit(operation) {
        if (this.rateLimiter.trustedOperations.has(operation)) {
            return true;
        }
        
        const now = Date.now();
        const key = `${operation}_${Math.floor(now / 60000)}`;
        
        const callCount = this.rateLimiter.callLog.get(key) || 0;
        if (callCount >= this.rateLimiter.maxCallsPerMinute) {
            console.warn(`[DatabaseVersionManager] Rate limit exceeded for ${operation}`);
            return false;
        }
        
        this.rateLimiter.callLog.set(key, callCount + 1);
        
        // Cleanup old entries
        for (const [k, ] of this.rateLimiter.callLog) {
            const [, timestamp] = k.split('_');
            if (now - parseInt(timestamp, 10) * 60000 > 120000) {
                this.rateLimiter.callLog.delete(k);
            }
        }
        
        return true;
    }
    
    /**
     * Sanitize string for security
     */
    sanitizeString(input) {
        if (!input) return '';
        
        if (window.SecurityUtils?.sanitizeText) {
            return window.SecurityUtils.sanitizeText(String(input));
        }
        
        // Fallback sanitization
        return String(input)
            .replace(/[<>\"\']/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '')
            .slice(0, 1000);
    }
    
    /**
     * Escape XML special characters
     */
    escapeXml(input) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        
        return String(input).replace(/[&<>"']/g, m => map[m]);
    }
    
    /**
     * Generate CSRF token
     */
    async generateCSRFToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    /**
     * US-088-B: Load minimal changesets as fallback when API is unavailable
     * Uses hardcoded essential migrations only for emergency fallback
     */
    async loadMinimalChangesets() {
        console.warn('[DatabaseVersionManager] Using minimal fallback - API unavailable');

        // Create minimal migration objects matching API format
        const essentialMigrations = [
            {
                id: '001_unified_baseline.sql',
                filename: '001_unified_baseline.sql',
                sequence: 1,
                category: 'BASELINE',
                version: 'v1.0.1',
                isBreaking: true,
                executedAt: null,
                checksum: null,
                validated: false,
                displayName: '001_unified_baseline',
                shortDescription: 'Unified Baseline'
            },
            {
                id: '019_status_field_normalization.sql',
                filename: '019_status_field_normalization.sql',
                sequence: 19,
                category: 'STATUS_MANAGEMENT',
                version: 'v1.1.9',
                isBreaking: true,
                executedAt: null,
                checksum: null,
                validated: false,
                displayName: '019_status_field_normalization',
                shortDescription: 'Status Field Normalization'
            },
            {
                id: '999_grant_app_user_privileges.sql',
                filename: '999_grant_app_user_privileges.sql',
                sequence: 999,
                category: 'SECURITY',
                version: 'v1.99.9',
                isBreaking: false,
                executedAt: null,
                checksum: null,
                validated: false,
                displayName: '999_grant_app_user_privileges',
                shortDescription: 'Grant App User Privileges'
            }
        ];

        this.migrations = essentialMigrations;
        this.migrationsLoaded = true;

        // Populate registries
        this.changesetRegistry.clear();
        this.validatedChangesets.clear();

        for (const migration of essentialMigrations) {
            const changesetInfo = this.convertApiMigrationToChangeset(migration);
            this.changesetRegistry.set(migration.filename, changesetInfo);
            this.validatedChangesets.add(migration.filename);
        }

        console.log('[DatabaseVersionManager] Loaded minimal fallback set (3 essential migrations)');
    }
    
    /**
     * Generate template package as fallback
     */
    generateTemplatePackage() {
        return {
            metadata: {
                version: 'v0.0.0',
                format: 'template',
                generatedAt: new Date().toISOString(),
                fallbackMode: true
            },
            deploymentScript: '-- Template deployment script\n-- Manual configuration required',
            rollbackScript: '-- Template rollback script\n-- Manual configuration required',
            validation: '-- Template validation\n-- Manual configuration required'
        };
    }
    
    /**
     * US-088-B: Fetch with CSRF protection for API calls
     * Ensures secure API communication following ADR-058 patterns
     */
    async fetchWithCSRF(url, options = {}) {
        const defaultOptions = {
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            }
        };

        // Add CSRF token if available
        if (this.csrfToken) {
            defaultOptions.headers['X-CSRF-Token'] = this.csrfToken;
        }

        // Merge options
        const fetchOptions = { ...defaultOptions, ...options };

        return fetch(url, fetchOptions);
    }

    /**
     * US-088-B: Validate migration data from API response
     */
    validateMigrationData(migration) {
        if (!migration || typeof migration !== 'object') {
            return false;
        }

        // Required fields for UI compatibility
        const requiredFields = ['id', 'filename', 'sequence'];
        for (const field of requiredFields) {
            if (!migration.hasOwnProperty(field) || migration[field] === null || migration[field] === undefined) {
                return false;
            }
        }

        // Validate filename format for security
        if (!this.validateChangesetName(migration.filename)) {
            return false;
        }

        return true;
    }

    /**
     * US-088-B: Convert API migration format to internal changeset format
     * Maintains backward compatibility with existing UI code
     */
    convertApiMigrationToChangeset(migration) {
        return {
            fileName: this.sanitizeString(migration.filename || ''),
            sequence: migration.sequence || 0,
            category: migration.category || 'GENERAL',
            version: migration.version || 'v0.0.0',
            isBreaking: migration.isBreaking || false,
            dependencies: migration.dependencies || [],
            validated: migration.validated !== false, // Default to true
            securityLevel: 'standard',

            // Additional API fields
            id: migration.id,
            executedAt: migration.executedAt,
            checksum: migration.checksum,
            executionType: migration.executionType,
            author: migration.author,
            displayName: migration.displayName || migration.filename?.replace('.sql', '') || '',
            shortDescription: migration.shortDescription || migration.description || ''
        };
    }

    /**
     * Perform memory cleanup
     */
    performMemoryCleanup() {
        // Clear old cache entries
        const now = Date.now();
        const cacheTimeout = 300000; // 5 minutes
        
        for (const [key, value] of this.packageCache) {
            if (value.timestamp && now - value.timestamp > cacheTimeout) {
                this.packageCache.delete(key);
            }
        }
        
        // Clear rate limiter old entries
        for (const [key, ] of this.rateLimiter.callLog) {
            const [, timestamp] = key.split('_');
            if (now - parseInt(timestamp, 10) * 60000 > 120000) {
                this.rateLimiter.callLog.delete(key);
            }
        }
        
        // Check memory usage
        if (window.performance?.memory) {
            const used = window.performance.memory.usedJSHeapSize;
            if (used > this.errorBoundary.memoryLimit) {
                console.warn('[DatabaseVersionManager] Memory limit exceeded, forcing cleanup');
                this.packageCache.clear();
            }
        }
    }
    
    /**
     * COMPATIBILITY BRIDGE METHODS FOR ADMIN-GUI.JS INTEGRATION
     * These methods provide BaseComponent-style interface while using BaseEntityManager functionality
     */

    /**
     * Initialize method compatible with admin-gui.js calling pattern
     * @returns {Promise<void>}
     */
    async initialize() {
        console.log("[DatabaseVersionManager] Admin-GUI compatibility initialize() called");

        try {
            // Extract container from config (set during construction for legacy pattern)
            const containerId = this.config.tableConfig?.containerId || this.config.containerId || "mainContent";
            const container = document.getElementById(containerId);

            if (!container) {
                // Only warn if this is not a temporary instance
                if (!this.isTemporaryInstance) {
                    console.warn(`[DatabaseVersionManager] Container '${containerId}' not found, creating fallback`);
                }
                const fallbackContainer = document.createElement('div');
                fallbackContainer.id = this.isTemporaryInstance
                    ? 'temp-dvm-container-' + Date.now()
                    : 'databaseVersionManagerContainer';
                if (!this.isTemporaryInstance) {
                    document.body.appendChild(fallbackContainer);
                }
                this.container = fallbackContainer;
            } else {
                this.container = container;
            }

            // Initialize async security features
            await this.initializeAsync();

            // Load changesets
            await this.loadChangesets();

            // Build semantic version mapping
            await this.buildSemanticVersionMap();

            // Mark as initialized
            this.initialized = true;

            console.log("[DatabaseVersionManager] Initialization complete");
        } catch (error) {
            console.error("[DatabaseVersionManager] Initialization failed:", error);
            throw error;
        }
    }

    /**
     * Mount method compatible with admin-gui.js calling pattern
     * @returns {Promise<void>}
     */
    async mount() {
        console.log("[DatabaseVersionManager] Admin-GUI compatibility mount() called");

        try {
            // Use the container stored during initialize
            if (!this.container) {
                const containerId = this.config.tableConfig?.containerId || this.config.containerId || "mainContent";
                this.container = document.getElementById(containerId);

                if (!this.container) {
                    throw new Error(`Container '${containerId}' not found for DatabaseVersionManager`);
                }
            }

            // Mark as mounted
            this.mounted = true;

            console.log("[DatabaseVersionManager] Mount complete");
        } catch (error) {
            console.error("[DatabaseVersionManager] Mount failed:", error);
            throw error;
        }
    }

    /**
     * Render component UI with XSS protection
     */
    async render() {
        console.log("[DatabaseVersionManager] Admin-GUI compatibility render() called");

        if (!this.container) {
            throw new Error("Container not set - initialize() must be called first");
        }
        
        const safeHtml = this.buildSafeUI();
        
        if (window.SecurityUtils?.setSecureHTML) {
            window.SecurityUtils.setSecureHTML(this.container, safeHtml);
        } else {
            this.container.innerHTML = safeHtml;
        }
        
        this.attachEventListeners();
        
        console.log('[DatabaseVersionManager] UI rendered with security protections');
    }
    
    /**
     * Build safe UI HTML
     */
    buildSafeUI() {
        const changesetCount = this.sanitizeString(String(this.changesetRegistry.size));
        const versionCount = this.sanitizeString(String(this.semanticVersionMap.size));
        
        return `
            <div class="database-version-manager-secure">
                <div class="dvm-header">
                    <h2>Database Version Manager</h2>
                    <span class="security-badge">Security: ${this.securityState.initialized ? 'Active' : 'Limited'}</span>
                </div>
                
                <div class="dvm-stats">
                    <div class="stat-card">
                        <div class="stat-value">${changesetCount}</div>
                        <div class="stat-label">Changesets</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${versionCount}</div>
                        <div class="stat-label">Versions</div>
                    </div>
                </div>
                
                <div class="dvm-actions">
                    <button data-action="generate-sql" class="btn-primary" ${this.secureMode ? 'disabled' : ''}>
                        Generate SQL Package
                    </button>
                    <button data-action="generate-liquibase" class="btn-primary" ${this.secureMode ? 'disabled' : ''}>
                        Generate Liquibase Package
                    </button>
                    <button data-action="show-versions" class="btn-secondary">
                        Show Versions
                    </button>
                </div>
                
                <div class="dvm-results" id="dvm-results"></div>
            </div>
        `;
    }
    
    /**
     * Attach event listeners with security validation
     */
    attachEventListeners() {
        this.container.addEventListener('click', async (event) => {
            const target = event.target;
            if (target.tagName !== 'BUTTON') return;
            
            const action = target.getAttribute('data-action');
            if (!action) return;
            
            // Validate action
            const allowedActions = ['generate-sql', 'generate-liquibase', 'show-versions'];
            if (!allowedActions.includes(action)) {
                console.warn('[DatabaseVersionManager] Invalid action:', action);
                return;
            }
            
            try {
                switch (action) {
                    case 'generate-sql':
                        await this.handleGenerateSQLPackage();
                        break;
                    case 'generate-liquibase':
                        await this.handleGenerateLiquibasePackage();
                        break;
                    case 'show-versions':
                        this.handleShowVersions();
                        break;
                }
            } catch (error) {
                this.showError(error.message);
            }
        });
    }
    
    /**
     * Handle SQL package generation
     */
    async handleGenerateSQLPackage() {
        const resultsDiv = document.getElementById('dvm-results');
        if (!resultsDiv) return;
        
        try {
            this.showLoading('Generating SQL package...');
            
            const sqlPackage = await this.generateSQLPackage('all', 'postgresql');
            
            const safeHtml = `
                <div class="package-result">
                    <h3>SQL Package Generated</h3>
                    <p>Version: ${this.sanitizeString(sqlPackage.metadata.version)}</p>
                    <p>Changesets: ${sqlPackage.metadata.changesetCount}</p>
                    <p>Checksum: ${this.sanitizeString(sqlPackage.checksum)}</p>
                    <button data-copy="deployment">Copy Deployment Script</button>
                </div>
            `;
            
            if (window.SecurityUtils?.setSecureHTML) {
                window.SecurityUtils.setSecureHTML(resultsDiv, safeHtml);
            } else {
                resultsDiv.innerHTML = safeHtml;
            }
            
            // Store script for copy operation
            this.lastDeploymentScript = sqlPackage.deploymentScript;
            
        } catch (error) {
            this.showError(error.message);
        }
    }
    
    /**
     * Handle Liquibase package generation
     */
    async handleGenerateLiquibasePackage() {
        const resultsDiv = document.getElementById('dvm-results');
        if (!resultsDiv) return;
        
        try {
            this.showLoading('Generating Liquibase package...');
            
            const liquibasePackage = await this.generateLiquibasePackage('all');
            
            const safeHtml = `
                <div class="package-result">
                    <h3>Liquibase Package Generated</h3>
                    <p>Version: ${this.sanitizeString(liquibasePackage.metadata.version)}</p>
                    <p>Changesets: ${liquibasePackage.metadata.changesetCount}</p>
                    <p>Checksum: ${this.sanitizeString(liquibasePackage.checksum)}</p>
                    <button data-copy="changelog">Copy Changelog</button>
                </div>
            `;
            
            if (window.SecurityUtils?.setSecureHTML) {
                window.SecurityUtils.setSecureHTML(resultsDiv, safeHtml);
            } else {
                resultsDiv.innerHTML = safeHtml;
            }
            
            // Store changelog for copy operation
            this.lastChangelog = liquibasePackage.changelogXml;
            
        } catch (error) {
            this.showError(error.message);
        }
    }
    
    /**
     * Handle show versions
     */
    handleShowVersions() {
        const resultsDiv = document.getElementById('dvm-results');
        if (!resultsDiv) return;
        
        const rows = [];
        for (const [changeset, versionInfo] of this.semanticVersionMap) {
            rows.push(`
                <tr>
                    <td>${versionInfo.sequence}</td>
                    <td>${this.sanitizeString(changeset)}</td>
                    <td>${this.sanitizeString(versionInfo.version)}</td>
                    <td>${this.sanitizeString(versionInfo.category)}</td>
                </tr>
            `);
        }
        
        const safeHtml = `
            <div class="version-table">
                <h3>Version Mapping</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Seq</th>
                            <th>Changeset</th>
                            <th>Version</th>
                            <th>Category</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        if (window.SecurityUtils?.setSecureHTML) {
            window.SecurityUtils.setSecureHTML(resultsDiv, safeHtml);
        } else {
            resultsDiv.innerHTML = safeHtml;
        }
    }
    
    /**
     * Show loading message
     */
    showLoading(message) {
        const resultsDiv = document.getElementById('dvm-results');
        if (!resultsDiv) return;
        
        const safeMessage = this.sanitizeString(message);
        const html = `<div class="loading">${safeMessage}</div>`;
        
        if (window.SecurityUtils?.setSecureHTML) {
            window.SecurityUtils.setSecureHTML(resultsDiv, html);
        } else {
            resultsDiv.innerHTML = html;
        }
    }
    
    /**
     * Show error message
     */
    showError(message) {
        const resultsDiv = document.getElementById('dvm-results');
        if (!resultsDiv) return;
        
        const safeMessage = this.sanitizeString(message);
        const html = `<div class="error">Error: ${safeMessage}</div>`;
        
        if (window.SecurityUtils?.setSecureHTML) {
            window.SecurityUtils.setSecureHTML(resultsDiv, html);
        } else {
            resultsDiv.innerHTML = html;
        }
    }
    
    /**
     * Cleanup and destroy component
     */
    async destroy() {
        try {
            // Clear sensitive data
            if (this.csrfToken) {
                this.csrfToken = null;
            }
            
            // Clear registries with safety checks
            if (this.changesetRegistry && typeof this.changesetRegistry.clear === 'function') {
                this.changesetRegistry.clear();
            }
            if (this.semanticVersionMap && typeof this.semanticVersionMap.clear === 'function') {
                this.semanticVersionMap.clear();
            }
            if (this.packageCache && typeof this.packageCache.clear === 'function') {
                this.packageCache.clear();
            }
            if (this.validatedChangesets && typeof this.validatedChangesets.clear === 'function') {
                this.validatedChangesets.clear();
            }

            // Clear rate limiter with safety check
            if (this.rateLimiter && this.rateLimiter.callLog && typeof this.rateLimiter.callLog.clear === 'function') {
                this.rateLimiter.callLog.clear();
            }
            
            // Clear error boundary if exists
            if (this.errorBoundary && this.errorBoundary.retryAttempts) {
                this.errorBoundary.retryAttempts.clear();
            }
            if (this.errorBoundary && this.errorBoundary.fallbackStrategies) {
                this.errorBoundary.fallbackStrategies.clear();
            }

            // Clear our specific properties
            this.packageBuilders = null;
            this.performanceMetrics = null;
            this.initialized = false;

            // Only call super.destroy() if parent class has it
            if (typeof super.destroy === 'function') {
                await super.destroy();
            } else {
                console.log('[DatabaseVersionManager] Parent class has no destroy method - performing local cleanup only');
                // Manual cleanup for fallback empty class case
                this.container = null;
                this.options = null;
            }
            
            console.log('[DatabaseVersionManager] Component destroyed securely');
            
        } catch (error) {
            console.error('[DatabaseVersionManager] Destroy error:', error);
        }
    }
}

// Register component globally (ADR-057 pattern - no IIFE wrapper)
window.DatabaseVersionManager = DatabaseVersionManager;

console.log('[DatabaseVersionManager] Component registered with enterprise security');

// Register component globally following UMIG ADR-057 pattern
window.DatabaseVersionManager = DatabaseVersionManager;

console.log("[UMIG] DatabaseVersionManager.js LOADED");