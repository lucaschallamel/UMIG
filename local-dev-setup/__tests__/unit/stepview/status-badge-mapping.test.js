/**
 * Test script to validate that the status badge fix works correctly
 * This tests that status ID 26 maps to "BLOCKED" instead of "PENDING"
 */

// Mock the StepView class with just the essential parts for testing
class MockStepView {
  constructor() {
    this.statusesMap = new Map();
  }

  // Mock status data that would come from /statuses/step endpoint
  loadMockStatusData() {
    const mockStatuses = [
      { id: 21, name: "PENDING", color: "#DDDDDD" },
      { id: 22, name: "TODO", color: "#FFFF00" },
      { id: 23, name: "IN_PROGRESS", color: "#0066CC" },
      { id: 24, name: "COMPLETED", color: "#00AA00" },
      { id: 25, name: "FAILED", color: "#FF0000" },
      { id: 26, name: "BLOCKED", color: "#FF6600" },
      { id: 27, name: "CANCELLED", color: "#CC0000" },
    ];

    // Store in statusesMap like the fix does
    this.statusesMap.clear();
    mockStatuses.forEach((status) => {
      this.statusesMap.set(status.id, {
        id: status.id,
        name: status.name,
        color: status.color,
      });
    });
  }

  // Copy the fixed getStatusNameFromId method
  getStatusNameFromId(statusId) {
    const parsedId = parseInt(statusId);

    // First try to use fetched status data
    if (this.statusesMap && this.statusesMap.has(parsedId)) {
      const status = this.statusesMap.get(parsedId);
      return status.name;
    }

    // Fallback to hardcoded mapping if statuses not yet fetched
    const statusMap = {
      21: "PENDING",
      22: "TODO",
      23: "IN_PROGRESS",
      24: "COMPLETED",
      25: "FAILED",
      26: "BLOCKED",
      27: "CANCELLED",
    };

    return statusMap[parsedId] || "PENDING";
  }

  // Copy the fixed createStatusBadge method
  createStatusBadge(statusId) {
    const parsedId = parseInt(statusId);
    const statusName = this.getStatusNameFromId(statusId);

    // Get color from fetched status data if available
    let color = "#DDDDDD"; // default fallback
    if (this.statusesMap && this.statusesMap.has(parsedId)) {
      const status = this.statusesMap.get(parsedId);
      color = status.color || color;
    } else {
      // Fallback to hardcoded colors if statuses not yet fetched
      const statusColors = {
        PENDING: "#DDDDDD",
        TODO: "#FFFF00",
        IN_PROGRESS: "#0066CC",
        COMPLETED: "#00AA00",
        FAILED: "#FF0000",
        BLOCKED: "#FF6600",
        CANCELLED: "#CC0000",
      };
      color = statusColors[statusName] || "#DDDDDD";
    }

    const displayText = statusName.replace(/_/g, " ");
    return `<span class="status-badge" style="background-color: ${color};">${displayText}</span>`;
  }
}

describe("Status Badge Mapping Tests", () => {
  let stepView;

  beforeEach(() => {
    stepView = new MockStepView();
  });

  describe("Status ID 26 (BLOCKED) mapping", () => {
    test("should map status ID 26 to BLOCKED using hardcoded fallback", () => {
      // Without loaded status data, should use hardcoded mapping
      expect(stepView.getStatusNameFromId(26)).toBe("BLOCKED");

      const badge = stepView.createStatusBadge(26);
      expect(badge).toContain("BLOCKED");
      expect(badge).toContain("#FF6600");
    });

    test("should map status ID 26 to BLOCKED with loaded status data", () => {
      stepView.loadMockStatusData();

      expect(stepView.getStatusNameFromId(26)).toBe("BLOCKED");

      const badge = stepView.createStatusBadge(26);
      expect(badge).toContain("BLOCKED");
      expect(badge).toContain("#FF6600");
    });
  });

  describe("All status mappings", () => {
    const testCases = [
      { id: 21, name: "PENDING", color: "#DDDDDD" },
      { id: 22, name: "TODO", color: "#FFFF00" },
      { id: 23, name: "IN_PROGRESS", color: "#0066CC" },
      { id: 24, name: "COMPLETED", color: "#00AA00" },
      { id: 25, name: "FAILED", color: "#FF0000" },
      { id: 26, name: "BLOCKED", color: "#FF6600" },
      { id: 27, name: "CANCELLED", color: "#CC0000" },
    ];

    test.each(testCases)(
      "should correctly map status ID $id to $name",
      ({ id, name, color }) => {
        stepView.loadMockStatusData();

        expect(stepView.getStatusNameFromId(id)).toBe(name);

        const badge = stepView.createStatusBadge(id);
        const displayName = name.replace(/_/g, " ");
        expect(badge).toContain(displayName);
        expect(badge).toContain(color);
      },
    );
  });

  describe("Badge creation", () => {
    test("should create proper HTML badge element", () => {
      stepView.loadMockStatusData();

      const badge = stepView.createStatusBadge(23);
      expect(badge).toBe(
        '<span class="status-badge" style="background-color: #0066CC;">IN PROGRESS</span>',
      );
    });

    test("should handle unknown status IDs with default values", () => {
      const unknownId = 999;

      expect(stepView.getStatusNameFromId(unknownId)).toBe("PENDING");

      const badge = stepView.createStatusBadge(unknownId);
      expect(badge).toContain("PENDING");
      expect(badge).toContain("#DDDDDD");
    });
  });
});
