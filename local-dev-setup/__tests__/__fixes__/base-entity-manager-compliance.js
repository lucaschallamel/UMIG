/**
 * TD-005 Phase 2: BaseEntityManager Interface Compliance Validation
 *
 * This module provides comprehensive validation for BaseEntityManager interface
 * compliance following TD-004 interface fixes. Ensures all entity managers
 * adhere to the updated interface contract and lifecycle management requirements.
 *
 * POST-TD-004 INTERFACE REQUIREMENTS:
 * - Standard lifecycle methods (initialize, mount, render, update, unmount, destroy)
 * - Consistent error handling patterns
 * - Memory management compliance
 * - State management validation
 * - Cross-component communication protocols
 *
 * @version 2.0 (TD-005 Phase 2)
 * @author gendev-test-suite-generator
 * @priority High (Component Architecture Validation)
 */

export class BaseEntityManagerComplianceValidator {
  constructor() {
    this.validationResults = [];
    this.complianceMetrics = {
      totalManagers: 0,
      compliantManagers: 0,
      violationCount: 0,
      criticalViolations: 0,
    };
    this.interfaceRequirements = this.defineInterfaceRequirements();
  }

  /**
   * Define TD-004 interface requirements
   * Based on BaseEntityManager interface updates
   */
  defineInterfaceRequirements() {
    return {
      // Core lifecycle methods (mandatory)
      lifecycleMethods: {
        required: [
          "initialize",
          "mount",
          "render",
          "update",
          "unmount",
          "destroy",
        ],
        signatures: {
          initialize: { params: ["options"], returns: "Promise", async: true },
          mount: { params: ["container"], returns: "Promise", async: true },
          render: { params: [], returns: "Promise", async: true },
          update: { params: ["data"], returns: "Promise", async: true },
          unmount: { params: [], returns: "Promise", async: true },
          destroy: { params: [], returns: "Promise", async: true },
        },
      },

      // Core properties (mandatory)
      properties: {
        required: [
          "id",
          "state",
          "mounted",
          "initialized",
          "container",
          "options",
        ],
        types: {
          id: "string",
          state: "object",
          mounted: "boolean",
          initialized: "boolean",
          container: ["object", "null"],
          options: "object",
        },
      },

      // State management requirements
      stateManagement: {
        initialState: [
          "uninitialized",
          "initializing",
          "initialized",
          "mounting",
          "mounted",
          "rendering",
          "updating",
          "unmounting",
          "destroyed",
        ],
        transitions: [
          "uninitialized -> initializing",
          "initializing -> initialized",
          "initialized -> mounting",
          "mounting -> mounted",
          "mounted -> rendering",
          "rendering -> mounted",
          "mounted -> updating",
          "updating -> mounted",
          "mounted -> unmounting",
          "unmounting -> destroyed",
        ],
      },

      // Error handling requirements
      errorHandling: {
        methods: ["handleError", "logError", "recoverFromError"],
        errorTypes: [
          "ValidationError",
          "StateError",
          "NetworkError",
          "ComponentError",
        ],
      },

      // Memory management requirements
      memoryManagement: {
        cleanup: ["clearEventListeners", "clearTimers", "clearReferences"],
        validation: ["validateMemoryUsage", "checkForLeaks"],
      },
    };
  }

  /**
   * Validate single entity manager against interface requirements
   */
  async validateEntityManager(managerClass, managerName) {
    const validation = {
      name: managerName,
      className: managerClass.name,
      timestamp: new Date().toISOString(),
      violations: [],
      warnings: [],
      compliance: {
        lifecycle: false,
        properties: false,
        stateManagement: false,
        errorHandling: false,
        memoryManagement: false,
      },
      score: 0,
    };

    try {
      console.log(`🔍 Validating ${managerName} compliance...`);

      // Create instance for testing
      const instance = new managerClass();

      // 1. Validate lifecycle methods
      await this.validateLifecycleMethods(instance, validation);

      // 2. Validate required properties
      this.validateRequiredProperties(instance, validation);

      // 3. Validate state management
      await this.validateStateManagement(instance, validation);

      // 4. Validate error handling
      this.validateErrorHandling(instance, validation);

      // 5. Validate memory management
      this.validateMemoryManagement(instance, validation);

      // Calculate compliance score
      this.calculateComplianceScore(validation);

      // Clean up test instance
      if (typeof instance.destroy === "function") {
        await instance.destroy();
      }
    } catch (error) {
      validation.violations.push({
        type: "CRITICAL",
        category: "instantiation",
        message: `Failed to instantiate ${managerName}: ${error.message}`,
        requirement: "constructorValidity",
      });
    }

    this.validationResults.push(validation);
    return validation;
  }

  /**
   * Validate lifecycle methods compliance
   */
  async validateLifecycleMethods(instance, validation) {
    const { required, signatures } =
      this.interfaceRequirements.lifecycleMethods;
    let compliantMethods = 0;

    for (const methodName of required) {
      try {
        // Check method exists
        if (typeof instance[methodName] !== "function") {
          validation.violations.push({
            type: "CRITICAL",
            category: "lifecycle",
            message: `Missing required lifecycle method: ${methodName}`,
            requirement: "lifecycleMethods.required",
          });
          continue;
        }

        // Check method signature
        const signature = signatures[methodName];
        if (signature) {
          const methodStr = instance[methodName].toString();

          // Check async requirement
          if (signature.async && !methodStr.includes("async")) {
            validation.warnings.push({
              type: "WARNING",
              category: "lifecycle",
              message: `Method ${methodName} should be async`,
              requirement: "lifecycleMethods.signatures.async",
            });
          }

          // Check parameter count (basic validation)
          const paramMatch = methodStr.match(/\(([^)]*)\)/);
          if (paramMatch) {
            const params = paramMatch[1].split(",").filter((p) => p.trim());
            const expectedParams = signature.params || [];

            if (params.length !== expectedParams.length) {
              validation.warnings.push({
                type: "WARNING",
                category: "lifecycle",
                message: `Method ${methodName} parameter count mismatch. Expected: ${expectedParams.length}, Found: ${params.length}`,
                requirement: "lifecycleMethods.signatures.params",
              });
            }
          }
        }

        compliantMethods++;
      } catch (error) {
        validation.violations.push({
          type: "ERROR",
          category: "lifecycle",
          message: `Error validating lifecycle method ${methodName}: ${error.message}`,
          requirement: "lifecycleMethods.validation",
        });
      }
    }

    validation.compliance.lifecycle = compliantMethods === required.length;
    console.log(
      `  ✓ Lifecycle methods: ${compliantMethods}/${required.length} compliant`,
    );
  }

  /**
   * Validate required properties compliance
   */
  validateRequiredProperties(instance, validation) {
    const { required, types } = this.interfaceRequirements.properties;
    let compliantProperties = 0;

    for (const propName of required) {
      try {
        // Check property exists
        if (!(propName in instance)) {
          validation.violations.push({
            type: "CRITICAL",
            category: "properties",
            message: `Missing required property: ${propName}`,
            requirement: "properties.required",
          });
          continue;
        }

        // Check property type
        const expectedType = types[propName];
        const actualType = typeof instance[propName];

        if (Array.isArray(expectedType)) {
          // Multiple valid types
          if (!expectedType.includes(actualType)) {
            validation.violations.push({
              type: "ERROR",
              category: "properties",
              message: `Property ${propName} type mismatch. Expected: ${expectedType.join(" | ")}, Found: ${actualType}`,
              requirement: "properties.types",
            });
            continue;
          }
        } else {
          // Single expected type
          if (actualType !== expectedType) {
            validation.violations.push({
              type: "ERROR",
              category: "properties",
              message: `Property ${propName} type mismatch. Expected: ${expectedType}, Found: ${actualType}`,
              requirement: "properties.types",
            });
            continue;
          }
        }

        compliantProperties++;
      } catch (error) {
        validation.violations.push({
          type: "ERROR",
          category: "properties",
          message: `Error validating property ${propName}: ${error.message}`,
          requirement: "properties.validation",
        });
      }
    }

    validation.compliance.properties = compliantProperties === required.length;
    console.log(
      `  ✓ Properties: ${compliantProperties}/${required.length} compliant`,
    );
  }

  /**
   * Validate state management compliance
   */
  async validateStateManagement(instance, validation) {
    try {
      // Check initial state
      if (!instance.state || typeof instance.state !== "object") {
        validation.violations.push({
          type: "CRITICAL",
          category: "stateManagement",
          message: "Missing or invalid state object",
          requirement: "stateManagement.state",
        });
        validation.compliance.stateManagement = false;
        return;
      }

      // Check state has required fields
      const requiredStateFields = ["current", "previous", "data"];
      let stateCompliance = true;

      for (const field of requiredStateFields) {
        if (!(field in instance.state)) {
          validation.warnings.push({
            type: "WARNING",
            category: "stateManagement",
            message: `State missing recommended field: ${field}`,
            requirement: "stateManagement.fields",
          });
          stateCompliance = false;
        }
      }

      // Test state transitions if lifecycle methods are available
      if (typeof instance.initialize === "function") {
        try {
          const initialState = instance.state.current;
          await instance.initialize({});
          const postInitState = instance.state.current;

          if (initialState === postInitState) {
            validation.warnings.push({
              type: "WARNING",
              category: "stateManagement",
              message: "State did not change after initialization",
              requirement: "stateManagement.transitions",
            });
          }
        } catch (error) {
          validation.violations.push({
            type: "ERROR",
            category: "stateManagement",
            message: `State transition validation failed: ${error.message}`,
            requirement: "stateManagement.testing",
          });
          stateCompliance = false;
        }
      }

      validation.compliance.stateManagement = stateCompliance;
      console.log(
        `  ✓ State management: ${stateCompliance ? "Compliant" : "Non-compliant"}`,
      );
    } catch (error) {
      validation.violations.push({
        type: "ERROR",
        category: "stateManagement",
        message: `State management validation error: ${error.message}`,
        requirement: "stateManagement.validation",
      });
      validation.compliance.stateManagement = false;
    }
  }

  /**
   * Validate error handling compliance
   */
  validateErrorHandling(instance, validation) {
    const { methods } = this.interfaceRequirements.errorHandling;
    let errorHandlingCompliance = true;

    for (const methodName of methods) {
      if (typeof instance[methodName] !== "function") {
        validation.warnings.push({
          type: "WARNING",
          category: "errorHandling",
          message: `Missing recommended error handling method: ${methodName}`,
          requirement: "errorHandling.methods",
        });
        errorHandlingCompliance = false;
      }
    }

    // Check for try-catch patterns in critical methods
    const criticalMethods = ["initialize", "mount", "render", "update"];
    for (const methodName of criticalMethods) {
      if (typeof instance[methodName] === "function") {
        const methodStr = instance[methodName].toString();
        if (!methodStr.includes("try") || !methodStr.includes("catch")) {
          validation.warnings.push({
            type: "WARNING",
            category: "errorHandling",
            message: `Method ${methodName} lacks try-catch error handling`,
            requirement: "errorHandling.patterns",
          });
        }
      }
    }

    validation.compliance.errorHandling = errorHandlingCompliance;
    console.log(
      `  ✓ Error handling: ${errorHandlingCompliance ? "Compliant" : "Needs improvement"}`,
    );
  }

  /**
   * Validate memory management compliance
   */
  validateMemoryManagement(instance, validation) {
    const { cleanup } = this.interfaceRequirements.memoryManagement;
    let memoryCompliance = true;

    // Check for cleanup methods
    for (const methodName of cleanup) {
      if (typeof instance[methodName] !== "function") {
        validation.warnings.push({
          type: "WARNING",
          category: "memoryManagement",
          message: `Missing recommended memory management method: ${methodName}`,
          requirement: "memoryManagement.cleanup",
        });
        memoryCompliance = false;
      }
    }

    // Check destroy method for proper cleanup
    if (typeof instance.destroy === "function") {
      const destroyStr = instance.destroy.toString();
      const cleanupPatterns = [
        "null",
        "delete",
        "clear",
        "removeEventListener",
      ];
      const hasCleanupPatterns = cleanupPatterns.some((pattern) =>
        destroyStr.includes(pattern),
      );

      if (!hasCleanupPatterns) {
        validation.warnings.push({
          type: "WARNING",
          category: "memoryManagement",
          message: "Destroy method lacks proper cleanup patterns",
          requirement: "memoryManagement.destroy",
        });
        memoryCompliance = false;
      }
    }

    validation.compliance.memoryManagement = memoryCompliance;
    console.log(
      `  ✓ Memory management: ${memoryCompliance ? "Compliant" : "Needs improvement"}`,
    );
  }

  /**
   * Calculate overall compliance score
   */
  calculateComplianceScore(validation) {
    const weights = {
      lifecycle: 0.3,
      properties: 0.25,
      stateManagement: 0.2,
      errorHandling: 0.15,
      memoryManagement: 0.1,
    };

    let score = 0;
    Object.keys(weights).forEach((category) => {
      if (validation.compliance[category]) {
        score += weights[category] * 100;
      }
    });

    // Deduct points for violations
    const violationPenalty =
      validation.violations.filter((v) => v.type === "CRITICAL").length * 10;
    score = Math.max(0, score - violationPenalty);

    validation.score = Math.round(score);

    // Update metrics
    this.complianceMetrics.totalManagers++;
    if (score >= 80) {
      this.complianceMetrics.compliantManagers++;
    }
    this.complianceMetrics.violationCount += validation.violations.length;
    this.complianceMetrics.criticalViolations += validation.violations.filter(
      (v) => v.type === "CRITICAL",
    ).length;
  }

  /**
   * Validate all entity managers in the system
   */
  async validateAllEntityManagers(entityManagers = {}) {
    console.log(
      "🚀 Starting comprehensive BaseEntityManager compliance validation...",
    );

    // Try to use real entity managers from the actual project
    let managersToValidate = entityManagers;

    // If no managers provided, try to load the actual BaseEntityManager and test it directly
    if (Object.keys(managersToValidate).length === 0) {
      try {
        // Try to import the real BaseEntityManager
        let BaseEntityManagerClass;

        // Check if BaseEntityManager is available globally (browser environment)
        if (typeof window !== "undefined" && window.BaseEntityManager) {
          BaseEntityManagerClass = window.BaseEntityManager;
          console.log("✅ Using real BaseEntityManager from window global");
        }
        // Check if it's available as a Node.js module
        else if (typeof require !== "undefined") {
          try {
            BaseEntityManagerClass = require("/Users/lucaschallamel/Documents/GitHub/UMIG/src/groovy/umig/web/js/entities/BaseEntityManager.js");
            console.log("✅ Using real BaseEntityManager from Node.js require");
          } catch (requireError) {
            console.warn(
              "❌ Could not require BaseEntityManager:",
              requireError.message,
            );
          }
        }

        if (BaseEntityManagerClass) {
          managersToValidate = {
            BaseEntityManager: BaseEntityManagerClass,
          };
          console.log(
            "✅ Using actual BaseEntityManager for compliance validation",
          );
        } else {
          throw new Error("BaseEntityManager not available");
        }
      } catch (error) {
        console.warn(
          "⚠️ Could not load real BaseEntityManager, falling back to mock managers:",
          error.message,
        );

        // Fallback to mock entity managers for testing
        managersToValidate = {
          TeamsEntityManager: MockTeamsEntityManager,
          UsersEntityManager: MockUsersEntityManager,
          EnvironmentsEntityManager: MockEnvironmentsEntityManager,
          ApplicationsEntityManager: MockApplicationsEntityManager,
          LabelsEntityManager: MockLabelsEntityManager,
        };
        console.log("⚠️ Using mock entity managers for compliance validation");
      }
    }

    for (const [name, managerClass] of Object.entries(managersToValidate)) {
      await this.validateEntityManager(managerClass, name);
    }

    return this.generateComplianceReport();
  }

  /**
   * Generate comprehensive compliance report
   */
  generateComplianceReport() {
    const report = {
      summary: {
        totalManagers: this.complianceMetrics.totalManagers,
        compliantManagers: this.complianceMetrics.compliantManagers,
        compliancePercentage:
          this.complianceMetrics.totalManagers > 0
            ? Math.round(
                (this.complianceMetrics.compliantManagers /
                  this.complianceMetrics.totalManagers) *
                  100,
              )
            : 0,
        totalViolations: this.complianceMetrics.violationCount,
        criticalViolations: this.complianceMetrics.criticalViolations,
      },
      detailed: this.validationResults,
      recommendations: this.generateRecommendations(),
      us087Readiness: this.assessUS087Readiness(),
      timestamp: new Date().toISOString(),
    };

    console.log("📊 Compliance Report Generated:");
    console.log(
      `  ✅ Compliant Managers: ${report.summary.compliantManagers}/${report.summary.totalManagers} (${report.summary.compliancePercentage}%)`,
    );
    console.log(
      `  ⚠️ Total Violations: ${report.summary.totalViolations} (${report.summary.criticalViolations} critical)`,
    );
    console.log(
      `  🎯 US-087 Phase 2 Readiness: ${report.us087Readiness.ready ? "READY" : "NOT READY"}`,
    );

    return report;
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    // Analyze common violation patterns
    const violationsByType = {};
    this.validationResults.forEach((result) => {
      result.violations.forEach((violation) => {
        const key = `${violation.category}.${violation.requirement}`;
        violationsByType[key] = (violationsByType[key] || 0) + 1;
      });
    });

    // Generate recommendations based on patterns
    Object.entries(violationsByType).forEach(([violationType, count]) => {
      if (count >= 2) {
        recommendations.push({
          priority: "HIGH",
          type: violationType,
          description: `Multiple managers have ${violationType} violations (${count} instances)`,
          action: `Review and standardize ${violationType} implementation across all entity managers`,
        });
      }
    });

    return recommendations;
  }

  /**
   * Assess readiness for US-087 Phase 2
   */
  assessUS087Readiness() {
    const readinessThreshold = 80; // 80% compliance required
    const compliancePercentage =
      this.complianceMetrics.totalManagers > 0
        ? (this.complianceMetrics.compliantManagers /
            this.complianceMetrics.totalManagers) *
          100
        : 0;

    const criticalViolationsAcceptable =
      this.complianceMetrics.criticalViolations === 0;
    const complianceAcceptable = compliancePercentage >= readinessThreshold;

    return {
      ready: criticalViolationsAcceptable && complianceAcceptable,
      compliancePercentage,
      criticalViolations: this.complianceMetrics.criticalViolations,
      requirements: {
        minCompliance: readinessThreshold,
        maxCriticalViolations: 0,
      },
      blockers: [
        ...(complianceAcceptable
          ? []
          : [
              `Compliance below threshold: ${compliancePercentage}% < ${readinessThreshold}%`,
            ]),
        ...(criticalViolationsAcceptable
          ? []
          : [
              `Critical violations present: ${this.complianceMetrics.criticalViolations}`,
            ]),
      ],
    };
  }
}

// Mock entity managers for testing (real ones would be imported)
class MockTeamsEntityManager {
  constructor() {
    this.id = "teams-manager";
    this.state = { current: "uninitialized", previous: null, data: {} };
    this.mounted = false;
    this.initialized = false;
    this.container = null;
    this.options = {};
  }

  async initialize(options) {
    this.initialized = true;
    this.options = options;
  }
  async mount(container) {
    this.mounted = true;
    this.container = container;
  }
  async render() {
    return "<div>Teams</div>";
  }
  async update(data) {
    this.state.data = data;
  }
  async unmount() {
    this.mounted = false;
  }
  async destroy() {
    this.container = null;
    this.state = null;
    this.options = null;
  }

  handleError(error) {
    console.error("Teams error:", error);
  }
  clearEventListeners() {
    /* cleanup */
  }
}

class MockUsersEntityManager extends MockTeamsEntityManager {
  constructor() {
    super();
    this.id = "users-manager";
  }
}

class MockEnvironmentsEntityManager extends MockTeamsEntityManager {
  constructor() {
    super();
    this.id = "environments-manager";
  }
}

class MockApplicationsEntityManager extends MockTeamsEntityManager {
  constructor() {
    super();
    this.id = "applications-manager";
  }
}

class MockLabelsEntityManager extends MockTeamsEntityManager {
  constructor() {
    super();
    this.id = "labels-manager";
  }
}

// Global instance
export const complianceValidator = new BaseEntityManagerComplianceValidator();

// Helper functions
export async function validateEntityManagerCompliance(entityManagers) {
  return complianceValidator.validateAllEntityManagers(entityManagers);
}

export function getComplianceReport() {
  return complianceValidator.generateComplianceReport();
}

// Export default
export default BaseEntityManagerComplianceValidator;
