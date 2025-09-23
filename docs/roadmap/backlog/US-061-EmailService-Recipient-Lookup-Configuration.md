# US-061: EmailService Recipient Lookup Configuration

**Epic**: Email Notification Excellence
**Story Type**: Operational Enhancement
**Priority**: Medium-High
**Complexity**: Low-Medium (2-3 story points)
**Sprint**: 8
**Prerequisites**: US-058 EmailService Refactoring and Security Enhancement ✅ COMPLETE

## Story Summary

As a **Development Team**, I want to **implement dynamic recipient lookup configuration for EmailService** so that **email notifications can dynamically determine recipients based on step context, team assignments, and user preferences rather than using hardcoded recipient lists**.

## Business Value & Technical Benefits

### Business Impact

- **Operational Flexibility**: Email notifications adapt to changing team structures and user roles
- **User Experience**: Recipients receive relevant notifications based on their actual responsibilities
- **Maintenance Reduction**: Eliminates need for code changes when team assignments change
- **Accuracy**: Ensures notifications reach the correct stakeholders for each migration step

### Technical Benefits

- **Dynamic Configuration**: Database-driven recipient determination
- **Integration Ready**: Seamless integration with existing EmailService architecture (US-058 foundation)
- **Performance Optimized**: Efficient recipient lookup with caching capability
- **Audit Compatible**: Recipient determination logged for compliance and debugging

## Background & Context

### Completion of US-058 Foundation

US-058 successfully delivered:

- ✅ **Security Excellence**: Comprehensive threat elimination (template injection, header injection, XSS, DoS)
- ✅ **Technical Integration**: EmailService functionally integrated with database and audit systems
- ✅ **Performance Standards**: Email composition within <500ms targets
- ✅ **Architecture Foundation**: Clear service interfaces ready for enhancement

### Current State

EmailService currently has:

- Functional email composition and delivery (`{"success": true, "emailsSent": 1, "enhancedNotification": true}`)
- Secure template processing with comprehensive validation
- Audit logging integration for compliance tracking
- Error handling and performance monitoring

### Gap Identification

**Single Remaining Operational Issue**: Recipient lookup implementation

- Current: Basic recipient determination based on immediate step context
- Needed: Dynamic recipient lookup considering team assignments, roles, and preferences
- Type: Operational configuration enhancement (not architectural requirement)

## Acceptance Criteria

### AC1: Dynamic Recipient Lookup Implementation

**Given** a step status change notification requirement
**When** EmailService processes the notification
**Then** it must:

- [ ] Query database for assigned teams and responsible users for the specific step
- [ ] Resolve team membership to individual email addresses
- [ ] Apply user notification preferences (opt-in/opt-out settings)
- [ ] Include escalation recipients based on step criticality or delays
- [ ] Cache recipient lookups for performance optimization
- [ ] Log recipient determination decisions for audit purposes

### AC2: Team-Based Recipient Resolution

**Given** step assignments to specific teams
**When** determining notification recipients
**Then** the system must:

- [ ] Resolve team IDs to active team members
- [ ] Include team leads and designated notification contacts
- [ ] Handle inactive users gracefully (skip or use alternates)
- [ ] Support multi-team notifications for complex steps
- [ ] Respect team-level notification preferences
- [ ] Maintain backward compatibility with existing notification logic

### AC3: User Preference Integration

**Given** user notification preferences exist
**When** calculating final recipient lists
**Then** the system must:

- [ ] Honor user opt-out preferences for specific notification types
- [ ] Support role-based notification preferences (leads vs members)
- [ ] Allow emergency override for critical notifications
- [ ] Provide preference management interface integration points
- [ ] Log preference application for transparency
- [ ] Default to inclusive notifications for users without explicit preferences

### AC4: Performance and Caching Optimization

**Given** the need for efficient recipient lookup
**When** processing email notifications
**Then** the system must:

- [ ] Implement intelligent caching for team membership and user preferences
- [ ] Achieve recipient lookup performance targets (<100ms for standard notifications)
- [ ] Provide cache invalidation when team structures change
- [ ] Support bulk recipient resolution for batch operations
- [ ] Monitor and log recipient lookup performance metrics
- [ ] Gracefully handle cache failures with direct database fallback

### AC5: Audit and Logging Integration

**Given** compliance and debugging requirements
**When** recipient lookup occurs
**Then** the system must:

- [ ] Log recipient determination logic and decisions
- [ ] Record applied user preferences and team membership resolution
- [ ] Audit recipient changes for compliance tracking
- [ ] Provide debugging information for notification troubleshooting
- [ ] Integrate with existing AuditLogRepository patterns
- [ ] Support recipient lookup history for analysis

## Technical Implementation

### Recipient Lookup Service Architecture

```groovy
// Enhanced recipient lookup service
class EmailRecipientLookupService {

    // Primary recipient resolution method
    def resolveRecipientsForStep(UUID stepInstanceId, String notificationType) {
        def stepContext = getStepContext(stepInstanceId)
        def recipients = [:]

        // Resolve assigned teams and members
        recipients.assignedTeams = resolveAssignedTeamMembers(stepContext.assignedTeamIds)

        // Resolve impacted teams for notification
        recipients.impactedTeams = resolveImpactedTeamMembers(stepContext.impactedTeamIds)

        // Include escalation recipients based on criticality
        recipients.escalation = resolveEscalationRecipients(stepContext, notificationType)

        // Apply user preferences and filtering
        recipients = applyUserPreferences(recipients, notificationType)

        // Log recipient determination for audit
        auditRecipientResolution(stepInstanceId, recipients, notificationType)

        return recipients
    }

    // Team membership resolution with caching
    private def resolveAssignedTeamMembers(List<Integer> teamIds) {
        return teamIds.collectMany { teamId ->
            def cachedMembers = getCachedTeamMembers(teamId)
            if (cachedMembers) return cachedMembers

            def members = DatabaseUtil.withSql { sql ->
                sql.rows("""
                    SELECT u.usr_id, u.usr_email, u.usr_name, tm.tmm_role
                    FROM users_usr u
                    JOIN team_members_tmm tm ON u.usr_id = tm.usr_id
                    WHERE tm.tea_id = :teamId
                    AND u.usr_active = true
                    AND tm.tmm_active = true
                """, [teamId: teamId])
            }

            cacheTeamMembers(teamId, members)
            return members
        }
    }

    // User preference filtering
    private def applyUserPreferences(Map recipients, String notificationType) {
        recipients.each { category, userList ->
            recipients[category] = userList.findAll { user ->
                def preferences = getUserNotificationPreferences(user.usr_id)
                return shouldNotifyUser(preferences, notificationType, category)
            }
        }
        return recipients
    }

    // Intelligent caching with invalidation
    private def getCachedTeamMembers(Integer teamId) {
        def cacheKey = "team_members_${teamId}"
        return CacheService.get(cacheKey)
    }

    private def cacheTeamMembers(Integer teamId, def members) {
        def cacheKey = "team_members_${teamId}"
        CacheService.put(cacheKey, members, 300) // 5-minute cache
    }
}
```

### Integration with Enhanced EmailService

```groovy
// Updated EmailService with recipient lookup integration
class EnhancedEmailService {

    def sendStepStatusChangeNotification(UUID stepInstanceId, String newStatus, def user) {
        // Use new recipient lookup service
        def recipients = EmailRecipientLookupService.resolveRecipientsForStep(
            stepInstanceId,
            'step_status_change'
        )

        // Build notification context
        def notificationContext = buildNotificationContext(stepInstanceId, newStatus, user)

        // Send notifications to resolved recipients
        def results = [:]
        recipients.each { category, recipientList ->
            results[category] = sendNotificationToRecipients(
                recipientList,
                notificationContext,
                category
            )
        }

        // Log comprehensive results
        auditNotificationResults(stepInstanceId, results)

        return results
    }

    private def sendNotificationToRecipients(List recipients, Map context, String category) {
        return recipients.collect { recipient ->
            try {
                def personalizedContext = personalizeNotificationContext(context, recipient)
                def result = sendEmailNotification(recipient.usr_email, personalizedContext)

                logNotificationSuccess(recipient, context, category)
                return [recipient: recipient, status: 'sent', result: result]

            } catch (Exception e) {
                logNotificationFailure(recipient, context, category, e)
                return [recipient: recipient, status: 'failed', error: e.message]
            }
        }
    }
}
```

## Dependencies and Constraints

### Dependencies

- **US-058 Complete**: ✅ EmailService foundation with security and integration
- **Teams/Users Data**: Current team membership and user tables
- **AuditLogRepository**: Existing audit logging infrastructure
- **Cache Infrastructure**: Current caching mechanisms (or simple in-memory cache)

### Constraints

- **No Breaking Changes**: Must maintain compatibility with existing EmailService usage
- **Performance Requirements**: Recipient lookup must complete within 100ms
- **Cache Management**: Team membership cache must invalidate on organizational changes
- **Backward Compatibility**: Support existing hardcoded recipient patterns during transition

## Definition of Done

### Technical Completion

- [ ] EmailRecipientLookupService implemented with comprehensive recipient resolution
- [ ] User preference integration functional with opt-in/opt-out support
- [ ] Team membership resolution with intelligent caching
- [ ] Escalation recipient logic based on step criticality
- [ ] Audit logging for recipient determination decisions

### Performance Validation

- [ ] Recipient lookup performance <100ms for standard notifications
- [ ] Caching effectiveness measured and optimized
- [ ] Bulk operation support for multiple step notifications
- [ ] Memory usage monitoring for cache management

### Integration Testing

- [ ] EmailService integration seamless and backward compatible
- [ ] Database query optimization validated
- [ ] User preference scenarios tested comprehensively
- [ ] Team structure changes handled gracefully
- [ ] Error scenarios and fallback mechanisms verified

### Documentation & Knowledge Transfer

- [ ] Recipient lookup service architecture documented
- [ ] Configuration management procedures established
- [ ] Performance monitoring and troubleshooting guides
- [ ] Integration patterns for future notification types

## Estimated Effort: 2-3 Days

### Implementation Breakdown

**Day 1**: Core recipient lookup service development

- EmailRecipientLookupService implementation
- Database query optimization for team/user resolution
- Basic caching implementation with invalidation logic

**Day 1.5**: User preference integration and validation

- User notification preference lookup integration
- Preference application logic with emergency overrides
- Comprehensive testing with various preference scenarios

**Day 2-2.5**: Performance optimization and integration

- Caching optimization and performance validation
- EmailService integration with backward compatibility
- End-to-end testing with step status change scenarios

**Day 3**: Final validation and documentation

- Performance benchmarking and optimization
- Audit logging verification and compliance validation
- Documentation completion and knowledge transfer

## Risk Assessment

### Low-Medium Risk Factors

**Team Structure Complexity**: Dynamic team memberships may create edge cases

- **Mitigation**: Comprehensive testing with various team configurations
- **Fallback**: Graceful degradation to basic recipient lists

**Cache Consistency**: Team membership cache may become stale

- **Mitigation**: Intelligent cache invalidation on team updates
- **Monitoring**: Cache hit/miss ratios and data freshness metrics

**Performance Impact**: Recipient lookup may add latency to notifications

- **Mitigation**: Aggressive caching and database query optimization
- **Monitoring**: Performance benchmarking and continuous monitoring

## Success Metrics

### Performance Metrics

- **Recipient Lookup Time**: <100ms for standard notifications
- **Cache Hit Ratio**: >85% for team membership lookups
- **Email Delivery Success**: >99% for resolved recipients

### Business Metrics

- **Notification Accuracy**: >95% correct recipients based on team assignments
- **User Satisfaction**: Reduced irrelevant notifications through preference application
- **Maintenance Reduction**: <5 recipient configuration changes per month

## Integration with Future Work

### Foundation for Advanced Features

- **US-059 Performance Monitoring**: Recipient lookup metrics integration
- **US-060 Caching Strategy**: Advanced caching patterns for notification system
- **US-062 Async Processing**: Bulk recipient resolution for batch operations

### Scalability Considerations

- **Multi-tenant Support**: Recipient lookup service designed for organizational scaling
- **API Integration**: Service interfaces ready for external notification system integration
- **Configuration Management**: Database-driven recipient rules for complex scenarios

---

**Created**: 2025-09-22
**Sprint**: 8
**Dependencies**: US-058 Complete ✅
**Type**: Operational Enhancement
**Complexity**: Low-Medium (2-3 story points)
