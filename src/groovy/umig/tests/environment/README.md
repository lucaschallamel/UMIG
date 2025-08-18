# Environment Validation Tests

This folder contains tests that validate environment-specific configurations and associations within the UMIG system.

## Tests Included

- **checkCutoverProdEnvironments.groovy** - Validates production cutover environment configurations
- **checkEnvironmentAssociations.groovy** - Tests environment associations and relationships
- **checkLabelAssociations.groovy** - Validates label associations with environments
- **compareEnvironmentAssignments.groovy** - Compares environment assignments across different contexts

## Purpose

These tests ensure that:

- Environment configurations are correct and consistent
- Environment associations are properly maintained
- Production cutover environments are configured correctly
- Label associations are accurate and complete

## Usage

Run these tests to validate environment-related functionality before deployments or when investigating environment-specific issues.
