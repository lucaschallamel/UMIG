# US-036 Phase 2: Code Refactoring Implementation

**Agent**: Code Refactoring Specialist  
**Objective**: Implement HTML structure changes in standalone StepView JavaScript  
**Timeline**: Sprint 5 Day 3 PM (4 hours)  
**Test Case**: BGO-002 (TORONTO/RUN1)

## Implementation Plan

Based on Phase 1 specification, refactor `/Users/lucaschallamel/Documents/GitHub/UMIG/src/groovy/umig/web/js/step-view.js` to achieve 100% structural alignment with IterationView.

## Current Implementation Issues

**Current Code Location (line ~620)**:
```javascript
<div class="step-details-content" style="background-color: white !important; color: #172B4D !important;">
    <div class="step-info" data-sti-id="${summary.ID || ""}" style="background-color: white !important; color: #172B4D !important;">
        ${this.renderStepSummary(summary)}
        ${this.renderLabels(summary.Labels)}
        ${this.renderInstructions(instructions)}
        ${this.renderImpactedTeams(impactedTeams)}
        ${this.renderComments(comments)}
    </div>
</div>
```

**Problems**:
1. Uses separate rendering methods instead of unified doRenderStepDetails
2. Wrong HTML structure - missing required CSS classes and layout
3. Missing breadcrumb navigation, status integration, metadata sections
4. Inline styling overrides CSS framework

## Required Changes

### 1. Replace Current Rendering Block

**OLD (lines ~620-630)**:
```javascript
<div class="step-details-content" style="background-color: white !important; color: #172B4D !important;">
    <div class="step-info" data-sti-id="${summary.ID || ""}" style="background-color: white !important; color: #172B4D !important;">
        ${this.renderStepSummary(summary)}
        ${this.renderLabels(summary.Labels)}
        ${this.renderInstructions(instructions)}
        ${this.renderImpactedTeams(impactedTeams)}
        ${this.renderComments(comments)}
    </div>
</div>
```

**NEW**:
```javascript
<div class="step-details-content">
    ${this.doRenderStepDetails(stepData, container)}
</div>
```

### 2. Implement doRenderStepDetails Method

Add this new method to StepView class (after existing render methods):

```javascript
/**
 * Render step details using exact IterationView structure
 * This method implements 100% structural alignment with IterationView doRenderStepDetails
 */
doRenderStepDetails(stepData) {
    const summary = stepData.stepSummary || {};
    const instructions = stepData.instructions || [];
    const impactedTeams = stepData.impactedTeams || [];
    const comments = stepData.comments || [];
    
    // Helper function to get status display - use the main getStatusDisplay method
    const getStatusDisplay = (status) => {
        return this.createStatusBadge(status);
    };
    
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
                        ${
                          summary.IterationTypes &&
                          summary.IterationTypes.length > 0
                            ? summary.IterationTypes.map(
                                (type) =>
                                  `<span class="scope-tag">${type}</span>`,
                              ).join(" ")
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
                ${
                  summary.Labels && summary.Labels.length > 0
                    ? `
                <div class="metadata-item">
                    <span class="label">🏷️ Labels:</span>
                    <span class="value">
                        ${summary.Labels.map((label) => `<span class="label-tag" style="background-color: ${label.color}; color: ${this.getContrastColor(label.color)};">${label.name}</span>`).join(" ")}
                    </span>
                </div>
                `
                    : ""
                }
            </div>
            
            <div class="step-description">
                <h4>📝 Description:</h4>
                <p>${summary.Description || "No description available"}</p>
            </div>
        </div>
    `;
    
    // Add instructions section using IterationView pattern
    if (instructions.length > 0) {
        html += `
            <div class="instructions-section">
                <h4>📋 INSTRUCTIONS</h4>
                <div class="instructions-table">
                    <div class="instructions-header">
                        <div class="col-num">#</div>
                        <div class="col-instruction">Instruction</div>
                        <div class="col-team">Team</div>
                        <div class="col-control">Control</div>
                        <div class="col-duration">Duration</div>
                        <div class="col-complete">✓</div>
                    </div>
        `;
        
        instructions.forEach((instruction, index) => {
            html += `
                <div class="instruction-row ${instruction.IsCompleted ? "completed" : ""}">
                    <div class="col-num">${instruction.Order || index + 1}</div>
                    <div class="col-instruction">${instruction.Description || instruction.Instruction || "No description"}</div>
                    <div class="col-team">${instruction.Team || summary.AssignedTeam || "TBD"}</div>
                    <div class="col-control">${instruction.Control || instruction.ControlCode || `CTRL-${String(index + 1).padStart(2, "0")}`}</div>
                    <div class="col-duration">${instruction.Duration ? `${instruction.Duration} min.` : instruction.EstimatedDuration ? `${instruction.EstimatedDuration} min.` : "5 min."}</div>
                    <div class="col-complete">
                        <input type="checkbox" 
                            class="instruction-checkbox pilot-only" 
                            data-instruction-id="${instruction.ID || instruction.ini_id || instruction.Order || index + 1}"
                            data-step-id="${summary.ID || stepData.stepCode || ""}"
                            data-instruction-index="${index}"
                            ${instruction.IsCompleted ? "checked" : ""}>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    // Add comment section with real data (using existing implementation)
    html += `
        <div class="comments-section">
            <h4>💬 COMMENTS (${comments.length})</h4>
            <div class="comments-list" id="comments-list">
    `;
    
    if (comments.length > 0) {
        comments.forEach((comment) => {
            const relativeTime = this.getRelativeTime(comment.CreatedDate);
            html += `
                <div class="comment-item" data-comment-id="${comment.Id}">
                    <div class="comment-header">
                        <span class="comment-author">${this.escapeHtml(comment.AuthorDisplayName || comment.AuthorUsername || "Unknown")}${comment.AuthorTeam ? ` (${this.escapeHtml(comment.AuthorTeam)})` : ""}</span>
                        <span class="comment-timestamp">${relativeTime}</span>
                    </div>
                    <div class="comment-body">${this.escapeHtml(comment.CommentText || comment.Text || "")}</div>
                </div>
            `;
        });
    } else {
        html += `<p class="no-comments">No comments yet.</p>`;
    }
    
    html += `
            </div>
            <div class="add-comment-section">
                <h5>Add Comment</h5>
                <div class="comment-form">
                    <textarea id="new-comment-text" 
                              class="textarea" 
                              placeholder="Add your comment here..." 
                              rows="3" 
                              style="width: 100%; margin-bottom: 8px;"></textarea>
                    <button id="add-comment-btn" 
                            class="aui-button aui-button-primary" 
                            type="button">
                        Add Comment
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return html;
}
```

### 3. Add getContrastColor Helper Method

Add this helper method if not already present:

```javascript
/**
 * Calculate contrast color for label backgrounds
 */
getContrastColor(hexColor) {
    // Convert hex to RGB
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return black or white based on luminance
    return luminance > 0.5 ? '#000000' : '#ffffff';
}
```

### 4. Update Main Render Call

**Current (around line 620)**:
```javascript
<div class="step-details-content" style="background-color: white !important; color: #172B4D !important;">
    <div class="step-info" data-sti-id="${summary.ID || ""}" style="background-color: white !important; color: #172B4D !important;">
        ${this.renderStepSummary(summary)}
        ${this.renderLabels(summary.Labels)}
        ${this.renderInstructions(instructions)}
        ${this.renderImpactedTeams(impactedTeams)}
        ${this.renderComments(comments)}
    </div>
</div>
```

**Replace with**:
```javascript
<div class="step-details-content">
    ${this.doRenderStepDetails(stepData)}
</div>
```

### 5. Remove Obsolete Methods (Optional - for cleanup)

These methods can be removed after verification:
- `renderStepSummary(summary)`
- `renderLabels(labels)` 
- `renderInstructions(instructions)`
- `renderImpactedTeams(impactedTeams)`
- `renderComments(comments)`

**Note**: Keep for now during testing, remove in final cleanup.

## Implementation Steps

1. **Add doRenderStepDetails method** to StepView class
2. **Add getContrastColor helper method** if missing
3. **Update main render call** to use doRenderStepDetails
4. **Test with BGO-002** test case
5. **Verify visual alignment** with IterationView
6. **Ensure all functionality** still works (status updates, comments, etc.)

## BGO-002 Test Validation

After implementation, test with:
- URL: `?mig=TORONTO&ite=RUN1&stepid=BGO-002`
- Expected: Step displays with Electronics Squad team
- Expected: Labels show with #376e4e background color
- Expected: Status shows as CANCELLED
- Expected: Breadcrumb shows TORONTO › Plan › RUN1 › Sequence 1 › Phase 1

## Success Criteria

Phase 2 is successful when:
1. ✅ Single doRenderStepDetails method implemented
2. ✅ HTML output matches Phase 1 specification exactly
3. ✅ All metadata items use same CSS classes as IterationView
4. ✅ Status dropdown integration functional
5. ✅ Zero regressions in existing functionality
6. ✅ BGO-002 test case displays correctly
7. ✅ Visual alignment with IterationView achieved

## Risk Mitigation

- **Backup**: Keep old rendering methods during testing
- **Rollback**: Easy to revert by restoring old render call
- **Testing**: Comprehensive validation with multiple test cases
- **Documentation**: Clear change log for future reference

---

*Phase 2 Implementation Plan Ready - Proceed with Code Changes*