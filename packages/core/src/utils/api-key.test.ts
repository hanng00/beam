import { describe, it, expect } from 'bun:test'
import { generateApiKey, hashApiKey, isValidApiKeyFormat } from './api-key'

describe('api-key', () => {
  describe('generateApiKey', () => {
    it('generates a key with the correct prefix', async () => {
      const { key, prefix } = await generateApiKey()
      expect(key.startsWith('beam_')).toBe(true)
      expect(prefix).toBe('beam_')
    })

    it('generates a hash alongside the key', async () => {
      const { key, hash } = await generateApiKey()
      expect(hash).toBeDefined()
      expect(hash.length).toBe(64) // SHA-256 produces 64 hex characters
    })

    it('generates unique keys on each call', async () => {
      const results = await Promise.all([
        generateApiKey(),
        generateApiKey(),
        generateApiKey(),
      ])
      const keys = results.map((r) => r.key)
      const uniqueKeys = new Set(keys)
      expect(uniqueKeys.size).toBe(3)
    })

    it('generates unique hashes for unique keys', async () => {
      const results = await Promise.all([
        generateApiKey(),
        generateApiKey(),
        generateApiKey(),
      ])
      const hashes = results.map((r) => r.hash)
      const uniqueHashes = new Set(hashes)
      expect(uniqueHashes.size).toBe(3)
    })

    it('generates keys of consistent length', async () => {
      const results = await Promise.all(
        Array.from({ length: 5 }, () => generateApiKey())
      )
      const lengths = results.map((r) => r.key.length)
      expect(new Set(lengths).size).toBe(1)
    })
  })

  describe('hashApiKey', () => {
    it('produces a 64-character hex string', async () => {
      const hash = await hashApiKey('beam_test123')
      expect(hash.length).toBe(64)
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true)
    })

    it('produces consistent hashes for the same input', async () => {
      const key = 'beam_consistent_test_key'
      const hash1 = await hashApiKey(key)
      const hash2 = await hashApiKey(key)
      expect(hash1).toBe(hash2)
    })

    it('produces different hashes for different inputs', async () => {
      const hash1 = await hashApiKey('beam_key1')
      const hash2 = await hashApiKey('beam_key2')
      expect(hash1).not.toBe(hash2)
    })

    it('handles empty string', async () => {
      const hash = await hashApiKey('')
      expect(hash.length).toBe(64)
    })

    it('handles unicode characters', async () => {
      const hash = await hashApiKey('beam_🔑_unicode')
      expect(hash.length).toBe(64)
    })
  })

  describe('isValidApiKeyFormat', () => {
    it('returns true for valid key format', () => {
      expect(isValidApiKeyFormat('beam_abcdefghijklmnop')).toBe(true)
    })

    it('returns false for keys without prefix', () => {
      expect(isValidApiKeyFormat('abcdefghijklmnop')).toBe(false)
    })

    it('returns false for keys with wrong prefix', () => {
      expect(isValidApiKeyFormat('other_abcdefghijklmnop')).toBe(false)
    })

    it('returns false for keys that are too short', () => {
      expect(isValidApiKeyFormat('beam_short')).toBe(false)
    })

    it('returns false for just the prefix', () => {
      expect(isValidApiKeyFormat('beam_')).toBe(false)
    })

    it('returns false for empty string', () => {
      expect(isValidApiKeyFormat('')).toBe(false)
    })

    it('returns true for generated keys', async () => {
      const { key } = await generateApiKey()
      expect(isValidApiKeyFormat(key)).toBe(true)
    })
  })
})
