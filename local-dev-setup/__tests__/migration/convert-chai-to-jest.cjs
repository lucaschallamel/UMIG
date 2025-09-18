#!/usr/bin/env node

/**
 * TD-003 Phase 3: Convert Chai assertions to Jest
 * This script converts Chai assertion syntax to Jest assertion syntax
 */

const fs = require("fs");
const path = require("path");

function convertChaiToJest(content) {
  // Remove chai import if present
  content = content.replace(
    /const expect = require\(["']chai["']\)\.expect;?\n?/g,
    "",
  );
  content = content.replace(/import { expect } from ["']chai["'];?\n?/g, "");

  // Convert assertions
  // .to.equal() -> .toBe()
  content = content.replace(
    /expect\((.*?)\)\.to\.equal\((.*?)\)/g,
    "expect($1).toBe($2)",
  );

  // .to.be.equal() -> .toBe()
  content = content.replace(
    /expect\((.*?)\)\.to\.be\.equal\((.*?)\)/g,
    "expect($1).toBe($2)",
  );

  // .to.be.below() -> .toBeLessThan()
  content = content.replace(
    /expect\((.*?)\)\.to\.be\.below\((.*?)\)/g,
    "expect($1).toBeLessThan($2)",
  );

  // .to.be.above() -> .toBeGreaterThan()
  content = content.replace(
    /expect\((.*?)\)\.to\.be\.above\((.*?)\)/g,
    "expect($1).toBeGreaterThan($2)",
  );

  // .to.have.property() -> .toHaveProperty()
  content = content.replace(
    /expect\((.*?)\)\.to\.have\.property\((.*?)\)/g,
    "expect($1).toHaveProperty($2)",
  );

  // .to.include() -> .toContain()
  content = content.replace(
    /expect\((.*?)\)\.to\.include\((.*?)\)/g,
    "expect($1).toContain($2)",
  );

  // .to.be.a() -> typeof checks
  content = content.replace(
    /expect\((.*?)\)\.to\.be\.a\(["']string["']\)/g,
    'expect(typeof $1).toBe("string")',
  );
  content = content.replace(
    /expect\((.*?)\)\.to\.be\.a\(["']number["']\)/g,
    'expect(typeof $1).toBe("number")',
  );
  content = content.replace(
    /expect\((.*?)\)\.to\.be\.a\(["']boolean["']\)/g,
    'expect(typeof $1).toBe("boolean")',
  );
  content = content.replace(
    /expect\((.*?)\)\.to\.be\.an?\(["']object["']\)/g,
    'expect(typeof $1).toBe("object")',
  );
  content = content.replace(
    /expect\((.*?)\)\.to\.be\.an?\(["']array["']\)/g,
    "expect(Array.isArray($1)).toBe(true)",
  );

  // .to.be.true -> .toBe(true)
  content = content.replace(
    /expect\((.*?)\)\.to\.be\.true/g,
    "expect($1).toBe(true)",
  );

  // .to.be.false -> .toBe(false)
  content = content.replace(
    /expect\((.*?)\)\.to\.be\.false/g,
    "expect($1).toBe(false)",
  );

  // .to.be.null -> .toBeNull()
  content = content.replace(
    /expect\((.*?)\)\.to\.be\.null/g,
    "expect($1).toBeNull()",
  );

  // .to.be.undefined -> .toBeUndefined()
  content = content.replace(
    /expect\((.*?)\)\.to\.be\.undefined/g,
    "expect($1).toBeUndefined()",
  );

  // .to.exist -> .toBeDefined()
  content = content.replace(
    /expect\((.*?)\)\.to\.exist/g,
    "expect($1).toBeDefined()",
  );

  // .to.not.exist -> .toBeUndefined()
  content = content.replace(
    /expect\((.*?)\)\.to\.not\.exist/g,
    "expect($1).toBeUndefined()",
  );

  // .to.deep.equal() -> .toEqual()
  content = content.replace(
    /expect\((.*?)\)\.to\.deep\.equal\((.*?)\)/g,
    "expect($1).toEqual($2)",
  );

  // .to.have.length() -> .toHaveLength()
  content = content.replace(
    /expect\((.*?)\)\.to\.have\.length\((.*?)\)/g,
    "expect($1).toHaveLength($2)",
  );

  // .to.throw() -> .toThrow()
  content = content.replace(
    /expect\((.*?)\)\.to\.throw\((.*?)\)/g,
    "expect($1).toThrow($2)",
  );
  content = content.replace(
    /expect\((.*?)\)\.to\.throw\(\)/g,
    "expect($1).toThrow()",
  );

  // .to.be.ok -> .toBeTruthy()
  content = content.replace(
    /expect\((.*?)\)\.to\.be\.ok/g,
    "expect($1).toBeTruthy()",
  );

  // .to.not.be.ok -> .toBeFalsy()
  content = content.replace(
    /expect\((.*?)\)\.to\.not\.be\.ok/g,
    "expect($1).toBeFalsy()",
  );

  // Handle assertions with extra descriptions (remove the description)
  content = content.replace(/\.toBe\((.*?),\s*["'][^"']*["']\)/g, ".toBe($1)");
  content = content.replace(
    /\.toEqual\((.*?),\s*["'][^"']*["']\)/g,
    ".toEqual($1)",
  );
  content = content.replace(
    /\.toBeLessThan\((.*?),\s*["'][^"']*["']\)/g,
    ".toBeLessThan($1)",
  );

  return content;
}

// Process the file passed as argument
const filePath = process.argv[2];

if (!filePath) {
  console.log("Usage: node convert-chai-to-jest.js <file-path>");
  process.exit(1);
}

const absolutePath = path.resolve(filePath);

if (!fs.existsSync(absolutePath)) {
  console.error(`File not found: ${absolutePath}`);
  process.exit(1);
}

const content = fs.readFileSync(absolutePath, "utf8");
const converted = convertChaiToJest(content);

fs.writeFileSync(absolutePath, converted);
console.log(`✅ Converted ${filePath} from Chai to Jest assertions`);
