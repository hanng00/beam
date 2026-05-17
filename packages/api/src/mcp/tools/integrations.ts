import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { integrations, integrationCredentials } from '@beam/db/schema'
import { integrationProviders } from '@beam/core/schemas'
import { IntegrationError } from '@beam/core/utils'
import { createMcpTool, validateArgs } from '../tool-builder'
import type { ToolContext } from './types'

const SEARCH_ANALYTICS_API = 'https://searchconsole.googleapis.com/webmasters/v3'
const GA4_API_BASE = 'https://analyticsdata.googleapis.com/v1beta'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

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

// Refresh Google OAuth token
async function refreshGoogleToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token refresh failed: ${error}`)
  }

  const data = await response.json() as { access_token: string; expires_in: number }
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  }
}

// Helper to get OAuth credentials for a provider (with auto-refresh)
async function getOAuthCredentials(
  ctx: ToolContext,
  provider: 'google_search_console' | 'google_analytics' | 'google_ads'
): Promise<{ accessToken: string; config: Record<string, unknown> | null }> {
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

  // Always refresh the token (simpler than tracking expiry)
  try {
    const { accessToken } = await refreshGoogleToken(
      creds.refreshToken,
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET
    )

    // Update stored access token
    await db
      .update(integrationCredentials)
      .set({ accessToken })
      .where(eq(integrationCredentials.id, creds.id))

    return { 
      accessToken,
      config: integration.config as Record<string, unknown> | null
    }
  } catch (error) {
    throw new IntegrationError(
      provider,
      `Failed to refresh OAuth token: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { action: 'reconnect_integration', provider }
    )
  }
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
  const { accessToken, config } = await getOAuthCredentials(ctx, 'google_search_console')

  // Use provided siteUrl or fall back to configured one
  const siteUrl = validated.siteUrl || (config?.siteUrl as string | undefined)
  
  if (!siteUrl) {
    throw new IntegrationError(
      'google_search_console',
      'No site URL provided and none configured. Please configure a site URL in the integration settings or provide one in the query.',
      { action: 'configure_integration', provider: 'google_search_console' }
    )
  }

  const response = await fetch(
    `${SEARCH_ANALYTICS_API}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: validated.startDate,
        endDate: validated.endDate,
        dimensions: validated.dimensions,
        rowLimit: validated.rowLimit,
      }),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new IntegrationError(
      'google_search_console',
      `GSC API error (${response.status}): ${errorText}`,
      { status: response.status }
    )
  }

  const data = await response.json() as { rows?: unknown[]; responseAggregationType?: string }

  return {
    siteUrl,
    rows: data.rows ?? [],
    rowCount: data.rows?.length ?? 0,
    responseAggregationType: data.responseAggregationType ?? null,
  }
}

export async function executeQueryGA(args: unknown, ctx: ToolContext) {
  const validated = validateArgs(queryGAArgsSchema, args)
  const { accessToken, config } = await getOAuthCredentials(ctx, 'google_analytics')

  // Use provided propertyId or fall back to configured one
  const propertyId = validated.propertyId || (config?.propertyId as string | undefined)
  
  if (!propertyId) {
    throw new IntegrationError(
      'google_analytics',
      'No property ID provided and none configured. Please configure a GA4 property in the integration settings or provide one in the query.',
      { action: 'configure_integration', provider: 'google_analytics' }
    )
  }

  const response = await fetch(
    `${GA4_API_BASE}/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: validated.startDate, endDate: validated.endDate }],
        metrics: validated.metrics.map((m: string) => ({ name: m })),
        dimensions: validated.dimensions?.map((d: string) => ({ name: d })) ?? [],
        limit: validated.limit,
      }),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new IntegrationError(
      'google_analytics',
      `GA4 API error (${response.status}): ${errorText}`,
      { status: response.status }
    )
  }

  const data = await response.json() as { rows?: unknown[]; totals?: unknown; rowCount?: number }

  return {
    propertyId,
    rows: data.rows ?? [],
    rowCount: data.rowCount ?? data.rows?.length ?? 0,
    totals: data.totals ?? null,
  }
}

const GSC_SITES_API = 'https://www.googleapis.com/webmasters/v3/sites'
const GA_ADMIN_API = 'https://analyticsadmin.googleapis.com/v1beta'

export async function executeListGSCSites(args: unknown, ctx: ToolContext) {
  validateArgs(listGSCSitesArgsSchema, args)
  const { accessToken, config } = await getOAuthCredentials(ctx, 'google_search_console')

  const response = await fetch(GSC_SITES_API, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new IntegrationError(
      'google_search_console',
      `Failed to list GSC sites (${response.status}): ${errorText}`,
      { status: response.status }
    )
  }

  const data = await response.json() as { siteEntry?: Array<{ siteUrl: string; permissionLevel: string }> }

  return {
    sites: data.siteEntry ?? [],
    configuredSite: config?.siteUrl ?? null,
  }
}

export async function executeListGAProperties(args: unknown, ctx: ToolContext) {
  validateArgs(listGAPropertiesArgsSchema, args)
  const { accessToken, config } = await getOAuthCredentials(ctx, 'google_analytics')

  // First get account summaries
  const response = await fetch(`${GA_ADMIN_API}/accountSummaries`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new IntegrationError(
      'google_analytics',
      `Failed to list GA properties (${response.status}): ${errorText}`,
      { status: response.status }
    )
  }

  const data = await response.json() as {
    accountSummaries?: Array<{
      name: string
      account: string
      displayName: string
      propertySummaries?: Array<{
        property: string
        displayName: string
        propertyType: string
      }>
    }>
  }

  // Flatten to list of properties
  const properties: Array<{ propertyId: string; displayName: string; account: string }> = []
  for (const account of data.accountSummaries ?? []) {
    for (const prop of account.propertySummaries ?? []) {
      properties.push({
        propertyId: prop.property, // e.g., "properties/123456789"
        displayName: prop.displayName,
        account: account.displayName,
      })
    }
  }

  return {
    properties,
    configuredProperty: config?.propertyId ?? null,
  }
}

const GOOGLE_ADS_API = 'https://googleads.googleapis.com/v18'

export async function executeListGoogleAdsAccounts(args: unknown, ctx: ToolContext) {
  validateArgs(listGoogleAdsAccountsArgsSchema, args)
  const { accessToken, config } = await getOAuthCredentials(ctx, 'google_ads')

  const response = await fetch(`${GOOGLE_ADS_API}/customers:listAccessibleCustomers`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new IntegrationError(
      'google_ads',
      `Failed to list Google Ads accounts (${response.status}): ${errorText}`,
      { status: response.status }
    )
  }

  const data = await response.json() as { resourceNames?: string[] }

  // Extract customer IDs from resource names like "customers/1234567890"
  const customers = (data.resourceNames ?? []).map(
    (name: string) => name.replace('customers/', '')
  )

  return {
    customers,
    configuredCustomer: config?.customerId ?? null,
  }
}

export async function executeQueryGoogleAds(args: unknown, ctx: ToolContext) {
  const validated = validateArgs(queryGoogleAdsArgsSchema, args)
  const { accessToken, config } = await getOAuthCredentials(ctx, 'google_ads')
  const { env } = ctx

  const customerId = validated.customerId || (config?.customerId as string | undefined)

  if (!customerId) {
    throw new IntegrationError(
      'google_ads',
      'No customer ID provided and none configured. Please configure a Google Ads account in the integration settings or provide one in the query.',
      { action: 'configure_integration', provider: 'google_ads' }
    )
  }

  const response = await fetch(
    `${GOOGLE_ADS_API}/customers/${customerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'developer-token': env.GOOGLE_ADS_DEVELOPER_TOKEN,
        'login-customer-id': customerId,
      },
      body: JSON.stringify({ query: validated.query }),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new IntegrationError(
      'google_ads',
      `Google Ads API error (${response.status}): ${errorText}`,
      { status: response.status }
    )
  }

  const data = await response.json() as Array<{ results?: unknown[]; fieldMask?: string }>

  // searchStream returns an array of result batches
  const allResults = data.flatMap((batch) => batch.results ?? [])

  return {
    customerId,
    results: allResults,
    rowCount: allResults.length,
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

  // Merge new config with existing
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
