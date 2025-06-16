# ADR-004: Frontend Implementation - Vanilla JavaScript in Confluence Macro

*   **Status:** Accepted
*   **Date:** 2025-06-16
*   **Deciders:** UMIG Project Team
*   **Technical Story:** N/A

## Context and Problem Statement

The UMIG application, being a Confluence-Integrated Application (ADR-001), requires a frontend to be rendered within a Confluence macro. A decision is needed on the specific frontend technologies and approach, considering enterprise constraints and development efficiency.

## Decision Drivers

*   **Confluence Macro Compatibility:** Frontend must be renderable and executable within a Confluence macro.
*   **Approved Technologies:** Adherence to the bank's approved technology portfolio (`techContext.md`).
*   **No External Frameworks Constraint:** A specific constraint is "No external libraries like React, Vue, or Angular are permitted. Careful DOM management and state handling in pure JavaScript will be critical" (`techContext.md`).
*   **Interactivity:** The frontend must be interactive, allowing users to create, view, update, and delete guides, steps, and tasks.
*   **API Consumption:** Must be able to make AJAX calls to the ScriptRunner backend (ADR-002).
*   **Maintainability:** The frontend codebase should be as maintainable as possible despite the lack of frameworks.

## Considered Options

*   **Option 1: Vanilla HTML, CSS, JavaScript (ES6+) (Chosen)**
    *   Description: Build the frontend using standard web technologies without any third-party JavaScript frameworks or large libraries. All DOM manipulation, state management, and component logic are handled with pure JavaScript.
    *   Pros: Full compliance with the "no external frameworks" constraint (`techContext.md`). No external dependencies to manage for the core UI logic. Potentially smaller bundle sizes (though application code can grow large).
    *   Cons: Significantly increased development complexity for managing state, routing (if needed), component reusability, and DOM updates. Higher risk of less maintainable code as the application grows. Requires strong discipline and well-defined patterns from the development team.
*   **Option 2: Using a very lightweight, approved utility library (e.g., Lodash, date-fns - if any were permissible)**
    *   Description: Standard HTML/CSS/JS, but allowing for specific, small, approved utility libraries that are not full frameworks but assist with common tasks.
    *   Pros: Could slightly reduce boilerplate for common tasks without introducing a full framework.
    *   Cons: The constraint in `techContext.md` is quite strict ("No external libraries like React, Vue, or Angular"). It's unclear if even utility libraries would be permitted without explicit approval. This option was likely implicitly rejected by the strictness of the constraint.
*   **Option 3: Requesting an Exception for a Specific Frontend Framework**
    *   Description: Formally request an exception to the "no external frameworks" rule to use a modern framework like Vue.js (often considered more lightweight) or React.
    *   Pros: Would significantly improve developer productivity, code organization, state management, and maintainability. Access to a large ecosystem of tools and components.
    *   Cons: Process for getting an exception might be lengthy or unsuccessful. Introduces a dependency not currently on the approved list for this type of development.

## Decision Outcome

Chosen option: **"Vanilla HTML, CSS, JavaScript (ES6+)"**.

This decision is a direct consequence of the technical constraint outlined in `techContext.md`: "No external frameworks: The frontend must be built with 'vanilla' JavaScript. No external libraries like React, Vue, or Angular are permitted." While this approach presents challenges in terms of development complexity and long-term maintainability, it ensures full compliance with the established enterprise guidelines for this project. The team will need to focus on establishing strong internal coding standards, patterns for DOM manipulation and state management, and thorough code reviews to mitigate potential downsides.

### Positive Consequences

*   Full compliance with enterprise technology constraints.
*   No reliance on external frontend libraries, simplifying dependency management.
*   Complete control over the rendering and behavior of UI elements.

### Negative Consequences (if any)

*   Increased development effort and time for UI features.
*   Higher risk of inconsistencies and bugs in UI logic.
*   Code can become harder to maintain and scale as the application grows.
*   Steeper learning curve for developers less experienced with complex "vanilla JS" applications.
*   Lack of readily available UI components and state management solutions offered by frameworks.

## Validation

*   Successful implementation of a responsive and interactive user interface within the Confluence macro.
*   The frontend codebase remains understandable, maintainable, and extensible throughout the project lifecycle.
*   User feedback indicates the UI is intuitive and performs well.

## Pros and Cons of the Options

(Covered in "Considered Options" section)

## Links

*   ADR-001: Confluence-Integrated Application Architecture
*   `cline-docs/techContext.md`

## Amendment History

*   N/A