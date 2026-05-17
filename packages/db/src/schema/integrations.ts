import { pgTable, uuid, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core'
import { workspaces } from './workspaces'

// Provider-specific configuration types
export type IntegrationConfig = {
  // Google Search Console
  siteUrl?: string // e.g., "https://example.com" or "sc-domain:example.com"
  // Google Analytics
  propertyId?: string // e.g., "properties/123456789"
  propertyName?: string
  // Google Ads
  customerId?: string // e.g., "1234567890" (no dashes)
  // Generic
  [key: string]: unknown
}

export const integrations = pgTable('integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(), // 'google_search_console' | 'google_analytics' | etc.
  accountId: text('account_id'),
  accountName: text('account_name'),
  config: jsonb('config').$type<IntegrationConfig>(), // Provider-specific settings
  scopes: text('scopes').array(),
  isEnabled: boolean('is_enabled').notNull().default(true),
  tokenExpiresAt: timestamp('token_expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// OAuth tokens stored separately - these go in Supabase Vault in production
// For dev, we store encrypted in this table
export const integrationCredentials = pgTable('integration_credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  integrationId: uuid('integration_id')
    .notNull()
    .unique()
    .references(() => integrations.id, { onDelete: 'cascade' }),
  accessToken: text('access_token').notNull(), // Encrypted
  refreshToken: text('refresh_token'), // Encrypted
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
