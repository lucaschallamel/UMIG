/**
 * UI Utilities Module
 *
 * Provides utility functions for UI operations including notifications,
 * loading states, error handling, and DOM manipulation.
 */

(function () {
  "use strict";

  // UI Utilities
  const UiUtils = {
    /**
     * Show notification message
     * @param {string} message - The notification message
     * @param {string} type - The notification type ('info', 'success', 'error', 'warning')
     * @param {number} duration - Duration in milliseconds (default: 3000)
     */
    showNotification: function (message, type = "info", duration = 3000) {
      // Create notification element
      const notification = document.createElement("div");
      notification.className = `notification notification-${type}`;
      notification.textContent = message;
      notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                background: ${type === "success" ? "#00875A" : type === "error" ? "#DE350B" : type === "warning" ? "#FFAB00" : "#0052CC"};
                color: white;
                border-radius: 4px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                z-index: 10000;
                animation: slideIn 0.3s ease-out;
                max-width: 400px;
                word-wrap: break-word;
            `;

      document.body.appendChild(notification);

      // Remove after specified duration
      setTimeout(() => {
        notification.style.animation = "slideOut 0.3s ease-out";
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }, duration);
    },

    /**
     * Show loading state
     * @param {HTMLElement} container - The container element
     * @param {string} message - Optional loading message
     */
    showLoading: function (container, message = "Loading...") {
      const loadingHtml = `
                <div class="loading-container">
                    <div class="loading-content">
                        <div class="loading-spinner"></div>
                        <p class="loading-message">${message}</p>
                    </div>
                </div>
            `;
      container.innerHTML = loadingHtml;
    },

    /**
     * Show error state
     * @param {HTMLElement} container - The container element
     * @param {string} message - Error message
     * @param {Function} retryCallback - Optional retry callback
     */
    showError: function (container, message, retryCallback = null) {
      const retryButton = retryCallback
        ? `<button class="btn-primary" onclick="(${retryCallback.toString()})()">Try Again</button>`
        : "";

      const errorHtml = `
                <div class="error-container">
                    <div class="error-icon">⚠️</div>
                    <h3>Error</h3>
                    <p>${message}</p>
                    ${retryButton}
                </div>
            `;
      container.innerHTML = errorHtml;
    },

    /**
     * Show empty state
     * @param {HTMLElement} container - The container element
     * @param {string} message - Empty state message
     * @param {string} actionText - Optional action button text
     * @param {Function} actionCallback - Optional action callback
     */
    showEmptyState: function (
      container,
      message,
      actionText = null,
      actionCallback = null,
    ) {
      const actionButton =
        actionText && actionCallback
          ? `<button class="btn-primary" onclick="(${actionCallback.toString()})()">${actionText}</button>`
          : "";

      const emptyHtml = `
                <div class="empty-state">
                    <div class="empty-icon">📄</div>
                    <h3>No Data</h3>
                    <p>${message}</p>
                    ${actionButton}
                </div>
            `;
      container.innerHTML = emptyHtml;
    },

    /**
     * Format date for display
     * @param {string|Date} date - The date to format
     * @param {boolean} includeTime - Whether to include time
     * @returns {string} Formatted date string
     */
    formatDate: function (date, includeTime = true) {
      if (!date) return "";

      const dateObj = typeof date === "string" ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return "";

      const options = {
        year: "numeric",
        month: "short",
        day: "numeric",
      };

      if (includeTime) {
        options.hour = "2-digit";
        options.minute = "2-digit";
      }

      return dateObj.toLocaleDateString("en-US", options);
    },

    /**
     * Format boolean for display
     * @param {boolean} value - The boolean value
     * @returns {string} Formatted boolean string
     */
    formatBoolean: function (value) {
      return value ? "Yes" : "No";
    },

    /**
     * Format status for display
     * @param {string} status - The status value
     * @returns {string} HTML string with status badge
     */
    formatStatus: function (status) {
      if (!status) return "";

      const statusClass = `status-${status.toLowerCase()}`;
      return `<span class="status-badge ${statusClass}">${status}</span>`;
    },

    /**
     * Create select options from array
     * @param {Array} items - Array of items
     * @param {string} valueField - Field to use for value
     * @param {string} textField - Field to use for text
     * @param {string} placeholder - Placeholder text
     * @returns {string} HTML options string
     */
    createSelectOptions: function (
      items,
      valueField,
      textField,
      placeholder = "Select...",
    ) {
      let options = `<option value="">${placeholder}</option>`;

      if (items && items.length > 0) {
        items.forEach((item) => {
          const value = item[valueField] || "";
          const text = item[textField] || "";
          options += `<option value="${value}">${text}</option>`;
        });
      }

      return options;
    },

    /**
     * Debounce function
     * @param {Function} func - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    debounce: function (func, delay) {
      let timeoutId;
      return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
      };
    },

    /**
     * Sanitize HTML to prevent XSS
     * @param {string} html - HTML string to sanitize
     * @returns {string} Sanitized HTML string
     */
    sanitizeHtml: function (html) {
      const div = document.createElement("div");
      div.textContent = html;
      return div.innerHTML;
    },

    /**
     * Copy text to clipboard
     * @param {string} text - Text to copy
     * @returns {Promise} Promise that resolves when copied
     */
    copyToClipboard: function (text) {
      return navigator.clipboard
        .writeText(text)
        .then(() => {
          this.showNotification("Copied to clipboard", "success");
        })
        .catch((err) => {
          console.error("Failed to copy text: ", err);
          this.showNotification("Failed to copy to clipboard", "error");
        });
    },

    /**
     * Generate unique ID
     * @returns {string} Unique ID
     */
    generateId: function () {
      return "id_" + Math.random().toString(36).substr(2, 9);
    },

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} Whether email is valid
     */
    validateEmail: function (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    },

    /**
     * Validate required field
     * @param {string} value - Value to validate
     * @returns {boolean} Whether value is valid
     */
    validateRequired: function (value) {
      return (
        value !== null && value !== undefined && value.toString().trim() !== ""
      );
    },

    /**
     * Validate field length
     * @param {string} value - Value to validate
     * @param {number} maxLength - Maximum length
     * @returns {boolean} Whether value is valid
     */
    validateLength: function (value, maxLength) {
      return !value || value.length <= maxLength;
    },

    /**
     * Create confirmation dialog
     * @param {string} message - Confirmation message
     * @param {Function} onConfirm - Callback for confirm
     * @param {Function} onCancel - Callback for cancel
     */
    showConfirmDialog: function (message, onConfirm, onCancel = null) {
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay";
      overlay.innerHTML = `
                <div class="modal modal-small">
                    <div class="modal-header">
                        <h3 class="modal-title">Confirm Action</h3>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" id="cancelBtn">Cancel</button>
                        <button class="btn-danger" id="confirmBtn">Confirm</button>
                    </div>
                </div>
            `;

      document.body.appendChild(overlay);

      const confirmBtn = overlay.querySelector("#confirmBtn");
      const cancelBtn = overlay.querySelector("#cancelBtn");

      confirmBtn.addEventListener("click", () => {
        overlay.remove();
        if (onConfirm) onConfirm();
      });

      cancelBtn.addEventListener("click", () => {
        overlay.remove();
        if (onCancel) onCancel();
      });

      // Close on overlay click
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          overlay.remove();
          if (onCancel) onCancel();
        }
      });
    },

    /**
     * Get form data as object
     * @param {HTMLFormElement} form - Form element
     * @returns {Object} Form data as object
     */
    getFormData: function (form) {
      const formData = new FormData(form);
      const data = {};

      for (let [key, value] of formData.entries()) {
        data[key] = value;
      }

      return data;
    },

    /**
     * Set form data from object
     * @param {HTMLFormElement} form - Form element
     * @param {Object} data - Data object
     */
    setFormData: function (form, data) {
      if (!form || !data) return;

      Object.keys(data).forEach((key) => {
        const field = form.querySelector(`[name="${key}"]`);
        if (field) {
          if (field.type === "checkbox") {
            field.checked = data[key];
          } else if (field.type === "radio") {
            const radioField = form.querySelector(
              `[name="${key}"][value="${data[key]}"]`,
            );
            if (radioField) radioField.checked = true;
          } else {
            field.value = data[key] || "";
          }
        }
      });
    },

    /**
     * Clear form data
     * @param {HTMLFormElement} form - Form element
     */
    clearForm: function (form) {
      if (!form) return;

      const fields = form.querySelectorAll("input, select, textarea");
      fields.forEach((field) => {
        if (field.type === "checkbox" || field.type === "radio") {
          field.checked = false;
        } else {
          field.value = "";
        }
      });
    },

    /**
     * Get contrast color (black or white) based on background color
     * @param {string} hexColor - Hex color code
     * @returns {string} '#000000' for dark text or '#FFFFFF' for light text
     */
    getContrastColor: function (hexColor) {
      if (!hexColor) return "#000000";

      // Remove # if present
      const hex = hexColor.replace("#", "");

      // Convert to RGB
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);

      // Calculate luminance using W3C formula
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      // Return black for light colors, white for dark colors
      return luminance > 0.5 ? "#000000" : "#FFFFFF";
    },
  };

  // Export to global namespace
  window.UiUtils = UiUtils;
})();
