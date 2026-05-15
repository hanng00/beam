import { describe, it, expect } from 'bun:test'
import {
  ticketSchema,
  listTicketsArgsSchema,
  createTicketArgsSchema,
  updateTicketArgsSchema,
  getTicketArgsSchema,
} from './ticket'

describe('ticket schemas', () => {
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
      expect(result.title).toBe('Fix homepage SEO')
    })

    it('rejects invalid ticket', () => {
      expect(() => ticketSchema.parse({ ...validTicket, id: 'not-a-uuid' })).toThrow()
      expect(() => ticketSchema.parse({ ...validTicket, title: '' })).toThrow()
      expect(() => ticketSchema.parse({ ...validTicket, confidence: 101 })).toThrow()
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
    it('applies defaults', () => {
      const result = listTicketsArgsSchema.parse({})
      expect(result.sortBy).toBe('createdAt')
      expect(result.sortOrder).toBe('desc')
      expect(result.limit).toBe(20)
    })

    it('accepts valid filters', () => {
      const result = listTicketsArgsSchema.parse({
        status: 'in_progress',
        priority: 'high',
        limit: 50,
      })
      expect(result.status).toBe('in_progress')
      expect(result.limit).toBe(50)
    })

    it('rejects invalid limit', () => {
      expect(() => listTicketsArgsSchema.parse({ limit: 101 })).toThrow()
      expect(() => listTicketsArgsSchema.parse({ limit: 0 })).toThrow()
    })
  })

  describe('createTicketArgsSchema', () => {
    it('accepts valid input with defaults', () => {
      const result = createTicketArgsSchema.parse({
        title: 'New ticket',
        description: 'Description here',
      })
      expect(result.title).toBe('New ticket')
      expect(result.priority).toBe('medium')
      expect(result.effort).toBe('medium')
    })

    it('rejects empty required fields', () => {
      expect(() => createTicketArgsSchema.parse({ title: '', description: 'Desc' })).toThrow()
      expect(() => createTicketArgsSchema.parse({ title: 'Title', description: '' })).toThrow()
    })
  })

  describe('updateTicketArgsSchema', () => {
    it('requires ticketId', () => {
      expect(() => updateTicketArgsSchema.parse({})).toThrow()
    })

    it('accepts partial updates', () => {
      const result = updateTicketArgsSchema.parse({
        ticketId: '550e8400-e29b-41d4-a716-446655440000',
        status: 'done',
      })
      expect(result.status).toBe('done')
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
  })
})
