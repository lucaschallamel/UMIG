# ADR-001: Confluence-Integrated Application Architecture

- **Status:** Accepted
- **Date:** 2025-06-16
- **Deciders:** UMIG Project Team
- **Technical Story:** N/A

## Context and Problem Statement

The UMIG project requires a collaborative platform for creating, managing, and sharing "Universal Macro Implementation Guides." A key initial challenge was to select an architectural approach that balances rapid development, leverages existing enterprise infrastructure, ensures maintainability, and meets the project's collaboration and usability requirements. The primary decision point was choosing between developing a standalone web application or an application integrated within an existing enterprise platform.

## Decision Drivers

- **Timeline and Risk Mitigation:** A primary driver was the need to minimize the development timeline and reduce risks associated with building a new application from scratch, especially concerning frontend development and enterprise service integration.
- **Leverage Approved Technologies:** Adherence to the bank's approved technology portfolio (as outlined in `techContext.md`) was crucial.
- **Enterprise Integration:** Seamless integration with existing enterprise services, particularly for user authentication (Active Directory) and email notifications (Exchange Server).
- **Collaboration Needs:** The platform must support collaborative workflows.
- **User Adoption:** Preference for an environment familiar to users to ease adoption and reduce training overhead.

## Considered Options

- **Option 1: Standalone NodeJS Application**
  - Description: A custom-built web application using NodeJS for the backend and a modern JavaScript framework (e.g., React, Vue, Angular) for the frontend. Would require separate hosting and infrastructure.
  - Pros: Complete control over technology choices, UI/UX design, and deployment lifecycle. Potentially more flexible for future, independent scaling.
  - Cons: Significantly higher development effort and time, especially for building the frontend, implementing robust authentication, and integrating with enterprise services. Higher risk to the project timeline. Requires dedicated hosting, security hardening, and ongoing maintenance.
- **Option 2: Confluence-Integrated Application (Chosen)**
  - Description: The application is built as a custom macro embedded within Atlassian Confluence. Backend logic is handled by Atlassian ScriptRunner (Groovy) exposing REST APIs, and the frontend uses standard HTML, CSS, and JavaScript.
  - Pros: Accelerated development by leveraging Confluence for hosting, UI shell, user management (via Active Directory integration), and versioning. Lower risk to timeline. Utilizes approved and supported enterprise technologies. Familiar environment for users.
  - Cons: Tight dependency on the Confluence platform (performance, availability, version upgrades). Potential limitations imposed by Confluence macro capabilities and ScriptRunner's execution environment. Frontend development complexity due to the "vanilla JavaScript" constraint.
- **Option 3: MS Excel + Macros**
  - Description: Utilizing Microsoft Excel spreadsheets with VBA macros for data management and logic.
  - Pros: Familiar tool for many business users; potentially quick for very simple, single-user data tasks.
  - Cons: Unsuitable for multi-user collaboration and concurrent data access. Poor scalability and maintainability for complex applications. Lacks a web-based interface. Does not align with enterprise application standards or the approved technology stack for this project.
- **Option 4: MS Access**
  - Description: Using a Microsoft Access database with forms and VBA for application logic.
  - Pros: More robust data management capabilities than Excel for small-scale databases.
  - Cons: Primarily a desktop-oriented solution. Web integration is complex and not a natural fit for the Confluence ecosystem. Does not align with the project's goal of a seamlessly integrated web platform or the approved technology stack.

## Decision Outcome

Chosen option: **"Confluence-Integrated Application"**.

This decision was made primarily because it significantly reduces development time and risk by leveraging the existing Atlassian Confluence platform and its inherent integrations with critical enterprise services like Active Directory for authentication and Exchange Server for notifications (as per `activeContext.md` and `techContext.md`). This approach directly addresses the "high risk to the timeline associated with building a frontend from scratch and integrating with enterprise services" that led to the rejection of the standalone NodeJS application. It ensures alignment with the bank's approved technology portfolio and provides a familiar, collaborative environment for end-users.

### Positive Consequences

- Reduced development timeline and faster delivery of an MVP.
- Lowered infrastructure setup and ongoing maintenance overhead.
- Seamless and secure user authentication via existing enterprise Active Directory.
- Potentially higher user adoption rates due to the application residing within the familiar Confluence environment.
- Leverages existing Confluence features (e.g., page versioning, search, permissions).

### Negative Consequences (if any)

- The application's performance, availability, and feature set are tightly coupled to the enterprise Confluence instance and its upgrade cycles.
- Potential limitations imposed by the Confluence macro environment and ScriptRunner capabilities might restrict future enhancements.
- Managing a complex frontend with "vanilla" JavaScript may become challenging over time, requiring strict coding discipline and potentially impacting development velocity for new features.

## Validation

The success of this decision will be validated by:

- Successful delivery of the Minimum Viable Product (MVP) within the projected timeframe.
- Positive user feedback regarding ease of use, performance, and seamless integration within Confluence.
- Demonstrably stable and performant operation of the application within the enterprise Confluence environment under expected load conditions.
- Maintainable and extensible codebase despite the "vanilla JS" constraint.

## Pros and Cons of the Options

(Covered in "Considered Options" section)

## Links

- `cline-docs/activeContext.md`
- `cline-docs/projectBrief.md`
- `cline-docs/techContext.md`
- `cline-docs/systemPatterns.md`

## Amendment History

- N/A
