---
description: Comprehensive deployment and release workflow with GENDEV agent orchestration for automated, safe, and monitored production deployments
---

# Deployment & Release Workflow

**Automated deployment with AI-enhanced validation, rollback strategies, and comprehensive monitoring**

## Purpose

Orchestrate GENDEV agents for safe, automated production deployments with validation gates, rollback capabilities, and comprehensive monitoring.

## When to Use

- Production releases
- Hotfix deployments
- Feature rollouts
- Infrastructure updates
- Configuration changes
- Emergency patches

## Prerequisites

- GENDEV agents available
- CI/CD pipeline configured
- Deployment environments ready
- Monitoring tools integrated
- Rollback procedures defined

## Workflow Steps

### Phase 1: Pre-Deployment Preparation

Please work with our GENDEV deployment operations manager to conduct comprehensive pre-deployment preparation using enterprise-level validation standards, focusing on deployment readiness assessment and infrastructure verification.

## MANDATORY VERIFICATION

- [ ] Read deployment readiness reports and infrastructure assessment documentation
- [ ] Verify enterprise-level validation standards are applied throughout preparation
- [ ] Check deployment environment status and resource availability confirmation
- [ ] Report actual deployment readiness status and any blocking issues

Next, collaborate with our GENDEV risk manager to perform systematic deployment risk assessment using standard validation processes, including dependency analysis and backup strategy validation.

## MANDATORY VERIFICATION

- [ ] Read risk assessment reports and deployment risk analysis documentation
- [ ] Verify standard validation processes are applied to risk evaluation
- [ ] Check dependency validation results and backup strategy completeness
- [ ] Report actual deployment risks and mitigation readiness status

**Deliverables:** Deployment readiness, risk assessment, dependency validation, resource verification, backup strategy

### Phase 2: Release Planning & Coordination

Please engage our GENDEV project planner to create comprehensive release planning with standard validation processes, working within normal timeline constraints and focusing on deployment scheduling and coordination.

## MANDATORY VERIFICATION

- [ ] Read the release plan documentation and deployment schedule files
- [ ] Verify standard validation processes are applied to timeline and resource planning
- [ ] Check timeline constraints are realistic and properly documented
- [ ] Report actual release planning status and schedule feasibility

Next, work with our GENDEV stakeholder communicator to coordinate stakeholder notifications and change management using standard validation protocols for communication effectiveness.

## MANDATORY VERIFICATION

- [ ] Read stakeholder communication plans and notification documentation
- [ ] Verify standard validation protocols are applied to communication strategies
- [ ] Check approval gates and change windows are properly established
- [ ] Report actual stakeholder communication readiness and approval status

**Deliverables:** Release plan, deployment schedule, stakeholder notifications, change windows, approval gates

### Phase 3: Build & Package Management

Please collaborate with our GENDEV CI/CD builder to establish comprehensive build and packaging automation, focusing on artifact generation, version management, and deployment pipeline optimization.

## MANDATORY VERIFICATION

- [ ] Read CI/CD pipeline configuration files and build artifact documentation
- [ ] Verify build automation processes are properly configured and functional
- [ ] Check build artifacts are generated correctly with proper versioning
- [ ] Report actual CI/CD pipeline status and build artifact availability

Next, work with our GENDEV dependency manager to conduct standard validation of dependencies, including security scanning and package management verification.

## MANDATORY VERIFICATION

- [ ] Read dependency analysis reports and security scan results
- [ ] Verify standard validation processes are applied to dependency management
- [ ] Check security scanning results show no critical vulnerabilities
- [ ] Report actual dependency security status and package integrity

**Deliverables:** Build artifacts, dependency validation, version tagging, security scanning, artifact repository

### Phase 4: Environment Configuration

Please work with our GENDEV Infrastructure as Code automation engineer to establish comprehensive infrastructure provisioning and configuration management with automated deployment environment setup.

## MANDATORY VERIFICATION

- [ ] Read infrastructure configuration files and provisioning scripts
- [ ] Verify IaC automation processes are properly configured and executable
- [ ] Check infrastructure deployment status and resource provisioning completion
- [ ] Report actual infrastructure readiness and configuration management status

Next, collaborate with our GENDEV security architect to implement security hardening and compliance validation using standard validation processes for deployment environment security.

## MANDATORY VERIFICATION

- [ ] Read security hardening reports and compliance validation documentation
- [ ] Verify standard validation processes are applied to security configuration
- [ ] Check compliance validation results and security hardening implementation
- [ ] Report actual deployment environment security status and compliance level

**Deliverables:** Infrastructure provisioning, configuration management, security hardening, compliance validation

### Phase 5: Deployment Execution

Please engage our GENDEV deployment operations manager to execute blue-green deployment strategy with standard validation processes, focusing on zero-downtime deployment and progressive rollout management.

## MANDATORY VERIFICATION

- [ ] Read blue-green deployment execution logs and status reports
- [ ] Verify standard validation processes are applied throughout deployment execution
- [ ] Check deployment health checks and validation gates are passing
- [ ] Report actual deployment execution status and blue-green strategy effectiveness

Next, work with our GENDEV resource monitor to establish comprehensive monitoring and alerting for the deployment, tracking system performance and resource utilization.

## MANDATORY VERIFICATION

- [ ] Read monitoring configuration and alert setup documentation
- [ ] Verify resource monitoring systems are active and collecting metrics
- [ ] Check alert thresholds and notification systems are properly configured
- [ ] Report actual monitoring system status and resource tracking effectiveness

**Deliverables:** Blue-green deployment, progressive rollout, health checks, monitoring alerts, validation gates

### Phase 6: Testing & Validation

Please collaborate with our GENDEV test suite generator to create comprehensive smoke testing focused on critical functionality validation using standard validation processes for post-deployment verification.

## MANDATORY VERIFICATION

- [ ] Read smoke test suite files and test execution results
- [ ] Verify standard validation processes are applied to smoke test generation
- [ ] Check smoke tests cover critical functionality and pass successfully
- [ ] Report actual smoke test results and critical functionality validation status

Next, work with our GENDEV QA coordinator to orchestrate comprehensive quality assurance validation using standard processes, including integration validation and user acceptance testing.

## MANDATORY VERIFICATION

- [ ] Read QA validation reports and user acceptance test results
- [ ] Verify standard validation processes are applied throughout QA coordination
- [ ] Check integration validation and performance benchmarks meet requirements
- [ ] Report actual QA validation status and user acceptance test outcomes

**Deliverables:** Smoke tests, integration validation, performance benchmarks, user acceptance, security verification

### Phase 7: Monitoring & Observability

Please engage our GENDEV resource monitor to establish comprehensive real-time monitoring systems and performance dashboards for continuous observability of the deployed system.

## MANDATORY VERIFICATION

- [ ] Read monitoring dashboard configurations and real-time metric collection setup
- [ ] Verify monitoring systems are actively collecting and displaying performance data
- [ ] Check anomaly detection and SLA tracking systems are operational
- [ ] Report actual monitoring system effectiveness and data collection status

Next, work with our GENDEV performance optimizer to conduct post-deployment performance analysis using standard validation processes, including performance tuning and optimization recommendations.

## MANDATORY VERIFICATION

- [ ] Read performance analysis reports and optimization recommendations
- [ ] Verify standard validation processes are applied to performance assessment
- [ ] Check performance metrics meet SLA requirements and optimization targets
- [ ] Report actual system performance status and optimization effectiveness

**Deliverables:** Real-time monitoring, performance dashboards, anomaly detection, SLA tracking, alert configuration

### Phase 8: Post-Deployment Activities

Please collaborate with our GENDEV documentation generator to create comprehensive release notes targeting mixed audiences with standard validation processes, focusing on deployment outcomes and feature documentation.

## MANDATORY VERIFICATION

- [ ] Read generated release notes and deployment documentation files
- [ ] Verify standard validation processes are applied to documentation creation
- [ ] Check release notes effectively communicate changes to mixed audiences
- [ ] Report actual documentation quality and release communication effectiveness

Finally, work with our GENDEV training and change manager to develop training materials for new features using standard validation processes, including knowledge base updates and user education resources.

## MANDATORY VERIFICATION

- [ ] Read training materials and knowledge base update documentation
- [ ] Verify standard validation processes are applied to training content development
- [ ] Check new feature training scope is comprehensive and user-focused
- [ ] Report actual training material quality and change management readiness

**Deliverables:** Release notes, deployment documentation, training materials, knowledge base updates, lessons learned

## Deployment Standards

### Deployment Strategies

- **Blue-Green**: Zero-downtime with instant rollback
- **Canary**: Progressive rollout with monitoring
- **Rolling**: Gradual replacement of instances
- **Feature Flags**: Controlled feature activation

### Quality Gates

- Build success: 100% required
- Test coverage: >90% passing
- Security scan: Zero critical issues
- Performance: Within SLA bounds
- Health checks: All passing

## Success Criteria

- Zero-downtime deployment
- All tests passing
- Performance maintained
- Security verified
- Monitoring operational
- Documentation complete

## Troubleshooting

### Common Issues

**Preparation:** Missing dependencies, configuration drift, resource constraints
**Deployment:** Failed health checks, rollback triggers, network issues
**Post-Deploy:** Performance degradation, unexpected errors, monitoring gaps

### Resolution

1. Automated rollback on failure
2. Progressive rollout validation
3. Real-time monitoring alerts
4. Clear escalation procedures
5. Comprehensive logging

## Deployment Checklist

- [ ] Risk assessment complete
- [ ] Stakeholders notified
- [ ] Backup created
- [ ] Dependencies validated
- [ ] Build artifacts ready
- [ ] Security scan passed
- [ ] Infrastructure provisioned
- [ ] Configuration validated
- [ ] Deployment executed
- [ ] Health checks passing
- [ ] Smoke tests passed
- [ ] Performance validated
- [ ] Monitoring active
- [ ] Alerts configured
- [ ] Documentation updated
- [ ] Team briefed
- [ ] Rollback tested
- [ ] Success metrics met

## Related GENDEV Agents

**Primary:** deployment-ops-manager, cicd-builder, resource-monitor, qa-coordinator, iac-automation-engineer

**Supporting:** risk-manager, project-planner, stakeholder-communicator, dependency-manager, security-architect, test-suite-generator, performance-optimizer, documentation-generator, training-change-manager

## Integration Points

- **Prerequisites:** feature-development, testing-validation
- **Parallel:** monitoring setup, documentation-generation
- **Triggers:** incident response, rollback procedures
- **Integrates:** CI/CD pipeline, monitoring systems

## Best Practices

1. Automated deployment pipelines
2. Progressive rollout strategies
3. Comprehensive validation gates
4. Real-time monitoring
5. Automated rollback capability
6. Clear communication plans
7. Documentation automation
8. Continuous improvement
