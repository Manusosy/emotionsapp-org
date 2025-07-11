# Supabase MCP Setup Guide for Emotions App

## Overview

This guide will help you connect your Emotions App to Supabase using the Model Context Protocol (MCP). Once configured, your AI assistant in Cursor (or other MCP-compatible tools) will be able to:

- Query your database directly
- Understand your schema automatically
- Create and modify tables
- Generate TypeScript types
- Manage migrations
- Access project configuration

## Prerequisites

- Supabase project (your Emotions App database)
- Cursor IDE or another MCP-compatible AI tool
- Node.js installed on your system

## Step 1: Create Supabase Personal Access Token

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **Settings** → **Access Tokens**
3. Click **Create new token**
4. Name it "Emotions App MCP" or similar
5. **Copy and save the token securely** - you won't see it again!

## Step 2: Find Your Project Reference

Your project reference is in your Supabase URL. For your Emotions App, the URL is:
```
https://hibeorkevqignkinaafy.supabase.co
```

So your project reference is: `hibeorkevqignkinaafy`

You can also find it in:
- Your Supabase dashboard URL
- Your project settings
- Your existing environment variables (`VITE_SUPABASE_URL`)

## Step 3: Configure MCP

### For Cursor IDE

1. **The `.cursor` directory and `mcp.json` file have been created in this repo**
2. **The configuration has been updated with your actual Emotions App credentials:**
   - Project Reference: `hibeorkevqignkinaafy`
   - Personal Access Token: `sbp_595ec1c58ec0d943e82ab64a20ff05fe1e78084a` (already configured)

3. **Save the file**
4. **Restart Cursor**
5. **Check MCP status**: Go to Cursor **Settings** → **MCP** - you should see a green active status

## Step 4: Test the Connection

Once configured, test your MCP connection by asking your AI assistant:

1. **"What tables are in my database?"**
2. **"Show me the schema for the profiles table"**
3. **"Generate TypeScript types for my database"**
4. **"What's my project configuration?"**

## Available MCP Tools

Your AI assistant will have access to these Supabase tools:

### Database Operations
- `list_tables` - List all tables in your database
- `execute_sql` - Run SQL queries (read-only by default)
- `get_table_schema` - Get detailed schema information

### Project Management
- `get_project_config` - Fetch project configuration
- `list_projects` - List all your Supabase projects
- `create_project` - Create new Supabase projects

### Development
- `generate_types` - Generate TypeScript types from your schema
- `create_migration` - Create database migrations
- `run_migration` - Execute migrations

### Monitoring
- `get_logs` - Retrieve project logs for debugging
- `get_metrics` - Access project metrics

## Security Considerations

### Read-Only Mode (Recommended)
The configuration uses `--read-only` mode, which:
- ✅ Allows querying data
- ✅ Allows schema inspection
- ✅ Allows project management operations
- ❌ Prevents data modification
- ❌ Prevents destructive operations

### Full Access Mode
To enable write operations, remove `--read-only` from the args in the mcp.json file.

**⚠️ Warning**: Full access mode allows the AI to modify your database. Use with caution!

## Troubleshooting

### Common Issues

1. **"Server not connecting"**
   - Verify your personal access token is correct
   - Check your project reference is accurate
   - Ensure you have internet connectivity

2. **"Permission denied"**
   - Confirm your personal access token has the necessary permissions
   - Check if your Supabase project is active

3. **"MCP server not found"**
   - Ensure Node.js is installed
   - Try running `npx @supabase/mcp-server-supabase@latest --help` manually

## Example Conversations

Try these prompts with your AI assistant:

- "Analyze my database schema and suggest improvements"
- "Create a migration to add an index on the created_at column"
- "Show me all users who haven't logged in for 30 days"
- "Generate TypeScript interfaces for all my tables"
- "What are the recent errors in my project logs?"

## Resources

- [Supabase MCP Documentation](https://supabase.com/docs/guides/getting-started/mcp)
- [Model Context Protocol Specification](https://spec.modelcontextprotocol.io/)
- [Supabase MCP Server GitHub](https://github.com/supabase/mcp-server-supabase)
 