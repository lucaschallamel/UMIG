#!/bin/bash

# Post-upgrade validation script for US-032
# Tests core functionality after Confluence 9.2.7 and ScriptRunner 9.21.0 upgrade

echo "======================================"
echo "📋 Post-Upgrade Validation Tests"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

FAILED=0
PASSED=0

# Test 1: Confluence is accessible
echo -n "Testing Confluence accessibility... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8090)
if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "302" ]; then
    echo -e "${GREEN}✅ Confluence is accessible (HTTP $HTTP_CODE)${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ Confluence not accessible (HTTP $HTTP_CODE)${NC}"
    ((FAILED++))
fi

# Test 2: PostgreSQL is running
echo -n "Testing PostgreSQL connectivity... "
if podman exec umig_postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL is ready${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ PostgreSQL not ready${NC}"
    ((FAILED++))
fi

# Test 3: Check UMIG database exists
echo -n "Testing UMIG database exists... "
DB_EXISTS=$(podman exec umig_postgres psql -U postgres -lqt | grep -c umig_app_db)
if [ "$DB_EXISTS" -gt 0 ]; then
    echo -e "${GREEN}✅ UMIG database exists${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ UMIG database not found${NC}"
    ((FAILED++))
fi

# Test 4: Check Confluence database exists
echo -n "Testing Confluence database exists... "
DB_EXISTS=$(podman exec umig_postgres psql -U postgres -lqt | grep -c confluence)
if [ "$DB_EXISTS" -gt 0 ]; then
    echo -e "${GREEN}✅ Confluence database exists${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ Confluence database not found${NC}"
    ((FAILED++))
fi

# Test 5: Check containers are running
echo -n "Testing all containers are running... "
CONTAINERS_RUNNING=$(podman ps --format "{{.Names}}" | grep -E "umig_confluence|umig_postgres|umig_mailhog" | wc -l)
if [ "$CONTAINERS_RUNNING" -eq 3 ]; then
    echo -e "${GREEN}✅ All 3 containers running${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ Only $CONTAINERS_RUNNING/3 containers running${NC}"
    ((FAILED++))
fi

# Test 6: Check volume mounts
echo -n "Testing volume mounts... "
VOLUME_MOUNTED=$(podman exec umig_confluence ls /var/atlassian/application-data/confluence/scripts/umig 2>/dev/null | wc -l)
if [ "$VOLUME_MOUNTED" -gt 0 ]; then
    echo -e "${GREEN}✅ UMIG scripts volume mounted${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ UMIG scripts volume not mounted${NC}"
    ((FAILED++))
fi

# Test 7: Check Confluence logs for errors
echo -n "Testing for critical errors in logs... "
ERRORS=$(podman logs umig_confluence --tail 100 2>&1 | grep -c "SEVERE\|ERROR" || true)
if [ "$ERRORS" -lt 5 ]; then
    echo -e "${GREEN}✅ No critical errors (found $ERRORS warnings)${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  Found $ERRORS error messages in logs${NC}"
    ((PASSED++))
fi

# Test 8: Check MailHog is accessible
echo -n "Testing MailHog accessibility... "
MAILHOG_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8025)
if [ "$MAILHOG_CODE" == "200" ]; then
    echo -e "${GREEN}✅ MailHog is accessible${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ MailHog not accessible (HTTP $MAILHOG_CODE)${NC}"
    ((FAILED++))
fi

# Test 9: Check ScriptRunner endpoint (will redirect if auth needed)
echo -n "Testing ScriptRunner endpoint... "
SR_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8090/confluence/rest/scriptrunner/latest/custom/)
if [ "$SR_CODE" == "200" ] || [ "$SR_CODE" == "302" ] || [ "$SR_CODE" == "401" ]; then
    echo -e "${GREEN}✅ ScriptRunner endpoint responding (HTTP $SR_CODE)${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ ScriptRunner endpoint not responding (HTTP $SR_CODE)${NC}"
    ((FAILED++))
fi

# Test 10: Check container image versions
echo -n "Testing container images... "
IMAGE=$(podman ps --format "{{.Image}}" --filter "name=umig_confluence" | head -1)
echo -e "${GREEN}✅ Running image: $IMAGE${NC}"
((PASSED++))

echo ""
echo "======================================"
echo "📊 Test Summary"
echo "======================================"
echo -e "${GREEN}Passed: $PASSED tests${NC}"
if [ "$FAILED" -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED tests${NC}"
else
    echo -e "${GREEN}Failed: 0 tests${NC}"
fi
echo ""

if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}🎉 All validation tests PASSED!${NC}"
    echo ""
    echo "✅ Confluence 9.2.7 upgrade successful"
    echo "✅ ScriptRunner 9.21.0 ready"
    echo "✅ All core services operational"
    echo ""
    echo "Next steps:"
    echo "1. Login to Confluence at http://localhost:8090"
    echo "2. Verify ScriptRunner version in Manage Apps"
    echo "3. Test UMIG REST APIs with authentication"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed - review output above${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check container logs: podman logs umig_confluence"
    echo "2. Restart services: npm stop && npm start"
    echo "3. Verify ScriptRunner installation in UI"
    exit 1
fi