import { tool } from 'ai'
import { z } from 'zod'
import type { ToolProvider, ProviderContext } from '../interfaces'
import { toolRegistry } from '../registry'

const GSC_API_BASE = 'https://www.googleapis.com/webmasters/v3'
const SEARCH_ANALYTICS_API = 'https://searchconsole.googleapis.com/webmasters/v3'

interface GscResponse {
  rows?: unknown[]
  responseAggregationType?: string
  sitemap?: unknown[]
  inspectionResult?: unknown
}

async function gscFetch(
  endpoint: string,
  accessToken: string,
  options?: { method?: string; body?: unknown }
): Promise<GscResponse> {
  const res = await fetch(endpoint, {
    method: options?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`GSC API error (${res.status}): ${error}`)
  }

  return res.json() as Promise<GscResponse>
}

const googleSearchConsoleProvider: ToolProvider = {
  id: 'google_search_console',
  name: 'Google Search Console',
  capabilities: ['seo_analysis', 'keyword_tracking', 'index_monitoring'],

  async isAvailable(ctx: ProviderContext): Promise<boolean> {
    const creds = await ctx.getCredentials()
    return creds !== null
  },

  getTools(ctx: ProviderContext) {
    return {
      get_search_performance: tool({
        description:
          'Get search performance data from Google Search Console including clicks, impressions, CTR, and position for queries and pages',
        inputSchema: z.object({
          siteUrl: z.string().describe('Site URL as registered in GSC (e.g., https://example.com)'),
          startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Start date (YYYY-MM-DD)'),
          endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('End date (YYYY-MM-DD)'),
          dimensions: z
            .array(z.enum(['query', 'page', 'country', 'device', 'date']))
            .default(['query'])
            .describe('Dimensions to group by'),
          rowLimit: z.number().min(1).max(25000).default(100),
          dimensionFilterGroups: z
            .array(
              z.object({
                filters: z.array(
                  z.object({
                    dimension: z.enum(['query', 'page', 'country', 'device']),
                    operator: z.enum(['contains', 'equals', 'notContains', 'notEquals']).default('contains'),
                    expression: z.string(),
                  })
                ),
              })
            )
            .optional()
            .describe('Filters to apply'),
        }),
        execute: async (params) => {
          const creds = await ctx.getCredentials()
          if (!creds) throw new Error('Google Search Console credentials not found')
          const accessToken = creds.accessToken ?? ''

          const data = await gscFetch(
            `${SEARCH_ANALYTICS_API}/sites/${encodeURIComponent(params.siteUrl)}/searchAnalytics/query`,
            accessToken,
            {
              method: 'POST',
              body: {
                startDate: params.startDate,
                endDate: params.endDate,
                dimensions: params.dimensions,
                rowLimit: params.rowLimit,
                dimensionFilterGroups: params.dimensionFilterGroups,
              },
            }
          )

          return {
            rows: data.rows ?? [],
            responseAggregationType: data.responseAggregationType ?? null,
          }
        },
      }),

      get_index_status: tool({
        description:
          'Get URL inspection / index coverage status for pages in Google Search Console',
        inputSchema: z.object({
          siteUrl: z.string().describe('Site URL as registered in GSC'),
          inspectionUrl: z.string().describe('URL to inspect'),
        }),
        execute: async (params) => {
          const creds = await ctx.getCredentials()
          if (!creds) throw new Error('Google Search Console credentials not found')
          const accessToken = creds.accessToken ?? ''

          const data = await gscFetch(
            'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',
            accessToken,
            {
              method: 'POST',
              body: {
                inspectionUrl: params.inspectionUrl,
                siteUrl: params.siteUrl,
              },
            }
          )

          return {
            inspectionResult: data.inspectionResult ?? null,
          }
        },
      }),

      list_sitemaps: tool({
        description: 'List sitemaps submitted to Google Search Console',
        inputSchema: z.object({
          siteUrl: z.string().describe('Site URL as registered in GSC'),
        }),
        execute: async (params) => {
          const creds = await ctx.getCredentials()
          if (!creds) throw new Error('Google Search Console credentials not found')
          const accessToken = creds.accessToken ?? ''

          const data = await gscFetch(
            `${GSC_API_BASE}/sites/${encodeURIComponent(params.siteUrl)}/sitemaps`,
            accessToken
          )

          return {
            sitemaps: data.sitemap ?? [],
          }
        },
      }),
    }
  },
}

toolRegistry.register(googleSearchConsoleProvider)

export default googleSearchConsoleProvider
