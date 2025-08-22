#!/bin/bash

# Test Plans, Sequences, and Phases APIs

BASE_URL="http://localhost:8090/rest/scriptrunner/latest/custom"
AUTH="admin:Spaceop!13"

echo "Testing Plans API..."
echo "==================="
curl -s -u "$AUTH" "$BASE_URL/plans" | jq '.' 2>/dev/null || echo "Plans API failed"

echo ""
echo "Testing Sequences API..."
echo "======================="
curl -s -u "$AUTH" "$BASE_URL/sequences" | jq '.' 2>/dev/null || echo "Sequences API failed"

echo ""
echo "Testing Phases API..."
echo "==================="
curl -s -u "$AUTH" "$BASE_URL/phases" | jq '.' 2>/dev/null || echo "Phases API failed"

echo ""
echo "API Test Complete!"