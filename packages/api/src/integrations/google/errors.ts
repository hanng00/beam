/**
 * Error classes for Google API integrations
 */

export class GoogleApiError extends Error {
  constructor(
    public statusCode: number,
    public body: string,
    public url: string
  ) {
    super(`Google API error (${statusCode}): ${body}`)
    this.name = 'GoogleApiError'
  }

  get isRateLimited(): boolean {
    return this.statusCode === 429
  }

  get isUnauthorized(): boolean {
    return this.statusCode === 401
  }

  get isForbidden(): boolean {
    return this.statusCode === 403
  }

  get isNotFound(): boolean {
    return this.statusCode === 404
  }

  get isServerError(): boolean {
    return this.statusCode >= 500
  }
}

export class TokenRefreshError extends Error {
  constructor(public details: string) {
    super(`Failed to refresh token: ${details}`)
    this.name = 'TokenRefreshError'
  }
}

export class MissingCredentialsError extends Error {
  constructor(public provider: string) {
    super(`Missing credentials for ${provider}`)
    this.name = 'MissingCredentialsError'
  }
}

export class ConfigurationError extends Error {
  constructor(
    public provider: string,
    public field: string,
    message: string
  ) {
    super(message)
    this.name = 'ConfigurationError'
  }
}
