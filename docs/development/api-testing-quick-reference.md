# API Testing Quick Reference

## Working Solution: Browser Session Capture

### For CURL Testing

1. Login to http://localhost:8090 as admin:123456
2. Extract JSESSIONID from Developer Tools > Application > Cookies
3. Use in CURL commands:

```bash
curl -H "Cookie: JSESSIONID=YOUR_SESSION_ID" \
     -H "X-Requested-With: XMLHttpRequest" \
     -H "Accept: application/json" \
     "http://localhost:8090/rest/scriptrunner/latest/custom/teams"
```

### For POSTMAN Testing

1. Extract JSESSIONID using browser method above
2. Set collection variable: `jsessionid = YOUR_SESSION_ID`
3. Generated collection automatically includes required headers

### Session Extraction Script

Use `/scripts/browser-session-capture.sh` for guided session extraction with testing.

### Note on Security

- Programmatic authentication currently blocked by Confluence security policies
- Browser session capture is the only working method for external API testing
- Sessions typically last 30 minutes

### POSTMAN Collection

Generated collection at `/docs/api/postman/UMIG_API_V2_Collection.postman_collection.json` includes:

- All 27 UMIG API endpoints
- Pre-configured session-based authentication
- Required headers for all requests
