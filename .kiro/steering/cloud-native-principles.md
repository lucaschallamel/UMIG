# Cloud-Native & Twelve-Factor App Principles

## Core Twelve-Factor Principles

### I. Codebase

- Single, version-controlled codebase represents one application
- All code must belong to this single codebase
- Shared functionality factored into versioned libraries
- Single codebase produces multiple deploys (dev, staging, prod)

### II. Dependencies

- Explicitly declare all dependencies via manifest files
- Never rely on implicit system-wide packages
- Application must run in isolated environment

### III. Config

- Strict separation between code and configuration
- All environment-varying config read from environment variables
- Never hardcode environment-specific values in source code

### IV. Backing Services

- Treat all backing services as attached, swappable resources
- Connect via locators/credentials stored in configuration
- Code must be agnostic to local vs third-party services

### V. Build, Release, Run

- Maintain strict three-stage separation:
  - **Build**: Code repo → executable bundle
  - **Release**: Build + environment config
  - **Run**: Execute release in target environment
- Releases must be immutable with unique IDs

### VI. Processes

- Execute as stateless, share-nothing processes
- Persistent data stored in stateful backing services
- Never assume local memory/disk state persists

### VII. Port Binding

- Self-contained applications export services by binding to ports
- Port specified via configuration
- No runtime injection of webservers

### VIII. Concurrency

- Scale out horizontally by adding concurrent processes
- Assign different workload types to different process types
- Rely on process manager for lifecycle management

### IX. Disposability

- Processes must be disposable (start/stop at moment's notice)
- Minimize startup time for fast scaling
- Graceful shutdown on SIGTERM
- Robust against sudden death (crash-only design)

### X. Dev/Prod Parity

- Keep development, staging, production as similar as possible
- Same programming language, tools, and backing services

### XI. Logs

- Treat logs as event streams
- Write unbuffered to stdout
- Environment handles collection and routing

### XII. Admin Processes

- Run admin tasks as one-off processes
- Use same environment as main application
- Ship admin scripts with application code

## Additional Cloud-Native Rules

### AI/Agent Safeguards

- All AI-generated code reviewed by human before production
- Escalate ambiguous decisions to human
- Log all significant AI-suggested changes
- Never overwrite .env files without confirmation

### Environmental Sustainability

- Optimize compute resources and minimize waste
- Prefer energy-efficient solutions
- Consider environmental impact in technical decisions
