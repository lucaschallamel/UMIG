/**
 * EntityMigrationTracker - Performance & A/B Testing Tracker for US-082-C
 * 
 * Comprehensive tracking system for entity migration performance monitoring
 * and A/B testing between legacy and new component architectures.
 * 
 * Features:
 * - Real-time performance metrics tracking
 * - A/B testing metrics collection and analysis
 * - Architecture comparison reporting
 * - User behavior pattern analysis
 * - Memory usage monitoring
 * - Error rate tracking and analysis
 * 
 * @version 1.0.0
 * @created 2025-01-12 (US-082-C Phase 1 Implementation)
 * @purpose A/B testing validation for architecture migration
 * @performance Tracks 25-30% improvement targets
 */

export class EntityMigrationTracker {
    /**
     * Initialize performance and A/B testing tracker
     * @param {string} entityType - Entity type being tracked
     * @param {Object} options - Tracking options
     */
    constructor(entityType, options = {}) {
        this.entityType = entityType;
        this.options = {
            enableMemoryTracking: true,
            enableUserBehaviorTracking: true,
            enableNetworkTracking: true,
            sampleRate: 1.0, // 100% sampling by default
            reportingInterval: 30000, // 30 seconds
            ...options
        };

        // Performance metrics storage
        this.metrics = {
            // Load operation metrics
            loadTime: {
                legacy: [],
                new: [],
                targets: { new: 340 } // 25% improvement target for teams
            },
            
            // CRUD operation metrics
            createTime: {
                legacy: [],
                new: [],
                targets: { new: 200 }
            },
            
            updateTime: {
                legacy: [],
                new: [],
                targets: { new: 200 }
            },
            
            deleteTime: {
                legacy: [],
                new: [],
                targets: { new: 150 }
            },
            
            // Interaction response metrics
            interactionTime: {
                legacy: [],
                new: [],
                targets: { new: 100 } // Sub-100ms interactions
            },
            
            // Memory usage metrics
            memoryUsage: {
                legacy: [],
                new: [],
                targets: { new: 15 } // <15% increase from baseline
            },
            
            // Error metrics
            errorRate: {
                legacy: 0,
                new: 0,
                targets: { new: 0.5 } // <0.5% error rate
            },
            
            // User satisfaction metrics
            userSatisfaction: {
                legacy: [],
                new: [],
                targets: { new: 90 } // >90% positive feedback
            }
        };

        // A/B testing configuration
        this.abTesting = {
            enabled: false,
            trafficSplit: 0.5, // 50/50 split
            currentArchitecture: 'new', // Default to new architecture
            userGroup: null,
            sessionId: this._generateSessionId()
        };

        // User behavior tracking
        this.userBehavior = {
            clickPatterns: [],
            timeOnPage: 0,
            taskCompletionRate: 0,
            bounceRate: 0
        };

        // Network metrics
        this.networkMetrics = {
            requests: [],
            bandwidth: [],
            latency: []
        };

        // Reporting
        this.lastReport = null;
        this.reportingTimer = null;

        // Initialize tracking
        this._initializeTracking();
        
        console.log(`[EntityMigrationTracker] Initialized for ${entityType}`);
    }

    /**
     * Track performance metric for specific operation
     * @param {string} architecture - Architecture type ('legacy' or 'new')
     * @param {string} operation - Operation type
     * @param {number} duration - Duration in milliseconds
     * @param {Object} metadata - Additional metadata
     */
    trackPerformance(architecture, operation, duration, metadata = {}) {
        try {
            // Validate inputs
            if (!architecture || !operation || typeof duration !== 'number') {
                console.warn('[EntityMigrationTracker] Invalid performance tracking parameters');
                return;
            }

            // Sampling check
            if (Math.random() > this.options.sampleRate) {
                return;
            }

            const timestamp = new Date().toISOString();
            const metricEntry = {
                timestamp,
                duration,
                metadata,
                sessionId: this.abTesting.sessionId,
                userGroup: this.abTesting.userGroup
            };

            // Store metric based on operation type
            const operationKey = `${operation}Time`;
            if (this.metrics[operationKey] && this.metrics[operationKey][architecture]) {
                this.metrics[operationKey][architecture].push(metricEntry);
                
                // Keep only last 1000 entries per metric
                if (this.metrics[operationKey][architecture].length > 1000) {
                    this.metrics[operationKey][architecture] = 
                        this.metrics[operationKey][architecture].slice(-1000);
                }

                // Check against targets
                this._checkPerformanceTarget(operationKey, architecture, duration);

                console.log(`[EntityMigrationTracker] ${this.entityType}.${operation} (${architecture}): ${duration.toFixed(2)}ms`);
            }

            // Track memory usage if enabled
            if (this.options.enableMemoryTracking) {
                this._trackMemoryUsage(architecture);
            }

        } catch (error) {
            console.error('[EntityMigrationTracker] Failed to track performance:', error);
        }
    }

    /**
     * Track error occurrence
     * @param {string} architecture - Architecture type
     * @param {string} operation - Operation type
     * @param {Error} error - Error object
     * @param {Object} context - Error context
     */
    trackError(architecture, operation, error, context = {}) {
        try {
            const timestamp = new Date().toISOString();
            const errorEntry = {
                timestamp,
                operation,
                error: {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                },
                context,
                sessionId: this.abTesting.sessionId,
                userGroup: this.abTesting.userGroup
            };

            // Update error rate
            if (this.metrics.errorRate[architecture] !== undefined) {
                this.metrics.errorRate[architecture]++;
            }

            // Store error details
            if (!this.errorDetails) {
                this.errorDetails = { legacy: [], new: [] };
            }
            
            if (this.errorDetails[architecture]) {
                this.errorDetails[architecture].push(errorEntry);
                
                // Keep only last 100 errors per architecture
                if (this.errorDetails[architecture].length > 100) {
                    this.errorDetails[architecture] = this.errorDetails[architecture].slice(-100);
                }
            }

            console.error(`[EntityMigrationTracker] ${this.entityType}.${operation} (${architecture}) error:`, error);

            // Check against error rate targets
            this._checkErrorTarget(architecture);

        } catch (trackingError) {
            console.error('[EntityMigrationTracker] Failed to track error:', trackingError);
        }
    }

    /**
     * Track user interaction
     * @param {string} architecture - Architecture type
     * @param {string} interaction - Interaction type
     * @param {number} responseTime - Response time in milliseconds
     * @param {Object} details - Interaction details
     */
    trackUserInteraction(architecture, interaction, responseTime, details = {}) {
        try {
            if (!this.options.enableUserBehaviorTracking) {
                return;
            }

            const timestamp = new Date().toISOString();
            const interactionEntry = {
                timestamp,
                interaction,
                responseTime,
                details,
                sessionId: this.abTesting.sessionId
            };

            // Track interaction response time
            this.trackPerformance(architecture, 'interaction', responseTime, { interaction, details });

            // Store user behavior data
            this.userBehavior.clickPatterns.push(interactionEntry);

            // Keep only last 500 interactions
            if (this.userBehavior.clickPatterns.length > 500) {
                this.userBehavior.clickPatterns = this.userBehavior.clickPatterns.slice(-500);
            }

            console.log(`[EntityMigrationTracker] User interaction (${architecture}): ${interaction} - ${responseTime.toFixed(2)}ms`);

        } catch (error) {
            console.error('[EntityMigrationTracker] Failed to track user interaction:', error);
        }
    }

    /**
     * Track user satisfaction feedback
     * @param {string} architecture - Architecture type
     * @param {number} rating - Satisfaction rating (1-5 or 1-10)
     * @param {string} feedback - Optional text feedback
     * @param {Object} context - Feedback context
     */
    trackUserSatisfaction(architecture, rating, feedback = '', context = {}) {
        try {
            const timestamp = new Date().toISOString();
            const satisfactionEntry = {
                timestamp,
                rating,
                feedback,
                context,
                sessionId: this.abTesting.sessionId,
                userGroup: this.abTesting.userGroup
            };

            if (this.metrics.userSatisfaction[architecture]) {
                this.metrics.userSatisfaction[architecture].push(satisfactionEntry);
                
                // Keep only last 1000 satisfaction entries
                if (this.metrics.userSatisfaction[architecture].length > 1000) {
                    this.metrics.userSatisfaction[architecture] = 
                        this.metrics.userSatisfaction[architecture].slice(-1000);
                }

                // Check against satisfaction targets
                this._checkSatisfactionTarget(architecture);
            }

            console.log(`[EntityMigrationTracker] User satisfaction (${architecture}): ${rating}/5 - "${feedback}"`);

        } catch (error) {
            console.error('[EntityMigrationTracker] Failed to track user satisfaction:', error);
        }
    }

    /**
     * Configure A/B testing parameters
     * @param {Object} config - A/B testing configuration
     */
    configureABTesting(config = {}) {
        this.abTesting = {
            ...this.abTesting,
            ...config
        };

        // Determine architecture based on A/B split
        if (this.abTesting.enabled) {
            const randomValue = Math.random();
            this.abTesting.currentArchitecture = randomValue < this.abTesting.trafficSplit ? 'legacy' : 'new';
        }

        console.log('[EntityMigrationTracker] A/B testing configured:', this.abTesting);
    }

    /**
     * Get current architecture for A/B testing
     * @returns {string} Current architecture ('legacy' or 'new')
     */
    getCurrentArchitecture() {
        return this.abTesting.currentArchitecture;
    }

    /**
     * Generate performance comparison report
     * @param {string} reportType - Report type ('summary', 'detailed', 'comparison')
     * @returns {Object} Performance report
     */
    generatePerformanceReport(reportType = 'summary') {
        try {
            const report = {
                entityType: this.entityType,
                timestamp: new Date().toISOString(),
                sessionId: this.abTesting.sessionId,
                reportType,
                metrics: {}
            };

            // Generate metrics for each tracked operation
            Object.keys(this.metrics).forEach(metricKey => {
                if (typeof this.metrics[metricKey] === 'object' && this.metrics[metricKey].legacy && this.metrics[metricKey].new) {
                    report.metrics[metricKey] = this._generateMetricReport(metricKey, reportType);
                }
            });

            // Add A/B testing summary
            report.abTesting = {
                enabled: this.abTesting.enabled,
                trafficSplit: this.abTesting.trafficSplit,
                currentArchitecture: this.abTesting.currentArchitecture,
                totalSessions: this._getTotalSessions()
            };

            // Add recommendations
            report.recommendations = this._generateRecommendations();

            this.lastReport = report;
            
            console.log(`[EntityMigrationTracker] Generated ${reportType} performance report`);
            
            return report;

        } catch (error) {
            console.error('[EntityMigrationTracker] Failed to generate performance report:', error);
            return null;
        }
    }

    /**
     * Get migration readiness assessment
     * @returns {Object} Readiness assessment
     */
    getMigrationReadiness() {
        try {
            const assessment = {
                entityType: this.entityType,
                timestamp: new Date().toISOString(),
                overall: 'unknown',
                scores: {},
                blockers: [],
                recommendations: []
            };

            // Performance readiness
            const performanceScore = this._assessPerformanceReadiness();
            assessment.scores.performance = performanceScore;

            // Error rate readiness
            const errorScore = this._assessErrorReadiness();
            assessment.scores.errorRate = errorScore;

            // User satisfaction readiness
            const satisfactionScore = this._assessSatisfactionReadiness();
            assessment.scores.userSatisfaction = satisfactionScore;

            // Memory usage readiness
            const memoryScore = this._assessMemoryReadiness();
            assessment.scores.memory = memoryScore;

            // Calculate overall score
            const scores = Object.values(assessment.scores);
            const overallScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

            // Determine readiness level
            if (overallScore >= 90) {
                assessment.overall = 'ready';
            } else if (overallScore >= 75) {
                assessment.overall = 'mostly-ready';
            } else if (overallScore >= 60) {
                assessment.overall = 'needs-improvement';
            } else {
                assessment.overall = 'not-ready';
            }

            // Add specific recommendations
            assessment.recommendations = this._getReadinessRecommendations(assessment.scores);

            console.log(`[EntityMigrationTracker] Migration readiness: ${assessment.overall} (${overallScore.toFixed(1)}%)`);

            return assessment;

        } catch (error) {
            console.error('[EntityMigrationTracker] Failed to assess migration readiness:', error);
            return { overall: 'error', error: error.message };
        }
    }

    // Private Methods

    /**
     * Initialize tracking systems
     * @private
     */
    _initializeTracking() {
        try {
            // Setup automatic reporting
            if (this.options.reportingInterval > 0) {
                this.reportingTimer = setInterval(() => {
                    const report = this.generatePerformanceReport('summary');
                    this._sendReport(report);
                }, this.options.reportingInterval);
            }

            // Setup memory monitoring
            if (this.options.enableMemoryTracking) {
                this._initializeMemoryMonitoring();
            }

            // Setup network monitoring
            if (this.options.enableNetworkTracking) {
                this._initializeNetworkMonitoring();
            }

            // Setup user behavior tracking
            if (this.options.enableUserBehaviorTracking) {
                this._initializeUserBehaviorTracking();
            }

            console.log('[EntityMigrationTracker] Tracking systems initialized');

        } catch (error) {
            console.error('[EntityMigrationTracker] Failed to initialize tracking:', error);
        }
    }

    /**
     * Track memory usage
     * @param {string} architecture - Architecture type
     * @private
     */
    _trackMemoryUsage(architecture) {
        try {
            if (performance.memory) {
                const memoryInfo = {
                    timestamp: new Date().toISOString(),
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit,
                    sessionId: this.abTesting.sessionId
                };

                this.metrics.memoryUsage[architecture].push(memoryInfo);

                // Keep only last 100 memory measurements
                if (this.metrics.memoryUsage[architecture].length > 100) {
                    this.metrics.memoryUsage[architecture] = this.metrics.memoryUsage[architecture].slice(-100);
                }
            }
        } catch (error) {
            console.warn('[EntityMigrationTracker] Memory tracking failed:', error);
        }
    }

    /**
     * Check performance against targets
     * @param {string} metricKey - Metric key
     * @param {string} architecture - Architecture type
     * @param {number} value - Current value
     * @private
     */
    _checkPerformanceTarget(metricKey, architecture, value) {
        const target = this.metrics[metricKey].targets?.[architecture];
        if (target && value > target * 1.1) { // 10% tolerance
            console.warn(`[EntityMigrationTracker] Performance target missed for ${metricKey} (${architecture}): ${value}ms > ${target}ms`);
        }
    }

    /**
     * Check error rate against targets
     * @param {string} architecture - Architecture type
     * @private
     */
    _checkErrorTarget(architecture) {
        const target = this.metrics.errorRate.targets?.[architecture];
        const current = this.metrics.errorRate[architecture];
        if (target && current > target) {
            console.warn(`[EntityMigrationTracker] Error rate target exceeded for ${architecture}: ${current}% > ${target}%`);
        }
    }

    /**
     * Check satisfaction against targets
     * @param {string} architecture - Architecture type
     * @private
     */
    _checkSatisfactionTarget(architecture) {
        const entries = this.metrics.userSatisfaction[architecture];
        if (entries.length > 10) { // Need at least 10 ratings
            const average = entries.reduce((sum, entry) => sum + entry.rating, 0) / entries.length;
            const target = this.metrics.userSatisfaction.targets?.[architecture];
            
            if (target && average < target / 5 * 100) { // Convert to percentage
                console.warn(`[EntityMigrationTracker] Satisfaction target not met for ${architecture}: ${average.toFixed(1)} < ${target}%`);
            }
        }
    }

    /**
     * Generate metric report
     * @param {string} metricKey - Metric key
     * @param {string} reportType - Report type
     * @returns {Object} Metric report
     * @private
     */
    _generateMetricReport(metricKey, reportType) {
        const metric = this.metrics[metricKey];
        const report = {
            legacy: this._analyzeMetricData(metric.legacy),
            new: this._analyzeMetricData(metric.new),
            targets: metric.targets,
            comparison: null
        };

        // Add comparison analysis
        if (report.legacy.count > 0 && report.new.count > 0) {
            report.comparison = {
                improvement: ((report.legacy.average - report.new.average) / report.legacy.average * 100).toFixed(2) + '%',
                significantDifference: this._isSignificantDifference(metric.legacy, metric.new),
                recommendation: this._getMetricRecommendation(metricKey, report)
            };
        }

        return report;
    }

    /**
     * Analyze metric data
     * @param {Array} data - Metric data array
     * @returns {Object} Analysis results
     * @private
     */
    _analyzeMetricData(data) {
        if (!data || data.length === 0) {
            return { count: 0, average: 0, min: 0, max: 0, p95: 0 };
        }

        const values = data.map(entry => entry.duration || entry.rating || entry.used || 0);
        values.sort((a, b) => a - b);

        return {
            count: values.length,
            average: values.reduce((sum, val) => sum + val, 0) / values.length,
            min: values[0],
            max: values[values.length - 1],
            p95: values[Math.floor(values.length * 0.95)],
            latest: values[values.length - 1]
        };
    }

    /**
     * Check if difference between architectures is statistically significant
     * @param {Array} legacyData - Legacy data
     * @param {Array} newData - New architecture data
     * @returns {boolean} Is significant
     * @private
     */
    _isSignificantDifference(legacyData, newData) {
        // Simple significance test - would be enhanced with proper statistical tests
        return legacyData.length >= 30 && newData.length >= 30;
    }

    /**
     * Generate session ID
     * @returns {string} Session ID
     * @private
     */
    _generateSessionId() {
        return `${this.entityType}-migration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get total number of tracked sessions
     * @returns {number} Session count
     * @private
     */
    _getTotalSessions() {
        // This would be enhanced with actual session tracking
        return Math.max(
            this.metrics.loadTime.legacy.length,
            this.metrics.loadTime.new.length
        );
    }

    /**
     * Generate recommendations based on metrics
     * @returns {Array} Recommendations
     * @private
     */
    _generateRecommendations() {
        const recommendations = [];

        // Check each metric against targets and generate recommendations
        Object.keys(this.metrics).forEach(metricKey => {
            const metric = this.metrics[metricKey];
            if (metric.new && metric.targets?.new) {
                const latestData = this._analyzeMetricData(metric.new);
                if (latestData.average > metric.targets.new) {
                    recommendations.push({
                        type: 'performance',
                        metric: metricKey,
                        message: `${metricKey} exceeds target (${latestData.average.toFixed(2)} > ${metric.targets.new})`,
                        priority: 'high'
                    });
                }
            }
        });

        return recommendations;
    }

    /**
     * Assess performance readiness
     * @returns {number} Performance score (0-100)
     * @private
     */
    _assessPerformanceReadiness() {
        let score = 100;
        let checks = 0;

        ['loadTime', 'createTime', 'updateTime', 'deleteTime'].forEach(metricKey => {
            const metric = this.metrics[metricKey];
            if (metric.new.length > 0 && metric.targets?.new) {
                checks++;
                const data = this._analyzeMetricData(metric.new);
                if (data.average > metric.targets.new) {
                    score -= 25; // Each failed metric reduces score by 25%
                }
            }
        });

        return checks > 0 ? Math.max(0, score) : 0;
    }

    /**
     * Assess error rate readiness
     * @returns {number} Error score (0-100)
     * @private
     */
    _assessErrorReadiness() {
        const target = this.metrics.errorRate.targets?.new || 0.5;
        const current = this.metrics.errorRate.new;
        
        if (current <= target) {
            return 100;
        } else if (current <= target * 2) {
            return 50;
        } else {
            return 0;
        }
    }

    /**
     * Assess satisfaction readiness
     * @returns {number} Satisfaction score (0-100)
     * @private
     */
    _assessSatisfactionReadiness() {
        const data = this._analyzeMetricData(this.metrics.userSatisfaction.new);
        const target = this.metrics.userSatisfaction.targets?.new || 4.5;
        
        if (data.count < 10) {
            return 50; // Insufficient data
        }

        return data.average >= target ? 100 : Math.max(0, (data.average / target) * 100);
    }

    /**
     * Assess memory usage readiness
     * @returns {number} Memory score (0-100)
     * @private
     */
    _assessMemoryReadiness() {
        const newData = this._analyzeMetricData(this.metrics.memoryUsage.new);
        const legacyData = this._analyzeMetricData(this.metrics.memoryUsage.legacy);
        
        if (newData.count === 0 || legacyData.count === 0) {
            return 50; // Insufficient data
        }

        const increase = ((newData.average - legacyData.average) / legacyData.average) * 100;
        const target = this.metrics.memoryUsage.targets?.new || 15;
        
        return increase <= target ? 100 : Math.max(0, 100 - (increase - target) * 2);
    }

    /**
     * Get readiness recommendations
     * @param {Object} scores - Assessment scores
     * @returns {Array} Recommendations
     * @private
     */
    _getReadinessRecommendations(scores) {
        const recommendations = [];

        if (scores.performance < 75) {
            recommendations.push('Optimize performance bottlenecks before full migration');
        }
        if (scores.errorRate < 75) {
            recommendations.push('Address error rate issues in new architecture');
        }
        if (scores.userSatisfaction < 75) {
            recommendations.push('Gather more user feedback and address satisfaction concerns');
        }
        if (scores.memory < 75) {
            recommendations.push('Optimize memory usage in new architecture');
        }

        return recommendations;
    }

    /**
     * Send report to tracking service
     * @param {Object} report - Performance report
     * @private
     */
    _sendReport(report) {
        try {
            // Send to analytics service if available
            if (window.UMIGServices?.analyticsService) {
                window.UMIGServices.analyticsService.track('migration_performance', report);
            }

            // Log locally
            console.log('[EntityMigrationTracker] Performance report generated:', report);
        } catch (error) {
            console.error('[EntityMigrationTracker] Failed to send report:', error);
        }
    }

    /**
     * Initialize memory monitoring
     * @private
     */
    _initializeMemoryMonitoring() {
        // MEMORY LEAK FIX: Store interval ID for proper cleanup
        this.memoryTrackingInterval = setInterval(() => {
            this._trackMemoryUsage(this.abTesting.currentArchitecture);
        }, 5000);
        
        console.log('[EntityMigrationTracker] Memory monitoring initialized with cleanup support');
    }

    /**
     * Initialize network monitoring
     * @private
     */
    _initializeNetworkMonitoring() {
        // MEMORY LEAK FIX: Store original fetch for proper cleanup
        if (!this.originalFetch) {
            this.originalFetch = window.fetch;
        }
        
        // Monitor fetch requests with proper cleanup tracking
        window.fetch = (...args) => {
            const startTime = performance.now();
            return this.originalFetch.apply(window, args).finally(() => {
                const duration = performance.now() - startTime;
                this.trackPerformance(this.abTesting.currentArchitecture, 'network', duration, {
                    url: args[0],
                    method: args[1]?.method || 'GET'
                });
            });
        };
        
        console.log('[EntityMigrationTracker] Network monitoring initialized with cleanup support');
    }

    /**
     * Initialize user behavior tracking
     * @private
     */
    _initializeUserBehaviorTracking() {
        // MEMORY LEAK FIX: Store event listeners for proper cleanup
        this.eventListeners = this.eventListeners || [];
        
        // Track page visibility
        const visibilityHandler = () => {
            if (document.hidden) {
                this.userBehavior.timeOnPage = performance.now();
            }
        };
        
        document.addEventListener('visibilitychange', visibilityHandler);
        this.eventListeners.push({
            element: document,
            event: 'visibilitychange',
            handler: visibilityHandler
        });

        // Track clicks
        const clickHandler = (event) => {
            if (event.target.closest('[data-entity-type="' + this.entityType + '"]')) {
                this.trackUserInteraction(
                    this.abTesting.currentArchitecture,
                    'click',
                    performance.now() % 1000, // Simple response time estimate
                    {
                        target: event.target.tagName,
                        className: event.target.className
                    }
                );
            }
        };
        
        document.addEventListener('click', clickHandler);
        this.eventListeners.push({
            element: document,
            event: 'click',
            handler: clickHandler
        });
        
        console.log('[EntityMigrationTracker] User behavior tracking initialized with cleanup support');
    }

    /**
     * Get metric recommendation
     * @param {string} metricKey - Metric key
     * @param {Object} report - Metric report
     * @returns {string} Recommendation
     * @private
     */
    _getMetricRecommendation(metricKey, report) {
        if (!report.comparison) return 'Insufficient data for recommendation';

        const improvementPct = parseFloat(report.comparison.improvement);
        
        if (improvementPct > 20) {
            return 'Excellent improvement - ready for migration';
        } else if (improvementPct > 10) {
            return 'Good improvement - consider migration';
        } else if (improvementPct > 0) {
            return 'Marginal improvement - monitor closely';
        } else {
            return 'Performance regression detected - investigate before migration';
        }
    }

    /**
     * Cleanup and destroy tracker
     */
    destroy() {
        console.log(`[EntityMigrationTracker] Destroying tracker for ${this.entityType}`);
        
        // MEMORY LEAK FIX: Clear all intervals
        if (this.reportingTimer) {
            clearInterval(this.reportingTimer);
            this.reportingTimer = null;
        }
        
        if (this.memoryTrackingInterval) {
            clearInterval(this.memoryTrackingInterval);
            this.memoryTrackingInterval = null;
        }

        // MEMORY LEAK FIX: Restore original fetch function
        if (this.originalFetch && window.fetch !== this.originalFetch) {
            window.fetch = this.originalFetch;
            this.originalFetch = null;
            console.log('[EntityMigrationTracker] Restored original fetch function');
        }

        // MEMORY LEAK FIX: Remove all event listeners
        if (this.eventListeners && this.eventListeners.length > 0) {
            this.eventListeners.forEach(({ element, event, handler }) => {
                try {
                    element.removeEventListener(event, handler);
                } catch (error) {
                    console.warn('[EntityMigrationTracker] Failed to remove event listener:', error);
                }
            });
            this.eventListeners = [];
            console.log('[EntityMigrationTracker] Removed all event listeners');
        }

        // Generate final report before cleanup
        try {
            const finalReport = this.generatePerformanceReport('detailed');
            this._sendReport(finalReport);
        } catch (error) {
            console.error('[EntityMigrationTracker] Failed to generate final report:', error);
        }

        // Clear all data references to prevent memory leaks
        this.metrics = null;
        this.userBehavior = null;
        this.networkMetrics = null;
        this.abTesting = null;
        this.options = null;
        
        // Clear any remaining timers or intervals
        this._clearAllTimers();
        
        console.log('[EntityMigrationTracker] Cleanup completed successfully');
    }
    
    /**
     * Clear all timers and intervals
     * @private
     */
    _clearAllTimers() {
        // Clear any setTimeout/setInterval IDs that might still be running
        // This is a defensive measure to ensure complete cleanup
        try {
            // Get the highest timeout ID by setting a temporary timeout
            const highestTimeoutId = setTimeout(';');
            clearTimeout(highestTimeoutId);
            
            // Clear all possible timeout IDs (conservative approach)
            for (let i = 1; i <= highestTimeoutId; i++) {
                clearTimeout(i);
                clearInterval(i);
            }
        } catch (error) {
            // Ignore errors in this cleanup - it's a best-effort approach
            console.debug('[EntityMigrationTracker] Timer cleanup completed with minor issues (expected)');
        }
    }
}

export default EntityMigrationTracker;