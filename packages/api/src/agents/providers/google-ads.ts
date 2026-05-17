import { tool } from 'ai'
import { z } from 'zod'
import type { ToolProvider, ProviderContext } from '../interfaces'
import { toolRegistry } from '../registry'
import { AdsClient } from '../../integrations/google'
import type { GoogleCredentials, AdsClientConfig } from '../../integrations/google'

const googleAdsProvider: ToolProvider = {
  id: 'google_ads',
  name: 'Google Ads',
  capabilities: ['paid_advertising', 'campaign_reporting', 'keyword_data'],

  async isAvailable(ctx: ProviderContext): Promise<boolean> {
    const creds = await ctx.getCredentials()
    return creds !== null
  },

  getTools(ctx: ProviderContext) {
    const createClient = async (): Promise<AdsClient> => {
      const creds = await ctx.getCredentials()
      if (!creds) throw new Error('Google Ads credentials not found')

      const credentials: GoogleCredentials = {
        accessToken: creds.accessToken ?? '',
        refreshToken: creds.refreshToken ?? '',
      }

      const config: AdsClientConfig = {
        clientId: creds.clientId ?? '',
        clientSecret: creds.clientSecret ?? '',
        developerToken: creds.developerToken ?? '',
      }

      return new AdsClient(credentials, config)
    }

    return {
      get_campaign_performance: tool({
        description:
          'Get campaign performance data from Google Ads including impressions, clicks, cost, conversions, and CPC',
        inputSchema: z.object({
          customerId: z.string().describe('Google Ads customer ID (without dashes)'),
          startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Start date (YYYY-MM-DD)'),
          endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('End date (YYYY-MM-DD)'),
          campaignStatus: z
            .enum(['ENABLED', 'PAUSED', 'REMOVED'])
            .optional()
            .describe('Filter by campaign status'),
          limit: z.number().min(1).max(1000).default(50).describe('Max rows to return'),
        }),
        execute: async (params) => {
          const client = await createClient()
          const result = await client.getCampaignPerformance({
            customerId: params.customerId,
            startDate: params.startDate,
            endDate: params.endDate,
            campaignStatus: params.campaignStatus,
            limit: params.limit,
          })

          return {
            campaigns: result.campaigns,
            rowCount: result.rowCount,
          }
        },
      }),

      get_keyword_performance: tool({
        description:
          'Get keyword-level performance data from Google Ads including impressions, clicks, cost, conversions, and quality score',
        inputSchema: z.object({
          customerId: z.string().describe('Google Ads customer ID (without dashes)'),
          startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Start date (YYYY-MM-DD)'),
          endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('End date (YYYY-MM-DD)'),
          campaignId: z.string().optional().describe('Filter by campaign ID'),
          limit: z.number().min(1).max(1000).default(50).describe('Max rows to return'),
        }),
        execute: async (params) => {
          const client = await createClient()
          const result = await client.getKeywordPerformance({
            customerId: params.customerId,
            startDate: params.startDate,
            endDate: params.endDate,
            campaignId: params.campaignId,
            limit: params.limit,
          })

          return {
            keywords: result.keywords,
            rowCount: result.rowCount,
          }
        },
      }),
    }
  },
}

toolRegistry.register(googleAdsProvider)

export default googleAdsProvider
