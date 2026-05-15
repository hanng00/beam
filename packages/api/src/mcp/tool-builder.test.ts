import { describe, it, expect } from 'bun:test'
import { z } from 'zod'
import { createMcpTool, validateArgs, safeValidateArgs, formatZodError } from './tool-builder'

describe('tool-builder', () => {
  describe('createMcpTool', () => {
    it('creates tool with correct structure', () => {
      const schema = z.object({
        query: z.string().describe('Search query'),
        limit: z.number().optional(),
      })
      const tool = createMcpTool('search', 'Search for items', schema)

      expect(tool.name).toBe('search')
      expect(tool.description).toBe('Search for items')
      expect(tool.inputSchema.type).toBe('object')
      expect(tool.inputSchema.properties).toBeDefined()
      expect((tool.inputSchema as Record<string, unknown>).$schema).toBeUndefined()
    })

    it('handles complex schemas', () => {
      const schema = z.object({
        user: z.object({ name: z.string(), age: z.number() }),
        tags: z.array(z.string()),
        status: z.enum(['active', 'inactive']),
      })
      const tool = createMcpTool('test', 'Test', schema)
      expect(tool.inputSchema.properties).toBeDefined()
    })
  })

  describe('validateArgs', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number().min(0),
      role: z.string().default('user'),
    })

    it('validates and transforms input', () => {
      const result = validateArgs(schema, { name: 'Alice', age: 30 })
      expect(result).toEqual({ name: 'Alice', age: 30, role: 'user' })
    })

    it('throws on invalid input', () => {
      expect(() => validateArgs(schema, { name: 'Alice', age: -1 })).toThrow()
      expect(() => validateArgs(schema, { name: 'Alice' })).toThrow()
    })
  })

  describe('safeValidateArgs', () => {
    const schema = z.object({ name: z.string() })

    it('returns success/error results without throwing', () => {
      const success = safeValidateArgs(schema, { name: 'Alice' })
      expect(success.success).toBe(true)
      if (success.success) expect(success.data).toEqual({ name: 'Alice' })

      const failure = safeValidateArgs(schema, { name: 123 })
      expect(failure.success).toBe(false)
    })
  })

  describe('formatZodError', () => {
    it('formats errors with paths', () => {
      const schema = z.object({
        user: z.object({ email: z.string().email() }),
        items: z.array(z.string()),
      })
      
      const result = schema.safeParse({ user: { email: 'invalid' }, items: ['valid', 123] })
      if (!result.success) {
        const message = formatZodError(result.error)
        expect(message).toContain('user.email')
        expect(message).toContain('items.1')
      }
    })
  })
})
