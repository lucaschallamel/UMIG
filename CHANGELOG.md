# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- The recommended method for installing ScriptRunner is now a manual installation via the Confluence UI Marketplace. This is more reliable than the previous automated `COPY` method.
- The `Containerfile` has been simplified to remove the automated plugin installation step.
- The `README.md` has been significantly updated with detailed instructions for manual plugin installation and a full validation workflow for both backend and frontend development.

### Fixed
- Resolved critical container instability by increasing the default memory allocation for the Confluence container from 2GB to 6GB, preventing Out Of Memory (OOM) crashes during startup and plugin installation.

## [0.1.0] - 2025-06-16
### Added
- **Local Development Environment (`local-dev-setup`):**
  - Initial setup using Ansible and Podman.
  - Custom Confluence image (`Containerfile`) to pre-install ScriptRunner.
  - `podman-compose.yml` to orchestrate Confluence, PostgreSQL, and MailHog services.
  - Ansible playbook (`setup.yml`) to automate environment validation and startup.
  - Configuration for a separate UMIG application database via a PostgreSQL `init-db.sh` script.
  - `src` directory mounted into the Confluence container for live development of Groovy and frontend assets.

### Fixed
- **ScriptRunner Installation:**
  - Corrected the `Containerfile` to copy the ScriptRunner plugin to the valid `/var/atlassian/application-data/confluence/plugins/installed-plugins` directory.
  - Changed the `COPY` instruction to use an explicit filename instead of a wildcard to prevent issues in cross-platform build environments (ARM64).
  - Added `--no-cache` flag to the Ansible build command to force a clean rebuild of the Confluence image, bypassing corrupted cache layers.
