# Session-Based API Testing Guide for UMIG

**Document Status**: Complete
**Created**: September 21, 2025
**Version**: 1.1 - Updated with Working Solution
**Purpose**: Complete guide for testing UMIG APIs using session-based authentication with CURL and POSTMAN

## ✅ WORKING SOLUTION - Browser Session Capture

**🎯 SUCCESSFUL AUTHENTICATION METHOD**: We've successfully resolved the UMIG API authentication challenges using browser session capture. This is the **PROVEN WORKING APPROACH** for testing UMIG APIs externally.

### Authentication Success Pattern

```bash
# ✅ WORKING CURL COMMAND (Tested & Verified)
curl -H "Cookie: JSESSIONID=857FB6E375EAF087D86BA341ED45A4AB" \
     -H "X-Requested-With: XMLHttpRequest" \
     -H "Accept: application/json" \
     "http://localhost:8090/rest/scriptrunner/latest/custom/teams"
```

### Required Headers for All Requests

1. **Cookie Header**: `Cookie: JSESSIONID=<session_id_from_browser>`
2. **AJAX Header**: `X-Requested-With: XMLHttpRequest`
3. **Accept Header**: `Accept: application/json`

### Step-by-Step Browser Session Capture

#### 1. Log into Confluence Web Interface

1. Open browser and navigate to `http://localhost:8090`
2. Login with admin credentials (`admin:123456`)
3. Navigate to any page (e.g., Dashboard)

#### 2. Extract JSESSIONID from Browser

**Chrome/Firefox Developer Tools**:

1. Press `F12` to open Developer Tools
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Expand **Cookies** → `http://localhost:8090`
4. Find `JSESSIONID` cookie and copy its **Value**
5. Example: `857FB6E375EAF087D86BA341ED45A4AB`

**Alternative - From Network Tab**:

1. In Developer Tools, go to **Network** tab
2. Make any request to Confluence
3. Check request headers for `Cookie: JSESSIONID=...`

#### 3. Use Session ID in API Calls

```bash
# Template for all API calls
curl -H "Cookie: JSESSIONID=YOUR_SESSION_ID_HERE" \
     -H "X-Requested-With: XMLHttpRequest" \
     -H "Accept: application/json" \
     "http://localhost:8090/rest/scriptrunner/latest/custom/ENDPOINT"

# Working Examples
curl -H "Cookie: JSESSIONID=857FB6E375EAF087D86BA341ED45A4AB" \
     -H "X-Requested-With: XMLHttpRequest" \
     -H "Accept: application/json" \
     "http://localhost:8090/rest/scriptrunner/latest/custom/teams"

curl -H "Cookie: JSESSIONID=857FB6E375EAF087D86BA341ED45A4AB" \
     -H "X-Requested-With: XMLHttpRequest" \
     -H "Accept: application/json" \
     "http://localhost:8090/rest/scriptrunner/latest/custom/users"
```

### Session Management Tips

1. **Session Expiry**: Browser sessions typically last 30 minutes of inactivity
2. **Refresh Process**: When session expires, re-extract JSESSIONID from browser
3. **Validation**: Test with `teams-test-auth` endpoint first
4. **Multiple Sessions**: Each browser tab maintains same session

### POSTMAN Configuration with Session

1. **Environment Variables**:

   ```json
   {
     "jsessionid": "857FB6E375EAF087D86BA341ED45A4AB",
     "base_url": "http://localhost:8090",
     "api_base": "{{base_url}}/rest/scriptrunner/latest/custom"
   }
   ```

2. **Request Headers**:

   ```json
   {
     "Cookie": "JSESSIONID={{jsessionid}}",
     "X-Requested-With": "XMLHttpRequest",
     "Accept": "application/json"
   }
   ```

3. **When Session Expires**:
   - Extract new JSESSIONID from browser
   - Update the `jsessionid` environment variable
   - Continue testing

### Working CURL Templates

```bash
# GET Request
curl -H "Cookie: JSESSIONID=YOUR_SESSION_ID" \
     -H "X-Requested-With: XMLHttpRequest" \
     -H "Accept: application/json" \
     "http://localhost:8090/rest/scriptrunner/latest/custom/teams"

# POST Request
curl -X POST \
     -H "Cookie: JSESSIONID=YOUR_SESSION_ID" \
     -H "X-Requested-With: XMLHttpRequest" \
     -H "Content-Type: application/json" \
     -H "Accept: application/json" \
     -d '{"name":"Test Team","description":"Created via API"}' \
     "http://localhost:8090/rest/scriptrunner/latest/custom/teams"

# PUT Request
curl -X PUT \
     -H "Cookie: JSESSIONID=YOUR_SESSION_ID" \
     -H "X-Requested-With: XMLHttpRequest" \
     -H "Content-Type: application/json" \
     -H "Accept: application/json" \
     -d '{"name":"Updated Team"}' \
     "http://localhost:8090/rest/scriptrunner/latest/custom/teams/TEAM_ID"

# DELETE Request
curl -X DELETE \
     -H "Cookie: JSESSIONID=YOUR_SESSION_ID" \
     -H "X-Requested-With: XMLHttpRequest" \
     -H "Accept: application/json" \
     "http://localhost:8090/rest/scriptrunner/latest/custom/teams/TEAM_ID"
```

### Troubleshooting Session Capture

1. **Invalid Session Error**: Re-extract JSESSIONID from fresh browser login
2. **403 Forbidden**: Ensure `X-Requested-With: XMLHttpRequest` header is included
3. **401 Unauthorized**: Check if admin user has proper permissions
4. **Session Not Found**: Browser might be in incognito mode or cookies disabled

---

## Overview

Due to enhanced security implementations in UMIG, external API testing now requires session-based authentication instead of basic auth. This document provides complete workflows for CURL and POSTMAN testing.

## Security Architecture Changes

### What Changed

- **Session-based authentication** now takes precedence over basic auth
- **CSRF protection** requires `X-CSRF-Token` headers for state-changing requests
- **Security headers** like `X-Requested-With: XMLHttpRequest` are required
- **Confluence session cookies** needed via `credentials: 'same-origin'`

### Why Basic Auth Fails

- Missing CSRF tokens that SecurityUtils automatically generates
- No Confluence session cookies
- Missing required security headers
- Basic auth is now fallback-only, not primary

## Prerequisites

1. **Two-step authentication disabled** in Confluence admin settings
2. **Admin credentials**: `admin:123456` (default development)
3. **Confluence running**: http://localhost:8090
4. **ScriptRunner APIs active**: `/rest/scriptrunner/latest/custom/`

## Session-Based Authentication Workflow

### Phase 1: Get Session Cookie and CSRF Token

```bash
# Step 1: Get login page with session cookie
curl -c /tmp/confluence_session.txt \
  "http://localhost:8090/login.action" \
  > /tmp/login_page.html

# Step 2: Extract CSRF token from login page
CSRF_TOKEN=$(grep 'atlassian-token' /tmp/login_page.html | \
  grep -o 'content="[^"]*"' | cut -d'"' -f2)
echo "CSRF Token: $CSRF_TOKEN"

# Step 3: Authenticate and get session
curl -b /tmp/confluence_session.txt \
  -c /tmp/confluence_session.txt \
  -X POST "http://localhost:8090/dologin.action" \
  -d "os_username=admin&os_password=123456&atl_token=$CSRF_TOKEN" \
  -H "X-Atlassian-Token: $CSRF_TOKEN" \
  -H "Content-Type: application/x-www-form-urlencoded"

# Step 4: Verify session is established
curl -b /tmp/confluence_session.txt \
  "http://localhost:8090/dashboard.action" \
  -I | grep "200 OK"
```

### Phase 2: Test API Access with Session

```bash
# Test basic API access with session
curl -b /tmp/confluence_session.txt \
  -H "X-Requested-With: XMLHttpRequest" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  "http://localhost:8090/rest/scriptrunner/latest/custom/teams"

# Test development authentication endpoint
curl -b /tmp/confluence_session.txt \
  "http://localhost:8090/rest/scriptrunner/latest/custom/teams-test-auth"

# Test with additional security headers
curl -b /tmp/confluence_session.txt \
  -H "X-Requested-With: XMLHttpRequest" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "X-Atlassian-Token: no-check" \
  -H "Content-Type: application/json" \
  "http://localhost:8090/rest/scriptrunner/latest/custom/teams"
```

### Phase 3: Make API Calls with Full Headers

```bash
# GET request with session
curl -b /tmp/confluence_session.txt \
  -H "X-Requested-With: XMLHttpRequest" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Accept: application/json" \
  "http://localhost:8090/rest/scriptrunner/latest/custom/teams"

# POST request with session and CSRF protection
curl -b /tmp/confluence_session.txt \
  -X POST \
  -H "X-Requested-With: XMLHttpRequest" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"name":"Test Team","description":"Created via API"}' \
  "http://localhost:8090/rest/scriptrunner/latest/custom/teams"

# PUT request with session
curl -b /tmp/confluence_session.txt \
  -X PUT \
  -H "X-Requested-With: XMLHttpRequest" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Team"}' \
  "http://localhost:8090/rest/scriptrunner/latest/custom/teams/{team-id}"

# DELETE request with session
curl -b /tmp/confluence_session.txt \
  -X DELETE \
  -H "X-Requested-With: XMLHttpRequest" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  "http://localhost:8090/rest/scriptrunner/latest/custom/teams/{team-id}"
```

## Complete CURL Script

Create a reusable script for session-based testing:

```bash
#!/bin/bash
# File: test-umig-apis.sh

BASE_URL="http://localhost:8090"
API_BASE="$BASE_URL/rest/scriptrunner/latest/custom"
SESSION_FILE="/tmp/confluence_session.txt"

# Function to get CSRF token and establish session
authenticate() {
    echo "🔐 Authenticating with Confluence..."

    # Get login page and session
    curl -c "$SESSION_FILE" "$BASE_URL/login.action" > /tmp/login_page.html

    # Extract CSRF token
    CSRF_TOKEN=$(grep 'atlassian-token' /tmp/login_page.html | \
      grep -o 'content="[^"]*"' | cut -d'"' -f2)

    if [ -z "$CSRF_TOKEN" ]; then
        echo "❌ Failed to extract CSRF token"
        exit 1
    fi

    echo "✅ CSRF Token: $CSRF_TOKEN"

    # Authenticate
    AUTH_RESPONSE=$(curl -b "$SESSION_FILE" -c "$SESSION_FILE" \
      -X POST "$BASE_URL/dologin.action" \
      -d "os_username=admin&os_password=123456&atl_token=$CSRF_TOKEN" \
      -H "X-Atlassian-Token: $CSRF_TOKEN" \
      -w "%{http_code}" -o /tmp/auth_response.txt)

    if [ "$AUTH_RESPONSE" = "200" ] || [ "$AUTH_RESPONSE" = "302" ]; then
        echo "✅ Authentication successful"
        export CSRF_TOKEN
        return 0
    else
        echo "❌ Authentication failed (HTTP $AUTH_RESPONSE)"
        cat /tmp/auth_response.txt
        exit 1
    fi
}

# Function to test API endpoint
test_api() {
    local method="$1"
    local endpoint="$2"
    local data="$3"

    echo "🧪 Testing $method $endpoint"

    if [ "$method" = "GET" ]; then
        curl -b "$SESSION_FILE" \
          -H "X-Requested-With: XMLHttpRequest" \
          -H "X-CSRF-Token: $CSRF_TOKEN" \
          -H "Accept: application/json" \
          "$API_BASE/$endpoint"
    else
        curl -b "$SESSION_FILE" \
          -X "$method" \
          -H "X-Requested-With: XMLHttpRequest" \
          -H "X-CSRF-Token: $CSRF_TOKEN" \
          -H "Content-Type: application/json" \
          -H "Accept: application/json" \
          -d "$data" \
          "$API_BASE/$endpoint"
    fi

    echo -e "\n"
}

# Main execution
main() {
    echo "🚀 UMIG API Testing Script"
    echo "=========================="

    # Authenticate
    authenticate

    # Test various endpoints
    echo "📋 Testing API endpoints..."

    test_api "GET" "teams-test-auth"
    test_api "GET" "teams"
    test_api "GET" "users"
    test_api "GET" "environments"
    test_api "GET" "applications"
    test_api "GET" "labels"

    echo "✅ Testing complete"
}

# Run if script is executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
```

## POSTMAN Configuration

### ✅ Updated POSTMAN Environment Setup

**IMPORTANT**: The POSTMAN collection has been updated to use the working session-based authentication. Use this simplified environment setup:

```json
{
  "name": "UMIG Development - Session Auth",
  "values": [
    {
      "key": "baseUrl",
      "value": "http://localhost:8090/rest/scriptrunner/latest/custom",
      "enabled": true,
      "type": "default"
    },
    {
      "key": "jsessionid",
      "value": "EXTRACT_FROM_BROWSER_COOKIES",
      "enabled": true,
      "type": "default"
    },
    {
      "key": "sessionCookie",
      "value": "JSESSIONID={{jsessionid}}",
      "enabled": true,
      "type": "default"
    }
  ]
}
```

**Setup Steps**:

1. Import the updated POSTMAN collection from `docs/api/postman/UMIG_API_V2_Collection.postman_collection.json`
2. Create the environment above or use the collection's built-in variables
3. Extract JSESSIONID from browser and update the `jsessionid` variable
4. All requests will automatically use the correct headers

### ✅ Simplified Authentication (No Pre-request Script Needed)

**GOOD NEWS**: The updated POSTMAN collection uses browser session capture, which is much simpler than complex pre-request scripts.

**How it works**:

1. The collection includes built-in variables for session management
2. All requests automatically include the required headers
3. You only need to update the `jsessionid` variable when the session expires

**No complex scripts needed** - just update one variable!

### ✅ Automatic Request Headers (Already Configured)

The updated POSTMAN collection **automatically includes** these headers in every request:

```json
{
  "Cookie": "{{sessionCookie}}",
  "X-Requested-With": "XMLHttpRequest",
  "Accept": "application/json",
  "Content-Type": "application/json"
}
```

**You don't need to add these manually** - they're already configured in every request in the collection!

### ✅ Ready-to-Use POSTMAN Requests

The collection includes pre-configured requests for all UMIG endpoints. Here are key examples:

#### 1. Test Authentication (Always test this first)

```
GET {{baseUrl}}/teams-test-auth
```

_Headers: Automatically configured_

#### 2. Get Teams

```
GET {{baseUrl}}/teams
```

_Headers: Automatically configured_

#### 3. Create Team

```
POST {{baseUrl}}/teams
Body (JSON):
{
  "name": "Test Team",
  "description": "Created via POSTMAN"
}
```

_Headers: Automatically configured_

**All 27 UMIG API endpoints** are included in the collection with proper session authentication configured!

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check if 2-step verification is disabled
   - Verify session cookie is valid
   - Ensure CSRF token is current

2. **403 Forbidden**
   - Check user permissions
   - Verify API endpoint exists
   - Check security headers

3. **404 Not Found**
   - Verify API endpoint URL
   - Check if ScriptRunner is running
   - Verify API registration

### Debug Commands

```bash
# Check session cookie validity
curl -b /tmp/confluence_session.txt \
  "http://localhost:8090/dashboard.action" -I

# Test authentication endpoint
curl "http://localhost:8090/rest/scriptrunner/latest/custom/teams-test-auth"

# Check CSRF token
echo "Current CSRF Token: $CSRF_TOKEN"

# Verify headers are being sent
curl -v -b /tmp/confluence_session.txt \
  -H "X-Requested-With: XMLHttpRequest" \
  "http://localhost:8090/rest/scriptrunner/latest/custom/teams"
```

### Security Headers Reference

| Header              | Purpose                     | Required For       |
| ------------------- | --------------------------- | ------------------ |
| `X-Requested-With`  | AJAX request identification | All requests       |
| `X-CSRF-Token`      | CSRF protection             | POST/PUT/DELETE    |
| `X-Atlassian-Token` | Additional CSRF protection  | Some requests      |
| `Cookie`            | Session authentication      | All requests       |
| `Content-Type`      | Request body format         | POST/PUT with body |
| `Accept`            | Response format preference  | All requests       |

## Development Testing Endpoints

### Authentication Test Endpoint

- **URL**: `/teams-test-auth`
- **Method**: GET
- **Authentication**: None required
- **Purpose**: Test session and header extraction

### CSRF Token Endpoint (Future)

- **URL**: `/dev-testing/csrf-token`
- **Method**: GET
- **Authentication**: None required
- **Purpose**: Get CSRF token for external testing

## Security Considerations

1. **Development Only**: This workflow is for development environment only
2. **Session Expiry**: Sessions expire, re-authenticate if getting 401s
3. **CSRF Token Rotation**: Tokens rotate every 15 minutes, refresh as needed
4. **Secure Storage**: Never commit session files or tokens to version control

## Next Steps

1. **Test Workflow**: Once 2-step verification is disabled, test complete workflow
2. **POSTMAN Collection**: Create comprehensive collection with all UMIG endpoints
3. **Automation**: Create CI/CD compatible testing scripts
4. **Documentation**: Update API documentation with session requirements

## API Endpoints Reference

### Core Entities

- `GET /teams` - List teams
- `GET /users` - List users
- `GET /environments` - List environments
- `GET /applications` - List applications
- `GET /labels` - List labels

### Hierarchy Entities

- `GET /migrations` - List migrations
- `GET /iterations` - List iterations
- `GET /plans` - List plans
- `GET /sequences` - List sequences
- `GET /phases` - List phases
- `GET /steps` - List steps
- `GET /instructions` - List instructions

### Development Testing

- `GET /teams-test-auth` - Authentication test (no auth required)
- `GET /dev-testing/csrf-token` - Get CSRF token (future)
- `GET /dev-testing/headers` - Header inspection (future)

---

## ✅ Implementation Complete - Session-Based Authentication Working

### What Was Accomplished

1. **✅ Authentication Issue Resolved**: Successfully identified and implemented browser session capture method
2. **✅ Documentation Updated**: Added working solution section with step-by-step instructions
3. **✅ POSTMAN Collection Updated**: Modified generation script to use session-based authentication instead of basic auth
4. **✅ All Headers Configured**: Required headers (Cookie, X-Requested-With, Accept) automatically included
5. **✅ Simplified Workflow**: No complex pre-request scripts needed - just extract session ID and update variable

### Validation Results

- **Working CURL Command**: `curl -H "Cookie: JSESSIONID=session_id" -H "X-Requested-With: XMLHttpRequest" -H "Accept: application/json" "http://localhost:8090/rest/scriptrunner/latest/custom/teams"`
- **POSTMAN Collection**: Generated with session variables and required headers pre-configured
- **All 27 API Endpoints**: Ready for testing with session authentication

### Next Steps

1. **Import Collection**: Use `docs/api/postman/UMIG_API_V2_Collection.postman_collection.json`
2. **Extract Session**: Get JSESSIONID from browser after logging into Confluence
3. **Update Variable**: Set `jsessionid` environment variable in POSTMAN
4. **Test**: Start with `teams-test-auth` endpoint to validate session

**Status**: ✅ **COMPLETE AND WORKING**
**Contact**: Development Team
**Last Updated**: September 21, 2025 - Session Authentication Implementation Complete
