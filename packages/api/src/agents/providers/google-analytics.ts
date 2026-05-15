import { tool } from 'ai'
import { z } from 'zod'
import type { ToolProvider, ProviderContext } from '../interfaces'
import { toolRegistry } from '../registry'

const GA4_API_BASE = 'https://analyticsdata.googleapis.com/v1beta'

interface GaResponse {
  rows?: unknown[]
  totals?: unknown
  metadata?: unknown
  rowCount?: number
}

async function gaFetch(
  endpoint: string,
  accessToken: string,
  body?: unknown
): Promise<GaResponse> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`GA4 API error (${res.status}): ${error}`)
  }

  return res.json() as Promise<GaResponse>
}

const googleAnalyticsProvider: ToolProvider = {
  id: 'google_analytics',
  name: 'Google Analytics',
  capabilities: ['traffic_analysis', 'conversion_tracking', 'audience_insights'],

  async isAvailable(ctx: ProviderContext): Promise<boolean> {
    const creds = await ctx.getCredentials()
    return creds !== null
  },

  getTools(ctx: ProviderContext) {
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
          const creds = await ctx.getCredentials()
          if (!creds) throw new Error('Google Analytics credentials not found')
          const accessToken = creds.accessToken ?? ''

          const dateRanges: Array<{ startDate: string; endDate: string }> = [
            { startDate: params.startDate, endDate: params.endDate },
          ]

          if (params.compareStartDate && params.compareEndDate) {
            dateRanges.push({ startDate: params.compareStartDate, endDate: params.compareEndDate })
          }

          const data = await gaFetch(
            `${GA4_API_BASE}/${params.propertyId}:runReport`,
            accessToken,
            {
              dateRanges,
              metrics: [
                { name: 'sessions' },
                { name: 'totalUsers' },
                { name: 'screenPageViews' },
                { name: 'bounceRate' },
                { name: 'averageSessionDuration' },
              ],
              dimensions: [{ name: 'date' }],
            }
          )

          return {
            rows: data.rows ?? [],
            totals: data.totals ?? null,
            metadata: data.metadata ?? null,
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
          const creds = await ctx.getCredentials()
          if (!creds) throw new Error('Google Analytics credentials not found')
          const accessToken = creds.accessToken ?? ''

          const data = await gaFetch(
            `${GA4_API_BASE}/${params.propertyId}:runReport`,
            accessToken,
            {
              dateRanges: [{ startDate: params.startDate, endDate: params.endDate }],
              metrics: [
                { name: 'sessions' },
                { name: 'screenPageViews' },
                { name: 'totalUsers' },
                { name: 'bounceRate' },
                { name: 'averageSessionDuration' },
              ],
              dimensions: [{ name: 'pagePath' }],
              orderBys: [{ metric: { metricName: params.orderBy }, desc: true }],
              limit: params.limit,
            }
          )

          return {
            pages: data.rows ?? [],
            rowCount: data.rowCount ?? 0,
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
          const creds = await ctx.getCredentials()
          if (!creds) throw new Error('Google Analytics credentials not found')
          const accessToken = creds.accessToken ?? ''

          const data = await gaFetch(
            `${GA4_API_BASE}/${params.propertyId}:runReport`,
            accessToken,
            {
              dateRanges: [{ startDate: params.startDate, endDate: params.endDate }],
              metrics: [
                { name: 'conversions' },
                { name: 'totalRevenue' },
                { name: 'sessions' },
              ],
              dimensions: params.dimensions.map((d: string) => ({ name: d })),
              dimensionFilter: {
                filter: {
                  fieldName: 'isConversionEvent',
                  stringFilter: { value: 'true' },
                },
              },
            }
          )

          return {
            conversions: data.rows ?? [],
            totals: data.totals ?? null,
            rowCount: data.rowCount ?? 0,
          }
        },
      }),
    }
  },
}

toolRegistry.register(googleAnalyticsProvider)

export default googleAnalyticsProvider
