# Cline Memory Bank Management

## Core Principle

Maintain the Cline Memory Bank files in `cline-docs/` folder to ensure continuity across AI assistant sessions. These files serve as the single source of truth for project state and context.

## Cline Memory Bank Structure

The memory bank follows a specific hierarchy in `cline-docs/`:

```
projectBrief.md → productContext.md → activeContext.md → progress.md
projectBrief.md → systemPatterns.md → activeContext.md → progress.md
projectBrief.md → techContext.md → activeContext.md → progress.md
```

### Required Cline Memory Bank Files

1. **projectBrief.md** - Foundation document, core requirements and scope
2. **productContext.md** - Problems solved and user experience goals
3. **systemPatterns.md** - Architecture and technical decisions
4. **techContext.md** - Technologies, setup, and constraints
5. **activeContext.md** - Current focus, recent changes, next steps
6. **progress.md** - Status, completed work, known issues

## Cline Memory Bank Workflows

### Before Starting Work (Plan Mode)

1. Read ALL files in `cline-docs/` folder
2. Verify memory bank completeness
3. Check if files need updates or are missing
4. Update `activeContext.md` with current focus

### During Work (Act Mode)

1. Update `activeContext.md` with progress and insights
2. Document new patterns in `systemPatterns.md`
3. Note architectural discoveries and decisions

### After Completing Work

1. Update `progress.md` with completed work and status
2. Document new learnings in appropriate memory bank files
3. Update `activeContext.md` with next steps
4. Ensure all changes are reflected across memory bank files

## Cline Memory Bank Standards

- Maintain files specifically in `cline-docs/` folder
- Use clear, hierarchical structure following Cline patterns
- Include specific examples and implementation details
- Document both successful patterns and failed approaches
- Maintain traceability between decisions and outcomes
- Update memory bank immediately when patterns change

## Memory Bank Maintenance Rules

- When user requests "update memory bank" - review ALL files in `cline-docs/`
- Focus updates on `activeContext.md` and `progress.md` for current state
- Ensure memory bank accuracy is maintained with precision
- Treat `cline-docs/` files as the single source of truth for project state
- Memory bank must be complete enough for fresh AI session to continue work effectively
