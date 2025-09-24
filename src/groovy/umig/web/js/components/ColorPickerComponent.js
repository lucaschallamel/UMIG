/**
 * ColorPickerComponent - Visual Color Selection Component
 *
 * Provides a visual color picker with predefined colors and custom color input.
 * Designed for use in forms where users need to select colors visually rather than
 * typing hex codes. Integrates with SecurityUtils and follows UMIG component patterns.
 *
 * Features:
 * - Grid of predefined colors for quick selection
 * - Custom color option with native browser color picker
 * - Visual preview of selected color
 * - Hex value input synchronization
 * - Accessibility support with keyboard navigation
 * - SecurityUtils integration for safe DOM manipulation
 *
 * Usage:
 * ```javascript
 * const colorPicker = new ColorPickerComponent({
 *   container: document.getElementById('color-container'),
 *   defaultColor: '#6B73FF',
 *   onChange: (color) => console.log('Color changed:', color)
 * });
 * colorPicker.mount();
 * ```
 *
 * @author UMIG Development Team
 * @version 1.0.0
 * @since Sprint 7 - US-087 Color Picker Enhancement
 */

class ColorPickerComponent extends BaseComponent {
  constructor(options = {}) {
    // Extract container and pass containerId to BaseComponent
    const containerId = options.container
      ? options.container.id || "color-picker-container"
      : "color-picker-container";
    super(containerId, options);

    this.name = "ColorPickerComponent";
    this.version = "1.0.0";

    // Configuration options
    this.defaultColor = options.defaultColor || "#F57C00";
    this.allowCustomColors = options.allowCustomColors !== false; // Default to true
    this.showHexInput = options.showHexInput !== false; // Default to true
    this.onChange = options.onChange || (() => {});
    this.onValidationChange = options.onValidationChange || (() => {});
    this.required = options.required || false;

    // Component state
    this.currentColor = this.defaultColor;
    this.isValid = true;
    this.isOpen = false;

    // DOM references - store the actual container element from options
    this.container = options.container || null;
    this.colorButton = null;
    this.colorPopover = null;
    this.hexInput = null;
    this.nativeColorInput = null;

    // Predefined color palette - enterprise-friendly colors
    this.predefinedColors = [
      "#F57C00", // Orange (default)
      "#FF5722", // Deep Orange
      "#2196F3", // Blue
      "#4CAF50", // Green
      "#FF9800", // Orange
      "#9C27B0", // Purple
      "#607D8B", // Blue Grey
      "#795548", // Brown
      "#E91E63", // Pink
      "#3F51B5", // Indigo
      "#00BCD4", // Cyan
      "#8BC34A", // Light Green
      "#FFEB3B", // Yellow
      "#FF5630", // Red
      "#6B73FF", // UMIG Blue
      "#0052CC", // Confluence Blue
      "#36B37E", // Success Green
      "#FFAB00", // Warning Orange
      "#6554C0", // Purple
      "#00B8D9", // Cyan
      "#253858", // Dark Blue
      "#42526E", // Gray Blue
      "#091E42", // Navy
      "#000000", // Black
    ];

    // Validation pattern for hex colors
    this.hexPattern = /^#[0-9A-Fa-f]{6}$/;

    // Bind methods
    this._handleColorSelect = this._handleColorSelect.bind(this);
    this._handleHexInput = this._handleHexInput.bind(this);
    this._handleNativeColorInput = this._handleNativeColorInput.bind(this);
    this._togglePopover = this._togglePopover.bind(this);
    this._handleClickOutside = this._handleClickOutside.bind(this);
    this._handleKeydown = this._handleKeydown.bind(this);

    console.log("[ColorPickerComponent] Initialized with options:", {
      defaultColor: this.defaultColor,
      allowCustomColors: this.allowCustomColors,
      showHexInput: this.showHexInput,
      required: this.required,
    });
  }

  /**
   * Initialize the component
   * @returns {Promise<boolean>}
   */
  async initialize() {
    try {
      console.log("[ColorPickerComponent] Initializing...");

      // Validate container
      if (!this.container) {
        throw new Error("Container element is required");
      }

      // Add component styles
      this._addStyles();

      this.initialized = true;
      console.log("[ColorPickerComponent] Initialized successfully");
      return true;
    } catch (error) {
      console.error("[ColorPickerComponent] Initialization failed:", error);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Mount the component to the DOM
   * @returns {Promise<boolean>}
   */
  async mount() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      console.log("[ColorPickerComponent] Mounting...");

      // Create component HTML
      this._createHTML();

      // Attach event listeners
      this._attachEventListeners();

      // Set initial color
      this.setColor(this.currentColor);

      // Ensure popover starts closed
      this._closePopover();

      this.mounted = true;
      console.log("[ColorPickerComponent] Mounted successfully");
      return true;
    } catch (error) {
      console.error("[ColorPickerComponent] Mount failed:", error);
      this.mounted = false;
      return false;
    }
  }

  /**
   * Create the component HTML structure
   * @private
   */
  _createHTML() {
    const html = `
      <div class="umig-color-picker-wrapper">
        <div class="umig-color-picker-button-wrapper">
          <button type="button" class="umig-color-picker-button" aria-label="Select color">
            <div class="umig-color-picker-preview" style="background-color: ${this.currentColor};" title="${this.currentColor}"></div>
            <span class="umig-color-picker-chevron">▼</span>
          </button>
          ${
            this.showHexInput
              ? `
            <input type="text"
                   class="umig-color-picker-hex-input"
                   placeholder="#F57C00"
                   maxlength="7"
                   pattern="^#[0-9A-Fa-f]{6}$"
                   title="Hex color code (e.g., #F57C00)"
                   value="${this.currentColor}" />
          `
              : ""
          }
        </div>

        <div class="umig-color-picker-popover" style="display: none;">
          <div class="umig-color-picker-content">
            <div class="umig-color-picker-header">
              <h4>Select Color</h4>
            </div>

            <div class="umig-color-picker-palette">
              <div class="umig-color-picker-predefined">
                <label class="umig-color-picker-section-label">Predefined Colors</label>
                <div class="umig-color-picker-grid">
                  ${this.predefinedColors
                    .map(
                      (color) => `
                    <button type="button"
                            class="umig-color-picker-color-swatch"
                            style="background-color: ${color};"
                            data-color="${color}"
                            title="${color}"
                            aria-label="Select color ${color}">
                    </button>
                  `,
                    )
                    .join("")}
                </div>
              </div>

              ${
                this.allowCustomColors
                  ? `
                <div class="umig-color-picker-custom">
                  <label class="umig-color-picker-section-label">Custom Color</label>
                  <div class="umig-color-picker-custom-wrapper">
                    <input type="color"
                           class="umig-color-picker-native"
                           value="${this.currentColor}"
                           title="Choose custom color" />
                    <span class="umig-color-picker-custom-label">Custom</span>
                  </div>
                </div>
              `
                  : ""
              }
            </div>
          </div>
        </div>
      </div>
    `;

    console.log(
      "[ColorPickerComponent] Creating HTML with",
      this.predefinedColors.length,
      "color swatches",
    );

    // Use SecurityUtils.safeSetInnerHTML with allowed tags and attributes for ColorPickerComponent
    if (
      window.SecurityUtils &&
      typeof window.SecurityUtils.safeSetInnerHTML === "function"
    ) {
      const securityConfig = {
        allowedTags: ["div", "button", "span", "input", "h4", "label"],
        allowedAttributes: {
          div: ["class", "style", "title", "data-color"],
          button: [
            "type",
            "class",
            "style",
            "data-color",
            "title",
            "aria-label",
          ],
          span: ["class", "aria-hidden"],
          input: [
            "type",
            "class",
            "placeholder",
            "maxlength",
            "pattern",
            "title",
            "value",
          ],
          h4: [],
          label: ["class"],
        },
      };

      const result = window.SecurityUtils.safeSetInnerHTML(
        this.container,
        html,
        securityConfig,
      );

      // Check if SecurityUtils processed successfully
      const swatches = this.container.querySelectorAll(
        ".umig-color-picker-color-swatch",
      );
      console.log(
        "[ColorPickerComponent] SecurityUtils result:",
        result,
        "| Found swatches:",
        swatches.length,
      );

      // Ensure all swatches have their background colors applied
      if (swatches.length > 0) {
        swatches.forEach((swatch) => {
          const color = swatch.getAttribute("data-color");
          if (color) {
            const currentStyle = swatch.getAttribute("style");
            const hasBackgroundColor =
              currentStyle && currentStyle.includes("background-color");

            if (!hasBackgroundColor) {
              console.log(
                `[ColorPickerComponent] Applying fallback color ${color} to swatch`,
              );
              swatch.style.setProperty("background-color", color, "important");
            }
          }
        });
      }
    } else {
      console.warn(
        "[ColorPickerComponent] SecurityUtils.safeSetInnerHTML not available, using unsanitized HTML",
      );
      this.container.innerHTML = html;

      // Even without SecurityUtils, ensure colors are applied as DOM properties
      const swatches = this.container.querySelectorAll(
        ".umig-color-picker-color-swatch",
      );
      swatches.forEach((swatch) => {
        const color = swatch.getAttribute("data-color");
        if (color) {
          swatch.style.setProperty("background-color", color, "important");
        }
      });
    }

    // Cache DOM references
    this.colorButton = this.container.querySelector(
      ".umig-color-picker-button",
    );
    this.colorPopover = this.container.querySelector(
      ".umig-color-picker-popover",
    );
    this.colorPreview = this.container.querySelector(
      ".umig-color-picker-preview",
    );
    this.hexInput = this.container.querySelector(
      ".umig-color-picker-hex-input",
    );
    this.nativeColorInput = this.container.querySelector(
      ".umig-color-picker-native",
    );
  }

  /**
   * Attach event listeners
   * @private
   */
  _attachEventListeners() {
    // Color button click to toggle popover
    if (this.colorButton) {
      this.colorButton.addEventListener("click", this._togglePopover);
    }

    // Hex input changes
    if (this.hexInput) {
      this.hexInput.addEventListener("input", this._handleHexInput);
      this.hexInput.addEventListener("blur", this._handleHexInput);
    }

    // Native color input changes
    if (this.nativeColorInput) {
      this.nativeColorInput.addEventListener(
        "change",
        this._handleNativeColorInput,
      );
    }

    // Predefined color selection
    const colorSwatches = this.container.querySelectorAll(
      ".umig-color-picker-color-swatch",
    );
    colorSwatches.forEach((swatch) => {
      swatch.addEventListener("click", this._handleColorSelect);
    });

    // Click outside to close popover
    document.addEventListener("click", this._handleClickOutside);

    // Keyboard navigation
    this.container.addEventListener("keydown", this._handleKeydown);
  }

  /**
   * Handle color selection from predefined palette
   * @param {Event} event
   * @private
   */
  _handleColorSelect(event) {
    const color = event.target.getAttribute("data-color");
    if (color) {
      this.setColor(color);
      this._closePopover();

      // Focus back to the main button for accessibility
      if (this.colorButton) {
        this.colorButton.focus();
      }
    }
  }

  /**
   * Handle hex input changes
   * @param {Event} event
   * @private
   */
  _handleHexInput(event) {
    const value = event.target.value.trim();

    // Auto-add # if missing
    let normalizedValue = value;
    if (value && !value.startsWith("#")) {
      normalizedValue = "#" + value;
      event.target.value = normalizedValue;
    }

    // Validate and update color
    if (this._isValidHexColor(normalizedValue)) {
      this.setColor(normalizedValue, false); // Don't update hex input to avoid recursion
      this._setValidationState(true);
    } else if (normalizedValue === "") {
      // Empty is valid if not required
      this._setValidationState(!this.required);
    } else {
      this._setValidationState(false);
    }
  }

  /**
   * Handle native color input changes
   * @param {Event} event
   * @private
   */
  _handleNativeColorInput(event) {
    const color = event.target.value;
    this.setColor(color);
    this._closePopover();
  }

  /**
   * Toggle popover visibility
   * @private
   */
  _togglePopover() {
    if (this.isOpen) {
      this._closePopover();
    } else {
      this._openPopover();
    }
  }

  /**
   * Open the color popover
   * @private
   */
  _openPopover() {
    if (this.colorPopover) {
      this.colorPopover.style.display = "block";
      this.isOpen = true;

      // Update native color input to match current color
      if (this.nativeColorInput) {
        this.nativeColorInput.value = this.currentColor;
      }

      // Focus first color swatch for accessibility
      const firstSwatch = this.colorPopover.querySelector(
        ".umig-color-picker-color-swatch",
      );
      if (firstSwatch) {
        firstSwatch.focus();
      }
    }
  }

  /**
   * Close the color popover
   * @private
   */
  _closePopover() {
    if (this.colorPopover) {
      this.colorPopover.style.display = "none";
      this.isOpen = false;
    }
  }

  /**
   * Handle clicks outside the component to close popover
   * @param {Event} event
   * @private
   */
  _handleClickOutside(event) {
    if (
      this.isOpen &&
      this.container &&
      !this.container.contains(event.target)
    ) {
      this._closePopover();
    }
  }

  /**
   * Handle keyboard navigation
   * @param {Event} event
   * @private
   */
  _handleKeydown(event) {
    if (event.key === "Escape" && this.isOpen) {
      this._closePopover();
      if (this.colorButton) {
        this.colorButton.focus();
      }
    }
  }

  /**
   * Set the current color
   * @param {string} color - Hex color value
   * @param {boolean} updateHexInput - Whether to update the hex input field
   */
  setColor(color, updateHexInput = true) {
    if (!this._isValidHexColor(color)) {
      console.warn("[ColorPickerComponent] Invalid color:", color);
      return;
    }

    const previousColor = this.currentColor;
    this.currentColor = color;

    // Update preview
    if (this.colorPreview) {
      this.colorPreview.style.backgroundColor = color;
      this.colorPreview.title = color;
    }

    // Update hex input
    if (updateHexInput && this.hexInput) {
      this.hexInput.value = color;
    }

    // Update native color input
    if (this.nativeColorInput) {
      this.nativeColorInput.value = color;
    }

    // Update validation state
    this._setValidationState(true);

    // Trigger change event if color actually changed
    if (previousColor !== color) {
      this.onChange(color);
      console.log("[ColorPickerComponent] Color changed:", color);
    }
  }

  /**
   * Get the current color
   * @returns {string} Current hex color value
   */
  getColor() {
    return this.currentColor;
  }

  /**
   * Set validation state
   * @param {boolean} isValid
   * @private
   */
  _setValidationState(isValid) {
    this.isValid = isValid;

    // Update visual state
    if (this.hexInput) {
      if (isValid) {
        this.hexInput.classList.remove("umig-color-picker-invalid");
        this.hexInput.classList.add("umig-color-picker-valid");
      } else {
        this.hexInput.classList.remove("umig-color-picker-valid");
        this.hexInput.classList.add("umig-color-picker-invalid");
      }
    }

    // Notify validation change
    this.onValidationChange(isValid);
  }

  /**
   * Validate hex color format
   * @param {string} color
   * @returns {boolean}
   * @private
   */
  _isValidHexColor(color) {
    return this.hexPattern.test(color);
  }

  /**
   * Add component styles
   * @private
   */
  _addStyles() {
    const styleId = "umig-color-picker-styles";

    // Check if styles already exist
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      /* UMIG Color Picker Component Styles */
      .umig-color-picker-wrapper {
        position: relative;
        display: inline-block;
        width: 100%;
      }

      .umig-color-picker-button-wrapper {
        display: flex;
        gap: 8px;
        align-items: center;
        width: 100%;
      }

      .umig-color-picker-button {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 8px;
        border: 1px solid #dfe1e6;
        border-radius: 3px;
        background: #ffffff;
        cursor: pointer;
        min-width: 60px;
        height: 36px;
        transition: all 0.2s ease;
      }

      .umig-color-picker-button:hover {
        border-color: #b3bac5;
        background: #f4f5f7;
      }

      .umig-color-picker-button:focus {
        outline: 2px solid #0052cc;
        outline-offset: 2px;
        border-color: #0052cc;
      }

      .umig-color-picker-preview {
        width: 20px;
        height: 20px;
        border-radius: 2px;
        border: 1px solid #c1c7d0;
        flex-shrink: 0;
      }

      .umig-color-picker-chevron {
        color: #5e6c84;
        font-size: 10px;
        line-height: 1;
      }

      .umig-color-picker-hex-input {
        flex: 1;
        padding: 6px 8px;
        border: 1px solid #dfe1e6;
        border-radius: 3px;
        font-family: monospace;
        font-size: 13px;
        min-width: 80px;
        height: 36px;
        box-sizing: border-box;
      }

      .umig-color-picker-hex-input:focus {
        outline: 2px solid #0052cc;
        outline-offset: 2px;
        border-color: #0052cc;
      }

      .umig-color-picker-hex-input.umig-color-picker-invalid {
        border-color: #ff5630;
        background: #ffebe6;
      }

      .umig-color-picker-hex-input.umig-color-picker-valid {
        border-color: #36b37e;
        background: #e3fcef;
      }

      .umig-color-picker-popover {
        position: absolute;
        top: 100%;
        left: 0;
        z-index: 1000;
        margin-top: 4px;
        background: #ffffff;
        border: 1px solid #dfe1e6;
        border-radius: 4px;
        box-shadow: 0 4px 8px rgba(9, 30, 66, 0.25);
        min-width: 240px;
      }

      .umig-color-picker-content {
        padding: 16px;
      }

      .umig-color-picker-header {
        margin: 0 0 12px 0;
      }

      .umig-color-picker-header h4 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #172b4d;
      }

      .umig-color-picker-section-label {
        display: block;
        font-size: 12px;
        font-weight: 600;
        color: #5e6c84;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .umig-color-picker-grid {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 4px;
        margin-bottom: 16px;
      }

      .umig-color-picker-color-swatch {
        width: 24px;
        height: 24px;
        border: 1px solid #c1c7d0;
        border-radius: 2px;
        cursor: pointer;
        transition: all 0.2s ease;
        padding: 0;
      }

      .umig-color-picker-color-swatch:hover {
        border-color: #0052cc;
        transform: scale(1.1);
        box-shadow: 0 2px 4px rgba(9, 30, 66, 0.25);
      }

      .umig-color-picker-color-swatch:focus {
        outline: 2px solid #0052cc;
        outline-offset: 2px;
        border-color: #0052cc;
      }

      .umig-color-picker-custom {
        border-top: 1px solid #f4f5f7;
        padding-top: 12px;
      }

      .umig-color-picker-custom-wrapper {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .umig-color-picker-native {
        width: 32px;
        height: 32px;
        border: 1px solid #dfe1e6;
        border-radius: 3px;
        cursor: pointer;
        padding: 0;
        background: none;
      }

      .umig-color-picker-native:focus {
        outline: 2px solid #0052cc;
        outline-offset: 2px;
      }

      .umig-color-picker-custom-label {
        font-size: 13px;
        color: #42526e;
      }

      /* Responsive adjustments */
      @media (max-width: 480px) {
        .umig-color-picker-popover {
          left: 50%;
          transform: translateX(-50%);
          min-width: 200px;
        }

        .umig-color-picker-grid {
          grid-template-columns: repeat(6, 1fr);
        }
      }
    `;

    document.head.appendChild(style);
    console.log("[ColorPickerComponent] Styles added");
  }

  /**
   * Unmount the component
   * @returns {Promise<boolean>}
   */
  async unmount() {
    try {
      console.log("[ColorPickerComponent] Unmounting...");

      // Remove event listeners
      document.removeEventListener("click", this._handleClickOutside);

      // Clear container
      if (this.container) {
        this.container.innerHTML = "";
      }

      // Reset state
      this.mounted = false;
      this.isOpen = false;

      console.log("[ColorPickerComponent] Unmounted successfully");
      return true;
    } catch (error) {
      console.error("[ColorPickerComponent] Unmount failed:", error);
      return false;
    }
  }

  /**
   * Destroy the component
   * @returns {Promise<boolean>}
   */
  async destroy() {
    try {
      console.log("[ColorPickerComponent] Destroying...");

      await this.unmount();

      // Clear references
      this.container = null;
      this.colorButton = null;
      this.colorPopover = null;
      this.hexInput = null;
      this.nativeColorInput = null;

      this.destroyed = true;
      console.log("[ColorPickerComponent] Destroyed successfully");
      return true;
    } catch (error) {
      console.error("[ColorPickerComponent] Destroy failed:", error);
      return false;
    }
  }

  /**
   * Get component status
   * @returns {Object}
   */
  getStatus() {
    return {
      ...super.getStatus(),
      currentColor: this.currentColor,
      isValid: this.isValid,
      isOpen: this.isOpen,
      predefinedColorsCount: this.predefinedColors.length,
    };
  }
}

// Register component globally
window.ColorPickerComponent = ColorPickerComponent;

console.log("[ColorPickerComponent] Class defined and registered globally");
