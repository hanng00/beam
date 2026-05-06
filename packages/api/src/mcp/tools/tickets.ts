import { eq, desc } from 'drizzle-orm'
import { tickets } from '@beam/db/schema'
import {
  listTicketsArgsSchema,
  createTicketArgsSchema,
  updateTicketArgsSchema,
  type ListTicketsArgs,
  type CreateTicketArgs,
  type UpdateTicketArgs,
} from '@beam/core/schemas'
import { createMcpTool, validateArgs } from '../tool-builder'
import { NotFoundError } from '@beam/core/utils'
import type { ToolContext } from './types'

// Tool definitions - generated from Zod schemas
export const ticketTools = [
  createMcpTool(
    'list_tickets',
    'List tickets in the workspace. Use this to see existing opportunities, tasks, and their status.',
    listTicketsArgsSchema
  ),
  createMcpTool(
    'create_ticket',
    'Create a new ticket for an identified opportunity or task. Include clear title, detailed description, and estimated potential impact.',
    createTicketArgsSchema
  ),
  createMcpTool(
    'update_ticket',
    'Update an existing ticket status, priority, or details.',
    updateTicketArgsSchema
  ),
]

// Tool executors
export async function executeListTickets(args: unknown, ctx: ToolContext) {
  const { status, limit } = validateArgs(listTicketsArgsSchema, args)
  const { db, workspaceId } = ctx

  const allTickets = await db
    .select()
    .from(tickets)
    .where(eq(tickets.workspaceId, workspaceId))
    .orderBy(desc(tickets.createdAt))
    .limit(limit ?? 20)

  const filteredTickets = status
    ? allTickets.filter((t) => t.status === status)
    : allTickets

  return {
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
  }
}

export async function executeCreateTicket(args: unknown, ctx: ToolContext) {
  const { title, description, priority, potential, confidence, tags } = validateArgs(
    createTicketArgsSchema,
    args
  )
  const { db, workspaceId } = ctx

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
    throw new Error('Failed to create ticket')
  }

  return {
    success: true,
    ticket: {
      id: ticket.id,
      title: ticket.title,
      status: ticket.status,
      priority: ticket.priority,
    },
  }
}

export async function executeUpdateTicket(args: unknown, ctx: ToolContext) {
  const { ticketId, status, priority, title, description } = validateArgs(
    updateTicketArgsSchema,
    args
  )
  const { db, workspaceId } = ctx

  // Verify ticket exists and belongs to workspace
  const [existing] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1)

  if (!existing) {
    throw new NotFoundError('Ticket', ticketId)
  }

  if (existing.workspaceId !== workspaceId) {
    throw new NotFoundError('Ticket', ticketId)
  }

  const updateData: Partial<typeof tickets.$inferInsert> = {}
  if (status) updateData.status = status
  if (priority) updateData.priority = priority
  if (title) updateData.title = title
  if (description) updateData.description = description
  updateData.updatedAt = new Date()

  const [updated] = await db
    .update(tickets)
    .set(updateData)
    .where(eq(tickets.id, ticketId))
    .returning()

  if (!updated) {
    throw new Error('Failed to update ticket')
  }

  return {
    success: true,
    ticket: {
      id: updated.id,
      title: updated.title,
      status: updated.status,
      priority: updated.priority,
    },
  }
}
