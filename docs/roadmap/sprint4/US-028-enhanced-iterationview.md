# US-028: Enhanced IterationView (Operational Interface)

## Story Metadata

**Story ID**: US-028  
**Epic**: API Modernization & Operational Excellence  
**Sprint**: 4  
**Priority**: HIGH (Primary Sprint 4 Focus)  
**Story Points**: 3 (1 point complete, 2 points remaining for Phases 2-3)  
**Status**: ✅ Phase 1 COMPLETE (August 15, 2025) - Phases 2-3 In Progress  
**Dependencies**: US-024 StepsAPI Refactoring (COMPLETE)  
**Risk**: LOW (Phase 1 completed successfully, timeline risk reduced)

---

## User Story Statement

**As a** Migration Pilot coordinating live cutover events  
**I want** the IterationView enhanced with real-time collaboration and dynamic adjustment capabilities  
**So that** I can coordinate distributed teams effectively and respond to real-time conditions during critical migration windows

### Critical Context

**IterationView is an OPERATIONAL INTERFACE for LIVE MIGRATION EXECUTION**

- NOT an admin tool for data management (that's Admin GUI)
- NOT a strategic dashboard (that's US-033)
- IS the primary tool for Pilots and Teams during migration events

---

## Target Users & Capabilities

### 🎯 **PILOTS** (Primary Users)

- Update step status in real-time
- Reorder steps within phases based on conditions
- Reorder phases within sequences for optimization
- Add/manage labels for categorization
- View team workload and reassign as needed
- Bulk operations for efficiency

### 👥 **TEAM MEMBERS** (Execution Users)

- Update their assigned step status
- Check off completed instructions
- Add comments and updates
- View their workqueue
- Collaborate with team
- Report blockers and issues

### 🔍 **ALL USERS** (Stakeholders)

- View real-time progress
- Add comments for collaboration
- Subscribe to notifications
- Export status reports

---

## Acceptance Criteria

### AC1: StepsAPI Integration & Performance

**Given** the refactored StepsAPI from US-024  
**When** using the enhanced IterationView  
**Then** integrate with new endpoints for improved performance  
**And** achieve <3 second load times for 1000+ steps  
**And** implement efficient client-side caching  
**And** maintain state during page refreshes

### AC2: Real-time Status Management

**Given** the need for live coordination  
**When** managing migration execution  
**Then** enable role-based status updates  
**And** provide real-time updates (2-second polling)  
**And** show visual indicators for recent changes  
**And** implement conflict resolution for concurrent updates

### AC3: Dynamic Pilot Controls

**Given** pilots need to adapt during execution  
**When** conditions change during migration  
**Then** enable drag-drop reordering of steps/phases  
**And** validate against business rules  
**And** persist changes immediately  
**And** notify affected team members

### AC4: Team Collaboration Features

**Given** distributed teams need coordination  
**When** executing migration steps  
**Then** provide instruction completion tracking  
**And** implement comment system with @mentions  
**And** show activity feed of recent actions  
**And** enable bulk team assignments

### AC5: Advanced Operational Features

**Given** the need for operational oversight  
**When** monitoring migration progress  
**Then** provide KPI dashboard (progress %, blockers, critical path)  
**And** show team workload distribution  
**And** highlight risks and escalations  
**And** enable export for reporting

### AC6: Mobile-Responsive Operations

**Given** field teams need mobile access  
**When** working on-site during migrations  
**Then** provide touch-friendly interface  
**And** enable offline mode with sync  
**And** support swipe gestures for status updates  
**And** integrate camera for evidence capture

---

## Implementation Files

### Existing Files to Enhance

- **Macro**: `src/groovy/umig/macros/v1/iterationViewMacro.groovy`
- **JavaScript**: `src/groovy/umig/web/js/iteration-view.js`
- **CSS**: `src/groovy/umig/web/css/iteration-view.css`

### API Integration Points

- **Primary**: `src/groovy/umig/api/v2/StepsApi.groovy` (refactored in US-024)
- **Supporting**: Teams, Labels, Instructions, Comments APIs

### Testing

- **Integration**: `src/groovy/umig/tests/integration/IterationViewIntegrationTest.groovy`
- **Performance**: Load testing with 50 concurrent users

---

## Technical Implementation

### Role-Based Access Control (Existing)

```javascript
// Current RBAC implementation
this.userRole = this.userContext.role || "NORMAL";
this.isAdmin = this.userContext.isAdmin || false;

// Role capabilities
NORMAL:  View, Comment, Instruction checkboxes
PILOT:   All NORMAL + Status updates, Reorder, Labels, Bulk ops
ADMIN:   All PILOT + User management, Advanced operations
```

### API Integration Pattern

```javascript
// Leverage refactored StepsAPI
const StepsAPIv2 = {
    baseUrl: '/rest/scriptrunner/latest/custom/api/v2/steps',

    // Optimized endpoints from US-024
    fetchSteps: async (filters, pagination) => {...},
    updateStatus: async (stepId, status, userRole) => {...},
    reorderItems: async (items, containerId) => {...},
    bulkUpdate: async (stepIds, updates) => {...}
};
```

### Real-time Synchronization

```javascript
// Polling for live updates
const RealTimeSync = {
  pollInterval: 2000,

  checkForUpdates: async function () {
    const updates = await StepsAPIv2.fetchUpdates(this.lastSync);
    if (updates.hasChanges) {
      this.applyUpdates(updates);
      this.notifyUsers(updates.critical);
    }
  },
};
```

---

## Performance Requirements

### Response Times

- Initial load: <3s for 1000 steps
- Status update: <1s round-trip
- Filter application: <500ms
- Real-time sync: 2s polling interval

### Concurrent Usage

- Support 50 concurrent users
- Handle 10 updates/second
- Maintain consistency across sessions
- Graceful degradation under load

### Mobile Performance

- Load time: <5s on 3G
- Touch response: <100ms
- Offline queue: 100 operations
- Sync on reconnect: automatic

---

## Risk Mitigation

| Risk                    | Impact | Mitigation                      |
| ----------------------- | ------ | ------------------------------- |
| Concurrent updates      | HIGH   | Optimistic locking, conflict UI |
| Mobile connectivity     | HIGH   | Offline mode with sync queue    |
| Performance degradation | MEDIUM | Progressive loading, caching    |
| User adoption           | MEDIUM | In-app tutorials, tooltips      |
| Data inconsistency      | HIGH   | Transaction support, audit log  |

---

## Definition of Done

### Functional Requirements

- [ ] StepsAPI integration complete
- [ ] Real-time updates functional
- [ ] Pilot reordering capabilities working
- [ ] Team collaboration features operational
- [ ] Mobile interface responsive
- [ ] Performance targets achieved

### Quality Requirements

- [ ] 90% test coverage for new code
- [ ] Load tested with 50 concurrent users
- [ ] Mobile tested on iOS/Android
- [ ] No regression in existing features
- [ ] Security review passed

### Operational Requirements

- [ ] RBAC properly enforced
- [ ] Audit trail functional
- [ ] Error handling comprehensive
- [ ] Documentation updated
- [ ] Training materials prepared

---

## Implementation Phases

### Phase 1: Core Integration (Week 1)

- StepsAPI v2 integration
- Advanced filtering implementation
- Performance optimization
- Real-time status updates

### Phase 2: Collaboration Features (Week 2)

- Dynamic reordering for Pilots
- Instruction completion tracking
- Comment system with @mentions
- Activity feed and notifications

### Phase 3: Advanced Features (Week 3)

- Operational KPI dashboard
- Mobile-responsive design
- Offline capability
- Export functionality

### Week 3.5: Testing & Polish

- User acceptance testing
- Performance validation
- Bug fixes and refinements
- Documentation completion

---

## Success Metrics

### Business Impact

- 40% reduction in coordination overhead
- 60% faster incident response
- 90% user adoption within first week
- Zero data loss during migrations

### Technical Achievement

- <3s load time achieved
- 50 concurrent users supported
- 99.9% uptime during migrations
- Mobile access functional

---

**Story Owner**: Development Team  
**Primary Stakeholders**: Migration Pilots, Execution Teams  
**Business Sponsor**: Operations Manager  
**Review Date**: Daily during Sprint 4

**Success Vision**: Transform IterationView into a real-time operational command center that empowers Pilots to coordinate complex migrations efficiently while enabling teams to execute with clarity and confidence.
