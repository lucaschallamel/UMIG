#!/usr/bin/env node

/**
 * Fix remaining examples issues in OpenAPI spec
 * Converts array examples to single example for compatibility
 */

const fs = require('fs');
const path = require('path');

const OPENAPI_PATH = path.join(__dirname, 'docs', 'api', 'openapi.yaml');

function fixExamples(content) {
    // Fix the specific patterns where examples is used incorrectly
    // These are in oneOf/anyOf schemas where examples should be example
    
    // Pattern 1: Fix status examples with proper indentation
    content = content.replace(
        /description: (.+?) - accepts either status name \(string\) or status ID \(integer\) for flexible input handling\n\s+examples:\n\s+- "PLANNING"\n\s+- "ACTIVE"\n\s+- 1\n\s+- 2/g,
        'description: $1 - accepts either status name (string) or status ID (integer) for flexible input handling\n          example: "PLANNING"'
    );
    
    // Pattern 2: Fix validation error examples
    content = content.replace(
        /description: SQL state code for database errors\n(\s+)examples:\n\s+- validation_error/g,
        'description: SQL state code for database errors\n$1example: "validation_error"'
    );
    
    // Pattern 3: Fix examples arrays in schemas
    // Generic pattern for arrays of examples
    content = content.replace(
        /(\s+)examples:\n\s+- ([^\n]+)\n(?:\s+- [^\n]+\n)*/gm,
        (match, indent, firstExample) => {
            // Extract just the first example value
            const example = firstExample.replace(/^['"]|['"]$/g, '');
            return `${indent}example: "${example}"`;
        }
    );
    
    return content;
}

function main() {
    try {
        // Read the OpenAPI file
        console.log(`Reading ${OPENAPI_PATH}...`);
        let content = fs.readFileSync(OPENAPI_PATH, 'utf8');
        
        // Count existing issues
        const examplesArrayCount = (content.match(/examples:\s*\n\s+-/g) || []).length;
        console.log(`Found ${examplesArrayCount} examples arrays to fix...`);
        
        // Fix examples issues
        console.log('Fixing remaining examples issues...');
        content = fixExamples(content);
        
        // Count after fix
        const remainingArrays = (content.match(/examples:\s*\n\s+-/g) || []).length;
        
        // Write back the modified content
        fs.writeFileSync(OPENAPI_PATH, content);
        
        console.log(`✅ Successfully fixed ${examplesArrayCount - remainingArrays} examples issues`);
        console.log(`   Remaining arrays: ${remainingArrays}`);
        console.log(`   File saved to: ${OPENAPI_PATH}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run the script
main();