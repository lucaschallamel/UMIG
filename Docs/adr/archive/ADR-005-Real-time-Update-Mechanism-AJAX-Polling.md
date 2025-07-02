# ADR-005: Real-time Update Mechanism - AJAX Polling

* **Status:** Accepted
* **Date:** 2025-06-16
* **Deciders:** UMIG Project Team
* **Technical Story:** N/A

## Context and Problem Statement

The UMIG application aims to provide a responsive user experience, where changes made by one user might become visible to other active users in a timely manner, or updates to long-running processes (like generating a macro-plan) can be reflected without a full page reload. A mechanism for these "real-time" or near real-time updates is needed.

## Decision Drivers

* **User Experience:** Provide users with timely updates to reflect changes in data or system status.
* **Technical Feasibility:** The solution must be implementable within the Confluence/ScriptRunner environment.
* **Simplicity and Reliability:** Prefer a simpler and reliable solution given the overall architecture.
* **Resource Constraints:** Avoid solutions that place excessive load on the Confluence server or backend.
* **Approved Technologies/Patterns:** Align with common practices and available capabilities.

## Considered Options

* **Option 1: AJAX Polling (Chosen)**
  * Description: The frontend JavaScript periodically sends AJAX requests to ScriptRunner backend endpoints to check for updates.
  * Pros: Relatively simple to implement using standard JavaScript `fetch` or `XMLHttpRequest`. Does not require special server-side setup beyond normal REST endpoints. Reliable and well-understood pattern. Explicitly mentioned as the chosen pattern in `activeContext.md`.
  * Cons: Can be inefficient as many requests might return no new data. Can increase server load if polling frequency is too high or many clients are polling. Updates are not truly real-time but depend on the polling interval.
* **Option 2: WebSockets**
  * Description: Establish a persistent, bidirectional communication channel between the client (frontend) and the server (backend).
  * Pros: Enables true real-time, low-latency communication. More efficient than polling once the connection is established, as data is pushed from server to client only when available.
  * Cons: More complex to implement and manage. ScriptRunner and the Confluence environment may not have straightforward, out-of-the-box support for hosting WebSocket endpoints, potentially requiring external services or complex workarounds. Firewalls and proxies can sometimes interfere with WebSocket connections. Explicitly not chosen as per `activeContext.md`.
* **Option 3: Server-Sent Events (SSE)**
  * Description: A standard allowing a web page to get updates from a server via an HTTP connection. It's a one-way communication from server to client.
  * Pros: Simpler than WebSockets. Built on standard HTTP. Good for server-to-client streaming of updates.
  * Cons: Still requires specific server-side support to keep the connection open and stream data, which might be challenging with ScriptRunner's typical request-response model for REST endpoints. Not as widely supported or understood as AJAX polling.

## Decision Outcome

Chosen option: **"AJAX Polling"**.

AJAX polling was selected as the mechanism for "real-time" updates, as confirmed in `activeContext.md`. This decision prioritizes simplicity, reliability, and ease of implementation within the existing Confluence and ScriptRunner architecture. While WebSockets offer true real-time communication, their implementation complexity and potential compatibility issues within the enterprise environment and ScriptRunner made AJAX polling a more pragmatic choice. The potential inefficiency of polling will be mitigated by implementing "smart" polling strategies (e.g., adjusting frequency based on user activity, using longer intervals for less critical data).

### Positive Consequences

* Simple and straightforward implementation on both frontend and backend.
* Leverages existing REST API infrastructure (ADR-002).
* Reliable and well-understood technology.

### Negative Consequences (if any)

* Updates are not instantaneous but depend on the polling interval.
* Can lead to increased server load if not implemented carefully (e.g., polling too frequently).
* May consume more client-side resources than WebSockets over time.

## Validation

* Users receive timely notifications or updates on data changes within acceptable delay.
* The polling mechanism does not cause undue performance degradation on the Confluence server or the client's browser.
* The implementation is robust and does not lead to excessive network traffic.

## Pros and Cons of the Options

(Covered in "Considered Options" section)

## Links

* ADR-001: Confluence-Integrated Application Architecture
* ADR-002: Backend Implementation with Atlassian ScriptRunner
* `cline-docs/activeContext.md`

## Amendment History

* N/A