/**
 * ModalComponent - Reusable Modal Dialog Component
 * US-082-B Component Architecture Development
 *
 * Refactored from ModalManager.js with enhanced features:
 * - Lifecycle management through BaseComponent
 * - Event-driven architecture
 * - Built-in form validation
 * - Loading and error states
 * - Accessibility compliant (WCAG AA)
 * - Keyboard navigation support
 * - Animation support
 * - Responsive design
 * - Multiple modal types (info, warning, confirm, form)
 */

// Import BaseComponent for Node.js/testing environment
if (typeof BaseComponent === "undefined" && typeof require !== "undefined") {
  var BaseComponent = require("./BaseComponent");
}

// Use global SecurityUtils that's loaded by the module system
// SecurityUtils is guaranteed to be available on window.SecurityUtils by the module loader

// Define the class only if BaseComponent is available
// In browser, the module loader ensures BaseComponent is loaded first
class ModalComponent extends BaseComponent {
  constructor(containerId, config = {}) {
    super(containerId, {
      ...config,
      type: config.type || "default", // default, info, warning, error, confirm, form
      title: config.title || "",
      content: config.content || "",
      size: config.size || "medium", // small, medium, large, full
      closeable: config.closeable !== false,
      closeOnOverlay: config.closeOnOverlay !== false,
      closeOnEscape: config.closeOnEscape !== false,
      animated: config.animated !== false,
      centered: config.centered !== false,
      buttons: config.buttons || [],
      form: config.form || null,
      onOpen: config.onOpen || null,
      onClose: config.onClose || null,
      onSubmit: config.onSubmit || null,
      validation: config.validation || {},
    });

    // Modal state
    this.isOpen = false;
    this.previousFocus = null;
    this.formData = {};
    this.validationErrors = {};

    // Tab functionality state (US-087 extension)
    this.tabs = new Map();
    this.activeTabId = null;
    this.tabsEnabled = config.enableTabs || false;
  }

  /**
   * Initialize modal component
   */
  onInitialize() {
    // Create modal structure if not exists
    if (!this.container.querySelector(".modal-wrapper")) {
      this.createModalStructure();
    }

    // Setup keyboard trap for accessibility
    this.setupKeyboardTrap();

    // Initialize form if present
    if (this.config.form) {
      this.initializeForm();
    }
  }

  /**
   * Create modal HTML structure
   */
  createModalStructure() {
    const modalHTML = `
      <div class="modal-wrapper ${this.config.animated ? "modal-animated" : ""}" 
           role="dialog" 
           aria-modal="true"
           aria-labelledby="modal-title-${this.containerId}"
           aria-describedby="modal-content-${this.containerId}"
           hidden>
        <div class="modal-overlay"></div>
        <div class="modal-container modal-${this.config.size} ${this.config.centered ? "modal-centered" : ""}">
          <div class="modal-dialog">
            <div class="modal-header modal-type-${this.config.type}">
              <h2 id="modal-title-${this.containerId}" class="modal-title"></h2>
              ${
                this.config.closeable
                  ? `
                <button class="modal-close" aria-label="Close modal">
                  <span aria-hidden="true">&times;</span>
                </button>
              `
                  : ""
              }
            </div>
            ${this.tabsEnabled ? '<div class="modal-tabs-nav" role="tablist"></div>' : ""}
            <div id="modal-content-${this.containerId}" class="modal-body">
              <!-- Content will be injected here -->
            </div>
            <div class="modal-footer">
              <!-- Buttons will be injected here -->
            </div>
          </div>
        </div>
      </div>
    `;

    // Use SecurityUtils for safe modal structure creation if available
    if (typeof window.SecurityUtils !== "undefined") {
      window.SecurityUtils.safeSetInnerHTML(this.container, modalHTML, {
        allowedTags: ["div", "button", "span", "h2"],
        allowedAttributes: {
          div: [
            "class",
            "role",
            "aria-modal",
            "aria-labelledby",
            "aria-describedby",
            "hidden",
          ],
          button: ["class", "aria-label"],
          span: ["aria-hidden"],
          h2: ["id", "class"],
        },
      });
    } else {
      this.container.innerHTML = modalHTML;
    }
  }

  /**
   * Render modal content
   */
  onRender() {
    if (!this.isOpen) return;

    const wrapper = this.container.querySelector(".modal-wrapper");
    const title = this.container.querySelector(".modal-title");
    const body = this.container.querySelector(".modal-body");
    const footer = this.container.querySelector(".modal-footer");

    // Set title
    if (title) {
      title.textContent = this.config.title;
    }

    // Render tabs if enabled
    if (this.tabsEnabled && this.tabs.size > 0) {
      this.renderTabs();
      this.renderActiveTabContent();
      return; // Skip normal content rendering when tabs are active
    }

    // Set content
    if (body) {
      if (this.config.form) {
        // Use SecurityUtils for form rendering if available
        if (typeof window.SecurityUtils !== "undefined") {
          window.SecurityUtils.safeSetInnerHTML(body, this.renderForm(), {
            allowedTags: [
              "form",
              "div",
              "label",
              "input",
              "textarea",
              "select",
              "option",
              "button",
              "span",
              "small",
              "fieldset",
              "legend",
            ],
            allowedAttributes: {
              form: ["class", "novalidate"],
              input: [
                "type",
                "id",
                "name",
                "class",
                "value",
                "placeholder",
                "required",
                "readonly",
                "disabled",
                "checked",
                "aria-invalid",
                "aria-describedby",
              ],
              textarea: [
                "id",
                "name",
                "class",
                "rows",
                "placeholder",
                "required",
                "readonly",
                "disabled",
                "aria-invalid",
                "aria-describedby",
              ],
              select: [
                "id",
                "name",
                "class",
                "required",
                "disabled",
                "aria-invalid",
                "aria-describedby",
              ],
              option: ["value", "selected"],
              label: ["for", "class"],
              div: ["class", "role"],
              span: ["id", "class", "role"],
            },
          });
        } else {
          body.innerHTML = this.renderForm();
        }
      } else {
        // Use SecurityUtils for content rendering if available
        if (typeof window.SecurityUtils !== "undefined") {
          window.SecurityUtils.safeSetInnerHTML(body, this.config.content, {
            allowedTags: [
              "p",
              "br",
              "strong",
              "em",
              "u",
              "span",
              "div",
              "a",
              "ul",
              "ol",
              "li",
              "h1",
              "h2",
              "h3",
              "h4",
              "h5",
              "h6",
            ],
            allowedAttributes: {
              a: ["href", "title", "target"],
              span: ["class"],
              div: ["class"],
            },
          });
        } else {
          body.innerHTML = this.config.content;
        }
      }
    }

    // Render buttons
    if (footer) {
      // Use SecurityUtils for button rendering if available
      if (typeof window.SecurityUtils !== "undefined") {
        window.SecurityUtils.safeSetInnerHTML(footer, this.renderButtons(), {
          allowedTags: ["button"],
          allowedAttributes: {
            button: ["class", "data-action", "disabled"],
          },
        });
      } else {
        footer.innerHTML = this.renderButtons();
      }
    }

    // Apply type-specific styling
    this.applyTypeStyling();
  }

  /**
   * Render form if modal type is form
   */
  renderForm() {
    if (!this.config.form) return "";

    const fields = this.config.form.fields || [];
    let formHTML = '<form class="modal-form" novalidate>';

    fields.forEach((field) => {
      formHTML += this.renderFormField(field);
    });

    formHTML += "</form>";
    return formHTML;
  }

  /**
   * Render individual form field
   */
  renderFormField(field) {
    const required = field.required ? "required" : "";
    const error = this.validationErrors[field.name];
    const value = this.formData[field.name] || field.defaultValue || "";

    let fieldHTML = `
      <div class="form-group ${error ? "has-error" : ""}">
        <label for="${field.name}" class="form-label">
          ${field.label}
          ${field.required ? '<span class="required">*</span>' : ""}
        </label>
    `;

    switch (field.type) {
      case "text":
      case "email":
      case "password":
      case "number":
      case "date":
      case "time":
        fieldHTML += `
          <input type="${field.type}" 
                 id="${field.name}" 
                 name="${field.name}"
                 class="form-control"
                 value="${value}"
                 placeholder="${field.placeholder || ""}"
                 ${required}
                 ${field.readonly ? "readonly" : ""}
                 ${field.disabled ? "disabled" : ""}
                 aria-invalid="${error ? "true" : "false"}"
                 aria-describedby="${error ? field.name + "-error" : ""}">
        `;
        break;

      case "textarea":
        fieldHTML += `
          <textarea id="${field.name}" 
                    name="${field.name}"
                    class="form-control"
                    rows="${field.rows || 3}"
                    placeholder="${field.placeholder || ""}"
                    ${required}
                    ${field.readonly ? "readonly" : ""}
                    ${field.disabled ? "disabled" : ""}
                    aria-invalid="${error ? "true" : "false"}"
                    aria-describedby="${error ? field.name + "-error" : ""}">${value}</textarea>
        `;
        break;

      case "select":
        fieldHTML += `
          <select id="${field.name}" 
                  name="${field.name}"
                  class="form-control"
                  ${required}
                  ${field.disabled ? "disabled" : ""}
                  aria-invalid="${error ? "true" : "false"}"
                  aria-describedby="${error ? field.name + "-error" : ""}">
            ${field.options
              .map(
                (opt) => `
              <option value="${opt.value}" ${value === opt.value ? "selected" : ""}>
                ${opt.label}
              </option>
            `,
              )
              .join("")}
          </select>
        `;
        break;

      case "checkbox":
        fieldHTML = `
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" 
                     id="${field.name}" 
                     name="${field.name}"
                     value="true"
                     ${value === true || value === "true" ? "checked" : ""}
                     ${field.disabled ? "disabled" : ""}>
              ${field.label}
            </label>
          </div>
        `;
        break;

      case "radio":
        fieldHTML = `
          <div class="form-group">
            <div class="radio-group" role="radiogroup" aria-labelledby="${field.name}-label">
              <span id="${field.name}-label" class="form-label">${field.label}</span>
              ${field.options
                .map(
                  (opt) => `
                <label class="radio-label">
                  <input type="radio" 
                         name="${field.name}"
                         value="${opt.value}"
                         ${value === opt.value ? "checked" : ""}
                         ${field.disabled ? "disabled" : ""}>
                  ${opt.label}
                </label>
              `,
                )
                .join("")}
            </div>
          </div>
        `;
        break;
    }

    // Add help text if provided
    if (field.helpText) {
      fieldHTML += `<small class="form-help">${field.helpText}</small>`;
    }

    // Add error message if validation failed
    if (error) {
      fieldHTML += `<span id="${field.name}-error" class="form-error" role="alert">${error}</span>`;
    }

    fieldHTML += "</div>";
    return fieldHTML;
  }

  /**
   * Render modal buttons
   */
  renderButtons() {
    const buttons = [...this.config.buttons];

    // Add default buttons based on type
    if (this.config.type === "confirm" && buttons.length === 0) {
      buttons.push(
        { text: "Cancel", action: "cancel", variant: "secondary" },
        { text: "Confirm", action: "confirm", variant: "primary" },
      );
    } else if (this.config.type === "form" && buttons.length === 0) {
      buttons.push(
        { text: "Cancel", action: "cancel", variant: "secondary" },
        { text: "Submit", action: "submit", variant: "primary" },
      );
    } else if (buttons.length === 0) {
      buttons.push({ text: "Close", action: "close", variant: "secondary" });
    }

    return buttons
      .map(
        (btn) => `
      <button class="btn btn-${btn.variant || "secondary"}" 
              data-action="${btn.action}"
              ${btn.disabled ? "disabled" : ""}>
        ${btn.text}
      </button>
    `,
      )
      .join("");
  }

  /**
   * Apply type-specific styling
   */
  applyTypeStyling() {
    const dialog = this.container.querySelector(".modal-dialog");
    if (!dialog) return;

    // Remove existing type classes
    dialog.classList.remove(
      "modal-info",
      "modal-warning",
      "modal-error",
      "modal-success",
    );

    // Add type-specific class
    if (this.config.type !== "default") {
      dialog.classList.add(`modal-${this.config.type}`);
    }
  }

  /**
   * Add tab to modal (US-087 Teams Enhancement)
   * @param {Object} tabConfig - Tab configuration
   * @param {string} tabConfig.id - Unique tab identifier
   * @param {string} tabConfig.label - Tab label text
   * @param {Function|string} tabConfig.content - Content function or HTML string
   * @param {boolean} tabConfig.active - Whether this tab should be active initially
   */
  async addTab(tabConfig) {
    if (!tabConfig || !tabConfig.id || !tabConfig.label) {
      throw new Error("[Modal] Tab configuration requires id and label");
    }

    // Enable tabs if first tab is added
    if (!this.tabsEnabled) {
      this.tabsEnabled = true;
      // Recreate structure with tabs support
      if (this.container.querySelector(".modal-wrapper")) {
        this.createModalStructure();
      }
    }

    // Store tab configuration
    this.tabs.set(tabConfig.id, {
      id: tabConfig.id,
      label: tabConfig.label,
      content: tabConfig.content,
      active: tabConfig.active || false,
    });

    // Set as active if no active tab exists or explicitly marked active
    if (!this.activeTabId || tabConfig.active) {
      this.activeTabId = tabConfig.id;
    }

    // Re-render tabs if modal is open
    if (this.isOpen) {
      this.renderTabs();
      this.renderActiveTabContent();
    }
  }

  /**
   * Remove tab from modal
   * @param {string} tabId - Tab identifier to remove
   */
  removeTab(tabId) {
    if (!this.tabs.has(tabId)) return;

    this.tabs.delete(tabId);

    // If removing active tab, switch to first available tab
    if (this.activeTabId === tabId) {
      const firstTab = this.tabs.keys().next().value;
      this.activeTabId = firstTab || null;
    }

    // Re-render if modal is open
    if (this.isOpen) {
      this.renderTabs();
      this.renderActiveTabContent();
    }
  }

  /**
   * Switch to specific tab
   * @param {string} tabId - Tab identifier to activate
   */
  switchTab(tabId) {
    if (!this.tabs.has(tabId)) {
      console.warn(`[Modal] Tab ${tabId} not found`);
      return;
    }

    this.activeTabId = tabId;

    if (this.isOpen) {
      this.renderTabs();
      this.renderActiveTabContent();
    }

    // Emit tab change event
    this.emit("tabChange", { tabId, tab: this.tabs.get(tabId) });
  }

  /**
   * Render tab navigation
   * @private
   */
  renderTabs() {
    const tabsNav = this.container.querySelector(".modal-tabs-nav");
    if (!tabsNav || this.tabs.size === 0) return;

    const tabsHTML = Array.from(this.tabs.entries())
      .map(([tabId, tab]) => {
        const isActive = tabId === this.activeTabId;
        return `
          <button class="modal-tab ${isActive ? "active" : ""}"
                  role="tab"
                  aria-selected="${isActive}"
                  aria-controls="modal-tab-content-${tabId}"
                  data-tab-id="${tabId}"
                  tabindex="${isActive ? "0" : "-1"}">
            ${tab.label}
          </button>
        `;
      })
      .join("");

    // Use SecurityUtils for safe tab rendering if available
    if (typeof window.SecurityUtils !== "undefined") {
      window.SecurityUtils.safeSetInnerHTML(tabsNav, tabsHTML, {
        allowedTags: ["button"],
        allowedAttributes: {
          button: [
            "class",
            "role",
            "aria-selected",
            "aria-controls",
            "data-tab-id",
            "tabindex",
          ],
        },
      });
    } else {
      tabsNav.innerHTML = tabsHTML;
    }

    // Setup tab click handlers
    tabsNav.querySelectorAll(".modal-tab").forEach((tabButton) => {
      this.addDOMListener(tabButton, "click", (e) => {
        const tabId = e.target.dataset.tabId;
        this.switchTab(tabId);
      });
    });
  }

  /**
   * Render active tab content
   * @private
   */
  async renderActiveTabContent() {
    const body = this.container.querySelector(".modal-body");
    if (!body || !this.activeTabId) return;

    const activeTab = this.tabs.get(this.activeTabId);
    if (!activeTab) return;

    try {
      let content = "";

      if (typeof activeTab.content === "function") {
        // Content is a function - call it to get HTML/Element
        const result = await activeTab.content();
        if (result instanceof HTMLElement) {
          // Clear body and append element
          body.innerHTML = "";
          body.appendChild(result);
          return;
        } else {
          content = result || "";
        }
      } else {
        content = activeTab.content || "";
      }

      // Use SecurityUtils for safe content rendering if available
      if (typeof window.SecurityUtils !== "undefined") {
        window.SecurityUtils.safeSetInnerHTML(body, content, {
          allowedTags: [
            "div",
            "p",
            "br",
            "strong",
            "em",
            "u",
            "span",
            "a",
            "ul",
            "ol",
            "li",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "table",
            "thead",
            "tbody",
            "tr",
            "th",
            "td",
            "button",
            "input",
            "select",
            "textarea",
            "form",
            "label",
          ],
          allowedAttributes: {
            a: ["href", "title", "target"],
            span: ["class", "id"],
            div: ["class", "id", "data-action"],
            button: ["class", "type", "data-action"],
            input: ["type", "class", "name", "value", "placeholder"],
            select: ["class", "name"],
            textarea: ["class", "name", "rows", "placeholder"],
            form: ["class"],
            label: ["for", "class"],
          },
        });
      } else {
        body.innerHTML = content;
      }
    } catch (error) {
      console.error("[Modal] Error rendering tab content:", error);
      body.innerHTML = `<div class="error">Error loading tab content</div>`;
    }
  }

  /**
   * Open modal
   */
  async open() {
    if (this.isOpen) return;

    const wrapper = this.container.querySelector(".modal-wrapper");
    if (!wrapper) return;

    // Store previous focus for restoration
    this.previousFocus = document.activeElement;

    // Show modal
    wrapper.hidden = false;
    this.isOpen = true;

    // Add body class to prevent scrolling
    document.body.classList.add("modal-open");

    // Render content
    this.render();

    // If tabs are enabled, ensure active tab content is rendered
    if (this.tabsEnabled && this.tabs.size > 0) {
      await this.renderActiveTabContent();
    }

    // Focus first focusable element
    this.focusFirstElement();

    // Trigger animation
    if (this.config.animated) {
      requestAnimationFrame(() => {
        wrapper.classList.add("modal-show");
      });
    }

    // Call open callback
    if (this.config.onOpen) {
      this.config.onOpen(this);
    }

    // Emit open event
    this.emit("open");

    // Announce to screen readers
    this.announce("Modal opened");
  }

  /**
   * Close modal
   */
  close() {
    if (!this.isOpen) return;

    const wrapper = this.container.querySelector(".modal-wrapper");
    if (!wrapper) return;

    // Trigger close animation
    if (this.config.animated) {
      wrapper.classList.remove("modal-show");
      setTimeout(() => this.doClose(wrapper), 300);
    } else {
      this.doClose(wrapper);
    }
  }

  /**
   * Actually close the modal
   */
  doClose(wrapper) {
    wrapper.hidden = true;
    this.isOpen = false;

    // Remove body class
    document.body.classList.remove("modal-open");

    // Restore focus
    if (this.previousFocus) {
      this.previousFocus.focus();
    }

    // Reset form if present
    if (this.config.form) {
      this.resetForm();
    }

    // Reset tabs state
    if (this.tabsEnabled) {
      this.activeTabId =
        this.tabs.size > 0 ? this.tabs.keys().next().value : null;
    }

    // Call close callback
    if (this.config.onClose) {
      this.config.onClose(this);
    }

    // Emit close event
    this.emit("close");

    // Announce to screen readers
    this.announce("Modal closed");
  }

  /**
   * Setup keyboard trap for accessibility
   */
  setupKeyboardTrap() {
    this.addDOMListener(this.container, "keydown", (e) => {
      if (!this.isOpen) return;

      // Handle escape key
      if (e.key === "Escape" && this.config.closeOnEscape) {
        this.close();
        return;
      }

      // Handle tab navigation
      if (e.key === "Tab") {
        this.handleTabKey(e);
      }
    });
  }

  /**
   * Handle tab key for focus trap
   */
  handleTabKey(e) {
    const focusableElements = this.getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }

  /**
   * Get all focusable elements in modal
   */
  getFocusableElements() {
    const selector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const elements = this.container.querySelectorAll(selector);
    return Array.from(elements).filter(
      (el) => !el.disabled && el.offsetParent !== null,
    );
  }

  /**
   * Focus first focusable element
   */
  focusFirstElement() {
    const focusableElements = this.getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }

  /**
   * Setup DOM event listeners
   */
  setupDOMListeners() {
    // Close button
    const closeBtn = this.container.querySelector(".modal-close");
    if (closeBtn) {
      this.addDOMListener(closeBtn, "click", () => this.close());
    }

    // Overlay click
    const overlay = this.container.querySelector(".modal-overlay");
    if (overlay && this.config.closeOnOverlay) {
      this.addDOMListener(overlay, "click", () => this.close());
    }

    // Button actions
    const buttons = this.container.querySelectorAll(".modal-footer button");
    buttons.forEach((btn) => {
      this.addDOMListener(btn, "click", (e) => {
        const action = e.target.dataset.action;
        this.handleButtonAction(action);
      });
    });

    // Form events
    if (this.config.form) {
      this.setupFormListeners();
    }
  }

  /**
   * Handle button action
   */
  handleButtonAction(action) {
    switch (action) {
      case "close":
      case "cancel":
        this.close();
        break;

      case "confirm":
        this.emit("confirm");
        this.close();
        break;

      case "submit":
        this.submitForm();
        break;

      default:
        // Custom action
        this.emit("action", { action });
    }
  }

  /**
   * Initialize form
   */
  initializeForm() {
    if (!this.config.form) return;

    // Initialize form data with default values
    this.config.form.fields.forEach((field) => {
      if (field.defaultValue !== undefined) {
        this.formData[field.name] = field.defaultValue;
      }
    });
  }

  /**
   * Setup form event listeners
   */
  setupFormListeners() {
    const form = this.container.querySelector(".modal-form");
    if (!form) return;

    // Input change events
    form.addEventListener("input", (e) => {
      const field = e.target;
      if (field.name) {
        this.updateFormData(field.name, field.value);
        this.clearFieldError(field.name);
      }
    });

    // Form submission
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.submitForm();
    });
  }

  /**
   * Update form data
   */
  updateFormData(name, value) {
    this.formData[name] = value;
    this.emit("formChange", { name, value, formData: this.formData });
  }

  /**
   * Clear field error
   */
  clearFieldError(name) {
    delete this.validationErrors[name];
    const field = this.container.querySelector(`[name="${name}"]`);
    const group = field?.closest(".form-group");
    if (group) {
      group.classList.remove("has-error");
      const error = group.querySelector(".form-error");
      if (error) {
        error.remove();
      }
    }
  }

  /**
   * Submit form
   */
  submitForm() {
    if (!this.config.form) return;

    // Validate form
    if (!this.validateForm()) {
      this.render(); // Re-render to show errors
      return;
    }

    // Call submit callback
    if (this.config.onSubmit) {
      const result = this.config.onSubmit(this.formData, this);

      // Handle promise result
      if (result && typeof result.then === "function") {
        this.setLoading(true);
        result
          .then(() => {
            this.setLoading(false);
            this.close();
          })
          .catch((error) => {
            this.setLoading(false);
            this.showError(error.message || "An error occurred");
          });
      } else if (result !== false) {
        this.close();
      }
    } else {
      // Emit submit event
      this.emit("submit", { formData: this.formData });
      this.close();
    }
  }

  /**
   * Validate form
   */
  validateForm() {
    this.validationErrors = {};
    let isValid = true;

    this.config.form.fields.forEach((field) => {
      const value = this.formData[field.name];

      // Required validation
      if (field.required && !value) {
        this.validationErrors[field.name] = `${field.label} is required`;
        isValid = false;
      }

      // Email validation
      if (field.type === "email" && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          this.validationErrors[field.name] =
            "Please enter a valid email address";
          isValid = false;
        }
      }

      // Custom validation
      if (field.validate && value) {
        const error = field.validate(value, this.formData);
        if (error) {
          this.validationErrors[field.name] = error;
          isValid = false;
        }
      }
    });

    // Global form validation
    if (this.config.validation.validate) {
      const error = this.config.validation.validate(this.formData);
      if (error) {
        this.showError(error);
        isValid = false;
      }
    }

    return isValid;
  }

  /**
   * Reset form
   */
  resetForm() {
    this.formData = {};
    this.validationErrors = {};

    // Reset to default values
    if (this.config.form) {
      this.config.form.fields.forEach((field) => {
        if (field.defaultValue !== undefined) {
          this.formData[field.name] = field.defaultValue;
        }
      });
    }
  }

  /**
   * Set loading state
   */
  setLoading(loading) {
    const footer = this.container.querySelector(".modal-footer");
    if (footer) {
      const buttons = footer.querySelectorAll("button");
      buttons.forEach((btn) => {
        btn.disabled = loading;
      });

      if (loading) {
        footer.classList.add("loading");
      } else {
        footer.classList.remove("loading");
      }
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    const body = this.container.querySelector(".modal-body");
    if (body) {
      const existingError = body.querySelector(".modal-error-message");
      if (existingError) {
        existingError.remove();
      }

      const errorDiv = document.createElement("div");
      errorDiv.className = "modal-error-message";
      errorDiv.setAttribute("role", "alert");
      errorDiv.textContent = message;
      body.insertBefore(errorDiv, body.firstChild);
    }
  }

  /**
   * Update modal configuration
   */
  updateConfig(config) {
    this.config = { ...this.config, ...config };
    if (this.isOpen) {
      this.render();
    }
  }

  /**
   * Set modal title
   */
  setTitle(title) {
    this.config.title = title;
    if (this.isOpen) {
      const titleElement = this.container.querySelector(".modal-title");
      if (titleElement) {
        titleElement.textContent = title;
      }
    }
  }

  /**
   * Set modal content
   */
  setContent(content) {
    this.config.content = content;
    if (this.isOpen && !this.config.form) {
      const body = this.container.querySelector(".modal-body");
      if (body) {
        // Use SecurityUtils for safe content setting if available
        if (typeof window.SecurityUtils !== "undefined") {
          window.SecurityUtils.safeSetInnerHTML(body, content, {
            allowedTags: [
              "p",
              "br",
              "strong",
              "em",
              "u",
              "span",
              "div",
              "a",
              "ul",
              "ol",
              "li",
              "h1",
              "h2",
              "h3",
              "h4",
              "h5",
              "h6",
              "table",
              "thead",
              "tbody",
              "tr",
              "th",
              "td",
              "img",
            ],
            allowedAttributes: {
              a: ["href", "title", "target"],
              span: ["class"],
              div: ["class"],
              img: ["src", "alt", "title", "width", "height"],
            },
          });
        } else {
          // Fallback: Clear and set text content safely
          while (body.firstChild) {
            body.removeChild(body.firstChild);
          }
          // If content is plain text, set it safely
          if (!content.includes("<")) {
            body.textContent = content;
          } else {
            // For HTML content, create a temporary container
            const temp = document.createElement("div");
            temp.innerHTML = content; // Parse HTML
            // Move sanitized nodes
            while (temp.firstChild) {
              body.appendChild(temp.firstChild);
            }
          }
        }
      }
    }
  }

  /**
   * Check if modal is open
   */
  isModalOpen() {
    return this.isOpen;
  }

  /**
   * Clean up on destroy
   */
  onDestroy() {
    if (this.isOpen) {
      this.close();
    }

    // Clear tabs state
    this.tabs.clear();
    this.activeTabId = null;
    this.tabsEnabled = false;
  }
}

// Export for use
if (typeof module !== "undefined" && module.exports) {
  module.exports = ModalComponent;
}

if (typeof window !== "undefined") {
  window.ModalComponent = ModalComponent;
}
