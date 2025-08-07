# Agent Hooks & Workflow Automation

## Converting Cline Workflows to Kiro Agent Hooks

### Existing Workflow Files

Based on the repository map, you have established workflows in `.clinerules/workflows/`:

- `api-tests-specs-update.md`
- `api-work.md`
- `commit.md`
- `data-model.md`
- `dev-journal.md`
- `doc-update.md`
- `kick-off.md`
- `memory-bank-update.md`
- `pull-request.md`
- `sprint-review.md`

### Conversion Strategy

#### Automatic Trigger Hooks

Convert workflows that should run automatically on events:

**File Save Triggers:**

- `api-tests-specs-update.md` → Hook: When API files saved, update tests and OpenAPI specs
- `data-model.md` → Hook: When database migration files saved, update ERD and documentation
- `doc-update.md` → Hook: When code files saved, check if documentation needs updates

**Git Event Triggers:**

- `commit.md` → Hook: Before commit, run linting and ensure commit message format
- `pull-request.md` → Hook: When creating PR, run full test suite and update changelog

**Scheduled/Periodic Triggers:**

- `sprint-review.md` → Hook: Weekly trigger to generate sprint review template
- `dev-journal.md` → Hook: Daily trigger to prompt for development journal updates

#### Manual Button Hooks

Convert workflows that should be user-initiated:

**Documentation Maintenance:**

- `memory-bank-update.md` → Manual Hook: "Update Memory Bank" button
- `api-work.md` → Manual Hook: "Generate API Boilerplate" button
- `kick-off.md` → Manual Hook: "Project Kickoff Checklist" button

### Hook Implementation Examples

#### Memory Bank Update Hook

```yaml
name: "Update Memory Bank"
trigger: manual
description: "Review and update all Cline memory bank files"
actions:
  - Read all files in cline-docs/
  - Update activeContext.md with current focus
  - Update progress.md with recent changes
  - Verify memory bank completeness
```

#### API Development Hook

```yaml
name: "API Development Workflow"
trigger: file_save
pattern: "src/groovy/umig/api/**/*.groovy"
description: "Update tests and specs when API files change"
actions:
  - Generate/update unit tests
  - Update OpenAPI specification
  - Validate CustomEndpointDelegate pattern
  - Update Postman collection
```

#### Documentation Sync Hook

```yaml
name: "Documentation Sync"
trigger: file_save
pattern: "src/**/*.groovy"
description: "Check if documentation needs updates"
actions:
  - Scan for new API endpoints
  - Check if README needs updates
  - Verify ADR references are current
  - Update changelog if needed
```

### Hook Configuration Access

#### Via Command Palette

- Search for "Open Kiro Hook UI" to create new hooks
- Use "Kiro: Manage Hooks" to edit existing hooks

#### Via Explorer View

- Navigate to "Agent Hooks" section in explorer
- View current hooks and their status
- Create new hooks or modify existing ones

### Hook Best Practices

#### For UMIG Project

- **Database Hooks**: Trigger on Liquibase migration changes
- **API Hooks**: Trigger on Groovy API file changes
- **Frontend Hooks**: Trigger on JavaScript/CSS changes in `src/groovy/umig/web/`
- **Documentation Hooks**: Trigger on significant code changes

#### Hook Design Principles

- **[SF] Simplicity First**: Keep hooks focused on single responsibilities
- **[AC] Atomic Changes**: Each hook should perform discrete, reversible actions
- **[REH] Robust Error Handling**: Hooks should gracefully handle failures
- **[TDT] Test-Driven Thinking**: Test hook behavior before deployment

### Migration Checklist

To convert your Cline workflows to Kiro Agent Hooks:

1. **Review existing workflows** in `.clinerules/workflows/`
2. **Identify trigger patterns** (file save, git events, manual)
3. **Create corresponding hooks** using Kiro Hook UI
4. **Test hook behavior** in development environment
5. **Document hook purposes** and maintenance procedures
6. **Update team workflows** to use new hook system

### Hook Maintenance

#### Regular Review

- Weekly review of hook effectiveness
- Monthly cleanup of unused or problematic hooks
- Quarterly optimization of hook performance

#### Documentation

- Document each hook's purpose and trigger conditions
- Maintain hook configuration in version control where possible
- Update team onboarding to include hook usage patterns
