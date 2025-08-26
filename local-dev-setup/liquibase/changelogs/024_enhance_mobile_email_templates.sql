--liquibase formatted sql

--changeset lucas.challamel:024_enhance_mobile_email_templates
-- Enhance existing email templates with mobile-responsive design
-- US-039: Mobile Email Templates - Phase 0 Implementation
-- Building upon Enhanced Email Service foundation from US-036

-- Update constraint to allow new template type
ALTER TABLE email_templates_emt DROP CONSTRAINT IF EXISTS email_templates_emt_emt_type_check;
ALTER TABLE email_templates_emt ADD CONSTRAINT email_templates_emt_emt_type_check 
    CHECK (emt_type IN ('STEP_OPENED', 'INSTRUCTION_COMPLETED', 'INSTRUCTION_UNCOMPLETED', 'STEP_STATUS_CHANGED', 'STEP_NOTIFICATION_MOBILE', 'CUSTOM'));

-- Update STEP_STATUS_CHANGED template with mobile-responsive design
UPDATE email_templates_emt 
SET 
    emt_body_html = '<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
    
    <title>${stepInstance.sti_code ?: ''STEP''} - Status Changed | UMIG</title>
    
    <style>
        /* MOBILE-RESPONSIVE EMAIL STYLES */
        html, body, table, tbody, tr, td, div, p, ul, ol, li, h1, h2, h3, h4, h5, h6 {
            margin: 0 !important; padding: 0 !important; border: 0 !important;
        }
        * { font-family: ''Segoe UI'', system-ui, -apple-system, ''Helvetica Neue'', Arial, sans-serif !important; }
        body {
            margin: 0 !important; padding: 0 !important; width: 100% !important; min-width: 100% !important;
            -webkit-text-size-adjust: 100% !important; -ms-text-size-adjust: 100% !important;
            -webkit-font-smoothing: antialiased !important; background-color: #f8f9fa !important;
            color: #212529 !important;
        }
        table, td { mso-table-lspace: 0pt !important; mso-table-rspace: 0pt !important; border-collapse: collapse !important; }
        img { -ms-interpolation-mode: bicubic !important; border: 0 !important; outline: none !important; text-decoration: none !important; display: block !important; }
        
        .email-wrapper { width: 100% !important; background-color: #f8f9fa !important; padding: 20px 0 !important; }
        .email-container { max-width: 600px !important; margin: 0 auto !important; background-color: #ffffff !important; border-radius: 8px !important; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important; overflow: hidden !important; }
        
        .email-header { background: linear-gradient(135deg, #0052CC 0%, #0065FF 100%) !important; color: #ffffff !important; padding: 32px 24px !important; text-align: center !important; }
        .header-title { font-size: 28px !important; font-weight: 700 !important; line-height: 1.2 !important; margin: 0 0 12px 0 !important; color: #ffffff !important; }
        .header-breadcrumb { font-size: 16px !important; opacity: 0.9 !important; line-height: 1.4 !important; color: #ffffff !important; margin: 12px 0 !important; }
        .header-meta { font-size: 14px !important; opacity: 0.8 !important; margin-top: 16px !important; padding-top: 16px !important; border-top: 1px solid rgba(255,255,255,0.2) !important; color: #ffffff !important; }
        
        .email-content { padding: 32px 24px !important; }
        .content-section { margin-bottom: 32px !important; }
        .content-section:last-child { margin-bottom: 0 !important; }
        
        .step-details-card { background-color: #f8f9fa !important; border: 1px solid #e9ecef !important; border-radius: 8px !important; padding: 24px !important; margin: 24px 0 !important; }
        .section-title { font-size: 20px !important; font-weight: 600 !important; color: #212529 !important; margin: 0 0 16px 0 !important; line-height: 1.3 !important; }
        
        .metadata-grid { width: 100% !important; }
        .metadata-row { border-bottom: 1px solid #e9ecef !important; padding: 12px 0 !important; }
        .metadata-row:last-child { border-bottom: none !important; }
        .metadata-label { font-weight: 600 !important; color: #6c757d !important; font-size: 14px !important; text-transform: uppercase !important; letter-spacing: 0.5px !important; margin-bottom: 4px !important; }
        .metadata-value { font-size: 16px !important; color: #212529 !important; line-height: 1.4 !important; word-wrap: break-word !important; }
        
        .status-badge { display: inline-block !important; padding: 8px 16px !important; border-radius: 20px !important; font-weight: 600 !important; font-size: 14px !important; color: #ffffff !important; text-transform: uppercase !important; letter-spacing: 0.5px !important; background-color: ${statusColor ?: ''#6c757d''} !important; }
        
        .cta-container { text-align: center !important; margin: 32px 0 !important; padding: 24px !important; background-color: #f8f9fa !important; border-radius: 8px !important; }
        .cta-button { display: inline-block !important; padding: 16px 32px !important; background-color: #007bff !important; color: #ffffff !important; text-decoration: none !important; border-radius: 8px !important; font-weight: 600 !important; font-size: 16px !important; text-transform: uppercase !important; letter-spacing: 0.5px !important; min-height: 44px !important; min-width: 200px !important; box-sizing: border-box !important; }
        .cta-button:hover { background-color: #0056b3 !important; color: #ffffff !important; text-decoration: none !important; }
        .cta-subtitle { font-size: 14px !important; color: #6c757d !important; margin-top: 12px !important; line-height: 1.4 !important; }
        
        .description-box { background-color: #ffffff !important; border: 1px solid #e9ecef !important; border-radius: 6px !important; padding: 20px !important; margin: 16px 0 !important; line-height: 1.6 !important; color: #212529 !important; font-size: 15px !important; }
        
        .email-footer { background-color: #f8f9fa !important; border-top: 1px solid #e9ecef !important; padding: 32px 24px !important; text-align: center !important; color: #6c757d !important; font-size: 14px !important; line-height: 1.5 !important; }
        .footer-brand { font-weight: 600 !important; color: #212529 !important; margin-bottom: 16px !important; }
        .footer-links { margin: 20px 0 !important; }
        .footer-link { color: #007bff !important; text-decoration: none !important; margin: 0 16px !important; font-weight: 500 !important; }
        .footer-link:hover { color: #0056b3 !important; }
        .footer-disclaimer { font-size: 12px !important; color: #6c757d !important; margin-top: 20px !important; padding-top: 20px !important; border-top: 1px solid #e9ecef !important; line-height: 1.4 !important; }
        
        /* MOBILE RESPONSIVE */
        @media screen and (max-width: 600px) {
            .email-wrapper { padding: 10px 0 !important; }
            .email-container { margin: 0 10px !important; border-radius: 4px !important; }
            .email-header { padding: 24px 20px !important; }
            .header-title { font-size: 24px !important; }
            .header-breadcrumb { font-size: 14px !important; }
            .email-content { padding: 24px 20px !important; }
            .step-details-card { padding: 20px !important; margin: 20px 0 !important; }
            .section-title { font-size: 18px !important; }
            .metadata-row { padding: 10px 0 !important; }
            .cta-container { padding: 20px !important; margin: 24px 0 !important; }
            .cta-button { padding: 14px 28px !important; font-size: 15px !important; min-width: 160px !important; width: 80% !important; max-width: 280px !important; }
            .email-footer { padding: 24px 20px !important; }
            .footer-link { display: block !important; margin: 8px 0 !important; }
        }
        @media screen and (max-width: 480px) {
            .email-container { margin: 0 5px !important; }
            .header-title { font-size: 22px !important; line-height: 1.1 !important; }
            .email-content { padding: 20px 16px !important; }
            .step-details-card { padding: 16px !important; }
            .metadata-value { font-size: 15px !important; }
            .cta-button { width: 90% !important; padding: 12px 20px !important; }
        }
        
        /* DARK MODE SUPPORT */
        @media (prefers-color-scheme: dark) {
            body { background-color: #1a1a1a !important; }
            .email-wrapper { background-color: #1a1a1a !important; }
            .email-container { background-color: #2d2d2d !important; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3) !important; }
            .step-details-card { background-color: #3a3a3a !important; border-color: #4a4a4a !important; }
            .section-title, .metadata-value { color: #ffffff !important; }
            .metadata-label { color: #cccccc !important; }
            .description-box { background-color: #2d2d2d !important; border-color: #4a4a4a !important; color: #ffffff !important; }
            .cta-container { background-color: #3a3a3a !important; }
            .email-footer { background-color: #3a3a3a !important; border-color: #4a4a4a !important; color: #cccccc !important; }
            .footer-brand { color: #ffffff !important; }
        }
    </style>
</head>
<body>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="email-wrapper">
        <tr>
            <td align="center" valign="top">
                <div class="email-container">
                    <div class="email-header">
                        <h1 class="header-title">🔄 ${stepInstance.sti_code ?: ''STEP''} - Status Changed</h1>
                        <div class="header-breadcrumb">
                            <% if (migrationCode && iterationCode) { %>
                            ${migrationCode} › ${iterationCode}
                            <% } else { %>
                            ${stepInstance.migration_name ?: ''Migration''} › ${stepInstance.iteration_name ?: ''Iteration''}
                            <% } %>
                        </div>
                        <div class="header-meta">
                            Status changed on ${changedAt} by ${changedBy}
                        </div>
                    </div>
                    
                    <div class="email-content">
                        <div class="content-section">
                            <div class="step-details-card">
                                <h2 class="section-title">📊 Status Update</h2>
                                <table class="metadata-grid" cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                        <td class="metadata-row">
                                            <div class="metadata-label">Step Name</div>
                                            <div class="metadata-value">${stepInstance.sti_name}</div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="metadata-row">
                                            <div class="metadata-label">Status Change</div>
                                            <div class="metadata-value">
                                                <span style="text-decoration: line-through; color: #6c757d;">${oldStatus}</span>
                                                →
                                                <span class="status-badge">${newStatus}</span>
                                            </div>
                                        </td>
                                    </tr>
                                    <% if (stepInstance.sti_duration_minutes) { %>
                                    <tr>
                                        <td class="metadata-row">
                                            <div class="metadata-label">Duration</div>
                                            <div class="metadata-value">${stepInstance.sti_duration_minutes} minutes</div>
                                        </td>
                                    </tr>
                                    <% } %>
                                    <% if (stepInstance.team_name) { %>
                                    <tr>
                                        <td class="metadata-row">
                                            <div class="metadata-label">Assigned Team</div>
                                            <div class="metadata-value">${stepInstance.team_name}</div>
                                        </td>
                                    </tr>
                                    <% } %>
                                </table>
                                
                                <% if (stepInstance.sti_description) { %>
                                <div class="metadata-label" style="margin-top: 20px;">Description</div>
                                <div class="description-box">${stepInstance.sti_description}</div>
                                <% } %>
                            </div>
                        </div>
                        
                        <div class="content-section">
                            <div class="cta-container">
                                <% if (hasStepViewUrl && stepViewUrl) { %>
                                <a href="${stepViewUrl}" class="cta-button">🔗 View Step Details</a>
                                <div class="cta-subtitle">Click to view this step with live updates</div>
                                <% } else { %>
                                <div style="padding: 20px; background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px;">
                                    <strong>📌 Access Information:</strong><br>
                                    Please access the UMIG system in Confluence to view current step details.
                                </div>
                                <% } %>
                            </div>
                        </div>
                        
                        <% if (newStatus && newStatus.toUpperCase() in [''COMPLETED'', ''BLOCKED'', ''IN_PROGRESS'']) { %>
                        <div class="content-section">
                            <div class="step-details-card">
                                <h3 class="section-title">💡 Next Steps</h3>
                                <div class="description-box">
                                    <% if (newStatus.toUpperCase() == ''COMPLETED'') { %>
                                    <p><strong>✅ Step Complete:</strong> Verify deliverables and notify dependent teams.</p>
                                    <% } else if (newStatus.toUpperCase() == ''BLOCKED'') { %>
                                    <p><strong>⚠️ Attention Required:</strong> Review blocking issues and coordinate resolution.</p>
                                    <% } else if (newStatus.toUpperCase() == ''IN_PROGRESS'') { %>
                                    <p><strong>🔄 Work in Progress:</strong> Monitor progress and provide support as needed.</p>
                                    <% } %>
                                </div>
                            </div>
                        </div>
                        <% } %>
                    </div>
                    
                    <div class="email-footer">
                        <div class="footer-brand">UMIG - Unified Migration Implementation Guide</div>
                        <div class="footer-links">
                            <% if (hasStepViewUrl && stepViewUrl) { %>
                            <a href="${stepViewUrl}" class="footer-link">View Step Details</a>
                            <% } %>
                            <a href="#" class="footer-link">Help & Support</a>
                        </div>
                        <div class="footer-disclaimer">
                            This is an automated notification. For questions, contact your project coordinator.
                        </div>
                    </div>
                </div>
            </td>
        </tr>
    </table>
</body>
</html>',
    emt_name = 'Mobile-Responsive Step Status Changed',
    emt_subject = '[UMIG] ${stepInstance.sti_code ?: stepInstance.sti_name} → ${newStatus}',
    emt_updated_date = NOW(),
    emt_updated_by = 'system'
WHERE emt_type = 'STEP_STATUS_CHANGED' 
  AND emt_is_active = true;

-- Update STEP_OPENED template with mobile design (abbreviated for space)
UPDATE email_templates_emt 
SET 
    emt_body_html = '<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <title>${stepInstance.sti_code ?: ''STEP''} - Ready for Execution | UMIG</title>
    
    <style>
        /* Mobile-responsive styles - same base as above with green gradient */
        html, body, table, tbody, tr, td, div, p, ul, ol, li, h1, h2, h3, h4, h5, h6 {
            margin: 0 !important; padding: 0 !important; border: 0 !important;
        }
        * { font-family: ''Segoe UI'', system-ui, -apple-system, ''Helvetica Neue'', Arial, sans-serif !important; }
        body { margin: 0 !important; padding: 0 !important; width: 100% !important; min-width: 100% !important; -webkit-text-size-adjust: 100% !important; -ms-text-size-adjust: 100% !important; -webkit-font-smoothing: antialiased !important; background-color: #f8f9fa !important; color: #212529 !important; }
        
        .email-wrapper { width: 100% !important; background-color: #f8f9fa !important; padding: 20px 0 !important; }
        .email-container { max-width: 600px !important; margin: 0 auto !important; background-color: #ffffff !important; border-radius: 8px !important; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important; overflow: hidden !important; }
        .email-header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%) !important; color: #ffffff !important; padding: 32px 24px !important; text-align: center !important; }
        .header-title { font-size: 28px !important; font-weight: 700 !important; line-height: 1.2 !important; margin: 0 0 12px 0 !important; color: #ffffff !important; }
        .header-breadcrumb { font-size: 16px !important; opacity: 0.9 !important; line-height: 1.4 !important; color: #ffffff !important; margin: 12px 0 !important; }
        .header-meta { font-size: 14px !important; opacity: 0.8 !important; margin-top: 16px !important; padding-top: 16px !important; border-top: 1px solid rgba(255,255,255,0.2) !important; color: #ffffff !important; }
        .email-content { padding: 32px 24px !important; }
        .content-section { margin-bottom: 32px !important; }
        .step-details-card { background-color: #f8f9fa !important; border: 1px solid #e9ecef !important; border-radius: 8px !important; padding: 24px !important; margin: 24px 0 !important; }
        .section-title { font-size: 20px !important; font-weight: 600 !important; color: #212529 !important; margin: 0 0 16px 0 !important; line-height: 1.3 !important; }
        .cta-button { display: inline-block !important; padding: 16px 32px !important; background-color: #28a745 !important; color: #ffffff !important; text-decoration: none !important; border-radius: 8px !important; font-weight: 600 !important; font-size: 16px !important; text-transform: uppercase !important; letter-spacing: 0.5px !important; min-height: 44px !important; min-width: 200px !important; box-sizing: border-box !important; }
        .cta-button:hover { background-color: #1e7e34 !important; color: #ffffff !important; text-decoration: none !important; }
        .status-badge { display: inline-block !important; padding: 8px 16px !important; border-radius: 20px !important; font-weight: 600 !important; font-size: 14px !important; color: #ffffff !important; text-transform: uppercase !important; letter-spacing: 0.5px !important; background-color: #17a2b8 !important; }
        
        @media screen and (max-width: 600px) {
            .email-wrapper { padding: 10px 0 !important; }
            .email-container { margin: 0 10px !important; }
            .email-header { padding: 24px 20px !important; }
            .header-title { font-size: 24px !important; }
            .email-content { padding: 24px 20px !important; }
            .cta-button { width: 80% !important; }
        }
    </style>
</head>
<body>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="email-wrapper">
        <tr>
            <td align="center" valign="top">
                <div class="email-container">
                    <div class="email-header">
                        <h1 class="header-title">🚀 ${stepInstance.sti_code ?: ''STEP''} - Ready for Execution</h1>
                        <div class="header-breadcrumb">
                            ${stepInstance.migration_name ?: ''Migration''} › ${stepInstance.iteration_name ?: ''Iteration''}
                        </div>
                        <div class="header-meta">
                            Opened on ${openedAt} by ${openedBy}
                        </div>
                    </div>
                    
                    <div class="email-content">
                        <div class="content-section">
                            <div class="step-details-card">
                                <h2 class="section-title">📊 Step Ready</h2>
                                <p><strong>Step Name:</strong> ${stepInstance.sti_name}</p>
                                <p><strong>Status:</strong> <span class="status-badge">OPEN</span></p>
                                <% if (stepInstance.sti_duration_minutes) { %>
                                <p><strong>Estimated Duration:</strong> ${stepInstance.sti_duration_minutes} minutes</p>
                                <% } %>
                                <% if (stepInstance.team_name) { %>
                                <p><strong>Assigned Team:</strong> ${stepInstance.team_name}</p>
                                <% } %>
                            </div>
                        </div>
                        
                        <div style="text-align: center; margin: 32px 0; padding: 24px; background-color: #f8f9fa; border-radius: 8px;">
                            <% if (hasStepViewUrl && stepViewUrl) { %>
                            <a href="${stepViewUrl}" class="cta-button">📋 View Step Instructions</a>
                            <% } else { %>
                            <div style="padding: 20px; background-color: #fff3cd; border-radius: 6px;">
                                Please access the UMIG system in Confluence to view step instructions.
                            </div>
                            <% } %>
                        </div>
                    </div>
                    
                    <div style="background-color: #f8f9fa; padding: 24px; text-align: center; font-size: 14px; color: #6c757d;">
                        <div style="font-weight: 600; color: #212529; margin-bottom: 16px;">
                            UMIG - Unified Migration Implementation Guide
                        </div>
                        This is an automated notification. For questions, contact your project coordinator.
                    </div>
                </div>
            </td>
        </tr>
    </table>
</body>
</html>',
    emt_name = 'Mobile-Responsive Step Opened',
    emt_subject = '[UMIG] ${stepInstance.sti_code ?: stepInstance.sti_name} Ready',
    emt_updated_date = NOW(),
    emt_updated_by = 'system'
WHERE emt_type = 'STEP_OPENED' 
  AND emt_is_active = true;

-- Update INSTRUCTION_COMPLETED template with mobile design (condensed)
UPDATE email_templates_emt 
SET 
    emt_body_html = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${instruction.ini_name ?: ''Instruction''} - Completed | UMIG</title>
    
    <style>
        html, body, table, tbody, tr, td, div, p, ul, ol, li, h1, h2, h3, h4, h5, h6 { margin: 0 !important; padding: 0 !important; border: 0 !important; }
        * { font-family: ''Segoe UI'', system-ui, -apple-system, Arial, sans-serif !important; }
        body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f8f9fa !important; }
        .email-wrapper { width: 100% !important; padding: 20px 0 !important; }
        .email-container { max-width: 600px !important; margin: 0 auto !important; background-color: #ffffff !important; border-radius: 8px !important; overflow: hidden !important; }
        .email-header { background: linear-gradient(135deg, #17a2b8 0%, #20c997 100%) !important; color: #ffffff !important; padding: 32px 24px !important; text-align: center !important; }
        .header-title { font-size: 28px !important; font-weight: 700 !important; margin: 0 0 12px 0 !important; }
        .email-content { padding: 32px 24px !important; }
        .step-details-card { background-color: #f8f9fa !important; border: 1px solid #e9ecef !important; border-radius: 8px !important; padding: 24px !important; margin: 24px 0 !important; }
        .section-title { font-size: 20px !important; font-weight: 600 !important; color: #212529 !important; margin: 0 0 16px 0 !important; }
        .completion-badge { display: inline-block !important; padding: 6px 12px !important; background-color: #28a745 !important; color: #ffffff !important; border-radius: 15px !important; font-size: 14px !important; font-weight: bold !important; }
        .cta-button { display: inline-block !important; padding: 16px 32px !important; background-color: #17a2b8 !important; color: #ffffff !important; text-decoration: none !important; border-radius: 8px !important; font-weight: 600 !important; min-height: 44px !important; }
        
        @media screen and (max-width: 600px) {
            .email-container { margin: 0 10px !important; }
            .header-title { font-size: 24px !important; }
            .email-content { padding: 24px 20px !important; }
            .cta-button { width: 80% !important; }
        }
        @media screen and (max-width: 480px) {
            .header-title { font-size: 22px !important; }
            .cta-button { width: 90% !important; }
        }
    </style>
</head>
<body>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="email-wrapper">
        <tr>
            <td align="center">
                <div class="email-container">
                    <div class="email-header">
                        <h1 class="header-title">✅ Instruction Completed</h1>
                        <div style="font-size: 16px; opacity: 0.9;">
                            ${instruction.ini_name} has been marked complete
                        </div>
                    </div>
                    
                    <div class="email-content">
                        <div class="step-details-card">
                            <h2 class="section-title">📊 Completion Details</h2>
                            <p><strong>Instruction:</strong> ${instruction.ini_name}</p>
                            <p><strong>Parent Step:</strong> ${stepInstance.sti_name}</p>
                            <p><strong>Status:</strong> <span class="completion-badge">COMPLETED</span></p>
                            <p><strong>Completed By:</strong> ${completedBy}</p>
                            <p><strong>Completed At:</strong> ${completedAt}</p>
                        </div>
                        
                        <div style="text-align: center; margin: 32px 0; padding: 24px; background-color: #f8f9fa; border-radius: 8px;">
                            <% if (hasStepViewUrl && stepViewUrl) { %>
                            <a href="${stepViewUrl}" class="cta-button">🔍 Review Step Progress</a>
                            <% } else { %>
                            <div style="padding: 20px; background-color: #fff3cd; border-radius: 6px;">
                                Please access the UMIG system to view step progress.
                            </div>
                            <% } %>
                        </div>
                    </div>
                    
                    <div style="background-color: #f8f9fa; padding: 24px; text-align: center; font-size: 14px; color: #6c757d;">
                        <div style="font-weight: 600; color: #212529; margin-bottom: 16px;">
                            UMIG - Unified Migration Implementation Guide
                        </div>
                        This is an automated notification. For questions, contact your project coordinator.
                    </div>
                </div>
            </td>
        </tr>
    </table>
</body>
</html>',
    emt_name = 'Mobile-Responsive Instruction Completed',
    emt_subject = '[UMIG] ${instruction.ini_name} Complete',
    emt_updated_date = NOW(),
    emt_updated_by = 'system'
WHERE emt_type = 'INSTRUCTION_COMPLETED' 
  AND emt_is_active = true;

-- Add new universal mobile template type (conditional insert to avoid duplicates)
INSERT INTO email_templates_emt (
    emt_type, 
    emt_name, 
    emt_subject, 
    emt_body_html, 
    emt_is_active,
    emt_created_by,
    emt_updated_by
)
SELECT 
    'STEP_NOTIFICATION_MOBILE',
    'Universal Mobile-Responsive Step Notification',
    '[UMIG] ${stepInstance.sti_code ?: stepInstance.sti_name} - ${notificationType ?: ''Update''}',
    '<!-- Universal mobile template - placeholder for dynamic content -->
<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body>Mobile-optimized notification template</body></html>',
    true,
    'system',
    'system'
WHERE NOT EXISTS (
    SELECT 1 FROM email_templates_emt WHERE emt_type = 'STEP_NOTIFICATION_MOBILE'
);

-- Add audit log entry for template migration
INSERT INTO audit_log_aud (
    usr_id,
    aud_action,
    aud_entity_type,
    aud_entity_id,
    aud_details
) VALUES (
    1,
    'UPDATE',
    'email_templates_emt',
    'a0000000-0000-0000-0000-000000000024'::uuid,
    '{"operation": "US-039: Updated email templates with mobile-responsive design", "old_values": {"templates": "basic HTML design"}, "new_values": {"templates": "mobile-responsive design with 8+ client compatibility, dark mode support, 600px container, touch-friendly buttons"}}'::jsonb
);

--rollback UPDATE email_templates_emt SET emt_body_html = (SELECT emt_body_html FROM email_templates_emt WHERE emt_name LIKE 'Default%' AND emt_type = email_templates_emt.emt_type LIMIT 1), emt_name = REPLACE(emt_name, 'Mobile-Responsive', 'Default') WHERE emt_name LIKE 'Mobile-Responsive%';
--rollback DELETE FROM email_templates_emt WHERE emt_type = 'STEP_NOTIFICATION_MOBILE';
--rollback ALTER TABLE email_templates_emt DROP CONSTRAINT IF EXISTS email_templates_emt_emt_type_check;
--rollback ALTER TABLE email_templates_emt ADD CONSTRAINT email_templates_emt_emt_type_check CHECK (emt_type IN ('STEP_OPENED', 'INSTRUCTION_COMPLETED', 'INSTRUCTION_UNCOMPLETED', 'STEP_STATUS_CHANGED', 'CUSTOM'));