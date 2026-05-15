import { describe, it, expect } from 'bun:test'
import {
  ticketStatusSchema,
  ticketPrioritySchema,
  ticketEffortSchema,
  ticketSchema,
  listTicketsArgsSchema,
  createTicketArgsSchema,
  updateTicketArgsSchema,
  getTicketArgsSchema,
  ticketStatuses,
  ticketPriorities,
  ticketEfforts,
} from './ticket'

describe('ticket schemas', () => {
  describe('ticketStatusSchema', () => {
    it.each(ticketStatuses)('accepts valid status: %s', (status) => {
      expect(ticketStatusSchema.parse(status)).toBe(status)
    })

    it('rejects invalid status', () => {
      expect(() => ticketStatusSchema.parse('invalid')).toThrow()
    })
  })

  describe('ticketPrioritySchema', () => {
    it.each(ticketPriorities)('accepts valid priority: %s', (priority) => {
      expect(ticketPrioritySchema.parse(priority)).toBe(priority)
    })

    it('rejects invalid priority', () => {
      expect(() => ticketPrioritySchema.parse('critical')).toThrow()
    })
  })

  describe('ticketEffortSchema', () => {
    it.each(ticketEfforts)('accepts valid effort: %s', (effort) => {
      expect(ticketEffortSchema.parse(effort)).toBe(effort)
    })

    it('rejects invalid effort', () => {
      expect(() => ticketEffortSchema.parse('huge')).toThrow()
    })
  })

  describe('ticketSchema', () => {
    const validTicket = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      workspaceId: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Fix homepage SEO',
      description: 'Update meta tags and improve content',
      status: 'new',
      priority: 'high',
      effort: 'medium',
      potential: '$5k/month',
      confidence: 85,
      tags: ['seo', 'homepage'],
      assigneeId: null,
      reportExecutionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('accepts valid ticket', () => {
      const result = ticketSchema.parse(validTicket)
      expect(result.id).toBe(validTicket.id)
      expect(result.title).toBe(validTicket.title)
    })

    it('rejects ticket with invalid UUID', () => {
      expect(() => ticketSchema.parse({ ...validTicket, id: 'not-a-uuid' })).toThrow()
    })

    it('rejects ticket with empty title', () => {
      expect(() => ticketSchema.parse({ ...validTicket, title: '' })).toThrow()
    })

    it('rejects ticket with title too long', () => {
      expect(() => ticketSchema.parse({ ...validTicket, title: 'a'.repeat(501) })).toThrow()
    })

    it('rejects ticket with confidence out of range', () => {
      expect(() => ticketSchema.parse({ ...validTicket, confidence: 101 })).toThrow()
      expect(() => ticketSchema.parse({ ...validTicket, confidence: -1 })).toThrow()
    })

    it('accepts ticket with null optional fields', () => {
      const result = ticketSchema.parse({
        ...validTicket,
        effort: null,
        potential: null,
        confidence: null,
      })
      expect(result.effort).toBeNull()
    })

    it('coerces date strings to Date objects', () => {
      const result = ticketSchema.parse({
        ...validTicket,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      })
      expect(result.createdAt instanceof Date).toBe(true)
    })
  })

  describe('listTicketsArgsSchema', () => {
    it('accepts empty object with defaults', () => {
      const result = listTicketsArgsSchema.parse({})
      expect(result.sortBy).toBe('createdAt')
      expect(result.sortOrder).toBe('desc')
      expect(result.limit).toBe(20)
    })

    it('accepts valid filters', () => {
      const result = listTicketsArgsSchema.parse({
        status: 'in_progress',
        priority: 'high',
        tags: ['seo'],
        sortBy: 'priority',
        sortOrder: 'asc',
        limit: 50,
      })
      expect(result.status).toBe('in_progress')
      expect(result.limit).toBe(50)
    })

    it('rejects limit over 100', () => {
      expect(() => listTicketsArgsSchema.parse({ limit: 101 })).toThrow()
    })

    it('rejects limit under 1', () => {
      expect(() => listTicketsArgsSchema.parse({ limit: 0 })).toThrow()
    })

    it('rejects invalid sortBy', () => {
      expect(() => listTicketsArgsSchema.parse({ sortBy: 'invalid' })).toThrow()
    })
  })

  describe('createTicketArgsSchema', () => {
    it('accepts minimal valid input', () => {
      const result = createTicketArgsSchema.parse({
        title: 'New ticket',
        description: 'Description here',
      })
      expect(result.title).toBe('New ticket')
      expect(result.priority).toBe('medium')
      expect(result.effort).toBe('medium')
      expect(result.tags).toEqual([])
    })

    it('accepts full valid input', () => {
      const result = createTicketArgsSchema.parse({
        title: 'New ticket',
        description: 'Description here',
        priority: 'urgent',
        effort: 'large',
        potential: '$10k/month',
        confidence: 90,
        tags: ['seo', 'urgent'],
        reportExecutionId: '550e8400-e29b-41d4-a716-446655440000',
      })
      expect(result.priority).toBe('urgent')
      expect(result.confidence).toBe(90)
    })

    it('rejects empty title', () => {
      expect(() => createTicketArgsSchema.parse({
        title: '',
        description: 'Description',
      })).toThrow()
    })

    it('rejects empty description', () => {
      expect(() => createTicketArgsSchema.parse({
        title: 'Title',
        description: '',
      })).toThrow()
    })

    it('rejects confidence out of range', () => {
      expect(() => createTicketArgsSchema.parse({
        title: 'Title',
        description: 'Desc',
        confidence: 150,
      })).toThrow()
    })
  })

  describe('updateTicketArgsSchema', () => {
    it('requires ticketId', () => {
      expect(() => updateTicketArgsSchema.parse({})).toThrow()
    })

    it('accepts ticketId only', () => {
      const result = updateTicketArgsSchema.parse({
        ticketId: '550e8400-e29b-41d4-a716-446655440000',
      })
      expect(result.ticketId).toBeDefined()
    })

    it('accepts partial updates', () => {
      const result = updateTicketArgsSchema.parse({
        ticketId: '550e8400-e29b-41d4-a716-446655440000',
        status: 'done',
        priority: 'low',
      })
      expect(result.status).toBe('done')
      expect(result.title).toBeUndefined()
    })

    it('rejects invalid ticketId format', () => {
      expect(() => updateTicketArgsSchema.parse({
        ticketId: 'not-a-uuid',
      })).toThrow()
    })
  })

  describe('getTicketArgsSchema', () => {
    it('accepts valid UUID', () => {
      const result = getTicketArgsSchema.parse({
        ticketId: '550e8400-e29b-41d4-a716-446655440000',
      })
      expect(result.ticketId).toBeDefined()
    })

    it('rejects invalid UUID', () => {
      expect(() => getTicketArgsSchema.parse({ ticketId: 'invalid' })).toThrow()
    })

    it('rejects missing ticketId', () => {
      expect(() => getTicketArgsSchema.parse({})).toThrow()
    })
  })
})
