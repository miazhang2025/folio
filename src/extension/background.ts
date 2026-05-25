/**
 * Folio — Extension background service worker (MV3)
 *
 * Receives CONV_LIST and CONV_DETAIL messages from the content script,
 * normalises them into our Conversation schema, and upserts into Dexie.
 *
 * Note: service workers restart between events — no in-memory state.
 * Sync position is persisted via chrome.storage if needed.
 */

import { db } from '../data/db'
import type { Conversation, Message, Attachment } from '../data/schema'

// ─── claude.ai API shape (minimal subset we care about) ──────────────────────

interface ApiAttachment {
  id?: string
  file_name?: string
  file_type?: string
  file_size?: number
}

interface ApiMessage {
  uuid: string
  sender: 'human' | 'assistant'
  text: string
  created_at: string
  attachments?: ApiAttachment[]
  files?: ApiAttachment[]
}

interface ApiConversation {
  uuid: string
  name: string
  created_at: string
  updated_at: string
  model?: string
  project?: { uuid?: string } | null
  chat_messages?: ApiMessage[]
}

// ─── Normaliser ───────────────────────────────────────────────────────────────

function normaliseAttachments(raw: ApiAttachment[] | undefined): Attachment[] {
  if (!raw?.length) return []
  return raw.map((a, i) => ({
    id: a.id ?? String(i),
    filename: a.file_name ?? 'attachment',
    content_type: a.file_type ?? 'application/octet-stream',
    size: a.file_size ?? 0,
  }))
}

function normaliseMessage(raw: ApiMessage): Message {
  const atts = normaliseAttachments(raw.attachments ?? raw.files)
  return {
    id: raw.uuid,
    role: raw.sender === 'human' ? 'user' : 'assistant',
    content: raw.text ?? '',
    created_at: new Date(raw.created_at).getTime(),
    ...(atts.length ? { attachments: atts } : {}),
  }
}

function normaliseConversation(raw: ApiConversation, withMessages: boolean): Conversation {
  const messages = withMessages && raw.chat_messages
    ? raw.chat_messages.map(normaliseMessage)
    : []
  return {
    id: raw.uuid,
    title: raw.name || 'Untitled',
    created_at: new Date(raw.created_at).getTime(),
    updated_at: new Date(raw.updated_at).getTime(),
    project_id: raw.project?.uuid ?? null,
    model: raw.model ?? 'unknown',
    message_count: messages.length,
    messages,
    imported_from: 'extension',
    last_synced: Date.now(),
  }
}

// ─── Upsert helpers ───────────────────────────────────────────────────────────

async function upsertConvSummary(raw: ApiConversation) {
  const existing = await db.conversations.get(raw.uuid)
  const updated = new Date(raw.updated_at).getTime()
  // Only update if newer — preserve full messages if already stored
  if (existing && existing.updated_at >= updated) return
  const conv = normaliseConversation(raw, false)
  if (existing) conv.messages = existing.messages     // keep existing messages
  await db.conversations.put(conv)
}

async function upsertConvDetail(raw: ApiConversation) {
  const conv = normaliseConversation(raw, true)
  await db.conversations.put(conv)
}

// ─── Message handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'CONV_LIST') {
    const convs = message.payload as ApiConversation[]
    Promise.all(convs.map(upsertConvSummary))
      .then(() => sendResponse({ ok: true, count: convs.length }))
      .catch((e: unknown) => sendResponse({ ok: false, error: String(e) }))
    return true   // keep channel open for async response
  }

  if (message.type === 'CONV_DETAIL') {
    const conv = message.payload as ApiConversation
    upsertConvDetail(conv)
      .then(() => sendResponse({ ok: true }))
      .catch((e: unknown) => sendResponse({ ok: false, error: String(e) }))
    return true
  }

  if (message.type === 'SYNC') {
    // Trigger active sync: send SYNC_ALL to the content script in the claude.ai tab.
    // If no claude.ai tab is open, open one — the content script will auto-intercept
    // the initial page load and the user can trigger sync again.
    chrome.tabs.query({ url: 'https://claude.ai/*' }, (tabs) => {
      if (tabs.length > 0 && tabs[0].id != null) {
        const tabId = tabs[0].id
        chrome.tabs.sendMessage(tabId, { type: 'SYNC_ALL' }, (resp) => {
          const err = chrome.runtime.lastError
          if (err) {
            // Content script not yet ready (tab still loading) — focus the tab
            chrome.tabs.update(tabId, { active: true })
            sendResponse({ ok: false, message: 'Tab not ready — open claude.ai and try again' })
          } else {
            sendResponse({ ok: true, ...(resp ?? {}) })
          }
        })
      } else {
        chrome.tabs.create({ url: 'https://claude.ai/', active: true })
        sendResponse({ ok: true, message: 'Opened claude.ai — sync will start automatically on next trigger' })
      }
    })
    return true
  }
})

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Folio] Extension installed / updated')
})

