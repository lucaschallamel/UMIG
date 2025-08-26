# US-044: Control Types Management

## Story Overview

**As a** UMIG administrator  
**I want** dynamic control types management with CRUD operations  
**So that** I can define and categorize different types of control points for validation scenarios

**Story Points**: 3  
**Sprint**: Future (Backlog)  
**Priority**: Medium  
**Category**: Data Management Enhancement  

## Business Context

Currently, control types are static/hardcoded in the database and ControlsApi. This story enables dynamic management of control types to support:

- Different validation scenarios (technical, business, compliance, quality)
- Visual differentiation through colors, icons, and severity levels
- Better categorization of control points
- Compliance workflow extensibility

## Success Criteria

### Acceptance Criteria

1. **✅ API Management**
   - `/api/v2/control-types` endpoint provides full CRUD operations
   - Standard REST operations: GET, POST, PUT, DELETE
   - Validation prevents deletion of control types in use
   - Follows established UMIG API patterns (StepsApi.groovy reference)

2. **✅ Database Schema**
   - New table: `tbl_control_types_master`
   - Primary key: `ctt_name VARCHAR(50) PRIMARY KEY`
   - Fields: description, color, icon, display_order, severity_level, active, audit fields
   - Zero breaking changes to existing ControlsApi

3. **✅ Admin GUI Component**
   - Dedicated control types management interface
   - CRUD operations with validation feedback
   - Color picker and icon selection
   - Drag-and-drop ordering capability

4. **✅ Data Migration**
   - Liquibase migration populates initial control types
   - Existing controls remain functional
   - Default control types based on current usage patterns

5. **✅ Integration Compatibility**
   - ControlsApi updated to reference dynamic control types
   - Backward compatibility maintained
   - No impact on existing control point functionality

6. **✅ Testing Coverage**
   - Unit tests for repository and API layers
   - Integration tests for CRUD operations
   - Admin GUI validation tests

## Technical Requirements

### Database Design

```sql
-- Table: tbl_control_types_master
CREATE TABLE tbl_control_types_master (
    ctt_name VARCHAR(50) PRIMARY KEY,
    ctt_description TEXT,
    ctt_color VARCHAR(7), -- Hex color code
    ctt_icon VARCHAR(50), -- Icon class/name
    ctt_display_order INTEGER DEFAULT 0,
    ctt_severity_level VARCHAR(20) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    ctt_active BOOLEAN DEFAULT true,
    ctt_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ctt_created_by VARCHAR(255),
    ctt_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ctt_updated_by VARCHAR(255)
);

-- Index for ordering
CREATE INDEX idx_control_types_display_order ON tbl_control_types_master(ctt_display_order);
```

### API Specification

```groovy
// ControlTypesApi.groovy
@BaseScript CustomEndpointDelegate delegate

controlTypes(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    // Get all control types with optional filtering
}

controlTypes(httpMethod: "POST", groups: ["confluence-administrators"]) { request, binding ->
    // Create new control type
}

controlTypes(httpMethod: "PUT", groups: ["confluence-administrators"]) { request, binding ->
    // Update existing control type
}

controlTypes(httpMethod: "DELETE", groups: ["confluence-administrators"]) { request, binding ->
    // Delete control type (validate not in use)
}
```

### Control Type Examples

| Control Type | Description | Color | Severity | Icon |
|--------------|-------------|--------|----------|------|
| Technical | System checks, automated validations | #3498DB | MEDIUM | aui-icon-tools |
| Business | Approval gates, sign-offs | #E67E22 | HIGH | aui-icon-approval |
| Compliance | Regulatory checks, audit points | #E74C3C | CRITICAL | aui-icon-compliance |
| Quality | Testing gates, performance checks | #27AE60 | MEDIUM | aui-icon-quality |
| Security | Security validations, access controls | #8E44AD | HIGH | aui-icon-locked |

## Implementation Plan

### Phase 1: Database & Repository (Day 1)
- Create `tbl_control_types_master` table via Liquibase
- Implement `ControlTypesRepository.groovy`
- Data migration with initial control types
- Unit tests for repository layer

### Phase 2: API Development (Day 2)
- Create `ControlTypesApi.groovy` following established patterns
- CRUD operations with validation
- Integration with existing ControlsApi
- API integration tests

### Phase 3: Admin GUI & Testing (Day 3)
- Admin GUI component for control types management
- Color picker and icon selection functionality
- Display order management (drag-and-drop)
- Comprehensive testing and validation

## Dependencies

- **US-042**: Team Types Management (consistency in approach)
- **US-043**: Environment Types Management (pattern alignment)
- Existing ControlsApi patterns and database schema

## Risks & Mitigations

### Low Risk Profile
- **Proven Pattern**: Following successful US-042/US-043 implementation
- **Non-Breaking**: Zero impact on existing functionality
- **Simple Schema**: Straightforward table design

### Potential Considerations
- **Control Type Usage**: Validate control types are not in use before deletion
- **Migration Safety**: Ensure existing controls maintain functionality
- **UI Performance**: Optimize for large numbers of control types

## Definition of Done

- [ ] Database schema created and migrated
- [ ] Repository layer implemented with full test coverage
- [ ] REST API functional with all CRUD operations
- [ ] Admin GUI component integrated and tested
- [ ] Existing ControlsApi updated for dynamic types
- [ ] Integration tests passing
- [ ] Code reviewed and merged
- [ ] Documentation updated

## Success Metrics

- All control types manageable through Admin GUI
- Zero breaking changes to existing controls
- API response times <200ms for control types operations
- 95%+ test coverage for new components
- Successful integration with existing control workflows

---

**Dependencies**: US-042, US-043  
**Estimated Effort**: 3 story points (1 sprint)  
**Technical Risk**: Low (proven pattern)  
**Business Value**: Medium (workflow enhancement)