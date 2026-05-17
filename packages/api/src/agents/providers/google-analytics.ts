import { tool } from 'ai'
import { z } from 'zod'
import type { ToolProvider, ProviderContext } from '../interfaces'
import { toolRegistry } from '../registry'
import { AnalyticsClient } from '../../integrations/google'
import type { GoogleCredentials, GoogleClientConfig } from '../../integrations/google'

const googleAnalyticsProvider: ToolProvider = {
  id: 'google_analytics',
  name: 'Google Analytics',
  capabilities: ['traffic_analysis', 'conversion_tracking', 'audience_insights'],

  async isAvailable(ctx: ProviderContext): Promise<boolean> {
    const creds = await ctx.getCredentials()
    return creds !== null
  },

  getTools(ctx: ProviderContext) {
    const createClient = async (): Promise<AnalyticsClient> => {
      const creds = await ctx.getCredentials()
      if (!creds) throw new Error('Google Analytics credentials not found')

      const credentials: GoogleCredentials = {
        accessToken: creds.accessToken ?? '',
        refreshToken: creds.refreshToken ?? '',
      }

      const config: GoogleClientConfig = {
        clientId: creds.clientId ?? '',
        clientSecret: creds.clientSecret ?? '',
      }

      return new AnalyticsClient(credentials, config)
    }

    return {
      get_traffic_overview: tool({
        description:
          'Get traffic overview from Google Analytics including sessions, users, pageviews, and bounce rate',
        inputSchema: z.object({
          propertyId: z.string().describe('GA4 property ID (e.g., "properties/123456789")'),
          startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Start date (YYYY-MM-DD)'),
          endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('End date (YYYY-MM-DD)'),
          compareStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Comparison start date'),
          compareEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Comparison end date'),
        }),
        execute: async (params) => {
          const client = await createClient()

          const compareDateRange = params.compareStartDate && params.compareEndDate
            ? { startDate: params.compareStartDate, endDate: params.compareEndDate }
            : undefined

          const result = await client.getTrafficOverview(
            params.propertyId,
            { startDate: params.startDate, endDate: params.endDate },
            compareDateRange
          )

          return {
            rows: result.rows,
            totals: result.totals ?? null,
            metadata: result.metadata ?? null,
          }
        },
      }),

      get_top_pages: tool({
        description: 'Get top pages by traffic from Google Analytics',
        inputSchema: z.object({
          propertyId: z.string().describe('GA4 property ID'),
          startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Start date (YYYY-MM-DD)'),
          endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('End date (YYYY-MM-DD)'),
          limit: z.number().min(1).max(500).default(25).describe('Number of pages to return'),
          orderBy: z
            .enum(['sessions', 'screenPageViews', 'totalUsers', 'bounceRate'])
            .default('sessions')
            .describe('Metric to sort by'),
        }),
        execute: async (params) => {
          const client = await createClient()
          const result = await client.getTopPages(
            params.propertyId,
            { startDate: params.startDate, endDate: params.endDate },
            { limit: params.limit, orderBy: params.orderBy }
          )

          return {
            pages: result.rows,
            rowCount: result.rowCount,
          }
        },
      }),

      get_conversions: tool({
        description: 'Get conversion data from Google Analytics including goal completions and e-commerce metrics',
        inputSchema: z.object({
          propertyId: z.string().describe('GA4 property ID'),
          startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Start date (YYYY-MM-DD)'),
          endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('End date (YYYY-MM-DD)'),
          dimensions: z
            .array(z.enum(['date', 'sessionSource', 'sessionMedium', 'pagePath', 'eventName']))
            .default(['eventName'])
            .describe('Dimensions to group by'),
        }),
        execute: async (params) => {
          const client = await createClient()
          const result = await client.getConversions(
            params.propertyId,
            { startDate: params.startDate, endDate: params.endDate },
            params.dimensions
          )

          return {
            conversions: result.rows,
            totals: result.totals ?? null,
            rowCount: result.rowCount,
          }
        },
      }),
    }
  },
}

toolRegistry.register(googleAnalyticsProvider)

export default googleAnalyticsProvider
