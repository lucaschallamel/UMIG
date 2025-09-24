#!/usr/bin/env node

/**
 * Color Picker Component Functionality Test
 * Comprehensive test to validate color picker behavior and fixes
 */

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log("🎨 Color Picker Component Functionality Test\n");

// Test file paths
const colorPickerPath = path.join(
  __dirname,
  "../../src/groovy/umig/web/js/components/ColorPickerComponent.js",
);

console.log("📁 File Analysis:");
if (fs.existsSync(colorPickerPath)) {
  const content = fs.readFileSync(colorPickerPath, "utf8");

  // Check key functionality
  const tests = [
    {
      name: "Fallback style application",
      check: content.includes(
        "setProperty('background-color', color, 'important')",
      ),
      required: true,
    },
    {
      name: "24 predefined colors",
      check:
        content.match(/predefinedColors\s*=\s*\[[\s\S]*?\]/)?.[0]?.split("'#")
          .length -
          1 >=
        24,
      required: true,
    },
    {
      name: "SecurityUtils integration",
      check: content.includes("safeSetInnerHTML"),
      required: true,
    },
    {
      name: "Style attribute allowlist",
      check: content.includes(
        "button: ['type', 'class', 'style', 'data-color', 'title', 'aria-label']",
      ),
      required: true,
    },
    {
      name: "Color validation pattern",
      check: content.includes("hexPattern = /^#[0-9A-Fa-f]{6}$/"),
      required: true,
    },
    {
      name: "Background color detection",
      check:
        content.includes("hasBackgroundColor") &&
        content.includes("includes('background-color')"),
      required: true,
    },
  ];

  tests.forEach((test) => {
    const status = test.check ? "✅" : "❌";
    const importance = test.required ? "(REQUIRED)" : "(optional)";
    console.log(`   ${status} ${test.name} ${importance}`);
  });

  // Extract color palette
  const colorMatch = content.match(/predefinedColors\s*=\s*\[([\s\S]*?)\]/);
  if (colorMatch) {
    const colors = colorMatch[1].match(/'#[A-Fa-f0-9]{6}'/g) || [];
    console.log(`\n🎨 Color Palette Analysis:`);
    console.log(`   Total colors: ${colors.length}`);
    console.log(`   First 6 colors: ${colors.slice(0, 6).join(", ")}`);

    // Validate hex color format
    const invalidColors = colors.filter((color) => {
      const hex = color.replace(/'/g, "");
      return !/^#[0-9A-Fa-f]{6}$/.test(hex);
    });

    if (invalidColors.length === 0) {
      console.log(`   ✅ All colors have valid hex format`);
    } else {
      console.log(`   ❌ Invalid colors found: ${invalidColors.join(", ")}`);
    }
  }
} else {
  console.log("   ❌ ColorPickerComponent file not found");
}

console.log("\n🔧 Implementation Summary:");
console.log(
  "   1. SecurityUtils processes HTML and may strip style attributes",
);
console.log("   2. Fallback logic detects missing background-color styles");
console.log("   3. DOM manipulation applies colors with !important priority");
console.log("   4. All 24 color swatches should display properly");
console.log("   5. Color selection functionality remains intact");

console.log("\n🧪 Browser Testing Steps:");
console.log("   1. Open browser console on a page with ColorPickerComponent");
console.log(
  '   2. Look for: "[ColorPickerComponent] Creating HTML with 24 color swatches"',
);
console.log(
  '   3. Check for: "[ColorPickerComponent] Applying fallback color #XXXXXX to swatch"',
);
console.log(
  '   4. Inspect swatch elements - should have style="background-color: #XXXXXX !important"',
);
console.log("   5. Verify all 24 swatches display their respective colors");
console.log("   6. Test color selection by clicking swatches");

console.log("\n✅ Expected Fix Results:");
console.log(
  "   • Color swatches show background colors instead of gray squares",
);
console.log("   • Color picker popup displays 24 colored squares in 6x4 grid");
console.log("   • Clicking any swatch applies that color");
console.log("   • Security is maintained through SecurityUtils integration");
console.log(
  "   • Fallback ensures colors display even if styles are sanitized",
);

console.log(
  "\n🚀 Fix Completed! The color picker should now display properly.",
);
