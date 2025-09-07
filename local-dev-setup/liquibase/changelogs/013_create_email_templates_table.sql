--liquibase formatted sql

--changeset lucas.challamel:013_create_email_templates_table
-- Create email_templates table for managing email notification templates
-- Following ADR-032: Email Notification Architecture

CREATE TABLE email_templates_emt (
    emt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emt_name VARCHAR(255) NOT NULL UNIQUE,
    emt_subject TEXT NOT NULL,
    emt_body_html TEXT NOT NULL,
    emt_body_text TEXT,
    emt_type VARCHAR(50) NOT NULL CHECK (emt_type IN ('STEP_OPENED', 'INSTRUCTION_COMPLETED', 'STEP_STATUS_CHANGED', 'CUSTOM')),
    emt_is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

-- Add comments for documentation
COMMENT ON TABLE email_templates_emt IS 'Stores HTML email templates for various notification types in UMIG';
COMMENT ON COLUMN email_templates_emt.emt_id IS 'Unique identifier for the email template';
COMMENT ON COLUMN email_templates_emt.emt_name IS 'Human-readable name for the template (must be unique)';
COMMENT ON COLUMN email_templates_emt.emt_subject IS 'Email subject line with optional placeholders';
COMMENT ON COLUMN email_templates_emt.emt_body_html IS 'HTML body content with Groovy GString placeholders';
COMMENT ON COLUMN email_templates_emt.emt_type IS 'Type of notification this template is for';
COMMENT ON COLUMN email_templates_emt.emt_is_active IS 'Whether this template is currently active';

-- Create indexes for performance
CREATE INDEX idx_emt_type ON email_templates_emt(emt_type) WHERE emt_is_active = true;
CREATE INDEX idx_emt_name ON email_templates_emt(emt_name);

-- Insert default templates
INSERT INTO email_templates_emt (emt_name, emt_type, emt_subject, emt_body_html, created_by) VALUES
('Default Step Opened Template', 'STEP_OPENED', 
'[UMIG] Step Ready: ${stepInstance.sti_name} - ${stepInstance.migration_name ?: "Migration"}',
'<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: #0052cc; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .step-details { background-color: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .instructions { background-color: #fff3cd; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #ffc107; }
        .action-button { background-color: #0052cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 15px 0; }
        .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>UMIG - Step Ready for Execution</h1>
    </div>
    
    <div class="content">
        <p>Dear Team,</p>
        
        <p>A new step is ready for execution and requires your attention:</p>
        
        <div class="step-details">
            <h3>Step Details</h3>
            <ul>
                <li><strong>Step Name:</strong> ${stepInstance.sti_name ?: "N/A"}</li>
                <li><strong>Migration:</strong> ${stepInstance.migration_name ?: "N/A"}</li>
                <li><strong>Iteration:</strong> ${stepInstance.iteration_name ?: "N/A"}</li>
                <li><strong>Sequence:</strong> ${stepInstance.sequence_name ?: "N/A"}</li>
                <li><strong>Phase:</strong> ${stepInstance.phase_name ?: "N/A"}</li>
                <li><strong>Estimated Duration:</strong> ${stepInstance.sti_duration_minutes ?: "N/A"} minutes</li>
                <li><strong>Status:</strong> ${stepInstance.sti_status ?: "OPEN"}</li>
            </ul>
        </div>
        
        <p><strong>Next Actions:</strong></p>
        <ul>
            <li>Review the step details and instructions</li>
            <li>Begin execution when ready</li>
            <li>Update status as you progress</li>
            <li>Contact the cutover team if you encounter issues</li>
        </ul>
        
        <a href="${stepUrl}" class="action-button">View Step in UMIG</a>
    </div>
    
    <div class="footer">
        <p>This is an automated notification from UMIG (Unified Migration Implementation Guide).</p>
        <p>Please do not reply to this email.</p>
    </div>
</body>
</html>',
'system'),

('Default Instruction Completed Template', 'INSTRUCTION_COMPLETED',
'[UMIG] Instruction Completed: ${instruction.ini_name} - ${stepInstance.sti_name}',
'<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .completion-details { background-color: #d4edda; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #28a745; }
        .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>UMIG - Instruction Completed</h1>
    </div>
    
    <div class="content">
        <p>Dear Team,</p>
        
        <p>An instruction has been marked as completed:</p>
        
        <div class="completion-details">
            <h3>Completion Details</h3>
            <ul>
                <li><strong>Instruction:</strong> ${instruction.ini_name ?: "N/A"}</li>
                <li><strong>Step:</strong> ${stepInstance.sti_name ?: "N/A"}</li>
                <li><strong>Completed At:</strong> ${completedAt}</li>
                <li><strong>Completed By:</strong> ${completedBy ?: "System"}</li>
            </ul>
        </div>
        
        <p>This progress update helps keep everyone informed of the current execution status.</p>
    </div>
    
    <div class="footer">
        <p>This is an automated notification from UMIG (Unified Migration Implementation Guide).</p>
        <p>Please do not reply to this email.</p>
    </div>
</body>
</html>',
'system'),

('Default Step Status Changed Template', 'STEP_STATUS_CHANGED',
'[UMIG] Step Status Changed: ${stepInstance.sti_name} - ${oldStatus} → ${newStatus}',
'<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: ${statusColor}; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .status-change { background-color: #f8f9fa; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid ${statusColor}; }
        .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>UMIG - Step Status Changed</h1>
    </div>
    
    <div class="content">
        <p>Dear Team,</p>
        
        <p>A step status has been updated:</p>
        
        <div class="status-change">
            <h3>Status Change Details</h3>
            <ul>
                <li><strong>Step:</strong> ${stepInstance.sti_name ?: "N/A"}</li>
                <li><strong>Previous Status:</strong> ${oldStatus}</li>
                <li><strong>New Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${newStatus}</span></li>
                <li><strong>Changed At:</strong> ${changedAt}</li>
                <li><strong>Changed By:</strong> ${changedBy ?: "System"}</li>
            </ul>
        </div>
        
        <p>Please take note of this status change and adjust your activities accordingly.</p>
    </div>
    
    <div class="footer">
        <p>This is an automated notification from UMIG (Unified Migration Implementation Guide).</p>
        <p>Please do not reply to this email.</p>
    </div>
</body>
</html>',
'system');

--rollback DROP TABLE IF EXISTS email_templates_emt CASCADE;