# Custom Confluence Image for UMIG

This directory contains the `Containerfile` used to build the custom Atlassian Confluence image for the UMIG local development environment. This image is based on the official Confluence version specified within the `Containerfile` (e.g., `7.19.8`).

## Purpose

The primary purpose of this custom image is to provide a consistent Confluence environment tailored for UMIG development. It ensures that all developers are using the same base Confluence version.

## ScriptRunner Installation

**Important:** Unlike previous iterations, the ScriptRunner for Confluence plugin is **NOT** pre-installed or copied into this image during the build process. 

As per `ADR-007: local-dev-setup-plugin-installation`, ScriptRunner is installed **manually** via the Confluence UI Marketplace *after* the Confluence service has been started by the `podman-compose.yml` configuration in the parent `local-dev-setup` directory.

This manual installation approach was adopted to improve the stability and reliability of the local development environment setup.

Please refer to the main `README.md` in the `local-dev-setup` directory for the complete, step-by-step instructions on initializing your environment, which includes the manual ScriptRunner installation.

## Building the Image

This image is typically built automatically by the Ansible playbook (`setup.yml`) located in the parent `local-dev-setup` directory when you run `ansible-playbook setup.yml` for the first time or when changes to the `Containerfile` are detected (unless caching prevents it).

You generally do not need to build this image manually unless you are specifically modifying the `Containerfile`.