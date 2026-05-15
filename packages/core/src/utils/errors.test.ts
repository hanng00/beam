import { describe, it, expect } from 'bun:test'
import {
  BeamError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  IntegrationError,
  RateLimitError,
  ConflictError,
  isBeamError,
} from './errors'

describe('errors', () => {
  describe('BeamError', () => {
    it('creates an error with message, code, and status', () => {
      const error = new BeamError('Test error', 'TEST_ERROR', 500)
      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_ERROR')
      expect(error.statusCode).toBe(500)
      expect(error.name).toBe('BeamError')
    })

    it('defaults statusCode to 500', () => {
      const error = new BeamError('Test error', 'TEST_ERROR')
      expect(error.statusCode).toBe(500)
    })

    it('includes optional details', () => {
      const details = { field: 'email', reason: 'invalid' }
      const error = new BeamError('Test error', 'TEST_ERROR', 400, details)
      expect(error.details).toEqual(details)
    })

    it('serializes to JSON correctly', () => {
      const error = new BeamError('Test error', 'TEST_ERROR', 400, { extra: 'info' })
      const json = error.toJSON()
      expect(json).toEqual({
        error: 'TEST_ERROR',
        message: 'Test error',
        details: { extra: 'info' },
      })
    })

    it('is an instance of Error', () => {
      const error = new BeamError('Test', 'TEST', 500)
      expect(error instanceof Error).toBe(true)
    })
  })

  describe('NotFoundError', () => {
    it('creates error with resource name', () => {
      const error = new NotFoundError('User')
      expect(error.message).toBe('User not found')
      expect(error.code).toBe('NOT_FOUND')
      expect(error.statusCode).toBe(404)
      expect(error.name).toBe('NotFoundError')
    })

    it('creates error with resource name and id', () => {
      const error = new NotFoundError('User', '123')
      expect(error.message).toBe("User with id '123' not found")
      expect(error.details).toEqual({ resource: 'User', id: '123' })
    })

    it('is an instance of BeamError', () => {
      const error = new NotFoundError('User')
      expect(error instanceof BeamError).toBe(true)
    })
  })

  describe('UnauthorizedError', () => {
    it('creates error with default message', () => {
      const error = new UnauthorizedError()
      expect(error.message).toBe('Authentication required')
      expect(error.code).toBe('UNAUTHORIZED')
      expect(error.statusCode).toBe(401)
      expect(error.name).toBe('UnauthorizedError')
    })

    it('creates error with custom message', () => {
      const error = new UnauthorizedError('Invalid token')
      expect(error.message).toBe('Invalid token')
    })
  })

  describe('ForbiddenError', () => {
    it('creates error with default message', () => {
      const error = new ForbiddenError()
      expect(error.message).toBe('Access denied')
      expect(error.code).toBe('FORBIDDEN')
      expect(error.statusCode).toBe(403)
      expect(error.name).toBe('ForbiddenError')
    })

    it('creates error with custom message', () => {
      const error = new ForbiddenError('Insufficient permissions')
      expect(error.message).toBe('Insufficient permissions')
    })
  })

  describe('ValidationError', () => {
    it('creates error with message', () => {
      const error = new ValidationError('Invalid email format')
      expect(error.message).toBe('Invalid email format')
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.statusCode).toBe(400)
      expect(error.name).toBe('ValidationError')
    })

    it('creates error with details', () => {
      const details = { field: 'email', expected: 'valid email' }
      const error = new ValidationError('Invalid email', details)
      expect(error.details).toEqual(details)
    })
  })

  describe('IntegrationError', () => {
    it('creates error with provider and message', () => {
      const error = new IntegrationError('Google', 'API rate limit exceeded')
      expect(error.message).toBe('Google: API rate limit exceeded')
      expect(error.code).toBe('INTEGRATION_ERROR')
      expect(error.statusCode).toBe(502)
      expect(error.name).toBe('IntegrationError')
    })

    it('includes provider in details', () => {
      const error = new IntegrationError('Stripe', 'Payment failed', { chargeId: 'ch_123' })
      expect(error.details).toEqual({ provider: 'Stripe', chargeId: 'ch_123' })
    })
  })

  describe('RateLimitError', () => {
    it('creates error with default message', () => {
      const error = new RateLimitError()
      expect(error.message).toBe('Rate limit exceeded')
      expect(error.code).toBe('RATE_LIMIT')
      expect(error.statusCode).toBe(429)
      expect(error.name).toBe('RateLimitError')
    })

    it('includes retryAfter in details', () => {
      const error = new RateLimitError(60)
      expect(error.details).toEqual({ retryAfter: 60 })
    })
  })

  describe('ConflictError', () => {
    it('creates error with message', () => {
      const error = new ConflictError('Resource already exists')
      expect(error.message).toBe('Resource already exists')
      expect(error.code).toBe('CONFLICT')
      expect(error.statusCode).toBe(409)
      expect(error.name).toBe('ConflictError')
    })

    it('includes details', () => {
      const error = new ConflictError('Duplicate entry', { field: 'email' })
      expect(error.details).toEqual({ field: 'email' })
    })
  })

  describe('isBeamError', () => {
    it('returns true for BeamError instances', () => {
      expect(isBeamError(new BeamError('test', 'TEST', 500))).toBe(true)
    })

    it('returns true for subclass instances', () => {
      expect(isBeamError(new NotFoundError('User'))).toBe(true)
      expect(isBeamError(new UnauthorizedError())).toBe(true)
      expect(isBeamError(new ForbiddenError())).toBe(true)
      expect(isBeamError(new ValidationError('test'))).toBe(true)
      expect(isBeamError(new IntegrationError('test', 'test'))).toBe(true)
      expect(isBeamError(new RateLimitError())).toBe(true)
      expect(isBeamError(new ConflictError('test'))).toBe(true)
    })

    it('returns false for regular Error', () => {
      expect(isBeamError(new Error('test'))).toBe(false)
    })

    it('returns false for non-error values', () => {
      expect(isBeamError(null)).toBe(false)
      expect(isBeamError(undefined)).toBe(false)
      expect(isBeamError('error')).toBe(false)
      expect(isBeamError({ message: 'error' })).toBe(false)
    })
  })
})
