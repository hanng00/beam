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

export const ticketEfforts = ['trivial', 'small', 'medium', 'large', 'epic'] as const

export const ticketStatusSchema = z.enum(ticketStatuses)
  .describe('Current status of the ticket')

export const ticketPrioritySchema = z.enum(ticketPriorities)
  .describe('Priority level of the ticket')

export const ticketEffortSchema = z.enum(ticketEfforts)
  .describe('Effort estimate: trivial (minutes), small (hours), medium (day), large (days), epic (week+)')

export const ticketSchema = z.object({
  id: z.string().uuid().describe('Unique ticket identifier'),
  workspaceId: z.string().uuid().describe('Workspace this ticket belongs to'),
  title: z.string().min(1).max(500).describe('Ticket title'),
  description: z.string().describe('Detailed description in markdown'),
  status: ticketStatusSchema,
  priority: ticketPrioritySchema,
  effort: ticketEffortSchema.nullable().describe('Effort estimate for the ticket'),
  potential: z.string().nullable().describe('Estimated potential impact, e.g., "$15k potential"'),
  confidence: z.number().min(0).max(100).nullable().describe('AI confidence score 0-100'),
  tags: z.array(z.string()).describe('Tags for categorization'),
  assigneeId: z.string().uuid().nullable().describe('User ID of the assignee'),
  reportExecutionId: z.string().uuid().nullable().describe('ID of the report execution that created this ticket'),
  createdAt: z.coerce.date().describe('When the ticket was created'),
  updatedAt: z.coerce.date().describe('When the ticket was last updated'),
})

// MCP Tool Schemas - single source of truth
export const listTicketsArgsSchema = z.object({
  status: ticketStatusSchema.optional()
    .describe('Filter by status: new, assigned, in_progress, review, analysis, done'),
  priority: ticketPrioritySchema.optional()
    .describe('Filter by priority: low, medium, high, urgent'),
  tags: z.array(z.string()).optional()
    .describe('Filter by tags (tickets must have at least one matching tag)'),
  sortBy: z.enum(['createdAt', 'priority', 'potential', 'effort']).optional().default('createdAt')
    .describe('Field to sort by'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
    .describe('Sort order: asc or desc'),
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
  effort: ticketEffortSchema.optional().default('medium')
    .describe('Effort estimate: trivial (minutes), small (hours), medium (day), large (days), epic (week+)'),
  potential: z.string().optional()
    .describe('Estimated potential impact, e.g., "$15k/month" or "20% conversion lift"'),
  confidence: z.number().min(0).max(100).optional()
    .describe('Your confidence score 0-100 that this will achieve the potential'),
  tags: z.array(z.string()).optional().default([])
    .describe('Tags for categorization, e.g., ["seo", "homepage", "quick-win"]'),
  reportExecutionId: z.string().uuid().optional()
    .describe('ID of the report execution that created this ticket'),
})

export const updateTicketArgsSchema = z.object({
  ticketId: z.string().uuid()
    .describe('UUID of the ticket to update'),
  status: ticketStatusSchema.optional()
    .describe('New status for the ticket'),
  priority: ticketPrioritySchema.optional()
    .describe('New priority level'),
  effort: ticketEffortSchema.optional()
    .describe('Updated effort estimate'),
  title: z.string().min(1).max(500).optional()
    .describe('Updated ticket title'),
  description: z.string().optional()
    .describe('Updated description'),
  tags: z.array(z.string()).optional()
    .describe('Updated tags'),
  potential: z.string().optional()
    .describe('Updated potential impact'),
  confidence: z.number().min(0).max(100).optional()
    .describe('Updated confidence score'),
})

export const ticketFiltersSchema = z.object({
  status: ticketStatusSchema.optional()
    .describe('Filter by status'),
  priority: ticketPrioritySchema.optional()
    .describe('Filter by priority'),
  effort: ticketEffortSchema.optional()
    .describe('Filter by effort'),
  tags: z.array(z.string()).optional()
    .describe('Filter by tags'),
  reportExecutionId: z.string().uuid().optional()
    .describe('Filter by report execution'),
  sortBy: z.enum(['createdAt', 'priority', 'potential', 'effort']).optional()
    .describe('Field to sort by'),
  sortOrder: z.enum(['asc', 'desc']).optional()
    .describe('Sort order'),
})

export const getTicketArgsSchema = z.object({
  ticketId: z.string().uuid()
    .describe('UUID of the ticket to retrieve'),
})

// API Response schemas
export const ticketResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
  status: ticketStatusSchema,
  priority: ticketPrioritySchema,
  effort: ticketEffortSchema.nullable(),
  potential: z.string().nullable(),
  confidence: z.number().nullable(),
  tags: z.array(z.string()),
  reportExecutionId: z.string().uuid().nullable(),
  assigneeId: z.string().uuid().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export const ticketListResponseSchema = z.object({
  tickets: z.array(ticketResponseSchema),
  total: z.number(),
})

// Type exports
export type TicketStatus = z.infer<typeof ticketStatusSchema>
export type TicketPriority = z.infer<typeof ticketPrioritySchema>
export type TicketEffort = z.infer<typeof ticketEffortSchema>
export type Ticket = z.infer<typeof ticketSchema>
export type ListTicketsArgs = z.infer<typeof listTicketsArgsSchema>
export type CreateTicketArgs = z.infer<typeof createTicketArgsSchema>
export type UpdateTicketArgs = z.infer<typeof updateTicketArgsSchema>
export type TicketFilters = z.infer<typeof ticketFiltersSchema>
export type GetTicketArgs = z.infer<typeof getTicketArgsSchema>
export type TicketResponse = z.infer<typeof ticketResponseSchema>
export type TicketListResponse = z.infer<typeof ticketListResponseSchema>
