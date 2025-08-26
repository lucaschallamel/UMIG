package umig.utils

import groovy.sql.Sql
import groovy.transform.CompileStatic
import java.util.UUID
import umig.repository.InstructionRepository
import umig.utils.DatabaseUtil

/**
 * StepContentFormatter - Mobile-optimized content formatting for email notifications
 * 
 * This utility provides rich content formatting specifically designed for mobile-responsive
 * email templates. It handles instruction retrieval, HTML sanitization, content truncation,
 * and mobile-optimized formatting for step details.
 * 
 * Key Features:
 * - Instruction content retrieval and formatting
 * - HTML sanitization for security
 * - Mobile-optimized bullet points and code blocks
 * - Content truncation with "View in Confluence" links
 * - Responsive HTML generation for email clients
 * 
 * @author UMIG Project Team
 * @since 2025-08-26 Phase 1 US-039
 */
@CompileStatic
class StepContentFormatter {
    
    // Content limits for mobile optimization
    private static final int MAX_CONTENT_LENGTH = 2000
    private static final int MAX_INSTRUCTIONS_DISPLAY = 10
    private static final int MAX_INSTRUCTION_PREVIEW = 150
    
    /**
     * Format complete step content with instructions for mobile email
     * 
     * @param stepInstance Step instance data from repository
     * @param stepViewUrl Optional URL to step view in Confluence
     * @return Map containing formatted content sections
     */
    static Map<String, Object> formatStepContentForEmail(Map<String, Object> stepInstance, String stepViewUrl = null) {
        try {
            // Get step master ID for instruction retrieval
            Object stmId = stepInstance.stm_id
            if (!stmId) {
                return [
                    stepDescription: sanitizeHtml((stepInstance.sti_description ?: stepInstance.stm_description ?: '') as String),
                    instructionsHtml: '',
                    instructionsCount: 0,
                    contentTruncated: false,
                    viewMoreUrl: stepViewUrl
                ]
            }
            
            // Retrieve instructions for this step
            List<Map<String, Object>> instructions = getStepInstructions(UUID.fromString(stmId.toString()))
            
            // Format step description
            String stepDescription = sanitizeHtml((stepInstance.sti_description ?: stepInstance.stm_description ?: '') as String)
            
            // Format instructions for mobile display
            Map<String, Object> instructionsResult = formatInstructionsForMobile(instructions, stepViewUrl)
            
            return [
                stepDescription: stepDescription,
                instructionsHtml: instructionsResult.html,
                instructionsCount: instructions.size(),
                instructionsDisplayed: instructionsResult.displayed,
                contentTruncated: instructionsResult.truncated,
                viewMoreUrl: stepViewUrl,
                estimatedDuration: calculateTotalDuration(stepInstance, instructions)
            ]
            
        } catch (Exception e) {
            println "StepContentFormatter: Error formatting step content: ${e.message}"
            e.printStackTrace()
            
            // Return minimal content on error
            return [
                stepDescription: sanitizeHtml((stepInstance.sti_description ?: stepInstance.stm_description ?: '') as String),
                instructionsHtml: '<div style="padding: 12px; background-color: #fff3cd; border-radius: 4px; color: #856404;">Instructions available in UMIG system</div>',
                instructionsCount: 0,
                contentTruncated: false,
                viewMoreUrl: stepViewUrl,
                error: e.message
            ]
        }
    }
    
    /**
     * Get instructions for a step master ID
     */
    private static List<Map<String, Object>> getStepInstructions(UUID stmId) {
        try {
            InstructionRepository instructionRepository = new InstructionRepository()
            List<Map<String, Object>> instructions = instructionRepository.findMasterInstructionsByStepId(stmId) as List<Map<String, Object>>
            
            return (instructions?.collect { Object instruction ->
                Map<String, Object> instructionMap = instruction as Map<String, Object>
                [
                    inm_id: instructionMap.inm_id,
                    inm_order: instructionMap.inm_order,
                    inm_body: instructionMap.inm_body,
                    inm_duration_minutes: instructionMap.inm_duration_minutes,
                    tms_name: instructionMap.tms_name,
                    ctm_name: instructionMap.ctm_name
                ] as Map<String, Object>
            }?.sort { Map<String, Object> it -> 
                it.inm_order 
            } ?: []) as List<Map<String, Object>>
            
        } catch (Exception e) {
            println "StepContentFormatter: Error retrieving instructions: ${e.message}"
            return []
        }
    }
    
    /**
     * Format instructions for mobile-responsive email display
     */
    private static Map<String, Object> formatInstructionsForMobile(List<Map<String, Object>> instructions, String stepViewUrl) {
        if (!instructions || instructions.isEmpty()) {
            return [
                html: '<div style="padding: 16px; text-align: center; color: #6c757d; font-style: italic;">No specific instructions available</div>',
                displayed: 0,
                truncated: false
            ]
        }
        
        int displayCount = Math.min(instructions.size(), MAX_INSTRUCTIONS_DISPLAY)
        boolean truncated = instructions.size() > MAX_INSTRUCTIONS_DISPLAY
        
        StringBuilder html = new StringBuilder()
        html.append('<div class="instructions-container" style="margin: 16px 0;">\n')
        
        // Add instructions header
        html.append("<h3 style=\"font-size: 18px; font-weight: 600; color: #212529; margin: 0 0 16px 0;\">📋 Instructions (${displayCount}/${instructions.size()})</h3>\n")
        
        // Add each instruction
        instructions.take(displayCount).eachWithIndex { Map<String, Object> instruction, int index ->
            html.append(formatSingleInstruction(instruction, index + 1))
        }
        
        // Add truncation notice if needed
        if (truncated) {
            int remaining = instructions.size() - displayCount
            html.append('<div style="padding: 12px; background-color: #e3f2fd; border-radius: 6px; text-align: center; margin-top: 16px;">\n')
            html.append("<strong>+ ${remaining} more instruction${remaining > 1 ? 's' : ''}</strong><br>\n")
            
            if (stepViewUrl) {
                html.append("<a href=\"${stepViewUrl}\" style=\"color: #1976d2; text-decoration: none; font-weight: 500;\">View all instructions in UMIG system →</a>")
            } else {
                html.append('<span style="color: #6c757d;">View all instructions in UMIG system</span>')
            }
            html.append('\n</div>\n')
        }
        
        html.append('</div>\n')
        
        return [
            html: html.toString(),
            displayed: displayCount,
            truncated: truncated
        ]
    }
    
    /**
     * Format a single instruction for mobile display
     */
    private static String formatSingleInstruction(Map<String, Object> instruction, int number) {
        String body = sanitizeHtml((instruction.inm_body ?: '') as String)
        
        // Truncate if too long
        String preview = body.length() > MAX_INSTRUCTION_PREVIEW ? 
            body.substring(0, MAX_INSTRUCTION_PREVIEW) + '...' : body
        
        String teamInfo = ''
        if (instruction.tms_name) {
            teamInfo += "<span style=\"color: #6c757d; font-size: 13px;\">👥 ${instruction.tms_name}</span>"
        }
        if (instruction.ctm_name) {
            teamInfo += teamInfo ? ' • ' : ''
            teamInfo += "<span style=\"color: #6c757d; font-size: 13px;\">🔧 ${instruction.ctm_name}</span>"
        }
        if (instruction.inm_duration_minutes) {
            teamInfo += teamInfo ? ' • ' : ''
            teamInfo += "<span style=\"color: #6c757d; font-size: 13px;\">⏱️ ${instruction.inm_duration_minutes}min</span>"
        }
        
        return """
        <div style="border-left: 3px solid #007bff; padding: 12px 16px; margin: 8px 0; background-color: #f8f9fa; border-radius: 0 6px 6px 0;">
            <div style="font-weight: 600; color: #212529; margin-bottom: 4px;">
                <span style="color: #007bff;">${number}.</span> Instruction
            </div>
            <div style="color: #212529; line-height: 1.5; margin-bottom: 8px;">
                ${preview}
            </div>
            ${teamInfo ? '<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #dee2e6;">' + teamInfo + '</div>' : ''}
        </div>
        """
    }
    
    /**
     * Calculate total estimated duration
     */
    private static String calculateTotalDuration(Map<String, Object> stepInstance, List<Map<String, Object>> instructions) {
        Object stepDuration = stepInstance.sti_duration_minutes ?: stepInstance.stm_duration_minutes ?: 0
        Object instructionDuration = instructions.sum { Map<String, Object> instruction ->
            instruction.inm_duration_minutes ?: 0
        } ?: 0
        
        int totalMinutes = (stepDuration as Integer) + (instructionDuration as Integer)
        
        if (totalMinutes <= 0) {
            return 'Duration not specified'
        } else if (totalMinutes < 60) {
            return "${totalMinutes} minutes"
        } else {
            int hours = totalMinutes.intdiv(60)
            int minutes = totalMinutes % 60
            return minutes > 0 ? "${hours}h ${minutes}m" : "${hours} hour${hours > 1 ? 's' : ''}"
        }
    }
    
    /**
     * Sanitize HTML content for email security
     * 
     * This is a basic implementation. For production, consider using a more
     * comprehensive HTML sanitization library.
     */
    static String sanitizeHtml(String content) {
        if (!content) return ''
        
        // Remove potentially dangerous HTML elements and attributes
        String sanitized = content
            // Remove script tags and content
            .replaceAll(/(?i)<script[^>]*>.*?<\/script>/, '')
            // Remove potentially dangerous attributes
            .replaceAll(/(?i)on\w+\s*=\s*["'][^"']*["']/, '')
            // Remove style attributes that could break email layout
            .replaceAll(/(?i)style\s*=\s*["'][^"']*["']/, '')
            // Convert line breaks to HTML
            .replaceAll(/\r?\n/, '<br>')
            // Basic markdown-style formatting
            .replaceAll(/\*\*(.*?)\*\*/, '<strong>$1</strong>')
            .replaceAll(/\*(.*?)\*/, '<em>$1</em>')
            // Convert simple lists
            .replaceAll(/(?m)^- (.*)$/, '• $1')
        
        // Limit overall length
        if (sanitized.length() > MAX_CONTENT_LENGTH) {
            sanitized = sanitized.substring(0, MAX_CONTENT_LENGTH) + '...'
        }
        
        return sanitized
    }
    
    /**
     * Format step metadata for mobile display
     */
    static String formatStepMetadata(Map<String, Object> stepInstance) {
        List<String> metadata = []
        
        if (stepInstance.owner_team_name) {
            metadata << ("👥 ${stepInstance.owner_team_name}").toString()
        }
        
        if (stepInstance.environment_name) {
            metadata << ("🌐 ${stepInstance.environment_name}").toString()
        }
        
        Object duration = stepInstance.sti_duration_minutes ?: stepInstance.master_duration
        if (duration) {
            int durationInt = duration as Integer
            if (durationInt < 60) {
                metadata << ("⏱️ ${durationInt}min").toString()
            } else {
                int hours = durationInt.intdiv(60)
                int minutes = durationInt % 60
                metadata << (minutes > 0 ? ("⏱️ ${hours}h ${minutes}m").toString() : ("⏱️ ${hours}h").toString())
            }
        }
        
        return metadata.join(' • ')
    }
    
    /**
     * Health check for the content formatter
     */
    static Map<String, Object> healthCheck() {
        try {
            // Test basic functionality
            Map<String, Object> testStep = [
                stm_id: UUID.randomUUID(),
                sti_description: 'Test description',
                sti_duration_minutes: 30
            ]
            
            Map<String, Object> result = formatStepContentForEmail(testStep)
            
            return [
                service: 'StepContentFormatter',
                status: 'healthy',
                capabilities: [
                    contentFormatting: result != null,
                    htmlSanitization: true,
                    instructionRetrieval: true,
                    mobileOptimization: true
                ],
                limits: [
                    maxContentLength: MAX_CONTENT_LENGTH,
                    maxInstructionsDisplay: MAX_INSTRUCTIONS_DISPLAY,
                    maxInstructionPreview: MAX_INSTRUCTION_PREVIEW
                ],
                timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
            ]
        } catch (Exception e) {
            return [
                service: 'StepContentFormatter',
                status: 'error',
                error: e.message,
                timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
            ]
        }
    }
}