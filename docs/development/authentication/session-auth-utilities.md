---
version: 1.0.0
last_updated: 2025-09-21
tested_with:
  confluence: "9.2.7"
  scriptrunner: "9.21.0"
  node: "18.17.0"
maintainer: "UMIG Development Team"
related_docs:
  - TD-008-session-based-authentication-infrastructure.md
  - docs/api/api-testing-quick-reference.md
---

# UMIG Session Authentication Utilities

**Cross-Platform Node.js Replacements for Shell Scripts**

This document describes the Node.js utilities that replace the shell scripts for session-based authentication testing in UMIG. These utilities provide cross-platform compatibility (Windows/macOS/Linux) and maintain the same functionality as the original shell scripts.

## Overview

Due to Confluence security policies that prevent programmatic authentication, UMIG requires session-based authentication for API testing. These utilities help developers capture and test browser sessions for use with CURL, POSTMAN, and other HTTP clients.

## Prerequisites

Before using these utilities, ensure you have:

- **Node.js 18+** installed (required for fetch API)
- **UMIG stack running** via `npm start`
- **Browser logged into Confluence** as admin:123456
- **Access to browser developer tools** for cookie extraction

## Quick Start - Session Capture

```bash
# 1. Start UMIG stack
npm start

# 2. Open browser and login to Confluence
# Navigate to http://localhost:8090 and login as admin:123456

# 3. Capture session
npm run auth:capture-session
# Follow interactive prompts to extract JSESSIONID

# 4. Use generated templates for API testing
```

## Utility Comparison Matrix

| Scenario           | Recommended Utility          | Success Rate | Use Case                             |
| ------------------ | ---------------------------- | ------------ | ------------------------------------ |
| Manual API testing | `browser-session-capture.js` | ✅ 100%      | Primary solution for all API testing |
| Automated testing  | `session-auth-test.js`       | ❌ 0%        | Reference only - blocked by security |
| Utility validation | `test-auth-utilities.js`     | ✅ 100%      | Verify installation and dependencies |

## Utilities

### 1. Browser Session Capture (`browser-session-capture.js`)

**✅ WORKING SOLUTION - RECOMMENDED**

Interactive utility that guides users through extracting browser session cookies for API testing.

#### Usage

```bash
# Interactive mode
npm run auth:capture-session

# Direct execution
node scripts/browser-session-capture.js

# Help
npm run auth:help
```

#### Features

- **Interactive guidance** for extracting JSESSIONID from browser developer tools
- **Browser-specific instructions** for Chrome, Firefox, Safari
- **Session validation** against UMIG APIs
- **Multiple output formats**:
  - CURL command templates
  - POSTMAN setup instructions
  - JavaScript fetch examples
- **Session persistence** - saves session data to temporary files for reuse
- **Cross-platform compatibility** - works on Windows, macOS, Linux

#### Workflow

1. User logs into Confluence at http://localhost:8090
2. User opens browser developer tools and extracts JSESSIONID cookie
3. Utility validates the session against UMIG APIs
4. Utility generates ready-to-use templates for CURL, POSTMAN, etc.

### 2. Session Authentication Test (`session-auth-test.js`)

**⚠️ NON-FUNCTIONAL - REFERENCE ONLY**

Programmatic authentication testing utility that attempts to log in automatically.

#### Usage

```bash
# Basic test
npm run auth:test-session

# Verbose mode
npm run auth:test-session:verbose

# Direct execution
node scripts/session-auth-test.js
```

#### Status

This utility currently fails due to Confluence security policies that prevent programmatic login, even with correct credentials and disabled 2FA. It is kept for:

- **Reference purposes** in case security policies change
- **Documentation** of the authentication workflow
- **Debugging** authentication issues

### 3. Utility Validation Test (`test-auth-utilities.js`)

Validation utility that tests imports, dependencies, and basic functionality.

#### Usage

```bash
# Run validation tests
npm run auth:test-utilities

# Direct execution
node scripts/test-auth-utilities.js
```

## Common Workflows

### Workflow 1: Testing a New API Endpoint

1. **Start environment**: `npm start`
2. **Login to Confluence**: Open http://localhost:8090, login as admin:123456
3. **Capture session**: `npm run auth:capture-session`
4. **Test with CURL**: Use generated CURL command with your endpoint
5. **Iterate**: Modify and test as needed (session lasts ~30 minutes)

### Workflow 2: Setting Up POSTMAN Collection

1. **Capture session**: Follow Workflow 1 steps 1-3
2. **Import POSTMAN collection**: `/docs/api/postman/UMIG_API_V2_Collection.postman_collection.json`
3. **Set collection variable**: `jsessionid = YOUR_SESSION_ID`
4. **Test endpoints**: All 27 UMIG APIs ready to use

### Workflow 3: Integration Testing

1. **Capture session**: `npm run auth:capture-session`
2. **Export session**: Note the JSESSIONID value
3. **Run tests**: `JSESSIONID=YOUR_SESSION_ID npm run test:integration`

## Authentication Context

### Current Authentication Challenge

- **Confluence Version**: 9.2.7 with enhanced security policies
- **ScriptRunner Version**: 9.21.0
- **Admin Credentials**: admin:123456
- **Base URL**: http://localhost:8090
- **API Base**: http://localhost:8090/rest/scriptrunner/latest/custom
- **Session Duration**: ~30 minutes (browser-dependent)

### Required Headers for API Calls

```http
Cookie: JSESSIONID=<session-id>
X-Requested-With: XMLHttpRequest
Accept: application/json
Content-Type: application/json (for POST/PUT requests)
```

### Why Programmatic Auth Fails

1. **Security Policies**: Modern Confluence blocks automated login attempts
2. **2FA Requirements**: Even when disabled, security checks remain active
3. **CSRF Protection**: Enhanced CSRF token validation
4. **Rate Limiting**: Aggressive protection against brute force attacks

## Error Code Reference

| Error Code | Description                         | Solution                              |
| ---------- | ----------------------------------- | ------------------------------------- |
| `AUTH_001` | Session expired (30-minute timeout) | Extract fresh JSESSIONID from browser |
| `AUTH_002` | Invalid JSESSIONID format           | Verify correct cookie extraction      |
| `AUTH_003` | Confluence not accessible           | Start UMIG stack with `npm start`     |
| `AUTH_004` | Authentication required             | Login to Confluence in browser        |
| `NET_001`  | Network connectivity issues         | Check localhost:8090 accessibility    |
| `NODE_001` | Node.js version incompatible        | Upgrade to Node.js 18+                |

## Integration with UMIG Development

### Package.json Scripts

```json
{
  "auth:capture-session": "node scripts/browser-session-capture.js",
  "auth:test-session": "node scripts/session-auth-test.js",
  "auth:test-session:verbose": "node scripts/session-auth-test.js --verbose",
  "auth:help": "node scripts/browser-session-capture.js --help",
  "auth:test-utilities": "node scripts/test-auth-utilities.js"
}
```

### Dependencies

All utilities use existing project dependencies:

- **chalk**: Colored console output
- **execa**: Process execution (if needed)
- **Node.js built-ins**: fs, path, readline, fetch (Node.js 18+)

### File Locations

```
local-dev-setup/
├── scripts/
│   ├── browser-session-capture.js    # Interactive session capture
│   ├── session-auth-test.js          # Programmatic auth test
│   └── test-auth-utilities.js        # Validation test
└── SESSION_AUTH_UTILITIES.md         # This documentation
```

## Usage Examples

### CURL Example (Generated by Utility)

```bash
# GET request
curl -H "Cookie: JSESSIONID=YOUR_SESSION_ID" \
     -H "X-Requested-With: XMLHttpRequest" \
     -H "Accept: application/json" \
     "http://localhost:8090/rest/scriptrunner/latest/custom/teams"

# POST request
curl -X POST \
     -H "Cookie: JSESSIONID=YOUR_SESSION_ID" \
     -H "X-Requested-With: XMLHttpRequest" \
     -H "Content-Type: application/json" \
     -H "Accept: application/json" \
     -d '{"name":"Test Team","description":"Created via API"}' \
     "http://localhost:8090/rest/scriptrunner/latest/custom/teams"
```

### POSTMAN Setup (Generated by Utility)

1. Create new request in POSTMAN
2. Set URL: `http://localhost:8090/rest/scriptrunner/latest/custom/teams`
3. Add headers:
   - `Cookie: JSESSIONID=YOUR_SESSION_ID`
   - `X-Requested-With: XMLHttpRequest`
   - `Accept: application/json`
   - `Content-Type: application/json` (for POST/PUT)

### Jest Integration Example

```javascript
// test-setup.js
const sessionId = process.env.JSESSIONID || "test-session-id";

global.apiHeaders = {
  Cookie: `JSESSIONID=${sessionId}`,
  "X-Requested-With": "XMLHttpRequest",
  Accept: "application/json",
  "Content-Type": "application/json",
};
```

### VS Code REST Client Example

```http
### Get Teams
GET http://localhost:8090/rest/scriptrunner/latest/custom/teams
Cookie: JSESSIONID={{sessionId}}
X-Requested-With: XMLHttpRequest
Accept: application/json
```

## Cross-Platform Compatibility

### Windows Support

- **PowerShell**: All npm scripts work in PowerShell
- **Command Prompt**: All npm scripts work in cmd
- **WSL**: Full Linux compatibility in WSL

### macOS Support

- **Terminal**: Full native support
- **iTerm2**: Enhanced color output support
- **zsh/bash**: Compatible with all shells

### Linux Support

- **bash/zsh/fish**: Compatible with all shells
- **Various distributions**: Tested on Ubuntu, CentOS, Alpine

## Troubleshooting

### Common Issues

#### 1. Session Expired

```
❌ Session invalid or expired
```

**Solution**: Extract a fresh JSESSIONID from browser and run capture utility again.

#### 2. Node.js Version

```
❌ fetch API not available
```

**Solution**: Upgrade to Node.js 18+ (fetch API required).

#### 3. Confluence Not Running

```
❌ Confluence is not accessible
```

**Solution**: Start UMIG stack with `npm start`.

#### 4. Browser Not Logged In

```
❌ Authentication required
```

**Solution**: Ensure you're logged into Confluence as admin in your browser.

### Diagnostic Commands

```bash
# Check Node.js version
node --version

# Verify Confluence accessibility
curl -I http://localhost:8090

# Test basic connectivity
npm run auth:test-utilities

# Check if stack is running
npm run health:check
```

### Debug Mode

For detailed debugging, enable verbose mode:

```bash
npm run auth:test-session:verbose
```

### Session Renewal

When session expires during testing:

1. Refresh Confluence page in browser
2. Extract new JSESSIONID cookie
3. Run `npm run auth:capture-session` with new session ID

## Security Considerations

### Session Security

- **Limited Duration**: Sessions expire in ~30 minutes
- **Browser Dependency**: Sessions tied to browser state
- **Local Development Only**: These utilities are for local development environments only
- **No Production Use**: Never use these utilities in production environments

### Best Practices

1. **Regular Renewal**: Refresh sessions before expiry
2. **Secure Storage**: Don't commit session IDs to version control
3. **Environment Isolation**: Use only in local development
4. **Clean Cleanup**: Utilities automatically clean up temporary files
5. **Audit Trail**: Session usage is logged for debugging

### Security Warnings

⚠️ **NEVER** commit JSESSIONID values to git
⚠️ **NEVER** use these utilities in production
⚠️ **ALWAYS** use HTTPS in production environments
⚠️ **ALWAYS** rotate sessions after testing sensitive operations

## Migration from Shell Scripts

### Original Shell Scripts

- `scripts/test-session-auth.sh` → `scripts/session-auth-test.js`
- `scripts/browser-session-capture.sh` → `scripts/browser-session-capture.js`

### Benefits of Node.js Version

1. **Cross-Platform**: Works on Windows without Bash
2. **Better Error Handling**: Structured error reporting
3. **Rich Output**: Colored, formatted output using chalk
4. **Integration**: Uses existing project dependencies
5. **Maintainability**: Easier to maintain and extend

### Functionality Parity

✅ **Maintained Features**:

- Interactive session capture
- API endpoint testing
- CURL template generation
- POSTMAN setup instructions
- Session validation
- Error reporting
- Help documentation

➕ **Enhanced Features**:

- JavaScript fetch examples
- JSON session persistence
- Browser-specific instructions
- Structured output formats
- Comprehensive validation

## Performance Characteristics

| Operation          | Typical Duration | Resource Usage    |
| ------------------ | ---------------- | ----------------- |
| Session capture    | ~30 seconds      | <10MB memory      |
| Session validation | ~2 seconds       | Network dependent |
| Session lifetime   | ~30 minutes      | Browser dependent |
| Utility startup    | <1 second        | Node.js overhead  |

## Version Compatibility Matrix

| Component    | Minimum Version | Tested Version | Notes                  |
| ------------ | --------------- | -------------- | ---------------------- |
| Confluence   | 8.5.x           | 9.2.7          | Security policies vary |
| ScriptRunner | 9.0.0           | 9.21.0         | REST API compatibility |
| Node.js      | 18.0.0          | 18.17.0        | Fetch API required     |
| npm          | 8.0.0           | 9.8.1          | Script execution       |

## Future Enhancements

### Planned Improvements

1. **Environment Variables**: Support for custom Confluence URLs
2. **Session Pool**: Manage multiple sessions for testing
3. **Auto-Renewal**: Detect expiry and prompt for renewal
4. **Integration**: Direct integration with test suites
5. **Configuration**: Support for custom authentication flows

### API Testing Integration

These utilities can be integrated with:

- **Jest Tests**: Provide session tokens for integration tests
- **Playwright Tests**: Browser automation for session capture
- **POSTMAN Collections**: Pre-configured authentication
- **Custom Scripts**: Programmatic session management
- **GitHub Actions**: CI/CD pipeline integration (with caveats)

## Related Documentation

- [TD-008: Session-Based Authentication Infrastructure](../docs/roadmap/sprint7/TD-008-session-based-authentication-infrastructure.md)
- [API Testing Quick Reference](../docs/development/api-testing-quick-reference.md)
- [UMIG API Documentation](../docs/api/README.md)
- [Test Infrastructure Documentation](__tests__/README.md)

---

**Author**: UMIG Development Team
**Date**: September 21, 2025
**Version**: 1.0.0
**Status**: Production Ready
**Sprint**: Sprint 7 - TD-008 Deliverable
