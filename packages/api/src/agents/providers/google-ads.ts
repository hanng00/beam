import { tool } from 'ai'
import { z } from 'zod'
import type { ToolProvider, ProviderContext } from '../interfaces'
import { toolRegistry } from '../registry'

const GOOGLE_ADS_API = 'https://googleads.googleapis.com/v18'

interface GoogleAdsResponse {
  results?: unknown[]
  fieldMask?: string
}

async function googleAdsFetch(
  endpoint: string,
  accessToken: string,
  developerToken: string,
  customerId: string,
  body?: unknown
): Promise<GoogleAdsResponse[]> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'developer-token': developerToken,
      'login-customer-id': customerId,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Google Ads API error (${res.status}): ${error}`)
  }

  return res.json() as Promise<GoogleAdsResponse[]>
}

const googleAdsProvider: ToolProvider = {
  id: 'google_ads',
  name: 'Google Ads',
  capabilities: ['paid_advertising', 'campaign_reporting', 'keyword_data'],

  async isAvailable(ctx: ProviderContext): Promise<boolean> {
    const creds = await ctx.getCredentials()
    return creds !== null
  },

  getTools(ctx: ProviderContext) {
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
          const creds = await ctx.getCredentials()
          if (!creds) throw new Error('Google Ads credentials not found')
          const accessToken = creds.accessToken ?? ''
          const developerToken = creds.developerToken ?? ''

          let query = `SELECT campaign.name, campaign.status, campaign.id, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.average_cpc FROM campaign WHERE segments.date BETWEEN '${params.startDate}' AND '${params.endDate}'`

          if (params.campaignStatus) {
            query += ` AND campaign.status = '${params.campaignStatus}'`
          }

          query += ` ORDER BY metrics.cost_micros DESC LIMIT ${params.limit}`

          const data = await googleAdsFetch(
            `${GOOGLE_ADS_API}/customers/${params.customerId}/googleAds:searchStream`,
            accessToken,
            developerToken,
            params.customerId,
            { query }
          )

          const results = data.flatMap((batch) => batch.results ?? [])
          return { campaigns: results, rowCount: results.length }
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
          const creds = await ctx.getCredentials()
          if (!creds) throw new Error('Google Ads credentials not found')
          const accessToken = creds.accessToken ?? ''
          const developerToken = creds.developerToken ?? ''

          let query = `SELECT ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, ad_group_criterion.quality_info.quality_score, campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.average_cpc FROM keyword_view WHERE segments.date BETWEEN '${params.startDate}' AND '${params.endDate}'`

          if (params.campaignId) {
            query += ` AND campaign.id = ${params.campaignId}`
          }

          query += ` ORDER BY metrics.impressions DESC LIMIT ${params.limit}`

          const data = await googleAdsFetch(
            `${GOOGLE_ADS_API}/customers/${params.customerId}/googleAds:searchStream`,
            accessToken,
            developerToken,
            params.customerId,
            { query }
          )

          const results = data.flatMap((batch) => batch.results ?? [])
          return { keywords: results, rowCount: results.length }
        },
      }),
    }
  },
}

toolRegistry.register(googleAdsProvider)

export default googleAdsProvider
