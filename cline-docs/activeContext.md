# Active Context

## 1. Current Work Focus

The project is in the **production readiness phase**. The recent focus has been on API documentation completeness, schema consistency, and ensuring robust testing infrastructure. The Admin GUI has been successfully refactored into modular components and all critical bugs have been resolved.

## 2. Recent Changes & Decisions

### Major Achievements (January 2025)
*   **API Documentation Completion:** Comprehensive API specifications have been created for all core endpoints
    *   **UsersAPI.md:** Complete documentation with 5 endpoints, pagination, filtering, and error handling
    *   **TeamsAPI.md:** Updated to reflect correct database field names and integer ID types
    *   **OpenAPI Specification:** Fixed User and Team schemas, added missing UserInput schema
    *   **Postman Collection:** Regenerated with correct field names and data types
*   **Schema Consistency:** Resolved mismatches between API documentation and actual implementation
    *   Fixed User schema to use integer IDs and proper field names (usr_first_name, usr_last_name)
    *   Fixed Team schema to use database field names (tms_id, tms_name, tms_email, tms_description)
    *   Updated all team-related endpoints to use integer IDs instead of UUIDs

### Architecture Consolidation
*   **Confluence-Integrated Application:** Architecture confirmed and fully implemented
*   **Technology Stack:** ScriptRunner (Groovy) backend with vanilla JavaScript frontend
*   **Database:** PostgreSQL with comprehensive schema and data generation
*   **Data Model:** Canonical vs Instance pattern with full attribute instantiation (ADR-029)
*   **API Patterns:** Standardised REST patterns (ADR-023) with hierarchical filtering (ADR-030)
*   **Type Safety:** Robust Groovy type safety patterns (ADR-031) preventing runtime errors

### Recent Improvements (July 2025)
*   **Admin GUI Refactoring:** 1,901-line monolithic file split into 8 modular components
    *   EntityConfig.js, UiUtils.js, AdminGuiState.js, ApiClient.js
    *   AuthenticationManager.js, TableManager.js, ModalManager.js, AdminGuiController.js
*   **Bug Fixes:** Resolved critical UI issues including view modals, edit forms, pagination, and authentication
*   **Iteration View:** Complete implementation with hierarchical filtering and labels integration
*   **Error Handling:** Enhanced error messages and proper handling of API responses

## 3. Next Steps

1.  Complete remaining REST APIs (Plans, Sequences, Phases, Instructions endpoints)
2.  Implement main dashboard UI with real-time AJAX polling
3.  Develop planning feature with HTML macro-plan generation
4.  Execute data import strategy for existing Confluence/Excel sources
5.  Conduct comprehensive testing and performance optimisation
