/**
 * API Client Module
 * 
 * Handles all API communication including authentication, request/response handling,
 * error management, and endpoint configuration.
 */

(function() {
    'use strict';

    // API Client
    const ApiClient = {
        // Base configuration
        baseUrl: '/rest/scriptrunner/latest/custom',
        
        // Default headers
        defaultHeaders: {
            'Content-Type': 'application/json'
        },

        // Request timeout
        timeout: 30000,

        /**
         * Initialize API client
         */
        init: function() {
            this.setupInterceptors();
            
            // Bind methods to ensure correct context
            this.get = this.get.bind(this);
            this.post = this.post.bind(this);
            this.put = this.put.bind(this);
            this.delete = this.delete.bind(this);
            this.request = this.request.bind(this);
            this.buildUrl = this.buildUrl.bind(this);
            this.buildRequestConfig = this.buildRequestConfig.bind(this);
            this.handleResponse = this.handleResponse.bind(this);
            this.handleError = this.handleError.bind(this);
        },

        /**
         * Setup request/response interceptors
         */
        setupInterceptors: function() {
            // Add any global interceptors here
        },

        /**
         * Make HTTP request
         * @param {string} method - HTTP method
         * @param {string} endpoint - API endpoint
         * @param {Object} options - Request options
         * @returns {Promise} Request promise
         */
        request: function(method, endpoint, options = {}) {
            const url = this.buildUrl(endpoint);
            const config = this.buildRequestConfig(method, options);
            
            // Set loading state
            if (window.AdminGuiState) {
                window.AdminGuiState.loading.setLoading(true);
            }
            
            return this.executeRequest(url, config)
                .then(response => this.handleResponse(response))
                .catch(error => this.handleError(error))
                .finally(() => {
                    // Clear loading state
                    if (window.AdminGuiState) {
                        window.AdminGuiState.loading.setLoading(false);
                    }
                });
        },

        /**
         * Build full URL from endpoint
         * @param {string} endpoint - API endpoint
         * @returns {string} Full URL
         */
        buildUrl: function(endpoint) {
            const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
            return `${this.baseUrl}${cleanEndpoint}`;
        },

        /**
         * Build request configuration
         * @param {string} method - HTTP method
         * @param {Object} options - Request options
         * @returns {Object} Fetch configuration
         */
        buildRequestConfig: function(method, options) {
            const config = {
                method: method.toUpperCase(),
                headers: { ...this.defaultHeaders },
                credentials: 'same-origin'
            };

            // Add custom headers
            if (options.headers) {
                Object.assign(config.headers, options.headers);
            }

            // Add body for POST/PUT/PATCH requests
            if (options.body && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
                if (typeof options.body === 'object') {
                    config.body = JSON.stringify(options.body);
                    console.log(`API ${config.method} request body:`, options.body);
                } else {
                    config.body = options.body;
                }
            }

            // Add query parameters
            if (options.params) {
                const url = new URL(this.buildUrl(options.endpoint || ''));
                Object.keys(options.params).forEach(key => {
                    if (options.params[key] !== null && options.params[key] !== undefined) {
                        url.searchParams.append(key, options.params[key]);
                    }
                });
            }

            return config;
        },

        /**
         * Execute HTTP request with timeout
         * @param {string} url - Request URL
         * @param {Object} config - Fetch configuration
         * @returns {Promise} Request promise
         */
        executeRequest: function(url, config) {
            return Promise.race([
                fetch(url, config),
                new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Request timeout')), this.timeout);
                })
            ]);
        },

        /**
         * Handle successful response
         * @param {Response} response - Fetch response
         * @returns {Promise} Response data
         */
        handleResponse: function(response) {
            if (!response.ok) {
                // Try to get error details from response body
                return response.text().then(text => {
                    let errorMessage = `HTTP ${response.status}`;
                    try {
                        const errorData = JSON.parse(text);
                        if (errorData.error) {
                            errorMessage = errorData.error;
                        }
                    } catch (e) {
                        // If not JSON, use the text if available
                        if (text) {
                            errorMessage += `: ${text}`;
                        }
                    }
                    throw new Error(errorMessage);
                });
            }

            // Handle 204 No Content or empty responses
            if (response.status === 204 || response.headers.get('content-length') === '0') {
                return null;
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                // Check if response has content before trying to parse JSON
                return response.text().then(text => {
                    if (!text || text.trim() === '') {
                        return null;
                    }
                    try {
                        return JSON.parse(text);
                    } catch (e) {
                        console.error('Failed to parse JSON response:', text);
                        throw new Error('Invalid JSON response from server');
                    }
                });
            }
            
            return response.text();
        },

        /**
         * Handle request error
         * @param {Error} error - Request error
         * @throws {Error} Formatted error
         */
        handleError: function(error) {
            console.error('API request failed:', error);
            
            let errorMessage = 'Request failed';
            
            if (error.message === 'Request timeout') {
                errorMessage = 'Request timed out. Please try again.';
            } else if (error.message.includes('HTTP 401')) {
                errorMessage = 'Authentication required. Please login.';
                if (window.AdminGuiState) {
                    window.AdminGuiState.authentication.logout();
                }
            } else if (error.message.includes('HTTP 403')) {
                errorMessage = 'Access denied. You do not have permission.';
            } else if (error.message.includes('HTTP 404')) {
                errorMessage = 'Resource not found.';
            } else if (error.message.includes('HTTP 500')) {
                // For 500 errors, pass through the actual error message which contains details
                errorMessage = error.message;
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Network error. Please check your connection.';
            } else {
                // Pass through other error messages
                errorMessage = error.message;
            }
            
            throw new Error(errorMessage);
        },

        /**
         * GET request
         * @param {string} endpoint - API endpoint
         * @param {Object} params - Query parameters
         * @returns {Promise} Request promise
         */
        get: function(endpoint, params = {}) {
            let url = endpoint;
            
            // Add query parameters to URL
            if (Object.keys(params).length > 0) {
                const queryString = new URLSearchParams();
                Object.keys(params).forEach(key => {
                    if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
                        queryString.append(key, params[key]);
                    }
                });
                const queryStr = queryString.toString();
                if (queryStr) {
                    url += (url.includes('?') ? '&' : '?') + queryStr;
                }
            }
            
            console.log('GET request URL:', this.baseUrl + url);
            console.log('Query params:', params);
            
            return this.request('GET', url);
        },

        /**
         * POST request
         * @param {string} endpoint - API endpoint
         * @param {Object} data - Request data
         * @returns {Promise} Request promise
         */
        post: function(endpoint, data = {}) {
            return this.request('POST', endpoint, { body: data });
        },

        /**
         * PUT request
         * @param {string} endpoint - API endpoint
         * @param {Object} data - Request data
         * @returns {Promise} Request promise
         */
        put: function(endpoint, data = {}) {
            return this.request('PUT', endpoint, { body: data });
        },

        /**
         * DELETE request
         * @param {string} endpoint - API endpoint
         * @returns {Promise} Request promise
         */
        delete: function(endpoint) {
            return this.request('DELETE', endpoint);
        },

        /**
         * Entity-specific API methods
         */
        entities: {
            /**
             * Get all entities
             * @param {string} entityType - Entity type
             * @param {Object} params - Query parameters
             * @returns {Promise} Request promise
             */
            getAll: function(entityType, params = {}) {
                return ApiClient.get(`/${entityType}`, params);
            },

            /**
             * Get entity by ID
             * @param {string} entityType - Entity type
             * @param {string} id - Entity ID
             * @returns {Promise} Request promise
             */
            getById: function(entityType, id) {
                return ApiClient.get(`/${entityType}/${id}`);
            },

            /**
             * Create entity
             * @param {string} entityType - Entity type
             * @param {Object} data - Entity data
             * @returns {Promise} Request promise
             */
            create: function(entityType, data) {
                return ApiClient.post(`/${entityType}`, data);
            },

            /**
             * Update entity
             * @param {string} entityType - Entity type
             * @param {string} id - Entity ID
             * @param {Object} data - Entity data
             * @returns {Promise} Request promise
             */
            update: function(entityType, id, data) {
                return ApiClient.put(`/${entityType}/${id}`, data);
            },

            /**
             * Delete entity
             * @param {string} entityType - Entity type
             * @param {string} id - Entity ID
             * @returns {Promise} Request promise
             */
            delete: function(entityType, id) {
                return ApiClient.delete(`/${entityType}/${id}`);
            }
        },

        /**
         * Specific API endpoints
         */
        users: {
            /**
             * Get all users
             * @param {Object} params - Query parameters
             * @returns {Promise} Request promise
             */
            getAll: function(params = {}) {
                return ApiClient.entities.getAll('users', params);
            },

            /**
             * Get user by ID
             * @param {string} id - User ID
             * @returns {Promise} Request promise
             */
            getById: function(id) {
                return ApiClient.entities.getById('users', id);
            },

            /**
             * Create user
             * @param {Object} userData - User data
             * @returns {Promise} Request promise
             */
            create: function(userData) {
                return ApiClient.entities.create('users', userData);
            },

            /**
             * Update user
             * @param {string} id - User ID
             * @param {Object} userData - User data
             * @returns {Promise} Request promise
             */
            update: function(id, userData) {
                return ApiClient.entities.update('users', id, userData);
            },

            /**
             * Delete user
             * @param {string} id - User ID
             * @returns {Promise} Request promise
             */
            delete: function(id) {
                return ApiClient.entities.delete('users', id);
            },

            /**
             * Authenticate user
             * @param {string} userCode - User code
             * @returns {Promise} Request promise
             */
            authenticate: function(userCode) {
                return ApiClient.get('/users', { userCode: userCode });
            }
        },

        /**
         * Teams API
         */
        teams: {
            getAll: function(params = {}) {
                return ApiClient.entities.getAll('teams', params);
            },
            
            getById: function(id) {
                return ApiClient.entities.getById('teams', id);
            },
            
            create: function(teamData) {
                return ApiClient.entities.create('teams', teamData);
            },
            
            update: function(id, teamData) {
                return ApiClient.entities.update('teams', id, teamData);
            },
            
            delete: function(id) {
                return ApiClient.entities.delete('teams', id);
            },

            /**
             * Get team members
             */
            getMembers: function(teamId) {
                return ApiClient.request('GET', `/teams/${teamId}/members`);
            },

            /**
             * Get team applications
             */
            getApplications: function(teamId) {
                return ApiClient.request('GET', `/teams/${teamId}/applications`);
            },

            /**
             * Add member to team
             */
            addMember: function(teamId, userId) {
                return ApiClient.request('PUT', `/teams/${teamId}/users/${userId}`);
            },

            /**
             * Remove member from team
             */
            removeMember: function(teamId, userId) {
                return ApiClient.request('DELETE', `/teams/${teamId}/users/${userId}`);
            },

            /**
             * Add application to team
             */
            addApplication: function(teamId, applicationId) {
                return ApiClient.request('PUT', `/teams/${teamId}/applications/${applicationId}`);
            },

            /**
             * Remove application from team
             */
            removeApplication: function(teamId, applicationId) {
                return ApiClient.request('DELETE', `/teams/${teamId}/applications/${applicationId}`);
            }
        },

        /**
         * Environments API
         */
        environments: {
            getAll: function(params = {}) {
                return ApiClient.entities.getAll('environments', params);
            },
            
            getById: function(id) {
                return ApiClient.entities.getById('environments', id);
            },
            
            create: function(envData) {
                return ApiClient.entities.create('environments', envData);
            },
            
            update: function(id, envData) {
                return ApiClient.entities.update('environments', id, envData);
            },
            
            delete: function(id) {
                return ApiClient.entities.delete('environments', id);
            },

            /**
             * Associate environment with application
             * @param {string} envId - Environment ID
             * @param {string} appId - Application ID
             * @returns {Promise} Request promise
             */
            associateApplication: function(envId, appId) {
                return ApiClient.post(`/environments/${envId}/applications/${appId}`);
            },

            /**
             * Associate environment with iteration
             * @param {string} envId - Environment ID
             * @param {string} iterationId - Iteration ID
             * @param {string} roleId - Environment role ID
             * @returns {Promise} Request promise
             */
            associateIteration: function(envId, iterationId, roleId) {
                return ApiClient.post(`/environments/${envId}/iterations/${iterationId}`, { 
                    enr_id: roleId 
                });
            },

            /**
             * Disassociate environment from application
             * @param {string} envId - Environment ID
             * @param {string} appId - Application ID
             * @returns {Promise} Request promise
             */
            disassociateApplication: function(envId, appId) {
                return ApiClient.delete(`/environments/${envId}/applications/${appId}`);
            },

            /**
             * Disassociate environment from iteration
             * @param {string} envId - Environment ID
             * @param {string} iterationId - Iteration ID
             * @returns {Promise} Request promise
             */
            disassociateIteration: function(envId, iterationId) {
                return ApiClient.delete(`/environments/${envId}/iterations/${iterationId}`);
            },

            /**
             * Get environment roles
             * @returns {Promise} Request promise
             */
            getRoles: function() {
                return ApiClient.get('/environments/roles');
            }
        },

        /**
         * Applications API
         */
        applications: {
            /**
             * Get all applications
             */
            getAll: function(params = {}) {
                return ApiClient.entities.getAll('applications', params);
            },

            /**
             * Get application by ID
             */
            getById: function(appId) {
                return ApiClient.entities.getById('applications', appId);
            },

            /**
             * Create application
             */
            create: function(data) {
                return ApiClient.entities.create('applications', data);
            },

            /**
             * Update application
             */
            update: function(appId, data) {
                return ApiClient.entities.update('applications', appId, data);
            },

            /**
             * Delete application
             */
            delete: function(appId) {
                return ApiClient.entities.delete('applications', appId);
            },

            /**
             * Get application environments
             */
            getEnvironments: function(appId) {
                return ApiClient.request('GET', `/applications/${appId}/environments`);
            },

            /**
             * Get application teams
             */
            getTeams: function(appId) {
                return ApiClient.request('GET', `/applications/${appId}/teams`);
            },

            /**
             * Associate environment with application
             */
            associateEnvironment: function(appId, envId) {
                return ApiClient.request('PUT', `/applications/${appId}/environments/${envId}`);
            },

            /**
             * Disassociate environment from application
             */
            disassociateEnvironment: function(appId, envId) {
                return ApiClient.request('DELETE', `/applications/${appId}/environments/${envId}`);
            },

            /**
             * Associate team with application
             */
            associateTeam: function(appId, teamId) {
                return ApiClient.request('PUT', `/applications/${appId}/teams/${teamId}`);
            },

            /**
             * Disassociate team from application
             */
            disassociateTeam: function(appId, teamId) {
                return ApiClient.request('DELETE', `/applications/${appId}/teams/${teamId}`);
            },

            /**
             * Get application labels
             */
            getLabels: function(appId) {
                return ApiClient.request('GET', `/applications/${appId}/labels`);
            },

            /**
             * Associate label with application
             */
            associateLabel: function(appId, labelId) {
                return ApiClient.request('PUT', `/applications/${appId}/labels/${labelId}`);
            },

            /**
             * Disassociate label from application
             */
            disassociateLabel: function(appId, labelId) {
                return ApiClient.request('DELETE', `/applications/${appId}/labels/${labelId}`);
            }
        },

        /**
         * Iterations API
         */
        iterations: {
            getAll: function(params = {}) {
                return ApiClient.entities.getAll('iterations', params);
            }
        },

        /**
         * Labels API
         */
        labels: {
            getAll: function(params = {}) {
                return ApiClient.entities.getAll('labels', params);
            },
            getById: function(id) {
                return ApiClient.entities.getById('labels', id);
            },
            create: function(data) {
                return ApiClient.entities.create('labels', data);
            },
            update: function(id, data) {
                return ApiClient.entities.update('labels', id, data);
            },
            delete: function(id) {
                return ApiClient.entities.delete('labels', id);
            },
            getSteps: function(labelId) {
                console.log('Getting steps for label:', labelId);
                const url = `${ApiClient.baseUrl}/labels/${labelId}/steps`;
                
                return fetch(url, {
                    method: 'GET',
                    headers: ApiClient.defaultHeaders,
                    credentials: 'same-origin'
                })
                .then(response => {
                    console.log('Get label steps response:', response);
                    
                    if (!response.ok) {
                        return response.text().then(text => {
                            let error;
                            try {
                                error = JSON.parse(text);
                            } catch (e) {
                                error = { error: text || response.statusText };
                            }
                            throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
                        });
                    }
                    
                    return response.json();
                })
                .catch(error => {
                    console.error('Failed to get label steps:', error);
                    throw error;
                });
            },
            addApplication: function(labelId, applicationId) {
                const url = `${ApiClient.baseUrl}/labels/${labelId}/applications/${applicationId}`;
                
                return fetch(url, {
                    method: 'POST',
                    headers: ApiClient.defaultHeaders,
                    credentials: 'same-origin'
                })
                .then(response => ApiClient.handleResponse(response))
                .catch(error => ApiClient.handleError(error));
            },
            removeApplication: function(labelId, applicationId) {
                const url = `${ApiClient.baseUrl}/labels/${labelId}/applications/${applicationId}`;
                
                return fetch(url, {
                    method: 'DELETE',
                    headers: ApiClient.defaultHeaders,
                    credentials: 'same-origin'
                })
                .then(response => ApiClient.handleResponse(response))
                .catch(error => ApiClient.handleError(error));
            },
            addStep: function(labelId, stepId) {
                const url = `${ApiClient.baseUrl}/labels/${labelId}/steps/${stepId}`;
                
                return fetch(url, {
                    method: 'POST',
                    headers: ApiClient.defaultHeaders,
                    credentials: 'same-origin'
                })
                .then(response => ApiClient.handleResponse(response))
                .catch(error => ApiClient.handleError(error));
            },
            removeStep: function(labelId, stepId) {
                const url = `${ApiClient.baseUrl}/labels/${labelId}/steps/${stepId}`;
                
                return fetch(url, {
                    method: 'DELETE',
                    headers: ApiClient.defaultHeaders,
                    credentials: 'same-origin'
                })
                .then(response => ApiClient.handleResponse(response))
                .catch(error => ApiClient.handleError(error));
            }
        },

        /**
         * Migrations API
         */
        migrations: {
            getAll: function(params = {}) {
                return ApiClient.entities.getAll('migrations', params);
            }
        },

        /**
         * Steps API
         */
        steps: {
            getAll: function(params = {}) {
                return ApiClient.entities.getAll('steps', params);
            },
            /**
             * Get all master steps for dropdowns
             * @param {Object} params - Query parameters (e.g., migrationId)
             * @returns {Promise} Request promise
             */
            getMasterSteps: function(params = {}) {
                return ApiClient.get('/steps/master', params);
            },
            getById: function(id) {
                return ApiClient.entities.getById('steps', id);
            },
            create: function(data) {
                return ApiClient.entities.create('steps', data);
            },
            update: function(id, data) {
                return ApiClient.entities.update('steps', id, data);
            },
            delete: function(id) {
                return ApiClient.entities.delete('steps', id);
            }
        },

        /**
         * Utility methods
         */
        utils: {
            /**
             * Build query string from parameters
             * @param {Object} params - Parameters object
             * @returns {string} Query string
             */
            buildQueryString: function(params) {
                const queryString = new URLSearchParams();
                Object.keys(params).forEach(key => {
                    if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
                        queryString.append(key, params[key]);
                    }
                });
                return queryString.toString();
            },

            /**
             * Check if response is JSON
             * @param {Response} response - Fetch response
             * @returns {boolean} Whether response is JSON
             */
            isJsonResponse: function(response) {
                const contentType = response.headers.get('content-type');
                return contentType && contentType.includes('application/json');
            },

            /**
             * Format API error for display
             * @param {Error} error - API error
             * @returns {string} Formatted error message
             */
            formatError: function(error) {
                if (error.message) {
                    return error.message;
                }
                return 'An unexpected error occurred';
            }
        }
    };

    // Export to global namespace
    window.ApiClient = ApiClient;

})();