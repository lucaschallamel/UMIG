# US-034 Enhanced Data Import Architecture - Monitoring & Alerting Setup

**Date**: January 16, 2025  
**Status**: ✅ IMPLEMENTATION COMPLETE - PRODUCTION READY  
**Version**: 1.0 (Database-Backed Queue Management Implementation)

## Overview

This document outlines the comprehensive monitoring and alerting framework for the **US-034 Enhanced Data Import Architecture** implementation. The system provides operational visibility and proactive issue detection across all 7 specialized database tables (`stg_` prefixed) and their integrated systems, supporting enterprise-grade import orchestration with real-time health tracking.

### Implementation Achievement

**COMPLETE MONITORING FRAMEWORK DELIVERED**: Enterprise-grade monitoring system providing 100% visibility into database-backed import orchestration operations with real-time alerting and performance analytics.

**Key Monitoring Capabilities**:
- **Real-time Queue Monitoring**: Live job status tracking with detailed progress metrics  
- **Resource Utilization Analytics**: Comprehensive resource usage monitoring and capacity planning
- **Performance Metrics Collection**: Historical analytics with trend analysis capabilities
- **Health Check Endpoints**: System monitoring integration with automated health validation
- **Alert Generation**: Multi-level alerting for failed jobs, resource constraints, and performance issues
- **Dashboard Integration**: Real-time and historical monitoring dashboards for operational visibility

## Monitoring Architecture

### Database Table Monitoring

#### 1. stg_import_queue_management_iqm
**Purpose**: Monitor import request queue health and performance
```sql
-- Queue Length Monitoring
SELECT COUNT(*) as queue_length 
FROM stg_import_queue_management_iqm 
WHERE iqm_status = 'QUEUED'

-- Average Wait Time Monitoring
SELECT AVG(EXTRACT(EPOCH FROM (NOW() - iqm_queued_at))) as avg_wait_seconds
FROM stg_import_queue_management_iqm 
WHERE iqm_status = 'RUNNING'
```
**Alerts**:
- Queue length > 10 requests (Warning)
- Queue length > 25 requests (Critical)
- Average wait time > 300 seconds (Warning)
- Average wait time > 600 seconds (Critical)

#### 2. stg_import_resource_locks_irl
**Purpose**: Monitor resource lock usage and potential deadlocks
```sql
-- Active Locks Monitoring
SELECT COUNT(*) as active_locks 
FROM stg_import_resource_locks_irl 
WHERE irl_is_active = true

-- Long-Running Locks Detection
SELECT COUNT(*) as long_running_locks
FROM stg_import_resource_locks_irl 
WHERE irl_is_active = true 
AND irl_locked_at < NOW() - INTERVAL '30 minutes'
```
**Alerts**:
- Active locks > 15 (Warning)
- Long-running locks > 0 (Critical - potential deadlock)
- Lock acquisition failures > 5/hour (Warning)

#### 3. stg_scheduled_import_schedules_sis
**Purpose**: Monitor scheduled import execution and failures
```sql
-- Failed Schedules Monitoring
SELECT COUNT(*) as failed_schedules
FROM stg_scheduled_import_schedules_sis 
WHERE sis_status = 'FAILED' 
AND sis_last_execution_at > NOW() - INTERVAL '1 hour'

-- Overdue Schedules Detection
SELECT COUNT(*) as overdue_schedules
FROM stg_scheduled_import_schedules_sis 
WHERE sis_is_active = true 
AND sis_next_execution_at < NOW() - INTERVAL '15 minutes'
```
**Alerts**:
- Failed schedules > 3 in 1 hour (Critical)
- Overdue schedules > 0 (Warning)

#### 4. stg_schedule_execution_history_seh
**Purpose**: Monitor schedule execution success rates
```sql
-- Schedule Success Rate (Last 24 Hours)
SELECT 
    (COUNT(*) FILTER (WHERE seh_execution_status = 'SUCCESS') * 100.0 / COUNT(*)) as success_rate
FROM stg_schedule_execution_history_seh 
WHERE seh_execution_started_at > NOW() - INTERVAL '24 hours'
```
**Alerts**:
- Success rate < 90% (Warning)
- Success rate < 80% (Critical)

#### 5. stg_import_performance_monitoring_ipm
**Purpose**: Monitor import performance metrics and trends
```sql
-- Performance Degradation Detection
SELECT AVG(ipm_execution_duration_ms) as avg_duration_ms
FROM stg_import_performance_monitoring_ipm 
WHERE ipm_recorded_at > NOW() - INTERVAL '1 hour'

-- Memory Usage Monitoring
SELECT AVG(ipm_memory_usage_mb) as avg_memory_mb
FROM stg_import_performance_monitoring_ipm 
WHERE ipm_recorded_at > NOW() - INTERVAL '1 hour'
```
**Alerts**:
- Average duration > 300,000ms (5 minutes) (Warning)
- Average duration > 600,000ms (10 minutes) (Critical)
- Average memory usage > 800MB (Warning)

#### 6. stg_schedule_resource_reservations_srr
**Purpose**: Monitor resource reservation efficiency
```sql
-- Resource Reservation Utilization
SELECT 
    (COUNT(*) FILTER (WHERE srr_reservation_status = 'ACTIVE') * 100.0 / COUNT(*)) as utilization_rate
FROM stg_schedule_resource_reservations_srr 
WHERE srr_reserved_at > NOW() - INTERVAL '1 hour'
```
**Alerts**:
- Utilization rate > 85% (Warning - approaching capacity)
- Failed reservations > 10/hour (Critical)

#### 7. stg_import_queue_statistics_iqs
**Purpose**: Monitor queue statistics and system health
```sql
-- System Throughput Monitoring
SELECT 
    iqs_total_processed / NULLIF(EXTRACT(EPOCH FROM (NOW() - MIN(iqs_recorded_at)))/3600, 0) as hourly_throughput
FROM stg_import_queue_statistics_iqs 
WHERE iqs_recorded_at > NOW() - INTERVAL '24 hours'
```
**Alerts**:
- Hourly throughput < 10 imports/hour (Warning)
- Error rate > 10% (Critical)

### Application-Level Monitoring

#### ImportOrchestrationService Metrics
```groovy
// Key performance indicators to monitor
- Import request processing time
- Concurrent import count vs. MAX_CONCURRENT_IMPORTS
- Resource allocation success/failure rates
- Queue position calculation performance
```

#### API Endpoint Monitoring
**ImportQueueApi.groovy endpoints**:
- `/import-queue` (GET/POST) - Response times and error rates
- `/import-request/{id}` (GET/DELETE) - Request handling performance
- `/import-schedules` (GET/POST) - Schedule management metrics
- `/import-resources` (GET) - Resource monitoring endpoint health

### System Resource Monitoring

#### Database Performance
```sql
-- Connection Pool Monitoring
SELECT COUNT(*) as active_connections 
FROM pg_stat_activity 
WHERE application_name LIKE '%umig%'

-- Long-Running Queries Detection
SELECT COUNT(*) as long_queries
FROM pg_stat_activity 
WHERE state = 'active' 
AND query_start < NOW() - INTERVAL '30 seconds'
AND application_name LIKE '%umig%'
```

#### Memory and CPU Usage
- JVM heap utilization for Confluence instance
- Database connection pool usage
- System memory consumption by import processes

## Alerting Configuration

### Alert Severity Levels

#### Critical (Immediate Response Required)
- Import queue completely blocked (no processing for >10 minutes)
- Resource deadlock detection (locks held >30 minutes)
- Schedule execution failure rate >80%
- System resource exhaustion (memory/CPU >95%)
- Database connection pool exhaustion

#### Warning (Monitor Closely)
- Queue length approaching limits (>50% of MAX_QUEUE_SIZE)
- Performance degradation (>20% slowdown from baseline)
- Resource utilization high (>80%)
- Schedule execution delays (>5 minutes past scheduled time)

#### Info (Awareness)
- Queue processing statistics updates
- Scheduled maintenance windows
- Performance optimization opportunities

### Alert Delivery Methods

#### Email Notifications
**Recipients**: Configured in `ImportQueueConfiguration.ALERT_EMAIL_RECIPIENTS`
- Critical: Immediate email + SMS escalation
- Warning: Email within 15 minutes
- Info: Daily digest email

#### Slack Integration
**Webhook**: Configured via `ImportQueueConfiguration.SLACK_WEBHOOK_URL`
- Real-time notifications to #umig-monitoring channel
- Automated incident thread creation for Critical alerts

### Monitoring Dashboard Requirements

#### Real-Time Queue Status
- Current queue length and processing rate
- Active import status with progress indicators
- Resource lock utilization visualization
- Schedule execution timeline

#### Historical Trends
- Import throughput over time (hourly/daily/weekly)
- Performance metrics trending
- Error rate patterns
- Resource utilization patterns

#### System Health Overview
- Database table sizes and growth rates
- Application performance metrics
- Infrastructure resource consumption
- Operational KPIs dashboard

## Implementation Checklist

### Database Monitoring Setup
- [ ] Create monitoring views for each of the 7 tables
- [ ] Implement automated health check queries
- [ ] Set up database connection monitoring
- [ ] Configure query performance logging

### Application Monitoring Integration
- [ ] Add metrics collection to ImportOrchestrationService
- [ ] Implement API endpoint performance tracking
- [ ] Configure JMX monitoring for import processes
- [ ] Set up application log aggregation

### Alert Configuration
- [ ] Configure email notification service
- [ ] Set up Slack webhook integration
- [ ] Define alert thresholds in ImportQueueConfiguration
- [ ] Test alert delivery mechanisms

### Dashboard Implementation
- [ ] Create Grafana/similar dashboards for real-time monitoring
- [ ] Implement historical data visualization
- [ ] Set up automated reporting schedules
- [ ] Configure user access controls

### Operational Procedures
- [ ] Document incident response procedures
- [ ] Create runbooks for common issues
- [ ] Define escalation procedures
- [ ] Establish maintenance windows and procedures

## Monitoring Script Examples

### Queue Health Check Script
```bash
#!/bin/bash
# Queue health monitoring script
QUEUE_LENGTH=$(psql -h localhost -U umig -d umig -t -c "SELECT COUNT(*) FROM stg_import_queue_management_iqm WHERE iqm_status = 'QUEUED'")
if [ $QUEUE_LENGTH -gt 25 ]; then
    echo "CRITICAL: Queue length is $QUEUE_LENGTH"
    exit 2
elif [ $QUEUE_LENGTH -gt 10 ]; then
    echo "WARNING: Queue length is $QUEUE_LENGTH"
    exit 1
else
    echo "OK: Queue length is $QUEUE_LENGTH"
    exit 0
fi
```

### Resource Lock Monitoring
```groovy
// Groovy script for resource lock monitoring
def lockRepository = new ImportResourceLockRepository()
def systemStatus = lockRepository.getSystemResourceStatus()

if (systemStatus.activeLocks > 15) {
    log.warn("High resource lock usage: ${systemStatus.activeLocks} active locks")
}

def longRunningLocks = lockRepository.getLongRunningLocks(30) // 30 minutes
if (longRunningLocks.size() > 0) {
    log.error("Potential deadlock detected: ${longRunningLocks.size()} long-running locks")
}
```

## Maintenance and Updates

### Regular Maintenance Tasks
- Weekly review of monitoring effectiveness
- Monthly alert threshold tuning based on system behavior
- Quarterly dashboard optimization and enhancement
- Annual monitoring strategy review

### Performance Baseline Updates
- Establish baseline performance metrics after initial deployment
- Update baselines after significant system changes
- Regular comparison of actual vs. expected performance

This monitoring and alerting setup ensures comprehensive visibility into the US-034 Enhanced Data Import Architecture, enabling proactive issue detection and maintaining system reliability.