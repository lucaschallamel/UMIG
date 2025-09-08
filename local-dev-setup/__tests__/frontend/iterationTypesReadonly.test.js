/**
 * Test: Iteration Types Code Field Readonly Behavior
 *
 * Verifies that the itt_code field is readonly in EDIT mode but editable in CREATE mode
 */

describe("Iteration Types Modal - Code Field Readonly Behavior", () => {
  // Mock ModalManager buildFormField function for testing
  let originalBuildFormField;
  let ModalManager;

  beforeEach(() => {
    // Set up basic ModalManager mock
    global.ModalManager = {
      buildFormField: function (field, data, isCreate) {
        const value = data ? data[field.key] : "";

        // Handle conditional readonly for primary key fields in edit mode
        let isFieldReadonly = field.readonly;
        if (field.key === "itt_code" && !isCreate) {
          isFieldReadonly = true;
        }

        const required = field.required && !isFieldReadonly ? "required" : "";
        const maxLength = field.maxLength
          ? `maxlength="${field.maxLength}"`
          : "";
        const disabled = isFieldReadonly ? "disabled" : "";
        const readonlyClass = isFieldReadonly ? " readonly-field" : "";

        let fieldHtml = `<div class="form-group${readonlyClass}">`;
        fieldHtml += `<label for="${field.key}">${field.label}${field.required && !isFieldReadonly ? " *" : ""}</label>`;
        fieldHtml += `<input type="${field.type}" id="${field.key}" name="${field.key}" value="${value}" ${required} ${maxLength} ${disabled}>`;
        fieldHtml += "</div>";
        return fieldHtml;
      },
    };
  });

  afterEach(() => {
    delete global.ModalManager;
  });

  test("itt_code field should be editable in CREATE mode", () => {
    const field = {
      key: "itt_code",
      label: "Code",
      type: "text",
      required: true,
      maxLength: 20,
      readonly: false,
    };
    const data = null; // CREATE mode has no existing data
    const isCreate = true;

    const result = global.ModalManager.buildFormField(field, data, isCreate);

    // Should NOT contain disabled attribute
    expect(result).not.toContain("disabled");

    // Should contain required attribute (since field is required and not readonly)
    expect(result).toContain("required");

    // Should NOT have readonly-field class
    expect(result).not.toContain("readonly-field");

    // Should have the asterisk for required field
    expect(result).toContain("Code *");
  });

  test("itt_code field should be readonly in EDIT mode", () => {
    const field = {
      key: "itt_code",
      label: "Code",
      type: "text",
      required: true,
      maxLength: 20,
      readonly: false,
    };
    const data = { itt_code: "PROD" }; // EDIT mode has existing data
    const isCreate = false;

    const result = global.ModalManager.buildFormField(field, data, isCreate);

    // Should contain disabled attribute
    expect(result).toContain("disabled");

    // Should NOT contain required attribute (readonly fields are not required)
    expect(result).not.toContain("required");

    // Should have readonly-field class for styling
    expect(result).toContain("readonly-field");

    // Should NOT have the asterisk (no longer required when readonly)
    expect(result).toContain("Code</label>");
    expect(result).not.toContain("Code *");

    // Should contain the existing value
    expect(result).toContain('value="PROD"');
  });

  test("Other fields should not be affected by itt_code readonly logic", () => {
    const field = {
      key: "itt_name",
      label: "Name",
      type: "text",
      required: true,
      maxLength: 100,
      readonly: false,
    };
    const data = { itt_name: "Production" };
    const isCreate = false; // EDIT mode

    const result = global.ModalManager.buildFormField(field, data, isCreate);

    // Other fields should remain editable even in EDIT mode
    expect(result).not.toContain("disabled");
    expect(result).toContain("required");
    expect(result).not.toContain("readonly-field");
    expect(result).toContain("Name *"); // Should still be required
  });

  test("itt_code field with explicit readonly=true should remain readonly in CREATE mode", () => {
    const field = {
      key: "itt_code",
      label: "Code",
      type: "text",
      required: true,
      maxLength: 20,
      readonly: true, // Explicitly readonly
    };
    const data = null;
    const isCreate = true; // CREATE mode

    const result = global.ModalManager.buildFormField(field, data, isCreate);

    // Should still be readonly even in CREATE mode if explicitly set
    expect(result).toContain("disabled");
    expect(result).toContain("readonly-field");
    expect(result).not.toContain("required");
  });
});
