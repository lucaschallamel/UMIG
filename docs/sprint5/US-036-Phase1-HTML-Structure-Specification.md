# US-036 Phase 1: HTML Structure Specification for StepView Alignment

**Agent**: Interface Designer  
**Objective**: Create exact HTML structure specification matching IterationView pane  
**Timeline**: Sprint 5 Day 3 AM (4 hours)  
**Test Case**: BGO-002 (TORONTO/RUN1)

## Executive Summary

This specification defines the exact HTML structure that the standalone StepView must implement to achieve 100% visual alignment with the IterationView StepView pane. The current standalone implementation uses completely different rendering methods that must be replaced with the IterationView pattern.

## Source of Truth Analysis

**IterationView doRenderStepDetails Function** (iteration-view.js lines 2838+):

```javascript
doRenderStepDetails(stepData, stepDetailsContent) {
    const summary = stepData.stepSummary || {};
    const instructions = stepData.instructions || [];
    const impactedTeams = stepData.impactedTeams || [];
    
    let html = `
        <div class="step-info" data-sti-id="${summary.ID || ""}">
            <div class="step-title">
                <h3>📋 ${summary.StepCode || "Unknown"} - ${summary.Name || "Unknown Step"}</h3>
            </div>
            
            <div class="step-breadcrumb">
                <span class="breadcrumb-item">${summary.MigrationName || "Migration"}</span>
                <span class="breadcrumb-separator">›</span>
                <span class="breadcrumb-item">${summary.PlanName || "Plan"}</span>
                <span class="breadcrumb-separator">›</span>
                <span class="breadcrumb-item">${summary.IterationName || "Iteration"}</span>
                <span class="breadcrumb-separator">›</span>
                <span class="breadcrumb-item">${summary.SequenceName || "Sequence"}</span>
                <span class="breadcrumb-separator">›</span>
                <span class="breadcrumb-item">${summary.PhaseName || "Phase"}</span>
            </div>
            
            <div class="step-key-info">
                <div class="metadata-item">
                    <span class="label">📊 Status:</span>
                    <span class="value">
                        <select id="step-status-dropdown" class="status-dropdown pilot-only" data-step-id="${summary.ID || stepData.stepCode}" style="padding: 2px 8px; border-radius: 3px;">
                            <option value="">Loading...</option>
                        </select>
                    </span>
                </div>
                <div class="metadata-item">
                    <span class="label">⬅️ Predecessor:</span>
                    <span class="value">${summary.PredecessorCode ? `${summary.PredecessorCode}${summary.PredecessorName ? ` - ${summary.PredecessorName}` : ""}` : "-"}</span>
                </div>
            </div>
            
            <div class="step-metadata">
                <div class="metadata-item">
                    <span class="label">🎯 Target Environment:</span>
                    <span class="value">${summary.TargetEnvironment || "Not specified"}</span>
                </div>
                <div class="metadata-item">
                    <span class="label">🔄 Scope:</span>
                    <span class="value">
                        ${summary.IterationTypes && summary.IterationTypes.length > 0
                            ? summary.IterationTypes.map(type => `<span class="scope-tag">${type}</span>`).join(" ")
                            : '<span style="color: var(--color-text-tertiary); font-style: italic;">None specified</span>'
                        }
                    </span>
                </div>
                <div class="metadata-item teams-container">
                    <div class="team-section">
                        <span class="label">👤 Primary Team:</span>
                        <span class="value">${summary.AssignedTeam || "Not assigned"}</span>
                    </div>
                    <div class="team-section">
                        <span class="label">👥 Impacted Teams:</span>
                        <span class="value">${impactedTeams.length > 0 ? impactedTeams.join(", ") : "None"}</span>
                    </div>
                </div>
                <div class="metadata-item">
                    <span class="label">📂 Location:</span>
                    <span class="value">${summary.SequenceName ? `Sequence: ${summary.SequenceName}` : "Unknown sequence"}${summary.PhaseName ? ` | Phase: ${summary.PhaseName}` : ""}</span>
                </div>
                <div class="metadata-item">
                    <span class="label">⏱️ Duration:</span>
                    <span class="value">${summary.Duration ? `${summary.Duration} min.` : summary.EstimatedDuration ? `${summary.EstimatedDuration} min.` : "45 min."}</span>
                </div>
                ${summary.Labels && summary.Labels.length > 0 ? `
                <div class="metadata-item">
                    <span class="label">🏷️ Labels:</span>
                    <span class="value">
                        ${summary.Labels.map(label => `<span class="label-tag" style="background-color: ${label.color}; color: ${this.getContrastColor(label.color)};">${label.name}</span>`).join(" ")}
                    </span>
                </div>
                ` : ""}
            </div>
            
            <div class="step-description">
                <h4>📝 Description:</h4>
                <p>${summary.Description || "No description available"}</p>
            </div>
        </div>
    `;
    
    // Instructions section follows...
    // Comments section follows...
}
```

## Current Standalone Implementation Issues

**Current step-view.js Problems**:

1. **Wrong Structure**: Uses separate `renderStepSummary()`, `renderLabels()`, `renderInstructions()` methods
2. **Wrong CSS Classes**: Uses table-based layout instead of metadata-item structure  
3. **Wrong Container**: Missing proper `.step-info` container with data attributes
4. **Wrong Status Integration**: Separate status handling instead of integrated dropdown
5. **Wrong Content Flow**: Different information hierarchy and organization

## Required HTML Structure Template

The standalone StepView MUST implement this exact structure:

### 1. Main Container Structure
```html
<div class="step-info" data-sti-id="${stepId}">
    <!-- All content goes here -->
</div>
```

### 2. Title Section
```html
<div class="step-title">
    <h3>📋 ${stepCode} - ${stepName}</h3>
</div>
```

### 3. Breadcrumb Navigation
```html
<div class="step-breadcrumb">
    <span class="breadcrumb-item">${migrationName}</span>
    <span class="breadcrumb-separator">›</span>
    <span class="breadcrumb-item">${planName}</span>
    <span class="breadcrumb-separator">›</span>
    <span class="breadcrumb-item">${iterationName}</span>
    <span class="breadcrumb-separator">›</span>
    <span class="breadcrumb-item">${sequenceName}</span>
    <span class="breadcrumb-separator">›</span>
    <span class="breadcrumb-item">${phaseName}</span>
</div>
```

### 4. Key Information Section
```html
<div class="step-key-info">
    <div class="metadata-item">
        <span class="label">📊 Status:</span>
        <span class="value">
            <select id="step-status-dropdown" class="status-dropdown pilot-only" data-step-id="${stepId}" style="padding: 2px 8px; border-radius: 3px;">
                <option value="">Loading...</option>
            </select>
        </span>
    </div>
    <div class="metadata-item">
        <span class="label">⬅️ Predecessor:</span>
        <span class="value">${predecessorInfo || "-"}</span>
    </div>
</div>
```

### 5. Metadata Section
```html
<div class="step-metadata">
    <div class="metadata-item">
        <span class="label">🎯 Target Environment:</span>
        <span class="value">${targetEnvironment || "Not specified"}</span>
    </div>
    <div class="metadata-item">
        <span class="label">🔄 Scope:</span>
        <span class="value">
            <!-- Scope tags or "None specified" -->
        </span>
    </div>
    <div class="metadata-item teams-container">
        <div class="team-section">
            <span class="label">👤 Primary Team:</span>
            <span class="value">${assignedTeam || "Not assigned"}</span>
        </div>
        <div class="team-section">
            <span class="label">👥 Impacted Teams:</span>
            <span class="value">${impactedTeams || "None"}</span>
        </div>
    </div>
    <div class="metadata-item">
        <span class="label">📂 Location:</span>
        <span class="value">${locationInfo}</span>
    </div>
    <div class="metadata-item">
        <span class="label">⏱️ Duration:</span>
        <span class="value">${duration || "45 min."}</span>
    </div>
    <!-- Labels section if available -->
    <div class="metadata-item">
        <span class="label">🏷️ Labels:</span>
        <span class="value">
            <!-- Label tags with proper styling -->
        </span>
    </div>
</div>
```

### 6. Description Section
```html
<div class="step-description">
    <h4>📝 Description:</h4>
    <p>${description || "No description available"}</p>
</div>
```

## Critical CSS Classes Required

**Must Use These Exact Classes**:

- `.step-info` - Main container with data-sti-id attribute
- `.step-title` - Title section wrapper
- `.step-breadcrumb` - Breadcrumb navigation container
- `.breadcrumb-item` - Individual breadcrumb items
- `.breadcrumb-separator` - Separator characters (›)
- `.step-key-info` - Key information section
- `.step-metadata` - Metadata section wrapper
- `.metadata-item` - Individual metadata row
- `.label` - Label spans (left side with emoji)
- `.value` - Value spans (right side with content)
- `.teams-container` - Special container for team information
- `.team-section` - Individual team sections
- `.step-description` - Description section wrapper
- `.status-dropdown` - Status select element
- `.pilot-only` - Role-based visibility control
- `.label-tag` - Label badges with background colors
- `.scope-tag` - Scope indicator badges

## Visual Layout Requirements

### Metadata Item Structure
Each metadata item follows this pattern:
```html
<div class="metadata-item">
    <span class="label">[EMOJI] [LABEL_TEXT]:</span>
    <span class="value">[VALUE_CONTENT]</span>
</div>
```

### Icons and Emojis (Exact Match Required)
- 📋 Step title prefix
- 📊 Status label
- ⬅️ Predecessor label  
- 🎯 Target Environment label
- 🔄 Scope label
- 👤 Primary Team label
- 👥 Impacted Teams label
- 📂 Location label
- ⏱️ Duration label
- 🏷️ Labels label
- 📝 Description heading

### Status Dropdown Integration
The status dropdown must:
- Use exact styling: `padding: 2px 8px; border-radius: 3px;`
- Have `pilot-only` class for role-based visibility
- Include `data-step-id` attribute
- Show "Loading..." as default option

### Labels Display
Label tags must:
- Use inline styles for background color from API
- Use calculated contrast color for text
- Be wrapped in `.value` span within labels metadata-item

## Implementation Method

The standalone StepView must:

1. **Remove** all current rendering methods (`renderStepSummary`, `renderLabels`, `renderInstructions`)
2. **Implement** single `doRenderStepDetails(stepData, container)` method
3. **Generate** HTML exactly matching this specification
4. **Use** same CSS classes and structure as IterationView
5. **Maintain** all existing functionality (status updates, instruction tracking, comments)

## Validation Criteria

**100% Structural Match**:
- HTML structure identical to IterationView doRenderStepDetails
- All CSS classes match exactly
- All emoji icons in correct positions
- All metadata items in correct order
- Status dropdown integration functional
- Label styling with API color values
- Team sections properly nested

**BGO-002 Test Case Validation**:
- Migration: TORONTO
- Iteration: RUN1  
- Step: BGO-002 instance
- All metadata displays correctly
- Labels show with #376e4e background
- Status shows as CANCELLED
- Electronics Squad shows as primary team

## Success Definition

Phase 1 is successful when:
1. This specification completely defines required HTML structure
2. All CSS classes and styling requirements are documented
3. BGO-002 test case requirements are mappable to structure
4. Implementation guidance is clear and complete
5. No ambiguity remains for Phase 2 implementation

## Next Phase Handoff

**Phase 2 Requirements**:
- Implement this exact structure in step-view.js
- Replace current rendering methods with single doRenderStepDetails
- Ensure 100% visual alignment with IterationView
- Maintain all existing functionality
- Test with BGO-002 case

---

*Phase 1 Complete: HTML Structure Specification Ready for Implementation*