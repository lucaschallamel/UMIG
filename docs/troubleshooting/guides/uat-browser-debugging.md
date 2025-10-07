# UAT Browser Debug Guide - Finding HTTP 400 Error Response

## Method 1: Chrome/Edge DevTools (Recommended)

1. **Open UAT Iteration View page**
2. **Open DevTools**: Press `F12` or `Cmd+Option+I` (Mac)
3. **Go to Network tab**
4. **Reload the page**: Press `Cmd+R` or `F5`
5. **Find the failed Teams request**:
   - Look for a red line in the list
   - Should say `teams?iterationId=...`
   - Status column shows `400`
6. **Click on that request**
7. **Look at the right panel** - there should be tabs at the top:
   - Headers
   - Preview ← **Try this one first**
   - Response ← **Or this one**
   - Initiator
   - Timing
8. **Click "Preview" or "Response" tab** to see the error JSON

## Method 2: Using Browser Console (Quick Check)

Paste this into the browser console while on UAT Iteration View:

```javascript
// Test the Teams API directly
fetch(
  "/rest/scriptrunner/latest/custom/teams?iterationId=328cf0e3-33f1-48e9-b6f3-c0f6d2472435",
)
  .then((response) => {
    console.log("Status:", response.status);
    return response.text();
  })
  .then((body) => {
    console.log("Response Body:", body);
    try {
      const json = JSON.parse(body);
      console.log("Parsed JSON:", json);
      console.log("Error Message:", json.error);
    } catch (e) {
      console.log("Not JSON, raw response:", body);
    }
  })
  .catch((err) => console.error("Fetch failed:", err));
```

## Method 3: Using curl (If you have command-line access)

```bash
# From UAT server or your machine (adjust URL for UAT)
curl -v 'https://your-uat-server.com/rest/scriptrunner/latest/custom/teams?iterationId=328cf0e3-33f1-48e9-b6f3-c0f6d2472435' \
  -H 'Cookie: your-session-cookie'
```

## Method 4: Firefox DevTools

1. **Open UAT page**
2. **Press F12** to open DevTools
3. **Go to Network tab**
4. **Reload page** (F5)
5. **Find the teams request** (red/400 status)
6. **Click on it**
7. **Look at the right side**:
   - Click "Response" tab
   - Should show JSON error

## What We're Looking For

The response should be JSON like:

```json
{
  "error": "Invalid iteration ID format"
}
```

Or:

```json
{
  "error": "Some other error message"
}
```

## Screenshot Alternative

If you still can't find it, take a screenshot of:

1. The Network tab with the failed request visible
2. The details panel on the right side showing whatever tabs you see

Then describe what you see or share the screenshot.
