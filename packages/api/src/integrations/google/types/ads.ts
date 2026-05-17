/**
 * Type definitions for Google Ads API
 */

export interface AdsClientConfig {
  clientId: string
  clientSecret: string
  developerToken: string
}

export interface ListAccessibleCustomersResponse {
  customers: string[]
}

export interface QueryParams {
  customerId: string
  query: string
}

export interface QueryResponse {
  results: unknown[]
  rowCount: number
}

export interface CampaignPerformanceParams {
  customerId: string
  startDate: string
  endDate: string
  campaignStatus?: 'ENABLED' | 'PAUSED' | 'REMOVED'
  limit?: number
}

export interface CampaignPerformanceRow {
  campaign: {
    name: string
    status: string
    id: string
  }
  metrics: {
    impressions: string
    clicks: string
    costMicros: string
    conversions: number
    averageCpc: string
  }
}

export interface CampaignPerformanceResponse {
  campaigns: CampaignPerformanceRow[]
  rowCount: number
}

export interface KeywordPerformanceParams {
  customerId: string
  startDate: string
  endDate: string
  campaignId?: string
  limit?: number
}

export interface KeywordPerformanceRow {
  adGroupCriterion: {
    keyword: {
      text: string
      matchType: string
    }
    qualityInfo?: {
      qualityScore: number
    }
  }
  campaign: {
    name: string
  }
  metrics: {
    impressions: string
    clicks: string
    costMicros: string
    conversions: number
    averageCpc: string
  }
}

export interface KeywordPerformanceResponse {
  keywords: KeywordPerformanceRow[]
  rowCount: number
}
