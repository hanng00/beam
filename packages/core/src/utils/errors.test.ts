import { describe, it, expect } from 'bun:test'
import {
  BeamError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  IntegrationError,
  RateLimitError,
  isBeamError,
} from './errors'

describe('errors', () => {
  describe('BeamError', () => {
    it('creates error with all properties', () => {
      const error = new BeamError('Test error', 'TEST_ERROR', 400, { field: 'email' })
      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_ERROR')
      expect(error.statusCode).toBe(400)
      expect(error.details).toEqual({ field: 'email' })
      expect(error instanceof Error).toBe(true)
    })

    it('serializes to JSON correctly', () => {
      const error = new BeamError('Test error', 'TEST_ERROR', 400, { extra: 'info' })
      expect(error.toJSON()).toEqual({
        error: 'TEST_ERROR',
        message: 'Test error',
        details: { extra: 'info' },
      })
    })
  })

  describe('error subclasses', () => {
    it('NotFoundError has correct defaults', () => {
      const error = new NotFoundError('User', '123')
      expect(error.message).toBe("User with id '123' not found")
      expect(error.code).toBe('NOT_FOUND')
      expect(error.statusCode).toBe(404)
    })

    it('UnauthorizedError has correct defaults', () => {
      const error = new UnauthorizedError()
      expect(error.code).toBe('UNAUTHORIZED')
      expect(error.statusCode).toBe(401)
    })

    it('ValidationError has correct defaults', () => {
      const error = new ValidationError('Invalid email')
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.statusCode).toBe(400)
    })

    it('IntegrationError includes provider', () => {
      const error = new IntegrationError('Google', 'API rate limit exceeded')
      expect(error.message).toBe('Google: API rate limit exceeded')
      expect(error.statusCode).toBe(502)
    })

    it('RateLimitError includes retryAfter', () => {
      const error = new RateLimitError(60)
      expect(error.statusCode).toBe(429)
      expect(error.details).toEqual({ retryAfter: 60 })
    })
  })

  describe('isBeamError', () => {
    it('identifies BeamError instances', () => {
      expect(isBeamError(new BeamError('test', 'TEST', 500))).toBe(true)
      expect(isBeamError(new NotFoundError('User'))).toBe(true)
      expect(isBeamError(new Error('test'))).toBe(false)
      expect(isBeamError(null)).toBe(false)
      expect(isBeamError({ message: 'error' })).toBe(false)
    })
  })
})
