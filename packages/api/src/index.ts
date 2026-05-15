import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { apiRoutes } from './routes'
import { mcpHandler } from './mcp/handler'

export type Env = {
  DATABASE_URL: string
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  ENVIRONMENT: string
  // OAuth
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  // URLs
  API_BASE_URL?: string
  WEB_BASE_URL?: string
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', logger())
app.use(
  '*',
  cors({
    origin: ['http://localhost:3000', 'https://app.beam.dev'],
    credentials: true,
  })
)

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// REST API routes
app.route('/api', apiRoutes)

// MCP endpoint
app.all('/mcp/w/:workspaceId', mcpHandler)
app.all('/mcp/w/:workspaceId/*', mcpHandler)

export default app
