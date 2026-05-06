import { z } from 'zod'

export const ticketStatuses = [
  'new',
  'assigned',
  'in_progress',
  'review',
  'analysis',
  'done',
  'archived',
] as const

export const ticketPriorities = ['low', 'medium', 'high', 'urgent'] as const

export const ticketStatusSchema = z.enum(ticketStatuses)
  .describe('Current status of the ticket')

export const ticketPrioritySchema = z.enum(ticketPriorities)
  .describe('Priority level of the ticket')

export const ticketSchema = z.object({
  id: z.string().uuid().describe('Unique ticket identifier'),
  workspaceId: z.string().uuid().describe('Workspace this ticket belongs to'),
  title: z.string().min(1).max(500).describe('Ticket title'),
  description: z.string().describe('Detailed description in markdown'),
  status: ticketStatusSchema,
  priority: ticketPrioritySchema,
  potential: z.string().nullable().describe('Estimated potential impact, e.g., "$15k potential"'),
  confidence: z.number().min(0).max(100).nullable().describe('AI confidence score 0-100'),
  tags: z.array(z.string()).describe('Tags for categorization'),
  assigneeId: z.string().uuid().nullable().describe('User ID of the assignee'),
  createdAt: z.coerce.date().describe('When the ticket was created'),
  updatedAt: z.coerce.date().describe('When the ticket was last updated'),
})

// MCP Tool Schemas - single source of truth
export const listTicketsArgsSchema = z.object({
  status: ticketStatusSchema.optional()
    .describe('Filter by status: new, assigned, in_progress, review, analysis, done'),
  limit: z.number().min(1).max(100).optional().default(20)
    .describe('Maximum number of tickets to return (default 20, max 100)'),
})

export const createTicketArgsSchema = z.object({
  title: z.string().min(1).max(500)
    .describe('Ticket title - be specific and actionable'),
  description: z.string().min(1)
    .describe('Detailed description in markdown. Include context, steps, and expected outcome'),
  priority: ticketPrioritySchema.optional().default('medium')
    .describe('Priority level: low, medium, high, urgent'),
  potential: z.string().optional()
    .describe('Estimated potential impact, e.g., "$15k/month" or "20% conversion lift"'),
  confidence: z.number().min(0).max(100).optional()
    .describe('Your confidence score 0-100 that this will achieve the potential'),
  tags: z.array(z.string()).optional().default([])
    .describe('Tags for categorization, e.g., ["seo", "homepage", "quick-win"]'),
})

export const updateTicketArgsSchema = z.object({
  ticketId: z.string().uuid()
    .describe('UUID of the ticket to update'),
  status: ticketStatusSchema.optional()
    .describe('New status for the ticket'),
  priority: ticketPrioritySchema.optional()
    .describe('New priority level'),
  title: z.string().min(1).max(500).optional()
    .describe('Updated ticket title'),
  description: z.string().optional()
    .describe('Updated description'),
})

export const getTicketArgsSchema = z.object({
  ticketId: z.string().uuid()
    .describe('UUID of the ticket to retrieve'),
})

// API Response schemas
export const ticketResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: ticketStatusSchema,
  priority: ticketPrioritySchema,
  potential: z.string().nullable(),
  confidence: z.number().nullable(),
  tags: z.array(z.string()),
  createdAt: z.coerce.date(),
})

export const ticketListResponseSchema = z.object({
  tickets: z.array(ticketResponseSchema),
  total: z.number(),
})

// Type exports
export type TicketStatus = z.infer<typeof ticketStatusSchema>
export type TicketPriority = z.infer<typeof ticketPrioritySchema>
export type Ticket = z.infer<typeof ticketSchema>
export type ListTicketsArgs = z.infer<typeof listTicketsArgsSchema>
export type CreateTicketArgs = z.infer<typeof createTicketArgsSchema>
export type UpdateTicketArgs = z.infer<typeof updateTicketArgsSchema>
export type GetTicketArgs = z.infer<typeof getTicketArgsSchema>
export type TicketResponse = z.infer<typeof ticketResponseSchema>
export type TicketListResponse = z.infer<typeof ticketListResponseSchema>
