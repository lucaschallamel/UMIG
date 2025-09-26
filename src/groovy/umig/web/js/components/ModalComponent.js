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

    // Modal mode for readonly field evaluation ('create' or 'edit')
    this.mode = config.mode || "create";

    // Tab functionality state (US-087 extension)
    this.tabs = new Map();
    this.activeTabId = null;
    this.tabsEnabled = config.enableTabs || false;
  }

  /**
   * Initialize modal component
   */
  onInitialize() {
    // Create unique global close function for inline onclick (ADR-061 fix)
    this.globalCloseFunction = `umigCloseModal_${this.containerId.replace(/[^a-zA-Z0-9]/g, "_")}`;
    window[this.globalCloseFunction] = () => this.close();

    // Create modal structure if not exists
    if (!this.container.querySelector(".umig-modal-wrapper")) {
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
   * Create modal HTML structure with UMIG namespace (ADR-064)
   * Uses umig- prefix for all classes to avoid Confluence conflicts
   */
  createModalStructure() {
    const modalHTML = `
      <div class="umig-modal-backdrop"
           data-close-on-overlay="${this.config.closeOnOverlay}"
           style="
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        background-color: rgba(0, 0, 0, 0.6) !important;
        z-index: 999998 !important;
        display: none;
      "></div>
      <div class="umig-modal-wrapper ${this.config.animated ? "umig-modal-animated" : ""}"
           role="dialog"
           aria-modal="true"
           aria-labelledby="umig-modal-title-${this.containerId}"
           aria-describedby="umig-modal-content-${this.containerId}"
           style="
             position: fixed !important;
             top: 0 !important;
             left: 0 !important;
             right: 0 !important;
             bottom: 0 !important;
             z-index: 999999 !important;
             align-items: center !important;
             justify-content: center !important;
             visibility: hidden;
           ">
        <div class="umig-modal-container umig-modal-${this.config.size} ${this.config.centered ? "umig-modal-centered" : ""}"
             style="
               position: relative !important;
               background: white !important;
               border-radius: 8px !important;
               box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3) !important;
               max-width: 800px !important;
               width: 90% !important;
               max-height: 80vh !important;
               overflow: hidden !important;
               pointer-events: auto !important;
               margin: 20px !important;
             ">
          <div class="umig-modal-dialog" style="display: flex; flex-direction: column; height: 100%;">
            <div class="umig-modal-header umig-modal-type-${this.config.type}"
                 style="
                   display: flex !important;
                   justify-content: space-between !important;
                   align-items: center !important;
                   padding: 20px !important;
                   border-bottom: 1px solid #e1e4e8 !important;
                   background: #f6f8fa !important;
                   flex-shrink: 0;
                 ">
              <h2 id="umig-modal-title-${this.containerId}" class="umig-modal-title"
                  style="
                    margin: 0 !important;
                    font-size: 18px !important;
                    font-weight: 600 !important;
                    color: #24292e !important;
                  "></h2>
              ${
                this.config.closeable
                  ? `
                <button class="umig-modal-close" aria-label="Close modal"
                        data-action="close"
                        style="
                          background: none !important;
                          border: none !important;
                          font-size: 28px !important;
                          cursor: pointer !important;
                          color: #586069 !important;
                          padding: 0 !important;
                          width: 30px !important;
                          height: 30px !important;
                          line-height: 1 !important;
                        ">
                  <span aria-hidden="true">&times;</span>
                </button>
              `
                  : ""
              }
            </div>
            ${this.tabsEnabled ? '<div class="umig-modal-tabs-nav" role="tablist"></div>' : ""}
            <div id="umig-modal-content-${this.containerId}" class="umig-modal-body"
                 style="
                   padding: 20px !important;
                   flex: 1;
                   overflow-y: auto !important;
                 ">
              <!-- Content will be injected here -->
            </div>
            <div class="umig-modal-footer"
                 style="
                   display: flex !important;
                   justify-content: flex-end !important;
                   gap: 10px !important;
                   padding: 15px 20px !important;
                   border-top: 1px solid #e1e4e8 !important;
                   background: #f6f8fa !important;
                   flex-shrink: 0;
                 ">
              <!-- Buttons will be injected here -->
            </div>
          </div>
        </div>
      </div>
    `;

    // MANDATORY SecurityUtils - no unsafe fallback allowed
    if (
      typeof window.SecurityUtils === "undefined" ||
      !window.SecurityUtils.safeSetInnerHTML
    ) {
      console.error(
        "[ModalComponent] SecurityUtils required but not available",
      );
      this.container.textContent =
        "[Security Error: Cannot render modal without XSS protection]";
      return;
    }

    // Use SecurityUtils for safe HTML insertion
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
          "data-close-on-overlay",
        ],
        button: ["class", "aria-label", "data-action"],
        span: ["aria-hidden"],
        h2: ["id", "class"],
      },
    });

    // ADDITIONAL DOM COMPATIBILITY CHECK: Extra protection layer for modal elements
    // Even though SecurityUtils now handles this, we add defensive programming
    // to ensure modal-specific elements are always batch.js compatible
    const modalWrapper = this.container.querySelector(".umig-modal-wrapper");
    if (
      modalWrapper &&
      !modalWrapper.getElementsByClassName &&
      modalWrapper.nodeType === Node.ELEMENT_NODE
    ) {
      modalWrapper.getElementsByClassName = function (className) {
        return this.querySelectorAll("." + className);
      };
    }
  }

  /**
   * Override render to prevent container clearing
   * CRITICAL: Modal must NOT clear container as it would destroy the modal structure
   */
  render() {
    // Do NOT call parent render which would clear the container
    // Instead, directly call onRender
    this.onRender();
  }

  /**
   * Render modal content
   */
  onRender() {
    if (!this.isOpen) return;

    const wrapper = this.container.querySelector(".umig-modal-wrapper");
    const title = this.container.querySelector(".umig-modal-title");
    const body = this.container.querySelector(".umig-modal-body");
    const footer = this.container.querySelector(".umig-modal-footer");

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
      console.log("[DEBUG] ModalComponent.onRender: About to render content");
      console.log(
        "[DEBUG] ModalComponent.onRender: config.form:",
        this.config.form,
      );
      console.log(
        "[DEBUG] ModalComponent.onRender: config.content length:",
        this.config.content?.length,
      );
      console.log(
        "[DEBUG] ModalComponent.onRender: config.type:",
        this.config.type,
      );

      if (this.config.form) {
        console.log("[DEBUG] ModalComponent.onRender: Rendering FORM content");
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
              "a",
              "em",
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
              div: [
                "class",
                "role",
                "id",
                "data-field-name",
                "data-field-value",
                "data-field-required",
              ],
              span: ["id", "class", "role"],
              a: ["href", "title", "target", "aria-label", "class"],
              em: ["style"],
            },
          });
        } else {
          // SECURITY FIX: Replace innerHTML with SecurityUtils.safeSetInnerHTML
          if (
            typeof window.SecurityUtils !== "undefined" &&
            window.SecurityUtils.safeSetInnerHTML
          ) {
            window.SecurityUtils.safeSetInnerHTML(body, this.renderForm(), {
              allowedTags: [
                "div",
                "label",
                "input",
                "select",
                "option",
                "textarea",
                "span",
                "p",
                "br",
                "button",
              ],
              allowedAttributes: {
                div: ["class", "style", "id"],
                label: ["class", "for"],
                input: [
                  "type",
                  "name",
                  "value",
                  "placeholder",
                  "required",
                  "disabled",
                  "class",
                  "id",
                  "checked",
                ],
                select: ["name", "class", "id", "required", "disabled"],
                option: ["value", "selected"],
                textarea: [
                  "name",
                  "placeholder",
                  "rows",
                  "cols",
                  "class",
                  "id",
                  "disabled",
                ],
                span: ["class", "style"],
                button: ["type", "class", "data-action"],
              },
            });
          } else {
            console.error(
              "[ModalComponent] SecurityUtils not available for form rendering",
            );
            body.textContent =
              "[Security Error: Cannot render form without XSS protection]";
          }
        }
      } else {
        console.log(
          "[DEBUG] ModalComponent.onRender: Rendering CONTENT (not form)",
        );
        console.log(
          "[DEBUG] ModalComponent.onRender: Content to render:",
          this.config.content?.substring(0, 200) + "...",
        );
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
              "hr",
              "label",
            ],
            allowedAttributes: {
              a: ["href", "title", "target"],
              span: ["class", "style", "title"], // ✅ FIXED: Allow style for color swatches and title for icons
              div: ["class", "style"], // ✅ FIXED: Allow style for layout and formatting
              hr: ["style"], // Allow styling for separators
              label: ["class"], // Allow label styling
            },
          });
        } else {
          // SECURITY FIX: Replace innerHTML with SecurityUtils.safeSetInnerHTML
          if (
            typeof window.SecurityUtils !== "undefined" &&
            window.SecurityUtils.safeSetInnerHTML
          ) {
            window.SecurityUtils.safeSetInnerHTML(body, this.config.content, {
              allowedTags: [
                "div",
                "p",
                "span",
                "br",
                "h1",
                "h2",
                "h3",
                "h4",
                "h5",
                "h6",
                "ul",
                "ol",
                "li",
                "strong",
                "em",
                "a",
                "img",
              ],
              allowedAttributes: {
                div: ["class", "style"],
                span: ["class", "style", "title"],
                a: ["href", "target", "rel"],
                img: ["src", "alt", "class", "style"],
                h1: ["class"],
                h2: ["class"],
                h3: ["class"],
                h4: ["class"],
                h5: ["class"],
                h6: ["class"],
                ul: ["class"],
                ol: ["class"],
                li: ["class"],
                strong: ["class"],
                em: ["class"],
              },
            });
          } else {
            console.error(
              "[ModalComponent] SecurityUtils not available for content rendering",
            );
            body.textContent = this.config.content; // Use safe textContent instead
          }
        }
        console.log(
          "[DEBUG] ModalComponent.onRender: Content rendered successfully",
        );
      }
    } else {
      console.log("[DEBUG] ModalComponent.onRender: No body element found!");
    }

    // Render buttons
    if (footer) {
      // Use SecurityUtils for button rendering if available
      if (typeof window.SecurityUtils !== "undefined") {
        window.SecurityUtils.safeSetInnerHTML(footer, this.renderButtons(), {
          allowedTags: ["button"],
          allowedAttributes: {
            button: ["class", "data-action", "disabled", "onclick"], // ✅ CRITICAL FIX: Allow onclick for close functionality
          },
        });
      } else {
        // SECURITY FIX: Replace innerHTML with SecurityUtils.safeSetInnerHTML
        if (
          typeof window.SecurityUtils !== "undefined" &&
          window.SecurityUtils.safeSetInnerHTML
        ) {
          window.SecurityUtils.safeSetInnerHTML(footer, this.renderButtons(), {
            allowedTags: ["button"],
            allowedAttributes: {
              button: ["class", "data-action", "disabled", "type"],
            },
          });
        } else {
          console.error(
            "[ModalComponent] SecurityUtils not available for button rendering",
          );
          footer.textContent =
            "[Security Error: Cannot render buttons without XSS protection]";
        }
      }
    }

    // Apply type-specific styling
    this.applyTypeStyling();

    // Initialize color picker components after rendering
    this.initializeColorPickers();
  }

  /**
   * Render form if modal type is form
   */
  renderForm() {
    if (!this.config.form) return "";

    const fields = this.config.form.fields || [];
    let formHTML = '<form class="umig-modal-form" novalidate>';

    fields.forEach((field) => {
      formHTML += this.renderFormField(field);
    });

    formHTML += "</form>";
    return formHTML;
  }

  /**
   * Evaluate if a field should be readonly based on configuration and current mode
   * @param {Object} field - Field configuration
   * @returns {boolean} True if field should be readonly
   * @private
   */
  _evaluateReadonly(field) {
    if (field.readonly === undefined || field.readonly === null) {
      return false; // Default to editable
    }

    if (typeof field.readonly === "boolean") {
      return field.readonly; // Static boolean value
    }

    if (typeof field.readonly === "function") {
      try {
        // Dynamic evaluation based on mode and current form data
        return field.readonly(this.mode, this.formData);
      } catch (error) {
        console.warn(
          "[ModalComponent] Error evaluating readonly function for field",
          field.name,
          error,
        );
        return false; // Default to editable on error
      }
    }

    console.warn(
      "[ModalComponent] Invalid readonly configuration for field",
      field.name,
      "Expected boolean or function, got:",
      typeof field.readonly,
    );
    return false; // Default to editable for invalid configuration
  }

  /**
   * Render individual form field
   */
  renderFormField(field) {
    const required = field.required ? "required" : "";
    const error = this.validationErrors[field.name];
    const value =
      this.formData[field.name] || field.value || field.defaultValue || "";
    const isViewMode = this.viewMode || false;
    const isReadonly = this._evaluateReadonly(field);

    let fieldHTML = `
      <div class="umig-form-group ${error ? "has-error" : ""} ${isViewMode ? "view-mode" : ""} ${isReadonly && !isViewMode ? "umig-readonly" : ""}">
        <label for="${field.name}" class="umig-form-label">
          ${field.label}
          ${field.required && !isViewMode && !isReadonly ? '<span class="required">*</span>' : ""}
        </label>
    `;

    switch (field.type) {
      case "text":
      case "email":
      case "password":
      case "number":
      case "date":
      case "time":
        if (isViewMode) {
          // In view mode, show as styled text instead of input
          // Special handling for email fields - create mailto: links
          let displayValue = value;
          if (field.type === "email" && value && window.EmailUtils) {
            displayValue = window.EmailUtils.formatSingleEmail(value, {
              linkClass: "umig-modal-email-link",
              addTitle: true,
            });
          }

          fieldHTML += `
            <div class="form-control-static view-field-value"
                 style="
                   padding: 8px 12px !important;
                   background-color: #f8f9fa !important;
                   border: 1px solid #e9ecef !important;
                   border-radius: 4px !important;
                   min-height: 34px !important;
                   color: #495057 !important;
                   font-family: inherit !important;
                   line-height: 1.5 !important;
                 ">
              ${displayValue || '<em style="color: #6c757d;">No value</em>'}
            </div>
          `;
        } else {
          fieldHTML += `
            <input type="${field.type}"
                   id="${field.name}"
                   name="${field.name}"
                   class="umig-form-fieldinput ${isReadonly ? "umig-readonly-field" : ""}"
                   value="${value}"
                   placeholder="${field.placeholder || ""}"
                   ${required}
                   ${isReadonly ? "readonly" : ""}
                   ${field.disabled ? "disabled" : ""}
                   aria-invalid="${error ? "true" : "false"}"
                   aria-describedby="${error ? field.name + "-error" : ""}">
          `;
        }
        break;

      case "textarea":
        if (isViewMode) {
          fieldHTML += `
            <div class="form-control-static view-field-value"
                 style="
                   padding: 8px 12px !important;
                   background-color: #f8f9fa !important;
                   border: 1px solid #e9ecef !important;
                   border-radius: 4px !important;
                   min-height: 80px !important;
                   color: #495057 !important;
                   font-family: inherit !important;
                   line-height: 1.5 !important;
                   white-space: pre-wrap !important;
                 ">
              ${value || '<em style="color: #6c757d;">No value</em>'}
            </div>
          `;
        } else {
          fieldHTML += `
            <textarea id="${field.name}"
                      name="${field.name}"
                      class="umig-form-fieldtextarea ${isReadonly ? "umig-readonly-field" : ""}"
                      rows="${field.rows || 3}"
                      placeholder="${field.placeholder || ""}"
                      ${required}
                      ${isReadonly ? "readonly" : ""}
                      ${field.disabled ? "disabled" : ""}
                      aria-invalid="${error ? "true" : "false"}"
                      aria-describedby="${error ? field.name + "-error" : ""}">${value}</textarea>
          `;
        }
        break;

      case "select":
        if (isViewMode) {
          // Find the selected option label
          const selectedOption = field.options?.find(
            (opt) => opt.value === value,
          );
          const displayValue = selectedOption ? selectedOption.label : value;
          fieldHTML += `
            <div class="form-control-static view-field-value"
                 style="
                   padding: 8px 12px !important;
                   background-color: #f8f9fa !important;
                   border: 1px solid #e9ecef !important;
                   border-radius: 4px !important;
                   min-height: 34px !important;
                   color: #495057 !important;
                   font-family: inherit !important;
                   line-height: 1.5 !important;
                 ">
              ${displayValue || '<em style="color: #6c757d;">No value</em>'}
            </div>
          `;
        } else {
          fieldHTML += `
            <select id="${field.name}"
                    name="${field.name}"
                    class="umig-form-fieldselect"
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
        }
        break;

      case "checkbox":
        if (isViewMode) {
          const displayValue =
            value === true || value === "true" ? "Yes" : "No";
          const iconClass = value === true || value === "true" ? "✓" : "✗";
          const iconColor =
            value === true || value === "true" ? "#28a745" : "#dc3545";
          fieldHTML = `
            <div class="umig-form-group view-mode">
              <label class="umig-form-label">${field.label}</label>
              <div class="form-control-static view-field-value"
                   style="
                     padding: 8px 12px !important;
                     background-color: #f8f9fa !important;
                     border: 1px solid #e9ecef !important;
                     border-radius: 4px !important;
                     min-height: 34px !important;
                     color: #495057 !important;
                     font-family: inherit !important;
                     line-height: 1.5 !important;
                   ">
                <span style="color: ${iconColor}; font-weight: bold; margin-right: 8px;">${iconClass}</span>
                ${displayValue}
              </div>
            </div>
          `;
        } else {
          fieldHTML = `
            <div class="umig-form-group">
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
        }
        break;

      case "radio":
        if (isViewMode) {
          // Find the selected option label
          const selectedOption = field.options?.find(
            (opt) => opt.value === value,
          );
          const displayValue = selectedOption ? selectedOption.label : value;
          fieldHTML = `
            <div class="umig-form-group view-mode">
              <label class="umig-form-label">${field.label}</label>
              <div class="form-control-static view-field-value"
                   style="
                     padding: 8px 12px !important;
                     background-color: #f8f9fa !important;
                     border: 1px solid #e9ecef !important;
                     border-radius: 4px !important;
                     min-height: 34px !important;
                     color: #495057 !important;
                     font-family: inherit !important;
                     line-height: 1.5 !important;
                   ">
                ${displayValue || '<em style="color: #6c757d;">No value</em>'}
              </div>
            </div>
          `;
        } else {
          fieldHTML = `
            <div class="umig-form-group">
              <div class="radio-group" role="radiogroup" aria-labelledby="${field.name}-label">
                <span id="${field.name}-label" class="umig-form-label">${field.label}</span>
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
        }
        break;

      case "color":
        if (isViewMode) {
          // In view mode, show color swatch with hex value
          const colorValue = value || "#6B73FF";
          fieldHTML += `
            <div class="form-control-static view-field-value"
                 style="
                   padding: 8px 12px !important;
                   background-color: #f8f9fa !important;
                   border: 1px solid #e9ecef !important;
                   border-radius: 4px !important;
                   min-height: 34px !important;
                   color: #495057 !important;
                   font-family: inherit !important;
                   line-height: 1.5 !important;
                   display: flex !important;
                   align-items: center !important;
                   gap: 8px !important;
                 ">
              <div class="umig-color-swatch-view"
                   style="
                     width: 24px;
                     height: 24px;
                     border-radius: 4px;
                     border: 1px solid #c1c7d0;
                     background-color: ${colorValue};
                     flex-shrink: 0;
                   "
                   title="${colorValue}">
              </div>
              <span style="font-family: monospace; font-size: 13px;">${colorValue}</span>
            </div>
          `;
        } else {
          // In edit mode, create container for ColorPickerComponent
          const containerId = `umig-color-picker-${field.name}`;
          fieldHTML += `
            <div id="${containerId}"
                 class="umig-color-picker-container-field"
                 data-field-name="${field.name}"
                 data-field-value="${value || field.defaultValue || "#6B73FF"}"
                 data-field-required="${field.required || false}">
              <!-- ColorPickerComponent will be mounted here -->
            </div>
          `;
        }
        break;

      case "separator":
        // Special case for audit section separator
        if (isViewMode && field.isAuditField) {
          fieldHTML = `
            <div class="audit-section-separator" style="margin: 25px 0 15px 0;">
              <hr style="
                border: none !important;
                border-top: 2px solid #e9ecef !important;
                margin: 15px 0 !important;
              ">
              <h4 style="
                margin: 0 0 15px 0 !important;
                font-size: 16px !important;
                font-weight: 600 !important;
                color: #495057 !important;
                border-bottom: 1px solid #dee2e6 !important;
                padding-bottom: 8px !important;
              ">${field.label}</h4>
            </div>
          `;
        } else {
          // Regular separator for edit mode (minimal)
          fieldHTML = `
            <div class="form-separator" style="margin: 20px 0;">
              <hr style="border: none; border-top: 1px solid #e9ecef;">
            </div>
          `;
        }
        break;
    }

    // Add help text if provided
    if (field.helpText && !field.isAuditField) {
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
      .map((btn) => {
        // SECURITY FIX: Remove inline onclick handlers, use event delegation instead
        return `
      <button class="umig-modal-btn umig-modal-btn-${btn.variant || "secondary"}"
              data-action="${btn.action}"
              ${btn.disabled ? "disabled" : ""}>
        ${btn.text}
      </button>
    `;
      })
      .join("");
  }

  /**
   * Apply type-specific styling
   */
  applyTypeStyling() {
    const dialog = this.container.querySelector(".umig-modal-dialog");
    if (!dialog) return;

    // Remove existing type classes
    dialog.classList.remove(
      "umig-modal-info",
      "umig-modal-warning",
      "umig-modal-error",
      "umig-modal-success",
    );

    // Add type-specific class
    if (this.config.type !== "default") {
      dialog.classList.add(`umig-modal-${this.config.type}`);
    }
  }

  /**
   * Initialize color picker components after modal rendering
   * This method finds all color picker containers and mounts ColorPickerComponent instances
   */
  initializeColorPickers() {
    const colorPickerContainers = this.container.querySelectorAll(
      ".umig-color-picker-container-field",
    );

    if (colorPickerContainers.length === 0) {
      return; // No color pickers to initialize
    }

    console.log(
      `[ModalComponent] Initializing ${colorPickerContainers.length} color picker(s)`,
    );

    // Clear any existing color picker instances to prevent memory leaks
    if (this.colorPickerInstances) {
      this.colorPickerInstances.forEach((instance) => {
        if (instance && typeof instance.destroy === "function") {
          instance.destroy();
        }
      });
    }
    this.colorPickerInstances = [];

    colorPickerContainers.forEach((container, index) => {
      try {
        const fieldName = container.dataset.fieldName;
        const fieldValue = container.dataset.fieldValue;
        const fieldRequired = container.dataset.fieldRequired === "true";

        if (!window.ColorPickerComponent) {
          console.error(
            "[ModalComponent] ColorPickerComponent not available globally",
          );
          return;
        }

        console.log(
          `[ModalComponent] Creating color picker for field: ${fieldName}, value: ${fieldValue}`,
        );

        // Create ColorPickerComponent instance
        const colorPicker = new ColorPickerComponent({
          container: container,
          defaultColor: fieldValue || "#6B73FF",
          onChange: (color) => {
            console.log(
              `[ModalComponent] Color changed for ${fieldName}: ${color}`,
            );
            // Update form data
            if (this.formData) {
              this.formData[fieldName] = color;
            }
            // Create or update hidden input for form submission
            this.updateColorFieldInput(fieldName, color);
          },
          onValidationChange: (isValid) => {
            console.log(
              `[ModalComponent] Color validation changed for ${fieldName}: ${isValid}`,
            );
            // You could add visual feedback here if needed
          },
          allowCustomColors: true,
          showHexInput: true,
          required: fieldRequired,
        });

        // Initialize and mount the color picker
        colorPicker
          .initialize()
          .then(() => {
            return colorPicker.mount();
          })
          .then(() => {
            console.log(
              `[ModalComponent] Color picker mounted successfully for field: ${fieldName}`,
            );
            this.colorPickerInstances.push(colorPicker);
          })
          .catch((error) => {
            console.error(
              `[ModalComponent] Failed to initialize color picker for field ${fieldName}:`,
              error,
            );
          });
      } catch (error) {
        console.error(
          `[ModalComponent] Error creating color picker ${index}:`,
          error,
        );
      }
    });
  }

  /**
   * Update or create hidden input for color field form submission
   * @param {string} fieldName - Name of the color field
   * @param {string} color - Selected color value
   */
  updateColorFieldInput(fieldName, color) {
    // Find or create hidden input for form submission
    let hiddenInput = this.container.querySelector(
      `input[name="${fieldName}"]`,
    );

    if (!hiddenInput) {
      // Create hidden input if it doesn't exist
      hiddenInput = document.createElement("input");
      hiddenInput.type = "hidden";
      hiddenInput.name = fieldName;

      // Add to the form
      const form = this.container.querySelector(".umig-modal-form");
      if (form) {
        form.appendChild(hiddenInput);
      }
    }

    hiddenInput.value = color;
    console.log(
      `[ModalComponent] Updated hidden input for ${fieldName}: ${color}`,
    );
  }

  /**
   * Cleanup color picker instances
   * This method should be called when the modal is closed to prevent memory leaks
   */
  cleanupColorPickers() {
    if (this.colorPickerInstances && this.colorPickerInstances.length > 0) {
      console.log(
        `[ModalComponent] Cleaning up ${this.colorPickerInstances.length} color picker instance(s)`,
      );

      this.colorPickerInstances.forEach((instance, index) => {
        try {
          if (instance && typeof instance.destroy === "function") {
            instance.destroy();
            console.log(
              `[ModalComponent] Color picker instance ${index} destroyed successfully`,
            );
          }
        } catch (error) {
          console.error(
            `[ModalComponent] Error destroying color picker instance ${index}:`,
            error,
          );
        }
      });

      this.colorPickerInstances = [];
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
   * Clear all tabs and disable tab mode
   * This method forces the modal to show form content instead of tabs
   */
  clearTabs() {
    console.log("[Modal] Clearing all tabs and disabling tab mode");

    // Clear all tabs
    this.tabs.clear();
    this.activeTabId = null;

    // Keep tabsEnabled as configured, but ensure tabs are empty
    // This allows form mode when no tabs are present

    // Re-render if modal is open to show form content
    if (this.isOpen) {
      this.render();
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
    const tabsNav = this.container.querySelector(".umig-modal-tabs-nav");
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
      console.error(
        "[ModalComponent] SecurityUtils not available for tabs rendering",
      );
      tabsNav.textContent =
        "[Security Error: Cannot render tabs without XSS protection]";
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
    const body = this.container.querySelector(".umig-modal-body");
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
          body.textContent = ""; // Use safe textContent to clear
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
        // Use SecurityUtils for tab content
        if (window.SecurityUtils && window.SecurityUtils.safeSetInnerHTML) {
          window.SecurityUtils.safeSetInnerHTML(body, content, {
            allowedTags: [
              "div",
              "p",
              "span",
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
              "*": ["class", "id", "data-*"],
            },
          });
        } else {
          body.textContent = content; // Safe fallback to text
        }
      }
    } catch (error) {
      console.error("[Modal] Error rendering tab content:", error);
      // Safe error message display
      const errorDiv = document.createElement("div");
      errorDiv.className = "error";
      errorDiv.textContent = "Error loading tab content";
      body.textContent = "";
      body.appendChild(errorDiv);
    }
  }

  /**
   * Open modal
   */
  async open() {
    if (this.isOpen) return;

    console.log(
      "[ModalComponent] Opening modal for container:",
      this.containerId,
    );

    // CRITICAL: Ensure the container itself is visible (ADR-061 fix)
    this.container.style.display = "block";
    this.container.style.visibility = "visible";

    const wrapper = this.container.querySelector(".umig-modal-wrapper");
    const backdrop = this.container.querySelector(".umig-modal-backdrop");
    const modalContainer = this.container.querySelector(
      ".umig-modal-container",
    );

    console.log("[ModalComponent] Modal elements found:", {
      wrapper: !!wrapper,
      backdrop: !!backdrop,
      modalContainer: !!modalContainer,
      containerId: this.containerId,
    });

    if (!wrapper || !backdrop) {
      console.error("[ModalComponent] Critical modal elements missing");
      return;
    }

    // Store previous focus for restoration
    this.previousFocus = document.activeElement;

    // Show modal with UMIG namespace and FORCE visibility
    backdrop.style.display = "block";
    backdrop.style.visibility = "visible";

    // Force wrapper to be visible and properly positioned
    wrapper.style.display = "flex";
    wrapper.style.visibility = "visible";
    wrapper.style.opacity = "1";
    wrapper.style.pointerEvents = "auto";

    // Force modal container to be visible
    if (modalContainer) {
      modalContainer.style.display = "block";
      modalContainer.style.visibility = "visible";
      modalContainer.style.opacity = "1";
      modalContainer.style.transform = "none";
    }

    this.isOpen = true;

    // Log computed styles for debugging
    console.log("[ModalComponent] Wrapper computed style:", {
      display: window.getComputedStyle(wrapper).display,
      visibility: window.getComputedStyle(wrapper).visibility,
      zIndex: window.getComputedStyle(wrapper).zIndex,
      position: window.getComputedStyle(wrapper).position,
      width: window.getComputedStyle(wrapper).width,
      height: window.getComputedStyle(wrapper).height,
    });

    if (modalContainer) {
      console.log("[ModalComponent] Modal container computed style:", {
        display: window.getComputedStyle(modalContainer).display,
        visibility: window.getComputedStyle(modalContainer).visibility,
        width: window.getComputedStyle(modalContainer).width,
        height: window.getComputedStyle(modalContainer).height,
        transform: window.getComputedStyle(modalContainer).transform,
      });
    }

    // Add body class to prevent scrolling
    document.body.classList.add("umig-modal-open");

    // Render content
    this.render();

    // Setup DOM event listeners (including close button)
    this.setupDOMListeners();

    // If tabs are enabled, ensure active tab content is rendered
    if (this.tabsEnabled && this.tabs.size > 0) {
      await this.renderActiveTabContent();
    }

    // Focus first focusable element
    this.focusFirstElement();

    // Trigger animation
    if (this.config.animated) {
      requestAnimationFrame(() => {
        wrapper.classList.add("umig-modal-show");
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

    // Add diagnostic check after modal should be fully open
    setTimeout(() => {
      if (this.isOpen) {
        this.diagnoseModalVisibility();
      }
    }, 100);
  }

  /**
   * Close modal
   */
  close() {
    if (!this.isOpen) return;

    const wrapper = this.container.querySelector(".umig-modal-wrapper");
    const backdrop = this.container.querySelector(".umig-modal-backdrop");
    if (!wrapper) return;

    // Trigger close animation
    if (this.config.animated) {
      wrapper.classList.remove("umig-modal-show");
      setTimeout(() => this.doClose(wrapper, backdrop), 300);
    } else {
      this.doClose(wrapper, backdrop);
    }
  }

  /**
   * Actually close the modal
   */
  doClose(wrapper, backdrop) {
    if (wrapper) wrapper.style.display = "none";
    if (backdrop) backdrop.style.display = "none";

    // CRITICAL: Hide the container itself (ADR-061 fix)
    this.container.style.display = "none";

    this.isOpen = false;

    // Remove body class
    document.body.classList.remove("umig-modal-open");

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

    // Cleanup color picker instances
    this.cleanupColorPickers();

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
   * Setup DOM event listeners - BULLETPROOF IMPLEMENTATION
   *
   * CRITICAL FIX: This addresses a recurring modal close button regression where footer
   * close buttons stop working while header close buttons continue to work.
   *
   * ROOT CAUSE: EmailUtils integration required SecurityUtils allowedTags/allowedAttributes
   * updates, which stripped onclick handlers from footer buttons processed through
   * safeSetInnerHTML, creating a race condition between HTML insertion and event binding.
   *
   * BULLETPROOF SOLUTION LAYERS:
   * 1. SecurityUtils Configuration: Added "onclick" to allowedAttributes for buttons
   * 2. Dual Close Mechanisms: Close/Cancel buttons have both onclick AND data-action
   * 3. Event Delegation: Footer uses container-level delegation instead of individual button listeners
   * 4. Proper Cleanup: Event handlers are properly removed in onDestroy
   *
   * This prevents future regressions regardless of SecurityUtils changes or dynamic content.
   */
  setupDOMListeners() {
    // Close button - direct event binding to ensure it works
    const closeBtn = this.container.querySelector(".umig-modal-close");
    if (closeBtn) {
      // Remove any existing listeners first by cloning
      const newCloseBtn = closeBtn.cloneNode(true);
      closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

      // Add fresh event listener
      newCloseBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      });
    }

    // SECURITY FIX: Backdrop click using data attribute instead of inline onclick
    const backdrop = this.container.querySelector(".umig-modal-backdrop");
    if (backdrop) {
      const closeOnOverlay =
        backdrop.getAttribute("data-close-on-overlay") === "true";
      if (closeOnOverlay) {
        // Direct event binding for backdrop
        backdrop.addEventListener("click", (e) => {
          if (e.target === backdrop) {
            e.preventDefault();
            e.stopPropagation();
            this.close();
          }
        });
      }
    }

    // ✅ BULLETPROOF: Use event delegation on footer container instead of individual buttons
    // This prevents race conditions and works even if buttons are dynamically added/removed
    const footer = this.container.querySelector(".umig-modal-footer");
    if (footer) {
      // Remove any existing listeners to prevent duplicates
      footer.removeEventListener("click", this._footerClickHandler);

      // Create bound handler function for proper cleanup
      this._footerClickHandler = (e) => {
        // Find the clicked button (handle event bubbling)
        const button = e.target.closest("button");
        if (button && button.dataset.action) {
          e.preventDefault();
          e.stopPropagation();
          this.handleButtonAction(button.dataset.action);
        }
      };

      footer.addEventListener("click", this._footerClickHandler);
    }

    // Form events
    if (this.config.form) {
      this.setupFormListeners();
    }
  }

  /**
   * Handle button action
   */
  handleButtonAction(action) {
    // Check for custom button click handler first
    if (
      this.config.onButtonClick &&
      typeof this.config.onButtonClick === "function"
    ) {
      try {
        const result = this.config.onButtonClick(action);
        // If handler returns true, it handled the action (including closing if needed)
        if (result === true) {
          return;
        }
      } catch (error) {
        console.error(
          "[ModalComponent] Error in custom button click handler:",
          error,
        );
      }
    }

    // Default button handling
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
    const form = this.container.querySelector(".umig-modal-form");
    if (!form) return;

    // Input change events
    form.addEventListener("input", (e) => {
      const field = e.target;
      if (field.name) {
        let value = field.value;

        // Handle checkboxes - get boolean value
        if (field.type === "checkbox") {
          value = field.checked;
        }

        // Handle select fields - convert to number if the value is numeric
        if (field.type === "select-one" && value && !isNaN(value)) {
          value = parseInt(value, 10);
        }

        this.updateFormData(field.name, value);
        this.clearFieldError(field.name);
      }
    });

    // Also listen for change events (important for checkboxes and select elements)
    form.addEventListener("change", (e) => {
      const field = e.target;
      if (field.name) {
        let value = field.value;

        // Handle checkboxes - get boolean value
        if (field.type === "checkbox") {
          value = field.checked;
        }

        // Handle select fields - convert to number if the value is numeric
        if (field.type === "select-one" && value && !isNaN(value)) {
          value = parseInt(value, 10);
        }

        this.updateFormData(field.name, value);
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
    const group = field?.closest(".umig-form-group");
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
    const footer = this.container.querySelector(".umig-modal-footer");
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
    const body = this.container.querySelector(".umig-modal-body");
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
    console.log(
      "[DEBUG] ModalComponent.updateConfig: Called with config:",
      config,
    );
    console.log(
      "[DEBUG] ModalComponent.updateConfig: Current config before merge:",
      this.config,
    );

    this.config = { ...this.config, ...config };

    console.log(
      "[DEBUG] ModalComponent.updateConfig: Config after merge:",
      this.config,
    );
    console.log(
      "[DEBUG] ModalComponent.updateConfig: Final config.form:",
      this.config.form,
    );
    console.log(
      "[DEBUG] ModalComponent.updateConfig: Final config.content length:",
      this.config.content?.length,
    );
    console.log(
      "[DEBUG] ModalComponent.updateConfig: Final config.type:",
      this.config.type,
    );

    // Update mode if provided
    if (config.mode !== undefined) {
      this.mode = config.mode;
    }

    if (this.isOpen) {
      console.log(
        "[DEBUG] ModalComponent.updateConfig: Modal is open, calling render()",
      );
      this.render();
    }
  }

  /**
   * Set modal title
   */
  setTitle(title) {
    this.config.title = title;
    if (this.isOpen) {
      const titleElement = this.container.querySelector(".umig-modal-title");
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
      const body = this.container.querySelector(".umig-modal-body");
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
              "hr",
              "label",
            ],
            allowedAttributes: {
              a: ["href", "title", "target"],
              span: ["class", "style", "title"], // ✅ FIXED: Allow style for color swatches and title for icons
              div: ["class", "style"], // ✅ FIXED: Allow style for layout and formatting
              img: ["src", "alt", "title", "width", "height"],
              hr: ["style"], // Allow styling for separators
              label: ["class"], // Allow label styling
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
            // Use DOMParser for safe HTML parsing
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, "text/html");
            temp.appendChild(
              doc.body.firstChild || doc.createTextNode(content),
            );
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
   * Diagnostic method to debug modal visibility issues
   */
  diagnoseModalVisibility() {
    const wrapper = this.container.querySelector(".umig-modal-wrapper");
    const backdrop = this.container.querySelector(".umig-modal-backdrop");
    const modalContainer = this.container.querySelector(
      ".umig-modal-container",
    );
    const modalDialog = this.container.querySelector(".umig-modal-dialog");
    const modalBody = this.container.querySelector(".umig-modal-body");

    console.log("[ModalComponent] DIAGNOSTIC REPORT for", this.containerId);
    console.log("=".repeat(50));

    // Check element existence
    console.log("Element Existence:", {
      container: !!this.container,
      wrapper: !!wrapper,
      backdrop: !!backdrop,
      modalContainer: !!modalContainer,
      modalDialog: !!modalDialog,
      modalBody: !!modalBody,
    });

    // Check container visibility
    if (this.container) {
      const containerRect = this.container.getBoundingClientRect();
      console.log("Container:", {
        display: this.container.style.display,
        visibility: this.container.style.visibility,
        rect: containerRect,
        visible: containerRect.width > 0 && containerRect.height > 0,
      });
    }

    // Check wrapper visibility
    if (wrapper) {
      const wrapperRect = wrapper.getBoundingClientRect();
      const wrapperStyles = window.getComputedStyle(wrapper);
      console.log("Wrapper:", {
        display: wrapperStyles.display,
        visibility: wrapperStyles.visibility,
        opacity: wrapperStyles.opacity,
        zIndex: wrapperStyles.zIndex,
        position: wrapperStyles.position,
        rect: wrapperRect,
        visible: wrapperRect.width > 0 && wrapperRect.height > 0,
      });
    }

    // Check modal container visibility
    if (modalContainer) {
      const containerRect = modalContainer.getBoundingClientRect();
      const containerStyles = window.getComputedStyle(modalContainer);
      console.log("Modal Container:", {
        display: containerStyles.display,
        visibility: containerStyles.visibility,
        opacity: containerStyles.opacity,
        width: containerStyles.width,
        height: containerStyles.height,
        rect: containerRect,
        visible: containerRect.width > 0 && containerRect.height > 0,
      });
    }

    console.log("=".repeat(50));
  }

  /**
   * Clean up on destroy
   */
  onDestroy() {
    if (this.isOpen) {
      this.close();
    }

    // ✅ BULLETPROOF: Clean up event delegation handlers
    const footer = this.container.querySelector(".umig-modal-footer");
    if (footer && this._footerClickHandler) {
      footer.removeEventListener("click", this._footerClickHandler);
      this._footerClickHandler = null;
    }

    // Clean up global close function (ADR-061 fix)
    if (this.globalCloseFunction && window[this.globalCloseFunction]) {
      delete window[this.globalCloseFunction];
    }

    // Clear tabs state
    this.tabs.clear();
    this.activeTabId = null;
    this.tabsEnabled = false;
  }
}

// Add UMIG modal styles to avoid Confluence conflicts (ADR-061)
if (
  typeof window !== "undefined" &&
  !document.getElementById("umig-modal-styles")
) {
  const style = document.createElement("style");
  style.id = "umig-modal-styles";
  style.textContent = `
    /* UMIG Modal Styles - Maximum Override for Confluence (ADR-061) */
    body.umig-modal-open {
      overflow: hidden !important;
    }

    /* Ultra-high specificity selectors to override Confluence */
    html body .umig-modal-backdrop,
    html body div.umig-modal-backdrop,
    html body .page-container .umig-modal-backdrop {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      background-color: rgba(0, 0, 0, 0.6) !important;
      z-index: 999998 !important;
      animation: umigFadeIn 0.2s ease-out !important;
    }

    html body .umig-modal-wrapper,
    html body div.umig-modal-wrapper,
    html body .page-container .umig-modal-wrapper {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      z-index: 999999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      pointer-events: auto !important;
    }

    html body .umig-modal-container,
    html body div.umig-modal-container,
    html body .page-container .umig-modal-container {
      position: relative !important;
      background: white !important;
      border-radius: 8px !important;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3) !important;
      max-width: 800px !important;
      width: 90% !important;
      max-height: 80vh !important;
      overflow: hidden !important;
      pointer-events: auto !important;
      margin: 20px !important;
      animation: umigSlideIn 0.3s ease-out !important;
    }

    /* Small Modal Size for Delete Confirmations */
    html body .umig-modal-container.umig-modal-small,
    html body div.umig-modal-container.umig-modal-small,
    html body .page-container .umig-modal-container.umig-modal-small {
      max-width: 480px !important;
      width: 80% !important;
      min-width: 360px !important;
    }

    /* Medium Modal Size */
    html body .umig-modal-container.umig-modal-medium,
    html body div.umig-modal-container.umig-modal-medium,
    html body .page-container .umig-modal-container.umig-modal-medium {
      max-width: 640px !important;
      width: 85% !important;
    }

    /* Large Modal Size */
    html body .umig-modal-container.umig-modal-large,
    html body div.umig-modal-container.umig-modal-large,
    html body .page-container .umig-modal-container.umig-modal-large {
      max-width: 900px !important;
      width: 95% !important;
    }

    @keyframes umigFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes umigSlideIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .umig-modal-close:hover {
      color: #24292e !important;
    }

    .umig-modal-btn:hover {
      opacity: 0.9 !important;
    }

    /* Override Confluence styles with maximum specificity */
    html body .umig-modal-wrapper *,
    html body div.umig-modal-wrapper *,
    html body .page-container .umig-modal-wrapper * {
      box-sizing: border-box !important;
    }

    /* Button styles with ultra-high specificity */
    html body .umig-modal-btn,
    html body div.umig-modal-btn,
    html body .page-container .umig-modal-btn {
      padding: 8px 20px !important;
      border-radius: 4px !important;
      border: 1px solid #d1d5db !important;
      cursor: pointer !important;
      font-size: 14px !important;
      font-weight: 500 !important;
    }

    html body .umig-modal-btn-primary,
    html body div.umig-modal-btn-primary,
    html body .page-container .umig-modal-btn-primary {
      background: #0969da !important;
      color: white !important;
    }

    html body .umig-modal-btn-secondary,
    html body div.umig-modal-btn-secondary,
    html body .page-container .umig-modal-btn-secondary {
      background: white !important;
      color: #24292e !important;
    }

    /* Force visibility for any hidden modals - Ultimate Override */
    html body .umig-modal-wrapper[style*="display: none"],
    html body div.umig-modal-wrapper[style*="display: none"],
    html body .umig-modal-wrapper[style*="visibility: hidden"],
    html body div.umig-modal-wrapper[style*="visibility: hidden"] {
      display: flex !important;
      visibility: visible !important;
      opacity: 1 !important;
    }

    /* Ensure modal content is always visible when modal is open */
    html body .umig-modal-wrapper[style*="display: flex"] .umig-modal-container,
    html body div.umig-modal-wrapper[style*="display: flex"] .umig-modal-container {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      transform: none !important;
      position: relative !important;
      background: white !important;
      border-radius: 8px !important;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3) !important;
      max-width: 800px !important;
      width: 90% !important;
      max-height: 80vh !important;
      overflow: hidden !important;
      pointer-events: auto !important;
      margin: 20px !important;
    }

    /* Force modal content to be visible */
    html body .umig-modal-wrapper[style*="display: flex"] .umig-modal-dialog,
    html body div.umig-modal-wrapper[style*="display: flex"] .umig-modal-dialog {
      display: flex !important;
      flex-direction: column !important;
      height: 100% !important;
      visibility: visible !important;
    }

    /* Prevent Confluence from hiding modal elements */
    html body .umig-modal-wrapper,
    html body .umig-modal-container,
    html body .umig-modal-dialog,
    html body .umig-modal-header,
    html body .umig-modal-body,
    html body .umig-modal-footer {
      visibility: visible !important;
      opacity: 1 !important;
    }

    /* Professional Form Styling for Modal Content */
    html body .umig-modal-wrapper .umig-modal-header,
    html body div.umig-modal-wrapper .umig-modal-header,
    html body .page-container .umig-modal-wrapper .umig-modal-header {
      padding: 20px 24px 16px 24px !important;
      border-bottom: 1px solid #e1e5e9 !important;
      background: #f8f9fa !important;
      position: relative !important;
    }

    html body .umig-modal-wrapper .umig-modal-title,
    html body div.umig-modal-wrapper .umig-modal-title,
    html body .page-container .umig-modal-wrapper .umig-modal-title {
      font-size: 18px !important;
      font-weight: 600 !important;
      color: #24292e !important;
      margin: 0 !important;
      line-height: 1.4 !important;
    }

    html body .umig-modal-wrapper .umig-modal-close,
    html body div.umig-modal-wrapper .umig-modal-close,
    html body .page-container .umig-modal-wrapper .umig-modal-close {
      position: absolute !important;
      top: 16px !important;
      right: 20px !important;
      background: none !important;
      border: none !important;
      font-size: 24px !important;
      font-weight: 300 !important;
      color: #6a737d !important;
      cursor: pointer !important;
      padding: 4px 8px !important;
      border-radius: 4px !important;
      transition: all 0.2s ease !important;
      line-height: 1 !important;
    }

    html body .umig-modal-wrapper .umig-modal-close:hover,
    html body div.umig-modal-wrapper .umig-modal-close:hover,
    html body .page-container .umig-modal-wrapper .umig-modal-close:hover {
      color: #24292e !important;
      background: #f6f8fa !important;
    }

    html body .umig-modal-wrapper .umig-modal-body,
    html body div.umig-modal-wrapper .umig-modal-body,
    html body .page-container .umig-modal-wrapper .umig-modal-body {
      padding: 24px !important;
      max-height: calc(80vh - 160px) !important;
      overflow-y: auto !important;
      background: white !important;
    }

    /* Form Element Styling */
    html body .umig-modal-wrapper form,
    html body div.umig-modal-wrapper form,
    html body .page-container .umig-modal-wrapper form {
      margin: 0 !important;
    }

    html body .umig-modal-wrapper .form-group,
    html body div.umig-modal-wrapper .form-group,
    html body .page-container .umig-modal-wrapper .form-group {
      margin-bottom: 20px !important;
      display: flex !important;
      flex-direction: column !important;
    }

    html body .umig-modal-wrapper label,
    html body div.umig-modal-wrapper label,
    html body .page-container .umig-modal-wrapper label {
      font-size: 14px !important;
      font-weight: 600 !important;
      color: #24292e !important;
      margin-bottom: 6px !important;
      display: block !important;
      line-height: 1.4 !important;
    }

    html body .umig-modal-wrapper input[type="text"],
    html body .umig-modal-wrapper input[type="email"],
    html body .umig-modal-wrapper input[type="password"],
    html body .umig-modal-wrapper input[type="number"],
    html body .umig-modal-wrapper textarea,
    html body .umig-modal-wrapper select,
    html body div.umig-modal-wrapper input[type="text"],
    html body div.umig-modal-wrapper input[type="email"],
    html body div.umig-modal-wrapper input[type="password"],
    html body div.umig-modal-wrapper input[type="number"],
    html body div.umig-modal-wrapper textarea,
    html body div.umig-modal-wrapper select,
    html body .page-container .umig-modal-wrapper input[type="text"],
    html body .page-container .umig-modal-wrapper input[type="email"],
    html body .page-container .umig-modal-wrapper input[type="password"],
    html body .page-container .umig-modal-wrapper input[type="number"],
    html body .page-container .umig-modal-wrapper textarea,
    html body .page-container .umig-modal-wrapper select {
      width: 100% !important;
      padding: 8px 12px !important;
      border: 1px solid #d0d7de !important;
      border-radius: 6px !important;
      font-size: 14px !important;
      line-height: 1.4 !important;
      color: #24292e !important;
      background: white !important;
      transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
      box-sizing: border-box !important;
    }

    html body .umig-modal-wrapper input[type="text"]:focus,
    html body .umig-modal-wrapper input[type="email"]:focus,
    html body .umig-modal-wrapper input[type="password"]:focus,
    html body .umig-modal-wrapper input[type="number"]:focus,
    html body .umig-modal-wrapper textarea:focus,
    html body .umig-modal-wrapper select:focus,
    html body div.umig-modal-wrapper input[type="text"]:focus,
    html body div.umig-modal-wrapper input[type="email"]:focus,
    html body div.umig-modal-wrapper input[type="password"]:focus,
    html body div.umig-modal-wrapper input[type="number"]:focus,
    html body div.umig-modal-wrapper textarea:focus,
    html body div.umig-modal-wrapper select:focus,
    html body .page-container .umig-modal-wrapper input[type="text"]:focus,
    html body .page-container .umig-modal-wrapper input[type="email"]:focus,
    html body .page-container .umig-modal-wrapper input[type="password"]:focus,
    html body .page-container .umig-modal-wrapper input[type="number"]:focus,
    html body .page-container .umig-modal-wrapper textarea:focus,
    html body .page-container .umig-modal-wrapper select:focus {
      outline: none !important;
      border-color: #0969da !important;
      box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.1) !important;
    }

    /* Checkbox and Radio Styling */
    html body .umig-modal-wrapper input[type="checkbox"],
    html body .umig-modal-wrapper input[type="radio"],
    html body div.umig-modal-wrapper input[type="checkbox"],
    html body div.umig-modal-wrapper input[type="radio"],
    html body .page-container .umig-modal-wrapper input[type="checkbox"],
    html body .page-container .umig-modal-wrapper input[type="radio"] {
      width: auto !important;
      margin-right: 8px !important;
      margin-bottom: 0 !important;
      transform: scale(1.1) !important;
    }

    html body .umig-modal-wrapper .checkbox-group,
    html body .umig-modal-wrapper .radio-group,
    html body div.umig-modal-wrapper .checkbox-group,
    html body div.umig-modal-wrapper .radio-group,
    html body .page-container .umig-modal-wrapper .checkbox-group,
    html body .page-container .umig-modal-wrapper .radio-group {
      display: flex !important;
      align-items: center !important;
      margin-bottom: 16px !important;
    }

    html body .umig-modal-wrapper .checkbox-group label,
    html body .umig-modal-wrapper .radio-group label,
    html body div.umig-modal-wrapper .checkbox-group label,
    html body div.umig-modal-wrapper .radio-group label,
    html body .page-container .umig-modal-wrapper .checkbox-group label,
    html body .page-container .umig-modal-wrapper .radio-group label {
      margin-bottom: 0 !important;
      font-weight: 400 !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
    }

    /* Modal Footer Styling */
    html body .umig-modal-wrapper .umig-modal-footer,
    html body div.umig-modal-wrapper .umig-modal-footer,
    html body .page-container .umig-modal-wrapper .umig-modal-footer {
      padding: 16px 24px 20px 24px !important;
      border-top: 1px solid #e1e5e9 !important;
      background: #f8f9fa !important;
      display: flex !important;
      justify-content: flex-end !important;
      gap: 12px !important;
    }

    /* Enhanced Button Styling for Modal */
    html body .umig-modal-wrapper .umig-modal-btn,
    html body div.umig-modal-wrapper .umig-modal-btn,
    html body .page-container .umig-modal-wrapper .umig-modal-btn {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 8px 16px !important;
      border-radius: 6px !important;
      border: 1px solid #d0d7de !important;
      cursor: pointer !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      line-height: 1.4 !important;
      text-decoration: none !important;
      transition: all 0.2s ease !important;
      min-width: 80px !important;
      box-sizing: border-box !important;
    }

    html body .umig-modal-wrapper .umig-modal-btn-primary,
    html body div.umig-modal-wrapper .umig-modal-btn-primary,
    html body .page-container .umig-modal-wrapper .umig-modal-btn-primary {
      background: #0969da !important;
      color: white !important;
      border-color: #0969da !important;
    }

    html body .umig-modal-wrapper .umig-modal-btn-primary:hover,
    html body div.umig-modal-wrapper .umig-modal-btn-primary:hover,
    html body .page-container .umig-modal-wrapper .umig-modal-btn-primary:hover {
      background: #0860ca !important;
      border-color: #0860ca !important;
    }

    html body .umig-modal-wrapper .umig-modal-btn-secondary,
    html body div.umig-modal-wrapper .umig-modal-btn-secondary,
    html body .page-container .umig-modal-wrapper .umig-modal-btn-secondary {
      background: white !important;
      color: #24292e !important;
      border-color: #d0d7de !important;
    }

    html body .umig-modal-wrapper .umig-modal-btn-secondary:hover,
    html body div.umig-modal-wrapper .umig-modal-btn-secondary:hover,
    html body .page-container .umig-modal-wrapper .umig-modal-btn-secondary:hover {
      background: #f6f8fa !important;
      border-color: #d0d7de !important;
    }

    /* Danger Button Styling for Delete Confirmations */
    html body .umig-modal-wrapper .umig-modal-btn-danger,
    html body div.umig-modal-wrapper .umig-modal-btn-danger,
    html body .page-container .umig-modal-wrapper .umig-modal-btn-danger {
      background: #d73a49 !important;
      color: white !important;
      border-color: #d73a49 !important;
    }

    html body .umig-modal-wrapper .umig-modal-btn-danger:hover,
    html body div.umig-modal-wrapper .umig-modal-btn-danger:hover,
    html body .page-container .umig-modal-wrapper .umig-modal-btn-danger:hover {
      background: #cb2431 !important;
      border-color: #cb2431 !important;
    }

    html body .umig-modal-wrapper .umig-modal-btn-danger:focus,
    html body div.umig-modal-wrapper .umig-modal-btn-danger:focus,
    html body .page-container .umig-modal-wrapper .umig-modal-btn-danger:focus {
      box-shadow: 0 0 0 3px rgba(215, 58, 73, 0.3) !important;
    }

    /* Warning Button Styling */
    html body .umig-modal-wrapper .umig-modal-btn-warning,
    html body div.umig-modal-wrapper .umig-modal-btn-warning,
    html body .page-container .umig-modal-wrapper .umig-modal-btn-warning {
      background: #e36209 !important;
      color: white !important;
      border-color: #e36209 !important;
    }

    html body .umig-modal-wrapper .umig-modal-btn-warning:hover,
    html body div.umig-modal-wrapper .umig-modal-btn-warning:hover,
    html body .page-container .umig-modal-wrapper .umig-modal-btn-warning:hover {
      background: #d15704 !important;
      border-color: #d15704 !important;
    }

    html body .umig-modal-wrapper .umig-modal-btn-warning:focus,
    html body div.umig-modal-wrapper .umig-modal-btn-warning:focus,
    html body .page-container .umig-modal-wrapper .umig-modal-btn-warning:focus {
      box-shadow: 0 0 0 3px rgba(227, 98, 9, 0.3) !important;
    }

    /* Error and Success Message Styling */
    html body .umig-modal-wrapper .alert,
    html body div.umig-modal-wrapper .alert,
    html body .page-container .umig-modal-wrapper .alert {
      padding: 12px 16px !important;
      border-radius: 6px !important;
      margin-bottom: 16px !important;
      border: 1px solid transparent !important;
    }

    html body .umig-modal-wrapper .alert-error,
    html body div.umig-modal-wrapper .alert-error,
    html body .page-container .umig-modal-wrapper .alert-error {
      background: #fdf2f2 !important;
      color: #d73a49 !important;
      border-color: #fdbdbd !important;
    }

    html body .umig-modal-wrapper .alert-success,
    html body div.umig-modal-wrapper .alert-success,
    html body .page-container .umig-modal-wrapper .alert-success {
      background: #f0fff4 !important;
      color: #28a745 !important;
      border-color: #c3e6cb !important;
    }

    html body .umig-modal-wrapper .alert-warning,
    html body div.umig-modal-wrapper .alert-warning,
    html body .page-container .umig-modal-wrapper .alert-warning {
      background: #fff8e1 !important;
      color: #e36209 !important;
      border-color: #ffecb3 !important;
    }

    /* Disabled State Styling */
    html body .umig-modal-wrapper input:disabled,
    html body .umig-modal-wrapper textarea:disabled,
    html body .umig-modal-wrapper select:disabled,
    html body div.umig-modal-wrapper input:disabled,
    html body div.umig-modal-wrapper textarea:disabled,
    html body div.umig-modal-wrapper select:disabled,
    html body .page-container .umig-modal-wrapper input:disabled,
    html body .page-container .umig-modal-wrapper textarea:disabled,
    html body .page-container .umig-modal-wrapper select:disabled {
      background: #f6f8fa !important;
      color: #6a737d !important;
      cursor: not-allowed !important;
    }

    /* Readonly Field Styling with UMIG Prefix */
    html body .umig-modal-wrapper .umig-readonly-field,
    html body div.umig-modal-wrapper .umig-readonly-field,
    html body .page-container .umig-modal-wrapper .umig-readonly-field {
      background: #f8f9fa !important;
      color: #6a737d !important;
      border-color: #e1e5e9 !important;
      cursor: default !important;
    }

    html body .umig-modal-wrapper .umig-form-group.umig-readonly .umig-form-label,
    html body div.umig-modal-wrapper .umig-form-group.umig-readonly .umig-form-label,
    html body .page-container .umig-modal-wrapper .umig-form-group.umig-readonly .umig-form-label {
      color: #6a737d !important;
    }

    html body .umig-modal-wrapper .umig-readonly-field:focus,
    html body div.umig-modal-wrapper .umig-readonly-field:focus,
    html body .page-container .umig-modal-wrapper .umig-readonly-field:focus {
      border-color: #d0d7de !important;
      box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.05) !important;
    }

    html body .umig-modal-wrapper .umig-modal-btn:disabled,
    html body div.umig-modal-wrapper .umig-modal-btn:disabled,
    html body .page-container .umig-modal-wrapper .umig-modal-btn:disabled {
      background: #f6f8fa !important;
      color: #6a737d !important;
      border-color: #d0d7de !important;
      cursor: not-allowed !important;
      opacity: 0.6 !important;
    }

    /* Responsive Design for Smaller Screens */
    @media (max-width: 640px) {
      html body .umig-modal-container,
      html body div.umig-modal-container,
      html body .page-container .umig-modal-container {
        width: 95% !important;
        margin: 10px !important;
        max-height: 90vh !important;
      }

      html body .umig-modal-wrapper .umig-modal-header,
      html body .umig-modal-wrapper .umig-modal-body,
      html body .umig-modal-wrapper .umig-modal-footer,
      html body div.umig-modal-wrapper .umig-modal-header,
      html body div.umig-modal-wrapper .umig-modal-body,
      html body div.umig-modal-wrapper .umig-modal-footer {
        padding-left: 16px !important;
        padding-right: 16px !important;
      }

      html body .umig-modal-wrapper .umig-modal-footer,
      html body div.umig-modal-wrapper .umig-modal-footer {
        flex-direction: column !important;
        gap: 8px !important;
      }

      html body .umig-modal-wrapper .umig-modal-btn,
      html body div.umig-modal-wrapper .umig-modal-btn {
        width: 100% !important;
      }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Factory function for creating deletion confirmation modals
 * @param {Object} config - Configuration object
 * @param {string} config.entityName - The name of the entity being deleted (e.g., "Team ABC", "User John Doe")
 * @param {string} config.entityType - The type of entity being deleted (e.g., "team", "user")
 * @param {Function} config.onConfirm - Callback function executed when deletion is confirmed
 * @param {Function} config.onCancel - Optional callback function executed when deletion is cancelled
 * @returns {ModalComponent} Configured modal instance ready for opening
 */
function createDeleteConfirmation(config) {
  // Validate required parameters
  if (!config || !config.entityName || !config.onConfirm) {
    throw new Error(
      "[ModalComponent] createDeleteConfirmation requires entityName and onConfirm callback",
    );
  }

  // Generate unique container ID for this modal
  const containerId = `delete-confirmation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Create container element in body
  const container = document.createElement("div");
  container.id = containerId;
  container.style.display = "none"; // Initially hidden
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "0";
  container.style.width = "100%";
  container.style.height = "100%";
  container.style.zIndex = "999999";
  document.body.appendChild(container);

  // Determine entity type display name
  const entityType = config.entityType || "item";
  const displayEntityType =
    entityType.charAt(0).toUpperCase() + entityType.slice(1);

  // Create modal configuration
  const modalConfig = {
    type: "warning",
    title: `⚠️ Delete ${displayEntityType}`,
    content: `
      <div style="text-align: center; padding: 20px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px; color: #24292e; line-height: 1.5;">
          Are you sure you want to delete <strong>"${config.entityName}"</strong>?
        </p>
        <div style="background: #fff8e1; border: 1px solid #ffecb3; border-radius: 6px; padding: 15px; margin: 10px 0;">
          <p style="color: #d73a49; font-weight: 600; margin: 0; font-size: 14px;">
            ⚠️ This action cannot be undone
          </p>
        </div>
      </div>
    `,
    size: "small",
    centered: true,
    closeOnOverlay: false,
    closeOnEscape: true,
    closeable: true,
    animated: true,
    buttons: [
      {
        text: "Cancel",
        action: "cancel",
        variant: "secondary",
      },
      {
        text: "Delete",
        action: "confirm",
        variant: "danger",
      },
    ],
    onButtonClick: (action) => {
      if (action === "confirm") {
        // Execute the confirmation callback
        try {
          const result = config.onConfirm();
          // If callback returns a promise, handle it
          if (result && typeof result.then === "function") {
            result
              .then(() => {
                modal.close();
                // Clean up container after modal closes
                setTimeout(() => {
                  if (container.parentNode) {
                    container.parentNode.removeChild(container);
                  }
                }, 100);
              })
              .catch((error) => {
                console.error(
                  "[ModalComponent] Delete confirmation callback error:",
                  error,
                );
                // Don't close modal on error, let user retry or cancel
              });
          } else {
            // Synchronous callback completed
            modal.close();
            // Clean up container after modal closes
            setTimeout(() => {
              if (container.parentNode) {
                container.parentNode.removeChild(container);
              }
            }, 100);
          }
        } catch (error) {
          console.error(
            "[ModalComponent] Delete confirmation callback error:",
            error,
          );
          // Don't close modal on error, let user retry or cancel
        }
        return true; // Indicate we handled the action
      } else if (action === "cancel") {
        // Execute the cancel callback if provided
        if (config.onCancel && typeof config.onCancel === "function") {
          try {
            config.onCancel();
          } catch (error) {
            console.error(
              "[ModalComponent] Delete cancellation callback error:",
              error,
            );
          }
        }
        modal.close();
        // Clean up container after modal closes
        setTimeout(() => {
          if (container.parentNode) {
            container.parentNode.removeChild(container);
          }
        }, 100);
        return true; // Indicate we handled the action
      }
      return false; // Let default handling occur
    },
    onClose: () => {
      // Clean up container when modal is closed by any means
      setTimeout(() => {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      }, 100);
    },
  };

  // Create and initialize the modal
  const modal = new ModalComponent(containerId, modalConfig);
  modal.initialize();

  return modal;
}

// Attach factory method to ModalComponent
ModalComponent.createDeleteConfirmation = createDeleteConfirmation;

// Export for use
if (typeof module !== "undefined" && module.exports) {
  module.exports = ModalComponent;
}

if (typeof window !== "undefined") {
  window.ModalComponent = ModalComponent;
}
