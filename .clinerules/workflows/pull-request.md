---
description: A Pull Request documentation workflow
---
This workflow guides the creation of a high-quality, comprehensive Pull Request description. A great PR description is the fastest way to get your changes reviewed and merged.

**1. Comprehensive Scope Analysis (MANDATORY - Prevent tunnel vision):**

**1.1. Branch and Commit Analysis:**
* **Determine the Base Branch:** Identify the target branch for the merge (e.g., `main`, `develop`).
* **Full Commit Analysis:** Run `git log <base_branch>..HEAD --stat --oneline` to get both summary and detailed changes for all commits in this PR.
* **Commit Categorization:** Group commits by type (feat, fix, docs, refactor, test, chore) to understand the full scope.
* **Time Range Assessment:** Run `git log <base_branch>..HEAD --format="%h %ad %s" --date=short` to understand the development timeline.

**1.2. File System Impact Analysis:**
* **Changed Files Overview:** Run `git diff <base_branch>..HEAD --name-status` to see all modified, added, and deleted files.
* **Functional Area Mapping:** Group changed files by functional area:
  - **API Changes:** `src/groovy/umig/api/`, `src/groovy/umig/repository/`
  - **UI Changes:** `src/groovy/umig/web/js/`, `src/groovy/umig/web/css/`, `src/groovy/umig/macros/`
  - **Documentation:** `docs/`, `README.md`, `CHANGELOG.md`, `*.md` files
  - **Tests:** `src/groovy/umig/tests/`, `local-dev-setup/__tests__/`
  - **Configuration:** `local-dev-setup/liquibase/`, `*.json`, `*.yml`, `*.properties`
  - **Database:** Migration files, schema changes
* **Cross-Functional Impact:** Identify changes that span multiple functional areas.

**1.3. Work Stream Identification:**
* **Primary Work Streams:** Based on commits and file changes, identify distinct work streams (e.g., "API implementation", "UI refactoring", "documentation updates").
* **Secondary Work Streams:** Identify supporting work (e.g., "schema fixes", "test updates", "configuration changes").
* **Parallel vs Sequential:** Determine which work streams were done in parallel vs. sequence.
* **Dependencies:** Note how different work streams depend on each other.

**2. Multi-Stream Narrative Synthesis (MANDATORY - Address tunnel vision):**

A PR is a story that may have multiple parallel themes. You need to explain the "why," the "what," and the "how" for each work stream.

**2.1. Context and Motivation Analysis:**
* **Development Context:** Review recent dev journal entries, session context, and any associated tickets (e.g., Jira, GitHub Issues).
* **Problem Statement:** For each work stream, clearly articulate:
  - What problem was being solved or feature being added?
  - What was the state of the application before this change?
  - What will it be after?
* **Business Impact:** Explain the user-facing or technical benefits of the changes.
* **Scope Evolution:** If the PR scope expanded during development, explain how and why.

**2.2. Technical Implementation Analysis:**
* **Architecture Overview:** Describe the overall technical approach and any significant architectural decisions.
* **Work Stream Details:** For each work stream identified in step 1:
  - **API Changes:** New endpoints, schema modifications, repository patterns
  - **UI Changes:** Component modifications, styling updates, user experience improvements
  - **Documentation:** What docs were updated and why
  - **Database Changes:** Schema migrations, data model updates
  - **Configuration:** Environment or build configuration changes
  - **Tests:** New test coverage, test framework updates
* **Technical Decisions:** Explain why you chose specific solutions over alternatives.
* **Patterns and Standards:** Note adherence to or establishment of new project patterns.

**2.3. Integration and Dependencies:**
* **Cross-Stream Integration:** How different work streams work together.
* **Breaking Changes:** Any breaking changes and migration path.
* **Backward Compatibility:** How existing functionality is preserved.
* **Future Implications:** What this change enables for future development.

**3. Comprehensive Review Instructions (MANDATORY - Cover all work streams):**

Make it easy for others to review your work across all functional areas.

**3.1. Testing Instructions by Work Stream:**
* **API Testing:** For each new or modified API endpoint:
  - Provide curl commands or Postman collection references
  - Include expected request/response examples
  - Note any authentication or setup requirements
  - Identify edge cases and error scenarios to test
* **UI Testing:** For each UI change:
  - Provide step-by-step user interaction flows
  - Include screenshots or GIFs showing before/after states
  - Identify specific user scenarios to test
  - Note any browser-specific considerations
* **Database Testing:** For schema changes:
  - Provide migration verification steps
  - Include data verification queries
  - Note any rollback procedures
* **Configuration Testing:** For environment changes:
  - Provide setup or configuration verification steps
  - Include any new environment variables or settings
  - Note any deployment considerations

**3.2. Review Focus Areas:**
* **Code Quality:** Highlight areas that need particular attention (complex logic, new patterns, potential performance impacts).
* **Security:** Note any security considerations or authentication changes.
* **Performance:** Identify any performance-critical changes or optimizations.
* **Compatibility:** Note any backward compatibility concerns or breaking changes.

**3.3. Verification Checklist:**
* **Functional Verification:** What specific functionality should reviewers verify works correctly?
* **Integration Testing:** How should reviewers verify that different components work together?
* **Edge Case Testing:** What edge cases or error conditions should be tested?
* **Documentation Review:** What documentation should be reviewed for accuracy and completeness?

**4. Enhanced PR Description Template (MANDATORY - Multi-stream aware):**

Use a structured template that accommodates multiple work streams and comprehensive coverage.

**4.1. Title Construction:**
* **Primary Work Stream:** Use the most significant work stream for the title following Conventional Commits standard.
* **Multi-Stream Indicator:** If multiple significant work streams exist, use a broader scope (e.g., `feat(admin): complete user management system with API and UI`).

**4.2. Enhanced Body Template:**

```markdown
## Summary
<!-- Brief overview of the PR's purpose and scope. What problem does this solve? -->

## Work Streams
<!-- List all major work streams in this PR -->
### 🚀 [Primary Work Stream Name]
- Brief description of changes
- Key files modified
- Impact on users/system

### 🔧 [Secondary Work Stream Name]
- Brief description of changes
- Key files modified
- Impact on users/system

## Technical Changes
<!-- Detailed breakdown by functional area -->
### API Changes
- New endpoints: 
- Modified endpoints:
- Schema changes:
- Repository updates:

### UI Changes
- New components:
- Modified components:
- Styling updates:
- User experience improvements:

### Database Changes
- Schema migrations:
- Data model updates:
- Migration scripts:

### Documentation Updates
- API documentation:
- User documentation:
- Developer documentation:
- Configuration documentation:

## Testing Instructions
<!-- Work stream specific testing -->
### API Testing
1. [Specific API test steps]
2. [Expected outcomes]
3. [Edge cases to verify]

### UI Testing
1. [Specific UI test steps]
2. [User flows to verify]
3. [Browser compatibility checks]

### Database Testing
1. [Migration verification]
2. [Data integrity checks]
3. [Rollback verification]

## Screenshots / Recordings
<!-- Visual evidence of changes -->
### Before
[Screenshots/GIFs of old behavior]

### After
[Screenshots/GIFs of new behavior]

## Review Focus Areas
<!-- Areas needing particular attention -->
- [ ] **Code Quality:** [Specific areas to focus on]
- [ ] **Security:** [Security considerations]
- [ ] **Performance:** [Performance impacts]
- [ ] **Compatibility:** [Breaking changes or compatibility concerns]

## Deployment Notes
<!-- Any special deployment considerations -->
- Environment variables:
- Configuration changes:
- Database migrations:
- Rollback procedures:

## Related Issues
<!-- Link to any related issues, e.g., "Closes #123" -->

## Checklist
- [ ] All work streams are documented above
- [ ] Testing instructions cover all functional areas
- [ ] Documentation is updated for all changes
- [ ] Database migrations are tested
- [ ] API changes are documented
- [ ] UI changes are demonstrated with screenshots
- [ ] Code follows project style guidelines
- [ ] All tests pass
- [ ] Breaking changes are documented
- [ ] Deployment considerations are noted
```

**5. Anti-Tunnel Vision Verification (MANDATORY - Use before finalizing):**

Before presenting the PR description, verify you have addressed ALL of the following:

**Content Coverage:**
- [ ] All commits in the PR are explained
- [ ] All modified files are accounted for
- [ ] All functional areas touched are documented
- [ ] All work streams are identified and described
- [ ] Cross-functional impacts are noted

**Technical Completeness:**
- [ ] API changes include endpoint details and examples
- [ ] UI changes include visual evidence and user flows
- [ ] Database changes include migration details
- [ ] Configuration changes include deployment notes
- [ ] Documentation updates are comprehensive

**Review Readiness:**
- [ ] Testing instructions are clear and complete
- [ ] Review focus areas are identified
- [ ] Deployment considerations are documented
- [ ] Rollback procedures are noted (if applicable)
- [ ] Breaking changes are clearly highlighted

**6. Final Review:**

* Present the generated PR title and body to the user for final review and approval before they create the pull request on their Git platform.