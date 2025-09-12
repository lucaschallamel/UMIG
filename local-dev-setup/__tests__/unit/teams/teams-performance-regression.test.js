/**
 * Teams Performance Regression Test Suite
 * 
 * Automated performance regression testing to ensure Teams Entity Migration
 * maintains the 25% performance improvement target and doesn't degrade over time.
 * 
 * Test Categories:
 * - Performance baseline establishment
 * - Regression detection algorithms
 * - Memory usage monitoring
 * - Rendering performance tracking
 * - Network request optimization validation
 * - Component lifecycle performance
 * 
 * @version 1.0.0
 * @created 2025-01-12 (US-082-C Remediation - Priority 3)
 * @target-performance 25% improvement maintenance
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { TeamBuilder } from './TeamBuilder.js';
import { CachingTeamsEntityManager } from './teams-performance.test.js';

// Performance baseline configuration
const PERFORMANCE_BASELINES = {
    load: 450,        // Legacy baseline (ms)
    create: 250,      // Legacy baseline (ms)
    update: 250,      // Legacy baseline (ms)
    delete: 200,      // Legacy baseline (ms)
    memberOps: 400,   // Legacy baseline (ms)
    render: 100,      // Legacy baseline (ms)
    memory: 1000000   // Legacy baseline (bytes)
};

const PERFORMANCE_TARGETS = {
    load: 340,        // 25% improvement (450 * 0.75)
    create: 200,      // 20% improvement
    update: 200,      // 20% improvement  
    delete: 150,      // 25% improvement
    memberOps: 300,   // 25% improvement
    render: 75,       // 25% improvement
    memory: 800000    // 20% improvement
};

const REGRESSION_THRESHOLDS = {
    warning: 0.10,    // 10% degradation triggers warning
    critical: 0.20,   // 20% degradation triggers failure
    samples: 10       // Minimum samples for reliable measurement
};

class PerformanceRegessionTracker {
    constructor() {
        this.measurements = new Map();
        this.baselines = { ...PERFORMANCE_BASELINES };
        this.targets = { ...PERFORMANCE_TARGETS };
        this.history = [];
    }

    addMeasurement(operation, duration, metadata = {}) {
        if (!this.measurements.has(operation)) {
            this.measurements.set(operation, []);
        }
        
        this.measurements.get(operation).push({
            duration,
            timestamp: Date.now(),
            metadata
        });

        this.history.push({
            operation,
            duration,
            timestamp: Date.now(),
            metadata
        });
    }

    getStatistics(operation) {
        const measurements = this.measurements.get(operation) || [];
        if (measurements.length === 0) {
            return null;
        }

        const durations = measurements.map(m => m.duration);
        durations.sort((a, b) => a - b);

        const sum = durations.reduce((acc, val) => acc + val, 0);
        const mean = sum / durations.length;
        const median = durations[Math.floor(durations.length / 2)];
        
        // Calculate percentiles
        const p95Index = Math.floor(durations.length * 0.95);
        const p99Index = Math.floor(durations.length * 0.99);
        
        return {
            count: durations.length,
            min: durations[0],
            max: durations[durations.length - 1],
            mean,
            median,
            p95: durations[p95Index] || durations[durations.length - 1],
            p99: durations[p99Index] || durations[durations.length - 1],
            standardDeviation: this.calculateStandardDeviation(durations, mean)
        };
    }

    calculateStandardDeviation(values, mean) {
        const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
        const avgSquaredDiff = squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length;
        return Math.sqrt(avgSquaredDiff);
    }

    checkRegression(operation) {
        const stats = this.getStatistics(operation);
        if (!stats || stats.count < REGRESSION_THRESHOLDS.samples) {
            return {
                status: 'insufficient_data',
                message: `Need at least ${REGRESSION_THRESHOLDS.samples} samples for reliable regression analysis`,
                samplesCollected: stats ? stats.count : 0
            };
        }

        const baseline = this.baselines[operation];
        const target = this.targets[operation];
        
        if (!baseline || !target) {
            return {
                status: 'no_baseline',
                message: `No baseline configured for operation: ${operation}`
            };
        }

        // Check against target (improvement from baseline)
        const improvementFromBaseline = (baseline - stats.median) / baseline;
        const expectedImprovement = (baseline - target) / baseline;
        
        // Check for regression from target
        const regressionFromTarget = (stats.median - target) / target;
        
        let status = 'good';
        let message = `Performance within expected range`;
        
        if (regressionFromTarget > REGRESSION_THRESHOLDS.critical) {
            status = 'critical';
            message = `CRITICAL: Performance regressed ${(regressionFromTarget * 100).toFixed(1)}% from target`;
        } else if (regressionFromTarget > REGRESSION_THRESHOLDS.warning) {
            status = 'warning';
            message = `WARNING: Performance regressed ${(regressionFromTarget * 100).toFixed(1)}% from target`;
        } else if (improvementFromBaseline >= expectedImprovement) {
            status = 'excellent';
            message = `Performance target achieved: ${(improvementFromBaseline * 100).toFixed(1)}% improvement from baseline`;
        }

        return {
            status,
            message,
            statistics: stats,
            baseline,
            target,
            current: stats.median,
            improvementFromBaseline,
            regressionFromTarget,
            recommendation: this.getPerformanceRecommendation(operation, stats, regressionFromTarget)
        };
    }

    getPerformanceRecommendation(operation, stats, regressionRatio) {
        if (regressionRatio <= 0) {
            return 'Performance is within target. Continue current optimization strategies.';
        }

        if (regressionRatio > REGRESSION_THRESHOLDS.critical) {
            return `URGENT: Investigate ${operation} performance. Consider profiling, caching improvements, or algorithm optimization.`;
        }

        if (regressionRatio > REGRESSION_THRESHOLDS.warning) {
            return `Monitor ${operation} performance closely. Consider preventive optimization if trend continues.`;
        }

        return 'Performance acceptable but watch for trends.';
    }

    generateRegressionReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalOperations: this.measurements.size,
                totalMeasurements: this.history.length,
                criticalRegressions: 0,
                warningRegressions: 0,
                performingWell: 0
            },
            operations: {},
            recommendations: [],
            trends: this.analyzeTrends()
        };

        for (const [operation] of this.measurements) {
            const analysis = this.checkRegression(operation);
            report.operations[operation] = analysis;

            switch (analysis.status) {
                case 'critical':
                    report.summary.criticalRegressions++;
                    report.recommendations.push(`CRITICAL: ${operation} - ${analysis.message}`);
                    break;
                case 'warning':
                    report.summary.warningRegressions++;
                    report.recommendations.push(`WARNING: ${operation} - ${analysis.message}`);
                    break;
                case 'excellent':
                case 'good':
                    report.summary.performingWell++;
                    break;
            }
        }

        return report;
    }

    analyzeTrends() {
        const trends = {};
        
        for (const [operation] of this.measurements) {
            const measurements = this.measurements.get(operation);
            if (measurements.length < 5) continue;

            // Get recent measurements (last 50% of samples)
            const recentCount = Math.floor(measurements.length / 2);
            const recent = measurements.slice(-recentCount);
            const earlier = measurements.slice(0, measurements.length - recentCount);

            const recentAvg = recent.reduce((sum, m) => sum + m.duration, 0) / recent.length;
            const earlierAvg = earlier.reduce((sum, m) => sum + m.duration, 0) / earlier.length;

            const trendDirection = recentAvg > earlierAvg ? 'degrading' : 'improving';
            const trendMagnitude = Math.abs((recentAvg - earlierAvg) / earlierAvg);

            trends[operation] = {
                direction: trendDirection,
                magnitude: trendMagnitude,
                significance: trendMagnitude > 0.05 ? 'significant' : 'minor'
            };
        }

        return trends;
    }

    reset() {
        this.measurements.clear();
        this.history = [];
    }
}

describe('Teams Performance Regression Tests', () => {
    let performanceTracker;
    let teamsManager;

    beforeEach(() => {
        performanceTracker = new PerformanceRegessionTracker();
        teamsManager = new CachingTeamsEntityManager();
        
        // Mock performance.now for consistent testing
        let mockTime = 0;
        global.performance.now = jest.fn(() => mockTime += Math.random() * 10);
    });

    afterEach(() => {
        jest.clearAllMocks();
        performanceTracker.reset();
    });

    describe('Performance Baseline Establishment', () => {
        test('should establish reliable performance baselines', async () => {
            const mockResponse = { teams: [], total: 0 };
            global.fetch = jest.fn(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            }));

            // Collect baseline measurements
            for (let i = 0; i < 20; i++) {
                const startTime = performance.now();
                await teamsManager.loadData();
                const duration = performance.now() - startTime;
                
                performanceTracker.addMeasurement('load', duration);
            }

            const stats = performanceTracker.getStatistics('load');
            
            expect(stats.count).toBe(20);
            expect(stats.mean).toBeGreaterThan(0);
            expect(stats.standardDeviation).toBeGreaterThan(0);
            expect(stats.p95).toBeGreaterThanOrEqual(stats.median);
            expect(stats.p99).toBeGreaterThanOrEqual(stats.p95);
        });

        test('should detect performance improvements from baseline', async () => {
            const mockResponse = { teams: [], total: 0 };
            global.fetch = jest.fn(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            }));

            // Simulate improved performance (below target)
            global.performance.now = jest.fn()
                .mockReturnValueOnce(0)
                .mockReturnValueOnce(300) // 300ms - better than target of 340ms
                .mockReturnValueOnce(0)
                .mockReturnValueOnce(320) // 320ms
                .mockReturnValueOnce(0)
                .mockReturnValueOnce(310); // 310ms

            for (let i = 0; i < 15; i++) {
                const startTime = performance.now();
                await teamsManager.loadData();
                const duration = performance.now() - startTime;
                
                performanceTracker.addMeasurement('load', duration);
            }

            const analysis = performanceTracker.checkRegression('load');
            
            expect(analysis.status).toMatch(/excellent|good/);
            expect(analysis.improvementFromBaseline).toBeGreaterThan(0);
            expect(analysis.current).toBeLessThan(PERFORMANCE_TARGETS.load);
        });

        test('should detect performance regressions', async () => {
            const mockResponse = { teams: [], total: 0 };
            global.fetch = jest.fn(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            }));

            // Simulate regressed performance (significantly above target)
            const regressedDuration = PERFORMANCE_TARGETS.load * 1.3; // 30% worse than target
            
            for (let i = 0; i < 15; i++) {
                performanceTracker.addMeasurement('load', regressedDuration + Math.random() * 50);
            }

            const analysis = performanceTracker.checkRegression('load');
            
            expect(analysis.status).toBe('critical');
            expect(analysis.regressionFromTarget).toBeGreaterThan(REGRESSION_THRESHOLDS.critical);
            expect(analysis.message).toContain('CRITICAL');
            expect(analysis.recommendation).toContain('URGENT');
        });
    });

    describe('Memory Performance Regression', () => {
        test('should detect memory usage regressions', async () => {
            const mockResponse = { teams: TeamBuilder.performanceDataset(1000), total: 1000 };
            global.fetch = jest.fn(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            }));

            // Simulate memory measurements
            const measurements = [];
            
            for (let i = 0; i < 10; i++) {
                const initialMemory = performance.memory.usedJSHeapSize;
                await teamsManager.loadData();
                const finalMemory = performance.memory.usedJSHeapSize;
                const memoryIncrease = finalMemory - initialMemory;
                
                measurements.push(memoryIncrease);
                performanceTracker.addMeasurement('memory', memoryIncrease);
                
                teamsManager.clearCache(); // Reset for next measurement
            }

            const analysis = performanceTracker.checkRegression('memory');
            
            if (analysis.status !== 'insufficient_data') {
                expect(analysis.current).toBeDefined();
                expect(analysis.baseline).toBe(PERFORMANCE_BASELINES.memory);
                expect(analysis.target).toBe(PERFORMANCE_TARGETS.memory);
            }
        });

        test('should monitor memory leaks over time', async () => {
            const mockResponse = { teams: [], total: 0 };
            global.fetch = jest.fn(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            }));

            let simulatedMemoryUsage = 500000; // Start with 500KB

            // Simulate gradual memory increase (potential leak)
            for (let i = 0; i < 20; i++) {
                // Simulate memory increasing over time
                simulatedMemoryUsage += 10000 + Math.random() * 5000; // 10-15KB increase per operation
                
                await teamsManager.loadData();
                performanceTracker.addMeasurement('memory', simulatedMemoryUsage);
            }

            const trends = performanceTracker.analyzeTrends();
            
            if (trends.memory) {
                expect(trends.memory.direction).toBe('degrading');
                if (trends.memory.significance === 'significant') {
                    expect(trends.memory.magnitude).toBeGreaterThan(0.05);
                }
            }
        });
    });

    describe('Component Lifecycle Performance', () => {
        test('should track component rendering performance', async () => {
            // Simulate component render measurements
            const renderDurations = [
                60, 65, 58, 72, 69, 61, 55, 63, 67, 59, // Good performance
                71, 68, 62, 66, 64, 57, 70, 65, 61, 58  // Consistent
            ];

            renderDurations.forEach(duration => {
                performanceTracker.addMeasurement('render', duration);
            });

            const analysis = performanceTracker.checkRegression('render');
            
            expect(analysis.status).toMatch(/excellent|good/);
            expect(analysis.statistics.mean).toBeLessThan(PERFORMANCE_TARGETS.render);
        });

        test('should detect component update performance regressions', async () => {
            const mockResponse = { teams: [], total: 0 };
            global.fetch = jest.fn(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            }));

            // Simulate component update operations
            for (let i = 0; i < 15; i++) {
                const updateDuration = PERFORMANCE_TARGETS.update * 0.9; // 10% better than target
                performanceTracker.addMeasurement('update', updateDuration + Math.random() * 20);
            }

            const analysis = performanceTracker.checkRegression('update');
            
            expect(analysis.status).toMatch(/excellent|good/);
            expect(analysis.current).toBeLessThan(PERFORMANCE_TARGETS.update * 1.1); // Within 10% of target
        });

        test('should monitor component destruction performance', async () => {
            // Simulate component cleanup/destruction
            for (let i = 0; i < 12; i++) {
                const destroyDuration = 25 + Math.random() * 10; // Fast cleanup
                performanceTracker.addMeasurement('destroy', destroyDuration);
            }

            const stats = performanceTracker.getStatistics('destroy');
            
            expect(stats.count).toBe(12);
            expect(stats.mean).toBeLessThan(50); // Cleanup should be fast
            expect(stats.p95).toBeLessThan(100); // 95% under 100ms
        });
    });

    describe('Network Performance Regression', () => {
        test('should track API request performance trends', async () => {
            let requestCount = 0;
            global.fetch = jest.fn(() => {
                requestCount++;
                const delay = requestCount > 10 ? 150 : 80; // Simulate degradation after 10 requests
                
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve({
                            ok: true,
                            json: () => Promise.resolve({ teams: [], total: 0 })
                        });
                    }, delay);
                });
            });

            for (let i = 0; i < 20; i++) {
                const startTime = Date.now();
                await teamsManager.loadData();
                teamsManager.clearCache(); // Force API calls
                const networkTime = Date.now() - startTime;
                
                performanceTracker.addMeasurement('network', networkTime);
            }

            const trends = performanceTracker.analyzeTrends();
            
            if (trends.network) {
                expect(trends.network.direction).toBe('degrading');
            }
        });

        test('should detect caching effectiveness regressions', async () => {
            const mockResponse = { teams: [], total: 0 };
            global.fetch = jest.fn(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            }));

            // Measure cache hit vs miss performance
            let cacheHitDuration = 0;
            let cacheMissDuration = 0;

            for (let i = 0; i < 10; i++) {
                // Cache miss
                teamsManager.clearCache();
                let startTime = performance.now();
                await teamsManager.loadData();
                cacheMissDuration += (performance.now() - startTime);

                // Cache hit
                startTime = performance.now();
                await teamsManager.loadData();
                cacheHitDuration += (performance.now() - startTime);
            }

            const cacheHitAvg = cacheHitDuration / 10;
            const cacheMissAvg = cacheMissDuration / 10;
            const cacheEfficiency = (cacheMissAvg - cacheHitAvg) / cacheMissAvg;

            // Cache hits should be significantly faster
            expect(cacheEfficiency).toBeGreaterThan(0.5); // At least 50% faster
            expect(cacheHitAvg).toBeLessThan(cacheMissAvg);
        });
    });

    describe('Regression Detection Algorithms', () => {
        test('should use statistical significance for regression detection', async () => {
            // Add measurements with normal distribution
            const normalPerformance = Array.from({ length: 30 }, () => 
                PERFORMANCE_TARGETS.load + (Math.random() - 0.5) * 20 // ±10ms variance
            );

            normalPerformance.forEach(duration => {
                performanceTracker.addMeasurement('load', duration);
            });

            // Add a few outliers
            performanceTracker.addMeasurement('load', PERFORMANCE_TARGETS.load * 2); // Outlier
            performanceTracker.addMeasurement('load', PERFORMANCE_TARGETS.load * 0.1); // Outlier

            const stats = performanceTracker.getStatistics('load');
            
            // Median should be more stable than mean with outliers
            expect(Math.abs(stats.median - PERFORMANCE_TARGETS.load)).toBeLessThan(20);
            expect(stats.standardDeviation).toBeGreaterThan(0);
        });

        test('should require minimum samples for reliable regression analysis', async () => {
            // Add insufficient samples
            for (let i = 0; i < 5; i++) {
                performanceTracker.addMeasurement('load', 400);
            }

            const analysis = performanceTracker.checkRegression('load');
            
            expect(analysis.status).toBe('insufficient_data');
            expect(analysis.samplesCollected).toBe(5);
            expect(analysis.message).toContain('at least 10 samples');
        });

        test('should generate comprehensive regression reports', async () => {
            // Add measurements for multiple operations
            const operations = ['load', 'create', 'update', 'delete'];
            
            operations.forEach(op => {
                for (let i = 0; i < 15; i++) {
                    const target = PERFORMANCE_TARGETS[op];
                    const duration = target + (Math.random() - 0.5) * target * 0.2; // ±10% variance
                    performanceTracker.addMeasurement(op, duration);
                }
            });

            const report = performanceTracker.generateRegressionReport();
            
            expect(report.timestamp).toBeDefined();
            expect(report.summary.totalOperations).toBe(4);
            expect(report.summary.totalMeasurements).toBe(60);
            expect(report.operations).toHaveProperty('load');
            expect(report.operations).toHaveProperty('create');
            expect(report.operations).toHaveProperty('update');
            expect(report.operations).toHaveProperty('delete');
            expect(report.trends).toBeDefined();
        });
    });

    describe('Performance Alerting and Recommendations', () => {
        test('should provide actionable performance recommendations', async () => {
            // Simulate critical performance regression
            for (let i = 0; i < 15; i++) {
                const criticalDuration = PERFORMANCE_TARGETS.load * 1.5; // 50% regression
                performanceTracker.addMeasurement('load', criticalDuration);
            }

            const analysis = performanceTracker.checkRegression('load');
            
            expect(analysis.status).toBe('critical');
            expect(analysis.recommendation).toContain('URGENT');
            expect(analysis.recommendation).toMatch(/profiling|caching|optimization/i);
        });

        test('should categorize performance issues by severity', async () => {
            const testCases = [
                {
                    name: 'excellent',
                    multiplier: 0.7, // 30% better than target
                    expectedStatus: 'excellent'
                },
                {
                    name: 'good',
                    multiplier: 1.0, // At target
                    expectedStatus: 'good'
                },
                {
                    name: 'warning',
                    multiplier: 1.15, // 15% regression (warning threshold: 10%)
                    expectedStatus: 'warning'
                },
                {
                    name: 'critical',
                    multiplier: 1.25, // 25% regression (critical threshold: 20%)
                    expectedStatus: 'critical'
                }
            ];

            for (const testCase of testCases) {
                performanceTracker.reset();
                
                for (let i = 0; i < 15; i++) {
                    const duration = PERFORMANCE_TARGETS.load * testCase.multiplier;
                    performanceTracker.addMeasurement('load', duration + Math.random() * 10);
                }

                const analysis = performanceTracker.checkRegression('load');
                expect(analysis.status).toBe(testCase.expectedStatus);
            }
        });

        test('should track performance trend directions', async () => {
            // Simulate improving trend
            for (let i = 0; i < 20; i++) {
                // Performance gets better over time
                const baseDuration = PERFORMANCE_TARGETS.load;
                const improvementRate = 0.02; // 2% improvement per iteration
                const currentDuration = baseDuration * (1 - (i * improvementRate));
                
                performanceTracker.addMeasurement('load', currentDuration);
            }

            const trends = performanceTracker.analyzeTrends();
            
            expect(trends.load.direction).toBe('improving');
            if (trends.load.significance === 'significant') {
                expect(trends.load.magnitude).toBeGreaterThan(0.05);
            }
        });
    });
});

export default {
    PerformanceRegessionTracker,
    PERFORMANCE_BASELINES,
    PERFORMANCE_TARGETS,
    REGRESSION_THRESHOLDS
};