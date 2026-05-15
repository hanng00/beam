import { describe, it, expect } from 'bun:test'
import {
  workspaceSchema,
  createWorkspaceSchema,
  updateWorkspaceSchema,
  workspaceApiKeySchema,
  createApiKeySchema,
} from './workspace'

describe('workspace schemas', () => {
  describe('workspaceSchema', () => {
    const validWorkspace = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'My Workspace',
      slug: 'my-workspace',
      productTier: 'pro',
      websiteUrl: 'https://example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('accepts valid workspace', () => {
      const result = workspaceSchema.parse(validWorkspace)
      expect(result.name).toBe('My Workspace')
    })

    it('rejects invalid data', () => {
      expect(() => workspaceSchema.parse({ ...validWorkspace, id: 'not-a-uuid' })).toThrow()
      expect(() => workspaceSchema.parse({ ...validWorkspace, slug: 'Invalid Slug!' })).toThrow()
    })
  })

  describe('createWorkspaceSchema', () => {
    it('accepts valid input', () => {
      const result = createWorkspaceSchema.parse({
        name: 'New Workspace',
        slug: 'new-workspace',
        websiteUrl: 'https://example.com',
      })
      expect(result.name).toBe('New Workspace')
    })

    it('rejects missing required fields', () => {
      expect(() => createWorkspaceSchema.parse({ slug: 'test' })).toThrow()
      expect(() => createWorkspaceSchema.parse({ name: 'Test' })).toThrow()
    })
  })

  describe('updateWorkspaceSchema', () => {
    it('accepts partial updates', () => {
      const result = updateWorkspaceSchema.parse({ name: 'Updated Name' })
      expect(result.name).toBe('Updated Name')
    })
  })

  describe('workspaceApiKeySchema', () => {
    it('accepts valid API key', () => {
      const result = workspaceApiKeySchema.parse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        workspaceId: '550e8400-e29b-41d4-a716-446655440001',
        keyPrefix: 'beam_',
        name: 'Production Key',
        lastUsedAt: new Date(),
        createdAt: new Date(),
      })
      expect(result.keyPrefix).toBe('beam_')
    })
  })

  describe('createApiKeySchema', () => {
    it('accepts valid name', () => {
      const result = createApiKeySchema.parse({ name: 'My API Key' })
      expect(result.name).toBe('My API Key')
    })

    it('rejects invalid name', () => {
      expect(() => createApiKeySchema.parse({ name: '' })).toThrow()
      expect(() => createApiKeySchema.parse({ name: 'a'.repeat(101) })).toThrow()
    })
  })
})
