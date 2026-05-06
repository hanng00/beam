import { Hono } from 'hono'
import { eq, desc } from 'drizzle-orm'
import { createDb } from '@beam/db/client'
import { tickets } from '@beam/db/schema'
import { createTicketArgsSchema } from '@beam/core/schemas'
import type { Env } from '../index'

export const ticketsRoutes = new Hono<{ Bindings: Env }>()

// GET /api/workspaces/:workspaceId/tickets
ticketsRoutes.get('/', async (c) => {
  const workspaceId = c.req.param('workspaceId')
  if (!workspaceId) {
    return c.json({ error: 'Missing workspaceId' }, 400)
  }

  const status = c.req.query('status')
  const limitStr = c.req.query('limit')
  const limit = limitStr ? parseInt(limitStr, 10) : 20

  const db = createDb(c.env.DATABASE_URL)

  const allTickets = await db
    .select()
    .from(tickets)
    .where(eq(tickets.workspaceId, workspaceId))
    .orderBy(desc(tickets.createdAt))
    .limit(Math.min(limit, 100))

  const filteredTickets = status
    ? allTickets.filter((t) => t.status === status)
    : allTickets

  return c.json({
    tickets: filteredTickets.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      potential: t.potential,
      confidence: t.confidence,
      tags: t.tags,
      createdAt: t.createdAt,
    })),
    total: filteredTickets.length,
  })
})

// POST /api/workspaces/:workspaceId/tickets
ticketsRoutes.post('/', async (c) => {
  const workspaceId = c.req.param('workspaceId')
  if (!workspaceId) {
    return c.json({ error: 'Missing workspaceId' }, 400)
  }

  const body = await c.req.json()

  // Validate with Zod
  const parsed = createTicketArgsSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'VALIDATION_ERROR', message: parsed.error.message }, 400)
  }

  const { title, description, priority, potential, confidence, tags } = parsed.data
  const db = createDb(c.env.DATABASE_URL)

  const [ticket] = await db
    .insert(tickets)
    .values({
      workspaceId,
      title,
      description,
      priority: priority ?? 'medium',
      potential: potential ?? null,
      confidence: confidence ?? null,
      tags: tags ?? [],
      status: 'new',
    })
    .returning()

  if (!ticket) {
    return c.json({ error: 'CREATE_FAILED', message: 'Failed to create ticket' }, 500)
  }

  return c.json({ success: true, ticket }, 201)
})

// GET /api/workspaces/:workspaceId/tickets/:id
ticketsRoutes.get('/:id', async (c) => {
  const workspaceId = c.req.param('workspaceId')
  const id = c.req.param('id')
  if (!workspaceId || !id) {
    return c.json({ error: 'Missing parameters' }, 400)
  }

  const db = createDb(c.env.DATABASE_URL)

  const [ticket] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, id))
    .limit(1)

  if (!ticket || ticket.workspaceId !== workspaceId) {
    return c.json({ error: 'NOT_FOUND', message: 'Ticket not found' }, 404)
  }

  return c.json(ticket)
})

// PATCH /api/workspaces/:workspaceId/tickets/:id
ticketsRoutes.patch('/:id', async (c) => {
  const workspaceId = c.req.param('workspaceId')
  const id = c.req.param('id')
  if (!workspaceId || !id) {
    return c.json({ error: 'Missing parameters' }, 400)
  }

  const body = await c.req.json()
  const db = createDb(c.env.DATABASE_URL)

  const [existing] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, id))
    .limit(1)

  if (!existing || existing.workspaceId !== workspaceId) {
    return c.json({ error: 'NOT_FOUND', message: 'Ticket not found' }, 404)
  }

  const updateData: Partial<typeof tickets.$inferInsert> = { updatedAt: new Date() }
  if (body.status) updateData.status = body.status
  if (body.priority) updateData.priority = body.priority
  if (body.title) updateData.title = body.title
  if (body.description) updateData.description = body.description

  const [updated] = await db
    .update(tickets)
    .set(updateData)
    .where(eq(tickets.id, id))
    .returning()

  return c.json({ success: true, ticket: updated })
})
