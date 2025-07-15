/**
 * UMIG Admin GUI JavaScript Controller
 * 
 * Main controller for the UMIG Administration interface.
 * Handles authentication, navigation, data management, and UI interactions.
 * 
 * Features:
 * - Confluence user integration
 * - Role-based access control
 * - Dynamic content loading
 * - CRUD operations for all entities
 * - Real-time data refresh
 * - Search and filtering
 * - Pagination
 * - Modal forms
 */

(function() {
    'use strict';

    // Global Admin GUI namespace
    window.adminGui = {
        // Application state
        state: {
            isAuthenticated: false,
            currentUser: null,
            currentSection: 'users',
            currentEntity: 'users',
            currentPage: 1,
            pageSize: 50,
            searchTerm: '',
            sortField: null,
            sortDirection: 'asc',
            selectedRows: new Set(),
            data: {},
            pagination: null,
            loading: false,
            teamFilter: null
        },

        // Configuration from Groovy macro
        config: window.UMIG_CONFIG || {},

        // API endpoints
        api: {
            baseUrl: '/rest/scriptrunner/latest/custom',
            endpoints: {
                users: '/users',
                teams: '/teams',
                environments: '/environments',
                applications: '/applications',
                iterations: '/iterations',
                labels: '/labels',
                migrations: '/migrations',
                stepView: '/stepViewApi'
            }
        },

        // Entity configurations
        entities: {
            users: {
                name: 'Users',
                description: 'Manage user accounts, roles, and permissions',
                fields: [
                    { key: 'usr_id', label: 'ID', type: 'number', readonly: true },
                    { key: 'usr_code', label: 'User Code', type: 'text', required: true, maxLength: 3 },
                    { key: 'usr_first_name', label: 'First Name', type: 'text', required: true },
                    { key: 'usr_last_name', label: 'Last Name', type: 'text', required: true },
                    { key: 'usr_email', label: 'Email', type: 'email', required: true },
                    { key: 'usr_is_admin', label: 'Super Admin', type: 'boolean', required: true },
                    { key: 'usr_active', label: 'Active', type: 'boolean', required: true },
                    { key: 'rls_id', label: 'Role', type: 'select', options: [
                        { value: null, label: 'No Role' },
                        { value: 1, label: 'Admin' },
                        { value: 2, label: 'User' },
                        { value: 3, label: 'Pilot' }
                    ]},
                    { key: 'created_at', label: 'Created', type: 'datetime', readonly: true },
                    { key: 'updated_at', label: 'Updated', type: 'datetime', readonly: true }
                ],
                tableColumns: ['usr_id', 'usr_code', 'usr_first_name', 'usr_last_name', 'usr_email', 'role_display', 'status_display'],
                // Map display column names to database column names for sorting
                sortMapping: {
                    'usr_id': 'usr_id',
                    'usr_code': 'usr_code',
                    'usr_first_name': 'usr_first_name',
                    'usr_last_name': 'usr_last_name',
                    'usr_email': 'usr_email',
                    'role_display': 'rls_id',
                    'status_display': 'usr_active'
                },
                filters: [
                    {
                        key: 'teamId',
                        label: 'Team',
                        type: 'select',
                        endpoint: '/teams',
                        valueField: 'tms_id',
                        textField: 'tms_name',
                        placeholder: 'All Teams'
                    }
                ],
                permissions: ['superadmin']
            },
            teams: {
                name: 'Teams',
                description: 'Manage organizational teams and team memberships',
                fields: [
                    { key: 'tms_id', label: 'ID', type: 'number', readonly: true },
                    { key: 'tms_name', label: 'Team Name', type: 'text', required: true },
                    { key: 'tms_description', label: 'Description', type: 'textarea' },
                    { key: 'tms_email', label: 'Team Email', type: 'email' },
                    { key: 'member_count', label: 'Members', type: 'number', readonly: true, computed: true },
                    { key: 'app_count', label: 'Applications', type: 'number', readonly: true, computed: true },
                    { key: 'created_date', label: 'Created', type: 'datetime', readonly: true },
                    { key: 'updated_date', label: 'Updated', type: 'datetime', readonly: true }
                ],
                tableColumns: ['tms_id', 'tms_name', 'tms_description', 'tms_email', 'member_count', 'app_count'],
                // Map display column names to database column names for sorting
                sortMapping: {
                    'tms_id': 'tms_id',
                    'tms_name': 'tms_name',
                    'tms_description': 'tms_description',
                    'tms_email': 'tms_email',
                    'member_count': 'member_count',
                    'app_count': 'app_count'
                },
                permissions: ['superadmin']
            },
            environments: {
                name: 'Environments',
                description: 'Manage environments and their associations with applications and iterations',
                fields: [
                    { key: 'env_id', label: 'ID', type: 'number', readonly: true },
                    { key: 'env_code', label: 'Environment Code', type: 'text', required: true, maxLength: 10 },
                    { key: 'env_name', label: 'Environment Name', type: 'text', required: true, maxLength: 64 },
                    { key: 'env_description', label: 'Description', type: 'textarea' },
                    { key: 'application_count', label: 'Applications', type: 'number', readonly: true, computed: true },
                    { key: 'iteration_count', label: 'Iterations', type: 'number', readonly: true, computed: true }
                ],
                tableColumns: ['env_id', 'env_code', 'env_name', 'env_description', 'application_count', 'iteration_count'],
                // Map display column names to database column names for sorting
                sortMapping: {
                    'env_id': 'env_id',
                    'env_code': 'env_code',
                    'env_name': 'env_name',
                    'env_description': 'env_description',
                    'application_count': 'application_count',
                    'iteration_count': 'iteration_count'
                },
                permissions: ['superadmin']
            }
            // Other entities will be added as needed
        },

        // Initialize the application
        init: function() {
            console.log('UMIG Admin GUI initializing...');
            this.bindEvents();
            this.initializeLogin();
        },

        // Show notification message
        showNotification: function(message, type = 'info') {
            // Create notification element
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.textContent = message;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                background: ${type === 'success' ? '#00875A' : type === 'error' ? '#DE350B' : '#0052CC'};
                color: white;
                border-radius: 4px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                z-index: 10000;
                animation: slideIn 0.3s ease-out;
            `;
            
            document.body.appendChild(notification);
            
            // Remove after 3 seconds
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        },

        // Bind all event listeners
        bindEvents: function() {
            // Login form
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginForm.addEventListener('submit', this.handleLogin.bind(this));
            }

            // Logout button
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', this.handleLogout.bind(this));
            }

            // Navigation menu
            document.addEventListener('click', (e) => {
                if (e.target.matches('.nav-item')) {
                    e.preventDefault();
                    this.handleNavigation(e.target);
                }
            });

            // Search functionality
            const searchInput = document.getElementById('globalSearch');
            if (searchInput) {
                let searchTimeout;
                searchInput.addEventListener('input', (e) => {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        this.handleSearch(e.target.value);
                    }, 300);
                });
            }

            // Page size selector
            const pageSizeSelect = document.getElementById('pageSize');
            if (pageSizeSelect) {
                pageSizeSelect.addEventListener('change', (e) => {
                    this.state.pageSize = parseInt(e.target.value);
                    this.state.currentPage = 1;
                    this.loadCurrentSection();
                });
            }

            // Pagination buttons
            document.addEventListener('click', (e) => {
                if (e.target.matches('.pagination-btn')) {
                    this.handlePagination(e.target);
                }
            });

            // Add new button
            const addNewBtn = document.getElementById('addNewBtn');
            if (addNewBtn) {
                addNewBtn.addEventListener('click', () => {
                    this.showEditModal(null);
                });
            }

            // Refresh button
            const refreshBtn = document.getElementById('refreshBtn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    this.refreshCurrentSection();
                });
            }

            // Modal events
            this.bindModalEvents();

            // Table events
            this.bindTableEvents();
        },

        // Initialize login page
        initializeLogin: function() {
            const userCodeInput = document.getElementById('userCode');
            
            // Pre-populate with Confluence username if available
            if (this.config.confluence && this.config.confluence.username) {
                const username = this.config.confluence.username.toUpperCase();
                if (username.length === 3) {
                    userCodeInput.value = username;
                }
            }

            userCodeInput.focus();
        },

        // Handle login form submission
        handleLogin: function(e) {
            e.preventDefault();
            
            const userCode = document.getElementById('userCode').value.trim().toUpperCase();
            const loginBtn = e.target.querySelector('.login-btn');
            const btnText = loginBtn.querySelector('.btn-text');
            const btnLoading = loginBtn.querySelector('.btn-loading');
            const errorDiv = document.getElementById('loginError');

            // Basic validation
            if (!userCode || userCode.length !== 3) {
                this.showLoginError('Please enter a valid 3-character trigram');
                return;
            }

            // Show loading state
            loginBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoading.style.display = 'inline';
            errorDiv.style.display = 'none';

            // Simulate authentication (in real app, this would call an API)
            setTimeout(() => {
                this.authenticateUser(userCode)
                    .then(user => {
                        this.state.currentUser = user;
                        this.state.isAuthenticated = true;
                        this.showDashboard();
                    })
                    .catch(error => {
                        this.showLoginError(error.message);
                    })
                    .finally(() => {
                        loginBtn.disabled = false;
                        btnText.style.display = 'inline';
                        btnLoading.style.display = 'none';
                    });
            }, 500);
        },

        // Authenticate user (mock implementation)
        authenticateUser: function(userCode) {
            return new Promise((resolve, reject) => {
                // Mock user authentication - accepts any 3-character trigram
                // In real implementation, this would call the Users API
                
                // Determine role based on trigram pattern (for demo purposes)
                let role, name, permissions;
                
                if (userCode.startsWith('A') || userCode === 'ADM') {
                    // Admin-like trigrams get superadmin role
                    role = 'superadmin';
                    name = `${userCode} (Super Admin)`;
                    permissions = ['users', 'teams', 'environments', 'applications', 'labels', 'migrations', 'plans', 'iterations'];
                } else if (userCode.startsWith('M') || userCode === 'MGR') {
                    // Manager-like trigrams get admin role
                    role = 'admin';
                    name = `${userCode} (Admin)`;
                    permissions = ['migrations', 'plans', 'iterations', 'sequences'];
                } else {
                    // All other trigrams get pilot role
                    role = 'pilot';
                    name = `${userCode} (Pilot)`;
                    permissions = ['iterations', 'sequences', 'phases', 'steps'];
                }

                const user = {
                    trigram: userCode,
                    role: role,
                    name: name,
                    permissions: permissions
                };
                
                // Always resolve with a user (mock accepts any 3-char trigram)
                resolve(user);
            });
        },

        // Show login error
        showLoginError: function(message) {
            const errorDiv = document.getElementById('loginError');
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        },

        // Show main dashboard
        showDashboard: function() {
            document.getElementById('loginPage').style.display = 'none';
            document.getElementById('adminDashboard').style.display = 'flex';
            
            this.setupUserInterface();
            this.setupMenuVisibility();
            this.loadCurrentSection();
        },

        // Setup user interface with current user info
        setupUserInterface: function() {
            const user = this.state.currentUser;
            
            document.getElementById('currentUserName').textContent = `Welcome, ${user.name}`;
            document.getElementById('currentUserRole').textContent = user.role.toUpperCase();
        },

        // Setup menu visibility based on user role
        setupMenuVisibility: function() {
            const role = this.state.currentUser.role;
            
            const superadminSection = document.getElementById('superadminSection');
            const adminSection = document.getElementById('adminSection');
            const pilotSection = document.getElementById('pilotSection');

            // Hide all sections first
            superadminSection.style.display = 'none';
            adminSection.style.display = 'none';
            pilotSection.style.display = 'none';

            // Show sections based on role
            if (role === 'superadmin') {
                superadminSection.style.display = 'block';
                adminSection.style.display = 'block';
                pilotSection.style.display = 'block';
            } else if (role === 'admin') {
                adminSection.style.display = 'block';
                pilotSection.style.display = 'block';
            } else if (role === 'pilot') {
                pilotSection.style.display = 'block';
            }
        },

        // Handle navigation menu clicks
        handleNavigation: function(navItem) {
            // Remove active class from all nav items
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });

            // Add active class to clicked item
            navItem.classList.add('active');

            // Get section and entity from data attributes
            const section = navItem.getAttribute('data-section');
            const entity = navItem.getAttribute('data-entity') || section;

            this.state.currentSection = section;
            this.state.currentEntity = entity;
            this.state.currentPage = 1;
            this.state.selectedRows.clear();
            
            // Reset filters when switching sections
            this.state.teamFilter = null;

            this.updateContentHeader();
            this.loadCurrentSection();
        },

        // Update content header based on current section
        updateContentHeader: function() {
            const entity = this.entities[this.state.currentEntity];
            if (entity) {
                document.getElementById('contentTitle').textContent = `${entity.name} Management`;
                document.getElementById('contentDescription').textContent = entity.description;
                document.getElementById('addNewBtn').innerHTML = `<span class="btn-icon">➕</span> Add New ${entity.name.slice(0, -1)}`;
            }
        },

        // Load data for current section
        loadCurrentSection: function() {
            this.showLoading();
            
            const entity = this.state.currentEntity;
            const endpoint = this.api.endpoints[entity];
            
            if (!endpoint) {
                this.showError('Invalid entity: ' + entity);
                return;
            }

            // Build API URL with pagination and search
            const params = new URLSearchParams({
                page: this.state.currentPage,
                size: this.state.pageSize
            });

            if (this.state.searchTerm) {
                params.append('search', this.state.searchTerm);
            }

            if (this.state.sortField) {
                params.append('sort', this.state.sortField);
                params.append('direction', this.state.sortDirection);
            }
            if (this.state.teamFilter) {
                params.append('teamId', this.state.teamFilter);
            }

            const url = `${this.api.baseUrl}${endpoint}?${params.toString()}`;

            fetch(url, {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                // Handle both paginated and non-paginated responses
                if (data.content && Array.isArray(data.content)) {
                    // Paginated response
                    this.state.data[entity] = data.content;
                    this.state.pagination = {
                        totalElements: data.totalElements || 0,
                        totalPages: data.totalPages || 1,
                        pageNumber: data.pageNumber || 1,
                        pageSize: data.pageSize || 50,
                        hasNext: data.hasNext || false,
                        hasPrevious: data.hasPrevious || false
                    };
                    
                    // Update sort state from server response
                    if (data.sortField) {
                        this.state.sortField = data.sortField;
                        this.state.sortDirection = data.sortDirection || 'asc';
                    }
                } else if (Array.isArray(data)) {
                    // Non-paginated response (fallback)
                    this.state.data[entity] = data;
                    this.state.pagination = {
                        totalElements: data.length,
                        totalPages: 1,
                        pageNumber: 1,
                        pageSize: data.length,
                        hasNext: false,
                        hasPrevious: false
                    };
                } else {
                    // Fallback for unknown format
                    this.state.data[entity] = [];
                    this.state.pagination = {
                        totalElements: 0,
                        totalPages: 1,
                        pageNumber: 1,
                        pageSize: 50,
                        hasNext: false,
                        hasPrevious: false
                    };
                }
                
                this.renderTable();
                this.renderFilterControls();
                this.hideLoading();
            })
            .catch(error => {
                console.error('Error loading data:', error);
                this.showError(`Failed to load ${entity}: ${error.message}`);
            });
        },

        // Render data table
        renderTable: function() {
            const entity = this.entities[this.state.currentEntity];
            const data = this.state.data[this.state.currentEntity] || [];

            // Render table headers
            this.renderTableHeaders(entity);

            // Render table body
            this.renderTableBody(entity, data);

            // Update pagination
            this.updatePagination(data.length);
        },

        // Render table headers
        renderTableHeaders: function(entity) {
            const headerRow = document.getElementById('tableHeader');
            headerRow.innerHTML = '';

            // Add checkbox column for row selection
            const checkboxTh = document.createElement('th');
            checkboxTh.innerHTML = '<input type="checkbox" id="selectAll">';
            checkboxTh.style.width = '40px';
            headerRow.appendChild(checkboxTh);

            // Add data columns
            entity.tableColumns.forEach(columnKey => {
                const field = entity.fields.find(f => f.key === columnKey) || { key: columnKey, label: columnKey };
                const th = document.createElement('th');
                th.textContent = field.label;
                th.setAttribute('data-field', columnKey);
                
                // Only make sortable columns clickable
                if (entity.sortMapping && entity.sortMapping[columnKey]) {
                    th.style.cursor = 'pointer';
                    th.title = 'Click to sort';
                    
                    // Add sort indicator - check if current database field matches this column's mapped field
                    const dbField = entity.sortMapping[columnKey];
                    if (this.state.sortField === dbField) {
                        const indicator = this.state.sortDirection === 'asc' ? ' ▲' : ' ▼';
                        th.textContent += indicator;
                    }
                } else {
                    th.style.cursor = 'default';
                    th.title = 'Not sortable';
                }
                
                headerRow.appendChild(th);
            });

            // Add actions column
            const actionsTh = document.createElement('th');
            actionsTh.textContent = 'Actions';
            actionsTh.style.width = '120px';
            headerRow.appendChild(actionsTh);

            // Bind select all checkbox
            const selectAllCheckbox = document.getElementById('selectAll');
            selectAllCheckbox.addEventListener('change', (e) => {
                this.handleSelectAll(e.target.checked);
            });
        },

        // Render table body
        renderTableBody: function(entity, data) {
            const tbody = document.getElementById('tableBody');
            tbody.innerHTML = '';

            if (data.length === 0) {
                const tr = document.createElement('tr');
                const td = document.createElement('td');
                td.colSpan = entity.tableColumns.length + 2;
                td.textContent = 'No data found';
                td.style.textAlign = 'center';
                td.style.padding = '40px';
                td.style.color = '#718096';
                tr.appendChild(td);
                tbody.appendChild(tr);
                return;
            }

            data.forEach(record => {
                const tr = document.createElement('tr');
                tr.setAttribute('data-id', record[entity.fields[0].key]);

                // Checkbox column
                const checkboxTd = document.createElement('td');
                checkboxTd.innerHTML = `<input type="checkbox" class="row-select" value="${record[entity.fields[0].key]}">`;
                tr.appendChild(checkboxTd);

                // Data columns
                entity.tableColumns.forEach(columnKey => {
                    const td = document.createElement('td');
                    const value = this.formatCellValue(record, columnKey, entity);
                    td.innerHTML = value;
                    tr.appendChild(td);
                });

                // Actions column
                const actionsTd = document.createElement('td');
                actionsTd.className = 'action-buttons';
                
                // Add view details button for environments
                let actionsHtml = '';
                if (this.state.currentEntity === 'environments') {
                    actionsHtml = `
                        <button class="btn-table-action btn-view" data-action="view" data-id="${record[entity.fields[0].key]}" title="View Details">👁️</button>
                    `;
                }
                
                actionsHtml += `
                    <button class="btn-table-action btn-edit" data-action="edit" data-id="${record[entity.fields[0].key]}" title="Edit">✏️</button>
                    <button class="btn-table-action btn-delete" data-action="delete" data-id="${record[entity.fields[0].key]}" title="Delete">🗑️</button>
                `;
                
                actionsTd.innerHTML = actionsHtml;
                tr.appendChild(actionsTd);

                tbody.appendChild(tr);
            });

            // Bind row selection checkboxes
            tbody.querySelectorAll('.row-select').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    this.handleRowSelection(e.target);
                });
            });
        },

        // Format cell value for display
        formatCellValue: function(record, columnKey, entity) {
            let value = record[columnKey];

            // Handle special display columns
            if (columnKey === 'role_display') {
                const roleId = record.rls_id;
                const isAdmin = record.usr_is_admin;
                
                if (isAdmin) {
                    return '<span class="status-badge status-superadmin">Super Admin</span>';
                } else if (roleId === 1) {
                    return '<span class="status-badge status-admin">Admin</span>';
                } else if (roleId === 2) {
                    return '<span class="status-badge status-user">User</span>';
                } else if (roleId === 3) {
                    return '<span class="status-badge status-pilot">Pilot</span>';
                } else {
                    return '<span class="status-badge">No Role</span>';
                }
            }

            if (columnKey === 'status_display') {
                const isActive = record.usr_active !== false; // Check usr_active field
                return isActive ? 
                    '<span class="status-badge status-active">Active</span>' : 
                    '<span class="status-badge status-inactive">Inactive</span>';
            }

            if (columnKey === 'member_count') {
                return record.member_count || '0';
            }
            if (columnKey === 'app_count') {
                return record.app_count || '0';
            }

            // Handle null/undefined values
            if (value === null || value === undefined) {
                return '<span style="color: #a0aec0;">—</span>';
            }

            // Handle boolean values
            if (typeof value === 'boolean') {
                return value ? 
                    '<span class="status-badge status-active">Yes</span>' : 
                    '<span class="status-badge">No</span>';
            }

            // Handle dates and timestamps
            if ((columnKey.includes('date') || columnKey.includes('_at')) && value) {
                const date = new Date(value);
                // Format as YYYY-MM-DD HH:MM:SS
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const seconds = String(date.getSeconds()).padStart(2, '0');
                return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
            }

            // Handle email
            if (columnKey.includes('email') && value) {
                return `<a href="mailto:${value}">${value}</a>`;
            }

            return String(value);
        },

        // Handle row selection
        handleRowSelection: function(checkbox) {
            const id = checkbox.value;
            
            if (checkbox.checked) {
                this.state.selectedRows.add(id);
            } else {
                this.state.selectedRows.delete(id);
            }

            this.updateBulkActionsButton();
            this.updateSelectAllCheckbox();
        },

        // Handle select all checkbox
        handleSelectAll: function(checked) {
            const checkboxes = document.querySelectorAll('.row-select');
            
            checkboxes.forEach(checkbox => {
                checkbox.checked = checked;
                this.handleRowSelection(checkbox);
            });
        },

        // Update bulk actions button state
        updateBulkActionsButton: function() {
            const bulkBtn = document.getElementById('bulkActionsBtn');
            if (bulkBtn) {
                bulkBtn.disabled = this.state.selectedRows.size === 0;
                bulkBtn.textContent = `Bulk Actions (${this.state.selectedRows.size})`;
            }
        },

        // Update select all checkbox state
        updateSelectAllCheckbox: function() {
            const selectAllCheckbox = document.getElementById('selectAll');
            const rowCheckboxes = document.querySelectorAll('.row-select');
            
            if (rowCheckboxes.length === 0) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
                return;
            }

            const checkedCount = this.state.selectedRows.size;
            
            if (checkedCount === 0) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
            } else if (checkedCount === rowCheckboxes.length) {
                selectAllCheckbox.checked = true;
                selectAllCheckbox.indeterminate = false;
            } else {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = true;
            }
        },

        // Update pagination controls
        updatePagination: function(totalItems) {
            const paginationInfo = document.getElementById('paginationInfo');
            
            // Use pagination data if available, otherwise fall back to totalItems
            const pagination = this.state.pagination || {};
            const totalElements = pagination.totalElements || totalItems;
            const currentPage = pagination.pageNumber || this.state.currentPage;
            const pageSize = pagination.pageSize || this.state.pageSize;
            
            const startItem = totalElements > 0 ? ((currentPage - 1) * pageSize) + 1 : 0;
            const endItem = Math.min(startItem + pageSize - 1, totalElements);
            
            paginationInfo.textContent = `Showing ${startItem}-${endItem} of ${totalElements} items`;

            // Update pagination buttons
            const prevBtn = document.getElementById('prevPageBtn');
            const nextBtn = document.getElementById('nextPageBtn');
            
            if (prevBtn) prevBtn.disabled = !pagination.hasPrevious;
            if (nextBtn) nextBtn.disabled = !pagination.hasNext;
        },

        // Handle search
        handleSearch: function(searchTerm) {
            this.state.searchTerm = searchTerm;
            this.state.currentPage = 1;
            this.loadCurrentSection();
        },

        // Handle pagination
        handlePagination: function(button) {
            const action = button.getAttribute('data-action') || button.id;
            
            switch (action) {
                case 'firstPageBtn':
                    this.state.currentPage = 1;
                    break;
                case 'prevPageBtn':
                    if (this.state.currentPage > 1) {
                        this.state.currentPage--;
                    }
                    break;
                case 'nextPageBtn':
                    this.state.currentPage++;
                    break;
                case 'lastPageBtn':
                    // Calculate last page (simplified)
                    this.state.currentPage = Math.max(1, this.state.currentPage + 1);
                    break;
            }
            
            this.loadCurrentSection();
        },

        // Bind modal events
        bindModalEvents: function() {
            // Close modal events
            const closeModal = document.getElementById('closeModal');
            if (closeModal) {
                closeModal.addEventListener('click', this.hideEditModal.bind(this));
            }

            const cancelBtn = document.getElementById('cancelBtn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', this.hideEditModal.bind(this));
            }

            // Save button
            const saveBtn = document.getElementById('saveBtn');
            if (saveBtn) {
                saveBtn.addEventListener('click', this.handleSave.bind(this));
            }

            // Delete button
            const deleteBtn = document.getElementById('deleteBtn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', this.handleDelete.bind(this));
            }

            // Close modal when clicking outside
            const editModal = document.getElementById('editModal');
            if (editModal) {
                editModal.addEventListener('click', (e) => {
                    if (e.target === editModal) {
                        this.hideEditModal();
                    }
                });
            }

            // Escape key to close modal
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.hideEditModal();
                    this.hideConfirmModal();
                }
            });
        },

        // Bind table events
        bindTableEvents: function() {
            // Table action buttons
            document.addEventListener('click', (e) => {
                if (e.target.matches('[data-action="view"]')) {
                    const id = e.target.getAttribute('data-id');
                    this.showEnvironmentDetails(id);
                }
                
                if (e.target.matches('[data-action="edit"]')) {
                    const id = e.target.getAttribute('data-id');
                    this.showEditModal(id);
                }
                
                if (e.target.matches('[data-action="delete"]')) {
                    const id = e.target.getAttribute('data-id');
                    this.confirmDelete(id);
                }
            });

            // Column sorting
            document.addEventListener('click', (e) => {
                if (e.target.matches('th[data-field]')) {
                    const field = e.target.getAttribute('data-field');
                    this.handleSort(field);
                }
            });

            // Row double-click to edit
            document.addEventListener('dblclick', (e) => {
                const row = e.target.closest('tr[data-id]');
                if (row) {
                    const id = row.getAttribute('data-id');
                    this.showEditModal(id);
                }
            });
        },

        // Handle column sorting
        handleSort: function(field) {
            const entity = this.entities[this.state.currentEntity];
            
            // Check if the field is sortable
            if (!entity.sortMapping || !entity.sortMapping[field]) {
                console.log(`Field ${field} is not sortable`);
                return;
            }
            
            // Get the database column name for this display field
            const dbField = entity.sortMapping[field];
            
            if (this.state.sortField === dbField) {
                this.state.sortDirection = this.state.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                this.state.sortField = dbField;
                this.state.sortDirection = 'asc';
            }
            
            this.state.currentPage = 1; // Reset to first page when sorting
            this.loadCurrentSection();
        },

        // Show edit modal
        showEditModal: function(id) {
            const modal = document.getElementById('editModal');
            const modalTitle = document.getElementById('modalTitle');
            const deleteBtn = document.getElementById('deleteBtn');
            
            const isEdit = id !== null;
            modalTitle.textContent = isEdit ? 'Edit Record' : 'Add New Record';
            deleteBtn.style.display = isEdit ? 'inline-block' : 'none';
            
            this.renderEditForm(id);
            modal.style.display = 'flex';
            
            // Focus first input
            setTimeout(() => {
                const firstInput = modal.querySelector('input:not([readonly]), textarea, select');
                if (firstInput) firstInput.focus();
            }, 100);
        },

        // Render edit form
        renderEditForm: function(id) {
            const entity = this.entities[this.state.currentEntity];
            const formFields = document.getElementById('formFields');
            const data = this.state.data[this.state.currentEntity] || [];
            const record = id ? data.find(r => r[entity.fields[0].key] == id) : {};
            
            formFields.innerHTML = '';
            
            // Add association management for environments (only when editing)
            if (this.state.currentEntity === 'environments' && id) {
                const associationDiv = document.createElement('div');
                associationDiv.className = 'form-group association-management';
                associationDiv.innerHTML = `
                    <label>Manage Associations</label>
                    <div class="association-buttons">
                        <button type="button" class="btn-primary" onclick="adminGui.showAssociateApplicationModal(${id})">Associate Application</button>
                        <button type="button" class="btn-primary" onclick="adminGui.showAssociateIterationModal(${id})">Associate Iteration</button>
                    </div>
                `;
                formFields.appendChild(associationDiv);
                
                // Add separator
                const separator = document.createElement('hr');
                separator.style.margin = '20px 0';
                formFields.appendChild(separator);
            }
            
            entity.fields.forEach(field => {
                if (field.readonly && !id) return; // Skip readonly fields for new records
                
                const fieldDiv = document.createElement('div');
                fieldDiv.className = 'form-group';
                
                const label = document.createElement('label');
                label.textContent = field.label + (field.required ? ' *' : '');
                label.setAttribute('for', field.key);
                fieldDiv.appendChild(label);
                
                let input;
                
                switch (field.type) {
                    case 'textarea':
                        input = document.createElement('textarea');
                        input.rows = 3;
                        break;
                    case 'select':
                        input = document.createElement('select');
                        field.options.forEach(option => {
                            const optionEl = document.createElement('option');
                            optionEl.value = option.value;
                            optionEl.textContent = option.label;
                            input.appendChild(optionEl);
                        });
                        break;
                    case 'boolean':
                        input = document.createElement('select');
                        input.innerHTML = '<option value="true">Yes</option><option value="false">No</option>';
                        break;
                    default:
                        input = document.createElement('input');
                        input.type = field.type;
                }
                
                input.id = field.key;
                input.name = field.key;
                input.required = field.required;
                input.readOnly = field.readonly;
                
                // Set maxLength if specified
                if (field.maxLength && input.type === 'text') {
                    input.maxLength = field.maxLength;
                }
                
                // Set current value
                const value = record[field.key];
                if (value !== undefined && value !== null) {
                    if (field.type === 'boolean') {
                        input.value = String(value);
                    } else if (field.type === 'datetime') {
                        // Format datetime as YYYY-MM-DD HH:MM:SS for display
                        const date = new Date(value);
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const hours = String(date.getHours()).padStart(2, '0');
                        const minutes = String(date.getMinutes()).padStart(2, '0');
                        const seconds = String(date.getSeconds()).padStart(2, '0');
                        input.value = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                    } else {
                        input.value = value;
                    }
                }
                
                fieldDiv.appendChild(input);
                formFields.appendChild(fieldDiv);
            });
        },

        // Hide edit modal
        hideEditModal: function() {
            const modal = document.getElementById('editModal');
            modal.style.display = 'none';
        },

        // Validate form data
        validateFormData: function(data, entity) {
            const errors = [];
            
            entity.fields.forEach(field => {
                const value = data[field.key];
                const label = field.label;
                
                // Skip readonly fields
                if (field.readonly) return;
                
                // Check required fields
                if (field.required) {
                    if (!value || (typeof value === 'string' && value.trim() === '')) {
                        errors.push(`• ${label} is required`);
                        return;
                    }
                }
                
                // Skip validation if field is empty and not required
                if (!value || (typeof value === 'string' && value.trim() === '')) {
                    return;
                }
                
                // Type-specific validation
                switch (field.type) {
                    case 'email':
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(value)) {
                            errors.push(`• ${label} must be a valid email address`);
                        }
                        break;
                        
                    case 'text':
                        if (field.maxLength && value.length > field.maxLength) {
                            errors.push(`• ${label} cannot exceed ${field.maxLength} characters`);
                        }
                        
                        // Special validation for usr_code
                        if (field.key === 'usr_code') {
                            if (value.length !== 3) {
                                errors.push(`• ${label} must be exactly 3 characters`);
                            }
                            if (!/^[A-Z0-9]+$/i.test(value)) {
                                errors.push(`• ${label} can only contain letters and numbers`);
                            }
                        }
                        break;
                        
                    case 'number':
                        if (isNaN(value) || !Number.isInteger(Number(value))) {
                            errors.push(`• ${label} must be a valid number`);
                        }
                        break;
                }
            });
            
            return errors;
        },

        // Handle save
        handleSave: function() {
            const form = document.getElementById('editForm');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            // Enhanced validation
            const entity = this.entities[this.state.currentEntity];
            const validationErrors = this.validateFormData(data, entity);
            
            if (validationErrors.length > 0) {
                const errorMessage = "Please fix the following issues:\n\n" + validationErrors.join('\n');
                alert(errorMessage);
                return;
            }
            
            // Convert data types
            entity.fields.forEach(field => {
                if (data[field.key] !== undefined) {
                    switch (field.type) {
                        case 'number':
                            data[field.key] = data[field.key] ? parseInt(data[field.key]) : null;
                            break;
                        case 'boolean':
                            data[field.key] = data[field.key] === 'true';
                            break;
                        case 'select':
                            // Handle select fields that have numeric values
                            if (field.key === 'rls_id') {
                                data[field.key] = data[field.key] && data[field.key] !== 'null' ? parseInt(data[field.key]) : null;
                            }
                            break;
                    }
                }
            });
            
            console.log('Saving data:', data);
            
            // Determine if this is an edit or create operation
            const primaryKeyField = entity.fields.find(f => f.key.endsWith('_id'));
            const recordId = data[primaryKeyField.key];
            const isEdit = recordId && recordId !== '';
            
            // Remove readonly fields and timestamp fields from data being sent to API
            const apiData = {};
            entity.fields.forEach(field => {
                if (!field.readonly && data[field.key] !== undefined && 
                    field.key !== 'created_at' && field.key !== 'updated_at') {
                    apiData[field.key] = data[field.key];
                }
            });
            
            // Make API call
            const url = isEdit 
                ? `${this.api.baseUrl}${this.api.endpoints[this.state.currentEntity]}/${recordId}`
                : `${this.api.baseUrl}${this.api.endpoints[this.state.currentEntity]}`;
            
            const method = isEdit ? 'PUT' : 'POST';
            
            fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(apiData)
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(error => {
                        let errorMessage = error.error || `HTTP ${response.status}: ${response.statusText}`;
                        
                        // Add details if available
                        if (error.details) {
                            errorMessage += '\n\nDetails: ' + error.details;
                        }
                        
                        // Add SQL state if available for debugging
                        if (error.sqlState) {
                            errorMessage += '\n\nSQL State: ' + error.sqlState;
                        }
                        
                        throw new Error(errorMessage);
                    });
                }
                return response.json();
            })
            .then(result => {
                console.log('Save successful:', result);
                this.hideEditModal();
                this.refreshCurrentSection();
                
                // Show success message
                const operation = isEdit ? 'updated' : 'created';
                this.showMessage(`Record ${operation} successfully`, 'success');
            })
            .catch(error => {
                console.error('Save failed:', error);
                this.showMessage(`Failed to save record: ${error.message}`, 'error');
            });
        },

        // Confirm delete
        confirmDelete: function(id) {
            const modal = document.getElementById('confirmModal');
            const message = document.getElementById('confirmMessage');
            const confirmBtn = document.getElementById('confirmAction');
            
            message.textContent = 'Are you sure you want to delete this record? This action cannot be undone.';
            
            // Remove existing event listeners
            const newConfirmBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            
            // Add new event listener
            newConfirmBtn.addEventListener('click', () => {
                this.executeDelete(id);
                this.hideConfirmModal();
            });
            
            modal.style.display = 'flex';
        },

        // Execute delete
        executeDelete: function(id) {
            console.log('Deleting record:', id);
            
            // Make DELETE API call
            const url = `${this.api.baseUrl}${this.api.endpoints[this.state.currentEntity]}/${id}`;
            
            fetch(url, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json'
                }
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(error => {
                        let errorMessage = error.error || `HTTP ${response.status}: ${response.statusText}`;
                        
                        // Show blocking relationships if available
                        if (error.blocking_relationships) {
                            errorMessage += '\n\nBlocking relationships:';
                            Object.keys(error.blocking_relationships).forEach(key => {
                                const count = error.blocking_relationships[key].length;
                                errorMessage += `\n• ${key}: ${count} record(s)`;
                            });
                        }
                        
                        // Add details if available
                        if (error.details) {
                            errorMessage += '\n\nDetails: ' + error.details;
                        }
                        
                        throw new Error(errorMessage);
                    });
                }
                // DELETE typically returns 204 No Content on success
                return response.status === 204 ? null : response.json();
            })
            .then(result => {
                console.log('Delete successful:', result);
                this.refreshCurrentSection();
                
                // Show success message
                this.showMessage('Record deleted successfully', 'success');
            })
            .catch(error => {
                console.error('Delete failed:', error);
                this.showMessage(`Failed to delete record: ${error.message}`, 'error');
            });
        },

        // Hide confirm modal
        hideConfirmModal: function() {
            const modal = document.getElementById('confirmModal');
            modal.style.display = 'none';
        },

        // Show environment details modal
        showEnvironmentDetails: function(envId) {
            const modal = document.getElementById('envDetailsModal');
            const title = document.getElementById('envDetailsTitle');
            const content = document.getElementById('envDetailsContent');
            
            // Show loading state
            content.innerHTML = '<p>Loading environment details...</p>';
            modal.style.display = 'flex';
            
            // Fetch environment details
            const url = `${this.api.baseUrl}${this.api.endpoints.environments}/${envId}`;
            
            fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-Atlassian-Token': 'no-check'
                },
                credentials: 'same-origin'
            })
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(`HTTP ${response.status}: ${text}`);
                    });
                }
                return response.json();
            })
            .then(environment => {
                title.textContent = `Environment: ${environment.env_name} (${environment.env_code})`;
                
                // Build details HTML
                let html = '<div class="env-details">';
                
                // Basic info
                html += '<div class="detail-section">';
                html += '<h4>Basic Information</h4>';
                html += `<p><strong>Code:</strong> ${environment.env_code}</p>`;
                html += `<p><strong>Name:</strong> ${environment.env_name}</p>`;
                html += `<p><strong>Description:</strong> ${environment.env_description || 'N/A'}</p>`;
                html += '</div>';
                
                // Applications
                html += '<div class="detail-section">';
                html += '<h4>Associated Applications</h4>';
                if (environment.applications && environment.applications.length > 0) {
                    html += '<ul>';
                    environment.applications.forEach(app => {
                        html += `<li>${app.app_name} (${app.app_code})</li>`;
                    });
                    html += '</ul>';
                } else {
                    html += '<p>No applications associated</p>';
                }
                html += '</div>';
                
                // Fetch iterations grouped by role
                return fetch(`${this.api.baseUrl}${this.api.endpoints.environments}/${envId}/iterations`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'X-Atlassian-Token': 'no-check'
                    },
                    credentials: 'same-origin'
                })
                    .then(response => {
                        if (!response.ok) {
                            return response.text().then(text => {
                                throw new Error(`HTTP ${response.status}: ${text}`);
                            });
                        }
                        return response.json();
                    })
                    .then(iterationsByRole => {
                        // Iterations by role
                        html += '<div class="detail-section">';
                        html += '<h4>Iterations by Role</h4>';
                        
                        if (Object.keys(iterationsByRole).length > 0) {
                            Object.keys(iterationsByRole).forEach(roleName => {
                                const roleData = iterationsByRole[roleName];
                                html += `<div class="role-group">`;
                                html += `<h5>${roleName} - ${roleData.role_description}</h5>`;
                                html += '<ul>';
                                roleData.iterations.forEach(iteration => {
                                    const statusClass = iteration.ite_status ? iteration.ite_status.toLowerCase() : '';
                                    html += `<li>${iteration.ite_name} (${iteration.ite_type}) <span class="status-badge status-${statusClass}">${iteration.ite_status || 'N/A'}</span></li>`;
                                });
                                html += '</ul>';
                                html += '</div>';
                            });
                        } else {
                            html += '<p>No iterations associated</p>';
                        }
                        html += '</div>';
                        
                        // Add association buttons
                        html += '<div class="detail-section">';
                        html += '<h4>Manage Associations</h4>';
                        html += '<div class="association-buttons">';
                        html += `<button class="btn-primary" onclick="adminGui.showAssociateApplicationModal(${envId})">Associate Application</button>`;
                        html += `<button class="btn-primary" onclick="adminGui.showAssociateIterationModal(${envId})">Associate Iteration</button>`;
                        html += '</div>';
                        html += '</div>';
                        
                        html += '</div>';
                        content.innerHTML = html;
                    });
            })
            .catch(error => {
                console.error('Error loading environment details:', error);
                content.innerHTML = `<p class="error">Failed to load environment details: ${error.message}</p>`;
            });
            
            // Store environment ID for later use
            this.currentEnvironmentId = envId;
            
            // Close button event
            const closeBtn = document.getElementById('closeEnvDetailsBtn');
            const closeX = document.getElementById('closeEnvDetails');
            
            const closeHandler = () => {
                modal.style.display = 'none';
            };
            
            closeBtn.onclick = closeHandler;
            closeX.onclick = closeHandler;
            
            // Close on overlay click
            modal.onclick = (e) => {
                if (e.target === modal) {
                    closeHandler();
                }
            };
        },

        // Show modal to associate application with environment
        showAssociateApplicationModal: function(envId) {
            // Create a simple modal for application association
            const modalHtml = `
                <div id="associateAppModal" class="modal-overlay" style="display: flex;">
                    <div class="modal modal-small">
                        <div class="modal-header">
                            <h3 class="modal-title">Associate Application</h3>
                            <button class="modal-close" onclick="document.getElementById('associateAppModal').remove()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label for="appSelect">Select Application</label>
                                <select id="appSelect" class="form-control">
                                    <option value="">Loading applications...</option>
                                </select>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-secondary" onclick="document.getElementById('associateAppModal').remove()">Cancel</button>
                            <button class="btn-primary" onclick="adminGui.associateApplication(${envId})">Associate</button>
                        </div>
                    </div>
                </div>
            `;
            
            // Add modal to page
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Load applications
            fetch(`${this.api.baseUrl}${this.api.endpoints.applications}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-Atlassian-Token': 'no-check'
                },
                credentials: 'same-origin'
            })
            .then(response => response.json())
            .then(applications => {
                const select = document.getElementById('appSelect');
                select.innerHTML = '<option value="">-- Select an application --</option>';
                applications.forEach(app => {
                    select.innerHTML += `<option value="${app.app_id}">${app.app_name} (${app.app_code})</option>`;
                });
            })
            .catch(error => {
                console.error('Error loading applications:', error);
                document.getElementById('appSelect').innerHTML = '<option value="">Error loading applications</option>';
            });
        },

        // Show modal to associate iteration with environment
        showAssociateIterationModal: function(envId) {
            // Create a modal for iteration association with role selection
            const modalHtml = `
                <div id="associateIterModal" class="modal-overlay" style="display: flex;">
                    <div class="modal">
                        <div class="modal-header">
                            <h3 class="modal-title">Associate Iteration</h3>
                            <button class="modal-close" onclick="document.getElementById('associateIterModal').remove()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label for="iterSelect">Select Iteration</label>
                                <select id="iterSelect" class="form-control">
                                    <option value="">Loading iterations...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="roleSelect">Select Environment Role</label>
                                <select id="roleSelect" class="form-control">
                                    <option value="">Loading roles...</option>
                                </select>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-secondary" onclick="document.getElementById('associateIterModal').remove()">Cancel</button>
                            <button class="btn-primary" onclick="adminGui.associateIteration(${envId})">Associate</button>
                        </div>
                    </div>
                </div>
            `;
            
            // Add modal to page
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Load iterations
            fetch(`${this.api.baseUrl}${this.api.endpoints.iterations}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-Atlassian-Token': 'no-check'
                },
                credentials: 'same-origin'
            })
            .then(response => response.json())
            .then(iterations => {
                const select = document.getElementById('iterSelect');
                select.innerHTML = '<option value="">-- Select an iteration --</option>';
                iterations.forEach(iter => {
                    select.innerHTML += `<option value="${iter.ite_id}">${iter.ite_name} (${iter.itt_code})</option>`;
                });
            })
            .catch(error => {
                console.error('Error loading iterations:', error);
                document.getElementById('iterSelect').innerHTML = '<option value="">Error loading iterations</option>';
            });
            
            // Load environment roles
            fetch(`${this.api.baseUrl}${this.api.endpoints.environments}/roles`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-Atlassian-Token': 'no-check'
                },
                credentials: 'same-origin'
            })
            .then(response => response.json())
            .then(roles => {
                const select = document.getElementById('roleSelect');
                select.innerHTML = '<option value="">-- Select a role --</option>';
                roles.forEach(role => {
                    select.innerHTML += `<option value="${role.enr_id}">${role.enr_name} - ${role.enr_description}</option>`;
                });
            })
            .catch(error => {
                console.error('Error loading roles:', error);
                document.getElementById('roleSelect').innerHTML = '<option value="">Error loading roles</option>';
            });
        },

        // Associate application with environment
        associateApplication: function(envId) {
            const appId = document.getElementById('appSelect').value;
            if (!appId) {
                alert('Please select an application');
                return;
            }
            
            fetch(`${this.api.baseUrl}${this.api.endpoints.environments}/${envId}/applications/${appId}`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'X-Atlassian-Token': 'no-check'
                },
                credentials: 'same-origin'
            })
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(`HTTP ${response.status}: ${text}`);
                    });
                }
                return response.json();
            })
            .then(result => {
                // Remove modal
                document.getElementById('associateAppModal').remove();
                // Refresh environment details if visible
                const envDetailsModal = document.getElementById('envDetailsModal');
                if (envDetailsModal.style.display === 'flex') {
                    this.showEnvironmentDetails(envId);
                }
                // Refresh edit form if visible
                const editModal = document.getElementById('editModal');
                if (editModal.style.display === 'flex') {
                    this.renderEditForm(envId);
                }
                this.showNotification('Application associated successfully', 'success');
            })
            .catch(error => {
                console.error('Error associating application:', error);
                alert(`Failed to associate application: ${error.message}`);
            });
        },

        // Associate iteration with environment
        associateIteration: function(envId) {
            const iterationId = document.getElementById('iterSelect').value;
            const roleId = document.getElementById('roleSelect').value;
            
            if (!iterationId || !roleId) {
                alert('Please select both an iteration and a role');
                return;
            }
            
            fetch(`${this.api.baseUrl}${this.api.endpoints.environments}/${envId}/iterations/${iterationId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Atlassian-Token': 'no-check'
                },
                credentials: 'same-origin',
                body: JSON.stringify({ enr_id: parseInt(roleId) })
            })
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(`HTTP ${response.status}: ${text}`);
                    });
                }
                return response.json();
            })
            .then(result => {
                // Remove modal
                document.getElementById('associateIterModal').remove();
                // Refresh environment details if visible
                const envDetailsModal = document.getElementById('envDetailsModal');
                if (envDetailsModal.style.display === 'flex') {
                    this.showEnvironmentDetails(envId);
                }
                // Refresh edit form if visible
                const editModal = document.getElementById('editModal');
                if (editModal.style.display === 'flex') {
                    this.renderEditForm(envId);
                }
                this.showNotification('Iteration associated successfully', 'success');
            })
            .catch(error => {
                console.error('Error associating iteration:', error);
                alert(`Failed to associate iteration: ${error.message}`);
            });
        },

        // Handle delete button in edit modal
        handleDelete: function() {
            // Get the record ID from the form or current context
            const formFields = document.getElementById('formFields');
            const idField = formFields.querySelector('input[readonly]');
            const id = idField ? idField.value : null;
            
            if (id) {
                this.hideEditModal();
                this.confirmDelete(id);
            }
        },

        // Show loading state
        showLoading: function() {
            this.state.loading = true;
            document.getElementById('loadingState').style.display = 'flex';
            document.getElementById('mainContent').style.display = 'none';
            document.getElementById('errorState').style.display = 'none';
        },

        // Hide loading state
        hideLoading: function() {
            this.state.loading = false;
            document.getElementById('loadingState').style.display = 'none';
            document.getElementById('mainContent').style.display = 'block';
            document.getElementById('errorState').style.display = 'none';
        },

        // Show error state
        showError: function(message) {
            document.getElementById('errorMessage').textContent = message;
            document.getElementById('loadingState').style.display = 'none';
            document.getElementById('mainContent').style.display = 'none';
            document.getElementById('errorState').style.display = 'flex';
        },

        // Refresh current section
        refreshCurrentSection: function() {
            this.state.selectedRows.clear();
            this.loadCurrentSection();
        },

        // Handle logout
        handleLogout: function() {
            this.state.isAuthenticated = false;
            this.state.currentUser = null;
            
            document.getElementById('adminDashboard').style.display = 'none';
            document.getElementById('loginPage').style.display = 'flex';
            document.getElementById('userCode').value = '';
            document.getElementById('userCode').focus();
        },

        // Show message (success/error)
        showMessage: function(message, type = 'info') {
            // Create a toast notification
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.textContent = message;
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'success' ? '#38a169' : type === 'error' ? '#e53e3e' : '#3182ce'};
                color: white;
                padding: 12px 20px;
                border-radius: 6px;
                z-index: 9999;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            
            document.body.appendChild(toast);
            
            // Animate in
            setTimeout(() => toast.style.opacity = '1', 100);
            
            // Remove after 3 seconds
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => document.body.removeChild(toast), 300);
            }, 3000);
        },

        // Render filter controls
        renderFilterControls: function() {
            const entity = this.entities[this.state.currentEntity];
            const filterControlsDiv = document.querySelector('.filter-controls');
            
            if (!entity || !entity.filters || entity.filters.length === 0) {
                // No filters for this entity, hide filter controls or show default buttons
                filterControlsDiv.innerHTML = `
                    <button class="btn-filter" id="filterBtn">Filter</button>
                    <button class="btn-export" id="exportBtn">Export</button>
                    <button class="btn-bulk" id="bulkActionsBtn" disabled>Bulk Actions</button>
                `;
                return;
            }
            
            // Render filter controls for entities that have filters configured
            let filtersHtml = '';
            
            entity.filters.forEach(filter => {
                if (filter.type === 'select') {
                    filtersHtml += `
                        <div class="filter-group">
                            <label for="${filter.key}Select">${filter.label}:</label>
                            <select id="${filter.key}Select" class="filter-select" data-filter="${filter.key}">
                                <option value="">${filter.placeholder || 'All'}</option>
                                <!-- Options will be populated dynamically -->
                            </select>
                        </div>
                    `;
                }
            });
            
            filterControlsDiv.innerHTML = `
                ${filtersHtml}
                <button class="btn-export" id="exportBtn">Export</button>
                <button class="btn-bulk" id="bulkActionsBtn" disabled>Bulk Actions</button>
            `;
            
            // Load filter data and bind events
            this.loadFilterData(entity);
            this.bindFilterEvents();
        },

        // Load data for filters (e.g., teams for team selector)
        loadFilterData: function(entity) {
            entity.filters.forEach(filter => {
                if (filter.type === 'select' && filter.endpoint) {
                    const selectElement = document.getElementById(`${filter.key}Select`);
                    if (!selectElement) return;
                    
                    // Load data from the endpoint
                    fetch(`${this.api.baseUrl}${filter.endpoint}`, {
                        method: 'GET',
                        credentials: 'same-origin',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        // Handle both array and paginated responses
                        const items = Array.isArray(data) ? data : (data.content || []);
                        
                        // Clear existing options except the first one (placeholder)
                        const firstOption = selectElement.firstElementChild;
                        selectElement.innerHTML = '';
                        selectElement.appendChild(firstOption);
                        
                        // Add options
                        items.forEach(item => {
                            const option = document.createElement('option');
                            option.value = item[filter.valueField];
                            option.textContent = item[filter.textField];
                            selectElement.appendChild(option);
                        });
                        
                        // Set current value if any
                        if (filter.key === 'teamId' && this.state.teamFilter) {
                            selectElement.value = this.state.teamFilter;
                        }
                    })
                    .catch(error => {
                        console.error(`Error loading ${filter.label} data:`, error);
                    });
                }
            });
        },

        // Bind filter events
        bindFilterEvents: function() {
            // Bind events for all filter selects
            const filterSelects = document.querySelectorAll('.filter-select');
            filterSelects.forEach(select => {
                select.addEventListener('change', (e) => {
                    const filterKey = e.target.getAttribute('data-filter');
                    const filterValue = e.target.value;
                    
                    // Update state based on filter key
                    if (filterKey === 'teamId') {
                        this.state.teamFilter = filterValue || null;
                    }
                    // Add more filter types here as needed
                    
                    this.state.currentPage = 1; // Reset to first page when filtering
                    this.loadCurrentSection();
                });
            });
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.adminGui.init();
        });
    } else {
        window.adminGui.init();
    }

})();