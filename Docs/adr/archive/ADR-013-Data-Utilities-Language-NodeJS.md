# ADR-013: Adopt Node.js for Data Import and Synthetic Data Generation Utilities

* **Status:** Proposed
* **Date:** 2025-06-20
* **Deciders:** UMIG Core Development Team
* **Technical Story:** N/A (MVP infrastructure and developer tooling)

## Context and Problem Statement

UMIG requires utilities for mass data import (from CSV) and synthetic test data generation to populate the PostgreSQL database. While Python is a popular choice for such tooling, it is not otherwise used in the project. The core stack is Vanilla JS (frontend), Groovy (ScriptRunner backend), and PostgreSQL. Maintaining a minimal, unified technology stack is a project priority ([DM], [SF]).

## Decision Drivers

* Minimize language and dependency sprawl ([DM])
* Maintainability and onboarding simplicity ([RP], [CA])
* Leverage existing team skills in JavaScript
* Sufficient ecosystem support in Node.js for Faker, PostgreSQL, CLI, and CSV parsing
* Avoid introducing Python runtime/dependencies unless absolutely necessary

## Considered Options

* **Option 1: Use Python for data utilities**
  * Description: Implement data import and generation scripts in Python, leveraging libraries like `faker` and `psycopg2`.
  * Pros: Python is highly capable for data wrangling and scripting; excellent libraries for CSV and fake data.
  * Cons: Introduces a new language and runtime; increases maintenance and onboarding complexity; not used elsewhere in the project.

* **Option 2: Use Node.js for data utilities**
  * Description: Implement all data import and generation scripts in Node.js, using `@faker-js/faker`, `pg`, and other JS libraries.
  * Pros: Keeps stack unified; leverages existing JS skills; no new runtime; sufficient library support; easier CI/CD integration.
  * Cons: Slightly less powerful for complex data wrangling than Python, but fully sufficient for project needs.

## Decision Outcome

Chosen option: **"Use Node.js for data utilities"**, because it maintains a unified stack, reduces maintenance and onboarding complexity, and leverages the team's existing JavaScript skills. Node.js provides sufficient library support for our required functionality, and avoids introducing a new runtime or dependency burden.

### Positive Consequences

* Unified technology stack ([DM], [SF])
* Lower maintenance and onboarding cost ([RP], [CA])
* Leverages team skills
* No need for Python runtime or dependencies

### Negative Consequences (if any)

* Slightly less powerful for advanced data wrangling than Python
* May require more effort for very complex data transformation (not anticipated for MVP)

## Validation

* Utilities are implemented in Node.js
* Team is able to use, maintain, and extend them without friction
* No additional runtime or dependency issues are introduced

## Pros and Cons of the Options

### Python
* Pros:
  * Best-in-class for data wrangling
  * Mature libraries for CSV, Faker, database
* Cons:
  * Introduces new language/runtime
  * Increased maintenance/onboarding complexity

### Node.js
* Pros:
  * Unified stack
  * Leverages existing skills
  * Sufficient library support
* Cons:
  * Slightly less powerful for advanced data wrangling

## Links
* [UMIG README.md]
* [docs/dataModel/README.md]
* [ADR-001, ADR-004]

## Amendment History
* 2025-06-20: Initial creation
