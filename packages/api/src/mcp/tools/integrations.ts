import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { integrations } from '@beam/db/schema'
import { integrationProviders } from '@beam/core/schemas'
import { IntegrationError } from '@beam/core/utils'
import { createMcpTool, validateArgs } from '../tool-builder'
import type { ToolContext } from './types'

// Zod schemas for integration tools
const getIntegrationsArgsSchema = z.object({}).describe('No arguments required')

const queryGSCArgsSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe('Start date in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe('End date in YYYY-MM-DD format'),
  dimensions: z.array(z.enum(['query', 'page', 'country', 'device', 'date'])).optional()
    .describe('Dimensions to group by'),
  rowLimit: z.number().min(1).max(25000).optional().default(100)
    .describe('Maximum rows to return (default 100, max 25000)'),
})

const queryGAArgsSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe('Start date in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe('End date in YYYY-MM-DD format'),
  metrics: z.array(z.string()).min(1)
    .describe('Metrics to retrieve, e.g., sessions, users, conversions'),
  dimensions: z.array(z.string()).optional()
    .describe('Dimensions to group by, e.g., date, source, medium'),
})

// Tool definitions - generated from Zod schemas
export const integrationTools = [
  createMcpTool(
    'get_integrations',
    'List connected integrations and their status.',
    getIntegrationsArgsSchema
  ),
  createMcpTool(
    'query_google_search_console',
    'Query Google Search Console data for SEO insights. Requires Google Search Console integration.',
    queryGSCArgsSchema
  ),
  createMcpTool(
    'query_google_analytics',
    'Query Google Analytics data for traffic and conversion insights. Requires Google Analytics integration.',
    queryGAArgsSchema
  ),
]

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
  const { db, workspaceId } = ctx

  // Check if GSC integration exists
  const [integration] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.workspaceId, workspaceId))
    .limit(1)

  const gscIntegration = integration?.provider === 'google_search_console' ? integration : null

  if (!gscIntegration || !gscIntegration.isEnabled) {
    throw new IntegrationError(
      'google_search_console',
      'Integration not connected. Please connect Google Search Console in the Beam dashboard.',
      { action: 'connect_integration', provider: 'google_search_console' }
    )
  }

  // TODO: Implement actual GSC API call using stored OAuth tokens
  throw new IntegrationError(
    'google_search_console',
    'GSC API integration not yet implemented',
    { status: 'coming_soon' }
  )
}

export async function executeQueryGA(args: unknown, ctx: ToolContext) {
  const validated = validateArgs(queryGAArgsSchema, args)
  const { db, workspaceId } = ctx

  // Check if GA integration exists
  const [integration] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.workspaceId, workspaceId))
    .limit(1)

  const gaIntegration = integration?.provider === 'google_analytics' ? integration : null

  if (!gaIntegration || !gaIntegration.isEnabled) {
    throw new IntegrationError(
      'google_analytics',
      'Integration not connected. Please connect Google Analytics in the Beam dashboard.',
      { action: 'connect_integration', provider: 'google_analytics' }
    )
  }

  // TODO: Implement actual GA API call using stored OAuth tokens
  throw new IntegrationError(
    'google_analytics',
    'GA API integration not yet implemented',
    { status: 'coming_soon' }
  )
}
