/**
 * Type definitions for Google Analytics 4 Data API
 */

export interface DateRange {
  startDate: string
  endDate: string
}

export interface Metric {
  name: string
}

export interface Dimension {
  name: string
}

export interface OrderBy {
  metric?: { metricName: string }
  dimension?: { dimensionName: string }
  desc?: boolean
}

export interface DimensionFilter {
  filter: {
    fieldName: string
    stringFilter?: { value: string; matchType?: string }
    inListFilter?: { values: string[] }
    numericFilter?: { operation: string; value: { int64Value?: string; doubleValue?: number } }
  }
}

export interface RunReportParams {
  propertyId: string
  dateRanges: DateRange[]
  metrics: string[]
  dimensions?: string[]
  limit?: number
  orderBys?: Array<{ metric?: string; dimension?: string; desc?: boolean }>
  dimensionFilter?: DimensionFilter
}

export interface ReportRow {
  dimensionValues?: Array<{ value: string }>
  metricValues?: Array<{ value: string }>
}

export interface RunReportResponse {
  rows: ReportRow[]
  totals?: Array<{ metricValues?: Array<{ value: string }> }>
  rowCount: number
  metadata?: {
    currencyCode?: string
    timeZone?: string
  }
}

export interface PropertySummary {
  property: string
  displayName: string
  propertyType: string
}

export interface AccountSummary {
  name: string
  account: string
  displayName: string
  propertySummaries?: PropertySummary[]
}

export interface ListPropertiesResponse {
  properties: Array<{
    propertyId: string
    displayName: string
    account: string
  }>
}
