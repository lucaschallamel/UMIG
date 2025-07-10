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
        
        
        this.init();
    }

    init() {
        this.initializeSelectors();
        this.bindEvents();
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
        this.loadStepDetails(stepCode || stepId);
    }

    async loadStepDetails(stepCode) {
        if (!stepCode) return;
        
        const stepDetailsContent = document.querySelector('.step-details-content');
        if (!stepDetailsContent) return;

        // Show loading state
        stepDetailsContent.innerHTML = '<div class="loading-message"><p>🔄 Loading step details...</p></div>';

        try {
            const response = await fetch(`/rest/scriptrunner/latest/custom/stepViewApi?stepid=${encodeURIComponent(stepCode)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const stepData = await response.json();
            
            if (stepData.error) {
                throw new Error(stepData.error);
            }
            
            this.renderStepDetails(stepData);
            
        } catch (error) {
            stepDetailsContent.innerHTML = `
                <div class="error-message">
                    <p>❌ Error loading step details: ${error.message}</p>
                    <p>Please try again or contact support.</p>
                </div>
            `;
        }
    }
    
    renderStepDetails(stepData) {
        const stepDetailsContent = document.querySelector('.step-details-content');
        if (!stepDetailsContent) return;
        
        const summary = stepData.stepSummary || {};
        const instructions = stepData.instructions || [];
        const impactedTeams = stepData.impactedTeams || [];
        
        // Helper function to get status display
        const getStatusDisplay = (status) => {
            if (!status) return '<span class="status-pending">Pending</span>';
            const statusLower = status.toLowerCase();
            if (statusLower.includes('pending')) return '<span class="status-pending">Pending</span>';
            if (statusLower.includes('progress')) return '<span class="status-progress">In Progress</span>';
            if (statusLower.includes('completed')) return '<span class="status-completed">Completed</span>';
            if (statusLower.includes('failed')) return '<span class="status-failed">Failed</span>';
            if (statusLower.includes('blocked')) return '<span class="status-blocked">Blocked</span>';
            if (statusLower.includes('cancelled')) return '<span class="status-cancelled">Cancelled</span>';
            if (statusLower.includes('todo') || statusLower.includes('not_started')) return '<span class="status-todo">Todo</span>';
            return `<span class="status-pending">${status}</span>`;
        };
        
        let html = `
            <div class="step-info">
                <div class="step-title">
                    <h3>📋 ${summary.ID || 'Unknown'}: ${summary.Name || 'Unknown Step'}</h3>
                </div>
                
                <div class="step-metadata">
                    <div class="metadata-item">
                        <span class="label">🎯 Target Environment:</span>
                        <span class="value">${summary.TargetEnvironment || 'Production'}</span>
                    </div>
                    <div class="metadata-item">
                        <span class="label">🔄 Scope:</span>
                        <span class="value">
                            <span class="scope-tag">RUN</span>
                            <span class="scope-tag">DR</span>
                            <span class="scope-tag">CUTOVER</span>
                        </span>
                    </div>
                    <div class="metadata-item">
                        <span class="label">👥 Teams:</span>
                        <span class="value">${summary.AssignedTeam ? `Assigned: ${summary.AssignedTeam}` : 'Not assigned'}${impactedTeams.length > 0 ? ` | Impacted: ${impactedTeams.join(', ')}` : ''}</span>
                    </div>
                    <div class="metadata-item">
                        <span class="label">📂 Location:</span>
                        <span class="value">${summary.SequenceName ? `Sequence: ${summary.SequenceName}` : 'Unknown sequence'}${summary.PhaseName ? ` | Phase: ${summary.PhaseName}` : ''}</span>
                    </div>
                    <div class="metadata-item">
                        <span class="label">⏱️ Duration:</span>
                        <span class="value">${summary.Duration || summary.EstimatedDuration || '45 minutes'}</span>
                    </div>
                    <div class="metadata-item">
                        <span class="label">📊 Status:</span>
                        <span class="value">${getStatusDisplay(summary.Status)}</span>
                    </div>
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
                    <div class="instruction-row">
                        <div class="col-num">${instruction.Order || (index + 1)}</div>
                        <div class="col-instruction">${instruction.Description || instruction.Instruction || 'No description'}</div>
                        <div class="col-team">${instruction.Team || summary.AssignedTeam || 'TBD'}</div>
                        <div class="col-control">${instruction.Control || instruction.ControlCode || `CTRL-${String(index + 1).padStart(2, '0')}`}</div>
                        <div class="col-duration">${instruction.Duration || instruction.EstimatedDuration || '5 min'}</div>
                        <div class="col-complete"><input type="checkbox" ${instruction.IsCompleted ? 'checked' : ''}></div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        // Add comment section with mock data
        html += `
            <div class="comments-section">
                <h4>💬 COMMENTS (3)</h4>
                <div class="comments-list">
                    <div class="comment">
                        <div class="comment-header">
                            <span class="comment-author">John Smith (DB-Team)</span>
                            <span class="comment-time">2 hours ago</span>
                        </div>
                        <div class="comment-body">
                            "Backup server space verified - 2TB available"
                        </div>
                    </div>
                    
                    <div class="comment">
                        <div class="comment-header">
                            <span class="comment-author">Sarah Johnson (NET-Team)</span>
                            <span class="comment-time">1 hour ago</span>
                        </div>
                        <div class="comment-body">
                            "Network connectivity to backup server confirmed"
                        </div>
                    </div>
                    
                    <div class="comment">
                        <div class="comment-header">
                            <span class="comment-author">Mike Chen (DB-Team)</span>
                            <span class="comment-time">30 minutes ago</span>
                        </div>
                        <div class="comment-body">
                            "Ready to begin backup process"
                        </div>
                    </div>
                </div>
                
                <div class="comment-form">
                    <textarea placeholder="Add a comment..." rows="3"></textarea>
                    <button type="button" class="btn btn-primary">Add Comment</button>
                </div>
            </div>
            
            <div class="step-actions">
                <button type="button" class="btn btn-secondary">Mark Instructions Complete</button>
                <button type="button" class="btn btn-primary">Update Status</button>
            </div>
        `;
        
        stepDetailsContent.innerHTML = html;
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
                            <td class="col-status ${statusClass}">${step.status}</td>
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
        
        runsheetContent.innerHTML = html;
        
        // Bind click events to step rows
        this.bindStepRowEvents();
        
        // Bind fold/unfold events to sequence and phase headers
        this.bindFoldingEvents();
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
        
        const statusLower = status.toLowerCase();
        if (statusLower.includes('completed')) return 'status-completed';
        if (statusLower.includes('progress')) return 'status-progress';
        if (statusLower.includes('failed') || statusLower.includes('error')) return 'status-failed';
        if (statusLower.includes('blocked')) return 'status-blocked';
        if (statusLower.includes('cancelled')) return 'status-cancelled';
        if (statusLower.includes('todo') || statusLower.includes('not_started')) return 'status-todo';
        return 'status-pending';
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
        
        Object.entries(elements).forEach(([id, count]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = count;
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
    new IterationView();
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