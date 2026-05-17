/**
 * Google Ads API client
 * 
 * Note: Google Ads API requires a developer token in addition to OAuth credentials.
 */

import { GoogleClient } from './client'
import { GoogleApiError } from './errors'
import type { GoogleCredentials, GoogleClientConfig } from './types/common'
import type {
  AdsClientConfig,
  ListAccessibleCustomersResponse,
  QueryParams,
  QueryResponse,
  CampaignPerformanceParams,
  CampaignPerformanceResponse,
  KeywordPerformanceParams,
  KeywordPerformanceResponse,
} from './types/ads'

const GOOGLE_ADS_API = 'https://googleads.googleapis.com/v18'

interface RawSearchStreamResponse {
  results?: unknown[]
  fieldMask?: string
}

export class AdsClient extends GoogleClient {
  private developerToken: string

  constructor(
    credentials: GoogleCredentials,
    config: AdsClientConfig
  ) {
    super(credentials, { clientId: config.clientId, clientSecret: config.clientSecret })
    this.developerToken = config.developerToken
  }

  /**
   * Override fetch to include developer token and login-customer-id headers
   */
  protected async fetchAds<T>(
    url: string,
    customerId: string,
    options?: RequestInit
  ): Promise<T> {
    let response = await this.doAdsFetch(url, customerId, options)

    if (response.status === 401) {
      await this.refreshToken()
      response = await this.doAdsFetch(url, customerId, options)
    }

    if (!response.ok) {
      const errorBody = await response.text()
      throw new GoogleApiError(response.status, errorBody, url)
    }

    return response.json() as Promise<T>
  }

  private async doAdsFetch(
    url: string,
    customerId: string,
    options?: RequestInit
  ): Promise<Response> {
    return fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.credentials.accessToken}`,
        'Content-Type': 'application/json',
        'developer-token': this.developerToken,
        'login-customer-id': customerId,
        ...options?.headers,
      },
    })
  }

  /**
   * List all accessible customer accounts
   */
  async listAccessibleCustomers(): Promise<ListAccessibleCustomersResponse> {
    const url = `${GOOGLE_ADS_API}/customers:listAccessibleCustomers`
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.credentials.accessToken}`,
        'developer-token': this.developerToken,
      },
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new GoogleApiError(response.status, errorBody, url)
    }

    const data = (await response.json()) as { resourceNames?: string[] }

    return {
      customers: (data.resourceNames ?? []).map((name: string) =>
        name.replace('customers/', '')
      ),
    }
  }

  /**
   * Run a GAQL query
   */
  async runQuery(params: QueryParams): Promise<QueryResponse> {
    const url = `${GOOGLE_ADS_API}/customers/${params.customerId}/googleAds:searchStream`

    const data = await this.fetchAds<RawSearchStreamResponse[]>(url, params.customerId, {
      method: 'POST',
      body: JSON.stringify({ query: params.query }),
    })

    const results = data.flatMap((batch) => batch.results ?? [])

    return {
      results,
      rowCount: results.length,
    }
  }

  /**
   * Get campaign performance data
   */
  async getCampaignPerformance(params: CampaignPerformanceParams): Promise<CampaignPerformanceResponse> {
    let query = `
      SELECT 
        campaign.name, 
        campaign.status, 
        campaign.id, 
        metrics.impressions, 
        metrics.clicks, 
        metrics.cost_micros, 
        metrics.conversions, 
        metrics.average_cpc 
      FROM campaign 
      WHERE segments.date BETWEEN '${params.startDate}' AND '${params.endDate}'
    `.trim()

    if (params.campaignStatus) {
      query += ` AND campaign.status = '${params.campaignStatus}'`
    }

    query += ` ORDER BY metrics.cost_micros DESC LIMIT ${params.limit ?? 50}`

    const result = await this.runQuery({
      customerId: params.customerId,
      query,
    })

    return {
      campaigns: result.results as CampaignPerformanceResponse['campaigns'],
      rowCount: result.rowCount,
    }
  }

  /**
   * Get keyword performance data
   */
  async getKeywordPerformance(params: KeywordPerformanceParams): Promise<KeywordPerformanceResponse> {
    let query = `
      SELECT 
        ad_group_criterion.keyword.text, 
        ad_group_criterion.keyword.match_type, 
        ad_group_criterion.quality_info.quality_score, 
        campaign.name, 
        metrics.impressions, 
        metrics.clicks, 
        metrics.cost_micros, 
        metrics.conversions, 
        metrics.average_cpc 
      FROM keyword_view 
      WHERE segments.date BETWEEN '${params.startDate}' AND '${params.endDate}'
    `.trim()

    if (params.campaignId) {
      query += ` AND campaign.id = ${params.campaignId}`
    }

    query += ` ORDER BY metrics.impressions DESC LIMIT ${params.limit ?? 50}`

    const result = await this.runQuery({
      customerId: params.customerId,
      query,
    })

    return {
      keywords: result.results as KeywordPerformanceResponse['keywords'],
      rowCount: result.rowCount,
    }
  }
}

export type {
  AdsClientConfig,
  ListAccessibleCustomersResponse,
  QueryParams,
  QueryResponse,
  CampaignPerformanceParams,
  CampaignPerformanceResponse,
  KeywordPerformanceParams,
  KeywordPerformanceResponse,
}
