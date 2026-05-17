/**
 * Google API integrations - typed fetch wrappers with automatic token refresh
 */

// Base client and errors
export { GoogleClient } from './client'
export { GoogleApiError, TokenRefreshError, MissingCredentialsError, ConfigurationError } from './errors'

// API clients
export { SearchConsoleClient } from './search-console'
export { AnalyticsClient } from './analytics'
export { AdsClient } from './ads'

// Common types
export type { GoogleCredentials, GoogleClientConfig, TokenRefreshCallback } from './types/common'

// Search Console types
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
  SearchDimension,
  DimensionFilter,
  DimensionFilterGroup,
} from './types/search-console'

// Analytics types
export type {
  RunReportParams,
  RunReportResponse,
  ReportRow,
  ListPropertiesResponse,
  DateRange,
} from './types/analytics'

// Ads types
export type {
  AdsClientConfig,
  ListAccessibleCustomersResponse,
  QueryParams,
  QueryResponse,
  CampaignPerformanceParams,
  CampaignPerformanceResponse,
  KeywordPerformanceParams,
  KeywordPerformanceResponse,
} from './types/ads'
