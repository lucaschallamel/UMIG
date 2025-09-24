#!/usr/bin/env node

/**
 * Color Picker Component Debug Test
 * Tests the ColorPickerComponent and investigates style attribute issues
 */

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log("=== Color Picker Component Debug Test ===\n");

// Check if ColorPickerComponent exists
const colorPickerPath = path.join(
  __dirname,
  "../../src/groovy/umig/web/js/components/ColorPickerComponent.js",
);
const securityUtilsPath = path.join(
  __dirname,
  "../../src/groovy/umig/web/js/components/SecurityUtils.js",
);

console.log("1. File existence check:");
console.log(
  `   ColorPickerComponent: ${fs.existsSync(colorPickerPath) ? "✅ EXISTS" : "❌ MISSING"}`,
);
console.log(
  `   SecurityUtils: ${fs.existsSync(securityUtilsPath) ? "✅ EXISTS" : "❌ MISSING"}`,
);

// Check if debugging was added
console.log("\n2. Debug logging check:");
if (fs.existsSync(colorPickerPath)) {
  const content = fs.readFileSync(colorPickerPath, "utf8");

  const hasHTMLLogging = content.includes(
    "Generated HTML (before SecurityUtils)",
  );
  const hasSwatchLogging = content.includes("Testing CSS validation");
  const hasFallbackLogging = content.includes("Manually applying color");

  console.log(
    `   HTML generation logging: ${hasHTMLLogging ? "✅ ADDED" : "❌ MISSING"}`,
  );
  console.log(
    `   CSS validation testing: ${hasSwatchLogging ? "✅ ADDED" : "❌ MISSING"}`,
  );
  console.log(
    `   Fallback style application: ${hasFallbackLogging ? "✅ ADDED" : "❌ MISSING"}`,
  );
}

// Check SecurityUtils CSS validation patterns
console.log("\n3. SecurityUtils CSS patterns check:");
if (fs.existsSync(securityUtilsPath)) {
  const content = fs.readFileSync(securityUtilsPath, "utf8");

  const hasBackgroundColorPattern = content.includes(
    "background-color\\s*:\\s*#[0-9a-fA-F]{6}",
  );
  const hasSanitizeForCSS = content.includes("sanitizeForCSS");
  const hasPatternValidation = content.includes("allowedPatterns.some");

  console.log(
    `   Background color pattern: ${hasBackgroundColorPattern ? "✅ FOUND" : "❌ MISSING"}`,
  );
  console.log(
    `   CSS sanitization method: ${hasSanitizeForCSS ? "✅ FOUND" : "❌ MISSING"}`,
  );
  console.log(
    `   Pattern validation logic: ${hasPatternValidation ? "✅ FOUND" : "❌ MISSING"}`,
  );
}

console.log("\n4. Expected behavior:");
console.log("   - ColorPickerComponent should log detailed debugging info");
console.log(
  "   - SecurityUtils may strip style attributes due to strict validation",
);
console.log(
  "   - Fallback logic should manually apply backgroundColor via DOM manipulation",
);
console.log("   - All 24 color swatches should display with proper colors");

console.log("\n5. To test in browser:");
console.log("   1. Open browser dev tools console");
console.log("   2. Navigate to a page with ColorPickerComponent");
console.log("   3. Look for [ColorPickerComponent] debug logs");
console.log("   4. Check if fallback style application is triggered");
console.log("   5. Inspect color swatch elements for style attributes");

console.log("\n6. Expected fix outcome:");
console.log("   ✅ Color swatches should display background colors");
console.log("   ✅ Visual color selection should work properly");
console.log("   ✅ SecurityUtils integration should be maintained");
console.log(
  "   ✅ Fallback ensures colors display even if styles are stripped",
);

console.log("\n=== Debug Test Complete ===");
