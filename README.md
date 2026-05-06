# Beam

**AI-powered marketing intelligence via MCP.**

## Why

The way AI agents interact with business tools is fragmented. Every company has data scattered across Google Analytics, Search Console, HubSpot, PostHog, and dozens of other platforms. When you ask an AI to help with marketing, it can't see any of this context.

**Cogny** pioneered a solution: a "nested MCP" that centralizes all your marketing tools behind a single Model Context Protocol endpoint. AI agents connect once and get access to everything—analytics, SEO data, CRM, product metrics.

We're building **Beam** to replicate and extend this architecture:

1. **One MCP, all your tools** — Connect Google Analytics, Search Console, PostHog, etc. once. Every AI agent (Claude, Cursor, custom) gets unified access.

2. **Multi-tenant workspaces** — Agencies can manage multiple clients. Each workspace is isolated with its own integrations, context, and API keys.

3. **Context layer** — Store company info, competitors, strategy docs. AI agents read this before analyzing data, so insights are actually relevant.

4. **Ticket-based opportunities** — AI agents create actionable tickets when they find opportunities. "$15k/month potential, 80% confidence" — not vague suggestions.

## How

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        AI Agents                            │
│              (Claude, Cursor, Custom Apps)                  │
└─────────────────────────┬───────────────────────────────────┘
                          │ MCP Protocol (JSON-RPC over HTTP)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     Beam API                                │
│               (Cloudflare Workers + Hono)                   │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ MCP Server  │  │ REST API    │  │ OAuth Handlers      │ │
│  │ /mcp/w/:id  │  │ /api/*      │  │ /auth/callback/*    │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ PostgreSQL   │  │ Auth         │  │ Vault            │  │
│  │ (Drizzle)    │  │ (GoTrue)     │  │ (OAuth tokens)   │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Third-Party APIs                           │
│     Google Analytics │ Search Console │ PostHog │ etc.      │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Monorepo** | Turborepo + Bun |
| **API** | Cloudflare Workers + Hono |
| **MCP** | Custom JSON-RPC handler (MCP 2024-11-05) |
| **Database** | Supabase PostgreSQL + Drizzle ORM |
| **Auth** | Supabase Auth (users) + API Keys (MCP) |
| **Validation** | Zod (single source of truth for schemas) |
| **Web** | Next.js 16 + shadcn/ui |
| **Hosting** | Cloudflare Workers (API) + Vercel (Web) |

### MCP Tools

The MCP server exposes these tools to AI agents:

| Tool | Description |
|------|-------------|
| `get_context` | Retrieve workspace context (company info, competitors, strategy) |
| `update_context` | Add new context nodes to the knowledge base |
| `list_tickets` | List opportunities and tasks |
| `create_ticket` | Create a new ticket with potential impact and confidence |
| `update_ticket` | Update ticket status, priority, or details |
| `get_integrations` | List connected third-party integrations |
| `query_google_search_console` | Query GSC for SEO data |
| `query_google_analytics` | Query GA for traffic/conversion data |

### Data Model

```
Workspace
├── API Keys (for MCP auth)
├── Memberships (users)
├── Context Nodes (company info, competitors, strategy)
├── Tickets (opportunities, tasks)
├── Integrations
│   └── Credentials (encrypted OAuth tokens)
└── Reports (scheduled analyses)
```

### Key Design Decisions

1. **Zod as single source of truth** — Schemas define validation, JSON Schema (for MCP), and TypeScript types. One place to update.

2. **No connection pooling in Workers** — Each request gets a fresh DB connection. Supabase pooler handles actual pooling server-side.

3. **API keys over sessions for MCP** — AI agents can't do OAuth flows. Simple `Bearer beam_xxx` tokens, hashed with SHA-256.

4. **Workspace isolation** — Every query is scoped by `workspace_id`. API keys are bound to workspaces.

## Current Status

### Deployed & Working
- ✅ API on Cloudflare Workers (`beam-api.gssonhannes.workers.dev`)
- ✅ MCP endpoint with 8 tools
- ✅ Supabase database with full schema
- ✅ User auth (signup/login)
- ✅ Workspace creation + API key generation
- ✅ Web dashboard (deploying to Vercel)

### Next Steps
- [ ] OAuth flows for Google (Analytics, Search Console)
- [ ] OAuth flows for other integrations (PostHog, HubSpot)
- [ ] Encrypted token storage in Supabase Vault
- [ ] Real data queries (currently stubbed)
- [ ] Report scheduling and execution
- [ ] Multi-user workspace collaboration

## Usage

### Connect to MCP (Cursor/Claude)

```json
{
  "mcpServers": {
    "beam": {
      "type": "http",
      "url": "https://beam-api.gssonhannes.workers.dev/mcp/w/YOUR_WORKSPACE_ID",
      "headers": {
        "Authorization": "Bearer beam_YOUR_API_KEY"
      }
    }
  }
}
```

### Example: AI Creates a Ticket

```
AI: "I analyzed your Search Console data and found that your /pricing page 
     ranks #8 for 'saas pricing calculator' with 2,400 monthly searches. 
     Adding an interactive calculator could move you to top 3."

→ create_ticket({
    title: "Add pricing calculator to /pricing page",
    description: "Ranking #8 for 'saas pricing calculator'...",
    potential: "$8k/month",
    confidence: 75,
    tags: ["seo", "pricing", "quick-win"]
  })
```

## Repository Structure

```
beam/
├── apps/
│   └── web/                 # Next.js dashboard
├── packages/
│   ├── api/                 # Cloudflare Workers API + MCP
│   ├── core/                # Shared schemas, types, utils
│   ├── db/                  # Drizzle schema + migrations
│   └── ui/                  # shadcn/ui components
└── turbo.json
```

---

Built to own the SEO intelligence space. 🚀
