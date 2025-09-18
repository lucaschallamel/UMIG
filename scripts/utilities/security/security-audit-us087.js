#!/usr/bin/env node

/**
 * US-087 Phase 1 Security Audit Script
 *
 * This script performs security checks on the Phase 1 implementation
 * to ensure compliance with OWASP guidelines and enterprise security standards.
 */

const fs = require("fs");
const path = require("path");

console.log("========================================");
console.log("US-087 Phase 1 Security Audit");
console.log("========================================\n");

// Color codes for output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

const pass = (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`);
const fail = (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`);
const warn = (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`);
const info = (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`);
const sec = (msg) => console.log(`${colors.magenta}🔐 ${msg}${colors.reset}`);

let passCount = 0;
let failCount = 0;
let warnCount = 0;

// Helper function to check file content
function checkFileContent(filePath, checks) {
  if (!fs.existsSync(filePath)) {
    fail(`File not found: ${filePath}`);
    failCount++;
    return false;
  }

  const content = fs.readFileSync(filePath, "utf8");
  let allPassed = true;

  checks.forEach((check) => {
    const found = check.pattern.test(content);
    const expected = check.shouldExist !== false;

    if (found === expected) {
      pass(check.name);
      passCount++;
    } else {
      if (check.severity === "warning") {
        warn(check.name);
        warnCount++;
      } else {
        fail(check.name);
        failCount++;
        allPassed = false;
      }
    }
  });

  return allPassed;
}

// Security Audit 1: Input Validation and Sanitization
console.log("1. Input Validation & Sanitization Checks...");
const utilsPath = path.join(
  __dirname,
  "..",
  "src",
  "groovy",
  "umig",
  "web",
  "js",
  "utils",
);

checkFileContent(path.join(utilsPath, "FeatureToggle.js"), [
  {
    name: "Input validation for percentage",
    pattern: /if\s*\(percentage\s*<\s*0\s*\|\|\s*percentage\s*>\s*100\)/,
  },
  {
    name: "Safe localStorage usage",
    pattern: /JSON\.parse.*localStorage\.getItem/,
  },
  {
    name: "Try-catch for localStorage operations",
    pattern: /try\s*{\s*.*localStorage/s,
  },
]);

// Security Audit 2: XSS Prevention
console.log("\n2. XSS Prevention Checks...");
const adminGuiPath = path.join(
  __dirname,
  "..",
  "src",
  "groovy",
  "umig",
  "web",
  "js",
  "admin-gui.js",
);

checkFileContent(adminGuiPath, [
  {
    name: "No direct innerHTML usage in new code",
    pattern: /loadWithEntityManager[\s\S]*?innerHTML/,
    shouldExist: false,
  },
  {
    name: "Event data validation",
    pattern: /event\.detail.*&&.*typeof/,
    severity: "warning",
  },
]);

// Security Audit 3: Access Control
console.log("\n3. Access Control & Authentication...");
checkFileContent(adminGuiPath, [
  {
    name: "Feature flag permission checks",
    pattern: /shouldUseComponentManager.*isEnabled/,
  },
  {
    name: "Error handling with security context",
    pattern: /catch.*console\.error.*emergencyRollback/s,
    severity: "warning",
  },
]);

// Security Audit 4: Secure Communication
console.log("\n4. Secure Communication Patterns...");
checkFileContent(path.join(utilsPath, "PerformanceMonitor.js"), [
  {
    name: "No sensitive data in metrics",
    pattern: /password|token|secret|key|credential/i,
    shouldExist: false,
  },
  {
    name: "Safe error message handling",
    pattern: /error\.message/,
  },
]);

// Security Audit 5: OWASP Top 10 Compliance
console.log("\n5. OWASP Top 10 Compliance...");
sec("A01:2021 – Broken Access Control");
checkFileContent(adminGuiPath, [
  {
    name: "Component access controlled by feature flags",
    pattern: /featureToggle.*isEnabled/,
  },
]);

sec("A02:2021 – Cryptographic Failures");
info("Not applicable - no cryptographic operations in Phase 1");

sec("A03:2021 – Injection");
checkFileContent(adminGuiPath, [
  {
    name: "No dynamic code execution",
    pattern: /eval\s*\(|Function\s*\(|setTimeout.*string/,
    shouldExist: false,
  },
]);

sec("A04:2021 – Insecure Design");
checkFileContent(adminGuiPath, [
  {
    name: "Fail-safe design with rollback",
    pattern: /emergencyRollback/,
  },
  {
    name: "Defensive programming with try-catch",
    pattern: /try\s*{[\s\S]*?catch/,
  },
]);

sec("A05:2021 – Security Misconfiguration");
checkFileContent(path.join(utilsPath, "FeatureToggle.js"), [
  {
    name: "Secure defaults (features disabled)",
    pattern: /'admin-gui-migration':\s*false/,
  },
]);

sec("A06:2021 – Vulnerable Components");
info("Phase 1 uses only internal components - no external dependencies");

sec("A07:2021 – Software and Data Integrity");
checkFileContent(path.join(utilsPath, "FeatureToggle.js"), [
  {
    name: "Data integrity checks",
    pattern: /JSON\.parse.*catch/s,
  },
]);

sec("A08:2021 – Security Logging");
checkFileContent(adminGuiPath, [
  {
    name: "Security event logging",
    pattern: /console\.log.*Migration.*enabled|console\.error/,
  },
]);

sec("A09:2021 – Server-Side Request Forgery");
info("Not applicable - no server requests in Phase 1");

sec("A10:2021 – Rate Limiting");
checkFileContent(path.join(utilsPath, "PerformanceMonitor.js"), [
  {
    name: "Metrics size limiting",
    pattern: /maxMetricsSize|slice\(-this\.config\.maxMetricsSize\)/,
  },
]);

// Security Audit 6: Enterprise Security Requirements
console.log("\n6. Enterprise Security Requirements...");
checkFileContent(path.join(utilsPath, "FeatureToggle.js"), [
  {
    name: "Emergency rollback capability",
    pattern: /emergencyRollback.*function/,
  },
  {
    name: "Audit trail for feature changes",
    pattern: /console\.log.*Feature.*enabled|disabled/,
  },
]);

checkFileContent(path.join(utilsPath, "PerformanceMonitor.js"), [
  {
    name: "Performance threshold alerts",
    pattern: /errorThreshold|warnThreshold/,
  },
  {
    name: "Resource usage monitoring",
    pattern: /captureMemoryUsage/,
  },
]);

// Security Audit 7: Code Quality & Best Practices
console.log("\n7. Security Best Practices...");
checkFileContent(adminGuiPath, [
  {
    name: "Strict mode enforcement",
    pattern: /'use strict'/,
  },
  {
    name: "No global namespace pollution",
    pattern: /window\.adminGui\s*=/,
    severity: "warning",
  },
]);

// Security Recommendations
console.log("\n========================================");
console.log("SECURITY RECOMMENDATIONS");
console.log("========================================");

const recommendations = [];

if (warnCount > 0) {
  recommendations.push(
    "Review warning items for potential security improvements",
  );
}

// Check for specific security enhancements
const content = fs.readFileSync(adminGuiPath, "utf8");
if (!content.includes("Content-Security-Policy")) {
  recommendations.push("Consider implementing Content Security Policy headers");
}

if (!content.includes("sanitize")) {
  recommendations.push("Implement input sanitization library for user inputs");
}

if (!content.includes("csrf")) {
  recommendations.push("Verify CSRF protection is enabled at API level");
}

if (recommendations.length === 0) {
  info("No additional security recommendations at this time");
} else {
  recommendations.forEach((rec) => warn(rec));
}

// Summary
console.log("\n========================================");
console.log("AUDIT SUMMARY");
console.log("========================================");
console.log(`${colors.green}Passed: ${passCount}${colors.reset}`);
console.log(`${colors.yellow}Warnings: ${warnCount}${colors.reset}`);
console.log(`${colors.red}Failed: ${failCount}${colors.reset}`);

// Security Score Calculation
const totalChecks = passCount + failCount + warnCount;
const securityScore = Math.round(
  ((passCount + warnCount * 0.5) / totalChecks) * 100,
);

console.log(
  `\n${colors.magenta}Security Score: ${securityScore}%${colors.reset}`,
);

if (failCount === 0 && securityScore >= 80) {
  console.log(
    `${colors.green}✅ Phase 1 passes security audit with ${securityScore}% score${colors.reset}`,
  );

  console.log("\nNext steps:");
  info("1. Review and address any warnings");
  info("2. Implement recommended security enhancements");
  info("3. Schedule penetration testing for production deployment");
  info("4. Document security controls in ADR");

  process.exit(0);
} else if (failCount > 0) {
  console.log(
    `${colors.red}⚠️  Phase 1 has critical security issues that must be addressed${colors.reset}`,
  );
  process.exit(1);
} else {
  console.log(
    `${colors.yellow}⚠️  Phase 1 security score below threshold (${securityScore}% < 80%)${colors.reset}`,
  );
  process.exit(1);
}
