# ADR-019: Formal Integration Testing Framework

* **Status:** Accepted
* **Date:** 2025-06-26
* **Deciders:** Lucas Challamel, Cascade
* **Technical Story:** N/A

## Context and Problem Statement

During the development and debugging of the `stepViewApi`, we encountered persistent 500 Internal Server Errors. These errors were not reproducible with unit tests alone because they stemmed from a fundamental mismatch between the application's repository logic and the actual schema of the live PostgreSQL database. Unit tests were passing because they mocked the repository layer, hiding the underlying integration issue.

This highlighted a critical gap in our testing strategy: we lacked an automated way to verify that our application code correctly integrates with its external dependencies, specifically the database.

## Decision Drivers

* **Reliability:** Need to ensure code works against a real database, not just mocks.
* **Maintainability:** A standardized testing approach makes it easier for developers to write and run tests.
* **Developer Confidence:** Developers need to be confident that their changes won't break in the production-like environment.
* **Bug Prevention:** Catch integration issues early in the development cycle, before they reach staging or production.

## Considered Options

* **Option 1: Enhance Unit Tests with an In-Memory Database**
  * Description: Use an in-memory database (like H2) within our existing unit test framework to simulate a real database.
  * Pros: Faster than testing against a full containerized stack, keeps all tests within a single framework.
  * Cons: An in-memory database may not perfectly replicate PostgreSQL's behavior, syntax, or constraints. The setup can be complex, and it still doesn't test against the *actual* development environment.

* **Option 2: Establish a Separate Integration Testing Suite**
  * Description: Create a distinct set of tests in a separate directory (`/tests`) that are designed to run against the live, containerized development environment (Podman + PostgreSQL). These tests would not be part of the standard unit test cycle.
  * Pros: Tests against the exact same environment used for development. Guarantees that code and database schema are in sync. Clear separation of concerns between fast unit tests and slower, more comprehensive integration tests.
  * Cons: Slower to execute. Requires the full development stack to be running.

## Decision Outcome

Chosen option: **"Option 2: Establish a Separate Integration Testing Suite"**, because it provides the highest level of confidence that our application works as expected in a production-like environment. While slower, the reliability and accuracy gains far outweigh the cost of execution time for catching this critical class of bugs.

This led to the creation of:
1. A new root directory: `/tests`.
2. A subdirectory for integration tests: `/tests/integration/`.
3. A standalone Groovy test (`stepViewApiIntegrationTest.groovy`) that connects to the live database.
4. A runner script (`/tests/run-integration-tests.sh`) to simplify execution and manage the classpath.
5. A `README.md` within the `/tests` directory to document the process.

### Positive Consequences

* We can now reliably catch schema-mismatch and other environment-related bugs.
* There is a clear, documented process for writing and running integration tests.
* Increased confidence in the correctness of our backend API endpoints.

### Negative Consequences (if any)

* The integration test suite adds a small maintenance overhead.
* Running these tests requires a fully operational local development environment.
