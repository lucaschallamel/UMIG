# UMIG Local Development Environment Setup

This directory contains a unified Node.js application to run and manage a
complete local development environment for the UMIG project using Podman and
Ansible.

## Prerequisites

You must have **Node.js (v18+), npm, Podman, and Ansible** installed on your
local machine. Liquibase CLI is no longer a direct prerequisite as it is managed
by the orchestration layer.

### Liquibase CLI Installation

Install the Liquibase command-line interface (CLI). **\*General Steps**: 1.
Download the Liquibase installation files (typically a ZIP archive) from the
[official Liquibase website](https://www.liquibase.com/download). 2. Extract the
archive to a directory on your local system (e.g., `~/liquibase` on macOS/Linux,
`C:\liquibase` on Windows). 3. Add the directory where you extracted Liquibase
to your system's PATH environment variable. This allows you to run the
`liquibase` command from any terminal window. \* **macOS Specific**:
**\*Recommended (Homebrew)**: `brew install liquibase` \* **Manual**: Follow the
general steps above. You might add something like
`export PATH=~/liquibase:$PATH` to your shell profile (e.g., `~/.zshrc`,
`~/.bash_profile`). **\*Linux Specific**: \* **Manual**: Follow the general
steps above. You might add something like `export PATH=/opt/liquibase:$PATH` (if
you extracted it to `/opt/liquibase`) to your shell profile (e.g., `~/.bashrc`,
`~/.zshrc`). Ensure the `liquibase` script is executable (`chmod +x liquibase`).
**\*Windows Specific**: \* **Manual**: Follow the general steps above. To add
Liquibase to your PATH: 1. In the Windows Start Menu Search, type `env` and
select "Edit the system environment variables". 2. In the System Properties
window, click the "Environment Variables..." button. 3. Under "System variables"
(or "User variables" for just your account), find the variable named `Path` and
select it. 4. Click "Edit..." and then "New", and add the full path to your
Liquibase directory (e.g., `C:\liquibase`).

### Ansible Installation

Install Ansible. **\*macOS Specific**: \* **Recommended (Homebrew)**:
`brew install ansible` **\*Linux Specific**: \* **Recommended (pip)**:
`python3 -m pip install --user ansible` **\*Windows Specific**: \* **Recommended
(WSL)**: Install Ansible inside the Windows Subsystem for Linux (WSL).

### Podman & Podman-Compose Installation

Install Podman and `podman-compose`. **\*macOS Specific**: \* **Recommended
(Homebrew)**:
`bash             brew install podman             brew install podman-compose             `
**\*Linux Specific**: \* Follow the official installation instructions for your
distribution. **\*Windows Specific**: \* Follow the official installation
instructions.

## Usage

This setup is managed entirely through `npm` scripts defined in `package.json`.
All commands should be run from the `local-dev-setup` directory.

**First-Time Setup:**

```bash
npm install
```

### Environment Management

- **Start Environment:**

  ```bash
  npm start
  ```

- **Stop Environment:**

  ```bash
  npm stop
  ```

- **Restart Environment:**
  ```bash
  npm run restart
  ```

### Data & Volume Management (Erase/Reset)

The `stop` and `restart` commands accept flags to erase persistent data volumes,
which is useful for starting with a clean slate. You can erase all data or
target specific volumes.

- **Restart and Erase Everything:**

  ```bash
  npm run restart:erase
  ```

- **Restart and Erase Only UMIG DB:**

  ```bash
  npm run restart:erase:umig
  ```

- **Stop and Erase Everything:**
  ```bash
  npm run stop:erase
  ```

### Data Generation & Utilities

- **Generate All Fake Data (with reset):**

  ```bash
  npm run generate-data:erase
  ```

- **Generate Fake Data (without reset):**

  ```bash
  npm run generate-data
  ```

- **Generate Single Generator:**
  ```bash
  npm run generate -- --script=<generator-number>
  # Example: Run only the instance data generator
  npm run generate -- --script=099
  # Alternative syntax using numerical flag
  npm run generate -- --099
  ```

#### Data Generation Pipeline Order

Generators execute in numerical order, respecting dependencies:

1. `001_generate_core_metadata.js` - Core lookup tables and roles
2. `002_generate_teams_apps.js` - Teams and applications
3. `003_generate_users.js` - Users and team assignments
4. `004_generate_canonical_plans.js` - Master plan hierarchy (plans, sequences,
   phases, steps)
5. `005_generate_migrations.js` - Migrations and iterations
6. `006_generate_environments.js` - Environments with iteration type rules:
   - Every iteration gets all 3 roles (PROD, TEST, BACKUP)
   - RUN/DR iterations: Never use PROD environment, only EV1-EV5
   - CUTOVER iterations: Always assign PROD environment to PROD role
7. `007_generate_controls.js` - Master controls
8. `008_generate_labels.js` - Labels with uniqueness per migration
9. `009_generate_step_pilot_comments.js` - Pilot comments for steps
10. `098_generate_instructions.js` - Master instructions for steps
11. `099_generate_instance_data.js` - All instance records (plans, sequences,
    phases, steps, instructions, controls)
12. `100_generate_step_instance_comments.js` - Comments for step instances

**Important**: The generator order is critical - master data (templates) must
exist before creating instance data.

#### Master-Instance Data Pattern

UMIG follows a canonical-instance pattern for data:

- **Master Records** (e.g., `plans_master_plm`) are templates/blueprints that
  define the standard migration process.
- **Instance Records** (e.g., `plans_instance_pli`) are execution-specific
  copies of master records, linked to iterations.
- Instance records inherit all fields from master records by default.
- Any field in an instance can be overridden to customize a specific execution.
- This pattern enables continuous process improvement without compromising the
  canonical templates.

- **Test Single Generator:**

  ```bash
  npm test -- __tests__/generators/<test-file-name>.test.js
  # Example: Test only the instance data generator
  npm test -- __tests__/generators/099_generate_instance_data.test.js
  # Or use a pattern match
  npm test -- 099
  ```

- **Run CSV Importer:**
  ```bash
  npm run import-csv -- --file path/to/your/file.csv
  ```

### Testing

- **Run All Tests:**
  ```bash
  npm test
  ```

### Code Quality & Linting

- **Run MegaLinter (Code Quality Analysis):**

  ```bash
  # From the project root directory (not local-dev-setup)
  cd ..
  podman run --rm \
    -v $(pwd):/tmp/lint:rw,Z \
    oxsecurity/megalinter:v8
  ```

  **Note**: MegaLinter must be run from the project root directory where the
  `.mega-linter.yml` configuration file is located. It will analyze the entire
  codebase for code quality, formatting, and best practices across multiple
  languages including:
  - Groovy/Java code
  - JavaScript files
  - SQL scripts
  - Markdown documentation
  - YAML/JSON configuration files
  - Dockerfile and container configurations

  Results are generated in the `megalinter-reports/` directory with detailed
  reports and suggestions for code improvements.

- **Run Semgrep Security Scan:**

  ```bash
  # From the project root directory (not local-dev-setup)
  cd ..
  podman run --rm \
  -v $(pwd):/src:rw,Z \
  semgrep/semgrep:latest \
  semgrep --config=auto --output=/src/semgrep-results.json --json /src
  ```

  **Semgrep** performs static analysis security scanning to identify potential
  security vulnerabilities, bugs, and anti-patterns in the codebase. The scan
  results will be saved to `semgrep-results.json` in the project root.

## One-Time ScriptRunner Configuration

After starting the Confluence instance for the first time, you must manually
configure the database connection pool within ScriptRunner. This is a **one-time
setup** as the configuration is persisted in the `confluence_data` volume.

Our application code uses this shared connection pool to interact with the
database.

1. **Navigate to ScriptRunner Resources**:
   - Go to Confluence Administration > **ScriptRunner** > **Resources**.

2. **Add a New Resource**:
   - Click on **Add a new resource** and select **Database Connection**.

3. **Fill in the Configuration Details**:
   - **Pool Name**: `umig_db_pool`
     - **Important**: This name must be exact, as it is hardcoded in the
       application's `DatabaseUtil.groovy`.
   - **Driver**: `org.postgresql.Driver`
   - **JDBC URL**: `jdbc:postgresql://umig_postgres:5432/umig_app_db`
     - **Note**: We use the container name `umig_postgres` for the host, not
       `localhost`.
   - **User**: `umig_app_user` (or the value of `UMIG_DB_USER` in your `.env`
     file)
   - **Password**: `123456` (or the value of `UMIG_DB_PASSWORD` in your `.env`
     file)
   - **JNDI Name**: Leave this field blank.

4. **Save the Resource**:
   - Click **Add** to save the configuration.

Once this is done, ScriptRunner will be able to obtain a database connection and
all API endpoints will function correctly.

## Database Migrations (Liquibase)

To ensure consistency and clarity in our database migration process, we follow a
set of conventions for writing Liquibase changesets.

### Changeset Naming Convention

Every changeset must follow a strict naming format to clearly identify its
author and purpose.

**Format:**

```
--changeset <author>:<id> context:<context>
```

- **`author`**: Your Git username (e.g., `lucas.challamel`). This tracks who
  created the change.
- **`id`**: The name of the SQL file containing the changeset, without the
  extension (e.g., `001_unified_baseline`). This provides a unique, descriptive
  identifier.
- **`context`**: The context in which the changeset should run (e.g., `all`,
  `dev`, `prod`).

**Example:**

```sql
--changeset lucas.challamel:001_unified_baseline context:all
```

### Using Tags and Labels

Liquibase offers powerful features like tags and labels to manage database
versions and conditional deployments.

- **Tags**: We use tags to create a "snapshot" of the database schema at a
  specific release point. This is invaluable for rollbacks and version tracking.
  We will use semantic versioning for our tags (e.g., `v1.0.0`).
  - **Command**: `liquibase tag v1.0.0`

- **Labels**: Labels allow us to conditionally execute changesets. This is
  useful for environment-specific data or feature flags. We will adopt labels as
  needed, with some predefined examples:
  - `data-seed`: For populating test data. Should not be run in production.
  - `experimental`: For changes related to features that are not yet stable.

By adhering to these conventions, we maintain a clean, understandable, and
robust database migration history.

### First-Time Confluence Setup

When you start the environment for the first time, you will need to configure
Confluence to connect to the PostgreSQL database. You will be guided through a
setup wizard in your browser at [http://localhost:8090](http://localhost:8090).

When you reach the "Set up your database" screen, you must use the following
settings:

- **Database Type**: `PostgreSQL`
- **Setup Type**: `Simple`
- **Hostname**: `postgres`
- **Port**: `5432`
- **Database Name**: `umig_app_db`
- **Username**: `umig_user` (or the value of `POSTGRES_USER` in your `.env`
  file)
- **Password**: The password you set for `POSTGRES_PASSWORD` in your `.env` file
  (defaults to `changeme`).

**Important**: You must use `postgres` as the hostname, not `localhost`. This is
because Confluence is running in its own container and needs to connect to the
`postgres` container over the shared container network. `localhost` inside the
Confluence container refers only to itself.

### ScriptRunner Database Connection Setup

After completing the initial Confluence setup, you must configure a database
connection pool within ScriptRunner itself. This is what allows the custom API
endpoints (Groovy scripts) to connect to the database.

1. **Log into Confluence** as an administrator.
2. Go to **General Configuration** > **ScriptRunner** (under "Add-ons" in the
   left sidebar).
3. Click on the **Resources** tab.
4. Click **Add New Item** and select **Database Connection Pool**.
5. Fill out the form with the following details:
   - **Pool Name:** `umig_db_pool` (This exact name is referenced by the
     `DatabaseUtil` in the project's Groovy code).
   - **JNDI Name:** `jdbc/umig_db` (This provides a unique JNDI name for the
     connection).
   - **Driver Class Name:** `org.postgresql.Driver`
   - **Database URL:** `jdbc:postgresql://postgres:5432/umig_app_db`
   - **Username:** The value of `POSTGRES_USER` from your `.env` file (e.g.,
     `umig_user`).
   - **Password:** The value of `POSTGRES_PASSWORD` from your `.env` file.
   - **Validation Query:** `SELECT 1`
6. Click **Add**.

### Mail Server Configuration for Email Notifications

After completing the initial Confluence setup, you must configure the mail
server to enable email notifications from UMIG. This is required for the
EmailService to send notifications for step status changes, instruction
completions, and other workflow events.

1. **Access Mail Server Settings**:
   - Log into Confluence as an administrator
   - Go to **⚙️ Settings** (gear icon) → **General Configuration**
   - In the left sidebar, find **Mail** → **Mail Servers**

2. **Configure SMTP Server for Local Development**:
   - Click **Add SMTP Mail Server**
   - Fill out the form with the following details:
     - **Name:** `MailHog Local Development`
     - **From Address:** `umig-system@localhost`
     - **Subject Prefix:** `[UMIG-Dev]` (optional, helps identify development
       emails)
     - **Hostname:** `umig_mailhog` (**Important**: Use the container name, not
       `localhost`)
     - **Port:** `1025`
     - **Username:** (leave blank)
     - **Password:** (leave blank)
     - **Use TLS:** No
     - **Protocol:** SMTP

3. **Test the Configuration**:
   - After saving, click **Send Test Email**
   - Enter your email address
   - Check MailHog at [http://localhost:8025](http://localhost:8025) to see if
     the test email arrived

4. **Environment Variable for Development Mode** (Optional):
   - To enable development-specific email handling in the EmailService, you can
     add the following to the `CATALINA_OPTS` in the `podman-compose.yml` file:

   ```yaml
   - CATALINA_OPTS=-Dplugin.script.roots=/var/atlassian/application-data/confluence/scripts
     -Dplugin.rest.scripts.package=umig.api.v2,umig.api.v2.web
     -Dumig.environment=development
   ```

   - This tells the EmailService to use development-specific logging and
     fallback behavior

**Important Notes**:

- The mail server configuration is persisted in the `confluence_data` volume, so
  this is a one-time setup
- All emails sent in the local development environment will be captured by
  MailHog and viewable at [http://localhost:8025](http://localhost:8025)
- No actual emails will be sent to real email addresses in this configuration
- The EmailService will automatically use this configured mail server for all
  notifications

## Services

- **Confluence:** [http://localhost:8090](http://localhost:8090)
- **PostgreSQL:** `localhost:5432`
- **MailHog (SMTP Mock):** [http://localhost:8025](http://localhost:8025) (SMTP
  server is at `localhost:1025`)
