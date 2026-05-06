import type { Context } from 'hono'
import type { Env } from '../index'
import { McpServer } from './server'
import { hashApiKey } from '@beam/core/utils'
import { createDb } from '@beam/db/client'
import { workspaceApiKeys } from '@beam/db/schema'
import { eq, and } from 'drizzle-orm'

export async function mcpHandler(c: Context<{ Bindings: Env }>) {
  const workspaceId = c.req.param('workspaceId')

  if (!workspaceId) {
    return c.json({ error: 'Missing workspace ID' }, 400)
  }

  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401)
  }

  const apiKey = authHeader.slice(7)

  if (!apiKey.startsWith('beam_')) {
    return c.json({ error: 'Invalid API key format' }, 401)
  }

  const keyHash = await hashApiKey(apiKey)
  const db = createDb(c.env.DATABASE_URL)

  try {
    const [keyRecord] = await db
      .select()
      .from(workspaceApiKeys)
      .where(
        and(
          eq(workspaceApiKeys.keyHash, keyHash),
          eq(workspaceApiKeys.workspaceId, workspaceId)
        )
      )
      .limit(1)

    if (!keyRecord) {
      return c.json({ error: 'Invalid API key' }, 401)
    }

    // Update last used (fire and forget)
    db.update(workspaceApiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(workspaceApiKeys.id, keyRecord.id))
      .catch(() => {})

    const mcpServer = new McpServer(workspaceId, c.env, db)
    return mcpServer.handle(c.req.raw)
  } catch (error) {
    console.error('MCP handler error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
}
