import { z } from 'zod'

export const integrationProviders = [
  'google_search_console',
  'google_analytics',
  'google_ads',
  'meta_ads',
  'linkedin_ads',
  'hubspot',
  'github',
] as const

export const integrationProviderSchema = z.enum(integrationProviders)
  .describe('Third-party service provider')

export const integrationSchema = z.object({
  id: z.string().uuid().describe('Unique integration identifier'),
  workspaceId: z.string().uuid().describe('Workspace this integration belongs to'),
  provider: integrationProviderSchema,
  accountId: z.string().nullable().describe('External account identifier from the provider'),
  accountName: z.string().nullable().describe('Human-readable account name'),
  scopes: z.array(z.string()).describe('OAuth scopes granted'),
  isEnabled: z.boolean().describe('Whether the integration is active'),
  tokenExpiresAt: z.coerce.date().nullable().describe('When the access token expires'),
  createdAt: z.coerce.date().describe('When the integration was created'),
  updatedAt: z.coerce.date().describe('When the integration was last updated'),
})

export const connectIntegrationSchema = z.object({
  provider: integrationProviderSchema,
})

// Type exports
export type IntegrationProvider = z.infer<typeof integrationProviderSchema>
export type Integration = z.infer<typeof integrationSchema>
export type ConnectIntegration = z.infer<typeof connectIntegrationSchema>
