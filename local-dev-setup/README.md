# UMIG Local Development Environment Setup

This directory contains all the necessary files to run a complete local development environment for the UMIG project using Podman and Ansible.

## Prerequisites

You must have Liquibase CLI, Ansible, Podman, and `podman-compose` installed on your local machine.

### Liquibase CLI Installation
Install the Liquibase command-line interface (CLI).
    ***General Steps**:
        1.  Download the Liquibase installation files (typically a ZIP archive) from the [official Liquibase website](https://www.liquibase.com/download).
        2.  Extract the archive to a directory on your local system (e.g., `~/liquibase` on macOS/Linux, `C:\liquibase` on Windows).
        3.  Add the directory where you extracted Liquibase to your system's PATH environment variable. This allows you to run the `liquibase` command from any terminal window.
    *   **macOS Specific**:
        ***Recommended (Homebrew)**: `brew install liquibase`
        *   **Manual**: Follow the general steps above. You might add something like `export PATH=~/liquibase:$PATH` to your shell profile (e.g., `~/.zshrc`, `~/.bash_profile`).
    ***Linux Specific**:
        *   **Manual**: Follow the general steps above. You might add something like `export PATH=/opt/liquibase:$PATH` (if you extracted it to `/opt/liquibase`) to your shell profile (e.g., `~/.bashrc`, `~/.zshrc`). Ensure the `liquibase` script is executable (`chmod +x liquibase`).
    ***Windows Specific**:
        *   **Manual**: Follow the general steps above. To add Liquibase to your PATH:
            1.  In the Windows Start Menu Search, type `env` and select "Edit the system environment variables".
            2.  In the System Properties window, click the "Environment Variables..." button.
            3.  Under "System variables" (or "User variables" for just your account), find the variable named `Path` and select it.
            4.  Click "Edit..." and then "New", and add the full path to your Liquibase directory (e.g., `C:\liquibase`).

### Ansible Installation
Install Ansible.
    ***macOS Specific**:
        *   **Recommended (Homebrew)**: `brew install ansible`
    ***Linux Specific**:
        *   **Recommended (pip)**: `python3 -m pip install --user ansible`
    ***Windows Specific**:
        *   **Recommended (WSL)**: Install Ansible inside the Windows Subsystem for Linux (WSL).

### Podman & Podman-Compose Installation
Install Podman and `podman-compose`.
    ***macOS Specific**:
        *   **Recommended (Homebrew)**:
            ```bash
            brew install podman
            brew install podman-compose
            ```
    ***Linux Specific**:
        *   Follow the official installation instructions for your distribution.
    ***Windows Specific**:
        *   Follow the official installation instructions.

## Usage

This setup provides simple shell scripts to manage the entire lifecycle of the development environment.

**Important:** Before running the scripts for the first time, make them executable:
```bash
chmod +x start.sh stop.sh restart.sh
```

### `start.sh`
Starts all services. The first time you run this, it will execute an Ansible playbook to perform initial setup, such as creating necessary directories.

**Command:**
```bash
./start.sh
```

### `stop.sh`
Stops and removes all running containers and networks. By default, this is a non-destructive operation.

To perform a full cleanup and delete all persistent data volumes, use the `--reset` flag.

**Command with Reset:**
```bash
./stop.sh --reset
```

**Command:**
```bash
./stop.sh
```

### `restart.sh`
A convenience script that stops and then starts the environment. It passes any arguments directly to `stop.sh`, allowing you to perform a reset.

#### Resetting Data Volumes
To perform a full reset, use the `--reset` flag. This will stop the services, wipe all persistent data volumes, and then start the services again.

**Warning:** This action is irreversible and will delete all local data.

**Command with Reset:**
```bash
./restart.sh --reset
```
You will be asked for confirmation before any data is deleted.

**Command:**
```bash
./restart.sh
```

## One-Time ScriptRunner Configuration

After starting the Confluence instance for the first time, you must manually configure the database connection pool within ScriptRunner. This is a **one-time setup** as the configuration is persisted in the `confluence_data` volume.

Our application code uses this shared connection pool to interact with the database.

1. **Navigate to ScriptRunner Resources**:
    * Go to Confluence Administration > **ScriptRunner** > **Resources**.

2. **Add a New Resource**:
    * Click on **Add a new resource** and select **Database Connection**.

3. **Fill in the Configuration Details**:
    * **Pool Name**: `umig_db_pool`
        * **Important**: This name must be exact, as it is hardcoded in the application's `DatabaseUtil.groovy`.
    * **Driver**: `org.postgresql.Driver`
    * **JDBC URL**: `jdbc:postgresql://umig_postgres:5432/umig_app_db`
        * **Note**: We use the container name `umig_postgres` for the host, not `localhost`.
    * **User**: `umig_app_user` (or the value of `UMIG_DB_USER` in your `.env` file)
    * **Password**: `123456` (or the value of `UMIG_DB_PASSWORD` in your `.env` file)
    * **JNDI Name**: Leave this field blank.

4. **Save the Resource**:
    * Click **Add** to save the configuration.

Once this is done, ScriptRunner will be able to obtain a database connection and all API endpoints will function correctly.

## Database Migrations (Liquibase)

To ensure consistency and clarity in our database migration process, we follow a set of conventions for writing Liquibase changesets.

### Changeset Naming Convention

Every changeset must follow a strict naming format to clearly identify its author and purpose.

**Format:**

```
--changeset <author>:<id> context:<context>
```

* **`author`**: Your Git username (e.g., `lucas.challamel`). This tracks who created the change.
* **`id`**: The name of the SQL file containing the changeset, without the extension (e.g., `001_unified_baseline`). This provides a unique, descriptive identifier.
* **`context`**: The context in which the changeset should run (e.g., `all`, `dev`, `prod`).

**Example:**

```sql
--changeset lucas.challamel:001_unified_baseline context:all
```

### Using Tags and Labels

Liquibase offers powerful features like tags and labels to manage database versions and conditional deployments.

* **Tags**: We use tags to create a "snapshot" of the database schema at a specific release point. This is invaluable for rollbacks and version tracking. We will use semantic versioning for our tags (e.g., `v1.0.0`).
  * **Command**: `liquibase tag v1.0.0`

* **Labels**: Labels allow us to conditionally execute changesets. This is useful for environment-specific data or feature flags. We will adopt labels as needed, with some predefined examples:
  * `data-seed`: For populating test data. Should not be run in production.
  * `experimental`: For changes related to features that are not yet stable.

By adhering to these conventions, we maintain a clean, understandable, and robust database migration history.

### First-Time Confluence Setup

When you start the environment for the first time, you will need to configure Confluence to connect to the PostgreSQL database. You will be guided through a setup wizard in your browser at [http://localhost:8090](http://localhost:8090).

When you reach the "Set up your database" screen, you must use the following settings:

- **Database Type**: `PostgreSQL`
- **Setup Type**: `Simple`
- **Hostname**: `postgres`
- **Port**: `5432`
- **Database Name**: `umig_app_db`
- **Username**: `umig_user` (or the value of `POSTGRES_USER` in your `.env` file)
- **Password**: The password you set for `POSTGRES_PASSWORD` in your `.env` file (defaults to `changeme`).

**Important**: You must use `postgres` as the hostname, not `localhost`. This is because Confluence is running in its own container and needs to connect to the `postgres` container over the shared container network. `localhost` inside the Confluence container refers only to itself.

### ScriptRunner Database Connection Setup

After completing the initial Confluence setup, you must configure a database connection pool within ScriptRunner itself. This is what allows the custom API endpoints (Groovy scripts) to connect to the database.

1.  **Log into Confluence** as an administrator.
2.  Go to **General Configuration** > **ScriptRunner** (under "Add-ons" in the left sidebar).
3.  Click on the **Resources** tab.
4.  Click **Add New Item** and select **Database Connection Pool**.
5.  Fill out the form with the following details:
    *   **Pool Name:** `umig_db_pool` (This exact name is referenced by the `DatabaseUtil` in the project's Groovy code).
    *   **JNDI Name:** `jdbc/umig_db` (This provides a unique JNDI name for the connection).
    *   **Driver Class Name:** `org.postgresql.Driver`
    *   **Database URL:** `jdbc:postgresql://postgres:5432/umig_app_db`
    *   **Username:** The value of `POSTGRES_USER` from your `.env` file (e.g., `umig_user`).
    *   **Password:** The value of `POSTGRES_PASSWORD` from your `.env` file.
    *   **Validation Query:** `SELECT 1`
6.  Click **Add**.

## Services

* **Confluence:** [http://localhost:8090](http://localhost:8090)
* **PostgreSQL:** `localhost:5432`
* **MailHog (SMTP Mock):** [http://localhost:8025](http://localhost:8025) (SMTP server is at `localhost:1025`)
