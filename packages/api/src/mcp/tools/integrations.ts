import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { integrations, integrationCredentials } from '@beam/db/schema'
import { integrationProviders } from '@beam/core/schemas'
import { IntegrationError } from '@beam/core/utils'
import { createMcpTool, validateArgs } from '../tool-builder'
import type { ToolContext } from './types'
import {
  SearchConsoleClient,
  AnalyticsClient,
  AdsClient,
  GoogleApiError,
  TokenRefreshError,
} from '../../integrations/google'
import type { GoogleCredentials, GoogleClientConfig, AdsClientConfig } from '../../integrations/google'

// Zod schemas for integration tools
const getIntegrationsArgsSchema = z.object({}).describe('No arguments required')

const queryGSCArgsSchema = z.object({
  siteUrl: z.string().optional().describe('Site URL as registered in GSC. If not provided, uses the configured site from integration settings.'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe('Start date in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe('End date in YYYY-MM-DD format'),
  dimensions: z.array(z.enum(['query', 'page', 'country', 'device', 'date'])).optional().default(['query'])
    .describe('Dimensions to group by'),
  rowLimit: z.number().min(1).max(25000).optional().default(100)
    .describe('Maximum rows to return (default 100, max 25000)'),
})

const queryGAArgsSchema = z.object({
  propertyId: z.string().optional().describe('GA4 property ID. If not provided, uses the configured property from integration settings.'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe('Start date in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe('End date in YYYY-MM-DD format'),
  metrics: z.array(z.string()).min(1)
    .describe('Metrics to retrieve, e.g., sessions, totalUsers, screenPageViews'),
  dimensions: z.array(z.string()).optional()
    .describe('Dimensions to group by, e.g., date, sessionSource, pagePath'),
  limit: z.number().min(1).max(10000).optional().default(100)
    .describe('Maximum rows to return'),
})

const listGSCSitesArgsSchema = z.object({}).describe('No arguments required')

const listGAPropertiesArgsSchema = z.object({}).describe('No arguments required')

const listGoogleAdsAccountsArgsSchema = z.object({}).describe('No arguments required')

const queryGoogleAdsArgsSchema = z.object({
  customerId: z.string().optional().describe('Google Ads customer ID (without dashes). If not provided, uses the configured account from integration settings.'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe('Start date in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe('End date in YYYY-MM-DD format'),
  query: z.string()
    .refine(
      (q) => /^\s*SELECT\s/i.test(q) && !/\b(CREATE|UPDATE|DELETE|REMOVE|INSERT|MUTATE)\b/i.test(q),
      { message: 'Only read-only SELECT queries are allowed. Mutation operations (CREATE, UPDATE, DELETE, REMOVE) are not permitted.' }
    )
    .describe('Read-only Google Ads Query Language (GAQL) SELECT query, e.g., "SELECT campaign.name, metrics.impressions FROM campaign WHERE segments.date DURING LAST_30_DAYS"'),
})

const configureIntegrationArgsSchema = z.object({
  provider: z.enum(['google_search_console', 'google_analytics', 'google_ads'])
    .describe('The integration provider to configure'),
  config: z.object({
    siteUrl: z.string().optional().describe('For GSC: the site URL (e.g., "https://example.com" or "sc-domain:example.com")'),
    propertyId: z.string().optional().describe('For GA4: the property ID (e.g., "properties/123456789")'),
    propertyName: z.string().optional().describe('For GA4: human-readable property name'),
    customerId: z.string().optional().describe('For Google Ads: the customer ID (without dashes)'),
  }).describe('Provider-specific configuration'),
})

// Tool definitions - generated from Zod schemas
export const integrationTools = [
  createMcpTool(
    'get_integrations',
    'List connected integrations and their status.',
    getIntegrationsArgsSchema
  ),
  createMcpTool(
    'list_gsc_sites',
    'List all sites available in the connected Google Search Console account. Use this to find the correct siteUrl to configure.',
    listGSCSitesArgsSchema
  ),
  createMcpTool(
    'list_ga_properties',
    'List all GA4 properties available in the connected Google Analytics account. Use this to find the correct propertyId to configure.',
    listGAPropertiesArgsSchema
  ),
  createMcpTool(
    'configure_integration',
    'Configure an integration with provider-specific settings like site URL or property ID.',
    configureIntegrationArgsSchema
  ),
  createMcpTool(
    'query_google_search_console',
    'Query Google Search Console data for SEO insights. Returns clicks, impressions, CTR, and position data. Requires Google Search Console integration.',
    queryGSCArgsSchema
  ),
  createMcpTool(
    'query_google_analytics',
    'Query Google Analytics 4 data for traffic and conversion insights. Requires Google Analytics integration.',
    queryGAArgsSchema
  ),
  createMcpTool(
    'list_google_ads_accounts',
    'List Google Ads accounts accessible with the connected credentials.',
    listGoogleAdsAccountsArgsSchema
  ),
  createMcpTool(
    'query_google_ads',
    'Run a read-only Google Ads Query Language (GAQL) SELECT query for reporting data (performance metrics, spend, conversions, keywords). Requires Google Ads integration.',
    queryGoogleAdsArgsSchema
  ),
]

type GoogleProvider = 'google_search_console' | 'google_analytics' | 'google_ads'

interface CredentialsResult {
  credentials: GoogleCredentials
  config: GoogleClientConfig
  integrationConfig: Record<string, unknown> | null
  credentialsId: string
}

interface AdsCredentialsResult extends CredentialsResult {
  config: AdsClientConfig
}

/**
 * Get OAuth credentials and client config for a Google provider
 */
async function getGoogleCredentials(
  ctx: ToolContext,
  provider: GoogleProvider
): Promise<CredentialsResult> {
  const { db, workspaceId, env } = ctx

  const [integration] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.workspaceId, workspaceId),
        eq(integrations.provider, provider),
        eq(integrations.isEnabled, true)
      )
    )
    .limit(1)

  if (!integration) {
    const nameMap: Record<string, string> = {
      google_search_console: 'Google Search Console',
      google_analytics: 'Google Analytics',
      google_ads: 'Google Ads',
    }
    throw new IntegrationError(
      provider,
      `Integration not connected. Please connect ${nameMap[provider] ?? provider} in the Beam dashboard.`,
      { action: 'connect_integration', provider }
    )
  }

  const [creds] = await db
    .select()
    .from(integrationCredentials)
    .where(eq(integrationCredentials.integrationId, integration.id))
    .limit(1)

  if (!creds?.refreshToken) {
    throw new IntegrationError(
      provider,
      'OAuth credentials missing. Please reconnect the integration.',
      { action: 'reconnect_integration', provider }
    )
  }

  return {
    credentials: {
      accessToken: creds.accessToken,
      refreshToken: creds.refreshToken,
    },
    config: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
    integrationConfig: integration.config as Record<string, unknown> | null,
    credentialsId: creds.id,
  }
}

/**
 * Get credentials for Google Ads (includes developer token)
 */
async function getAdsCredentials(ctx: ToolContext): Promise<AdsCredentialsResult> {
  const result = await getGoogleCredentials(ctx, 'google_ads')
  return {
    ...result,
    config: {
      clientId: ctx.env.GOOGLE_CLIENT_ID,
      clientSecret: ctx.env.GOOGLE_CLIENT_SECRET,
      developerToken: ctx.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    },
  }
}

/**
 * Create a token refresh callback that persists the new token to the database
 */
function createTokenRefreshCallback(ctx: ToolContext, credentialsId: string) {
  return async (newAccessToken: string) => {
    await ctx.db
      .update(integrationCredentials)
      .set({ accessToken: newAccessToken })
      .where(eq(integrationCredentials.id, credentialsId))
  }
}

/**
 * Handle Google API errors and convert to IntegrationError
 */
function handleGoogleError(error: unknown, provider: GoogleProvider): never {
  if (error instanceof GoogleApiError) {
    if (error.isUnauthorized) {
      throw new IntegrationError(
        provider,
        'Authentication failed. Please reconnect the integration.',
        { action: 'reconnect_integration', provider, status: error.statusCode }
      )
    }
    if (error.isRateLimited) {
      throw new IntegrationError(
        provider,
        'Rate limit exceeded. Please try again later.',
        { status: error.statusCode }
      )
    }
    throw new IntegrationError(
      provider,
      `API error (${error.statusCode}): ${error.body}`,
      { status: error.statusCode }
    )
  }
  if (error instanceof TokenRefreshError) {
    throw new IntegrationError(
      provider,
      `Failed to refresh OAuth token: ${error.details}`,
      { action: 'reconnect_integration', provider }
    )
  }
  throw error
}

// Tool executors
export async function executeGetIntegrations(args: unknown, ctx: ToolContext) {
  validateArgs(getIntegrationsArgsSchema, args)
  const { db, workspaceId } = ctx

  const workspaceIntegrations = await db
    .select({
      id: integrations.id,
      provider: integrations.provider,
      accountId: integrations.accountId,
      accountName: integrations.accountName,
      isEnabled: integrations.isEnabled,
      createdAt: integrations.createdAt,
    })
    .from(integrations)
    .where(eq(integrations.workspaceId, workspaceId))

  return {
    integrations: workspaceIntegrations,
    total: workspaceIntegrations.length,
    availableProviders: integrationProviders,
  }
}

export async function executeQueryGSC(args: unknown, ctx: ToolContext) {
  const validated = validateArgs(queryGSCArgsSchema, args)
  const { credentials, config, integrationConfig, credentialsId } = await getGoogleCredentials(ctx, 'google_search_console')

  const siteUrl = validated.siteUrl || (integrationConfig?.siteUrl as string | undefined)

  if (!siteUrl) {
    throw new IntegrationError(
      'google_search_console',
      'No site URL provided and none configured. Please configure a site URL in the integration settings or provide one in the query.',
      { action: 'configure_integration', provider: 'google_search_console' }
    )
  }

  const client = new SearchConsoleClient(credentials, config)
  client.onTokenRefresh = createTokenRefreshCallback(ctx, credentialsId)

  try {
    const result = await client.getSearchPerformance({
      siteUrl,
      startDate: validated.startDate,
      endDate: validated.endDate,
      dimensions: validated.dimensions,
      rowLimit: validated.rowLimit,
    })

    return {
      siteUrl,
      rows: result.rows,
      rowCount: result.rows.length,
      responseAggregationType: result.responseAggregationType,
    }
  } catch (error) {
    handleGoogleError(error, 'google_search_console')
  }
}

export async function executeQueryGA(args: unknown, ctx: ToolContext) {
  const validated = validateArgs(queryGAArgsSchema, args)
  const { credentials, config, integrationConfig, credentialsId } = await getGoogleCredentials(ctx, 'google_analytics')

  const propertyId = validated.propertyId || (integrationConfig?.propertyId as string | undefined)

  if (!propertyId) {
    throw new IntegrationError(
      'google_analytics',
      'No property ID provided and none configured. Please configure a GA4 property in the integration settings or provide one in the query.',
      { action: 'configure_integration', provider: 'google_analytics' }
    )
  }

  const client = new AnalyticsClient(credentials, config)
  client.onTokenRefresh = createTokenRefreshCallback(ctx, credentialsId)

  try {
    const result = await client.runReport({
      propertyId,
      dateRanges: [{ startDate: validated.startDate, endDate: validated.endDate }],
      metrics: validated.metrics,
      dimensions: validated.dimensions,
      limit: validated.limit,
    })

    return {
      propertyId,
      rows: result.rows,
      rowCount: result.rowCount,
      totals: result.totals ?? null,
    }
  } catch (error) {
    handleGoogleError(error, 'google_analytics')
  }
}

export async function executeListGSCSites(args: unknown, ctx: ToolContext) {
  validateArgs(listGSCSitesArgsSchema, args)
  const { credentials, config, integrationConfig, credentialsId } = await getGoogleCredentials(ctx, 'google_search_console')

  const client = new SearchConsoleClient(credentials, config)
  client.onTokenRefresh = createTokenRefreshCallback(ctx, credentialsId)

  try {
    const result = await client.listSites()

    return {
      sites: result.sites,
      configuredSite: integrationConfig?.siteUrl ?? null,
    }
  } catch (error) {
    handleGoogleError(error, 'google_search_console')
  }
}

export async function executeListGAProperties(args: unknown, ctx: ToolContext) {
  validateArgs(listGAPropertiesArgsSchema, args)
  const { credentials, config, integrationConfig, credentialsId } = await getGoogleCredentials(ctx, 'google_analytics')

  const client = new AnalyticsClient(credentials, config)
  client.onTokenRefresh = createTokenRefreshCallback(ctx, credentialsId)

  try {
    const result = await client.listProperties()

    return {
      properties: result.properties,
      configuredProperty: integrationConfig?.propertyId ?? null,
    }
  } catch (error) {
    handleGoogleError(error, 'google_analytics')
  }
}

export async function executeListGoogleAdsAccounts(args: unknown, ctx: ToolContext) {
  validateArgs(listGoogleAdsAccountsArgsSchema, args)
  const { credentials, config, integrationConfig, credentialsId } = await getAdsCredentials(ctx)

  const client = new AdsClient(credentials, config)
  client.onTokenRefresh = createTokenRefreshCallback(ctx, credentialsId)

  try {
    const result = await client.listAccessibleCustomers()

    return {
      customers: result.customers,
      configuredCustomer: integrationConfig?.customerId ?? null,
    }
  } catch (error) {
    handleGoogleError(error, 'google_ads')
  }
}

export async function executeQueryGoogleAds(args: unknown, ctx: ToolContext) {
  const validated = validateArgs(queryGoogleAdsArgsSchema, args)
  const { credentials, config, integrationConfig, credentialsId } = await getAdsCredentials(ctx)

  const customerId = validated.customerId || (integrationConfig?.customerId as string | undefined)

  if (!customerId) {
    throw new IntegrationError(
      'google_ads',
      'No customer ID provided and none configured. Please configure a Google Ads account in the integration settings or provide one in the query.',
      { action: 'configure_integration', provider: 'google_ads' }
    )
  }

  const client = new AdsClient(credentials, config)
  client.onTokenRefresh = createTokenRefreshCallback(ctx, credentialsId)

  try {
    const result = await client.runQuery({
      customerId,
      query: validated.query,
    })

    return {
      customerId,
      results: result.results,
      rowCount: result.rowCount,
    }
  } catch (error) {
    handleGoogleError(error, 'google_ads')
  }
}

export async function executeConfigureIntegration(args: unknown, ctx: ToolContext) {
  const validated = validateArgs(configureIntegrationArgsSchema, args)
  const { db, workspaceId } = ctx

  const [integration] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.workspaceId, workspaceId),
        eq(integrations.provider, validated.provider),
        eq(integrations.isEnabled, true)
      )
    )
    .limit(1)

  if (!integration) {
    throw new IntegrationError(
      validated.provider,
      `Integration not connected. Please connect ${validated.provider} first.`,
      { action: 'connect_integration', provider: validated.provider }
    )
  }

  const newConfig = {
    ...(integration.config as Record<string, unknown> ?? {}),
    ...validated.config,
  }

  await db
    .update(integrations)
    .set({ config: newConfig, updatedAt: new Date() })
    .where(eq(integrations.id, integration.id))

  return {
    success: true,
    provider: validated.provider,
    config: newConfig,
  }
}
