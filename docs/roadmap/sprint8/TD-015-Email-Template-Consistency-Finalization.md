# TD-015: Email Template Consistency and Finalization

## Story Metadata

**Story ID**: TD-015
**Type**: Technical Debt
**Epic**: EmailService Enhancement Suite
**Sprint**: Sprint 8 - Security Architecture Enhancement
**Priority**: P1 (High - Blocking Email Feature Completion)
**Story Points**: 5 points
**Status**: READY FOR SPRINT 8
**Created**: September 30, 2025
**Owner**: Backend Development + Frontend Integration
**Dependencies**: US-058 Phase 2 (COMPLETE ✅)
**Branch**: bugfix/US-058-email-service-iteration-step-views
**Risk**: LOW (Configuration and Documentation)

---

## Executive Summary

Following the successful completion of US-058 Phase 2 which restored email functionality for IterationView and StepView notifications, TD-015 addresses critical technical debt in email template consistency and configuration. This story consolidates multiple template versions, validates database templates against specifications, ensures mobile-responsive design completeness, and establishes a single canonical template source for production use.

### Business Context

**Problem**: Multiple email template versions exist across mock files, HTML templates, and database changelogs (Liquibase 024, 027), creating inconsistency and maintenance challenges. Template specifications span 1,404-1,459 lines with comprehensive mobile-responsive design (320px-1000px), but database templates may not fully align with these specifications.

**Impact**:
- Risk of inconsistent email rendering across devices and clients
- Maintenance overhead from multiple template sources
- Potential variable binding failures in EmailService
- Incomplete mobile-responsive implementation (320px-1000px target)

**Solution**: Audit all template versions, consolidate to single canonical source (enhanced-mobile-email-template.html), validate database templates, verify variable bindings, and conduct comprehensive end-to-end testing across email clients and devices.

**Value Delivered**:
- ✅ Single source of truth for email templates
- ✅ 100% mobile-responsive design verification (320px-1000px)
- ✅ Enhanced maintenance and consistency
- ✅ Complete variable binding validation
- ✅ Production-ready email notification system

---

## User Story Statement

**As a** UMIG System Administrator
**I want** consistent, production-ready email templates with verified mobile-responsive design
**So that** all email notifications render perfectly across devices (mobile, tablet, desktop) and email clients (Gmail, Outlook, Apple Mail)

### Value Statement

This technical debt story eliminates template inconsistencies, validates mobile-responsive design implementation, and establishes a maintainable email template architecture. By consolidating to a single canonical template source and validating all variable bindings, we ensure reliable email notifications with professional appearance across all user contexts.

---

## Acceptance Criteria

### AC-TD-015.1: Template Audit and Analysis (1 point)

**Given** multiple email template versions exist across the codebase
**When** conducting comprehensive template audit
**Then** document and analyze:

1. **Template Inventory**:
   - ✅ Mock template: `/docs/roadmap/ux-ui/mock/mobile-email-template-mock.html` (1,404 lines)
   - ✅ Base template: `/docs/roadmap/ux-ui/email-template.html` (753 lines)
   - ✅ Enhanced template: `/docs/roadmap/ux-ui/enhanced-mobile-email-template.html` (1,459 lines)
   - ✅ Liquibase 024: `024_enhance_mobile_email_templates.sql` (594 lines)
   - ✅ Liquibase 027: `027_email_templates_with_urls.sql` (389 lines)

2. **Template Comparison Matrix**:
   - Document feature differences (header, breadcrumb, instructions table, CTAs, footer)
   - Identify mobile-responsive CSS variations
   - Compare GSP/Groovy variable syntax usage
   - Analyze Outlook compatibility implementations
   - List discrepancies and inconsistencies

3. **Technical Debt Assessment**:
   - Quantify duplication and maintenance overhead
   - Identify missing features in database templates
   - Document variable binding gaps
   - List incomplete responsive design areas

**Deliverable**: `/docs/roadmap/sprint8/TD-015-Template-Audit-Report.md`

### AC-TD-015.2: Database Template Validation (1 point)

**Given** database templates in `email_templates_emt` table
**When** validating against enhanced template specifications
**Then** ensure:

1. **Template Type Coverage**:
   - ✅ STEP_STATUS_CHANGED template exists and complete
   - ✅ STEP_OPENED template exists and complete
   - ✅ INSTRUCTION_COMPLETED template exists and complete
   - ✅ STEP_NOTIFICATION_MOBILE template exists (if applicable)
   - ✅ *_WITH_URL variants exist for UrlConstructionService integration
   - ✅ Constraint checks allow all required types

2. **Mobile-Responsive CSS Validation**:
   - ✅ Media queries present for: 320px-600px (mobile), 601px-768px (tablet), 769px-1000px (desktop)
   - ✅ Touch-friendly button sizing (44px minimum height)
   - ✅ Responsive table implementation for instructions
   - ✅ Dark mode support CSS included
   - ✅ Print styles included
   - ✅ Outlook compatibility CSS complete

3. **Template Structure Validation**:
   - ✅ All CSS classes match enhanced template specification
   - ✅ HTML structure follows email-safe patterns
   - ✅ Inline styles properly applied (email client compatibility)
   - ✅ Conditional comments for Outlook present
   - ✅ Meta tags complete (viewport, format-detection, etc.)

4. **Content Validation**:
   - ✅ Header section: gradient background, breadcrumb navigation, status badges
   - ✅ Instructions table: responsive layout with completion indicators
   - ✅ CTA buttons: Confluence StepView URL links properly configured
   - ✅ Comments section: recent comments display (up to 3)
   - ✅ Footer: links, disclaimers, timestamps

**Deliverable**: Updated Liquibase changelogs if corrections needed, validation report

### AC-TD-015.3: Template Consolidation (1 point)

**Given** audit and validation complete
**When** consolidating to single canonical template source
**Then** implement:

1. **Canonical Template Selection**:
   - ✅ Select `enhanced-mobile-email-template.html` as canonical version
   - ✅ Document rationale for selection (completeness, mobile-responsive, GSP syntax)
   - ✅ Archive or remove outdated template versions
   - ✅ Update documentation to reference canonical template

2. **Database Template Updates**:
   - ✅ Create new Liquibase changelog if database templates need corrections
   - ✅ Update `email_templates_emt` records to match canonical version
   - ✅ Validate constraint checks allow all template types
   - ✅ Test Liquibase migration in local environment

3. **EmailService Integration**:
   - ✅ Review `EmailService.groovy` template selection logic
   - ✅ Document template selection algorithm for each notification type
   - ✅ Ensure fallback mechanisms for missing templates
   - ✅ Validate template caching strategy (if implemented)

4. **Documentation Updates**:
   - ✅ Update `/docs/api/email-service.md` with template architecture
   - ✅ Document template variables and expected values
   - ✅ Create template maintenance guide
   - ✅ Add troubleshooting section for template issues

**Deliverable**: Consolidated template architecture, updated documentation

### AC-TD-015.4: Variable Binding Validation (1 point)

**Given** canonical template uses GSP/Groovy syntax
**When** testing variable population in EmailService
**Then** validate:

1. **Step Instance Variables**:
   ```groovy
   ${stepInstance.sti_code}          // Step code (e.g., "DB-001")
   ${stepInstance.sti_name}          // Step name (e.g., "Database Migration - User Tables")
   ${stepInstance.sti_description}   // Step description
   ${stepInstance.sti_status}        // Current step status
   ${stepInstance.sti_assigned_team_id} // Assigned team
   ```

2. **Context Variables**:
   ```groovy
   ${migrationCode}    // Migration identifier (e.g., "MIG-2025-Q1")
   ${iterationCode}    // Iteration identifier (e.g., "ITER-001")
   ${planCode}         // Plan identifier (e.g., "PLAN-001")
   ${phaseCode}        // Phase identifier (e.g., "PHASE-001")
   ${oldStatus}        // Previous status (status change notifications)
   ${newStatus}        // New status (status change notifications)
   ${statusColor}      // CSS color for status badge
   ```

3. **URL Variables** (UrlConstructionService Integration):
   ```groovy
   ${hasStepViewUrl}   // Boolean flag for URL availability
   ${stepViewUrl}      // Complete URL to StepView in Confluence
   ```

4. **Comments Variables**:
   ```groovy
   ${recentComments}   // List of recent comments (up to 3)
   ${hasComments}      // Boolean flag for comments section
   ```

5. **Metadata Variables**:
   ```groovy
   ${timestamp}        // Email generation timestamp
   ${environmentName}  // Environment (DEV/TEST/PROD)
   ${systemVersion}    // UMIG version
   ```

**Testing Approach**:
- Create test data covering all variable scenarios
- Send test emails via MailHog for each template type
- Verify all variables populate correctly in rendered HTML
- Test null/missing value handling (graceful degradation)
- Validate GSP expression evaluation errors are caught

**Deliverable**: Variable binding test suite, validation report

### AC-TD-015.5: End-to-End Testing (1 point)

**Given** consolidated templates deployed to local environment
**When** conducting comprehensive end-to-end testing
**Then** verify:

1. **Email Client Testing**:
   - ✅ Gmail web interface: rendering, responsive design, CTAs
   - ✅ Gmail mobile app (iOS/Android): touch interactions, layout
   - ✅ Outlook desktop (Windows): Outlook-specific CSS, compatibility
   - ✅ Outlook web: web rendering, responsive design
   - ✅ Apple Mail (macOS/iOS): native rendering, dark mode
   - ✅ Thunderbird: open-source client compatibility

2. **Responsive Design Validation**:
   - ✅ Mobile First (320px-600px): layout, font sizes, touch targets
   - ✅ Tablet (601px-768px): intermediate breakpoint behavior
   - ✅ Desktop (769px-1000px): full-width rendering
   - ✅ Media query activation at correct breakpoints
   - ✅ Content reflow and readability at all sizes

3. **Feature Validation**:
   - ✅ Header gradient background renders correctly
   - ✅ Breadcrumb navigation visible and formatted
   - ✅ Status badges display with correct colors
   - ✅ Instructions table responsive at all breakpoints
   - ✅ Completion indicators visible (✓/○)
   - ✅ CTA buttons render with 44px min height (touch-friendly)
   - ✅ StepView URLs link correctly to Confluence
   - ✅ Comments section displays recent comments
   - ✅ Footer links and disclaimers present

4. **Edge Cases**:
   - ✅ Long step names and descriptions (text wrapping)
   - ✅ Missing stepViewUrl (graceful degradation)
   - ✅ No comments available (section hidden)
   - ✅ Long instruction lists (pagination/truncation)
   - ✅ Special characters in text (HTML entity encoding)

5. **Dark Mode Testing**:
   - ✅ Dark mode CSS activates in supporting clients
   - ✅ Color contrast sufficient in dark mode
   - ✅ Background/foreground color inversion correct

6. **Print Styles**:
   - ✅ Print-friendly layout activated
   - ✅ Unnecessary elements hidden (buttons, interactive elements)
   - ✅ Content readable when printed

**Testing Commands**:
```bash
npm run email:test                    # Send test emails via MailHog
npm run mailhog:check                 # Verify email receipt
npm run mailhog:clear                 # Clear test inbox
npm run test:js:integration -- emailService  # Integration tests
```

**Deliverable**: Test results matrix, screenshots from email clients, validation report

---

## Technical Implementation Plan

### Phase 1: Template Audit and Documentation (Day 1 - 8 hours)

#### 1.1 Template Inventory Collection
- Read all template files (mock, base, enhanced, Liquibase)
- Extract structure, features, and variable usage
- Document line counts, complexity metrics
- Identify key differences and overlaps

#### 1.2 Comparison Matrix Creation
- Build side-by-side comparison of templates
- Categorize by section: header, body, instructions, CTA, footer
- Compare mobile-responsive implementations
- Analyze Outlook compatibility approaches
- Document variable syntax variations

#### 1.3 Technical Debt Quantification
- Calculate duplication percentage
- Estimate maintenance overhead
- Identify missing features in database templates
- List incomplete responsive design areas
- Prioritize remediation items

**Output**: `/docs/roadmap/sprint8/TD-015-Template-Audit-Report.md`

### Phase 2: Database Template Validation (Day 1-2 - 8 hours)

#### 2.1 Database Schema Review
- Query `email_templates_emt` table structure
- Verify template type constraint checks
- List all existing template records
- Check for missing template types

#### 2.2 Template Content Validation
- Extract database template HTML
- Compare against enhanced template specification
- Validate mobile-responsive CSS presence
- Check Outlook compatibility CSS
- Verify all required sections present

#### 2.3 Liquibase Changelog Review
- Review Liquibase 024 (mobile-responsive enhancements)
- Review Liquibase 027 (URL support)
- Identify gaps or inconsistencies
- Plan corrective changelog if needed

#### 2.4 Create Corrective Changelog (if needed)
- Design new Liquibase changelog (`028_email_template_consolidation.sql`)
- Update `email_templates_emt` records
- Add missing template types if needed
- Update constraint checks
- Test migration locally

**Output**: Validated database templates, new Liquibase changelog (if needed)

### Phase 3: Template Consolidation (Day 2 - 8 hours)

#### 3.1 Canonical Template Selection
- Select `enhanced-mobile-email-template.html` as canonical
- Document selection rationale:
  - Most complete implementation (1,459 lines)
  - Full mobile-responsive design (320px-1000px)
  - Comprehensive GSP variable syntax
  - Dark mode and print styles included
  - Outlook compatibility complete
  - Comments section implemented

#### 3.2 Database Template Updates
- Apply new Liquibase changelog (if created)
- Validate templates in database match canonical
- Test template retrieval in EmailService
- Verify constraint checks work correctly

#### 3.3 Archive Outdated Templates
- Move mock template to `/docs/archive/email-templates/`
- Move base template to `/docs/archive/email-templates/`
- Update repository documentation
- Add deprecation notices to archived files

#### 3.4 EmailService Integration Review
- Review `EmailService.groovy` template selection:
  ```groovy
  private String getTemplateForNotificationType(String notificationType) {
      // Map notification type to email_templates_emt.emt_type
      switch(notificationType) {
          case 'STEP_STATUS_CHANGED': return 'STEP_STATUS_CHANGED_WITH_URL'
          case 'STEP_OPENED': return 'STEP_OPENED_WITH_URL'
          case 'INSTRUCTION_COMPLETED': return 'INSTRUCTION_COMPLETED_WITH_URL'
          default: return 'STEP_NOTIFICATION_MOBILE'
      }
  }
  ```
- Validate fallback logic for missing templates
- Document template caching strategy
- Test template retrieval performance

**Output**: Consolidated template architecture, updated EmailService

### Phase 4: Variable Binding Validation (Day 2 - 8 hours)

#### 4.1 Variable Mapping Documentation
- List all GSP variables in canonical template
- Document expected data types and sources
- Map to EmailService variable population logic
- Identify variable dependencies (e.g., stepViewUrl requires UrlConstructionService)

#### 4.2 EmailService Variable Population Review
- Review `composeEmail()` method variable building:
  ```groovy
  def composeEmail(Map params) {
      def binding = [
          stepInstance: params.stepInstance,
          migrationCode: params.migrationCode,
          iterationCode: params.iterationCode,
          oldStatus: params.oldStatus,
          newStatus: params.newStatus,
          statusColor: getStatusColor(params.newStatus),
          hasStepViewUrl: params.stepViewUrl != null,
          stepViewUrl: params.stepViewUrl,
          recentComments: params.recentComments ?: [],
          hasComments: params.recentComments?.size() > 0,
          timestamp: new Date().format('yyyy-MM-dd HH:mm:ss'),
          environmentName: System.getProperty('environment.name') ?: 'DEV',
          systemVersion: '1.0.0'
      ]

      return templateEngine.createTemplate(templateHtml).make(binding).toString()
  }
  ```

#### 4.3 Test Data Creation
- Create comprehensive test datasets covering:
  - Typical step instance with all fields populated
  - Step with missing optional fields (description, comments)
  - Step with no stepViewUrl (UrlConstructionService unavailable)
  - Long step names and descriptions (text wrapping)
  - Special characters requiring HTML entity encoding

#### 4.4 Variable Binding Testing
- Send test emails for each dataset via MailHog
- Verify all variables populate correctly in rendered HTML
- Test null/missing value handling (graceful degradation)
- Validate GSP expression errors are caught and logged
- Check HTML entity encoding for special characters

**Output**: Variable binding test suite, validation report

### Phase 5: End-to-End Testing (Day 2-3 - 16 hours)

#### 5.1 MailHog Testing Infrastructure
- Configure MailHog for comprehensive testing
- Create test script for all template types:
  ```bash
  npm run email:test -- --template=STEP_STATUS_CHANGED
  npm run email:test -- --template=STEP_OPENED
  npm run email:test -- --template=INSTRUCTION_COMPLETED
  ```

#### 5.2 Email Client Testing Matrix
| Client | Platform | Tests |
|--------|----------|-------|
| Gmail | Web (Chrome/Firefox) | Rendering, responsive design, CTAs |
| Gmail | Mobile (iOS/Android) | Touch interactions, layout |
| Outlook | Desktop (Windows) | Outlook CSS, compatibility |
| Outlook | Web (Chrome/Edge) | Web rendering, responsive |
| Apple Mail | macOS | Native rendering, dark mode |
| Apple Mail | iOS | Mobile rendering, touch targets |
| Thunderbird | Desktop (macOS/Linux) | Open-source compatibility |

#### 5.3 Responsive Design Validation
- Test at breakpoints:
  - 320px (iPhone SE)
  - 375px (iPhone 12/13)
  - 414px (iPhone 12 Pro Max)
  - 600px (small tablet)
  - 768px (iPad portrait)
  - 1000px (desktop)
- Validate media query activation
- Check font size scaling
- Verify touch target sizing (44px minimum)
- Test content reflow and readability

#### 5.4 Feature Validation Checklist
- [ ] Header gradient background renders correctly
- [ ] Breadcrumb navigation visible and formatted
- [ ] Status badges display with correct colors
- [ ] Instructions table responsive at all breakpoints
- [ ] Completion indicators visible (✓/○)
- [ ] CTA buttons render with 44px min height
- [ ] StepView URLs link correctly to Confluence
- [ ] Comments section displays recent comments (or hidden if none)
- [ ] Footer links and disclaimers present
- [ ] Dark mode activates in supporting clients
- [ ] Print styles produce readable output

#### 5.5 Edge Case Testing
- Long step names (>100 characters) - test text wrapping
- Missing stepViewUrl - verify graceful degradation (CTA hidden or disabled)
- No comments - verify section hidden
- Long instruction lists (>10 instructions) - test table scrolling
- Special characters: `<script>`, `&`, `"`, `'` - verify HTML entity encoding

#### 5.6 Performance Testing
- Measure email composition time (<500ms target)
- Test template retrieval from database (<100ms)
- Validate caching effectiveness (if implemented)
- Check memory usage for large email batches

**Output**: Test results matrix, email client screenshots, performance metrics

---

## Success Criteria

### Critical Success Factors
1. ✅ **Single Canonical Template**: `enhanced-mobile-email-template.html` established as authoritative source
2. ✅ **Database Alignment**: 100% match between database templates and canonical version
3. ✅ **Variable Population**: All GSP variables populate correctly with zero errors
4. ✅ **Responsive Design**: Perfect rendering at all breakpoints (320px, 600px, 768px, 1000px)
5. ✅ **Email Client Compatibility**: Flawless rendering in Gmail, Outlook, Apple Mail
6. ✅ **StepView URLs**: Correct linking to Confluence for all notification types
7. ✅ **Documentation Complete**: Template architecture fully documented

### Quality Gates
- **Template Audit**: Comprehensive comparison matrix completed
- **Database Validation**: All template types present and correct
- **Variable Binding**: Zero GSP expression errors in test emails
- **Responsive Design**: Media queries activate correctly at all breakpoints
- **Email Clients**: Professional rendering in top 3 clients (Gmail, Outlook, Apple Mail)
- **Performance**: <500ms email composition, <100ms template retrieval

### Performance Metrics
- Email composition time: <500ms (target from US-058)
- Template retrieval: <100ms from database
- MailHog test email delivery: <1s
- Template size: <100KB HTML
- CSS efficiency: Inline styles for compatibility, <50KB

---

## Files to Create/Update

### New Documentation
1. `/docs/roadmap/sprint8/TD-015-Template-Audit-Report.md` - Comprehensive audit findings
2. `/docs/roadmap/sprint8/TD-015-Test-Results-Matrix.md` - Email client testing results
3. `/docs/api/email-template-architecture.md` - Template system documentation

### Updated Files
1. `/docs/api/email-service.md` - EmailService documentation updates
2. `/src/groovy/umig/utils/EmailService.groovy` - Template selection logic review
3. `/local-dev-setup/liquibase/changelogs/028_email_template_consolidation.sql` - New changelog (if needed)

### Archived Files
1. `/docs/archive/email-templates/mobile-email-template-mock.html` - Archived mock
2. `/docs/archive/email-templates/email-template.html` - Archived base template

### Configuration Updates
1. Database: `email_templates_emt` table updates via Liquibase
2. EmailService: Template selection algorithm documentation

---

## Testing Strategy

### Unit Testing
- EmailService template selection logic
- Variable binding in template engine
- Null/missing value handling
- HTML entity encoding

### Integration Testing
```bash
npm run test:js:integration -- emailService
```
- EmailService + TemplateEngine integration
- Database template retrieval
- UrlConstructionService integration
- Audit logging for email events

### MailHog Testing
```bash
npm run email:test                    # Send all template types
npm run mailhog:check                 # Verify receipt
npm run mailhog:clear                 # Clear inbox
```
- STEP_STATUS_CHANGED notifications
- STEP_OPENED notifications
- INSTRUCTION_COMPLETED notifications
- With/without stepViewUrl scenarios

### Manual Testing
- Email client rendering (Gmail, Outlook, Apple Mail)
- Mobile device testing (iOS, Android)
- Responsive design validation (320px-1000px)
- Dark mode activation
- Print styles verification

### Regression Testing
- Verify US-058 Phase 2 functionality maintained
- Test IterationView email integration
- Test StepView email integration
- Confirm no regressions in EmailService

---

## Risk Assessment

### Low Risk Factors
- Changes are primarily configuration and documentation
- Database updates via Liquibase (tested, reversible)
- Email testing via MailHog (non-production, safe)
- US-058 Phase 2 foundation is solid and tested

### Mitigation Strategies
1. **Database Changes**: Test Liquibase changelog in local environment first, create rollback if needed
2. **Template Validation**: Comprehensive testing before production deployment
3. **Variable Binding**: Extensive test coverage with edge cases
4. **Email Client Compatibility**: Test matrix covering major clients before release

### Rollback Plan
- Liquibase rollback available if database changes needed
- Archive previous templates for reference
- EmailService changes minimal and easily reversible

---

## Dependencies

### Completed Dependencies
- ✅ **US-058 Phase 2**: EmailService refactoring complete, email functionality operational
- ✅ **UrlConstructionService**: StepView URL generation functional
- ✅ **MailHog Setup**: Email testing infrastructure in place

### Sprint 8 Context
- **ADR-067 through ADR-070**: Security architecture enhancements (parallel work)
- **TOGAF Phase A-D**: Architecture documentation updates (reference material)

---

## Related Documentation

### User Stories
- **US-058**: EmailService Refactoring Phase 2 (completed - parent story)
- **US-039B**: Template Performance Optimization (completed)
- **TD-013**: Email Service Testing Infrastructure (completed)
- **US-061**: EmailService Recipient Lookup Configuration (Sprint 8 - follow-up)

### Architecture Decision Records
- **ADR-042**: Session-Based Authentication (user context for emails)
- **ADR-058**: Component Security Utils (security in email templates)
- **ADR-059**: Schema Authority (database schema is truth)

### API Documentation
- **EmailService API**: `/docs/api/email-service.md`
- **OpenAPI Specification**: `/docs/api/openapi.yaml` (v2.12.0)

### Development Journals
- **2025-09-22-06**: US-058 Completion Strategy Execution
- **2025-09-06-02**: Email Security Test Industrialization

---

## Story Points Breakdown

**Total: 5 Story Points**

1. **Template Audit** (1 point): 8 hours
   - Inventory all template versions
   - Create comparison matrix
   - Quantify technical debt

2. **Database Validation** (1 point): 8 hours
   - Validate template content
   - Review Liquibase changelogs
   - Create corrective changelog if needed

3. **Template Consolidation** (1 point): 8 hours
   - Select canonical template
   - Update database templates
   - Archive outdated versions
   - Review EmailService integration

4. **Variable Binding Validation** (1 point): 8 hours
   - Document variable mappings
   - Review EmailService variable population
   - Create test datasets
   - Conduct variable binding tests

5. **End-to-End Testing** (1 point): 16 hours
   - Email client testing matrix
   - Responsive design validation
   - Feature validation checklist
   - Edge case testing
   - Performance testing

**Total Effort**: 48 hours (6 days at 8 hours/day)

---

## Definition of Done

- [ ] Template audit report completed with comparison matrix
- [ ] Database templates validated and corrected (if needed)
- [ ] Single canonical template established and documented
- [ ] All GSP variables populate correctly in test emails
- [ ] Responsive design verified at all breakpoints (320px-1000px)
- [ ] Email rendering perfect in Gmail, Outlook, Apple Mail
- [ ] StepView URLs functional for all notification types
- [ ] Dark mode and print styles validated
- [ ] EmailService template selection logic documented
- [ ] Template maintenance guide created
- [ ] All tests passing (unit, integration, MailHog)
- [ ] Documentation updated (`/docs/api/email-service.md`, `/docs/api/email-template-architecture.md`)
- [ ] Liquibase changelogs applied and tested
- [ ] Archived outdated template files
- [ ] Test results matrix with email client screenshots
- [ ] Performance metrics meet targets (<500ms composition, <100ms retrieval)

---

## Notes

### Template Files Location
- **Mock**: `/docs/roadmap/ux-ui/mock/mobile-email-template-mock.html` (1,404 lines)
- **Base**: `/docs/roadmap/ux-ui/email-template.html` (753 lines)
- **Enhanced (Canonical)**: `/docs/roadmap/ux-ui/enhanced-mobile-email-template.html` (1,459 lines)
- **Liquibase 024**: `local-dev-setup/liquibase/changelogs/024_enhance_mobile_email_templates.sql` (594 lines)
- **Liquibase 027**: `local-dev-setup/liquibase/changelogs/027_email_templates_with_urls.sql` (389 lines)

### Mobile-Responsive Breakpoints
- **Mobile First**: 320px-600px (iPhone SE to iPhone 12 Pro Max)
- **Tablet**: 601px-768px (iPad portrait)
- **Desktop**: 769px-1000px (full-width email clients)

### Email Template Types
- STEP_STATUS_CHANGED (with/without URL)
- STEP_OPENED (with/without URL)
- INSTRUCTION_COMPLETED (with/without URL)
- STEP_NOTIFICATION_MOBILE (general mobile template)

### GSP Variable Syntax
Templates use Groovy Server Pages (GSP) syntax:
```groovy
${stepInstance.sti_code ?: 'STEP'}
${stepInstance.sti_name ?: 'Step Details'}
${hasStepViewUrl ? stepViewUrl : '#'}
```

### Email Client Priority
1. **Gmail** (web + mobile): Highest user base
2. **Outlook** (desktop + web): Enterprise standard
3. **Apple Mail** (macOS + iOS): Mobile users

---

**Story Created**: September 30, 2025
**Sprint**: 8 - Security Architecture Enhancement
**Target Completion**: Day 2-3 of Sprint 8
**Complexity**: Moderate (configuration, validation, testing)
**Business Value**: High (production-ready email notifications)