-- Email Template Updates for Dynamic URL Support
-- This script updates existing email templates to support clickable stepView URLs
-- Author: UMIG Project Team
-- Date: 2025-08-21

-- ==================================================
-- STEP_STATUS_CHANGED Template Enhancement
-- ==================================================

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
        .details { margin-top: 20px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 0.9em; color: #6c757d; }
    </style>
</head>
<body>
    <div class="header">
        <h2>🔄 Step Status Changed</h2>
        <p><strong>${stepInstance.sti_name}</strong> has been updated</p>
    </div>
    
    <div class="step-info">
        <h3>Step Details:</h3>
        <ul>
            <li><strong>Step Name:</strong> ${stepInstance.sti_name}</li>
            <li><strong>Status Change:</strong> 
                <span style="text-decoration: line-through;">${oldStatus}</span> 
                → 
                <span class="status-badge">${newStatus}</span>
            </li>
            <li><strong>Changed By:</strong> ${changedBy}</li>
            <li><strong>Changed At:</strong> ${changedAt}</li>
            <% if (migrationCode && iterationCode) { %>
            <li><strong>Migration:</strong> ${migrationCode}</li>
            <li><strong>Iteration:</strong> ${iterationCode}</li>
            <% } %>
        </ul>
    </div>
    
    <% if (hasStepViewUrl) { %>
    <div style="text-align: center; margin: 25px 0;">
        <a href="${stepViewUrl}" class="action-button">
            🔗 View Step Details
        </a>
        <p style="font-size: 0.9em; color: #6c757d; margin-top: 10px;">
            Click the button above to view this step in the UMIG system
        </p>
    </div>
    <% } else { %>
    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Note:</strong> Step view link is not available. Please access the UMIG system directly to view step details.</p>
    </div>
    <% } %>
    
    <div class="details">
        <h4>What this means:</h4>
        <p>The status change indicates that work on this step has progressed. Please review any dependencies or follow-up actions that may be required.</p>
        
        <% if (newStatus.toUpperCase() == "COMPLETED") { %>
        <p><strong>✅ Action Required:</strong> This step is now complete. Please verify that all deliverables are in place and notify dependent teams if necessary.</p>
        <% } else if (newStatus.toUpperCase() == "BLOCKED") { %>
        <p><strong>⚠️ Attention Required:</strong> This step is blocked. Please review the blocking issues and take appropriate action to resolve them.</p>
        <% } else if (newStatus.toUpperCase() == "IN_PROGRESS") { %>
        <p><strong>🔄 In Progress:</strong> Work on this step is now actively underway. Monitor progress and provide support as needed.</p>
        <% } %>
    </div>
    
    <div class="footer">
        <p>This is an automated notification from the UMIG system. Please do not reply to this email.</p>
        <p>If you have questions about this step or need assistance, please contact your project coordinator.</p>
    </div>
</body>
</html>
'
WHERE emt_type = 'STEP_STATUS_CHANGED' AND emt_is_active = true;

-- ==================================================
-- STEP_OPENED Template Enhancement
-- ==================================================

UPDATE email_templates_emt 
SET emt_body_html = '
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: #e8f5e8; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .step-info { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .action-button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #28a745;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 15px 0;
            font-weight: bold;
        }
        .action-button:hover {
            background-color: #1e7e34;
            color: white;
            text-decoration: none;
        }
        .priority-notice { background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 15px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 0.9em; color: #6c757d; }
    </style>
</head>
<body>
    <div class="header">
        <h2>🚀 Step Ready for Execution</h2>
        <p><strong>${stepInstance.sti_name}</strong> is now open and ready to begin</p>
    </div>
    
    <div class="step-info">
        <h3>Step Details:</h3>
        <ul>
            <li><strong>Step Name:</strong> ${stepInstance.sti_name}</li>
            <li><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">OPEN</span></li>
            <li><strong>Opened By:</strong> ${openedBy}</li>
            <li><strong>Opened At:</strong> ${openedAt}</li>
            <% if (migrationCode && iterationCode) { %>
            <li><strong>Migration:</strong> ${migrationCode}</li>
            <li><strong>Iteration:</strong> ${iterationCode}</li>
            <% } %>
        </ul>
    </div>
    
    <% if (hasStepViewUrl) { %>
    <div style="text-align: center; margin: 25px 0;">
        <a href="${stepViewUrl}" class="action-button">
            📋 View Step Instructions
        </a>
        <p style="font-size: 0.9em; color: #6c757d; margin-top: 10px;">
            Click to view detailed instructions and begin execution
        </p>
    </div>
    <% } else { %>
    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Note:</strong> Direct link is not available. Please access the UMIG system to view step instructions.</p>
    </div>
    <% } %>
    
    <div class="priority-notice">
        <h4>🎯 Next Steps:</h4>
        <ol>
            <li>Review the step instructions and prerequisites</li>
            <li>Verify all required resources and team members are available</li>
            <li>Begin execution according to the documented procedures</li>
            <li>Update step status as work progresses</li>
            <li>Notify stakeholders upon completion</li>
        </ol>
    </div>
    
    <div class="footer">
        <p>This is an automated notification from the UMIG system. Please do not reply to this email.</p>
        <p>For questions about this step or technical support, please contact your project coordinator.</p>
    </div>
</body>
</html>
'
WHERE emt_type = 'STEP_OPENED' AND emt_is_active = true;

-- ==================================================
-- INSTRUCTION_COMPLETED Template Enhancement
-- ==================================================

UPDATE email_templates_emt 
SET emt_body_html = '
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: #e8f4fd; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .instruction-info { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
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
            background-color: #117a8b;
            color: white;
            text-decoration: none;
        }
        .completion-badge { 
            background-color: #28a745; 
            color: white; 
            padding: 5px 10px; 
            border-radius: 15px; 
            font-size: 0.9em; 
            font-weight: bold;
        }
        .progress-info { background-color: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 15px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 0.9em; color: #6c757d; }
    </style>
</head>
<body>
    <div class="header">
        <h2>✅ Instruction Completed</h2>
        <p><strong>${instruction.ini_name}</strong> has been marked as complete</p>
    </div>
    
    <div class="instruction-info">
        <h3>Completion Details:</h3>
        <ul>
            <li><strong>Instruction:</strong> ${instruction.ini_name}</li>
            <li><strong>Parent Step:</strong> ${stepInstance.sti_name}</li>
            <li><strong>Status:</strong> <span class="completion-badge">COMPLETED</span></li>
            <li><strong>Completed By:</strong> ${completedBy}</li>
            <li><strong>Completed At:</strong> ${completedAt}</li>
            <% if (migrationCode && iterationCode) { %>
            <li><strong>Migration:</strong> ${migrationCode}</li>
            <li><strong>Iteration:</strong> ${iterationCode}</li>
            <% } %>
        </ul>
    </div>
    
    <% if (hasStepViewUrl) { %>
    <div style="text-align: center; margin: 25px 0;">
        <a href="${stepViewUrl}" class="action-button">
            🔍 Review Step Progress
        </a>
        <p style="font-size: 0.9em; color: #6c757d; margin-top: 10px;">
            Click to view the overall step status and remaining instructions
        </p>
    </div>
    <% } else { %>
    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Note:</strong> Direct link is not available. Please access the UMIG system to view step progress.</p>
    </div>
    <% } %>
    
    <div class="progress-info">
        <h4>📊 Progress Update:</h4>
        <p>This instruction completion represents progress toward the overall step completion. Please review any remaining instructions or dependencies.</p>
        
        <p><strong>Recommended Actions:</strong></p>
        <ul>
            <li>Verify that deliverables are properly documented</li>
            <li>Check for any dependent instructions that can now proceed</li>
            <li>Update stakeholders on completion status if required</li>
            <li>Review overall step progress and next actions</li>
        </ul>
    </div>
    
    <div class="footer">
        <p>This is an automated notification from the UMIG system. Please do not reply to this email.</p>
        <p>For questions about this instruction or step, please contact your project coordinator.</p>
    </div>
</body>
</html>
'
WHERE emt_type = 'INSTRUCTION_COMPLETED' AND emt_is_active = true;

-- ==================================================
-- Create new template types for enhanced notifications
-- ==================================================

-- STEP_STATUS_CHANGED_WITH_URL (Enhanced version)
INSERT INTO email_templates_emt (
    emt_type, 
    emt_name, 
    emt_subject, 
    emt_body_html, 
    emt_is_active,
    emt_created_by,
    emt_created_at
) VALUES (
    'STEP_STATUS_CHANGED_WITH_URL',
    'Step Status Change with URL',
    '[UMIG] Step Status Updated: ${stepInstance.sti_name} → ${newStatus}',
    '<!-- Enhanced template with URL support - content same as updated STEP_STATUS_CHANGED above -->',
    true,
    1,
    NOW()
) ON CONFLICT (emt_type) DO NOTHING;

-- STEP_OPENED_WITH_URL (Enhanced version)  
INSERT INTO email_templates_emt (
    emt_type,
    emt_name,
    emt_subject,
    emt_body_html,
    emt_is_active,
    emt_created_by,
    emt_created_at
) VALUES (
    'STEP_OPENED_WITH_URL',
    'Step Opened with URL',
    '[UMIG] Step Ready: ${stepInstance.sti_name}',
    '<!-- Enhanced template with URL support - content same as updated STEP_OPENED above -->',
    true,
    1,
    NOW()
) ON CONFLICT (emt_type) DO NOTHING;

-- INSTRUCTION_COMPLETED_WITH_URL (Enhanced version)
INSERT INTO email_templates_emt (
    emt_type,
    emt_name,
    emt_subject,
    emt_body_html,
    emt_is_active,
    emt_created_by,
    emt_created_at
) VALUES (
    'INSTRUCTION_COMPLETED_WITH_URL',
    'Instruction Completed with URL',
    '[UMIG] Instruction Complete: ${instruction.ini_name}',
    '<!-- Enhanced template with URL support - content same as updated INSTRUCTION_COMPLETED above -->',
    true,
    1,
    NOW()
) ON CONFLICT (emt_type) DO NOTHING;

-- ==================================================
-- Update template subjects to be more descriptive
-- ==================================================

UPDATE email_templates_emt 
SET emt_subject = '[UMIG] ${migrationCode ? migrationCode + " - " : ""}Step Status: ${stepInstance.sti_name} → ${newStatus}'
WHERE emt_type IN ('STEP_STATUS_CHANGED', 'STEP_STATUS_CHANGED_WITH_URL') 
  AND emt_is_active = true;

UPDATE email_templates_emt 
SET emt_subject = '[UMIG] ${migrationCode ? migrationCode + " - " : ""}Step Ready: ${stepInstance.sti_name}'
WHERE emt_type IN ('STEP_OPENED', 'STEP_OPENED_WITH_URL') 
  AND emt_is_active = true;

UPDATE email_templates_emt 
SET emt_subject = '[UMIG] ${migrationCode ? migrationCode + " - " : ""}Instruction Complete: ${instruction.ini_name}'
WHERE emt_type IN ('INSTRUCTION_COMPLETED', 'INSTRUCTION_COMPLETED_WITH_URL') 
  AND emt_is_active = true;

COMMIT;