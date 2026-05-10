import JSZip from 'jszip'
import type { Conversation, Message, Attachment } from '../data/schema'

// ─── Anthropic official export format ────────────────────────────────────────
// Exported from Settings → Privacy → Export data → claude_export.zip
// Contains a `conversations.json` at the root of the ZIP.

interface AnthropicAttachment {
  id?: string
  file_name?: string
  file_type?: string
  file_size?: number
  extracted_content?: string
}

interface AnthropicMessage {
  uuid: string
  sender: 'human' | 'assistant'
  text: string
  created_at: string
  updated_at?: string
  attachments?: AnthropicAttachment[]
  files?: AnthropicAttachment[]
}

interface AnthropicConversation {
  uuid: string
  name: string
  created_at: string
  updated_at: string
  account?: { uuid?: string }
  chat_messages: AnthropicMessage[]
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function parseAttachments(raw: AnthropicAttachment[] | undefined): Attachment[] {
  if (!raw?.length) return []
  return raw.map((a, i) => ({
    id: a.id ?? String(i),
    filename: a.file_name ?? 'attachment',
    content_type: a.file_type ?? 'application/octet-stream',
    size: a.file_size ?? 0,
  }))
}

function parseMessage(raw: AnthropicMessage): Message {
  const attachments = parseAttachments(raw.attachments ?? raw.files)
  return {
    id: raw.uuid,
    role: raw.sender === 'human' ? 'user' : 'assistant',
    content: raw.text,
    created_at: new Date(raw.created_at).getTime(),
    ...(attachments.length ? { attachments } : {}),
  }
}

function parseConversation(raw: AnthropicConversation): Conversation {
  const messages = (raw.chat_messages ?? []).map(parseMessage)
  const created = new Date(raw.created_at).getTime()
  const updated = new Date(raw.updated_at).getTime()
  return {
    id: raw.uuid,
    title: raw.name || 'Untitled',
    created_at: created,
    updated_at: updated,
    project_id: null,
    model: 'unknown',           // export doesn't include model field
    message_count: messages.length,
    messages,
    imported_from: 'export_zip',
    last_synced: Date.now(),
  }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export interface ImportResult {
  imported: number
  skipped: number
  errors: string[]
}

/**
 * Parse a Anthropic claude_export.zip File object into Conversation records.
 * Does NOT write to Dexie — returns the parsed records for the caller to persist.
 */
export async function parseClaudeExportZip(file: File): Promise<{
  conversations: Conversation[]
  errors: string[]
}> {
  const zip = await JSZip.loadAsync(file)
  const errors: string[] = []

  // Anthropic puts conversations in conversations.json at the root
  const entry = zip.file('conversations.json')
  if (!entry) {
    throw new Error('No conversations.json found in ZIP. Make sure this is a Claude export from Settings → Privacy → Export data.')
  }

  const raw = await entry.async('string')
  let parsed: AnthropicConversation[]

  try {
    parsed = JSON.parse(raw) as AnthropicConversation[]
    if (!Array.isArray(parsed)) throw new Error('conversations.json is not an array')
  } catch (e) {
    throw new Error(`Failed to parse conversations.json: ${e instanceof Error ? e.message : String(e)}`)
  }

  const conversations: Conversation[] = []
  for (const raw of parsed) {
    try {
      conversations.push(parseConversation(raw))
    } catch (e) {
      errors.push(`Skipped ${raw.uuid ?? 'unknown'}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return { conversations, errors }
}
