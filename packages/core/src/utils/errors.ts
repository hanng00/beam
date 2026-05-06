export class BeamError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'BeamError'
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      details: this.details,
    }
  }
}

export class NotFoundError extends BeamError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id '${id}' not found` : `${resource} not found`,
      'NOT_FOUND',
      404,
      { resource, id }
    )
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends BeamError {
  constructor(message = 'Authentication required') {
    super(message, 'UNAUTHORIZED', 401)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends BeamError {
  constructor(message = 'Access denied') {
    super(message, 'FORBIDDEN', 403)
    this.name = 'ForbiddenError'
  }
}

export class ValidationError extends BeamError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details)
    this.name = 'ValidationError'
  }
}

export class IntegrationError extends BeamError {
  constructor(provider: string, message: string, details?: Record<string, unknown>) {
    super(`${provider}: ${message}`, 'INTEGRATION_ERROR', 502, { provider, ...details })
    this.name = 'IntegrationError'
  }
}

export class RateLimitError extends BeamError {
  constructor(retryAfter?: number) {
    super('Rate limit exceeded', 'RATE_LIMIT', 429, { retryAfter })
    this.name = 'RateLimitError'
  }
}

export class ConflictError extends BeamError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFLICT', 409, details)
    this.name = 'ConflictError'
  }
}

export function isBeamError(error: unknown): error is BeamError {
  return error instanceof BeamError
}
