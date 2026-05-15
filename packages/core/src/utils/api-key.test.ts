import { describe, it, expect } from 'bun:test'
import { generateApiKey, hashApiKey, isValidApiKeyFormat } from './api-key'

describe('api-key', () => {
  describe('generateApiKey', () => {
    it('generates key with correct format', async () => {
      const { key, prefix, hash } = await generateApiKey()
      expect(key.startsWith('beam_')).toBe(true)
      expect(prefix).toBe('beam_')
      expect(hash.length).toBe(64)
    })

    it('generates unique keys', async () => {
      const results = await Promise.all([generateApiKey(), generateApiKey(), generateApiKey()])
      const keys = new Set(results.map((r) => r.key))
      const hashes = new Set(results.map((r) => r.hash))
      expect(keys.size).toBe(3)
      expect(hashes.size).toBe(3)
    })
  })

  describe('hashApiKey', () => {
    it('produces consistent SHA-256 hashes', async () => {
      const key = 'beam_test_key_12345'
      const hash1 = await hashApiKey(key)
      const hash2 = await hashApiKey(key)
      expect(hash1).toBe(hash2)
      expect(hash1.length).toBe(64)
      expect(/^[a-f0-9]+$/.test(hash1)).toBe(true)
    })

    it('produces different hashes for different inputs', async () => {
      const hash1 = await hashApiKey('beam_key1')
      const hash2 = await hashApiKey('beam_key2')
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('isValidApiKeyFormat', () => {
    it('validates key format correctly', async () => {
      const { key } = await generateApiKey()
      expect(isValidApiKeyFormat(key)).toBe(true)
      expect(isValidApiKeyFormat('beam_abcdefghijklmnop')).toBe(true)
      expect(isValidApiKeyFormat('abcdefghijklmnop')).toBe(false)
      expect(isValidApiKeyFormat('other_abcdefghijklmnop')).toBe(false)
      expect(isValidApiKeyFormat('beam_short')).toBe(false)
      expect(isValidApiKeyFormat('')).toBe(false)
    })
  })
})
