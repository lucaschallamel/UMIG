# Postman API Collection for UMIG

This directory contains the Postman collection for testing the UMIG application's V2 REST API.

## How to Use

1. **Import the Collection**:
   - Open Postman.
   - Click on `File` > `Import...`.
   - Select the `UMIG_API_V2_Collection.postman_collection.json` file from this directory.

2. **Configure Environment Variables**:
   This collection uses variables for authentication and the base URL to make it easy to switch between environments.
   - Click the 'eye' icon in the top right of Postman to manage your environment variables.
   - Create a new environment (e.g., "UMIG Local Dev").
   - Add the following variables:
     - `baseUrl`: The base URL for the API. For local development, this is `http://localhost:8090/rest/scriptrunner/latest/custom`.
     - `username`: Your Confluence username (e.g., `admin`).
     - `password`: Your Confluence password (e.g., `admin`).
   - The collection is configured to use Basic Auth with these variables.

3. **Run the Requests**:
   - Make sure you have selected your new environment from the dropdown in the top right.
   - You can now run any of the requests in the collection. The requests are organized by tags (Users, Teams, Plans).

## Keeping the Collection Updated

**IMPORTANT**: This Postman collection is automatically generated from the OpenAPI specification file located at `../openapi.yaml`. **Do not edit this collection directly in Postman and export it.** Your changes will be overwritten.

To update the collection after making changes to the OpenAPI specification:

### Method 1: Using npm script (Recommended)

1. **Navigate to the local-dev-setup directory** in your terminal:

   ```bash
   cd local-dev-setup
   ```

2. **Run the enhanced generation script**:

   ```bash
   npm run generate:postman:enhanced
   ```

   This script will:
   - Generate the collection from the OpenAPI spec
   - Add authentication configuration
   - Set up environment variables
   - Enhance with test scripts

### Method 2: Direct command (Basic)

1. **Navigate to the docs/api/postman directory** in your terminal.
2. **Run the following command**:

   ```bash
   npx openapi-to-postmanv2 -s ../openapi.yaml -o ./UMIG_API_V2_Collection.postman_collection.json -p -O folderStrategy=Tags
   ```

3. **Commit the updated collection file** (`UMIG_API_V2_Collection.postman_collection.json`) to Git.

This ensures that the Postman collection always remains a true representation of the API contract.
