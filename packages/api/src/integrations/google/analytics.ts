/**
 * Google Analytics 4 Data API client
 */

import { GoogleClient } from './client'
import type {
  RunReportParams,
  RunReportResponse,
  ReportRow,
  ListPropertiesResponse,
  DateRange,
} from './types/analytics'

const GA4_DATA_API = 'https://analyticsdata.googleapis.com/v1beta'
const GA_ADMIN_API = 'https://analyticsadmin.googleapis.com/v1beta'

interface RawRunReportResponse {
  rows?: Array<{
    dimensionValues?: Array<{ value: string }>
    metricValues?: Array<{ value: string }>
  }>
  totals?: Array<{ metricValues?: Array<{ value: string }> }>
  rowCount?: number
  metadata?: {
    currencyCode?: string
    timeZone?: string
  }
}

interface RawAccountSummariesResponse {
  accountSummaries?: Array<{
    name: string
    account: string
    displayName: string
    propertySummaries?: Array<{
      property: string
      displayName: string
      propertyType: string
    }>
  }>
}

export class AnalyticsClient extends GoogleClient {
  /**
   * Run a GA4 report with specified metrics and dimensions
   */
  async runReport(params: RunReportParams): Promise<RunReportResponse> {
    const url = `${GA4_DATA_API}/${params.propertyId}:runReport`

    const body: Record<string, unknown> = {
      dateRanges: params.dateRanges,
      metrics: params.metrics.map((m) => ({ name: m })),
      dimensions: params.dimensions?.map((d) => ({ name: d })) ?? [],
      limit: params.limit ?? 100,
    }

    if (params.orderBys && params.orderBys.length > 0) {
      body.orderBys = params.orderBys.map((o) => ({
        ...(o.metric ? { metric: { metricName: o.metric } } : {}),
        ...(o.dimension ? { dimension: { dimensionName: o.dimension } } : {}),
        desc: o.desc ?? true,
      }))
    }

    if (params.dimensionFilter) {
      body.dimensionFilter = params.dimensionFilter
    }

    const data = await this.fetch<RawRunReportResponse>(url, {
      method: 'POST',
      body: JSON.stringify(body),
    })

    return {
      rows: (data.rows ?? []) as ReportRow[],
      totals: data.totals,
      rowCount: data.rowCount ?? data.rows?.length ?? 0,
      metadata: data.metadata,
    }
  }

  /**
   * Get traffic overview (sessions, users, pageviews, bounce rate)
   */
  async getTrafficOverview(
    propertyId: string,
    dateRange: DateRange,
    compareDateRange?: DateRange
  ): Promise<RunReportResponse> {
    const dateRanges: DateRange[] = [dateRange]
    if (compareDateRange) {
      dateRanges.push(compareDateRange)
    }

    return this.runReport({
      propertyId,
      dateRanges,
      metrics: ['sessions', 'totalUsers', 'screenPageViews', 'bounceRate', 'averageSessionDuration'],
      dimensions: ['date'],
    })
  }

  /**
   * Get top pages by traffic
   */
  async getTopPages(
    propertyId: string,
    dateRange: DateRange,
    options?: { limit?: number; orderBy?: string }
  ): Promise<RunReportResponse> {
    return this.runReport({
      propertyId,
      dateRanges: [dateRange],
      metrics: ['sessions', 'screenPageViews', 'totalUsers', 'bounceRate', 'averageSessionDuration'],
      dimensions: ['pagePath'],
      orderBys: [{ metric: options?.orderBy ?? 'sessions', desc: true }],
      limit: options?.limit ?? 25,
    })
  }

  /**
   * Get conversion data
   */
  async getConversions(
    propertyId: string,
    dateRange: DateRange,
    dimensions?: string[]
  ): Promise<RunReportResponse> {
    return this.runReport({
      propertyId,
      dateRanges: [dateRange],
      metrics: ['conversions', 'totalRevenue', 'sessions'],
      dimensions: dimensions ?? ['eventName'],
      dimensionFilter: {
        filter: {
          fieldName: 'isConversionEvent',
          stringFilter: { value: 'true' },
        },
      },
    })
  }

  /**
   * List all GA4 properties accessible to the authenticated user
   */
  async listProperties(): Promise<ListPropertiesResponse> {
    const url = `${GA_ADMIN_API}/accountSummaries`
    const data = await this.fetch<RawAccountSummariesResponse>(url)

    const properties: Array<{ propertyId: string; displayName: string; account: string }> = []

    for (const account of data.accountSummaries ?? []) {
      for (const prop of account.propertySummaries ?? []) {
        properties.push({
          propertyId: prop.property,
          displayName: prop.displayName,
          account: account.displayName,
        })
      }
    }

    return { properties }
  }
}

export type {
  RunReportParams,
  RunReportResponse,
  ReportRow,
  ListPropertiesResponse,
  DateRange,
}
