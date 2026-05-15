import { describe, it, expect } from 'bun:test'
import {
  integrationProviderSchema,
  integrationSchema,
  connectIntegrationSchema,
  integrationProviders,
} from './integration'

describe('integration schemas', () => {
  describe('integrationProviderSchema', () => {
    it.each(integrationProviders)('accepts valid provider: %s', (provider) => {
      expect(integrationProviderSchema.parse(provider)).toBe(provider)
    })

    it('rejects invalid provider', () => {
      expect(() => integrationProviderSchema.parse('unknown_provider')).toThrow()
    })
  })

  describe('integrationSchema', () => {
    const validIntegration = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      workspaceId: '550e8400-e29b-41d4-a716-446655440001',
      provider: 'google_analytics',
      accountId: 'UA-123456',
      accountName: 'My Analytics Account',
      scopes: ['analytics.readonly'],
      isEnabled: true,
      tokenExpiresAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('accepts valid integration', () => {
      const result = integrationSchema.parse(validIntegration)
      expect(result.provider).toBe('google_analytics')
    })

    it('accepts integration with null optional fields', () => {
      const result = integrationSchema.parse({
        ...validIntegration,
        accountId: null,
        accountName: null,
        tokenExpiresAt: null,
      })
      expect(result.accountId).toBeNull()
    })

    it('rejects invalid UUID', () => {
      expect(() => integrationSchema.parse({
        ...validIntegration,
        id: 'invalid',
      })).toThrow()
    })

    it('rejects invalid provider', () => {
      expect(() => integrationSchema.parse({
        ...validIntegration,
        provider: 'invalid_provider',
      })).toThrow()
    })
  })

  describe('connectIntegrationSchema', () => {
    it('accepts valid provider', () => {
      const result = connectIntegrationSchema.parse({
        provider: 'google_search_console',
      })
      expect(result.provider).toBe('google_search_console')
    })

    it('rejects missing provider', () => {
      expect(() => connectIntegrationSchema.parse({})).toThrow()
    })

    it('rejects invalid provider', () => {
      expect(() => connectIntegrationSchema.parse({
        provider: 'invalid',
      })).toThrow()
    })
  })
})
