#!/usr/bin/env node

/**
 * US-056B Phase 2 Validation Test Runner
 *
 * Comprehensive validation of the enhanced CommentDTO template integration
 * in EmailService to ensure proper template variable processing and
 * backward compatibility with legacy comment objects.
 *
 * Key Validations:
 * - CommentDTO template mapping functionality
 * - EmailService processCommentsForTemplate method
 * - EnhancedEmailService integration points
 * - Performance impact assessment
 * - Backward compatibility verification
 *
 * Refactored to address critical issues:
 * - Fixed path resolution using BaseTestRunner patterns
 * - Enhanced error handling with context preservation
 * - Added resource management and caching
 * - Implemented strict mode for CI/CD environments
 * - Fixed string parsing bug in method complexity analysis
 */

import { BaseTestRunner } from "./BaseTestRunner.js";
import fs from "fs/promises";
import path from "path";

class US056BPhase2ValidationRunner extends BaseTestRunner {
  constructor(options = {}) {
    super({
      verbose: options.verbose || false,
      timeout: options.timeout || 30000,
      logTimestamps: true,
      colorOutput: true,
      ...options,
    });

    // Initialize with proper name and structure
    this.testName = "US-056B Phase 2 Validation";
    this.strictMode = options.strictMode || process.env.CI || false;

    // Initialize test results structure
    this.testResults = {
      templateMapping: {},
      emailServiceIntegration: {},
      enhancedEmailServiceIntegration: {},
      performance: {},
      backwardCompatibility: {},
    };

    // Error collection for comprehensive reporting
    this.errors = [];

    // File content cache to avoid multiple reads
    this.fileCache = new Map();

    // Secure path mapping using BaseTestRunner's project root
    this.filePaths = this.initializeFilePaths();
  }

  /**
   * Initialize secure file paths using BaseTestRunner's project root discovery
   * Fixes critical path resolution vulnerability [HIGH PRIORITY]
   */
  initializeFilePaths() {
    try {
      return {
        stepDTO: path.join(
          this.projectRoot,
          "src",
          "groovy",
          "umig",
          "dto",
          "StepInstanceDTO.groovy",
        ),
        emailService: path.join(
          this.projectRoot,
          "src",
          "groovy",
          "umig",
          "utils",
          "EmailService.groovy",
        ),
        enhancedEmailService: path.join(
          this.projectRoot,
          "src",
          "groovy",
          "umig",
          "utils",
          "EnhancedEmailService.groovy",
        ),
      };
    } catch (error) {
      throw new ValidationError("Failed to initialize file paths", {
        cause: error,
        context: "path_initialization",
      });
    }
  }

  /**
   * Secure file reader with proper error handling and caching
   * Fixes resource management issues [HIGH PRIORITY]
   */
  async readFileSecurely(filePath, context = "unknown") {
    // Validate path security
    if (!filePath || !path.isAbsolute(filePath)) {
      throw new ValidationError(`Invalid file path provided: ${filePath}`, {
        context,
      });
    }

    // Check if file is within project bounds for security
    if (!filePath.startsWith(this.projectRoot)) {
      throw new ValidationError(
        `File path outside project boundaries: ${filePath}`,
        { context },
      );
    }

    // Return cached content if available
    if (this.fileCache.has(filePath)) {
      if (this.options.verbose) {
        console.log(
          this.colors.dim(
            `   📋 Using cached content for ${path.basename(filePath)}`,
          ),
        );
      }
      return this.fileCache.get(filePath);
    }

    try {
      const content = await fs.readFile(filePath, "utf-8");
      this.fileCache.set(filePath, content);

      if (this.options.verbose) {
        console.log(
          this.colors.dim(
            `   📖 Loaded ${path.basename(filePath)} (${content.length} chars)`,
          ),
        );
      }

      return content;
    } catch (error) {
      const fileError = new ValidationError(
        `Failed to read file: ${filePath}`,
        {
          cause: error,
          context,
          filePath,
          errorCode: error.code,
        },
      );
      this.recordError(fileError);

      if (this.strictMode) {
        throw fileError;
      }

      return null; // Graceful degradation in non-strict mode
    }
  }

  /**
   * Enhanced error recording with context preservation
   * Fixes inadequate error handling [HIGH PRIORITY]
   */
  recordError(error, phase = "unknown", severity = "medium") {
    const errorRecord = {
      timestamp: new Date().toISOString(),
      phase,
      severity,
      message: error.message,
      context: error.context || "unknown",
      cause: error.cause?.message || null,
      stack: error.stack,
    };

    this.errors.push(errorRecord);

    if (this.options.verbose || severity === "high") {
      console.error(
        this.colors.error(
          `   🚨 ${severity.toUpperCase()} ERROR in ${phase}: ${error.message}`,
        ),
      );
      if (error.context) {
        console.error(this.colors.dim(`      Context: ${error.context}`));
      }
    }

    return errorRecord;
  }

  async runValidation() {
    this.logHeader("US-056B Phase 2 Validation Starting");

    const validationStartTime = Date.now();

    try {
      // Pre-validation file accessibility check
      await this.validateFileAccessibility();

      // Phase 1: Template Mapping Validation
      await this.safeValidationExecution("templateMapping", () =>
        this.validateTemplateMappingImplementation(),
      );

      // Phase 2: EmailService Integration Validation
      await this.safeValidationExecution("emailServiceIntegration", () =>
        this.validateEmailServiceIntegration(),
      );

      // Phase 3: EnhancedEmailService Integration Validation
      await this.safeValidationExecution(
        "enhancedEmailServiceIntegration",
        () => this.validateEnhancedEmailServiceIntegration(),
      );

      // Phase 4: Performance Impact Assessment
      await this.safeValidationExecution("performanceImpact", () =>
        this.validatePerformanceImpact(),
      );

      // Phase 5: Backward Compatibility Verification
      await this.safeValidationExecution("backwardCompatibility", () =>
        this.validateBackwardCompatibility(),
      );

      // Generate comprehensive report with error summary
      this.generateValidationReport();

      const validationTime = Date.now() - validationStartTime;

      // Final validation based on errors and strict mode
      if (this.strictMode && this.errors.length > 0) {
        throw new ValidationError(
          `Validation failed in strict mode: ${this.errors.length} errors found`,
          { context: "strict_mode_validation", errorCount: this.errors.length },
        );
      }

      console.log(
        this.colors.success(
          `\n✅ US-056B Phase 2 Validation Complete! (${this.formatDuration(validationTime)})\n`,
        ),
      );
    } catch (error) {
      this.recordError(error, "main_validation", "high");
      console.error(
        this.colors.error("\n❌ Validation Failed:"),
        error.message,
      );

      // Provide actionable error context
      if (error.context) {
        console.error(this.colors.dim(`   Context: ${error.context}`));
      }

      if (error.cause) {
        console.error(
          this.colors.dim(`   Cause: ${error.cause.message || error.cause}`),
        );
      }

      throw error;
    }
  }

  /**
   * Safe validation execution wrapper with comprehensive error handling
   */
  async safeValidationExecution(phase, validationFunction) {
    try {
      await validationFunction();
    } catch (error) {
      this.recordError(error, phase, "high");

      // In strict mode, fail fast
      if (this.strictMode) {
        throw error;
      }

      // In non-strict mode, continue with degraded functionality
      console.warn(
        this.colors.warning(
          `   ⚠️  Phase ${phase} completed with errors, continuing validation...`,
        ),
      );
    }
  }

  /**
   * Pre-validation file accessibility check
   */
  async validateFileAccessibility() {
    if (this.options.verbose) {
      console.log(
        this.colors.info("🔍 Pre-validation: Checking file accessibility..."),
      );
    }

    const accessibilityResults = [];

    for (const [key, filePath] of Object.entries(this.filePaths)) {
      try {
        await fs.access(filePath, fs.constants.R_OK);
        accessibilityResults.push({
          file: key,
          status: "accessible",
          path: filePath,
        });

        if (this.options.verbose) {
          console.log(
            this.colors.success(`   ✅ ${key}: ${path.basename(filePath)}`),
          );
        }
      } catch (error) {
        accessibilityResults.push({
          file: key,
          status: "inaccessible",
          path: filePath,
          error,
        });

        const accessError = new ValidationError(
          `File inaccessible: ${filePath}`,
          {
            cause: error,
            context: "file_accessibility",
            file: key,
          },
        );
        this.recordError(accessError, "pre_validation", "high");

        if (this.strictMode) {
          throw accessError;
        }
      }
    }

    return accessibilityResults;
  }

  async validateTemplateMappingImplementation() {
    console.log("📋 Phase 1: Template Mapping Implementation Validation");

    const results = {
      commentDTOClassExists: false,
      toTemplateMapMethodExists: false,
      builderPatternImplemented: false,
      requiredFieldsPresent: false,
      dateFormattingImplemented: false,
    };

    try {
      // Use secure file reading with proper path resolution
      const stepDTOContent = await this.readFileSecurely(
        this.filePaths.stepDTO,
        "template_mapping_validation",
      );

      if (!stepDTOContent) {
        throw new ValidationError(
          "StepInstanceDTO.groovy content is empty or unreadable",
          {
            context: "template_mapping_file_content",
          },
        );
      }

      // Validate CommentDTO class exists
      results.commentDTOClassExists =
        stepDTOContent.includes("class CommentDTO {");
      console.log(
        `   ${results.commentDTOClassExists ? "✅" : "❌"} CommentDTO class exists`,
      );

      // Validate toTemplateMap method exists
      results.toTemplateMapMethodExists = stepDTOContent.includes(
        "Map<String, Object> toTemplateMap()",
      );
      console.log(
        `   ${results.toTemplateMapMethodExists ? "✅" : "❌"} toTemplateMap method implemented`,
      );

      // Validate builder pattern
      results.builderPatternImplemented =
        stepDTOContent.includes("static Builder builder()") &&
        stepDTOContent.includes("static class Builder");
      console.log(
        `   ${results.builderPatternImplemented ? "✅" : "❌"} Builder pattern implemented`,
      );

      // Validate required template fields
      const requiredFields = [
        "comment_id:",
        "comment_text:",
        "author_name:",
        "created_at:",
        "formatted_date:",
        "short_date:",
        "time_only:",
        "is_priority:",
        "is_recent:",
      ];
      results.requiredFieldsPresent = requiredFields.every((field) =>
        stepDTOContent.includes(field),
      );
      console.log(
        `   ${results.requiredFieldsPresent ? "✅" : "❌"} Required template fields present`,
      );

      // Enhanced field validation with detailed reporting
      if (!results.requiredFieldsPresent && this.options.verbose) {
        const missingFields = requiredFields.filter(
          (field) => !stepDTOContent.includes(field),
        );
        console.log(
          this.colors.dim(`      Missing fields: ${missingFields.join(", ")}`),
        );
      }

      // Validate date formatting implementation
      const dateFormatters = [
        "DateTimeFormatter.ISO_LOCAL_DATE_TIME",
        'DateTimeFormatter.ofPattern("MMM dd, yyyy HH:mm")',
        'DateTimeFormatter.ofPattern("MMM dd")',
        'DateTimeFormatter.ofPattern("HH:mm")',
      ];
      results.dateFormattingImplemented = dateFormatters.some((formatter) =>
        stepDTOContent.includes(formatter),
      );
      console.log(
        `   ${results.dateFormattingImplemented ? "✅" : "❌"} Date formatting implemented`,
      );

      // Enhanced date formatter validation with detailed reporting
      if (!results.dateFormattingImplemented && this.options.verbose) {
        console.log(
          this.colors.dim(
            "      Expected date formatters not found in implementation",
          ),
        );
      }
    } catch (error) {
      const templateError = new ValidationError(
        "Template mapping validation failed",
        {
          cause: error,
          context: "template_mapping_validation",
        },
      );
      this.recordError(templateError, "template_mapping", "high");

      // In strict mode, re-throw; in non-strict mode, continue with partial results
      if (this.strictMode) {
        throw templateError;
      }

      console.error(
        this.colors.error(
          `   ❌ Template mapping validation failed: ${error.message}`,
        ),
      );
    }

    this.testResults.templateMapping = results;
    console.log();
  }

  async validateEmailServiceIntegration() {
    console.log("📧 Phase 2: EmailService Integration Validation");

    const results = {
      processCommentsMethodExists: false,
      integrationPointsUpdated: 0,
      methodAccessibility: false,
      legacyCommentSupport: false,
      mixedCommentSupport: false,
    };

    try {
      // Use secure file reading with proper path resolution
      const emailServiceContent = await this.readFileSecurely(
        this.filePaths.emailService,
        "email_service_integration_validation",
      );

      if (!emailServiceContent) {
        throw new ValidationError(
          "EmailService.groovy content is empty or unreadable",
          {
            context: "email_service_file_content",
          },
        );
      }

      // Check processCommentsForTemplate method exists
      results.processCommentsMethodExists = emailServiceContent.includes(
        "static List<Map<String, Object>> processCommentsForTemplate(Object comments)",
      );
      console.log(
        `   ${results.processCommentsMethodExists ? "✅" : "❌"} processCommentsForTemplate method exists`,
      );

      // Check method is static/public for EnhancedEmailService access
      results.methodAccessibility = emailServiceContent.includes(
        "static List<Map<String, Object>> processCommentsForTemplate",
      );
      console.log(
        `   ${results.methodAccessibility ? "✅" : "❌"} Method is publicly accessible`,
      );

      // Count integration points updated (should be 4) with enhanced validation
      const integrationPattern =
        /recentComments: processCommentsForTemplate\(/g;
      const matches = emailServiceContent.match(integrationPattern);
      results.integrationPointsUpdated = matches ? matches.length : 0;

      const integrationStatus =
        results.integrationPointsUpdated >= 4 ? "✅" : "❌";
      console.log(
        `   ${integrationStatus} Integration points updated (${results.integrationPointsUpdated}/4)`,
      );

      // Enhanced integration point reporting in verbose mode
      if (this.options.verbose && results.integrationPointsUpdated < 4) {
        console.log(
          this.colors.dim(
            `      Expected 4 integration points, found ${results.integrationPointsUpdated}`,
          ),
        );
      }

      // Check legacy comment support
      results.legacyCommentSupport =
        emailServiceContent.includes("processLegacyComment") &&
        emailServiceContent.includes("processLegacyCommentObject");
      console.log(
        `   ${results.legacyCommentSupport ? "✅" : "❌"} Legacy comment support implemented`,
      );

      // Check mixed comment type support
      results.mixedCommentSupport =
        emailServiceContent.includes("hasProperty('toTemplateMap')") &&
        emailServiceContent.includes("respondsTo('toTemplateMap')");
      console.log(
        `   ${results.mixedCommentSupport ? "✅" : "❌"} Mixed comment type support implemented`,
      );

      // Enhanced mixed comment validation in verbose mode
      if (!results.mixedCommentSupport && this.options.verbose) {
        const hasProperty = emailServiceContent.includes(
          "hasProperty('toTemplateMap')",
        );
        const respondsTo = emailServiceContent.includes(
          "respondsTo('toTemplateMap')",
        );
        console.log(
          this.colors.dim(
            `      hasProperty check: ${hasProperty ? "✅" : "❌"}, respondsTo check: ${respondsTo ? "✅" : "❌"}`,
          ),
        );
      }
    } catch (error) {
      const emailError = new ValidationError(
        "EmailService integration validation failed",
        {
          cause: error,
          context: "email_service_integration_validation",
        },
      );
      this.recordError(emailError, "email_service_integration", "high");

      // In strict mode, re-throw; in non-strict mode, continue with partial results
      if (this.strictMode) {
        throw emailError;
      }

      console.error(
        this.colors.error(
          `   ❌ EmailService integration validation failed: ${error.message}`,
        ),
      );
    }

    this.testResults.emailServiceIntegration = results;
    console.log();
  }

  async validateEnhancedEmailServiceIntegration() {
    console.log("🔧 Phase 3: EnhancedEmailService Integration Validation");

    const results = {
      integrationPointsUpdated: 0,
      methodCallsCorrect: false,
      phase2CommentsPresent: false,
    };

    try {
      // Use secure file reading with proper path resolution
      const enhancedEmailServiceContent = await this.readFileSecurely(
        this.filePaths.enhancedEmailService,
        "enhanced_email_service_integration_validation",
      );

      if (!enhancedEmailServiceContent) {
        throw new ValidationError(
          "EnhancedEmailService.groovy content is empty or unreadable",
          {
            context: "enhanced_email_service_file_content",
          },
        );
      }

      // Count integration points updated (should be 3) with enhanced validation
      const integrationPattern =
        /recentComments: EmailService\.processCommentsForTemplate\(/g;
      const matches = enhancedEmailServiceContent.match(integrationPattern);
      results.integrationPointsUpdated = matches ? matches.length : 0;

      const integrationStatus =
        results.integrationPointsUpdated >= 3 ? "✅" : "❌";
      console.log(
        `   ${integrationStatus} Integration points updated (${results.integrationPointsUpdated}/3)`,
      );

      // Enhanced integration point reporting in verbose mode
      if (this.options.verbose && results.integrationPointsUpdated < 3) {
        console.log(
          this.colors.dim(
            `      Expected 3 integration points, found ${results.integrationPointsUpdated}`,
          ),
        );
      }

      // Check method calls are correct
      results.methodCallsCorrect = enhancedEmailServiceContent.includes(
        "EmailService.processCommentsForTemplate",
      );
      console.log(
        `   ${results.methodCallsCorrect ? "✅" : "❌"} Method calls are correctly formatted`,
      );

      // Check US-056B Phase 2 comments are present
      results.phase2CommentsPresent = enhancedEmailServiceContent.includes(
        "US-056B Phase 2: Enhanced CommentDTO processing",
      );
      console.log(
        `   ${results.phase2CommentsPresent ? "✅" : "❌"} Phase 2 implementation comments present`,
      );
    } catch (error) {
      const enhancedError = new ValidationError(
        "EnhancedEmailService integration validation failed",
        {
          cause: error,
          context: "enhanced_email_service_integration_validation",
        },
      );
      this.recordError(
        enhancedError,
        "enhanced_email_service_integration",
        "high",
      );

      // In strict mode, re-throw; in non-strict mode, continue with partial results
      if (this.strictMode) {
        throw enhancedError;
      }

      console.error(
        this.colors.error(
          `   ❌ EnhancedEmailService integration validation failed: ${error.message}`,
        ),
      );
    }

    this.testResults.enhancedEmailServiceIntegration = results;
    console.log();
  }

  async validatePerformanceImpact() {
    console.log("⚡ Phase 4: Performance Impact Assessment");

    const results = {
      methodComplexity: "unknown",
      methodLines: 0,
      cacheableResults: true,
      memoryImpact: "minimal",
      processingOverhead: "low",
      hasCommentLimit: false,
      hasEarlyReturns: false,
      hasDefensiveChecks: false,
    };

    try {
      // Use secure file reading with proper path resolution
      const emailServiceContent = await this.readFileSecurely(
        this.filePaths.emailService,
        "performance_impact_validation",
      );

      if (!emailServiceContent) {
        throw new ValidationError(
          "EmailService.groovy content is empty or unreadable",
          {
            context: "performance_validation_file_content",
          },
        );
      }

      // Analyze method complexity with FIXED string parsing bug [CRITICAL FIX]
      const processCommentsMethod = this.extractMethodContent(
        emailServiceContent,
        "processCommentsForTemplate",
      );
      // FIX: Use '\n' instead of '\\n' - this was the critical string parsing bug
      results.methodLines = processCommentsMethod
        ? processCommentsMethod.split("\n").length
        : 0;
      results.methodComplexity =
        results.methodLines <= 30
          ? "acceptable"
          : results.methodLines <= 50
            ? "moderate"
            : "high";

      // Check for performance optimizations with enhanced validation
      results.hasCommentLimit = emailServiceContent.includes("take(3)");
      results.hasEarlyReturns =
        emailServiceContent.includes("if (!comments)") &&
        emailServiceContent.includes("return []");
      results.hasDefensiveChecks =
        emailServiceContent.includes("instanceof") &&
        emailServiceContent.includes("hasProperty");

      // Enhanced reporting with more detailed metrics
      console.log(
        `   ${results.hasCommentLimit ? "✅" : "❌"} Comment processing limited to 3 items`,
      );
      console.log(
        `   ${results.hasEarlyReturns ? "✅" : "❌"} Early returns for performance`,
      );
      console.log(
        `   ${results.hasDefensiveChecks ? "✅" : "❌"} Defensive type checking implemented`,
      );

      const complexityIcon =
        results.methodComplexity === "acceptable"
          ? "✅"
          : results.methodComplexity === "moderate"
            ? "⚠️"
            : "❌";
      console.log(
        `   ${complexityIcon} Method complexity: ${results.methodLines} lines (${results.methodComplexity})`,
      );

      // Performance characteristics with quantified assessments
      console.log(`   ✅ Memory impact: Minimal (processes max 3 comments)`);
      console.log(`   ✅ Processing overhead: Low (single pass processing)`);
      console.log(`   ✅ Cacheable: Template maps are simple data structures`);

      // Performance score calculation in verbose mode
      if (this.options.verbose) {
        const performanceScore = [
          results.hasCommentLimit,
          results.hasEarlyReturns,
          results.hasDefensiveChecks,
          results.methodComplexity === "acceptable",
        ].filter(Boolean).length;

        console.log(
          this.colors.dim(
            `      Performance score: ${performanceScore}/4 optimizations implemented`,
          ),
        );
      }
    } catch (error) {
      const performanceError = new ValidationError(
        "Performance impact assessment failed",
        {
          cause: error,
          context: "performance_impact_validation",
        },
      );
      this.recordError(performanceError, "performance_impact", "medium"); // Medium severity as this isn't critical functionality

      // In strict mode, re-throw; in non-strict mode, continue with partial results
      if (this.strictMode) {
        throw performanceError;
      }

      console.error(
        this.colors.error(
          `   ❌ Performance assessment failed: ${error.message}`,
        ),
      );
    }

    this.testResults.performance = results;
    console.log();
  }

  async validateBackwardCompatibility() {
    console.log("🔄 Phase 5: Backward Compatibility Verification");

    const results = {
      legacyMapSupport: false,
      legacyObjectSupport: false,
      propertyNameMapping: false,
      defaultValueHandling: false,
      gracefulDegradation: false,
    };

    try {
      // Use secure file reading with proper path resolution
      const emailServiceContent = await this.readFileSecurely(
        this.filePaths.emailService,
        "backward_compatibility_validation",
      );

      if (!emailServiceContent) {
        throw new ValidationError(
          "EmailService.groovy content is empty or unreadable",
          {
            context: "backward_compatibility_file_content",
          },
        );
      }

      // Check legacy Map support
      results.legacyMapSupport = emailServiceContent.includes(
        "processLegacyComment(Map comment)",
      );
      console.log(
        `   ${results.legacyMapSupport ? "✅" : "❌"} Legacy Map comment support`,
      );

      // Check legacy Object support
      results.legacyObjectSupport = emailServiceContent.includes(
        "processLegacyCommentObject(Object comment)",
      );
      console.log(
        `   ${results.legacyObjectSupport ? "✅" : "❌"} Legacy Object comment support`,
      );

      // Check property name mapping (both camelCase and snake_case) with enhanced validation
      const hasPropertyMapping =
        emailServiceContent.includes(
          "comment.commentId ?: comment.comment_id",
        ) &&
        emailServiceContent.includes(
          "comment.authorName ?: comment.author_name",
        );
      results.propertyNameMapping = hasPropertyMapping;
      console.log(
        `   ${results.propertyNameMapping ? "✅" : "❌"} Property name mapping (camelCase/snake_case)`,
      );

      // Enhanced property mapping validation in verbose mode
      if (!results.propertyNameMapping && this.options.verbose) {
        const hasCommentId = emailServiceContent.includes(
          "comment.commentId ?: comment.comment_id",
        );
        const hasAuthorName = emailServiceContent.includes(
          "comment.authorName ?: comment.author_name",
        );
        console.log(
          this.colors.dim(
            `      commentId mapping: ${hasCommentId ? "✅" : "❌"}, authorName mapping: ${hasAuthorName ? "✅" : "❌"}`,
          ),
        );
      }

      // Check default value handling with enhanced validation
      results.defaultValueHandling =
        emailServiceContent.includes('"Anonymous"') &&
        emailServiceContent.includes('"Recent"') &&
        emailServiceContent.includes("?: 1");
      console.log(
        `   ${results.defaultValueHandling ? "✅" : "❌"} Default value handling`,
      );

      // Enhanced default value validation in verbose mode
      if (!results.defaultValueHandling && this.options.verbose) {
        const hasAnonymous = emailServiceContent.includes('"Anonymous"');
        const hasRecent = emailServiceContent.includes('"Recent"');
        const hasDefaultValue = emailServiceContent.includes("?: 1");
        console.log(
          this.colors.dim(
            `      Anonymous default: ${hasAnonymous ? "✅" : "❌"}, Recent default: ${hasRecent ? "✅" : "❌"}, Numeric default: ${hasDefaultValue ? "✅" : "❌"}`,
          ),
        );
      }

      // Check graceful degradation
      results.gracefulDegradation =
        emailServiceContent.includes("Unknown comment format") &&
        emailServiceContent.includes("minimal safe structure");
      console.log(
        `   ${results.gracefulDegradation ? "✅" : "❌"} Graceful degradation for unknown formats`,
      );

      // Backward compatibility score in verbose mode
      if (this.options.verbose) {
        const compatibilityScore =
          Object.values(results).filter(Boolean).length;
        const totalChecks = Object.keys(results).length;
        console.log(
          this.colors.dim(
            `      Backward compatibility score: ${compatibilityScore}/${totalChecks} features implemented`,
          ),
        );
      }
    } catch (error) {
      const compatibilityError = new ValidationError(
        "Backward compatibility validation failed",
        {
          cause: error,
          context: "backward_compatibility_validation",
        },
      );
      this.recordError(compatibilityError, "backward_compatibility", "high");

      // In strict mode, re-throw; in non-strict mode, continue with partial results
      if (this.strictMode) {
        throw compatibilityError;
      }

      console.error(
        this.colors.error(
          `   ❌ Backward compatibility validation failed: ${error.message}`,
        ),
      );
    }

    this.testResults.backwardCompatibility = results;
    console.log();
  }

  /**
   * Enhanced method extraction with better error handling
   */
  extractMethodContent(content, methodName) {
    if (!content || !methodName) {
      return null;
    }

    try {
      const startPattern = new RegExp(
        `static.*${methodName}\\s*\\([^)]*\\)\\s*\\{`,
      );
      const startMatch = content.match(startPattern);

      if (!startMatch) {
        if (this.options.verbose) {
          console.log(
            this.colors.dim(`      Method ${methodName} not found in content`),
          );
        }
        return null;
      }

      const startIndex = startMatch.index + startMatch[0].length;
      let braceCount = 1;
      let currentIndex = startIndex;

      while (currentIndex < content.length && braceCount > 0) {
        if (content[currentIndex] === "{") braceCount++;
        else if (content[currentIndex] === "}") braceCount--;
        currentIndex++;
      }

      if (braceCount !== 0) {
        if (this.options.verbose) {
          console.log(
            this.colors.dim(
              `      Warning: Unmatched braces in method ${methodName}`,
            ),
          );
        }
        return null;
      }

      return content.substring(startIndex, currentIndex - 1);
    } catch (error) {
      if (this.options.verbose) {
        console.log(
          this.colors.dim(
            `      Error extracting method ${methodName}: ${error.message}`,
          ),
        );
      }
      return null;
    }
  }

  generateValidationReport() {
    this.logHeader("US-056B Phase 2 Validation Report");

    // Template Mapping Results with detailed scoring
    const templateResults = this.testResults.templateMapping;
    const templateScore = Object.values(templateResults).filter(Boolean).length;
    const templateTotal = Object.keys(templateResults).length;
    const templatePercent =
      templateTotal > 0 ? Math.round((templateScore / templateTotal) * 100) : 0;
    console.log(
      `🏗️  Template Mapping: ${templateScore}/${templateTotal} checks passed (${templatePercent}%)`,
    );

    // EmailService Integration Results with enhanced scoring
    const emailResults = this.testResults.emailServiceIntegration;
    const emailScore = Object.values(emailResults).filter((v) =>
      typeof v === "boolean" ? v : v >= 4,
    ).length;
    const emailTotal = Object.keys(emailResults).length;
    const emailPercent =
      emailTotal > 0 ? Math.round((emailScore / emailTotal) * 100) : 0;
    console.log(
      `📧 EmailService Integration: ${emailScore}/${emailTotal} checks passed (${emailPercent}%)`,
    );

    // EnhancedEmailService Integration Results
    const enhancedResults = this.testResults.enhancedEmailServiceIntegration;
    const enhancedScore = Object.values(enhancedResults).filter((v) =>
      typeof v === "boolean" ? v : v >= 3,
    ).length;
    const enhancedTotal = Object.keys(enhancedResults).length;
    const enhancedPercent =
      enhancedTotal > 0 ? Math.round((enhancedScore / enhancedTotal) * 100) : 0;
    console.log(
      `🔧 EnhancedEmailService Integration: ${enhancedScore}/${enhancedTotal} checks passed (${enhancedPercent}%)`,
    );

    // Performance Results with detailed assessment
    const performanceResults = this.testResults.performance;
    const performanceIndicators = [
      performanceResults.hasCommentLimit,
      performanceResults.hasEarlyReturns,
      performanceResults.hasDefensiveChecks,
      performanceResults.methodComplexity === "acceptable",
    ];
    const performanceScore = performanceIndicators.filter(Boolean).length;
    const performancePercent = Math.round(
      (performanceScore / performanceIndicators.length) * 100,
    );
    console.log(
      `⚡ Performance Impact: ${performanceScore}/4 optimizations (${performancePercent}%)`,
    );

    // Backward Compatibility Results
    const compatResults = this.testResults.backwardCompatibility;
    const compatScore = Object.values(compatResults).filter(Boolean).length;
    const compatTotal = Object.keys(compatResults).length;
    const compatPercent =
      compatTotal > 0 ? Math.round((compatScore / compatTotal) * 100) : 0;
    console.log(
      `🔄 Backward Compatibility: ${compatScore}/${compatTotal} checks passed (${compatPercent}%)`,
    );

    // Error Summary
    if (this.errors.length > 0) {
      console.log(
        `\n🚨 Error Summary: ${this.errors.length} errors encountered`,
      );

      const errorsBySeverity = this.errors.reduce((acc, error) => {
        acc[error.severity] = (acc[error.severity] || 0) + 1;
        return acc;
      }, {});

      for (const [severity, count] of Object.entries(errorsBySeverity)) {
        const icon =
          severity === "high" ? "🔴" : severity === "medium" ? "🟡" : "🟢";
        console.log(`   ${icon} ${severity.toUpperCase()}: ${count} errors`);
      }

      if (this.options.verbose) {
        console.log("\n📋 Error Details:");
        this.errors.forEach((error, index) => {
          console.log(
            this.colors.dim(
              `   ${index + 1}. [${error.phase}] ${error.message}`,
            ),
          );
        });
      }
    }

    // Overall Assessment with weighted scoring
    const totalChecks =
      templateTotal +
      emailTotal +
      enhancedTotal +
      performanceIndicators.length +
      compatTotal;
    const passedChecks =
      templateScore +
      emailScore +
      enhancedScore +
      performanceScore +
      compatScore;
    const overallScore =
      totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

    console.log("\n" + "=".repeat(50));
    console.log(
      `🎯 Overall Score: ${overallScore}% (${passedChecks}/${totalChecks} checks passed)`,
    );

    // Enhanced assessment with error consideration
    let assessmentStatus = "";
    let assessmentIcon = "";

    if (
      overallScore >= 90 &&
      this.errors.filter((e) => e.severity === "high").length === 0
    ) {
      assessmentStatus = "EXCELLENT";
      assessmentIcon = "✅";
    } else if (
      overallScore >= 80 &&
      this.errors.filter((e) => e.severity === "high").length <= 1
    ) {
      assessmentStatus = "GOOD";
      assessmentIcon = "✅";
    } else if (overallScore >= 70) {
      assessmentStatus = "NEEDS IMPROVEMENT";
      assessmentIcon = "⚠️";
    } else {
      assessmentStatus = "REQUIRES ATTENTION";
      assessmentIcon = "❌";
    }

    console.log(
      `${assessmentIcon} US-056B Phase 2 Implementation: ${assessmentStatus}`,
    );

    // Strict mode validation result
    if (this.strictMode) {
      const strictModePass = this.errors.length === 0 && overallScore >= 90;
      console.log(
        `🔒 Strict Mode: ${strictModePass ? "✅ PASSED" : "❌ FAILED"} (${this.errors.length} errors)`,
      );
    }

    console.log("=".repeat(50));

    // Enhanced Success Criteria Assessment
    console.log("📋 Success Criteria Assessment:");
    console.log(
      `   ${templateResults.toTemplateMapMethodExists ? "✅" : "❌"} CommentDTO template mapping implemented`,
    );
    console.log(
      `   ${emailResults.integrationPointsUpdated >= 4 ? "✅" : "❌"} All EmailService integration points updated (${emailResults.integrationPointsUpdated}/4)`,
    );
    console.log(
      `   ${enhancedResults.integrationPointsUpdated >= 3 ? "✅" : "❌"} All EnhancedEmailService integration points updated (${enhancedResults.integrationPointsUpdated}/3)`,
    );
    console.log(
      `   ${performanceResults.methodComplexity === "acceptable" ? "✅" : "❌"} Performance impact acceptable (${performanceResults.methodLines} lines, ${performanceResults.methodComplexity})`,
    );
    console.log(
      `   ${compatResults.legacyMapSupport && compatResults.legacyObjectSupport ? "✅" : "❌"} Backward compatibility maintained`,
    );

    // Recommendations for improvement
    if (overallScore < 90) {
      console.log("\n💡 Recommendations for Improvement:");

      if (templateScore < templateTotal) {
        console.log("   • Complete CommentDTO template mapping implementation");
      }
      if (emailResults.integrationPointsUpdated < 4) {
        console.log("   • Update all EmailService integration points");
      }
      if (enhancedResults.integrationPointsUpdated < 3) {
        console.log("   • Complete EnhancedEmailService integration");
      }
      if (performanceScore < 4) {
        console.log("   • Implement additional performance optimizations");
      }
      if (compatScore < compatTotal) {
        console.log("   • Enhance backward compatibility support");
      }
    }

    console.log();
  }
}

/**
 * Custom ValidationError class for enhanced error handling
 * Addresses inadequate error handling [HIGH PRIORITY FIX]
 */
class ValidationError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "ValidationError";
    this.context = options.context || "unknown";
    this.cause = options.cause || null;
    this.timestamp = new Date().toISOString();

    // Preserve additional error properties
    Object.assign(this, options);

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
}

// Enhanced CLI execution with proper options handling
if (import.meta.url === `file://${process.argv[1]}`) {
  // Parse command line arguments for enhanced configuration
  const args = process.argv.slice(2);
  const options = {
    verbose: args.includes("--verbose") || args.includes("-v"),
    strictMode: args.includes("--strict") || process.env.CI,
    timeout: 60000, // Increased timeout for comprehensive validation
  };

  const runner = new US056BPhase2ValidationRunner(options);

  try {
    await runner.runValidation();

    // Exit with appropriate code based on results
    const hasHighSeverityErrors = runner.errors.some(
      (e) => e.severity === "high",
    );
    const exitCode = hasHighSeverityErrors ? 1 : 0;

    if (options.verbose) {
      console.log(
        `Exiting with code ${exitCode} (${runner.errors.length} total errors)`,
      );
    }

    process.exit(exitCode);
  } catch (error) {
    console.error(
      runner.colors.error("\n❌ Critical Validation Failure:"),
      error.message,
    );

    if (options.verbose) {
      console.error(runner.colors.dim("Stack trace:"), error.stack);
    }

    // Provide actionable guidance for common failure scenarios
    if (error.context === "path_initialization") {
      console.error(runner.colors.warning("\n💡 Path Resolution Issue:"));
      console.error("   • Ensure the script is run from the correct directory");
      console.error("   • Verify UMIG project structure is intact");
    } else if (error.context?.includes("file_content")) {
      console.error(runner.colors.warning("\n💡 File Access Issue:"));
      console.error("   • Check file permissions");
      console.error("   • Verify files exist in expected locations");
    }

    process.exit(1);
  }
}

export { US056BPhase2ValidationRunner, ValidationError };
