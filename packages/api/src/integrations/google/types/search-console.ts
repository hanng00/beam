/**
 * Type definitions for Google Search Console API
 */

export type SearchDimension = 'query' | 'page' | 'country' | 'device' | 'date'
export type FilterOperator = 'contains' | 'equals' | 'notContains' | 'notEquals'

export interface DimensionFilter {
  dimension: 'query' | 'page' | 'country' | 'device'
  operator: FilterOperator
  expression: string
}

export interface DimensionFilterGroup {
  filters: DimensionFilter[]
}

export interface SearchPerformanceParams {
  siteUrl: string
  startDate: string
  endDate: string
  dimensions?: SearchDimension[]
  rowLimit?: number
  dimensionFilterGroups?: DimensionFilterGroup[]
}

export interface SearchPerformanceRow {
  keys: string[]
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface SearchPerformanceResponse {
  rows: SearchPerformanceRow[]
  responseAggregationType: string | null
}

export interface IndexStatusParams {
  siteUrl: string
  inspectionUrl: string
}

export interface IndexInspectionResult {
  indexStatusResult?: {
    verdict: string
    coverageState: string
    robotsTxtState: string
    indexingState: string
    lastCrawlTime?: string
    pageFetchState: string
    googleCanonical?: string
    userCanonical?: string
    crawledAs?: string
  }
  mobileUsabilityResult?: {
    verdict: string
    issues?: Array<{
      issueType: string
      severity: string
      message: string
    }>
  }
  richResultsResult?: {
    verdict: string
    detectedItems?: Array<{
      richResultType: string
      items?: unknown[]
    }>
  }
}

export interface IndexStatusResponse {
  inspectionResult: IndexInspectionResult | null
}

export interface SitemapEntry {
  path: string
  lastSubmitted?: string
  isPending?: boolean
  isSitemapsIndex?: boolean
  type?: string
  lastDownloaded?: string
  warnings?: number
  errors?: number
  contents?: Array<{
    type: string
    submitted?: number
    indexed?: number
  }>
}

export interface SitemapsResponse {
  sitemaps: SitemapEntry[]
}

export interface SiteEntry {
  siteUrl: string
  permissionLevel: string
}

export interface ListSitesResponse {
  sites: SiteEntry[]
}
