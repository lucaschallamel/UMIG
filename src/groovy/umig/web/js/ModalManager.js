/**
 * Modal Manager Module
 *
 * Handles modal dialogs for viewing, editing, and creating entities,
 * including form generation, validation, and submission.
 */

(function () {
  "use strict";

  // Modal Manager
  const ModalManager = {
    /**
     * Initialize modal manager
     */
    init: function () {
      this.bindEvents();
    },

    /**
     * Bind modal-related events
     */
    bindEvents: function () {
      // Modal close events
      document.addEventListener("click", (e) => {
        if (
          e.target.matches(".modal-close") ||
          e.target.matches(".modal-overlay")
        ) {
          this.closeModal();
        }
      });

      // Form submission
      document.addEventListener("submit", (e) => {
        if (e.target.matches("#entityForm")) {
          this.handleFormSubmit(e);
        }
      });

      // Modal action buttons
      document.addEventListener("click", (e) => {
        if (e.target.matches("#saveEntityBtn")) {
          this.handleSaveEntity();
        }
        if (e.target.matches("#cancelBtn")) {
          this.closeModal();
        }
      });

      // Escape key to close modal
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && this.isModalOpen()) {
          this.closeModal();
        }
      });

      // Date/time picker events
      document.addEventListener("change", (e) => {
        if (
          e.target.matches("input[type='date']") ||
          e.target.matches("input[type='time']")
        ) {
          this.handleDateTimeChange(e);
        }
      });
    },

    /**
     * Show view modal
     * @param {string} id - Entity ID
     */
    showViewModal: function (id) {
      const state = window.AdminGuiState ? window.AdminGuiState.getState() : {};
      const currentEntity = state.currentEntity || "users";

      if (currentEntity === "environments") {
        this.showEnvironmentDetailsModal(id);
      } else if (currentEntity === "teams") {
        this.showTeamViewModal(id);
      } else if (currentEntity === "applications") {
        this.showApplicationViewModal(id);
      } else if (currentEntity === "labels") {
        this.showLabelViewModal(id);
      } else {
        this.showGenericViewModal(id, currentEntity);
      }
    },

    /**
     * Show edit modal
     * @param {string} id - Entity ID (null for create)
     */
    showEditModal: function (id) {
      const state = window.AdminGuiState ? window.AdminGuiState.getState() : {};
      const currentEntity = state.currentEntity || "users";

      if (currentEntity === "environments") {
        this.showEnvironmentEditModal(id);
      } else if (currentEntity === "teams") {
        this.showTeamEditModal(id);
      } else if (currentEntity === "applications") {
        this.showApplicationEditModal(id);
      } else if (currentEntity === "labels") {
        this.showLabelEditModal(id);
      } else {
        if (id) {
          this.loadEntityData(id, currentEntity)
            .then((data) => {
              this.showEntityForm(data, currentEntity, false);
            })
            .catch((error) => {
              console.error("Failed to load entity:", error);
              if (window.UiUtils) {
                window.UiUtils.showNotification(
                  "Failed to load entity data",
                  "error",
                );
              }
            });
        } else {
          this.showEntityForm(null, currentEntity, true);
        }
      }
    },

    /**
     * Show environment details modal
     * @param {string} id - Environment ID
     */
    showEnvironmentDetailsModal: function (id) {
      if (!window.ApiClient) {
        console.error("API client not available");
        return;
      }

      window.ApiClient.environments
        .getById(id)
        .then((environment) => {
          this.renderEnvironmentDetailsModal(environment);
        })
        .catch((error) => {
          console.error("Failed to load environment:", error);
          if (window.UiUtils) {
            window.UiUtils.showNotification(
              "Failed to load environment details",
              "error",
            );
          }
        });
    },

    /**
     * Show generic view modal
     * @param {string} id - Entity ID
     * @param {string} entityType - Entity type
     */
    showGenericViewModal: function (id, entityType) {
      if (!window.ApiClient) {
        console.error("API client not available");
        return;
      }

      window.ApiClient.entities
        .getById(entityType, id)
        .then((entity) => {
          this.renderGenericViewModal(entity, entityType);
        })
        .catch((error) => {
          console.error("Failed to load entity:", error);
          if (window.UiUtils) {
            window.UiUtils.showNotification(
              "Failed to load entity details",
              "error",
            );
          }
        });
    },

    /**
     * Render environment details modal
     * @param {Object} environment - Environment data
     */
    renderEnvironmentDetailsModal: function (environment) {
      // Build applications HTML
      let applicationsHtml = "";
      if (environment.applications && environment.applications.length > 0) {
        applicationsHtml = `
                    <div class="associations-list">
                        ${environment.applications
                          .map(
                            (app) => `
                            <div class="association-item">
                                <strong>${app.app_code}</strong> - ${app.app_name}
                                <div class="app-id">ID: ${app.app_id}</div>
                            </div>
                        `,
                          )
                          .join("")}
                    </div>
                `;
      } else {
        applicationsHtml =
          '<p class="no-associations">No applications associated with this environment.</p>';
      }

      // Build iterations HTML - group by role
      let iterationsHtml = "";
      if (environment.iterations && environment.iterations.length > 0) {
        // Group iterations by role
        const iterationsByRole = {};
        environment.iterations.forEach((iteration) => {
          const roleName = iteration.role_name || "Unknown Role";
          if (!iterationsByRole[roleName]) {
            iterationsByRole[roleName] = {
              role_description: iteration.role_description || "",
              iterations: [],
            };
          }
          iterationsByRole[roleName].iterations.push(iteration);
        });

        iterationsHtml = `
                    <div class="associations-list">
                        ${Object.keys(iterationsByRole)
                          .map(
                            (roleName) => `
                            <div class="role-group">
                                <h5 class="role-header">${roleName}</h5>
                                ${
                                  iterationsByRole[roleName].role_description
                                    ? `<p class="role-description">${iterationsByRole[roleName].role_description}</p>`
                                    : ""
                                }
                                <div class="role-iterations">
                                    ${iterationsByRole[roleName].iterations
                                      .map(
                                        (iteration) => `
                                        <div class="association-item">
                                            <strong>${iteration.ite_name}</strong>
                                            <div class="iteration-id">ID: ${iteration.ite_id}</div>
                                        </div>
                                    `,
                                      )
                                      .join("")}
                                </div>
                            </div>
                        `,
                          )
                          .join("")}
                    </div>
                `;
      } else {
        iterationsHtml =
          '<p class="no-associations">No iterations associated with this environment.</p>';
      }

      const modalHtml = `
                <div class="modal-overlay" id="viewModal">
                    <div class="modal modal-large">
                        <div class="modal-header">
                            <h3 class="modal-title">Environment Details</h3>
                            <button class="modal-close">×</button>
                        </div>
                        <div class="modal-body">
                            <div class="env-details">
                                <div class="detail-section">
                                    <h4>Environment Information</h4>
                                    <p><strong>Code:</strong> ${environment.env_code}</p>
                                    <p><strong>Name:</strong> ${environment.env_name}</p>
                                    <p><strong>Description:</strong> ${environment.env_description || "No description"}</p>
                                </div>
                                
                                <div class="detail-section">
                                    <h4>Associated Applications</h4>
                                    ${applicationsHtml}
                                </div>
                                
                                <div class="detail-section">
                                    <h4>Associated Iterations</h4>
                                    ${iterationsHtml}
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-primary" onclick="ModalManager.showEnvironmentEditModal(${environment.env_id})">Edit Environment</button>
                            <button class="btn-secondary" onclick="ModalManager.closeModal()">Close</button>
                        </div>
                    </div>
                </div>
            `;

      document.body.insertAdjacentHTML("beforeend", modalHtml);
    },

    /**
     * Show environment edit modal
     * @param {string} id - Environment ID (null for create)
     */
    showEnvironmentEditModal: function (id) {
      if (!window.ApiClient) {
        console.error("API client not available");
        return;
      }

      const isCreate = !id;

      if (isCreate) {
        this.renderEnvironmentEditModal(null, true);
      } else {
        // Load environment data with full associations
        window.ApiClient.environments
          .getById(id)
          .then((environment) => {
            this.renderEnvironmentEditModal(environment, false);
          })
          .catch((error) => {
            console.error("Failed to load environment:", error);
            if (window.UiUtils) {
              window.UiUtils.showNotification(
                "Failed to load environment data",
                "error",
              );
            }
          });
      }
    },

    /**
     * Render environment edit modal
     * @param {Object} environment - Environment data (null for create)
     * @param {boolean} isCreate - Whether this is create mode
     */
    renderEnvironmentEditModal: function (environment, isCreate) {
      const modalTitle = isCreate ? "Add Environment" : "Edit Environment";

      // Build basic form fields
      const entityConfig = window.EntityConfig
        ? window.EntityConfig.getEntity("environments")
        : null;
      let formFieldsHtml = "";

      if (entityConfig) {
        formFieldsHtml = this.buildBasicEnvironmentForm(
          environment,
          entityConfig,
          isCreate,
        );
      }

      // Build associations section (only for edit mode)
      let associationsHtml = "";
      if (!isCreate && environment) {
        associationsHtml =
          this.buildEnvironmentAssociationsSection(environment);
      }

      const modalHtml = `
                <div class="modal-overlay" id="editModal">
                    <div class="modal modal-large">
                        <div class="modal-header">
                            <h3 class="modal-title">${modalTitle}</h3>
                            <button class="modal-close">×</button>
                        </div>
                        <div class="modal-body">
                            <div id="environmentFormWrapper">
                                <form id="environmentForm">
                                    ${formFieldsHtml}
                                </form>
                                <div id="associationsWrapper">
                                    ${associationsHtml}
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-secondary" id="cancelBtn">Cancel</button>
                            <button class="btn-primary" id="saveEntityBtn">
                                ${isCreate ? "Create" : "Update"}
                            </button>
                        </div>
                    </div>
                </div>
            `;

      document.body.insertAdjacentHTML("beforeend", modalHtml);

      // Set up event handlers
      this.setupEnvironmentFormHandlers(environment, isCreate);

      // Load dropdown data if editing
      if (!isCreate) {
        this.loadAssociationDropdowns();
      }
    },

    /**
     * Render generic view modal
     * @param {Object} entity - Entity data
     * @param {string} entityType - Entity type
     */
    renderGenericViewModal: function (entity, entityType) {
      const entityConfig = window.EntityConfig
        ? window.EntityConfig.getEntity(entityType)
        : null;
      if (!entityConfig) {
        console.error("Entity configuration not found:", entityType);
        return;
      }

      const detailsHtml = this.buildEntityDetails(entity, entityConfig);

      const modalHtml = `
                <div class="modal-overlay" id="viewModal">
                    <div class="modal modal-large">
                        <div class="modal-header">
                            <h3 class="modal-title">${entityConfig.name} Details</h3>
                            <button class="modal-close">×</button>
                        </div>
                        <div class="modal-body">
                            ${detailsHtml}
                        </div>
                        <div class="modal-footer">
                            <button class="btn-secondary" onclick="ModalManager.closeModal()">Close</button>
                            <button class="btn-primary" onclick="ModalManager.closeModal(); ModalManager.showEditModal('${entity[entityConfig.fields[0].key]}')">Edit</button>
                        </div>
                    </div>
                </div>
            `;

      document.body.insertAdjacentHTML("beforeend", modalHtml);

      // Apply status colors after modal is rendered
      this.waitForModal("viewModal", 2000).then((modal) => {
        if (window.StatusColorService) {
          console.log('✅ Applying status colors to view modal');
          // Map entityType to status entity type
          const statusEntityTypeMap = {
            migrations: "Migration",
            iterations: "Iteration",
            plans: "Plan",
            sequences: "Sequence",
            phases: "Phase",
            steps: "Step",
            instructions: "Instruction",
          };
          const statusEntityType =
            statusEntityTypeMap[entityType] || entityType;
          window.StatusColorService.applyStatusColors(modal, statusEntityType);
        }
      }).catch((error) => {
        console.warn('View modal not ready for status colors:', error);
      });
    },

    /**
     * Build entity details HTML
     * @param {Object} entity - Entity data
     * @param {Object} entityConfig - Entity configuration
     * @returns {string} Details HTML
     */
    buildEntityDetails: function (entity, entityConfig) {
      let detailsHtml = '<div class="entity-details">';

      // Use modalFields if configured, otherwise use all fields
      const fieldsToShow =
        entityConfig.modalFields || entityConfig.fields.map((f) => f.key);
      const fieldLookup = {};
      entityConfig.fields.forEach((field) => {
        fieldLookup[field.key] = field;
      });

      fieldsToShow.forEach((fieldKey) => {
        const field = fieldLookup[fieldKey];
        if (!field) {
          console.warn(
            `Field ${fieldKey} not found in entity configuration for ${entityConfig.name}`,
          );
          return;
        }

        // Skip fields marked as hideInView in VIEW mode
        if (field.hideInView === true) {
          console.log(`Skipping field ${fieldKey} in VIEW mode (hideInView: true)`);
          return;
        }

        const value = entity[field.key];
        const formattedValue = this.formatFieldValue(
          value,
          field,
          entity,
          entityConfig,
        );

        detailsHtml += `
                    <div class="detail-field">
                        <label>${field.label}:</label>
                        <div class="field-value">${formattedValue}</div>
                    </div>
                `;
      });

      detailsHtml += "</div>";
      return detailsHtml;
    },

    /**
     * Show entity form (create or edit)
     * @param {Object} data - Entity data (null for create)
     * @param {string} entityType - Entity type
     * @param {boolean} isCreate - Whether this is create mode
     */
    showEntityForm: function (data, entityType, isCreate) {
      console.log(`🔧 showEntityForm called: entityType=${entityType}, isCreate=${isCreate}, hasData=${!!data}`);
      
      const entityConfig = window.EntityConfig
        ? window.EntityConfig.getEntity(entityType)
        : null;
      if (!entityConfig) {
        console.error("❌ Entity configuration not found:", entityType);
        console.log("Available entity types:", window.EntityConfig ? Object.keys(window.EntityConfig.entities || {}) : "EntityConfig not loaded");
        return;
      }
      
      console.log(`✅ Entity config loaded for: ${entityConfig.name}`);

      const formHtml = this.buildEntityForm(data, entityConfig, isCreate);
      if (!formHtml) {
        console.error("❌ Form HTML generation failed for entity:", entityType);
        return;
      }
      
      const modalTitle = isCreate
        ? `Add ${entityConfig.name.slice(0, -1)}`
        : `Edit ${entityConfig.name.slice(0, -1)}`;

      const modalHtml = `
                <div class="modal-overlay" id="editModal">
                    <div class="modal modal-large">
                        <div class="modal-header">
                            <h3 class="modal-title">${modalTitle}</h3>
                            <button class="modal-close">×</button>
                        </div>
                        <div class="modal-body">
                            ${formHtml}
                        </div>
                        <div class="modal-footer">
                            <button class="btn-secondary" id="cancelBtn">Cancel</button>
                            <button class="btn-primary" id="saveEntityBtn">
                                ${isCreate ? "Create" : "Update"}
                            </button>
                        </div>
                    </div>
                </div>
            `;

      // Remove any existing modals to prevent conflicts
      const existingModal = document.getElementById('editModal');
      if (existingModal) {
        console.log('Removing existing modal to prevent conflicts');
        existingModal.remove();
      }

      // Insert modal HTML
      try {
        document.body.insertAdjacentHTML("beforeend", modalHtml);
        console.log(`📋 Modal HTML inserted for entity: ${entityConfig.name}`);
      } catch (error) {
        console.error('❌ Failed to insert modal HTML:', error);
        if (window.UiUtils) {
          window.UiUtils.showNotification('Error: Failed to create modal', 'error');
        }
        return;
      }

      // Wait for modal to be properly inserted and rendered in DOM
      this.waitForModal('editModal', 5000).then((modal) => {
        console.log(`✅ Modal ready for entity: ${entityConfig.name}`);
        
        // Additional check for form element
        const form = modal.querySelector('#entityForm');
        if (!form) {
          console.error('Form not found in modal - DOM may not be fully ready');
          return;
        }
        
        console.log(`=== Initializing modal for entity: ${entityConfig.name} ===`);
        console.log("Modal fields to render:", entityConfig.modalFields || entityConfig.fields?.map(f => f.key));
        
        try {
          this.populateEntityTypeSelects(entityConfig, data);
        } catch (error) {
          console.error('Error populating entity type selects:', error);
        }

        // Set form data if editing - moved here to ensure DOM is ready
        if (data && !isCreate) {
          console.log(`=== Setting form data for ${entityConfig.name} ===`);
          console.log("Data being set:", data);
          try {
            this.setFormData(data, entityConfig);
          } catch (error) {
            console.error('Error setting form data:', error);
          }
          // Add debugging for datetime fields
          console.log(
            "Setting form data for datetime fields:",
            this.debugDatetimeFields(data, entityConfig),
          );
        }

        // Setup field dependencies after everything is populated
        this.setupFieldDependencies(entityConfig, data);
      }).catch((error) => {
        console.error('Modal readiness timeout - DOM may not be ready:', error);
        if (window.UiUtils) {
          window.UiUtils.showNotification('Error: Modal failed to load properly', 'error');
        }
      });
    },

    /**
     * Build entity form HTML
     * @param {Object} data - Entity data
     * @param {Object} entityConfig - Entity configuration
     * @param {boolean} isCreate - Whether this is create mode
     * @returns {string} Form HTML
     */
    buildEntityForm: function (data, entityConfig, isCreate) {
      let formHtml = '<form id="entityForm">';

      // Use modalFields if configured, otherwise use all fields
      const fieldsToProcess =
        entityConfig.modalFields || entityConfig.fields.map((f) => f.key);
      const fieldLookup = {};
      entityConfig.fields.forEach((field) => {
        fieldLookup[field.key] = field;
      });

      // Debug logging for migrations and iterations entities
      if (
        entityConfig.name === "Migrations" ||
        entityConfig.name === "Iterations"
      ) {
        console.log(`=== ${entityConfig.name} Modal Debug ===`);
        console.log("Entity config:", entityConfig);
        console.log("Data received:", data);
        console.log("Fields to process:", fieldsToProcess);
        console.log("Field lookup:", fieldLookup);
        console.log("Is create mode:", isCreate);

        // Specific debugging for status fields
        if (entityConfig.name === "Iterations" && data) {
          console.log("Iterations status field data:", {
            ite_status: data.ite_status,
            statusType: typeof data.ite_status,
            allDataKeys: Object.keys(data),
          });
        }
      }

      // Readonly fields are now included as visible disabled fields in the form

      // Add association management for environments (only when editing)
      if (entityConfig.name === "Environments" && data && !isCreate) {
        formHtml += `
                    <div class="form-group association-management">
                        <label>Manage Associations</label>
                        <div class="association-buttons">
                            <button type="button" class="btn-primary" onclick="adminGui.showAssociateApplicationModal(${data.env_id})">
                                Associate Application
                            </button>
                            <button type="button" class="btn-primary" onclick="adminGui.showAssociateIterationModal(${data.env_id})">
                                Associate Iteration
                            </button>
                        </div>
                    </div>
                `;
      }

      // Add visible form fields (respecting modalFields configuration)
      fieldsToProcess.forEach((fieldKey) => {
        const field = fieldLookup[fieldKey];
        if (
          entityConfig.name === "Migrations" ||
          entityConfig.name === "Iterations"
        ) {
          console.log(`Processing field ${fieldKey}:`, {
            field: field,
            exists: !!field,
            type: field?.type,
            computed: field?.computed,
            readonly: field?.readonly,
            dataValue: data?.[fieldKey],
            hasOptions: !!field?.options,
            options: field?.options,
          });
        }
        if (field && !field.computed) {
          // Skip fields marked as hideInEdit in EDIT mode
          if (!isCreate && field.hideInEdit === true) {
            console.log(`Skipping field ${fieldKey} in EDIT mode (hideInEdit: true)`);
            return;
          }
          // Include readonly fields as visible disabled fields, and editable fields as normal
          formHtml += this.buildFormField(field, data, isCreate);
        }
      });

      formHtml += "</form>";
      return formHtml;
    },

    /**
     * Build form field HTML
     * @param {Object} field - Field configuration
     * @param {Object} data - Entity data
     * @param {boolean} isCreate - Whether this is create mode (affects readonly field handling)
     * @returns {string} Field HTML
     */
    buildFormField: function (field, data, isCreate) {
      const value = data ? data[field.key] : "";
      const required = field.required && !field.readonly ? "required" : "";
      const maxLength = field.maxLength ? `maxlength="${field.maxLength}"` : "";
      const disabled = field.readonly ? "disabled" : "";
      const readonlyClass = field.readonly ? " readonly-field" : "";

      let fieldHtml = `<div class="form-group${readonlyClass}">`;
      fieldHtml += `<label for="${field.key}">${field.label}${field.required && !field.readonly ? " *" : ""}</label>`;

      switch (field.type) {
        case "text":
        case "email":
          fieldHtml += `<input type="${field.type}" id="${field.key}" name="${field.key}" value="${value}" ${required} ${maxLength} ${disabled}>`;
          break;

        case "textarea":
          fieldHtml += `<textarea id="${field.key}" name="${field.key}" ${required} ${maxLength} ${disabled}>${value}</textarea>`;
          break;

        case "boolean":
          const checked =
            value === true || value === "true" || value === 1 ? "checked" : "";
          fieldHtml += `<label class="checkbox-label"><input type="checkbox" id="${field.key}" name="${field.key}" ${checked} ${disabled}> ${field.label}</label>`;
          break;

        case "select":
          fieldHtml += `<select id="${field.key}" name="${field.key}" ${required} ${disabled}>`;
          if (field.options) {
            console.log(
              `Building select field ${field.key} with value:`,
              value,
              "and options:",
              field.options.map((opt) => ({
                value: opt.value,
                label: opt.label,
              })),
            );
            field.options.forEach((option) => {
              const selected =
                value === option.value ||
                (value == null && option.value == null)
                  ? "selected"
                  : "";
              const optionValue = option.value === null ? "" : option.value;
              if (selected) {
                console.log(
                  `Pre-selecting option for ${field.key}:`,
                  option.value,
                  "(",
                  option.label,
                  ")",
                );
              }
              fieldHtml += `<option value="${optionValue}" ${selected}>${option.label}</option>`;
            });
          } else if (field.entityType) {
            // Entity-type select - will be populated dynamically
            fieldHtml += `<option value="">Loading...</option>`;
          }
          fieldHtml += `</select>`;

          // Add data attributes for entity-type selects
          if (field.entityType) {
            // Replace the select opening tag to add data attributes
            fieldHtml = fieldHtml.replace(
              `<select id="${field.key}" name="${field.key}" ${required} ${disabled}>`,
              `<select id="${field.key}" name="${field.key}" ${required} ${disabled} data-entity-type="${field.entityType}" data-display-field="${field.displayField}" data-value-field="${field.valueField}">`,
            );
          }
          break;

        case "number":
          fieldHtml += `<input type="number" id="${field.key}" name="${field.key}" value="${value}" ${required} ${disabled}>`;
          break;

        case "color":
          fieldHtml += `<input type="color" id="${field.key}" name="${field.key}" value="${value || "#000000"}" ${required} ${disabled}>`;
          break;

        case "date":
          // Convert ISO datetime to date-only format for HTML5 date input
          let dateValue = "";
          if (value) {
            try {
              const dateObj = new Date(value);
              if (!isNaN(dateObj.getTime())) {
                dateValue = dateObj.toISOString().split("T")[0];
              }
            } catch (e) {
              console.warn(`Invalid date value for ${field.key}:`, value);
            }
          }
          fieldHtml += `
            <div class="date-picker-group">
              <input type="date" id="${field.key}" name="${field.key}" value="${dateValue}" ${required} ${disabled}>
            </div>`;
          break;

        case "datetime":
          // For datetime fields, use a similar approach but show both date and time
          let dtValue = "";
          let dtDate = "";
          let dtTime = "00:00";
          if (value) {
            try {
              const dateObj = new Date(value);
              if (!isNaN(dateObj.getTime())) {
                dtDate = dateObj.toISOString().split("T")[0];
                // Use UTC time instead of local time to match backend format
                dtTime = `${dateObj.getUTCHours().toString().padStart(2, "0")}:${dateObj.getUTCMinutes().toString().padStart(2, "0")}`;
                dtValue = value;
              }
            } catch (e) {
              console.warn(`Invalid datetime value for ${field.key}:`, value);
            }
          }
          fieldHtml += `
            <div class="date-time-picker-group">
              <input type="date" id="${field.key}_date" name="${field.key}_date" value="${dtDate}" ${required} ${disabled}>
              <input type="time" id="${field.key}_time" name="${field.key}_time" value="${dtTime}" ${required} ${disabled}>
              <input type="hidden" id="${field.key}" name="${field.key}" value="${dtValue}">
            </div>`;
          break;

        default:
          fieldHtml += `<input type="text" id="${field.key}" name="${field.key}" value="${value}" ${required} ${maxLength} ${disabled}>`;
      }

      if (field.maxLength) {
        fieldHtml += `<small class="form-help">Maximum ${field.maxLength} characters</small>`;
      }

      fieldHtml += "</div>";
      return fieldHtml;
    },

    /**
     * Set form data
     * @param {Object} data - Entity data
     * @param {Object} entityConfig - Entity configuration
     */
    setFormData: function (data, entityConfig) {
      const form = document.getElementById("entityForm");
      if (!form) return;

      console.log(
        `setFormData called for ${entityConfig.name} with data:`,
        data,
      );

      entityConfig.fields.forEach((field) => {
        const input = form.querySelector(`[name="${field.key}"]`);
        if (input && data[field.key] !== undefined) {
          console.log(
            `Setting field ${field.key} (type: ${field.type}) with value:`,
            data[field.key],
          );

          if (field.type === "boolean") {
            input.checked = data[field.key];
          } else if (field.type === "select" && field.entityType) {
            // Skip entity-type select fields - they are handled by populateSelectField
            // which includes pre-selection logic. Setting input.value here would
            // interfere with the async option population.
            console.log(
              `Skipping entity-type select field ${field.key} - handled by populateSelectField`,
            );
          } else if (field.type === "select" && field.options) {
            // Handle static select fields (with predefined options)
            const currentValue = data[field.key];
            console.log(
              `Processing static select field ${field.key} with current value:`,
              currentValue,
              "and available options:",
              field.options.map((opt) => opt.value),
            );

            // Check if the current value exists as an option
            const matchingOption = field.options.find(
              (opt) => opt.value === currentValue,
            );
            if (matchingOption) {
              input.value = currentValue;
              console.log(
                `Set static select field ${field.key} to matching option:`,
                currentValue,
              );
            } else {
              console.warn(
                `No matching option found for ${field.key} with value:`,
                currentValue,
                "Available options:",
                field.options.map((opt) => opt.value),
              );
              // Set to empty string if no match found
              input.value = "";
            }

            // Verify the selection was actually set
            setTimeout(() => {
              const verifyInput = document.getElementById(field.key);
              if (verifyInput) {
                console.log(
                  `Verification - ${field.key} current selectedIndex:`,
                  verifyInput.selectedIndex,
                  "value:",
                  verifyInput.value,
                  "expected:",
                  currentValue,
                );
                // If the value didn't stick, try setting it again
                if (verifyInput.value !== currentValue && matchingOption) {
                  console.log(
                    `Re-attempting to set ${field.key} to:`,
                    currentValue,
                  );
                  verifyInput.value = currentValue;
                }
              }
            }, 50);
          } else if (field.type === "datetime") {
            // Handle datetime fields specially - populate date and time inputs
            const value = data[field.key];
            input.value = value || "";

            console.log(
              `Processing datetime field ${field.key} with value:`,
              value,
            );

            if (value) {
              try {
                const dateObj = new Date(value);
                if (!isNaN(dateObj.getTime())) {
                  console.log(
                    `Valid date object created for ${field.key}:`,
                    dateObj.toISOString(),
                  );

                  // Populate the date input
                  const dateInput = document.getElementById(
                    `${field.key}_date`,
                  );
                  if (dateInput) {
                    const utcDate = dateObj.toISOString().split("T")[0];
                    dateInput.value = utcDate;
                    console.log(
                      `Set date input ${field.key}_date to:`,
                      utcDate,
                      "(input value now:",
                      dateInput.value,
                      ")",
                    );
                  } else {
                    console.warn(
                      `Date input element ${field.key}_date not found in DOM`,
                    );
                  }

                  // Populate the time input using UTC time to match backend format
                  const timeInput = document.getElementById(
                    `${field.key}_time`,
                  );
                  if (timeInput) {
                    const utcTime = `${dateObj.getUTCHours().toString().padStart(2, "0")}:${dateObj.getUTCMinutes().toString().padStart(2, "0")}`;
                    timeInput.value = utcTime;
                    console.log(
                      `Set time input ${field.key}_time to:`,
                      utcTime,
                      "(UTC hours:",
                      dateObj.getUTCHours(),
                      "minutes:",
                      dateObj.getUTCMinutes(),
                      ") (input value now:",
                      timeInput.value,
                      ")",
                    );
                  } else {
                    console.warn(
                      `Time input element ${field.key}_time not found in DOM`,
                    );
                  }
                } else {
                  console.warn(
                    `Invalid date object created from ${field.key}:`,
                    value,
                    "-> NaN time",
                  );
                }
              } catch (e) {
                console.warn(
                  `Exception processing datetime value for ${field.key}:`,
                  value,
                  e,
                );
              }
            } else {
              console.log(`No value provided for datetime field ${field.key}`);
            }
          } else if (field.type === "date") {
            // Handle date fields specially - extract date portion from datetime string
            const value = data[field.key];
            if (value) {
              try {
                // Extract date portion from datetime string (e.g., "2025-05-15T00:00:00+0000" -> "2025-05-15")
                const dateMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
                if (dateMatch) {
                  input.value = dateMatch[1];
                } else {
                  // Fallback: try to parse as Date and extract date portion
                  const dateObj = new Date(value);
                  if (!isNaN(dateObj.getTime())) {
                    input.value = dateObj.toISOString().split("T")[0];
                  } else {
                    console.warn(
                      `Could not parse date value for ${field.key}:`,
                      value,
                    );
                    input.value = "";
                  }
                }
              } catch (e) {
                console.warn(
                  `Exception processing date value for ${field.key}:`,
                  value,
                  e,
                );
                input.value = "";
              }
            } else {
              input.value = "";
            }
          } else {
            input.value = data[field.key] || "";
            console.log(`Set field ${field.key} to:`, input.value);
          }
        } else if (input && data[field.key] === undefined) {
          console.log(
            `Field ${field.key} has undefined value in data, skipping`,
          );
        } else if (!input) {
          console.warn(`Input element not found for field: ${field.key}`);
        }
      });
    },

    /**
     * Debug datetime fields to understand what values are being set
     * @param {Object} data - Entity data
     * @param {Object} entityConfig - Entity configuration
     * @returns {Object} Debug information
     */
    debugDatetimeFields: function (data, entityConfig) {
      const debugInfo = {};
      entityConfig.fields.forEach((field) => {
        if (field.type === "datetime" && data[field.key]) {
          const value = data[field.key];
          const dateObj = new Date(value);
          const dateInput = document.getElementById(`${field.key}_date`);
          const timeInput = document.getElementById(`${field.key}_time`);

          debugInfo[field.key] = {
            originalValue: value,
            parsedDate: dateObj.toISOString(),
            utcDate: dateObj.toISOString().split("T")[0],
            utcTime: `${dateObj.getUTCHours().toString().padStart(2, "0")}:${dateObj.getUTCMinutes().toString().padStart(2, "0")}`,
            dateInputExists: !!dateInput,
            timeInputExists: !!timeInput,
            dateInputValue: dateInput ? dateInput.value : "N/A",
            timeInputValue: timeInput ? timeInput.value : "N/A",
          };
        }
      });
      return debugInfo;
    },

    /**
     * Populate entity-type selects with data from API
     * @param {Object} entityConfig - Entity configuration
     * @param {Object} data - Current entity data (for pre-selection)
     * @param {Object} filterParams - Optional filter parameters for dependent fields
     */
    populateEntityTypeSelects: function (
      entityConfig,
      data,
      filterParams = {},
    ) {
      if (!entityConfig || !entityConfig.fields) {
        console.warn("populateEntityTypeSelects: No entity config or fields");
        return;
      }

      console.log(
        "populateEntityTypeSelects: Processing entity",
        entityConfig.name,
      );

      // Process fields that don't depend on others first
      const independentFields = entityConfig.fields.filter(
        (field) =>
          field.type === "select" && field.entityType && !field.dependsOn,
      );

      // Process dependent fields second
      const dependentFields = entityConfig.fields.filter(
        (field) =>
          field.type === "select" && field.entityType && field.dependsOn,
      );

      console.log(
        `Found ${independentFields.length} independent fields and ${dependentFields.length} dependent fields for entity: ${entityConfig.name}`
      );
      console.log("Independent fields:", independentFields.map(f => f.key));
      console.log("Dependent fields:", dependentFields.map(f => f.key));

      // Process independent fields first
      independentFields.forEach((field) => {
        this.populateSelectField(field, data, {}).catch(error => {
          console.error(`Failed to populate independent field ${field.key}:`, error);
        });
      });

      // Process dependent fields with proper filtering
      dependentFields.forEach((field) => {
        // Check if we have data for the parent field
        let fieldFilterParams = { ...filterParams };

        if (
          data &&
          field.dependsOn &&
          data[field.dependsOn] &&
          !fieldFilterParams[field.filterField]
        ) {
          // Use the parent field value from existing data for initial filtering
          fieldFilterParams[field.filterField] = data[field.dependsOn];
          console.log(
            `Using parent field ${field.dependsOn} value '${data[field.dependsOn]}' for filtering ${field.key}`,
          );
        }

        this.populateSelectField(field, data, fieldFilterParams).catch(error => {
          console.error(`Failed to populate dependent field ${field.key}:`, error);
        });
      });
    },

    /**
     * Populate a single select field with data from API
     * @param {Object} field - Field configuration
     * @param {Object} data - Current entity data (for pre-selection)
     * @param {Object} filterParams - Filter parameters for dependent fields
     */
    populateSelectField: function (field, data, filterParams = {}) {
      console.log(
        `Processing select field: ${field.key} with entityType: ${field.entityType}`,
      );

      const select = document.getElementById(field.key);
      if (!select) {
        console.warn(`Select element not found for field: ${field.key} - skipping gracefully. This may be expected if the field is only shown in certain modes (view vs edit).`);
        
        // Debug: List all select elements in the modal to help troubleshooting
        const allSelects = document.querySelectorAll('#editModal select');
        const selectIds = Array.from(allSelects).map(s => s.id).filter(id => id);
        console.log(`Available select elements in modal: [${selectIds.join(', ')}]`);
        
        // Gracefully resolve instead of rejecting to prevent cascading failures
        return Promise.resolve();
      }

      // Check if this is a dependent field and if parent has a value
      if (field.dependsOn) {
        const parentField = document.getElementById(field.dependsOn);
        const parentValue = parentField ? parentField.value : null;

        // If parent field doesn't have a value, show empty dropdown
        if (!parentValue && !filterParams[field.filterField]) {
          select.innerHTML =
            '<option value="">Select parent field first...</option>';
          return Promise.resolve();
        }

        // Use parent field value for filtering
        if (parentValue && !filterParams[field.filterField]) {
          filterParams[field.filterField] = parentValue;
        }
      }

      // Load data from API
      if (window.ApiClient && window.ApiClient.entities) {
        console.log(
          `Loading data for entityType: ${field.entityType}`,
          filterParams,
        );
        console.log(
          `Field config - valueField: ${field.valueField}, displayField: ${field.displayField}`,
        );

        // Build API parameters - handle specific field mappings
        let apiParams = { ...filterParams };

        // Special handling for sequencesmaster - map plm_id to planId
        if (field.entityType === "sequencesmaster" && apiParams.plm_id) {
          apiParams.planId = apiParams.plm_id;
          delete apiParams.plm_id;
        }

        // Map entityType to correct API endpoint if needed
        let actualEntityType = field.entityType;
        if (field.entityType === "plans" && window.ApiClient.entities.getAll) {
          // For plans dropdown, ensure we're calling the right endpoint
          console.log(`Calling API for plans with params:`, apiParams);
        } else if (field.entityType === "sequencesmaster") {
          console.log(
            `Calling API for sequencesmaster with params:`,
            apiParams,
          );
        }

        // Handle special case for status entityType
        let apiCall;
        if (field.entityType === "status") {
          // Use status API with entityTypeFilter parameter
          const statusEntityType = field.entityTypeFilter || "Iteration";
          console.log(`Calling status API for entityType: ${statusEntityType}`);
          apiCall = window.ApiClient.status.getByEntityType(statusEntityType);
        } else {
          // Use standard entities API
          apiCall = window.ApiClient.entities.getAll(
            actualEntityType,
            apiParams,
          );
        }

        return apiCall
          .then((response) => {
            console.log(`API response for ${actualEntityType}:`, response);
            console.log(
              `Response type:`,
              Array.isArray(response) ? "Array" : typeof response,
            );

            // Handle different response formats
            let items = [];
            if (Array.isArray(response)) {
              items = response;
            } else if (response.data) {
              items = response.data;
            } else if (response.content) {
              items = response.content;
            } else if (response.items) {
              items = response.items;
            }
            console.log(
              `Extracted ${items.length} items for ${actualEntityType}`,
            );
            console.log(
              `First item sample:`,
              items.length > 0 ? items[0] : "No items",
            );

            // Clear existing options
            select.innerHTML = '<option value="">Select...</option>';

            // Add options
            items.forEach((item, index) => {
              const value = item[field.valueField];
              const display = item[field.displayField];

              // CRITICAL FIX: Filter out current entity for predecessor fields to prevent circular dependency
              // For sequencesmaster predecessor_sqm_id field, exclude current sequence from dropdown
              if (
                field.key === "predecessor_sqm_id" &&
                field.entityType === "sequencesmaster" &&
                data &&
                data.sqm_id &&
                value === data.sqm_id
              ) {
                console.log(
                  `Excluding current sequence ${value} from predecessor dropdown to prevent circular dependency`,
                );
                return; // Skip adding this option
              }

              // For phasesmaster predecessor_phm_id field, exclude current phase from dropdown
              if (
                field.key === "predecessor_phm_id" &&
                field.entityType === "phasesmaster" &&
                data &&
                data.phm_id &&
                value === data.phm_id
              ) {
                console.log(
                  `Excluding current phase ${value} from predecessor dropdown to prevent circular dependency`,
                );
                return; // Skip adding this option
              }

              if (value !== undefined && display !== undefined) {
                const option = document.createElement("option");
                option.value = value;
                option.textContent = display;
                // Pre-select if editing
                if (data && data[field.key] === value) {
                  option.selected = true;
                }
                select.appendChild(option);

                if (index < 3) {
                  console.log(
                    `Option ${index}: value='${value}', display='${display}'`,
                  );
                }
              } else {
                console.warn(
                  `Missing value or display for item:`,
                  item,
                  `valueField: ${field.valueField}, displayField: ${field.displayField}`,
                );
              }
            });

            console.log(
              `Successfully populated ${select.options.length - 1} options for ${field.key}`,
            );
          })
          .catch((error) => {
            console.error(`Failed to load ${field.entityType}:`, error);
            select.innerHTML =
              '<option value="">Failed to load options</option>';
            throw error; // Re-throw error for upstream handling
          });
      } else {
        console.error("ApiClient or ApiClient.entities not available");
        select.innerHTML = '<option value="">API Client not available</option>';
        return Promise.reject(new Error("ApiClient not available"));
      }
    },

    /**
     * Setup field dependencies - add event listeners for dependent dropdowns
     * @param {Object} entityConfig - Entity configuration
     * @param {Object} data - Current entity data
     */
    setupFieldDependencies: function (entityConfig, data) {
      if (!entityConfig || !entityConfig.fields) {
        return;
      }

      console.log("Setting up field dependencies for", entityConfig.name);

      // Find fields with dependencies
      const dependentFields = entityConfig.fields.filter(
        (field) =>
          field.type === "select" && field.entityType && field.dependsOn,
      );

      dependentFields.forEach((field) => {
        const parentField = document.getElementById(field.dependsOn);
        const childField = document.getElementById(field.key);

        if (parentField && childField) {
          console.log(
            `Setting up dependency: ${field.dependsOn} -> ${field.key}`,
          );

          // Remove existing event listeners to prevent duplicates
          const existingListener = parentField.getAttribute('data-dependency-listener');
          if (existingListener) {
            parentField.removeEventListener("change", parentField._dependencyListener);
          }

          // Create bound event listener to preserve context
          const dependencyListener = ((fieldRef, childFieldRef, dataRef) => {
            return (event) => {
              const parentValue = event.target.value;
              console.log(
                `Parent field ${fieldRef.dependsOn} changed to:`,
                parentValue,
              );

              // Clear any downstream dependent fields first
              this.clearDownstreamDependentFields(fieldRef.key, entityConfig);

              if (parentValue) {
                // Build filter parameters
                const filterParams = {};
                filterParams[fieldRef.filterField] = parentValue;

                console.log(
                  `Repopulating ${fieldRef.key} with filter:`,
                  filterParams,
                );

                // Show loading state
                childFieldRef.innerHTML = '<option value="">Loading...</option>';

                // Repopulate the dependent field
                this.populateSelectField(fieldRef, dataRef, filterParams)
                  .catch((error) => {
                    console.error(`Failed to populate ${fieldRef.key}:`, error);
                    childFieldRef.innerHTML = '<option value="">Error loading options</option>';
                  });
              } else {
                // Clear the dependent field
                childFieldRef.innerHTML =
                  '<option value="">Select parent field first...</option>';
              }
            };
          })(field, childField, data);

          // Store listener reference for cleanup
          parentField._dependencyListener = dependencyListener;
          parentField.setAttribute('data-dependency-listener', 'true');
          
          // Add event listener to parent field
          parentField.addEventListener("change", dependencyListener);
        }
      });
    },

    /**
     * Test cascading dropdown functionality for phases
     * This is a debug/test function to verify the fixes
     */
    testPhaseDropdownCascading: function() {
      console.log("=== Testing Phase Dropdown Cascading ===");
      
      // Check if we're on the phases master page
      if (!window.AdminGuiState || window.AdminGuiState.currentEntity !== 'phasesmaster') {
        console.warn("Not on phasesmaster entity page. Switch to Master Phases to test.");
        return;
      }
      
      // Simulate creating a new phase to test the cascading
      console.log("1. Opening create modal...");
      this.showEntityForm(null, 'phasesmaster', true);
      
      // Wait for modal to open and then test cascading
      setTimeout(() => {
        const planSelect = document.getElementById('plm_id');
        const sequenceSelect = document.getElementById('sqm_id');
        const predecessorSelect = document.getElementById('predecessor_phm_id');
        
        if (planSelect && sequenceSelect && predecessorSelect) {
          console.log("2. Found all dropdown elements");
          console.log("   - Plan select:", planSelect.options.length, "options");
          console.log("   - Sequence select:", sequenceSelect.options.length, "options");
          console.log("   - Predecessor select:", predecessorSelect.options.length, "options");
          
          // Test plan selection triggering sequence population
          if (planSelect.options.length > 1) {
            console.log("3. Testing plan selection...");
            planSelect.selectedIndex = 1; // Select first real option
            const changeEvent = new Event('change', { bubbles: true });
            planSelect.dispatchEvent(changeEvent);
            
            setTimeout(() => {
              console.log("4. After plan selection - Sequence options:", sequenceSelect.options.length);
              
              // Test sequence selection triggering predecessor population
              if (sequenceSelect.options.length > 1) {
                console.log("5. Testing sequence selection...");
                sequenceSelect.selectedIndex = 1;
                const seqChangeEvent = new Event('change', { bubbles: true });
                sequenceSelect.dispatchEvent(seqChangeEvent);
                
                setTimeout(() => {
                  console.log("6. After sequence selection - Predecessor options:", predecessorSelect.options.length);
                  console.log("=== Cascading Test Complete ===");
                }, 2000);
              }
            }, 2000);
          }
        } else {
          console.error("Could not find dropdown elements");
        }
      }, 1000);
    },

    /**
     * Clear downstream dependent fields when a parent field changes
     * @param {string} changedFieldKey - The key of the field that changed
     * @param {Object} entityConfig - Entity configuration
     */
    clearDownstreamDependentFields: function (changedFieldKey, entityConfig) {
      // Find all fields that depend on the changed field
      const dependentFields = entityConfig.fields.filter(
        (field) => field.dependsOn === changedFieldKey
      );

      dependentFields.forEach((dependentField) => {
        const childField = document.getElementById(dependentField.key);
        if (childField) {
          console.log(`Clearing downstream field: ${dependentField.key}`);
          childField.innerHTML = '<option value="">Select parent field first...</option>';
          
          // Recursively clear any fields that depend on this one
          this.clearDownstreamDependentFields(dependentField.key, entityConfig);
        }
      });
    },

    /**
     * Handle form submission
     * @param {Event} e - Form submission event
     */
    handleFormSubmit: function (e) {
      e.preventDefault();
      this.handleSaveEntity();
    },

    /**
     * Handle date/time picker changes
     * For datetime fields: Combines date and time inputs into a single ISO datetime value
     * For date fields: Uses the date value directly
     * @param {Event} e - Change event
     */
    handleDateTimeChange: function (e) {
      const input = e.target;
      const fieldName = input.name.replace(/_date$|_time$/, "");

      // Check if this is a simple date field (no _date suffix)
      if (input.name === fieldName && input.type === "date") {
        // Handle simple date field - no time component needed
        if (input.value) {
          // For date-only fields, just append T00:00:00+0000 to maintain backend format consistency
          const dateValue = input.value;
          const isoValue = `${dateValue}T00:00:00+0000`;
          input.value = input.value; // Keep the simple date value in the input

          // Validate date ranges for migration start/end dates
          this.validateDateRange();
        }
        return;
      }

      // Handle datetime fields with separate date/time inputs
      const dateInput = document.getElementById(`${fieldName}_date`);
      const timeInput = document.getElementById(`${fieldName}_time`);
      const hiddenInput = document.getElementById(fieldName);

      if (dateInput && timeInput && hiddenInput) {
        const dateValue = dateInput.value;
        const timeValue = timeInput.value || "00:00";

        if (dateValue) {
          // Combine date and time into proper ISO format with timezone
          // Since the time input contains UTC time, we need to create a UTC Date object
          const dateTimeString = `${dateValue}T${timeValue}:00Z`; // Add 'Z' to indicate UTC
          const dateObj = new Date(dateTimeString);

          // Convert to backend expected format (replace 'Z' with '+0000')
          const isoValue = dateObj
            .toISOString()
            .replace("Z", "+0000")
            .replace(".000", "");
          hiddenInput.value = isoValue;

          // Validate date ranges for migration start/end dates
          this.validateDateRange();
        } else {
          hiddenInput.value = "";
        }
      }
    },

    /**
     * Validate date ranges (e.g., end date must be after start date)
     */
    validateDateRange: function () {
      const startDateInput = document.getElementById("mig_start_date");
      const endDateInput = document.getElementById("mig_end_date");

      if (startDateInput && endDateInput) {
        const startDate = new Date(startDateInput.value);
        const endDate = new Date(endDateInput.value);

        if (startDate && endDate && endDate <= startDate) {
          this.showDateRangeError(
            endDateInput,
            "End date must be after start date",
          );
          return false;
        } else {
          this.clearDateRangeError(endDateInput);
          return true;
        }
      }
      return true;
    },

    /**
     * Show date range validation error
     * @param {HTMLElement} field - Field element
     * @param {string} message - Error message
     */
    showDateRangeError: function (field, message) {
      this.clearDateRangeError(field);

      const errorDiv = document.createElement("div");
      errorDiv.className = "field-error date-range-error";
      errorDiv.textContent = message;

      field.parentNode.appendChild(errorDiv);
      field.classList.add("error");
    },

    /**
     * Clear date range validation error
     * @param {HTMLElement} field - Field element
     */
    clearDateRangeError: function (field) {
      const existingError = field.parentNode.querySelector(".date-range-error");
      if (existingError) {
        existingError.remove();
      }
      field.classList.remove("error");
    },

    /**
     * Handle save entity
     */
    handleSaveEntity: function () {
      const form = document.getElementById("entityForm");
      if (!form) return;

      // Validate form
      if (!this.validateForm(form)) {
        return;
      }

      const formData = this.getFormData(form);
      const state = window.AdminGuiState ? window.AdminGuiState.getState() : {};
      const currentEntity = state.currentEntity || "users";
      const entityConfig = window.EntityConfig
        ? window.EntityConfig.getEntity(currentEntity)
        : null;

      // Check if this is create or update by looking for the primary key field
      let isCreate = true;
      let entityId = null;

      if (entityConfig && entityConfig.fields.length > 0) {
        const idField = entityConfig.fields[0]; // Primary key is usually first field

        // Check FormData first (for writable fields)
        if (formData[idField.key]) {
          isCreate = false;
          entityId = formData[idField.key];
        } else {
          // For readonly ID fields, check the DOM element directly
          const idInput = form.querySelector(`[name="${idField.key}"]`);
          if (idInput && idInput.value && idInput.value.trim() !== "") {
            isCreate = false;
            entityId = idInput.value.trim();
            console.log(
              `Detected UPDATE operation from readonly field: ${idField.key} = ${entityId}`,
            );
          }
        }
      }

      console.log("Save operation details:", {
        currentEntity,
        isCreate,
        entityId,
        formDataKeys: Object.keys(formData),
      });

      this.saveEntity(formData, currentEntity, isCreate, entityId);
    },

    /**
     * Wait for modal to be available in DOM with proper retry mechanism
     * @param {string} modalId - Modal element ID to wait for
     * @param {number} timeout - Maximum time to wait in milliseconds (default 5000)
     * @returns {Promise<Element>} Promise that resolves with modal element when ready
     */
    waitForModal: function (modalId, timeout = 5000) {
      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const checkInterval = 50; // Check every 50ms
        
        const checkModal = () => {
          const modal = document.getElementById(modalId);
          
          if (modal) {
            // Additional check to ensure modal is properly rendered
            const modalRect = modal.getBoundingClientRect();
            const hasForm = modal.querySelector('#entityForm');
            const hasContent = modal.querySelector('.modal-body');
            
            // Different criteria for different modal types
            let isReady = false;
            
            if (modalId === 'viewModal') {
              // View modals need content but not forms
              isReady = modalRect.height > 0 && hasContent && hasContent.innerHTML.trim().length > 0;
            } else if (modalId === 'editModal') {
              // Edit modals need forms
              isReady = modalRect.height > 0 && hasForm;
            } else if (modalId === 'associationModal') {
              // Association modals may have different content structures
              const hasAssociationContent = modal.querySelector('.association-content, .modal-body');
              isReady = modalRect.height > 0 && hasAssociationContent && hasAssociationContent.innerHTML.trim().length > 0;
            } else {
              // Default criteria - try to detect modal type based on content
              if (hasForm) {
                // Has form - treat as edit modal
                isReady = modalRect.height > 0 && hasForm;
              } else if (hasContent) {
                // No form but has content - treat as view modal
                isReady = modalRect.height > 0 && hasContent && hasContent.innerHTML.trim().length > 0;
              } else {
                // Fallback - just check if modal has height
                isReady = modalRect.height > 0;
              }
            }
            
            if (isReady) {
              const detectionType = modalId === 'viewModal' ? 'view-content' : 
                                    modalId === 'editModal' ? 'edit-form' : 
                                    modalId === 'associationModal' ? 'association-content' :
                                    hasForm ? 'auto-detected-form' : hasContent ? 'auto-detected-content' : 'fallback-height';
              console.log(`✅ Modal ${modalId} ready after ${Date.now() - startTime}ms (detection: ${detectionType})`);
              resolve(modal);
              return;
            } else {
              // Debug info for failed checks
              console.debug(`Modal ${modalId} not ready - height: ${modalRect.height}, hasForm: ${!!hasForm}, hasContent: ${!!hasContent}, contentLength: ${hasContent ? hasContent.innerHTML.trim().length : 0}`);
            }
          }
          
          // Check timeout
          if (Date.now() - startTime > timeout) {
            const availableModals = Array.from(document.querySelectorAll('[id*="modal" i], [id*="Modal" i]')).map(el => el.id);
            const modal = document.getElementById(modalId);
            let diagnostics = 'Modal not found';
            
            if (modal) {
              const modalRect = modal.getBoundingClientRect();
              const hasForm = modal.querySelector('#entityForm');
              const hasContent = modal.querySelector('.modal-body');
              
              diagnostics = `height: ${modalRect.height}, hasForm: ${!!hasForm}, hasContent: ${!!hasContent}, contentLength: ${hasContent ? hasContent.innerHTML.trim().length : 0}`;
            }
            
            console.error(`❌ Modal ${modalId} not ready after ${timeout}ms. Diagnostics: ${diagnostics}. Available modals:`, availableModals);
            reject(new Error(`Modal ${modalId} not ready after ${timeout}ms. ${diagnostics}`));
            return;
          }
          
          // Schedule next check
          setTimeout(checkModal, checkInterval);
        };
        
        // Start checking
        checkModal();
      });
    },

    /**
     * Validate form
     * @param {HTMLFormElement} form - Form element
     * @returns {boolean} Whether form is valid
     */
    validateForm: function (form) {
      const requiredFields = form.querySelectorAll("[required]");
      let isValid = true;

      requiredFields.forEach((field) => {
        if (!field.value.trim()) {
          this.showFieldError(field, "This field is required");
          isValid = false;
        } else {
          this.clearFieldError(field);
        }
      });

      // Additional validation
      const emailFields = form.querySelectorAll('input[type="email"]');
      emailFields.forEach((field) => {
        if (field.value && !this.validateEmail(field.value)) {
          this.showFieldError(field, "Please enter a valid email address");
          isValid = false;
        }
      });

      // Date range validation
      if (!this.validateDateRange()) {
        isValid = false;
      }

      return isValid;
    },

    /**
     * Show field error
     * @param {HTMLElement} field - Field element
     * @param {string} message - Error message
     */
    showFieldError: function (field, message) {
      this.clearFieldError(field);

      const errorDiv = document.createElement("div");
      errorDiv.className = "field-error";
      errorDiv.textContent = message;
      errorDiv.style.color = "var(--danger-color)";
      errorDiv.style.fontSize = "12px";
      errorDiv.style.marginTop = "5px";

      field.parentNode.appendChild(errorDiv);
      field.style.borderColor = "var(--danger-color)";
    },

    /**
     * Clear field error
     * @param {HTMLElement} field - Field element
     */
    clearFieldError: function (field) {
      const errorDiv = field.parentNode.querySelector(".field-error");
      if (errorDiv) {
        errorDiv.remove();
      }
      field.style.borderColor = "";
    },

    /**
     * Validate email
     * @param {string} email - Email to validate
     * @returns {boolean} Whether email is valid
     */
    validateEmail: function (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    },

    /**
     * Get form data
     * @param {HTMLFormElement} form - Form element
     * @returns {Object} Form data
     */
    getFormData: function (form) {
      const formData = new FormData(form);
      const data = {};

      // Get entity configuration to know field types
      const state = window.AdminGuiState ? window.AdminGuiState.getState() : {};
      const currentEntity = state.currentEntity || "users";
      const entityConfig = window.EntityConfig
        ? window.EntityConfig.getEntity(currentEntity)
        : null;

      // Process form data
      for (let [key, value] of formData.entries()) {
        if (entityConfig) {
          const field = entityConfig.fields.find((f) => f.key === key);
          if (field) {
            console.log(
              `Processing field ${key} (type: ${field.type}) with value:`,
              value,
              `(typeof: ${typeof value})`,
            );

            if (field.type === "select") {
              // Only convert to null if the value is truly empty (not a valid selection)
              if (
                value === "" ||
                value === "Select..." ||
                value === "Loading..."
              ) {
                data[key] = null;
                console.log(`Set ${key} to null (empty selection)`);
              } else if (field.options) {
                // Check if the select field has numeric values (static options)
                const option = field.options.find((opt) => opt.value == value);
                if (option && typeof option.value === "number") {
                  // Convert to number if the option value is numeric
                  data[key] = parseInt(value, 10);
                  console.log(`Converted ${key} to number:`, data[key]);
                } else {
                  data[key] = value;
                  console.log(`Set ${key} to string value:`, data[key]);
                }
              } else if (field.entityType) {
                // For entity-type selects, preserve the value as-is (should be UUID)
                data[key] = value;
                console.log(
                  `Set entity-type select ${key} to:`,
                  data[key],
                  `(should preserve UUID format)`,
                );
              } else {
                // Fallback for other select types
                data[key] = value;
                console.log(`Set unknown select type ${key} to:`, data[key]);
              }
            } else if (field.type === "number") {
              // Handle number fields explicitly
              if (value === "" || value === null || value === undefined) {
                data[key] = null;
                console.log(`Set number field ${key} to null (empty)`);
              } else {
                data[key] = parseInt(value, 10);
                console.log(`Set number field ${key} to:`, data[key]);
              }
            } else {
              data[key] = value;
              console.log(`Set ${key} (${field.type}) to:`, data[key]);
            }
          } else {
            data[key] = value;
            console.log(`Field ${key} not found in config, setting to:`, value);
          }
        } else {
          data[key] = value;
          console.log(`No entity config, setting ${key} to:`, value);
        }
      }

      // Handle checkboxes (boolean fields) that aren't in FormData when unchecked
      if (entityConfig) {
        entityConfig.fields.forEach((field) => {
          if (field.type === "boolean" && !field.readonly && !field.computed) {
            const checkbox = form.querySelector(`[name="${field.key}"]`);
            if (checkbox && checkbox.type === "checkbox") {
              data[field.key] = checkbox.checked;
            }
          }
        });
      }

      return data;
    },

    /**
     * Save entity
     * @param {Object} data - Entity data
     * @param {string} entityType - Entity type
     * @param {boolean} isCreate - Whether this is create operation
     * @param {string} entityId - Entity ID for updates
     */
    saveEntity: function (data, entityType, isCreate, entityId) {
      if (!window.ApiClient) {
        console.error("API client not available");
        return;
      }

      // Get entity configuration
      const entityConfig = window.EntityConfig
        ? window.EntityConfig.getEntity(entityType)
        : null;

      // Clean up data - remove readonly and computed fields for the API
      const cleanData = {};
      if (entityConfig) {
        entityConfig.fields.forEach((field) => {
          if (
            !field.readonly &&
            !field.computed &&
            data.hasOwnProperty(field.key)
          ) {
            let value = data[field.key];

            // Type conversion based on field type
            if (field.type === "boolean") {
              value =
                value === true ||
                value === "true" ||
                value === 1 ||
                value === "1";
            } else if (
              field.type === "number" &&
              value !== null &&
              value !== ""
            ) {
              value = parseInt(value, 10);
              if (isNaN(value)) {
                value = null;
              }
            } else if (
              field.type === "select" &&
              value !== null &&
              value !== ""
            ) {
              // Convert foreign key select fields to integers if they reference integer IDs
              // Only convert specific known integer foreign keys, not UUIDs
              const integerForeignKeys = [
                "tms_id",
                "usr_id",
                "env_id",
                "lbl_id",
                "app_id",
                "rls_id",
              ];
              const isIntegerForeignKey =
                (field.valueField &&
                  integerForeignKeys.includes(field.valueField)) ||
                (field.key && integerForeignKeys.includes(field.key));

              if (isIntegerForeignKey) {
                value = parseInt(value, 10);
                if (isNaN(value)) {
                  value = null;
                }
              }
            } else if (
              field.type === "date" &&
              value !== null &&
              value !== ""
            ) {
              // Convert date string to datetime format expected by backend
              // Transform "2025-08-25" to "2025-08-25T00:00:00+0000"
              if (
                typeof value === "string" &&
                value.match(/^\d{4}-\d{2}-\d{2}$/)
              ) {
                value = `${value}T00:00:00+0000`;
              }
            }

            cleanData[field.key] = value;
          }
        });
      } else {
        // Fallback if no config
        Object.assign(cleanData, data);
      }

      console.log("Saving entity:", {
        entityType,
        isCreate,
        entityId,
        originalData: data,
        cleanData: cleanData,
      });
      console.log("Clean data being sent:", JSON.stringify(cleanData, null, 2));

      const promise = isCreate
        ? window.ApiClient.entities.create(entityType, cleanData)
        : window.ApiClient.entities.update(entityType, entityId, cleanData);

      promise
        .then((response) => {
          console.log("Save successful:", response);
          if (window.UiUtils) {
            window.UiUtils.showNotification(
              `${entityType} ${isCreate ? "created" : "updated"} successfully`,
              "success",
            );
          }

          this.closeModal();

          // Refresh the table
          if (window.AdminGuiController) {
            window.AdminGuiController.loadCurrentSection();
          }
        })
        .catch((error) => {
          console.error("Failed to save entity:", error);

          // Extract error message if available
          let errorMessage = `Failed to ${isCreate ? "create" : "update"} ${entityType}`;
          if (error.message) {
            errorMessage += `: ${error.message}`;
          }

          if (window.UiUtils) {
            window.UiUtils.showNotification(errorMessage, "error");
          }
        });
    },

    /**
     * Load entity data
     * @param {string} id - Entity ID
     * @param {string} entityType - Entity type
     * @returns {Promise} Load promise
     */
    loadEntityData: function (id, entityType) {
      if (!window.ApiClient) {
        throw new Error("API client not available");
      }

      return window.ApiClient.entities.getById(entityType, id);
    },

    /**
     * Format field value for display
     * @param {*} value - Field value
     * @param {Object} field - Field configuration
     * @returns {string} Formatted value
     */
    formatFieldValue: function (
      value,
      field,
      entity = null,
      entityConfig = null,
    ) {
      if (value === null || value === undefined) {
        return "";
      }

      // Check for custom renderers first - these override default formatting
      if (entityConfig?.customRenderers?.[field.key]) {
        console.log(`Using custom renderer for ${field.key}:`, value, entity);
        return entityConfig.customRenderers[field.key](value, entity);
      }

      // SPECIAL HANDLING FOR UUID FIELDS IN VIEW MODE - Show human-readable names instead of UUIDs
      // Check if this is a UUID field that has a corresponding display field available
      if (entity && field.type === "select" && entityConfig?.viewDisplayMapping) {
        const displayField = entityConfig.viewDisplayMapping[field.key];
        if (displayField && entity[displayField]) {
          // Return the human-readable display value instead of the UUID
          console.log(`💡 VIEW Mode - Using display field '${displayField}' for '${field.key}': "${entity[displayField]}" instead of UUID "${value}"`);
          return entity[displayField];
        }
      }

      // Special handling for status fields that may need color badges
      if (field.key.includes("status") && field.type === "select") {
        // Get status display name
        const displayName = value
          ? value
              .replace(/_/g, " ")
              .toLowerCase()
              .replace(/\b\w/g, (l) => l.toUpperCase())
          : "Unknown";

        // Check if entity has statusMetadata for color
        let statusColor = null;
        if (
          entity &&
          entity.statusMetadata &&
          entity.statusMetadata.name === value
        ) {
          statusColor = entity.statusMetadata.color;
        }

        // Use color if available, otherwise use default styling
        if (statusColor) {
          const textColor = window.UiUtils
            ? window.UiUtils.getContrastingTextColor(statusColor)
            : "#ffffff";
          return `<span class="status-badge" style="background-color: ${statusColor}; color: ${textColor}; padding: 4px 8px; border-radius: 3px; font-size: 11px; font-weight: 600; display: inline-block;">${displayName}</span>`;
        } else {
          return `<span class="status-badge" style="background-color: #999; color: #fff; padding: 4px 8px; border-radius: 3px; font-size: 11px; font-weight: 600; display: inline-block;">${displayName}</span>`;
        }
      }

      switch (field.type) {
        case "boolean":
          return value ? "Yes" : "No";
        case "datetime":
          return window.UiUtils ? window.UiUtils.formatDate(value) : value;
        case "date":
          return window.UiUtils
            ? window.UiUtils.formatDate(value, false)
            : value;
        case "color":
          return `<span class="aui-label" style="background-color: ${value}; color: ${window.UiUtils?.getContrastColor(value) || "#000000"};">${value}</span>`;
        default:
          return value.toString();
      }
    },

    /**
     * Close modal
     */
    closeModal: function () {
      const modals = document.querySelectorAll(".modal-overlay");
      modals.forEach((modal) => modal.remove());

      // Clean up any document-level event listeners
      if (this.handleRemoveButtonClick) {
        document.removeEventListener("click", this.handleRemoveButtonClick);
        this.handleRemoveButtonClick = null;
      }
    },

    /**
     * Check if modal is open
     * @returns {boolean} Whether modal is open
     */
    isModalOpen: function () {
      return document.querySelector(".modal-overlay") !== null;
    },

    /**
     * Show association modal for applications
     * @param {string} envId - Environment ID
     */
    showAssociateApplicationModal: function (envId) {
      if (!window.ApiClient) {
        console.error("API client not available");
        return;
      }

      window.ApiClient.applications
        .getAll()
        .then((applications) => {
          this.renderAssociationModal(
            "Associate Application",
            applications,
            "app_id",
            "app_name",
            (selectedId) => {
              this.associateEnvironmentApplication(envId, selectedId);
            },
          );
        })
        .catch((error) => {
          console.error("Failed to load applications:", error);
          if (window.UiUtils) {
            window.UiUtils.showNotification(
              "Error loading applications",
              "error",
            );
          }
        });
    },

    /**
     * Show association modal for iterations
     * @param {string} envId - Environment ID
     */
    showAssociateIterationModal: function (envId) {
      if (!window.ApiClient) {
        console.error("API client not available");
        return;
      }

      window.ApiClient.iterations
        .getAll()
        .then((iterations) => {
          this.renderAssociationModal(
            "Associate Iteration",
            iterations,
            "ite_id",
            "ite_name",
            (selectedId) => {
              this.associateEnvironmentIteration(envId, selectedId);
            },
          );
        })
        .catch((error) => {
          console.error("Failed to load iterations:", error);
          if (window.UiUtils) {
            window.UiUtils.showNotification(
              "Error loading iterations",
              "error",
            );
          }
        });
    },

    /**
     * Render association modal
     * @param {string} title - Modal title
     * @param {Array} items - Items to select from
     * @param {string} valueField - Value field name
     * @param {string} textField - Text field name
     * @param {Function} onSelect - Selection callback
     */
    renderAssociationModal: function (
      title,
      items,
      valueField,
      textField,
      onSelect,
    ) {
      const options = window.UiUtils
        ? window.UiUtils.createSelectOptions(
            items,
            valueField,
            textField,
            "Select...",
          )
        : this.createSelectOptions(items, valueField, textField);

      const modalHtml = `
                <div class="modal-overlay" id="associationModal">
                    <div class="modal modal-small">
                        <div class="modal-header">
                            <h3 class="modal-title">${title}</h3>
                            <button class="modal-close">×</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label>Select ${title.split(" ")[1]}:</label>
                                <select id="associationSelect" required>
                                    ${options}
                                </select>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-secondary" onclick="ModalManager.closeModal()">Cancel</button>
                            <button class="btn-primary" onclick="ModalManager.handleAssociation()">Associate</button>
                        </div>
                    </div>
                </div>
            `;

      document.body.insertAdjacentHTML("beforeend", modalHtml);

      // Store callback for later use
      this.associationCallback = onSelect;
    },

    /**
     * Handle association
     */
    handleAssociation: function () {
      const select = document.getElementById("associationSelect");
      if (!select || !select.value) {
        if (window.UiUtils) {
          window.UiUtils.showNotification("Please select an item", "error");
        }
        return;
      }

      if (this.associationCallback) {
        this.associationCallback(select.value);
      }

      this.closeModal();
    },

    /**
     * Associate environment with application
     * @param {string} envId - Environment ID
     * @param {string} appId - Application ID
     */
    associateEnvironmentApplication: function (envId, appId) {
      if (!window.ApiClient) {
        console.error("API client not available");
        return;
      }

      window.ApiClient.environments
        .associateApplication(envId, appId)
        .then(() => {
          if (window.UiUtils) {
            window.UiUtils.showNotification(
              "Application associated successfully",
              "success",
            );
          }
        })
        .catch((error) => {
          console.error("Failed to associate application:", error);
          if (window.UiUtils) {
            window.UiUtils.showNotification(
              "Failed to associate application",
              "error",
            );
          }
        });
    },

    /**
     * Associate environment with iteration
     * @param {string} envId - Environment ID
     * @param {string} iterationId - Iteration ID
     */
    associateEnvironmentIteration: function (envId, iterationId) {
      if (!window.ApiClient) {
        console.error("API client not available");
        return;
      }

      window.ApiClient.environments
        .associateIteration(envId, iterationId)
        .then(() => {
          if (window.UiUtils) {
            window.UiUtils.showNotification(
              "Iteration associated successfully",
              "success",
            );
          }
        })
        .catch((error) => {
          console.error("Failed to associate iteration:", error);
          if (window.UiUtils) {
            window.UiUtils.showNotification(
              "Failed to associate iteration",
              "error",
            );
          }
        });
    },

    /**
     * Build basic environment form fields
     * @param {Object} environment - Environment data
     * @param {Object} entityConfig - Entity configuration
     * @param {boolean} isCreate - Whether this is create mode
     * @returns {string} Form fields HTML
     */
    buildBasicEnvironmentForm: function (environment, entityConfig, isCreate) {
      let formHtml =
        '<div class="form-section"><h4>Environment Information</h4>';

      entityConfig.fields.forEach((field) => {
        if (!field.readonly && !field.computed) {
          const fieldHtml = this.buildFormField(field, environment);
          formHtml += fieldHtml;
        }
      });

      formHtml += "</div>";
      return formHtml;
    },

    /**
     * Build environment associations section
     * @param {Object} environment - Environment data
     * @returns {string} Associations HTML
     */
    buildEnvironmentAssociationsSection: function (environment) {
      console.log(
        "Building environment associations section for:",
        environment,
      );
      let associationsHtml = '<div class="form-section"><h4>Associations</h4>';

      // Current applications summary
      associationsHtml += '<div class="associations-summary">';
      associationsHtml += "<h5>Current Applications</h5>";

      if (environment.applications && environment.applications.length > 0) {
        console.log("Found applications:", environment.applications);
        associationsHtml += '<div class="current-associations">';
        environment.applications.forEach((app) => {
          console.log("Creating button for app:", app);
          associationsHtml += `
                        <div class="association-summary-item">
                            <span><strong>${app.app_code}</strong> - ${app.app_name}</span>
                            <button type="button" class="btn-danger btn-small" onclick="console.log('Button clicked'); ModalManager.removeApp(${environment.env_id}, ${app.app_id}); return false;">Remove</button>
                        </div>
                    `;
        });
        associationsHtml += "</div>";
      } else {
        associationsHtml +=
          '<p class="no-associations">No applications associated</p>';
      }

      // Add new application
      associationsHtml += `
                <div class="add-association">
                    <label>Add Application:</label>
                    <div class="association-controls">
                        <select id="applicationSelect" class="form-control">
                            <option value="">Select Application...</option>
                        </select>
                        <button type="button" class="btn-primary" onclick="ModalManager.addApplicationAssociation(${environment.env_id})">Add</button>
                    </div>
                </div>
            `;

      associationsHtml += "</div>"; // Close applications summary

      // Current iterations summary
      associationsHtml += '<div class="associations-summary">';
      associationsHtml += "<h5>Current Iterations</h5>";

      if (environment.iterations && environment.iterations.length > 0) {
        // Group iterations by role
        const iterationsByRole = {};
        environment.iterations.forEach((iteration) => {
          const roleName = iteration.role_name || "Unknown Role";
          if (!iterationsByRole[roleName]) {
            iterationsByRole[roleName] = [];
          }
          iterationsByRole[roleName].push(iteration);
        });

        associationsHtml += '<div class="current-associations">';
        Object.keys(iterationsByRole).forEach((roleName) => {
          associationsHtml += `<div class="role-group-summary">`;
          associationsHtml += `<h6>${roleName}</h6>`;
          iterationsByRole[roleName].forEach((iteration) => {
            associationsHtml += `
                            <div class="association-summary-item">
                                <span><strong>${iteration.ite_name}</strong></span>
                                <button type="button" class="btn-danger btn-small" onclick="ModalManager.removeIteration(${environment.env_id}, '${iteration.ite_id}'); return false;">Remove</button>
                            </div>
                        `;
          });
          associationsHtml += "</div>";
        });
        associationsHtml += "</div>";
      } else {
        associationsHtml +=
          '<p class="no-associations">No iterations associated</p>';
      }

      // Add new iteration
      associationsHtml += `
                <div class="add-association">
                    <label>Add Iteration:</label>
                    <div class="association-controls">
                        <select id="iterationSelect" class="form-control">
                            <option value="">Select Iteration...</option>
                        </select>
                        <select id="roleSelect" class="form-control">
                            <option value="">Select Role...</option>
                        </select>
                        <button type="button" class="btn-primary" onclick="ModalManager.addIterationAssociation(${environment.env_id})">Add</button>
                    </div>
                </div>
            `;

      associationsHtml += "</div>"; // Close iterations summary
      associationsHtml += "</div>"; // Close form section

      return associationsHtml;
    },

    /**
     * Setup environment form handlers
     * @param {Object} environment - Environment data
     * @param {boolean} isCreate - Whether this is create mode
     */
    setupEnvironmentFormHandlers: function (environment, isCreate) {
      // Set form data if editing
      if (environment && !isCreate) {
        this.setFormData(environment);
      }

      // Set up save button handler
      document.getElementById("saveEntityBtn").onclick = () => {
        this.saveEnvironment(environment, isCreate);
      };

      // Set up cancel button handler
      document.getElementById("cancelBtn").onclick = () => {
        this.closeModal();
      };

      // Set up close button handler
      document.querySelector(".modal-close").onclick = () => {
        this.closeModal();
      };

      // Event delegation is now handled via inline onclick handlers
    },

    /**
     * Load dropdown data for associations
     */
    loadAssociationDropdowns: function () {
      if (!window.ApiClient) {
        console.error("API client not available");
        return;
      }

      // Load applications
      window.ApiClient.applications
        .getAll()
        .then((applications) => {
          const select = document.getElementById("applicationSelect");
          if (select) {
            select.innerHTML = this.createSelectOptions(
              applications,
              "app_id",
              "app_name",
            );
          }
        })
        .catch((error) => {
          console.error("Failed to load applications:", error);
        });

      // Load iterations
      window.ApiClient.iterations
        .getAll()
        .then((iterations) => {
          const select = document.getElementById("iterationSelect");
          if (select) {
            select.innerHTML = this.createSelectOptions(
              iterations,
              "ite_id",
              "ite_name",
            );
          }
        })
        .catch((error) => {
          console.error("Failed to load iterations:", error);
        });

      // Load environment roles
      window.ApiClient.environments
        .getRoles()
        .then((roles) => {
          const select = document.getElementById("roleSelect");
          if (select) {
            select.innerHTML = this.createSelectOptions(
              roles,
              "enr_id",
              "enr_name",
            );
          }
        })
        .catch((error) => {
          console.error("Failed to load environment roles:", error);
        });
    },

    /**
     * Add application association
     * @param {number} envId - Environment ID
     */
    addApplicationAssociation: function (envId) {
      const select = document.getElementById("applicationSelect");
      const appId = select.value;

      if (!appId) {
        if (window.UiUtils) {
          window.UiUtils.showNotification(
            "Please select an application",
            "error",
          );
        }
        return;
      }

      window.ApiClient.environments
        .associateApplication(envId, appId)
        .then(() => {
          if (window.UiUtils) {
            window.UiUtils.showNotification(
              "Application associated successfully",
              "success",
            );
          }
          // Refresh the modal
          this.closeModal();
          this.showEnvironmentEditModal(envId);
        })
        .catch((error) => {
          console.error("Failed to associate application:", error);
          if (window.UiUtils) {
            window.UiUtils.showNotification(
              "Failed to associate application",
              "error",
            );
          }
        });
    },

    /**
     * Remove application association
     * @param {Event} event - Click event (can be null)
     * @param {number} envId - Environment ID
     * @param {number} appId - Application ID
     */
    removeApplicationAssociation: function (event, envId, appId) {
      // Prevent form submission and event bubbling if event exists
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      // Show custom confirmation dialog
      this.showConfirmationDialog(
        "Remove Application Association",
        "Are you sure you want to remove this application association?",
        () => {
          // Confirmed - proceed with removal
          window.ApiClient.environments
            .disassociateApplication(envId, appId)
            .then(() => {
              if (window.UiUtils) {
                window.UiUtils.showNotification(
                  "Application association removed successfully",
                  "success",
                );
              }
              // Refresh the modal
              this.closeModal();
              this.showEnvironmentEditModal(envId);
            })
            .catch((error) => {
              console.error("Failed to remove application association:", error);
              if (window.UiUtils) {
                window.UiUtils.showNotification(
                  "Failed to remove application association",
                  "error",
                );
              }
            });
        },
      );
    },

    /**
     * Add iteration association
     * @param {number} envId - Environment ID
     */
    addIterationAssociation: function (envId) {
      const iterationSelect = document.getElementById("iterationSelect");
      const roleSelect = document.getElementById("roleSelect");
      const iterationId = iterationSelect.value;
      const roleId = roleSelect.value;

      if (!iterationId || !roleId) {
        if (window.UiUtils) {
          window.UiUtils.showNotification(
            "Please select both iteration and role",
            "error",
          );
        }
        return;
      }

      window.ApiClient.environments
        .associateIteration(envId, iterationId, roleId)
        .then(() => {
          if (window.UiUtils) {
            window.UiUtils.showNotification(
              "Iteration associated successfully",
              "success",
            );
          }
          // Refresh the modal
          this.closeModal();
          this.showEnvironmentEditModal(envId);
        })
        .catch((error) => {
          console.error("Failed to associate iteration:", error);
          if (window.UiUtils) {
            window.UiUtils.showNotification(
              "Failed to associate iteration",
              "error",
            );
          }
        });
    },

    /**
     * Remove iteration association
     * @param {Event} event - Click event (can be null)
     * @param {number} envId - Environment ID
     * @param {string} iterationId - Iteration ID
     */
    removeIterationAssociation: async function (event, envId, iterationId) {
      // Prevent form submission and event bubbling if event exists
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      // Show custom confirmation dialog
      const confirmed = await this.showSimpleConfirm(
        "Are you sure you want to remove this iteration association?",
      );

      if (confirmed) {
        window.ApiClient.environments
          .disassociateIteration(envId, iterationId)
          .then(() => {
            if (window.UiUtils) {
              window.UiUtils.showNotification(
                "Iteration association removed successfully",
                "success",
              );
            }
            // Refresh the modal
            this.closeModal();
            this.showEnvironmentEditModal(envId);
          })
          .catch((error) => {
            console.error("Failed to remove iteration association:", error);
            if (window.UiUtils) {
              window.UiUtils.showNotification(
                "Failed to remove iteration association",
                "error",
              );
            }
          });
      }
    },

    /**
     * Show custom confirmation dialog
     * @param {string} title - Dialog title
     * @param {string} message - Dialog message
     * @param {Function} onConfirm - Callback when confirmed
     * @param {Function} onCancel - Optional callback when cancelled
     */
    showConfirmationDialog: function (title, message, onConfirm, onCancel) {
      // Let's just use the native confirm for now to ensure it works
      console.log("Showing confirmation dialog:", title, message);

      // Use setTimeout to delay the confirm dialog
      setTimeout(() => {
        const result = window.confirm(message);
        console.log("Confirm result:", result);

        if (result && onConfirm) {
          onConfirm();
        } else if (!result && onCancel) {
          onCancel();
        }
      }, 10);
    },

    /**
     * Simple remove application function
     * @param {number} envId - Environment ID
     * @param {number} appId - Application ID
     */
    removeApp: async function (envId, appId) {
      console.log("removeApp called with:", envId, appId);

      // Create a simple custom confirmation
      const confirmed = await this.showSimpleConfirm(
        "Are you sure you want to remove this application association?",
      );

      if (confirmed) {
        console.log("User confirmed, proceeding with removal");
        window.ApiClient.environments
          .disassociateApplication(envId, appId)
          .then(() => {
            console.log("Application association removed successfully");
            if (window.UiUtils) {
              window.UiUtils.showNotification(
                "Application association removed successfully",
                "success",
              );
            }
            this.closeModal();
            this.showEnvironmentEditModal(envId);
          })
          .catch((error) => {
            console.error("Failed to remove application association:", error);
            if (window.UiUtils) {
              window.UiUtils.showNotification(
                "Failed to remove application association",
                "error",
              );
            }
          });
      } else {
        console.log("User cancelled removal");
      }
    },

    /**
     * Show a simple confirmation dialog
     * @param {string} message - Confirmation message
     * @returns {boolean} Whether confirmed
     */
    showSimpleConfirm: function (message) {
      // Create a blocking confirmation dialog
      const overlay = document.createElement("div");
      overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

      const dialog = document.createElement("div");
      dialog.style.cssText = `
                background: white;
                padding: 20px;
                border-radius: 5px;
                max-width: 400px;
                text-align: center;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            `;

      const messageEl = document.createElement("p");
      messageEl.textContent = message;
      messageEl.style.cssText = "margin: 0 0 20px 0; font-size: 14px;";

      const buttonContainer = document.createElement("div");
      buttonContainer.style.cssText =
        "display: flex; gap: 10px; justify-content: center;";

      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "Cancel";
      cancelBtn.style.cssText =
        "padding: 8px 16px; border: 1px solid #ccc; background: white; cursor: pointer; border-radius: 3px;";

      const confirmBtn = document.createElement("button");
      confirmBtn.textContent = "OK";
      confirmBtn.style.cssText =
        "padding: 8px 16px; border: none; background: #0052CC; color: white; cursor: pointer; border-radius: 3px;";

      let result = false;

      const cleanup = () => {
        document.body.removeChild(overlay);
      };

      cancelBtn.onclick = () => {
        result = false;
        cleanup();
      };

      confirmBtn.onclick = () => {
        result = true;
        cleanup();
      };

      buttonContainer.appendChild(cancelBtn);
      buttonContainer.appendChild(confirmBtn);
      dialog.appendChild(messageEl);
      dialog.appendChild(buttonContainer);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      // Focus the confirm button
      confirmBtn.focus();

      // Wait for user interaction using a synchronous approach
      return new Promise((resolve) => {
        const originalOnClick = confirmBtn.onclick;
        const originalOnClickCancel = cancelBtn.onclick;

        confirmBtn.onclick = () => {
          cleanup();
          resolve(true);
        };

        cancelBtn.onclick = () => {
          cleanup();
          resolve(false);
        };
      });
    },

    /**
     * Simple remove iteration function
     * @param {number} envId - Environment ID
     * @param {string} iterationId - Iteration ID
     */
    removeIteration: async function (envId, iterationId) {
      console.log("removeIteration called with:", envId, iterationId);

      // Use custom confirmation dialog
      const confirmed = await this.showSimpleConfirm(
        "Are you sure you want to remove this iteration association?",
      );

      if (confirmed) {
        console.log("User confirmed, proceeding with removal");
        window.ApiClient.environments
          .disassociateIteration(envId, iterationId)
          .then(() => {
            console.log("Iteration association removed successfully");
            if (window.UiUtils) {
              window.UiUtils.showNotification(
                "Iteration association removed successfully",
                "success",
              );
            }
            this.closeModal();
            this.showEnvironmentEditModal(envId);
          })
          .catch((error) => {
            console.error("Failed to remove iteration association:", error);
            if (window.UiUtils) {
              window.UiUtils.showNotification(
                "Failed to remove iteration association",
                "error",
              );
            }
          });
      } else {
        console.log("User cancelled removal");
      }
    },

    /**
     * Save environment
     * @param {Object} environment - Current environment data
     * @param {boolean} isCreate - Whether this is create mode
     */
    saveEnvironment: function (environment, isCreate) {
      const form = document.getElementById("environmentForm");
      const formData = this.getFormData(form);

      const promise = isCreate
        ? window.ApiClient.environments.create(formData)
        : window.ApiClient.environments.update(environment.env_id, formData);

      promise
        .then((response) => {
          console.log("Environment saved successfully:", response);
          if (window.UiUtils) {
            window.UiUtils.showNotification(
              `Environment ${isCreate ? "created" : "updated"} successfully`,
              "success",
            );
          }

          this.closeModal();

          // Refresh the table
          if (window.AdminGuiController) {
            window.AdminGuiController.loadCurrentSection();
          }
        })
        .catch((error) => {
          console.error("Failed to save environment:", error);

          let errorMessage = `Failed to ${isCreate ? "create" : "update"} environment`;
          if (error.message) {
            errorMessage += `: ${error.message}`;
          }

          if (window.UiUtils) {
            window.UiUtils.showNotification(errorMessage, "error");
          }
        });
    },

    /**
     * Show Team VIEW modal
     * @param {number} teamId - Team ID
     */
    showTeamViewModal: function (teamId) {
      console.log("showTeamViewModal called with teamId:", teamId);

      // Load team data
      Promise.all([
        window.ApiClient.teams.getById(teamId),
        window.ApiClient.teams.getMembers(teamId),
        window.ApiClient.teams.getApplications(teamId),
      ])
        .then(([team, members, applications]) => {
          console.log("Team data:", team);
          console.log("Members:", members);
          console.log("Applications:", applications);

          let modalHtml = `
                    <div class="modal-overlay" id="viewModal">
                        <div class="modal modal-large">
                            <div class="modal-header">
                                <h3 class="modal-title">Team Details: ${team.tms_name}</h3>
                                <button class="modal-close">×</button>
                            </div>
                            <div class="modal-body">
                                <div class="env-details">
                                    <div class="detail-section">
                                        <h4>Team Information</h4>
                                        <p><strong>Name:</strong> ${team.tms_name}</p>
                                        <p><strong>Description:</strong> ${team.tms_description || "No description"}</p>
                                        <p><strong>Email:</strong> ${team.tms_email || "No email"}</p>
                                    </div>
                                    
                                    <div class="detail-section">
                                        <h4>Team Members</h4>
                                        ${this.renderTeamMembers(members)}
                                    </div>
                                    
                                    <div class="detail-section">
                                        <h4>Associated Applications</h4>
                                        ${this.renderTeamApplications(applications)}
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button class="btn-primary" onclick="ModalManager.showTeamEditModal(${teamId})">Edit Team</button>
                                <button class="btn-secondary" onclick="ModalManager.closeModal()">Close</button>
                            </div>
                        </div>
                    </div>
                `;

          document.body.insertAdjacentHTML("beforeend", modalHtml);
        })
        .catch((error) => {
          console.error("Failed to load team data:", error);
          if (window.UiUtils) {
            window.UiUtils.showNotification(
              "Failed to load team data",
              "error",
            );
          }
        });
    },

    /**
     * Show Team EDIT modal
     * @param {number} teamId - Team ID (null for create)
     */
    showTeamEditModal: function (teamId) {
      console.log("showTeamEditModal called with teamId:", teamId);

      const isCreate = !teamId;

      if (isCreate) {
        // For create mode, only load available users and applications
        Promise.all([
          window.ApiClient.users.getAll({ active: "true" }),
          window.ApiClient.applications.getAll(),
        ])
          .then(([allUsersResponse, allApplications]) => {
            // Handle paginated response for users
            const allUsers =
              allUsersResponse && allUsersResponse.content
                ? allUsersResponse.content
                : Array.isArray(allUsersResponse)
                  ? allUsersResponse
                  : [];
            console.log("All users for dropdown:", allUsers);

            // Create modal for new team
            this.renderTeamEditModal(
              null,
              [],
              [],
              allUsers,
              allApplications,
              true,
            );
          })
          .catch((error) => {
            console.error("Failed to load data for team creation:", error);
            if (window.UiUtils) {
              window.UiUtils.showNotification(
                "Failed to load team creation data",
                "error",
              );
            }
          });
      } else {
        // For edit mode, load team data and available items
        Promise.all([
          window.ApiClient.teams.getById(teamId),
          window.ApiClient.teams.getMembers(teamId),
          window.ApiClient.teams.getApplications(teamId),
          window.ApiClient.users.getAll({ active: "true" }),
          window.ApiClient.applications.getAll(),
        ])
          .then(
            ([
              team,
              members,
              applications,
              allUsersResponse,
              allApplications,
            ]) => {
              console.log("Team edit data:", team);

              // Handle paginated response for users
              const allUsers =
                allUsersResponse && allUsersResponse.content
                  ? allUsersResponse.content
                  : Array.isArray(allUsersResponse)
                    ? allUsersResponse
                    : [];
              console.log("All users for dropdown:", allUsers);
              console.log("First user object:", allUsers[0]);

              // Create modal for editing existing team
              this.renderTeamEditModal(
                team,
                members,
                applications,
                allUsers,
                allApplications,
                false,
              );
            },
          )
          .catch((error) => {
            console.error("Failed to load team edit data:", error);
            if (window.UiUtils) {
              window.UiUtils.showNotification(
                "Failed to load team data",
                "error",
              );
            }
          });
      }
    },

    /**
     * Render Team EDIT modal
     * @param {Object} team - Team data (null for create)
     * @param {Array} members - Team members
     * @param {Array} applications - Team applications
     * @param {Array} allUsers - All available users
     * @param {Array} allApplications - All available applications
     * @param {boolean} isCreate - Whether this is create mode
     */
    renderTeamEditModal: function (
      team,
      members,
      applications,
      allUsers,
      allApplications,
      isCreate,
    ) {
      const teamId = team ? team.tms_id : null;
      const title = isCreate
        ? "Create New Team"
        : `Edit Team: ${team.tms_name}`;
      const buttonText = isCreate ? "Create Team" : "Save Changes";

      let modalHtml = `
                <div class="modal-overlay" id="editModal">
                    <div class="modal modal-large">
                        <div class="modal-header">
                            <h3 class="modal-title">${title}</h3>
                            <button class="modal-close">×</button>
                        </div>
                        <div class="modal-body">
                            <div id="teamFormWrapper">
                                <form id="teamForm">
                                    <div class="form-group">
                                        <label for="tms_name">Team Name:</label>
                                        <input type="text" id="tms_name" name="tms_name" value="${team ? team.tms_name : ""}" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="tms_description">Description:</label>
                                        <textarea id="tms_description" name="tms_description">${team ? team.tms_description || "" : ""}</textarea>
                                    </div>
                                    <div class="form-group">
                                        <label for="tms_email">Email:</label>
                                        <input type="email" id="tms_email" name="tms_email" value="${team ? team.tms_email || "" : ""}">
                                    </div>
                                </form>
                                <div id="associationsWrapper">`;

      // Only show associations for existing teams (not for create)
      if (!isCreate) {
        modalHtml += `
                                    <div class="detail-section">
                                        <h4>Team Members</h4>
                                        ${this.renderTeamMembersEdit(members, allUsers, teamId)}
                                    </div>
                                    
                                    <div class="detail-section">
                                        <h4>Associated Applications</h4>
                                        ${this.renderTeamApplicationsEdit(applications, allApplications, teamId)}
                                    </div>`;
      }

      modalHtml += `
                                </div>
                            </div>`;

      modalHtml += `
                        </div>
                        <div class="modal-footer">
                            <button class="btn-primary" onclick="ModalManager.saveTeam(${teamId})">${buttonText}</button>
                            <button class="btn-secondary" onclick="ModalManager.closeModal()">Cancel</button>
                        </div>
                    </div>
                </div>
            `;

      document.body.insertAdjacentHTML("beforeend", modalHtml);
    },

    /**
     * Render team members for VIEW mode
     * @param {Array} members - Team members
     * @returns {string} HTML string
     */
    renderTeamMembers: function (members) {
      if (!members || members.length === 0) {
        return '<p class="no-associations">No members assigned</p>';
      }

      let html = '<div class="associations-list">';
      members.forEach((member) => {
        html += `
                    <div class="association-item">
                        <span><strong>${member.usr_name}</strong> (${member.usr_code})</span>
                        <span class="association-details">${member.usr_email}</span>
                    </div>
                `;
      });
      html += "</div>";

      return html;
    },

    /**
     * Render team applications for VIEW mode
     * @param {Array} applications - Team applications
     * @returns {string} HTML string
     */
    renderTeamApplications: function (applications) {
      if (!applications || applications.length === 0) {
        return '<p class="no-associations">No applications assigned</p>';
      }

      let html = '<div class="associations-list">';
      applications.forEach((app) => {
        html += `
                    <div class="association-item">
                        <span><strong>${app.app_name}</strong> (${app.app_code})</span>
                        <span class="association-details">${app.app_description || "No description"}</span>
                    </div>
                `;
      });
      html += "</div>";

      return html;
    },

    /**
     * Render team members for EDIT mode
     * @param {Array} members - Current team members
     * @param {Array} allUsers - All available users
     * @param {number} teamId - Team ID
     * @returns {string} HTML string
     */
    renderTeamMembersEdit: function (members, allUsers, teamId) {
      let html = '<div class="associations-edit">';

      // Show current members
      if (members && members.length > 0) {
        html += '<div class="current-associations">';
        members.forEach((member) => {
          html += `
                        <div class="association-item">
                            <span><strong>${member.usr_name}</strong> (${member.usr_code})</span>
                            <span class="association-details">${member.usr_email}</span>
                            <button type="button" class="btn-danger btn-small" onclick="ModalManager.removeTeamMember(${teamId}, ${member.usr_id}); return false;">Remove</button>
                        </div>
                    `;
        });
        html += "</div>";
      } else {
        html += '<p class="no-associations">No members assigned</p>';
      }

      // Add new member section
      html += `
                <div class="add-association">
                    <label>Add Member:</label>
                    <div class="association-controls">
                        <select id="userSelect" class="form-control">
                            ${this.createUserSelectOptions(allUsers)}
                        </select>
                        <button type="button" class="btn-primary btn-small" onclick="ModalManager.addTeamMember(${teamId})">Add</button>
                    </div>
                </div>
            `;

      html += "</div>";
      return html;
    },

    /**
     * Render team applications for EDIT mode
     * @param {Array} applications - Current team applications
     * @param {Array} allApplications - All available applications
     * @param {number} teamId - Team ID
     * @returns {string} HTML string
     */
    renderTeamApplicationsEdit: function (
      applications,
      allApplications,
      teamId,
    ) {
      let html = '<div class="associations-edit">';

      // Show current applications
      if (applications && applications.length > 0) {
        html += '<div class="current-associations">';
        applications.forEach((app) => {
          html += `
                        <div class="association-item">
                            <span><strong>${app.app_name}</strong> (${app.app_code})</span>
                            <span class="association-details">${app.app_description || "No description"}</span>
                            <button type="button" class="btn-danger btn-small" onclick="ModalManager.removeTeamApplication(${teamId}, ${app.app_id}); return false;">Remove</button>
                        </div>
                    `;
        });
        html += "</div>";
      } else {
        html += '<p class="no-associations">No applications assigned</p>';
      }

      // Add new application section
      html += `
                <div class="add-association">
                    <label>Add Application:</label>
                    <div class="association-controls">
                        <select id="applicationSelect" class="form-control">
                            ${this.createSelectOptions(allApplications, "app_id", "app_name")}
                        </select>
                        <button type="button" class="btn-primary btn-small" onclick="ModalManager.addTeamApplication(${teamId})">Add</button>
                    </div>
                </div>
            `;

      html += "</div>";
      return html;
    },

    /**
     * Add team member
     * @param {number} teamId - Team ID
     */
    addTeamMember: function (teamId) {
      const userSelect = document.getElementById("userSelect");
      const userId = userSelect.value;

      if (!userId) {
        if (window.UiUtils) {
          window.UiUtils.showNotification("Please select a user", "error");
        }
        return;
      }

      window.ApiClient.teams
        .addMember(teamId, userId)
        .then(() => {
          if (window.UiUtils) {
            window.UiUtils.showNotification(
              "Member added successfully",
              "success",
            );
          }
          // Refresh the modal
          this.closeModal();
          this.showTeamEditModal(teamId);
        })
        .catch((error) => {
          console.error("Failed to add team member:", error);
          if (window.UiUtils) {
            window.UiUtils.showNotification(
              "Failed to add team member",
              "error",
            );
          }
        });
    },

    /**
     * Remove team member
     * @param {number} teamId - Team ID
     * @param {number} userId - User ID
     */
    removeTeamMember: async function (teamId, userId) {
      const confirmed = await this.showSimpleConfirm(
        "Are you sure you want to remove this member from the team?",
      );

      if (confirmed) {
        window.ApiClient.teams
          .removeMember(teamId, userId)
          .then(() => {
            if (window.UiUtils) {
              window.UiUtils.showNotification(
                "Member removed successfully",
                "success",
              );
            }
            // Refresh the modal
            this.closeModal();
            this.showTeamEditModal(teamId);
          })
          .catch((error) => {
            console.error("Failed to remove team member:", error);
            if (window.UiUtils) {
              window.UiUtils.showNotification(
                "Failed to remove team member",
                "error",
              );
            }
          });
      }
    },

    /**
     * Add team application
     * @param {number} teamId - Team ID
     */
    addTeamApplication: function (teamId) {
      const applicationSelect = document.getElementById("applicationSelect");
      const applicationId = applicationSelect.value;

      if (!applicationId) {
        if (window.UiUtils) {
          window.UiUtils.showNotification(
            "Please select an application",
            "error",
          );
        }
        return;
      }

      window.ApiClient.teams
        .addApplication(teamId, applicationId)
        .then(() => {
          if (window.UiUtils) {
            window.UiUtils.showNotification(
              "Application added successfully",
              "success",
            );
          }
          // Refresh the modal
          this.closeModal();
          this.showTeamEditModal(teamId);
        })
        .catch((error) => {
          console.error("Failed to add team application:", error);
          if (window.UiUtils) {
            window.UiUtils.showNotification(
              "Failed to add team application",
              "error",
            );
          }
        });
    },

    /**
     * Remove team application
     * @param {number} teamId - Team ID
     * @param {number} applicationId - Application ID
     */
    removeTeamApplication: async function (teamId, applicationId) {
      const confirmed = await this.showSimpleConfirm(
        "Are you sure you want to remove this application from the team?",
      );

      if (confirmed) {
        window.ApiClient.teams
          .removeApplication(teamId, applicationId)
          .then(() => {
            if (window.UiUtils) {
              window.UiUtils.showNotification(
                "Application removed successfully",
                "success",
              );
            }
            // Refresh the modal
            this.closeModal();
            this.showTeamEditModal(teamId);
          })
          .catch((error) => {
            console.error("Failed to remove team application:", error);
            if (window.UiUtils) {
              window.UiUtils.showNotification(
                "Failed to remove team application",
                "error",
              );
            }
          });
      }
    },

    /**
     * Save team changes
     * @param {number} teamId - Team ID
     */
    saveTeam: function (teamId) {
      const form = document.getElementById("teamForm");
      const formData = this.getFormData(form);
      const isCreate = !teamId;

      const apiCall = isCreate
        ? window.ApiClient.teams.create(formData)
        : window.ApiClient.teams.update(teamId, formData);

      const successMessage = isCreate
        ? "Team created successfully"
        : "Team updated successfully";

      apiCall
        .then((response) => {
          console.log("Team saved successfully:", response);
          if (window.UiUtils) {
            window.UiUtils.showNotification(successMessage, "success");
          }

          this.closeModal();

          // Refresh the table
          if (window.AdminGuiController) {
            window.AdminGuiController.loadCurrentSection();
          }
        })
        .catch((error) => {
          console.error("Failed to save team:", error);

          let errorMessage = "Failed to save team changes";
          if (error.message) {
            errorMessage = error.message;
          }

          if (window.UiUtils) {
            window.UiUtils.showNotification(errorMessage, "error");
          }
        });
    },

    /**
     * Create select options (fallback if UiUtils not available)
     * @param {Array} items - Items array
     * @param {string} valueField - Value field name
     * @param {string} textField - Text field name
     * @returns {string} Options HTML
     */
    createSelectOptions: function (items, valueField, textField) {
      let options = '<option value="">Select...</option>';

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
     * Create select options for users (handles name concatenation)
     * @param {Array} users - Array of user objects
     * @returns {string} HTML option elements
     */
    createUserSelectOptions: function (users) {
      let options = '<option value="">Select...</option>';

      if (users && users.length > 0) {
        users.forEach((user) => {
          const value = user.usr_id || "";
          const firstName = user.usr_first_name || "";
          const lastName = user.usr_last_name || "";
          const displayName = `${firstName} ${lastName}`.trim();
          const userCode = user.usr_code ? ` (${user.usr_code})` : "";
          const text = displayName + userCode;
          options += `<option value="${value}">${text}</option>`;
        });
      }

      return options;
    },

    /**
     * Show Application VIEW modal
     * @param {number} appId - Application ID
     */
    showApplicationViewModal: function (appId) {
      console.log("showApplicationViewModal called with appId:", appId);

      // Load application data
      Promise.all([
        window.ApiClient.applications.getById(appId),
        window.ApiClient.applications.getEnvironments(appId),
        window.ApiClient.applications.getTeams(appId),
        window.ApiClient.applications.getLabels(appId),
      ])
        .then(([application, environments, teams, labels]) => {
          console.log("Application data:", application);
          console.log("Environments:", environments);
          console.log("Teams:", teams);
          console.log("Labels:", labels);

          let modalHtml = `
                    <div class="modal-overlay" id="viewModal">
                        <div class="modal modal-large">
                            <div class="modal-header">
                                <h3 class="modal-title">Application Details: ${application.app_name || application.app_code}</h3>
                                <button class="modal-close">×</button>
                            </div>
                            <div class="modal-body">
                                <div class="env-details">
                                    <div class="detail-section">
                                        <h4>Application Information</h4>
                                        <p><strong>Code:</strong> ${application.app_code}</p>
                                        <p><strong>Name:</strong> ${application.app_name || "No name"}</p>
                                        <p><strong>Description:</strong> ${application.app_description || "No description"}</p>
                                    </div>
                                    
                                    <div class="detail-section">
                                        <h4>Associated Labels</h4>
                                        ${this.renderApplicationLabels(labels)}
                                    </div>
                                    
                                    <div class="detail-section">
                                        <h4>Associated Environments</h4>
                                        ${this.renderApplicationEnvironments(environments)}
                                    </div>
                                    
                                    <div class="detail-section">
                                        <h4>Associated Teams</h4>
                                        ${this.renderApplicationTeams(teams)}
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button class="btn-primary" onclick="ModalManager.showApplicationEditModal(${appId})">Edit Application</button>
                                <button class="btn-secondary" onclick="ModalManager.closeModal()">Close</button>
                            </div>
                        </div>
                    </div>
                `;

          document.body.insertAdjacentHTML("beforeend", modalHtml);
        })
        .catch((error) => {
          console.error("Failed to load application data:", error);
          if (window.UiUtils) {
            window.UiUtils.showNotification(
              "Failed to load application data",
              "error",
            );
          }
        });
    },

    /**
     * Show Application EDIT modal
     * @param {number} appId - Application ID (null for create)
     */
    showApplicationEditModal: function (appId) {
      console.log("showApplicationEditModal called with appId:", appId);

      const isCreate = !appId;

      if (isCreate) {
        // For create mode, only load available environments, teams, and labels
        Promise.all([
          window.ApiClient.environments.getAll(),
          window.ApiClient.teams.getAll(),
          window.ApiClient.labels.getAll(),
        ])
          .then(([environmentsResponse, teamsResponse, labelsResponse]) => {
            // Handle paginated responses
            const allEnvironments =
              environmentsResponse.data || environmentsResponse;
            const allTeams = teamsResponse.data || teamsResponse;
            const allLabels = labelsResponse.data || labelsResponse;

            // Create modal for new application
            this.renderApplicationEditModal(
              null,
              [],
              [],
              [],
              allEnvironments,
              allTeams,
              allLabels,
              true,
            );
          })
          .catch((error) => {
            console.error(
              "Failed to load data for application creation:",
              error,
            );
            if (window.UiUtils) {
              window.UiUtils.showNotification(
                "Failed to load application creation data",
                "error",
              );
            }
          });
      } else {
        // For edit mode, load application data and available items
        Promise.all([
          window.ApiClient.applications.getById(appId),
          window.ApiClient.applications.getEnvironments(appId),
          window.ApiClient.applications.getTeams(appId),
          window.ApiClient.applications.getLabels(appId),
          window.ApiClient.environments.getAll(),
          window.ApiClient.teams.getAll(),
          window.ApiClient.labels.getAll(),
        ])
          .then(
            ([
              application,
              environments,
              teams,
              labels,
              environmentsResponse,
              teamsResponse,
              labelsResponse,
            ]) => {
              console.log("Application edit data:", application);

              // Handle paginated responses
              const allEnvironments =
                environmentsResponse.data || environmentsResponse;
              const allTeams = teamsResponse.data || teamsResponse;
              const allLabels = labelsResponse.data || labelsResponse;

              // Create modal for editing existing application
              this.renderApplicationEditModal(
                application,
                environments,
                teams,
                labels,
                allEnvironments,
                allTeams,
                allLabels,
                false,
              );
            },
          )
          .catch((error) => {
            console.error("Failed to load application edit data:", error);
            if (window.UiUtils) {
              window.UiUtils.showNotification(
                "Failed to load application data",
                "error",
              );
            }
          });
      }
    },

    /**
     * Render Application EDIT modal
     * @param {Object} application - Application data (null for create)
     * @param {Array} environments - Application environments
     * @param {Array} teams - Application teams
     * @param {Array} labels - Application labels
     * @param {Array} allEnvironments - All available environments
     * @param {Array} allTeams - All available teams
     * @param {Array} allLabels - All available labels
     * @param {boolean} isCreate - Whether this is create mode
     */
    renderApplicationEditModal: function (
      application,
      environments,
      teams,
      labels,
      allEnvironments,
      allTeams,
      allLabels,
      isCreate,
    ) {
      const appId = application ? application.app_id : null;
      const title = isCreate
        ? "Create New Application"
        : `Edit Application: ${application.app_name || application.app_code}`;
      const buttonText = isCreate ? "Create Application" : "Save Changes";

      let modalHtml = `
                <div class="modal-overlay" id="editModal">
                    <div class="modal modal-large">
                        <div class="modal-header">
                            <h3 class="modal-title">${title}</h3>
                            <button class="modal-close">×</button>
                        </div>
                        <div class="modal-body">
                            <div id="applicationFormWrapper">
                                <form id="applicationForm">
                                    <div class="form-group">
                                        <label for="app_code">Application Code:</label>
                                        <input type="text" id="app_code" name="app_code" value="${application ? application.app_code : ""}" required maxlength="50">
                                    </div>
                                    <div class="form-group">
                                        <label for="app_name">Application Name:</label>
                                        <input type="text" id="app_name" name="app_name" value="${application ? application.app_name || "" : ""}" maxlength="64">
                                    </div>
                                    <div class="form-group">
                                        <label for="app_description">Description:</label>
                                        <textarea id="app_description" name="app_description">${application ? application.app_description || "" : ""}</textarea>
                                    </div>
                                </form>
                                <div id="associationsWrapper">`;

      // Only show associations for existing applications (not for create)
      if (!isCreate) {
        modalHtml += `
                                    <div class="detail-section">
                                        <h4>Associated Labels</h4>
                                        ${this.renderApplicationLabelsEdit(labels, allLabels, appId)}
                                    </div>
                                    
                                    <div class="detail-section">
                                        <h4>Associated Environments</h4>
                                        ${this.renderApplicationEnvironmentsEdit(environments, allEnvironments, appId)}
                                    </div>
                                    
                                    <div class="detail-section">
                                        <h4>Associated Teams</h4>
                                        ${this.renderApplicationTeamsEdit(teams, allTeams, appId)}
                                    </div>`;
      }

      modalHtml += `
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-primary" onclick="ModalManager.saveApplication(${appId})">${buttonText}</button>
                            <button class="btn-secondary" onclick="ModalManager.closeModal()">Cancel</button>
                        </div>
                    </div>
                </div>
            `;

      document.body.insertAdjacentHTML("beforeend", modalHtml);
    },

    /**
     * Render application environments for VIEW mode
     * @param {Array} environments - Application environments
     * @returns {string} HTML string
     */
    renderApplicationEnvironments: function (environments) {
      if (!environments || environments.length === 0) {
        return '<p class="no-associations">No environments associated</p>';
      }

      let html = '<div class="associations-list">';
      environments.forEach((env) => {
        html += `
                    <div class="association-item">
                        <span><strong>${env.env_name}</strong> (${env.env_code})</span>
                        <span class="association-details">${env.env_description || "No description"}</span>
                    </div>
                `;
      });
      html += "</div>";

      return html;
    },

    /**
     * Render application labels for VIEW mode
     * @param {Array} labels - Application labels
     * @returns {string} HTML string
     */
    renderApplicationLabels: function (labels) {
      if (!labels || labels.length === 0) {
        return '<p class="no-associations">No labels associated</p>';
      }

      let html = '<div class="associations-list">';
      labels.forEach((label) => {
        html += `
                    <div class="association-item">
                        <span class="label-tag" style="background-color: ${label.lbl_color || "#ccc"}; color: white; padding: 2px 8px; border-radius: 4px;">
                            ${label.lbl_name}
                        </span>
                    </div>
                `;
      });
      html += "</div>";

      return html;
    },

    /**
     * Render application teams for VIEW mode
     * @param {Array} teams - Application teams
     * @returns {string} HTML string
     */
    renderApplicationTeams: function (teams) {
      if (!teams || teams.length === 0) {
        return '<p class="no-associations">No teams associated</p>';
      }

      let html = '<div class="associations-list">';
      teams.forEach((team) => {
        html += `
                    <div class="association-item">
                        <span><strong>${team.tms_name}</strong></span>
                        <span class="association-details">${team.tms_description || "No description"}</span>
                    </div>
                `;
      });
      html += "</div>";

      return html;
    },

    /**
     * Render application labels for EDIT mode
     * @param {Array} labels - Current application labels
     * @param {Array} allLabels - All available labels
     * @param {number} appId - Application ID
     * @returns {string} HTML string
     */
    renderApplicationLabelsEdit: function (labels, allLabels, appId) {
      let html = '<div class="associations-edit">';

      // Show current labels
      if (labels && labels.length > 0) {
        html += '<div class="current-associations">';
        labels.forEach((label) => {
          html += `
                        <div class="association-item">
                            <span class="label-tag" style="background-color: ${label.lbl_color || "#ccc"}; color: white; padding: 2px 8px; border-radius: 4px;">
                                ${label.lbl_name}
                            </span>
                            <button type="button" class="btn-danger btn-small" onclick="ModalManager.removeApplicationLabel(${appId}, ${label.lbl_id}); return false;">Remove</button>
                        </div>
                    `;
        });
        html += "</div>";
      } else {
        html += '<p class="no-associations">No labels associated</p>';
      }

      // Add new label section
      html += `
                <div class="add-association">
                    <label>Add Label:</label>
                    <div class="association-controls">
                        <select id="labelSelect" class="form-control">
                            ${this.createSelectOptions(allLabels, "id", "name")}
                        </select>
                        <button type="button" class="btn-primary btn-small" onclick="ModalManager.addApplicationLabel(${appId})">Add</button>
                    </div>
                </div>
            `;

      html += "</div>";
      return html;
    },

    /**
     * Render application environments for EDIT mode
     * @param {Array} environments - Current application environments
     * @param {Array} allEnvironments - All available environments
     * @param {number} appId - Application ID
     * @returns {string} HTML string
     */
    renderApplicationEnvironmentsEdit: function (
      environments,
      allEnvironments,
      appId,
    ) {
      let html = '<div class="associations-edit">';

      // Show current environments
      if (environments && environments.length > 0) {
        html += '<div class="current-associations">';
        environments.forEach((env) => {
          html += `
                        <div class="association-item">
                            <span><strong>${env.env_name}</strong> (${env.env_code})</span>
                            <span class="association-details">${env.env_description || "No description"}</span>
                            <button type="button" class="btn-danger btn-small" onclick="ModalManager.removeApplicationEnvironment(${appId}, ${env.env_id}); return false;">Remove</button>
                        </div>
                    `;
        });
        html += "</div>";
      } else {
        html += '<p class="no-associations">No environments associated</p>';
      }

      // Add new environment section
      html += `
                <div class="add-association">
                    <label>Add Environment:</label>
                    <div class="association-controls">
                        <select id="environmentSelect" class="form-control">
                            ${this.createSelectOptions(allEnvironments, "env_id", "env_name")}
                        </select>
                        <button type="button" class="btn-primary btn-small" onclick="ModalManager.addApplicationEnvironment(${appId})">Add</button>
                    </div>
                </div>
            `;

      html += "</div>";
      return html;
    },

    /**
     * Render application teams for EDIT mode
     * @param {Array} teams - Current application teams
     * @param {Array} allTeams - All available teams
     * @param {number} appId - Application ID
     * @returns {string} HTML string
     */
    renderApplicationTeamsEdit: function (teams, allTeams, appId) {
      let html = '<div class="associations-edit">';

      // Show current teams
      if (teams && teams.length > 0) {
        html += '<div class="current-associations">';
        teams.forEach((team) => {
          html += `
                        <div class="association-item">
                            <span><strong>${team.tms_name}</strong></span>
                            <span class="association-details">${team.tms_description || "No description"}</span>
                            <button type="button" class="btn-danger btn-small" onclick="ModalManager.removeApplicationTeam(${appId}, ${team.tms_id}); return false;">Remove</button>
                        </div>
                    `;
        });
        html += "</div>";
      } else {
        html += '<p class="no-associations">No teams associated</p>';
      }

      // Add new team section
      html += `
                <div class="add-association">
                    <label>Add Team:</label>
                    <div class="association-controls">
                        <select id="teamSelect" class="form-control">
                            ${this.createSelectOptions(allTeams, "tms_id", "tms_name")}
                        </select>
                        <button type="button" class="btn-primary btn-small" onclick="ModalManager.addApplicationTeam(${appId})">Add</button>
                    </div>
                </div>
            `;

      html += "</div>";
      return html;
    },

    /**
     * Add application environment
     * @param {number} appId - Application ID
     */
    addApplicationEnvironment: function (appId) {
      const environmentSelect = document.getElementById("environmentSelect");
      const environmentId = environmentSelect.value;

      if (!environmentId) {
        if (window.UiUtils) {
          window.UiUtils.showNotification(
            "Please select an environment",
            "error",
          );
        }
        return;
      }

      window.ApiClient.applications
        .associateEnvironment(appId, environmentId)
        .then(() => {
          if (window.UiUtils) {
            window.UiUtils.showNotification(
              "Environment added successfully",
              "success",
            );
          }
          // Refresh the modal
          this.closeModal();
          this.showApplicationEditModal(appId);
        })
        .catch((error) => {
          console.error("Failed to add environment:", error);
          if (window.UiUtils) {
            window.UiUtils.showNotification(
              "Failed to add environment",
              "error",
            );
          }
        });
    },

    /**
     * Remove application environment
     * @param {number} appId - Application ID
     * @param {number} environmentId - Environment ID
     */
    removeApplicationEnvironment: async function (appId, environmentId) {
      const confirmed = await this.showSimpleConfirm(
        "Are you sure you want to remove this environment from the application?",
      );

      if (confirmed) {
        window.ApiClient.applications
          .disassociateEnvironment(appId, environmentId)
          .then(() => {
            if (window.UiUtils) {
              window.UiUtils.showNotification(
                "Environment removed successfully",
                "success",
              );
            }
            // Refresh the modal
            this.closeModal();
            this.showApplicationEditModal(appId);
          })
          .catch((error) => {
            console.error("Failed to remove environment:", error);
            if (window.UiUtils) {
              window.UiUtils.showNotification(
                "Failed to remove environment",
                "error",
              );
            }
          });
      }
    },

    /**
     * Add application team
     * @param {number} appId - Application ID
     */
    addApplicationTeam: function (appId) {
      const teamSelect = document.getElementById("teamSelect");
      const teamId = teamSelect.value;

      if (!teamId) {
        if (window.UiUtils) {
          window.UiUtils.showNotification("Please select a team", "error");
        }
        return;
      }

      window.ApiClient.applications
        .associateTeam(appId, teamId)
        .then(() => {
          if (window.UiUtils) {
            window.UiUtils.showNotification(
              "Team added successfully",
              "success",
            );
          }
          // Refresh the modal
          this.closeModal();
          this.showApplicationEditModal(appId);
        })
        .catch((error) => {
          console.error("Failed to add team:", error);
          if (window.UiUtils) {
            window.UiUtils.showNotification("Failed to add team", "error");
          }
        });
    },

    /**
     * Remove application team
     * @param {number} appId - Application ID
     * @param {number} teamId - Team ID
     */
    removeApplicationTeam: async function (appId, teamId) {
      const confirmed = await this.showSimpleConfirm(
        "Are you sure you want to remove this team from the application?",
      );

      if (confirmed) {
        window.ApiClient.applications
          .disassociateTeam(appId, teamId)
          .then(() => {
            if (window.UiUtils) {
              window.UiUtils.showNotification(
                "Team removed successfully",
                "success",
              );
            }
            // Refresh the modal
            this.closeModal();
            this.showApplicationEditModal(appId);
          })
          .catch((error) => {
            console.error("Failed to remove team:", error);
            if (window.UiUtils) {
              window.UiUtils.showNotification("Failed to remove team", "error");
            }
          });
      }
    },

    /**
     * Add application label
     * @param {number} appId - Application ID
     */
    addApplicationLabel: function (appId) {
      const labelSelect = document.getElementById("labelSelect");
      const labelId = labelSelect.value;

      if (!labelId) {
        if (window.UiUtils) {
          window.UiUtils.showNotification("Please select a label", "error");
        }
        return;
      }

      window.ApiClient.applications
        .associateLabel(appId, labelId)
        .then(() => {
          if (window.UiUtils) {
            window.UiUtils.showNotification(
              "Label added successfully",
              "success",
            );
          }
          // Refresh the modal
          this.closeModal();
          this.showApplicationEditModal(appId);
        })
        .catch((error) => {
          console.error("Failed to add label:", error);
          if (window.UiUtils) {
            window.UiUtils.showNotification("Failed to add label", "error");
          }
        });
    },

    /**
     * Remove application label
     * @param {number} appId - Application ID
     * @param {number} labelId - Label ID
     */
    removeApplicationLabel: async function (appId, labelId) {
      const confirmed = await this.showSimpleConfirm(
        "Are you sure you want to remove this label from the application?",
      );

      if (confirmed) {
        window.ApiClient.applications
          .disassociateLabel(appId, labelId)
          .then(() => {
            if (window.UiUtils) {
              window.UiUtils.showNotification(
                "Label removed successfully",
                "success",
              );
            }
            // Refresh the modal
            this.closeModal();
            this.showApplicationEditModal(appId);
          })
          .catch((error) => {
            console.error("Failed to remove label:", error);
            if (window.UiUtils) {
              window.UiUtils.showNotification(
                "Failed to remove label",
                "error",
              );
            }
          });
      }
    },

    /**
     * Save application changes
     * @param {number} appId - Application ID
     */
    saveApplication: function (appId) {
      const form = document.getElementById("applicationForm");
      const formData = this.getFormData(form);
      const isCreate = !appId;

      const apiCall = isCreate
        ? window.ApiClient.applications.create(formData)
        : window.ApiClient.applications.update(appId, formData);

      const successMessage = isCreate
        ? "Application created successfully"
        : "Application updated successfully";

      apiCall
        .then((response) => {
          console.log("Application saved successfully:", response);
          if (window.UiUtils) {
            window.UiUtils.showNotification(successMessage, "success");
          }

          this.closeModal();

          // Refresh the table
          if (window.AdminGuiController) {
            window.AdminGuiController.loadCurrentSection();
          }
        })
        .catch((error) => {
          console.error("Failed to save application:", error);

          let errorMessage = "Failed to save application";
          if (error.message) {
            errorMessage = error.message;
          }

          if (window.UiUtils) {
            window.UiUtils.showNotification(errorMessage, "error");
          }
        });
    },

    /**
     * Show Label VIEW modal
     * @param {number} labelId - Label ID
     */
    showLabelViewModal: function (labelId) {
      console.log("showLabelViewModal called with labelId:", labelId);

      if (!window.ApiClient) {
        console.error("API client not available");
        return;
      }

      // Load label data with full details
      window.ApiClient.labels
        .getById(labelId)
        .then((label) => {
          console.log("Label data:", label);

          // Also load steps for this label
          return window.ApiClient.labels
            .getSteps(labelId)
            .then((steps) => {
              label.steps = steps;
              return label;
            })
            .catch(() => {
              // If steps endpoint doesn't exist, continue without steps
              label.steps = [];
              return label;
            });
        })
        .then((label) => {
          this.renderLabelViewModal(label);
        })
        .catch((error) => {
          console.error("Failed to load label data:", error);
          if (window.UiUtils) {
            window.UiUtils.showNotification(
              "Failed to load label data",
              "error",
            );
          }
        });
    },

    /**
     * Render Label VIEW modal
     * @param {Object} label - Label data
     */
    renderLabelViewModal: function (label) {
      let modalHtml = `
                <div class="modal-overlay" id="viewModal">
                    <div class="modal modal-large">
                        <div class="modal-header">
                            <h3 class="modal-title">Label Details: ${label.lbl_name}</h3>
                            <button class="modal-close">×</button>
                        </div>
                        <div class="modal-body">
                            <div class="env-details">
                                <div class="detail-section">
                                    <h4>Label Information</h4>
                                    <p><strong>Name:</strong> ${label.lbl_name}</p>
                                    <p><strong>Description:</strong> ${label.lbl_description || "No description"}</p>
                                    <p><strong>Color:</strong> <span class="aui-label" style="background-color: ${label.lbl_color}; color: ${window.UiUtils ? window.UiUtils.getContrastColor(label.lbl_color) : "#000000"};">${label.lbl_color}</span></p>
                                    <p><strong>Migration:</strong> ${label.mig_name || "Unknown"}</p>
                                    <p><strong>Created By:</strong> ${label.created_by_name || "Unknown"}</p>
                                    <p><strong>Created At:</strong> ${window.UiUtils ? window.UiUtils.formatDate(label.created_at) : label.created_at}</p>
                                </div>
                                
                                <div class="detail-section">
                                    <h4>Associated Applications (${label.applications ? label.applications.length : 0})</h4>
                                    ${this.renderLabelApplications(label.applications)}
                                </div>
                                
                                <div class="detail-section">
                                    <h4>Associated Steps (${label.step_count || 0})</h4>
                                    ${this.renderLabelSteps(label.steps)}
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-secondary" onclick="ModalManager.closeModal()">Close</button>
                            <button class="btn-primary" onclick="ModalManager.closeModal(); ModalManager.showEditModal(${label.lbl_id})">Edit</button>
                        </div>
                    </div>
                </div>
            `;

      document.body.insertAdjacentHTML("beforeend", modalHtml);
    },

    /**
     * Render label applications for VIEW mode
     * @param {Array} applications - Label applications
     * @returns {string} HTML string
     */
    renderLabelApplications: function (applications) {
      if (!applications || applications.length === 0) {
        return '<p class="no-associations">No applications associated</p>';
      }

      let html = '<div class="associations-list">';
      applications.forEach((app) => {
        html += `
                    <div class="association-item">
                        <span><strong>${app.app_code}</strong> - ${app.app_name}</span>
                    </div>
                `;
      });
      html += "</div>";

      return html;
    },

    /**
     * Render label steps for VIEW mode
     * @param {Array} steps - Label steps
     * @returns {string} HTML string
     */
    renderLabelSteps: function (steps) {
      if (!steps || steps.length === 0) {
        return '<p class="no-associations">No steps associated</p>';
      }

      let html = '<div class="associations-list">';
      steps.forEach((step) => {
        // Format step code: type - number
        const stepCode = `${step.step_type || step.stt_code || ""} - ${step.step_number || step.stm_step_number || ""}`;
        html += `
                    <div class="association-item">
                        <span><strong>${stepCode}</strong> - ${step.step_title || step.stm_title || "No title"}</span>
                    </div>
                `;
      });
      html += "</div>";

      return html;
    },

    /**
     * Show Label EDIT modal
     * @param {number} labelId - Label ID (null for create)
     */
    showLabelEditModal: function (labelId) {
      console.log("showLabelEditModal called with labelId:", labelId);

      const isCreate = !labelId;

      if (isCreate) {
        // For create mode, load available data
        Promise.all([
          window.ApiClient.migrations.getAll(),
          window.ApiClient.applications.getAll(),
        ])
          .then(([migrations, allApplications]) => {
            // For create mode, we don't have a migration selected yet, so pass empty steps
            this.renderLabelEditModal(
              null,
              [],
              [],
              migrations,
              allApplications,
              [],
              true,
            );
          })
          .catch((error) => {
            console.error("Failed to load data for label creation:", error);
            if (window.UiUtils) {
              window.UiUtils.showNotification(
                "Failed to load label creation data",
                "error",
              );
            }
          });
      } else {
        // For edit mode, load label data and available items
        Promise.all([
          window.ApiClient.labels.getById(labelId),
          window.ApiClient.labels.getSteps(labelId),
          window.ApiClient.migrations.getAll(),
          window.ApiClient.applications.getAll(),
        ])
          .then(([label, steps, migrations, allApplications]) => {
            // Fetch steps filtered by the label's migration
            const migrationId = label.mig_id;
            return window.ApiClient.steps
              .getMasterSteps({ migrationId: migrationId })
              .then((allSteps) => {
                // Create modal for editing existing label
                this.renderLabelEditModal(
                  label,
                  label.applications || [],
                  steps || [],
                  migrations,
                  allApplications,
                  allSteps,
                  false,
                );
              });
          })
          .catch((error) => {
            console.error("Failed to load label edit data:", error);
            if (window.UiUtils) {
              window.UiUtils.showNotification(
                "Failed to load label data",
                "error",
              );
            }
          });
      }
    },

    /**
     * Render Label EDIT modal
     * @param {Object} label - Label data (null for create)
     * @param {Array} applications - Associated applications
     * @param {Array} steps - Associated steps
     * @param {Array} migrations - Available migrations
     * @param {Array} allApplications - All available applications
     * @param {Array} allSteps - All available steps
     * @param {boolean} isCreate - Whether this is create mode
     */
    renderLabelEditModal: function (
      label,
      applications,
      steps,
      migrations,
      allApplications,
      allSteps,
      isCreate,
    ) {
      const modalTitle = isCreate
        ? "Create New Label"
        : `Edit Label: ${label.lbl_name}`;

      let modalHtml = `
                <div class="modal-overlay" id="editModal">
                    <div class="modal modal-large">
                        <div class="modal-header">
                            <h3 class="modal-title">${modalTitle}</h3>
                            <button class="modal-close">×</button>
                        </div>
                        <div class="modal-body">
                            <form id="labelForm" class="entity-form">
                                <div class="form-section">
                                    <h4>Label Information</h4>
                                    <div class="form-field">
                                        <label for="lbl_name">Name *</label>
                                        <input type="text" id="lbl_name" name="lbl_name" value="${label ? label.lbl_name : ""}" required>
                                    </div>
                                    <div class="form-field">
                                        <label for="lbl_description">Description</label>
                                        <textarea id="lbl_description" name="lbl_description" rows="3">${label ? label.lbl_description || "" : ""}</textarea>
                                    </div>
                                    <div class="form-field">
                                        <label for="lbl_color">Color *</label>
                                        <input type="color" id="lbl_color" name="lbl_color" value="${label ? label.lbl_color : "#000000"}" required>
                                    </div>
                                    <div class="form-field">
                                        <label for="mig_id">Migration *</label>
                                        <select id="mig_id" name="mig_id" required onchange="ModalManager.onMigrationChange(this.value)">
                                            <option value="">Select Migration</option>
                                            ${(() => {
                                              // Handle paginated or array response
                                              const migList =
                                                migrations && migrations.data
                                                  ? migrations.data
                                                  : migrations &&
                                                      migrations.content
                                                    ? migrations.content
                                                    : Array.isArray(migrations)
                                                      ? migrations
                                                      : [];
                                              return migList
                                                .map((mig) => {
                                                  // The API returns 'id' and 'name' fields, not 'mig_id' and 'mig_name'
                                                  return `
                                                        <option value="${mig.id || mig.mig_id || ""}" ${label && label.mig_id === (mig.id || mig.mig_id) ? "selected" : ""}>
                                                            ${mig.name || mig.mig_name || "Unnamed Migration"}
                                                        </option>
                                                    `;
                                                })
                                                .join("");
                                            })()}
                                        </select>
                                    </div>
                                </div>
                                
                                ${
                                  !isCreate
                                    ? `
                                <div class="form-section">
                                    <h4>Associated Applications</h4>
                                    <div class="associations-section">
                                        <div class="association-add">
                                            <select id="applicationSelect">
                                                <option value="">Select Application to Add</option>
                                                ${(() => {
                                                  // Handle paginated or non-paginated response
                                                  const appList =
                                                    allApplications &&
                                                    allApplications.data
                                                      ? allApplications.data
                                                      : allApplications &&
                                                          allApplications.content
                                                        ? allApplications.content
                                                        : Array.isArray(
                                                              allApplications,
                                                            )
                                                          ? allApplications
                                                          : [];
                                                  return appList
                                                    .filter(
                                                      (app) =>
                                                        !applications.some(
                                                          (a) =>
                                                            a.app_id ===
                                                            app.app_id,
                                                        ),
                                                    )
                                                    .map(
                                                      (app) =>
                                                        `<option value="${app.app_id}">${app.app_code} - ${app.app_name}</option>`,
                                                    )
                                                    .join("");
                                                })()}
                                            </select>
                                            <button type="button" class="btn-secondary" onclick="ModalManager.addLabelApplication(${label.lbl_id})">Add Application</button>
                                        </div>
                                        <div class="current-associations">
                                            ${
                                              applications.length > 0
                                                ? applications
                                                    .map(
                                                      (app) => `
                                                <div class="association-item">
                                                    <span>${app.app_code} - ${app.app_name}</span>
                                                    <button type="button" class="btn-remove" onclick="ModalManager.removeLabelApplication(${label.lbl_id}, ${app.app_id})">Remove</button>
                                                </div>
                                            `,
                                                    )
                                                    .join("")
                                                : "<p>No applications associated</p>"
                                            }
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="form-section">
                                    <h4>Associated Steps</h4>
                                    ${isCreate ? '<p class="form-help">Steps will be available after selecting a migration</p>' : ""}
                                    <div class="associations-section">
                                        <div class="association-add">
                                            <select id="stepSelect" ${isCreate ? "disabled" : ""}>
                                                <option value="">${isCreate ? "Select a migration first" : "Select Step to Add"}</option>
                                                ${(() => {
                                                  // Handle paginated or non-paginated response
                                                  const stepList =
                                                    allSteps && allSteps.content
                                                      ? allSteps.content
                                                      : Array.isArray(allSteps)
                                                        ? allSteps
                                                        : [];
                                                  return stepList
                                                    .filter(
                                                      (step) =>
                                                        !steps.some(
                                                          (s) =>
                                                            s.stm_id ===
                                                            step.stm_id,
                                                        ),
                                                    )
                                                    .map(
                                                      (step) =>
                                                        `<option value="${step.stm_id}">${step.display_name || step.step_code + ": " + step.stm_title}</option>`,
                                                    )
                                                    .join("");
                                                })()}
                                            </select>
                                            <button type="button" class="btn-secondary" onclick="ModalManager.addLabelStep(${label.lbl_id})">Add Step</button>
                                        </div>
                                        <div class="current-associations">
                                            ${
                                              steps.length > 0
                                                ? steps
                                                    .map(
                                                      (step) => `
                                                <div class="association-item">
                                                    <span>${step.step_type || step.stt_code} - ${step.step_number || step.stm_step_number}: ${step.step_title || step.stm_title}</span>
                                                    <button type="button" class="btn-remove" onclick="ModalManager.removeLabelStep(${label.lbl_id}, '${step.stm_id}')">Remove</button>
                                                </div>
                                            `,
                                                    )
                                                    .join("")
                                                : "<p>No steps associated</p>"
                                            }
                                        </div>
                                    </div>
                                </div>
                                `
                                    : ""
                                }
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-secondary" onclick="ModalManager.closeModal()">Cancel</button>
                            ${!isCreate ? `<button class="btn-danger" onclick="ModalManager.deleteLabel(${label.lbl_id})">Delete</button>` : ""}
                            <button class="btn-primary" onclick="ModalManager.saveLabel(${label ? label.lbl_id : "null"})">
                                ${isCreate ? "Create Label" : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            `;

      document.body.insertAdjacentHTML("beforeend", modalHtml);
    },

    /**
     * Add label application association
     * @param {number} labelId - Label ID
     */
    addLabelApplication: function (labelId) {
      const applicationSelect = document.getElementById("applicationSelect");
      const applicationId = applicationSelect.value;

      if (!applicationId) {
        if (window.UiUtils) {
          window.UiUtils.showNotification(
            "Please select an application",
            "error",
          );
        }
        return;
      }

      window.ApiClient.labels
        .addApplication(labelId, applicationId)
        .then(() => {
          if (window.UiUtils) {
            window.UiUtils.showNotification(
              "Application added successfully",
              "success",
            );
          }
          // Refresh the modal
          this.closeModal();
          this.showLabelEditModal(labelId);
        })
        .catch((error) => {
          console.error("Failed to add application to label:", error);
          if (window.UiUtils) {
            window.UiUtils.showNotification(
              "Failed to add application",
              "error",
            );
          }
        });
    },

    /**
     * Remove label application association
     * @param {number} labelId - Label ID
     * @param {number} applicationId - Application ID
     */
    removeLabelApplication: async function (labelId, applicationId) {
      const confirmed = await this.showSimpleConfirm(
        "Are you sure you want to remove this application from the label?",
      );

      if (confirmed) {
        window.ApiClient.labels
          .removeApplication(labelId, applicationId)
          .then(() => {
            if (window.UiUtils) {
              window.UiUtils.showNotification(
                "Application removed successfully",
                "success",
              );
            }
            // Refresh the modal
            this.closeModal();
            this.showLabelEditModal(labelId);
          })
          .catch((error) => {
            console.error("Failed to remove application from label:", error);
            if (window.UiUtils) {
              window.UiUtils.showNotification(
                "Failed to remove application",
                "error",
              );
            }
          });
      }
    },

    /**
     * Add label step association
     * @param {number} labelId - Label ID
     */
    addLabelStep: function (labelId) {
      const stepSelect = document.getElementById("stepSelect");
      const stepId = stepSelect.value;

      if (!stepId) {
        if (window.UiUtils) {
          window.UiUtils.showNotification("Please select a step", "error");
        }
        return;
      }

      window.ApiClient.labels
        .addStep(labelId, stepId)
        .then(() => {
          if (window.UiUtils) {
            window.UiUtils.showNotification(
              "Step added successfully",
              "success",
            );
          }
          // Refresh the modal
          this.closeModal();
          this.showLabelEditModal(labelId);
        })
        .catch((error) => {
          console.error("Failed to add step to label:", error);
          if (window.UiUtils) {
            window.UiUtils.showNotification("Failed to add step", "error");
          }
        });
    },

    /**
     * Remove label step association
     * @param {number} labelId - Label ID
     * @param {string} stepId - Step ID (UUID)
     */
    removeLabelStep: async function (labelId, stepId) {
      const confirmed = await this.showSimpleConfirm(
        "Are you sure you want to remove this step from the label?",
      );

      if (confirmed) {
        window.ApiClient.labels
          .removeStep(labelId, stepId)
          .then(() => {
            if (window.UiUtils) {
              window.UiUtils.showNotification(
                "Step removed successfully",
                "success",
              );
            }
            // Refresh the modal
            this.closeModal();
            this.showLabelEditModal(labelId);
          })
          .catch((error) => {
            console.error("Failed to remove step from label:", error);
            if (window.UiUtils) {
              window.UiUtils.showNotification("Failed to remove step", "error");
            }
          });
      }
    },

    /**
     * Save label changes
     * @param {number} labelId - Label ID
     */
    saveLabel: function (labelId) {
      const form = document.getElementById("labelForm");
      const formData = this.getFormData(form);
      const isCreate = !labelId;

      const apiCall = isCreate
        ? window.ApiClient.labels.create(formData)
        : window.ApiClient.labels.update(labelId, formData);

      const successMessage = isCreate
        ? "Label created successfully"
        : "Label updated successfully";

      apiCall
        .then((response) => {
          console.log("Label saved successfully:", response);
          if (window.UiUtils) {
            window.UiUtils.showNotification(successMessage, "success");
          }

          this.closeModal();

          // Refresh the table
          if (window.AdminGuiController) {
            window.AdminGuiController.loadCurrentSection();
          }
        })
        .catch((error) => {
          console.error("Failed to save label:", error);

          let errorMessage = "Failed to save label";
          if (error.message) {
            errorMessage = error.message;
          }

          if (window.UiUtils) {
            window.UiUtils.showNotification(errorMessage, "error");
          }
        });
    },

    /**
     * Delete label
     * @param {number} labelId - Label ID
     */
    deleteLabel: async function (labelId) {
      const confirmed = await this.showSimpleConfirm(
        "Are you sure you want to delete this label? This action cannot be undone.",
      );

      if (confirmed) {
        window.ApiClient.labels
          .delete(labelId)
          .then(() => {
            if (window.UiUtils) {
              window.UiUtils.showNotification(
                "Label deleted successfully",
                "success",
              );
            }

            this.closeModal();

            // Refresh the table
            if (window.AdminGuiController) {
              window.AdminGuiController.loadCurrentSection();
            }
          })
          .catch((error) => {
            console.error("Failed to delete label:", error);

            let errorMessage = "Failed to delete label";
            if (error.message) {
              errorMessage = error.message;
            }

            if (window.UiUtils) {
              window.UiUtils.showNotification(errorMessage, "error");
            }
          });
      }
    },

    /**
     * Handle migration change in label edit modal
     * @param {string} migrationId - Selected migration ID
     */
    onMigrationChange: function (migrationId) {
      console.log("Migration changed to:", migrationId);

      const stepSelect = document.getElementById("stepSelect");
      if (!stepSelect) {
        console.warn("Step select element not found");
        return;
      }

      // Clear current options
      stepSelect.innerHTML = '<option value="">Select Step to Add</option>';

      if (!migrationId) {
        console.log("No migration selected, clearing steps");
        stepSelect.disabled = true;
        stepSelect.innerHTML =
          '<option value="">Select a migration first</option>';
        return;
      }

      // Show loading indicator
      stepSelect.disabled = true;
      stepSelect.innerHTML = '<option value="">Loading steps...</option>';

      // Fetch steps for the selected migration
      window.ApiClient.steps
        .getMasterSteps({ migrationId: migrationId })
        .then((response) => {
          console.log("Steps loaded for migration:", response);

          // Handle paginated or non-paginated response
          const stepList =
            response && response.content
              ? response.content
              : Array.isArray(response)
                ? response
                : [];

          // Get currently associated steps
          const currentSteps = [];
          const associatedStepElements = document.querySelectorAll(
            ".current-associations .association-item",
          );
          associatedStepElements.forEach((elem) => {
            const button = elem.querySelector(
              'button[onclick*="removeLabelStep"]',
            );
            if (button) {
              const onclick = button.getAttribute("onclick");
              const match = onclick.match(
                /removeLabelStep\(\d+,\s*'([^']+)'\)/,
              );
              if (match) {
                currentSteps.push(match[1]);
              }
            }
          });

          // Rebuild options, excluding already associated steps
          stepSelect.innerHTML = '<option value="">Select Step to Add</option>';

          const filteredSteps = stepList.filter(
            (step) => !currentSteps.includes(step.stm_id),
          );

          if (filteredSteps.length === 0) {
            stepSelect.innerHTML =
              '<option value="">No steps available for this migration</option>';
          } else {
            filteredSteps.forEach((step) => {
              const option = document.createElement("option");
              option.value = step.stm_id;
              const stepCode = `${step.stt_code}-${step.stm_number}`;
              const stepName = step.stm_name || "Unnamed Step";
              option.textContent = `${stepCode}: ${stepName}`;
              stepSelect.appendChild(option);
            });
          }

          stepSelect.disabled = false;
        })
        .catch((error) => {
          console.error("Failed to load steps for migration:", error);
          stepSelect.innerHTML =
            '<option value="">Failed to load steps</option>';
          stepSelect.disabled = false;

          if (window.UiUtils) {
            window.UiUtils.showNotification(
              "Failed to load steps for selected migration",
              "error",
            );
          }
        });
    },
  };

  // Export to global namespace
  window.ModalManager = ModalManager;

  // Global test function for easy browser console access
  window.testPhaseDropdownCascading = function() {
    ModalManager.testPhaseDropdownCascading();
  };
})();
