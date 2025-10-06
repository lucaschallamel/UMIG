# Web Resource API

Static asset serving endpoint for UMIG web interface resources (JavaScript, CSS, images).

## Responsibilities

- Serve static web resources from filesystem using configured paths
- Handle MIME type detection and HTTP caching headers
- Provide secure file access with path traversal prevention
- Support both development (hot reload) and production (cached) modes

## Structure

```
web/
└── WebApi.groovy    # Static resource endpoint with filesystem integration
```

## Key Patterns

### Resource Serving

```groovy
@BaseScript CustomEndpointDelegate delegate

web(httpMethod: "GET") { request, binding ->
    def relativePath = request.pathInfo - '/web'
    def fullPath = getWebRoot() + relativePath

    // Security: Prevent path traversal
    if (!isPathSafe(fullPath)) {
        return Response.status(403).build()
    }

    def file = new File(fullPath)
    return Response.ok(file)
        .type(getMimeType(relativePath))
        .build()
}
```

### Path Configuration

Uses `umig.web.filesystem.root` from SystemConfiguration for filesystem access (ADR-069).

## Related

- See `../../utils/` for configuration utilities
- See `../../../web/` for served frontend resources
- See `/docs/architecture/adr/ADR-069-web-root-path-separation.md` for path architecture
