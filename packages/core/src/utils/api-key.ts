const API_KEY_PREFIX = 'beam_'
const API_KEY_BYTES = 24

export async function generateApiKey(): Promise<{ key: string; hash: string; prefix: string }> {
  const bytes = new Uint8Array(API_KEY_BYTES)
  crypto.getRandomValues(bytes)
  const key = API_KEY_PREFIX + base64UrlEncode(bytes)
  const hash = await hashApiKey(key)
  return { key, hash, prefix: API_KEY_PREFIX }
}

export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return bufferToHex(hashBuffer)
}

export function isValidApiKeyFormat(key: string): boolean {
  return key.startsWith(API_KEY_PREFIX) && key.length > API_KEY_PREFIX.length + 10
}

function base64UrlEncode(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
