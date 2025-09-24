# ADR-064: UMIG Namespace Prefixing for Confluence Platform Isolation

## Status

**Status**: Accepted
**Date**: 2025-09-20
**Author**: Development Team
**Technical Story**: US-087 - Admin GUI Phase 1 Implementation
**Related Journals**: 20250920-01.md, 20250920-02.md

## Context

During US-087 Admin GUI Phase 1 implementation, we discovered critical conflicts between UMIG's UI components and Confluence's native CSS and JavaScript. These conflicts manifested as modal components that wouldn't display properly, creating a severe user experience degradation.

### The Confluence Conflict Problem

#### Modal Display Failures

When implementing the Admin GUI modal components, we encountered systematic failures where modals would not appear or would be rendered incorrectly:

```javascript
// ❌ PROBLEM: Generic class names conflicting with Confluence
<div class="modal-wrapper">           // Confluence CSS overrides this
<div id="editModal">                  // Confluence uses this ID
<button class="modal-close">          // Confluence handles this
```

#### CSS Inheritance Issues

Confluence's CSS styling was interfering with UMIG component presentation:

- Modal backdrops not displaying due to z-index conflicts
- Button styling overridden by Confluence's AUI framework
- Typography and spacing inconsistencies
- Focus management conflicts with Confluence's accessibility systems

#### JavaScript Namespace Pollution

Confluence's JavaScript environment was creating namespace conflicts:

- Global variable collisions
- Event handler interference
- Component lifecycle management conflicts
- DOM ID conflicts causing failed element selection

### Discovery Through Crisis Resolution

The discovery occurred during a critical debugging session where:

1. **Modal Components Failed**: Users couldn't view entity details
2. **Debug Investigation**: CSS inspector revealed Confluence style overrides
3. **DOM Analysis**: Multiple elements with same IDs from different sources
4. **JavaScript Errors**: Event handlers binding to wrong elements

The investigation revealed that Confluence's platform CSS and JavaScript had implicit assumptions about DOM structure and naming conventions that directly conflicted with our component implementation.

## Decision

We will implement **mandatory UMIG namespace prefixing** for all UI components to create complete isolation from Confluence's platform code.

### Comprehensive Namespace Strategy

#### CSS Class Prefixing

All CSS classes must use the `umig-` prefix:

```css
/* ❌ BEFORE: Generic names causing conflicts */
.modal-wrapper { ... }
.table-container { ... }
.button-primary { ... }

/* ✅ AFTER: UMIG-prefixed names ensuring isolation */
.umig-modal-wrapper { ... }
.umig-table-container { ... }
.umig-button-primary { ... }
```

#### DOM ID Prefixing

All DOM element IDs must use the `umig-` prefix:

```html
<!-- ❌ BEFORE: Generic IDs conflicting with Confluence -->
<div id="editModal">
  <table id="dataTable">
    <form id="entityForm">
      <!-- ✅ AFTER: UMIG-prefixed IDs ensuring uniqueness -->
      <div id="umig-edit-modal">
        <table id="umig-data-table">
          <form id="umig-entity-form"></form>
        </table>
      </div>
    </form>
  </table>
</div>
```

#### Custom Event Prefixing

All custom events should use the `umig:` prefix:

```javascript
// ❌ BEFORE: Generic events potentially intercepted by Confluence
this.emit("table:action", data);
this.emit("modal:close");

// ✅ AFTER: UMIG-prefixed events ensuring isolation
this.emit("umig:table:action", data);
this.emit("umig:modal:close");
```

#### Data Attribute Prefixing

All data attributes should use the `data-umig-` prefix:

```html
<!-- ❌ BEFORE: Generic data attributes -->
<div data-entity-id="123" data-action="edit">
  <!-- ✅ AFTER: UMIG-prefixed data attributes -->
  <div data-umig-entity-id="123" data-umig-action="edit"></div>
</div>
```

#### CSS Variable Prefixing

All CSS custom properties should use the `--umig-` prefix:

```css
/* ❌ BEFORE: Generic CSS variables */
:root {
  --primary-color: #007cba;
  --border-radius: 4px;
}

/* ✅ AFTER: UMIG-prefixed CSS variables */
:root {
  --umig-primary-color: #007cba;
  --umig-border-radius: 4px;
}
```

### Implementation Pattern

#### Complete Isolation Through Namespace Containers

```javascript
// Create isolated namespace container
const umigContainer = document.createElement("div");
umigContainer.id = "umig-admin-gui-container";
umigContainer.className = "umig-application-root";
document.body.appendChild(umigContainer);

// All UMIG components render within this isolated container
```

#### CSS Reset and Isolation

```css
/* Complete CSS isolation for UMIG components */
.umig-application-root {
  all: initial;
  display: block;
  position: relative;
}

.umig-application-root * {
  box-sizing: border-box;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
}

/* Override any inherited Confluence styles */
#umig-admin-gui-container {
  isolation: isolate;
  contain: layout style paint;
}
```

## Consequences

### Positive

#### Complete Platform Independence

- **Zero Confluence Conflicts**: UMIG components cannot be affected by Confluence CSS or JavaScript
- **Predictable Behavior**: Components behave consistently regardless of Confluence version updates
- **Portability**: UMIG can be deployed on other platforms (Jira, SharePoint, etc.) without modification
- **Development Clarity**: Clear separation between platform and application code

#### Enhanced Maintainability

- **Debugging Simplification**: CSS inspector shows only UMIG-related styles for UMIG components
- **Version Independence**: Confluence upgrades won't break UMIG functionality
- **Code Organization**: Clear visual distinction between platform integration and application logic
- **Documentation Clarity**: API documentation can clearly distinguish UMIG-specific elements

#### Future-Proof Architecture

- **Platform Migration Ready**: UMIG can move to different Atlassian products or external platforms
- **Brand Independence**: UI can evolve independently of Confluence's design language
- **Testing Isolation**: Component tests won't be affected by platform CSS changes
- **Performance Optimization**: Reduced CSS specificity conflicts improve rendering performance

### Negative

#### Development Overhead

- **Naming Convention Discipline**: Developers must remember to prefix all UI elements
- **Code Verbosity**: Element names become longer and more verbose
- **Migration Effort**: Existing components must be retrofitted with namespace prefixes
- **Documentation Updates**: All component documentation must reflect new naming conventions

#### Cognitive Load

- **Mental Model Adjustment**: Developers must think in terms of namespaced elements
- **Code Reviews**: Reviewers must verify namespace compliance
- **Onboarding Complexity**: New developers need to understand namespace requirements
- **Pattern Consistency**: Risk of inconsistent application of namespace rules

## Implementation Details

### Mandatory Namespace Patterns

#### Component Structure Template

```javascript
class UMIGComponent extends BaseComponent {
  constructor(options) {
    super(options);
    this.namespace = "umig";
    this.componentType = options.componentType; // e.g., 'modal', 'table', 'form'
  }

  generateId(elementType) {
    return `${this.namespace}-${this.componentType}-${elementType}`;
  }

  generateClass(elementType) {
    return `${this.namespace}-${this.componentType}-${elementType}`;
  }
}
```

#### Modal Component Implementation Example

```javascript
class ModalComponent extends UMIGComponent {
  render() {
    return `
      <div id="${this.generateId("backdrop")}" class="${this.generateClass("backdrop")}">
        <div id="${this.generateId("wrapper")}" class="${this.generateClass("wrapper")}">
          <div id="${this.generateId("dialog")}" class="${this.generateClass("dialog")}">
            <div class="${this.generateClass("header")}">
              <h2 class="${this.generateClass("title")}">Modal Title</h2>
              <button class="${this.generateClass("close")}" data-umig-action="close">×</button>
            </div>
            <div class="${this.generateClass("body")}">
              Modal content
            </div>
            <div class="${this.generateClass("footer")}">
              <button class="${this.generateClass("btn-close")}" data-umig-action="close">Close</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
```

### CSS Architecture Pattern

#### Component-Specific Stylesheets

```css
/* File: umig-modal-component.css */
/* All styles prefixed and scoped to avoid conflicts */

.umig-modal-backdrop {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  background-color: rgba(0, 0, 0, 0.6) !important;
  z-index: 99998 !important;
  display: none;
}

.umig-modal-wrapper {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  z-index: 99999 !important;
  display: none;
  align-items: center !important;
  justify-content: center !important;
}

.umig-modal-dialog {
  position: relative !important;
  background: white !important;
  border-radius: var(--umig-border-radius, 8px) !important;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3) !important;
  max-width: 800px !important;
  width: 90% !important;
  max-height: 80vh !important;
}
```

### JavaScript Event Management

#### Namespaced Event System

```javascript
class UMIGEventManager {
  static emit(eventType, data) {
    const namespacedEvent = `umig:${eventType}`;
    document.dispatchEvent(new CustomEvent(namespacedEvent, { detail: data }));
  }

  static on(eventType, handler) {
    const namespacedEvent = `umig:${eventType}`;
    document.addEventListener(namespacedEvent, handler);
  }

  static off(eventType, handler) {
    const namespacedEvent = `umig:${eventType}`;
    document.removeEventListener(namespacedEvent, handler);
  }
}

// Usage
UMIGEventManager.emit("table:action", { action: "edit", id: 123 });
UMIGEventManager.on("modal:close", this.handleModalClose.bind(this));
```

### Migration Strategy for Existing Components

#### Phase 1: Critical Components (Immediate)

- Modal components (highest conflict risk)
- Table components with complex CSS
- Form components with input styling
- Button components with interactive states

#### Phase 2: Standard Components (Sprint completion)

- Filter components
- Pagination components
- Navigation components
- Status display components

#### Phase 3: Utility Components (Next sprint)

- Toast notifications
- Loading spinners
- Progress indicators
- Icon components

### Validation and Compliance

#### Automated Compliance Checking

```javascript
// Linting rule to enforce namespace prefixing
const umigNamespaceRule = {
  rules: {
    "umig-namespace-required": {
      css: /^\.umig-/,
      id: /^umig-/,
      dataAttribute: /^data-umig-/,
      cssVariable: /^--umig-/,
    },
  },
};
```

#### Pre-commit Hooks

```bash
# Git pre-commit hook to validate namespace compliance
#!/bin/sh
echo "Validating UMIG namespace compliance..."

# Check for non-namespaced CSS classes in component files
if grep -r "class=\"[^u]" src/groovy/umig/web/js/components/ --include="*.js"; then
  echo "❌ Error: Non-namespaced CSS classes found in components"
  exit 1
fi

# Check for non-namespaced IDs in component files
if grep -r "id=\"[^u]" src/groovy/umig/web/js/components/ --include="*.js"; then
  echo "❌ Error: Non-namespaced IDs found in components"
  exit 1
fi

echo "✅ Namespace compliance validated"
```

### Performance Considerations

#### CSS Specificity Optimization

- Namespace prefixing reduces CSS specificity conflicts
- Faster style calculation due to reduced cascade complexity
- Improved browser rendering performance through style isolation

#### JavaScript Performance

- Reduced DOM query conflicts improve element selection speed
- Event delegation becomes more predictable
- Memory usage optimization through isolated event handling

### Security Benefits

#### DOM-based XSS Prevention

- Namespace prefixing prevents malicious code from targeting UMIG elements
- Clear separation between trusted (UMIG) and untrusted (external) content
- Improved Content Security Policy (CSP) effectiveness

#### Event Handler Security

- Namespaced events prevent malicious event interception
- Clear audit trail for UMIG-specific interactions
- Reduced surface area for event-based attacks

## Related ADRs

- **ADR-057**: JavaScript Module Loading Anti-Pattern - Component loading patterns that enable namespace isolation
- **ADR-058**: Global SecurityUtils Access Pattern - Security utilities that work within namespaced environment
- **ADR-060**: BaseEntityManager Interface Compatibility Pattern - Component interfaces that support namespace patterns
- **ADR-004**: Vanilla JavaScript Frontend - Foundation decision that enables namespace implementation

## Validation

Success criteria for this decision:

- ✅ Zero CSS conflicts between UMIG and Confluence components
- ✅ Modal components display correctly in all Confluence environments
- ✅ Components maintain functionality when Confluence is updated
- ✅ All new components follow namespace prefixing patterns
- ✅ Existing components migrated to namespace patterns
- ✅ Development team adopts namespace discipline

## Implementation Examples

### Before (Conflicting Implementation)

```javascript
// ❌ ANTI-PATTERN: Generic naming causing Confluence conflicts
class ModalComponent {
  render() {
    return `
      <div id="editModal" class="modal-wrapper">
        <div class="modal-dialog">
          <div class="modal-header">
            <h2 class="modal-title">Edit User</h2>
            <button class="close" data-action="close">×</button>
          </div>
          <div class="modal-body">...</div>
        </div>
      </div>
    `;
  }

  open() {
    document.getElementById("editModal").style.display = "block";
    // ❌ May conflict with Confluence's modal management
  }
}
```

### After (Namespace Isolated Implementation)

```javascript
// ✅ CORRECT PATTERN: UMIG namespace preventing Confluence conflicts
class ModalComponent {
  render() {
    return `
      <div id="umig-edit-modal" class="umig-modal-wrapper">
        <div class="umig-modal-dialog">
          <div class="umig-modal-header">
            <h2 class="umig-modal-title">Edit User</h2>
            <button class="umig-modal-close" data-umig-action="close">×</button>
          </div>
          <div class="umig-modal-body">...</div>
        </div>
      </div>
    `;
  }

  open() {
    document.getElementById("umig-edit-modal").style.display = "block";
    // ✅ Cannot conflict with Confluence - completely isolated namespace
  }
}
```

### CSS Isolation Example

```css
/* ❌ BEFORE: Generic CSS vulnerable to Confluence conflicts */
.modal-wrapper {
  position: fixed;
  /* Confluence CSS may override these properties */
}

.table-container {
  border: 1px solid #ccc;
  /* AUI framework may override table styling */
}

/* ✅ AFTER: Namespaced CSS immune to Confluence conflicts */
.umig-modal-wrapper {
  position: fixed !important;
  /* Confluence cannot override - different namespace */
}

.umig-table-container {
  border: 1px solid var(--umig-border-color, #ccc) !important;
  /* Completely isolated from AUI framework */
}
```

### Event Management Example

```javascript
// ❌ BEFORE: Generic events potentially intercepted
document.addEventListener("click", this.handleClick);
this.emit("modalClosed");

// ✅ AFTER: Namespaced events ensuring isolation
document.addEventListener("click", this.handleUMIGClick);
this.emit("umig:modalClosed");
```

## Security Considerations

### Namespace as Security Boundary

The UMIG namespace creates a security boundary that:

- **Prevents Cross-Component Attacks**: Malicious code cannot easily target UMIG elements using generic selectors
- **Enables Security Auditing**: All UMIG-related DOM modifications are clearly identifiable
- **Supports Content Security Policy**: CSP rules can be crafted specifically for namespaced elements
- **Facilitates Security Testing**: Penetration testing can focus specifically on UMIG namespace

### Implementation Security Pattern

```javascript
class SecureUMIGComponent {
  constructor(options) {
    super(options);
    this.validateNamespace();
  }

  validateNamespace() {
    // Ensure all component elements use proper namespace
    if (!this.id.startsWith("umig-")) {
      throw new Error(
        "Security violation: Component ID must use umig- namespace",
      );
    }
  }

  sanitizeContent(content) {
    // Apply XSS protection within UMIG namespace
    return window.SecurityUtils.sanitizeHTML(content, {
      allowedClasses: /^umig-/,
      allowedIds: /^umig-/,
    });
  }
}
```

## Lessons Learned

### Platform Integration Assumptions

1. **Never Assume Clean Slate**: Host platforms like Confluence have extensive CSS and JavaScript that will interfere with guest applications
2. **Namespace Everything**: Generic naming conventions are guaranteed to cause conflicts in rich platform environments
3. **Isolation is Essential**: Complete isolation is more maintainable than attempting to work around platform conflicts
4. **Test in Context**: Component testing must occur within the actual platform environment, not isolated test environments

### Development Process Improvements

1. **Namespace-First Development**: Start with namespace requirements rather than retrofitting
2. **Platform Conflict Awareness**: Always consider host platform implications during component design
3. **CSS Specificity Strategy**: Use namespace prefixing to manage CSS cascade complexity
4. **Documentation Integration**: Platform-specific constraints must be documented within ADRs

## Amendment History

- **2025-09-20**: Initial ADR creation based on US-087 Phase 1 modal conflict discovery and resolution
