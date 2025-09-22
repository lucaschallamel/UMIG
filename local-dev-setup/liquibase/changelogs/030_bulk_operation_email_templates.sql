-- Bulk Operation Email Templates for US-058 Phase 2A
-- Enhanced email templates for IterationView/StepView bulk operations and iteration events
-- Author: UMIG Project Team
-- Date: 2025-09-22

-- First, add new template types to the constraint
ALTER TABLE email_templates_emt DROP CONSTRAINT IF EXISTS email_templates_emt_emt_type_check;
ALTER TABLE email_templates_emt ADD CONSTRAINT email_templates_emt_emt_type_check
CHECK (emt_type::text = ANY (ARRAY[
    'STEP_OPENED'::character varying,
    'INSTRUCTION_COMPLETED'::character varying,
    'INSTRUCTION_UNCOMPLETED'::character varying,
    'STEP_STATUS_CHANGED'::character varying,
    'STEP_NOTIFICATION_MOBILE'::character varying,
    'STEP_STATUS_CHANGED_WITH_URL'::character varying,
    'STEP_OPENED_WITH_URL'::character varying,
    'INSTRUCTION_COMPLETED_WITH_URL'::character varying,
    'BULK_STEP_STATUS_CHANGED'::character varying,
    'ITERATION_EVENT'::character varying,
    'CUSTOM'::character varying
]::text[]));

-- ==================================================
-- BULK_STEP_STATUS_CHANGED Template for Consolidated Notifications
-- ==================================================

INSERT INTO email_templates_emt (
    emt_id,
    emt_type,
    emt_name,
    emt_subject,
    emt_body_html,
    emt_is_active,
    created_at,
    created_by
) VALUES (
    'bab8d7d2-91e4-4b8d-b9c7-8f2e1d5c3a7b'::uuid,
    'BULK_STEP_STATUS_CHANGED',
    'Bulk Step Status Changes - Consolidated Team Notification',
    'UMIG: ${stepsCount} steps updated in ${iterationCode} (${operationType})',
    '
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .bulk-summary { background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #007bff; }
        .steps-list { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .step-item {
            padding: 8px 12px;
            margin: 5px 0;
            background-color: white;
            border-radius: 3px;
            border-left: 3px solid #28a745;
        }
        .operation-badge {
            display: inline-block;
            padding: 5px 12px;
            border-radius: 3px;
            color: white;
            font-weight: bold;
            background-color: #007bff;
            margin-bottom: 10px;
        }
        .details { margin-top: 20px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 0.9em; color: #6c757d; }
        .count-highlight { font-size: 1.2em; font-weight: bold; color: #007bff; }
    </style>
</head>
<body>
    <div class="header">
        <h2>📋 Bulk Operation Completed</h2>
        <p><span class="count-highlight">${stepsCount}</span> steps have been updated in <strong>${iterationCode}</strong></p>
    </div>

    <div class="bulk-summary">
        <div class="operation-badge">${operationType}</div>
        <p><strong>Operation Summary:</strong></p>
        <ul>
            <li><strong>Migration:</strong> ${migrationCode}</li>
            <li><strong>Iteration:</strong> ${iterationCode}</li>
            <li><strong>Steps Affected:</strong> ${stepsCount}</li>
            <li><strong>Triggered By:</strong> ${triggeredBy}</li>
            <li><strong>Completed At:</strong> ${triggeredAt}</li>
        </ul>
    </div>

    <div class="steps-list">
        <h3>Updated Steps:</h3>
        <% stepsSummary.each { step -> %>
            <div class="step-item">
                <strong>${step.name}</strong> - <em>${step.status}</em>
            </div>
        <% } %>
    </div>

    <div class="details">
        <p>This bulk operation was performed to streamline the migration process. All affected teams have been notified of the changes.</p>
        <p><strong>Next Steps:</strong> Please review the updated steps and proceed with your planned activities.</p>
    </div>

    <div class="footer">
        <p>🚀 <strong>UMIG Notification System</strong> | Automated notification for bulk operations</p>
        <p>For questions about this notification, please contact your migration coordinator.</p>
    </div>
</body>
</html>',
    true,
    NOW(),
    'system'
);

-- ==================================================
-- ITERATION_EVENT Template for Iteration-Level Notifications
-- ==================================================

INSERT INTO email_templates_emt (
    emt_id,
    emt_type,
    emt_name,
    emt_subject,
    emt_body_html,
    emt_is_active,
    created_at,
    created_by
) VALUES (
    'c9e8f7d3-82a5-4c9d-a8b6-7e1f2d4c5a9b'::uuid,
    'ITERATION_EVENT',
    'Iteration Event Notification',
    'UMIG: ${eventType} - ${iterationName} (${migrationCode})',
    '
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .event-summary { background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ffc107; }
        .iteration-info { background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .event-badge {
            display: inline-block;
            padding: 5px 12px;
            border-radius: 3px;
            color: white;
            font-weight: bold;
            background-color: #ffc107;
            margin-bottom: 10px;
        }
        .action-button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #17a2b8;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 15px 0;
            font-weight: bold;
        }
        .action-button:hover {
            background-color: #138496;
            color: white;
            text-decoration: none;
        }
        .stats { display: flex; justify-content: space-around; margin: 20px 0; }
        .stat-item { text-align: center; }
        .stat-number { font-size: 1.5em; font-weight: bold; color: #17a2b8; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 0.9em; color: #6c757d; }
    </style>
</head>
<body>
    <div class="header">
        <h2>🎯 Iteration Event</h2>
        <p><strong>${iterationName}</strong> - Important Update</p>
    </div>

    <div class="event-summary">
        <div class="event-badge">${eventType}</div>
        <p><strong>Event Details:</strong></p>
        <ul>
            <li><strong>Iteration:</strong> ${iterationName} (${iterationCode})</li>
            <li><strong>Migration:</strong> ${migrationName} (${migrationCode})</li>
            <li><strong>Event Triggered By:</strong> ${eventTriggeredBy}</li>
            <li><strong>Event Time:</strong> ${eventTriggeredAt}</li>
        </ul>
    </div>

    <% if (affectedStepsCount > 0) { %>
    <div class="stats">
        <div class="stat-item">
            <div class="stat-number">${affectedStepsCount}</div>
            <div>Steps Affected</div>
        </div>
    </div>
    <% } %>

    <div class="iteration-info">
        <h3>Iteration Overview</h3>
        <p>This notification is related to significant changes or milestones in the <strong>${iterationName}</strong> iteration.</p>
        <p>Please review the current status of your assigned steps and coordinate with your team as needed.</p>
    </div>

    <% if (hasIterationViewUrl) { %>
    <div style="text-align: center;">
        <a href="${iterationViewUrl}" class="action-button">
            📊 View Iteration Details
        </a>
    </div>
    <% } %>

    <div class="footer">
        <p>🚀 <strong>UMIG Notification System</strong> | Iteration event notification</p>
        <p>This is an automated notification. For questions, please contact your iteration coordinator.</p>
    </div>
</body>
</html>',
    true,
    NOW(),
    'system'
);

-- ==================================================
-- Enhanced STEP_STATUS_CHANGED Template for Context-Aware Notifications
-- ==================================================

-- Update existing template to support source context and enhanced features
UPDATE email_templates_emt
SET emt_body_html = '
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .status-badge {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 3px;
            color: white;
            font-weight: bold;
            background-color: ${statusColor ?: "#6c757d"};
        }
        .context-info { background-color: #e9ecef; padding: 10px; border-radius: 3px; margin: 10px 0; font-size: 0.9em; }
        .step-info { background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .action-button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 15px 0;
            font-weight: bold;
        }
        .action-button:hover {
            background-color: #0056b3;
            color: white;
            text-decoration: none;
        }
        .change-details { background-color: #d4edda; padding: 12px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #28a745; }
        .details { margin-top: 20px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 0.9em; color: #6c757d; }
    </style>
</head>
<body>
    <div class="header">
        <h2>🔄 Step Status Changed</h2>
        <p><strong>${stepInstance.sti_name}</strong> has been updated</p>
        <% if (sourceView) { %>
        <div class="context-info">
            <span>📱 Changed from: <strong>${sourceView}</strong>
            <% if (isDirectChange) { %> | Direct change<% } %>
            <% if (isBulkOperation) { %> | Bulk operation<% } %>
            </span>
        </div>
        <% } %>
    </div>

    <div class="change-details">
        <h3>Status Change Details</h3>
        <p><strong>Previous Status:</strong> ${oldStatus ?: "Unknown"}</p>
        <p><strong>New Status:</strong> <span class="status-badge">${newStatus}</span></p>
        <p><strong>Changed By:</strong> ${changedBy}</p>
        <p><strong>Changed At:</strong> ${changedAt}</p>
        <% if (operationType) { %>
        <p><strong>Operation Type:</strong> ${operationType}</p>
        <% } %>
    </div>

    <div class="step-info">
        <h3>Step Information</h3>
        <p><strong>Step Name:</strong> ${stepInstance.sti_name}</p>
        <p><strong>Migration:</strong> ${stepInstance.migration_name}</p>
        <p><strong>Assigned Team:</strong> ${stepInstance.sti_team_name ?: "Not assigned"}</p>
        <% if (stepInstance.sti_description) { %>
        <p><strong>Description:</strong> ${stepInstance.sti_description}</p>
        <% } %>
    </div>

    <% if (hasStepViewUrl) { %>
    <div style="text-align: center;">
        <a href="${contextualStepUrl ?: stepViewUrl}" class="action-button">
            🔍 View Step Details
        </a>
    </div>
    <% } %>

    <div class="details">
        <p>This step status change notification was triggered to keep all impacted teams informed of progress updates.</p>
        <% if (changeContext) { %>
        <p><em>${changeContext}</em></p>
        <% } %>
    </div>

    <div class="footer">
        <p>🚀 <strong>UMIG Notification System</strong> | Step status notification</p>
        <p>This notification was sent because your team is impacted by this step. For questions, please contact the assigned team.</p>
    </div>
</body>
</html>'
WHERE emt_type = 'STEP_STATUS_CHANGED' AND emt_is_active = true;