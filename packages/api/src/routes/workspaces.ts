import { Hono } from 'hono'
import type { Env } from '../index'

export const workspacesRoutes = new Hono<{ Bindings: Env }>()

// GET /api/workspaces - List user's workspaces
workspacesRoutes.get('/', async (c) => {
  // TODO: Get user from auth, fetch their workspaces
  return c.json({ workspaces: [] })
})

// POST /api/workspaces - Create workspace
workspacesRoutes.post('/', async (c) => {
  // TODO: Validate input, create workspace
  return c.json({ message: 'Not implemented' }, 501)
})

// GET /api/workspaces/:id - Get workspace
workspacesRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  // TODO: Fetch workspace, check access
  return c.json({ id })
})

// POST /api/workspaces/:id/api-keys - Generate API key for MCP
workspacesRoutes.post('/:id/api-keys', async (c) => {
  const id = c.req.param('id')
  // TODO: Generate API key, store hash
  return c.json({ message: 'Not implemented' }, 501)
})
