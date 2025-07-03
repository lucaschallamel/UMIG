/**
 * UMIG Iteration View JavaScript
 * ScriptRunner Macro Integration - Namespaced to avoid Confluence conflicts
 * Handles UI interactions and state management for the Implementation Plan runsheet
 */

// Namespace to avoid conflicts with other Confluence scripts
window.UMIG = window.UMIG || {};

window.UMIG.IterationView = class {
    constructor(containerId = 'umig-iteration-view-root') {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`UMIG IterationView: Container element with ID '${containerId}' not found`);
            return;
        }
        
        this.selectedStep = null;
        this.filters = {
            migration: '',
            iteration: '',
            sequence: '',
            phase: '',
            team: '',
            label: '',
            myTeamsOnly: false
        };
        
        // API endpoints - will be configured based on ScriptRunner REST paths
        this.apiEndpoints = {
            migrations: '/rest/scriptrunner/latest/custom/umig/api/v2/migrations',
            iterations: '/rest/scriptrunner/latest/custom/umig/api/v2/iterations',
            steps: '/rest/scriptrunner/latest/custom/umig/api/v2/steps',
            users: '/rest/scriptrunner/latest/custom/umig/api/v2/users'
        };
        
        this.init();
    }

    init() {
        this.loadInitialData();
        this.bindEvents();
        this.updateFilters();
    }

    async loadInitialData() {
        try {
            // Load migrations for dropdown
            await this.loadMigrations();
            
            // Load iterations based on first migration
            if (this.filters.migration) {
                await this.loadIterations(this.filters.migration);
            }
            
            // Load steps for current iteration
            if (this.filters.iteration) {
                await this.loadSteps();
            }
        } catch (error) {
            console.error('UMIG IterationView: Error loading initial data:', error);
            this.showNotification('Error loading data. Using mock data.', 'warning');
            this.loadMockData();
        }
    }

    async loadMigrations() {
        try {
            const response = await fetch(this.apiEndpoints.migrations);
            if (response.ok) {
                const migrations = await response.json();
                this.populateMigrationSelect(migrations);
                if (migrations.length > 0) {
                    this.filters.migration = migrations[0].id;
                }
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.warn('UMIG IterationView: Failed to load migrations, using mock data:', error);
            this.loadMockMigrations();
        }
    }

    async loadIterations(migrationId) {
        try {
            const response = await fetch(`${this.apiEndpoints.iterations}?migration=${migrationId}`);
            if (response.ok) {
                const iterations = await response.json();
                this.populateIterationSelect(iterations);
                if (iterations.length > 0) {
                    this.filters.iteration = iterations[0].id;
                }
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.warn('UMIG IterationView: Failed to load iterations, using mock data:', error);
            this.loadMockIterations();
        }
    }

    async loadSteps() {
        try {
            const params = new URLSearchParams({
                migration: this.filters.migration,
                iteration: this.filters.iteration
            });
            
            const response = await fetch(`${this.apiEndpoints.steps}?${params}`);
            if (response.ok) {
                const steps = await response.json();
                this.renderStepsTable(steps);
                if (steps.length > 0 && !this.selectedStep) {
                    this.selectStep(steps[0].id);
                }
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.warn('UMIG IterationView: Failed to load steps, using mock data:', error);
            this.loadMockSteps();
        }
    }

    loadMockData() {
        // Fallback to static mock data when API is unavailable
        this.loadMockMigrations();
        this.loadMockIterations();
        this.loadMockSteps();
    }

    loadMockMigrations() {
        const mockMigrations = [
            { id: 'mig-001', name: 'Data Center Migration Q3 2025' },
            { id: 'mig-002', name: 'Cloud Migration Phase 1' },
            { id: 'mig-003', name: 'Legacy System Modernization' }
        ];
        this.populateMigrationSelect(mockMigrations);
        this.filters.migration = mockMigrations[0].id;
    }

    loadMockIterations() {
        const mockIterations = [
            { id: 'ite-001', name: 'Iteration 1 - Core Infrastructure' },
            { id: 'ite-002', name: 'Iteration 2 - Application Migration' },
            { id: 'ite-003', name: 'Iteration 3 - Data Migration' }
        ];
        this.populateIterationSelect(mockIterations);
        this.filters.iteration = mockIterations[0].id;
    }

    loadMockSteps() {
        const mockSteps = [
            {
                id: 'INF-001-010',
                name: 'Network Infrastructure Preparation',
                sequence: 'Pre-Migration Preparation',
                phase: 'Infrastructure Setup',
                team: 'Network Team',
                status: 'pending',
                priority: 1,
                duration: '2h',
                instructions: [
                    { id: 'INF-001-010-01', text: 'Verify network connectivity between source and destination', completed: false },
                    { id: 'INF-001-010-02', text: 'Configure firewall rules for migration traffic', completed: false }
                ]
            },
            {
                id: 'INF-001-020',
                name: 'Server Preparation and Validation',
                sequence: 'Pre-Migration Preparation',
                phase: 'Infrastructure Setup',
                team: 'Server Team',
                status: 'in-progress',
                priority: 1,
                duration: '4h',
                instructions: [
                    { id: 'INF-001-020-01', text: 'Validate server specifications meet requirements', completed: true },
                    { id: 'INF-001-020-02', text: 'Install required software packages', completed: false }
                ]
            }
        ];
        this.renderStepsTable(mockSteps);
        if (mockSteps.length > 0) {
            this.selectStep(mockSteps[0].id);
            this.loadStepDetails(mockSteps[0]);
        }
    }

    populateMigrationSelect(migrations) {
        const select = this.container.querySelector('#migration-select');
        if (select) {
            select.innerHTML = '';
            migrations.forEach(migration => {
                const option = document.createElement('option');
                option.value = migration.id;
                option.textContent = migration.name;
                select.appendChild(option);
            });
        }
    }

    populateIterationSelect(iterations) {
        const select = this.container.querySelector('#iteration-select');
        if (select) {
            select.innerHTML = '';
            iterations.forEach(iteration => {
                const option = document.createElement('option');
                option.value = iteration.id;
                option.textContent = iteration.name;
                select.appendChild(option);
            });
        }
    }

    renderStepsTable(steps) {
        const container = this.container.querySelector('.runsheet-content');
        if (!container) return;

        const html = `
            <div class="steps-container">
                <div class="steps-header">
                    <div class="col-id">ID</div>
                    <div class="col-name">STEP NAME</div>
                    <div class="col-team">TEAM</div>
                    <div class="col-status">STATUS</div>
                    <div class="col-duration">DURATION</div>
                    <div class="col-priority">PRI</div>
                </div>
                ${steps.map(step => `
                    <div class="step-row" data-step="${step.id}">
                        <div class="col-id step-id">${step.id}</div>
                        <div class="col-name step-name">${step.name}</div>
                        <div class="col-team step-team">${step.team}</div>
                        <div class="col-status">
                            <span class="status ${step.status}">${step.status.replace('-', ' ')}</span>
                        </div>
                        <div class="col-duration step-duration">${step.duration}</div>
                        <div class="col-priority">
                            <span class="priority ${step.priority === 1 ? 'high' : step.priority === 2 ? 'medium' : 'low'}">
                                ${step.priority}
                            </span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        container.innerHTML = html;
    }

    bindEvents() {
        // Use event delegation to handle dynamically created elements
        this.container.addEventListener('change', (e) => {
            if (e.target.id === 'migration-select') {
                this.filters.migration = e.target.value;
                this.onMigrationChange();
            } else if (e.target.id === 'iteration-select') {
                this.filters.iteration = e.target.value;
                this.onIterationChange();
            } else if (e.target.id === 'sequence-filter') {
                this.filters.sequence = e.target.value;
                this.applyFilters();
            } else if (e.target.id === 'phase-filter') {
                this.filters.phase = e.target.value;
                this.applyFilters();
            } else if (e.target.id === 'team-filter') {
                this.filters.team = e.target.value;
                this.applyFilters();
            } else if (e.target.id === 'label-filter') {
                this.filters.label = e.target.value;
                this.applyFilters();
            } else if (e.target.id === 'my-teams-only') {
                this.filters.myTeamsOnly = e.target.checked;
                this.applyFilters();
            }
        });

        this.container.addEventListener('click', (e) => {
            // Step row selection
            if (e.target.closest('.step-row')) {
                const stepId = e.target.closest('.step-row').dataset.step;
                this.selectStep(stepId);
            }
        });
    }

    async onMigrationChange() {
        await this.loadIterations(this.filters.migration);
        await this.loadSteps();
    }

    async onIterationChange() {
        await this.loadSteps();
    }

    selectStep(stepId) {
        // Update visual selection
        this.container.querySelectorAll('.step-row').forEach(row => {
            row.classList.remove('selected');
        });
        
        const selectedRow = this.container.querySelector(`[data-step="${stepId}"]`);
        if (selectedRow) {
            selectedRow.classList.add('selected');
            this.selectedStep = stepId;
            this.loadStepDetails({ id: stepId }); // Load full step details
        }
    }

    loadStepDetails(step) {
        const detailsContent = this.container.querySelector('.step-details-content');
        if (!detailsContent) return;

        // Mock step details - replace with API call
        const mockDetails = {
            id: step.id || 'INF-001-010',
            name: 'Network Infrastructure Preparation',
            description: 'Prepare network infrastructure for the migration process',
            team: 'Network Team',
            status: 'pending',
            priority: 1,
            estimatedDuration: '2h',
            actualDuration: null,
            startTime: null,
            endTime: null,
            assignee: 'John Smith',
            instructions: [
                { id: '01', text: 'Verify network connectivity between source and destination', completed: false, team: 'Network', duration: '30m' },
                { id: '02', text: 'Configure firewall rules for migration traffic', completed: false, team: 'Security', duration: '45m' }
            ]
        };

        const html = `
            <div class="step-metadata">
                <div class="metadata-grid">
                    <div class="metadata-item">
                        <span class="label">Team:</span>
                        <span class="value">${mockDetails.team}</span>
                    </div>
                    <div class="metadata-item">
                        <span class="label">Status:</span>
                        <span class="value status ${mockDetails.status}">${mockDetails.status.replace('-', ' ')}</span>
                    </div>
                    <div class="metadata-item">
                        <span class="label">Priority:</span>
                        <span class="value priority ${mockDetails.priority === 1 ? 'high' : 'medium'}">${mockDetails.priority}</span>
                    </div>
                    <div class="metadata-item">
                        <span class="label">Duration:</span>
                        <span class="value">${mockDetails.estimatedDuration}</span>
                    </div>
                    <div class="metadata-item">
                        <span class="label">Assignee:</span>
                        <span class="value">${mockDetails.assignee}</span>
                    </div>
                </div>
            </div>
            
            <div class="instructions-section">
                <h3>Instructions</h3>
                <div class="instructions-container">
                    <div class="instructions-header">
                        <div class="col-id">ID</div>
                        <div class="col-instruction">INSTRUCTION</div>
                        <div class="col-team">TEAM</div>
                        <div class="col-duration">DURATION</div>
                        <div class="col-status">STATUS</div>
                        <div class="col-control">✓</div>
                    </div>
                    ${mockDetails.instructions.map(instruction => `
                        <div class="instruction-row">
                            <div class="col-id instruction-id">${instruction.id}</div>
                            <div class="col-instruction instruction-text">${instruction.text}</div>
                            <div class="col-team instruction-team">${instruction.team}</div>
                            <div class="col-duration instruction-duration">${instruction.duration}</div>
                            <div class="col-status">
                                <span class="status ${instruction.completed ? 'completed' : 'pending'}">
                                    ${instruction.completed ? 'Done' : 'Pending'}
                                </span>
                            </div>
                            <div class="col-control instruction-control">
                                <input type="checkbox" ${instruction.completed ? 'checked' : ''} 
                                       data-instruction="${instruction.id}">
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        detailsContent.innerHTML = html;
    }

    applyFilters() {
        // Filter logic - show/hide steps based on current filters
        const steps = this.container.querySelectorAll('.step-row');
        steps.forEach(step => {
            let show = true;
            
            // Apply team filter
            if (this.filters.team && step.querySelector('.step-team').textContent !== this.filters.team) {
                show = false;
            }
            
            // Apply my teams only filter
            if (this.filters.myTeamsOnly) {
                // TODO: Check if step team matches current user's teams
            }
            
            step.style.display = show ? 'grid' : 'none';
        });
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `umig-notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            color: white;
            font-weight: 600;
            z-index: 10000;
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

        // Add to DOM
        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
};

// Auto-initialize when DOM is ready and container exists
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('umig-iteration-view-root')) {
        window.UMIG.iterationViewInstance = new window.UMIG.IterationView();
    }
});

// CSS animation for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);