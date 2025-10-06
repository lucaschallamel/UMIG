# ScriptRunner UI Macros

Confluence ScriptRunner macros for rendering UMIG interface containers and loading frontend assets.

## Responsibilities

- Provide Confluence page macros for UMIG UI embedding
- Generate HTML containers with correct data attributes
- Load ComponentOrchestrator and initialize frontend
- Handle asset URLs with configuration-based paths

## Structure

```
v1/
├── adminGuiMacro.groovy          # Admin GUI container (primary interface)
├── iterationViewMacro.groovy     # Iteration-specific view container
└── stepViewMacro.groovy          # Step execution view container
```

## Macro Patterns

### Admin GUI Macro

Primary admin interface with full entity management capabilities.

```groovy
adminGuiMacro() {
    return """
        <div id="umig-admin-container" data-mode="admin"></div>
        <script src="${getWebRoot()}/ComponentOrchestrator.js"></script>
        <script>
            window.addEventListener('load', function() {
                const orchestrator = new ComponentOrchestrator();
                orchestrator.initialize();
            });
        </script>
    """
}
```

### Iteration View Macro

Iteration-specific interface with filtered entity access.

### Step View Macro

Step execution interface with real-time status updates and comment management.

## Configuration

All macros use `umig.web.root` configuration for asset URLs (ADR-069).

## Related

- See `../../web/js/ComponentOrchestrator.js` for initialization
- See `../../api/v2/web/` for asset serving
- See `/docs/architecture/adr/ADR-069-web-root-path-separation.md` for path architecture
