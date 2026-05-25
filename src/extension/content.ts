/**
 * Folio — Content script injected into claude.ai
 *
 * Two modes:
 *
 * 1. PASSIVE (always on): wraps window.fetch to capture conversation data
 *    from claude.ai's own API calls and forward to the background worker.
 *
 * 2. ACTIVE (triggered by background SYNC_ALL): proactively fetches the
 *    full conversation list and each conversation's messages, then forwards
 *    them through the same CONV_LIST / CONV_DETAIL pipeline.
 *
 * Endpoints we care about:
 *   GET /api/organizations/{org}/chat_conversations         → list
 *   GET /api/organizations/{org}/chat_conversations/{id}   → detail with messages
 */

const CONV_LIST_RE = /\/api\/organizations\/([^/]+)\/chat_conversations(\?|$)/
const CONV_ITEM_RE = /\/api\/organizations\/([^/]+)\/chat_conversations\/([^/?]+)(\?|$)/

// Remember the org ID as soon as we see one in a URL
let capturedOrgId: string | null = null

function extractOrgId(url: string): string | null {
  const m = url.match(/\/api\/organizations\/([^/]+)\/chat_conversations/)
  return m ? m[1] : null
}

// ── Passive fetch interceptor ─────────────────────────────────────────────────

const _origFetch = window.fetch.bind(window)

window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
  const response = await _origFetch(input, init)

  const url = typeof input === 'string' ? input
    : input instanceof Request ? input.url
    : input.toString()

  if (!capturedOrgId) capturedOrgId = extractOrgId(url)

  const isListEndpoint = CONV_LIST_RE.test(url)
  const isItemEndpoint = !isListEndpoint && CONV_ITEM_RE.test(url)

  if ((isListEndpoint || isItemEndpoint) && response.ok) {
    response.clone().json().then((data: unknown) => {
      if (isListEndpoint) {
        const convs = Array.isArray(data) ? data : (data as { results?: unknown[] }).results ?? []
        if (convs.length) {
          chrome.runtime.sendMessage({ type: 'CONV_LIST', payload: convs })
            .catch(() => { /* background may be inactive */ })
        }
      } else {
        chrome.runtime.sendMessage({ type: 'CONV_DETAIL', payload: data })
          .catch(() => { /* background may be inactive */ })
      }
    }).catch(() => { /* non-JSON or parse error — ignore */ })
  }

  return response
}

// ── Active sync: fetch all conversations + full messages ──────────────────────

async function syncAllConversations(): Promise<void> {
  if (!capturedOrgId) {
    // Try to find the org ID from the page's current URL or localStorage
    const pathMatch = location.pathname.match(/\/organizations\/([^/]+)/)
    if (pathMatch) capturedOrgId = pathMatch[1]
  }

  if (!capturedOrgId) {
    console.warn('[Folio] SYNC_ALL: org ID not yet known. Navigate to a conversation first, then sync again.')
    return
  }

  const org = capturedOrgId
  console.log(`[Folio] SYNC_ALL starting for org ${org}`)

  // 1. Fetch the conversation list (first page; claude.ai paginates at 50)
  let offset = 0
  const pageSize = 50
  let totalFetched = 0

  while (true) {
    const listUrl = `/api/organizations/${org}/chat_conversations?offset=${offset}&limit=${pageSize}`
    const listResp = await _origFetch(listUrl)
    if (!listResp.ok) break

    const data = await listResp.json() as unknown
    const convs: unknown[] = Array.isArray(data) ? data : (data as { results?: unknown[] }).results ?? []
    if (!convs.length) break

    // Forward list to background
    await chrome.runtime.sendMessage({ type: 'CONV_LIST', payload: convs })
      .catch(() => {})

    // 2. Fetch each conversation's full messages
    for (const conv of convs) {
      const c = conv as { uuid?: string }
      if (!c.uuid) continue
      try {
        const detailResp = await _origFetch(
          `/api/organizations/${org}/chat_conversations/${c.uuid}`,
        )
        if (!detailResp.ok) continue
        const detail = await detailResp.json()
        await chrome.runtime.sendMessage({ type: 'CONV_DETAIL', payload: detail })
          .catch(() => {})
      } catch {
        // Ignore per-conversation errors; continue with rest
      }
    }

    totalFetched += convs.length
    if (convs.length < pageSize) break  // last page
    offset += pageSize
  }

  console.log(`[Folio] SYNC_ALL complete — fetched ${totalFetched} conversations`)
}

// ── Listen for messages from the background worker ────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SYNC_ALL') {
    syncAllConversations()
      .then(() => sendResponse({ ok: true }))
      .catch((e: unknown) => sendResponse({ ok: false, error: String(e) }))
    return true  // keep channel open for async response
  }
})

console.log('[Folio] Content script active — passive interceptor + active sync ready')
