import { eq, desc, asc } from 'drizzle-orm'
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

// Priority and effort order for sorting
const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
const effortOrder = { trivial: 0, small: 1, medium: 2, large: 3, epic: 4 }

// Tool definitions - generated from Zod schemas
export const ticketTools = [
  createMcpTool(
    'list_tickets',
    'List tickets in the workspace. Use this to see existing opportunities, tasks, and their status. Supports filtering by status, priority, tags and sorting.',
    listTicketsArgsSchema
  ),
  createMcpTool(
    'create_ticket',
    'Create a new ticket for an identified opportunity or task. Include clear title, detailed description, effort estimate, and potential impact.',
    createTicketArgsSchema
  ),
  createMcpTool(
    'update_ticket',
    'Update an existing ticket status, priority, effort, or details.',
    updateTicketArgsSchema
  ),
]

// Tool executors
export async function executeListTickets(args: unknown, ctx: ToolContext) {
  const { status, priority, tags, sortBy, sortOrder, limit } = validateArgs(listTicketsArgsSchema, args)
  const { db, workspaceId } = ctx

  const orderByColumn = sortBy === 'createdAt' ? tickets.createdAt : tickets.createdAt
  const orderFn = sortOrder === 'asc' ? asc : desc

  const allTickets = await db
    .select()
    .from(tickets)
    .where(eq(tickets.workspaceId, workspaceId))
    .orderBy(orderFn(orderByColumn))
    .limit(limit ?? 20)

  // Apply filters
  let filteredTickets = allTickets
  if (status) {
    filteredTickets = filteredTickets.filter((t) => t.status === status)
  }
  if (priority) {
    filteredTickets = filteredTickets.filter((t) => t.priority === priority)
  }
  if (tags && tags.length > 0) {
    filteredTickets = filteredTickets.filter((t) =>
      t.tags?.some((tag) => tags.includes(tag))
    )
  }

  // Sort by priority or effort if requested
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

  return {
    tickets: filteredTickets.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      effort: t.effort,
      potential: t.potential,
      confidence: t.confidence,
      tags: t.tags,
      reportExecutionId: t.reportExecutionId,
      createdAt: t.createdAt,
    })),
    total: filteredTickets.length,
  }
}

export async function executeCreateTicket(args: unknown, ctx: ToolContext) {
  const { title, description, priority, effort, potential, confidence, tags, reportExecutionId } = validateArgs(
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
      effort: effort ?? 'medium',
      potential: potential ?? null,
      confidence: confidence ?? null,
      tags: tags ?? [],
      reportExecutionId: reportExecutionId ?? null,
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
      effort: ticket.effort,
      reportExecutionId: ticket.reportExecutionId,
    },
  }
}

export async function executeUpdateTicket(args: unknown, ctx: ToolContext) {
  const { ticketId, status, priority, effort, title, description, tags, potential, confidence } = validateArgs(
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
  if (status !== undefined) updateData.status = status
  if (priority !== undefined) updateData.priority = priority
  if (effort !== undefined) updateData.effort = effort
  if (title !== undefined) updateData.title = title
  if (description !== undefined) updateData.description = description
  if (tags !== undefined) updateData.tags = tags
  if (potential !== undefined) updateData.potential = potential
  if (confidence !== undefined) updateData.confidence = confidence
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
      effort: updated.effort,
    },
  }
}
