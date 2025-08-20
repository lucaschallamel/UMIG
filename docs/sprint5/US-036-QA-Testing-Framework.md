# US-036 StepView QA Testing Framework

**Phase 3**: Visual Validation & Testing  
**Agent**: GENDEV QA Coordinator  
**Duration**: 4 hours (Day 4 AM)  
**Test Case**: BGO-002

## Testing Methodology

### 1. Automated Visual Comparison Framework

```javascript
// BGO-002 Visual Validation Test Suite
const StepViewValidationSuite = {
  testCase: 'BGO-002',
  migrationName: 'TORONTO',
  iterationName: 'RUN1',
  stepCode: 'BGO-002',
  
  validateComponent: async function(componentSelector, validationPoints) {
    const results = [];
    
    for (const point of validationPoints) {
      const result = await this.validateSinglePoint(componentSelector, point);
      results.push(result);
    }
    
    return results;
  },
  
  validateSinglePoint: async function(selector, validationPoint) {
    // Implementation for each validation point
    return {
      id: validationPoint.id,
      description: validationPoint.description,
      expected: validationPoint.expected,
      actual: validationPoint.actual,
      passed: validationPoint.expected === validationPoint.actual
    };
  }
};
```

### 2. 40-Point Validation Checklist

#### Section 1: Breadcrumb Navigation (6 points)
```javascript
const breadcrumbValidation = [
  {
    id: 'BC-001',
    description: 'Migration Name shows "TORONTO"',
    selector: '.breadcrumb-item:nth-child(1)',
    expected: 'TORONTO',
    test: 'textContent'
  },
  {
    id: 'BC-002', 
    description: 'Iteration Name shows "RUN1"',
    selector: '.breadcrumb-item:nth-child(3)', // After Migration › Plan
    expected: 'RUN1',
    test: 'textContent'
  },
  {
    id: 'BC-003',
    description: 'Plan Name shows correct plan name',
    selector: '.breadcrumb-item:nth-child(2)', // Between Migration and Iteration
    expected: '[Plan Name]', // To be determined from API
    test: 'textContent'
  },
  {
    id: 'BC-004',
    description: 'Sequence Name shows "Sequence 1"',
    selector: '.breadcrumb-item:nth-child(4)',
    expected: 'Sequence 1',
    test: 'textContent'
  },
  {
    id: 'BC-005',
    description: 'Phase Name shows "Phase 1"',
    selector: '.breadcrumb-item:nth-child(5)',
    expected: 'Phase 1', 
    test: 'textContent'
  },
  {
    id: 'BC-006',
    description: 'Separator uses "›" between items',
    selector: '.breadcrumb-separator',
    expected: '›',
    test: 'textContent'
  }
];
```

#### Section 2: Step Header (4 points)
```javascript
const stepHeaderValidation = [
  {
    id: 'SH-001',
    description: 'Step Code displays as "BGO-002"',
    selector: '.step-code',
    expected: 'BGO-002',
    test: 'textContent'
  },
  {
    id: 'SH-002',
    description: 'Step Name shows after dash',
    selector: '.step-title-text',
    expected: '[Step Master Name]',
    test: 'textContent'
  },
  {
    id: 'SH-003',
    description: 'Icon shows appropriate step type',
    selector: '.step-code',
    expected: '📋',
    test: 'contains'
  },
  {
    id: 'SH-004',
    description: 'Title format is "BGO-002 - [Step Name]"',
    selector: 'h3.step-name', // Corrected from h2 to h3
    expected: /BGO-002\s*-\s*.+/,
    test: 'pattern'
  }
];
```

#### Section 3: Status Information (4 points)
```javascript
const statusValidation = [
  {
    id: 'ST-001',
    description: 'Status Dropdown shows "CANCELLED"',
    selector: '#step-status-dropdown',
    expected: 'CANCELLED',
    test: 'selectedValue'
  },
  {
    id: 'ST-002',
    description: 'Status Color appropriate for CANCELLED',
    selector: '#step-status-dropdown',
    expected: '#FF5630', // Red for cancelled
    test: 'computedStyle.color'
  },
  {
    id: 'ST-003',
    description: 'PILOT/ADMIN users can change status',
    selector: '#step-status-dropdown',
    expected: false, // Should not be disabled for PILOT/ADMIN
    test: 'disabled'
  },
  {
    id: 'ST-004',
    description: 'NORMAL users see status as read-only',
    selector: '#step-status-dropdown',
    expected: true, // Should be disabled for NORMAL
    test: 'disabled'
  }
];
```

#### Section 4: Team Information (2 points)
```javascript
const teamValidation = [
  {
    id: 'TM-001',
    description: 'Primary Team shows "Electronics Squad"',
    selector: '.metadata-item:contains("Primary Team") .value',
    expected: 'Electronics Squad',
    test: 'textContent'
  },
  {
    id: 'TM-002',
    description: 'Team Icon shows if available',
    selector: '.step-owner',
    expected: '👥',
    test: 'contains'
  }
];
```

#### Section 5: Labels Display (4 points)
```javascript
const labelsValidation = [
  {
    id: 'LB-001',
    description: 'At least 1 label shown',
    selector: '.label-tag',
    expected: 1,
    test: 'count'
  },
  {
    id: 'LB-002',
    description: 'Label Color background #376e4e applied',
    selector: '.label-tag',
    expected: 'rgb(55, 110, 78)', // #376e4e converted
    test: 'computedStyle.backgroundColor'
  },
  {
    id: 'LB-003',
    description: 'Label Text readable contrast',
    selector: '.label-tag',
    expected: 4.5, // WCAG AA minimum
    test: 'contrastRatio'
  },
  {
    id: 'LB-004',
    description: 'Label Style has rounded corners',
    selector: '.label-tag',
    expected: /\d+px/,
    test: 'computedStyle.borderRadius'
  }
];
```

#### Section 6: Instructions Table (6 points)
```javascript
const instructionsValidation = [
  {
    id: 'IN-001',
    description: 'Shows 2 instructions',
    selector: '.instruction-row',
    expected: 2,
    test: 'count'
  },
  {
    id: 'IN-002',
    description: 'Order Column sequential (1, 2)',
    selector: '.instruction-order',
    expected: ['1', '2'],
    test: 'sequentialText'
  },
  {
    id: 'IN-003',
    description: 'Description Column shows full text',
    selector: '.instruction-body',
    expected: true,
    test: 'hasContent'
  },
  {
    id: 'IN-004',
    description: 'Checkbox State reflects completion',
    selector: '.instruction-checkbox',
    expected: 'mixed', // Some checked, some not
    test: 'checkboxStates'
  },
  {
    id: 'IN-005',
    description: 'Team Column shows assigned team',
    selector: '.instruction-team',
    expected: true,
    test: 'hasContent'
  },
  {
    id: 'IN-006',
    description: 'Duration Column shows minutes',
    selector: '.instruction-duration',
    expected: /\d+\s*min/,
    test: 'pattern'
  }
];
```

#### Section 7: Comments Section (6 points)
```javascript
const commentsValidation = [
  {
    id: 'CM-001',
    description: 'Comment Count header shows "(N)"',
    selector: '.comments-section h4',
    expected: /\(\d+\)/,
    test: 'pattern'
  },
  {
    id: 'CM-002',
    description: 'Author Display shows full name',
    selector: '.comment-author',
    expected: true,
    test: 'hasContent'
  },
  {
    id: 'CM-003',
    description: 'Author Team shows in parentheses',
    selector: '.comment-author',
    expected: /\(.+\)/,
    test: 'pattern'
  },
  {
    id: 'CM-004',
    description: 'Timestamp shows "time ago" format',
    selector: '.comment-timestamp',
    expected: /\d+\s+(minute|hour|day|week)s?\s+ago/,
    test: 'pattern'
  },
  {
    id: 'CM-005',
    description: 'Comment Body properly escaped HTML',
    selector: '.comment-body',
    expected: false,
    test: 'containsHTML'
  },
  {
    id: 'CM-006',
    description: 'Add Comment button available',
    selector: '.add-comment-btn',
    expected: true,
    test: 'exists'
  }
];
```

#### Section 8: Environment Information (3 points)
```javascript
const environmentValidation = [
  {
    id: 'EN-001',
    description: 'Target Environment shows backup warning',
    selector: '.metadata-item:contains("Target Environment") .value',
    expected: 'BACKUP (!No Environment Assigned Yet!)',
    test: 'textContent'
  },
  {
    id: 'EN-002',
    description: 'Environment Icon displayed',
    selector: '.step-metadata .metadata-item:contains("Target Environment")',
    expected: '🎯',
    test: 'contains'
  },
  {
    id: 'EN-003',
    description: 'Warning Indicator for unassigned',
    selector: '.metadata-item:contains("Target Environment") .value',
    expected: '!',
    test: 'contains'
  }
];
```

#### Section 9: Action Buttons (5 points)
```javascript
const actionButtonsValidation = [
  {
    id: 'AB-001',
    description: 'Start Step available for appropriate roles',
    selector: '.start-step-btn',
    expected: 'roleDependent',
    test: 'roleBasedVisibility'
  },
  {
    id: 'AB-002',
    description: 'Complete Step available when in progress',
    selector: '.complete-step-btn',
    expected: 'statusDependent',
    test: 'statusBasedVisibility'
  },
  {
    id: 'AB-003',
    description: 'Block Step available for PILOT/ADMIN',
    selector: '.block-step-btn',
    expected: ['PILOT', 'ADMIN'],
    test: 'roleRestriction'
  },
  {
    id: 'AB-004',
    description: 'Add Comment available for all users',
    selector: '.add-comment-btn',
    expected: true,
    test: 'alwaysVisible'
  },
  {
    id: 'AB-005',
    description: 'Button states reflect current status',
    selector: '.action-buttons .aui-button',
    expected: 'contextual',
    test: 'contextualStates'
  }
];
```

### 3. Cross-Role Testing Matrix

| Test Scenario | NORMAL User | PILOT User | ADMIN User |
|---------------|-------------|------------|------------|
| **View Access** | ✅ Read-only | ✅ Read + Edit | ✅ Full Access |
| **Status Dropdown** | 🔒 Disabled | ✅ Enabled | ✅ Enabled |
| **Instruction Checkboxes** | 🔒 Disabled | ✅ Enabled | ✅ Enabled |
| **Add Comments** | ✅ Enabled | ✅ Enabled | ✅ Enabled |
| **Bulk Operations** | ❌ Hidden | ✅ Visible | ✅ Visible |
| **Advanced Controls** | ❌ Hidden | ✅ Limited | ✅ Full |

### 4. Performance Benchmarks

```javascript
const performanceTests = {
  loadTime: {
    target: '<3 seconds',
    measure: 'DOMContentLoaded to fully rendered',
    acceptable: '<5 seconds'
  },
  
  cacheEfficiency: {
    target: '>80% cache hit rate',
    measure: 'API calls avoided through caching',
    acceptable: '>60%'
  },
  
  memoryUsage: {
    target: '<50MB additional',
    measure: 'Memory footprint increase',
    acceptable: '<100MB'
  },
  
  renderTime: {
    target: '<500ms',
    measure: 'Time to render step details',
    acceptable: '<1 second'
  }
};
```

### 5. Test Execution Script

```javascript
// Automated test execution for BGO-002
async function executeBGO002ValidationSuite() {
  const results = {
    breadcrumb: await StepViewValidationSuite.validateComponent('.step-breadcrumb', breadcrumbValidation),
    header: await StepViewValidationSuite.validateComponent('.step-header-content', stepHeaderValidation),
    status: await StepViewValidationSuite.validateComponent('.step-key-info', statusValidation),
    team: await StepViewValidationSuite.validateComponent('.team-section', teamValidation),
    labels: await StepViewValidationSuite.validateComponent('.labels-section', labelsValidation),
    instructions: await StepViewValidationSuite.validateComponent('.instructions-section', instructionsValidation),
    comments: await StepViewValidationSuite.validateComponent('.comments-section', commentsValidation),
    environment: await StepViewValidationSuite.validateComponent('.step-metadata', environmentValidation),
    actions: await StepViewValidationSuite.validateComponent('.action-buttons', actionButtonsValidation)
  };
  
  const summary = generateTestSummary(results);
  return summary;
}

function generateTestSummary(results) {
  let totalTests = 0;
  let passedTests = 0;
  
  Object.values(results).forEach(section => {
    section.forEach(test => {
      totalTests++;
      if (test.passed) passedTests++;
    });
  });
  
  return {
    totalTests,
    passedTests,
    failedTests: totalTests - passedTests,
    successRate: Math.round((passedTests / totalTests) * 100),
    passed: passedTests === totalTests
  };
}
```

## QA Coordinator Task Delegation

**GENDEV Agent**: Use the gendev-qa-coordinator agent to execute comprehensive visual validation testing for US-036 StepView alignment. The agent should run the 40-point validation checklist against BGO-002 test case, perform cross-role testing (NORMAL, PILOT, ADMIN), conduct performance benchmarking, and generate detailed pass/fail report. Focus on ensuring 100% visual consistency between IterationView StepView pane and standalone StepView macro.

## Expected Deliverables

1. **Validation Report**: Complete 40-point checklist results
2. **Cross-Role Matrix**: Testing results for all user roles  
3. **Performance Metrics**: Load time, cache efficiency, memory usage
4. **Browser Compatibility**: Chrome, Firefox, Safari results
5. **Issue Log**: Any remaining discrepancies with severity ratings
6. **Sign-off Recommendation**: Pass/Fail recommendation for production

## Success Criteria

- **40/40 validation points pass** for BGO-002 test case
- **100% visual consistency** achieved between views
- **All user roles function identically** across both views
- **Performance impact <5%** of baseline metrics
- **Zero critical or high-severity issues** remaining

---

*This QA framework ensures comprehensive validation of the visual alignment between StepView components while maintaining all functional and performance requirements.*