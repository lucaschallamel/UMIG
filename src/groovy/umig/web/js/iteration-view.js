const populateFilter = (selector, url, defaultOptionText) => {
    const select = document.querySelector(selector);
    if (!select) return;

    select.innerHTML = `<option value="">Loading...</option>`;
    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error(`Network response was not ok for ${url}`);
            return response.json();
        })
        .then(items => {
            select.innerHTML = `<option value="">${defaultOptionText}</option>`;
            if (Array.isArray(items)) {
                items.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item.id;
                    option.textContent = item.name || '(Unnamed)';
                    select.appendChild(option);
                });
            }
        })
        .catch(() => {
            select.innerHTML = `<option value="">Failed to load</option>`;
        });
};

// UMIG Iteration View - Canonical JavaScript Logic
// Ported from mock/script.js with full fidelity

class IterationView {
    constructor() {
        this.selectedStep = 'INF-001-010';
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
        
        // Sample data - in production this would come from API
        this.steps = [
            {
                id: 'INF-001-010',
                sequence: 'S01',
                phase: 'Infrastructure',
                team: 'Platform Team',
                title: 'Setup Core Network Infrastructure',
                labels: ['Critical', 'Network'],
                status: 'Not Started',
                description: 'Establish the foundational network infrastructure including VPCs, subnets, routing tables, and security groups. This step is critical for all subsequent infrastructure deployment.',
                requirements: 'AWS account with appropriate permissions, network architecture design approved',
                deliverables: 'Configured VPC with subnets, routing tables, security groups, and network ACLs',
                comments: [
                    {
                        author: 'Sarah Johnson',
                        time: '2024-03-15 14:30',
                        text: 'Network design has been approved by security team. Ready to proceed with implementation.'
                    }
                ]
            },
            {
                id: 'INF-001-020',
                sequence: 'S01',
                phase: 'Infrastructure',
                team: 'Platform Team',
                title: 'Deploy Container Platform',
                labels: ['Critical', 'Containers'],
                status: 'Not Started',
                description: 'Deploy and configure the container orchestration platform (Kubernetes) including worker nodes, control plane, and essential system pods.',
                requirements: 'Network infrastructure completed (INF-001-010)',
                deliverables: 'Functioning Kubernetes cluster with monitoring and logging'
            },
            {
                id: 'APP-002-010',
                sequence: 'S02',
                phase: 'Application',
                team: 'Development Team',
                title: 'Migrate Core Services',
                labels: ['High Priority', 'API'],
                status: 'In Progress',
                description: 'Migrate core application services to the new platform including user authentication, data processing, and external integrations.',
                requirements: 'Container platform ready (INF-001-020)',
                deliverables: 'Core services running on new platform with full functionality'
            },
            {
                id: 'DATA-003-010',
                sequence: 'S03',
                phase: 'Data',
                team: 'Data Team',
                title: 'Database Migration Strategy',
                labels: ['Critical', 'Database'],
                status: 'Completed',
                description: 'Execute database migration including schema updates, data transfer, and validation procedures.',
                requirements: 'Application services migrated (APP-002-010)',
                deliverables: 'Migrated database with validated data integrity'
            },
            {
                id: 'TEST-004-010',
                sequence: 'S04',
                phase: 'Testing',
                team: 'QA Team',
                title: 'End-to-End Testing',
                labels: ['Testing', 'Validation'],
                status: 'Blocked',
                description: 'Comprehensive testing of all migrated systems including functional, performance, and security testing.',
                requirements: 'All previous steps completed',
                deliverables: 'Test reports and sign-off documentation'
            }
        ];
        
        this.init();
    }

    init() {
        this.initializeSelectors();
        this.bindEvents();
        this.renderSteps();
        this.loadStepDetails(this.selectedStep);
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
        
        // Reset all dependent selectors
        this.filters.iteration = '';
        this.filters.plan = '';
        this.filters.sequence = '';
        this.filters.phase = '';
        
        this.resetSelector('#iteration-select', 'SELECT AN ITERATION');
        this.resetSelector('#plan-filter', 'All Plans');
        this.resetSelector('#sequence-filter', 'All Sequences');
        this.resetSelector('#phase-filter', 'All Phases');
        this.resetSelector('#team-filter', 'All Teams');
        this.resetSelector('#label-filter', 'All Labels');

        if (migId) {
            const url = `/rest/scriptrunner/latest/custom/migrations/${migId}/iterations`;
            populateFilter('#iteration-select', url, 'SELECT AN ITERATION');
            
            // Refresh teams and labels selectors for this migration
            const teamsUrl = `/rest/scriptrunner/latest/custom/teams?migrationId=${migId}`;
            const labelsUrl = `/rest/scriptrunner/latest/custom/labels?migrationId=${migId}`;
            populateFilter('#team-filter', teamsUrl, 'All Teams');
            populateFilter('#label-filter', labelsUrl, 'All Labels');
        }
        
        this.applyFilters();
    }

    onIterationChange() {
        const migId = this.filters.migration;
        const iteId = this.filters.iteration;

        // Reset dependent filters
        this.filters.plan = '';
        this.filters.sequence = '';
        this.filters.phase = '';
        
        this.resetSelector('#plan-filter', 'All Plans');
        this.resetSelector('#sequence-filter', 'All Sequences');
        this.resetSelector('#phase-filter', 'All Phases');
        this.resetSelector('#team-filter', 'All Teams');
        this.resetSelector('#label-filter', 'All Labels');

        if (!iteId) {
            this.applyFilters();
            return;
        }

        // Populate all three filters with ALL items for this iteration
        const planUrl = `/rest/scriptrunner/latest/custom/migrations/${migId}/iterations/${iteId}/plan-instances`;
        const sequenceUrl = `/rest/scriptrunner/latest/custom/migrations/${migId}/iterations/${iteId}/sequences`;
        const phaseUrl = `/rest/scriptrunner/latest/custom/migrations/${migId}/iterations/${iteId}/phases`;
        
        // Refresh teams and labels selectors for this iteration
        const teamsUrl = `/rest/scriptrunner/latest/custom/teams?iterationId=${iteId}`;
        const labelsUrl = `/rest/scriptrunner/latest/custom/labels?iterationId=${iteId}`;

        populateFilter('#plan-filter', planUrl, 'All Plans');
        populateFilter('#sequence-filter', sequenceUrl, 'All Sequences');
        populateFilter('#phase-filter', phaseUrl, 'All Phases');
        populateFilter('#team-filter', teamsUrl, 'All Teams');
        populateFilter('#label-filter', labelsUrl, 'All Labels');

        this.showNotification('Loading data for selected iteration...', 'info');
        this.applyFilters();
    }

    onPlanChange() {
        const { migration: migId, iteration: iteId, plan: planId } = this.filters;

        // Reset dependent filters
        this.filters.sequence = '';
        this.filters.phase = '';

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
            // Specific plan selected - show only sequences and phases for this plan
            const sequenceUrl = `/rest/scriptrunner/latest/custom/migrations/${migId}/iterations/${iteId}/plan-instances/${planId}/sequences`;
            const phaseUrl = `/rest/scriptrunner/latest/custom/migrations/${migId}/iterations/${iteId}/plan-instances/${planId}/phases`;
            const teamsUrl = `/rest/scriptrunner/latest/custom/teams?planId=${planId}`;
            const labelsUrl = `/rest/scriptrunner/latest/custom/labels?planId=${planId}`;
            populateFilter('#sequence-filter', sequenceUrl, 'All Sequences');
            populateFilter('#phase-filter', phaseUrl, 'All Phases');
            populateFilter('#team-filter', teamsUrl, 'All Teams');
            populateFilter('#label-filter', labelsUrl, 'All Labels');
        }
        
        this.applyFilters();
    }

    onSequenceChange() {
        const { migration: migId, iteration: iteId, plan: planId, sequence: seqId } = this.filters;

        // Reset dependent filters
        this.filters.phase = '';

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
            // Specific sequence selected - show only phases for this sequence
            const phaseUrl = `/rest/scriptrunner/latest/custom/migrations/${migId}/iterations/${iteId}/sequences/${seqId}/phases`;
            const teamsUrl = `/rest/scriptrunner/latest/custom/teams?sequenceId=${seqId}`;
            const labelsUrl = `/rest/scriptrunner/latest/custom/labels?sequenceId=${seqId}`;
            populateFilter('#phase-filter', phaseUrl, 'All Phases');
            populateFilter('#team-filter', teamsUrl, 'All Teams');
            populateFilter('#label-filter', labelsUrl, 'All Labels');
        }
        
        this.applyFilters();
    }

    onPhaseChange() {
        const { sequence: seqId, phase: phaseId } = this.filters;

        if (!phaseId) {
            // 'All Phases' selected - refresh teams and labels for current sequence or higher level
            if (seqId) {
                const teamsUrl = `/rest/scriptrunner/latest/custom/teams?sequenceId=${seqId}`;
                const labelsUrl = `/rest/scriptrunner/latest/custom/labels?sequenceId=${seqId}`;
                populateFilter('#team-filter', teamsUrl, 'All Teams');
                populateFilter('#label-filter', labelsUrl, 'All Labels');
            }
            // If no sequence selected, teams and labels are already correctly populated from higher level
        } else {
            // Specific phase selected - show only teams and labels for this phase
            const teamsUrl = `/rest/scriptrunner/latest/custom/teams?phaseId=${phaseId}`;
            const labelsUrl = `/rest/scriptrunner/latest/custom/labels?phaseId=${phaseId}`;
            populateFilter('#team-filter', teamsUrl, 'All Teams');
            populateFilter('#label-filter', labelsUrl, 'All Labels');
        }
        
        this.applyFilters();
    }


    renderSteps() {
        const tbody = document.querySelector('.runsheet-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        const filteredSteps = this.getFilteredSteps();
        
        filteredSteps.forEach(step => {
            const row = document.createElement('tr');
            row.className = 'step-row';
            row.dataset.step = step.id;
            
            if (step.id === this.selectedStep) {
                row.classList.add('selected');
            }
            
            row.innerHTML = `
                <td class="col-step">${step.id}</td>
                <td class="col-sequence">${step.sequence}</td>
                <td class="col-phase">${step.phase}</td>
                <td class="col-team">${step.team}</td>
                <td class="col-title">${step.title}</td>
                <td class="col-labels">
                    ${step.labels ? step.labels.map(label => `<span class="label-tag">${label}</span>`).join('') : ''}
                </td>
                <td class="col-status status-${step.status.toLowerCase().replace(' ', '-')}">${step.status}</td>
            `;
            
            row.addEventListener('click', () => {
                this.selectStep(step.id);
            });
            
            tbody.appendChild(row);
        });
    }

    getFilteredSteps() {
        return this.steps.filter(step => {
            if (this.filters.sequence && step.sequence !== this.filters.sequence) return false;
            if (this.filters.phase && step.phase !== this.filters.phase) return false;
            if (this.filters.team && step.team !== this.filters.team) return false;
            if (this.filters.label && (!step.labels || !step.labels.includes(this.filters.label))) return false;
            // myTeamsOnly filter would be implemented based on user's team membership
            return true;
        });
    }

    selectStep(stepId) {
        // Update selected step
        document.querySelectorAll('.step-row').forEach(row => {
            row.classList.remove('selected');
        });
        
        const selectedRow = document.querySelector(`[data-step="${stepId}"]`);
        if (selectedRow) {
            selectedRow.classList.add('selected');
        }
        
        this.selectedStep = stepId;
        this.loadStepDetails(stepId);
    }

    loadStepDetails(stepId) {
        const step = this.steps.find(s => s.id === stepId);
        if (!step) return;

        // Update step details panel
        const stepIdEl = document.querySelector('.step-id');
        const stepTitleEl = document.querySelector('.step-title');
        const stepDescEl = document.querySelector('.step-description');
        const stepMetaEls = document.querySelectorAll('.meta-value');
        const commentsListEl = document.querySelector('.comments-list');
        
        if (stepIdEl) stepIdEl.textContent = step.id;
        if (stepTitleEl) stepTitleEl.textContent = step.title;
        if (stepDescEl) stepDescEl.textContent = step.description;
        
        // Update meta information
        if (stepMetaEls.length >= 4) {
            stepMetaEls[0].textContent = step.sequence;
            stepMetaEls[1].textContent = step.phase;
            stepMetaEls[2].textContent = step.team;
            stepMetaEls[3].textContent = step.status;
        }
        
        // Update comments
        if (commentsListEl) {
            commentsListEl.innerHTML = '';
            if (step.comments) {
                step.comments.forEach(comment => {
                    const commentEl = document.createElement('div');
                    commentEl.className = 'comment-item';
                    commentEl.innerHTML = `
                        <div class="comment-header">
                            <span class="comment-author">${comment.author}</span>
                            <span class="comment-time">${comment.time}</span>
                        </div>
                        <div class="comment-text">${comment.text}</div>
                    `;
                    commentsListEl.appendChild(commentEl);
                });
            }
        }
    }

    applyFilters() {
        this.renderSteps();
        this.showNotification('Filters applied', 'info');
    }

    startStep() {
        const step = this.steps.find(s => s.id === this.selectedStep);
        if (step) {
            step.status = 'In Progress';
            this.updateStepStatus(this.selectedStep, 'In Progress');
            this.loadStepDetails(this.selectedStep);
            this.showNotification('Step started successfully', 'success');
        }
    }

    completeStep() {
        const step = this.steps.find(s => s.id === this.selectedStep);
        if (step) {
            step.status = 'Completed';
            this.updateStepStatus(this.selectedStep, 'Completed');
            this.loadStepDetails(this.selectedStep);
            this.showNotification('Step completed successfully', 'success');
        }
    }

    blockStep() {
        const step = this.steps.find(s => s.id === this.selectedStep);
        if (step) {
            step.status = 'Blocked';
            this.updateStepStatus(this.selectedStep, 'Blocked');
            this.loadStepDetails(this.selectedStep);
            this.showNotification('Step marked as blocked', 'warning');
        }
    }

    addComment() {
        const commentInput = document.getElementById('new-comment');
        if (commentInput && commentInput.value.trim()) {
            const step = this.steps.find(s => s.id === this.selectedStep);
            if (step) {
                if (!step.comments) step.comments = [];
                step.comments.push({
                    author: 'Current User',
                    time: new Date().toLocaleString(),
                    text: commentInput.value.trim()
                });
                commentInput.value = '';
                this.loadStepDetails(this.selectedStep);
                this.showNotification('Comment added successfully', 'success');
            }
        }
    }

    updateStepStatus(stepId, status) {
        // Update the table row
        const row = document.querySelector(`[data-step="${stepId}"]`);
        if (row) {
            const statusCell = row.querySelector('.col-status');
            if (statusCell) {
                statusCell.textContent = status;
                statusCell.className = `col-status status-${status.toLowerCase().replace(' ', '-')}`;
            }
        }
        
        this.updateSummaryStats();
    }

    updateSummaryStats() {
        // This would update summary statistics in a real implementation
        console.log('Summary stats updated');
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
        // Initialize filter state and populate dropdowns
        this.populateFilterOptions();
        this.applyFilters();
    }

    populateFilterOptions() {
        // Extract unique values from steps for filter options
        const sequences = [...new Set(this.steps.map(s => s.sequence))];
        const phases = [...new Set(this.steps.map(s => s.phase))];
        const teams = [...new Set(this.steps.map(s => s.team))];
        const labels = [...new Set(this.steps.flatMap(s => s.labels || []))];
        
        this.populateSelect('sequence-filter', sequences);
        this.populateSelect('phase-filter', phases);
        this.populateSelect('team-filter', teams);
        this.populateSelect('label-filter', labels);
    }

    populateSelect(selectId, options) {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        // Keep the first option (usually "All" or empty)
        const firstOption = select.firstElementChild;
        select.innerHTML = '';
        if (firstOption) select.appendChild(firstOption);
        
        options.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option;
            optionEl.textContent = option;
            select.appendChild(optionEl);
        });
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