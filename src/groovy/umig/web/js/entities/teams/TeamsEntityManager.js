/**
 * TeamsEntityManager - Teams Entity Implementation for US-082-C Phase 1
 * 
 * Implements Teams entity management using the new component architecture
 * from US-082-B with BaseEntityManager pattern. This is the first entity
 * to be migrated as part of the pilot implementation.
 * 
 * Features:
 * - Teams CRUD operations with component integration
 * - Team member management workflows
 * - Role-based access control (SUPERADMIN/ADMIN)
 * - 25% performance improvement target over legacy
 * - A/B testing support for architecture validation
 * 
 * @version 1.0.0
 * @created 2025-01-12 (US-082-C Phase 1 - Day 1)
 * @security Enterprise-grade (8.5/10) via ComponentOrchestrator
 * @performance Target: 450ms → 340ms (25% improvement)
 * @rollout A/B testing enabled with 50/50 traffic split
 */

import { BaseEntityManager } from '../BaseEntityManager.js';
import { SecurityUtils } from '../../components/SecurityUtils.js';

export class TeamsEntityManager extends BaseEntityManager {
    /**
     * Initialize TeamsEntityManager with Teams-specific configuration
     */
    constructor() {
        super({
            entityType: "teams",
            tableConfig: {
                columns: [
                    { 
                        key: "name", 
                        label: "Team Name", 
                        sortable: true, 
                        searchable: true,
                        required: true,
                        maxLength: 100
                    },
                    { 
                        key: "description", 
                        label: "Description", 
                        sortable: false, 
                        searchable: true,
                        truncate: 50
                    },
                    { 
                        key: "memberCount", 
                        label: "Members", 
                        sortable: true, 
                        type: "number",
                        align: "right"
                    },
                    { 
                        key: "created", 
                        label: "Created", 
                        sortable: true, 
                        type: "date",
                        format: "yyyy-MM-dd"
                    },
                    {
                        key: "status",
                        label: "Status",
                        sortable: true,
                        type: "status",
                        badges: true
                    }
                ],
                actions: { 
                    view: true, 
                    edit: true, 
                    delete: true,
                    members: true  // Teams-specific action
                },
                bulkActions: {
                    delete: true,
                    export: true,
                    setStatus: true
                },
                defaultSort: { column: "name", direction: "asc" }
            },
            modalConfig: {
                fields: [
                    { 
                        name: "name", 
                        type: "text", 
                        required: true,
                        label: "Team Name",
                        placeholder: "Enter team name",
                        validation: {
                            minLength: 2,
                            maxLength: 100,
                            pattern: /^[a-zA-Z0-9\s\-_]+$/,
                            message: "Team name must contain only letters, numbers, spaces, hyphens, and underscores"
                        }
                    },
                    { 
                        name: "description", 
                        type: "textarea", 
                        required: false,
                        label: "Description",
                        placeholder: "Enter team description (optional)",
                        rows: 4,
                        validation: {
                            maxLength: 500
                        }
                    },
                    {
                        name: "status",
                        type: "select",
                        required: true,
                        label: "Status",
                        options: [
                            { value: "active", label: "Active" },
                            { value: "inactive", label: "Inactive" },
                            { value: "archived", label: "Archived" }
                        ],
                        defaultValue: "active"
                    }
                ],
                title: {
                    create: "Create New Team",
                    edit: "Edit Team",
                    view: "Team Details"
                },
                size: "medium",
                validation: true,
                confirmOnClose: true
            },
            filterConfig: {
                enabled: true,
                persistent: true,
                filters: [
                    {
                        key: "status",
                        type: "select",
                        label: "Status",
                        options: [
                            { value: "", label: "All Status" },
                            { value: "active", label: "Active" },
                            { value: "inactive", label: "Inactive" },
                            { value: "archived", label: "Archived" }
                        ]
                    },
                    {
                        key: "memberCountRange",
                        type: "range",
                        label: "Member Count",
                        min: 0,
                        max: 100
                    },
                    {
                        key: "search",
                        type: "text",
                        label: "Search",
                        placeholder: "Search teams..."
                    }
                ]
            },
            paginationConfig: {
                pageSize: 20,
                showPageSizer: true,
                pageSizeOptions: [10, 20, 50, 100]
            }
        });

        // Teams-specific properties
        this.apiBaseUrl = '/rest/scriptrunner/latest/custom/teams';
        this.membersApiUrl = '/rest/scriptrunner/latest/custom/team-members';
        
        // Performance tracking specifics
        this.performanceTargets = {
            load: 340,      // Target: 450ms → 340ms (25% improvement)
            create: 200,    // Target: sub-200ms operations
            update: 200,
            delete: 150,
            memberOps: 300  // Team member operations
        };

        // Role-based access control
        this.currentUserRole = null;
        this.accessControls = {
            SUPERADMIN: ['create', 'edit', 'delete', 'members', 'bulk'],
            ADMIN: ['view', 'members'],
            USER: ['view']
        };

        console.log('[TeamsEntityManager] Initialized with component architecture');
    }

    /**
     * Initialize with user role checking
     * @param {HTMLElement} container - DOM container
     * @param {Object} options - Initialize options
     * @returns {Promise<void>}
     */
    async initialize(container, options = {}) {
        try {
            // Get current user role for RBAC
            await this._getCurrentUserRole();
            
            // Configure access controls based on role
            this._configureAccessControls();

            // Initialize base entity manager
            await super.initialize(container, options);

            // Setup Teams-specific functionality
            await this._setupTeamsSpecificFeatures();

            console.log('[TeamsEntityManager] Teams entity manager ready');
        } catch (error) {
            console.error('[TeamsEntityManager] Failed to initialize:', error);
            throw error;
        }
    }

    /**
     * Load team member data for a specific team
     * @param {string} teamId - Team ID
     * @returns {Promise<Array>} Team members
     */
    async loadMembers(teamId) {
        const startTime = performance.now();
        
        try {
            console.log(`[TeamsEntityManager] Loading members for team ${teamId}`);

            // Security validation
            SecurityUtils.validateInput({ teamId });

            // CSRF PROTECTION: Add CSRF token to request headers
            const response = await fetch(`${this.membersApiUrl}?teamId=${encodeURIComponent(teamId)}`, {
                method: 'GET',
                headers: SecurityUtils.addCSRFProtection({
                    'Content-Type': 'application/json'
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to load team members: ${response.status}`);
            }

            const members = await response.json();

            // Track performance
            const operationTime = performance.now() - startTime;
            this._trackPerformance('memberLoad', operationTime);

            console.log(`[TeamsEntityManager] Loaded ${members.length} members in ${operationTime.toFixed(2)}ms`);
            
            return members;
        } catch (error) {
            console.error('[TeamsEntityManager] Failed to load members:', error);
            this._trackError('memberLoad', error);
            throw error;
        }
    }

    /**
     * Assign user to team
     * @param {string} teamId - Team ID
     * @param {string} userId - User ID to assign
     * @returns {Promise<Object>} Assignment result
     */
    async assignMember(teamId, userId) {
        const startTime = performance.now();
        
        try {
            console.log(`[TeamsEntityManager] Assigning user ${userId} to team ${teamId}`);

            // Security validation
            SecurityUtils.validateInput({ teamId, userId });
            this._checkPermission('members');

            // CSRF PROTECTION: Add CSRF token and create secure request body
            const requestBody = SecurityUtils.preventXSS({
                teamId: teamId,
                userId: userId,
                assignedBy: this.currentUserRole?.userId,
                assignedDate: new Date().toISOString()
            });

            const response = await fetch(this.membersApiUrl, {
                method: 'POST',
                headers: SecurityUtils.addCSRFProtection({
                    'Content-Type': 'application/json'
                }),
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`Failed to assign member: ${response.status}`);
            }

            const result = await response.json();

            // Refresh team data to update member count
            await this.loadData(this.currentFilters, this.currentSort, this.currentPage);

            // Track performance
            const operationTime = performance.now() - startTime;
            this._trackPerformance('memberAssign', operationTime);

            // Audit logging
            this._auditLog('assign_member', teamId, { userId, result });

            console.log(`[TeamsEntityManager] Member assigned successfully`);
            
            return result;
        } catch (error) {
            console.error('[TeamsEntityManager] Failed to assign member:', error);
            this._trackError('memberAssign', error);
            throw error;
        }
    }

    /**
     * Remove user from team
     * @param {string} teamId - Team ID
     * @param {string} userId - User ID to remove
     * @returns {Promise<boolean>} Removal success
     */
    async removeMember(teamId, userId) {
        const startTime = performance.now();
        
        try {
            console.log(`[TeamsEntityManager] Removing user ${userId} from team ${teamId}`);

            // Security validation
            SecurityUtils.validateInput({ teamId, userId });
            this._checkPermission('members');

            // CSRF PROTECTION: Add CSRF token to DELETE request
            const response = await fetch(`${this.membersApiUrl}/${encodeURIComponent(teamId)}/${encodeURIComponent(userId)}`, {
                method: 'DELETE',
                headers: SecurityUtils.addCSRFProtection({
                    'Content-Type': 'application/json'
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to remove member: ${response.status}`);
            }

            // Refresh team data to update member count
            await this.loadData(this.currentFilters, this.currentSort, this.currentPage);

            // Track performance
            const operationTime = performance.now() - startTime;
            this._trackPerformance('memberRemove', operationTime);

            // Audit logging
            this._auditLog('remove_member', teamId, { userId });

            console.log(`[TeamsEntityManager] Member removed successfully`);
            
            return true;
        } catch (error) {
            console.error('[TeamsEntityManager] Failed to remove member:', error);
            this._trackError('memberRemove', error);
            throw error;
        }
    }

    /**
     * Handle bulk team operations
     * @param {string} operation - Bulk operation type
     * @param {Array} teamIds - Array of team IDs
     * @param {Object} operationData - Operation-specific data
     * @returns {Promise<Object>} Bulk operation result
     */
    async bulkOperation(operation, teamIds, operationData = {}) {
        const startTime = performance.now();
        
        try {
            console.log(`[TeamsEntityManager] Executing bulk ${operation} on ${teamIds.length} teams`);

            // Security validation
            SecurityUtils.validateInput({ operation, teamIds, operationData });
            this._checkPermission('bulk');

            let result;
            switch (operation) {
                case 'delete':
                    result = await this._bulkDelete(teamIds);
                    break;
                case 'export':
                    result = await this._bulkExport(teamIds, operationData);
                    break;
                case 'setStatus':
                    result = await this._bulkSetStatus(teamIds, operationData.status);
                    break;
                default:
                    throw new Error(`Unsupported bulk operation: ${operation}`);
            }

            // Refresh data
            await this.loadData(this.currentFilters, this.currentSort, this.currentPage);

            // Track performance
            const operationTime = performance.now() - startTime;
            this._trackPerformance(`bulk${operation}`, operationTime);

            // Audit logging
            this._auditLog(`bulk_${operation}`, null, { teamIds, operationData, result });

            console.log(`[TeamsEntityManager] Bulk ${operation} completed`);
            
            return result;
        } catch (error) {
            console.error(`[TeamsEntityManager] Bulk ${operation} failed:`, error);
            this._trackError(`bulk${operation}`, error);
            throw error;
        }
    }

    // Protected Methods (BaseEntityManager implementations)

    /**
     * Fetch teams data from API
     * @param {Object} filters - Filter parameters
     * @param {Object} sort - Sort parameters
     * @param {number} page - Page number
     * @param {number} pageSize - Page size
     * @returns {Promise<Object>} API response
     * @protected
     */
    async _fetchEntityData(filters = {}, sort = null, page = 1, pageSize = 20) {
        const params = new URLSearchParams();
        
        // Add filters
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                params.append(key, value);
            }
        });

        // Add pagination
        params.append('page', page);
        params.append('pageSize', pageSize);

        // Add sorting
        if (sort) {
            params.append('sortBy', sort.column);
            params.append('sortDir', sort.direction);
        }

        const url = `${this.apiBaseUrl}?${params.toString()}`;
        console.log('[TeamsEntityManager] Fetching teams from:', url);

        // CSRF PROTECTION: Add CSRF token to GET request
        const response = await fetch(url, {
            method: 'GET',
            headers: SecurityUtils.addCSRFProtection({
                'Content-Type': 'application/json'
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch teams: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        
        return {
            data: result.teams || [],
            total: result.total || 0,
            page: result.page || page,
            pageSize: result.pageSize || pageSize
        };
    }

    /**
     * Create team via API
     * @param {Object} data - Team data
     * @returns {Promise<Object>} Created team
     * @protected
     */
    async _createEntityData(data) {
        this._checkPermission('create');

        // CSRF PROTECTION: Add CSRF token and sanitize request body
        const requestBody = SecurityUtils.preventXSS({
            ...data,
            createdBy: this.currentUserRole?.userId,
            createdDate: new Date().toISOString()
        });

        const response = await fetch(this.apiBaseUrl, {
            method: 'POST',
            headers: SecurityUtils.addCSRFProtection({
                'Content-Type': 'application/json'
            }),
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to create team: ${response.status} - ${error}`);
        }

        return await response.json();
    }

    /**
     * Update team via API
     * @param {string} id - Team ID
     * @param {Object} data - Updated data
     * @returns {Promise<Object>} Updated team
     * @protected
     */
    async _updateEntityData(id, data) {
        this._checkPermission('edit');

        // CSRF PROTECTION: Add CSRF token and sanitize request body
        const requestBody = SecurityUtils.preventXSS({
            ...data,
            modifiedBy: this.currentUserRole?.userId,
            modifiedDate: new Date().toISOString()
        });

        const response = await fetch(`${this.apiBaseUrl}/${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: SecurityUtils.addCSRFProtection({
                'Content-Type': 'application/json'
            }),
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to update team: ${response.status} - ${error}`);
        }

        return await response.json();
    }

    /**
     * Delete team via API
     * @param {string} id - Team ID
     * @returns {Promise<void>}
     * @protected
     */
    async _deleteEntityData(id) {
        this._checkPermission('delete');

        // CSRF PROTECTION: Add CSRF token to DELETE request
        const response = await fetch(`${this.apiBaseUrl}/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: SecurityUtils.addCSRFProtection({
                'Content-Type': 'application/json'
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to delete team: ${response.status} - ${error}`);
        }
    }

    /**
     * Enhanced validation for Teams entity
     * @param {Object} data - Team data
     * @param {string} operation - Operation type
     * @protected
     */
    _validateEntityData(data, operation) {
        super._validateEntityData(data, operation);

        // Teams-specific validation
        if (operation === 'create' || operation === 'update') {
            if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
                throw new Error('Team name is required and must be at least 2 characters');
            }

            if (data.name.length > 100) {
                throw new Error('Team name cannot exceed 100 characters');
            }

            if (data.description && data.description.length > 500) {
                throw new Error('Team description cannot exceed 500 characters');
            }

            // XSS prevention
            const sanitized = SecurityUtils.sanitizeInput(data.name);
            if (sanitized !== data.name) {
                throw new Error('Team name contains invalid characters');
            }
        }
    }

    // Private Methods

    /**
     * Get current user role
     * @private
     */
    async _getCurrentUserRole() {
        try {
            // Use existing UserService if available
            if (window.UMIGServices?.userService) {
                this.currentUserRole = await window.UMIGServices.userService.getCurrentUser();
            } else {
                // Fallback - get from API
                // CSRF PROTECTION: Add CSRF token to user API call
                const response = await fetch('/rest/scriptrunner/latest/custom/users/current', {
                    method: 'GET',
                    headers: SecurityUtils.addCSRFProtection({
                        'Content-Type': 'application/json'
                    })
                });

                if (response.ok) {
                    this.currentUserRole = await response.json();
                } else {
                    // Default fallback
                    this.currentUserRole = { role: 'USER', userId: 'unknown' };
                }
            }

            console.log('[TeamsEntityManager] Current user role:', this.currentUserRole?.role);
        } catch (error) {
            console.warn('[TeamsEntityManager] Failed to get user role, defaulting to USER:', error);
            this.currentUserRole = { role: 'USER', userId: 'unknown' };
        }
    }

    /**
     * Configure access controls based on user role
     * @private
     */
    _configureAccessControls() {
        const userRole = this.currentUserRole?.role || 'USER';
        const allowedActions = this.accessControls[userRole] || ['view'];

        // Update table actions based on permissions
        if (this.config.tableConfig.actions) {
            this.config.tableConfig.actions.edit = allowedActions.includes('edit');
            this.config.tableConfig.actions.delete = allowedActions.includes('delete');
            this.config.tableConfig.actions.members = allowedActions.includes('members');
        }

        // Update bulk actions
        if (this.config.tableConfig.bulkActions) {
            this.config.tableConfig.bulkActions.delete = allowedActions.includes('bulk');
            this.config.tableConfig.bulkActions.export = allowedActions.includes('bulk');
            this.config.tableConfig.bulkActions.setStatus = allowedActions.includes('bulk');
        }

        console.log('[TeamsEntityManager] Access controls configured for role:', userRole);
    }

    /**
     * Check user permission
     * @param {string} action - Action to check
     * @private
     */
    _checkPermission(action) {
        const userRole = this.currentUserRole?.role || 'USER';
        const allowedActions = this.accessControls[userRole] || ['view'];

        if (!allowedActions.includes(action)) {
            throw new Error(`Access denied: ${action} not allowed for role ${userRole}`);
        }
    }

    /**
     * Setup Teams-specific features
     * @private
     */
    async _setupTeamsSpecificFeatures() {
        // Setup member management modal if available
        if (this.modalComponent) {
            // Add members tab to modal
            await this.modalComponent.addTab({
                id: 'members',
                label: 'Members',
                content: this._createMembersTabContent.bind(this)
            });
        }

        // Setup Teams-specific event handlers
        this._setupTeamsEventHandlers();
    }

    /**
     * Create members tab content
     * @param {Object} teamData - Team data
     * @returns {HTMLElement} Members tab content
     * @private
     */
    _createMembersTabContent(teamData) {
        const container = document.createElement('div');
        container.className = 'team-members-container';
        
        // SECURITY FIX: Use secure DOM creation instead of innerHTML with string interpolation
        const membersHeader = document.createElement('div');
        membersHeader.className = 'members-header';
        
        const headerTitle = document.createElement('h4');
        // XSS PROTECTION: Use textContent instead of innerHTML for dynamic data
        headerTitle.textContent = `Team Members (${SecurityUtils.escapeHtml(teamData.memberCount || 0)})`;
        
        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = 'aui-button aui-button-primary';
        addButton.setAttribute('data-action', 'add-member');
        
        const buttonIcon = document.createElement('span');
        buttonIcon.className = 'aui-icon aui-icon-small aui-icon-plus';
        
        const buttonText = document.createTextNode('Add Member');
        addButton.appendChild(buttonIcon);
        addButton.appendChild(document.createTextNode(' '));
        addButton.appendChild(buttonText);
        
        membersHeader.appendChild(headerTitle);
        membersHeader.appendChild(addButton);
        
        const membersList = document.createElement('div');
        membersList.className = 'members-list';
        // XSS PROTECTION: Escape team ID before setting as attribute
        membersList.setAttribute('data-team-id', SecurityUtils.escapeHtml(teamData.id));
        
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading';
        loadingDiv.textContent = 'Loading members...';
        membersList.appendChild(loadingDiv);
        
        container.appendChild(membersHeader);
        container.appendChild(membersList);

        return container;
    }

    /**
     * Setup Teams-specific event handlers
     * @private
     */
    _setupTeamsEventHandlers() {
        if (this.orchestrator) {
            // Handle members action
            this.orchestrator.on('table:members', async (event) => {
                await this._showMembersModal(event.data);
            });

            // Handle bulk operations
            this.orchestrator.on('table:bulk', async (event) => {
                await this.bulkOperation(event.operation, event.selectedIds, event.operationData);
            });
        }
    }

    /**
     * Show members management modal
     * @param {Object} teamData - Team data
     * @private
     */
    async _showMembersModal(teamData) {
        if (this.modalComponent) {
            await this.modalComponent.show({
                mode: 'members',
                data: teamData,
                title: `Manage Team Members - ${teamData.name}`,
                size: 'large',
                tabs: ['details', 'members']
            });

            // Load members data
            try {
                const members = await this.loadMembers(teamData.id);
                const membersContainer = this.modalComponent.getTabContent('members').querySelector('.members-list');
                this._renderMembersList(membersContainer, members);
            } catch (error) {
                console.error('[TeamsEntityManager] Failed to load members for modal:', error);
            }
        }
    }

    /**
     * Render members list
     * @param {HTMLElement} container - Container element
     * @param {Array} members - Members array
     * @private
     */
    _renderMembersList(container, members) {
        // Clear container safely
        container.innerHTML = '';
        
        if (members.length === 0) {
            // SECURITY FIX: Use secure DOM creation instead of innerHTML
            const noMembersDiv = document.createElement('div');
            noMembersDiv.className = 'no-members';
            noMembersDiv.textContent = 'No members in this team';
            container.appendChild(noMembersDiv);
            return;
        }

        // SECURITY FIX: Create member elements securely using DOM methods
        members.forEach(member => {
            // Input validation and sanitization
            const validationResult = SecurityUtils.validateInput(member, {
                preventXSS: true,
                preventSQLInjection: true,
                sanitizeStrings: true
            });

            if (!validationResult.isValid) {
                console.warn('[TeamsEntityManager] Invalid member data detected:', validationResult.errors);
                return; // Skip this member if validation fails
            }

            const sanitizedMember = validationResult.sanitizedData;

            const memberItem = document.createElement('div');
            memberItem.className = 'member-item';
            // XSS PROTECTION: Escape user ID before setting as attribute
            memberItem.setAttribute('data-user-id', SecurityUtils.escapeHtml(sanitizedMember.userId || ''));

            const memberInfo = document.createElement('div');
            memberInfo.className = 'member-info';

            const usernameElement = document.createElement('strong');
            // XSS PROTECTION: Use textContent for dynamic user data
            usernameElement.textContent = sanitizedMember.username || 'Unknown User';

            const emailElement = document.createElement('span');
            emailElement.className = 'member-email';
            // XSS PROTECTION: Use textContent for email data
            emailElement.textContent = sanitizedMember.email || '';

            memberInfo.appendChild(usernameElement);
            memberInfo.appendChild(document.createTextNode(' '));
            memberInfo.appendChild(emailElement);

            const memberActions = document.createElement('div');
            memberActions.className = 'member-actions';

            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'aui-button aui-button-subtle';
            removeButton.setAttribute('data-action', 'remove-member');
            removeButton.textContent = 'Remove';

            memberActions.appendChild(removeButton);

            memberItem.appendChild(memberInfo);
            memberItem.appendChild(memberActions);
            container.appendChild(memberItem);
        });

        // Add event listeners for member actions
        container.addEventListener('click', (e) => {
            if (e.target.dataset.action === 'remove-member') {
                const memberItem = e.target.closest('.member-item');
                const userId = memberItem.dataset.userId;
                const teamId = container.dataset.teamId;
                this._confirmRemoveMember(teamId, userId, memberItem);
            }
        });
    }

    /**
     * Confirm member removal
     * @param {string} teamId - Team ID
     * @param {string} userId - User ID
     * @param {HTMLElement} memberElement - Member element
     * @private
     */
    async _confirmRemoveMember(teamId, userId, memberElement) {
        if (confirm('Are you sure you want to remove this member from the team?')) {
            try {
                await this.removeMember(teamId, userId);
                memberElement.remove();
                
                // Update member count in modal
                const membersHeader = memberElement.closest('.team-members-container').querySelector('.members-header h4');
                const currentCount = parseInt(membersHeader.textContent.match(/\d+/)[0]) - 1;
                membersHeader.textContent = `Team Members (${currentCount})`;
            } catch (error) {
                alert('Failed to remove member: ' + error.message);
            }
        }
    }

    /**
     * Bulk delete teams
     * @param {Array} teamIds - Team IDs to delete
     * @returns {Promise<Object>} Delete result
     * @private
     */
    async _bulkDelete(teamIds) {
        // CSRF PROTECTION: Add CSRF token and sanitize bulk delete request
        const requestBody = SecurityUtils.preventXSS({ teamIds });
        
        const response = await fetch(`${this.apiBaseUrl}/bulk/delete`, {
            method: 'POST',
            headers: SecurityUtils.addCSRFProtection({
                'Content-Type': 'application/json'
            }),
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`Bulk delete failed: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Bulk export teams
     * @param {Array} teamIds - Team IDs to export
     * @param {Object} options - Export options
     * @returns {Promise<Object>} Export result
     * @private
     */
    async _bulkExport(teamIds, options) {
        // CSRF PROTECTION: Add CSRF token and sanitize bulk export request
        const requestBody = SecurityUtils.preventXSS({ teamIds, options });
        
        const response = await fetch(`${this.apiBaseUrl}/bulk/export`, {
            method: 'POST',
            headers: SecurityUtils.addCSRFProtection({
                'Content-Type': 'application/json'
            }),
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`Bulk export failed: ${response.status}`);
        }

        // Handle file download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = options.filename || `teams_export_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        return { success: true, filename: a.download };
    }

    /**
     * Bulk set status for teams
     * @param {Array} teamIds - Team IDs
     * @param {string} status - New status
     * @returns {Promise<Object>} Update result
     * @private
     */
    async _bulkSetStatus(teamIds, status) {
        // CSRF PROTECTION: Add CSRF token and sanitize bulk status request
        const requestBody = SecurityUtils.preventXSS({ teamIds, status });
        
        const response = await fetch(`${this.apiBaseUrl}/bulk/status`, {
            method: 'PUT',
            headers: SecurityUtils.addCSRFProtection({
                'Content-Type': 'application/json'
            }),
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`Bulk status update failed: ${response.status}`);
        }

        return await response.json();
    }
}

export default TeamsEntityManager;