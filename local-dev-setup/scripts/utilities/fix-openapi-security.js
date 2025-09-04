#!/usr/bin/env node

/**
 * Fix OpenAPI security definitions for UMIG project
 * Adds security: - ConfluenceUsers: [] to all endpoints missing it
 */

const fs = require("fs");
const path = require("path");

const OPENAPI_PATH = path.join(__dirname, "docs", "api", "openapi.yaml");

function addSecurityToEndpoints(content) {
  const lines = content.split("\n");
  const modifiedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this is an HTTP method definition with 4 spaces indentation
    // (get:, post:, put:, delete:, patch:)
    const methodMatch = line.match(/^    (get|post|put|delete|patch):\s*$/);

    if (methodMatch) {
      // Look ahead to see if security is already defined
      let hasSecurity = false;
      let j = i + 1;
      let bracesLevel = 0;

      while (j < lines.length && j < i + 30) {
        const nextLine = lines[j];

        // Track brace/bracket levels to handle nested structures
        bracesLevel += (nextLine.match(/[{[]/g) || []).length;
        bracesLevel -= (nextLine.match(/[}\]]/g) || []).length;

        // Stop if we hit another path (at root level) or another method (at same level)
        if (bracesLevel === 0) {
          if (
            nextLine.match(/^  \//) ||
            nextLine.match(/^    (get|post|put|delete|patch):\s*$/)
          ) {
            break;
          }
        }

        // Check if security is defined at the correct indentation level (6 spaces for methods)
        if (nextLine.match(/^      security:/)) {
          hasSecurity = true;
          break;
        }

        j++;
      }

      // Add the method line
      modifiedLines.push(line);

      // If no security found, add it
      if (!hasSecurity) {
        modifiedLines.push("      security:");
        modifiedLines.push("        - ConfluenceUsers: []");
      }
    } else {
      modifiedLines.push(line);
    }
  }

  return modifiedLines.join("\n");
}

function main() {
  try {
    // Read the OpenAPI file
    console.log(`Reading ${OPENAPI_PATH}...`);
    const content = fs.readFileSync(OPENAPI_PATH, "utf8");

    // Count existing security definitions for stats
    const existingSecurityCount = (content.match(/security:/g) || []).length;

    // Add security to endpoints
    console.log("Adding security definitions to endpoints missing them...");
    const modifiedContent = addSecurityToEndpoints(content);

    // Count new security definitions
    const newSecurityCount = (modifiedContent.match(/security:/g) || []).length;
    const added = newSecurityCount - existingSecurityCount;

    // Write back the modified content
    fs.writeFileSync(OPENAPI_PATH, modifiedContent);

    console.log(`✅ Successfully added ${added} security definitions`);
    console.log(`   Total security definitions: ${newSecurityCount}`);
    console.log(`   File saved to: ${OPENAPI_PATH}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

// Run the script
main();
