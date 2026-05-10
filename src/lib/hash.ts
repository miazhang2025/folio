/**
 * Stable hash of a string — used as cache keys for distills and notes.
 * Uses SHA-256 via the Web Crypto API (works in both browser and extension contexts).
 */
export async function hashString(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Hash the content of a conversation's messages for cache invalidation.
 */
export function conversationContentHash(messages: { content: string }[]): string {
  // Synchronous hash using a simple djb2 — fast enough for cache keys,
  // not used for security purposes.
  let hash = 5381
  for (const m of messages) {
    for (let i = 0; i < m.content.length; i++) {
      hash = ((hash << 5) + hash) ^ m.content.charCodeAt(i)
      hash = hash >>> 0  // keep 32-bit unsigned
    }
  }
  return hash.toString(16)
}
