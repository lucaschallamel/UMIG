# UMIG Project - Testing Guide

This directory contains all non-unit tests for the UMIG project.

## Overview

-   `/integration`: Contains integration tests that validate the interaction between different components, often requiring a live database connection. These tests are slower and are run separately from unit tests.

## Prerequisites

Before running these tests, ensure you have the following installed and configured:

1.  **Groovy**: The language used for writing the test scripts. If you don't have it, you can install it via Homebrew:
    ```bash
    brew install groovy
    ```

2.  **Running Local Environment**: The full UMIG development stack (Confluence, PostgreSQL) must be running via Podman. Refer to the main `README.md` in the project root for setup instructions.

3.  **`.env` File**: The integration tests read database credentials directly from the `.env` file located at `local-dev-setup/.env`. Ensure this file exists and contains the correct `UMIG_DB_USER`, `UMIG_DB_PASSWORD`, and `UMIG_DB_NAME` variables.

## Running Integration Tests

The easiest way to run all integration tests is to use the provided test runner script. This script handles setting up the classpath for the necessary database drivers.

From the **root of the project**, run:

```bash
./tests/run-integration-tests.sh
```

### How Dependencies are Managed (Grape)

Our Groovy scripts require a PostgreSQL JDBC driver to connect to the database. We use **Grape**, Groovy's built-in dependency manager, to handle this.

-   The first time a script requiring the driver is run, Grape will automatically download it and cache it locally (typically in `~/.groovy/grapes/`).
-   The `run-integration-tests.sh` script points directly to this cached driver. If the path changes or the driver is not found, you may need to update the `JDBC_DRIVER_PATH` variable in the script.

### Troubleshooting: Ensuring the JDBC Driver is Downloaded

If you see an error like:

```
❌ Error: PostgreSQL JDBC driver not found at ~/.groovy/grapes/org.postgresql/postgresql/jars/postgresql-42.2.20.jar
```

You need to trigger Grape to download the JDBC driver manually. Run this script from the `tests/` directory:

1. Create a file called `grab-postgres-jdbc.groovy` with the following contents:

    ```groovy
    @Grab('org.postgresql:postgresql:42.2.20')
    import org.postgresql.Driver

    println "✅  PostgreSQL JDBC driver downloaded via Grape."
    ```

2. Run the script:

    ```bash
    groovy grab-postgres-jdbc.groovy
    ```

This will download the driver to the correct location. You should see:

```
✅  PostgreSQL JDBC driver downloaded via Grape.
```

You can now re-run the integration tests.

## Adding a New Integration Test

1.  Create your new test script file in the `tests/integration/` directory.
2.  Follow the pattern in `stepViewApiIntegrationTest.groovy` for loading credentials and connecting to the database.
3.  Add a new line to the `run-integration-tests.sh` script to execute your new test.
