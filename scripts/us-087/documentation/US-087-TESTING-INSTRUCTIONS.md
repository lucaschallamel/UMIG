# US-087 Phase 1 - Testing Instructions for Confluence Macro

## Overview

The Admin GUI runs as a Confluence macro, which requires special handling for the Phase 1 migration features. We've created an enhanced integration script that handles this context properly.

## Quick Start Testing

### Step 1: Navigate to Your Admin GUI Page

1. Open Chrome (recommended browser)
2. Go to: http://localhost:8090/spaces/UMIG/pages/360461/UMIG+ADMIN+UI
3. Wait for the page to fully load

### Step 2: Open Browser Console

- **Mac**: Press `Cmd + Option + J`
- **Windows**: Press `Ctrl + Shift + J` or `F12`

### Step 3: Load the Integration Script

1. In the console, copy and paste the entire contents of:
   ```
   scripts/confluence-macro-integration.js
   ```
2. Press Enter to execute

### Step 4: Use the Test Panel

A purple gradient test panel will appear in the top-right corner with:

#### Status Indicators

- **Admin GUI**: Shows if the main application is loaded
- **Feature Toggle**: Shows if feature management is ready
- **Performance Monitor**: Shows if performance tracking is ready
- **Migration Status**: Shows current migration state (INACTIVE/PARTIAL/ACTIVE)

#### Test Buttons

1. **🔧 Initialize System** - Click this FIRST to set up all components
2. **🔄 Toggle Migration** - Enable/disable the entire migration system
3. **👥 Toggle Teams** - Enable/disable Teams component specifically
4. **📊 Performance** - View performance metrics
5. **🧪 Test Teams** - Test if Teams should use new component manager
6. **🏴 Show Flags** - Display all feature flags
7. **🚨 Rollback** - Emergency rollback (disables all features)
8. **💻 Console** - Show/hide mini console output

## Testing Workflow

### Basic Test Sequence

1. Click **Initialize System** - All status indicators should turn green
2. Click **Toggle Migration** - Enables the migration system
3. Click **Toggle Teams** - Enables Teams component
4. Navigate to Teams section in Admin GUI
5. Observe if new component system is being used
6. Click **Performance** to view metrics

### Visual Indicators

- **Green (SUCCESS)**: Component loaded and working
- **Yellow (WARNING)**: Partial functionality
- **Red (ERROR)**: Not loaded or inactive

### Expected Behavior When Enabled

1. Teams section should load using the new TeamsEntityManager
2. Performance metrics should be collected
3. Feature flags should persist in localStorage
4. Console should show migration decisions being made

## Alternative Testing Methods

### Method 1: Direct Console Commands

If the UI doesn't appear, you can test directly in console:

```javascript
// Check what's available
console.log("AdminGui:", window.US087.adminGui);
console.log("FeatureToggle:", window.US087.featureToggle);

// Enable features manually
window.US087TestHelpers.initialize();
window.US087TestHelpers.toggleMigration();
window.US087TestHelpers.toggleTeams();
```

### Method 2: Fallback Script

If the main script has issues, use the diagnostic version:

1. Load `scripts/test-macro-context.js` instead
2. Run `window.createMacroTestUI()`
3. Follow the on-screen instructions

## Troubleshooting

### Test Panel Doesn't Appear

1. Check for JavaScript errors in console
2. Try refreshing the page and re-running the script
3. Ensure you're on the correct Confluence page with Admin GUI macro

### Status Indicators Stay Red

1. Click "Initialize System" button
2. Check console for error messages
3. The macro might be loading asynchronously - wait a few seconds and retry

### Features Don't Persist

1. Check if localStorage is enabled in browser
2. Clear browser cache and try again
3. Check console for localStorage errors

### Teams Component Not Loading

1. Ensure both "admin-gui-migration" and "teams-component" flags are enabled
2. Navigate away from Teams and back to trigger reload
3. Check console for "Should use component manager for teams?" message

## Verification Checklist

✅ Test panel appears in top-right corner
✅ Initialize System turns all indicators green
✅ Toggle Migration changes migration status
✅ Toggle Teams works independently
✅ Console output shows feature decisions
✅ Performance metrics are collected
✅ Feature flags persist after page reload
✅ Teams section behavior changes when enabled

## Notes

- The integration script handles multiple contexts (global, iframe, macro)
- Features are disabled by default for safety
- All changes are reversible with Emergency Rollback
- Performance impact should be minimal (<2% overhead)
- localStorage is used for persistence across sessions

## Support

If you encounter issues:

1. Check browser console for detailed error messages
2. Save console output for debugging
3. Try the alternative testing methods
4. Document which step fails in the testing workflow

## Files Reference

- Main integration script: `scripts/confluence-macro-integration.js`
- Diagnostic script: `scripts/test-macro-context.js`
- Visual test UI: `scripts/create-test-ui.js`
- Phase 1 Report: `docs/roadmap/sprint7/US-087-phase1-completion-report.md`
