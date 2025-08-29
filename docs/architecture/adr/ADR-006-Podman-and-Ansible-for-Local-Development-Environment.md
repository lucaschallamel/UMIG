# ADR-006: Podman and Ansible for Local Development Environment

- **Status:** Superseded by ADR-025
- **Date:** 2025-06-16
- **Deciders:** UMIG Project Team
- **Technical Story:** N/A

## Context and Problem Statement

To ensure a consistent, reproducible, and efficient local development setup for all team members working on the UMIG project, a standardized environment is required. This environment needs to provide local instances of key backend services: Atlassian Confluence (with ScriptRunner), PostgreSQL, and a mock SMTP server for email testing. The chosen solution must align with company standards for containerization and configuration management.

## Decision Drivers

- **Consistency:** Provide an identical development environment for all developers to minimize "it works on my machine" issues.
- **Isolation:** Services should run in isolated environments to prevent conflicts with other local development setups or system services.
- **Ease of Onboarding:** New team members should be able to set up their local environment quickly and reliably.
- **Reproducibility:** The environment setup should be automatable and versionable.
- **Alignment with Company Standards:** Utilize company-approved tools for containerization (Podman) and configuration management/scripting (Ansible), as indicated in `techContext.md`.
- **Developer Productivity:** Streamline the process of starting, stopping, and managing local development services.
- **Resource Management:** Provide a way to manage resource-intensive services like Confluence locally.

## Considered Options

- **Option 1: Manual Local Installation of Services**
  - Description: Each developer manually installs and configures Confluence, PostgreSQL, and an SMTP tool directly on their machine.
  - Pros: Potentially simpler for developers already familiar with these manual setups.
  - Cons: Highly prone to inconsistencies in versions and configurations. Difficult to reproduce setups. Time-consuming for onboarding. Risk of conflicts between services. Does not align with automation goals or company standards for containerization.
- **Option 2: Docker and Docker Compose**
  - Description: Use Docker to containerize services and Docker Compose to define and manage the multi-container environment.
  - Pros: Well-established ecosystem. Provides consistency and isolation. `docker-compose.yml` offers good orchestration.
  - Cons: While functional, Docker is not the company's primary standard for containerization; Podman is preferred.
- **Option 3: Podman and Ansible (Chosen)**
  - Description: Use Podman for containerizing Confluence (with ScriptRunner), PostgreSQL, and a mock SMTP server. Use Ansible playbooks to automate the provisioning, configuration, and management (start/stop/reset) of this Podman-based environment on developer machines. `podman-compose` may be used with Ansible for service orchestration if its syntax (compatible with `docker-compose.yml`) is beneficial.
  - Pros: Fully aligns with company standards (Podman for containers, Ansible for provisioning as per `techContext.md`). Provides strong automation, consistency, and reproducibility. Podman's daemonless architecture can be a benefit. Ansible allows for robust scripting of the entire setup process.
  - Cons: Requires development of Ansible playbooks, which is an initial time investment. Team members may need to familiarize themselves with Podman and Ansible if not already proficient.

## Decision Outcome

Chosen option: **"Podman and Ansible"**.

This approach is selected because it directly aligns with the company's established technology standards for containerization (Podman) and configuration management (Ansible), as noted in `techContext.md`. It offers the best combination of automation, consistency, reproducibility, and maintainability for the local development environment. Ansible playbooks will orchestrate Podman to set up and manage local instances of Confluence (with ScriptRunner), PostgreSQL, and a mock SMTP server. This ensures that all developers have a standardized and easy-to-manage environment, streamlining onboarding and reducing environment-related issues.

### Positive Consequences

- Standardized local development environment across the team.
- Simplified onboarding for new developers.
- Environment definition is version-controlled (Ansible playbooks, any `Containerfile` or compose files).
- Reduced "works on my machine" issues.
- Alignment with enterprise tooling strategy (Podman, Ansible).
- Improved developer productivity through automated environment management.

### Negative Consequences (if any)

- Initial time investment required to create robust Ansible playbooks and potentially custom `Containerfile`s (e.g., for Confluence with ScriptRunner).
- Developers may need some ramp-up time if unfamiliar with Podman or Ansible.
- Local resource consumption (RAM, CPU) for running multiple containers needs to be considered for developer machines.

## Validation

The success of this decision will be validated by:

- Developers being able to set up a fully functional local UMIG development environment using the provided Ansible playbooks within a short timeframe (e.g., under 1-2 hours for initial setup).
- Consistency of the local environment across different developer machines.
- Positive feedback from the development team regarding the ease of use and reliability of the local environment.
- Successful local testing of Confluence macros, ScriptRunner scripts, database interactions, and email notifications.

## Pros and Cons of the Options

(Covered in "Considered Options" section)

## Links

- `cline-docs/techContext.md` (mentions Podman and Ansible)
- ADR-001: Confluence-Integrated Application Architecture
- ADR-002: Backend Implementation with Atlassian ScriptRunner
- ADR-003: Database Technology - PostgreSQL

## Amendment History

- N/A
