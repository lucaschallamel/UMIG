---
description: Master workflow for verifying subagent work completion and preventing false success reporting
---

# Subagent Work Verification Workflow

**Purpose:** Ensure main orchestrating agent properly verifies subagent work completion instead of assuming success.

## The Problem

Main Claude agents often report work as "completed" when subagents were called, but don't verify actual file changes occurred. This leads to:

- Documents reported as "written" but actually unchanged
- False success reporting to users
- Incomplete work being marked as done
- Loss of user trust in AI workflows

## The Solution

Implement mandatory verification steps after every subagent delegation.

## Verification Protocol

### Step 1: Pre-Work State Capture

Before delegating to subagents:

```bash
# Capture current state of target files
find [target_directory] -name "*.md" -exec ls -la {} \;
find [target_directory] -name "*.md" -exec wc -l {} \;
```

### Step 2: Subagent Delegation

Execute subagent work as planned:

```bash
/gd:[agent-name] [parameters]
```

### Step 3: Mandatory Verification

**NEVER skip this step - Always verify actual changes:**

1. **File System Check:**
   ```bash
   # Check if target files were modified
   ls -la [target_files]
   # Look for timestamp changes
   # Verify file sizes changed appropriately
   ```

2. **Content Verification:**
   ```bash
   # Read each file that should have been modified
   cat [file1]
   cat [file2]
   # Verify content is meaningful, not placeholder
   # Check that specific requested changes were made
   ```

3. **Change Validation:**
   - Compare actual content with intended changes
   - Verify new sections were added where expected
   - Check that existing content was updated appropriately
   - Ensure no placeholder text remains

### Step 4: Status Reporting

**Only report success if verification passes:**

✅ **Success Criteria:**
- All target files show updated timestamps
- File content contains expected changes
- No placeholder or incomplete content
- Changes are consistent and meaningful

❌ **Failure Response:**
- Document specific gaps between expected and actual
- Use direct file tools to complete missing work
- Report accurate status to user
- Never claim success when verification fails

## Implementation in Existing Workflows

Add this verification block to every workflow using subagents:

```markdown
## SUBAGENT VERIFICATION REQUIRED

After each subagent call:

1. **File Check:** `ls -la [target_files]` - verify timestamps changed
2. **Content Check:** `cat [target_files]` - verify meaningful content added
3. **Change Validation:** Compare actual vs expected changes
4. **Status Report:** Only claim success if verification passes

**NEVER proceed without confirming actual file changes occurred.**
```

## Common Verification Failures

### 1. Timestamp Unchanged
- **Issue:** File shows same modification time
- **Action:** Re-execute with direct file tools

### 2. Placeholder Content
- **Issue:** File contains generic or incomplete content
- **Action:** Generate specific content using direct tools

### 3. Missing Files
- **Issue:** Expected new files were not created
- **Action:** Create files directly with proper content

### 4. Partial Updates
- **Issue:** Only some requested changes were made
- **Action:** Complete remaining changes manually

## Direct Tool Alternatives

When subagent verification fails, use these direct tools:

- `fsWrite` - Create new files with specific content
- `strReplace` - Make targeted content changes
- `fsAppend` - Add content to existing files
- `readFile` - Verify current file state

## Workflow Integration

Update all existing workflows in `.clinerules/workflows/` to include:

1. Pre-work state capture
2. Subagent delegation
3. Mandatory verification
4. Failure response protocol
5. Accurate status reporting

This ensures users get reliable feedback about what work was actually completed.