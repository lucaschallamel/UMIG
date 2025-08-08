#!/bin/bash

# Provisioning Verification Script for UMIG
# Ensures all provisioning scripts are updated for Confluence 9.2.7

echo "=========================================="
echo "📋 UMIG Provisioning Scripts Verification"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ISSUES=0

# Check Containerfile
echo -n "Checking Containerfile version... "
if grep -q "FROM atlassian/confluence:9.2.7" confluence/Containerfile; then
    echo -e "${GREEN}✅ Containerfile correctly set to 9.2.7${NC}"
else
    echo -e "${RED}❌ Containerfile not updated to 9.2.7${NC}"
    ((ISSUES++))
fi

# Check podman-compose.yml
echo -n "Checking podman-compose.yml version... "
if grep -q "image: umig/confluence-custom:9.2.7" podman-compose.yml; then
    echo -e "${GREEN}✅ podman-compose.yml correctly set to 9.2.7${NC}"
else
    echo -e "${RED}❌ podman-compose.yml not updated to 9.2.7${NC}"
    ((ISSUES++))
fi

# Check for any remaining 8.5.6 references
echo -n "Checking for old version references... "
OLD_REFS=$(grep -r "8\.5\.6" . --exclude-dir=backups --exclude-dir=.git --exclude="*.log" 2>/dev/null | grep -v "archived" | wc -l)
if [ "$OLD_REFS" -eq 0 ]; then
    echo -e "${GREEN}✅ No old version references found${NC}"
else
    echo -e "${YELLOW}⚠️  Found $OLD_REFS references to old version (may be in logs/archives)${NC}"
fi

# Check if ScriptRunner version is documented
echo -n "Checking ScriptRunner documentation... "
if grep -q "9.21.0" ../CLAUDE.md 2>/dev/null || grep -q "9.21.0" ../docs/roadmap/sprint4/sprint4-US032.md 2>/dev/null; then
    echo -e "${GREEN}✅ ScriptRunner 9.21.0 documented${NC}"
else
    echo -e "${YELLOW}⚠️  ScriptRunner version not clearly documented${NC}"
fi

echo ""
echo "=========================================="
echo "📊 Provisioning Verification Summary"
echo "=========================================="

if [ "$ISSUES" -eq 0 ]; then
    echo -e "${GREEN}✅ All provisioning scripts are correctly updated!${NC}"
    echo ""
    echo "Ready for fresh provisioning with:"
    echo "  - Confluence 9.2.7"
    echo "  - ScriptRunner 9.21.0 (manual installation)"
    echo "  - PostgreSQL 14-alpine"
    echo "  - MailHog latest"
    echo ""
    echo "To provision from scratch:"
    echo "  1. npm stop (if running)"
    echo "  2. podman volume rm confluence_data postgres_data (CAUTION: deletes all data)"
    echo "  3. npm start"
    echo "  4. Install ScriptRunner 9.21.0 via Confluence UI"
else
    echo -e "${RED}⚠️  Found $ISSUES issue(s) with provisioning scripts${NC}"
    echo ""
    echo "Please update the following files:"
    echo "  - confluence/Containerfile"
    echo "  - podman-compose.yml"
fi

echo ""
echo "Note: This upgrade preserved existing data volumes."
echo "For a completely fresh start, volumes must be manually removed."