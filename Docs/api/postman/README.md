# Postman API Collection for UMIG

This directory contains the Postman collection for testing the UMIG application's REST APIs.

## How to Use

1.  **Import the Collection**: 
    *   Open Postman.
    *   Click on `File` > `Import...`.
    *   Select the `UMIG_API_Collection.postman_collection.json` file from this directory.

2.  **Configure Environment Variables**:
    This collection uses variables for authentication and the base URL to make it easy to switch between environments.

    *   Click the 'eye' icon in the top right of Postman to manage your environment variables.
    *   Create a new environment (e.g., "UMIG Local Dev").
    *   Add the following variables:
        *   `baseUrl`: The base URL for the API. For local development, this is `http://localhost:8090/rest/scriptrunner/latest/custom`.
        *   `username`: Your Confluence username (e.g., `admin`).
        *   `password`: Your Confluence password (e.g., `admin`).
    *   `teamId`: (Optional) Pre-filled with `1`. Used as a default ID for team-specific requests.
    *   `personId`: (Optional) Pre-filled with `1`. Used as a default ID for person-specific requests.
    *   `planId`: (Optional) Pre-filled with `1`. Used as a default ID for plan-specific requests.

3.  **Run the Requests**:
    *   Make sure you have selected your new environment from the dropdown in the top right.
    *   You can now run any of the requests in the collection.

## Keeping the Collection Updated

If you make changes to the API tests:

1.  Right-click on the collection in Postman.
2.  Select `Export`.
3.  Choose the `Collection v2.1` format.
4.  Overwrite the existing `UMIG_API_Collection.postman_collection.json` file.
5.  Commit the changes to Git.