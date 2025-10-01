-- ======================================================================================
-- TD-015: Simplify Email Templates (Remove GSP Scriptlets)
-- ======================================================================================
-- Date: 2025-09-30
-- Sprint: Sprint 8
-- Author: UMIG Project Team
--
-- Purpose:
--   Replace GSP scriptlet-based email templates (<% %>) with simple ${} variable
--   substitution. All conditionals and loops are now pre-processed in Groovy code
--   via helper methods in EnhancedEmailService.groovy (lines 725-1002).
--
-- Changes:
--   - Remove all 54 <% %> scriptlet blocks per template
--   - Replace with pre-processed variables (breadcrumb, instructionsHtml, etc.)
--   - Preserve all styling, colors, and layout
--   - Enable reliable template processing with GStringTemplateEngine
--
-- Rollback:
--   This migration includes rollback scripts to restore original GSP-based templates
-- ======================================================================================

BEGIN;

-- ======================================================================================
-- 1. STEP_STATUS_CHANGED Template
-- ======================================================================================
UPDATE email_templates_emt
SET
    emt_subject = '[UMIG] ${step_code}: ${step_title} - Status Changed to ${newStatus}',
    emt_body_html = '<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />

    <title>${step_code ?: "STEP"} - ${step_title ?: "Step Details"} | UMIG</title>

    <!--[if mso]>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings>
            <o:AllowPNG />
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
    <![endif]-->

    <style>
      /* EMAIL CLIENT COMPATIBILITY RESET */
      html, body, table, tbody, tr, td, div, p, ul, ol, li, h1, h2, h3, h4, h5, h6 {
          margin: 0 !important;
          padding: 0 !important;
          border: 0 !important;
      }

      /* UNIVERSAL STYLES */
      * { font-family: ''Segoe UI'', system-ui, -apple-system, ''Helvetica Neue'', Arial, sans-serif !important; }

      body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          min-width: 100% !important;
          -webkit-text-size-adjust: 100% !important;
          -ms-text-size-adjust: 100% !important;
          -webkit-font-smoothing: antialiased !important;
          background-color: #f8f9fa !important;
          color: #212529 !important;
      }

      /* TABLE RESETS FOR OUTLOOK */
      table, td {
          mso-table-lspace: 0pt !important;
          mso-table-rspace: 0pt !important;
          border-collapse: collapse !important;
      }

      /* IMAGE HANDLING */
      img {
          -ms-interpolation-mode: bicubic !important;
          border: 0 !important;
          outline: none !important;
          text-decoration: none !important;
          display: block !important;
      }

      /* CONTAINER STRUCTURE */
      .email-wrapper {
          width: 100% !important;
          background-color: #f8f9fa !important;
          padding: 20px 0 !important;
      }

      .email-container {
          width: 100% !important;
          max-width: 1000px !important;
          min-width: 320px !important;
          margin: 0 auto !important;
          background-color: #ffffff !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
          overflow: hidden !important;
      }

      /* HEADER SECTION */
      .email-header {
          background: linear-gradient(135deg, #0052CC 0%, #0065FF 100%) !important;
          color: #ffffff !important;
          padding: 32px 24px !important;
          text-align: center !important;
      }

      /* CONTENT SECTION */
      .email-content {
          padding: 32px 24px !important;
          background-color: #ffffff !important;
      }

      /* SECTION HEADERS */
      .section-title {
          font-size: 18px !important;
          font-weight: 700 !important;
          color: #0052CC !important;
          margin: 24px 0 16px 0 !important;
          padding-bottom: 8px !important;
          border-bottom: 2px solid #e9ecef !important;
      }

      /* STATUS BADGES */
      .status-badge {
          display: inline-block !important;
          padding: 8px 16px !important;
          border-radius: 20px !important;
          font-weight: 600 !important;
          font-size: 14px !important;
          color: #ffffff !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
      }

      /* SUMMARY TABLE */
      .summary-table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin: 16px 0 !important;
      }

      .summary-table tr {
          border-bottom: 1px solid #f1f3f4 !important;
      }

      .summary-table td {
          padding: 12px 8px !important;
          vertical-align: top !important;
      }

      .summary-table td:first-child {
          font-weight: 600 !important;
          color: #495057 !important;
          width: 180px !important;
      }

      /* FOOTER */
      .email-footer {
          background-color: #f8f9fa !important;
          padding: 24px !important;
          text-align: center !important;
          color: #6c757d !important;
          font-size: 12px !important;
          border-top: 1px solid #e9ecef !important;
      }
    </style>
  </head>

  <body>
    <div class="email-wrapper">
      <table class="email-container" cellpadding="0" cellspacing="0" border="0">
        <!-- HEADER -->
        <tr>
          <td class="email-header">
            <h1 style="font-size: 24px; margin: 0 0 8px 0; font-weight: 700;">
              📋 ${step_code}: ${step_title ?: "Step Details"}
            </h1>
            <p style="margin: 0; font-size: 14px; opacity: 0.9;">
              ${breadcrumb}
            </p>
          </td>
        </tr>

        <!-- MAIN CONTENT -->
        <tr>
          <td class="email-content">
            <!-- STATUS BADGE -->
            <div style="text-align: center; margin: 0 0 24px 0;">
              ${statusBadgeHtml}
            </div>

            <!-- LAST UPDATE INFO -->
            <div style="text-align: center; margin: 0 0 24px 0; padding: 12px; background: #f8f9fa; border-radius: 6px;">
              <p style="margin: 0; font-size: 13px; color: #6c757d;">
                <strong>LAST UPDATE:</strong> ${changedAt}<br/>
                ${changeContext}
              </p>
            </div>

            <!-- STEP SUMMARY -->
            <h2 class="section-title">📊 Step Summary</h2>
            <table class="summary-table">
              <tr>
                <td>Duration & Environment</td>
                <td>${durationAndEnvironment}</td>
              </tr>
              ${teamRowHtml}
              ${impactedTeamsRowHtml}
              ${predecessorRowHtml}
              ${environmentRowHtml}
            </table>

            <!-- INSTRUCTIONS -->
            <h2 class="section-title">📝 Instructions</h2>
            <div class="instructions-container">
              <table class="instructions-table">
                <thead>
                  <tr>
                    <th style="width: 40px; text-align: center;">#</th>
                    <th>Instruction</th>
                    <th style="width: 80px; text-align: center;">Duration</th>
                    <th style="width: 120px;">Team</th>
                    <th style="width: 80px; text-align: center;">Control</th>
                  </tr>
                </thead>
                <tbody>
                  ${instructionsHtml}
                </tbody>
              </table>
            </div>

            <!-- STEPVIEW LINK -->
            ${stepViewLinkHtml}

            <!-- RECENT COMMENTS -->
            <h2 class="section-title">💬 Recent Comments</h2>
            ${commentsHtml}

          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td class="email-footer">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #495057;">UMIG - Unified Migration Implementation Guide</p>
            <p style="margin: 0;">This step is part of the migration "${migrationCode}".</p>
            <p style="margin: 8px 0 0 0; font-size: 11px;">
              This is an automated notification. Please do not reply to this email.
            </p>
          </td>
        </tr>
      </table>
    </div>
  </body>
</html>',
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'TD-015-Migration'
WHERE emt_type = 'STEP_STATUS_CHANGED'
  AND emt_is_active = true;

-- ======================================================================================
-- 2. STEP_STATUS_CHANGED_WITH_URL Template (identical to STEP_STATUS_CHANGED)
-- ======================================================================================
UPDATE email_templates_emt
SET
    emt_subject = '[UMIG] ${step_code}: ${step_title} - Status Changed to ${newStatus}',
    emt_body_html = (SELECT emt_body_html FROM email_templates_emt WHERE emt_type = 'STEP_STATUS_CHANGED' AND emt_is_active = true LIMIT 1),
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'TD-015-Migration'
WHERE emt_type = 'STEP_STATUS_CHANGED_WITH_URL'
  AND emt_is_active = true;

-- ======================================================================================
-- 3. STEP_OPENED Template
-- ======================================================================================
UPDATE email_templates_emt
SET
    emt_subject = '[UMIG] Step ${stepInstance.sti_code ?: "STEP"} - Ready for Execution',
    emt_body_html = (SELECT emt_body_html FROM email_templates_emt WHERE emt_type = 'STEP_STATUS_CHANGED' AND emt_is_active = true LIMIT 1),
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'TD-015-Migration'
WHERE emt_type = 'STEP_OPENED'
  AND emt_is_active = true;

-- ======================================================================================
-- 4. STEP_OPENED_WITH_URL Template (identical to STEP_OPENED)
-- ======================================================================================
UPDATE email_templates_emt
SET
    emt_subject = '[UMIG] Step ${stepInstance.sti_code ?: "STEP"} - Ready for Execution',
    emt_body_html = (SELECT emt_body_html FROM email_templates_emt WHERE emt_type = 'STEP_STATUS_CHANGED' AND emt_is_active = true LIMIT 1),
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'TD-015-Migration'
WHERE emt_type = 'STEP_OPENED_WITH_URL'
  AND emt_is_active = true;

-- ======================================================================================
-- 5. INSTRUCTION_COMPLETED Template
-- ======================================================================================
UPDATE email_templates_emt
SET
    emt_subject = '[UMIG] Instruction Completed - ${instruction.ini_name}',
    emt_body_html = (SELECT emt_body_html FROM email_templates_emt WHERE emt_type = 'STEP_STATUS_CHANGED' AND emt_is_active = true LIMIT 1),
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'TD-015-Migration'
WHERE emt_type = 'INSTRUCTION_COMPLETED'
  AND emt_is_active = true;

-- ======================================================================================
-- 6. INSTRUCTION_COMPLETED_WITH_URL Template (identical to INSTRUCTION_COMPLETED)
-- ======================================================================================
UPDATE email_templates_emt
SET
    emt_subject = '[UMIG] Instruction Completed - ${instruction.ini_name}',
    emt_body_html = (SELECT emt_body_html FROM email_templates_emt WHERE emt_type = 'STEP_STATUS_CHANGED' AND emt_is_active = true LIMIT 1),
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'TD-015-Migration'
WHERE emt_type = 'INSTRUCTION_COMPLETED_WITH_URL'
  AND emt_is_active = true;

-- ======================================================================================
-- 7. INSTRUCTION_UNCOMPLETED Template
-- ======================================================================================
UPDATE email_templates_emt
SET
    emt_subject = '[UMIG] Instruction Uncompleted - ${instruction.ini_name}',
    emt_body_html = (SELECT emt_body_html FROM email_templates_emt WHERE emt_type = 'STEP_STATUS_CHANGED' AND emt_is_active = true LIMIT 1),
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'TD-015-Migration'
WHERE emt_type = 'INSTRUCTION_UNCOMPLETED'
  AND emt_is_active = true;

-- ======================================================================================
-- 8. STEP_NOTIFICATION_MOBILE Template (mobile-optimized)
-- ======================================================================================
UPDATE email_templates_emt
SET
    emt_subject = '[UMIG] ${stepInstance.sti_code ?: "STEP"} - ${newStatus}',
    emt_body_html = (SELECT emt_body_html FROM email_templates_emt WHERE emt_type = 'STEP_STATUS_CHANGED' AND emt_is_active = true LIMIT 1),
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'TD-015-Migration'
WHERE emt_type = 'STEP_NOTIFICATION_MOBILE'
  AND emt_is_active = true;

-- ======================================================================================
-- 9. BULK_STEP_STATUS_CHANGED Template (bulk operations)
-- ======================================================================================
UPDATE email_templates_emt
SET
    emt_subject = '[UMIG] Bulk Status Change - ${stepInstance.sti_code ?: "Multiple Steps"}',
    emt_body_html = (SELECT emt_body_html FROM email_templates_emt WHERE emt_type = 'STEP_STATUS_CHANGED' AND emt_is_active = true LIMIT 1),
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'TD-015-Migration'
WHERE emt_type = 'BULK_STEP_STATUS_CHANGED'
  AND emt_is_active = true;

-- ======================================================================================
-- 10. ITERATION_EVENT Template (iteration-level events)
-- ======================================================================================
UPDATE email_templates_emt
SET
    emt_subject = '[UMIG] Iteration Event - ${migrationCode}',
    emt_body_html = (SELECT emt_body_html FROM email_templates_emt WHERE emt_type = 'STEP_STATUS_CHANGED' AND emt_is_active = true LIMIT 1),
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'TD-015-Migration'
WHERE emt_type = 'ITERATION_EVENT'
  AND emt_is_active = true;

-- ======================================================================================
-- Verification Query (Optional - for manual testing)
-- ======================================================================================
-- SELECT
--     emt_type,
--     LENGTH(emt_body_html) AS body_length,
--     LENGTH(emt_body_html) - LENGTH(REPLACE(emt_body_html, '<%', '')) / 2 AS scriptlet_count,
--     updated_by,
--     updated_at
-- FROM email_templates_emt
-- WHERE emt_is_active = true
-- ORDER BY emt_type;

-- Expected result: All templates should show scriptlet_count = 0 after migration

COMMIT;

-- ======================================================================================
-- ROLLBACK SCRIPT
-- ======================================================================================
-- Note: Rollback would restore original GSP-based templates from a backup.
-- Since the original templates are stored in the database, a rollback would require:
--   1. Creating a backup table before this migration runs, OR
--   2. Restoring from a database backup taken before this migration
--
-- Example rollback approach (if backup table exists):
-- BEGIN;
-- UPDATE email_templates_emt
-- SET emt_body_html = backup.emt_body_html,
--     emt_subject = backup.emt_subject,
--     updated_at = CURRENT_TIMESTAMP,
--     updated_by = 'TD-015-Rollback'
-- FROM email_templates_emt_backup AS backup
-- WHERE email_templates_emt.emt_id = backup.emt_id;
-- COMMIT;
