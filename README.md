# UMIG - UBP Migration Plans

UMIG is a collaborative platform designed to streamline the creation, management, and sharing of "UBP Migration Plans" within the enterprise. It is built as a **Confluence-Integrated Application**, leveraging Atlassian Confluence for its user interface and backend services via Atlassian ScriptRunner.

## Key Features (Planned)

*   Creation and management of structured migration plans composed of steps and tasks.
*   Collaborative editing and versioning within Confluence.
*   Generation of shareable migration plans.
*   Integration with enterprise authentication (Active Directory) and email notifications (Exchange).

## Technology Stack

*   **Host Platform:** Atlassian Confluence
*   **Frontend:** Custom Confluence Macro (HTML, CSS, Vanilla JavaScript ES6+)
*   **Backend:** Atlassian ScriptRunner (Groovy) exposing REST APIs
*   **Database:** PostgreSQL
*   **Version Control:** Git

## Project Documentation

*   **Architectural Decision Records (ADRs):** `docs/adr/`
*   **API Documentation:**
    *   **OpenAPI (Swagger) Spec:** [`docs/api/openapi.yaml`](docs/api/openapi.yaml)
    *   **Postman Test Collection:** [`docs/api/postman/README.md`](docs/api/postman/README.md)
*   **Data Model Documentation:** [`docs/dataModel/README.md`](docs/dataModel/README.md)
*   **Groovy/ScriptRunner Conventions:** [`src/groovy/README.md`](src/groovy/README.md)
*   **Supporting Project Documents:** `cline-docs/`

## Local Development Setup

The local development environment is managed using Podman Compose and a set of helper scripts. It includes containers for Confluence, PostgreSQL, and MailHog, with automated database migrations handled by Liquibase.

### Prerequisites

*   **Podman & Podman Compose**: Follow the official installation guide for your OS.
*   **Liquibase CLI**: Required for database migrations. See `local-dev-setup/README.md` for detailed installation instructions.

### First-Time Setup

1.  **Navigate to the setup directory**:
    ```sh
    cd local-dev-setup
    ```

2.  **Create the environment configuration file**:
    Copy the example `.env.example` file to `.env` and update the values as needed. You must provide a valid Confluence developer license key.
    ```sh
    cp .env.example .env
    ```

### Running the Environment

*   **To start the entire environment**:
    From the `local-dev-setup` directory, run the start script:
    ```sh
    ./start.sh
    ```
    This script will:
    1.  Start the PostgreSQL container.
    2.  Wait for the database to be ready.
    3.  Run database migrations using the local Liquibase CLI.
    4.  Start the Confluence and MailHog containers.

*   **To stop the environment**:
    ```sh
    ./stop.sh
    ```

### Accessing Services

Once the environment is running, you can access the services at the following URLs:

*   **Confluence**: [http://localhost:8090](http://localhost:8090)
*   **MailHog UI**: [http://localhost:8025](http://localhost:8025)
