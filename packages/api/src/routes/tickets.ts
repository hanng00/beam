import { Hono } from 'hono'
import { eq, desc, asc, and, inArray } from 'drizzle-orm'
import { createDb } from '@beam/db/client'
import { tickets } from '@beam/db/schema'
import { createTicketArgsSchema, updateTicketArgsSchema, listTicketsArgsSchema } from '@beam/core/schemas'
import type { Env } from '../index'

export const ticketsRoutes = new Hono<{ Bindings: Env }>()

// Priority order for sorting
const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
const effortOrder = { trivial: 0, small: 1, medium: 2, large: 3, epic: 4 }

// GET /api/workspaces/:workspaceId/tickets
ticketsRoutes.get('/', async (c) => {
  const workspaceId = c.req.param('workspaceId')
  if (!workspaceId) {
    return c.json({ error: 'Missing workspaceId' }, 400)
  }

  const status = c.req.query('status')
  const priority = c.req.query('priority')
  const tagsParam = c.req.query('tags')
  const sortBy = c.req.query('sortBy') || 'createdAt'
  const sortOrder = c.req.query('sortOrder') || 'desc'
  const limitStr = c.req.query('limit')
  const limit = limitStr ? parseInt(limitStr, 10) : 20

  const db = createDb(c.env.DATABASE_URL)

  // Build order by clause
  const orderByColumn = sortBy === 'createdAt' ? tickets.createdAt : tickets.createdAt
  const orderFn = sortOrder === 'asc' ? asc : desc

  const allTickets = await db
    .select()
    .from(tickets)
    .where(eq(tickets.workspaceId, workspaceId))
    .orderBy(orderFn(orderByColumn))
    .limit(Math.min(limit, 100))

  // Apply filters
  let filteredTickets = allTickets
  if (status) {
    filteredTickets = filteredTickets.filter((t) => t.status === status)
  }
  if (priority) {
    filteredTickets = filteredTickets.filter((t) => t.priority === priority)
  }
  if (tagsParam) {
    const filterTags = tagsParam.split(',')
    filteredTickets = filteredTickets.filter((t) =>
      t.tags?.some((tag) => filterTags.includes(tag))
    )
  }

  // Sort by priority or effort if requested (in-memory for now)
  if (sortBy === 'priority') {
    filteredTickets.sort((a, b) => {
      const aOrder = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2
      const bOrder = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2
      return sortOrder === 'asc' ? aOrder - bOrder : bOrder - aOrder
    })
  } else if (sortBy === 'effort') {
    filteredTickets.sort((a, b) => {
      const aOrder = effortOrder[(a.effort as keyof typeof effortOrder) ?? 'medium'] ?? 2
      const bOrder = effortOrder[(b.effort as keyof typeof effortOrder) ?? 'medium'] ?? 2
      return sortOrder === 'asc' ? aOrder - bOrder : bOrder - aOrder
    })
  }

  return c.json({
    tickets: filteredTickets.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      effort: t.effort,
      potential: t.potential,
      confidence: t.confidence,
      tags: t.tags,
      reportExecutionId: t.reportExecutionId,
      assigneeId: t.assigneeId,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
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

  const { title, description, priority, effort, potential, confidence, tags, reportExecutionId } = parsed.data
  const db = createDb(c.env.DATABASE_URL)

  const [ticket] = await db
    .insert(tickets)
    .values({
      workspaceId,
      title,
      description,
      priority: priority ?? 'medium',
      effort: effort ?? 'medium',
      potential: potential ?? null,
      confidence: confidence ?? null,
      tags: tags ?? [],
      reportExecutionId: reportExecutionId ?? null,
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

  // Validate with Zod
  const parsed = updateTicketArgsSchema.omit({ ticketId: true }).safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'VALIDATION_ERROR', message: parsed.error.message }, 400)
  }

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
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status
  if (parsed.data.priority !== undefined) updateData.priority = parsed.data.priority
  if (parsed.data.effort !== undefined) updateData.effort = parsed.data.effort
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description
  if (parsed.data.tags !== undefined) updateData.tags = parsed.data.tags
  if (parsed.data.potential !== undefined) updateData.potential = parsed.data.potential
  if (parsed.data.confidence !== undefined) updateData.confidence = parsed.data.confidence

  const [updated] = await db
    .update(tickets)
    .set(updateData)
    .where(eq(tickets.id, id))
    .returning()

  return c.json({ success: true, ticket: updated })
})

// DELETE /api/workspaces/:workspaceId/tickets/:id
ticketsRoutes.delete('/:id', async (c) => {
  const workspaceId = c.req.param('workspaceId')
  const id = c.req.param('id')
  if (!workspaceId || !id) {
    return c.json({ error: 'Missing parameters' }, 400)
  }

  const db = createDb(c.env.DATABASE_URL)

  const [existing] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, id))
    .limit(1)

  if (!existing || existing.workspaceId !== workspaceId) {
    return c.json({ error: 'NOT_FOUND', message: 'Ticket not found' }, 404)
  }

  await db.delete(tickets).where(eq(tickets.id, id))

  return c.json({ success: true })
})
