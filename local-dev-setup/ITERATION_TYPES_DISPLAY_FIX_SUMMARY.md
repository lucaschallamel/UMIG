# Iteration Types Management - Color and Icon Display Fix

## Issue Description

The Iteration Types Management interface was showing empty Color and Icon columns despite the database containing the correct data.

## Root Cause Analysis

### Database Verification ✅

- Database contains correct data:
  - RUN: #2E7D32 (green), play-circle icon
  - DR: #F57C00 (orange), refresh icon
  - CUTOVER: #C62828 (red), check-circle icon

### API Layer Verification ✅

- API endpoint `/rest/scriptrunner/latest/custom/iterationTypes` correctly returns `itt_color` and `itt_icon` fields
- Data structure is properly formatted

### Frontend Issues Identified ❌

1. **Color Swatch Missing Dimensions**: The color swatch div lacked width, height, and styling
2. **Wrong Font Awesome Version**: Code used `fas fa-` (Font Awesome 5) instead of `fa fa-` (Font Awesome 4)
3. **Icon Name Mapping**: Some icons needed mapping from FA5 names to FA4 equivalents

## Fixes Applied

### 1. Color Swatch Rendering

**Before:**

```javascript
renderer: (value) =>
  `<div class="color-swatch" style="background-color: ${value || "#6B73FF"};" title="${value || "#6B73FF"}"></div>`;
```

**After:**

```javascript
renderer: (value) => {
  const color = value || "#6B73FF";
  return `<div class="color-swatch" style="width: 20px; height: 20px; border-radius: 3px; border: 1px solid #ccc; background-color: ${color}; display: inline-block;" title="${color}"></div>`;
};
```

### 2. Icon Rendering with Font Awesome 4 Support

**Before:**

```javascript
renderer: (value) =>
  `<i class="fas fa-${value || "circle"}" title="${value || "circle"}"></i>`;
```

**After:**

```javascript
renderer: (value) => {
  const iconName = value || "circle";
  // Map Font Awesome 5+ icon names to Font Awesome 4 equivalents
  const iconMap = {
    "play-circle": "play-circle-o",
    "check-circle": "check-circle-o",
    refresh: "refresh",
  };
  const mappedIcon = iconMap[iconName] || iconName;
  return `<i class="fa fa-${mappedIcon}" title="${iconName}" style="font-size: 16px;"></i>`;
};
```

### 3. Updated Helper Methods

- `_renderColorSwatch()`: Added proper dimensions and styling
- `_renderIcon()`: Added icon mapping and FA4 support
- `_renderNameCell()`: Updated icon classes
- `_renderActionButtons()`: Fixed button icons (edit, delete, stats)
- `_getIconPickerTemplate()`: Updated icon picker options

## Files Modified

- `/src/groovy/umig/web/js/entities/iteration-types/IterationTypesEntityManager.js`

## Testing

- ✅ Unit tests pass for color and icon rendering methods
- ✅ Created visual test file (`test-iteration-types-display.html`) to verify rendering
- ✅ Verified API data structure and field mapping

## Expected Result

- Color column now displays colored squares/swatches for each iteration type
- Icon column now displays proper Font Awesome icons for each iteration type
- Both columns properly reflect the database values:
  - RUN: Green swatch + play circle icon
  - DR: Orange swatch + refresh icon
  - CUTOVER: Red swatch + check circle icon

## Backward Compatibility

- All changes are backward compatible
- Font Awesome 4 icon mapping ensures compatibility with existing system
- Inline styles prevent dependency on external CSS classes
