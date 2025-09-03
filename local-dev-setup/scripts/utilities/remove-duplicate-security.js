#!/usr/bin/env node

/**
 * Remove duplicate security definitions from OpenAPI spec
 * Keeps only the first security definition for each method
 */

const fs = require('fs');
const path = require('path');

const OPENAPI_PATH = path.join(__dirname, 'docs', 'api', 'openapi.yaml');

function removeDuplicateSecurity(content) {
    const lines = content.split('\n');
    const cleanedLines = [];
    let inMethod = false;
    let methodIndent = 0;
    let hasSeenSecurity = false;
    let skipNextSecurityBlock = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        const indent = line.length - line.trimStart().length;
        
        // Check if this is an HTTP method definition (4 spaces)
        const methodMatch = line.match(/^    (get|post|put|delete|patch):\s*$/);
        
        if (methodMatch) {
            inMethod = true;
            methodIndent = 4;
            hasSeenSecurity = false;
            cleanedLines.push(line);
            continue;
        }
        
        // Check if we're exiting the current method (new path or method at same level)
        if (inMethod && indent <= methodIndent) {
            if (line.match(/^  \//) || line.match(/^    (get|post|put|delete|patch):\s*$/)) {
                inMethod = false;
                hasSeenSecurity = false;
            }
        }
        
        // Handle security blocks
        if (inMethod && line.match(/^      security:\s*$/)) {
            if (hasSeenSecurity) {
                // Skip this duplicate security block
                skipNextSecurityBlock = true;
                console.log(`Removing duplicate security at line ${i + 1}`);
                continue;
            } else {
                hasSeenSecurity = true;
                cleanedLines.push(line);
                continue;
            }
        }
        
        // Skip lines that are part of a duplicate security block
        if (skipNextSecurityBlock) {
            if (line.match(/^        - /) || line.match(/^          /)) {
                // Part of security block, skip it
                continue;
            } else {
                // End of security block
                skipNextSecurityBlock = false;
            }
        }
        
        cleanedLines.push(line);
    }
    
    return cleanedLines.join('\n');
}

function main() {
    try {
        // Read the OpenAPI file
        console.log(`Reading ${OPENAPI_PATH}...`);
        const content = fs.readFileSync(OPENAPI_PATH, 'utf8');
        
        // Count existing security definitions for stats
        const existingSecurityCount = (content.match(/^      security:/gm) || []).length;
        
        // Remove duplicate security definitions
        console.log('Removing duplicate security definitions...');
        const cleanedContent = removeDuplicateSecurity(content);
        
        // Count new security definitions
        const newSecurityCount = (cleanedContent.match(/^      security:/gm) || []).length;
        const removed = existingSecurityCount - newSecurityCount;
        
        // Write back the modified content
        fs.writeFileSync(OPENAPI_PATH, cleanedContent);
        
        console.log(`✅ Successfully removed ${removed} duplicate security definitions`);
        console.log(`   Total security definitions: ${newSecurityCount}`);
        console.log(`   File saved to: ${OPENAPI_PATH}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run the script
main();