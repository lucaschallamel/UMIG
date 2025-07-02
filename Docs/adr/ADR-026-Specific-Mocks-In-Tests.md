# ADR-026: Enforcing Specificity in Test Mocks to Prevent Regressions

* **Status:** Accepted
* **Date:** 2025-07-02
* **Deciders:** Lucas Challamel, Cascade
* **Technical Story:** N/A

## Context and Problem Statement

During the development of the user data generator (`03_generate_users.js`), a regression was introduced where an incorrect column name (`usr_rls_id` instead of `rls_id`) was used in a SQL query. The existing Jest test suite failed to detect this error because the mock for the database query was too generic. It checked if the SQL string included a `SELECT` statement but did not validate the specific `JOIN` condition. This allowed the faulty code to pass the tests, leading to a runtime error when the script was executed in a real environment. This incident revealed a critical weakness in our testing strategy: overly broad mocks can create a false sense of security and fail to catch significant bugs.

## Decision Drivers

*   **Reliability:** The test suite must be a trustworthy safety net that reliably catches regressions before they reach production.
*   **Maintainability:** Clear and specific tests make the codebase easier to understand and maintain.
*   **Developer Confidence:** Developers need to be confident that passing tests mean the code is correct.
*   **Preventing Future Regressions:** We need to establish a testing pattern that prevents similar issues from occurring in the future.

## Considered Options

*   **Option 1: Continue with Generic Mocks**
    *   Description: Keep the existing approach of using broad, non-specific matchers in test mocks (e.g., `sql.includes('SELECT ...')`).
    *   Pros:
        *   Faster to write tests initially.
        *   Tests are less brittle and less likely to break from minor, unrelated changes to the query.
    *   Cons:
        *   **Fails to catch critical bugs**, as demonstrated by the recent regression.
        *   Provides a false sense of security.
        *   Reduces the overall value and reliability of the test suite.

*   **Option 2: Enforce High Specificity in Mocks**
    *   Description: Mandate that all mocks for database queries and other external service calls must be highly specific. Mocks should validate the most critical parts of the interaction, such as exact `JOIN` conditions, `WHERE` clauses, or specific parameters. For complex, multi-line SQL statements, regular expressions should be used for reliable matching.
    *   Pros:
        *   **Reliably catches regressions** and bugs in the logic being tested.
        *   Increases confidence in the correctness of the code when tests pass.
        *   Serves as a form of documentation, clearly showing the expected interactions.
        *   Forces developers to be deliberate about the code they are testing.
    *   Cons:
        *   Tests can be more brittle; they may break if the implementation details of a query change, even if the logic is still correct.
        *   Can take slightly longer to write more specific tests.

## Decision Outcome

Chosen option: **"Enforce High Specificity in Mocks"**, because the primary purpose of our unit and integration tests is to ensure correctness and prevent regressions. The recent incident proves that generic mocks are insufficient and dangerous. While specific mocks might be more brittle, this is a worthwhile trade-off for the significant increase in reliability and developer confidence. The brittleness itself is a feature, as it forces a review of the test whenever the underlying query logic changes, ensuring the test and the code remain in sync.

### Positive Consequences

*   The test suite will become a much more reliable indicator of code quality.
*   Fewer regressions will make it into the main branch.
*   Developers will have higher confidence in their changes.
*   Code quality will improve as tests will enforce more precise implementation.

### Negative Consequences (if any)

*   Tests may require updates more frequently when refactoring, but this is considered a necessary part of ensuring test and code alignment.

## Validation

This decision will be considered successful when:
*   The number of regressions related to incorrect query logic decreases.
*   The team consistently applies specific mocking patterns in new tests.
*   Code reviews actively check for and enforce this standard.

## Links

*   [Memory: Enforce Specificity in Test Mocks to Prevent Regressions](f755cd76-730b-4bb9-978c-65617b257368)

## Amendment History

*   2025-07-02: Initial decision.
