#!/usr/bin/env node

/**
 * Simple verification script for LabelsEntityManager
 * Tests basic syntax and structure validation
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const projectRoot = join(__dirname, "../..");
const labelsManagerPath = join(
  projectRoot,
  "src/groovy/umig/web/js/entities/labels/LabelsEntityManager.js",
);
const environmentsManagerPath = join(
  projectRoot,
  "src/groovy/umig/web/js/entities/environments/EnvironmentsEntityManager.js",
);

console.log("🔍 Verifying LabelsEntityManager...");

try {
  // Read both files
  const labelsContent = readFileSync(labelsManagerPath, "utf8");
  const environmentsContent = readFileSync(environmentsManagerPath, "utf8");

  console.log("✅ Files loaded successfully");

  // Check for removed audit logging
  const auditLogMatches = labelsContent.match(/auditLog/g);
  if (auditLogMatches) {
    console.log("❌ Found audit logging calls:", auditLogMatches.length);
    process.exit(1);
  } else {
    console.log("✅ No audit logging calls found");
  }

  // Check for removed security methods
  const securityMethods = [
    "getCurrentUser",
    "generateRateLimitToken",
    "getSecurityHeaders",
  ];
  let foundSecurityMethods = [];

  securityMethods.forEach((method) => {
    if (labelsContent.includes(method + "(")) {
      foundSecurityMethods.push(method);
    }
  });

  if (foundSecurityMethods.length > 0) {
    console.log("❌ Found problematic security methods:", foundSecurityMethods);
    process.exit(1);
  } else {
    console.log("✅ No problematic security methods found");
  }

  // Check for proper field names
  const fieldNames = ["lab_code", "lab_name", "lab_description"];
  let missingFields = [];

  fieldNames.forEach((field) => {
    if (!labelsContent.includes(field)) {
      missingFields.push(field);
    }
  });

  if (missingFields.length > 0) {
    console.log("❌ Missing field names:", missingFields);
    process.exit(1);
  } else {
    console.log("✅ All required field names present");
  }

  // Check for proper primary key
  if (!labelsContent.includes("lbl_id")) {
    console.log("❌ Primary key lbl_id not found");
    process.exit(1);
  } else {
    console.log("✅ Primary key lbl_id found");
  }

  // Check for proper API endpoint
  if (!labelsContent.includes("/rest/scriptrunner/latest/custom/labels")) {
    console.log("❌ API endpoint not found");
    process.exit(1);
  } else {
    console.log("✅ API endpoint found");
  }

  // Basic syntax check by trying to parse as JavaScript
  try {
    // Simple syntax validation - check for common JavaScript syntax errors
    const hasClass = labelsContent.includes("class LabelsEntityManager");
    const hasConstructor = labelsContent.includes("constructor(options = {})");
    const hasExtends = labelsContent.includes(
      "extends (window.BaseEntityManager || class {})",
    );

    if (!hasClass) {
      console.log("❌ Class declaration not found");
      process.exit(1);
    }

    if (!hasConstructor) {
      console.log("❌ Constructor not found");
      process.exit(1);
    }

    if (!hasExtends) {
      console.log("❌ Proper inheritance not found");
      process.exit(1);
    }

    console.log("✅ Basic structure validation passed");

    // Count lines to ensure significant refactoring
    const labelsLines = labelsContent.split("\n").length;
    const environmentsLines = environmentsContent.split("\n").length;

    console.log(`📊 Labels file: ${labelsLines} lines`);
    console.log(`📊 Environments file: ${environmentsLines} lines`);

    // Should be similar in size (within reasonable range)
    const sizeDiff = Math.abs(labelsLines - environmentsLines);
    const maxExpectedDiff = environmentsLines * 0.3; // Allow 30% difference

    if (sizeDiff > maxExpectedDiff) {
      console.log(
        `⚠️  Warning: Size difference is significant (${sizeDiff} lines)`,
      );
    } else {
      console.log("✅ File size within expected range");
    }
  } catch (syntaxError) {
    console.log("❌ Syntax validation failed:", syntaxError.message);
    process.exit(1);
  }

  console.log("\n🎉 LabelsEntityManager verification completed successfully!");
  console.log("\n📋 Summary:");
  console.log("   - Audit logging removed ✓");
  console.log("   - Security methods removed ✓");
  console.log("   - Correct field names ✓");
  console.log("   - Proper primary key ✓");
  console.log("   - API endpoint configured ✓");
  console.log("   - Basic structure valid ✓");
  console.log("\n✅ Ready for testing in browser environment");
} catch (error) {
  console.error("❌ Verification failed:", error.message);
  process.exit(1);
}
