# ADR-001: Local Dev Environment Plugin Installation Method

*   **Status:** Accepted
*   **Date:** 2025-06-16
*   **Deciders:** Lucas Challamel, Cascade AI

## Context and Problem Statement

The initial local development setup attempted to automate the installation of the ScriptRunner plugin by copying the JAR file into the Docker image during the build process. This approach led to persistent failures, including the plugin not being visible in the UI and, more critically, the entire Confluence container crashing unpredictably.

The root cause was determined to be a combination of insufficient container memory (causing Out Of Memory crashes) and potential timing issues with Confluence's internal startup and plugin-scanning process.

## Decision Drivers

*   **Stability:** The development environment must be 100% reliable and stable.
*   **Simplicity & Clarity:** The setup process must be easy for any developer to follow and debug.
*   **Reproducibility:** Every developer must be able to achieve the same working environment by following the documented steps.

## Considered Options

*   **Option 1: Automated Installation via `Containerfile`**
    *   Description: The plugin JAR is copied into the image during the `podman build` step.
    *   Pros: Fully automated, zero-step process for the developer after running the setup script.
    *   Cons: Proved to be highly unstable. Caused OOM crashes and was difficult to debug. It also tightly couples the environment to a specific plugin JAR version stored in the repository.

*   **Option 2: Manual Installation via Confluence UI**
    *   Description: The developer starts the environment and then uses the in-app Atlassian Marketplace to find and install ScriptRunner.
    *   Pros: Extremely reliable and stable. Leverages Atlassian's own installation mechanism. Ensures the correct, compatible version of the plugin is always installed for the given Confluence version. Decouples the environment setup from a specific plugin version.
    *   Cons: Requires a one-time manual step from the developer during initial setup.

## Decision Outcome

Chosen option: **"Manual Installation via Confluence UI"**, because reliability and stability are the most critical requirements for a development environment. The minor inconvenience of a one-time manual installation is a small and acceptable trade-off for a setup that works consistently for every developer.

This decision was made in conjunction with increasing the Confluence container's memory allocation to 6GB to resolve the underlying OOM crashes.

### Positive Consequences

*   A stable, reproducible development environment.
*   A simplified `Containerfile` and build process.
*   Clear and easy-to-follow setup instructions in the `README.md`.
*   The environment is no longer dependent on a specific plugin JAR file being present in the repository.

### Negative Consequences

*   One additional manual step is required during the initial environment setup.

## Validation

The success of this decision is validated by the fact that the development environment is now stable, the ScriptRunner plugin can be installed successfully, and both backend and frontend live-reload workflows are fully functional.
