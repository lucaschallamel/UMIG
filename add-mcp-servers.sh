#!/bin/bash

# Add MCP servers to Claude Code

echo "Adding MCP servers to Claude Code..."

# 1. context7 server
echo "Adding context7 server..."
/Users/lucaschallamel/.claude/local/claude mcp add context7 -- npx -y @upstash/context7-mcp

# 2. memory server
echo "Adding memory server..."
/Users/lucaschallamel/.claude/local/claude mcp add memory -- npx -y @modelcontextprotocol/server-memory

# 3. git server
echo "Adding git server..."
/Users/lucaschallamel/.claude/local/claude mcp add git -- uvx mcp-server-git

# 4. sequential-thinking server
echo "Adding sequential-thinking server..."
/Users/lucaschallamel/.claude/local/claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking

# 5. filesystem server
echo "Adding filesystem server..."
/Users/lucaschallamel/.claude/local/claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem /Users/lucaschallamel/Documents/GitHub

# 6. brave-search server (with API key)
echo "Adding brave-search server..."
/Users/lucaschallamel/.claude/local/claude mcp add brave-search -e BRAVE_API_KEY=BSAmy0tcb38bE_wIUHry0XzENXFWYjn -- npx -y @modelcontextprotocol/server-brave-search

# 7. fetch server
echo "Adding fetch server..."
/Users/lucaschallamel/.claude/local/claude mcp add fetch -- uvx mcp-server-fetch

# 8. puppeteer server
echo "Adding puppeteer server..."
/Users/lucaschallamel/.claude/local/claude mcp add puppeteer -- npx -y @modelcontextprotocol/server-puppeteer

# 9. antvis chart server
echo "Adding antvis chart server..."
/Users/lucaschallamel/.claude/local/claude mcp add antvis-chart -- npx -y @antv/mcp-server-chart

echo "Done! All MCP servers have been added."
echo ""
echo "You can verify with: claude mcp list"