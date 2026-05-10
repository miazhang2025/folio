/**
 * Folio — Content script injected into claude.ai
 *
 * Strategy: intercept the page's fetch to capture claude.ai API responses
 * for conversation data, then forward to the background worker via
 * chrome.runtime.sendMessage.
 *
 * Endpoints we care about:
 *   GET  /api/organizations/{org}/chat_conversations
 *       → list of conversations (paginated)
 *   GET  /api/organizations/{org}/chat_conversations/{id}
 *       → single conversation with messages
 *
 * CSP note: the content script runs in the page's execution context
 * (MAIN world) so it can wrap window.fetch directly.
 */

const CONV_LIST_RE  = /\/api\/organizations\/[^/]+\/chat_conversations(\?|$)/
const CONV_ITEM_RE  = /\/api\/organizations\/[^/]+\/chat_conversations\/[^/?]+(\?|$)/

// Wrap the page's fetch once
const _origFetch = window.fetch.bind(window)

window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
  const response = await _origFetch(input, init)

  const url = typeof input === 'string' ? input
    : input instanceof Request ? input.url
    : input.toString()

  const isListEndpoint = CONV_LIST_RE.test(url)
  const isItemEndpoint = !isListEndpoint && CONV_ITEM_RE.test(url)

  if ((isListEndpoint || isItemEndpoint) && response.ok) {
    // Clone before consuming — the original caller still reads the body
    response.clone().json().then((data: unknown) => {
      if (isListEndpoint) {
        // data is an array of conversation summaries (no messages)
        const convs = Array.isArray(data) ? data : (data as { results?: unknown[] }).results ?? []
        if (convs.length) {
          chrome.runtime.sendMessage({
            type: 'CONV_LIST',
            payload: convs,
          }).catch(() => { /* background may be inactive */ })
        }
      } else {
        // data is a single conversation object with chat_messages
        chrome.runtime.sendMessage({
          type: 'CONV_DETAIL',
          payload: data,
        }).catch(() => { /* background may be inactive */ })
      }
    }).catch(() => { /* non-JSON or parse error — ignore */ })
  }

  return response
}

console.log('[Folio] Content script active — fetch interceptor installed')

