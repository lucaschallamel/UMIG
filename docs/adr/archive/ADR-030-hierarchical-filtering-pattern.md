# ADR-030: Hierarchical Filtering Pattern for API and UI Components

- **Status:** Accepted
- **Date:** 2025-07-09
- **Deciders:** UMIG Project Team
- **Technical Story:** Dynamic, Context-Aware Filtering for Iteration View

## Context and Problem Statement

The Iteration View UI requires filters that progressively narrow down relevant options based on a user's previous selections. For instance, a user selecting a specific sequence should only see phases that belong to that sequence, and teams/labels that are contextually relevant to that level of the hierarchy. The challenge is how to design a consistent, reusable pattern for both API endpoints and UI components that provides this hierarchical filtering capability across the entire migration hierarchy.

## Decision Drivers

- **User Experience:** Filters should display only contextually relevant options to reduce cognitive load
- **Performance:** Filtering should happen at the database level rather than client-side
- **Consistency:** The pattern should be uniform across all filterable resources
- **Discoverability:** API consumers should find a consistent interface for hierarchical filtering
- **Maintainability:** The implementation should follow DRY principles and be easily extended
- **UI Responsiveness:** Filters should update immediately when parent selections change

## Considered Options

- **Option 1: Dedicated Nested REST Endpoints**
  - Description: Create dedicated nested endpoints like `/migrations/{migId}/teams`, `/iterations/{iteId}/teams`, etc.
  - Pros: Follows RESTful resource hierarchy, clear relationship representation
  - Cons: Proliferation of endpoints, duplication of logic, hard to maintain consistency

- **Option 2: Query Parameter Filtering on Base Resources**
  - Description: Enhance base resource endpoints (`/teams`, `/labels`) with query parameters that filter by hierarchy level
  - Pros: Fewer endpoints, consistent interface, flexible filtering combinations
  - Cons: Potentially complex query implementation, needs clear documentation

- **Option 3: GraphQL API**
  - Description: Implement a GraphQL API for advanced filtering and relationship traversal
  - Pros: Powerful query capabilities, client determines exactly what data is needed
  - Cons: Significant technology shift, complexity, doesn't align with current REST architecture

## Decision Outcome

Chosen option: **"Query Parameter Filtering on Base Resources"**, because it provides a consistent, maintainable interface without endpoint proliferation while still enabling hierarchical filtering capabilities. This approach aligns well with our existing REST API architecture and requires minimal changes to our API consumption patterns.

### Positive Consequences

- **API Consistency:** All filterable resources follow the same pattern (`?migrationId=`, `?iterationId=`, etc.)
- **Progressive Refinement:** UI can easily implement cascading filters that become more specific at each level
- **Performance:** Database-level filtering reduces data transfer and processing overhead
- **Maintainability:** Repository methods can be organized by filter level, promoting code reuse
- **Extensibility:** New filterable resources can easily adopt the same pattern
- **Backward Compatibility:** Existing API consumers can continue to use endpoints without filters

### Negative Consequences

- **Query Complexity:** Some queries require traversing multiple relationship joins
- **Documentation Burden:** Need comprehensive documentation of filter parameters for each resource
- **Parameter Validation:** Must implement thorough validation of UUID parameters

## Implementation Details

1. **Repository Methods:** For each filterable resource (e.g., Teams, Labels), create methods that filter by each level of the hierarchy:

   ```groovy
   findTeamsByMigrationId(String migId)
   findTeamsByIterationId(String iteId)
   findTeamsByPlanId(String planId)
   findTeamsBySequenceId(String seqId)
   findTeamsByPhaseId(String phaseId)
   ```

2. **API Endpoints:** Enhance base resource endpoints to accept query parameters for hierarchical filtering:

   ```
   GET /teams?migrationId={uuid}
   GET /teams?iterationId={uuid}
   GET /teams?planId={uuid}
   GET /teams?sequenceId={uuid}
   GET /teams?phaseId={uuid}
   ```

3. **Frontend Integration:** Update UI components to refresh filter options when parent selections change:

   ```javascript
   onMigrationChange() {
     // Reset and update dependent filters
     populateFilter('#teams-filter', `/teams?migrationId=${migId}`);
   }

   onSequenceChange() {
     // Further refine team options based on sequence
     populateFilter('#teams-filter', `/teams?sequenceId=${seqId}`);
   }
   ```

4. **Progressive Filtering:** Implement cascading refinement where each level produces a subset of options:
   - Migration level → Shows all teams involved in the migration (e.g., 18 teams)
   - Sequence level → Shows only teams involved in the selected sequence (e.g., 12 teams)
   - Phase level → Shows only teams involved in the selected phase (e.g., 5 teams)

## Related Decisions

- [ADR-017-V2-REST-API-Architecture](archive/ADR-017-V2-REST-API-Architecture.md) - Base REST API design principles
- [ADR-023-Standardized-Rest-Api-Patterns](archive/ADR-023-Standardized-Rest-Api-Patterns.md) - Standardized REST patterns

## Notes

This pattern has been initially implemented for Teams and Labels resources but should be applied consistently to all filterable resources in the future.
