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

    it('accepts workspace with null websiteUrl', () => {
      const result = workspaceSchema.parse({
        ...validWorkspace,
        websiteUrl: null,
      })
      expect(result.websiteUrl).toBeNull()
    })

    it('rejects invalid UUID', () => {
      expect(() => workspaceSchema.parse({
        ...validWorkspace,
        id: 'not-a-uuid',
      })).toThrow()
    })

    it('rejects empty name', () => {
      expect(() => workspaceSchema.parse({
        ...validWorkspace,
        name: '',
      })).toThrow()
    })

    it('rejects name too long', () => {
      expect(() => workspaceSchema.parse({
        ...validWorkspace,
        name: 'a'.repeat(101),
      })).toThrow()
    })

    it('rejects invalid slug format', () => {
      expect(() => workspaceSchema.parse({
        ...validWorkspace,
        slug: 'Invalid Slug!',
      })).toThrow()
    })

    it('accepts valid slug formats', () => {
      const validSlugs = ['my-workspace', 'workspace123', 'a-b-c-123']
      for (const slug of validSlugs) {
        const result = workspaceSchema.parse({ ...validWorkspace, slug })
        expect(result.slug).toBe(slug)
      }
    })

    it('rejects invalid productTier', () => {
      expect(() => workspaceSchema.parse({
        ...validWorkspace,
        productTier: 'premium',
      })).toThrow()
    })

    it.each(['free', 'pro', 'enterprise'] as const)('accepts valid tier: %s', (tier) => {
      const result = workspaceSchema.parse({
        ...validWorkspace,
        productTier: tier,
      })
      expect(result.productTier).toBe(tier)
    })

    it('rejects invalid websiteUrl', () => {
      expect(() => workspaceSchema.parse({
        ...validWorkspace,
        websiteUrl: 'not-a-url',
      })).toThrow()
    })
  })

  describe('createWorkspaceSchema', () => {
    it('accepts minimal valid input', () => {
      const result = createWorkspaceSchema.parse({
        name: 'New Workspace',
        slug: 'new-workspace',
      })
      expect(result.name).toBe('New Workspace')
      expect(result.websiteUrl).toBeUndefined()
    })

    it('accepts full input', () => {
      const result = createWorkspaceSchema.parse({
        name: 'New Workspace',
        slug: 'new-workspace',
        websiteUrl: 'https://example.com',
      })
      expect(result.websiteUrl).toBe('https://example.com')
    })

    it('rejects missing name', () => {
      expect(() => createWorkspaceSchema.parse({
        slug: 'test',
      })).toThrow()
    })

    it('rejects missing slug', () => {
      expect(() => createWorkspaceSchema.parse({
        name: 'Test',
      })).toThrow()
    })

    it('rejects invalid slug', () => {
      expect(() => createWorkspaceSchema.parse({
        name: 'Test',
        slug: 'INVALID',
      })).toThrow()
    })
  })

  describe('updateWorkspaceSchema', () => {
    it('accepts empty object', () => {
      const result = updateWorkspaceSchema.parse({})
      expect(result).toEqual({})
    })

    it('accepts partial updates', () => {
      const result = updateWorkspaceSchema.parse({
        name: 'Updated Name',
      })
      expect(result.name).toBe('Updated Name')
      expect(result.slug).toBeUndefined()
    })

    it('accepts null websiteUrl', () => {
      const result = updateWorkspaceSchema.parse({
        websiteUrl: null,
      })
      expect(result.websiteUrl).toBeNull()
    })

    it('rejects invalid values', () => {
      expect(() => updateWorkspaceSchema.parse({
        name: '',
      })).toThrow()
    })
  })

  describe('workspaceApiKeySchema', () => {
    const validApiKey = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      workspaceId: '550e8400-e29b-41d4-a716-446655440001',
      keyPrefix: 'beam_',
      name: 'Production Key',
      lastUsedAt: new Date(),
      createdAt: new Date(),
    }

    it('accepts valid API key', () => {
      const result = workspaceApiKeySchema.parse(validApiKey)
      expect(result.keyPrefix).toBe('beam_')
    })

    it('accepts API key with null name', () => {
      const result = workspaceApiKeySchema.parse({
        ...validApiKey,
        name: null,
      })
      expect(result.name).toBeNull()
    })

    it('accepts API key with null lastUsedAt', () => {
      const result = workspaceApiKeySchema.parse({
        ...validApiKey,
        lastUsedAt: null,
      })
      expect(result.lastUsedAt).toBeNull()
    })
  })

  describe('createApiKeySchema', () => {
    it('accepts empty object', () => {
      const result = createApiKeySchema.parse({})
      expect(result.name).toBeUndefined()
    })

    it('accepts name', () => {
      const result = createApiKeySchema.parse({
        name: 'My API Key',
      })
      expect(result.name).toBe('My API Key')
    })

    it('rejects name too long', () => {
      expect(() => createApiKeySchema.parse({
        name: 'a'.repeat(101),
      })).toThrow()
    })

    it('rejects empty name', () => {
      expect(() => createApiKeySchema.parse({
        name: '',
      })).toThrow()
    })
  })
})
