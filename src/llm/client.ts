import Anthropic from '@anthropic-ai/sdk'

/**
 * Returns an Anthropic client.
 * - In the extension context, reads the API key from chrome.storage.local.
 * - In standalone / dev, reads from the VITE_ANTHROPIC_KEY env var.
 *
 * Note: client-side key is acceptable for self-use (v0). Move behind a
 * proxy before shipping to other users (see FOLIO.md security notes).
 */
export async function getClient(): Promise<Anthropic> {
  let apiKey: string | undefined

  // 1. Extension: chrome.storage.local
  if (typeof chrome !== 'undefined' && chrome.storage) {
    const result = await chrome.storage.local.get('anthropic_api_key')
    apiKey = result.anthropic_api_key as string | undefined
  }

  // 2. Web: localStorage (set by the Settings panel)
  if (!apiKey) {
    apiKey = localStorage.getItem('anthropic_api_key') ?? undefined
  }

  // 3. Build-time env var (.env.local)
  if (!apiKey) {
    apiKey = import.meta.env.VITE_ANTHROPIC_KEY as string | undefined
  }

  if (!apiKey) {
    throw new Error('No Anthropic API key found. Enter it in Settings or set VITE_ANTHROPIC_KEY in .env.local')
  }

  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
}
