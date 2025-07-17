const populateFilter = (selector, url, defaultOptionText) => {
    const select = document.querySelector(selector);
    if (!select) {
        console.error(`populateFilter: Selector "${selector}" not found in DOM`);
        return;
    }

    console.log(`populateFilter: Loading ${url} for ${selector}`);
    select.innerHTML = `<option value="">Loading...</option>`;
    
    fetch(url)
        .then(response => {
            console.log(`populateFilter: Response for ${url}: ${response.status} ${response.statusText}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText} for ${url}`);
            }
            return response.json();
        })
        .then(items => {
            console.log(`populateFilter: Received ${Array.isArray(items) ? items.length : 'non-array'} items for ${selector}`, items);
            select.innerHTML = `<option value="">${defaultOptionText}</option>`;
            
            if (Array.isArray(items)) {
                items.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item.id;
                    option.textContent = item.name || '(Unnamed)';
                    select.appendChild(option);
                });
                console.log(`populateFilter: Successfully populated ${items.length} options for ${selector}`);
            } else {
                console.warn(`populateFilter: Items is not an array for ${selector}:`, items);
            }
        })
        .catch(error => {
            console.error(`populateFilter: Error loading ${url} for ${selector}:`, error);
            select.innerHTML = `<option value="">Failed to load: ${error.message}</option>`;
        });
};

// UMIG Iteration View - Canonical JavaScript Logic
// Ported from mock/script.js with full fidelity

class IterationView {
    constructor() {
        this.selectedStep = null;
        this.selectedStepCode = null;
        this.filters = {
            migration: '',
            iteration: '',
            plan: '',
            sequence: '',
            phase: '',
            team: '',
            label: '',
            myTeamsOnly: false
        };
        
        this.userRole = null;
        this.isAdmin = false;
        this.userContext = null;
        
        this.initUserContext();
        this.init();
    }

    async initUserContext() {
        try {
            // Get user context from configuration
            const config = window.UMIG_ITERATION_CONFIG;
            if (!config || !config.confluence || !config.confluence.username) {
                console.warn('No user context available');
                return;
            }

            // Fetch user role information from backend
            const response = await fetch(`${config.api.baseUrl}/user/context?username=${encodeURIComponent(config.confluence.username)}`);
            if (response.ok) {
                this.userContext = await response.json();
                this.userRole = this.userContext.role || 'NORMAL';
                this.isAdmin = this.userContext.isAdmin || false;
                console.log('User context loaded:', this.userContext);
                
                // Apply role-based UI controls once DOM is ready
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => this.applyRoleBasedControls());
                } else {
                    this.applyRoleBasedControls();
                }
            } else {
                console.warn('Failed to load user context:', response.status);
                // TEMPORARY WORKAROUND: Check username for admin detection
                const username = config.confluence.username;
                if (username === 'admin' || username === 'guq') {
                    console.log('Admin user detected via workaround (404 response)');
                    this.userRole = 'ADMIN';
                    this.isAdmin = true;
                } else {
                    // Default to NORMAL role
                    this.userRole = 'NORMAL';
                    this.isAdmin = false;
                }
            }
        } catch (error) {
            console.error('Error loading user context:', error);
            // TEMPORARY WORKAROUND: Check username for admin detection
            const username = config.confluence.username;
            if (username === 'admin' || username === 'guq') {
                console.log('Admin user detected via workaround');
                this.userRole = 'ADMIN';
                this.isAdmin = true;
            } else {
                // Default to NORMAL role
                this.userRole = 'NORMAL';
                this.isAdmin = false;
            }
        }
    }

    applyRoleBasedControls() {
        // Role-based UI control logic
        const role = this.userRole;
        const isAdmin = this.isAdmin;
        
        console.log(`Applying role-based controls for role: ${role}, isAdmin: ${isAdmin}`);
        
        // Control visibility and interaction based on role
        if (role === 'NORMAL') {
            // NORMAL users have read-only access
            this.hideElementsWithClass('admin-only');
            this.disableElementsWithClass('pilot-only');
            
            // Add read-only indicators
            this.addReadOnlyIndicators();
        } else if (role === 'PILOT') {
            // PILOT users have operational access
            this.hideElementsWithClass('admin-only');
            this.showAndEnableElementsWithClass('pilot-only');
        } else if (role === 'ADMIN' || isAdmin) {
            // ADMIN users have full access
            this.showAndEnableElementsWithClass('admin-only');
            this.showAndEnableElementsWithClass('pilot-only');
        }
    }

    hideElementsWithClass(className) {
        const elements = document.querySelectorAll(`.${className}`);
        elements.forEach(element => {
            element.style.display = 'none';
        });
    }

    showElementsWithClass(className) {
        const elements = document.querySelectorAll(`.${className}`);
        elements.forEach(element => {
            element.style.display = '';
        });
    }

    disableElementsWithClass(className) {
        const elements = document.querySelectorAll(`.${className}`);
        elements.forEach(element => {
            // Disable input elements
            if (element.tagName === 'INPUT' || element.tagName === 'BUTTON' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA') {
                element.disabled = true;
                element.title = 'This action requires PILOT or ADMIN role';
            }
            // Add visual indicator for disabled state
            element.classList.add('role-disabled');
        });
    }

    showAndEnableElementsWithClass(className) {
        const elements = document.querySelectorAll(`.${className}`);
        elements.forEach(element => {
            element.style.display = '';
            // Enable input elements
            if (element.tagName === 'INPUT' || element.tagName === 'BUTTON' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA') {
                element.disabled = false;
                element.title = '';
            }
            // Remove disabled indicator
            element.classList.remove('role-disabled');
        });
    }

    addReadOnlyIndicators() {
        // Add a read-only banner for NORMAL users
        const stepDetailsPanel = document.querySelector('.step-details-panel');
        if (stepDetailsPanel && !stepDetailsPanel.querySelector('.read-only-banner')) {
            const banner = document.createElement('div');
            banner.className = 'read-only-banner';
            banner.innerHTML = `
                <div class="banner-content">
                    <span class="banner-icon">👁️</span>
                    <span class="banner-text">Read-Only Mode - Contact admin for edit access</span>
                </div>
            `;
            stepDetailsPanel.insertBefore(banner, stepDetailsPanel.firstChild);
        }
    }

    init() {
        this.initializeSelectors();
        this.bindEvents();
        this.loadStatusColors();
        this.loadSteps();
        this.updateFilters();
    }

    initializeSelectors() {
        // Initialize migration selector
        this.populateMigrationSelector();
        
        // Initialize all other selectors with default states
        this.resetSelector('#iteration-select', 'SELECT AN ITERATION');
        this.resetSelector('#plan-filter', 'All Plans');
        this.resetSelector('#sequence-filter', 'All Sequences');
        this.resetSelector('#phase-filter', 'All Phases');
        this.resetSelector('#team-filter', 'All Teams');
        this.resetSelector('#label-filter', 'All Labels');
    }

    resetSelector(selector, defaultText) {
        const select = document.querySelector(selector);
        if (select) {
            select.innerHTML = `<option value="">${defaultText}</option>`;
        }
    }

    bindEvents() {
        // Migration and Iteration selectors
        const migrationSelect = document.getElementById('migration-select');
        const iterationSelect = document.getElementById('iteration-select');
        
        if (migrationSelect) {
            migrationSelect.addEventListener('change', (e) => {
                this.filters.migration = e.target.value;
                this.onMigrationChange();
            });
        }

        if (iterationSelect) {
            iterationSelect.addEventListener('change', (e) => {
                this.filters.iteration = e.target.value;
                this.onIterationChange();
            });
        }

        // Filter controls
        const planFilter = document.getElementById('plan-filter');
        const sequenceFilter = document.getElementById('sequence-filter');
        const phaseFilter = document.getElementById('phase-filter');
        const teamFilter = document.getElementById('team-filter');
        const labelFilter = document.getElementById('label-filter');
        const myTeamsOnly = document.getElementById('my-teams-only');
        
        if (planFilter) {
            planFilter.addEventListener('change', (e) => {
                this.filters.plan = e.target.value;
                this.onPlanChange();
            });
        }

        if (sequenceFilter) {
            sequenceFilter.addEventListener('change', (e) => {
                this.filters.sequence = e.target.value;
                this.onSequenceChange();
            });
        }

        if (phaseFilter) {
            phaseFilter.addEventListener('change', (e) => {
                this.filters.phase = e.target.value;
                this.onPhaseChange();
            });
        }

        if (teamFilter) {
            teamFilter.addEventListener('change', (e) => {
                this.filters.team = e.target.value;
                this.applyFilters();
            });
        }

        if (labelFilter) {
            labelFilter.addEventListener('change', (e) => {
                this.filters.label = e.target.value;
                this.applyFilters();
            });
        }

        if (myTeamsOnly) {
            myTeamsOnly.addEventListener('change', (e) => {
                this.filters.myTeamsOnly = e.target.checked;
                this.applyFilters();
            });
        }

        // Step action buttons
        this.bindStepActions();
    }

    bindStepActions() {
        const startBtn = document.getElementById('start-step');
        const completeBtn = document.getElementById('complete-step');
        const blockBtn = document.getElementById('block-step');
        const commentBtn = document.getElementById('add-comment');
        
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startStep());
        }
        
        if (completeBtn) {
            completeBtn.addEventListener('click', () => this.completeStep());
        }
        
        if (blockBtn) {
            blockBtn.addEventListener('click', () => this.blockStep());
        }
        
        if (commentBtn) {
            commentBtn.addEventListener('click', () => this.addComment());
        }
    }
    async loadMigrations() {
        const select = document.getElementById('migration-select');
        select.innerHTML = '<option>Loading migrations...</option>';
        try {
          const response = await fetch('/rest/scriptrunner/latest/custom/migrations');
          if (!response.ok) throw new Error('Failed to fetch');
          const migrations = await response.json();
          if (migrations.length === 0) {
            select.innerHTML = '<option>No migrations found</option>';
          } else {
            select.innerHTML = migrations.map(m =>
              `<option value="${m.id}">${m.name}</option>`
            ).join('');
          }
        } catch (e) {
          select.innerHTML = '<option>Error loading migrations</option>';
        }
      }
    
    onMigrationChange() {
        const migId = this.filters.migration;
        console.log('onMigrationChange: Selected migration ID:', migId);
        
        // Reset ALL dependent filters (everything below migration in hierarchy)
        this.filters.iteration = '';
        this.filters.plan = '';
        this.filters.sequence = '';
        this.filters.phase = '';
        this.filters.team = '';
        this.filters.label = '';
        
        // Reset all dependent selectors to default state
        this.resetSelector('#iteration-select', 'SELECT AN ITERATION');
        this.resetSelector('#plan-filter', 'All Plans');
        this.resetSelector('#sequence-filter', 'All Sequences');
        this.resetSelector('#phase-filter', 'All Phases');
        this.resetSelector('#team-filter', 'All Teams');
        this.resetSelector('#label-filter', 'All Labels');

        if (migId) {
            console.log('onMigrationChange: Loading iterations for migration:', migId);
            const url = `/rest/scriptrunner/latest/custom/migrations/${migId}/iterations`;
            populateFilter('#iteration-select', url, 'SELECT AN ITERATION');
        }
        
        // Show blank runsheet state since no iteration is selected
        this.showBlankRunsheetState();
    }

    onIterationChange() {
        const migId = this.filters.migration;
        const iteId = this.filters.iteration;
        console.log('onIterationChange: Selected iteration ID:', iteId);

        // Reset dependent filters (everything below iteration in hierarchy)
        this.filters.plan = '';
        this.filters.sequence = '';
        this.filters.phase = '';
        this.filters.team = '';
        this.filters.label = '';
        
        // Reset dependent selectors to default state
        this.resetSelector('#plan-filter', 'All Plans');
        this.resetSelector('#sequence-filter', 'All Sequences');
        this.resetSelector('#phase-filter', 'All Phases');
        this.resetSelector('#team-filter', 'All Teams');
        this.resetSelector('#label-filter', 'All Labels');

        if (!iteId) {
            this.showBlankRunsheetState();
            return;
        }

        // Populate filters for this iteration
        const planUrl = `/rest/scriptrunner/latest/custom/migrations/${migId}/iterations/${iteId}/plan-instances`;
        const sequenceUrl = `/rest/scriptrunner/latest/custom/migrations/${migId}/iterations/${iteId}/sequences`;
        const phaseUrl = `/rest/scriptrunner/latest/custom/migrations/${migId}/iterations/${iteId}/phases`;
        const teamsUrl = `/rest/scriptrunner/latest/custom/teams?iterationId=${iteId}`;
        const labelsUrl = `/rest/scriptrunner/latest/custom/labels?iterationId=${iteId}`;

        populateFilter('#plan-filter', planUrl, 'All Plans');
        populateFilter('#sequence-filter', sequenceUrl, 'All Sequences');
        populateFilter('#phase-filter', phaseUrl, 'All Phases');
        populateFilter('#team-filter', teamsUrl, 'All Teams');
        populateFilter('#label-filter', labelsUrl, 'All Labels');

        this.showNotification('Loading data for selected iteration...', 'info');
        // Load steps and auto-select first step
        this.loadStepsAndSelectFirst();
    }

    onPlanChange() {
        const { migration: migId, iteration: iteId, plan: planId } = this.filters;
        console.log('onPlanChange: Selected plan ID:', planId);

        // Reset dependent filters (everything below plan in hierarchy)
        this.filters.sequence = '';
        this.filters.phase = '';
        this.filters.team = '';
        this.filters.label = '';
        
        // Reset dependent selectors to default state
        this.resetSelector('#sequence-filter', 'All Sequences');
        this.resetSelector('#phase-filter', 'All Phases');
        this.resetSelector('#team-filter', 'All Teams');
        this.resetSelector('#label-filter', 'All Labels');

        if (!migId || !iteId) {
            this.showBlankRunsheetState();
            return;
        }

        if (!planId) {
            // 'All Plans' selected - show all sequences and phases for iteration
            const sequenceUrl = `/rest/scriptrunner/latest/custom/migrations/${migId}/iterations/${iteId}/sequences`;
            const phaseUrl = `/rest/scriptrunner/latest/custom/migrations/${migId}/iterations/${iteId}/phases`;
            const teamsUrl = `/rest/scriptrunner/latest/custom/teams?iterationId=${iteId}`;
            const labelsUrl = `/rest/scriptrunner/latest/custom/labels?iterationId=${iteId}`;
            populateFilter('#sequence-filter', sequenceUrl, 'All Sequences');
            populateFilter('#phase-filter', phaseUrl, 'All Phases');
            populateFilter('#team-filter', teamsUrl, 'All Teams');
            populateFilter('#label-filter', labelsUrl, 'All Labels');
        } else {
            // Specific plan selected - use nested URL pattern (migrationApi supports this)
            const sequenceUrl = `/rest/scriptrunner/latest/custom/migrations/${migId}/iterations/${iteId}/plan-instances/${planId}/sequences`;
            const phaseUrl = `/rest/scriptrunner/latest/custom/migrations/${migId}/iterations/${iteId}/plan-instances/${planId}/phases`;
            const teamsUrl = `/rest/scriptrunner/latest/custom/teams?planId=${planId}`;
            const labelsUrl = `/rest/scriptrunner/latest/custom/labels?planId=${planId}`;
            populateFilter('#sequence-filter', sequenceUrl, 'All Sequences');
            populateFilter('#phase-filter', phaseUrl, 'All Phases');
            populateFilter('#team-filter', teamsUrl, 'All Teams');
            populateFilter('#label-filter', labelsUrl, 'All Labels');
        }
        
        // Apply filters to reload steps
        this.applyFilters();
    }

    onSequenceChange() {
        const { migration: migId, iteration: iteId, plan: planId, sequence: seqId } = this.filters;
        console.log('onSequenceChange: Selected sequence ID:', seqId);

        // Reset dependent filters (everything below sequence in hierarchy)
        this.filters.phase = '';
        this.filters.team = '';
        this.filters.label = '';
        
        // Reset dependent selectors to default state
        this.resetSelector('#phase-filter', 'All Phases');
        this.resetSelector('#team-filter', 'All Teams');
        this.resetSelector('#label-filter', 'All Labels');

        if (!migId || !iteId) {
            this.showBlankRunsheetState();
            return;
        }

        if (!seqId) {
            // 'All Sequences' selected - show all phases for current plan or iteration
            if (planId) {
                const phaseUrl = `/rest/scriptrunner/latest/custom/migrations/${migId}/iterations/${iteId}/plan-instances/${planId}/phases`;
                const teamsUrl = `/rest/scriptrunner/latest/custom/teams?planId=${planId}`;
                const labelsUrl = `/rest/scriptrunner/latest/custom/labels?planId=${planId}`;
                populateFilter('#phase-filter', phaseUrl, 'All Phases');
                populateFilter('#team-filter', teamsUrl, 'All Teams');
                populateFilter('#label-filter', labelsUrl, 'All Labels');
            } else {
                const phaseUrl = `/rest/scriptrunner/latest/custom/migrations/${migId}/iterations/${iteId}/phases`;
                const teamsUrl = `/rest/scriptrunner/latest/custom/teams?iterationId=${iteId}`;
                const labelsUrl = `/rest/scriptrunner/latest/custom/labels?iterationId=${iteId}`;
                populateFilter('#phase-filter', phaseUrl, 'All Phases');
                populateFilter('#team-filter', teamsUrl, 'All Teams');
                populateFilter('#label-filter', labelsUrl, 'All Labels');
            }
        } else {
            // Specific sequence selected - use nested URL pattern (migrationApi supports this)
            const phaseUrl = `/rest/scriptrunner/latest/custom/migrations/${migId}/iterations/${iteId}/sequences/${seqId}/phases`;
            const teamsUrl = `/rest/scriptrunner/latest/custom/teams?sequenceId=${seqId}`;
            const labelsUrl = `/rest/scriptrunner/latest/custom/labels?sequenceId=${seqId}`;
            populateFilter('#phase-filter', phaseUrl, 'All Phases');
            populateFilter('#team-filter', teamsUrl, 'All Teams');
            populateFilter('#label-filter', labelsUrl, 'All Labels');
        }
        
        // Apply filters to reload steps
        this.applyFilters();
    }

    onPhaseChange() {
        const { migration: migId, iteration: iteId, plan: planId, sequence: seqId, phase: phaseId } = this.filters;
        console.log('onPhaseChange: Selected phase ID:', phaseId);

        // Reset dependent filters (teams and labels - no hierarchy below phase)
        this.filters.team = '';
        this.filters.label = '';
        
        // Reset dependent selectors to default state
        this.resetSelector('#team-filter', 'All Teams');
        this.resetSelector('#label-filter', 'All Labels');

        if (!migId || !iteId) {
            this.showBlankRunsheetState();
            return;
        }

        if (!phaseId) {
            // 'All Phases' selected - refresh teams and labels for current sequence or higher level
            if (seqId) {
                const teamsUrl = `/rest/scriptrunner/latest/custom/teams?sequenceId=${seqId}`;
                const labelsUrl = `/rest/scriptrunner/latest/custom/labels?sequenceId=${seqId}`;
                populateFilter('#team-filter', teamsUrl, 'All Teams');
                populateFilter('#label-filter', labelsUrl, 'All Labels');
            } else if (planId) {
                const teamsUrl = `/rest/scriptrunner/latest/custom/teams?planId=${planId}`;
                const labelsUrl = `/rest/scriptrunner/latest/custom/labels?planId=${planId}`;
                populateFilter('#team-filter', teamsUrl, 'All Teams');
                populateFilter('#label-filter', labelsUrl, 'All Labels');
            } else {
                const teamsUrl = `/rest/scriptrunner/latest/custom/teams?iterationId=${iteId}`;
                const labelsUrl = `/rest/scriptrunner/latest/custom/labels?iterationId=${iteId}`;
                populateFilter('#team-filter', teamsUrl, 'All Teams');
                populateFilter('#label-filter', labelsUrl, 'All Labels');
            }
        } else {
            // Specific phase selected - show only teams and labels for this phase
            const teamsUrl = `/rest/scriptrunner/latest/custom/teams?phaseId=${phaseId}`;
            const labelsUrl = `/rest/scriptrunner/latest/custom/labels?phaseId=${phaseId}`;
            populateFilter('#team-filter', teamsUrl, 'All Teams');
            populateFilter('#label-filter', labelsUrl, 'All Labels');
        }
        
        // Apply filters to reload steps
        this.applyFilters();
    }




    selectStep(stepId, stepCode) {
        // Update selected step
        document.querySelectorAll('.step-row').forEach(row => {
            row.classList.remove('selected');
        });
        
        const selectedRow = document.querySelector(`[data-step="${stepId}"]`);
        if (selectedRow) {
            selectedRow.classList.add('selected');
        }
        
        this.selectedStep = stepId;
        this.selectedStepCode = stepCode;
        // Pass the step instance UUID (stepId) to the API, not the step code
        this.loadStepDetails(stepId);
    }

    async loadStepDetails(stepCode) {
        if (!stepCode) return;
        
        const stepDetailsContent = document.querySelector('.step-details-content');
        if (!stepDetailsContent) return;

        // Show loading state
        stepDetailsContent.innerHTML = '<div class="loading-message"><p>🔄 Loading step details...</p></div>';

        try {
            // Use the new instance endpoint instead of the master data endpoint
            const response = await fetch(`/rest/scriptrunner/latest/custom/steps/instance/${encodeURIComponent(stepCode)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const stepData = await response.json();
            
            if (stepData.error) {
                throw new Error(stepData.error);
            }
            
            this.renderStepDetails(stepData);
            
        } catch (error) {
            // Use setTimeout to avoid conflicts with Confluence's MutationObserver
            setTimeout(() => {
                try {
                    stepDetailsContent.innerHTML = `
                        <div class="error-message">
                            <p>❌ Error loading step details: ${error.message}</p>
                            <p>Please try again or contact support.</p>
                        </div>
                    `;
                } catch (domError) {
                    console.warn('Failed to render step details error:', domError);
                }
            }, 10);
        }
    }
    
    /**
     * Fetch status options from the API
     */
    async fetchStepStatuses() {
        try {
            const response = await fetch('/rest/scriptrunner/latest/custom/statuses/step');
            if (!response.ok) {
                throw new Error(`Failed to fetch statuses: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching step statuses:', error);
            return [];
        }
    }

    /**
     * Load status colors from the API and store them for dynamic styling
     */
    async loadStatusColors() {
        try {
            this.statusColors = new Map();
            const statuses = await this.fetchStepStatuses();
            
            statuses.forEach(status => {
                this.statusColors.set(status.name.toUpperCase(), status.color);
            });
            
            console.log('loadStatusColors: Loaded', this.statusColors.size, 'status colors');
            
            // Apply the colors to CSS custom properties
            this.applyStatusColors();
            
            // Apply the colors to step count badges
            this.applyCounterColors();
            
        } catch (error) {
            console.error('Error loading status colors:', error);
            // Initialize with empty map so other methods don't fail
            this.statusColors = new Map();
        }
    }

    /**
     * Apply status colors to CSS custom properties
     */
    applyStatusColors() {
        if (!this.statusColors) return;
        
        const root = document.documentElement;
        
        // Apply colors to CSS custom properties
        this.statusColors.forEach((color, status) => {
            const cssVar = `--status-${status.toLowerCase().replace('_', '-')}-color`;
            root.style.setProperty(cssVar, color);
        });
    }

    /**
     * Populate status dropdown with options and set current status
     */
    async populateStatusDropdown(currentStatus) {
        const dropdown = document.getElementById('step-status-dropdown');
        if (!dropdown) return;

        // Store the current status as an attribute
        dropdown.setAttribute('data-old-status', currentStatus);

        // Fetch available statuses
        const statuses = await this.fetchStepStatuses();
        
        // Clear existing options
        dropdown.innerHTML = '';
        
        // Add status options
        statuses.forEach(status => {
            const option = document.createElement('option');
            option.value = status.name;
            option.textContent = status.name.replace(/_/g, ' ');
            option.setAttribute('data-color', status.color);
            
            if (status.name === currentStatus) {
                option.selected = true;
            }
            
            dropdown.appendChild(option);
        });
        
        // Set dropdown background color based on selected status
        this.updateDropdownColor(dropdown);
        
        // Add change event listener
        dropdown.addEventListener('change', (e) => this.handleStatusChange(e));
    }

    /**
     * Update dropdown background color based on selected option
     */
    updateDropdownColor(dropdown) {
        const selectedOption = dropdown.options[dropdown.selectedIndex];
        if (selectedOption) {
            const color = selectedOption.getAttribute('data-color');
            if (color) {
                dropdown.style.backgroundColor = color;
                // Set text color based on background brightness
                const rgb = this.hexToRgb(color);
                const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
                dropdown.style.color = brightness > 128 ? '#000' : '#fff';
            }
        }
    }

    /**
     * Convert hex color to RGB
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    /**
     * Handle status change event
     */
    async handleStatusChange(event) {
        const dropdown = event.target;
        const newStatus = dropdown.value;
        const stepId = dropdown.getAttribute('data-step-id');
        const oldStatus = dropdown.getAttribute('data-old-status') || 'PENDING';
        
        // Update dropdown color immediately
        this.updateDropdownColor(dropdown);
        
        // Check role permissions
        if (this.userRole !== 'PILOT' && this.userRole !== 'ADMIN') {
            this.showNotification('Only PILOT or ADMIN users can change status', 'error');
            dropdown.value = oldStatus; // Reset to old status
            this.updateDropdownColor(dropdown);
            return;
        }
        
        // Don't do anything if status hasn't actually changed
        if (newStatus === oldStatus) {
            return;
        }
        
        try {
            // Call API to update status
            const response = await fetch(`${this.config.api.baseUrl}/steps/instance/${stepId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    status: newStatus,
                    userId: this.userContext?.userId || null
                })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to update status: ${response.status}`);
            }
            
            const result = await response.json();
            
            // Update the old status attribute for next change
            dropdown.setAttribute('data-old-status', newStatus);
            
            // Show success notification
            this.showNotification(`Status updated to ${newStatus}. Email notifications sent.`, 'success');
            
            // Update the status in the table view
            this.updateStepStatus(stepId, newStatus);
            
        } catch (error) {
            console.error('Error updating status:', error);
            this.showNotification('Failed to update status', 'error');
            
            // Revert dropdown to old status
            dropdown.value = oldStatus;
            this.updateDropdownColor(dropdown);
        }
    }

    /**
     * Attach event listeners to instruction checkboxes
     */
    attachInstructionListeners() {
        const checkboxes = document.querySelectorAll('.instruction-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => this.handleInstructionToggle(e));
        });
    }

    /**
     * Attach event listeners to action buttons
     */
    attachActionButtonListeners() {
        const markAllBtn = document.getElementById('mark-all-complete');
        if (markAllBtn) {
            markAllBtn.addEventListener('click', () => this.markAllInstructionsComplete());
        }
        
        const updateStatusBtn = document.getElementById('update-status-btn');
        if (updateStatusBtn) {
            updateStatusBtn.addEventListener('click', () => this.handleUpdateStatusClick());
        }
    }

    /**
     * Mark all uncompleted instructions as complete
     */
    async markAllInstructionsComplete() {
        const uncheckedBoxes = document.querySelectorAll('.instruction-checkbox:not(:checked)');
        
        if (uncheckedBoxes.length === 0) {
            this.showNotification('All instructions are already complete', 'info');
            return;
        }
        
        const confirmMessage = `Mark ${uncheckedBoxes.length} instruction${uncheckedBoxes.length > 1 ? 's' : ''} as complete?`;
        if (!confirm(confirmMessage)) {
            return;
        }
        
        let completedCount = 0;
        let failedCount = 0;
        
        // Disable the button during processing
        const markAllBtn = document.getElementById('mark-all-complete');
        if (markAllBtn) {
            markAllBtn.disabled = true;
            markAllBtn.textContent = 'Marking Complete...';
        }
        
        // Process each unchecked checkbox
        for (const checkbox of uncheckedBoxes) {
            try {
                // Simulate clicking the checkbox
                checkbox.checked = true;
                await this.handleInstructionToggle({ target: checkbox });
                completedCount++;
            } catch (error) {
                failedCount++;
                console.error('Failed to complete instruction:', error);
            }
        }
        
        // Re-enable button
        if (markAllBtn) {
            markAllBtn.disabled = false;
            markAllBtn.textContent = 'Mark All Instructions Complete';
        }
        
        // Show summary notification
        if (failedCount === 0) {
            this.showNotification(`Successfully marked ${completedCount} instructions as complete`, 'success');
        } else {
            this.showNotification(`Marked ${completedCount} complete, ${failedCount} failed`, 'warning');
        }
    }

    /**
     * Handle update status button click
     */
    handleUpdateStatusClick() {
        const dropdown = document.getElementById('step-status-dropdown');
        if (dropdown) {
            // Trigger the change event on the dropdown
            dropdown.dispatchEvent(new Event('change'));
        }
    }

    /**
     * Handle instruction checkbox toggle
     */
    async handleInstructionToggle(event) {
        const checkbox = event.target;
        const instructionId = checkbox.getAttribute('data-instruction-id');
        const stepId = checkbox.getAttribute('data-step-id');
        const isChecked = checkbox.checked;
        
        if (!instructionId) {
            console.error('No instruction ID found for checkbox');
            return;
        }
        
        // Disable checkbox during update
        checkbox.disabled = true;
        
        try {
            if (isChecked) {
                // Call API to mark instruction as complete
                await this.completeInstruction(stepId, instructionId);
                
                // Add completed styling to the row
                const row = checkbox.closest('.instruction-row');
                if (row) {
                    row.classList.add('completed');
                }
                
                this.showNotification('Instruction marked as complete', 'success');
            } else {
                // For now, we don't allow unchecking completed instructions
                checkbox.checked = true;
                this.showNotification('Completed instructions cannot be undone', 'warning');
            }
        } catch (error) {
            // Revert checkbox state on error
            checkbox.checked = !isChecked;
            this.showNotification('Failed to update instruction status', 'error');
            console.error('Error updating instruction:', error);
        } finally {
            // Re-enable checkbox
            checkbox.disabled = false;
        }
    }

    /**
     * Complete an instruction via API
     */
    async completeInstruction(stepId, instructionId) {
        const response = await fetch(`/rest/scriptrunner/latest/custom/steps/${stepId}/instructions/${instructionId}/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: 1 // TODO: Get actual user ID from session/context
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to complete instruction');
        }
        
        const result = await response.json();
        
        // Log email notification info
        if (result.emailsSent) {
            console.log(`Email notifications sent: ${result.emailsSent}`);
        }
        
        return result;
    }

    renderStepDetails(stepData) {
        const stepDetailsContent = document.querySelector('.step-details-content');
        if (!stepDetailsContent) return;
        
        // Use setTimeout to avoid conflicts with Confluence's MutationObserver
        setTimeout(() => {
            try {
                this.doRenderStepDetails(stepData, stepDetailsContent);
            } catch (error) {
                console.warn('Failed to render step details:', error);
            }
        }, 10);
    }
    
    doRenderStepDetails(stepData, stepDetailsContent) {
        
        const summary = stepData.stepSummary || {};
        const instructions = stepData.instructions || [];
        const impactedTeams = stepData.impactedTeams || [];
        
        // Debug log to check if labels are being returned
        console.log('Step Summary:', summary);
        console.log('Labels:', summary.Labels);
        
        
        // Helper function to get status display - use the main getStatusDisplay method
        const getStatusDisplay = (status) => {
            return this.getStatusDisplay(status);
        };
        
        let html = `
            <div class="step-info">
                <div class="step-title">
                    <h3>📋 ${summary.StepCode || 'Unknown'} - ${summary.Name || 'Unknown Step'}</h3>
                </div>
                
                <div class="step-breadcrumb">
                    <span class="breadcrumb-item">${summary.MigrationName || 'Migration'}</span>
                    <span class="breadcrumb-separator">›</span>
                    <span class="breadcrumb-item">${summary.PlanName || 'Plan'}</span>
                    <span class="breadcrumb-separator">›</span>
                    <span class="breadcrumb-item">${summary.IterationName || 'Iteration'}</span>
                    <span class="breadcrumb-separator">›</span>
                    <span class="breadcrumb-item">${summary.SequenceName || 'Sequence'}</span>
                    <span class="breadcrumb-separator">›</span>
                    <span class="breadcrumb-item">${summary.PhaseName || 'Phase'}</span>
                </div>
                
                <div class="step-key-info">
                    <div class="metadata-item">
                        <span class="label">📊 Status:</span>
                        <span class="value">
                            <select id="step-status-dropdown" class="status-dropdown pilot-only" data-step-id="${summary.ID || stepData.stepCode}" style="padding: 2px 8px; border-radius: 3px;">
                                <option value="">Loading...</option>
                            </select>
                        </span>
                    </div>
                    <div class="metadata-item">
                        <span class="label">⬅️ Predecessor:</span>
                        <span class="value">${summary.PredecessorCode ? `${summary.PredecessorCode}${summary.PredecessorName ? ` - ${summary.PredecessorName}` : ''}` : '-'}</span>
                    </div>
                </div>
                
                <div class="step-metadata">
                    <div class="metadata-item">
                        <span class="label">🎯 Target Environment:</span>
                        <span class="value">${summary.TargetEnvironment || 'Not specified'}</span>
                    </div>
                    <div class="metadata-item">
                        <span class="label">🔄 Scope:</span>
                        <span class="value">
                            ${summary.IterationTypes && summary.IterationTypes.length > 0 
                                ? summary.IterationTypes.map(type => `<span class="scope-tag">${type}</span>`).join(' ')
                                : '<span style="color: var(--color-text-tertiary); font-style: italic;">None specified</span>'
                            }
                        </span>
                    </div>
                    <div class="metadata-item teams-container">
                        <div class="team-section">
                            <span class="label">👤 Primary Team:</span>
                            <span class="value">${summary.AssignedTeam || 'Not assigned'}</span>
                        </div>
                        <div class="team-section">
                            <span class="label">👥 Impacted Teams:</span>
                            <span class="value">${impactedTeams.length > 0 ? impactedTeams.join(', ') : 'None'}</span>
                        </div>
                    </div>
                    <div class="metadata-item">
                        <span class="label">📂 Location:</span>
                        <span class="value">${summary.SequenceName ? `Sequence: ${summary.SequenceName}` : 'Unknown sequence'}${summary.PhaseName ? ` | Phase: ${summary.PhaseName}` : ''}</span>
                    </div>
                    <div class="metadata-item">
                        <span class="label">⏱️ Duration:</span>
                        <span class="value">${summary.Duration ? `${summary.Duration} min.` : summary.EstimatedDuration ? `${summary.EstimatedDuration} min.` : '45 min.'}</span>
                    </div>
                    ${summary.Labels && summary.Labels.length > 0 ? `
                    <div class="metadata-item">
                        <span class="label">🏷️ Labels:</span>
                        <span class="value">
                            ${summary.Labels.map(label => `<span class="label-tag" style="background-color: ${label.color}; color: ${this.getContrastColor(label.color)};">${label.name}</span>`).join(' ')}
                        </span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="step-description">
                    <h4>📝 Description:</h4>
                    <p>${summary.Description || 'No description available'}</p>
                </div>
            </div>
        `;
        
        if (instructions.length > 0) {
            html += `
                <div class="instructions-section">
                    <h4>📋 INSTRUCTIONS</h4>
                    <div class="instructions-table">
                        <div class="instructions-header">
                            <div class="col-num">#</div>
                            <div class="col-instruction">Instruction</div>
                            <div class="col-team">Team</div>
                            <div class="col-control">Control</div>
                            <div class="col-duration">Duration</div>
                            <div class="col-complete">✓</div>
                        </div>
            `;
            
            instructions.forEach((instruction, index) => {
                html += `
                    <div class="instruction-row ${instruction.IsCompleted ? 'completed' : ''}">
                        <div class="col-num">${instruction.Order || (index + 1)}</div>
                        <div class="col-instruction">${instruction.Description || instruction.Instruction || 'No description'}</div>
                        <div class="col-team">${instruction.Team || summary.AssignedTeam || 'TBD'}</div>
                        <div class="col-control">${instruction.Control || instruction.ControlCode || `CTRL-${String(index + 1).padStart(2, '0')}`}</div>
                        <div class="col-duration">${instruction.Duration ? `${instruction.Duration} min.` : instruction.EstimatedDuration ? `${instruction.EstimatedDuration} min.` : '5 min.'}</div>
                        <div class="col-complete">
                            <input type="checkbox" 
                                class="instruction-checkbox pilot-only" 
                                data-instruction-id="${instruction.ID || instruction.ini_id || instruction.Order || index + 1}"
                                data-step-id="${summary.ID || stepData.stepCode || ''}"
                                data-instruction-index="${index}"
                                ${instruction.IsCompleted ? 'checked' : ''}>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        // Store the step instance ID for comment operations
        if (summary.sti_id) {
            this.currentStepInstanceId = summary.sti_id;
        }
        
        // Add comment section with real data
        const comments = stepData.comments || [];
        html += `
            <div class="comments-section">
                <h4>💬 COMMENTS (${comments.length})</h4>
                <div class="comments-list" id="comments-list">
        `;
        
        if (comments.length === 0) {
            html += '<p class="no-comments">No comments yet. Be the first to comment!</p>';
        } else {
            comments.forEach(comment => {
                const timeAgo = this.formatTimeAgo(comment.createdAt);
                const teamName = comment.author.team ? ` (${comment.author.team})` : '';
                html += `
                    <div class="comment" data-comment-id="${comment.id}">
                        <div class="comment-header">
                            <span class="comment-author">${comment.author.name}${teamName}</span>
                            <span class="comment-time">${timeAgo}</span>
                            <div class="comment-actions">
                                <button class="btn-edit-comment pilot-only" data-comment-id="${comment.id}" title="Edit">✏️</button>
                                <button class="btn-delete-comment admin-only" data-comment-id="${comment.id}" title="Delete">🗑️</button>
                            </div>
                        </div>
                        <div class="comment-body" id="comment-body-${comment.id}">${this.escapeHtml(comment.body)}</div>
                    </div>
                `;
            });
        }
        
        html += `
                </div>
                
                <div class="comment-form pilot-only">
                    <textarea id="new-comment-text" placeholder="Add a comment..." rows="3"></textarea>
                    <button type="button" class="btn btn-primary" id="add-comment-btn">Add Comment</button>
                </div>
            </div>
            
            <div class="step-actions pilot-only">
                <button type="button" class="btn btn-secondary" id="mark-all-complete">Mark All Instructions Complete</button>
                <button type="button" class="btn btn-primary" id="update-status-btn">Update Status</button>
            </div>
        `;
        
        stepDetailsContent.innerHTML = html;
        
        // Apply role-based controls to the newly rendered content
        this.applyRoleBasedControls();
        
        // Populate the status dropdown with available options
        this.populateStatusDropdown(summary.Status);
        
        // Add event listeners for instruction checkboxes
        this.attachInstructionListeners();
        
        // Add event listeners for action buttons
        this.attachActionButtonListeners();
        
        // Add event listeners for comment functionality
        this.attachCommentListeners();
    }

    applyFilters() {
        this.loadSteps();
        this.showNotification('Filters applied', 'info');
    }

    /**
     * Load steps from the backend API based on current filters
     */
    async loadSteps() {
        const runsheetContent = document.getElementById('runsheet-content');
        if (!runsheetContent) return;

        // Show loading state
        runsheetContent.innerHTML = '<div class="loading-message"><p>🔄 Loading steps...</p></div>';

        // Build query parameters from filters
        const params = new URLSearchParams();
        
        if (this.filters.migration) params.append('migrationId', this.filters.migration);
        if (this.filters.iteration) params.append('iterationId', this.filters.iteration);
        if (this.filters.plan) params.append('planId', this.filters.plan);
        if (this.filters.sequence) params.append('sequenceId', this.filters.sequence);
        if (this.filters.phase) params.append('phaseId', this.filters.phase);
        if (this.filters.team) params.append('teamId', this.filters.team);
        if (this.filters.label) params.append('labelId', this.filters.label);

        // Don't load steps if no migration or iteration is selected
        if (!this.filters.migration || !this.filters.iteration) {
            runsheetContent.innerHTML = `
                <div class="loading-message">
                    <p>📋 Select a migration and iteration to view steps</p>
                </div>
            `;
            this.updateStepCounts(0, 0, 0, 0, 0);
            return;
        }

        try {
            const response = await fetch(`/rest/scriptrunner/latest/custom/steps?${params.toString()}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const sequences = await response.json();
            
            if (!Array.isArray(sequences) || sequences.length === 0) {
                runsheetContent.innerHTML = `
                    <div class="loading-message">
                        <p>📋 No steps found for current filters</p>
                    </div>
                `;
                this.updateStepCounts(0, 0, 0, 0, 0);
                return;
            }

            // Update team filter based on actual steps data
            this.updateTeamFilterFromSteps(sequences);
            
            this.renderRunsheet(sequences);
            this.calculateAndUpdateStepCounts(sequences);
            
        } catch (error) {
            runsheetContent.innerHTML = `
                <div class="error-message">
                    <p>❌ Error loading steps: ${error.message}</p>
                    <p>Please try again or contact support.</p>
                </div>
            `;
            this.updateStepCounts(0, 0, 0, 0, 0);
        }
    }

    /**
     * Render the runsheet with grouped sequences and phases
     */
    renderRunsheet(sequences) {
        const runsheetContent = document.getElementById('runsheet-content');
        if (!runsheetContent) return;

        let html = '';
        
        sequences.forEach(sequence => {
            html += `
                <div class="sequence-section">
                    <div class="sequence-header">
                        <span class="expand-icon">▼</span>
                        <h3>SEQUENCE ${sequence.number}: ${sequence.name}</h3>
                    </div>
            `;
            
            sequence.phases.forEach(phase => {
                html += `
                    <div class="phase-section">
                        <div class="phase-header">
                            <span class="expand-icon">▼</span>
                            <h4>PHASE ${phase.number}: ${phase.name}</h4>
                        </div>
                        
                        <table class="runsheet-table">
                            <thead>
                                <tr>
                                    <th class="col-code">Code</th>
                                    <th class="col-title">Title</th>
                                    <th class="col-team">Team</th>
                                    <th class="col-labels">Labels</th>
                                    <th class="col-status">Status</th>
                                    <th class="col-duration">Duration</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                
                phase.steps.forEach(step => {
                    const statusClass = this.getStatusClass(step.status);
                    const labelsHtml = this.renderLabels(step.labels || []);
                    html += `
                        <tr class="step-row ${step.id === this.selectedStep ? 'selected' : ''}" 
                            data-step="${step.id}" 
                            data-step-code="${step.code}">
                            <td class="col-code">${step.code}</td>
                            <td class="col-title">${step.name}</td>
                            <td class="col-team">${step.ownerTeamName}</td>
                            <td class="col-labels">${labelsHtml}</td>
                            <td class="col-status">${this.getStatusDisplay(step.status)}</td>
                            <td class="col-duration">${step.durationMinutes ? step.durationMinutes + ' min' : '-'}</td>
                        </tr>
                    `;
                });
                
                html += `
                            </tbody>
                        </table>
                    </div>
                `;
            });
            
            html += `</div>`;
        });
        
        // Use setTimeout to avoid conflicts with Confluence's MutationObserver
        setTimeout(() => {
            try {
                runsheetContent.innerHTML = html;
                
                // Bind click events to step rows
                this.bindStepRowEvents();
                
                // Bind fold/unfold events to sequence and phase headers
                this.bindFoldingEvents();
            } catch (error) {
                console.warn('Failed to render runsheet:', error);
            }
        }, 10);
    }

    /**
     * Bind click events to step rows
     */
    bindStepRowEvents() {
        const stepRows = document.querySelectorAll('.step-row');
        stepRows.forEach(row => {
            row.addEventListener('click', () => {
                const stepId = row.getAttribute('data-step');
                const stepCode = row.getAttribute('data-step-code');
                if (stepId) {
                    this.selectStep(stepId, stepCode);
                }
            });
        });
    }

    /**
     * Bind fold/unfold events to sequence and phase headers
     */
    bindFoldingEvents() {
        // Sequence headers
        document.querySelectorAll('.sequence-header').forEach(header => {
            header.addEventListener('click', (e) => {
                this.toggleSequence(e.currentTarget);
            });
        });

        // Phase headers
        document.querySelectorAll('.phase-header').forEach(header => {
            header.addEventListener('click', (e) => {
                this.togglePhase(e.currentTarget);
            });
        });
    }

    /**
     * Toggle sequence visibility (fold/unfold)
     */
    toggleSequence(sequenceHeader) {
        const icon = sequenceHeader.querySelector('.expand-icon');
        const sequenceSection = sequenceHeader.closest('.sequence-section');
        const phaseSections = sequenceSection.querySelectorAll('.phase-section');

        if (icon.classList.contains('collapsed')) {
            icon.classList.remove('collapsed');
            phaseSections.forEach(phase => phase.style.display = 'block');
        } else {
            icon.classList.add('collapsed');
            phaseSections.forEach(phase => phase.style.display = 'none');
        }
    }

    /**
     * Toggle phase visibility (fold/unfold)
     */
    togglePhase(phaseHeader) {
        const icon = phaseHeader.querySelector('.expand-icon');
        const phaseSection = phaseHeader.closest('.phase-section');
        const stepsTable = phaseSection.querySelector('table.runsheet-table');

        if (icon.classList.contains('collapsed')) {
            icon.classList.remove('collapsed');
            if (stepsTable) {
                stepsTable.style.display = 'table';
            }
        } else {
            icon.classList.add('collapsed');
            if (stepsTable) {
                stepsTable.style.display = 'none';
            }
        }
    }

    /**
     * Get CSS class for step status
     */
    getStatusClass(status) {
        if (!status) return 'status-pending';
        
        // Handle exact status matches from status_sts table
        switch (status.toUpperCase()) {
            case 'COMPLETED':
                return 'status-completed';
            case 'IN_PROGRESS':
                return 'status-progress';
            case 'FAILED':
                return 'status-failed';
            case 'BLOCKED':
                return 'status-blocked';
            case 'CANCELLED':
                return 'status-cancelled';
            case 'TODO':
                return 'status-todo';
            case 'PENDING':
                return 'status-pending';
            default:
                // Fallback to old logic for backward compatibility
                const statusLower = status.toLowerCase();
                if (statusLower.includes('completed')) return 'status-completed';
                if (statusLower.includes('progress')) return 'status-progress';
                if (statusLower.includes('failed') || statusLower.includes('error')) return 'status-failed';
                if (statusLower.includes('blocked')) return 'status-blocked';
                if (statusLower.includes('cancelled')) return 'status-cancelled';
                if (statusLower.includes('todo') || statusLower.includes('not_started')) return 'status-todo';
                return 'status-pending';
        }
    }

    /**
     * Get contrasting text color for a background color
     */
    getContrastColor(hexColor) {
        // Convert hex to RGB
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        
        // Calculate relative luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        // Return black or white based on luminance
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    /**
     * Get status display with dynamic color from database
     */
    getStatusDisplay(status) {
        if (!status) return this.createStatusSpan('PENDING', 'PENDING');
        
        const statusUpper = status.toUpperCase();
        const displayText = statusUpper.replace(/_/g, ' ');
        
        return this.createStatusSpan(statusUpper, displayText);
    }

    /**
     * Create a status span with dynamic color
     */
    createStatusSpan(statusKey, displayText) {
        const color = this.statusColors?.get(statusKey) || '#DDDDDD';
        const textColor = this.getTextColorForBackground(color);
        
        return `<span class="status-display" style="background-color: ${color}; color: ${textColor}; padding: 2px 6px; border-radius: 3px; font-weight: 600; font-size: 10px; letter-spacing: 0.5px;">${displayText}</span>`;
    }

    /**
     * Get appropriate text color (black or white) based on background color
     */
    getTextColorForBackground(bgColor) {
        // Convert hex to RGB
        const hex = bgColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        // Return black for light backgrounds, white for dark backgrounds
        return luminance > 0.5 ? '#000000' : '#FFFFFF';
    }

    /**
     * Render labels as colored tags
     */
    renderLabels(labels) {
        if (!labels || labels.length === 0) {
            return '<span class="no-labels">-</span>';
        }
        
        return labels.map(label => {
            const color = label.color || '#6B778C';
            return `<span class="label-tag" style="background-color: ${color}; color: white;" title="${label.description || label.name}">${label.name}</span>`;
        }).join(' ');
    }

    /**
     * Calculate and update step counts from sequences data
     */
    calculateAndUpdateStepCounts(sequences) {
        let total = 0;
        let pending = 0;
        let todo = 0;
        let progress = 0;
        let completed = 0;
        let failed = 0;
        let blocked = 0;
        let cancelled = 0;
        
        sequences.forEach(sequence => {
            sequence.phases.forEach(phase => {
                phase.steps.forEach(step => {
                    total++;
                    
                    // Use exact status matching from status_sts table
                    if (!step.status) {
                        pending++;
                        return;
                    }
                    
                    switch (step.status.toUpperCase()) {
                        case 'COMPLETED':
                            completed++;
                            break;
                        case 'IN_PROGRESS':
                            progress++;
                            break;
                        case 'FAILED':
                            failed++;
                            break;
                        case 'BLOCKED':
                            blocked++;
                            break;
                        case 'CANCELLED':
                            cancelled++;
                            break;
                        case 'TODO':
                            todo++;
                            break;
                        case 'PENDING':
                            pending++;
                            break;
                        default:
                            // Fallback to old logic for backward compatibility
                            const statusClass = this.getStatusClass(step.status);
                            switch (statusClass) {
                                case 'status-completed':
                                    completed++;
                                    break;
                                case 'status-progress':
                                    progress++;
                                    break;
                                case 'status-failed':
                                    failed++;
                                    break;
                                case 'status-blocked':
                                    blocked++;
                                    break;
                                case 'status-cancelled':
                                    cancelled++;
                                    break;
                                case 'status-todo':
                                    todo++;
                                    break;
                                default:
                                    pending++;
                            }
                    }
                });
            });
        });
        
        this.updateStepCounts(total, pending, todo, progress, completed, failed, blocked, cancelled);
    }

    /**
     * Update step count display
     */
    updateStepCounts(total, pending, todo, progress, completed, failed, blocked, cancelled) {
        const elements = {
            'total-steps': total,
            'pending-steps': pending,
            'todo-steps': todo,
            'progress-steps': progress,
            'completed-steps': completed,
            'failed-steps': failed,
            'blocked-steps': blocked,
            'cancelled-steps': cancelled
        };
        
        // Use setTimeout to avoid conflicts with Confluence's MutationObserver
        setTimeout(() => {
            Object.entries(elements).forEach(([id, count]) => {
                try {
                    const element = document.getElementById(id);
                    if (element) {
                        element.textContent = count;
                    }
                } catch (error) {
                    console.warn(`Failed to update step count for ${id}:`, error);
                }
            });
        }, 10);
    }

    /**
     * Update team filter dropdown based on actual teams that own steps
     * @param {Array} sequences - Array of sequences with phases and steps
     */
    updateTeamFilterFromSteps(sequences) {
        const teamFilter = document.getElementById('team-filter');
        if (!teamFilter) return;

        // Extract unique teams from steps
        const teamsMap = new Map();
        
        sequences.forEach(sequence => {
            sequence.phases.forEach(phase => {
                phase.steps.forEach(step => {
                    if (step.ownerTeamId && step.ownerTeamName) {
                        teamsMap.set(step.ownerTeamId, step.ownerTeamName);
                    }
                });
            });
        });

        // Convert to array and sort
        const teams = Array.from(teamsMap.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name));

        // Store current selection
        const currentSelection = teamFilter.value;

        // Clear and populate dropdown
        teamFilter.innerHTML = '<option value="">All Teams</option>';
        
        teams.forEach(team => {
            const option = document.createElement('option');
            option.value = team.id;
            option.textContent = team.name;
            teamFilter.appendChild(option);
        });

        // Restore selection if it still exists
        if (currentSelection && teams.find(t => t.id == currentSelection)) {
            teamFilter.value = currentSelection;
        } else if (currentSelection) {
            // If the previously selected team is no longer available, reset the filter
            teamFilter.value = '';
            this.filters.team = '';
        }

        console.log(`updateTeamFilterFromSteps: Updated team filter with ${teams.length} teams`);
    }

    /**
     * Apply dynamic colors to step count elements
     */
    applyCounterColors() {
        if (!this.statusColors) return;
        
        const counterMappings = [
            { elementId: 'pending-steps', statusKey: 'PENDING' },
            { elementId: 'todo-steps', statusKey: 'TODO' },
            { elementId: 'progress-steps', statusKey: 'IN_PROGRESS' },
            { elementId: 'completed-steps', statusKey: 'COMPLETED' },
            { elementId: 'failed-steps', statusKey: 'FAILED' },
            { elementId: 'blocked-steps', statusKey: 'BLOCKED' },
            { elementId: 'cancelled-steps', statusKey: 'CANCELLED' }
        ];
        
        counterMappings.forEach(({ elementId, statusKey }) => {
            const element = document.getElementById(elementId);
            if (element) {
                const color = this.statusColors.get(statusKey) || '#DDDDDD';
                const textColor = this.getTextColorForBackground(color);
                
                element.style.backgroundColor = color;
                element.style.color = textColor;
                element.style.border = `1px solid ${color}`;
            }
        });
    }

    startStep() {
        if (this.selectedStep) {
            // TODO: Implement step status update API call
            this.showNotification('Step status update functionality coming soon', 'info');
        }
    }

    completeStep() {
        if (this.selectedStep) {
            // TODO: Implement step status update API call
            this.showNotification('Step status update functionality coming soon', 'info');
        }
    }

    blockStep() {
        if (this.selectedStep) {
            // TODO: Implement step status update API call
            this.showNotification('Step status update functionality coming soon', 'info');
        }
    }

    addComment() {
        const commentInput = document.querySelector('.comment-form textarea');
        if (commentInput && commentInput.value.trim()) {
            // TODO: Implement comment API call
            commentInput.value = '';
            this.showNotification('Comment functionality coming soon', 'info');
        }
    }

    updateStepStatus(stepId, status) {
        // Update the table row
        const row = document.querySelector(`[data-step="${stepId}"]`);
        if (row) {
            const statusCell = row.querySelector('.col-status');
            if (statusCell) {
                statusCell.textContent = status;
                statusCell.className = `col-status ${this.getStatusClass(status)}`;
            }
        }
        
        // Reload steps to update counts
        this.loadSteps();
    }

    /**
     * Format time ago from timestamp
     */
    formatTimeAgo(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };
        
        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
            }
        }
        
        return 'just now';
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Attach event listeners for comment functionality
     */
    attachCommentListeners() {
        // Add comment button
        const addCommentBtn = document.getElementById('add-comment-btn');
        if (addCommentBtn) {
            addCommentBtn.addEventListener('click', () => this.handleAddComment());
        }
        
        // Edit comment buttons
        const editButtons = document.querySelectorAll('.btn-edit-comment');
        editButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleEditComment(e));
        });
        
        // Delete comment buttons
        const deleteButtons = document.querySelectorAll('.btn-delete-comment');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleDeleteComment(e));
        });
    }
    
    /**
     * Handle adding a new comment
     */
    async handleAddComment() {
        const textarea = document.getElementById('new-comment-text');
        const addBtn = document.getElementById('add-comment-btn');
        
        if (!textarea || !addBtn) return;
        
        const commentText = textarea.value.trim();
        if (!commentText) {
            this.showNotification('Please enter a comment', 'warning');
            return;
        }
        
        // Get the current step instance ID
        const stepSummary = document.querySelector('.step-info');
        const stiId = stepSummary?.dataset?.stiId || this.currentStepInstanceId;
        
        if (!stiId) {
            this.showNotification('Unable to determine step instance', 'error');
            return;
        }
        
        try {
            // Disable the button during submission
            addBtn.disabled = true;
            textarea.disabled = true;
            
            const response = await fetch(`/rest/scriptrunner/latest/custom/steps/${stiId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    body: commentText,
                    userId: 1 // TODO: Get actual user ID
                })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to add comment: ${response.status}`);
            }
            
            const result = await response.json();
            
            // Clear the textarea
            textarea.value = '';
            
            // Refresh the step details to show the new comment
            if (this.selectedStep) {
                this.loadStepDetails(this.selectedStep);
            }
            
            this.showNotification('Comment added successfully', 'success');
            
        } catch (error) {
            console.error('Error adding comment:', error);
            this.showNotification('Failed to add comment', 'error');
        } finally {
            // Re-enable controls
            addBtn.disabled = false;
            textarea.disabled = false;
        }
    }
    
    /**
     * Handle editing a comment
     */
    async handleEditComment(event) {
        const commentId = event.target.dataset.commentId;
        const commentDiv = document.querySelector(`[data-comment-id="${commentId}"]`);
        const bodyDiv = document.getElementById(`comment-body-${commentId}`);
        
        if (!bodyDiv) return;
        
        const currentText = bodyDiv.textContent;
        
        // Replace body with textarea
        bodyDiv.innerHTML = `
            <textarea id="edit-comment-${commentId}" rows="3" style="width: 100%;">${currentText}</textarea>
            <div style="margin-top: 8px;">
                <button class="btn btn-primary btn-sm" onclick="iterationView.saveCommentEdit('${commentId}')">Save</button>
                <button class="btn btn-secondary btn-sm" onclick="iterationView.cancelCommentEdit('${commentId}', '${this.escapeHtml(currentText)}')">Cancel</button>
            </div>
        `;
        
        // Focus the textarea
        const textarea = document.getElementById(`edit-comment-${commentId}`);
        if (textarea) {
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }
    }
    
    /**
     * Save comment edit
     */
    async saveCommentEdit(commentId) {
        const textarea = document.getElementById(`edit-comment-${commentId}`);
        if (!textarea) return;
        
        const newText = textarea.value.trim();
        if (!newText) {
            this.showNotification('Comment cannot be empty', 'warning');
            return;
        }
        
        try {
            const response = await fetch(`/rest/scriptrunner/latest/custom/comments/${commentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    body: newText,
                    userId: 1 // TODO: Get actual user ID
                })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to update comment: ${response.status}`);
            }
            
            // Refresh the step details
            if (this.selectedStep) {
                this.loadStepDetails(this.selectedStep);
            }
            
            this.showNotification('Comment updated successfully', 'success');
            
        } catch (error) {
            console.error('Error updating comment:', error);
            this.showNotification('Failed to update comment', 'error');
        }
    }
    
    /**
     * Cancel comment edit
     */
    cancelCommentEdit(commentId, originalText) {
        const bodyDiv = document.getElementById(`comment-body-${commentId}`);
        if (bodyDiv) {
            bodyDiv.innerHTML = originalText;
        }
    }
    
    /**
     * Handle deleting a comment
     */
    async handleDeleteComment(event) {
        const commentId = event.target.dataset.commentId;
        
        if (!confirm('Are you sure you want to delete this comment?')) {
            return;
        }
        
        try {
            const response = await fetch(`/rest/scriptrunner/latest/custom/comments/${commentId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to delete comment: ${response.status}`);
            }
            
            // Remove the comment from DOM
            const commentDiv = document.querySelector(`[data-comment-id="${commentId}"]`);
            if (commentDiv) {
                commentDiv.remove();
            }
            
            // Update the comment count
            const commentsHeader = document.querySelector('.comments-section h4');
            if (commentsHeader) {
                const currentCount = parseInt(commentsHeader.textContent.match(/\d+/)[0]) || 0;
                commentsHeader.textContent = `💬 COMMENTS (${Math.max(0, currentCount - 1)})`;
            }
            
            this.showNotification('Comment deleted successfully', 'success');
            
        } catch (error) {
            console.error('Error deleting comment:', error);
            this.showNotification('Failed to delete comment', 'error');
        }
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            color: white;
            font-weight: 600;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;

        // Set background color based on type
        const colors = {
            info: '#0065FF',
            success: '#00875A',
            warning: '#FF8B00',
            error: '#DE350B'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        // Add to DOM
        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
            style.remove();
        }, 3000);
    }

    updateFilters() {
        // Initialize filter state
        this.applyFilters();
    }

    /**
     * Show blank runsheet state when no migration/iteration is selected
     */
    showBlankRunsheetState() {
        const runsheetContent = document.getElementById('runsheet-content');
        if (runsheetContent) {
            runsheetContent.innerHTML = `
                <div class="loading-message">
                    <p>📋 Select a migration and iteration to view steps</p>
                </div>
            `;
        }
        
        // Clear step details
        const stepDetailsContent = document.querySelector('.step-details-content');
        if (stepDetailsContent) {
            stepDetailsContent.innerHTML = `
                <div class="loading-message">
                    <p>👋 Select a step from the runsheet to view details</p>
                </div>
            `;
        }
        
        // Reset counts
        this.updateStepCounts(0, 0, 0, 0, 0);
    }

    /**
     * Load steps and auto-select first step of first phase in first sequence
     */
    async loadStepsAndSelectFirst() {
        try {
            // Load the steps first
            await this.loadSteps();
            
            // Auto-select first step if none is selected
            if (!this.selectedStep) {
                const firstStepRow = document.querySelector('.step-row');
                if (firstStepRow) {
                    const stepId = firstStepRow.getAttribute('data-step');
                    const stepCode = firstStepRow.getAttribute('data-step-code');
                    if (stepId) {
                        this.selectStep(stepId, stepCode);
                    }
                }
            }
        } catch (error) {
            console.error('loadStepsAndSelectFirst: Error:', error);
            this.showBlankRunsheetState();
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const iterationView = new IterationView();
    
    // Add expand/collapse all functionality
    const expandAllBtn = document.getElementById('expand-all-btn');
    const collapseAllBtn = document.getElementById('collapse-all-btn');
    
    if (expandAllBtn) {
        expandAllBtn.addEventListener('click', () => {
            // Expand all sequences and phases
            document.querySelectorAll('.sequence-header .expand-icon').forEach(icon => {
                icon.classList.remove('collapsed');
            });
            document.querySelectorAll('.phase-header .expand-icon').forEach(icon => {
                icon.classList.remove('collapsed');
            });
            document.querySelectorAll('.phase-section').forEach(phase => {
                phase.style.display = 'block';
            });
            document.querySelectorAll('.runsheet-table').forEach(table => {
                table.style.display = 'table';
            });
        });
    }
    
    if (collapseAllBtn) {
        collapseAllBtn.addEventListener('click', () => {
            // Collapse all sequences and phases
            document.querySelectorAll('.sequence-header .expand-icon').forEach(icon => {
                icon.classList.add('collapsed');
            });
            document.querySelectorAll('.phase-header .expand-icon').forEach(icon => {
                icon.classList.add('collapsed');
            });
            document.querySelectorAll('.phase-section').forEach(phase => {
                phase.style.display = 'none';
            });
            document.querySelectorAll('.runsheet-table').forEach(table => {
                table.style.display = 'none';
            });
        });
    }
});

IterationView.prototype.populateMigrationSelector = function() {
    const select = document.getElementById('migration-select');
    if (!select) return;
    
    // Show loading state
    select.innerHTML = '<option value="">Loading migrations...</option>';

    fetch('/rest/scriptrunner/latest/custom/migrations')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(migrations => {
            // Always start with the default option
            select.innerHTML = '<option value="">SELECT A MIGRATION</option>';
            
            if (Array.isArray(migrations) && migrations.length > 0) {
                migrations.forEach(migration => {
                    const option = document.createElement('option');
                    option.value = migration.id || migration.mig_id || '';
                    option.textContent = migration.name || migration.mig_name || '(Unnamed Migration)';
                    select.appendChild(option);
                });
            } else {
                select.innerHTML = '<option value="">No migrations found</option>';
            }
        })
        .catch(error => {
            select.innerHTML = '<option value="">Failed to load migrations</option>';
        });
};


// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IterationView;
}