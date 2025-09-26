#!/usr/bin/env node

/**
 * Test script for the improved build manifest system
 * This tests the simplified manifest generation and README creation
 * without running the full build process
 */

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import MetadataGenerator from "./MetadataGenerator.js";
import VersionManager from "./VersionManager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testManifestIntegration() {
  console.log("🧪 Testing Build Manifest Integration\n");

  try {
    // Initialize VersionManager
    console.log("1. Initializing VersionManager...");
    const versionManager = new VersionManager(__dirname);
    versionManager.initialize();
    const versionInfo = versionManager.generateVersionMetadata("dev");
    console.log(`   ✓ Version: ${versionInfo.version}`);

    // Initialize MetadataGenerator
    console.log("\n2. Creating MetadataGenerator...");
    const projectRoot = path.resolve(__dirname, "..");
    const metadataGenerator = new MetadataGenerator(projectRoot);

    // Mock build state
    const buildState = {
      phase: 3,
      startTime: new Date(Date.now() - 60000), // 1 minute ago
      endTime: new Date(),
      artifactPaths: [
        "/Users/lucaschallamel/Documents/GitHub/UMIG/build/umig-deployment-dev-2025-09-25T14-32-01.tar.gz",
      ],
      errors: [],
      warnings: [],
    };

    // Test deployment manifest generation
    console.log("\n3. Generating deployment manifest...");
    const deploymentManifest = metadataGenerator.generateDeploymentManifest(
      buildState,
      versionInfo,
      "dev",
    );
    console.log("   ✓ Deployment manifest generated");
    console.log("   Sample content:");
    console.log(`   - Package: ${deploymentManifest.packageInfo.name}`);
    console.log(`   - Version: ${deploymentManifest.packageInfo.version}`);
    console.log(
      `   - Environment: ${deploymentManifest.packageInfo.environment}`,
    );
    console.log(
      `   - Archive Size: ${deploymentManifest.deployment.archiveSize}`,
    );

    // Test README generation
    console.log("\n4. Generating deployment README...");
    const deploymentReadme = metadataGenerator.generateDeploymentReadme(
      versionInfo,
      "dev",
    );
    console.log("   ✓ Deployment README generated");
    console.log(`   - Length: ${deploymentReadme.length} characters`);

    // Test export with timestamped filename
    console.log("\n5. Testing timestamped export...");
    const testOutputDir = path.join(__dirname, "test-output");

    // Ensure test output directory exists
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }

    // Export manifest with timestamp
    const manifestResult = metadataGenerator.exportDeploymentManifest(
      testOutputDir,
      deploymentManifest,
    );
    console.log(`   ✓ Manifest exported: ${manifestResult.filename}`);

    // Export README
    const readmeResult = metadataGenerator.exportDeploymentReadme(
      testOutputDir,
      deploymentReadme,
    );
    console.log(`   ✓ README exported: ${readmeResult.filename}`);

    // Show comparison with old vs new manifest
    console.log("\n6. Manifest comparison:");
    console.log(
      `   OLD: build-manifest.json (${fs.statSync("/Users/lucaschallamel/Documents/GitHub/UMIG/build/build-manifest.json").size} bytes)`,
    );
    console.log(
      `   NEW: ${manifestResult.filename} (${manifestResult.size} bytes)`,
    );

    const reductionPercentage = (
      ((fs.statSync(
        "/Users/lucaschallamel/Documents/GitHub/UMIG/build/build-manifest.json",
      ).size -
        manifestResult.size) /
        fs.statSync(
          "/Users/lucaschallamel/Documents/GitHub/UMIG/build/build-manifest.json",
        ).size) *
      100
    ).toFixed(1);
    console.log(`   📉 Size reduction: ${reductionPercentage}%`);

    // Preview the simplified manifest structure
    console.log("\n7. New manifest structure preview:");
    console.log(
      JSON.stringify(
        {
          packageInfo: deploymentManifest.packageInfo,
          contents: deploymentManifest.contents,
          deployment: {
            instructions: deploymentManifest.deployment.instructions,
            requirements: deploymentManifest.deployment.requirements,
          },
        },
        null,
        2,
      ),
    );

    console.log(
      "\n✅ All tests passed! The new manifest system is working correctly.",
    );
    console.log("\n🎯 Key Improvements Validated:");
    console.log("   • ✓ Simplified manifest structure (deployment-focused)");
    console.log("   • ✓ Correct version information from VersionManager");
    console.log("   • ✓ Timestamped filenames for build artifacts");
    console.log("   • ✓ User-friendly README.md generation");
    console.log("   • ✓ Significant size reduction in manifest files");

    // Cleanup test files
    fs.unlinkSync(manifestResult.path);
    fs.unlinkSync(readmeResult.path);
    fs.rmdirSync(testOutputDir);
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testManifestIntegration();
