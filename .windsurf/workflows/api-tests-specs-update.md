---
description: The definitive workflow for safely updating API specifications and generating Postman tests to ensure 100% consistency and prevent data loss.
---

# Workflow: API Spec & Test Generation

This workflow establishes `openapi.yaml` as the single source of truth for all API development. The Postman collection is **always generated** from this file. **NEVER edit the Postman JSON file directly.** This prevents inconsistencies and the kind of file corruption we have experienced.

## Guiding Principles
- **OpenAPI is the ONLY Source of Truth:** All API changes begin and end with `docs/api/openapi.yaml`.
- **Postman is a GENERATED ARTIFACT:** The collection file is treated as build output. It is never edited by hand.
- **Validate Before Generating:** Always validate the OpenAPI spec *before* attempting to generate the Postman collection.

## Steps

### 1. Update the OpenAPI Specification (`docs/api/openapi.yaml`)
- **Identify API Changes:** Review the Groovy source code (e.g., `src/com/umig/api/v2/*.groovy`) to identify any new, modified, or removed endpoints.
- **Edit the Spec:** Carefully add, modify, or remove the corresponding endpoint definitions under `paths` and schemas under `components/schemas`.
  - **Best Practice:** Use `allOf` to extend existing schemas non-destructively (e.g., adding audit fields to a base `User` schema).
- **Use an IDE with OpenAPI support** to get real-time linting and validation.

### 2. Validate the OpenAPI Specification
- **CRITICAL:** Before proceeding, validate your `openapi.yaml` file.
- Use your IDE's built-in OpenAPI preview or a dedicated linter.
- **DO NOT proceed if the file has errors.** Fix them first. This is the most important step to prevent downstream issues.

### 3. Generate the Postman Collection
- **Navigate to the correct directory** in your terminal. The command must be run from here:
  ```bash
  cd docs/api/postman
  ```
- **Run the generation command:**
  ```bash
  // turbo
  npx openapi-to-postmanv2 -s ../openapi.yaml -o ./UMIG_API_V2_Collection.postman_collection.json -p -O folderStrategy=Tags
  ```
- **Note on `npx`:** The `npx` command runs the `openapi-to-postmanv2` package without requiring a global installation. If you see `command not found`, ensure you are using `npx`.

### 4. Verify the Changes
- **Review the Diff:** Use `git diff` to review the changes to `UMIG_API_V2_Collection.postman_collection.json`. Confirm that the new endpoint has been added and that no unexpected changes have occurred.
- **Test in Postman:** (Optional but recommended) Import the newly generated collection into Postman and run a few requests against a local dev environment to ensure correctness.

### 5. Document and Commit
- **Commit all changes:** Add the modified `openapi.yaml` and the generated `UMIG_API_V2_Collection.postman_collection.json` to your commit.
- **Update Changelog:** Add an entry to `CHANGELOG.md` detailing the API changes.
- **Update Dev Journal:** Create a developer journal entry summarizing the work done.

---
**Key Principles:**  
- Never erase or overwrite existing tests/specs unless required by an API change.
- Every endpoint in the API must be present and tested in both Postman and OpenAPI.
- Consistency, completeness, and traceability are paramount.

