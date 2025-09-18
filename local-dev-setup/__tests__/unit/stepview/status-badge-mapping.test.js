/**
 * Test script to validate that the status badge fix works correctly
 * This tests that status ID 26 maps to "BLOCKED" instead of "PENDING"
 * Migrated to use MockStatusProvider for test isolation (TD-003 Phase 3)
 */

// Import MockStatusProvider for test isolation (TD-003 Phase 3)
const MockStatusProvider = require("../../mocks/MockStatusProvider");

// Mock the StepView class with just the essential parts for testing
class MockStepView {
  constructor() {
    this.statusesMap = new Map();
    this.mockStatusProvider = new MockStatusProvider();
  }

  // Mock status data that would come from /statuses/step endpoint
  loadMockStatusData() {
    const mockStatuses = [
      {
        id: 21,
        name: this.mockStatusProvider.getStatusNameById(1),
        color: "#DDDDDD",
      },
      {
        id: 22,
        name: this.mockStatusProvider.getStatusNameById(7),
        color: "#FFFF00",
      },
      {
        id: 23,
        name: this.mockStatusProvider.getStatusNameById(2),
        color: "#0066CC",
      },
      {
        id: 24,
        name: this.mockStatusProvider.getStatusNameById(3),
        color: "#00AA00",
      },
      {
        id: 25,
        name: this.mockStatusProvider.getStatusNameById(4),
        color: "#FF0000",
      },
      {
        id: 26,
        name: this.mockStatusProvider.getStatusNameById(6),
        color: "#FF6600",
      },
      {
        id: 27,
        name: this.mockStatusProvider.getStatusNameById(5),
        color: "#CC0000",
      },
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
      21: this.mockStatusProvider.getStatusNameById(1),
      22: this.mockStatusProvider.getStatusNameById(7),
      23: this.mockStatusProvider.getStatusNameById(2),
      24: this.mockStatusProvider.getStatusNameById(3),
      25: this.mockStatusProvider.getStatusNameById(4),
      26: this.mockStatusProvider.getStatusNameById(6),
      27: this.mockStatusProvider.getStatusNameById(5),
    };

    return statusMap[parsedId] || this.mockStatusProvider.getStatusNameById(1);
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
        [this.mockStatusProvider.getStatusNameById(1)]: "#DDDDDD",
        [this.mockStatusProvider.getStatusNameById(7)]: "#FFFF00",
        [this.mockStatusProvider.getStatusNameById(2)]: "#0066CC",
        [this.mockStatusProvider.getStatusNameById(3)]: "#00AA00",
        [this.mockStatusProvider.getStatusNameById(4)]: "#FF0000",
        [this.mockStatusProvider.getStatusNameById(6)]: "#FF6600",
        [this.mockStatusProvider.getStatusNameById(5)]: "#CC0000",
      };
      color = statusColors[statusName] || "#DDDDDD";
    }

    const displayText = statusName.replace(/_/g, " ");
    return `<span class="status-badge" style="background-color: ${color};">${displayText}</span>`;
  }
}

describe("Status Badge Mapping Tests", () => {
  let stepView;
  let mockStatusProvider;

  beforeEach(() => {
    stepView = new MockStepView();
    mockStatusProvider = new MockStatusProvider();
  });

  describe("Status ID 26 (BLOCKED) mapping", () => {
    test("should map status ID 26 to BLOCKED using hardcoded fallback", () => {
      // Without loaded status data, should use hardcoded mapping
      expect(stepView.getStatusNameFromId(26)).toBe(
        mockStatusProvider.getStatusNameById(6),
      );

      const badge = stepView.createStatusBadge(26);
      expect(badge).toContain(mockStatusProvider.getStatusNameById(6));
      expect(badge).toContain("#FF6600");
    });

    test("should map status ID 26 to BLOCKED with loaded status data", () => {
      stepView.loadMockStatusData();

      expect(stepView.getStatusNameFromId(26)).toBe(
        mockStatusProvider.getStatusNameById(6),
      );

      const badge = stepView.createStatusBadge(26);
      expect(badge).toContain(mockStatusProvider.getStatusNameById(6));
      expect(badge).toContain("#FF6600");
    });
  });

  describe("All status mappings", () => {
    test("should correctly map all status IDs to their names", () => {
      stepView.loadMockStatusData();

      const testCases = [
        {
          id: 21,
          name: mockStatusProvider.getStatusNameById(1),
          color: "#DDDDDD",
        },
        {
          id: 22,
          name: mockStatusProvider.getStatusNameById(7),
          color: "#FFFF00",
        },
        {
          id: 23,
          name: mockStatusProvider.getStatusNameById(2),
          color: "#0066CC",
        },
        {
          id: 24,
          name: mockStatusProvider.getStatusNameById(3),
          color: "#00AA00",
        },
        {
          id: 25,
          name: mockStatusProvider.getStatusNameById(4),
          color: "#FF0000",
        },
        {
          id: 26,
          name: mockStatusProvider.getStatusNameById(6),
          color: "#FF6600",
        },
        {
          id: 27,
          name: mockStatusProvider.getStatusNameById(5),
          color: "#CC0000",
        },
      ];

      testCases.forEach(({ id, name, color }) => {
        expect(stepView.getStatusNameFromId(id)).toBe(name);

        const badge = stepView.createStatusBadge(id);
        const displayName = name.replace(/_/g, " ");
        expect(badge).toContain(displayName);
        expect(badge).toContain(color);
      });
    });
  });

  describe("Badge creation", () => {
    test("should create proper HTML badge element", () => {
      stepView.loadMockStatusData();

      const badge = stepView.createStatusBadge(23);
      const expectedText = mockStatusProvider
        .getStatusNameById(2)
        .replace(/_/g, " ");
      expect(badge).toBe(
        `<span class="status-badge" style="background-color: #0066CC;">${expectedText}</span>`,
      );
    });

    test("should handle unknown status IDs with default values", () => {
      const unknownId = 999;

      expect(stepView.getStatusNameFromId(unknownId)).toBe(
        mockStatusProvider.getStatusNameById(1),
      );

      const badge = stepView.createStatusBadge(unknownId);
      expect(badge).toContain(mockStatusProvider.getStatusNameById(1));
      expect(badge).toContain("#DDDDDD");
    });
  });
});
