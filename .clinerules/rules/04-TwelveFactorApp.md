_Scope: This document provides the definitive, consolidated set of rules based on the Twelve-Factor App methodology. These principles are mandatory for ensuring our applications are built as scalable, resilient, and maintainable cloud-native services._

# The Consolidated Twelve-Factor App Rules for an AI Agent

**I. Codebase**

- A single, version-controlled codebase (e.g., in Git) must represent one and only one application.
- All code you generate, manage, or refactor for a specific application must belong to this single codebase.
- Shared functionality across applications must be factored into versioned libraries and managed via a dependency manager.
- This single codebase is used to produce multiple deploys (e.g., development, staging, production).

**II. Dependencies**

- You must explicitly declare all application dependencies via a manifest file (e.g., `requirements.txt`, `package.json`, `pom.xml`).
- Never rely on the implicit existence of system-wide packages or tools. The application must run in an isolated environment where only explicitly declared dependencies are available.

**III. Config**

- A strict separation between code and configuration must be enforced.
- All configuration that varies between deploys (credentials, resource handles, hostnames) must be read from environment variables.
- Never hardcode environment-specific values in the source code you generate. The codebase must be runnable anywhere provided the correct environment variables are set.

**IV. Backing Services**

- All backing services (databases, message queues, caches, external APIs, etc.) must be treated as attached, swappable resources.
- Connect to all backing services via locators/credentials stored in the configuration (environment variables). The code must be agnostic to whether a service is local or third-party.

**V. Build, Release, Run**

- Maintain a strict, three-stage separation:
  - **Build:** Converts the code repo into an executable bundle.
  - **Release:** Combines the build with environment-specific config.
  - **Run:** Executes the release in the target environment.
- Releases must be immutable and have unique IDs. Any change to code or config must create a new release. You must not generate code that attempts to modify itself at runtime.

**VI. Processes**

- Design the application to execute as one or more stateless, share-nothing processes.
- Any data that needs to persist must be stored in a stateful backing service (e.g., a database). Never assume that local memory or disk state is available across requests or between process restarts.

**VII. Port Binding**

- The application must be self-contained and export its services (e.g., HTTP) by binding to a port specified via configuration. Do not rely on runtime injection of a webserver (e.g., as a module in Apache).

**VIII. Concurrency**

- Design the application to scale out horizontally by adding more concurrent processes.
- Assign different workload types to different process types (e.g., `web`, `worker`).
- Rely on a process manager (e.g., systemd, Foreman, Kubernetes) for process lifecycle management, logging, and crash recovery.

**IX. Disposability**

- Processes must be disposable, meaning they can be started or stopped at a moment's notice.
- Strive for minimal startup time to facilitate fast elastic scaling and deployments.
- Ensure graceful shutdown on `SIGTERM`, finishing any in-progress work before exiting.
- Design processes to be robust against sudden death (crash-only design).

**X. Dev/Prod Parity**

- Keep development, staging, and production environments as similar as possible.
- This applies to the type and version of the programming language, system tooling, and all backing services.

**XI. Logs**

- Treat logs as event streams. Never write to or manage log files directly from the application.
- Each process must write its event stream, unbuffered, to standard output (`stdout`).
- The execution environment is responsible for collecting, aggregating, and routing these log streams for storage and analysis.

**XII. Admin Processes**

- Run administrative and management tasks (e.g., database migrations, one-off scripts) as one-off processes in an environment identical to the main application's long-running processes.
- Admin scripts must be shipped with the application code and use the same dependency and configuration management to avoid synchronization issues.

# Additional Consolidated Project Rules

**Onboarding & Knowledge Transfer**

- Maintain up-to-date onboarding guides and “How To” docs for new contributors and AI agents.
- All major workflows must have step-by-step documentation.
- Encourage new team members to suggest improvements to onboarding materials.

**AI/Agent Safeguards**

- All AI-generated code must be reviewed by a human before deployment to production.
- Escalate ambiguous or risky decisions to a human for approval.
- Log all significant AI-suggested changes for auditability.
- Never overwrite an `.env` file without first asking and confirming.

**Continuous Improvement**

- Hold regular retrospectives to review rules, workflows, and documentation.
- Encourage all contributors to provide feedback and suggest improvements.
- Update rules and workflows based on lessons learned.

**Environmental Sustainability**

- Optimize compute resources and minimize waste in infrastructure choices.
- Prefer energy-efficient solutions where practical.
- Consider environmental impact in all major technical decisions.
