---
description: Mandatory verification template for all subagent delegated work
---

# Subagent Work Verification Template

**CRITICAL: Use this template after EVERY subagent delegation to prevent false success reporting**

## Pre-Verification State Capture

Before delegating work to subagents:

1. **Capture Current State:**
   ```bash
   # Record current file timestamps and sizes
   ls -la [target_files]
   # Record current content checksums
   md5 [target_files]
   ```

2. **Document Expected Changes:**
   - List specific files that should be modified
   - Describe expected content changes
   - Note any new files that should be created

## Post-Subagent Verification Protocol

After subagent execution, ALWAYS perform these checks:

### 1. File System Verification

```bash
# Check if files were actually modified
ls -la [target_files]
# Verify timestamps changed
# Verify file sizes changed appropriately
```

### 2. Content Verification

```bash
# Read each modified file
cat [modified_file]
# Verify content matches expectations
# Check for actual changes vs placeholder content
```

### 3. Specific Change Validation

- [ ] Compare actual changes with intended changes
- [ ] Verify new content is meaningful, not placeholder
- [ ] Check that all requested modifications were applied
- [ ] Validate file structure and formatting

### 4. Cross-Reference Validation

- [ ] Ensure changes are consistent across related files
- [ ] Verify links and references are updated
- [ ] Check that dependent files reflect changes

## Failure Response Protocol

If verification fails:

1. **Document the Gap:**
   - What was expected vs what actually happened
   - Which files were not modified as expected
   - What content is missing or incorrect

2. **Re-execute with Direct Tools:**
   - Use direct file tools instead of subagents
   - Make specific, targeted changes
   - Verify each change immediately

3. **Report Accurate Status:**
   - Never claim success if verification fails
   - Be explicit about what was and wasn't accomplished
   - Provide specific next steps needed

## Success Criteria

Only report success when:

- [ ] All target files show updated timestamps
- [ ] File content matches expected changes
- [ ] No placeholder or incomplete content remains
- [ ] Cross-references are properly updated
- [ ] Changes are consistent across related files

## Template Usage

Copy this verification section into every workflow that uses subagents:

```markdown
## VERIFICATION REQUIRED
After subagent execution:
1. Read all modified files to confirm changes
2. Check timestamps to verify writes occurred  
3. Validate content matches expectations
4. Report specific discrepancies if found
5. Never claim success without file verification
```