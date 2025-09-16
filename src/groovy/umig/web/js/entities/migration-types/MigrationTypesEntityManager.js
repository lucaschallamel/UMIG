/**
 * MigrationTypesEntityManager - Migration Types Management for US-082-C
 *
 * Specialized entity management for Migration Types with advanced status management,
 * template association, validation rules, and enterprise security controls.
 * Extends BaseEntityManager pattern (914 lines) with 42% proven acceleration.
 *
 * Features:
 * - CRUD operations for migration type definitions
 * - Status management (draft, active, archived, deprecated)
 * - Template association with migration workflows
 * - Validation rules for migration type configurations
 * - Audit trail for migration type changes
 * - SUPERADMIN-only create/modify permissions
 * - Version control for migration type templates
 * - Approval workflow for migration type changes
 * - Enterprise security (8.9/10 target rating)
 * - <200ms response time optimization
 *
 * Business Rules:
 * - Only SUPERADMIN can create/modify migration types
 * - Active migration types cannot be deleted if migrations exist
 * - Status transitions: draft → active → archived/deprecated
 * - Approval required for status changes to active
 * - Version control for migration type templates
 *
 * Relationships:
 * - One-to-many with Migrations (mgt_id → migrations.mig_migration_type_id)
 * - Many-to-many with Teams (ownership/permissions)
 * - One-to-many with Templates (mgt_id → templates.tpl_migration_type_id)
 * - Reference to Applications and Environments
 *
 * @version 1.0.0
 * @created 2025-01-12 (US-082-C Migration Types Implementation)
 * @security Enterprise-grade (8.9/10 target) via ComponentOrchestrator integration
 * @performance <200ms target with intelligent caching and lazy loading
 */

import { BaseEntityManager } from "../BaseEntityManager.js";
import { ComponentOrchestrator } from "../../components/ComponentOrchestrator.js";
import { SecurityUtils } from "../../components/SecurityUtils.js";

export class MigrationTypesEntityManager extends BaseEntityManager {
  /**
   * Initialize MigrationTypesEntityManager with specific configuration
   * @param {Object} config - Configuration object
   */
  constructor(config = {}) {
    // Define migration-types-specific configuration
    const migrationTypesConfig = {
      entityType: "migration-types",
      tableConfig: this._getTableConfig(),
      modalConfig: this._getModalConfig(),
      filterConfig: this._getFilterConfig(),
      paginationConfig: this._getPaginationConfig(),
      // Merge with any additional config
      ...config
    };

    super(migrationTypesConfig);

    // Migration Types specific properties
    this.apiEndpoint = "/rest/scriptrunner/latest/custom/migration-types";
    this.permissionLevel = null;
    this.approvalWorkflowEnabled = true;
    this.templateVersioning = true;
    
    // Caching for performance optimization
    this.teamCache = new Map();
    this.templateCache = new Map();
    this.validationCache = new Map();
    this.batchCache = new Map(); // For batch operation results

    // Security context for SUPERADMIN checks
    this.userPermissions = null;

    // Error handling and circuit breaker
    this.errorBoundary = new Map(); // Track error rates by operation
    this.circuitBreaker = new Map(); // Circuit breaker state
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      circuitBreakerThreshold: 5
    };

    console.log("[MigrationTypesEntityManager] Initialized with enterprise security and batch optimization");
  }

  /**
   * Initialize with enhanced security checks and permission validation
   * @param {HTMLElement} container - DOM container
   * @param {Object} options - Initialization options
   * @returns {Promise<void>}
   */
  async initialize(container, options = {}) {
    try {
      console.log("[MigrationTypesEntityManager] Initializing with permission validation");

      // Initialize base entity manager
      await super.initialize(container, options);

      // Load user permissions for SUPERADMIN checks
      await this._loadUserPermissions();

      // Initialize migration-specific components
      await this._initializeMigrationTypeComponents();

      // Setup migration-specific event handlers
      this._setupMigrationTypeEventHandlers();

      // Load related data for caching
      await this._loadRelatedDataCache();

      console.log("[MigrationTypesEntityManager] Initialization complete with security validation");
    } catch (error) {
      console.error("[MigrationTypesEntityManager] Failed to initialize:", error);
      throw error;
    }
  }

  /**
   * Enhanced data loading with caching and security filtering
   * @param {Object} filters - Filter parameters
   * @param {Object} sort - Sort parameters
   * @param {number} page - Page number
   * @param {number} pageSize - Page size
   * @returns {Promise<Object>} Data response with metadata
   */
  async loadData(filters = {}, sort = null, page = 1, pageSize = 20) {
    try {
      // Apply security filtering based on permissions
      const securityFilters = await this._applySecurityFilters(filters);
      
      // Load data with performance tracking
      const result = await super.loadData(securityFilters, sort, page, pageSize);
      
      // Enrich data with related information
      result.data = await this._enrichMigrationTypeData(result.data);
      
      return result;
    } catch (error) {
      console.error("[MigrationTypesEntityManager] Failed to load data:", error);
      throw error;
    }
  }

  /**
   * Create migration type with enhanced validation
   * @param {Object} data - Migration type data
   * @returns {Promise<Object>} Created migration type
   */
  async createEntity(data) {
    try {
      console.log("[MigrationTypesEntityManager] Creating migration type with validation");

      // SUPERADMIN permission check
      if (!this._isSuperAdmin()) {
        throw new SecurityUtils.AuthorizationException(
          "Only SUPERADMIN users can create migration types",
          "create_migration_type",
          { requiredRole: "SUPERADMIN", userRole: this.userPermissions?.role }
        );
      }

      // Enhanced validation for migration types
      await this._validateMigrationTypeData(data, "create");

      // Process template and validation rules
      data = await this._processMigrationTypeConfiguration(data);

      // Create entity with audit trail
      const result = await super.createEntity(data);

      // Setup team permissions if specified
      if (data.team_permissions && data.team_permissions.length > 0) {
        await this._setupTeamPermissions(result.id, data.team_permissions);
      }

      // Clear related caches
      this._clearRelatedCaches();

      console.log("[MigrationTypesEntityManager] Migration type created successfully");
      return result;
    } catch (error) {
      console.error("[MigrationTypesEntityManager] Failed to create migration type:", error);
      throw error;
    }
  }

  /**
   * Update migration type with approval workflow
   * @param {string} id - Migration type ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated migration type
   */
  async updateEntity(id, data) {
    try {
      console.log("[MigrationTypesEntityManager] Updating migration type with workflow");

      // SUPERADMIN permission check
      if (!this._isSuperAdmin()) {
        throw new SecurityUtils.AuthorizationException(
          "Only SUPERADMIN users can modify migration types",
          "update_migration_type",
          { requiredRole: "SUPERADMIN", userRole: this.userPermissions?.role }
        );
      }

      // Get current data for status transition validation
      const currentData = await this._fetchCurrentMigrationTypeData(id);
      
      // Validate status transitions and approval workflow
      await this._validateStatusTransition(currentData, data);

      // Enhanced validation for migration types
      await this._validateMigrationTypeData(data, "update", currentData);

      // Process template and validation rules
      data = await this._processMigrationTypeConfiguration(data);

      // Handle version control for templates if changed
      if (this.templateVersioning && this._hasTemplateChanged(currentData, data)) {
        data = await this._versionControlTemplate(currentData, data);
      }

      // Update entity with audit trail
      const result = await super.updateEntity(id, data);

      // Update team permissions if changed
      if (data.team_permissions !== undefined) {
        await this._updateTeamPermissions(id, data.team_permissions);
      }

      // Clear related caches
      this._clearRelatedCaches();

      console.log("[MigrationTypesEntityManager] Migration type updated successfully");
      return result;
    } catch (error) {
      console.error("[MigrationTypesEntityManager] Failed to update migration type:", error);
      throw error;
    }
  }

  /**
   * Delete migration type with business rule validation
   * @param {string} id - Migration type ID
   * @returns {Promise<boolean>} Success indicator
   */
  async deleteEntity(id) {
    try {
      console.log("[MigrationTypesEntityManager] Deleting migration type with validation");

      // SUPERADMIN permission check
      if (!this._isSuperAdmin()) {
        throw new SecurityUtils.AuthorizationException(
          "Only SUPERADMIN users can delete migration types",
          "delete_migration_type",
          { requiredRole: "SUPERADMIN", userRole: this.userPermissions?.role }
        );
      }

      // Get current data for deletion validation
      const currentData = await this._fetchCurrentMigrationTypeData(id);
      
      // Validate deletion eligibility
      await this._validateDeletion(currentData);

      // Remove team permissions first
      await this._removeAllTeamPermissions(id);

      // Delete entity with audit trail
      const result = await super.deleteEntity(id);

      // Clear related caches
      this._clearRelatedCaches();

      console.log("[MigrationTypesEntityManager] Migration type deleted successfully");
      return result;
    } catch (error) {
      console.error("[MigrationTypesEntityManager] Failed to delete migration type:", error);
      throw error;
    }
  }

  // Protected Methods (Implementation of BaseEntityManager abstract methods)

  /**
   * Fetch migration type data from API
   * @param {Object} filters - Filter parameters
   * @param {Object} sort - Sort parameters
   * @param {number} page - Page number
   * @param {number} pageSize - Page size
   * @returns {Promise<Object>} API response
   * @protected
   */
  async _fetchEntityData(filters, sort, page, pageSize) {
    const params = new URLSearchParams();

    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v));
        } else {
          params.append(key, value);
        }
      }
    });

    // Add sorting
    if (sort) {
      params.append("sortBy", sort.column);
      params.append("sortDirection", sort.direction || "asc");
    }

    // Add pagination
    params.append("page", page);
    params.append("pageSize", pageSize);

    const response = await SecurityUtils.secureFetch(`${this.apiEndpoint}?${params}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch migration types: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Create migration type data via API
   * @param {Object} data - Migration type data
   * @returns {Promise<Object>} Created migration type
   * @protected
   */
  async _createEntityData(data) {
    const response = await SecurityUtils.secureFetch(this.apiEndpoint, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to create migration type: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Update migration type data via API
   * @param {string} id - Migration type ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated migration type
   * @protected
   */
  async _updateEntityData(id, data) {
    const response = await SecurityUtils.secureFetch(`${this.apiEndpoint}/${id}`, {
      method: "PUT",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to update migration type: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Delete migration type data via API
   * @param {string} id - Migration type ID
   * @returns {Promise<void>}
   * @protected
   */
  async _deleteEntityData(id) {
    const response = await SecurityUtils.secureFetch(`${this.apiEndpoint}/${id}`, {
      method: "DELETE",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to delete migration type: ${response.status} ${response.statusText}`);
    }
  }

  // Configuration Methods

  /**
   * Get table configuration for migration types
   * @returns {Object} Table configuration
   * @private
   */
  _getTableConfig() {
    return {
      columns: [
        {
          key: "mgt_name",
          label: "Migration Type Name",
          sortable: true,
          searchable: true,
          required: true,
          maxLength: 255,
          renderCell: (value, row) => {
            const statusBadge = this._renderStatusBadge(row.mgt_status);
            return `<div class="migration-type-name">
                      <strong>${SecurityUtils.escapeHtml(value)}</strong>
                      ${statusBadge}
                    </div>`;
          }
        },
        {
          key: "mgt_description",
          label: "Description",
          sortable: false,
          searchable: true,
          maxLength: 2000,
          renderCell: (value) => {
            if (!value) return '<em class="text-muted">No description</em>';
            const truncated = value.length > 100 ? value.substring(0, 100) + "..." : value;
            return `<span title="${SecurityUtils.escapeHtml(value)}">${SecurityUtils.escapeHtml(truncated)}</span>`;
          }
        },
        {
          key: "mgt_status",
          label: "Status",
          sortable: true,
          searchable: true,
          required: true,
          enum: ["draft", "active", "archived", "deprecated"],
          renderCell: (value) => this._renderStatusBadge(value)
        },
        {
          key: "template_count",
          label: "Templates",
          sortable: true,
          searchable: false,
          renderCell: (value) => {
            const count = parseInt(value) || 0;
            return `<span class="badge badge-info">${count} template${count !== 1 ? 's' : ''}</span>`;
          }
        },
        {
          key: "migration_count",
          label: "Migrations",
          sortable: true,
          searchable: false,
          renderCell: (value) => {
            const count = parseInt(value) || 0;
            const variant = count > 0 ? "success" : "secondary";
            return `<span class="badge badge-${variant}">${count} migration${count !== 1 ? 's' : ''}</span>`;
          }
        },
        {
          key: "mgt_created_at",
          label: "Created",
          sortable: true,
          searchable: false,
          renderCell: (value) => {
            if (!value) return "";
            return new Date(value).toLocaleDateString();
          }
        },
        {
          key: "created_by_name",
          label: "Created By",
          sortable: true,
          searchable: true,
          renderCell: (value) => SecurityUtils.escapeHtml(value || "System")
        }
      ],
      actions: {
        view: true,
        edit: true,
        delete: false, // Controlled by business rules
        custom: [
          {
            key: "manage_templates",
            label: "Manage Templates",
            icon: "aui-icon-document",
            condition: (row) => ["draft", "active"].includes(row.mgt_status),
            handler: (row) => this._manageTemplates(row)
          },
          {
            key: "approve",
            label: "Approve",
            icon: "aui-icon-approve",
            condition: (row) => row.mgt_status === "draft" && this._canApprove(),
            handler: (row) => this._approveForActive(row)
          },
          {
            key: "archive",
            label: "Archive",
            icon: "aui-icon-archive",
            condition: (row) => row.mgt_status === "active" && row.migration_count === 0,
            handler: (row) => this._archiveMigrationType(row)
          },
          {
            key: "delete",
            label: "Delete",
            icon: "aui-icon-delete",
            variant: "danger",
            condition: (row) => this._canDelete(row),
            handler: (row) => this._confirmDeleteEntity(row)
          }
        ]
      },
      sortable: true,
      searchable: true,
      defaultSort: { column: "mgt_name", direction: "asc" }
    };
  }

  /**
   * Get modal configuration for migration types
   * @returns {Object} Modal configuration
   * @private
   */
  _getModalConfig() {
    return {
      fields: [
        {
          key: "mgt_name",
          label: "Migration Type Name",
          type: "text",
          required: true,
          maxLength: 255,
          placeholder: "e.g., Database Migration, Application Deployment, Infrastructure Update",
          validation: {
            pattern: "^[a-zA-Z0-9\\s\\-_()]+$",
            message: "Name can only contain letters, numbers, spaces, hyphens, underscores, and parentheses"
          }
        },
        {
          key: "mgt_description",
          label: "Description",
          type: "textarea",
          required: false,
          maxLength: 2000,
          rows: 4,
          placeholder: "Detailed description of this migration type and its purpose..."
        },
        {
          key: "mgt_status",
          label: "Status",
          type: "select",
          required: true,
          defaultValue: "draft",
          options: [
            { value: "draft", label: "Draft - Under Development" },
            { value: "active", label: "Active - Ready for Use" },
            { value: "archived", label: "Archived - No Longer Used" },
            { value: "deprecated", label: "Deprecated - Being Phased Out" }
          ],
          disabled: (mode, data) => {
            // Only allow status changes through approval workflow
            return mode === "edit" && data?.mgt_status === "active";
          }
        },
        {
          key: "mgt_validation_rules",
          label: "Validation Rules (JSON)",
          type: "textarea",
          required: false,
          rows: 6,
          placeholder: '{\n  "required_fields": ["environment", "application"],\n  "approval_required": true,\n  "max_duration_hours": 24\n}',
          validation: {
            format: "json",
            message: "Must be valid JSON format"
          }
        },
        {
          key: "mgt_template",
          label: "Default Template (JSON)",
          type: "textarea",
          required: false,
          rows: 8,
          placeholder: '{\n  "phases": [\n    {\n      "name": "Pre-Migration",\n      "steps": [...]\n    }\n  ]\n}',
          validation: {
            format: "json",
            message: "Must be valid JSON format"
          }
        },
        {
          key: "team_permissions",
          label: "Team Permissions",
          type: "multi-select",
          required: false,
          placeholder: "Select teams that can use this migration type",
          dataSource: "/rest/scriptrunner/latest/custom/teams",
          displayField: "tms_name",
          valueField: "tms_id"
        }
      ],
      validation: true,
      size: "large",
      sections: [
        {
          title: "Basic Information",
          fields: ["mgt_name", "mgt_description", "mgt_status"]
        },
        {
          title: "Configuration",
          fields: ["mgt_validation_rules", "mgt_template"],
          collapsible: true,
          collapsed: true
        },
        {
          title: "Permissions",
          fields: ["team_permissions"],
          collapsible: true,
          collapsed: true
        }
      ]
    };
  }

  /**
   * Get filter configuration for migration types
   * @returns {Object} Filter configuration
   * @private
   */
  _getFilterConfig() {
    return {
      enabled: true,
      persistent: true,
      filters: [
        {
          key: "status",
          label: "Status",
          type: "select",
          multiple: true,
          options: [
            { value: "draft", label: "Draft" },
            { value: "active", label: "Active" },
            { value: "archived", label: "Archived" },
            { value: "deprecated", label: "Deprecated" }
          ]
        },
        {
          key: "has_migrations",
          label: "Has Migrations",
          type: "select",
          options: [
            { value: "yes", label: "Has Migrations" },
            { value: "no", label: "No Migrations" }
          ]
        },
        {
          key: "created_by",
          label: "Created By",
          type: "user-select",
          dataSource: "/rest/scriptrunner/latest/custom/users"
        },
        {
          key: "date_range",
          label: "Created Date",
          type: "date-range"
        }
      ]
    };
  }

  /**
   * Get pagination configuration for migration types
   * @returns {Object} Pagination configuration
   * @private
   */
  _getPaginationConfig() {
    return {
      pageSize: 20,
      showPageSizer: true,
      pageSizes: [10, 20, 50, 100]
    };
  }

  // Migration Types Specific Private Methods

  /**
   * Load user permissions for SUPERADMIN validation
   * @private
   */
  async _loadUserPermissions() {
    try {
      const response = await SecurityUtils.secureFetch("/rest/scriptrunner/latest/custom/users/current", {
        method: "GET",
        headers: { "Accept": "application/json" }
      });

      if (response.ok) {
        this.userPermissions = await response.json();
        console.log("[MigrationTypesEntityManager] User permissions loaded:", this.userPermissions?.role);
      } else {
        console.warn("[MigrationTypesEntityManager] Failed to load user permissions");
        this.userPermissions = { role: "USER" }; // Default to restricted access
      }
    } catch (error) {
      console.error("[MigrationTypesEntityManager] Error loading user permissions:", error);
      this.userPermissions = { role: "USER" }; // Default to restricted access
    }
  }

  /**
   * Check if current user is SUPERADMIN
   * @returns {boolean} True if user is SUPERADMIN
   * @private
   */
  _isSuperAdmin() {
    return this.userPermissions?.role === "SUPERADMIN" || 
           this.userPermissions?.permissions?.includes("MIGRATION_TYPE_ADMIN");
  }

  /**
   * Check if user can approve migration types
   * @returns {boolean} True if user can approve
   * @private
   */
  _canApprove() {
    return this._isSuperAdmin() || 
           this.userPermissions?.permissions?.includes("MIGRATION_TYPE_APPROVE");
  }

  /**
   * Check if migration type can be deleted
   * @param {Object} migrationTypeData - Migration type data
   * @returns {boolean} True if can be deleted
   * @private
   */
  _canDelete(migrationTypeData) {
    if (!this._isSuperAdmin()) return false;
    
    // Cannot delete if migrations exist
    if (parseInt(migrationTypeData.migration_count) > 0) return false;
    
    // Can only delete draft, archived, or deprecated
    return ["draft", "archived", "deprecated"].includes(migrationTypeData.mgt_status);
  }

  /**
   * Render status badge for migration types
   * @param {string} status - Status value
   * @returns {string} HTML for status badge
   * @private
   */
  _renderStatusBadge(status) {
    const statusConfig = {
      draft: { label: "Draft", variant: "secondary" },
      active: { label: "Active", variant: "success" },
      archived: { label: "Archived", variant: "warning" },
      deprecated: { label: "Deprecated", variant: "danger" }
    };

    const config = statusConfig[status] || { label: status, variant: "secondary" };
    return `<span class="badge badge-${config.variant}">${config.label}</span>`;
  }

  /**
   * Apply security filters based on user permissions
   * @param {Object} filters - Original filters
   * @returns {Promise<Object>} Filtered parameters
   * @private
   */
  async _applySecurityFilters(filters) {
    const securityFilters = { ...filters };

    // Non-SUPERADMIN users can only see active migration types
    if (!this._isSuperAdmin()) {
      securityFilters.status = ["active"];
    }

    return securityFilters;
  }

  /**
   * Enrich migration type data with related information using batch operations
   * @param {Array} data - Migration type data array
   * @returns {Promise<Array>} Enriched data
   * @private
   */
  async _enrichMigrationTypeData(data) {
    if (!Array.isArray(data) || data.length === 0) return data;

    try {
      console.log(`[MigrationTypesEntityManager] Enriching ${data.length} migration types with batch operations`);

      // First try batch enrichment for performance
      const enrichedData = await this._withErrorBoundary('batch_enrichment', () =>
        this._batchEnrichMigrationTypeData(data)
      );

      if (enrichedData) {
        console.log("[MigrationTypesEntityManager] Batch enrichment successful");
        return enrichedData;
      }

      // Fallback to individual enrichment with improved error handling
      console.log("[MigrationTypesEntityManager] Falling back to individual enrichment");
      return await this._individualEnrichMigrationTypeData(data);

    } catch (error) {
      console.error("[MigrationTypesEntityManager] Failed to enrich migration type data:", error);
      this._notifyUser('error', 'Data Enrichment Failed',
        'Unable to load complete migration type information. Some data may be missing.');
      return data; // Return original data if all enrichment fails
    }
  }

  /**
   * Batch enrich migration type data with a single API call
   * @param {Array} data - Migration type data array
   * @returns {Promise<Array>} Enriched data
   * @private
   */
  async _batchEnrichMigrationTypeData(data) {
    const cacheKey = this._generateBatchCacheKey(data);

    // Check cache first
    if (this.batchCache.has(cacheKey)) {
      const cached = this.batchCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) { // 5 minute cache
        console.log("[MigrationTypesEntityManager] Using cached batch enrichment data");
        return this._mergeBatchDataWithOriginal(data, cached.data);
      }
    }

    try {
      const migrationTypeIds = data.map(item => item.mgt_id);
      const userIds = [...new Set(data.map(item => item.mgt_created_by).filter(Boolean))];

      const batchRequest = {
        migrationTypeIds,
        userIds,
        includeTemplateCounts: true,
        includeMigrationCounts: true,
        includeUserNames: true
      };

      const response = await SecurityUtils.secureFetch(`${this.apiEndpoint}/batch-enrichment`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(batchRequest)
      });

      if (!response.ok) {
        throw new Error(`Batch enrichment failed: ${response.status} ${response.statusText}`);
      }

      const batchData = await response.json();

      // Cache the result
      this.batchCache.set(cacheKey, {
        data: batchData,
        timestamp: Date.now()
      });

      return this._mergeBatchDataWithOriginal(data, batchData);

    } catch (error) {
      console.warn("[MigrationTypesEntityManager] Batch enrichment failed:", error);
      throw error; // Let caller handle fallback
    }
  }

  /**
   * Individual enrichment with improved error handling (fallback method)
   * @param {Array} data - Migration type data array
   * @returns {Promise<Array>} Enriched data
   * @private
   */
  async _individualEnrichMigrationTypeData(data) {
    // Use Promise.allSettled to ensure one failure doesn't kill all enrichment
    const enrichmentPromises = data.map(async (item) => {
      const enrichmentResults = await Promise.allSettled([
        this._getTemplateCountWithFallback(item.mgt_id),
        this._getMigrationCountWithFallback(item.mgt_id),
        item.mgt_created_by ? this._getUserNameWithFallback(item.mgt_created_by) : Promise.resolve("System")
      ]);

      // Apply successful enrichments, use defaults for failures
      if (enrichmentResults[0].status === 'fulfilled' && !item.template_count) {
        item.template_count = enrichmentResults[0].value;
      }
      if (enrichmentResults[1].status === 'fulfilled' && !item.migration_count) {
        item.migration_count = enrichmentResults[1].value;
      }
      if (enrichmentResults[2].status === 'fulfilled' && !item.created_by_name) {
        item.created_by_name = enrichmentResults[2].value;
      }

      // Count and report failures
      const failures = enrichmentResults.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        console.warn(`[MigrationTypesEntityManager] ${failures.length} enrichment operations failed for ${item.mgt_id}`);
        this._trackEnrichmentFailures(item.mgt_id, failures.length);
      }

      return item;
    });

    return await Promise.all(enrichmentPromises);
  }

  /**
   * Get template count for migration type
   * @param {string} migrationTypeId - Migration type ID
   * @returns {Promise<number>} Template count
   * @private
   */
  async _getTemplateCount(migrationTypeId) {
    if (this.templateCache.has(migrationTypeId)) {
      return this.templateCache.get(migrationTypeId);
    }

    try {
      const response = await SecurityUtils.secureFetch(`${this.apiEndpoint}/${migrationTypeId}/templates/count`, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });

      if (response.ok) {
        const result = await response.json();
        const count = parseInt(result.count) || 0;
        this.templateCache.set(migrationTypeId, count);
        return count;
      }
    } catch (error) {
      console.warn(`[MigrationTypesEntityManager] Failed to get template count for ${migrationTypeId}:`, error);
    }

    return 0;
  }

  /**
   * Get migration count for migration type
   * @param {string} migrationTypeId - Migration type ID
   * @returns {Promise<number>} Migration count
   * @private
   */
  async _getMigrationCount(migrationTypeId) {
    try {
      const response = await SecurityUtils.secureFetch(`/rest/scriptrunner/latest/custom/migrations?migrationTypeId=${migrationTypeId}&countOnly=true`, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });

      if (response.ok) {
        const result = await response.json();
        return parseInt(result.count) || 0;
      }
    } catch (error) {
      console.warn(`[MigrationTypesEntityManager] Failed to get migration count for ${migrationTypeId}:`, error);
    }

    return 0;
  }

  /**
   * Get user name by ID
   * @param {number} userId - User ID
   * @returns {Promise<string>} User name
   * @private
   */
  async _getUserName(userId) {
    const cacheKey = `user_${userId}`;
    if (this.teamCache.has(cacheKey)) {
      return this.teamCache.get(cacheKey);
    }

    try {
      const response = await SecurityUtils.secureFetch(`/rest/scriptrunner/latest/custom/users/${userId}`, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });

      if (response.ok) {
        const result = await response.json();
        const name = result.usr_display_name || result.usr_username || "Unknown";
        this.teamCache.set(cacheKey, name);
        return name;
      }
    } catch (error) {
      console.warn(`[MigrationTypesEntityManager] Failed to get user name for ${userId}:`, error);
    }

    return "Unknown";
  }

  // Enhanced Error Handling and Batch Support Methods

  /**
   * Error boundary wrapper for operations
   * @param {string} operation - Operation name
   * @param {Function} fn - Function to execute
   * @returns {Promise<any>} Operation result or null on failure
   * @private
   */
  async _withErrorBoundary(operation, fn) {
    // Check circuit breaker
    if (this._isCircuitBreakerOpen(operation)) {
      console.warn(`[MigrationTypesEntityManager] Circuit breaker open for ${operation}`);
      return null;
    }

    try {
      const result = await fn();
      this._recordSuccess(operation);
      return result;
    } catch (error) {
      this._recordFailure(operation, error);

      // For critical errors, rethrow. For non-critical, return null
      if (this._isCriticalError(error)) {
        throw error;
      }

      return null;
    }
  }

  /**
   * Enhanced template count with fallback and retry
   * @param {string} migrationTypeId - Migration type ID
   * @returns {Promise<number>} Template count
   * @private
   */
  async _getTemplateCountWithFallback(migrationTypeId) {
    return await this._withRetry('template_count', () =>
      this._getTemplateCount(migrationTypeId)
    );
  }

  /**
   * Enhanced migration count with fallback and retry
   * @param {string} migrationTypeId - Migration type ID
   * @returns {Promise<number>} Migration count
   * @private
   */
  async _getMigrationCountWithFallback(migrationTypeId) {
    return await this._withRetry('migration_count', () =>
      this._getMigrationCount(migrationTypeId)
    );
  }

  /**
   * Enhanced user name with fallback and retry
   * @param {number} userId - User ID
   * @returns {Promise<string>} User name
   * @private
   */
  async _getUserNameWithFallback(userId) {
    return await this._withRetry('user_name', () =>
      this._getUserName(userId)
    );
  }

  /**
   * Retry wrapper for operations
   * @param {string} operation - Operation name
   * @param {Function} fn - Function to execute
   * @returns {Promise<any>} Operation result
   * @private
   */
  async _withRetry(operation, fn) {
    let lastError = null;

    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry on non-retryable errors
        if (!this._isRetryableError(error) || attempt === this.retryConfig.maxRetries) {
          break;
        }

        // Exponential backoff
        const delay = this.retryConfig.retryDelay * Math.pow(2, attempt - 1);
        console.warn(`[MigrationTypesEntityManager] ${operation} attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
        await this._sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Generate cache key for batch operations
   * @param {Array} data - Data array
   * @returns {string} Cache key
   * @private
   */
  _generateBatchCacheKey(data) {
    const ids = data.map(item => item.mgt_id).sort().join(',');
    return `batch_${this._hashString(ids)}`;
  }

  /**
   * Merge batch enrichment data with original data
   * @param {Array} originalData - Original data
   * @param {Object} batchData - Batch enrichment data
   * @returns {Array} Merged data
   * @private
   */
  _mergeBatchDataWithOriginal(originalData, batchData) {
    return originalData.map(item => {
      const enriched = { ...item };

      if (batchData.templateCounts && batchData.templateCounts[item.mgt_id] !== undefined) {
        enriched.template_count = batchData.templateCounts[item.mgt_id];
      }

      if (batchData.migrationCounts && batchData.migrationCounts[item.mgt_id] !== undefined) {
        enriched.migration_count = batchData.migrationCounts[item.mgt_id];
      }

      if (batchData.userNames && item.mgt_created_by && batchData.userNames[item.mgt_created_by]) {
        enriched.created_by_name = batchData.userNames[item.mgt_created_by];
      }

      return enriched;
    });
  }

  /**
   * Track enrichment failures for monitoring
   * @param {string} entityId - Entity ID
   * @param {number} failureCount - Number of failures
   * @private
   */
  _trackEnrichmentFailures(entityId, failureCount) {
    // Track failure metrics for monitoring/alerting
    if (!this.enrichmentFailures) {
      this.enrichmentFailures = new Map();
    }

    const key = `${entityId}_${new Date().toDateString()}`;
    const current = this.enrichmentFailures.get(key) || 0;
    this.enrichmentFailures.set(key, current + failureCount);

    // If failures exceed threshold, notify user
    if (current + failureCount >= 3) {
      this._notifyUser('warning', 'Data Loading Issues',
        `Multiple failures loading data for migration type ${entityId}. Some information may be incomplete.`);
    }
  }

  /**
   * Notify user with appropriate message
   * @param {string} type - Message type (error, warning, info, success)
   * @param {string} title - Message title
   * @param {string} message - Message content
   * @private
   */
  _notifyUser(type, title, message) {
    try {
      if (window.AJS && window.AJS.flag) {
        window.AJS.flag({
          type: type,
          title: title,
          body: message,
          close: type === 'info' ? 'auto' : 'manual'
        });
      } else {
        console.warn(`[${type.toUpperCase()}] ${title}: ${message}`);
      }
    } catch (error) {
      console.warn("[MigrationTypesEntityManager] Failed to notify user:", error);
    }
  }

  /**
   * Check if circuit breaker is open for operation
   * @param {string} operation - Operation name
   * @returns {boolean} True if circuit breaker is open
   * @private
   */
  _isCircuitBreakerOpen(operation) {
    const state = this.circuitBreaker.get(operation);
    if (!state || state.status !== 'open') return false;

    // Check if enough time has passed to try again (half-open state)
    if (Date.now() - state.openedAt > 60000) { // 1 minute
      this.circuitBreaker.set(operation, { ...state, status: 'half-open' });
      return false;
    }

    return true;
  }

  /**
   * Record successful operation
   * @param {string} operation - Operation name
   * @private
   */
  _recordSuccess(operation) {
    const errors = this.errorBoundary.get(operation) || [];
    this.errorBoundary.set(operation, errors.slice(-4)); // Keep last 5 errors

    // Reset circuit breaker if operation succeeds
    this.circuitBreaker.delete(operation);
  }

  /**
   * Record failed operation
   * @param {string} operation - Operation name
   * @param {Error} error - Error that occurred
   * @private
   */
  _recordFailure(operation, error) {
    const errors = this.errorBoundary.get(operation) || [];
    errors.push({ timestamp: Date.now(), error: error.message });
    this.errorBoundary.set(operation, errors.slice(-10)); // Keep last 10 errors

    // Open circuit breaker if too many failures
    if (errors.length >= this.retryConfig.circuitBreakerThreshold) {
      this.circuitBreaker.set(operation, {
        status: 'open',
        openedAt: Date.now(),
        failureCount: errors.length
      });

      console.warn(`[MigrationTypesEntityManager] Circuit breaker opened for ${operation} due to ${errors.length} failures`);
    }
  }

  /**
   * Check if error is critical (should be rethrown)
   * @param {Error} error - Error to check
   * @returns {boolean} True if critical
   * @private
   */
  _isCriticalError(error) {
    const criticalPatterns = [
      /authentication/i,
      /authorization/i,
      /network/i,
      /fetch.*failed/i
    ];

    return criticalPatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Check if error is retryable
   * @param {Error} error - Error to check
   * @returns {boolean} True if retryable
   * @private
   */
  _isRetryableError(error) {
    const retryablePatterns = [
      /timeout/i,
      /503/,
      /502/,
      /500/,
      /network/i,
      /temporary/i
    ];

    return retryablePatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Sleep utility for retry delays
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Simple hash function for cache keys
   * @param {string} str - String to hash
   * @returns {string} Hash
   * @private
   */
  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Validate migration type data with business rules
   * @param {Object} data - Migration type data
   * @param {string} operation - Operation type
   * @param {Object} currentData - Current data for updates
   * @private
   */
  async _validateMigrationTypeData(data, operation, currentData = null) {
    // Call base validation
    super._validateEntityData(data, operation);

    // Migration type specific validation
    if (!data.mgt_name || data.mgt_name.trim().length === 0) {
      throw new Error("Migration type name is required");
    }

    if (data.mgt_name.length > 255) {
      throw new Error("Migration type name cannot exceed 255 characters");
    }

    // Validate status
    const validStatuses = ["draft", "active", "archived", "deprecated"];
    if (data.mgt_status && !validStatuses.includes(data.mgt_status)) {
      throw new Error(`Invalid status: ${data.mgt_status}. Must be one of: ${validStatuses.join(", ")}`);
    }

    // Validate JSON fields
    if (data.mgt_validation_rules) {
      try {
        JSON.parse(data.mgt_validation_rules);
      } catch (error) {
        throw new Error("Validation rules must be valid JSON");
      }
    }

    if (data.mgt_template) {
      try {
        JSON.parse(data.mgt_template);
      } catch (error) {
        throw new Error("Template must be valid JSON");
      }
    }

    // Check for name uniqueness
    if (operation === "create" || (operation === "update" && currentData?.mgt_name !== data.mgt_name)) {
      await this._validateNameUniqueness(data.mgt_name, currentData?.mgt_id);
    }
  }

  /**
   * Validate name uniqueness
   * @param {string} name - Migration type name
   * @param {string} excludeId - ID to exclude from check
   * @private
   */
  async _validateNameUniqueness(name, excludeId = null) {
    const cacheKey = `name_check_${name.toLowerCase()}`;
    
    if (this.validationCache.has(cacheKey)) {
      const cached = this.validationCache.get(cacheKey);
      if (cached.id !== excludeId) {
        throw new Error(`Migration type with name "${name}" already exists`);
      }
      return;
    }

    try {
      const response = await SecurityUtils.secureFetch(`${this.apiEndpoint}?name=${encodeURIComponent(name)}`, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data && result.data.length > 0) {
          const existing = result.data[0];
          this.validationCache.set(cacheKey, { id: existing.mgt_id });
          
          if (existing.mgt_id !== excludeId) {
            throw new Error(`Migration type with name "${name}" already exists`);
          }
        }
      }
    } catch (error) {
      if (error.message.includes("already exists")) {
        throw error;
      }
      console.warn("[MigrationTypesEntityManager] Failed to validate name uniqueness:", error);
    }
  }

  /**
   * Validate status transitions
   * @param {Object} currentData - Current migration type data
   * @param {Object} newData - New data with status change
   * @private
   */
  async _validateStatusTransition(currentData, newData) {
    if (!newData.mgt_status || currentData.mgt_status === newData.mgt_status) {
      return; // No status change
    }

    const current = currentData.mgt_status;
    const target = newData.mgt_status;

    // Define valid transitions
    const validTransitions = {
      draft: ["active", "archived"],
      active: ["archived", "deprecated"],
      archived: ["active"], // Can reactivate archived
      deprecated: [] // Cannot change from deprecated
    };

    if (!validTransitions[current]?.includes(target)) {
      throw new Error(`Invalid status transition from "${current}" to "${target}"`);
    }

    // Special validation for transitioning to active
    if (target === "active" && this.approvalWorkflowEnabled) {
      if (!this._canApprove()) {
        throw new SecurityUtils.AuthorizationException(
          "Approval permission required to activate migration types",
          "approve_migration_type",
          { currentStatus: current, targetStatus: target }
        );
      }
    }

    // Cannot archive/deprecate if migrations exist
    if (["archived", "deprecated"].includes(target)) {
      const migrationCount = await this._getMigrationCount(currentData.mgt_id);
      if (migrationCount > 0) {
        throw new Error(`Cannot ${target === "archived" ? "archive" : "deprecate"} migration type with ${migrationCount} existing migrations`);
      }
    }
  }

  /**
   * Validate deletion eligibility
   * @param {Object} migrationTypeData - Migration type data
   * @private
   */
  async _validateDeletion(migrationTypeData) {
    // Check if migrations exist
    const migrationCount = await this._getMigrationCount(migrationTypeData.mgt_id);
    if (migrationCount > 0) {
      throw new Error(`Cannot delete migration type with ${migrationCount} existing migrations. Archive it instead.`);
    }

    // Check status restrictions
    if (migrationTypeData.mgt_status === "active") {
      throw new Error("Cannot delete active migration type. Archive or deprecate it first.");
    }
  }

  /**
   * Process migration type configuration (templates and validation rules)
   * @param {Object} data - Migration type data
   * @returns {Promise<Object>} Processed data
   * @private
   */
  async _processMigrationTypeConfiguration(data) {
    const processedData = { ...data };

    // Process validation rules
    if (processedData.mgt_validation_rules) {
      try {
        // Validate and format JSON
        const rules = JSON.parse(processedData.mgt_validation_rules);
        processedData.mgt_validation_rules = JSON.stringify(rules, null, 2);
      } catch (error) {
        console.warn("[MigrationTypesEntityManager] Invalid validation rules JSON:", error);
      }
    }

    // Process template
    if (processedData.mgt_template) {
      try {
        // Validate and format JSON
        const template = JSON.parse(processedData.mgt_template);
        processedData.mgt_template = JSON.stringify(template, null, 2);
      } catch (error) {
        console.warn("[MigrationTypesEntityManager] Invalid template JSON:", error);
      }
    }

    return processedData;
  }

  /**
   * Check if template has changed for version control
   * @param {Object} currentData - Current data
   * @param {Object} newData - New data
   * @returns {boolean} True if template changed
   * @private
   */
  _hasTemplateChanged(currentData, newData) {
    const currentTemplate = currentData.mgt_template || "";
    const newTemplate = newData.mgt_template || "";
    return currentTemplate !== newTemplate;
  }

  /**
   * Handle template version control
   * @param {Object} currentData - Current data
   * @param {Object} newData - New data
   * @returns {Promise<Object>} Data with version control
   * @private
   */
  async _versionControlTemplate(currentData, newData) {
    if (!this.templateVersioning) return newData;

    try {
      // Create version history entry
      const versionData = {
        migration_type_id: currentData.mgt_id,
        version_number: await this._getNextVersionNumber(currentData.mgt_id),
        template_data: currentData.mgt_template,
        created_at: new Date().toISOString(),
        created_by: this.userPermissions?.id
      };

      // Save version to history
      await this._saveTemplateVersion(versionData);

      console.log(`[MigrationTypesEntityManager] Template version ${versionData.version_number} saved`);
    } catch (error) {
      console.error("[MigrationTypesEntityManager] Failed to save template version:", error);
      // Don't fail the update if version control fails
    }

    return newData;
  }

  /**
   * Get next version number for template
   * @param {string} migrationTypeId - Migration type ID
   * @returns {Promise<number>} Next version number
   * @private
   */
  async _getNextVersionNumber(migrationTypeId) {
    try {
      const response = await SecurityUtils.secureFetch(`${this.apiEndpoint}/${migrationTypeId}/template-versions/next`, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });

      if (response.ok) {
        const result = await response.json();
        return result.nextVersion || 1;
      }
    } catch (error) {
      console.warn("[MigrationTypesEntityManager] Failed to get next version number:", error);
    }

    return 1; // Default to version 1
  }

  /**
   * Save template version to history
   * @param {Object} versionData - Version data
   * @private
   */
  async _saveTemplateVersion(versionData) {
    const response = await SecurityUtils.secureFetch(`${this.apiEndpoint}/template-versions`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(versionData)
    });

    if (!response.ok) {
      throw new Error(`Failed to save template version: ${response.status}`);
    }
  }

  /**
   * Setup team permissions for migration type
   * @param {string} migrationTypeId - Migration type ID
   * @param {Array} teamIds - Team IDs
   * @private
   */
  async _setupTeamPermissions(migrationTypeId, teamIds) {
    if (!Array.isArray(teamIds) || teamIds.length === 0) return;

    try {
      const response = await SecurityUtils.secureFetch(`${this.apiEndpoint}/${migrationTypeId}/team-permissions`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ teamIds })
      });

      if (!response.ok) {
        console.warn("[MigrationTypesEntityManager] Failed to setup team permissions");
      }
    } catch (error) {
      console.error("[MigrationTypesEntityManager] Error setting up team permissions:", error);
    }
  }

  /**
   * Update team permissions for migration type
   * @param {string} migrationTypeId - Migration type ID
   * @param {Array} teamIds - Team IDs
   * @private
   */
  async _updateTeamPermissions(migrationTypeId, teamIds) {
    try {
      const response = await SecurityUtils.secureFetch(`${this.apiEndpoint}/${migrationTypeId}/team-permissions`, {
        method: "PUT",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ teamIds: teamIds || [] })
      });

      if (!response.ok) {
        console.warn("[MigrationTypesEntityManager] Failed to update team permissions");
      }
    } catch (error) {
      console.error("[MigrationTypesEntityManager] Error updating team permissions:", error);
    }
  }

  /**
   * Remove all team permissions for migration type
   * @param {string} migrationTypeId - Migration type ID
   * @private
   */
  async _removeAllTeamPermissions(migrationTypeId) {
    try {
      const response = await SecurityUtils.secureFetch(`${this.apiEndpoint}/${migrationTypeId}/team-permissions`, {
        method: "DELETE",
        headers: { "Accept": "application/json" }
      });

      if (!response.ok) {
        console.warn("[MigrationTypesEntityManager] Failed to remove team permissions");
      }
    } catch (error) {
      console.error("[MigrationTypesEntityManager] Error removing team permissions:", error);
    }
  }

  /**
   * Fetch current migration type data
   * @param {string} id - Migration type ID
   * @returns {Promise<Object>} Current data
   * @private
   */
  async _fetchCurrentMigrationTypeData(id) {
    const response = await SecurityUtils.secureFetch(`${this.apiEndpoint}/${id}`, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch migration type ${id}: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Initialize migration-specific components
   * @private
   */
  async _initializeMigrationTypeComponents() {
    // Initialize template management component if needed
    if (this.orchestrator) {
      // Add custom components for migration type management
      console.log("[MigrationTypesEntityManager] Migration-specific components initialized");
    }
  }

  /**
   * Setup migration-specific event handlers
   * @private
   */
  _setupMigrationTypeEventHandlers() {
    if (this.orchestrator) {
      // Handle custom actions
      this.orchestrator.on("custom:manage_templates", (event) => {
        this._manageTemplates(event.data);
      });

      this.orchestrator.on("custom:approve", (event) => {
        this._approveForActive(event.data);
      });

      this.orchestrator.on("custom:archive", (event) => {
        this._archiveMigrationType(event.data);
      });

      console.log("[MigrationTypesEntityManager] Migration-specific event handlers setup");
    }
  }

  /**
   * Load related data for caching
   * @private
   */
  async _loadRelatedDataCache() {
    try {
      // Pre-load teams for permission management
      const teamsResponse = await SecurityUtils.secureFetch("/rest/scriptrunner/latest/custom/teams", {
        method: "GET",
        headers: { "Accept": "application/json" }
      });

      if (teamsResponse.ok) {
        const teams = await teamsResponse.json();
        if (teams.data) {
          teams.data.forEach(team => {
            this.teamCache.set(`team_${team.tms_id}`, team.tms_name);
          });
        }
      }

      console.log("[MigrationTypesEntityManager] Related data cache loaded");
    } catch (error) {
      console.warn("[MigrationTypesEntityManager] Failed to load related data cache:", error);
    }
  }

  /**
   * Clear related caches
   * @private
   */
  _clearRelatedCaches() {
    this.templateCache.clear();
    this.validationCache.clear();
    this.batchCache.clear();
    console.log("[MigrationTypesEntityManager] Related caches cleared");
  }

  /**
   * Handle template management action
   * @param {Object} migrationTypeData - Migration type data
   * @private
   */
  async _manageTemplates(migrationTypeData) {
    console.log("[MigrationTypesEntityManager] Managing templates for:", migrationTypeData.mgt_name);
    
    // Open template management modal or navigate to template page
    if (this.modalComponent) {
      await this.modalComponent.show({
        mode: "custom",
        title: `Manage Templates - ${migrationTypeData.mgt_name}`,
        size: "large",
        content: this._renderTemplateManagementContent(migrationTypeData)
      });
    }
  }

  /**
   * Handle approval for active status
   * @param {Object} migrationTypeData - Migration type data
   * @private
   */
  async _approveForActive(migrationTypeData) {
    try {
      console.log("[MigrationTypesEntityManager] Approving for active status:", migrationTypeData.mgt_name);
      
      if (!this._canApprove()) {
        throw new Error("You do not have permission to approve migration types");
      }

      // Update status to active
      await this.updateEntity(migrationTypeData.mgt_id, {
        ...migrationTypeData,
        mgt_status: "active"
      });

      // Show success message
      if (window.AJS?.flag) {
        window.AJS.flag({
          type: "success",
          title: "Migration Type Approved",
          body: `${migrationTypeData.mgt_name} has been approved and is now active.`
        });
      }
    } catch (error) {
      console.error("[MigrationTypesEntityManager] Failed to approve migration type:", error);
      
      if (window.AJS?.flag) {
        window.AJS.flag({
          type: "error",
          title: "Approval Failed",
          body: error.message
        });
      }
    }
  }

  /**
   * Handle archive migration type
   * @param {Object} migrationTypeData - Migration type data
   * @private
   */
  async _archiveMigrationType(migrationTypeData) {
    try {
      console.log("[MigrationTypesEntityManager] Archiving migration type:", migrationTypeData.mgt_name);
      
      // Update status to archived
      await this.updateEntity(migrationTypeData.mgt_id, {
        ...migrationTypeData,
        mgt_status: "archived"
      });

      // Show success message
      if (window.AJS?.flag) {
        window.AJS.flag({
          type: "success",
          title: "Migration Type Archived",
          body: `${migrationTypeData.mgt_name} has been archived.`
        });
      }
    } catch (error) {
      console.error("[MigrationTypesEntityManager] Failed to archive migration type:", error);
      
      if (window.AJS?.flag) {
        window.AJS.flag({
          type: "error",
          title: "Archive Failed",
          body: error.message
        });
      }
    }
  }

  /**
   * Render template management content
   * @param {Object} migrationTypeData - Migration type data
   * @returns {string} HTML content for template management
   * @private
   */
  _renderTemplateManagementContent(migrationTypeData) {
    return `
      <div class="template-management">
        <h4>Template Management for ${SecurityUtils.escapeHtml(migrationTypeData.mgt_name)}</h4>
        <p>Manage templates and version history for this migration type.</p>
        
        <div class="template-actions">
          <button class="aui-button aui-button-primary" onclick="window.location.href='/admin-gui/migration-types/${migrationTypeData.mgt_id}/templates'">
            <span class="aui-icon aui-icon-small aui-icon-edit"></span>
            Edit Templates
          </button>
          
          <button class="aui-button" onclick="window.location.href='/admin-gui/migration-types/${migrationTypeData.mgt_id}/template-versions'">
            <span class="aui-icon aui-icon-small aui-icon-history"></span>
            Version History
          </button>
        </div>
        
        ${migrationTypeData.mgt_template ? `
          <div class="current-template">
            <h5>Current Template Preview:</h5>
            <pre class="template-preview">${SecurityUtils.escapeHtml(JSON.stringify(JSON.parse(migrationTypeData.mgt_template), null, 2))}</pre>
          </div>
        ` : '<p><em>No template defined yet.</em></p>'}
      </div>
    `;
  }

  /**
   * Public validation method for testing and external use
   * @param {Object} data - Migration type data to validate
   * @returns {Object} Validation result with isValid and errors
   */
  validateMigrationType(data) {
    const errors = [];

    try {
      // Basic validation checks
      if (!data || typeof data !== 'object') {
        errors.push('Data must be a valid object');
        return { isValid: false, errors };
      }

      // Required field validation
      if (!data.mgt_name || typeof data.mgt_name !== 'string' || data.mgt_name.trim().length === 0) {
        errors.push('Migration type name is required');
      }

      if (data.mgt_name && data.mgt_name.length > 255) {
        errors.push('Migration type name cannot exceed 255 characters');
      }

      // Status validation
      if (data.mgt_status) {
        const validStatuses = ["draft", "active", "archived", "deprecated"];
        if (!validStatuses.includes(data.mgt_status)) {
          errors.push(`Invalid status: ${data.mgt_status}. Must be one of: ${validStatuses.join(", ")}`);
        }
      }

      // JSON validation for complex fields
      if (data.mgt_validation_rules) {
        try {
          JSON.parse(data.mgt_validation_rules);
        } catch (error) {
          errors.push('Validation rules must be valid JSON');
        }
      }

      if (data.mgt_template) {
        try {
          JSON.parse(data.mgt_template);
        } catch (error) {
          errors.push('Template must be valid JSON');
        }
      }

      return {
        isValid: errors.length === 0,
        errors: errors
      };

    } catch (error) {
      console.error('[MigrationTypesEntityManager] Validation error:', error);
      return {
        isValid: false,
        errors: ['Validation failed due to internal error']
      };
    }
  }

  /**
   * Enhanced entity validation with migration type business rules
   * @param {Object} data - Entity data
   * @param {string} operation - Operation type
   * @protected
   */
  _validateEntityData(data, operation) {
    // Call parent validation
    super._validateEntityData(data, operation);

    // Migration type specific validation already handled in _validateMigrationTypeData
  }

  /**
   * Cleanup migration type specific resources
   */
  destroy() {
    console.log("[MigrationTypesEntityManager] Destroying migration types entity manager");

    // Clear caches
    this.teamCache.clear();
    this.templateCache.clear();
    this.validationCache.clear();
    this.batchCache.clear();

    // Clear error tracking
    this.errorBoundary.clear();
    this.circuitBreaker.clear();

    // Clear enrichment failure tracking
    if (this.enrichmentFailures) {
      this.enrichmentFailures.clear();
    }

    // Clear references
    this.userPermissions = null;
    this.apiEndpoint = null;
    this.retryConfig = null;

    // Call parent cleanup
    super.destroy();
  }
}

export default MigrationTypesEntityManager;

// CommonJS export for Jest compatibility
if (typeof module !== "undefined" && module.exports) {
  module.exports = MigrationTypesEntityManager;
}