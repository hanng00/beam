import { tool } from 'ai'
import { z } from 'zod'
import type { ToolProvider, ProviderContext } from '../interfaces'
import { toolRegistry } from '../registry'
import { SearchConsoleClient } from '../../integrations/google'
import type { GoogleCredentials, GoogleClientConfig } from '../../integrations/google'

const googleSearchConsoleProvider: ToolProvider = {
  id: 'google_search_console',
  name: 'Google Search Console',
  capabilities: ['seo_analysis', 'keyword_tracking', 'index_monitoring'],

  async isAvailable(ctx: ProviderContext): Promise<boolean> {
    const creds = await ctx.getCredentials()
    return creds !== null
  },

  getTools(ctx: ProviderContext) {
    const createClient = async (): Promise<SearchConsoleClient> => {
      const creds = await ctx.getCredentials()
      if (!creds) throw new Error('Google Search Console credentials not found')

      const credentials: GoogleCredentials = {
        accessToken: creds.accessToken ?? '',
        refreshToken: creds.refreshToken ?? '',
      }

      const config: GoogleClientConfig = {
        clientId: creds.clientId ?? '',
        clientSecret: creds.clientSecret ?? '',
      }

      return new SearchConsoleClient(credentials, config)
    }

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
          const client = await createClient()
          const result = await client.getSearchPerformance({
            siteUrl: params.siteUrl,
            startDate: params.startDate,
            endDate: params.endDate,
            dimensions: params.dimensions,
            rowLimit: params.rowLimit,
            dimensionFilterGroups: params.dimensionFilterGroups,
          })

          return {
            rows: result.rows,
            responseAggregationType: result.responseAggregationType,
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
          const client = await createClient()
          const result = await client.getIndexStatus({
            siteUrl: params.siteUrl,
            inspectionUrl: params.inspectionUrl,
          })

          return {
            inspectionResult: result.inspectionResult,
          }
        },
      }),

      list_sitemaps: tool({
        description: 'List sitemaps submitted to Google Search Console',
        inputSchema: z.object({
          siteUrl: z.string().describe('Site URL as registered in GSC'),
        }),
        execute: async (params) => {
          const client = await createClient()
          const result = await client.listSitemaps(params.siteUrl)

          return {
            sitemaps: result.sitemaps,
          }
        },
      }),
    }
  },
}

toolRegistry.register(googleSearchConsoleProvider)

export default googleSearchConsoleProvider
