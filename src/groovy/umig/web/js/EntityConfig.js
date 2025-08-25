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
          key: "created_by",
          label: "Created By",
          type: "text",
          readonly: true,
        },
        {
          key: "updated_at",
          label: "Updated",
          type: "datetime",
          readonly: true,
        },
        {
          key: "updated_by",
          label: "Updated By",
          type: "text",
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
      defaultSort: { field: "usr_last_name", direction: "asc" },
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
      defaultSort: { field: "tms_name", direction: "asc" },
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
      defaultSort: { field: "env_code", direction: "asc" },
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
      defaultSort: { field: "lbl_name", direction: "asc" },
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
      defaultSort: { field: "app_code", direction: "asc" },
      permissions: ["superadmin"],
    },

    iterations: {
      name: "Iterations",
      description: "Manage iteration instances for migrations",
      fields: [
        { key: "ite_id", label: "Iteration ID", type: "text", readonly: true },
        {
          key: "ite_name",
          label: "Iteration Name",
          type: "text",
          required: true,
        },
        {
          key: "itt_code",
          label: "Iteration Code",
          type: "select",
          required: true,
          entityType: "iterationTypes",
          displayField: "itt_name",
          valueField: "itt_code",
        },
        {
          key: "ite_status",
          label: "Status",
          type: "select",
          options: [
            { value: "PLANNING", label: "Planning" },
            { value: "IN_PROGRESS", label: "In Progress" },
            { value: "COMPLETED", label: "Completed" },
            { value: "CANCELLED", label: "Cancelled" },
          ],
        },
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
          key: "plm_id",
          label: "Master Plan",
          type: "select",
          required: false,
          entityType: "plans",
          displayField: "plm_name",
          valueField: "plm_id",
        },
        {
          key: "migration_name",
          label: "Migration",
          type: "text",
          readonly: true,
          computed: true,
        },
        {
          key: "master_plan_name",
          label: "Master Plan Name",
          type: "text",
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
          key: "created_by",
          label: "Created By",
          type: "text",
          readonly: true,
        },
        {
          key: "updated_at",
          label: "Updated",
          type: "datetime",
          readonly: true,
        },
        {
          key: "updated_by",
          label: "Updated By",
          type: "text",
          readonly: true,
        },
      ],
      // Modal fields for view/edit modals - ordered logically
      modalFields: [
        "ite_id",
        "ite_name",
        "itt_code",
        "ite_status",
        "mig_id",
        "plm_id",
        "migration_name",
        "master_plan_name",
        "created_at",
        "created_by",
        "updated_at",
        "updated_by",
      ],
      tableColumns: [
        "ite_name",
        "migration_name",
        "master_plan_name",
        "itt_code",
        "ite_status",
      ],
      sortMapping: {
        ite_id: "ite_id",
        ite_name: "ite_name",
        itt_code: "itt_code",
        ite_status: "ite_status",
        migration_name: "migration_name",
        master_plan_name: "master_plan_name",
        mig_id: "mig_id",
        created_at: "created_at",
        created_by: "created_by",
        updated_at: "updated_at",
        updated_by: "updated_by",
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
      defaultSort: { field: "migration_name", direction: "asc" },
      customRenderers: {
        // Clickable ID pattern
        ite_id: function (value, row) {
          if (!value) return "";
          return `<a href="#" class="iteration-id-link btn-table-action" data-action="view" data-id="${value}" 
                    style="color: #205081; text-decoration: none; cursor: pointer;" 
                    title="View iteration details">${value}</a>`;
        },
        // Status with color pattern - Handle numeric status values
        ite_status: function (value, row) {
          // Handle both status objects and numeric values
          let statusName, statusColor;

          console.log(
            "ite_status renderer called with value:",
            value,
            "row:",
            row,
          );

          // First check if statusMetadata is available in row AND has valid name
          if (row && row.statusMetadata && row.statusMetadata.name) {
            statusName = row.statusMetadata.name;
            statusColor = row.statusMetadata.color;
          }
          // Check if value is the status string directly
          else if (typeof value === "string") {
            statusName = value;
            // Check if we have statusMetadata in row for color
            if (
              row &&
              row.statusMetadata &&
              row.statusMetadata.name === value
            ) {
              statusColor = row.statusMetadata.color;
            }
          }
          // Handle numeric status values - map to string equivalents
          else if (typeof value === "number") {
            const statusMap = {
              1: "PLANNING",
              9: "PLANNING",
              10: "IN_PROGRESS",
              11: "COMPLETED",
              12: "CANCELLED",
            };
            statusName = statusMap[value] || `STATUS_${value}`;
          }
          // Legacy handling for object status values
          else if (typeof value === "object" && value !== null) {
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

          console.log(
            "Using statusName:",
            statusName,
            "statusColor:",
            statusColor,
          );

          // Convert status name to display format
          const displayName = statusName
            ? statusName
                .replace(/_/g, " ")
                .toLowerCase()
                .replace(/\b\w/g, (l) => l.toUpperCase())
            : "Unknown";

          // If we have a color, use it directly
          if (statusColor) {
            const textColor = window.UiUtils
              ? window.UiUtils.getContrastingTextColor(statusColor)
              : "#ffffff";
            return `<span class="status-badge" data-status="${statusName}" data-entity-type="Iteration" style="background-color: ${statusColor}; color: ${textColor}; padding: 4px 8px; border-radius: 3px; font-size: 11px; font-weight: 600; display: inline-block;">${displayName}</span>`;
          }

          // Otherwise, create badge with data attributes for async color application
          return `<span class="status-badge" data-status="${statusName}" data-entity-type="Iteration" style="background-color: #999; color: #fff; padding: 4px 8px; border-radius: 3px; font-size: 11px; font-weight: 600; display: inline-block;">${displayName}</span>`;
        },
        // Migration name renderer
        migration_name: function (value, row) {
          if (value && value.trim()) {
            return `<span title="${value}">${value}</span>`;
          }
          if (row && row.migration_name && row.migration_name.trim()) {
            return `<span title="${row.migration_name}">${row.migration_name}</span>`;
          }
          if (row && row.mig_name && row.mig_name.trim()) {
            return `<span title="${row.mig_name}">${row.mig_name}</span>`;
          }
          if (row && row.mig_id) {
            return `<span style="color: #666; font-style: italic;" title="Migration ID: ${row.mig_id}">Migration ${row.mig_id.substring(0, 8)}...</span>`;
          }
          return "-";
        },
        // Master Plan name renderer
        master_plan_name: function (value, row) {
          if (value && value.trim()) {
            return `<span title="${value}">${value}</span>`;
          }
          if (row && row.master_plan_name && row.master_plan_name.trim()) {
            return `<span title="${row.master_plan_name}">${row.master_plan_name}</span>`;
          }
          if (row && row.plm_name && row.plm_name.trim()) {
            return `<span title="${row.plm_name}">${row.plm_name}</span>`;
          }
          if (row && row.plm_id) {
            return `<span style="color: #666; font-style: italic;" title="Plan ID: ${row.plm_id}">Plan ${row.plm_id.substring(0, 8)}...</span>`;
          }
          return "-";
        },
      },
      permissions: ["pilot"],
    },

    migrations: {
      name: "Migrations",
      description: "Manage migration events and their configurations",
      fields: [
        { key: "mig_id", label: "Migration ID", type: "text", readonly: true },
        {
          key: "mig_name",
          label: "Migration Name",
          type: "text",
          required: true,
        },
        { key: "mig_description", label: "Description", type: "textarea" },
        {
          key: "mig_start_date",
          label: "Start Date",
          type: "date",
          required: true,
        },
        {
          key: "mig_end_date",
          label: "End Date",
          type: "date",
          required: true,
        },
        {
          key: "mig_status",
          label: "Status",
          type: "select",
          options: [
            { value: "PLANNING", label: "Planning" },
            { value: "IN_PROGRESS", label: "In Progress" },
            { value: "COMPLETED", label: "Completed" },
            { value: "CANCELLED", label: "Cancelled" },
          ],
        },
        {
          key: "mig_type",
          label: "Migration Type",
          type: "select",
          required: true,
          options: [
            { value: "EXTERNAL", label: "External Acquisition" },
            { value: "INTERNAL", label: "Internal data migration" },
            { value: "MAINTENANCE", label: "Maintenance" },
            { value: "ROLLBACK", label: "Rollback" },
          ],
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
          key: "created_by",
          label: "Created By",
          type: "text",
          readonly: true,
        },
        {
          key: "updated_at",
          label: "Updated",
          type: "datetime",
          readonly: true,
        },
        {
          key: "updated_by",
          label: "Updated By",
          type: "text",
          readonly: true,
        },
      ],
      tableColumns: [
        "mig_name",
        "mig_type",
        "mig_start_date",
        "mig_end_date",
        "mig_status",
        "iteration_count",
        "plan_count",
      ],
      sortMapping: {
        mig_id: "mig_id",
        mig_name: "mig_name",
        mig_type: "mig_type",
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
        mig_status: function (value, row) {
          // Handle both status objects and numeric values
          let statusName, statusColor;

          console.log(
            "mig_status renderer called with value:",
            value,
            "row:",
            row,
          );

          // First check if statusMetadata is available in row AND has valid name
          if (row && row.statusMetadata && row.statusMetadata.name) {
            statusName = row.statusMetadata.name;
            statusColor = row.statusMetadata.color;
          }
          // Check if value is the status string directly
          else if (typeof value === "string") {
            statusName = value;
            // Check if we have statusMetadata in row for color
            if (
              row &&
              row.statusMetadata &&
              row.statusMetadata.name === value
            ) {
              statusColor = row.statusMetadata.color;
            }
          }
          // Legacy handling for object status values
          else if (typeof value === "object" && value !== null) {
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

          console.log(
            "Using statusName:",
            statusName,
            "statusColor:",
            statusColor,
          );

          // Convert status name to display format
          const displayName = statusName
            ? statusName
                .replace(/_/g, " ")
                .toLowerCase()
                .replace(/\b\w/g, (l) => l.toUpperCase())
            : "Unknown";

          // If we have a color, use it directly
          if (statusColor) {
            const textColor = window.UiUtils
              ? window.UiUtils.getContrastingTextColor(statusColor)
              : "#ffffff";
            return `<span class="status-badge" data-status="${statusName}" data-entity-type="Migration" style="background-color: ${statusColor}; color: ${textColor}; padding: 4px 8px; border-radius: 3px; font-size: 11px; font-weight: 600; display: inline-block;">${displayName}</span>`;
          }

          // Otherwise, create badge with data attributes for async color application
          return `<span class="status-badge" data-status="${statusName}" data-entity-type="Migration" style="background-color: #999; color: #fff; padding: 4px 8px; border-radius: 3px; font-size: 11px; font-weight: 600; display: inline-block;">${displayName}</span>`;
        },
        mig_type: function (value, row) {
          // Map migration type values to user-friendly labels
          const typeLabels = {
            EXTERNAL: "External Acquisition",
            INTERNAL: "Internal data migration",
            MAINTENANCE: "Maintenance",
            ROLLBACK: "Rollback",
          };

          const displayLabel = typeLabels[value] || value || "Unknown";

          // Return styled badge for migration type
          return `<span class="migration-type-badge" style="background-color: #f4f4f4; color: #333; padding: 4px 8px; border-radius: 3px; font-size: 11px; font-weight: 500; display: inline-block; border: 1px solid #ddd;">${displayLabel}</span>`;
        },
      },
      modalFields: [
        "mig_id",
        "mig_name",
        "mig_description",
        "mig_type",
        "mig_start_date",
        "mig_end_date",
        "mig_status",
        "created_at",
        "created_by",
        "updated_at",
        "updated_by",
      ],
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
            { value: "CANCELLED", label: "Cancelled" },
          ],
        },
        {
          id: "export_selected",
          label: "Export Selected",
          icon: "📄",
          requiresInput: false,
        },
      ],
      defaultSort: { field: "mig_name", direction: "asc" },
    },

    plans: {
      name: "Plans",
      description: "Manage master plans and plan instances for migrations",
      endpoint: "/plans/master", // FIXED: Use master endpoint for Master Plans
      fields: [
        { key: "plm_id", label: "Plan ID", type: "text", readonly: true },
        { key: "plm_name", label: "Plan Name", type: "text", required: true },
        { key: "plm_description", label: "Description", type: "textarea" },
        {
          key: "tms_id",
          label: "Team",
          type: "select",
          required: true,
          entityType: "teams",
          displayField: "tms_name",
          valueField: "tms_id",
        },
        {
          key: "tms_name",
          label: "Team Name",
          type: "text",
          readonly: true,
          computed: true,
        },
        {
          key: "plm_status",
          label: "Status",
          type: "select",
          options: [
            { value: "PLANNING", label: "Planning" },
            { value: "IN_PROGRESS", label: "In Progress" },
            { value: "COMPLETED", label: "Completed" },
            { value: "CANCELLED", label: "Cancelled" },
          ],
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
          key: "created_by",
          label: "Created By",
          type: "text",
          readonly: true,
        },
        {
          key: "updated_at",
          label: "Updated",
          type: "datetime",
          readonly: true,
        },
        {
          key: "updated_by",
          label: "Updated By",
          type: "text",
          readonly: true,
        },
      ],
      tableColumns: [
        "plm_name",
        "tms_name",
        "plm_status",
        "sequence_count",
        "instance_count",
      ],
      sortMapping: {
        plm_id: "plm_id",
        plm_name: "plm_name",
        tms_name: "tms_name",
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

          console.log(
            "plm_status renderer called with value:",
            value,
            "row:",
            row,
          );

          // Enhanced status metadata handling
          if (row && row.statusMetadata && row.statusMetadata.name) {
            statusName = row.statusMetadata.name;
            statusColor = row.statusMetadata.color;
          } else if (typeof value === "string") {
            statusName = value;
            if (
              row &&
              row.statusMetadata &&
              row.statusMetadata.name === value
            ) {
              statusColor = row.statusMetadata.color;
            }
          } else if (typeof value === "object" && value !== null) {
            statusName = value.sts_name || value.name;
            statusColor = value.sts_color || value.color;
          } else if (row && row.sts_name) {
            statusName = row.sts_name;
            statusColor = row.sts_color;
          } else {
            statusName = value || "Unknown";
            statusColor = "#999999";
          }

          return `<span class="status-badge" style="background-color: ${statusColor || "#999999"}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${statusName}</span>`;
        },
      },
      // Feature flags to disable bulk operations
      featureFlags: {
        enableBulkActions: false,
        enableExport: false,
        enableRowSelection: false,
      },
      modalFields: [
        "plm_id",
        "plm_name",
        "plm_description",
        "tms_id",
        "plm_status",
        "created_at",
        "created_by",
        "updated_at",
        "updated_by",
      ],
      defaultSort: { field: "plm_name", direction: "asc" },
      permissions: ["superadmin"],
      
      // VIEW MODE DISPLAY MAPPING - Maps ID fields to their human-readable display fields
      // This enables VIEW modal to show names instead of IDs while preserving EDIT modal dropdowns
      viewDisplayMapping: {
        "tms_id": "tms_name"     // Team ID → Team Name
      },
    },

    // Plan Instances configuration (PILOT section)
    plansinstance: {
      name: "Plans",
      description: "Manage plan instances for iterations",
      endpoint: "/plans", // Instance endpoint (not /plans/master)
      fields: [
        { key: "pli_id", label: "Instance ID", type: "uuid", readonly: true },
        { key: "pli_name", label: "Plan Name", type: "text", required: true },
        { key: "pli_description", label: "Description", type: "textarea" },
        {
          key: "plm_id",
          label: "Master Plan ID",
          type: "uuid",
          readonly: true,
        },
        { key: "plm_name", label: "Master Plan", type: "text", readonly: true },
        { key: "ite_id", label: "Iteration ID", type: "uuid", required: true },
        { key: "itr_name", label: "Iteration", type: "text", readonly: true },
        { key: "pli_status", label: "Status", type: "dropdown", options: [] },
        {
          key: "created_by",
          label: "Created By",
          type: "text",
          readonly: true,
        },
        {
          key: "created_at",
          label: "Created At",
          type: "datetime",
          readonly: true,
        },
        {
          key: "updated_by",
          label: "Updated By",
          type: "text",
          readonly: true,
        },
        {
          key: "updated_at",
          label: "Updated At",
          type: "datetime",
          readonly: true,
        },
      ],
      tableColumns: [
        "pli_id",
        "pli_name",
        "plm_name",
        "itr_name",
        "pli_status",
      ],
      modalFields: ["pli_name", "pli_description", "ite_id", "pli_status"],
      searchFields: ["pli_name", "pli_description", "plm_name"],
      defaultSort: { field: "pli_name", direction: "asc" },
      columnMap: {
        pli_id: "pli_id",
        pli_name: "pli_name",
        pli_status: "pli_status",
        plm_name: "plm_name",
        itr_name: "itr_name",
        created_at: "created_at",
        updated_at: "updated_at",
      },
      filters: [],
      customRenderers: {
        // Clickable ID pattern
        pli_id: function (value, row) {
          if (!value) return "";
          return `<a href="#" class="plan-instance-link btn-table-action" data-action="view" data-id="${value}" 
                    style="color: #205081; text-decoration: none; cursor: pointer;" 
                    title="View plan instance details">${value}</a>`;
        },
        // Status with color pattern
        pli_status: function (value, row) {
          let statusName, statusColor;

          // Enhanced status metadata handling
          if (row && row.statusMetadata && row.statusMetadata.name) {
            statusName = row.statusMetadata.name;
            statusColor = row.statusMetadata.color;
          } else if (typeof value === "string") {
            statusName = value;
            statusColor = "#999999";
          } else if (typeof value === "object" && value !== null) {
            statusName = value.sts_name || value.name;
            statusColor = value.sts_color || value.color;
          } else if (row && row.sts_name) {
            statusName = row.sts_name;
            statusColor = row.sts_color;
          } else {
            statusName = value || "Unknown";
            statusColor = "#999999";
          }

          return `<span class="status-badge" style="background-color: ${statusColor || "#999999"}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${statusName}</span>`;
        },
      },
      // Feature flags to disable bulk operations
      featureFlags: {
        enableBulkActions: false,
        enableExport: false,
        enableRowSelection: false,
        enableSelectAll: false,
      },
      permissions: ["confluence-users"], // Available to PILOT users
    },

    // Sequence Instances configuration (PILOT section)
    sequencesinstance: {
      name: "Sequences",
      description: "Manage sequence instances for plans",
      endpoint: "/sequences", // Instance endpoint
      fields: [
        { key: "sqi_id", label: "Instance ID", type: "uuid", readonly: true },
        {
          key: "sqi_name",
          label: "Sequence Name",
          type: "text",
          required: true,
        },
        { key: "sqi_description", label: "Description", type: "textarea" },
        {
          key: "sqm_id",
          label: "Master Sequence ID",
          type: "uuid",
          readonly: true,
        },
        {
          key: "sqm_name",
          label: "Master Sequence",
          type: "text",
          readonly: true,
        },
        {
          key: "pli_id",
          label: "Plan Instance ID",
          type: "uuid",
          required: true,
        },
        {
          key: "pli_name",
          label: "Plan Instance",
          type: "text",
          readonly: true,
        },
        { key: "sqi_order", label: "Order", type: "number", required: true },
        { key: "sqi_status", label: "Status", type: "dropdown", options: [] },
        {
          key: "created_by",
          label: "Created By",
          type: "text",
          readonly: true,
        },
        {
          key: "created_at",
          label: "Created At",
          type: "datetime",
          readonly: true,
        },
        {
          key: "updated_by",
          label: "Updated By",
          type: "text",
          readonly: true,
        },
        {
          key: "updated_at",
          label: "Updated At",
          type: "datetime",
          readonly: true,
        },
      ],
      tableColumns: [
        "sqi_id",
        "sqi_name",
        "sqm_name",
        "pli_name",
        "sqi_order",
        "sqi_status",
      ],
      modalFields: [
        "sqi_name",
        "sqi_description",
        "pli_id",
        "sqi_order",
        "sqi_status",
      ],
      searchFields: ["sqi_name", "sqi_description", "sqm_name"],
      defaultSort: { field: "sqi_order", direction: "asc" },
      columnMap: {
        sqi_id: "sqi_id",
        sqi_name: "sqi_name",
        sqi_status: "sqi_status",
        sqm_name: "sqm_name",
        pli_name: "pli_name",
        sqi_order: "sqi_order",
        created_at: "created_at",
        updated_at: "updated_at",
      },
      filters: [],
      customRenderers: {
        sqi_id: function (value, row) {
          if (!value) return "";
          return `<a href="#" class="sequence-instance-link btn-table-action" data-action="view" data-id="${value}" 
                    style="color: #205081; text-decoration: none; cursor: pointer;" 
                    title="View sequence instance details">${value}</a>`;
        },
        sqi_status: function (value, row) {
          let statusName, statusColor;
          if (row && row.statusMetadata && row.statusMetadata.name) {
            statusName = row.statusMetadata.name;
            statusColor = row.statusMetadata.color;
          } else if (typeof value === "string") {
            statusName = value;
            statusColor = "#999999";
          } else if (typeof value === "object" && value !== null) {
            statusName = value.sts_name || value.name;
            statusColor = value.sts_color || value.color;
          } else if (row && row.sts_name) {
            statusName = row.sts_name;
            statusColor = row.sts_color;
          } else {
            statusName = value || "Unknown";
            statusColor = "#999999";
          }
          return `<span class="status-badge" style="background-color: ${statusColor || "#999999"}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${statusName}</span>`;
        },
      },
      featureFlags: {
        enableBulkActions: false,
        enableExport: false,
        enableRowSelection: false,
        enableSelectAll: false,
      },
      permissions: ["confluence-users"],
    },

    sequencesmaster: {
      name: "Master Sequences",
      description: "Manage master sequence templates within plans",
      endpoint: "/sequences/master", // Use master endpoint for Master Sequences
      fields: [
        {
          key: "sqm_id",
          label: "Master Sequence ID",
          type: "uuid",
          readonly: true,
        },
        {
          key: "sqm_name",
          label: "Sequence Name",
          type: "text",
          required: true,
        },
        { key: "sqm_description", label: "Description", type: "textarea" },
        { key: "sqm_order", label: "Order", type: "number", required: true },
        {
          key: "plm_id",
          label: "Plan",
          type: "select",
          required: true,
          entityType: "plans",
          displayField: "plm_name",
          valueField: "plm_id",
          // Remove hideInView - let viewDisplayMapping handle the display
        },
        {
          key: "predecessor_sqm_id",
          label: "Predecessor Sequence",
          type: "select",
          entityType: "sequencesmaster",
          displayField: "sqm_name",
          valueField: "sqm_id",
          dependsOn: "plm_id",
          filterField: "plm_id",
          // Remove hideInView - let viewDisplayMapping handle the display
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
        {
          key: "created_by",
          label: "Created By",
          type: "text",
          readonly: true,
        },
        {
          key: "updated_by",
          label: "Updated By",
          type: "text",
          readonly: true,
        },
      ],
      tableColumns: [
        "sqm_name",
        "plm_name",
        "sqm_order",
        "phase_count",
        "instance_count",
      ],
      sortMapping: {
        sqm_id: "sqm_id",
        sqm_name: "sqm_name",
        plm_name: "plm_name",
        sqm_order: "sqm_order",
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
          endpoint: "/plans/master",
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
        // Plan name renderer
        plm_name: function (value, row) {
          if (!value && !row.plm_name) return "-";
          const planName = value || row.plm_name || "-";
          return `<span title="${planName}">${planName}</span>`;
        },
        // Order renderer
        sqm_order: function (value, row) {
          if (value === null || value === undefined) {
            // Try to get from row if not in value
            value = row.sqm_order;
          }
          if (value === null || value === undefined) return "-";
          return `<span style="font-weight: 600;">${value}</span>`;
        },
      },
      // Modal fields for view/edit modals - Plan selection comes first, then predecessor
      modalFields: [
        "sqm_id",
        "plm_id",
        "predecessor_sqm_id",
        "sqm_name",
        "sqm_description",
        "sqm_order",
        "phase_count",
        "instance_count",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
      ],
      // Feature flags to disable bulk operations
      featureFlags: {
        enableBulkActions: false,
        enableExport: false,
        enableRowSelection: false,
      },
      defaultSort: { field: "sqm_name", direction: "asc" },
      
      // VIEW MODE DISPLAY MAPPING - Maps UUID fields to their human-readable display fields
      // This enables VIEW modal to show names instead of UUIDs while preserving EDIT modal dropdowns
      viewDisplayMapping: {
        "plm_id": "plm_name",                // Master Plan ID → Master Plan Name
        "predecessor_sqm_id": "predecessor_name"  // Predecessor Sequence ID → Predecessor Sequence Name
      },
    },

    sequences: {
      name: "Sequences",
      description:
        "Manage master sequences and sequence instances within plans",
      fields: [
        {
          key: "sqm_id",
          label: "Master Sequence ID",
          type: "uuid",
          readonly: true,
        },
        {
          key: "sqm_name",
          label: "Sequence Name",
          type: "text",
          required: true,
        },
        { key: "sqm_description", label: "Description", type: "textarea" },
        {
          key: "sqm_status",
          label: "Status",
          type: "select",
          options: [
            { value: "PLANNING", label: "Planning" },
            { value: "IN_PROGRESS", label: "In Progress" },
            { value: "COMPLETED", label: "Completed" },
            { value: "CANCELLED", label: "Cancelled" },
          ],
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
      tableColumns: ["sqm_name", "sqm_status", "phase_count", "instance_count"],
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
          // Handle both status objects and string values
          let statusName, statusColor;

          console.log(
            "sqm_status renderer called with value:",
            value,
            "row:",
            row,
          );

          // First check if statusMetadata is available in row AND has valid name
          if (row && row.statusMetadata && row.statusMetadata.name) {
            statusName = row.statusMetadata.name;
            statusColor = row.statusMetadata.color;
          }
          // Check if value is the status string directly
          else if (typeof value === "string") {
            statusName = value;
            // Check if we have statusMetadata in row for color
            if (
              row &&
              row.statusMetadata &&
              row.statusMetadata.name === value
            ) {
              statusColor = row.statusMetadata.color;
            }
          }
          // Legacy handling for object status values
          else if (typeof value === "object" && value !== null) {
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

          console.log(
            "Using statusName:",
            statusName,
            "statusColor:",
            statusColor,
          );

          // Convert status name to display format
          const displayName = statusName
            ? statusName
                .replace(/_/g, " ")
                .toLowerCase()
                .replace(/\b\w/g, (l) => l.toUpperCase())
            : "Unknown";

          // If we have a color, use it directly
          if (statusColor) {
            const textColor = window.UiUtils
              ? window.UiUtils.getContrastingTextColor(statusColor)
              : "#ffffff";
            return `<span class="status-badge" data-status="${statusName}" data-entity-type="Sequence" style="background-color: ${statusColor}; color: ${textColor}; padding: 4px 8px; border-radius: 3px; font-size: 11px; font-weight: 600; display: inline-block;">${displayName}</span>`;
          }

          // Otherwise, create badge with data attributes for async color application
          return `<span class="status-badge" data-status="${statusName}" data-entity-type="Sequence" style="background-color: #999; color: #fff; padding: 4px 8px; border-radius: 3px; font-size: 11px; font-weight: 600; display: inline-block;">${displayName}</span>`;
        },
      },
      modalFields: [
        "sqm_id",
        "sqm_name",
        "sqm_description",
        "sqm_status",
        "created_at",
        "updated_at",
      ],
      // Feature flags to disable bulk operations
      featureFlags: {
        enableBulkActions: false,
        enableExport: false,
        enableRowSelection: false,
      },
      defaultSort: { field: "sqm_name", direction: "asc" },
    },

    phasesmaster: {
      name: "Master Phases",
      description: "Manage master phase templates within sequences",
      endpoint: "/phases/master", // Use master endpoint for Master Phases
      fields: [
        {
          key: "phm_id",
          label: "Master Phase ID",
          type: "text",
          readonly: true,
        },
        { key: "phm_name", label: "Phase Name", type: "text", required: true },
        { key: "phm_description", label: "Description", type: "textarea" },
        { key: "phm_order", label: "Order", type: "number", required: true },
        {
          key: "plm_id",
          label: "Master Plan",
          type: "select",
          required: true,
          entityType: "plans",
          displayField: "plm_name",
          valueField: "plm_id",
          hideInView: true, // Hide UUID field in VIEW mode, show plm_name instead
        },
        {
          key: "sqm_id",
          label: "Master Sequence",
          type: "select",
          required: true,
          entityType: "sequencesmaster",
          displayField: "sqm_name",
          valueField: "sqm_id",
          dependsOn: "plm_id",
          filterField: "plm_id",
          hideInView: true, // Hide UUID field in VIEW mode, show sqm_name instead
        },
        {
          key: "predecessor_phm_id",
          label: "Predecessor Phase",
          type: "select",
          entityType: "phasesmaster",
          displayField: "phm_name",
          valueField: "phm_id",
          dependsOn: "sqm_id",
          filterField: "sqm_id",
          hideInView: true, // Hide UUID field in VIEW mode, show predecessor_phm_name instead
        },
        {
          key: "predecessor_phm_name",
          label: "Predecessor Phase",
          type: "text",
          readonly: true,
          computed: true,
        },
        {
          key: "sqm_name",
          label: "Sequence",
          type: "text",
          readonly: true,
          computed: true,
        },
        {
          key: "plm_name",
          label: "Plan",
          type: "text",
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
          key: "created_by",
          label: "Created By",
          type: "text",
          readonly: true,
        },
        {
          key: "updated_at",
          label: "Updated",
          type: "datetime",
          readonly: true,
        },
        {
          key: "updated_by",
          label: "Updated By",
          type: "text",
          readonly: true,
        },
      ],
      tableColumns: [
        "phm_name",
        "sqm_name",
        "plm_name",
        "phm_order",
        "step_count",
        "instance_count",
      ],
      sortMapping: {
        phm_id: "phm_id",
        phm_name: "phm_name",
        sqm_name: "sqm_name",
        plm_name: "plm_name",
        phm_order: "phm_order",
        step_count: "step_count",
        instance_count: "instance_count",
        created_at: "created_at",
        updated_at: "updated_at",
      },
      filters: [
        {
          key: "sequenceId",
          label: "Sequence",
          type: "select",
          endpoint: "/sequences/master",
          valueField: "sqm_id",
          textField: "sqm_name",
          placeholder: "All Sequences",
        },
      ],
      permissions: ["superadmin"],
      customRenderers: {
        // Clickable ID pattern
        phm_id: function (value, row) {
          if (!value) return "";
          return `<a href="#" class="phase-id-link btn-table-action" data-action="view" data-id="${value}" 
                    style="color: #205081; text-decoration: none; cursor: pointer;" 
                    title="View phase details">${value}</a>`;
        },
        // Sequence name renderer
        sqm_name: function (value, row) {
          if (!value && !row.sqm_name) return "-";
          const sequenceName = value || row.sqm_name || "-";
          return `<span title="${sequenceName}">${sequenceName}</span>`;
        },
        // Order renderer
        phm_order: function (value, row) {
          if (value === null || value === undefined) {
            // Try to get from row if not in value
            value = row.phm_order;
          }
          if (value === null || value === undefined) return "-";
          return `<span style="font-weight: 600;">${value}</span>`;
        },
      },
      modalFields: [
        "phm_id",
        "phm_name",
        "phm_description",
        "phm_order",
        // Dropdown/selector fields for EDIT mode (required by ModalManager.js)
        "plm_id",           // Plan selector dropdown (required for editing)
        "sqm_id",           // Sequence selector dropdown (required for editing)
        "predecessor_phm_id", // Predecessor phase selector dropdown (required for editing)
        // Display fields for VIEW mode (computed/readonly fields showing readable names)
        "plm_name",         // Plan name (readonly/computed, for VIEW display)
        "sqm_name",         // Sequence name (readonly/computed, for VIEW display)
        "predecessor_phm_name", // Predecessor name (readonly/computed, for VIEW display)
        "step_count",
        "instance_count",
        "created_at",
        "created_by",
        "updated_at",
        "updated_by",
      ],
      permissions: ["superadmin"],
      // Feature flags to disable bulk operations
      featureFlags: {
        enableBulkActions: false,
        enableExport: false,
        enableRowSelection: false,
      },
      defaultSort: { field: "phm_name", direction: "asc" },
      
      // VIEW MODE DISPLAY MAPPING - Maps UUID fields to their human-readable display fields
      // This enables VIEW modal to show names instead of UUIDs while preserving EDIT modal dropdowns
      viewDisplayMapping: {
        "plm_id": "plm_name",                    // Master Plan ID → Master Plan Name
        "sqm_id": "sqm_name",                    // Master Sequence ID → Master Sequence Name  
        "predecessor_phm_id": "predecessor_phm_name"  // Predecessor Phase ID → Predecessor Phase Name
      },
    },

    steps: {
      name: "Steps",
      description: "Manage step events and their configurations",
      fields: [
        { key: "stm_id", label: "Step ID", type: "text", readonly: true },
        { key: "stm_name", label: "Step Name", type: "text", required: true },
        { key: "stm_description", label: "Description", type: "textarea" },
        {
          key: "stm_status",
          label: "Status",
          type: "select",
          options: [
            { value: "PLANNING", label: "Planning" },
            { value: "IN_PROGRESS", label: "In Progress" },
            { value: "COMPLETED", label: "Completed" },
            { value: "CANCELLED", label: "Cancelled" },
          ],
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
          key: "created_by",
          label: "Created By",
          type: "text",
          readonly: true,
        },
        {
          key: "updated_at",
          label: "Updated",
          type: "datetime",
          readonly: true,
        },
        {
          key: "updated_by",
          label: "Updated By",
          type: "text",
          readonly: true,
        },
      ],
      tableColumns: [
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

          console.log(
            "stm_status renderer called with value:",
            value,
            "row:",
            row,
          );

          // Enhanced status metadata handling
          if (row && row.statusMetadata && row.statusMetadata.name) {
            statusName = row.statusMetadata.name;
            statusColor = row.statusMetadata.color;
          } else if (typeof value === "string") {
            statusName = value;
            if (
              row &&
              row.statusMetadata &&
              row.statusMetadata.name === value
            ) {
              statusColor = row.statusMetadata.color;
            }
          } else if (typeof value === "object" && value !== null) {
            statusName = value.sts_name || value.name;
            statusColor = value.sts_color || value.color;
          } else if (row && row.sts_name) {
            statusName = row.sts_name;
            statusColor = row.sts_color;
          } else {
            statusName = value || "Unknown";
            statusColor = "#999999";
          }

          return `<span class="status-badge" style="background-color: ${statusColor || "#999999"}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${statusName}</span>`;
        },
      },
      modalFields: [
        "stm_id",
        "stm_name",
        "stm_description",
        "stm_status",
        "created_at",
        "updated_at",
      ],
      // Feature flags to disable bulk operations
      featureFlags: {
        enableBulkActions: false,
        enableExport: false,
        enableRowSelection: false,
      },
      defaultSort: { field: "stm_name", direction: "asc" },
      permissions: ["superadmin"],
    },

    instructions: {
      name: "Instructions",
      description: "Manage instruction events and their configurations",
      endpoint: "/instructions",
      fields: [
        {
          key: "inm_id",
          label: "Instruction ID",
          type: "text",
          readonly: true,
        },
        {
          key: "inm_name",
          label: "Instruction Name",
          type: "text",
          required: true,
        },
        { key: "inm_description", label: "Description", type: "textarea" },
        {
          key: "inm_status",
          label: "Status",
          type: "select",
          options: [
            { value: "PLANNING", label: "Planning" },
            { value: "IN_PROGRESS", label: "In Progress" },
            { value: "COMPLETED", label: "Completed" },
            { value: "CANCELLED", label: "Cancelled" },
          ],
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
          key: "created_by",
          label: "Created By",
          type: "text",
          readonly: true,
        },
        {
          key: "updated_at",
          label: "Updated",
          type: "datetime",
          readonly: true,
        },
        {
          key: "updated_by",
          label: "Updated By",
          type: "text",
          readonly: true,
        },
      ],
      tableColumns: [
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

          console.log(
            "inm_status renderer called with value:",
            value,
            "row:",
            row,
          );

          // Enhanced status metadata handling
          if (row && row.statusMetadata && row.statusMetadata.name) {
            statusName = row.statusMetadata.name;
            statusColor = row.statusMetadata.color;
          } else if (typeof value === "string") {
            statusName = value;
            if (
              row &&
              row.statusMetadata &&
              row.statusMetadata.name === value
            ) {
              statusColor = row.statusMetadata.color;
            }
          } else if (typeof value === "object" && value !== null) {
            statusName = value.sts_name || value.name;
            statusColor = value.sts_color || value.color;
          } else if (row && row.sts_name) {
            statusName = row.sts_name;
            statusColor = row.sts_color;
          } else {
            statusName = value || "Unknown";
            statusColor = "#999999";
          }

          return `<span class="status-badge" style="background-color: ${statusColor || "#999999"}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${statusName}</span>`;
        },
      },
      modalFields: [
        "inm_id",
        "inm_name",
        "inm_description",
        "inm_status",
        "created_at",
        "updated_at",
      ],
      // Feature flags to disable bulk operations
      featureFlags: {
        enableBulkActions: false,
        enableExport: false,
        enableRowSelection: false,
      },
      defaultSort: { field: "ins_order", direction: "asc" },
      permissions: ["superadmin"],
    },

    // Phase Instances configuration (PILOT section)
    phasesinstance: {
      name: "Phases",
      description: "Manage phase instances for sequences",
      endpoint: "/phases", // Instance endpoint
      fields: [
        { key: "phi_id", label: "Instance ID", type: "uuid", readonly: true },
        { key: "phi_name", label: "Phase Name", type: "text", required: true },
        { key: "phi_description", label: "Description", type: "textarea" },
        {
          key: "phm_id",
          label: "Master Phase ID",
          type: "uuid",
          readonly: true,
        },
        {
          key: "phm_name",
          label: "Master Phase",
          type: "text",
          readonly: true,
        },
        {
          key: "sqi_id",
          label: "Sequence Instance ID",
          type: "uuid",
          required: true,
        },
        {
          key: "sqi_name",
          label: "Sequence Instance",
          type: "text",
          readonly: true,
        },
        { key: "phi_order", label: "Order", type: "number", required: true },
        { key: "phi_status", label: "Status", type: "dropdown", options: [] },
        {
          key: "created_by",
          label: "Created By",
          type: "text",
          readonly: true,
        },
        {
          key: "created_at",
          label: "Created At",
          type: "datetime",
          readonly: true,
        },
        {
          key: "updated_by",
          label: "Updated By",
          type: "text",
          readonly: true,
        },
        {
          key: "updated_at",
          label: "Updated At",
          type: "datetime",
          readonly: true,
        },
      ],
      tableColumns: [
        "phi_id",
        "phi_name",
        "phm_name",
        "sqi_name",
        "phi_order",
        "phi_status",
      ],
      modalFields: [
        "phi_name",
        "phi_description",
        "sqi_id",
        "phi_order",
        "phi_status",
      ],
      searchFields: ["phi_name", "phi_description", "phm_name"],
      defaultSort: { field: "phi_order", direction: "asc" },
      columnMap: {
        phi_id: "phi_id",
        phi_name: "phi_name",
        phi_status: "phi_status",
        phm_name: "phm_name",
        sqi_name: "sqi_name",
        phi_order: "phi_order",
        created_at: "created_at",
        updated_at: "updated_at",
      },
      filters: [],
      customRenderers: {
        phi_id: function (value, row) {
          if (!value) return "";
          return `<a href="#" class="phase-instance-link btn-table-action" data-action="view" data-id="${value}" 
                    style="color: #205081; text-decoration: none; cursor: pointer;" 
                    title="View phase instance details">${value}</a>`;
        },
        phi_status: function (value, row) {
          let statusName, statusColor;
          if (row && row.statusMetadata && row.statusMetadata.name) {
            statusName = row.statusMetadata.name;
            statusColor = row.statusMetadata.color;
          } else if (typeof value === "string") {
            statusName = value;
            statusColor = "#999999";
          } else if (typeof value === "object" && value !== null) {
            statusName = value.sts_name || value.name;
            statusColor = value.sts_color || value.color;
          } else if (row && row.sts_name) {
            statusName = row.sts_name;
            statusColor = row.sts_color;
          } else {
            statusName = value || "Unknown";
            statusColor = "#999999";
          }
          return `<span class="status-badge" style="background-color: ${statusColor || "#999999"}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${statusName}</span>`;
        },
      },
      featureFlags: {
        enableBulkActions: false,
        enableExport: false,
        enableRowSelection: false,
        enableSelectAll: false,
      },
      permissions: ["confluence-users"],
    },

    "steps-master": {
      name: "Master Steps",
      description: "Manage master step templates within phases",
      endpoint: "/steps/master",
      fields: [
        {
          key: "stm_id",
          label: "Master Step ID",
          type: "text",
          readonly: true,
        },
        { key: "stm_name", label: "Step Name", type: "text", required: true },
        { key: "stm_description", label: "Description", type: "textarea" },
        { key: "stm_order", label: "Order", type: "number", required: true },
        {
          key: "phm_id",
          label: "Phase ID",
          type: "select",
          required: true,
          entityType: "phasesmaster",
          displayField: "phm_name",
          valueField: "phm_id",
        },
        {
          key: "phm_name",
          label: "Phase",
          type: "text",
          readonly: true,
          computed: true,
        },
        {
          key: "sqm_name",
          label: "Sequence",
          type: "text",
          readonly: true,
          computed: true,
        },
        {
          key: "plm_name",
          label: "Plan",
          type: "text",
          readonly: true,
          computed: true,
        },
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
        {
          key: "created_at",
          label: "Created",
          type: "datetime",
          readonly: true,
        },
        {
          key: "created_by",
          label: "Created By",
          type: "text",
          readonly: true,
        },
        {
          key: "updated_at",
          label: "Updated",
          type: "datetime",
          readonly: true,
        },
        {
          key: "updated_by",
          label: "Updated By",
          type: "text",
          readonly: true,
        },
        // Additional fields for VIEW modal display
        {
          key: "team_name",
          label: "Owning Team",
          type: "text",
          readonly: true,
          computed: true,
        },
        {
          key: "step_code",
          label: "Step Code",
          type: "text",
          readonly: true,
          computed: true,
        },
        {
          key: "stm_duration_minutes",
          label: "Duration (mins)",
          type: "number",
          readonly: true,
        },
        {
          key: "environment_role_name",
          label: "Environment Role",
          type: "text",
          readonly: true,
          computed: true,
        },
        {
          key: "predecessor_name",
          label: "Predecessor Step",
          type: "text",
          readonly: true,
          computed: true,
        },
        {
          key: "predecessor_code",
          label: "Predecessor Code",
          type: "text",
          readonly: true,
          computed: true,
        },
      ],
      tableColumns: [
        "stm_name",
        "plm_name",
        "sqm_name",
        "phm_name",
        "stm_order",
        "instruction_count",
        "instance_count",
      ],
      sortMapping: {
        stm_id: "stm_id",
        stm_name: "stm_name",
        plm_name: "plm_name",
        sqm_name: "sqm_name",
        phm_name: "phm_name",
        stm_order: "stm_order",
        instruction_count: "instruction_count",
        instance_count: "instance_count",
        created_at: "created_at",
        updated_at: "updated_at",
      },
      filters: [
        {
          key: "phaseId",
          label: "Phase",
          type: "select",
          endpoint: "/phases/master",
          valueField: "phm_id",
          textField: "phm_name",
          placeholder: "All Phases",
        },
      ],
      modalFields: [
        "stm_id",
        "stm_name",
        "stm_description",
        "step_code", // NEW: User-friendly step code (XXX-nnnn format)
        "phm_id", // Keep for EDIT mode
        "phm_name", // Add for VIEW display - Phase name
        "sqm_name", // Add for VIEW display - Sequence name
        "plm_name", // Add for VIEW display - Plan name
        "stm_order",
        "team_name", // NEW: Owning team name
        "stm_duration_minutes", // NEW: Duration in minutes
        "environment_role_name", // NEW: Environment role name
        "predecessor_name", // NEW: Predecessor step name
        "predecessor_code", // NEW: Predecessor step code
        "created_at",
        "created_by",
        "updated_at",
        "updated_by",
      ],
      permissions: ["superadmin"],
      customRenderers: {
        // Clickable ID pattern
        stm_id: function (value, row) {
          if (!value) return "";
          return `<a href="#" class="step-id-link btn-table-action" data-action="view" data-id="${value}" 
                    style="color: #205081; text-decoration: none; cursor: pointer;" 
                    title="View step details">${value}</a>`;
        },
        // Plan name renderer
        plm_name: function (value, row) {
          if (!value && !row.plm_name) return "-";
          const planName = value || row.plm_name || "-";
          return `<span title="${planName}">${planName}</span>`;
        },
        // Sequence name renderer
        sqm_name: function (value, row) {
          if (!value && !row.sqm_name) return "-";
          const sequenceName = value || row.sqm_name || "-";
          return `<span title="${sequenceName}">${sequenceName}</span>`;
        },
        // Phase name renderer
        phm_name: function (value, row) {
          if (!value && !row.phm_name) return "-";
          const phaseName = value || row.phm_name || "-";
          return `<span title="${phaseName}">${phaseName}</span>`;
        },
        // Order renderer
        stm_order: function (value, row) {
          if (value === null || value === undefined) {
            // Try to get from row if not in value
            value = row.stm_order;
          }
          if (value === null || value === undefined) return "-";
          return `<span style="font-weight: 600;">${value}</span>`;
        },
      },
      // Feature flags to disable bulk operations
      featureFlags: {
        enableBulkActions: false,
        enableExport: false,
        enableRowSelection: false,
      },
    },

    "controls-master": {
      name: "Master Controls",
      description: "Manage master control templates within instructions",
      endpoint: "/controls/master",
      fields: [
        {
          key: "ctm_id",
          label: "Master Control ID",
          type: "text",
          readonly: true,
        },
        {
          key: "ctm_code",
          label: "Control Code",
          type: "text",
          required: true,
        },
        {
          key: "ctm_name",
          label: "Control Name",
          type: "text",
          required: true,
        },
        { key: "ctm_description", label: "Description", type: "textarea" },
        { key: "ctm_type", label: "Control Type", type: "text" },
        { key: "ctm_is_critical", label: "Critical", type: "boolean" },
        { key: "ctm_order", label: "Order", type: "number", required: true },
        {
          key: "plm_id",
          label: "Master Plan",
          type: "select",
          required: true,
          entityType: "plans",
          displayField: "plm_name",
          valueField: "plm_id",
          hideInView: true, // Hide UUID field in VIEW mode, show plm_name instead
        },
        {
          key: "sqm_id",
          label: "Master Sequence",
          type: "select",
          required: true,
          entityType: "sequencesmaster",
          displayField: "sqm_name",
          valueField: "sqm_id",
          dependsOn: "plm_id",
          filterField: "plm_id",
          hideInView: true, // Hide UUID field in VIEW mode, show sqm_name instead
        },
        {
          key: "phm_id",
          label: "Master Phase",
          type: "select",
          required: true,
          entityType: "phasesmaster",
          displayField: "phm_name",
          valueField: "phm_id",
          dependsOn: "sqm_id",
          filterField: "sqm_id",
          hideInView: true, // Hide UUID field in VIEW mode, show phm_name instead
        },
        {
          key: "phm_name",
          label: "Phase",
          type: "text",
          readonly: true,
          computed: true,
        },
        {
          key: "sqm_name",
          label: "Sequence",
          type: "text",
          readonly: true,
          computed: true,
        },
        {
          key: "plm_name",
          label: "Plan",
          type: "text",
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
          key: "validation_count",
          label: "Validations",
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
          key: "created_by",
          label: "Created By",
          type: "text",
          readonly: true,
        },
        {
          key: "updated_at",
          label: "Updated",
          type: "datetime",
          readonly: true,
        },
        {
          key: "updated_by",
          label: "Updated By",
          type: "text",
          readonly: true,
        },
      ],
      tableColumns: [
        "ctm_code",
        "ctm_name",
        "hierarchy",
        "ctm_type",
        "ctm_is_critical",
        "instance_count",
        "validation_count",
      ],
      sortMapping: {
        ctm_id: "ctm_id",
        ctm_code: "ctm_code",
        ctm_name: "ctm_name",
        ctm_description: "ctm_description",
        ctm_type: "ctm_type",
        ctm_is_critical: "ctm_is_critical",
        ctm_order: "ctm_order",
        hierarchy: "plm_name", // Sort hierarchy by Plan name (top level of hierarchy)
        phm_name: "phm_name",
        sqm_name: "sqm_name",
        plm_name: "plm_name",
        instance_count: "instance_count",
        validation_count: "validation_count",
        created_at: "created_at",
        created_by: "created_by",
        updated_at: "updated_at",
        updated_by: "updated_by",
      },
      filters: [
        {
          key: "phaseId",
          label: "Phase",
          type: "select",
          endpoint: "/phases/master",
          valueField: "phm_id",
          textField: "phm_name",
          placeholder: "All Phases",
        },
      ],
      permissions: ["superadmin"],
      customRenderers: {
        // Clickable ID pattern
        ctm_id: function (value, row) {
          if (!value) return "";
          return `<a href="#" class="control-id-link btn-table-action" data-action="view" data-id="${value}" 
                    style="color: #205081; text-decoration: none; cursor: pointer;" 
                    title="View control details">${value}</a>`;
        },
        // Control Code with styling for prominence
        ctm_code: function (value, row) {
          if (!value) return "";
          return `<span class="control-code" style="font-weight: 600; color: #205081; font-family: monospace;">${value}</span>`;
        },
        // Hierarchy display - Plan > Sequence > Phase
        hierarchy: function (value, row) {
          const planName = row.plm_name || "Unknown Plan";
          const sequenceName = row.sqm_name || "Unknown Sequence";
          const phaseName = row.phm_name || "Unknown Phase";
          return `<span class="hierarchy-path" style="font-size: 11px; color: #666; font-style: italic;">${planName} &gt; ${sequenceName} &gt; ${phaseName}</span>`;
        },
      },
      modalFields: [
        "ctm_id",
        "ctm_code",
        "ctm_name",
        "ctm_description",
        "ctm_type",
        "ctm_is_critical",
        "ctm_order",
        // Dropdown/selector fields for EDIT mode (required by ModalManager.js)
        "plm_id",           // Plan selector dropdown (required for editing)
        "sqm_id",           // Sequence selector dropdown (required for editing)
        "phm_id",           // Phase selector dropdown (required for editing)
        // Display fields for VIEW mode (computed/readonly fields showing readable names)
        "plm_name",         // Plan name (readonly/computed, for VIEW display)
        "sqm_name",         // Sequence name (readonly/computed, for VIEW display)
        "phm_name",         // Phase name (readonly/computed, for VIEW display)
        "instance_count",
        "validation_count",
        "created_at",
        "created_by",
        "updated_at",
        "updated_by",
      ],
      permissions: ["superadmin"],
      // Feature flags to disable bulk operations
      featureFlags: {
        enableBulkActions: false,
        enableExport: false,
        enableRowSelection: false,
      },
      defaultSort: { field: "ctm_name", direction: "asc" },
      
      // VIEW MODE DISPLAY MAPPING - Maps UUID fields to their human-readable display fields
      // This enables VIEW modal to show names instead of UUIDs while preserving EDIT modal dropdowns
      viewDisplayMapping: {
        "plm_id": "plm_name",     // Master Plan ID → Master Plan Name
        "sqm_id": "sqm_name",     // Master Sequence ID → Master Sequence Name  
        "phm_id": "phm_name"      // Master Phase ID → Master Phase Name
      },
    },

    controls: {
      name: "Controls",
      description: "Manage control events and their configurations",
      fields: [
        { key: "ctm_id", label: "Control ID", type: "text", readonly: true },
        {
          key: "ctm_name",
          label: "Control Name",
          type: "text",
          required: true,
        },
        { key: "ctm_description", label: "Description", type: "textarea" },
        { key: "ctm_type", label: "Control Type", type: "text" },
        { key: "ctm_is_critical", label: "Critical", type: "boolean" },
        { key: "ctm_order", label: "Order", type: "number", required: true },
        {
          key: "ctm_status",
          label: "Status",
          type: "select",
          options: [
            { value: "PLANNING", label: "Planning" },
            { value: "IN_PROGRESS", label: "In Progress" },
            { value: "COMPLETED", label: "Completed" },
            { value: "CANCELLED", label: "Cancelled" },
          ],
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
          key: "created_by",
          label: "Created By",
          type: "text",
          readonly: true,
        },
        {
          key: "updated_at",
          label: "Updated",
          type: "datetime",
          readonly: true,
        },
        {
          key: "updated_by",
          label: "Updated By",
          type: "text",
          readonly: true,
        },
      ],
      tableColumns: [
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

          console.log(
            "ctm_status renderer called with value:",
            value,
            "row:",
            row,
          );

          // Enhanced status metadata handling
          if (row && row.statusMetadata && row.statusMetadata.name) {
            statusName = row.statusMetadata.name;
            statusColor = row.statusMetadata.color;
          } else if (typeof value === "string") {
            statusName = value;
            if (
              row &&
              row.statusMetadata &&
              row.statusMetadata.name === value
            ) {
              statusColor = row.statusMetadata.color;
            }
          } else if (typeof value === "object" && value !== null) {
            statusName = value.sts_name || value.name;
            statusColor = value.sts_color || value.color;
          } else if (row && row.sts_name) {
            statusName = row.sts_name;
            statusColor = row.sts_color;
          } else {
            statusName = value || "Unknown";
            statusColor = "#999999";
          }

          return `<span class="status-badge" style="background-color: ${statusColor || "#999999"}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${statusName}</span>`;
        },
      },
      modalFields: [
        "ctm_id",
        "ctm_name",
        "ctm_description",
        "ctm_type",
        "ctm_is_critical",
        "ctm_order",
        "ctm_status",
        "created_at",
        "updated_at",
      ],
      // Feature flags to disable bulk operations
      featureFlags: {
        enableBulkActions: false,
        enableExport: false,
        enableRowSelection: false,
      },
      permissions: ["superadmin"],
    },

    "controls-instance": {
      name: "Controls",
      description: "Manage control instances for iterations",
      endpoint: "/controls",
      fields: [
        { key: "cti_id", label: "Instance ID", type: "uuid", readonly: true },
        {
          key: "cti_name",
          label: "Control Name",
          type: "text",
          required: true,
        },
        { key: "cti_description", label: "Description", type: "textarea" },
        {
          key: "ctm_id",
          label: "Master Control ID",
          type: "uuid",
          readonly: true,
        },
        {
          key: "ctm_name",
          label: "Master Control",
          type: "text",
          readonly: true,
        },
        { key: "cti_status", label: "Status", type: "dropdown", options: [] },
        { key: "cti_is_critical", label: "Critical", type: "boolean" },
        {
          key: "created_by",
          label: "Created By",
          type: "text",
          readonly: true,
        },
        {
          key: "created_at",
          label: "Created At",
          type: "datetime",
          readonly: true,
        },
        {
          key: "updated_by",
          label: "Updated By",
          type: "text",
          readonly: true,
        },
        {
          key: "updated_at",
          label: "Updated At",
          type: "datetime",
          readonly: true,
        },
      ],
      tableColumns: [
        "cti_id",
        "cti_name",
        "ctm_name",
        "cti_status",
        "cti_is_critical",
      ],
      modalFields: [
        "cti_name",
        "cti_description",
        "cti_status",
        "cti_is_critical",
      ],
      searchFields: ["cti_name", "cti_description", "ctm_name"],
      defaultSort: { field: "cti_name", direction: "asc" },
      columnMap: {
        cti_id: "cti_id",
        cti_name: "cti_name",
        cti_status: "cti_status",
        ctm_name: "ctm_name",
        cti_is_critical: "cti_is_critical",
        created_at: "created_at",
        updated_at: "updated_at",
      },
      filters: [],
      customRenderers: {
        // Clickable ID pattern
        cti_id: function (value, row) {
          if (!value) return "";
          return `<a href="#" class="control-instance-link btn-table-action" data-action="view" data-id="${value}" 
                    style="color: #205081; text-decoration: none; cursor: pointer;" 
                    title="View control instance details">${value}</a>`;
        },
        // Status with color pattern
        cti_status: function (value, row) {
          let statusName, statusColor;

          // Enhanced status metadata handling
          if (row && row.statusMetadata && row.statusMetadata.name) {
            statusName = row.statusMetadata.name;
            statusColor = row.statusMetadata.color;
          } else if (typeof value === "string") {
            statusName = value;
            statusColor = "#999999";
          } else if (typeof value === "object" && value !== null) {
            statusName = value.sts_name || value.name;
            statusColor = value.sts_color || value.color;
          } else if (row && row.sts_name) {
            statusName = row.sts_name;
            statusColor = row.sts_color;
          } else {
            statusName = value || "Unknown";
            statusColor = "#999999";
          }

          return `<span class="status-badge" style="background-color: ${statusColor || "#999999"}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${statusName}</span>`;
        },
      },
      // Feature flags to disable bulk operations
      featureFlags: {
        enableBulkActions: false,
        enableExport: false,
        enableRowSelection: false,
        enableSelectAll: false,
      },
      permissions: ["confluence-users"], // Available to PILOT users
    },

    // ==================== NORMALIZED DASH-SEPARATED ENTITY CONFIGURATIONS ====================
    // These configurations use consistent dash separators for AdminGuiState compatibility

    // Master entity configurations (ADMIN sections)
    "plans-master": {
      name: "Master Plans",
      description: "Manage master plan templates",
      endpoint: "/plans/master",
      fields: [
        { key: "plm_id", label: "Plan ID", type: "text", readonly: true },
        { key: "plm_name", label: "Plan Name", type: "text", required: true },
        { key: "plm_description", label: "Description", type: "textarea" },
        { key: "plm_order", label: "Order", type: "number", min: 1 },
        { key: "plm_is_active", label: "Active", type: "boolean", defaultValue: true },
      ],
      tableColumns: ["plm_name", "plm_description", "plm_order", "plm_is_active"],
      searchFields: ["plm_name", "plm_description"],
      actions: {
        view: true,
        edit: true,
        delete: true,
        create: true,
      },
      ui: {
        enableBulkActions: false,
        enableExport: false,
        enableRowSelection: false,
        enableSelectAll: false,
      },
      defaultSort: { field: "plm_order", direction: "asc" },
      permissions: ["superadmin"],
    },

    "sequences-master": {
      name: "Master Sequences", 
      description: "Manage master sequence templates within plans",
      endpoint: "/sequences/master",
      fields: [
        { key: "sqm_id", label: "Sequence ID", type: "uuid", readonly: true },
        { key: "sqm_name", label: "Sequence Name", type: "text", required: true },
        { key: "sqm_description", label: "Description", type: "textarea" },
        {
          key: "plm_id",
          label: "Plan",
          type: "select",
          required: true,
          entityType: "plans-master",
          displayField: "plm_name",
          valueField: "plm_id",
          hideInView: true, // Hide UUID field in VIEW mode, show plm_name instead
        },
        {
          key: "predecessor_sqm_id",
          label: "Predecessor Sequence",
          type: "select",
          entityType: "sequences-master",
          displayField: "sqm_name",
          valueField: "sqm_id",
          dependsOn: "plm_id",
          filterField: "plm_id",
          hideInView: true, // Hide UUID field in VIEW mode, show predecessor_name instead
        },
        {
          key: "plm_name",
          label: "Plan",
          type: "text",
          readonly: true,
          hideInEdit: true, // Only show in VIEW mode
        },
        {
          key: "predecessor_name",
          label: "Predecessor Sequence",
          type: "text",
          readonly: true,
          hideInEdit: true, // Only show in VIEW mode
        },
        { key: "sqm_order", label: "Order", type: "number", min: 1 },
        { key: "sqm_is_active", label: "Active", type: "boolean", defaultValue: true },
      ],
      tableColumns: ["sqm_name", "sqm_description", "plm_name", "sqm_order", "sqm_is_active"],
      searchFields: ["sqm_name", "sqm_description"],
      actions: {
        view: true,
        edit: true,
        delete: true,
        create: true,
      },
      ui: {
        enableBulkActions: false,
        enableExport: false,
        enableRowSelection: false,
        enableSelectAll: false,
      },
      defaultSort: { field: "sqm_order", direction: "asc" },
      permissions: ["superadmin"],
    },

    "phases-master": {
      name: "Master Phases",
      description: "Manage master phase templates within sequences",
      endpoint: "/phases/master",
      fields: [
        { key: "phm_id", label: "Phase ID", type: "uuid", readonly: true },
        { key: "phm_name", label: "Phase Name", type: "text", required: true },
        { key: "phm_description", label: "Description", type: "textarea" },
        {
          key: "plm_id",
          label: "Master Plan",
          type: "select",
          required: true,
          entityType: "plans-master",
          displayField: "plm_name",
          valueField: "plm_id",
        },
        {
          key: "sqm_id",
          label: "Master Sequence",
          type: "select", 
          required: true,
          entityType: "sequences-master",
          displayField: "sqm_name",
          valueField: "sqm_id",
          dependsOn: "plm_id",
        },
        { key: "phm_order", label: "Order", type: "number", min: 1 },
        { key: "phm_is_active", label: "Active", type: "boolean", defaultValue: true },
      ],
      tableColumns: ["phm_name", "phm_description", "sqm_name", "phm_order", "phm_is_active"],
      searchFields: ["phm_name", "phm_description"],
      actions: {
        view: true,
        edit: true,
        delete: true,
        create: true,
      },
      ui: {
        enableBulkActions: false,
        enableExport: false,
        enableRowSelection: false,
        enableSelectAll: false,
      },
      defaultSort: { field: "phm_order", direction: "asc" },
      permissions: ["superadmin"],
    },

    // Instance entity configurations (PILOT sections)
    "plans-instance": {
      name: "Plans",
      description: "Manage plan instances for iterations",
      endpoint: "/plans",
      fields: [
        { key: "pli_id", label: "Instance ID", type: "uuid", readonly: true },
        { key: "pli_name", label: "Plan Name", type: "text", required: true },
        { key: "pli_description", label: "Description", type: "textarea" },
        {
          key: "plm_id",
          label: "Master Plan",
          type: "select",
          required: true,
          entityType: "plans-master",
          displayField: "plm_name",
          valueField: "plm_id",
        },
        {
          key: "iti_id",
          label: "Iteration",
          type: "select",
          required: true,
          entityType: "iterations",
          displayField: "iti_name",
          valueField: "iti_id",
        },
        { key: "pli_order", label: "Order", type: "number", min: 1 },
        { key: "pli_is_active", label: "Active", type: "boolean", defaultValue: true },
      ],
      tableColumns: ["pli_name", "pli_description", "plm_name", "iti_name", "pli_order", "pli_is_active"],
      searchFields: ["pli_name", "pli_description"],
      actions: {
        view: true,
        edit: true,
        delete: true,
        create: true,
      },
      ui: {
        enableBulkActions: false,
        enableExport: false,
        enableRowSelection: false,
        enableSelectAll: false,
      },
      defaultSort: { field: "pli_order", direction: "asc" },
      permissions: ["confluence-users"],
    },

    "sequences-instance": {
      name: "Sequences",
      description: "Manage sequence instances for plans",
      endpoint: "/sequences",
      fields: [
        { key: "sqi_id", label: "Instance ID", type: "uuid", readonly: true },
        { key: "sqi_name", label: "Sequence Name", type: "text", required: true },
        { key: "sqi_description", label: "Description", type: "textarea" },
        {
          key: "sqm_id",
          label: "Master Sequence",
          type: "select",
          required: true,
          entityType: "sequences-master",
          displayField: "sqm_name",
          valueField: "sqm_id",
        },
        {
          key: "pli_id",
          label: "Plan Instance",
          type: "select",
          required: true,
          entityType: "plans-instance",
          displayField: "pli_name",
          valueField: "pli_id",
        },
        { key: "sqi_order", label: "Order", type: "number", min: 1 },
        { key: "sqi_is_active", label: "Active", type: "boolean", defaultValue: true },
      ],
      tableColumns: ["sqi_name", "sqi_description", "sqm_name", "pli_name", "sqi_order", "sqi_is_active"],
      searchFields: ["sqi_name", "sqi_description"],
      actions: {
        view: true,
        edit: true,
        delete: true,
        create: true,
      },
      ui: {
        enableBulkActions: false,
        enableExport: false,
        enableRowSelection: false,
        enableSelectAll: false,
      },
      defaultSort: { field: "sqi_order", direction: "asc" },
      permissions: ["confluence-users"],
    },

    "phases-instance": {
      name: "Phases",
      description: "Manage phase instances for sequences",
      endpoint: "/phases",
      fields: [
        { key: "phi_id", label: "Instance ID", type: "uuid", readonly: true },
        { key: "phi_name", label: "Phase Name", type: "text", required: true },
        { key: "phi_description", label: "Description", type: "textarea" },
        {
          key: "phm_id",
          label: "Master Phase",
          type: "select",
          required: true,
          entityType: "phases-master",
          displayField: "phm_name",
          valueField: "phm_id",
        },
        {
          key: "sqi_id",
          label: "Sequence Instance",
          type: "select",
          required: true,
          entityType: "sequences-instance",
          displayField: "sqi_name",
          valueField: "sqi_id",
        },
        { key: "phi_order", label: "Order", type: "number", min: 1 },
        { key: "phi_is_active", label: "Active", type: "boolean", defaultValue: true },
      ],
      tableColumns: ["phi_name", "phi_description", "phm_name", "sqi_name", "phi_order", "phi_is_active"],
      searchFields: ["phi_name", "phi_description"],
      actions: {
        view: true,
        edit: true,
        delete: true,
        create: true,
      },
      ui: {
        enableBulkActions: false,
        enableExport: false,
        enableRowSelection: false,
        enableSelectAll: false,
      },
      defaultSort: { field: "phi_order", direction: "asc" },
      permissions: ["confluence-users"],
    },

    "steps-instance": {
      name: "Steps",
      description: "Manage step instances for phases",
      endpoint: "/steps",
      fields: [
        { key: "sti_id", label: "Instance ID", type: "uuid", readonly: true },
        { key: "sti_name", label: "Step Name", type: "text", required: true },
        { key: "sti_description", label: "Description", type: "textarea" },
        {
          key: "stm_id",
          label: "Master Step",
          type: "select",
          required: true,
          entityType: "steps-master",
          displayField: "stm_name",
          valueField: "stm_id",
        },
        {
          key: "phi_id",
          label: "Phase Instance",
          type: "select",
          required: true,
          entityType: "phases-instance",
          displayField: "phi_name",
          valueField: "phi_id",
        },
        { key: "sti_order", label: "Order", type: "number", min: 1 },
        { key: "sti_is_active", label: "Active", type: "boolean", defaultValue: true },
      ],
      tableColumns: ["sti_name", "sti_description", "stm_name", "phi_name", "sti_order", "sti_is_active"],
      searchFields: ["sti_name", "sti_description"],
      actions: {
        view: true,
        edit: true,
        delete: true,
        create: true,
      },
      ui: {
        enableBulkActions: false,
        enableExport: false,
        enableRowSelection: false,
        enableSelectAll: false,
      },
      defaultSort: { field: "sti_order", direction: "asc" },
      permissions: ["confluence-users"],
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
      iterations: "/iterationsList",
      iterationTypes: "/iterationTypes",
      labels: "/labels",
      migrations: "/migrations",
      
      // Legacy endpoints (maintained for backward compatibility)
      plans: "/plans/master", // Master plans endpoint
      plansinstance: "/plans", // Plan instances endpoint
      sequences: "/sequences",
      sequencesinstance: "/sequences", // Sequence instances endpoint
      sequencesmaster: "/sequences/master",
      phases: "/phases",
      phasesinstance: "/phases", // Phase instances endpoint
      phasesmaster: "/phases/master",
      steps: "/steps",
      instructions: "/instructions",
      controls: "/controls",
      
      // Normalized dash-separated endpoints (for new AdminGuiState mapping)
      "plans-master": "/plans/master",
      "plans-instance": "/plans",
      "sequences-master": "/sequences/master",
      "sequences-instance": "/sequences",
      "phases-master": "/phases/master",
      "phases-instance": "/phases",
      "steps-master": "/steps/master",
      "steps-instance": "/steps",
      "controls-master": "/controls/master",
      "controls-instance": "/controls",
      
      stepView: "/stepViewApi",
    },
  };

  // Feature flags configuration
  const FEATURE_FLAGS = {
    // Export and bulk functionality features
    enableExportButton: false, // Set to true to show Export button
    enableBulkActions: false, // Set to true to show Bulk Actions button
    enableRowSelection: false, // Set to true to show selection checkboxes
    enableSelectAll: false, // Set to true to show select-all checkbox

    // Additional feature flags for future use
    enableAdvancedFilters: true, // Advanced filtering capabilities
    enableRealTimeSync: true, // Real-time data synchronization
    enableTableActions: true, // Individual row actions (view, edit, delete)
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
