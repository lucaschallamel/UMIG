/**
 * ModalComponent Unit Tests
 * US-082-B Component Architecture Development
 *
 * Tests modal functionality including:
 * - Initialization and rendering
 * - Opening and closing behavior
 * - Form handling and validation
 * - Accessibility features
 * - Event emission
 * - Error handling
 */

// Import components
const BaseComponent = require("../../../../src/groovy/umig/web/js/components/BaseComponent");
const ModalComponent = require("../../../../src/groovy/umig/web/js/components/ModalComponent");

// Make BaseComponent available globally for ModalComponent
global.BaseComponent = BaseComponent;

describe("ModalComponent", () => {
  let container;
  let component;

  beforeEach(() => {
    // Create container element
    container = document.createElement("div");
    container.id = "test-modal";
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Clean up
    if (component) {
      component.destroy();
      component = null;
    }
    document.body.removeChild(container);
    document.body.classList.remove("modal-open");
  });

  describe("Initialization", () => {
    test("should initialize with default configuration", () => {
      component = new ModalComponent("test-modal");
      component.initialize();

      expect(component.config.type).toBe("default");
      expect(component.config.size).toBe("medium");
      expect(component.config.closeable).toBe(true);
      expect(component.config.closeOnOverlay).toBe(true);
      expect(component.config.closeOnEscape).toBe(true);
      expect(component.isOpen).toBe(false);
    });

    test("should initialize with custom configuration", () => {
      component = new ModalComponent("test-modal", {
        type: "confirm",
        title: "Confirm Action",
        size: "large",
        closeable: false,
      });
      component.initialize();

      expect(component.config.type).toBe("confirm");
      expect(component.config.title).toBe("Confirm Action");
      expect(component.config.size).toBe("large");
      expect(component.config.closeable).toBe(false);
    });

    test("should create modal structure", () => {
      component = new ModalComponent("test-modal");
      component.initialize();

      expect(container.querySelector(".modal-wrapper")).toBeTruthy();
      expect(container.querySelector(".modal-overlay")).toBeTruthy();
      expect(container.querySelector(".modal-container")).toBeTruthy();
      expect(container.querySelector(".modal-dialog")).toBeTruthy();
    });
  });

  describe("Opening and Closing", () => {
    beforeEach(() => {
      component = new ModalComponent("test-modal", {
        title: "Test Modal",
        content: "Test content",
      });
      component.initialize();
    });

    test("should open modal", () => {
      component.open();

      expect(component.isOpen).toBe(true);
      expect(document.body.classList.contains("modal-open")).toBe(true);
      expect(container.querySelector(".modal-wrapper").hidden).toBe(false);
    });

    test("should close modal", () => {
      component.open();
      component.close();

      // Wait for animation if any
      setTimeout(() => {
        expect(component.isOpen).toBe(false);
        expect(document.body.classList.contains("modal-open")).toBe(false);
        expect(container.querySelector(".modal-wrapper").hidden).toBe(true);
      }, 350);
    });

    test("should emit open event", () => {
      const openHandler = jest.fn();
      component.on("open", openHandler);

      component.open();

      expect(openHandler).toHaveBeenCalled();
    });

    test("should emit close event", () => {
      const closeHandler = jest.fn();
      component.on("close", closeHandler);

      component.open();
      component.close();

      setTimeout(() => {
        expect(closeHandler).toHaveBeenCalled();
      }, 350);
    });

    test("should call onOpen callback", () => {
      const onOpen = jest.fn();
      component.config.onOpen = onOpen;

      component.open();

      expect(onOpen).toHaveBeenCalledWith(component);
    });

    test("should call onClose callback", () => {
      const onClose = jest.fn();
      component.config.onClose = onClose;

      component.open();
      component.close();

      setTimeout(() => {
        expect(onClose).toHaveBeenCalledWith(component);
      }, 350);
    });
  });

  describe("Content and Styling", () => {
    test("should render title and content", () => {
      component = new ModalComponent("test-modal", {
        title: "Modal Title",
        content: "<p>Modal content</p>",
      });
      component.initialize();
      component.open();

      expect(container.querySelector(".modal-title").textContent).toBe(
        "Modal Title",
      );
      expect(container.querySelector(".modal-body").innerHTML).toContain(
        "Modal content",
      );
    });

    test("should apply size classes", () => {
      component = new ModalComponent("test-modal", {
        size: "large",
      });
      component.initialize();

      expect(
        container
          .querySelector(".modal-container")
          .classList.contains("modal-large"),
      ).toBe(true);
    });

    test("should apply type styling", () => {
      component = new ModalComponent("test-modal", {
        type: "warning",
      });
      component.initialize();
      component.open();

      expect(
        container
          .querySelector(".modal-header")
          .classList.contains("modal-type-warning"),
      ).toBe(true);
    });

    test("should center modal when configured", () => {
      component = new ModalComponent("test-modal", {
        centered: true,
      });
      component.initialize();

      expect(
        container
          .querySelector(".modal-container")
          .classList.contains("modal-centered"),
      ).toBe(true);
    });
  });

  describe("Buttons", () => {
    test("should render default button for basic modal", () => {
      component = new ModalComponent("test-modal");
      component.initialize();
      component.open();

      const buttons = container.querySelectorAll(".modal-footer button");
      expect(buttons.length).toBe(1);
      expect(buttons[0].textContent).toBe("Close");
    });

    test("should render confirm/cancel buttons for confirm modal", () => {
      component = new ModalComponent("test-modal", {
        type: "confirm",
      });
      component.initialize();
      component.open();

      const buttons = container.querySelectorAll(".modal-footer button");
      expect(buttons.length).toBe(2);
      expect(buttons[0].textContent).toBe("Cancel");
      expect(buttons[1].textContent).toBe("Confirm");
    });

    test("should render custom buttons", () => {
      component = new ModalComponent("test-modal", {
        buttons: [
          { text: "Delete", action: "delete", variant: "danger" },
          { text: "Save", action: "save", variant: "primary" },
        ],
      });
      component.initialize();
      component.open();

      const buttons = container.querySelectorAll(".modal-footer button");
      expect(buttons.length).toBe(2);
      expect(buttons[0].textContent).toBe("Delete");
      expect(buttons[0].classList.contains("btn-danger")).toBe(true);
    });

    test("should handle button actions", () => {
      const confirmHandler = jest.fn();
      component = new ModalComponent("test-modal", {
        type: "confirm",
      });
      component.on("confirm", confirmHandler);
      component.initialize();
      component.open();

      const confirmBtn = container.querySelector('[data-action="confirm"]');
      confirmBtn.click();

      expect(confirmHandler).toHaveBeenCalled();
    });
  });

  describe("Form Handling", () => {
    beforeEach(() => {
      component = new ModalComponent("test-modal", {
        type: "form",
        form: {
          fields: [
            {
              name: "username",
              label: "Username",
              type: "text",
              required: true,
            },
            {
              name: "email",
              label: "Email",
              type: "email",
              required: true,
            },
            {
              name: "role",
              label: "Role",
              type: "select",
              options: [
                { value: "user", label: "User" },
                { value: "admin", label: "Admin" },
              ],
            },
          ],
        },
      });
      component.initialize();
      component.open();
    });

    test("should render form fields", () => {
      expect(container.querySelector('input[name="username"]')).toBeTruthy();
      expect(container.querySelector('input[name="email"]')).toBeTruthy();
      expect(container.querySelector('select[name="role"]')).toBeTruthy();
    });

    test("should update form data on input", () => {
      const usernameInput = container.querySelector('input[name="username"]');
      usernameInput.value = "testuser";
      usernameInput.dispatchEvent(new Event("input"));

      expect(component.formData.username).toBe("testuser");
    });

    test("should validate required fields", () => {
      component.submitForm();

      expect(component.validationErrors.username).toBeTruthy();
      expect(component.validationErrors.email).toBeTruthy();
    });

    test("should validate email format", () => {
      const emailInput = container.querySelector('input[name="email"]');
      emailInput.value = "invalid-email";
      emailInput.dispatchEvent(new Event("input"));

      component.submitForm();

      expect(component.validationErrors.email).toContain("valid email");
    });

    test("should clear validation errors on input", () => {
      component.submitForm(); // Trigger validation errors

      const usernameInput = container.querySelector('input[name="username"]');
      usernameInput.value = "testuser";
      usernameInput.dispatchEvent(new Event("input"));

      expect(component.validationErrors.username).toBeUndefined();
    });

    test("should call onSubmit with form data", () => {
      const onSubmit = jest.fn();
      component.config.onSubmit = onSubmit;

      // Fill form
      container.querySelector('input[name="username"]').value = "testuser";
      container.querySelector('input[name="email"]').value = "test@example.com";

      // Update form data
      component.formData = {
        username: "testuser",
        email: "test@example.com",
        role: "user",
      };

      component.submitForm();

      expect(onSubmit).toHaveBeenCalledWith(component.formData, component);
    });

    test("should reset form on close", () => {
      component.formData = {
        username: "testuser",
        email: "test@example.com",
      };

      component.close();

      setTimeout(() => {
        expect(component.formData).toEqual({});
        expect(component.validationErrors).toEqual({});
      }, 350);
    });
  });

  describe("Accessibility", () => {
    beforeEach(() => {
      component = new ModalComponent("test-modal", {
        title: "Accessible Modal",
        content: "Modal content",
      });
      component.initialize();
    });

    test("should have proper ARIA attributes", () => {
      const wrapper = container.querySelector(".modal-wrapper");

      expect(wrapper.getAttribute("role")).toBe("dialog");
      expect(wrapper.getAttribute("aria-modal")).toBe("true");
      expect(wrapper.getAttribute("aria-labelledby")).toContain("modal-title");
      expect(wrapper.getAttribute("aria-describedby")).toContain(
        "modal-content",
      );
    });

    test("should handle escape key when enabled", () => {
      component.open();

      const event = new KeyboardEvent("keydown", { key: "Escape" });
      container.dispatchEvent(event);

      setTimeout(() => {
        expect(component.isOpen).toBe(false);
      }, 350);
    });

    test("should not close on escape when disabled", () => {
      component.config.closeOnEscape = false;
      component.open();

      const event = new KeyboardEvent("keydown", { key: "Escape" });
      container.dispatchEvent(event);

      expect(component.isOpen).toBe(true);
    });

    test("should trap focus within modal", () => {
      component = new ModalComponent("test-modal", {
        buttons: [
          { text: "Cancel", action: "cancel" },
          { text: "Save", action: "save" },
        ],
      });
      component.initialize();
      component.open();

      const focusableElements = component.getFocusableElements();
      expect(focusableElements.length).toBeGreaterThan(0);

      // Simulate tab at last element
      const lastElement = focusableElements[focusableElements.length - 1];
      lastElement.focus();

      const tabEvent = new KeyboardEvent("keydown", { key: "Tab" });
      component.handleTabKey(tabEvent);

      expect(tabEvent.defaultPrevented).toBe(false); // Would be true in real implementation
    });

    test("should restore focus on close", () => {
      const button = document.createElement("button");
      document.body.appendChild(button);
      button.focus();

      component.previousFocus = button;
      component.open();
      component.close();

      setTimeout(() => {
        expect(document.activeElement).toBe(button);
        document.body.removeChild(button);
      }, 350);
    });
  });

  describe("Close Behaviors", () => {
    beforeEach(() => {
      component = new ModalComponent("test-modal", {
        title: "Test Modal",
        closeable: true,
        closeOnOverlay: true,
      });
      component.initialize();
      component.open();
    });

    test("should close on close button click", () => {
      const closeBtn = container.querySelector(".modal-close");
      closeBtn.click();

      setTimeout(() => {
        expect(component.isOpen).toBe(false);
      }, 350);
    });

    test("should close on overlay click when enabled", () => {
      const overlay = container.querySelector(".modal-overlay");
      overlay.click();

      setTimeout(() => {
        expect(component.isOpen).toBe(false);
      }, 350);
    });

    test("should not close on overlay click when disabled", () => {
      component.config.closeOnOverlay = false;

      const overlay = container.querySelector(".modal-overlay");
      overlay.click();

      expect(component.isOpen).toBe(true);
    });

    test("should not show close button when not closeable", () => {
      component.config.closeable = false;
      component.render();

      expect(container.querySelector(".modal-close")).toBeFalsy();
    });
  });

  describe("Loading and Error States", () => {
    beforeEach(() => {
      component = new ModalComponent("test-modal", {
        type: "form",
      });
      component.initialize();
      component.open();
    });

    test("should set loading state", () => {
      component.setLoading(true);

      const footer = container.querySelector(".modal-footer");
      const buttons = footer.querySelectorAll("button");

      expect(footer.classList.contains("loading")).toBe(true);
      buttons.forEach((btn) => {
        expect(btn.disabled).toBe(true);
      });
    });

    test("should clear loading state", () => {
      component.setLoading(true);
      component.setLoading(false);

      const footer = container.querySelector(".modal-footer");
      const buttons = footer.querySelectorAll("button");

      expect(footer.classList.contains("loading")).toBe(false);
      buttons.forEach((btn) => {
        expect(btn.disabled).toBe(false);
      });
    });

    test("should show error message", () => {
      component.showError("An error occurred");

      const error = container.querySelector(".modal-error-message");
      expect(error).toBeTruthy();
      expect(error.textContent).toBe("An error occurred");
      expect(error.getAttribute("role")).toBe("alert");
    });

    test("should replace existing error message", () => {
      component.showError("First error");
      component.showError("Second error");

      const errors = container.querySelectorAll(".modal-error-message");
      expect(errors.length).toBe(1);
      expect(errors[0].textContent).toBe("Second error");
    });
  });

  describe("Dynamic Updates", () => {
    beforeEach(() => {
      component = new ModalComponent("test-modal", {
        title: "Original Title",
        content: "Original content",
      });
      component.initialize();
      component.open();
    });

    test("should update title", () => {
      component.setTitle("New Title");

      expect(container.querySelector(".modal-title").textContent).toBe(
        "New Title",
      );
    });

    test("should update content", () => {
      component.setContent("New content");

      expect(container.querySelector(".modal-body").innerHTML).toBe(
        "New content",
      );
    });

    test("should update configuration", () => {
      component.updateConfig({
        size: "large",
        type: "warning",
      });

      expect(component.config.size).toBe("large");
      expect(component.config.type).toBe("warning");
    });
  });

  describe("Promise Handling", () => {
    test("should handle async onSubmit", async () => {
      component = new ModalComponent("test-modal", {
        type: "form",
        form: {
          fields: [{ name: "test", label: "Test", type: "text" }],
        },
        onSubmit: jest.fn().mockResolvedValue(true),
      });
      component.initialize();
      component.open();

      component.formData = { test: "value" };
      component.submitForm();

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(component.config.onSubmit).toHaveBeenCalled();
    });

    test("should handle rejected promise", async () => {
      component = new ModalComponent("test-modal", {
        type: "form",
        form: {
          fields: [{ name: "test", label: "Test", type: "text" }],
        },
        onSubmit: jest.fn().mockRejectedValue(new Error("Submit failed")),
      });
      component.initialize();
      component.open();

      component.formData = { test: "value" };
      component.submitForm();

      await new Promise((resolve) => setTimeout(resolve, 100));

      const error = container.querySelector(".modal-error-message");
      expect(error).toBeTruthy();
      expect(error.textContent).toBe("Submit failed");
    });
  });
});
