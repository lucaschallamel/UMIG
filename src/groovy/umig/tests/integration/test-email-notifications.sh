#!/bin/bash

# UMIG Email Notification Test Script
# This script tests the email notification endpoints using curl

BASE_URL="http://localhost:8090/rest/scriptrunner/latest/custom"
AUTH="admin:admin"

echo "=== UMIG Email Notification Tests ==="
echo ""

# First, get a list of steps to find one we can test
echo "1. Getting available steps..."
STEPS_RESPONSE=$(curl -s -u "$AUTH" "$BASE_URL/steps?limit=10")

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to connect to API"
    exit 1
fi

# Extract first step ID using grep and sed (works on most systems)
STEP_ID=$(echo "$STEPS_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"\([^"]*\)"/\1/')

if [ -z "$STEP_ID" ]; then
    echo "ERROR: No steps found in the system"
    echo "Response: $STEPS_RESPONSE"
    echo ""
    echo "You may need to generate test data first:"
    echo "  cd local-dev-setup"
    echo "  npm run generate-data"
    exit 1
fi

echo "Found step ID: $STEP_ID"
echo ""

# Test 1: Open a step
echo "2. Testing OPEN STEP endpoint..."
echo "   POST /steps/$STEP_ID/open"

OPEN_RESPONSE=$(curl -s -X POST \
    -u "$AUTH" \
    -H "Content-Type: application/json" \
    -d '{"userId": 1}' \
    "$BASE_URL/steps/$STEP_ID/open" \
    -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$OPEN_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$OPEN_RESPONSE" | grep -v "HTTP_STATUS")

echo "   Response Code: $HTTP_STATUS"
echo "   Response Body: $BODY"
echo ""

# Wait a bit between tests
sleep 2

# Test 2: Update step status
echo "3. Testing UPDATE STATUS endpoint..."
echo "   PUT /steps/$STEP_ID/status"

STATUS_RESPONSE=$(curl -s -X PUT \
    -u "$AUTH" \
    -H "Content-Type: application/json" \
    -d '{"status": "IN_PROGRESS", "userId": 1}' \
    "$BASE_URL/steps/$STEP_ID/status" \
    -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$STATUS_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$STATUS_RESPONSE" | grep -v "HTTP_STATUS")

echo "   Response Code: $HTTP_STATUS"
echo "   Response Body: $BODY"
echo ""

echo "=== Test Complete ==="
echo ""
echo "Check MailHog at http://localhost:8025 to see the emails sent"
echo "You should see:"
echo "  - Step opened notification"
echo "  - Step status changed notification"