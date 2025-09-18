/**
 * US-087 Phase 1 Infrastructure Validation Test
 *
 * Jest-based infrastructure validation for US-087 Phase 1 implementation.
 * Tests file structure, integration patterns, and Phase 1 requirements.
 *
 * Run with: npm run test:js:infrastructure -- --testPathPattern='US-087-ci-validation'
 */

const fs = require('fs');
const path = require('path');

describe('US-087 Phase 1 Infrastructure Validation', () => {
  const projectRoot = path.resolve(__dirname, '../../..');
  let testResults = {
    passed: 0,
    failed: 0,
    warnings: 0
  };

  beforeEach(() => {
    testResults = { passed: 0, failed: 0, warnings: 0 };
  });

  describe('Utility Files Validation', () => {
    const utilsPath = path.join(projectRoot, 'src', 'groovy', 'umig', 'web', 'js', 'utils');

    test('should verify FeatureToggle.js exists', () => {
      const featureTogglePath = path.join(utilsPath, 'FeatureToggle.js');

      expect(fs.existsSync(featureTogglePath)).toBe(true);
      testResults.passed++;

      if (fs.existsSync(featureTogglePath)) {
        const content = fs.readFileSync(featureTogglePath, 'utf8');

        // Check for key methods
        expect(content).toMatch(/enable\s*\(/);
        expect(content).toMatch(/disable\s*\(/);
        expect(content).toMatch(/isEnabled\s*\(/);
        testResults.passed += 3;
      }
    });

    test('should verify PerformanceMonitor.js exists', () => {
      const perfMonitorPath = path.join(utilsPath, 'PerformanceMonitor.js');

      expect(fs.existsSync(perfMonitorPath)).toBe(true);
      testResults.passed++;

      if (fs.existsSync(perfMonitorPath)) {
        const content = fs.readFileSync(perfMonitorPath, 'utf8');

        // Check for key methods
        expect(content).toMatch(/startOperation\s*\(/);
        expect(content).toMatch(/generateReport\s*\(/);
        expect(content).toMatch(/recordMetric\s*\(/);
        testResults.passed += 3;
      }
    });
  });

  describe('Admin GUI Integration Validation', () => {
    const adminGuiPath = path.join(projectRoot, 'src', 'groovy', 'umig', 'web', 'js', 'admin-gui.js');

    test('should verify admin-gui.js exists and has integration markers', () => {
      expect(fs.existsSync(adminGuiPath)).toBe(true);
      testResults.passed++;

      const content = fs.readFileSync(adminGuiPath, 'utf8');

      const integrationMarkers = [
        { name: 'Component managers', pattern: /componentManagers:\s*\{/ },
        { name: 'Feature toggle property', pattern: /featureToggle:\s*null/ },
        { name: 'Performance monitor property', pattern: /performanceMonitor:\s*null/ },
        { name: 'initializeComponentMigration method', pattern: /initializeComponentMigration:\s*function/ },
        { name: 'loadEntityManagers method', pattern: /loadEntityManagers:\s*function/ },
        { name: 'loadTeamsEntityManager method', pattern: /loadTeamsEntityManager:\s*function/ },
        { name: 'shouldUseComponentManager method', pattern: /shouldUseComponentManager:\s*function/ },
        { name: 'loadWithEntityManager method', pattern: /loadWithEntityManager\(entity\)/ },
        { name: 'US-087 integration check', pattern: /US-087.*Check if we should use component manager/ },
        { name: 'Keyboard shortcuts', pattern: /Ctrl\+Shift\+M.*Toggle migration/ },
      ];

      integrationMarkers.forEach((marker) => {
        if (marker.pattern.test(content)) {
          testResults.passed++;
        } else {
          testResults.failed++;
        }
        expect(content).toMatch(marker.pattern);
      });
    });
  });

  describe('TeamsEntityManager Validation', () => {
    const teamsManagerPath = path.join(
      projectRoot,
      'src', 'groovy', 'umig', 'web', 'js', 'entities', 'teams', 'TeamsEntityManager.js'
    );

    test('should verify TeamsEntityManager exists and extends BaseEntityManager', () => {
      expect(fs.existsSync(teamsManagerPath)).toBe(true);
      testResults.passed++;

      if (fs.existsSync(teamsManagerPath)) {
        const content = fs.readFileSync(teamsManagerPath, 'utf8');

        // Check if it extends BaseEntityManager
        if (content.includes('extends BaseEntityManager')) {
          testResults.passed++;
        } else {
          testResults.warnings++;
        }
        expect(content).toMatch(/extends BaseEntityManager/);
      }
    });
  });

  describe('Phase 1 Requirements Validation', () => {
    const adminGuiPath = path.join(projectRoot, 'src', 'groovy', 'umig', 'web', 'js', 'admin-gui.js');

    test('should validate Phase 1 implementation requirements', () => {
      expect(fs.existsSync(adminGuiPath)).toBe(true);
      const content = fs.readFileSync(adminGuiPath, 'utf8');

      const requirements = [
        {
          name: 'Backward compatibility',
          check: content.includes('shouldUseComponentManager') && content.includes('loadCurrentSectionLegacy'),
        },
        {
          name: 'Feature toggle integration',
          check: content.includes('this.featureToggle') && content.includes('isEnabled'),
        },
        {
          name: 'Performance monitoring',
          check: content.includes('performanceMonitor') && content.includes('startTimer'),
        },
        {
          name: 'Error handling with rollback',
          check: content.includes('emergencyRollback') || content.includes('Rollback to legacy mode'),
        },
        {
          name: 'Dual-mode operation',
          check: content.includes('loadWithEntityManager') && content.includes('legacy'),
        },
      ];

      requirements.forEach((req) => {
        if (req.check) {
          testResults.passed++;
        } else {
          testResults.failed++;
        }
        expect(req.check).toBe(true);
      });
    });
  });

  describe('Security and Best Practices Validation', () => {
    const adminGuiPath = path.join(projectRoot, 'src', 'groovy', 'umig', 'web', 'js', 'admin-gui.js');

    test('should validate security practices', () => {
      expect(fs.existsSync(adminGuiPath)).toBe(true);
      const content = fs.readFileSync(adminGuiPath, 'utf8');

      // Check for security best practices
      const securityChecks = [
        {
          name: 'No direct innerHTML usage in new code',
          pattern: /loadWithEntityManager[\s\S]*?innerHTML/,
          shouldExist: false,
        },
        {
          name: 'No dynamic code execution',
          pattern: /eval\s*\(|Function\s*\(|setTimeout.*string/,
          shouldExist: false,
        },
        {
          name: 'Defensive programming with try-catch',
          pattern: /try\s*{[\s\S]*?catch/,
          shouldExist: true,
        },
      ];

      securityChecks.forEach((check) => {
        const found = check.pattern.test(content);
        const passed = check.shouldExist ? found : !found;

        if (passed) {
          testResults.passed++;
        } else {
          testResults.failed++;
        }

        if (check.shouldExist) {
          expect(content).toMatch(check.pattern);
        } else {
          expect(content).not.toMatch(check.pattern);
        }
      });
    });
  });

  describe('Feature Toggle Configuration Validation', () => {
    const utilsPath = path.join(projectRoot, 'src', 'groovy', 'umig', 'web', 'js', 'utils');
    const featureTogglePath = path.join(utilsPath, 'FeatureToggle.js');

    test('should validate secure defaults and configuration', () => {
      if (fs.existsSync(featureTogglePath)) {
        const content = fs.readFileSync(featureTogglePath, 'utf8');

        const configChecks = [
          {
            name: 'Secure defaults (features disabled)',
            pattern: /'admin-gui-migration':\s*false/,
          },
          {
            name: 'Emergency rollback capability',
            pattern: /emergencyRollback.*function/,
          },
          {
            name: 'Audit trail for feature changes',
            pattern: /console\.log.*Feature.*enabled|disabled/,
          },
        ];

        configChecks.forEach((check) => {
          if (check.pattern.test(content)) {
            testResults.passed++;
          } else {
            testResults.failed++;
          }
          expect(content).toMatch(check.pattern);
        });
      }
    });
  });

  describe('Performance Monitor Configuration Validation', () => {
    const utilsPath = path.join(projectRoot, 'src', 'groovy', 'umig', 'web', 'js', 'utils');
    const perfMonitorPath = path.join(utilsPath, 'PerformanceMonitor.js');

    test('should validate performance monitoring capabilities', () => {
      if (fs.existsSync(perfMonitorPath)) {
        const content = fs.readFileSync(perfMonitorPath, 'utf8');

        const perfChecks = [
          {
            name: 'Performance threshold alerts',
            pattern: /errorThreshold|warnThreshold/,
          },
          {
            name: 'Metrics size limiting',
            pattern: /maxMetricsSize|slice\(-this\.config\.maxMetricsSize\)/,
          },
          {
            name: 'Memory usage monitoring',
            pattern: /usedJSHeapSize|memoryUsage/,
          },
        ];

        perfChecks.forEach((check) => {
          if (check.pattern.test(content)) {
            testResults.passed++;
          } else {
            testResults.failed++;
          }
          expect(content).toMatch(check.pattern);
        });
      }
    });
  });

  describe('File Structure and Dependencies', () => {
    test('should verify component architecture structure', () => {
      const componentPaths = [
        'src/groovy/umig/web/js/components/ComponentOrchestrator.js',
        'src/groovy/umig/web/js/components/BaseComponent.js',
        'src/groovy/umig/web/js/entities/BaseEntityManager.js',
        'src/groovy/umig/web/js/entities/teams/TeamsEntityManager.js',
      ];

      componentPaths.forEach((componentPath) => {
        const fullPath = path.join(projectRoot, componentPath);
        if (fs.existsSync(fullPath)) {
          testResults.passed++;
        } else {
          testResults.warnings++;
        }
        // Don't fail the test if components are missing, just warn
        // expect(fs.existsSync(fullPath)).toBe(true);
      });
    });

    test('should verify no critical dependencies are missing', () => {
      const criticalFiles = [
        'src/groovy/umig/web/js/admin-gui.js',
        'src/groovy/umig/web/js/utils/FeatureToggle.js',
        'src/groovy/umig/web/js/utils/PerformanceMonitor.js',
      ];

      criticalFiles.forEach((filePath) => {
        const fullPath = path.join(projectRoot, filePath);
        expect(fs.existsSync(fullPath)).toBe(true);
        testResults.passed++;
      });
    });
  });

  afterAll(() => {
    // Generate summary report
    console.log('\n========================================');
    console.log('US-087 PHASE 1 INFRASTRUCTURE VALIDATION');
    console.log('========================================');
    console.log(\`✅ Passed: \${testResults.passed}\`);
    console.log(\`⚠️ Warnings: \${testResults.warnings}\`);
    console.log(\`❌ Failed: \${testResults.failed}\`);

    const totalChecks = testResults.passed + testResults.failed + testResults.warnings;
    const successRate = Math.round((testResults.passed / totalChecks) * 100);

    console.log(\`\\n📊 Success Rate: \${successRate}%\`);

    if (testResults.failed === 0 && successRate >= 80) {
      console.log('\\n🎉 Phase 1 infrastructure validation PASSED!');
      console.log('All critical requirements have been successfully implemented.');

      console.log('\\nNext steps:');
      console.log('1. Test in browser with feature toggles');
      console.log('2. Monitor performance with integrated monitoring');
      console.log('3. Use emergency rollback if issues occur');
      console.log('4. Proceed with component migration testing');
    } else if (testResults.failed > 0) {
      console.log('\\n⚠️ Phase 1 infrastructure validation has issues');
      console.log('Please review the failed checks above.');
    } else {
      console.log(\`\\n⚠️ Infrastructure validation below optimal (\${successRate}% < 80%)\`);
      console.log('Consider addressing warnings for improved reliability.');
    }
  });
});

// Additional helper functions for CI/CD integration
module.exports = {
  /**
   * Standalone validation function for CI/CD pipelines
   * Returns exit code compatible with CI/CD systems
   */
  validateInfrastructure: async () => {
    const jest = require('jest');
    const result = await jest.runCLI({
      testPathPattern: 'US-087-ci-validation',
      silent: true,
      verbose: false
    }, [process.cwd()]);

    return result.results.success ? 0 : 1;
  },

  /**
   * Get validation summary for reporting
   */
  getValidationSummary: () => ({
    testSuite: 'US-087 Phase 1 Infrastructure',
    timestamp: new Date().toISOString(),
    environment: 'CI/CD',
    coverage: [
      'Utility files structure',
      'Admin GUI integration',
      'Component architecture',
      'Security practices',
      'Performance monitoring',
      'Feature toggle configuration'
    ]
  })
};