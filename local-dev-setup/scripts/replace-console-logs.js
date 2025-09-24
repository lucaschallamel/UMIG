#!/usr/bin/env node

/**
 * Script to replace console.log/debug/info/warn/error statements with Logger
 *
 * Usage: node replace-console-logs.js <file-path>
 */

const fs = require("fs");
const path = require("path");

function replaceConsoleStatements(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, "utf8");
  const originalContent = content;

  // Check if file already has Logger
  const hasLogger =
    content.includes("window.Logger") || content.includes("Logger.create");

  // Add Logger import if not present
  if (!hasLogger && content.includes("console.")) {
    // Find the right place to add the logger creation
    // After class declaration or at the beginning
    if (content.includes("class ")) {
      // For class-based files, add logger after class declaration
      const className = content.match(/class\s+(\w+)/)?.[1] || "Component";
      const moduleName = path.basename(filePath, ".js");

      // Add logger creation after the first class closing brace + window assignment
      const windowAssignmentMatch = content.match(/window\.\w+\s*=\s*\w+;/);
      if (windowAssignmentMatch) {
        const insertPoint =
          content.indexOf(windowAssignmentMatch[0]) +
          windowAssignmentMatch[0].length;
        const loggerInit = `\n\n// Initialize logger for this module\nconst logger = window.Logger ? window.Logger.create('${moduleName}') : { debug: () => {}, info: () => {}, warn: console.warn, error: console.error };`;
        content =
          content.slice(0, insertPoint) +
          loggerInit +
          content.slice(insertPoint);
      }
    } else {
      // For non-class files, add at the beginning after any existing comments
      const firstNonComment = content.search(/^[^/*\s]/m);
      const loggerInit = `// Initialize logger for this module\nconst logger = window.Logger ? window.Logger.create('${path.basename(filePath, ".js")}') : { debug: () => {}, info: () => {}, warn: console.warn, error: console.error };\n\n`;
      content =
        content.slice(0, firstNonComment) +
        loggerInit +
        content.slice(firstNonComment);
    }
  }

  // Replace console statements
  // Handle multi-line console statements
  content = content.replace(/console\.log\s*\([^)]*\)/gm, (match) => {
    const inner = match.replace(/^console\.log\s*\(/, "").replace(/\)$/, "");
    return `logger.debug(${inner})`;
  });

  content = content.replace(/console\.debug\s*\([^)]*\)/gm, (match) => {
    const inner = match.replace(/^console\.debug\s*\(/, "").replace(/\)$/, "");
    return `logger.debug(${inner})`;
  });

  content = content.replace(/console\.info\s*\([^)]*\)/gm, (match) => {
    const inner = match.replace(/^console\.info\s*\(/, "").replace(/\)$/, "");
    return `logger.info(${inner})`;
  });

  content = content.replace(/console\.warn\s*\([^)]*\)/gm, (match) => {
    const inner = match.replace(/^console\.warn\s*\(/, "").replace(/\)$/, "");
    return `logger.warn(${inner})`;
  });

  content = content.replace(/console\.error\s*\([^)]*\)/gm, (match) => {
    const inner = match.replace(/^console\.error\s*\(/, "").replace(/\)$/, "");
    return `logger.error(${inner})`;
  });

  // Handle console.group and console.groupEnd
  content = content.replace(/console\.group\s*\([^)]*\)/gm, (match) => {
    const inner = match.replace(/^console\.group\s*\(/, "").replace(/\)$/, "");
    return `logger.group(${inner})`;
  });

  content = content.replace(
    /console\.groupEnd\s*\(\s*\)/gm,
    "logger.groupEnd()",
  );

  // Handle console.table
  content = content.replace(/console\.table\s*\([^)]*\)/gm, (match) => {
    const inner = match.replace(/^console\.table\s*\(/, "").replace(/\)$/, "");
    return `logger.table(${inner})`;
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`✅ Updated: ${filePath}`);

    // Count replacements
    const originalCount = (originalContent.match(/console\./g) || []).length;
    const newCount = (content.match(/console\./g) || []).length;
    const replaced = originalCount - newCount;
    console.log(`   Replaced ${replaced} console statements`);

    return true;
  } else {
    console.log(`ℹ️  No changes needed: ${filePath}`);
    return false;
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: node replace-console-logs.js <file-path>");
    console.log(
      "   or: node replace-console-logs.js --batch <file1> <file2> ...",
    );
    process.exit(1);
  }

  if (args[0] === "--batch") {
    // Process multiple files
    const files = args.slice(1);
    let updatedCount = 0;

    for (const file of files) {
      if (replaceConsoleStatements(file)) {
        updatedCount++;
      }
    }

    console.log(
      `\n📊 Summary: Updated ${updatedCount} of ${files.length} files`,
    );
  } else {
    // Process single file
    replaceConsoleStatements(args[0]);
  }
}

module.exports = { replaceConsoleStatements };
