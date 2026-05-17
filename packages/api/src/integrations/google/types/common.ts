/**
 * Common types shared across Google API clients
 */

export interface GoogleCredentials {
  accessToken: string
  refreshToken: string
}

export interface GoogleClientConfig {
  clientId: string
  clientSecret: string
}

export interface DateRange {
  startDate: string
  endDate: string
}

export interface TokenRefreshCallback {
  (newAccessToken: string): Promise<void>
}
