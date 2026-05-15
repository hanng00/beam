import { describe, it, expect } from 'bun:test'
import {
  integrationProviderSchema,
  integrationSchema,
  connectIntegrationSchema,
} from './integration'

describe('integration schemas', () => {
  describe('integrationProviderSchema', () => {
    it('accepts valid providers', () => {
      expect(integrationProviderSchema.parse('google_analytics')).toBe('google_analytics')
      expect(integrationProviderSchema.parse('google_search_console')).toBe('google_search_console')
    })

    it('rejects invalid provider', () => {
      expect(() => integrationProviderSchema.parse('unknown_provider')).toThrow()
    })
  })

  describe('integrationSchema', () => {
    it('accepts valid integration', () => {
      const result = integrationSchema.parse({
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
      })
      expect(result.provider).toBe('google_analytics')
    })

    it('rejects invalid data', () => {
      expect(() => integrationSchema.parse({ id: 'invalid' })).toThrow()
    })
  })

  describe('connectIntegrationSchema', () => {
    it('accepts valid provider', () => {
      const result = connectIntegrationSchema.parse({ provider: 'google_search_console' })
      expect(result.provider).toBe('google_search_console')
    })

    it('rejects invalid provider', () => {
      expect(() => connectIntegrationSchema.parse({ provider: 'invalid' })).toThrow()
    })
  })
})
