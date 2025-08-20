# Mobile Testing Scenarios for Standalone StepView

**US-036: Comprehensive Mobile Testing Guide**

This document outlines mobile device testing scenarios for the standalone StepView implementation, ensuring optimal user experience across all mobile devices and scenarios.

## Overview

The standalone StepView page must work seamlessly across mobile devices for external contractors and users without VPN access. Mobile testing focuses on touch interaction, responsive design, performance, and offline capabilities.

## Test Environment Setup

### Required Mobile Devices

#### Physical Devices (Priority 1 - Critical)

- **iPhone 13/14/15** (iOS 15+) - Safari
- **Samsung Galaxy S21/S22/S23** (Android 11+) - Chrome
- **iPad 9th/10th Generation** (iPadOS 15+) - Safari
- **Google Pixel 6/7/8** (Android 12+) - Chrome

#### Browser Testing Matrix

- **iOS Safari** (Primary mobile browser)
- **Chrome Mobile** (Android primary)
- **Samsung Internet** (Samsung devices)
- **Firefox Mobile** (Secondary testing)
- **Edge Mobile** (Enterprise environments)

#### Responsive Design Breakpoints

- **320px** - Small mobile phones (iPhone SE)
- **375px** - Standard mobile phones (iPhone 12/13)
- **414px** - Large mobile phones (iPhone 14 Plus)
- **768px** - Tablets (iPad Mini)
- **1024px** - Large tablets (iPad Pro)

## Core Mobile Test Scenarios

### 1. URL Navigation and Routing Tests

#### Test Case M-001: Direct URL Access

**Objective**: Verify standalone URLs work correctly on mobile browsers

**Steps**:

1. Open mobile browser (Safari/Chrome)
2. Navigate to human-readable URL:
   ```
   https://confluence.company.com/stepview.html?mig=migrationa&ite=run1&stepid=DEC-001&role=NORMAL
   ```
3. Navigate to UUID-based URL:
   ```
   https://confluence.company.com/stepview.html?ite_id=550e8400-e29b-41d4-a716-446655440000&role=PILOT
   ```

**Expected Results**:

- Page loads within 3 seconds on mobile
- Content is properly formatted for mobile viewport
- No horizontal scrolling required
- All UI elements are visible and accessible

**Performance Criteria**:

- Page load time < 3 seconds on 3G network
- First contentful paint < 2 seconds
- Interactive elements respond within 100ms

#### Test Case M-002: Email Link Navigation

**Objective**: Test navigation from email clients on mobile

**Steps**:

1. Open email client (Gmail, Outlook, Apple Mail)
2. Tap standalone StepView link in email template
3. Verify browser opens and loads page correctly

**Expected Results**:

- Browser launches automatically
- Page loads without authentication prompts
- Content displays properly in mobile format

### 2. Touch Interaction Testing

#### Test Case M-003: Button and Control Accessibility

**Objective**: Ensure all interactive elements are touch-friendly

**Touch Target Requirements**:

- Minimum size: 44x44px (iOS Human Interface Guidelines)
- Clear visual feedback on tap
- No accidental activations

**Elements to Test**:

1. **Instruction Checkboxes**
   - Tap to complete/uncomplete instructions
   - Visual feedback (checkmark animation)
   - Proper spacing between checkboxes

2. **Status Dropdown** (PILOT users)
   - Tap to open dropdown
   - Select new status
   - Dropdown closes properly

3. **Action Buttons**
   - Email step button (📧 Send by Email)
   - Refresh button (🔄 Refresh)
   - Comment buttons (Add/Edit/Delete)

4. **Expandable Sections**
   - Tap to expand/collapse content areas
   - Smooth animations
   - Clear visual indicators

**Test Procedure**:

```javascript
// Touch interaction test sequence
1. Tap each button/control with finger
2. Verify immediate visual feedback (highlight/press state)
3. Confirm action completes successfully
4. Test rapid successive taps (prevent double-actions)
5. Test edge cases (partial taps, swipes)
```

#### Test Case M-004: Gesture Support

**Objective**: Verify swipe and gesture functionality

**Gestures to Test**:

1. **Pull-to-Refresh**
   - Swipe down from top to refresh step data
   - Show loading indicator
   - Update timestamp on completion

2. **Horizontal Swipe Navigation**
   - Swipe right to trigger refresh (optional)
   - No unintended navigation

3. **Pinch-to-Zoom**
   - Allow zooming for accessibility
   - Maintain proper layout scaling
   - Reset zoom works correctly

### 3. Responsive Design Validation

#### Test Case M-005: Layout Adaptation

**Objective**: Verify content adapts properly across screen sizes

**Testing Matrix**:
| Screen Size | Device | Orientation | Priority |
|-------------|---------|-------------|----------|
| 320px | iPhone SE | Portrait | High |
| 375px | iPhone 12/13 | Portrait | High |
| 414px | iPhone 14 Plus | Portrait | High |
| 768px | iPad Mini | Portrait | Medium |
| 1024px | iPad Pro | Landscape | Medium |

**Layout Elements**:

1. **Header Section**
   - Step title remains readable
   - Breadcrumb wraps properly
   - Action buttons stack vertically on small screens

2. **Content Sections**
   - Summary grid becomes single column
   - Instructions table scrolls horizontally if needed
   - Comments stack properly

3. **Footer Information**
   - Contact info remains accessible
   - Links are touch-friendly

#### Test Case M-006: Typography and Readability

**Objective**: Ensure text is readable across all mobile devices

**Criteria**:

- Minimum font size: 16px (iOS Safari zoom prevention)
- Line height: 1.4-1.6 for readability
- Sufficient contrast ratios (WCAG AA compliance)
- No text cutoff or overflow

**Elements to Validate**:

- Step titles and descriptions
- Instruction text
- Comment content
- Label text
- Error messages

### 4. Performance Testing on Mobile

#### Test Case M-007: Network Performance

**Objective**: Validate performance across mobile networks

**Network Conditions**:

- **4G LTE** (Good: 4G, 150ms RTT)
- **3G** (Regular: 3G, 300ms RTT)
- **Slow 3G** (Slow: 3G, 2000ms RTT)
- **Offline** (No connection)

**Performance Metrics**:

```javascript
// Performance measurement points
- Time to First Byte (TTFB) < 800ms
- First Contentful Paint (FCP) < 2s
- Largest Contentful Paint (LCP) < 4s
- Cumulative Layout Shift (CLS) < 0.1
- Total Blocking Time (TBT) < 300ms
```

**Test Procedure**:

1. Use Chrome DevTools Network throttling
2. Load page and measure Core Web Vitals
3. Test with both URL formats
4. Verify graceful degradation on slow connections

#### Test Case M-008: Memory and Battery Usage

**Objective**: Ensure efficient resource usage on mobile devices

**Testing Tools**:

- Chrome DevTools Performance tab
- Safari Web Inspector
- Mobile device battery monitoring

**Criteria**:

- Memory usage < 50MB for page
- No memory leaks during polling
- Battery drain < 5% per hour of usage
- CPU usage spikes < 30% during interactions

### 5. Offline and Connectivity Testing

#### Test Case M-009: Offline Functionality

**Objective**: Test behavior when network connection is lost

**Scenarios**:

1. **Page Load Offline**
   - Attempt to load page without internet
   - Show appropriate error message
   - Provide retry mechanism

2. **Connection Lost During Use**
   - Use page normally, then disable network
   - Test instruction completion attempts
   - Verify error handling and user feedback

3. **Intermittent Connectivity**
   - Simulate spotty connection
   - Test automatic retry mechanisms
   - Verify data consistency

**Expected Behavior**:

- Clear offline indicators
- Actions queue for retry when online
- No data corruption
- User-friendly error messages

#### Test Case M-010: Low Bandwidth Optimization

**Objective**: Ensure usability on slow connections

**Optimization Features**:

- Progressive loading of content
- Efficient polling intervals (30s vs 2s)
- Minimal API requests
- Compressed responses

### 6. Form Input and Interaction Testing

#### Test Case M-011: Comment Input on Mobile

**Objective**: Test comment textarea and form interactions

**Elements to Test**:

1. **Comment Textarea**
   - Tap to focus and show virtual keyboard
   - Proper keyboard type (text)
   - Auto-resize based on content
   - Submit on mobile keyboard "Done"

2. **Virtual Keyboard Handling**
   - Page scrolls to keep textarea visible
   - No layout shift when keyboard appears
   - Proper keyboard dismissal

3. **Touch Selection and Editing**
   - Long press to select text
   - Copy/paste functionality
   - Cursor positioning

### 7. Accessibility on Mobile

#### Test Case M-012: Mobile Accessibility

**Objective**: Ensure accessibility features work on mobile

**Testing Areas**:

1. **Screen Reader Support**
   - iOS VoiceOver navigation
   - Android TalkBack navigation
   - Proper ARIA labels

2. **High Contrast Mode**
   - iOS high contrast settings
   - Android accessibility settings
   - Content remains usable

3. **Font Size Scaling**
   - iOS Dynamic Type support
   - Android font size settings
   - Layout adapts without breaking

### 8. Security Testing on Mobile

#### Test Case M-013: Mobile Security Validation

**Objective**: Verify security measures work on mobile browsers

**Test Areas**:

1. **URL Parameter Security**
   - XSS prevention in mobile browsers
   - URL manipulation attempts
   - Deep link security

2. **Local Storage Security**
   - No sensitive data stored locally
   - Session handling
   - Browser security settings

## Device-Specific Test Cases

### iPhone/iPad Specific Tests

#### Test Case iOS-001: Safari-Specific Features

- PWA installation prompts
- Safari Reader mode compatibility
- iOS share sheet integration
- Handoff with Mac Safari

#### Test Case iOS-002: iOS Gestures

- 3D Touch/Haptic Touch support
- iOS swipe gestures
- Control Center interaction
- iOS keyboard shortcuts

### Android Specific Tests

#### Test Case AND-001: Chrome Mobile Features

- Add to Home Screen functionality
- Chrome Custom Tabs support
- Android share intents
- Autofill integration

#### Test Case AND-002: Android System Integration

- Back button behavior
- Recent apps integration
- Android keyboard support
- Android accessibility services

## Performance Benchmarks

### Target Performance Metrics

| Metric              | Target | Critical |
| ------------------- | ------ | -------- |
| Page Load (3G)      | < 3s   | < 5s     |
| Page Load (4G)      | < 2s   | < 3s     |
| Time to Interactive | < 4s   | < 6s     |
| Memory Usage        | < 50MB | < 100MB  |
| Battery per Hour    | < 5%   | < 10%    |

### Performance Testing Tools

1. **Chrome DevTools**

   ```javascript
   // Performance audit command
   lighthouse http://localhost:8090/stepview.html?ite_id=test --chrome-flags="--headless" --output=html
   ```

2. **WebPageTest.org**
   - Real device testing
   - Multiple location testing
   - Network condition simulation

3. **Manual Testing Checklist**
   ```markdown
   - [ ] Page loads in under 3 seconds on 3G
   - [ ] No layout shifts during loading
   - [ ] Touch targets are at least 44x44px
   - [ ] Text is readable without zooming
   - [ ] All functionality works with touch
   - [ ] Virtual keyboard doesn't break layout
   - [ ] Offline error handling is clear
   - [ ] Performance is acceptable on older devices
   ```

## Test Execution Procedures

### Manual Testing Protocol

1. **Pre-Test Setup**

   ```bash
   # Start test environment
   npm start

   # Generate test data
   npm run generate-data:test

   # Verify mobile access URLs
   curl -I http://localhost:8090/stepview.html
   ```

2. **Device Testing Sequence**
   - Test each device in priority order
   - Document issues with screenshots
   - Use browser developer tools for debugging
   - Test both portrait and landscape modes

3. **Issue Documentation**

   ```markdown
   ## Issue: [Brief Description]

   **Device**: iPhone 13 (iOS 16.1)
   **Browser**: Safari 16.1
   **URL**: [Test URL]
   **Steps**: [Reproduction steps]
   **Expected**: [Expected behavior]
   **Actual**: [Actual behavior]
   **Screenshots**: [Attach screenshots]
   **Priority**: High/Medium/Low
   ```

### Automated Mobile Testing

#### Selenium WebDriver Mobile Tests

```javascript
// Example mobile automation test
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

// Configure mobile emulation
const mobileOptions = new chrome.Options().setMobileEmulation({
  deviceName: "iPhone 12 Pro",
});

const driver = new Builder()
  .forBrowser("chrome")
  .setChromeOptions(mobileOptions)
  .build();

// Test mobile page load
await driver.get("http://localhost:8090/stepview.html?ite_id=test-uuid");
await driver.wait(until.elementLocated(By.id("stepview-root")), 10000);
```

#### Playwright Mobile Testing

```javascript
// Playwright mobile test example
const { test, devices } = require("@playwright/test");

test.describe("Mobile StepView Tests", () => {
  test.use({
    ...devices["iPhone 12"],
  });

  test("loads stepview on mobile", async ({ page }) => {
    await page.goto("/stepview.html?ite_id=test-uuid");
    await expect(page.locator("#stepview-root")).toBeVisible();
  });
});
```

## Test Data Requirements

### Test Step Data

```json
{
  "testStepInstance": {
    "id": "mobile-test-step-001",
    "stepCode": "MOB-001",
    "name": "Mobile Testing Step",
    "status": "PENDING",
    "instructions": [
      {
        "id": "mobile-inst-001",
        "description": "Test mobile instruction with longer text to verify wrapping and readability on small screens",
        "order": 1,
        "isCompleted": false
      }
    ]
  }
}
```

### Test Users

- **NORMAL User**: `mobile-normal-user-123`
- **PILOT User**: `mobile-pilot-user-456`
- **Guest User**: Generated automatically

## Success Criteria

### Functional Requirements

- ✅ All URL formats work on mobile browsers
- ✅ Touch interactions are responsive and accurate
- ✅ Content is readable without horizontal scrolling
- ✅ Form inputs work with virtual keyboards
- ✅ Performance meets target metrics
- ✅ Offline error handling is user-friendly

### Quality Gates

- Zero critical mobile compatibility issues
- Performance scores > 90 on Lighthouse mobile
- Accessibility scores > 95 (WCAG AA compliance)
- User satisfaction scores > 4.5/5 (if user testing conducted)

## Troubleshooting Common Issues

### Layout Issues

```css
/* Common mobile layout fixes */
.stepview-standalone-container {
  max-width: 100vw;
  overflow-x: hidden;
}

.instructions-table {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
```

### Performance Issues

```javascript
// Performance optimization techniques
- Lazy load non-critical content
- Reduce polling frequency on mobile
- Use compression for API responses
- Minimize DOM manipulations
```

### iOS Safari Specific Issues

```css
/* iOS Safari fixes */
input,
textarea {
  font-size: 16px; /* Prevent zoom on focus */
  -webkit-appearance: none; /* Remove default styling */
}

.touch-friendly {
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
}
```

## Testing Schedule and Priorities

### Sprint Integration

- **Week 1**: Core functionality mobile testing
- **Week 2**: Performance and responsive design
- **Week 3**: Device-specific testing
- **Week 4**: Edge cases and polish

### Continuous Testing

- Run mobile tests on every pull request
- Performance regression testing
- Monthly device compatibility reviews
- User feedback integration

---

**Document Version**: 1.0.0
**Last Updated**: August 19, 2025
**Next Review**: September 19, 2025
**Owner**: UMIG QA Team
