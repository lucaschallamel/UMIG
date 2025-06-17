# UMIG Local Development Environment Setup

This directory contains all the necessary files to run a complete local development environment for the UMIG project using Podman and Ansible.

## Prerequisites

You must have Ansible, Podman, and `podman-compose` installed on your local machine. Follow the instructions for your operating system below.

### macOS (Recommended: Homebrew)

1.  **Install Core Tools (Podman & Ansible):**
    ```bash
    brew install ansible podman
    ```
2.  **Install Podman Compose:**
    ```bash
    pip3 install podman-compose
    # Or, if you prefer pipx (recommended for CLI tools):
    # pipx install podman-compose
    ```
    *Note: Ensure `pip3` or `pipx` is installed and configured correctly on your system.*

3.  **Initialize and Start Podman Machine:**
    Podman on macOS runs a lightweight Linux VM. Initialize and start it:
    ```bash
    podman machine init
    podman machine start
    ```
    *You may need to run `podman machine start` each time you reboot your Mac or want to use Podman.*

### Linux (Example: Debian/Ubuntu)

1.  **Install Core Tools (Podman & Ansible):**
    ```bash
    sudo apt update
    sudo apt install -y ansible podman
    ```
2.  **Install Podman Compose:**
    ```bash
    # Using pip is generally the most straightforward way
    sudo pip3 install podman-compose
    # Or, if you prefer pipx:
    # sudo pip3 install pipx
    # pipx install podman-compose
    ```

### Linux (Example: Fedora/RHEL-based)

1.  **Install Core Tools (Podman & Ansible):**
    ```bash
    sudo dnf install -y ansible podman
    ```
2.  **Install Podman Compose:**
    ```bash
    # Using pip is generally the most straightforward way
    sudo pip3 install podman-compose
    # Or, if you prefer pipx:
    # sudo pip3 install pipx
    # pipx install podman-compose
    ```

### Windows (Recommended: WSL2)

Setting up Ansible and Podman directly on Windows can be complex. The recommended approach is to use Windows Subsystem for Linux (WSL2).

1.  **Install WSL2:** Follow Microsoft's official documentation to install WSL2 and a Linux distribution (e.g., Ubuntu).
2.  **Inside your WSL2 Linux distribution:** Follow the Linux installation instructions above for Ansible, Podman, and `podman-compose`.

Once the prerequisites are installed, proceed to the setup instructions below.

## Initial Setup and Starting the Environment

1.  **Navigate to this Directory:**
    Open your terminal and change to the `local-dev-setup` directory:
    ```bash
    cd path/to/UMIG/local-dev-setup
    ```

2.  **Run the Ansible Playbook:**
    This playbook automates the environment setup, including building the custom Confluence image (if not already built) and starting all services (Confluence, PostgreSQL, MailHog).
    ```bash
    ansible-playbook setup.yml
    ```
    The first run might take some time as it downloads the base Confluence image and builds the custom UMIG image.

3.  **Access Confluence:**
    Once the playbook completes, Confluence will be available at [http://localhost:8090](http://localhost:8090).
    Follow the Confluence setup wizard. You can use a free developer license or an evaluation license.

4.  **Manually Install ScriptRunner for Confluence:**
    As per `ADR-007`, ScriptRunner installation is now a manual process for stability.
    *   In your browser, navigate to the Confluence administration section (usually Cog Icon > Manage apps or Add-ons).
    *   Go to "Find new apps" or "Marketplace".
    *   Search for "ScriptRunner for Confluence".
    *   Install the latest compatible version for Confluence `7.19.8` (or the version specified in the `Containerfile`).
    *   This is a one-time setup step for your local environment.

5.  **Verify Setup:**
    *   Ensure the **SCRIPTRUNNER** section appears in the Confluence administration sidebar.
    *   Check that the `src` directory from the root of the UMIG project is correctly mounted into the Confluence container (for live development of Groovy scripts and frontend assets).

Your local development environment is now ready!

## Daily Workflow

*   **To start the environment (if stopped):**
    ```bash
    cd path/to/UMIG/local-dev-setup
    podman-compose up -d
    ```
    *(Ensure your Podman machine is running on macOS: `podman machine start`)*

*   **To stop the environment:**
    ```bash
    cd path/to/UMIG/local-dev-setup
    podman-compose down
    ```

## Troubleshooting

### ScriptRunner Plugin Not Loading on macOS

If you have followed all the steps and the **SCRIPTRUNNER** section does not appear in the Confluence administration area, you may be running into one of two common issues on macOS:

1.  **File Quarantine:** When you download the ScriptRunner `.jar` file, macOS may attach a `com.apple.quarantine` attribute to it, which can prevent Podman from accessing it during the image build. 

    *   **Symptom:** The build process completes without error, but ScriptRunner is not installed.
    *   **Solution:** Remove the attribute by running the following command from the `local-dev-setup/confluence` directory:
        ```bash
        xattr -d com.apple.quarantine groovyrunner-*.jar
        ```

2.  **Build Cache:** Podman may aggressively cache layers. If a build fails or is interrupted, a corrupted or incomplete image layer might be cached and reused on subsequent builds, even if the `Containerfile` is fixed.

    *   **Symptom:** Changes to the `Containerfile` do not seem to take effect on rebuilds.
    *   **Solution:** The Ansible playbook now includes the `--no-cache` flag to prevent this. If you are building manually, you can force a clean build by running:
        ```bash
        podman-compose up -d --build --no-cache
        ```

machine init
    podman machine start
    ```

### Windows (via WSL2)

Podman and Ansible run inside the Windows Subsystem for Linux (WSL2).

1.  **Install WSL2:** Follow the official Microsoft documentation to install WSL2 and a Linux distribution (e.g., Ubuntu).
2.  **Install Tools within WSL2:** Open your WSL2 terminal and run:
    ```bash
    # Update package lists
    sudo apt update

    # Install Ansible and Podman
    sudo apt install -y ansible podman

    # Install pip and podman-compose
    sudo apt install -y python3-pip
    pip3 install podman-compose
    ```

### Linux (Debian/Ubuntu based)

1.  **Install Tools:**
    ```bash
    # Update package lists
    sudo apt update

    # Install Ansible and Podman
    sudo apt install -y ansible podman

    # Install pip and podman-compose
    sudo apt install -y python3-pip
    pip3 install podman-compose
    ```

## One-Time Setup

1.  **Create `.env` file:**
    *   Copy the `.env.example` file in this directory to a new file named `.env`.
    *   `cp .env.example .env`
    *   Edit the `.env` file and fill in the required values, especially `POSTGRES_PASSWORD`.

2.  **Download ScriptRunner:**
    *   Follow the instructions in the `confluence/README.md` to download the ScriptRunner for Confluence `.jar` file and place it in the `confluence/` directory.

## Running the Environment

Once the one-time setup is complete, you can use the Ansible playbook to manage the environment.

*   **To start the environment:**
    ```bash
    ansible-playbook setup.yml

### 4. Install ScriptRunner

Once the Confluence container is running and you have completed the initial setup wizard, you must manually install ScriptRunner:

1.  Navigate to `http://localhost:8090` and log in as an administrator.
2.  Click the **cog icon** in the top-right corner and select **Manage apps**.
3.  In the left sidebar, click **Find new apps**.
4.  Search for "ScriptRunner for Confluence".
5.  Click **Install** and follow the prompts. This will install the correct, compatible version for the running Confluence instance.

### 5. Validate the Development Workflow

To ensure both backend and frontend live-reloading is working, you can create two test items.

#### a. Backend Groovy Script

1.  Create a new file: `src/groovy/HelloWorld.groovy`
2.  Add the following content:
    ```groovy
    // src/groovy/HelloWorld.groovy
    return "Hello, World! The developer workflow is working."
    ```
3.  In Confluence, navigate to **ScriptRunner > Script Console**.
4.  Select the `File` tab and choose `HelloWorld.groovy`.
5.  Click **Run**. You should see the "Hello, World!" message as the result.

#### b. Frontend User Macro

1.  The example files `src/js/hello-world.js` and `src/css/hello-world.css` have been committed to the repository.
2.  In Confluence, navigate to **ScriptRunner > User Macros** and click **Create User Macro**.
3.  Fill in the details:
    *   **Macro Name:** `UMIG Hello World`
    *   **Macro Key:** `umig-hello-world`
    *   **Macro Body Processing:** `No macro body`
    *   **Template:** Paste the code below.
4.  Add the macro to any Confluence page by typing `/umig` and selecting it.

**Macro Template Code:**

```groovy
// This macro reads JS and CSS files from the mounted 'src' directory
// and injects them into the page to test the live-reload workflow.

import com.opensymphony.xwork.ActionContext

// The path to the mounted source code directory inside the container
def baseDir = new File("/var/atlassian/application-data/confluence/scripts")

// Read the contents of the CSS and JS files using the compatible getText() method
def cssContent = new File(baseDir, "css/hello-world.css").getText("UTF-8")
def jsContent = new File(baseDir, "js/hello-world.js").getText("UTF-8")

// Return the HTML to be injected into the page
return """
<style>
${cssContent}
</style>

<div class="umig-hello-world">
    <!-- This content will be replaced by JavaScript -->
    Loading...
</div>

<script>
${jsContent}
</script>
"""
```
    ```
    This command will check for prerequisites, build the custom Confluence image (if it's the first time), and start all the services.

*   **To stop the environment:**
    ```bash
    podman-compose down
    ```
    (We can add a `teardown.yml` playbook for this later).

## Services

*   **Confluence:** [http://localhost:8090](http://localhost:8090)
*   **PostgreSQL:** `localhost:5432`
*   **MailHog (SMTP Mock):** [http://localhost:8025](http://localhost:8025) (SMTP server is at `localhost:1025`)