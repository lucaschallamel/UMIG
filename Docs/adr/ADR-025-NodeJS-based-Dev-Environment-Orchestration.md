# ADR-025: Node.js-based Orchestration for Local Development Environment

**Date:** 2025-07-02

**Status:** Accepted

## Context

The local development environment was previously managed by a collection of shell scripts (`start.sh`, `stop.sh`, `restart.sh`). While functional, these scripts presented several challenges:
- **Cross-Platform Compatibility:** Maintaining compatibility between macOS/Linux (Bash) and Windows (Git Bash, WSL) was cumbersome.
- **Maintainability:** As the logic grew more complex (e.g., selective data resets), the shell scripts became harder to read, maintain, and extend.
- **Dependency Management:** The scripts relied on globally installed tools like `podman-compose` and `ansible`, without a centralized way to manage or version them.
- **Limited Functionality:** Advanced features like sophisticated command-line argument parsing, interactive prompts, and structured error handling were difficult to implement robustly.

## Decision

We will replace the shell script-based orchestration layer with a unified Node.js application, managed via `npm` scripts defined in `local-dev-setup/package.json`.

This decision entails:
1.  **Consolidating all logic** into Node.js scripts within the `local-dev-setup/scripts/` directory.
2.  **Using `execa`** for robustly executing external commands (e.g., `podman`, `ansible-playbook`).
3.  **Using `commander`** to provide a rich, expressive command-line interface with flags and options (e.g., `npm run restart -- --erase --confluence`).
4.  **Centralizing all project dependencies** (like `@faker-js/faker`, `pg`, etc.) and dev dependencies (`jest`) in `package.json`.
5.  **Defining all user-facing commands** as `npm` scripts for consistency and ease of use.

## Consequences

### Positive
- **Improved Cross-Platform Compatibility:** Node.js is inherently cross-platform, eliminating the need for separate shell script implementations or workarounds.
- **Enhanced Maintainability:** JavaScript/Node.js offers a more structured, readable, and testable environment for complex logic compared to shell scripting.
- **Centralized Dependency Management:** `package.json` provides a single source of truth for all required libraries and their versions.
- **Richer CLI Functionality:** The new setup allows for more sophisticated and user-friendly commands, improving the developer experience.
- **Unified Toolchain:** The same tool (Node.js) used for data generation is now used for environment management, creating a more consistent development ecosystem.

### Negative
- **New Prerequisite:** Developers must now have Node.js and npm installed on their machines.
- **Increased Complexity:** The introduction of a Node.js application adds a layer of abstraction compared to simple shell scripts, although this is justified by the benefits.
