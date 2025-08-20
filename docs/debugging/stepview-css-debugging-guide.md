# StepView CSS Debugging Guide

## Overview

This guide helps troubleshoot CSS loading and styling issues with the UMIG StepView UI component (US-036).

## Current Issue (August 19, 2025)

**Problem**: StepView UI not displaying correctly despite:

- Stack restart ✅
- CSS file path verified ✅
- HTML classes updated ✅
- Version marker (v2.2) deployed ✅

**Expected**: Professional layout matching IterationView with panels, borders, and proper typography
**Actual**: Basic unstyled appearance

## Debugging Steps

### 1. Browser Console Debugging

Open the StepView page and check the browser console for:

```javascript
// Auto-generated debug information
🎨 StepView CSS Debug: CSS Link Element Created
🔗 CSS Path: /rest/scriptrunner/latest/custom/web/css/iteration-view.css
✅ StepView CSS: iteration-view.css loaded successfully (OR ❌ failed)
🔍 StepView CSS Debug: Checking CSS rules...
```

### 2. Manual CSS Debug Function

For ADMIN users, use the debug button in the version marker, or run manually:

```javascript
// In browser console
debugStepViewCSS();
```

This will output:

- CSS file loading status
- Element existence checks
- Computed style values
- CSS variables
- Total stylesheets loaded

### 3. Network Tab Investigation

1. Open Browser DevTools → Network tab
2. Refresh the StepView page
3. Look for the CSS request: `/rest/scriptrunner/latest/custom/web/css/iteration-view.css`
4. Check status codes:
   - **200 OK**: File loaded successfully
   - **404 Not Found**: File path issue
   - **403 Forbidden**: Permissions issue
   - **500 Server Error**: Server-side issue

### 4. Elements Tab Investigation

1. Open Browser DevTools → Elements tab
2. Find the `.step-details-panel` element
3. Check computed styles in the right panel
4. Look for:
   - Background color (should be white)
   - Border (should be 1px solid #dfe1e6)
   - Box-shadow (should be visible)
   - Display (should be flex)
   - Flex-direction (should be column)

### 5. CSS Specificity Issues

The macro includes `!important` declarations to override conflicts:

```css
#umig-step-view-root .step-details-panel {
  background: white !important;
  border: 1px solid #dfe1e6 !important;
  border-radius: 4px !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
  /* ... more styles with !important */
}
```

## Common Issues and Solutions

### Issue 1: CSS File Not Loading (404)

**Symptoms**: Console shows failed CSS load
**Solution**:

- Verify file exists at `/src/groovy/umig/web/css/iteration-view.css`
- Check ScriptRunner web resource mapping
- Restart Confluence if needed

### Issue 2: CSS File Loading but Styles Not Applied

**Symptoms**: CSS loads successfully but no visual changes
**Solutions**:

- Check CSS selector specificity
- Look for conflicting Confluence/AUI styles
- Verify HTML class names match CSS selectors
- Use browser inspector to see which styles are being overridden

### Issue 3: CSS Variables Not Working

**Symptoms**: Colors and spacing appear incorrect
**Solution**: Check if CSS variables are defined in the loaded stylesheet:

```javascript
// Check in console
getComputedStyle(document.documentElement).getPropertyValue("--color-primary");
```

### Issue 4: Confluence AUI Override

**Symptoms**: Confluence's default styles override custom styles
**Solutions**:

- Use higher specificity selectors
- Add `!important` declarations
- Use unique ID-based selectors (`#umig-step-view-root`)

## Debug Features Added (v2.2)

1. **Console Logging**: Automatic CSS load status and style debugging
2. **Visual Debugging**: Red border highlight for 3 seconds when debug runs
3. **Admin Debug Button**: Quick access to CSS debug function
4. **Inline CSS Fallbacks**: `!important` styles to ensure styling works
5. **CSS Variables Check**: Validation of design system variables

## File Locations

- **Macro**: `/src/groovy/umig/macros/v1/stepViewMacro.groovy`
- **JavaScript**: `/src/groovy/umig/web/js/step-view.js`
- **CSS**: `/src/groovy/umig/web/css/iteration-view.css`

## Version Information

- **Current Version**: v2.2 (CSS Debug Enhanced)
- **Previous Version**: v2.1 (Enhanced UI)
- **Debug Features**: Added August 19, 2025

## Next Steps

1. **Immediate**: Check browser console for debug output
2. **Network Tab**: Verify CSS file loading
3. **Elements Tab**: Inspect computed styles
4. **Test CSS**: Use debug function to validate styling
5. **Report Findings**: Document what the debug output shows

## Support

If debugging reveals the CSS is loading but styles aren't applying:

- Check for Confluence theme conflicts
- Verify ScriptRunner web resource configuration
- Consider CSS cascade and specificity issues
- Test with minimal HTML to isolate the problem

---

_Generated: August 19, 2025 | Version: v2.2 | US-036 CSS Debugging Enhancement_
