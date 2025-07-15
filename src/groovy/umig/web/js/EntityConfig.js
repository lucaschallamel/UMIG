/**
 * Entity Configuration Module
 * 
 * Defines entity configurations including fields, table columns, sort mappings,
 * filters, and permissions for all admin GUI entities.
 */

(function() {
    'use strict';

    // Entity configurations
    const ENTITY_CONFIG = {
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
            sortMapping: {
                'env_id': 'env_id',
                'env_code': 'env_code',
                'env_name': 'env_name',
                'env_description': 'env_description',
                'application_count': 'application_count',
                'iteration_count': 'iteration_count'
            },
            filters: [],
            permissions: ['superadmin']
        },
        
        applications: {
            name: 'Applications',
            description: 'Manage applications and their associations with environments and teams',
            fields: [
                { key: 'app_id', label: 'ID', type: 'number', readonly: true },
                { key: 'app_code', label: 'Application Code', type: 'text', required: true, maxLength: 50 },
                { key: 'app_name', label: 'Application Name', type: 'text', required: true, maxLength: 64 },
                { key: 'app_description', label: 'Description', type: 'textarea' },
                { key: 'environment_count', label: 'Environments', type: 'number', readonly: true, computed: true },
                { key: 'team_count', label: 'Teams', type: 'number', readonly: true, computed: true },
                { key: 'label_count', label: 'Labels', type: 'number', readonly: true, computed: true }
            ],
            tableColumns: ['app_id', 'app_code', 'app_name', 'app_description', 'environment_count', 'team_count', 'label_count'],
            sortMapping: {
                'app_id': 'app_id',
                'app_code': 'app_code',
                'app_name': 'app_name',
                'app_description': 'app_description',
                'environment_count': 'environment_count',
                'team_count': 'team_count',
                'label_count': 'label_count'
            },
            filters: [],
            permissions: ['superadmin']
        }
    };

    // API endpoints configuration
    const API_CONFIG = {
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
    };

    // Entity configuration utility functions
    const EntityConfig = {
        /**
         * Get entity configuration by name
         * @param {string} entityName - The name of the entity
         * @returns {Object} Entity configuration
         */
        getEntity: function(entityName) {
            return ENTITY_CONFIG[entityName];
        },

        /**
         * Get all entity configurations
         * @returns {Object} All entity configurations
         */
        getAllEntities: function() {
            return ENTITY_CONFIG;
        },

        /**
         * Get API configuration
         * @returns {Object} API configuration
         */
        getApiConfig: function() {
            return API_CONFIG;
        },

        /**
         * Get entity field by key
         * @param {string} entityName - The name of the entity
         * @param {string} fieldKey - The field key
         * @returns {Object} Field configuration
         */
        getEntityField: function(entityName, fieldKey) {
            const entity = this.getEntity(entityName);
            return entity ? entity.fields.find(field => field.key === fieldKey) : null;
        },

        /**
         * Get entity table columns
         * @param {string} entityName - The name of the entity
         * @returns {Array} Table column names
         */
        getEntityTableColumns: function(entityName) {
            const entity = this.getEntity(entityName);
            return entity ? entity.tableColumns : [];
        },

        /**
         * Get entity sort mapping
         * @param {string} entityName - The name of the entity
         * @returns {Object} Sort mapping
         */
        getEntitySortMapping: function(entityName) {
            const entity = this.getEntity(entityName);
            return entity ? entity.sortMapping : {};
        },

        /**
         * Check if user has permission for entity
         * @param {string} entityName - The name of the entity
         * @param {string} userRole - The user's role
         * @returns {boolean} Whether user has permission
         */
        hasPermission: function(entityName, userRole) {
            const entity = this.getEntity(entityName);
            if (!entity || !entity.permissions) return true;
            return entity.permissions.includes(userRole);
        },

        /**
         * Get entity filters
         * @param {string} entityName - The name of the entity
         * @returns {Array} Filter configurations
         */
        getEntityFilters: function(entityName) {
            const entity = this.getEntity(entityName);
            return entity ? entity.filters || [] : [];
        }
    };

    // Export to global namespace
    window.EntityConfig = EntityConfig;

})();