# US-043: Iteration Types Management

**Story Points**: 3-4 | **Priority**: Medium | **Type**: Enhancement  
**Sprint**: Backlog | **Epic**: Data Management Standardization

## User Story

**As a** UMIG administrator  
**I want** to manage iteration types dynamically through CRUD operations  
**So that** I can support additional iteration types with visual differentiation and better workflow documentation

## Business Context

Currently, iteration types (RUN, DR, CUTOVER) are hardcoded in the database and IterationsApi. This limits the ability to:
- Add new iteration types (TEST, PILOT, REHEARSAL)
- Provide visual differentiation (colors, icons)
- Document iteration purposes clearly
- Extend migration workflows flexibly

## Acceptance Criteria

### 1. Database Schema Design
- [ ] **Primary Key**: Use `itt_name VARCHAR(50) PRIMARY KEY` (e.g., 'RUN', 'DR', 'CUTOVER')
- [ ] **Table**: `tbl_iteration_types_master` with fields:
  - `itt_name` (VARCHAR(50), PRIMARY KEY)
  - `itt_description` (TEXT)
  - `itt_color` (VARCHAR(10)) - hex color codes
  - `itt_icon` (VARCHAR(50)) - icon identifier
  - `itt_display_order` (INTEGER)
  - `itt_active` (BOOLEAN)
  - Standard audit fields (`created_by`, `created_date`, `updated_by`, `updated_date`)

### 2. API Development
- [ ] **New REST API**: `/api/v2/iteration-types`
  - GET (list all active types)
  - POST (create new type)
  - PUT (update existing type)
  - DELETE (deactivate type)
- [ ] **Validation Rules**:
  - Name required, max 50 characters, alphanumeric + underscore only
  - Color validation (hex format)
  - Prevent deletion of types currently in use
- [ ] **Response Format**: JSON with standard UMIG patterns
- [ ] **Error Handling**: Standard HTTP status codes and error messages

### 3. Admin GUI Component
- [ ] **Management Interface**: CRUD operations for iteration types
- [ ] **Visual Preview**: Show color and icon selections
- [ ] **Usage Validation**: Warning when attempting to delete types in use
- [ ] **Ordering**: Drag-and-drop or numeric ordering for display sequence
- [ ] **Integration**: Add to Admin GUI navigation and routing

### 4. Data Migration & Compatibility
- [ ] **Seed Data**: Populate existing types (RUN, DR, CUTOVER) with default values
- [ ] **Zero Breaking Changes**: Existing IterationsApi continues to work unchanged
- [ ] **Foreign Key Updates**: Update iterations table if needed for referential integrity

### 5. Testing & Validation
- [ ] **Unit Tests**: Repository and API endpoint testing
- [ ] **Integration Tests**: Full CRUD workflow validation
- [ ] **Admin GUI Tests**: Component functionality and data flow
- [ ] **Migration Testing**: Verify existing data remains intact

## Technical Requirements

### Database Implementation
```sql
CREATE TABLE tbl_iteration_types_master (
    itt_name VARCHAR(50) PRIMARY KEY,
    itt_description TEXT,
    itt_color VARCHAR(10),
    itt_icon VARCHAR(50),
    itt_display_order INTEGER DEFAULT 0,
    itt_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(100),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed data
INSERT INTO tbl_iteration_types_master (itt_name, itt_description, itt_color, itt_icon, itt_display_order) VALUES
('RUN', 'Production run iteration', '#2E7D32', 'play-circle', 1),
('DR', 'Disaster recovery iteration', '#F57C00', 'refresh', 2),
('CUTOVER', 'Final cutover iteration', '#C62828', 'check-circle', 3);
```

### API Pattern (Following UMIG Standards)
```groovy
// IterationTypesApi.groovy
@BaseScript CustomEndpointDelegate delegate

iterationTypes(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    return IterationTypesRepository.findAllActive()
}

iterationTypes(httpMethod: "POST", groups: ["confluence-users"]) { request, binding ->
    // Create new iteration type with validation
}
```

### Repository Pattern
```groovy
// IterationTypesRepository.groovy
class IterationTypesRepository {
    static List<Map> findAllActive() {
        return DatabaseUtil.withSql { sql ->
            sql.rows("""
                SELECT itt_name as name, itt_description as description,
                       itt_color as color, itt_icon as icon,
                       itt_display_order as displayOrder, itt_active as active
                FROM tbl_iteration_types_master 
                WHERE itt_active = true 
                ORDER BY itt_display_order, itt_name
            """)
        }
    }
    // Additional CRUD methods...
}
```

### Admin GUI Component
```javascript
// admin-gui/iteration-types.js
class IterationTypesManager {
    constructor() {
        this.apiClient = new APIClient('/api/v2/iteration-types');
    }
    
    async loadTypes() {
        // Load and display iteration types with colors/icons
    }
    
    async createType(typeData) {
        // Create new iteration type with validation
    }
    
    renderTypePreview(type) {
        // Show visual preview with color and icon
    }
}
```

## Implementation Phases

### Phase 1: Database & API Foundation (1-2 days)
- Create database table and seed data
- Implement IterationTypesRepository with CRUD operations
- Develop REST API endpoints with validation
- Unit testing for repository and API

### Phase 2: Admin GUI Integration (1-2 days)  
- Create iteration types management component
- Implement CRUD interface with visual previews
- Add to Admin GUI navigation and routing
- Integration testing and validation

### Phase 3: Testing & Polish (0.5-1 day)
- Comprehensive testing suite
- Error handling and edge cases
- Documentation updates
- Performance validation

## Dependencies

### Prerequisites
- **US-042**: Teams Management (for consistency in patterns and approach)
- Current database schema and IterationsApi understanding

### Related Stories
- Future UI enhancements can leverage type colors and icons
- Migration workflow extensions may utilize new iteration types

## Risk Assessment

### Low Risk Factors
- **Simple Implementation**: String primary key avoids complex retrofitting
- **Zero Breaking Changes**: Existing functionality remains untouched
- **Proven Patterns**: Following established UMIG API and database patterns
- **Small Scope**: Limited to basic CRUD operations

### Mitigation Strategies
- **Database Migration**: Test thoroughly in development environment
- **API Validation**: Prevent deletion of types currently in use by iterations
- **Rollback Plan**: Simple database rollback if issues arise
- **Gradual Rollout**: Can be deployed without affecting existing workflows

## Definition of Done

- [ ] Database schema created and populated with seed data
- [ ] REST API fully functional with all CRUD operations
- [ ] Admin GUI component integrated and tested
- [ ] All unit and integration tests passing (>90% coverage)
- [ ] Zero breaking changes to existing IterationsApi functionality
- [ ] Documentation updated (API specs, admin guide)
- [ ] Performance verified (<3s response times)
- [ ] Peer review completed and approved

## Business Value

### Immediate Benefits
- **Administrative Control**: Full CRUD management of iteration types
- **Visual Differentiation**: Colors and icons improve UX
- **Documentation**: Better clarity on iteration purposes
- **Extensibility**: Easy addition of new iteration types

### Future Opportunities
- **Workflow Rules**: Type-specific business logic
- **Reporting**: Enhanced analytics by iteration type
- **Integration**: External system mappings via iteration types
- **User Experience**: Improved visual organization in UIs

## Success Metrics

- **Functionality**: 100% CRUD operations working correctly
- **Performance**: <3 second response times for all operations
- **Reliability**: Zero data integrity issues after deployment
- **Usability**: Admin users can manage types without technical assistance
- **Compatibility**: Existing iterations continue to display and function normally

---

**Created**: January 2025  
**Last Updated**: January 2025  
**Status**: Backlog  
**Estimated Effort**: 3-4 story points  
**Business Priority**: Medium