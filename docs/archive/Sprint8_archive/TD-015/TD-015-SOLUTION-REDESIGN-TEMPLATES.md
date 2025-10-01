# TD-015: Solution - Redesign Email Templates Without GSP Scriptlets

**Date**: September 30, 2025
**Sprint**: Sprint 8
**Status**: Proposed Solution
**Priority**: High

---

## Problem Summary

Email templates stored in the database use GSP (Groovy Server Pages) syntax with `<% %>` scriptlets for conditionals and loops. These templates **cannot be processed** outside of a Grails/Spring GSP runtime environment.

###Failed Approaches (All Tested)

1. **SimpleTemplateEngine**: Parse errors on line 19 (quotes in HTML attributes)
2. **StreamingTemplateEngine**: Same parse errors
3. **GString Template Engine**: Same parse errors
4. **Custom Code Generation (v1-v4)**: Insurmountable escaping issues with single quotes in GString expressions

---

## Root Cause Analysis

### Why GSP Processing Fails

GSP templates mix three syntaxes that are incompatible outside Grails:

```gsp
${stepInstance.sti_name ?: 'Step'}           <!-- GString with string literal -->
<% if (migrationCode) { %>                   <!-- Control flow scriptlet -->
  <p>${migrationCode}</p>                    <!-- Content inside conditional -->
<% } %>                                      <!-- Closing brace -->
```

**Problems**:

1. **Quote escaping**: Single quotes in `?: 'Step'` break when embedded in triple-quoted strings
2. **Context preservation**: Scriptlets `<% %>` control what content appears, but processing them individually loses context
3. **Runtime evaluation**: GSP expects full Grails context with request, response, session objects

### Technical Evidence

**Error Examples**:

```
Script1.groovy: 20: Unexpected character: '\'' @ line 20, column 71.
    - ${stepInstance.sti_name ?: 'Step
                                 ^
```

When we escape quotes (`\'`), triple-quoted strings treat backslashes literally:

```
Script1.groovy: 20: Unexpected character: '\' @ line 20, column 34.
         ${stepInstance.sti_code ?: \'STEP\'}
                                    ^
```

---

## Proposed Solution: Template Redesign

### Strategy

**Remove all GSP scriptlets (`<% %>`) and replace with:**

1. Simple `${}` variable substitution only
2. Pre-process conditionals in Groovy code BEFORE template rendering
3. Pre-format loops/lists into HTML strings in Groovy code

### Implementation Plan

#### Phase 1: Analyze Template Usage

**Count scriptlet types** in current templates:

```sql
SELECT
  emt_type,
  LENGTH(emt_body_html) - LENGTH(REPLACE(emt_body_html, '<%', '')) / 2 as scriptlet_count
FROM email_templates_emt
WHERE emt_is_active = true;
```

**Categories**:

- Conditionals: `<% if (condition) { %>` ... `<% } %>`
- Loops: `<% collection.eachWithIndex { item, index -> %>` ... `<% } %>`
- Else blocks: `<% } else { %>`

#### Phase 2: Redesign Templates

**Pattern 1: Conditionals → Pre-processed Variables**

**OLD (GSP scriptlet)**:

```gsp
<% if (migrationCode && iterationCode) { %>
  ${migrationCode} › ${iterationCode}
<% } else { %>
  Migration › Iteration
<% } %>
```

**NEW (Pre-processed variable)**:

```groovy
// In EnhancedEmailService.groovy - before calling processTemplate()
def breadcrumb = (migrationCode && iterationCode)
  ? "${migrationCode} › ${iterationCode}"
  : "Migration › Iteration"

variables.put('breadcrumb', breadcrumb)
```

**Template becomes**:

```html
${breadcrumb}
```

**Pattern 2: Loops → Pre-formatted HTML**

**OLD (GSP loop)**:

```gsp
<% if (stepInstance.instructions && stepInstance.instructions.size() > 0) { %>
  <% stepInstance.instructions.eachWithIndex { instruction, index -> %>
    <tr>
      <td>${instruction.ini_name}</td>
      <td>${instruction.ini_duration_minutes} min</td>
    </tr>
  <% } %>
<% } else { %>
  <p>No instructions defined.</p>
<% } %>
```

**NEW (Pre-formatted HTML string)**:

```groovy
// In EnhancedEmailService.groovy
def instructionsHtml = new StringBuilder()
if (stepInstance.instructions && stepInstance.instructions.size() > 0) {
    stepInstance.instructions.each { instruction ->
        instructionsHtml.append("<tr>")
        instructionsHtml.append("  <td>${instruction.ini_name}</td>")
        instructionsHtml.append("  <td>${instruction.ini_duration_minutes} min</td>")
        instructionsHtml.append("</tr>")
    }
} else {
    instructionsHtml.append("<p>No instructions defined.</p>")
}

variables.put('instructionsHtml', instructionsHtml.toString())
```

**Template becomes**:

```html
<table>
  ${instructionsHtml}
</table>
```

**Pattern 3: Nested Conditionals → Flattened Variables**

**OLD (Nested GSP)**:

```gsp
<% if (stepInstance.sti_duration_minutes) { %>
  ${stepInstance.sti_duration_minutes} min
<% } %>
<% if (stepInstance.sti_duration_minutes && stepInstance.environment_name) { %>
  |
<% } %>
<% if (stepInstance.environment_name) { %>
  ${stepInstance.environment_name}
<% } %>
```

**NEW (Pre-formatted string)**:

```groovy
def durationAndEnv = []
if (stepInstance.sti_duration_minutes) {
    durationAndEnv.add("${stepInstance.sti_duration_minutes} min")
}
if (stepInstance.environment_name) {
    durationAndEnv.add(stepInstance.environment_name)
}

variables.put('durationAndEnvironment', durationAndEnv.join(' | '))
```

**Template becomes**:

```html
${durationAndEnvironment}
```

#### Phase 3: Update EnhancedEmailService

**Modify sendStepStatusChangedNotificationWithUrl()** (lines 71-260):

```groovy
// Build enhanced variables map with pre-processed content
def variables = [
    // Simple variables (unchanged)
    stepInstance: stepInstanceForEmail,
    migrationCode: migrationCode,
    iterationCode: iterationCode,
    oldStatus: oldStatus,
    newStatus: newStatus,

    // Pre-processed conditionals
    breadcrumb: buildBreadcrumb(migrationCode, iterationCode, stepInstanceForEmail),

    // Pre-formatted HTML blocks
    instructionsHtml: buildInstructionsHtml(stepInstanceForEmail.instructions),
    commentsHtml: buildCommentsHtml(stepInstanceForEmail.recentComments),
    durationAndEnvironment: buildDurationAndEnvironment(stepInstanceForEmail),

    // Pre-formatted links
    stepViewLinkHtml: buildStepViewLink(stepViewUrl, hasStepViewUrl)
]
```

**Add helper methods**:

```groovy
private static String buildBreadcrumb(String migrationCode, String iterationCode, Map stepInstance) {
    if (migrationCode && iterationCode) {
        def parts = [migrationCode, iterationCode]
        if (stepInstance.plan_name) parts.add(stepInstance.plan_name)
        if (stepInstance.sequence_name) parts.add(stepInstance.sequence_name)
        if (stepInstance.phase_name) parts.add(stepInstance.phase_name)
        return parts.join(' › ')
    } else {
        return "${stepInstance.migration_name ?: 'Migration'} › ${stepInstance.iteration_name ?: 'Iteration'}"
    }
}

private static String buildInstructionsHtml(List instructions) {
    if (!instructions || instructions.size() == 0) {
        return "<p>No instructions defined for this step.</p>"
    }

    def html = new StringBuilder()
    instructions.eachWithIndex { instruction, index ->
        html.append("""
            <tr>
                <td>${instruction.completed ? '✓' : (index + 1)}</td>
                <td>${instruction.ini_name ?: instruction.description ?: "Instruction ${index + 1}"}</td>
                <td>${instruction.ini_duration_minutes ? instruction.ini_duration_minutes + ' min' : '-'}</td>
                <td>${instruction.team_name ?: '-'}</td>
                <td>${instruction.control_code ?: '-'}</td>
            </tr>
        """)
    }
    return html.toString()
}

private static String buildCommentsHtml(List comments) {
    if (!comments || comments.size() == 0) {
        return "<p>No comments yet. Be the first to add your insights!</p>"
    }

    def html = new StringBuilder()
    comments.take(3).each { comment ->
        html.append("""
            <div class="comment">
                <div class="comment-author">${comment.author_name ?: 'Anonymous'}</div>
                <div class="comment-date">${comment.created_at ?: 'Recent'}</div>
                <div class="comment-text">${comment.comment_text ?: ''}</div>
            </div>
        """)
    }
    return html.toString()
}

private static String buildDurationAndEnvironment(Map stepInstance) {
    def parts = []
    if (stepInstance.sti_duration_minutes) {
        parts.add("${stepInstance.sti_duration_minutes} min")
    }
    if (stepInstance.environment_name) {
        parts.add(stepInstance.environment_name)
    }
    return parts.join(' | ')
}

private static String buildStepViewLink(String stepViewUrl, boolean hasStepViewUrl) {
    if (hasStepViewUrl && stepViewUrl) {
        return """
            <a href="${stepViewUrl}" class="btn-primary">
                🔗 View in Confluence
            </a>
            <p>Click to view this step with live updates and collaboration features</p>
        """
    } else {
        return """
            <p>📌 Access Information:</p>
            <p>Direct link is not available. Please access the UMIG system in Confluence
               to view the most current step details and collaborate with your team.</p>
        """
    }
}
```

#### Phase 4: Simplify processTemplate()

**Remove all template engine logic**:

```groovy
private static String processTemplate(String templateText, Map variables) {
    try {
        // Use Groovy's GStringTemplateEngine with simple ${} substitution
        def engine = new groovy.text.GStringTemplateEngine()
        def template = engine.createTemplate(templateText)
        def binding = variables

        return template.make(binding).toString()

    } catch (Exception e) {
        println "❌ Template processing error: ${e.message}"
        return templateText
    }
}
```

#### Phase 5: Create New Template Migrations

**Create Liquibase changelog**: `034_td015_simplify_email_templates.sql`

```sql
-- Update STEP_STATUS_CHANGED template to use pre-processed variables
UPDATE email_templates_emt
SET emt_body_html =
'<!doctype html>
<html lang="en">
  <head>
    <title>${stepInstance.sti_code ?: "STEP"} - ${stepInstance.sti_name ?: "Step Details"} | UMIG</title>
    <style>/* ... existing styles ... */</style>
  </head>
  <body>
    <h1>📋 ${stepInstance.sti_name}</h1>
    <div class="breadcrumb">${breadcrumb}</div>

    <div class="status-badge">${newStatus}</div>
    <div class="last-update">
      LAST UPDATE: ${changedAt}
      ${statusChange}
    </div>

    <h2>📊 Step Summary</h2>
    <table>
      <tr>
        <td>Duration & Environment</td>
        <td>${durationAndEnvironment}</td>
      </tr>
      <tr>
        <td>Assigned Team</td>
        <td>${stepInstance.team_name}</td>
      </tr>
      <tr>
        <td>Impacted Teams</td>
        <td>${stepInstance.impacted_teams ?: "-"}</td>
      </tr>
      <tr>
        <td>Predecessor</td>
        <td>${stepInstance.predecessor_code} ${predecessorName}</td>
      </tr>
    </table>

    ${descriptionHtml}

    <h2>📝 Instructions</h2>
    <table>
      <thead>
        <tr><th>Instruction</th><th>Duration</th><th>Team</th><th>Control</th></tr>
      </thead>
      <tbody>
        ${instructionsHtml}
      </tbody>
    </table>

    ${stepViewLinkHtml}

    <h2>💬 Recent Comments</h2>
    ${commentsHtml}

    <footer>
      <p>UMIG - Unified Migration Implementation Guide</p>
      <p>This step is part of the migration "${migrationCode}".</p>
    </footer>
  </body>
</html>'
WHERE emt_type = 'STEP_STATUS_CHANGED' AND emt_is_active = true;
```

---

## Impact Assessment

### Files to Modify

1. **EnhancedEmailService.groovy**
   - Add helper methods for pre-processing
   - Simplify processTemplate() to use GStringTemplateEngine only
   - Update sendStepStatusChangedNotificationWithUrl()
   - Update sendStepOpenedNotificationWithUrl()
   - Update sendInstructionCompletedNotificationWithUrl()

2. **Liquibase Changelog**
   - Create `034_td015_simplify_email_templates.sql`
   - Update all 3 templates (STEP_STATUS_CHANGED, STEP_OPENED, INSTRUCTION_COMPLETED)

3. **Testing**
   - Update `render-email-template-preview.js` to use new pre-processing
   - Update email service tests

### Benefits

✅ **Reliability**: No more template engine failures
✅ **Maintainability**: Clear separation of logic (Groovy) vs presentation (HTML)
✅ **Testability**: Pre-processing logic can be unit tested
✅ **Performance**: Simpler template processing (no scriptlet parsing)
✅ **Debuggability**: Errors occur in Groovy code, not template strings

### Risks

⚠️ **Migration Complexity**: Moderate - requires Liquibase migration
⚠️ **Testing Effort**: High - all 3 templates need comprehensive testing
⚠️ **Rollback**: Medium - can rollback via Liquibase if needed

---

## Implementation Timeline

### Day 1: Template Redesign (4 hours)

- Map all scriptlets in current templates
- Design pre-processing helper methods
- Create simplified template HTML (all 3 types)

### Day 2: Code Implementation (6 hours)

- Implement helper methods in EnhancedEmailService
- Update all 3 email notification methods
- Simplify processTemplate() method
- Create Liquibase migration

### Day 3: Testing (6 hours)

- Update preview renderer script
- Test all 3 email types with various data scenarios
- Test edge cases (empty lists, null values, missing data)
- Verify MailHog rendering across email clients

### Day 4: Documentation & Deployment (2 hours)

- Update TD-015 documentation
- Create ADR documenting this decision
- Deploy to development environment
- Verify production readiness

**Total Effort**: ~18 hours (2.25 days)

---

## Alternative Considered: Keep GSP Templates

**Option**: Deploy a full Grails GSP rendering engine

**Pros**:

- No template changes needed
- "Standard" GSP approach

**Cons**:

- ❌ Massive dependency overhead (entire Grails framework)
- ❌ Overkill for 3 email templates
- ❌ Performance impact (heavy framework for simple task)
- ❌ Maintenance burden (keep Grails version updated)
- ❌ Complexity (Grails lifecycle, Spring context, etc.)

**Verdict**: **REJECTED** - Pre-processing is simpler, lighter, more maintainable

---

## Recommendation

**PROCEED** with template redesign approach:

1. **Immediate**: Create helper methods for pre-processing
2. **Short-term**: Redesign all 3 templates without GSP scriptlets
3. **Medium-term**: Create Liquibase migration
4. **Testing**: Comprehensive testing with MailHog
5. **Deployment**: Deploy to development, then production

**Expected Completion**: Sprint 8, Week 2 (October 7-11, 2025)

---

## Questions & Answers

**Q**: Why can't we just fix the quote escaping?
**A**: Triple-quoted GStrings in Groovy treat backslashes literally. There's no escaping mechanism that works for all cases (single quotes, double quotes, backslashes, dollar signs).

**Q**: Can we use a different template engine?
**A**: All Groovy template engines (Simple, Streaming, GString) fail on GSP syntax. Non-Groovy engines (Freemarker, Velocity) don't support Groovy expressions.

**Q**: What about using Grails GSP engine?
**A**: Possible but massive overkill - requires entire Grails framework for 3 templates. Pre-processing is 100× simpler.

**Q**: Will this affect email appearance?
**A**: No - final HTML output will be identical. Only the processing approach changes (Groovy code instead of GSP scriptlets).

**Q**: What if we need conditional logic later?
**A**: Add it in the pre-processing helper methods in Groovy code. Much easier to test and debug than template scriptlets.

---

**Status**: ✅ RECOMMENDED APPROACH
**Next Steps**: Create JIRA story, implement Phase 1

---

_This solution was determined after exhaustive testing of all available template processing approaches during TD-015 Email Template Bug Fix work._
