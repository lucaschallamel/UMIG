# EPIC-101: UMIG Groovy-Spring Boot Wrapper Migration

**Epic ID**: EPIC-101  
**Title**: Migrate UMIG to Standalone via Groovy Code Reuse Strategy  
**Status**: Planning  
**Priority**: High  
**Business Value**: Critical  
**Total Story Points**: 120  
**Estimated Timeline**: 2-4 months  
**Team Size Required**: 2-3 developers  
**Budget Estimate**: $150k-250k

---

## Executive Summary

This epic represents an **alternative, cost-optimized approach** to migrating UMIG from Confluence/ScriptRunner to a standalone application. By wrapping the existing Groovy codebase in Spring Boot rather than rewriting in Java, this strategy achieves **75% faster delivery** and **70-85% cost reduction** compared to EPIC-100 (full rewrite approach), while maintaining all functionality and achieving the same strategic objectives.

## Strategic Comparison

| Approach                     | Timeline       | Cost          | Risk       | Code Reuse | Recommendation                        |
| ---------------------------- | -------------- | ------------- | ---------- | ---------- | ------------------------------------- |
| **EPIC-101: Groovy Wrapper** | **2-4 months** | **$150-250K** | Low-Medium | **75-80%** | ✅ **RECOMMENDED**                    |
| **EPIC-100: Full Rewrite**   | 7-9 months     | $744K-1.07M   | High       | 5-15%      | Alternative if platform change needed |

## Business Case

### Value Proposition

- **Same Strategic Outcomes**: Eliminates Confluence/ScriptRunner dependencies
- **75% Faster Delivery**: 2-4 months vs 7-9 months
- **70-85% Cost Reduction**: $150-250K vs $744K-1M+
- **Lower Risk**: Preserves proven business logic and test coverage
- **Business Continuity**: Minimal disruption with gradual migration

### Key Advantages

- **Preserve Investment**: Leverages existing 90% test coverage
- **Domain Knowledge Retention**: All business logic preserved
- **Team Productivity**: No learning curve for new technology
- **Incremental Migration**: Phase-by-phase validation possible

## Technical Overview

### Reuse Strategy

```
Current Assets → Spring Boot Wrapper → Standalone Application
- 13 Groovy REST APIs → @RestController annotations (85% reuse)
- Repository Pattern → Same pattern in Spring (95% reuse)
- DatabaseUtil.withSql → Spring DataSource (90% reuse)
- Vanilla JS/CSS → Static resources (80% reuse)
- Groovy Tests → Spring Boot Test (85% reuse)
```

### Target Architecture

```
┌─────────────────────────────────────────────────────┐
│             Spring Boot 3.1+ with Groovy            │
├─────────────────────────────────────────────────────┤
│  Controllers     │  Services      │  Repositories   │
│  (Wrapped APIs)  │  (Reused)      │  (95% Reused)   │
├─────────────────────────────────────────────────────┤
│             Spring Data JPA / DataSource            │
├─────────────────────────────────────────────────────┤
│           Oracle Database v19 / PostgreSQL          │
└─────────────────────────────────────────────────────┘
```

## Migration Patterns

### REST API Migration (85% Code Reuse)

```groovy
// Before: ScriptRunner
@BaseScript CustomEndpointDelegate delegate
usersApi(httpMethod: "GET", groups: ["confluence-users"]) {
    // Business logic stays exactly the same
    return UserRepository.getUsers(filters)
}

// After: Spring Boot Wrapper
@RestController
@RequestMapping("/api/v2/users")
class UsersController {
    @GetMapping
    ResponseEntity getUsers(@RequestParam Map filters) {
        // Same business logic, just wrapped
        return ResponseEntity.ok(UserRepository.getUsers(filters))
    }
}
```

### Database Layer (90% Code Reuse)

```groovy
// Existing DatabaseUtil pattern preserved
@Service
class DatabaseService {
    @Autowired DataSource dataSource

    def withSql(Closure closure) {
        // Exact same pattern, just different source
        Sql.withInstance(dataSource, closure)
    }
}
```

## Scope & Deliverables

### Phase 1: Foundation (Week 1) - 15 Points

- Spring Boot project setup with Groovy support
- Database connectivity (Oracle or PostgreSQL)
- Basic security framework
- Development environment configuration

### Phase 2: Core APIs (Weeks 2-3) - 30 Points

- Migrate all 24 REST APIs with wrapper pattern
- Preserve all business logic and repository patterns
- Maintain existing SQL queries and data access

### Phase 3: UI Layer (Weeks 3-4) - 25 Points

- Convert Confluence macros to Spring controllers
- Deploy existing JavaScript/CSS as static resources
- Update API endpoints in frontend code
- Maintain existing UI functionality

### Phase 4: Security & Auth (Week 5) - 20 Points

- Spring Security configuration
- LDAP/Active Directory integration
- Role mapping (confluence-users → Spring roles)
- Session management

### Phase 5: Testing & Validation (Week 6) - 20 Points

- Adapt existing Groovy test suites
- Integration testing with Spring Boot Test
- Performance validation
- User acceptance testing

### Phase 6: Deployment (Weeks 7-8) - 10 Points

- Production environment setup
- Parallel validation with existing system
- Cutover planning and execution
- Post-deployment support

## Code Reuse Analysis

### High Reuse Components (85-95%)

| Component        | Current             | Spring Boot  | Reuse % | Effort     |
| ---------------- | ------------------- | ------------ | ------- | ---------- |
| Business Logic   | Repository classes  | Same classes | 95%     | Minimal    |
| Database Queries | SQL statements      | Same SQL     | 95%     | None       |
| Domain Models    | Groovy POJOs        | Same POJOs   | 100%    | None       |
| Email Service    | EmailService.groovy | Same service | 90%     | Minor      |
| Test Suites      | Groovy tests        | Spring tests | 85%     | Adaptation |

### Medium Reuse Components (70-80%)

| Component      | Current          | Spring Boot      | Reuse % | Effort       |
| -------------- | ---------------- | ---------------- | ------- | ------------ |
| REST Endpoints | ScriptRunner DSL | @RestController  | 75%     | Wrapper code |
| Frontend JS    | Vanilla JS       | Static resources | 80%     | URL updates  |
| Configuration  | Confluence admin | application.yml  | 70%     | Migration    |

### Low Reuse Components (50-70%)

| Component      | Current            | Spring Boot     | Reuse % | Effort             |
| -------------- | ------------------ | --------------- | ------- | ------------------ |
| Authentication | Confluence groups  | Spring Security | 60%     | New implementation |
| UI Macros      | Velocity templates | Thymeleaf/REST  | 60%     | Conversion         |

## Risk Assessment

### ✅ Low Risks

- **Groovy Support**: Spring Boot has native Groovy support
- **Business Logic**: All preserved, no rewriting needed
- **Database Access**: Direct pattern adaptation available
- **Testing**: 90% coverage maintained

### ⚠️ Medium Risks

- **Authentication**: Need to map Confluence auth to Spring Security
- **Configuration**: Confluence admin → Spring properties
- **Performance**: Different runtime characteristics (likely better)

### Risk Mitigation

1. **Incremental Migration**: Phase-by-phase with validation
2. **Parallel Running**: Both systems during transition
3. **Comprehensive Testing**: Leverage existing test suite
4. **Rollback Plan**: Can revert to Confluence if needed

## Resource Requirements

### Team Composition (Lean)

- 1x Senior Groovy/Spring Developer (Lead)
- 1x Full-stack Developer (UI/Backend)
- 0.5x DevOps Engineer (Infrastructure)
- 0.5x QA Engineer (Testing)
- **Total**: 2-3 FTE for 2-4 months

### Infrastructure (Simplified)

- Spring Boot application server
- Oracle v19 or PostgreSQL (existing)
- Linux/Tomcat or containerized deployment
- Basic monitoring and logging

## Cost Breakdown

### Development Costs

- Development team (3 months avg): $120k-180k
- Infrastructure setup: $10k-20k
- Testing and validation: $10k-20k
- Deployment and cutover: $10k-30k
- **Subtotal**: $150k-250k

### Comparison with Full Rewrite

| Cost Category  | Groovy Wrapper | Full Rewrite    | Savings    |
| -------------- | -------------- | --------------- | ---------- |
| Development    | $150-250k      | $500-675k       | 70%        |
| Infrastructure | $10-20k        | $100-190k       | 80%        |
| Testing        | $10-20k        | $50-100k        | 75%        |
| Risk Buffer    | Minimal        | $124-179k       | 90%        |
| **Total**      | **$150-250k**  | **$744k-1.07M** | **70-85%** |

## Migration Strategy

### Week-by-Week Plan

**Week 1: Foundation**

```bash
# Create Spring Boot project with Groovy
spring init --language=groovy --dependencies=web,data-jpa,security
# Copy existing database configurations
# Set up development environment
```

**Weeks 2-3: API Migration**

```groovy
// Systematic migration of all 24 APIs
// Priority: Simple → Complex
1. Labels API (simplest)
2. Teams, Users APIs
3. Status, Environments APIs
4. Applications, Migrations APIs
5. Plans, Sequences, Phases APIs
6. Steps, Instructions, Iterations APIs (complex)
```

**Weeks 4-5: UI & Security**

- Convert macros to controllers
- Implement Spring Security
- Update frontend endpoints

**Week 6: Testing**

- Adapt existing test suites
- Run comprehensive validation
- Performance testing

**Weeks 7-8: Deployment**

- Production setup
- Parallel validation
- Cutover execution

## Success Metrics

### Technical Metrics

- **Code Reuse**: ≥75% achieved
- **Test Coverage**: 90% maintained
- **Performance**: <3s response times
- **Availability**: 99.9% uptime

### Business Metrics

- **Timeline**: Delivered within 4 months
- **Budget**: Under $250k
- **Feature Parity**: 100% functionality preserved
- **User Adoption**: Seamless transition

### Comparison Metrics

| Metric        | Target     | vs Full Rewrite |
| ------------- | ---------- | --------------- |
| Delivery Time | 2-4 months | 75% faster      |
| Total Cost    | $150-250k  | 70-85% less     |
| Risk Level    | Low-Medium | 50% lower       |
| Code Reuse    | 75-80%     | 15x higher      |

## Decision Framework

### Choose This Approach (EPIC-101) If:

✅ **Timeline pressure** - Need results in 2-4 months  
✅ **Budget constraints** - Limited to <$300k  
✅ **Risk aversion** - Cannot afford major disruption  
✅ **Current system works** - Happy with functionality  
✅ **Team expertise** - Groovy skills available

### Choose Full Rewrite (EPIC-100) If:

❌ Long-term platform change required  
❌ Current architecture fundamentally broken  
❌ Want to modernize to different tech stack  
❌ Have 12+ months and $1M+ budget  
❌ Team wants to learn new technologies

## Recommendation

**STRONGLY RECOMMEND EPIC-101** (Groovy-Spring Boot Wrapper) because:

1. **Proven ROI**: 70-85% cost savings with same outcomes
2. **Faster Delivery**: 2-4 months vs 7-9 months
3. **Lower Risk**: Preserves all business logic and tests
4. **Business Continuity**: Minimal disruption
5. **Pragmatic**: Leverages existing investment

This approach delivers the same strategic objectives (Confluence independence, Oracle DB, Linux/Tomcat deployment) at a fraction of the cost and time, making it the superior choice for the architecture committee.

## User Stories Summary

### Phase 1 Stories (Foundation)

- US-101B: Spring Boot Setup (3 pts)
- US-102B: Database Configuration (3 pts)
- US-103B: Build Pipeline (3 pts)
- US-104B: Development Environment (3 pts)
- US-105B: Monitoring Setup (3 pts)

### Phase 2 Stories (API Migration)

- US-201B through US-213B: One story per API (2-3 pts each)
- Total: 30 points for all 24 APIs

### Phase 3 Stories (UI Layer)

- US-301B: Macro to Controller Conversion (8 pts)
- US-302B: Frontend Integration (8 pts)
- US-303B: Static Resource Setup (5 pts)
- US-304B: UI Testing (4 pts)

### Phase 4 Stories (Security)

- US-401B: Spring Security Setup (8 pts)
- US-402B: LDAP Integration (8 pts)
- US-403B: Role Mapping (4 pts)

### Phase 5 Stories (Testing)

- US-501B: Test Suite Migration (10 pts)
- US-502B: Integration Testing (5 pts)
- US-503B: Performance Testing (5 pts)

### Phase 6 Stories (Deployment)

- US-601B: Production Setup (5 pts)
- US-602B: Cutover Planning (5 pts)

## Next Steps

1. **Architecture Committee Review** - Present both options (EPIC-100 vs EPIC-101)
2. **Proof of Concept** - Migrate one simple API (Labels) as demonstration
3. **Team Assessment** - Confirm Groovy/Spring Boot skills
4. **Decision Point** - Committee selects approach
5. **Kickoff** - Begin selected migration strategy

## Related Documentation

- [EPIC-100: Full Rewrite Approach](./EPIC-100-standalone-migration.md) - Alternative approach
- [Technical Architecture Comparison](./architecture-comparison.md)
- [Risk Analysis](./risk-analysis-groovy-wrapper.md)
- [Proof of Concept Results](./poc-results.md)

---

_Last Updated: December 29, 2024_  
_Status: Recommended Approach - Pending Committee Review_  
_Estimated Savings: $594k-820k and 5-6 months vs full rewrite_
