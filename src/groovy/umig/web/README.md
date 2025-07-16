# Web Assets for Macros (UMIG)

This folder contains all JavaScript and CSS assets used by UMIG macros.

## Structure
- `js/`: All macro frontend JavaScript files
  - **Admin GUI Modules** (refactored from admin-gui.js):
    - `AdminGuiController.js`: Main orchestration and application flow
    - `EntityConfig.js`: Entity configurations and field definitions (includes Users, Teams, Environments, Applications, Labels)
    - `AdminGuiState.js`: State management and data caching
    - `ApiClient.js`: REST API communication and error handling (includes all entity-specific API methods)
    - `AuthenticationManager.js`: User authentication and session management
    - `TableManager.js`: Table rendering, sorting, and pagination
    - `ModalManager.js`: Modal dialogs for view/edit/create operations with entity-specific handlers
    - `UiUtils.js`: Shared utility functions and UI helpers (includes color contrast calculation)
  - **Macro-specific files**:
    - `admin-gui.js`: Main admin GUI entry point
    - `iteration-view.js`: Iteration view functionality
    - `step-view.js`: Step view functionality
    - `hello-world.js`: Example/test script
    - `umig-ip-macro.js`: Implementation plan functionality
- `css/`: All macro frontend CSS files
  - `admin-gui.css`: Comprehensive styles for admin interface
  - `iteration-view.css`: Iteration view styles
  - `umig-ip-macro.css`: Implementation plan macro styles
  - `hello-world.css`: Example/test styles

## Usage
- Each macro references its assets via `<script>` and `<link>` tags (see macros/README.md).
- **Do not inline large assets in Groovy scripts.**
- Versioning: If you need to support multiple versions, use subfolders (e.g., `js/v1/`).

## How Assets Are Served in Confluence
- **Recommended:** Use ScriptRunner's static resource servlet to serve assets from this folder. This enables maintainable, version-controlled asset delivery.
- **Alternative:** Attach assets to a Confluence page and reference them by URL, or use a web server if available.
- **Important:** Update asset URLs in macros if the serving method changes. Document the serving method here for future maintainers.

## Example
```groovy
// In a macro script
return '''
<div id="umig-iteration-view-root"></div>
<link rel="stylesheet" href="/s/groovy/umig/web/css/iteration-view.css">
<script src="/s/groovy/umig/web/js/iteration-view.js"></script>
'''
```

## Admin GUI Module Loading
The Admin GUI uses a modular architecture where the macro loads all required modules in the correct order:
```groovy
// In adminGuiMacro.groovy
<script src="\${baseUrl}/js/EntityConfig.js"></script>
<script src="\${baseUrl}/js/UiUtils.js"></script>
<script src="\${baseUrl}/js/AdminGuiState.js"></script>
<script src="\${baseUrl}/js/ApiClient.js"></script>
<script src="\${baseUrl}/js/AuthenticationManager.js"></script>
<script src="\${baseUrl}/js/TableManager.js"></script>
<script src="\${baseUrl}/js/ModalManager.js"></script>
<script src="\${baseUrl}/js/AdminGuiController.js"></script>
```

## Key Features

### Admin GUI Capabilities
The modular Admin GUI provides comprehensive entity management:

1. **Entity Management**:
   - Users: Full CRUD with role assignment and active/inactive status
   - Teams: Member and application association management
   - Environments: Application and iteration associations with roles
   - Applications: Environment, team, and label associations
   - Labels: Color-coded tags with migration-scoped filtering

2. **Advanced Features**:
   - Hierarchical filtering (migration → iteration → plan → sequence → phase)
   - Dynamic field types (text, number, boolean, select, color, entity-select)
   - Association management with add/remove capabilities
   - Paginated data tables with sorting and searching
   - Modal-based workflows (VIEW → EDIT transitions)
   - Real-time validation and error handling

3. **Labels Implementation** (Added 2025-07-16):
   - Color picker with accessibility (contrast color calculation)
   - Migration-based step filtering
   - Many-to-many associations with applications and steps
   - Dynamic dropdown population based on selected migration
   - Loading states and helpful UI guidance

## References
- See macros/README.md for macro/asset integration patterns.
- [ADR020 - SPA+REST Pattern](../../docs/adr/ARD020-spa-rest-admin-entity-management.md)
