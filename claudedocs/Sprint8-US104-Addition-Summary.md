# Sprint 8 Scope Expansion: US-104 Production Data Import Addition

**Date**: October 8, 2025
**Sprint**: Sprint 8 (Sept 30 - Oct 18, 2025)
**Impact**: +15 story points, +4 days timeline extension
**Priority**: P0 Critical

---

## Executive Summary

Sprint 8 has been successfully expanded to include **US-104: Production Data Import via Liquibase Migration** (13 points) and its prerequisite **TD-103: Performance Optimization Migration** (2 points), adding 15 total story points and extending the sprint timeline from October 14 to October 18 (4 additional days).

### Key Changes

| Metric                | Original                   | Updated                    | Change                  |
| --------------------- | -------------------------- | -------------------------- | ----------------------- |
| **Story Points**      | 51.5                       | 66.5                       | +15 (+29%)              |
| **Sprint Duration**   | 15 days (Sept 30 - Oct 14) | 17 days (Sept 30 - Oct 18) | +4 days                 |
| **Required Velocity** | 1.44 pts/day               | 3.31 pts/day               | +1.87 pts/day           |
| **Buffer**            | 40%                        | 13%                        | -27% (still acceptable) |
| **Completion %**      | 78% (40/51.5)              | 60% (40/66.5)              | -18% (recalculated)     |

---

## Sprint 8 Updated Overview

### Current Status (Day 9)

- **Total Commitment**: 66.5 points (51.5 original + 15 added)
- **Completed**: 40.0 points (60%)
- **Remaining**: 26.5 points over 8 days
- **Required Velocity**: 3.31 points/day
- **Buffer**: 13% (reduced from 40%, but achievable)

### Major Achievements to Date

✅ **US-098 100% COMPLETE** (42 points) - Configuration Management System
✅ **TD-015** (10 points) - Email Template Consistency
✅ **TD-016** (4.5 points) - Email Notification Enhancements
✅ **TD-017** (2 points) - Email Query Optimization (99.68% improvement)
✅ **TD-014-B** (6 points) - Repository Layer Testing (180 tests, 9.92/10 quality)
✅ **TD-020 Core** (4.5 points) - Build Packaging (66% complexity reduction)

### Remaining Work (26.5 points)

- **TD-014-C**: Service Layer Testing (3 points)
- **TD-014-D**: Infrastructure Testing (3 points)
- **TD-103**: Performance Optimization Migration (2 points) 🆕
- **US-104**: Production Data Import (13 points) 🆕
- **TD-020**: Final documentation (0.5 points)
- **TD-014**: Integration (5 points)

---

## New Stories Added

### TD-103: Performance Optimization Migration (2 points)

**Priority**: P0 Critical - MUST precede US-104
**Timeline**: Days 9-10 (October 9-10, 2025)
**Duration**: 1-2 hours

#### Scope

Implement 11 performance indexes based on schema validation recommendations #3, #4, #5:

**Lookup Performance Indexes** (Recommendation #3):

```sql
CREATE INDEX idx_sqm_name_plm ON sequences_master_sqm(plm_id, sqm_name);
CREATE INDEX idx_phm_name_sqm ON phases_master_phm(sqm_id, phm_name);
CREATE INDEX idx_ctm_code_phm ON controls_master_ctm(phm_id, ctm_code);
CREATE INDEX idx_tms_name ON teams_tms(tms_name);
CREATE INDEX idx_stm_phm ON steps_master_stm(phm_id);
CREATE INDEX idx_inm_stm ON instructions_master_inm(stm_id);
```

**Partial Indexes for Nullable FKs** (Recommendation #4):

```sql
CREATE INDEX idx_inm_ctm_not_null ON instructions_master_inm(ctm_id)
WHERE ctm_id IS NOT NULL;

CREATE INDEX idx_inm_tms_not_null ON instructions_master_inm(tms_id)
WHERE tms_id IS NOT NULL;
```

**Junction Table Indexes** (Recommendation #5):

```sql
CREATE INDEX idx_tms_x_usr_tms ON teams_tms_x_users_usr(tms_id);
CREATE INDEX idx_tms_x_usr_usr ON teams_tms_x_users_usr(usr_id);
CREATE INDEX idx_stm_x_tms_stm ON steps_master_stm_x_teams_tms_impacted(stm_id);
CREATE INDEX idx_stm_x_tms_tms ON steps_master_stm_x_teams_tms_impacted(tms_id);
```

#### Deliverable

- Liquibase changeset: `performance-optimization-pre-import.xml`
- Database execution plan validation
- Performance improvement verification
- Zero breaking changes confirmation

#### Success Criteria

- All 11 indexes created successfully
- Database execution plans validated and optimized
- Performance improvements measured and documented
- Zero breaking changes to existing queries
- Ready for US-104 data import execution

---

### US-104: Production Data Import via Liquibase Migration (13 points)

**Priority**: P0 Critical - Blocks production deployment
**Timeline**: Days 11-16 (October 11-16, 2025)
**Dependency**: TD-103 MUST complete first

#### Business Value

- **Immediate Operational Readiness**: System populated with real-world migration plans and cutover scenarios
- **Time Savings**: Eliminates 200+ hours of manual data entry
- **Production Enablement**: Blocks production deployment without production data
- **Knowledge Preservation**: Captures institutional knowledge from historical cutover events
- **Testing Accuracy**: Integration and UAT testing with realistic data volumes

#### Data Scale

**Total Records**: 15,282+ across 15 database tables

| Category         | Record Count | Details                                                                                    |
| ---------------- | ------------ | ------------------------------------------------------------------------------------------ |
| **Bootstrap**    | 5            | 3 roles, 1 team, 1 user, 1 plan, 1 migration                                               |
| **Excel Files**  | ~414         | Applications (≈150), Teams (≈30), Users (≈200), Step Types (≈4), Sequences (≈40)           |
| **JSON Files**   | ~14,900      | Sequences (≈10-15), Phases (≈120), Steps (≈1,200), Instructions (≈12,000), Controls (≈240) |
| **Associations** | ~2,200       | Team-User memberships (≈400), Step-Team impacts (≈1,800)                                   |

#### Implementation Phases

**Phase 1: Bootstrap Data Import** (Day 11, ~1 point)

- Create 5 foundational records (roles, default team, admin user, default plan, default migration)
- Liquibase changeset: `044_us104_bootstrap_data.sql`
- Execution time: <1 minute
- Single transaction with complete rollback capability

**Phase 2: Excel Import** (Day 11-12, ~3 points)

- Import 5 Excel files: applications, step_types, sequences, teams, users
- Groovy script → Liquibase SQL generation approach
- Execution time: <5 minutes
- Separate transaction per file for granular rollback

**Phase 3: JSON Hierarchical Import** (Day 12-15, ~6 points)

- Import 1,174 JSON files with cascading lookups
- Lookup-or-create patterns for sequences, phases, controls, teams
- Always-create for steps and instructions (preserve historical execution records)
- Execution time: <20 minutes
- Separate transaction per file, continue on failure

**Phase 4: Association Import** (Day 15-16, ~1 point)

- Populate many-to-many relationship tables
- Team-user memberships and step-team impacts
- Execution time: <4 minutes
- Single transaction with rollback capability

**Phase 5: Validation & Testing** (Day 16, ~2 points)

- Referential integrity verification (zero orphaned records)
- Audit trail validation (created_by='migration', updated_at=created_at)
- Idempotency testing (re-import safe)
- Performance target validation (<30 minutes total)
- Data quality spot-checks

#### Key Implementation Patterns

**Lookup vs Create Logic**:

| Entity           | Pattern          | Logic                                                    |
| ---------------- | ---------------- | -------------------------------------------------------- |
| **Sequences**    | Lookup-or-create | By `sqm_name` within `plm_id`, auto-generate `sqm_order` |
| **Phases**       | Lookup-or-create | By `phm_name` within `sqm_id`, auto-generate `phm_order` |
| **Controls**     | Lookup-or-create | By `ctm_code` within `phm_id`                            |
| **Teams**        | Lookup-or-create | By `tms_name` (NOT tms_code)                             |
| **Steps**        | Always-create    | NO lookup (preserve historical records)                  |
| **Instructions** | Always-create    | NO lookup (preserve historical records)                  |

**Critical Schema Compliance** (ADR-059: Schema as Authority):

✅ No `tms_code` column requirement (schema correct with tms_id + tms_name)
✅ No UNIQUE constraints on sequences/phases (managed via lookup queries)
✅ No CHECK constraints for status values (managed via status_sts table)
✅ Team lookup uses `tms_name`, NOT tms_code
✅ Bootstrap defaults reference status_sts table (ACTIVE, PLANNING statuses)
✅ Explicit `updated_at = created_at` on INSERT operations

**Transaction Boundaries**:

- **Bootstrap**: Single transaction, rollback all on failure
- **Excel files**: Separate transaction per file, granular rollback
- **JSON files**: Separate transaction per file, continue on failure
- **Associations**: Single transaction, rollback all on failure
- **Isolation Level**: `Connection.TRANSACTION_READ_COMMITTED`

#### Performance Targets

| Phase              | Target Time     | Details                      |
| ------------------ | --------------- | ---------------------------- |
| Bootstrap          | <1 minute       | 5 foundational records       |
| Excel Import       | <5 minutes      | 5 files, ~414 records        |
| JSON Import        | <20 minutes     | 1,174 files, ~14,900 records |
| Association Import | <4 minutes      | ~2,200 relationships         |
| **Total Duration** | **<30 minutes** | Complete import execution    |

#### Success Criteria (15 Acceptance Criteria)

✅ **AC-01**: Bootstrap data successfully created (5 foundational records)
✅ **AC-02**: Excel data successfully imported (~414 records)
✅ **AC-03**: JSON hierarchical import succeeds (~14,900 records)
✅ **AC-04**: Association tables populated (~2,200 relationships)
✅ **AC-05**: Data integrity verification passes (zero orphaned records)
✅ **AC-06**: Audit trail fields properly set (created_by='migration', updated_at=created_at)
✅ **AC-07**: Error handling implements ADR-023 (SQL state codes: 23503, 23505, 23502, 22001)
✅ **AC-08**: Transaction boundaries properly defined
✅ **AC-09**: Import script uses DatabaseUtil pattern (MANDATORY)
✅ **AC-10**: Import idempotency verified (re-run safe)
✅ **AC-11**: Performance targets met (<30 minutes total)

#### Critical Dependencies

⚠️ **TD-103 MUST complete first**: Performance indexes required for acceptable import performance
✅ Schema migrations 001-043 applied
✅ Bootstrap environment roles, iteration types, step types exist
✅ status_sts table populated with status values
✅ Excel files available at `db/import-data/rawData/*.xlsx`
✅ JSON files available at `db/import-data/rawData/json/*.json`

#### Risk Mitigation

| Risk                        | Likelihood | Impact | Mitigation                                                              |
| --------------------------- | ---------- | ------ | ----------------------------------------------------------------------- |
| **JSON parsing failures**   | Medium     | Medium | Granular per-file rollback, continue processing, log all errors         |
| **Performance degradation** | Low        | High   | TD-103 prerequisite indexes, prepared statements, batch lookups         |
| **Data consistency issues** | Medium     | Medium | Team lookup by tms_name, standardized formats, deduplication            |
| **Memory exhaustion**       | Low        | High   | Process one file at a time, streaming parser if needed, commit per file |
| **Import duration >30min**  | Medium     | Medium | TD-103 indexes, parallel import consideration, progress logging         |

#### Documentation Requirements

✅ **Data Import Developer Guide**: Technical implementation patterns, lookup-or-create examples, error handling
✅ **Data Import Runbook**: Pre-import checklist, execution commands, verification queries, rollback procedures
✅ **Data Import User Guide**: What data is imported, expected outcomes, troubleshooting
✅ **ADR**: Import architecture decisions and trade-offs

---

## Planning Analysis

### Capacity Assessment

**Original Sprint 8 Planning**:

- 51.5 points over 15 days
- Required velocity: 1.44 points/day (after 40 points completed)
- Buffer: 40% (exceptional risk mitigation)

**Updated Sprint 8 Planning**:

- 66.5 points over 17 days (+4 days extension)
- Required velocity: 3.31 points/day (after 40 points completed)
- Buffer: 13% (reduced but still acceptable)
- Assessment: **Achievable with current velocity**

### Velocity Analysis

**Historical Performance**:

- Sprint 7: 224% completion (exceptional but unsustainable)
- Sprint 8 Week 1: 40 points in 7 days = 5.71 points/day actual
- Sprint 8 Target: 3.31 points/day required (58% of Week 1 actual velocity)

**Conclusion**: Required velocity of 3.31 points/day is **achievable** based on:

- Proven Week 1 velocity of 5.71 points/day
- Strong AI agent support (75-85% time savings validated in TD-014-B)
- Remaining work is largely implementation vs complex design
- TD-103 is quick (1-2 hours) prerequisite work
- US-104 has clear specification and validated patterns

### Timeline Impact

**Original End Date**: October 14, 2025 (15 working days)
**Updated End Date**: October 18, 2025 (17 working days)
**Extension**: +4 days to maintain quality and buffer

**Rationale for Extension**:

- Maintains 13% buffer (vs 0% buffer if no extension)
- Allows proper testing and validation of US-104
- Prevents quality compromise for velocity pressure
- Aligns with organizational maturity goal (sustainable delivery)

### Priority Assessment

**Why Add US-104 to Sprint 8?**

1. **P0 Critical**: Blocks production deployment without production data
2. **Business Value**: Immediate operational readiness with real-world scenarios
3. **Time Savings**: Eliminates 200+ hours manual data entry
4. **Foundation Ready**: TD-103 reduces risk, US-098 configuration system complete
5. **Resource Availability**: Week 1 exceptional velocity creates capacity buffer
6. **Strategic Alignment**: Production deployment is next major milestone

**Alternative Considered**: Defer to Sprint 9

- **Rejected because**: Production deployment delayed unnecessarily
- **Impact**: 200+ hours manual work, delayed business value
- **Risk**: Data entry errors, incomplete production dataset

---

## Risk Assessment

### Risk Matrix (Updated)

| Risk                          | Probability | Impact | Severity   | Mitigation                       |
| ----------------------------- | ----------- | ------ | ---------- | -------------------------------- |
| **Reduced Buffer (40%→13%)**  | Medium      | Medium | **MEDIUM** | 4-day extension, proven velocity |
| **TD-103 Complexity**         | Low         | Medium | **LOW**    | Simple indexes, 1-2 hour scope   |
| **US-104 Data Quality**       | Medium      | High   | **MEDIUM** | Validation queries, audit trail  |
| **Import Performance**        | Low         | High   | **MEDIUM** | TD-103 prerequisite indexes      |
| **Single Developer Capacity** | Medium      | High   | **MEDIUM** | AI agent support, clear spec     |

### New Risk: Reduced Buffer

**Original Buffer**: 40% (exceptional risk mitigation)
**Updated Buffer**: 13% (acceptable but reduced)

**Mitigation**:

- 4-day timeline extension (Oct 14 → Oct 18)
- Proven velocity of 5.71 points/day (Week 1 actual)
- Required velocity only 3.31 points/day (58% of proven)
- AI agent delegation validated (75-85% time savings)
- US-104 specification complete with clear patterns

**Contingency Plans**:

1. **If velocity drops**: Prioritize US-104 over TD-014-C/D completion
2. **If US-104 at risk**: Focus on Phase 1-4, defer Phase 5 validation
3. **If timeline slips**: Extend sprint by additional 1-2 days vs descope

---

## Success Criteria

### Sprint 8 Success (Minimum)

- ✅ 60+ points completed (90% of 66.5-point commitment)
- ✅ TD-014 complete: All 4 sub-stories with 85%+ coverage
- ✅ TD-103 complete: All performance indexes deployed
- ✅ US-104 MVP complete: Bootstrap + Excel + JSON import (skip validation if needed)
- ✅ All quality gates passed
- ✅ Zero P0 bugs, <3 P1 bugs

### Sprint 8 Success (Target)

- ✅ 66.5 points completed (100% of commitment)
- ✅ TD-014 complete: All 4 sub-stories with 85-90% coverage
- ✅ TD-103 complete: All performance indexes with execution plan validation
- ✅ US-104 complete: All 15 acceptance criteria met
- ✅ All quality gates passed
- ✅ Zero P0/P1 bugs
- ✅ Production deployment ready

### Sprint 8 Success (Stretch)

- ✅ 73+ points completed (110% of commitment)
- ✅ TD-014 complete with 90%+ coverage
- ✅ US-104 complete with advanced validation
- ✅ All quality gates passed
- ✅ Zero bugs
- ✅ Technical debt reduction

---

## Recommendations

### Execution Strategy

1. **Days 9-10**: Complete TD-103 (2 points) - Priority 1
   - Create 11 performance indexes
   - Validate execution plans
   - Ensure zero breaking changes
   - **Estimated**: 1-2 hours actual work

2. **Days 11-12**: Start US-104 Phase 1-2 (4 points)
   - Bootstrap data import (Phase 1)
   - Excel import (Phase 2)
   - **Estimated**: 1-2 days

3. **Days 12-15**: Complete US-104 Phase 3 (6 points)
   - JSON hierarchical import (largest complexity)
   - Monitor performance with TD-103 indexes
   - **Estimated**: 3-4 days

4. **Days 15-16**: Complete US-104 Phase 4-5 (3 points)
   - Association import (Phase 4)
   - Validation & testing (Phase 5)
   - **Estimated**: 1-2 days

5. **Days 9-16**: Parallel TD-014-C/D (6 points)
   - Can work in parallel with US-104 as capacity allows
   - Prioritize US-104 if capacity constrained

### Timeline Management

**Recommended Approach**: **Extend sprint to October 18**

**Rationale**:

- Maintains 13% buffer vs 0% buffer without extension
- Allows proper US-104 testing and validation
- Prevents quality compromise for velocity
- Aligns with sustainable delivery goal

**Alternative**: Prioritize US-104, descope TD-014-C/D if needed

- **Only if**: Timeline slips beyond Oct 18
- **Impact**: Defer service/infrastructure testing to Sprint 9
- **Risk**: Test coverage gap, but US-098 already complete

### Quality Gates

**TD-103 Quality Gate** (Day 10):

- All 11 indexes created successfully
- Database execution plans validated
- Performance improvements measured
- Zero breaking changes confirmed
- **Go/No-Go**: Proceed to US-104 vs debug indexes

**US-104 Mid-Point Gate** (Day 13):

- Phase 1-2 complete (Bootstrap + Excel)
- Phase 3 in progress (JSON import)
- Performance on track (<20 min for JSON)
- **Go/No-Go**: Continue vs adjust scope

**Sprint 8 Final Gate** (Day 17):

- US-104 complete: All 15 acceptance criteria
- Data integrity: Zero orphaned records
- Performance: <30 minutes total import
- Documentation: All 3 guides complete
- **Go/No-Go**: Sprint complete vs extend 1-2 days

---

## Communication

### Stakeholder Message

**Subject**: Sprint 8 Scope Expansion - Production Data Import Added

**Summary**:
Sprint 8 has been expanded to include production data import capability (US-104, 13 points) with prerequisite performance optimization (TD-103, 2 points), adding 15 total story points. Sprint timeline extended from October 14 to October 18 (+4 days) to maintain quality.

**Business Value**:

- **Production Deployment Enablement**: US-104 blocks production without real-world data
- **Time Savings**: Eliminates 200+ hours manual data entry
- **Immediate Operational Readiness**: System populated with 15,282+ production records
- **Risk Reduction**: TD-103 performance indexes ensure acceptable import execution

**Impact**:

- Sprint extended 4 days (Oct 14→Oct 18) to maintain 13% buffer
- Required velocity 3.31 points/day (achievable, 58% of Week 1 actual velocity)
- Current progress: 60% complete (40.0/66.5 points)
- Remaining: 26.5 points over 8 days

**Confidence**: **HIGH** - Sprint remains achievable with proven velocity and strong AI agent support

---

## Document Updates

### Files Modified

1. **`docs/roadmap/sprint8/sprint8-breakdown.md`**
   - Updated sprint duration: Sept 30 - Oct 18 (17 days)
   - Updated story points: 51.5 → 66.5 points
   - Updated current state: Day 9, 60% complete
   - Updated required velocity: 1.44 → 3.31 points/day
   - Added Phase 2B: Production Data Import (TD-103 + US-104)
   - Updated velocity analysis with sprint expansion details
   - Updated executive summary with new priorities

2. **`docs/roadmap/unified-roadmap.md`**
   - Updated Sprint 8 title: Added "Data Import"
   - Updated Sprint 8 goal: Added production deployment enablement
   - Updated sprint duration: 15 → 17 working days
   - Updated story points: 51.5 → 66.5 points
   - Updated current progress: 78% → 60% (recalculated)
   - Updated required velocity: 1.44 → 3.31 points/day
   - Added Priority 4: Production Data Import section
   - Added Priority 5: Build Packaging Finalization section
   - Added TD-103 and US-104 to Sprint 8 Stories section
   - Added changelog entry for October 8, 2025
   - Updated "Last updated" footer with comprehensive sprint status

### Changes Summary

**Sprint 8 Breakdown** (`sprint8-breakdown.md`):

- 7 sections updated (header, summary, velocity, Phase 2B added, metrics updated)
- ~250 lines added for Phase 2B comprehensive details
- All metrics and dates updated throughout

**Unified Roadmap** (`unified-roadmap.md`):

- 5 sections updated (Sprint 8 header, goal, stories, changelog, footer)
- ~100 lines added for new priorities and US-104 details
- Comprehensive changelog entry with implementation details

---

## Next Steps

### Immediate Actions (Day 9-10)

1. **Start TD-103 Implementation**
   - Create Liquibase changeset: `performance-optimization-pre-import.xml`
   - Implement 11 performance indexes
   - Validate database execution plans
   - Measure performance improvements
   - Confirm zero breaking changes

2. **Prepare US-104 Environment**
   - Verify Excel/JSON source files available
   - Review schema validation report findings
   - Validate DatabaseUtil.withSql pattern compliance
   - Prepare test database for validation

3. **Update Sprint Tracking**
   - Update burndown chart with new totals (66.5 points)
   - Adjust daily velocity tracking (3.31 pts/day target)
   - Create US-104 task breakdown
   - Schedule mid-sprint checkpoint (Day 13)

### Development Sequence (Days 11-16)

**Day 11**: US-104 Phase 1 (Bootstrap Data)

- Create `044_us104_bootstrap_data.sql`
- Insert 5 foundational records
- Validate single transaction rollback

**Day 11-12**: US-104 Phase 2 (Excel Import)

- Create `ExcelImportService.groovy` or generated SQL
- Import 5 Excel files (~414 records)
- Test granular per-file rollback

**Days 12-15**: US-104 Phase 3 (JSON Import)

- Create `JsonImportService.groovy`
- Import 1,174 JSON files (~14,900 records)
- Validate lookup-or-create patterns
- Monitor performance with TD-103 indexes

**Days 15-16**: US-104 Phase 4-5 (Associations + Validation)

- Create `AssociationImportService.groovy`
- Import ~2,200 relationship records
- Execute validation queries
- Test idempotency (re-import safe)
- Measure total execution time (<30 min target)

### Quality Assurance

**Testing Strategy**:

- Unit tests for lookup-or-create logic
- Integration tests with sample JSON files
- Idempotency tests (re-run import)
- Performance validation (execution time)
- Data integrity verification (orphan detection)

**Documentation**:

- Data Import Developer Guide
- Data Import Runbook (operational)
- Data Import User Guide
- ADR for architecture decisions

---

## Conclusion

Sprint 8 scope expansion to include US-104 Production Data Import is **recommended and achievable** based on:

✅ **P0 Critical Priority**: Blocks production deployment
✅ **Proven Velocity**: Week 1 actual 5.71 pts/day vs required 3.31 pts/day
✅ **Risk Mitigation**: TD-103 prerequisite indexes reduce execution risk
✅ **Business Value**: Eliminates 200+ hours manual work, enables immediate operational readiness
✅ **Timeline Extension**: 4 additional days maintains quality and 13% buffer
✅ **Clear Specification**: US-104 fully documented with validated patterns
✅ **AI Agent Support**: 75-85% time savings proven in TD-014-B

**Sprint 8 remains on track** for 100% completion with high confidence.

---

**Prepared by**: Claude Code (Planning Analysis)
**Date**: October 8, 2025
**Sprint**: Sprint 8 (Day 9 of 17)
**Status**: ✅ Recommended for Implementation
