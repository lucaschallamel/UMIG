/**
 * MockStatusProvider for JavaScript Test Isolation (TD-003 Phase 3)
 *
 * Provides controlled status values for test isolation while maintaining compatibility
 * with the production StatusProvider interface. This mock ensures tests remain reliable
 * and predictable while adapting to database-driven status configuration.
 *
 * Key Features:
 * - Controlled test values that don't change unexpectedly
 * - Compatible interface with production StatusProvider
 * - Support for both ID-based and name-based status lookup
 * - Validation methods to ensure test data integrity
 *
 * Migration Patterns Supported:
 * - Pattern 1: Replace hardcoded status strings in assertions
 * - Pattern 2: Replace status arrays in test data
 * - Pattern 3: Provide controlled test isolation
 *
 * Created: TD-003 Phase 3 JavaScript Test Migration
 * Usage: Import and use in test files instead of hardcoded status strings
 */

class MockStatusProvider {
  constructor() {
    // Test-controlled status mappings (stable for testing)
    // Matches production status values for consistency
    this.statusById = {
      1: {
        id: 1,
        name: "PENDING",
        type: "Step",
        color: "#FFA500",
        description: "Step is pending execution",
      },
      2: {
        id: 2,
        name: "IN_PROGRESS",
        type: "Step",
        color: "#007BFF",
        description: "Step is currently in progress",
      },
      3: {
        id: 3,
        name: "COMPLETED",
        type: "Step",
        color: "#28A745",
        description: "Step has been completed successfully",
      },
      4: {
        id: 4,
        name: "FAILED",
        type: "Step",
        color: "#DC3545",
        description: "Step execution failed",
      },
      5: {
        id: 5,
        name: "CANCELLED",
        type: "Step",
        color: "#6C757D",
        description: "Step execution was cancelled",
      },
      6: {
        id: 6,
        name: "BLOCKED",
        type: "Step",
        color: "#6C757D",
        description: "Step is blocked by dependencies",
      },
      7: {
        id: 7,
        name: "TODO",
        type: "Step",
        color: "#17A2B8",
        description: "Step is in todo state",
      },
    };

    this.statusByName = {
      PENDING: this.statusById[1],
      IN_PROGRESS: this.statusById[2],
      COMPLETED: this.statusById[3],
      FAILED: this.statusById[4],
      CANCELLED: this.statusById[5],
      BLOCKED: this.statusById[6],
      TODO: this.statusById[7],
    };

    // Track calls for test verification
    this.calls = [];
  }

  /**
   * Get all statuses for an entity type (Migration Pattern 1)
   * Compatible with production StatusProvider.getStatuses()
   */
  async getStatuses(entityType = "Step") {
    this.calls.push({ method: "getStatuses", entityType });

    if (entityType !== "Step") {
      return [];
    }

    return Object.values(this.statusById);
  }

  /**
   * Get status by ID (Migration Pattern 1)
   * Replaces hardcoded status checks
   */
  async getStatusById(statusId, entityType = "Step") {
    this.calls.push({ method: "getStatusById", statusId, entityType });

    if (entityType !== "Step") {
      return null;
    }

    return this.statusById[statusId] || null;
  }

  /**
   * Get status by name (Migration Pattern 2)
   * For tests that need to lookup status details by name
   */
  async getStatusByName(statusName, entityType = "Step") {
    this.calls.push({ method: "getStatusByName", statusName, entityType });

    if (entityType !== "Step" || !statusName) {
      return null;
    }

    return this.statusByName[statusName.toUpperCase()] || null;
  }

  /**
   * Get status name by ID (Migration Pattern 1 - simplified)
   * Direct replacement for hardcoded status strings
   */
  getStatusNameById(statusId) {
    const status = this.statusById[statusId];
    return status ? status.name : "UNKNOWN";
  }

  /**
   * Get default status for entity type (Migration Pattern 2)
   * Replaces hardcoded default status assignments
   */
  getDefaultStatus(entityType = "Step") {
    return "PENDING"; // Controlled test default
  }

  /**
   * Get all status names for testing (Migration Pattern 3)
   * Useful for comprehensive test coverage
   */
  getAllStatusNames(entityType = "Step") {
    if (entityType !== "Step") {
      return [];
    }
    return Object.keys(this.statusByName);
  }

  /**
   * Get all status IDs for testing
   */
  getAllStatusIds(entityType = "Step") {
    if (entityType !== "Step") {
      return [];
    }
    return Object.keys(this.statusById).map((id) => parseInt(id));
  }

  /**
   * Validate status exists (Migration Pattern 3)
   * Ensures test data uses valid status values
   */
  validateStatus(statusName, entityType = "Step") {
    if (!statusName || entityType !== "Step") {
      return false;
    }
    return this.statusByName.hasOwnProperty(statusName.toUpperCase());
  }

  /**
   * Validate status ID exists (Migration Pattern 3)
   */
  validateStatusId(statusId, entityType = "Step") {
    return this.statusById.hasOwnProperty(statusId);
  }

  /**
   * Controlled status transition testing
   * Provides predictable status progression for workflow testing
   */
  getNextStatus(currentStatus) {
    const transitions = {
      PENDING: "IN_PROGRESS",
      IN_PROGRESS: "COMPLETED",
      COMPLETED: "COMPLETED", // Terminal state
      FAILED: "PENDING", // Retry workflow
      BLOCKED: "PENDING", // Unblock workflow
      CANCELLED: "PENDING", // Restart workflow
      TODO: "IN_PROGRESS",
    };

    const upperStatus = currentStatus ? currentStatus.toUpperCase() : "";
    return transitions[upperStatus] || "PENDING";
  }

  /**
   * Check if status is terminal (cannot transition)
   */
  isTerminalStatus(statusName) {
    const terminal = ["COMPLETED", "CANCELLED"];
    return terminal.includes(statusName ? statusName.toUpperCase() : "");
  }

  /**
   * Get status display color for UI testing
   */
  getStatusColor(statusName) {
    const status =
      this.statusByName[statusName ? statusName.toUpperCase() : ""];
    return status ? status.color : "#6C757D";
  }

  /**
   * Reset mock state (for test cleanup)
   */
  reset() {
    this.calls = [];
  }

  /**
   * Get call history for test verification
   */
  getCallHistory() {
    return this.calls;
  }

  /**
   * Clear call history
   */
  clearCallHistory() {
    this.calls = [];
  }
}

// Export for use in tests
if (typeof module !== "undefined" && module.exports) {
  module.exports = MockStatusProvider;
}

// Also make available globally for browser tests
if (typeof window !== "undefined") {
  window.MockStatusProvider = MockStatusProvider;
}
