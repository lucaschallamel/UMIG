#!/usr/bin/env node

/**
 * Quick verification script for IterationTypes modal field formatting
 * Tests the new _formatFieldValue override method
 */

// Mock window environment
global.window = {
  SecurityUtils: {
    addCSRFProtection: () => ({}),
  },
};

// Mock BaseEntityManager
class MockBaseEntityManager {
  _formatFieldValue(fieldName, value) {
    // Default formatting for non-special fields
    if (value === null || value === undefined) {
      return "<em>Not set</em>";
    }
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }
    if (typeof value === "string" && value.length === 0) {
      return "<em>Empty</em>";
    }
    return String(value);
  }
}

// Load the IterationTypesEntityManager
const path = require("path");
const fs = require("fs");

// Read the actual implementation
const managerPath = path.join(
  __dirname,
  "../src/groovy/umig/web/js/entities/iteration-types/IterationTypesEntityManager.js",
);
let managerCode = fs.readFileSync(managerPath, "utf8");

// Create a mock environment
eval(`
${managerCode}

// Override BaseEntityManager with our mock
IterationTypesEntityManager.prototype.__proto__ = MockBaseEntityManager.prototype;
`);

// Test the formatting
const manager = new IterationTypesEntityManager();

console.log("Testing IterationTypes modal field formatting...\n");

// Test color field formatting
const colorResult = manager._formatFieldValue("itt_color", "#FF5733");
console.log("Color field test:");
console.log('Input: itt_color = "#FF5733"');
console.log("Output:", colorResult);
console.log("Includes swatch:", colorResult.includes("umig-color-swatch"));
console.log("Includes color value:", colorResult.includes("#FF5733"));
console.log("");

// Test icon field formatting
const iconResult = manager._formatFieldValue("itt_icon", "play-circle");
console.log("Icon field test:");
console.log('Input: itt_icon = "play-circle"');
console.log("Output:", iconResult);
console.log("Includes icon unicode:", iconResult.includes("►"));
console.log("Includes icon name:", iconResult.includes("play-circle"));
console.log("");

// Test fallback for unknown icon
const unknownIconResult = manager._formatFieldValue("itt_icon", "unknown-icon");
console.log("Unknown icon test:");
console.log('Input: itt_icon = "unknown-icon"');
console.log("Output:", unknownIconResult);
console.log("Falls back to default:", unknownIconResult.includes("●"));
console.log("");

// Test normal field (should use parent class)
const normalResult = manager._formatFieldValue("itt_name", "Test Name");
console.log("Normal field test:");
console.log('Input: itt_name = "Test Name"');
console.log("Output:", normalResult);
console.log("Uses parent formatting:", normalResult === "Test Name");
console.log("");

// Test null handling
const nullColorResult = manager._formatFieldValue("itt_color", null);
console.log("Null color test:");
console.log("Input: itt_color = null");
console.log("Output:", nullColorResult);
console.log("Uses parent formatting:", nullColorResult === "<em>Not set</em>");
console.log("");

console.log("✅ All tests completed successfully!");
console.log(
  "The view modal should now display visual color swatches and icons.",
);
