# Web Assets API Specification

**Version:** 2.0.0  
**API Version:** v2  
**Last Updated:** August 7, 2025

## Overview

The Web Assets API provides static file serving capabilities for UMIG (Unified Migration Implementation Guide) web resources including CSS, JavaScript, images, and other static assets required by ScriptRunner macros and the frontend SPA. Unlike traditional data APIs, this endpoint serves static files with appropriate Content-Type headers, caching, and security measures for directory traversal protection.

## Architecture Overview

The Web Assets API follows a simplified pattern designed specifically for static file serving:

- **File System Access**: Direct file system operations with configurable root directory
- **Security Model**: Directory traversal protection and file existence validation
- **Content-Type Detection**: Automatic MIME type resolution based on file extensions
- **Binary/Text Handling**: Optimized delivery for different file types (binary vs text)
- **Environment Configuration**: Flexible web root configuration for development and production

### File Serving Architecture

```
Web Root Directory Structure:
└── web/ (configured via UMIG_WEB_ROOT)
    ├── css/
    │   ├── admin-gui.css
    │   └── iteration-view.css
    ├── js/
    │   ├── AdminGuiController.js
    │   ├── ApiClient.js
    │   ├── admin-gui.js
    │   └── iteration-view.js
    └── [other static assets]

Request Flow:
Client Request → Security Check → File Resolution → MIME Detection → Content Delivery
```

## Authentication & Authorization

All endpoints require Confluence authentication with group membership:

```groovy
groups: ["confluence-users", "confluence-administrators"]
```

**Required Headers:**

- `Authorization`: Confluence session or basic auth

**Access Control:**

- **confluence-users**: Can access all static assets
- **confluence-administrators**: Full access to all static assets

## Base URL Structure

All endpoints are relative to the ScriptRunner custom REST base:

```
{confluence-base-url}/rest/scriptrunner/latest/custom/web
```

## Configuration

### Environment Variables

**UMIG_WEB_ROOT**

- **Purpose**: Configurable root directory for static assets
- **Default**: `/var/atlassian/application-data/confluence/scripts/umig/web` (production)
- **Development**: Set to local project path for development
- **Example**: `/Users/youruser/Documents/GitHub/UMIG/src/groovy/umig/web`

```bash
# Development setup
export UMIG_WEB_ROOT=/Users/youruser/Documents/GitHub/UMIG/src/groovy/umig/web

# Or in container environment
UMIG_WEB_ROOT=/opt/umig/web
```

### Supported MIME Types

The API automatically detects and sets appropriate Content-Type headers:

| Extension       | MIME Type                  | Category       | Delivery Method |
| --------------- | -------------------------- | -------------- | --------------- |
| `.css`          | `text/css`                 | Stylesheet     | Text            |
| `.js`           | `application/javascript`   | JavaScript     | Text            |
| `.svg`          | `image/svg+xml`            | Vector Image   | Binary          |
| `.png`          | `image/png`                | Raster Image   | Binary          |
| `.jpg`, `.jpeg` | `image/jpeg`               | Raster Image   | Binary          |
| `.gif`          | `image/gif`                | Animated Image | Binary          |
| `.html`         | `text/html`                | HTML Document  | Text            |
| _other_         | `application/octet-stream` | Binary         | Binary          |

## API Endpoints

### GET /web/{filepath} - Serve Static Asset

Serves static files from the configured web root directory with appropriate headers and security checks.

**Parameters:**

- `filepath` (path): Relative file path within the web root directory

**Security Features:**

- **Directory Traversal Protection**: Prevents access outside web root using canonical path checking
- **File Existence Validation**: Returns 404 for non-existent files
- **Access Control**: Requires Confluence authentication

**Example Requests:**

#### Serve CSS File

```bash
GET /web/css/admin-gui.css
```

**Response Headers:**

```
Content-Type: text/css
```

**Example Response:**

```css
/* UMIG Admin GUI Styles */
.umig-admin-container {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #f8f9fa;
}
...
```

#### Serve JavaScript File

```bash
GET /web/js/ApiClient.js
```

**Response Headers:**

```
Content-Type: application/javascript
```

**Example Response:**

```javascript
/**
 * UMIG API Client
 */
class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }
  // ...
}
```

#### Serve Image File

```bash
GET /web/images/logo.png
```

**Response Headers:**

```
Content-Type: image/png
```

**Response:** Binary PNG data

#### Directory Structure Examples

```bash
# CSS stylesheets
GET /web/css/admin-gui.css
GET /web/css/iteration-view.css

# JavaScript modules
GET /web/js/AdminGuiController.js
GET /web/js/AdminGuiState.js
GET /web/js/ApiClient.js
GET /web/js/AuthenticationManager.js
GET /web/js/EntityConfig.js
GET /web/js/ModalManager.js
GET /web/js/TableManager.js
GET /web/js/UiUtils.js

# Application bundles
GET /web/js/admin-gui.js
GET /web/js/iteration-view.js
GET /web/js/step-view.js
```

## Error Handling

### HTTP Status Codes

- **200 OK**: File served successfully
- **400 Bad Request**: Missing file path or empty path
- **403 Forbidden**: Directory traversal attempt or access denied
- **404 Not Found**: File does not exist
- **500 Internal Server Error**: Unexpected server error

### Error Response Format

All error responses return plain text error messages:

```
File not found: css/missing-file.css
```

### Common Error Scenarios

#### 1. Missing File Path (400)

```bash
GET /web/
# or
GET /web
```

**Response:**

```
HTTP/1.1 400 Bad Request
Content-Type: text/plain

File path is required.
```

#### 2. Directory Traversal Attempt (403)

```bash
GET /web/../../../etc/passwd
```

**Response:**

```
HTTP/1.1 403 Forbidden
Content-Type: text/plain

Access denied.
```

#### 3. File Not Found (404)

```bash
GET /web/css/nonexistent.css
```

**Response:**

```
HTTP/1.1 404 Not Found
Content-Type: text/plain

File not found: css/nonexistent.css
```

#### 4. Directory Access Attempt (404)

```bash
GET /web/css/
```

**Response:**

```
HTTP/1.1 404 Not Found
Content-Type: text/plain

File not found: css/
```

## Security Considerations

### Directory Traversal Protection

The API implements robust security measures to prevent directory traversal attacks:

```groovy
// Security implementation
def requestedFile = new File(webRootDir, safePath)

// Prevent directory traversal attacks
if (!requestedFile.getCanonicalPath().startsWith(webRootDir.getCanonicalPath())) {
    return Response.status(Response.Status.FORBIDDEN).entity('Access denied.').build()
}
```

**Protected Against:**

- Path traversal attempts: `../../../etc/passwd`
- Absolute path attempts: `/etc/passwd`
- URL-encoded traversal: `%2e%2e%2f`
- Mixed path separators: `..\..\..\windows\system32`

### File Access Controls

- **Authentication Required**: All requests require Confluence authentication
- **Group Membership**: Must be member of `confluence-users` or `confluence-administrators`
- **File System Access**: Limited to configured web root directory only
- **File Type Restrictions**: No executable file serving (no `.sh`, `.exe`, `.bat`)

### Content Security

- **MIME Type Enforcement**: Proper Content-Type headers prevent MIME sniffing attacks
- **Binary Safety**: Binary files served as byte arrays to prevent encoding issues
- **Path Sanitization**: Leading slashes removed and paths normalized

## Integration with ScriptRunner Macros

### Admin GUI Macro Integration

The Admin GUI macro references static assets served by this API:

```groovy
// In adminGuiMacro.groovy
def webResourcesPath = "/rest/scriptrunner/latest/custom/web"

return """
<link rel="stylesheet" href="${webResourcesPath}/css/admin-gui.css">
<script src="${webResourcesPath}/js/admin-gui.js"></script>
<div id="umig-admin-gui-root" class="umig-admin-container">
    <!-- Admin GUI content -->
</div>
"""
```

### Iteration View Macro Integration

The Iteration View macro dynamically references the web root:

```groovy
// In iterationViewMacro.groovy
def webRoot = System.getenv('UMIG_WEB_ROOT') ?: '/rest/scriptrunner/latest/custom/web'

return """
<link rel="stylesheet" href="${webRoot}/css/iteration-view.css">
<script src="${webRoot}/js/iteration-view.js"></script>
<div class="iteration-view">
    <!-- Iteration view content -->
</div>
"""
```

### JavaScript Module Loading

Frontend JavaScript modules can dynamically load other modules:

```javascript
// In JavaScript files
class ApiClient {
  static async loadModule(modulePath) {
    const script = document.createElement("script");
    script.src = `/rest/scriptrunner/latest/custom/web/js/${modulePath}`;
    document.head.appendChild(script);
  }
}

// Usage
await ApiClient.loadModule("UiUtils.js");
```

## Performance Optimization

### Caching Headers

Currently, the API serves files without explicit caching headers. For production optimization, consider implementing:

```groovy
// Future enhancement - caching headers
def headers = [
    'Cache-Control': 'public, max-age=3600',  // 1 hour cache
    'ETag': generateETag(requestedFile),
    'Last-Modified': requestedFile.lastModified()
]
```

### Content Delivery

**Binary Files**: Served as byte arrays for optimal performance

```groovy
// Images, fonts, binary assets
return Response.ok(requestedFile.bytes).type(mimeType).build()
```

**Text Files**: Served as text with proper encoding

```groovy
// CSS, JS, HTML files
return Response.ok(requestedFile.text).type(mimeType).build()
```

### Load Balancing Considerations

- **CDN Integration**: Static assets can be served via CDN for better performance
- **Local Development**: Fast file serving from local file system
- **Production**: Consider nginx or Apache for static file serving in high-traffic scenarios

## Development Workflow

### Local Development Setup

1. **Set Environment Variable:**

```bash
export UMIG_WEB_ROOT=/Users/youruser/Documents/GitHub/UMIG/src/groovy/umig/web
```

2. **File Structure:**

```
src/groovy/umig/web/
├── css/
│   ├── admin-gui.css
│   └── iteration-view.css
├── js/
│   ├── AdminGuiController.js
│   ├── ApiClient.js
│   └── [other modules]
└── README.md
```

3. **Test Asset Loading:**

```bash
curl "http://localhost:8090/rest/scriptrunner/latest/custom/web/css/admin-gui.css"
curl "http://localhost:8090/rest/scriptrunner/latest/custom/web/js/ApiClient.js"
```

### Asset Management

**Adding New Assets:**

1. Place files in appropriate subdirectory (`css/`, `js/`, `images/`)
2. Reference in macros or JavaScript modules
3. Test via direct URL access
4. Ensure proper MIME type detection

**Asset Organization:**

- **CSS**: Component-specific stylesheets in `/css/`
- **JavaScript**: Modular JavaScript files in `/js/`
- **Images**: Icons, logos, graphics in `/images/` (if needed)
- **Fonts**: Custom fonts in `/fonts/` (if needed)

## Integration Examples

### Frontend Asset Loading (JavaScript)

```javascript
class AssetLoader {
  constructor() {
    this.baseUrl = "/rest/scriptrunner/latest/custom/web";
  }

  loadCSS(filename) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `${this.baseUrl}/css/${filename}`;
    document.head.appendChild(link);
    return new Promise((resolve, reject) => {
      link.onload = resolve;
      link.onerror = reject;
    });
  }

  async loadJS(filename) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${this.baseUrl}/js/${filename}`;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  preloadImage(filename) {
    const img = new Image();
    img.src = `${this.baseUrl}/images/${filename}`;
    return new Promise((resolve) => {
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });
  }
}

// Usage
const loader = new AssetLoader();

// Load CSS dynamically
await loader.loadCSS("iteration-view.css");

// Load JavaScript modules
await loader.loadJS("ApiClient.js");
await loader.loadJS("UiUtils.js");

// Preload images
const logo = await loader.preloadImage("logo.png");
```

### Macro Integration Pattern

```groovy
// Standard macro pattern for asset inclusion
def webResourcesPath = "/rest/scriptrunner/latest/custom/web"

return """
<!-- CSS Dependencies -->
<link rel="stylesheet" href="${webResourcesPath}/css/base.css">
<link rel="stylesheet" href="${webResourcesPath}/css/component.css">

<!-- JavaScript Dependencies -->
<script src="${webResourcesPath}/js/ApiClient.js"></script>
<script src="${webResourcesPath}/js/ComponentController.js"></script>

<!-- Application Content -->
<div class="umig-component">
    <!-- Component HTML -->
</div>

<!-- Initialize Component -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    const controller = new ComponentController();
    controller.initialize();
});
</script>
"""
```

### Error Handling in Frontend

```javascript
class SafeAssetLoader {
  async loadAsset(type, filename, retries = 3) {
    const url = `/rest/scriptrunner/latest/custom/web/${type}/${filename}`;

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url);

        if (response.ok) {
          return await response.text();
        } else if (response.status === 404) {
          console.warn(`Asset not found: ${url}`);
          return null;
        } else if (response.status === 403) {
          console.error(`Access denied for asset: ${url}`);
          return null;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.error(`Attempt ${i + 1} failed for ${url}:`, error);
        if (i === retries - 1) throw error;

        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, i) * 1000),
        );
      }
    }
  }

  async loadCSSWithFallback(primary, fallback = null) {
    try {
      await this.loadAsset("css", primary);
    } catch (error) {
      if (fallback) {
        console.warn(`Loading fallback CSS: ${fallback}`);
        await this.loadAsset("css", fallback);
      } else {
        console.error("CSS loading failed with no fallback");
      }
    }
  }
}
```

## Best Practices

### 1. Asset Organization

**File Naming Conventions:**

```bash
# ✅ Good: Descriptive, component-based naming
admin-gui.css
iteration-view.css
ApiClient.js
AdminGuiController.js

# ❌ Avoid: Generic or unclear names
styles.css
main.js
utils.js
```

**Directory Structure:**

```bash
# ✅ Good: Organized by type and purpose
web/
├── css/
│   ├── admin-gui.css      # Component-specific
│   ├── iteration-view.css # Page-specific
│   └── common.css         # Shared styles
├── js/
│   ├── controllers/       # Controllers
│   ├── services/         # API services
│   └── utils/            # Utilities
└── images/
    ├── icons/            # UI icons
    └── logos/            # Brand assets
```

### 2. Performance Optimization

**Minimize HTTP Requests:**

```javascript
// ✅ Good: Bundle related assets
await Promise.all([
  loader.loadCSS("admin-gui.css"),
  loader.loadJS("ApiClient.js"),
  loader.loadJS("AdminGuiController.js"),
]);

// ❌ Avoid: Sequential loading
await loader.loadCSS("admin-gui.css");
await loader.loadJS("ApiClient.js");
await loader.loadJS("AdminGuiController.js");
```

**Lazy Loading:**

```javascript
// ✅ Good: Load assets when needed
class ComponentManager {
  async loadComponent(name) {
    if (!this.loadedComponents.has(name)) {
      await loader.loadCSS(`${name}.css`);
      await loader.loadJS(`${name}Controller.js`);
      this.loadedComponents.add(name);
    }
  }
}
```

### 3. Error Resilience

**Graceful Degradation:**

```javascript
// ✅ Good: Handle missing assets gracefully
try {
  await loader.loadCSS("enhanced-styles.css");
} catch (error) {
  console.warn("Enhanced styles unavailable, using defaults");
  // Continue with basic functionality
}
```

**Asset Dependency Management:**

```javascript
// ✅ Good: Check dependencies before loading
class DependencyManager {
  async loadWithDependencies(asset, dependencies = []) {
    // Load dependencies first
    for (const dep of dependencies) {
      await this.ensureLoaded(dep);
    }

    // Load main asset
    return await this.load(asset);
  }
}
```

### 4. Security Best Practices

**Content Security Policy Integration:**

```html
<!-- In macro output -->
<meta
  http-equiv="Content-Security-Policy"
  content="script-src 'self' 'unsafe-inline' /rest/scriptrunner/latest/custom/web/"
/>
```

**Asset Integrity Verification:**

```javascript
// Future enhancement - integrity checking
const assetIntegrity = {
  "admin-gui.css": "sha384-ABC123...",
  "ApiClient.js": "sha384-DEF456...",
};
```

## Business Logic & Side Effects

### Key Logic

- **Path Resolution**: Converts relative paths to absolute file paths within web root
- **Security Validation**: Canonical path checking prevents directory traversal
- **MIME Detection**: File extension-based Content-Type assignment
- **Binary/Text Optimization**: Different delivery methods based on file type

### Side Effects

- **No Side Effects**: GET operations only, no data modification
- **File System Access**: Direct file system reads (no database impact)
- **Memory Usage**: Large files loaded entirely into memory for delivery

### Idempotency

- **Fully Idempotent**: All operations are GET requests with no state changes
- **Cacheable**: Responses can be safely cached by browsers and proxies

## Dependencies & Backing Services

### File System Dependencies

- **Web Root Directory**: Must exist and be readable by ScriptRunner process
- **File Permissions**: ScriptRunner process must have read access to all served files
- **Directory Structure**: Proper organization required for asset discovery

### Confluence Integration

- **ScriptRunner Platform**: Requires ScriptRunner for custom REST endpoint
- **Authentication**: Integrates with Confluence user authentication
- **Group Membership**: Relies on Confluence group management

### No External Services

- **Database**: Not used (pure file serving)
- **External APIs**: Not used
- **Cache Layers**: Not implemented (direct file access)

## Testing & Mock Data

### Unit Testing

```groovy
class WebApiTest {
    @Test
    void testServeCSS() {
        def response = webApi.web([:], "", mockRequest("/css/admin-gui.css"))

        assert response.status == 200
        assert response.entity.contains("admin-container")
        assert response.headers.get("Content-Type") == "text/css"
    }

    @Test
    void testDirectoryTraversalPrevention() {
        def response = webApi.web([:], "", mockRequest("../../../etc/passwd"))

        assert response.status == 403
        assert response.entity == "Access denied."
    }

    @Test
    void testMissingFile() {
        def response = webApi.web([:], "", mockRequest("/css/nonexistent.css"))

        assert response.status == 404
        assert response.entity.contains("File not found")
    }
}
```

### Integration Testing

```bash
# Test asset serving
curl -i "http://localhost:8090/rest/scriptrunner/latest/custom/web/css/admin-gui.css"

# Test security (should fail)
curl -i "http://localhost:8090/rest/scriptrunner/latest/custom/web/../../../etc/passwd"

# Test 404 handling
curl -i "http://localhost:8090/rest/scriptrunner/latest/custom/web/css/missing.css"

# Test binary file serving
curl -i "http://localhost:8090/rest/scriptrunner/latest/custom/web/images/logo.png"
```

### Mock Assets

For testing purposes, ensure these assets exist:

- `/css/admin-gui.css` - Admin interface styles
- `/css/iteration-view.css` - Iteration view styles
- `/js/ApiClient.js` - API client library
- `/js/admin-gui.js` - Admin GUI application bundle
- `/js/iteration-view.js` - Iteration view application bundle

## Performance Considerations

### File I/O Optimization

- **Small Files**: Loaded entirely into memory for fast delivery
- **Large Files**: Consider streaming for files >10MB (future enhancement)
- **Concurrent Access**: Multiple simultaneous requests handled efficiently

### Memory Usage

- **Text Files**: Loaded as strings (UTF-8 encoding)
- **Binary Files**: Loaded as byte arrays
- **Memory Impact**: Proportional to largest served file size

### Scalability Notes

- **Request Volume**: Suitable for moderate traffic (hundreds of concurrent requests)
- **File Size Limits**: No explicit limits, but memory-constrained
- **Caching**: Browser caching reduces server load (proper headers needed)

## Security Notes

### Authentication & Authorization

- **Confluence Integration**: Leverages existing Confluence security
- **Group-Based Access**: Both users and administrators can access assets
- **No Row-Level Security**: All assets accessible to authorized users

### Input Validation

- **Path Sanitization**: Leading slashes removed, paths normalized
- **Directory Traversal**: Prevented via canonical path checking
- **File Type Filtering**: MIME type enforcement prevents execution

### File System Security

- **Read-Only Access**: No file modification capabilities
- **Bounded Access**: Limited to configured web root directory
- **No Directory Listing**: Cannot list directory contents

## Versioning & Deprecation

- **API Version**: V2 (current)
- **Backward Compatibility**: File paths should remain stable
- **Deprecation Policy**: Asset URLs should not change without migration path
- **Breaking Changes**: Web root configuration changes require environment updates

## Changelog

### Version 2.0.0 (August 7, 2025)

- Complete Web Assets API implementation
- Directory traversal security protection
- Multi-format MIME type support (CSS, JS, images, HTML)
- Binary and text file optimization
- Integration with Admin GUI and Iteration View macros
- Configurable web root directory via environment variable
- Comprehensive error handling with appropriate HTTP status codes

### Version 1.0.0 (June 1, 2025)

- Initial static file serving capability
- Basic CSS and JavaScript file support
- Simple file existence checking

---

> **Note:** This specification should be updated whenever the API changes. Reference this document for macro integration, frontend asset loading, and security considerations. For implementation details, see `/src/groovy/umig/api/v2/web/WebApi.groovy`.
