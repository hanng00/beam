/**
 * Base Google API client with automatic token refresh
 */

import { GoogleApiError, TokenRefreshError } from './errors'
import type { GoogleCredentials, GoogleClientConfig, TokenRefreshCallback } from './types/common'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

export abstract class GoogleClient {
  protected credentials: GoogleCredentials
  protected config: GoogleClientConfig
  
  /** Callback invoked when token is refreshed - use to persist new token */
  onTokenRefresh?: TokenRefreshCallback

  constructor(credentials: GoogleCredentials, config: GoogleClientConfig) {
    this.credentials = credentials
    this.config = config
  }

  /**
   * Make an authenticated fetch request with automatic token refresh on 401
   */
  protected async fetch<T>(url: string, options?: RequestInit): Promise<T> {
    let response = await this.doFetch(url, options)

    if (response.status === 401) {
      await this.refreshToken()
      response = await this.doFetch(url, options)
    }

    if (!response.ok) {
      const errorBody = await response.text()
      throw new GoogleApiError(response.status, errorBody, url)
    }

    return response.json() as Promise<T>
  }

  /**
   * Make a raw fetch request with auth headers
   */
  private async doFetch(url: string, options?: RequestInit): Promise<Response> {
    return fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.credentials.accessToken}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })
  }

  /**
   * Refresh the OAuth access token using the refresh token
   */
  protected async refreshToken(): Promise<void> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: this.credentials.refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new TokenRefreshError(errorText)
    }

    const data = (await response.json()) as { access_token: string; expires_in: number }
    this.credentials.accessToken = data.access_token

    if (this.onTokenRefresh) {
      await this.onTokenRefresh(data.access_token)
    }
  }

  /**
   * Get the current access token (useful for debugging)
   */
  get accessToken(): string {
    return this.credentials.accessToken
  }
}

export { GoogleCredentials, GoogleClientConfig, TokenRefreshCallback }
