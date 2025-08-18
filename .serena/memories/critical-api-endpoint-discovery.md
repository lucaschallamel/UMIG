# Critical API Endpoint Discovery - ScriptRunner Pattern

## Discovery Summary

**Date**: August 15, 2025  
**Context**: US-028 Enhanced IterationView development  
**Critical Finding**: ScriptRunner endpoints use `/[resource]` pattern, not `/api/v2/[resource]`  
**Impact**: Resolved API connectivity issues blocking IterationView progress  
**Root Cause**: Incorrect endpoint URL pattern assumption

## The Discovery Context

### Problem Manifestation

**Symptom**: IterationView unable to connect to Steps API  
**Error Pattern**: 404 Not Found responses for API calls  
**Attempted URL**: `/api/v2/steps`  
**Duration**: Blocking US-028 progress for initial development phase

### Investigation Process

**API Documentation Review**: OpenAPI spec suggested `/api/v2/steps` pattern  
**Network Analysis**: Browser dev tools showed 404 responses  
**ScriptRunner Documentation**: Limited endpoint pattern documentation  
**Code Pattern Analysis**: Examination of existing working API calls

### Critical Discovery

**Working Pattern Found**: `/steps` (root level, no `/api/v2/` prefix)  
**Verification Method**: Direct testing with working endpoints  
**Confirmation**: All existing UMIG APIs follow this pattern  
**Documentation Gap**: OpenAPI spec didn't reflect actual ScriptRunner conventions

## Technical Analysis

### ScriptRunner Endpoint Convention

**Pattern**: `https://confluence-host/[resource]`  
**Examples**:

- `/steps` - Steps API
- `/teams` - Teams API
- `/migrations` - Migrations API
- `/phases` - Phases API

**NOT**: `https://confluence-host/api/v2/[resource]`

### Why This Differs from Standard REST

**ScriptRunner Context**: Script endpoints are registered directly in Confluence  
**REST Endpoint Registration**: Uses Confluence's direct path registration, not nested API structure  
**Security Model**: Relies on Confluence authentication, not separate API authentication  
**Performance**: Direct path routing avoids API gateway overhead

### Comparison with Standard REST APIs

**Standard REST Pattern**: `/api/v2/[resource]` with version namespacing  
**ScriptRunner Pattern**: `/[resource]` with direct path registration  
**Reason**: ScriptRunner integrates directly with Confluence routing, not as external API

## Impact Analysis

### Immediate Resolution

**Problem Duration**: Approximately 4-6 hours of debugging  
**Resolution Time**: Immediate once pattern discovered  
**Impact on US-028**: Unblocked IterationView development completely  
**API Connectivity**: All StepsAPI endpoints now functional

### Broader Project Impact

**Other APIs Validated**: All existing UMIG APIs confirmed using correct pattern  
**Future Development**: Clear endpoint pattern established for new APIs  
**Documentation Update**: OpenAPI spec needs correction to reflect actual patterns  
**Developer Onboarding**: Documented pattern prevents future confusion

## Root Cause Analysis

### Documentation Mismatch

**OpenAPI Specification**: Included `/api/v2/` prefix (incorrect)  
**Actual Implementation**: Uses direct `/[resource]` paths (correct)  
**Source of Confusion**: Standard REST API documentation patterns vs ScriptRunner conventions  
**Gap**: ScriptRunner-specific endpoint patterns not well documented

### Assumption Propagation

**Initial Setup**: OpenAPI spec created with standard REST assumptions  
**Code Generation**: Frontend code generated from incorrect spec  
**Testing**: Manual testing caught the issue before production deployment  
**Learning**: Verify actual endpoint behavior vs documentation assumptions

## Prevention Strategies

### Documentation Standards

**Endpoint Verification**: Test all documented endpoints during specification creation  
**ScriptRunner Conventions**: Document ScriptRunner-specific patterns separately from standard REST  
**Code Examples**: Include working code examples in API documentation  
**Testing Integration**: Automated tests that verify endpoint accessibility

### Development Process

**API-First Development**: Implement and test endpoints before documenting  
**Documentation Validation**: Verify docs match actual implementation  
**Cross-Reference**: Check existing working APIs for pattern consistency  
**Developer Testing**: Include endpoint connectivity in development environment setup

## Updated Documentation Requirements

### OpenAPI Specification Updates

**Servers Section**: Update base URL to remove `/api/v2` prefix  
**Path Definitions**: Correct all endpoint paths to use direct resource pattern  
**Examples**: Update all request examples with correct URLs  
**Testing**: Include endpoint testing in CI/CD pipeline

### Development Guide Updates

**Endpoint Patterns**: Document ScriptRunner-specific conventions  
**Common Mistakes**: Include this discovery as example of pattern assumption error  
**Testing Guidelines**: Mandate endpoint connectivity testing for all new APIs  
**Troubleshooting**: Add endpoint pattern verification to debugging checklist

## Best Practices Established

### Endpoint Pattern Verification

**New API Development**:

1. Implement endpoint first
2. Test connectivity manually
3. Document actual working pattern
4. Update OpenAPI spec to match reality
5. Include automated connectivity tests

**API Consumption**:

1. Verify endpoint pattern with working examples
2. Test connectivity in development environment
3. Don't assume standard REST patterns apply
4. Check ScriptRunner-specific documentation

### Documentation Accuracy

**Specification Creation**:

1. Test endpoints before documenting
2. Verify patterns match ScriptRunner conventions
3. Include working code examples
4. Cross-reference with existing working APIs

**Maintenance**:

1. Regular verification of documented endpoints
2. Update docs when implementation changes
3. Maintain ScriptRunner pattern documentation
4. Include pattern verification in review process

## Lessons Learned

### Technical Insights

**ScriptRunner Specificity**: Platform-specific patterns override standard REST conventions  
**Documentation Trust**: Verify documentation against actual implementation  
**Pattern Consistency**: Once discovered, pattern applies consistently across all APIs  
**Testing Value**: Manual testing caught what documentation review missed

### Process Improvements

**Assumption Validation**: Test platform-specific assumptions early  
**Documentation Workflow**: Implement → Test → Document (not Document → Implement)  
**Pattern Recognition**: Document platform-specific conventions for team reference  
**Knowledge Sharing**: Share discoveries immediately to prevent repetition

## Reusable Knowledge

### ScriptRunner Development Standards

**Endpoint Pattern**: Always use `/[resource]` for ScriptRunner REST endpoints  
**Base URL**: Confluence base URL without additional API prefixes  
**Authentication**: Rely on Confluence session authentication  
**Error Handling**: Standard HTTP status codes apply despite non-standard paths

### API Development Checklist

- [ ] Implement endpoint in ScriptRunner
- [ ] Test connectivity with curl/Postman
- [ ] Verify pattern matches `/[resource]` convention
- [ ] Update OpenAPI spec with actual working URLs
- [ ] Include connectivity test in test suite
- [ ] Document any platform-specific patterns

## Future Applications

### New API Development

**Template**: Use `/[resource]` pattern for all new ScriptRunner endpoints  
**Verification**: Test endpoint connectivity before documentation  
**Consistency**: Maintain pattern across all UMIG APIs  
**Documentation**: Ensure OpenAPI spec reflects actual implementation

### Team Knowledge

**Onboarding**: Include ScriptRunner endpoint patterns in developer orientation  
**Troubleshooting**: Add endpoint pattern verification to debugging guides  
**Standards**: Document as part of UMIG development conventions  
**Training**: Share discovery as example of platform-specific pattern importance

## Conclusion

This discovery resolved a critical blocker in US-028 development and established clear endpoint patterns for all UMIG ScriptRunner APIs. The key learning is that **platform-specific conventions override standard REST assumptions**, and **documentation must match actual implementation rather than theoretical patterns**.

**Pattern Established**: `/[resource]` for all ScriptRunner REST endpoints in UMIG  
**Process Improvement**: Test endpoints before documenting to ensure accuracy  
**Knowledge Preservation**: Platform-specific patterns documented for team reference

This discovery prevents similar issues in future development and ensures consistent endpoint patterns across the entire UMIG API ecosystem.
