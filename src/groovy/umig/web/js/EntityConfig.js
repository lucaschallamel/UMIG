/**
 * Entity Configuration Module
 *
 * Defines entity configurations including fields, table columns, sort mappings,
 * filters, and permissions for all admin GUI entities.
 */

(function () {
  "use strict";

  // Entity configurations
  const ENTITY_CONFIG = {
    users: {
      name: "Users",
      description: "Manage user accounts, roles, and permissions",
      fields: [
        { key: "usr_id", label: "ID", type: "number", readonly: true },
        {
          key: "usr_code",
          label: "User Code",
          type: "text",
          required: true,
          maxLength: 3,
        },
        {
          key: "usr_first_name",
          label: "First Name",
          type: "text",
          required: true,
        },
        {
          key: "usr_last_name",
          label: "Last Name",
          type: "text",
          required: true,
        },
        { key: "usr_email", label: "Email", type: "email", required: true },
        {
          key: "usr_is_admin",
          label: "Super Admin",
          type: "boolean",
          required: true,
        },
        { key: "usr_active", label: "Active", type: "boolean", required: true },
        {
          key: "rls_id",
          label: "Role",
          type: "select",
          options: [
            { value: null, label: "No Role" },
            { value: 1, label: "Admin" },
            { value: 2, label: "User" },
            { value: 3, label: "Pilot" },
          ],
        },
        {
          key: "created_at",
          label: "Created",
          type: "datetime",
          readonly: true,
        },
        {
          key: "updated_at",
          label: "Updated",
          type: "datetime",
          readonly: true,
        },
      ],
      tableColumns: [
        "usr_id",
        "usr_code",
        "usr_first_name",
        "usr_last_name",
        "usr_email",
        "role_display",
        "status_display",
      ],
      sortMapping: {
        usr_id: "usr_id",
        usr_code: "usr_code",
        usr_first_name: "usr_first_name",
        usr_last_name: "usr_last_name",
        usr_email: "usr_email",
        role_display: "rls_id",
        status_display: "usr_active",
      },
      filters: [
        {
          key: "teamId",
          label: "Team",
          type: "select",
          endpoint: "/teams",
          valueField: "tms_id",
          textField: "tms_name",
          placeholder: "All Teams",
        },
      ],
      permissions: ["superadmin"],
    },

    teams: {
      name: "Teams",
      description: "Manage organizational teams and team memberships",
      fields: [
        { key: "tms_id", label: "ID", type: "number", readonly: true },
        { key: "tms_name", label: "Team Name", type: "text", required: true },
        { key: "tms_description", label: "Description", type: "textarea" },
        { key: "tms_email", label: "Team Email", type: "email" },
        {
          key: "member_count",
          label: "Members",
          type: "number",
          readonly: true,
          computed: true,
        },
        {
          key: "app_count",
          label: "Applications",
          type: "number",
          readonly: true,
          computed: true,
        },
        {
          key: "created_date",
          label: "Created",
          type: "datetime",
          readonly: true,
        },
        {
          key: "updated_date",
          label: "Updated",
          type: "datetime",
          readonly: true,
        },
      ],
      tableColumns: [
        "tms_id",
        "tms_name",
        "tms_description",
        "tms_email",
        "member_count",
        "app_count",
      ],
      sortMapping: {
        tms_id: "tms_id",
        tms_name: "tms_name",
        tms_description: "tms_description",
        tms_email: "tms_email",
        member_count: "member_count",
        app_count: "app_count",
      },
      permissions: ["superadmin"],
    },

    environments: {
      name: "Environments",
      description:
        "Manage environments and their associations with applications and iterations",
      fields: [
        { key: "env_id", label: "ID", type: "number", readonly: true },
        {
          key: "env_code",
          label: "Environment Code",
          type: "text",
          required: true,
          maxLength: 10,
        },
        {
          key: "env_name",
          label: "Environment Name",
          type: "text",
          required: true,
          maxLength: 64,
        },
        { key: "env_description", label: "Description", type: "textarea" },
        {
          key: "application_count",
          label: "Applications",
          type: "number",
          readonly: true,
          computed: true,
        },
        {
          key: "iteration_count",
          label: "Iterations",
          type: "number",
          readonly: true,
          computed: true,
        },
      ],
      tableColumns: [
        "env_id",
        "env_code",
        "env_name",
        "env_description",
        "application_count",
        "iteration_count",
      ],
      sortMapping: {
        env_id: "env_id",
        env_code: "env_code",
        env_name: "env_name",
        env_description: "env_description",
        application_count: "application_count",
        iteration_count: "iteration_count",
      },
      filters: [],
      permissions: ["superadmin"],
    },

    labels: {
      name: "Labels",
      description:
        "Manage labels for categorizing and tagging steps and applications",
      fields: [
        { key: "lbl_id", label: "ID", type: "number", readonly: true },
        {
          key: "lbl_name",
          label: "Label Name",
          type: "text",
          required: true,
          maxLength: 100,
        },
        { key: "lbl_description", label: "Description", type: "textarea" },
        { key: "lbl_color", label: "Color", type: "color", required: true },
        {
          key: "mig_id",
          label: "Migration ID",
          type: "select",
          required: true,
          entityType: "migrations",
          displayField: "mig_name",
          valueField: "mig_id",
        },
        {
          key: "mig_name",
          label: "Migration",
          type: "text",
          readonly: true,
          computed: true,
        },
        {
          key: "created_at",
          label: "Created At",
          type: "datetime",
          readonly: true,
        },
        {
          key: "created_by",
          label: "Created By",
          type: "number",
          readonly: true,
        },
        {
          key: "created_by_name",
          label: "Created By",
          type: "text",
          readonly: true,
          computed: true,
        },
        {
          key: "application_count",
          label: "Applications",
          type: "number",
          readonly: true,
          computed: true,
        },
        {
          key: "step_count",
          label: "Steps",
          type: "number",
          readonly: true,
          computed: true,
        },
      ],
      tableColumns: [
        "lbl_id",
        "lbl_name",
        "lbl_description",
        "lbl_color",
        "mig_name",
        "application_count",
        "step_count",
      ],
      sortMapping: {
        lbl_id: "lbl_id",
        lbl_name: "lbl_name",
        lbl_description: "lbl_description",
        lbl_color: "lbl_color",
        mig_name: "mig_name",
        application_count: "application_count",
        step_count: "step_count",
      },
      customRenderers: {
        lbl_color: function (value) {
          if (!value) return "";
          return `<span class="aui-label" style="background-color: ${value}; color: ${window.UiUtils ? window.UiUtils.getContrastColor(value) : "#000000"};">${value}</span>`;
        },
      },
      permissions: ["superadmin"],
    },

    applications: {
      name: "Applications",
      description:
        "Manage applications and their associations with environments and teams",
      fields: [
        { key: "app_id", label: "ID", type: "number", readonly: true },
        {
          key: "app_code",
          label: "Application Code",
          type: "text",
          required: true,
          maxLength: 50,
        },
        {
          key: "app_name",
          label: "Application Name",
          type: "text",
          required: true,
          maxLength: 64,
        },
        { key: "app_description", label: "Description", type: "textarea" },
        {
          key: "environment_count",
          label: "Environments",
          type: "number",
          readonly: true,
          computed: true,
        },
        {
          key: "team_count",
          label: "Teams",
          type: "number",
          readonly: true,
          computed: true,
        },
        {
          key: "label_count",
          label: "Labels",
          type: "number",
          readonly: true,
          computed: true,
        },
      ],
      tableColumns: [
        "app_id",
        "app_code",
        "app_name",
        "app_description",
        "environment_count",
        "team_count",
        "label_count",
      ],
      sortMapping: {
        app_id: "app_id",
        app_code: "app_code",
        app_name: "app_name",
        app_description: "app_description",
        environment_count: "environment_count",
        team_count: "team_count",
        label_count: "label_count",
      },
      filters: [],
      permissions: ["superadmin"],
    },

    iterations: {
      name: "Iterations",
      description: "Manage iteration instances for migrations",
      fields: [
        { key: "iti_id", label: "Iteration ID", type: "text", readonly: true },
        { key: "iti_name", label: "Iteration Name", type: "text", required: true },
        { key: "iti_description", label: "Description", type: "textarea" },
        { key: "iti_number", label: "Iteration Number", type: "number", required: true },
        { key: "iti_start_date", label: "Start Date", type: "date", required: true },
        { key: "iti_end_date", label: "End Date", type: "date", required: true },
        {
          key: "mig_id",
          label: "Migration ID",
          type: "select",
          required: true,
          entityType: "migrations",
          displayField: "mig_name",
          valueField: "mig_id",
        },
        {
          key: "mig_name",
          label: "Migration",
          type: "text",
          readonly: true,
          computed: true,
        },
        { key: "iti_status", label: "Status", type: "select",
          options: [
            { value: "PLANNING", label: "Planning" },
            { value: "IN_PROGRESS", label: "In Progress" },
            { value: "COMPLETED", label: "Completed" },
            { value: "CANCELLED", label: "Cancelled" }
          ]
        },
        {
          key: "step_count",
          label: "Steps",
          type: "number",
          readonly: true,
          computed: true,
        },
        {
          key: "created_at",
          label: "Created",
          type: "datetime",
          readonly: true,
        },
        {
          key: "updated_at",
          label: "Updated",
          type: "datetime",
          readonly: true,
        },
      ],
      tableColumns: [
        "iti_id",
        "iti_name",
        "iti_number",
        "mig_name",
        "iti_start_date",
        "iti_end_date",
        "iti_status",
        "step_count",
      ],
      sortMapping: {
        iti_id: "iti_id",
        iti_name: "iti_name",
        iti_number: "iti_number",
        mig_name: "mig_name",
        iti_start_date: "iti_start_date",
        iti_end_date: "iti_end_date",
        iti_status: "iti_status",
        step_count: "step_count",
      },
      filters: [
        {
          key: "migrationId",
          label: "Migration",
          type: "select",
          endpoint: "/migrations",
          valueField: "mig_id",
          textField: "mig_name",
          placeholder: "All Migrations",
        },
      ],
      permissions: ["pilot"],
    },

    migrations: {
      name: "Migrations",
      description: "Manage migration events and their configurations",
      fields: [
        { key: "mig_id", label: "Migration ID", type: "text", readonly: true },
        { key: "mig_name", label: "Migration Name", type: "text", required: true },
        { key: "mig_description", label: "Description", type: "textarea" },
        { key: "mig_start_date", label: "Start Date", type: "datetime", required: true },
        { key: "mig_end_date", label: "End Date", type: "datetime", required: true },
        { key: "mig_status", label: "Status", type: "select", 
          options: [
            { value: "PLANNING", label: "Planning" },
            { value: "IN_PROGRESS", label: "In Progress" },
            { value: "COMPLETED", label: "Completed" },
            { value: "CANCELLED", label: "Cancelled" }
          ]
        },
        {
          key: "iteration_count",
          label: "Iterations",
          type: "number",
          readonly: true,
          computed: true,
        },
        {
          key: "plan_count",
          label: "Plans",
          type: "number",
          readonly: true,
          computed: true,
        },
        {
          key: "created_at",
          label: "Created",
          type: "datetime",
          readonly: true,
        },
        {
          key: "updated_at",
          label: "Updated",
          type: "datetime",
          readonly: true,
        },
      ],
      tableColumns: [
        "mig_id",
        "mig_name",
        "mig_start_date",
        "mig_end_date",
        "mig_status",
        "iteration_count",
        "plan_count",
      ],
      sortMapping: {
        mig_id: "mig_id",
        mig_name: "mig_name",
        mig_start_date: "mig_start_date",
        mig_end_date: "mig_end_date",
        mig_status: "mig_status",
        iteration_count: "iteration_count",
        plan_count: "plan_count",
        created_at: "created_at",
        updated_at: "updated_at",
      },
      filters: [],
      customRenderers: {
        mig_id: function (value, row) {
          if (!value) return "";
          // Create a clickable link that triggers the view action
          return `<a href="#" class="migration-id-link btn-table-action" data-action="view" data-id="${value}" style="color: #205081; text-decoration: none; cursor: pointer;" title="View migration details">${value}</a>`;
        },
        mig_status: function (value, row) {
          // Handle both status objects and numeric values
          let statusName, statusColor;
          
          console.log('mig_status renderer called with value:', value, 'row:', row);
          
          // First check if statusMetadata is available in row
          if (row && row.statusMetadata) {
            statusName = row.statusMetadata.name;
            statusColor = row.statusMetadata.color;
          }
          // Check if value is the status string directly
          else if (typeof value === 'string') {
            statusName = value;
            // Check if we have statusMetadata in row for color
            if (row && row.statusMetadata && row.statusMetadata.name === value) {
              statusColor = row.statusMetadata.color;
            }
          }
          // Legacy handling for object status values
          else if (typeof value === 'object' && value !== null) {
            statusName = value.sts_name || value.name;
            statusColor = value.sts_color || value.color;
          }
          // Check for legacy status fields in row
          else if (row && row.sts_name) {
            statusName = row.sts_name;
            statusColor = row.sts_color;
          } else {
            // Fallback
            statusName = value || "Unknown";
            statusColor = null;
          }
          
          console.log('Using statusName:', statusName, 'statusColor:', statusColor);
          
          // Convert status name to display format
          const displayName = statusName ? statusName.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown';
          
          // If we have a color, use it directly
          if (statusColor) {
            const textColor = window.UiUtils ? window.UiUtils.getContrastingTextColor(statusColor) : "#ffffff";
            return `<span class="status-badge" data-status="${statusName}" data-entity-type="Migration" style="background-color: ${statusColor}; color: ${textColor}; padding: 4px 8px; border-radius: 3px; font-size: 11px; font-weight: 600; display: inline-block;">${displayName}</span>`;
          }
          
          // Otherwise, create badge with data attributes for async color application
          return `<span class="status-badge" data-status="${statusName}" data-entity-type="Migration" style="background-color: #999; color: #fff; padding: 4px 8px; border-radius: 3px; font-size: 11px; font-weight: 600; display: inline-block;">${displayName}</span>`;
        }
      },
      permissions: ["admin"],
      bulkActions: [
        {
          id: "update_status",
          label: "Update Status",
          icon: "🔄",
          requiresInput: true,
          inputType: "select",
          inputOptions: [
            { value: "PLANNING", label: "Planning" },
            { value: "IN_PROGRESS", label: "In Progress" },
            { value: "COMPLETED", label: "Completed" },
            { value: "CANCELLED", label: "Cancelled" }
          ]
        },
        {
          id: "export_selected",
          label: "Export Selected",
          icon: "📄",
          requiresInput: false
        }
      ],
    },

    plans: {
      name: "Plans",
      description: "Manage master plans and plan instances for migrations",
      fields: [
        { key: "plm_id", label: "Plan ID", type: "text", readonly: true },
        { key: "plm_name", label: "Plan Name", type: "text", required: true },
        { key: "plm_description", label: "Description", type: "textarea" },
        { key: "plm_status", label: "Status", type: "select", 
          options: [
            { value: "PLANNING", label: "Planning" },
            { value: "IN_PROGRESS", label: "In Progress" },
            { value: "COMPLETED", label: "Completed" },
            { value: "CANCELLED", label: "Cancelled" }
          ]
        },
        {
          key: "sequence_count",
          label: "Sequences",
          type: "number",
          readonly: true,
          computed: true,
        },
        {
          key: "instance_count",
          label: "Instances",
          type: "number",
          readonly: true,
          computed: true,
        },
        {
          key: "created_at",
          label: "Created",
          type: "datetime",
          readonly: true,
        },
        {
          key: "updated_at",
          label: "Updated",
          type: "datetime",
          readonly: true,
        },
      ],
      tableColumns: [
        "plm_id",
        "plm_name",
        "plm_status",
        "sequence_count",
        "instance_count",
      ],
      sortMapping: {
        plm_id: "plm_id",
        plm_name: "plm_name",
        plm_status: "plm_status",
        sequence_count: "sequence_count",
        instance_count: "instance_count",
        created_at: "created_at",
        updated_at: "updated_at",
      },
      filters: [],
      customRenderers: {
        // Clickable ID pattern
        plm_id: function (value, row) {
          if (!value) return "";
          return `<a href="#" class="plan-id-link btn-table-action" data-action="view" data-id="${value}" 
                    style="color: #205081; text-decoration: none; cursor: pointer;" 
                    title="View plan details">${value}</a>`;
        },
        // Status with color pattern
        plm_status: function (value, row) {
          let statusName, statusColor;
          
          console.log('plm_status renderer called with value:', value, 'row:', row);
          
          // Enhanced status metadata handling
          if (row && row.statusMetadata) {
            statusName = row.statusMetadata.name;
            statusColor = row.statusMetadata.color;
          } else if (typeof value === 'string') {
            statusName = value;
            if (row && row.statusMetadata && row.statusMetadata.name === value) {
              statusColor = row.statusMetadata.color;
            }
          } else if (typeof value === 'object' && value !== null) {
            statusName = value.sts_name || value.name;
            statusColor = value.sts_color || value.color;
          } else if (row && row.sts_name) {
            statusName = row.sts_name;
            statusColor = row.sts_color;
          } else {
            statusName = value || "Unknown";
            statusColor = "#999999";
          }

          return `<span class="status-badge" style="background-color: ${statusColor || '#999999'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${statusName}</span>`;
        }
      },
      // Feature flags to disable bulk operations
      featureFlags: {
        enableBulkActions: false,
        enableExport: false,
        enableRowSelection: false
      },
      permissions: ["superadmin"],
    },

    sequences: {
      name: "Sequences",
      description: "Manage master sequences and sequence instances within plans",
      fields: [
        { key: "sqm_id", label: "Master Sequence ID", type: "number", readonly: true },
        { key: "sqm_name", label: "Sequence Name", type: "text", required: true },
        { key: "sqm_description", label: "Description", type: "textarea" },
        { key: "sqm_status", label: "Status", type: "select", 
          options: [
            { value: "PLANNING", label: "Planning" },
            { value: "IN_PROGRESS", label: "In Progress" },
            { value: "COMPLETED", label: "Completed" },
            { value: "CANCELLED", label: "Cancelled" }
          ]
        },
        { key: "sqm_order", label: "Order", type: "number", required: true },
        {
          key: "plm_id",
          label: "Plan ID",
          type: "select",
          required: true,
          entityType: "plans",
          displayField: "plm_name",
          valueField: "plm_id",
        },
        {
          key: "plm_name",
          label: "Plan",
          type: "text",
          readonly: true,
          computed: true,
        },
        {
          key: "phase_count",
          label: "Phases",
          type: "number",
          readonly: true,
          computed: true,
        },
        {
          key: "instance_count",
          label: "Instances",
          type: "number",
          readonly: true,
          computed: true,
        },
        {
          key: "created_at",
          label: "Created",
          type: "datetime",
          readonly: true,
        },
        {
          key: "updated_at",
          label: "Updated",
          type: "datetime",
          readonly: true,
        },
      ],
      tableColumns: [
        "sqm_id",
        "sqm_name",
        "sqm_status",
        "phase_count",
        "instance_count",
      ],
      sortMapping: {
        sqm_id: "sqm_id",
        sqm_name: "sqm_name",
        sqm_status: "sqm_status",
        phase_count: "phase_count",
        instance_count: "instance_count",
        created_at: "created_at",
        updated_at: "updated_at",
      },
      filters: [
        {
          key: "planId",
          label: "Plan",
          type: "select",
          endpoint: "/plans",
          valueField: "plm_id",
          textField: "plm_name",
          placeholder: "All Plans",
        },
      ],
      permissions: ["superadmin"],
      customRenderers: {
        // Clickable ID pattern
        sqm_id: function (value, row) {
          if (!value) return "";
          return `<a href="#" class="sequence-id-link btn-table-action" data-action="view" data-id="${value}" 
                    style="color: #205081; text-decoration: none; cursor: pointer;" 
                    title="View sequence details">${value}</a>`;
        },
        // Status with color pattern  
        sqm_status: function (value, row) {
          let statusName, statusColor;
          
          console.log('sqm_status renderer called with value:', value, 'row:', row);
          
          // Enhanced status metadata handling
          if (row && row.statusMetadata) {
            statusName = row.statusMetadata.name;
            statusColor = row.statusMetadata.color;
          } else if (typeof value === 'string') {
            statusName = value;
            if (row && row.statusMetadata && row.statusMetadata.name === value) {
              statusColor = row.statusMetadata.color;
            }
          } else if (typeof value === 'object' && value !== null) {
            statusName = value.sts_name || value.name;
            statusColor = value.sts_color || value.color;
          } else if (row && row.sts_name) {
            statusName = row.sts_name;
            statusColor = row.sts_color;
          } else {
            statusName = value || "Unknown";
            statusColor = "#999999";
          }

          return `<span class="status-badge" style="background-color: ${statusColor || '#999999'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${statusName}</span>`;
        }
      },
      // Feature flags to disable bulk operations
      featureFlags: {
        enableBulkActions: false,
        enableExport: false,
        enableRowSelection: false
      }
    },

    phases: {
      name: "Phases",
      description: "Manage phase events and their configurations",
      fields: [
        { key: "phm_id", label: "Phase ID", type: "text", readonly: true },
        { key: "phm_name", label: "Phase Name", type: "text", required: true },
        { key: "phm_description", label: "Description", type: "textarea" },
        { key: "phm_status", label: "Status", type: "select", 
          options: [
            { value: "PLANNING", label: "Planning" },
            { value: "IN_PROGRESS", label: "In Progress" },
            { value: "COMPLETED", label: "Completed" },
            { value: "CANCELLED", label: "Cancelled" }
          ]
        },
        // Computed fields pattern
        {
          key: "step_count",
          label: "Steps",
          type: "number",
          readonly: true,
          computed: true,
        },
        {
          key: "instance_count", 
          label: "Instances",
          type: "number",
          readonly: true,
          computed: true,
        },
        // Audit fields (consistent across all entities)
        {
          key: "created_at",
          label: "Created",
          type: "datetime",
          readonly: true,
        },
        {
          key: "updated_at",
          label: "Updated", 
          type: "datetime",
          readonly: true,
        },
      ],
      tableColumns: [
        "phm_id",
        "phm_name",
        "phm_status",
        "step_count",
        "instance_count",
      ],
      sortMapping: {
        phm_id: "phm_id",
        phm_name: "phm_name",
        phm_status: "phm_status",
        step_count: "step_count",
        instance_count: "instance_count",
        created_at: "created_at",
        updated_at: "updated_at",
      },
      filters: [],
      customRenderers: {
        // Clickable ID pattern
        phm_id: function (value, row) {
          if (!value) return "";
          return `<a href="#" class="phase-id-link btn-table-action" data-action="view" data-id="${value}" 
                    style="color: #205081; text-decoration: none; cursor: pointer;" 
                    title="View phase details">${value}</a>`;
        },
        // Status with color pattern
        phm_status: function (value, row) {
          let statusName, statusColor;
          
          console.log('phm_status renderer called with value:', value, 'row:', row);
          
          // Enhanced status metadata handling
          if (row && row.statusMetadata) {
            statusName = row.statusMetadata.name;
            statusColor = row.statusMetadata.color;
          } else if (typeof value === 'string') {
            statusName = value;
            if (row && row.statusMetadata && row.statusMetadata.name === value) {
              statusColor = row.statusMetadata.color;
            }
          } else if (typeof value === 'object' && value !== null) {
            statusName = value.sts_name || value.name;
            statusColor = value.sts_color || value.color;
          } else if (row && row.sts_name) {
            statusName = row.sts_name;
            statusColor = row.sts_color;
          } else {
            statusName = value || "Unknown";
            statusColor = "#999999";
          }

          return `<span class="status-badge" style="background-color: ${statusColor || '#999999'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${statusName}</span>`;
        }
      },
      // Feature flags to disable bulk operations
      featureFlags: {
        enableBulkActions: false,
        enableExport: false,
        enableRowSelection: false
      },
      permissions: ["superadmin"],
    },
    steps: {
      name: "Steps",
      description: "Manage step events and their configurations",
      fields: [
        { key: "stm_id", label: "Step ID", type: "text", readonly: true },
        { key: "stm_name", label: "Step Name", type: "text", required: true },
        { key: "stm_description", label: "Description", type: "textarea" },
        { key: "stm_status", label: "Status", type: "select", 
          options: [
            { value: "PLANNING", label: "Planning" },
            { value: "IN_PROGRESS", label: "In Progress" },
            { value: "COMPLETED", label: "Completed" },
            { value: "CANCELLED", label: "Cancelled" }
          ]
        },
        // Computed fields pattern
        {
          key: "instruction_count",
          label: "Instructions",
          type: "number",
          readonly: true,
          computed: true,
        },
        {
          key: "instance_count", 
          label: "Instances",
          type: "number",
          readonly: true,
          computed: true,
        },
        // Audit fields (consistent across all entities)
        {
          key: "created_at",
          label: "Created",
          type: "datetime",
          readonly: true,
        },
        {
          key: "updated_at",
          label: "Updated", 
          type: "datetime",
          readonly: true,
        },
      ],
      tableColumns: [
        "stm_id",
        "stm_name",
        "stm_status",
        "instruction_count",
        "instance_count",
      ],
      sortMapping: {
        stm_id: "stm_id",
        stm_name: "stm_name",
        stm_status: "stm_status",
        instruction_count: "instruction_count",
        instance_count: "instance_count",
        created_at: "created_at",
        updated_at: "updated_at",
      },
      filters: [],
      customRenderers: {
        // Clickable ID pattern
        stm_id: function (value, row) {
          if (!value) return "";
          return `<a href="#" class="step-id-link btn-table-action" data-action="view" data-id="${value}" 
                    style="color: #205081; text-decoration: none; cursor: pointer;" 
                    title="View step details">${value}</a>`;
        },
        // Status with color pattern
        stm_status: function (value, row) {
          let statusName, statusColor;
          
          console.log('stm_status renderer called with value:', value, 'row:', row);
          
          // Enhanced status metadata handling
          if (row && row.statusMetadata) {
            statusName = row.statusMetadata.name;
            statusColor = row.statusMetadata.color;
          } else if (typeof value === 'string') {
            statusName = value;
            if (row && row.statusMetadata && row.statusMetadata.name === value) {
              statusColor = row.statusMetadata.color;
            }
          } else if (typeof value === 'object' && value !== null) {
            statusName = value.sts_name || value.name;
            statusColor = value.sts_color || value.color;
          } else if (row && row.sts_name) {
            statusName = row.sts_name;
            statusColor = row.sts_color;
          } else {
            statusName = value || "Unknown";
            statusColor = "#999999";
          }

          return `<span class="status-badge" style="background-color: ${statusColor || '#999999'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${statusName}</span>`;
        }
      },
      // Feature flags to disable bulk operations
      featureFlags: {
        enableBulkActions: false,
        enableExport: false,
        enableRowSelection: false
      },
      permissions: ["superadmin"],
    },

    instructions: {
      name: "Instructions",
      description: "Manage instruction events and their configurations",
      fields: [
        { key: "inm_id", label: "Instruction ID", type: "text", readonly: true },
        { key: "inm_name", label: "Instruction Name", type: "text", required: true },
        { key: "inm_description", label: "Description", type: "textarea" },
        { key: "inm_status", label: "Status", type: "select", 
          options: [
            { value: "PLANNING", label: "Planning" },
            { value: "IN_PROGRESS", label: "In Progress" },
            { value: "COMPLETED", label: "Completed" },
            { value: "CANCELLED", label: "Cancelled" }
          ]
        },
        // Computed fields pattern
        {
          key: "instance_count",
          label: "Instances",
          type: "number",
          readonly: true,
          computed: true,
        },
        {
          key: "control_count", 
          label: "Controls",
          type: "number",
          readonly: true,
          computed: true,
        },
        // Audit fields (consistent across all entities)
        {
          key: "created_at",
          label: "Created",
          type: "datetime",
          readonly: true,
        },
        {
          key: "updated_at",
          label: "Updated", 
          type: "datetime",
          readonly: true,
        },
      ],
      tableColumns: [
        "inm_id",
        "inm_name",
        "inm_status",
        "instance_count",
        "control_count",
      ],
      sortMapping: {
        inm_id: "inm_id",
        inm_name: "inm_name",
        inm_status: "inm_status",
        instance_count: "instance_count",
        control_count: "control_count",
        created_at: "created_at",
        updated_at: "updated_at",
      },
      filters: [],
      customRenderers: {
        // Clickable ID pattern
        inm_id: function (value, row) {
          if (!value) return "";
          return `<a href="#" class="instruction-id-link btn-table-action" data-action="view" data-id="${value}" 
                    style="color: #205081; text-decoration: none; cursor: pointer;" 
                    title="View instruction details">${value}</a>`;
        },
        // Status with color pattern
        inm_status: function (value, row) {
          let statusName, statusColor;
          
          console.log('inm_status renderer called with value:', value, 'row:', row);
          
          // Enhanced status metadata handling
          if (row && row.statusMetadata) {
            statusName = row.statusMetadata.name;
            statusColor = row.statusMetadata.color;
          } else if (typeof value === 'string') {
            statusName = value;
            if (row && row.statusMetadata && row.statusMetadata.name === value) {
              statusColor = row.statusMetadata.color;
            }
          } else if (typeof value === 'object' && value !== null) {
            statusName = value.sts_name || value.name;
            statusColor = value.sts_color || value.color;
          } else if (row && row.sts_name) {
            statusName = row.sts_name;
            statusColor = row.sts_color;
          } else {
            statusName = value || "Unknown";
            statusColor = "#999999";
          }

          return `<span class="status-badge" style="background-color: ${statusColor || '#999999'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${statusName}</span>`;
        }
      },
      // Feature flags to disable bulk operations
      featureFlags: {
        enableBulkActions: false,
        enableExport: false,
        enableRowSelection: false
      },
      permissions: ["superadmin"],
    },

    controls: {
      name: "Controls",
      description: "Manage control events and their configurations",
      fields: [
        { key: "ctm_id", label: "Control ID", type: "text", readonly: true },
        { key: "ctm_name", label: "Control Name", type: "text", required: true },
        { key: "ctm_description", label: "Description", type: "textarea" },
        { key: "ctm_type", label: "Control Type", type: "text" },
        { key: "ctm_is_critical", label: "Critical", type: "boolean" },
        { key: "ctm_order", label: "Order", type: "number", required: true },
        { key: "ctm_status", label: "Status", type: "select", 
          options: [
            { value: "PLANNING", label: "Planning" },
            { value: "IN_PROGRESS", label: "In Progress" },
            { value: "COMPLETED", label: "Completed" },
            { value: "CANCELLED", label: "Cancelled" }
          ]
        },
        // Computed fields pattern
        {
          key: "instance_count",
          label: "Instances",
          type: "number",
          readonly: true,
          computed: true,
        },
        {
          key: "validation_count", 
          label: "Validations",
          type: "number",
          readonly: true,
          computed: true,
        },
        // Audit fields (consistent across all entities)
        {
          key: "created_at",
          label: "Created",
          type: "datetime",
          readonly: true,
        },
        {
          key: "updated_at",
          label: "Updated", 
          type: "datetime",
          readonly: true,
        },
      ],
      tableColumns: [
        "ctm_id",
        "ctm_name",
        "ctm_type",
        "ctm_is_critical",
        "ctm_status",
        "instance_count",
        "validation_count",
      ],
      sortMapping: {
        ctm_id: "ctm_id",
        ctm_name: "ctm_name",
        ctm_description: "ctm_description",
        ctm_type: "ctm_type",
        ctm_is_critical: "ctm_is_critical",
        ctm_order: "ctm_order",
        ctm_status: "ctm_status",
        instance_count: "instance_count",
        validation_count: "validation_count",
        created_at: "created_at",
        updated_at: "updated_at",
      },
      filters: [],
      customRenderers: {
        // Clickable ID pattern
        ctm_id: function (value, row) {
          if (!value) return "";
          return `<a href="#" class="control-id-link btn-table-action" data-action="view" data-id="${value}" 
                    style="color: #205081; text-decoration: none; cursor: pointer;" 
                    title="View control details">${value}</a>`;
        },
        // Status with color pattern
        ctm_status: function (value, row) {
          let statusName, statusColor;
          
          console.log('ctm_status renderer called with value:', value, 'row:', row);
          
          // Enhanced status metadata handling
          if (row && row.statusMetadata) {
            statusName = row.statusMetadata.name;
            statusColor = row.statusMetadata.color;
          } else if (typeof value === 'string') {
            statusName = value;
            if (row && row.statusMetadata && row.statusMetadata.name === value) {
              statusColor = row.statusMetadata.color;
            }
          } else if (typeof value === 'object' && value !== null) {
            statusName = value.sts_name || value.name;
            statusColor = value.sts_color || value.color;
          } else if (row && row.sts_name) {
            statusName = row.sts_name;
            statusColor = row.sts_color;
          } else {
            statusName = value || "Unknown";
            statusColor = "#999999";
          }

          return `<span class="status-badge" style="background-color: ${statusColor || '#999999'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${statusName}</span>`;
        }
      },
      // Feature flags to disable bulk operations
      featureFlags: {
        enableBulkActions: false,
        enableExport: false,
        enableRowSelection: false
      },
      permissions: ["superadmin"],
    },
  };

  // API endpoints configuration
  const API_CONFIG = {
    baseUrl: "/rest/scriptrunner/latest/custom",
    endpoints: {
      users: "/users",
      teams: "/teams",
      environments: "/environments",
      applications: "/applications",
      iterations: "/iterations",
      labels: "/labels",
      migrations: "/migrations",
      plans: "/plans",
      sequences: "/sequences",
      phases: "/phases",
      steps: "/steps",
      instructions: "/instructions",
      controls: "/controls",
      stepView: "/stepViewApi",
    },
  };

  // Feature flags configuration
  const FEATURE_FLAGS = {
    // Export and bulk functionality features
    enableExportButton: false,        // Set to true to show Export button
    enableBulkActions: false,         // Set to true to show Bulk Actions button  
    enableRowSelection: false,        // Set to true to show selection checkboxes
    enableSelectAll: false,           // Set to true to show select-all checkbox
    
    // Additional feature flags for future use
    enableAdvancedFilters: true,      // Advanced filtering capabilities
    enableRealTimeSync: true,         // Real-time data synchronization
    enableTableActions: true,         // Individual row actions (view, edit, delete)
  };

  // Entity configuration utility functions
  const EntityConfig = {
    /**
     * Get entity configuration by name
     * @param {string} entityName - The name of the entity
     * @returns {Object} Entity configuration
     */
    getEntity: function (entityName) {
      return ENTITY_CONFIG[entityName];
    },

    /**
     * Get all entity configurations
     * @returns {Object} All entity configurations
     */
    getAllEntities: function () {
      return ENTITY_CONFIG;
    },

    /**
     * Get API configuration
     * @returns {Object} API configuration
     */
    getApiConfig: function () {
      return API_CONFIG;
    },

    /**
     * Get entity field by key
     * @param {string} entityName - The name of the entity
     * @param {string} fieldKey - The field key
     * @returns {Object} Field configuration
     */
    getEntityField: function (entityName, fieldKey) {
      const entity = this.getEntity(entityName);
      return entity
        ? entity.fields.find((field) => field.key === fieldKey)
        : null;
    },

    /**
     * Get entity table columns
     * @param {string} entityName - The name of the entity
     * @returns {Array} Table column names
     */
    getEntityTableColumns: function (entityName) {
      const entity = this.getEntity(entityName);
      return entity ? entity.tableColumns : [];
    },

    /**
     * Get entity sort mapping
     * @param {string} entityName - The name of the entity
     * @returns {Object} Sort mapping
     */
    getEntitySortMapping: function (entityName) {
      const entity = this.getEntity(entityName);
      return entity ? entity.sortMapping : {};
    },

    /**
     * Check if user has permission for entity
     * @param {string} entityName - The name of the entity
     * @param {string} userRole - The user's role
     * @returns {boolean} Whether user has permission
     */
    hasPermission: function (entityName, userRole) {
      const entity = this.getEntity(entityName);
      if (!entity || !entity.permissions) return true;
      return entity.permissions.includes(userRole);
    },

    /**
     * Get entity filters
     * @param {string} entityName - The name of the entity
     * @returns {Array} Filter configurations
     */
    getEntityFilters: function (entityName) {
      const entity = this.getEntity(entityName);
      return entity ? entity.filters || [] : [];
    },

    /**
     * Get entity bulk actions
     * @param {string} entityName - The name of the entity
     * @returns {Array} Bulk action configurations
     */
    getEntityBulkActions: function (entityName) {
      const entity = this.getEntity(entityName);
      return entity ? entity.bulkActions || [] : [];
    },

    /**
     * Get feature flag value
     * @param {string} flagName - The name of the feature flag
     * @returns {boolean} Feature flag value
     */
    getFeatureFlag: function (flagName) {
      return FEATURE_FLAGS[flagName] || false;
    },

    /**
     * Get all feature flags
     * @returns {Object} All feature flags
     */
    getAllFeatureFlags: function () {
      return FEATURE_FLAGS;
    },

    /**
     * Set feature flag value (for runtime configuration)
     * @param {string} flagName - The name of the feature flag
     * @param {boolean} value - The value to set
     */
    setFeatureFlag: function (flagName, value) {
      if (FEATURE_FLAGS.hasOwnProperty(flagName)) {
        FEATURE_FLAGS[flagName] = value;
      }
    },
  };

  // Export to global namespace
  window.EntityConfig = EntityConfig;
})();
