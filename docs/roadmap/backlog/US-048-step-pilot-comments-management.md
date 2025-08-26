# US-048: Step Pilot Comments Management within Master Steps Modal Views

**Epic**: Step Management Enhancement  
**Story Points**: 3  
**Priority**: Medium  
**Sprint**: TBD  
**Status**: Backlog  

## Story Description

As a pilot team member or step manager, I want to manage pilot comments directly within the Master Steps modal views so that I can provide guidance, notes, and feedback for step execution without leaving the step management interface.

## Business Value

- **Enhanced Collaboration**: Enable pilot teams to document insights and guidance directly within step context
- **Improved Execution Quality**: Provide contextual comments to support better step execution
- **Streamlined Workflow**: Manage comments without navigating away from step management interface
- **Knowledge Retention**: Capture pilot experience and lessons learned for future iterations
- **Visibility Control**: Allow appropriate sharing of comments based on audience needs

## Acceptance Criteria

### AC1: Comment Display and Ordering
- **GIVEN** a Master Step modal is opened
- **WHEN** the user views the comments section
- **THEN** all pilot comments are displayed ordered by `updated_at` DESC (most recent first)
- **AND** each comment shows visibility level indicator (icon/badge)
- **AND** each comment displays author and timestamp (e.g., "2 hours ago", "Yesterday")
- **AND** comments section is collapsible to save modal space

### AC2: Add New Comment
- **GIVEN** a user has appropriate permissions
- **WHEN** they click "Add Comment" button
- **THEN** a comment form appears with rich text editor and visibility dropdown
- **AND** visibility options are: "Pilot Only", "Teams", "All Users"
- **AND** body text is required with minimum 10 characters
- **AND** successful save adds comment to top of list (most recent)
- **AND** form resets after successful submission

### AC3: Edit Existing Comments
- **GIVEN** a user views their own comments or has admin permissions
- **WHEN** they click edit button on a comment
- **THEN** an inline editor or modal appears with current values
- **AND** they can modify body text and visibility level
- **AND** successful save updates the comment and refreshes timestamp
- **AND** updated comment moves to top of list due to new `updated_at`

### AC4: Delete Comments
- **GIVEN** a user views their own comments or has admin permissions
- **WHEN** they click delete button on a comment
- **THEN** a confirmation dialog appears with comment preview
- **AND** confirming deletion removes comment from list immediately
- **AND** deletion action is irreversible with appropriate warning

### AC5: Visibility Level Implementation
- **GIVEN** comments have different visibility levels
- **WHEN** displayed in the interface
- **THEN** "pilot" comments show pilot-only icon/badge
- **AND** "teams" comments show teams icon/badge
- **AND** "all" comments show public icon/badge
- **AND** visibility affects who can view the comment in future iterations
- **AND** visibility can be changed during edit operations

### AC6: Performance and User Experience
- **GIVEN** a step may have many comments over time
- **WHEN** the comments section loads
- **THEN** initial load shows first 20 comments with lazy loading
- **AND** search/filter capability allows filtering by visibility or text content
- **AND** comment operations (add/edit/delete) complete within 2 seconds
- **AND** optimistic UI updates provide immediate feedback

## Technical Requirements

### Database Integration
- **Table**: `step_pilot_comments_spc` (existing schema)
- **Fields**:
  - `spc_id` (UUID, primary key)
  - `stm_id` (UUID, foreign key to steps_master_stm)
  - `spc_body` (text, required - supports markdown/rich text)
  - `spc_visibility` (enum: 'pilot', 'teams', 'all')
  - `spc_created_by` (varchar, user identifier)
  - `spc_created_at` (timestamp)
  - `spc_updated_at` (timestamp for ordering)

### API Requirements
- **Endpoint Pattern**: `/api/v2/steps/{stepId}/comments`
- **Operations**: GET (list), POST (create), PUT (update), DELETE (remove)
- **Ordering**: Always `ORDER BY spc_updated_at DESC`
- **Pagination**: Support offset/limit for large comment sets
- **Validation**: Minimum body length, valid visibility enum values

### Modal Integration
- **Step Modal Enhancement**: Add collapsible "Pilot Comments" section
- **Form Integration**: Rich text editor (TinyMCE or markdown editor)
- **State Management**: Local state for comment CRUD operations
- **Error Handling**: Graceful handling of permission errors and network issues

### Visibility Level Implementation
```javascript
const VISIBILITY_CONFIG = {
  pilot: { label: 'Pilot Only', icon: 'fa-user-secret', color: '#orange' },
  teams: { label: 'Teams', icon: 'fa-users', color: '#blue' },
  all: { label: 'All Users', icon: 'fa-globe', color: '#green' }
};
```

### Performance Considerations
- **Lazy Loading**: Load comments only when section expanded
- **Optimistic Updates**: Immediate UI feedback for user actions
- **Caching Strategy**: Cache comments per step to reduce API calls
- **Search Optimization**: Client-side filtering for loaded comments

## Dependencies

### Technical Dependencies
- **Step Modals**: Existing Master Step modal views (VIEW/EDIT modes)
- **Rich Text Editor**: TinyMCE integration or markdown parser
- **Icon Library**: Font Awesome or similar for visibility indicators
- **Permission System**: User role checking for edit/delete operations

### Data Dependencies
- **steps_master_stm**: Parent step records must exist
- **User Management**: User identification for created_by fields
- **Visibility Rules**: Business rules for comment visibility levels

## Definition of Done

### Code Quality
- [ ] All comment CRUD operations implemented and tested
- [ ] Rich text/markdown editor integrated and functional
- [ ] Visibility level filtering working correctly
- [ ] Error handling covers all edge cases
- [ ] Code follows UMIG patterns (DatabaseUtil.withSql, type safety)

### Testing Requirements
- [ ] Unit tests: Comment repository operations (>90% coverage)
- [ ] Integration tests: API endpoints with authentication
- [ ] UI tests: Modal integration and form operations
- [ ] Performance tests: Large comment sets (100+ comments)
- [ ] Security tests: Visibility level enforcement

### Documentation
- [ ] API documentation updated with comment endpoints
- [ ] Database schema documented for comment fields
- [ ] User guide section for comment management
- [ ] Technical documentation for visibility level implementation

## Testing Scenarios

### Functional Testing
```javascript
// Test comment ordering
describe('Comment Ordering', () => {
  it('should display comments ordered by updated_at DESC', () => {
    // Create comments with different timestamps
    // Verify most recent appears first
  });
  
  it('should move edited comment to top of list', () => {
    // Edit older comment
    // Verify it moves to first position
  });
});

// Test visibility filtering
describe('Visibility Levels', () => {
  it('should display appropriate visibility indicators', () => {
    // Create comments with different visibility levels
    // Verify correct icons/badges displayed
  });
  
  it('should allow visibility level changes during edit', () => {
    // Edit comment and change visibility
    // Verify change persists and updates indicator
  });
});
```

### Performance Testing
- **Load Time**: Comments section loads within 2 seconds
- **Large Datasets**: Handle 100+ comments with pagination
- **Concurrent Operations**: Multiple users editing comments simultaneously

### Security Testing
- **Permission Verification**: Users can only edit/delete their own comments
- **Visibility Enforcement**: Comments respect visibility level restrictions  
- **Input Validation**: Malicious content prevented in comment body

## Notes

### Implementation Approach
1. **Phase 1**: Basic CRUD operations with simple text editor
2. **Phase 2**: Rich text/markdown editor integration
3. **Phase 3**: Advanced features (search, bulk operations)

### Alternative Considerations
- **Editor Choice**: Rich text vs Markdown vs plain text with formatting
- **Visibility Strategy**: Role-based vs explicit visibility settings
- **Storage Approach**: Inline vs separate comment management interface

### Risk Mitigation
- **Modal Complexity**: Keep comment section collapsible to avoid overcrowding
- **Performance Impact**: Implement lazy loading and pagination early
- **User Experience**: Provide clear visual feedback for all operations

## Related Stories
- **US-028**: Enhanced IterationView (provides step modal foundation)
- **US-036**: StepView UI Refactoring (step interface improvements)
- **Future**: Step Instructions management (similar comment-like interface)