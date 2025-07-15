/**
 * Modal Manager Module
 * 
 * Handles modal dialogs for viewing, editing, and creating entities,
 * including form generation, validation, and submission.
 */

(function() {
    'use strict';

    // Modal Manager
    const ModalManager = {
        /**
         * Initialize modal manager
         */
        init: function() {
            this.bindEvents();
        },

        /**
         * Bind modal-related events
         */
        bindEvents: function() {
            // Modal close events
            document.addEventListener('click', (e) => {
                if (e.target.matches('.modal-close') || e.target.matches('.modal-overlay')) {
                    this.closeModal();
                }
            });

            // Form submission
            document.addEventListener('submit', (e) => {
                if (e.target.matches('#entityForm')) {
                    this.handleFormSubmit(e);
                }
            });

            // Modal action buttons
            document.addEventListener('click', (e) => {
                if (e.target.matches('#saveEntityBtn')) {
                    this.handleSaveEntity();
                }
                if (e.target.matches('#cancelBtn')) {
                    this.closeModal();
                }
            });

            // Escape key to close modal
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isModalOpen()) {
                    this.closeModal();
                }
            });
        },

        /**
         * Show view modal
         * @param {string} id - Entity ID
         */
        showViewModal: function(id) {
            const state = window.AdminGuiState ? window.AdminGuiState.getState() : {};
            const currentEntity = state.currentEntity || 'users';
            
            if (currentEntity === 'environments') {
                this.showEnvironmentDetailsModal(id);
            } else {
                this.showGenericViewModal(id, currentEntity);
            }
        },

        /**
         * Show edit modal
         * @param {string} id - Entity ID (null for create)
         */
        showEditModal: function(id) {
            const state = window.AdminGuiState ? window.AdminGuiState.getState() : {};
            const currentEntity = state.currentEntity || 'users';
            
            if (id) {
                this.loadEntityData(id, currentEntity)
                    .then(data => {
                        this.showEntityForm(data, currentEntity, false);
                    })
                    .catch(error => {
                        console.error('Failed to load entity:', error);
                        if (window.UiUtils) {
                            window.UiUtils.showNotification('Failed to load entity data', 'error');
                        }
                    });
            } else {
                this.showEntityForm(null, currentEntity, true);
            }
        },

        /**
         * Show environment details modal
         * @param {string} id - Environment ID
         */
        showEnvironmentDetailsModal: function(id) {
            if (!window.ApiClient) {
                console.error('API client not available');
                return;
            }

            window.ApiClient.environments.getById(id)
                .then(environment => {
                    this.renderEnvironmentDetailsModal(environment);
                })
                .catch(error => {
                    console.error('Failed to load environment:', error);
                    if (window.UiUtils) {
                        window.UiUtils.showNotification('Failed to load environment details', 'error');
                    }
                });
        },

        /**
         * Show generic view modal
         * @param {string} id - Entity ID
         * @param {string} entityType - Entity type
         */
        showGenericViewModal: function(id, entityType) {
            if (!window.ApiClient) {
                console.error('API client not available');
                return;
            }

            window.ApiClient.entities.getById(entityType, id)
                .then(entity => {
                    this.renderGenericViewModal(entity, entityType);
                })
                .catch(error => {
                    console.error('Failed to load entity:', error);
                    if (window.UiUtils) {
                        window.UiUtils.showNotification('Failed to load entity details', 'error');
                    }
                });
        },

        /**
         * Render environment details modal
         * @param {Object} environment - Environment data
         */
        renderEnvironmentDetailsModal: function(environment) {
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
                                    <p><strong>Description:</strong> ${environment.env_description || 'No description'}</p>
                                </div>
                                
                                <div class="detail-section">
                                    <h4>Associations</h4>
                                    <div class="association-buttons">
                                        <button class="btn-primary" onclick="adminGui.showAssociateApplicationModal(${environment.env_id})">
                                            Associate Application
                                        </button>
                                        <button class="btn-primary" onclick="adminGui.showAssociateIterationModal(${environment.env_id})">
                                            Associate Iteration
                                        </button>
                                    </div>
                                </div>
                                
                                <div class="detail-section">
                                    <h4>Statistics</h4>
                                    <p><strong>Applications:</strong> ${environment.application_count || 0}</p>
                                    <p><strong>Iterations:</strong> ${environment.iteration_count || 0}</p>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-secondary" onclick="ModalManager.closeModal()">Close</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        },

        /**
         * Render generic view modal
         * @param {Object} entity - Entity data
         * @param {string} entityType - Entity type
         */
        renderGenericViewModal: function(entity, entityType) {
            const entityConfig = window.EntityConfig ? window.EntityConfig.getEntity(entityType) : null;
            if (!entityConfig) {
                console.error('Entity configuration not found:', entityType);
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
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        },

        /**
         * Build entity details HTML
         * @param {Object} entity - Entity data
         * @param {Object} entityConfig - Entity configuration
         * @returns {string} Details HTML
         */
        buildEntityDetails: function(entity, entityConfig) {
            let detailsHtml = '<div class="entity-details">';
            
            // Show ALL fields in view modal, not just readonly/computed ones
            entityConfig.fields.forEach(field => {
                const value = entity[field.key];
                const formattedValue = this.formatFieldValue(value, field);
                
                detailsHtml += `
                    <div class="detail-field">
                        <label>${field.label}:</label>
                        <span>${formattedValue}</span>
                    </div>
                `;
            });
            
            detailsHtml += '</div>';
            return detailsHtml;
        },

        /**
         * Show entity form (create or edit)
         * @param {Object} data - Entity data (null for create)
         * @param {string} entityType - Entity type
         * @param {boolean} isCreate - Whether this is create mode
         */
        showEntityForm: function(data, entityType, isCreate) {
            const entityConfig = window.EntityConfig ? window.EntityConfig.getEntity(entityType) : null;
            if (!entityConfig) {
                console.error('Entity configuration not found:', entityType);
                return;
            }

            const formHtml = this.buildEntityForm(data, entityConfig, isCreate);
            const modalTitle = isCreate ? `Add ${entityConfig.name.slice(0, -1)}` : `Edit ${entityConfig.name.slice(0, -1)}`;
            
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
                                ${isCreate ? 'Create' : 'Update'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Set form data if editing
            if (data && !isCreate) {
                this.setFormData(data, entityConfig);
            }
        },

        /**
         * Build entity form HTML
         * @param {Object} data - Entity data
         * @param {Object} entityConfig - Entity configuration
         * @param {boolean} isCreate - Whether this is create mode
         * @returns {string} Form HTML
         */
        buildEntityForm: function(data, entityConfig, isCreate) {
            let formHtml = '<form id="entityForm">';
            
            // Add hidden ID field for updates
            if (!isCreate && data) {
                // Find the primary key field (usually the first field)
                const idField = entityConfig.fields[0];
                if (idField && data[idField.key]) {
                    // Use the actual field key (e.g., usr_id, tms_id, etc.) instead of generic 'id'
                    formHtml += `<input type="hidden" name="${idField.key}" value="${data[idField.key]}">`;
                }
            }
            
            // Add association management for environments (only when editing)
            if (entityConfig.name === 'Environments' && data && !isCreate) {
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
            
            // Add form fields
            entityConfig.fields.forEach(field => {
                if (!field.readonly && !field.computed) {
                    formHtml += this.buildFormField(field, data);
                }
            });
            
            formHtml += '</form>';
            return formHtml;
        },

        /**
         * Build form field HTML
         * @param {Object} field - Field configuration
         * @param {Object} data - Entity data
         * @returns {string} Field HTML
         */
        buildFormField: function(field, data) {
            const value = data ? data[field.key] : '';
            const required = field.required ? 'required' : '';
            const maxLength = field.maxLength ? `maxlength="${field.maxLength}"` : '';
            
            let fieldHtml = `<div class="form-group">`;
            fieldHtml += `<label for="${field.key}">${field.label}${field.required ? ' *' : ''}</label>`;
            
            switch (field.type) {
                case 'text':
                case 'email':
                    fieldHtml += `<input type="${field.type}" id="${field.key}" name="${field.key}" value="${value}" ${required} ${maxLength}>`;
                    break;
                    
                case 'textarea':
                    fieldHtml += `<textarea id="${field.key}" name="${field.key}" ${required} ${maxLength}>${value}</textarea>`;
                    break;
                    
                case 'boolean':
                    const checked = value === true || value === 'true' || value === 1 ? 'checked' : '';
                    fieldHtml += `<label class="checkbox-label"><input type="checkbox" id="${field.key}" name="${field.key}" ${checked}> ${field.label}</label>`;
                    break;
                    
                case 'select':
                    fieldHtml += `<select id="${field.key}" name="${field.key}" ${required}>`;
                    if (field.options) {
                        field.options.forEach(option => {
                            const selected = (value === option.value || (value == null && option.value == null)) ? 'selected' : '';
                            const optionValue = option.value === null ? '' : option.value;
                            fieldHtml += `<option value="${optionValue}" ${selected}>${option.label}</option>`;
                        });
                    }
                    fieldHtml += `</select>`;
                    break;
                    
                case 'number':
                    fieldHtml += `<input type="number" id="${field.key}" name="${field.key}" value="${value}" ${required}>`;
                    break;
                    
                default:
                    fieldHtml += `<input type="text" id="${field.key}" name="${field.key}" value="${value}" ${required} ${maxLength}>`;
            }
            
            if (field.maxLength) {
                fieldHtml += `<small class="form-help">Maximum ${field.maxLength} characters</small>`;
            }
            
            fieldHtml += '</div>';
            return fieldHtml;
        },

        /**
         * Set form data
         * @param {Object} data - Entity data
         * @param {Object} entityConfig - Entity configuration
         */
        setFormData: function(data, entityConfig) {
            const form = document.getElementById('entityForm');
            if (!form) return;
            
            entityConfig.fields.forEach(field => {
                const input = form.querySelector(`[name="${field.key}"]`);
                if (input && data[field.key] !== undefined) {
                    if (field.type === 'boolean') {
                        input.checked = data[field.key];
                    } else {
                        input.value = data[field.key] || '';
                    }
                }
            });
        },

        /**
         * Handle form submission
         * @param {Event} e - Form submission event
         */
        handleFormSubmit: function(e) {
            e.preventDefault();
            this.handleSaveEntity();
        },

        /**
         * Handle save entity
         */
        handleSaveEntity: function() {
            const form = document.getElementById('entityForm');
            if (!form) return;
            
            // Validate form
            if (!this.validateForm(form)) {
                return;
            }
            
            const formData = this.getFormData(form);
            const state = window.AdminGuiState ? window.AdminGuiState.getState() : {};
            const currentEntity = state.currentEntity || 'users';
            const entityConfig = window.EntityConfig ? window.EntityConfig.getEntity(currentEntity) : null;
            
            // Check if this is create or update by looking for the primary key field
            let isCreate = true;
            let entityId = null;
            
            if (entityConfig && entityConfig.fields.length > 0) {
                const idField = entityConfig.fields[0]; // Primary key is usually first field
                if (formData[idField.key]) {
                    isCreate = false;
                    entityId = formData[idField.key];
                }
            }
            
            this.saveEntity(formData, currentEntity, isCreate, entityId);
        },

        /**
         * Validate form
         * @param {HTMLFormElement} form - Form element
         * @returns {boolean} Whether form is valid
         */
        validateForm: function(form) {
            const requiredFields = form.querySelectorAll('[required]');
            let isValid = true;
            
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    this.showFieldError(field, 'This field is required');
                    isValid = false;
                } else {
                    this.clearFieldError(field);
                }
            });
            
            // Additional validation
            const emailFields = form.querySelectorAll('input[type="email"]');
            emailFields.forEach(field => {
                if (field.value && !this.validateEmail(field.value)) {
                    this.showFieldError(field, 'Please enter a valid email address');
                    isValid = false;
                }
            });
            
            return isValid;
        },

        /**
         * Show field error
         * @param {HTMLElement} field - Field element
         * @param {string} message - Error message
         */
        showFieldError: function(field, message) {
            this.clearFieldError(field);
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'field-error';
            errorDiv.textContent = message;
            errorDiv.style.color = 'var(--danger-color)';
            errorDiv.style.fontSize = '12px';
            errorDiv.style.marginTop = '5px';
            
            field.parentNode.appendChild(errorDiv);
            field.style.borderColor = 'var(--danger-color)';
        },

        /**
         * Clear field error
         * @param {HTMLElement} field - Field element
         */
        clearFieldError: function(field) {
            const errorDiv = field.parentNode.querySelector('.field-error');
            if (errorDiv) {
                errorDiv.remove();
            }
            field.style.borderColor = '';
        },

        /**
         * Validate email
         * @param {string} email - Email to validate
         * @returns {boolean} Whether email is valid
         */
        validateEmail: function(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        },

        /**
         * Get form data
         * @param {HTMLFormElement} form - Form element
         * @returns {Object} Form data
         */
        getFormData: function(form) {
            const formData = new FormData(form);
            const data = {};
            
            // Get entity configuration to know field types
            const state = window.AdminGuiState ? window.AdminGuiState.getState() : {};
            const currentEntity = state.currentEntity || 'users';
            const entityConfig = window.EntityConfig ? window.EntityConfig.getEntity(currentEntity) : null;
            
            // Process form data
            for (let [key, value] of formData.entries()) {
                if (entityConfig) {
                    const field = entityConfig.fields.find(f => f.key === key);
                    if (field) {
                        if (field.type === 'select' && value === '') {
                            // Convert empty strings to null for select fields
                            data[key] = null;
                        } else if (field.type === 'select' && field.options) {
                            // Check if the select field has numeric values
                            const option = field.options.find(opt => opt.value == value);
                            if (option && typeof option.value === 'number') {
                                // Convert to number if the option value is numeric
                                data[key] = parseInt(value, 10);
                            } else {
                                data[key] = value;
                            }
                        } else {
                            data[key] = value;
                        }
                    } else {
                        data[key] = value;
                    }
                } else {
                    data[key] = value;
                }
            }
            
            // Handle checkboxes (boolean fields) that aren't in FormData when unchecked
            if (entityConfig) {
                entityConfig.fields.forEach(field => {
                    if (field.type === 'boolean' && !field.readonly && !field.computed) {
                        const checkbox = form.querySelector(`[name="${field.key}"]`);
                        if (checkbox && checkbox.type === 'checkbox') {
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
        saveEntity: function(data, entityType, isCreate, entityId) {
            if (!window.ApiClient) {
                console.error('API client not available');
                return;
            }
            
            // Get entity configuration
            const entityConfig = window.EntityConfig ? window.EntityConfig.getEntity(entityType) : null;
            
            // Clean up data - remove readonly and computed fields for the API
            const cleanData = {};
            if (entityConfig) {
                entityConfig.fields.forEach(field => {
                    if (!field.readonly && !field.computed && data.hasOwnProperty(field.key)) {
                        let value = data[field.key];
                        
                        // Type conversion based on field type
                        if (field.type === 'boolean') {
                            value = value === true || value === 'true' || value === 1 || value === '1';
                        } else if (field.type === 'number' && value !== null && value !== '') {
                            value = parseInt(value, 10);
                            if (isNaN(value)) {
                                value = null;
                            }
                        }
                        
                        cleanData[field.key] = value;
                    }
                });
            } else {
                // Fallback if no config
                Object.assign(cleanData, data);
            }
            
            console.log('Saving entity:', { 
                entityType, 
                isCreate, 
                entityId, 
                originalData: data,
                cleanData: cleanData 
            });
            console.log('Clean data being sent:', JSON.stringify(cleanData, null, 2));
            
            const promise = isCreate ? 
                window.ApiClient.entities.create(entityType, cleanData) :
                window.ApiClient.entities.update(entityType, entityId, cleanData);
            
            promise
                .then(response => {
                    console.log('Save successful:', response);
                    if (window.UiUtils) {
                        window.UiUtils.showNotification(
                            `${entityType} ${isCreate ? 'created' : 'updated'} successfully`,
                            'success'
                        );
                    }
                    
                    this.closeModal();
                    
                    // Refresh the table
                    if (window.AdminGuiController) {
                        window.AdminGuiController.loadCurrentSection();
                    }
                })
                .catch(error => {
                    console.error('Failed to save entity:', error);
                    
                    // Extract error message if available
                    let errorMessage = `Failed to ${isCreate ? 'create' : 'update'} ${entityType}`;
                    if (error.message) {
                        errorMessage += `: ${error.message}`;
                    }
                    
                    if (window.UiUtils) {
                        window.UiUtils.showNotification(errorMessage, 'error');
                    }
                });
        },

        /**
         * Load entity data
         * @param {string} id - Entity ID
         * @param {string} entityType - Entity type
         * @returns {Promise} Load promise
         */
        loadEntityData: function(id, entityType) {
            if (!window.ApiClient) {
                throw new Error('API client not available');
            }
            
            return window.ApiClient.entities.getById(entityType, id);
        },

        /**
         * Format field value for display
         * @param {*} value - Field value
         * @param {Object} field - Field configuration
         * @returns {string} Formatted value
         */
        formatFieldValue: function(value, field) {
            if (value === null || value === undefined) {
                return '';
            }
            
            switch (field.type) {
                case 'boolean':
                    return value ? 'Yes' : 'No';
                case 'datetime':
                    return window.UiUtils ? window.UiUtils.formatDate(value) : value;
                case 'date':
                    return window.UiUtils ? window.UiUtils.formatDate(value, false) : value;
                default:
                    return value.toString();
            }
        },

        /**
         * Close modal
         */
        closeModal: function() {
            const modals = document.querySelectorAll('.modal-overlay');
            modals.forEach(modal => modal.remove());
        },

        /**
         * Check if modal is open
         * @returns {boolean} Whether modal is open
         */
        isModalOpen: function() {
            return document.querySelector('.modal-overlay') !== null;
        },

        /**
         * Show association modal for applications
         * @param {string} envId - Environment ID
         */
        showAssociateApplicationModal: function(envId) {
            if (!window.ApiClient) {
                console.error('API client not available');
                return;
            }

            window.ApiClient.applications.getAll()
                .then(applications => {
                    this.renderAssociationModal(
                        'Associate Application',
                        applications,
                        'app_id',
                        'app_name',
                        (selectedId) => {
                            this.associateEnvironmentApplication(envId, selectedId);
                        }
                    );
                })
                .catch(error => {
                    console.error('Failed to load applications:', error);
                    if (window.UiUtils) {
                        window.UiUtils.showNotification('Error loading applications', 'error');
                    }
                });
        },

        /**
         * Show association modal for iterations
         * @param {string} envId - Environment ID
         */
        showAssociateIterationModal: function(envId) {
            if (!window.ApiClient) {
                console.error('API client not available');
                return;
            }

            window.ApiClient.iterations.getAll()
                .then(iterations => {
                    this.renderAssociationModal(
                        'Associate Iteration',
                        iterations,
                        'ite_id',
                        'ite_name',
                        (selectedId) => {
                            this.associateEnvironmentIteration(envId, selectedId);
                        }
                    );
                })
                .catch(error => {
                    console.error('Failed to load iterations:', error);
                    if (window.UiUtils) {
                        window.UiUtils.showNotification('Error loading iterations', 'error');
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
        renderAssociationModal: function(title, items, valueField, textField, onSelect) {
            const options = window.UiUtils ? 
                window.UiUtils.createSelectOptions(items, valueField, textField, 'Select...') :
                this.createSelectOptions(items, valueField, textField);
            
            const modalHtml = `
                <div class="modal-overlay" id="associationModal">
                    <div class="modal modal-small">
                        <div class="modal-header">
                            <h3 class="modal-title">${title}</h3>
                            <button class="modal-close">×</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label>Select ${title.split(' ')[1]}:</label>
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
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Store callback for later use
            this.associationCallback = onSelect;
        },

        /**
         * Handle association
         */
        handleAssociation: function() {
            const select = document.getElementById('associationSelect');
            if (!select || !select.value) {
                if (window.UiUtils) {
                    window.UiUtils.showNotification('Please select an item', 'error');
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
        associateEnvironmentApplication: function(envId, appId) {
            if (!window.ApiClient) {
                console.error('API client not available');
                return;
            }

            window.ApiClient.environments.associateApplication(envId, appId)
                .then(() => {
                    if (window.UiUtils) {
                        window.UiUtils.showNotification('Application associated successfully', 'success');
                    }
                })
                .catch(error => {
                    console.error('Failed to associate application:', error);
                    if (window.UiUtils) {
                        window.UiUtils.showNotification('Failed to associate application', 'error');
                    }
                });
        },

        /**
         * Associate environment with iteration
         * @param {string} envId - Environment ID
         * @param {string} iterationId - Iteration ID
         */
        associateEnvironmentIteration: function(envId, iterationId) {
            if (!window.ApiClient) {
                console.error('API client not available');
                return;
            }

            window.ApiClient.environments.associateIteration(envId, iterationId)
                .then(() => {
                    if (window.UiUtils) {
                        window.UiUtils.showNotification('Iteration associated successfully', 'success');
                    }
                })
                .catch(error => {
                    console.error('Failed to associate iteration:', error);
                    if (window.UiUtils) {
                        window.UiUtils.showNotification('Failed to associate iteration', 'error');
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
        createSelectOptions: function(items, valueField, textField) {
            let options = '<option value="">Select...</option>';
            
            if (items && items.length > 0) {
                items.forEach(item => {
                    const value = item[valueField] || '';
                    const text = item[textField] || '';
                    options += `<option value="${value}">${text}</option>`;
                });
            }
            
            return options;
        }
    };

    // Export to global namespace
    window.ModalManager = ModalManager;

})();