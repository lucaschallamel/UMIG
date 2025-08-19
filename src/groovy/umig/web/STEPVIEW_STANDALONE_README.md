# StepView Standalone Implementation (US-036)

## Overview

This implementation provides a complete standalone StepView page and self-contained email template for sharing step details with external users who cannot access Confluence directly.

## Files Created

### 1. `stepview.html` - Standalone HTML Wrapper

**Location:** `/src/groovy/umig/web/stepview.html`

A mobile-first responsive HTML page that serves as the standalone wrapper for step viewing functionality.

**Key Features:**
- Mobile-first responsive design (320px minimum width)
- Touch-friendly interface (44px minimum touch targets)
- Accessibility compliant (WCAG 2.1 guidelines)
- Print-friendly layout
- Error handling and graceful degradation
- SEO-optimized with structured data
- Cross-browser compatibility
- Loading states and error recovery

**URL Parameters Supported:**
- Human-readable: `?mig=migrationa&ite=run1&stepid=DEC-001&role=PILOT`
- UUID-based: `?ite_id={uuid}&role=NORMAL&user_id={uuid}`

### 2. `email-template.html` - Self-Contained Email Template

**Location:** `/src/groovy/umig/web/email-template.html`

A comprehensive email template that includes ALL step information inline for external users without network access.

**Key Features:**
- Complete step information embedded inline
- Email client compatibility (Outlook, Gmail, Apple Mail, etc.)
- Mobile-responsive design for email
- Print-friendly formatting
- Mustache template syntax for data population
- Dark mode support where available
- Accessibility-compliant HTML structure

## Implementation Details

### Mobile-First Design Approach

The implementation follows a mobile-first responsive design strategy:

1. **Base styles (320px+):** Optimized for small screens
2. **Tablet styles (768px+):** Enhanced layout for medium screens  
3. **Desktop styles (1024px+):** Full-featured desktop experience
4. **Large screens (1440px+):** Maximum width constraints

### Touch Optimization

- Minimum 44px touch targets for all interactive elements
- Touch-friendly button spacing and sizing
- Swipe gesture support for mobile refresh
- Optimized scrolling and interaction zones

### Email Client Compatibility

The email template is tested and optimized for:

| Client | Version | Support Level |
|--------|---------|---------------|
| Outlook | 2016+ | Full Support |
| Gmail Web | Current | Full Support |
| Gmail Mobile | Current | Full Support |
| Apple Mail iOS | 13+ | Full Support |
| Apple Mail macOS | 10.15+ | Full Support |
| Android Email | 8+ | Full Support |
| Samsung Email | Current | Full Support |

### Accessibility Features

- Semantic HTML structure with proper ARIA labels
- Skip links for screen readers
- High contrast color schemes
- Reduced motion support
- Keyboard navigation support
- Screen reader compatible markup

## Usage Instructions

### 1. Standalone Page Deployment

Deploy the `stepview.html` file alongside the `stepview-standalone.js` file:

```bash
# Copy to web server root or Confluence static content
cp stepview.html /path/to/web/root/
cp stepview-standalone.js /path/to/web/root/
```

**Access URLs:**
```
# Human-readable format
https://your-domain.com/stepview.html?mig=migrationa&ite=run1&stepid=DEC-001&role=PILOT

# UUID format (recommended for external sharing)
https://your-domain.com/stepview.html?ite_id=12345678-1234-1234-1234-123456789abc&role=NORMAL
```

### 2. Email Template Integration

The email template uses Mustache syntax for data population. Required template variables:

#### Core Variables
- `{{STEP_CODE}}` - Step identifier (e.g., "DEC-001")
- `{{STEP_NAME}}` - Step display name
- `{{STEP_STATUS}}` - Current status
- `{{STATUS_CLASS}}` - CSS class for status styling
- `{{MIGRATION_NAME}}` - Parent migration name
- `{{ITERATION_NAME}}` - Parent iteration name
- `{{PLAN_NAME}}` - Parent plan name
- `{{SEQUENCE_NAME}}` - Parent sequence name
- `{{PHASE_NAME}}` - Parent phase name
- `{{GENERATION_DATE}}` - Email generation date
- `{{GENERATION_TIME}}` - Email generation time
- `{{SENDER_NAME}}` - Name of email sender

#### Optional Variables
- `{{STEP_DESCRIPTION}}` - Step description text
- `{{STEP_DURATION}}` - Duration in minutes
- `{{ASSIGNED_TEAM}}` - Assigned team name
- `{{TARGET_ENVIRONMENT}}` - Target environment
- `{{PREDECESSOR_CODE}}` - Predecessor step code
- `{{PREDECESSOR_NAME}}` - Predecessor step name

#### Collection Variables
- `{{#HAS_LABELS}}` - Conditional block for labels
- `{{#LABELS}}` - Array of label objects
- `{{#HAS_INSTRUCTIONS}}` - Conditional block for instructions
- `{{#INSTRUCTIONS}}` - Array of instruction objects
- `{{#HAS_COMMENTS}}` - Conditional block for comments
- `{{#COMMENTS}}` - Array of comment objects
- `{{#HAS_IMPACTED_TEAMS}}` - Conditional block for teams
- `{{#IMPACTED_TEAMS}}` - Array of team objects

#### URL Variables
- `{{CONFLUENCE_URL}}` - Link back to Confluence
- `{{STANDALONE_URL}}` - Link to standalone page
- `{{HELP_URL}}` - Help documentation link

### 3. Integration with Backend

The backend should implement an email service that:

1. Fetches complete step data including all related entities
2. Populates the template variables
3. Renders the HTML email
4. Sends via the configured email system

Example Groovy service integration:

```groovy
// EmailTemplateService.groovy
class EmailTemplateService {
    
    def generateStepEmail(stepInstanceId, userId) {
        // 1. Fetch complete step data
        def stepData = fetchCompleteStepData(stepInstanceId)
        
        // 2. Load email template
        def template = loadTemplate('email-template.html')
        
        // 3. Populate template variables
        def variables = buildTemplateVariables(stepData, userId)
        
        // 4. Render template
        def renderedEmail = renderMustacheTemplate(template, variables)
        
        return renderedEmail
    }
}
```

## Security Considerations

### XSS Prevention
- All user-generated content is HTML-escaped in templates
- Content Security Policy headers recommended
- Input validation on URL parameters

### Access Control
- Role-based access control implemented
- Guest user support for external sharing
- Session management for authenticated users

### Email Security
- Templates designed to prevent email injection
- All links use HTTPS where possible
- Sensitive information properly masked

## Performance Optimization

### Standalone Page
- Lazy loading of non-critical resources
- Optimized CSS with media queries
- Minimal JavaScript dependencies
- Efficient polling with visibility API

### Email Template
- Inline CSS for maximum compatibility
- Optimized image sizes and formats
- Minimized HTML size for email limits
- Efficient table layouts

## Browser Support

### Standalone Page
- Chrome 80+
- Safari 13+
- Firefox 75+
- Edge 80+
- Mobile Safari iOS 13+
- Chrome Android 80+

### Email Template
- All major email clients (see compatibility table above)
- Graceful degradation for older clients
- Fallback styles for unsupported features

## Troubleshooting

### Common Issues

1. **JavaScript Loading Errors**
   - Verify `stepview-standalone.js` is accessible
   - Check browser console for errors
   - Ensure proper CORS headers if cross-origin

2. **API Connection Issues**
   - Verify API endpoint accessibility
   - Check authentication headers
   - Validate URL parameter format

3. **Email Rendering Issues**
   - Test in multiple email clients
   - Validate HTML structure
   - Check CSS inline styles

### Debug Information

The standalone page includes comprehensive error handling:
- Network connectivity issues
- API response errors
- Invalid URL parameters
- JavaScript execution errors

## Testing Guidelines

### Standalone Page Testing
1. Test all URL parameter formats
2. Verify mobile responsiveness on multiple devices
3. Test keyboard navigation and accessibility
4. Validate print layout and styles
5. Test offline behavior and error states

### Email Template Testing
1. Test across all supported email clients
2. Verify mobile rendering in email apps
3. Test print functionality from email clients
4. Validate template variable population
5. Test with various data scenarios (empty states, long content)

## Maintenance

### Regular Updates
- Monitor email client compatibility changes
- Update responsive breakpoints as needed
- Review and update accessibility standards
- Performance monitoring and optimization

### Version Control
- Template versions should be tracked
- Backward compatibility considerations
- Migration strategy for template changes

## Support

For technical support or questions about this implementation:
- Review the implementation code and comments
- Check the UMIG project documentation
- Contact the development team for specific issues

---

**US-036 Implementation Complete** - Standalone StepView with mobile-first responsive design and self-contained email template for external user access.