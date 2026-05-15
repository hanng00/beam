import { describe, it, expect } from 'bun:test'
import { z } from 'zod'
import { createMcpTool, validateArgs, safeValidateArgs, formatZodError } from './tool-builder'

describe('tool-builder', () => {
  describe('createMcpTool', () => {
    it('creates tool with name and description', () => {
      const schema = z.object({ query: z.string() })
      const tool = createMcpTool('search', 'Search for items', schema)

      expect(tool.name).toBe('search')
      expect(tool.description).toBe('Search for items')
    })

    it('converts Zod schema to JSON Schema', () => {
      const schema = z.object({
        query: z.string().describe('Search query'),
        limit: z.number().optional().describe('Max results'),
      })
      const tool = createMcpTool('search', 'Search', schema)

      expect(tool.inputSchema).toBeDefined()
      expect(tool.inputSchema.type).toBe('object')
      expect(tool.inputSchema.properties).toBeDefined()
    })

    it('includes property descriptions from Zod', () => {
      const schema = z.object({
        name: z.string().describe('User name'),
      })
      const tool = createMcpTool('test', 'Test tool', schema)

      const props = tool.inputSchema.properties as Record<string, { description?: string }>
      expect(props.name.description).toBe('User name')
    })

    it('handles nested objects', () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          age: z.number(),
        }),
      })
      const tool = createMcpTool('test', 'Test', schema)

      expect(tool.inputSchema.properties).toBeDefined()
    })

    it('handles arrays', () => {
      const schema = z.object({
        tags: z.array(z.string()),
      })
      const tool = createMcpTool('test', 'Test', schema)

      const props = tool.inputSchema.properties as Record<string, { type?: string }>
      expect(props.tags.type).toBe('array')
    })

    it('handles enums', () => {
      const schema = z.object({
        status: z.enum(['active', 'inactive']),
      })
      const tool = createMcpTool('test', 'Test', schema)

      expect(tool.inputSchema.properties).toBeDefined()
    })

    it('removes $schema property', () => {
      const schema = z.object({ name: z.string() })
      const tool = createMcpTool('test', 'Test', schema)

      expect((tool.inputSchema as Record<string, unknown>).$schema).toBeUndefined()
    })
  })

  describe('validateArgs', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number().min(0),
    })

    it('returns parsed data for valid input', () => {
      const result = validateArgs(schema, { name: 'Alice', age: 30 })
      expect(result).toEqual({ name: 'Alice', age: 30 })
    })

    it('throws ZodError for invalid input', () => {
      expect(() => validateArgs(schema, { name: 'Alice', age: -1 })).toThrow()
    })

    it('throws ZodError for missing required fields', () => {
      expect(() => validateArgs(schema, { name: 'Alice' })).toThrow()
    })

    it('throws ZodError for wrong types', () => {
      expect(() => validateArgs(schema, { name: 123, age: 30 })).toThrow()
    })

    it('applies transformations', () => {
      const transformSchema = z.object({
        email: z.string().toLowerCase(),
      })
      const result = validateArgs(transformSchema, { email: 'TEST@EXAMPLE.COM' })
      expect(result.email).toBe('test@example.com')
    })

    it('applies defaults', () => {
      const defaultSchema = z.object({
        name: z.string(),
        role: z.string().default('user'),
      })
      const result = validateArgs(defaultSchema, { name: 'Alice' })
      expect(result.role).toBe('user')
    })
  })

  describe('safeValidateArgs', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    })

    it('returns success result for valid input', () => {
      const result = safeValidateArgs(schema, { name: 'Alice', age: 30 })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({ name: 'Alice', age: 30 })
      }
    })

    it('returns error result for invalid input', () => {
      const result = safeValidateArgs(schema, { name: 'Alice' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeDefined()
      }
    })

    it('does not throw on invalid input', () => {
      expect(() => safeValidateArgs(schema, { invalid: true })).not.toThrow()
    })
  })

  describe('formatZodError', () => {
    it('formats single error', () => {
      const schema = z.object({ name: z.string() })
      const result = schema.safeParse({ name: 123 })
      if (!result.success) {
        const message = formatZodError(result.error)
        expect(message).toContain('name')
      }
    })

    it('formats multiple errors', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      })
      const result = schema.safeParse({ name: 123, age: 'thirty' })
      if (!result.success) {
        const message = formatZodError(result.error)
        expect(message).toContain('name')
        expect(message).toContain('age')
        expect(message).toContain(';')
      }
    })

    it('formats nested path errors', () => {
      const schema = z.object({
        user: z.object({
          email: z.string().email(),
        }),
      })
      const result = schema.safeParse({ user: { email: 'invalid' } })
      if (!result.success) {
        const message = formatZodError(result.error)
        expect(message).toContain('user.email')
      }
    })

    it('formats array index errors', () => {
      const schema = z.object({
        items: z.array(z.string()),
      })
      const result = schema.safeParse({ items: ['valid', 123, 'valid'] })
      if (!result.success) {
        const message = formatZodError(result.error)
        expect(message).toContain('items.1')
      }
    })

    it('handles root-level errors', () => {
      const schema = z.string()
      const result = schema.safeParse(123)
      if (!result.success) {
        const message = formatZodError(result.error)
        expect(message.length).toBeGreaterThan(0)
      }
    })
  })
})
