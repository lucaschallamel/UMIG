--liquibase formatted sql

--changeset lucas.challamel:023_add_instruction_uncompleted_email_template_v1:
--comment: Add dedicated email template for instruction uncompleted action with enhanced notification styling and impact warnings

-- =========================================
-- ADD INSTRUCTION_UNCOMPLETED EMAIL TEMPLATE
-- =========================================
-- This script adds a dedicated email template for the instruction_uncomplete action
-- Author: System
-- Date: 2025-08-21
-- =========================================

-- First, we need to update the check constraint to allow INSTRUCTION_UNCOMPLETED type
ALTER TABLE email_templates_emt DROP CONSTRAINT IF EXISTS email_templates_emt_emt_type_check;
ALTER TABLE email_templates_emt ADD CONSTRAINT email_templates_emt_emt_type_check 
    CHECK (emt_type IN ('STEP_OPENED', 'INSTRUCTION_COMPLETED', 'INSTRUCTION_UNCOMPLETED', 'STEP_STATUS_CHANGED', 'CUSTOM'));

-- Now insert the INSTRUCTION_UNCOMPLETED email template
INSERT INTO email_templates_emt (
    emt_id,
    emt_name,
    emt_subject,
    emt_body_html,
    emt_body_text,
    emt_type,
    emt_is_active,
    created_at,
    updated_at,
    created_by,
    updated_by
) VALUES (
    'a3f7b892-9c4d-4e89-b2a1-8f5c6d7e9abc'::uuid,
    'Default Instruction Uncompleted Template',
    '[UMIG] Instruction Uncompleted: ${instruction.ini_name} - ${stepInstance.sti_name}',
    '<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: #ffc107; color: #333; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .uncomplete-details { background-color: #fff3cd; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #ffc107; }
        .impact-warning { background-color: #f8d7da; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #dc3545; }
        .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; }
        .highlight { font-weight: bold; color: #856404; }
    </style>
</head>
<body>
    <div class="header">
        <h1>UMIG - Instruction Uncompleted</h1>
    </div>
    
    <div class="content">
        <p>Dear Team,</p>
        
        <p><strong>ATTENTION:</strong> An instruction has been marked as <span class="highlight">UNCOMPLETED</span> and requires immediate review:</p>
        
        <div class="uncomplete-details">
            <h3>Uncomplete Details</h3>
            <ul>
                <li><strong>Instruction:</strong> ${instruction.ini_name ?: "N/A"}</li>
                <li><strong>Step:</strong> ${stepInstance.sti_name ?: "N/A"}</li>
                <li><strong>Migration:</strong> ${stepInstance.migration_name ?: "N/A"}</li>
                <li><strong>Iteration:</strong> ${stepInstance.iteration_name ?: "N/A"}</li>
                <li><strong>Uncompleted At:</strong> ${completedAt}</li>
                <li><strong>Uncompleted By:</strong> ${completedBy ?: "System"}</li>
            </ul>
        </div>
        
        <div class="impact-warning">
            <h3>⚠️ Impact & Required Actions</h3>
            <p>This instruction was previously marked as completed but has now been reverted to an uncompleted state. This may impact:</p>
            <ul>
                <li>Dependent instructions or steps that rely on this completion</li>
                <li>Overall progress tracking for the migration</li>
                <li>Team coordination and scheduling</li>
            </ul>
            <p><strong>Please review this change immediately and take appropriate action:</strong></p>
            <ol>
                <li>Verify the reason for uncompleting this instruction</li>
                <li>Assess impact on dependent tasks</li>
                <li>Communicate with affected teams</li>
                <li>Update your execution plans accordingly</li>
            </ol>
        </div>
        
        <p>If you have questions about this status change, please contact the person who made the change or the cutover coordination team.</p>
    </div>
    
    <div class="footer">
        <p>This is an automated notification from UMIG (Unified Migration Implementation Guide).</p>
        <p>Please do not reply to this email. For support, contact the IT Cutover Team.</p>
    </div>
</body>
</html>',
    NULL,  -- emt_body_text (plain text version, can be NULL)
    'INSTRUCTION_UNCOMPLETED',
    true,  -- emt_is_active
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    'system',
    'system'
);

-- Add comment documenting this new template type
COMMENT ON COLUMN email_templates_emt.emt_type IS 'Type of notification this template is for (STEP_OPENED, INSTRUCTION_COMPLETED, INSTRUCTION_UNCOMPLETED, STEP_STATUS_CHANGED, CUSTOM)';