/**
 * Google Search Console API client
 */

import { GoogleClient } from './client'
import type {
  SearchPerformanceParams,
  SearchPerformanceResponse,
  SearchPerformanceRow,
  IndexStatusParams,
  IndexStatusResponse,
  IndexInspectionResult,
  SitemapsResponse,
  SitemapEntry,
  ListSitesResponse,
  SiteEntry,
} from './types/search-console'

const GSC_API_BASE = 'https://www.googleapis.com/webmasters/v3'
const SEARCH_ANALYTICS_API = 'https://searchconsole.googleapis.com/webmasters/v3'
const URL_INSPECTION_API = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect'

interface RawSearchPerformanceResponse {
  rows?: Array<{
    keys: string[]
    clicks: number
    impressions: number
    ctr: number
    position: number
  }>
  responseAggregationType?: string
}

interface RawSitemapsResponse {
  sitemap?: SitemapEntry[]
}

interface RawSitesResponse {
  siteEntry?: SiteEntry[]
}

interface RawInspectionResponse {
  inspectionResult?: IndexInspectionResult
}

export class SearchConsoleClient extends GoogleClient {
  /**
   * Get search performance data (clicks, impressions, CTR, position)
   */
  async getSearchPerformance(params: SearchPerformanceParams): Promise<SearchPerformanceResponse> {
    const url = `${SEARCH_ANALYTICS_API}/sites/${encodeURIComponent(params.siteUrl)}/searchAnalytics/query`

    const data = await this.fetch<RawSearchPerformanceResponse>(url, {
      method: 'POST',
      body: JSON.stringify({
        startDate: params.startDate,
        endDate: params.endDate,
        dimensions: params.dimensions ?? ['query'],
        rowLimit: params.rowLimit ?? 100,
        dimensionFilterGroups: params.dimensionFilterGroups,
      }),
    })

    return {
      rows: (data.rows ?? []) as SearchPerformanceRow[],
      responseAggregationType: data.responseAggregationType ?? null,
    }
  }

  /**
   * Get URL inspection / index status for a specific URL
   */
  async getIndexStatus(params: IndexStatusParams): Promise<IndexStatusResponse> {
    const data = await this.fetch<RawInspectionResponse>(URL_INSPECTION_API, {
      method: 'POST',
      body: JSON.stringify({
        inspectionUrl: params.inspectionUrl,
        siteUrl: params.siteUrl,
      }),
    })

    return {
      inspectionResult: data.inspectionResult ?? null,
    }
  }

  /**
   * List sitemaps submitted for a site
   */
  async listSitemaps(siteUrl: string): Promise<SitemapsResponse> {
    const url = `${GSC_API_BASE}/sites/${encodeURIComponent(siteUrl)}/sitemaps`
    const data = await this.fetch<RawSitemapsResponse>(url)

    return {
      sitemaps: data.sitemap ?? [],
    }
  }

  /**
   * List all sites available in the Search Console account
   */
  async listSites(): Promise<ListSitesResponse> {
    const url = `${GSC_API_BASE}/sites`
    const data = await this.fetch<RawSitesResponse>(url)

    return {
      sites: data.siteEntry ?? [],
    }
  }
}

export type {
  SearchPerformanceParams,
  SearchPerformanceResponse,
  SearchPerformanceRow,
  IndexStatusParams,
  IndexStatusResponse,
  IndexInspectionResult,
  SitemapsResponse,
  SitemapEntry,
  ListSitesResponse,
  SiteEntry,
}
