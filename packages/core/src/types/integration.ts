export type IntegrationProvider =
  | 'google_ads'
  | 'google_analytics'
  | 'google_search_console'
  | 'meta_ads'
  | 'linkedin_ads'
  | 'hubspot'
  | 'github'

export interface Integration {
  id: string
  workspaceId: string
  provider: IntegrationProvider
  accountId: string | null
  accountName: string | null
  scopes: string[]
  isEnabled: boolean
  tokenExpiresAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface IntegrationCredentials {
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
}
